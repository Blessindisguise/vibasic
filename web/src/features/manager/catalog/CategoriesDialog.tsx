import { useState, type FormEvent } from 'react';
import { AlertBanner, Button, DataTable, EmptyState, TextField, type DataTableColumn } from '../../../design';
import { fmt } from '../../../app/format';
import { Modal } from '../../../app/Modal';
import { useToast } from '../../../app/toast';
import { fieldErrors, formError, useCategories, useSaveCategory, type Category } from '../../../app/catalog';

/** UC_02 3.1: add or edit a product category (name, description) from the product screen; "Xem hàng" filters the products by it. */
export function CategoriesDialog({ onClose, onShowProducts }: { onClose: () => void; onShowProducts: (c: Category) => void }) {
  const categories = useCategories();
  const save = useSaveCategory();
  const toast = useToast();
  const [editing, setEditing] = useState<Category | null>(null);
  const [f, setF] = useState({ name: '', description: '' });
  const errors = fieldErrors(save.error);

  const startEdit = (c: Category | null) => {
    save.reset();
    setEditing(c);
    setF({ name: c?.name ?? '', description: c?.description ?? '' });
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    save.mutate({ id: editing?.id ?? null, input: f }, {
      onSuccess: saved => {
        toast({ tone: 'success', title: editing ? `Đã lưu nhóm hàng ${saved.name}` : `Đã thêm nhóm hàng ${saved.name}` });
        startEdit(null);
      },
    });
  };

  const columns: DataTableColumn<Category>[] = [
    { key: 'name', header: 'Tên nhóm', render: c => <span style={{ fontWeight: 500 }}>{c.name}</span> },
    { key: 'description', header: 'Mô tả', render: c => c.description ?? <span className="vb-muted">—</span> },
    { key: 'productCount', header: 'Số mặt hàng', numeric: true, width: 100, render: c => fmt(c.productCount) },
    {
      key: 'edit', header: '', width: 150, align: 'right',
      render: c => (
        <div className="vb-row" style={{ justifyContent: 'flex-end', flexWrap: 'nowrap', gap: 4 }}>
          <Button variant="ghost" size="sm" disabled={c.productCount === 0} onClick={() => onShowProducts(c)} aria-label={`Xem hàng hóa nhóm ${c.name}`}>Xem hàng</Button>
          <Button variant="ghost" size="sm" onClick={() => startEdit(c)} aria-label={`Sửa nhóm ${c.name}`}>Sửa</Button>
        </div>
      ),
    },
  ];

  return (
    <Modal title="Nhóm hàng" onClose={onClose} width={680}>
      <DataTable
        columns={columns} rows={categories.data ?? []} maxHeight={280} caption="Danh sách nhóm hàng"
        empty={<EmptyState icon="folder-tree" title="Chưa có nhóm hàng" />}
      />
      <form onSubmit={submit} noValidate className="vb-panel" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12, background: 'var(--surface-sunken)' }}>
        <div style={{ font: 'var(--type-body-strong)' }}>{editing ? `Sửa nhóm hàng "${editing.name}"` : 'Thêm nhóm hàng'}</div>
        {formError(save.error) && <AlertBanner tone="danger">{formError(save.error)}</AlertBanner>}
        <TextField label="Tên nhóm" required value={f.name} onChange={e => setF({ ...f, name: e.target.value })} error={errors.name} autoFocus />
        <TextField label="Mô tả" value={f.description} onChange={e => setF({ ...f, description: e.target.value })} error={errors.description} />
        <div className="vb-row" style={{ justifyContent: 'flex-end' }}>
          {editing && <Button variant="secondary" type="button" onClick={() => startEdit(null)}>Huỷ sửa</Button>}
          <Button type="submit" loading={save.isPending}>{editing ? 'Lưu nhóm hàng' : 'Thêm nhóm hàng'}</Button>
        </div>
      </form>
    </Modal>
  );
}
