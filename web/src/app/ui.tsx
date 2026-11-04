import type { ReactNode } from 'react';
import { Button, EmptyState } from '../design';

/** Codes (SKU, username) get +0.02em tracking and weight 600. */
export function Code({ children }: { children: ReactNode }) {
  return <span style={{ fontWeight: 600, letterSpacing: 'var(--tracking-code)', whiteSpace: 'nowrap' }}>{children}</span>;
}

/** Skeleton rows: grey-100 blocks, no shimmer. */
export function Loading({ rows = 6 }: { rows?: number }) {
  return (
    <div className="vb-panel" aria-busy="true" aria-label="Đang tải" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} style={{ height: 16, width: `${92 - (i % 3) * 14}%`, background: 'var(--grey-100)', borderRadius: 'var(--radius-sm)' }} />
      ))}
    </div>
  );
}

export function ListError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="vb-panel">
      <EmptyState icon="triangle-alert" title="Không tải được danh sách" description="Kiểm tra kết nối rồi thử lại."
        action={<Button variant="secondary" icon="refresh-cw" onClick={onRetry}>Thử lại</Button>} />
    </div>
  );
}
