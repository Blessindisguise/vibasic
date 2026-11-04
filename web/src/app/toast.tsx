import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { Toast } from '../design';

export interface ToastMsg {
  tone?: 'success' | 'danger' | 'info' | 'warning';
  title: string;
  message?: string;
  action?: { label: string; onClick: () => void };
}

const ToastContext = createContext<(t: ToastMsg) => void>(() => {});

/** One toast at a time, 4 s, bottom-right on desktop and bottom-centre above the tab bar on touch screens. */
export function ToastProvider({ children, placement = 'desktop' }: { children: ReactNode; placement?: 'desktop' | 'touch' }) {
  const [toast, setToast] = useState<(ToastMsg & { id: number }) | null>(null);
  const show = useCallback((t: ToastMsg) => setToast({ ...t, id: Date.now() }), []);

  useEffect(() => {
    if (!toast) return;
    const h = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(h);
  }, [toast]);

  const pos = placement === 'desktop'
    ? { right: 24, bottom: 24 }
    : { left: '50%', bottom: 72, transform: 'translateX(-50%)', width: 'calc(100% - 32px)', maxWidth: 360 };

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast && (
        <div key={toast.id} style={{ position: 'fixed', zIndex: 60, ...pos }}>
          <Toast {...toast} onClose={() => setToast(null)} />
        </div>
      )}
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
