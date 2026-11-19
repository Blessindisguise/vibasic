import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, DataTable, EmptyState, SearchField, TextField, type DataTableColumn, type Suggestion } from '../../design';
import { fmt, fmtDate } from '../../app/format';
import { suggestFrom } from '../../app/suggest';
import { FormDialog, FieldGrid } from '../../app/Modal';
import { Segmented } from '../../app/Segmented';
import { useToast } from '../../app/toast';
import { Code, ListError, Loading } from '../../app/ui';
import { matches } from '../../app/text';
import { fieldErrors, formError } from '../../app/catalog';
import { ApprovalBadge, LotStatusBadge, PlanStatusBadge } from '../../app/statusBadges';
import {
  PLAN_SCOPE_LABEL, PLAN_TYPE_LABEL, useCreatePlan, useLots, usePlans, useStocktakes, useUpdatePlan,
  type PlanRow, type PlanScope, type PlanType, type PlanView, type StocktakeRow,
} from '../../app/stock';
import { planFields, STOCKTAKE_COLUMNS, stocktakeFields } from './columns';

type Tab = 'ke-hoach' | 'phieu';


/** Manager "Kiểm kê": plans (UC_13) and stocktakes to review (UC_15). */
export function StocktakeManagerPage() {
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as Tab) || 'ke-hoach';
  const [creating, setCreating] = useState(false);
  const plans = usePlans();
  const stocktakes = useStocktakes();
  const nav = useNavigate();
  const [search, setSearch] = useState('');
  const planRows = useMemo(() => (plans.data ?? []).filter(p => matches(search, ...planFields(p))), [plans.data, search]);
  const stocktakeRows = useMemo(() => (stocktakes.data ?? []).filter(s => matches(search, ...stocktakeFields(s))), [stocktakes.data, search]);
  const suggestions: Suggestion<unknown>[] = tab === 'ke-hoach'
    ? suggestFrom(plans.data, search, planFields, p => ({
      key: String(p.id), label: p.code, hint: [PLAN_TYPE_LABEL[p.planType], `dự kiến ${fmtDate(p.plannedDate)}`, p.note].filter(Boolean).join(' · '),
      meta: <PlanStatusBadge status={p.status} />,
    }))
    : suggestFrom(stocktakes.data, search, stocktakeFields, s => ({
      key: String(s.id), label: s.code, hint: `Kế hoạch ${s.planCode} · ${s.creatorName}`, meta: <ApprovalBadge status={s.status} />,
    }));
  const open = (v: unknown) => nav(tab === 'ke-hoach' ? `/ql/kiem-ke/${(v as PlanRow).id}` : `/ql/kiem-ke/phieu/${(v as StocktakeRow).id}`);
  const notFound = <EmptyState icon="search" title="Không tìm thấy" description="Thử từ khóa khác." />;

  const planColumns: DataTableColumn<PlanRow>[] = [
    {
      key: 'code', header: 'Kế hoạch',
      render: p => <span style={{ display: 'flex', flexDirection: 'column' }}><Code>{p.code}</Code>{p.note && <span className="vb-muted" style={{ whiteSpace: 'normal' }}>{p.note}</span>}</span>,
    },
    { key: 'plannedDate', header: 'Ngày dự kiến', width: 120, render: p => fmtDate(p.plannedDate) },
    { key: 'planType', header: 'Loại', width: 100, render: p => PLAN_TYPE_LABEL[p.planType] },
    { key: 'scope', header: 'Phạm vi', width: 140, render: p => p.scopeType === 'warehouse' ? 'Toàn bộ kho' : `${p.selectedLots} lô` },
    { key: 'creatorName', header: 'Người lập', width: 140 },
    {
      key: 'last', header: 'Phiếu kiểm kê', width: 200,
      render: p => p.lastStocktakeCode
        ? <span className="vb-row" style={{ gap: 6, flexWrap: 'nowrap' }}><Code>{p.lastStocktakeCode}</Code>{p.lastStocktakeStatus && <ApprovalBadge status={p.lastStocktakeStatus} />}</span>
        : <span className="vb-muted">Chưa kiểm</span>,
    },
    { key: 'status', header: 'Trạng thái', width: 140, render: p => <PlanStatusBadge status={p.status} /> },
  ];

  return (
    <div className="vb-stack">
      <div className="vb-row" style={{ gap: 12 }}>
        <Segmented<Tab>
          label="Kiểm kê" value={tab} onChange={t => { setParams({ tab: t }, { replace: true }); setSearch(''); }}
          options={[
            { value: 'ke-hoach', label: 'Kế hoạch kiểm kê', count: plans.data?.filter(p => p.status !== 'done').length },
            { value: 'phieu', label: 'Phiếu kiểm kê', count: stocktakes.data?.filter(s => s.status === 'pending').length },
          ]}
        />
        <SearchField
          placeholder={tab === 'ke-hoach' ? 'Mã kế hoạch, loại, người lập, phiếu kiểm kê…' : 'Mã phiếu, kế hoạch, người kiểm, người duyệt…'} value={search} onChange={setSearch}
          style={{ width: 280 }} aria-label={tab === 'ke-hoach' ? 'Tìm kế hoạch kiểm kê' : 'Tìm phiếu kiểm kê'}
          suggestions={suggestions} onPickSuggestion={s => s.value && open(s.value)}
        />
        <Button icon="plus" style={{ marginLeft: 'auto' }} onClick={() => setCreating(true)}>Lập kế hoạch kiểm kê</Button>
      </div>
      {tab === 'ke-hoach' && (plans.isPending ? <Loading /> : plans.isError ? <ListError onRetry={() => plans.refetch()} /> : (
        <DataTable
          columns={planColumns} rows={planRows} caption="Kế hoạch kiểm kê"
          onRowClick={p => nav(`/ql/kiem-ke/${p.id}`)}
          empty={search ? notFound : <EmptyState icon="list-checks" title="Chưa có kế hoạch kiểm kê"
            action={<Button variant="secondary" icon="plus" onClick={() => setCreating(true)}>Lập kế hoạch kiểm kê</Button>} />}
        />
      ))}
      {tab === 'phieu' && (stocktakes.isPending ? <Loading /> : stocktakes.isError ? <ListError onRetry={() => stocktakes.refetch()} /> : (
        <DataTable
          columns={STOCKTAKE_COLUMNS} rows={stocktakeRows} onRowClick={s => nav(`/ql/kiem-ke/phieu/${s.id}`)} caption="Phiếu kiểm kê"
          empty={search ? notFound : <EmptyState icon="list-checks" title="Chưa có phiếu kiểm kê" />}
        />
      ))}
      {creating && <PlanDialog onClose={() => setCreating(false)} />}
    </div>
  );
}

/**
 * UC_13: plan type, planned date (not before today), scope; pick lots when the scope is "Một số lô".
 * With `plan`, edits that plan instead (it may keep its date and lots that ran out since).
 */
export function PlanDialog({ plan, onClose }: { plan?: PlanView; onClose: () => void }) {
  const create = useCreatePlan();
  const update = useUpdatePlan(plan?.plan.id ?? 0);
  const save = plan ? update : create;
  const toast = useToast();
  const lots = useLots();
  const today = new Date(Date.now() + 7 * 3_600_000).toISOString().slice(0, 10);
  const p = plan?.plan;
  const [planType, setPlanType] = useState<PlanType | ''>(p?.planType ?? 'periodic');
  const [scopeType, setScopeType] = useState<PlanScope | ''>(p?.scopeType ?? 'warehouse');
  const [plannedDate, setPlannedDate] = useState(p?.plannedDate ?? today);
  const [note, setNote] = useState(p?.note ?? '');
  const [selected, setSelected] = useState<Array<string | number>>(p?.scopeType === 'selectedLots' ? plan!.lots.map(l => l.id) : []);
  const [search, setSearch] = useState('');
  const errors = fieldErrors(save.error);
  // Lots of the edited plan stay pickable even if they have run out since it was made.
  const all = useMemo(() => {
    const list = lots.data ?? [];
    const kept = p?.scopeType === 'selectedLots' ? plan!.lots.filter(l => !list.some(x => x.id === l.id)) : [];
    return [...kept, ...list];
  }, [lots.data, plan, p?.scopeType]);
  const rows = useMemo(() => all.filter(l => matches(search, l.lotCode, l.sku, l.productName)), [all, search]);
  // Picking a suggested lot ticks it and clears the filter, so lots can be added one after another by typing a few characters.
  const suggestions = suggestFrom(all, search, l => [l.lotCode, l.sku, l.productName], l => ({
    key: String(l.id), label: l.lotCode, hint: `${l.sku} · ${l.productName}`,
    meta: selected.includes(l.id) ? <span style={{ color: 'var(--green-700)', fontWeight: 600 }}>Đã chọn</span> : <span>Tồn {fmt(l.quantityOnHand)} {l.unit}</span>,
  }));
  const pickLot = (id: number) => { setSelected(s => (s.includes(id) ? s : [...s, id])); setSearch(''); };

  const input = { planType, scopeType, plannedDate, note, lotIds: scopeType === 'selectedLots' ? selected.map(Number) : [] };
  const submit = () => plan
    ? update.mutate(input, {
      onSuccess: v => { toast({ tone: 'success', title: `Đã lưu kế hoạch ${v.plan.code}` }); onClose(); },
    })
    : create.mutate(input, {
      onSuccess: v => { toast({ tone: 'success', title: `Đã lập kế hoạch ${v.code}` }); onClose(); },
    });

  return (
    <FormDialog title={p ? `Sửa kế hoạch ${p.code}` : 'Lập kế hoạch kiểm kê'} submitLabel={p ? 'Lưu thay đổi' : 'Lưu kế hoạch'}
      busy={save.isPending} error={formError(save.error)} onSubmit={submit} onClose={onClose} width={scopeType === 'selectedLots' ? 860 : 560}>
      <FieldGrid>
        <div className="vb-field">
          <span className="vb-field__label">Loại kế hoạch<span className="req" aria-hidden="true">*</span></span>
          <Segmented<PlanType | ''> label="Loại kế hoạch" value={planType} onChange={setPlanType}
            options={(['periodic', 'adHoc'] as const).map(v => ({ value: v, label: PLAN_TYPE_LABEL[v] }))} />
          {errors.planType && <div className="vb-field__help vb-field__help--error">{errors.planType}</div>}
        </div>
        <div className="vb-field">
          <span className="vb-field__label">Phạm vi<span className="req" aria-hidden="true">*</span></span>
          <Segmented<PlanScope | ''> label="Phạm vi" value={scopeType} onChange={setScopeType}
            options={(['warehouse', 'selectedLots'] as const).map(v => ({ value: v, label: PLAN_SCOPE_LABEL[v] }))} />
        </div>
      </FieldGrid>
      <FieldGrid>
        <TextField label="Ngày dự kiến thực hiện" required type="date" min={p && p.plannedDate < today ? p.plannedDate : today}
          value={plannedDate} onChange={e => setPlannedDate(e.target.value)} error={errors.plannedDate} />
        <TextField label="Ghi chú" value={note} onChange={e => setNote(e.target.value)} error={errors.note} placeholder="Ví dụ: kiểm cuối tháng 11" />
      </FieldGrid>
      {scopeType === 'selectedLots' && (
        <div className="vb-field">
          <div className="vb-row" style={{ justifyContent: 'space-between' }}>
            <span className="vb-field__label">Lô cần kiểm kê<span className="req" aria-hidden="true">*</span> <span className="vb-muted">({selected.length} đã chọn)</span></span>
            <SearchField
              placeholder="Lọc theo mã lô, SKU, tên" value={search} onChange={setSearch} style={{ width: 260 }} aria-label="Lọc lô" align="end"
              suggestions={suggestions} onPickSuggestion={s => s.value && pickLot((s.value as { id: number }).id)}
            />
          </div>
          {errors.lotIds && <div className="vb-field__help vb-field__help--error">{errors.lotIds}</div>}
          <DataTable
            selectable selected={selected} onSelectedChange={setSelected} rows={rows} maxHeight={300} caption="Chọn lô"
            columns={[
              { key: 'lotCode', header: 'Mã lô', width: 120, render: l => <Code>{l.lotCode}</Code> },
              { key: 'product', header: 'Mặt hàng', render: l => <span><Code>{l.sku}</Code> {l.productName}</span> },
              { key: 'receivedDate', header: 'Ngày nhập', width: 100, render: l => fmtDate(l.receivedDate) },
              { key: 'onHand', header: 'Tồn', numeric: true, width: 70, render: l => fmt(l.quantityOnHand) },
              { key: 'status', header: 'Trạng thái', width: 130, render: l => <LotStatusBadge status={l.status} /> },
            ]}
          />
        </div>
      )}
    </FormDialog>
  );
}
