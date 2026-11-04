import { useNavigate } from 'react-router-dom';
import { Button, EmptyState, Icon, KpiTile } from '../../design';
import { fmt, fmtShort } from '../../app/format';
import { Code, ListError, Loading } from '../../app/ui';
import { useDashboard } from '../../app/reports';
import { FlowChart } from './FlowChart';

/** Manager "Tổng quan": headline figures, what waits for a decision, low-stock alerts and the last 7 days of stock in/out. */
export function DashboardPage() {
  const dash = useDashboard();
  const nav = useNavigate();
  if (dash.isPending) return <Loading rows={10} />;
  if (dash.isError) return <ListError onRetry={() => dash.refetch()} />;
  const { kpis: k, flow, pending, alerts } = dash.data;

  return (
    <div className="vb-stack">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12 }}>
        <KpiTile label="Tồn kho khả dụng" value={fmt(k.availableUnits)} unit="sản phẩm" icon="warehouse" footnote={`${k.products} mặt hàng`} onClick={() => nav('/ql/bao-cao')} />
        <KpiTile label="Chờ duyệt" value={fmt(k.pendingApprovals)} icon="clipboard-check" tone={k.pendingApprovals ? 'warning' : 'neutral'}
          footnote="Phiếu nhập, xuất, kiểm kê, biên bản" onClick={() => nav('/ql/cho-duyet')} />
        <KpiTile label="Cảnh báo tồn kho thấp" value={fmt(k.openAlerts)} icon="bell" tone={k.openAlerts ? 'danger' : 'neutral'}
          footnote={`${k.pendingProposals} đề xuất bổ sung chờ duyệt`} onClick={() => nav('/ql/canh-bao')} />
        <KpiTile label="Lô cách ly / đã khóa" value={`${fmt(k.quarantinedLots)} / ${fmt(k.lockedLots)}`} icon="shield-alert"
          tone={k.quarantinedLots ? 'warning' : 'neutral'} footnote="Không được xuất" onClick={() => nav('/ql/lo-hang')} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 3fr) minmax(0, 2fr)', gap: 16 }}>
        <section className="vb-panel">
          <div className="vb-panel__head">
            <h2 className="vb-panel__title">Việc chờ duyệt</h2>
            <Button variant="ghost" size="sm" iconRight="arrow-right" style={{ marginLeft: 'auto' }} onClick={() => nav('/ql/cho-duyet')}>Tất cả</Button>
          </div>
          {pending.length === 0
            ? <EmptyState icon="circle-check" title="Không có việc chờ duyệt" />
            : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {pending.map(p => (
                  <li key={p.type + p.code}>
                    <button type="button" className="vb-list-row" onClick={() => nav(p.link)}>
                      <span style={{ width: 150, flex: 'none', color: 'var(--text-secondary)' }}>{p.type}</span>
                      <Code>{p.code}</Code>
                      <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</span>
                      <span className="vb-muted" style={{ whiteSpace: 'nowrap' }}>{fmtShort(p.at)}</span>
                      <Icon name="chevron-right" size={16} style={{ color: 'var(--text-muted)' }} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
        </section>

        <section className="vb-panel">
          <div className="vb-panel__head">
            <h2 className="vb-panel__title">Dưới điểm đặt hàng</h2>
            <Button variant="ghost" size="sm" iconRight="arrow-right" style={{ marginLeft: 'auto' }} onClick={() => nav('/ql/de-xuat')}>Đề xuất bổ sung</Button>
          </div>
          {alerts.length === 0
            ? <EmptyState icon="circle-check" title="Không có cảnh báo" description="Mọi mặt hàng đều trên ROP." />
            : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {alerts.map(a => (
                  <li key={a.productId}>
                    <button type="button" className="vb-list-row" onClick={() => nav('/ql/canh-bao')}>
                      <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}><Code>{a.sku}</Code> {a.productName}</span>
                      <span style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                        <b style={{ color: 'var(--red-700)' }}>{fmt(a.available)}</b> <span className="vb-muted">/ ROP {fmt(a.rop, 1)}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
        </section>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 3fr) minmax(0, 2fr)', gap: 16 }}>
        <section className="vb-panel">
          <div className="vb-panel__head">
            <h2 className="vb-panel__title">Nhập, xuất 7 ngày gần nhất</h2>
            <Button variant="ghost" size="sm" iconRight="arrow-right" style={{ marginLeft: 'auto' }} onClick={() => nav('/ql/bao-cao?loai=nhap-xuat')}>Báo cáo</Button>
          </div>
          <div className="vb-panel__body"><FlowChart data={flow} /></div>
        </section>
        <section className="vb-panel">
          <div className="vb-panel__head"><h2 className="vb-panel__title">Kho hôm nay</h2></div>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            <li><button type="button" className="vb-list-row" onClick={() => nav('/ql/xuat-kho')}>
              <Icon name="clipboard-list" size={18} /><span style={{ flex: 1 }}>Đơn hàng chờ xuất</span><b>{fmt(k.ordersWaiting)}</b>
            </button></li>
            <li><button type="button" className="vb-list-row" onClick={() => nav('/ql/xuat-kho')}>
              <Icon name="scan-barcode" size={18} /><span style={{ flex: 1 }}>Phiếu xuất đang lấy hàng</span><b>{fmt(k.issuesToPick)}</b>
            </button></li>
            <li><button type="button" className="vb-list-row" onClick={() => nav('/ql/de-xuat')}>
              <Icon name="shopping-cart" size={18} /><span style={{ flex: 1 }}>Đề xuất bổ sung chờ duyệt</span><b>{fmt(k.pendingProposals)}</b>
            </button></li>
            <li><button type="button" className="vb-list-row" onClick={() => nav('/ql/kiem-ke')}>
              <Icon name="list-checks" size={18} /><span style={{ flex: 1 }}>Kiểm kê</span><span className="vb-muted">Xem kế hoạch</span>
            </button></li>
          </ul>
        </section>
      </div>
    </div>
  );
}
