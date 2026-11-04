import { StatusBadge } from '../design';
import type { ApprovalStatus, LotStatus, ReceiptStatus } from './receiving';
import type { IssueStatus, OrderStatus } from './issuing';

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

export function ApprovalBadge({ status, size }: { status: ApprovalStatus; size?: Size }) {
  return <StatusBadge status={status} size={size} />;
}

export function IssueStatusBadge({ status, size }: { status: IssueStatus; size?: Size }) {
  switch (status) {
    case 'pending': return <StatusBadge status="pending" size={size} />;
    case 'approved': return <StatusBadge status="approved" size={size} />;
    case 'rejected': return <StatusBadge status="rejected" size={size} />;
    case 'onHold': return <StatusBadge status="hold" label="Chờ xử lý" size={size} />;
    case 'issued': return <StatusBadge status="info" label="Đã xuất" icon="truck" size={size} />;
  }
}

export function OrderStatusBadge({ status, size }: { status: OrderStatus; size?: Size }) {
  switch (status) {
    case 'open': return <StatusBadge status="draft" label="Chưa xuất" icon="clock" size={size} />;
    case 'onHold': return <StatusBadge status="hold" label="Chờ xử lý" size={size} />;
    case 'inProgress': return <StatusBadge status="pending" label="Đang xuất" icon="package-minus" size={size} />;
    case 'issued': return <StatusBadge status="info" label="Đã xuất" icon="truck" size={size} />;
  }
}

export const ISSUE_STATUS_OPTIONS: { value: IssueStatus; label: string }[] = [
  { value: 'pending', label: 'Chờ duyệt' },
  { value: 'approved', label: 'Đã duyệt' },
  { value: 'issued', label: 'Đã xuất' },
  { value: 'onHold', label: 'Chờ xử lý' },
  { value: 'rejected', label: 'Từ chối' },
];

export const RECEIPT_STATUS_OPTIONS: { value: ReceiptStatus; label: string }[] = [
  { value: 'receiving', label: 'Đang nhập kho' },
  { value: 'pending', label: 'Chờ duyệt' },
  { value: 'approved', label: 'Đã duyệt' },
  { value: 'rejected', label: 'Từ chối' },
];
