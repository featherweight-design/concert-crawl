import { beforeEach, describe, expect, it } from 'vitest'
import { eq, isNotNull } from 'drizzle-orm'
import { events, venues } from '@concert-crawl/db'
import { deriveTicketLinks } from '@concert-crawl/crawler-core'
import { testDb } from './helpers/db.js'
import { clearTables, seedEvent, seedVenue } from './helpers/seed.js'

// Re-implementation of the apps/crawler backfill CLI loop, kept in the test
// file so the test runs inside vitest (the CLI uses `process.exit` and
// initialises its own DB connection, neither of which composes with the
// integration harness). Behavior under test is the integration between
// `deriveTicketLinks` and the events + venues tables.
async function runBackfill(): Promise<void> {
  const rows = await testDb
    .select({
      eventId: events.id,
      ticketUrl: events.ticketUrl,
      venueWebsiteUrl: venues.websiteUrl,
      venueTicketVendor: venues.ticketVendor,
    })
    .from(events)
    .innerJoin(venues, eq(events.venueId, venues.id))
    .where(isNotNull(events.ticketUrl))

  for (const row of rows) {
    const ticketLinks = deriveTicketLinks(row.ticketUrl, {
      websiteUrl: row.venueWebsiteUrl,
      ticketVendor: row.venueTicketVendor,
    })
    await testDb
      .update(events)
      .set({ ticketLinks })
      .where(eq(events.id, row.eventId))
  }
}

describe('backfill-ticket-links integration', () => {
  beforeEach(async () => {
    await clearTables()
  })

  it('marks venue-host URLs as boxoffice', async () => {
    const venue = await seedVenue({
      slug: `boxoffice-venue-${Date.now()}`,
      websiteUrl: 'https://www.larimerlounge.com/',
      ticketVendor: null,
    })
    const event = await seedEvent(venue.id, {
      ticketUrl: 'https://www.larimerlounge.com/event/42',
      artist: 'Boxoffice Test',
    })

    await runBackfill()

    const [reloaded] = await testDb
      .select({ ticketLinks: events.ticketLinks })
      .from(events)
      .where(eq(events.id, event.id))

    expect(reloaded?.ticketLinks).toEqual([
      {
        kind: 'boxoffice',
        vendor: null,
        url: 'https://www.larimerlounge.com/event/42',
      },
    ])
  })

  it('marks Ticketmaster URLs as primary with vendor Ticketmaster', async () => {
    const venue = await seedVenue({
      slug: `primary-venue-${Date.now()}`,
      websiteUrl: 'https://example-venue.com/',
      ticketVendor: 'ticketmaster',
    })
    const event = await seedEvent(venue.id, {
      ticketUrl: 'https://www.ticketmaster.com/event/abc',
      artist: 'Ticketmaster Test',
    })

    await runBackfill()

    const [reloaded] = await testDb
      .select({ ticketLinks: events.ticketLinks })
      .from(events)
      .where(eq(events.id, event.id))

    expect(reloaded?.ticketLinks).toEqual([
      {
        kind: 'primary',
        vendor: 'Ticketmaster',
        url: 'https://www.ticketmaster.com/event/abc',
      },
    ])
  })

  it('marks StubHub URLs as resale', async () => {
    const venue = await seedVenue({
      slug: `resale-venue-${Date.now()}`,
      websiteUrl: 'https://example-venue.com/',
      ticketVendor: null,
    })
    const event = await seedEvent(venue.id, {
      ticketUrl: 'https://www.stubhub.com/show-tickets/event/123',
      artist: 'StubHub Test',
    })

    await runBackfill()

    const [reloaded] = await testDb
      .select({ ticketLinks: events.ticketLinks })
      .from(events)
      .where(eq(events.id, event.id))

    expect(reloaded?.ticketLinks?.[0]?.kind).toBe('resale')
    expect(reloaded?.ticketLinks?.[0]?.vendor).toBeNull()
  })

  it('leaves events with null ticketUrl unchanged', async () => {
    const venue = await seedVenue({
      slug: `no-ticket-venue-${Date.now()}`,
      websiteUrl: 'https://example-venue.com/',
      ticketVendor: null,
    })
    const event = await seedEvent(venue.id, {
      ticketUrl: null,
      artist: 'No Ticket Test',
    })

    await runBackfill()

    const [reloaded] = await testDb
      .select({ ticketLinks: events.ticketLinks })
      .from(events)
      .where(eq(events.id, event.id))

    expect(reloaded?.ticketLinks).toBeNull()
  })

  it('is idempotent — running twice produces the same result', async () => {
    const venue = await seedVenue({
      slug: `idem-venue-${Date.now()}`,
      websiteUrl: 'https://example-venue.com/',
      ticketVendor: 'axs',
    })
    const event = await seedEvent(venue.id, {
      ticketUrl: 'https://www.axs.com/events/xyz',
      artist: 'Idempotency Test',
    })

    await runBackfill()
    const [afterFirst] = await testDb
      .select({ ticketLinks: events.ticketLinks })
      .from(events)
      .where(eq(events.id, event.id))

    await runBackfill()
    const [afterSecond] = await testDb
      .select({ ticketLinks: events.ticketLinks })
      .from(events)
      .where(eq(events.id, event.id))

    expect(afterSecond?.ticketLinks).toEqual(afterFirst?.ticketLinks)
  })
})
