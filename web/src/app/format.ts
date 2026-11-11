// vi-VN formatting: dot thousands, comma decimals, dd/mm/yyyy, 24h. Times shown in Asia/Ho_Chi_Minh.
const TZ = 'Asia/Ho_Chi_Minh';

export const fmt = (n: number | null | undefined, digits = 0) =>
  n == null ? '—' : Number(n).toLocaleString('vi-VN', { minimumFractionDigits: digits, maximumFractionDigits: digits });

const parts = (iso: string, opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat('vi-VN', { timeZone: TZ, ...opts }).formatToParts(new Date(iso))
    .reduce<Record<string, string>>((a, p) => ({ ...a, [p.type]: p.value }), {});

/** 04/11/2026 */
export const fmtDate = (iso?: string | null) => {
  if (!iso) return '—';
  // Plain dates ("2026-11-04") are local dates already.
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) { const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}`; }
  const p = parts(iso, { day: '2-digit', month: '2-digit', year: 'numeric' });
  return `${p.day}/${p.month}/${p.year}`;
};

/** 09:14 */
export const fmtTime = (iso?: string | null) => {
  if (!iso) return '—';
  const p = parts(iso, { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${p.hour}:${p.minute}`;
};

/** 04/11/2026 09:14 */
export const fmtDateTime = (iso?: string | null) => (iso ? `${fmtDate(iso)} ${fmtTime(iso)}` : '—');

/** 03/11 09:14 — compact, for tables */
export const fmtShort = (iso?: string | null) => {
  if (!iso) return '—';
  const p = parts(iso, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
  return `${p.day}/${p.month} ${p.hour}:${p.minute}`;
};

/** "ngày 04 tháng 11 năm 2026", as written on paper documents. Today when no date is given. */
export const fmtDocDate = (iso: string = new Date().toISOString()) => {
  const [d, m, y] = fmtDate(iso).split('/');
  return `ngày ${d} tháng ${m} năm ${y}`;
};

/** A filter on Vietnamese days, "2026-11-04"; empty means open-ended. */
export interface DateRange { from: string; to: string }
export const ANY_DATE: DateRange = { from: '', to: '' };

const VN_OFFSET = 7 * 3_600_000;
/** The Vietnamese calendar day of an instant, as "2026-11-04" (plain dates pass through). */
export const vnDay = (iso: string) => (/^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : new Date(new Date(iso).getTime() + VN_OFFSET).toISOString().slice(0, 10));
/** Today in Vietnam, "2026-11-04". */
export const vnToday = () => new Date(Date.now() + VN_OFFSET).toISOString().slice(0, 10);
/** The day n days before today in Vietnam. */
export const vnDaysAgo = (n: number) => new Date(Date.now() + VN_OFFSET - n * 86_400_000).toISOString().slice(0, 10);
/** Whether an instant falls in [from, to] (Vietnamese days, both inclusive, either may be empty). No date never matches a set range. */
export const inVnDateRange = (iso: string | null | undefined, from: string, to: string) => {
  if (!from && !to) return true;
  if (!iso) return false;
  const d = vnDay(iso);
  return (!from || d >= from) && (!to || d <= to);
};

/** "Thứ Tư, 04/11/2026" */
export const fmtLongDate = (d = new Date()) => {
  const wd = new Intl.DateTimeFormat('vi-VN', { timeZone: TZ, weekday: 'long' }).format(d);
  return `${wd.charAt(0).toUpperCase()}${wd.slice(1)}, ${fmtDate(d.toISOString())}`;
};
