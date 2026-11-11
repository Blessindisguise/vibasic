import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, DataTable, EmptyState, KpiTile, PriorityChip, SearchField, StatusBadge, type DataTableColumn } from '../../design';
import { fmt, fmtDateTime, fmtShort } from '../../app/format';
import { Modal } from '../../app/Modal';
import { Segmented } from '../../app/Segmented';
import { useToast } from '../../app/toast';
import { Code, ListError, Loading } from '../../app/ui';
import { matches } from '../../app/text';
import { suggestFrom } from '../../app/suggest';
import { useAlerts, useDecisionSummary, useOverview, useRecalculate, type AlertRow, type Basis, type OverviewRow, type StockState } from '../../app/decision';
import { BasisBlock, RopFormula } from './BasisText';

type Tab = 'mo' | 'dong' | 'tat-ca';

/** What the search box matches on an alert or an overview row. */
const basisFields = (b: Basis) => [b.sku, b.productName, b.supplierName, b.categoryName];
const NOT_FOUND = <EmptyState icon="search" title="Không có mặt hàng phù hợp" description="Thử tìm theo mã SKU, tên hàng, nhà cung cấp hoặc nhóm hàng." />;

/** UC_17 Xem cảnh báo tồn kho thấp: products whose net stock (available − open orders, Q8) is not above ROP, with the basis of each alert. */
export function AlertsPage() {
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as Tab) || 'mo';
  const summary = useDecisionSummary();
  const recalc = useRecalculate();
  const toast = useToast();
  const nav = useNavigate();
  const [detail, setDetail] = useState<Basis | null>(null);
  const [search, setSearch] = useState('');
  // Same queries as the lists below (cached), for the type-ahead.
  const alerts = useAlerts(tab === 'dong' ? 'closed' : 'open');
  const overview = useOverview(tab === 'tat-ca');
  const bases = (tab === 'tat-ca' ? overview.data : alerts.data)?.map(r => r.basis);
  const suggestions = suggestFrom(bases, search, basisFields, b => ({
    key: String(b.productId), label: b.sku, hint: `${b.productName} · ${b.supplierName}`, meta: <span>Tồn ròng {fmt(b.net)} {b.unit}</span>,
  }));

  const run = () => recalc.mutate(undefined, {
    onSuccess: s => toast({ tone: 'success', title: 'Đã tính lại ROP, EOQ', message: `${s.openAlerts} cảnh báo đang mở, ${s.pendingProposals} đề xuất chờ xem xét.` }),
    onError: e => toast({ tone: 'danger', title: 'Không tính được', message: e.message }),
  });

  return (
    <div className="vb-stack">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
        <KpiTile label="Cảnh báo đang mở" value={fmt(summary.data?.openAlerts)} icon="bell" tone={summary.data?.openAlerts ? 'danger' : 'neutral'}
          onClick={() => setParams({ tab: 'mo' }, { replace: true })} />
        <KpiTile label="Đề xuất chờ xem xét" value={fmt(summary.data?.pendingProposals)} icon="shopping-cart" tone={summary.data?.pendingProposals ? 'warning' : 'neutral'}
          onClick={() => nav('/ql/de-xuat')} />
        <KpiTile label="Chưa đủ dữ liệu · chậm luân chuyển" value={`${fmt(summary.data?.insufficient)} · ${fmt(summary.data?.slowMoving)}`} icon="hourglass"
          onClick={() => setParams({ tab: 'tat-ca' }, { replace: true })} />
        <div className="vb-panel" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8, justifyContent: 'space-between' }}>
          <div>
            <div className="vb-muted">ROP, EOQ tính lần cuối</div>
            <div style={{ font: 'var(--type-section-title)', fontVariantNumeric: 'tabular-nums' }}>{fmtDateTime(summary.data?.lastCalculatedAt)}</div>
          </div>
          <Button variant="secondary" size="sm" icon="refresh-cw" loading={recalc.isPending} onClick={run}>Tính lại ngay</Button>
        </div>
      </div>

      <div className="vb-row" style={{ gap: 12 }}>
        <Segmented<Tab>
          label="Cảnh báo" value={tab} onChange={t => setParams({ tab: t }, { replace: true })}
          options={[
            { value: 'mo', label: 'Đang mở', count: summary.data?.openAlerts },
            { value: 'dong', label: 'Đã đóng' },
            { value: 'tat-ca', label: 'Tất cả mặt hàng' },
          ]}
        />
        <SearchField
          placeholder="Mã SKU, tên hàng, nhà cung cấp…" value={search} onChange={setSearch} style={{ width: 300 }} aria-label="Tìm mặt hàng"
          suggestions={suggestions} onPickSuggestion={s => s.value && setDetail(s.value as Basis)}
        />
      </div>
      {tab === 'tat-ca' ? <Overview search={search} onOpen={setDetail} /> : <AlertList status={tab === 'mo' ? 'open' : 'closed'} search={search} onOpen={setDetail} />}

      {detail && (
        <Modal title={`${detail.sku} · ${detail.productName}`} description={`${detail.categoryName} · ${detail.supplierName}`} onClose={() => setDetail(null)}
          footer={<>
            <Button variant="secondary" onClick={() => setDetail(null)}>Đóng</Button>
            <Button icon="shopping-cart" onClick={() => nav('/ql/de-xuat')}>Xem đề xuất bổ sung</Button>
          </>}>
          <BasisBlock b={detail} />
        </Modal>
      )}
    </div>
  );
}

function AlertList({ status, search, onOpen }: { status: 'open' | 'closed'; search: string; onOpen: (b: Basis) => void }) {
  const alerts = useAlerts(status);
  const columns: DataTableColumn<AlertRow>[] = [
    { key: 'product', header: 'Mặt hàng', render: a => <span><Code>{a.basis.sku}</Code> {a.basis.productName}</span> },
    { key: 'supplier', header: 'Nhà cung cấp', width: 170, render: a => a.basis.supplierName },
    { key: 'available', header: 'Khả dụng', numeric: true, width: 90, render: a => fmt(a.basis.available) },
    { key: 'net', header: 'Tồn ròng', numeric: true, width: 100, render: a => <b>{fmt(status === 'open' ? a.basis.net : a.currentQuantity)} {a.basis.unit}</b> },
    { key: 'rop', header: 'ROP', numeric: true, width: 80, render: a => fmt(a.basis.rop ?? a.ropValue, 1) },
    {
      key: 'gap', header: 'So với ROP', numeric: true, width: 110,
      render: a => { const g = a.basis.net - (a.basis.rop ?? a.ropValue); return <b style={{ color: g <= 0 ? 'var(--red-700)' : 'var(--green-700)' }}>{g > 0 ? '+' : ''}{fmt(g, 1)}</b>; },
    },
    { key: 'days', header: 'Còn (ngày)', numeric: true, width: 100, render: a => a.basis.daysLeft == null ? '—' : fmt(a.basis.daysLeft, 1) },
    { key: 'basis', header: 'Căn cứ', render: a => <span className="vb-muted"><RopFormula b={a.basis} /></span> },
    {
      key: 'date', header: status === 'open' ? 'Cảnh báo lúc' : 'Đóng lúc', width: 120,
      render: a => <span style={{ whiteSpace: 'nowrap' }}>{fmtShort(status === 'open' ? a.alertDate : a.closedAt)}</span>,
    },
  ];
  if (alerts.isPending) return <Loading />;
  if (alerts.isError) return <ListError onRetry={() => alerts.refetch()} />;
  return (
    <DataTable
      columns={columns} rows={alerts.data.filter(a => matches(search, ...basisFields(a.basis)))} onRowClick={a => onOpen(a.basis)}
      caption="Cảnh báo tồn kho thấp" maxHeight="calc(100dvh - 330px)"
      empty={search ? NOT_FOUND : <EmptyState icon="circle-check" title={status === 'open' ? 'Không có cảnh báo' : 'Chưa có cảnh báo nào được đóng'} />}
    />
  );
}

const STATE: Record<StockState, React.ReactNode> = {
  alert: <StatusBadge status="rejected" label="Không lớn hơn ROP" icon="triangle-alert" />,
  watch: <PriorityChip priority="watch" />,
  ok: <StatusBadge status="approved" label="Đủ hàng" />,
  insufficient: <StatusBadge status="draft" label="Chưa đủ dữ liệu" icon="hourglass" />,
  slowMoving: <StatusBadge status="pending" label="Chậm luân chuyển" icon="trending-down" />,
};

/** Every product's current ROP/EOQ, including the ones still without four weeks of data (UC_17 3.2, UC_18 2.1). */
function Overview({ search, onOpen }: { search: string; onOpen: (b: Basis) => void }) {
  const overview = useOverview();
  const order: StockState[] = ['alert', 'watch', 'slowMoving', 'insufficient', 'ok'];
  const columns: DataTableColumn<OverviewRow>[] = [
    { key: 'product', header: 'Mặt hàng', render: o => <span><Code>{o.basis.sku}</Code> {o.basis.productName}</span> },
    { key: 'available', header: 'Khả dụng', numeric: true, width: 90, render: o => fmt(o.basis.available) },
    { key: 'net', header: 'Tồn ròng', numeric: true, width: 100, render: o => `${fmt(o.basis.net)} ${o.basis.unit}` },
    { key: 'd', header: 'd (/ngày)', numeric: true, width: 90, render: o => o.basis.avgDailyDemand == null ? '—' : fmt(o.basis.avgDailyDemand, 2) },
    { key: 'ss', header: 'SS', numeric: true, width: 70, render: o => o.basis.safetyStock == null ? '—' : fmt(o.basis.safetyStock, 1) },
    { key: 'rop', header: 'ROP', numeric: true, width: 80, render: o => o.basis.rop == null ? '—' : fmt(o.basis.rop, 1) },
    { key: 'eoq', header: 'EOQ', numeric: true, width: 80, render: o => o.basis.eoq == null ? '—' : fmt(o.basis.eoq, 0) },
    { key: 'days', header: 'Còn (ngày)', numeric: true, width: 100, render: o => o.basis.daysLeft == null ? '—' : fmt(o.basis.daysLeft, 1) },
    { key: 'state', header: 'Tình trạng', width: 190, render: o => STATE[o.state] },
  ];
  if (overview.isPending) return <Loading />;
  if (overview.isError) return <ListError onRetry={() => overview.refetch()} />;
  const rows = overview.data
    .filter(o => matches(search, ...basisFields(o.basis)))
    .map(o => ({ ...o, id: o.basis.productId }))
    .sort((a, b) => order.indexOf(a.state) - order.indexOf(b.state) || a.basis.sku.localeCompare(b.basis.sku));
  return <DataTable columns={columns} rows={rows} onRowClick={o => onOpen(o.basis)} caption="ROP, EOQ của mọi mặt hàng" maxHeight="calc(100dvh - 330px)"
    empty={search ? NOT_FOUND : undefined} />;
}
