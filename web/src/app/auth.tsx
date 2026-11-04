import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, setUnauthorizedHandler, tokenStore } from './api';

export type Role = 'manager' | 'staff';
export interface CurrentUser { id: number; username: string; fullName: string; role: Role }

interface AuthState {
  user: CurrentUser | null;
  ready: boolean;
  login: (username: string, password: string) => Promise<CurrentUser>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [ready, setReady] = useState(false);

  const logout = useCallback(() => { tokenStore.set(null); setUser(null); }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    if (!tokenStore.get()) { setReady(true); return; }
    api<CurrentUser>('/auth/me').then(setUser).catch(() => tokenStore.set(null)).finally(() => setReady(true));
  }, [logout]);

  const login = useCallback(async (username: string, password: string) => {
    const res = await api<{ token: string; user: CurrentUser }>('/auth/login', { method: 'POST', json: { username, password } });
    tokenStore.set(res.token);
    setUser(res.user);
    return res.user;
  }, []);

  const value = useMemo(() => ({ user, ready, login, logout }), [user, ready, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

export const homeFor = (role: Role) => (role === 'manager' ? '/ql' : '/kho');
