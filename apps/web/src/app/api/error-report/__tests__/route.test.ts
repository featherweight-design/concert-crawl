import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

interface AuthStub {
  userId: string | null;
  getToken: () => Promise<string | null>;
}

const authMock = vi.hoisted(() => vi.fn<() => Promise<AuthStub>>());
vi.mock('@/lib/auth', () => ({ auth: authMock }));

const fetchMock =
  vi.fn<(url: string, init: RequestInit) => Promise<Response>>();

const report = {
  category: 'bug',
  message: 'Opening a show. It went blank.',
  pageUrl: '/venues/bluebird-theater',
  metadata: {
    source: 'error',
    build: '1.442.0',
    device: 'Safari on iPhone',
    doing: 'Opening a show',
    digest: '2849204133',
  },
};

const makeRequest = (
  body: unknown,
  contentType = 'application/json',
): Request =>
  new Request('http://localhost:3000/api/error-report', {
    method: 'POST',
    headers: { 'content-type': contentType },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });

const signedIn = () =>
  authMock.mockResolvedValue({
    userId: 'user_1',
    getToken: async () => 'session-token',
  });

const importRoute = async () => (await import('../route')).POST;

beforeEach(() => {
  authMock.mockReset();
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('POST /api/error-report', () => {
  it('answers a signed-out caller with 401 JSON and never calls the API', async () => {
    authMock.mockResolvedValue({ userId: null, getToken: async () => null });
    const POST = await importRoute();

    const res = await POST(makeRequest(report));

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ success: false, error: 'signed_out' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('answers 401 when the session yields no token', async () => {
    authMock.mockResolvedValue({
      userId: 'user_1',
      getToken: async () => null,
    });
    const POST = await importRoute();

    const res = await POST(makeRequest(report));

    expect(res.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('forwards the report to /v1/feedback with the bearer and passes the answer through', async () => {
    signedIn();
    fetchMock.mockResolvedValue(
      Response.json({ success: true }, { status: 201 }),
    );
    const POST = await importRoute();

    const res = await POST(makeRequest(report));

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ success: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toMatch(/\/v1\/feedback$/);
    expect(init?.method).toBe('POST');
    expect(init?.headers).toEqual({
      'Content-Type': 'application/json',
      Authorization: 'Bearer session-token',
    });
    expect(init?.signal).toBeInstanceOf(AbortSignal);
    expect(JSON.parse(String(init?.body))).toEqual(report);
  });

  it.each([401, 422, 429, 500, 503])(
    'passes an upstream %i through with its body',
    async (status) => {
      signedIn();
      const body = { success: false, error: `upstream ${status}` };
      fetchMock.mockResolvedValue(
        Response.json(body, {
          status,
          headers: status === 429 ? { 'Retry-After': '3600' } : {},
        }),
      );
      const POST = await importRoute();

      const res = await POST(makeRequest(report));

      expect(res.status).toBe(status);
      expect(await res.json()).toEqual(body);
      if (status === 429) expect(res.headers.get('retry-after')).toBe('3600');
    },
  );

  it('keeps the upstream status when its body is not JSON', async () => {
    signedIn();
    fetchMock.mockResolvedValue(
      new Response('<html>Bad gateway</html>', { status: 502 }),
    );
    const POST = await importRoute();

    const res = await POST(makeRequest(report));

    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({
      success: false,
      error: 'upstream_unreadable',
    });
  });

  it('answers 504 when the API times out', async () => {
    signedIn();
    fetchMock.mockRejectedValue(
      new DOMException('signal timed out', 'TimeoutError'),
    );
    const POST = await importRoute();

    const res = await POST(makeRequest(report));

    expect(res.status).toBe(504);
    expect(await res.json()).toEqual({
      success: false,
      error: 'upstream_timeout',
    });
  });

  it('answers 502 when the API cannot be reached', async () => {
    signedIn();
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));
    const POST = await importRoute();

    const res = await POST(makeRequest(report));

    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({
      success: false,
      error: 'upstream_unreachable',
    });
  });

  it.each([
    ['unparseable JSON', '{not json'],
    ['another feedback category', { ...report, category: 'idea' }],
    ['an unknown top-level key', { ...report, extra: 1 }],
    [
      'an unknown metadata key',
      { ...report, metadata: { ...report.metadata, screenshot: 'data:' } },
    ],
    [
      'a malformed error id',
      { ...report, metadata: { ...report.metadata, digest: 'not an id!' } },
    ],
    ['an empty message', { ...report, message: '' }],
  ])('answers 400 for %s without calling the API', async (_label, body) => {
    signedIn();
    const POST = await importRoute();

    const res = await POST(makeRequest(body));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      success: false,
      error: 'Invalid input',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('answers 400 for a body that is not sent as JSON', async () => {
    signedIn();
    const POST = await importRoute();

    const res = await POST(makeRequest(report, 'text/plain'));

    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
