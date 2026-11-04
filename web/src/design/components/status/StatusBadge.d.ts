export type ApprovalStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'hold' | 'locked' | 'info';
/** Status pill with icon + label (never colour alone). */
export interface StatusBadgeProps { status: ApprovalStatus; /** Override default Vietnamese label */ label?: string; size?: 'md' | 'lg'; icon?: string; }
export declare const STATUS_META: Record<ApprovalStatus, { label: string; icon: string }>;
export declare function StatusBadge(props: StatusBadgeProps): JSX.Element;
