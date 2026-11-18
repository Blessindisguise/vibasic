import React from 'react';
import { Icon } from '../core/Icon.jsx';

// Draft → Pending → Approved | Rejected. `history` carries who/when per step; `labels` renames the last two steps.
export function ApprovalStepper({ status = 'draft', history = {}, size = 'md', orientation = 'horizontal', draftLabel = 'Nháp', labels = {} }) {
  const order = ['draft', 'pending', 'final'];
  const idx = status === 'draft' ? 0 : status === 'pending' ? 1 : 2;
  const rejected = status === 'rejected';
  const steps = [
    { key: 'draft', label: draftLabel, icon: 'square-pen' },
    { key: 'pending', label: labels.pending ?? 'Chờ duyệt', icon: 'hourglass' },
    rejected ? { key: 'rejected', label: labels.rejected ?? 'Từ chối', icon: 'x' } : { key: 'approved', label: labels.approved ?? 'Đã duyệt', icon: 'check' },
  ];
  const lg = size === 'lg';
  const node = lg ? 32 : 24;
  const vertical = orientation === 'vertical';
  return (
    <ol aria-label="Tiến trình duyệt" style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: vertical ? 'column' : 'row', gap: vertical ? 0 : 0 }}>
      {steps.map((s, i) => {
        const done = i < idx || (i === 2 && idx === 2);
        const current = i === idx && idx < 2;
        const bad = i === 2 && rejected;
        const bg = bad ? 'var(--red-600)' : done ? 'var(--green-500)' : current ? 'var(--amber-50)' : '#fff';
        const bd = bad ? 'var(--red-600)' : done ? 'var(--green-500)' : current ? 'var(--amber-500)' : 'var(--grey-300)';
        const fg = bad || done ? '#fff' : current ? 'var(--amber-700)' : 'var(--grey-400)';
        const h = history[s.key] || {};
        const last = i === steps.length - 1;
        return (
          <li key={s.key} aria-current={current ? 'step' : undefined} style={{ flex: last || vertical ? 'none' : 1, display: 'flex', flexDirection: vertical ? 'row' : 'column', gap: vertical ? 12 : 8, minWidth: 0 }}>
            <div style={{ display: 'flex', flexDirection: vertical ? 'column' : 'row', alignItems: 'center' }}>
              <span style={{ width: node, height: node, flex: 'none', display: 'grid', placeItems: 'center', background: bg, border: `2px solid ${bd}`, color: fg, borderRadius: 'var(--radius-sm)' }}>
                <Icon name={done && !bad && i < 2 ? 'check' : s.icon} size={lg ? 16 : 13} strokeWidth={2.5} />
              </span>
              {!last && <span style={{ flex: 1, [vertical ? 'width' : 'height']: 2, [vertical ? 'minHeight' : 'minWidth']: 24, background: i < idx ? 'var(--green-500)' : 'var(--grey-200)', margin: vertical ? '4px 0' : '0 8px' }} />}
            </div>
            <div style={{ paddingRight: vertical ? 0 : 12, paddingBottom: vertical && !last ? 12 : 0, minWidth: 0 }}>
              <div style={{ font: lg ? '600 15px/20px var(--font-sans)' : '600 13px/18px var(--font-sans)', color: bad ? 'var(--red-700)' : done || current ? 'var(--text-primary)' : 'var(--text-muted)' }}>{s.label}</div>
              {(h.by || h.at) && <div style={{ font: 'var(--type-helper)', color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>{[h.by, h.at].filter(Boolean).join(' · ')}</div>}
              {h.note && <div style={{ font: 'var(--type-helper)', color: bad ? 'var(--red-700)' : 'var(--text-secondary)', marginTop: 2 }}>“{h.note}”</div>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
