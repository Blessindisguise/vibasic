import { useState } from 'react';
import { Button, ConfirmDialog, SelectField, TextField } from '../../design';
import { fmt, fmtDateTime, fmtShort } from '../../app/format';
import { Segmented } from '../../app/Segmented';
import { useToast } from '../../app/toast';
import { useAuth } from '../../app/auth';
import {
  reportState, useReportAction, useSaveHandling, type HandlingInput, type HandlingMethod, type ReportRow, type ReportScope,
} from '../../app/receiving';
import { HANDLING_METHODS, HANDLING_METHOD_LABEL, ReportStateBadge, SCOPE_LABEL, SOURCE_LABEL } from '../../app/statusBadges';

const MIN_PLAN = 5;

/** Hướng xử lý: one of the fixed methods (each with its effect on stock) and a required description. */
function HandlingFields({ value, onChange, tried }: { value: HandlingInput; onChange: (v: HandlingInput) => void; tried: boolean }) {
  const effect = HANDLING_METHODS.find(m => m.value === value.method)?.effect;
  return (
    <>
      <SelectField
        label="Hướng xử lý" required value={value.method ?? ''} placeholder="Chọn hướng xử lý"
        onChange={e => onChange({ ...value, method: (e.target.value || null) as HandlingMethod | null })}
        options={HANDLING_METHODS.map(m => ({ value: m.value, label: `${m.label} — ${m.effect.toLowerCase()}` }))}
        error={tried && !value.method ? 'Chọn hướng xử lý.' : undefined}
        helper={effect ? `Khi hoàn thành: ${effect.toLowerCase()}.` : 'Mỗi hướng có kết quả tồn kho riêng khi hoàn thành.'}
      />
      <TextField multiline required label="Mô tả hướng xử lý" value={value.plan} onChange={e => onChange({ ...value, plan: e.target.value })}
        placeholder="Làm gì, với ai, cần chuẩn bị gì…" maxLength={500}
        error={tried && value.plan.trim().length < MIN_PLAN ? `Mô tả hướng xử lý (tối thiểu ${MIN_PLAN} ký tự).` : undefined} />
    </>
  );
}
const handlingValid = (h: HandlingInput) => !!h.method && h.plan.trim().length >= MIN_PLAN;

type Kind = 'approve' | 'reject' | 'revoke';

/**
 * UC_12 buttons for one abnormal report. Approve takes the defective items out of stock, or locks the whole lot; the manager
 * picks the scope (a report raised at receiving always covers its failed lot) and the hướng xử lý. Reject puts the items / lot
 * back into stock. A report raised at receiving waits until its receipt is approved (UC_05 steps 6–7).
 * Once decided — and while nobody has taken the handling — the manager can take the decision back ("Hủy quyết định").
 */
export function ReportDecision({ report: r }: { report: ReportRow }) {
  const action = useReportAction();
  const toast = useToast();
  const [kind, setKind] = useState<Kind | null>(null);
  const [scope, setScope] = useState<ReportScope>(r.scope);
  const [handling, setHandling] = useState<HandlingInput>({ method: null, plan: '' });
  const [tried, setTried] = useState(false);

  if (r.status === 'pending' && r.sourceType === 'receipt' && r.receiptStatus !== 'approved') return <span className="vb-muted">Duyệt phiếu {r.receiptCode} trước</span>;
  if (r.status === 'approved' && r.handlingStatus && r.handlingStatus !== 'waiting') return null; // being handled: see HandlingActions

  const fixed = r.sourceType === 'receipt';
  const n = `${fmt(r.quantity)} ${r.unit}`;
  const lotWide = r.scope === 'lot';
  const run = (k: Kind, reason?: string) => action.mutate({
    id: r.id, action: k, reason, wholeLot: k === 'approve' && !fixed ? scope === 'lot' : undefined, handling: k === 'approve' ? handling : undefined,
  }, {
    onSuccess: () => {
      setKind(null);
      toast(k === 'approve'
        ? { tone: 'success', title: `Đã duyệt biên bản ${r.code}`, message: `Chờ nhân viên xử lý: ${HANDLING_METHOD_LABEL[handling.method!].toLowerCase()}.` }
        : k === 'reject'
          ? { tone: 'info', title: lotWide ? `Lô ${r.lotCode} trở về Bình thường` : `${n} của lô ${r.lotCode} trở về Trong kho` }
          : { tone: 'info', title: `Đã hủy quyết định biên bản ${r.code}` });
    },
    onError: e => { setKind(null); toast({ tone: 'danger', title: 'Không thực hiện được', message: e.message }); },
  });
  const open = (k: Kind) => { setScope(r.scope); setHandling({ method: null, plan: r.handlingPlan ?? '' }); setTried(false); setKind(k); };

  return (
    <div className="vb-row" style={{ justifyContent: 'flex-end', flexWrap: 'nowrap' }} onClick={e => e.stopPropagation()}>
      {r.status === 'pending' ? <>
        <Button size="sm" variant="danger-outline" onClick={() => open('reject')}>Từ chối</Button>
        <Button size="sm" variant="secondary" icon={lotWide ? 'lock' : 'check'} onClick={() => open('approve')}>{lotWide ? 'Duyệt, khóa lô' : 'Duyệt'}</Button>
      </> : <>
        <Button size="sm" variant="ghost" icon="undo-2" onClick={() => open('revoke')}>Hủy quyết định</Button>
      </>}
      {kind === 'approve' && (
        <ConfirmDialog
          title={`Duyệt biên bản ${r.code}?`}
          description={`Phát hiện khi ${SOURCE_LABEL[r.sourceType].toLowerCase()}: ${n} lô ${r.lotCode} (${r.sku} ${r.productName}) lỗi, lập ${fmtDateTime(r.createdAt)} bởi ${r.creatorName}.`}
          confirmLabel={scope === 'lot' ? 'Duyệt, khóa lô' : 'Duyệt'}
          onConfirm={() => { setTried(true); if (handlingValid(handling)) run('approve'); }} onCancel={() => setKind(null)}
        >
          {!fixed && (
            <div className="vb-field">
              <span className="vb-field__label">Phạm vi xử lý <span className="vb-muted">(nhân viên đề xuất: {SCOPE_LABEL[r.scope].toLowerCase()})</span></span>
              <Segmented<ReportScope> label="Phạm vi xử lý" value={scope} onChange={setScope}
                options={[{ value: 'items', label: 'Chỉ sản phẩm lỗi' }, { value: 'lot', label: 'Khóa cả lô' }]} />
            </div>
          )}
          {r.handlingPlan && <div className="vb-muted" style={{ fontSize: 13 }}>Nhân viên đề xuất: “{r.handlingPlan}”</div>}
          <HandlingFields value={handling} onChange={setHandling} tried={tried} />
        </ConfirmDialog>
      )}
      {kind === 'reject' && (
        <ConfirmDialog
          tone="danger" requireReason title={`Từ chối biên bản ${r.code}?`}
          description={`${n} lô ${r.lotCode} (${r.sku} ${r.productName}).`}
          confirmLabel="Từ chối biên bản" onConfirm={reason => run('reject', reason)} onCancel={() => setKind(null)}
        />
      )}
      {kind === 'revoke' && (
        <ConfirmDialog
          requireReason
          title={`Hủy quyết định “${r.status === 'approved' ? 'Đã duyệt' : 'Từ chối'}” của biên bản ${r.code}?`}
          description={`${n} lô ${r.lotCode} (${r.sku} ${r.productName}).`}
          confirmLabel="Hủy quyết định" onConfirm={reason => run('revoke', reason)} onCancel={() => setKind(null)}
        />
      )}
    </div>
  );
}

type HandlingKind = 'claim' | 'release' | 'complete' | 'edit' | 'propose';

/**
 * Handling of an approved report. Staff: "Nhận xử lý", then (the handler) "Hoàn thành xử lý" or "Trả lại việc".
 * Manager: "Sửa hướng xử lý" until it is done, "Gỡ người xử lý" while someone holds it. While the report is pending, staff may
 * propose a hướng xử lý for the manager.
 */
export function HandlingActions({ report: r, role, completeLeave = 0, completeReturn = 0, size = 'sm' }: {
  report: ReportRow; role: 'manager' | 'staff'; completeLeave?: number; completeReturn?: number; size?: 'sm' | 'md' | 'lg';
}) {
  const action = useReportAction();
  const save = useSaveHandling();
  const toast = useToast();
  const { user } = useAuth();
  const [kind, setKind] = useState<HandlingKind | null>(null);
  const [handling, setHandling] = useState<HandlingInput>({ method: null, plan: '' });
  const [tried, setTried] = useState(false);
  const state = reportState(r);
  const mine = r.handlerId != null && r.handlerId === user?.id;

  const fail = (e: Error) => { setKind(null); toast({ tone: 'danger', title: 'Không thực hiện được', message: e.message }); };
  const act = (k: 'claim' | 'release' | 'complete') => action.mutate({ id: r.id, action: k }, {
    onSuccess: () => {
      setKind(null);
      toast(k === 'claim' ? { tone: 'success', title: `Bạn đang xử lý biên bản ${r.code}` }
        : k === 'release' ? { tone: 'info', title: `Biên bản ${r.code} trở về Chờ xử lý` }
          : { tone: 'success', title: `Đã xử lý xong biên bản ${r.code}`, message: effectText() });
    },
    onError: fail,
  });
  const store = (k: 'handling' | 'proposal') => save.mutate({ id: r.id, kind: k, handling }, {
    onSuccess: () => { setKind(null); toast({ tone: 'success', title: k === 'handling' ? 'Đã lưu hướng xử lý' : 'Đã gửi hướng xử lý đề xuất' }); },
    onError: fail,
  });
  const open = (k: HandlingKind) => { setHandling({ method: r.handlingMethod ?? null, plan: r.handlingPlan ?? '' }); setTried(false); setKind(k); };
  function effectText() {
    if (!r.handlingMethod) return '';
    const leaves = HANDLING_METHODS.find(m => m.value === r.handlingMethod)!.leaves;
    return leaves
      ? `${fmt(completeLeave)} ${r.unit} của lô ${r.lotCode} rời kho (Đã loại bỏ).`
      : `${fmt(completeReturn)} ${r.unit} trở về Trong kho${r.scope === 'lot' ? `, lô ${r.lotCode} được mở khóa` : ''}.`;
  }

  const buttons = [];
  if (role === 'staff' && state === 'pending')
    buttons.push(<Button key="p" size={size} variant="ghost" icon="square-pen" onClick={() => open('propose')}>{r.handlingPlan ? 'Sửa đề xuất xử lý' : 'Đề xuất hướng xử lý'}</Button>);
  if (role === 'staff' && state === 'waiting')
    buttons.push(<Button key="c" size={size} variant="primary" icon="check" onClick={() => act('claim')} disabled={action.isPending}>Nhận xử lý</Button>);
  if (role === 'staff' && state === 'inProgress' && mine) {
    buttons.push(<Button key="r" size={size} variant="ghost" icon="undo-2" onClick={() => setKind('release')}>Trả lại việc</Button>);
    buttons.push(<Button key="d" size={size} variant="primary" icon="circle-check" onClick={() => setKind('complete')}>Hoàn thành xử lý</Button>);
  }
  if (role === 'manager' && (state === 'waiting' || state === 'inProgress'))
    buttons.push(<Button key="e" size={size} variant="ghost" icon="square-pen" onClick={() => open('edit')}>Sửa hướng xử lý</Button>);
  if (role === 'manager' && state === 'inProgress')
    buttons.push(<Button key="g" size={size} variant="ghost" icon="undo-2" onClick={() => setKind('release')}>Gỡ người xử lý</Button>);
  if (buttons.length === 0) return null;

  return (
    <div className="vb-row" style={{ justifyContent: 'flex-end', gap: 8 }} onClick={e => e.stopPropagation()}>
      {buttons}
      {kind === 'complete' && (
        <ConfirmDialog
          title={`Hoàn thành xử lý biên bản ${r.code}?`}
          description={`${r.handlingMethod ? HANDLING_METHOD_LABEL[r.handlingMethod] : ''}: ${effectText()} Không hoàn tác được.`}
          confirmLabel="Hoàn thành" onConfirm={() => act('complete')} onCancel={() => setKind(null)}
        />
      )}
      {kind === 'release' && (
        <ConfirmDialog
          title={role === 'manager' ? `Gỡ ${r.handlerName} khỏi biên bản ${r.code}?` : `Trả lại việc xử lý biên bản ${r.code}?`}
          description="Biên bản trở về Chờ xử lý để nhân viên khác nhận."
          confirmLabel={role === 'manager' ? 'Gỡ người xử lý' : 'Trả lại việc'} onConfirm={() => act('release')} onCancel={() => setKind(null)}
        />
      )}
      {kind === 'edit' && (
        <ConfirmDialog
          title={`Hướng xử lý biên bản ${r.code}`}
          description={`${fmt(r.quantity)} ${r.unit} lô ${r.lotCode} (${r.sku} ${r.productName}) · ${SCOPE_LABEL[r.scope].toLowerCase()}.`}
          confirmLabel="Lưu" onConfirm={() => { setTried(true); if (handlingValid(handling)) store('handling'); }} onCancel={() => setKind(null)}
        >
          <HandlingFields value={handling} onChange={setHandling} tried={tried} />
        </ConfirmDialog>
      )}
      {kind === 'propose' && (
        <ConfirmDialog
          title={`Đề xuất hướng xử lý biên bản ${r.code}`}
          description="Quản lý xem đề xuất này khi duyệt và chốt hướng xử lý."
          confirmLabel="Gửi đề xuất" onConfirm={() => store('proposal')} onCancel={() => setKind(null)}
        >
          <TextField multiline label="Hướng xử lý đề xuất" value={handling.plan} onChange={e => setHandling({ ...handling, plan: e.target.value })}
            placeholder="Ví dụ: trả nhà cung cấp, sửa lại rồi đưa về kệ…" maxLength={500} />
        </ConfirmDialog>
      )}
    </div>
  );
}

/** One badge for the report, with who decided / who handles it underneath; the reject reason shows on hover. */
export function ReportStatusCell({ report: r }: { report: ReportRow }) {
  const state = reportState(r);
  const who = state === 'inProgress' || state === 'done'
    ? r.handlerName && `${r.handlerName} · ${fmtShort(state === 'done' ? r.handledAt : r.handlingStartedAt)}`
    : state !== 'pending' && r.approverName && `${r.approverName} · ${fmtShort(r.approvedAt)}`;
  return (
    <span title={r.rejectReason ? `Lý do: ${r.rejectReason}` : undefined} style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
      <ReportStateBadge state={state} />
      {who && <span className="vb-muted" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{who}</span>}
    </span>
  );
}
