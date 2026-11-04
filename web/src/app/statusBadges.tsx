import { StatusBadge } from '../design';
import type { ApprovalStatus, LotStatus, ReceiptStatus } from './receiving';

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

export const RECEIPT_STATUS_OPTIONS: { value: ReceiptStatus; label: string }[] = [
  { value: 'receiving', label: 'Đang nhập kho' },
  { value: 'pending', label: 'Chờ duyệt' },
  { value: 'approved', label: 'Đã duyệt' },
  { value: 'rejected', label: 'Từ chối' },
];
