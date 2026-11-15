import { describe, it, expect, beforeEach, vi } from 'vitest';

interface FakeAuth {
  userId: string;
  sessionClaims: { metadata?: { role?: string } };
}

const { authState } = vi.hoisted(() => {
  const state: { current: FakeAuth | null } = { current: null };
  return { authState: state };
});

vi.mock('@hono/clerk-auth', () => ({
  clerkMiddleware: () => async (_c: unknown, next: () => Promise<void>) =>
    next(),
  getAuth: () => authState.current,
}));

import { z } from 'zod';
import { crawlTriggers } from '@concert-crawl/db';
import { createApp } from '../../app.js';
import {
  clearTables,
  seedCrawlRun,
  seedVenue,
} from '../../test/helpers/seed.js';
import { testDb } from '../../test/helpers/db.js';

const app = createApp();

const MINUTE = 60_000;

const seedTrigger = async (
  venueId: string,
  overrides: Partial<typeof crawlTriggers.$inferInsert> = {},
) => {
  const [row] = await testDb
    .insert(crawlTriggers)
    .values({ venueId, ...overrides })
    .returning();
  if (!row) throw new Error('seedTrigger: insert returned no rows');
  return row;
};

/** Three full runs of `durationMs`, so the venue's median is exactly that. */
const seedHistory = async (venueId: string, durationMs: number) => {
  for (let i = 0; i < 3; i += 1) {
    await seedCrawlRun(venueId, { durationMs });
  }
};

/** A time `minutes` before now. */
const ago = (minutes: number): Date => new Date(Date.now() - minutes * MINUTE);

// The response's shape, checked rather than cast. Page progress and
// startedAt sit on the trigger; `progress` carries only derived values.
const bodySchema = z.object({
  data: z.object({
    id: z.string(),
    status: z.enum(['pending', 'processing', 'done', 'failed']),
    pagesDone: z.number().nullable(),
    pagesTotal: z.number().nullable(),
    progressAt: z.string().nullable(),
    startedAt: z.string().nullable(),
    progress: z
      .object({
        queuePosition: z.number(),
        runningAhead: z.boolean(),
        estimateMs: z.number().nullable(),
        waitMs: z.number().nullable(),
      })
      .strict(),
  }),
});

const readTrigger = async (id: string) => {
  const res = await app.request(`/v1/admin/crawl/triggers/${id}`);
  expect(res.status).toBe(200);
  const body = bodySchema.parse(await res.json());
  expect(body.data.id).toBe(id);
  return body.data;
};

const readProgress = async (id: string) => (await readTrigger(id)).progress;

describe('GET /v1/admin/crawl/triggers/:id progress (A3/03 re-crawl states)', () => {
  beforeEach(async () => {
    authState.current = {
      userId: 'admin_1',
      sessionClaims: { metadata: { role: 'admin' } },
    };
    await clearTables();
  });

  it('counts the pending triggers created earlier, any venue, and a run in progress ahead', async () => {
    const venue = await seedVenue();
    const other = await seedVenue({ name: 'Other', slug: 'other' });
    await seedTrigger(other.id, { createdAt: ago(5) });
    await seedTrigger(venue.id, { createdAt: ago(4) });
    await seedTrigger(other.id, { status: 'processing', createdAt: ago(10) });
    await seedTrigger(other.id, { status: 'done', createdAt: ago(9) });
    const mine = await seedTrigger(venue.id, { createdAt: ago(3) });
    // Queued after this one: never ahead of it.
    await seedTrigger(other.id, { createdAt: ago(1) });

    const trigger = await readTrigger(mine.id);

    expect(trigger).toMatchObject({
      status: 'pending',
      pagesDone: null,
      pagesTotal: null,
      startedAt: null,
      progress: { queuePosition: 2, runningAhead: true },
    });
  });

  it('reads 0 and nothing running when the trigger is next', async () => {
    const venue = await seedVenue();
    const mine = await seedTrigger(venue.id);

    expect(await readProgress(mine.id)).toMatchObject({
      queuePosition: 0,
      runningAhead: false,
    });
  });

  it('does not count a processing trigger gone stale as running', async () => {
    const venue = await seedVenue();
    const other = await seedVenue({ name: 'Other', slug: 'other' });
    // Untouched for 31 min: dead, and reaped by the crawler's next run.
    await seedTrigger(other.id, {
      status: 'processing',
      createdAt: ago(40),
      startedAt: ago(40),
      updatedAt: ago(31),
    });
    const mine = await seedTrigger(venue.id);

    expect(await readProgress(mine.id)).toEqual({
      queuePosition: 0,
      runningAhead: false,
      estimateMs: null,
      waitMs: 0,
    });
  });

  it('reports the page progress of a processing trigger', async () => {
    const venue = await seedVenue();
    const progressAt = ago(0.5);
    const startedAt = ago(1);
    // A pending trigger older than this one would be ahead only if pending.
    await seedTrigger(venue.id, { createdAt: ago(4) });
    const mine = await seedTrigger(venue.id, {
      status: 'processing',
      createdAt: ago(3),
      startedAt,
      pagesDone: 2,
      pagesTotal: 4,
      progressAt,
    });

    const trigger = await readTrigger(mine.id);

    expect(trigger).toMatchObject({
      status: 'processing',
      pagesDone: 2,
      pagesTotal: 4,
      progressAt: progressAt.toISOString(),
      startedAt: startedAt.toISOString(),
    });
    expect(trigger.progress).toEqual({
      queuePosition: 0,
      runningAhead: false,
      estimateMs: null,
      waitMs: null,
    });
  });

  it('gives no estimate with fewer than 3 full runs', async () => {
    const venue = await seedVenue();
    await seedCrawlRun(venue.id, { durationMs: 60_000 });
    await seedCrawlRun(venue.id, { durationMs: 90_000 });
    const mine = await seedTrigger(venue.id);

    expect((await readProgress(mine.id)).estimateMs).toBeNull();
  });

  it('gives no estimate for a forced re-extraction', async () => {
    const venue = await seedVenue();
    await seedHistory(venue.id, 60_000);
    const mine = await seedTrigger(venue.id, { force: true });

    expect((await readProgress(mine.id)).estimateMs).toBeNull();
  });

  it('estimates the median of the full runs, leaving out trial, failed and skipped runs', async () => {
    const venue = await seedVenue();
    const other = await seedVenue({ name: 'Other', slug: 'other' });
    for (const durationMs of [40_000, 120_000, 60_000, 100_000, 80_000]) {
      await seedCrawlRun(venue.id, { durationMs });
    }
    await seedCrawlRun(venue.id, { durationMs: 1_000, trial: true });
    await seedCrawlRun(venue.id, { durationMs: 1_000, trial: true });
    await seedCrawlRun(venue.id, {
      status: 'failed',
      reason: 'timeout',
      durationMs: 1_000,
    });
    await seedCrawlRun(venue.id, {
      status: 'skipped',
      reason: 'page_unchanged',
      durationMs: 1_000,
    });
    await seedCrawlRun(other.id, { durationMs: 1_000 });
    const mine = await seedTrigger(venue.id);

    expect((await readProgress(mine.id)).estimateMs).toBe(80_000);
  });

  it('reads only the last 10 full runs', async () => {
    const venue = await seedVenue();
    // Three old slow runs, then ten recent quick ones.
    for (let i = 0; i < 3; i += 1) {
      await seedCrawlRun(venue.id, {
        durationMs: 900_000,
        createdAt: ago(1000 + i),
      });
    }
    for (let i = 0; i < 10; i += 1) {
      await seedCrawlRun(venue.id, {
        durationMs: 30_000 + i * 1_000,
        createdAt: ago(10 + i),
      });
    }
    const mine = await seedTrigger(venue.id);

    // The median of 30 s .. 39 s: (34 s + 35 s) / 2.
    expect((await readProgress(mine.id)).estimateMs).toBe(34_500);
  });

  it('drops the estimate once the trigger has settled', async () => {
    const venue = await seedVenue();
    await seedHistory(venue.id, 50_000);
    const mine = await seedTrigger(venue.id, {
      status: 'done',
      pagesDone: 4,
      pagesTotal: 4,
    });

    const trigger = await readTrigger(mine.id);

    expect(trigger).toMatchObject({ status: 'done', pagesDone: 4 });
    expect(trigger.progress).toEqual({
      queuePosition: 0,
      runningAhead: false,
      estimateMs: null,
      waitMs: null,
    });
  });

  describe('waitMs', () => {
    it('adds what is left of the run in progress to the typical time of each trigger ahead', async () => {
      const running = await seedVenue({ name: 'Running', slug: 'running' });
      const queued = await seedVenue({ name: 'Queued', slug: 'queued' });
      const venue = await seedVenue();
      await seedHistory(running.id, 60_000);
      await seedHistory(queued.id, 120_000);
      // 30 s into a 60 s crawl: about 30 s left.
      await seedTrigger(running.id, {
        status: 'processing',
        createdAt: ago(10),
        startedAt: ago(0.5),
      });
      await seedTrigger(queued.id, { createdAt: ago(5) });
      // This venue has no history: its own estimate is unknown, its wait isn't.
      const mine = await seedTrigger(venue.id, { createdAt: ago(3) });

      const progress = await readProgress(mine.id);

      expect(progress.estimateMs).toBeNull();
      // 30 s left, less the moments the test itself takes, plus 120 s.
      expect(progress.waitMs).toBeGreaterThan(140_000);
      expect(progress.waitMs).toBeLessThanOrEqual(150_000);
    });

    it('counts nothing left of a run that has overrun its typical time', async () => {
      const running = await seedVenue({ name: 'Running', slug: 'running' });
      const venue = await seedVenue();
      await seedHistory(running.id, 60_000);
      await seedTrigger(running.id, {
        status: 'processing',
        createdAt: ago(10),
        startedAt: ago(5),
      });
      const mine = await seedTrigger(venue.id);

      expect((await readProgress(mine.id)).waitMs).toBe(0);
    });

    it('is unknown when the run in progress has no start time', async () => {
      const running = await seedVenue({ name: 'Running', slug: 'running' });
      const venue = await seedVenue();
      await seedHistory(running.id, 60_000);
      await seedTrigger(running.id, {
        status: 'processing',
        createdAt: ago(10),
      });
      const mine = await seedTrigger(venue.id);

      expect((await readProgress(mine.id)).waitMs).toBeNull();
    });

    it('is unknown when a venue ahead has fewer than 3 full runs', async () => {
      const queued = await seedVenue({ name: 'Queued', slug: 'queued' });
      const venue = await seedVenue();
      await seedCrawlRun(queued.id, { durationMs: 60_000 });
      await seedCrawlRun(queued.id, { durationMs: 60_000 });
      await seedTrigger(queued.id, { createdAt: ago(5) });
      const mine = await seedTrigger(venue.id, { createdAt: ago(3) });

      expect((await readProgress(mine.id)).waitMs).toBeNull();
    });

    it('is unknown when a trigger ahead is a forced re-extraction', async () => {
      const queued = await seedVenue({ name: 'Queued', slug: 'queued' });
      const venue = await seedVenue();
      await seedHistory(queued.id, 60_000);
      await seedTrigger(queued.id, { createdAt: ago(5), force: true });
      const mine = await seedTrigger(venue.id, { createdAt: ago(3) });

      expect((await readProgress(mine.id)).waitMs).toBeNull();
    });

    it('estimates up to 20 ahead and is too far to estimate past that', async () => {
      const queued = await seedVenue({ name: 'Queued', slug: 'queued' });
      const venue = await seedVenue();
      await seedHistory(queued.id, 10_000);
      for (let i = 0; i < 20; i += 1) {
        await seedTrigger(queued.id, { createdAt: ago(100 - i) });
      }
      const twentieth = await seedTrigger(venue.id, { createdAt: ago(50) });
      const twentyFirst = await seedTrigger(venue.id, { createdAt: ago(40) });

      expect((await readProgress(twentieth.id)).waitMs).toBe(200_000);
      expect(await readProgress(twentyFirst.id)).toMatchObject({
        queuePosition: 21,
        waitMs: null,
      });
    });

    it('is null once the trigger is no longer pending', async () => {
      const venue = await seedVenue();
      await seedHistory(venue.id, 60_000);
      const mine = await seedTrigger(venue.id, {
        status: 'processing',
        startedAt: ago(0.5),
      });

      expect(await readProgress(mine.id)).toMatchObject({
        estimateMs: 60_000,
        waitMs: null,
      });
    });
  });

  it('answers 404 for an unknown trigger', async () => {
    const res = await app.request(
      '/v1/admin/crawl/triggers/00000000-0000-4000-8000-000000000000',
    );
    expect(res.status).toBe(404);
  });

  it('refuses an id that is not a UUID with the validation error', async () => {
    const res = await app.request('/v1/admin/crawl/triggers/not-a-uuid');
    // validationHook answers a bad param with 400, as every admin route does.
    expect(res.status).toBe(400);
  });

  it('is admin only', async () => {
    authState.current = { userId: 'user_1', sessionClaims: {} };
    const venue = await seedVenue();
    const mine = await seedTrigger(venue.id);

    const res = await app.request(`/v1/admin/crawl/triggers/${mine.id}`);
    expect(res.status).toBe(403);
  });
});
