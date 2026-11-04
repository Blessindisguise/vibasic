const S = window.VB;

function WarehouseApp() {
  const [tab, setTab] = React.useState('issue');
  const [step, setStep] = React.useState(() => localStorage.getItem('vb-wh-step') || 'pick');
  const [order, setOrder] = React.useState(ORDERS[0]);
  const [lines, setLines] = React.useState(ISSUE_LINES);
  // Start mid-task: 12 chairs scanned, table line complete.
  const [scanned, setScanned] = React.useState(() => [...ISSUE_LINES[0].lots[1].items.slice(0, 12), ...ISSUE_LINES[1].lots[0].items]);
  const [defects, setDefects] = React.useState([]);
  const [status, setStatus] = React.useState('draft');
  const [toast, setToast] = React.useState(null);
  React.useEffect(() => { localStorage.setItem('vb-wh-step', step); }, [step]);
  React.useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 4000); return () => clearTimeout(t); }, [toast]);

  const reset = () => { setStep('select'); setLines(ISSUE_LINES); setScanned([]); setDefects([]); setStatus('draft'); };

  return (
    <S.AppShell role="staff" navItems={STAFF_NAV} activeKey={tab} onNavigate={setTab} user={{ name: 'Lê Văn Tâm' }}
      title={tab === 'issue' ? 'Xuất kho theo FIFO' : STAFF_NAV.find(n => n.key === tab).label} subtitle="Kho Bình Dương · Ca sáng"
      brand={<img src="../../assets/mark-white.png" alt="Vibasic" style={{ height: 24 }} />}
      actions={tab === 'issue' && step !== 'select' ? <S.Button size="lg" variant="secondary" icon="undo-2" onClick={reset}>Đơn khác</S.Button> : null}>
      {tab !== 'issue' ? (
        <S.EmptyState size="lg" icon="square-pen" title="Màn hình chưa có trong bản thử" description="Bản UI thử cho nhân viên kho tập trung vào luồng xuất kho FIFO." action={<S.Button size="lg" onClick={() => setTab('issue')}>Về Xuất kho</S.Button>} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%', minHeight: 0 }}>
          <FlowSteps step={step} />
          <div style={{ flex: 1, minHeight: 0 }}>
            {step === 'select' && <SelectOrder onPick={o => { setOrder(o); setStep('pick'); }} />}
            {step === 'pick' && <PickScreen order={order} lines={lines} setLines={setLines} scanned={scanned} setScanned={setScanned} defects={defects} setDefects={setDefects} onNext={() => setStep('review')} toast={setToast} />}
            {step === 'review' && <Review order={order} lines={lines} scanned={scanned} defects={defects} status={status} setStatus={setStatus} onDeliver={() => setStep('deliver')} />}
            {step === 'deliver' && <Deliver order={order} onDone={() => { setStep('done'); setToast({ tone: 'success', title: `Đã giao ${order.id}`, message: 'Tồn kho đã cập nhật.' }); }} />}
            {step === 'done' && <S.EmptyState size="lg" icon="circle-check" title="Hoàn tất xuất kho" description={`${order.id} đã bàn giao. Phiếu PX-2611-0042 đã lưu vào lịch sử.`} action={<S.Button size="xl" icon="clipboard-list" onClick={reset}>Xuất đơn tiếp theo</S.Button>} />}
          </div>
        </div>
      )}
      {toast && <div style={{ position: 'absolute', left: '50%', bottom: 88, transform: 'translateX(-50%)', zIndex: 60 }}><S.Toast {...toast} onClose={() => setToast(null)} /></div>}
    </S.AppShell>
  );
}

function TabletFrame({ children }) {
  const W = 1180, H = 820;
  const [k, setK] = React.useState(1);
  React.useEffect(() => { const f = () => setK(Math.min(1, (window.innerWidth - 32) / (W + 28), (window.innerHeight - 32) / (H + 28))); f(); window.addEventListener('resize', f); return () => window.removeEventListener('resize', f); }, []);
  return (
    <div style={{ width: '100vw', height: '100vh', display: 'grid', placeItems: 'center', background: 'var(--grey-200)', overflow: 'hidden' }}>
      <div style={{ width: (W + 28) * k, height: (H + 28) * k }}>
        <div style={{ width: W + 28, height: H + 28, padding: 14, background: '#1b1f24', borderRadius: 28, transform: `scale(${k})`, transformOrigin: 'top left', boxShadow: '0 20px 50px rgba(22,27,34,.25)' }}>
          <div style={{ width: W, height: H, borderRadius: 14, overflow: 'hidden', background: 'var(--surface-page)', position: 'relative', transform: 'translateZ(0)' }}>{children}</div>
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<TabletFrame><WarehouseApp /></TabletFrame>);
