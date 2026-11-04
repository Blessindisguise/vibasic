import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, DataTable, EmptyState, TextField, type DataTableColumn } from '../../design';
import { fmt, fmtDate, fmtShort } from '../../app/format';
import { FormDialog, FieldGrid } from '../../app/Modal';
import { Segmented } from '../../app/Segmented';
import { useToast } from '../../app/toast';
import { Code, ListError, Loading } from '../../app/ui';
import { matches } from '../../app/text';
import { fieldErrors, formError } from '../../app/catalog';
import { ApprovalBadge, LotStatusBadge, PlanStatusBadge } from '../../app/statusBadges';
import {
  PLAN_SCOPE_LABEL, PLAN_TYPE_LABEL, useCreatePlan, useLots, usePlans, useStocktakes,
  type PlanRow, type PlanScope, type PlanType, type StocktakeRow,
} from '../../app/stock';

type Tab = 'ke-hoach' | 'phieu';

/** Manager "Kiểm kê": plans (UC_13) and stocktakes to review (UC_15). */
export function StocktakeManagerPage() {
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as Tab) || 'ke-hoach';
  const [creating, setCreating] = useState(false);
  const plans = usePlans();
  const stocktakes = useStocktakes();
  const nav = useNavigate();

  const planColumns: DataTableColumn<PlanRow>[] = [
    { key: 'code', header: 'Kế hoạch', width: 130, render: p => <Code>{p.code}</Code> },
    { key: 'plannedDate', header: 'Ngày dự kiến', width: 120, render: p => fmtDate(p.plannedDate) },
    { key: 'planType', header: 'Loại', width: 100, render: p => PLAN_TYPE_LABEL[p.planType] },
    { key: 'scope', header: 'Phạm vi', width: 140, render: p => p.scopeType === 'warehouse' ? 'Toàn bộ kho' : `${p.selectedLots} lô` },
    { key: 'note', header: 'Ghi chú', render: p => p.note ?? <span className="vb-muted">—</span> },
    { key: 'creatorName', header: 'Người lập', width: 140 },
    {
      key: 'last', header: 'Phiếu kiểm kê', width: 200,
      render: p => p.lastStocktakeCode
        ? <span className="vb-row" style={{ gap: 6, flexWrap: 'nowrap' }}><Code>{p.lastStocktakeCode}</Code>{p.lastStocktakeStatus && <ApprovalBadge status={p.lastStocktakeStatus} />}</span>
        : <span className="vb-muted">Chưa kiểm</span>,
    },
    { key: 'status', header: 'Trạng thái', width: 140, render: p => <PlanStatusBadge status={p.status} /> },
  ];

  const stocktakeColumns: DataTableColumn<StocktakeRow>[] = [
    { key: 'code', header: 'Phiếu kiểm kê', width: 130, render: s => <Code>{s.code}</Code> },
    { key: 'stocktakeDate', header: 'Ngày kiểm', width: 120, render: s => fmtShort(s.stocktakeDate) },
    { key: 'plan', header: 'Kế hoạch', width: 130, render: s => <Code>{s.planCode}</Code> },
    { key: 'creatorName', header: 'Người kiểm', width: 150 },
    { key: 'lots', header: 'Lô', numeric: true, width: 60, render: s => fmt(s.lotCount) },
    {
      key: 'diff', header: 'Chênh lệch',
      render: s => s.diffLots === 0 ? <span className="vb-muted">Khớp hệ thống</span> : <span>{s.diffLots} lô · thiếu {fmt(s.shortage)} · thừa {fmt(s.surplus)}</span>,
    },
    { key: 'approverName', header: 'Người duyệt', width: 140, render: s => s.approverName ?? <span className="vb-muted">—</span> },
    { key: 'status', header: 'Trạng thái', width: 120, render: s => <ApprovalBadge status={s.status} /> },
  ];

  return (
    <div className="vb-stack">
      <div className="vb-row" style={{ justifyContent: 'space-between' }}>
        <Segmented<Tab>
          label="Kiểm kê" value={tab} onChange={t => setParams({ tab: t }, { replace: true })}
          options={[
            { value: 'ke-hoach', label: 'Kế hoạch kiểm kê', count: plans.data?.filter(p => p.status !== 'done').length },
            { value: 'phieu', label: 'Phiếu kiểm kê', count: stocktakes.data?.filter(s => s.status === 'pending').length },
          ]}
        />
        <Button icon="plus" onClick={() => setCreating(true)}>Lập kế hoạch kiểm kê</Button>
      </div>
      {tab === 'ke-hoach' && (plans.isPending ? <Loading /> : plans.isError ? <ListError onRetry={() => plans.refetch()} /> : (
        <DataTable
          columns={planColumns} rows={plans.data} caption="Kế hoạch kiểm kê"
          onRowClick={p => p.lastStocktakeId && nav(`/ql/kiem-ke/phieu/${p.lastStocktakeId}`)}
          empty={<EmptyState icon="list-checks" title="Chưa có kế hoạch kiểm kê" description="Lập kế hoạch định kỳ hoặc chỉ định cho toàn kho hay một số lô."
            action={<Button variant="secondary" icon="plus" onClick={() => setCreating(true)}>Lập kế hoạch kiểm kê</Button>} />}
        />
      ))}
      {tab === 'phieu' && (stocktakes.isPending ? <Loading /> : stocktakes.isError ? <ListError onRetry={() => stocktakes.refetch()} /> : (
        <DataTable
          columns={stocktakeColumns} rows={stocktakes.data} onRowClick={s => nav(`/ql/kiem-ke/phieu/${s.id}`)} caption="Phiếu kiểm kê"
          empty={<EmptyState icon="list-checks" title="Chưa có phiếu kiểm kê" description="Phiếu do nhân viên gửi sau khi kiểm đếm sẽ hiện ở đây." />}
        />
      ))}
      {creating && <PlanDialog onClose={() => setCreating(false)} />}
    </div>
  );
}

/** UC_13: plan type, planned date (not before today), scope; pick lots when the scope is "Một số lô". */
function PlanDialog({ onClose }: { onClose: () => void }) {
  const create = useCreatePlan();
  const toast = useToast();
  const lots = useLots();
  const today = new Date(Date.now() + 7 * 3_600_000).toISOString().slice(0, 10);
  const [planType, setPlanType] = useState<PlanType | ''>('periodic');
  const [scopeType, setScopeType] = useState<PlanScope | ''>('warehouse');
  const [plannedDate, setPlannedDate] = useState(today);
  const [note, setNote] = useState('');
  const [selected, setSelected] = useState<Array<string | number>>([]);
  const [search, setSearch] = useState('');
  const errors = fieldErrors(create.error);
  const rows = useMemo(() => (lots.data ?? []).filter(l => matches(search, l.lotCode, l.sku, l.productName)), [lots.data, search]);

  const submit = () => create.mutate({ planType, scopeType, plannedDate, note, lotIds: scopeType === 'selectedLots' ? selected.map(Number) : [] }, {
    onSuccess: p => { toast({ tone: 'success', title: `Đã lập kế hoạch ${p.code}`, message: 'Nhân viên kho nhận được thông báo.' }); onClose(); },
  });

  return (
    <FormDialog title="Lập kế hoạch kiểm kê" submitLabel="Lưu kế hoạch" busy={create.isPending} error={formError(create.error)}
      onSubmit={submit} onClose={onClose} width={scopeType === 'selectedLots' ? 860 : 560}>
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
        <TextField label="Ngày dự kiến thực hiện" required type="date" min={today} value={plannedDate} onChange={e => setPlannedDate(e.target.value)} error={errors.plannedDate} />
        <TextField label="Ghi chú" value={note} onChange={e => setNote(e.target.value)} error={errors.note} placeholder="Ví dụ: kiểm cuối tháng 11" />
      </FieldGrid>
      {scopeType === 'selectedLots' && (
        <div className="vb-field">
          <div className="vb-row" style={{ justifyContent: 'space-between' }}>
            <span className="vb-field__label">Lô cần kiểm kê<span className="req" aria-hidden="true">*</span> <span className="vb-muted">({selected.length} đã chọn)</span></span>
            <TextField icon="search" placeholder="Lọc theo mã lô, SKU, tên" value={search} onChange={e => setSearch(e.target.value)} style={{ width: 260 }} aria-label="Lọc lô" />
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
      {scopeType === 'warehouse' && <div className="vb-muted">Nhân viên kiểm mọi lô đang có hàng tại thời điểm kiểm, kể cả lô tạm cách ly và đã khóa.</div>}
    </FormDialog>
  );
}
