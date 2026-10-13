import test from 'node:test';
import assert from 'node:assert/strict';
import { lotColor } from '../src/colors.ts';
test('đủ 12 tháng / 4 chu kỳ màu và 5 tiền tố', () => {
  const months: Record<number,string>={1:'green',2:'white',3:'blue',4:'yellow',5:'green',6:'white',7:'blue',8:'yellow',9:'green',10:'white',11:'blue',12:'yellow'};
  for(const [m,expected] of Object.entries(months)) {
    for(const prefix of [String(Number(m)+500).padStart(3,'0'),String(m).padStart(3,'0'),...['RS','SK','BK'].map(x=>x+String(m).padStart(2,'0'))]) assert.equal(lotColor(prefix+'999'),expected, prefix);
  }
});
test('cam ưu tiên; lot không thuộc quy định trả null',()=>{
  for(const lot of ['612K4','812123','6DUMMY','8A55'])assert.equal(lotColor(lot),'orange');
  for(const lot of ['','01313','0005','RS13X','random','507'].filter(x=>x!=='507'))assert.equal(lotColor(lot),null);
  assert.equal(lotColor('0103AD1'),'white');
  assert.equal(lotColor('0113K37'),'blue');
  assert.equal(lotColor('BK05999'),'green');
});
