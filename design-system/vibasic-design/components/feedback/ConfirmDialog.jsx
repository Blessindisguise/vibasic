import React from 'react';
import { Icon } from '../core/Icon.jsx';

// Approve/reject confirmation. When requireReason is true, confirm is blocked until a reason (≥ minReason chars) is entered.
export function ConfirmDialog({ open = true, tone = 'primary', title, description, children, requireReason = false, reasonLabel = 'Lý do', reasonPlaceholder = 'Nhập lý do để người lập phiếu biết cần sửa gì…', minReason = 5, confirmLabel = 'Xác nhận', cancelLabel = 'Huỷ', onConfirm, onCancel, inline = false }) {
  const [reason, setReason] = React.useState('');
  const [tried, setTried] = React.useState(false);
  if (!open) return null;
  const invalid = requireReason && reason.trim().length < minReason;
  const danger = tone === 'danger';
  const submit = () => { setTried(true); if (!invalid) onConfirm && onConfirm(reason.trim()); };
  const dialog = (
    <div role="dialog" aria-modal={!inline} aria-labelledby="vb-dlg-t" style={{ width: 480, maxWidth: '100%', background: '#fff', borderRadius: 'var(--radius-dialog)', boxShadow: 'var(--elevation-dialog)', overflow: 'hidden', border: inline ? '1px solid var(--border-default)' : 0 }}>
      <div style={{ display: 'flex', gap: 14, padding: '20px 20px 0' }}>
        <span style={{ width: 36, height: 36, flex: 'none', display: 'grid', placeItems: 'center', background: danger ? 'var(--red-50)' : 'var(--green-50)', color: danger ? 'var(--red-600)' : 'var(--green-600)', borderRadius: 'var(--radius-md)' }}>
          <Icon name={danger ? 'circle-x' : 'circle-check'} size={20} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div id="vb-dlg-t" style={{ font: 'var(--type-section-title)', fontSize: 17 }}>{title}</div>
          {description && <div style={{ font: 'var(--type-body)', color: 'var(--text-secondary)', marginTop: 4, textWrap: 'pretty' }}>{description}</div>}
        </div>
      </div>
      <div style={{ padding: '16px 20px 0 70px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {children}
        {requireReason && (
          <div className="vb-field">
            <label htmlFor="vb-dlg-r" className="vb-field__label">{reasonLabel}<span className="req" aria-hidden="true">*</span></label>
            <div className={`vb-input vb-input--textarea${tried && invalid ? ' vb-input--error' : ''}`}>
              <textarea id="vb-dlg-r" value={reason} onChange={e => setReason(e.target.value)} placeholder={reasonPlaceholder} aria-invalid={tried && invalid || undefined} />
            </div>
            <div className={`vb-field__help${tried && invalid ? ' vb-field__help--error' : ''}`}>
              {tried && invalid ? <><Icon name="circle-x" size={14} style={{ marginTop: 1 }} />Bắt buộc nhập lý do (tối thiểu {minReason} ký tự).</> : 'Lý do sẽ được lưu vào lịch sử phiếu.'}
            </div>
          </div>
        )}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: 20, marginTop: 4 }}>
        <button type="button" className="vb-btn vb-btn--secondary vb-btn--md" onClick={onCancel}>{cancelLabel}</button>
        <button type="button" className={`vb-btn vb-btn--${danger ? 'danger' : 'primary'} vb-btn--md`} onClick={submit}>{confirmLabel}</button>
      </div>
    </div>
  );
  if (inline) return dialog;
  return (
    <div onClick={e => e.target === e.currentTarget && onCancel && onCancel()} style={{ position: 'fixed', inset: 0, zIndex: 'var(--z-dialog)', background: 'var(--surface-overlay)', display: 'grid', placeItems: 'center', padding: 16 }}>
      {dialog}
    </div>
  );
}
