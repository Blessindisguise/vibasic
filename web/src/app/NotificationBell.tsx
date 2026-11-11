import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Icon, IconButton } from '../design';
import { fmtShort } from './format';
import { useMarkRead, useNotifications, type NotificationItem } from './receiving';

const TONE: Record<string, { icon: string; color: string }> = {
  success: { icon: 'circle-check', color: 'var(--green-600)' },
  danger: { icon: 'circle-x', color: 'var(--red-600)' },
  warning: { icon: 'hourglass', color: 'var(--amber-700)' },
  info: { icon: 'info', color: 'var(--blue-700)' },
};

/** Bell with unread count; opens the latest notifications. Clicking one marks it read and follows its link. */
export function NotificationBell({ onBrand = false }: { onBrand?: boolean }) {
  const feed = useNotifications();
  const markRead = useMarkRead();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', close); };
  }, [open]);

  const unread = feed.data?.unread ?? 0;
  const items = feed.data?.items ?? [];
  const follow = (n: NotificationItem) => {
    if (!n.isRead) markRead.mutate([n.id]);
    setOpen(false);
    if (n.link) nav(n.link);
  };

  return (
    <div ref={box} style={{ position: 'relative' }}>
      <IconButton
        icon="bell" label={unread ? `Thông báo, ${unread} chưa đọc` : 'Thông báo'} variant="ghost" size={onBrand ? 'lg' : 'md'}
        badge={unread || undefined} onClick={() => setOpen(o => !o)} aria-expanded={open}
        className={onBrand ? 'vb-on-brand' : undefined} style={onBrand ? { color: '#fff' } : undefined}
      />
      {open && (
        <div
          role="dialog" aria-label="Thông báo"
          style={{ position: 'absolute', right: 0, top: 'calc(100% + 6px)', zIndex: 40, width: 380, maxWidth: 'calc(100vw - 24px)', background: '#fff', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--elevation-dropdown)', overflow: 'hidden', color: 'var(--text-primary)' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', padding: '10px 12px 10px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
            <span style={{ flex: 1, font: 'var(--type-body-strong)' }}>Thông báo</span>
            {unread > 0 && <Button variant="ghost" size="sm" onClick={() => markRead.mutate(undefined)}>Đánh dấu đã đọc</Button>}
          </div>
          <div style={{ maxHeight: 420, overflow: 'auto' }}>
            {items.length === 0 && <div className="vb-muted" style={{ padding: 24, textAlign: 'center' }}>Chưa có thông báo.</div>}
            {items.map(n => {
              const t = TONE[n.tone] ?? TONE.info;
              return (
                <button
                  key={n.id} type="button" onClick={() => follow(n)} className="vb-notification"
                  style={{ display: 'flex', gap: 10, width: '100%', padding: '10px 16px', border: 0, borderBottom: '1px solid var(--border-subtle)', background: n.isRead ? '#fff' : 'var(--grey-25)', textAlign: 'left', cursor: 'pointer', font: 'inherit', color: 'inherit' }}
                >
                  <Icon name={t.icon} size={16} style={{ color: t.color, marginTop: 2, flex: 'none' }} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', font: n.isRead ? 'var(--type-body)' : 'var(--type-body-strong)' }}>{n.title}</span>
                    {n.message && <span className="vb-muted" style={{ display: 'block', marginTop: 2 }}>{n.message}</span>}
                    <span className="vb-muted" style={{ display: 'block', marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>{fmtShort(n.createdAt)}</span>
                  </span>
                  {!n.isRead && <span aria-label="Chưa đọc" style={{ width: 8, height: 8, borderRadius: 4, background: 'var(--green-500)', marginTop: 6, flex: 'none' }} />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
