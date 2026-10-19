import { NextResponse, type NextRequest } from 'next/server';

/** Sends signed-out visitors to /login, and non-admins away from /admin. */
export function proxy(req: NextRequest) {
  const signedIn = req.cookies.has('lg_rt');
  const { pathname, search } = req.nextUrl;

  if (!signedIn) {
    const url = new URL('/login', req.url);
    url.searchParams.set('next', pathname + search);
    return NextResponse.redirect(url);
  }
  if (pathname.startsWith('/admin') && req.cookies.get('lg_role')?.value !== 'ADMIN') {
    return NextResponse.redirect(new URL('/account', req.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ['/account/:path*', '/admin/:path*'] };
