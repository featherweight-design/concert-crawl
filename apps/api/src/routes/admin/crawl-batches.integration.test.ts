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
  CrawlBatchPage,
} from '@concert-crawl/types';
import { createApp } from '../../app.js';
import {
  clearTables,
  seedUserProfile,
  seedVenue,
} from '../../test/helpers/seed.js';
import { testDb } from '../../test/helpers/db.js';
import { addDays, denverDate } from './lib/needs-you/keys.js';
import { actorTag } from './lib/crawl-batches.js';
import { CRAWLER_DAILY_CRON_UTC } from '../../lib/crawl-schedule.js';

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

  it('keeps only what the RESULT chip calls Not OK for not_ok: amber Done, Failed and Didn’t start', async () => {
    setAuth('admin');
    const levitt = await seedVenue({ name: 'Levitt', slug: 'levitt' });
    const bluebird = await seedVenue({ name: 'Bluebird', slug: 'bluebird' });
    const failed = { status: 'failed' as const, reason: 'timeout' as const };
    // 8: all OK. 7: green Done with one failed venue. 6: amber, one blocked.
    // 5: Failed, no venue read. 4: didn't start. 3: retried, every venue OK
    // after the retry. 2: retried, still blocked after it (amber).
    await seedRun(levitt.id, nightAt(8));
    await seedRun(bluebird.id, nightAt(8));
    await seedRun(levitt.id, nightAt(7));
    await seedRun(bluebird.id, nightAt(7), failed);
    await seedRun(levitt.id, nightAt(6));
    await seedRun(bluebird.id, nightAt(6), {
      status: 'failed',
      reason: 'blocked_http',
    });
    await seedRun(levitt.id, nightAt(5), failed);
    await seedRun(bluebird.id, nightAt(5), failed);
    await seedRun(levitt.id, nightAt(3), failed);
    await seedRun(bluebird.id, nightAt(3));
    await seedRun(levitt.id, nightAt(3, 70));
    await seedRun(levitt.id, nightAt(2), failed);
    await seedRun(bluebird.id, nightAt(2));
    await seedRun(levitt.id, nightAt(2, 70), {
      status: 'failed',
      reason: 'blocked_http',
    });

    const res = await get('?kind=not_ok');
    expect(res.status).toBe(200);
    const body: { data: CrawlBatch[] } = await res.json();
    const nights = body.data.map((batch) => batch.night);
    for (const days of [6, 5, 4, 2]) {
      expect(nights).toContain(denverDate(nightAt(days)));
    }
    for (const days of [8, 7, 3]) {
      expect(nights).not.toContain(denverDate(nightAt(days)));
    }
    // The retried night is retried, and its first wave had a failure.
    const all: { data: CrawlBatch[] } = await (await get('?kind=all')).json();
    expect(
      all.data.find((batch) => batch.night === denverDate(nightAt(3))),
    ).toMatchObject({ retried: true, counts: { failed: 1 } });
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

  it('names no next crawl outside production, which starts none', async () => {
    setAuth('admin');
    vi.stubEnv('VERCEL_TARGET_ENV', 'staging');
    try {
      const res = await app.request('/v1/admin/crawl/estimate');
      const body: { data: CrawlAllEstimate } = await res.json();
      expect(body.data.nextCrawlAt).toBeNull();
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it('says when the next daily crawl runs in production', async () => {
    setAuth('admin');
    vi.stubEnv('VERCEL_TARGET_ENV', 'production');
    const before = Date.now();
    let nextCrawlAt: string | null;
    try {
      const res = await app.request('/v1/admin/crawl/estimate');
      const body: { data: CrawlAllEstimate } = await res.json();
      nextCrawlAt = body.data.nextCrawlAt;
    } finally {
      vi.unstubAllEnvs();
    }
    if (nextCrawlAt === null) throw new Error('expected a next crawl');
    const next = new Date(nextCrawlAt);
    // The daily cron's time, strictly ahead and within a day.
    expect(next.toISOString()).toBe(nextCrawlAt);
    expect([next.getUTCHours(), next.getUTCMinutes()]).toEqual([
      CRAWLER_DAILY_CRON_UTC.hour,
      CRAWLER_DAILY_CRON_UTC.minute,
    ]);
    expect(next.getTime()).toBeGreaterThan(before);
    expect(next.getTime() - before).toBeLessThanOrEqual(24 * 60 * 60 * 1000);
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
    expect((await get('?before=yesterday')).status).toBe(400);
  });

  describe('the list fields', () => {
    const seedByHand = async () => {
      const ball = await seedVenue({ name: 'Ball Arena', slug: 'ball-arena' });
      const levitt = await seedVenue({ name: 'Levitt', slug: 'levitt' });
      const hughAt = new Date(Date.now() - 3 * 60 * 60 * 1000);
      const otherAt = new Date(Date.now() - 60 * 60 * 1000);
      const ballRun = await seedRun(ball.id, new Date(hughAt.getTime() + 5e3), {
        llmCostUsd: 0.25,
      });
      const levittRun = await seedRun(
        levitt.id,
        new Date(hughAt.getTime() + 9e3),
        { status: 'failed', reason: 'blocked_http', llmCostUsd: 0.5 },
      );
      // Crawl all writes its triggers in one statement: one created_at.
      await testDb.insert(crawlTriggers).values([
        {
          venueId: ball.id,
          triggeredBy: 'user_hugh',
          status: 'done',
          crawlRunId: ballRun,
          createdAt: hughAt,
        },
        {
          venueId: levitt.id,
          triggeredBy: 'user_hugh',
          status: 'done',
          crawlRunId: levittRun,
          createdAt: hughAt,
        },
        {
          venueId: ball.id,
          triggeredBy: 'user_nohandle',
          status: 'pending',
          createdAt: otherAt,
        },
      ]);
      await seedUserProfile('user_hugh', { handle: 'hugh' });
      return { hughAt, otherAt };
    };

    it('sends cost, Crawl all, the one venue, the @handle and a link key, and never an email', async () => {
      setAuth('admin');
      const { hughAt, otherAt } = await seedByHand();

      const res = await get('?kind=by_hand');
      const text = await res.text();
      const body: CrawlBatchPage = JSON.parse(text);
      expect(body.data).toHaveLength(2);
      const [recrawl, crawlAll] = body.data;
      expect(crawlAll).toMatchObject({
        actor: 'user_hugh',
        actorHandle: 'hugh',
        crawlAll: true,
        venueName: null,
        costUsd: 0.75,
        linkKey: `run:${Math.floor(hughAt.getTime() / 1000)}:${actorTag('user_hugh')}`,
        counts: { ok: 1, notOk: 1, blocked: 1, failed: 0 },
        retry: null,
      });
      expect(recrawl).toMatchObject({
        actor: 'user_nohandle',
        actorHandle: null,
        crawlAll: false,
        venueName: 'Ball Arena',
        costUsd: 0,
        linkKey: `run:${Math.floor(otherAt.getTime() / 1000)}:${actorTag('user_nohandle')}`,
      });
      expect(text).not.toMatch(/email/i);
      expect(text).not.toContain('@');
      expect(text).not.toContain('errorMessage');
    });

    it('looks a by-hand batch up by its link key, with the handle, and 404s an unknown second', async () => {
      setAuth('admin');
      const { hughAt } = await seedByHand();
      const epoch = Math.floor(hughAt.getTime() / 1000);
      const tagged = `run:${epoch}:${actorTag('user_hugh')}`;

      const res = await get(`/${tagged}`);
      expect(res.status).toBe(200);
      const body: { data: CrawlBatchDetail } = await res.json();
      expect(body.data).toMatchObject({
        key: `by_hand:user_hugh:${epoch}`,
        linkKey: tagged,
        actorHandle: 'hugh',
        crawlAll: true,
      });
      expect(body.data.runs).toHaveLength(2);
      // The bare second still opens it; another actor's tag does not.
      expect((await get(`/run:${epoch}`)).status).toBe(200);
      expect(
        (await get(`/run:${epoch}:${actorTag('user_nohandle')}`)).status,
      ).toBe(404);
      expect((await get(`/run:${epoch - 1}`)).status).toBe(404);
    });

    it('splits a retried night into its retry wave, keeping retried folded', async () => {
      setAuth('admin');
      const venue = await seedVenue({ name: 'Levitt', slug: 'levitt' });
      await seedRun(venue.id, nightAt(1), {
        status: 'failed',
        reason: 'error',
      });
      await seedRun(venue.id, nightAt(1, 70));

      const body: CrawlBatchPage = await (await get('?kind=nightly')).json();
      const night = body.data.find((batch) => !batch.didntStart);
      expect(night).toMatchObject({
        retried: true,
        counts: { total: 2, failed: 1, ok: 1 },
        retry: {
          at: nightAt(1, 70).toISOString(),
          counts: { total: 1, ok: 1 },
        },
      });
    });
  });

  describe('paging', () => {
    // One scheduled run on each of these nights, in one insert.
    const seedNights = async (
      venueId: string,
      daysAgo: number[],
      over: Partial<typeof crawlRuns.$inferInsert> = {},
    ) => {
      await testDb.insert(crawlRuns).values(
        daysAgo.map((days) => ({
          venueId,
          status: 'success' as const,
          createdAt: nightAt(days),
          ...over,
        })),
      );
    };
    const range = (from: number, to: number): number[] =>
      Array.from({ length: to - from + 1 }, (_, index) => from + index);
    const nightKey = (daysAgo: number) =>
      `nightly:${denverDate(nightAt(daysAgo))}`;

    // Every page of a query, following nextBefore until hasMore is false.
    const pageAll = async (query: string, limit: number) => {
      const pages: CrawlBatchPage[] = [];
      let before: string | null = null;
      for (let page = 0; page < 40; page += 1) {
        const suffix: string = before === null ? '' : `&before=${before}`;
        const res = await get(`?limit=${limit}&${query}${suffix}`);
        expect(res.status).toBe(200);
        const body: CrawlBatchPage = await res.json();
        expect(body.data.length).toBeLessThanOrEqual(limit);
        pages.push(body);
        if (!body.hasMore) {
          expect(body.nextBefore).toBeNull();
          const keys = pages.flatMap((each) =>
            each.data.map((batch) => batch.key),
          );
          // No batch twice.
          expect(new Set(keys).size).toBe(keys.length);
          return { pages, keys, batches: pages.flatMap((each) => each.data) };
        }
        before = body.nextBefore;
        expect(before).not.toBeNull();
      }
      throw new Error('paging never ended');
    };

    it('widens for a sparse not_ok filter, and a short page with history continues from its floor', async () => {
      setAuth('admin');
      const venue = await seedVenue({ name: 'Levitt', slug: 'levitt' });
      await seedNights(
        venue.id,
        range(0, 100).filter((days) => days !== 60),
      );
      await seedNights(venue.id, [60], { status: 'failed', reason: 'error' });

      const { pages, keys } = await pageAll('kind=not_ok', 2);
      expect(keys).toEqual([nightKey(60)]);
      // The newest 40-odd days hold nothing Not OK even after widening, so
      // the first page is short with history behind it.
      expect(pages[0]).toMatchObject({ data: [], hasMore: true });
      expect(pages.length).toBeGreaterThan(1);
    });

    it('fills not_ok pages with Not OK batches only, past green nights with a failure', async () => {
      setAuth('admin');
      const levitt = await seedVenue({ name: 'Levitt', slug: 'levitt' });
      const bluebird = await seedVenue({ name: 'Bluebird', slug: 'bluebird' });
      const blocked = [5, 11, 17];
      const allFailed = [8];
      // Green Done nights with one failed venue: they once took the pages'
      // places and the web dropped them, leaving pages sparse or empty.
      const greenFailed = [3, 4, 6, 9, 12, 15, 18, 20];
      await seedNights(
        levitt.id,
        range(0, 30).filter((days) => days !== 8),
      );
      await seedNights(
        bluebird.id,
        range(0, 30).filter(
          (days) => ![...blocked, ...allFailed, ...greenFailed].includes(days),
        ),
      );
      await seedNights(bluebird.id, greenFailed, {
        status: 'failed',
        reason: 'timeout',
      });
      await seedNights(bluebird.id, blocked, {
        status: 'failed',
        reason: 'blocked_http',
      });
      await seedNights(levitt.id, allFailed, {
        status: 'failed',
        reason: 'timeout',
      });
      await seedNights(bluebird.id, allFailed, {
        status: 'failed',
        reason: 'timeout',
      });

      for (const limit of [1, 2, 3]) {
        const { pages, keys } = await pageAll('kind=not_ok', limit);
        expect(keys).toEqual([5, 8, 11, 17].map(nightKey));
        // No gaps: every page before the last is full.
        for (const page of pages.slice(0, -1)) {
          expect(page.data).toHaveLength(limit);
        }
      }
    });

    it('shows an outage once, as Didn’t start, wherever the page edges fall', async () => {
      setAuth('admin');
      const venue = await seedVenue({ name: 'Levitt', slug: 'levitt' });
      const outage = range(10, 14);
      await seedNights(
        venue.id,
        range(0, 40).filter((days) => !outage.includes(days)),
      );

      for (const limit of [2, 3, 7]) {
        const { batches } = await pageAll('kind=all', limit);
        for (const days of range(1, 40)) {
          expect(
            batches.filter((batch) => batch.key === nightKey(days)),
          ).toHaveLength(1);
        }
        for (const days of outage) {
          expect(
            batches.find((batch) => batch.key === nightKey(days))?.didntStart,
          ).toBe(true);
        }
        const notOk = await pageAll('kind=not_ok', limit);
        expect([...notOk.keys].sort()).toEqual(outage.map(nightKey).sort());
      }
    });

    it('keeps a by-hand burst between two nights on exactly one page', async () => {
      setAuth('admin');
      const venue = await seedVenue({ name: 'Levitt', slug: 'levitt' });
      await seedNights(venue.id, range(0, 10));
      const at = nightAt(5, 120);
      const run = await seedRun(venue.id, new Date(at.getTime() + 20_000));
      await testDb.insert(crawlTriggers).values({
        venueId: venue.id,
        triggeredBy: 'user_admin',
        status: 'done',
        crawlRunId: run,
        createdAt: at,
      });

      for (const limit of [1, 2]) {
        const { batches } = await pageAll('kind=all', limit);
        const byHand = batches.filter((batch) => batch.kind === 'by_hand');
        expect(byHand).toHaveLength(1);
        expect(byHand[0]?.counts.total).toBe(1);
        // Its run is not filed under the night as well.
        expect(
          batches.find((batch) => batch.key === nightKey(5))?.counts.total,
        ).toBe(1);
        for (const days of range(1, 10)) {
          expect(batches.map((batch) => batch.key)).toContain(nightKey(days));
        }
      }
    });
  });
});
