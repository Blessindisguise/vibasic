import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api';

/** Inputs and outputs of one product's ROP/EOQ calculation (NFR "tính giải thích được"). */
export interface Basis {
  productId: number; sku: string; productName: string; unit: string; categoryId: number; categoryName: string;
  supplierId: number; supplierName: string; available: number; avgDailyDemand?: number; leadTimeDays: number; safetyStock: number;
  orderingCost: number; holdingCost: number; rop?: number; eoq?: number; calculatedAt?: string; daysLeft?: number;
}
export type StockState = 'insufficient' | 'alert' | 'watch' | 'ok';
export type Priority = 'urgent' | 'order';
/** received: goods arrived on an approved receipt (N1). */
export type ProposalStatus = 'pending' | 'approved' | 'rejected' | 'closed' | 'received';

export interface OverviewRow { basis: Basis; state: StockState; alertDate?: string }
export interface AlertRow { id: number; basis: Basis; currentQuantity: number; ropValue: number; alertDate: string; status: 'open' | 'closed'; closedAt?: string }
export interface ProposalRow {
  id: number; basis: Basis; proposedQuantity: number; originalQuantity: number; eoqValue: number; adjustReason?: string;
  proposalDate: string; status: ProposalStatus; priority: Priority; approverName?: string; approvedAt?: string; rejectReason?: string;
  receiptId?: number; receiptCode?: string;
}
export interface DecisionSummary { openAlerts: number; pendingProposals: number; insufficient: number; lastCalculatedAt?: string }

export const useOverview = () => useQuery({ queryKey: ['decision', 'overview'], queryFn: () => api<OverviewRow[]>('/replenishment/overview') });
export const useDecisionSummary = (enabled = true) =>
  useQuery({ queryKey: ['decision', 'summary'], enabled, refetchInterval: 60_000, queryFn: () => api<DecisionSummary>('/replenishment/summary') });
export const useAlerts = (status?: 'open' | 'closed') =>
  useQuery({ queryKey: ['decision', 'alerts', status ?? 'all'], queryFn: () => api<AlertRow[]>(`/alerts${status ? `?status=${status}` : ''}`) });
export const useProposals = (status?: ProposalStatus) =>
  useQuery({ queryKey: ['decision', 'proposals', status ?? 'all'], queryFn: () => api<ProposalRow[]>(`/proposals${status ? `?status=${status}` : ''}`) });

function useRefresh() {
  const qc = useQueryClient();
  return () => ['decision', 'products', 'notifications'].forEach(k => qc.invalidateQueries({ queryKey: [k] }));
}

export function useRecalculate() {
  const refresh = useRefresh();
  return useMutation({ mutationFn: () => api<DecisionSummary>('/replenishment/recalculate', { method: 'POST' }), onSuccess: refresh });
}
export function useApproveProposals() {
  const refresh = useRefresh();
  return useMutation({ mutationFn: (ids: number[]) => api<number>('/proposals/approve', { method: 'POST', json: { ids } }), onSuccess: refresh });
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
