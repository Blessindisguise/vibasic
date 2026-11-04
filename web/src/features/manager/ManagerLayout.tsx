import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AppShell, type NavItem } from '../../design';
import markWhite from '../../design/assets/mark-white.png';
import wordmarkWhite from '../../design/assets/wordmark-white.png';
import { useAuth } from '../../app/auth';
import { ToastProvider } from '../../app/toast';
import { fmtLongDate } from '../../app/format';
import { NotificationBell } from '../../app/NotificationBell';
import { useApprovalSummary } from '../../app/receiving';

export const MANAGER_NAV: (NavItem & { title?: string; subtitle?: () => string })[] = [
  { key: 'tong-quan', label: 'Tổng quan', icon: 'layout-dashboard', section: 'Theo dõi', title: 'Tổng quan kho', subtitle: () => `${fmtLongDate()} · Kho Bình Dương` },
  { key: 'canh-bao', label: 'Cảnh báo tồn kho', icon: 'bell', section: 'Theo dõi' },
  { key: 'de-xuat', label: 'Đề xuất bổ sung', icon: 'shopping-cart', section: 'Theo dõi', title: 'Đề xuất bổ sung hàng' },
  { key: 'cho-duyet', label: 'Chờ duyệt', icon: 'clipboard-check', section: 'Nghiệp vụ' },
  { key: 'nhap-kho', label: 'Phiếu nhập kho', icon: 'package-plus', section: 'Nghiệp vụ' },
  { key: 'xuat-kho', label: 'Phiếu xuất kho', icon: 'package-minus', section: 'Nghiệp vụ' },
  { key: 'lo-hang', label: 'Tra cứu lô', icon: 'layers', section: 'Nghiệp vụ', title: 'Tra cứu tồn kho theo lô' },
  { key: 'kiem-ke', label: 'Kiểm kê', icon: 'list-checks', section: 'Nghiệp vụ' },
  { key: 'bat-thuong', label: 'Biên bản bất thường', icon: 'shield-alert', section: 'Nghiệp vụ' },
  { key: 'bao-cao', label: 'Báo cáo', icon: 'chart-column', section: 'Phân tích' },
  { key: 'hang-hoa', label: 'Hàng hóa', icon: 'boxes', section: 'Danh mục' },
  { key: 'nha-cung-cap', label: 'Nhà cung cấp', icon: 'factory', section: 'Danh mục' },
  { key: 'tai-khoan', label: 'Tài khoản', icon: 'users', section: 'Danh mục', title: 'Tài khoản nhân viên' },
];

export function ManagerLayout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const { pathname } = useLocation();
  const key = pathname.split('/')[2] || 'tong-quan';
  const item = MANAGER_NAV.find(n => n.key === key);
  const pending = useApprovalSummary().data?.total ?? 0;
  const navItems = MANAGER_NAV.map(n => (n.key === 'cho-duyet' && pending ? { ...n, count: pending, countTone: 'danger' as const } : n));

  return (
    <ToastProvider placement="desktop">
      <div style={{ height: '100vh' }}>
        <AppShell
          role="manager"
          navItems={navItems}
          actions={<NotificationBell />}
          activeKey={key}
          onNavigate={k => nav(`/ql/${k}`)}
          user={{ name: user?.fullName }}
          title={item?.title ?? item?.label}
          subtitle={item?.subtitle?.()}
          onLogout={logout}
          brand={
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <img src={markWhite} alt="" style={{ height: 22 }} />
              <img src={wordmarkWhite} alt="Vibasic" style={{ height: 13 }} />
            </div>
          }
        >
          <Outlet />
        </AppShell>
      </div>
    </ToastProvider>
  );
}
