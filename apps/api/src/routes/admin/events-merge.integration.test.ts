import { describe, it, expect, beforeEach, vi } from 'vitest';
import { asc, eq, inArray } from 'drizzle-orm';
import {
  artists,
  eventArtists,
  events,
  priceSubmissions,
  userEvents,
} from '@concert-crawl/db';

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

import { createApp } from '../../app.js';
import {
  clearTables,
  seedArtist,
  seedEvent,
  seedEventReport,
  seedPriceSubmission,
  seedUserEvent,
  seedVenue,
} from '../../test/helpers/seed.js';
import { deleteManualEvents } from './lib/event-delete.js';
import type { DbTransaction } from '../../lib/db-executor.js';
import { testDb } from '../../test/helpers/db.js';
import { todayInDenver } from '../../lib/time.js';

// Admin 4b E4: the merge panel's pick list and compare preview, and the merge
// POST's fills, past rule and row locks.

const app = createApp();

const ADMIN_HEADERS = {
  Authorization: 'Bearer admin-token',
  'Content-Type': 'application/json',
};

const futureDate = (daysFromNow: number): string => {
  const day = new Date(`${todayInDenver()}T00:00:00Z`);
  day.setUTCDate(day.getUTCDate() + daysFromNow);
  return day.toISOString().slice(0, 10);
};

const venueNamed = (slug: string) => seedVenue({ name: slug, slug });

const get = (path: string) =>
  app.request(`/v1/admin/events/${path}`, { headers: ADMIN_HEADERS });

const merge = async (sourceId: string, targetId: string): Promise<Response> =>
  app.request(`/v1/admin/events/${sourceId}/merge`, {
    method: 'POST',
    headers: ADMIN_HEADERS,
    body: JSON.stringify({ targetId }),
  });

const rowOf = async (id: string) =>
  (await testDb.select().from(events).where(eq(events.id, id)))[0];

/** A transaction held open after `work` until `release()` is called. */
const holdOpen = <T>(work: (tx: DbTransaction) => Promise<T>) => {
  let signalHeld = (): void => {};
  const held = new Promise<void>((resolve) => {
    signalHeld = resolve;
  });
  let release = (): void => {};
  const released = new Promise<void>((resolve) => {
    release = resolve;
  });
  const done = testDb.transaction(async (tx) => {
    const result = await work(tx);
    signalHeld();
    await released;
    return result;
  });
  return { held, release, done };
};

/** Settles to whether `promise` is still pending after 300ms. */
const stillPending = async (promise: Promise<unknown>) => {
  let settled = false;
  promise.then(
    () => (settled = true),
    () => (settled = true),
  );
  await new Promise((resolve) => setTimeout(resolve, 300));
  return !settled;
};

beforeEach(async () => {
  authState.current = {
    userId: 'admin_user',
    sessionClaims: { metadata: { role: 'admin' } },
  };
  await clearTables();
});

describe('GET /v1/admin/events/:id/merge-candidates', () => {
  it('lists the same venue and date, one night first, without cancelled rows', async () => {
    const venue = await venueNamed('cand-venue');
    const elsewhere = await venueNamed('cand-elsewhere');
    const date = futureDate(20);
    const self = await seedEvent(venue.id, { artist: 'Rossi', date });
    // "Rossi." is the same night by the crawl's rule (edge punctuation).
    const sameNight = await seedEvent(venue.id, {
      artist: 'Rossi.',
      date,
      showTime: '20:00:00',
    });
    const popular = await seedEvent(venue.id, { artist: 'Other Band', date });
    await seedUserEvent('fan_1', popular.id);
    await seedUserEvent('fan_2', popular.id);
    const hiddenManual = await seedEvent(venue.id, {
      artist: 'Hidden Act',
      date,
      manual: true,
      hiddenFromConsumer: true,
    });
    await seedEvent(venue.id, {
      artist: 'Rossi',
      date,
      showTime: '21:00:00',
      status: 'cancelled',
    });
    await seedEvent(venue.id, {
      artist: 'Rossi',
      date,
      showTime: '22:00:00',
      delistedAt: new Date(),
    });
    await seedEvent(elsewhere.id, { artist: 'Rossi', date });
    await seedEvent(venue.id, { artist: 'Rossi', date: futureDate(21) });

    const res = await get(`${self.id}/merge-candidates`);

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: { candidates: Record<string, unknown>[] };
    };
    expect(body.data.candidates.map((row) => row['id'])).toEqual([
      sameNight.id,
      popular.id,
      hiddenManual.id,
    ]);
    expect(body.data.candidates[0]).toMatchObject({
      likely: true,
      source: 'crawled',
      watchers: 0,
      showTime: '20:00:00',
    });
    expect(body.data.candidates[1]).toMatchObject({
      likely: false,
      watchers: 2,
    });
    expect(body.data.candidates[2]).toMatchObject({
      source: 'manual',
      manual: true,
      hidden: true,
    });
  });

  it('404s an unknown event and 400s a bad id', async () => {
    expect(
      (await get('00000000-0000-4000-8000-0000000000ee/merge-candidates'))
        .status,
    ).toBe(404);
    expect((await get('not-an-id/merge-candidates')).status).toBe(400);
  });
});

describe('GET /v1/admin/events/:id/merge-preview', () => {
  it('counts each listing, dedupes the Watchers after, and names the fills', async () => {
    const venue = await venueNamed('preview-venue');
    const date = futureDate(30);
    const kept = await seedEvent(venue.id, {
      artist: 'Rossi',
      date,
      manual: true,
      description: 'Kept description',
    });
    const other = await seedEvent(venue.id, {
      artist: 'Rossi',
      date,
      showTime: '20:00:00',
      description: 'Other description',
      ticketUrl: 'https://tickets.example.com/rossi',
      ticketPriceMin: '65',
      ticketPriceMax: '495',
      priceSource: 'structured_data',
      headliners: ['Rossi'],
      canonicalHeadliners: ['rossi'],
    });
    await seedUserEvent('fan_1', kept.id);
    await seedUserEvent('fan_2', kept.id);
    await seedUserEvent('fan_2', other.id);
    await seedUserEvent('fan_3', other.id);
    await seedUserEvent('fan_4', other.id, { status: 'going' });
    await seedPriceSubmission(other.id, 'price_fan');
    await seedEventReport(other.id, 'reporter_1', { status: 'sold-out' });
    await seedEventReport(other.id, 'reporter_2', {
      status: 'cancelled',
      resolvedAt: new Date(),
      resolution: 'rejected',
    });

    const res = await get(`${kept.id}/merge-preview?other=${other.id}`);

    expect(res.status).toBe(200);
    const { data } = (await res.json()) as {
      data: {
        kept: Record<string, unknown>;
        other: Record<string, unknown>;
        sameVenue: boolean;
        sameDay: boolean;
        sameNight: boolean;
        after: { watchers: number; price: { min: string | null } };
        fills: string[];
      };
    };
    expect(data.kept).toMatchObject({
      id: kept.id,
      source: 'manual',
      watchers: 2,
      concerts: 0,
      submittedPrices: 0,
      reports: { total: 0, byKind: {} },
      price: { min: null, max: null },
    });
    expect(data.other).toMatchObject({
      id: other.id,
      source: 'crawled',
      watchers: 2,
      concerts: 1,
      submittedPrices: 1,
      reports: { total: 1, byKind: { 'sold-out': 1 } },
      price: { min: '65.00', max: '495.00' },
      lineup: [expect.objectContaining({ name: 'Rossi', role: 'headliner' })],
    });
    expect(data).toMatchObject({
      sameVenue: true,
      sameDay: true,
      sameNight: true,
    });
    // fan_1, fan_2 (on both) and fan_3: each person once.
    expect(data.after.watchers).toBe(3);
    expect(data.after.price.min).toBe('65.00');
    expect(data.fills).toEqual(
      expect.arrayContaining([
        'headliners',
        'showTime',
        'ticketUrl',
        'ticketPriceMin',
      ]),
    );
    expect(data.fills).not.toContain('description');
  });

  it('reports a merge across venues instead of refusing it (A3)', async () => {
    const kept = await seedEvent((await venueNamed('a3-one')).id, {
      date: futureDate(5),
    });
    const other = await seedEvent((await venueNamed('a3-two')).id, {
      date: futureDate(6),
    });

    const res = await get(`${kept.id}/merge-preview?other=${other.id}`);

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      data: { sameVenue: false, sameDay: false, sameNight: false },
    });
  });

  it('409s the same id and a past row with an upcoming one, 404s a missing other, 400s a bad query', async () => {
    const venue = await venueNamed('refuse-venue');
    const upcoming = await seedEvent(venue.id, { date: futureDate(3) });
    const past = await seedEvent(venue.id, {
      artist: 'Past Act',
      date: futureDate(-3),
    });

    const same = await get(`${upcoming.id}/merge-preview?other=${upcoming.id}`);
    expect(same.status).toBe(409);
    expect(await same.json()).toEqual({
      success: false,
      error: 'not_mergeable',
      reason: 'same_id',
    });

    const mixed = await get(`${upcoming.id}/merge-preview?other=${past.id}`);
    expect(mixed.status).toBe(409);
    expect(await mixed.json()).toMatchObject({ reason: 'past_mismatch' });

    const missing = await get(
      `${upcoming.id}/merge-preview?other=00000000-0000-4000-8000-0000000000ee`,
    );
    expect(missing.status).toBe(404);

    expect((await get(`${upcoming.id}/merge-preview`)).status).toBe(400);
    expect((await get(`${upcoming.id}/merge-preview?other=nope`)).status).toBe(
      400,
    );
  });
});

describe('POST /v1/admin/events/:id/merge — E4 rules', () => {
  it("fills only the kept row's blank fields, and rebuilds its lineup rows", async () => {
    const venue = await venueNamed('fill-venue');
    const date = futureDate(30);
    await seedArtist({ name: 'Rossi' });
    const kept = await seedEvent(venue.id, {
      artist: 'Rossi',
      date,
      manual: true,
      description: 'Kept description',
      genre: ['Jazz'],
    });
    const source = await seedEvent(venue.id, {
      artist: 'Rossi',
      date,
      showTime: '20:00:00',
      description: 'Source description',
      genre: ['Rock'],
      ticketUrl: 'https://tickets.example.com/rossi',
      ticketLinks: [
        {
          kind: 'primary',
          vendor: 'Ticketmaster',
          url: 'https://tickets.example.com/rossi',
        },
      ],
      ticketPriceMin: '65',
      ticketPriceMax: '495',
      priceSource: 'structured_data',
      headliners: ['Rossi'],
      canonicalHeadliners: ['rossi'],
    });

    const res = await merge(source.id, kept.id);

    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { filled: string[] } };
    expect(body.data.filled).toEqual(
      expect.arrayContaining([
        'headliners',
        'showTime',
        'ticketUrl',
        'ticketPriceMin',
      ]),
    );
    const after = await rowOf(kept.id);
    expect(after).toMatchObject({
      description: 'Kept description',
      genre: ['Jazz'],
      showTime: '20:00:00',
      ticketUrl: 'https://tickets.example.com/rossi',
      ticketPriceMin: '65.00',
      ticketPriceMax: '495.00',
      priceSource: 'structured_data',
      headliners: ['Rossi'],
      manual: true,
    });
    expect(after?.ticketLinks).toHaveLength(1);
    expect(await rowOf(source.id)).toBeUndefined();
    const lineup = await testDb
      .select({ name: artists.name, role: eventArtists.role })
      .from(eventArtists)
      .innerJoin(artists, eq(artists.id, eventArtists.artistId))
      .where(eq(eventArtists.eventId, kept.id))
      .orderBy(asc(eventArtists.position));
    expect(lineup).toEqual([{ name: 'Rossi', role: 'headliner' }]);
  });

  it('refuses a past row into an upcoming one with 409 past_mismatch, moving nothing', async () => {
    const venue = await venueNamed('past-venue');
    const past = await seedEvent(venue.id, {
      artist: 'Old',
      date: futureDate(-2),
    });
    const upcoming = await seedEvent(venue.id, {
      artist: 'New',
      date: futureDate(2),
    });
    await seedUserEvent('fan_1', past.id);

    const res = await merge(past.id, upcoming.id);

    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({
      success: false,
      error: 'not_mergeable',
      reason: 'past_mismatch',
    });
    expect(await rowOf(past.id)).toBeDefined();
    const watches = await testDb
      .select({ eventId: userEvents.eventId })
      .from(userEvents);
    expect(watches).toEqual([{ eventId: past.id }]);
  });

  it('merges two past rows', async () => {
    const venue = await venueNamed('both-past');
    const first = await seedEvent(venue.id, { date: futureDate(-5) });
    const second = await seedEvent(venue.id, {
      artist: 'Second',
      date: futureDate(-5),
    });

    expect((await merge(first.id, second.id)).status).toBe(200);
  });

  // Row locks: both rows FOR UPDATE in id order. Before, only the source was
  // locked, so two opposite merges each held one row and waited on the
  // other (a deadlock, one 500).
  it('runs two opposite merges of one pair to the end without a deadlock: one merges, one 404s', async () => {
    const venue = await venueNamed('opposite-venue');
    const date = futureDate(10);
    const left = await seedEvent(venue.id, { artist: 'Left', date });
    const right = await seedEvent(venue.id, { artist: 'Right', date });
    await seedUserEvent('fan_1', left.id);
    await seedUserEvent('fan_2', right.id);
    await seedPriceSubmission(left.id, 'price_1');
    await seedPriceSubmission(right.id, 'price_2');
    const lower = [left.id, right.id].sort()[0] ?? left.id;

    // Hold the lower row so both merges are in flight before either runs.
    const holding = holdOpen((tx) =>
      tx.select().from(events).where(eq(events.id, lower)).for('update'),
    );
    await holding.held;
    const forward = merge(left.id, right.id);
    const backward = merge(right.id, left.id);
    expect(await stillPending(forward)).toBe(true);
    expect(await stillPending(backward)).toBe(true);
    holding.release();
    await holding.done;

    const statuses = [(await forward).status, (await backward).status].sort();
    expect(statuses).toEqual([200, 404]);
    const remaining = await testDb
      .select({ id: events.id })
      .from(events)
      .where(inArray(events.id, [left.id, right.id]));
    expect(remaining).toHaveLength(1);
    const survivor = remaining[0]?.id;
    const watches = await testDb
      .select({ eventId: userEvents.eventId })
      .from(userEvents);
    expect(watches.map((row) => row.eventId)).toEqual([survivor, survivor]);
    const prices = await testDb
      .select({ eventId: priceSubmissions.eventId })
      .from(priceSubmissions);
    expect(prices.map((row) => row.eventId)).toEqual([survivor, survivor]);
  });

  it('waits on a delete of the manual target, then 404s cleanly once it commits', async () => {
    const venue = await venueNamed('delete-wins');
    const date = futureDate(10);
    const manual = await seedEvent(venue.id, {
      artist: 'Manual',
      date,
      manual: true,
    });
    const crawled = await seedEvent(venue.id, { artist: 'Crawled', date });
    await seedUserEvent('fan_1', crawled.id);

    const deleting = holdOpen((tx) => deleteManualEvents(tx, [manual.id]));
    await deleting.held;
    const merging = merge(crawled.id, manual.id);
    expect(await stillPending(merging)).toBe(true);

    deleting.release();
    expect((await deleting.done).deleted.map((row) => row.id)).toEqual([
      manual.id,
    ]);
    const res = await merging;
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({
      success: false,
      error: 'Target event not found',
    });
    // Nothing moved: the crawled row and its Watcher are as they were.
    expect(await rowOf(crawled.id)).toBeDefined();
    const watches = await testDb
      .select({ eventId: userEvents.eventId })
      .from(userEvents);
    expect(watches).toEqual([{ eventId: crawled.id }]);
  });

  it('waits on a delete of the manual target the guard refuses, then merges', async () => {
    const venue = await venueNamed('delete-refused');
    const date = futureDate(10);
    const manual = await seedEvent(venue.id, {
      artist: 'Manual',
      date,
      manual: true,
    });
    // A Watcher makes the guard refuse the delete.
    await seedUserEvent('fan_1', manual.id);
    const crawled = await seedEvent(venue.id, { artist: 'Crawled', date });

    const deleting = holdOpen((tx) => deleteManualEvents(tx, [manual.id]));
    await deleting.held;
    const merging = merge(crawled.id, manual.id);
    expect(await stillPending(merging)).toBe(true);

    deleting.release();
    expect((await deleting.done).skipped).toMatchObject([
      { id: manual.id, reason: 'has_dependents' },
    ]);
    expect((await merging).status).toBe(200);
    expect(await rowOf(crawled.id)).toBeUndefined();
    expect(await rowOf(manual.id)).toBeDefined();
  });
});
