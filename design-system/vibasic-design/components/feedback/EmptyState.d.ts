/** Empty list / no-results placeholder — icon, title, one line, one action. */
export interface EmptyStateProps { icon?: string; title: string; description?: string; action?: React.ReactNode; size?: 'md' | 'lg'; }
export declare function EmptyState(props: EmptyStateProps): JSX.Element;
