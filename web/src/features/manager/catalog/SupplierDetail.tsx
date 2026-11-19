import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, DataTable, EmptyState, type DataTableColumn } from '../../../design';
import { fmt, fmtDate } from '../../../app/format';
import { useProducts, useSuppliers, type Product } from '../../../app/catalog';
import { useReceipts, type ReceiptRow } from '../../../app/receiving';
import { ReceiptStatusBadge } from '../../../app/statusBadges';
import { Code, Fact, Facts, ListError, Loading, NO_MATCH, PanelSearch } from '../../../app/ui';
import { matches } from '../../../app/text';
import { SupplierDialog } from './SuppliersPage';

/** UC_03, xem chi tiết nhà cung cấp: contact, the products it supplies and its receipts. */
export function SupplierDetail({ id, back }: { id: number; back: string }) {
  const suppliers = useSuppliers();
  const products = useProducts();
  const receipts = useReceipts({ supplierId: String(id) });
  const nav = useNavigate();
  const [editing, setEditing] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [receiptSearch, setReceiptSearch] = useState('');
  const supplier = suppliers.data?.find(s => s.id === id);

  if (suppliers.isPending) return <Loading />;
  if (suppliers.isError) return <ListError onRetry={() => suppliers.refetch()} />;
  if (!supplier) {
    return <div className="vb-panel"><EmptyState icon="search" title="Không tìm thấy nhà cung cấp" action={<Button variant="secondary" onClick={() => nav(back)}>Về danh sách</Button>} /></div>;
  }
  const s = supplier;
  const own = (products.data ?? []).filter(p => p.supplierId === id);
  const list = receipts.data ?? [];
  const approved = list.filter(r => r.status === 'approved');
  const last = approved[0];

  const productColumns: DataTableColumn<Product>[] = [
    { key: 'sku', header: 'Mã SKU', width: 110, render: p => <Code>{p.sku}</Code> },
    { key: 'name', header: 'Tên hàng' },
    { key: 'categoryName', header: 'Nhóm hàng', width: 160 },
    { key: 'available', header: 'Tồn khả dụng', numeric: true, width: 120, render: p => `${fmt(p.available)} ${p.unit}` },
    { key: 'rop', header: 'ROP', numeric: true, width: 80, render: p => p.policy?.currentRop != null ? fmt(p.policy.currentRop) : <span className="vb-muted">—</span> },
  ];
  const receiptColumns: DataTableColumn<ReceiptRow>[] = [
    { key: 'code', header: 'Phiếu nhập', width: 130, render: r => <Code>{r.code}</Code> },
    { key: 'receiptDate', header: 'Ngày nhập', width: 110, render: r => fmtDate(r.receiptDate) },
    { key: 'deliveryNoteNo', header: 'Chứng từ giao hàng', width: 160, render: r => r.deliveryNoteNo ?? <span className="vb-muted">—</span> },
    { key: 'products', header: 'Mặt hàng', numeric: true, width: 90, render: r => fmt(r.productCount) },
    { key: 'total', header: 'Số lượng', numeric: true, width: 100, render: r => fmt(r.totalQuantity) },
    { key: 'creatorName', header: 'Người lập', width: 150 },
    { key: 'status', header: 'Trạng thái', width: 140, render: r => <ReceiptStatusBadge status={r.status} /> },
  ];

  return (
    <div className="vb-stack">
      <div className="vb-row">
        <Button variant="ghost" icon="chevron-left" onClick={() => nav(back)}>Danh sách nhà cung cấp</Button>
      </div>

      <section className="vb-panel">
        <div className="vb-panel__head" style={{ flexWrap: 'wrap', gap: 12 }}>
          <h2 className="vb-panel__title" style={{ flex: 1, minWidth: 240, fontSize: 18 }}>{s.name}</h2>
          <Button variant="secondary" icon="square-pen" onClick={() => setEditing(true)}>Sửa nhà cung cấp</Button>
        </div>
        <div className="vb-panel__body">
          <Facts min={170}>
            <Fact label="Số điện thoại" value={s.phone ?? <span className="vb-muted">—</span>} />
            <Fact label="Địa chỉ" value={s.address ?? <span className="vb-muted">—</span>} />
            <Fact label="Nhà cung cấp chính của" value={`${fmt(s.productCount)} mặt hàng`} />
            <Fact label="Phiếu nhập đã duyệt" value={receipts.data ? fmt(approved.length) : '…'} />
            <Fact label="Lần nhập gần nhất" value={last ? `${fmtDate(last.receiptDate)} · ${last.code}` : <span className="vb-muted">Chưa có</span>} />
          </Facts>
        </div>
      </section>

      <section className="vb-panel">
        <div className="vb-panel__head">
          <h3 className="vb-panel__title">Hàng hóa cung cấp <span className="vb-muted">({own.length})</span></h3>
          <PanelSearch value={productSearch} onChange={setProductSearch} placeholder="Mã SKU, tên hàng…" label="Lọc hàng hóa của nhà cung cấp" />
        </div>
        <DataTable
          columns={productColumns} rows={own.filter(p => matches(productSearch, p.sku, p.name, p.categoryName))} maxHeight={360} caption="Hàng hóa của nhà cung cấp" onRowClick={p => nav(`/ql/hang-hoa/${p.id}`)}
          empty={productSearch ? NO_MATCH : <EmptyState icon="boxes" title="Chưa có hàng hóa" />}
        />
      </section>

      <section className="vb-panel">
        <div className="vb-panel__head">
          <h3 className="vb-panel__title">Phiếu nhập kho <span className="vb-muted">({list.length})</span></h3>
          <PanelSearch value={receiptSearch} onChange={setReceiptSearch} placeholder="Mã phiếu, số chứng từ, người lập / duyệt…" label="Lọc phiếu nhập" />
        </div>
        {receipts.isPending ? <Loading rows={3} /> : receipts.isError ? <ListError onRetry={() => receipts.refetch()} /> : (
          <DataTable
            columns={receiptColumns} rows={list.filter(r => matches(receiptSearch, r.code, r.deliveryNoteNo, r.creatorName, r.approverName))} maxHeight={420} caption="Phiếu nhập của nhà cung cấp" onRowClick={r => nav(`/ql/nhap-kho/${r.id}`)}
            empty={receiptSearch ? NO_MATCH : <EmptyState icon="package-plus" title="Chưa có phiếu nhập" />}
          />
        )}
      </section>

      {editing && <SupplierDialog supplier={s} onClose={() => setEditing(false)} />}
    </div>
  );
}
