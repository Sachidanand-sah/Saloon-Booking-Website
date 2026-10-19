import 'server-only';
import { cookies } from 'next/headers';
import type { Role, User } from '../types';
import { API_URL, forwardedFor } from './api';

/**
 * Tokens live in httpOnly cookies so page scripts can never read them. The browser talks
 * to the API only through /api/backend/*, which attaches the access token and refreshes it.
 */
export const COOKIE = { access: 'lg_at', refresh: 'lg_rt', role: 'lg_role' } as const;

const secure = process.env.NODE_ENV === 'production';
const base = { httpOnly: true, secure, sameSite: 'lax' as const, path: '/' };

type Session = { user: User; accessToken: string; refreshToken: string };

export async function storeSession(s: { accessToken: string; refreshToken: string; user: { role: Role } }) {
  const jar = await cookies();
  jar.set(COOKIE.access, s.accessToken, { ...base, maxAge: 14 * 60 });
  jar.set(COOKIE.refresh, s.refreshToken, { ...base, maxAge: 30 * 24 * 3600 });
  // Read by proxy.ts to route admins; the API still checks the role on every request.
  jar.set(COOKIE.role, s.user.role, { ...base, maxAge: 30 * 24 * 3600 });
}

export async function clearSession() {
  const jar = await cookies();
  for (const name of Object.values(COOKIE)) jar.delete(name);
}

async function refresh(): Promise<string | null> {
  const jar = await cookies();
  const refreshToken = jar.get(COOKIE.refresh)?.value;
  if (!refreshToken) return null;
  const res = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
    cache: 'no-store',
  });
  if (!res.ok) {
    await clearSession();
    return null;
  }
  const session = (await res.json()) as Session;
  await storeSession(session);
  return session.accessToken;
}

/** fetch() against the API as the signed-in user, refreshing the access token once if needed. */
export async function authedFetch(path: string, init: RequestInit = {}) {
  const jar = await cookies();
  let token = jar.get(COOKIE.access)?.value ?? (await refresh());
  const ipHeader = await forwardedFor();

  const send = (t: string | null) =>
    fetch(`${API_URL}${path}`, {
      ...init,
      cache: 'no-store',
      headers: {
        ...(init.headers as Record<string, string>),
        ...ipHeader,
        ...(t ? { Authorization: `Bearer ${t}` } : {}),
      },
    });

  let res = await send(token);
  if (res.status === 401 && token) {
    token = await refresh();
    if (token) res = await send(token);
  }
  return res;
}
