import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from './api';
import type { Role } from './auth';

export interface Category { id: number; name: string; description?: string; productCount: number }
export interface Supplier { id: number; name: string; phone?: string; address?: string; productCount: number }
export interface Policy {
  leadTimeDays: number; orderingCost: number; holdingCost: number;
  /** Calculated weekly with ROP and EOQ (Q4): SS = 1,65 × σ × √L. */
  safetyStock?: number; demandStdDev?: number;
  demandState: 'normal' | 'insufficientData' | 'slowMoving';
  currentRop?: number; currentEoq?: number; avgDailyDemand?: number;
  lastRopCalculatedAt?: string; lastEoqCalculatedAt?: string;
}
export interface Product {
  id: number; sku: string; name: string; unit: string;
  categoryId: number; categoryName: string; supplierId: number; supplierName: string;
  /** Tồn kho khả dụng (lô "Bình thường"). */
  available: number;
  /** Orders received but not issued; net = available − ordered (tồn ròng), compared with ROP. */
  ordered: number; net: number;
  /** Lots ever received; the SKU is frozen once above 0. */
  lotCount: number;
  policy?: Policy;
}
export interface Account { id: number; username: string; fullName: string; role: Role; isActive: boolean }

export interface CategoryInput { name: string; description: string }
export interface SupplierInput { name: string; phone: string; address: string }
export interface ProductInput {
  sku: string; name: string; unit: string; categoryId: number | null; supplierId: number | null;
  leadTimeDays: number | null; orderingCost: number | null; holdingCost: number | null;
}
export interface AccountInput { username: string; fullName: string; password: string; role: Role | '' }

const keys = { categories: ['categories'], suppliers: ['suppliers'], products: ['products'], users: ['users'] };

export const useCategories = () => useQuery({ queryKey: keys.categories, queryFn: () => api<Category[]>('/categories') });
export const useSuppliers = () => useQuery({ queryKey: keys.suppliers, queryFn: () => api<Supplier[]>('/suppliers') });
export const useProducts = () => useQuery({ queryKey: keys.products, queryFn: () => api<Product[]>('/products') });
export const useAccounts = () => useQuery({ queryKey: keys.users, queryFn: () => api<Account[]>('/users') });

/** POST when id is null, PUT otherwise. Product counts shown on categories and suppliers depend on products, so all catalog lists refresh. */
function useSave<TIn, TOut>(path: string, invalidate: string[][]) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number | null; input: TIn }) =>
      api<TOut>(id == null ? path : `${path}/${id}`, { method: id == null ? 'POST' : 'PUT', json: input }),
    onSuccess: () => invalidate.forEach(queryKey => qc.invalidateQueries({ queryKey })),
  });
}

const catalogLists = [keys.categories, keys.suppliers, keys.products];
export const useSaveCategory = () => useSave<CategoryInput, Category>('/categories', catalogLists);
export const useSaveSupplier = () => useSave<SupplierInput, Supplier>('/suppliers', catalogLists);
export const useSaveProduct = () => useSave<ProductInput, Product>('/products', catalogLists);
export const useSaveAccount = () => useSave<AccountInput, Account>('/users', [keys.users]);

export function useSetAccountActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) =>
      api<Account>(`/users/${id}/${active ? 'activate' : 'deactivate'}`, { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.users }),
  });
}

/** First server message per field, from a 400 ValidationProblem. */
export function fieldErrors(error: unknown): Record<string, string> {
  if (!(error instanceof ApiError) || !error.errors) return {};
  return Object.fromEntries(Object.entries(error.errors).map(([k, v]) => [k, v[0]]));
}

/** Message for the top of the form when no field carries it (network error, 403, 404, 409). */
export function formError(error: unknown): string | null {
  if (!error) return null;
  if (error instanceof ApiError) return error.errors ? null : error.message;
  return 'Không lưu được. Thử lại sau.';
}
