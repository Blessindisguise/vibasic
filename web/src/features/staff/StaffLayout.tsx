import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AppShell, IconButton, type NavItem } from '../../design';
import markWhite from '../../design/assets/mark-white.png';
import wordmarkWhite from '../../design/assets/wordmark-white.png';
import { useAuth } from '../../app/auth';
import { ToastProvider } from '../../app/toast';
import { useMediaQuery } from '../../app/useMediaQuery';

export const STAFF_NAV: (NavItem & { title?: string })[] = [
  { key: 'xuat-kho', label: 'Xuất kho', icon: 'package-minus', section: 'Nghiệp vụ', title: 'Xuất kho theo FIFO' },
  { key: 'nhap-kho', label: 'Nhập kho', icon: 'package-plus', section: 'Nghiệp vụ', title: 'Phiếu nhập kho' },
  { key: 'tra-cuu', label: 'Tra cứu lô', icon: 'layers', section: 'Tồn kho', title: 'Tra cứu tồn kho theo lô' },
  { key: 'kiem-ke', label: 'Kiểm kê', icon: 'list-checks', section: 'Tồn kho', title: 'Kiểm kê tồn kho' },
  { key: 'bao-loi', label: 'Báo lỗi', icon: 'shield-alert', section: 'Tồn kho', title: 'Biên bản bất thường' },
];

/**
 * Warehouse staff frame. Tablets and larger: left sidebar like the manager screens, with 48 px touch rows.
 * Phones (< 768 px): green header + bottom tab bar, since a 232 px sidebar would leave no room for content.
 */
export function StaffLayout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const { pathname } = useLocation();
  const phone = useMediaQuery('(max-width: 767px)');
  const key = pathname.split('/')[2] || 'xuat-kho';
  const item = STAFF_NAV.find(n => n.key === key);

  return (
    <ToastProvider placement="touch">
      <div style={{ height: '100dvh' }}>
        <AppShell
          role="staff"
          layout={phone ? 'tabs' : 'sidebar'}
          navItems={STAFF_NAV}
          activeKey={key}
          onNavigate={k => nav(`/kho/${k}`)}
          user={{ name: user?.fullName }}
          title={item?.title ?? item?.label}
          subtitle="Kho Bình Dương"
          onLogout={logout}
          brand={phone
            ? <img src={markWhite} alt="Vibasic" style={{ height: 24 }} />
            : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <img src={markWhite} alt="" style={{ height: 22 }} />
                <img src={wordmarkWhite} alt="Vibasic" style={{ height: 13 }} />
              </div>
            )}
          actions={phone
            ? <IconButton icon="log-out" label="Đăng xuất" size="lg" onClick={logout} style={{ color: '#fff', order: 10 }} className="vb-on-brand" />
            : undefined}
          contentPadding={phone ? 16 : 24}
        >
          <Outlet />
        </AppShell>
      </div>
    </ToastProvider>
  );
}
