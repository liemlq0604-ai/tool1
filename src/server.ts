import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, extname } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Transform } from 'node:stream';
import { readPartsWorkbook } from './xlsx.ts';
const PORT = Number(process.env.PORT || 4173);
const HOST = process.env.HOST || '127.0.0.1';
const MAX_UPLOAD = 80 * 1024 * 1024;
const ROOT = resolve(import.meta.dirname, '../public');
const MIME: Record<string,string> = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml' };
function json(res: ServerResponse, status: number, obj: unknown) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(JSON.stringify(obj));
}
async function importXlsx(req: IncomingMessage, res: ServerResponse) {
  if (Number(req.headers['content-length'] || 0) > MAX_UPLOAD) return json(res, 413, { error: 'Excel vượt 80 MB' });
  const dir = await mkdtemp(join(tmpdir(), 'parts-card-'));
  const target = join(dir, 'input.xlsx');
  let size = 0;
  try {
    await pipeline(req, new Transform({ transform(chunk: Buffer, _encoding, callback) {
      size += chunk.length;
      callback(size > MAX_UPLOAD ? new Error('Excel vượt 80 MB') : null, chunk);
    } }), createWriteStream(target, { flags: 'wx' }));
    if (size < 100) throw new Error('File Excel trống');
    const data = await readPartsWorkbook(target);
    json(res, 200, { ...data, count: data.records.length, colors: ['green','white','blue','yellow','orange'] });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Không đọc được Excel';
    json(res, size > MAX_UPLOAD ? 413 : 422, { error: message });
  } finally { await rm(dir, { recursive: true, force: true }); }
}
async function staticPage(url: URL, res: ServerResponse) {
  const paths: Record<string,string> = { '/':'index.html', '/index.html':'index.html', '/print.html':'print.html', '/app.js':'app.js', '/print.js':'print.js', '/print-date.js':'print-date.js', '/lot-colors.js':'lot-colors.js', '/style.css':'style.css' };
  const file = paths[url.pathname];
  if (!file) return json(res, 404, { error: 'Không tìm thấy' });
  res.writeHead(200, { 'Content-Type': MIME[extname(file)] ?? 'application/octet-stream', 'X-Content-Type-Options':'nosniff', 'Cache-Control':'no-store', 'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'" });
  const stream = createReadStream(join(ROOT, file));
  stream.on('error', () => res.destroy());
  stream.pipe(res);
}
const server=createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  if (req.method === 'GET' && url.pathname === '/api/health') json(res,200,{status:'ok',app:'tool1-parts-card'});
  else if (req.method === 'POST' && url.pathname === '/api/import') void importXlsx(req, res);
  else if (req.method === 'GET') void staticPage(url, res);
  else json(res, 405, { error: 'Method not allowed' });
});
server.listen(PORT, HOST, () => {
  const address=server.address();
  console.log(`Parts Card: http://${HOST}:${typeof address==='object' && address ? address.port : PORT}`);
});
