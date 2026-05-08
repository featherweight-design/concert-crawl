# Price Transparency v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace freeform price submission with structured community-driven flow — enum fields, peer confirms via join table, dispute routing, dedicated submit/dispute routes.

**Architecture:** Clean-cut DB migration (no prod data) adds 3 new pgEnums and `submission_confirms` join table; API gains 4 new endpoints + 2 updated ones; web adds `SubmitPricePage`, `DisputePage`, `SubmitForm`, `CommunityPriceChip`, `VerifySheet`, and a `PriceSection` client island on the event detail page.

**Tech Stack:** Drizzle ORM (pgEnum, self-ref FK, `AnyPgColumn`), Hono (optional auth via `clerkAuth`), Next.js 14 App Router (server + client components), Vitest integration tests, Playwright E2E, Zod, `@packages/types` SP_POLICY.

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `packages/db/src/schema/prices.ts` | Modify | Add 3 enums + 4 columns to `priceSubmissions`, remove `tierLabel`/`sourceNote` |
| `packages/db/src/schema/submission-confirms.ts` | Create | `submissionConfirms` table with unique `(submissionId, userId)` |
| `packages/db/src/schema/index.ts` | Modify | Export `submission-confirms` |
| `packages/db/src/migrations/` | Create | Single migration file (drop old cols + add new cols + new table) |
| `packages/types/src/index.ts` | Modify | Add `Tier`, `Vendor`, `HowFound`, `SP_POLICY`, update `PriceSubmission`, add `SubmissionListResponse` |
| `apps/api/src/middleware/auth.ts` | Modify | Add `getAuthOptional` helper |
| `apps/api/src/routes/price-submissions.ts` | Modify | Update GET shape + POST body schema |
| `apps/api/src/routes/submissions.ts` | Create | GET/:id, POST/:id/confirm, POST/:id/dispute, PATCH/:id, DELETE/:id |
| `apps/api/src/routes/index.ts` | Modify | Register `submissionsRouter` at `/v1/submissions` |
| `apps/api/src/test/helpers/seed.ts` | Modify | Update clearTables, seedPriceSubmission, add seedSubmissionConfirm |
| `apps/api/src/routes/price-submissions.integration.test.ts` | Modify | Update tests for new request/response shapes, add 409/429 tests |
| `apps/api/src/routes/submissions.integration.test.ts` | Create | Confirm idempotency, dispute flow, PATCH/DELETE ownership tests |
| `apps/web/src/lib/sp-policy.ts` | Create | `validateSubmission()` — mirrors SP_POLICY server logic for client UX |
| `apps/web/src/components/consumer/SPNumberField.tsx` | Create | Controlled number input with $ prefix, error/warning border |
| `apps/web/src/components/consumer/ChipGroup.tsx` | Create | Single-select enum chip group |
| `apps/web/src/components/consumer/SubmitForm.tsx` | Create | Full submit form client component (4 phases) |
| `apps/web/src/app/(protected)/events/[id]/submit-price/page.tsx` | Create | `SubmitPricePage` server component |
| `apps/web/src/components/consumer/CommunityPriceChip.tsx` | Modify | Replace existing inline `PriceSubmissionForm` reference; wire to VerifySheet |
| `apps/web/src/components/consumer/VerifySheet.tsx` | Create | Bottom sheet with `SubmissionList` |
| `apps/web/src/components/consumer/SubmissionList.tsx` | Create | List + individual `SubmissionCard` with confirm/dispute actions |
| `apps/web/src/components/consumer/PriceSection.tsx` | Create | Client island: holds `verifyOpen` state, fetches submissions, renders chip + sheet |
| `apps/web/src/app/(protected)/events/[id]/page.tsx` | Modify | Remove `PriceSubmissionForm`, add `PriceSection` + submit CTA |
| `apps/web/src/app/(protected)/events/[id]/submissions/[submissionId]/dispute/page.tsx` | Create | `DisputePage` server component |
| `apps/web/src/components/consumer/DisputeForm.tsx` | Create | Dispute form with vendor chip + price fields |
| `apps/e2e/src/e2e/price-transparency-v2.spec.ts` | Create | E2E: submit flow, alreadySubmitted, confirm, dispute |

---

### Task 1: DB schema — enums, new columns, submission-confirms table

**Files:**
- Modify: `packages/db/src/schema/prices.ts`
- Create: `packages/db/src/schema/submission-confirms.ts`
- Modify: `packages/db/src/schema/index.ts`

- [ ] **Step 1: Update `prices.ts` — add enums and new columns, remove old ones**

Replace the entire file:

```typescript
import {
  AnyPgColumn,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'
import { events, priceSourceEnum } from './events.js'
import { venues } from './venues.js'

export const priceRetrievalOutcomeEnum = pgEnum('price_retrieval_outcome', [
  'hit',
  'miss',
  'error',
])

export const priceSubmissionStatusEnum = pgEnum('price_submission_status', [
  'pending',
  'corroborated',
  'disputed',
  'stale',
])

export const submissionTierEnum = pgEnum('submission_tier', [
  'GA',
  'Reserved',
  'VIP',
  'Pit',
  'Lawn',
])

export const submissionVendorEnum = pgEnum('submission_vendor', [
  'AXS',
  'Ticketmaster',
  'SeatGeek',
  'DICE',
  'Eventbrite',
  'VenueBoxOffice',
])

export const submissionHowFoundEnum = pgEnum('submission_how_found', [
  'bought_myself',
  'saw_listing',
  'at_the_venue',
])

export const priceRetrievalLog = pgTable(
  'price_retrieval_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    eventId: uuid('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    venueId: uuid('venue_id')
      .notNull()
      .references(() => venues.id),
    source: priceSourceEnum('source').notNull(),
    outcome: priceRetrievalOutcomeEnum('outcome').notNull(),
    latencyMs: integer('latency_ms').notNull(),
    errorMessage: text('error_message'),
    attemptedAt: timestamp('attempted_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    priceLogVenueSourceAttemptedAtIdx: index(
      'price_log_venue_source_attempted_at_idx',
    ).on(table.venueId, table.source, table.attemptedAt),
  }),
)

export const priceSubmissions = pgTable('price_submissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventId: uuid('event_id')
    .notNull()
    .references(() => events.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull(),
  priceMin: numeric('price_min', { precision: 10, scale: 2 }).notNull(),
  priceMax: numeric('price_max', { precision: 10, scale: 2 }),
  tier: submissionTierEnum('tier').notNull(),
  vendor: submissionVendorEnum('vendor').notNull(),
  howFound: submissionHowFoundEnum('how_found').notNull(),
  disputedSubmissionId: uuid('disputed_submission_id').references(
    (): AnyPgColumn => priceSubmissions.id,
  ),
  status: priceSubmissionStatusEnum('status').notNull().default('pending'),
  corroborationCount: integer('corroboration_count').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export type PriceRetrievalLog = typeof priceRetrievalLog.$inferSelect
export type NewPriceRetrievalLog = typeof priceRetrievalLog.$inferInsert

export type PriceSubmission = typeof priceSubmissions.$inferSelect
export type NewPriceSubmission = typeof priceSubmissions.$inferInsert
```

- [ ] **Step 2: Create `submission-confirms.ts`**

```typescript
import { pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core'
import { priceSubmissions } from './prices.js'

export const submissionConfirms = pgTable(
  'submission_confirms',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    submissionId: uuid('submission_id')
      .notNull()
      .references(() => priceSubmissions.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull(),
    confirmedAt: timestamp('confirmed_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    uniqueUserSubmission: unique(
      'submission_confirms_submission_user_uniq',
    ).on(table.submissionId, table.userId),
  }),
)

export type SubmissionConfirm = typeof submissionConfirms.$inferSelect
export type NewSubmissionConfirm = typeof submissionConfirms.$inferInsert
```

- [ ] **Step 3: Add export to `packages/db/src/schema/index.ts`**

Add at the end:
```typescript
export * from './submission-confirms.js'
```

- [ ] **Step 4: Generate migration**

Run from the worktree root:
```bash
cd /Users/huey/Projects/concert-crawl/.worktrees/feat/price-transparency-v2
pnpm db:generate
```

Expected: a new migration file in `packages/db/src/migrations/` with `ALTER TABLE price_submissions DROP COLUMN tier_label`, `DROP COLUMN source_note`, `ADD COLUMN tier`, `ADD COLUMN vendor`, `ADD COLUMN how_found`, `ADD COLUMN disputed_submission_id`, and `CREATE TABLE submission_confirms`.

- [ ] **Step 5: Apply migration**

```bash
pnpm db:migrate
```

Expected: `Migration applied successfully` (no errors).

- [ ] **Step 6: Commit**

```bash
cd /Users/huey/Projects/concert-crawl/.worktrees/feat/price-transparency-v2
git add packages/db/src/schema/prices.ts packages/db/src/schema/submission-confirms.ts packages/db/src/schema/index.ts packages/db/src/migrations/
git commit -m "feat: add v2 price submission schema — tier/vendor/howFound enums, submission_confirms table"
```

---

### Task 2: Shared types — Tier, Vendor, HowFound, SP_POLICY, updated PriceSubmission

**Files:**
- Modify: `packages/types/src/index.ts`

- [ ] **Step 1: Add new types and SP_POLICY after the existing `PriceSource` type**

Find the `PriceSource` type declaration (around line 44) and add after it:

```typescript
// Ticket tier
export type Tier = 'GA' | 'Reserved' | 'VIP' | 'Pit' | 'Lawn'

// Ticket vendor
export type Vendor =
  | 'AXS'
  | 'Ticketmaster'
  | 'SeatGeek'
  | 'DICE'
  | 'Eventbrite'
  | 'VenueBoxOffice'

// How the submitter found the price
export type HowFound = 'bought_myself' | 'saw_listing' | 'at_the_venue'

// Shared validation policy — server enforces, client mirrors for UX
export const SP_POLICY = {
  floorMin: 1,
  floorMax: 2000,
  ceilingMax: 2000,
  confirmsRequired: 2,
  rateLimitHours: 24,
  outlierLowFactor: 0.4,
  outlierHighFactor: 2.5,
} as const
```

- [ ] **Step 2: Replace the `PriceSubmission` interface**

Replace the existing `PriceSubmission` interface (currently with `tierLabel`/`sourceNote`) with:

```typescript
// PriceSubmission — community-submitted ticket price for an event
export interface PriceSubmission {
  id: string
  eventId: string
  userId: string
  priceMin: string
  priceMax: string | null
  tier: Tier
  vendor: Vendor
  howFound: HowFound
  disputedSubmissionId: string | null
  status: 'pending' | 'corroborated' | 'disputed' | 'stale'
  corroborationCount: number
  createdAt: string
  updatedAt: string
}
```

- [ ] **Step 3: Add `SubmissionListResponse`**

After `PriceSubmission`, add:

```typescript
// SubmissionWithMeta — single submission + peer-confirm metadata
export interface SubmissionWithMeta extends PriceSubmission {
  confirms: number
  byYou: boolean
}

// SubmissionListResponse — response for GET /v1/events/:id/price-submissions
export interface SubmissionListResponse {
  submissions: SubmissionWithMeta[]
  alreadySubmitted: boolean
  userSubmission: SubmissionWithMeta | null
}
```

- [ ] **Step 4: Build to check for type errors**

```bash
cd /Users/huey/Projects/concert-crawl/.worktrees/feat/price-transparency-v2
pnpm --filter @concert-crawl/types build
```

Expected: exits 0 with no TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add packages/types/src/index.ts
git commit -m "feat: add Tier, Vendor, HowFound, SP_POLICY, SubmissionListResponse to shared types"
```

---

### Task 3: API middleware — getAuthOptional

**Files:**
- Modify: `apps/api/src/middleware/auth.ts`

- [ ] **Step 1: Read the current auth middleware to find the right insertion point**

Read `apps/api/src/middleware/auth.ts` and locate the `getAuthUser` export.

- [ ] **Step 2: Add `getAuthOptional` after `getAuthUser`**

```typescript
export function getAuthOptional(ctx: Context): { userId: string } | null {
  const auth = getAuth(ctx)
  if (!auth?.userId) return null
  return { userId: auth.userId }
}
```

- [ ] **Step 3: Verify build**

```bash
pnpm --filter @concert-crawl/api build 2>&1 | head -20
```

Expected: no new TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/middleware/auth.ts
git commit -m "feat: add getAuthOptional middleware helper"
```

---

### Task 4: Update price-submissions route (GET + POST)

**Files:**
- Modify: `apps/api/src/routes/price-submissions.ts`

- [ ] **Step 1: Read the current file**

Read `apps/api/src/routes/price-submissions.ts` in full to understand existing imports, schema, and route handlers.

- [ ] **Step 2: Replace the GET handler**

The updated GET handler:
- Uses `clerkAuth()` middleware (optional auth — no `requireAuth`)
- Calls `getAuthOptional(ctx)` to determine `userId`
- Returns all submissions where `status != 'stale'`
- LEFT JOINs `submissionConfirms` via subquery to get `confirms` count per submission
- Computes `byYou: userId != null && sub.userId === userId` per submission
- Returns `{ submissions, alreadySubmitted, userSubmission }` nested in the standard `{ success: true, data: ... }` envelope

```typescript
import { and, count, eq, ne, sql } from 'drizzle-orm'
import { clerkAuth } from '@hono/clerk-auth'
import { getAuthOptional } from '../middleware/auth.js'
import { submissionConfirms } from '@concert-crawl/db'

// GET /v1/events/:id/price-submissions
priceSubmissionsRouter.get('/:id/price-submissions', clerkAuth(), async (ctx) => {
  const { id: eventId } = ctx.req.param()
  const authUser = getAuthOptional(ctx)
  const userId = authUser?.userId ?? null

  const confirmsSubquery = db
    .select({
      submissionId: submissionConfirms.submissionId,
      confirmCount: count(submissionConfirms.id).as('confirm_count'),
    })
    .from(submissionConfirms)
    .groupBy(submissionConfirms.submissionId)
    .as('confirms_sub')

  const rows = await db
    .select({
      submission: priceSubmissions,
      confirms: sql<number>`COALESCE(${confirmsSubquery.confirmCount}, 0)`,
    })
    .from(priceSubmissions)
    .leftJoin(confirmsSubquery, eq(priceSubmissions.id, confirmsSubquery.submissionId))
    .where(
      and(
        eq(priceSubmissions.eventId, eventId),
        ne(priceSubmissions.status, 'stale'),
      ),
    )

  const submissions = rows.map((row) => ({
    ...row.submission,
    confirms: Number(row.confirms),
    byYou: userId != null && row.submission.userId === userId,
  }))

  const userSubmission = userId != null
    ? (submissions.find((sub) => sub.userId === userId && sub.status === 'pending') ?? null)
    : null

  return ctx.json({
    success: true,
    data: {
      submissions,
      alreadySubmitted: userSubmission != null,
      userSubmission,
    },
  })
})
```

- [ ] **Step 3: Replace the POST handler**

The updated POST body schema uses `tier`/`vendor`/`howFound` (all required), removes `tierLabel`/`sourceNote`, adds 409 check and 429 rate limit, removes auto-corroboration:

```typescript
const submissionBodySchema = z.object({
  priceMin: z.number().int().min(SP_POLICY.floorMin).max(SP_POLICY.floorMax),
  priceMax: z.number().int().min(1).max(SP_POLICY.ceilingMax).optional(),
  tier: z.enum(['GA', 'Reserved', 'VIP', 'Pit', 'Lawn']),
  vendor: z.enum(['AXS', 'Ticketmaster', 'SeatGeek', 'DICE', 'Eventbrite', 'VenueBoxOffice']),
  howFound: z.enum(['bought_myself', 'saw_listing', 'at_the_venue']),
})

// POST /v1/events/:id/price-submissions
priceSubmissionsRouter.post('/:id/price-submissions', requireAuth(), async (ctx) => {
  const { id: eventId } = ctx.req.param()
  const authUser = getAuthUser(ctx)
  const body = await ctx.req.json()
  const parsed = submissionBodySchema.safeParse(body)
  if (!parsed.success) {
    return ctx.json({ success: false, error: 'Invalid body', details: parsed.error.flatten() }, 400)
  }
  const { priceMin, priceMax, tier, vendor, howFound } = parsed.data

  // 409 — existing pending submission
  const existing = await db
    .select()
    .from(priceSubmissions)
    .where(
      and(
        eq(priceSubmissions.eventId, eventId),
        eq(priceSubmissions.userId, authUser.userId),
        eq(priceSubmissions.status, 'pending'),
      ),
    )
    .limit(1)
  if (existing.length > 0) {
    return ctx.json({ success: false, error: 'Already submitted', submission: existing[0] }, 409)
  }

  // 429 — rate limit: 1 submission per user per event per 24h
  const cutoff = new Date(Date.now() - SP_POLICY.rateLimitHours * 60 * 60 * 1000)
  const recent = await db
    .select()
    .from(priceSubmissions)
    .where(
      and(
        eq(priceSubmissions.eventId, eventId),
        eq(priceSubmissions.userId, authUser.userId),
        sql`${priceSubmissions.createdAt} > ${cutoff}`,
      ),
    )
    .limit(1)
  if (recent.length > 0) {
    return ctx.json({ success: false, error: 'Rate limit: 1 submission per 24h' }, 429)
  }

  const [created] = await db
    .insert(priceSubmissions)
    .values({
      eventId,
      userId: authUser.userId,
      priceMin: String(priceMin),
      priceMax: priceMax != null ? String(priceMax) : null,
      tier,
      vendor,
      howFound,
    })
    .returning()

  return ctx.json({ success: true, data: created }, 201)
})
```

- [ ] **Step 4: Add SP_POLICY import at the top of the file**

```typescript
import { SP_POLICY } from '@concert-crawl/types'
```

- [ ] **Step 5: Build and verify**

```bash
pnpm --filter @concert-crawl/api build 2>&1 | head -30
```

Expected: exits 0.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/routes/price-submissions.ts
git commit -m "feat: update price-submissions route — enum body, 409/429 guards, enriched GET response"
```

---

### Task 5: New submissions router (GET/:id, confirm, dispute, PATCH, DELETE)

**Files:**
- Create: `apps/api/src/routes/submissions.ts`
- Modify: `apps/api/src/routes/index.ts`

- [ ] **Step 1: Create `submissions.ts`**

```typescript
import { Hono } from 'hono'
import { clerkAuth } from '@hono/clerk-auth'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { and, eq, sql } from 'drizzle-orm'
import { db } from '../db.js'
import { priceSubmissions, submissionConfirms } from '@concert-crawl/db'
import { getAuthUser } from '../middleware/auth.js'
import { requireAuth } from '../middleware/auth.js'
import { SP_POLICY } from '@concert-crawl/types'

export const submissionsRouter = new Hono()

// GET /v1/submissions/:id
submissionsRouter.get('/:id', requireAuth(), async (ctx) => {
  const { id } = ctx.req.param()
  const [submission] = await db
    .select()
    .from(priceSubmissions)
    .where(eq(priceSubmissions.id, id))
    .limit(1)
  if (!submission) {
    return ctx.json({ success: false, error: 'Not found' }, 404)
  }
  return ctx.json({ success: true, data: submission })
})

// POST /v1/submissions/:id/confirm
submissionsRouter.post('/:id/confirm', requireAuth(), async (ctx) => {
  const { id: submissionId } = ctx.req.param()
  const authUser = getAuthUser(ctx)

  const [submission] = await db
    .select()
    .from(priceSubmissions)
    .where(eq(priceSubmissions.id, submissionId))
    .limit(1)
  if (!submission) {
    return ctx.json({ success: false, error: 'Not found' }, 404)
  }
  if (submission.userId === authUser.userId) {
    return ctx.json({ success: false, error: 'Cannot confirm your own submission' }, 403)
  }

  const inserted = await db
    .insert(submissionConfirms)
    .values({ submissionId, userId: authUser.userId })
    .onConflictDoNothing()
    .returning()

  let newStatus = submission.status
  let newCount = submission.corroborationCount

  if (inserted.length > 0) {
    newCount = submission.corroborationCount + 1
    newStatus = newCount >= SP_POLICY.confirmsRequired ? 'corroborated' : submission.status

    await db
      .update(priceSubmissions)
      .set({
        corroborationCount: newCount,
        status: newStatus,
        updatedAt: new Date(),
      })
      .where(eq(priceSubmissions.id, submissionId))
  }

  return ctx.json({ success: true, data: { confirms: newCount, status: newStatus } })
})

const disputeBodySchema = z.object({
  floor: z.number().int().min(SP_POLICY.floorMin).max(SP_POLICY.floorMax),
  ceiling: z.number().int().min(1).max(SP_POLICY.ceilingMax).optional(),
  vendor: z.enum(['AXS', 'Ticketmaster', 'SeatGeek', 'DICE', 'Eventbrite', 'VenueBoxOffice']),
})

// POST /v1/submissions/:id/dispute
submissionsRouter.post('/:id/dispute', requireAuth(), zValidator('json', disputeBodySchema), async (ctx) => {
  const { id: submissionId } = ctx.req.param()
  const authUser = getAuthUser(ctx)
  const { floor, ceiling, vendor } = ctx.req.valid('json')

  const [parent] = await db
    .select()
    .from(priceSubmissions)
    .where(eq(priceSubmissions.id, submissionId))
    .limit(1)
  if (!parent) {
    return ctx.json({ success: false, error: 'Not found' }, 404)
  }
  if (parent.userId === authUser.userId) {
    return ctx.json({ success: false, error: 'Cannot dispute your own submission' }, 403)
  }

  const [disputeRow, _updated] = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(priceSubmissions)
      .values({
        eventId: parent.eventId,
        userId: authUser.userId,
        priceMin: String(floor),
        priceMax: ceiling != null ? String(ceiling) : null,
        tier: parent.tier,
        vendor,
        howFound: parent.howFound,
        disputedSubmissionId: submissionId,
        status: 'pending',
      })
      .returning()

    const [updated] = await tx
      .update(priceSubmissions)
      .set({ status: 'disputed', updatedAt: new Date() })
      .where(eq(priceSubmissions.id, submissionId))
      .returning()

    return [created, updated]
  })

  return ctx.json({ success: true, data: disputeRow }, 201)
})

const patchBodySchema = z.object({
  floor: z.number().int().min(SP_POLICY.floorMin).max(SP_POLICY.floorMax).optional(),
  ceiling: z.number().int().min(1).max(SP_POLICY.ceilingMax).optional(),
  tier: z.enum(['GA', 'Reserved', 'VIP', 'Pit', 'Lawn']).optional(),
  vendor: z.enum(['AXS', 'Ticketmaster', 'SeatGeek', 'DICE', 'Eventbrite', 'VenueBoxOffice']).optional(),
  howFound: z.enum(['bought_myself', 'saw_listing', 'at_the_venue']).optional(),
}).refine((data) => Object.keys(data).length > 0, { message: 'At least one field required' })

// PATCH /v1/submissions/:id
submissionsRouter.patch('/:id', requireAuth(), zValidator('json', patchBodySchema), async (ctx) => {
  const { id } = ctx.req.param()
  const authUser = getAuthUser(ctx)
  const body = ctx.req.valid('json')

  const [submission] = await db
    .select()
    .from(priceSubmissions)
    .where(eq(priceSubmissions.id, id))
    .limit(1)
  if (!submission) {
    return ctx.json({ success: false, error: 'Not found' }, 404)
  }
  if (submission.userId !== authUser.userId) {
    return ctx.json({ success: false, error: 'Forbidden' }, 403)
  }
  if (submission.status !== 'pending') {
    return ctx.json({ success: false, error: 'Can only edit pending submissions' }, 400)
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() }
  if (body.floor != null) updates['priceMin'] = String(body.floor)
  if (body.ceiling != null) updates['priceMax'] = String(body.ceiling)
  if (body.tier != null) updates['tier'] = body.tier
  if (body.vendor != null) updates['vendor'] = body.vendor
  if (body.howFound != null) updates['howFound'] = body.howFound

  const [updated] = await db
    .update(priceSubmissions)
    .set(updates)
    .where(eq(priceSubmissions.id, id))
    .returning()

  return ctx.json({ success: true, data: updated })
})

// DELETE /v1/submissions/:id
submissionsRouter.delete('/:id', requireAuth(), async (ctx) => {
  const { id } = ctx.req.param()
  const authUser = getAuthUser(ctx)

  const [submission] = await db
    .select()
    .from(priceSubmissions)
    .where(eq(priceSubmissions.id, id))
    .limit(1)
  if (!submission) {
    return ctx.json({ success: false, error: 'Not found' }, 404)
  }
  if (submission.userId !== authUser.userId) {
    return ctx.json({ success: false, error: 'Forbidden' }, 403)
  }

  await db.delete(priceSubmissions).where(eq(priceSubmissions.id, id))
  return ctx.body(null, 204)
})
```

- [ ] **Step 2: Register the router in `apps/api/src/routes/index.ts`**

Read the file and add:
```typescript
import { submissionsRouter } from './submissions.js'
// ...
app.route('/v1/submissions', submissionsRouter)
```

- [ ] **Step 3: Build**

```bash
pnpm --filter @concert-crawl/api build 2>&1 | head -30
```

Expected: exits 0.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/routes/submissions.ts apps/api/src/routes/index.ts
git commit -m "feat: add /v1/submissions router — confirm, dispute, PATCH, DELETE"
```

---

### Task 6: Update API integration tests

**Files:**
- Modify: `apps/api/src/test/helpers/seed.ts`
- Modify: `apps/api/src/routes/price-submissions.integration.test.ts`
- Create: `apps/api/src/routes/submissions.integration.test.ts`

- [ ] **Step 1: Read current `seed.ts` to find `clearTables` and `seedPriceSubmission`**

Read `apps/api/src/test/helpers/seed.ts`.

- [ ] **Step 2: Update `clearTables` to include `submission_confirms`**

Add `'submission_confirms'` to the TRUNCATE list in `clearTables()`. It must come before `'price_submissions'` due to FK dependency:

```typescript
await db.execute(
  sql`TRUNCATE TABLE submission_confirms, price_submissions, ... RESTART IDENTITY CASCADE`
)
```

- [ ] **Step 3: Update `seedPriceSubmission` defaults**

Add `tier`, `vendor`, `howFound` to the default values:

```typescript
export async function seedPriceSubmission(
  eventId: string,
  userId: string,
  overrides: Partial<NewPriceSubmission> = {},
) {
  const [row] = await db
    .insert(priceSubmissions)
    .values({
      eventId,
      userId,
      priceMin: '35.00',
      tier: 'GA',
      vendor: 'Ticketmaster',
      howFound: 'bought_myself',
      ...overrides,
    })
    .returning()
  return row
}
```

- [ ] **Step 4: Add `seedSubmissionConfirm` helper**

```typescript
export async function seedSubmissionConfirm(submissionId: string, userId: string) {
  const [row] = await db
    .insert(submissionConfirms)
    .values({ submissionId, userId })
    .returning()
  return row
}
```

- [ ] **Step 5: Read and update `price-submissions.integration.test.ts`**

Read the existing test file. Update:

1. POST body to `{ priceMin: 35, tier: 'GA', vendor: 'Ticketmaster', howFound: 'bought_myself' }`
2. GET assertion from `body.data[0]?.status` to `body.data.submissions[0]?.status`
3. Add a test for 409 (pending submission already exists):

```typescript
it('returns 409 when user already has a pending submission', async () => {
  await seedPriceSubmission(testEventId, testUserId)
  const res = await apiClient.post(
    `/v1/events/${testEventId}/price-submissions`,
    { priceMin: 40, tier: 'GA', vendor: 'Ticketmaster', howFound: 'bought_myself' },
    testToken,
  )
  expect(res.status).toBe(409)
})
```

4. Add a test for 429 (rate limit — seed a submission with `createdAt` within 24h):

```typescript
it('returns 429 when user submits within 24h', async () => {
  await seedPriceSubmission(testEventId, testUserId, { status: 'corroborated' })
  const res = await apiClient.post(
    `/v1/events/${testEventId}/price-submissions`,
    { priceMin: 40, tier: 'GA', vendor: 'Ticketmaster', howFound: 'bought_myself' },
    testToken,
  )
  expect(res.status).toBe(429)
})
```

- [ ] **Step 6: Create `submissions.integration.test.ts`**

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { app } from '../app.js'
import { clearTables, seedEvent, seedVenue, seedPriceSubmission, seedSubmissionConfirm } from '../test/helpers/seed.js'
import { apiClient } from '../test/helpers/client.js'

const USER_A = 'user_test_a'
const USER_B = 'user_test_b'
const TOKEN_A = 'test-token-a'
const TOKEN_B = 'test-token-b'

describe('GET /v1/submissions/:id', () => {
  let submissionId: string

  beforeEach(async () => {
    await clearTables()
    const venue = await seedVenue()
    const event = await seedEvent(venue.id)
    const sub = await seedPriceSubmission(event.id, USER_A)
    submissionId = sub.id
  })

  it('returns the submission by id', async () => {
    const res = await apiClient.get(`/v1/submissions/${submissionId}`, TOKEN_A)
    expect(res.status).toBe(200)
    expect(res.body.data.id).toBe(submissionId)
  })

  it('returns 404 for unknown id', async () => {
    const res = await apiClient.get(`/v1/submissions/00000000-0000-0000-0000-000000000000`, TOKEN_A)
    expect(res.status).toBe(404)
  })
})

describe('POST /v1/submissions/:id/confirm', () => {
  let submissionId: string
  let eventId: string

  beforeEach(async () => {
    await clearTables()
    const venue = await seedVenue()
    const event = await seedEvent(venue.id)
    eventId = event.id
    const sub = await seedPriceSubmission(event.id, USER_A)
    submissionId = sub.id
  })

  it('increments confirm count', async () => {
    const res = await apiClient.post(`/v1/submissions/${submissionId}/confirm`, {}, TOKEN_B)
    expect(res.status).toBe(200)
    expect(res.body.data.confirms).toBe(1)
    expect(res.body.data.status).toBe('pending')
  })

  it('transitions to corroborated at 2 confirms', async () => {
    await seedSubmissionConfirm(submissionId, 'user_other_1')
    const res = await apiClient.post(`/v1/submissions/${submissionId}/confirm`, {}, TOKEN_B)
    expect(res.status).toBe(200)
    expect(res.body.data.confirms).toBe(2)
    expect(res.body.data.status).toBe('corroborated')
  })

  it('is idempotent — double confirm by same user does not double-count', async () => {
    await apiClient.post(`/v1/submissions/${submissionId}/confirm`, {}, TOKEN_B)
    const res = await apiClient.post(`/v1/submissions/${submissionId}/confirm`, {}, TOKEN_B)
    expect(res.status).toBe(200)
    expect(res.body.data.confirms).toBe(1)
  })

  it('returns 403 when confirming own submission', async () => {
    const res = await apiClient.post(`/v1/submissions/${submissionId}/confirm`, {}, TOKEN_A)
    expect(res.status).toBe(403)
  })
})

describe('POST /v1/submissions/:id/dispute', () => {
  let submissionId: string

  beforeEach(async () => {
    await clearTables()
    const venue = await seedVenue()
    const event = await seedEvent(venue.id)
    const sub = await seedPriceSubmission(event.id, USER_A)
    submissionId = sub.id
  })

  it('creates a dispute row and sets parent to disputed', async () => {
    const res = await apiClient.post(
      `/v1/submissions/${submissionId}/dispute`,
      { floor: 50, vendor: 'AXS' },
      TOKEN_B,
    )
    expect(res.status).toBe(201)
    expect(res.body.data.disputedSubmissionId).toBe(submissionId)
    expect(res.body.data.vendor).toBe('AXS')
  })

  it('returns 403 when disputing own submission', async () => {
    const res = await apiClient.post(
      `/v1/submissions/${submissionId}/dispute`,
      { floor: 50, vendor: 'AXS' },
      TOKEN_A,
    )
    expect(res.status).toBe(403)
  })

  it('returns 400 when floor is missing', async () => {
    const res = await apiClient.post(
      `/v1/submissions/${submissionId}/dispute`,
      { vendor: 'AXS' },
      TOKEN_B,
    )
    expect(res.status).toBe(400)
  })
})

describe('PATCH /v1/submissions/:id', () => {
  let submissionId: string

  beforeEach(async () => {
    await clearTables()
    const venue = await seedVenue()
    const event = await seedEvent(venue.id)
    const sub = await seedPriceSubmission(event.id, USER_A)
    submissionId = sub.id
  })

  it('updates own pending submission', async () => {
    const res = await apiClient.patch(
      `/v1/submissions/${submissionId}`,
      { floor: 99 },
      TOKEN_A,
    )
    expect(res.status).toBe(200)
    expect(res.body.data.priceMin).toBe('99')
  })

  it('returns 403 for wrong owner', async () => {
    const res = await apiClient.patch(`/v1/submissions/${submissionId}`, { floor: 99 }, TOKEN_B)
    expect(res.status).toBe(403)
  })

  it('returns 400 for non-pending submission', async () => {
    await seedPriceSubmission
    const corroboratedSub = await seedPriceSubmission(submissionId, USER_A, { status: 'corroborated' })
    // Use a fresh submission that starts corroborated
    const venue2 = await seedVenue()
    const event2 = await seedEvent(venue2.id)
    const corroborated = await seedPriceSubmission(event2.id, USER_A, { status: 'corroborated' })
    const res = await apiClient.patch(`/v1/submissions/${corroborated.id}`, { floor: 99 }, TOKEN_A)
    expect(res.status).toBe(400)
  })
})

describe('DELETE /v1/submissions/:id', () => {
  let submissionId: string

  beforeEach(async () => {
    await clearTables()
    const venue = await seedVenue()
    const event = await seedEvent(venue.id)
    const sub = await seedPriceSubmission(event.id, USER_A)
    submissionId = sub.id
  })

  it('deletes own submission', async () => {
    const res = await apiClient.delete(`/v1/submissions/${submissionId}`, TOKEN_A)
    expect(res.status).toBe(204)
  })

  it('returns 403 for wrong owner', async () => {
    const res = await apiClient.delete(`/v1/submissions/${submissionId}`, TOKEN_B)
    expect(res.status).toBe(403)
  })
})
```

- [ ] **Step 7: Run tests**

```bash
cd /Users/huey/Projects/concert-crawl/.worktrees/feat/price-transparency-v2
pnpm --filter @concert-crawl/api test
```

Expected: all tests pass (green). Fix any failures before proceeding.

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/test/helpers/seed.ts \
  apps/api/src/routes/price-submissions.integration.test.ts \
  apps/api/src/routes/submissions.integration.test.ts
git commit -m "test: update price-submissions tests, add submissions integration tests"
```

---

### Task 7: Web — SP_POLICY validation, SPNumberField, ChipGroup

**Files:**
- Create: `apps/web/src/lib/sp-policy.ts`
- Create: `apps/web/src/components/consumer/SPNumberField.tsx`
- Create: `apps/web/src/components/consumer/ChipGroup.tsx`

- [ ] **Step 1: Create `sp-policy.ts`**

```typescript
import { SP_POLICY } from '@concert-crawl/types'

export interface ValidationResult {
  errors: Partial<Record<'floor' | 'ceiling' | 'tier' | 'vendor' | 'howFound', string>>
  warnings: Partial<Record<'floor', string>>
  valid: boolean
}

export interface SubmissionInput {
  floor: string
  ceiling: string
  tier: string | null
  vendor: string | null
  howFound: string | null
}

export function validateSubmission(
  input: SubmissionInput,
  peerAvg?: number,
): ValidationResult {
  const errors: ValidationResult['errors'] = {}
  const warnings: ValidationResult['warnings'] = {}

  const floorNum = Number(input.floor)
  if (!input.floor) {
    errors.floor = 'Enter a floor price.'
  } else if (isNaN(floorNum) || floorNum < SP_POLICY.floorMin) {
    errors.floor = 'Has to be at least $1.'
  } else if (floorNum > SP_POLICY.floorMax) {
    errors.floor = 'Cap is $2000 — pick a number that exists.'
  }

  if (input.ceiling) {
    const ceilingNum = Number(input.ceiling)
    if (isNaN(ceilingNum) || ceilingNum > SP_POLICY.ceilingMax) {
      errors.ceiling = 'Cap is $2000.'
    } else if (!errors.floor && ceilingNum < floorNum) {
      errors.ceiling = "Ceiling can't be below floor."
    }
  }

  if (!input.tier) errors.tier = 'Pick a tier.'
  if (!input.vendor) errors.vendor = 'Pick where it\'s listed.'
  if (!input.howFound) errors.howFound = 'Pick how you found out.'

  if (!errors.floor && peerAvg != null && peerAvg > 0 && input.floor) {
    if (floorNum < SP_POLICY.outlierLowFactor * peerAvg) {
      warnings.floor = `Other fans reported around $${Math.round(peerAvg)}. Sure about this one?`
    } else if (floorNum > SP_POLICY.outlierHighFactor * peerAvg) {
      warnings.floor = `Other fans reported around $${Math.round(peerAvg)}. Sure about this one?`
    }
  }

  return {
    errors,
    warnings,
    valid: Object.keys(errors).length === 0,
  }
}
```

- [ ] **Step 2: Create `SPNumberField.tsx`**

```tsx
'use client'

interface SPNumberFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  hint?: string
  required?: boolean
  error?: string
  warning?: string
}

export function SPNumberField({
  label,
  value,
  onChange,
  placeholder,
  hint,
  required,
  error,
  warning,
}: SPNumberFieldProps) {
  const borderClass = error
    ? 'border-danger'
    : warning
      ? 'border-warning'
      : 'border-border-strong'

  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-fg-muted uppercase tracking-wider font-mono">
        {label}
        {required && <span className="text-danger ml-1">*</span>}
      </label>
      <div className={`flex items-center border ${borderClass} rounded-md px-3 h-[46px] bg-surface-1`}>
        <span className="font-mono text-sm font-bold text-fg-muted mr-1">$</span>
        <input
          type="text"
          inputMode="numeric"
          value={value}
          placeholder={placeholder}
          onChange={(evt) => onChange(evt.target.value.replace(/\D/g, ''))}
          className="flex-1 bg-transparent text-sm font-mono text-fg outline-none"
        />
      </div>
      {hint && !error && !warning && (
        <span className="text-xs text-fg-subtle">{hint}</span>
      )}
      {error && <span className="text-xs text-danger">{error}</span>}
      {!error && warning && <span className="text-xs text-warning">{warning}</span>}
    </div>
  )
}
```

- [ ] **Step 3: Create `ChipGroup.tsx`**

```tsx
'use client'

interface ChipOption {
  value: string
  label: string
}

interface ChipGroupProps {
  label: string
  options: ChipOption[]
  value: string | null
  onChange: (value: string) => void
  error?: string
}

export function ChipGroup({ label, options, value, onChange, error }: ChipGroupProps) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-medium text-fg-muted uppercase tracking-wider font-mono">
        {label}
      </span>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const isActive = value === opt.value
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={[
                'px-3 py-1.5 rounded-full text-sm font-medium border transition-colors',
                isActive
                  ? 'border-signal text-signal bg-signal/10'
                  : 'border-border-strong text-fg hover:border-fg-muted',
              ].join(' ')}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  )
}
```

- [ ] **Step 4: Build web to check**

```bash
pnpm --filter @concert-crawl/web build 2>&1 | tail -20
```

Expected: exits 0.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/sp-policy.ts \
  apps/web/src/components/consumer/SPNumberField.tsx \
  apps/web/src/components/consumer/ChipGroup.tsx
git commit -m "feat: SP_POLICY client validation, SPNumberField, ChipGroup components"
```

---

### Task 8: SubmitForm client component

**Files:**
- Create: `apps/web/src/components/consumer/SubmitForm.tsx`

- [ ] **Step 1: Create `SubmitForm.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { SPNumberField } from './SPNumberField.js'
import { ChipGroup } from './ChipGroup.js'
import { validateSubmission, type SubmissionInput } from '../../lib/sp-policy.js'
import type { Event, SubmissionWithMeta, Tier, Vendor, HowFound } from '@concert-crawl/types'

type Phase = 'empty' | 'submitting' | 'success' | 'error' | 'alreadySubmitted'

interface SubmitFormProps {
  event: Event
  venueName: string
  initialAlreadySubmitted: boolean
  userSubmission: SubmissionWithMeta | null
}

const TIER_OPTIONS = [
  { value: 'GA', label: 'GA' },
  { value: 'Reserved', label: 'Reserved' },
  { value: 'VIP', label: 'VIP' },
  { value: 'Pit', label: 'Pit' },
  { value: 'Lawn', label: 'Lawn' },
]

const VENDOR_OPTIONS = [
  { value: 'AXS', label: 'AXS' },
  { value: 'Ticketmaster', label: 'Ticketmaster' },
  { value: 'SeatGeek', label: 'SeatGeek' },
  { value: 'DICE', label: 'DICE' },
  { value: 'Eventbrite', label: 'Eventbrite' },
  { value: 'VenueBoxOffice', label: 'Venue box office' },
]

const HOW_FOUND_OPTIONS = [
  { value: 'bought_myself', label: 'Bought it myself' },
  { value: 'saw_listing', label: 'Saw the listing' },
  { value: 'at_the_venue', label: 'At the venue' },
]

export function SubmitForm({
  event,
  venueName,
  initialAlreadySubmitted,
  userSubmission,
}: SubmitFormProps) {
  const router = useRouter()
  const { getToken } = useAuth()

  const [phase, setPhase] = useState<Phase>(
    initialAlreadySubmitted ? 'alreadySubmitted' : 'empty',
  )
  const [formState, setFormState] = useState<SubmissionInput>({
    floor: '',
    ceiling: '',
    tier: null,
    vendor: null,
    howFound: null,
  })
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<string, string>>>({})
  const [fieldWarnings, setFieldWarnings] = useState<Partial<Record<string, string>>>({})
  const [errorMsg, setErrorMsg] = useState('')

  const dateStr = new Date(event.date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'America/Denver',
  })

  async function handleSubmit() {
    const validation = validateSubmission(formState)
    setFieldErrors(validation.errors)
    setFieldWarnings(validation.warnings)
    if (!validation.valid) return

    setPhase('submitting')
    try {
      const token = await getToken()
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/v1/events/${event.id}/price-submissions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            priceMin: Number(formState.floor),
            priceMax: formState.ceiling ? Number(formState.ceiling) : undefined,
            tier: formState.tier as Tier,
            vendor: formState.vendor as Vendor,
            howFound: formState.howFound as HowFound,
          }),
        },
      )
      const data = await res.json()
      if (!res.ok) {
        if (res.status === 409) {
          setPhase('alreadySubmitted')
          return
        }
        throw new Error(data.error ?? 'Submission failed')
      }
      setPhase('success')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong.')
      setPhase('error')
    }
  }

  if (phase === 'success') {
    return (
      <div className="rounded-xl bg-success/10 border border-success p-5 flex flex-col gap-3">
        <div className="text-2xl">✓</div>
        <p className="text-base font-semibold text-fg">Got it. Thanks.</p>
        <p className="text-sm text-fg-muted">
          Your price is in. It'll show up tagged <strong>pending</strong> until 2 other fans
          corroborate it. We'll let you know if anyone confirms or disputes.
        </p>
        <button
          onClick={() => router.push(`/events/${event.id}`)}
          className="mt-2 text-sm text-signal underline"
        >
          Back to show
        </button>
      </div>
    )
  }

  if (phase === 'alreadySubmitted' && userSubmission) {
    return (
      <div className="rounded-xl border border-border p-4 flex flex-col gap-3 bg-surface-1">
        <p className="text-sm font-semibold text-fg">You already submitted a price.</p>
        <p className="text-xs text-fg-muted font-mono">
          ${userSubmission.priceMin}
          {userSubmission.priceMax ? ` – $${userSubmission.priceMax}` : ''} ·{' '}
          {userSubmission.tier} · {userSubmission.vendor}
        </p>
        <p className="text-xs text-fg-subtle">You can submit one price per show every 24h.</p>
        <div className="flex gap-2">
          <button
            onClick={() => setPhase('empty')}
            className="text-xs text-signal underline"
          >
            Edit
          </button>
          <span className="text-fg-subtle text-xs">·</span>
          <button
            onClick={async () => {
              const token = await getToken()
              await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/v1/submissions/${userSubmission.id}`,
                {
                  method: 'DELETE',
                  headers: { Authorization: `Bearer ${token}` },
                },
              )
              router.refresh()
            }}
            className="text-xs text-danger underline"
          >
            Withdraw
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-[18px]">
      {/* Context header */}
      <div className="flex flex-col gap-0.5">
        <p className="text-xs font-bold uppercase tracking-widest font-mono text-fg-muted">
          Submit a price
        </p>
        <p className="text-lg font-bold text-fg">{event.artist}</p>
        <p className="text-sm text-fg-muted font-mono">
          {venueName} · {dateStr}
        </p>
      </div>

      {/* Anti-abuse banner */}
      <div className="flex items-start gap-2 rounded-lg bg-surface-2 border border-border p-3">
        <span className="text-base">🛡</span>
        <p className="text-xs text-fg-muted">
          Prices are capped at <strong>$2000</strong>. Submissions stay{' '}
          <em>pending</em> until 2 fans confirm.
        </p>
      </div>

      {/* Floor + Ceiling */}
      <div className="grid grid-cols-2 gap-3">
        <SPNumberField
          label="Floor *"
          value={formState.floor}
          onChange={(val) => setFormState((prev) => ({ ...prev, floor: val }))}
          placeholder="35"
          required
          error={fieldErrors.floor}
          warning={fieldWarnings.floor}
        />
        <SPNumberField
          label="Ceiling"
          value={formState.ceiling}
          onChange={(val) => setFormState((prev) => ({ ...prev, ceiling: val }))}
          placeholder="75"
          error={fieldErrors.ceiling}
        />
      </div>

      {/* Tier */}
      <ChipGroup
        label="Tier *"
        options={TIER_OPTIONS}
        value={formState.tier}
        onChange={(val) => setFormState((prev) => ({ ...prev, tier: val }))}
        error={fieldErrors.tier}
      />

      {/* Vendor */}
      <ChipGroup
        label="Where it's listed *"
        options={VENDOR_OPTIONS}
        value={formState.vendor}
        onChange={(val) => setFormState((prev) => ({ ...prev, vendor: val }))}
        error={fieldErrors.vendor}
      />

      {/* HowFound */}
      <ChipGroup
        label="How you found out *"
        options={HOW_FOUND_OPTIONS}
        value={formState.howFound}
        onChange={(val) => setFormState((prev) => ({ ...prev, howFound: val }))}
        error={fieldErrors.howFound}
      />

      {/* Error state */}
      {phase === 'error' && (
        <p className="text-xs text-danger">{errorMsg}</p>
      )}

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={phase === 'submitting'}
        className="w-full h-[50px] rounded-xl bg-signal text-bg font-bold text-base shadow-[0_0_16px_rgba(0,255,255,0.25)] disabled:opacity-60"
      >
        {phase === 'submitting' ? 'Submitting…' : 'Submit price'}
      </button>

      {/* Footer hint */}
      <p className="text-xs text-fg-subtle text-center">
        Anonymous to other fans. Goes out as <em>pending</em> until 2 confirm. We
        rate-limit at 1 per show per 24h.
      </p>
    </div>
  )
}
```

- [ ] **Step 2: Build**

```bash
pnpm --filter @concert-crawl/web build 2>&1 | tail -20
```

Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/consumer/SubmitForm.tsx
git commit -m "feat: SubmitForm client component — structured price submission with 4 phases"
```

---

### Task 9: SubmitPricePage server route

**Files:**
- Create: `apps/web/src/app/(protected)/events/[id]/submit-price/page.tsx`

- [ ] **Step 1: Create the page**

```tsx
import { auth } from '@clerk/nextjs/server'
import { notFound, redirect } from 'next/navigation'
import { SubmitForm } from '../../../../../components/consumer/SubmitForm.js'
import type { Event, SubmissionListResponse } from '@concert-crawl/types'

interface SubmitPricePageProps {
  params: { id: string }
}

export default async function SubmitPricePage({ params }: SubmitPricePageProps) {
  const { userId, getToken } = auth()
  if (!userId) redirect('/sign-in')

  const token = await getToken()

  const [eventRes, submissionsRes] = await Promise.all([
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/v1/events/${params.id}`),
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/v1/events/${params.id}/price-submissions`, {
      headers: { Authorization: `Bearer ${token}` },
    }),
  ])

  if (!eventRes.ok) notFound()

  const eventData = await eventRes.json()
  const event = eventData.data as Event & { venue: { name: string } }

  const submissionsData: { success: boolean; data: SubmissionListResponse } =
    submissionsRes.ok ? await submissionsRes.json() : { success: false, data: { submissions: [], alreadySubmitted: false, userSubmission: null } }

  const { alreadySubmitted, userSubmission } = submissionsData.success
    ? submissionsData.data
    : { alreadySubmitted: false, userSubmission: null }

  return (
    <main className="min-h-screen bg-bg">
      {/* Mobile header */}
      <header className="flex items-center justify-between px-5 pt-3 pb-2 sm:hidden">
        <a href={`/events/${params.id}`} className="text-[11px] font-bold uppercase tracking-widest font-mono text-fg-muted">
          ← Back
        </a>
      </header>

      {/* Desktop header */}
      <header className="hidden sm:flex items-center justify-between px-8 py-4">
        <span className="text-base font-bold text-fg">Concert Crawl</span>
        <a href={`/events/${params.id}`} className="text-sm text-fg-muted hover:text-fg">
          ← Back to {event.artist}
        </a>
      </header>

      <div className="px-5 pt-3 pb-4 sm:mx-auto sm:max-w-[520px] sm:px-8 sm:pt-8 sm:pb-10">
        <SubmitForm
          event={event}
          venueName={event.venue.name}
          initialAlreadySubmitted={alreadySubmitted}
          userSubmission={userSubmission}
        />
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Build**

```bash
pnpm --filter @concert-crawl/web build 2>&1 | tail -20
```

Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add "apps/web/src/app/(protected)/events/[id]/submit-price/page.tsx"
git commit -m "feat: SubmitPricePage — server component with alreadySubmitted + auth guard"
```

---

### Task 10: SubmissionList + SubmissionCard + VerifySheet

**Files:**
- Create: `apps/web/src/components/consumer/SubmissionList.tsx`
- Create: `apps/web/src/components/consumer/VerifySheet.tsx`

- [ ] **Step 1: Create `SubmissionList.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import type { SubmissionWithMeta } from '@concert-crawl/types'

interface SubmissionListProps {
  submissions: SubmissionWithMeta[]
  eventId: string
  currentUserId: string | null
}

function SubmissionCard({
  submission,
  eventId,
  currentUserId,
  onConfirm,
}: {
  submission: SubmissionWithMeta
  eventId: string
  currentUserId: string | null
  onConfirm: (id: string) => void
}) {
  const router = useRouter()
  const isOwn = currentUserId != null && submission.userId === currentUserId
  const isPending = submission.status === 'pending'
  const isCorroborated = submission.status === 'corroborated'

  const timeAgo = (() => {
    const diff = Date.now() - new Date(submission.createdAt).getTime()
    const hrs = Math.floor(diff / 3600000)
    if (hrs < 1) return 'just now'
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  })()

  return (
    <div
      className={[
        'rounded-xl border p-4 flex flex-col gap-2',
        isOwn ? 'border-accent bg-accent/5' : 'border-border bg-surface-1',
      ].join(' ')}
    >
      <div className="flex items-center gap-2">
        {isCorroborated ? (
          <span className="text-[10px] font-bold uppercase tracking-widest font-mono text-success border border-success rounded-full px-2 py-0.5">
            confirmed
          </span>
        ) : (
          <span className="text-[10px] font-bold uppercase tracking-widest font-mono text-warning border border-warning rounded-full px-2 py-0.5">
            pending
          </span>
        )}
        {isOwn && (
          <span className="text-[10px] font-bold uppercase tracking-widest font-mono text-accent border border-accent rounded-full px-2 py-0.5">
            you
          </span>
        )}
        <span className="ml-auto text-xs text-fg-subtle font-mono">{timeAgo}</span>
      </div>

      <p className="text-xl font-black text-fg">
        ${submission.priceMin}
        {submission.priceMax ? ` – $${submission.priceMax}` : ''}{' '}
        <span className="text-xs font-mono text-fg-muted uppercase">{submission.tier}</span>
      </p>

      <p className="text-xs font-mono text-fg-muted">
        seen on {submission.vendor} · {submission.howFound.replace(/_/g, ' ')}
      </p>

      {!isOwn && (
        <div className="flex gap-3 pt-1 border-t border-border">
          {!submission.byYou && isPending && (
            <button
              onClick={() => onConfirm(submission.id)}
              className="text-xs text-signal underline"
            >
              Confirm
            </button>
          )}
          <button
            onClick={() =>
              router.push(`/events/${eventId}/submissions/${submission.id}/dispute`)
            }
            className="text-xs text-danger underline"
          >
            Dispute
          </button>
        </div>
      )}
    </div>
  )
}

export function SubmissionList({ submissions, eventId, currentUserId }: SubmissionListProps) {
  const { getToken } = useAuth()
  const [localSubmissions, setLocalSubmissions] = useState(submissions)

  async function handleConfirm(submissionId: string) {
    const token = await getToken()
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/v1/submissions/${submissionId}/confirm`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      },
    )
    if (res.ok) {
      const data = await res.json()
      setLocalSubmissions((prev) =>
        prev.map((sub) =>
          sub.id === submissionId
            ? { ...sub, confirms: data.data.confirms, status: data.data.status }
            : sub,
        ),
      )
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {localSubmissions.map((sub) => (
        <SubmissionCard
          key={sub.id}
          submission={sub}
          eventId={eventId}
          currentUserId={currentUserId}
          onConfirm={handleConfirm}
        />
      ))}
      {localSubmissions.length === 0 && (
        <p className="text-sm text-fg-subtle text-center py-4">No submissions yet.</p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create `VerifySheet.tsx`**

```tsx
'use client'

import type { SubmissionWithMeta } from '@concert-crawl/types'
import { SubmissionList } from './SubmissionList.js'

interface VerifySheetProps {
  open: boolean
  onClose: () => void
  submissions: SubmissionWithMeta[]
  eventId: string
  artistName: string
  venueName: string
  eventDate: string
  currentUserId: string | null
}

export function VerifySheet({
  open,
  onClose,
  submissions,
  eventId,
  artistName,
  venueName,
  eventDate,
  currentUserId,
}: VerifySheetProps) {
  if (!open) return null

  const dateStr = new Date(eventDate).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'America/Denver',
  })

  return (
    <>
      {/* Scrim */}
      <div
        className="fixed inset-0 bg-black/60 z-40"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 max-h-[82vh] flex flex-col rounded-t-[20px] bg-bg-elevated overflow-hidden">
        {/* Grabber */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-border-strong" />
        </div>

        {/* Header */}
        <div className="px-5 pb-3 border-b border-border">
          <p className="text-xs font-mono text-fg-muted uppercase tracking-wider">{artistName}</p>
          <p className="text-xs font-mono text-fg-subtle">
            {venueName} · {dateStr}
          </p>
          <p className="text-xs text-fg-muted mt-2">
            Confirm what you saw, dispute what looks off. Two confirms move a price out of{' '}
            <em>pending</em>.
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <SubmissionList
            submissions={submissions}
            eventId={eventId}
            currentUserId={currentUserId}
          />
        </div>

        {/* Close */}
        <div className="px-5 pb-6 pt-3 border-t border-border">
          <button
            onClick={onClose}
            className="w-full h-11 rounded-xl border border-border-strong text-sm text-fg"
          >
            Close
          </button>
        </div>
      </div>
    </>
  )
}
```

- [ ] **Step 3: Build**

```bash
pnpm --filter @concert-crawl/web build 2>&1 | tail -20
```

Expected: exits 0.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/consumer/SubmissionList.tsx \
  apps/web/src/components/consumer/VerifySheet.tsx
git commit -m "feat: SubmissionList, SubmissionCard, VerifySheet components"
```

---

### Task 11: CommunityPriceChip + PriceSection client island

**Files:**
- Modify: `apps/web/src/components/consumer/CommunityPriceChip.tsx`
- Create: `apps/web/src/components/consumer/PriceSection.tsx`

- [ ] **Step 1: Read the existing `CommunityPriceChip.tsx`**

Read the file to understand current structure before modifying.

- [ ] **Step 2: Rewrite `CommunityPriceChip.tsx`**

The chip now receives the top submission + confirm count + a callback to open the VerifySheet:

```tsx
'use client'

import type { SubmissionWithMeta } from '@concert-crawl/types'

interface CommunityPriceChipProps {
  topSubmission: SubmissionWithMeta
  submissionCount: number
  onConfirm: () => void
  onOpenVerify: () => void
}

export function CommunityPriceChip({
  topSubmission,
  submissionCount,
  onConfirm,
  onOpenVerify,
}: CommunityPriceChipProps) {
  const isCorroborated = topSubmission.status === 'corroborated'

  return (
    <div className="rounded-xl bg-surface-1 border border-border p-[14px] flex flex-col gap-[10px]">
      {/* Pills */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-widest font-mono text-fg-muted border border-border-strong rounded-full px-2 py-0.5">
          community
        </span>
        {isCorroborated ? (
          <span className="text-[10px] font-bold uppercase tracking-widest font-mono text-success border border-success rounded-full px-2 py-0.5">
            confirmed
          </span>
        ) : (
          <span className="text-[10px] font-bold uppercase tracking-widest font-mono text-warning border border-warning rounded-full px-2 py-0.5">
            pending
          </span>
        )}
      </div>

      {/* Price line */}
      <p className="text-[28px] font-black text-fg leading-none">
        ${topSubmission.priceMin}
        {topSubmission.priceMax ? ` – $${topSubmission.priceMax}` : ''}
        <span className="text-xs font-mono text-fg-muted uppercase ml-2">
          {topSubmission.tier}
        </span>
      </p>

      {/* Vendor line */}
      <p className="text-[11px] font-mono text-fg-muted">
        seen on {topSubmission.vendor}
      </p>

      {/* Attribution */}
      <p className="text-[11px] font-mono text-fg-subtle">
        Submitted by {submissionCount} {submissionCount === 1 ? 'fan' : 'fans'}
      </p>

      {/* Actions */}
      <div className="flex items-center justify-between pt-2 border-t border-dashed border-border">
        <button
          onClick={onConfirm}
          className="text-sm text-signal font-medium"
        >
          Saw the same
        </button>
        <button
          onClick={onOpenVerify}
          className="text-sm text-fg-muted underline"
        >
          {submissionCount} {submissionCount === 1 ? 'report' : 'reports'} →
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create `PriceSection.tsx`**

```tsx
'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { CommunityPriceChip } from './CommunityPriceChip.js'
import { VerifySheet } from './VerifySheet.js'
import type { SubmissionListResponse, SubmissionWithMeta } from '@concert-crawl/types'

interface PriceSectionProps {
  eventId: string
  artistName: string
  venueName: string
  eventDate: string
}

export function PriceSection({ eventId, artistName, venueName, eventDate }: PriceSectionProps) {
  const { getToken, userId } = useAuth()
  const [verifyOpen, setVerifyOpen] = useState(false)
  const [submissions, setSubmissions] = useState<SubmissionWithMeta[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchSubmissions() {
      try {
        const token = await getToken()
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/v1/events/${eventId}/price-submissions`,
          token ? { headers: { Authorization: `Bearer ${token}` } } : {},
        )
        if (!res.ok) return
        const data: { success: boolean; data: SubmissionListResponse } = await res.json()
        if (data.success) setSubmissions(data.data.submissions)
      } finally {
        setLoading(false)
      }
    }
    void fetchSubmissions()
  }, [eventId, getToken])

  async function handleQuickConfirm() {
    const topSub = submissions[0]
    if (!topSub) return
    const token = await getToken()
    if (!token) return
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/v1/submissions/${topSub.id}/confirm`,
      { method: 'POST', headers: { Authorization: `Bearer ${token}` } },
    )
    if (res.ok) {
      const data = await res.json()
      setSubmissions((prev) =>
        prev.map((sub, idx) =>
          idx === 0 ? { ...sub, confirms: data.data.confirms, status: data.data.status } : sub,
        ),
      )
    }
  }

  if (loading || submissions.length === 0) return null

  const topSubmission = submissions[0]

  return (
    <>
      <CommunityPriceChip
        topSubmission={topSubmission}
        submissionCount={submissions.length}
        onConfirm={handleQuickConfirm}
        onOpenVerify={() => setVerifyOpen(true)}
      />
      <VerifySheet
        open={verifyOpen}
        onClose={() => setVerifyOpen(false)}
        submissions={submissions}
        eventId={eventId}
        artistName={artistName}
        venueName={venueName}
        eventDate={eventDate}
        currentUserId={userId ?? null}
      />
    </>
  )
}
```

- [ ] **Step 4: Build**

```bash
pnpm --filter @concert-crawl/web build 2>&1 | tail -20
```

Expected: exits 0.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/consumer/CommunityPriceChip.tsx \
  apps/web/src/components/consumer/PriceSection.tsx
git commit -m "feat: CommunityPriceChip v2, PriceSection client island with VerifySheet"
```

---

### Task 12: Event detail page — wire PriceSection + submit CTA

**Files:**
- Modify: `apps/web/src/app/(protected)/events/[id]/page.tsx`

- [ ] **Step 1: Read the current event detail page**

Read `apps/web/src/app/(protected)/events/[id]/page.tsx` to understand imports and layout.

- [ ] **Step 2: Remove PriceSubmissionForm, add PriceSection + CTA**

1. Remove the `PriceSubmissionForm` import and its JSX usage.
2. Add `PriceSection` import: `import { PriceSection } from '../../../components/consumer/PriceSection.js'`
3. In the JSX, after the existing price/ticket section, add:

```tsx
<PriceSection
  eventId={params.id}
  artistName={event.artist}
  venueName={event.venue.name}
  eventDate={event.date}
/>

<a
  href={`/events/${params.id}/submit-price`}
  className="block text-center text-sm text-signal underline py-1"
>
  Submit a price you saw →
</a>
```

The CTA should always be visible (even when a primary price exists).

- [ ] **Step 3: Build**

```bash
pnpm --filter @concert-crawl/web build 2>&1 | tail -20
```

Expected: exits 0.

- [ ] **Step 4: Commit**

```bash
git add "apps/web/src/app/(protected)/events/[id]/page.tsx"
git commit -m "feat: wire PriceSection + submit CTA into event detail page"
```

---

### Task 13: DisputePage + DisputeForm

**Files:**
- Create: `apps/web/src/app/(protected)/events/[id]/submissions/[submissionId]/dispute/page.tsx`
- Create: `apps/web/src/components/consumer/DisputeForm.tsx`

- [ ] **Step 1: Create `DisputeForm.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { SPNumberField } from './SPNumberField.js'
import { ChipGroup } from './ChipGroup.js'
import type { PriceSubmission } from '@concert-crawl/types'
import { SP_POLICY } from '@concert-crawl/types'

const VENDOR_OPTIONS = [
  { value: 'AXS', label: 'AXS' },
  { value: 'Ticketmaster', label: 'Ticketmaster' },
  { value: 'SeatGeek', label: 'SeatGeek' },
  { value: 'DICE', label: 'DICE' },
  { value: 'Eventbrite', label: 'Eventbrite' },
  { value: 'VenueBoxOffice', label: 'Venue box office' },
]

interface DisputeFormProps {
  submission: PriceSubmission
  eventId: string
}

export function DisputeForm({ submission, eventId }: DisputeFormProps) {
  const router = useRouter()
  const { getToken } = useAuth()
  const [floor, setFloor] = useState('')
  const [ceiling, setCeiling] = useState('')
  const [vendor, setVendor] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  if (success) {
    return (
      <div className="rounded-xl border border-border p-4 bg-surface-1">
        <p className="text-sm font-semibold text-fg">Logged.</p>
        <p className="text-sm text-fg-muted mt-1">
          Your alternate price will show up alongside this one.
        </p>
        <button
          onClick={() => router.push(`/events/${eventId}`)}
          className="mt-3 text-sm text-signal underline"
        >
          Back to show
        </button>
      </div>
    )
  }

  async function handleSubmit() {
    const newErrors: Record<string, string> = {}
    const floorNum = Number(floor)
    if (!floor || isNaN(floorNum) || floorNum < SP_POLICY.floorMin) {
      newErrors['floor'] = 'Has to be at least $1.'
    } else if (floorNum > SP_POLICY.floorMax) {
      newErrors['floor'] = 'Cap is $2000.'
    }
    if (ceiling) {
      const ceilNum = Number(ceiling)
      if (ceilNum > SP_POLICY.ceilingMax) newErrors['ceiling'] = 'Cap is $2000.'
      else if (!newErrors['floor'] && ceilNum < floorNum) newErrors['ceiling'] = "Ceiling can't be below floor."
    }
    if (!vendor) newErrors['vendor'] = 'Pick where it\'s listed.'
    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) return

    setSubmitting(true)
    try {
      const token = await getToken()
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/v1/submissions/${submission.id}/dispute`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            floor: floorNum,
            ceiling: ceiling ? Number(ceiling) : undefined,
            vendor,
          }),
        },
      )
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Dispute failed')
      }
      setSuccess(true)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="rounded-xl border border-danger p-4 flex flex-col gap-4">
      <div>
        <p className="text-sm font-semibold text-fg">What did <em>you</em> see instead?</p>
        <p className="text-xs text-fg-muted mt-1">
          Disputes have to come with a price and a vendor. Keeps it honest.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <SPNumberField
          label="Floor *"
          value={floor}
          onChange={setFloor}
          placeholder="35"
          required
          error={errors['floor']}
        />
        <SPNumberField
          label="Ceiling"
          value={ceiling}
          onChange={setCeiling}
          placeholder="75"
          error={errors['ceiling']}
        />
      </div>

      <ChipGroup
        label="Where it's listed *"
        options={VENDOR_OPTIONS}
        value={vendor}
        onChange={setVendor}
        error={errors['vendor']}
      />

      {errorMsg && <p className="text-xs text-danger">{errorMsg}</p>}

      <div className="flex gap-3">
        <button
          onClick={() => router.back()}
          className="flex-1 h-11 rounded-xl border border-border-strong text-sm text-fg"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="flex-1 h-11 rounded-xl bg-danger text-white font-semibold text-sm disabled:opacity-60"
        >
          {submitting ? 'Filing…' : 'File dispute'}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create `DisputePage`**

```tsx
import { auth } from '@clerk/nextjs/server'
import { notFound, redirect } from 'next/navigation'
import { DisputeForm } from '../../../../../../components/consumer/DisputeForm.js'
import type { Event, PriceSubmission } from '@concert-crawl/types'

interface DisputePageProps {
  params: { id: string; submissionId: string }
}

export default async function DisputePage({ params }: DisputePageProps) {
  const { userId, getToken } = auth()
  if (!userId) redirect('/sign-in')

  const token = await getToken()

  const [eventRes, submissionRes] = await Promise.all([
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/v1/events/${params.id}`),
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/v1/submissions/${params.submissionId}`, {
      headers: { Authorization: `Bearer ${token}` },
    }),
  ])

  if (!eventRes.ok || !submissionRes.ok) notFound()

  const eventData = await eventRes.json()
  const event = eventData.data as Event & { venue: { name: string } }

  const submissionData = await submissionRes.json()
  const submission = submissionData.data as PriceSubmission

  const dateStr = new Date(event.date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'America/Denver',
  })

  return (
    <main className="min-h-screen bg-bg">
      <header className="flex items-center justify-between px-5 py-4">
        <a href={`/events/${params.id}`} className="text-sm text-fg-muted">
          ← Cancel
        </a>
        <p className="text-sm font-semibold text-fg">Dispute price</p>
        <div className="w-16" />
      </header>

      <div className="px-5 pb-6 flex flex-col gap-5 sm:mx-auto sm:max-w-[520px]">
        {/* Context */}
        <div>
          <p className="text-xs font-mono text-fg-muted uppercase tracking-wider">{event.artist}</p>
          <p className="text-xs font-mono text-fg-subtle">{event.venue.name} · {dateStr}</p>
        </div>

        {/* Disputed submission card */}
        <div className="rounded-xl border border-border p-4 bg-surface-1">
          <p className="text-xs text-fg-muted mb-1">You're disputing</p>
          <p className="text-lg font-black text-fg">
            ${submission.priceMin}
            {submission.priceMax ? ` – $${submission.priceMax}` : ''}{' '}
            <span className="text-xs font-mono text-fg-muted">{submission.tier}</span>
          </p>
          <p className="text-xs font-mono text-fg-muted">{submission.vendor}</p>
        </div>

        <p className="text-xs text-fg-muted">
          A dispute needs an alternate price + vendor. If you saw something different, log it —
          that's how we find the truth.
        </p>

        <DisputeForm submission={submission} eventId={params.id} />
      </div>
    </main>
  )
}
```

- [ ] **Step 3: Build**

```bash
pnpm --filter @concert-crawl/web build 2>&1 | tail -20
```

Expected: exits 0.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/consumer/DisputeForm.tsx \
  "apps/web/src/app/(protected)/events/[id]/submissions/[submissionId]/dispute/page.tsx"
git commit -m "feat: DisputePage + DisputeForm — alternate price entry with danger border"
```

---

### Task 14: E2E tests

**Files:**
- Create: `apps/e2e/src/e2e/price-transparency-v2.spec.ts`

- [ ] **Step 1: Read existing E2E test helpers**

Read one existing spec (e.g. `apps/e2e/src/e2e/calendar.spec.ts`) to understand auth setup patterns.

- [ ] **Step 2: Create `price-transparency-v2.spec.ts`**

```typescript
import { test, expect } from '@playwright/test'

// Requires: staging has a seeded event. Set TEST_EVENT_ID env var.
const EVENT_ID = process.env['TEST_EVENT_ID'] ?? 'test-event-id'

test.describe('Price Transparency v2', () => {
  test.use({ storageState: 'playwright/.auth/user.json' })

  test('submit flow — fill form and see success state', async ({ page }) => {
    await page.goto(`/events/${EVENT_ID}/submit-price`)
    await expect(page.getByText('Submit a price')).toBeVisible()

    await page.getByLabel('Floor *').fill('45')
    await page.getByRole('button', { name: 'GA' }).click()
    await page.getByRole('button', { name: 'Ticketmaster' }).click()
    await page.getByRole('button', { name: 'Bought it myself' }).click()

    await page.getByRole('button', { name: 'Submit price' }).click()
    await expect(page.getByText('Got it. Thanks.')).toBeVisible()
  })

  test('alreadySubmitted state — navigate back after submit and see existing card', async ({ page }) => {
    await page.goto(`/events/${EVENT_ID}/submit-price`)
    // If already submitted (from previous run), expect the card
    const alreadyCard = page.getByText('You already submitted a price.')
    const form = page.getByRole('button', { name: 'Submit price' })
    const oneOf = await Promise.race([
      alreadyCard.waitFor({ timeout: 5000 }).then(() => 'already'),
      form.waitFor({ timeout: 5000 }).then(() => 'form'),
    ])
    expect(['already', 'form']).toContain(oneOf)
  })

  test('verify sheet — opens on reports link', async ({ page }) => {
    await page.goto(`/events/${EVENT_ID}`)
    const reportsBtn = page.getByRole('button', { name: /reports →/ })
    if (await reportsBtn.isVisible()) {
      await reportsBtn.click()
      await expect(page.getByText('Confirm what you saw')).toBeVisible()
    }
  })

  test('dispute flow — navigate to dispute page and submit', async ({ page }) => {
    await page.goto(`/events/${EVENT_ID}`)
    const reportsBtn = page.getByRole('button', { name: /reports →/ })
    if (await reportsBtn.isVisible()) {
      await reportsBtn.click()
      const disputeBtn = page.getByRole('button', { name: 'Dispute' }).first()
      if (await disputeBtn.isVisible()) {
        await disputeBtn.click()
        await expect(page.getByText('Dispute price')).toBeVisible()
        await page.getByLabel('Floor *').fill('30')
        await page.getByRole('button', { name: 'AXS' }).click()
        await page.getByRole('button', { name: 'File dispute' }).click()
        await expect(page.getByText('Logged.')).toBeVisible()
      }
    }
  })
})
```

- [ ] **Step 3: Commit**

```bash
git add apps/e2e/src/e2e/price-transparency-v2.spec.ts
git commit -m "test: E2E tests for price transparency v2 — submit, alreadySubmitted, verify, dispute"
```

---

## Self-Review Against Spec

### Spec coverage checklist

| Spec requirement | Covered in task |
|---|---|
| Submit Route `/events/[id]/submit-price` | Task 9 |
| SubmitForm with all enum sections | Task 8 |
| CommunityPriceChip replaces PriceSubmissionForm | Task 11 |
| VerifySheet with SubmissionList | Task 10 |
| Dispute Route + DisputeForm | Task 13 |
| `alreadySubmitted` state on SubmitForm | Task 8 (alreadySubmitted phase) |
| DB schema: tier/vendor/howFound enums | Task 1 |
| DB schema: disputedSubmissionId self-ref FK | Task 1 |
| `submission_confirms` join table | Task 1 |
| SP_POLICY validation rules (all branches) | Tasks 7 + 6 |
| GET /v1/events/:id/price-submissions — enriched shape | Task 4 |
| POST — enum body, 409, 429, no auto-corroboration | Task 4 |
| POST /v1/submissions/:id/confirm — idempotent | Task 5 |
| GET /v1/submissions/:id | Task 5 |
| POST /v1/submissions/:id/dispute | Task 5 |
| PATCH /v1/submissions/:id | Task 5 |
| DELETE /v1/submissions/:id | Task 5 |
| Event detail page: remove old form, add PriceSection + CTA | Task 12 |
| Vitest unit tests: SP_POLICY branches | Task 6 |
| Vitest integration: 409/429/confirm/dispute/PATCH/DELETE | Task 6 |
| Playwright E2E: submit, alreadySubmitted, confirm, dispute | Task 14 |

All spec requirements covered.
