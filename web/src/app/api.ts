const TOKEN_KEY = 'vb-token';

export const tokenStore = {
  get: () => {
    try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
  },
  set: (t: string | null) => {
    try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch { /* storage blocked */ }
  },
};

/** Error carrying the server's ProblemDetails title, already written in Vietnamese. */
export class ApiError extends Error {
  constructor(public status: number, message: string, public errors?: Record<string, string[]>) {
    super(message);
  }
}

let onUnauthorized: () => void = () => {};
export const setUnauthorizedHandler = (fn: () => void) => { onUnauthorized = fn; };

export async function api<T>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const headers = new Headers(init.headers);
  const token = tokenStore.get();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  let body = init.body;
  if (init.json !== undefined) {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(init.json);
  }

  let res: Response;
  try {
    res = await fetch(`/api${path}`, { ...init, headers, body });
  } catch {
    throw new ApiError(0, 'Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.');
  }

  if (res.status === 401 && token) onUnauthorized();
  if (!res.ok) {
    let title = `Lỗi ${res.status}`;
    let errors: Record<string, string[]> | undefined;
    try {
      const p = await res.json();
      title = p.detail || p.title || title;
      errors = p.errors;
    } catch { /* not JSON */ }
    if (res.status === 403 && title === `Lỗi 403`) title = 'Bạn không có quyền thực hiện thao tác này.';
    throw new ApiError(res.status, title, errors);
  }
  if (res.status === 204) return undefined as T;
  const type = res.headers.get('Content-Type') ?? '';
  return (type.includes('json') ? res.json() : res.blob()) as Promise<T>;
}
