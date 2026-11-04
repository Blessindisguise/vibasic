import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, DataTable, EmptyState, TextField, type DataTableColumn } from '../../design';
import { fmt, fmtDateTime } from '../../app/format';
import { Segmented } from '../../app/Segmented';
import { Code, ListError, Loading } from '../../app/ui';
import { matches } from '../../app/text';
import { IssueStatusBadge, ISSUE_STATUS_OPTIONS } from '../../app/statusBadges';
import { useIssues, type IssueRow, type IssueStatus } from '../../app/issuing';

/** UC_09 Quản lý phiếu xuất kho: filter by date, order and status; open an issue. */
export function IssueListPage({ role, basePath }: { role: 'manager' | 'staff'; basePath: string }) {
  const nav = useNavigate();
  const touch = role === 'staff';
  const size = touch ? 'lg' : 'md';
  const [status, setStatus] = useState<IssueStatus | ''>('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [search, setSearch] = useState('');
  const all = useIssues({ from, to });
  const rows = useMemo(
    () => (all.data ?? []).filter(i => (!status || i.status === status) && matches(search, i.code, i.orderCode, i.customerName, i.creatorName)),
    [all.data, status, search],
  );
  const count = (s: IssueStatus) => (all.data ?? []).filter(i => i.status === s).length;
  const hasFilter = !!(status || from || to || search);

  const columns: DataTableColumn<IssueRow>[] = [
    { key: 'code', header: 'Mã phiếu', width: 130, render: i => <Code>{i.code}</Code> },
    { key: 'issueDate', header: 'Ngày lập', width: 150, render: i => <span style={{ whiteSpace: 'nowrap' }}>{fmtDateTime(i.issueDate)}</span> },
    { key: 'order', header: 'Đơn hàng', render: i => <span><Code>{i.orderCode}</Code> <span className="vb-muted">{i.customerName}</span></span> },
    {
      key: 'quantity', header: 'Số lượng', numeric: true, width: 150,
      render: i => <span>{fmt(i.totalQuantity)} <span className="vb-muted">· {i.productCount} mặt hàng</span></span>,
    },
    { key: 'creatorName', header: 'Người lập', width: 140 },
    { key: 'approverName', header: 'Người duyệt', width: 140, render: i => i.approverName ?? <span className="vb-muted">—</span> },
    {
      key: 'status', header: 'Trạng thái', width: 150,
      render: i => (
        <span className="vb-row" style={{ gap: 6, flexWrap: 'nowrap' }}>
          <IssueStatusBadge status={i.status} />
          {i.status === 'approved' && <span className="vb-muted" style={{ fontVariantNumeric: 'tabular-nums' }}>{i.picked}/{i.totalQuantity}</span>}
        </span>
      ),
    },
  ];

  return (
    <div className="vb-stack">
      <Segmented
        label="Lọc theo trạng thái" size={size} value={status} onChange={setStatus}
        options={[{ value: '', label: 'Tất cả', count: all.data?.length }, ...ISSUE_STATUS_OPTIONS.map(o => ({ ...o, count: count(o.value) }))]}
      />
      <div className="vb-row" style={{ alignItems: 'flex-end', gap: 12 }}>
        <TextField size={size} label="Tìm phiếu" icon="search" placeholder="Mã phiếu, đơn hàng, khách…" value={search} onChange={e => setSearch(e.target.value)} style={{ width: 260 }} />
        <TextField size={size} label="Từ ngày" type="date" value={from} max={to || undefined} onChange={e => setFrom(e.target.value)} style={{ width: 170 }} />
        <TextField size={size} label="Đến ngày" type="date" value={to} min={from || undefined} onChange={e => setTo(e.target.value)} style={{ width: 170 }} />
        {hasFilter && <Button variant="ghost" size={size} onClick={() => { setStatus(''); setFrom(''); setTo(''); setSearch(''); }}>Xoá bộ lọc</Button>}
        <span className="vb-muted" style={{ marginLeft: 'auto', alignSelf: 'center', fontVariantNumeric: 'tabular-nums' }}>{all.data ? `${rows.length} phiếu` : ''}</span>
      </div>
      {all.isPending ? <Loading /> : all.isError ? <ListError onRetry={() => all.refetch()} /> : (
        <DataTable
          columns={columns} rows={rows} density={touch ? 'default' : 'compact'} onRowClick={i => nav(`${basePath}/${i.id}`)}
          maxHeight="calc(100dvh - 280px)" caption="Danh sách phiếu xuất kho"
          empty={<EmptyState icon={hasFilter ? 'search' : 'package-minus'} title={hasFilter ? 'Không tìm thấy phiếu phù hợp' : 'Chưa có phiếu xuất'}
            description={hasFilter ? 'Thử đổi khoảng ngày hoặc trạng thái.' : 'Phiếu xuất được lập từ đơn hàng chờ xuất.'} />}
        />
      )}
    </div>
  );
}
