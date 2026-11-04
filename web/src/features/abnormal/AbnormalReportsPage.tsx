import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataTable, EmptyState, TextField, type DataTableColumn } from '../../design';
import { fmt, fmtShort } from '../../app/format';
import { Segmented } from '../../app/Segmented';
import { Code, ListError, Loading } from '../../app/ui';
import { matches } from '../../app/text';
import { ApprovalBadge, SOURCE_LABEL } from '../../app/statusBadges';
import { useReports, type AbnormalSource, type ApprovalStatus, type ReportRow } from '../../app/receiving';
import { ReportDecision } from './ReportDecision';

/** UC_11 / UC_12: every abnormal report, by status and where it was found. Managers decide here; staff follow up. */
export function AbnormalReportsPage({ role }: { role: 'manager' | 'staff' }) {
  const touch = role === 'staff';
  const nav = useNavigate();
  const [status, setStatus] = useState<ApprovalStatus | ''>(role === 'manager' ? 'pending' : '');
  const [source, setSource] = useState<AbnormalSource | ''>('');
  const [search, setSearch] = useState('');
  const all = useReports(undefined, source || undefined);
  const rows = useMemo(() => (all.data ?? []).filter(r => (!status || r.status === status) && matches(search, r.code, r.lotCode, r.sku, r.productName, r.description)),
    [all.data, status, search]);
  const count = (s: ApprovalStatus) => (all.data ?? []).filter(r => r.status === s).length;
  const lotBase = role === 'manager' ? '/ql/lo-hang' : '/kho/tra-cuu';

  const columns: DataTableColumn<ReportRow>[] = [
    { key: 'code', header: 'Biên bản', width: 130, render: r => <Code>{r.code}</Code> },
    { key: 'createdAt', header: 'Lập lúc', width: 110, render: r => <span style={{ whiteSpace: 'nowrap' }}>{fmtShort(r.createdAt)}</span> },
    { key: 'source', header: 'Phát hiện khi', width: 110, render: r => SOURCE_LABEL[r.sourceType] },
    { key: 'lot', header: 'Lô · mặt hàng', render: r => <span><Code>{r.lotCode}</Code> <span className="vb-muted">{r.sku}</span> {r.productName}</span> },
    { key: 'description', header: 'Mô tả lỗi', render: r => <span style={{ whiteSpace: 'normal' }}>{r.description}</span> },
    { key: 'quantity', header: 'SL lỗi', numeric: true, width: 80, render: r => `${fmt(r.quantity)} ${r.unit}` },
    { key: 'creatorName', header: 'Người lập', width: 130 },
    {
      key: 'status', header: 'Trạng thái', width: 120,
      render: r => <span title={r.rejectReason ? `Lý do: ${r.rejectReason}` : undefined}><ApprovalBadge status={r.status} /></span>,
    },
    ...(role === 'manager' ? [{ key: 'actions', header: '', width: 220, align: 'right' as const, render: (r: ReportRow) => <ReportDecision report={r} /> }] : []),
  ];

  return (
    <div className="vb-stack">
      <div className="vb-row" style={{ gap: 12, justifyContent: 'space-between' }}>
        <Segmented
          label="Trạng thái" size={touch ? 'lg' : 'md'} value={status} onChange={setStatus}
          options={[
            { value: '', label: 'Tất cả', count: all.data?.length },
            { value: 'pending', label: 'Chờ duyệt', count: count('pending') },
            { value: 'approved', label: 'Đã duyệt', count: count('approved') },
            { value: 'rejected', label: 'Từ chối', count: count('rejected') },
          ]}
        />
        <Segmented
          label="Nguồn phát hiện" size={touch ? 'lg' : 'md'} value={source} onChange={setSource}
          options={[{ value: '', label: 'Mọi nguồn' }, ...(['receipt', 'issue', 'stocktake'] as const).map(s => ({ value: s, label: SOURCE_LABEL[s] }))]}
        />
      </div>
      <div className="vb-row">
        <TextField size={touch ? 'lg' : 'md'} icon="search" placeholder="Mã biên bản, lô, mặt hàng, mô tả…" value={search} onChange={e => setSearch(e.target.value)} style={{ width: 320 }} aria-label="Tìm biên bản" />
        {touch && <span className="vb-muted" style={{ marginLeft: 8 }}>Biên bản được lập khi nhập kho, lấy hàng xuất kho hoặc kiểm kê.</span>}
      </div>
      {all.isPending ? <Loading /> : all.isError ? <ListError onRetry={() => all.refetch()} /> : (
        <DataTable
          columns={columns} rows={rows} density={touch ? 'default' : 'compact'} onRowClick={r => nav(`${lotBase}/${r.receiptDetailId}`)}
          maxHeight="calc(100dvh - 240px)" caption="Biên bản bất thường"
          empty={<EmptyState icon="shield-alert" title="Không có biên bản phù hợp" description="Đổi bộ lọc trạng thái hoặc nguồn phát hiện." />}
        />
      )}
    </div>
  );
}
