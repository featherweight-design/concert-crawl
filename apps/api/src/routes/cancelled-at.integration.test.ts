import { describe, it, expect, beforeEach, vi } from 'vitest';
import { eq } from 'drizzle-orm';
import { events } from '@concert-crawl/db';
import { ER_POLICY } from '@concert-crawl/types';

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

import { createApp } from '../app.js';
import {
  clearTables,
  seedEvent,
  seedEventReport,
  seedVenue,
} from '../test/helpers/seed.js';
import { testDb } from '../test/helpers/db.js';

const app = createApp();

const as = (userId: string, role = 'user') => {
  authState.current = { userId, sessionClaims: { metadata: { role } } };
};
const headers = {
  Authorization: 'Bearer t',
  'Content-Type': 'application/json',
};

const FUTURE = '2099-09-01';
const EARLIER = new Date('2026-01-01T00:00:00Z');

const cancelledAtOf = async (id: string) => {
  const [row] = await testDb
    .select({ status: events.status, cancelledAt: events.cancelledAt })
    .from(events)
    .where(eq(events.id, id));
  return row;
};

const adminPatch = async (id: string, body: Record<string, unknown>) => {
  as('admin_user', 'admin');
  const res = await app.request(`/v1/admin/events/${id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(body),
  });
  expect(res.status).toBe(200);
};

/** Within a minute of now: the DB clock, not this process's. */
const expectRecent = (value: Date | null | undefined) => {
  expect(value).toBeInstanceOf(Date);
  expect(Math.abs(Date.now() - (value?.getTime() ?? 0))).toBeLessThan(60_000);
};

/**
 * 0127: events.cancelled_at is when a confirmed cancellation began, which the
 * crew page's Coming up list keeps for a day (addendum 6 item 41). Only the
 * confirmed writers set it; moving off cancelled clears it.
 */
describe('events.cancelled_at', () => {
  beforeEach(async () => {
    await clearTables();
    authState.current = null;
  });

  it('an admin cancelling a show stamps it', async () => {
    const venue = await seedVenue();
    const event = await seedEvent(venue.id, { date: FUTURE });
    await adminPatch(event.id, { status: 'cancelled' });
    const row = await cancelledAtOf(event.id);
    expect(row?.status).toBe('cancelled');
    expectRecent(row?.cancelledAt);
  });

  it('re-saving a cancelled show keeps its time, so the day does not restart', async () => {
    const venue = await seedVenue();
    const event = await seedEvent(venue.id, {
      date: FUTURE,
      status: 'cancelled',
      cancelledAt: EARLIER,
    });
    await adminPatch(event.id, { status: 'cancelled' });
    expect((await cancelledAtOf(event.id))?.cancelledAt).toEqual(EARLIER);
  });

  it("confirming the sweep's cancellation is a fresh one", async () => {
    const venue = await seedVenue();
    const event = await seedEvent(venue.id, {
      date: FUTURE,
      status: 'cancelled',
      delistedAt: EARLIER,
    });
    await adminPatch(event.id, { status: 'cancelled' });
    expectRecent((await cancelledAtOf(event.id))?.cancelledAt);
  });

  it('setting a cancelled show back to upcoming clears it', async () => {
    const venue = await seedVenue();
    const event = await seedEvent(venue.id, {
      date: FUTURE,
      status: 'cancelled',
      cancelledAt: EARLIER,
    });
    await adminPatch(event.id, { status: 'upcoming' });
    expect(await cancelledAtOf(event.id)).toEqual({
      status: 'upcoming',
      cancelledAt: null,
    });
  });

  it('an edit that leaves the status alone keeps it', async () => {
    const venue = await seedVenue();
    const event = await seedEvent(venue.id, {
      date: FUTURE,
      status: 'cancelled',
      cancelledAt: EARLIER,
    });
    await adminPatch(event.id, { tourName: 'Farewell' });
    expect((await cancelledAtOf(event.id))?.cancelledAt).toEqual(EARLIER);
  });

  it('a fan-confirmed cancellation stamps it', async () => {
    const venue = await seedVenue();
    const event = await seedEvent(venue.id, { date: FUTURE });
    const report = await seedEventReport(event.id, 'user_reporter', {
      status: 'cancelled',
    });
    for (let idx = 0; idx < ER_POLICY.confirmsRequired; idx++) {
      as(`user_confirmer_${idx}`);
      const res = await app.request(
        `/v1/events/${event.id}/reports/${report.id}/confirm`,
        { method: 'POST', headers },
      );
      expect(res.status).toBe(200);
    }
    const row = await cancelledAtOf(event.id);
    expect(row?.status).toBe('cancelled');
    expectRecent(row?.cancelledAt);
  });
});
