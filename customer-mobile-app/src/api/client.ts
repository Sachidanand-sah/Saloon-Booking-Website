import { API_URL } from '@/config';
import { secureStorage } from '@/auth/storage';
import type { ApiError, User } from './types';

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

type Tokens = { accessToken: string; refreshToken: string };
const KEY = 'lalima.session';

let tokens: Tokens | null = null;
let refreshing: Promise<boolean> | null = null;
const expiredListeners = new Set<() => void>();

export const session = {
  async load() {
    const raw = await secureStorage.get(KEY);
    tokens = raw ? (JSON.parse(raw) as Tokens) : null;
    return tokens;
  },
  async save(t: Tokens) {
    tokens = t;
    await secureStorage.set(KEY, JSON.stringify(t));
  },
  async clear() {
    tokens = null;
    await secureStorage.remove(KEY);
  },
  get refreshToken() {
    return tokens?.refreshToken ?? null;
  },
  /** Called when the refresh token is rejected, so the app can return to the login screen. */
  onExpired(fn: () => void) {
    expiredListeners.add(fn);
    return () => {
      expiredListeners.delete(fn);
    };
  },
};

async function refresh(): Promise<boolean> {
  // One refresh at a time: concurrent 401s wait for the same attempt.
  refreshing ??= (async () => {
    const refreshToken = tokens?.refreshToken;
    if (!refreshToken) return false;
    try {
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) throw new Error('refresh failed');
      const data = (await res.json()) as Tokens & { user: User };
      await session.save({ accessToken: data.accessToken, refreshToken: data.refreshToken });
      return true;
    } catch {
      await session.clear();
      expiredListeners.forEach(fn => fn());
      return false;
    }
  })().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

async function request<T>(path: string, method: string, body?: unknown, retry = true): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(tokens ? { Authorization: `Bearer ${tokens.accessToken}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new RequestError(0, 'NETWORK', 'Cannot reach Lalima right now. Check your connection and try again.');
  }

  if (res.status === 401 && retry && tokens?.refreshToken && (await refresh())) {
    return request<T>(path, method, body, false);
  }
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = data as Partial<ApiError>;
    throw new RequestError(res.status, err.code ?? 'ERROR', err.message ?? 'Something went wrong.', err.details);
  }
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path, 'GET'),
  post: <T>(path: string, body: unknown = {}) => request<T>(path, 'POST', body),
  patch: <T>(path: string, body: unknown) => request<T>(path, 'PATCH', body),
  delete: <T>(path: string) => request<T>(path, 'DELETE'),
};

export const errorMessage = (e: unknown) =>
  e instanceof Error ? e.message : 'Something went wrong. Please try again.';

/** Field-level messages from an API 400 `details` array. */
export function fieldErrors(e: unknown) {
  const out: Record<string, string> = {};
  if (e instanceof RequestError) {
    for (const d of e.details ?? []) if (d.field && !out[d.field]) out[d.field] = d.message;
  }
  return out;
}
