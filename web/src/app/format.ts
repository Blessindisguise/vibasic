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

/** "Thứ Tư, 04/11/2026" */
export const fmtLongDate = (d = new Date()) => {
  const wd = new Intl.DateTimeFormat('vi-VN', { timeZone: TZ, weekday: 'long' }).format(d);
  return `${wd.charAt(0).toUpperCase()}${wd.slice(1)}, ${fmtDate(d.toISOString())}`;
};
