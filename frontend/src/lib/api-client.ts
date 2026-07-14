import type { ApiResponse, PaginationMeta } from '@/types';

// Relative path — no domain baked into the client bundle at build time.
// All /api/* requests are proxied by src/app/api/[...path]/route.ts
// to the backend using the server-side BACKEND_URL env var.
const API_URL = '/api';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly fields?: Record<string, string[]>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
}

// FIX C-2: Refresh token thundering herd guard.
// 10 concurrent 401s → 10 refresh calls → backend sees token reuse
// → revokes ALL sessions → user silently logged out.
// Fix: only ONE refresh in flight; all other callers await the same promise.
let refreshPromise: Promise<boolean> | null = null;

async function attemptRefresh(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = fetch(`${API_URL}/auth/refresh`, { method: 'POST', credentials: 'include' })
    .then((r) => r.ok)
    .catch(() => false)
    .finally(() => { refreshPromise = null; });
  return refreshPromise;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<{ data: T; meta?: PaginationMeta }> {
  const { body, params, ...init } = options;

  let url = `${API_URL}${path}`;
  if (params) {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) sp.set(k, String(v));
    }
    const qs = sp.toString();
    if (qs) url += `?${qs}`;
  }

  const fetchOptions: RequestInit = {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init.headers },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  };

  const response = await fetch(url, fetchOptions);

  if (response.status === 401 && path !== '/auth/refresh' && path !== '/auth/login') {
    const refreshed = await attemptRefresh();
    if (refreshed) {
      const retry = await fetch(url, fetchOptions);
      return processResponse<T>(retry);
    }
    throw new ApiError(401, 'Session expired. Please log in again.');
  }

  return processResponse<T>(response);
}

async function processResponse<T>(response: Response): Promise<{ data: T; meta?: PaginationMeta }> {
  const json = (await response.json()) as ApiResponse<T>;
  if (!response.ok || !json.success) {
    throw new ApiError(response.status, json.message ?? 'An unexpected error occurred', (json as ApiResponse<T> & { fields?: Record<string, string[]> }).fields);
  }
  return { data: json.data as T, meta: json.meta };
}

export const api = {
  get: <T>(path: string, params?: RequestOptions['params']) => request<T>(path, { method: 'GET', params }),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};