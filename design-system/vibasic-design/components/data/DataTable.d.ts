export interface DataTableColumn<R = any> { key: string; header: React.ReactNode; align?: 'left' | 'right' | 'center'; /** right-aligned tabular */ numeric?: boolean; width?: number | string; render?: (row: R) => React.ReactNode; sortable?: boolean; }
/**
 * Dense manager table: sticky header, selection + bulk bar, optional grouping, sorting.
 * @startingPoint section="Data" subtitle="Dense table with sticky header, selection and bulk actions" viewport="700x380"
 */
export interface DataTableProps<R = any> {
  columns: DataTableColumn<R>[]; rows: R[]; rowKey?: string;
  density?: 'compact' | 'default';
  selectable?: boolean; selected?: Array<string | number>; onSelectedChange?: (ids: Array<string | number>) => void;
  /** Buttons shown in the bulk bar when rows are selected */ bulkActions?: React.ReactNode;
  /** Enables scrolling with sticky header */ maxHeight?: number | string;
  groupBy?: string; groupHeader?: (group: any, rows: R[]) => React.ReactNode;
  onRowClick?: (row: R) => void;
  sort?: { key: string; dir: 'asc' | 'desc' }; onSortChange?: (s: { key: string; dir: 'asc' | 'desc' }) => void;
  empty?: React.ReactNode; caption?: string;
}
export declare function DataTable<R = any>(props: DataTableProps<R>): JSX.Element;
