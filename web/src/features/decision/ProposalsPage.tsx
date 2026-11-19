import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, ConfirmDialog, DataTable, EmptyState, FilterBar, KpiTile, PriorityChip, StatusBadge, TextField, type DataTableColumn } from '../../design';
import { fmt, fmtDate, fmtDateTime, fmtShort } from '../../app/format';
import { FormDialog } from '../../app/Modal';
import { Segmented } from '../../app/Segmented';
import { useToast } from '../../app/toast';
import { Code, ListError, Loading } from '../../app/ui';
import { matches, parseNumber } from '../../app/text';
import { suggestFrom } from '../../app/suggest';
import { fieldErrors, formError } from '../../app/catalog';
import {
  PRIORITY_LABEL, PROPOSAL_STATUS_LABEL, useAdjustProposal, useCreateReport, useProposals, useRejectProposal, useReplenishmentReport, useReports,
  type Priority, type ProposalRow, type ProposalStatus, type ReportListRow, type ReportRow,
} from '../../app/decision';
import { BasisBlock, EoqFormula, NetFormula, QuantityFormula, RopFormula, SsFormula } from './BasisText';

/** A report line on screen: a pending proposal or a "Theo dõi" product (no proposal, cannot be selected). */
type Line = ReportRow & { id: string | number; supplierName: string };
type History = ProposalRow & { supplierName: string };

const days = (d?: number) => (d == null ? '—' : fmt(d, 1));
const muted = (watch: boolean, node: React.ReactNode) => (watch ? <span className="vb-muted">{node}</span> : node);
/** Print pages open in a new tab without the app frame. */
const openPrint = (path: string) => window.open(path, '_blank', 'noopener');
const reportPath = (id: number) => `/in/bao-cao/de-xuat/${id}`;

/**
 * UC_18 Xem xét đề xuất bổ sung hàng. A proposal is only a suggestion: the manager reviews the pending ones (grouped by main
 * supplier, Khẩn cấp → Cần đặt → Theo dõi and fewest days left first, with the "Theo dõi" products of the same supplier as a
 * suggestion to order them together), changes a quantity or leaves one out with a reason (Q20), and makes a report of the
 * ticked ones for whoever buys the goods. The system stops there. The other tabs list decided proposals; the reports made are
 * on their own screen (/ql/de-xuat/bao-cao).
 */
export function ProposalsPage() {
  const [status, setStatus] = useState<ProposalStatus>('pending');
  const nav = useNavigate();
  const report = useReplenishmentReport();
  const pending = (report.data?.groups ?? []).flatMap(g => g.rows).filter(r => r.proposal);
  const urgent = pending.filter(r => r.priority === 'urgent').length;

  return (
    <div className="vb-stack">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
        <KpiTile label="Đề xuất chờ xem xét" value={fmt(report.data ? pending.length : undefined)} icon="shopping-cart"
          tone={pending.length ? 'warning' : 'neutral'} onClick={() => setStatus('pending')} />
        <KpiTile label="Khẩn cấp" value={fmt(report.data ? urgent : undefined)} icon="triangle-alert" tone={urgent ? 'danger' : 'neutral'}
          onClick={() => setStatus('pending')} />
        <KpiTile label="Nhà cung cấp cần đặt" value={fmt(report.data?.groups.length)} icon="factory" />
        <KpiTile label="Tổng số lượng đề xuất" value={fmt(report.data ? pending.reduce((s, r) => s + r.proposal!.proposedQuantity, 0) : undefined)} icon="boxes" />
      </div>

      <div className="vb-row" style={{ gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Segmented<ProposalStatus>
            label="Trạng thái đề xuất" value={status} onChange={setStatus}
            options={[
              { value: 'pending', label: PROPOSAL_STATUS_LABEL.pending, count: report.data ? pending.length : undefined },
              { value: 'reported', label: PROPOSAL_STATUS_LABEL.reported },
              { value: 'rejected', label: PROPOSAL_STATUS_LABEL.rejected },
              { value: 'closed', label: PROPOSAL_STATUS_LABEL.closed },
            ]}
          />
        </div>
        <Button variant="secondary" icon="file-text" onClick={() => nav('/ql/de-xuat/bao-cao')}>Báo cáo đề xuất</Button>
      </div>
      {status === 'pending' ? <ReportView /> : <HistoryView status={status} />}
    </div>
  );
}

function ReportView() {
  const report = useReplenishmentReport();
  const create = useCreateReport();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [priority, setPriority] = useState('');
  const [selected, setSelected] = useState<Array<string | number>>([]);
  const [confirmReport, setConfirmReport] = useState(false);
  const [adjusting, setAdjusting] = useState<ProposalRow | null>(null);
  const [rejecting, setRejecting] = useState<ProposalRow | null>(null);

  const all: Line[] = useMemo(() => (report.data?.groups ?? []).flatMap(g => g.rows.map(r => ({
    ...r, supplierName: g.supplierName, id: r.proposal?.id ?? `w-${r.basis.productId}`,
  }))), [report.data]);
  const suppliers = (report.data?.groups ?? []).map(g => [g.supplierId, g.supplierName] as const);
  const categories = [...new Map(all.map(r => [r.basis.categoryId, r.basis.categoryName])).entries()];
  const rows = all.filter(r => (!supplierId || r.basis.supplierId === Number(supplierId)) && (!categoryId || r.basis.categoryId === Number(categoryId))
    && (!priority || r.priority === priority) && matches(search, r.basis.sku, r.basis.productName, r.supplierName));
  const chips = [
    ...(supplierId ? [{ key: 'supplier', label: `NCC: ${suppliers.find(([id]) => id === Number(supplierId))?.[1]}` }] : []),
    ...(categoryId ? [{ key: 'category', label: `Nhóm: ${categories.find(([id]) => id === Number(categoryId))?.[1]}` }] : []),
    ...(priority ? [{ key: 'priority', label: PRIORITY_LABEL[priority as Priority] }] : []),
  ];
  const clear = (k: string) => (k === 'supplier' ? setSupplierId : k === 'category' ? setCategoryId : setPriority)('');
  /** Every ticked proposal, also those a filter hides now: the report covers exactly what was ticked. */
  const picked = all.filter(r => r.proposal && selected.includes(r.id));

  const runReport = () => {
    // Opened in the click so the browser does not block it; it shows the report once it is made.
    const tab = window.open('', '_blank');
    create.mutate(picked.map(r => r.proposal!.id), {
      onSuccess: x => {
        setConfirmReport(false);
        setSelected([]);
        toast({ tone: 'success', title: `Đã lập báo cáo ${x.code}`, message: `${x.proposalCount} đề xuất, ${x.supplierCount} nhà cung cấp.` });
        if (tab) tab.location.href = reportPath(x.id);
      },
      onError: e => { tab?.close(); setConfirmReport(false); toast({ tone: 'danger', title: 'Không lập được báo cáo', message: e.message }); },
    });
  };

  const columns: DataTableColumn<Line>[] = [
    {
      key: 'product', header: 'Mặt hàng',
      render: r => muted(!r.proposal, <span><Code>{r.basis.sku}</Code> {r.basis.productName}</span>),
    },
    {
      key: 'net', header: <>Tồn ròng<br /><span className="vb-muted" style={{ fontWeight: 400 }}>khả dụng</span></>, numeric: true, width: 86,
      render: r => muted(!r.proposal, <span><b>{fmt(r.proposal?.netQuantity ?? r.basis.net)}</b><br />
        <span className="vb-muted" style={{ fontSize: 12 }}>{fmt(r.proposal?.availableQuantity ?? r.basis.available)}</span></span>),
    },
    { key: 'rop', header: 'ROP', numeric: true, width: 60, render: r => muted(!r.proposal, fmt(r.proposal?.ropValue ?? r.basis.rop, 1)) },
    { key: 'eoq', header: 'EOQ', numeric: true, width: 56, render: r => muted(!r.proposal, fmt(r.proposal?.eoqValue ?? r.basis.eoq)) },
    { key: 'd', header: 'd (/ngày)', numeric: true, width: 70, render: r => muted(!r.proposal, fmt(r.proposal?.avgDailyDemand ?? r.basis.avgDailyDemand, 2)) },
    { key: 'days', header: 'Còn (ngày)', numeric: true, width: 74, render: r => muted(!r.proposal, days(r.daysLeft)) },
    { key: 'priority', header: 'Ưu tiên', width: 104, render: r => <PriorityChip priority={r.priority} /> },
    {
      key: 'qty', header: <>SL đề xuất<br /><span className="vb-muted" style={{ fontWeight: 400 }}>gốc</span></>, numeric: true, width: 118,
      render: r => (r.proposal ? (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
          <span><b>{fmt(r.proposal.proposedQuantity)}</b> {r.basis.unit}<br /><span className="vb-muted" style={{ fontSize: 12 }}>{fmt(r.proposal.baseQuantity)}</span></span>
          <Button size="sm" variant="ghost" icon="square-pen" aria-label={`Sửa số lượng ${r.basis.sku}`} onClick={e => { e.stopPropagation(); setAdjusting(r.proposal!); }} />
        </span>
      ) : <span className="vb-muted">—</span>),
    },
    {
      key: 'basis', header: 'Căn cứ điều chỉnh', width: 210,
      render: r => (
        <span style={{ whiteSpace: 'normal', fontSize: 12, lineHeight: '16px', display: 'block' }}>
          {!r.proposal
            ? <span className="vb-muted">Chạm ROP trong {days(r.basis.avgDailyDemand ? (r.basis.net - (r.basis.rop ?? 0)) / r.basis.avgDailyDemand : undefined)} ngày</span>
            : <>
              {r.proposal.adjustBasis ?? (r.proposal.adjustReason ? null : <span className="vb-muted">—</span>)}
              {r.proposal.adjustReason && <>{r.proposal.adjustBasis && <br />}Quản lý: {fmt(r.proposal.originalQuantity)} → {fmt(r.proposal.proposedQuantity)}, {r.proposal.adjustReason}</>}
            </>}
        </span>
      ),
    },
    {
      key: 'actions', header: '', width: 86, align: 'right',
      render: r => r.proposal && <Button size="sm" variant="danger-outline" onClick={e => { e.stopPropagation(); setRejecting(r.proposal!); }}>Loại</Button>,
    },
  ];

  const demand = report.data?.demandFrom && report.data.demandTo
    ? `, nhu cầu từ đơn hàng ${fmtDate(report.data.demandFrom)} – ${fmtDate(new Date(new Date(report.data.demandTo).getTime() - 1).toISOString())}` : '';

  return (
    <>
      <div className="vb-row" style={{ gap: 12, flexWrap: 'wrap' }}>
        <span className="vb-muted" style={{ flex: 1, minWidth: 260 }}>
          ROP, EOQ tính lúc {fmtDateTime(report.data?.calculatedAt)}{demand}.
        </span>
        <Button icon="file-text" onClick={() => setConfirmReport(true)} disabled={!picked.length}>
          {picked.length ? `Lập báo cáo ${picked.length} đề xuất` : 'Lập báo cáo'}
        </Button>
      </div>
      <FilterBar
        search={search} onSearchChange={setSearch} searchPlaceholder="Tìm theo mã SKU, tên hàng, nhà cung cấp…"
        suggestions={suggestFrom(all, search, r => [r.basis.sku, r.basis.productName, r.supplierName], r => ({ key: String(r.id), label: r.basis.sku, hint: `${r.basis.productName} · ${r.supplierName}` }))}
        onPickSuggestion={s => setSearch(s.label)}
        filters={[
          { key: 'supplier', label: 'Nhà cung cấp', value: supplierId, options: suppliers.map(([id, name]) => ({ value: String(id), label: name })) },
          { key: 'category', label: 'Nhóm hàng', value: categoryId, options: categories.map(([id, name]) => ({ value: String(id), label: name })) },
          { key: 'priority', label: 'Ưu tiên', value: priority, options: (['urgent', 'order', 'watch'] as Priority[]).map(p => ({ value: p, label: PRIORITY_LABEL[p] })) },
        ]}
        onFilterChange={(k, v) => (k === 'supplier' ? setSupplierId : k === 'category' ? setCategoryId : setPriority)(v)}
        chips={chips} onRemoveChip={clear} onClearAll={chips.length ? () => { setSupplierId(''); setCategoryId(''); setPriority(''); } : undefined}
        resultCount={report.data ? rows.length : undefined}
      />

      {report.isPending ? <Loading /> : report.isError ? <ListError onRetry={() => report.refetch()} /> : (
        <DataTable
          columns={columns} rows={rows} groupBy="supplierName" selectable isRowSelectable={r => !!r.proposal}
          selected={selected} onSelectedChange={ids => setSelected(ids.filter(id => typeof id === 'number'))}
          groupHeader={(name, rs: Line[]) => {
            const orders = rs.filter(r => r.proposal);
            return (
              <span className="vb-row" style={{ gap: 12 }}>
                <b>{name}</b>
                <span className="vb-muted">
                  {orders.length} mặt hàng cần đặt · {fmt(orders.reduce((s, r) => s + r.proposal!.proposedQuantity, 0))} sản phẩm
                  {rs.length > orders.length && ` · ${rs.length - orders.length} theo dõi`}
                </span>
              </span>
            );
          }}
          bulkActions={<Button size="sm" icon="file-text" onClick={() => setConfirmReport(true)}>Lập báo cáo {picked.length} đề xuất</Button>}
          onRowClick={r => r.proposal && setAdjusting(r.proposal)} maxHeight="calc(100dvh - 400px)" caption="Báo cáo đề xuất bổ sung hàng theo nhà cung cấp"
          empty={<EmptyState icon="shopping-cart" title={all.length ? 'Không có dòng phù hợp' : 'Chưa có đề xuất bổ sung'}
            description={all.length ? 'Đổi bộ lọc hoặc từ khóa.' : undefined} />}
        />
      )}

      <ConfirmDialog
        open={confirmReport} title={`Lập báo cáo ${picked.length} đề xuất bổ sung?`}
        description={`${new Set(picked.map(r => r.basis.supplierId)).size} nhà cung cấp, tổng ${fmt(picked.reduce((s, r) => s + r.proposal!.proposedQuantity, 0))} sản phẩm.`}
        confirmLabel="Lập báo cáo" onConfirm={runReport} onCancel={() => setConfirmReport(false)}
      />
      {rejecting && <RejectDialog proposal={rejecting} onClose={() => setRejecting(null)} />}
      {adjusting && <ProposalDialog proposal={adjusting} readOnly={false} onClose={() => setAdjusting(null)} />}
    </>
  );
}

/** Báo cáo đề xuất: the reports made (DX-…), newest first; each opens as it was made, to print again. */
export function ReplenishmentReportsPage() {
  const reports = useReports();
  const nav = useNavigate();
  const [search, setSearch] = useState('');
  const rows = (reports.data ?? []).filter(r => matches(search, r.code, r.creatorName));
  const columns: DataTableColumn<ReportListRow>[] = [
    { key: 'code', header: 'Mã báo cáo', width: 150, render: r => <Code>{r.code}</Code> },
    { key: 'createdAt', header: 'Lập lúc', width: 140, render: r => fmtDateTime(r.createdAt) },
    { key: 'creator', header: 'Người lập', render: r => r.creatorName },
    { key: 'proposals', header: 'Đề xuất', numeric: true, width: 90, render: r => fmt(r.proposalCount) },
    { key: 'suppliers', header: 'Nhà cung cấp', numeric: true, width: 110, render: r => fmt(r.supplierCount) },
    { key: 'total', header: 'Tổng số lượng', numeric: true, width: 120, render: r => fmt(r.totalQuantity) },
    {
      key: 'print', header: '', width: 100, align: 'right',
      render: r => <Button size="sm" variant="secondary" icon="printer" onClick={e => { e.stopPropagation(); openPrint(reportPath(r.id)); }}>In lại</Button>,
    },
  ];
  return (
    <div className="vb-stack">
      <div className="vb-row">
        <Button variant="ghost" icon="chevron-left" onClick={() => nav('/ql/de-xuat')}>Đề xuất bổ sung</Button>
      </div>
      <h2 className="vb-panel__title" style={{ fontSize: 18, margin: 0 }}>Báo cáo đề xuất</h2>
      <FilterBar search={search} onSearchChange={setSearch} searchPlaceholder="Tìm theo mã báo cáo, người lập…" resultCount={reports.data ? rows.length : undefined} />
      {reports.isPending ? <Loading /> : reports.isError ? <ListError onRetry={() => reports.refetch()} /> : (
        <DataTable columns={columns} rows={rows} onRowClick={r => openPrint(reportPath(r.id))} maxHeight="calc(100dvh - 300px)" caption="Báo cáo đề xuất"
          empty={<EmptyState icon="file-text" title="Chưa có báo cáo" />} />
      )}
    </div>
  );
}

function HistoryView({ status }: { status: ProposalStatus }) {
  const proposals = useProposals(status);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState<ProposalRow | null>(null);
  const rows: History[] = (proposals.data ?? []).filter(p => matches(search, p.basis.sku, p.basis.productName, p.basis.supplierName, p.reportCode, p.deciderName))
    .map(p => ({ ...p, supplierName: p.basis.supplierName }))
    .sort((a, b) => a.supplierName.localeCompare(b.supplierName, 'vi') || b.proposalDate.localeCompare(a.proposalDate));
  const columns: DataTableColumn<History>[] = [
    { key: 'product', header: 'Mặt hàng', render: p => <span><Code>{p.basis.sku}</Code> {p.basis.productName}</span> },
    { key: 'date', header: 'Lập lúc', width: 104, render: p => fmtShort(p.proposalDate) },
    { key: 'net', header: 'Tồn ròng lúc lập', numeric: true, width: 100, render: p => <b>{fmt(p.netQuantity)}</b> },
    { key: 'rop', header: 'ROP', numeric: true, width: 64, render: p => fmt(p.ropValue, 1) },
    { key: 'eoq', header: 'EOQ', numeric: true, width: 60, render: p => fmt(p.eoqValue) },
    { key: 'priority', header: 'Ưu tiên', width: 104, render: p => <PriorityChip priority={p.priority} /> },
    { key: 'qty', header: 'SL gốc → đề xuất', numeric: true, width: 130, render: p => <span>{fmt(p.baseQuantity)} → <b>{fmt(p.proposedQuantity)}</b> {p.basis.unit}</span> },
    {
      key: 'reason', header: 'Căn cứ', width: 240,
      render: p => (
        <span style={{ whiteSpace: 'normal', fontSize: 12, lineHeight: '16px', display: 'block' }}>
          {[p.adjustBasis, p.adjustReason && `Quản lý: ${p.adjustReason}`, p.rejectReason && `Lý do không đề xuất: ${p.rejectReason}`].filter(Boolean)
            .map((t, i) => <span key={i} style={{ display: 'block' }}>{t}</span>)}
          {!p.adjustBasis && !p.adjustReason && !p.rejectReason && <span className="vb-muted">—</span>}
        </span>
      ),
    },
    { key: 'status', header: 'Trạng thái', width: 190, render: p => <span><StatusOf p={p} /><span className="vb-muted" style={{ display: 'block', fontSize: 12 }}>{p.deciderName ? `${p.deciderName} · ${fmtShort(p.decidedAt)}` : ''}</span></span> },
  ];
  return (
    <>
      <FilterBar search={search} onSearchChange={setSearch} searchPlaceholder="Tìm theo mã SKU, tên hàng, nhà cung cấp, mã báo cáo, người quyết định…" resultCount={proposals.data ? rows.length : undefined} />
      {proposals.isPending ? <Loading /> : proposals.isError ? <ListError onRetry={() => proposals.refetch()} /> : (
        <DataTable columns={columns} rows={rows} groupBy="supplierName" onRowClick={setOpen} maxHeight="calc(100dvh - 380px)" caption="Đề xuất bổ sung đã xử lý"
          empty={<EmptyState icon="shopping-cart" title="Không có đề xuất" description="Đổi trạng thái hoặc từ khóa." />} />
      )}
      {open && <ProposalDialog proposal={open} readOnly onClose={() => setOpen(null)} />}
    </>
  );
}

function StatusOf({ p }: { p: ProposalRow }) {
  const label = PROPOSAL_STATUS_LABEL[p.status];
  if (p.status === 'closed') return <span className="vb-muted">{label}</span>;
  if (p.status === 'reported') {
    return (
      <span className="vb-row" style={{ gap: 4 }}>
        <StatusBadge status="approved" label={label} icon="file-check" />
        {p.reportCode && p.reportId && (
          <Button variant="ghost" size="sm" onClick={e => { e.stopPropagation(); openPrint(reportPath(p.reportId!)); }}>{p.reportCode}</Button>
        )}
      </span>
    );
  }
  return <StatusBadge status={p.status === 'rejected' ? 'rejected' : 'pending'} label={label} />;
}

function RejectDialog({ proposal: p, onClose }: { proposal: ProposalRow; onClose: () => void }) {
  const reject = useRejectProposal();
  const toast = useToast();
  return (
    <ConfirmDialog
      tone="danger" requireReason title={`Loại đề xuất ${p.basis.sku}?`}
      description={`${fmt(p.proposedQuantity)} ${p.basis.unit} ${p.basis.productName}.`}
      confirmLabel="Không đề xuất"
      onConfirm={reason => reject.mutate({ id: p.id, reason }, {
        onSuccess: () => { toast({ tone: 'info', title: `Đã loại đề xuất ${p.basis.sku}` }); onClose(); },
        onError: e => { toast({ tone: 'danger', title: 'Không loại được', message: e.message }); onClose(); },
      })}
      onCancel={onClose}
    />
  );
}

/** The basis of a proposal (Q19) and, while pending, a quantity change with a reason. */
function ProposalDialog({ proposal: p, readOnly, onClose }: { proposal: ProposalRow; readOnly: boolean; onClose: () => void }) {
  const adjust = useAdjustProposal();
  const toast = useToast();
  const [quantity, setQuantity] = useState(String(p.proposedQuantity));
  const [reason, setReason] = useState(p.adjustReason ?? '');
  const errors = fieldErrors(adjust.error);
  const q = parseNumber(quantity);
  const changed = q != null && q !== p.originalQuantity;
  const basis = (
    <div className="vb-panel vb-stack" style={{ padding: 16, background: 'var(--surface-sunken)', gap: 8 }}>
      <div><b>Lúc lập đề xuất</b> <span className="vb-muted">({fmtDateTime(p.proposalDate)})</span></div>
      <NetFormula available={p.availableQuantity} ordered={p.availableQuantity - p.netQuantity} net={p.netQuantity} unit={p.basis.unit} />
      <span style={{ fontVariantNumeric: 'tabular-nums' }}>
        d {fmt(p.avgDailyDemand, 2)}/ngày · còn {days(p.daysLeft)} ngày (L {p.basis.leadTimeDays}) · <PriorityChip priority={p.priority} />
      </span>
      <QuantityFormula p={p} />
      {readOnly && <>
        <div style={{ marginTop: 8 }}><b>Hiện tại</b></div>
        <BasisBlock b={p.basis} />
      </>}
    </div>
  );
  if (readOnly) {
    return (
      <FormDialog title={`Căn cứ đề xuất ${p.basis.sku}`} description={p.basis.productName} submitLabel="Đóng" onSubmit={onClose} onClose={onClose} width={640}>
        {basis}
        <div className="vb-row"><StatusOf p={p} /><span>{fmt(p.proposedQuantity)} {p.basis.unit}</span></div>
      </FormDialog>
    );
  }
  return (
    <FormDialog
      title={`Đề xuất ${p.basis.sku} · ${p.basis.productName}`} description={`${p.basis.supplierName} · ${p.basis.categoryName}`} width={640}
      submitLabel="Lưu số lượng" busy={adjust.isPending} error={formError(adjust.error)} onClose={onClose}
      onSubmit={() => adjust.mutate({ id: p.id, quantity: q, reason }, {
        onSuccess: () => { toast({ tone: 'success', title: `Đã lưu số lượng đề xuất ${p.basis.sku}` }); onClose(); },
      })}
    >
      {basis}
      <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 16 }}>
        <TextField label="Số lượng đề xuất" required inputMode="numeric" suffix={p.basis.unit} value={quantity}
          onChange={e => setQuantity(e.target.value)} error={errors.quantity} helper={`Hệ thống: ${fmt(p.originalQuantity)}`} />
        <TextField label="Lý do điều chỉnh" required={changed} value={reason} onChange={e => setReason(e.target.value)} error={errors.reason}
          placeholder="Ví dụ: làm tròn theo thùng 50 cái" disabled={!changed} />
      </div>
      <div className="vb-muted vb-stack" style={{ gap: 4 }}><SsFormula b={p.basis} /><RopFormula b={p.basis} /><EoqFormula b={p.basis} /></div>
    </FormDialog>
  );
}
