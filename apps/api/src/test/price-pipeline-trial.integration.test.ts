import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// The real price pipeline against the real database, with only the network
// stubbed, as packages/price-pipeline's tier 1 tests do.
vi.mock('@concert-crawl/crawler-core/robots', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('@concert-crawl/crawler-core/robots')
  >()),
  checkRobots: vi.fn().mockResolvedValue({ status: 'allowed' }),
  isAllowedOrSkip: vi.fn().mockResolvedValue(true),
  getCrawlDelayMs: vi.fn().mockResolvedValue(null),
}));
vi.mock('@concert-crawl/crawler-core/jitter', () => ({
  jitter: vi.fn(() => 0),
}));

import { eq } from 'drizzle-orm';
import { events } from '@concert-crawl/db';
import { runPricePipeline } from '@concert-crawl/price-pipeline';
import { clearTables, seedEvent, seedVenue } from './helpers/seed.js';
import { testDb } from './helpers/db.js';

const PRICE_PAGE = `
  <html><head>
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "MusicEvent",
    "offers": { "@type": "Offer", "lowPrice": 35, "highPrice": 75 }
  }
  </script>
  </head></html>
`;

async function seedPausedVenueEvent(removed = false) {
  const now = new Date();
  const venue = await seedVenue({
    name: 'Trial Price Venue',
    slug: 'trial-price-venue',
    crawlPausedAt: now,
    ...(removed ? { active: false, removedAt: now } : {}),
  });
  const event = await seedEvent(venue.id);
  return { venue, event };
}

async function priceOf(eventId: string): Promise<string | null | undefined> {
  const [row] = await testDb
    .select({ min: events.ticketPriceMin })
    .from(events)
    .where(eq(events.id, eventId));
  return row?.min;
}

const runFor = (
  venueId: string,
  eventId: string,
  trial: boolean,
): Promise<void> =>
  runPricePipeline({
    eventId,
    venueId,
    artist: 'Test Artist',
    date: '2026-06-01',
    priceUrl: 'https://trial-price.example.com/events/test',
    trial,
  });

describe('price pipeline: a trial on a paused venue', () => {
  beforeEach(async () => {
    await clearTables();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers(),
        text: async () => PRICE_PAGE,
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('saves the price it fetched', async () => {
    const { venue, event } = await seedPausedVenueEvent();

    await runFor(venue.id, event.id, true);

    expect(Number(await priceOf(event.id))).toBe(35);
  });

  it('still drops the price on a normal run for the paused venue', async () => {
    const { venue, event } = await seedPausedVenueEvent();

    await runFor(venue.id, event.id, false);

    expect(await priceOf(event.id)).toBeNull();
  });

  it('never saves a price for a removed venue, even on a trial', async () => {
    const { venue, event } = await seedPausedVenueEvent(true);

    await runFor(venue.id, event.id, true);

    expect(await priceOf(event.id)).toBeNull();
  });
});
