import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ApprovalStepper, Button, DataTable, EmptyState, type DataTableColumn } from '../../design';
import { ApiError } from '../../app/api';
import { fmt, fmtDate, fmtDateTime, fmtShort } from '../../app/format';
import { HANDLING_METHODS, HANDLING_METHOD_LABEL, ItemStatusBadge, LotStatusBadge, ReportStateBadge, SCOPE_LABEL, SOURCE_LABEL } from '../../app/statusBadges';
import { SerialRanges } from '../../app/SerialRanges';
import type { ItemStatus } from '../../app/issuing';
import { reportState, useReport, type ReportRow } from '../../app/receiving';
import { Code, Fact, ListError, Loading } from '../../app/ui';
import { HandlingActions, ReportDecision } from './ReportDecision';

/** UC_11 / UC_12: one abnormal report — what was found, on which lot, where, and the manager's decision. */
export function ReportDetail({ id, role, basePath }: { id: number; role: 'manager' | 'staff'; basePath: string }) {
  const view = useReport(id);
  const nav = useNavigate();
  const touch = role === 'staff';
  const size = touch ? 'lg' : 'md';
  const root = role === 'manager' ? '/ql' : '/kho';
  const lotBase = role === 'manager' ? '/ql/lo-hang' : '/kho/tra-cuu';

  if (view.isPending) return <Loading />;
  if (view.error instanceof ApiError && view.error.status === 404) {
    return (
      <div className="vb-panel">
        <EmptyState icon="search" title="Không tìm thấy biên bản" description="Biên bản không tồn tại."
          action={<Button variant="secondary" onClick={() => nav(basePath)}>Về danh sách biên bản</Button>} />
      </div>
    );
  }
  if (view.isError) return <ListError onRetry={() => view.refetch()} />;
  const { report: r, lot, items, others, defective, completeLeave, completeReturn } = view.data;
  const state = reportState(r);
  const method = HANDLING_METHODS.find(m => m.value === r.handlingMethod);
  const byStatus = defective.reduce<Partial<Record<ItemStatus, string[]>>>((m, i) => ({ ...m, [i.status]: [...(m[i.status] ?? []), i.serial] }), {});

  const source: ReactNode = r.sourceType === 'issue' && r.issueId
    ? <Link to={`${root}/xuat-kho/${r.issueId}`}>Phiếu xuất {view.data.issueCode}</Link>
    : r.sourceType === 'stocktake'
      ? view.data.stocktakeId
        ? <Link to={`${root}/kiem-ke/phieu/${view.data.stocktakeId}`}>Phiếu kiểm kê {view.data.stocktakeCode}</Link>
        : <span className="vb-muted">Phiếu kiểm kê chưa gửi</span>
      : <Link to={`${root}/nhap-kho/${r.receiptId}`}>Phiếu nhập {r.receiptCode}</Link>;


  const otherColumns: DataTableColumn<ReportRow>[] = [
    { key: 'code', header: 'Biên bản', width: 130, render: o => <Code>{o.code}</Code> },
    { key: 'createdAt', header: 'Lập lúc', width: 110, render: o => fmtShort(o.createdAt) },
    { key: 'source', header: 'Phát hiện khi', width: 110, render: o => SOURCE_LABEL[o.sourceType] },
    { key: 'description', header: 'Mô tả lỗi', render: o => <span style={{ whiteSpace: 'normal' }}>{o.description}</span> },
    { key: 'quantity', header: 'SL lỗi', numeric: true, width: 80, render: o => fmt(o.quantity) },
    { key: 'status', header: 'Trạng thái', width: 120, render: o => <ReportStateBadge state={reportState(o)} /> },
  ];

  return (
    <div className="vb-stack">
      <div className="vb-row"><Button variant="ghost" size={size} icon="chevron-left" onClick={() => nav(basePath)}>Biên bản bất thường</Button></div>

      <section className="vb-panel">
        <div className="vb-panel__head" style={{ flexWrap: 'wrap', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <div className="vb-row" style={{ gap: 10 }}>
              <h2 className="vb-panel__title" style={{ fontSize: touch ? 20 : 18, letterSpacing: 'var(--tracking-code)' }}>{r.code}</h2>
              <ReportStateBadge state={state} size={size} />
            </div>
            <div className="vb-muted" style={{ marginTop: 2, fontSize: touch ? 14 : undefined }}>
              Phát hiện khi {SOURCE_LABEL[r.sourceType].toLowerCase()} · lập {fmtDateTime(r.createdAt)} bởi {r.creatorName}
            </div>
          </div>
          <div className="vb-row" style={{ gap: 8 }}>
            <Button variant="secondary" size={touch ? 'lg' : 'sm'} icon="printer" onClick={() => window.open(`/in/bien-ban/${id}`, '_blank')}>In biên bản</Button>
            {role === 'manager' && <ReportDecision report={r} />}
          </div>
        </div>
        <div className="vb-panel__body vb-stack" style={{ gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
            <Fact label="Lô hàng" value={<span className="vb-row" style={{ gap: 8 }}><Link to={`${lotBase}/${lot.id}`}><Code>{lot.lotCode}</Code></Link><LotStatusBadge status={lot.status} /></span>} />
            <Fact label="Mặt hàng" value={<span><Code>{lot.sku}</Code> {lot.productName}</span>} />
            <Fact label="Số lượng lỗi" value={<span><b>{fmt(r.quantity)}</b> / {fmt(lot.quantity)} {lot.unit} của lô</span>} />
            <Fact label="Phạm vi xử lý" value={<b>{SCOPE_LABEL[r.scope]}</b>} />
            <Fact label="Chứng từ liên quan" value={source} />
            <Fact label="Nhà cung cấp" value={lot.supplierName} />
            <Fact label="Ngày nhập lô" value={`${fmtDate(lot.receivedDate)} · ${lot.receiptCode}`} />
          </div>
          <div>
            <div className="vb-muted">Mô tả lỗi</div>
            <p style={{ margin: '4px 0 0', whiteSpace: 'pre-wrap', fontSize: touch ? 16 : undefined }}>{r.description}</p>
          </div>
          <div>
            <div className="vb-muted">{r.status === 'pending' ? 'Hướng xử lý đề xuất' : 'Hướng xử lý'}</div>
            {method && <p style={{ margin: '4px 0 0', fontSize: touch ? 16 : undefined }}><b>{method.label}</b> <span className="vb-muted">· {method.effect.toLowerCase()} khi hoàn thành</span></p>}
            <p style={{ margin: '4px 0 0', whiteSpace: 'pre-wrap', fontSize: touch ? 16 : undefined }}>
              {r.handlingPlan ?? <span className="vb-muted">{r.status === 'rejected' ? '—' : 'Chưa có. Quản lý chọn hướng xử lý khi duyệt.'}</span>}
            </p>
          </div>
          <div>
            <div className="vb-muted">{r.sourceType === 'receipt' ? 'Sản phẩm không đạt' : 'Sản phẩm lỗi'}</div>
            {defective.length === 0
              ? <p className="vb-muted" style={{ margin: '4px 0 0' }}>—</p>
              : (
                <div className="vb-stack" style={{ gap: 8, marginTop: 6 }}>
                  {(Object.keys(byStatus) as ItemStatus[]).map(st => (
                    <div key={st} className="vb-row" style={{ gap: 10, alignItems: 'flex-start', flexWrap: 'nowrap' }}>
                      <span style={{ flex: 'none', marginTop: 4 }}><ItemStatusBadge status={st} /></span>
                      <SerialRanges serials={byStatus[st]!} unit={lot.unit} />
                    </div>
                  ))}
                </div>
              )}
          </div>
          {items.length > 0 && (
            <div>
              <div className="vb-muted">Sản phẩm của lô hiện nay</div>
              <div className="vb-row" style={{ gap: 12, marginTop: 6 }}>
                {items.map(i => <span key={i.status} className="vb-row" style={{ gap: 6, flexWrap: 'nowrap' }}><ItemStatusBadge status={i.status} /><b style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(i.count)}</b></span>)}
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="vb-panel">
        <div className="vb-panel__head"><h3 className="vb-panel__title">Xử lý biên bản</h3></div>
        <div className="vb-panel__body vb-stack" style={{ gap: 16 }}>
          <ApprovalStepper
            status={r.status} draftLabel="Lập biên bản" size={size}
            history={{
              draft: { by: r.creatorName, at: fmtDateTime(r.createdAt) },
              [r.status === 'rejected' ? 'rejected' : 'approved']: r.approvedAt ? { by: r.approverName, at: fmtDateTime(r.approvedAt), note: r.rejectReason } : undefined,
            }}
          />
          {r.status === 'approved' && (
            <div className="vb-row" style={{ gap: 16, alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 16, flex: 1, minWidth: 260 }}>
                <Fact label="Trạng thái xử lý" value={<ReportStateBadge state={state} size={size} />} />
                <Fact label="Hướng xử lý" value={r.handlingMethod ? HANDLING_METHOD_LABEL[r.handlingMethod] : <span className="vb-muted">Chưa chọn</span>} />
                <Fact label="Người xử lý" value={r.handlerName ?? <span className="vb-muted">Chưa có người nhận</span>} />
                <Fact label="Nhận xử lý lúc" value={r.handlingStartedAt ? fmtDateTime(r.handlingStartedAt) : '—'} />
                <Fact label="Hoàn thành lúc" value={r.handledAt ? fmtDateTime(r.handledAt) : '—'} />
              </div>
              <HandlingActions report={r} role={role} completeLeave={completeLeave} completeReturn={completeReturn} size={touch ? 'lg' : 'sm'} />
            </div>
          )}
          {r.status === 'pending' && role === 'staff' && <HandlingActions report={r} role={role} size="lg" />}
        </div>
      </section>

      {others.length > 0 && (
        <section className="vb-panel">
          <div className="vb-panel__head"><h3 className="vb-panel__title">Biên bản khác của lô {lot.lotCode}</h3></div>
          <DataTable columns={otherColumns} rows={others} density={touch ? 'default' : 'compact'} onRowClick={o => nav(`${basePath}/${o.id}`)}
            caption={`Biên bản khác của lô ${lot.lotCode}`} />
        </section>
      )}
    </div>
  );
}
