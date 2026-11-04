import { useMemo, useState } from 'react';
import { Button, DataTable, EmptyState, FilterBar, TextField, type DataTableColumn } from '../../../design';
import { fmt } from '../../../app/format';
import { matches } from '../../../app/text';
import { FormDialog } from '../../../app/Modal';
import { useToast } from '../../../app/toast';
import { fieldErrors, formError, useSaveSupplier, useSuppliers, type Supplier } from '../../../app/catalog';
import { ListError, Loading } from '../../../app/ui';

/** UC_03 Quản lý nhà cung cấp. */
export function SuppliersPage() {
  const suppliers = useSuppliers();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Supplier | 'new' | null>(null);
  const rows = useMemo(
    () => (suppliers.data ?? []).filter(s => matches(search, s.name, s.phone, s.address)),
    [suppliers.data, search],
  );

  const columns: DataTableColumn<Supplier>[] = [
    { key: 'name', header: 'Tên nhà cung cấp', render: s => <span style={{ fontWeight: 500 }}>{s.name}</span> },
    { key: 'phone', header: 'Số điện thoại', width: 150, render: s => s.phone ?? <span className="vb-muted">—</span> },
    { key: 'address', header: 'Địa chỉ', render: s => s.address ?? <span className="vb-muted">—</span> },
    { key: 'productCount', header: 'Số mặt hàng', numeric: true, width: 110, render: s => fmt(s.productCount) },
  ];

  return (
    <div className="vb-stack">
      <FilterBar
        search={search} onSearchChange={setSearch} searchPlaceholder="Tìm theo tên, số điện thoại, địa chỉ…"
        resultCount={suppliers.data ? rows.length : undefined}
        actions={<Button icon="plus" onClick={() => setEditing('new')}>Thêm nhà cung cấp</Button>}
      />
      {suppliers.isPending ? <Loading /> : suppliers.isError ? <ListError onRetry={() => suppliers.refetch()} /> : (
        <DataTable
          columns={columns} rows={rows} onRowClick={s => setEditing(s)} maxHeight="calc(100dvh - 200px)" caption="Danh sách nhà cung cấp"
          empty={search
            ? <EmptyState icon="search" title="Không tìm thấy nhà cung cấp phù hợp" description="Thử từ khóa khác."
                action={<Button variant="secondary" onClick={() => setSearch('')}>Xoá từ khóa</Button>} />
            : <EmptyState icon="factory" title="Chưa có nhà cung cấp" description="Thêm nhà cung cấp để gắn cho hàng hóa và lập phiếu nhập kho." />}
        />
      )}
      {editing && <SupplierDialog supplier={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function SupplierDialog({ supplier, onClose }: { supplier: Supplier | null; onClose: () => void }) {
  const save = useSaveSupplier();
  const toast = useToast();
  const [f, setF] = useState({ name: supplier?.name ?? '', phone: supplier?.phone ?? '', address: supplier?.address ?? '' });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const errors = fieldErrors(save.error);

  const submit = () => save.mutate({ id: supplier?.id ?? null, input: f }, {
    onSuccess: saved => {
      toast({ tone: 'success', title: supplier ? `Đã lưu nhà cung cấp ${saved.name}` : `Đã thêm nhà cung cấp ${saved.name}` });
      onClose();
    },
  });

  return (
    <FormDialog
      title={supplier ? 'Sửa nhà cung cấp' : 'Thêm nhà cung cấp'}
      description={supplier && supplier.productCount > 0 ? `Đang là nhà cung cấp chính của ${fmt(supplier.productCount)} mặt hàng.` : undefined}
      submitLabel={supplier ? 'Lưu thay đổi' : 'Thêm nhà cung cấp'}
      busy={save.isPending} error={formError(save.error)} onSubmit={submit} onClose={onClose}
    >
      <TextField label="Tên nhà cung cấp" required autoFocus value={f.name} onChange={set('name')} error={errors.name} />
      <TextField label="Số điện thoại" type="tel" inputMode="tel" value={f.phone} onChange={set('phone')} error={errors.phone} helper="Ví dụ 0903 118 245." />
      <TextField label="Địa chỉ" value={f.address} onChange={set('address')} error={errors.address} />
    </FormDialog>
  );
}
