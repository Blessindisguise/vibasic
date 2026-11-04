import React from 'react';
import { Icon } from '../core/Icon.jsx';

const ROLE_LABEL = { manager: 'Quản lý', staff: 'Nhân viên kho' };

// navItems: [{ key, label, icon, count, section }]
// layout 'sidebar' → left navigation + top bar; layout 'tabs' → green header + bottom tab bar (phones).
// Default: manager → sidebar, staff → tabs. A staff sidebar uses 48 px touch rows.
export function AppShell({ role = 'manager', layout, navItems = [], activeKey, onNavigate, user = {}, title, subtitle, actions, brand, children, onLogout, contentPadding }) {
  layout = layout || (role === 'staff' ? 'tabs' : 'sidebar');
  const touch = role === 'staff';
  const go = k => e => { e.preventDefault(); onNavigate && onNavigate(k); };
  const brandNode = brand || <span style={{ font: '700 16px/20px var(--font-sans)', letterSpacing: '.16em', color: '#fff' }}>VIBASIC</span>;
  const initials = (user.name || '?').split(' ').slice(-1)[0][0];
  const avatar = <span aria-hidden="true" style={{ width: 32, height: 32, display: 'grid', placeItems: 'center', background: 'var(--grey-100)', color: 'var(--grey-700)', font: '600 13px/1 var(--font-sans)', borderRadius: 'var(--radius-md)' }}>{initials}</span>;

  if (layout === 'tabs') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, background: 'var(--surface-page)' }}>
        <header style={{ display: 'flex', alignItems: 'center', gap: 12, height: 64, padding: '0 16px', background: 'var(--surface-brand)', color: '#fff', flex: 'none' }}>
          {brandNode}
          <span style={{ width: 1, height: 24, background: 'rgba(255,255,255,.3)' }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ font: '600 18px/24px var(--font-sans)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
            {subtitle && <div style={{ font: '400 13px/18px var(--font-sans)', color: 'var(--green-100)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{subtitle}</div>}
          </div>
          {actions}
          <div className="vb-shell-user" style={{ display: 'flex', alignItems: 'center', gap: 10, paddingLeft: 8 }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ font: '600 14px/18px var(--font-sans)' }}>{user.name}</div>
              <div style={{ font: '400 12px/16px var(--font-sans)', color: 'var(--green-100)' }}>{ROLE_LABEL.staff}</div>
            </div>
          </div>
        </header>
        <main style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: contentPadding ?? 16 }}>{children}</main>
        <nav aria-label="Điều hướng chính" style={{ display: 'flex', background: '#fff', borderTop: '1px solid var(--border-default)', flex: 'none' }}>
          {navItems.map(n => (
            <button key={n.key} type="button" className="vb-tab-item" aria-current={n.key === activeKey ? 'page' : undefined} onClick={go(n.key)}>
              <Icon name={n.icon} size={24} />{n.label}
              {n.count ? <span style={{ position: 'absolute', top: 6, left: 'calc(50% + 8px)', minWidth: 18, height: 18, padding: '0 5px', background: 'var(--red-600)', color: '#fff', borderRadius: 'var(--radius-full)', font: '600 11px/18px var(--font-sans)' }}>{n.count}</span> : null}
            </button>
          ))}
        </nav>
      </div>
    );
  }

  const sections = [];
  navItems.forEach(n => { const s = n.section || ''; let g = sections.find(x => x[0] === s); if (!g) sections.push(g = [s, []]); g[1].push(n); });
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'var(--sidebar-width) minmax(0,1fr)', height: '100%', minHeight: 0, background: 'var(--surface-page)' }}>
      <aside style={{ display: 'flex', flexDirection: 'column', background: '#fff', borderRight: '1px solid var(--border-default)', minHeight: 0 }}>
        <div style={{ height: 'var(--topbar-height)', display: 'flex', alignItems: 'center', padding: '0 16px', background: 'var(--surface-brand)', flex: 'none' }}>{brandNode}</div>
        <nav aria-label="Điều hướng chính" style={{ flex: 1, overflow: 'auto', padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {sections.map(([s, items]) => (
            <div key={s} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {s && <div style={{ font: 'var(--type-overline)', letterSpacing: 'var(--tracking-overline)', textTransform: 'uppercase', color: 'var(--text-muted)', padding: '4px 10px' }}>{s}</div>}
              {items.map(n => (
                <a key={n.key} href={'#' + n.key} className={`vb-nav-item${touch ? ' vb-nav-item--touch' : ''}`} aria-current={n.key === activeKey ? 'page' : undefined} onClick={go(n.key)}>
                  <Icon name={n.icon} size={touch ? 20 : 18} />
                  <span style={{ flex: 1, minWidth: 0 }}>{n.label}</span>
                  {n.count ? <span style={{ minWidth: 20, height: 20, padding: '0 6px', display: 'grid', placeItems: 'center', background: n.countTone === 'danger' ? 'var(--red-600)' : 'var(--grey-100)', color: n.countTone === 'danger' ? '#fff' : 'var(--grey-700)', borderRadius: 'var(--radius-sm)', font: '600 11px/1 var(--font-sans)', fontVariantNumeric: 'tabular-nums' }}>{n.count}</span> : null}
                </a>
              ))}
            </div>
          ))}
        </nav>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 12, borderTop: '1px solid var(--border-default)' }}>
          {avatar}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ font: '600 13px/18px var(--font-sans)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name}</div>
            <div style={{ font: 'var(--type-helper)', color: 'var(--text-secondary)' }}>{ROLE_LABEL[role]}</div>
          </div>
          <button type="button" className={`vb-btn vb-btn--ghost vb-btn--${touch ? 'lg' : 'sm'} vb-btn--icon`} aria-label="Đăng xuất" onClick={onLogout}><Icon name="log-out" size={touch ? 20 : 16} /></button>
        </div>
      </aside>
      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0 }}>
        <header style={{ height: 'var(--topbar-height)', flex: 'none', display: 'flex', alignItems: 'center', gap: 12, padding: '0 24px', background: '#fff', borderBottom: '1px solid var(--border-default)' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {subtitle && <div style={{ font: 'var(--type-helper)', color: 'var(--text-secondary)' }}>{subtitle}</div>}
            <h1 style={{ margin: 0, font: 'var(--type-page-title)', fontSize: 18, lineHeight: '24px' }}>{title}</h1>
          </div>
          {actions}
        </header>
        <main style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: contentPadding ?? 24 }}>{children}</main>
      </div>
    </div>
  );
}
