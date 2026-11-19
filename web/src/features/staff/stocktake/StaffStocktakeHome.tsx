import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertBanner, DataTable, EmptyState, Icon, SearchField, type DataTableColumn, type Suggestion } from '../../../design';
import { ANY_DATE, fmt, fmtDate, fmtShort, inVnDateRange, type DateRange } from '../../../app/format';
import { Code, DateRangeFilter, ListError, Loading, NoneInRange } from '../../../app/ui';
import { ApprovalBadge, PlanStatusBadge } from '../../../app/statusBadges';
import { matches } from '../../../app/text';
import { suggestFrom } from '../../../app/suggest';
import { PLAN_TYPE_LABEL, usePlans, useStocktakes, type PlanRow, type StocktakeRow } from '../../../app/stock';
import { planFields, stocktakeFields } from '../../stocktake/columns';

/** UC_14 step 1: plans waiting to be counted (1.1: none → wait for the manager), and the staff's past counts. */
export function StaffStocktakeHome() {
  const plans = usePlans();
  const stocktakes = useStocktakes();
  const nav = useNavigate();
  const [search, setSearch] = useState('');
  const [range, setRange] = useState<DateRange>(ANY_DATE);
  const ranged = !!(range.from || range.to);
  const inRange = (iso?: string) => inVnDateRange(iso, range.from, range.to);
  const open = (plans.data ?? []).filter(p => p.status === 'waiting');
  const waiting = open.filter(p => matches(search, ...planFields(p)) && inRange(p.plannedDate));
  const sent = (stocktakes.data ?? []).filter(s => matches(search, ...stocktakeFields(s)) && inRange(s.stocktakeDate));
  const suggestions: Suggestion<unknown>[] = [
    ...suggestFrom(open, search, planFields, p => ({ key: `p${p.id}`, label: p.code, hint: `Kế hoạch cần kiểm · dự kiến ${fmtDate(p.plannedDate)}` }), 4),
    ...suggestFrom(stocktakes.data, search, stocktakeFields, s => ({ key: `s${s.id}`, label: s.code, hint: `Phiếu đã gửi · kế hoạch ${s.planCode}`, meta: <ApprovalBadge status={s.status} /> }), 4),
  ];
  const pick = (v: unknown) => nav('planCode' in (v as object) ? `/kho/kiem-ke/phieu/${(v as StocktakeRow).id}` : `/kho/kiem-ke/${(v as PlanRow).id}`);

  const columns: DataTableColumn<StocktakeRow>[] = [
    { key: 'code', header: 'Phiếu kiểm kê', width: 140, render: s => <Code>{s.code}</Code> },
    { key: 'stocktakeDate', header: 'Ngày kiểm', width: 130, render: s => fmtShort(s.stocktakeDate) },
    { key: 'plan', header: 'Kế hoạch', width: 130, render: s => <Code>{s.planCode}</Code> },
    { key: 'creatorName', header: 'Người kiểm' },
    { key: 'diff', header: 'Chênh lệch', render: s => s.diffLots === 0 ? 'Khớp' : `${s.diffLots} lô` },
    { key: 'status', header: 'Trạng thái', width: 130, render: s => <ApprovalBadge status={s.status} /> },
  ];

  return (
    <div className="vb-stack">
      <SearchField
        size="lg" placeholder="Mã kế hoạch, phiếu kiểm kê, người lập…" value={search} onChange={setSearch} style={{ width: 360, maxWidth: '100%' }}
        aria-label="Tìm kế hoạch, phiếu kiểm kê" suggestions={suggestions} onPickSuggestion={s => s.value && pick(s.value)}
      />
      <DateRangeFilter size="lg" label="Ngày dự kiến / ngày kiểm" value={range} onChange={setRange} />
      <h2 style={{ margin: 0, font: 'var(--type-touch-heading)' }}>Kế hoạch cần kiểm</h2>
      {plans.isPending ? <Loading /> : plans.isError ? <ListError onRetry={() => plans.refetch()} /> : waiting.length === 0 && search && open.length > 0 ? (
        <div className="vb-panel"><EmptyState icon="search" title="Không có kế hoạch phù hợp" description="Thử từ khóa khác." /></div>
      ) : waiting.length === 0 && ranged && open.length > 0 ? (
        <div className="vb-panel"><NoneInRange what="kế hoạch cần kiểm" onClear={() => setRange(ANY_DATE)} /></div>
      ) : waiting.length === 0 ? (
        <div className="vb-panel"><EmptyState size="lg" icon="list-checks" title="Chưa có kế hoạch kiểm kê chờ thực hiện" /></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
          {waiting.map(p => (
            <button key={p.id} type="button" className="vb-panel vb-card-button" onClick={() => nav(`/kho/kiem-ke/${p.id}`)}>
              <div className="vb-row" style={{ justifyContent: 'space-between' }}><Code>{p.code}</Code><PlanStatusBadge status={p.status} /></div>
              <div style={{ font: 'var(--type-touch-body)', fontWeight: 600 }}>
                {PLAN_TYPE_LABEL[p.planType]} · {p.scopeType === 'warehouse' ? 'toàn bộ kho' : `${fmt(p.selectedLots)} lô`}
              </div>
              <div className="vb-muted" style={{ fontSize: 14 }}><Icon name="calendar" size={14} style={{ verticalAlign: -2 }} /> Ngày dự kiến {fmtDate(p.plannedDate)} · lập bởi {p.creatorName}</div>
              {p.note && <div style={{ fontSize: 14 }}>{p.note}</div>}
              {p.lastStocktakeStatus === 'rejected' && (
                <AlertBanner tone="danger" title={`Phiếu ${p.lastStocktakeCode} bị từ chối`}>Lý do: {p.lastRejectReason}</AlertBanner>
              )}
              <span className="vb-btn vb-btn--primary vb-btn--lg" aria-hidden="true" style={{ alignSelf: 'flex-start' }}>
                <Icon name="list-checks" size={18} />Bắt đầu kiểm đếm
              </span>
            </button>
          ))}
        </div>
      )}

      <h2 style={{ margin: '8px 0 0', font: 'var(--type-touch-heading)' }}>Phiếu kiểm kê đã gửi</h2>
      {stocktakes.isPending ? <Loading /> : stocktakes.isError ? <ListError onRetry={() => stocktakes.refetch()} /> : (
        <DataTable columns={columns} rows={sent} density="default" onRowClick={s => nav(`/kho/kiem-ke/phieu/${s.id}`)} caption="Phiếu kiểm kê đã gửi"
          empty={search ? <EmptyState icon="search" title="Không có phiếu phù hợp" />
            : ranged ? <NoneInRange what="phiếu kiểm kê" onClear={() => setRange(ANY_DATE)} /> : <EmptyState icon="list-checks" title="Chưa có phiếu kiểm kê" />} />
      )}
    </div>
  );
}
