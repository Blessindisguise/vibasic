import type { ReactNode } from 'react';
import { createBrowserRouter, Navigate, useParams } from 'react-router-dom';
import { homeFor, useAuth, type Role } from './auth';
import { Placeholder } from './Placeholder';
import { LoginPage } from '../features/auth/LoginPage';
import { ManagerLayout, MANAGER_NAV } from '../features/manager/ManagerLayout';
import { StaffLayout, STAFF_NAV } from '../features/staff/StaffLayout';

function RequireRole({ role, children }: { role: Role; children: ReactNode }) {
  const { user, ready } = useAuth();
  if (!ready) return null;
  if (!user) return <Navigate to="/dang-nhap" replace />;
  if (user.role !== role) return <Navigate to={homeFor(user.role)} replace />;
  return children;
}

function Home() {
  const { user, ready } = useAuth();
  if (!ready) return null;
  return <Navigate to={user ? homeFor(user.role) : '/dang-nhap'} replace />;
}

// Build phase that delivers each screen (see the implementation plan).
const MANAGER_PHASE: Record<string, number> = {
  'tong-quan': 7, 'canh-bao': 6, 'de-xuat': 6, 'cho-duyet': 3, 'nhap-kho': 3, 'xuat-kho': 4, 'lo-hang': 5,
  'kiem-ke': 5, 'bat-thuong': 5, 'bao-cao': 7, 'hang-hoa': 2, 'nha-cung-cap': 2, 'tai-khoan': 2,
};
const STAFF_PHASE: Record<string, number> = { 'xuat-kho': 4, 'nhap-kho': 3, 'tra-cuu': 5, 'kiem-ke': 5, 'bao-loi': 5 };

function ManagerPage() {
  const { page = 'tong-quan' } = useParams();
  if (!MANAGER_NAV.some(n => n.key === page)) return <Navigate to="/ql" replace />;
  return <Placeholder phase={MANAGER_PHASE[page]} />;
}

function StaffPage() {
  const { page = 'xuat-kho' } = useParams();
  if (!STAFF_NAV.some(n => n.key === page)) return <Navigate to="/kho" replace />;
  return <Placeholder phase={STAFF_PHASE[page]} size="lg" />;
}

export const router = createBrowserRouter([
  { path: '/', element: <Home /> },
  { path: '/dang-nhap', element: <LoginPage /> },
  {
    path: '/ql',
    element: <RequireRole role="manager"><ManagerLayout /></RequireRole>,
    children: [
      { index: true, element: <Navigate to="tong-quan" replace /> },
      { path: ':page/*', element: <ManagerPage /> },
    ],
  },
  {
    path: '/kho',
    element: <RequireRole role="staff"><StaffLayout /></RequireRole>,
    children: [
      { index: true, element: <Navigate to="xuat-kho" replace /> },
      { path: ':page/*', element: <StaffPage /> },
    ],
  },
  { path: '*', element: <Home /> },
]);
