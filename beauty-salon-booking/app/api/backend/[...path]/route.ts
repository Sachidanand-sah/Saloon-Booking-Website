import { NextResponse, type NextRequest } from 'next/server';
import { authedFetch } from '@/lib/server/session';
import { unavailable } from '@/lib/server/auth-route';

/**
 * Same-origin gateway to backend-api for browser code: /api/backend/bookings → API /bookings,
 * with the signed-in user's token attached from httpOnly cookies.
 */
async function forward(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const target = `/${path.map(encodeURIComponent).join('/')}${req.nextUrl.search}`;
  const hasBody = !['GET', 'HEAD'].includes(req.method);

  let res: Response;
  try {
    res = await authedFetch(target, {
      method: req.method,
      headers: hasBody ? { 'Content-Type': 'application/json' } : {},
      body: hasBody ? await req.text() : undefined,
    });
  } catch {
    return unavailable();
  }
  if (res.status === 204) return new NextResponse(null, { status: 204 });
  return new NextResponse(await res.text(), {
    status: res.status,
    headers: { 'Content-Type': res.headers.get('Content-Type') ?? 'application/json' },
  });
}

export { forward as GET, forward as POST, forward as PATCH, forward as PUT, forward as DELETE };
