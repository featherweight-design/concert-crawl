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
  seedEvent,
  seedVenue,
} from '../../test/helpers/seed.js';
import { testDb } from '../../test/helpers/db.js';
import { adminQueueSnoozes, auditLog, feedback } from '@concert-crawl/db';
import type {
  AllClearFacts,
  NeedsYouCount,
  NeedsYouItem,
} from '@concert-crawl/types';
import { eq } from 'drizzle-orm';
import { addDays, denverDate } from './lib/needs-you/keys.js';

const app = createApp();

function setAuth(role: 'admin' | 'user', userId = 'test-admin-1'): void {
  authState.current = { userId, sessionClaims: { metadata: { role } } };
}

const inDays = (days: number): string => addDays(denverDate(new Date()), days);
const inHours = (hours: number): Date =>
  new Date(Date.now() + hours * 3_600_000);

interface ListBody {
  success: boolean;
  data: NeedsYouItem[];
  count: NeedsYouCount;
}

const list = async (query = ''): Promise<ListBody> => {
  const res = await app.request(`/v1/admin/needs-you${query}`);
  expect(res.status).toBe(200);
  return res.json();
};

const keys = (body: ListBody): string[] => body.data.map((item) => item.key);

const itemUrl = (key: string): string =>
  `/v1/admin/needs-you/items/${encodeURIComponent(key)}/snooze`;

const snooze = (key: string, body: unknown): Promise<Response> =>
  app.request(itemUrl(key), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

const unsnooze = (key: string): Promise<Response> =>
  app.request(itemUrl(key), { method: 'DELETE' });

const lowKey = (eventId: string): string => `event-low-confidence:${eventId}`;

// A low-confidence event is the simplest item with a venue.
const seedLowConfidence = (venueId: string, artist: string, date: string) =>
  seedEvent(venueId, { artist, date, verified: false });

const auditRows = (action: string) =>
  testDb.select().from(auditLog).where(eq(auditLog.action, action));

describe('admin needs-you routes', () => {
  beforeEach(async () => {
    authState.current = null;
    await clearTables();
  });

  it('requires an admin role on every route', async () => {
    setAuth('user');
    const key = 'event-low-confidence:abc';
    expect((await app.request('/v1/admin/needs-you')).status).toBe(403);
    expect((await app.request('/v1/admin/needs-you/count')).status).toBe(403);
    expect((await app.request('/v1/admin/needs-you/facts')).status).toBe(403);
    expect(
      (await snooze(key, { until: inHours(1).toISOString() })).status,
    ).toBe(403);
    expect((await unsnooze(key)).status).toBe(403);
  });

  it('rejects an anonymous caller', async () => {
    const res = await app.request('/v1/admin/needs-you');
    expect(res.status).toBe(401);
    expect((await unsnooze('event-low-confidence:abc')).status).toBe(401);
  });

  it('lists with success, data and count; ?kind= narrows data not count', async () => {
    setAuth('admin');
    const venue = await seedVenue({ name: 'Levitt', slug: 'levitt' });
    const event = await seedLowConfidence(venue.id, 'Some Act', inDays(5));
    await testDb.insert(feedback).values({
      pageUrl: 'https://concertcrawl.app/',
      category: 'bug',
      message: 'Broken thing',
    });

    const all = await list();
    expect(all.success).toBe(true);
    expect(all.data).toHaveLength(2);
    expect(all.count.decisions).toBe(2);

    const narrowed = await list('?kind=bug');
    expect(narrowed.data.map((item) => item.kind)).toEqual(['bug']);
    expect(narrowed.count).toEqual(all.count);
    expect(keys(all)).toContain(lowKey(event.id));

    const bad = await app.request('/v1/admin/needs-you?kind=nonsense');
    expect(bad.status).toBe(400);
  });

  it('GET /count returns the count shape', async () => {
    setAuth('admin');
    const venue = await seedVenue({ name: 'Levitt', slug: 'levitt' });
    await seedLowConfidence(venue.id, 'Some Act', inDays(5));

    const res = await app.request('/v1/admin/needs-you/count');
    expect(res.status).toBe(200);
    const body: { success: boolean; data: NeedsYouCount } = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.decisions).toBe(1);
    expect(body.data.byKind['event-low-confidence']).toBe(1);
  });

  it('GET /facts: no nightly yet, nothing snoozed, and the next crawl is ahead', async () => {
    setAuth('admin');
    const res = await app.request('/v1/admin/needs-you/facts');
    expect(res.status).toBe(200);
    const body: { success: boolean; data: AllClearFacts } = await res.json();
    expect(body.data.lastCrawl).toBeNull();
    expect(body.data.snoozedVenues).toBe(0);
    expect(new Date(body.data.nextCrawlAt).getTime()).toBeGreaterThan(
      Date.now(),
    );
  });

  it('GET /facts: counts the last nightly and the venues snoozed', async () => {
    setAuth('admin');
    const venue = await seedVenue({ name: 'Levitt', slug: 'levitt' });
    const other = await seedVenue({ name: 'Globe Hall', slug: 'globe-hall' });
    // A nightly two days back, at the cron time, so it is always inside the
    // window and long finished.
    const at = new Date();
    at.setUTCDate(at.getUTCDate() - 2);
    at.setUTCHours(9, 8, 0, 0);
    await seedCrawlRun(venue.id, { createdAt: at });
    await seedCrawlRun(other.id, {
      createdAt: new Date(at.getTime() + 60_000),
      status: 'failed',
      reason: 'timeout',
    });
    // A season-long snooze counts; a two-day one does not.
    // Written straight to the table: the snooze route only takes an item that
    // is in the queue right now, and these venues are not failing.
    const hold = (venueId: string, hours: number) =>
      testDb.insert(adminQueueSnoozes).values({
        itemKey: `venue-failing:${venueId}`,
        kind: 'venue-failing',
        until: inHours(hours),
        createdBy: 'test-admin-1',
      });
    await hold(venue.id, 24 * 10);
    await hold(other.id, 48);

    const res = await app.request('/v1/admin/needs-you/facts');
    const body: { data: AllClearFacts } = await res.json();
    expect(body.data.snoozedVenues).toBe(1);
    expect(body.data.lastCrawl).toEqual({
      ok: 1,
      total: 2,
      at: at.toISOString(),
    });
  });

  it('snooze hides the item and audits it against the key and actor', async () => {
    setAuth('admin', 'admin-7');
    const venue = await seedVenue({ name: 'Levitt', slug: 'levitt' });
    const event = await seedLowConfidence(venue.id, 'Snoozed Act', inDays(5));
    const key = lowKey(event.id);

    const res = await snooze(key, { until: inHours(1).toISOString() });
    expect(res.status).toBe(200);
    expect(keys(await list())).not.toContain(key);

    const [audit] = await auditRows('needs_you.snooze');
    expect(audit?.targetId).toBe(key);
    expect(audit?.actorId).toBe('admin-7');
  });

  it('re-snoozing upserts, including after the first snooze expired', async () => {
    setAuth('admin');
    const venue = await seedVenue({ name: 'Levitt', slug: 'levitt' });
    const event = await seedLowConfidence(venue.id, 'Again Act', inDays(5));
    const key = lowKey(event.id);

    expect(
      (await snooze(key, { until: inHours(1).toISOString() })).status,
    ).toBe(200);
    // A second snooze while the first is live.
    expect(
      (await snooze(key, { until: inHours(2).toISOString() })).status,
    ).toBe(200);

    // Expire the row, which stays in the table, then snooze again.
    await testDb
      .update(adminQueueSnoozes)
      .set({ until: new Date(Date.now() - 1000) })
      .where(eq(adminQueueSnoozes.itemKey, key));
    expect(keys(await list())).toContain(key);
    const again = await snooze(key, { until: inHours(3).toISOString() });
    expect(again.status).toBe(200);

    const rows = await testDb
      .select()
      .from(adminQueueSnoozes)
      .where(eq(adminQueueSnoozes.itemKey, key));
    expect(rows).toHaveLength(1);
    expect(rows[0]?.until?.getTime()).toBeGreaterThan(Date.now());
    expect(keys(await list())).not.toContain(key);
  });

  it('Not useful hides that kind for that venue only, and audits', async () => {
    setAuth('admin');
    const venueA = await seedVenue({ name: 'Venue A', slug: 'venue-a' });
    const venueB = await seedVenue({ name: 'Venue B', slug: 'venue-b' });
    const a1 = await seedLowConfidence(venueA.id, 'A One', inDays(5));
    const a2 = await seedLowConfidence(venueA.id, 'A Two', inDays(6));
    const b1 = await seedLowConfidence(venueB.id, 'B One', inDays(7));

    const res = await snooze(lowKey(a1.id), {
      notUseful: true,
      reason: 'noise',
    });
    expect(res.status).toBe(200);
    // Repeating it for the same kind and venue upserts rather than failing.
    const repeat = await snooze(lowKey(a2.id), { notUseful: true });
    expect(repeat.status).toBe(200);

    const visible = keys(await list());
    expect(visible).not.toContain(lowKey(a1.id));
    expect(visible).not.toContain(lowKey(a2.id));
    expect(visible).toContain(lowKey(b1.id));

    const rows = await testDb
      .select()
      .from(adminQueueSnoozes)
      .where(eq(adminQueueSnoozes.notUseful, true));
    expect(rows).toHaveLength(1);
    expect(rows[0]?.venueId).toBe(venueA.id);
    expect(await auditRows('needs_you.snooze')).toHaveLength(2);
  });

  it('answers 422 for Not useful on an item with no venue', async () => {
    setAuth('admin');
    await testDb.insert(feedback).values({
      pageUrl: 'https://concertcrawl.app/',
      category: 'bug',
      message: 'Broken thing',
    });
    const [bug] = (await list()).data;
    expect(bug?.kind).toBe('bug');
    const res = await snooze(bug?.key ?? '', { notUseful: true });
    expect(res.status).toBe(422);
    expect(await testDb.select().from(adminQueueSnoozes)).toEqual([]);
  });

  it('rejects invalid bodies and keys', async () => {
    setAuth('admin');
    const venue = await seedVenue({ name: 'Levitt', slug: 'levitt' });
    const event = await seedLowConfidence(venue.id, 'Some Act', inDays(5));
    const key = lowKey(event.id);

    const past = new Date(Date.now() - 60_000).toISOString();
    expect((await snooze(key, { until: past })).status).toBe(400);
    expect((await snooze(key, {})).status).toBe(400);
    expect(
      (
        await snooze(key, {
          until: inHours(1).toISOString(),
          notUseful: true,
        })
      ).status,
    ).toBe(400);
    expect(
      (await snooze('nonsense:123', { until: inHours(1).toISOString() }))
        .status,
    ).toBe(400);
    expect((await unsnooze('nonsense:123')).status).toBe(400);
    // Both shapes need a key that names a current item.
    expect(
      (await snooze('event-low-confidence:not-here', { notUseful: true }))
        .status,
    ).toBe(404);
    expect(
      (
        await snooze('event-low-confidence:not-here', {
          until: inHours(1).toISOString(),
        })
      ).status,
    ).toBe(404);
    expect(await testDb.select().from(adminQueueSnoozes)).toEqual([]);
  });

  it('unsnooze restores the item and audits it', async () => {
    setAuth('admin', 'admin-7');
    const venue = await seedVenue({ name: 'Levitt', slug: 'levitt' });
    const event = await seedLowConfidence(venue.id, 'Audited Act', inDays(5));
    const key = lowKey(event.id);

    await snooze(key, { until: inHours(1).toISOString() });
    expect(keys(await list())).not.toContain(key);

    const res = await unsnooze(key);
    expect(res.status).toBe(200);
    expect(keys(await list())).toContain(key);

    const [audit] = await auditRows('needs_you.unsnooze');
    expect(audit?.targetId).toBe(key);
    expect(audit?.actorId).toBe('admin-7');
  });

  it('unsnooze also clears Not useful for that kind and venue', async () => {
    setAuth('admin');
    const venue = await seedVenue({ name: 'Levitt', slug: 'levitt' });
    const one = await seedLowConfidence(venue.id, 'One', inDays(5));
    const two = await seedLowConfidence(venue.id, 'Two', inDays(6));
    await snooze(lowKey(one.id), { notUseful: true });
    expect(keys(await list())).toEqual([]);

    const res = await unsnooze(lowKey(two.id));
    expect(res.status).toBe(200);
    // The venue-wide mute is reported apart from the item's own snooze.
    expect(await res.json()).toMatchObject({
      data: { clearedSnoozes: 0, clearedNotUseful: 1 },
    });
    expect(keys(await list())).toEqual(
      expect.arrayContaining([lowKey(one.id), lowKey(two.id)]),
    );
  });

  it('unsnoozing a key that is no longer a current item clears nothing and still audits', async () => {
    setAuth('admin');
    const res = await unsnooze('event-low-confidence:gone');
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      data: { clearedSnoozes: 0, clearedNotUseful: 0 },
    });
    expect(await auditRows('needs_you.unsnooze')).toHaveLength(1);
  });

  it('refuses a snooze that lasts more than a year', async () => {
    setAuth('admin');
    const venue = await seedVenue({ name: 'Levitt', slug: 'levitt' });
    const event = await seedLowConfidence(venue.id, 'Far Act', inDays(5));
    const farOff = inHours(400 * 24).toISOString();

    expect((await snooze(lowKey(event.id), { until: farOff })).status).toBe(
      400,
    );
  });
});
