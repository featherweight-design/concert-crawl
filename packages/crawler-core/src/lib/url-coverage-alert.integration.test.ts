import { describe, it, expect, beforeEach } from 'vitest'
import { eq, sql } from 'drizzle-orm'
import { db, venues, events, notifications } from '@concert-crawl/db'

import { checkUrlCoverage } from './url-coverage-alert.js'

async function reset(): Promise<void> {
  await db.execute(
    sql`TRUNCATE events, venues, crawl_runs, notifications, cost_tracking RESTART IDENTITY CASCADE`,
  )
}

async function seedVenue(): Promise<typeof venues.$inferSelect> {
  const [venue] = await db
    .insert(venues)
    .values({
      name: "Cervantes' Masterpiece Ballroom",
      slug: 'cervantes-masterpiece-ballroom',
      websiteUrl: 'https://cervantes.example',
    })
    .returning()
  if (!venue) throw new Error('seedVenue: no row')
  return venue
}

interface EventSeed {
  covered: boolean
  /** Defaults to a date comfortably in the future. */
  date?: string
  hidden?: boolean
  missing?: boolean
  status?: 'upcoming' | 'cancelled' | 'postponed'
}

// Dates are generated forward from tomorrow so the check's "upcoming" filter
// stays true regardless of when the suite runs.
function futureDate(offsetDays: number): string {
  const when = new Date(Date.now() + (offsetDays + 1) * 24 * 60 * 60 * 1000)
  return when.toISOString().slice(0, 10)
}

async function seedEvents(venueId: string, seeds: EventSeed[]): Promise<void> {
  for (let idx = 0; idx < seeds.length; idx += 1) {
    const seed = seeds[idx]!
    await db.insert(events).values({
      venueId,
      title: `Show ${idx}`,
      artist: `Artist ${idx}`,
      date: seed.date ?? futureDate(idx),
      ticketUrl: seed.covered ? `https://tickets.example/${idx}` : null,
      eventUrl: null,
      hiddenFromConsumer: seed.hidden ?? false,
      firstMissingAt: seed.missing ? new Date() : null,
      status: seed.status ?? 'upcoming',
    })
  }
}

async function coverageNotifications(): Promise<
  (typeof notifications.$inferSelect)[]
> {
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.category, 'crawl.url_coverage_gap'))
}

const BASE_INPUT = {
  crawlRunId: '00000000-0000-4000-8000-000000000001',
  eventsUsable: 20,
  lastUrlCoverageAlertAt: null,
}

describe('checkUrlCoverage', () => {
  beforeEach(async () => {
    await reset()
  })

  it('skips with not_healthy when the run kept no events (event-count-alert owns that case)', async () => {
    const venue = await seedVenue()
    await seedEvents(
      venue.id,
      Array.from({ length: 20 }, () => ({ covered: false })),
    )

    const outcome = await checkUrlCoverage({
      ...BASE_INPUT,
      venueId: venue.id,
      venueName: venue.name,
      eventsUsable: 0,
    })

    expect(outcome).toEqual({ fired: false, reason: 'not_healthy' })
    expect(await coverageNotifications()).toHaveLength(0)
  })

  it('skips a catalogue below the minimum size even when nothing is covered', async () => {
    const venue = await seedVenue()
    await seedEvents(
      venue.id,
      Array.from({ length: 9 }, () => ({ covered: false })),
    )

    const outcome = await checkUrlCoverage({
      ...BASE_INPUT,
      venueId: venue.id,
      venueName: venue.name,
    })

    expect(outcome).toEqual({ fired: false, reason: 'small_catalogue' })
    expect(await coverageNotifications()).toHaveLength(0)
  })

  it('fires no_coverage when the whole upcoming catalogue lacks both URLs', async () => {
    const venue = await seedVenue()
    await seedEvents(
      venue.id,
      Array.from({ length: 20 }, () => ({ covered: false })),
    )

    const outcome = await checkUrlCoverage({
      ...BASE_INPUT,
      venueId: venue.id,
      venueName: venue.name,
    })

    expect(outcome).toMatchObject({
      fired: true,
      severity: 'no_coverage',
      uncoveredCount: 20,
      upcomingCount: 20,
    })

    const rows = await coverageNotifications()
    expect(rows).toHaveLength(1)
    expect(rows[0]!.type).toBe('admin_alert')
    expect(rows[0]!.title).toContain('Ticket links missing')
    // Written as `coverage`, not `severity` — the admin crawl route's shared
    // metadata schema already binds `severity` to the went-dark enum.
    expect(JSON.parse(rows[0]!.metadata ?? '{}')).toMatchObject({
      coverage: 'no_coverage',
      uncoveredCount: 20,
      upcomingCount: 20,
    })

    const [row] = await db
      .select({ marker: venues.lastUrlCoverageAlertAt })
      .from(venues)
      .where(eq(venues.id, venue.id))
    expect(row?.marker).not.toBeNull()
  })

  it('fires partial_gap when only part of the catalogue lacks URLs', async () => {
    const venue = await seedVenue()
    await seedEvents(venue.id, [
      ...Array.from({ length: 10 }, () => ({ covered: false })),
      ...Array.from({ length: 10 }, () => ({ covered: true })),
    ])

    const outcome = await checkUrlCoverage({
      ...BASE_INPUT,
      venueId: venue.id,
      venueName: venue.name,
    })

    expect(outcome).toMatchObject({
      fired: true,
      severity: 'partial_gap',
      uncoveredCount: 10,
      upcomingCount: 20,
      uncoveredPercent: 50,
    })
  })

  // The Cervantes dual-room booking: one legitimately URL-less row in a healthy
  // catalogue must not alert, or the guard is noise from the day it ships.
  it('stays quiet for a single straggler in a large covered catalogue', async () => {
    const venue = await seedVenue()
    await seedEvents(venue.id, [
      { covered: false },
      ...Array.from({ length: 127 }, () => ({ covered: true })),
    ])

    const outcome = await checkUrlCoverage({
      ...BASE_INPUT,
      venueId: venue.id,
      venueName: venue.name,
    })

    expect(outcome).toEqual({ fired: false, reason: 'covered' })
    expect(await coverageNotifications()).toHaveLength(0)
  })

  it('ignores past, hidden, cancelled and already-missing events when measuring coverage', async () => {
    const venue = await seedVenue()
    await seedEvents(venue.id, [
      // 12 healthy upcoming events — the only rows that should count.
      ...Array.from({ length: 12 }, () => ({ covered: true })),
      // Uncovered, but invisible to consumers, so no broken CTA exists.
      ...Array.from({ length: 10 }, () => ({ covered: false, hidden: true })),
      ...Array.from({ length: 10 }, () => ({ covered: false, missing: true })),
      // Uncovered, but the show isn't happening — no live CTA to break.
      ...Array.from({ length: 10 }, () => ({
        covered: false,
        status: 'cancelled' as const,
      })),
      ...Array.from({ length: 10 }, () => ({
        covered: false,
        status: 'postponed' as const,
      })),
      // Uncovered, but the show already happened.
      { covered: false, date: '2020-01-01' },
    ])

    const outcome = await checkUrlCoverage({
      ...BASE_INPUT,
      venueId: venue.id,
      venueName: venue.name,
    })

    expect(outcome).toEqual({ fired: false, reason: 'covered' })
    expect(await coverageNotifications()).toHaveLength(0)
  })

  it('suppresses a repeat alert inside the cooldown window', async () => {
    const venue = await seedVenue()
    await seedEvents(
      venue.id,
      Array.from({ length: 20 }, () => ({ covered: false })),
    )

    const outcome = await checkUrlCoverage({
      ...BASE_INPUT,
      venueId: venue.id,
      venueName: venue.name,
      lastUrlCoverageAlertAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    })

    expect(outcome).toEqual({ fired: false, reason: 'cooldown' })
    expect(await coverageNotifications()).toHaveLength(0)
  })

  it('re-alerts once the cooldown window has elapsed', async () => {
    const venue = await seedVenue()
    await seedEvents(
      venue.id,
      Array.from({ length: 20 }, () => ({ covered: false })),
    )

    const outcome = await checkUrlCoverage({
      ...BASE_INPUT,
      venueId: venue.id,
      venueName: venue.name,
      lastUrlCoverageAlertAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
    })

    expect(outcome).toMatchObject({ fired: true, severity: 'no_coverage' })
    expect(await coverageNotifications()).toHaveLength(1)
  })

  // The #1174 lesson: a recovered venue must not stay silenced for the rest of
  // the window, or a second regression inside seven days goes unreported.
  it('clears the cooldown marker on a healthy run', async () => {
    const venue = await seedVenue()
    const marker = new Date(Date.now() - 24 * 60 * 60 * 1000)
    await db
      .update(venues)
      .set({ lastUrlCoverageAlertAt: marker })
      .where(eq(venues.id, venue.id))
    await seedEvents(
      venue.id,
      Array.from({ length: 20 }, () => ({ covered: true })),
    )

    const outcome = await checkUrlCoverage({
      ...BASE_INPUT,
      venueId: venue.id,
      venueName: venue.name,
      lastUrlCoverageAlertAt: marker,
    })

    expect(outcome).toEqual({ fired: false, reason: 'covered' })
    const [row] = await db
      .select({ marker: venues.lastUrlCoverageAlertAt })
      .from(venues)
      .where(eq(venues.id, venue.id))
    expect(row?.marker).toBeNull()
  })

  it('leaves the cooldown marker alone when a concurrent run rewrote it', async () => {
    const venue = await seedVenue()
    const staleSnapshot = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const concurrentMarker = new Date(Date.now() - 60 * 1000)
    await db
      .update(venues)
      .set({ lastUrlCoverageAlertAt: concurrentMarker })
      .where(eq(venues.id, venue.id))
    await seedEvents(
      venue.id,
      Array.from({ length: 20 }, () => ({ covered: true })),
    )

    // This run started before the concurrent write, so its compare-and-set
    // should lose and leave the newer marker standing.
    await checkUrlCoverage({
      ...BASE_INPUT,
      venueId: venue.id,
      venueName: venue.name,
      lastUrlCoverageAlertAt: staleSnapshot,
    })

    const [row] = await db
      .select({ marker: venues.lastUrlCoverageAlertAt })
      .from(venues)
      .where(eq(venues.id, venue.id))
    expect(row?.marker).not.toBeNull()
  })

  it('scopes the check to the venue being crawled', async () => {
    const venue = await seedVenue()
    const [other] = await db
      .insert(venues)
      .values({
        name: 'Hi-Dive',
        slug: 'hi-dive',
        websiteUrl: 'https://hi-dive.example',
      })
      .returning()
    if (!other) throw new Error('no other venue')

    await seedEvents(
      venue.id,
      Array.from({ length: 20 }, () => ({ covered: true })),
    )
    await seedEvents(
      other.id,
      Array.from({ length: 20 }, () => ({ covered: false })),
    )

    const outcome = await checkUrlCoverage({
      ...BASE_INPUT,
      venueId: venue.id,
      venueName: venue.name,
    })

    expect(outcome).toEqual({ fired: false, reason: 'covered' })
    expect(await coverageNotifications()).toHaveLength(0)
  })
})
