import { useMemo, useState } from 'react';
import { Button, ConfirmDialog, DataTable, EmptyState, FilterBar, SelectField, StatusBadge, TextField, type DataTableColumn } from '../../../design';
import { useAuth, type Role } from '../../../app/auth';
import { matches } from '../../../app/text';
import { suggestFrom } from '../../../app/suggest';
import { FormDialog } from '../../../app/Modal';
import { useToast } from '../../../app/toast';
import { fieldErrors, formError, useAccounts, useSaveAccount, useSetAccountActive, type Account } from '../../../app/catalog';
import { Code, ListError, Loading } from '../../../app/ui';

const ROLE_LABEL: Record<Role, string> = { manager: 'Quản lý', staff: 'Nhân viên kho' };
const ROLE_OPTIONS = (Object.keys(ROLE_LABEL) as Role[]).map(r => ({ value: r, label: ROLE_LABEL[r] }));
const STATUS_OPTIONS = [{ value: 'active', label: 'Đang hoạt động' }, { value: 'inactive', label: 'Ngừng hoạt động' }];

/** UC_01 Quản lý nhân viên: create, edit, deactivate and reopen accounts. */
export function AccountsPage() {
  const { user } = useAuth();
  const accounts = useAccounts();
  const setActive = useSetAccountActive();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [editing, setEditing] = useState<Account | 'new' | null>(null);
  const [deactivating, setDeactivating] = useState<Account | null>(null);

  const rows = useMemo(() => (accounts.data ?? []).filter(a =>
    (!role || a.role === role) &&
    (!status || a.isActive === (status === 'active')) &&
    matches(search, a.fullName, a.username)), [accounts.data, search, role, status]);

  const chips = [
    ...(role ? [{ key: 'role', label: `Vai trò: ${ROLE_LABEL[role as Role]}` }] : []),
    ...(status ? [{ key: 'status', label: STATUS_OPTIONS.find(o => o.value === status)!.label }] : []),
  ];

  const toggle = (a: Account, active: boolean) => setActive.mutate({ id: a.id, active }, {
    onSuccess: () => {
      setDeactivating(null);
      toast(active
        ? { tone: 'success', title: `Đã mở lại tài khoản ${a.username}` }
        : { tone: 'info', title: `Đã ngừng hoạt động tài khoản ${a.username}`, action: { label: 'Hoàn tác', onClick: () => toggle(a, true) } });
    },
    onError: e => toast({ tone: 'danger', title: 'Không cập nhật được trạng thái', message: e.message }),
  });

  const columns: DataTableColumn<Account>[] = [
    {
      key: 'fullName', header: 'Họ tên',
      render: a => <span style={{ fontWeight: 500 }}>{a.fullName}{a.id === user?.id && <span className="vb-muted"> (bạn)</span>}</span>,
    },
    { key: 'username', header: 'Tên đăng nhập', render: a => <Code>{a.username}</Code> },
    { key: 'role', header: 'Vai trò', width: 140, render: a => ROLE_LABEL[a.role] },
    {
      key: 'isActive', header: 'Trạng thái', width: 170,
      render: a => a.isActive
        ? <StatusBadge status="approved" label="Đang hoạt động" />
        : <StatusBadge status="hold" label="Ngừng hoạt động" icon="ban" />,
    },
    {
      key: 'actions', header: '', width: 210, align: 'right',
      render: a => (
        <div className="vb-row" style={{ justifyContent: 'flex-end', flexWrap: 'nowrap' }} onClick={e => e.stopPropagation()}>
          <Button variant="ghost" size="sm" onClick={() => setEditing(a)} aria-label={`Sửa tài khoản ${a.username}`}>Sửa</Button>
          {a.id !== user?.id && (a.isActive
            ? <Button variant="danger-outline" size="sm" onClick={() => setDeactivating(a)}>Ngừng hoạt động</Button>
            : <Button variant="secondary" size="sm" icon="lock-open" loading={setActive.isPending && setActive.variables?.id === a.id} onClick={() => toggle(a, true)}>Mở lại</Button>)}
        </div>
      ),
    },
  ];

  return (
    <div className="vb-stack">
      <FilterBar
        search={search} onSearchChange={setSearch} searchPlaceholder="Tìm theo họ tên, tên đăng nhập…"
        suggestions={suggestFrom(accounts.data, search, a => [a.fullName, a.username], a => ({ key: String(a.id), label: a.fullName, hint: a.username }))}
        onPickSuggestion={s => setSearch(s.label)}
        filters={[
          { key: 'role', label: 'Vai trò', value: role, options: ROLE_OPTIONS },
          { key: 'status', label: 'Trạng thái', value: status, options: STATUS_OPTIONS },
        ]}
        onFilterChange={(k, v) => (k === 'role' ? setRole : setStatus)(v)}
        chips={chips} onRemoveChip={k => (k === 'role' ? setRole : setStatus)('')}
        onClearAll={chips.length ? () => { setRole(''); setStatus(''); } : undefined}
        resultCount={accounts.data ? rows.length : undefined}
        actions={<Button icon="plus" onClick={() => setEditing('new')}>Thêm tài khoản</Button>}
      />
      {accounts.isPending ? <Loading /> : accounts.isError ? <ListError onRetry={() => accounts.refetch()} /> : (
        <DataTable
          columns={columns} rows={rows} onRowClick={a => setEditing(a)} maxHeight="calc(100dvh - 220px)" caption="Danh sách tài khoản"
          empty={<EmptyState icon="users" title="Không có tài khoản phù hợp" description="Thử từ khóa khác hoặc bỏ bớt bộ lọc." />}
        />
      )}

      {editing && <AccountDialog account={editing === 'new' ? null : editing} isSelf={editing !== 'new' && editing.id === user?.id} onClose={() => setEditing(null)} />}
      <ConfirmDialog
        open={!!deactivating} tone="danger"
        title={`Ngừng hoạt động tài khoản ${deactivating?.username}?`}
        description={deactivating ? `${deactivating.fullName}` : undefined}
        confirmLabel="Ngừng hoạt động"
        onConfirm={() => deactivating && toggle(deactivating, false)}
        onCancel={() => setDeactivating(null)}
      />
    </div>
  );
}

function AccountDialog({ account, isSelf, onClose }: { account: Account | null; isSelf: boolean; onClose: () => void }) {
  const save = useSaveAccount();
  const toast = useToast();
  const [f, setF] = useState({ fullName: account?.fullName ?? '', username: account?.username ?? '', password: '', role: (account?.role ?? '') as Role | '' });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const errors = fieldErrors(save.error);

  const submit = () => save.mutate({ id: account?.id ?? null, input: f }, {
    onSuccess: saved => {
      toast({ tone: 'success', title: account ? `Đã lưu tài khoản ${saved.username}` : `Đã tạo tài khoản ${saved.username}` });
      onClose();
    },
  });

  return (
    <FormDialog
      title={account ? `Sửa tài khoản ${account.username}` : 'Thêm tài khoản'}
      submitLabel={account ? 'Lưu thay đổi' : 'Tạo tài khoản'}
      busy={save.isPending} error={formError(save.error)} onSubmit={submit} onClose={onClose}
    >
      <TextField label="Họ tên" required autoFocus value={f.fullName} onChange={set('fullName')} error={errors.fullName} />
      <TextField
        label="Tên đăng nhập" required autoComplete="off" value={f.username} onChange={set('username')} error={errors.username}
        placeholder="nhanvien3" inputStyle={{ letterSpacing: 'var(--tracking-code)' }}
      />
      <TextField
        label={account ? 'Mật khẩu mới' : 'Mật khẩu'} required={!account} type="password" autoComplete="new-password"
        value={f.password} onChange={set('password')} error={errors.password}
        placeholder={account ? 'Để trống nếu không đổi' : undefined}
      />
      <SelectField
        label="Vai trò" required placeholder="Chọn vai trò" options={ROLE_OPTIONS} value={f.role} onChange={set('role')}
        disabled={isSelf} error={errors.role}
      />
    </FormDialog>
  );
}
