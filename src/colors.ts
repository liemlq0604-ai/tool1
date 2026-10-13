/** Source: Quy định sử dụng Parts Card theo màu, Sheet1 (uploaded .xls). */
export type CardColor = 'green' | 'white' | 'blue' | 'yellow' | 'orange';
const MONTH_COLORS: Record<number, CardColor> = {
  1: 'green', 2: 'white', 3: 'blue', 4: 'yellow',
  5: 'green', 6: 'white', 7: 'blue', 8: 'yellow',
  9: 'green', 10: 'white', 11: 'blue', 12: 'yellow',
};
export const COLOR_NAMES: Record<CardColor, string> = {
  green: 'Xanh lá', white: 'Trắng', blue: 'Xanh da trời',
  yellow: 'Vàng', orange: 'Cam',
};
/** Leading 6/8 always wins; other prefixes match exactly the documented 001/501/RS01/SK01/BK01 pattern. */
export function lotColor(raw: string): CardColor | null {
  const lot = String(raw ?? '').trim().toUpperCase();
  if (!lot) return null;
  if (/^[68]/.test(lot)) return 'orange';
  let month: number | null = null;
  if (/^(00[1-9]|01[0-2]|50[1-9]|51[0-2])/.test(lot)) {
    const prefix = Number(lot.slice(0, 3));
    month = prefix >= 500 ? prefix - 500 : prefix;
  } else {
    const m = /^(?:RS|SK|BK)(0[1-9]|1[0-2])/.exec(lot);
    if (m) month = Number(m[1]);
  }
  return month ? MONTH_COLORS[month] ?? null : null;
}
