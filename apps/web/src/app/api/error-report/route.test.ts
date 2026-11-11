import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const getToken = vi.fn<() => Promise<string | null>>(async () => 'token');
vi.mock('@/lib/auth', () => ({
  auth: async () => ({ getToken }),
}));

const fetchMock = vi.fn(
  async (_url: string, _init: RequestInit) =>
    new Response(JSON.stringify({ success: true }), { status: 201 }),
);

beforeEach(() => {
  getToken.mockResolvedValue('token');
  fetchMock.mockClear();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const post = async (body: unknown) => {
  const { POST } = await import('./route');
  return POST(
    new Request('http://localhost/api/error-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }),
  );
};

const VALID = {
  errorId: '2849204133',
  doing: 'opening',
  note: 'Tapped Get tickets and it went blank.',
  page: '/venues/bluebird-theater',
  device: 'iPhone · Safari',
};

describe('POST /api/error-report', () => {
  it('answers 401 without a session and forwards nothing', async () => {
    getToken.mockResolvedValue(null);
    const res = await post(VALID);
    expect(res.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    ['malformed JSON', '{nope'],
    ['an id that is not an id', { ...VALID, errorId: 'x; drop table' }],
    ['an unknown chip', { ...VALID, doing: 'dancing' }],
    ['neither a chip nor a note', { ...VALID, doing: undefined, note: '  ' }],
    ['a note past the cap', { ...VALID, note: 'x'.repeat(1001) }],
  ])('rejects %s with 422', async (_label, body) => {
    const res = await post(body);
    expect(res.status).toBe(422);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('files a bug with the error id, device and build in /v1/feedback', async () => {
    const res = await post(VALID);
    expect(res.status).toBe(201);

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toMatch(/\/v1\/feedback$/);
    expect(new Headers(init.headers).get('Authorization')).toBe('Bearer token');
    expect(JSON.parse(String(init.body))).toEqual({
      category: 'bug',
      message: 'Tapped Get tickets and it went blank.',
      pageUrl: '/venues/bluebird-theater',
      metadata: {
        source: 'error',
        errorId: '2849204133',
        device: 'iPhone · Safari',
        build: expect.any(String),
        doing: 'Opening a show',
      },
    });
  });

  it('lets one tap stand as the message, and redacts an invite token', async () => {
    await post({
      errorId: '1',
      doing: 'myShows',
      page: '/crew/join/secret?x=1',
      device: 'Mac · Chrome',
    });
    const body = JSON.parse(String(fetchMock.mock.calls[0]![1].body));
    expect(body.message).toBe('My shows');
    expect(body.pageUrl).toBe('/crew/join/[redacted]');
  });

  it('passes an upstream refusal through, and an unreachable one as 502', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 429 }));
    expect((await post(VALID)).status).toBe(429);

    fetchMock.mockRejectedValueOnce(new Error('ECONNREFUSED'));
    expect((await post(VALID)).status).toBe(502);
  });
});
