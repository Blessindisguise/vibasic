import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DataTable, EmptyState, SearchField, type DataTableColumn, type Suggestion } from '../../../design';
import { fmt, fmtShort } from '../../../app/format';
import { Segmented } from '../../../app/Segmented';
import { Code, ListError, Loading } from '../../../app/ui';
import { matches } from '../../../app/text';
import { suggestFrom } from '../../../app/suggest';
import { ReceiptStatusBadge, SCOPE_LABEL } from '../../../app/statusBadges';
import { REPORT_SEARCH_PLACEHOLDER, reportHref, reportSearchFields, useApprovalSummary, useReceipts, useReports, type ReceiptRow, type ReportRow } from '../../../app/receiving';
import { useStocktakes, type StocktakeRow } from '../../../app/stock';
import { stocktakeFields } from '../../stocktake/columns';
import { ReportDecision } from '../../abnormal/ReportDecision';

type Tab = 'nhap-kho' | 'kiem-ke' | 'bat-thuong';

// What the search box matches, per document type.
const receiptFields = (r: ReceiptRow) => [r.code, r.supplierName, r.creatorName, r.deliveryNoteNo];
const reportFields = reportSearchFields;
const NOT_FOUND = <EmptyState icon="search" title="Không tìm thấy chứng từ phù hợp" description="Thử từ khóa khác." />;
const PLACEHOLDER: Record<Tab, string> = {
  'nhap-kho': 'Mã phiếu, NCC, số chứng từ, người lập…',
  'kiem-ke': 'Mã phiếu, kế hoạch, người kiểm…',
  'bat-thuong': REPORT_SEARCH_PLACEHOLDER,
};

/** UC_10 / UC_12 step 1: everything waiting for the manager, grouped by document type. Goods issues need no approval. */
export function ApprovalsPage() {
  const [params, setParams] = useSearchParams();
  const tab = (params.get('loai') as Tab) || 'nhap-kho';
  const summary = useApprovalSummary();
  const nav = useNavigate();
  const [search, setSearch] = useState('');
  // The same (cached) queries as the tabs below, for the type-ahead of the open tab. A suggestion's key is the page it opens.
  const receipts = useReceipts({ status: 'pending' });
  const stocktakes = useStocktakes('pending');
  const reports = useReports('pending');
  const suggestions: Suggestion<unknown>[] = {
    'nhap-kho': () => suggestFrom(receipts.data, search, receiptFields, r => ({ key: `/ql/nhap-kho/${r.id}`, label: r.code, hint: `${r.supplierName} · ${r.creatorName}` })),
    'kiem-ke': () => suggestFrom(stocktakes.data, search, stocktakeFields, t => ({ key: `/ql/kiem-ke/phieu/${t.id}`, label: t.code, hint: `Kế hoạch ${t.planCode} · ${t.creatorName}` })),
    'bat-thuong': () => suggestFrom(reports.data, search, reportFields, r => ({ key: reportHref('manager', r.id), label: r.code, hint: `${r.lotCode} · ${r.sku} ${r.productName}` })),
  }[tab]();

  return (
    <div className="vb-stack">
      <div className="vb-row" style={{ gap: 12 }}>
        <Segmented<Tab>
          label="Loại chứng từ" value={tab} onChange={t => { setParams({ loai: t }, { replace: true }); setSearch(''); }}
          options={[
            { value: 'nhap-kho', label: 'Phiếu nhập kho', count: summary.data?.receipts },
            { value: 'kiem-ke', label: 'Phiếu kiểm kê', count: summary.data?.stocktakes },
            { value: 'bat-thuong', label: 'Biên bản bất thường', count: summary.data?.abnormalReports },
          ]}
        />
        <SearchField
          placeholder={PLACEHOLDER[tab]} value={search} onChange={setSearch} style={{ width: 300 }} aria-label="Tìm chứng từ chờ duyệt" align="end"
          suggestions={suggestions} onPickSuggestion={s => nav(s.key)}
        />
      </div>
      {tab === 'nhap-kho' && <PendingReceipts search={search} />}
      {tab === 'kiem-ke' && <PendingStocktakes search={search} />}
      {tab === 'bat-thuong' && <PendingReports search={search} />}
    </div>
  );
}

function PendingReceipts({ search }: { search: string }) {
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
      columns={columns} rows={receipts.data.filter(r => matches(search, ...receiptFields(r)))} onRowClick={r => nav(`/ql/nhap-kho/${r.id}`)} caption="Phiếu nhập chờ duyệt"
      empty={search ? NOT_FOUND : <EmptyState icon="clipboard-check" title="Không có phiếu nhập chờ duyệt" />}
    />
  );
}

function PendingStocktakes({ search }: { search: string }) {
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
      columns={columns} rows={stocktakes.data.filter(s => matches(search, ...stocktakeFields(s)))} onRowClick={s => nav(`/ql/kiem-ke/phieu/${s.id}`)} caption="Phiếu kiểm kê chờ duyệt"
      empty={search ? NOT_FOUND : <EmptyState icon="list-checks" title="Không có phiếu kiểm kê chờ duyệt" />}
    />
  );
}

function PendingReports({ search }: { search: string }) {
  const reports = useReports('pending');
  const nav = useNavigate();

  const columns: DataTableColumn<ReportRow>[] = [
    { key: 'code', header: 'Biên bản', width: 120, render: r => <Code>{r.code}</Code> },
    {
      key: 'createdAt', header: 'Lập', width: 130,
      render: r => <span style={{ display: 'inline-flex', flexDirection: 'column' }}><span style={{ whiteSpace: 'nowrap' }}>{fmtShort(r.createdAt)}</span><span className="vb-muted" style={{ fontSize: 12 }}>{r.creatorName}</span></span>,
    },
    { key: 'lot', header: 'Lô · mặt hàng', render: r => <span><Code>{r.lotCode}</Code> <span className="vb-muted">{r.sku}</span> {r.productName}</span> },
    { key: 'description', header: 'Mô tả lỗi', render: r => <span style={{ whiteSpace: 'normal' }}>{r.description}</span> },
    {
      // Scope under the quantity, so the table fits a 1366 px screen.
      key: 'quantity', header: 'SL lỗi', numeric: true, width: 100,
      render: r => (
        <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <span style={{ whiteSpace: 'nowrap' }}>{fmt(r.quantity)} {r.unit}</span>
          <span className="vb-muted" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{SCOPE_LABEL[r.scope]}</span>
        </span>
      ),
    },
    {
      key: 'receipt', header: 'Phát hiện khi', width: 200,
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
      columns={columns} rows={reports.data.filter(r => matches(search, ...reportFields(r)))} onRowClick={r => nav(reportHref('manager', r.id))} caption="Biên bản bất thường chờ duyệt"
      empty={search ? NOT_FOUND : <EmptyState icon="shield-alert" title="Không có biên bản chờ duyệt" />}
    />
  );
}
