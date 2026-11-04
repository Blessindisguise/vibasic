/** Dashboard metric tile. Clickable tiles drill into the filtered list. */
export interface KpiTileProps {
  label: string; value: React.ReactNode; unit?: string; icon?: string;
  tone?: 'neutral' | 'danger' | 'warning' | 'success' | 'info';
  delta?: { value: string; direction: 'up' | 'down'; good: boolean };
  footnote?: string; onClick?: () => void;
}
export declare function KpiTile(props: KpiTileProps): JSX.Element;
