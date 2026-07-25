import { describe, it, expect, beforeEach } from 'vitest'
import { eq, sql } from 'drizzle-orm'
import { db, venues, crawlRuns, notifications } from '@concert-crawl/db'

import { checkEventCeiling } from './event-ceiling-alert.js'

async function reset(): Promise<void> {
  await db.execute(
    sql`TRUNCATE events, venues, crawl_runs, notifications, cost_tracking RESTART IDENTITY CASCADE`,
  )
}

async function seedVenue(): Promise<typeof venues.$inferSelect> {
  const [venue] = await db
    .insert(venues)
    .values({
      name: 'Fillmore Auditorium',
      slug: 'fillmore-auditorium',
      websiteUrl: 'https://fillmore.example',
    })
    .returning()
  if (!venue) throw new Error('seedVenue: no row')
  return venue
}

interface RunSeed {
  eventsFound: number
  furthestEventDate?: string | null
  status?: 'success' | 'partial' | 'failed' | 'skipped'
}

// Explicit ascending createdAt so ordering is deterministic without sleeping
// between inserts. Later list entries are newer.
async function seedRuns(venueId: string, runs: RunSeed[]): Promise<string[]> {
  const baseTime = Date.now() - runs.length * 60_000
  const ids: string[] = []
  for (let idx = 0; idx < runs.length; idx += 1) {
    const run = runs[idx]!
    const [row] = await db
      .insert(crawlRuns)
      .values({
        venueId,
        status: run.status ?? 'success',
        eventsFound: run.eventsFound,
        eventsUsable: run.eventsFound,
        eventsInserted: run.eventsFound,
        eventsUpdated: 0,
        robotsTxtBlocked: 'no',
        furthestEventDate: run.furthestEventDate ?? null,
        createdAt: new Date(baseTime + idx * 60_000),
      })
      .returning({ id: crawlRuns.id })
    if (!row) throw new Error('seedRuns: no row')
    ids.push(row.id)
  }
  return ids
}

async function ceilingNotifications(): Promise<
  (typeof notifications.$inferSelect)[]
> {
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.category, 'crawl.event_ceiling_suspected'))
}

describe('checkEventCeiling', () => {
  beforeEach(async () => {
    await reset()
  })

  it('skips with not_healthy when the run kept no events (event-count-alert owns that case)', async () => {
    const venue = await seedVenue()
    const ids = await seedRuns(venue.id, [
      { eventsFound: 40, furthestEventDate: '2026-12-01' },
      { eventsFound: 40, furthestEventDate: '2026-12-01' },
      { eventsFound: 40, furthestEventDate: '2026-12-01' },
      { eventsFound: 0, furthestEventDate: null },
    ])

    const outcome = await checkEventCeiling({
      venueId: venue.id,
      venueName: venue.name,
      crawlRunId: ids[ids.length - 1]!,
      eventsFound: 0,
      eventsUsable: 0,
      furthestEventDate: null,
      lastEventCeilingAlertAt: null,
    })

    expect(outcome).toEqual({ fired: false, reason: 'not_healthy' })
    expect(await ceilingNotifications()).toHaveLength(0)
  })

  it('skips with cold_start when fewer than 3 prior successful runs exist', async () => {
    const venue = await seedVenue()
    const ids = await seedRuns(venue.id, [
      { eventsFound: 40, furthestEventDate: '2027-01-01' },
      { eventsFound: 36, furthestEventDate: '2026-09-01' },
    ])

    const outcome = await checkEventCeiling({
      venueId: venue.id,
      venueName: venue.name,
      crawlRunId: ids[ids.length - 1]!,
      eventsFound: 36,
      eventsUsable: 36,
      furthestEventDate: '2026-09-01',
      lastEventCeilingAlertAt: null,
    })

    expect(outcome).toEqual({ fired: false, reason: 'cold_start' })
  })

  it('fires horizon_shrank when the furthest announced show moves materially closer', async () => {
    const venue = await seedVenue()
    const ids = await seedRuns(venue.id, [
      { eventsFound: 80, furthestEventDate: '2027-02-01' },
      { eventsFound: 82, furthestEventDate: '2027-02-14' },
      { eventsFound: 79, furthestEventDate: '2027-02-10' },
      { eventsFound: 36, furthestEventDate: '2026-10-01' },
    ])

    const outcome = await checkEventCeiling({
      venueId: venue.id,
      venueName: venue.name,
      crawlRunId: ids[ids.length - 1]!,
      eventsFound: 36,
      eventsUsable: 36,
      furthestEventDate: '2026-10-01',
      lastEventCeilingAlertAt: null,
    })

    expect(outcome.fired).toBe(true)
    if (!outcome.fired) throw new Error('expected outcome.fired')
    expect(outcome.kind).toBe('horizon_shrank')

    const notifs = await ceilingNotifications()
    expect(notifs).toHaveLength(1)
    expect(notifs[0]!.title).toContain('Fillmore Auditorium')
    expect(notifs[0]!.metadata).toContain('"kind":"horizon_shrank"')
    expect(notifs[0]!.metadata).toContain('"furthestEventDate":"2026-10-01"')

    const [updated] = await db
      .select()
      .from(venues)
      .where(eq(venues.id, venue.id))
    expect(updated!.lastEventCeilingAlertAt).not.toBeNull()
  })

  it('compares the horizon against the best recent reading, not the previous run (ratcheting cap)', async () => {
    // A cap that tightens a little each night: no single step clears 30 days,
    // but the fall from the venue's best reading does.
    const venue = await seedVenue()
    const ids = await seedRuns(venue.id, [
      { eventsFound: 80, furthestEventDate: '2027-01-01' },
      { eventsFound: 78, furthestEventDate: '2026-12-12' },
      { eventsFound: 75, furthestEventDate: '2026-11-25' },
      { eventsFound: 70, furthestEventDate: '2026-11-10' },
    ])

    const outcome = await checkEventCeiling({
      venueId: venue.id,
      venueName: venue.name,
      crawlRunId: ids[ids.length - 1]!,
      eventsFound: 70,
      eventsUsable: 70,
      furthestEventDate: '2026-11-10',
      lastEventCeilingAlertAt: null,
    })

    expect(outcome.fired).toBe(true)
    if (!outcome.fired) throw new Error('expected outcome.fired')
    expect(outcome.kind).toBe('horizon_shrank')
    expect(outcome.detail).toContain('2027-01-01')
  })

  it('does not fire when the horizon moves in by less than the 30-day threshold', async () => {
    const venue = await seedVenue()
    const ids = await seedRuns(venue.id, [
      { eventsFound: 80, furthestEventDate: '2027-01-01' },
      { eventsFound: 82, furthestEventDate: '2027-01-01' },
      { eventsFound: 79, furthestEventDate: '2027-01-01' },
      { eventsFound: 77, furthestEventDate: '2026-12-20' },
    ])

    const outcome = await checkEventCeiling({
      venueId: venue.id,
      venueName: venue.name,
      crawlRunId: ids[ids.length - 1]!,
      eventsFound: 77,
      eventsUsable: 77,
      furthestEventDate: '2026-12-20',
      lastEventCeilingAlertAt: null,
    })

    expect(outcome).toEqual({ fired: false, reason: 'no_ceiling' })
    expect(await ceilingNotifications()).toHaveLength(0)
  })

  it('fires pinned_count on 5 consecutive successful crawls with identical counts (the #1127 Fillmore fingerprint)', async () => {
    const venue = await seedVenue()
    // Horizon holds steady so only the pinned-count fingerprint can trip.
    const ids = await seedRuns(venue.id, [
      { eventsFound: 36, furthestEventDate: '2026-12-01' },
      { eventsFound: 36, furthestEventDate: '2026-12-01' },
      { eventsFound: 36, furthestEventDate: '2026-12-01' },
      { eventsFound: 36, furthestEventDate: '2026-12-01' },
      { eventsFound: 36, furthestEventDate: '2026-12-01' },
    ])

    const outcome = await checkEventCeiling({
      venueId: venue.id,
      venueName: venue.name,
      crawlRunId: ids[ids.length - 1]!,
      eventsFound: 36,
      eventsUsable: 36,
      furthestEventDate: '2026-12-01',
      lastEventCeilingAlertAt: null,
    })

    expect(outcome.fired).toBe(true)
    if (!outcome.fired) throw new Error('expected outcome.fired')
    expect(outcome.kind).toBe('pinned_count')
    expect(outcome.detail).toContain('36')

    const notifs = await ceilingNotifications()
    expect(notifs).toHaveLength(1)
    expect(notifs[0]!.metadata).toContain('"kind":"pinned_count"')
  })

  it('does not fire pinned_count when one run in the streak differs', async () => {
    const venue = await seedVenue()
    const ids = await seedRuns(venue.id, [
      { eventsFound: 36, furthestEventDate: '2026-12-01' },
      { eventsFound: 36, furthestEventDate: '2026-12-01' },
      { eventsFound: 35, furthestEventDate: '2026-12-01' },
      { eventsFound: 36, furthestEventDate: '2026-12-01' },
      { eventsFound: 36, furthestEventDate: '2026-12-01' },
    ])

    const outcome = await checkEventCeiling({
      venueId: venue.id,
      venueName: venue.name,
      crawlRunId: ids[ids.length - 1]!,
      eventsFound: 36,
      eventsUsable: 36,
      furthestEventDate: '2026-12-01',
      lastEventCeilingAlertAt: null,
    })

    expect(outcome).toEqual({ fired: false, reason: 'no_ceiling' })
  })

  it('ignores a pinned streak below the 10-event floor', async () => {
    // A small venue can genuinely run the same four shows for a week.
    const venue = await seedVenue()
    const ids = await seedRuns(venue.id, [
      { eventsFound: 4, furthestEventDate: '2026-12-01' },
      { eventsFound: 4, furthestEventDate: '2026-12-01' },
      { eventsFound: 4, furthestEventDate: '2026-12-01' },
      { eventsFound: 4, furthestEventDate: '2026-12-01' },
      { eventsFound: 4, furthestEventDate: '2026-12-01' },
    ])

    const outcome = await checkEventCeiling({
      venueId: venue.id,
      venueName: venue.name,
      crawlRunId: ids[ids.length - 1]!,
      eventsFound: 4,
      eventsUsable: 4,
      furthestEventDate: '2026-12-01',
      lastEventCeilingAlertAt: null,
    })

    expect(outcome).toEqual({ fired: false, reason: 'no_ceiling' })
  })

  it('holds the horizon check until 3 prior runs carry a reading (post-migration arming)', async () => {
    // Migration 0061 leaves furthest_event_date NULL on historical rows, so a
    // freshly deployed guard must not read the first post-deploy crawl as a
    // collapse. Pinned-count is also unavailable here (counts vary).
    const venue = await seedVenue()
    const ids = await seedRuns(venue.id, [
      { eventsFound: 80, furthestEventDate: null },
      { eventsFound: 82, furthestEventDate: null },
      { eventsFound: 79, furthestEventDate: '2027-02-01' },
      { eventsFound: 36, furthestEventDate: '2026-10-01' },
    ])

    const outcome = await checkEventCeiling({
      venueId: venue.id,
      venueName: venue.name,
      crawlRunId: ids[ids.length - 1]!,
      eventsFound: 36,
      eventsUsable: 36,
      furthestEventDate: '2026-10-01',
      lastEventCeilingAlertAt: null,
    })

    expect(outcome).toEqual({ fired: false, reason: 'no_ceiling' })
    expect(await ceilingNotifications()).toHaveLength(0)
  })

  it('passes over a failed run rather than letting it break the streak', async () => {
    // A failed run carries no count, so it is absence of evidence — not
    // evidence against a cap. Breaking the streak on it would blind the guard
    // to exactly the flaky venues most worth watching.
    const venue = await seedVenue()
    const ids = await seedRuns(venue.id, [
      { eventsFound: 36, furthestEventDate: '2026-12-01' },
      { eventsFound: 36, furthestEventDate: '2026-12-01' },
      { eventsFound: 0, furthestEventDate: null, status: 'failed' },
      { eventsFound: 36, furthestEventDate: '2026-12-01' },
      { eventsFound: 36, furthestEventDate: '2026-12-01' },
      { eventsFound: 36, furthestEventDate: '2026-12-01' },
    ])

    const outcome = await checkEventCeiling({
      venueId: venue.id,
      venueName: venue.name,
      crawlRunId: ids[ids.length - 1]!,
      eventsFound: 36,
      eventsUsable: 36,
      furthestEventDate: '2026-12-01',
      lastEventCeilingAlertAt: null,
    })

    expect(outcome.fired).toBe(true)
    if (!outcome.fired) throw new Error('expected outcome.fired')
    expect(outcome.kind).toBe('pinned_count')
  })

  it('excludes skipped runs from the history so a dedup skip cannot break a streak', async () => {
    const venue = await seedVenue()
    const ids = await seedRuns(venue.id, [
      { eventsFound: 36, furthestEventDate: '2026-12-01' },
      { eventsFound: 36, furthestEventDate: '2026-12-01' },
      { eventsFound: 0, furthestEventDate: null, status: 'skipped' },
      { eventsFound: 36, furthestEventDate: '2026-12-01' },
      { eventsFound: 36, furthestEventDate: '2026-12-01' },
      { eventsFound: 36, furthestEventDate: '2026-12-01' },
    ])

    const outcome = await checkEventCeiling({
      venueId: venue.id,
      venueName: venue.name,
      crawlRunId: ids[ids.length - 1]!,
      eventsFound: 36,
      eventsUsable: 36,
      furthestEventDate: '2026-12-01',
      lastEventCeilingAlertAt: null,
    })

    expect(outcome.fired).toBe(true)
    if (!outcome.fired) throw new Error('expected outcome.fired')
    expect(outcome.kind).toBe('pinned_count')
  })

  it('suppresses a second alert inside the 7-day cooldown', async () => {
    const venue = await seedVenue()
    const ids = await seedRuns(venue.id, [
      { eventsFound: 36, furthestEventDate: '2026-12-01' },
      { eventsFound: 36, furthestEventDate: '2026-12-01' },
      { eventsFound: 36, furthestEventDate: '2026-12-01' },
      { eventsFound: 36, furthestEventDate: '2026-12-01' },
      { eventsFound: 36, furthestEventDate: '2026-12-01' },
    ])
    const now = new Date()
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)

    const outcome = await checkEventCeiling({
      venueId: venue.id,
      venueName: venue.name,
      crawlRunId: ids[ids.length - 1]!,
      eventsFound: 36,
      eventsUsable: 36,
      furthestEventDate: '2026-12-01',
      lastEventCeilingAlertAt: threeDaysAgo,
      now,
    })

    expect(outcome).toEqual({ fired: false, reason: 'cooldown' })
    expect(await ceilingNotifications()).toHaveLength(0)
  })

  it('fires again once the cooldown window has elapsed', async () => {
    const venue = await seedVenue()
    const ids = await seedRuns(venue.id, [
      { eventsFound: 36, furthestEventDate: '2026-12-01' },
      { eventsFound: 36, furthestEventDate: '2026-12-01' },
      { eventsFound: 36, furthestEventDate: '2026-12-01' },
      { eventsFound: 36, furthestEventDate: '2026-12-01' },
      { eventsFound: 36, furthestEventDate: '2026-12-01' },
    ])
    const now = new Date()
    const eightDaysAgo = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000)

    const outcome = await checkEventCeiling({
      venueId: venue.id,
      venueName: venue.name,
      crawlRunId: ids[ids.length - 1]!,
      eventsFound: 36,
      eventsUsable: 36,
      furthestEventDate: '2026-12-01',
      lastEventCeilingAlertAt: eightDaysAgo,
      now,
    })

    expect(outcome.fired).toBe(true)
  })

  it('clears the cooldown marker when a healthy run lands inside the window', async () => {
    const venue = await seedVenue()
    const ids = await seedRuns(venue.id, [
      { eventsFound: 80, furthestEventDate: '2027-01-01' },
      { eventsFound: 82, furthestEventDate: '2027-01-05' },
      { eventsFound: 79, furthestEventDate: '2027-01-03' },
      { eventsFound: 84, furthestEventDate: '2027-01-08' },
    ])
    const now = new Date()
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)
    await db
      .update(venues)
      .set({ lastEventCeilingAlertAt: threeDaysAgo })
      .where(eq(venues.id, venue.id))

    const outcome = await checkEventCeiling({
      venueId: venue.id,
      venueName: venue.name,
      crawlRunId: ids[ids.length - 1]!,
      eventsFound: 84,
      eventsUsable: 84,
      furthestEventDate: '2027-01-08',
      lastEventCeilingAlertAt: threeDaysAgo,
      now,
    })

    expect(outcome).toEqual({ fired: false, reason: 'no_ceiling' })
    const [updated] = await db
      .select()
      .from(venues)
      .where(eq(venues.id, venue.id))
    expect(updated!.lastEventCeilingAlertAt).toBeNull()
  })

  it('leaves a newer cooldown marker alone when the healthy run started before it', async () => {
    // Admin trigger-crawl overlapping the nightly cron: an unconditional clear
    // would wipe a marker a concurrent capped run had just written.
    const venue = await seedVenue()
    const ids = await seedRuns(venue.id, [
      { eventsFound: 80, furthestEventDate: '2027-01-01' },
      { eventsFound: 82, furthestEventDate: '2027-01-05' },
      { eventsFound: 79, furthestEventDate: '2027-01-03' },
      { eventsFound: 84, furthestEventDate: '2027-01-08' },
    ])
    const now = new Date()
    const staleSnapshot = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)
    const freshMarker = new Date(now.getTime() - 60_000)
    await db
      .update(venues)
      .set({ lastEventCeilingAlertAt: freshMarker })
      .where(eq(venues.id, venue.id))

    const outcome = await checkEventCeiling({
      venueId: venue.id,
      venueName: venue.name,
      crawlRunId: ids[ids.length - 1]!,
      eventsFound: 84,
      eventsUsable: 84,
      furthestEventDate: '2027-01-08',
      lastEventCeilingAlertAt: staleSnapshot,
      now,
    })

    expect(outcome).toEqual({ fired: false, reason: 'no_ceiling' })
    const [updated] = await db
      .select()
      .from(venues)
      .where(eq(venues.id, venue.id))
    expect(updated!.lastEventCeilingAlertAt?.getTime()).toBe(
      freshMarker.getTime(),
    )
  })
})
