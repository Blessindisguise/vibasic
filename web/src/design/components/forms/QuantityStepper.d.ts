/** − [qty] + control with clamping. */
export interface QuantityStepperProps {
  value: number; onChange?: (v: number) => void;
  min?: number; max?: number; step?: number;
  /** Unit text after the number, e.g. "cái", "tấm" */ unit?: string;
  /** lg = 56px touch buttons for warehouse */ size?: 'md' | 'lg';
  label?: string; disabled?: boolean;
}
export declare function QuantityStepper(props: QuantityStepperProps): JSX.Element;
