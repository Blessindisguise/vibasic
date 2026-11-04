import { useNavigate } from 'react-router-dom';
import { AlertBanner, DataTable, EmptyState, Icon, type DataTableColumn } from '../../../design';
import { fmt, fmtDate, fmtShort } from '../../../app/format';
import { Code, ListError, Loading } from '../../../app/ui';
import { ApprovalBadge, PlanStatusBadge } from '../../../app/statusBadges';
import { PLAN_TYPE_LABEL, usePlans, useStocktakes, type StocktakeRow } from '../../../app/stock';

/** UC_14 step 1: plans waiting to be counted (1.1: none → wait for the manager), and the staff's past counts. */
export function StaffStocktakeHome() {
  const plans = usePlans();
  const stocktakes = useStocktakes();
  const nav = useNavigate();
  const waiting = (plans.data ?? []).filter(p => p.status === 'waiting');

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
      <h2 style={{ margin: 0, font: 'var(--type-touch-heading)' }}>Kế hoạch cần kiểm</h2>
      {plans.isPending ? <Loading /> : plans.isError ? <ListError onRetry={() => plans.refetch()} /> : waiting.length === 0 ? (
        <div className="vb-panel"><EmptyState size="lg" icon="list-checks" title="Chưa có kế hoạch kiểm kê chờ thực hiện" description="Quản lý lập kế hoạch; bạn sẽ nhận thông báo khi có kế hoạch mới." /></div>
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
                <AlertBanner tone="danger" title={`Phiếu ${p.lastStocktakeCode} bị từ chối`}>{p.lastRejectReason}. Kiểm đếm lại.</AlertBanner>
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
        <DataTable columns={columns} rows={stocktakes.data} density="default" onRowClick={s => nav(`/kho/kiem-ke/phieu/${s.id}`)} caption="Phiếu kiểm kê đã gửi"
          empty={<EmptyState icon="list-checks" title="Chưa có phiếu kiểm kê" />} />
      )}
    </div>
  );
}
