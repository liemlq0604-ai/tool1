import { lotColor as resolveLotColor, COLOR_NAMES } from '../public/lot-colors.js';
export type CardColor = 'green' | 'white' | 'blue' | 'yellow' | 'orange';
export { COLOR_NAMES };
/** Leading 6/8 always wins; other prefixes match exactly the documented 001/501/RS01/SK01/BK01 pattern. */
export function lotColor(raw: string): CardColor | null {
  return resolveLotColor(raw);
}
