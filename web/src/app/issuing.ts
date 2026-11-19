import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api';
import type { LotStatus, ReportRow } from './receiving';

export type OrderStatus = 'open' | 'onHold' | 'inProgress' | 'issued' | 'cancelled';
/**
 * No approval step: an issue is "ready" (Chờ lấy hàng) as soon as staff create it.
 * cancelled: ended without delivery, items released (cancelReason says why: order cancelled, or no replacement left).
 */
export type IssueStatus = 'ready' | 'cancelled' | 'issued';
export type ItemStatus = 'incoming' | 'inStock' | 'reserved' | 'issued' | 'lost' | 'defective' | 'disposed';

export interface OrderLine { productId: number; sku: string; productName: string; unit: string; quantity: number; free: number }
export interface OrderRow {
  id: number; externalCode: string; customerName?: string; orderDate: string; status: OrderStatus;
  totalQuantity: number; sufficient: boolean; lines: OrderLine[];
  lastIssueId?: number; lastIssueCode?: string; lastIssueStatus?: IssueStatus;
  customerPhone?: string; shippingAddress?: string; note?: string;
  cancelReason?: string; cancelledAt?: string;
}
export interface CancelResponse { order: OrderRow; issueCode?: string }
export interface AllocLot { receiptDetailId: number; lotCode: string; receivedDate: string; take: number; serials: string[] }
export interface AllocLine { productId: number; sku: string; productName: string; unit: string; ordered: number; free: number; shortage: number; lots: AllocLot[] }
export interface Allocation { orderId: number; sufficient: boolean; lines: AllocLine[] }

export interface IssueRow {
  id: number; code: string; issueDate: string; orderId: number; orderCode: string; customerName?: string;
  createdBy: number; creatorName: string; status: IssueStatus;
  productCount: number; totalQuantity: number; picked: number; cancelReason?: string;
  /** Cancelled issue: items that had been picked, to put back on the shelf. */
  receiverName?: string; deliveredAt?: string; delivererName?: string;
  customerPhone?: string; shippingAddress?: string; orderNote?: string;
  /** Staff member picking the issue; only they may scan, report defects and deliver. */
  pickerId?: number; pickerName?: string; pickStartedAt?: string; pickActiveAt?: string;
}

/** Search an issue by its codes, customer and the people involved (creator, picker, who delivered). */
export const issueSearchFields = (i: IssueRow) => [i.code, i.orderCode, i.customerName, i.customerPhone, i.creatorName, i.pickerName, i.delivererName];

/** Same rule as the server (IssueService.PickHold): an issue stays with its picker for 3 days from the claim. */
export const PICK_HOLD_MS = 3 * 86_400_000;
/** When the picker's hold ends (another staff member may then take the issue over). */
export const pickHoldUntil = (h: IssueRow) => (h.pickStartedAt ? new Date(new Date(h.pickStartedAt).getTime() + PICK_HOLD_MS).toISOString() : undefined);
export const pickHoldExpired = (h: IssueRow, now = Date.now()) => !h.pickStartedAt || now - new Date(h.pickStartedAt).getTime() >= PICK_HOLD_MS;
export interface PickItem { itemId: number; serial: string; status: ItemStatus; pickedAt?: string }
export interface PickLot { receiptDetailId: number; lotCode: string; receivedDate: string; lotStatus: LotStatus; items: PickItem[] }
export interface IssueLine { detailId: number; productId: number; sku: string; productName: string; unit: string; quantity: number; picked: number; lots: PickLot[] }
export interface IssueView { header: IssueRow; lines: IssueLine[]; reports: ReportRow[] }

/**
 * replacedSerial: the scanned item was taken in place of this one from the same lot (X1).
 * lotPicked: a lot label was scanned and the issue takes the whole lot; items of it marked picked by this scan.
 */
export interface ScanResult { serial: string; lotCode: string; sku: string; alreadyPicked: boolean; picked: number; total: number; replacedSerial?: string; lotPicked: number }
export interface DefectResult { reportCodes: string[]; replaced: number; returnPicked: string[]; onHold: boolean }

const qs = (f: object) => {
  const p = new URLSearchParams(Object.entries(f).filter(([, v]) => v !== undefined && v !== ''));
  return p.toString() ? `?${p}` : '';
};

export const useOrders = () => useQuery({ queryKey: ['orders'], queryFn: () => api<OrderRow[]>('/orders') });
/** The customer cancelled (manager, for the sales system). */
export function useCancelOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => api<CancelResponse>(`/orders/${id}/cancel`, { method: 'POST', json: { reason } }),
    onSuccess: () => ['orders', 'issues', 'issue', 'decision', 'dashboard'].forEach(k => qc.invalidateQueries({ queryKey: [k] })),
  });
}
export const useAllocation = (orderId: number) =>
  useQuery({ queryKey: ['orders', orderId, 'allocation'], queryFn: () => api<Allocation>(`/orders/${orderId}/allocation`) });
/** The pick queue refreshes on its own so everyone sees who has taken which issue. */
export const useIssues = (f: { status?: string; from?: string; to?: string } = {}) =>
  useQuery({ queryKey: ['issues', f], queryFn: () => api<IssueRow[]>(`/issues${qs(f)}`), refetchInterval: f.status === 'ready' ? 15_000 : false });
/** Refreshes every 15 s while the issue is being picked, so everyone sees who holds it. */
export const useIssue = (id: number) => useQuery({
  queryKey: ['issue', id], queryFn: () => api<IssueView>(`/issues/${id}`),
  refetchInterval: q => (q.state.data?.header.status === 'ready' ? 15_000 : false),
});

/** Issue changes move orders, stock, approvals (abnormal reports) and decision support. */
function useRefresh() {
  const qc = useQueryClient();
  return () => ['orders', 'issues', 'issue', 'approvals', 'abnormal-reports', 'products', 'receipt', 'decision']
    .forEach(k => qc.invalidateQueries({ queryKey: [k] }));
}

export function useCreateIssue() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (orderId: number) => api<IssueView>('/issues', { method: 'POST', json: { orderId } }),
    onSettled: refresh, // a shortage changes the order to "Chờ xử lý" even though the call fails
  });
}

export function useScan(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => api<ScanResult>(`/issues/${id}/scan`, { method: 'POST', json: { code } }),
    // An error may mean someone else took the issue: reload it either way.
    onSettled: () => qc.invalidateQueries({ queryKey: ['issue', id] }),
  });
}

/** "Bắt đầu lấy hàng" / "Nhận lại phiếu" (claim) and "Nhường phiếu" / "Gỡ người lấy hàng" (release). */
export function usePicker() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: ({ id, action }: { id: number; action: 'claim' | 'release' }) => api<IssueView>(`/issues/${id}/${action}`, { method: 'POST' }),
    onSettled: refresh,
  });
}

export function useReportDefect(id: number) {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (input: { serials: string[]; description: string; wholeLot: boolean; handlingProposal?: string }) =>
      api<{ view: IssueView; result: DefectResult }>(`/issues/${id}/defects`, { method: 'POST', json: input }),
    onSuccess: refresh,
  });
}

export function useDeliver(id: number) {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (receiverName: string) => api<IssueView>(`/issues/${id}/deliver`, { method: 'POST', json: { receiverName } }),
    onSuccess: refresh,
  });
}
