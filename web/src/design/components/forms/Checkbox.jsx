import React from 'react';

export function Checkbox({ label, checked, indeterminate = false, size = 'md', onChange, disabled, ...rest }) {
  const ref = React.useRef(null);
  React.useEffect(() => { if (ref.current) ref.current.indeterminate = indeterminate; }, [indeterminate]);
  return (
    <label className={`vb-check${size === 'lg' ? ' vb-check--lg' : ''}`} style={size === 'lg' ? { minHeight: 'var(--touch-min)' } : undefined}>
      <input ref={ref} type="checkbox" checked={!!checked} onChange={onChange} disabled={disabled} aria-label={typeof label === 'string' ? undefined : rest['aria-label']} {...rest} />
      {label && <span style={{ color: disabled ? 'var(--text-disabled)' : undefined }}>{label}</span>}
    </label>
  );
}
