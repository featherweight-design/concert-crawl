import { describe, it, expect, beforeEach, vi } from 'vitest';
import { z } from 'zod';

vi.mock('@hono/clerk-auth', () => ({
  clerkMiddleware: () => async (_ctx: unknown, next: () => Promise<void>) =>
    next(),
  getAuth: () => null,
}));

import { createApp } from '../app.js';
import {
  clearTables,
  seedArtist,
  seedEvent,
  seedEventReport,
  seedVenue,
} from '../test/helpers/seed.js';

const app = createApp();

const isoDaysFromNow = (days: number): string =>
  new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

const FUTURE = isoDaysFromNow(60);

const rowSchema = z.object({ artist: z.string(), isSoldOut: z.boolean() });
const showSchema = z.object({ eventId: z.string(), isSoldOut: z.boolean() });

/**
 * B+ A4: rows never showed Sold out because the list payloads carried no
 * sold-out signal. Each one now carries `isSoldOut`, on the one definition
 * Watching and admin already use: a promoted fan sold-out report.
 */
describe('row payloads carry isSoldOut', () => {
  beforeEach(async () => {
    await clearTables();
  });

  const seedShows = async () => {
    const venue = await seedVenue({ name: 'Ogden', slug: 'ogden' });
    const soldOut = await seedEvent(venue.id, {
      artist: 'Sold Act',
      date: FUTURE,
    });
    const pending = await seedEvent(venue.id, {
      artist: 'Pending Act',
      date: FUTURE,
    });
    await seedEventReport(soldOut.id, 'fan_a', {
      resolution: 'promoted',
      resolvedAt: new Date(),
    });
    // An unresolved report is not a sold-out show.
    await seedEventReport(pending.id, 'fan_b');
    return { venue, soldOut, pending };
  };

  const byArtist = (rows: z.infer<typeof rowSchema>[]) =>
    Object.fromEntries(rows.map((row) => [row.artist, row.isSoldOut]));

  it('on the browse list', async () => {
    await seedShows();
    const res = await app.request('/v1/events');
    expect(res.status).toBe(200);
    const body = z
      .object({ data: z.object({ data: z.array(rowSchema) }) })
      .parse(await res.json());
    expect(byArtist(body.data.data)).toEqual({
      'Sold Act': true,
      'Pending Act': false,
    });
  });

  it("on a venue's upcoming shows", async () => {
    await seedShows();
    const res = await app.request('/v1/venues/ogden');
    expect(res.status).toBe(200);
    const body = z
      .object({ data: z.object({ upcomingEvents: z.array(rowSchema) }) })
      .parse(await res.json());
    expect(byArtist(body.data.upcomingEvents)).toEqual({
      'Sold Act': true,
      'Pending Act': false,
    });
  });

  it("on an artist's upcoming shows", async () => {
    const { soldOut } = await seedShows();
    await seedArtist({ name: 'Sold Act' });
    const res = await app.request('/v1/artists/sold-act');
    expect(res.status).toBe(200);
    const body = z
      .object({ data: z.object({ shows: z.array(showSchema) }) })
      .parse(await res.json());
    expect(body.data.shows).toEqual([
      expect.objectContaining({ eventId: soldOut.id, isSoldOut: true }),
    ]);
  });
});
