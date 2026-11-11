import React from 'react';
import { Icon } from '../core/Icon.jsx';

// columns: [{ key, header, align: 'left'|'right'|'center', numeric, width, render(row), sortable }]
// groupBy: optional key; renders a full-width group header row (e.g. supplier) with groupHeader(groupValue, rows).
// isRowSelectable: optional; rows it rejects get no checkbox and are left out of "select all".
export function DataTable({ columns = [], rows = [], rowKey = 'id', density = 'compact', selectable = false, isRowSelectable, selected = [], onSelectedChange, bulkActions, maxHeight, groupBy, groupHeader, onRowClick, sort, onSortChange, empty, caption }) {
  const canSelect = r => !isRowSelectable || isRowSelectable(r);
  const allIds = rows.filter(canSelect).map(r => r[rowKey]);
  const allOn = selectable && allIds.length > 0 && allIds.every(id => selected.includes(id));
  const someOn = selectable && selected.length > 0 && !allOn;
  const headRef = React.useRef(null);
  React.useEffect(() => { if (headRef.current) headRef.current.indeterminate = someOn; }, [someOn]);
  const toggle = id => onSelectedChange && onSelectedChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id]);
  const toggleAll = () => onSelectedChange && onSelectedChange(allOn ? [] : allIds);
  const colCount = columns.length + (selectable ? 1 : 0);

  const groups = [];
  if (groupBy) { const m = new Map(); rows.forEach(r => { const g = r[groupBy]; if (!m.has(g)) { m.set(g, []); groups.push([g, m.get(g)]); } m.get(g).push(r); }); }
  else groups.push([null, rows]);

  const renderRow = r => {
    const id = r[rowKey]; const on = selected.includes(id);
    return (
      <tr key={id} aria-selected={selectable ? on : undefined} onClick={onRowClick ? () => onRowClick(r) : undefined} style={{ cursor: onRowClick ? 'pointer' : undefined }}>
        {selectable && <td className="sel" onClick={e => e.stopPropagation()}>{canSelect(r) && <label className="vb-check"><input type="checkbox" checked={on} onChange={() => toggle(id)} aria-label="Chọn dòng" /></label>}</td>}
        {columns.map(c => <td key={c.key} className={c.numeric || c.align === 'right' ? 'num' : ''} style={{ textAlign: c.align === 'center' ? 'center' : undefined, width: c.width }}>{c.render ? c.render(r) : r[c.key]}</td>)}
      </tr>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
      {selectable && selected.length > 0 && bulkActions && (
        <div role="region" aria-label="Thao tác hàng loạt" style={{ display: 'flex', alignItems: 'center', gap: 12, height: 44, padding: '0 8px 0 14px', background: 'var(--green-50)', border: '1px solid var(--green-200)', borderRadius: 'var(--radius-md)' }}>
          <span style={{ font: 'var(--type-body-strong)', color: 'var(--green-800)', fontVariantNumeric: 'tabular-nums' }}>Đã chọn {selected.length}</span>
          <button type="button" className="vb-btn vb-btn--ghost vb-btn--sm" onClick={() => onSelectedChange([])}>Bỏ chọn</button>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>{bulkActions}</div>
        </div>
      )}
      <div className="vb-table-wrap" style={{ maxHeight }}>
        <table className={`vb-table vb-table--${density}`}>
          {caption && <caption style={{ position: 'absolute', left: -9999 }}>{caption}</caption>}
          <thead>
            <tr>
              {selectable && <th className="sel"><label className="vb-check"><input ref={headRef} type="checkbox" checked={allOn} onChange={toggleAll} aria-label="Chọn tất cả" /></label></th>}
              {columns.map(c => {
                const active = sort && sort.key === c.key;
                return (
                  <th key={c.key} className={c.numeric || c.align === 'right' ? 'num' : ''} style={{ width: c.width, textAlign: c.align === 'center' ? 'center' : undefined }} aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}>
                    {c.sortable ? (
                      <button type="button" className="vb-sort" onClick={() => onSortChange && onSortChange({ key: c.key, dir: active && sort.dir === 'desc' ? 'asc' : 'desc' })} style={{ color: active ? 'var(--text-primary)' : undefined }}>
                        {c.header}<Icon name={active ? (sort.dir === 'asc' ? 'chevron-up' : 'chevron-down') : 'arrow-up-down'} size={12} />
                      </button>
                    ) : c.header}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={colCount} style={{ height: 'auto' }}>{empty || <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-secondary)' }}>Không có dữ liệu</div>}</td></tr>}
            {groups.map(([g, rs]) => (
              <React.Fragment key={String(g)}>
                {groupBy && <tr className="vb-group"><td colSpan={colCount}>{groupHeader ? groupHeader(g, rs) : g}</td></tr>}
                {rs.map(renderRow)}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
