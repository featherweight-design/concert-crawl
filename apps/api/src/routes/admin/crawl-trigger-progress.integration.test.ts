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
import type { CrawlTriggerProgress } from '@concert-crawl/types';
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

/** A time `minutes` before now. */
const ago = (minutes: number): Date => new Date(Date.now() - minutes * MINUTE);

// The response's shape, checked rather than cast.
const bodySchema = z.object({
  data: z.object({
    id: z.string(),
    progress: z.object({
      status: z.enum(['pending', 'processing', 'done', 'failed']),
      pagesDone: z.number().nullable(),
      pagesTotal: z.number().nullable(),
      progressAt: z.string().nullable(),
      queuePosition: z.number(),
      runningAhead: z.boolean(),
      estimateMs: z.number().nullable(),
    }),
  }),
});

const readProgress = async (id: string): Promise<CrawlTriggerProgress> => {
  const res = await app.request(`/v1/admin/crawl/triggers/${id}`);
  expect(res.status).toBe(200);
  const body = bodySchema.parse(await res.json());
  expect(body.data.id).toBe(id);
  return body.data.progress;
};

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

    const progress = await readProgress(mine.id);

    expect(progress).toMatchObject({
      status: 'pending',
      queuePosition: 2,
      runningAhead: true,
      pagesDone: null,
      pagesTotal: null,
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

  it('reports the page progress of a processing trigger', async () => {
    const venue = await seedVenue();
    const progressAt = ago(0.5);
    // A pending trigger older than this one would be ahead only if pending.
    await seedTrigger(venue.id, { createdAt: ago(2) });
    const mine = await seedTrigger(venue.id, {
      status: 'processing',
      createdAt: ago(3),
      pagesDone: 2,
      pagesTotal: 4,
      progressAt,
    });

    expect(await readProgress(mine.id)).toEqual({
      status: 'processing',
      pagesDone: 2,
      pagesTotal: 4,
      progressAt: progressAt.toISOString(),
      queuePosition: 0,
      runningAhead: false,
      estimateMs: null,
    });
  });

  it('gives no estimate with fewer than 3 full runs', async () => {
    const venue = await seedVenue();
    await seedCrawlRun(venue.id, { durationMs: 60_000 });
    await seedCrawlRun(venue.id, { durationMs: 90_000 });
    const mine = await seedTrigger(venue.id);

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
    for (const durationMs of [40_000, 50_000, 60_000]) {
      await seedCrawlRun(venue.id, { durationMs });
    }
    const mine = await seedTrigger(venue.id, {
      status: 'done',
      pagesDone: 4,
      pagesTotal: 4,
    });

    expect(await readProgress(mine.id)).toMatchObject({
      status: 'done',
      pagesDone: 4,
      queuePosition: 0,
      runningAhead: false,
      estimateMs: null,
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
