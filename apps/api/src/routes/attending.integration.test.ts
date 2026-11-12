// Integration tests for PUT/DELETE /v1/attending/:eventId (#70).
// The entitlement gate derives the plan from real billing rows, so these tests
// seed subscriptions rather than mocking canUseFeature — that's the only way to
// prove the gate is actually mounted.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

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

import { and, eq, sql } from 'drizzle-orm';
import {
  crewMembers,
  crews,
  notifications,
  subscriptions,
  userEvents,
} from '@concert-crawl/db';
import { createApp } from '../app.js';
import { testDb } from '../test/helpers/db.js';
import {
  clearTables,
  seedVenue,
  seedEvent,
  seedUserEvent,
} from '../test/helpers/seed.js';

const app = createApp();
const USER_ID = 'user_attending_test';
// Far enough out that the show is always upcoming; the past-show tests below
// use PAST, which the 2026-03 records floor does not matter to (PUT has none).
const UPCOMING = '2099-01-01';
const PAST = '2026-01-01';

const setAuth = (userId = USER_ID, role = 'user'): void => {
  authState.current = { userId, sessionClaims: { metadata: { role } } };
};

const seedSupporter = async (userId = USER_ID): Promise<void> => {
  await testDb.insert(subscriptions).values({
    userId,
    stripeCustomerId: `cus_${userId}`,
    stripeSubscriptionId: `sub_${userId}`,
    tier: 'supporter',
    status: 'active',
    currentPeriodEnd: new Date(Date.now() + 30 * 86400000),
  });
};

const rowFor = async (userId: string, eventId: string) => {
  const [row] = await testDb
    .select()
    .from(userEvents)
    .where(and(eq(userEvents.userId, userId), eq(userEvents.eventId, eventId)));
  return row;
};

describe('PUT/DELETE /v1/attending/:eventId', () => {
  beforeEach(async () => {
    authState.current = null;
    await clearTables();
    await testDb.execute(
      sql`TRUNCATE subscriptions, gifted_comps, user_billing`,
    );
  });

  it('returns 401 when unauthenticated', async () => {
    const res = await app.request('/v1/attending/some-id', { method: 'PUT' });
    expect(res.status).toBe(401);
  });

  it('marks going for a free user now that concert-history is unlocked', async () => {
    setAuth();
    const venue = await seedVenue();
    const event = await seedEvent(venue.id, { date: UPCOMING });

    const res = await app.request(`/v1/attending/${event.id}`, {
      method: 'PUT',
    });
    expect(res.status).toBe(200);
    const row = await rowFor(USER_ID, event.id);
    expect(row?.attendingAt).not.toBeNull();
  });

  // Going free: a free account (no subscription, gift or role) can remove a
  // concert too, not only add one.
  it('lets a free account DELETE an attended show', async () => {
    setAuth();
    const venue = await seedVenue();
    const event = await seedEvent(venue.id, { date: UPCOMING });
    await app.request(`/v1/attending/${event.id}`, { method: 'PUT' });

    const res = await app.request(`/v1/attending/${event.id}`, {
      method: 'DELETE',
    });
    expect(res.status).toBe(200);
  });

  it('returns 400 for a non-UUID event id', async () => {
    setAuth();
    await seedSupporter();
    const res = await app.request('/v1/attending/not-a-uuid', {
      method: 'PUT',
    });
    expect(res.status).toBe(400);
  });

  it('returns 404 for an event hidden from consumers', async () => {
    setAuth();
    await seedSupporter();
    const venue = await seedVenue();
    const event = await seedEvent(venue.id, {
      date: UPCOMING,
      hiddenFromConsumer: true,
    });

    const res = await app.request(`/v1/attending/${event.id}`, {
      method: 'PUT',
    });
    expect(res.status).toBe(404);
  });

  it('returns 404 for an event the crawler stopped seeing', async () => {
    setAuth();
    await seedSupporter();
    const venue = await seedVenue();
    const event = await seedEvent(venue.id, {
      date: UPCOMING,
      firstMissingAt: new Date('2026-01-01T09:00:00Z'),
    });

    const res = await app.request(`/v1/attending/${event.id}`, {
      method: 'PUT',
    });
    expect(res.status).toBe(404);
  });

  it('creates an attending-only row (status stays null)', async () => {
    setAuth();
    await seedSupporter();
    const venue = await seedVenue();
    const event = await seedEvent(venue.id, { date: UPCOMING });

    const res = await app.request(`/v1/attending/${event.id}`, {
      method: 'PUT',
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: { going: boolean; attendingAt: string | null };
    };
    expect(body.data.going).toBe(true);
    expect(body.data.attendingAt).not.toBeNull();

    const row = await rowFor(USER_ID, event.id);
    expect(row?.status).toBeNull();
    expect(row?.attendingAt).not.toBeNull();
  });

  it('preserves an existing watch when marking attendance', async () => {
    setAuth();
    await seedSupporter();
    const venue = await seedVenue();
    const event = await seedEvent(venue.id, { date: UPCOMING });
    await seedUserEvent(USER_ID, event.id, { status: 'watching' });

    const res = await app.request(`/v1/attending/${event.id}`, {
      method: 'PUT',
    });
    expect(res.status).toBe(200);

    const row = await rowFor(USER_ID, event.id);
    expect(row?.status).toBe('watching');
    expect(row?.attendingAt).not.toBeNull();
  });

  it('is idempotent — a second PUT keeps the original timestamp', async () => {
    setAuth();
    await seedSupporter();
    const venue = await seedVenue();
    const event = await seedEvent(venue.id, { date: UPCOMING });

    const first = (await (
      await app.request(`/v1/attending/${event.id}`, { method: 'PUT' })
    ).json()) as { data: { attendingAt: string } };
    const second = (await (
      await app.request(`/v1/attending/${event.id}`, { method: 'PUT' })
    ).json()) as { data: { attendingAt: string } };

    expect(second.data.attendingAt).toBe(first.data.attendingAt);
  });

  // Gate 6 (side-effect provenance): the crew bell row is created by attendance
  // happening, so "fires once" has to be proved at the trigger, not the helper.
  describe('crew fan-out fires exactly once per attendance', () => {
    const MATE = 'user_attending_crewmate';

    const seedSharedCrew = async (): Promise<void> => {
      const [crew] = await testDb
        .insert(crews)
        .values({ name: 'The Regulars', keeperId: USER_ID })
        .returning();
      if (!crew) throw new Error('seedSharedCrew: insert returned no rows');
      await testDb.insert(crewMembers).values([
        { crewId: crew.id, userId: USER_ID },
        { crewId: crew.id, userId: MATE },
      ]);
    };

    const mateRowCount = async (): Promise<number> => {
      const rows = await testDb
        .select()
        .from(notifications)
        .where(eq(notifications.userId, MATE));
      return rows.length;
    };

    it('does not re-notify when the same user PUTs twice', async () => {
      setAuth();
      await seedSupporter();
      await seedSharedCrew();
      const venue = await seedVenue();
      const event = await seedEvent(venue.id, { date: UPCOMING });

      await app.request(`/v1/attending/${event.id}`, { method: 'PUT' });
      await app.request(`/v1/attending/${event.id}`, { method: 'PUT' });

      expect(await mateRowCount()).toBe(1);
    });

    it('does not double-notify when two PUTs race', async () => {
      setAuth();
      await seedSupporter();
      await seedSharedCrew();
      const venue = await seedVenue();
      const event = await seedEvent(venue.id, { date: UPCOMING });

      // Both requests read "not going yet", so only the atomic transition
      // claim can keep this to one bell row.
      await Promise.all([
        app.request(`/v1/attending/${event.id}`, { method: 'PUT' }),
        app.request(`/v1/attending/${event.id}`, { method: 'PUT' }),
      ]);

      expect(await mateRowCount()).toBe(1);
    });

    it('reports the persisted timestamp to the request that lost the race', async () => {
      setAuth();
      await seedSupporter();
      await seedSharedCrew();
      const venue = await seedVenue();
      const event = await seedEvent(venue.id, { date: UPCOMING });

      const [first, second] = await Promise.all([
        app.request(`/v1/attending/${event.id}`, { method: 'PUT' }),
        app.request(`/v1/attending/${event.id}`, { method: 'PUT' }),
      ]);
      const firstBody: { data: { attendingAt: string } } = await first.json();
      const secondBody: { data: { attendingAt: string } } = await second.json();

      // The loser generated its own timestamp; it must report the stored one.
      const stored = (await rowFor(USER_ID, event.id))?.attendingAt;
      expect(firstBody.data.attendingAt).toBe(stored?.toISOString());
      expect(secondBody.data.attendingAt).toBe(stored?.toISOString());
    });

    it('notifies again after the user un-goes and goes back', async () => {
      setAuth();
      await seedSupporter();
      await seedSharedCrew();
      const venue = await seedVenue();
      const event = await seedEvent(venue.id, { date: UPCOMING });

      await app.request(`/v1/attending/${event.id}`, { method: 'PUT' });
      await app.request(`/v1/attending/${event.id}`, { method: 'DELETE' });
      await app.request(`/v1/attending/${event.id}`, { method: 'PUT' });

      // A genuine second decision is genuinely news, unlike a re-tap.
      expect(await mateRowCount()).toBe(2);
    });
  });

  it('DELETE removes an attending-only row entirely', async () => {
    setAuth();
    await seedSupporter();
    const venue = await seedVenue();
    const event = await seedEvent(venue.id, { date: UPCOMING });
    await seedUserEvent(USER_ID, event.id, {
      status: null,
      attendingAt: new Date('2026-06-01T00:00:00.000Z'),
    });

    const res = await app.request(`/v1/attending/${event.id}`, {
      method: 'DELETE',
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: { going: boolean; attendingAt: string | null };
    };
    expect(body.data.going).toBe(false);
    expect(body.data.attendingAt).toBeNull();

    expect(await rowFor(USER_ID, event.id)).toBeUndefined();
  });

  it('DELETE nulls only attending_at on a watching+attending row', async () => {
    setAuth();
    await seedSupporter();
    const venue = await seedVenue();
    const event = await seedEvent(venue.id, { date: UPCOMING });
    await seedUserEvent(USER_ID, event.id, {
      status: 'watching',
      attendingAt: new Date('2026-06-01T00:00:00.000Z'),
    });

    await app.request(`/v1/attending/${event.id}`, { method: 'DELETE' });

    const row = await rowFor(USER_ID, event.id);
    expect(row?.status).toBe('watching');
    expect(row?.attendingAt).toBeNull();
  });
});

describe('past shows and restore (edit your Concerts)', () => {
  const MATE = 'user_attending_pastmate';
  const original = process.env['INTERNAL_API_SECRET'];

  const seedSharedCrew = async (): Promise<void> => {
    const [crew] = await testDb
      .insert(crews)
      .values({ name: 'The Regulars', keeperId: USER_ID })
      .returning();
    if (!crew) throw new Error('seedSharedCrew: insert returned no rows');
    await testDb.insert(crewMembers).values([
      { crewId: crew.id, userId: USER_ID },
      { crewId: crew.id, userId: MATE },
    ]);
  };

  const mateRows = async (): Promise<number> =>
    (
      await testDb
        .select()
        .from(notifications)
        .where(eq(notifications.userId, MATE))
    ).length;

  const put = (eventId: string, body?: unknown) =>
    app.request(`/v1/attending/${eventId}`, {
      method: 'PUT',
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });

  interface Removed {
    data: { restore: { attendingAt: string; token: string } | null };
  }
  const del = async (eventId: string): Promise<Removed> =>
    (
      await app.request(`/v1/attending/${eventId}`, { method: 'DELETE' })
    ).json();

  beforeEach(async () => {
    process.env['INTERNAL_API_SECRET'] = 'test-secret';
    authState.current = null;
    await clearTables();
    await testDb.execute(
      sql`TRUNCATE subscriptions, gifted_comps, user_billing`,
    );
    setAuth();
  });
  afterEach(() => {
    if (original === undefined) delete process.env['INTERNAL_API_SECRET'];
    else process.env['INTERNAL_API_SECRET'] = original;
  });

  it('marks a past show the crawler stopped seeing', async () => {
    const venue = await seedVenue();
    const event = await seedEvent(venue.id, {
      date: PAST,
      firstMissingAt: new Date('2026-01-02T09:00:00Z'),
    });
    expect((await put(event.id)).status).toBe(200);
    expect((await rowFor(USER_ID, event.id))?.attendingAt).not.toBeNull();
  });

  it('refuses a cancelled or hidden past show with the unknown-id answer', async () => {
    const venue = await seedVenue();
    const cancelled = await seedEvent(venue.id, {
      date: PAST,
      status: 'cancelled',
      artist: 'Cancelled Act',
    });
    const hidden = await seedEvent(venue.id, {
      date: PAST,
      hiddenFromConsumer: true,
      artist: 'Hidden Act',
    });
    expect((await put(cancelled.id)).status).toBe(404);
    expect((await put(hidden.id)).status).toBe(404);
  });

  it('still refuses an upcoming show the crawler stopped seeing', async () => {
    const venue = await seedVenue();
    const event = await seedEvent(venue.id, {
      date: UPCOMING,
      firstMissingAt: new Date('2026-01-02T09:00:00Z'),
    });
    expect((await put(event.id)).status).toBe(404);
  });

  it('never pings the crew for a past show, and still does for an upcoming one', async () => {
    await seedSharedCrew();
    const venue = await seedVenue();
    const past = await seedEvent(venue.id, { date: PAST, artist: 'Past Act' });
    const next = await seedEvent(venue.id, {
      date: UPCOMING,
      artist: 'Next Act',
    });
    await put(past.id);
    expect(await mateRows()).toBe(0);
    await put(next.id);
    expect(await mateRows()).toBe(1);
  });

  it('keeps one row and a stable timestamp across a double tap on a past show', async () => {
    await seedSharedCrew();
    const venue = await seedVenue();
    const event = await seedEvent(venue.id, { date: PAST });
    const [first, second] = await Promise.all([put(event.id), put(event.id)]);
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    const rows = await testDb
      .select()
      .from(userEvents)
      .where(eq(userEvents.eventId, event.id));
    expect(rows).toHaveLength(1);
    expect(await mateRows()).toBe(0);
  });

  it('treats a show dated today (Mountain) as upcoming', async () => {
    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Denver',
    }).format(new Date());
    await seedSharedCrew();
    const venue = await seedVenue();
    const event = await seedEvent(venue.id, {
      date: today,
      firstMissingAt: new Date('2026-01-02T09:00:00Z'),
    });
    expect((await put(event.id)).status).toBe(404);
    const live = await seedEvent(venue.id, { date: today, artist: 'Tonight' });
    expect((await put(live.id)).status).toBe(200);
    expect(await mateRows()).toBe(1);
  });

  describe('restore', () => {
    it('puts back the exact removed attendance when the row was deleted', async () => {
      await seedSharedCrew();
      const venue = await seedVenue();
      const event = await seedEvent(venue.id, { date: PAST });
      const attendingAt = new Date('2026-02-03T04:05:06.789Z');
      await seedUserEvent(USER_ID, event.id, { status: null, attendingAt });

      const { data } = await del(event.id);
      expect(await rowFor(USER_ID, event.id)).toBeUndefined();
      expect(data.restore?.attendingAt).toBe(attendingAt.toISOString());

      const res = await put(event.id, { restore: data.restore });
      expect(res.status).toBe(200);
      expect((await rowFor(USER_ID, event.id))?.attendingAt?.getTime()).toBe(
        attendingAt.getTime(),
      );
      expect(await mateRows()).toBe(0);
    });

    it('puts back the removed attendance on a row that kept its watch', async () => {
      const venue = await seedVenue();
      const event = await seedEvent(venue.id, { date: UPCOMING });
      const attendingAt = new Date('2026-02-03T04:05:06.789Z');
      await seedUserEvent(USER_ID, event.id, {
        status: 'watching',
        attendingAt,
      });

      const { data } = await del(event.id);
      expect((await rowFor(USER_ID, event.id))?.attendingAt).toBeNull();

      expect((await put(event.id, { restore: data.restore })).status).toBe(200);
      const row = await rowFor(USER_ID, event.id);
      expect(row?.status).toBe('watching');
      expect(row?.attendingAt?.getTime()).toBe(attendingAt.getTime());
    });

    it('does not notify the crew on an upcoming restore', async () => {
      await seedSharedCrew();
      const venue = await seedVenue();
      const event = await seedEvent(venue.id, { date: UPCOMING });
      await seedUserEvent(USER_ID, event.id, {
        status: null,
        attendingAt: new Date('2026-02-03T04:05:06.789Z'),
      });
      const { data } = await del(event.id);
      await put(event.id, { restore: data.restore });
      expect(await mateRows()).toBe(0);
    });

    it('rejects an expired token and invents no attendance', async () => {
      const venue = await seedVenue();
      const event = await seedEvent(venue.id, { date: PAST });
      const attendingAt = new Date('2026-02-03T04:05:06.789Z');
      await seedUserEvent(USER_ID, event.id, { status: null, attendingAt });
      const { data } = await del(event.id);

      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(Date.now() + 61_000);
      try {
        const res = await put(event.id, { restore: data.restore });
        expect(res.status).toBe(400);
      } finally {
        vi.useRealTimers();
      }
      expect(await rowFor(USER_ID, event.id)).toBeUndefined();
    });

    it("rejects a forged token and another user's token", async () => {
      const venue = await seedVenue();
      const event = await seedEvent(venue.id, { date: PAST });
      const attendingAt = new Date('2026-02-03T04:05:06.789Z');
      await seedUserEvent(USER_ID, event.id, { status: null, attendingAt });
      const { data } = await del(event.id);

      const forged = await put(event.id, {
        restore: { attendingAt: data.restore?.attendingAt, token: '1.abc' },
      });
      expect(forged.status).toBe(400);

      setAuth('user_attending_other');
      const stolen = await put(event.id, { restore: data.restore });
      expect(stolen.status).toBe(400);
      expect(await rowFor('user_attending_other', event.id)).toBeUndefined();
    });

    it('rejects a token replayed with a different attendingAt', async () => {
      const venue = await seedVenue();
      const event = await seedEvent(venue.id, { date: PAST });
      await seedUserEvent(USER_ID, event.id, {
        status: null,
        attendingAt: new Date('2026-02-03T04:05:06.789Z'),
      });
      const { data } = await del(event.id);
      const res = await put(event.id, {
        restore: {
          attendingAt: '2026-02-04T00:00:00.000Z',
          token: data.restore?.token,
        },
      });
      expect(res.status).toBe(400);
    });

    it('never overwrites an attendance that already exists', async () => {
      const venue = await seedVenue();
      const event = await seedEvent(venue.id, { date: PAST });
      await seedUserEvent(USER_ID, event.id, {
        status: null,
        attendingAt: new Date('2026-02-03T04:05:06.789Z'),
      });
      const { data } = await del(event.id);
      await put(event.id);
      const settled = (await rowFor(USER_ID, event.id))?.attendingAt;

      const res = await put(event.id, { restore: data.restore });
      expect(res.status).toBe(200);
      expect((await rowFor(USER_ID, event.id))?.attendingAt?.getTime()).toBe(
        settled?.getTime(),
      );
    });

    it('hands back no restore when the secret is unset or nothing was removed', async () => {
      const venue = await seedVenue();
      const event = await seedEvent(venue.id, { date: PAST });
      expect((await del(event.id)).data.restore).toBeNull();

      await seedUserEvent(USER_ID, event.id, {
        status: null,
        attendingAt: new Date('2026-02-03T04:05:06.789Z'),
      });
      delete process.env['INTERNAL_API_SECRET'];
      expect((await del(event.id)).data.restore).toBeNull();
    });
  });

  it('rejects a body that fails the schema', async () => {
    const venue = await seedVenue();
    const event = await seedEvent(venue.id, { date: PAST });
    expect(
      (await put(event.id, { restore: { attendingAt: 'x' } })).status,
    ).toBe(400);
    expect((await put(event.id, { extra: true })).status).toBe(400);
    const bad = await app.request(`/v1/attending/${event.id}`, {
      method: 'PUT',
      body: '{not json',
    });
    expect(bad.status).toBe(400);
  });
});
