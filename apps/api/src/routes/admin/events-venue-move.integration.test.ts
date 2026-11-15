import { describe, it, expect, beforeEach, vi } from 'vitest';

// Admin E2-C: POST /v1/admin/events/:id/venue. An upcoming show's venue
// change is the Moved flow (a 'moved' redirect carrying the old crawl key,
// Watchers told through the relocation copy, `event.venue.move`); a played
// show's is a silent correction (`event.venue.correct`). The crawl side of the
// redirect is covered in crawler-core's crawl-manual-events integration test.

type MockAuth = {
  userId: string;
  sessionClaims: { metadata?: { role?: string } };
} | null;

const { authState } = vi.hoisted(() => {
  const state: { current: MockAuth } = { current: null };
  return { authState: state };
});

vi.mock('@hono/clerk-auth', () => ({
  clerkMiddleware: () => async (_ctx: unknown, next: () => Promise<void>) =>
    next(),
  getAuth: () => authState.current,
}));

// A pass-through spy on the watcher fan-out, so a correction can prove
// nothing outward fired.
vi.mock('@concert-crawl/push', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@concert-crawl/push')>();
  return {
    ...actual,
    fanoutWatchNotification: vi.fn(actual.fanoutWatchNotification),
  };
});

import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import {
  auditLog,
  eventRedirects,
  events,
  notifications,
} from '@concert-crawl/db';
import { fanoutWatchNotification } from '@concert-crawl/push';
import { createApp } from '../../app.js';
import { testDb } from '../../test/helpers/db.js';
import {
  clearTables,
  seedEvent,
  seedUserEvent,
  seedVenue,
} from '../../test/helpers/seed.js';
import { todayInDenver } from '../../lib/time.js';

const app = createApp();
const ADMIN_USER_ID = 'admin_user';
const HEADERS = {
  Authorization: 'Bearer admin-token',
  'Content-Type': 'application/json',
};

const dayOffset = (days: number): string => {
  const base = new Date(`${todayInDenver()}T12:00:00Z`);
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
};

const okBodySchema = z.object({
  success: z.literal(true),
  data: z.object({
    outcome: z.enum(['moved', 'corrected', 'unchanged']),
    watchersNotified: z.number(),
    event: z.object({
      id: z.string(),
      venueId: z.string().nullable(),
      venueName: z.string().nullable(),
    }),
  }),
});

const duplicateBodySchema = z.object({
  success: z.literal(false),
  error: z.literal('duplicate_show'),
  existingId: z.string().nullable(),
});

const issuesBodySchema = z.object({
  success: z.literal(false),
  error: z.object({
    issues: z.array(
      z.object({
        path: z.array(z.union([z.string(), z.number()])),
        message: z.string(),
      }),
    ),
  }),
});

const moveVenue = (eventId: string, venueId: string) =>
  app.request(`/v1/admin/events/${eventId}/venue`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({ venueId }),
  });

const storedEvent = async (id: string) => {
  const [row] = await testDb.select().from(events).where(eq(events.id, id));
  if (!row) throw new Error(`event ${id} missing`);
  return row;
};

const venueAudits = () =>
  testDb
    .select({
      action: auditLog.action,
      targetId: auditLog.targetId,
      actorId: auditLog.actorId,
      metadata: auditLog.metadata,
    })
    .from(auditLog);

const seedRooms = async () => ({
  from: await seedVenue({
    name: 'Larimer Lounge',
    slug: 'larimer-lounge',
    websiteUrl: 'https://larimerlounge.example.com',
  }),
  to: await seedVenue({
    name: 'Globe Hall',
    slug: 'globe-hall',
    websiteUrl: 'https://globehall.example.com',
  }),
});

beforeEach(async () => {
  authState.current = {
    userId: ADMIN_USER_ID,
    sessionClaims: { metadata: { role: 'admin' } },
  };
  vi.mocked(fanoutWatchNotification).mockClear();
  await clearTables();
});

describe('POST /v1/admin/events/:id/venue — an upcoming show (Moved)', () => {
  it('moves the show, writes the old crawl key on a moved redirect, tells Watchers and audits', async () => {
    const { from, to } = await seedRooms();
    const date = dayOffset(20);
    const show = await seedEvent(from.id, {
      artist: 'Moved Artist',
      date,
      showTime: '20:00',
      ticketUrl: 'https://globehall.example.com/tickets/moved',
      ticketLinks: [
        {
          kind: 'primary',
          vendor: null,
          url: 'https://globehall.example.com/tickets/moved',
        },
      ],
    });
    await seedUserEvent('watcher-a', show.id, { status: 'watching' });
    await seedUserEvent('curious-b', show.id, { status: 'interested' });

    const res = await moveVenue(show.id, to.id);
    expect(res.status).toBe(200);
    const { data } = okBodySchema.parse(await res.json());
    expect(data.outcome).toBe('moved');
    expect(data.watchersNotified).toBe(1);
    expect(data.event).toMatchObject({
      id: show.id,
      venueId: to.id,
      venueName: 'Globe Hall',
    });

    const after = await storedEvent(show.id);
    expect(after.venueId).toBe(to.id);
    // Rebuilt for the new venue: the link is on its own site now.
    expect(after.ticketLinks).toEqual([
      {
        kind: 'boxoffice',
        vendor: null,
        url: 'https://globehall.example.com/tickets/moved',
      },
    ]);
    // The crawl key's other parts stay, so nothing else moves with the room.
    expect(after.canonicalArtist).toBe(show.canonicalArtist);
    expect(after.date).toBe(date);

    const redirects = await testDb.select().from(eventRedirects);
    expect(redirects).toHaveLength(1);
    const [redirect] = redirects;
    expect(redirect).toMatchObject({
      targetId: show.id,
      reason: 'moved',
      sourceVenueId: from.id,
      sourceDate: date,
      sourceCanonicalArtist: show.canonicalArtist,
      sourceShowTime: '20:00:00',
    });
    // A key of its own, never the event's id: the show still answers there.
    expect(redirect?.sourceId).not.toBe(show.id);

    expect(fanoutWatchNotification).toHaveBeenCalledTimes(1);
    const bell = await testDb
      .select()
      .from(notifications)
      .where(eq(notifications.category, 'watch.postponed'));
    expect(bell).toHaveLength(1);
    expect(bell[0]).toMatchObject({
      userId: 'watcher-a',
      title: 'Moved Artist at Larimer Lounge moved.',
      body: 'Your ticket still works. New room: Globe Hall.',
      actionUrl: `/events/${show.id}`,
    });

    expect(await venueAudits()).toEqual([
      {
        action: 'event.venue.move',
        targetId: show.id,
        actorId: ADMIN_USER_ID,
        metadata: expect.objectContaining({
          before: { venueId: from.id, venueName: 'Larimer Lounge' },
          after: { venueId: to.id, venueName: 'Globe Hall' },
          redirectSourceId: redirect?.sourceId,
          notifyWatchers: true,
        }),
      },
    ]);
  });

  it('reads as Moved on the admin list', async () => {
    const { from, to } = await seedRooms();
    const show = await seedEvent(from.id, { date: dayOffset(12) });

    expect((await moveVenue(show.id, to.id)).status).toBe(200);

    const res = await app.request(`/v1/admin/events/${show.id}`, {
      headers: HEADERS,
    });
    const body = z
      .object({ data: z.object({ listStatus: z.string() }) })
      .parse(await res.json());
    expect(body.data.listStatus).toBe('moved');
  });

  it('moving back drops the redirect for the key the show holds again', async () => {
    const { from, to } = await seedRooms();
    const show = await seedEvent(from.id, { date: dayOffset(15) });

    expect((await moveVenue(show.id, to.id)).status).toBe(200);
    expect((await moveVenue(show.id, from.id)).status).toBe(200);

    const redirects = await testDb
      .select({
        targetId: eventRedirects.targetId,
        sourceVenueId: eventRedirects.sourceVenueId,
      })
      .from(eventRedirects);
    expect(redirects).toEqual([{ targetId: show.id, sourceVenueId: to.id }]);
    expect((await storedEvent(show.id)).venueId).toBe(from.id);
  });

  it('a cancelled show takes the redirect but tells nobody', async () => {
    const { from, to } = await seedRooms();
    const show = await seedEvent(from.id, {
      date: dayOffset(18),
      status: 'cancelled',
    });
    await seedUserEvent('watcher-a', show.id, { status: 'watching' });

    const res = await moveVenue(show.id, to.id);
    expect(res.status).toBe(200);
    const { data } = okBodySchema.parse(await res.json());
    expect(data).toMatchObject({ outcome: 'moved', watchersNotified: 0 });
    expect(await testDb.select().from(eventRedirects)).toHaveLength(1);
    expect(fanoutWatchNotification).not.toHaveBeenCalled();
    expect(await testDb.select().from(notifications)).toEqual([]);
  });

  it('a postponed show with a passed date is still a move', async () => {
    const { from, to } = await seedRooms();
    const show = await seedEvent(from.id, {
      date: dayOffset(-3),
      status: 'postponed',
    });
    await seedUserEvent('watcher-a', show.id, { status: 'watching' });

    const res = await moveVenue(show.id, to.id);
    const { data } = okBodySchema.parse(await res.json());
    expect(data).toMatchObject({ outcome: 'moved', watchersNotified: 1 });
    expect(await testDb.select().from(eventRedirects)).toHaveLength(1);
  });
});

describe('POST /v1/admin/events/:id/venue — a played show (correction)', () => {
  it('changes the venue silently: no redirect, nobody told, audited as a correction', async () => {
    const { from, to } = await seedRooms();
    const show = await seedEvent(from.id, { date: dayOffset(-10) });
    await seedUserEvent('watcher-a', show.id, { status: 'watching' });

    const res = await moveVenue(show.id, to.id);
    expect(res.status).toBe(200);
    const { data } = okBodySchema.parse(await res.json());
    expect(data).toMatchObject({ outcome: 'corrected', watchersNotified: 0 });

    expect((await storedEvent(show.id)).venueId).toBe(to.id);
    expect(await testDb.select().from(eventRedirects)).toEqual([]);
    expect(fanoutWatchNotification).not.toHaveBeenCalled();
    expect(await testDb.select().from(notifications)).toEqual([]);
    expect(await venueAudits()).toEqual([
      {
        action: 'event.venue.correct',
        targetId: show.id,
        actorId: ADMIN_USER_ID,
        metadata: expect.objectContaining({
          before: { venueId: from.id, venueName: 'Larimer Lounge' },
          after: { venueId: to.id, venueName: 'Globe Hall' },
          redirectSourceId: null,
          notifyWatchers: false,
        }),
      },
    ]);
  });
});

describe('POST /v1/admin/events/:id/venue — refusals', () => {
  it('a show already holding the crawl key at the new venue is 409 duplicate_show with its id, and nothing changes', async () => {
    const { from, to } = await seedRooms();
    const date = dayOffset(25);
    const show = await seedEvent(from.id, { artist: 'Clash', date });
    const holder = await seedEvent(to.id, { artist: 'Clash', date });
    await seedUserEvent('watcher-a', show.id, { status: 'watching' });

    const res = await moveVenue(show.id, to.id);
    expect(res.status).toBe(409);
    expect(duplicateBodySchema.parse(await res.json()).existingId).toBe(
      holder.id,
    );

    expect((await storedEvent(show.id)).venueId).toBe(from.id);
    expect(await testDb.select().from(eventRedirects)).toEqual([]);
    expect(await venueAudits()).toEqual([]);
    expect(fanoutWatchNotification).not.toHaveBeenCalled();
  });

  it('a removed venue is 400 venue_not_found', async () => {
    const { from } = await seedRooms();
    const removed = await seedVenue({
      name: 'Gone Room',
      slug: 'gone-room',
      removedAt: new Date(),
    });
    const show = await seedEvent(from.id, { date: dayOffset(9) });

    const res = await moveVenue(show.id, removed.id);
    expect(res.status).toBe(400);
    const { issues } = issuesBodySchema.parse(await res.json()).error;
    expect(
      issues.map((issue) => `${issue.path.join('.')}:${issue.message}`),
    ).toEqual(['venueId:venue_not_found']);
    expect((await storedEvent(show.id)).venueId).toBe(from.id);
    expect(await venueAudits()).toEqual([]);
  });

  it('an unknown venue is 400 venue_not_found', async () => {
    const { from } = await seedRooms();
    const show = await seedEvent(from.id, { date: dayOffset(9) });

    const res = await moveVenue(show.id, randomUUID());
    expect(res.status).toBe(400);
    const { issues } = issuesBodySchema.parse(await res.json()).error;
    expect(issues.map((issue) => issue.message)).toEqual(['venue_not_found']);
  });

  it('the same venue is a no-op: nothing written, nothing audited', async () => {
    const { from } = await seedRooms();
    const show = await seedEvent(from.id, { date: dayOffset(9) });
    await seedUserEvent('watcher-a', show.id, { status: 'watching' });

    const res = await moveVenue(show.id, from.id);
    expect(res.status).toBe(200);
    const { data } = okBodySchema.parse(await res.json());
    expect(data).toMatchObject({ outcome: 'unchanged', watchersNotified: 0 });
    expect((await storedEvent(show.id)).updatedAt).toEqual(show.updatedAt);
    expect(await testDb.select().from(eventRedirects)).toEqual([]);
    expect(await venueAudits()).toEqual([]);
    expect(fanoutWatchNotification).not.toHaveBeenCalled();
  });

  it('an unknown event is 404', async () => {
    const { to } = await seedRooms();
    const res = await moveVenue(randomUUID(), to.id);
    expect(res.status).toBe(404);
  });
});
