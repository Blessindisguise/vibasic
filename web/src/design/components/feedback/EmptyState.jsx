import React from 'react';
import { Icon } from '../core/Icon.jsx';

export function EmptyState({ icon = 'package', title, description, action, size = 'md' }) {
  const lg = size === 'lg';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 12, padding: lg ? '48px 24px' : '32px 16px' }}>
      <span style={{ width: lg ? 56 : 44, height: lg ? 56 : 44, display: 'grid', placeItems: 'center', background: 'var(--grey-50)', border: '1px solid var(--border-default)', color: 'var(--grey-500)', clipPath: 'polygon(var(--chamfer) 0,100% 0,100% 100%,0 100%,0 var(--chamfer))' }}>
        <Icon name={icon} size={lg ? 26 : 22} />
      </span>
      <div style={{ font: lg ? 'var(--type-touch-heading)' : 'var(--type-section-title)', color: 'var(--text-primary)' }}>{title}</div>
      {description && <div style={{ font: lg ? 'var(--type-touch-body)' : 'var(--type-body)', color: 'var(--text-secondary)', maxWidth: 400, textWrap: 'pretty' }}>{description}</div>}
      {action && <div style={{ marginTop: 4 }}>{action}</div>}
    </div>
  );
}
