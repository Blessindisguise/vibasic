/** Draft → Pending → Approved | Rejected progress with actor/time per step. */
export interface ApprovalStepperProps {
  status: 'draft' | 'pending' | 'approved' | 'rejected';
  history?: Partial<Record<'draft' | 'pending' | 'approved' | 'rejected', { by?: string; at?: string; note?: string }>>;
  size?: 'md' | 'lg';
  orientation?: 'horizontal' | 'vertical';
  /** Label of the first step, e.g. "Đang nhập kho". Default "Nháp". */ draftLabel?: string;
  /** Other step labels for a non-approval flow, e.g. a goods issue: Chờ lấy hàng → Đã xuất | Đã hủy. */
  labels?: { pending?: string; approved?: string; rejected?: string };
}
export declare function ApprovalStepper(props: ApprovalStepperProps): JSX.Element;
