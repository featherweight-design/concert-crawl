import { describe, it, expect, beforeEach } from 'vitest'
import { eq, sql } from 'drizzle-orm'
import {
  db,
  events,
  venues,
  userEvents,
  priceSubmissions,
} from '@concert-crawl/db'
import {
  reconcileDriftDuplicates,
  EVENT_FK_TABLES,
} from './reconcile-drift-duplicates.js'

// Real Postgres (integration vitest config) — the reconcile is pure SQL over
// temp tables and FK reassignment, which an in-memory mock cannot exercise.

async function clearState(): Promise<void> {
  await db.execute(
    sql`TRUNCATE events, venues, user_events, price_submissions RESTART IDENTITY CASCADE`,
  )
}

async function seedVenue(): Promise<string> {
  const [venue] = await db
    .insert(venues)
    .values({
      name: `Reconcile Test Venue ${crypto.randomUUID()}`,
      slug: `reconcile-test-${crypto.randomUUID()}`,
      websiteUrl: 'https://reconcile-test.example.com',
      city: 'Denver',
      timezone: 'America/Denver',
      active: true,
      verified: true,
      crawlMode: 'browser',
    })
    .returning()
  if (!venue) throw new Error('venue insert returned no row')
  return venue.id
}

function futureDate(daysFromNow: number): string {
  const now = new Date()
  now.setUTCDate(now.getUTCDate() + daysFromNow)
  return now.toISOString().slice(0, 10)
}

beforeEach(async () => {
  await clearState()
})

describe('reconcileDriftDuplicates', () => {
  it('reassigns FK rows to the live sibling and deletes the drift orphan', async () => {
    const venueId = await seedVenue()
    const date = futureDate(30)

    const [sibling] = await db
      .insert(events)
      .values({
        venueId,
        title: 'Band X Live',
        artist: 'Band X',
        date,
        showTime: '20:00:00',
        status: 'upcoming',
        canonicalTitle: 'band x live',
        canonicalArtist: 'band x',
        firstMissingAt: null,
      })
      .returning()

    const [orphan] = await db
      .insert(events)
      .values({
        venueId,
        title: 'Band X with Support',
        artist: 'Band X with Support',
        date,
        showTime: '20:00:00',
        status: 'upcoming',
        canonicalTitle: 'band x with support',
        canonicalArtist: 'band x with support',
        firstMissingAt: new Date(),
      })
      .returning()

    const [unrelated] = await db
      .insert(events)
      .values({
        venueId,
        title: 'Other Act',
        artist: 'Other Act',
        date,
        showTime: '18:00:00',
        status: 'upcoming',
        canonicalTitle: 'other act',
        canonicalArtist: 'other act',
        firstMissingAt: new Date(),
      })
      .returning()

    if (!sibling || !orphan || !unrelated) {
      throw new Error('event seed returned no row')
    }

    const [watch] = await db
      .insert(userEvents)
      .values({
        userId: 'user_reconcile_1',
        eventId: orphan.id,
        status: 'watching',
      })
      .returning()

    const [submission] = await db
      .insert(priceSubmissions)
      .values({
        eventId: orphan.id,
        userId: 'user_reconcile_1',
        priceMin: '45.00',
        tier: 'GA',
        vendor: 'AXS',
        howFound: 'saw_listing',
      })
      .returning()

    if (!watch || !submission) throw new Error('FK seed returned no row')

    const result = await reconcileDriftDuplicates(venueId)

    expect(result.reconciledLosers).toBe(1)

    // Orphan deleted; sibling + unrelated row survive.
    const remaining = await db
      .select({ id: events.id })
      .from(events)
      .where(eq(events.venueId, venueId))
    const ids = remaining.map((row) => row.id)
    expect(ids).toContain(sibling.id)
    expect(ids).toContain(unrelated.id)
    expect(ids).not.toContain(orphan.id)

    // Watch + price submission now point at the sibling.
    const watchAfter = await db
      .select({ eventId: userEvents.eventId })
      .from(userEvents)
      .where(eq(userEvents.id, watch.id))
    expect(watchAfter[0]?.eventId).toBe(sibling.id)

    const submissionAfter = await db
      .select({ eventId: priceSubmissions.eventId })
      .from(priceSubmissions)
      .where(eq(priceSubmissions.id, submission.id))
    expect(submissionAfter[0]?.eventId).toBe(sibling.id)
  })

  it('is a no-op when there are no drift orphans', async () => {
    const venueId = await seedVenue()
    const date = futureDate(30)

    await db.insert(events).values({
      venueId,
      title: 'Band X Live',
      artist: 'Band X',
      date,
      showTime: '20:00:00',
      status: 'upcoming',
      canonicalTitle: 'band x live',
      canonicalArtist: 'band x',
      firstMissingAt: null,
    })

    // Genuinely-gone missing row — no headliner containment with the sibling.
    await db.insert(events).values({
      venueId,
      title: 'Departed Act',
      artist: 'Departed Act',
      date,
      showTime: '20:00:00',
      status: 'upcoming',
      canonicalTitle: 'departed act',
      canonicalArtist: 'departed act',
      firstMissingAt: new Date(),
    })

    const result = await reconcileDriftDuplicates(venueId)
    expect(result.reconciledLosers).toBe(0)
  })

  it('EVENT_FK_TABLES matches every FK table referencing events.id', async () => {
    const rows = await db.execute(sql`
      SELECT DISTINCT tc.table_name AS table_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_schema = tc.constraint_schema
       AND ccu.constraint_name   = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.constraint_schema = 'public'
        AND ccu.table_schema = 'public'
        AND ccu.table_name = 'events'
        AND ccu.column_name = 'id'
    `)
    const actual = [...rows].map((row) => row.table_name).sort()
    expect(actual).toEqual([...EVENT_FK_TABLES].sort())
  })
})
