import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {deflateRawSync} from 'node:zlib';
import {readPartsWorkbook} from '../src/xlsx.ts';
const escape=(value:unknown)=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const row=(n:number,values:unknown[])=>`<row r="${n}">${values.map((v,i)=>`<c r="${String.fromCharCode(65+i)}${n}" t="inlineStr"><is><t>${escape(v)}</t></is></c>`).join('')}</row>`;
const header=row(1,['P.O NO','NEW LOT NO','FACTORY CODE','PART NO','PART NAME',"NEW Q'TY"]);
const data=(po='PO-1',quantity:unknown=10,name='Part')=>[po,'0103AD1','MODEL','PART-1',name,quantity];
function crc32(bytes:Buffer) {let crc=0xffffffff;for(const byte of bytes){crc^=byte;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return (crc^0xffffffff)>>>0;}
function zip(entries:Record<string,string>) {
  const local:Buffer[]=[],central:Buffer[]=[];let offset=0;
  for(const [name,value] of Object.entries(entries)) {
    const n=Buffer.from(name),raw=Buffer.from(value),packed=deflateRawSync(raw),crc=crc32(raw);
    const h=Buffer.alloc(30);h.writeUInt32LE(0x04034b50);h.writeUInt16LE(20,4);h.writeUInt16LE(8,8);h.writeUInt32LE(crc,14);h.writeUInt32LE(packed.length,18);h.writeUInt32LE(raw.length,22);h.writeUInt16LE(n.length,26);
    const c=Buffer.alloc(46);c.writeUInt32LE(0x02014b50);c.writeUInt16LE(20,4);c.writeUInt16LE(20,6);c.writeUInt16LE(8,10);c.writeUInt32LE(crc,16);c.writeUInt32LE(packed.length,20);c.writeUInt32LE(raw.length,24);c.writeUInt16LE(n.length,28);c.writeUInt32LE(offset,42);
    local.push(h,n,packed);central.push(c,n);offset+=h.length+n.length+packed.length;
  }
  const c=Buffer.concat(central),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(Object.keys(entries).length,8);end.writeUInt16LE(Object.keys(entries).length,10);end.writeUInt32LE(c.length,12);end.writeUInt32LE(offset,16);
  return Buffer.concat([...local,c,end]);
}
async function read(sheets:string[]) {
  const dir=await mkdtemp(join(tmpdir(),'tool1-test-'));
  try {
    const entries:Record<string,string>={
      'xl/workbook.xml':`<workbook xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets.map((_,i)=>`<sheet name="Data${i}" r:id="rId${i}"/>`).join('')}</sheets></workbook>`,
      'xl/_rels/workbook.xml.rels':`<Relationships>${sheets.map((_,i)=>`<Relationship Id="rId${i}" Target="worksheets/sheet${i}.xml"/>`).join('')}</Relationships>`,
    };
    sheets.forEach((rows,i)=>entries[`xl/worksheets/sheet${i}.xml`]=`<worksheet><sheetData>${rows}</sheetData></worksheet>`);
    const file=join(dir,'data.xlsx');await writeFile(file,zip(entries));return await readPartsWorkbook(file);
  } finally {await rm(dir,{recursive:true,force:true});}
}
test('keeps data after 81 blanks, self-closing rows and row 10000',async()=>{
  const result=await read([header+row(2,data())+Array.from({length:81},(_,i)=>`<row r="${i+3}"/>`).join('')+row(84,data('PO-2'))+row(10001,data('PO-3'))]);
  assert.deepEqual(result.records.map(r=>r.row),[2,84,10001]);assert.deepEqual(result.warnings,[]);
});
test('reads all distinct data sheets; suppresses only fully identical copies',async()=>{
  const one=header+row(2,data());const result=await read([row(1,['Summary']),one,one,header+row(2,data('PO-2'))]);
  assert.equal(result.records.length,2);assert.notEqual(result.records[0].id,result.records[1].id);assert.match(result.warnings.join(' '),/giống toàn bộ/);
});
test('preserves missing-PO and duplicate rows; explains warnings instead of dropping data',async()=>{
  const result=await read([header+row(2,data(''))+row(3,data())+row(4,data('PO-1',10,'Different name'))]);
  assert.equal(result.records.length,3);assert.match(result.warnings.join(' '),/thiếu PO/);assert.match(result.warnings.join(' '),/dòng lặp/);
});
test('strict quantities, XML escaping and numeric Lot leading zeros',async()=>{
  const result=await read([header+row(2,data('PO-1','1,000','Part & <name>'))+row(3,data('PO-2','12,5'))+row(4,data('PO-3',0))+row(5,data('PO-4',2.5))]);
  assert.equal(result.records[0].quantity,1000);assert.equal(result.records[0].name,'Part & <name>');assert.equal(result.records[0].lot,'0103AD1');assert.equal(result.records[0].color,'white');
  assert.ok(Number.isNaN(result.records[1].quantity));assert.match(result.warnings.join(' '),/3 dòng có số lượng/);
});
test('rejects wrong quantity column header rather than misreading arbitrary cells',async()=>{
  await assert.rejects(()=>read([header.replace('NEW Q&apos;TY','PRICE').replace("NEW Q'TY",'PRICE')+row(2,data())]),/Không thấy bảng/);
});
test('rejects more than 50000 rows without returning a partial import',async()=>{
  const rows=Array.from({length:50001},(_,i)=>row(i+2,data(`PO-${i}`))).join('');
  await assert.rejects(()=>read([header+rows]),/Quá nhiều dòng/);
});
