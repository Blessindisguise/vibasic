interface Option<T extends string> { value: T; label: string; count?: number }

/** Segmented control / tabs: grey track, the selected segment is white. */
export function Segmented<T extends string>({ options, value, onChange, size = 'md', label }: {
  options: Option<T>[]; value: T; onChange: (v: T) => void; size?: 'md' | 'lg'; label: string;
}) {
  return (
    <div role="tablist" aria-label={label} className={`vb-seg vb-seg--${size}`}>
      {options.map(o => (
        <button key={o.value} type="button" role="tab" aria-selected={o.value === value} className="vb-seg__item" onClick={() => onChange(o.value)}>
          {o.label}
          {o.count != null && <span className="vb-seg__count">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}
