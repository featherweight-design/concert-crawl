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
import { clearTables, seedVenue } from '../../test/helpers/seed.js';
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

const post = (venueId: string, body?: object): Promise<Response> =>
  app.request(`/v1/admin/crawl/${venueId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

const testCrawl = (venueId: string): Promise<Response> =>
  post(venueId, { test: true });

const triggersOf = (venueId: string) =>
  testDb.select().from(crawlTriggers).where(eq(crawlTriggers.venueId, venueId));

const draft = { active: false, wentLiveAt: null } as const;

describe('POST /v1/admin/crawl/:venueId — a test crawl', () => {
  beforeEach(async () => {
    authState.current = null;
    await clearTables();
  });

  it('queues a test trigger on a draft venue and audits it', async () => {
    setAuth('admin-7');
    const venue = await seedVenue({ name: 'Draft', slug: 'draft', ...draft });

    const res = await testCrawl(venue.id);
    expect(res.status).toBe(202);

    const rows = await triggersOf(venue.id);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      mode: 'test',
      trial: false,
      force: false,
      status: 'pending',
      triggeredBy: 'admin-7',
    });
    const audits = await testDb
      .select()
      .from(auditLog)
      .where(eq(auditLog.action, 'crawl.trigger_test'));
    expect(audits[0]?.targetId).toBe(venue.id);
  });

  it('refuses a live venue and a hidden one that was live, with not_draft', async () => {
    setAuth();
    const live = await seedVenue({ name: 'Live', slug: 'live' });
    const hidden = await seedVenue({
      name: 'Hidden',
      slug: 'hidden',
      active: false,
      wentLiveAt: new Date('2026-10-01T00:00:00Z'),
    });
    for (const venue of [live, hidden]) {
      const res = await testCrawl(venue.id);
      expect(res.status).toBe(409);
      expect(await res.json()).toMatchObject({ code: 'not_draft' });
      expect(await triggersOf(venue.id)).toHaveLength(0);
    }
  });

  it('still refuses an ordinary crawl of a draft', async () => {
    setAuth();
    const venue = await seedVenue({ name: 'Draft', slug: 'draft', ...draft });

    for (const body of [undefined, { force: true }, { trial: true }]) {
      const res = await post(venue.id, body);
      expect(res.status).toBe(400);
    }
    expect(await triggersOf(venue.id)).toHaveLength(0);
  });

  it('allows one open test per venue, and another once it has run', async () => {
    setAuth();
    const venue = await seedVenue({ name: 'Draft', slug: 'draft', ...draft });

    expect((await testCrawl(venue.id)).status).toBe(202);
    const second = await testCrawl(venue.id);
    expect(second.status).toBe(409);
    expect(await second.json()).toMatchObject({ code: 'test_pending' });

    await testDb
      .update(crawlTriggers)
      .set({ status: 'done' })
      .where(eq(crawlTriggers.venueId, venue.id));
    expect((await testCrawl(venue.id)).status).toBe(202);
  });

  it('never overrides robots.txt, and refuses a removed or unknown venue', async () => {
    setAuth();
    const blocked = await seedVenue({
      name: 'Robots',
      slug: 'robots',
      robotsTxtAllowed: false,
      ...draft,
    });
    const robots = await testCrawl(blocked.id);
    expect(robots.status).toBe(409);
    expect(await robots.json()).toMatchObject({ code: 'robots_disallowed' });

    const removed = await seedVenue({
      name: 'Gone',
      slug: 'gone',
      removedAt: new Date('2026-11-01T00:00:00Z'),
      ...draft,
    });
    expect((await testCrawl(removed.id)).status).toBe(409);
    expect(
      (await testCrawl('00000000-0000-4000-8000-000000000000')).status,
    ).toBe(404);
  });
});
