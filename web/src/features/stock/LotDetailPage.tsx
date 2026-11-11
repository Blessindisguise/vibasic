import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertBanner, Button, DataTable, EmptyState, SearchField, type DataTableColumn } from '../../design';
import { ApiError } from '../../app/api';
import { fmt, fmtDate, fmtShort } from '../../app/format';
import { Segmented } from '../../app/Segmented';
import { Code, Fact, ListError, Loading } from '../../app/ui';
import { ApprovalBadge, ItemStatusBadge, ITEM_STATUS_LABEL, LotStatusBadge, SOURCE_LABEL } from '../../app/statusBadges';
import { useLot, type LotItem } from '../../app/stock';
import { matches } from '../../app/text';
import { suggestFrom } from '../../app/suggest';
import type { ItemStatus } from '../../app/issuing';
import { reportHref, type ReportRow } from '../../app/receiving';
import { ReportDecision } from '../abnormal/ReportDecision';

/**
 * UC_16 step 5: the items (identity codes) of a lot and their status, plus the lot's abnormal reports.
 * Items can be looked up by serial, sales order, customer, goods issue or abnormal report.
 */
export function LotDetailPage({ id, role, basePath }: { id: number; role: 'manager' | 'staff'; basePath: string }) {
  const lot = useLot(id);
  const nav = useNavigate();
  const [params] = useSearchParams();
  const highlight = params.get('sp');
  const [status, setStatus] = useState<ItemStatus | ''>('');
  const [search, setSearch] = useState('');
  const touch = role === 'staff';
  const items = useMemo(() => (lot.data?.items ?? [])
    .filter(i => (!status || i.status === status) && matches(search, ...itemFields(i))), [lot.data, status, search]);
  // One suggestion per order (or report) the lot's items belong to; picking it filters the grid to those items.
  const orders = useMemo(() => groupBy(lot.data?.items ?? []), [lot.data]);

  if (lot.isPending) return <Loading />;
  if (lot.error instanceof ApiError && lot.error.status === 404) {
    return <div className="vb-panel"><EmptyState icon="search" title="Không tìm thấy lô" action={<Button variant="secondary" onClick={() => nav(basePath)}>Về tra cứu lô</Button>} /></div>;
  }
  if (lot.isError) return <ListError onRetry={() => lot.refetch()} />;
  const { lot: l, reports } = lot.data;
  const counts = lot.data.items.reduce<Partial<Record<ItemStatus, number>>>((m, i) => ({ ...m, [i.status]: (m[i.status] ?? 0) + 1 }), {});
  const found = highlight ? lot.data.items.find(i => i.serial === highlight) : undefined;
  const suggestions = suggestFrom(orders, search, g => [g.key, g.hint], g => ({
    key: g.key, label: g.key, hint: g.hint, meta: <span>{fmt(g.items.length)} {l.unit}</span>,
  }));
  const issueBase = role === 'manager' ? '/ql/xuat-kho' : '/kho/xuat-kho';
  const shown = search ? summarize(items) : null;

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
          {l.defective > 0 && <Fact label="Hàng lỗi đã tách" value={<span style={{ color: 'var(--red-700)' }}>{fmt(l.defective)} {l.unit}</span>} />}
        </div>
        {l.status !== 'normal' && (
          <div style={{ padding: '0 16px 16px' }}>
            <AlertBanner tone={l.status === 'locked' ? 'danger' : 'warning'} title={l.status === 'locked' ? 'Lô đã khóa' : 'Lô đang tạm cách ly'} />
          </div>
        )}
      </section>

      {found && (
        <AlertBanner tone="info" title={`Sản phẩm ${found.serial}`}>
          Trạng thái: {ITEM_STATUS_LABEL[found.status]}
          {found.orderCode && ` · đơn ${found.orderCode}${found.customerName ? ` (${found.customerName})` : ''}`}
          {found.issueCode && ` · phiếu xuất ${found.issueCode}`}
          {found.reportCode && <> · biên bản <Link to={reportHref(role, found.reportId!)}>{found.reportCode}</Link></>}.
        </AlertBanner>
      )}

      <section className="vb-panel">
        <div className="vb-panel__head" style={{ flexWrap: 'wrap', gap: 8 }}>
          <h3 className="vb-panel__title">Sản phẩm trong lô</h3>
          <SearchField
            value={search} onChange={setSearch} size={touch ? 'lg' : 'md'} style={{ width: touch ? 340 : 300 }} aria-label="Tìm sản phẩm theo đơn hàng"
            placeholder="Tìm theo đơn hàng, khách, phiếu xuất, mã SP"
            suggestions={suggestions} onPickSuggestion={g => setSearch(g.label)}
          />
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
        {shown && (
          <div className="vb-muted" style={{ padding: '8px 16px 0' }}>
            {items.length === 0 ? `Không có sản phẩm nào khớp “${search}”.` : <>Khớp <b>{fmt(items.length)}</b> {l.unit}: {shown}</>}
          </div>
        )}
        <div className="vb-panel__body" style={{ maxHeight: 420, overflow: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 8 }}>
            {items.map(i => (
              <div key={i.id} className="vb-row" style={{
                justifyContent: 'space-between', flexWrap: 'nowrap', padding: '6px 10px', border: '1px solid', borderRadius: 'var(--radius-md)',
                borderColor: i.serial === highlight ? 'var(--green-500)' : 'var(--border-default)', background: i.serial === highlight ? 'var(--green-50)' : '#fff',
              }}>
                <span style={{ minWidth: 0 }}>
                  <Code>{i.serial}</Code>
                  {i.issueCode && (
                    <span className="vb-muted" style={{ display: 'block', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      title={[i.orderCode && `Đơn ${i.orderCode}`, i.customerName, i.issueCode].filter(Boolean).join(' · ')}>
                      {i.orderCode ? <>{i.orderCode} · </> : null}<Link to={`${issueBase}/${i.issueId}`} onClick={e => e.stopPropagation()}>{i.issueCode}</Link>
                      {i.customerName && <> · {i.customerName}</>}
                    </span>
                  )}
                  {i.status === 'defective' && i.reportCode && (
                    <span style={{ display: 'block', fontSize: 12 }}>Biên bản <Link to={reportHref(role, i.reportId!)}>{i.reportCode}</Link></span>
                  )}
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

const itemFields = (i: LotItem) => [i.serial, i.orderCode, i.customerName, i.issueCode, i.reportCode];

interface ItemGroup { key: string; hint: string; items: LotItem[] }
/** The lot's items by sales order (reserved or issued with it) and by abnormal report (set aside as defective). */
function groupBy(items: LotItem[]): ItemGroup[] {
  const map = new Map<string, ItemGroup>();
  for (const i of items) {
    const key = i.orderCode ?? (i.status === 'defective' ? i.reportCode : undefined);
    if (!key) continue;
    const hint = i.orderCode
      ? [i.customerName, i.issueCode].filter(Boolean).join(' · ') || 'Đơn hàng'
      : 'Biên bản bất thường · sản phẩm lỗi';
    const g = map.get(key) ?? { key, hint, items: [] };
    g.items.push(i);
    map.set(key, g);
  }
  return [...map.values()];
}

/** "3 đã xuất · 2 đã giữ chỗ" for the items shown. */
function summarize(items: LotItem[]): string {
  const counts = items.reduce<Partial<Record<ItemStatus, number>>>((m, i) => ({ ...m, [i.status]: (m[i.status] ?? 0) + 1 }), {});
  return (Object.keys(counts) as ItemStatus[]).map(st => `${fmt(counts[st]!)} ${ITEM_STATUS_LABEL[st].toLowerCase()}`).join(' · ');
}

