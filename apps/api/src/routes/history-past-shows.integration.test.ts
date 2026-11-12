// Integration tests for GET /v1/history/past-shows (the Add-a-show list).
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

import { sql } from 'drizzle-orm';
import { userArtistFollows } from '@concert-crawl/db';
import type { PastShowsResponse } from '@concert-crawl/types';
import { createApp } from '../app.js';
import { testDb } from '../test/helpers/db.js';
import {
  clearTables,
  seedEvent,
  seedUserEvent,
  seedVenue,
} from '../test/helpers/seed.js';

const app = createApp();
const USER_ID = 'user_past_shows_test';

const setAuth = (userId = USER_ID): void => {
  authState.current = { userId, sessionClaims: { metadata: { role: 'user' } } };
};

const getList = async (query = ''): Promise<PastShowsResponse> => {
  const res = await app.request(`/v1/history/past-shows${query}`);
  expect(res.status).toBe(200);
  const body: { data: PastShowsResponse } = await res.json();
  return body.data;
};

describe('GET /v1/history/past-shows', () => {
  beforeEach(async () => {
    authState.current = null;
    await clearTables();
    await testDb.execute(
      sql`TRUNCATE subscriptions, gifted_comps, user_billing`,
    );
    setAuth();
  });

  it('returns 401 when signed out', async () => {
    authState.current = null;
    expect((await app.request('/v1/history/past-shows')).status).toBe(401);
  });

  it('applies the visibility rule and the records floor', async () => {
    const venue = await seedVenue();
    const removed = await seedVenue({
      slug: 'gone',
      name: 'Gone',
      removedAt: new Date('2026-05-01T00:00:00Z'),
    });
    const shown = await seedEvent(venue.id, {
      artist: 'Shown',
      date: '2026-05-01',
    });
    const missing = await seedEvent(venue.id, {
      artist: 'Missing But Happened',
      date: '2026-05-02',
      firstMissingAt: new Date('2026-05-03T00:00:00Z'),
    });
    await seedEvent(venue.id, { artist: 'Before', date: '2026-02-28' });
    await seedEvent(venue.id, {
      artist: 'Cancelled',
      date: '2026-05-04',
      status: 'cancelled',
    });
    await seedEvent(venue.id, {
      artist: 'Hidden',
      date: '2026-05-05',
      hiddenFromConsumer: true,
    });
    await seedEvent(removed.id, {
      artist: 'Removed Venue',
      date: '2026-05-06',
    });
    await seedEvent(venue.id, { artist: 'Future', date: '2099-01-01' });

    const data = await getList();
    expect(data.rows.map((row) => row.eventId)).toEqual([missing.id, shown.id]);
    expect(data.total).toBe(2);
    expect(data.nextCursor).toBeNull();
  });

  // The crawler can keep several rows for one night; listing each would let a
  // reader stamp the same night twice, and `total` would count rows.
  describe('one row per night', () => {
    const seedNight = async () => {
      const venue = await seedVenue();
      const timed = await seedEvent(venue.id, {
        artist: 'Beck',
        date: '2026-10-01',
        showTime: '19:00:00',
        title: 'Beck at Red Rocks',
      });
      const untimed = await seedEvent(venue.id, {
        artist: 'Beck',
        date: '2026-10-01',
        showTime: null,
        title: 'Beck (ticketing listing)',
      });
      return { venue, timed, untimed };
    };

    it('lists a night once, and counts nights in `total`', async () => {
      const { timed, untimed } = await seedNight();
      const data = await getList();
      expect(data.rows).toHaveLength(1);
      expect(data.total).toBe(1);
      // The lowest id stays when the caller attended neither.
      const lowest = [timed.id, untimed.id].sort()[0];
      expect(data.rows[0]?.eventId).toBe(lowest);
    });

    it('keeps the duplicate the caller stamped', async () => {
      const { timed, untimed } = await seedNight();
      const highest = [timed.id, untimed.id].sort()[1] ?? timed.id;
      await seedUserEvent(USER_ID, highest, {
        status: null,
        attendingAt: new Date('2026-10-02T00:00:00Z'),
      });
      const data = await getList();
      expect(data.rows).toHaveLength(1);
      expect(data.rows[0]?.eventId).toBe(highest);
      expect(data.rows[0]?.attendingAt).not.toBeNull();
    });

    it('keeps an early and a late show on one date as two nights', async () => {
      const venue = await seedVenue();
      await seedEvent(venue.id, {
        artist: 'Beck',
        date: '2026-10-01',
        showTime: '16:00:00',
      });
      await seedEvent(venue.id, {
        artist: 'Beck',
        date: '2026-10-01',
        showTime: '20:00:00',
      });
      expect((await getList()).rows).toHaveLength(2);
    });
  });

  it('fills attendingAt only for the caller', async () => {
    const venue = await seedVenue();
    const event = await seedEvent(venue.id, { date: '2026-05-01' });
    await seedUserEvent('someone_else', event.id, {
      status: null,
      attendingAt: new Date('2026-05-02T00:00:00Z'),
    });
    expect((await getList()).rows[0]?.attendingAt).toBeNull();

    await seedUserEvent(USER_ID, event.id, {
      status: null,
      attendingAt: new Date('2026-05-03T00:00:00Z'),
    });
    const rows = (await getList()).rows;
    expect(rows).toHaveLength(1);
    expect(rows[0]?.attendingAt).toBe('2026-05-03T00:00:00.000Z');
  });

  it('scope=venues keeps only venues the caller has been to', async () => {
    const been = await seedVenue({ slug: 'been', name: 'Been' });
    const other = await seedVenue({ slug: 'other', name: 'Other' });
    const attended = await seedEvent(been.id, {
      artist: 'A',
      date: '2026-05-01',
    });
    const sameVenue = await seedEvent(been.id, {
      artist: 'B',
      date: '2026-05-02',
    });
    await seedEvent(other.id, { artist: 'C', date: '2026-05-03' });
    await seedUserEvent(USER_ID, attended.id, {
      status: null,
      attendingAt: new Date('2026-05-02T00:00:00Z'),
    });

    const data = await getList('?scope=venues');
    expect(data.rows.map((row) => row.eventId)).toEqual([
      sameVenue.id,
      attended.id,
    ]);
    expect(data.total).toBe(2);
  });

  it('scope=follows keeps only followed artists', async () => {
    const venue = await seedVenue();
    const followed = await seedEvent(venue.id, {
      artist: 'Followed Act',
      date: '2026-05-01',
    });
    await seedEvent(venue.id, { artist: 'Stranger', date: '2026-05-02' });
    await testDb.insert(userArtistFollows).values({
      userId: USER_ID,
      artistName: 'Followed Act',
      canonicalName: 'followed act',
      source: 'manual',
    });

    const res = await app.request('/v1/history/past-shows?scope=follows');
    // The follows scope has its own entitlement: either it answers with the
    // filtered list or it is gated, never the unfiltered list.
    if (res.status === 200) {
      const body: { data: PastShowsResponse } = await res.json();
      expect(body.data.rows.map((row) => row.eventId)).toEqual([followed.id]);
    } else {
      expect(res.status).toBe(403);
    }
  });

  it('matches q over artist, title and venue, case-insensitively, with % literal', async () => {
    const venue = await seedVenue({
      name: 'Bluebird Theater',
      slug: 'bluebird',
    });
    const byArtist = await seedEvent(venue.id, {
      artist: 'Idles',
      date: '2026-05-01',
    });
    const literal = await seedEvent(venue.id, {
      artist: '50% Off Night',
      date: '2026-05-02',
    });

    expect((await getList('?q=IDLES')).rows.map((row) => row.eventId)).toEqual([
      byArtist.id,
    ]);
    // Venue name matches every row at this venue.
    expect((await getList('?q=bluebird')).total).toBe(2);
    expect((await getList('?q=50%25')).rows.map((row) => row.eventId)).toEqual([
      literal.id,
    ]);
    expect((await getList('?q=_dles')).rows).toHaveLength(0);
  });

  it('pages without gaps or duplicates and counts the whole set', async () => {
    const venue = await seedVenue();
    for (let day = 1; day <= 31; day++) {
      await seedEvent(venue.id, {
        artist: `Act ${String(day)}`,
        date: `2026-05-${String(day).padStart(2, '0')}`,
      });
    }
    const first = await getList();
    expect(first.rows).toHaveLength(30);
    expect(first.total).toBe(31);
    expect(first.nextCursor).not.toBeNull();

    const second = await getList(`?cursor=${first.nextCursor ?? ''}`);
    expect(second.rows).toHaveLength(1);
    expect(second.total).toBe(31);
    expect(second.nextCursor).toBeNull();

    const ids = [...first.rows, ...second.rows].map((row) => row.eventId);
    expect(new Set(ids).size).toBe(31);
  });

  it('rejects a bad scope or cursor', async () => {
    expect(
      (await app.request('/v1/history/past-shows?scope=nope')).status,
    ).toBe(400);
    expect(
      (await app.request('/v1/history/past-shows?cursor=junk')).status,
    ).toBe(400);
    // Right shape, impossible values: Postgres would throw, so it is a 400.
    const uuid = '00000000-0000-4000-8000-000000000000';
    for (const cursor of [
      `2026-13-45_${uuid}`,
      `2026-02-30_${uuid}`,
      `2026-05-01_${'-'.repeat(36)}`,
    ]) {
      expect(
        (await app.request(`/v1/history/past-shows?cursor=${cursor}`)).status,
      ).toBe(400);
    }
  });
});
