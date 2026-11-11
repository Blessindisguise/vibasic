import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button, DataTable, EmptyState, SelectField, StatusBadge, TextField, type DataTableColumn } from '../../design';
import { fmt, fmtDate, fmtDateTime, vnToday } from '../../app/format';
import { Segmented } from '../../app/Segmented';
import { Code, ListError, Loading } from '../../app/ui';
import { downloadCsv } from '../../app/csv';
import { useCategories, useProducts } from '../../app/catalog';
import { useInventoryReport, useMovementReport, type InventoryRow, type MovementRow } from '../../app/reports';

type Kind = 'ton-kho' | 'nhap-xuat';
const printUrl = (kind: Kind, q: Record<string, string>) =>
  `/in/bao-cao/${kind}?${new URLSearchParams(Object.entries(q).filter(([, v]) => v))}`;
const firstOfMonth = () => `${vnToday().slice(0, 8)}01`;

/**
 * UC_19 Xuất báo cáo: choose the report and its conditions (period, product, category); the system totals the receipts,
 * issues, stocktakes and stock, shows the report, and exports it (CSV for Excel) or prints it.
 */
export function ReportsPage() {
  const [params, setParams] = useSearchParams();
  const kind = (params.get('loai') as Kind) || 'ton-kho';
  const categories = useCategories();
  const products = useProducts();
  const [categoryId, setCategoryId] = useState('');
  const [productId, setProductId] = useState('');
  const [from, setFrom] = useState(firstOfMonth());
  const [to, setTo] = useState(vnToday());
  const productOptions = (products.data ?? []).filter(p => !categoryId || p.categoryId === Number(categoryId)).map(p => ({ value: String(p.id), label: `${p.sku} · ${p.name}` }));
  const conditions = [
    categoryId && `Nhóm hàng: ${categories.data?.find(c => c.id === Number(categoryId))?.name}`,
    productId && `Mặt hàng: ${products.data?.find(p => p.id === Number(productId))?.sku}`,
  ].filter(Boolean) as string[];

  return (
    <div className="vb-stack">
      <div className="vb-row vb-no-print" style={{ justifyContent: 'space-between' }}>
        <Segmented<Kind>
          label="Loại báo cáo" value={kind} onChange={k => setParams({ loai: k }, { replace: true })}
          options={[{ value: 'ton-kho', label: 'Báo cáo tồn kho' }, { value: 'nhap-xuat', label: 'Báo cáo biến động nhập xuất' }]}
        />
      </div>
      <div className="vb-row vb-no-print" style={{ alignItems: 'flex-end', gap: 12 }}>
        {kind === 'nhap-xuat' && <>
          <TextField label="Từ ngày" type="date" value={from} max={to} onChange={e => setFrom(e.target.value)} style={{ width: 170 }} />
          <TextField label="Đến ngày" type="date" value={to} min={from} max={vnToday()} onChange={e => setTo(e.target.value)} style={{ width: 170 }} />
        </>}
        <SelectField label="Nhóm hàng" placeholder="Tất cả nhóm hàng" value={categoryId} style={{ width: 220 }}
          onChange={e => { setCategoryId(e.target.value); setProductId(''); }}
          options={(categories.data ?? []).map(c => ({ value: String(c.id), label: c.name }))} />
        <SelectField label="Mặt hàng" placeholder="Tất cả mặt hàng" value={productId} style={{ width: 280 }}
          onChange={e => setProductId(e.target.value)} options={productOptions} />
      </div>
      {kind === 'ton-kho'
        ? <InventoryReport categoryId={categoryId} productId={productId} conditions={conditions} />
        : <MovementReport from={from} to={to} categoryId={categoryId} productId={productId} conditions={conditions} />}
    </div>
  );
}

/** Print opens the report as an A4 document in a new tab (same conditions), ready to sign. */
function ReportHead({ title, sub, onExport, printUrl, disabled }: { title: string; sub: string; onExport: () => void; printUrl: string; disabled: boolean }) {
  return (
    <div className="vb-panel__head" style={{ flexWrap: 'wrap', gap: 12 }}>
      <div style={{ flex: 1, minWidth: 260 }}>
        <h2 className="vb-panel__title">{title}</h2>
        <div className="vb-muted">{sub}</div>
      </div>
      <div className="vb-row vb-no-print">
        <Button variant="secondary" icon="printer" disabled={disabled} onClick={() => window.open(printUrl, '_blank')}>In báo cáo</Button>
        <Button icon="download" disabled={disabled} onClick={onExport}>Xuất Excel (CSV)</Button>
      </div>
    </div>
  );
}

function InventoryReport({ categoryId, productId, conditions }: { categoryId: string; productId: string; conditions: string[] }) {
  const report = useInventoryReport({ categoryId, productId });
  if (report.isPending) return <Loading />;
  if (report.isError) return <ListError onRetry={() => report.refetch()} />;
  const rows = report.data;
  const sum = (k: keyof InventoryRow) => rows.reduce((s, r) => s + (r[k] as number), 0);
  const at = fmtDateTime(new Date().toISOString());
  const sub = `Tại thời điểm ${at}${conditions.length ? ' · ' + conditions.join(' · ') : ''}`;

  const exportCsv = () => downloadCsv(`bao-cao-ton-kho-${vnToday()}.csv`,
    ['Mã SKU', 'Tên hàng', 'Nhóm hàng', 'Nhà cung cấp', 'ĐVT', 'Số lô', 'Tồn thực tế', 'Khả dụng', 'Đã giữ chỗ', 'Tạm cách ly', 'Đã khóa', 'Hàng lỗi (đã tách)', 'Đơn chưa xuất', 'Tồn ròng', 'ROP', 'Dưới ROP'],
    rows.map(r => [r.sku, r.productName, r.categoryName, r.supplierName, r.unit, r.lots, r.onHand, r.available, r.reserved, r.quarantined, r.locked, r.defective, r.ordered, r.net, r.rop ?? null, r.belowRop ? 'Có' : '']),
    ['BÁO CÁO TỒN KHO', sub]);

  const columns: DataTableColumn<InventoryRow>[] = [
    { key: 'sku', header: 'Mã SKU', width: 90, render: r => <Code>{r.sku}</Code> },
    { key: 'productName', header: 'Tên hàng' },
    { key: 'categoryName', header: 'Nhóm hàng', width: 120 },
    { key: 'unit', header: 'ĐVT', width: 50 },
    { key: 'lots', header: 'Số lô', numeric: true, width: 52, render: r => fmt(r.lots) },
    { key: 'onHand', header: 'Tồn thực tế', numeric: true, width: 100, render: r => fmt(r.onHand) },
    { key: 'available', header: 'Khả dụng', numeric: true, width: 90, render: r => <b>{fmt(r.available)}</b> },
    { key: 'reserved', header: 'Giữ chỗ', numeric: true, width: 80, render: r => fmt(r.reserved) },
    { key: 'quarantined', header: 'Cách ly', numeric: true, width: 80, render: r => fmt(r.quarantined) },
    { key: 'locked', header: 'Đã khóa', numeric: true, width: 80, render: r => fmt(r.locked) },
    { key: 'defective', header: 'Hàng lỗi', numeric: true, width: 72, render: r => (r.defective ? fmt(r.defective) : <span className="vb-muted">—</span>) },
    { key: 'net', header: 'Tồn ròng', numeric: true, width: 84, render: r => fmt(r.net) },
    { key: 'rop', header: 'ROP', numeric: true, width: 70, render: r => r.rop == null ? '—' : fmt(r.rop, 1) },
    { key: 'state', header: '', width: 104, render: r => r.belowRop ? <StatusBadge status="rejected" label="Dưới ROP" icon="triangle-alert" /> : null },
  ];
  const total: InventoryRow = {
    productId: -1, sku: 'Tổng cộng', productName: `${rows.length} mặt hàng`, unit: '', categoryName: '', supplierName: '',
    lots: sum('lots'), onHand: sum('onHand'), available: sum('available'), reserved: sum('reserved'), quarantined: sum('quarantined'), locked: sum('locked'), defective: sum('defective'),
    rop: undefined, belowRop: false, ordered: sum('ordered'), net: sum('net'),
  };

  return (
    <section className="vb-panel vb-report">
      <ReportHead title="Báo cáo tồn kho" sub={sub} onExport={exportCsv} printUrl={printUrl('ton-kho', { nhom: categoryId, hang: productId })} disabled={rows.length === 0} />
      <DataTable
        columns={columns} rows={rows.length ? [...rows, total].map(r => ({ ...r, id: r.productId })) : []} caption="Báo cáo tồn kho"
        empty={<EmptyState icon="file-text" title="Không có dữ liệu" description="Không có mặt hàng phù hợp với điều kiện đã chọn." />}
      />
    </section>
  );
}

function MovementReport({ from, to, categoryId, productId, conditions }: { from: string; to: string; categoryId: string; productId: string; conditions: string[] }) {
  const report = useMovementReport({ from, to, categoryId, productId });
  const [onlyActive, setOnlyActive] = useState(true);
  if (report.isPending) return <Loading />;
  if (report.isError) return <ListError onRetry={() => report.refetch()} />;
  const all = report.data.rows;
  const rows = onlyActive ? all.filter(r => r.in || r.out || r.adjusted || r.opening || r.closing) : all;
  const moved = all.some(r => r.in || r.out || r.adjusted);
  const sum = (k: keyof MovementRow) => rows.reduce((s, r) => s + (r[k] as number), 0);
  const sub = `Kỳ ${fmtDate(report.data.from)} – ${fmtDate(report.data.to)}${conditions.length ? ' · ' + conditions.join(' · ') : ''}`;

  const exportCsv = () => downloadCsv(`bao-cao-nhap-xuat-ton-${report.data.from}-${report.data.to}.csv`,
    ['Mã SKU', 'Tên hàng', 'Nhóm hàng', 'ĐVT', 'Tồn đầu kỳ', 'Nhập trong kỳ', 'Xuất trong kỳ', 'Điều chỉnh kiểm kê', 'Tồn cuối kỳ', 'Số phiếu nhập', 'Số phiếu xuất'],
    rows.map(r => [r.sku, r.productName, r.categoryName, r.unit, r.opening, r.in, r.out, r.adjusted, r.closing, r.receipts, r.issues]),
    ['BÁO CÁO BIẾN ĐỘNG NHẬP XUẤT', sub]);

  const signed = (n: number) => n === 0 ? <span className="vb-muted">0</span> : <span>{n > 0 ? '+' : '−'}{fmt(Math.abs(n))}</span>;
  const columns: DataTableColumn<MovementRow>[] = [
    { key: 'sku', header: 'Mã SKU', width: 90, render: r => <Code>{r.sku}</Code> },
    { key: 'productName', header: 'Tên hàng' },
    { key: 'unit', header: 'ĐVT', width: 50 },
    { key: 'opening', header: 'Tồn đầu kỳ', numeric: true, width: 100, render: r => fmt(r.opening) },
    { key: 'in', header: 'Nhập', numeric: true, width: 90, render: r => fmt(r.in) },
    { key: 'out', header: 'Xuất', numeric: true, width: 90, render: r => fmt(r.out) },
    { key: 'adjusted', header: 'Điều chỉnh', numeric: true, width: 100, render: r => signed(r.adjusted) },
    { key: 'closing', header: 'Tồn cuối kỳ', numeric: true, width: 110, render: r => <b>{fmt(r.closing)}</b> },
    { key: 'docs', header: 'Chứng từ', width: 150, render: r => r.productId < 0 ? null : <span className="vb-muted">{r.receipts} PN · {r.issues} PX</span> },
  ];
  const total: MovementRow = {
    productId: -1, sku: 'Tổng cộng', productName: `${rows.length} mặt hàng`, unit: '', categoryName: '',
    opening: sum('opening'), in: sum('in'), out: sum('out'), adjusted: sum('adjusted'), closing: sum('closing'), receipts: 0, issues: 0,
  };

  return (
    <section className="vb-panel vb-report">
      <ReportHead title="Báo cáo biến động nhập xuất" sub={sub} onExport={exportCsv}
        printUrl={printUrl('nhap-xuat', { tu: report.data.from, den: report.data.to, nhom: categoryId, hang: productId, tatca: onlyActive ? '' : '1' })} disabled={!moved} />
      {!moved ? (
        <EmptyState icon="file-text" title="Không có dữ liệu trong kỳ báo cáo" />
      ) : (
        <>
          <div className="vb-row vb-no-print" style={{ padding: '8px 16px' }}>
            <label className="vb-row" style={{ gap: 6, cursor: 'pointer' }}>
              <input type="checkbox" checked={onlyActive} onChange={e => setOnlyActive(e.target.checked)} />
              <span>Ẩn mặt hàng không có tồn và không phát sinh</span>
            </label>
          </div>
          <DataTable columns={columns} rows={[...rows, total].map(r => ({ ...r, id: r.productId }))} caption="Báo cáo biến động nhập xuất" />
        </>
      )}
    </section>
  );
}
