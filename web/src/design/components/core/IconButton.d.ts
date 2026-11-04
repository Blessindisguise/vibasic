/** Square icon-only button with required accessible label. */
export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: string;
  /** Required — used as aria-label and tooltip */ label: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Small red count badge (e.g. unread alerts) */ badge?: number | string;
}
export declare function IconButton(props: IconButtonProps): JSX.Element;
