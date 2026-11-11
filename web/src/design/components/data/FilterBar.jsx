import React from 'react';
import { Icon } from '../core/Icon.jsx';
import { useSuggest } from '../forms/Suggestions.jsx';

// filters: [{ key, label, value, options: [{value,label}] }] · chips: [{ key, label }]
export function FilterBar({ search = '', onSearchChange, searchPlaceholder = 'Tìm theo mã, tên sản phẩm…', filters = [], onFilterChange, chips = [], onRemoveChip, onClearAll, actions, resultCount, suggestions = [], onPickSuggestion }) {
  const s = useSuggest({ items: suggestions, query: search, onPick: onPickSuggestion });
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <div className="vb-suggest-anchor" style={{ width: 280, maxWidth: '100%' }}>
          <div className="vb-input vb-input--md">
            <Icon name="search" size={16} style={{ color: 'var(--text-muted)' }} />
            <input value={search} onChange={e => onSearchChange && onSearchChange(e.target.value)} placeholder={searchPlaceholder} aria-label="Tìm kiếm"
              autoComplete="off" {...s.inputProps} />
          </div>
          {s.list}
        </div>
        {filters.map(f => (
          <div key={f.key} className="vb-input vb-input--md" style={{ position: 'relative', paddingRight: 28, background: f.value ? 'var(--green-50)' : '#fff', borderColor: f.value ? 'var(--green-300)' : undefined }}>
            <span style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{f.label}:</span>
            <select value={f.value || ''} onChange={e => onFilterChange && onFilterChange(f.key, e.target.value)} aria-label={f.label} style={{ fontWeight: 600, paddingRight: 0, width: 'auto' }}>
              <option value="">Tất cả</option>
              {f.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <Icon name="chevron-down" size={14} style={{ position: 'absolute', right: 10, pointerEvents: 'none', color: 'var(--text-secondary)' }} />
          </div>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          {resultCount != null && <span style={{ font: 'var(--type-helper)', color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>{resultCount} kết quả</span>}
          {actions}
        </div>
      </div>
      {chips.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {chips.map(c => (
            <span key={c.key} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, height: 26, padding: '0 4px 0 8px', background: 'var(--grey-100)', borderRadius: 'var(--radius-sm)', font: '500 12px/16px var(--font-sans)', color: 'var(--grey-800)' }}>
              {c.label}
              <button type="button" className="vb-chip-remove" aria-label={`Bỏ lọc ${c.label}`} onClick={() => onRemoveChip && onRemoveChip(c.key)}><Icon name="x" size={12} /></button>
            </span>
          ))}
          {onClearAll && <button type="button" className="vb-btn vb-btn--ghost vb-btn--sm" onClick={onClearAll}>Xoá bộ lọc</button>}
        </div>
      )}
    </div>
  );
}
