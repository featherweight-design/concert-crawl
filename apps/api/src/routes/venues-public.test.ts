import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockDb } = vi.hoisted(() => {
  const mockDb = {
    select: vi.fn(),
    from: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
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
  gte: vi.fn((_a, _b) => ({ type: 'gte' })),
}))

vi.mock('@concert-crawl/db', () => ({
  db: mockDb,
  events: {
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
}

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
    // events: select().from().where().orderBy().limit() → [mockEvent]
    mockDb.where.mockReturnValueOnce(mockDb)
    mockDb.limit.mockResolvedValueOnce([mockEvent])

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

  it('filters upcoming events using a YYYY-MM-DD date string', async () => {
    mockDb.where.mockResolvedValueOnce([
      { ...mockVenue, timezone: 'America/Chicago' },
    ])
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
