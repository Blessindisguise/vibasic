import { useState } from 'react';
import { Button, ConfirmDialog } from '../../design';
import { fmt, fmtDateTime, fmtShort } from '../../app/format';
import { Segmented } from '../../app/Segmented';
import { useToast } from '../../app/toast';
import { useReportAction, type ReportRow, type ReportScope } from '../../app/receiving';
import { ApprovalBadge, SCOPE_LABEL, SOURCE_LABEL } from '../../app/statusBadges';

type Kind = 'approve' | 'reject' | 'revoke';

/**
 * UC_12 buttons for one abnormal report. Approve takes the defective items out of stock, or locks the whole lot; the manager
 * picks the scope (a report raised at receiving always covers its failed lot). Reject puts the items / lot back into stock.
 * A report raised at receiving waits until its receipt is approved (UC_05 steps 6–7).
 * Once decided, the manager can take the decision back ("Hủy quyết định") and decide again.
 */
export function ReportDecision({ report: r }: { report: ReportRow }) {
  const action = useReportAction();
  const toast = useToast();
  const [kind, setKind] = useState<Kind | null>(null);
  const [scope, setScope] = useState<ReportScope>(r.scope);

  if (r.status === 'pending' && r.sourceType === 'receipt' && r.receiptStatus !== 'approved') return <span className="vb-muted">Duyệt phiếu {r.receiptCode} trước</span>;

  const fixed = r.sourceType === 'receipt';
  const n = `${fmt(r.quantity)} ${r.unit}`;
  const lotWide = r.scope === 'lot';
  const run = (k: Kind, reason?: string) => action.mutate({ id: r.id, action: k, reason, wholeLot: k === 'approve' && !fixed ? scope === 'lot' : undefined }, {
    onSuccess: () => {
      setKind(null);
      toast(k === 'approve'
        ? scope === 'lot' || fixed ? { tone: 'success', title: `Đã khóa lô ${r.lotCode}` } : { tone: 'success', title: `Đã loại ${n} lỗi khỏi tồn kho` }
        : k === 'reject'
          ? { tone: 'info', title: lotWide ? `Lô ${r.lotCode} trở về Bình thường` : `${n} của lô ${r.lotCode} trở về Trong kho` }
          : { tone: 'info', title: `Đã hủy quyết định biên bản ${r.code}` });
    },
    onError: e => { setKind(null); toast({ tone: 'danger', title: 'Không thực hiện được', message: e.message }); },
  });
  const open = (k: Kind) => { setScope(r.scope); setKind(k); };

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
          confirmLabel={scope === 'lot' ? 'Duyệt, khóa lô' : 'Duyệt'} onConfirm={() => run('approve')} onCancel={() => setKind(null)}
        >
          {!fixed && (
            <div className="vb-field">
              <span className="vb-field__label">Phạm vi xử lý <span className="vb-muted">(nhân viên đề xuất: {SCOPE_LABEL[r.scope].toLowerCase()})</span></span>
              <Segmented<ReportScope> label="Phạm vi xử lý" value={scope} onChange={setScope}
                options={[{ value: 'items', label: 'Chỉ sản phẩm lỗi' }, { value: 'lot', label: 'Khóa cả lô' }]} />
            </div>
          )}
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

/** Status badge with who decided and when underneath; the reject reason shows on hover. */
export function ReportStatusCell({ report: r }: { report: ReportRow }) {
  return (
    <span title={r.rejectReason ? `Lý do: ${r.rejectReason}` : undefined} style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
      <ApprovalBadge status={r.status} />
      {r.status !== 'pending' && r.approverName && (
        <span className="vb-muted" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{r.approverName} · {fmtShort(r.approvedAt)}</span>
      )}
    </span>
  );
}
