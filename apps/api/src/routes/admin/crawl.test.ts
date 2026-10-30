import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createApp } from '../../app.js'

const mockGetAuth = vi.fn()
vi.mock('@hono/clerk-auth', () => ({
  clerkMiddleware: () => async (_ctx: unknown, next: () => Promise<void>) =>
    next(),
  getAuth: () => mockGetAuth(),
}))

const mockDispatchCrawler = vi.fn()
vi.mock('../../lib/crawler-dispatch.js', () => ({
  dispatchCrawlerInBackground: () => mockDispatchCrawler(),
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  and: vi.fn(),
  desc: vi.fn(),
  asc: vi.fn(),
  inArray: vi.fn(),
  isNull: vi.fn(),
}))

vi.mock('@concert-crawl/db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    selectDistinctOn: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnValue([]),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([]),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
  },
  venues: { blockedAt: 'venues.blocked_at' },
  crawlRuns: {},
  crawlTriggers: {},
  notifications: {},
  auditLog: {},
  inviteCodes: {},
}))

const VENUE_ID = '00000000-0000-0000-0000-000000000001'
const RUN_ID = '00000000-0000-0000-0000-000000000002'
const TRIGGER_ID = '00000000-0000-0000-0000-000000000003'

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

const mockTrigger = {
  id: TRIGGER_ID,
  venueId: VENUE_ID,
  status: 'pending',
  crawlRunId: null,
  triggeredBy: 'admin_123',
  createdAt: new Date(),
  updatedAt: new Date(),
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
  })

  describe('POST /v1/admin/crawl (bulk trigger)', () => {
    it('returns 401 for unauthenticated requests', async () => {
      mockGetAuth.mockReturnValue(null)
      const res = await createApp().request('/v1/admin/crawl', {
        method: 'POST',
      })
      expect(res.status).toBe(401)
    })

    it('returns 403 for non-admin users', async () => {
      mockGetAuth.mockReturnValue({
        userId: 'user_123',
        sessionClaims: { metadata: { role: 'user' } },
      })
      const res = await createApp().request('/v1/admin/crawl', {
        method: 'POST',
      })
      expect(res.status).toBe(403)
    })

    it('returns 202 with empty triggerIds when no active venues exist', async () => {
      adminAuth()
      const { db } = await import('@concert-crawl/db')
      vi.mocked(db.select().from().where).mockResolvedValueOnce([])
      const res = await createApp().request('/v1/admin/crawl', {
        method: 'POST',
      })
      expect(res.status).toBe(202)
      const body = (await res.json()) as {
        success: boolean
        data: { triggerIds: string[]; count: number }
      }
      expect(body.success).toBe(true)
      expect(body.data.triggerIds).toEqual([])
      expect(body.data.count).toBe(0)
    })

    it('leaves out venues that blocked us', async () => {
      adminAuth()
      const { db } = await import('@concert-crawl/db')
      const { isNull } = await import('drizzle-orm')
      vi.mocked(db.select().from().where).mockResolvedValueOnce([])
      await createApp().request('/v1/admin/crawl', { method: 'POST' })
      expect(isNull).toHaveBeenCalledWith('venues.blocked_at')
    })

    it('returns 202 with triggerIds when active venues exist', async () => {
      adminAuth()
      const { db } = await import('@concert-crawl/db')
      vi.mocked(db.select().from().where).mockResolvedValueOnce([
        { id: VENUE_ID },
      ])
      vi.mocked(db.insert({}).values().returning).mockResolvedValueOnce([
        { id: TRIGGER_ID, venueId: VENUE_ID },
      ])
      const res = await createApp().request('/v1/admin/crawl', {
        method: 'POST',
      })
      expect(res.status).toBe(202)
      const body = (await res.json()) as {
        success: boolean
        data: { triggerIds: string[]; count: number }
      }
      expect(body.success).toBe(true)
      expect(body.data.triggerIds).toEqual([TRIGGER_ID])
      expect(body.data.count).toBe(1)
    })

    it('persists force=true on every trigger when the body sets force=true', async () => {
      adminAuth()
      const { db } = await import('@concert-crawl/db')
      vi.mocked(db.select().from().where).mockResolvedValueOnce([
        { id: VENUE_ID },
      ])
      vi.mocked(db.insert({}).values).mockClear()
      vi.mocked(db.insert({}).values().returning).mockResolvedValueOnce([
        { id: TRIGGER_ID, venueId: VENUE_ID },
      ])
      const res = await createApp().request('/v1/admin/crawl', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ force: true }),
      })
      expect(res.status).toBe(202)
      expect(vi.mocked(db.insert({}).values)).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ force: true })]),
      )
    })

    // The Next.js proxy POSTs Content-Type: application/json with an empty
    // body, so parseForce must treat an empty JSON body as force=false without
    // logging a malformed-body warning.
    it('defaults force=false for an empty application/json body', async () => {
      adminAuth()
      const { db } = await import('@concert-crawl/db')
      vi.mocked(db.select().from().where).mockResolvedValueOnce([
        { id: VENUE_ID },
      ])
      vi.mocked(db.insert({}).values).mockClear()
      vi.mocked(db.insert({}).values().returning).mockResolvedValueOnce([
        { id: TRIGGER_ID, venueId: VENUE_ID },
      ])
      const res = await createApp().request('/v1/admin/crawl', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
      })
      expect(res.status).toBe(202)
      expect(vi.mocked(db.insert({}).values)).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ force: false })]),
      )
    })

    // A present-but-invalid body (valid JSON, wrong type) must not fail the
    // trigger — it defaults to force=false (and warns, see parseForce).
    it('defaults force=false when the body fails schema validation', async () => {
      adminAuth()
      const { db } = await import('@concert-crawl/db')
      vi.mocked(db.select().from().where).mockResolvedValueOnce([
        { id: VENUE_ID },
      ])
      vi.mocked(db.insert({}).values).mockClear()
      vi.mocked(db.insert({}).values().returning).mockResolvedValueOnce([
        { id: TRIGGER_ID, venueId: VENUE_ID },
      ])
      const res = await createApp().request('/v1/admin/crawl', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ force: 'true' }),
      })
      expect(res.status).toBe(202)
      expect(vi.mocked(db.insert({}).values)).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ force: false })]),
      )
    })
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

    it('returns 202 with triggerId and queues crawl trigger for valid venue', async () => {
      adminAuth()
      const { db } = await import('@concert-crawl/db')
      vi.mocked(db.select().from().where).mockResolvedValueOnce([mockVenue])
      vi.mocked(db.insert({}).values().returning).mockResolvedValueOnce([
        mockTrigger,
      ])

      const res = await createApp().request(`/v1/admin/crawl/${VENUE_ID}`, {
        method: 'POST',
      })

      expect(res.status).toBe(202)
      const body = (await res.json()) as {
        success: boolean
        data: { triggerId: string }
      }
      expect(body.success).toBe(true)
      expect(typeof body.data.triggerId).toBe('string')
    })

    it('persists force=true on the trigger when the body sets force=true', async () => {
      adminAuth()
      const { db } = await import('@concert-crawl/db')
      vi.mocked(db.select().from().where).mockResolvedValueOnce([mockVenue])
      vi.mocked(db.insert({}).values).mockClear()
      vi.mocked(db.insert({}).values().returning).mockResolvedValueOnce([
        mockTrigger,
      ])
      const res = await createApp().request(`/v1/admin/crawl/${VENUE_ID}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ force: true }),
      })
      expect(res.status).toBe(202)
      expect(vi.mocked(db.insert({}).values)).toHaveBeenCalledWith(
        expect.objectContaining({ force: true }),
      )
    })

    // Mirrors the Next.js proxy's empty application/json body (see bulk route
    // test) — parseForce must default to force=false without a warning log.
    it('defaults force=false for an empty application/json body', async () => {
      adminAuth()
      const { db } = await import('@concert-crawl/db')
      vi.mocked(db.select().from().where).mockResolvedValueOnce([mockVenue])
      vi.mocked(db.insert({}).values).mockClear()
      vi.mocked(db.insert({}).values().returning).mockResolvedValueOnce([
        mockTrigger,
      ])
      const res = await createApp().request(`/v1/admin/crawl/${VENUE_ID}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
      })
      expect(res.status).toBe(202)
      expect(vi.mocked(db.insert({}).values)).toHaveBeenCalledWith(
        expect.objectContaining({ force: false }),
      )
    })
  })

  describe('GET /v1/admin/crawl/triggers/:id', () => {
    it('returns 400 for non-UUID id', async () => {
      adminAuth()
      const res = await createApp().request(
        '/v1/admin/crawl/triggers/not-a-uuid',
      )
      expect(res.status).toBe(400)
    })

    it('returns 404 when trigger does not exist', async () => {
      adminAuth()
      const { db } = await import('@concert-crawl/db')
      vi.mocked(db.select().from().where).mockResolvedValueOnce([])
      const res = await createApp().request(
        `/v1/admin/crawl/triggers/${TRIGGER_ID}`,
      )
      expect(res.status).toBe(404)
    })

    it('returns 200 with trigger data', async () => {
      adminAuth()
      const { db } = await import('@concert-crawl/db')
      vi.mocked(db.select().from().where).mockResolvedValueOnce([mockTrigger])
      const res = await createApp().request(
        `/v1/admin/crawl/triggers/${TRIGGER_ID}`,
      )
      expect(res.status).toBe(200)
      const body = (await res.json()) as {
        success: boolean
        data: typeof mockTrigger
      }
      expect(body.success).toBe(true)
      expect(body.data.id).toBe(TRIGGER_ID)
      expect(body.data.status).toBe('pending')
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
  })

  describe('GET /v1/admin/crawl/runs (list)', () => {
    it('returns 200 with empty array when venueId is omitted', async () => {
      adminAuth()
      const res = await createApp().request('/v1/admin/crawl/runs')
      expect(res.status).toBe(200)
      const body = (await res.json()) as { success: boolean; data: unknown[] }
      expect(body.success).toBe(true)
      expect(Array.isArray(body.data)).toBe(true)
    })

    it('returns 400 when venueId is not a UUID', async () => {
      adminAuth()
      const res = await createApp().request(
        '/v1/admin/crawl/runs?venueId=not-a-uuid',
      )
      expect(res.status).toBe(400)
    })

    // Helper: queue the two terminal `.limit()` mocks for one request
    // through /runs. Both the notifications scan and the crawl_runs chain
    // end in `.orderBy().limit()`, so the same `limit` mock handles both.
    //
    // The route runs the notifications scan FIRST (its result scopes the
    // crawl_runs query when hasAlert=true) and the crawl_runs query
    // SECOND. The intermediate `where()` and `orderBy()` calls use the
    // default `mockReturnThis()`.
    //
    // For hasAlert=true with no matching notifications, the route
    // short-circuits before the crawl_runs query — callers can pass an
    // empty `crawlRunRows` and the second mockResolvedValueOnce is
    // harmlessly ignored.
    function queueAlertsThenRuns(
      db: typeof import('@concert-crawl/db').db,
      notificationRows: unknown[],
      crawlRunRows: unknown[],
    ): void {
      vi.mocked(db.select().from().leftJoin().where().orderBy().limit)
        .mockResolvedValueOnce(notificationRows)
        .mockResolvedValueOnce(crawlRunRows)
    }

    it('returns list of crawl runs for a venue', async () => {
      adminAuth()
      const { db } = await import('@concert-crawl/db')
      queueAlertsThenRuns(db, [], [mockCrawlRun])
      const res = await createApp().request(
        `/v1/admin/crawl/runs?venueId=${VENUE_ID}`,
      )
      expect(res.status).toBe(200)
      const body = (await res.json()) as {
        success: boolean
        data: (typeof mockCrawlRun & { activeAlert: unknown })[]
      }
      expect(body.success).toBe(true)
      expect(Array.isArray(body.data)).toBe(true)
      expect(body.data[0]?.activeAlert).toBeNull()
    })

    // #804: when an unread admin_alert notification points at a returned
    // crawl_run via metadata.crawlRunId, the row surfaces it as activeAlert
    // so the admin UI can render a Went-dark / Failing badge alongside the
    // Success status pill.
    it('attaches activeAlert when an unread notification matches a returned crawl run', async () => {
      adminAuth()
      const { db } = await import('@concert-crawl/db')
      const NOTIF_ID = '00000000-0000-0000-0000-0000000000aa'
      queueAlertsThenRuns(
        db,
        [
          {
            id: NOTIF_ID,
            category: 'crawl.event_count_dropped',
            metadata: JSON.stringify({
              venueId: VENUE_ID,
              crawlRunId: RUN_ID,
              severity: 'went_dark',
            }),
            createdAt: new Date(),
          },
        ],
        [mockCrawlRun],
      )
      const res = await createApp().request(
        `/v1/admin/crawl/runs?venueId=${VENUE_ID}`,
      )
      expect(res.status).toBe(200)
      const body = (await res.json()) as {
        success: boolean
        data: {
          id: string
          activeAlert: {
            notificationId: string
            category: string
            severity: string | null
            ceilingKind: string | null
            coverageSeverity: string | null
          } | null
        }[]
      }
      expect(body.data[0]?.activeAlert).toEqual({
        notificationId: NOTIF_ID,
        category: 'crawl.event_count_dropped',
        severity: 'went_dark',
        ceilingKind: null,
        coverageSeverity: null,
      })
    })

    // #1185: the capped-catalogue guard is a third alert category, and its
    // fingerprint travels in metadata.kind rather than metadata.severity so
    // the admin badge can distinguish a shrinking horizon from a pinned count.
    it('attaches ceilingKind for a capped-catalogue alert', async () => {
      adminAuth()
      const { db } = await import('@concert-crawl/db')
      const NOTIF_ID = '00000000-0000-0000-0000-0000000000ab'
      queueAlertsThenRuns(
        db,
        [
          {
            id: NOTIF_ID,
            category: 'crawl.event_ceiling_suspected',
            metadata: JSON.stringify({
              venueId: VENUE_ID,
              crawlRunId: RUN_ID,
              kind: 'horizon_shrank',
            }),
            createdAt: new Date(),
          },
        ],
        [mockCrawlRun],
      )
      const res = await createApp().request(
        `/v1/admin/crawl/runs?venueId=${VENUE_ID}`,
      )
      expect(res.status).toBe(200)
      const body = (await res.json()) as {
        data: {
          activeAlert: {
            notificationId: string
            category: string
            severity: string | null
            ceilingKind: string | null
            coverageSeverity: string | null
          } | null
        }[]
      }
      expect(body.data[0]?.activeAlert).toEqual({
        notificationId: NOTIF_ID,
        category: 'crawl.event_ceiling_suspected',
        severity: null,
        ceilingKind: 'horizon_shrank',
        coverageSeverity: null,
      })
    })

    // The URL-coverage guard is a fourth category, and its discriminator
    // travels in metadata.coverage — `severity` and `kind` are already spoken
    // for by the went-dark and ceiling guards respectively.
    it('attaches coverageSeverity for a URL-coverage alert', async () => {
      adminAuth()
      const { db } = await import('@concert-crawl/db')
      const NOTIF_ID = '00000000-0000-0000-0000-0000000000ac'
      queueAlertsThenRuns(
        db,
        [
          {
            id: NOTIF_ID,
            category: 'crawl.url_coverage_gap',
            metadata: JSON.stringify({
              venueId: VENUE_ID,
              crawlRunId: RUN_ID,
              coverage: 'partial_gap',
            }),
            createdAt: new Date(),
          },
        ],
        [mockCrawlRun],
      )
      const res = await createApp().request(
        `/v1/admin/crawl/runs?venueId=${VENUE_ID}`,
      )
      expect(res.status).toBe(200)
      const body = (await res.json()) as {
        data: {
          activeAlert: {
            notificationId: string
            category: string
            severity: string | null
            ceilingKind: string | null
            coverageSeverity: string | null
          } | null
        }[]
      }
      expect(body.data[0]?.activeAlert).toEqual({
        notificationId: NOTIF_ID,
        category: 'crawl.url_coverage_gap',
        severity: null,
        ceilingKind: null,
        coverageSeverity: 'partial_gap',
      })
    })

    // A notification whose metadata carries an UNKNOWN severity value
    // (e.g. a future writer adds a new variant before the API code is
    // updated) is still a valid badge target — the defensive schema
    // .catch(undefined)'s unknown values to "no severity" rather than
    // dropping the notification entirely.
    it('tolerates notification metadata with an unknown severity value', async () => {
      adminAuth()
      const { db } = await import('@concert-crawl/db')
      const NOTIF_ID = '00000000-0000-0000-0000-0000000000a4'
      queueAlertsThenRuns(
        db,
        [
          {
            id: NOTIF_ID,
            category: 'crawl.event_count_dropped',
            metadata: JSON.stringify({
              venueId: VENUE_ID,
              crawlRunId: RUN_ID,
              severity: 'future_unknown_variant',
            }),
            createdAt: new Date(),
          },
        ],
        [mockCrawlRun],
      )
      const res = await createApp().request(
        `/v1/admin/crawl/runs?venueId=${VENUE_ID}`,
      )
      const body = (await res.json()) as {
        data: {
          activeAlert: {
            notificationId: string
            severity: string | null
          } | null
        }[]
      }
      expect(body.data[0]?.activeAlert?.notificationId).toBe(NOTIF_ID)
      expect(body.data[0]?.activeAlert?.severity).toBeNull()
    })

    // A notification whose metadata explicitly stores `severity: null`
    // (e.g. a future writer that wants to mark "intentionally absent") is
    // still a valid badge target — the defensive schema accepts both
    // `null` and missing/undefined and collapses them to "no severity".
    it('tolerates notification metadata that explicitly stores severity=null', async () => {
      adminAuth()
      const { db } = await import('@concert-crawl/db')
      const NOTIF_ID = '00000000-0000-0000-0000-0000000000a3'
      queueAlertsThenRuns(
        db,
        [
          {
            id: NOTIF_ID,
            category: 'crawl.event_count_dropped',
            metadata: JSON.stringify({
              venueId: VENUE_ID,
              crawlRunId: RUN_ID,
              severity: null,
            }),
            createdAt: new Date(),
          },
        ],
        [mockCrawlRun],
      )
      const res = await createApp().request(
        `/v1/admin/crawl/runs?venueId=${VENUE_ID}`,
      )
      const body = (await res.json()) as {
        data: {
          activeAlert: {
            notificationId: string
            severity: string | null
          } | null
        }[]
      }
      expect(body.data[0]?.activeAlert?.notificationId).toBe(NOTIF_ID)
      expect(body.data[0]?.activeAlert?.severity).toBeNull()
    })

    // Older event-count notifications written before the severity field
    // was added (#804 round 2) still need to surface correctly — the badge
    // just falls back to a neutral label.
    it('attaches activeAlert with severity=null when notification metadata predates severity', async () => {
      adminAuth()
      const { db } = await import('@concert-crawl/db')
      const NOTIF_ID = '00000000-0000-0000-0000-0000000000a1'
      queueAlertsThenRuns(
        db,
        [
          {
            id: NOTIF_ID,
            category: 'crawl.event_count_dropped',
            metadata: JSON.stringify({ venueId: VENUE_ID, crawlRunId: RUN_ID }),
            createdAt: new Date(),
          },
        ],
        [mockCrawlRun],
      )
      const res = await createApp().request(
        `/v1/admin/crawl/runs?venueId=${VENUE_ID}`,
      )
      const body = (await res.json()) as {
        data: {
          activeAlert: { severity: string | null } | null
        }[]
      }
      expect(body.data[0]?.activeAlert?.severity).toBeNull()
    })

    // 'crawl.failed' never carries a sub-severity; the API normalizes to
    // null so the UI doesn't have to special-case undefined-vs-null.
    it('returns severity=null for crawl.failed alerts even when metadata accidentally carries one', async () => {
      adminAuth()
      const { db } = await import('@concert-crawl/db')
      const NOTIF_ID = '00000000-0000-0000-0000-0000000000a2'
      queueAlertsThenRuns(
        db,
        [
          {
            id: NOTIF_ID,
            category: 'crawl.failed',
            metadata: JSON.stringify({
              venueId: VENUE_ID,
              crawlRunId: RUN_ID,
              severity: 'went_dark',
            }),
            createdAt: new Date(),
          },
        ],
        [mockCrawlRun],
      )
      const res = await createApp().request(
        `/v1/admin/crawl/runs?venueId=${VENUE_ID}`,
      )
      const body = (await res.json()) as {
        data: {
          activeAlert: { category: string; severity: string | null } | null
        }[]
      }
      expect(body.data[0]?.activeAlert?.category).toBe('crawl.failed')
      expect(body.data[0]?.activeAlert?.severity).toBeNull()
    })

    it('ignores notifications whose metadata.crawlRunId does not match any returned run', async () => {
      adminAuth()
      const { db } = await import('@concert-crawl/db')
      queueAlertsThenRuns(
        db,
        [
          {
            id: '00000000-0000-0000-0000-0000000000bb',
            category: 'crawl.failed',
            metadata: JSON.stringify({
              venueId: VENUE_ID,
              crawlRunId: '00000000-0000-0000-0000-0000000000ff', // unrelated
            }),
            createdAt: new Date(),
          },
        ],
        [mockCrawlRun],
      )
      const res = await createApp().request(
        `/v1/admin/crawl/runs?venueId=${VENUE_ID}`,
      )
      const body = (await res.json()) as {
        data: { activeAlert: unknown }[]
      }
      expect(body.data[0]?.activeAlert).toBeNull()
    })

    it('tolerates malformed notification.metadata without crashing the list', async () => {
      adminAuth()
      const { db } = await import('@concert-crawl/db')
      queueAlertsThenRuns(
        db,
        [
          {
            id: '00000000-0000-0000-0000-0000000000cc',
            category: 'crawl.failed',
            metadata: 'not-json-{', // malformed
            createdAt: new Date(),
          },
          {
            id: '00000000-0000-0000-0000-0000000000dd',
            category: 'crawl.failed',
            metadata: null, // missing entirely
            createdAt: new Date(),
          },
        ],
        [mockCrawlRun],
      )
      const res = await createApp().request(
        `/v1/admin/crawl/runs?venueId=${VENUE_ID}`,
      )
      expect(res.status).toBe(200)
      const body = (await res.json()) as {
        data: { activeAlert: unknown }[]
      }
      expect(body.data[0]?.activeAlert).toBeNull()
    })

    // #804: hasAlert=true narrows the response to suspicious runs only.
    // Operator-facing "find quickly" workflow without scanning the full
    // list.
    it('hasAlert=true returns only runs whose activeAlert is non-null', async () => {
      adminAuth()
      const { db } = await import('@concert-crawl/db')
      const RUN_WITH_ALERT = '00000000-0000-0000-0000-0000000000e1'
      // The route scopes the crawl_runs query by the alerted run-id set
      // (WHERE id IN (alertedRunIds)) when hasAlert=true, so the DB
      // returns only the alerted run. The mock can't actually evaluate
      // the SQL `IN`, so it has to return the expected filtered result
      // directly.
      queueAlertsThenRuns(
        db,
        [
          {
            id: '00000000-0000-0000-0000-0000000000aa',
            category: 'crawl.event_count_dropped',
            metadata: JSON.stringify({
              venueId: VENUE_ID,
              crawlRunId: RUN_WITH_ALERT,
            }),
            createdAt: new Date(),
          },
        ],
        [{ ...mockCrawlRun, id: RUN_WITH_ALERT }],
      )
      const res = await createApp().request(
        `/v1/admin/crawl/runs?venueId=${VENUE_ID}&hasAlert=true`,
      )
      expect(res.status).toBe(200)
      const body = (await res.json()) as {
        data: { id: string; activeAlert: unknown }[]
      }
      expect(body.data).toHaveLength(1)
      expect(body.data[0]?.id).toBe(RUN_WITH_ALERT)
      expect(body.data[0]?.activeAlert).not.toBeNull()
    })

    // Regression: a previous implementation fetched the top-N crawl_runs
    // from SQL first and then JS-filtered by activeAlert, which meant
    // `hasAlert=true&limit=10` could return an empty list even when
    // older runs (rank 11+) had unread alerts. The notifications scan
    // now runs first and scopes the crawl_runs query by the alerted id
    // set, so older alerted runs surface correctly.
    it('hasAlert=true surfaces older alerted runs outside the natural top-N window', async () => {
      adminAuth()
      const { db } = await import('@concert-crawl/db')
      const OLD_ALERTED_RUN = '00000000-0000-0000-0000-0000000000e3'
      queueAlertsThenRuns(
        db,
        [
          {
            id: '00000000-0000-0000-0000-0000000000ab',
            category: 'crawl.event_count_dropped',
            metadata: JSON.stringify({
              venueId: VENUE_ID,
              crawlRunId: OLD_ALERTED_RUN,
              severity: 'went_dark',
            }),
            createdAt: new Date('2026-06-22T00:00:00Z'),
          },
        ],
        // The scoped crawl_runs query returns the old alerted run
        // because the SQL IN clause includes its id — even though it's
        // not in the chronologically newest top-N.
        [{ ...mockCrawlRun, id: OLD_ALERTED_RUN }],
      )
      const res = await createApp().request(
        `/v1/admin/crawl/runs?venueId=${VENUE_ID}&hasAlert=true&limit=10`,
      )
      expect(res.status).toBe(200)
      const body = (await res.json()) as {
        data: { id: string; activeAlert: { severity: string | null } | null }[]
      }
      expect(body.data).toHaveLength(1)
      expect(body.data[0]?.id).toBe(OLD_ALERTED_RUN)
      expect(body.data[0]?.activeAlert?.severity).toBe('went_dark')
    })

    // hasAlert=true short-circuits before the crawl_runs query when no
    // notifications match — saves a query and avoids an empty `IN ()` SQL
    // clause that some drivers reject.
    it('hasAlert=true returns [] without querying crawl_runs when no unread alerts exist', async () => {
      adminAuth()
      const { db } = await import('@concert-crawl/db')
      vi.mocked(
        db.select().from().leftJoin().where().orderBy().limit,
      ).mockResolvedValueOnce([])
      const res = await createApp().request(
        `/v1/admin/crawl/runs?venueId=${VENUE_ID}&hasAlert=true`,
      )
      expect(res.status).toBe(200)
      const body = (await res.json()) as { data: unknown[] }
      expect(body.data).toEqual([])
    })

    it('hasAlert=false returns the full list including runs with no alert', async () => {
      adminAuth()
      const { db } = await import('@concert-crawl/db')
      queueAlertsThenRuns(
        db,
        [], // no unread notifications
        [{ ...mockCrawlRun, id: RUN_ID }],
      )
      const res = await createApp().request(
        `/v1/admin/crawl/runs?venueId=${VENUE_ID}&hasAlert=false`,
      )
      expect(res.status).toBe(200)
      const body = (await res.json()) as {
        data: { id: string; activeAlert: unknown }[]
      }
      expect(body.data).toHaveLength(1)
      expect(body.data[0]?.activeAlert).toBeNull()
    })
  })
})

describe('GET /v1/admin/crawl/runs — returns DB data only (no in-memory map)', () => {
  beforeEach(() => {
    mockGetAuth.mockReset()
  })

  it('returns 200 with empty array when venueId is omitted', async () => {
    mockGetAuth.mockReturnValue({
      userId: 'admin_123',
      sessionClaims: { metadata: { role: 'admin' } },
    })
    const res = await createApp().request('/v1/admin/crawl/runs')
    expect(res.status).toBe(200)
    const body = (await res.json()) as { success: boolean; data: unknown[] }
    expect(body.success).toBe(true)
    expect(Array.isArray(body.data)).toBe(true)
  })

  it('returns 200 with empty array when no runs exist for an unknown venue', async () => {
    mockGetAuth.mockReturnValue({
      userId: 'admin_123',
      sessionClaims: { metadata: { role: 'admin' } },
    })
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
          websiteUrl: 'https://www.ogdentheatre.com',
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

describe('Admin crawl routes wake the crawler (Render exit step 2)', () => {
  beforeEach(() => {
    mockGetAuth.mockReset()
    mockDispatchCrawler.mockReset()
    adminAuth()
  })

  it('dispatches once for a trigger-all, however many venues it queued', async () => {
    const { db } = await import('@concert-crawl/db')
    const venueIds = ['v1', 'v2', 'v3']
    vi.mocked(db.select().from().where).mockResolvedValueOnce(
      venueIds.map((id) => ({ id })),
    )
    vi.mocked(db.insert({}).values().returning).mockResolvedValueOnce(
      venueIds.map((venueId, index) => ({ id: `t${index}`, venueId })),
    )
    const res = await createApp().request('/v1/admin/crawl', {
      method: 'POST',
    })
    expect(res.status).toBe(202)
    expect(mockDispatchCrawler).toHaveBeenCalledTimes(1)
  })

  it('does not dispatch when there is no venue to queue', async () => {
    const { db } = await import('@concert-crawl/db')
    vi.mocked(db.select().from().where).mockResolvedValueOnce([])
    const res = await createApp().request('/v1/admin/crawl', {
      method: 'POST',
    })
    expect(res.status).toBe(202)
    expect(mockDispatchCrawler).not.toHaveBeenCalled()
  })

  it('dispatches once for a single-venue trigger', async () => {
    const { db } = await import('@concert-crawl/db')
    vi.mocked(db.select().from().where).mockResolvedValueOnce([mockVenue])
    vi.mocked(db.insert({}).values().returning).mockResolvedValueOnce([
      mockTrigger,
    ])
    const res = await createApp().request(`/v1/admin/crawl/${VENUE_ID}`, {
      method: 'POST',
    })
    expect(res.status).toBe(202)
    expect(mockDispatchCrawler).toHaveBeenCalledTimes(1)
  })

  it('does not dispatch for a venue that cannot be crawled', async () => {
    const { db } = await import('@concert-crawl/db')
    vi.mocked(db.select().from().where).mockResolvedValueOnce([])
    const res = await createApp().request(`/v1/admin/crawl/${VENUE_ID}`, {
      method: 'POST',
    })
    expect(res.status).toBe(404)
    expect(mockDispatchCrawler).not.toHaveBeenCalled()
  })
})
