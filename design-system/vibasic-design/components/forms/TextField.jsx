import React from 'react';
import { Icon } from '../core/Icon.jsx';

export function TextField({ label, required = false, helper, error, size = 'md', icon, suffix, multiline = false, disabled = false, id, className = '', style, inputStyle, ...rest }) {
  const fid = id || React.useId();
  const desc = error || helper ? fid + '-desc' : undefined;
  const Tag = multiline ? 'textarea' : 'input';
  return (
    <div className={`vb-field ${className}`} style={style}>
      {label && <label htmlFor={fid} className="vb-field__label">{label}{required && <span className="req" aria-hidden="true">*</span>}</label>}
      <div className={`vb-input vb-input--${size}${multiline ? ' vb-input--textarea' : ''}${error ? ' vb-input--error' : ''}${disabled ? ' vb-input--disabled' : ''}`}>
        {icon && <Icon name={icon} size={size === 'lg' || size === 'xl' ? 20 : 16} style={{ color: 'var(--text-muted)' }} />}
        <Tag id={fid} required={required} disabled={disabled} aria-invalid={!!error || undefined} aria-describedby={desc} style={inputStyle} {...rest} />
        {suffix && <span style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{suffix}</span>}
      </div>
      {(error || helper) && (
        <div id={desc} className={`vb-field__help${error ? ' vb-field__help--error' : ''}`}>
          {error && <Icon name="circle-x" size={14} style={{ marginTop: 1 }} />}{error || helper}
        </div>
      )}
    </div>
  );
}
