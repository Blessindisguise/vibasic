import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { EmptyState, Icon, SearchField, type Suggestion } from '../../../design';
import { ANY_DATE, fmt, fmtDateTime, inVnDateRange, type DateRange } from '../../../app/format';
import { Segmented } from '../../../app/Segmented';
import { Code, DateRangeFilter, ListError, Loading, NoneInRange } from '../../../app/ui';
import { matches } from '../../../app/text';
import { suggestFrom } from '../../../app/suggest';
import { useAuth } from '../../../app/auth';
import { useToast } from '../../../app/toast';
import { IssueStatusBadge, OrderStatusBadge } from '../../../app/statusBadges';
import { pickHoldExpired, useIssues, useOrders, usePicker, type IssueRow, type OrderRow } from '../../../app/issuing';
import { IssueListPage } from '../../issuing/IssueListPage';

type Tab = 'don' | 'phieu' | 'lay-hang';

// Orders are found by code, customer or a product they contain; issues to pick by code, order or customer.
const orderFields = (o: OrderRow) => [o.externalCode, o.customerName, o.customerPhone, o.shippingAddress, o.lastIssueCode, ...o.lines.flatMap(l => [l.sku, l.productName])];
const pickFields = (i: IssueRow) => [i.code, i.orderCode, i.customerName, i.customerPhone, i.shippingAddress, i.pickerName];
const NOT_FOUND = <div className="vb-panel"><EmptyState size="lg" icon="search" title="Không tìm thấy" description="Thử mã đơn, tên khách hoặc mã hàng khác." /></div>;

/** Staff "Xuất kho": orders waiting to be issued (UC_07 step 1), issues to pick (UC_08), and all issues (UC_09). */
export function StaffIssueHome() {
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as Tab) || 'don';
  const orders = useOrders();
  const toPick = useIssues({ status: 'ready' });
  const waiting = (orders.data ?? []).filter(o => o.status === 'open' || o.status === 'onHold');
  const nav = useNavigate();
  const [search, setSearch] = useState('');
  const [range, setRange] = useState<DateRange>(ANY_DATE);
  const inRange = (iso?: string) => inVnDateRange(iso, range.from, range.to);
  const suggestions: Suggestion<unknown>[] = tab === 'don'
    ? suggestFrom(waiting, search, orderFields, o => ({ key: `/kho/xuat-kho/don/${o.id}`, label: o.externalCode, hint: `${o.customerName ?? 'Khách lẻ'} · ${o.lines.length} mặt hàng` }))
    : suggestFrom(toPick.data, search, pickFields, i => ({ key: `/kho/xuat-kho/${i.id}`, label: i.code, hint: `Đơn ${i.orderCode}${i.customerName ? ` · ${i.customerName}` : ''}` }));

  return (
    <div className="vb-stack">
      <div className="vb-row" style={{ gap: 12 }}>
        <Segmented<Tab>
          label="Xuất kho" size="lg" value={tab} onChange={t => { setParams({ tab: t }, { replace: true }); setSearch(''); setRange(ANY_DATE); }}
          options={[
            { value: 'don', label: 'Đơn chờ xuất', count: orders.data ? waiting.length : undefined },
            { value: 'lay-hang', label: 'Cần lấy hàng', count: toPick.data?.length },
            { value: 'phieu', label: 'Tất cả phiếu xuất' },
          ]}
        />
        {tab !== 'phieu' && (
          <SearchField
            size="lg" placeholder={tab === 'don' ? 'Mã đơn, khách hàng, mã hàng…' : 'Mã phiếu, đơn hàng, khách…'} value={search} onChange={setSearch}
            style={{ width: 320 }} aria-label={tab === 'don' ? 'Tìm đơn chờ xuất' : 'Tìm phiếu cần lấy hàng'}
            suggestions={suggestions} onPickSuggestion={s => nav(s.key)}
          />
        )}
      </div>
      {tab !== 'phieu' && <DateRangeFilter size="lg" label={tab === 'don' ? 'Ngày đặt hàng' : 'Ngày lập phiếu'} value={range} onChange={setRange} />}
      {tab === 'don' && (orders.isPending ? <Loading /> : orders.isError ? <ListError onRetry={() => orders.refetch()} />
        : <OrderCards orders={waiting.filter(o => matches(search, ...orderFields(o)) && inRange(o.orderDate))} filtered={!!search}
            outOfRange={!search && !!(range.from || range.to) && waiting.length > 0} onClearRange={() => setRange(ANY_DATE)} />)}
      {tab === 'lay-hang' && <PickQueue search={search} inRange={inRange} ranged={!!(range.from || range.to)} onClearRange={() => setRange(ANY_DATE)} />}
      {tab === 'phieu' && <IssueListPage role="staff" basePath="/kho/xuat-kho" />}
    </div>
  );
}

function OrderCards({ orders, filtered, outOfRange, onClearRange }: { orders: OrderRow[]; filtered: boolean; outOfRange: boolean; onClearRange: () => void }) {
  const nav = useNavigate();
  if (orders.length === 0 && filtered) return NOT_FOUND;
  if (orders.length === 0 && outOfRange) return <div className="vb-panel"><NoneInRange what="đơn chờ xuất" onClear={onClearRange} /></div>;
  if (orders.length === 0) {
    return <div className="vb-panel"><EmptyState size="lg" icon="clipboard-list" title="Không có đơn chờ xuất" /></div>;
  }
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
      {orders.map(o => (
        <button key={o.id} type="button" className="vb-panel vb-card-button" onClick={() => nav(`/kho/xuat-kho/don/${o.id}`)}>
          <div className="vb-row" style={{ justifyContent: 'space-between' }}>
            <Code>{o.externalCode}</Code>
            <OrderStatusBadge status={o.status} />
          </div>
          <div style={{ font: 'var(--type-touch-body)', fontWeight: 600 }}>{o.customerName ?? 'Khách lẻ'}</div>
          <Contact phone={o.customerPhone} address={o.shippingAddress} />
          <div className="vb-muted" style={{ fontSize: 14 }}>Đặt {fmtDateTime(o.orderDate)} · {o.lines.length} mặt hàng · {fmt(o.totalQuantity)} sản phẩm</div>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {o.lines.map(l => (
              <li key={l.productId} className="vb-row" style={{ justifyContent: 'space-between', flexWrap: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}><Code>{l.sku}</Code> {l.productName}</span>
                <span style={{ flex: 'none', color: l.free < l.quantity ? 'var(--red-700)' : undefined, fontWeight: l.free < l.quantity ? 600 : undefined }}>
                  {fmt(l.quantity)} {l.unit}{l.free < l.quantity && ` (còn ${fmt(l.free)})`}
                </span>
              </li>
            ))}
          </ul>
          <div className="vb-row" style={{ justifyContent: 'space-between', marginTop: 'auto' }}>
            {o.sufficient
              ? <span style={{ color: 'var(--green-700)', fontWeight: 600 }}><Icon name="circle-check" size={16} style={{ verticalAlign: -3 }} /> Đủ hàng</span>
              : <span style={{ color: 'var(--red-700)', fontWeight: 600 }}><Icon name="triangle-alert" size={16} style={{ verticalAlign: -3 }} /> Thiếu hàng</span>}
            {o.lastIssueCode && <span className="vb-muted">Lần trước: {o.lastIssueCode} {o.lastIssueStatus && <IssueStatusBadge status={o.lastIssueStatus} />}</span>}
          </div>
        </button>
      ))}
    </div>
  );
}

/** Phone and address on a card, one line each, cut short. */
function Contact({ phone, address }: { phone?: string; address?: string }) {
  if (!phone && !address) return null;
  const line = { minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } as const;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: 14 }}>
      {phone && <div style={line}><span className="vb-muted">ĐT </span><b style={{ fontVariantNumeric: 'tabular-nums' }}>{phone}</b></div>}
      {address && <div style={line} title={address}><span className="vb-muted">Giao tới </span>{address}</div>}
    </div>
  );
}

function PickQueue({ search, inRange, ranged, onClearRange }: { search: string; inRange: (iso?: string) => boolean; ranged: boolean; onClearRange: () => void }) {
  const issues = useIssues({ status: 'ready' });
  const picker = usePicker();
  const { user } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  if (issues.isPending) return <Loading />;
  if (issues.isError) return <ListError onRetry={() => issues.refetch()} />;
  // Mine first, then free ones, then those someone else is picking.
  const rank = (i: IssueRow) => (i.pickerId === user?.id ? 0 : !i.pickerId ? 1 : 2);
  const list = issues.data.filter(i => matches(search, ...pickFields(i)) && inRange(i.issueDate)).sort((a, b) => rank(a) - rank(b));
  if (list.length === 0 && search && issues.data.length > 0) return NOT_FOUND;
  if (list.length === 0 && ranged && issues.data.length > 0) return <div className="vb-panel"><NoneInRange what="phiếu cần lấy hàng" onClear={onClearRange} /></div>;
  const open = (i: IssueRow) => {
    // Held by me or by someone else (an idle holder is taken over from the issue page, after seeing who held it): just open.
    if (i.pickerId) { nav(`/kho/xuat-kho/${i.id}`); return; }
    picker.mutate({ id: i.id, action: 'claim' }, {
      onSettled: () => nav(`/kho/xuat-kho/${i.id}`),
      onError: e => toast({ tone: 'danger', title: 'Không nhận được phiếu', message: e.message }),
    });
  };
  if (list.length === 0) {
    return <div className="vb-panel"><EmptyState size="lg" icon="package-check" title="Chưa có phiếu cần lấy hàng" /></div>;
  }
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
      {list.map(i => (
        <button key={i.id} type="button" className="vb-panel vb-card-button" onClick={() => open(i)} disabled={picker.isPending}>
          <div className="vb-row" style={{ justifyContent: 'space-between' }}><Code>{i.code}</Code><IssueStatusBadge status={i.status} /></div>
          <div style={{ font: 'var(--type-touch-body)', fontWeight: 600 }}>{i.customerName ?? i.orderCode}</div>
          <Contact address={i.shippingAddress} />
          <div className="vb-muted" style={{ fontSize: 14 }}>Đơn {i.orderCode} · lập {fmtDateTime(i.issueDate)}</div>
          {i.pickerId && i.pickerId !== user?.id && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 600, color: pickHoldExpired(i) ? 'var(--text-secondary)' : 'var(--amber-700)' }}>
              <Icon name="user" size={16} />
              {pickHoldExpired(i) ? `${i.pickerName} đã giữ phiếu quá 3 ngày` : `Đang do ${i.pickerName} lấy hàng`}
            </div>
          )}
          <div style={{ height: 8, background: 'var(--grey-100)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ width: `${(i.picked / Math.max(1, i.totalQuantity)) * 100}%`, height: '100%', background: 'var(--green-500)' }} />
          </div>
          <div className="vb-row" style={{ justifyContent: 'space-between', fontVariantNumeric: 'tabular-nums' }}>
            <span>Đã quét {fmt(i.picked)}/{fmt(i.totalQuantity)}</span>
            {/* The whole card is the button; this only looks like one. */}
            {i.pickerId && i.pickerId !== user?.id
              ? <span className="vb-btn vb-btn--secondary vb-btn--lg" aria-hidden="true"><Icon name="eye" size={18} />{pickHoldExpired(i) ? 'Xem / nhận lại' : 'Xem'}</span>
              : <span className="vb-btn vb-btn--primary vb-btn--lg" aria-hidden="true">
                <Icon name="scan-barcode" size={18} />{i.pickerId === user?.id ? 'Tiếp tục lấy hàng' : i.picked > 0 ? 'Nhận phiếu, lấy tiếp' : 'Bắt đầu lấy hàng'}
              </span>}
          </div>
        </button>
      ))}
    </div>
  );
}
