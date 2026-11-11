import type { ReactNode, KeyboardEvent, FocusEvent, FormEvent } from 'react';

/** One type-ahead row: `label` is the code or name (typed text is bolded), `hint` a second line, `meta` a right-side badge or count. */
export interface Suggestion<T = unknown> { key: string; label: string; hint?: string; meta?: ReactNode; value?: T }

export interface UseSuggestOptions<T> {
  items?: Suggestion<T>[]; query?: string; onPick?: (item: Suggestion<T>) => void;
  /** lg = tablet rows (52px). */ size?: 'md' | 'lg';
  /** Shown when the text matches nothing; leave out to hide the list instead. */ emptyText?: string;
  /** end = the list grows leftwards from the field's right edge (fields at the right of a dialog). */ align?: 'start' | 'end';
}
export interface UseSuggestResult {
  open: boolean; close: () => void;
  inputProps: {
    role: 'combobox'; 'aria-autocomplete': 'list'; 'aria-expanded': boolean; 'aria-controls'?: string; 'aria-activedescendant'?: string;
    onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void; onFocus: (e: FocusEvent<HTMLInputElement>) => void;
    onBlur: (e: FocusEvent<HTMLInputElement>) => void; onInput: (e: FormEvent<HTMLInputElement>) => void;
  };
  list: JSX.Element | null;
}
export declare function useSuggest<T = unknown>(options: UseSuggestOptions<T>): UseSuggestResult;
export declare function highlight(text: string, query: string): ReactNode;
