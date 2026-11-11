import { useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import JsBarcode from 'jsbarcode';
import { Button } from '../../design';
import { fmt, fmtDate } from '../../app/format';
import { ListError, Loading } from '../../app/ui';
import { LotStatusBadge } from '../../app/statusBadges';
import { useLabels } from '../../app/receiving';

/**
 * Code 128 barcode as inline SVG, black on white. JsBarcode sizes the SVG in pixels; a viewBox lets it shrink
 * to the label width while keeping the bar proportions (the quiet zone is the label padding).
 */
function Barcode({ value, height, width = 1.6, fontSize = 13 }: { value: string; height: number; width?: number; fontSize?: number }) {
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => {
    const svg = ref.current;
    if (!svg) return;
    JsBarcode(svg, value, { format: 'CODE128', height, width, fontSize, margin: 0, font: 'monospace', textMargin: 2 });
    const w = svg.getAttribute('width'), h = svg.getAttribute('height');
    svg.setAttribute('viewBox', `0 0 ${parseFloat(w ?? '0')} ${parseFloat(h ?? '0')}`);
    svg.style.width = `min(100%, ${w})`;
    svg.style.height = 'auto';
    svg.removeAttribute('width');
    svg.removeAttribute('height');
  }, [value, height, width, fontSize]);
  return <svg ref={ref} role="img" aria-label={`Mã vạch ${value}`} style={{ display: 'block' }} />;
}

/** UC_04 step 8: one large label per lot, then one small label per item. Print from the browser (A4, 3 labels per row). */
export function ReceiptLabelsPage() {
  const id = Number(useParams().id);
  const sheet = useLabels(id);

  if (sheet.isPending) return <div style={{ padding: 24 }}><Loading /></div>;
  if (sheet.isError) return <div style={{ padding: 24 }}><ListError onRetry={() => sheet.refetch()} /></div>;
  const s = sheet.data;
  const items = s.lots.reduce((n, l) => n + l.serials.length, 0);

  return (
    <div className="vb-print">
      <div className="vb-print__toolbar vb-no-print">
        <div style={{ flex: 1 }}>
          <div style={{ font: 'var(--type-section-title)' }}>In mã vạch phiếu {s.code}</div>
          <div className="vb-muted">{s.lots.length} nhãn lô · {fmt(items)} nhãn sản phẩm · khổ A4</div>
        </div>
        <Button variant="secondary" onClick={() => window.close()}>Đóng</Button>
        <Button icon="printer" onClick={() => window.print()}>In nhãn</Button>
      </div>

      {s.lots.map(lot => (
        <section key={lot.lotCode} className="vb-print__lot">
          <div className="vb-label vb-label--lot">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div>
                <div style={{ font: '700 20px/26px var(--font-sans)', letterSpacing: 'var(--tracking-code)' }}>{lot.lotCode}</div>
                <div style={{ font: '600 15px/20px var(--font-sans)' }}>{lot.sku} · {lot.productName}</div>
                <div className="vb-muted" style={{ color: '#333' }}>
                  {fmt(lot.quantity)} {lot.unit} · Nhập {fmtDate(s.receiptDate)} · {s.code} · {s.supplierName}
                </div>
              </div>
              <LotStatusBadge status={lot.status} size="lg" />
            </div>
            <Barcode value={lot.lotCode} height={64} width={2.2} fontSize={15} />
          </div>
          <div className="vb-print__items">
            {lot.serials.map(serial => (
              <div key={serial} className="vb-label">
                <div style={{ font: '600 11px/14px var(--font-sans)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lot.sku} · {lot.lotCode}</div>
                <Barcode value={serial} height={34} width={1.2} fontSize={11} />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
