import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertBanner, ApprovalStepper, Button, ConfirmDialog, DataTable, EmptyState, LotCard, ScanInput, TextField, type DataTableColumn,
} from '../../design';
import { ApiError } from '../../app/api';
import { fmt, fmtDate, fmtDateTime } from '../../app/format';
import { FormDialog } from '../../app/Modal';
import { useToast } from '../../app/toast';
import { Code, ListError, Loading } from '../../app/ui';
import { ApprovalBadge, IssueStatusBadge } from '../../app/statusBadges';
import { fieldErrors, formError } from '../../app/catalog';
import { useDeliver, useIssue, useIssueAction, useReportDefect, useScan, type IssueLine, type IssueView } from '../../app/issuing';
import type { ReportRow } from '../../app/receiving';
import { ageDays } from '../staff/issuing/OrderAllocationPage';

type Role = 'manager' | 'staff';

/** UC_09 step 5 / UC_10 step 2 for issues; staff pick, scan, report defects and deliver here once approved (UC_08). */
export function IssueDetail({ id, role, basePath }: { id: number; role: Role; basePath: string }) {
  const issue = useIssue(id);
  const action = useIssueAction();
  const toast = useToast();
  const nav = useNavigate();
  const [dialog, setDialog] = useState<'approve' | 'reject' | null>(null);
  const touch = role === 'staff';
  const size = touch ? 'lg' : 'md';

  if (issue.isPending) return <Loading />;
  if (issue.error instanceof ApiError && issue.error.status === 404) {
    return (
      <div className="vb-panel">
        <EmptyState icon="search" title="Không tìm thấy phiếu xuất" description="Phiếu không tồn tại."
          action={<Button variant="secondary" onClick={() => nav(basePath)}>Về danh sách</Button>} />
      </div>
    );
  }
  if (issue.isError) return <ListError onRetry={() => issue.refetch()} />;
  const { header: h, lines, reports } = issue.data;
  const picking = role === 'staff' && h.status === 'approved';

  const run = (kind: 'approve' | 'reject', reason?: string) => action.mutate({ id, action: kind, reason }, {
    onSuccess: () => { setDialog(null); toast({ tone: kind === 'approve' ? 'success' : 'info', title: kind === 'approve' ? `Đã duyệt phiếu ${h.code}` : `Đã từ chối phiếu ${h.code}` }); },
    onError: e => { setDialog(null); toast({ tone: 'danger', title: 'Không thực hiện được', message: e.message }); },
  });

  const stepStatus = h.status === 'pending' ? 'pending' : h.status === 'rejected' ? 'rejected' : h.status === 'onHold' ? 'pending' : 'approved';

  return (
    <div className="vb-stack">
      <div className="vb-row">
        <Button variant="ghost" size={size} icon="chevron-left" onClick={() => nav(touch ? '/kho/xuat-kho?tab=phieu' : basePath)}>Danh sách phiếu xuất</Button>
      </div>

      <section className="vb-panel">
        <div className="vb-panel__head" style={{ flexWrap: 'wrap', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <div className="vb-row" style={{ gap: 10 }}>
              <h2 className="vb-panel__title" style={{ fontSize: touch ? 20 : 18, letterSpacing: 'var(--tracking-code)' }}>{h.code}</h2>
              <IssueStatusBadge status={h.status} size={size} />
            </div>
            <div className="vb-muted" style={{ marginTop: 2, fontSize: touch ? 14 : undefined }}>
              Đơn <b>{h.orderCode}</b>{h.customerName && ` · ${h.customerName}`} · Lập {fmtDateTime(h.issueDate)} bởi {h.creatorName}
            </div>
          </div>
          {role === 'manager' && h.status === 'pending' && (
            <div className="vb-row">
              <Button variant="danger-outline" icon="circle-x" onClick={() => setDialog('reject')}>Từ chối phiếu</Button>
              <Button icon="check" onClick={() => setDialog('approve')}>Duyệt phiếu</Button>
            </div>
          )}
        </div>
        <div className="vb-panel__body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <ApprovalStepper
            status={stepStatus} draftLabel="Lập phiếu" size={size}
            history={{
              draft: { by: h.creatorName, at: fmtDateTime(h.issueDate) },
              pending: { at: fmtDateTime(h.issueDate) },
              [h.status === 'rejected' ? 'rejected' : 'approved']: h.approvedAt ? { by: h.approverName, at: fmtDateTime(h.approvedAt) } : undefined,
            }}
          />
          {h.status === 'rejected' && <AlertBanner tone="danger" title={`Bị từ chối bởi ${h.approverName}`}>Lý do: {h.rejectReason}. Sản phẩm đã được gỡ khỏi phiếu, tồn kho giữ nguyên.</AlertBanner>}
          {h.status === 'onHold' && <AlertBanner tone="warning" title="Phiếu chờ xử lý">{h.holdReason} Sản phẩm đã được gỡ khỏi phiếu. Lập phiếu mới cho đơn {h.orderCode} khi có hàng.</AlertBanner>}
          {h.status === 'pending' && role === 'staff' && <AlertBanner tone="info">Chờ quản lý duyệt. Sản phẩm trong danh sách đã được giữ chỗ cho phiếu này.</AlertBanner>}
          {h.status === 'issued' && (
            <AlertBanner tone="success" title="Đã giao hàng">
              Giao cho {h.receiverName} lúc {fmtDateTime(h.deliveredAt)}{h.delivererName && `, nhân viên ${h.delivererName}`}. Tồn kho đã trừ theo từng lô.
            </AlertBanner>
          )}
        </div>
      </section>

      {picking ? <PickingPanel view={issue.data} /> : <LinesPanel lines={lines} touch={touch} />}

      {reports.length > 0 && <ReportsPanel reports={reports} touch={touch} />}

      <ConfirmDialog
        open={dialog === 'approve'} title={`Duyệt phiếu ${h.code}?`}
        description={`Nhân viên kho được lấy ${fmt(h.totalQuantity)} sản phẩm theo danh sách lô FIFO và giao cho đơn ${h.orderCode}.`}
        confirmLabel="Duyệt phiếu" onConfirm={() => run('approve')} onCancel={() => setDialog(null)}
      />
      <ConfirmDialog
        open={dialog === 'reject'} tone="danger" requireReason title={`Từ chối phiếu ${h.code}?`}
        description={`Sản phẩm đã giữ chỗ được trả về tồn kho; đơn ${h.orderCode} trở về Chưa xuất.`}
        confirmLabel="Từ chối phiếu" onConfirm={reason => run('reject', reason)} onCancel={() => setDialog(null)}
      />
    </div>
  );
}

/** Lines with the lots and item codes attached (read-only). */
function LinesPanel({ lines, touch }: { lines: IssueLine[]; touch: boolean }) {
  return (
    <section className="vb-panel">
      <div className="vb-panel__head"><h3 className="vb-panel__title">Mặt hàng và lô lấy hàng</h3></div>
      <div className="vb-panel__body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {lines.map(line => (
          <div key={line.detailId} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div className="vb-row" style={{ justifyContent: 'space-between' }}>
              <span style={{ font: touch ? 'var(--type-touch-body)' : 'var(--type-body-strong)', fontWeight: 600 }}><Code>{line.sku}</Code> {line.productName}</span>
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(line.quantity)} {line.unit}</span>
            </div>
            {line.lots.length === 0 && <span className="vb-muted">Không còn sản phẩm gắn vào dòng này.</span>}
            {line.lots.map((lot, i) => (
              <div key={lot.receiptDetailId} style={{ paddingLeft: 12, borderLeft: '2px solid var(--border-default)' }}>
                <div className="vb-row" style={{ gap: 8 }}>
                  <span className="vb-muted">FIFO {i + 1}</span><Code>{lot.lotCode}</Code>
                  <span className="vb-muted">nhập {fmtDate(lot.receivedDate)} · {fmt(lot.items.length)} {line.unit}</span>
                </div>
                <div className="vb-serials">
                  {lot.items.map(it => <span key={it.itemId} className={`vb-serial${it.pickedAt || it.status === 'issued' ? ' vb-serial--picked' : ''}`}>{it.serial}</span>)}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

function ReportsPanel({ reports, touch }: { reports: ReportRow[]; touch: boolean }) {
  const columns: DataTableColumn<ReportRow>[] = [
    { key: 'code', header: 'Biên bản', width: 130, render: r => <Code>{r.code}</Code> },
    { key: 'lot', header: 'Lô', width: 130, render: r => <Code>{r.lotCode}</Code> },
    { key: 'description', header: 'Mô tả lỗi', render: r => <span style={{ whiteSpace: 'normal' }}>{r.description}</span> },
    { key: 'quantity', header: 'SL lỗi', numeric: true, width: 80, render: r => fmt(r.quantity) },
    { key: 'status', header: 'Trạng thái', width: 120, render: r => <ApprovalBadge status={r.status} /> },
  ];
  return (
    <section className="vb-panel">
      <div className="vb-panel__head"><h3 className="vb-panel__title">Biên bản bất thường phát sinh khi xuất</h3></div>
      <DataTable columns={columns} rows={reports} density={touch ? 'default' : 'compact'} caption="Biên bản bất thường của phiếu xuất" />
    </section>
  );
}

/** UC_08: scan every item on the pick list (lot by lot, FIFO), report defects, then confirm delivery. */
function PickingPanel({ view }: { view: IssueView }) {
  const { header: h, lines } = view;
  const scan = useScan(h.id);
  const toast = useToast();
  const [code, setCode] = useState('');
  const [feedback, setFeedback] = useState<{ state: 'success' | 'error'; message: string; key: number } | null>(null);
  const [defectOpen, setDefectOpen] = useState(false);
  const [deliverOpen, setDeliverOpen] = useState(false);
  const [lastSerial, setLastSerial] = useState<string | null>(null);
  const total = lines.reduce((s, l) => s + l.lots.reduce((n, lot) => n + lot.items.length, 0), 0);
  const picked = lines.reduce((s, l) => s + l.picked, 0);
  const done = total > 0 && picked === total;

  const submitScan = (value: string) => {
    if (!value.trim()) return;
    scan.mutate(value.trim(), {
      onSuccess: r => {
        setLastSerial(r.serial);
        setFeedback({
          state: 'success', key: Date.now(),
          message: r.alreadyPicked ? `${r.serial} đã quét trước đó.` : `Đúng: ${r.serial} · lô ${r.lotCode} · ${r.picked}/${r.total}`,
        });
        setCode('');
      },
      onError: e => { setFeedback({ state: 'error', message: e.message, key: Date.now() }); setCode(''); },
    });
  };

  return (
    <>
      <section className="vb-panel" style={{ position: 'sticky', top: -24, zIndex: 3 }}>
        <div className="vb-panel__body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <ScanInput
            value={code} onChange={setCode} onSubmit={submitScan} autoFocus size="lg" scanKey={feedback?.key ?? 0}
            label="Quét mã từng sản phẩm" placeholder="Quét tem sản phẩm (SP-…)" state={feedback?.state ?? 'idle'}
            message={feedback?.message ?? 'Lấy hàng theo thứ tự FIFO bên dưới, quét mã từng sản phẩm để đối chiếu.'}
          />
          <div className="vb-row" style={{ gap: 12 }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ height: 10, background: 'var(--grey-100)', borderRadius: 5, overflow: 'hidden' }}>
                <div style={{ width: `${(picked / Math.max(1, total)) * 100}%`, height: '100%', background: 'var(--green-500)', transition: 'width var(--duration-base, 200ms) cubic-bezier(.2,0,0,1)' }} />
              </div>
              <div style={{ marginTop: 4, font: 'var(--type-touch-body)', fontVariantNumeric: 'tabular-nums' }}>Đã quét <b>{fmt(picked)}</b>/{fmt(total)} sản phẩm</div>
            </div>
            <Button size="xl" variant="danger-outline" icon="shield-alert" onClick={() => setDefectOpen(true)}>Báo hàng lỗi</Button>
            <Button size="xl" icon="truck" disabled={!done} onClick={() => setDeliverOpen(true)}>Xác nhận giao hàng</Button>
          </div>
        </div>
      </section>

      {lines.map(line => {
        const firstOpen = line.lots.findIndex(l => l.items.some(i => !i.pickedAt));
        return (
          <section key={line.detailId} className="vb-panel">
            <div className="vb-panel__head">
              <span style={{ font: 'var(--type-touch-heading)', fontSize: 17 }}><Code>{line.sku}</Code> {line.productName}</span>
              <span style={{ marginLeft: 'auto', font: 'var(--type-touch-body)', fontVariantNumeric: 'tabular-nums' }}>{fmt(line.picked)}/{fmt(line.quantity)} {line.unit}</span>
            </div>
            <div className="vb-panel__body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {line.lots.map((lot, i) => {
                const lotPicked = lot.items.filter(it => it.pickedAt).length;
                const state = lot.lotStatus !== 'normal' ? 'locked' : lotPicked === lot.items.length ? 'done' : i === firstOpen ? (lotPicked > 0 ? 'picking' : 'next') : 'waiting';
                return (
                  <div key={lot.receiptDetailId} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <LotCard size="lg" fifoOrder={i + 1} lotCode={lot.lotCode} receivedAt={fmtDate(lot.receivedDate)} ageDays={ageDays(lot.receivedDate)}
                      toPick={lot.items.length} picked={lotPicked} unit={line.unit} state={state} />
                    <div className="vb-serials" style={{ paddingLeft: 68 }}>
                      {lot.items.map(it => <span key={it.itemId} className={`vb-serial${it.pickedAt ? ' vb-serial--picked' : ''}`}>{it.pickedAt ? '✓ ' : ''}{it.serial}</span>)}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      {defectOpen && <DefectDialog view={view} preselect={lastSerial} onClose={() => setDefectOpen(false)} onDone={msg => toast(msg)} />}
      {deliverOpen && <DeliverDialog view={view} onClose={() => setDeliverOpen(false)} />}
    </>
  );
}

/** UC_08 3.1 / UC_11: pick the defective items, describe the defect; the lot is quarantined and the items replaced by FIFO. */
function DefectDialog({ view, preselect, onClose, onDone }: {
  view: IssueView; preselect: string | null; onClose: () => void;
  onDone: (t: { tone: 'success' | 'warning' | 'danger'; title: string; message?: string }) => void;
}) {
  const report = useReportDefect(view.header.id);
  const [selected, setSelected] = useState<string[]>(preselect ? [preselect] : []);
  const [description, setDescription] = useState('');
  const errors = fieldErrors(report.error);
  const toggle = (s: string) => setSelected(sel => (sel.includes(s) ? sel.filter(x => x !== s) : [...sel, s]));

  const submit = () => report.mutate({ serials: selected, description }, {
    onSuccess: ({ result }) => {
      onDone(result.onHold
        ? { tone: 'danger', title: `Không đủ hàng thay thế, phiếu ${view.header.code} chuyển Chờ xử lý`, message: `Đã lập ${result.reportCodes.join(', ')}. Trả toàn bộ hàng đã lấy về kệ.` }
        : {
          tone: 'warning', title: `Đã lập ${result.reportCodes.join(', ')}; lô đã tạm cách ly`,
          message: `Đổi ${result.replaced} sản phẩm sang lô kế tiếp theo FIFO.${result.returnPicked.length ? ` Trả lại kệ: ${result.returnPicked.join(', ')}.` : ''} Quét lại theo danh sách mới.`,
        });
      onClose();
    },
  });

  return (
    <FormDialog
      title="Báo hàng lỗi" width={680}
      description="Hệ thống lập biên bản bất thường, tạm cách ly cả lô chứa sản phẩm lỗi và thay bằng sản phẩm kế tiếp theo FIFO."
      submitLabel="Lập biên bản" busy={report.isPending} error={formError(report.error)} onSubmit={submit} onClose={onClose}
    >
      <div className="vb-field">
        <span className="vb-field__label">Sản phẩm lỗi<span className="req" aria-hidden="true">*</span> <span className="vb-muted">({selected.length} đã chọn)</span></span>
        <div style={{ maxHeight: 240, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {view.lines.map(line => line.lots.map(lot => (
            <div key={lot.receiptDetailId}>
              <div className="vb-muted"><Code>{line.sku}</Code> · lô {lot.lotCode}</div>
              <div className="vb-serials">
                {lot.items.map(it => (
                  <button key={it.itemId} type="button" className="vb-serial" aria-pressed={selected.includes(it.serial)} onClick={() => toggle(it.serial)}>{it.serial}</button>
                ))}
              </div>
            </div>
          )))}
        </div>
        {errors.serials && <div className="vb-field__help vb-field__help--error">{errors.serials}</div>}
      </div>
      <TextField size="lg" multiline required label="Mô tả lỗi" value={description} onChange={e => setDescription(e.target.value)}
        error={errors.description} placeholder="Ví dụ: nứt cán, mốc đáy, cong vênh" />
    </FormDialog>
  );
}

/** UC_08 steps 4–8: confirm the quantity issued and hand over; stock is deducted lot by lot. */
function DeliverDialog({ view, onClose }: { view: IssueView; onClose: () => void }) {
  const deliver = useDeliver(view.header.id);
  const toast = useToast();
  const [receiver, setReceiver] = useState('');
  const errors = fieldErrors(deliver.error);
  const submit = () => deliver.mutate(receiver, {
    onSuccess: () => { toast({ tone: 'success', title: `Đã xuất kho phiếu ${view.header.code}`, message: 'Tồn kho đã trừ theo từng lô.' }); onClose(); },
  });
  return (
    <FormDialog
      title={`Xác nhận giao hàng ${view.header.code}`}
      description={`Đơn ${view.header.orderCode}${view.header.customerName ? ` · ${view.header.customerName}` : ''}`}
      submitLabel="Xác nhận đã giao" busy={deliver.isPending} error={formError(deliver.error)} onSubmit={submit} onClose={onClose}
    >
      <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {view.lines.map(l => <li key={l.detailId}><Code>{l.sku}</Code> {l.productName}: <b>{fmt(l.picked)}</b> {l.unit}</li>)}
      </ul>
      <TextField size="lg" required autoFocus label="Người nhận hàng" value={receiver} onChange={e => setReceiver(e.target.value)}
        error={errors.receiverName} placeholder="Họ tên tài xế hoặc người nhận" />
    </FormDialog>
  );
}
