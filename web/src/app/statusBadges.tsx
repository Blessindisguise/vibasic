import { StatusBadge } from '../design';
import type { AbnormalSource, ApprovalStatus, HandlingMethod, LotStatus, ReceiptStatus, ReportScope, ReportState } from './receiving';
import type { IssueStatus, ItemStatus, OrderStatus } from './issuing';
import type { PlanStatus } from './stock';

type Size = 'md' | 'lg';

/** Statuses carry icon + label, never colour alone. Labels match the values stored in the database. */
export function ReceiptStatusBadge({ status, size }: { status: ReceiptStatus; size?: Size }) {
  switch (status) {
    case 'receiving': return <StatusBadge status="draft" label="Đang nhập kho" icon="package-plus" size={size} />;
    case 'pending': return <StatusBadge status="pending" size={size} />;
    case 'approved': return <StatusBadge status="approved" size={size} />;
    case 'rejected': return <StatusBadge status="rejected" size={size} />;
  }
}

export function LotStatusBadge({ status, size }: { status: LotStatus; size?: Size }) {
  switch (status) {
    case 'normal': return <StatusBadge status="approved" label="Bình thường" icon="circle-check" size={size} />;
    case 'quarantined': return <StatusBadge status="hold" label="Tạm cách ly" icon="shield-alert" size={size} />;
    case 'locked': return <StatusBadge status="locked" label="Đã khóa" size={size} />;
  }
}

export const LOT_STATUS_LABEL: Record<LotStatus, string> = { normal: 'Bình thường', quarantined: 'Tạm cách ly', locked: 'Đã khóa' };

export function ApprovalBadge({ status, size }: { status: ApprovalStatus; size?: Size }) {
  return <StatusBadge status={status} size={size} />;
}

export function IssueStatusBadge({ status, size }: { status: IssueStatus; size?: Size }) {
  switch (status) {
    case 'ready': return <StatusBadge status="pending" label="Chờ lấy hàng" icon="scan-barcode" size={size} />;
    case 'cancelled': return <StatusBadge status="draft" label="Đã hủy" icon="ban" size={size} />;
    case 'issued': return <StatusBadge status="info" label="Đã xuất" icon="truck" size={size} />;
  }
}

export function OrderStatusBadge({ status, size }: { status: OrderStatus; size?: Size }) {
  switch (status) {
    case 'open': return <StatusBadge status="draft" label="Chưa xuất" icon="clock" size={size} />;
    case 'onHold': return <StatusBadge status="hold" label="Chờ xử lý" size={size} />;
    case 'inProgress': return <StatusBadge status="pending" label="Đang xuất" icon="package-minus" size={size} />;
    case 'issued': return <StatusBadge status="info" label="Đã xuất" icon="truck" size={size} />;
    case 'cancelled': return <StatusBadge status="draft" label="Đã hủy" icon="ban" size={size} />;
  }
}

export const PLAN_STATUS_LABEL: Record<PlanStatus, string> = { waiting: 'Chờ thực hiện', inProgress: 'Đang kiểm kê', done: 'Hoàn thành' };

export function PlanStatusBadge({ status, size }: { status: PlanStatus; size?: Size }) {
  switch (status) {
    case 'waiting': return <StatusBadge status="draft" label={PLAN_STATUS_LABEL.waiting} icon="clock" size={size} />;
    case 'inProgress': return <StatusBadge status="pending" label={PLAN_STATUS_LABEL.inProgress} icon="list-checks" size={size} />;
    case 'done': return <StatusBadge status="approved" label={PLAN_STATUS_LABEL.done} size={size} />;
  }
}

const ITEM_STATUS: Record<ItemStatus, { status: 'draft' | 'pending' | 'approved' | 'rejected' | 'hold' | 'info'; label: string; icon: string }> = {
  incoming: { status: 'draft', label: 'Chờ nhập', icon: 'package-plus' },
  inStock: { status: 'approved', label: 'Trong kho', icon: 'warehouse' },
  reserved: { status: 'pending', label: 'Đã giữ chỗ', icon: 'lock' },
  issued: { status: 'info', label: 'Đã xuất', icon: 'truck' },
  lost: { status: 'rejected', label: 'Thất thoát', icon: 'circle-x' },
  defective: { status: 'rejected', label: 'Lỗi', icon: 'shield-alert' },
  disposed: { status: 'draft', label: 'Đã loại bỏ', icon: 'trash-2' },
};
export function ItemStatusBadge({ status, size }: { status: ItemStatus; size?: Size }) {
  const m = ITEM_STATUS[status];
  return <StatusBadge status={m.status} label={m.label} icon={m.icon} size={size} />;
}
export const ITEM_STATUS_LABEL = Object.fromEntries(Object.entries(ITEM_STATUS).map(([k, v]) => [k, v.label])) as Record<ItemStatus, string>;

export const SOURCE_LABEL: Record<AbnormalSource, string> = { receipt: 'Nhập kho', issue: 'Xuất kho', stocktake: 'Kiểm kê' };
export const SCOPE_LABEL: Record<ReportScope, string> = { items: 'Chỉ sản phẩm lỗi', lot: 'Cả lô' };

/** Hướng xử lý, with what completing it does to stock. */
export const HANDLING_METHODS: { value: HandlingMethod; label: string; effect: string; leaves: boolean }[] = [
  { value: 'returnToSupplier', label: 'Trả nhà cung cấp', effect: 'Hàng rời kho', leaves: true },
  { value: 'scrap', label: 'Tiêu hủy', effect: 'Hàng rời kho', leaves: true },
  { value: 'clearance', label: 'Thanh lý giảm giá', effect: 'Hàng rời kho (bán ngoài hệ thống)', leaves: true },
  { value: 'repair', label: 'Sửa chữa, tân trang', effect: 'Hàng trở về kho, xuất được', leaves: false },
];
export const HANDLING_METHOD_LABEL = Object.fromEntries(HANDLING_METHODS.map(m => [m.value, m.label])) as Record<HandlingMethod, string>;

const REPORT_STATE: Record<ReportState, { status: 'draft' | 'pending' | 'approved' | 'rejected' | 'hold' | 'info'; label: string; icon?: string }> = {
  pending: { status: 'pending', label: 'Chờ duyệt' },
  waiting: { status: 'hold', label: 'Chờ xử lý', icon: 'clock' },
  inProgress: { status: 'info', label: 'Đang xử lý', icon: 'refresh-cw' },
  done: { status: 'approved', label: 'Đã xử lý', icon: 'circle-check' },
  rejected: { status: 'rejected', label: 'Từ chối' },
};
export const REPORT_STATE_LABEL = Object.fromEntries(Object.entries(REPORT_STATE).map(([k, v]) => [k, v.label])) as Record<ReportState, string>;
/** One badge for an abnormal report: Chờ duyệt / Chờ xử lý / Đang xử lý / Đã xử lý / Từ chối. */
export function ReportStateBadge({ state, size }: { state: ReportState; size?: Size }) {
  const m = REPORT_STATE[state];
  return <StatusBadge status={m.status} label={m.label} icon={m.icon} size={size} />;
}

export const ISSUE_STATUS_OPTIONS: { value: IssueStatus; label: string }[] = [
  { value: 'ready', label: 'Chờ lấy hàng' },
  { value: 'issued', label: 'Đã xuất' },
  { value: 'cancelled', label: 'Đã hủy' },
];

export const RECEIPT_STATUS_OPTIONS: { value: ReceiptStatus; label: string }[] = [
  { value: 'receiving', label: 'Đang nhập kho' },
  { value: 'pending', label: 'Chờ duyệt' },
  { value: 'approved', label: 'Đã duyệt' },
  { value: 'rejected', label: 'Từ chối' },
];
