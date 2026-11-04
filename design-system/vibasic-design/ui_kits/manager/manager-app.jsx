const A = window.VB;

const TITLES = {
  dashboard: ['Tổng quan kho', 'Thứ Ba, 03/11/2026 · Kho Bình Dương'],
  restock: ['Đề xuất nhập hàng', 'Tính lại lúc 06:00 · 02/11/2026 (hằng tuần, thứ Hai)'],
};

function ManagerApp() {
  const [page, setPage] = React.useState(() => localStorage.getItem('vb-mgr-page') || 'dashboard');
  const [pending, setPending] = React.useState(PENDING);
  const [dlg, setDlg] = React.useState(null);
  const [toast, setToast] = React.useState(null);
  React.useEffect(() => { localStorage.setItem('vb-mgr-page', page); }, [page]);
  React.useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 4000); return () => clearTimeout(t); }, [toast]);

  const resolve = (r, ok, reason) => {
    const prev = pending;
    setPending(p => p.filter(x => x.id !== r.id));
    setDlg(null);
    setToast({ tone: ok ? 'success' : 'danger', title: `${ok ? 'Đã duyệt' : 'Đã từ chối'} phiếu ${r.id}`, message: ok ? `Thông báo đã gửi đến ${r.by}.` : `Lý do: ${reason}`, action: { label: 'Hoàn tác', onClick: () => { setPending(prev); setToast(null); } } });
  };

  const [title, sub] = TITLES[page] || [MGR_NAV.find(n => n.key === page)?.label, ''];
  const actions = page === 'restock'
    ? <><A.Button variant="secondary" icon="refresh-cw">Tính lại</A.Button><A.Button variant="secondary" icon="download">Xuất Excel</A.Button></>
    : <><A.IconButton icon="bell" label="Cảnh báo" badge={ALERTS.length} variant="secondary" onClick={() => setPage('alerts')} /><A.Button variant="secondary" icon="download">Xuất báo cáo</A.Button></>;

  return (
    <div style={{ height: '100vh' }}>
      <A.AppShell role="manager" navItems={MGR_NAV.map(n => n.key === 'approvals' ? { ...n, count: pending.length } : n)} activeKey={page} onNavigate={setPage}
        user={{ name: 'Nguyễn Thu Hà' }} title={title} subtitle={sub} actions={actions}
        brand={<div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><img src="../../assets/mark-white.png" alt="" style={{ height: 22 }} /><img src="../../assets/wordmark-white.png" alt="Vibasic" style={{ height: 13 }} /></div>}>
        {page === 'dashboard' && <Dashboard pending={pending} onNavigate={setPage} onApprove={r => setDlg({ r, ok: true })} onReject={r => setDlg({ r, ok: false })} />}
        {page === 'restock' && <RestockProposal toast={setToast} />}
        {!['dashboard', 'restock'].includes(page) && (
          <div style={{ background: '#fff', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)' }}>
            <A.EmptyState icon="square-pen" title="Màn hình chưa có trong bản thử" description="Bản UI thử gồm Tổng quan và Đề xuất nhập hàng. Các màn hình còn lại dùng cùng bộ thành phần." action={<A.Button variant="secondary" onClick={() => setPage('dashboard')}>Về Tổng quan</A.Button>} />
          </div>
        )}
      </A.AppShell>
      {dlg && (
        <A.ConfirmDialog key={dlg.r.id + dlg.ok} tone={dlg.ok ? 'primary' : 'danger'}
          title={`${dlg.ok ? 'Duyệt' : 'Từ chối'} phiếu ${dlg.r.id}?`}
          description={dlg.ok ? `${dlg.r.type} · ${dlg.r.note}. Tồn kho sẽ được cập nhật ngay sau khi duyệt.` : `Phiếu sẽ trả về cho ${dlg.r.by} để chỉnh sửa.`}
          requireReason={!dlg.ok} confirmLabel={dlg.ok ? 'Duyệt phiếu' : 'Từ chối phiếu'}
          onCancel={() => setDlg(null)} onConfirm={reason => resolve(dlg.r, dlg.ok, reason)} />
      )}
      {toast && <div style={{ position: 'fixed', right: 24, bottom: 24, zIndex: 60 }}><A.Toast {...toast} onClose={() => setToast(null)} /></div>}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<ManagerApp />);
