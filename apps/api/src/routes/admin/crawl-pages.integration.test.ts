import { describe, it, expect, beforeEach, vi } from 'vitest';
import { gzipSync } from 'node:zlib';

const { authState } = vi.hoisted(() => ({
  authState: {
    current: null as {
      userId: string;
      sessionClaims: { metadata?: { role?: string } };
    } | null,
  },
}));

vi.mock('@hono/clerk-auth', () => ({
  clerkMiddleware: () => async (_ctx: unknown, next: () => Promise<void>) =>
    next(),
  getAuth: () => authState.current,
}));

import { crawlRunPages, crawlRuns } from '@concert-crawl/db';
import { createApp } from '../../app.js';
import { clearTables, seedVenue } from '../../test/helpers/seed.js';
import { testDb } from '../../test/helpers/db.js';

const app = createApp();

const setAuth = (role: 'admin' | 'user'): void => {
  authState.current = {
    userId: 'user_admin',
    sessionClaims: { metadata: { role } },
  };
};

const seedPage = async (
  over: Partial<typeof crawlRunPages.$inferInsert> = {},
): Promise<string> => {
  const venue = await seedVenue({ name: 'Levitt', slug: 'levitt' });
  const [run] = await testDb
    .insert(crawlRuns)
    .values({ venueId: venue.id, status: 'success' })
    .returning({ id: crawlRuns.id });
  const [page] = await testDb
    .insert(crawlRunPages)
    .values({
      crawlRunId: run?.id ?? '',
      url: 'https://levitt.example/',
      fetchMode: 'http',
      httpStatus: 200,
      bytes: 20,
      ...over,
    })
    .returning({ id: crawlRunPages.id });
  return page?.id ?? '';
};

const body = (pageId: string) =>
  app.request(`/v1/admin/crawl/pages/${pageId}/body`);

describe('GET /v1/admin/crawl/pages/:id/body', () => {
  beforeEach(async () => {
    authState.current = null;
    await clearTables();
  });

  it('is admin only', async () => {
    setAuth('user');
    expect((await body('00000000-0000-0000-0000-000000000001')).status).toBe(
      403,
    );
  });

  it('returns the inflated body as a JSON string with its expiry', async () => {
    setAuth('admin');
    const expires = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
    const id = await seedPage({
      htmlGz: gzipSync('<html>héllo</html>'),
      bodyExpiresAt: expires,
    });
    const res = await body(id);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('application/json');
    const json: {
      data: { html: string; expiresAt: string; url: string };
    } = await res.json();
    expect(json.data.html).toBe('<html>héllo</html>');
    expect(json.data.expiresAt).toBe(expires.toISOString());
    expect(json.data.url).toBe('https://levitt.example/');
  });

  it('says why there is no body: not stored, expired, or too large', async () => {
    setAuth('admin');
    const reasonOf = async (
      over: Partial<typeof crawlRunPages.$inferInsert>,
    ): Promise<string> => {
      await clearTables();
      const res = await body(await seedPage(over));
      expect(res.status).toBe(404);
      const json: { reason: string } = await res.json();
      return json.reason;
    };
    expect(await reasonOf({})).toBe('not_stored');
    expect(await reasonOf({ bodyExpiresAt: new Date(Date.now() - 1000) })).toBe(
      'expired',
    );
    expect(await reasonOf({ bodyTruncated: true })).toBe('too_large');
  });

  it('treats a body past its expiry as gone even before the sweep nulls it', async () => {
    setAuth('admin');
    const id = await seedPage({
      htmlGz: gzipSync('<html>old</html>'),
      bodyExpiresAt: new Date(Date.now() - 1000),
    });
    const res = await body(id);
    expect(res.status).toBe(404);
    expect(((await res.json()) as { reason: string }).reason).toBe('expired');
  });

  it('404s an unknown page and 400s a malformed id', async () => {
    setAuth('admin');
    expect((await body('00000000-0000-0000-0000-000000000099')).status).toBe(
      404,
    );
    expect((await body('not-a-uuid')).status).toBe(400);
  });

  it('refuses a stored body that does not inflate', async () => {
    setAuth('admin');
    const id = await seedPage({
      htmlGz: Buffer.from('not gzip data'),
      bodyExpiresAt: new Date(Date.now() + 1000),
    });
    expect((await body(id)).status).toBe(500);
  });
});
