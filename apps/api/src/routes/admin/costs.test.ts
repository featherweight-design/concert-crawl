import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createApp } from '../../app.js'
import { mountainDateString, listWindowDates } from './costs.js'

const mockGetAuth = vi.fn()
vi.mock('@hono/clerk-auth', () => ({
  clerkMiddleware: () => async (_ctx: unknown, next: () => Promise<void>) =>
    next(),
  getAuth: () => mockGetAuth(),
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  and: vi.fn(),
  desc: vi.fn(),
  asc: vi.fn(),
  gte: vi.fn(),
  inArray: vi.fn(),
  isNull: vi.fn(),
  isNotNull: vi.fn(),
  sql: Object.assign(
    vi.fn((parts: unknown, ...vals: unknown[]) => ({ parts, vals })),
    { raw: vi.fn() },
  ),
}))

vi.mock('@concert-crawl/db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockReturnThis(),
    having: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([]),
  },
  venues: {},
  crawlRuns: {},
  crawlTriggers: {},
  notifications: {},
  auditLog: {},
  inviteCodes: {},
}))

function adminAuth() {
  mockGetAuth.mockReturnValue({
    userId: 'admin_123',
    sessionClaims: { metadata: { role: 'admin' } },
  })
}

// The /daily query chain terminates in `.groupBy()`; /top-venues terminates
// in `.orderBy()`. Both default to `mockReturnThis()` (they're mid-chain in
// the other endpoint), so each test queues its terminal rows explicitly.
// Drizzle builders are PromiseLike, so mockResolvedValueOnce matches the
// awaited row-array type (same pattern as crawl.test.ts).
async function queueDailyRows(rows: unknown[]) {
  const { db } = await import('@concert-crawl/db')
  vi.mocked(db.select().from().where().groupBy).mockResolvedValueOnce(rows)
}

async function queueTopVenueRows(rows: unknown[]) {
  const { db } = await import('@concert-crawl/db')
  vi.mocked(
    db.select().from().leftJoin().where().groupBy().having().orderBy,
  ).mockResolvedValueOnce(rows)
}

const VENUE_A = '00000000-0000-0000-0000-00000000000a'
const VENUE_B = '00000000-0000-0000-0000-00000000000b'
const VENUE_C = '00000000-0000-0000-0000-00000000000c'
const VENUE_D = '00000000-0000-0000-0000-00000000000d'
const VENUE_E = '00000000-0000-0000-0000-00000000000e'

describe('MT day helpers', () => {
  // The plan's canonical bucketing case: a run at 2026-07-11T03:00Z is
  // 2026-07-10 21:00 in America/Denver (UTC-6 during DST), so it belongs to
  // the 2026-07-10 MT day bucket. mountainDateString is the JS mirror of the
  // SQL `(created_at AT TIME ZONE 'America/Denver')::date` expression that
  // defines the zero-fill window, so it must agree with it.
  it('buckets 2026-07-11T03:00Z onto the 2026-07-10 MT calendar day', () => {
    expect(mountainDateString(new Date('2026-07-11T03:00:00Z'))).toBe(
      '2026-07-10',
    )
  })

  it('keeps a mid-day UTC timestamp on the same MT calendar day', () => {
    expect(mountainDateString(new Date('2026-07-10T18:00:00Z'))).toBe(
      '2026-07-10',
    )
  })

  it('builds a contiguous oldest-first window ending at the given date', () => {
    expect(listWindowDates(3, '2026-07-10')).toEqual([
      '2026-07-08',
      '2026-07-09',
      '2026-07-10',
    ])
  })

  it('crosses month boundaries correctly', () => {
    expect(listWindowDates(2, '2026-07-01')).toEqual([
      '2026-06-30',
      '2026-07-01',
    ])
  })
})

describe('GET /v1/admin/costs/daily', () => {
  beforeEach(() => {
    mockGetAuth.mockReset()
    // Pin "now" so the MT window is deterministic: 2026-07-11T03:00Z is
    // 2026-07-10 in America/Denver — the same boundary case as the SQL
    // bucketing rule, exercised here through the route's window computation.
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-11T03:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns 401 for unauthenticated requests', async () => {
    mockGetAuth.mockReturnValue(null)
    const res = await createApp().request('/v1/admin/costs/daily')
    expect(res.status).toBe(401)
  })

  it('returns 403 for non-admin users', async () => {
    mockGetAuth.mockReturnValue({
      userId: 'user_123',
      sessionClaims: { metadata: { role: 'user' } },
    })
    const res = await createApp().request('/v1/admin/costs/daily')
    expect(res.status).toBe(403)
  })

  it('rejects days below the minimum', async () => {
    adminAuth()
    const res = await createApp().request('/v1/admin/costs/daily?days=0')
    expect(res.status).toBe(400)
  })

  it('rejects days above the maximum', async () => {
    adminAuth()
    const res = await createApp().request('/v1/admin/costs/daily?days=91')
    expect(res.status).toBe(400)
  })

  it('rejects non-numeric days', async () => {
    adminAuth()
    const res = await createApp().request('/v1/admin/costs/daily?days=abc')
    expect(res.status).toBe(400)
  })

  it('defaults to a 30-day window when days is omitted', async () => {
    adminAuth()
    await queueDailyRows([])
    const res = await createApp().request('/v1/admin/costs/daily')
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      success: boolean
      data: { days: { date: string; costUsd: number }[]; totalUsd: number }
    }
    expect(body.success).toBe(true)
    expect(body.data.days).toHaveLength(30)
    expect(body.data.totalUsd).toBe(0)
  })

  it('zero-fills missing days across the MT window and sums the total', async () => {
    adminAuth()
    await queueDailyRows([{ date: '2026-07-09', costUsd: 2.5 }])
    const res = await createApp().request('/v1/admin/costs/daily?days=3')
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      data: { days: { date: string; costUsd: number }[]; totalUsd: number }
    }
    // "Today" (2026-07-11T03:00Z) is 2026-07-10 MT — the window ends there,
    // not on the UTC date 2026-07-11.
    expect(body.data.days).toEqual([
      { date: '2026-07-08', costUsd: 0 },
      { date: '2026-07-09', costUsd: 2.5 },
      { date: '2026-07-10', costUsd: 0 },
    ])
    expect(body.data.totalUsd).toBe(2.5)
  })

  it('rounds day costs and the total to cents', async () => {
    adminAuth()
    await queueDailyRows([
      { date: '2026-07-09', costUsd: 1.006 },
      { date: '2026-07-10', costUsd: 2.0049 },
    ])
    const res = await createApp().request('/v1/admin/costs/daily?days=2')
    const body = (await res.json()) as {
      data: { days: { date: string; costUsd: number }[]; totalUsd: number }
    }
    expect(body.data.days).toEqual([
      { date: '2026-07-09', costUsd: 1.01 },
      { date: '2026-07-10', costUsd: 2 },
    ])
    expect(body.data.totalUsd).toBe(3.01)
  })
})

describe('GET /v1/admin/costs/top-venues', () => {
  beforeEach(() => {
    mockGetAuth.mockReset()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-11T03:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns 401 for unauthenticated requests', async () => {
    mockGetAuth.mockReturnValue(null)
    const res = await createApp().request('/v1/admin/costs/top-venues')
    expect(res.status).toBe(401)
  })

  it('rejects days outside the 1–90 bounds', async () => {
    adminAuth()
    const tooLow = await createApp().request(
      '/v1/admin/costs/top-venues?days=0',
    )
    expect(tooLow.status).toBe(400)
    const tooHigh = await createApp().request(
      '/v1/admin/costs/top-venues?days=91',
    )
    expect(tooHigh.status).toBe(400)
  })

  it('returns an empty list when no venue has spend', async () => {
    adminAuth()
    await queueTopVenueRows([])
    const res = await createApp().request('/v1/admin/costs/top-venues')
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      success: boolean
      data: { venues: unknown[]; totalUsd: number }
    }
    expect(body.success).toBe(true)
    expect(body.data.venues).toEqual([])
    expect(body.data.totalUsd).toBe(0)
  })

  it('computes pct as the rounded share of the window total', async () => {
    adminAuth()
    await queueTopVenueRows([
      { venueId: VENUE_A, name: 'Bluebird Theater', costUsd: 6 },
      { venueId: VENUE_B, name: 'Gothic Theatre', costUsd: 3 },
      { venueId: VENUE_C, name: 'Larimer Lounge', costUsd: 1 },
    ])
    const res = await createApp().request('/v1/admin/costs/top-venues')
    const body = (await res.json()) as {
      data: {
        venues: {
          venueId: string | null
          name: string
          costUsd: number
          pct: number
        }[]
        totalUsd: number
      }
    }
    expect(body.data.totalUsd).toBe(10)
    expect(body.data.venues).toEqual([
      { venueId: VENUE_A, name: 'Bluebird Theater', costUsd: 6, pct: 60 },
      { venueId: VENUE_B, name: 'Gothic Theatre', costUsd: 3, pct: 30 },
      { venueId: VENUE_C, name: 'Larimer Lounge', costUsd: 1, pct: 10 },
    ])
  })

  it('aggregates venues past the top 3 into an (others) row with venueId null', async () => {
    adminAuth()
    await queueTopVenueRows([
      { venueId: VENUE_A, name: 'Bluebird Theater', costUsd: 12.4 },
      { venueId: VENUE_B, name: 'Gothic Theatre', costUsd: 8.92 },
      { venueId: VENUE_C, name: 'Larimer Lounge', costUsd: 4.18 },
      { venueId: VENUE_D, name: 'Hi-Dive', costUsd: 2 },
      { venueId: VENUE_E, name: 'Lost Lake', costUsd: 1.24 },
    ])
    const res = await createApp().request('/v1/admin/costs/top-venues')
    const body = (await res.json()) as {
      data: {
        venues: {
          venueId: string | null
          name: string
          costUsd: number
          pct: number
        }[]
        totalUsd: number
      }
    }
    expect(body.data.totalUsd).toBe(28.74)
    expect(body.data.venues).toHaveLength(4)
    expect(body.data.venues[0]).toEqual({
      venueId: VENUE_A,
      name: 'Bluebird Theater',
      costUsd: 12.4,
      pct: 43,
    })
    expect(body.data.venues[3]).toEqual({
      venueId: null,
      name: '(others)',
      costUsd: 3.24,
      pct: 11,
    })
  })

  it('does not append an (others) row when there are 3 or fewer venues', async () => {
    adminAuth()
    await queueTopVenueRows([
      { venueId: VENUE_A, name: 'Bluebird Theater', costUsd: 5 },
    ])
    const res = await createApp().request('/v1/admin/costs/top-venues')
    const body = (await res.json()) as {
      data: { venues: { venueId: string | null }[] }
    }
    expect(body.data.venues).toHaveLength(1)
    expect(body.data.venues[0]?.venueId).toBe(VENUE_A)
  })
})
