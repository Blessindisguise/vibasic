import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertBanner, Button, DataTable, EmptyState, Icon, type DataTableColumn } from '../../design';
import { ApiError } from '../../app/api';
import { fmt, fmtDate } from '../../app/format';
import { Code, Fact, Facts, ListError, Loading, NO_MATCH, PanelSearch } from '../../app/ui';
import { matches } from '../../app/text';
import { LotStatusBadge, PlanStatusBadge } from '../../app/statusBadges';
import { PLAN_SCOPE_LABEL, PLAN_TYPE_LABEL, usePlanDetail, type LotRow } from '../../app/stock';
import { PlanDialog } from './StocktakeManagerPage';
import { STOCKTAKE_COLUMNS } from './columns';

/** UC_13 for the manager: what a plan covers, the counts submitted for it, and editing while it waits to be counted. */
export function PlanDetail({ id, back }: { id: number; back: string }) {
  const view = usePlanDetail(id);
  const nav = useNavigate();
  const [editing, setEditing] = useState(false);
  const [search, setSearch] = useState('');

  if (view.isPending) return <Loading />;
  if (view.error instanceof ApiError && view.error.status === 404) {
    return <div className="vb-panel"><EmptyState icon="search" title="Không tìm thấy kế hoạch kiểm kê" action={<Button variant="secondary" onClick={() => nav(back)}>Quay lại</Button>} /></div>;
  }
  if (view.isError) return <ListError onRetry={() => view.refetch()} />;
  const { plan: p, lots, stocktakes, editable } = view.data;
  const onHand = lots.reduce((s, l) => s + l.quantityOnHand, 0);
  const pending = stocktakes.find(s => s.status === 'pending');

  const lotColumns: DataTableColumn<LotRow>[] = [
    { key: 'lotCode', header: 'Mã lô', width: 130, render: l => <Code>{l.lotCode}</Code> },
    { key: 'product', header: 'Mặt hàng', render: l => <span><Code>{l.sku}</Code> {l.productName}</span> },
    { key: 'receivedDate', header: 'Ngày nhập', width: 110, render: l => fmtDate(l.receivedDate) },
    { key: 'receipt', header: 'Phiếu nhập', width: 130, render: l => <Code>{l.receiptCode}</Code> },
    { key: 'onHand', header: 'Tồn', numeric: true, width: 90, render: l => `${fmt(l.quantityOnHand)} ${l.unit}` },
    { key: 'reserved', header: 'Giữ chỗ', numeric: true, width: 90, render: l => l.reserved ? fmt(l.reserved) : <span className="vb-muted">0</span> },
    { key: 'status', header: 'Trạng thái lô', width: 140, render: l => <LotStatusBadge status={l.status} /> },
  ];

  return (
    <div className="vb-stack">
      <div className="vb-row">
        <Button variant="ghost" icon="chevron-left" onClick={() => nav(back)}>Kế hoạch kiểm kê</Button>
      </div>

      <section className="vb-panel">
        <div className="vb-panel__head" style={{ flexWrap: 'wrap', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <div className="vb-row" style={{ gap: 10 }}>
              <h2 className="vb-panel__title" style={{ fontSize: 18, letterSpacing: 'var(--tracking-code)' }}>{p.code}</h2>
              <PlanStatusBadge status={p.status} />
            </div>
            <div className="vb-muted" style={{ marginTop: 2 }}>Lập bởi {p.creatorName}</div>
          </div>
          {editable
            ? <Button variant="secondary" icon="square-pen" onClick={() => setEditing(true)}>Sửa kế hoạch</Button>
            : (
              <span className="vb-muted vb-row" style={{ gap: 6, fontSize: 13, flexWrap: 'nowrap', maxWidth: 380 }}>
                <Icon name="lock" size={16} />
                <span>Không sửa được</span>
              </span>
            )}
        </div>
        <div className="vb-panel__body vb-stack" style={{ gap: 16 }}>
          <Facts>
            <Fact label="Loại kế hoạch" value={PLAN_TYPE_LABEL[p.planType]} />
            <Fact label="Phạm vi" value={p.scopeType === 'warehouse' ? PLAN_SCOPE_LABEL.warehouse : `${fmt(p.selectedLots)} lô`} />
            <Fact label="Ngày dự kiến" value={<b>{fmtDate(p.plannedDate)}</b>} />
            <Fact label={p.scopeType === 'warehouse' ? 'Tồn hiện tại trong kho' : 'Tồn hiện tại của các lô'} value={`${fmt(onHand)} sản phẩm · ${fmt(lots.length)} lô`} />
            <Fact label="Ghi chú" value={p.note ?? <span className="vb-muted">—</span>} />
          </Facts>
          {pending && (
            <AlertBanner tone="info" title={`Phiếu ${pending.code} chờ duyệt`}>
              {pending.creatorName} đã gửi kết quả đếm.{' '}
              <Button variant="ghost" size="sm" onClick={() => nav(`/ql/kiem-ke/phieu/${pending.id}`)}>Xem và duyệt</Button>
            </AlertBanner>
          )}
          {!pending && p.lastStocktakeStatus === 'rejected' && (
            <AlertBanner tone="warning" title={`Phiếu ${p.lastStocktakeCode} đã bị từ chối`}>
              Lý do: {p.lastRejectReason}
            </AlertBanner>
          )}
        </div>
      </section>

      <section className="vb-panel">
        <div className="vb-panel__head">
          <h3 className="vb-panel__title">{p.scopeType === 'warehouse' ? 'Các lô đang có hàng' : 'Lô cần kiểm kê'} <span className="vb-muted">({fmt(lots.length)})</span></h3>
          <PanelSearch value={search} onChange={setSearch} placeholder="Mã lô, SKU, tên hàng…" label="Lọc lô trong kế hoạch" />
        </div>
        <DataTable
          columns={lotColumns} rows={lots.filter(l => matches(search, l.lotCode, l.sku, l.productName, l.receiptCode))} maxHeight={420} caption="Lô trong kế hoạch" onRowClick={l => nav(`/ql/lo-hang/${l.id}`)}
          empty={search ? NO_MATCH : <EmptyState icon="layers" title="Không có lô nào" />}
        />
      </section>

      <section className="vb-panel">
        <div className="vb-panel__head"><h3 className="vb-panel__title">Phiếu kiểm kê <span className="vb-muted">({stocktakes.length})</span></h3></div>
        <DataTable
          columns={STOCKTAKE_COLUMNS.filter(c => c.key !== 'plan')} rows={stocktakes} caption="Phiếu kiểm kê của kế hoạch"
          onRowClick={s => nav(`/ql/kiem-ke/phieu/${s.id}`)}
          empty={<EmptyState icon="list-checks" title="Chưa có phiếu kiểm kê" />}
        />
      </section>

      {editing && <PlanDialog plan={view.data} onClose={() => setEditing(false)} />}
    </div>
  );
}
