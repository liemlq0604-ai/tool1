const container=document.querySelector('#sheet-container');
const COLOR_NAME={green:'XANH LÁ',white:'TRẮNG',blue:'XANH DA TRỜI',yellow:'VÀNG',orange:'CAM'};
let payload;
try {payload=JSON.parse(sessionStorage.getItem('parts-card-print')||'null');}catch {payload=null;}
const records=payload?.records ?? [];
const field=(label,value)=>{const wrap=document.createElement('div');wrap.className='field';const heading=document.createElement('span');heading.className='field-title';heading.textContent=label;const content=document.createElement('strong');content.textContent=String(value ?? '');wrap.append(heading,content);return wrap;};
function card(r,mode) {
  const article=document.createElement('article');article.className=`part-card ${mode==='black'?'paper-mode':'ink-mode'} ${r.color}`;
  const title=document.createElement('h3');title.textContent='現品表  PARTS CARD';article.append(title);
  article.append(field('PO NO.',r.po),field('LOT NO.',r.lot),field('MODEL No.',r.model),field('PARTS No.',r.part),field('PARTS NAME.',r.name),field('QUANTITY',Number(r.quantity).toLocaleString('vi-VN')));
  const bottom=document.createElement('div');bottom.className='bottom-fields';
  bottom.append(field('SUPPLIER',''),field('ASSY DAY',''));
  article.append(bottom);
  return article;
}
if (!records.length) document.querySelector('#print-error').hidden=false;
else {
  for(let i=0;i<records.length;i+=12) {
    const page=document.createElement('section');page.className='paper';
    const grid=document.createElement('div');grid.className='card-grid';
    for (const r of records.slice(i,i+12)) grid.append(card(r,payload.mode));
    page.append(grid);container.append(page);
  }
  document.querySelector('#metadata').textContent=`${records.length} Lot · ${Math.ceil(records.length/12)} trang A4 · ${payload.mode==='black'?'Giấy màu sẵn ('+COLOR_NAME[records[0].color]+')':'In nền màu trên giấy trắng'}`;
}
document.querySelector('#print').disabled=!records.length;
document.querySelector('#print').addEventListener('click',()=>window.print());
document.querySelector('#back').addEventListener('click',()=>{if(window.opener)window.close();else window.location.assign('/');});
