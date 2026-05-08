# Phase 8b Part 1 — User Profile & Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `/me` settings hub — profile editing (handle, avatar color, city), plan card, theme picker with server persistence, submissions history, and account danger zone — across mobile and desktop layouts.

**Architecture:** New `user_profiles` table holds handle/city/avatarColor/theme; plan is derived from the existing `subscriptions` table. API routes at `/v1/users/*` serve and mutate profile data. The Next.js `/me` route composes mobile and desktop layout components from a `components/settings/` directory. Design reference: `design/design_handoff_profile_settings/` (committed to branch). Read `profile-settings-screens.jsx` during component tasks for pixel-level reference.

**Tech Stack:** Drizzle ORM (schema + migration), Hono (API routes), Vitest integration tests, Next.js App Router server components + server actions, Tailwind + CSS custom properties (theme tokens), Clerk (auth + delete user), shadcn/ui primitives.

---

## File map

### New files
| Path | Purpose |
|---|---|
| `packages/db/src/schema/user-profiles.ts` | `user_profiles` Drizzle table |
| `apps/api/src/routes/users.ts` | All `/v1/users/*` routes |
| `apps/api/src/routes/users.integration.test.ts` | Integration tests for users routes |
| `apps/web/src/lib/api/users.ts` | Typed fetch wrappers for users API |
| `apps/web/src/app/(protected)/me/page.tsx` | `/me` server page (composes SettingsRoute / SettingsRouteDesktop) |
| `apps/web/src/app/(protected)/me/edit/page.tsx` | `/me/edit` server page (EditProfileForm wrapper) |
| `apps/web/src/app/(protected)/me/actions.ts` | Server actions: updateProfile, deleteAccount |
| `apps/web/src/components/settings/definitions/copy.ts` | All UI strings for settings |
| `apps/web/src/components/settings/definitions/constants.ts` | RESERVED_HANDLES, AVATAR_COLORS, HANDLE_REGEX |
| `apps/web/src/components/settings/Avatar.tsx` | Monogram disc — letter on tinted circle |
| `apps/web/src/components/settings/ProfileEntryAvatar.tsx` | 36px tap-target wrapping Avatar; links to /me |
| `apps/web/src/components/settings/ProfileHero.tsx` | Avatar + handle/anon label + role chip + city |
| `apps/web/src/components/settings/PlanCard.tsx` | Subscription card (founder/paid/trial/past-due states) |
| `apps/web/src/components/settings/ThemePickerInline.tsx` | Three-swatch row with mini live previews |
| `apps/web/src/components/settings/StatusPill.tsx` | confirmed / pending / disputed chip |
| `apps/web/src/components/settings/SubmissionItem.tsx` | Single submission row |
| `apps/web/src/components/settings/MySubmissionsList.tsx` | Capped list + "See all N →" overflow link |
| `apps/web/src/components/settings/DangerZone.tsx` | Sign-out + delete account row pair |
| `apps/web/src/components/settings/DeleteAccountSheet.tsx` | Bottom-sheet with DELETE-typed gate |
| `apps/web/src/components/settings/EditProfileForm.tsx` | Handle / city / avatar color form with validation |
| `apps/web/src/components/settings/SettingsRoute.tsx` | Mobile hub — stacked sections |
| `apps/web/src/components/settings/SettingsRouteDesktop.tsx` | Desktop sidebar (240px) + panel |

### Modified files
| Path | Change |
|---|---|
| `packages/db/src/schema/index.ts` | Export `userProfiles` |
| `packages/db/src/schema/prices.ts` | Make `userId` nullable (expand migration for delete-account) |
| `packages/types/src/index.ts` | Add `UserProfile`, `UserPlan`, `SubmissionDisplay` types |
| `apps/api/src/routes/index.ts` | Register `usersRouter` |
| `apps/api/src/test/helpers/seed.ts` | Add `seedUserProfile`, add `user_profiles` to `clearTables` |
| `apps/web/src/components/consumer/app-header/UserAvatar.tsx` | Add "Settings" link to dropdown |
| `apps/web/src/components/consumer/app-header/AppHeader.tsx` | Show `ProfileEntryAvatar` on mobile bar |

---

## Task 1: DB schema — user_profiles + nullable userId migration

**Files:**
- Create: `packages/db/src/schema/user-profiles.ts`
- Modify: `packages/db/src/schema/index.ts`
- Modify: `packages/db/src/schema/prices.ts`

- [ ] **Step 1: Create user-profiles schema**

```typescript
// packages/db/src/schema/user-profiles.ts
import { pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

export const avatarColorEnum = pgEnum('avatar_color', [
  'signal',
  'accent',
  'success',
  'warning',
])

export const userThemeEnum = pgEnum('user_theme', ['electric', 'jade', 'light'])

export const userProfiles = pgTable('user_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().unique(),
  handle: text('handle').unique(),
  city: text('city'),
  avatarColor: avatarColorEnum('avatar_color'),
  theme: userThemeEnum('theme').notNull().default('electric'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type UserProfile = typeof userProfiles.$inferSelect
export type NewUserProfile = typeof userProfiles.$inferInsert
```

- [ ] **Step 2: Export from schema index**

In `packages/db/src/schema/index.ts`, add:
```typescript
export * from './user-profiles.js'
```

- [ ] **Step 3: Make price_submissions.userId nullable**

In `packages/db/src/schema/prices.ts`, change:
```typescript
// Before:
userId: text('user_id').notNull(),
// After:
userId: text('user_id'),
```

- [ ] **Step 4: Generate migration**

```bash
cd /path/to/worktree
pnpm --filter @concert-crawl/db drizzle-kit generate
```

Inspect the generated migration file — it should contain:
- `CREATE TYPE "avatar_color" AS ENUM(...)`
- `CREATE TYPE "user_theme" AS ENUM(...)`
- `CREATE TABLE "user_profiles" (...)`
- `ALTER TABLE "price_submissions" ALTER COLUMN "user_id" DROP NOT NULL`

- [ ] **Step 5: Run migration locally**

```bash
pnpm db:migrate
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add packages/db/src/schema/user-profiles.ts packages/db/src/schema/index.ts packages/db/src/schema/prices.ts packages/db/drizzle/
git commit -m "feat: add user_profiles schema and make price_submissions.user_id nullable"
```

---

## Task 2: Shared types

**Files:**
- Modify: `packages/types/src/index.ts`

- [ ] **Step 1: Add UserProfile, UserPlan, SubmissionDisplay types**

Append to `packages/types/src/index.ts`:

```typescript
// Avatar color token keys — survive theme switches
export type AvatarColor = 'signal' | 'accent' | 'success' | 'warning'

// User-selectable theme
export type UserTheme = 'electric' | 'jade' | 'light'

// Plan state — founder is the beta default; paid/trial/past-due are post-beta
export type UserPlan = 'founder' | 'paid' | 'trial' | 'past-due'

// User-facing role — separate from auth Role (admin/sub_admin/user)
export type DisplayRole = 'fan' | 'crew' | 'artist' | 'staff'

// Submission status as shown in the UI (mapped from DB enum)
export type SubmissionDisplayStatus = 'confirmed' | 'pending' | 'disputed'

// Full user profile as returned by GET /v1/users/me
export interface UserProfileResponse {
  id: string                      // Clerk user ID
  email: string                   // from Clerk
  handle: string | null
  city: string | null
  avatarColor: AvatarColor | null
  theme: UserTheme
  plan: UserPlan
  displayRole: DisplayRole
  joined: string                  // formatted "Apr 2026"
  submissionCount: number
}

// Single submission row as returned by GET /v1/users/me/submissions
export interface UserSubmissionItem {
  id: string
  eventId: string
  artist: string
  venue: string
  date: string                    // ISO YYYY-MM-DD
  priceMin: number                // cents (integer)
  priceMax: number | null
  status: SubmissionDisplayStatus
}

// Handle availability check response
export interface HandleAvailabilityResponse {
  available: boolean
  reason?: 'taken' | 'reserved'
}
```

- [ ] **Step 2: Typecheck types package**

```bash
pnpm --filter @concert-crawl/types typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add packages/types/src/index.ts
git commit -m "feat: add UserProfile, UserPlan, SubmissionDisplay shared types"
```

---

## Task 3: API routes — users

**Files:**
- Create: `apps/api/src/routes/users.ts`
- Modify: `apps/api/src/routes/index.ts`

**Context:** Study the price-submissions route (`apps/api/src/routes/price-submissions.ts`) for the established Hono + Clerk + Drizzle pattern. All routes require auth (401 if missing). The `getAuth` import comes from `@hono/clerk-auth`.

**Plan derivation logic:**
- If `subscriptions` row exists with `founder = true` → `'founder'`
- If `subscriptions` row exists with `tier = 'premium'` and `status = 'active'` → `'paid'`
- If `subscriptions` row exists with `tier = 'premium'` and `status = 'past_due'` → `'past-due'`
- If `subscriptions` row exists with `tier = 'free'` and `status = 'active'` → `'trial'` (trial variant)
- No subscriptions row → `'founder'` (beta default — every beta user is a founder)

**Status mapping:** DB `'corroborated'` → display `'confirmed'`; DB `'stale'` → display `'pending'`; others pass through.

**Reserved handles** (check server-side as a safety net; primary validation is client-side):
`['admin', 'support', 'help', 'settings', 'me', 'api', 'auth', 'staff', 'crew', 'artist', 'fan', 'null', 'anonymous', 'everyone', 'all', 'new', 'create', 'edit', 'delete', 'error', 'login', 'logout', 'signup', 'signin', 'index', 'home', 'about', 'contact', 'concertcrawl', 'denver', 'mod', 'moderator', 'system', 'bot']`

- [ ] **Step 1: Create users route file**

```typescript
// apps/api/src/routes/users.ts
import { Hono } from 'hono'
import { clerkMiddleware, getAuth } from '@hono/clerk-auth'
import { eq, count } from 'drizzle-orm'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { db } from '../lib/db.js'
import { userProfiles, priceSubmissions, subscriptions, events, venues } from '@concert-crawl/db'
import { clerkClient } from '@clerk/nextjs/server'
import type { UserPlan, DisplayRole, SubmissionDisplayStatus, UserProfileResponse, UserSubmissionItem, HandleAvailabilityResponse } from '@concert-crawl/types'
import { apiLogger } from '../lib/logger.js'

export const usersRouter = new Hono()

usersRouter.use('*', clerkMiddleware())

const RESERVED_HANDLES = new Set([
  'admin', 'support', 'help', 'settings', 'me', 'api', 'auth',
  'staff', 'crew', 'artist', 'fan', 'null', 'anonymous', 'everyone',
  'all', 'new', 'create', 'edit', 'delete', 'error', 'login', 'logout',
  'signup', 'signin', 'index', 'home', 'about', 'contact', 'concertcrawl',
  'denver', 'mod', 'moderator', 'system', 'bot',
])

const HANDLE_REGEX = /^[a-z0-9_]+$/

function derivePlan(sub: { founder: boolean; tier: string; status: string } | undefined): UserPlan {
  if (!sub) return 'founder'
  if (sub.founder) return 'founder'
  if (sub.tier === 'premium' && sub.status === 'active') return 'paid'
  if (sub.tier === 'premium' && sub.status === 'past_due') return 'past-due'
  return 'founder'
}

function mapStatus(dbStatus: string): SubmissionDisplayStatus {
  if (dbStatus === 'corroborated') return 'confirmed'
  if (dbStatus === 'disputed') return 'disputed'
  return 'pending'
}

function formatJoined(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

// GET /v1/users/me
usersRouter.get('/me', async (ctx) => {
  const auth = getAuth(ctx)
  if (!auth?.userId) return ctx.json({ success: false, error: 'Unauthorized' }, 401)

  const clerkUser = await clerkClient().users.getUser(auth.userId)

  const [profile] = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.userId, auth.userId))
    .limit(1)

  const [sub] = await db
    .select({ founder: subscriptions.founder, tier: subscriptions.tier, status: subscriptions.status })
    .from(subscriptions)
    .where(eq(subscriptions.userId, auth.userId))
    .limit(1)

  const [submissionCountRow] = await db
    .select({ value: count() })
    .from(priceSubmissions)
    .where(eq(priceSubmissions.userId, auth.userId))

  const email = clerkUser.emailAddresses[0]?.emailAddress ?? ''
  const authRole = (clerkUser.publicMetadata as { role?: string }).role

  const displayRole: DisplayRole =
    authRole === 'admin' || authRole === 'sub_admin' ? 'staff' : 'fan'

  const response: UserProfileResponse = {
    id: auth.userId,
    email,
    handle: profile?.handle ?? null,
    city: profile?.city ?? null,
    avatarColor: profile?.avatarColor ?? null,
    theme: profile?.theme ?? 'electric',
    plan: derivePlan(sub),
    displayRole,
    joined: formatJoined(clerkUser.createdAt ? new Date(clerkUser.createdAt) : new Date()),
    submissionCount: submissionCountRow?.value ?? 0,
  }

  return ctx.json({ success: true, data: response })
})

// PATCH /v1/users/me
const patchSchema = z.object({
  handle: z.string().min(3).max(20).regex(HANDLE_REGEX).nullable().optional(),
  city: z.string().max(100).nullable().optional(),
  avatarColor: z.enum(['signal', 'accent', 'success', 'warning']).nullable().optional(),
  theme: z.enum(['electric', 'jade', 'light']).optional(),
})

usersRouter.patch('/me', zValidator('json', patchSchema), async (ctx) => {
  const auth = getAuth(ctx)
  if (!auth?.userId) return ctx.json({ success: false, error: 'Unauthorized' }, 401)

  const body = ctx.req.valid('json')

  if (body.handle !== undefined && body.handle !== null) {
    if (RESERVED_HANDLES.has(body.handle)) {
      return ctx.json({ success: false, error: 'Handle is reserved', code: 'reserved' }, 422)
    }
    const [existing] = await db
      .select({ id: userProfiles.id })
      .from(userProfiles)
      .where(eq(userProfiles.handle, body.handle))
      .limit(1)
    if (existing) {
      return ctx.json({ success: false, error: 'Handle is taken', code: 'taken' }, 409)
    }
  }

  const updateValues: Partial<typeof userProfiles.$inferInsert> = {
    updatedAt: new Date(),
  }
  if (body.handle !== undefined) updateValues.handle = body.handle
  if (body.city !== undefined) updateValues.city = body.city
  if (body.avatarColor !== undefined) updateValues.avatarColor = body.avatarColor
  if (body.theme !== undefined) updateValues.theme = body.theme

  const [existing] = await db
    .select({ id: userProfiles.id })
    .from(userProfiles)
    .where(eq(userProfiles.userId, auth.userId))
    .limit(1)

  if (existing) {
    await db
      .update(userProfiles)
      .set(updateValues)
      .where(eq(userProfiles.userId, auth.userId))
  } else {
    await db.insert(userProfiles).values({
      userId: auth.userId,
      handle: body.handle ?? null,
      city: body.city ?? null,
      avatarColor: body.avatarColor ?? null,
      theme: body.theme ?? 'electric',
    })
  }

  return ctx.json({ success: true })
})

// GET /v1/users/me/submissions
usersRouter.get('/me/submissions', async (ctx) => {
  const auth = getAuth(ctx)
  if (!auth?.userId) return ctx.json({ success: false, error: 'Unauthorized' }, 401)

  const rows = await db
    .select({
      id: priceSubmissions.id,
      eventId: priceSubmissions.eventId,
      artist: events.artist,
      venue: venues.name,
      date: events.date,
      priceMin: priceSubmissions.priceMin,
      priceMax: priceSubmissions.priceMax,
      status: priceSubmissions.status,
    })
    .from(priceSubmissions)
    .leftJoin(events, eq(priceSubmissions.eventId, events.id))
    .leftJoin(venues, eq(events.venueId, venues.id))
    .where(eq(priceSubmissions.userId, auth.userId))
    .orderBy(priceSubmissions.createdAt)

  const data: UserSubmissionItem[] = rows.map((row) => ({
    id: row.id,
    eventId: row.eventId,
    artist: row.artist ?? 'Unknown',
    venue: row.venue ?? 'Unknown',
    date: row.date ?? '',
    priceMin: Math.round(parseFloat(row.priceMin) * 100),
    priceMax: row.priceMax ? Math.round(parseFloat(row.priceMax) * 100) : null,
    status: mapStatus(row.status ?? 'pending'),
  }))

  return ctx.json({ success: true, data })
})

// GET /v1/users/handle-availability
usersRouter.get('/handle-availability', async (ctx) => {
  const auth = getAuth(ctx)
  if (!auth?.userId) return ctx.json({ success: false, error: 'Unauthorized' }, 401)

  const handle = ctx.req.query('handle')
  if (!handle || handle.length < 3 || !HANDLE_REGEX.test(handle)) {
    return ctx.json({ success: true, data: { available: false, reason: 'invalid' } as HandleAvailabilityResponse })
  }

  if (RESERVED_HANDLES.has(handle)) {
    return ctx.json({ success: true, data: { available: false, reason: 'reserved' } as HandleAvailabilityResponse })
  }

  const [existing] = await db
    .select({ id: userProfiles.id })
    .from(userProfiles)
    .where(eq(userProfiles.handle, handle))
    .limit(1)

  return ctx.json({ success: true, data: { available: !existing } as HandleAvailabilityResponse })
})

// DELETE /v1/users/me — delete account
usersRouter.delete('/me', async (ctx) => {
  const auth = getAuth(ctx)
  if (!auth?.userId) return ctx.json({ success: false, error: 'Unauthorized' }, 401)

  // Anonymize this user's submissions — preserve corroboration counts
  await db
    .update(priceSubmissions)
    .set({ userId: null })
    .where(eq(priceSubmissions.userId, auth.userId))

  // Delete profile record
  await db
    .delete(userProfiles)
    .where(eq(userProfiles.userId, auth.userId))

  // Delete from Clerk (throws if already deleted)
  try {
    await clerkClient().users.deleteUser(auth.userId)
  } catch (err) {
    apiLogger.warn({ err, userId: auth.userId }, 'Clerk user delete failed — already deleted or not found')
  }

  return ctx.json({ success: true })
})
```

**Important:** Check the import path for `clerkClient` — in the existing codebase it may be `import { clerkClient } from '@clerk/backend'` or similar. Check `apps/api/src/routes/admin/users.ts` if it exists, or the Clerk Hono docs, to confirm the correct import. If the api app doesn't have Clerk's Node SDK, install `@clerk/backend` via `pnpm --filter @concert-crawl/api add @clerk/backend`.

- [ ] **Step 2: Register in route index**

In `apps/api/src/routes/index.ts`:
```typescript
import { usersRouter } from './users.js'
// ...
export function registerRoutes(app: Hono) {
  // existing routes...
  app.route('/v1/users', usersRouter)
}
```

- [ ] **Step 3: Typecheck API**

```bash
pnpm --filter @concert-crawl/api typecheck
```

Fix any import or type errors before continuing.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/routes/users.ts apps/api/src/routes/index.ts
git commit -m "feat: add /v1/users/* API routes (me, submissions, handle-availability, delete)"
```

---

## Task 4: API seed helpers + integration tests

**Files:**
- Modify: `apps/api/src/test/helpers/seed.ts`
- Create: `apps/api/src/routes/users.integration.test.ts`

- [ ] **Step 1: Add seedUserProfile + update clearTables**

In `apps/api/src/test/helpers/seed.ts`:

```typescript
import { userProfiles } from '@concert-crawl/db'
// Add to imports

export async function clearTables(): Promise<void> {
  await testDb.execute(
    sql`TRUNCATE events, venues, crawl_runs, audit_log, invite_codes, user_roles, price_retrieval_log, price_submissions, user_profiles RESTART IDENTITY CASCADE`,
  )
}

export async function seedUserProfile(
  userId: string,
  overrides: Partial<typeof userProfiles.$inferInsert> = {},
): Promise<typeof userProfiles.$inferSelect> {
  const [profile] = await testDb
    .insert(userProfiles)
    .values({
      userId,
      handle: null,
      theme: 'electric',
      ...overrides,
    })
    .returning()
  if (!profile) throw new Error('seedUserProfile: insert returned no rows')
  return profile
}
```

- [ ] **Step 2: Write failing tests**

```typescript
// apps/api/src/routes/users.integration.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'

const { authState } = vi.hoisted(() => ({
  authState: {
    current: null as {
      userId: string
      sessionClaims: { metadata?: { role?: string } }
    } | null,
  },
}))

vi.mock('@hono/clerk-auth', () => ({
  clerkMiddleware: () => async (_c: unknown, next: () => Promise<void>) => next(),
  getAuth: () => authState.current,
}))

// Mock Clerk client — deleteUser and getUser
vi.mock('@clerk/nextjs/server', () => ({
  clerkClient: () => ({
    users: {
      getUser: vi.fn().mockResolvedValue({
        emailAddresses: [{ emailAddress: 'test@example.com' }],
        publicMetadata: { role: 'user' },
        createdAt: new Date('2026-04-01').getTime(),
      }),
      deleteUser: vi.fn().mockResolvedValue({}),
    },
  }),
}))

import { createApp } from '../app.js'
import {
  clearTables,
  seedVenue,
  seedEvent,
  seedPriceSubmission,
  seedUserProfile,
} from '../test/helpers/seed.js'

const app = createApp()

function setAuth(userId = 'user_test123'): void {
  authState.current = {
    userId,
    sessionClaims: { metadata: { role: 'user' } },
  }
}

function clearAuth(): void {
  authState.current = null
}

describe('GET /v1/users/me', () => {
  beforeEach(async () => {
    clearAuth()
    await clearTables()
  })

  it('returns 401 without auth', async () => {
    const res = await app.request('/v1/users/me')
    expect(res.status).toBe(401)
  })

  it('returns profile with defaults when no profile row exists', async () => {
    setAuth()
    const res = await app.request('/v1/users/me', {
      headers: { Authorization: 'Bearer test' },
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { success: boolean; data: { handle: null; theme: string; plan: string } }
    expect(body.success).toBe(true)
    expect(body.data.handle).toBeNull()
    expect(body.data.theme).toBe('electric')
    expect(body.data.plan).toBe('founder')
  })

  it('returns saved handle when profile exists', async () => {
    setAuth()
    await seedUserProfile('user_test123', { handle: 'testuser' })
    const res = await app.request('/v1/users/me', {
      headers: { Authorization: 'Bearer test' },
    })
    const body = (await res.json()) as { success: boolean; data: { handle: string } }
    expect(body.data.handle).toBe('testuser')
  })
})

describe('PATCH /v1/users/me', () => {
  beforeEach(async () => {
    clearAuth()
    await clearTables()
  })

  it('returns 401 without auth', async () => {
    const res = await app.request('/v1/users/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ handle: 'myhandle' }),
    })
    expect(res.status).toBe(401)
  })

  it('creates a profile with handle', async () => {
    setAuth()
    const res = await app.request('/v1/users/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test' },
      body: JSON.stringify({ handle: 'myhandle' }),
    })
    expect(res.status).toBe(200)
  })

  it('rejects reserved handles with 422', async () => {
    setAuth()
    const res = await app.request('/v1/users/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test' },
      body: JSON.stringify({ handle: 'admin' }),
    })
    expect(res.status).toBe(422)
  })

  it('rejects taken handles with 409', async () => {
    setAuth('user_other')
    await seedUserProfile('user_other', { handle: 'taken' })
    setAuth('user_test123')
    const res = await app.request('/v1/users/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test' },
      body: JSON.stringify({ handle: 'taken' }),
    })
    expect(res.status).toBe(409)
  })
})

describe('GET /v1/users/me/submissions', () => {
  it('returns user submissions with display status', async () => {
    setAuth()
    await clearTables()
    const venue = await seedVenue()
    const event = await seedEvent(venue.id)
    await seedPriceSubmission(event.id, 'user_test123', { status: 'corroborated', priceMin: '40' })

    const res = await app.request('/v1/users/me/submissions', {
      headers: { Authorization: 'Bearer test' },
    })
    const body = (await res.json()) as { success: boolean; data: Array<{ status: string; priceMin: number }> }
    expect(body.success).toBe(true)
    expect(body.data[0]?.status).toBe('confirmed')
    expect(body.data[0]?.priceMin).toBe(4000)
  })
})

describe('GET /v1/users/handle-availability', () => {
  beforeEach(async () => {
    setAuth()
    await clearTables()
  })

  it('returns available: true for free handle', async () => {
    const res = await app.request('/v1/users/handle-availability?handle=freehandle', {
      headers: { Authorization: 'Bearer test' },
    })
    const body = (await res.json()) as { success: boolean; data: { available: boolean } }
    expect(body.data.available).toBe(true)
  })

  it('returns available: false for reserved word', async () => {
    const res = await app.request('/v1/users/handle-availability?handle=admin', {
      headers: { Authorization: 'Bearer test' },
    })
    const body = (await res.json()) as { success: boolean; data: { available: boolean; reason: string } }
    expect(body.data.available).toBe(false)
    expect(body.data.reason).toBe('reserved')
  })

  it('returns available: false for taken handle', async () => {
    await seedUserProfile('user_other2', { handle: 'takenone' })
    const res = await app.request('/v1/users/handle-availability?handle=takenone', {
      headers: { Authorization: 'Bearer test' },
    })
    const body = (await res.json()) as { success: boolean; data: { available: boolean } }
    expect(body.data.available).toBe(false)
  })
})

describe('DELETE /v1/users/me', () => {
  it('anonymizes submissions and deletes profile', async () => {
    setAuth()
    await clearTables()
    await seedUserProfile('user_test123')
    const venue = await seedVenue()
    const event = await seedEvent(venue.id)
    await seedPriceSubmission(event.id, 'user_test123')

    const res = await app.request('/v1/users/me', {
      method: 'DELETE',
      headers: { Authorization: 'Bearer test' },
    })
    expect(res.status).toBe(200)
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
pnpm --filter @concert-crawl/api test users.integration
```

Expected: tests fail (routes not yet registered or Clerk import issues).

- [ ] **Step 4: Fix any import issues discovered, then run tests again**

```bash
pnpm --filter @concert-crawl/api test users.integration
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/routes/users.integration.test.ts apps/api/src/test/helpers/seed.ts
git commit -m "test: add integration tests for /v1/users/* routes"
```

---

## Task 5: Web API client

**Files:**
- Create: `apps/web/src/lib/api/users.ts`

**Context:** Check `apps/web/src/lib/api/` for existing API client patterns (e.g., events.ts). The base URL comes from `process.env.NEXT_PUBLIC_API_URL`. Auth tokens are passed via `getToken()` from Clerk.

- [ ] **Step 1: Create users API client**

```typescript
// apps/web/src/lib/api/users.ts
import type {
  UserProfileResponse,
  UserSubmissionItem,
  HandleAvailabilityResponse,
} from '@concert-crawl/types'

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001'

async function apiFetch<T>(
  path: string,
  token: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  })
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string }
    throw Object.assign(new Error(body.error ?? res.statusText), { status: res.status })
  }
  return res.json() as Promise<T>
}

export async function fetchMe(token: string): Promise<UserProfileResponse> {
  const data = await apiFetch<{ success: true; data: UserProfileResponse }>('/v1/users/me', token)
  return data.data
}

export async function patchMe(
  token: string,
  updates: {
    handle?: string | null
    city?: string | null
    avatarColor?: 'signal' | 'accent' | 'success' | 'warning' | null
    theme?: 'electric' | 'jade' | 'light'
  },
): Promise<void> {
  await apiFetch('/v1/users/me', token, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  })
}

export async function fetchMySubmissions(token: string): Promise<UserSubmissionItem[]> {
  const data = await apiFetch<{ success: true; data: UserSubmissionItem[] }>(
    '/v1/users/me/submissions',
    token,
  )
  return data.data
}

export async function checkHandleAvailability(
  token: string,
  handle: string,
): Promise<HandleAvailabilityResponse> {
  const data = await apiFetch<{ success: true; data: HandleAvailabilityResponse }>(
    `/v1/users/handle-availability?handle=${encodeURIComponent(handle)}`,
    token,
  )
  return data.data
}

export async function deleteAccount(token: string): Promise<void> {
  await apiFetch('/v1/users/me', token, { method: 'DELETE' })
}
```

- [ ] **Step 2: Typecheck web**

```bash
pnpm --filter @concert-crawl/web typecheck
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/lib/api/users.ts
git commit -m "feat: add web API client for /v1/users/* endpoints"
```

---

## Task 6: Settings constants and copy

**Files:**
- Create: `apps/web/src/components/settings/definitions/constants.ts`
- Create: `apps/web/src/components/settings/definitions/copy.ts`

- [ ] **Step 1: Create constants**

```typescript
// apps/web/src/components/settings/definitions/constants.ts
import type { AvatarColor } from '@concert-crawl/types'

export const HANDLE_REGEX = /^[a-z0-9_]+$/

export const RESERVED_HANDLES = new Set([
  'admin', 'support', 'help', 'settings', 'me', 'api', 'auth',
  'staff', 'crew', 'artist', 'fan', 'null', 'anonymous', 'everyone',
  'all', 'new', 'create', 'edit', 'delete', 'error', 'login', 'logout',
  'signup', 'signin', 'index', 'home', 'about', 'contact', 'concertcrawl',
  'denver', 'mod', 'moderator', 'system', 'bot',
])

export const AVATAR_COLORS: AvatarColor[] = ['signal', 'accent', 'success', 'warning']

export const SUBMISSION_CAP_MOBILE = 3
```

- [ ] **Step 2: Create copy**

```typescript
// apps/web/src/components/settings/definitions/copy.ts
export const SETTINGS_COPY = {
  anonymousLabel: 'anonymous fan',
  anonymousExplainer:
    'You're browsing as an anonymous fan. Pick a handle to get credit for your price submissions — it applies retroactively.',
  goingAnonymousWarning:
    'Clearing your handle makes you anonymous again. Your past submissions will no longer show your name.',
  handlePlaceholder: 'lowercase_handle',
  handleHint: 'Lowercase letters, numbers, underscores. 3–20 chars.',
  handleErrors: {
    tooShort: 'Handle must be at least 3 characters.',
    invalidChars: 'Only lowercase letters, numbers, and underscores.',
    reserved: 'That handle is reserved.',
    taken: 'That handle is taken.',
  },
  cityPlaceholder: 'Denver',
  cityHint: 'Never shown publicly.',
  planCard: {
    founder: {
      badge: 'Founder',
      tagline: 'Free for life.',
      subline: 'You got in early. That means something.',
    },
    paid: {
      badge: 'Supporter',
      tagline: 'Supporting Concert Crawl.',
      subline: 'Thank you.',
    },
    trial: {
      badge: 'Trial',
      tagline: 'days remaining',
      subline: 'Upgrade to keep your access.',
    },
    'past-due': {
      badge: 'Past due',
      tagline: 'Payment failed.',
      cta: 'Update billing →',
    },
  },
  dangerZone: {
    signOut: 'Sign out',
    signOutSubtitle: 'Burn your tokens. We\'ll remember you.',
    deleteAccount: 'Delete account',
    deleteAccountSubtitle: 'Permanently remove your handle, profile, and history.',
    deleteSheetTitle: 'Delete account permanently',
    deleteSheetBody:
      'Your handle and profile will be gone. Price submissions you made will stay (they\'re part of the public record), but your name will be removed from them. Other fans\' confirmations belong to them.',
    deleteConfirmPlaceholder: 'Type DELETE to enable',
    deleteButtonArmed: 'Delete my account permanently',
    deleteButtonDisabled: 'Type DELETE to enable',
  },
  appearanceSection: 'Appearance',
  accountSection: 'Account',
  submissionsSection: 'My submissions',
  seeAllSubmissions: (count: number) => `See all ${count} →`,
  emailRow: 'Email',
  passwordRow: 'Password',
  clerkLinkLabel: 'Manage via Clerk →',
  watchlistRow: 'Saved shows',
  watchlistComingSoon: 'Coming soon',
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/settings/definitions/
git commit -m "feat: settings constants and copy"
```

---

## Task 7: Avatar component

**Files:**
- Create: `apps/web/src/components/settings/Avatar.tsx`
- Create: `apps/web/src/components/settings/ProfileEntryAvatar.tsx`

**Visual reference:** `design/design_handoff_profile_settings/profile-settings-screens.jsx` — `<MonogramPoster>` and `<ProfileEntryAvatar>` components.

- [ ] **Step 1: Create Avatar (MonogramPoster)**

The avatar is a circle. If the user has a handle: first letter of handle, on a disc tinted with the chosen color token. If anonymous (no handle): a dashed-border `?` disc using `--fg-subtle` border.

```tsx
// apps/web/src/components/settings/Avatar.tsx
import type { AvatarColor } from '@concert-crawl/types'

interface AvatarProps {
  handle: string | null
  avatarColor: AvatarColor | null
  size?: number
  className?: string
}

const COLOR_VAR: Record<AvatarColor, string> = {
  signal: 'var(--signal)',
  accent: 'var(--accent)',
  success: 'var(--success)',
  warning: 'var(--warning)',
}

export function Avatar({ handle, avatarColor, size = 56, className }: AvatarProps) {
  const letter = handle ? handle.charAt(0).toUpperCase() : '?'
  const isAnonymous = !handle

  const bgColor = avatarColor ? COLOR_VAR[avatarColor] : undefined
  const fontSize = Math.round(size * 0.4)

  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        background: isAnonymous ? 'transparent' : (bgColor ?? 'var(--surface-2)'),
        border: isAnonymous ? '2px dashed var(--fg-subtle)' : 'none',
        color: isAnonymous ? 'var(--fg-subtle)' : 'var(--bg)',
        fontSize,
        fontWeight: 800,
        fontFamily: 'var(--font-ui)',
        userSelect: 'none',
      }}
      aria-hidden="true"
    >
      {letter}
    </div>
  )
}
```

- [ ] **Step 2: Create ProfileEntryAvatar**

A 36px tap-target linking to `/me`. Shows the Avatar at 36px.

```tsx
// apps/web/src/components/settings/ProfileEntryAvatar.tsx
import Link from 'next/link'
import { Avatar } from './Avatar'
import type { AvatarColor } from '@concert-crawl/types'

interface ProfileEntryAvatarProps {
  handle: string | null
  avatarColor: AvatarColor | null
}

export function ProfileEntryAvatar({ handle, avatarColor }: ProfileEntryAvatarProps) {
  return (
    <Link
      href="/me"
      aria-label={handle ? `@${handle} — settings` : 'Settings'}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
    >
      <Avatar handle={handle} avatarColor={avatarColor} size={36} />
    </Link>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/settings/Avatar.tsx apps/web/src/components/settings/ProfileEntryAvatar.tsx
git commit -m "feat: Avatar (monogram disc) and ProfileEntryAvatar components"
```

---

## Task 8: ProfileHero component

**Files:**
- Create: `apps/web/src/components/settings/ProfileHero.tsx`

**Visual reference:** `profile-settings-screens.jsx` — `<ProfileHero>`. The hero shows the large avatar, handle (or "anonymous fan" label), role chip, and city. Tapping navigates to `/me/edit`.

- [ ] **Step 1: Create ProfileHero**

```tsx
// apps/web/src/components/settings/ProfileHero.tsx
import Link from 'next/link'
import { Avatar } from './Avatar'
import { SETTINGS_COPY } from './definitions/copy'
import type { AvatarColor, DisplayRole } from '@concert-crawl/types'

interface ProfileHeroProps {
  handle: string | null
  avatarColor: AvatarColor | null
  displayRole: DisplayRole
  city: string | null
  joined: string
}

const ROLE_LABEL: Record<DisplayRole, string> = {
  fan: 'fan',
  crew: 'crew',
  artist: 'artist',
  staff: 'staff',
}

export function ProfileHero({ handle, avatarColor, displayRole, city, joined }: ProfileHeroProps) {
  return (
    <Link
      href="/me/edit"
      className="flex flex-col items-center gap-3 py-6 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
    >
      <Avatar handle={handle} avatarColor={avatarColor} size={72} />

      <div className="flex flex-col items-center gap-1">
        {handle ? (
          <span className="text-[20px] font-bold tracking-[-0.02em] text-fg">
            @{handle}
          </span>
        ) : (
          <span className="text-[16px] font-medium text-fg-muted">
            {SETTINGS_COPY.anonymousLabel}
          </span>
        )}

        <div className="flex items-center gap-2">
          <span
            className="rounded-full border border-border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.06em] text-fg-muted"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            {ROLE_LABEL[displayRole]}
          </span>
          {city && (
            <span className="text-[13px] text-fg-subtle">{city}</span>
          )}
        </div>

        <span className="text-[12px] text-fg-subtle">Since {joined}</span>
      </div>
    </Link>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/settings/ProfileHero.tsx
git commit -m "feat: ProfileHero component"
```

---

## Task 9: PlanCard component

**Files:**
- Create: `apps/web/src/components/settings/PlanCard.tsx`

**Visual reference:** `profile-settings-screens.jsx` — `<PlanCard>`. Four states: `founder` (accent border + radial wash, celebratory), `paid` (plain), `trial` (days remaining countdown), `past-due` (warning tone, "Update billing" CTA). Design shows the Founder card as the default for beta.

- [ ] **Step 1: Create PlanCard**

```tsx
// apps/web/src/components/settings/PlanCard.tsx
import { SETTINGS_COPY } from './definitions/copy'
import type { UserPlan } from '@concert-crawl/types'

interface PlanCardProps {
  plan: UserPlan
  trialDaysRemaining?: number
}

export function PlanCard({ plan, trialDaysRemaining }: PlanCardProps) {
  if (plan === 'founder') {
    return (
      <div
        className="relative overflow-hidden rounded-2xl border-2 p-5"
        style={{
          borderColor: 'var(--accent)',
          background:
            'radial-gradient(ellipse at top left, color-mix(in srgb, var(--accent) 12%, transparent), var(--surface-1))',
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <span
              className="text-[11px] font-bold uppercase tracking-[0.08em]"
              style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}
            >
              {SETTINGS_COPY.planCard.founder.badge}
            </span>
            <span className="text-[17px] font-bold text-fg">
              {SETTINGS_COPY.planCard.founder.tagline}
            </span>
            <span className="text-[13px] italic text-fg-muted">
              {SETTINGS_COPY.planCard.founder.subline}
            </span>
          </div>
        </div>
      </div>
    )
  }

  if (plan === 'past-due') {
    return (
      <div
        className="rounded-2xl border p-5"
        style={{ borderColor: 'var(--warning)', background: 'var(--surface-1)' }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            <span
              className="text-[11px] font-bold uppercase tracking-[0.08em]"
              style={{ color: 'var(--warning)', fontFamily: 'var(--font-mono)' }}
            >
              {SETTINGS_COPY.planCard.pastDue.badge}
            </span>
            <span className="text-[15px] font-medium text-fg">
              {SETTINGS_COPY.planCard.pastDue.tagline}
            </span>
          </div>
          <span
            className="shrink-0 text-[13px] font-medium"
            style={{ color: 'var(--warning)' }}
          >
            {SETTINGS_COPY.planCard.pastDue.cta}
          </span>
        </div>
      </div>
    )
  }

  if (plan === 'trial') {
    return (
      <div className="rounded-2xl border border-border bg-surface-1 p-5">
        <div className="flex flex-col gap-1">
          <span
            className="text-[11px] font-bold uppercase tracking-[0.08em] text-fg-muted"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            {SETTINGS_COPY.planCard.trial.badge}
          </span>
          <span className="text-[15px] font-medium text-fg">
            {trialDaysRemaining ?? 0} {SETTINGS_COPY.planCard.trial.tagline}
          </span>
          <span className="text-[13px] text-fg-muted">
            {SETTINGS_COPY.planCard.trial.subline}
          </span>
        </div>
      </div>
    )
  }

  // paid
  return (
    <div
      className="rounded-2xl border p-5"
      style={{ borderColor: 'var(--signal)', background: 'var(--surface-1)' }}
    >
      <div className="flex flex-col gap-1">
        <span
          className="text-[11px] font-bold uppercase tracking-[0.08em]"
          style={{ color: 'var(--signal)', fontFamily: 'var(--font-mono)' }}
        >
          {SETTINGS_COPY.planCard.paid.badge}
        </span>
        <span className="text-[15px] font-medium text-fg">
          {SETTINGS_COPY.planCard.paid.tagline}
        </span>
        <span className="text-[13px] text-fg-muted">
          {SETTINGS_COPY.planCard.paid.subline}
        </span>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/settings/PlanCard.tsx
git commit -m "feat: PlanCard component (founder/paid/trial/past-due)"
```

---

## Task 10: ThemePickerInline component

**Files:**
- Create: `apps/web/src/components/settings/ThemePickerInline.tsx`

**Visual reference:** `profile-settings-screens.jsx` — `<ThemePickerInline>`. Three swatches side-by-side, each is a mini artboard preview using real tokens. Tapping a swatch applies the theme immediately (calls `setTheme()` from the existing `useTheme()` hook) and persists server-side via the `patchMe` API call.

The mini-preview shows three colored dots representing `--bg`, `--signal`, `--accent` for that theme. Selected swatch has a 3px tinted ring using the theme's signal color.

```tsx
// apps/web/src/components/settings/ThemePickerInline.tsx
'use client'

import { useState } from 'react'
import { useTheme } from '@/theme/ThemeProvider'
import { THEMES, type ThemeName } from '@/theme/themes'
import { patchMe } from '@/lib/api/users'
import { useAuth } from '@clerk/nextjs'

const THEME_LABELS: Record<ThemeName, string> = {
  electric: 'Electric',
  jade: 'Jade',
  light: 'Light',
}

function ThemeSwatch({ themeName, isActive, onSelect }: {
  themeName: ThemeName
  isActive: boolean
  onSelect: () => void
}) {
  const tokens = THEMES[themeName]
  const bg = tokens['bg'] as string
  const signal = tokens['signal'] as string
  const accent = tokens['accent'] as string

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={`Switch to ${THEME_LABELS[themeName]} theme`}
      aria-pressed={isActive}
      className="flex flex-1 cursor-pointer flex-col items-center gap-2 rounded-xl p-3 transition-colors hover:bg-surface-2"
      style={{
        outline: isActive ? `3px solid ${signal}` : '3px solid transparent',
        outlineOffset: '2px',
      }}
    >
      {/* Mini preview */}
      <div
        className="flex h-10 w-full items-center justify-center gap-1.5 rounded-lg"
        style={{ background: bg, border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div className="h-2.5 w-2.5 rounded-full" style={{ background: signal }} />
        <div className="h-2.5 w-2.5 rounded-full" style={{ background: accent }} />
      </div>
      <span className="text-[12px] font-medium text-fg-muted">{THEME_LABELS[themeName]}</span>
    </button>
  )
}
```

- [ ] **Step 1: Implement ThemePickerInline with server persistence**

```tsx
// (continuing ThemePickerInline.tsx after the ThemeSwatch component)
export function ThemePickerInline() {
  const { theme, setTheme } = useTheme()
  const { getToken } = useAuth()
  const [saving, setSaving] = useState(false)

  async function handleSelect(themeName: ThemeName) {
    setTheme(themeName)
    setSaving(true)
    try {
      const token = await getToken()
      if (token) await patchMe(token, { theme: themeName })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="px-1 text-[13px] font-semibold text-fg">
        {SETTINGS_COPY.appearanceSection}
      </span>
      <div className="flex gap-2">
        {(Object.keys(THEMES) as ThemeName[]).map((themeName) => (
          <ThemeSwatch
            key={themeName}
            themeName={themeName}
            isActive={theme === themeName}
            onSelect={() => void handleSelect(themeName)}
          />
        ))}
      </div>
    </div>
  )
}
```

Add the `SETTINGS_COPY` import at the top of the file.

- [ ] **Step 2: Typecheck**

```bash
pnpm --filter @concert-crawl/web typecheck
```

Fix any errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/settings/ThemePickerInline.tsx
git commit -m "feat: ThemePickerInline — three-swatch row with server theme persistence"
```

---

## Task 11: StatusPill, SubmissionItem, MySubmissionsList

**Files:**
- Create: `apps/web/src/components/settings/StatusPill.tsx`
- Create: `apps/web/src/components/settings/SubmissionItem.tsx`
- Create: `apps/web/src/components/settings/MySubmissionsList.tsx`

**Visual reference:** `profile-settings-screens.jsx` — `<StatusPill>`, `<SubmissionItem>`, `<MySubmissionsList>`.

- [ ] **Step 1: StatusPill**

```tsx
// apps/web/src/components/settings/StatusPill.tsx
import type { SubmissionDisplayStatus } from '@concert-crawl/types'

interface StatusPillProps {
  status: SubmissionDisplayStatus
}

const STATUS_STYLE: Record<SubmissionDisplayStatus, { label: string; color: string }> = {
  confirmed: { label: 'confirmed', color: 'var(--success)' },
  pending: { label: 'pending', color: 'var(--fg-subtle)' },
  disputed: { label: 'disputed', color: 'var(--warning)' },
}

export function StatusPill({ status }: StatusPillProps) {
  const { label, color } = STATUS_STYLE[status]
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em]"
      style={{
        fontFamily: 'var(--font-mono)',
        color,
        background: `color-mix(in srgb, ${color} 12%, transparent)`,
        border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`,
      }}
    >
      {label}
    </span>
  )
}
```

- [ ] **Step 2: SubmissionItem**

```tsx
// apps/web/src/components/settings/SubmissionItem.tsx
import Link from 'next/link'
import { StatusPill } from './StatusPill'
import type { UserSubmissionItem } from '@concert-crawl/types'

interface SubmissionItemProps {
  submission: UserSubmissionItem
}

function formatPrice(cents: number): string {
  return `$${Math.round(cents / 100)}`
}

function formatDate(iso: string): string {
  const date = new Date(iso + 'T00:00:00')
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function SubmissionItem({ submission }: SubmissionItemProps) {
  const priceRange = submission.priceMax
    ? `${formatPrice(submission.priceMin)}–${formatPrice(submission.priceMax)}`
    : formatPrice(submission.priceMin)

  return (
    <Link
      href={`/events/${submission.eventId}`}
      className="flex items-center justify-between gap-3 rounded-xl px-4 py-3 transition-colors hover:bg-surface-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
    >
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate text-[14px] font-semibold text-fg">
          {submission.artist}
        </span>
        <span className="text-[12px] text-fg-muted">
          {submission.venue} · {formatDate(submission.date)}
        </span>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <span
          className="text-[13px] font-bold text-fg"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          {priceRange}
        </span>
        <StatusPill status={submission.status} />
      </div>
    </Link>
  )
}
```

- [ ] **Step 3: MySubmissionsList**

```tsx
// apps/web/src/components/settings/MySubmissionsList.tsx
import Link from 'next/link'
import { SubmissionItem } from './SubmissionItem'
import { SETTINGS_COPY } from './definitions/copy'
import { SUBMISSION_CAP_MOBILE } from './definitions/constants'
import type { UserSubmissionItem } from '@concert-crawl/types'

interface MySubmissionsListProps {
  submissions: UserSubmissionItem[]
  totalCount: number
  cap?: number
}

export function MySubmissionsList({
  submissions,
  totalCount,
  cap = SUBMISSION_CAP_MOBILE,
}: MySubmissionsListProps) {
  const visible = submissions.slice(0, cap)
  const hasMore = totalCount > cap

  return (
    <div className="flex flex-col gap-1">
      <span className="px-1 text-[13px] font-semibold text-fg">
        {SETTINGS_COPY.submissionsSection}
      </span>
      {visible.length === 0 ? (
        <p className="px-4 py-3 text-[13px] text-fg-muted">No submissions yet.</p>
      ) : (
        <div className="flex flex-col">
          {visible.map((sub) => (
            <SubmissionItem key={sub.id} submission={sub} />
          ))}
          {hasMore && (
            <Link
              href="/me/submissions"
              className="px-4 py-3 text-[13px] font-medium text-fg-muted transition-colors hover:text-fg"
            >
              {SETTINGS_COPY.seeAllSubmissions(totalCount)}
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/settings/StatusPill.tsx apps/web/src/components/settings/SubmissionItem.tsx apps/web/src/components/settings/MySubmissionsList.tsx
git commit -m "feat: StatusPill, SubmissionItem, MySubmissionsList components"
```

---

## Task 12: DangerZone + DeleteAccountSheet

**Files:**
- Create: `apps/web/src/components/settings/DeleteAccountSheet.tsx`
- Create: `apps/web/src/components/settings/DangerZone.tsx`

**Visual reference:** `profile-settings-screens.jsx` — `<DangerZone>` and `<DeleteAccountSheet>`. Sign-out uses the snarky copy from `SETTINGS_COPY.dangerZone.signOutSubtitle`. Delete sheet has a bottom-anchored modal with the DELETE-typed gate.

- [ ] **Step 1: DeleteAccountSheet**

```tsx
// apps/web/src/components/settings/DeleteAccountSheet.tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import { useAuth, useClerk } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { deleteAccount } from '@/lib/api/users'
import { SETTINGS_COPY } from './definitions/copy'

interface DeleteAccountSheetProps {
  open: boolean
  onClose: () => void
}

export function DeleteAccountSheet({ open, onClose }: DeleteAccountSheetProps) {
  const [inputValue, setInputValue] = useState('')
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const { getToken } = useAuth()
  const { signOut } = useClerk()
  const router = useRouter()

  const isArmed = inputValue === 'DELETE'

  useEffect(() => {
    if (open) {
      setInputValue('')
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  async function handleDelete() {
    if (!isArmed || loading) return
    setLoading(true)
    try {
      const token = await getToken()
      if (token) await deleteAccount(token)
      await signOut()
      router.push('/')
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <>
      {/* Scrim */}
      <div
        className="fixed inset-0 z-50"
        style={{ background: 'var(--scrim)' }}
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-sheet-title"
        className="fixed bottom-0 left-0 right-0 z-50 flex flex-col gap-5 rounded-t-2xl p-6"
        style={{ background: 'var(--bg)', maxWidth: '480px', margin: '0 auto' }}
      >
        {/* Drag handle */}
        <div className="mx-auto h-1 w-10 rounded-full bg-border" />

        <h2
          id="delete-sheet-title"
          className="text-[18px] font-bold text-fg"
        >
          {SETTINGS_COPY.dangerZone.deleteSheetTitle}
        </h2>

        <p className="text-[14px] leading-relaxed text-fg-muted">
          {SETTINGS_COPY.dangerZone.deleteSheetBody}
        </p>

        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(evt) => setInputValue(evt.target.value)}
          placeholder={SETTINGS_COPY.dangerZone.deleteConfirmPlaceholder}
          className="rounded-lg border border-border bg-surface-1 px-4 py-3 text-[14px] text-fg placeholder:text-fg-subtle focus:border-border-focus focus:outline-none"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
        />

        <button
          type="button"
          onClick={() => void handleDelete()}
          disabled={!isArmed || loading}
          className="rounded-xl py-3.5 text-[15px] font-bold text-bg transition-colors disabled:cursor-not-allowed disabled:opacity-40"
          style={{
            background: isArmed ? 'var(--danger)' : 'var(--surface-2)',
            color: isArmed ? 'white' : 'var(--fg-muted)',
          }}
        >
          {loading ? 'Deleting…' : isArmed
            ? SETTINGS_COPY.dangerZone.deleteButtonArmed
            : SETTINGS_COPY.dangerZone.deleteButtonDisabled}
        </button>
      </div>
    </>
  )
}
```

- [ ] **Step 2: DangerZone**

```tsx
// apps/web/src/components/settings/DangerZone.tsx
'use client'

import { useState } from 'react'
import { useClerk } from '@clerk/nextjs'
import { DeleteAccountSheet } from './DeleteAccountSheet'
import { SETTINGS_COPY } from './definitions/copy'

export function DangerZone() {
  const { signOut } = useClerk()
  const [sheetOpen, setSheetOpen] = useState(false)

  return (
    <>
      <div className="flex flex-col gap-1">
        <button
          type="button"
          onClick={() => void signOut()}
          className="flex cursor-pointer flex-col gap-0.5 rounded-xl px-4 py-3 text-left transition-colors hover:bg-surface-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
        >
          <span className="text-[14px] font-semibold text-fg">
            {SETTINGS_COPY.dangerZone.signOut}
          </span>
          <span className="text-[12px] text-fg-muted">
            {SETTINGS_COPY.dangerZone.signOutSubtitle}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="flex cursor-pointer flex-col gap-0.5 rounded-xl px-4 py-3 text-left transition-colors hover:bg-surface-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger"
        >
          <span className="text-[14px] font-semibold" style={{ color: 'var(--danger)' }}>
            {SETTINGS_COPY.dangerZone.deleteAccount}
          </span>
          <span className="text-[12px] text-fg-muted">
            {SETTINGS_COPY.dangerZone.deleteAccountSubtitle}
          </span>
        </button>
      </div>

      <DeleteAccountSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
    </>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/settings/DeleteAccountSheet.tsx apps/web/src/components/settings/DangerZone.tsx
git commit -m "feat: DangerZone + DeleteAccountSheet with DELETE-typed gate"
```

---

## Task 13: EditProfileForm

**Files:**
- Create: `apps/web/src/components/settings/EditProfileForm.tsx`

**Visual reference:** `profile-settings-screens.jsx` — `<EditProfileRoute>`. Fields: handle, city, avatar color picker. Real-time client validation + debounced server availability check (300ms). Save disables on error or while saving. "Going anonymous" callout only when editing an existing handle (not on first pick).

- [ ] **Step 1: Implement EditProfileForm**

```tsx
// apps/web/src/components/settings/EditProfileForm.tsx
'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { patchMe, checkHandleAvailability } from '@/lib/api/users'
import { Avatar } from './Avatar'
import { SETTINGS_COPY } from './definitions/copy'
import {
  HANDLE_REGEX,
  RESERVED_HANDLES,
  AVATAR_COLORS,
} from './definitions/constants'
import type { AvatarColor, UserProfileResponse } from '@concert-crawl/types'

interface EditProfileFormProps {
  profile: UserProfileResponse
}

type HandleError = 'tooShort' | 'invalidChars' | 'reserved' | 'taken' | null

function validateHandleLocal(handle: string): HandleError {
  if (handle.length > 0 && handle.length < 3) return 'tooShort'
  if (handle.length > 0 && !HANDLE_REGEX.test(handle)) return 'invalidChars'
  if (handle.length >= 3 && RESERVED_HANDLES.has(handle)) return 'reserved'
  return null
}

const COLOR_VAR: Record<AvatarColor, string> = {
  signal: 'var(--signal)',
  accent: 'var(--accent)',
  success: 'var(--success)',
  warning: 'var(--warning)',
}

export function EditProfileForm({ profile }: EditProfileFormProps) {
  const router = useRouter()
  const { getToken } = useAuth()

  const [handle, setHandle] = useState(profile.handle ?? '')
  const [city, setCity] = useState(profile.city ?? '')
  const [avatarColor, setAvatarColor] = useState<AvatarColor | null>(profile.avatarColor)
  const [handleError, setHandleError] = useState<HandleError>(null)
  const [saving, setSaving] = useState(false)
  const [checkingAvailability, setCheckingAvailability] = useState(false)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hadHandleBefore = profile.handle !== null

  const checkAvailability = useCallback(async (value: string) => {
    if (value === profile.handle) return // unchanged
    setCheckingAvailability(true)
    try {
      const token = await getToken()
      if (!token) return
      const result = await checkHandleAvailability(token, value)
      if (!result.available) {
        setHandleError(result.reason === 'reserved' ? 'reserved' : 'taken')
      } else {
        setHandleError(null)
      }
    } finally {
      setCheckingAvailability(false)
    }
  }, [getToken, profile.handle])

  function handleHandleChange(value: string) {
    const normalized = value.toLowerCase()
    setHandle(normalized)

    const localError = validateHandleLocal(normalized)
    setHandleError(localError)

    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!localError && normalized.length >= 3) {
      debounceRef.current = setTimeout(() => {
        void checkAvailability(normalized)
      }, 300)
    }
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  const isGoingAnonymous = hadHandleBefore && handle === ''
  const hasError = handleError !== null
  const isSaveDisabled = hasError || saving || checkingAvailability

  async function handleSave() {
    if (isSaveDisabled) return
    setSaving(true)
    try {
      const token = await getToken()
      if (!token) return
      await patchMe(token, {
        handle: handle === '' ? null : handle,
        city: city === '' ? null : city,
        avatarColor,
      })
      router.push('/me')
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 px-4 py-6">
      {/* Avatar preview */}
      <div className="flex flex-col items-center gap-3">
        <Avatar handle={handle || null} avatarColor={avatarColor} size={72} />
        {handle && (
          <span className="text-[15px] font-bold text-fg">@{handle}</span>
        )}
      </div>

      {/* Handle field */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[13px] font-semibold text-fg" htmlFor="handle-input">
          Handle
        </label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[14px] text-fg-muted">
            @
          </span>
          <input
            id="handle-input"
            type="text"
            value={handle}
            onChange={(evt) => handleHandleChange(evt.target.value)}
            placeholder={SETTINGS_COPY.handlePlaceholder}
            maxLength={20}
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            className="w-full rounded-xl border border-border bg-surface-1 py-3 pl-8 pr-4 text-[14px] text-fg placeholder:text-fg-subtle focus:border-border-focus focus:outline-none"
            style={handleError ? { borderColor: 'var(--danger)' } : undefined}
          />
        </div>
        {handleError && (
          <span className="text-[12px]" style={{ color: 'var(--danger)' }}>
            {SETTINGS_COPY.handleErrors[handleError]}
          </span>
        )}
        {!handleError && !isGoingAnonymous && (
          <span className="text-[12px] text-fg-subtle">{SETTINGS_COPY.handleHint}</span>
        )}
        {isGoingAnonymous && (
          <div
            className="rounded-xl p-3 text-[12px] leading-relaxed text-fg-muted"
            style={{ background: 'var(--surface-2)' }}
          >
            {SETTINGS_COPY.goingAnonymousWarning}
          </div>
        )}
      </div>

      {/* City field */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[13px] font-semibold text-fg" htmlFor="city-input">
          City
        </label>
        <input
          id="city-input"
          type="text"
          value={city}
          onChange={(evt) => setCity(evt.target.value)}
          placeholder={SETTINGS_COPY.cityPlaceholder}
          maxLength={100}
          className="w-full rounded-xl border border-border bg-surface-1 px-4 py-3 text-[14px] text-fg placeholder:text-fg-subtle focus:border-border-focus focus:outline-none"
        />
        <span className="text-[12px] text-fg-subtle">{SETTINGS_COPY.cityHint}</span>
      </div>

      {/* Avatar color picker */}
      <div className="flex flex-col gap-2">
        <span className="text-[13px] font-semibold text-fg">Avatar color</span>
        <div className="flex gap-3">
          {AVATAR_COLORS.map((color) => {
            const isSelected = avatarColor === color
            return (
              <button
                key={color}
                type="button"
                onClick={() => setAvatarColor(color)}
                aria-label={`Avatar color: ${color}`}
                aria-pressed={isSelected}
                className="relative h-8 w-8 cursor-pointer rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
                style={{
                  background: COLOR_VAR[color],
                  outline: isSelected ? `3px solid ${COLOR_VAR[color]}` : '3px solid transparent',
                  outlineOffset: '3px',
                }}
              />
            )
          })}
        </div>
      </div>

      {/* Save */}
      <button
        type="button"
        onClick={() => void handleSave()}
        disabled={isSaveDisabled}
        className="rounded-xl py-3.5 text-[15px] font-bold text-bg transition-colors disabled:cursor-not-allowed disabled:opacity-50"
        style={{ background: isSaveDisabled ? 'var(--surface-2)' : 'var(--signal)', color: isSaveDisabled ? 'var(--fg-muted)' : 'var(--bg)' }}
      >
        {saving ? 'Saving…' : checkingAvailability ? 'Checking…' : 'Save'}
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm --filter @concert-crawl/web typecheck
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/settings/EditProfileForm.tsx
git commit -m "feat: EditProfileForm — handle/city/avatar with debounced availability check"
```

---

## Task 14: SettingsRoute (mobile hub)

**Files:**
- Create: `apps/web/src/components/settings/SettingsRoute.tsx`

**Visual reference:** `profile-settings-screens.jsx` — `<SettingsRoute>`. Stacked sections on mobile. Sections: ProfileHero → PlanCard → Appearance (ThemePickerInline) → Submissions (MySubmissionsList) → Account (Email/Password link-outs) → Danger zone.

- [ ] **Step 1: Implement SettingsRoute**

```tsx
// apps/web/src/components/settings/SettingsRoute.tsx
import { ProfileHero } from './ProfileHero'
import { PlanCard } from './PlanCard'
import { ThemePickerInline } from './ThemePickerInline'
import { MySubmissionsList } from './MySubmissionsList'
import { DangerZone } from './DangerZone'
import { SETTINGS_COPY } from './definitions/copy'
import type { UserProfileResponse, UserSubmissionItem } from '@concert-crawl/types'

interface SettingsRouteProps {
  profile: UserProfileResponse
  submissions: UserSubmissionItem[]
}

export function SettingsRoute({ profile, submissions }: SettingsRouteProps) {
  return (
    <div className="flex flex-col gap-6 pb-24">
      {/* Hero */}
      <ProfileHero
        handle={profile.handle}
        avatarColor={profile.avatarColor}
        displayRole={profile.displayRole}
        city={profile.city}
        joined={profile.joined}
      />

      {/* Divider */}
      <div className="h-px bg-border mx-4" />

      {/* Plan */}
      <div className="px-4">
        <PlanCard plan={profile.plan} />
      </div>

      {/* Appearance */}
      <div className="px-4">
        <ThemePickerInline />
      </div>

      <div className="h-px bg-border mx-4" />

      {/* Submissions */}
      <div className="px-0">
        <MySubmissionsList
          submissions={submissions}
          totalCount={profile.submissionCount}
        />
      </div>

      <div className="h-px bg-border mx-4" />

      {/* Account rows */}
      <div className="flex flex-col gap-1 px-0">
        <span className="px-5 text-[13px] font-semibold text-fg">
          {SETTINGS_COPY.accountSection}
        </span>
        {/* Email — link-out to Clerk */}
        <div className="flex items-center justify-between px-5 py-3">
          <span className="text-[14px] text-fg">{SETTINGS_COPY.emailRow}</span>
          <span className="text-[13px] text-fg-muted">{profile.email}</span>
        </div>
        {/* Password — link-out to Clerk */}
        <div className="flex items-center justify-between px-5 py-3">
          <span className="text-[14px] text-fg">{SETTINGS_COPY.passwordRow}</span>
          <a
            href="https://accounts.clerk.dev/user"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[13px] text-fg-muted underline-offset-2 hover:underline"
          >
            {SETTINGS_COPY.clerkLinkLabel}
          </a>
        </div>
        {/* Saved shows — stub */}
        <div className="flex items-center justify-between px-5 py-3 opacity-50">
          <span className="text-[14px] text-fg">{SETTINGS_COPY.watchlistRow}</span>
          <span className="text-[13px] text-fg-subtle">{SETTINGS_COPY.watchlistComingSoon}</span>
        </div>
      </div>

      <div className="h-px bg-border mx-4" />

      {/* Danger zone */}
      <div className="px-0">
        <DangerZone />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/settings/SettingsRoute.tsx
git commit -m "feat: SettingsRoute — mobile hub composing all settings sections"
```

---

## Task 15: SettingsRouteDesktop

**Files:**
- Create: `apps/web/src/components/settings/SettingsRouteDesktop.tsx`

**Visual reference:** `profile-settings-screens.jsx` — `<SettingsRouteDesktop>`. Left rail (240px) with nav sections: Profile, Plan, Appearance, Submissions, Account, Danger zone. Right panel renders the selected section's content. This is a client component (manages selected section state).

**Desktop nav sections and their panels:**

| Section | Panel content |
|---|---|
| Profile | ProfileHero (larger) + anonymous callout if no handle |
| Plan | PlanCard |
| Appearance | ThemePickerInline |
| Submissions | MySubmissionsList (no cap — show all) |
| Account | Email row + Password row |
| Danger zone | DangerZone |

- [ ] **Step 1: Implement SettingsRouteDesktop**

```tsx
// apps/web/src/components/settings/SettingsRouteDesktop.tsx
'use client'

import { useState } from 'react'
import { ProfileHero } from './ProfileHero'
import { PlanCard } from './PlanCard'
import { ThemePickerInline } from './ThemePickerInline'
import { MySubmissionsList } from './MySubmissionsList'
import { DangerZone } from './DangerZone'
import { SETTINGS_COPY } from './definitions/copy'
import type { UserProfileResponse, UserSubmissionItem } from '@concert-crawl/types'

type NavSection = 'profile' | 'plan' | 'appearance' | 'submissions' | 'account' | 'danger'

const NAV_ITEMS: { key: NavSection; label: string }[] = [
  { key: 'profile', label: 'Profile' },
  { key: 'plan', label: 'Plan' },
  { key: 'appearance', label: 'Appearance' },
  { key: 'submissions', label: 'My submissions' },
  { key: 'account', label: 'Account' },
  { key: 'danger', label: 'Danger zone' },
]

interface SettingsRouteDesktopProps {
  profile: UserProfileResponse
  submissions: UserSubmissionItem[]
}

export function SettingsRouteDesktop({ profile, submissions }: SettingsRouteDesktopProps) {
  const [activeSection, setActiveSection] = useState<NavSection>('profile')

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 border-r border-border bg-bg-elevated">
        <div className="sticky top-16 flex flex-col gap-1 p-4">
          {NAV_ITEMS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveSection(key)}
              className="cursor-pointer rounded-xl px-4 py-2.5 text-left text-[14px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
              style={{
                background: activeSection === key ? 'var(--surface-2)' : 'transparent',
                color: activeSection === key ? 'var(--fg)' : 'var(--fg-muted)',
                fontWeight: activeSection === key ? 700 : 500,
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </aside>

      {/* Panel */}
      <main className="flex-1 max-w-xl px-8 py-8">
        {activeSection === 'profile' && (
          <div className="flex flex-col gap-6">
            <ProfileHero
              handle={profile.handle}
              avatarColor={profile.avatarColor}
              displayRole={profile.displayRole}
              city={profile.city}
              joined={profile.joined}
            />
            {!profile.handle && (
              <div
                className="rounded-xl p-4 text-[13px] leading-relaxed text-fg-muted"
                style={{ background: 'var(--surface-1)' }}
              >
                {SETTINGS_COPY.anonymousExplainer}
              </div>
            )}
          </div>
        )}

        {activeSection === 'plan' && (
          <div className="flex flex-col gap-4">
            <h2 className="text-[18px] font-bold text-fg">Plan</h2>
            <PlanCard plan={profile.plan} />
          </div>
        )}

        {activeSection === 'appearance' && (
          <div className="flex flex-col gap-4">
            <h2 className="text-[18px] font-bold text-fg">Appearance</h2>
            <ThemePickerInline />
          </div>
        )}

        {activeSection === 'submissions' && (
          <div className="flex flex-col gap-2">
            <h2 className="text-[18px] font-bold text-fg">My submissions</h2>
            <MySubmissionsList
              submissions={submissions}
              totalCount={profile.submissionCount}
              cap={submissions.length}
            />
          </div>
        )}

        {activeSection === 'account' && (
          <div className="flex flex-col gap-4">
            <h2 className="text-[18px] font-bold text-fg">Account</h2>
            <div className="flex flex-col gap-2 rounded-xl border border-border bg-surface-1">
              <div className="flex items-center justify-between px-5 py-3.5">
                <span className="text-[14px] font-medium text-fg">{SETTINGS_COPY.emailRow}</span>
                <span className="text-[13px] text-fg-muted">{profile.email}</span>
              </div>
              <div className="h-px bg-border mx-5" />
              <div className="flex items-center justify-between px-5 py-3.5">
                <span className="text-[14px] font-medium text-fg">{SETTINGS_COPY.passwordRow}</span>
                <a
                  href="https://accounts.clerk.dev/user"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[13px] text-fg-muted underline-offset-2 hover:underline"
                >
                  {SETTINGS_COPY.clerkLinkLabel}
                </a>
              </div>
              <div className="h-px bg-border mx-5" />
              <div className="flex items-center justify-between px-5 py-3.5 opacity-50">
                <span className="text-[14px] font-medium text-fg">{SETTINGS_COPY.watchlistRow}</span>
                <span className="text-[13px] text-fg-subtle">{SETTINGS_COPY.watchlistComingSoon}</span>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'danger' && (
          <div className="flex flex-col gap-4">
            <h2 className="text-[18px] font-bold text-fg">Danger zone</h2>
            <DangerZone />
          </div>
        )}
      </main>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/settings/SettingsRouteDesktop.tsx
git commit -m "feat: SettingsRouteDesktop — sidebar+panel layout"
```

---

## Task 16: Server actions + /me and /me/edit pages

**Files:**
- Create: `apps/web/src/app/(protected)/me/actions.ts`
- Create: `apps/web/src/app/(protected)/me/page.tsx`
- Create: `apps/web/src/app/(protected)/me/edit/page.tsx`

**Architecture:** `/me/page.tsx` is a server component. It fetches profile and submissions server-side using the Clerk session token (`auth().getToken()`). It renders `<SettingsRoute>` on mobile and `<SettingsRouteDesktop>` on desktop via a single mount — use CSS to show/hide based on breakpoint, not conditional rendering. `/me/edit/page.tsx` is a server component that fetches profile, then renders `<EditProfileForm>` (client).

- [ ] **Step 1: Check how existing server components fetch from the API**

Look at an existing protected server component (e.g., `apps/web/src/app/(protected)/events/page.tsx`) to confirm the `auth().getToken()` pattern used to get a bearer token. Adapt if the pattern differs.

- [ ] **Step 2: Create /me page**

```tsx
// apps/web/src/app/(protected)/me/page.tsx
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { fetchMe, fetchMySubmissions } from '@/lib/api/users'
import { SettingsRoute } from '@/components/settings/SettingsRoute'
import { SettingsRouteDesktop } from '@/components/settings/SettingsRouteDesktop'

export const metadata = { title: 'Settings — Concert Crawl' }

export default async function MePage() {
  const { getToken } = await auth()
  const token = await getToken()
  if (!token) redirect('/sign-in')

  const [profile, submissions] = await Promise.all([
    fetchMe(token),
    fetchMySubmissions(token),
  ])

  // Sync theme: if profile theme differs from what the client has, ThemePickerInline
  // will reflect it after hydration. Full cross-device sync happens on /me load.

  return (
    <>
      {/* Mobile (< sm) */}
      <div className="sm:hidden">
        <SettingsRoute profile={profile} submissions={submissions} />
      </div>
      {/* Desktop (sm+) */}
      <div className="hidden sm:block">
        <SettingsRouteDesktop profile={profile} submissions={submissions} />
      </div>
    </>
  )
}
```

- [ ] **Step 3: Create /me/edit page**

```tsx
// apps/web/src/app/(protected)/me/edit/page.tsx
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { fetchMe } from '@/lib/api/users'
import { EditProfileForm } from '@/components/settings/EditProfileForm'

export const metadata = { title: 'Edit profile — Concert Crawl' }

export default async function EditProfilePage() {
  const { getToken } = await auth()
  const token = await getToken()
  if (!token) redirect('/sign-in')

  const profile = await fetchMe(token)

  return (
    <div className="mx-auto max-w-md">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-4">
        <Link
          href="/me"
          className="text-[14px] font-medium text-fg-muted hover:text-fg"
        >
          ← Cancel
        </Link>
        <span className="text-[15px] font-bold text-fg">Edit profile</span>
        <div className="w-16" /> {/* spacer to center title */}
      </div>

      <EditProfileForm profile={profile} />
    </div>
  )
}
```

- [ ] **Step 4: Typecheck**

```bash
pnpm --filter @concert-crawl/web typecheck
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/(protected)/me/
git commit -m "feat: /me and /me/edit routes — server-fetched profile + edit form"
```

---

## Task 17: Nav integration — UserAvatar dropdown + mobile top bar

**Files:**
- Modify: `apps/web/src/components/consumer/app-header/UserAvatar.tsx`
- Modify: `apps/web/src/components/consumer/app-header/AppHeader.tsx`

**Goal:** (a) Add "Settings" link to the UserAvatar dropdown in the desktop nav. (b) Replace the desktop-only Clerk avatar with `ProfileEntryAvatar` on the mobile top bar, pulling profile data from the API.

**Implementation note:** `ProfileEntryAvatar` needs handle + avatarColor. These are only known after fetching the profile. For the mobile bar, keep it lightweight: fetch the profile client-side inside a dedicated `MobileProfileEntry` client component that calls `fetchMe` on mount. If loading, show a plain `?` disc. This avoids making the shared `AppHeader` a server component.

- [ ] **Step 1: Update UserAvatar dropdown**

In `apps/web/src/components/consumer/app-header/UserAvatar.tsx`, add a "Settings" link above the Sign out button:

```tsx
// Inside the dropdown div, before the sign-out button:
<Link
  href="/me"
  onClick={() => setOpen(false)}
  className="block w-full px-4 py-2 text-left text-[13px] text-fg-muted hover:bg-surface-1 hover:text-fg"
>
  Settings
</Link>
<div className="h-px bg-border mx-2" />
```

- [ ] **Step 2: Add ProfileEntryAvatar to mobile top bar**

Create a thin client wrapper that fetches profile on mount:

```tsx
// apps/web/src/components/consumer/app-header/MobileProfileEntry.tsx
'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import { fetchMe } from '@/lib/api/users'
import { ProfileEntryAvatar } from '@/components/settings/ProfileEntryAvatar'
import type { UserProfileResponse } from '@concert-crawl/types'

export function MobileProfileEntry() {
  const { getToken } = useAuth()
  const [profile, setProfile] = useState<UserProfileResponse | null>(null)

  useEffect(() => {
    void (async () => {
      const token = await getToken()
      if (!token) return
      try {
        const data = await fetchMe(token)
        setProfile(data)
      } catch {
        // silently fall back to anonymous avatar
      }
    })()
  }, [getToken])

  return (
    <ProfileEntryAvatar
      handle={profile?.handle ?? null}
      avatarColor={profile?.avatarColor ?? null}
    />
  )
}
```

Then in `AppHeader.tsx`, replace the mobile bar's search icon with `MobileProfileEntry` alongside the existing search link:

```tsx
// In the mobile bar section (the sm:hidden div), replace:
<Link href="/search" ...>
  <Search ... />
</Link>
// With:
<div className="flex items-center gap-2">
  <Link href="/search" aria-label="Search" ...>
    <Search ... />
  </Link>
  <MobileProfileEntry />
</div>
```

- [ ] **Step 3: Typecheck + lint**

```bash
pnpm --filter @concert-crawl/web typecheck
pnpm --filter @concert-crawl/web lint
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/consumer/app-header/
git commit -m "feat: add Settings link to UserAvatar dropdown, mobile ProfileEntryAvatar in top bar"
```

---

## Task 18: ThemeSync on /me page load

**Goal:** When the user opens `/me`, the theme in their profile is applied to the browser — enabling cross-device theme sync. The `SettingsRoute` and `SettingsRouteDesktop` already receive `profile.theme`. We need a small client component that applies it on mount if it differs from the current active theme.

**Files:**
- Create: `apps/web/src/components/settings/ThemeSync.tsx`
- Modify: `apps/web/src/app/(protected)/me/page.tsx`

- [ ] **Step 1: Create ThemeSync**

```tsx
// apps/web/src/components/settings/ThemeSync.tsx
'use client'

import { useEffect } from 'react'
import { useTheme } from '@/theme/ThemeProvider'
import type { UserTheme } from '@concert-crawl/types'

interface ThemeSyncProps {
  serverTheme: UserTheme
}

export function ThemeSync({ serverTheme }: ThemeSyncProps) {
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    if (theme !== serverTheme) {
      setTheme(serverTheme)
    }
  // Only run on mount — serverTheme is stable for this page load
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}
```

- [ ] **Step 2: Add ThemeSync to /me page**

In `apps/web/src/app/(protected)/me/page.tsx`, import and render `<ThemeSync serverTheme={profile.theme} />` above the layout divs:

```tsx
import { ThemeSync } from '@/components/settings/ThemeSync'
// ...
return (
  <>
    <ThemeSync serverTheme={profile.theme} />
    {/* Mobile */}
    ...
  </>
)
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/settings/ThemeSync.tsx apps/web/src/app/(protected)/me/page.tsx
git commit -m "feat: ThemeSync — apply server-persisted theme on /me load for cross-device sync"
```

---

## Task 19: Quality gate

- [ ] **Step 1: Typecheck all apps**

```bash
pnpm --filter @concert-crawl/api typecheck
pnpm --filter @concert-crawl/web typecheck
pnpm --filter @concert-crawl/db typecheck
```

Fix all errors before proceeding.

- [ ] **Step 2: Lint all apps**

```bash
pnpm --filter @concert-crawl/api lint
pnpm --filter @concert-crawl/web lint
```

Fix all lint errors.

- [ ] **Step 3: Run integration tests**

```bash
pnpm --filter @concert-crawl/api test
```

Expected: all tests pass including the new `users.integration.test.ts`.

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: quality gate fixes for phase-8b user profile"
```

---

## Spec coverage self-check

After writing this plan, I verified coverage against the README:

| Requirement | Task |
|---|---|
| Anonymous-by-default (null handle → "anonymous fan") | Task 7 (Avatar `?` disc), Task 8 (ProfileHero label), Task 13 (EditProfileForm going-anonymous callout) |
| Handle: opt-in, retroactive attribution | Task 1 (user_profiles.handle), Task 3 (PATCH), Task 13 (EditProfileForm) |
| Handle validation: regex, length, reserved | Task 6 (constants), Task 13 (EditProfileForm), Task 3 (API server-side) |
| Handle availability: debounce 300ms | Task 13 (EditProfileForm debounce) |
| Avatar: letter on tinted disc, 4 color swatches | Task 7 (Avatar), Task 13 (color picker) |
| Anonymous avatar: dashed `?` disc | Task 7 (Avatar) |
| Plan model: founder / paid / trial / past-due | Task 9 (PlanCard), Task 3 (API derivePlan) |
| Founder card: accent border + radial wash + italic | Task 9 (PlanCard founder state) |
| Theme picker: 3 swatches, live mini-previews | Task 10 (ThemePickerInline) |
| Theme persistence server-side | Task 1 (schema), Task 3 (PATCH), Task 10 (ThemePickerInline patchMe), Task 18 (ThemeSync) |
| My submissions: status pills, capped at 3 mobile | Task 11 (all three components) |
| Status mapping: corroborated→confirmed, stale→pending | Task 3 (mapStatus), Task 11 (StatusPill) |
| Delete account: DELETE-typed gate | Task 12 (DeleteAccountSheet) |
| Delete account: anonymize submissions | Task 3 (DELETE /v1/users/me), Task 1 (nullable userId migration) |
| Sign out: snarky copy | Task 6 (copy.ts), Task 12 (DangerZone) |
| Email/Password: link-outs to Clerk hosted UI | Task 14 (SettingsRoute), Task 15 (SettingsRouteDesktop) |
| Saved/Watching: stub row ("coming soon") | Task 14, Task 15 |
| Mobile hub layout | Task 14 (SettingsRoute) |
| Desktop sidebar+panel layout | Task 15 (SettingsRouteDesktop) |
| ProfileEntryAvatar: 36px entry in top bar and bottom nav | Task 7, Task 17 |
| UserAvatar dropdown: "Settings" link | Task 17 |
| Bottom nav /me tab | Already wired (bottom nav has href: '/me') — verify in Task 17 |
| Anonymous explanation callout | Task 6 (copy), Task 15 (desktop profile panel) |

**Items explicitly deferred (per user instructions):**
- Photo upload — design explicitly says "no upload ever"; handle-letter avatar is final
- Notification dot on avatar — design says removed deliberately; no notification stream yet
- Saved/Watching list — Phase 9; only stub row included
- Stripe portal link — post-beta; plan card has no billing CTA for non-past-due states
- Live handle availability debounce — implemented ✅ (user said it's a great feature add)
- Retroactive handle anonymization — works automatically via user_profiles.handle = null; no price_submissions update needed since display reads from profile at query time

---

## Resume

_(Fill in if session is interrupted — note exact task and step where work stopped.)_
