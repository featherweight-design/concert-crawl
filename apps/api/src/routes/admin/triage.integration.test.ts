import { describe, it, expect, beforeEach, vi } from 'vitest'

const { authState } = vi.hoisted(() => ({
  authState: {
    current: null as {
      userId: string
      sessionClaims: { metadata?: { role?: string } }
    } | null,
  },
}))

vi.mock('@hono/clerk-auth', () => ({
  clerkMiddleware: () => async (_c: unknown, next: () => Promise<void>) =>
    next(),
  getAuth: () => authState.current,
}))

import { createApp } from '../../app.js'
import { clearTables, seedEvent, seedVenue } from '../../test/helpers/seed.js'
import { testDb } from '../../test/helpers/db.js'
import { crawlRuns } from '@concert-crawl/db'

const app = createApp()

function setAuth(role: 'admin' | 'user'): void {
  authState.current = {
    userId: 'test-admin-1',
    sessionClaims: { metadata: { role } },
  }
}

interface TriageFaultRow {
  id: string
  venueId: string
  venue: string
  condition: string
  band: string
  persistedSince: string
  days: number
  dur: string
  crawlRunId: string | null
  d: Record<string, unknown>
}

interface TriageBody {
  success: boolean
  data: {
    faults: TriageFaultRow[]
    queues: { kind: string; count: number; breakdown: string }[]
    sweep: { venues: number; at: string; events: number; next: string }
  }
}

async function fetchTriage(): Promise<TriageBody['data']> {
  const res = await app.request('/v1/admin/triage')
  expect(res.status).toBe(200)
  const body: TriageBody = await res.json()
  expect(body.success).toBe(true)
  return body.data
}

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Seed crawl runs oldest-first, one per day ending `daysAgo` days back from
 * now, so the derived streaks have real timestamps to walk.
 */
async function seedRuns(
  venueId: string,
  rows: Partial<typeof crawlRuns.$inferInsert>[],
): Promise<(typeof crawlRuns.$inferSelect)[]> {
  const inserted: (typeof crawlRuns.$inferSelect)[] = []
  const total = rows.length
  for (let index = 0; index < total; index += 1) {
    const row = rows[index]!
    const [created] = await testDb
      .insert(crawlRuns)
      .values({
        venueId,
        status: 'success',
        eventsFound: 12,
        eventsUsable: 12,
        createdAt: new Date(Date.now() - (total - index) * DAY_MS),
        ...row,
      })
      .returning()
    if (!created) throw new Error('seedRuns: insert returned no rows')
    inserted.push(created)
  }
  return inserted
}

/**
 * A healthy run history: a steady usable count (what went-dark averages) with
 * `eventsFound` nudged run to run. A perfectly flat `eventsFound` is itself a
 * fault — five identical counts is the `pinned_count` ceiling fingerprint —
 * so a genuinely all-clear venue has to wobble.
 */
const baselineRuns = (
  count: number,
  eventsUsable: number,
): Partial<typeof crawlRuns.$inferInsert>[] =>
  Array.from({ length: count }, (_, index) => ({
    status: 'success' as const,
    eventsFound: eventsUsable + (index % 3),
    eventsUsable,
  }))

/** Runs with a dead-flat `eventsFound` — the pinned-count fingerprint. */
const flatRuns = (
  count: number,
  eventsFound: number,
): Partial<typeof crawlRuns.$inferInsert>[] =>
  Array.from({ length: count }, () => ({
    status: 'success' as const,
    eventsFound,
    eventsUsable: eventsFound,
  }))

describe('GET /v1/admin/triage', () => {
  beforeEach(async () => {
    authState.current = null
    await clearTables()
  })

  it('requires an admin role', async () => {
    setAuth('user')
    const res = await app.request('/v1/admin/triage')
    expect(res.status).toBe(403)
  })

  it('returns the all-clear shape when nothing is wrong', async () => {
    setAuth('admin')
    const venue = await seedVenue({ name: 'Healthy Hall', slug: 'healthy' })
    await seedRuns(venue.id, baselineRuns(8, 12))

    const data = await fetchTriage()
    expect(data.faults).toEqual([])
    expect(data.queues).toEqual([])
    expect(data.sweep.venues).toBe(1)
    expect(data.sweep.next).toMatch(/AM|PM/)
  })

  // ── The #624 regression ───────────────────────────────────────────
  // Bluebird: a run that SUCCEEDED and returned 2 events against a 7-run
  // baseline of ~12. Neither venue.status nor blockedAt moved, which is why
  // the old panel showed nothing for weeks.
  it('surfaces a successful run that returned far fewer events than baseline', async () => {
    setAuth('admin')
    const venue = await seedVenue({
      name: 'Bluebird Theater',
      slug: 'bluebird',
    })
    await seedRuns(venue.id, [
      ...baselineRuns(7, 12),
      { status: 'success', eventsFound: 2, eventsUsable: 2 },
    ])

    const data = await fetchTriage()
    const fault = data.faults.find((row) => row.condition === 'wentDark')

    expect(fault).toBeDefined()
    expect(fault?.venue).toBe('Bluebird Theater')
    expect(fault?.band).toBe('loss')
    expect(fault?.d['count']).toBe(2)
    expect(fault?.d['baselineCount']).toBe(12)
    // Interpolated from SOFT_DROP_RATIO (0.3), not the handoff's assumed -60.
    expect(fault?.d['threshold']).toBe(-70)
    expect(fault?.d['window']).toBe(7)
    // Oldest-to-newest micro-chart: the flat baseline, then the cliff.
    const series = fault?.d['series']
    expect(Array.isArray(series)).toBe(true)
    expect(series).toEqual([12, 12, 12, 12, 12, 12, 2])
  })

  it('clears the went-dark row once a healthy run lands', async () => {
    setAuth('admin')
    const venue = await seedVenue({
      name: 'Bluebird Theater',
      slug: 'bluebird',
    })
    await seedRuns(venue.id, [
      ...baselineRuns(7, 12),
      { status: 'success', eventsFound: 2, eventsUsable: 2 },
    ])
    expect((await fetchTriage()).faults).toHaveLength(1)

    await testDb.insert(crawlRuns).values({
      venueId: venue.id,
      status: 'success',
      eventsFound: 13,
      eventsUsable: 13,
    })

    expect((await fetchTriage()).faults).toEqual([])
  })

  it('dates the went-dark row from the first run in the unbroken streak', async () => {
    setAuth('admin')
    const venue = await seedVenue({
      name: 'Bluebird Theater',
      slug: 'bluebird',
    })
    await seedRuns(venue.id, [
      ...baselineRuns(7, 12),
      { status: 'success', eventsFound: 1, eventsUsable: 1 },
      { status: 'success', eventsFound: 2, eventsUsable: 2 },
      { status: 'success', eventsFound: 0, eventsUsable: 0 },
    ])

    const [fault] = (await fetchTriage()).faults
    expect(fault?.condition).toBe('wentDark')
    // Three consecutive dark runs, one per day: the streak reaches back ~3 days.
    expect(fault?.days).toBeGreaterThan(2.5)
    expect(fault?.dur).toBe('3d')
  })

  it('does not widen the baseline to partial-status runs', async () => {
    setAuth('admin')
    const venue = await seedVenue({ name: 'Partial Palace', slug: 'partial' })
    // Three healthy runs, then three zero-usable 'partial' runs (#1165), then
    // a run that returned 2. If partial rows entered the baseline, the average
    // would collapse to ~6 and the drop would read as within tolerance.
    await seedRuns(venue.id, [
      ...baselineRuns(3, 12),
      ...Array.from({ length: 3 }, () => ({
        status: 'partial' as const,
        eventsFound: 0,
        eventsUsable: 0,
      })),
      { status: 'success', eventsFound: 2, eventsUsable: 2 },
    ])

    const [fault] = (await fetchTriage()).faults
    expect(fault?.condition).toBe('wentDark')
    expect(fault?.d['baselineCount']).toBe(12)
  })

  // ── blocked ───────────────────────────────────────────────────────
  it('surfaces a blocked venue and clears it when the block lifts', async () => {
    setAuth('admin')
    const blockedAt = new Date(Date.now() - 12 * DAY_MS)
    const venue = await seedVenue({
      name: 'Red Rocks',
      slug: 'red-rocks',
      blockedAt,
      consecutiveFailures: 9,
    })
    await seedRuns(venue.id, [
      { status: 'success', eventsFound: 20, eventsUsable: 20 },
      {
        status: 'failed',
        httpStatusCode: 403,
        eventsFound: 0,
        eventsUsable: 0,
      },
    ])

    const [fault] = (await fetchTriage()).faults
    expect(fault?.condition).toBe('blocked')
    expect(fault?.band).toBe('hard')
    expect(fault?.dur).toBe('12d')
    expect(fault?.d['status']).toBe(403)
    expect(fault?.d['refusals']).toBe(9)
    expect(fault?.d['lastSuccess']).toMatch(/\w{3} \d+/)

    // Lifting the block is not on its own a recovery — the last run still
    // failed, so the venue drops from `blocked` to `failed`. It clears only
    // once a run actually succeeds.
    await testDb
      .update((await import('@concert-crawl/db')).venues)
      .set({ blockedAt: null, consecutiveFailures: 0 })
    expect((await fetchTriage()).faults[0]?.condition).toBe('failed')

    await testDb.insert(crawlRuns).values({
      venueId: venue.id,
      status: 'success',
      eventsFound: 21,
      eventsUsable: 21,
    })
    expect((await fetchTriage()).faults).toEqual([])
  })

  // ── crawl failing ─────────────────────────────────────────────────
  it('surfaces a failing crawl and clears it on the next success', async () => {
    setAuth('admin')
    const venue = await seedVenue({
      name: 'Marquis Theater',
      slug: 'marquis',
      consecutiveFailures: 2,
      active: false,
    })
    await seedRuns(venue.id, [
      { status: 'success', eventsFound: 8, eventsUsable: 8 },
      {
        status: 'failed',
        eventsFound: 0,
        eventsUsable: 0,
        errorMessage: 'Navigation timeout of 30000ms exceeded',
      },
      {
        status: 'failed',
        eventsFound: 0,
        eventsUsable: 0,
        errorMessage: 'Navigation timeout of 30000ms exceeded',
      },
    ])

    const [fault] = (await fetchTriage()).faults
    expect(fault?.condition).toBe('failed')
    expect(fault?.band).toBe('hard')
    expect(fault?.d['failures']).toBe(2)
    expect(fault?.d['errorClass']).toBe('timeout')
    expect(fault?.d['pauseAt']).toBe(3)
    // Two consecutive failures, one per day.
    expect(fault?.dur).toBe('2d')

    await testDb.insert(crawlRuns).values({
      venueId: venue.id,
      status: 'success',
      eventsFound: 8,
      eventsUsable: 8,
    })
    expect((await fetchTriage()).faults).toEqual([])
  })

  // ── ceiling ───────────────────────────────────────────────────────
  it('surfaces a pinned event count and clears it when the count moves', async () => {
    setAuth('admin')
    const venue = await seedVenue({ name: 'Gothic Theatre', slug: 'gothic' })
    await seedRuns(venue.id, [...flatRuns(3, 34), ...flatRuns(5, 20)])

    const [fault] = (await fetchTriage()).faults
    expect(fault?.condition).toBe('ceiling')
    expect(fault?.band).toBe('suspect')
    expect(fault?.d['kind']).toBe('pinned_count')
    expect(fault?.d['count']).toBe(20)
    expect(fault?.d['runs']).toBe(5)
    expect(fault?.d['was']).toBe(34)

    await testDb.insert(crawlRuns).values({
      venueId: venue.id,
      status: 'success',
      eventsFound: 27,
      eventsUsable: 27,
    })
    expect((await fetchTriage()).faults).toEqual([])
  })

  it('surfaces a shrinking announcement horizon with its own evidence', async () => {
    setAuth('admin')
    const venue = await seedVenue({ name: 'Ogden Theatre', slug: 'ogden' })
    await seedRuns(venue.id, [
      {
        status: 'success',
        eventsFound: 41,
        eventsUsable: 41,
        furthestEventDate: '2026-12-01',
      },
      {
        status: 'success',
        eventsFound: 38,
        eventsUsable: 38,
        furthestEventDate: '2026-11-28',
      },
      {
        status: 'success',
        eventsFound: 39,
        eventsUsable: 39,
        furthestEventDate: '2026-11-30',
      },
      {
        status: 'success',
        eventsFound: 25,
        eventsUsable: 25,
        furthestEventDate: '2026-08-12',
      },
    ])

    const [fault] = (await fetchTriage()).faults
    expect(fault?.condition).toBe('ceiling')
    expect(fault?.d['kind']).toBe('horizon_shrank')
    expect(fault?.d['furthest']).toBe('2026-08-12')
    expect(fault?.d['best']).toBe('2026-12-01')
    expect(fault?.d['shrankDays']).toBeGreaterThan(30)
  })

  // ── coverage gap ──────────────────────────────────────────────────
  it('surfaces a URL coverage gap as the COVERED figure and clears on repair', async () => {
    setAuth('admin')
    const venue = await seedVenue({ name: "Cervantes'", slug: 'cervantes' })
    await seedRuns(venue.id, baselineRuns(4, 14))

    const tomorrow = new Date(Date.now() + DAY_MS).toLocaleDateString('en-CA', {
      timeZone: 'America/Denver',
    })
    const uncovered: string[] = []
    for (let index = 0; index < 14; index += 1) {
      const withLink = index < 9
      const event = await seedEvent(venue.id, {
        artist: `Artist ${index}`,
        title: `Show ${index}`,
        date: tomorrow,
        status: 'upcoming',
        ticketUrl: withLink ? 'https://tickets.example.com/x' : null,
        eventUrl: null,
      })
      if (!withLink) uncovered.push(event.id)
    }

    const [fault] = (await fetchTriage()).faults
    expect(fault?.condition).toBe('coverage')
    expect(fault?.band).toBe('loss')
    // 14 upcoming, 5 uncovered → the evidence line states the 9 that work.
    expect(fault?.d['matched']).toBe(9)
    expect(fault?.d['expected']).toBe(14)
    expect(fault?.d['uncovered']).toBe(5)

    const { events: eventsTable } = await import('@concert-crawl/db')
    const { inArray } = await import('drizzle-orm')
    await testDb
      .update(eventsTable)
      .set({ ticketUrl: 'https://tickets.example.com/fixed' })
      .where(inArray(eventsTable.id, uncovered))

    expect((await fetchTriage()).faults).toEqual([])
  })

  // ── ordering + queues ─────────────────────────────────────────────
  it('orders faults by severity band then persistence, server-side', async () => {
    setAuth('admin')
    const dark = await seedVenue({ name: 'Dark Venue', slug: 'dark' })
    await seedRuns(dark.id, [
      ...baselineRuns(7, 12),
      { status: 'success', eventsFound: 1, eventsUsable: 1 },
    ])

    const blocked = await seedVenue({
      name: 'Blocked Venue',
      slug: 'blocked',
      blockedAt: new Date(Date.now() - 2 * DAY_MS),
    })
    await seedRuns(blocked.id, [
      {
        status: 'failed',
        httpStatusCode: 429,
        eventsFound: 0,
        eventsUsable: 0,
      },
    ])

    const pinned = await seedVenue({ name: 'Pinned Venue', slug: 'pinned' })
    await seedRuns(pinned.id, [...flatRuns(3, 34), ...flatRuns(5, 20)])

    const data = await fetchTriage()
    expect(data.faults.map((row) => row.band)).toEqual([
      'hard',
      'loss',
      'suspect',
    ])
  })

  it('reports the review queues with a breakdown', async () => {
    setAuth('admin')
    const venue = await seedVenue({ name: 'Queue Venue', slug: 'queue' })
    await seedRuns(venue.id, baselineRuns(4, 12))

    const tomorrow = new Date(Date.now() + DAY_MS).toLocaleDateString('en-CA', {
      timeZone: 'America/Denver',
    })
    for (let index = 0; index < 3; index += 1) {
      await seedEvent(venue.id, {
        artist: `Flagged ${index}`,
        title: `Flagged ${index}`,
        date: tomorrow,
        verified: false,
      })
    }

    const data = await fetchTriage()
    const flags = data.queues.find((queue) => queue.kind === 'eventFlags')
    expect(flags?.count).toBe(3)
    expect(flags?.breakdown).toContain('Queue Venue 3')
  })
})
