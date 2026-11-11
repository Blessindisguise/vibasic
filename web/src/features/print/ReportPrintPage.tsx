import { useParams } from 'react-router-dom';
import { fmt, fmtDate, fmtDateTime, fmtDocDate, fmtTime } from '../../app/format';
import { ListError, Loading } from '../../app/ui';
import { ITEM_STATUS_LABEL, LOT_STATUS_LABEL, SCOPE_LABEL, SOURCE_LABEL } from '../../app/statusBadges';
import { toRanges } from '../../app/SerialRanges';
import type { ItemStatus } from '../../app/issuing';
import { useReport, type ApprovalStatus } from '../../app/receiving';
import { reportEffect, reportSourceText } from '../abnormal/reportEffect';
import { Codes, DocFoot, DocSheet, DocSigns, DocTop, PrintToolbar } from './doc';

const DECISION: Record<ApprovalStatus, string> = { pending: 'Chờ quản lý duyệt', approved: 'Đã duyệt', rejected: 'Từ chối' };

const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

/** UC_11 / UC_12: the abnormal report as a paper document (A4), to sign and keep with the supplier's papers. */
export function ReportPrintPage() {
  const id = Number(useParams().id);
  const view = useReport(id);

  if (view.isPending) return <div style={{ padding: 24 }}><Loading /></div>;
  if (view.isError) return <div style={{ padding: 24 }}><ListError onRetry={() => view.refetch()} /></div>;
  const v = view.data;
  const { report: r, lot, defective, items } = v;
  const effect = reportEffect(r, lot);
  const groups = (Object.entries(
    defective.reduce<Partial<Record<ItemStatus, string[]>>>((m, i) => ({ ...m, [i.status]: [...(m[i.status] ?? []), i.serial] }), {}),
  ) as [ItemStatus, string[]][]).flatMap(([status, serials]) => toRanges(serials).map(range => ({ status, ...range })));
  const decided = r.status !== 'pending';
  const supplierSigns = r.sourceType === 'receipt';
  const tail = (s: string) => s.slice(s.lastIndexOf('-') + 1);

  return (
    <div className="vb-print">
      <PrintToolbar title={`In biên bản ${r.code}`} hint="Khổ A4 dọc." action="In biên bản" />

      <DocSheet>
        <DocTop />

        <h1 className="vb-doc__title">BIÊN BẢN HÀNG HÓA BẤT THƯỜNG</h1>
        <div className="vb-doc__sub">Số: <b>{r.code}</b></div>
        <p className="vb-doc__lead">
          Hôm nay, {fmtDocDate(r.createdAt)}, lúc {fmtTime(r.createdAt)}, trong khi {SOURCE_LABEL[r.sourceType].toLowerCase()} (<Codes text={lowerFirst(reportSourceText(v))} />),
          bộ phận kho phát hiện hàng hóa không đạt yêu cầu và lập biên bản với nội dung sau.
        </p>

        <h2 className="vb-doc__h">I. Hàng hóa liên quan</h2>
        <table className="vb-doc__table">
          <colgroup><col style={{ width: '19%' }} /><col style={{ width: '33%' }} /><col style={{ width: '17%' }} /><col /></colgroup>
          <tbody>
            <tr><th>Mã lô</th><td><b style={{ whiteSpace: 'nowrap' }}>{lot.lotCode}</b> ({LOT_STATUS_LABEL[lot.status]})</td><th>Ngày nhập lô</th><td>{fmtDate(lot.receivedDate)}</td></tr>
            <tr><th>Mặt hàng</th><td colSpan={3}>{lot.sku} · {lot.productName}</td></tr>
            <tr><th>Nhà cung cấp</th><td>{lot.supplierName}</td><th>Phiếu nhập</th><td>{lot.receiptCode}</td></tr>
            <tr><th>Số lượng của lô</th><td>{fmt(lot.quantity)} {lot.unit}</td><th>Số lượng lỗi</th><td><b>{fmt(r.quantity)} {lot.unit}</b></td></tr>
            <tr><th>Phát hiện khi</th><td>{SOURCE_LABEL[r.sourceType]}</td><th>Chứng từ</th><td>{r.sourceType === 'issue' ? v.issueCode : r.sourceType === 'stocktake' ? v.stocktakeCode ?? 'Chưa gửi' : r.receiptCode}</td></tr>
            <tr><th>Phạm vi xử lý</th><td colSpan={3}>{SCOPE_LABEL[r.scope]}{r.scope === 'lot' ? ': cả lô được cách ly cho đến khi quản lý quyết định' : ': chỉ các sản phẩm ghi dưới đây được tách khỏi tồn kho'}</td></tr>
          </tbody>
        </table>

        <h2 className="vb-doc__h">II. Mô tả tình trạng hàng</h2>
        <p className="vb-doc__text">{r.description}</p>

        <h2 className="vb-doc__h">III. Danh sách sản phẩm lỗi</h2>
        {groups.length === 0
          ? <p className="vb-doc__text"><i>Biên bản lập trước khi hệ thống ghi mã từng sản phẩm lỗi. Số lượng lỗi: {fmt(r.quantity)} {lot.unit}.</i></p>
          : (
            <table className="vb-doc__table vb-doc__table--grid">
              <thead><tr><th style={{ width: '8%' }}>STT</th><th>Mã sản phẩm</th><th style={{ width: '15%' }}>Số lượng</th><th style={{ width: '24%' }}>Tình trạng hiện nay</th></tr></thead>
              <tbody>
                {groups.map((g, i) => (
                  <tr key={g.first}>
                    <td style={{ textAlign: 'center' }}>{i + 1}</td>
                    <td className="vb-doc__code">{g.count === 1 ? g.first : `${g.first} đến ${tail(g.last)}`}</td>
                    <td style={{ textAlign: 'right' }}>{fmt(g.count)} {lot.unit}</td>
                    <td>{ITEM_STATUS_LABEL[g.status]}</td>
                  </tr>
                ))}
                <tr className="vb-doc__total">
                  <td colSpan={2}>Tổng cộng</td>
                  <td style={{ textAlign: 'right' }}>{fmt(defective.length)} {lot.unit}</td>
                  <td />
                </tr>
              </tbody>
            </table>
          )}
        {items.length > 0 && (
          <p className="vb-doc__note">
            Tình trạng toàn lô lúc in: {items.map(i => `${ITEM_STATUS_LABEL[i.status]} ${fmt(i.count)}`).join(' · ')} ({lot.unit}).
          </p>
        )}

        <h2 className="vb-doc__h">IV. Ý kiến xử lý của quản lý kho</h2>
        <table className="vb-doc__table">
          <colgroup><col style={{ width: '19%' }} /><col style={{ width: '33%' }} /><col style={{ width: '17%' }} /><col /></colgroup>
          <tbody>
            <tr><th>Kết quả</th><td><b>{DECISION[r.status]}</b></td><th>Thời điểm</th><td>{decided ? fmtDateTime(r.approvedAt) : '…………………………'}</td></tr>
            {r.status === 'rejected' && <tr><th>Lý do từ chối</th><td colSpan={3}>{r.rejectReason}</td></tr>}
            <tr><th>Hướng xử lý</th><td colSpan={3}><Codes text={effect.text} /></td></tr>
          </tbody>
        </table>
        {!decided && <div className="vb-doc__blank" aria-hidden="true">Ý kiến bổ sung: ……………………………………………………………………………………………………………………………</div>}

        <p className="vb-doc__text">
          {supplierSigns
            ? 'Biên bản được lập thành hai bản, bộ phận kho giữ một bản, nhà cung cấp giữ một bản.'
            : <Codes text={`Biên bản được lưu tại bộ phận kho cùng ${lowerFirst(reportSourceText(v))}.`} />}
        </p>

        <DocSigns people={[
          { role: 'Người lập biên bản', name: r.creatorName },
          ...(supplierSigns ? [{ role: 'Đại diện nhà cung cấp' }] : []),
          { role: 'Quản lý kho', name: decided ? r.approverName : undefined },
        ]} />

        <DocFoot code={r.code} />
      </DocSheet>
    </div>
  );
}
