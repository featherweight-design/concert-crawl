import { describe, it, expect, beforeEach, vi } from 'vitest';

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

import { crawlRuns, crawlTriggers } from '@concert-crawl/db';
import type {
  CrawlAllEstimate,
  CrawlBatch,
  CrawlBatchDetail,
} from '@concert-crawl/types';
import { createApp } from '../../app.js';
import { clearTables, seedVenue } from '../../test/helpers/seed.js';
import { testDb } from '../../test/helpers/db.js';
import { addDays, denverDate } from './lib/needs-you/keys.js';

const app = createApp();

const setAuth = (role: 'admin' | 'user'): void => {
  authState.current = {
    userId: 'user_admin',
    sessionClaims: { metadata: { role } },
  };
};

const get = (path: string) => app.request(`/v1/admin/crawl/batches${path}`);

// Three nights ago at 10:10Z is 3 AM Mountain (MST) or 4 AM (MDT): a scheduled
// run whichever side of DST today is.
const nightAt = (daysAgo: number, minutes = 0): Date => {
  const base = new Date();
  base.setUTCHours(10, 10 + minutes, 0, 0);
  return new Date(base.getTime() - daysAgo * 24 * 60 * 60 * 1000);
};

const seedRun = async (
  venueId: string,
  createdAt: Date,
  over: Partial<typeof crawlRuns.$inferInsert> = {},
): Promise<string> => {
  const [row] = await testDb
    .insert(crawlRuns)
    .values({ venueId, status: 'success', createdAt, ...over })
    .returning({ id: crawlRuns.id });
  return row?.id ?? '';
};

describe('admin crawl batches', () => {
  beforeEach(async () => {
    authState.current = null;
    await clearTables();
  });

  it('is admin only', async () => {
    setAuth('user');
    expect((await get('')).status).toBe(403);
    expect((await get('/nightly:2026-11-12')).status).toBe(403);
  });

  it('lists nightly batches newest first, with a derived Didn’t start between two nights', async () => {
    setAuth('admin');
    const venue = await seedVenue({ name: 'Levitt', slug: 'levitt' });
    await seedRun(venue.id, nightAt(4));
    await seedRun(venue.id, nightAt(2), {
      status: 'failed',
      reason: 'timeout',
    });

    const res = await get('?kind=nightly');
    expect(res.status).toBe(200);
    const body: { data: CrawlBatch[] } = await res.json();
    const missingNight = denverDate(nightAt(3));
    expect(body.data.map((batch) => batch.key)).toContain(
      `nightly:${missingNight}`,
    );
    const missing = body.data.find((batch) => batch.night === missingNight);
    expect(missing).toMatchObject({ didntStart: true, startedAt: null });
    expect(body.data.every((batch) => !('runs' in batch))).toBe(true);
  });

  it('keeps only batches with a failed or skipped run, and the nights that did not start, for not_ok', async () => {
    setAuth('admin');
    const venue = await seedVenue({ name: 'Levitt', slug: 'levitt' });
    await seedRun(venue.id, nightAt(4));
    await seedRun(venue.id, nightAt(2), {
      status: 'failed',
      reason: 'timeout',
    });

    const res = await get('?kind=not_ok');
    const body: { data: CrawlBatch[] } = await res.json();
    const nights = body.data.map((batch) => batch.night);
    expect(nights).toContain(denverDate(nightAt(2)));
    expect(nights).toContain(denverDate(nightAt(3)));
    expect(nights).not.toContain(denverDate(nightAt(4)));
  });

  it('groups a person’s by-hand triggers and the runs they made, apart from the nightly', async () => {
    setAuth('admin');
    const venue = await seedVenue({ name: 'Levitt', slug: 'levitt' });
    const other = await seedVenue({ name: 'Bluebird', slug: 'bluebird' });
    await seedRun(venue.id, nightAt(0));
    const at = new Date(Date.now() - 60 * 60 * 1000);
    const handRun = await seedRun(venue.id, new Date(at.getTime() + 20_000));
    await testDb.insert(crawlTriggers).values([
      {
        venueId: venue.id,
        triggeredBy: 'user_admin',
        status: 'done',
        crawlRunId: handRun,
        createdAt: at,
      },
      {
        venueId: other.id,
        triggeredBy: 'user_admin',
        status: 'pending',
        createdAt: new Date(at.getTime() + 60_000),
      },
    ]);

    const res = await get('?kind=by_hand');
    const body: { data: CrawlBatch[] } = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0]).toMatchObject({
      kind: 'by_hand',
      actor: 'user_admin',
      pending: 1,
      venueCount: 2,
    });
    expect(body.data[0]?.counts.total).toBe(1);

    const nightly: { data: CrawlBatch[] } = await (
      await get('?kind=nightly')
    ).json();
    expect(nightly.data.find((batch) => !batch.didntStart)?.counts.total).toBe(
      1,
    );
  });

  it('returns one batch with its runs, and 400s a bad key and 404s an unknown one', async () => {
    setAuth('admin');
    const venue = await seedVenue({ name: 'Levitt', slug: 'levitt' });
    const runId = await seedRun(venue.id, nightAt(1), {
      eventsFound: 12,
      errorMessage: 'x'.repeat(900),
      status: 'failed',
      reason: 'error',
    });
    const night = denverDate(nightAt(1));

    const res = await get(`/nightly:${night}`);
    expect(res.status).toBe(200);
    const body: { data: CrawlBatchDetail } = await res.json();
    expect(body.data.key).toBe(`nightly:${night}`);
    expect(body.data.runs).toHaveLength(1);
    expect(body.data.runs[0]).toMatchObject({
      id: runId,
      venueName: 'Levitt',
      status: 'failed',
      reason: 'error',
      eventsFound: 12,
    });
    expect(body.data.runs[0]?.errorMessage).toHaveLength(500);

    // A night with no runs that the list calls Didn't start has a detail too,
    // however far from the nearest run.
    await seedRun(venue.id, nightAt(5));
    const missing = await get(`/nightly:${denverDate(nightAt(3))}`);
    expect(missing.status).toBe(200);
    const missingBody: { data: CrawlBatchDetail } = await missing.json();
    expect(missingBody.data).toMatchObject({ didntStart: true, runs: [] });
    expect((await get('/nonsense')).status).toBe(400);
    expect((await get(`/nightly:${addDays(night, -60)}`)).status).toBe(404);
  });

  it('estimates Crawl all: the venues it takes, the ones it skips and why, and recent nights', async () => {
    setAuth('admin');
    const venue = (name: string, over: Parameters<typeof seedVenue>[0] = {}) =>
      seedVenue({ name, slug: name.toLowerCase(), ...over });
    const ogden = await venue('Ogden', { blockedAt: new Date() });
    const levitt = await venue('Levitt', { crawlPausedAt: new Date() });
    await venue('Hidden', { active: false });
    await venue('Fresh', { verified: false });
    await venue('Gone', { removedAt: new Date(), active: false });
    const bluebird = await venue('Bluebird');
    await seedRun(bluebird.id, nightAt(2), {
      durationMs: 60_000,
      llmCostUsd: 0.5,
    });
    await seedRun(levitt.id, nightAt(2, 10), {
      durationMs: 60_000,
      llmCostUsd: 0.25,
    });

    const res = await app.request('/v1/admin/crawl/estimate');
    expect(res.status).toBe(200);
    const body: { data: CrawlAllEstimate } = await res.json();
    // The removed venue is neither crawled nor counted.
    expect(body.data.total).toBe(5);
    expect(body.data.eligible).toBe(1);
    expect(body.data.skipped).toEqual([
      { venueId: expect.any(String), name: 'Fresh', reason: 'unverified' },
      { venueId: expect.any(String), name: 'Hidden', reason: 'hidden' },
      { venueId: levitt.id, name: 'Levitt', reason: 'paused' },
      { venueId: ogden.id, name: 'Ogden', reason: 'blocked' },
    ]);
    // One night: 10:10 to 10:21 (the second run starts at 10:20, takes 1 min).
    expect(body.data.usual).toEqual({
      durationMs: 11 * 60 * 1000,
      costUsd: 0.75,
      nights: 1,
    });
  });

  it('estimates no time or cost with no nightly history', async () => {
    setAuth('admin');
    await seedVenue({ name: 'Bluebird', slug: 'bluebird' });
    const res = await app.request('/v1/admin/crawl/estimate');
    const body: { data: CrawlAllEstimate } = await res.json();
    expect(body.data).toMatchObject({ total: 1, eligible: 1, usual: null });
  });

  it('keeps the estimate admin only', async () => {
    setAuth('user');
    expect((await app.request('/v1/admin/crawl/estimate')).status).toBe(403);
  });

  it('refuses a limit out of range', async () => {
    setAuth('admin');
    expect((await get('?limit=0')).status).toBe(400);
    expect((await get('?limit=101')).status).toBe(400);
    expect((await get('?kind=weekly')).status).toBe(400);
  });
});
