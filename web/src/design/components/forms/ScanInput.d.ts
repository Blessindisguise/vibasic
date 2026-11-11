import type { Suggestion } from './Suggestions';

/**
 * Large barcode scan field. Hardware scanners type + Enter → onSubmit.
 * @startingPoint section="Warehouse" subtitle="Barcode scan field with success / error feedback" viewport="700x260"
 */
export interface ScanInputProps {
  value: string; onChange?: (v: string) => void;
  /** Called on Enter / scanner suffix */ onSubmit?: (v: string) => void;
  state?: 'idle' | 'success' | 'error';
  /** Feedback line under the field */ message?: string;
  label?: string; placeholder?: string;
  /** Shows camera button when provided */ onCamera?: () => void;
  autoFocus?: boolean;
  /** lg = 64px tablet field; md = 44px */ size?: 'md' | 'lg';
  /** Increment to replay the success/error feedback animation */ scanKey?: number;
  /** Type-ahead rows under the field (Enter still submits the typed code unless a row is highlighted). */ suggestions?: Suggestion[];
  onPickSuggestion?: (item: Suggestion) => void;
}
export declare function ScanInput(props: ScanInputProps): JSX.Element;
