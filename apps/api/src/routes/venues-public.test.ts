import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockDb } = vi.hoisted(() => {
  const mockDb = {
    select: vi.fn(),
    from: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    groupBy: vi.fn(),
    limit: vi.fn(),
  }
  return { mockDb }
})

vi.mock('@hono/clerk-auth', () => ({
  clerkMiddleware: () => async (_c: unknown, next: () => Promise<void>) =>
    next(),
  getAuth: () => null,
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((_a, _b) => ({ type: 'eq' })),
  and: vi.fn((...args: unknown[]) => ({ type: 'and', args })),
  asc: vi.fn((col: unknown) => ({ type: 'asc', col })),
  desc: vi.fn((col: unknown) => ({ type: 'desc', col })),
  gte: vi.fn((_a, _b) => ({ type: 'gte' })),
  count: vi.fn((col: unknown) => ({ type: 'count', col })),
  inArray: vi.fn((_col: unknown, _values: unknown) => ({ type: 'inArray' })),
  isNotNull: vi.fn((col: unknown) => ({ type: 'isNotNull', col })),
  isNull: vi.fn((col: unknown) => ({ type: 'isNull', col })),
  sql: Object.assign(
    vi.fn((..._args: unknown[]) => ({ type: 'sql' })),
    { raw: vi.fn((str: string) => ({ type: 'sql.raw', str })) },
  ),
}))

vi.mock('@concert-crawl/db', () => ({
  db: mockDb,
  events: {
    id: 'id',
    venueId: 'venueId',
    status: 'status',
    date: 'date',
  },
  venues: {
    id: 'id',
    name: 'name',
    slug: 'slug',
    city: 'city',
    timezone: 'timezone',
    websiteUrl: 'websiteUrl',
    active: 'active',
    verified: 'verified',
    insiderTip: 'insiderTip',
    guidePublishedAt: 'guidePublishedAt',
  },
  // #764 — the guide chip table is only queried for a published venue, but the
  // module-level mock must still export it or the import throws.
  venueGuideChips: {
    venueId: 'venueId',
    chipType: 'chipType',
    body: 'body',
    isPlaceholder: 'isPlaceholder',
  },
  priceSubmissions: {
    id: 'id',
    eventId: 'eventId',
    tier: 'tier',
    priceMin: 'priceMin',
    priceMax: 'priceMax',
    vendor: 'vendor',
    sourceCategory: 'sourceCategory',
    howFound: 'howFound',
    userId: 'userId',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    lastSeenAt: 'lastSeenAt',
    corroborationCount: 'corroborationCount',
    status: 'status',
  },
  auditLog: {},
  inviteCodes: {},
}))

import { createApp } from '../app.js'

const mockVenue = {
  id: 'venue-1',
  name: 'Test Venue',
  slug: 'test-venue',
  city: 'Denver',
  timezone: 'America/Denver',
  websiteUrl: 'https://venue.example.com',
  active: true,
  verified: true,
  insiderTip: null,
  guidePublishedAt: null,
}

const mockEvent = {
  id: 'event-1',
  venueId: 'venue-1',
  title: 'Test Show',
  artist: 'Test Artist',
  supportingArtists: null,
  tourName: null,
  date: '2099-12-31',
  doorsTime: null,
  showTime: '20:00:00',
  ticketUrl: null,
  ticketPriceMin: null,
  ticketPriceMax: null,
  description: null,
  imageUrl: null,
  genre: null,
  status: 'upcoming',
  confidenceScore: null,
  verified: true,
  sourceUrl: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

function resetChain() {
  mockDb.select.mockReturnValue(mockDb)
  mockDb.from.mockReturnValue(mockDb)
  mockDb.where.mockReturnValue(mockDb)
  mockDb.orderBy.mockReturnValue(mockDb)
  mockDb.groupBy.mockResolvedValue([])
  mockDb.limit.mockResolvedValue([])
}

describe('GET /v1/venues', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetChain()
  })

  it('returns 200 with an array of venues', async () => {
    // GET /: select().from().where().orderBy() → terminal
    mockDb.orderBy.mockResolvedValueOnce([mockVenue])

    const res = await createApp().request('/v1/venues')
    expect(res.status).toBe(200)
    const body = (await res.json()) as { success: boolean; data: unknown[] }
    expect(body.success).toBe(true)
    expect(Array.isArray(body.data)).toBe(true)
  })

  it('orders venues by name (orderBy is called)', async () => {
    mockDb.orderBy.mockResolvedValueOnce([mockVenue])
    await createApp().request('/v1/venues')
    expect(mockDb.orderBy).toHaveBeenCalled()
  })

  it('includes timezone in each venue object', async () => {
    mockDb.orderBy.mockResolvedValueOnce([mockVenue])

    const res = await createApp().request('/v1/venues')
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      success: boolean
      data: { timezone: string }[]
    }
    expect(body.data[0]?.timezone).toBe('America/Denver')
  })
})

describe('GET /v1/venues/:slug', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetChain()
  })

  it('returns 404 for an unknown slug', async () => {
    // GET /:slug venue lookup: select().from().where() → terminal, empty
    mockDb.where.mockResolvedValueOnce([])

    const res = await createApp().request('/v1/venues/does-not-exist')
    expect(res.status).toBe(404)
    const body = (await res.json()) as { success: boolean; error: string }
    expect(body.success).toBe(false)
    expect(body.error).toBe('Venue not found')
  })

  it('returns 200 with venue and upcomingEvents for a known slug', async () => {
    // venue lookup: select().from().where() → [mockVenue]
    mockDb.where.mockResolvedValueOnce([mockVenue])
    // count query: select().from().where() → [{total: 1}]
    mockDb.where.mockResolvedValueOnce([{ total: 1 }])
    // events: select().from().where().orderBy().limit() → [mockEvent]
    mockDb.where.mockReturnValueOnce(mockDb)
    mockDb.limit.mockResolvedValueOnce([mockEvent])
    // priceByTier batch: select().from().where() → no corroborated rows
    mockDb.where.mockResolvedValueOnce([])

    const res = await createApp().request('/v1/venues/test-venue')
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      success: boolean
      data: { venue: unknown; upcomingEvents: unknown[] }
    }
    expect(body.success).toBe(true)
    expect(body.data.venue).toBeTruthy()
    expect(Array.isArray(body.data.upcomingEvents)).toBe(true)
  })

  it('populates priceByTier so the venue card mirrors the browse "from" price (cheapest tier wins over a later-confirmed pricier tier)', async () => {
    mockDb.where.mockResolvedValueOnce([mockVenue])
    mockDb.where.mockResolvedValueOnce([{ total: 1 }])
    // events: select().from().where().orderBy().limit()
    mockDb.where.mockReturnValueOnce(mockDb)
    mockDb.orderBy.mockReturnValueOnce(mockDb)
    // ticketPriceMin is $439 here — the flat scalar was clobbered by the
    // most-recently-confirmed VIP tier. The batch must override it via the
    // cheapest-tier headline.
    mockDb.limit.mockResolvedValueOnce([
      { ...mockEvent, ticketPriceMin: '439', priceSource: 'community' },
    ])
    // vendor lookup (community events): select().from().where().orderBy() → []
    mockDb.where.mockReturnValueOnce(mockDb)
    mockDb.orderBy.mockResolvedValueOnce([])
    // priceByTier batch: two corroborated tiers for this event. GA $94 is the
    // cheapest; VIP $439 was confirmed later. compareBlocks sorts cheapest
    // headline first, so priceByTier[0] must be the $94 GA block.
    const now = new Date('2026-07-10T00:00:00Z')
    mockDb.where.mockResolvedValueOnce([
      {
        id: 'sub-ga',
        eventId: 'event-1',
        tier: 'GA',
        priceMin: '94',
        priceMax: '94',
        vendor: 'AXS',
        sourceCategory: 'standard',
        howFound: 'saw_listing',
        userId: 'user-ga',
        createdAt: now,
        updatedAt: now,
        lastSeenAt: null,
        corroborationCount: 3,
      },
      {
        id: 'sub-vip',
        eventId: 'event-1',
        tier: 'VIP',
        priceMin: '439',
        priceMax: '627',
        vendor: 'AXS',
        sourceCategory: 'standard',
        howFound: 'saw_listing',
        userId: 'user-vip',
        createdAt: now,
        updatedAt: now,
        lastSeenAt: null,
        corroborationCount: 3,
      },
    ])

    const res = await createApp().request('/v1/venues/test-venue')
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      data: {
        upcomingEvents: Array<{
          priceByTier: Array<{
            tier: string
            headline: { priceMin: string } | null
          }> | null
        }>
      }
    }
    const [event] = body.data.upcomingEvents
    expect(event?.priceByTier).not.toBeNull()
    expect(event?.priceByTier).toHaveLength(2)
    // Cheapest tier leads — the venue card renders "from $94", not $439.
    expect(event?.priceByTier?.[0]?.tier).toBe('GA')
    expect(event?.priceByTier?.[0]?.headline?.priceMin).toBe('94')
  })

  it('filters upcoming events using a YYYY-MM-DD date string', async () => {
    mockDb.where.mockResolvedValueOnce([
      { ...mockVenue, timezone: 'America/Chicago' },
    ])
    // count query
    mockDb.where.mockResolvedValueOnce([{ total: 0 }])
    mockDb.where.mockReturnValueOnce(mockDb)
    mockDb.limit.mockResolvedValueOnce([])

    await createApp().request('/v1/venues/test-venue')

    const { gte } = await import('drizzle-orm')
    const calls = vi.mocked(gte).mock.calls
    const dateArg = calls[calls.length - 1]?.[1]
    expect(typeof dateArg).toBe('string')
    expect(/^\d{4}-\d{2}-\d{2}$/.test(dateArg as string)).toBe(true)
  })
})
