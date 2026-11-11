import { fmt, fmtDateTime } from '../../app/format';
import { PRIORITY_LABEL, type Basis, type ProposalRow } from '../../app/decision';

/** No ROP (Q3): the demand state instead; the rule is in docs/huong-dan-su-dung.md. */
export function NoRop({ b }: { b: Basis }) {
  return <span className="vb-muted">{b.demandState === 'slowMoving' ? 'Chậm luân chuyển' : 'Chưa đủ dữ liệu'}</span>;
}

/** "SS 1,65 × σ 2,0 × √7 = 8,7" (Q4). */
export function SsFormula({ b }: { b: Basis }) {
  if (b.safetyStock == null || b.sigma == null) return <NoRop b={b} />;
  return <span style={{ fontVariantNumeric: 'tabular-nums' }}>1,65 × σ {fmt(b.sigma, 2)} × √{b.leadTimeDays} = SS <b>{fmt(b.safetyStock, 1)}</b></span>;
}

/** "d 3,04/ngày × L 10 + SS 9,2 = ROP 39,6" (Q4). */
export function RopFormula({ b }: { b: Basis }) {
  if (b.rop == null) return <NoRop b={b} />;
  return (
    <span style={{ fontVariantNumeric: 'tabular-nums' }}>
      d {fmt(b.avgDailyDemand, 2)}/ngày × L {b.leadTimeDays} + SS {fmt(b.safetyStock, 1)} = ROP <b>{fmt(b.rop, 1)}</b>
    </span>
  );
}

/** "√(2 × D 1.110 × S 450.000 / H 14.000) = EOQ 267", rounded up (Q5). */
export function EoqFormula({ b }: { b: Basis }) {
  if (b.eoq == null || b.avgDailyDemand == null) return <span className="vb-muted">Chưa tính EOQ</span>;
  return (
    <span style={{ fontVariantNumeric: 'tabular-nums' }}>
      ⌈√(2 × D {fmt(b.avgDailyDemand * 365)} × S {fmt(b.orderingCost)} / H {fmt(b.holdingCost)})⌉ = EOQ <b>{fmt(b.eoq)}</b>
    </span>
  );
}

/** "Khả dụng 120 − đơn chưa xuất 40 = tồn ròng 80" (Q8). */
export function NetFormula({ available, ordered, net, unit }: { available: number; ordered: number; net: number; unit?: string }) {
  return (
    <span style={{ fontVariantNumeric: 'tabular-nums' }}>
      Khả dụng {fmt(available)} − đơn chưa xuất {fmt(ordered)} = tồn ròng <b>{fmt(net)}</b>{unit && ` ${unit}`}
    </span>
  );
}

/** Q13–Q16 of a proposal: "ROP 43,7 + EOQ 68 − tồn ròng 30 = 82", then "→ 420 (Vượt trần …)" when cut to 12 weeks. */
export function QuantityFormula({ p }: { p: ProposalRow }) {
  return (
    <span style={{ fontVariantNumeric: 'tabular-nums' }}>
      ROP {fmt(p.ropValue, 1)} + EOQ {fmt(p.eoqValue)} − tồn ròng {fmt(p.netQuantity)} = <b>{fmt(p.baseQuantity)}</b>
      {p.originalQuantity !== p.baseQuantity && <> → <b>{fmt(p.originalQuantity)}</b></>}
      {p.adjustBasis && <span className="vb-muted"> ({p.adjustBasis})</span>}
    </span>
  );
}

/** Full basis block for dialogs: stock, demand, the formulas, when it was calculated. */
export function BasisBlock({ b }: { b: Basis }) {
  const rows: [string, React.ReactNode][] = [
    ['Tồn ròng', <NetFormula key="n" available={b.available} ordered={b.ordered} net={b.net} unit={b.unit} />],
    ['Nhu cầu (từ đơn hàng)', b.avgDailyDemand == null ? <NoRop key="d" b={b} />
      : `d ${fmt(b.avgDailyDemand, 2)} ${b.unit}/ngày · σ ${fmt(b.sigma, 2)}`],
    ['Tồn kho an toàn', <SsFormula key="s" b={b} />],
    ['Điểm đặt hàng lại', <RopFormula key="r" b={b} />],
    ['Lượng đặt hàng kinh tế', <EoqFormula key="e" b={b} />],
    ['Còn đủ bán', b.daysLeft == null ? '—' : `${fmt(b.daysLeft, 1)} ngày · L ${b.leadTimeDays} ngày`],
    ['Mức ưu tiên', b.priority ? PRIORITY_LABEL[b.priority] : '—'],
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
