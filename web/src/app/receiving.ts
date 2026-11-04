import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api';

export type ReceiptStatus = 'receiving' | 'pending' | 'approved' | 'rejected';
export type LotStatus = 'normal' | 'quarantined' | 'locked';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';
export type AbnormalSource = 'receipt' | 'issue' | 'stocktake';

export interface ReceiptRow {
  id: number; code: string; receiptDate: string; submittedAt?: string;
  supplierId: number; supplierName: string; createdBy: number; creatorName: string;
  approverName?: string; approvedAt?: string; status: ReceiptStatus;
  productCount: number; totalQuantity: number; lotCount: number; pendingReports: number; rejectReason?: string;
}
export interface LotRow {
  id: number; lotCode: string; productId: number; sku: string; productName: string; unit: string;
  quantity: number; quantityOnHand: number; status: LotStatus; documentQuantity?: number; note?: string;
}
export interface ReportRow {
  id: number; code: string; receiptDetailId: number; lotCode: string; sku: string; productName: string; unit: string;
  sourceType: AbnormalSource; description: string; quantity: number; status: ApprovalStatus;
  creatorName: string; createdAt: string; approverName?: string; approvedAt?: string; rejectReason?: string;
  receiptId: number; receiptCode: string; receiptStatus: ReceiptStatus;
  /** Goods issue during which the defect was found (source "Xuất kho"). */
  issueId?: number;
}
export interface ReceiptView { header: ReceiptRow; note?: string; lots: LotRow[]; reports: ReportRow[] }
export interface LabelSheet {
  code: string; supplierName: string; receiptDate: string;
  lots: { lotCode: string; sku: string; productName: string; unit: string; status: LotStatus; quantity: number; serials: string[] }[];
}

export interface ReceiptLineInput {
  productId: number | null; receivedQuantity: number | null; failedQuantity: number | null;
  documentQuantity: number | null; note: string; defectDescription: string;
}
export interface ReceiptInput { supplierId: number | null; note: string; lines: ReceiptLineInput[] }

export interface ReceiptFilter { status?: string; supplierId?: string; from?: string; to?: string }

const qs = (f: object) => {
  const p = new URLSearchParams(Object.entries(f).filter(([, v]) => v !== undefined && v !== ''));
  return p.toString() ? `?${p}` : '';
};

export const useReceipts = (f: ReceiptFilter = {}) =>
  useQuery({ queryKey: ['receipts', f], queryFn: () => api<ReceiptRow[]>(`/receipts${qs(f)}`) });
export const useReceipt = (id: number) =>
  useQuery({ queryKey: ['receipt', id], queryFn: () => api<ReceiptView>(`/receipts/${id}`), enabled: id > 0 });
export const useLabels = (id: number) =>
  useQuery({ queryKey: ['receipt', id, 'labels'], queryFn: () => api<LabelSheet>(`/receipts/${id}/labels`) });
export const useReports = (status?: ApprovalStatus, source?: AbnormalSource) =>
  useQuery({
    queryKey: ['abnormal-reports', status ?? 'all', source ?? 'all'],
    queryFn: () => api<ReportRow[]>(`/abnormal-reports${qs({ status, source })}`),
  });
export const useApprovalSummary = (enabled = true) =>
  useQuery({
    queryKey: ['approvals'], enabled, refetchInterval: 60_000,
    queryFn: () => api<{ receipts: number; issues: number; stocktakes: number; abnormalReports: number; total: number }>('/approvals/summary'),
  });

/** Every receipt or report change can move counts, stock and notifications, so refresh them together. */
function useRefresh() {
  const qc = useQueryClient();
  return () => ['receipts', 'receipt', 'abnormal-reports', 'approvals', 'products', 'notifications']
    .forEach(k => qc.invalidateQueries({ queryKey: [k] }));
}

export function useSaveReceipt() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: ({ id, input }: { id: number | null; input: ReceiptInput }) =>
      api<ReceiptView>(id == null ? '/receipts' : `/receipts/${id}`, { method: id == null ? 'POST' : 'PUT', json: input }),
    onSuccess: refresh,
  });
}

type ReceiptAction = 'submit' | 'approve' | 'reject';
export function useReceiptAction() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: ({ id, action, reason }: { id: number; action: ReceiptAction; reason?: string }) =>
      api<ReceiptView>(`/receipts/${id}/${action}`, { method: 'POST', json: action === 'reject' ? { reason } : undefined }),
    onSuccess: refresh,
  });
}

export function useReportAction() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: ({ id, action, reason }: { id: number; action: 'approve' | 'reject'; reason?: string }) =>
      api<ReportRow>(`/abnormal-reports/${id}/${action}`, { method: 'POST', json: action === 'reject' ? { reason } : undefined }),
    onSuccess: refresh,
  });
}

// ---------------- notifications ----------------

export interface NotificationItem { id: number; title: string; message?: string; link?: string; tone: string; createdAt: string; isRead: boolean }

export const useNotifications = () =>
  useQuery({ queryKey: ['notifications'], refetchInterval: 30_000, queryFn: () => api<{ unread: number; items: NotificationItem[] }>('/notifications') });

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids?: number[]) => api<void>('/notifications/read', { method: 'POST', json: { ids } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}
