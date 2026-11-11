import { useParams } from 'react-router-dom';
import { fmt, fmtDate, fmtDateTime, fmtDocDate, fmtTime } from '../../app/format';
import { ListError, Loading } from '../../app/ui';
import { PRIORITY_LABEL, useSavedReport, type ReportRow } from '../../app/decision';
import { DocFoot, DocSheet, DocSigns, DocTop, PrintToolbar } from './doc';

const dash = (n?: number | null, digits = 0) => (n == null ? '-' : fmt(n, digits));

/** One line of the report (Q19); "Theo dõi" lines have no quantity. */
function Line({ no, r }: { no: number; r: ReportRow }) {
  const p = r.proposal;
  return (
    <tr style={p ? undefined : { color: '#444' }}>
      <td style={{ textAlign: 'center' }}>{no}</td>
      <td>{r.basis.sku}</td>
      <td>{r.basis.productName}</td>
      <td>{r.basis.unit}</td>
      <td className="n">{dash(p?.availableQuantity ?? r.basis.available)}</td>
      <td className="n">{dash(p?.netQuantity ?? r.basis.net)}</td>
      <td className="n">{dash(p?.ropValue ?? r.basis.rop, 1)}</td>
      <td className="n">{dash(p?.eoqValue ?? r.basis.eoq)}</td>
      <td className="n">{dash(p?.avgDailyDemand ?? r.basis.avgDailyDemand, 2)}</td>
      <td className="n">{dash(r.daysLeft, 1)}</td>
      <td style={{ textAlign: 'center', fontWeight: r.priority === 'urgent' ? 700 : 400 }}>{PRIORITY_LABEL[r.priority]}</td>
      <td className="n">{p ? fmt(p.baseQuantity) : '-'}</td>
      <td className="n"><b>{p ? fmt(p.proposedQuantity) : '-'}</b></td>
      <td>
        {p ? <>
          {p.adjustBasis ?? '= ROP + EOQ − tồn ròng'}
          {p.adjustReason && <>; quản lý sửa {fmt(p.originalQuantity)} → {fmt(p.proposedQuantity)}: {p.adjustReason}</>}
        </> : 'Gợi ý gộp đơn'}
      </td>
    </tr>
  );
}

/**
 * Báo cáo đề xuất bổ sung hàng hóa (Q17–Q19) on A4 landscape, as the manager made it from the ticked proposals: one table per
 * main supplier with the supplier's "Theo dõi" products as a suggestion for the same order, then signatures. It supports putting orders together and does not replace the purchase order sent to the supplier.
 */
export function ReplenishmentPrintPage() {
  const saved = useSavedReport(Number(useParams().id));
  if (saved.isPending) return <div style={{ padding: 24 }}><Loading /></div>;
  if (saved.isError) return <div style={{ padding: 24 }}><ListError onRetry={() => saved.refetch()} /></div>;
  const { header: h, content: data } = saved.data;
  const groups = data.groups
    .map(g => ({
      ...g,
      urgent: g.rows.filter(r => r.proposal && r.priority === 'urgent').length,
      order: g.rows.filter(r => r.proposal && r.priority === 'order').length,
      watch: g.rows.filter(r => !r.proposal).length,
      totalQuantity: g.rows.reduce((s, r) => s + (r.proposal?.proposedQuantity ?? 0), 0),
    }));
  const now = h.createdAt;
  const lines = groups.flatMap(g => g.rows);
  const proposals = lines.filter(r => r.proposal);
  const lastDay = data.demandTo ? new Date(new Date(data.demandTo).getTime() - 1).toISOString() : undefined;
  let no = 0;

  return (
    <div className="vb-print">
      <PrintToolbar title={`In báo cáo đề xuất ${h.code}`} hint="Khổ A4 ngang." action="In báo cáo" wide />
      <DocSheet wide>
        <DocTop />
        <h1 className="vb-doc__title">BÁO CÁO ĐỀ XUẤT BỔ SUNG HÀNG HÓA</h1>
        <div className="vb-doc__meta">Số: {h.code} · Lập lúc {fmtTime(now)} {fmtDocDate(now)}</div>
        <div className="vb-doc__sub">
          Gồm {fmt(h.proposalCount)} đề xuất
          {data.calculatedAt && <> · ROP, EOQ tính lúc {fmtDateTime(data.calculatedAt)}</>}
          {data.demandFrom && lastDay && <> · nhu cầu từ đơn hàng {fmtDate(data.demandFrom)} – {fmtDate(lastDay)}</>}
        </div>

        <h2 className="vb-doc__h">I. Tổng hợp</h2>
        <table className="vb-doc__table">
          <colgroup><col style={{ width: '18%' }} /><col style={{ width: '32%' }} /><col style={{ width: '18%' }} /><col /></colgroup>
          <tbody>
            <tr>
              <th>Nhà cung cấp cần đặt</th><td>{fmt(groups.length)} nhà cung cấp</td>
              <th>Mặt hàng đề xuất</th>
              <td>{fmt(proposals.length)} mặt hàng: {fmt(proposals.filter(r => r.priority === 'urgent').length)} khẩn cấp, {fmt(proposals.filter(r => r.priority === 'order').length)} cần đặt</td>
            </tr>
            <tr>
              <th>Tổng số lượng đề xuất</th><td><b>{fmt(proposals.reduce((s, r) => s + r.proposal!.proposedQuantity, 0))}</b> sản phẩm</td>
              <th>Theo dõi, gợi ý gộp đơn</th><td>{lines.length > proposals.length ? lines.filter(r => !r.proposal).map(r => r.basis.sku).join(', ') : 'Không có'}</td>
            </tr>
          </tbody>
        </table>

        <h2 className="vb-doc__h">II. Đề xuất theo nhà cung cấp</h2>
        {groups.length === 0 ? <p className="vb-doc__text"><i>Báo cáo không có đề xuất.</i></p> : (
          <table className="vb-doc__table vb-doc__table--grid vb-doc__table--data">
            <colgroup>
              <col style={{ width: '3.5%' }} /><col style={{ width: '6.5%' }} /><col /><col style={{ width: '4%' }} />
              <col style={{ width: '5.5%' }} /><col style={{ width: '5.5%' }} /><col style={{ width: '5%' }} /><col style={{ width: '4.5%' }} />
              <col style={{ width: '5%' }} /><col style={{ width: '5%' }} /><col style={{ width: '7%' }} /><col style={{ width: '5%' }} />
              <col style={{ width: '6%' }} /><col style={{ width: '17%' }} />
            </colgroup>
            <thead>
              <tr>
                <th rowSpan={2}>STT</th><th rowSpan={2}>Mã SKU</th><th rowSpan={2}>Tên hàng</th><th rowSpan={2}>ĐVT</th>
                <th colSpan={2}>Tồn kho</th><th rowSpan={2}>ROP</th><th rowSpan={2}>EOQ</th><th rowSpan={2}>Nhu cầu TB/ngày</th>
                <th rowSpan={2}>Số ngày tồn còn lại</th><th rowSpan={2}>Mức ưu tiên</th><th colSpan={2}>Số lượng</th><th rowSpan={2}>Căn cứ điều chỉnh</th>
              </tr>
              <tr><th>Khả dụng</th><th>Ròng</th><th>Gốc</th><th>Đề xuất</th></tr>
            </thead>
            {groups.map(g => (
              <tbody key={g.supplierId} className="vb-doc__grp">
                <tr className="vb-doc__group">
                  <td colSpan={14}>
                    Nhà cung cấp: {g.supplierName}{g.phone && ` · ĐT ${g.phone}`}{g.address && ` · ${g.address}`}
                  </td>
                </tr>
                {g.rows.map(r => <Line key={r.proposal?.id ?? `w-${r.basis.productId}`} no={++no} r={r} />)}
                <tr className="vb-doc__subtotal">
                  <td colSpan={12} style={{ textAlign: 'right' }}>
                    Cộng {g.supplierName}: {g.urgent + g.order} mặt hàng cần đặt{g.watch ? `, ${g.watch} theo dõi` : ''}
                  </td>
                  <td className="n"><b>{fmt(g.totalQuantity)}</b></td><td />
                </tr>
              </tbody>
            ))}
            <tbody>
              <tr className="vb-doc__total">
                <td colSpan={12} style={{ textAlign: 'center' }}>TỔNG CỘNG</td>
                <td className="n">{fmt(groups.reduce((s, g) => s + g.totalQuantity, 0))}</td><td />
              </tr>
            </tbody>
          </table>
        )}

        <DocSigns place={`Bình Dương, ${fmtDocDate(now)}`} people={[{ role: 'Người lập biểu', name: h.creatorName }, { role: 'Quản lý kho' }]} />
        <DocFoot code="Báo cáo đề xuất bổ sung hàng hóa" />
      </DocSheet>
    </div>
  );
}
