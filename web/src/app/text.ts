/** Lower-case, strip Vietnamese diacritics (đ → d) so "thot" finds "Thớt". */
export const fold = (s: string | null | undefined) =>
  (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'd').toLowerCase().trim();

/** True when every word of the query appears in one of the fields. */
export function matches(query: string, ...fields: (string | null | undefined)[]) {
  const words = fold(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const hay = fields.map(fold).join(' ');
  return words.every(w => hay.includes(w));
}

/** "450.000" or "450000" → 450000; blank or invalid → null. */
export function parseNumber(s: string): number | null {
  const t = s.replace(/[.\s]/g, '').replace(',', '.');
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}
