import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@hono/clerk-auth', () => ({
  clerkMiddleware: () => async (_ctx: unknown, next: () => Promise<void>) =>
    next(),
  getAuth: () => null,
}));

import { events } from '@concert-crawl/db';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { createApp } from '../app.js';
import { testDb } from '../test/helpers/db.js';
import {
  clearTables,
  seedEvent,
  seedEventReport,
  seedVenue,
} from '../test/helpers/seed.js';

const app = createApp();

const detailBody = z.object({
  data: z.object({
    priceStatus: z.string().nullable(),
    soldOutReport: z.unknown().nullable(),
  }),
});
// The browse list nests its page under data.data (beside total, limit, offset).
const listBody = z.object({
  data: z.object({
    data: z.array(z.object({ id: z.string(), isSoldOut: z.boolean() })),
  }),
});

/**
 * A cancelled or postponed show has no sale to be sold out of: no fan surface
 * reads Sold out on it, even with a sold-out promoted before its status
 * changed. The row is kept, so the show reads Sold out again once it is back
 * on the calendar.
 */
describe('sold out as fans read it', () => {
  let eventId: string;

  beforeEach(async () => {
    await clearTables();
    const venue = await seedVenue();
    const event = await seedEvent(venue.id, { date: '2099-09-01' });
    eventId = event.id;
    await seedEventReport(eventId, 'user_sold_out_reporter', {
      status: 'sold-out',
      resolution: 'promoted',
      resolvedAt: new Date(),
    });
  });

  const setStatus = (status: 'upcoming' | 'cancelled' | 'postponed') =>
    testDb.update(events).set({ status }).where(eq(events.id, eventId));

  const detail = async () =>
    detailBody.parse(await (await app.request(`/v1/events/${eventId}`)).json())
      .data;

  const listed = async () =>
    listBody
      .parse(await (await app.request('/v1/events')).json())
      .data.data.find((row) => row.id === eventId);

  it('reads sold out on an upcoming show', async () => {
    expect((await detail()).priceStatus).toBe('soldout');
    expect((await listed())?.isSoldOut).toBe(true);
  });

  it.each(['cancelled', 'postponed'] as const)(
    'never reads sold out on a %s show, on detail or in the list',
    async (status) => {
      await setStatus(status);

      const shown = await detail();
      expect(shown.priceStatus).toBeNull();
      expect(shown.soldOutReport).toBeNull();
      expect((await listed())?.isSoldOut).toBe(false);
    },
  );

  it('never reads sold out on a show the sweep delisted', async () => {
    await testDb
      .update(events)
      .set({ status: 'cancelled', delistedAt: new Date() })
      .where(eq(events.id, eventId));

    expect((await detail()).priceStatus).toBeNull();
    expect((await listed())?.isSoldOut).toBe(false);
  });

  it('reads sold out again once a postponed show is back on', async () => {
    await setStatus('postponed');
    expect((await detail()).priceStatus).toBeNull();

    await setStatus('upcoming');
    expect((await detail()).priceStatus).toBe('soldout');
    expect((await listed())?.isSoldOut).toBe(true);
  });
});
