import 'server-only';
import { headers } from 'next/headers';

/**
 * The API sees every request as coming from this Next.js server, so pass the visitor's IP
 * along. Without it, per-IP protections like the login rate limit would treat all customers
 * as one. (The API trusts one proxy hop: run it behind this app, not exposed directly.)
 */
export async function forwardedFor(): Promise<Record<string, string>> {
  const h = await headers();
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip');
  return ip ? { 'X-Forwarded-For': ip } : {};
}

/** Base URL of backend-api, e.g. http://localhost:5000/api. Only used on the server. */
export const API_URL = (process.env.API_URL ?? 'http://localhost:5000/api').replace(/\/$/, '');

/**
 * Public catalog reads for server components. Cached briefly so pages stay fast,
 * and returns null instead of throwing so a backend outage degrades gracefully.
 */
export async function getPublic<T>(path: string, revalidate = 60): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}${path}`, { next: { revalidate } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}
