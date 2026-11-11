import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertBanner, Button, Checkbox, DataTable, EmptyState, type DataTableColumn } from '../../../design';
import { fmt, fmtDate, fmtDateTime } from '../../../app/format';
import { useProducts } from '../../../app/catalog';
import { useLots, type LotRow } from '../../../app/stock';
import { LotStatusBadge } from '../../../app/statusBadges';
import { Code, Fact, Facts, ListError, Loading, NO_MATCH, PanelSearch } from '../../../app/ui';
import { matches } from '../../../app/text';
import { ProductDialog } from './ProductsPage';

/** UC_02, xem chi tiết hàng hóa: catalog data, stock by lot status, inventory policy (ROP/EOQ) and every lot received. */
export function ProductDetail({ id, back }: { id: number; back: string }) {
  const products = useProducts();
  const lots = useLots({ productId: String(id), includeEmpty: true });
  const nav = useNavigate();
  const [editing, setEditing] = useState(false);
  const [showEmpty, setShowEmpty] = useState(false);
  const [search, setSearch] = useState('');
  const product = products.data?.find(p => p.id === id);
  const all = useMemo(() => lots.data ?? [], [lots.data]);
  const rows = useMemo(() => [...all].reverse()
    .filter(l => (showEmpty || l.quantityOnHand > 0) && matches(search, l.lotCode, l.receiptCode)), [all, showEmpty, search]);

  if (products.isPending) return <Loading />;
  if (products.isError) return <ListError onRetry={() => products.refetch()} />;
  if (!product) {
    return <div className="vb-panel"><EmptyState icon="search" title="Không tìm thấy hàng hóa" action={<Button variant="secondary" onClick={() => nav(back)}>Về danh sách</Button>} /></div>;
  }
  const p = product;
  const sum = (f: (l: LotRow) => number, where: (l: LotRow) => boolean = () => true) => all.filter(where).reduce((s, l) => s + f(l), 0);
  const held = sum(l => l.quantityOnHand, l => l.status !== 'normal');
  const reserved = sum(l => l.reserved, l => l.status === 'normal');
  const defective = sum(l => l.defective);
  const policy = p.policy;
  const low = policy?.currentRop != null && p.net <= policy.currentRop;
  const notCalculated = (why: string) => <span className="vb-muted">{why}</span>;
  const pending = policy?.demandState === 'insufficientData' ? 'Chưa đủ dữ liệu' : policy?.demandState === 'slowMoving' ? 'Chậm luân chuyển' : 'Chưa tính';

  const columns: DataTableColumn<LotRow>[] = [
    { key: 'lotCode', header: 'Mã lô', width: 130, render: l => <Code>{l.lotCode}</Code> },
    { key: 'receivedDate', header: 'Ngày nhập', width: 110, render: l => fmtDate(l.receivedDate) },
    { key: 'receipt', header: 'Phiếu nhập', width: 130, render: l => <Code>{l.receiptCode}</Code> },
    { key: 'supplierName', header: 'Nhà cung cấp' },
    { key: 'quantity', header: 'SL nhập', numeric: true, width: 90, render: l => fmt(l.quantity) },
    { key: 'onHand', header: 'Tồn', numeric: true, width: 80, render: l => <b>{fmt(l.quantityOnHand)}</b> },
    { key: 'reserved', header: 'Giữ chỗ', numeric: true, width: 90, render: l => l.reserved ? fmt(l.reserved) : <span className="vb-muted">0</span> },
    { key: 'defective', header: 'Lỗi', numeric: true, width: 70, render: l => l.defective ? fmt(l.defective) : <span className="vb-muted">0</span> },
    { key: 'status', header: 'Trạng thái lô', width: 140, render: l => <LotStatusBadge status={l.status} /> },
  ];

  return (
    <div className="vb-stack">
      <div className="vb-row">
        <Button variant="ghost" icon="chevron-left" onClick={() => nav(back)}>Danh sách hàng hóa</Button>
      </div>

      <section className="vb-panel">
        <div className="vb-panel__head" style={{ flexWrap: 'wrap', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <div className="vb-row" style={{ gap: 10 }}>
              <h2 className="vb-panel__title" style={{ fontSize: 18, letterSpacing: 'var(--tracking-code)' }}>{p.sku}</h2>
              <span style={{ font: 'var(--type-body-strong)' }}>{p.name}</span>
            </div>
            <div className="vb-muted" style={{ marginTop: 2 }}>{p.categoryName} · đơn vị tính {p.unit}</div>
          </div>
          <Button variant="secondary" icon="square-pen" onClick={() => setEditing(true)}>Sửa hàng hóa</Button>
        </div>
        <div className="vb-panel__body vb-stack" style={{ gap: 16 }}>
          <Facts min={160}>
            <Fact label="Nhà cung cấp chính" value={<Link to={`/ql/nha-cung-cap/${p.supplierId}`}>{p.supplierName}</Link>} />
            <Fact label="Tồn khả dụng" value={<b>{fmt(p.available)} {p.unit}</b>} />
            <Fact label="Trong đó đang giữ chỗ" value={`${fmt(reserved)} ${p.unit}`} />
            <Fact label="Đơn chưa xuất" value={p.ordered ? `${fmt(p.ordered)} ${p.unit}` : <span className="vb-muted">0</span>} />
            <Fact label="Tồn ròng" value={<b style={{ color: low ? 'var(--red-700)' : undefined }}>{fmt(p.net)} {p.unit}</b>} />
            <Fact label="Tạm cách ly / khóa" value={held ? `${fmt(held)} ${p.unit}` : <span className="vb-muted">0</span>} />
            <Fact label="Hàng lỗi đã tách" value={defective ? `${fmt(defective)} ${p.unit}` : <span className="vb-muted">0</span>} />
            <Fact label="Số lô đã nhập" value={p.lotCount ? `${fmt(p.lotCount)} lô` : <span className="vb-muted">Chưa nhập kho</span>} />
          </Facts>
          {low && (
            <AlertBanner tone="warning" title="Tồn ròng đã chạm điểm đặt hàng lại">
              Tồn ròng {fmt(p.net)} ≤ ROP {fmt(policy?.currentRop, 1)} {p.unit} · <Link to="/ql/de-xuat">Đề xuất bổ sung</Link>
            </AlertBanner>
          )}
        </div>
      </section>

      <section className="vb-panel">
        <div className="vb-panel__head"><h3 className="vb-panel__title">Chính sách tồn kho</h3></div>
        <div className="vb-panel__body vb-stack" style={{ gap: 12 }}>
          {policy ? <>
            <Facts min={130}>
              <Fact label="Thời gian giao hàng (L)" value={`${fmt(policy.leadTimeDays)} ngày`} />
              <Fact label="Chi phí đặt hàng (S)" value={`${fmt(policy.orderingCost)} đ/lần`} />
              <Fact label="Chi phí lưu kho (H)" value={`${fmt(policy.holdingCost)} đ/${p.unit}/năm`} />
              <Fact label="Tình trạng nhu cầu" value={policy.demandState === 'slowMoving' ? <span style={{ color: 'var(--amber-700)' }}>Chậm luân chuyển</span> : policy.demandState === 'insufficientData' ? 'Chưa đủ dữ liệu' : 'Bình thường'} />
              <Fact label="Nhu cầu TB/ngày (d)" value={policy.avgDailyDemand != null ? fmt(policy.avgDailyDemand, 2) : notCalculated(pending)} />
              <Fact label="Độ lệch chuẩn (σ)" value={policy.demandStdDev != null ? fmt(policy.demandStdDev, 2) : notCalculated(pending)} />
              <Fact label="Tồn kho an toàn (SS)" value={policy.safetyStock != null ? `${fmt(policy.safetyStock, 1)} ${p.unit}` : notCalculated(pending)} />
              <Fact label="ROP" value={policy.currentRop != null ? <b>{fmt(policy.currentRop, 1)}</b> : notCalculated(pending)} />
              <Fact label="EOQ" value={policy.currentEoq != null ? <b>{fmt(policy.currentEoq)}</b> : notCalculated(pending)} />
            </Facts>
            <div className="vb-muted">
              {policy.lastRopCalculatedAt ? `Tính lần gần nhất ${fmtDateTime(policy.lastRopCalculatedAt)}` : 'Chưa tính'}
            </div>
          </> : <span className="vb-muted">Chưa có chính sách tồn kho</span>}
        </div>
      </section>

      <section className="vb-panel">
        <div className="vb-panel__head" style={{ flexWrap: 'wrap', gap: 12 }}>
          <h3 className="vb-panel__title">Lô hàng <span className="vb-muted">({fmt(rows.length)})</span></h3>
          <PanelSearch value={search} onChange={setSearch} placeholder="Mã lô, phiếu nhập…" label="Lọc lô hàng" />
          <Checkbox label="Gồm cả lô đã hết hàng" checked={showEmpty} onChange={e => setShowEmpty(e.target.checked)} />
        </div>
        {lots.isPending ? <Loading rows={3} /> : lots.isError ? <ListError onRetry={() => lots.refetch()} /> : (
          <DataTable
            columns={columns} rows={rows} maxHeight={460} caption="Lô hàng của mặt hàng" onRowClick={l => nav(`/ql/lo-hang/${l.id}`)}
            empty={search ? NO_MATCH : <EmptyState icon="layers" title={showEmpty ? 'Chưa nhập lô nào' : 'Không còn lô nào có hàng'} />}
          />
        )}
      </section>

      {editing && <ProductDialog product={p} onClose={() => setEditing(false)} />}
    </div>
  );
}
