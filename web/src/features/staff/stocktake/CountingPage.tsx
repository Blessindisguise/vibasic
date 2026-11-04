import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertBanner, Button, ConfirmDialog, Icon, TextField } from '../../../design';
import { fmt, fmtDate } from '../../../app/format';
import { FormDialog } from '../../../app/Modal';
import { useToast } from '../../../app/toast';
import { Code, ListError, Loading } from '../../../app/ui';
import { parseNumber } from '../../../app/text';
import { fieldErrors, formError } from '../../../app/catalog';
import { LotStatusBadge, PlanStatusBadge } from '../../../app/statusBadges';
import { PLAN_TYPE_LABEL, usePlan, useSheet, useStockDefect, useSubmitCount, type SheetLot } from '../../../app/stock';

type Draft = Record<number, { actual: string; reason: string }>;
const draftKey = (planId: number) => `vb-count-${planId}`;
const loadDraft = (planId: number): Draft => {
  try { return JSON.parse(localStorage.getItem(draftKey(planId)) ?? '{}'); } catch { return {}; }
};
const saveDraft = (planId: number, d: Draft | null) => {
  try { if (d) localStorage.setItem(draftKey(planId), JSON.stringify(d)); else localStorage.removeItem(draftKey(planId)); } catch { /* storage blocked */ }
};

/**
 * UC_14: count each lot in scope and enter the actual quantity; the system shows the difference and asks for a reason.
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
  const counted = lots.filter(l => (draft[l.receiptDetailId]?.actual ?? '') !== '').length;
  const diffs = lots.filter(l => { const a = parseNumber(draft[l.receiptDetailId]?.actual ?? ''); return a != null && a !== l.systemQuantity; }).length;
  const set = (id: number, patch: Partial<{ actual: string; reason: string }>) =>
    setDraft(d => ({ ...d, [id]: { ...(d[id] ?? { actual: '', reason: '' }), ...patch } }));

  const send = () => submit.mutate(
    lots.map(l => ({ receiptDetailId: l.receiptDetailId, actualQuantity: parseNumber(draft[l.receiptDetailId]?.actual ?? ''), reason: draft[l.receiptDetailId]?.reason ?? '' })),
    {
      onSuccess: s => {
        saveDraft(planId, null);
        toast({ tone: 'success', title: `Đã gửi phiếu ${s.code} cho quản lý duyệt`, message: s.diffLots ? `${s.diffLots} lô có chênh lệch.` : 'Số thực tế khớp hệ thống.' });
        nav(`/kho/kiem-ke/phieu/${s.id}`);
      },
      onError: () => setConfirm(false),
    },
  );

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
          <div style={{ padding: '0 16px 12px' }}><AlertBanner tone="danger">Còn lô chưa nhập số hoặc thiếu lý do chênh lệch. Xem các ô được đánh dấu.</AlertBanner></div>
        )}
      </section>

      {p.lastStocktakeStatus === 'rejected' && <AlertBanner tone="danger" title={`Phiếu ${p.lastStocktakeCode} bị từ chối`}>{p.lastRejectReason}. Kiểm đếm lại các lô.</AlertBanner>}
      <AlertBanner tone="info">Đếm thực tế từng lô rồi nhập số. Không tìm thấy lô thì nhập 0. Phát hiện hàng lỗi thì chọn “Báo hàng lỗi” ở lô đó, rồi đếm tiếp.</AlertBanner>

      {groups.map(group => (
        <section key={group[0].sku} className="vb-panel">
          <div className="vb-panel__head"><span style={{ font: 'var(--type-touch-heading)', fontSize: 17 }}><Code>{group[0].sku}</Code> {group[0].productName}</span></div>
          <div className="vb-panel__body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {group.map(l => {
              const d = draft[l.receiptDetailId] ?? { actual: '', reason: '' };
              const actual = parseNumber(d.actual);
              const diff = actual == null ? null : actual - l.systemQuantity;
              const k = `counts[${l.receiptDetailId}].`;
              return (
                <div key={l.receiptDetailId} style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 1fr) 220px minmax(200px, 1.4fr)', gap: 16, alignItems: 'start', paddingBottom: 16, borderBottom: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <span style={{ font: '600 17px/24px var(--font-sans)', letterSpacing: 'var(--tracking-code)' }}>{l.lotCode}</span>
                    <span className="vb-row" style={{ gap: 8 }}><LotStatusBadge status={l.status} /><span className="vb-muted">nhập {fmtDate(l.receivedDate)}</span></span>
                    <Button variant="ghost" size="lg" icon="shield-alert" style={{ alignSelf: 'flex-start', color: 'var(--red-700)' }} onClick={() => setDefectLot(l)} disabled={l.status === 'locked'}>Báo hàng lỗi</Button>
                  </div>
                  <TextField size="xl" label="Số thực tế" required inputMode="numeric" suffix={l.unit} value={d.actual}
                    onChange={e => set(l.receiptDetailId, { actual: e.target.value })} error={errors[k + 'actualQuantity']} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {diff == null ? <span className="vb-muted" style={{ marginTop: 34 }}>Nhập số đếm được để đối chiếu.</span> : (
                      <span style={{ marginTop: 30, font: 'var(--type-touch-body)', fontVariantNumeric: 'tabular-nums' }}>
                        Hệ thống {fmt(l.systemQuantity)} ·{' '}
                        {diff === 0 ? <b style={{ color: 'var(--green-700)' }}><Icon name="check" size={16} style={{ verticalAlign: -3 }} /> Khớp</b>
                          : <b style={{ color: diff < 0 ? 'var(--red-700)' : 'var(--blue-700)' }}>{diff < 0 ? 'Thiếu' : 'Thừa'} {fmt(Math.abs(diff))} {l.unit}</b>}
                      </span>
                    )}
                    {diff != null && diff !== 0 && (
                      <TextField size="lg" label="Lý do chênh lệch" required value={d.reason} placeholder="Ví dụ: hàng rơi vỡ, chưa dán tem, nhầm lô"
                        onChange={e => set(l.receiptDetailId, { reason: e.target.value })} error={errors[k + 'reason']} />
                    )}
                  </div>
                </div>
              );
            })}
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
