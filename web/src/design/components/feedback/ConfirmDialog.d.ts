/**
 * Modal confirmation. With requireReason, confirm is blocked until a reason is entered (used for Từ chối).
 * @startingPoint section="Feedback" subtitle="Approve / reject dialog with required reason" viewport="700x420"
 */
export interface ConfirmDialogProps {
  open?: boolean; tone?: 'primary' | 'danger'; title: string; description?: React.ReactNode; children?: React.ReactNode;
  requireReason?: boolean; reasonLabel?: string; reasonPlaceholder?: string; minReason?: number;
  confirmLabel?: string; cancelLabel?: string;
  onConfirm?: (reason: string) => void; onCancel?: () => void;
  /** Render without overlay (for docs / embedding) */ inline?: boolean;
}
export declare function ConfirmDialog(props: ConfirmDialogProps): JSX.Element | null;
