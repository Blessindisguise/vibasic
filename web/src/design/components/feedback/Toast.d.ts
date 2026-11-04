/** Transient confirmation (bottom-right on desktop, bottom on tablet). */
export interface ToastProps { tone?: 'success' | 'danger' | 'info' | 'warning'; title: string; message?: string; action?: { label: string; onClick: () => void }; onClose?: () => void; }
export declare function Toast(props: ToastProps): JSX.Element;
