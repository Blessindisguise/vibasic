import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AppShell, IconButton, type NavItem } from '../../design';
import markWhite from '../../design/assets/mark-white.png';
import { useAuth } from '../../app/auth';
import { ToastProvider } from '../../app/toast';

export const STAFF_NAV: (NavItem & { title?: string })[] = [
  { key: 'xuat-kho', label: 'Xuất kho', icon: 'package-minus', title: 'Xuất kho theo FIFO' },
  { key: 'nhap-kho', label: 'Nhập kho', icon: 'package-plus', title: 'Nhập kho' },
  { key: 'tra-cuu', label: 'Tra cứu lô', icon: 'layers', title: 'Tra cứu tồn kho theo lô' },
  { key: 'kiem-ke', label: 'Kiểm kê', icon: 'list-checks', title: 'Kiểm kê tồn kho' },
  { key: 'bao-loi', label: 'Báo lỗi', icon: 'shield-alert', title: 'Biên bản bất thường' },
];

export function StaffLayout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const { pathname } = useLocation();
  const key = pathname.split('/')[2] || 'xuat-kho';
  const item = STAFF_NAV.find(n => n.key === key);

  return (
    <ToastProvider placement="touch">
      <div style={{ height: '100dvh' }}>
        <AppShell
          role="staff"
          navItems={STAFF_NAV}
          activeKey={key}
          onNavigate={k => nav(`/kho/${k}`)}
          user={{ name: user?.fullName }}
          title={item?.title ?? item?.label}
          subtitle="Kho Bình Dương"
          brand={<img src={markWhite} alt="Vibasic" style={{ height: 24 }} />}
          actions={
            <IconButton icon="log-out" label="Đăng xuất" size="lg" onClick={logout}
              style={{ color: '#fff', order: 10 }} className="vb-on-brand" />
          }
        >
          <Outlet />
        </AppShell>
      </div>
    </ToastProvider>
  );
}
