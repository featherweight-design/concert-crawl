import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockInstance,
} from 'vitest';
import { perfRoute, redactQuery, startApiTimer } from './timing';

type LogSpy = { mock: { calls: unknown[][] } };

const lines = (spy: LogSpy): Record<string, unknown>[] =>
  spy.mock.calls.map(
    (call) => JSON.parse(String(call[0])) as Record<string, unknown>,
  );

describe('perf timing', () => {
  const original = process.env['PERF_TIMING'];
  let spy: MockInstance<typeof console.log>;

  beforeEach(() => {
    spy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });
  afterEach(() => {
    spy.mockRestore();
    if (original === undefined) delete process.env['PERF_TIMING'];
    else process.env['PERF_TIMING'] = original;
  });

  it('logs nothing while the switch is off', async () => {
    delete process.env['PERF_TIMING'];
    const timer = startApiTimer('GET', '/v1/events', true);
    timer.headers(200);
    timer.done();
    expect(await perfRoute('events', async () => 'page')()).toBe('page');
    expect(spy).not.toHaveBeenCalled();
  });

  it('logs one perf.api line per call, with the query values dropped and no token', () => {
    process.env['PERF_TIMING'] = '1';
    const timer = startApiTimer('GET', '/v1/events?q=secret+term&page=2', true);
    timer.headers(200);
    timer.done();
    const [line] = lines(spy);
    expect(line).toMatchObject({
      event: 'perf.api',
      method: 'GET',
      path: '/v1/events?q&page',
      authed: true,
      status: 200,
    });
    expect(typeof line?.['ttfbMs']).toBe('number');
    expect(JSON.stringify(line)).not.toContain('secret');
  });

  it('logs a call that never got headers with its total as the first byte', () => {
    process.env['PERF_TIMING'] = '1';
    const timer = startApiTimer('POST', '/v1/watching', false);
    timer.done();
    expect(lines(spy)[0]).toMatchObject({ status: null, authed: false });
  });

  it('logs a perf.route line when the wrapped page finishes, and when it throws', async () => {
    process.env['PERF_TIMING'] = '1';
    expect(
      await perfRoute('events', async (value: number) => value + 1)(1),
    ).toBe(2);
    await expect(
      perfRoute('event-detail', async () => {
        throw new Error('boom');
      })(),
    ).rejects.toThrow('boom');
    expect(lines(spy).map((line) => line['route'])).toEqual([
      'events',
      'event-detail',
    ]);
  });

  it('redacts the query of a path', () => {
    expect(redactQuery('/v1/venues')).toBe('/v1/venues');
    expect(redactQuery('/v1/events?')).toBe('/v1/events');
    expect(redactQuery('/v1/events?a=1&b=&c')).toBe('/v1/events?a&b&c');
  });

  it('reduces ids and names in the path, and drops a fragment', () => {
    expect(redactQuery('/v1/artists/some-band')).toBe('/v1/artists/:id');
    expect(redactQuery('/v1/events/123?q=x#top')).toBe('/v1/events/:id?q');
    // Deeper segments are all reduced: a static name cannot be told from a slug.
    expect(redactQuery('/v1/events/genres')).toBe('/v1/events/:id');
    expect(redactQuery('/v1/events')).toBe('/v1/events');
  });

  it('logs nothing in a browser', () => {
    process.env['PERF_TIMING'] = '1';
    vi.stubGlobal('window', {});
    try {
      const timer = startApiTimer('GET', '/v1/events', false);
      timer.headers(200);
      timer.done();
      expect(spy).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
