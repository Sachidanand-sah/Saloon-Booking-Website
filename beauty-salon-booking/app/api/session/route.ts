import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { API_URL } from '@/lib/server/api';
import { authedFetch, clearSession, COOKIE } from '@/lib/server/session';

/** Current user, or { user: null } when signed out. */
export async function GET() {
  const jar = await cookies();
  if (!jar.get(COOKIE.refresh)) return NextResponse.json({ user: null });
  try {
    const res = await authedFetch('/auth/me');
    if (!res.ok) return NextResponse.json({ user: null });
    return NextResponse.json(await res.json());
  } catch {
    return NextResponse.json({ user: null });
  }
}

/** Sign out: revoke the refresh token and clear cookies. */
export async function DELETE() {
  const jar = await cookies();
  const refreshToken = jar.get(COOKIE.refresh)?.value;
  if (refreshToken) {
    await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    }).catch(() => undefined);
  }
  await clearSession();
  return new NextResponse(null, { status: 204 });
}
