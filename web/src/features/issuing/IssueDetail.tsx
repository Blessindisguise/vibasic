import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertBanner, ApprovalStepper, Button, Checkbox, ConfirmDialog, DataTable, EmptyState, LotCard, ScanInput, SearchField, TextField, type DataTableColumn,
} from '../../design';
import { ApiError } from '../../app/api';
import { fmt, fmtDate, fmtDateTime } from '../../app/format';
import { FormDialog } from '../../app/Modal';
import { useToast } from '../../app/toast';
import { Code, Fact, Facts, ListError, Loading } from '../../app/ui';
import { useAuth } from '../../app/auth';
import { matches } from '../../app/text';
import { suggestFrom } from '../../app/suggest';
import { IssueStatusBadge } from '../../app/statusBadges';
import { fieldErrors, formError } from '../../app/catalog';
import {
  pickHoldExpired, pickHoldUntil, useDeliver, useIssue, usePick, usePicker, useReportDefect, useScan,
  type IssueLine, type IssueRow, type IssueView, type PickLot,
} from '../../app/issuing';
import { OrderContact } from './OrderContact';
import { CancelOrderDialog } from './CancelOrderDialog';
import { reportHref, type ReportRow } from '../../app/receiving';
import { ageDays } from '../staff/issuing/OrderAllocationPage';
import { SerialRanges } from '../../app/SerialRanges';
import { ReportStatusCell } from '../abnormal/ReportDecision';

type Role = 'manager' | 'staff';

/**
 * UC_09 step 5: an issue needs no approval. Staff pick, scan, report defects and deliver here as soon as it is created (UC_08);
 * the manager follows it, cancels the order or removes the picker.
 */
export function IssueDetail({ id, role, basePath }: { id: number; role: Role; basePath: string }) {
  const issue = useIssue(id);
  const toast = useToast();
  const nav = useNavigate();
  const [dialog, setDialog] = useState<'unassign' | 'cancelOrder' | null>(null);
  const picker = usePicker();
  const { user } = useAuth();
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
  const picking = role === 'staff' && h.status === 'ready';
  const mine = picking && h.pickerId === user?.id;

  const stepStatus = h.status === 'ready' ? 'pending' : h.status === 'cancelled' ? 'rejected' : 'approved';

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
              Đơn <b>{h.orderCode}</b> · Lập {fmtDateTime(h.issueDate)} bởi {h.creatorName}
            </div>
          </div>
          {role === 'manager' && h.status === 'ready' && (
            <div className="vb-row">
              <Button variant="ghost" icon="ban" onClick={() => setDialog('cancelOrder')}>Hủy đơn</Button>
              {h.pickerId && <Button variant="ghost" icon="x" onClick={() => setDialog('unassign')}>Gỡ người lấy hàng</Button>}
            </div>
          )}
        </div>
        <div className="vb-panel__body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <ApprovalStepper
            status={stepStatus} draftLabel="Lập phiếu" size={size}
            labels={{ pending: 'Chờ lấy hàng', approved: 'Đã xuất', rejected: 'Đã hủy' }}
            history={{
              draft: { by: h.creatorName, at: fmtDateTime(h.issueDate) },
              pending: h.pickerName ? { by: h.pickerName, at: fmtDateTime(h.pickStartedAt) } : undefined,
              approved: h.deliveredAt ? { by: h.delivererName, at: fmtDateTime(h.deliveredAt) } : undefined,
            }}
          />
          <OrderContact name={h.customerName} phone={h.customerPhone} address={h.shippingAddress} note={h.orderNote} />
          {role === 'manager' && h.status === 'ready' && (
            <Facts min={200}>
              <Fact label="Người lấy hàng" value={h.pickerName ?? <span className="vb-muted">Chưa ai nhận phiếu</span>} />
              {h.pickerId && <Fact label="Bắt đầu lúc" value={fmtDateTime(h.pickStartedAt)} />}
              {h.pickerId && <Fact label="Thao tác lần cuối" value={fmtDateTime(h.pickActiveAt)} />}
              {h.pickerId && <Fact label="Giữ phiếu tới" value={<>{fmtDateTime(pickHoldUntil(h))}{pickHoldExpired(h) && <span className="vb-muted"> · đã hết hạn</span>}</>} />}
              <Fact label="Đã quét" value={`${fmt(h.picked)}/${fmt(h.totalQuantity)}`} />
            </Facts>
          )}
          {h.status === 'cancelled' && (
            <AlertBanner tone="warning" title="Phiếu đã hủy">
              {h.cancelReason}. Hàng đã lấy của phiếu này (nếu có) trả lại kệ.
            </AlertBanner>
          )}
          {h.status === 'issued' && (
            <AlertBanner tone="success" title="Đã giao hàng">
              Giao cho {h.receiverName}{h.receiverPhone && ` (ĐT ${h.receiverPhone})`}{h.vehiclePlate && `, xe ${h.vehiclePlate}`} lúc {fmtDateTime(h.deliveredAt)}
              {h.delivererName && `, nhân viên ${h.delivererName}`}{h.shippingAddress && `, tới ${h.shippingAddress}`}.
            </AlertBanner>
          )}
        </div>
      </section>

      {mine ? <PickingPanel view={issue.data} />
        : picking ? <><ClaimPanel header={h} /><LinesPanel lines={lines} touch={touch} /></>
        : <LinesPanel lines={lines} touch={touch} />}

      {reports.length > 0 && <ReportsPanel reports={reports} touch={touch} />}

      {dialog === 'cancelOrder' && (
        <CancelOrderDialog
          order={{ id: h.orderId, code: h.orderCode, customerName: h.customerName, quantity: h.totalQuantity, issueCode: h.code, picked: h.picked }}
          onClose={() => setDialog(null)}
        />
      )}
      <ConfirmDialog
        open={dialog === 'unassign'} title={`Gỡ ${h.pickerName} khỏi phiếu ${h.code}?`}
        description={`Đã quét ${fmt(h.picked)}/${fmt(h.totalQuantity)} sản phẩm.`}
        confirmLabel="Gỡ người lấy hàng"
        onConfirm={() => picker.mutate({ id, action: 'release' }, {
          onSuccess: () => { setDialog(null); toast({ tone: 'info', title: `Đã gỡ người lấy hàng phiếu ${h.code}` }); },
          onError: e => { setDialog(null); toast({ tone: 'danger', title: 'Không thực hiện được', message: e.message }); },
        })}
        onCancel={() => setDialog(null)}
      />
    </div>
  );
}

/** First lot (FIFO order, as the server sends them) that still has unscanned items, and those items. */
function nextPick(line: IssueLine) {
  const index = line.lots.findIndex(l => l.items.some(i => !i.pickedAt));
  if (index < 0) return null;
  const lot = line.lots[index];
  return { lot, fifo: index + 1, open: lot.items.filter(i => !i.pickedAt).map(i => i.serial), remaining: line.quantity - line.picked };
}

/**
 * Staff on an issue to pick that they do not hold: start picking when nobody holds it, otherwise see who does.
 * A holder past the 3-day hold can be taken over.
 */
function ClaimPanel({ header: h }: { header: IssueRow }) {
  const picker = usePicker();
  const toast = useToast();
  const [confirm, setConfirm] = useState(false);
  const [, tick] = useState(0);
  // Re-evaluate "idle" as time passes even without a refetch.
  useEffect(() => { const t = setInterval(() => tick(n => n + 1), 30_000); return () => clearInterval(t); }, []);
  const claim = () => picker.mutate({ id: h.id, action: 'claim' }, {
    onSuccess: () => { setConfirm(false); toast({ tone: 'success', title: `Bạn đang lấy hàng phiếu ${h.code}` }); },
    onError: e => { setConfirm(false); toast({ tone: 'danger', title: 'Không nhận được phiếu', message: e.message }); },
  });
  const expired = pickHoldExpired(h);
  const until = fmtDateTime(pickHoldUntil(h));

  return (
    <section className="vb-panel">
      <div className="vb-panel__body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {!h.pickerId ? (
          <AlertBanner tone="info" title="Chưa ai nhận lấy hàng phiếu này">
            {h.picked > 0 && `Đã quét trước đó ${fmt(h.picked)}/${fmt(h.totalQuantity)} sản phẩm.`}
          </AlertBanner>
        ) : expired ? (
          <AlertBanner tone="warning" title={`${h.pickerName} đã giữ phiếu quá 3 ngày`}>
            Phiếu do {h.pickerName} nhận lúc {fmtDateTime(h.pickStartedAt)}, thao tác lần cuối {fmtDateTime(h.pickActiveAt)}, đã quét {fmt(h.picked)}/{fmt(h.totalQuantity)} sản phẩm.
          </AlertBanner>
        ) : (
          <AlertBanner tone="warning" title={`Đang do ${h.pickerName} lấy hàng`}>
            Nhận phiếu lúc {fmtDateTime(h.pickStartedAt)} · thao tác lần cuối {fmtDateTime(h.pickActiveAt)} · đã quét {fmt(h.picked)}/{fmt(h.totalQuantity)} · giữ phiếu tới {until}.
          </AlertBanner>
        )}
        {(!h.pickerId || expired) && (
          <div className="vb-row">
            {!h.pickerId
              ? <Button size="xl" icon="scan-barcode" loading={picker.isPending} onClick={claim}>Bắt đầu lấy hàng</Button>
              : <Button size="xl" variant="secondary" icon="refresh-cw" onClick={() => setConfirm(true)}>Nhận lại phiếu</Button>}
          </div>
        )}
      </div>
      <ConfirmDialog
        open={confirm} title={`Nhận lại phiếu ${h.code}?`}
        description={`${h.pickerName} đã quét ${fmt(h.picked)}/${fmt(h.totalQuantity)} sản phẩm.`}
        confirmLabel="Nhận lại phiếu" onConfirm={claim} onCancel={() => setConfirm(false)}
      />
    </section>
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
                <LotSerials items={lot.items} unit={line.unit} />

              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

/** The codes of one lot on the issue as runs: still to pick, then picked/issued (green). */
function LotSerials({ items, unit }: { items: IssueLine['lots'][number]['items']; unit: string }) {
  const done = items.filter(it => it.pickedAt || it.status === 'issued').map(it => it.serial);
  const open = items.filter(it => !(it.pickedAt || it.status === 'issued')).map(it => it.serial);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {open.length > 0 && <SerialRanges serials={open} unit={unit} />}
      {done.length > 0 && <SerialRanges serials={done} unit={unit} tone="picked" />}
    </div>
  );
}

function ReportsPanel({ reports, touch }: { reports: ReportRow[]; touch: boolean }) {
  const nav = useNavigate();
  const columns: DataTableColumn<ReportRow>[] = [
    { key: 'code', header: 'Biên bản', width: 130, render: r => <Code>{r.code}</Code> },
    { key: 'lot', header: 'Lô', width: 130, render: r => <Code>{r.lotCode}</Code> },
    { key: 'description', header: 'Mô tả lỗi', render: r => <span style={{ whiteSpace: 'normal' }}>{r.description}</span> },
    { key: 'quantity', header: 'SL lỗi', numeric: true, width: 80, render: r => fmt(r.quantity) },
    { key: 'status', header: 'Trạng thái', width: 150, render: r => <ReportStatusCell report={r} /> },
  ];
  return (
    <section className="vb-panel">
      <div className="vb-panel__head"><h3 className="vb-panel__title">Biên bản bất thường phát sinh khi xuất</h3></div>
      <DataTable columns={columns} rows={reports} density={touch ? 'default' : 'compact'} onRowClick={r => nav(reportHref(touch ? 'staff' : 'manager', r.id))} caption="Biên bản bất thường của phiếu xuất" />
    </section>
  );
}

/** UC_08: scan every item on the pick list (lot by lot, FIFO), report defects, then confirm delivery. */
function PickingPanel({ view }: { view: IssueView }) {
  const { header: h, lines } = view;
  const scan = useScan(h.id);
  const picker = usePicker();
  const toast = useToast();
  const [code, setCode] = useState('');
  const [feedback, setFeedback] = useState<{ state: 'success' | 'error' | 'idle'; message: string; key: number } | null>(null);
  const [focused, setFocused] = useState<number | null>(null);
  const [releaseOpen, setReleaseOpen] = useState(false);
  const [defectOpen, setDefectOpen] = useState(false);
  const [deliverOpen, setDeliverOpen] = useState(false);
  const [choosing, setChoosing] = useState<{ line: IssueLine; lot: PickLot } | null>(null);
  const [lastSerial, setLastSerial] = useState<string | null>(null);
  const total = lines.reduce((s, l) => s + l.lots.reduce((n, lot) => n + lot.items.length, 0), 0);
  const picked = lines.reduce((s, l) => s + l.picked, 0);
  const done = total > 0 && picked === total;

  /** Bring a line into view and say which lot and codes to take next (FIFO). */
  const focusLine = (line: IssueLine) => {
    setFocused(line.detailId);
    document.getElementById(`line-${line.detailId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const next = nextPick(line);
    let message: string;
    if (!next) message = `Đã lấy đủ ${fmt(line.quantity)} ${line.unit} ${line.sku}.`;
    else {
      const sample = next.open.slice(0, 3).join(', ') + (next.open.length > 3 ? ', …' : '');
      message = `${line.sku}: lấy tiếp từ lô ${next.lot.lotCode} (FIFO ${next.fifo}, nhập ${fmtDate(next.lot.receivedDate)}, ${ageDays(next.lot.receivedDate)} ngày), còn ${fmt(next.open.length)} ${line.unit} ở lô này: ${sample}`;
    }
    setFeedback({ state: 'idle', message, key: Date.now() });
    setCode('');
  };
  const lineFields = (l: IssueLine) => [l.sku, l.productName, ...l.lots.map(x => x.lotCode)];
  const isSerial = (v: string) => /^SP-/i.test(v.trim());
  const suggestions = isSerial(code) ? [] : suggestFrom(lines, code, lineFields, l => {
    const next = nextPick(l);
    return {
      key: String(l.detailId), label: l.sku, hint: l.productName,
      meta: <span style={{ fontVariantNumeric: 'tabular-nums' }}>{next ? `còn ${fmt(l.quantity - l.picked)} · lô ${next.lot.lotCode}` : 'Đã đủ'}</span>,
    };
  });

  const submitScan = (value: string) => {
    const v = value.trim();
    if (!v) return;
    const upper = v.toUpperCase();
    // A lot label of this issue goes to the server: the whole lot is picked when the issue takes all of it.
    const lotLine = lines.find(l => l.lots.some(x => x.lotCode.toUpperCase() === upper));
    // Otherwise, not an item code: a SKU or product name of a line on this issue shows where to pick it.
    if (!isSerial(v) && !lotLine) {
      const exact = lines.find(l => l.sku.toUpperCase() === upper);
      const found = exact ? [exact] : lines.filter(l => matches(v, ...lineFields(l)));
      if (found.length === 1) { focusLine(found[0]); return; }
      if (found.length > 1) { setFeedback({ state: 'idle', message: `Có ${found.length} mặt hàng khớp “${v}”. Chọn một mặt hàng trong danh sách gợi ý.`, key: Date.now() }); return; }
    }
    scan.mutate(v, {
      onSuccess: r => {
        if (!lotLine) setLastSerial(r.serial);
        const line = lines.find(l => l.sku === r.sku);
        if (line) setFocused(line.detailId);
        setFeedback({
          state: 'success', key: Date.now(),
          message: r.alreadyPicked ? (lotLine ? `Lô ${r.lotCode} đã lấy đủ.` : `${r.serial} đã quét trước đó.`)
            : r.lotPicked > 0 ? `Đã lấy cả lô ${r.lotCode} · ${fmt(r.lotPicked)} ${line?.unit ?? ''} · ${r.picked}/${r.total}`
            : r.replacedSerial ? `Nhận ${r.serial} thay cho ${r.replacedSerial} (cùng lô ${r.lotCode}) · ${r.picked}/${r.total}`
            : `Đúng: ${r.serial} · lô ${r.lotCode} · ${r.picked}/${r.total}`,
        });
        setCode('');
      },
      onError: e => {
        if (lotLine) { setFocused(lotLine.detailId); document.getElementById(`line-${lotLine.detailId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
        setFeedback({ state: 'error', message: e.message, key: Date.now() });
        setCode('');
      },
    });
  };

  return (
    <>
      <section className="vb-panel" style={{ position: 'sticky', top: -24, zIndex: 3 }}>
        <div className="vb-panel__body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <ScanInput
            value={code} onChange={setCode} onSubmit={submitScan} autoFocus size="lg" scanKey={feedback?.key ?? 0}
            label="Quét tem hoặc tìm hàng trong phiếu" placeholder="SP-…, SKU, tên hàng, mã lô" state={feedback?.state ?? 'idle'}
            message={feedback?.message ?? 'Quét tem sản phẩm hoặc tem lô. Không quét được thì bấm “Chọn mã” ở từng lô.'}
            suggestions={suggestions} onPickSuggestion={s => { const l = lines.find(x => String(x.detailId) === s.key); if (l) focusLine(l); }}
          />
          <div className="vb-row" style={{ gap: 12 }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ height: 10, background: 'var(--grey-100)', borderRadius: 5, overflow: 'hidden' }}>
                <div style={{ width: `${(picked / Math.max(1, total)) * 100}%`, height: '100%', background: 'var(--green-500)', transition: 'width var(--duration-base, 200ms) cubic-bezier(.2,0,0,1)' }} />
              </div>
              <div style={{ marginTop: 4, font: 'var(--type-touch-body)', fontVariantNumeric: 'tabular-nums' }}>Đã quét <b>{fmt(picked)}</b>/{fmt(total)} sản phẩm</div>
            </div>
            <Button size="xl" variant="ghost" icon="log-out" onClick={() => setReleaseOpen(true)}>Nhường phiếu</Button>
            <Button size="xl" variant="danger-outline" icon="shield-alert" onClick={() => setDefectOpen(true)}>Báo hàng lỗi</Button>
            <Button size="xl" icon="truck" disabled={!done} onClick={() => setDeliverOpen(true)}>Xác nhận giao hàng</Button>
          </div>
        </div>
      </section>

      {lines.map(line => {
        const firstOpen = line.lots.findIndex(l => l.items.some(i => !i.pickedAt));
        return (
          <section key={line.detailId} id={`line-${line.detailId}`} className="vb-panel"
            style={focused === line.detailId ? { outline: '3px solid var(--feedback-info)', outlineOffset: 2, scrollMarginTop: 200 } : { scrollMarginTop: 200 }}>
            <div className="vb-panel__head">
              <span style={{ font: 'var(--type-touch-heading)', fontSize: 17 }}><Code>{line.sku}</Code> {line.productName}</span>
              <span style={{ marginLeft: 'auto', font: 'var(--type-touch-body)', fontVariantNumeric: 'tabular-nums' }}>{fmt(line.picked)}/{fmt(line.quantity)} {line.unit}</span>
            </div>
            <div className="vb-panel__body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {line.lots.map((lot, i) => {
                const lotPicked = lot.items.filter(it => it.pickedAt).length;
                const state = lot.lotStatus !== 'normal' ? 'locked' : lotPicked === lot.items.length ? 'done' : i === firstOpen ? (lotPicked > 0 ? 'picking' : 'next') : 'waiting';
                const left = lot.items.length - lotPicked;
                // The issue holds everything of the lot still on the shelf: one tap takes the whole lot (same rule as its label).
                const wholeLot = lot.items.length === lot.onShelf;
                return (
                  <div key={lot.receiptDetailId} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <LotCard size="lg" fifoOrder={i + 1} lotCode={lot.lotCode} receivedAt={fmtDate(lot.receivedDate)} ageDays={ageDays(lot.receivedDate)}
                      toPick={lot.items.length} picked={lotPicked} unit={line.unit} state={state} />
                    <div style={{ paddingLeft: 68, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <LotSerials items={lot.items} unit={line.unit} />
                      {lot.lotStatus === 'normal' && left > 0 && (
                        <div className="vb-row" style={{ gap: 8 }}>
                          {wholeLot && (
                            <Button size="lg" variant="secondary" icon="package-check" loading={scan.isPending} onClick={() => submitScan(lot.lotCode)}>
                              Lấy cả lô ({fmt(left)} {line.unit})
                            </Button>
                          )}
                          <Button size="lg" variant="ghost" icon="list-checks" onClick={() => setChoosing({ line, lot })}>Chọn mã</Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      {choosing && (
        <PickDialog issueId={h.id} line={choosing.line} lot={choosing.lot} onClose={() => setChoosing(null)}
          onDone={message => { setFocused(choosing.line.detailId); setFeedback({ state: 'success', message, key: Date.now() }); }} />
      )}
      {defectOpen && <DefectDialog view={view} preselect={lastSerial} onClose={() => setDefectOpen(false)} onDone={msg => toast(msg)} />}
      {deliverOpen && <DeliverDialog view={view} onClose={() => setDeliverOpen(false)} />}
      <ConfirmDialog
        open={releaseOpen} title={`Nhường phiếu ${h.code}?`}
        description={picked > 0 ? `Đã quét ${fmt(picked)} sản phẩm.` : undefined}
        confirmLabel="Nhường phiếu" onCancel={() => setReleaseOpen(false)}
        onConfirm={() => picker.mutate({ id: h.id, action: 'release' }, {
          onSuccess: () => { setReleaseOpen(false); toast({ tone: 'info', title: `Đã nhường phiếu ${h.code}` }); },
          onError: e => { setReleaseOpen(false); toast({ tone: 'danger', title: 'Không thực hiện được', message: e.message }); },
        })}
      />
    </>
  );
}

/**
 * "Chọn mã": tick the items taken from one lot when their labels cannot be scanned (or for a demo). Only codes of this lot on the
 * pick list are shown, so FIFO stays as allocated; "Chọn tất cả" takes the issue's whole share of the lot.
 */
function PickDialog({ issueId, line, lot, onClose, onDone }: {
  issueId: number; line: IssueLine; lot: PickLot; onClose: () => void; onDone: (message: string) => void;
}) {
  const pick = usePick(issueId);
  const open = lot.items.filter(i => !i.pickedAt).map(i => i.serial);
  const [selected, setSelected] = useState<string[]>([]);
  const errors = fieldErrors(pick.error);
  const toggle = (s: string) => setSelected(sel => (sel.includes(s) ? sel.filter(x => x !== s) : [...sel, s]));
  const submit = () => pick.mutate(selected, {
    onSuccess: r => {
      onDone(`Đã lấy ${fmt(r.added)} ${line.unit} lô ${lot.lotCode} (chọn mã) · ${fmt(r.picked)}/${fmt(r.total)}`);
      onClose();
    },
  });

  return (
    <FormDialog
      title={`Chọn mã đã lấy · lô ${lot.lotCode}`} width={680}
      description={`${line.sku} ${line.productName} · còn ${fmt(open.length)} ${line.unit} của phiếu chưa lấy ở lô này`}
      submitLabel={selected.length > 0 ? `Lấy ${fmt(selected.length)} sản phẩm` : 'Lấy sản phẩm'}
      busy={pick.isPending} error={formError(pick.error)} onSubmit={submit} onClose={onClose}
    >
      <div className="vb-row" style={{ gap: 8 }}>
        <Button type="button" size="lg" variant="secondary" icon="list-checks" onClick={() => setSelected(open)}>Chọn tất cả ({fmt(open.length)})</Button>
        <Button type="button" size="lg" variant="ghost" onClick={() => setSelected([])} disabled={selected.length === 0}>Bỏ chọn</Button>
        <span className="vb-muted" style={{ marginLeft: 'auto', fontVariantNumeric: 'tabular-nums' }}>Đã chọn {fmt(selected.length)}/{fmt(open.length)}</span>
      </div>
      <div className="vb-serials vb-serials--pick" style={{ maxHeight: 320, overflow: 'auto' }}>
        {open.map(s => (
          <button key={s} type="button" className="vb-serial" aria-pressed={selected.includes(s)} onClick={() => toggle(s)}>{s}</button>
        ))}
      </div>
      {errors.serials && <div className="vb-field__help vb-field__help--error">{errors.serials}</div>}
      <div className="vb-muted">Chỉ chọn các sản phẩm đã thực sự lấy khỏi kệ. Quét tem vẫn là cách chính xác nhất.</div>
    </FormDialog>
  );
}

/**
 * UC_08 3.1 / UC_11: pick the defective items, describe the defect. The items are set aside and replaced by FIFO; when the defect
 * looks like it affects the whole lot, staff tick "Nghi lỗi cả lô" and the lot is quarantined as well.
 */
function DefectDialog({ view, preselect, onClose, onDone }: {
  view: IssueView; preselect: string | null; onClose: () => void;
  onDone: (t: { tone: 'success' | 'warning' | 'danger'; title: string; message?: string }) => void;
}) {
  const report = useReportDefect(view.header.id);
  const [selected, setSelected] = useState<string[]>(preselect ? [preselect] : []);
  const [description, setDescription] = useState('');
  const [proposal, setProposal] = useState('');
  const [wholeLot, setWholeLot] = useState(false);
  const [filter, setFilter] = useState('');
  const errors = fieldErrors(report.error);
  const toggle = (s: string) => setSelected(sel => (sel.includes(s) ? sel.filter(x => x !== s) : [...sel, s]));

  const submit = () => report.mutate({ serials: selected, description, wholeLot, handlingProposal: proposal }, {
    onSuccess: ({ result }) => {
      onDone(result.onHold
        ? { tone: 'danger', title: `Không đủ hàng thay thế, phiếu ${view.header.code} đã hủy`, message: `Đã lập ${result.reportCodes.join(', ')}. Đơn chờ lập phiếu mới khi có hàng.` }
        : wholeLot
          ? {
            tone: 'warning', title: `Đã lập ${result.reportCodes.join(', ')}; lô đã tạm cách ly`,
            message: `Đổi ${result.replaced} sản phẩm sang lô kế tiếp.${result.returnPicked.length ? ` Trả lại kệ: ${result.returnPicked.join(', ')}.` : ''}`,
          }
          : {
            tone: 'warning', title: `Đã lập ${result.reportCodes.join(', ')}`,
            message: `Đã thay ${result.replaced} sản phẩm.`,
          });
      onClose();
    },
  });

  return (
    <FormDialog
      title="Báo hàng lỗi" width={680}
      submitLabel="Lập biên bản" busy={report.isPending} error={formError(report.error)} onSubmit={submit} onClose={onClose}
    >
      <div className="vb-field">
        <span className="vb-field__label">Sản phẩm lỗi<span className="req" aria-hidden="true">*</span> <span className="vb-muted">({selected.length} đã chọn)</span></span>
        <SearchField size="lg" value={filter} onChange={setFilter} placeholder="Tìm theo mã sản phẩm, vài số cuối, mã lô hoặc SKU" aria-label="Tìm sản phẩm lỗi" />
        <div style={{ maxHeight: 240, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {view.lines.map(line => line.lots.map(lot => {
            const items = lot.items.filter(it => selected.includes(it.serial) || matches(filter, it.serial, lot.lotCode, line.sku, line.productName));
            if (items.length === 0) return null;
            return (
              <div key={lot.receiptDetailId}>
                <div className="vb-muted"><Code>{line.sku}</Code> · lô {lot.lotCode}</div>
                <div className="vb-serials">
                  {items.map(it => (
                    <button key={it.itemId} type="button" className="vb-serial" aria-pressed={selected.includes(it.serial)} onClick={() => toggle(it.serial)}>{it.serial}</button>
                  ))}
                </div>
              </div>
            );
          }))}
          {filter && !view.lines.some(l => l.lots.some(lot => lot.items.some(it => matches(filter, it.serial, lot.lotCode, l.sku, l.productName))))
            && <span className="vb-muted">Không có sản phẩm nào của phiếu khớp “{filter}”.</span>}
        </div>
        {errors.serials && <div className="vb-field__help vb-field__help--error">{errors.serials}</div>}
      </div>
      <TextField size="lg" multiline required label="Mô tả lỗi" value={description} onChange={e => setDescription(e.target.value)}
        error={errors.description} placeholder="Ví dụ: nứt cán, mốc đáy, cong vênh" />
      <TextField size="lg" multiline label="Hướng xử lý đề xuất" helper="Không bắt buộc. Quản lý chốt hướng xử lý khi duyệt." value={proposal}
        onChange={e => setProposal(e.target.value)} error={errors.handlingProposal} placeholder="Ví dụ: trả nhà cung cấp, sửa lại rồi đưa về kệ" />
      <Checkbox size="lg" checked={wholeLot} onChange={e => setWholeLot(e.target.checked)}
        label={<b>Nghi lỗi cả lô</b>} />
    </FormDialog>
  );
}

/** UC_08 steps 4–8: confirm the quantity issued and hand over; stock is deducted lot by lot. */
function DeliverDialog({ view, onClose }: { view: IssueView; onClose: () => void }) {
  const deliver = useDeliver(view.header.id);
  const toast = useToast();
  const [receiver, setReceiver] = useState('');
  const [phone, setPhone] = useState('');
  const [plate, setPlate] = useState('');
  const errors = fieldErrors(deliver.error);
  const submit = () => deliver.mutate({ receiverName: receiver, receiverPhone: phone, vehiclePlate: plate }, {
    onSuccess: () => { toast({ tone: 'success', title: `Đã xuất kho phiếu ${view.header.code}` }); onClose(); },
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
      {(view.header.shippingAddress || view.header.customerPhone) && (
        <div className="vb-muted">Giao tới {view.header.shippingAddress ?? '—'}{view.header.customerPhone && ` · ĐT ${view.header.customerPhone}`}</div>
      )}
      <TextField size="lg" required autoFocus label="Người nhận hàng tại kho" value={receiver} onChange={e => setReceiver(e.target.value)}
        error={errors.receiverName} placeholder="Họ tên tài xế, hoặc khách tự đến lấy" />
      {view.header.customerName && !receiver && (
        <div><Button variant="ghost" icon="user" onClick={() => { setReceiver(view.header.customerName!); setPhone(view.header.customerPhone ?? ''); }}>
          Khách tự lấy: {view.header.customerName}
        </Button></div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
        <TextField size="lg" label="Số điện thoại người nhận" type="tel" inputMode="tel" value={phone} onChange={e => setPhone(e.target.value)}
          error={errors.receiverPhone} placeholder="0912 345 678" />
        <TextField size="lg" label="Biển số xe" value={plate} onChange={e => setPlate(e.target.value.toUpperCase())}
          error={errors.vehiclePlate} placeholder="29C-123.45" helper="Bỏ trống nếu khách tự lấy không dùng xe." />
      </div>
    </FormDialog>
  );
}
