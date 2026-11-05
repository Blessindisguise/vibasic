import { useEffect, useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api';
import type { ItemStatus } from './issuing';
import type { ApprovalStatus, LotStatus, ReportRow } from './receiving';

export interface LotRow {
  id: number; lotCode: string; productId: number; sku: string; productName: string; unit: string; categoryName: string;
  receivedDate: string; receiptId: number; receiptCode: string; supplierName: string;
  quantity: number; quantityOnHand: number; reserved: number; status: LotStatus;
}
/** picked: already scanned for an issue (staging area, not on the shelf). */
export interface LotItem { id: number; serial: string; status: ItemStatus; issueId?: number; issueCode?: string; picked: boolean }
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
  receivedDate: string; status: LotStatus;
  /** Stock on hand; `picking` of it is in the staging area, so the shelf should hold `shelfQuantity`. */
  systemQuantity: number; picking: number; shelfQuantity: number;
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
  method: CountMethod; countedAt?: string; unlabeled: number;
  /** Counted by scanning, still waiting for approval: the codes that will be written off. */
  missingSerials?: string[];
}
export type CountMethod = 'manual' | 'scan';
/** One lot's count as sent to the server. Scanned lots send serials (+ unlabeled) instead of a typed quantity. */
export interface CountPayload {
  receiptDetailId: number; actualQuantity: number | null; reason: string; countedAt?: string; serials?: string[]; unlabeled?: number;
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
    mutationFn: (counts: CountPayload[]) =>
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

// ---------------- type-ahead (lot code / item serial) ----------------

export interface LotSuggestion {
  kind: 'lot' | 'item'; lotId: number; code: string; lotCode: string; sku: string; productName: string; unit: string;
  onHand: number; lotStatus: LotStatus; itemStatus?: ItemStatus;
}

/** The value once it has stopped changing for `ms` (typing, not every key). */
export function useDebounced<T>(value: T, ms = 200) {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
}

/** Lots (code, SKU, name) and item serials containing the typed text; from 2 characters on. */
export function useLotSuggest(text: string) {
  const q = useDebounced(text.trim(), 150);
  return useQuery({
    queryKey: ['lots', 'suggest', q], enabled: q.length >= 2, staleTime: 30_000, placeholderData: keepPreviousData,
    queryFn: () => api<LotSuggestion[]>(`/lots/suggest${qs({ q })}`),
  });
}
