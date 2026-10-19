import { api, RequestError, session } from '@/api/client';

type Call = { url: string; init?: RequestInit };

/** Minimal fetch stub: a queue of responses per URL suffix. */
function mockFetch(handlers: Record<string, (call: Call) => { status: number; body?: unknown }>) {
  const calls: Call[] = [];
  global.fetch = jest.fn(async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    const key = Object.keys(handlers).find(k => url.endsWith(k));
    if (!key) throw new Error(`unexpected fetch ${url}`);
    const { status, body } = handlers[key]({ url, init });
    return { ok: status < 400, status, json: async () => body } as Response;
  }) as unknown as typeof fetch;
  return calls;
}

const authHeader = (c: Call) => (c.init?.headers as Record<string, string> | undefined)?.Authorization;

beforeEach(async () => {
  await session.clear();
});

it('sends the access token and parses JSON', async () => {
  await session.save({ accessToken: 'a1', refreshToken: 'r1' });
  const calls = mockFetch({ '/auth/me': () => ({ status: 200, body: { user: { id: 'u' } } }) });
  await expect(api.get('/auth/me')).resolves.toEqual({ user: { id: 'u' } });
  expect(authHeader(calls[0])).toBe('Bearer a1');
});

it('refreshes once on 401 and retries with the new token', async () => {
  await session.save({ accessToken: 'old', refreshToken: 'r1' });
  let meCalls = 0;
  const calls = mockFetch({
    '/auth/me': c => (++meCalls, authHeader(c) === 'Bearer new' ? { status: 200, body: { ok: true } } : { status: 401, body: {} }),
    '/auth/refresh': () => ({ status: 200, body: { accessToken: 'new', refreshToken: 'r2', user: {} } }),
  });

  // Two requests fail at the same time; only one refresh should happen.
  await Promise.all([api.get('/auth/me'), api.get('/auth/me')]);
  expect(calls.filter(c => c.url.endsWith('/auth/refresh'))).toHaveLength(1);
  expect(session.refreshToken).toBe('r2');
});

it('signs out when the refresh token is rejected', async () => {
  await session.save({ accessToken: 'old', refreshToken: 'bad' });
  const expired = jest.fn();
  const off = session.onExpired(expired);
  mockFetch({
    '/bookings': () => ({ status: 401, body: { code: 'UNAUTHORIZED', message: 'Session expired' } }),
    '/auth/refresh': () => ({ status: 401, body: {} }),
  });
  await expect(api.get('/bookings')).rejects.toBeInstanceOf(RequestError);
  expect(expired).toHaveBeenCalledTimes(1);
  expect(session.refreshToken).toBeNull();
  off();
});

it('turns API errors and network failures into readable messages', async () => {
  mockFetch({
    '/bookings': () => ({
      status: 409,
      body: { code: 'SLOT_UNAVAILABLE', message: 'Sorry, that time is no longer available.' },
    }),
  });
  await expect(api.post('/bookings', {})).rejects.toMatchObject({ status: 409, code: 'SLOT_UNAVAILABLE' });

  global.fetch = jest.fn(async () => {
    throw new TypeError('Network request failed');
  }) as unknown as typeof fetch;
  await expect(api.get('/salon')).rejects.toMatchObject({ code: 'NETWORK' });
});
