import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertBanner, ApprovalStepper, Button, DataTable, EmptyState, Icon, type DataTableColumn } from '../../design';
import { ConfirmDialog } from '../../app/ConfirmDialog';
import { fmt, fmtDateTime } from '../../app/format';
import { useToast } from '../../app/toast';
import { ApiError } from '../../app/api';
import { LotStatusBadge, ReceiptStatusBadge } from '../../app/statusBadges';
import { reportHref, useReceipt, useReceiptAction, type LotRow, type ReportRow } from '../../app/receiving';
import { Code, ListError, Loading } from '../../app/ui';
import { ReportDecision, ReportStatusCell } from '../abnormal/ReportDecision';

type Role = 'manager' | 'staff';
type Dialog = 'submit' | 'approve' | 'reject' | 'revoke' | null;

/**
 * Receipt detail (UC_06 step 5, UC_10 step 2). Staff: print labels, edit, confirm and submit (UC_05).
 * Manager: approve or reject the receipt, then handle the abnormal reports of its quarantined lots (UC_12).
 */
export function ReceiptDetail({ id, role, basePath }: { id: number; role: Role; basePath: string }) {
  const receipt = useReceipt(id);
  const action = useReceiptAction();
  const toast = useToast();
  const nav = useNavigate();
  const [dialog, setDialog] = useState<Dialog>(null);
  const touch = role === 'staff';
  const size = touch ? 'lg' : 'md';

  if (receipt.isPending) return <Loading />;
  if (receipt.error instanceof ApiError && receipt.error.status === 404) {
    return (
      <div className="vb-panel">
        <EmptyState icon="search" title="Không tìm thấy phiếu nhập" description="Phiếu không tồn tại hoặc đã bị xoá."
          action={<Button variant="secondary" onClick={() => nav(basePath)}>Về danh sách phiếu nhập</Button>} />
      </div>
    );
  }
  if (receipt.isError) return <ListError onRetry={() => receipt.refetch()} />;
  const { header: h, lots, reports, note, revokeBlock } = receipt.data;
  const editable = h.status === 'receiving' || h.status === 'rejected';
  const normalQty = lots.filter(l => l.status === 'normal').reduce((s, l) => s + l.quantity, 0);
  const quarantined = lots.filter(l => l.status === 'quarantined');
  const recorded = h.status === 'approved';

  const done: Record<Exclude<Dialog, null>, string> = {
    submit: `Đã gửi phiếu ${h.code} cho quản lý duyệt`, approve: `Đã duyệt phiếu ${h.code}`,
    reject: `Đã từ chối phiếu ${h.code}`, revoke: `Đã hủy duyệt phiếu ${h.code}`,
  };
  const run = (kind: Exclude<Dialog, null>, reason?: string) => action.mutate({ id, action: kind, reason }, {
    onSuccess: () => {
      setDialog(null);
      toast({
        tone: kind === 'reject' || kind === 'revoke' ? 'info' : 'success', title: done[kind],
      });
    },
    onError: e => { setDialog(null); toast({ tone: 'danger', title: 'Không thực hiện được', message: e.message }); },
  });

  const lotColumns: DataTableColumn<LotRow>[] = [
    { key: 'lotCode', header: 'Mã lô', width: 130, render: l => <Code>{l.lotCode}</Code> },
    { key: 'product', header: 'Mặt hàng', render: l => <><Code>{l.sku}</Code> <span>{l.productName}</span></> },
    { key: 'quantity', header: 'SL nhập', numeric: true, width: 100, render: l => `${fmt(l.quantity)} ${l.unit}` },
    { key: 'onHand', header: 'Tồn còn lại', numeric: true, width: 110, render: l => recorded ? fmt(l.quantityOnHand) : <span className="vb-muted">Chưa ghi nhận</span> },
    { key: 'status', header: 'Trạng thái lô', width: 140, render: l => <LotStatusBadge status={l.status} /> },
    {
      key: 'note', header: 'Ghi chú',
      render: l => (
        <span style={{ whiteSpace: 'normal' }}>
          {l.documentQuantity != null && <span style={{ fontWeight: 500 }}>Chứng từ: {fmt(l.documentQuantity)} {l.unit}. </span>}
          {l.note ?? (l.documentQuantity == null && <span className="vb-muted">—</span>)}
        </span>
      ),
    },
  ];

  const reportColumns: DataTableColumn<ReportRow>[] = [
    { key: 'code', header: 'Biên bản', width: 130, render: r => <Code>{r.code}</Code> },
    { key: 'lot', header: 'Lô', width: 130, render: r => <Code>{r.lotCode}</Code> },
    { key: 'description', header: 'Mô tả lỗi', render: r => <span style={{ whiteSpace: 'normal' }}>{r.description}</span> },
    { key: 'quantity', header: 'SL lỗi', numeric: true, width: 90, render: r => `${fmt(r.quantity)} ${r.unit}` },
    {
      key: 'status', header: 'Trạng thái', width: 170,
      render: r => <ReportStatusCell report={r} />,
    },
    ...(role === 'manager' ? [{
      key: 'actions', header: '', width: 230, align: 'right' as const,
      render: (r: ReportRow) => r.status === 'pending' && !recorded ? <span className="vb-muted">Duyệt phiếu trước</span> : <ReportDecision report={r} />,
    }] : []),
  ];

  const stepStatus = h.status === 'receiving' ? 'draft' : h.status;

  return (
    <div className="vb-stack">
      <div className="vb-row">
        <Button variant="ghost" size={size} icon="chevron-left" onClick={() => nav(basePath)}>Danh sách phiếu nhập</Button>
      </div>

      <section className="vb-panel">
        <div className="vb-panel__head" style={{ flexWrap: 'wrap', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <div className="vb-row" style={{ gap: 10 }}>
              <h2 className="vb-panel__title" style={{ fontSize: touch ? 20 : 18, letterSpacing: 'var(--tracking-code)' }}>{h.code}</h2>
              <ReceiptStatusBadge status={h.status} size={size} />
            </div>
            <div className="vb-muted" style={{ marginTop: 2, fontSize: touch ? 14 : undefined }}>
              {h.supplierName}{h.deliveryNoteNo && <> · chứng từ <b>{h.deliveryNoteNo}</b></>} · Lập {fmtDateTime(h.receiptDate)} bởi {h.creatorName}
            </div>
          </div>
          <div className="vb-row">
            {role === 'staff' && <>
              <Button variant="secondary" size={size} icon="printer" onClick={() => window.open(`/in/nhap-kho/${id}`, '_blank')}>In mã vạch</Button>
              {editable && <Button variant="secondary" size={size} icon="square-pen" onClick={() => nav(`${basePath}/${id}/sua`)}>Sửa phiếu</Button>}
              {editable && <Button size={size} icon="send" onClick={() => setDialog('submit')}>Xác nhận nhập kho và gửi duyệt</Button>}
            </>}
            {role === 'manager' && h.status === 'pending' && <>
              <Button variant="danger-outline" icon="circle-x" onClick={() => setDialog('reject')}>Từ chối phiếu</Button>
              <Button icon="check" onClick={() => setDialog('approve')}>Duyệt phiếu</Button>
            </>}
            {role === 'manager' && h.status === 'approved' && !revokeBlock && (
              <Button variant="secondary" icon="undo-2" onClick={() => setDialog('revoke')}>Hủy duyệt</Button>
            )}
            {role === 'manager' && h.status === 'approved' && revokeBlock && (
              <span className="vb-muted vb-row" style={{ gap: 6, maxWidth: 360, fontSize: 13, flexWrap: 'nowrap' }} title={revokeBlock}>
                <Icon name="lock" size={16} /> <span>Không hủy duyệt được</span>
              </span>
            )}
          </div>
        </div>
        <div className="vb-panel__body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <ApprovalStepper
            status={stepStatus} draftLabel="Đang nhập kho" size={size}
            history={{
              draft: { by: h.creatorName, at: fmtDateTime(h.receiptDate) },
              pending: h.submittedAt ? { at: fmtDateTime(h.submittedAt) } : undefined,
              [h.status === 'rejected' ? 'rejected' : 'approved']: h.approvedAt ? { by: h.approverName, at: fmtDateTime(h.approvedAt) } : undefined,
            }}
          />
          {h.status === 'rejected' && (
            <AlertBanner tone="danger" title={`Phiếu bị từ chối bởi ${h.approverName ?? 'quản lý'}`}>
              Lý do: {h.rejectReason}
            </AlertBanner>
          )}
          {h.status === 'pending' && h.rejectReason && (
            <AlertBanner tone="info" title="Phiếu đã được gửi lại sau khi bị từ chối">Lý do lần trước: {h.rejectReason}</AlertBanner>
          )}
          {role === 'manager' && h.status === 'approved' && reports.some(r => r.status === 'pending') && (
            <AlertBanner tone="warning" title="Còn biên bản bất thường chờ xử lý" />
          )}
          {note && <div><span className="vb-muted">Ghi chú phiếu: </span>{note}</div>}
        </div>
      </section>

      <section className="vb-panel">
        <div className="vb-panel__head">
          <h3 className="vb-panel__title">Lô hàng</h3>
          <span className="vb-muted" style={{ marginLeft: 'auto', fontVariantNumeric: 'tabular-nums' }}>
            {h.productCount} mặt hàng · {lots.length} lô · {fmt(h.totalQuantity)} sản phẩm
          </span>
        </div>
        <DataTable columns={lotColumns} rows={lots} density={touch ? 'default' : 'compact'} caption="Lô hàng của phiếu" />
      </section>

      {(reports.length > 0 || quarantined.length > 0) && (
        <section className="vb-panel">
          <div className="vb-panel__head"><h3 className="vb-panel__title">Biên bản bất thường</h3></div>
          {reports.length > 0
            ? <DataTable columns={reportColumns} rows={reports} density={touch ? 'default' : 'compact'} onRowClick={r => nav(reportHref(role, r.id))} caption="Biên bản bất thường của phiếu" />
            : <EmptyState icon="shield-alert" title="Chưa lập biên bản" />}
        </section>
      )}

      <ConfirmDialog busy={action.isPending}
        open={dialog === 'submit'} title={`Gửi phiếu ${h.code} cho quản lý duyệt?`}
        description={<>
          {fmt(normalQty)} sản phẩm đạt{quarantined.length > 0 && <>, {fmt(quarantined.reduce((s, l) => s + l.quantity, 0))} sản phẩm không đạt</>}.
        </>}
        confirmLabel="Gửi duyệt" onConfirm={() => run('submit')} onCancel={() => setDialog(null)}
      />
      <ConfirmDialog busy={action.isPending}
        open={dialog === 'approve'} title={`Duyệt phiếu ${h.code}?`}
        description={<>
          {fmt(normalQty)} sản phẩm của {lots.filter(l => l.status === 'normal').length} lô Bình thường{quarantined.length > 0 && <>, {quarantined.length} lô tạm cách ly</>}.
        </>}
        confirmLabel="Duyệt phiếu" onConfirm={() => run('approve')} onCancel={() => setDialog(null)}
      />
      <ConfirmDialog busy={action.isPending}
        open={dialog === 'reject'} tone="danger" title={`Từ chối phiếu ${h.code}?`} requireReason
        confirmLabel="Từ chối phiếu" onConfirm={reason => run('reject', reason)} onCancel={() => setDialog(null)}
      />
      <ConfirmDialog busy={action.isPending}
        open={dialog === 'revoke'} requireReason
        title={`Hủy duyệt phiếu ${h.code}?`}
        description={<>
          {fmt(normalQty)} sản phẩm{reports.length > 0 && <>, {reports.length} biên bản bất thường</>}.
        </>}
        confirmLabel="Hủy duyệt" onConfirm={reason => run('revoke', reason)} onCancel={() => setDialog(null)}
      />
    </div>
  );
}
