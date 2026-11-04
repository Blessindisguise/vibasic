const { KpiTile, DataTable, StatusBadge, PriorityChip, Button, IconButton, Icon, AlertBanner } = window.VB;

function Panel({ title, meta, action, children, pad = true }) {
  return (
    <section style={{ background: '#fff', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
        <h2 style={{ margin: 0, font: 'var(--type-section-title)' }}>{title}</h2>
        {meta && <span style={{ font: 'var(--type-helper)', color: 'var(--text-secondary)' }}>{meta}</span>}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>{action}</div>
      </header>
      <div style={{ padding: pad ? 16 : 0, flex: 1, minHeight: 0 }}>{children}</div>
    </section>
  );
}

const ALERT_TONE = {
  danger: ['var(--red-50)', 'var(--red-600)'], warning: ['var(--amber-50)', 'var(--amber-700)'], locked: ['var(--slate-900)', '#fff'],
};

function MovementChart({ data }) {
  const max = Math.max(...data.flatMap(d => [d.in, d.out]));
  const tIn = data.reduce((s, d) => s + d.in, 0), tOut = data.reduce((s, d) => s + d.out, 0);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 24 }}>
        {[['Nhập', tIn, 'var(--green-500)'], ['Xuất', tOut, 'var(--grey-700)']].map(([l, v, c]) => (
          <div key={l} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, font: 'var(--type-helper)', color: 'var(--text-secondary)' }}><span style={{ width: 10, height: 10, background: c }} />{l} 7 ngày</span>
            <span style={{ font: '600 20px/28px var(--font-sans)', fontVariantNumeric: 'tabular-nums' }}>{fmt(v)} <span style={{ font: 'var(--type-helper)', color: 'var(--text-secondary)' }}>đơn vị</span></span>
          </div>
        ))}
      </div>
      <div role="img" aria-label={`Nhập ${tIn}, xuất ${tOut} trong 7 ngày`} style={{ display: 'grid', gridTemplateColumns: `repeat(${data.length},1fr)`, gap: 10, height: 132, alignItems: 'end', borderBottom: '1px solid var(--border-default)' }}>
        {data.map((d, i) => (
          <div key={i} title={`${d.date}: nhập ${d.in}, xuất ${d.out}`} style={{ display: 'flex', gap: 3, alignItems: 'end', height: '100%', justifyContent: 'center' }}>
            <div style={{ width: 12, height: `${(d.in / max) * 100}%`, minHeight: d.in ? 2 : 0, background: 'var(--green-500)' }} />
            <div style={{ width: 12, height: `${(d.out / max) * 100}%`, background: 'var(--grey-700)' }} />
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${data.length},1fr)`, gap: 10, marginTop: -6 }}>
        {data.map((d, i) => <span key={i} style={{ textAlign: 'center', font: 'var(--type-helper)', color: i === data.length - 1 ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: i === data.length - 1 ? 600 : 400, fontVariantNumeric: 'tabular-nums' }}>{d.date}</span>)}
      </div>
    </div>
  );
}

function Dashboard({ pending, onApprove, onReject, onNavigate }) {
  const below = RESTOCK.filter(r => r.p !== 'watch').sort((a, b) => a.stock / a.d - b.stock / b.d);
  const urgent = below.filter(r => r.p === 'urgent').length;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 1440 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 12 }}>
        <KpiTile icon="triangle-alert" tone="danger" label="Dưới điểm đặt hàng" value={below.length} unit="mặt hàng" footnote={`${urgent} khẩn cấp · tính lại 06:00 hôm nay`} onClick={() => onNavigate('restock')} />
        <KpiTile icon="hourglass" tone="warning" label="Phiếu chờ duyệt" value={pending.length} unit="phiếu" footnote="Cũ nhất: 19 giờ trước" onClick={() => onNavigate('approvals')} />
        <KpiTile icon="bell" tone="info" label="Cảnh báo đang mở" value={ALERTS.length} footnote="2 tồn kho · 1 lô · 2 vận hành" onClick={() => onNavigate('alerts')} />
        <KpiTile icon="package-minus" label="Xuất kho 7 ngày" value={fmt(1722)} unit="đơn vị" delta={{ value: '8,4%', direction: 'up', good: true }} footnote="So với 7 ngày trước" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,2fr) minmax(320px,1fr)', gap: 16, alignItems: 'start' }}>
        <Panel title="Phiếu chờ duyệt" meta={`${pending.length} phiếu`} pad={false} action={<Button size="sm" variant="ghost" iconRight="arrow-right" onClick={() => onNavigate('approvals')}>Tất cả</Button>}>
          <div style={{ margin: -1 }}>
            <DataTable rowKey="id" maxHeight={340}
              columns={[
                { key: 'id', header: 'Mã phiếu', width: 128, render: r => <span className="vb-code" style={{ fontWeight: 600 }}>{r.id}</span> },
                { key: 'type', header: 'Loại', width: 120, render: r => <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}><Icon name={r.icon} size={15} style={{ color: 'var(--text-secondary)' }} />{r.type}</span> },
                { key: 'note', header: 'Nội dung', render: r => <div style={{ minWidth: 0 }}><div>{r.note}</div><div style={{ font: 'var(--type-helper)', color: 'var(--text-secondary)' }}>{r.by} · {r.at}</div></div> },
                { key: 'qty', header: 'SL', numeric: true, width: 64, render: r => <span style={{ color: r.qty < 0 ? 'var(--red-700)' : undefined, fontWeight: 600 }}>{r.qty > 0 ? fmt(r.qty) : '−' + fmt(-r.qty)}</span> },
                { key: 'act', header: '', width: 172, align: 'right', render: r => (
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                    <Button size="sm" variant="danger-outline" onClick={() => onReject(r)}>Từ chối</Button>
                    <Button size="sm" icon="check" onClick={() => onApprove(r)}>Duyệt</Button>
                  </div>) },
              ]}
              rows={pending}
              empty={<window.VB.EmptyState icon="clipboard-check" title="Không còn phiếu chờ duyệt" description="Phiếu mới từ nhân viên kho sẽ xuất hiện ở đây." />} />
          </div>
        </Panel>

        <Panel title="Cảnh báo đang mở" meta={`${ALERTS.length}`} pad={false}>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {ALERTS.map((a, i) => {
              const [bg, fg] = ALERT_TONE[a.tone];
              return (
                <li key={i} style={{ display: 'flex', gap: 12, padding: '11px 16px', borderTop: i ? '1px solid var(--border-subtle)' : 0, alignItems: 'flex-start' }}>
                  <span style={{ width: 28, height: 28, flex: 'none', display: 'grid', placeItems: 'center', background: bg, color: fg, borderRadius: 'var(--radius-sm)' }}><Icon name={a.icon} size={15} /></span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ font: '500 13px/18px var(--font-sans)' }}>{a.title}</div>
                    <div style={{ font: 'var(--type-helper)', color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>{a.meta}</div>
                  </div>
                  <span style={{ font: 'var(--type-helper)', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{a.time}</span>
                </li>
              );
            })}
          </ul>
        </Panel>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,2fr) minmax(320px,1fr)', gap: 16, alignItems: 'start' }}>
        <Panel title="Mặt hàng dưới điểm đặt hàng" meta="Sắp xếp theo số ngày tồn còn lại" pad={false} action={<Button size="sm" variant="secondary" icon="shopping-cart" onClick={() => onNavigate('restock')}>Xem đề xuất nhập hàng</Button>}>
          <div style={{ margin: -1 }}>
            <DataTable rowKey="id" onRowClick={() => onNavigate('restock')}
              columns={[
                { key: 'id', header: 'Mã SP', width: 84, render: r => <span className="vb-code">{r.id}</span> },
                { key: 'name', header: 'Sản phẩm', render: r => <span style={{ fontWeight: 500 }}>{r.name}</span> },
                { key: 'sup', header: 'Nhà cung cấp', render: r => SUPPLIERS[r.sup].name },
                { key: 'stock', header: 'Tồn', numeric: true, render: r => fmt(r.stock) },
                { key: 'rop', header: 'ROP', numeric: true, render: r => fmt(r.rop) },
                { key: 'days', header: 'Còn (ngày)', numeric: true, render: r => <span style={{ fontWeight: 600, color: r.stock / r.d < SUPPLIERS[r.sup].lead ? 'var(--red-700)' : undefined }}>{fmt(r.stock / r.d, 1)}</span> },
                { key: 'p', header: 'Ưu tiên', width: 112, render: r => <PriorityChip priority={r.p} /> },
              ]}
              rows={below} />
          </div>
        </Panel>
        <Panel title="Luân chuyển kho" meta="27/10 – 03/11">
          <MovementChart data={MOVEMENT} />
        </Panel>
      </div>
    </div>
  );
}

Object.assign(window, { Dashboard, Panel });
