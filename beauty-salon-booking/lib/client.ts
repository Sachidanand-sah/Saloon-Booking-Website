import type { ApiError } from './types';

export class RequestError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: ApiError['details'],
  ) {
    super(message);
  }
}

async function request<T>(url: string, method: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      cache: 'no-store',
    });
  } catch {
    throw new RequestError(0, 'NETWORK', 'You appear to be offline. Check your connection and try again.');
  }
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = data as Partial<ApiError>;
    throw new RequestError(res.status, err.code ?? 'ERROR', err.message ?? 'Something went wrong.', err.details);
  }
  return data as T;
}

/** Calls backend-api through the same-origin gateway (auth cookies are attached server-side). */
export const api = {
  get: <T>(path: string) => request<T>(`/api/backend${path}`, 'GET'),
  post: <T>(path: string, body?: unknown) => request<T>(`/api/backend${path}`, 'POST', body ?? {}),
  patch: <T>(path: string, body: unknown) => request<T>(`/api/backend${path}`, 'PATCH', body),
  put: <T>(path: string, body: unknown) => request<T>(`/api/backend${path}`, 'PUT', body),
  delete: <T>(path: string) => request<T>(`/api/backend${path}`, 'DELETE'),
};

export const sessionApi = {
  get: () => request<{ user: import('./types').User | null }>('/api/session', 'GET'),
  login: (body: { email: string; password: string }) =>
    request<{ user: import('./types').User }>('/api/session/login', 'POST', body),
  signup: (body: { name: string; email: string; password: string; phone?: string }) =>
    request<{ user: import('./types').User }>('/api/session/signup', 'POST', body),
  logout: () => request<void>('/api/session', 'DELETE'),
};

export const errorMessage = (e: unknown) =>
  e instanceof Error ? e.message : 'Something went wrong. Please try again.';
