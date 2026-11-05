import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertBanner, ApprovalStepper, Button, DataTable, EmptyState, type DataTableColumn } from '../../design';
import { ApiError } from '../../app/api';
import { fmt, fmtDate, fmtDateTime, fmtShort } from '../../app/format';
import { ApprovalBadge, ItemStatusBadge, LotStatusBadge, SOURCE_LABEL } from '../../app/statusBadges';
import { useReport, type ReportRow } from '../../app/receiving';
import { Code, ListError, Loading } from '../../app/ui';
import { ReportDecision } from './ReportDecision';

/** UC_11 / UC_12: one abnormal report — what was found, on which lot, where, and the manager's decision. */
export function ReportDetail({ id, role, basePath }: { id: number; role: 'manager' | 'staff'; basePath: string }) {
  const view = useReport(id);
  const nav = useNavigate();
  const touch = role === 'staff';
  const size = touch ? 'lg' : 'md';
  const root = role === 'manager' ? '/ql' : '/kho';
  const lotBase = role === 'manager' ? '/ql/lo-hang' : '/kho/tra-cuu';

  if (view.isPending) return <Loading />;
  if (view.error instanceof ApiError && view.error.status === 404) {
    return (
      <div className="vb-panel">
        <EmptyState icon="search" title="Không tìm thấy biên bản" description="Biên bản không tồn tại."
          action={<Button variant="secondary" onClick={() => nav(basePath)}>Về danh sách biên bản</Button>} />
      </div>
    );
  }
  if (view.isError) return <ListError onRetry={() => view.refetch()} />;
  const { report: r, lot, items, others } = view.data;

  const source: ReactNode = r.sourceType === 'issue' && r.issueId
    ? <Link to={`${root}/xuat-kho/${r.issueId}`}>Phiếu xuất {view.data.issueCode}</Link>
    : r.sourceType === 'stocktake'
      ? view.data.stocktakeId
        ? <Link to={`${root}/kiem-ke/phieu/${view.data.stocktakeId}`}>Phiếu kiểm kê {view.data.stocktakeCode}</Link>
        : <span className="vb-muted">Phiếu kiểm kê chưa gửi</span>
      : <Link to={`${root}/nhap-kho/${r.receiptId}`}>Phiếu nhập {r.receiptCode}</Link>;

  const waitingReceipt = r.status === 'pending' && r.sourceType === 'receipt' && r.receiptStatus !== 'approved';
  const effect = r.status === 'approved'
    ? { tone: 'danger' as const, text: `Biên bản đã duyệt: lô ${r.lotCode} bị khóa, không được xuất và không tính vào tồn kho khả dụng.` }
    : r.status === 'rejected'
      ? { tone: 'info' as const, text: `Biên bản bị từ chối: lô ${r.lotCode} trở về Bình thường và được xuất như hàng đạt.` }
      : { tone: 'warning' as const, text: waitingReceipt
        ? `Biên bản được xét sau khi phiếu nhập ${r.receiptCode} được duyệt. Đến lúc đó lô ${r.lotCode} chưa vào kho.`
        : `Lô ${r.lotCode} đang tạm cách ly: ${fmt(lot.quantityOnHand)} ${lot.unit} không được xuất cho đến khi quản lý quyết định.` };

  const otherColumns: DataTableColumn<ReportRow>[] = [
    { key: 'code', header: 'Biên bản', width: 130, render: o => <Code>{o.code}</Code> },
    { key: 'createdAt', header: 'Lập lúc', width: 110, render: o => fmtShort(o.createdAt) },
    { key: 'source', header: 'Phát hiện khi', width: 110, render: o => SOURCE_LABEL[o.sourceType] },
    { key: 'description', header: 'Mô tả lỗi', render: o => <span style={{ whiteSpace: 'normal' }}>{o.description}</span> },
    { key: 'quantity', header: 'SL lỗi', numeric: true, width: 80, render: o => fmt(o.quantity) },
    { key: 'status', header: 'Trạng thái', width: 120, render: o => <ApprovalBadge status={o.status} /> },
  ];

  return (
    <div className="vb-stack">
      <div className="vb-row"><Button variant="ghost" size={size} icon="chevron-left" onClick={() => nav(basePath)}>Biên bản bất thường</Button></div>

      <section className="vb-panel">
        <div className="vb-panel__head" style={{ flexWrap: 'wrap', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <div className="vb-row" style={{ gap: 10 }}>
              <h2 className="vb-panel__title" style={{ fontSize: touch ? 20 : 18, letterSpacing: 'var(--tracking-code)' }}>{r.code}</h2>
              <ApprovalBadge status={r.status} size={size} />
            </div>
            <div className="vb-muted" style={{ marginTop: 2, fontSize: touch ? 14 : undefined }}>
              Phát hiện khi {SOURCE_LABEL[r.sourceType].toLowerCase()} · lập {fmtDateTime(r.createdAt)} bởi {r.creatorName}
            </div>
          </div>
          {role === 'manager' && <ReportDecision report={r} />}
        </div>
        <div className="vb-panel__body vb-stack" style={{ gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
            <Fact label="Lô hàng" value={<span className="vb-row" style={{ gap: 8 }}><Link to={`${lotBase}/${lot.id}`}><Code>{lot.lotCode}</Code></Link><LotStatusBadge status={lot.status} /></span>} />
            <Fact label="Mặt hàng" value={<span><Code>{lot.sku}</Code> {lot.productName}</span>} />
            <Fact label="Số lượng lỗi" value={<span><b>{fmt(r.quantity)}</b> / {fmt(lot.quantity)} {lot.unit} của lô</span>} />
            <Fact label="Chứng từ liên quan" value={source} />
            <Fact label="Nhà cung cấp" value={lot.supplierName} />
            <Fact label="Ngày nhập lô" value={`${fmtDate(lot.receivedDate)} · ${lot.receiptCode}`} />
          </div>
          <div>
            <div className="vb-muted">Mô tả lỗi</div>
            <p style={{ margin: '4px 0 0', whiteSpace: 'pre-wrap', fontSize: touch ? 16 : undefined }}>{r.description}</p>
          </div>
          {items.length > 0 && (
            <div>
              <div className="vb-muted">Sản phẩm của lô hiện nay</div>
              <div className="vb-row" style={{ gap: 12, marginTop: 6 }}>
                {items.map(i => <span key={i.status} className="vb-row" style={{ gap: 6, flexWrap: 'nowrap' }}><ItemStatusBadge status={i.status} /><b style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(i.count)}</b></span>)}
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="vb-panel">
        <div className="vb-panel__head"><h3 className="vb-panel__title">Xử lý biên bản</h3></div>
        <div className="vb-panel__body vb-stack" style={{ gap: 16 }}>
          <ApprovalStepper
            status={r.status} draftLabel="Lập biên bản" size={size}
            history={{
              draft: { by: r.creatorName, at: fmtDateTime(r.createdAt) },
              [r.status === 'rejected' ? 'rejected' : 'approved']: r.approvedAt ? { by: r.approverName, at: fmtDateTime(r.approvedAt), note: r.rejectReason } : undefined,
            }}
          />
          <AlertBanner tone={effect.tone}>{effect.text}</AlertBanner>
        </div>
      </section>

      {others.length > 0 && (
        <section className="vb-panel">
          <div className="vb-panel__head"><h3 className="vb-panel__title">Biên bản khác của lô {lot.lotCode}</h3></div>
          <DataTable columns={otherColumns} rows={others} density={touch ? 'default' : 'compact'} onRowClick={o => nav(`${basePath}/${o.id}`)}
            caption={`Biên bản khác của lô ${lot.lotCode}`} />
        </section>
      )}
    </div>
  );
}

function Fact({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div className="vb-muted">{label}</div>
      <div style={{ marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
    </div>
  );
}