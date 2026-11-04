export interface FilterDef { key: string; label: string; value?: string; options: { value: string; label: string }[]; }
/** Search + inline filter selects + active chips + right-side actions. */
export interface FilterBarProps {
  search?: string; onSearchChange?: (v: string) => void; searchPlaceholder?: string;
  filters?: FilterDef[]; onFilterChange?: (key: string, value: string) => void;
  chips?: { key: string; label: string }[]; onRemoveChip?: (key: string) => void; onClearAll?: () => void;
  actions?: React.ReactNode; resultCount?: number;
}
export declare function FilterBar(props: FilterBarProps): JSX.Element;
