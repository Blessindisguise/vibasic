/** Checkbox with optional label; supports indeterminate. */
export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: React.ReactNode; checked?: boolean; indeterminate?: boolean;
  /** lg = 24px box, 44px row for touch */ size?: 'md' | 'lg';
}
export declare function Checkbox(props: CheckboxProps): JSX.Element;
