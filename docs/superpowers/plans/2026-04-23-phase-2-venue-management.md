# Phase 2: Venue Management — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the admin UI and API for managing Denver venues — including invite code generation, user access control, venue CRUD, and a full audit log — giving the admin everything needed to bootstrap Concert Crawl's data before the crawler runs.

**Architecture:** Hono API gains `/v1/admin/*` routes gated by `requireRole('admin')`. Next.js gains `/admin/*` pages rendered as React Server Components, fetching from the API. All mutating admin actions write to `audit_log`. Zod validates every request body. No client-side state management needed — Next.js server actions handle mutations directly.

**Tech Stack:** Hono 4, Next.js 15 (App Router, Server Actions), Drizzle ORM, Zod, Clerk (role from `publicMetadata`), shadcn/ui components, Tailwind CSS.

> **Note:** This is Phase 2 of 7. Phase 1 must be complete and deployed before starting. The DB schema, auth middleware, and shared packages from Phase 1 are assumed to be in place.

---

## File Map

```
concert-crawl/
├── apps/
│   ├── api/
│   │   └── src/
│   │       └── routes/
│   │           ├── index.ts                      # Modify: register admin routes
│   │           └── admin/
│   │               ├── index.ts                  # Admin route group — applies requireRole('admin')
│   │               ├── venues.ts                 # CRUD: GET/POST /v1/admin/venues, PATCH/DELETE /:id
│   │               └── invite-codes.ts           # GET/POST /v1/admin/invite-codes, POST /:id/revoke
│   └── web/
│       └── src/
│           ├── app/
│           │   └── (protected)/
│           │       └── admin/
│           │           ├── layout.tsx            # Admin shell — sidebar nav, requireRole('admin')
│           │           ├── page.tsx              # Admin dashboard — summary cards
│           │           ├── venues/
│           │           │   ├── page.tsx          # Venue list table
│           │           │   ├── new/page.tsx      # Add venue form
│           │           │   └── [id]/page.tsx     # Edit venue form
│           │           └── invite-codes/
│           │               └── page.tsx          # Invite code list + generate form
│           ├── components/
│           │   └── admin/
│           │       ├── venue-form.tsx            # Shared add/edit venue form (Server Action)
│           │       ├── venue-table.tsx           # Sortable venue list
│           │       ├── invite-code-table.tsx     # Invite code list with revoke button
│           │       └── generate-invite-form.tsx  # Generate invite code form
│           └── lib/
│               ├── api.ts                        # Typed fetch wrapper for the Hono API
│               └── actions/
│                   ├── venues.ts                 # Server Actions: createVenue, updateVenue, deleteVenue
│                   └── invite-codes.ts           # Server Actions: generateCode, revokeCode
└── packages/
    └── types/
        └── src/index.ts                          # Modify: add Venue, InviteCode, AuditEntry types
```

---

## Task 1: Extend Shared Types

**Files:**

- Modify: `packages/types/src/index.ts`
- Test: `packages/types/src/index.test.ts`

- [ ] **Step 1: Add the failing type tests**

Add to `packages/types/src/index.test.ts`:

```typescript
import type { Venue, NewVenue, InviteCode } from './index.js'

describe('venue and invite code types', () => {
  it('Venue has required fields', () => {
    expectTypeOf<Venue>().toMatchTypeOf<{
      id: string
      name: string
      slug: string
      websiteUrl: string
      city: string
      active: boolean
      verified: boolean
    }>()
  })

  it('InviteCode has revocation fields', () => {
    expectTypeOf<InviteCode>().toMatchTypeOf<{
      id: string
      code: string
      createdBy: string
      revokedAt: Date | null
      revokedBy: string | null
    }>()
  })
})
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd packages/types && pnpm exec vitest run
```

Expected: FAIL — `Venue`, `InviteCode` not exported from `./index.js`.

- [ ] **Step 3: Add types to `packages/types/src/index.ts`**

Append to the existing file:

```typescript
// Venue — mirrors the Drizzle inferred type from packages/db
export interface Venue {
  id: string
  name: string
  slug: string
  websiteUrl: string
  city: string
  active: boolean
  verified: boolean
  lastCrawledAt: Date | null
  crawlNotes: string | null
  crawlDelayMs: number
  robotsTxtAllowed: boolean | null
  consecutiveFailures: number
  blockedAt: Date | null
  extractionStrategy: 'structured_data' | 'llm' | 'manual' | null
  contactEmail: string | null
  createdAt: Date
  updatedAt: Date
}

export type NewVenue = Omit<
  Venue,
  'id' | 'createdAt' | 'updatedAt' | 'lastCrawledAt' | 'consecutiveFailures'
>

export interface InviteCode {
  id: string
  code: string
  createdBy: string
  usedBy: string | null
  usedAt: Date | null
  expiresAt: Date | null
  revokedAt: Date | null
  revokedBy: string | null
  createdAt: Date
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd packages/types && pnpm exec vitest run
```

Expected: PASS — all type tests pass.

- [ ] **Step 5: Build the types package**

```bash
cd packages/types && pnpm build
```

Expected: `dist/` directory created, no TypeScript errors.

- [ ] **Step 6: Commit**

```bash
git add packages/types/
git commit -m "feat: add Venue and InviteCode types to shared package"
```

---

## Task 2: API — Venue CRUD Routes

**Files:**

- Create: `apps/api/src/routes/admin/index.ts`
- Create: `apps/api/src/routes/admin/venues.ts`
- Modify: `apps/api/src/routes/index.ts`
- Test: `apps/api/src/routes/admin/venues.test.ts`

- [ ] **Step 1: Write failing venue API tests**

Create `apps/api/src/routes/admin/venues.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createApp } from '../../app.js'

// Mock Clerk auth — simulate admin user
const mockGetAuth = vi.fn()
vi.mock('@hono/clerk-auth', () => ({
  clerkMiddleware: () => async (_c: unknown, next: () => Promise<void>) =>
    next(),
  getAuth: () => mockGetAuth(),
}))

// Mock the database
vi.mock('@concert-crawl/db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnValue([]),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([
      {
        id: 'venue-1',
        name: 'Ogden Theatre',
        slug: 'ogden-theatre',
        websiteUrl: 'https://ogdentheatre.com',
        city: 'Denver',
        active: true,
        verified: false,
        consecutiveFailures: 0,
        crawlDelayMs: 3000,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
  },
  venues: {},
}))

function adminAuth() {
  mockGetAuth.mockReturnValue({
    userId: 'admin_123',
    sessionClaims: { publicMetadata: { role: 'admin' } },
  })
}

describe('Admin venue routes', () => {
  beforeEach(() => mockGetAuth.mockReset())

  it('GET /v1/admin/venues returns 401 for unauthenticated requests', async () => {
    mockGetAuth.mockReturnValue(null)
    const res = await createApp().request('/v1/admin/venues')
    expect(res.status).toBe(401)
  })

  it('GET /v1/admin/venues returns 403 for non-admin users', async () => {
    mockGetAuth.mockReturnValue({
      userId: 'user_123',
      sessionClaims: { publicMetadata: { role: 'user' } },
    })
    const res = await createApp().request('/v1/admin/venues')
    expect(res.status).toBe(403)
  })

  it('GET /v1/admin/venues returns 200 and array for admin', async () => {
    adminAuth()
    const res = await createApp().request('/v1/admin/venues')
    expect(res.status).toBe(200)
    const body = (await res.json()) as { success: boolean; data: unknown[] }
    expect(body.success).toBe(true)
    expect(Array.isArray(body.data)).toBe(true)
  })

  it('POST /v1/admin/venues returns 400 for missing required fields', async () => {
    adminAuth()
    const res = await createApp().request('/v1/admin/venues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Missing Fields' }), // no slug or websiteUrl
    })
    expect(res.status).toBe(400)
  })

  it('POST /v1/admin/venues creates a venue and returns 201', async () => {
    adminAuth()
    const res = await createApp().request('/v1/admin/venues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Ogden Theatre',
        slug: 'ogden-theatre',
        websiteUrl: 'https://ogdentheatre.com',
        city: 'Denver',
      }),
    })
    expect(res.status).toBe(201)
  })
})
```

- [ ] **Step 2: Run to verify they fail**

```bash
cd apps/api && pnpm exec vitest run src/routes/admin/venues.test.ts
```

Expected: FAIL — `Cannot find module '../../app.js'` or routes not found (404s).

- [ ] **Step 3: Create `apps/api/src/routes/admin/venues.ts`**

```typescript
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { db, venues } from '@concert-crawl/db'
import { eq } from 'drizzle-orm'
import { getAuth } from '@hono/clerk-auth'

const createVenueSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  websiteUrl: z.string().url(),
  city: z.string().default('Denver'),
  crawlDelayMs: z.number().int().min(1000).max(30000).default(3000),
  contactEmail: z.string().email().optional(),
  crawlNotes: z.string().optional(),
})

const updateVenueSchema = createVenueSchema.partial().extend({
  active: z.boolean().optional(),
  verified: z.boolean().optional(),
})

export const venuesAdminRouter = new Hono()

// GET /v1/admin/venues — list all venues
venuesAdminRouter.get('/', async (c) => {
  const allVenues = await db.select().from(venues).orderBy(venues.name)
  return c.json({ success: true, data: allVenues })
})

// GET /v1/admin/venues/:id — get single venue
venuesAdminRouter.get('/:id', async (c) => {
  const { id } = c.req.param()
  const [venue] = await db.select().from(venues).where(eq(venues.id, id))

  if (!venue) {
    return c.json({ success: false, error: 'Venue not found' }, 404)
  }

  return c.json({ success: true, data: venue })
})

// POST /v1/admin/venues — create venue
venuesAdminRouter.post(
  '/',
  zValidator('json', createVenueSchema),
  async (c) => {
    const body = c.req.valid('json')
    const auth = getAuth(c)

    const [venue] = await db.insert(venues).values(body).returning()

    // Audit log written by the admin route group middleware (see admin/index.ts)
    c.set('auditAction', 'venue.create')
    c.set('auditTargetId', venue!.id)
    c.set('auditActorId', auth!.userId)

    return c.json({ success: true, data: venue }, 201)
  },
)

// PATCH /v1/admin/venues/:id — update venue
venuesAdminRouter.patch(
  '/:id',
  zValidator('json', updateVenueSchema),
  async (c) => {
    const { id } = c.req.param()
    const body = c.req.valid('json')
    const auth = getAuth(c)

    const [existing] = await db.select().from(venues).where(eq(venues.id, id))
    if (!existing) {
      return c.json({ success: false, error: 'Venue not found' }, 404)
    }

    const [updated] = await db
      .update(venues)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(venues.id, id))
      .returning()

    c.set('auditAction', 'venue.update')
    c.set('auditTargetId', id)
    c.set('auditActorId', auth!.userId)

    return c.json({ success: true, data: updated })
  },
)

// DELETE /v1/admin/venues/:id — soft delete (set active = false)
venuesAdminRouter.delete('/:id', async (c) => {
  const { id } = c.req.param()
  const auth = getAuth(c)

  const [existing] = await db.select().from(venues).where(eq(venues.id, id))
  if (!existing) {
    return c.json({ success: false, error: 'Venue not found' }, 404)
  }

  await db
    .update(venues)
    .set({ active: false, updatedAt: new Date() })
    .where(eq(venues.id, id))

  c.set('auditAction', 'venue.deactivate')
  c.set('auditTargetId', id)
  c.set('auditActorId', auth!.userId)

  return c.json({ success: true })
})
```

- [ ] **Step 4: Create `apps/api/src/routes/admin/index.ts`**

```typescript
import { Hono } from 'hono'
import { requireRole } from '../../middleware/role.js'
import { clerkAuth } from '../../middleware/auth.js'
import { db, auditLog } from '@concert-crawl/db'
import { venuesAdminRouter } from './venues.js'
import { inviteCodesAdminRouter } from './invite-codes.js'

export const adminRouter = new Hono()

// All admin routes require Clerk auth + admin role
adminRouter.use('*', clerkAuth)
adminRouter.use('*', requireRole('admin'))

// Write audit log entry after each mutating request
adminRouter.use('*', async (c, next) => {
  await next()

  const action = c.get('auditAction') as string | undefined
  const targetId = c.get('auditTargetId') as string | undefined
  const actorId = c.get('auditActorId') as string | undefined

  if (action && actorId) {
    await db.insert(auditLog).values({
      actorId,
      action,
      targetId: targetId ?? null,
      metadata: null,
    })
  }
})

adminRouter.route('/venues', venuesAdminRouter)
adminRouter.route('/invite-codes', inviteCodesAdminRouter)
```

- [ ] **Step 5: Modify `apps/api/src/routes/index.ts`**

```typescript
import type { Hono } from 'hono'
import { healthRouter } from './health.js'
import { adminRouter } from './admin/index.js'

export function registerRoutes(app: Hono) {
  app.route('/v1/health', healthRouter)
  app.route('/v1/admin', adminRouter)
}
```

- [ ] **Step 6: Install `@hono/zod-validator`**

```bash
cd apps/api && pnpm add @hono/zod-validator
```

- [ ] **Step 7: Run tests to verify they pass**

```bash
cd apps/api && pnpm exec vitest run src/routes/admin/venues.test.ts
```

Expected: PASS — 5 tests pass.

- [ ] **Step 8: Commit**

```bash
git add apps/api/
git commit -m "feat: add admin venue CRUD routes with role guard and audit logging"
```

---

## Task 3: API — Invite Code Routes

**Files:**

- Create: `apps/api/src/routes/admin/invite-codes.ts`
- Test: `apps/api/src/routes/admin/invite-codes.test.ts`

- [ ] **Step 1: Write failing invite code tests**

Create `apps/api/src/routes/admin/invite-codes.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createApp } from '../../app.js'

const mockGetAuth = vi.fn()
vi.mock('@hono/clerk-auth', () => ({
  clerkMiddleware: () => async (_c: unknown, next: () => Promise<void>) =>
    next(),
  getAuth: () => mockGetAuth(),
}))

vi.mock('@concert-crawl/db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnValue([]),
    where: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([
      {
        id: 'code-1',
        code: 'BETA-ABCD',
        createdBy: 'admin_123',
        usedBy: null,
        usedAt: null,
        expiresAt: null,
        revokedAt: null,
        revokedBy: null,
        createdAt: new Date(),
      },
    ]),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
  },
  inviteCodes: {},
  auditLog: {},
}))

function adminAuth() {
  mockGetAuth.mockReturnValue({
    userId: 'admin_123',
    sessionClaims: { publicMetadata: { role: 'admin' } },
  })
}

describe('Admin invite code routes', () => {
  beforeEach(() => mockGetAuth.mockReset())

  it('GET /v1/admin/invite-codes returns 200 for admin', async () => {
    adminAuth()
    const res = await createApp().request('/v1/admin/invite-codes')
    expect(res.status).toBe(200)
  })

  it('POST /v1/admin/invite-codes generates a code and returns 201', async () => {
    adminAuth()
    const res = await createApp().request('/v1/admin/invite-codes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    expect(res.status).toBe(201)
    const body = (await res.json()) as {
      success: boolean
      data: { code: string }
    }
    expect(body.success).toBe(true)
    expect(typeof body.data.code).toBe('string')
  })

  it('POST /v1/admin/invite-codes/:id/revoke sets revokedAt and returns 200', async () => {
    adminAuth()
    const res = await createApp().request(
      '/v1/admin/invite-codes/code-1/revoke',
      {
        method: 'POST',
      },
    )
    expect(res.status).toBe(200)
  })
})
```

- [ ] **Step 2: Run to verify they fail**

```bash
cd apps/api && pnpm exec vitest run src/routes/admin/invite-codes.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create `apps/api/src/routes/admin/invite-codes.ts`**

```typescript
import { Hono } from 'hono'
import { db, inviteCodes } from '@concert-crawl/db'
import { eq } from 'drizzle-orm'
import { getAuth } from '@hono/clerk-auth'
import { randomBytes } from 'crypto'

function generateCode(): string {
  // Format: BETA-XXXX-XXXX (uppercase alphanumeric, URL-safe)
  const part = () => randomBytes(3).toString('hex').toUpperCase().slice(0, 4)
  return `BETA-${part()}-${part()}`
}

export const inviteCodesAdminRouter = new Hono()

// GET /v1/admin/invite-codes — list all codes
inviteCodesAdminRouter.get('/', async (c) => {
  const codes = await db
    .select()
    .from(inviteCodes)
    .orderBy(inviteCodes.createdAt)
  return c.json({ success: true, data: codes })
})

// POST /v1/admin/invite-codes — generate a new code
inviteCodesAdminRouter.post('/', async (c) => {
  const auth = getAuth(c)
  const body = await c.req.json<{ expiresAt?: string }>().catch(() => ({}))

  const [code] = await db
    .insert(inviteCodes)
    .values({
      code: generateCode(),
      createdBy: auth!.userId,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
    })
    .returning()

  c.set('auditAction', 'invite_code.create')
  c.set('auditTargetId', code!.id)
  c.set('auditActorId', auth!.userId)

  return c.json({ success: true, data: code }, 201)
})

// POST /v1/admin/invite-codes/:id/revoke — revoke a code
inviteCodesAdminRouter.post('/:id/revoke', async (c) => {
  const { id } = c.req.param()
  const auth = getAuth(c)

  const [existing] = await db
    .select()
    .from(inviteCodes)
    .where(eq(inviteCodes.id, id))
  if (!existing) {
    return c.json({ success: false, error: 'Invite code not found' }, 404)
  }
  if (existing.revokedAt) {
    return c.json({ success: false, error: 'Invite code already revoked' }, 400)
  }

  const [updated] = await db
    .update(inviteCodes)
    .set({ revokedAt: new Date(), revokedBy: auth!.userId })
    .where(eq(inviteCodes.id, id))
    .returning()

  c.set('auditAction', 'invite_code.revoke')
  c.set('auditTargetId', id)
  c.set('auditActorId', auth!.userId)

  return c.json({ success: true, data: updated })
})
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd apps/api && pnpm exec vitest run src/routes/admin/
```

Expected: PASS — all admin route tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/routes/admin/invite-codes.ts apps/api/src/routes/admin/invite-codes.test.ts
git commit -m "feat: add invite code generation and revocation routes"
```

---

## Task 4: Bruno — Admin API Collection

**Files:**

- Create: `apps/api/bruno/admin/list-venues.bru`
- Create: `apps/api/bruno/admin/create-venue.bru`
- Create: `apps/api/bruno/admin/generate-invite-code.bru`

- [ ] **Step 1: Create `apps/api/bruno/admin/list-venues.bru`**

```
meta {
  name: List Venues
  type: http
  seq: 1
}

get {
  url: {{baseUrl}}/v1/admin/venues
  body: none
  auth: bearer
}

auth:bearer {
  token: {{adminToken}}
}

assert {
  res.status: eq 200
  res.body.success: eq true
}
```

- [ ] **Step 2: Create `apps/api/bruno/admin/create-venue.bru`**

```
meta {
  name: Create Venue
  type: http
  seq: 2
}

post {
  url: {{baseUrl}}/v1/admin/venues
  body: json
  auth: bearer
}

auth:bearer {
  token: {{adminToken}}
}

body:json {
  {
    "name": "Test Venue",
    "slug": "test-venue",
    "websiteUrl": "https://testvenue.com",
    "city": "Denver"
  }
}

assert {
  res.status: eq 201
  res.body.success: eq true
  res.body.data.id: isDefined
}
```

- [ ] **Step 3: Create `apps/api/bruno/admin/generate-invite-code.bru`**

```
meta {
  name: Generate Invite Code
  type: http
  seq: 3
}

post {
  url: {{baseUrl}}/v1/admin/invite-codes
  body: json
  auth: bearer
}

auth:bearer {
  token: {{adminToken}}
}

body:json {
  {}
}

assert {
  res.status: eq 201
  res.body.data.code: isDefined
}
```

- [ ] **Step 4: Add `adminToken` to local Bruno environment**

Open `apps/api/bruno/environments/local.bru` and add:

```
vars {
  baseUrl: http://localhost:3001
  adminToken: <paste your Clerk dev session token here>
}
```

To get a Clerk session token: sign in to the local web app, open DevTools → Application → Cookies → look for `__session`, or use Clerk's dev dashboard.

- [ ] **Step 5: Start the API locally and run the Bruno collection**

```bash
cd apps/api && pnpm dev
```

Run all admin requests in Bruno. Expected: all assertions pass.

- [ ] **Step 6: Commit**

```bash
git add apps/api/bruno/
git commit -m "chore: add Bruno admin API collection entries"
```

---

## Task 5: Install shadcn/ui in the Web App

**Files:**

- Modify: `apps/web/package.json`
- Create: `apps/web/src/components/ui/` (generated by shadcn CLI)

- [ ] **Step 1: Initialize shadcn/ui**

```bash
cd apps/web && pnpm dlx shadcn@latest init
```

When prompted:

- Style: **Default**
- Base color: **Slate**
- CSS variables: **Yes**

Expected: `apps/web/src/components/ui/` directory created, `tailwind.config.ts` and `globals.css` updated.

- [ ] **Step 2: Add required components**

```bash
pnpm dlx shadcn@latest add button input label table badge card form
```

Expected: Component files created in `apps/web/src/components/ui/`.

- [ ] **Step 3: Verify the web app still builds**

```bash
cd apps/web && pnpm build
```

Expected: Build succeeds with no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/ui/ apps/web/tailwind.config.ts apps/web/src/app/globals.css apps/web/package.json apps/web/components.json
git commit -m "chore: initialize shadcn/ui with default components"
```

---

## Task 6: Typed API Client

**Files:**

- Create: `apps/web/src/lib/api.ts`
- Test: `apps/web/src/lib/api.test.ts`

- [ ] **Step 1: Write failing API client tests**

Create `apps/web/src/lib/api.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest'

global.fetch = vi.fn()

describe('apiClient', () => {
  beforeEach(() => vi.mocked(fetch).mockReset())

  it('GET request returns parsed JSON on success', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: [] }), {
        status: 200,
      }),
    )

    const { apiClient } = await import('./api.js')
    const result = await apiClient.get('/v1/admin/venues', 'test-token')
    expect(result).toEqual({ success: true, data: [] })
  })

  it('throws on non-ok response', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ success: false, error: 'Forbidden' }), {
        status: 403,
      }),
    )

    const { apiClient } = await import('./api.js')
    await expect(
      apiClient.get('/v1/admin/venues', 'test-token'),
    ).rejects.toThrow('Forbidden')
  })
})
```

- [ ] **Step 2: Run to verify they fail**

```bash
cd apps/web && pnpm exec vitest run src/lib/api.test.ts
```

Expected: FAIL — `Cannot find module './api.js'`.

- [ ] **Step 3: Create `apps/web/src/lib/api.ts`**

```typescript
const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001'

async function request<T>(
  path: string,
  token: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  })

  const body = (await res.json()) as {
    success: boolean
    data?: T
    error?: string
  }

  if (!res.ok || !body.success) {
    throw new Error(body.error ?? `Request failed with status ${res.status}`)
  }

  return body.data as T
}

export const apiClient = {
  get: <T>(path: string, token: string) => request<T>(path, token),

  post: <T>(path: string, token: string, data: unknown) =>
    request<T>(path, token, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  patch: <T>(path: string, token: string, data: unknown) =>
    request<T>(path, token, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: <T>(path: string, token: string) =>
    request<T>(path, token, { method: 'DELETE' }),
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd apps/web && pnpm exec vitest run src/lib/api.test.ts
```

Expected: PASS — 2 tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/api.ts apps/web/src/lib/api.test.ts
git commit -m "feat: add typed API client for Next.js web app"
```

---

## Task 7: Admin Layout + Dashboard

**Files:**

- Create: `apps/web/src/app/(protected)/admin/layout.tsx`
- Create: `apps/web/src/app/(protected)/admin/page.tsx`
- Modify: `apps/web/src/lib/auth.ts` — add `requireAdminUser()` helper

- [ ] **Step 1: Add `requireAdminUser` to `apps/web/src/lib/auth.ts`**

Append to the existing file:

```typescript
// Convenience wrapper — redirects to / if user is not an admin
export async function requireAdminUser(): Promise<AuthUser> {
  return requireRole('admin')
}
```

- [ ] **Step 2: Create `apps/web/src/app/(protected)/admin/layout.tsx`**

```tsx
import { requireAdminUser } from '@/lib/auth'
import Link from 'next/link'

const navItems = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/venues', label: 'Venues' },
  { href: '/admin/invite-codes', label: 'Invite Codes' },
]

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireAdminUser()

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 border-r bg-slate-50 p-4 dark:bg-slate-900">
        <p className="mb-6 text-sm font-semibold uppercase tracking-wider text-slate-500">
          Admin
        </p>
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  )
}
```

- [ ] **Step 3: Create `apps/web/src/app/(protected)/admin/page.tsx`**

```tsx
import { auth } from '@clerk/nextjs/server'
import { requireAdminUser } from '@/lib/auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function AdminDashboardPage() {
  const user = await requireAdminUser()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-slate-500">
          Welcome back, {user.firstName ?? user.email}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-500">
              Venues
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">—</p>
            <p className="text-xs text-slate-400">
              Populated after venue setup
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-500">
              Invite Codes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">—</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-500">
              Last Crawl
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">—</p>
            <p className="text-xs text-slate-400">Crawler live in Phase 3</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Start the dev server and verify admin layout renders**

```bash
pnpm dev
```

Navigate to `http://localhost:3000/admin`. Expected: sidebar renders, dashboard shows three summary cards.

If you are not assigned the `admin` role in Clerk yet: go to your Clerk dev dashboard → Users → select your user → Metadata → Public → set `{ "role": "admin" }`.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/\(protected\)/admin/ apps/web/src/lib/auth.ts
git commit -m "feat: add admin layout with sidebar nav and dashboard page"
```

---

## Task 8: Venue Management UI

**Files:**

- Create: `apps/web/src/components/admin/venue-table.tsx`
- Create: `apps/web/src/components/admin/venue-form.tsx`
- Create: `apps/web/src/lib/actions/venues.ts`
- Create: `apps/web/src/app/(protected)/admin/venues/page.tsx`
- Create: `apps/web/src/app/(protected)/admin/venues/new/page.tsx`
- Create: `apps/web/src/app/(protected)/admin/venues/[id]/page.tsx`

- [ ] **Step 1: Create Server Actions for venues**

Create `apps/web/src/lib/actions/venues.ts`:

```typescript
'use server'

import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { apiClient } from '@/lib/api'
import type { Venue } from '@concert-crawl/types'

async function getToken(): Promise<string> {
  const { getToken } = await auth()
  const token = await getToken()
  if (!token) throw new Error('Not authenticated')
  return token
}

export async function createVenue(formData: FormData): Promise<void> {
  const token = await getToken()

  await apiClient.post<Venue>('/v1/admin/venues', token, {
    name: formData.get('name'),
    slug: formData.get('slug'),
    websiteUrl: formData.get('websiteUrl'),
    city: formData.get('city') || 'Denver',
    crawlNotes: formData.get('crawlNotes') || undefined,
    contactEmail: formData.get('contactEmail') || undefined,
  })

  revalidatePath('/admin/venues')
  redirect('/admin/venues')
}

export async function updateVenue(
  id: string,
  formData: FormData,
): Promise<void> {
  const token = await getToken()

  await apiClient.patch<Venue>(`/v1/admin/venues/${id}`, token, {
    name: formData.get('name'),
    slug: formData.get('slug'),
    websiteUrl: formData.get('websiteUrl'),
    city: formData.get('city') || 'Denver',
    active: formData.get('active') === 'true',
    verified: formData.get('verified') === 'true',
    crawlNotes: formData.get('crawlNotes') || undefined,
    contactEmail: formData.get('contactEmail') || undefined,
  })

  revalidatePath('/admin/venues')
  redirect('/admin/venues')
}

export async function deactivateVenue(id: string): Promise<void> {
  const token = await getToken()
  await apiClient.delete(`/v1/admin/venues/${id}`, token)
  revalidatePath('/admin/venues')
}
```

- [ ] **Step 2: Create `apps/web/src/components/admin/venue-table.tsx`**

```tsx
import type { Venue } from '@concert-crawl/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import Link from 'next/link'
import { deactivateVenue } from '@/lib/actions/venues'

interface VenueTableProps {
  venues: Venue[]
}

export function VenueTable({ venues }: VenueTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>City</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Verified</TableHead>
          <TableHead>Last Crawled</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {venues.map((venue) => (
          <TableRow key={venue.id}>
            <TableCell className="font-medium">
              <Link
                href={`/admin/venues/${venue.id}`}
                className="hover:underline"
              >
                {venue.name}
              </Link>
            </TableCell>
            <TableCell>{venue.city}</TableCell>
            <TableCell>
              <Badge variant={venue.active ? 'default' : 'secondary'}>
                {venue.active ? 'Active' : 'Inactive'}
              </Badge>
            </TableCell>
            <TableCell>
              <Badge variant={venue.verified ? 'default' : 'outline'}>
                {venue.verified ? 'Verified' : 'Unverified'}
              </Badge>
            </TableCell>
            <TableCell className="text-slate-400 text-sm">
              {venue.lastCrawledAt
                ? new Date(venue.lastCrawledAt).toLocaleDateString()
                : 'Never'}
            </TableCell>
            <TableCell>
              <form action={deactivateVenue.bind(null, venue.id)}>
                <Button
                  variant="ghost"
                  size="sm"
                  type="submit"
                  disabled={!venue.active}
                >
                  Deactivate
                </Button>
              </form>
            </TableCell>
          </TableRow>
        ))}
        {venues.length === 0 && (
          <TableRow>
            <TableCell colSpan={6} className="text-center text-slate-400">
              No venues yet. Add your first venue.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  )
}
```

- [ ] **Step 3: Create `apps/web/src/components/admin/venue-form.tsx`**

```tsx
'use client'

import { useFormStatus } from 'react-dom'
import type { Venue } from '@concert-crawl/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface VenueFormProps {
  venue?: Venue
  action: (formData: FormData) => Promise<void>
}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Saving…' : 'Save Venue'}
    </Button>
  )
}

export function VenueForm({ venue, action }: VenueFormProps) {
  return (
    <form action={action} className="space-y-4 max-w-lg">
      <div className="space-y-1">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" defaultValue={venue?.name} required />
      </div>

      <div className="space-y-1">
        <Label htmlFor="slug">Slug</Label>
        <Input
          id="slug"
          name="slug"
          defaultValue={venue?.slug}
          pattern="^[a-z0-9-]+$"
          title="Lowercase alphanumeric and hyphens only"
          required
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="websiteUrl">Website URL</Label>
        <Input
          id="websiteUrl"
          name="websiteUrl"
          type="url"
          defaultValue={venue?.websiteUrl}
          required
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="city">City</Label>
        <Input
          id="city"
          name="city"
          defaultValue={venue?.city ?? 'Denver'}
          required
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="contactEmail">Contact Email (optional)</Label>
        <Input
          id="contactEmail"
          name="contactEmail"
          type="email"
          defaultValue={venue?.contactEmail ?? ''}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="crawlNotes">Crawl Notes (optional)</Label>
        <Input
          id="crawlNotes"
          name="crawlNotes"
          defaultValue={venue?.crawlNotes ?? ''}
        />
      </div>

      {venue && (
        <>
          <input type="hidden" name="active" value={String(venue.active)} />
          <input type="hidden" name="verified" value={String(venue.verified)} />
        </>
      )}

      <SubmitButton />
    </form>
  )
}
```

- [ ] **Step 4: Create venues list page**

Create `apps/web/src/app/(protected)/admin/venues/page.tsx`:

```tsx
import { auth } from '@clerk/nextjs/server'
import { apiClient } from '@/lib/api'
import type { Venue } from '@concert-crawl/types'
import { VenueTable } from '@/components/admin/venue-table'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default async function VenuesPage() {
  const { getToken } = await auth()
  const token = await getToken()
  const venues = await apiClient.get<Venue[]>('/v1/admin/venues', token!)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Venues</h1>
        <Button asChild>
          <Link href="/admin/venues/new">Add Venue</Link>
        </Button>
      </div>
      <VenueTable venues={venues} />
    </div>
  )
}
```

- [ ] **Step 5: Create new venue page**

Create `apps/web/src/app/(protected)/admin/venues/new/page.tsx`:

```tsx
import { VenueForm } from '@/components/admin/venue-form'
import { createVenue } from '@/lib/actions/venues'

export default function NewVenuePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Add Venue</h1>
      <VenueForm action={createVenue} />
    </div>
  )
}
```

- [ ] **Step 6: Create edit venue page**

Create `apps/web/src/app/(protected)/admin/venues/[id]/page.tsx`:

```tsx
import { auth } from '@clerk/nextjs/server'
import { apiClient } from '@/lib/api'
import type { Venue } from '@concert-crawl/types'
import { VenueForm } from '@/components/admin/venue-form'
import { updateVenue } from '@/lib/actions/venues'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditVenuePage({ params }: Props) {
  const { id } = await params
  const { getToken } = await auth()
  const token = await getToken()

  let venue: Venue
  try {
    venue = await apiClient.get<Venue>(`/v1/admin/venues/${id}`, token!)
  } catch {
    notFound()
  }

  const action = updateVenue.bind(null, id)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Edit Venue — {venue.name}</h1>
      <VenueForm venue={venue} action={action} />
    </div>
  )
}
```

- [ ] **Step 7: Verify end-to-end in browser**

With both `pnpm dev` running for API and web:

1. Navigate to `http://localhost:3000/admin/venues`
2. Expected: empty table with "Add your first venue" message
3. Click "Add Venue" → fill in Red Rocks details → submit
4. Expected: redirected to venues list, Red Rocks appears in table
5. Click venue name → edit form loads with existing values
6. Change crawl notes → save → redirected back to list

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/components/admin/ apps/web/src/lib/actions/ apps/web/src/app/\(protected\)/admin/venues/
git commit -m "feat: add venue management UI with list, create, and edit pages"
```

---

## Task 9: Invite Code UI

**Files:**

- Create: `apps/web/src/components/admin/invite-code-table.tsx`
- Create: `apps/web/src/components/admin/generate-invite-form.tsx`
- Create: `apps/web/src/lib/actions/invite-codes.ts`
- Create: `apps/web/src/app/(protected)/admin/invite-codes/page.tsx`

- [ ] **Step 1: Create Server Actions for invite codes**

Create `apps/web/src/lib/actions/invite-codes.ts`:

```typescript
'use server'

import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { apiClient } from '@/lib/api'
import type { InviteCode } from '@concert-crawl/types'

async function getToken(): Promise<string> {
  const { getToken } = await auth()
  const token = await getToken()
  if (!token) throw new Error('Not authenticated')
  return token
}

export async function generateInviteCode(formData: FormData): Promise<void> {
  const token = await getToken()
  const expiresAt = formData.get('expiresAt') as string | null

  await apiClient.post<InviteCode>('/v1/admin/invite-codes', token, {
    expiresAt: expiresAt || undefined,
  })

  revalidatePath('/admin/invite-codes')
}

export async function revokeInviteCode(id: string): Promise<void> {
  const token = await getToken()
  await apiClient.post(`/v1/admin/invite-codes/${id}/revoke`, token, {})
  revalidatePath('/admin/invite-codes')
}
```

- [ ] **Step 2: Create `apps/web/src/components/admin/invite-code-table.tsx`**

```tsx
import type { InviteCode } from '@concert-crawl/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { revokeInviteCode } from '@/lib/actions/invite-codes'

function codeStatus(code: InviteCode): {
  label: string
  variant: 'default' | 'secondary' | 'destructive' | 'outline'
} {
  if (code.revokedAt) return { label: 'Revoked', variant: 'destructive' }
  if (code.usedAt) return { label: 'Used', variant: 'secondary' }
  if (code.expiresAt && new Date(code.expiresAt) < new Date())
    return { label: 'Expired', variant: 'outline' }
  return { label: 'Active', variant: 'default' }
}

export function InviteCodeTable({ codes }: { codes: InviteCode[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Code</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Used By</TableHead>
          <TableHead>Expires</TableHead>
          <TableHead>Created</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {codes.map((code) => {
          const status = codeStatus(code)
          return (
            <TableRow key={code.id}>
              <TableCell className="font-mono text-sm">{code.code}</TableCell>
              <TableCell>
                <Badge variant={status.variant}>{status.label}</Badge>
              </TableCell>
              <TableCell className="text-slate-400 text-sm">
                {code.usedBy ?? '—'}
              </TableCell>
              <TableCell className="text-slate-400 text-sm">
                {code.expiresAt
                  ? new Date(code.expiresAt).toLocaleDateString()
                  : 'Never'}
              </TableCell>
              <TableCell className="text-slate-400 text-sm">
                {new Date(code.createdAt).toLocaleDateString()}
              </TableCell>
              <TableCell>
                {!code.revokedAt && !code.usedAt && (
                  <form action={revokeInviteCode.bind(null, code.id)}>
                    <Button variant="ghost" size="sm" type="submit">
                      Revoke
                    </Button>
                  </form>
                )}
              </TableCell>
            </TableRow>
          )
        })}
        {codes.length === 0 && (
          <TableRow>
            <TableCell colSpan={6} className="text-center text-slate-400">
              No invite codes yet.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  )
}
```

- [ ] **Step 3: Create `apps/web/src/components/admin/generate-invite-form.tsx`**

```tsx
'use client'

import { useFormStatus } from 'react-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { generateInviteCode } from '@/lib/actions/invite-codes'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Generating…' : 'Generate Code'}
    </Button>
  )
}

export function GenerateInviteForm() {
  return (
    <form action={generateInviteCode} className="flex items-end gap-4">
      <div className="space-y-1">
        <Label htmlFor="expiresAt">Expires (optional)</Label>
        <Input id="expiresAt" name="expiresAt" type="date" />
      </div>
      <SubmitButton />
    </form>
  )
}
```

- [ ] **Step 4: Create invite codes page**

Create `apps/web/src/app/(protected)/admin/invite-codes/page.tsx`:

```tsx
import { auth } from '@clerk/nextjs/server'
import { apiClient } from '@/lib/api'
import type { InviteCode } from '@concert-crawl/types'
import { InviteCodeTable } from '@/components/admin/invite-code-table'
import { GenerateInviteForm } from '@/components/admin/generate-invite-form'

export default async function InviteCodesPage() {
  const { getToken } = await auth()
  const token = await getToken()
  const codes = await apiClient.get<InviteCode[]>(
    '/v1/admin/invite-codes',
    token!,
  )

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Invite Codes</h1>
        <p className="text-slate-500 text-sm mt-1">
          Generate codes to grant beta access. Codes are single-use.
        </p>
      </div>
      <GenerateInviteForm />
      <InviteCodeTable codes={codes} />
    </div>
  )
}
```

- [ ] **Step 5: Verify end-to-end in browser**

1. Navigate to `http://localhost:3000/admin/invite-codes`
2. Click "Generate Code" — code appears in table with "Active" badge
3. Click "Revoke" on the code — badge changes to "Revoked", revoke button disappears

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/admin/invite-code-table.tsx apps/web/src/components/admin/generate-invite-form.tsx apps/web/src/lib/actions/invite-codes.ts apps/web/src/app/\(protected\)/admin/invite-codes/
git commit -m "feat: add invite code management UI with generate and revoke"
```

---

## Phase 2 Complete ✓

**Milestone verification checklist:**

- [ ] `pnpm test` — all tests pass (types + API unit tests)
- [ ] `pnpm typecheck` — no type errors
- [ ] Admin can navigate to `/admin` and see dashboard
- [ ] Admin can add a Denver venue via the UI — appears in table
- [ ] Admin can edit a venue — changes persist
- [ ] Admin can deactivate a venue — badge updates
- [ ] Admin can generate an invite code — appears in table
- [ ] Admin can revoke an invite code — status updates
- [ ] All admin actions appear in `audit_log` table (verify via `psql`)
- [ ] Non-admin users redirected away from `/admin/*`
- [ ] CI pipeline passes on PR to `main`

**Verify audit log:**

```bash
docker exec -it concert-crawl-db psql -U postgres -d concert_crawl \
  -c "SELECT actor_id, action, target_id, created_at FROM audit_log ORDER BY created_at DESC LIMIT 10;"
```

Expected: rows for `venue.create`, `invite_code.create`, etc.

**Next:** Phase 3 — Crawler v1 (Playwright + Claude Haiku extraction, crawl runs, cost tracking)
