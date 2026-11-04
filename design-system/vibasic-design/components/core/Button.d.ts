/**
 * Primary action button. Green is reserved for the single primary action per view.
 * @startingPoint section="Core" subtitle="Primary / secondary / ghost / danger, 4 sizes" viewport="700x300"
 */
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'danger-outline';
  /** sm 28 · md 36 (desktop) · lg 44 · xl 56 (warehouse touch) */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Leading icon name */ icon?: string;
  iconRight?: string;
  loading?: boolean;
  fullWidth?: boolean;
  children?: React.ReactNode;
}
export declare function Button(props: ButtonProps): JSX.Element;
