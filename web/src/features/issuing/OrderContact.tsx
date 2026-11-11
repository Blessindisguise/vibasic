import { Fact, Facts } from '../../app/ui';

const none = <span className="vb-muted">—</span>;

/** Delivery contact of an order: customer, phone (tap to call), address, note. */
export function OrderContact({ name, phone, address, note }: { name?: string; phone?: string; address?: string; note?: string }) {
  return (
    <Facts min={200}>
      <Fact label="Khách hàng" value={name ?? 'Khách lẻ'} />
      <Fact label="Số điện thoại" value={phone ? <a href={`tel:${phone.replace(/[^\d+]/g, '')}`} style={{ fontWeight: 600 }}>{phone}</a> : none} />
      <Fact label="Địa chỉ giao hàng" value={address ?? none} />
      {note && <Fact label="Ghi chú đơn hàng" value={note} />}
    </Facts>
  );
}
