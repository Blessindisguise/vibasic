import React from 'react';
import { Icon } from '../core/Icon.jsx';
import { useSuggest } from './Suggestions.jsx';

const MSG = {
  success: { icon: 'circle-check', color: 'var(--green-700)' },
  error: { icon: 'circle-x', color: 'var(--red-700)' },
  idle: { icon: 'info', color: 'var(--text-secondary)' },
};

export function ScanInput({ value = '', onChange, onSubmit, state = 'idle', message, label = 'Quét mã vạch', placeholder = 'Quét hoặc nhập mã…', onCamera, autoFocus = false, size = 'lg', scanKey = 0, suggestions = [], onPickSuggestion }) {
  const ref = React.useRef(null);
  const xl = size === 'lg';
  const m = MSG[state] || MSG.idle;
  const s = useSuggest({ items: suggestions, query: value, onPick: onPickSuggestion, size: xl ? 'lg' : 'md' });
  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit && onSubmit(value); }} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <label htmlFor="vb-scan" style={{ font: xl ? '600 15px/20px var(--font-sans)' : 'var(--type-label)', color: 'var(--text-primary)' }}>{label}</label>
      <div style={{ display: 'flex', gap: 8 }}>
        <div className="vb-suggest-anchor" style={{ flex: 1 }}>
          <div key={scanKey} className={`vb-input vb-scan vb-scan--${state}`} style={{ height: xl ? 'var(--control-scan)' : 'var(--control-lg)', borderWidth: 2, padding: '0 16px', gap: 12 }}>
            <Icon name="scan-barcode" size={xl ? 28 : 20} style={{ color: state === 'error' ? 'var(--red-600)' : 'var(--green-600)' }} />
            <input id="vb-scan" ref={ref} value={value} autoFocus={autoFocus} autoComplete="off" spellCheck={false} placeholder={placeholder}
              onChange={e => onChange && onChange(e.target.value)} aria-invalid={state === 'error' || undefined} aria-describedby={message ? 'vb-scan-msg' : undefined} {...s.inputProps}
              style={{ font: xl ? 'var(--type-scan)' : 'var(--type-body)', letterSpacing: 'var(--tracking-code)', fontVariantNumeric: 'tabular-nums' }} />
            {value && <button type="button" className="vb-chip-remove" aria-label="Xoá" onMouseDown={e => e.preventDefault()} onClick={() => { onChange && onChange(''); ref.current && ref.current.focus(); }} style={{ width: 32, height: 32 }}><Icon name="x" size={18} /></button>}
          </div>
          {s.list}
        </div>
        {onCamera && <button type="button" className="vb-btn vb-btn--secondary vb-btn--icon" aria-label="Quét bằng camera" onClick={onCamera} style={{ height: xl ? 'var(--control-scan)' : 'var(--control-lg)' }}><Icon name="camera" size={xl ? 26 : 20} /></button>}
      </div>
      {message && (
        <div id="vb-scan-msg" role={state === 'error' ? 'alert' : 'status'} style={{ display: 'flex', alignItems: 'center', gap: 8, font: xl ? '500 15px/22px var(--font-sans)' : 'var(--type-helper)', color: m.color }}>
          <Icon name={m.icon} size={xl ? 18 : 14} />{message}
        </div>
      )}
    </form>
  );
}
