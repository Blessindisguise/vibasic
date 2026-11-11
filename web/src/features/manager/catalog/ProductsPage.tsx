import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertBanner, Button, DataTable, EmptyState, FilterBar, SelectField, TextField, type DataTableColumn } from '../../../design';
import { fmt, fmtDateTime } from '../../../app/format';
import { matches, parseNumber } from '../../../app/text';
import { suggestFrom } from '../../../app/suggest';
import { FieldGrid, FormDialog } from '../../../app/Modal';
import { useToast } from '../../../app/toast';
import {
  fieldErrors, formError, useCategories, useProducts, useSaveProduct, useSuppliers, type Product,
} from '../../../app/catalog';
import { CategoriesDialog } from './CategoriesDialog';
import { Code, ListError, Loading } from '../../../app/ui';

type Sort = { key: string; dir: 'asc' | 'desc' };

/** UC_02 Quản lý hàng hóa: list, filter by category / supplier / keyword, create and edit; a row opens the product's page. */
export function ProductsPage() {
  const products = useProducts();
  const categories = useCategories();
  const suppliers = useSuppliers();
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [sort, setSort] = useState<Sort>({ key: 'sku', dir: 'asc' });
  const [editing, setEditing] = useState<Product | 'new' | null>(null);
  const [showCategories, setShowCategories] = useState(false);
  const nav = useNavigate();

  const rows = useMemo(() => {
    const list = (products.data ?? []).filter(p =>
      (!categoryId || p.categoryId === Number(categoryId)) &&
      (!supplierId || p.supplierId === Number(supplierId)) &&
      matches(search, p.sku, p.name));
    const dir = sort.dir === 'asc' ? 1 : -1;
    const val = (p: Product): string | number => sort.key === 'available' ? p.available : sort.key === 'name' ? p.name : p.sku;
    return [...list].sort((a, b) => {
      const x = val(a), y = val(b);
      return (typeof x === 'number' ? x - (y as number) : x.localeCompare(y as string, 'vi')) * dir;
    });
  }, [products.data, search, categoryId, supplierId, sort]);

  const categoryName = categories.data?.find(c => c.id === Number(categoryId))?.name;
  const supplierName = suppliers.data?.find(s => s.id === Number(supplierId))?.name;
  const chips = [
    ...(categoryName ? [{ key: 'category', label: `Nhóm: ${categoryName}` }] : []),
    ...(supplierName ? [{ key: 'supplier', label: `NCC: ${supplierName}` }] : []),
  ];
  const clearAll = () => { setSearch(''); setCategoryId(''); setSupplierId(''); };
  const missingPrereq = categories.data?.length === 0 || suppliers.data?.length === 0;

  const columns: DataTableColumn<Product>[] = [
    { key: 'sku', header: 'Mã SKU', sortable: true, width: 110, render: p => <Code>{p.sku}</Code> },
    { key: 'name', header: 'Tên hàng', sortable: true },
    { key: 'categoryName', header: 'Nhóm hàng' },
    { key: 'supplierName', header: 'Nhà cung cấp chính' },
    { key: 'unit', header: 'ĐVT', width: 64 },
    { key: 'available', header: 'Tồn khả dụng', numeric: true, sortable: true, width: 120, render: p => fmt(p.available) },
    { key: 'rop', header: 'ROP', numeric: true, width: 80, render: p => <Derived value={p.policy?.currentRop} /> },
    { key: 'eoq', header: 'EOQ', numeric: true, width: 80, render: p => <Derived value={p.policy?.currentEoq} /> },
    {
      key: 'edit', header: '', width: 64, align: 'right',
      render: p => <Button variant="ghost" size="sm" onClick={e => { e.stopPropagation(); setEditing(p); }} aria-label={`Sửa hàng hóa ${p.sku}`}>Sửa</Button>,
    },
  ];

  return (
    <div className="vb-stack">
      {missingPrereq && (
        <AlertBanner tone="warning" title="Chưa đủ danh mục để thêm hàng hóa" />
      )}
      <FilterBar
        search={search} onSearchChange={setSearch} searchPlaceholder="Tìm theo mã SKU, tên hàng…"
        suggestions={suggestFrom(products.data, search, p => [p.sku, p.name], p => ({ key: String(p.id), label: p.sku, hint: p.name, meta: `Khả dụng ${fmt(p.available)} ${p.unit}` }))}
        onPickSuggestion={s => setSearch(s.label)}
        filters={[
          { key: 'category', label: 'Nhóm hàng', value: categoryId, options: (categories.data ?? []).map(c => ({ value: String(c.id), label: c.name })) },
          { key: 'supplier', label: 'Nhà cung cấp', value: supplierId, options: (suppliers.data ?? []).map(s => ({ value: String(s.id), label: s.name })) },
        ]}
        onFilterChange={(k, v) => (k === 'category' ? setCategoryId : setSupplierId)(v)}
        chips={chips}
        onRemoveChip={k => (k === 'category' ? setCategoryId : setSupplierId)('')}
        onClearAll={chips.length ? clearAll : undefined}
        resultCount={products.data ? rows.length : undefined}
        actions={<>
          <Button variant="secondary" icon="folder-tree" onClick={() => setShowCategories(true)}>Nhóm hàng</Button>
          <Button icon="plus" disabled={missingPrereq} onClick={() => setEditing('new')}>Thêm hàng hóa</Button>
        </>}
      />

      {products.isPending ? <Loading /> : products.isError ? <ListError onRetry={() => products.refetch()} /> : (
        <DataTable
          columns={columns} rows={rows} sort={sort} onSortChange={setSort}
          onRowClick={p => nav(`/ql/hang-hoa/${p.id}`)} maxHeight="calc(100dvh - 220px)" caption="Danh sách hàng hóa"
          empty={search || chips.length
            ? <EmptyState icon="search" title="Không tìm thấy hàng hóa phù hợp" description="Thử từ khóa khác hoặc bỏ bớt bộ lọc."
                action={<Button variant="secondary" onClick={clearAll}>Xoá bộ lọc</Button>} />
            : <EmptyState icon="boxes" title="Chưa có hàng hóa" />}
        />
      )}

      {editing && <ProductDialog product={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      {showCategories && <CategoriesDialog onClose={() => setShowCategories(false)} onShowProducts={c => { setCategoryId(String(c.id)); setShowCategories(false); }} />}
    </div>
  );
}

/** ROP/EOQ are derived by the system; until the weekly job has run they are not shown as 0. */
function Derived({ value }: { value?: number }) {
  return value == null ? <span className="vb-muted">Chưa tính</span> : <>{fmt(value)}</>;
}

export function ProductDialog({ product, onClose }: { product: Product | null; onClose: () => void }) {
  const categories = useCategories();
  const suppliers = useSuppliers();
  const products = useProducts();
  const save = useSaveProduct();
  const toast = useToast();
  const p = product?.policy;
  const [f, setF] = useState({
    sku: product?.sku ?? '', name: product?.name ?? '', unit: product?.unit ?? '',
    categoryId: product ? String(product.categoryId) : '', supplierId: product ? String(product.supplierId) : '',
    leadTimeDays: p ? String(p.leadTimeDays) : '',
    orderingCost: p ? fmt(p.orderingCost) : '', holdingCost: p ? fmt(p.holdingCost) : '',
  });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const errors = fieldErrors(save.error);
  const skuLocked = (product?.lotCount ?? 0) > 0;
  const units = [...new Set((products.data ?? []).map(x => x.unit))].sort((a, b) => a.localeCompare(b, 'vi'));
  const unitLabel = f.unit.trim() || 'đơn vị';

  const submit = () => save.mutate(
    {
      id: product?.id ?? null,
      input: {
        sku: f.sku, name: f.name, unit: f.unit,
        categoryId: f.categoryId ? Number(f.categoryId) : null, supplierId: f.supplierId ? Number(f.supplierId) : null,
        leadTimeDays: parseNumber(f.leadTimeDays),
        orderingCost: parseNumber(f.orderingCost), holdingCost: parseNumber(f.holdingCost),
      },
    },
    {
      onSuccess: saved => {
        toast({ tone: 'success', title: product ? `Đã lưu hàng hóa ${saved.sku}` : `Đã thêm hàng hóa ${saved.sku}` });
        onClose();
      },
    },
  );

  return (
    <FormDialog
      title={product ? `Sửa hàng hóa ${product.sku}` : 'Thêm hàng hóa'}
      description={product ? product.name : undefined}
      submitLabel={product ? 'Lưu thay đổi' : 'Thêm hàng hóa'}
      busy={save.isPending} error={formError(save.error)} onSubmit={submit} onClose={onClose} width={640}
    >
      <FieldGrid>
        <TextField
          label="Mã SKU" required autoFocus={!product} value={f.sku} onChange={set('sku')} error={errors.sku}
          disabled={skuLocked} inputStyle={{ textTransform: 'uppercase', letterSpacing: 'var(--tracking-code)' }}
          placeholder="Ví dụ THT-04"
        />
        <TextField label="Đơn vị tính" required list="vb-units" value={f.unit} onChange={set('unit')} error={errors.unit} placeholder="cái, hộp, đôi…" />
      </FieldGrid>
      <datalist id="vb-units">{units.map(u => <option key={u} value={u} />)}</datalist>
      <TextField label="Tên hàng" required autoFocus={!!product} value={f.name} onChange={set('name')} error={errors.name} />
      <FieldGrid>
        <SelectField
          label="Nhóm hàng" required placeholder="Chọn nhóm hàng" value={f.categoryId} onChange={set('categoryId')} error={errors.categoryId}
          options={(categories.data ?? []).map(c => ({ value: String(c.id), label: c.name }))}
        />
        <SelectField
          label="Nhà cung cấp chính" required placeholder="Chọn nhà cung cấp" value={f.supplierId} onChange={set('supplierId')} error={errors.supplierId}
          options={(suppliers.data ?? []).map(s => ({ value: String(s.id), label: s.name }))}
        />
      </FieldGrid>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 16, borderTop: '1px solid var(--border-subtle)' }}>
        <h3 style={{ margin: 0, font: 'var(--type-body-strong)' }}>Chính sách tồn kho</h3>
        <FieldGrid>
          <TextField label="Thời gian giao hàng (L)" required inputMode="numeric" suffix="ngày" value={f.leadTimeDays} onChange={set('leadTimeDays')} error={errors.leadTimeDays} />
          <TextField label="Chi phí đặt hàng (S)" required inputMode="numeric" suffix="đ/lần đặt" value={f.orderingCost} onChange={set('orderingCost')} error={errors.orderingCost} />
          <TextField label="Chi phí lưu kho (H)" required inputMode="numeric" suffix={`đ/${unitLabel}/năm`} value={f.holdingCost} onChange={set('holdingCost')} error={errors.holdingCost} />
        </FieldGrid>
        {product && (
          <div className="vb-muted" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {p?.currentRop == null && p?.currentEoq == null
              ? 'ROP, EOQ chưa tính'
              : <>SS {fmt(p?.safetyStock, 1)} · ROP hiện hành {fmt(p?.currentRop, 1)} · EOQ {fmt(p?.currentEoq)}
                  {p?.lastRopCalculatedAt && <> · tính lúc {fmtDateTime(p.lastRopCalculatedAt)}</>}</>}
          </div>
        )}
      </section>
    </FormDialog>
  );
}
