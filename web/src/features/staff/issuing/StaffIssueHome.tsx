import { useNavigate, useSearchParams } from 'react-router-dom';
import { EmptyState, Icon } from '../../../design';
import { fmt, fmtDateTime } from '../../../app/format';
import { Segmented } from '../../../app/Segmented';
import { Code, ListError, Loading } from '../../../app/ui';
import { IssueStatusBadge, OrderStatusBadge } from '../../../app/statusBadges';
import { useIssues, useOrders, type OrderRow } from '../../../app/issuing';
import { IssueListPage } from '../../issuing/IssueListPage';

type Tab = 'don' | 'phieu' | 'lay-hang';

/** Staff "Xuất kho": orders waiting to be issued (UC_07 step 1), issues to pick (UC_08), and all issues (UC_09). */
export function StaffIssueHome() {
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as Tab) || 'don';
  const orders = useOrders();
  const approved = useIssues({ status: 'approved' });
  const waiting = (orders.data ?? []).filter(o => o.status === 'open' || o.status === 'onHold');

  return (
    <div className="vb-stack">
      <Segmented<Tab>
        label="Xuất kho" size="lg" value={tab} onChange={t => setParams({ tab: t }, { replace: true })}
        options={[
          { value: 'don', label: 'Đơn chờ xuất', count: orders.data ? waiting.length : undefined },
          { value: 'lay-hang', label: 'Cần lấy hàng', count: approved.data?.length },
          { value: 'phieu', label: 'Tất cả phiếu xuất' },
        ]}
      />
      {tab === 'don' && (orders.isPending ? <Loading /> : orders.isError ? <ListError onRetry={() => orders.refetch()} /> : <OrderCards orders={waiting} />)}
      {tab === 'lay-hang' && <PickQueue />}
      {tab === 'phieu' && <IssueListPage role="staff" basePath="/kho/xuat-kho" />}
    </div>
  );
}

function OrderCards({ orders }: { orders: OrderRow[] }) {
  const nav = useNavigate();
  if (orders.length === 0) {
    return <div className="vb-panel"><EmptyState size="lg" icon="clipboard-list" title="Không có đơn chờ xuất" description="Đơn hàng từ hệ thống bán hàng sẽ hiện ở đây." /></div>;
  }
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
      {orders.map(o => (
        <button key={o.id} type="button" className="vb-panel vb-card-button" onClick={() => nav(`/kho/xuat-kho/don/${o.id}`)}>
          <div className="vb-row" style={{ justifyContent: 'space-between' }}>
            <Code>{o.externalCode}</Code>
            <OrderStatusBadge status={o.status} />
          </div>
          <div style={{ font: 'var(--type-touch-body)', fontWeight: 600 }}>{o.customerName ?? 'Khách lẻ'}</div>
          <div className="vb-muted" style={{ fontSize: 14 }}>Đặt {fmtDateTime(o.orderDate)} · {o.lines.length} mặt hàng · {fmt(o.totalQuantity)} sản phẩm</div>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {o.lines.map(l => (
              <li key={l.productId} className="vb-row" style={{ justifyContent: 'space-between', flexWrap: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}><Code>{l.sku}</Code> {l.productName}</span>
                <span style={{ flex: 'none', color: l.free < l.quantity ? 'var(--red-700)' : undefined, fontWeight: l.free < l.quantity ? 600 : undefined }}>
                  {fmt(l.quantity)} {l.unit}{l.free < l.quantity && ` (còn ${fmt(l.free)})`}
                </span>
              </li>
            ))}
          </ul>
          <div className="vb-row" style={{ justifyContent: 'space-between', marginTop: 'auto' }}>
            {o.sufficient
              ? <span style={{ color: 'var(--green-700)', fontWeight: 600 }}><Icon name="circle-check" size={16} style={{ verticalAlign: -3 }} /> Đủ hàng</span>
              : <span style={{ color: 'var(--red-700)', fontWeight: 600 }}><Icon name="triangle-alert" size={16} style={{ verticalAlign: -3 }} /> Thiếu hàng</span>}
            {o.lastIssueCode && <span className="vb-muted">Lần trước: {o.lastIssueCode} {o.lastIssueStatus && <IssueStatusBadge status={o.lastIssueStatus} />}</span>}
          </div>
        </button>
      ))}
    </div>
  );
}

function PickQueue() {
  const issues = useIssues({ status: 'approved' });
  const nav = useNavigate();
  if (issues.isPending) return <Loading />;
  if (issues.isError) return <ListError onRetry={() => issues.refetch()} />;
  if (issues.data.length === 0) {
    return <div className="vb-panel"><EmptyState size="lg" icon="package-check" title="Chưa có phiếu cần lấy hàng" description="Phiếu xuất được quản lý duyệt sẽ hiện ở đây." /></div>;
  }
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
      {issues.data.map(i => (
        <button key={i.id} type="button" className="vb-panel vb-card-button" onClick={() => nav(`/kho/xuat-kho/${i.id}`)}>
          <div className="vb-row" style={{ justifyContent: 'space-between' }}><Code>{i.code}</Code><IssueStatusBadge status={i.status} /></div>
          <div style={{ font: 'var(--type-touch-body)', fontWeight: 600 }}>{i.customerName ?? i.orderCode}</div>
          <div className="vb-muted" style={{ fontSize: 14 }}>Đơn {i.orderCode} · duyệt {fmtDateTime(i.approvedAt)}</div>
          <div style={{ height: 8, background: 'var(--grey-100)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ width: `${(i.picked / Math.max(1, i.totalQuantity)) * 100}%`, height: '100%', background: 'var(--green-500)' }} />
          </div>
          <div className="vb-row" style={{ justifyContent: 'space-between', fontVariantNumeric: 'tabular-nums' }}>
            <span>Đã quét {fmt(i.picked)}/{fmt(i.totalQuantity)}</span>
            {/* The whole card is the button; this only looks like one. */}
            <span className="vb-btn vb-btn--primary vb-btn--lg" aria-hidden="true">
              <Icon name="scan-barcode" size={18} />{i.picked > 0 ? 'Tiếp tục lấy hàng' : 'Bắt đầu lấy hàng'}
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}
