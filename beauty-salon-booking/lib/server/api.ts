import 'server-only';

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
