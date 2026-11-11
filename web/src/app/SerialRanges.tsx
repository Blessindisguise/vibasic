import { fmt } from './format';

export interface SerialRange { first: string; last: string; count: number }

/**
 * Collapses item codes into consecutive runs. Codes are SP-{SKU}-{yymm}-{nnnn}: everything up to the last "-" is the head,
 * the tail is the running number. "SP-THT01-2610-0001 … 0040" reads better than forty chips.
 */
export function toRanges(serials: string[]): SerialRange[] {
  const parsed = serials.map(s => {
    const cut = s.lastIndexOf('-');
    const n = Number(s.slice(cut + 1));
    return { s, head: s.slice(0, cut + 1), n: Number.isInteger(n) && cut > 0 ? n : NaN };
  }).sort((a, b) => (a.head === b.head ? a.n - b.n : a.head < b.head ? -1 : 1));

  const out: SerialRange[] = [];
  let run: { head: string; from: typeof parsed[number]; to: typeof parsed[number]; count: number } | null = null;
  for (const p of parsed) {
    if (run && !Number.isNaN(p.n) && p.head === run.head && p.n === run.to.n + 1) { run.to = p; run.count++; continue; }
    if (run) out.push({ first: run.from.s, last: run.to.s, count: run.count });
    run = { head: p.head, from: p, to: p, count: 1 };
  }
  if (run) out.push({ first: run.from.s, last: run.to.s, count: run.count });
  return out;
}

/** "SP-THT01-2610-0001 → 0040" (40 sp), or a single code. Picked runs are shown in green. */
export function SerialRanges({ serials, tone, unit = 'sp' }: { serials: string[]; tone?: 'picked'; unit?: string }) {
  if (serials.length === 0) return null;
  const ranges = toRanges(serials);
  const cls = `vb-serial vb-serial--range${tone === 'picked' ? ' vb-serial--picked' : ''}`;
  return (
    <div className="vb-serials">
      {ranges.map(r => (
        <span key={r.first} className={cls} title={`${r.count > 1 ? `${r.first} đến ${r.last}` : r.first}${tone === 'picked' ? ' (đã quét)' : ''}`}>
          {tone === 'picked' && '✓ '}
          {r.count === 1 ? r.first : <>{r.first}<span aria-label="đến" className="vb-serial__sep">→</span>{r.last.slice(r.last.lastIndexOf('-') + 1)}</>}
          {r.count > 1 && <span className="vb-serial__count">{fmt(r.count)} {unit}</span>}
        </span>
      ))}
    </div>
  );
}
