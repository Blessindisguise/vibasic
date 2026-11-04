/** Draft → Pending → Approved | Rejected progress with actor/time per step. */
export interface ApprovalStepperProps {
  status: 'draft' | 'pending' | 'approved' | 'rejected';
  history?: Partial<Record<'draft' | 'pending' | 'approved' | 'rejected', { by?: string; at?: string; note?: string }>>;
  size?: 'md' | 'lg';
  orientation?: 'horizontal' | 'vertical';
}
export declare function ApprovalStepper(props: ApprovalStepperProps): JSX.Element;
