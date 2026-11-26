import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api';

/** Q3: whether a product's demand can be used for ROP/EOQ. */
export type DemandState = 'normal' | 'insufficientData' | 'slowMoving';

/**
 * Inputs and outputs of one product's ROP/EOQ calculation (NFR "tính giải thích được"), rules Q1–Q12.
 * net = available − ordered (orders received, not issued); daysLeft = net ÷ d.
 */
export interface Basis {
  productId: number; sku: string; productName: string; unit: string; categoryId: number; categoryName: string;
  supplierId: number; supplierName: string; available: number; ordered: number; net: number;
  avgDailyDemand?: number; sigma?: number; leadTimeDays: number; safetyStock?: number;
  orderingCost: number; holdingCost: number; rop?: number; eoq?: number; calculatedAt?: string; daysLeft?: number;
  demandState: DemandState; priority?: Priority;
}
export type StockState = 'insufficient' | 'slowMoving' | 'alert' | 'watch' | 'ok';
/** Q12. Proposals are urgent or order; watch lines appear only on the report. */
export type Priority = 'urgent' | 'order' | 'watch';
export const PRIORITY_LABEL: Record<Priority, string> = { urgent: 'Khẩn cấp', order: 'Cần đặt', watch: 'Theo dõi' };
/** A proposal is only a suggestion: pending (Chờ xem xét) → reported (Đã lập báo cáo) or rejected (Không đề xuất); closed by the system. */
export type ProposalStatus = 'pending' | 'reported' | 'rejected' | 'closed';
export const PROPOSAL_STATUS_LABEL: Record<ProposalStatus, string> = {
  pending: 'Chờ xem xét', reported: 'Đã lập báo cáo', rejected: 'Không đề xuất', closed: 'Đã đóng',
};

export interface OverviewRow { basis: Basis; state: StockState; alertDate?: string }
export interface AlertRow { id: number; basis: Basis; currentQuantity: number; ropValue: number; alertDate: string; status: 'open' | 'closed'; closedAt?: string }
export interface ProposalRow {
  id: number; basis: Basis; proposedQuantity: number;
  /** System quantity: baseQuantity = ROP + EOQ − net (Q13), cut to 12 weeks of demand when above it (Q15). */
  originalQuantity: number; baseQuantity: number; eoqValue: number;
  /** The basis the proposal was made on: kept current while pending, frozen once decided. */
  availableQuantity: number; netQuantity: number; ropValue: number; avgDailyDemand?: number; daysLeft?: number;
  /** Q16: why the system cut the quantity to the cap. adjustReason is the manager's own change. */
  adjustBasis?: string; adjustReason?: string;
  proposalDate: string; status: ProposalStatus; priority: Priority;
  /** Who put it in a report or left it out, and when. */
  deciderName?: string; decidedAt?: string; rejectReason?: string;
  reportId?: number; reportCode?: string;
}
export interface DecisionSummary {
  openAlerts: number; pendingProposals: number; insufficient: number; slowMoving: number; lastCalculatedAt?: string;
}

/** Báo cáo đề xuất bổ sung hàng (Q17–Q19): the chosen proposals by supplier, plus "Theo dõi" products to order with them. */
export interface ReportRow { basis: Basis; priority: Priority; daysLeft?: number; proposal?: ProposalRow }
export interface ReportGroup {
  supplierId: number; supplierName: string; phone?: string; address?: string; rows: ReportRow[];
  urgent: number; order: number; watch: number; totalQuantity: number;
}
export interface ReportConstants {
  windowDays: number; z: number; watchDays: number; capDays: number; slowMovingDays: number;
}
export interface ReplenishmentReport {
  generatedAt: string; calculatedAt?: string; demandFrom?: string; demandTo?: string; constants: ReportConstants; groups: ReportGroup[];
}
/** A report the manager made (DX-yymm-nnnn); its content is kept as made. */
export interface ReportListRow { id: number; code: string; createdAt: string; creatorName: string; proposalCount: number; supplierCount: number; totalQuantity: number }
export interface SavedReport { header: ReportListRow; content: ReplenishmentReport }

export const useOverview = (enabled = true) =>
  useQuery({ queryKey: ['decision', 'overview'], enabled, queryFn: () => api<OverviewRow[]>('/replenishment/overview') });
export const useDecisionSummary = (enabled = true) =>
  useQuery({ queryKey: ['decision', 'summary'], enabled, refetchInterval: 60_000, queryFn: () => api<DecisionSummary>('/replenishment/summary') });
export const useAlerts = (status?: 'open' | 'closed') =>
  useQuery({ queryKey: ['decision', 'alerts', status ?? 'all'], queryFn: () => api<AlertRow[]>(`/alerts${status ? `?status=${status}` : ''}`) });
/** Every pending proposal as it would go into a report, with the "Theo dõi" lines (the Đề xuất screen). */
export const useReplenishmentReport = () =>
  useQuery({ queryKey: ['decision', 'report'], queryFn: () => api<ReplenishmentReport>('/replenishment/report') });
export const useReports = () =>
  useQuery({ queryKey: ['decision', 'reports'], queryFn: () => api<ReportListRow[]>('/replenishment-reports') });
export const useSavedReport = (id: number) =>
  useQuery({ queryKey: ['decision', 'reports', id], queryFn: () => api<SavedReport>(`/replenishment-reports/${id}`) });
export const useProposals = (status?: ProposalStatus) =>
  useQuery({ queryKey: ['decision', 'proposals', status ?? 'all'], queryFn: () => api<ProposalRow[]>(`/proposals${status ? `?status=${status}` : ''}`) });

function useRefresh() {
  const qc = useQueryClient();
  return () => ['decision', 'products', 'dashboard', 'reports'].forEach(k => qc.invalidateQueries({ queryKey: [k] }));
}

export function useRecalculate() {
  const refresh = useRefresh();
  return useMutation({ mutationFn: () => api<DecisionSummary>('/replenishment/recalculate', { method: 'POST' }), onSuccess: refresh });
}
/** Lập báo cáo from the ticked pending proposals; they become "Đã lập báo cáo". */
export function useCreateReport() {
  const refresh = useRefresh();
  return useMutation({ mutationFn: (ids: number[]) => api<ReportListRow>('/proposals/report', { method: 'POST', json: { ids } }), onSuccess: refresh });
}
export function useRejectProposal() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => api<ProposalRow>(`/proposals/${id}/reject`, { method: 'POST', json: { reason } }),
    onSuccess: refresh,
  });
}
export function useAdjustProposal() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: ({ id, quantity, reason }: { id: number; quantity: number | null; reason: string }) =>
      api<ProposalRow>(`/proposals/${id}`, { method: 'PUT', json: { quantity, reason } }),
    onSuccess: refresh,
  });
}
