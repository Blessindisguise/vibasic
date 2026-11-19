import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, DataTable, EmptyState, SearchField, SelectField, TextField, type DataTableColumn } from '../../design';
import { fmt, fmtDateTime } from '../../app/format';
import { Segmented } from '../../app/Segmented';
import { Code, ListError, Loading } from '../../app/ui';
import { matches } from '../../app/text';
import { suggestFrom } from '../../app/suggest';
import { useSuppliers } from '../../app/catalog';
import { ReceiptStatusBadge, RECEIPT_STATUS_OPTIONS } from '../../app/statusBadges';
import { receiptSearchFields, useReceipts, type ReceiptRow, type ReceiptStatus } from '../../app/receiving';

/** UC_06 Quản lý phiếu nhập kho: filter by date, supplier and status, open a receipt. Staff can also create one (UC_04). */
export function ReceiptListPage({ role, basePath }: { role: 'manager' | 'staff'; basePath: string }) {
  const nav = useNavigate();
  const touch = role === 'staff';
  const size = touch ? 'lg' : 'md';
  const [status, setStatus] = useState<ReceiptStatus | ''>('');
  const [supplierId, setSupplierId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [search, setSearch] = useState('');
  const suppliers = useSuppliers();
  const all = useReceipts({ supplierId, from, to });
  const filtered = useMemo(() => (all.data ?? []).filter(r => !status || r.status === status), [all.data, status]);
  const rows = useMemo(() => filtered.filter(r => matches(search, ...receiptSearchFields(r))), [filtered, search]);
  const count = (s: ReceiptStatus) => (all.data ?? []).filter(r => r.status === s).length;
  const hasFilter = !!(supplierId || from || to || search || status);
  const suggestions = suggestFrom(all.data, search, receiptSearchFields, r => ({
    key: String(r.id), label: r.code,
    hint: [r.supplierName, r.deliveryNoteNo && `CT ${r.deliveryNoteNo}`, fmtDateTime(r.receiptDate)].filter(Boolean).join(' · '),
    meta: <ReceiptStatusBadge status={r.status} />,
  }));

  const columns: DataTableColumn<ReceiptRow>[] = [
    { key: 'code', header: 'Mã phiếu', width: 130, render: r => <Code>{r.code}</Code> },
    { key: 'receiptDate', header: 'Ngày nhập', width: 150, render: r => <span style={{ whiteSpace: 'nowrap' }}>{fmtDateTime(r.receiptDate)}</span> },
    { key: 'supplierName', header: 'Nhà cung cấp' },
    {
      key: 'quantity', header: 'Hàng nhập', numeric: true, width: 150,
      render: r => <span>{fmt(r.totalQuantity)} <span className="vb-muted">· {r.productCount} mặt hàng</span></span>,
    },
    { key: 'creatorName', header: 'Người lập', width: 150 },
    { key: 'approverName', header: 'Người duyệt', width: 150, render: r => r.approverName ?? <span className="vb-muted">—</span> },
    {
      key: 'status', header: 'Trạng thái', width: 170,
      render: r => (
        <span className="vb-row" style={{ gap: 6, flexWrap: 'nowrap' }}>
          <ReceiptStatusBadge status={r.status} />
          {r.pendingReports > 0 && <span className="vb-muted">+{r.pendingReports} biên bản</span>}
        </span>
      ),
    },
  ];

  return (
    <div className="vb-stack">
      <div className="vb-row" style={{ justifyContent: 'space-between', gap: 12 }}>
        <Segmented
          label="Lọc theo trạng thái" size={size} value={status} onChange={setStatus}
          options={[{ value: '', label: 'Tất cả', count: all.data?.length }, ...RECEIPT_STATUS_OPTIONS.map(o => ({ ...o, count: count(o.value) }))]}
        />
        {role === 'staff' && <Button size="xl" icon="plus" onClick={() => nav(`${basePath}/moi`)}>Lập phiếu nhập</Button>}
      </div>

      <div className="vb-row" style={{ alignItems: 'flex-end', gap: 12 }}>
        <SearchField
          size={size} label="Tìm phiếu" placeholder="Mã phiếu, số chứng từ, NCC, người lập / duyệt…" value={search} onChange={setSearch} style={{ width: 260 }}
          suggestions={suggestions} onPickSuggestion={s => s.value && nav(`${basePath}/${(s.value as ReceiptRow).id}`)}
        />
        <SelectField
          size={size} label="Nhà cung cấp" placeholder="Tất cả" value={supplierId} onChange={e => setSupplierId(e.target.value)} style={{ width: 240 }}
          options={(suppliers.data ?? []).map(s => ({ value: String(s.id), label: s.name }))}
        />
        <TextField size={size} label="Từ ngày" type="date" value={from} max={to || undefined} onChange={e => setFrom(e.target.value)} style={{ width: 170 }} />
        <TextField size={size} label="Đến ngày" type="date" value={to} min={from || undefined} onChange={e => setTo(e.target.value)} style={{ width: 170 }} />
        {hasFilter && (
          <Button variant="ghost" size={size} onClick={() => { setStatus(''); setSupplierId(''); setFrom(''); setTo(''); setSearch(''); }}>Xoá bộ lọc</Button>
        )}
        <span className="vb-muted" style={{ marginLeft: 'auto', alignSelf: 'center', fontVariantNumeric: 'tabular-nums' }}>{all.data ? `${rows.length} phiếu` : ''}</span>
      </div>

      {all.isPending ? <Loading /> : all.isError ? <ListError onRetry={() => all.refetch()} /> : (
        <DataTable
          columns={columns} rows={rows} density={touch ? 'default' : 'compact'} onRowClick={r => nav(`${basePath}/${r.id}`)}
          maxHeight={touch ? 'calc(100dvh - 300px)' : 'calc(100dvh - 280px)'} caption="Danh sách phiếu nhập kho"
          empty={hasFilter
            ? <EmptyState icon="search" title="Không tìm thấy phiếu phù hợp" description="Thử đổi khoảng ngày, nhà cung cấp hoặc trạng thái." />
            : <EmptyState icon="package-plus" title="Chưa có phiếu nhập" />}
        />
      )}
    </div>
  );
}
