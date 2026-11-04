import React from 'react';
import { Icon } from '../core/Icon.jsx';

const META = {
  urgent: { label: 'Khẩn cấp', icon: 'triangle-alert' },
  order: { label: 'Cần đặt', icon: 'shopping-cart' },
  watch: { label: 'Theo dõi', icon: 'eye' },
};

export function PriorityChip({ priority = 'watch', label, size = 'md' }) {
  const m = META[priority] || META.watch;
  const lg = size === 'lg';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5, height: lg ? 28 : 22, padding: lg ? '0 10px 0 11px' : '0 8px 0 9px',
      font: lg ? '600 14px/20px var(--font-sans)' : '600 12px/16px var(--font-sans)', whiteSpace: 'nowrap',
      color: `var(--priority-${priority}-fg)`, background: `var(--priority-${priority}-bg)`, border: `1px solid var(--priority-${priority}-border)`,
      clipPath: 'polygon(var(--chamfer) 0,100% 0,100% 100%,0 100%,0 var(--chamfer))',
    }}>
      <Icon name={m.icon} size={lg ? 16 : 13} strokeWidth={2.25} />
      {label || m.label}
    </span>
  );
}
