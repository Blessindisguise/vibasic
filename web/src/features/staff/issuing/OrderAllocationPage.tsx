import { useNavigate } from 'react-router-dom';
import { AlertBanner, Button, LotCard } from '../../../design';
import { fmt, fmtDate, fmtDateTime } from '../../../app/format';
import { useToast } from '../../../app/toast';
import { Code, ListError, Loading } from '../../../app/ui';
import { OrderStatusBadge } from '../../../app/statusBadges';
import { useAllocation, useCreateIssue, useOrders } from '../../../app/issuing';

const DAY = 86_400_000;
export const ageDays = (iso: string) => Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / DAY));

/**
 * UC_07: the system lists each line of the order, checks available stock (locked and quarantined lots excluded)
 * and shows the FIFO lots and item codes to pick. Creating the issue reserves them and sends it for approval.
 */
export function OrderAllocationPage({ orderId }: { orderId: number }) {
  const orders = useOrders();
  const alloc = useAllocation(orderId);
  const create = useCreateIssue();
  const toast = useToast();
  const nav = useNavigate();
  const order = orders.data?.find(o => o.id === orderId);

  if (alloc.isPending || orders.isPending) return <Loading />;
  if (alloc.isError) return <ListError onRetry={() => alloc.refetch()} />;
  const a = alloc.data;
  const canIssue = order?.status === 'open' || order?.status === 'onHold';

  const submit = () => create.mutate(orderId, {
    onSuccess: v => {
      toast({ tone: 'success', title: `Đã lập phiếu ${v.header.code}`, message: 'Phiếu đã gửi quản lý duyệt. Sản phẩm trong danh sách đã được giữ chỗ.' });
      nav(`/kho/xuat-kho/${v.header.id}`);
    },
    onError: e => toast({ tone: 'danger', title: 'Không lập được phiếu xuất', message: e.message }),
  });

  return (
    <div className="vb-stack" style={{ maxWidth: 1040 }}>
      <div className="vb-row">
        <Button variant="ghost" size="lg" icon="chevron-left" onClick={() => nav('/kho/xuat-kho')}>Đơn chờ xuất</Button>
      </div>

      <section className="vb-panel">
        <div className="vb-panel__head" style={{ flexWrap: 'wrap', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <div className="vb-row" style={{ gap: 10 }}>
              <h2 className="vb-panel__title" style={{ fontSize: 20 }}><Code>{order?.externalCode}</Code></h2>
              {order && <OrderStatusBadge status={order.status} size="lg" />}
            </div>
            <div className="vb-muted" style={{ fontSize: 14, marginTop: 2 }}>{order?.customerName ?? 'Khách lẻ'} · đặt {fmtDateTime(order?.orderDate)}</div>
          </div>
          {canIssue && (a.sufficient
            ? <Button size="xl" icon="send" loading={create.isPending} onClick={submit}>Lập phiếu xuất và gửi duyệt</Button>
            : <Button size="xl" variant="secondary" icon="circle-pause" loading={create.isPending} onClick={submit}>Ghi nhận thiếu hàng</Button>)}
        </div>
        <div className="vb-panel__body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {!canIssue && order && (
            <AlertBanner tone="info" title="Đơn đã có phiếu xuất">
              {order.lastIssueCode ? <>Xem phiếu <Code>{order.lastIssueCode}</Code>.</> : 'Đơn không còn chờ xuất.'}
            </AlertBanner>
          )}
          {canIssue && (a.sufficient
            ? <AlertBanner tone="success" title="Đủ hàng tồn kho">
                Hệ thống chọn lô theo FIFO: lô nhập sớm nhất được lấy trước, lô bị khóa hoặc tạm cách ly không được tính.
              </AlertBanner>
            : <AlertBanner tone="danger" title="Không đủ hàng tồn kho">
                {a.lines.filter(l => l.shortage > 0).map(l => `${l.sku} thiếu ${fmt(l.shortage)} ${l.unit}`).join('; ')}.
                {' '}Chọn “Ghi nhận thiếu hàng” để chuyển đơn sang Chờ xử lý; lập lại phiếu khi có hàng.
              </AlertBanner>)}
        </div>
      </section>

      {a.lines.map(line => (
        <section key={line.productId} className="vb-panel">
          <div className="vb-panel__head" style={{ flexWrap: 'wrap' }}>
            <span style={{ font: 'var(--type-touch-heading)', fontSize: 17 }}><Code>{line.sku}</Code> {line.productName}</span>
            <span style={{ marginLeft: 'auto', fontVariantNumeric: 'tabular-nums', font: 'var(--type-touch-body)' }}>
              Cần {fmt(line.ordered)} {line.unit} · Khả dụng {fmt(line.free)}
              {line.shortage > 0 && <b style={{ color: 'var(--red-700)' }}> · Thiếu {fmt(line.shortage)}</b>}
            </span>
          </div>
          <div className="vb-panel__body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {line.lots.length === 0 && <div className="vb-muted">Không có lô khả dụng.</div>}
            {line.lots.map((lot, i) => (
              <div key={lot.receiptDetailId} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <LotCard
                  size="lg" fifoOrder={i + 1} lotCode={lot.lotCode} receivedAt={fmtDate(lot.receivedDate)} ageDays={ageDays(lot.receivedDate)}
                  toPick={lot.take} picked={0} unit={line.unit} state={i === 0 ? 'next' : 'waiting'}
                />
                <details style={{ paddingLeft: 68 }}>
                  <summary className="vb-muted" style={{ cursor: 'pointer', fontSize: 14 }}>Mã sản phẩm cần lấy ({fmt(lot.serials.length)})</summary>
                  <div className="vb-serials">{lot.serials.map(s => <span key={s} className="vb-serial">{s}</span>)}</div>
                </details>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
