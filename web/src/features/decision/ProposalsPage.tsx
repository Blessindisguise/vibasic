import { useMemo, useState } from 'react';
import { Button, ConfirmDialog, DataTable, EmptyState, FilterBar, KpiTile, PriorityChip, TextField, type DataTableColumn } from '../../design';
import { fmt, fmtDateTime, fmtShort } from '../../app/format';
import { FormDialog } from '../../app/Modal';
import { Segmented } from '../../app/Segmented';
import { useToast } from '../../app/toast';
import { Code, ListError, Loading } from '../../app/ui';
import { matches, parseNumber } from '../../app/text';
import { fieldErrors, formError } from '../../app/catalog';
import { ApprovalBadge } from '../../app/statusBadges';
import {
  useAdjustProposal, useApproveProposals, useProposals, useRejectProposal,
  type ProposalRow, type ProposalStatus,
} from '../../app/decision';
import { BasisBlock, EoqFormula, RopFormula } from './BasisText';

type Row = ProposalRow & { supplierName: string };

/**
 * UC_18 Xem và duyệt đề xuất bổ sung hàng: open proposals grouped by main supplier, with available stock, ROP, EOQ and the
 * proposed quantity; filter by supplier or category; approve several at once, adjust a quantity with a reason, or reject.
 */
export function ProposalsPage() {
  const [status, setStatus] = useState<ProposalStatus>('pending');
  const proposals = useProposals(status);
  const all = useProposals('pending');
  const approve = useApproveProposals();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [priority, setPriority] = useState('');
  const [selected, setSelected] = useState<Array<string | number>>([]);
  const [confirmApprove, setConfirmApprove] = useState(false);
  const [adjusting, setAdjusting] = useState<ProposalRow | null>(null);
  const [rejecting, setRejecting] = useState<ProposalRow | null>(null);

  const source = proposals.data ?? [];
  const suppliers = [...new Map(source.map(p => [p.basis.supplierId, p.basis.supplierName])).entries()];
  const categories = [...new Map(source.map(p => [p.basis.categoryId, p.basis.categoryName])).entries()];
  const rows: Row[] = useMemo(() => source
    .filter(p => (!supplierId || p.basis.supplierId === Number(supplierId)) && (!categoryId || p.basis.categoryId === Number(categoryId))
      && (!priority || p.priority === priority) && matches(search, p.basis.sku, p.basis.productName))
    .map(p => ({ ...p, supplierName: p.basis.supplierName }))
    .sort((a, b) => a.supplierName.localeCompare(b.supplierName, 'vi') || (a.priority === b.priority ? 0 : a.priority === 'urgent' ? -1 : 1)),
  [source, supplierId, categoryId, priority, search]);
  const pending = status === 'pending';
  const urgent = (all.data ?? []).filter(p => p.priority === 'urgent').length;
  const chips = [
    ...(supplierId ? [{ key: 'supplier', label: `NCC: ${suppliers.find(([id]) => id === Number(supplierId))?.[1]}` }] : []),
    ...(categoryId ? [{ key: 'category', label: `Nhóm: ${categories.find(([id]) => id === Number(categoryId))?.[1]}` }] : []),
    ...(priority ? [{ key: 'priority', label: priority === 'urgent' ? 'Khẩn cấp' : 'Cần đặt' }] : []),
  ];
  const clear = (k: string) => (k === 'supplier' ? setSupplierId : k === 'category' ? setCategoryId : setPriority)('');
  const selectedRows = rows.filter(r => selected.includes(r.id));

  const runApprove = () => approve.mutate(selected.map(Number), {
    onSuccess: n => { setConfirmApprove(false); setSelected([]); toast({ tone: 'success', title: `Đã duyệt ${n} đề xuất`, message: 'Gộp các mặt hàng cùng nhà cung cấp khi đặt hàng.' }); },
    onError: e => { setConfirmApprove(false); toast({ tone: 'danger', title: 'Không duyệt được', message: e.message }); },
  });

  const columns: DataTableColumn<Row>[] = [
    {
      key: 'product', header: 'Mặt hàng',
      render: p => <span><Code>{p.basis.sku}</Code> {p.basis.productName} <span className="vb-muted">· {p.basis.categoryName}</span></span>,
    },
    { key: 'available', header: 'Tồn', numeric: true, width: 70, render: p => <b>{fmt(p.basis.available)}</b> },
    { key: 'rop', header: 'ROP', numeric: true, width: 70, render: p => fmt(p.basis.rop, 1) },
    { key: 'eoq', header: 'EOQ', numeric: true, width: 70, render: p => fmt(p.eoqValue, 0) },
    { key: 'days', header: 'Còn (ngày)', numeric: true, width: 90, render: p => p.basis.daysLeft == null ? '—' : fmt(p.basis.daysLeft, 1) },
    { key: 'priority', header: 'Ưu tiên', width: 110, render: p => <PriorityChip priority={p.priority} /> },
    {
      key: 'qty', header: 'SL đề xuất', numeric: true, width: 130,
      render: p => (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <b>{fmt(p.proposedQuantity)}</b> {p.basis.unit}
          {pending && <Button size="sm" variant="ghost" icon="square-pen" aria-label={`Sửa số lượng ${p.basis.sku}`} onClick={e => { e.stopPropagation(); setAdjusting(p); }} />}
        </span>
      ),
    },
    {
      key: 'reason', header: 'Lý do', width: 300,
      render: p => (
        <span style={{ whiteSpace: 'normal', fontSize: 12, lineHeight: '16px', display: 'block' }}>
          Tồn {fmt(p.basis.available)} ≤ ROP {fmt(p.basis.rop, 1)}{p.priority === 'urgent' && ` (≤ SS ${fmt(p.basis.safetyStock)})`}.{' '}
          {p.adjustReason ? <>EOQ {fmt(p.originalQuantity)} → {fmt(p.proposedQuantity)}: {p.adjustReason}</> : <>Số lượng = EOQ làm tròn lên.</>}
          {p.rejectReason && <><br />Từ chối: {p.rejectReason}</>}
        </span>
      ),
    },
    pending
      ? { key: 'actions', header: '', width: 90, align: 'right', render: p => <Button size="sm" variant="danger-outline" onClick={e => { e.stopPropagation(); setRejecting(p); }}>Từ chối</Button> }
      : { key: 'status', header: 'Trạng thái', width: 170, render: p => <span><StatusOf p={p} /><span className="vb-muted" style={{ display: 'block', fontSize: 12 }}>{p.approverName ? `${p.approverName} · ${fmtShort(p.approvedAt)}` : fmtShort(p.proposalDate)}</span></span> },
  ];

  return (
    <div className="vb-stack">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
        <KpiTile label="Đề xuất chờ duyệt" value={fmt(all.data?.length)} icon="shopping-cart" tone={all.data?.length ? 'warning' : 'neutral'} onClick={() => { setStatus('pending'); setPriority(''); }} />
        <KpiTile label="Khẩn cấp" value={fmt(urgent)} icon="triangle-alert" tone={urgent ? 'danger' : 'neutral'} footnote="Tồn đã xuống mức tồn kho an toàn"
          onClick={() => { setStatus('pending'); setPriority('urgent'); }} />
        <KpiTile label="Nhà cung cấp cần đặt" value={fmt(new Set((all.data ?? []).map(p => p.basis.supplierId)).size)} icon="factory" />
        <KpiTile label="Tổng số lượng đề xuất" value={fmt((all.data ?? []).reduce((s, p) => s + p.proposedQuantity, 0))} icon="boxes" />
      </div>

      <Segmented<ProposalStatus>
        label="Trạng thái đề xuất" value={status} onChange={s => { setStatus(s); setSelected([]); }}
        options={[
          { value: 'pending', label: 'Chờ duyệt', count: all.data?.length },
          { value: 'approved', label: 'Đã duyệt' },
          { value: 'rejected', label: 'Từ chối' },
          { value: 'closed', label: 'Đã đóng' },
        ]}
      />
      <FilterBar
        search={search} onSearchChange={setSearch} searchPlaceholder="Tìm theo mã SKU, tên hàng…"
        filters={[
          { key: 'supplier', label: 'Nhà cung cấp', value: supplierId, options: suppliers.map(([id, name]) => ({ value: String(id), label: name })) },
          { key: 'category', label: 'Nhóm hàng', value: categoryId, options: categories.map(([id, name]) => ({ value: String(id), label: name })) },
          { key: 'priority', label: 'Ưu tiên', value: priority, options: [{ value: 'urgent', label: 'Khẩn cấp' }, { value: 'order', label: 'Cần đặt' }] },
        ]}
        onFilterChange={(k, v) => (k === 'supplier' ? setSupplierId : k === 'category' ? setCategoryId : setPriority)(v)}
        chips={chips} onRemoveChip={clear} onClearAll={chips.length ? () => { setSupplierId(''); setCategoryId(''); setPriority(''); } : undefined}
        resultCount={proposals.data ? rows.length : undefined}
      />

      {proposals.isPending ? <Loading /> : proposals.isError ? <ListError onRetry={() => proposals.refetch()} /> : (
        <DataTable
          columns={columns} rows={rows} groupBy="supplierName" selectable={pending} selected={selected} onSelectedChange={setSelected}
          groupHeader={(name, rs) => (
            <span className="vb-row" style={{ gap: 12 }}>
              <b>{name}</b>
              <span className="vb-muted">{rs.length} mặt hàng · {fmt(rs.reduce((s: number, r: Row) => s + r.proposedQuantity, 0))} sản phẩm</span>
            </span>
          )}
          bulkActions={<Button size="sm" icon="check" onClick={() => setConfirmApprove(true)}>Duyệt {selected.length} đề xuất</Button>}
          onRowClick={p => setAdjusting(p)} maxHeight="calc(100dvh - 380px)" caption="Đề xuất bổ sung hàng theo nhà cung cấp"
          empty={<EmptyState icon="shopping-cart" title={pending ? 'Chưa có đề xuất bổ sung' : 'Không có đề xuất'}
            description={pending ? 'Đề xuất được tạo khi tồn kho khả dụng không lớn hơn ROP. Xem ROP, EOQ hiện tại ở màn Cảnh báo tồn kho.' : 'Đổi bộ lọc hoặc trạng thái.'} />}
        />
      )}

      <ConfirmDialog
        open={confirmApprove} title={`Duyệt ${selected.length} đề xuất bổ sung?`}
        description={`${new Set(selectedRows.map(r => r.basis.supplierId)).size} nhà cung cấp, tổng ${fmt(selectedRows.reduce((s, r) => s + r.proposedQuantity, 0))} sản phẩm. Việc đặt hàng với nhà cung cấp làm ngoài hệ thống.`}
        confirmLabel="Duyệt đề xuất" onConfirm={runApprove} onCancel={() => setConfirmApprove(false)}
      />
      {rejecting && <RejectDialog proposal={rejecting} onClose={() => setRejecting(null)} />}
      {adjusting && <AdjustDialog proposal={adjusting} readOnly={!pending} onClose={() => setAdjusting(null)} />}
    </div>
  );
}

function StatusOf({ p }: { p: ProposalRow }) {
  return p.status === 'closed' ? <span className="vb-muted">Đã đóng (tồn đã vượt ROP)</span> : <ApprovalBadge status={p.status} />;
}

function RejectDialog({ proposal: p, onClose }: { proposal: ProposalRow; onClose: () => void }) {
  const reject = useRejectProposal();
  const toast = useToast();
  return (
    <ConfirmDialog
      tone="danger" requireReason title={`Từ chối đề xuất ${p.basis.sku}?`}
      description={`${fmt(p.proposedQuantity)} ${p.basis.unit} ${p.basis.productName}. Hệ thống không tạo lại đề xuất cho đến khi tồn kho vượt ROP rồi giảm lại.`}
      confirmLabel="Từ chối đề xuất"
      onConfirm={reason => reject.mutate({ id: p.id, reason }, {
        onSuccess: () => { toast({ tone: 'info', title: `Đã từ chối đề xuất ${p.basis.sku}` }); onClose(); },
        onError: e => { toast({ tone: 'danger', title: 'Không từ chối được', message: e.message }); onClose(); },
      })}
      onCancel={onClose}
    />
  );
}

/** Proposal basis (UC_18 step 5) and, while pending, a quantity change with a reason. */
function AdjustDialog({ proposal: p, readOnly, onClose }: { proposal: ProposalRow; readOnly: boolean; onClose: () => void }) {
  const adjust = useAdjustProposal();
  const toast = useToast();
  const [quantity, setQuantity] = useState(String(p.proposedQuantity));
  const [reason, setReason] = useState(p.adjustReason ?? '');
  const errors = fieldErrors(adjust.error);
  const q = parseNumber(quantity);
  const changed = q != null && q !== p.originalQuantity;
  const basis = (
    <div className="vb-panel" style={{ padding: 16, background: 'var(--surface-sunken)' }}>
      <BasisBlock b={p.basis} />
      <div className="vb-muted" style={{ marginTop: 8 }}>Đề xuất lập {fmtDateTime(p.proposalDate)}. EOQ lúc đề xuất {fmt(p.eoqValue, 1)} → {fmt(p.originalQuantity)} {p.basis.unit}.</div>
    </div>
  );
  if (readOnly) {
    return (
      <FormDialog title={`Căn cứ đề xuất ${p.basis.sku}`} description={p.basis.productName} submitLabel="Đóng" onSubmit={onClose} onClose={onClose}>
        {basis}
        <div className="vb-row"><StatusOf p={p} /><span>{fmt(p.proposedQuantity)} {p.basis.unit}</span></div>
      </FormDialog>
    );
  }
  return (
    <FormDialog
      title={`Đề xuất ${p.basis.sku} · ${p.basis.productName}`} description={`${p.basis.supplierName} · ${p.basis.categoryName}`} width={620}
      submitLabel="Lưu số lượng" busy={adjust.isPending} error={formError(adjust.error)} onClose={onClose}
      onSubmit={() => adjust.mutate({ id: p.id, quantity: q, reason }, {
        onSuccess: () => { toast({ tone: 'success', title: `Đã lưu số lượng đề xuất ${p.basis.sku}` }); onClose(); },
      })}
    >
      {basis}
      <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 16 }}>
        <TextField label="Số lượng đề xuất" required inputMode="numeric" suffix={p.basis.unit} value={quantity}
          onChange={e => setQuantity(e.target.value)} error={errors.quantity} helper={`EOQ: ${fmt(p.originalQuantity)}`} />
        <TextField label="Lý do điều chỉnh" required={changed} value={reason} onChange={e => setReason(e.target.value)} error={errors.reason}
          placeholder="Ví dụ: làm tròn theo pallet 50 cái" disabled={!changed} helper={changed ? undefined : 'Chỉ cần khi khác EOQ.'} />
      </div>
      <div className="vb-muted"><RopFormula b={p.basis} /> · <EoqFormula b={p.basis} /></div>
    </FormDialog>
  );
}
