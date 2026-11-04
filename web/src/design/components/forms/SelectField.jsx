import React from 'react';
import { Icon } from '../core/Icon.jsx';

export function SelectField({ label, required = false, helper, error, size = 'md', options = [], placeholder, id, className = '', style, ...rest }) {
  const fid = id || React.useId();
  return (
    <div className={`vb-field ${className}`} style={style}>
      {label && <label htmlFor={fid} className="vb-field__label">{label}{required && <span className="req" aria-hidden="true">*</span>}</label>}
      <div className={`vb-input vb-input--${size}${error ? ' vb-input--error' : ''}`} style={{ position: 'relative' }}>
        <select id={fid} required={required} aria-invalid={!!error || undefined} {...rest}>
          {placeholder && <option value="">{placeholder}</option>}
          {options.map(o => typeof o === 'string' ? <option key={o} value={o}>{o}</option> : <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <Icon name="chevron-down" size={16} style={{ position: 'absolute', right: 10, pointerEvents: 'none', color: 'var(--text-secondary)' }} />
      </div>
      {(error || helper) && <div className={`vb-field__help${error ? ' vb-field__help--error' : ''}`}>{error || helper}</div>}
    </div>
  );
}
