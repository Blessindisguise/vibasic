export type IconName = string;
/** Lucide-derived icon rendered with square caps + miter joins. See ICON_NAMES for the available set. */
export interface IconProps { /** Lucide name, e.g. "scan-barcode", "triangle-alert" */ name: string; size?: number; strokeWidth?: number; /** Accessible label; omit for decorative icons */ title?: string; style?: React.CSSProperties; }
export declare const ICON_NAMES: string[];
export declare function Icon(props: IconProps): JSX.Element | null;
