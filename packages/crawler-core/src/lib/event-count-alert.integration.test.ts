import { describe, it, expect, vi, beforeEach } from 'vitest'
import { eq, sql } from 'drizzle-orm'
import { db, venues, crawlRuns, notifications } from '@concert-crawl/db'

vi.mock('./email.js', () => ({
  sendEventCountDropEmail: vi.fn().mockResolvedValue(undefined),
  sendCrawlFailureEmail: vi.fn().mockResolvedValue(undefined),
}))

import { sendEventCountDropEmail } from './email.js'
import { checkEventCountDrop } from './event-count-alert.js'

const mockSendEmail = vi.mocked(sendEventCountDropEmail)

async function reset(): Promise<void> {
  await db.execute(
    sql`TRUNCATE events, venues, crawl_runs, notifications, cost_tracking RESTART IDENTITY CASCADE`,
  )
}

async function seedVenue(
  overrides: Partial<typeof venues.$inferInsert> = {},
): Promise<typeof venues.$inferSelect> {
  const [venue] = await db
    .insert(venues)
    .values({
      name: 'Bluebird Theater',
      slug: 'bluebird-theater',
      websiteUrl: 'https://bluebird.example',
      ...overrides,
    })
    .returning()
  if (!venue) throw new Error('seedVenue: no row')
  return venue
}

async function seedSuccessfulRuns(
  venueId: string,
  eventsFoundList: number[],
): Promise<string[]> {
  const ids: string[] = []
  for (const eventsFound of eventsFoundList) {
    const [row] = await db
      .insert(crawlRuns)
      .values({
        venueId,
        status: 'success',
        eventsFound,
        eventsInserted: eventsFound,
        eventsUpdated: 0,
        robotsTxtBlocked: 'no',
      })
      .returning({ id: crawlRuns.id })
    if (!row) throw new Error('seedSuccessfulRuns: no row')
    ids.push(row.id)
    // Stagger created_at slightly so desc(createdAt) is deterministic
    await new Promise((resolve) => setTimeout(resolve, 5))
  }
  return ids
}

describe('checkEventCountDrop', () => {
  beforeEach(async () => {
    await reset()
    mockSendEmail.mockClear()
  })

  it('skips with cold_start when fewer than 3 prior successful runs exist', async () => {
    const venue = await seedVenue()
    const runIds = await seedSuccessfulRuns(venue.id, [70, 70])
    const currentRunId = runIds[runIds.length - 1]!

    const outcome = await checkEventCountDrop({
      venueId: venue.id,
      venueName: venue.name,
      crawlRunId: currentRunId,
      eventsFound: 0,
      lastEventCountAlertAt: null,
    })

    expect(outcome).toEqual({ fired: false, reason: 'cold_start' })
    expect(mockSendEmail).not.toHaveBeenCalled()
    const notifs = await db
      .select()
      .from(notifications)
      .where(eq(notifications.category, 'crawl.event_count_dropped'))
    expect(notifs).toHaveLength(0)
  })

  it('fires went_dark + inserts notification + updates venue when eventsFound is 0 against a non-zero baseline', async () => {
    const venue = await seedVenue()
    // Seed 7 baseline runs averaging 70, plus the current zero-event run
    const ids = await seedSuccessfulRuns(
      venue.id,
      [70, 65, 72, 68, 71, 69, 75, 0],
    )
    const currentRunId = ids[ids.length - 1]!

    const outcome = await checkEventCountDrop({
      venueId: venue.id,
      venueName: venue.name,
      crawlRunId: currentRunId,
      eventsFound: 0,
      lastEventCountAlertAt: null,
    })

    expect(outcome.fired).toBe(true)
    if (!outcome.fired) throw new Error('expected outcome.fired')
    expect(outcome.severity).toBe('went_dark')
    expect(outcome.baselineCount).toBeGreaterThan(60)
    expect(outcome.dropPercent).toBeCloseTo(100, 0)

    const notifs = await db
      .select()
      .from(notifications)
      .where(eq(notifications.category, 'crawl.event_count_dropped'))
    expect(notifs).toHaveLength(1)
    expect(notifs[0]!.title).toContain('went dark')
    expect(notifs[0]!.metadata).toContain('"eventsFound":0')

    const [updatedVenue] = await db
      .select()
      .from(venues)
      .where(eq(venues.id, venue.id))
    expect(updatedVenue!.lastEventCountAlertAt).not.toBeNull()

    expect(mockSendEmail).toHaveBeenCalledOnce()
  })

  it('fires dropped_sharply when eventsFound is below 30% of baseline but > 0', async () => {
    const venue = await seedVenue()
    const ids = await seedSuccessfulRuns(
      venue.id,
      [70, 65, 72, 68, 71, 69, 75, 10],
    )
    const currentRunId = ids[ids.length - 1]!

    const outcome = await checkEventCountDrop({
      venueId: venue.id,
      venueName: venue.name,
      crawlRunId: currentRunId,
      eventsFound: 10,
      lastEventCountAlertAt: null,
    })

    expect(outcome.fired).toBe(true)
    if (!outcome.fired) throw new Error('expected outcome.fired')
    expect(outcome.severity).toBe('dropped_sharply')
  })

  it('does not fire when eventsFound is within range (no_drop)', async () => {
    const venue = await seedVenue()
    const ids = await seedSuccessfulRuns(
      venue.id,
      [70, 65, 72, 68, 71, 69, 75, 60],
    )
    const currentRunId = ids[ids.length - 1]!

    const outcome = await checkEventCountDrop({
      venueId: venue.id,
      venueName: venue.name,
      crawlRunId: currentRunId,
      eventsFound: 60,
      lastEventCountAlertAt: null,
    })

    expect(outcome).toEqual({ fired: false, reason: 'no_drop' })
    expect(mockSendEmail).not.toHaveBeenCalled()
  })

  it('skips with cooldown when lastEventCountAlertAt is within 7 days', async () => {
    const venue = await seedVenue()
    const ids = await seedSuccessfulRuns(
      venue.id,
      [70, 65, 72, 68, 71, 69, 75, 0],
    )
    const currentRunId = ids[ids.length - 1]!
    const now = new Date()
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)

    const outcome = await checkEventCountDrop({
      venueId: venue.id,
      venueName: venue.name,
      crawlRunId: currentRunId,
      eventsFound: 0,
      lastEventCountAlertAt: threeDaysAgo,
      now,
    })

    expect(outcome).toEqual({ fired: false, reason: 'cooldown' })
    expect(mockSendEmail).not.toHaveBeenCalled()
  })

  it('fires again after the cooldown window has elapsed', async () => {
    const venue = await seedVenue()
    const ids = await seedSuccessfulRuns(
      venue.id,
      [70, 65, 72, 68, 71, 69, 75, 0],
    )
    const currentRunId = ids[ids.length - 1]!
    const now = new Date()
    const eightDaysAgo = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000)

    const outcome = await checkEventCountDrop({
      venueId: venue.id,
      venueName: venue.name,
      crawlRunId: currentRunId,
      eventsFound: 0,
      lastEventCountAlertAt: eightDaysAgo,
      now,
    })

    expect(outcome.fired).toBe(true)
  })

  it('excludes the current run from baseline calculation', async () => {
    // If we did NOT exclude the current run, a regression to 0 would pull
    // its own baseline down. Seed exactly the cold-start minimum of prior
    // runs so the wrong behavior would change the answer.
    const venue = await seedVenue()
    const baselineRuns = await seedSuccessfulRuns(venue.id, [100, 100, 100])
    const [currentId] = await seedSuccessfulRuns(venue.id, [0])

    const outcome = await checkEventCountDrop({
      venueId: venue.id,
      venueName: venue.name,
      crawlRunId: currentId!,
      eventsFound: 0,
      lastEventCountAlertAt: null,
    })

    expect(outcome.fired).toBe(true)
    if (!outcome.fired) throw new Error('expected outcome.fired')
    // Baseline should be exactly 100 (prior runs only); if the current run
    // was included it would be (100+100+100+0)/4 = 75.
    expect(outcome.baselineCount).toBe(100)
    expect(baselineRuns).toHaveLength(3) // sanity
  })
})
