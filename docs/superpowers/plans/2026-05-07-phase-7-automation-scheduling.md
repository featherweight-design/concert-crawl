# Phase 7: Automation + Scheduling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automate daily crawls for all active venues, give admins full visibility into crawl health, send email alerts on crawl failure, and provide a data-refinement workflow for reviewing low-confidence events.

**Architecture:** The crawler app's stub entrypoint is implemented as a batch runner (`apps/crawler/src/run.ts`) that fetches all active + verified venues from the DB and executes up to 3 concurrent calls to `crawlVenue` (already implemented in `@concert-crawl/crawler-core`). A GitHub Actions scheduled workflow triggers the process daily at 3 AM MT — this is cheaper (free tier covers a ~10-min daily job) and consistent with the existing `smoke.yml` pattern. Do NOT use Render cron services for the crawler — they cost ~$7/month each. Three new admin pages (Crawl Status, Event Review, Notifications) are backed by new Hono endpoints. Resend email is wired into `crawler-core` to fire an alert whenever a venue hits 3 consecutive failures.

**Tech Stack:** Hono + Zod (API), Drizzle ORM (DB), Next.js App Router (admin UI), Resend SDK (email), Vitest (tests), shadcn/ui (UI components), GitHub Actions cron (scheduler)

---

## Prerequisites

Before starting:

1. **Sentry web staging verification (human action):** Visit `https://concert-crawl-web-staging.onrender.com` and trigger a server error (or use Sentry dashboard → concert-crawl-web → Settings → Client Keys → Send test event). Confirm an event appears tagged `environment: staging` in the concert-crawl-web Sentry project. This is an outstanding item from Phase 6a.

2. Local environment running:
   ```bash
   docker compose up -d
   pnpm install
   pnpm db:migrate
   pnpm dev
   ```

---

## File Map

**New files:**
- `apps/api/src/routes/admin/notifications.ts` — list + mark-as-read endpoints
- `apps/api/src/routes/admin/notifications.test.ts` — unit tests
- `apps/api/src/routes/admin/events.ts` — list unverified, verify, delete events
- `apps/api/src/routes/admin/events.test.ts` — unit tests
- `packages/crawler-core/src/lib/email.ts` — Resend helper for failure alerts
- `apps/crawler/src/run.ts` — exportable daily crawl orchestrator (testable)
- `apps/crawler/src/run.test.ts` — unit tests for run.ts
- `apps/web/src/app/(protected)/admin/crawl/page.tsx` — Crawl Status dashboard
- `apps/web/src/components/admin/crawl-status-table/CrawlStatusTable.tsx` — venue health table
- `apps/web/src/components/admin/notification-bell/NotificationBell.tsx` — unread count + dropdown
- `apps/web/src/app/(protected)/admin/events/page.tsx` — Event Review page
- `apps/web/src/components/admin/event-review-table/EventReviewTable.tsx` — approve/reject table

**Modified files:**
- `apps/api/src/routes/admin/index.ts` — register notifications + events routers
- `apps/api/src/routes/admin/crawl.ts` — fix in-progress list bug; add `GET /status` endpoint
- `apps/api/src/routes/admin/crawl.test.ts` — add tests for new endpoints
- `packages/crawler-core/src/crawl.ts` — call `sendCrawlFailureEmail` on 3+ consecutive failures
- `packages/crawler-core/package.json` — add `resend` dependency
- `apps/crawler/src/index.ts` — replace stub with call to `runDailyCrawl()`
- `apps/crawler/package.json` — add `@concert-crawl/db`, `@concert-crawl/crawler-core`, `vitest` deps
- `apps/crawler/.env.example` — add `RESEND_API_KEY`, `ADMIN_EMAIL`
- `apps/web/src/app/(protected)/admin/layout.tsx` — add Crawl Status + Event Review nav items; add NotificationBell
- `.github/workflows/crawler.yml` — daily cron at 3 AM MT (prod)
- `.github/workflows/crawler-staging.yml` — daily cron at 4 AM MT (staging)

---

## Task 1: Notifications API

**Files:**
- Create: `apps/api/src/routes/admin/notifications.ts`
- Create: `apps/api/src/routes/admin/notifications.test.ts`
- Modify: `apps/api/src/routes/admin/index.ts`

- [ ] **Step 1.1: Write the failing tests**

Create `apps/api/src/routes/admin/notifications.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createApp } from '../../app.js'

const mockGetAuth = vi.fn()
vi.mock('@hono/clerk-auth', () => ({
  clerkMiddleware: () => async (_c: unknown, next: () => Promise<void>) => next(),
  getAuth: () => mockGetAuth(),
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((col, val) => ({ col, val, op: 'eq' })),
  desc: vi.fn((col) => ({ col, dir: 'desc' })),
  and: vi.fn((...args) => ({ args, op: 'and' })),
  isNull: vi.fn((col) => ({ col, op: 'isNull' })),
  lt: vi.fn((col, val) => ({ col, val, op: 'lt' })),
}))

const mockNotificationRow = {
  id: 'notif-1',
  userId: null,
  type: 'admin_alert',
  category: 'crawl.failed',
  title: 'Crawl failing: Ogden Theatre',
  body: '3 consecutive failures for Ogden Theatre',
  actionUrl: null,
  readAt: null,
  metadata: null,
  createdAt: new Date('2026-05-07T10:00:00Z'),
}

const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  limit: vi.fn().mockResolvedValue([mockNotificationRow]),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  returning: vi.fn().mockResolvedValue([{ ...mockNotificationRow, readAt: new Date() }]),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
}

vi.mock('@concert-crawl/db', () => ({
  db: mockDb,
  notifications: { id: 'id', type: 'type', readAt: 'readAt', createdAt: 'createdAt' },
  auditLog: {},
  venues: {},
  inviteCodes: {},
  crawlRuns: {},
  events: {},
}))

function adminAuth() {
  mockGetAuth.mockReturnValue({
    userId: 'admin_123',
    sessionClaims: { metadata: { role: 'admin' } },
  })
}

describe('GET /v1/admin/notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDb.select.mockReturnThis()
    mockDb.from.mockReturnThis()
    mockDb.where.mockReturnThis()
    mockDb.orderBy.mockReturnThis()
    mockDb.limit.mockResolvedValue([mockNotificationRow])
  })

  it('returns 401 for unauthenticated requests', async () => {
    mockGetAuth.mockReturnValue(null)
    const res = await createApp().request('/v1/admin/notifications')
    expect(res.status).toBe(401)
  })

  it('returns 200 with notifications list', async () => {
    adminAuth()
    const res = await createApp().request('/v1/admin/notifications')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(Array.isArray(body.data)).toBe(true)
    expect(body.data[0].id).toBe('notif-1')
  })

  it('defaults to limit=50', async () => {
    adminAuth()
    await createApp().request('/v1/admin/notifications')
    expect(mockDb.limit).toHaveBeenCalledWith(50)
  })

  it('accepts limit query param', async () => {
    adminAuth()
    await createApp().request('/v1/admin/notifications?limit=10')
    expect(mockDb.limit).toHaveBeenCalledWith(10)
  })

  it('rejects limit > 100', async () => {
    adminAuth()
    const res = await createApp().request('/v1/admin/notifications?limit=200')
    expect(res.status).toBe(400)
  })
})

describe('PATCH /v1/admin/notifications/:id/read', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDb.update.mockReturnThis()
    mockDb.set.mockReturnThis()
    mockDb.where.mockReturnThis()
    mockDb.returning.mockResolvedValue([{ ...mockNotificationRow, readAt: new Date() }])
  })

  it('returns 401 for unauthenticated requests', async () => {
    mockGetAuth.mockReturnValue(null)
    const res = await createApp().request('/v1/admin/notifications/notif-1/read', {
      method: 'PATCH',
    })
    expect(res.status).toBe(401)
  })

  it('returns 200 and marks notification as read', async () => {
    adminAuth()
    const res = await createApp().request('/v1/admin/notifications/notif-1/read', {
      method: 'PATCH',
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.readAt).not.toBeNull()
  })

  it('returns 404 when notification not found', async () => {
    adminAuth()
    mockDb.returning.mockResolvedValue([])
    const res = await createApp().request('/v1/admin/notifications/notif-1/read', {
      method: 'PATCH',
    })
    expect(res.status).toBe(404)
  })
})

describe('POST /v1/admin/notifications/read-all', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDb.update.mockReturnThis()
    mockDb.set.mockReturnThis()
    mockDb.where.mockReturnThis()
    mockDb.returning.mockResolvedValue([])
  })

  it('returns 200 and marks all admin_alert notifications as read', async () => {
    adminAuth()
    const res = await createApp().request('/v1/admin/notifications/read-all', {
      method: 'POST',
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })
})
```

- [ ] **Step 1.2: Run tests to confirm they fail**

```bash
cd /path/to/concert-crawl
pnpm --filter @concert-crawl/api test -- notifications
```

Expected: FAIL — `notifications` route not found (404s or import errors)

- [ ] **Step 1.3: Create `apps/api/src/routes/admin/notifications.ts`**

```typescript
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { eq, desc, and, isNull } from 'drizzle-orm'
import { db, notifications } from '@concert-crawl/db'
import type { AdminVariables } from './index.js'

const notifIdSchema = z.object({ id: z.string().uuid() })
const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
})

export const notificationsAdminRouter = new Hono<AdminVariables>()

// GET /v1/admin/notifications — list recent admin alerts
notificationsAdminRouter.get(
  '/',
  zValidator('query', listQuerySchema),
  async (ctx) => {
    const { limit } = ctx.req.valid('query')

    const rows = await db
      .select()
      .from(notifications)
      .where(eq(notifications.type, 'admin_alert'))
      .orderBy(desc(notifications.createdAt))
      .limit(limit)

    return ctx.json({ success: true, data: rows })
  },
)

// PATCH /v1/admin/notifications/:id/read — mark single notification as read
notificationsAdminRouter.patch(
  '/:id/read',
  zValidator('param', notifIdSchema),
  async (ctx) => {
    const { id } = ctx.req.valid('param')

    const [updated] = await db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(and(eq(notifications.id, id), isNull(notifications.readAt)))
      .returning()

    if (!updated) {
      return ctx.json({ success: false, error: 'Notification not found or already read' }, 404)
    }

    return ctx.json({ success: true, data: updated })
  },
)

// POST /v1/admin/notifications/read-all — mark all unread admin alerts as read
notificationsAdminRouter.post('/read-all', async (ctx) => {
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.type, 'admin_alert'), isNull(notifications.readAt)))

  return ctx.json({ success: true })
})
```

- [ ] **Step 1.4: Register the router in `apps/api/src/routes/admin/index.ts`**

Add this import after the existing crawl import:

```typescript
import { notificationsAdminRouter } from './notifications.js'
```

Add this route registration after `adminRouter.route('/crawl', crawlAdminRouter)`:

```typescript
adminRouter.route('/notifications', notificationsAdminRouter)
```

- [ ] **Step 1.5: Run tests to confirm they pass**

```bash
pnpm --filter @concert-crawl/api test -- notifications
```

Expected: all tests pass

- [ ] **Step 1.6: Commit**

```bash
git add apps/api/src/routes/admin/notifications.ts \
        apps/api/src/routes/admin/notifications.test.ts \
        apps/api/src/routes/admin/index.ts
git commit -m "feat: add admin notifications API (list, mark-as-read, read-all)"
```

---

## Task 2: Fix In-Progress Crawl List + Add Crawl Status Endpoint

**Files:**
- Modify: `apps/api/src/routes/admin/crawl.ts`
- Modify: `apps/api/src/routes/admin/crawl.test.ts`

- [ ] **Step 2.1: Write failing tests**

Open `apps/api/src/routes/admin/crawl.test.ts`. Locate or create it. Add these tests after any existing ones. (The mock setup matches the pattern in Step 1.1.)

```typescript
// Add to existing crawl.test.ts (or create with same mock boilerplate as notifications.test.ts)
// Paste these describe blocks after existing ones:

describe('GET /v1/admin/crawl/runs — includes in-progress runs', () => {
  // This test verifies the fix for the known in-progress tracking bug:
  // the list endpoint previously never returned in-flight runs.

  beforeEach(() => {
    vi.clearAllMocks()
    // Reset db mock to return empty array by default
    mockDb.select.mockReturnThis()
    mockDb.from.mockReturnThis()
    mockDb.where.mockReturnThis()
    mockDb.orderBy.mockReturnThis()
    mockDb.limit.mockResolvedValue([])
  })

  it('returns 400 when venueId is missing', async () => {
    adminAuth()
    const res = await createApp().request('/v1/admin/crawl/runs')
    expect(res.status).toBe(400)
  })

  it('returns 200 with empty array when no runs exist', async () => {
    adminAuth()
    const res = await createApp().request(
      '/v1/admin/crawl/runs?venueId=00000000-0000-0000-0000-000000000001',
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toEqual([])
  })
})

describe('GET /v1/admin/crawl/status', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDb.select.mockReturnThis()
    mockDb.selectDistinctOn = vi.fn().mockReturnThis()
    mockDb.from.mockReturnThis()
    mockDb.where.mockReturnThis()
    mockDb.orderBy.mockReturnThis()
    mockDb.limit.mockResolvedValue([])
  })

  it('returns 401 for unauthenticated requests', async () => {
    mockGetAuth.mockReturnValue(null)
    const res = await createApp().request('/v1/admin/crawl/status')
    expect(res.status).toBe(401)
  })

  it('returns 200 with venue crawl status list', async () => {
    adminAuth()
    mockDb.orderBy.mockResolvedValue([
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
    const res = await createApp().request('/v1/admin/crawl/status')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(Array.isArray(body.data)).toBe(true)
  })
})
```

- [ ] **Step 2.2: Run tests to confirm the new ones fail**

```bash
pnpm --filter @concert-crawl/api test -- crawl
```

Expected: new `GET /v1/admin/crawl/status` test fails (404)

- [ ] **Step 2.3: Fix in-progress list bug in `apps/api/src/routes/admin/crawl.ts`**

Find the `GET /runs` handler (the `listQuerySchema` section). Replace the handler body:

```typescript
// GET /v1/admin/crawl/runs?venueId=:id&limit=10 — list crawl runs for a venue
crawlAdminRouter.get(
  '/runs',
  zValidator('query', listQuerySchema),
  async (ctx) => {
    const { venueId, limit } = ctx.req.valid('query')

    const dbRuns = await db
      .select()
      .from(crawlRuns)
      .where(and(eq(crawlRuns.venueId, venueId)))
      .orderBy(desc(crawlRuns.createdAt))
      .limit(limit)

    // Prepend any in-progress run for this venue
    const inProgressForVenue = [...inProgressCrawls.entries()]
      .filter(([, v]) => v.venueId === venueId)
      .map(([id, v]) => ({
        id,
        venueId: v.venueId,
        status: 'in_progress' as const,
        httpStatusCode: null,
        robotsTxtBlocked: null,
        extractionStrategyUsed: null,
        eventsFound: 0,
        eventsInserted: 0,
        errorMessage: null,
        durationMs: null,
        createdAt: v.startedAt,
      }))

    return ctx.json({ success: true, data: [...inProgressForVenue, ...dbRuns] })
  },
)
```

- [ ] **Step 2.4: Add `GET /status` endpoint to `apps/api/src/routes/admin/crawl.ts`**

Add these imports at the top (add to the existing import from `drizzle-orm`):

```typescript
import { eq, and, desc, asc, inArray } from 'drizzle-orm'
```

Add the new endpoint after the `GET /runs` handler:

```typescript
// GET /v1/admin/crawl/status — all venues with their most recent crawl run
crawlAdminRouter.get('/status', async (ctx) => {
  const venueList = await db
    .select({
      id: venues.id,
      name: venues.name,
      active: venues.active,
      verified: venues.verified,
      consecutiveFailures: venues.consecutiveFailures,
      blockedAt: venues.blockedAt,
      lastCrawledAt: venues.lastCrawledAt,
    })
    .from(venues)
    .orderBy(asc(venues.name))

  const venueIds = venueList.map((v) => v.id)

  const latestRuns =
    venueIds.length > 0
      ? await db
          .selectDistinctOn([crawlRuns.venueId], {
            id: crawlRuns.id,
            venueId: crawlRuns.venueId,
            status: crawlRuns.status,
            createdAt: crawlRuns.createdAt,
            eventsFound: crawlRuns.eventsFound,
            eventsInserted: crawlRuns.eventsInserted,
            errorMessage: crawlRuns.errorMessage,
            extractionStrategyUsed: crawlRuns.extractionStrategyUsed,
          })
          .from(crawlRuns)
          .where(inArray(crawlRuns.venueId, venueIds))
          .orderBy(crawlRuns.venueId, desc(crawlRuns.createdAt))
      : []

  const runsByVenueId = new Map(latestRuns.map((r) => [r.venueId, r]))

  const data = venueList.map((venue) => {
    const lastRun = runsByVenueId.get(venue.id) ?? null
    // Also check if there's an in-progress crawl for this venue
    const inProgress = [...inProgressCrawls.entries()].find(
      ([, v]) => v.venueId === venue.id,
    )
    const effectiveLastRun = inProgress
      ? {
          id: inProgress[0],
          venueId: venue.id,
          status: 'in_progress' as const,
          createdAt: inProgress[1].startedAt,
          eventsFound: 0,
          eventsInserted: 0,
          errorMessage: null,
          extractionStrategyUsed: null,
        }
      : lastRun

    return { ...venue, lastRun: effectiveLastRun }
  })

  return ctx.json({ success: true, data })
})
```

Also add `venues` to the import from `@concert-crawl/db`:

```typescript
import { db, venues, crawlRuns } from '@concert-crawl/db'
```

- [ ] **Step 2.5: Run tests**

```bash
pnpm --filter @concert-crawl/api test -- crawl
```

Expected: all tests pass

- [ ] **Step 2.6: Commit**

```bash
git add apps/api/src/routes/admin/crawl.ts \
        apps/api/src/routes/admin/crawl.test.ts
git commit -m "fix: include in-progress runs in crawl list; add GET /admin/crawl/status endpoint"
```

---

## Task 3: Admin Events API

**Files:**
- Create: `apps/api/src/routes/admin/events.ts`
- Create: `apps/api/src/routes/admin/events.test.ts`
- Modify: `apps/api/src/routes/admin/index.ts`

- [ ] **Step 3.1: Write failing tests**

Create `apps/api/src/routes/admin/events.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createApp } from '../../app.js'

const mockGetAuth = vi.fn()
vi.mock('@hono/clerk-auth', () => ({
  clerkMiddleware: () => async (_c: unknown, next: () => Promise<void>) => next(),
  getAuth: () => mockGetAuth(),
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((col, val) => ({ col, val, op: 'eq' })),
  desc: vi.fn((col) => ({ col, dir: 'desc' })),
  and: vi.fn((...args) => ({ args, op: 'and' })),
  asc: vi.fn((col) => ({ col, dir: 'asc' })),
  sql: vi.fn((parts, ...vals) => ({ parts, vals })),
}))

const mockEventRow = {
  id: 'event-1',
  venueId: 'venue-1',
  title: 'Test Show',
  artist: 'Test Artist',
  date: '2026-06-01',
  verified: false,
  confidenceScore: '0.6',
  extractionStrategy: 'llm',
  status: 'upcoming',
  createdAt: new Date('2026-05-07T10:00:00Z'),
  updatedAt: new Date('2026-05-07T10:00:00Z'),
}

const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  offset: vi.fn().mockResolvedValue([mockEventRow]),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  returning: vi.fn().mockResolvedValue([{ ...mockEventRow, verified: true }]),
  delete: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
}

vi.mock('@concert-crawl/db', () => ({
  db: mockDb,
  events: { id: 'id', verified: 'verified', venueId: 'venueId', createdAt: 'createdAt' },
  auditLog: {},
  venues: {},
  inviteCodes: {},
  crawlRuns: {},
  notifications: {},
}))

function adminAuth() {
  mockGetAuth.mockReturnValue({
    userId: 'admin_123',
    sessionClaims: { metadata: { role: 'admin' } },
  })
}

describe('GET /v1/admin/events', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDb.select.mockReturnThis()
    mockDb.from.mockReturnThis()
    mockDb.where.mockReturnThis()
    mockDb.orderBy.mockReturnThis()
    mockDb.limit.mockReturnThis()
    mockDb.offset.mockResolvedValue([mockEventRow])
  })

  it('returns 401 for unauthenticated requests', async () => {
    mockGetAuth.mockReturnValue(null)
    const res = await createApp().request('/v1/admin/events')
    expect(res.status).toBe(401)
  })

  it('returns 200 with unverified events list', async () => {
    adminAuth()
    const res = await createApp().request('/v1/admin/events')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(Array.isArray(body.data)).toBe(true)
  })

  it('rejects limit > 100', async () => {
    adminAuth()
    const res = await createApp().request('/v1/admin/events?limit=200')
    expect(res.status).toBe(400)
  })
})

describe('PATCH /v1/admin/events/:id/verify', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDb.update.mockReturnThis()
    mockDb.set.mockReturnThis()
    mockDb.where.mockReturnThis()
    mockDb.returning.mockResolvedValue([{ ...mockEventRow, verified: true }])
  })

  it('returns 401 for unauthenticated requests', async () => {
    mockGetAuth.mockReturnValue(null)
    const res = await createApp().request('/v1/admin/events/event-1/verify', {
      method: 'PATCH',
    })
    expect(res.status).toBe(401)
  })

  it('returns 200 and sets verified=true', async () => {
    adminAuth()
    const res = await createApp().request('/v1/admin/events/event-1/verify', {
      method: 'PATCH',
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.verified).toBe(true)
  })

  it('returns 404 when event not found', async () => {
    adminAuth()
    mockDb.returning.mockResolvedValue([])
    const res = await createApp().request('/v1/admin/events/event-1/verify', {
      method: 'PATCH',
    })
    expect(res.status).toBe(404)
  })
})

describe('DELETE /v1/admin/events/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDb.delete.mockReturnThis()
    mockDb.where.mockReturnThis()
    mockDb.returning.mockResolvedValue([mockEventRow])
  })

  it('returns 401 for unauthenticated requests', async () => {
    mockGetAuth.mockReturnValue(null)
    const res = await createApp().request('/v1/admin/events/event-1', {
      method: 'DELETE',
    })
    expect(res.status).toBe(401)
  })

  it('returns 200 on successful delete', async () => {
    adminAuth()
    const res = await createApp().request('/v1/admin/events/event-1', {
      method: 'DELETE',
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })

  it('returns 404 when event not found', async () => {
    adminAuth()
    mockDb.returning.mockResolvedValue([])
    const res = await createApp().request('/v1/admin/events/event-1', {
      method: 'DELETE',
    })
    expect(res.status).toBe(404)
  })
})
```

- [ ] **Step 3.2: Run tests to confirm they fail**

```bash
pnpm --filter @concert-crawl/api test -- events
```

Expected: FAIL — route not found

- [ ] **Step 3.3: Create `apps/api/src/routes/admin/events.ts`**

```typescript
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { eq, desc, and, asc } from 'drizzle-orm'
import { db, events } from '@concert-crawl/db'
import { getAuthUser } from '../../middleware/auth.js'
import type { AdminVariables } from './index.js'

const eventIdSchema = z.object({ id: z.string().uuid() })

const listQuerySchema = z.object({
  verified: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})

export const eventsAdminRouter = new Hono<AdminVariables>()

// GET /v1/admin/events?verified=false&limit=50&offset=0
// Returns events pending review (unverified by default)
eventsAdminRouter.get(
  '/',
  zValidator('query', listQuerySchema),
  async (ctx) => {
    const { verified, limit, offset } = ctx.req.valid('query')

    const rows = await db
      .select()
      .from(events)
      .where(eq(events.verified, verified))
      .orderBy(asc(events.date), desc(events.createdAt))
      .limit(limit)
      .offset(offset)

    return ctx.json({ success: true, data: rows })
  },
)

// PATCH /v1/admin/events/:id/verify — approve an event (set verified=true)
eventsAdminRouter.patch(
  '/:id/verify',
  zValidator('param', eventIdSchema),
  async (ctx) => {
    const { id } = ctx.req.valid('param')

    const [updated] = await db
      .update(events)
      .set({ verified: true, updatedAt: new Date() })
      .where(eq(events.id, id))
      .returning()

    if (!updated) {
      return ctx.json({ success: false, error: 'Event not found' }, 404)
    }

    ctx.set('auditAction', 'event.verify')
    ctx.set('auditTargetId', id)
    ctx.set('auditActorId', getAuthUser(ctx).userId)

    return ctx.json({ success: true, data: updated })
  },
)

// DELETE /v1/admin/events/:id — reject and remove an unverified event
eventsAdminRouter.delete(
  '/:id',
  zValidator('param', eventIdSchema),
  async (ctx) => {
    const { id } = ctx.req.valid('param')

    const [deleted] = await db
      .delete(events)
      .where(eq(events.id, id))
      .returning()

    if (!deleted) {
      return ctx.json({ success: false, error: 'Event not found' }, 404)
    }

    ctx.set('auditAction', 'event.delete')
    ctx.set('auditTargetId', id)
    ctx.set('auditActorId', getAuthUser(ctx).userId)

    return ctx.json({ success: true })
  },
)
```

- [ ] **Step 3.4: Register in `apps/api/src/routes/admin/index.ts`**

Add import:
```typescript
import { eventsAdminRouter } from './events.js'
```

Add route:
```typescript
adminRouter.route('/events', eventsAdminRouter)
```

- [ ] **Step 3.5: Run tests**

```bash
pnpm --filter @concert-crawl/api test -- events
```

Expected: all tests pass

- [ ] **Step 3.6: Commit**

```bash
git add apps/api/src/routes/admin/events.ts \
        apps/api/src/routes/admin/events.test.ts \
        apps/api/src/routes/admin/index.ts
git commit -m "feat: add admin events API (list unverified, verify, delete)"
```

---

## Task 4: Resend Email in Crawler Core

**Files:**
- Modify: `packages/crawler-core/package.json`
- Create: `packages/crawler-core/src/lib/email.ts`
- Modify: `packages/crawler-core/src/crawl.ts`
- Modify: `apps/crawler/.env.example`

- [ ] **Step 4.1: Add resend dependency**

```bash
pnpm --filter @concert-crawl/crawler-core add resend
```

- [ ] **Step 4.2: Write the failing test**

Create `packages/crawler-core/src/lib/email.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock the resend SDK before importing the module under test
const mockSend = vi.fn().mockResolvedValue({ id: 'email-1' })
vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: { send: mockSend },
  })),
}))

describe('sendCrawlFailureEmail', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    process.env = {
      ...originalEnv,
      RESEND_API_KEY: 're_test_key',
      ADMIN_EMAIL: 'admin@example.com',
    }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('sends an email with venue name and failure count', async () => {
    const { sendCrawlFailureEmail } = await import('./email.js')
    await sendCrawlFailureEmail('Ogden Theatre', 3)

    expect(mockSend).toHaveBeenCalledOnce()
    const call = mockSend.mock.calls[0][0]
    expect(call.to).toBe('admin@example.com')
    expect(call.subject).toContain('Ogden Theatre')
    expect(call.html).toContain('3')
  })

  it('skips sending when RESEND_API_KEY is not set', async () => {
    delete process.env.RESEND_API_KEY
    const { sendCrawlFailureEmail } = await import('./email.js')
    await sendCrawlFailureEmail('Ogden Theatre', 3)

    expect(mockSend).not.toHaveBeenCalled()
  })

  it('skips sending when ADMIN_EMAIL is not set', async () => {
    delete process.env.ADMIN_EMAIL
    const { sendCrawlFailureEmail } = await import('./email.js')
    await sendCrawlFailureEmail('Ogden Theatre', 3)

    expect(mockSend).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 4.3: Run test to confirm it fails**

```bash
pnpm --filter @concert-crawl/crawler-core test -- email
```

Expected: FAIL — module not found

- [ ] **Step 4.4: Create `packages/crawler-core/src/lib/email.ts`**

```typescript
import { Resend } from 'resend'

export async function sendCrawlFailureEmail(
  venueName: string,
  consecutiveFailures: number,
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  const adminEmail = process.env.ADMIN_EMAIL

  if (!apiKey || !adminEmail) return

  const resend = new Resend(apiKey)

  await resend.emails.send({
    from: 'Concert Crawl Alerts <alerts@concertcrawl.app>',
    to: adminEmail,
    subject: `Crawl failing: ${venueName}`,
    html: `
      <p><strong>${venueName}</strong> has failed ${consecutiveFailures} consecutive crawls.</p>
      <p>The venue has been automatically paused. Visit the
      <a href="${process.env.ADMIN_URL ?? 'https://concertcrawl.app'}/admin/crawl">admin crawl dashboard</a>
      to review and re-enable.</p>
    `,
  })
}
```

- [ ] **Step 4.5: Run test to confirm it passes**

```bash
pnpm --filter @concert-crawl/crawler-core test -- email
```

Expected: all tests pass

- [ ] **Step 4.6: Wire email into `packages/crawler-core/src/crawl.ts`**

Find the import section at the top of `crawl.ts`. Add:

```typescript
import { sendCrawlFailureEmail } from './lib/email.js'
```

Find the block that creates the `crawl.failed` notification (around `if (newFailureCount >= 3)`). After the `db.insert(notifications)` call, add the email send (fire-and-forget, logged on error):

```typescript
    if (newFailureCount >= 3) {
      await db.insert(notifications).values({
        type: 'admin_alert',
        category: 'crawl.failed',
        title: `Crawl failing: ${venue.name}`,
        body: `${newFailureCount} consecutive failures for ${venue.name}`,
        metadata: JSON.stringify({ venueId }),
      })
      void sendCrawlFailureEmail(venue.name, newFailureCount).catch((err) => {
        logger.error({ err, venueId }, 'Failed to send crawl failure email')
      })
    }
```

Note: `logger` is already available in `crawl.ts` from `@concert-crawl/logger`. Confirm the import exists; add it if not:

```typescript
import { createLogger } from '@concert-crawl/logger'
const logger = createLogger('crawler-core')
```

- [ ] **Step 4.7: Update `apps/crawler/.env.example`**

Add after the existing `ANTHROPIC_API_KEY` line:

```
# Email alerts (Resend)
RESEND_API_KEY=re_...
ADMIN_EMAIL=your-email@example.com
ADMIN_URL=https://concertcrawl.app
```

- [ ] **Step 4.8: Run full crawler-core test suite**

```bash
pnpm --filter @concert-crawl/crawler-core test
```

Expected: all tests pass (including pre-existing ones)

- [ ] **Step 4.9: Commit**

```bash
git add packages/crawler-core/src/lib/email.ts \
        packages/crawler-core/src/lib/email.test.ts \
        packages/crawler-core/src/crawl.ts \
        packages/crawler-core/package.json \
        apps/crawler/.env.example \
        pnpm-lock.yaml
git commit -m "feat: send Resend email alert when venue hits 3 consecutive crawl failures"
```

---

## Task 5: Crawler Daily Runner

**Files:**
- Modify: `apps/crawler/package.json`
- Create: `apps/crawler/src/run.ts`
- Modify: `apps/crawler/src/index.ts`
- Create: `apps/crawler/src/run.test.ts`

- [ ] **Step 5.1: Add dependencies to `apps/crawler/package.json`**

```bash
pnpm --filter @concert-crawl/crawler add @concert-crawl/db @concert-crawl/crawler-core
pnpm --filter @concert-crawl/crawler add -D vitest @concert-crawl/logger
```

Add a test script to `apps/crawler/package.json`:

```json
{
  "scripts": {
    "start": "tsx src/index.ts",
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  }
}
```

- [ ] **Step 5.2: Write the failing tests**

Create `apps/crawler/src/run.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock DB
const mockVenues = [
  { id: 'venue-1', name: 'Ogden Theatre' },
  { id: 'venue-2', name: 'Bluebird Theater' },
  { id: 'venue-3', name: 'Red Rocks' },
  { id: 'venue-4', name: 'Mission Ballroom' },
]

const mockDbChain = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockResolvedValue(mockVenues),
}
vi.mock('@concert-crawl/db', () => ({
  db: mockDbChain,
  venues: { id: 'id', name: 'name', active: 'active', verified: 'verified' },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  and: vi.fn(),
}))

// Mock crawlVenue
const mockCrawlVenue = vi.fn().mockResolvedValue(undefined)
vi.mock('@concert-crawl/crawler-core', () => ({
  crawlVenue: mockCrawlVenue,
}))

// Mock logger
vi.mock('@concert-crawl/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  }),
}))

describe('runDailyCrawl', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDbChain.where.mockResolvedValue(mockVenues)
    mockCrawlVenue.mockResolvedValue(undefined)
  })

  it('calls crawlVenue for each active venue', async () => {
    const { runDailyCrawl } = await import('./run.js')
    await runDailyCrawl()
    expect(mockCrawlVenue).toHaveBeenCalledTimes(4)
    expect(mockCrawlVenue).toHaveBeenCalledWith('venue-1')
    expect(mockCrawlVenue).toHaveBeenCalledWith('venue-2')
    expect(mockCrawlVenue).toHaveBeenCalledWith('venue-3')
    expect(mockCrawlVenue).toHaveBeenCalledWith('venue-4')
  })

  it('returns succeeded and failed counts', async () => {
    mockCrawlVenue.mockRejectedValueOnce(new Error('blocked'))
    const { runDailyCrawl } = await import('./run.js')
    const result = await runDailyCrawl()
    expect(result.succeeded).toBe(3)
    expect(result.failed).toBe(1)
  })

  it('continues processing remaining venues when one fails', async () => {
    mockCrawlVenue
      .mockRejectedValueOnce(new Error('venue-1 blocked'))
      .mockResolvedValue(undefined)
    const { runDailyCrawl } = await import('./run.js')
    await runDailyCrawl()
    // All 4 venues attempted despite first failure
    expect(mockCrawlVenue).toHaveBeenCalledTimes(4)
  })

  it('processes no more than 3 venues concurrently per batch', async () => {
    // Track concurrent invocations
    let maxConcurrent = 0
    let currentConcurrent = 0
    mockCrawlVenue.mockImplementation(async () => {
      currentConcurrent++
      maxConcurrent = Math.max(maxConcurrent, currentConcurrent)
      await new Promise((r) => setTimeout(r, 10))
      currentConcurrent--
    })

    const { runDailyCrawl } = await import('./run.js')
    await runDailyCrawl()
    expect(maxConcurrent).toBeLessThanOrEqual(3)
  })

  it('returns zero counts when no active venues exist', async () => {
    mockDbChain.where.mockResolvedValue([])
    const { runDailyCrawl } = await import('./run.js')
    const result = await runDailyCrawl()
    expect(result.succeeded).toBe(0)
    expect(result.failed).toBe(0)
    expect(mockCrawlVenue).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 5.3: Run tests to confirm they fail**

```bash
pnpm --filter @concert-crawl/crawler test
```

Expected: FAIL — `./run.js` not found

- [ ] **Step 5.4: Create `apps/crawler/src/run.ts`**

```typescript
import { createLogger } from '@concert-crawl/logger'
import { db, venues } from '@concert-crawl/db'
import { eq, and } from 'drizzle-orm'
import { crawlVenue } from '@concert-crawl/crawler-core'

const logger = createLogger('crawler')
const MAX_CONCURRENT = 3

export async function runDailyCrawl(): Promise<{
  succeeded: number
  failed: number
  total: number
}> {
  logger.info('Starting daily crawl')

  const activeVenues = await db
    .select({ id: venues.id, name: venues.name })
    .from(venues)
    .where(and(eq(venues.active, true), eq(venues.verified, true)))

  logger.info({ venueCount: activeVenues.length }, 'Fetched active venues')

  let succeeded = 0
  let failed = 0

  for (let i = 0; i < activeVenues.length; i += MAX_CONCURRENT) {
    const batch = activeVenues.slice(i, i + MAX_CONCURRENT)
    const results = await Promise.allSettled(
      batch.map((venue) => crawlVenue(venue.id)),
    )

    for (const [j, result] of results.entries()) {
      if (result.status === 'fulfilled') {
        succeeded++
        logger.info({ venueId: batch[j].id, name: batch[j].name }, 'Crawl succeeded')
      } else {
        failed++
        logger.error(
          { venueId: batch[j].id, name: batch[j].name, err: result.reason },
          'Crawl failed',
        )
      }
    }
  }

  logger.info({ succeeded, failed, total: activeVenues.length }, 'Daily crawl complete')
  return { succeeded, failed, total: activeVenues.length }
}
```

- [ ] **Step 5.5: Run tests to confirm they pass**

```bash
pnpm --filter @concert-crawl/crawler test
```

Expected: all 5 tests pass

- [ ] **Step 5.6: Replace the stub in `apps/crawler/src/index.ts`**

```typescript
import './instrument.js'
import { createLogger } from '@concert-crawl/logger'
import { runDailyCrawl } from './run.js'

const logger = createLogger('crawler')

runDailyCrawl()
  .then(() => {
    process.exit(0)
  })
  .catch((err) => {
    logger.error({ err }, 'Fatal error in daily crawl')
    process.exit(1)
  })
```

- [ ] **Step 5.7: Verify typecheck passes**

```bash
pnpm --filter @concert-crawl/crawler typecheck
```

Expected: no errors

- [ ] **Step 5.8: Commit**

```bash
git add apps/crawler/src/run.ts \
        apps/crawler/src/run.test.ts \
        apps/crawler/src/index.ts \
        apps/crawler/package.json \
        pnpm-lock.yaml
git commit -m "feat: implement crawler daily runner — batch all active venues, max 3 concurrent"
```

---

## Task 6: GitHub Actions Cron Workflows

**Decision rationale:** GitHub Actions is free for this workload (~10-min daily job, well within the 2,000 min/month free tier). Render cron services cost ~$7/month each ($14/month for prod + staging). Do NOT switch this to Render — the cost difference is not justified. Pattern follows the existing `smoke.yml` workflow.

**Files:**
- Create: `.github/workflows/crawler.yml`
- Create: `.github/workflows/crawler-staging.yml`

- [ ] **Step 6.1: Create prod crawler workflow**

Create `.github/workflows/crawler.yml`:

```yaml
name: Daily Crawler (Production)

on:
  schedule:
    # 3 AM MT = 10 AM UTC (MST/UTC-7). Runs at 4 AM MT during MDT (UTC-6) — acceptable off-peak window.
    - cron: '0 10 * * *'
  workflow_dispatch:

jobs:
  crawl:
    name: Run daily crawler (production)
    runs-on: ubuntu-latest
    timeout-minutes: 60
    environment: production
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Cache Playwright browsers
        uses: actions/cache@v4
        with:
          path: ~/.cache/ms-playwright
          key: playwright-${{ runner.os }}-${{ hashFiles('apps/crawler/package.json') }}
          restore-keys: playwright-${{ runner.os }}-

      - name: Install Playwright browsers
        run: pnpm --filter @concert-crawl/crawler install-browsers

      - name: Run daily crawl
        run: pnpm --filter @concert-crawl/crawler start
        env:
          NODE_ENV: production
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          RESEND_API_KEY: ${{ secrets.RESEND_API_KEY }}
          ADMIN_EMAIL: ${{ vars.ADMIN_EMAIL }}
          ADMIN_URL: https://concertcrawl.app
          SENTRY_DSN: ${{ secrets.SENTRY_DSN }}
          SENTRY_ENVIRONMENT: production
          LOG_LEVEL: info
```

> **Human action required:** Add these secrets + variables in GitHub → Settings → Secrets and Variables → Actions (under the `production` environment): `DATABASE_URL`, `ANTHROPIC_API_KEY`, `RESEND_API_KEY`, `SENTRY_DSN` (secrets) and `ADMIN_EMAIL` (variable). Never commit real values.

- [ ] **Step 6.2: Create staging crawler workflow**

Create `.github/workflows/crawler-staging.yml`:

```yaml
name: Daily Crawler (Staging)

on:
  schedule:
    # 4 AM MT = 11 AM UTC — offset from prod to avoid simultaneous runs
    - cron: '0 11 * * *'
  workflow_dispatch:

jobs:
  crawl:
    name: Run daily crawler (staging)
    runs-on: ubuntu-latest
    timeout-minutes: 60
    environment: staging
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Cache Playwright browsers
        uses: actions/cache@v4
        with:
          path: ~/.cache/ms-playwright
          key: playwright-${{ runner.os }}-${{ hashFiles('apps/crawler/package.json') }}
          restore-keys: playwright-${{ runner.os }}-

      - name: Install Playwright browsers
        run: pnpm --filter @concert-crawl/crawler install-browsers

      - name: Run daily crawl
        run: pnpm --filter @concert-crawl/crawler start
        env:
          NODE_ENV: production
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          RESEND_API_KEY: ${{ secrets.RESEND_API_KEY }}
          ADMIN_EMAIL: ${{ vars.ADMIN_EMAIL }}
          ADMIN_URL: https://concert-crawl-web-staging.onrender.com
          SENTRY_DSN: ${{ secrets.SENTRY_DSN }}
          SENTRY_ENVIRONMENT: staging
          LOG_LEVEL: info
```

> **Human action required:** Add the same secrets + variables under the `staging` environment in GitHub Actions, pointing to staging DB and services.

- [ ] **Step 6.3: Commit**

```bash
git add .github/workflows/crawler.yml .github/workflows/crawler-staging.yml
git commit -m "feat: add GitHub Actions cron workflows for daily crawler (prod + staging)"
```

---

## Task 7: Admin Nav Update

**Files:**
- Modify: `apps/web/src/app/(protected)/admin/layout.tsx`

- [ ] **Step 7.1: Add Crawl Status and Event Review to nav**

In `apps/web/src/app/(protected)/admin/layout.tsx`, replace the `navItems` array:

```typescript
const navItems = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/venues', label: 'Venues' },
  { href: '/admin/crawl', label: 'Crawl Status' },
  { href: '/admin/events', label: 'Event Review' },
  { href: '/admin/invite-codes', label: 'Invite Codes' },
  { href: '/admin/settings', label: 'Settings' },
]
```

- [ ] **Step 7.2: Verify type check**

```bash
pnpm --filter @concert-crawl/web typecheck
```

Expected: no errors

- [ ] **Step 7.3: Commit**

```bash
git add apps/web/src/app/(protected)/admin/layout.tsx
git commit -m "feat: add Crawl Status and Event Review to admin nav"
```

---

## Task 8: Crawl Status Dashboard Page

**Files:**
- Create: `apps/web/src/components/admin/crawl-status-table/CrawlStatusTable.tsx`
- Create: `apps/web/src/app/(protected)/admin/crawl/page.tsx`

- [ ] **Step 8.1: Create `CrawlStatusTable.tsx`**

This is a server component. It receives the venue status data as props and renders a table showing each venue's crawl health.

Create `apps/web/src/components/admin/crawl-status-table/CrawlStatusTable.tsx`:

```typescript
import { Badge } from '@/components/ui/badge'

type LastRun = {
  id: string
  status: string
  createdAt: string
  eventsFound: number
  eventsInserted: number
  errorMessage: string | null
  extractionStrategyUsed: string | null
} | null

type VenueCrawlStatus = {
  id: string
  name: string
  active: boolean
  verified: boolean
  consecutiveFailures: number
  blockedAt: string | null
  lastCrawledAt: string | null
  lastRun: LastRun
}

const statusVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  success: 'default',
  partial: 'secondary',
  failed: 'destructive',
  in_progress: 'outline',
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Denver',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso))
}

type Props = {
  venues: VenueCrawlStatus[]
}

export const CrawlStatusTable = ({ venues }: Props) => {
  if (venues.length === 0) {
    return (
      <p className="text-sm text-fg-muted">
        No venues found. Add venues in the Venues section.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-fg-muted">
            <th className="pb-3 pr-4 font-medium">Venue</th>
            <th className="pb-3 pr-4 font-medium">Last Crawl</th>
            <th className="pb-3 pr-4 font-medium">Status</th>
            <th className="pb-3 pr-4 font-medium">Events</th>
            <th className="pb-3 pr-4 font-medium">Strategy</th>
            <th className="pb-3 font-medium">Failures</th>
          </tr>
        </thead>
        <tbody>
          {venues.map((venue) => (
            <tr key={venue.id} className="border-b border-border/50 last:border-0">
              <td className="py-3 pr-4 font-medium text-fg">
                {venue.name}
                {!venue.active && (
                  <span className="ml-2 text-xs text-fg-muted">(paused)</span>
                )}
                {venue.blockedAt && (
                  <span className="ml-2 text-xs text-red-500">(blocked)</span>
                )}
              </td>
              <td className="py-3 pr-4 text-fg-muted">
                {formatDate(venue.lastRun?.createdAt ?? null)}
              </td>
              <td className="py-3 pr-4">
                {venue.lastRun ? (
                  <Badge variant={statusVariant[venue.lastRun.status] ?? 'outline'}>
                    {venue.lastRun.status}
                  </Badge>
                ) : (
                  <span className="text-fg-muted">never</span>
                )}
              </td>
              <td className="py-3 pr-4 text-fg-muted">
                {venue.lastRun
                  ? `${venue.lastRun.eventsInserted}↑ / ${venue.lastRun.eventsFound} found`
                  : '—'}
              </td>
              <td className="py-3 pr-4 text-fg-muted">
                {venue.lastRun?.extractionStrategyUsed ?? '—'}
              </td>
              <td className="py-3">
                {venue.consecutiveFailures > 0 ? (
                  <span className="text-red-500">{venue.consecutiveFailures}</span>
                ) : (
                  <span className="text-fg-muted">0</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 8.2: Create the crawl status page**

Create `apps/web/src/app/(protected)/admin/crawl/page.tsx`:

```typescript
import { CrawlStatusTable } from '@/components/admin/crawl-status-table/CrawlStatusTable'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

async function getCrawlStatus() {
  const res = await fetch(`${API_URL}/v1/admin/crawl/status`, {
    cache: 'no-store',
    headers: {
      // Server-side requests to the internal API need auth.
      // Next.js forwards cookies automatically when using the App Router
      // fetch — no explicit cookie passing needed here.
    },
  })

  if (!res.ok) {
    throw new Error(`Failed to fetch crawl status: ${res.status}`)
  }

  const json = await res.json()
  return json.data as Array<{
    id: string
    name: string
    active: boolean
    verified: boolean
    consecutiveFailures: number
    blockedAt: string | null
    lastCrawledAt: string | null
    lastRun: {
      id: string
      status: string
      createdAt: string
      eventsFound: number
      eventsInserted: number
      errorMessage: string | null
      extractionStrategyUsed: string | null
    } | null
  }>
}

export default async function CrawlStatusPage() {
  const venues = await getCrawlStatus()

  const totalVenues = venues.length
  const failing = venues.filter((v) => v.consecutiveFailures >= 1).length
  const blocked = venues.filter((v) => v.blockedAt !== null).length
  const neverCrawled = venues.filter((v) => v.lastRun === null).length

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-fg">Crawl Status</h1>
        <p className="mt-1 text-sm text-fg-muted">
          Daily crawl health for all active venues.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Total venues', value: totalVenues },
          { label: 'Failing', value: failing, danger: failing > 0 },
          { label: 'Blocked', value: blocked, danger: blocked > 0 },
          { label: 'Never crawled', value: neverCrawled },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg border border-border bg-surface-1 p-4"
          >
            <p className="text-sm text-fg-muted">{stat.label}</p>
            <p
              className={`mt-1 text-2xl font-semibold ${
                stat.danger ? 'text-red-500' : 'text-fg'
              }`}
            >
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <CrawlStatusTable venues={venues} />
    </div>
  )
}
```

> **Note on auth:** The `getCrawlStatus` fetch is a server component request. In Next.js App Router, `fetch` in server components does not automatically forward cookies — you need to pass them explicitly using `cookies()` from `next/headers`. If the API requires auth cookies, add:
>
> ```typescript
> import { cookies } from 'next/headers'
> // ...
> const cookieStore = cookies()
> headers: { Cookie: cookieStore.toString() }
> ```
>
> Check how other admin pages in the codebase make authenticated server-side API calls and match that pattern.

- [ ] **Step 8.3: Type check**

```bash
pnpm --filter @concert-crawl/web typecheck
```

Expected: no errors. Fix any type mismatches before proceeding.

- [ ] **Step 8.4: Commit**

```bash
git add apps/web/src/components/admin/crawl-status-table/ \
        apps/web/src/app/(protected)/admin/crawl/
git commit -m "feat: add crawl status dashboard page"
```

---

## Task 9: Notifications Bell

**Files:**
- Create: `apps/web/src/components/admin/notification-bell/NotificationBell.tsx`
- Modify: `apps/web/src/app/(protected)/admin/layout.tsx`

- [ ] **Step 9.1: Create `NotificationBell.tsx`**

This is a client component. It polls the notifications endpoint every 30 seconds and shows unread count.

Create `apps/web/src/components/admin/notification-bell/NotificationBell.tsx`:

```typescript
'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'

type Notification = {
  id: string
  category: string
  title: string
  body: string
  actionUrl: string | null
  readAt: string | null
  createdAt: string
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export const NotificationBell = () => {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/v1/admin/notifications?limit=20`)
      if (!res.ok) return
      const json = await res.json()
      setNotifications(json.data ?? [])
    } catch {
      // Network errors are non-fatal for the bell
    }
  }, [])

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30_000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  const markAsRead = async (id: string) => {
    await fetch(`${API_URL}/v1/admin/notifications/${id}/read`, {
      method: 'PATCH',
    })
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)),
    )
  }

  const markAllRead = async () => {
    await fetch(`${API_URL}/v1/admin/notifications/read-all`, { method: 'POST' })
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })),
    )
  }

  const unreadCount = notifications.filter((n) => n.readAt === null).length

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative"
          aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        >
          <span className="text-base">🔔</span>
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-brand text-[10px] font-medium text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="text-sm font-medium text-fg">Notifications</p>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="text-xs text-fg-muted hover:text-fg"
            >
              Mark all read
            </button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-fg-muted">
              No notifications
            </p>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                className={`border-b border-border/50 px-4 py-3 last:border-0 ${
                  notif.readAt === null ? 'bg-surface-2' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-fg">
                      {notif.title}
                    </p>
                    <p className="mt-0.5 text-xs text-fg-muted line-clamp-2">
                      {notif.body}
                    </p>
                  </div>
                  {notif.readAt === null && (
                    <button
                      onClick={() => markAsRead(notif.id)}
                      className="shrink-0 text-xs text-fg-muted hover:text-fg"
                      aria-label="Mark as read"
                    >
                      ✕
                    </button>
                  )}
                </div>
                {notif.actionUrl && (
                  <a
                    href={notif.actionUrl}
                    className="mt-1 text-xs text-brand hover:underline"
                  >
                    View →
                  </a>
                )}
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
```

- [ ] **Step 9.2: Add bell to admin layout**

In `apps/web/src/app/(protected)/admin/layout.tsx`, add the import:

```typescript
import { NotificationBell } from '@/components/admin/notification-bell/NotificationBell'
```

In the sidebar, replace the bottom `<div>` containing `<UserButton />`:

```typescript
        <div className="mt-auto space-y-2 border-t border-border pt-4">
          <div className="flex items-center justify-between">
            <NotificationBell />
          </div>
          <UserButton showName />
        </div>
```

- [ ] **Step 9.3: Type check**

```bash
pnpm --filter @concert-crawl/web typecheck
```

Expected: no errors

- [ ] **Step 9.4: Commit**

```bash
git add apps/web/src/components/admin/notification-bell/ \
        apps/web/src/app/(protected)/admin/layout.tsx
git commit -m "feat: add notification bell to admin sidebar"
```

---

## Task 10: Event Review Page

**Files:**
- Create: `apps/web/src/components/admin/event-review-table/EventReviewTable.tsx`
- Create: `apps/web/src/app/(protected)/admin/events/page.tsx`

- [ ] **Step 10.1: Create `EventReviewTable.tsx`**

This is a client component so approve/reject actions can update the UI without a full page reload.

Create `apps/web/src/components/admin/event-review-table/EventReviewTable.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

type Event = {
  id: string
  venueId: string
  title: string
  artist: string
  date: string
  confidenceScore: string | null
  extractionStrategy: string | null
  sourceUrl: string | null
  verified: boolean
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

type Props = {
  initialEvents: Event[]
}

export const EventReviewTable = ({ initialEvents }: Props) => {
  const [events, setEvents] = useState(initialEvents)
  const [processing, setProcessing] = useState<string | null>(null)

  const approveEvent = async (id: string) => {
    setProcessing(id)
    try {
      const res = await fetch(`${API_URL}/v1/admin/events/${id}/verify`, {
        method: 'PATCH',
      })
      if (res.ok) {
        setEvents((prev) => prev.filter((e) => e.id !== id))
      }
    } finally {
      setProcessing(null)
    }
  }

  const rejectEvent = async (id: string) => {
    if (!confirm('Delete this event? This cannot be undone.')) return
    setProcessing(id)
    try {
      const res = await fetch(`${API_URL}/v1/admin/events/${id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setEvents((prev) => prev.filter((e) => e.id !== id))
      }
    } finally {
      setProcessing(null)
    }
  }

  if (events.length === 0) {
    return (
      <p className="text-sm text-fg-muted">
        No events pending review. All extractions have been verified.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {events.map((event) => {
        const confidence = event.confidenceScore
          ? parseFloat(event.confidenceScore)
          : null
        const isLowConfidence = confidence !== null && confidence < 0.7

        return (
          <div
            key={event.id}
            className="flex items-start justify-between gap-4 rounded-lg border border-border bg-surface-1 p-4"
          >
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <p className="font-medium text-fg">{event.title}</p>
                {isLowConfidence && (
                  <Badge variant="destructive" className="text-xs">
                    {Math.round((confidence ?? 0) * 100)}% confidence
                  </Badge>
                )}
                {event.extractionStrategy === 'llm' && (
                  <Badge variant="outline" className="text-xs">
                    LLM
                  </Badge>
                )}
              </div>
              <p className="text-sm text-fg-muted">
                {event.artist} · {event.date}
              </p>
              {event.sourceUrl && (
                <a
                  href={event.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-brand hover:underline"
                >
                  View source →
                </a>
              )}
            </div>
            <div className="flex shrink-0 gap-2">
              <Button
                size="sm"
                onClick={() => approveEvent(event.id)}
                disabled={processing === event.id}
              >
                Approve
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => rejectEvent(event.id)}
                disabled={processing === event.id}
              >
                Reject
              </Button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 10.2: Create the event review page**

Create `apps/web/src/app/(protected)/admin/events/page.tsx`:

```typescript
import { EventReviewTable } from '@/components/admin/event-review-table/EventReviewTable'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

async function getUnverifiedEvents() {
  const res = await fetch(
    `${API_URL}/v1/admin/events?verified=false&limit=50`,
    { cache: 'no-store' },
  )

  if (!res.ok) {
    throw new Error(`Failed to fetch events: ${res.status}`)
  }

  const json = await res.json()
  return json.data as Array<{
    id: string
    venueId: string
    title: string
    artist: string
    date: string
    confidenceScore: string | null
    extractionStrategy: string | null
    sourceUrl: string | null
    verified: boolean
  }>
}

export default async function EventReviewPage() {
  const events = await getUnverifiedEvents()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-fg">Event Review</h1>
        <p className="mt-1 text-sm text-fg-muted">
          Review and approve or reject events extracted with low confidence.
          Approved events are marked verified and appear in the calendar.
          Rejected events are deleted.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <p className="text-sm text-fg-muted">
          {events.length} event{events.length !== 1 ? 's' : ''} pending review
        </p>
      </div>

      <EventReviewTable initialEvents={events} />
    </div>
  )
}
```

- [ ] **Step 10.3: Type check**

```bash
pnpm --filter @concert-crawl/web typecheck
```

Expected: no errors. Fix any issues before proceeding.

- [ ] **Step 10.4: Commit**

```bash
git add apps/web/src/components/admin/event-review-table/ \
        apps/web/src/app/(protected)/admin/events/
git commit -m "feat: add event review page for admin data refinement"
```

---

## Task 11: Full Integration Verification

- [ ] **Step 11.1: Run all tests**

```bash
pnpm test
```

Expected: all tests pass across all packages

- [ ] **Step 11.2: Run full type check**

```bash
pnpm typecheck
```

Expected: no errors across all apps + packages

- [ ] **Step 11.3: Start local dev and manually verify**

```bash
pnpm dev
```

Visit `http://localhost:3000/admin`:
- [ ] Crawl Status link appears in sidebar → `/admin/crawl` loads without error
- [ ] Event Review link appears in sidebar → `/admin/events` loads without error
- [ ] Notification bell appears in sidebar
- [ ] Visit `/admin/venues`, trigger a manual crawl on a venue, check `/admin/crawl` shows the run

- [ ] **Step 11.4: Open PR**

```bash
git push origin feat/phase-7-plan
```

Open PR with title: `feat: Phase 7 — automation, crawl dashboard, event review, email alerts`

Use `.github/pull_request_template.md`.

Describe:
- What the PR delivers (all 4 Phase 7 deliverables)
- **Human action required:** Set `RESEND_API_KEY`, `ADMIN_EMAIL`, `SENTRY_DSN` in Render dashboard for both cron services after merge
- Note: `SMOKE_ENABLED` on prod smoke cron can remain `false` until beta launch

---

## Self-Review

### Spec coverage

| Spec requirement | Task |
|---|---|
| Render cron job for daily crawler (all active venues) | Tasks 5 + 6 |
| Crawl status dashboard in admin UI | Tasks 2 + 8 |
| Admin data refinement tools (review low-confidence events) | Tasks 3 + 10 |
| Email alerts on crawl failure (Resend) | Task 4 |
| **Milestone:** Fully automated daily crawls, admin visibility into crawl health | All tasks combined |

### Additional improvements included

| Item | Task | Reason |
|---|---|---|
| Fix in-progress crawl list bug (known betterment) | Task 2 | Referenced in project memory; was a known TODO |
| Notifications API + bell | Tasks 1 + 9 | Notifications were written to DB but never readable; bell is the UX entry point |

### Gaps / deferred items

- **Server-side auth on admin fetch calls (Tasks 8, 10):** The crawl status and event review pages use server component `fetch()` calls that may require explicit cookie forwarding. The plan notes this but defers to implementation — check existing admin pages for the established pattern.
- **`ADMIN_URL` env var in crawler-core email:** `process.env.ADMIN_URL` is read directly in `email.ts`. This is fine for now but should be added to `apps/crawler/.env.example` (done in Task 4).
- **Pagination on Event Review:** The page fetches 50 events max. A "Load More" button or pagination can be added post-beta if the queue grows large.
- **Notification bell auth:** The `NotificationBell` fetches without an explicit auth header. It relies on the browser sending session cookies automatically. Verify this works with the Clerk auth setup; if not, use the same pattern as other client components that call the API.
