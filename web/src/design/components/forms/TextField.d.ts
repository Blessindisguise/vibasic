/** Labelled text input / textarea with helper and validation message. */
export interface TextFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string; required?: boolean; helper?: string;
  /** Error message — turns field red and shows icon */ error?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Leading icon name */ icon?: string;
  /** Trailing unit text, e.g. "cái" */ suffix?: string;
  multiline?: boolean;
  inputStyle?: React.CSSProperties;
}
export declare function TextField(props: TextFieldProps): JSX.Element;
