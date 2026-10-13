import { createReadStream } from 'node:fs';
import { open } from 'node:fs/promises';
import { StringDecoder } from 'node:string_decoder';
import { inflateRawSync, createInflateRaw } from 'node:zlib';
import { basename } from 'node:path';
import type { CardColor } from './colors.ts';
import { lotColor } from './colors.ts';

export interface CardRecord {
  id: string; row: number; po: string; lot: string; model: string;
  part: string; name: string; quantity: number; color: CardColor | null;
}
export interface ImportResult { sheet: string; records: CardRecord[]; warnings: string[] }
interface ZipEntry { name: string; method: number; compressed: number; uncompressed: number; offset: number }
const CELL_RE = /<c\b([^>]*?)>([\s\S]*?)<\/c>/g;
const MAX_INPUT_ROWS = 10000;
const MAX_CELLS_PER_ROW = 120;
const MAX_SHEET_XML_BYTES = 400 * 1024 * 1024;

function xmlDecode(input: string): string {
  return input.replace(/&(?:#x([\da-f]+)|#(\d+)|amp|lt|gt|quot|apos);/gi, (match, hex, dec) => {
    if (hex || dec) {
      const n = parseInt(hex || dec, hex ? 16 : 10);
      return n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : '';
    }
    return ({ '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'" } as Record<string,string>)[match.toLowerCase()] ?? match;
  });
}
const attr = (text: string, name: string) => new RegExp(`\\b${name}="([^"]*)"`).exec(text)?.[1] ?? '';

/** Reads ZIP's central directory; never unpacks or writes user-provided entry paths. */
async function zipEntries(path: string): Promise<Map<string, ZipEntry>> {
  const file = await open(path, 'r');
  try {
    const size = (await file.stat()).size;
    const tailBytes = Math.min(65557, size);
    const tail = Buffer.alloc(tailBytes);
    await file.read(tail, 0, tailBytes, size - tailBytes);
    let eocd = -1;
    for (let i = tail.length - 22; i >= 0; i--) {
      if (tail.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
    }
    if (eocd < 0) throw new Error('Không phải file XLSX/ZIP hợp lệ');
    const count = tail.readUInt16LE(eocd + 10);
    const length = tail.readUInt32LE(eocd + 12);
    const start = tail.readUInt32LE(eocd + 16);
    if (count === 0xffff || length === 0xffffffff || start === 0xffffffff || start + length > size || length > 20_000_000) {
      throw new Error('Cấu trúc ZIP quá lớn hoặc không được hỗ trợ');
    }
    const bytes = Buffer.alloc(length);
    await file.read(bytes, 0, length, start);
    const entries = new Map<string, ZipEntry>();
    let pos = 0;
    for (let i = 0; i < count; i++) {
      if (bytes.readUInt32LE(pos) !== 0x02014b50) throw new Error('Central Directory bị lỗi');
      const method = bytes.readUInt16LE(pos + 10);
      const compressed = bytes.readUInt32LE(pos + 20);
      const uncompressed = bytes.readUInt32LE(pos + 24);
      const nameLength = bytes.readUInt16LE(pos + 28);
      const extraLength = bytes.readUInt16LE(pos + 30);
      const commentLength = bytes.readUInt16LE(pos + 32);
      const offset = bytes.readUInt32LE(pos + 42);
      const name = bytes.toString('utf8', pos + 46, pos + 46 + nameLength);
      if (name && !name.includes('..')) entries.set(name, { name, method, compressed, uncompressed, offset });
      pos += 46 + nameLength + extraLength + commentLength;
      if (pos > bytes.length) throw new Error('ZIP bị lỗi chỉ mục');
    }
    return entries;
  } finally { await file.close(); }
}
async function dataRange(path: string, entry: ZipEntry): Promise<{ start: number; end: number }> {
  const file = await open(path, 'r');
  try {
    const header = Buffer.alloc(30);
    await file.read(header, 0, 30, entry.offset);
    if (header.readUInt32LE(0) !== 0x04034b50) throw new Error('ZIP local header bị lỗi');
    if (![0, 8].includes(entry.method)) throw new Error('File Excel dùng kiểu nén không hỗ trợ');
    const start = entry.offset + 30 + header.readUInt16LE(26) + header.readUInt16LE(28);
    return { start, end: start + entry.compressed - 1 };
  } finally { await file.close(); }
}
async function xmlSmall(path: string, entry: ZipEntry): Promise<string> {
  if (entry.uncompressed > 5_000_000) throw new Error('Phần thông tin Excel quá lớn');
  const { start, end } = await dataRange(path, entry);
  const file = await open(path, 'r');
  try {
    const bytes = Buffer.alloc(entry.compressed);
    await file.read(bytes, 0, bytes.length, start);
    return (entry.method === 8 ? inflateRawSync(bytes) : bytes).toString('utf8');
  } finally { await file.close(); }
}
function sharedStrings(xml: string): string[] {
  const values: string[] = [];
  for (const m of xml.matchAll(/<si(?:\s[^>]*)?>([\s\S]*?)<\/si>/g)) {
    values.push([...m[1].matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map(s => xmlDecode(s[1])).join(''));
  }
  return values;
}
function sheetPaths(entries: Map<string, ZipEntry>, workbook: string, relationships: string): { name: string; path: string }[] {
  const rels = new Map<string, string>();
  for (const r of relationships.matchAll(/<Relationship\b([^>]*?)\/?\s*>/g)) {
    const id = attr(r[1], 'Id');
    const target = attr(r[1], 'Target').replace(/^\//, '').replace(/^\.\//, '');
    if (id) rels.set(id, target.startsWith('xl/') ? target : 'xl/' + target);
  }
  const sheets: { name: string; path: string }[] = [];
  for (const s of workbook.matchAll(/<sheet\b([^>]*?)\/?\s*>/g)) {
    const name = xmlDecode(attr(s[1], 'name'));
    const id = attr(s[1], 'r:id');
    const path = rels.get(id);
    if (path && entries.has(path)) sheets.push({ name, path });
  }
  // Fallback for XLSX files with nonstandard relationships.
  if (!sheets.length) return [...entries.keys()].filter(k => /^xl\/worksheets\/sheet\d+\.xml$/.test(k))
    .sort((a,b) => Number(a.match(/sheet(\d+)/)?.[1]) - Number(b.match(/sheet(\d+)/)?.[1]))
    .map(path => ({ name: basename(path), path }));
  return sheets;
}
function rowCells(xml: string, ss: string[]): Map<string, string> {
  const values = new Map<string, string>();
  CELL_RE.lastIndex = 0;
  let count = 0;
  for (const cell of xml.matchAll(CELL_RE)) {
    if (++count > MAX_CELLS_PER_ROW) break;
    const ref = attr(cell[1], 'r').replace(/[0-9]/g, '').toUpperCase();
    if (!ref) continue;
    const v = /<v(?:\s[^>]*)?>([\s\S]*?)<\/v>/.exec(cell[2]);
    const inline = /<is(?:\s[^>]*)?>([\s\S]*?)<\/is>/.exec(cell[2]);
    const text = v?.[1] ?? (inline ? [...inline[1].matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map(m => m[1]).join('') : '');
    const decoded = xmlDecode(text);
    const value = attr(cell[1], 't') === 's' ? (ss[Number(decoded)] ?? '') : decoded;
    values.set(ref, value.trim());
  }
  return values;
}
const normalizeHeader = (x: string) => x.toUpperCase().replace(/[\s.'_-]/g,'');
const isHeader = (cells: Map<string,string>) => normalizeHeader(cells.get('A') ?? '').includes('PONO')
  && normalizeHeader(cells.get('B') ?? '').includes('LOTNO')
  && normalizeHeader(cells.get('D') ?? '').includes('PARTNO');

/** Parses rows incrementally; stops before Excel's ~1M formatted-but-empty rows. */
async function parseSheet(path: string, entry: ZipEntry, ss: string[]): Promise<CardRecord[]> {
  const { start, end } = await dataRange(path, entry);
  if (end < start) return [];
  const source = createReadStream(path, { start, end, highWaterMark: 128 * 1024 });
  const stream = entry.method === 8 ? source.pipe(createInflateRaw()) : source;
  const decoder = new StringDecoder('utf8');
  let buffer = '', bytes = 0, headerFound = false, emptyRows = 0, processed = 0;
  const records: CardRecord[] = [];
  const seen = new Set<string>();
  let stopped = false;
  try {
    for await (const piece of stream) {
      bytes += piece.length;
      if (bytes > MAX_SHEET_XML_BYTES) throw new Error('Dữ liệu XML Excel vượt giới hạn an toàn');
      buffer += decoder.write(piece);
      while (true) {
        const match = /<row\b([^>]*)>/.exec(buffer);
        if (!match) { if (buffer.length > 100000) buffer = buffer.slice(-100000); break; }
        const endRow = buffer.indexOf('</row>', match.index + match[0].length);
        if (endRow === -1) {
          if (match.index > 0) buffer = buffer.slice(match.index);
          if (buffer.length > 2_000_000) throw new Error('Một dòng Excel quá lớn');
          break;
        }
        const raw = buffer.slice(match.index + match[0].length, endRow);
        const row = Number(attr(match[1], 'r')) || ++processed;
        buffer = buffer.slice(endRow + 6);
        if (row > MAX_INPUT_ROWS) { stopped = true; break; }
        const cells = rowCells(raw, ss);
        if (!headerFound) {
          if (isHeader(cells)) headerFound = true;
          continue;
        }
        const po = cells.get('A') ?? '', lot = cells.get('B') ?? '';
        const part = cells.get('D') ?? '', q = cells.get('F') ?? '';
        if (!po && !lot && !part && !q) {
          if (++emptyRows > 80 && records.length) { stopped = true; break; }
          continue;
        }
        emptyRows = 0;
        // Ignore subtotals, otherwise keep rows (including invalid ones) for warnings.
        if (!po || !part) continue;
        const identity = [po,lot,part,cells.get('C')??'',q].join('\u0000');
        if (seen.has(identity)) continue;
        seen.add(identity);
        records.push({ id: String(row), row, po, lot, model: cells.get('C') ?? '',
          part, name: cells.get('E') ?? '', quantity: Number(q.replace(/,/g,'')), color: lotColor(lot) });
        if (records.length > 50000) throw new Error('Quá nhiều dòng dữ liệu (tối đa 50.000)');
      }
      if (stopped) break;
    }
  } finally {
    stream.destroy(); source.destroy();
  }
  return headerFound ? records : [];
}
export async function readPartsWorkbook(path: string): Promise<ImportResult> {
  const entries = await zipEntries(path);
  const workbook = entries.get('xl/workbook.xml');
  const relations = entries.get('xl/_rels/workbook.xml.rels');
  if (!workbook || !relations) throw new Error('File không phải định dạng Excel .xlsx hợp lệ');
  const ssEntry = entries.get('xl/sharedStrings.xml');
  const ss = ssEntry ? sharedStrings(await xmlSmall(path, ssEntry)) : [];
  const sheets = sheetPaths(entries, await xmlSmall(path, workbook), await xmlSmall(path, relations));
  let selected: { name: string; records: CardRecord[] } | null = null;
  for (const sheet of sheets) {
    const records = await parseSheet(path, entries.get(sheet.path)!, ss);
    if (records.length) { selected = { name: sheet.name, records }; break; }
  }
  if (!selected) throw new Error('Không thấy bảng có cột P.O NO / NEW LOT NO / PART NO / NEW Q’TY');
  const warnings: string[] = [];
  const invalidColor = selected.records.filter(r => !r.color);
  const invalidQty = selected.records.filter(r => !Number.isFinite(r.quantity) || r.quantity <= 0);
  if (invalidColor.length) warnings.push(`${invalidColor.length} dòng không xác định được màu LOT NO; phải kiểm tra trước khi in.`);
  if (invalidQty.length) warnings.push(`${invalidQty.length} dòng có số lượng không hợp lệ; không thể in.`);
  return { sheet: selected.name, records: selected.records, warnings };
}
