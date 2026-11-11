import { useQuery } from '@tanstack/react-query';
import { api } from './api';

export interface InventoryRow {
  productId: number; sku: string; productName: string; unit: string; categoryName: string; supplierName: string;
  lots: number; onHand: number; available: number; reserved: number; quarantined: number; locked: number; rop?: number;
  /** Net stock (available − orders not issued, Q8) at or below ROP: the same test as a low-stock alert. */
  belowRop: boolean; ordered: number; net: number;
  /** Items set aside as defective: not part of onHand. */
  defective: number;
}
export interface MovementRow {
  productId: number; sku: string; productName: string; unit: string; categoryName: string;
  opening: number; in: number; out: number; adjusted: number; closing: number; receipts: number; issues: number;
}
export interface Movement { from: string; to: string; rows: MovementRow[] }

export interface Dashboard {
  kpis: {
    availableUnits: number; products: number; pendingApprovals: number; openAlerts: number; pendingProposals: number;
    quarantinedLots: number; lockedLots: number; ordersWaiting: number; issuesToPick: number;
  };
  flow: { day: string; in: number; out: number }[];
  pending: { type: string; code: string; title: string; at: string; link: string }[];
  /** Open low-stock alerts; net = tồn ròng stored on the alert. */
  alerts: { productId: number; sku: string; productName: string; unit: string; net: number; rop: number }[];
}

const qs = (f: object) => {
  const p = new URLSearchParams(Object.entries(f).filter(([, v]) => v !== undefined && v !== '').map(([k, v]) => [k, String(v)]));
  return p.toString() ? `?${p}` : '';
};

export const useInventoryReport = (f: { productId?: string; categoryId?: string }) =>
  useQuery({ queryKey: ['reports', 'inventory', f], queryFn: () => api<InventoryRow[]>(`/reports/inventory${qs(f)}`) });
export const useMovementReport = (f: { from?: string; to?: string; productId?: string; categoryId?: string }) =>
  useQuery({ queryKey: ['reports', 'movement', f], queryFn: () => api<Movement>(`/reports/movement${qs(f)}`) });
export const useDashboard = () =>
  useQuery({ queryKey: ['dashboard'], refetchInterval: 60_000, queryFn: () => api<Dashboard>('/dashboard') });
