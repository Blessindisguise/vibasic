const W = window.VB;

const STEPS = [
  { key: 'select', label: 'Chọn đơn' },
  { key: 'pick', label: 'Lấy hàng FIFO' },
  { key: 'review', label: 'Gửi duyệt' },
  { key: 'deliver', label: 'Giao hàng' },
];

function FlowSteps({ step }) {
  const idx = STEPS.findIndex(s => s.key === step);
  return (
    <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6 }}>
      {STEPS.map((s, i) => {
        const done = i < idx || step === 'done', cur = i === idx;
        return (
          <li key={s.key} aria-current={cur ? 'step' : undefined} style={{ display: 'flex', alignItems: 'center', gap: 10, height: 48, padding: '0 14px', background: cur ? 'var(--grey-900)' : done ? 'var(--green-50)' : '#fff', color: cur ? '#fff' : done ? 'var(--green-800)' : 'var(--text-secondary)', border: '1px solid ' + (cur ? 'var(--grey-900)' : done ? 'var(--green-200)' : 'var(--border-default)'), clipPath: i ? undefined : 'polygon(var(--chamfer) 0,100% 0,100% 100%,0 100%,0 var(--chamfer))' }}>
            <span style={{ width: 26, height: 26, display: 'grid', placeItems: 'center', border: '1.5px solid currentColor', font: '600 14px/1 var(--font-sans)', flex: 'none' }}>{done ? <W.Icon name="check" size={16} strokeWidth={2.5} /> : i + 1}</span>
            <span style={{ font: '600 16px/20px var(--font-sans)' }}>{s.label}</span>
          </li>
        );
      })}
    </ol>
  );
}

function SelectOrder({ onPick }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <h2 style={{ margin: 0, font: 'var(--type-touch-heading)' }}>Đơn hàng cần xuất hôm nay</h2>
      {ORDERS.map(o => (
        <button key={o.id} type="button" className="vb-clickable" onClick={() => onPick(o)}
          style={{ all: 'unset', boxSizing: 'border-box', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 16, minHeight: 88, padding: '16px 20px', background: '#fff', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)' }}>
          <W.Icon name="clipboard-list" size={28} style={{ color: 'var(--text-secondary)' }} />
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}><span className="vb-code" style={{ font: '600 18px/24px var(--font-sans)' }}>{o.id}</span>{o.urgent && <W.StatusBadge status="pending" label="Giao sớm nhất" icon="clock" />}</div>
            <div style={{ font: 'var(--type-touch-body)', color: 'var(--text-secondary)' }}>{o.customer} · {o.due}</div>
          </div>
          <div style={{ textAlign: 'right', font: 'var(--type-touch-body)', fontVariantNumeric: 'tabular-nums' }}><b>{o.qty}</b> sản phẩm<div style={{ font: '400 14px/20px var(--font-sans)', color: 'var(--text-secondary)' }}>{o.lines} dòng hàng</div></div>
          <W.Icon name="chevron-right" size={24} style={{ color: 'var(--text-muted)' }} />
        </button>
      ))}
    </div>
  );
}

function lineProgress(line, scanned) {
  return line.lots.reduce((s, l) => s + (l.items || []).filter(c => scanned.includes(c)).length, 0);
}

function PickScreen({ order, lines, setLines, scanned, setScanned, defects, setDefects, onNext, toast }) {
  const [active, setActive] = React.useState(0);
  const [code, setCode] = React.useState('');
  const [fb, setFb] = React.useState({ state: 'idle', message: 'Quét mã trên tem sản phẩm. Hệ thống chỉ nhận lô cũ nhất còn hàng.' });
  const [scanKey, setScanKey] = React.useState(0);
  const [defectOpen, setDefectOpen] = React.useState(false);
  const line = lines[active];
  const openLots = line.lots.filter(l => !l.locked);
  const curLot = openLots.find(l => l.items.filter(c => scanned.includes(c)).length < l.take);
  const allDone = lines.every(l => lineProgress(l, scanned) >= l.qty);

  const submit = raw => {
    const c = raw.trim().toUpperCase();
    if (!c) return;
    setScanKey(k => k + 1);
    setCode('');
    if (defects.includes(c)) return setFb({ state: 'error', message: `${c} đã báo lỗi — không được xuất.` });
    if (scanned.includes(c)) return setFb({ state: 'error', message: `${c} đã được quét trước đó.` });
    const owner = line.lots.find(l => (l.items || []).includes(c));
    if (!owner) {
      const locked = line.lots.find(l => l.locked && c.includes(l.lot.slice(4)));
      return setFb({ state: 'error', message: locked ? `Lô ${locked.lot} đang khoá — không được xuất.` : `Không tìm thấy ${c} trong dòng hàng ${line.sku}.` });
    }
    if (curLot && owner !== curLot) return setFb({ state: 'error', message: `Sai thứ tự FIFO: lấy hết lô ${curLot.lot} (${curLot.loc}) trước.` });
    const ns = [...scanned, c];
    setScanned(ns);
    const done = lineProgress(line, ns);
    setFb({ state: 'success', message: `Đúng lô ${owner.lot} · đã quét ${done}/${line.qty} ${line.unit}` });
    if (done >= line.qty) { const nx = lines.findIndex(l => lineProgress(l, ns) < l.qty); if (nx >= 0) setTimeout(() => setActive(nx), 700); }
  };
  const simulate = kind => {
    if (kind === 'ok' && curLot) return submit(curLot.items.find(c => !scanned.includes(c)));
    if (kind === 'fifo') { const later = openLots[openLots.length - 1]; return submit(later.items[later.items.length - 1]); }
    if (kind === 'locked') { const lk = line.lots.find(l => l.locked) || lines[0].lots[0]; return submit(`SP-${line.sku.replace('-', '')}-${lk.lot.slice(4)}-0003`); }
  };
  const reportDefect = reason => {
    const bad = [...scanned].reverse().find(c => line.lots.some(l => (l.items || []).includes(c)));
    if (!bad) return setDefectOpen(false);
    // Defective unit leaves this lot; replacement comes from the next open lot (FIFO).
    setLines(ls => ls.map((l, i) => {
      if (i !== active) return l;
      const lots = l.lots.map(x => ({ ...x, items: [...(x.items || [])] }));
      const from = lots.find(x => x.items.includes(bad));
      const fi = lots.indexOf(from);
      const to = lots.slice(fi).find(x => !x.locked && x.available > x.take && x !== from) || lots.slice(fi + 1).find(x => !x.locked);
      from.take -= 1; from.items = from.items.filter(c => c !== bad);
      if (to) { to.take += 1; const n = to.items.length + 1; to.items.push(`SP-${l.sku.replace('-', '')}-${to.lot.slice(4)}-${String(n + (to.lot === 'LOT-2610-006' ? 0 : 10)).padStart(4, '0')}`); }
      return { ...l, lots };
    }));
    setScanned(s => s.filter(c => c !== bad));
    setDefects(d => [...d, bad]);
    setDefectOpen(false);
    setFb({ state: 'idle', message: `Đã loại ${bad}. Lấy 1 sản phẩm thay thế theo thứ tự FIFO.` });
    toast({ tone: 'warning', title: `Đã báo lỗi ${bad}`, message: `Lý do: ${reason} · chờ quản lý xử lý` });
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '320px minmax(0,1fr)', gap: 16, height: '100%', minHeight: 0 }}>
      <aside style={{ display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0 }}>
        <div style={{ font: 'var(--type-overline)', letterSpacing: 'var(--tracking-overline)', textTransform: 'uppercase', color: 'var(--text-secondary)', padding: '4px 2px' }}>{order.id} · {order.customer}</div>
        {lines.map((l, i) => {
          const p = lineProgress(l, scanned), done = p >= l.qty, cur = i === active;
          return (
            <button key={l.sku} type="button" onClick={() => { setActive(i); setFb({ state: 'idle', message: 'Quét mã trên tem sản phẩm. Hệ thống chỉ nhận lô cũ nhất còn hàng.' }); }} aria-current={cur || undefined}
              style={{ all: 'unset', boxSizing: 'border-box', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, minHeight: 72, padding: '12px 14px', background: cur ? '#fff' : done ? 'var(--green-50)' : 'transparent', border: cur ? '2px solid var(--grey-900)' : '1px solid ' + (done ? 'var(--green-200)' : 'var(--border-default)'), borderRadius: 'var(--radius-lg)' }}>
              <span style={{ width: 32, height: 32, flex: 'none', display: 'grid', placeItems: 'center', background: done ? 'var(--green-500)' : 'var(--grey-100)', color: done ? '#fff' : 'var(--grey-600)' }}>{done ? <W.Icon name="check" size={18} strokeWidth={2.5} /> : <W.Icon name="package" size={18} />}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ font: '600 16px/22px var(--font-sans)' }}>{l.name}</div>
                <div className="vb-code" style={{ font: '400 13px/18px var(--font-sans)', color: 'var(--text-secondary)' }}>{l.sku}</div>
              </div>
              <span style={{ font: '600 18px/24px var(--font-sans)', fontVariantNumeric: 'tabular-nums', color: done ? 'var(--green-700)' : undefined }}>{p}<span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>/{l.qty}</span></span>
            </button>
          );
        })}
        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {defects.length > 0 && <W.AlertBanner tone="warning" title={`${defects.length} sản phẩm báo lỗi`}>{defects.join(', ')}</W.AlertBanner>}
          <W.Button size="xl" fullWidth iconRight="arrow-right" disabled={!allDone} onClick={onNext}>Tiếp tục: Gửi duyệt</W.Button>
        </div>
      </aside>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 14, minHeight: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0, font: 'var(--type-touch-heading)' }}>{line.name}</h2>
            <div style={{ font: 'var(--type-touch-body)', color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>Cần xuất {line.qty} {line.unit} · {openLots.length} lô theo thứ tự nhập cũ nhất</div>
          </div>
          <W.Button size="lg" variant="danger-outline" icon="shield-alert" onClick={() => setDefectOpen(true)} disabled={lineProgress(line, scanned) === 0}>Báo hàng lỗi</W.Button>
        </div>
        <W.ScanInput value={code} onChange={setCode} onSubmit={submit} state={fb.state} message={fb.message} scanKey={scanKey} onCamera={() => simulate('ok')} autoFocus />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', border: '1px dashed var(--border-strong)', borderRadius: 'var(--radius-md)', font: 'var(--type-helper)', color: 'var(--text-secondary)' }}>
          <W.Icon name="circle-help" size={14} />Mô phỏng máy quét:
          <W.Button size="sm" variant="ghost" onClick={() => simulate('ok')} disabled={!curLot}>Quét đúng</W.Button>
          <W.Button size="sm" variant="ghost" onClick={() => simulate('fifo')} disabled={openLots.length < 2}>Quét sai lô</W.Button>
          <W.Button size="sm" variant="ghost" onClick={() => simulate('locked')}>Quét lô bị khoá</W.Button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, overflow: 'auto', minHeight: 0, paddingBottom: 4 }}>
          {(() => { let n = 0; return line.lots.map(l => {
            const picked = l.locked ? 0 : l.items.filter(c => scanned.includes(c)).length;
            const st = l.locked ? 'locked' : picked >= l.take ? 'done' : l === curLot ? 'picking' : 'waiting';
            return <W.LotCard key={l.lot} size="lg" fifoOrder={l.locked ? '–' : ++n} lotCode={l.lot} productName={l.locked ? 'Khoá theo báo cáo BC-2611-0004 · hệ thống bỏ qua lô này' : undefined} receivedAt={l.received} ageDays={l.age} location={l.loc} available={l.available} toPick={l.locked ? undefined : l.take} picked={picked} unit={line.unit} state={st} />;
          }); })()}
        </div>
      </section>

      {defectOpen && (
        <W.ConfirmDialog tone="danger" title="Báo sản phẩm lỗi?" description={`Sản phẩm vừa quét sẽ bị loại khỏi phiếu xuất và chờ quản lý xử lý. Hệ thống đề xuất sản phẩm thay thế theo FIFO.`}
          requireReason reasonLabel="Mô tả lỗi" reasonPlaceholder="VD: nứt chân ghế, trầy mặt bàn…" confirmLabel="Báo lỗi & thay thế" onCancel={() => setDefectOpen(false)} onConfirm={reportDefect} />
      )}
    </div>
  );
}

function Review({ order, lines, scanned, defects, status, setStatus, onDeliver }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 340px', gap: 16, alignItems: 'start' }}>
      <div style={{ background: '#fff', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <h2 style={{ margin: 0, font: 'var(--type-touch-heading)' }}>Phiếu xuất PX-2611-0042</h2><W.StatusBadge status={status} size="lg" />
        </div>
        {lines.map(l => (
          <div key={l.sku} style={{ padding: '12px 18px', borderTop: '1px solid var(--border-subtle)', display: 'flex', gap: 14 }}>
            <div style={{ flex: 1 }}>
              <div style={{ font: '600 16px/22px var(--font-sans)' }}>{l.name} <span className="vb-code" style={{ fontWeight: 400, color: 'var(--text-secondary)' }}>· {l.sku}</span></div>
              <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                {l.lots.filter(x => !x.locked && x.take > 0).map(x => <span key={x.lot} className="vb-code" style={{ padding: '3px 8px', background: 'var(--grey-50)', border: '1px solid var(--border-default)', font: '500 13px/18px var(--font-sans)' }}>{x.lot} × {x.take}</span>)}
              </div>
            </div>
            <span style={{ font: '600 20px/28px var(--font-sans)', fontVariantNumeric: 'tabular-nums' }}>{lineProgress(l, scanned)} <span style={{ font: 'var(--type-touch-body)', color: 'var(--text-secondary)' }}>{l.unit}</span></span>
          </div>
        ))}
        {defects.length > 0 && <div style={{ padding: 14, borderTop: '1px solid var(--border-subtle)' }}><W.AlertBanner tone="warning" title={`Đã thay ${defects.length} sản phẩm lỗi`}>{defects.join(', ')} — báo cáo bất thường đã gửi quản lý.</W.AlertBanner></div>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, background: '#fff', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', padding: 18 }}>
        <W.ApprovalStepper size="lg" orientation="vertical" status={status} history={{ draft: { by: 'Lê Văn Tâm', at: '03/11 09:14' }, ...(status !== 'draft' ? { pending: { by: 'Gửi Nguyễn Thu Hà', at: '09:16' } } : {}), ...(status === 'approved' ? { approved: { by: 'Nguyễn Thu Hà', at: '09:21' } } : {}) }} />
        {status === 'draft' && <W.Button size="xl" fullWidth icon="send" onClick={() => setStatus('pending')}>Gửi quản lý duyệt</W.Button>}
        {status === 'pending' && <>
          <W.AlertBanner tone="info" title="Đang chờ quản lý duyệt">Bạn sẽ nhận thông báo khi phiếu được duyệt.</W.AlertBanner>
          <W.Button size="md" variant="ghost" icon="circle-help" onClick={() => setStatus('approved')}>Mô phỏng: quản lý duyệt</W.Button>
        </>}
        {status === 'approved' && <W.Button size="xl" fullWidth icon="truck" onClick={onDeliver}>Bàn giao cho vận chuyển</W.Button>}
      </div>
    </div>
  );
}

function Deliver({ order, onDone }) {
  const [name, setName] = React.useState('');
  const [ok, setOk] = React.useState(false);
  const [tried, setTried] = React.useState(false);
  return (
    <div style={{ maxWidth: 560, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 18, background: '#fff', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', padding: 24 }}>
      <h2 style={{ margin: 0, font: 'var(--type-touch-heading)' }}>Xác nhận giao hàng</h2>
      <div style={{ font: 'var(--type-touch-body)', color: 'var(--text-secondary)' }}>{order.id} · {order.customer} · {order.qty} sản phẩm</div>
      <W.TextField size="xl" label="Người nhận / tài xế" required value={name} onChange={e => setName(e.target.value)} placeholder="Họ tên" error={tried && !name ? 'Nhập tên người nhận hàng.' : undefined} />
      <W.Checkbox size="lg" label="Đã kiểm đủ số lượng và tình trạng khi bàn giao" checked={ok} onChange={e => setOk(e.target.checked)} />
      <W.Button size="xl" fullWidth icon="check" onClick={() => { setTried(true); if (name && ok) onDone(); }}>Xác nhận đã giao</W.Button>
    </div>
  );
}

Object.assign(window, { FlowSteps, SelectOrder, PickScreen, Review, Deliver, lineProgress });
