import type { ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { fmt, fmtDate, fmtDocDate, fmtTime } from '../../app/format';
import { ListError, Loading } from '../../app/ui';
import { useAuth } from '../../app/auth';
import { useCategories, useProducts } from '../../app/catalog';
import { useInventoryReport, useMovementReport, type InventoryRow, type MovementRow } from '../../app/reports';
import { DocFoot, DocSheet, DocSigns, DocTop, PrintToolbar } from './doc';
import { WAREHOUSE } from '../../app/warehouse';

/** Rows grouped by category, keeping the order the report returned them in. */
function byCategory<T extends { categoryName: string }>(rows: T[]): [string, T[]][] {
  const groups = new Map<string, T[]>();
  for (const r of rows) groups.set(r.categoryName, [...(groups.get(r.categoryName) ?? []), r]);
  return [...groups];
}
const total = <T,>(rows: T[], f: (r: T) => number) => rows.reduce((s, r) => s + f(r), 0);
/** Zero prints as "-", the usual way on paper reports, so the figures that matter stand out. */
const num = (n: number) => (n === 0 ? '-' : fmt(n));
const signed = (n: number) => (n === 0 ? '-' : `${n > 0 ? '+' : '−'}${fmt(Math.abs(n))}`);

/** "Nhóm hàng: Thớt gỗ · Mặt hàng: THT-01", or "Tất cả mặt hàng". */
function useScope(categoryId: string, productId: string) {
  const categories = useCategories();
  const products = useProducts();
  const parts = [
    categoryId && `Nhóm hàng: ${categories.data?.find(c => c.id === Number(categoryId))?.name ?? '…'}`,
    productId && `Mặt hàng: ${products.data?.find(p => p.id === Number(productId))?.sku ?? '…'}`,
  ].filter(Boolean);
  return parts.length ? parts.join(' · ') : 'Tất cả mặt hàng';
}

function Frame({ title, action, children }: { title: string; action: string; children: ReactNode }) {
  return (
    <div className="vb-print">
      <PrintToolbar title={title} hint="Khổ A4 ngang." action={action} wide />
      <DocSheet wide>
        <DocTop />
        {children}
      </DocSheet>
    </div>
  );
}

function Closing({ code }: { code: string }) {
  const { user } = useAuth();
  return <>
    <DocSigns place={`${WAREHOUSE.city}, ${fmtDocDate()}`} people={[{ role: 'Người lập biểu', name: user?.fullName }, { role: 'Quản lý kho' }]} />
    <DocFoot code={code} />
  </>;
}

const pending = (q: { isPending: boolean; isError: boolean; refetch: () => unknown }) =>
  q.isPending ? <div style={{ padding: 24 }}><Loading /></div>
    : q.isError ? <div style={{ padding: 24 }}><ListError onRetry={() => q.refetch()} /></div> : null;

/** UC_19, báo cáo tồn kho on paper: stock by product at the time of printing, grouped by category. */
export function InventoryPrintPage() {
  const [params] = useSearchParams();
  const categoryId = params.get('nhom') ?? '';
  const productId = params.get('hang') ?? '';
  const report = useInventoryReport({ categoryId, productId });
  const scope = useScope(categoryId, productId);
  const busy = pending(report);
  if (busy || !report.data) return busy;
  const rows = report.data;
  const now = new Date().toISOString();
  const below = rows.filter(r => r.belowRop);
  const sums = (rs: InventoryRow[]) => ({
    lots: total(rs, r => r.lots), onHand: total(rs, r => r.onHand), available: total(rs, r => r.available), reserved: total(rs, r => r.reserved),
    quarantined: total(rs, r => r.quarantined), locked: total(rs, r => r.locked), defective: total(rs, r => r.defective),
  });
  const all = sums(rows);
  const figures = (s: ReturnType<typeof sums>) => <>
    <td className="n">{num(s.lots)}</td><td className="n">{num(s.onHand)}</td><td className="n">{num(s.available)}</td><td className="n">{num(s.reserved)}</td>
    <td className="n">{num(s.quarantined)}</td><td className="n">{num(s.locked)}</td><td className="n">{num(s.defective)}</td>
  </>;
  let no = 0;

  return (
    <Frame title="In báo cáo tồn kho" action="In báo cáo">
      <h1 className="vb-doc__title">BÁO CÁO TỒN KHO</h1>
      <div className="vb-doc__meta">Tại thời điểm {fmtTime(now)} {fmtDocDate(now)}</div>
      <div className="vb-doc__sub">Phạm vi: {scope}</div>

      <h2 className="vb-doc__h">I. Tổng hợp</h2>
      <table className="vb-doc__table">
        <colgroup><col style={{ width: '17%' }} /><col style={{ width: '33%' }} /><col style={{ width: '17%' }} /><col /></colgroup>
        <tbody>
          <tr><th>Số mặt hàng</th><td>{fmt(rows.length)} mặt hàng · {fmt(all.lots)} lô đang có hàng</td><th>Tồn thực tế</th><td><b>{fmt(all.onHand)}</b> sản phẩm</td></tr>
          <tr><th>Tồn khả dụng</th><td><b>{fmt(all.available)}</b> sản phẩm, trong đó giữ chỗ {fmt(all.reserved)}</td><th>Không được xuất</th><td>Tạm cách ly {fmt(all.quarantined)} · Đã khóa {fmt(all.locked)}</td></tr>
          <tr><th>Hàng lỗi đã tách</th><td>{fmt(all.defective)} sản phẩm (không tính vào tồn)</td><th>Dưới điểm đặt hàng</th><td>{below.length ? below.map(r => r.sku).join(', ') : 'Không có'}</td></tr>
        </tbody>
      </table>

      <h2 className="vb-doc__h">II. Chi tiết theo mặt hàng</h2>
      {rows.length === 0 ? <p className="vb-doc__text"><i>Không có mặt hàng phù hợp với phạm vi đã chọn.</i></p> : (
        <table className="vb-doc__table vb-doc__table--grid vb-doc__table--data">
          <colgroup>
            <col style={{ width: '4%' }} /><col style={{ width: '8%' }} /><col /><col style={{ width: '5%' }} /><col style={{ width: '5%' }} />
            <col style={{ width: '7.5%' }} /><col style={{ width: '7.5%' }} /><col style={{ width: '7%' }} /><col style={{ width: '7%' }} />
            <col style={{ width: '6.5%' }} /><col style={{ width: '7%' }} /><col style={{ width: '6.5%' }} /><col style={{ width: '5.5%' }} /><col style={{ width: '8%' }} />
          </colgroup>
          <thead>
            <tr>
              <th rowSpan={2}>STT</th><th rowSpan={2}>Mã SKU</th><th rowSpan={2}>Tên hàng</th><th rowSpan={2}>ĐVT</th><th rowSpan={2}>Số lô</th>
              <th rowSpan={2}>Tồn thực tế</th><th colSpan={2}>Khả dụng</th><th colSpan={2}>Không được xuất</th>
              <th rowSpan={2}>Hàng lỗi đã tách</th><th rowSpan={2}>Tồn ròng</th><th rowSpan={2}>ROP</th><th rowSpan={2}>Ghi chú</th>
            </tr>
            <tr><th>Tổng</th><th>Giữ chỗ</th><th>Cách ly</th><th>Đã khóa</th></tr>
          </thead>
          {byCategory(rows).map(([name, rs]) => (
            <tbody key={name} className="vb-doc__grp">
              <tr className="vb-doc__group"><td colSpan={14}>Nhóm hàng: {name} ({rs.length} mặt hàng)</td></tr>
              {rs.map(r => (
                <tr key={r.productId}>
                  <td style={{ textAlign: 'center' }}>{++no}</td><td>{r.sku}</td><td>{r.productName}</td><td>{r.unit}</td>
                  {figures(sums([r]))}
                  <td className="n">{fmt(r.net)}</td>
                  <td className="n">{r.rop == null ? '-' : fmt(r.rop, 1)}</td>
                  <td>{r.belowRop ? 'Dưới ROP' : ''}</td>
                </tr>
              ))}
              <tr className="vb-doc__subtotal"><td colSpan={4} style={{ textAlign: 'right' }}>Cộng nhóm {name}</td>{figures(sums(rs))}<td colSpan={3} /></tr>
            </tbody>
          ))}
          <tbody>
            <tr className="vb-doc__total"><td colSpan={4} style={{ textAlign: 'center' }}>TỔNG CỘNG</td>{figures(all)}<td colSpan={3} /></tr>
          </tbody>
        </table>
      )}

      <p className="vb-doc__note">
        Ghi chú: Tồn thực tế = khả dụng + tạm cách ly + đã khóa. Khả dụng gồm cả số đang giữ chỗ cho phiếu xuất chưa giao.
        Hàng lỗi là sản phẩm đã tách ra theo biên bản bất thường (chờ trả nhà cung cấp hoặc hủy), không tính vào tồn thực tế.
        Tồn ròng = khả dụng − số lượng các đơn đã tiếp nhận chưa xuất. ROP là điểm đặt hàng lại; "Dưới ROP" khi tồn ròng không vượt quá ROP
        (cùng điều kiện với cảnh báo tồn kho thấp).
      </p>

      <Closing code="Báo cáo tồn kho" />
    </Frame>
  );
}

/** UC_19, báo cáo biến động nhập xuất on paper: opening stock, receipts, issues, adjustments and closing stock for the period. */
export function MovementPrintPage() {
  const [params] = useSearchParams();
  const from = params.get('tu') ?? '';
  const to = params.get('den') ?? '';
  const categoryId = params.get('nhom') ?? '';
  const productId = params.get('hang') ?? '';
  const showAll = params.get('tatca') === '1';
  const report = useMovementReport({ from, to, categoryId, productId });
  const scope = useScope(categoryId, productId);
  const busy = pending(report);
  if (busy || !report.data) return busy;
  const m = report.data;
  const rows = showAll ? m.rows : m.rows.filter(r => r.in || r.out || r.adjusted || r.opening || r.closing);
  const moved = rows.filter(r => r.in || r.out || r.adjusted);
  const sums = (rs: MovementRow[]) => ({
    opening: total(rs, r => r.opening), in: total(rs, r => r.in), out: total(rs, r => r.out), adjusted: total(rs, r => r.adjusted), closing: total(rs, r => r.closing),
  });
  const all = sums(rows);
  const figures = (s: ReturnType<typeof sums>) => <>
    <td className="n">{num(s.opening)}</td><td className="n">{num(s.in)}</td><td className="n">{num(s.out)}</td><td className="n">{signed(s.adjusted)}</td><td className="n"><b>{num(s.closing)}</b></td>
  </>;
  const top = (k: 'in' | 'out') => [...rows].filter(r => r[k] > 0).sort((a, b) => b[k] - a[k]).slice(0, 3).map(r => `${r.sku} (${fmt(r[k])})`).join(', ') || 'Không có';
  let no = 0;

  return (
    <Frame title="In báo cáo biến động nhập xuất" action="In báo cáo">
      <h1 className="vb-doc__title">BÁO CÁO BIẾN ĐỘNG NHẬP XUẤT</h1>
      <div className="vb-doc__meta">Từ ngày {fmtDate(m.from)} đến ngày {fmtDate(m.to)}</div>
      <div className="vb-doc__sub">Phạm vi: {scope}{showAll ? '' : ' (bỏ qua mặt hàng không có tồn và không phát sinh)'}</div>

      <h2 className="vb-doc__h">I. Tổng hợp trong kỳ</h2>
      <table className="vb-doc__table">
        <colgroup><col style={{ width: '17%' }} /><col style={{ width: '33%' }} /><col style={{ width: '17%' }} /><col /></colgroup>
        <tbody>
          <tr><th>Tồn đầu kỳ</th><td><b>{fmt(all.opening)}</b> sản phẩm</td><th>Tồn cuối kỳ</th><td><b>{fmt(all.closing)}</b> sản phẩm</td></tr>
          <tr><th>Nhập trong kỳ</th><td>{fmt(all.in)} sản phẩm</td><th>Xuất trong kỳ</th><td>{fmt(all.out)} sản phẩm</td></tr>
          <tr><th>Điều chỉnh kiểm kê</th><td>{signed(all.adjusted)} sản phẩm</td><th>Mặt hàng phát sinh</th><td>{fmt(moved.length)} / {fmt(rows.length)} mặt hàng</td></tr>
          <tr><th>Nhập nhiều nhất</th><td>{top('in')}</td><th>Xuất nhiều nhất</th><td>{top('out')}</td></tr>
        </tbody>
      </table>

      <h2 className="vb-doc__h">II. Chi tiết theo mặt hàng</h2>
      {rows.length === 0 ? <p className="vb-doc__text"><i>Không có mặt hàng nào có tồn hoặc phát sinh trong kỳ.</i></p> : (
        <table className="vb-doc__table vb-doc__table--grid vb-doc__table--data">
          <colgroup>
            <col style={{ width: '4%' }} /><col style={{ width: '9%' }} /><col /><col style={{ width: '5%' }} />
            <col style={{ width: '9%' }} /><col style={{ width: '9%' }} /><col style={{ width: '9%' }} /><col style={{ width: '9%' }} /><col style={{ width: '9%' }} />
            <col style={{ width: '7%' }} /><col style={{ width: '7%' }} />
          </colgroup>
          <thead>
            <tr>
              <th rowSpan={2}>STT</th><th rowSpan={2}>Mã SKU</th><th rowSpan={2}>Tên hàng</th><th rowSpan={2}>ĐVT</th>
              <th rowSpan={2}>Tồn đầu kỳ</th><th colSpan={3}>Phát sinh trong kỳ</th><th rowSpan={2}>Tồn cuối kỳ</th><th colSpan={2}>Số chứng từ</th>
            </tr>
            <tr><th>Nhập</th><th>Xuất</th><th>Điều chỉnh</th><th>Phiếu nhập</th><th>Phiếu xuất</th></tr>
          </thead>
          {byCategory(rows).map(([name, rs]) => (
            <tbody key={name} className="vb-doc__grp">
              <tr className="vb-doc__group"><td colSpan={11}>Nhóm hàng: {name} ({rs.length} mặt hàng)</td></tr>
              {rs.map(r => (
                <tr key={r.productId}>
                  <td style={{ textAlign: 'center' }}>{++no}</td><td>{r.sku}</td><td>{r.productName}</td><td>{r.unit}</td>
                  {figures(sums([r]))}
                  <td className="n">{num(r.receipts)}</td><td className="n">{num(r.issues)}</td>
                </tr>
              ))}
              <tr className="vb-doc__subtotal"><td colSpan={4} style={{ textAlign: 'right' }}>Cộng nhóm {name}</td>{figures(sums(rs))}<td colSpan={2} /></tr>
            </tbody>
          ))}
          <tbody>
            <tr className="vb-doc__total"><td colSpan={4} style={{ textAlign: 'center' }}>TỔNG CỘNG</td>{figures(all)}<td colSpan={2} /></tr>
          </tbody>
        </table>
      )}

      <p className="vb-doc__note">
        Ghi chú: Tồn cuối kỳ = tồn đầu kỳ + nhập − xuất ± điều chỉnh. Nhập tính theo ngày duyệt phiếu nhập, xuất theo ngày giao hàng,
        điều chỉnh theo ngày duyệt phiếu kiểm kê. Số chứng từ là số phiếu có mặt hàng đó; một phiếu có thể gồm nhiều mặt hàng nên không cộng dồn.
      </p>

      <Closing code={`Báo cáo nhập xuất ${fmtDate(m.from)} – ${fmtDate(m.to)}`} />
    </Frame>
  );
}
