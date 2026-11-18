import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, DataTable, EmptyState, FilterBar, Icon, type DataTableColumn } from '../../design';
import { fmt, fmtShort } from '../../app/format';
import { Segmented } from '../../app/Segmented';
import { Code, ListError, Loading } from '../../app/ui';
import { matches } from '../../app/text';
import { IssueStatusBadge, OrderStatusBadge } from '../../app/statusBadges';
import { useOrders, type OrderRow } from '../../app/issuing';
import { CancelOrderDialog } from './CancelOrderDialog';

type View = 'open' | 'cancelled';
/** Not delivered yet: may still be cancelled. */
const isOpenOrder = (o: OrderRow) => o.status === 'open' || o.status === 'onHold' || o.status === 'inProgress';

/** Quản lý: orders from the sales system not delivered yet, and the cancelled ones. The customer cancelled: cancel the order here. */
export function OrderListPage({ basePath }: { basePath: string }) {
  const orders = useOrders();
  const nav = useNavigate();
  const [view, setView] = useState<View>('open');
  const [search, setSearch] = useState('');
  const [cancelling, setCancelling] = useState<OrderRow | null>(null);
  const all = orders.data ?? [];
  const rows = all.filter(o => (view === 'open' ? isOpenOrder(o) : o.status === 'cancelled') && matches(search, o.externalCode, o.customerName ?? ''));

  const columns: DataTableColumn<OrderRow>[] = [
    { key: 'code', header: 'Đơn hàng', width: 130, render: o => <Code>{o.externalCode}</Code> },
    { key: 'date', header: 'Đặt lúc', width: 110, render: o => fmtShort(o.orderDate) },
    { key: 'customer', header: 'Khách hàng', render: o => o.customerName ?? <span className="vb-muted">Khách lẻ</span> },
    { key: 'qty', header: 'Số lượng', numeric: true, width: 90, render: o => fmt(o.totalQuantity) },
    { key: 'status', header: 'Trạng thái', width: 130, render: o => <OrderStatusBadge status={o.status} /> },
    ...(view === 'open' ? [
      {
        key: 'stock', header: 'Tồn trống', width: 110,
        render: (o: OrderRow) => (o.status === 'inProgress' ? <span className="vb-muted">—</span> : o.sufficient
          ? <span style={{ color: 'var(--green-700)' }}><Icon name="circle-check" size={14} style={{ verticalAlign: -2 }} /> Đủ hàng</span>
          : <span style={{ color: 'var(--red-700)' }}>Thiếu hàng</span>),
      },
      {
        key: 'issue', header: 'Phiếu xuất', width: 190,
        render: (o: OrderRow) => (o.lastIssueId && o.lastIssueCode ? (
          <span className="vb-row" style={{ gap: 6 }}>
            <Button size="sm" variant="ghost" onClick={e => { e.stopPropagation(); nav(`${basePath}/${o.lastIssueId}`); }}>{o.lastIssueCode}</Button>
            {o.lastIssueStatus && <IssueStatusBadge status={o.lastIssueStatus} />}
          </span>
        ) : <span className="vb-muted">—</span>),
      },
      {
        key: 'cancel', header: '', width: 100, align: 'right' as const,
        render: (o: OrderRow) => <Button size="sm" variant="danger-outline" onClick={e => { e.stopPropagation(); setCancelling(o); }}>Hủy đơn</Button>,
      },
    ] : [
      { key: 'cancelledAt', header: 'Hủy lúc', width: 110, render: (o: OrderRow) => fmtShort(o.cancelledAt) },
      { key: 'reason', header: 'Lý do hủy', width: 280, render: (o: OrderRow) => <span style={{ whiteSpace: 'normal' }}>{o.cancelReason}</span> },
    ]),
  ];
  const openIssue = (o: OrderRow) => (o.lastIssueStatus === 'ready' ? o.lastIssueCode : undefined);

  return (
    <div className="vb-stack">
      <div className="vb-row">
        <Button variant="ghost" icon="chevron-left" onClick={() => nav(basePath)}>Danh sách phiếu xuất</Button>
      </div>
      <h2 className="vb-panel__title" style={{ fontSize: 18, margin: 0 }}>Đơn hàng</h2>
      <Segmented<View>
        label="Đơn hàng" value={view} onChange={setView}
        options={[
          { value: 'open', label: 'Chưa giao', count: orders.data ? all.filter(isOpenOrder).length : undefined },
          { value: 'cancelled', label: 'Đã hủy', count: orders.data ? all.filter(o => o.status === 'cancelled').length : undefined },
        ]}
      />
      <FilterBar search={search} onSearchChange={setSearch} searchPlaceholder="Tìm theo mã đơn, khách hàng…" resultCount={orders.data ? rows.length : undefined} />
      {orders.isPending ? <Loading /> : orders.isError ? <ListError onRetry={() => orders.refetch()} /> : (
        <DataTable columns={columns} rows={rows} maxHeight="calc(100dvh - 340px)" caption="Đơn hàng"
          empty={<EmptyState icon="package-minus" title={view === 'open' ? 'Không có đơn chưa giao' : 'Chưa có đơn bị hủy'} />} />
      )}
      {cancelling && (
        <CancelOrderDialog
          order={{ id: cancelling.id, code: cancelling.externalCode, customerName: cancelling.customerName, quantity: cancelling.totalQuantity, issueCode: openIssue(cancelling) }}
          onClose={() => setCancelling(null)}
        />
      )}
    </div>
  );
}
