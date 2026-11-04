import React from 'react';
import { Icon } from '../core/Icon.jsx';

const TONE = {
  info: { icon: 'info', fg: 'var(--status-info-fg)', bg: 'var(--status-info-bg)', bd: 'var(--status-info-border)', ic: 'var(--blue-500)' },
  warning: { icon: 'triangle-alert', fg: 'var(--amber-700)', bg: 'var(--amber-50)', bd: 'var(--amber-200)', ic: 'var(--amber-700)' },
  danger: { icon: 'octagon-alert', fg: 'var(--red-700)', bg: 'var(--red-50)', bd: 'var(--red-200)', ic: 'var(--red-600)' },
  success: { icon: 'circle-check', fg: 'var(--green-800)', bg: 'var(--green-50)', bd: 'var(--green-200)', ic: 'var(--green-600)' },
};

export function AlertBanner({ tone = 'info', title, children, action, onDismiss, icon }) {
  const t = TONE[tone] || TONE.info;
  return (
    <div role={tone === 'danger' ? 'alert' : 'status'} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px', background: t.bg, border: `1px solid ${t.bd}`, borderRadius: 'var(--radius-md)', color: t.fg }}>
      <Icon name={icon || t.icon} size={20} style={{ color: t.ic, marginTop: 0 }} />
      <div style={{ flex: 1, minWidth: 0, font: 'var(--type-body)' }}>
        {title && <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{title}</div>}
        {children && <div style={{ color: 'var(--text-primary)', opacity: .9 }}>{children}</div>}
      </div>
      {action && <div style={{ flex: 'none', alignSelf: 'center' }}>{action}</div>}
      {onDismiss && <button type="button" className="vb-chip-remove" aria-label="Đóng" onClick={onDismiss} style={{ width: 24, height: 24 }}><Icon name="x" size={16} /></button>}
    </div>
  );
}
