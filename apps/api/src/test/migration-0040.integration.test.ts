import { beforeEach, describe, expect, it } from 'vitest'
import { sql } from 'drizzle-orm'
import { events, priceSubmissions } from '@concert-crawl/db'
import { testDb } from './helpers/db.js'
import { clearTables, seedEvent, seedVenue } from './helpers/seed.js'

// Migration 0040 — source_category enum + ticket_links jsonb + 1/2 corroboration.
// These tests exercise the schema produced by the migration directly (rather
// than through an API route) so structural regressions are caught even if the
// surface area routes around the new columns.

describe('migration 0040 — source_category + ticket_links + corroboration', () => {
  let eventId: string
  let testCounter = 0

  beforeEach(async () => {
    testCounter += 1
    await clearTables()
    // Unique slug per test — clearTables truncates between tests, but the
    // unique constraint on venues.slug makes collisions easier to spot when
    // anything goes sideways with isolation.
    const venue = await seedVenue({
      slug: `mig-0040-venue-${testCounter}`,
      name: `Mig 0040 Venue ${testCounter}`,
    })
    const event = await seedEvent(venue.id, {
      artist: `Mig 0040 Artist ${testCounter}`,
    })
    eventId = event.id
  })

  it('source_category column accepts boxoffice/standard/resale', async () => {
    const [boxoffice] = await testDb
      .insert(priceSubmissions)
      .values({
        eventId,
        userId: 'user_test_0040_a',
        priceMin: '25',
        tier: 'GA',
        vendor: 'Ticketmaster',
        howFound: 'bought_myself',
        sourceCategory: 'boxoffice',
      })
      .returning()
    expect(boxoffice!.sourceCategory).toBe('boxoffice')

    const [standard] = await testDb
      .insert(priceSubmissions)
      .values({
        eventId,
        userId: 'user_test_0040_b',
        priceMin: '30',
        tier: 'GA',
        vendor: 'AXS',
        howFound: 'saw_listing',
        sourceCategory: 'standard',
      })
      .returning()
    expect(standard!.sourceCategory).toBe('standard')

    const [resale] = await testDb
      .insert(priceSubmissions)
      .values({
        eventId,
        userId: 'user_test_0040_c',
        priceMin: '90',
        tier: 'GA',
        vendor: 'Ticketmaster',
        howFound: 'saw_listing',
        sourceCategory: 'resale',
      })
      .returning()
    expect(resale!.sourceCategory).toBe('resale')
  })

  it('source_category rejects values outside the enum', async () => {
    await expect(
      testDb.execute(
        sql`INSERT INTO price_submissions (event_id, user_id, price_min, tier, vendor, how_found, source_category)
            VALUES (${eventId}, 'user_test_0040_bad', 25, 'GA', 'Ticketmaster', 'bought_myself', 'invalid_value')`,
      ),
    ).rejects.toThrow()
  })

  it('corroboration_count defaults to 1 on insert', async () => {
    const [inserted] = await testDb
      .insert(priceSubmissions)
      .values({
        eventId,
        userId: 'user_test_0040_default',
        priceMin: '30',
        tier: 'GA',
        vendor: 'Ticketmaster',
        howFound: 'bought_myself',
        sourceCategory: 'standard',
      })
      .returning()
    expect(inserted!.corroborationCount).toBe(1)
  })

  it('partial unique index pins corroborated boxoffice to one row per (event, tier)', async () => {
    await testDb.insert(priceSubmissions).values({
      eventId,
      userId: 'user_test_0040_first',
      priceMin: '30',
      tier: 'GA',
      vendor: 'VenueBoxOffice',
      howFound: 'at_the_venue',
      sourceCategory: 'boxoffice',
      status: 'corroborated',
    })

    // Drizzle wraps the underlying Postgres error in "Failed query: ..."; the
    // original error (with the constraint name) is on `.cause`. Inspect both
    // so the assertion is specific to THIS constraint, not generic.
    let caught: unknown
    try {
      await testDb.insert(priceSubmissions).values({
        eventId,
        userId: 'user_test_0040_second',
        priceMin: '35',
        tier: 'GA',
        vendor: 'VenueBoxOffice',
        howFound: 'at_the_venue',
        sourceCategory: 'boxoffice',
        status: 'corroborated',
      })
    } catch (error) {
      caught = error
    }

    expect(caught).toBeDefined()
    const causeMessage =
      caught instanceof Error && caught.cause instanceof Error
        ? caught.cause.message
        : ''
    expect(causeMessage).toMatch(/price_submissions_event_tier_boxoffice_uniq/)
  })

  it('different tier does not collide with corroborated boxoffice index', async () => {
    await testDb.insert(priceSubmissions).values({
      eventId,
      userId: 'user_test_0040_ga',
      priceMin: '30',
      tier: 'GA',
      vendor: 'VenueBoxOffice',
      howFound: 'at_the_venue',
      sourceCategory: 'boxoffice',
      status: 'corroborated',
    })

    await expect(
      testDb.insert(priceSubmissions).values({
        eventId,
        userId: 'user_test_0040_reserved',
        priceMin: '60',
        tier: 'Reserved',
        vendor: 'VenueBoxOffice',
        howFound: 'at_the_venue',
        sourceCategory: 'boxoffice',
        status: 'corroborated',
      }),
    ).resolves.toBeDefined()
  })

  it('different source_category does not collide with corroborated boxoffice index', async () => {
    await testDb.insert(priceSubmissions).values({
      eventId,
      userId: 'user_test_0040_boxoffice',
      priceMin: '30',
      tier: 'GA',
      vendor: 'VenueBoxOffice',
      howFound: 'at_the_venue',
      sourceCategory: 'boxoffice',
      status: 'corroborated',
    })

    await expect(
      testDb.insert(priceSubmissions).values({
        eventId,
        userId: 'user_test_0040_standard',
        priceMin: '50',
        tier: 'GA',
        vendor: 'Ticketmaster',
        howFound: 'bought_myself',
        sourceCategory: 'standard',
        status: 'corroborated',
      }),
    ).resolves.toBeDefined()
  })

  it('partial unique index does NOT apply to pending boxoffice rows', async () => {
    // Two pending boxoffice rows for the same (event, tier) are allowed —
    // only the corroborated slice is unique.
    await testDb.insert(priceSubmissions).values({
      eventId,
      userId: 'user_test_0040_pending_a',
      priceMin: '30',
      tier: 'GA',
      vendor: 'VenueBoxOffice',
      howFound: 'at_the_venue',
      sourceCategory: 'boxoffice',
      status: 'pending',
    })

    await expect(
      testDb.insert(priceSubmissions).values({
        eventId,
        userId: 'user_test_0040_pending_b',
        priceMin: '35',
        tier: 'GA',
        vendor: 'VenueBoxOffice',
        howFound: 'at_the_venue',
        sourceCategory: 'boxoffice',
        status: 'pending',
      }),
    ).resolves.toBeDefined()
  })

  it('ticket_links column persists the typed TicketLink shape', async () => {
    const links = [
      {
        kind: 'boxoffice' as const,
        vendor: null,
        url: 'https://example.com/box',
      },
      {
        kind: 'primary' as const,
        vendor: 'ticketmaster',
        url: 'https://example.com/tm',
      },
    ]
    await testDb
      .update(events)
      .set({ ticketLinks: links })
      .where(sql`id = ${eventId}`)

    const [row] = await testDb
      .select({ ticketLinks: events.ticketLinks })
      .from(events)
      .where(sql`id = ${eventId}`)

    expect(row!.ticketLinks).toEqual(links)
  })
})
