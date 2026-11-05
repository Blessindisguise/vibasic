import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertBanner, Button, DataTable, EmptyState, type DataTableColumn } from '../../design';
import { ApiError } from '../../app/api';
import { fmt, fmtDate, fmtShort } from '../../app/format';
import { Segmented } from '../../app/Segmented';
import { Code, ListError, Loading } from '../../app/ui';
import { ApprovalBadge, ItemStatusBadge, ITEM_STATUS_LABEL, LotStatusBadge, SOURCE_LABEL } from '../../app/statusBadges';
import { useLot } from '../../app/stock';
import type { ItemStatus } from '../../app/issuing';
import { reportHref, type ReportRow } from '../../app/receiving';
import { ReportDecision } from '../abnormal/ReportDecision';

/** UC_16 step 5: the items (identity codes) of a lot and their status, plus the lot's abnormal reports. */
export function LotDetailPage({ id, role, basePath }: { id: number; role: 'manager' | 'staff'; basePath: string }) {
  const lot = useLot(id);
  const nav = useNavigate();
  const [params] = useSearchParams();
  const highlight = params.get('sp');
  const [status, setStatus] = useState<ItemStatus | ''>('');
  const touch = role === 'staff';
  const items = useMemo(() => (lot.data?.items ?? []).filter(i => !status || i.status === status), [lot.data, status]);

  if (lot.isPending) return <Loading />;
  if (lot.error instanceof ApiError && lot.error.status === 404) {
    return <div className="vb-panel"><EmptyState icon="search" title="Không tìm thấy lô" action={<Button variant="secondary" onClick={() => nav(basePath)}>Về tra cứu lô</Button>} /></div>;
  }
  if (lot.isError) return <ListError onRetry={() => lot.refetch()} />;
  const { lot: l, reports } = lot.data;
  const counts = lot.data.items.reduce<Partial<Record<ItemStatus, number>>>((m, i) => ({ ...m, [i.status]: (m[i.status] ?? 0) + 1 }), {});
  const found = highlight ? lot.data.items.find(i => i.serial === highlight) : undefined;

  const reportColumns: DataTableColumn<ReportRow>[] = [
    { key: 'code', header: 'Biên bản', width: 130, render: r => <Code>{r.code}</Code> },
    { key: 'createdAt', header: 'Lập lúc', width: 110, render: r => fmtShort(r.createdAt) },
    { key: 'source', header: 'Phát hiện khi', width: 110, render: r => SOURCE_LABEL[r.sourceType] },
    { key: 'description', header: 'Mô tả lỗi', render: r => <span style={{ whiteSpace: 'normal' }}>{r.description}</span> },
    { key: 'quantity', header: 'SL lỗi', numeric: true, width: 80, render: r => fmt(r.quantity) },
    { key: 'status', header: 'Trạng thái', width: 120, render: r => <ApprovalBadge status={r.status} /> },
    ...(role === 'manager' ? [{ key: 'actions', header: '', width: 220, align: 'right' as const, render: (r: ReportRow) => <ReportDecision report={r} /> }] : []),
  ];

  return (
    <div className="vb-stack">
      <div className="vb-row"><Button variant="ghost" size={touch ? 'lg' : 'md'} icon="chevron-left" onClick={() => nav(basePath)}>Tra cứu lô</Button></div>

      <section className="vb-panel">
        <div className="vb-panel__head" style={{ flexWrap: 'wrap', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <div className="vb-row" style={{ gap: 10 }}>
              <h2 className="vb-panel__title" style={{ fontSize: touch ? 20 : 18, letterSpacing: 'var(--tracking-code)' }}>{l.lotCode}</h2>
              <LotStatusBadge status={l.status} size={touch ? 'lg' : 'md'} />
            </div>
            <div className="vb-muted" style={{ marginTop: 2, fontSize: touch ? 14 : undefined }}>
              <Code>{l.sku}</Code> {l.productName} · {l.categoryName}
            </div>
          </div>
        </div>
        <div className="vb-panel__body" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16 }}>
          <Fact label="Ngày nhập" value={fmtDate(l.receivedDate)} />
          <Fact label="Phiếu nhập" value={<Code>{l.receiptCode}</Code>} />
          <Fact label="Nhà cung cấp" value={l.supplierName} />
          <Fact label="Số lượng nhập" value={`${fmt(l.quantity)} ${l.unit}`} />
          <Fact label="Tồn hiện tại" value={<b>{fmt(l.quantityOnHand)} {l.unit}</b>} />
          <Fact label="Đã giữ chỗ cho phiếu xuất" value={`${fmt(l.reserved)} ${l.unit}`} />
        </div>
        {l.status !== 'normal' && (
          <div style={{ padding: '0 16px 16px' }}>
            <AlertBanner tone={l.status === 'locked' ? 'danger' : 'warning'}>
              {l.status === 'locked' ? 'Lô đã khóa theo biên bản bất thường; không được xuất.' : 'Lô đang tạm cách ly chờ quản lý xử lý biên bản; không được xuất.'}
            </AlertBanner>
          </div>
        )}
      </section>

      {found && (
        <AlertBanner tone="info" title={`Sản phẩm ${found.serial}`}>
          Trạng thái: {ITEM_STATUS_LABEL[found.status]}{found.issueCode && ` · phiếu xuất ${found.issueCode}`}.
        </AlertBanner>
      )}

      <section className="vb-panel">
        <div className="vb-panel__head" style={{ flexWrap: 'wrap', gap: 8 }}>
          <h3 className="vb-panel__title">Sản phẩm trong lô</h3>
          <div style={{ marginLeft: 'auto' }}>
            <Segmented
              label="Trạng thái sản phẩm" value={status} onChange={setStatus} size={touch ? 'lg' : 'md'}
              options={[
                { value: '', label: 'Tất cả', count: lot.data.items.length },
                ...(Object.keys(counts) as ItemStatus[]).map(s => ({ value: s, label: ITEM_STATUS_LABEL[s], count: counts[s] })),
              ]}
            />
          </div>
        </div>
        <div className="vb-panel__body" style={{ maxHeight: 420, overflow: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 8 }}>
            {items.map(i => (
              <div key={i.id} className="vb-row" style={{
                justifyContent: 'space-between', flexWrap: 'nowrap', padding: '6px 10px', border: '1px solid', borderRadius: 'var(--radius-md)',
                borderColor: i.serial === highlight ? 'var(--green-500)' : 'var(--border-default)', background: i.serial === highlight ? 'var(--green-50)' : '#fff',
              }}>
                <span style={{ minWidth: 0 }}>
                  <Code>{i.serial}</Code>
                  {i.issueCode && <span className="vb-muted" style={{ display: 'block', fontSize: 12 }}>{i.issueCode}</span>}
                </span>
                <ItemStatusBadge status={i.status} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {reports.length > 0 && (
        <section className="vb-panel">
          <div className="vb-panel__head"><h3 className="vb-panel__title">Biên bản bất thường của lô</h3></div>
          <DataTable columns={reportColumns} rows={reports} density={touch ? 'default' : 'compact'} onRowClick={r => nav(reportHref(role, r.id))} caption="Biên bản bất thường của lô" />
        </section>
      )}
    </div>
  );
}

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="vb-muted">{label}</div>
      <div style={{ marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
    </div>
  );
}
