import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api';
import type { ItemStatus } from './issuing';
import type { ApprovalStatus, LotStatus, ReportRow } from './receiving';

export interface LotRow {
  id: number; lotCode: string; productId: number; sku: string; productName: string; unit: string; categoryName: string;
  receivedDate: string; receiptId: number; receiptCode: string; supplierName: string;
  quantity: number; quantityOnHand: number; reserved: number; status: LotStatus;
}
export interface LotItem { id: number; serial: string; status: ItemStatus; issueId?: number; issueCode?: string }
export interface LotView { lot: LotRow; items: LotItem[]; reports: ReportRow[] }

export type PlanType = 'periodic' | 'adHoc';
export type PlanScope = 'warehouse' | 'selectedLots';
export type PlanStatus = 'waiting' | 'inProgress' | 'done';
export interface PlanRow {
  id: number; code: string; planType: PlanType; scopeType: PlanScope; plannedDate: string; creatorName: string;
  status: PlanStatus; note?: string; selectedLots: number;
  lastStocktakeId?: number; lastStocktakeCode?: string; lastStocktakeStatus?: ApprovalStatus; lastRejectReason?: string;
}
export interface SheetLot {
  receiptDetailId: number; lotCode: string; productId: number; sku: string; productName: string; unit: string;
  receivedDate: string; status: LotStatus; systemQuantity: number;
}
export interface PlanInput { planType: PlanType | ''; scopeType: PlanScope | ''; plannedDate: string; lotIds: number[]; note: string }

export interface StocktakeRow {
  id: number; code: string; planId: number; planCode: string; stocktakeDate: string; creatorName: string;
  approverName?: string; approvedAt?: string; status: ApprovalStatus; lotCount: number; diffLots: number;
  shortage: number; surplus: number; rejectReason?: string;
}
export interface StocktakeDetailRow {
  id: number; receiptDetailId: number; lotCode: string; sku: string; productName: string; unit: string; lotStatus: LotStatus;
  systemQuantity: number; actualQuantity: number; reason?: string;
}
export interface StocktakeView { header: StocktakeRow; details: StocktakeDetailRow[]; reports: ReportRow[] }

export const PLAN_TYPE_LABEL: Record<PlanType, string> = { periodic: 'Định kỳ', adHoc: 'Chỉ định' };
export const PLAN_SCOPE_LABEL: Record<PlanScope, string> = { warehouse: 'Toàn bộ kho', selectedLots: 'Một số lô' };

const qs = (f: object) => {
  const p = new URLSearchParams(Object.entries(f).filter(([, v]) => v !== undefined && v !== '').map(([k, v]) => [k, String(v)]));
  return p.toString() ? `?${p}` : '';
};

export const useLots = (f: { productId?: string; status?: string; includeEmpty?: boolean } = {}) =>
  useQuery({ queryKey: ['lots', f], queryFn: () => api<LotRow[]>(`/lots${qs(f)}`) });
export const useLot = (id: number) => useQuery({ queryKey: ['lot', id], queryFn: () => api<LotView>(`/lots/${id}`) });
export const findLot = (code: string) => api<{ lotId: number; serial?: string }>(`/lots/find${qs({ code })}`);

export const usePlans = () => useQuery({ queryKey: ['plans'], queryFn: () => api<PlanRow[]>('/stocktake-plans') });
export const usePlan = (id: number) => useQuery({ queryKey: ['plans', id], queryFn: () => api<PlanRow>(`/stocktake-plans/${id}`) });
export const useSheet = (id: number, enabled = true) =>
  useQuery({ queryKey: ['plans', id, 'sheet'], enabled, queryFn: () => api<SheetLot[]>(`/stocktake-plans/${id}/sheet`) });
export const useStocktakes = (status?: ApprovalStatus) =>
  useQuery({ queryKey: ['stocktakes', status ?? 'all'], queryFn: () => api<StocktakeRow[]>(`/stocktakes${qs({ status })}`) });
export const useStocktake = (id: number) => useQuery({ queryKey: ['stocktake', id], queryFn: () => api<StocktakeView>(`/stocktakes/${id}`) });

/** Stocktake changes touch plans, lots, stock, issues, approvals and notifications. */
function useRefresh() {
  const qc = useQueryClient();
  return () => ['plans', 'stocktakes', 'stocktake', 'lots', 'lot', 'products', 'approvals', 'abnormal-reports', 'issues', 'issue', 'orders', 'notifications', 'decision']
    .forEach(k => qc.invalidateQueries({ queryKey: [k] }));
}

export function useCreatePlan() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (input: PlanInput) => api<PlanRow>('/stocktake-plans', {
      method: 'POST', json: { ...input, planType: input.planType || null, scopeType: input.scopeType || null, plannedDate: input.plannedDate || null },
    }),
    onSuccess: refresh,
  });
}

export function useSubmitCount(planId: number) {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (counts: { receiptDetailId: number; actualQuantity: number | null; reason: string }[]) =>
      api<StocktakeRow>(`/stocktake-plans/${planId}/stocktakes`, { method: 'POST', json: { counts } }),
    onSuccess: refresh,
  });
}

export function useStockDefect(planId: number) {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (input: { receiptDetailId: number; quantity: number | null; description: string }) =>
      api<ReportRow>(`/stocktake-plans/${planId}/defects`, { method: 'POST', json: input }),
    onSuccess: refresh,
  });
}

export function useStocktakeAction() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: ({ id, action, reason }: { id: number; action: 'approve' | 'reject'; reason?: string }) =>
      api<StocktakeView>(`/stocktakes/${id}/${action}`, { method: 'POST', json: action === 'reject' ? { reason } : undefined }),
    onSuccess: refresh,
  });
}
