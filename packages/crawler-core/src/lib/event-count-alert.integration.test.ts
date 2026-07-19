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

// Yield via setImmediate up to maxIterations times waiting for `predicate`
// to become true. Returns true if reached, false on exhaustion. Used by the
// #649 await-regression tests to wait for execution to reach the email call
// site without using real-time sleeps (which were both slow and fragile).
async function pollUntil(
  predicate: () => boolean,
  maxIterations = 1000,
): Promise<boolean> {
  for (let idx = 0; idx < maxIterations; idx += 1) {
    if (predicate()) return true
    await new Promise((resolve) => setImmediate(resolve))
  }
  return predicate()
}

async function seedSuccessfulRuns(
  venueId: string,
  eventsFoundList: number[],
): Promise<string[]> {
  // Use an explicit baseline createdAt so each row is ordered deterministically
  // by created_at without sleeping between inserts — earlier list entries get
  // older timestamps. This keeps the test fast and avoids timing flakiness
  // under load.
  const baseTime = Date.now() - eventsFoundList.length * 60_000
  const ids: string[] = []
  for (let idx = 0; idx < eventsFoundList.length; idx += 1) {
    const eventsFound = eventsFoundList[idx]!
    const [row] = await db
      .insert(crawlRuns)
      .values({
        venueId,
        status: 'success',
        eventsFound,
        eventsInserted: eventsFound,
        eventsUpdated: 0,
        robotsTxtBlocked: 'no',
        createdAt: new Date(baseTime + idx * 60_000),
      })
      .returning({ id: crawlRuns.id })
    if (!row) throw new Error('seedSuccessfulRuns: no row')
    ids.push(row.id)
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
    expect(notifs[0]!.metadata).toContain('"severity":"went_dark"')

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

  it('awaits the email send before returning (regression for #649)', async () => {
    // Locks in the fix for #649: the crawler runs as a Render cron that
    // hard-exits via process.exit(0) when main() resolves. If the email
    // call were fire-and-forget, the Resend HTTP request would get severed
    // before completion. This test installs a deferred Promise as the
    // email mock and asserts that checkEventCountDrop has NOT yet resolved
    // while that Promise is pending — i.e., it actually awaits.
    const venue = await seedVenue()
    const ids = await seedSuccessfulRuns(
      venue.id,
      [70, 65, 72, 68, 71, 69, 75, 0],
    )
    const currentRunId = ids[ids.length - 1]!

    let resolveEmail: () => void = () => {}
    const emailPromise = new Promise<void>((resolve) => {
      resolveEmail = resolve
    })
    mockSendEmail.mockImplementationOnce(() => emailPromise)

    const checkPromise = checkEventCountDrop({
      venueId: venue.id,
      venueName: venue.name,
      crawlRunId: currentRunId,
      eventsFound: 0,
      lastEventCountAlertAt: null,
    })

    let settled = false
    void checkPromise.then(() => {
      settled = true
    })

    // Poll until execution has actually reached the email call site (mock
    // invoked). This isolates the await as what's blocking the outer
    // Promise — without this, the test could pass on slow upstream DB work
    // alone, even if the email weren't actually awaited.
    const reached = await pollUntil(() => mockSendEmail.mock.calls.length === 1)
    expect(reached).toBe(true)

    // Yield once more so any synchronous continuation past the email call
    // (if the await were missing) would have had a chance to settle the
    // outer Promise. settled MUST still be false because the email Promise
    // is still pending.
    await new Promise((resolve) => setImmediate(resolve))
    expect(settled).toBe(false)

    resolveEmail()
    const outcome = await checkPromise
    expect(outcome.fired).toBe(true)
  })

  it('logs email failure + still returns fired:true when sendEventCountDropEmail rejects', async () => {
    // The email is a secondary delivery channel — its failure must not
    // change the function's return value, and the notification row above
    // must still be committed.
    const venue = await seedVenue()
    const ids = await seedSuccessfulRuns(
      venue.id,
      [70, 65, 72, 68, 71, 69, 75, 0],
    )
    const currentRunId = ids[ids.length - 1]!

    mockSendEmail.mockRejectedValueOnce(new Error('resend down'))
    // reportFailure routes severity 'error' through console.error (PR #808
    // standardized operational failures onto stderr) — spy there, not on
    // console.log.
    const logSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    try {
      const outcome = await checkEventCountDrop({
        venueId: venue.id,
        venueName: venue.name,
        crawlRunId: currentRunId,
        eventsFound: 0,
        lastEventCountAlertAt: null,
      })

      expect(outcome.fired).toBe(true)
      const errorLog = logSpy.mock.calls
        .map((args) => String(args[0]))
        .find((line) => line.includes('crawl.event_count_alert.email_error'))
      expect(errorLog).toBeDefined()
      expect(errorLog).toContain('resend down')

      const notifs = await db
        .select()
        .from(notifications)
        .where(eq(notifications.category, 'crawl.event_count_dropped'))
      expect(notifs).toHaveLength(1)
    } finally {
      logSpy.mockRestore()
    }
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

  it('excludes zero-event prior runs from baseline (#645)', async () => {
    // Reproduces the Bluebird-style "intermittently silently fails" pattern:
    // ~half the prior successful runs returned 0 events. Without the
    // zero-event filter, the baseline averages [25, 0, 25, 0, 25, 0, 25] =
    // 14.3, which understates the venue's real healthy throughput by ~45%.
    // With the filter, baseline averages only the four non-zero runs: 25.
    const venue = await seedVenue()
    await seedSuccessfulRuns(venue.id, [25, 0, 25, 0, 25, 0, 25])
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
    expect(outcome.baselineCount).toBe(25)
    expect(outcome.dropPercent).toBe(100)
  })

  it('stays in cold_start when fewer than 3 non-zero prior runs exist (#645)', async () => {
    // After the zero-event filter, a venue that has only ever returned 0
    // events has no baseline to compare against; the cold-start gate
    // should hold the alert until enough non-zero runs accumulate. Without
    // this behavior we'd page on the very first crawl of a stubbornly
    // dark venue.
    const venue = await seedVenue()
    // 5 prior successful runs but only 2 with events > 0
    await seedSuccessfulRuns(venue.id, [10, 0, 0, 0, 12])
    const [currentId] = await seedSuccessfulRuns(venue.id, [0])

    const outcome = await checkEventCountDrop({
      venueId: venue.id,
      venueName: venue.name,
      crawlRunId: currentId!,
      eventsFound: 0,
      lastEventCountAlertAt: null,
    })

    expect(outcome).toEqual({ fired: false, reason: 'cold_start' })
  })
})
