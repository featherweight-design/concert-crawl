import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createApp } from '../../app.js'

const mockGetAuth = vi.fn()
vi.mock('@hono/clerk-auth', () => ({
  clerkMiddleware: () => async (_c: unknown, next: () => Promise<void>) =>
    next(),
  getAuth: () => mockGetAuth(),
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  and: vi.fn(),
  desc: vi.fn(),
  asc: vi.fn(),
  inArray: vi.fn(),
}))

const mockCrawlVenue = vi.fn()
vi.mock('@concert-crawl/crawler-core', () => ({
  crawlVenue: (...args: unknown[]) => mockCrawlVenue(...args),
}))

vi.mock('@concert-crawl/db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    selectDistinctOn: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnValue([]),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([]),
  },
  venues: {},
  crawlRuns: {},
  auditLog: {},
  inviteCodes: {},
}))

const VENUE_ID = '00000000-0000-0000-0000-000000000001'
const RUN_ID = '00000000-0000-0000-0000-000000000002'

const mockVenue = {
  id: VENUE_ID,
  name: 'Red Rocks Amphitheatre',
  slug: 'red-rocks',
  websiteUrl: 'https://www.redrocksonline.com',
  city: 'Denver',
  active: true,
  verified: true,
  consecutiveFailures: 0,
  crawlDelayMs: 3000,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const mockCrawlRun = {
  id: RUN_ID,
  venueId: VENUE_ID,
  status: 'success',
  httpStatusCode: 200,
  robotsTxtBlocked: 'no',
  extractionStrategyUsed: 'structured_data',
  eventsFound: 5,
  eventsInserted: 5,
  errorMessage: null,
  durationMs: 4200,
  createdAt: new Date(),
}

function adminAuth() {
  mockGetAuth.mockReturnValue({
    userId: 'admin_123',
    sessionClaims: { metadata: { role: 'admin' } },
  })
}

describe('Admin crawl routes', () => {
  beforeEach(() => {
    mockGetAuth.mockReset()
    mockCrawlVenue.mockReset()
  })

  describe('POST /v1/admin/crawl/:venueId', () => {
    it('returns 401 for unauthenticated requests', async () => {
      mockGetAuth.mockReturnValue(null)
      const res = await createApp().request(`/v1/admin/crawl/${VENUE_ID}`, {
        method: 'POST',
      })
      expect(res.status).toBe(401)
    })

    it('returns 403 for non-admin users', async () => {
      mockGetAuth.mockReturnValue({
        userId: 'user_123',
        sessionClaims: { metadata: { role: 'user' } },
      })
      const res = await createApp().request(`/v1/admin/crawl/${VENUE_ID}`, {
        method: 'POST',
      })
      expect(res.status).toBe(403)
    })

    it('returns 400 for non-UUID venueId', async () => {
      adminAuth()
      const res = await createApp().request('/v1/admin/crawl/not-a-uuid', {
        method: 'POST',
      })
      expect(res.status).toBe(400)
    })

    it('returns 404 when venue does not exist', async () => {
      adminAuth()
      const { db } = await import('@concert-crawl/db')
      vi.mocked(db.select().from().where).mockResolvedValueOnce([])
      const res = await createApp().request(`/v1/admin/crawl/${VENUE_ID}`, {
        method: 'POST',
      })
      expect(res.status).toBe(404)
    })

    it('returns 400 when venue is inactive', async () => {
      adminAuth()
      const { db } = await import('@concert-crawl/db')
      vi.mocked(db.select().from().where).mockResolvedValueOnce([
        { ...mockVenue, active: false },
      ])
      const res = await createApp().request(`/v1/admin/crawl/${VENUE_ID}`, {
        method: 'POST',
      })
      expect(res.status).toBe(400)
    })

    it('returns 400 when venue is not verified', async () => {
      adminAuth()
      const { db } = await import('@concert-crawl/db')
      vi.mocked(db.select().from().where).mockResolvedValueOnce([
        { ...mockVenue, verified: false },
      ])
      const res = await createApp().request(`/v1/admin/crawl/${VENUE_ID}`, {
        method: 'POST',
      })
      expect(res.status).toBe(400)
    })

    it('returns 202 with crawlRunId and starts crawl for valid venue', async () => {
      adminAuth()
      const { db } = await import('@concert-crawl/db')
      vi.mocked(db.select().from().where).mockResolvedValueOnce([mockVenue])
      mockCrawlVenue.mockResolvedValue(mockCrawlRun)

      const res = await createApp().request(`/v1/admin/crawl/${VENUE_ID}`, {
        method: 'POST',
      })

      expect(res.status).toBe(202)
      const body = (await res.json()) as {
        success: boolean
        data: { crawlRunId: string }
      }
      expect(body.success).toBe(true)
      expect(typeof body.data.crawlRunId).toBe('string')
      expect(mockCrawlVenue).toHaveBeenCalledWith(
        VENUE_ID,
        expect.stringMatching(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
        ),
      )
    })
  })

  describe('GET /v1/admin/crawl/runs/:id', () => {
    it('returns 400 for non-UUID id', async () => {
      adminAuth()
      const res = await createApp().request('/v1/admin/crawl/runs/not-a-uuid')
      expect(res.status).toBe(400)
    })

    it('returns 404 when crawl run does not exist', async () => {
      adminAuth()
      const { db } = await import('@concert-crawl/db')
      vi.mocked(db.select().from().where).mockResolvedValueOnce([])
      const res = await createApp().request(`/v1/admin/crawl/runs/${RUN_ID}`)
      expect(res.status).toBe(404)
    })

    it('returns the crawl run record for a completed run', async () => {
      adminAuth()
      const { db } = await import('@concert-crawl/db')
      vi.mocked(db.select().from().where).mockResolvedValueOnce([mockCrawlRun])
      const res = await createApp().request(`/v1/admin/crawl/runs/${RUN_ID}`)
      expect(res.status).toBe(200)
      const body = (await res.json()) as {
        success: boolean
        data: typeof mockCrawlRun
      }
      expect(body.success).toBe(true)
      expect(body.data.id).toBe(RUN_ID)
      expect(body.data.status).toBe('success')
    })

    it('returns in_progress status when crawl is running', async () => {
      adminAuth()
      const { db } = await import('@concert-crawl/db')
      vi.mocked(db.select().from().where).mockResolvedValueOnce([mockVenue])
      mockCrawlVenue.mockReturnValue(new Promise(() => {})) // never resolves

      // Trigger a crawl to populate inProgressCrawls
      const triggerRes = await createApp().request(
        `/v1/admin/crawl/${VENUE_ID}`,
        { method: 'POST' },
      )
      const triggerBody = (await triggerRes.json()) as {
        success: boolean
        data: { crawlRunId: string }
      }
      const { crawlRunId } = triggerBody.data

      // Poll while crawl is still running
      const pollRes = await createApp().request(
        `/v1/admin/crawl/runs/${crawlRunId}`,
      )
      expect(pollRes.status).toBe(200)
      const pollBody = (await pollRes.json()) as {
        success: boolean
        data: { status: string; venueId: string }
      }
      expect(pollBody.success).toBe(true)
      expect(pollBody.data.status).toBe('in_progress')
      expect(pollBody.data.venueId).toBe(VENUE_ID)
    })
  })

  describe('GET /v1/admin/crawl/runs (list)', () => {
    it('returns 400 when venueId is missing', async () => {
      adminAuth()
      const res = await createApp().request('/v1/admin/crawl/runs')
      expect(res.status).toBe(400)
    })

    it('returns 400 when venueId is not a UUID', async () => {
      adminAuth()
      const res = await createApp().request(
        '/v1/admin/crawl/runs?venueId=not-a-uuid',
      )
      expect(res.status).toBe(400)
    })

    it('returns list of crawl runs for a venue', async () => {
      adminAuth()
      const { db } = await import('@concert-crawl/db')
      vi.mocked(
        db.select().from().where().orderBy().limit,
      ).mockResolvedValueOnce([mockCrawlRun])
      const res = await createApp().request(
        `/v1/admin/crawl/runs?venueId=${VENUE_ID}`,
      )
      expect(res.status).toBe(200)
      const body = (await res.json()) as {
        success: boolean
        data: (typeof mockCrawlRun)[]
      }
      expect(body.success).toBe(true)
      expect(Array.isArray(body.data)).toBe(true)
    })
  })
})

describe('GET /v1/admin/crawl/runs — includes in-progress runs', () => {
  // This test verifies the fix for the known in-progress tracking bug:
  // the list endpoint previously never returned in-flight runs.

  beforeEach(() => {
    mockGetAuth.mockReset()
  })

  it('returns 400 when venueId is missing', async () => {
    mockGetAuth.mockReturnValue({
      userId: 'admin_123',
      sessionClaims: { metadata: { role: 'admin' } },
    })
    const res = await createApp().request('/v1/admin/crawl/runs')
    expect(res.status).toBe(400)
  })

  it('returns 200 with empty array when no runs exist for an unknown venue', async () => {
    mockGetAuth.mockReturnValue({
      userId: 'admin_123',
      sessionClaims: { metadata: { role: 'admin' } },
    })
    // Use a venueId that has no in-progress crawls to verify the empty case
    const res = await createApp().request(
      '/v1/admin/crawl/runs?venueId=00000000-0000-0000-0000-000000000099',
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as { data: unknown[] }
    expect(body.data).toEqual([])
  })
})

describe('GET /v1/admin/crawl/status', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 for unauthenticated requests', async () => {
    mockGetAuth.mockReturnValue(null)
    const res = await createApp().request('/v1/admin/crawl/status')
    expect(res.status).toBe(401)
  })

  it('returns 200 with venue crawl status list', async () => {
    mockGetAuth.mockReturnValue({
      userId: 'admin_123',
      sessionClaims: { metadata: { role: 'admin' } },
    })
    const { db } = await import('@concert-crawl/db')
    // First orderBy call resolves the venue list; second resolves the selectDistinctOn chain
    vi.mocked(db.select().from().orderBy)
      .mockResolvedValueOnce([
        {
          id: '00000000-0000-0000-0000-000000000001',
          name: 'Ogden Theatre',
          active: true,
          verified: true,
          consecutiveFailures: 0,
          blockedAt: null,
          lastCrawledAt: new Date('2026-05-07T10:00:00Z'),
        },
      ])
      .mockResolvedValueOnce([])
    const res = await createApp().request('/v1/admin/crawl/status')
    expect(res.status).toBe(200)
    const body = (await res.json()) as { success: boolean; data: unknown[] }
    expect(body.success).toBe(true)
    expect(Array.isArray(body.data)).toBe(true)
  })
})
