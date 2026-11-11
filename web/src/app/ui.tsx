import type { ReactNode } from 'react';
import { Button, EmptyState, SearchField, TextField } from '../design';
import { ANY_DATE, vnDaysAgo, vnToday, type DateRange } from './format';
import { Segmented } from './Segmented';

type Preset = '' | 'today' | '7' | '30' | 'custom';
const PRESETS: Record<Exclude<Preset, 'custom'>, () => DateRange> = {
  '': () => ANY_DATE,
  today: () => ({ from: vnToday(), to: vnToday() }),
  '7': () => ({ from: vnDaysAgo(6), to: vnToday() }),
  '30': () => ({ from: vnDaysAgo(29), to: vnToday() }),
};

/**
 * Time filter for a list: quick ranges (Tất cả · Hôm nay · 7 ngày · 30 ngày) and two date fields.
 * `label` names the date the list is filtered on, e.g. "Ngày đặt".
 */
export function DateRangeFilter({ value, onChange, label, size = 'md' }: {
  value: DateRange; onChange: (r: DateRange) => void; label: string; size?: 'md' | 'lg';
}) {
  const preset = (Object.keys(PRESETS) as (keyof typeof PRESETS)[])
    .find(k => { const r = PRESETS[k](); return r.from === value.from && r.to === value.to; }) ?? 'custom';
  return (
    <div className="vb-row" style={{ gap: 12, alignItems: 'flex-end' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span className="vb-field__label">{label}</span>
        <Segmented<Preset>
          label={label} size={size} value={preset}
          onChange={p => p !== 'custom' && onChange(PRESETS[p]())}
          options={[{ value: '', label: 'Tất cả' }, { value: 'today', label: 'Hôm nay' }, { value: '7', label: '7 ngày' }, { value: '30', label: '30 ngày' }]}
        />
      </div>
      <TextField size={size} label="Từ ngày" type="date" value={value.from} max={value.to || undefined}
        onChange={e => onChange({ ...value, from: e.target.value })} style={{ width: 170 }} />
      <TextField size={size} label="Đến ngày" type="date" value={value.to} min={value.from || undefined}
        onChange={e => onChange({ ...value, to: e.target.value })} style={{ width: 170 }} />
    </div>
  );
}

/** Empty state for a list filtered to a date range with nothing in it. */
export function NoneInRange({ what, onClear }: { what: string; onClear: () => void }) {
  return (
    <EmptyState icon="calendar" title={`Không có ${what} trong khoảng ngày này`} description="Chọn khoảng ngày khác hoặc xem tất cả."
      action={<Button variant="secondary" onClick={onClear}>Xem tất cả</Button>} />
  );
}

/** Filter box at the right of a panel head (lists inside a detail page): narrows the table under it while typing. */
export function PanelSearch({ value, onChange, placeholder, label, size = 'md' }: {
  value: string; onChange: (v: string) => void; placeholder: string; label: string; size?: 'md' | 'lg';
}) {
  return <SearchField size={size} value={value} onChange={onChange} placeholder={placeholder} aria-label={label} style={{ width: 260, marginLeft: 'auto' }} />;
}

/** Shown in a filtered table that has no matching row. */
export const NO_MATCH = <EmptyState icon="search" title="Không có dòng phù hợp" description="Thử từ khóa khác." />;

/** Codes (SKU, username) get +0.02em tracking and weight 600. */
export function Code({ children }: { children: ReactNode }) {
  return <span style={{ fontWeight: 600, letterSpacing: 'var(--tracking-code)', whiteSpace: 'nowrap' }}>{children}</span>;
}

/** Skeleton rows: grey-100 blocks, no shimmer. */
export function Loading({ rows = 6 }: { rows?: number }) {
  return (
    <div className="vb-panel" aria-busy="true" aria-label="Đang tải" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} style={{ height: 16, width: `${92 - (i % 3) * 14}%`, background: 'var(--grey-100)', borderRadius: 'var(--radius-sm)' }} />
      ))}
    </div>
  );
}

export function ListError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="vb-panel">
      <EmptyState icon="triangle-alert" title="Không tải được danh sách" description="Kiểm tra kết nối rồi thử lại."
        action={<Button variant="secondary" icon="refresh-cw" onClick={onRetry}>Thử lại</Button>} />
    </div>
  );
}

/** One labelled value in a detail header (lot, report, plan, product…). */
export function Fact({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div className="vb-muted">{label}</div>
      <div style={{ marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
    </div>
  );
}

/** Facts laid out in as many columns as fit. */
export function Facts({ children, min = 180 }: { children: ReactNode; min?: number }) {
  return <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(${min}px, 1fr))`, gap: 16 }}>{children}</div>;
}
