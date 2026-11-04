import { useNavigate, useSearchParams } from 'react-router-dom';
import { DataTable, EmptyState, type DataTableColumn } from '../../../design';
import { fmt, fmtShort } from '../../../app/format';
import { Segmented } from '../../../app/Segmented';
import { Code, ListError, Loading } from '../../../app/ui';
import { ReceiptStatusBadge } from '../../../app/statusBadges';
import { useApprovalSummary, useReceipts, useReports, type ReceiptRow, type ReportRow } from '../../../app/receiving';
import { useIssues, type IssueRow } from '../../../app/issuing';
import { useStocktakes, type StocktakeRow } from '../../../app/stock';
import { ReportDecision } from '../../abnormal/ReportDecision';

type Tab = 'nhap-kho' | 'xuat-kho' | 'kiem-ke' | 'bat-thuong';

/** UC_10 / UC_12 step 1: everything waiting for the manager, grouped by document type. */
export function ApprovalsPage() {
  const [params, setParams] = useSearchParams();
  const tab = (params.get('loai') as Tab) || 'nhap-kho';
  const summary = useApprovalSummary();

  return (
    <div className="vb-stack">
      <Segmented<Tab>
        label="Loại chứng từ" value={tab} onChange={t => setParams({ loai: t }, { replace: true })}
        options={[
          { value: 'nhap-kho', label: 'Phiếu nhập kho', count: summary.data?.receipts },
          { value: 'xuat-kho', label: 'Phiếu xuất kho', count: summary.data?.issues },
          { value: 'kiem-ke', label: 'Phiếu kiểm kê', count: summary.data?.stocktakes },
          { value: 'bat-thuong', label: 'Biên bản bất thường', count: summary.data?.abnormalReports },
        ]}
      />
      {tab === 'nhap-kho' && <PendingReceipts />}
      {tab === 'xuat-kho' && <PendingIssues />}
      {tab === 'kiem-ke' && <PendingStocktakes />}
      {tab === 'bat-thuong' && <PendingReports />}
    </div>
  );
}

function PendingReceipts() {
  const receipts = useReceipts({ status: 'pending' });
  const nav = useNavigate();
  const columns: DataTableColumn<ReceiptRow>[] = [
    { key: 'code', header: 'Mã phiếu', width: 130, render: r => <Code>{r.code}</Code> },
    { key: 'submittedAt', header: 'Gửi lúc', width: 120, render: r => fmtShort(r.submittedAt) },
    { key: 'supplierName', header: 'Nhà cung cấp' },
    { key: 'creatorName', header: 'Người lập', width: 160 },
    { key: 'quantity', header: 'Hàng nhập', numeric: true, width: 160, render: r => <>{fmt(r.totalQuantity)} <span className="vb-muted">· {r.productCount} mặt hàng</span></> },
    {
      key: 'reports', header: 'Kèm theo', width: 150,
      render: r => r.pendingReports > 0 ? <span>{r.pendingReports} biên bản bất thường</span> : <span className="vb-muted">—</span>,
    },
    { key: 'resent', header: '', width: 120, render: r => r.rejectReason ? <span className="vb-muted" title={`Lần trước: ${r.rejectReason}`}>Gửi lại</span> : null },
  ];
  if (receipts.isPending) return <Loading />;
  if (receipts.isError) return <ListError onRetry={() => receipts.refetch()} />;
  return (
    <DataTable
      columns={columns} rows={receipts.data} onRowClick={r => nav(`/ql/nhap-kho/${r.id}`)} caption="Phiếu nhập chờ duyệt"
      empty={<EmptyState icon="clipboard-check" title="Không có phiếu nhập chờ duyệt" description="Phiếu do nhân viên kho gửi sẽ hiện ở đây." />}
    />
  );
}

function PendingIssues() {
  const issues = useIssues({ status: 'pending' });
  const nav = useNavigate();
  const columns: DataTableColumn<IssueRow>[] = [
    { key: 'code', header: 'Mã phiếu', width: 130, render: i => <Code>{i.code}</Code> },
    { key: 'issueDate', header: 'Lập lúc', width: 120, render: i => fmtShort(i.issueDate) },
    { key: 'order', header: 'Đơn hàng', render: i => <span><Code>{i.orderCode}</Code> <span className="vb-muted">{i.customerName}</span></span> },
    { key: 'creatorName', header: 'Người lập', width: 160 },
    { key: 'quantity', header: 'Số lượng', numeric: true, width: 160, render: i => <>{fmt(i.totalQuantity)} <span className="vb-muted">· {i.productCount} mặt hàng</span></> },
  ];
  if (issues.isPending) return <Loading />;
  if (issues.isError) return <ListError onRetry={() => issues.refetch()} />;
  return (
    <DataTable
      columns={columns} rows={issues.data} onRowClick={i => nav(`/ql/xuat-kho/${i.id}`)} caption="Phiếu xuất chờ duyệt"
      empty={<EmptyState icon="clipboard-check" title="Không có phiếu xuất chờ duyệt" description="Phiếu lập từ đơn hàng sẽ hiện ở đây." />}
    />
  );
}

function PendingStocktakes() {
  const stocktakes = useStocktakes('pending');
  const nav = useNavigate();
  const columns: DataTableColumn<StocktakeRow>[] = [
    { key: 'code', header: 'Phiếu kiểm kê', width: 130, render: s => <Code>{s.code}</Code> },
    { key: 'stocktakeDate', header: 'Gửi lúc', width: 120, render: s => fmtShort(s.stocktakeDate) },
    { key: 'plan', header: 'Kế hoạch', width: 130, render: s => <Code>{s.planCode}</Code> },
    { key: 'creatorName', header: 'Người kiểm', width: 160 },
    { key: 'lots', header: 'Lô kiểm', numeric: true, width: 90, render: s => fmt(s.lotCount) },
    {
      key: 'diff', header: 'Chênh lệch',
      render: s => s.diffLots === 0 ? <span className="vb-muted">Khớp hệ thống</span>
        : <span>{s.diffLots} lô · thiếu {fmt(s.shortage)} · thừa {fmt(s.surplus)}</span>,
    },
  ];
  if (stocktakes.isPending) return <Loading />;
  if (stocktakes.isError) return <ListError onRetry={() => stocktakes.refetch()} />;
  return (
    <DataTable
      columns={columns} rows={stocktakes.data} onRowClick={s => nav(`/ql/kiem-ke/phieu/${s.id}`)} caption="Phiếu kiểm kê chờ duyệt"
      empty={<EmptyState icon="list-checks" title="Không có phiếu kiểm kê chờ duyệt" description="Phiếu kiểm kê do nhân viên gửi sẽ hiện ở đây." />}
    />
  );
}

function PendingReports() {
  const reports = useReports('pending');
  const nav = useNavigate();

  const columns: DataTableColumn<ReportRow>[] = [
    { key: 'code', header: 'Biên bản', width: 130, render: r => <Code>{r.code}</Code> },
    { key: 'createdAt', header: 'Lập lúc', width: 110, render: r => fmtShort(r.createdAt) },
    { key: 'lot', header: 'Lô · mặt hàng', render: r => <span><Code>{r.lotCode}</Code> <span className="vb-muted">{r.sku}</span> {r.productName}</span> },
    { key: 'description', header: 'Mô tả lỗi', render: r => <span style={{ whiteSpace: 'normal' }}>{r.description}</span> },
    { key: 'quantity', header: 'SL lỗi', numeric: true, width: 80, render: r => fmt(r.quantity) },
    {
      key: 'receipt', header: 'Phát hiện khi', width: 210,
      render: r => r.sourceType === 'issue' && r.issueId
        ? (
          <button type="button" className="vb-btn vb-btn--ghost vb-btn--sm" onClick={e => { e.stopPropagation(); nav(`/ql/xuat-kho/${r.issueId}`); }}>
            Xuất kho · xem phiếu xuất
          </button>
        )
        : r.sourceType === 'receipt'
          ? (
            <button type="button" className="vb-btn vb-btn--ghost vb-btn--sm" onClick={e => { e.stopPropagation(); nav(`/ql/nhap-kho/${r.receiptId}`); }}>
              <Code>{r.receiptCode}</Code>&nbsp;<ReceiptStatusBadge status={r.receiptStatus} />
            </button>
          )
          : <span>Kiểm kê</span>,
    },
    { key: 'actions', header: '', width: 220, align: 'right', render: r => <ReportDecision report={r} /> },
  ];

  if (reports.isPending) return <Loading />;
  if (reports.isError) return <ListError onRetry={() => reports.refetch()} />;
  return (
    <DataTable
      columns={columns} rows={reports.data} caption="Biên bản bất thường chờ duyệt"
      empty={<EmptyState icon="shield-alert" title="Không có biên bản chờ duyệt" description="Biên bản lập khi nhập kho, xuất kho hoặc kiểm kê sẽ hiện ở đây." />}
    />
  );
}
