import React from 'react';
import { Icon } from './Icon.jsx';

const ICON_SIZE = { sm: 16, md: 18, lg: 20, xl: 22 };

export function Button({ variant = 'primary', size = 'md', icon, iconRight, loading = false, fullWidth = false, disabled = false, type = 'button', children, className = '', ...rest }) {
  const is = ICON_SIZE[size];
  return (
    <button type={type} disabled={disabled || loading} aria-busy={loading || undefined}
      className={`vb-btn vb-btn--${variant} vb-btn--${size}${fullWidth ? ' vb-btn--full' : ''} ${className}`} {...rest}>
      {loading ? <Icon name="refresh-cw" size={is} /> : icon ? <Icon name={icon} size={is} /> : null}
      {children}
      {iconRight && <Icon name={iconRight} size={is} />}
    </button>
  );
}
