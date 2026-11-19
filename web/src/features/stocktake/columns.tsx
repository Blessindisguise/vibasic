import type { DataTableColumn } from '../../design';
import { fmt, fmtShort } from '../../app/format';
import { Code } from '../../app/ui';
import { ApprovalBadge, PLAN_STATUS_LABEL } from '../../app/statusBadges';
import { PLAN_TYPE_LABEL, type PlanRow, type StocktakeRow } from '../../app/stock';

/** Stocktakes (phiếu kiểm kê) as listed on the manager page and on a plan's page. */
export const STOCKTAKE_COLUMNS: DataTableColumn<StocktakeRow>[] = [
  { key: 'code', header: 'Phiếu kiểm kê', width: 130, render: s => <Code>{s.code}</Code> },
  { key: 'stocktakeDate', header: 'Ngày kiểm', width: 120, render: s => fmtShort(s.stocktakeDate) },
  { key: 'plan', header: 'Kế hoạch', width: 130, render: s => <Code>{s.planCode}</Code> },
  { key: 'creatorName', header: 'Người kiểm', width: 150 },
  { key: 'lots', header: 'Lô', numeric: true, width: 60, render: s => fmt(s.lotCount) },
  {
    key: 'diff', header: 'Chênh lệch',
    render: s => s.diffLots === 0 ? <span className="vb-muted">Khớp hệ thống</span> : <span>{s.diffLots} lô · thiếu {fmt(s.shortage)} · thừa {fmt(s.surplus)}</span>,
  },
  { key: 'approverName', header: 'Người duyệt', width: 140, render: s => s.approverName ?? <span className="vb-muted">—</span> },
  { key: 'status', header: 'Trạng thái', width: 120, render: s => <ApprovalBadge status={s.status} /> },
];

/** What a search box matches on a plan / a stocktake (manager and staff lists). */
export const planFields = (p: PlanRow) => [p.code, p.creatorName, p.lastStocktakeCode, PLAN_TYPE_LABEL[p.planType],
  p.scopeType === 'warehouse' ? 'Toàn bộ kho' : 'Một số lô', PLAN_STATUS_LABEL[p.status]];
export const stocktakeFields = (s: StocktakeRow) => [s.code, s.planCode, s.creatorName, s.approverName];
