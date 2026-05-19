import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockAnthropicCreate = vi.fn()

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(
    class {
      messages = { create: mockAnthropicCreate }
    },
  ),
}))

const mockGetAuth = vi.fn()
vi.mock('@hono/clerk-auth', () => ({
  clerkMiddleware: () => async (_ctx: unknown, next: () => Promise<void>) =>
    next(),
  getAuth: () => mockGetAuth(),
}))

const mockVenueRow = {
  id: 'venue-1',
  name: 'Ogden Theatre',
  slug: 'ogden-theatre',
  websiteUrl: 'https://ogdentheatre.com',
  city: 'Denver',
  address: '935 E Colfax Ave, Denver, CO 80218',
  venueType: null,
  active: true,
  verified: false,
  consecutiveFailures: 0,
  crawlDelayMs: 3000,
  lastCrawledAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

function makeQueryBuilder(resolveWith: unknown[] = []) {
  const builder: Record<string, unknown> = {}
  const methods = ['select', 'from', 'where', 'orderBy', 'groupBy', 'limit']
  for (const method of methods) {
    builder[method] = vi.fn().mockReturnValue(builder)
  }
  builder.then = (resolve: (val: unknown[]) => void) => {
    resolve(resolveWith)
    return Promise.resolve(resolveWith)
  }
  return builder
}

const mockDb = {
  select: vi.fn().mockReturnValue(makeQueryBuilder([])),
}

vi.mock('@concert-crawl/db', () => ({
  db: mockDb,
  venues: {
    id: 'id',
    name: 'name',
    address: 'address',
    venueType: 'venue_type',
  },
  events: {},
  crawlRuns: {},
  auditLog: {},
  inviteCodes: {},
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn().mockReturnValue(true),
  and: vi.fn().mockReturnValue(true),
  gte: vi.fn().mockReturnValue(true),
  ne: vi.fn().mockReturnValue(true),
  count: vi.fn().mockReturnValue(true),
  avg: vi.fn().mockReturnValue(true),
  desc: vi.fn().mockReturnValue(true),
  isNotNull: vi.fn().mockReturnValue(true),
}))

// Dynamic import after mock registration — required for ESM packages
const { createApp } = await import('../../app.js')

function adminAuth() {
  mockGetAuth.mockReturnValue({
    userId: 'admin_123',
    sessionClaims: { metadata: { role: 'admin' } },
  })
}

describe('POST /v1/admin/venues/:id/generate-about', () => {
  beforeEach(() => {
    mockGetAuth.mockReset()
    mockAnthropicCreate.mockReset()
    mockDb.select.mockReturnValue(makeQueryBuilder([]))
  })

  it('returns 401 for unauthenticated requests', async () => {
    mockGetAuth.mockReturnValue(null)
    const res = await createApp().request(
      '/v1/admin/venues/venue-1/generate-about',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      },
    )
    expect(res.status).toBe(401)
  })

  it('returns 404 when venue not found', async () => {
    adminAuth()
    mockDb.select.mockReturnValue(makeQueryBuilder([]))
    const res = await createApp().request(
      '/v1/admin/venues/venue-1/generate-about',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      },
    )
    expect(res.status).toBe(404)
  })

  it('returns generated venue details on success', async () => {
    adminAuth()
    mockDb.select.mockReturnValue(makeQueryBuilder([mockVenueRow]))
    mockAnthropicCreate.mockResolvedValue({
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            capacity: 1600,
            venueType: 'Theater',
            about:
              'A historic venue on Colfax Ave with a long live music tradition.',
          }),
        },
      ],
    })
    const res = await createApp().request(
      '/v1/admin/venues/venue-1/generate-about',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      },
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      success: boolean
      data: { capacity: number; venueType: string; about: string }
    }
    expect(body.success).toBe(true)
    expect(body.data.capacity).toBe(1600)
    expect(body.data.venueType).toBe('Theater')
    expect(body.data.about).toMatch(/Colfax/)
  })

  it('strips markdown fences and parses successfully', async () => {
    adminAuth()
    mockDb.select.mockReturnValue(makeQueryBuilder([mockVenueRow]))
    mockAnthropicCreate.mockResolvedValue({
      content: [
        {
          type: 'text',
          text: '```json\n{"capacity":500,"venueType":"Bar","about":"A cozy neighborhood bar with live music."}\n```',
        },
      ],
    })
    const res = await createApp().request(
      '/v1/admin/venues/venue-1/generate-about',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      },
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      success: boolean
      data: { capacity: number; venueType: string }
    }
    expect(body.success).toBe(true)
    expect(body.data.venueType).toBe('Bar')
    expect(body.data.capacity).toBe(500)
  })

  it('returns 503 when model returns completely invalid JSON', async () => {
    adminAuth()
    mockDb.select.mockReturnValue(makeQueryBuilder([mockVenueRow]))
    mockAnthropicCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'Sorry, I cannot help with that.' }],
    })
    const res = await createApp().request(
      '/v1/admin/venues/venue-1/generate-about',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      },
    )
    expect(res.status).toBe(503)
    const body = (await res.json()) as { success: boolean; error: string }
    expect(body.success).toBe(false)
    expect(body.error).toMatch(/invalid JSON/i)
  })

  it('returns 503 when Anthropic call throws', async () => {
    adminAuth()
    mockDb.select.mockReturnValue(makeQueryBuilder([mockVenueRow]))
    mockAnthropicCreate.mockRejectedValue(new Error('API rate limit exceeded'))
    const res = await createApp().request(
      '/v1/admin/venues/venue-1/generate-about',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      },
    )
    expect(res.status).toBe(503)
    const body = (await res.json()) as { success: boolean }
    expect(body.success).toBe(false)
  })
})
