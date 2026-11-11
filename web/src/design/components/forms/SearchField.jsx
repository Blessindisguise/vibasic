import React from 'react';
import { Icon } from '../core/Icon.jsx';
import { useSuggest } from './Suggestions.jsx';

/** Search box with a type-ahead list under it. Typing still filters the page; picking a suggestion jumps straight to it. */
export function SearchField({ label, value = '', onChange, placeholder, size = 'md', suggestions = [], onPickSuggestion, emptyText, align, style, id, ...rest }) {
  const fid = id || React.useId();
  const s = useSuggest({ items: suggestions, query: value, onPick: onPickSuggestion, size: size === 'lg' || size === 'xl' ? 'lg' : 'md', emptyText, align });
  return (
    <div className="vb-field" style={style}>
      {label && <label htmlFor={fid} className="vb-field__label">{label}</label>}
      <div className="vb-suggest-anchor">
        <div className={`vb-input vb-input--${size}`}>
          <Icon name="search" size={size === 'lg' || size === 'xl' ? 20 : 16} style={{ color: 'var(--text-muted)' }} />
          <input id={fid} type="text" value={value} placeholder={placeholder} autoComplete="off" spellCheck={false}
            onChange={e => onChange && onChange(e.target.value)} {...s.inputProps} {...rest} />
          {value && (
            <button type="button" className="vb-chip-remove" aria-label="Xoá tìm kiếm" onMouseDown={e => e.preventDefault()} onClick={() => onChange && onChange('')}>
              <Icon name="x" size={14} />
            </button>
          )}
        </div>
        {s.list}
      </div>
    </div>
  );
}
