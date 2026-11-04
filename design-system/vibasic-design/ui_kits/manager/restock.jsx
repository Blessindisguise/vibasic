const R = window.VB;

function DaysCell({ r }) {
  const days = r.stock / r.d, lead = SUPPLIERS[r.sup].lead;
  const pct = Math.min(100, (days / (lead * 2)) * 100);
  const short = days < lead;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
      <div title={`Thời gian giao: ${lead} ngày`} style={{ position: 'relative', width: 56, height: 6, background: 'var(--grey-100)' }}>
        <div style={{ width: pct + '%', height: '100%', background: short ? 'var(--red-600)' : 'var(--grey-500)' }} />
        <div style={{ position: 'absolute', left: '50%', top: -3, bottom: -3, width: 1.5, background: 'var(--grey-900)' }} />
      </div>
      <span style={{ width: 32, textAlign: 'right', fontWeight: 600, color: short ? 'var(--red-700)' : undefined }}>{fmt(days, 1)}</span>
    </div>
  );
}

function QtyInput({ value, onChange, unit, changed }) {
  return (
    <div className="vb-input vb-input--sm" style={{ width: 104, marginLeft: 'auto', background: changed ? 'var(--amber-50)' : '#fff', borderColor: changed ? 'var(--amber-500)' : undefined, padding: '0 8px' }}>
      <input value={value === 0 ? '' : fmt(value)} placeholder="—" inputMode="numeric" aria-label="Số lượng đề xuất"
        onChange={e => { const n = parseInt(e.target.value.replace(/\D/g, ''), 10); onChange(isNaN(n) ? 0 : n); }}
        style={{ textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums', font: '600 13px/18px var(--font-sans)' }} />
      <span style={{ font: 'var(--type-helper)', color: 'var(--text-secondary)' }}>{unit}</span>
    </div>
  );
}

function RestockProposal({ toast }) {
  const [rows, setRows] = React.useState(RESTOCK.map(r => ({ ...r, orig: r.qty })));
  const [q, setQ] = React.useState('');
  const [prio, setPrio] = React.useState('');
  const [sup, setSup] = React.useState('');
  const [sel, setSel] = React.useState(RESTOCK.filter(r => r.p === 'urgent').map(r => r.id));
  const [ordered, setOrdered] = React.useState([]);

  const counts = { urgent: 0, order: 0, watch: 0 };
  rows.forEach(r => counts[r.p]++);
  const vis = rows.filter(r => (!prio || r.p === prio) && (!sup || r.sup === sup) && (!q || (r.id + r.name).toLowerCase().includes(q.toLowerCase())));
  const setQty = (id, v) => setRows(rs => rs.map(r => r.id === id ? { ...r, qty: v } : r));
  const order = ids => {
    const items = rows.filter(r => ids.includes(r.id) && r.qty > 0);
    const sups = [...new Set(items.map(r => r.sup))];
    setOrdered(o => [...o, ...items.map(r => r.id)]);
    setSel([]);
    toast({ tone: 'success', title: `Đã tạo ${sups.length} đơn đặt hàng nháp`, message: `${items.length} mặt hàng · ${sups.map(s => SUPPLIERS[s].name).join(', ')}` });
  };

  const chips = [];
  if (prio) chips.push({ key: 'prio', label: 'Ưu tiên: ' + { urgent: 'Khẩn cấp', order: 'Cần đặt', watch: 'Theo dõi' }[prio] });
  if (sup) chips.push({ key: 'sup', label: 'NCC: ' + SUPPLIERS[sup].name });

  const PrioTab = ({ k, label }) => (
    <button type="button" onClick={() => setPrio(prio === k ? '' : k)} aria-pressed={prio === k} className="vb-clickable"
      style={{ all: 'unset', boxSizing: 'border-box', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: '#fff', border: prio === k ? '2px solid var(--grey-900)' : '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', minWidth: 180 }}>
      <R.PriorityChip priority={k} />
      <span style={{ font: '600 20px/28px var(--font-sans)', fontVariantNumeric: 'tabular-nums' }}>{counts[k]}</span>
      <span style={{ font: 'var(--type-helper)', color: 'var(--text-secondary)' }}>{label}</span>
    </button>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 1440 }}>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'stretch' }}>
        <PrioTab k="urgent" label="hết trước khi hàng về" />
        <PrioTab k="order" label="dưới ROP" />
        <PrioTab k="watch" label="gần ROP" />
        <div style={{ marginLeft: 'auto', alignSelf: 'center', font: 'var(--type-helper)', color: 'var(--text-secondary)', maxWidth: 420, textAlign: 'right', textWrap: 'pretty' }}>
          <b style={{ color: 'var(--text-primary)', fontWeight: 600 }}>ROP</b> = nhu cầu TB/ngày × thời gian giao + tồn an toàn · <b style={{ color: 'var(--text-primary)', fontWeight: 600 }}>EOQ</b> = √(2 × nhu cầu năm × phí đặt hàng ÷ phí lưu kho). Dữ liệu 12 tuần.
        </div>
      </div>

      <R.FilterBar search={q} onSearchChange={setQ} searchPlaceholder="Tìm mã hoặc tên sản phẩm…"
        filters={[
          { key: 'sup', label: 'Nhà cung cấp', value: sup, options: Object.entries(SUPPLIERS).map(([k, s]) => ({ value: k, label: s.name })) },
          { key: 'prio', label: 'Ưu tiên', value: prio, options: [{ value: 'urgent', label: 'Khẩn cấp' }, { value: 'order', label: 'Cần đặt' }, { value: 'watch', label: 'Theo dõi' }] },
        ]}
        onFilterChange={(k, v) => k === 'sup' ? setSup(v) : setPrio(v)}
        chips={chips} onRemoveChip={k => k === 'sup' ? setSup('') : setPrio('')} onClearAll={() => { setSup(''); setPrio(''); }}
        resultCount={vis.length} />

      <R.DataTable rowKey="id" selectable selected={sel} onSelectedChange={setSel} maxHeight="calc(100vh - 330px)"
        bulkActions={<R.Button size="sm" icon="send" onClick={() => order(sel)}>Tạo đơn đặt hàng ({sel.length})</R.Button>}
        groupBy="sup"
        groupHeader={(g, rs) => {
          const s = SUPPLIERS[g];
          const n = rs.filter(r => r.qty > 0 && !ordered.includes(r.id)).length;
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <R.Icon name="factory" size={16} style={{ color: 'var(--text-secondary)' }} />
              <span style={{ font: 'var(--type-body-strong)' }}>{s.name}</span>
              <span style={{ font: 'var(--type-helper)', color: 'var(--text-secondary)', fontWeight: 400 }}>Giao {s.lead} ngày · {s.contact}</span>
              <span style={{ marginLeft: 'auto', font: 'var(--type-helper)', color: 'var(--text-secondary)', fontWeight: 400 }}>{n} mặt hàng cần đặt</span>
              <R.Button size="sm" variant="secondary" disabled={!n} onClick={() => order(rs.map(r => r.id))}>Tạo đơn cho NCC này</R.Button>
            </div>
          );
        }}
        columns={[
          { key: 'name', header: 'Sản phẩm', render: r => <div><div style={{ fontWeight: 500 }}>{r.name}</div><div className="vb-code" style={{ font: 'var(--type-helper)', color: 'var(--text-secondary)' }}>{r.id}</div></div> },
          { key: 'stock', header: 'Tồn', numeric: true, width: 64, render: r => fmt(r.stock) },
          { key: 'inc', header: 'Đang về', numeric: true, width: 72, render: r => r.inc ? fmt(r.inc) : <span style={{ color: 'var(--text-muted)' }}>0</span> },
          { key: 'rop', header: 'ROP', numeric: true, width: 60, render: r => fmt(r.rop) },
          { key: 'eoq', header: 'EOQ', numeric: true, width: 64, render: r => fmt(r.eoq) },
          { key: 'days', header: 'Còn (ngày)', numeric: true, width: 124, render: r => <DaysCell r={r} /> },
          { key: 'p', header: 'Ưu tiên', width: 108, render: r => <R.PriorityChip priority={r.p} /> },
          { key: 'qty', header: 'SL đề xuất', numeric: true, width: 124, render: r => ordered.includes(r.id) ? <R.StatusBadge status="info" label="Đã tạo đơn" icon="send" /> : <QtyInput value={r.qty} unit={r.unit} changed={r.qty !== r.orig} onChange={v => setQty(r.id, v)} /> },
          { key: 'reason', header: 'Lý do điều chỉnh', width: '26%', render: r => (
            <div style={{ font: 'var(--type-helper)', color: r.qty !== r.orig ? 'var(--amber-700)' : 'var(--text-secondary)', padding: '6px 0', textWrap: 'pretty' }}>
              {r.qty !== r.orig ? `Quản lý sửa ${fmt(r.orig)} → ${fmt(r.qty)}.` : r.reason}
            </div>) },
        ]}
        rows={vis} />
    </div>
  );
}

window.RestockProposal = RestockProposal;
