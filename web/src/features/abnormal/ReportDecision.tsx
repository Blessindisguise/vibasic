import { useState } from 'react';
import { Button, ConfirmDialog } from '../../design';
import { fmt, fmtDateTime } from '../../app/format';
import { useToast } from '../../app/toast';
import { useReportAction, type ReportRow } from '../../app/receiving';
import { SOURCE_LABEL } from '../../app/statusBadges';

/**
 * UC_12 buttons for one abnormal report: approve (lock the lot) or reject with a reason (lot back to "Bình thường").
 * A report raised at receiving waits until its receipt is approved (UC_05 steps 6–7).
 */
export function ReportDecision({ report: r }: { report: ReportRow }) {
  const action = useReportAction();
  const toast = useToast();
  const [kind, setKind] = useState<'approve' | 'reject' | null>(null);

  if (r.status !== 'pending') return <span className="vb-muted">{r.approverName} · {fmtDateTime(r.approvedAt)}</span>;
  if (r.sourceType === 'receipt' && r.receiptStatus !== 'approved') return <span className="vb-muted">Duyệt phiếu {r.receiptCode} trước</span>;

  const run = (k: 'approve' | 'reject', reason?: string) => action.mutate({ id: r.id, action: k, reason }, {
    onSuccess: () => {
      setKind(null);
      toast({ tone: k === 'approve' ? 'success' : 'info', title: k === 'approve' ? `Đã khóa lô ${r.lotCode}` : `Lô ${r.lotCode} trở về Bình thường` });
    },
    onError: e => { setKind(null); toast({ tone: 'danger', title: 'Không thực hiện được', message: e.message }); },
  });

  return (
    <div className="vb-row" style={{ justifyContent: 'flex-end', flexWrap: 'nowrap' }} onClick={e => e.stopPropagation()}>
      <Button size="sm" variant="danger-outline" onClick={() => setKind('reject')}>Từ chối</Button>
      <Button size="sm" variant="secondary" icon="lock" onClick={() => setKind('approve')}>Duyệt, khóa lô</Button>
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
    </div>
  );
}
