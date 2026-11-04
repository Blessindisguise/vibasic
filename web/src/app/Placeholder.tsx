import { EmptyState } from '../design';

/** Screen that belongs to a later build phase. */
export function Placeholder({ phase, size = 'md' }: { phase: number; size?: 'md' | 'lg' }) {
  return (
    <div style={{ background: '#fff', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)' }}>
      <EmptyState
        size={size}
        icon="square-pen"
        title="Màn hình đang được xây dựng"
        description={`Chức năng này thuộc giai đoạn ${phase} của kế hoạch triển khai.`}
      />
    </div>
  );
}
