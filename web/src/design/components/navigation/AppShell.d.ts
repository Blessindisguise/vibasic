export interface NavItem { key: string; label: string; icon: string; count?: number; countTone?: 'neutral' | 'danger'; /** Sidebar section heading (manager) */ section?: string; }
/**
 * Role-based app frame. manager → desktop sidebar + top bar; staff → tablet header + bottom tab bar.
 * @startingPoint section="Navigation" subtitle="Manager sidebar shell / warehouse tablet shell" viewport="1280x720"
 */
export interface AppShellProps {
  role?: 'manager' | 'staff';
  /** sidebar (left navigation) or tabs (header + bottom tab bar, for phones). Default: manager → sidebar, staff → tabs. */
  layout?: 'sidebar' | 'tabs';
  navItems: NavItem[]; activeKey?: string; onNavigate?: (key: string) => void;
  user?: { name?: string }; title?: React.ReactNode; subtitle?: React.ReactNode; actions?: React.ReactNode;
  /** Brand lockup (e.g. <img src="assets/mark-white.png">); defaults to plain "VIBASIC" text */ brand?: React.ReactNode;
  children?: React.ReactNode; onLogout?: () => void; contentPadding?: number | string;
}
export declare function AppShell(props: AppShellProps): JSX.Element;
