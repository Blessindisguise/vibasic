import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api';
import type { LotStatus, ReportRow } from './receiving';

export type OrderStatus = 'open' | 'onHold' | 'inProgress' | 'issued';
export type IssueStatus = 'pending' | 'approved' | 'rejected' | 'onHold' | 'issued';
export type ItemStatus = 'incoming' | 'inStock' | 'reserved' | 'issued' | 'lost';

export interface OrderLine { productId: number; sku: string; productName: string; unit: string; quantity: number; free: number }
export interface OrderRow {
  id: number; externalCode: string; customerName?: string; orderDate: string; status: OrderStatus;
  totalQuantity: number; sufficient: boolean; lines: OrderLine[];
  lastIssueId?: number; lastIssueCode?: string; lastIssueStatus?: IssueStatus;
}
export interface AllocLot { receiptDetailId: number; lotCode: string; receivedDate: string; take: number; serials: string[] }
export interface AllocLine { productId: number; sku: string; productName: string; unit: string; ordered: number; free: number; shortage: number; lots: AllocLot[] }
export interface Allocation { orderId: number; sufficient: boolean; lines: AllocLine[] }

export interface IssueRow {
  id: number; code: string; issueDate: string; orderId: number; orderCode: string; customerName?: string;
  createdBy: number; creatorName: string; approverName?: string; approvedAt?: string; status: IssueStatus;
  productCount: number; totalQuantity: number; picked: number; rejectReason?: string; holdReason?: string;
  receiverName?: string; deliveredAt?: string; delivererName?: string;
}
export interface PickItem { itemId: number; serial: string; status: ItemStatus; pickedAt?: string }
export interface PickLot { receiptDetailId: number; lotCode: string; receivedDate: string; lotStatus: LotStatus; items: PickItem[] }
export interface IssueLine { detailId: number; productId: number; sku: string; productName: string; unit: string; quantity: number; picked: number; lots: PickLot[] }
export interface IssueView { header: IssueRow; lines: IssueLine[]; reports: ReportRow[] }

export interface ScanResult { serial: string; lotCode: string; sku: string; alreadyPicked: boolean; picked: number; total: number }
export interface DefectResult { reportCodes: string[]; replaced: number; returnPicked: string[]; onHold: boolean }

const qs = (f: object) => {
  const p = new URLSearchParams(Object.entries(f).filter(([, v]) => v !== undefined && v !== ''));
  return p.toString() ? `?${p}` : '';
};

export const useOrders = () => useQuery({ queryKey: ['orders'], queryFn: () => api<OrderRow[]>('/orders') });
export const useAllocation = (orderId: number) =>
  useQuery({ queryKey: ['orders', orderId, 'allocation'], queryFn: () => api<Allocation>(`/orders/${orderId}/allocation`) });
export const useIssues = (f: { status?: string; from?: string; to?: string } = {}) =>
  useQuery({ queryKey: ['issues', f], queryFn: () => api<IssueRow[]>(`/issues${qs(f)}`) });
export const useIssue = (id: number) => useQuery({ queryKey: ['issue', id], queryFn: () => api<IssueView>(`/issues/${id}`) });

/** Issue changes move orders, stock, approvals, abnormal reports and notifications. */
function useRefresh() {
  const qc = useQueryClient();
  return () => ['orders', 'issues', 'issue', 'approvals', 'abnormal-reports', 'products', 'notifications', 'receipt']
    .forEach(k => qc.invalidateQueries({ queryKey: [k] }));
}

export function useCreateIssue() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (orderId: number) => api<IssueView>('/issues', { method: 'POST', json: { orderId } }),
    onSettled: refresh, // a shortage changes the order to "Chờ xử lý" even though the call fails
  });
}

export function useIssueAction() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: ({ id, action, reason }: { id: number; action: 'approve' | 'reject'; reason?: string }) =>
      api<IssueView>(`/issues/${id}/${action}`, { method: 'POST', json: action === 'reject' ? { reason } : undefined }),
    onSuccess: refresh,
  });
}

export function useScan(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => api<ScanResult>(`/issues/${id}/scan`, { method: 'POST', json: { code } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['issue', id] }),
  });
}

export function useReportDefect(id: number) {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (input: { serials: string[]; description: string }) =>
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
