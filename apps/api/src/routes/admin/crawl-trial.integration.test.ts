import { describe, it, expect, beforeEach, vi } from 'vitest';

interface TestAuth {
  userId: string;
  sessionClaims: { metadata?: { role?: string } };
}

const { authState } = vi.hoisted(() => {
  const state: { current: TestAuth | null } = { current: null };
  return { authState: state };
});

vi.mock('@hono/clerk-auth', () => ({
  clerkMiddleware: () => async (_c: unknown, next: () => Promise<void>) =>
    next(),
  getAuth: () => authState.current,
}));

import { createApp } from '../../app.js';
import {
  clearTables,
  seedCrawlRun,
  seedVenue,
} from '../../test/helpers/seed.js';
import { testDb } from '../../test/helpers/db.js';
import { auditLog, crawlTriggers } from '@concert-crawl/db';
import { eq } from 'drizzle-orm';

const app = createApp();

function setAuth(userId = 'test-admin-1'): void {
  authState.current = {
    userId,
    sessionClaims: { metadata: { role: 'admin' } },
  };
}

const trigger = (venueId: string, body?: string): Promise<Response> =>
  app.request(`/v1/admin/crawl/${venueId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body }),
  });

const trial = (venueId: string): Promise<Response> =>
  trigger(venueId, JSON.stringify({ trial: true }));

const triggersOf = (venueId: string) =>
  testDb.select().from(crawlTriggers).where(eq(crawlTriggers.venueId, venueId));

const auditOf = (action: string) =>
  testDb.select().from(auditLog).where(eq(auditLog.action, action));

const pausedAt = new Date('2026-11-10T09:00:00Z');

describe('POST /v1/admin/crawl/:venueId — a test re-crawl', () => {
  beforeEach(async () => {
    authState.current = null;
    await clearTables();
  });

  it('queues a trial trigger on a paused, unblocked venue and audits it as one', async () => {
    setAuth('admin-7');
    const venue = await seedVenue({
      name: 'Bluebird',
      slug: 'bluebird',
      crawlPausedAt: pausedAt,
      consecutiveFailures: 3,
    });

    const res = await trial(venue.id);
    expect(res.status).toBe(202);
    const body: { success: boolean; data: { triggerId: string } } =
      await res.json();
    expect(body.success).toBe(true);

    const rows = await triggersOf(venue.id);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id: body.data.triggerId,
      trial: true,
      force: false,
      status: 'pending',
      triggeredBy: 'admin-7',
    });

    const [audit] = await auditOf('crawl.trigger_trial');
    expect(audit?.targetId).toBe(venue.id);
    expect(audit?.actorId).toBe('admin-7');
    expect(await auditOf('crawl.trigger')).toHaveLength(0);
  });

  it('refuses a venue that is not paused, with not_paused', async () => {
    setAuth();
    const venue = await seedVenue({ name: 'Ogden', slug: 'ogden' });
    const res = await trial(venue.id);
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({
      success: false,
      code: 'not_paused',
    });
    expect(await triggersOf(venue.id)).toHaveLength(0);
  });

  it('refuses a blocked venue, paused or not, with blocked', async () => {
    setAuth();
    const paused = await seedVenue({
      name: 'Gothic',
      slug: 'gothic',
      crawlPausedAt: pausedAt,
      blockedAt: pausedAt,
    });
    const unpaused = await seedVenue({
      name: 'Summit',
      slug: 'summit',
      blockedAt: pausedAt,
    });
    for (const venue of [paused, unpaused]) {
      const res = await trial(venue.id);
      expect(res.status).toBe(409);
      expect(await res.json()).toMatchObject({ code: 'blocked' });
      expect(await triggersOf(venue.id)).toHaveLength(0);
    }
  });

  it('allows one pending trial per venue, and another once it has run', async () => {
    setAuth();
    const venue = await seedVenue({
      name: 'Marquis',
      slug: 'marquis',
      crawlPausedAt: pausedAt,
    });
    expect((await trial(venue.id)).status).toBe(202);

    const again = await trial(venue.id);
    expect(again.status).toBe(409);
    expect(await again.json()).toMatchObject({ code: 'trial_pending' });
    expect(await triggersOf(venue.id)).toHaveLength(1);

    await testDb
      .update(crawlTriggers)
      .set({ status: 'done' })
      .where(eq(crawlTriggers.venueId, venue.id));
    expect((await trial(venue.id)).status).toBe(202);
    expect(await triggersOf(venue.id)).toHaveLength(2);
  });

  it('still answers the other gates: robots.txt and active/verified', async () => {
    setAuth();
    const robots = await seedVenue({
      name: 'Robots',
      slug: 'robots',
      crawlPausedAt: pausedAt,
      robotsTxtAllowed: false,
    });
    const hidden = await seedVenue({
      name: 'Hidden',
      slug: 'hidden',
      crawlPausedAt: pausedAt,
      active: false,
    });
    const robotsRes = await trial(robots.id);
    expect(robotsRes.status).toBe(409);
    expect(await robotsRes.json()).toMatchObject({
      code: 'robots_disallowed',
    });
    expect((await trial(hidden.id)).status).toBe(400);
  });

  it('leaves the ordinary trigger as it was: a paused venue is refused as paused', async () => {
    setAuth();
    const venue = await seedVenue({
      name: 'Larimer',
      slug: 'larimer',
      crawlPausedAt: pausedAt,
    });
    const res = await trigger(venue.id);
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({
      success: false,
      error: 'Crawling is paused for this venue',
    });
    // A body that fails the schema falls back to an ordinary trigger, never a
    // trial.
    const bad = await trigger(venue.id, JSON.stringify({ trial: 'yes' }));
    expect(bad.status).toBe(409);
    expect(await bad.json()).toMatchObject({
      error: 'Crawling is paused for this venue',
    });
    expect(await triggersOf(venue.id)).toHaveLength(0);
  });

  it('queues an ordinary trigger with trial=false and audits crawl.trigger', async () => {
    setAuth();
    const venue = await seedVenue({ name: 'Fillmore', slug: 'fillmore' });
    expect((await trigger(venue.id)).status).toBe(202);
    const [row] = await triggersOf(venue.id);
    expect(row?.trial).toBe(false);
    expect(await auditOf('crawl.trigger')).toHaveLength(1);
  });
});

describe('trial runs in the crawl run readers', () => {
  beforeEach(async () => {
    await clearTables();
    setAuth();
  });

  it('GET /runs lists a trial run and marks it', async () => {
    const venue = await seedVenue({ name: 'Bluebird', slug: 'bluebird' });
    await seedCrawlRun(venue.id, {
      createdAt: new Date('2026-11-10T09:00:00Z'),
    });
    await seedCrawlRun(venue.id, {
      trial: true,
      createdAt: new Date('2026-11-11T09:00:00Z'),
    });
    const res = await app.request(`/v1/admin/crawl/runs?venueId=${venue.id}`);
    expect(res.status).toBe(200);
    const body: { data: { trial: boolean }[] } = await res.json();
    expect(body.data.map((run) => run.trial)).toEqual([true, false]);
  });

  it('GET /status takes the newest run that is not a trial', async () => {
    const venue = await seedVenue({ name: 'Bluebird', slug: 'bluebird' });
    const own = await seedCrawlRun(venue.id, {
      status: 'failed',
      createdAt: new Date('2026-11-10T09:00:00Z'),
    });
    await seedCrawlRun(venue.id, {
      status: 'success',
      trial: true,
      createdAt: new Date('2026-11-11T09:00:00Z'),
    });
    const res = await app.request('/v1/admin/crawl/status');
    expect(res.status).toBe(200);
    const body: {
      data: { id: string; lastRun: { id: string; status: string } | null }[];
    } = await res.json();
    const row = body.data.find((entry) => entry.id === venue.id);
    expect(row?.lastRun).toMatchObject({ id: own.id, status: 'failed' });
  });
});
