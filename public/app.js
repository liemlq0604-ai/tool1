const $ = selector => document.querySelector(selector);
const input = $('#excel'), message = $('#alert');
const COLORS = { green:'Xanh lá', white:'Trắng', blue:'Xanh da trời', yellow:'Vàng', orange:'Cam' };
let records = [], selected = new Set(), view = [];
function alertUser(text, type='error') { message.hidden = !text; message.textContent = text; message.className = 'alert ' + type; }
function text(node, value) { node.textContent = String(value ?? ''); }
function td(value, className='') { const cell = document.createElement('td'); cell.className=className; text(cell,value); return cell; }
function matches(r) {
  const search = $('#search').value.toUpperCase().trim(), part=$('#part').value, color=$('#color').value;
  return (!part || r.part===part) && (!color || (color==='unknown' ? !r.color : r.color===color)) && (!search || [r.po,r.lot,r.model,r.part,r.name].some(v=>String(v).toUpperCase().includes(search)));
}
function selectedLabel() { text($('#selected-count'), selected.size); $('#preview').disabled=!selected.size; $('#checkall').checked = view.length > 0 && view.every(r=>selected.has(r.id)); $('#checkall').indeterminate = view.some(r=>selected.has(r.id)) && !$('#checkall').checked; }
function draw() {
  view=records.filter(matches);
  const fragment=document.createDocumentFragment();
  for(const r of view) {
    const tr=document.createElement('tr');
    if (!r.color || !Number.isFinite(r.quantity) || r.quantity <= 0) tr.className='invalid';
    const first=document.createElement('td'), check=document.createElement('input');
    check.type='checkbox';check.checked=selected.has(r.id);check.setAttribute('aria-label',`Chọn PO ${r.po}, Lot ${r.lot}`);
    check.addEventListener('change',()=>{ if(check.checked) selected.add(r.id); else selected.delete(r.id); selectedLabel(); });
    first.append(check);tr.append(first,td(r.po),td(r.lot),td(r.model),td(r.part),td(r.name),td(Number.isFinite(r.quantity)?r.quantity.toLocaleString('vi-VN'):'?', 'num'));
    const badge=td(r.color ? COLORS[r.color] : 'Chưa rõ');badge.className='color '+(r.color||'unknown');tr.append(badge);fragment.append(tr);
  }
  $('#rows').replaceChildren(fragment);$('#empty').hidden=view.length!==0;text($('#visible-count'),`Hiển thị ${view.length}/${records.length} dòng`);selectedLabel();
}
function showResult(data) {
  records=data.records;selected.clear();$('#result').hidden=false;
  const unique=[...new Set(records.map(r=>r.part))].sort();
  $('#part').replaceChildren(new Option('Tất cả mã sản phẩm',''),...unique.map(p=>new Option(p,p)));
  $('#search').value='';$('#color').value='';
  text($('#summary'),`Sheet: ${data.sheet} · ${records.length} dòng · ${unique.length} mã sản phẩm`);
  draw();
  if(data.warnings?.length) alertUser(data.warnings.join(' '),'warning'); else alertUser(`${records.length} dòng đã sẵn sàng.`, 'success');
}
async function loadFile(file) {
  if(!file)return;
  if(!/\.xlsx$/i.test(file.name)) return alertUser('Chọn file .xlsx, không phải .xls.');
  if(file.size>80*1024*1024) return alertUser('Excel quá 80 MB.');
  $('#file-label').textContent=`Đang đọc ${file.name}...`;alertUser('Đang xử lý Excel, vui lòng đợi...', 'info');
  try {
    const response=await fetch('/api/import',{method:'POST',headers:{'Content-Type':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'},body:file});
    const data=await response.json();if(!response.ok)throw new Error(data.error || 'Import thất bại');
    $('#file-label').textContent=file.name;showResult(data);
  } catch(error) { alertUser(error.message);$('#file-label').textContent='Chọn file Excel hoặc kéo thả vào đây'; }
}
input.addEventListener('change',()=>loadFile(input.files?.[0]));
const drop=$('.upload-control');
drop.addEventListener('dragover',e=>{e.preventDefault();drop.classList.add('drag');});
drop.addEventListener('dragleave',()=>drop.classList.remove('drag'));
drop.addEventListener('drop',e=>{e.preventDefault();drop.classList.remove('drag');loadFile(e.dataTransfer.files[0]);});
['#search','#part','#color'].forEach(s=>$(s).addEventListener('input',draw));
$('#checkall').addEventListener('change',e=>{for(const r of view){if(e.target.checked)selected.add(r.id);else selected.delete(r.id);} draw();});
$('#clear').addEventListener('click',()=>{selected.clear();draw();});
$('#preview').addEventListener('click',()=>{
  const picked=records.filter(r=>selected.has(r.id));const invalid=picked.filter(r=>!r.color || !Number.isFinite(r.quantity) || r.quantity<=0 || !r.lot || !r.po);
  if(invalid.length) return alertUser(`${invalid.length} Lot không hợp lệ (màu / số lượng / PO). Bỏ chọn hoặc sửa Excel rồi import lại.`);
  const mode=document.querySelector('input[name=paper]:checked').value;
  if(mode==='black' && new Set(picked.map(r=>r.color)).size>1) return alertUser('In trên giấy màu: mỗi lần chỉ chọn một màu Lot. Hãy lọc theo màu rồi in lại.');
  const payload={records:picked,mode,created:new Date().toISOString()};
  sessionStorage.setItem('parts-card-print',JSON.stringify(payload));
  const popup=window.open('/print.html','_blank');
  if(!popup) window.location.assign('/print.html');
});
