import type { ReactNode } from 'react';
import { createBrowserRouter, Navigate, useParams } from 'react-router-dom';
import { homeFor, useAuth, type Role } from './auth';
import { LoginPage } from '../features/auth/LoginPage';
import { ManagerLayout, MANAGER_NAV } from '../features/manager/ManagerLayout';
import { StaffLayout, STAFF_NAV } from '../features/staff/StaffLayout';
import { ProductsPage } from '../features/manager/catalog/ProductsPage';
import { SuppliersPage } from '../features/manager/catalog/SuppliersPage';
import { AccountsPage } from '../features/manager/catalog/AccountsPage';
import { ProductDetail } from '../features/manager/catalog/ProductDetail';
import { SupplierDetail } from '../features/manager/catalog/SupplierDetail';
import { ApprovalsPage } from '../features/manager/approvals/ApprovalsPage';
import { ReceiptListPage } from '../features/receiving/ReceiptListPage';
import { ReceiptDetail } from '../features/receiving/ReceiptDetail';
import { ReceiptForm } from '../features/staff/receiving/ReceiptForm';
import { ReceiptLabelsPage } from '../features/print/ReceiptLabelsPage';
import { ReportPrintPage } from '../features/print/ReportPrintPage';
import { InventoryPrintPage, MovementPrintPage } from '../features/print/ReportsPrintPage';
import { ReplenishmentPrintPage } from '../features/print/ReplenishmentPrintPage';
import { IssueListPage } from '../features/issuing/IssueListPage';
import { IssueDetail } from '../features/issuing/IssueDetail';
import { StaffIssueHome } from '../features/staff/issuing/StaffIssueHome';
import { OrderAllocationPage } from '../features/staff/issuing/OrderAllocationPage';
import { OrderListPage } from '../features/issuing/OrderListPage';
import { LotLookupPage } from '../features/stock/LotLookupPage';
import { LotDetailPage } from '../features/stock/LotDetailPage';
import { StocktakeManagerPage } from '../features/stocktake/StocktakeManagerPage';
import { StocktakeDetail } from '../features/stocktake/StocktakeDetail';
import { PlanDetail } from '../features/stocktake/PlanDetail';
import { StaffStocktakeHome } from '../features/staff/stocktake/StaffStocktakeHome';
import { CountingPage } from '../features/staff/stocktake/CountingPage';
import { AbnormalReportsPage } from '../features/abnormal/AbnormalReportsPage';
import { ReportDetail } from '../features/abnormal/ReportDetail';
import { AlertsPage } from '../features/decision/AlertsPage';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { ReportsPage } from '../features/reports/ReportsPage';
import { ProposalsPage, ReplenishmentReportsPage } from '../features/decision/ProposalsPage';

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

/** A screen receives the path segments after its nav key, e.g. /kho/nhap-kho/12/sua → ['12', 'sua']. */
type Screen = (rest: string[]) => ReactNode;

/** /…/nhap-kho, /…/nhap-kho/:id; staff also /moi and /:id/sua. */
const receiptScreen = (role: Role, base: string): Screen => ([first, second]) => {
  if (!first) return <ReceiptListPage role={role} basePath={base} />;
  if (role === 'staff' && first === 'moi') return <ReceiptForm basePath={base} />;
  const id = Number(first);
  if (!Number.isInteger(id) || id <= 0) return <Navigate to={base} replace />;
  if (role === 'staff' && second === 'sua') return <ReceiptForm key={id} id={id} basePath={base} />;
  return <ReceiptDetail key={id} id={id} role={role} basePath={base} />;
};

/** /ql/xuat-kho[/:id]; staff /kho/xuat-kho (orders, pick queue, issues), /don/:orderId, /:id. */
const issueScreen = (role: Role, base: string): Screen => ([first, second]) => {
  if (!first) return role === 'staff' ? <StaffIssueHome /> : <IssueListPage role={role} basePath={base} />;
  if (role === 'manager' && first === 'don') return <OrderListPage basePath={base} />;
  if (role === 'staff' && first === 'don') {
    const orderId = Number(second);
    return Number.isInteger(orderId) && orderId > 0 ? <OrderAllocationPage key={orderId} orderId={orderId} /> : <Navigate to={base} replace />;
  }
  const id = Number(first);
  if (!Number.isInteger(id) || id <= 0) return <Navigate to={base} replace />;
  return <IssueDetail key={id} id={id} role={role} basePath={base} />;
};

const positiveId = (s?: string) => { const n = Number(s); return Number.isInteger(n) && n > 0 ? n : null; };

/** /…/lo-hang (manager) or /…/tra-cuu (staff), and /:lotId. */
const lotScreen = (role: Role, base: string): Screen => ([first]) => {
  if (!first) return <LotLookupPage role={role} basePath={base} />;
  const id = positiveId(first);
  return id ? <LotDetailPage key={id} id={id} role={role} basePath={base} /> : <Navigate to={base} replace />;
};

/** Manager: plans + stocktakes, /:planId (plan detail, edit), /phieu/:id. Staff: plans to count, /:planId (counting), /phieu/:id. */
const stocktakeScreen = (role: Role, base: string): Screen => ([first, second]) => {
  if (!first) return role === 'manager' ? <StocktakeManagerPage /> : <StaffStocktakeHome />;
  if (first === 'phieu') {
    const id = positiveId(second);
    return id ? <StocktakeDetail key={id} id={id} role={role} back={role === 'manager' ? `${base}?tab=phieu` : base} /> : <Navigate to={base} replace />;
  }
  const planId = positiveId(first);
  if (!planId) return <Navigate to={base} replace />;
  return role === 'staff' ? <CountingPage key={planId} planId={planId} /> : <PlanDetail key={planId} id={planId} back={base} />;
};

/** /ql/bat-thuong or /kho/bao-loi, and /:reportId. */
const reportScreen = (role: Role, base: string): Screen => ([first]) => {
  if (!first) return <AbnormalReportsPage role={role} basePath={base} />;
  const id = positiveId(first);
  return id ? <ReportDetail key={id} id={id} role={role} basePath={base} /> : <Navigate to={base} replace />;
};

const MANAGER_SCREENS: Record<string, Screen> = {
  'tong-quan': () => <DashboardPage />,
  'bao-cao': () => <ReportsPage />,
  'cho-duyet': () => <ApprovalsPage />,
  'canh-bao': () => <AlertsPage />,
  'de-xuat': ([first]) => (!first ? <ProposalsPage /> : first === 'bao-cao' ? <ReplenishmentReportsPage /> : <Navigate to="/ql/de-xuat" replace />),
  'lo-hang': lotScreen('manager', '/ql/lo-hang'),
  'kiem-ke': stocktakeScreen('manager', '/ql/kiem-ke'),
  'bat-thuong': reportScreen('manager', '/ql/bat-thuong'),
  'nhap-kho': receiptScreen('manager', '/ql/nhap-kho'),
  'xuat-kho': issueScreen('manager', '/ql/xuat-kho'),
  'hang-hoa': ([first]) => {
    if (!first) return <ProductsPage />;
    const id = positiveId(first);
    return id ? <ProductDetail key={id} id={id} back="/ql/hang-hoa" /> : <Navigate to="/ql/hang-hoa" replace />;
  },
  'nha-cung-cap': ([first]) => {
    if (!first) return <SuppliersPage />;
    const id = positiveId(first);
    return id ? <SupplierDetail key={id} id={id} back="/ql/nha-cung-cap" /> : <Navigate to="/ql/nha-cung-cap" replace />;
  },
  'tai-khoan': () => <AccountsPage />,
};

const STAFF_SCREENS: Record<string, Screen> = {
  'xuat-kho': issueScreen('staff', '/kho/xuat-kho'),
  'nhap-kho': receiptScreen('staff', '/kho/nhap-kho'),
  'tra-cuu': lotScreen('staff', '/kho/tra-cuu'),
  'kiem-ke': stocktakeScreen('staff', '/kho/kiem-ke'),
  'bao-loi': reportScreen('staff', '/kho/bao-loi'),
};

function ManagerPage() {
  const { page = 'tong-quan', '*': rest = '' } = useParams();
  if (!MANAGER_NAV.some(n => n.key === page)) return <Navigate to="/ql" replace />;
  const screen = MANAGER_SCREENS[page];
  return screen ? screen(rest.split('/').filter(Boolean)) : <Navigate to="/ql" replace />;
}

function StaffPage() {
  const { page = 'xuat-kho', '*': rest = '' } = useParams();
  if (!STAFF_NAV.some(n => n.key === page)) return <Navigate to="/kho" replace />;
  const screen = STAFF_SCREENS[page];
  return screen ? screen(rest.split('/').filter(Boolean)) : <Navigate to="/kho" replace />;
}

/** Signed-in, any role (print pages open in a new tab without the app frame). */
function RequireUser({ children }: { children: ReactNode }) {
  const { user, ready } = useAuth();
  if (!ready) return null;
  return user ? children : <Navigate to="/dang-nhap" replace />;
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
  { path: '/in/nhap-kho/:id', element: <RequireUser><ReceiptLabelsPage /></RequireUser> },
  { path: '/in/bien-ban/:id', element: <RequireUser><ReportPrintPage /></RequireUser> },
  { path: '/in/bao-cao/ton-kho', element: <RequireRole role="manager"><InventoryPrintPage /></RequireRole> },
  { path: '/in/bao-cao/nhap-xuat', element: <RequireRole role="manager"><MovementPrintPage /></RequireRole> },
  { path: '/in/bao-cao/de-xuat/:id', element: <RequireRole role="manager"><ReplenishmentPrintPage /></RequireRole> },
  { path: '*', element: <Home /> },
]);
