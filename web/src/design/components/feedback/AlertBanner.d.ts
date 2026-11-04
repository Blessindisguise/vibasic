/** Inline banner for page-level messages and low-stock alerts. */
export interface AlertBannerProps { tone?: 'info' | 'warning' | 'danger' | 'success'; title?: string; children?: React.ReactNode; action?: React.ReactNode; onDismiss?: () => void; icon?: string; }
export declare function AlertBanner(props: AlertBannerProps): JSX.Element;
