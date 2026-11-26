import { useRef, type ComponentProps } from 'react';
import { ConfirmDialog as BaseConfirmDialog } from '../design';

type Props = ComponentProps<typeof BaseConfirmDialog> & {
  /** The action is running: the confirm button shows "Đang xử lý…" and further clicks are ignored. */
  busy?: boolean;
};

/**
 * The design-system confirm dialog with two app rules:
 * - the dismiss button reads "Quay lại", so it is never mistaken for a "Hủy …" action next to it;
 * - a confirm is ignored while `busy` or within 800 ms of the previous one, so a double click sends one request.
 */
export function ConfirmDialog({ busy = false, cancelLabel = 'Quay lại', confirmLabel, onConfirm, ...rest }: Props) {
  const last = useRef(0);
  const confirm = (reason: string) => {
    const now = Date.now();
    if (busy || now - last.current < 800) return;
    last.current = now;
    onConfirm?.(reason);
  };
  return <BaseConfirmDialog {...rest} cancelLabel={cancelLabel} confirmLabel={busy ? 'Đang xử lý…' : confirmLabel} onConfirm={confirm} />;
}
