import { useEffect, useId, type FormEvent, type ReactNode } from 'react';
import { AlertBanner, Button, IconButton } from '../design';

interface ModalProps {
  title: string;
  description?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
}

/** Dialog shell: 8px radius, dialog shadow over the 48% overlay. Escape or a click on the overlay closes it. */
export function Modal({ title, description, onClose, children, footer, width = 560 }: ModalProps) {
  const titleId = useId();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      onMouseDown={e => e.target === e.currentTarget && onClose()}
      // One shrinkable column: without it the column grows to the dialog's width and maxWidth 100% cannot keep it on a phone screen.
      style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'var(--surface-overlay)', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', placeItems: 'center', padding: 16 }}
    >
      <div
        role="dialog" aria-modal="true" aria-labelledby={titleId}
        style={{ width, maxWidth: '100%', maxHeight: 'calc(100dvh - 32px)', display: 'flex', flexDirection: 'column', background: '#fff', borderRadius: 'var(--radius-dialog)', boxShadow: 'var(--elevation-dialog)', overflow: 'hidden' }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '16px 16px 12px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 id={titleId} style={{ margin: 0, font: 'var(--type-section-title)', fontSize: 17 }}>{title}</h2>
            {description && <div className="vb-muted" style={{ marginTop: 2 }}>{description}</div>}
          </div>
          <IconButton icon="x" label="Đóng" variant="ghost" size="sm" onClick={onClose} />
        </div>
        <div style={{ padding: 20, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>{children}</div>
        {footer && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '12px 20px', borderTop: '1px solid var(--border-subtle)' }}>{footer}</div>
        )}
      </div>
    </div>
  );
}

interface FormDialogProps extends Omit<ModalProps, 'footer'> {
  submitLabel: string;
  busy?: boolean;
  /** Page-level error that is not tied to a single field. */
  error?: string | null;
  onSubmit: () => void;
}

/** Modal wrapping a form: Enter submits, one primary action, server error shown on top. */
export function FormDialog({ submitLabel, busy, error, onSubmit, children, ...modal }: FormDialogProps) {
  const formId = useId();
  const submit = (e: FormEvent) => { e.preventDefault(); if (!busy) onSubmit(); };
  return (
    <Modal
      {...modal}
      footer={<>
        <Button variant="secondary" type="button" onClick={modal.onClose}>Huỷ</Button>
        <Button type="submit" form={formId} loading={busy}>{submitLabel}</Button>
      </>}
    >
      <form id={formId} onSubmit={submit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {error && <AlertBanner tone="danger">{error}</AlertBanner>}
        {children}
      </form>
    </Modal>
  );
}

/** Two equal columns that stack on narrow screens. */
export function FieldGrid({ children }: { children: ReactNode }) {
  return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>{children}</div>;
}
