import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertBanner, Button, Checkbox, EmptyState, Icon, ScanInput, SearchField, TextField } from '../../../design';
import { ConfirmDialog } from '../../../app/ConfirmDialog';
import { fmt, fmtDate } from '../../../app/format';
import { Modal } from '../../../app/Modal';
import { Segmented } from '../../../app/Segmented';
import { SerialRanges } from '../../../app/SerialRanges';
import { useToast } from '../../../app/toast';
import { Code, ListError, Loading } from '../../../app/ui';
import { matches, parseNumber } from '../../../app/text';
import { suggestFrom } from '../../../app/suggest';
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
 * What the shelf held when the lot was counted. Items set aside as defective after that moment were still on the shelf then
 * (the server applies the same rule).
 */
const expectedOf = (l: SheetLot, d: LotDraft): number =>
  l.shelfQuantity + (d.countedAt ? l.defectsAt.filter(t => t > d.countedAt!).length : 0);

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
  const [search, setSearch] = useState('');
  // Lots still to count when the filter was turned on: a lot stays shown while its number is being typed.
  const [onlyLeft, setOnlyLeft] = useState<Set<number> | null>(null);
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
  const diffs = lots.filter(l => { const a = countOf(draft[l.receiptDetailId] ?? EMPTY); return a != null && a !== expectedOf(l, draft[l.receiptDetailId] ?? EMPTY); }).length;
  // Finding a lot on a long warehouse-wide sheet: by lot code, SKU or name, and optionally only the lots not counted yet.
  const lotFields = (l: SheetLot) => [l.lotCode, l.sku, l.productName];
  const shown = groups
    .map(g => g.filter(l => matches(search, ...lotFields(l)) && (!onlyLeft || onlyLeft.has(l.receiptDetailId))))
    .filter(g => g.length > 0);
  const suggestions = suggestFrom(lots, search, lotFields, l => ({
    key: String(l.receiptDetailId), label: l.lotCode, hint: `${l.sku} · ${l.productName}`,
    meta: countOf(draft[l.receiptDetailId] ?? EMPTY) != null ? <span style={{ color: 'var(--green-700)', fontWeight: 600 }}>Đã đếm</span> : <span>Chưa đếm</span>,
  }));
  const jumpTo = (l: SheetLot) => {
    setSearch(l.lotCode); setOnlyLeft(null);
    requestAnimationFrame(() => document.getElementById(`lot-${l.receiptDetailId}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' }));
  };
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

      {p.lastStocktakeStatus === 'rejected' && <AlertBanner tone="danger" title={`Phiếu ${p.lastStocktakeCode} bị từ chối`}>Lý do: {p.lastRejectReason}</AlertBanner>}

      <div className="vb-row" style={{ gap: 16, alignItems: 'center' }}>
        <SearchField
          size="lg" placeholder="Mã lô, SKU, tên hàng…" value={search} onChange={setSearch} style={{ width: 360, maxWidth: '100%' }}
          aria-label="Tìm lô cần đếm" suggestions={suggestions} onPickSuggestion={s => s.value && jumpTo(s.value as SheetLot)}
        />
        <Checkbox size="lg" label={`Chỉ lô chưa đếm (${lots.length - counted})`} checked={!!onlyLeft}
          onChange={e => setOnlyLeft(e.target.checked ? new Set(lots.filter(l => countOf(draft[l.receiptDetailId] ?? EMPTY) == null).map(l => l.receiptDetailId)) : null)} />
      </div>
      {shown.length === 0 && (
        <div className="vb-panel">
          <EmptyState icon={onlyLeft && !search ? 'circle-check' : 'search'}
            title={onlyLeft && !search ? 'Đã đếm hết các lô' : 'Không có lô phù hợp'} description={onlyLeft && !search ? undefined : 'Thử từ khóa khác.'} />
        </div>
      )}

      {shown.map(group => (
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

      <ConfirmDialog busy={submit.isPending}
        open={confirm} title={`Gửi phiếu kiểm kê cho kế hoạch ${p.code}?`}
        description={`${lots.length} lô đã đếm, ${diffs} lô có chênh lệch.`}
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
  const expected = expectedOf(l, d);
  const diff = actual == null ? null : actual - expected;
  return (
    <div id={`lot-${l.receiptDetailId}`} className="vb-count-lot">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={{ font: '600 17px/24px var(--font-sans)', letterSpacing: 'var(--tracking-code)' }}>{l.lotCode}</span>
        <span className="vb-row" style={{ gap: 8 }}><LotStatusBadge status={l.status} /><span className="vb-muted">nhập {fmtDate(l.receivedDate)}</span></span>
        {l.picking > 0 && (
          <span className="vb-muted" style={{ fontSize: 14, display: 'flex', gap: 6, alignItems: 'flex-start' }}>
            <Icon name="truck" size={16} style={{ flex: 'none', marginTop: 2 }} />
            <span>Đang soạn cho phiếu xuất: <b>{fmt(l.picking)} {l.unit}</b></span>
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
        {diff == null ? null : (
          <span className="vb-count-lot__diff" style={{ font: 'var(--type-touch-body)', fontVariantNumeric: 'tabular-nums' }}>
            Trên kệ theo hệ thống {fmt(expected)} ·{' '}
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
    // Set aside before the count started: it is not on the shelf. After: it was, so it still counts.
    if (item.status === 'defective' && !(d.countedAt && item.defectiveAt && item.defectiveAt > d.countedAt))
      return say('error', `${s} đã tách ra do lỗi${item.reportCode ? ` (${item.reportCode})` : ''}. Để ở khu hàng lỗi, không tính vào số đếm.`);
    onChange({ serials: [...serials, s], countedAt: serials.length === 0 ? new Date().toISOString() : d.countedAt, done: false });
    say('success', item.status === 'lost' ? `${s} đang ghi “Thất thoát”: tìm thấy lại, sẽ khôi phục khi duyệt.` : `Đúng lô: ${s} · đã quét ${serials.length + 1}`);
  };

  if (items.isPending) return <Loading />;
  if (items.isError) return <ListError onRetry={() => items.refetch()} />;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {!d.done && (
        // After a scan the field is rebuilt (scanKey): autoFocus puts the cursor back for the next scan.
        <ScanInput size="md" value={code} onChange={setCode} onSubmit={scan} scanKey={feedback?.key ?? 0} autoFocus={feedback != null} label="Quét tem sản phẩm"
          placeholder="SP-…" state={feedback?.state ?? 'idle'} message={feedback?.message ?? `Quét lần lượt từng sản phẩm của lô ${l.lotCode}.`} />
      )}
      <div className="vb-row" style={{ gap: 8 }}>
        <span style={{ font: 'var(--type-touch-body)', fontVariantNumeric: 'tabular-nums' }}>Đã quét <b>{fmt(serials.length)}</b> {l.unit}</span>
        {serials.length > 0 && !d.done && (
          <Button variant="ghost" size="sm" icon="undo-2" onClick={() => onChange({ serials: serials.slice(0, -1), countedAt: serials.length === 1 ? undefined : d.countedAt })}>Bỏ mã vừa quét</Button>
        )}
      </div>
      <SerialRanges serials={serials} unit={l.unit} />
      <TextField size="lg" label="Không có tem / tem hỏng" inputMode="numeric" suffix={l.unit} value={d.unlabeled ?? ''} placeholder="0" onChange={e => onChange({ unlabeled: e.target.value })} disabled={d.done} />
      {error && <AlertBanner tone="danger">{error}</AlertBanner>}
      {d.done
        ? <Button variant="secondary" size="lg" icon="scan-barcode" onClick={() => onChange({ done: false })}>Quét tiếp lô này</Button>
        : <Button size="lg" icon="check" onClick={() => onChange({ done: true, countedAt: d.countedAt ?? new Date().toISOString() })}>Đếm xong lô</Button>}
    </div>
  );
}

/**
 * UC_14 3.1 / UC_11 (nguồn: kiểm kê): lot and source are filled in; staff scan the label of each defective item and describe the
 * defect. Those items are set aside; "Nghi lỗi cả lô" quarantines the whole lot as well.
 */
function StockDefectDialog({ planId, lot, onClose }: { planId: number; lot: SheetLot; onClose: () => void }) {
  const file = useStockDefect(planId);
  const items = useLot(lot.receiptDetailId);
  const toast = useToast();
  const [code, setCode] = useState('');
  const [serials, setSerials] = useState<string[]>([]);
  // focus: the result came from the scan field, so the cursor goes back there (not after tapping a code in the list).
  const [feedback, setFeedback] = useState<{ state: 'success' | 'error'; message: string; key: number; focus: boolean } | null>(null);
  const [description, setDescription] = useState('');
  const [proposal, setProposal] = useState('');
  const [wholeLot, setWholeLot] = useState(false);
  const [filter, setFilter] = useState('');
  const errors = fieldErrors(file.error);
  const bySerial = useMemo(() => new Map((items.data?.items ?? []).map(i => [i.serial, i])), [items.data]);
  // "Chọn mã" without scanning: the items a scan would accept (on the shelf, not set aside, not picked for an issue).
  const choosable = useMemo(() => (items.data?.items ?? [])
    .filter(i => (i.status === 'inStock' || i.status === 'reserved') && !i.picked)
    .map(i => i.serial).sort(), [items.data]);
  const shown = choosable.filter(s => !serials.includes(s) && matches(filter, s));
  const SHOW_MAX = 60;

  const scan = (value: string, scanned = true) => {
    const s = value.trim().toUpperCase();
    setCode('');
    if (!s) return;
    const say = (state: 'success' | 'error', message: string) => setFeedback({ state, message, key: Date.now(), focus: scanned });
    const item = bySerial.get(s);
    if (s === lot.lotCode) return say('error', `${s} là mã lô. Quét tem sản phẩm bị lỗi.`);
    if (!item) return say('error', `${s} không thuộc lô ${lot.lotCode}.`);
    if (serials.includes(s)) return say('error', `${s} đã quét rồi.`);
    if (item.status === 'defective') return say('error', `${s} đã có biên bản lỗi${item.reportCode ? ` ${item.reportCode}` : ''}.`);
    if (item.status === 'issued') return say('error', `${s} đã xuất kho.`);
    if (item.status === 'lost') return say('error', `${s} đang ghi Thất thoát. Báo quản lý.`);
    if (item.status === 'disposed') return say('error', `${s} đã loại bỏ khỏi kho theo biên bản${item.reportCode ? ` ${item.reportCode}` : ''}.`);
    if (item.picked) return say('error', `${s} đang soạn cho phiếu ${item.issueCode ?? 'xuất'}; báo lỗi ở màn lấy hàng.`);
    setSerials(list => [...list, s]);
    say('success', `Ghi nhận ${s} lỗi · ${serials.length + 1} ${lot.unit}`);
  };

  const submit = () => file.mutate({ receiptDetailId: lot.receiptDetailId, serials, description, wholeLot, handlingProposal: proposal }, {
    onSuccess: r => {
      toast({
        tone: 'warning', title: `Đã lập biên bản ${r.code}`,
        message: wholeLot ? `Lô ${lot.lotCode} tạm cách ly.` : `${r.quantity} ${lot.unit} lỗi.`,
      });
      onClose();
    },
  });
  return (
    // A plain dialog, not a form: the scan field is a form of its own (Enter = one scan) and must not submit the report.
    <Modal title={`Báo hàng lỗi lô ${lot.lotCode}`} description={`${lot.sku} ${lot.productName} · phát hiện khi kiểm kê`} width={640} onClose={onClose}
      footer={<>
        <Button variant="secondary" type="button" onClick={onClose}>Huỷ</Button>
        <Button type="button" loading={file.isPending} onClick={() => !file.isPending && submit()}>Lập biên bản</Button>
      </>}>
      {formError(file.error) && <AlertBanner tone="danger">{formError(file.error)}</AlertBanner>}
      {items.isPending ? <Loading /> : items.isError ? <ListError onRetry={() => items.refetch()} /> : (
        <>
          <ScanInput size="md" value={code} onChange={setCode} onSubmit={v => scan(v)} scanKey={feedback?.key ?? 0} autoFocus={feedback?.focus ?? true} label="Quét tem sản phẩm lỗi"
            placeholder="SP-…" state={feedback?.state ?? 'idle'} message={feedback?.message ?? 'Quét lần lượt từng sản phẩm bị lỗi, hoặc tìm và chọn mã bên dưới.'} />
          <div className="vb-field">
            <span className="vb-field__label">Hoặc tìm và chọn mã <span className="vb-muted">({fmt(choosable.length)} sản phẩm của lô còn trên kệ)</span></span>
            <SearchField size="md" value={filter} onChange={setFilter} placeholder="Gõ mã hoặc vài số cuối, ví dụ 0012" aria-label="Tìm mã sản phẩm của lô" />
            {shown.length === 0
              ? <span className="vb-muted">{filter ? `Không có mã nào khớp “${filter}”.` : 'Đã chọn hết các mã của lô.'}</span>
              : (
                <div className="vb-serials" style={{ maxHeight: 180, overflow: 'auto' }}>
                  {shown.slice(0, SHOW_MAX).map(s => (
                    <button key={s} type="button" className="vb-serial" onClick={() => scan(s, false)} title="Chọn mã này là hàng lỗi">{s}</button>
                  ))}
                  {shown.length > SHOW_MAX && <span className="vb-muted" style={{ alignSelf: 'center' }}>… còn {fmt(shown.length - SHOW_MAX)} mã, gõ thêm để lọc.</span>}
                </div>
              )}
          </div>
        </>
      )}
      <div className="vb-field">
        <span className="vb-field__label">Sản phẩm lỗi<span className="req" aria-hidden="true">*</span> <span className="vb-muted">({serials.length} {lot.unit})</span></span>
        {serials.length === 0 ? <span className="vb-muted">Chưa quét hoặc chọn sản phẩm nào.</span> : (
          <div className="vb-serials">
            {serials.map(s => (
              <button key={s} type="button" className="vb-serial" aria-pressed="true" title="Bỏ mã này" onClick={() => setSerials(list => list.filter(x => x !== s))}>
                {s} <Icon name="x" size={12} style={{ verticalAlign: -1 }} />
              </button>
            ))}
          </div>
        )}
        {errors.serials && <div className="vb-field__help vb-field__help--error">{errors.serials}</div>}
      </div>
      <TextField size="lg" multiline label="Mô tả lỗi" required value={description} onChange={e => setDescription(e.target.value)}
        error={errors.description} placeholder="Ví dụ: mốc, nứt, mối mọt" />
      <TextField size="lg" multiline label="Hướng xử lý đề xuất" helper="Không bắt buộc. Quản lý chốt hướng xử lý khi duyệt." value={proposal}
        onChange={e => setProposal(e.target.value)} error={errors.handlingProposal} placeholder="Ví dụ: trả nhà cung cấp, sửa lại rồi đưa về kệ" />
      <Checkbox size="lg" checked={wholeLot} onChange={e => setWholeLot(e.target.checked)}
        label={<b>Nghi lỗi cả lô</b>} />
    </Modal>
  );
}
