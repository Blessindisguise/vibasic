import type { ReactNode } from 'react';
import { Button } from '../../design';
import { fmtDateTime } from '../../app/format';
import { WAREHOUSE } from '../../app/warehouse';

/** Screen-only bar above a printable document: what is printed, paper hint, close and print. */
export function PrintToolbar({ title, hint, action, wide }: { title: string; hint: string; action: string; wide?: boolean }) {
  return (
    <div className="vb-print__toolbar vb-no-print" style={{ maxWidth: wide ? '297mm' : '210mm' }}>
      <div style={{ flex: 1 }}>
        <div style={{ font: 'var(--type-section-title)' }}>{title}</div>
        <div className="vb-muted">{hint}</div>
      </div>
      <Button variant="secondary" onClick={() => window.close()}>Đóng</Button>
      <Button icon="printer" onClick={() => window.print()}>{action}</Button>
    </div>
  );
}

/** Organisation on the left, national motto on the right, as on Vietnamese administrative forms. */
export function DocTop() {
  return (
    <header className="vb-doc__top">
      <div style={{ textAlign: 'center' }}>
        <div className="vb-doc__strong">KHO HÀNG GỖ VIBASIC</div>
        <div className="vb-doc__motto" style={{ fontWeight: 400 }}>{WAREHOUSE.name}</div>
        <div className="vb-doc__hint" style={{ maxWidth: 300, margin: '2px auto 0' }}>{WAREHOUSE.address}</div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div className="vb-doc__strong">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
        <div className="vb-doc__motto">Độc lập – Tự do – Hạnh phúc</div>
      </div>
    </header>
  );
}

/** Signature columns: role, "(Ký, ghi rõ họ tên)", room to sign, then the name when known. */
export function DocSigns({ people, place }: { people: { role: string; name?: string }[]; place?: string }) {
  return (
    <div className="vb-doc__signs-wrap">
      {place && <div className="vb-doc__place">{place}</div>}
      <div className="vb-doc__signs" style={{ gridTemplateColumns: `repeat(${people.length}, 1fr)` }}>
        {people.map(p => (
          <div key={p.role}>
            <div className="vb-doc__strong">{p.role.toUpperCase()}</div>
            <div className="vb-doc__hint">(Ký, ghi rõ họ tên)</div>
            <div className="vb-doc__name">{p.name || ' '}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DocFoot({ code }: { code: string }) {
  return <footer className="vb-doc__foot">In từ Vibasic lúc {fmtDateTime(new Date().toISOString())} · {code}</footer>;
}

/** Document codes (PX-2611-0015, LOT-2610-007) never break at their hyphens. */
export function Codes({ text }: { text: string }) {
  return <>{text.split(/([A-Z]{2,}-[\w-]+)/).map((t, i) => i % 2 ? <span key={i} style={{ whiteSpace: 'nowrap' }}>{t}</span> : t)}</>;
}

/** A4 sheet; wide = landscape (reports with many number columns). */
export function DocSheet({ wide, children }: { wide?: boolean; children: ReactNode }) {
  return <article className={`vb-doc${wide ? ' vb-doc--wide' : ''}`}>{children}</article>;
}
