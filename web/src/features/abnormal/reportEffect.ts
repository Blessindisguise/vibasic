import { fmt } from '../../app/format';
import type { ReportRow } from '../../app/receiving';
import type { LotRow } from '../../app/stock';

/** What the report does to stock right now, in one sentence (detail screen banner and the printed report). */
export function reportEffect(r: ReportRow, lot: LotRow): { tone: 'danger' | 'info' | 'warning'; text: string } {
  const n = `${fmt(r.quantity)} ${lot.unit}`;
  const lotWide = r.scope === 'lot';
  if (r.status === 'approved') {
    return lotWide
      ? { tone: 'danger', text: `Biên bản đã duyệt: lô ${r.lotCode} bị khóa, không được xuất và không tính vào tồn kho khả dụng.` }
      : { tone: 'danger', text: `Biên bản đã duyệt: ${n} lỗi đã loại khỏi tồn kho (trạng thái Lỗi), chờ trả nhà cung cấp hoặc hủy. Phần còn lại của lô ${r.lotCode} xuất bình thường.` };
  }
  if (r.status === 'rejected') {
    return lotWide
      ? { tone: 'info', text: `Biên bản bị từ chối: lô ${r.lotCode} trở về Bình thường và được xuất như hàng đạt.` }
      : { tone: 'info', text: `Biên bản bị từ chối: ${n} trở về Trong kho và được xuất như hàng đạt.` };
  }
  const waitingReceipt = r.sourceType === 'receipt' && r.receiptStatus !== 'approved';
  return {
    tone: 'warning',
    text: waitingReceipt
      ? `Biên bản được xét sau khi phiếu nhập ${r.receiptCode} được duyệt. Đến lúc đó lô ${r.lotCode} chưa vào kho.`
      : lotWide
        ? `Nghi lỗi cả lô: lô ${r.lotCode} đang tạm cách ly, ${fmt(lot.quantityOnHand)} ${lot.unit} không được xuất cho đến khi quản lý quyết định.`
        : `${n} lỗi đã tách khỏi tồn kho, để riêng ở khu hàng lỗi chờ quản lý quyết định. Phần còn lại của lô ${r.lotCode} vẫn xuất được.`,
  };
}

/** "Phiếu xuất PX-…", "Phiếu kiểm kê KK-…" or "Phiếu nhập PN-…": the document during which the defect was found. */
export function reportSourceText(v: { report: ReportRow; issueCode?: string; stocktakeCode?: string }): string {
  const r = v.report;
  if (r.sourceType === 'issue') return `Phiếu xuất ${v.issueCode ?? ''}`.trim();
  if (r.sourceType === 'stocktake') return v.stocktakeCode ? `Phiếu kiểm kê ${v.stocktakeCode}` : 'Phiếu kiểm kê chưa gửi';
  return `Phiếu nhập ${r.receiptCode}`;
}
