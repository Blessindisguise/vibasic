import React from 'react';
import { Icon } from '../core/Icon.jsx';

export function QuantityStepper({ value = 0, onChange, min = 0, max = Infinity, step = 1, unit, size = 'md', label, disabled = false }) {
  const lg = size === 'lg';
  const h = lg ? 'var(--control-xl)' : 'var(--control-md)';
  const set = v => onChange && onChange(Math.max(min, Math.min(max, v)));
  const btn = (dir, dis) => (
    <button type="button" className="vb-btn vb-btn--secondary vb-btn--icon" disabled={disabled || dis}
      aria-label={dir < 0 ? 'Giảm' : 'Tăng'} onClick={() => set(value + dir * step)}
      style={{ height: h, borderRadius: dir < 0 ? 'var(--radius-control) 0 0 var(--radius-control)' : '0 var(--radius-control) var(--radius-control) 0' }}>
      <Icon name={dir < 0 ? 'minus' : 'plus'} size={lg ? 22 : 16} />
    </button>
  );
  return (
    <div role="group" aria-label={label || 'Số lượng'} style={{ display: 'inline-flex', alignItems: 'stretch' }}>
      {btn(-1, value <= min)}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, height: h, borderTop: '1px solid var(--border-strong)', borderBottom: '1px solid var(--border-strong)', background: disabled ? 'var(--grey-50)' : '#fff', padding: '0 8px' }}>
        <input type="text" inputMode="numeric" value={value} disabled={disabled} aria-label={label || 'Số lượng'}
          onChange={e => { const n = parseInt(e.target.value.replace(/\D/g, ''), 10); set(isNaN(n) ? min : n); }}
          style={{ width: lg ? 64 : 44, border: 0, outline: 0, background: 'transparent', textAlign: 'center', font: lg ? 'var(--type-touch-heading)' : 'var(--type-body-strong)', fontVariantNumeric: 'tabular-nums', color: 'var(--text-primary)' }} />
        {unit && <span style={{ font: lg ? 'var(--type-touch-body)' : 'var(--type-helper)', color: 'var(--text-secondary)' }}>{unit}</span>}
      </div>
      {btn(1, value >= max)}
    </div>
  );
}
