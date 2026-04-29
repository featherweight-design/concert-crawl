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
  count: vi.fn(() => ({ type: 'count' })),
  gte: vi.fn((_a, _b) => ({ type: 'gte' })),
  lte: vi.fn((_a, _b) => ({ type: 'lte' })),
  ilike: vi.fn((_a, _b) => ({ type: 'ilike' })),
  or: vi.fn((...args: unknown[]) => ({ type: 'or', args })),
}))

vi.mock('@concert-crawl/db', () => ({
  db: mockDb,
  events: {
    status: 'status',
    date: 'date',
    venueId: 'venueId',
    title: 'title',
    artist: 'artist',
  },
  venues: {
    id: 'id',
    slug: 'slug',
    name: 'name',
    city: 'city',
    timezone: 'timezone',
    websiteUrl: 'websiteUrl',
  },
  auditLog: {},
  inviteCodes: {},
}))

import { createApp } from '../app.js'

const mockEvent = {
  id: 'event-1',
  venueId: 'venue-1',
  title: 'Test Show',
  artist: 'Test Artist',
  date: '2099-12-31',
  doorsTime: null,
  showTime: '20:00:00',
  ticketUrl: null,
  ticketPriceMin: null,
  ticketPriceMax: null,
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
    // single query: select().from().innerJoin().where() → terminal
    mockDb.where.mockResolvedValueOnce([mockEvent])

    const res = await createApp().request('/v1/events/event-1')
    expect(res.status).toBe(200)
    const body = (await res.json()) as { success: boolean; data: unknown }
    expect(body.success).toBe(true)
    expect(body.data).toBeTruthy()
  })

  it('returns 404 for an unknown event id', async () => {
    mockDb.where.mockResolvedValueOnce([])

    const res = await createApp().request('/v1/events/does-not-exist')
    expect(res.status).toBe(404)
    const body = (await res.json()) as { success: boolean; error: string }
    expect(body.success).toBe(false)
    expect(body.error).toBe('Event not found')
  })
})
