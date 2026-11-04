import React from 'react';
import { Icon } from '../core/Icon.jsx';

const TONE = { success: ['circle-check', 'var(--green-300)'], danger: ['circle-x', '#F59E96'], info: ['info', '#9CC3F2'], warning: ['triangle-alert', 'var(--amber-200)'] };

export function Toast({ tone = 'success', title, message, action, onClose }) {
  const [icon, ic] = TONE[tone] || TONE.info;
  return (
    <div className="vb-toast" role="status" aria-live="polite" style={{ display: 'flex', alignItems: 'flex-start', gap: 12, width: 360, maxWidth: '100%', padding: '12px 12px 12px 14px', background: 'var(--surface-inverse)', color: '#fff', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--elevation-toast)' }}>
      <Icon name={icon} size={20} style={{ color: ic }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ font: 'var(--type-body-strong)' }}>{title}</div>
        {message && <div style={{ font: 'var(--type-helper)', color: 'var(--grey-300)', marginTop: 2 }}>{message}</div>}
      </div>
      {action && <button type="button" onClick={action.onClick} style={{ all: 'unset', cursor: 'pointer', font: '600 13px/20px var(--font-sans)', color: 'var(--green-200)', padding: '0 4px' }}>{action.label}</button>}
      {onClose && <button type="button" aria-label="Đóng" onClick={onClose} style={{ all: 'unset', cursor: 'pointer', color: 'var(--grey-400)', display: 'grid', placeItems: 'center', width: 20, height: 20 }}><Icon name="x" size={16} /></button>}
    </div>
  );
}
