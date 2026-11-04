import React from 'react';
import { Icon } from '../core/Icon.jsx';

export const STATUS_META = {
  draft: { label: 'Nháp', icon: 'square-pen' },
  pending: { label: 'Chờ duyệt', icon: 'hourglass' },
  approved: { label: 'Đã duyệt', icon: 'circle-check' },
  rejected: { label: 'Từ chối', icon: 'circle-x' },
  hold: { label: 'Tạm hoãn', icon: 'circle-pause' },
  locked: { label: 'Lô đã khoá', icon: 'lock' },
  info: { label: 'Đang xử lý', icon: 'refresh-cw' },
};

export function StatusBadge({ status = 'draft', label, size = 'md', icon }) {
  const m = STATUS_META[status] || STATUS_META.draft;
  const lg = size === 'lg';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: lg ? 6 : 5, height: lg ? 28 : 22, padding: lg ? '0 10px' : '0 7px',
      borderRadius: 'var(--radius-badge)', font: lg ? '600 14px/20px var(--font-sans)' : '600 12px/16px var(--font-sans)', whiteSpace: 'nowrap',
      color: `var(--status-${status}-fg)`, background: `var(--status-${status}-bg)`, border: `1px solid var(--status-${status}-border)`,
    }}>
      <Icon name={icon || m.icon} size={lg ? 16 : 13} strokeWidth={2.25} />
      {label || m.label}
    </span>
  );
}
