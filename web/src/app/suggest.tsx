import type { Suggestion } from '../design';
import { fmt } from './format';
import { ItemStatusBadge, LotStatusBadge } from './statusBadges';
import { matches } from './text';
import type { LotSuggestion } from './stock';

/** Suggestions appear from this many typed characters on. */
export const SUGGEST_MIN = 2;

/**
 * Type-ahead rows for a list page: the rows that match the typed text (same rule as the page filter), capped.
 * Nothing until {@link SUGGEST_MIN} characters, so a single keystroke does not pop a list over the page.
 */
export function suggestFrom<R>(rows: R[] | undefined, query: string, fields: (r: R) => (string | null | undefined)[],
  toItem: (r: R) => Suggestion<R>, limit = 8): Suggestion<R>[] {
  if (!rows || query.trim().length < SUGGEST_MIN) return [];
  const out: Suggestion<R>[] = [];
  for (const r of rows) {
    if (matches(query, ...fields(r))) out.push({ ...toItem(r), value: r });
    if (out.length >= limit) break;
  }
  return out;
}

/** Rows for a lot / item scan field from `useLotSuggest`. */
export function lotSuggestions(data: LotSuggestion[] | undefined, query: string): Suggestion<LotSuggestion>[] {
  if (!data || query.trim().length < SUGGEST_MIN) return [];
  return data.map(s => s.kind === 'lot'
    ? {
      key: `lot-${s.lotId}`, label: s.code, hint: `${s.sku} · ${s.productName}`, value: s,
      meta: <><span>Tồn {fmt(s.onHand)} {s.unit}</span>{s.lotStatus !== 'normal' && <LotStatusBadge status={s.lotStatus} />}</>,
    }
    : {
      key: `item-${s.code}`, label: s.code, hint: `Lô ${s.lotCode} · ${s.sku} ${s.productName}`, value: s,
      meta: s.itemStatus && <ItemStatusBadge status={s.itemStatus} />,
    });
}
