import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockDb } = vi.hoisted(() => {
  const mockDb = {
    select: vi.fn(),
    from: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    innerJoin: vi.fn(),
    limit: vi.fn(),
    offset: vi.fn(),
    groupBy: vi.fn(),
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
  count: vi.fn(() => ({ type: 'count' })),
  gte: vi.fn((_a, _b) => ({ type: 'gte' })),
  lte: vi.fn((_a, _b) => ({ type: 'lte' })),
  lt: vi.fn((_a, _b) => ({ type: 'lt' })),
  ilike: vi.fn((_a, _b) => ({ type: 'ilike' })),
  or: vi.fn((...args: unknown[]) => ({ type: 'or', args })),
  inArray: vi.fn((_a, _b) => ({ type: 'inArray' })),
  isNull: vi.fn((_a) => ({ type: 'isNull' })),
  isNotNull: vi.fn((_a) => ({ type: 'isNotNull' })),
  sql: Object.assign(
    vi.fn(() => ({ type: 'sql' })),
    { placeholder: vi.fn() },
  ),
}))

vi.mock('@concert-crawl/db', () => ({
  db: mockDb,
  events: {
    id: 'id',
    status: 'status',
    date: 'date',
    venueId: 'venueId',
    title: 'title',
    artist: 'artist',
    priceSource: 'priceSource',
    ticketPriceMin: 'ticketPriceMin',
  },
  venues: {
    id: 'id',
    slug: 'slug',
    name: 'name',
    city: 'city',
    timezone: 'timezone',
    websiteUrl: 'websiteUrl',
  },
  userEvents: {
    id: 'id',
    userId: 'userId',
    eventId: 'eventId',
    status: 'status',
  },
  userProfiles: {
    userId: 'userId',
    handle: 'handle',
  },
  priceSubmissions: {
    id: 'id',
    eventId: 'eventId',
    vendor: 'vendor',
    userId: 'userId',
    priceMin: 'priceMin',
    priceMax: 'priceMax',
    status: 'status',
    tier: 'tier',
    howFound: 'howFound',
    note: 'note',
    disputedSubmissionId: 'disputedSubmissionId',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
  },
  submissionConfirms: {
    submissionId: 'submissionId',
  },
  eventReports: {
    id: 'id',
    eventId: 'eventId',
    reporterId: 'reporterId',
    status: 'status',
    resolution: 'resolution',
    createdAt: 'createdAt',
  },
  eventReportConfirms: {
    reportId: 'reportId',
  },
  auditLog: {},
  inviteCodes: {},
  // #1115 PR-G — the detail route resolves artist-page slugs through this table.
  artists: {
    canonicalName: 'canonicalName',
    slug: 'slug',
  },
}))

import { createApp } from '../app.js'

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
  priceSource: 'structured_data',
  description: null,
  imageUrl: null,
  genre: ['rock'],
  status: 'upcoming',
  confidenceScore: '0.9',
  verified: true,
  sourceUrl: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  venue: {
    id: 'venue-1',
    name: 'Test Venue',
    slug: 'test-venue',
    city: 'Denver',
    timezone: 'America/Denver',
    websiteUrl: 'https://venue.example.com',
  },
}

// Resets all chain methods to return mockDb so tests start clean
function resetChain() {
  mockDb.select.mockReturnValue(mockDb)
  mockDb.from.mockReturnValue(mockDb)
  mockDb.innerJoin.mockReturnValue(mockDb)
  mockDb.orderBy.mockReturnValue(mockDb)
  mockDb.limit.mockReturnValue(mockDb)
  mockDb.where.mockReturnValue(mockDb)
  mockDb.groupBy.mockReturnValue(mockDb)
  mockDb.offset.mockResolvedValue([])
}

describe('GET /v1/events', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetChain()
  })

  it('returns 200 with data array and pagination metadata', async () => {
    // count query: select().from().where() → terminal
    mockDb.where.mockResolvedValueOnce([{ total: 1 }])
    // rows query: select().from().innerJoin().where().orderBy().limit().offset() → terminal
    mockDb.where.mockReturnValueOnce(mockDb)
    mockDb.offset.mockResolvedValueOnce([mockEvent])
    // priceByTier corroborated-rows query — closes #787. Terminal at .where().
    // mockEvent.priceSource is 'structured_data' so the community-vendor query
    // is skipped, but the priceByTier query runs for every visible event ID.
    // Empty array → priceByTier ends up null for the row.
    mockDb.where.mockResolvedValueOnce([])

    const res = await createApp().request('/v1/events')
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      success: boolean
      data: { data: unknown[]; total: number; limit: number; offset: number }
    }
    expect(body.success).toBe(true)
    expect(Array.isArray(body.data.data)).toBe(true)
    expect(typeof body.data.total).toBe('number')
    expect(typeof body.data.limit).toBe('number')
    expect(typeof body.data.offset).toBe('number')
  })

  it('returns 400 for invalid limit value', async () => {
    const res = await createApp().request('/v1/events?limit=abc')
    expect(res.status).toBe(400)
  })

  it('returns 400 for limit exceeding maximum', async () => {
    const res = await createApp().request('/v1/events?limit=999')
    expect(res.status).toBe(400)
  })

  it('returns 400 for negative offset', async () => {
    const res = await createApp().request('/v1/events?offset=-1')
    expect(res.status).toBe(400)
  })

  it('returns 400 for invalid from date format', async () => {
    const res = await createApp().request('/v1/events?from=not-a-date')
    expect(res.status).toBe(400)
  })

  it('accepts valid from/to date filter combination', async () => {
    mockDb.where.mockResolvedValueOnce([{ total: 0 }])
    mockDb.where.mockReturnValueOnce(mockDb)
    mockDb.offset.mockResolvedValueOnce([])

    const res = await createApp().request(
      '/v1/events?from=2099-01-01&to=2099-12-31',
    )
    expect(res.status).toBe(200)
  })

  it('returns empty data for an unknown venueSlug', async () => {
    // venue lookup: select({id}).from(venues).where().limit(1) → terminal, empty
    mockDb.where.mockReturnValueOnce(mockDb)
    mockDb.limit.mockResolvedValueOnce([])

    const res = await createApp().request('/v1/events?venueSlug=unknown-slug')
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      success: boolean
      data: { data: unknown[]; total: number }
    }
    expect(body.success).toBe(true)
    expect(body.data.data).toEqual([])
    expect(body.data.total).toBe(0)
  })
})

describe('GET /v1/events/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetChain()
  })

  it('returns 200 with event data for a known id', async () => {
    // After PR 3's consolidation the handler runs queries in this order
    // (each .where() call is numbered):
    //   1. event detail            — select().from().innerJoin().where()      → terminal
    //   2. watch count             — select().from().where()                  → terminal
    //   3. sold-out report          — select().from().where().orderBy().limit() → chainable where
    //   4. priceByTier corroborated — select().from().where()                  → terminal
    //   5. priceByTier pending      — select().from().where()                  → terminal
    //   6. reports-by-tier          — select().from().where().groupBy()        → chainable where
    // Queue mocks in call order so each .where() gets the right behavior.
    mockDb.where.mockResolvedValueOnce([mockEvent]) // 1
    mockDb.where.mockResolvedValueOnce([{ total: 0 }]) // 2
    mockDb.where.mockReturnValueOnce(mockDb) // 3 (chain into orderBy)
    mockDb.where.mockResolvedValueOnce([]) // 4
    mockDb.where.mockResolvedValueOnce([]) // 5
    mockDb.where.mockReturnValueOnce(mockDb) // 6 (chain into groupBy)
    // 7. artist-page slugs (#1115 PR-G) — select().from().where() → terminal.
    // Empty: this fixture's artist has no `artists` row, so both slug fields
    // come back null and the UI renders plain text.
    mockDb.where.mockResolvedValueOnce([]) // 7
    // sold-out report orderBy → limit terminal
    mockDb.orderBy.mockReturnValueOnce(mockDb)
    mockDb.limit.mockResolvedValueOnce([])
    // reports-by-tier groupBy terminal
    mockDb.groupBy.mockResolvedValueOnce([])

    const res = await createApp().request(
      '/v1/events/00000000-0000-0000-0000-000000000001',
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as { success: boolean; data: unknown }
    expect(body.success).toBe(true)
    expect(body.data).toBeTruthy()
  })

  it('returns 404 for a non-UUID event id', async () => {
    const res = await createApp().request('/v1/events/not-a-uuid')
    expect(res.status).toBe(404)
    const body = (await res.json()) as { success: boolean; error: string }
    expect(body.success).toBe(false)
    expect(body.error).toBe('Event not found')
  })

  it('returns 404 for a valid UUID that matches no event', async () => {
    mockDb.where.mockResolvedValueOnce([])

    const res = await createApp().request(
      '/v1/events/00000000-0000-0000-0000-000000000000',
    )
    expect(res.status).toBe(404)
    const body = (await res.json()) as { success: boolean; error: string }
    expect(body.success).toBe(false)
    expect(body.error).toBe('Event not found')
  })
})
