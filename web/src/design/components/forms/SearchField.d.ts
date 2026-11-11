import type { CSSProperties } from 'react';
import type { Suggestion } from './Suggestions';

/** Search box with type-ahead suggestions (code, name, status) under it. */
export interface SearchFieldProps<T = unknown> {
  label?: string; value: string; onChange?: (v: string) => void; placeholder?: string;
  size?: 'md' | 'lg' | 'xl';
  /** Already filtered and capped by the page (about 8). */ suggestions?: Suggestion<T>[];
  onPickSuggestion?: (item: Suggestion<T>) => void;
  emptyText?: string; /** See useSuggest. */ align?: 'start' | 'end'; style?: CSSProperties; id?: string; 'aria-label'?: string;
}
export declare function SearchField<T = unknown>(props: SearchFieldProps<T>): JSX.Element;
