import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// React's cache() only dedupes inside a request; outside one it is a plain call.
vi.mock('react', async (importOriginal) => {
  const actual: Record<string, unknown> = await importOriginal();
  return { ...actual, cache: <Fn>(fn: Fn) => fn };
});

import {
  CATALOG_REVALIDATE_SECONDS,
  CATALOG_TAG,
  EVENT_REVALIDATE_SECONDS,
  catalogKey,
  mountainDate,
  publicCatalogGet,
} from './catalog-cache';

const ok = (data: unknown) =>
  new Response(JSON.stringify({ success: true, data }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });

type Call = { url: string; init: RequestInit };

describe('catalog cache', () => {
  let calls: Call[];
  let generation: () => Response | Promise<Response>;
  let payload: () => Response | Promise<Response>;

  beforeEach(() => {
    calls = [];
    generation = () => ok({ generation: '1700000000000' });
    payload = () => ok(['rock']);
    process.env['INTERNAL_API_SECRET'] = 'secret-service-key';
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init: RequestInit = {}) => {
        calls.push({ url, init });
        return url.endsWith('/v1/catalog/generation')
          ? generation()
          : payload();
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env['INTERNAL_API_SECRET'];
    delete process.env['VERCEL_DEPLOYMENT_ID'];
  });

  const headersOf = (call: Call): Record<string, string> =>
    Object.fromEntries(
      Object.entries((call.init.headers ?? {}) as Record<string, string>).map(
        ([key, value]) => [key.toLowerCase(), value],
      ),
    );

  it('never sends an identity: no Authorization, no service key, on any call', async () => {
    await publicCatalogGet<string[]>('/v1/events/genres');
    expect(calls.length).toBeGreaterThan(0);
    for (const call of calls) {
      const headers = headersOf(call);
      expect(headers).not.toHaveProperty('authorization');
      expect(headers).not.toHaveProperty('x-service-key');
    }
  });

  it('asks Next to cache with the ceiling and the catalog tag', async () => {
    await publicCatalogGet<string[]>('/v1/venues');
    const read = calls.find((call) => call.url.endsWith('/v1/venues'));
    expect(read?.init.next).toEqual({
      revalidate: CATALOG_REVALIDATE_SECONDS,
      tags: [CATALOG_TAG],
    });
    expect(read?.init.method).toBe('GET');
  });

  it('puts generation, deployment id and Mountain date in the key header', async () => {
    process.env['VERCEL_DEPLOYMENT_ID'] = 'dpl_abc';
    await publicCatalogGet<string[]>('/v1/venues');
    const read = calls.find((call) => call.url.endsWith('/v1/venues'));
    expect(headersOf(read as Call)['x-catalog-key']).toBe(
      `g1700000000000.bdpl_abc.d${mountainDate()}`,
    );
  });

  it('gives events the short ceiling and venues and genres the long one', async () => {
    await publicCatalogGet('/v1/events?limit=10');
    await publicCatalogGet('/v1/events/abc');
    await publicCatalogGet('/v1/events/genres');
    const revalidate = (suffix: string) =>
      calls.find((call) => call.url.endsWith(suffix))?.init.next?.revalidate;
    expect(revalidate('/v1/events?limit=10')).toBe(EVENT_REVALIDATE_SECONDS);
    expect(revalidate('/v1/events/abc')).toBe(EVENT_REVALIDATE_SECONDS);
    expect(revalidate('/v1/events/genres')).toBe(CATALOG_REVALIDATE_SECONDS);
  });

  it('skips the cache, and still answers, when the generation cannot be read', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    for (const broken of [
      () => new Response('boom', { status: 500 }),
      () => {
        throw new Error('network down');
      },
      () => ok({ generation: 12 }),
    ]) {
      generation = broken;
      calls = [];
      expect(await catalogKey()).toBeNull();
      await expect(publicCatalogGet<string[]>('/v1/venues')).resolves.toEqual([
        'rock',
      ]);
      const read = calls.find((call) => call.url.endsWith('/v1/venues'));
      expect(read?.init.next).toBeUndefined();
      expect(headersOf(read as Call)).not.toHaveProperty('x-catalog-key');
    }
  });

  it('reads a free-text search uncached, so a term cannot fill the cache', async () => {
    await publicCatalogGet('/v1/events?q=anything&limit=5');
    const read = calls.find((call) => call.url.includes('q=anything'));
    expect(read?.init.next).toBeUndefined();
  });

  it('throws on a bad answer so Next never stores it', async () => {
    payload = () => new Response('Bad gateway', { status: 502 });
    await expect(publicCatalogGet('/v1/venues')).rejects.toThrow();
    payload = () => new Response('<html>', { status: 200 });
    await expect(publicCatalogGet('/v1/venues')).rejects.toThrow();
  });

  it('keys "today" by the Mountain Time date, not the UTC one', () => {
    // 03:30Z on the 13th is still the evening of the 12th in Denver.
    expect(mountainDate(new Date('2026-11-13T03:30:00Z'))).toBe('2026-11-12');
    // Across the fall DST change (2026-11-01): 06:30Z is 23:30 MDT on Oct 31.
    expect(mountainDate(new Date('2026-11-01T06:30:00Z'))).toBe('2026-10-31');
    expect(mountainDate(new Date('2026-11-01T07:30:00Z'))).toBe('2026-11-01');
  });
});
