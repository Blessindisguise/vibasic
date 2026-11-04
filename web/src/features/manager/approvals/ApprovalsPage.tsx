import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, ConfirmDialog, DataTable, EmptyState, type DataTableColumn } from '../../../design';
import { fmt, fmtDateTime, fmtShort } from '../../../app/format';
import { Segmented } from '../../../app/Segmented';
import { useToast } from '../../../app/toast';
import { Code, ListError, Loading } from '../../../app/ui';
import { ReceiptStatusBadge } from '../../../app/statusBadges';
import { useApprovalSummary, useReceipts, useReportAction, useReports, type ReceiptRow, type ReportRow } from '../../../app/receiving';

type Tab = 'nhap-kho' | 'bat-thuong';

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
          { value: 'bat-thuong', label: 'Biên bản bất thường', count: summary.data?.abnormalReports },
        ]}
      />
      {tab === 'nhap-kho' ? <PendingReceipts /> : <PendingReports />}
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

function PendingReports() {
  const reports = useReports('pending');
  const action = useReportAction();
  const toast = useToast();
  const nav = useNavigate();
  const [dialog, setDialog] = useState<{ report: ReportRow; kind: 'approve' | 'reject' } | null>(null);

  const run = (report: ReportRow, kind: 'approve' | 'reject', reason?: string) => action.mutate({ id: report.id, action: kind, reason }, {
    onSuccess: () => {
      setDialog(null);
      toast({ tone: kind === 'approve' ? 'success' : 'info', title: kind === 'approve' ? `Đã khóa lô ${report.lotCode}` : `Lô ${report.lotCode} trở về Bình thường` });
    },
    onError: e => { setDialog(null); toast({ tone: 'danger', title: 'Không thực hiện được', message: e.message }); },
  });

  const columns: DataTableColumn<ReportRow>[] = [
    { key: 'code', header: 'Biên bản', width: 130, render: r => <Code>{r.code}</Code> },
    { key: 'createdAt', header: 'Lập lúc', width: 110, render: r => fmtShort(r.createdAt) },
    { key: 'lot', header: 'Lô · mặt hàng', render: r => <span><Code>{r.lotCode}</Code> <span className="vb-muted">{r.sku}</span> {r.productName}</span> },
    { key: 'description', header: 'Mô tả lỗi', render: r => <span style={{ whiteSpace: 'normal' }}>{r.description}</span> },
    { key: 'quantity', header: 'SL lỗi', numeric: true, width: 80, render: r => fmt(r.quantity) },
    {
      key: 'receipt', header: 'Phiếu nhập', width: 200,
      render: r => (
        <button type="button" className="vb-btn vb-btn--ghost vb-btn--sm" onClick={e => { e.stopPropagation(); nav(`/ql/nhap-kho/${r.receiptId}`); }}>
          <Code>{r.receiptCode}</Code>&nbsp;<ReceiptStatusBadge status={r.receiptStatus} />
        </button>
      ),
    },
    {
      key: 'actions', header: '', width: 210, align: 'right',
      render: r => r.receiptStatus !== 'approved'
        ? <span className="vb-muted">Duyệt phiếu {r.receiptCode} trước</span>
        : (
          <div className="vb-row" style={{ justifyContent: 'flex-end', flexWrap: 'nowrap' }}>
            <Button size="sm" variant="danger-outline" onClick={() => setDialog({ report: r, kind: 'reject' })}>Từ chối</Button>
            <Button size="sm" variant="secondary" icon="lock" onClick={() => setDialog({ report: r, kind: 'approve' })}>Duyệt, khóa lô</Button>
          </div>
        ),
    },
  ];

  if (reports.isPending) return <Loading />;
  if (reports.isError) return <ListError onRetry={() => reports.refetch()} />;
  return (
    <>
      <DataTable
        columns={columns} rows={reports.data} caption="Biên bản bất thường chờ duyệt"
        empty={<EmptyState icon="shield-alert" title="Không có biên bản chờ duyệt" description="Biên bản lập khi nhập kho, xuất kho hoặc kiểm kê sẽ hiện ở đây." />}
      />
      {dialog?.kind === 'approve' && (
        <ConfirmDialog
          title={`Duyệt biên bản ${dialog.report.code} và khóa lô ${dialog.report.lotCode}?`}
          description={`${fmt(dialog.report.quantity)} ${dialog.report.unit} ${dialog.report.productName} bị loại khỏi tồn kho khả dụng và không được xuất. Lập lúc ${fmtDateTime(dialog.report.createdAt)} bởi ${dialog.report.creatorName}.`}
          confirmLabel="Duyệt, khóa lô" onConfirm={() => run(dialog.report, 'approve')} onCancel={() => setDialog(null)}
        />
      )}
      {dialog?.kind === 'reject' && (
        <ConfirmDialog
          tone="danger" requireReason title={`Từ chối biên bản ${dialog.report.code}?`}
          description={`Lô ${dialog.report.lotCode} trở về Bình thường; ${fmt(dialog.report.quantity)} ${dialog.report.unit} được tính vào tồn kho khả dụng.`}
          confirmLabel="Từ chối biên bản" onConfirm={reason => run(dialog.report, 'reject', reason)} onCancel={() => setDialog(null)}
        />
      )}
    </>
  );
}
