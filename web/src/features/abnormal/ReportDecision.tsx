import { useState } from 'react';
import { Button, ConfirmDialog } from '../../design';
import { fmt, fmtDateTime, fmtShort } from '../../app/format';
import { useToast } from '../../app/toast';
import { useReportAction, type ReportRow } from '../../app/receiving';
import { ApprovalBadge, SOURCE_LABEL } from '../../app/statusBadges';

type Kind = 'approve' | 'reject' | 'revoke';

/**
 * UC_12 buttons for one abnormal report: approve (lock the lot) or reject with a reason (lot back to "Bình thường").
 * A report raised at receiving waits until its receipt is approved (UC_05 steps 6–7).
 * Once decided, the manager can take the decision back ("Hủy quyết định"): the lot returns to "Tạm cách ly" and the report to "Chờ duyệt".
 */
export function ReportDecision({ report: r }: { report: ReportRow }) {
  const action = useReportAction();
  const toast = useToast();
  const [kind, setKind] = useState<Kind | null>(null);

  if (r.status === 'pending' && r.sourceType === 'receipt' && r.receiptStatus !== 'approved') return <span className="vb-muted">Duyệt phiếu {r.receiptCode} trước</span>;

  const run = (k: Kind, reason?: string) => action.mutate({ id: r.id, action: k, reason }, {
    onSuccess: () => {
      setKind(null);
      toast(k === 'approve' ? { tone: 'success', title: `Đã khóa lô ${r.lotCode}` }
        : k === 'reject' ? { tone: 'info', title: `Lô ${r.lotCode} trở về Bình thường` }
        : { tone: 'info', title: `Đã hủy quyết định biên bản ${r.code}`, message: `Lô ${r.lotCode} trở về Tạm cách ly; duyệt lại biên bản khi đã xem xét.` });
    },
    onError: e => { setKind(null); toast({ tone: 'danger', title: 'Không thực hiện được', message: e.message }); },
  });

  return (
    <div className="vb-row" style={{ justifyContent: 'flex-end', flexWrap: 'nowrap' }} onClick={e => e.stopPropagation()}>
      {r.status === 'pending' ? <>
        <Button size="sm" variant="danger-outline" onClick={() => setKind('reject')}>Từ chối</Button>
        <Button size="sm" variant="secondary" icon="lock" onClick={() => setKind('approve')}>Duyệt, khóa lô</Button>
      </> : <>
        <Button size="sm" variant="ghost" icon="undo-2" onClick={() => setKind('revoke')}>Hủy quyết định</Button>
      </>}
      {kind === 'approve' && (
        <ConfirmDialog
          title={`Duyệt biên bản ${r.code} và khóa lô ${r.lotCode}?`}
          description={`Lô ${r.lotCode} (${r.sku} ${r.productName}) bị loại khỏi tồn kho khả dụng và không được xuất. Phát hiện khi ${SOURCE_LABEL[r.sourceType].toLowerCase()}: ${fmt(r.quantity)} ${r.unit} lỗi, lập ${fmtDateTime(r.createdAt)} bởi ${r.creatorName}.`}
          confirmLabel="Duyệt, khóa lô" onConfirm={() => run('approve')} onCancel={() => setKind(null)}
        />
      )}
      {kind === 'reject' && (
        <ConfirmDialog
          tone="danger" requireReason title={`Từ chối biên bản ${r.code}?`}
          description={`Lô ${r.lotCode} trở về Bình thường và được tính vào tồn kho khả dụng.`}
          confirmLabel="Từ chối biên bản" onConfirm={reason => run('reject', reason)} onCancel={() => setKind(null)}
        />
      )}
      {kind === 'revoke' && (
        <ConfirmDialog
          requireReason reasonPlaceholder="Vì sao cần xem xét lại biên bản này…" reasonHelp="Lý do được gửi kèm thông báo cho người lập biên bản."
          title={`Hủy quyết định “${r.status === 'approved' ? 'Đã duyệt' : 'Từ chối'}” của biên bản ${r.code}?`}
          description={r.status === 'approved'
            ? `Lô ${r.lotCode} được mở khóa và trở về Tạm cách ly (vẫn chưa xuất được). Biên bản trở về Chờ duyệt để bạn quyết định lại.`
            : `Lô ${r.lotCode} trở về Tạm cách ly và không còn tính vào tồn kho khả dụng. Biên bản trở về Chờ duyệt để bạn quyết định lại.`}
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
