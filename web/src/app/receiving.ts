import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api';
import type { ItemStatus } from './issuing';
import type { LotRow as StockLotRow } from './stock';

export type ReceiptStatus = 'receiving' | 'pending' | 'approved' | 'rejected';
export type LotStatus = 'normal' | 'quarantined' | 'locked';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';
export type AbnormalSource = 'receipt' | 'issue' | 'stocktake';

export interface ReceiptRow {
  id: number; code: string; receiptDate: string; submittedAt?: string;
  supplierId: number; supplierName: string; createdBy: number; creatorName: string;
  approverName?: string; approvedAt?: string; status: ReceiptStatus;
  productCount: number; totalQuantity: number; lotCount: number; pendingReports: number; rejectReason?: string;
  /** Số chứng từ giao hàng của nhà cung cấp. */
  deliveryNoteNo?: string;
}
export interface LotRow {
  id: number; lotCode: string; productId: number; sku: string; productName: string; unit: string;
  quantity: number; quantityOnHand: number; status: LotStatus; documentQuantity?: number; note?: string;
}
export interface ReportRow {
  id: number; code: string; receiptDetailId: number; lotCode: string; sku: string; productName: string; unit: string;
  sourceType: AbnormalSource; description: string; quantity: number; status: ApprovalStatus;
  createdBy: number; creatorName: string; createdAt: string; approverName?: string; approvedAt?: string; rejectReason?: string;
  receiptId: number; receiptCode: string; receiptStatus: ReceiptStatus;
  /** Goods issue during which the defect was found (source "Xuất kho"). */
  issueId?: number;
  /** items: only the listed items are out of stock; lot: the whole lot is quarantined / locked. */
  scope: ReportScope;
  supplierName: string;
  /** Hướng xử lý chosen by the manager on approval. */
  handlingMethod?: HandlingMethod;
  /** Mô tả hướng xử lý: the staff proposal while pending, the manager's once approved. */
  handlingPlan?: string;
  /** Set once approved. */
  handlingStatus?: HandlingStatus;
  handlerId?: number; handlerName?: string; handlingStartedAt?: string; handledAt?: string;
}
export type ReportScope = 'items' | 'lot';
export type HandlingMethod = 'returnToSupplier' | 'scrap' | 'clearance' | 'repair';
export type HandlingStatus = 'waiting' | 'inProgress' | 'done';
/** One status for lists and filters: the approval while undecided or rejected, the handling once approved. */
export type ReportState = 'pending' | 'rejected' | HandlingStatus;
export const reportState = (r: ReportRow): ReportState =>
  r.status === 'approved' ? r.handlingStatus ?? 'waiting' : r.status;

/** Search a report by its codes, product and the people involved — never by its free-text description. */
export const reportSearchFields = (r: ReportRow) =>
  [r.code, r.lotCode, r.sku, r.productName, r.receiptCode, r.supplierName, r.creatorName, r.approverName, r.handlerName];
export const REPORT_SEARCH_PLACEHOLDER = 'Mã biên bản, lô, SKU, tên hàng, NCC, người lập / duyệt / xử lý…';
/** revokeBlock: approved receipt whose stock is already in use, and why "Hủy duyệt" is no longer possible. */
export interface ReceiptView { header: ReceiptRow; note?: string; lots: LotRow[]; reports: ReportRow[]; revokeBlock?: string }
export interface LabelSheet {
  code: string; supplierName: string; receiptDate: string;
  lots: { lotCode: string; sku: string; productName: string; unit: string; status: LotStatus; quantity: number; serials: string[] }[];
}

export interface ReceiptLineInput {
  productId: number | null; receivedQuantity: number | null; failedQuantity: number | null;
  documentQuantity: number | null; note: string; defectDescription: string;
}
export interface ReceiptInput { supplierId: number | null; note: string; deliveryNoteNo: string; lines: ReceiptLineInput[] }

export interface ReceiptFilter { status?: string; supplierId?: string; from?: string; to?: string }

/** Search a receipt by its codes, supplier and the people involved. */
export const receiptSearchFields = (r: ReceiptRow) => [r.code, r.deliveryNoteNo, r.supplierName, r.creatorName, r.approverName];

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
/** One abnormal report with its lot, where it was found, how the lot's items stand and the lot's other reports. */
export interface ReportView {
  report: ReportRow; lot: StockLotRow; issueCode?: string; stocktakeId?: number; stocktakeCode?: string;
  items: { status: ItemStatus; count: number }[]; others: ReportRow[];
  /** The items listed on the report and how they stand now; empty for reports filed before items were recorded. */
  defective: { id: number; serial: string; status: ItemStatus; issueCode?: string }[];
  /** Items that would leave the warehouse / come back into stock if the handling were completed now. */
  completeLeave: number; completeReturn: number;
}
export const useReport = (id: number) =>
  useQuery({ queryKey: ['abnormal-reports', 'detail', id], enabled: id > 0, queryFn: () => api<ReportView>(`/abnormal-reports/${id}`) });
export const useApprovalSummary =(enabled = true) =>
  useQuery({
    queryKey: ['approvals'], enabled, refetchInterval: 60_000,
    queryFn: () => api<{ receipts: number; stocktakes: number; abnormalReports: number; total: number }>('/approvals/summary'),
  });

/** Every receipt or report change can move counts and stock, so refresh them together. */
function useRefresh() {
  const qc = useQueryClient();
  return () => ['receipts', 'receipt', 'abnormal-reports', 'approvals', 'products', 'decision', 'lot', 'lots', 'issue', 'stocktake']
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

/** 'revoke' = hủy duyệt: an approved receipt goes back to "Chờ duyệt". */
type ReceiptAction = 'submit' | 'approve' | 'reject' | 'revoke';
export function useReceiptAction() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: ({ id, action, reason }: { id: number; action: ReceiptAction; reason?: string }) =>
      api<ReceiptView>(`/receipts/${id}/${action}`, { method: 'POST', json: action === 'reject' || action === 'revoke' ? { reason } : undefined }),
    onSuccess: refresh,
  });
}

export interface HandlingInput { method: HandlingMethod | null; plan: string }

/** approve/reject/revoke (manager), claim/complete (staff), release (the handler or a manager). */
export type ReportActionKind = 'approve' | 'reject' | 'revoke' | 'claim' | 'release' | 'complete';
export function useReportAction() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: ({ id, action, reason, wholeLot, handling }: { id: number; action: ReportActionKind; reason?: string; wholeLot?: boolean; handling?: HandlingInput }) =>
      api<ReportRow>(`/abnormal-reports/${id}/${action}`, {
        method: 'POST',
        json: action === 'approve' ? { wholeLot, ...handling } : action === 'reject' || action === 'revoke' ? { reason } : undefined,
      }),
    onSuccess: refresh,
  });
}

/** The manager changes the hướng xử lý of an approved report (kind 'handling'), or staff propose one while it is pending ('proposal'). */
export function useSaveHandling() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: ({ id, kind, handling }: { id: number; kind: 'handling' | 'proposal'; handling: HandlingInput }) =>
      api<ReportRow>(`/abnormal-reports/${id}/${kind}`, { method: 'PUT', json: kind === 'handling' ? handling : { plan: handling.plan } }),
    onSuccess: refresh,
  });
}

/** Where an abnormal report's detail page lives for each role. */
export const reportHref = (role: 'manager' | 'staff', id: number) => `${role === 'manager' ? '/ql/bat-thuong' : '/kho/bao-loi'}/${id}`;
