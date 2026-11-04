import React from 'react';
import { Icon } from './Icon.jsx';

const ICON_SIZE = { sm: 16, md: 18, lg: 20, xl: 22 };

export function IconButton({ icon, label, variant = 'ghost', size = 'md', badge, className = '', ...rest }) {
  return (
    <button type="button" aria-label={label} title={label}
      className={`vb-btn vb-btn--${variant} vb-btn--${size} vb-btn--icon ${className}`} style={{ position: 'relative' }} {...rest}>
      <Icon name={icon} size={ICON_SIZE[size]} />
      {badge != null && (
        <span style={{ position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, padding: '0 5px', borderRadius: 'var(--radius-full)', background: 'var(--red-600)', color: '#fff', font: '600 11px/18px var(--font-sans)', fontVariantNumeric: 'tabular-nums', boxShadow: '0 0 0 2px #fff' }}>{badge}</span>
      )}
    </button>
  );
}
