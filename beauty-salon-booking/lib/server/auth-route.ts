import 'server-only';
import { NextResponse } from 'next/server';
import { API_URL } from './api';
import { storeSession } from './session';

export const unavailable = () =>
  NextResponse.json(
    { code: 'UNAVAILABLE', message: 'We could not reach the booking server. Please try again shortly.' },
    { status: 503 },
  );

/** Forwards login/signup to the API and turns the returned tokens into cookies. */
export async function startSession(req: Request, apiPath: '/auth/login' | '/auth/signup') {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${apiPath}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: await req.text(),
      cache: 'no-store',
    });
  } catch {
    return unavailable();
  }
  const data = await res.json();
  if (!res.ok) return NextResponse.json(data, { status: res.status });
  await storeSession(data);
  return NextResponse.json({ user: data.user }, { status: res.status });
}
