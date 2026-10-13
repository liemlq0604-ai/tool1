import {validRecord, COLOR_NAMES} from './lot-colors.js';
import {exportDate} from './print-date.js';
const container=document.querySelector('#sheet-container');
let payload;
try {payload=JSON.parse(sessionStorage.getItem('parts-card-print')||'null');}catch {payload=null;}
const error=document.querySelector('#print-error');
const source=Array.isArray(payload?.records)?payload.records:[];
const invalid=source.some(record=>!validRecord(record));
const mixed=payload?.mode==='black' && new Set(source.map(record=>record?.color)).size>1;
const validMode=payload?.mode==='black'||payload?.mode==='color';
const records=!invalid && !mixed && validMode && source.length<=50000 ? source : [];
const field=(label,value)=>{const wrap=document.createElement('div');wrap.className='field';const heading=document.createElement('span');heading.className='field-title';heading.textContent=label;const content=document.createElement('strong');content.textContent=String(value ?? '');wrap.append(heading,content);return wrap;};
function card(r,mode) {
  const article=document.createElement('article');article.className=`part-card ${mode==='black'?'paper-mode':'ink-mode'} ${r.color}`;
  const title=document.createElement('h3');title.textContent='現品表  PARTS CARD';article.append(title);
  article.append(field('PO NO.',r.po),field('LOT NO.',r.lot),field('MODEL No.',r.model),field('PARTS No.',r.part),field('PARTS NAME.',r.name),field('QUANTITY',Number(r.quantity).toLocaleString('vi-VN')));
  const bottom=document.createElement('div');bottom.className='bottom-fields';
  const assyDay=field('ASSY DAY',exportDate());assyDay.classList.add('assy-day');
  bottom.append(field('SUPPLIER',''),assyDay);
  article.append(bottom);
  return article;
}
if (!records.length) {
  error.hidden=false;
  if(invalid) error.textContent='Dữ liệu in không hợp lệ hoặc màu không khớp quy định LOT. Quay lại và nhập Excel lại.';
  else if(mixed) error.textContent='Giấy màu sẵn: chỉ được in các Lot cùng màu trong một lần.';
}
else {
  for(let i=0;i<records.length;i+=12) {
    const page=document.createElement('section');page.className='paper';
    const grid=document.createElement('div');grid.className='card-grid';
    for (const r of records.slice(i,i+12)) grid.append(card(r,payload.mode));
    page.append(grid);container.append(page);
  }
  document.querySelector('#metadata').textContent=`${records.length} Lot · ${Math.ceil(records.length/12)} trang A4 · ${payload.mode==='black'?'Giấy màu sẵn ('+COLOR_NAMES[records[0].color]+')':'In nền màu trên giấy trắng'}`;
}

// Block printing if a source field still cannot fit at a readable font size.
await document.fonts.ready;
function validatePrintLayout() {
let clipped=0;
for (const content of document.querySelectorAll('.field strong')) {
  let size=parseFloat(getComputedStyle(content).fontSize);
  while(content.scrollWidth>content.clientWidth+1 && size>10) {
    size=Math.max(10,size-.5);content.style.fontSize=`${size}px`;
  }
  if(content.scrollWidth>content.clientWidth+1) clipped++;
}
if(clipped) {error.hidden=false;error.textContent=`${clipped} ô quá dài để in rõ. Quay lại kiểm tra nội dung; chưa cho in bản bị cắt chữ.`;}
else if(records.length) error.hidden=true;
document.querySelector('#print').disabled=!records.length || clipped>0;
document.body.dataset.printReady=String(records.length>0 && clipped===0);
}
validatePrintLayout();

// Recompute when printing, including Ctrl+P and a preview left open overnight.
window.addEventListener('beforeprint',()=>{
  const today=exportDate();
  for(const content of document.querySelectorAll('.assy-day strong')) {
    content.textContent=today;content.style.fontSize='';
  }
  validatePrintLayout();
});
document.querySelector('#print').addEventListener('click',()=>window.print());
document.querySelector('#back').addEventListener('click',()=>{if(window.opener)window.close();else window.location.assign('/');});
