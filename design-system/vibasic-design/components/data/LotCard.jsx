import React from 'react';
import { Icon } from '../core/Icon.jsx';
import { StatusBadge } from '../status/StatusBadge.jsx';

const STATE = {
  next: { label: 'Lấy tiếp theo', border: 'var(--green-500)', bw: 2 },
  picking: { label: 'Đang lấy', border: 'var(--green-500)', bw: 2 },
  waiting: { label: 'Chờ', border: 'var(--border-default)', bw: 1 },
  done: { label: 'Đã đủ', border: 'var(--green-200)', bw: 1 },
  locked: { label: 'Lô đã khoá', border: 'var(--slate-900)', bw: 1 },
};

// One lot in a FIFO pick list. fifoOrder 1 = oldest = pick first.
export function LotCard({ fifoOrder, lotCode, productName, receivedAt, ageDays, location, available, toPick, picked = 0, unit = 'cái', state = 'waiting', size = 'md', onClick }) {
  const s = STATE[state] || STATE.waiting;
  const lg = size === 'lg';
  const pct = toPick ? Math.min(100, Math.round((picked / toPick) * 100)) : 0;
  const locked = state === 'locked';
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag type={onClick ? 'button' : undefined} onClick={onClick} className={onClick ? 'vb-clickable' : undefined} aria-current={state === 'picking' || state === 'next' ? 'true' : undefined}
      style={{ all: onClick ? 'unset' : undefined, boxSizing: 'border-box', display: 'flex', gap: lg ? 16 : 12, padding: lg ? 16 : 12, background: locked ? 'var(--grey-50)' : state === 'done' ? 'var(--green-50)' : '#fff', border: `${s.bw}px solid ${s.border}`, borderRadius: 'var(--radius-lg)', width: '100%', textAlign: 'left', cursor: onClick ? 'pointer' : undefined, opacity: locked ? .85 : 1 }}>
      <div style={{ flex: 'none', width: lg ? 52 : 40, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
        <span style={{ font: '600 10px/12px var(--font-sans)', letterSpacing: 'var(--tracking-overline)', color: 'var(--text-muted)' }}>FIFO</span>
        <span style={{ width: lg ? 44 : 34, height: lg ? 44 : 34, display: 'grid', placeItems: 'center', background: state === 'done' ? 'var(--green-500)' : fifoOrder === 1 && !locked ? 'var(--grey-900)' : '#fff', color: state === 'done' || (fifoOrder === 1 && !locked) ? '#fff' : 'var(--grey-800)', border: '1.5px solid ' + (state === 'done' ? 'var(--green-500)' : 'var(--grey-900)'), font: lg ? '600 20px/24px var(--font-sans)' : '600 16px/20px var(--font-sans)', fontVariantNumeric: 'tabular-nums', clipPath: 'polygon(var(--chamfer) 0,100% 0,100% 100%,0 100%,0 var(--chamfer))' }}>
          {state === 'done' ? <Icon name="check" size={lg ? 22 : 18} strokeWidth={2.5} /> : fifoOrder}
        </span>
      </div>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: lg ? 6 : 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span className="vb-code" style={{ font: lg ? '600 17px/24px var(--font-sans)' : '600 14px/20px var(--font-sans)', letterSpacing: 'var(--tracking-code)' }}>{lotCode}</span>
          {locked ? <StatusBadge status="locked" /> : (state === 'picking' || state === 'next') ? <span style={{ font: '600 12px/16px var(--font-sans)', color: 'var(--green-700)' }}>● {s.label}</span> : null}
        </div>
        {productName && <div style={{ font: lg ? 'var(--type-touch-body)' : 'var(--type-body)', color: 'var(--text-primary)' }}>{productName}</div>}
        <div style={{ display: 'flex', gap: lg ? 16 : 12, flexWrap: 'wrap', font: lg ? '400 14px/20px var(--font-sans)' : 'var(--type-helper)', color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
          {receivedAt && <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}><Icon name="calendar" size={14} />Nhập {receivedAt}{ageDays != null && ` · ${ageDays} ngày`}</span>}
          {location && <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}><Icon name="warehouse" size={14} />{location}</span>}
          {available != null && <span>Tồn lô: {available} {unit}</span>}
        </div>
        {toPick != null && !locked && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 2 }}>
            <div style={{ flex: 1, height: lg ? 8 : 6, background: 'var(--grey-100)', borderRadius: 1, overflow: 'hidden' }} role="progressbar" aria-valuenow={picked} aria-valuemax={toPick} aria-label="Đã quét">
              <div style={{ width: pct + '%', height: '100%', background: 'var(--green-500)', transition: 'width var(--duration-base) var(--ease-standard)' }} />
            </div>
            <span style={{ font: lg ? '600 16px/20px var(--font-sans)' : '600 13px/18px var(--font-sans)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{picked}/{toPick} <span style={{ fontWeight: 400, color: 'var(--text-secondary)' }}>{unit}</span></span>
          </div>
        )}
      </div>
    </Tag>
  );
}
