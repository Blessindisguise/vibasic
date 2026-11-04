import { useState } from 'react';
import { fmt, fmtDate } from '../../app/format';

interface Day { day: string; in: number; out: number }

const W = 640, H = 220, M = { top: 12, right: 8, bottom: 28, left: 44 };
const BAR = 22, GAP = 2;
// Design system: stock in = brand green, stock out = grey-700 (flat, no gradients).
const IN = 'var(--green-500)', OUT = 'var(--grey-700)';

/** Round the axis max up to 1, 2 or 5 × 10^n so ticks are clean numbers. */
function niceMax(v: number) {
  if (v <= 0) return 10;
  const p = 10 ** Math.floor(Math.log10(v));
  return [1, 2, 5, 10].map(m => m * p).find(m => m >= v)!;
}

/** Column with a 4px rounded data-end and a square base on the baseline. */
const column = (x: number, y: number, w: number, h: number) => {
  if (h <= 0) return '';
  const r = Math.min(4, h, w / 2);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
};

const weekday = (iso: string) => {
  const d = new Date(`${iso}T00:00:00`).getDay();
  return d === 0 ? 'CN' : `T${d + 1}`;
};

/** Stock in vs out per day for the last 7 days: legend, hover tooltip per day, and a hidden table for screen readers. */
export function FlowChart({ data }: { data: Day[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = niceMax(Math.max(...data.map(d => Math.max(d.in, d.out))));
  const plotW = W - M.left - M.right, plotH = H - M.top - M.bottom;
  const band = plotW / data.length;
  const y = (v: number) => M.top + plotH - (v / max) * plotH;
  const ticks = [0, max / 2, max];
  const totalIn = data.reduce((s, d) => s + d.in, 0), totalOut = data.reduce((s, d) => s + d.out, 0);
  const h = hover == null ? null : data[hover];

  return (
    <figure style={{ margin: 0, position: 'relative' }}>
      <div className="vb-row" style={{ gap: 16, marginBottom: 8, font: 'var(--type-helper)', color: 'var(--text-secondary)' }}>
        <Legend color={IN} label={`Nhập kho · ${fmt(totalIn)}`} />
        <Legend color={OUT} label={`Xuất kho · ${fmt(totalOut)}`} />
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`Nhập ${fmt(totalIn)}, xuất ${fmt(totalOut)} sản phẩm trong 7 ngày`}
        onMouseLeave={() => setHover(null)} style={{ display: 'block', overflow: 'visible' }}>
        {ticks.map(t => (
          <g key={t}>
            <line x1={M.left} x2={W - M.right} y1={y(t)} y2={y(t)} stroke="var(--grey-100)" strokeWidth={1} />
            <text x={M.left - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill="var(--text-muted)" style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(t)}</text>
          </g>
        ))}
        {data.map((d, i) => {
          const cx = M.left + band * i + band / 2;
          return (
            <g key={d.day}>
              {hover === i && <rect x={M.left + band * i + 2} y={M.top} width={band - 4} height={plotH} fill="var(--grey-50)" />}
              <path d={column(cx - BAR - GAP / 2, y(d.in), BAR, y(0) - y(d.in))} fill={IN} />
              <path d={column(cx + GAP / 2, y(d.out), BAR, y(0) - y(d.out))} fill={OUT} />
              <text x={cx} y={H - 8} textAnchor="middle" fontSize={11} fill={i === data.length - 1 ? 'var(--text-primary)' : 'var(--text-muted)'}
                fontWeight={i === data.length - 1 ? 600 : 400}>
                {i === data.length - 1 ? 'Hôm nay' : `${weekday(d.day)} ${d.day.slice(8, 10)}/${d.day.slice(5, 7)}`}
              </text>
              {/* Hit target: the whole day band, larger than the bars. */}
              <rect x={M.left + band * i} y={M.top} width={band} height={plotH + M.bottom} fill="transparent"
                onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} tabIndex={0} aria-label={`${fmtDate(d.day)}: nhập ${d.in}, xuất ${d.out}`} />
            </g>
          );
        })}
        <line x1={M.left} x2={W - M.right} y1={y(0)} y2={y(0)} stroke="var(--grey-300)" strokeWidth={1} />
      </svg>
      {h && hover != null && (
        <div role="status" style={{
          position: 'absolute', top: 28, left: `calc(${((M.left + band * hover + band / 2) / W) * 100}% )`, transform: 'translateX(-50%)',
          pointerEvents: 'none', background: '#fff', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--elevation-dropdown)', padding: '8px 10px', font: 'var(--type-helper)', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums',
        }}>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{fmtDate(h.day)}</div>
          <Legend color={IN} label={`Nhập ${fmt(h.in)}`} />
          <Legend color={OUT} label={`Xuất ${fmt(h.out)}`} />
        </div>
      )}
      <table className="vb-sr-only">
        <caption>Nhập xuất 7 ngày gần nhất</caption>
        <thead><tr><th>Ngày</th><th>Nhập</th><th>Xuất</th></tr></thead>
        <tbody>{data.map(d => <tr key={d.day}><td>{fmtDate(d.day)}</td><td>{d.in}</td><td>{d.out}</td></tr>)}</tbody>
      </table>
    </figure>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)' }}>
      <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: 2, background: color }} />{label}
    </span>
  );
}
