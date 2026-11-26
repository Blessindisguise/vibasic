import { ConfirmDialog } from '../../app/ConfirmDialog';
import { fmt } from '../../app/format';
import { useToast } from '../../app/toast';
import { useCancelOrder } from '../../app/issuing';

/** The customer cancelled: the manager cancels the order with a reason; an open issue of it is cancelled too. */
export function CancelOrderDialog({ order, onClose }: {
  order: { id: number; code: string; customerName?: string; quantity: number; issueCode?: string; picked?: number };
  onClose: () => void;
}) {
  const cancel = useCancelOrder();
  const toast = useToast();
  const facts = [
    order.customerName ?? 'Khách lẻ',
    `${fmt(order.quantity)} sản phẩm`,
    order.issueCode && `phiếu ${order.issueCode}${order.picked ? `, đã quét ${fmt(order.picked)}` : ''}`,
  ].filter(Boolean).join(' · ');
  return (
    <ConfirmDialog busy={cancel.isPending}
      tone="danger" requireReason title={`Hủy đơn ${order.code}?`} description={`${facts}.`}
      reasonLabel="Lý do hủy" confirmLabel="Hủy đơn"
      onConfirm={reason => cancel.mutate({ id: order.id, reason }, {
        onSuccess: r => {
          toast({
            tone: 'info', title: `Đã hủy đơn ${order.code}`,
            message: r.issueCode
              ? `Phiếu ${r.issueCode} đã hủy. Hàng đã lấy (nếu có) trả lại kệ.`
              : undefined,
          });
          onClose();
        },
        onError: e => { toast({ tone: 'danger', title: 'Không hủy được đơn', message: e.message }); onClose(); },
      })}
      onCancel={onClose}
    />
  );
}
