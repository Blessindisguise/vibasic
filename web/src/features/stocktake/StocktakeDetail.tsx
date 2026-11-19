import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertBanner, ApprovalStepper, Button, Checkbox, ConfirmDialog, DataTable, EmptyState, type DataTableColumn } from '../../design';
import { ApiError } from '../../app/api';
import { fmt, fmtDateTime, fmtShort } from '../../app/format';
import { SerialRanges } from '../../app/SerialRanges';
import { useToast } from '../../app/toast';
import { Code, ListError, Loading, NO_MATCH, PanelSearch } from '../../app/ui';
import { matches } from '../../app/text';
import { ApprovalBadge, LotStatusBadge } from '../../app/statusBadges';
import { useStocktake, useStocktakeAction, type StocktakeDetailRow } from '../../app/stock';
import { reportHref, type ReportRow } from '../../app/receiving';
import { ReportDecision } from '../abnormal/ReportDecision';
import { ReportStatusCell } from '../abnormal/ReportDecision';

/** UC_15: system vs actual per lot, reasons, attached abnormal reports; approve to adjust stock or reject for a recount. */
export function StocktakeDetail({ id, role, back }: { id: number; role: 'manager' | 'staff'; back: string }) {
  const stocktake = useStocktake(id);
  const action = useStocktakeAction();
  const toast = useToast();
  const nav = useNavigate();
  const [dialog, setDialog] = useState<'approve' | 'reject' | null>(null);
  const touch = role === 'staff';
  const [search, setSearch] = useState('');
  const [onlyDiff, setOnlyDiff] = useState(false);

  if (stocktake.isPending) return <Loading />;
  if (stocktake.error instanceof ApiError && stocktake.error.status === 404) {
    return <div className="vb-panel"><EmptyState icon="search" title="Không tìm thấy phiếu kiểm kê" action={<Button variant="secondary" onClick={() => nav(back)}>Quay lại</Button>} /></div>;
  }
  if (stocktake.isError) return <ListError onRetry={() => stocktake.refetch()} />;
  const { header: h, details, reports } = stocktake.data;

  const run = (kind: 'approve' | 'reject', reason?: string) => action.mutate({ id, action: kind, reason }, {
    onSuccess: () => {
      setDialog(null);
      toast(kind === 'approve'
        ? { tone: 'success', title: `Đã duyệt phiếu ${h.code}` }
        : { tone: 'info', title: `Đã từ chối phiếu ${h.code}` });
    },
    onError: e => { setDialog(null); toast({ tone: 'danger', title: 'Không thực hiện được', message: e.message }); },
  });

  const columns: DataTableColumn<StocktakeDetailRow>[] = [
    { key: 'lotCode', header: 'Mã lô', width: 130, render: d => <Code>{d.lotCode}</Code> },
    { key: 'product', header: 'Mặt hàng', render: d => <span><Code>{d.sku}</Code> {d.productName}</span> },
    { key: 'lotStatus', header: 'Trạng thái lô', width: 130, render: d => <LotStatusBadge status={d.lotStatus} /> },
    {
      key: 'method', header: 'Cách đếm', width: 130,
      render: d => (
        <span style={{ display: 'inline-flex', flexDirection: 'column' }}>
          <span>{d.method === 'scan' ? 'Quét tem' : 'Nhập số'}</span>
          {d.countedAt && <span className="vb-muted" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{fmtShort(d.countedAt)}</span>}
        </span>
      ),
    },
    { key: 'system', header: 'Trên kệ (HT)', numeric: true, width: 110, render: d => fmt(d.systemQuantity) },
    { key: 'actual', header: 'Thực tế', numeric: true, width: 90, render: d => <b>{fmt(d.actualQuantity)}</b> },
    {
      key: 'diff', header: 'Chênh lệch', numeric: true, width: 110,
      render: d => {
        const diff = d.actualQuantity - d.systemQuantity;
        return diff === 0 ? <span className="vb-muted">0</span>
          : <b style={{ color: diff < 0 ? 'var(--red-700)' : 'var(--blue-700)' }}>{diff > 0 ? '+' : '−'}{fmt(Math.abs(diff))} {d.unit}</b>;
      },
    },
    {
      key: 'reason', header: 'Lý do',
      render: d => (
        <span style={{ display: 'flex', flexDirection: 'column', gap: 4, whiteSpace: 'normal' }}>
          {d.reason ? <span>{d.reason}</span> : <span className="vb-muted">—</span>}
          {d.unlabeled > 0 && <span className="vb-muted">{fmt(d.unlabeled)} {d.unit} không có tem</span>}
          {(d.missingSerials?.length ?? 0) > 0 && <>
            <span className="vb-muted">Không quét được:</span>
            <SerialRanges serials={d.missingSerials!} unit={d.unit} />
          </>}
        </span>
      ),
    },
  ];
  const reportColumns: DataTableColumn<ReportRow>[] = [
    { key: 'code', header: 'Biên bản', width: 130, render: r => <Code>{r.code}</Code> },
    { key: 'lot', header: 'Lô', width: 130, render: r => <Code>{r.lotCode}</Code> },
    { key: 'description', header: 'Mô tả lỗi', render: r => <span style={{ whiteSpace: 'normal' }}>{r.description}</span> },
    { key: 'quantity', header: 'SL lỗi', numeric: true, width: 80, render: r => fmt(r.quantity) },
    { key: 'status', header: 'Trạng thái', width: 150, render: r => <ReportStatusCell report={r} /> },
    ...(role === 'manager' ? [{ key: 'actions', header: '', width: 220, align: 'right' as const, render: (r: ReportRow) => <ReportDecision report={r} /> }] : []),
  ];

  return (
    <div className="vb-stack">
      <div className="vb-row"><Button variant="ghost" size={touch ? 'lg' : 'md'} icon="chevron-left" onClick={() => nav(back)}>Kiểm kê</Button></div>
      <section className="vb-panel">
        <div className="vb-panel__head" style={{ flexWrap: 'wrap', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <div className="vb-row" style={{ gap: 10 }}>
              <h2 className="vb-panel__title" style={{ fontSize: touch ? 20 : 18, letterSpacing: 'var(--tracking-code)' }}>{h.code}</h2>
              <ApprovalBadge status={h.status} size={touch ? 'lg' : 'md'} />
            </div>
            <div className="vb-muted" style={{ marginTop: 2 }}>Kế hoạch <b>{h.planCode}</b> · kiểm {fmtDateTime(h.stocktakeDate)} bởi {h.creatorName}</div>
          </div>
          {role === 'manager' && h.status === 'pending' && (
            <div className="vb-row">
              <Button variant="danger-outline" icon="circle-x" onClick={() => setDialog('reject')}>Từ chối, kiểm lại</Button>
              <Button icon="check" onClick={() => setDialog('approve')}>Duyệt và điều chỉnh tồn</Button>
            </div>
          )}
        </div>
        <div className="vb-panel__body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <ApprovalStepper status={h.status} draftLabel="Kiểm đếm" size={touch ? 'lg' : 'md'}
            history={{ draft: { by: h.creatorName }, pending: { at: fmtDateTime(h.stocktakeDate) }, [h.status === 'rejected' ? 'rejected' : 'approved']: h.approvedAt ? { by: h.approverName, at: fmtDateTime(h.approvedAt) } : undefined }} />
          <div className="vb-row" style={{ gap: 24, fontVariantNumeric: 'tabular-nums' }}>
            <span>{fmt(h.lotCount)} lô kiểm</span>
            <span>{fmt(h.diffLots)} lô chênh lệch</span>
            <span style={{ color: h.shortage ? 'var(--red-700)' : undefined }}>Thiếu {fmt(h.shortage)}</span>
            <span style={{ color: h.surplus ? 'var(--blue-700)' : undefined }}>Thừa {fmt(h.surplus)}</span>
          </div>
          {h.status === 'rejected' && <AlertBanner tone="danger" title={`Bị từ chối bởi ${h.approverName}`}>Lý do: {h.rejectReason}</AlertBanner>}
          {h.status === 'approved' && <AlertBanner tone="success" title="Tồn kho đã điều chỉnh" />}
          {role === 'manager' && h.status === 'pending' && reports.some(r => r.status === 'pending') && (
            <AlertBanner tone="warning" title="Có biên bản bất thường kèm theo" />
          )}
        </div>
      </section>
      <section className="vb-panel">
        <div className="vb-panel__head" style={{ flexWrap: 'wrap', gap: 12 }}>
          <h3 className="vb-panel__title">Đối chiếu theo lô <span className="vb-muted">({fmt(details.length)})</span></h3>
          <PanelSearch size={touch ? 'lg' : 'md'} value={search} onChange={setSearch} placeholder="Mã lô, SKU, tên hàng…" label="Lọc lô" />
          <Checkbox size={touch ? 'lg' : 'md'} label="Chỉ lô chênh lệch" checked={onlyDiff} onChange={e => setOnlyDiff(e.target.checked)} />
        </div>
        <DataTable
          columns={columns} density={touch ? 'default' : 'compact'} caption="Đối chiếu theo lô"
          rows={details.filter(d => matches(search, d.lotCode, d.sku, d.productName) && (!onlyDiff || d.actualQuantity !== d.systemQuantity))}
          empty={search || onlyDiff ? NO_MATCH : undefined}
        />
      </section>
      {reports.length > 0 && (
        <section className="vb-panel">
          <div className="vb-panel__head"><h3 className="vb-panel__title">Biên bản bất thường kèm theo</h3></div>
          <DataTable columns={reportColumns} rows={reports} density={touch ? 'default' : 'compact'} onRowClick={r => nav(reportHref(role, r.id))} caption="Biên bản kèm theo" />
        </section>
      )}
      <ConfirmDialog
        open={dialog === 'approve'} title={`Duyệt phiếu ${h.code}?`}
        description={h.diffLots === 0 ? 'Khớp hệ thống.' : `${h.diffLots} lô chênh lệch · thiếu ${fmt(h.shortage)} · thừa ${fmt(h.surplus)}.`}
        confirmLabel="Duyệt và điều chỉnh" onConfirm={() => run('approve')} onCancel={() => setDialog(null)}
      />
      <ConfirmDialog
        open={dialog === 'reject'} tone="danger" requireReason title={`Từ chối phiếu ${h.code}?`}
        confirmLabel="Từ chối, kiểm lại" onConfirm={reason => run('reject', reason)} onCancel={() => setDialog(null)}
      />
    </div>
  );
}
