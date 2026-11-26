import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Checkbox, DataTable, EmptyState, ScanInput, SelectField, type DataTableColumn } from '../../design';
import { ApiError } from '../../app/api';
import { ANY_DATE, fmt, fmtDate, inVnDateRange, type DateRange } from '../../app/format';
import { Segmented } from '../../app/Segmented';
import { Code, DateRangeFilter, ListError, Loading } from '../../app/ui';
import { matches } from '../../app/text';
import { useProducts } from '../../app/catalog';
import { LotStatusBadge } from '../../app/statusBadges';
import { findLot, useLotSuggest, useLots, type LotRow, type LotSuggestion } from '../../app/stock';
import { lotSuggestions } from '../../app/suggest';
import type { LotStatus } from '../../app/receiving';

/** UC_16 Tra cứu tồn kho theo lô: filter by product or lot status, or scan a lot / item barcode to open its lot. */
export function LotLookupPage({ role, basePath }: { role: 'manager' | 'staff'; basePath: string }) {
  const touch = role === 'staff';
  const size = touch ? 'lg' : 'md';
  const nav = useNavigate();
  const products = useProducts();
  const [productId, setProductId] = useState('');
  const [status, setStatus] = useState<LotStatus | ''>('');
  const [includeEmpty, setIncludeEmpty] = useState(false);
  const [code, setCode] = useState('');
  const [range, setRange] = useState<DateRange>(ANY_DATE);
  const [scan, setScan] = useState<{ state: 'error' | 'idle'; message?: string; key: number }>({ state: 'idle', key: 0 });
  const lots = useLots({ productId, includeEmpty });
  const suggest = useLotSuggest(code);
  const openSuggestion = (s?: LotSuggestion) => s && nav(`${basePath}/${s.lotId}${s.kind === 'item' ? `?sp=${encodeURIComponent(s.code)}` : ''}`);
  // Typing in the scan box also filters the table (an item code SP-… only opens its lot).
  const typed = /^SP-/i.test(code.trim()) ? '' : code;
  const rows = useMemo(() => (lots.data ?? []).filter(l => (!status || l.status === status) && matches(typed, l.lotCode, l.sku, l.productName, l.receiptCode)
    && inVnDateRange(l.receivedDate, range.from, range.to)), [lots.data, status, typed, range]);
  const count = (s: LotStatus) => (lots.data ?? []).filter(l => l.status === s).length;
  const total = rows.filter(l => l.status === 'normal').reduce((s, l) => s + l.quantityOnHand, 0);

  const submitScan = async (value: string) => {
    if (!value.trim()) return;
    try {
      const found = await findLot(value.trim());
      nav(`${basePath}/${found.lotId}${found.serial ? `?sp=${encodeURIComponent(found.serial)}` : ''}`);
    } catch (e) {
      setScan({ state: 'error', message: e instanceof ApiError ? e.message : 'Không tra cứu được.', key: Date.now() });
      setCode('');
    }
  };

  const columns: DataTableColumn<LotRow>[] = [
    { key: 'lotCode', header: 'Mã lô', width: 130, render: l => <Code>{l.lotCode}</Code> },
    { key: 'product', header: 'Mặt hàng', render: l => <span><Code>{l.sku}</Code> {l.productName}</span> },
    { key: 'receivedDate', header: 'Ngày nhập', width: 110, render: l => fmtDate(l.receivedDate) },
    { key: 'receiptCode', header: 'Phiếu nhập', width: 130, render: l => <span className="vb-muted">{l.receiptCode}</span> },
    { key: 'quantity', header: 'SL nhập', numeric: true, width: 90, render: l => fmt(l.quantity) },
    {
      key: 'onHand', header: 'Tồn', numeric: true, width: 120,
      render: l => <span><b>{fmt(l.quantityOnHand)}</b> {l.unit}{l.reserved > 0 && <span className="vb-muted"> · giữ chỗ {fmt(l.reserved)}</span>}</span>,
    },
    { key: 'status', header: 'Trạng thái lô', width: 140, render: l => <LotStatusBadge status={l.status} /> },
  ];

  return (
    <div className="vb-stack">
      <div style={{ display: 'grid', gridTemplateColumns: touch ? 'minmax(0, 1fr)' : 'minmax(0, 420px) minmax(0, 1fr)', gap: 16, alignItems: 'end' }}>
        <ScanInput
          size={touch ? 'lg' : 'md'} label="Quét hoặc tìm lô" placeholder="Mã lô, mã SP-…, SKU, tên hàng, phiếu nhập" value={code}
          onChange={v => { setCode(v); if (scan.state === 'error') setScan({ state: 'idle', key: scan.key }); }}
          // A failed lookup rebuilds the field (scanKey): put the cursor back so the next scan goes in.
          onSubmit={submitScan} state={scan.state} message={scan.message} scanKey={scan.key} autoFocus={scan.key !== 0}
          suggestions={lotSuggestions(suggest.data, code)} onPickSuggestion={s => openSuggestion(s.value as LotSuggestion | undefined)}
        />
        <div className="vb-row" style={{ gap: 12, alignItems: 'flex-end' }}>
          <SelectField
            size={size} label="Mặt hàng" placeholder="Tất cả mặt hàng" value={productId} onChange={e => setProductId(e.target.value)} style={{ width: 300 }}
            options={(products.data ?? []).map(p => ({ value: String(p.id), label: `${p.sku} · ${p.name}` }))}
          />
          <Checkbox size={touch ? 'lg' : 'md'} label="Gồm lô đã hết hàng" checked={includeEmpty} onChange={e => setIncludeEmpty(e.target.checked)} />
        </div>
      </div>
      <DateRangeFilter size={size} label="Ngày nhập lô" value={range} onChange={setRange} />

      <div className="vb-row" style={{ justifyContent: 'space-between' }}>
        <Segmented
          label="Trạng thái lô" size={size} value={status} onChange={setStatus}
          options={[
            { value: '', label: 'Tất cả', count: lots.data?.length },
            { value: 'normal', label: 'Bình thường', count: count('normal') },
            { value: 'quarantined', label: 'Tạm cách ly', count: count('quarantined') },
            { value: 'locked', label: 'Đã khóa', count: count('locked') },
          ]}
        />
        {productId && lots.data && (
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>Tồn khả dụng: <b>{fmt(total)}</b> {rows[0]?.unit}</span>
        )}
      </div>

      {lots.isPending ? <Loading /> : lots.isError ? <ListError onRetry={() => lots.refetch()} /> : (
        <DataTable
          columns={columns} rows={rows} density={touch ? 'default' : 'compact'} onRowClick={l => nav(`${basePath}/${l.id}`)}
          maxHeight="calc(100dvh - 300px)" caption="Danh sách lô"
          empty={<EmptyState icon="layers" title="Không có lô phù hợp" description={range.from || range.to ? 'Đổi khoảng ngày nhập, hoặc chọn “Gồm lô đã hết hàng”.' : typed ? 'Thử từ khóa khác, hoặc chọn “Gồm lô đã hết hàng”.' : 'Đổi mặt hàng, trạng thái lô, hoặc chọn “Gồm lô đã hết hàng”.'} />}
        />
      )}
    </div>
  );
}
