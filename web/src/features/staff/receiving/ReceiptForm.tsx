import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertBanner, Button, Icon, IconButton, SelectField, TextField } from '../../../design';
import { fmt } from '../../../app/format';
import { parseNumber } from '../../../app/text';
import { useToast } from '../../../app/toast';
import { Loading } from '../../../app/ui';
import { FieldGrid } from '../../../app/Modal';
import { fieldErrors, formError, useProducts, useSuppliers, type Product } from '../../../app/catalog';
import { useReceipt, useSaveReceipt, type ReceiptView } from '../../../app/receiving';

interface LineState { key: number; productId: string; received: string; failed: string; doc: string; note: string; defect: string }

let nextKey = 1;
const emptyLine = (): LineState => ({ key: nextKey++, productId: '', received: '', failed: '0', doc: '', note: '', defect: '' });

/** Rebuild one form line per product from the lots of a saved receipt. */
function linesFrom(view: ReceiptView): LineState[] {
  const byProduct = new Map<number, LineState>();
  for (const lot of view.lots) {
    const l = byProduct.get(lot.productId) ?? { ...emptyLine(), productId: String(lot.productId), received: '0' };
    l.received = String(Number(l.received) + lot.quantity);
    if (lot.status === 'normal') { l.note = lot.note ?? ''; if (lot.documentQuantity != null) l.doc = String(lot.documentQuantity); }
    else { l.failed = String(lot.quantity); l.defect = lot.note ?? ''; if (lot.documentQuantity != null) l.doc = String(lot.documentQuantity); }
    byProduct.set(lot.productId, l);
  }
  return [...byProduct.values()];
}

/** UC_04 Lập phiếu nhập kho (and editing after "Từ chối", UC_05 5.1). Touch-sized for tablets. */
export function ReceiptForm({ id, basePath }: { id?: number; basePath: string }) {
  const editing = id != null;
  const existing = useReceipt(id ?? 0);
  const suppliers = useSuppliers();
  const products = useProducts();
  const save = useSaveReceipt();
  const toast = useToast();
  const nav = useNavigate();
  const [supplierId, setSupplierId] = useState('');
  const [note, setNote] = useState('');
  const [deliveryNo, setDeliveryNo] = useState('');
  const [lines, setLines] = useState<LineState[]>([emptyLine()]);
  const [loaded, setLoaded] = useState(!editing);

  useEffect(() => {
    if (!editing || loaded || !existing.data) return;
    setSupplierId(String(existing.data.header.supplierId));
    setNote(existing.data.note ?? '');
    setDeliveryNo(existing.data.header.deliveryNoteNo ?? '');
    setLines(linesFrom(existing.data));
    setLoaded(true);
  }, [editing, loaded, existing.data]);

  const errors = fieldErrors(save.error);
  const productById = useMemo(() => new Map((products.data ?? []).map(p => [p.id, p])), [products.data]);
  const update = (key: number, patch: Partial<LineState>) => setLines(ls => ls.map(l => (l.key === key ? { ...l, ...patch } : l)));

  if (!loaded || suppliers.isPending || products.isPending) return <Loading />;
  if (editing && existing.data && !['receiving', 'rejected'].includes(existing.data.header.status)) {
    return <AlertBanner tone="warning" title={`Phiếu ${existing.data.header.code} không sửa được`} />;
  }

  const submit = (e: FormEvent) => {
    e.preventDefault();
    save.mutate({
      id: id ?? null,
      input: {
        supplierId: supplierId ? Number(supplierId) : null, note, deliveryNoteNo: deliveryNo,
        lines: lines.map(l => ({
          productId: l.productId ? Number(l.productId) : null, receivedQuantity: parseNumber(l.received),
          failedQuantity: parseNumber(l.failed) ?? 0, documentQuantity: parseNumber(l.doc), note: l.note, defectDescription: l.defect,
        })),
      },
    }, {
      onSuccess: view => {
        toast({ tone: 'success', title: editing ? `Đã lưu phiếu ${view.header.code}` : `Đã lập phiếu ${view.header.code}`, message: `Đã tạo ${view.lots.length} lô.` });
        nav(`${basePath}/${view.header.id}`);
      },
    });
  };

  // A product comes from its supplier only: with a supplier chosen, only its products are offered; a product picked first
  // chooses the supplier, and the supplier list then keeps only the suppliers of the products on the form.
  const supplier = Number(supplierId);
  const picked = lines.map(l => productById.get(Number(l.productId))).filter((p): p is Product => !!p);
  const lockedTo = new Set(picked.map(p => p.supplierId));
  if (supplierId) lockedTo.add(supplier);
  const supplierOptions = (suppliers.data ?? [])
    .filter(s => picked.length === 0 || lockedTo.has(s.id))
    .map(s => ({ value: String(s.id), label: s.name }));
  const supplierName = suppliers.data?.find(s => s.id === supplier)?.name;
  const pickProduct = (key: number, productId: string) => {
    update(key, { productId });
    const p = productById.get(Number(productId));
    if (p && !supplierId) setSupplierId(String(p.supplierId));
  };
  const totals = lines.reduce((t, l) => {
    const r = parseNumber(l.received) ?? 0, f = Math.min(parseNumber(l.failed) ?? 0, r);
    return { passed: t.passed + r - f, failed: t.failed + f };
  }, { passed: 0, failed: 0 });

  return (
    <form onSubmit={submit} noValidate className="vb-stack" style={{ maxWidth: 1040 }}>
      <div className="vb-row">
        <Button type="button" variant="ghost" size="lg" icon="chevron-left" onClick={() => nav(editing ? `${basePath}/${id}` : basePath)}>
          {editing ? `Phiếu ${existing.data?.header.code}` : 'Danh sách phiếu nhập'}
        </Button>
      </div>
      {formError(save.error) && <AlertBanner tone="danger">{formError(save.error)}</AlertBanner>}
      {errors.lines && <AlertBanner tone="danger">{errors.lines}</AlertBanner>}

      <section className="vb-panel">
        <div className="vb-panel__head"><h2 className="vb-panel__title">{editing ? `Sửa phiếu ${existing.data?.header.code}` : 'Phiếu nhập kho mới'}</h2></div>
        <div className="vb-panel__body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <FieldGrid>
            <SelectField
              size="xl" label="Nhà cung cấp" required placeholder={picked.length === 0 ? 'Chọn nhà cung cấp giao hàng' : undefined} value={supplierId}
              onChange={e => setSupplierId(e.target.value)} error={errors.supplierId} options={supplierOptions}
            />
            <TextField size="xl" label="Số chứng từ giao hàng" placeholder="Số phiếu giao hàng của nhà cung cấp" value={deliveryNo}
              onChange={e => setDeliveryNo(e.target.value)} error={errors.deliveryNoteNo} />
          </FieldGrid>
          <TextField size="xl" label="Ghi chú phiếu" placeholder="Ví dụ: giao bằng xe của NCC, kiện bị móp" value={note} onChange={e => setNote(e.target.value)} error={errors.note} />
        </div>
      </section>

      {lines.map((l, i) => (
        <LineEditor
          key={l.key} index={i} line={l} products={products.data ?? []} supplierId={supplierId ? supplier : null} supplierName={supplierName}
          taken={new Set(lines.filter(x => x.key !== l.key).map(x => Number(x.productId)))} product={productById.get(Number(l.productId))}
          errors={errors} canRemove={lines.length > 1}
          onPick={pid => pickProduct(l.key, pid)} onChange={patch => update(l.key, patch)} onRemove={() => setLines(ls => ls.filter(x => x.key !== l.key))}
        />
      ))}

      <div className="vb-row" style={{ justifyContent: 'space-between' }}>
        <Button type="button" variant="secondary" size="xl" icon="plus" onClick={() => setLines(ls => [...ls, emptyLine()])}>Thêm mặt hàng</Button>
        <span style={{ font: 'var(--type-touch-body)', fontVariantNumeric: 'tabular-nums' }}>
          Đạt <b>{fmt(totals.passed)}</b> · Không đạt <b>{fmt(totals.failed)}</b>
        </span>
      </div>

      <div className="vb-row" style={{ justifyContent: 'flex-end', paddingTop: 8, borderTop: '1px solid var(--border-default)' }}>
        <Button type="button" variant="secondary" size="xl" onClick={() => nav(editing ? `${basePath}/${id}` : basePath)}>Huỷ</Button>
        <Button type="submit" size="xl" icon="barcode" loading={save.isPending}>{editing ? 'Lưu thay đổi' : 'Lưu và tạo mã lô'}</Button>
      </div>
    </form>
  );
}

function LineEditor({ index, line, products, supplierId, supplierName, taken, product, errors, canRemove, onPick, onChange, onRemove }: {
  index: number; line: LineState; products: Product[]; supplierId: number | null; supplierName?: string; taken: Set<number>; product?: Product;
  errors: Record<string, string>; canRemove: boolean;
  onPick: (productId: string) => void; onChange: (patch: Partial<LineState>) => void; onRemove: () => void;
}) {
  const k = `lines[${index}].`;
  const unit = product?.unit ?? 'đơn vị';
  const received = parseNumber(line.received);
  const failed = parseNumber(line.failed) ?? 0;
  const passed = received == null ? null : received - failed;
  const doc = parseNumber(line.doc);
  const differs = doc != null && received != null && doc !== received;
  const productError = errors[k + 'productId'];
  // With a supplier: its products (plus this line's product if it no longer belongs to it, so the error shows). Without: all, by supplier.
  const own = supplierId == null ? [] : products.filter(p => p.supplierId === supplierId || p.id === product?.id);
  const bySupplier = supplierId != null ? [] : [...products.reduce((m, p) => m.set(p.supplierName, [...(m.get(p.supplierName) ?? []), p]), new Map<string, Product[]>())]
    .sort(([a], [b]) => a.localeCompare(b, 'vi'));
  const option = (p: Product) => (
    <option key={p.id} value={p.id} disabled={taken.has(p.id)}>{p.sku} · {p.name}{taken.has(p.id) ? ' (đã có ở dòng khác)' : ''}</option>
  );

  return (
    <section className="vb-panel">
      <div className="vb-panel__head">
        <span style={{ font: 'var(--type-touch-heading)', fontSize: 17 }}>Mặt hàng {index + 1}</span>
        {passed != null && passed >= 0 && (
          <span className="vb-row" style={{ marginLeft: 'auto', gap: 12, font: 'var(--type-body)', fontVariantNumeric: 'tabular-nums' }}>
            {passed > 0 && <span><Icon name="circle-check" size={16} style={{ color: 'var(--green-600)', verticalAlign: -3 }} /> Lô đạt: {fmt(passed)} {unit}</span>}
            {failed > 0 && <span><Icon name="shield-alert" size={16} style={{ color: 'var(--grey-700)', verticalAlign: -3 }} /> Lô cách ly: {fmt(failed)} {unit}</span>}
          </span>
        )}
        {canRemove && <IconButton icon="trash-2" label={`Bỏ mặt hàng ${index + 1}`} variant="ghost" size="lg" onClick={onRemove} style={{ marginLeft: passed != null ? 0 : 'auto' }} />}
      </div>
      <div className="vb-panel__body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="vb-field">
          <label htmlFor={`p-${line.key}`} className="vb-field__label">Mặt hàng<span className="req" aria-hidden="true">*</span></label>
          <div className={`vb-input vb-input--xl${productError ? ' vb-input--error' : ''}`} style={{ position: 'relative' }}>
            <select id={`p-${line.key}`} value={line.productId} onChange={e => onPick(e.target.value)} aria-invalid={!!productError || undefined}>
              <option value="">
                {supplierId == null ? 'Chọn mặt hàng (nhà cung cấp được chọn theo)' : own.length ? `Chọn mặt hàng của ${supplierName ?? 'nhà cung cấp'}` : 'Nhà cung cấp này chưa có mặt hàng nào'}
              </option>
              {supplierId != null
                ? own.map(option)
                : bySupplier.map(([name, list]) => <optgroup key={name} label={name}>{list.map(option)}</optgroup>)}
            </select>
            <Icon name="chevron-down" size={20} style={{ position: 'absolute', right: 14, pointerEvents: 'none', color: 'var(--text-secondary)' }} />
          </div>
          {productError && <div className="vb-field__help vb-field__help--error"><Icon name="circle-x" size={14} style={{ marginTop: 1 }} />{productError}</div>}
        </div>
        <FieldGrid>
          <TextField size="xl" label="Số thực nhận" required inputMode="numeric" suffix={unit} value={line.received}
            onChange={e => onChange({ received: e.target.value })} error={errors[k + 'receivedQuantity']} />
          <TextField size="xl" label="Số không đạt" inputMode="numeric" suffix={unit} value={line.failed}
            onChange={e => onChange({ failed: e.target.value })} error={errors[k + 'failedQuantity']} />
          <TextField size="xl" label="Số trên chứng từ" inputMode="numeric" suffix={unit} value={line.doc} placeholder="Bỏ trống nếu khớp"
            onChange={e => onChange({ doc: e.target.value })} error={errors[k + 'documentQuantity']}
            helper={differs ? `Chênh lệch ${received! - doc! > 0 ? 'dư' : 'thiếu'} ${fmt(Math.abs(received! - doc!))} ${unit}.` : undefined} />
        </FieldGrid>
        {differs && (passed ?? 0) > 0 && (
          <TextField size="xl" label="Ghi chú chênh lệch" required value={line.note} placeholder="Ví dụ: NCC giao thiếu 2 cái, hẹn bù đợt sau"
            onChange={e => onChange({ note: e.target.value })} error={errors[k + 'note']} />
        )}
        {failed > 0 && (
          <TextField size="xl" multiline label="Mô tả lỗi" required value={line.defect} placeholder="Ví dụ: nứt mặt thớt, cong vênh, mối mọt"
            onChange={e => onChange({ defect: e.target.value })} error={errors[k + 'defectDescription']} />
        )}
      </div>
    </section>
  );
}
