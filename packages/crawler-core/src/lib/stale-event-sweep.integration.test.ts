import { describe, it, expect, beforeEach } from 'vitest'
import { eq, sql } from 'drizzle-orm'
import { db, venues, events, auditLog } from '@concert-crawl/db'

import {
  sweepStaleEvents,
  STALE_EVENT_CANCEL_DAYS,
  STALE_SWEEP_ACTOR_ID,
} from './stale-event-sweep.js'

const DAY_MS = 24 * 60 * 60 * 1000

async function reset(): Promise<void> {
  await db.execute(
    sql`TRUNCATE events, venues, crawl_runs, notifications, cost_tracking, audit_log RESTART IDENTITY CASCADE`,
  )
}

async function seedVenue(): Promise<string> {
  const [venue] = await db
    .insert(venues)
    .values({
      name: 'Larimer Lounge',
      slug: 'larimer-lounge',
      websiteUrl: 'https://larimer.example',
    })
    .returning({ id: venues.id })
  if (!venue) throw new Error('seedVenue: no row')
  return venue.id
}

// Forward-dated so the sweep's own date handling is what's under test, not an
// accidental interaction with a past-dated row.
function futureDate(offsetDays: number): string {
  return new Date(Date.now() + (offsetDays + 1) * DAY_MS)
    .toISOString()
    .slice(0, 10)
}

interface EventSeed {
  /** Days ago the crawler first stopped seeing the row. `null` = still seen. */
  missingDaysAgo: number | null
  status?: 'upcoming' | 'cancelled' | 'postponed'
  date?: string
}

let actCounter = 0

async function seedEvent(venueId: string, seed: EventSeed): Promise<string> {
  const artist = `Act ${++actCounter}`
  const [row] = await db
    .insert(events)
    .values({
      venueId,
      title: artist,
      artist,
      date: seed.date ?? futureDate(30),
      status: seed.status ?? 'upcoming',
      firstMissingAt:
        seed.missingDaysAgo === null
          ? null
          : new Date(Date.now() - seed.missingDaysAgo * DAY_MS),
    })
    .returning({ id: events.id })
  if (!row) throw new Error('seedEvent: no row')
  return row.id
}

const statusOf = async (id: string): Promise<string> => {
  const [row] = await db
    .select({ status: events.status })
    .from(events)
    .where(eq(events.id, id))
  if (!row) throw new Error('statusOf: no row')
  return row.status
}

/**
 * #675 — a row the crawler has not seen on the venue page for two weeks is not
 * coming back. Leaving it `upcoming` keeps it occupying the partial unique
 * index `events_venue_date_canonical_artist_idx WHERE status='upcoming'`, which
 * blocks a genuine future booking at the same venue/date from resolving.
 */
describe('sweepStaleEvents (#675)', () => {
  beforeEach(async () => {
    await reset()
  })

  it('cancels rows missing longer than the threshold', async () => {
    const venueId = await seedVenue()
    const stale = await seedEvent(venueId, {
      missingDaysAgo: STALE_EVENT_CANCEL_DAYS + 1,
    })

    const result = await sweepStaleEvents()

    expect(result.cancelled).toBe(1)
    expect(await statusOf(stale)).toBe('cancelled')
  })

  it('leaves rows still inside the threshold alone', async () => {
    const venueId = await seedVenue()
    // A crawl gap of a few days is common — a venue page that briefly drops a
    // listing must not lose the row.
    const recent = await seedEvent(venueId, {
      missingDaysAgo: STALE_EVENT_CANCEL_DAYS - 1,
    })

    const result = await sweepStaleEvents()

    expect(result.cancelled).toBe(0)
    expect(await statusOf(recent)).toBe('upcoming')
  })

  it('ignores rows the crawler still sees', async () => {
    const venueId = await seedVenue()
    const live = await seedEvent(venueId, { missingDaysAgo: null })

    await sweepStaleEvents()

    expect(await statusOf(live)).toBe('upcoming')
  })

  it('leaves a postponed row alone', async () => {
    const venueId = await seedVenue()
    // Postponed means a human already made a call about this row; the sweep
    // only ever acts on rows nobody has triaged.
    const postponed = await seedEvent(venueId, {
      missingDaysAgo: STALE_EVENT_CANCEL_DAYS + 5,
      status: 'postponed',
    })

    const result = await sweepStaleEvents()

    expect(result.cancelled).toBe(0)
    expect(await statusOf(postponed)).toBe('postponed')
  })

  it('writes one audit row per cancellation', async () => {
    const venueId = await seedVenue()
    const stale = await seedEvent(venueId, {
      missingDaysAgo: STALE_EVENT_CANCEL_DAYS + 3,
    })

    await sweepStaleEvents()

    const rows = await db.select().from(auditLog)
    expect(rows).toHaveLength(1)
    expect(rows[0]?.actorId).toBe(STALE_SWEEP_ACTOR_ID)
    expect(rows[0]?.targetId).toBe(stale)
  })

  it('is idempotent — a second run cancels nothing further', async () => {
    const venueId = await seedVenue()
    await seedEvent(venueId, { missingDaysAgo: STALE_EVENT_CANCEL_DAYS + 1 })

    await sweepStaleEvents()
    const second = await sweepStaleEvents()

    expect(second.cancelled).toBe(0)
    expect(await db.select().from(auditLog)).toHaveLength(1)
  })
})
