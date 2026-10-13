// Sole source: Quy đinh sử dụng part card 3 (2).xls, Sheet1.
// Cell fills and instructions in the data workbook never override these rules.
export const COLOR_NAMES = {green:'Xanh lá',white:'Trắng',blue:'Xanh da trời',yellow:'Vàng',orange:'Cam'};
const MONTH_COLORS=['green','white','blue','yellow'];
export function lotColor(raw) {
  const lot=String(raw ?? '').trim().toUpperCase();
  if (/^[68]/.test(lot)) return 'orange';
  const number=/^(?:0(0[1-9]|1[0-2])|5(0[1-9]|1[0-2]))/.exec(lot);
  const letters=/^(?:RS|SK|BK)(0[1-9]|1[0-2])/.exec(lot);
  const month=Number(number?.[1] || number?.[2] || letters?.[1]);
  return month >= 1 && month <= 12 ? MONTH_COLORS[(month-1)%4] : null;
}
export function validRecord(record) {
  return Boolean(record && typeof record.po==='string' && record.po.trim()
    && typeof record.lot==='string' && record.lot.trim()
    && typeof record.model==='string' && record.model.trim()
    && typeof record.part==='string' && record.part.trim()
    && typeof record.name==='string' && record.name.trim()
    && Number.isSafeInteger(record.quantity) && record.quantity>0
    && lotColor(record.lot) && record.color===lotColor(record.lot));
}
