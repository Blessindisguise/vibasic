import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertBanner, Button, ConfirmDialog, Icon, ScanInput, TextField } from '../../../design';
import { fmt, fmtDate } from '../../../app/format';
import { FormDialog } from '../../../app/Modal';
import { Segmented } from '../../../app/Segmented';
import { SerialRanges } from '../../../app/SerialRanges';
import { useToast } from '../../../app/toast';
import { Code, ListError, Loading } from '../../../app/ui';
import { parseNumber } from '../../../app/text';
import { fieldErrors, formError } from '../../../app/catalog';
import { LotStatusBadge, PlanStatusBadge } from '../../../app/statusBadges';
import {
  PLAN_TYPE_LABEL, useLot, usePlan, useSheet, useStockDefect, useSubmitCount, type CountMethod, type CountPayload, type SheetLot,
} from '../../../app/stock';

/**
 * One lot's count on this device.
 * - countedAt: when the shelf was counted (first scan, or the last typed change). The server compares against the shelf at that
 *   moment, so goods picked or delivered afterwards do not show up as a difference (K1).
 * - scan mode (K4): the codes found, plus items without a readable label; `done` closes the lot.
 */
interface LotDraft { mode?: CountMethod; actual: string; reason: string; countedAt?: string; serials?: string[]; unlabeled?: string; done?: boolean }
type Draft = Record<number, LotDraft>;
const EMPTY: LotDraft = { actual: '', reason: '' };
const draftKey = (planId: number) => `vb-count-${planId}`;
const loadDraft = (planId: number): Draft => {
  try { return JSON.parse(localStorage.getItem(draftKey(planId)) ?? '{}'); } catch { return {}; }
};
const saveDraft = (planId: number, d: Draft | null) => {
  try { if (d) localStorage.setItem(draftKey(planId), JSON.stringify(d)); else localStorage.removeItem(draftKey(planId)); } catch { /* storage blocked */ }
};

/** The quantity a lot's draft amounts to, or null while it is not counted yet. */
const countOf = (d: LotDraft): number | null => d.mode === 'scan'
  ? (d.done ? (d.serials?.length ?? 0) + (parseNumber(d.unlabeled ?? '') ?? 0) : null)
  : parseNumber(d.actual);

/**
 * UC_14: count each lot in scope, by typing the quantity or scanning every label (K4). The expected shelf quantity stays hidden
 * until the lot is counted (K3); items already picked for an issue are shown apart since they are not on the shelf (K2).
 * The count is kept on this device until sent. Defects found while counting are reported per lot (3.1).
 */
export function CountingPage({ planId }: { planId: number }) {
  const plan = usePlan(planId);
  const sheet = useSheet(planId, plan.data?.status === 'waiting');
  const submit = useSubmitCount(planId);
  const toast = useToast();
  const nav = useNavigate();
  const [draft, setDraft] = useState<Draft>(() => loadDraft(planId));
  const [confirm, setConfirm] = useState(false);
  const [defectLot, setDefectLot] = useState<SheetLot | null>(null);
  useEffect(() => saveDraft(planId, draft), [planId, draft]);

  const groups = useMemo(() => {
    const m = new Map<string, SheetLot[]>();
    (sheet.data ?? []).forEach(l => m.set(l.sku, [...(m.get(l.sku) ?? []), l]));
    return [...m.values()];
  }, [sheet.data]);
  const errors = fieldErrors(submit.error);

  if (plan.isPending) return <Loading />;
  if (plan.isError) return <ListError onRetry={() => plan.refetch()} />;
  const p = plan.data;
  if (p.status !== 'waiting') {
    return (
      <AlertBanner tone="info" title={`Kế hoạch ${p.code} đang “${p.status === 'inProgress' ? 'Đang kiểm kê' : 'Hoàn thành'}”`}>
        Phiếu kiểm kê {p.lastStocktakeCode} đã gửi. <Button variant="ghost" size="sm" onClick={() => nav(`/kho/kiem-ke/phieu/${p.lastStocktakeId}`)}>Xem phiếu</Button>
      </AlertBanner>
    );
  }
  if (sheet.isPending) return <Loading />;
  if (sheet.isError) return <ListError onRetry={() => sheet.refetch()} />;
  const lots = sheet.data;
  const counted = lots.filter(l => countOf(draft[l.receiptDetailId] ?? EMPTY) != null).length;
  const diffs = lots.filter(l => { const a = countOf(draft[l.receiptDetailId] ?? EMPTY); return a != null && a !== l.shelfQuantity; }).length;
  const set = (id: number, patch: Partial<LotDraft>) => setDraft(d => ({ ...d, [id]: { ...(d[id] ?? EMPTY), ...patch } }));

  const payload = (l: SheetLot): CountPayload => {
    const d = draft[l.receiptDetailId] ?? EMPTY;
    return d.mode === 'scan'
      ? { receiptDetailId: l.receiptDetailId, actualQuantity: null, reason: d.reason, countedAt: d.countedAt, serials: d.serials ?? [], unlabeled: parseNumber(d.unlabeled ?? '') ?? 0 }
      : { receiptDetailId: l.receiptDetailId, actualQuantity: parseNumber(d.actual), reason: d.reason, countedAt: d.countedAt };
  };
  const send = () => submit.mutate(lots.map(payload), {
    onSuccess: s => {
      saveDraft(planId, null);
      toast({ tone: 'success', title: `Đã gửi phiếu ${s.code} cho quản lý duyệt`, message: s.diffLots ? `${s.diffLots} lô có chênh lệch.` : 'Số thực tế khớp hệ thống.' });
      nav(`/kho/kiem-ke/phieu/${s.id}`);
    },
    onError: () => setConfirm(false),
  });

  return (
    <div className="vb-stack" style={{ maxWidth: 1040 }}>
      <div className="vb-row"><Button variant="ghost" size="lg" icon="chevron-left" onClick={() => nav('/kho/kiem-ke')}>Kiểm kê</Button></div>
      <section className="vb-panel" style={{ position: 'sticky', top: -24, zIndex: 3 }}>
        <div className="vb-panel__head" style={{ flexWrap: 'wrap', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <div className="vb-row" style={{ gap: 10 }}><h2 className="vb-panel__title" style={{ fontSize: 20 }}><Code>{p.code}</Code></h2><PlanStatusBadge status={p.status} size="lg" /></div>
            <div className="vb-muted" style={{ fontSize: 14 }}>{PLAN_TYPE_LABEL[p.planType]} · {p.scopeType === 'warehouse' ? 'toàn bộ kho' : `${p.selectedLots} lô`} · dự kiến {fmtDate(p.plannedDate)}</div>
          </div>
          <span style={{ font: 'var(--type-touch-body)', fontVariantNumeric: 'tabular-nums' }}>Đã đếm <b>{counted}</b>/{lots.length} lô · {diffs} lô chênh lệch</span>
          <Button size="xl" icon="send" disabled={counted < lots.length} onClick={() => setConfirm(true)}>Gửi phiếu kiểm kê</Button>
        </div>
        {(formError(submit.error) || errors.counts) && <div style={{ padding: '0 16px 12px' }}><AlertBanner tone="danger">{formError(submit.error) ?? errors.counts}</AlertBanner></div>}
        {Object.keys(errors).some(k => k.startsWith('counts[')) && (
          <div style={{ padding: '0 16px 12px' }}><AlertBanner tone="danger">Còn lô chưa đếm xong, thiếu lý do chênh lệch hoặc có mã không hợp lệ. Xem các ô được đánh dấu.</AlertBanner></div>
        )}
      </section>

      {p.lastStocktakeStatus === 'rejected' && <AlertBanner tone="danger" title={`Phiếu ${p.lastStocktakeCode} bị từ chối`}>{p.lastRejectReason}. Kiểm đếm lại các lô.</AlertBanner>}
      <AlertBanner tone="info">
        Đếm thực tế từng lô: nhập số, hoặc chọn “Quét tem” để quét từng sản phẩm (biết chính xác mã nào thiếu). Không tìm thấy lô thì nhập 0.
        Số hệ thống chỉ hiện sau khi đếm xong lô. Phát hiện hàng lỗi thì chọn “Báo hàng lỗi” ở lô đó, rồi đếm tiếp.
      </AlertBanner>

      {groups.map(group => (
        <section key={group[0].sku} className="vb-panel">
          <div className="vb-panel__head"><span style={{ font: 'var(--type-touch-heading)', fontSize: 17 }}><Code>{group[0].sku}</Code> {group[0].productName}</span></div>
          <div className="vb-panel__body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {group.map(l => (
              <LotCount key={l.receiptDetailId} lot={l} draft={draft[l.receiptDetailId] ?? EMPTY} errors={errors}
                onChange={patch => set(l.receiptDetailId, patch)} onDefect={() => setDefectLot(l)} />
            ))}
          </div>
        </section>
      ))}

      <ConfirmDialog
        open={confirm} title={`Gửi phiếu kiểm kê cho kế hoạch ${p.code}?`}
        description={`${lots.length} lô đã đếm, ${diffs} lô có chênh lệch. Quản lý duyệt phiếu thì tồn kho được điều chỉnh theo số thực tế.`}
        confirmLabel="Gửi phiếu" onConfirm={send} onCancel={() => setConfirm(false)}
      />
      {defectLot && <StockDefectDialog planId={planId} lot={defectLot} onClose={() => setDefectLot(null)} />}
    </div>
  );
}

function LotCount({ lot: l, draft: d, errors, onChange, onDefect }: {
  lot: SheetLot; draft: LotDraft; errors: Record<string, string>; onChange: (patch: Partial<LotDraft>) => void; onDefect: () => void;
}) {
  const k = `counts[${l.receiptDetailId}].`;
  const mode = d.mode ?? 'manual';
  const actual = countOf(d);
  const diff = actual == null ? null : actual - l.shelfQuantity;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 1fr) minmax(260px, 1.3fr) minmax(200px, 1.2fr)', gap: 16, alignItems: 'start', paddingBottom: 16, borderBottom: '1px solid var(--border-subtle)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={{ font: '600 17px/24px var(--font-sans)', letterSpacing: 'var(--tracking-code)' }}>{l.lotCode}</span>
        <span className="vb-row" style={{ gap: 8 }}><LotStatusBadge status={l.status} /><span className="vb-muted">nhập {fmtDate(l.receivedDate)}</span></span>
        {l.picking > 0 && (
          <span className="vb-muted" style={{ fontSize: 14, display: 'flex', gap: 6, alignItems: 'flex-start' }}>
            <Icon name="truck" size={16} style={{ flex: 'none', marginTop: 2 }} />
            <span>Đang soạn cho phiếu xuất: <b>{fmt(l.picking)} {l.unit}</b> (không nằm trên kệ, không đếm)</span>
          </span>
        )}
        <Button variant="ghost" size="lg" icon="shield-alert" style={{ alignSelf: 'flex-start', color: 'var(--red-700)' }} onClick={onDefect} disabled={l.status === 'locked'}>Báo hàng lỗi</Button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
        <Segmented label={`Cách đếm lô ${l.lotCode}`} size="lg" value={mode} onChange={m => onChange({ mode: m })}
          options={[{ value: 'manual', label: 'Nhập số' }, { value: 'scan', label: 'Quét tem' }]} />
        {mode === 'manual'
          ? <TextField size="xl" label="Số thực tế" required inputMode="numeric" suffix={l.unit} value={d.actual}
              onChange={e => onChange({ actual: e.target.value, countedAt: new Date().toISOString() })} error={errors[k + 'actualQuantity']} />
          : <ScanCounter lot={l} draft={d} onChange={onChange} error={errors[k + 'serials'] ?? errors[k + 'unlabeled']} />}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {diff == null ? <span className="vb-muted" style={{ marginTop: 56 }}>{mode === 'scan' ? 'Quét hết sản phẩm của lô rồi chọn “Đếm xong lô”.' : 'Nhập số đếm được để đối chiếu.'}</span> : (
          <span style={{ marginTop: 52, font: 'var(--type-touch-body)', fontVariantNumeric: 'tabular-nums' }}>
            Trên kệ theo hệ thống {fmt(l.shelfQuantity)} ·{' '}
            {diff === 0 ? <b style={{ color: 'var(--green-700)' }}><Icon name="check" size={16} style={{ verticalAlign: -3 }} /> Khớp</b>
              : <b style={{ color: diff < 0 ? 'var(--red-700)' : 'var(--blue-700)' }}>{diff < 0 ? 'Thiếu' : 'Thừa'} {fmt(Math.abs(diff))} {l.unit}</b>}
          </span>
        )}
        {diff != null && diff !== 0 && (
          <TextField size="lg" label="Lý do chênh lệch" required value={d.reason} placeholder="Ví dụ: hàng rơi vỡ, mất tem, nhầm lô"
            onChange={e => onChange({ reason: e.target.value })} error={errors[k + 'reason']} />
        )}
      </div>
    </div>
  );
}

/** K4: scan every label of the lot. Each code is checked against the lot at once; the first scan sets the counting time. */
function ScanCounter({ lot: l, draft: d, onChange, error }: {
  lot: SheetLot; draft: LotDraft; onChange: (patch: Partial<LotDraft>) => void; error?: string;
}) {
  const items = useLot(l.receiptDetailId);
  const [code, setCode] = useState('');
  const [feedback, setFeedback] = useState<{ state: 'success' | 'error'; message: string; key: number } | null>(null);
  const serials = d.serials ?? [];
  const bySerial = useMemo(() => new Map((items.data?.items ?? []).map(i => [i.serial, i])), [items.data]);

  const scan = (value: string) => {
    const s = value.trim().toUpperCase();
    setCode('');
    if (!s) return;
    const say = (state: 'success' | 'error', message: string) => setFeedback({ state, message, key: Date.now() });
    const item = bySerial.get(s);
    if (s === l.lotCode) return say('error', `${s} là mã lô. Quét tem từng sản phẩm.`);
    if (!item) return say('error', `${s} không thuộc lô ${l.lotCode}. Để lại đúng vị trí, không tính vào số đếm.`);
    if (serials.includes(s)) return say('error', `${s} đã quét rồi.`);
    if (item.status === 'issued') return say('error', `${s} đã xuất kho${item.issueCode ? ` (${item.issueCode})` : ''}. Báo quản lý, không tính vào số đếm.`);
    if (item.picked) return say('error', `${s} đang soạn cho phiếu ${item.issueCode ?? 'xuất'}. Không tính vào số đếm.`);
    onChange({ serials: [...serials, s], countedAt: serials.length === 0 ? new Date().toISOString() : d.countedAt, done: false });
    say('success', item.status === 'lost' ? `${s} đang ghi “Thất thoát”: tìm thấy lại, sẽ khôi phục khi duyệt.` : `Đúng lô: ${s} · đã quét ${serials.length + 1}`);
  };

  if (items.isPending) return <Loading />;
  if (items.isError) return <ListError onRetry={() => items.refetch()} />;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {!d.done && (
        <ScanInput size="md" value={code} onChange={setCode} onSubmit={scan} scanKey={feedback?.key ?? 0} label="Quét tem sản phẩm"
          placeholder="SP-…" state={feedback?.state ?? 'idle'} message={feedback?.message ?? `Quét lần lượt từng sản phẩm của lô ${l.lotCode}.`} />
      )}
      <div className="vb-row" style={{ gap: 8 }}>
        <span style={{ font: 'var(--type-touch-body)', fontVariantNumeric: 'tabular-nums' }}>Đã quét <b>{fmt(serials.length)}</b> {l.unit}</span>
        {serials.length > 0 && !d.done && (
          <Button variant="ghost" size="sm" icon="undo-2" onClick={() => onChange({ serials: serials.slice(0, -1), countedAt: serials.length === 1 ? undefined : d.countedAt })}>Bỏ mã vừa quét</Button>
        )}
      </div>
      <SerialRanges serials={serials} unit={l.unit} />
      <TextField size="lg" label="Không có tem / tem hỏng" inputMode="numeric" suffix={l.unit} value={d.unlabeled ?? ''} placeholder="0"
        helper="Sản phẩm của lô không quét được; được cấp mã mới khi duyệt." onChange={e => onChange({ unlabeled: e.target.value })} disabled={d.done} />
      {error && <AlertBanner tone="danger">{error}</AlertBanner>}
      {d.done
        ? <Button variant="secondary" size="lg" icon="scan-barcode" onClick={() => onChange({ done: false })}>Quét tiếp lô này</Button>
        : <Button size="lg" icon="check" onClick={() => onChange({ done: true, countedAt: d.countedAt ?? new Date().toISOString() })}>Đếm xong lô</Button>}
    </div>
  );
}

/** UC_14 3.1 / UC_11 (nguồn: kiểm kê): lot and source are filled in; staff enter the defect and the quantity. */
function StockDefectDialog({ planId, lot, onClose }: { planId: number; lot: SheetLot; onClose: () => void }) {
  const file = useStockDefect(planId);
  const toast = useToast();
  const [quantity, setQuantity] = useState('');
  const [description, setDescription] = useState('');
  const errors = fieldErrors(file.error);
  const submit = () => file.mutate({ receiptDetailId: lot.receiptDetailId, quantity: parseNumber(quantity), description }, {
    onSuccess: r => { toast({ tone: 'warning', title: `Đã lập biên bản ${r.code}`, message: `Lô ${lot.lotCode} tạm cách ly. Tiếp tục kiểm đếm.` }); onClose(); },
  });
  return (
    <FormDialog title={`Báo hàng lỗi lô ${lot.lotCode}`} description={`${lot.sku} ${lot.productName} · phát hiện khi kiểm kê`}
      submitLabel="Lập biên bản" busy={file.isPending} error={formError(file.error)} onSubmit={submit} onClose={onClose}>
      <TextField size="lg" label="Số lượng lỗi" required autoFocus inputMode="numeric" suffix={lot.unit} value={quantity}
        onChange={e => setQuantity(e.target.value)} error={errors.quantity} helper={`Tối đa ${fmt(lot.systemQuantity)} ${lot.unit}.`} />
      <TextField size="lg" multiline label="Mô tả lỗi" required value={description} onChange={e => setDescription(e.target.value)}
        error={errors.description} placeholder="Ví dụ: mốc, nứt, mối mọt" />
      <div className="vb-muted">Lô chuyển “Tạm cách ly”, không được xuất cho đến khi quản lý xử lý biên bản.</div>
    </FormDialog>
  );
}
