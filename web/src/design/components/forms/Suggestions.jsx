import React from 'react';

/** One character at a time so indexes stay aligned with the original text (Vietnamese precomposed letters fold to one letter). */
const foldChar = c => {
  const f = c.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[đĐ]/g, 'd').toLowerCase();
  return f.length === 1 ? f : c;
};

/** Bold where each typed word first appears, ignoring case and accents. */
export function highlight(text, query) {
  if (typeof text !== 'string' || !query) return text;
  const hay = text.split('').map(foldChar).join('');
  const words = query.split('').map(foldChar).join('').split(/\s+/).filter(Boolean);
  const marks = [];
  for (const w of words) {
    const at = hay.indexOf(w);
    if (at >= 0) marks.push([at, at + w.length]);
  }
  if (marks.length === 0) return text;
  marks.sort((a, b) => a[0] - b[0]);
  const parts = [];
  let pos = 0;
  for (const [from, to] of marks) {
    if (to <= pos) continue;
    const start = Math.max(from, pos);
    if (start > pos) parts.push(text.slice(pos, start));
    parts.push(<mark key={start} className="vb-suggest__hit">{text.slice(start, to)}</mark>);
    pos = to;
  }
  if (pos < text.length) parts.push(text.slice(pos));
  return parts;
}

/**
 * Type-ahead state for a text input: arrow keys move, Enter picks the highlighted suggestion (otherwise the form submits
 * the typed text as before, so barcode scanners keep working), Escape closes. Spread `inputProps` on the input and render `list`
 * inside a `position: relative` box that wraps it.
 */
export function useSuggest({ items = [], query = '', onPick, size = 'md', emptyText, align = 'start' }) {
  const [open, setOpen] = React.useState(false);
  const [active, setActive] = React.useState(-1);
  const id = React.useId();
  const keys = items.map(i => i.key).join('|');
  React.useEffect(() => setActive(-1), [keys]);

  const hasText = query.trim().length > 0;
  const shown = open && hasText && (items.length > 0 || !!emptyText);
  const pick = item => { setOpen(false); setActive(-1); onPick && onPick(item); };
  const onKeyDown = e => {
    if (e.key === 'Escape') { if (shown) { e.preventDefault(); setOpen(false); } return; }
    if (!items.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive(a => (shown ? (a + 1) % items.length : 0)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setOpen(true); setActive(a => (a <= 0 ? items.length - 1 : a - 1)); }
    else if (e.key === 'Enter' && shown && active >= 0) { e.preventDefault(); pick(items[active]); }
  };

  return {
    open: shown,
    close: () => setOpen(false),
    inputProps: {
      role: 'combobox', 'aria-autocomplete': 'list', 'aria-expanded': shown, 'aria-controls': shown ? `${id}-list` : undefined,
      'aria-activedescendant': shown && active >= 0 ? `${id}-${active}` : undefined,
      onKeyDown, onFocus: () => setOpen(true), onBlur: () => setOpen(false), onInput: () => setOpen(true),
    },
    list: shown ? (
      <ul id={`${id}-list`} role="listbox" className={`vb-suggest vb-suggest--${size}${align === 'end' ? ' vb-suggest--end' : ''}`}>
        {items.length === 0 && <li className="vb-suggest__empty">{emptyText}</li>}
        {items.map((item, i) => (
          <li
            key={item.key} id={`${id}-${i}`} role="option" aria-selected={i === active}
            className={`vb-suggest__item${i === active ? ' is-active' : ''}`}
            // Keep focus in the input so blur does not close the list before the pick.
            onMouseDown={e => e.preventDefault()} onMouseEnter={() => setActive(i)} onClick={() => pick(item)}
          >
            <span className="vb-suggest__main">
              <span className="vb-suggest__label">{highlight(item.label, query)}</span>
              {item.hint && <span className="vb-suggest__hint">{highlight(item.hint, query)}</span>}
            </span>
            {item.meta && <span className="vb-suggest__meta">{item.meta}</span>}
          </li>
        ))}
      </ul>
    ) : null,
  };
}
