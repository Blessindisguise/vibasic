/** Native select styled to match TextField. */
export interface SelectFieldProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: string; required?: boolean; helper?: string; error?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  options: Array<string | { value: string; label: string }>;
  placeholder?: string;
}
export declare function SelectField(props: SelectFieldProps): JSX.Element;
