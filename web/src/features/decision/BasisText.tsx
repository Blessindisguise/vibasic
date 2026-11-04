import { fmt, fmtDateTime } from '../../app/format';
import type { Basis } from '../../app/decision';

/** "d 3,04/ngày × L 10 + SS 9 = ROP 39,4" — the basis of an alert or proposal in one line. */
export function RopFormula({ b }: { b: Basis }) {
  if (b.rop == null) return <span className="vb-muted">Chưa đủ dữ liệu 4 tuần để tính ROP</span>;
  return (
    <span style={{ fontVariantNumeric: 'tabular-nums' }}>
      d {fmt(b.avgDailyDemand, 2)}/ngày × L {b.leadTimeDays} + SS {fmt(b.safetyStock)} = ROP <b>{fmt(b.rop, 1)}</b>
    </span>
  );
}

/** "√(2 × D 1.110 × S 450.000 / H 14.000) = EOQ 267" with D = d × 365. */
export function EoqFormula({ b }: { b: Basis }) {
  if (b.eoq == null || b.avgDailyDemand == null) return <span className="vb-muted">Chưa tính EOQ</span>;
  return (
    <span style={{ fontVariantNumeric: 'tabular-nums' }}>
      √(2 × D {fmt(b.avgDailyDemand * 365)} × S {fmt(b.orderingCost)} / H {fmt(b.holdingCost)}) = EOQ <b>{fmt(b.eoq, 1)}</b>
    </span>
  );
}

/** Full basis block for dialogs: stock, demand, both formulas, when it was calculated. */
export function BasisBlock({ b }: { b: Basis }) {
  const rows: [string, React.ReactNode][] = [
    ['Tồn kho khả dụng', <b key="a">{fmt(b.available)} {b.unit}</b>],
    ['Nhu cầu trung bình (d)', b.avgDailyDemand == null ? '—' : `${fmt(b.avgDailyDemand, 2)} ${b.unit}/ngày (xuất 4 tuần gần nhất ÷ 28)`],
    ['Điểm đặt hàng lại', <RopFormula key="r" b={b} />],
    ['Lượng đặt hàng kinh tế', <EoqFormula key="e" b={b} />],
    ['Còn đủ bán', b.daysLeft == null ? '—' : `${fmt(b.daysLeft, 1)} ngày (thời gian giao hàng ${b.leadTimeDays} ngày)`],
    ['Tính lúc', fmtDateTime(b.calculatedAt)],
  ];
  return (
    <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: 'max-content 1fr', gap: '8px 16px' }}>
      {rows.map(([k, v]) => (
        <div key={k} style={{ display: 'contents' }}>
          <dt className="vb-muted" style={{ fontSize: 13 }}>{k}</dt>
          <dd style={{ margin: 0 }}>{v}</dd>
        </div>
      ))}
    </dl>
  );
}
