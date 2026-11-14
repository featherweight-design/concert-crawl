import { describe, it, expect, beforeEach, vi } from 'vitest';

// Admin 4a-3a: GET /v1/admin/events/list (the redesigned Events page) and the
// fields GET /v1/admin/events/:id gained for Event edit.

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
  seedEvent,
  seedEventReport,
  seedPriceRetrievalLog,
  seedPriceSubmission,
  seedUserEvent,
  seedVenue,
} from '../../test/helpers/seed.js';
import { todayInDenver } from '../../lib/time.js';

const app = createApp();
const ADMIN_USER_ID = 'admin_user';
const HEADERS = { Authorization: 'Bearer admin-token' };

const dayOffset = (days: number): string => {
  const base = new Date(`${todayInDenver()}T12:00:00Z`);
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
};

interface ListBody {
  success: boolean;
  data: {
    rows: {
      id: string;
      title: string;
      status: string;
      hidden: boolean;
      hiddenReason: string | null;
      watchingCount: number;
      wentCount: number | null;
      venueSlug: string | null;
    }[];
    total: number;
    counts: {
      all: number;
      noPrice: number;
      hidden: number;
      byStatus: Record<string, number>;
      byVenue: { venueId: string; name: string; total: number }[];
    };
  };
}

const list = async (params = ''): Promise<ListBody> => {
  const res = await app.request(`/v1/admin/events/list${params}`, {
    headers: HEADERS,
  });
  expect(res.status).toBe(200);
  return (await res.json()) as ListBody;
};

beforeEach(async () => {
  authState.current = {
    userId: ADMIN_USER_ID,
    sessionClaims: { metadata: { role: 'admin' } },
  };
  await clearTables();
});

describe('GET /v1/admin/events/list', () => {
  it('returns upcoming shows in date order with fan-facing statuses and counts', async () => {
    const red = await seedVenue({ name: 'Red Rocks' });
    const globe = await seedVenue({ name: 'Globe Hall', slug: 'globe-hall' });
    const available = await seedEvent(red.id, {
      artist: 'Available Act',
      date: dayOffset(3),
      ticketPriceMin: '45.00',
    });
    const soldOut = await seedEvent(red.id, {
      artist: 'Sold Out Act',
      date: dayOffset(1),
      ticketPriceMin: '30.00',
    });
    await seedEventReport(soldOut.id, 'fan_1', {
      status: 'sold-out',
      resolvedAt: new Date(),
      resolution: 'promoted',
    });
    await seedEvent(globe.id, {
      artist: 'Delisted Act',
      date: dayOffset(2),
      status: 'cancelled',
      delistedAt: new Date(),
    });
    await seedEvent(globe.id, {
      artist: 'Hidden Act',
      date: dayOffset(4),
      hiddenFromConsumer: true,
      isConcertReviewNeeded: true,
    });
    await seedEvent(globe.id, { artist: 'Past Act', date: dayOffset(-2) });
    await seedUserEvent('fan_1', available.id, { status: 'watching' });
    await seedUserEvent('fan_2', available.id, { status: 'watching' });

    const body = await list();

    expect(body.data.rows.map((row) => row.title)).toEqual([
      soldOut.title,
      'Test Show — Delisted Act',
      available.title,
      'Test Show — Hidden Act',
    ]);
    const byTitle = new Map(body.data.rows.map((row) => [row.title, row]));
    expect(byTitle.get(soldOut.title)?.status).toBe('soldout');
    expect(byTitle.get('Test Show — Delisted Act')?.status).toBe('delisted');
    expect(byTitle.get(available.title)).toMatchObject({
      status: 'available',
      watchingCount: 2,
      wentCount: null,
    });
    expect(byTitle.get('Test Show — Hidden Act')).toMatchObject({
      status: 'available',
      hidden: true,
      hiddenReason: 'unsure',
    });
    expect(body.data.total).toBe(4);
    expect(body.data.counts).toMatchObject({
      all: 4,
      noPrice: 2,
      hidden: 1,
      byStatus: { available: 2, soldout: 1, delisted: 1 },
    });
    expect(body.data.counts.byVenue).toEqual([
      expect.objectContaining({ name: 'Globe Hall', total: 2 }),
      expect.objectContaining({ name: 'Red Rocks', total: 2 }),
    ]);
  });

  it('filters by venue, status, no price and hidden while chip counts keep the whole side', async () => {
    const red = await seedVenue({ name: 'Red Rocks' });
    const globe = await seedVenue({ name: 'Globe Hall', slug: 'globe-hall' });
    await seedEvent(red.id, {
      artist: 'Priced',
      date: dayOffset(1),
      ticketPriceMin: '20.00',
    });
    await seedEvent(red.id, { artist: 'Unpriced', date: dayOffset(2) });
    await seedEvent(globe.id, {
      artist: 'Postponed',
      date: dayOffset(3),
      status: 'postponed',
    });

    const byVenue = await list(`?venueIds=${red.id}`);
    expect(byVenue.data.rows).toHaveLength(2);
    expect(byVenue.data.counts.all).toBe(3);

    const byStatus = await list('?statuses=postponed,cancelled');
    expect(byStatus.data.rows.map((row) => row.status)).toEqual(['postponed']);
    // A trailing comma is not a value, and does not fail the request.
    const trailing = await list('?statuses=postponed,');
    expect(trailing.data.rows.map((row) => row.status)).toEqual(['postponed']);

    const noPrice = await list(`?noPrice=true&venueIds=${red.id}`);
    expect(noPrice.data.rows.map((row) => row.title)).toEqual([
      'Test Show — Unpriced',
    ]);

    const hidden = await list('?hidden=true');
    expect(hidden.data.rows).toEqual([]);
    expect(hidden.data.total).toBe(0);
  });

  it('lists past shows newest first, with Played and the went count', async () => {
    const venue = await seedVenue();
    const older = await seedEvent(venue.id, {
      artist: 'Older',
      date: dayOffset(-5),
    });
    const newer = await seedEvent(venue.id, {
      artist: 'Newer',
      date: dayOffset(-1),
    });
    await seedEvent(venue.id, {
      artist: 'Called Off',
      date: dayOffset(-3),
      status: 'cancelled',
    });
    await seedEvent(venue.id, { artist: 'Upcoming', date: dayOffset(2) });
    await seedUserEvent('fan_1', newer.id, { status: 'going' });

    const body = await list('?when=past');

    expect(body.data.rows.map((row) => row.title)).toEqual([
      newer.title,
      'Test Show — Called Off',
      older.title,
    ]);
    expect(body.data.rows[0]).toMatchObject({ status: 'played', wentCount: 1 });
    expect(body.data.rows[1]?.status).toBe('cancelled');
  });

  it('searches title, artist and venue', async () => {
    const venue = await seedVenue({ name: 'Bluebird Theater' });
    await seedEvent(venue.id, { artist: 'Marian Hill', date: dayOffset(1) });
    await seedEvent(venue.id, { artist: 'Someone Else', date: dayOffset(2) });

    expect((await list('?query=marian')).data.total).toBe(1);
    expect((await list('?query=bluebird')).data.total).toBe(2);
  });

  it('rejects an unknown status and a malformed venue id', async () => {
    for (const params of ['?statuses=moved', '?venueIds=not-a-uuid']) {
      const res = await app.request(`/v1/admin/events/list${params}`, {
        headers: HEADERS,
      });
      expect(res.status).toBe(400);
    }
  });

  it('is admin-only', async () => {
    authState.current = {
      userId: 'fan_user',
      sessionClaims: { metadata: { role: 'user' } },
    };
    const res = await app.request('/v1/admin/events/list', {
      headers: HEADERS,
    });
    expect(res.status).toBe(403);
  });
});

describe('GET /v1/admin/events/:id (Event edit fields)', () => {
  it('adds status, counts and the admin’s own price', async () => {
    const venue = await seedVenue();
    const event = await seedEvent(venue.id, {
      date: dayOffset(4),
      ticketUrl: 'https://tickets.example.com/x',
    });
    await seedUserEvent('fan_1', event.id, { status: 'watching' });
    await seedPriceSubmission(event.id, 'fan_1');
    const mine = await seedPriceSubmission(event.id, ADMIN_USER_ID);

    const res = await app.request(`/v1/admin/events/${event.id}`, {
      headers: HEADERS,
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: Record<string, unknown> };
    expect(body.data).toMatchObject({
      priceRetrievedAt: null,
    });
  });

  it('counts only standing prices: no counters, nothing stale, and the admin’s live price', async () => {
    const venue = await seedVenue();
    const event = await seedEvent(venue.id, { date: dayOffset(5) });
    const parent = await seedPriceSubmission(event.id, 'fan_1', {
      status: 'corroborated',
    });
    // A Price check counter against the fan's price, and a stale price of
    // the admin's own: neither is a Submitted price that stands.
    await seedPriceSubmission(event.id, 'fan_2', {
      disputedSubmissionId: parent.id,
    });
    await seedPriceSubmission(event.id, ADMIN_USER_ID, { status: 'stale' });
    await seedPriceRetrievalLog(event.id, venue.id, {
      attemptedAt: new Date('2026-11-10T15:00:00Z'),
    });

    const res = await app.request(`/v1/admin/events/${event.id}`, {
      headers: HEADERS,
    });
    const body = (await res.json()) as { data: Record<string, unknown> };
    expect(body.data).toMatchObject({
      submittedPriceCount: 1,
      mySubmissionId: null,
      priceRetrievedAt: '2026-11-10T15:00:00.000Z',
    });
  });

  it('names an admin-hidden show apart from an unsure one', async () => {
    const venue = await seedVenue();
    await seedEvent(venue.id, {
      artist: 'Hid By Admin',
      date: dayOffset(2),
      hiddenFromConsumer: true,
    });
    const body = await list('?hidden=true');
    expect(body.data.rows[0]?.hiddenReason).toBe('admin');
  });

  it('keeps the earlier fields', async () => {
    const venue = await seedVenue();
    const event = await seedEvent(venue.id, {
      date: dayOffset(4),
      ticketUrl: 'https://tickets.example.com/x',
    });
    await seedUserEvent('fan_1', event.id, { status: 'watching' });
    await seedPriceSubmission(event.id, 'fan_1');
    const mine = await seedPriceSubmission(event.id, ADMIN_USER_ID);

    const res = await app.request(`/v1/admin/events/${event.id}`, {
      headers: HEADERS,
    });
    const body = (await res.json()) as { data: Record<string, unknown> };
    expect(body.data).toMatchObject({
      id: event.id,
      listStatus: 'available',
      hiddenReason: null,
      watchingCount: 1,
      wentCount: 0,
      submittedPriceCount: 2,
      priceRetrievedAt: null,
      ticketUrl: 'https://tickets.example.com/x',
      mySubmissionId: mine.id,
    });
  });
});
