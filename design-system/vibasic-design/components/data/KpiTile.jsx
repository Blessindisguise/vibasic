import React from 'react';
import { Icon } from '../core/Icon.jsx';

const TONE = {
  neutral: ['var(--grey-50)', 'var(--grey-600)'],
  danger: ['var(--red-50)', 'var(--red-600)'],
  warning: ['var(--amber-50)', 'var(--amber-700)'],
  success: ['var(--green-50)', 'var(--green-600)'],
  info: ['var(--blue-50)', 'var(--blue-700)'],
};

// delta: { value: '+12%', direction: 'up'|'down', good: boolean }
export function KpiTile({ label, value, unit, icon, tone = 'neutral', delta, footnote, onClick, actionLabel }) {
  const [bg, fg] = TONE[tone] || TONE.neutral;
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag type={onClick ? 'button' : undefined} onClick={onClick} className={onClick ? 'vb-clickable' : undefined}
      style={{ all: onClick ? 'unset' : undefined, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 10, padding: 16, background: '#fff', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--elevation-card)', minWidth: 0, textAlign: 'left', cursor: onClick ? 'pointer' : undefined }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {icon && <span style={{ width: 32, height: 32, display: 'grid', placeItems: 'center', background: bg, color: fg, clipPath: 'polygon(var(--chamfer) 0,100% 0,100% 100%,0 100%,0 var(--chamfer))' }}><Icon name={icon} size={18} /></span>}
        <span style={{ font: 'var(--type-label)', color: 'var(--text-secondary)', flex: 1, minWidth: 0 }}>{label}</span>
        {onClick && <Icon name="chevron-right" size={16} style={{ color: 'var(--text-muted)' }} />}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
        <span style={{ font: 'var(--type-kpi)', fontVariantNumeric: 'tabular-nums', color: tone === 'danger' ? 'var(--red-700)' : 'var(--text-primary)' }}>{value}</span>
        {unit && <span style={{ font: 'var(--type-body)', color: 'var(--text-secondary)' }}>{unit}</span>}
        {delta && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, font: '600 12px/16px var(--font-sans)', fontVariantNumeric: 'tabular-nums', color: delta.good ? 'var(--green-700)' : 'var(--red-700)', marginLeft: 4 }}>
            <Icon name={delta.direction === 'down' ? 'trending-down' : 'trending-up'} size={14} />{delta.value}
          </span>
        )}
      </div>
      {footnote && <div style={{ font: 'var(--type-helper)', color: 'var(--text-secondary)' }}>{footnote}</div>}
    </Tag>
  );
}
