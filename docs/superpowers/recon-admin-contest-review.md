# Reconnaissance: Admin Contest-Review UI Bridging Spec

**Date:** June 22, 2026  
**Purpose:** Surface existing admin conventions, contest data model, and API surface for the contest-review UI bridging spec.  
**Status:** Complete — 8 sections + gaps identified.

---

## 1. Existing Admin/Review Page

**Location:** `apps/web/src/app/(protected)/admin/review/page.tsx` (11:73)

### Current Implementation

The review page is an **SSR server component** that fetches initial data before rendering:

- **Initial data (above-the-fold):** 
  - Unverified event flags: `GET /v1/admin/events?verified=false&limit=20` → `EventFlag[]`
  - Pending price submissions: `GET /v1/admin/prices/submissions` → `PriceSubmission[]`
  - Tab counts: `GET /v1/admin/review/counts` → `{ eventFlags, prices, missing }`

- **Below-the-fold:** Client-side query fetches (pagination, filtering)

### Row Display & Columns

**PendingSubmissionsPanel** (`apps/web/src/components/admin/review/PendingSubmissionsPanel.tsx:29–200`) renders submissions in a grid:

| Column | Field(s) | Format |
|--------|----------|--------|
| Event info + user | `eventTitle`, `venueName`, `eventDate`, `userHandle`, `note` | Title · venue · date, clickable ticket URL |
| Price | `priceMin`, `priceMax` | `$100` or `$100–$200` |
| Time | `createdAt` | Relative time ("5m ago") via `RelTime` |
| Actions | `id` | Approve (✓), Deny (✗) buttons |

**Fields in PriceSubmission interface** (`apps/web/src/components/admin/review/ReviewPageClient.tsx:40–53`):
```typescript
interface PriceSubmission {
  id: string
  eventId: string
  userId: string
  priceMin: string | null
  priceMax: string | null
  note?: string | null
  status: string
  createdAt: string
  eventTitle: string | null
  eventDate: string | null
  ticketUrl: string | null
  venueName: string | null
}
```

**No `disputedSubmissionId` field** — this is only in the DB schema, not surfaced to the client page yet.

### Approve/Reject Flow

Handlers are passed as props to `PendingSubmissionsPanel`:
- `onApprove(id)` → `PATCH /v1/admin/prices/submissions/:id` with `{ status: 'corroborated' }`
- `onDeny(id)` → `PATCH /v1/admin/prices/submissions/:id` with `{ status: 'disputed' | 'stale' }`

The buttons are simple — no inline context about contests or counter-submissions yet.

### Hooks/Queries

- `useReviewCounts()` — tab pill counts
- `useReviewEventFlags()`, `useReviewMissingEvents()`, `useReviewPriceEvents()` — paginated list hooks
- `useInvalidateReviewQueries()` — cache invalidation after mutations
- Standard `useAuth()`, `useRouter()`, `useQueryClient()`

---

## 2. Admin Auth + Layout Conventions

**Location:** `apps/web/src/app/(protected)/admin/layout.tsx` (1–102)

### Auth Gate

- **Server-side:** `await requireAdminUser()` on layout (line 30)
- **Returns:** Admin user object with `firstName`, `email`
- **Defined in:** `@/lib/auth` — imported, not directly inspecting Clerk

### Admin Layout Structure

```
AdminLayout (server component)
├── Fetch badge counts from admin API
├── AdminThemeProvider (sets CSS variables)
└── AdminShellClient (client component)
    ├── AdminSidebar (fixed-width, collapsible)
    ├── AdminTopbar (fixed-height header on mobile)
    ├── children (page content)
    └── MobileBottomBar (mobile nav)
```

**Layout vars:** `display: flex; height: 100vh; overflow: hidden`

### Side Nav Structure

**Location:** `apps/web/src/components/admin/shell/nav.ts` (15–75)

Current routes (in order):
1. Dashboard (`/admin`)
2. Venues (`/admin/venues`)
3. Crawl (`/admin/crawl`) — badge: danger
4. Review (`/admin/review`) — badge: warning
5. Feedback (`/admin/feedback`) — badge: signal
6. Users (`/admin/users`) — account section
7. Invite codes (`/admin/invite-codes`) — account section
8. Settings (`/admin/settings`) — account section

### Adding a New Admin Route

To add a new admin page (e.g., contest-review):

1. Create route file: `apps/web/src/app/(protected)/admin/contests/page.tsx`
   - Import `requireAdminUser()` at top
   - Use `AdminLayout` will wrap it automatically
   
2. Add nav entry to `NAV_V2` in `nav.ts`:
   ```typescript
   {
     key: 'contests',
     label: 'Contests',
     href: '/admin/contests',
     iconName: 'Trophy', // or appropriate icon
     badge: { count: 0, kind: 'warning' },
     section: 'operations',
   }
   ```

3. Badge count is dynamic. The spec extends the existing `/v1/admin/review/counts` endpoint (mounted in `apps/api/src/routes/admin/index.ts` at line 61) to add a `contests` field. `apps/web/src/app/(protected)/admin/layout.tsx` already fetches that endpoint via `apiClient.get<ReviewCounts>('/v1/admin/review/counts', token)` — extend the `ReviewCounts` shape to include `contests` and the layout automatically picks it up. Do NOT add a separate `/contests/counts` endpoint.

**All admin routes inherit:**
- Clerk auth middleware
- Admin role check
- Theme provider
- Sidebar + responsive shell

---

## 3. Admin API Endpoints

**Location:** `apps/api/src/routes/admin/prices.ts` (1–476)

### PATCH `/v1/admin/prices/submissions/:id` (258–330)

**Schema:**
```typescript
{
  status: enum['corroborated', 'disputed', 'stale']
}
```

**Transaction Logic:**
1. Lock-for-update fetch: `SELECT id, status, userId, eventId, priceMin, priceMax FROM price_submissions WHERE id = :id`
2. Update status → new value
3. If `status === 'corroborated'` AND was not already corroborated:
   - Award +1 `priceCredScore` to submitter's `user_roles` row
   - Propagate to event: `UPDATE events SET ticketPriceMin, ticketPriceMax, priceSource='community'`
4. Return updated row

**Audit fields set** (lines 324–326):
```typescript
ctx.set('auditActorId', getAuthUser(ctx).userId)
ctx.set('auditAction', 'price.submission.update')
ctx.set('auditTargetId', id)
```

**Status transitions allowed:**
- `pending` → `corroborated`, `disputed`, `stale`
- **No atomicity for parent+challenger rows** — this endpoint only modifies one row at a time

### Related Price-Submission Endpoints

**GET `/v1/admin/prices/submissions`** (195–243)
- Query params: `count` (true→ pagination), `status` (pending|all), `limit`, `offset`
- Returns: Array of submissions with event/venue context
- Default: `status=pending` (ongoing review queue only)

**POST `/v1/admin/prices/submissions`** (370–422)
- Admin manually enters a price (corroborated tier GA)
- Payload: `eventId, priceMin, priceMax, vendor, howFound`
- Writes to `price_submissions` with status='corroborated' immediately
- Propagates to event row
- Audit: `price.submission.admin_add`

**POST `/v1/admin/prices/pipeline/:eventId`** (426–475)
- On-demand price pipeline run
- Returns 202 + message "Pipeline started"
- Audit: `price.pipeline.run`

### No Existing Contest-Resolution Endpoints

The prices API does **not** have:
- A bulk operation for resolving contests
- Parent+challenger atomicity
- Parent submission marking with contest outcomes
- Challenger validation against parent status

---

## 4. Contest Data Model

**Location:** `packages/db/src/schema/prices.ts` (22–126)

### PriceSubmissions Table

```typescript
priceSubmissions = pgTable('price_submissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventId: uuid('event_id')
    .notNull()
    .references(() => events.id, { onDelete: 'cascade' }),
  userId: text('user_id'),
  priceMin: numeric('price_min', { precision: 10, scale: 2 }).notNull(),
  priceMax: numeric('price_max', { precision: 10, scale: 2 }),
  tier: submissionTierEnum('tier').notNull(),
  vendor: submissionVendorEnum('vendor').notNull(),
  howFound: submissionHowFoundEnum('how_found').notNull(),
  sourceCategory: sourceCategoryEnum('source_category'),
  disputedSubmissionId: uuid('disputed_submission_id').references(
    (): AnyPgColumn => priceSubmissions.id,
  ),
  status: priceSubmissionStatusEnum('status').notNull().default('pending'),
  corroborationCount: integer('corroboration_count').notNull().default(1),
  note: varchar('note', { length: 280 }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})
```

### Key Fields for Contests

| Field | Type | Purpose |
|-------|------|---------|
| `disputedSubmissionId` | UUID fk | Parent submission being disputed; NULL if this is the parent |
| `status` | enum | pending, corroborated, disputed, stale |
| `corroborationCount` | int | Number of users who confirmed this price (submitter counts as #1) |
| `note` | varchar(280) | Submitter-provided free-text on submission insert (content-moderated server-side). Distinct from admin's archive reason — that lands on the new `archived_reason` column added in migration 0041. |
| `tier` | enum | GA, Reserved, VIP, Pit, Lawn |
| `vendor` | enum | AXS, Ticketmaster, SeatGeek, DICE, Eventbrite, VenueBoxOffice |

### Status Enum

**Definition:** `pgEnum('price_submission_status', ['pending', 'corroborated', 'disputed', 'stale'])`

- `pending` — awaiting first confirm or admin decision
- `corroborated` — 2+ confirms (1 submitter + 1 other) OR admin approval
- `disputed` — a counter-submission exists (parent marked as disputed when child created)
- `stale` — admin marked as outdated/no-longer-valid

### Confirmation Model (Not Contest-Specific)

**Location:** `packages/db/src/schema/submission-confirms.ts`

```typescript
submissionConfirms = pgTable('submission_confirms', {
  id: uuid('id').primaryKey().defaultRandom(),
  submissionId: uuid('submission_id')
    .notNull()
    .references(() => priceSubmissions.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull(),
  method: text('method')
    .notNull()
    .default('same-vendor'),
  confirmedAt: timestamp('confirmed_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})
```

Constraints:
- Unique on `(submissionId, userId)` — one confirm per user per submission
- `method` values: `same-vendor`, `other-vendor`, `box-office`

### No Partial Indexes on Contests

Searched for indexes — none exist specifically for `WHERE status='disputed'` or parent-child queries. This will impact query performance for contest queues and may need optimization when the feature ships.

---

## 5. Audit Log Conventions

**Location:** `packages/db/src/schema/users.ts` (40–49)

### Audit Log Table

```typescript
auditLog = pgTable('audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  actorId: text('actor_id').notNull(),
  action: text('action').notNull(), // e.g. "venue.create", "user.role.grant"
  targetId: text('target_id'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})
```

### Middleware Pattern

**Location:** `apps/api/src/routes/admin/index.ts` (31–59)

All admin routes write audit logs automatically via **post-response middleware**:

```typescript
adminRouter.use('*', async (ctx, next) => {
  await next()

  // Only write audit log for mutating requests (non-GET/HEAD/OPTIONS)
  if (['GET', 'HEAD', 'OPTIONS'].includes(ctx.req.method)) return

  const action = ctx.get('auditAction')
  const targetId = ctx.get('auditTargetId')
  const actorId = ctx.get('auditActorId')
  const auditMeta = ctx.get('auditMeta') ?? null

  if (action && actorId) {
    try {
      await db.insert(auditLog).values({
        actorId,
        action,
        targetId: targetId ?? null,
        metadata: auditMeta,
      })
    } catch (error) {
      console.error('Failed to write admin audit log', { actorId, action, targetId, error })
    }
  }
})
```

**To write an audit entry, set context vars before returning:**

```typescript
ctx.set('auditActorId', userId)           // Required
ctx.set('auditAction', 'entity.action')   // Required (e.g., 'price.submission.update')
ctx.set('auditTargetId', resourceId)      // Optional
ctx.set('auditMeta', { reason, before, after }) // Optional
return ctx.json({ success: true, data })
```

### Existing Action Types

**Price endpoints:**
- `price.submission.update` (approve/reject) — line 325 in prices.ts
- `price.submission.admin_add` (admin manual entry) — line 418 in prices.ts
- `price.pipeline.run` (on-demand pipeline) — line 468 in prices.ts

**Event endpoints:**
- `event.report.resolve` (resolve event status report)
- `event.bulk_auto_approve` (batch event approval)
- `event.verify` (verify event)
- `event.merge` (merge events) — integration test shows metadata capture: `{ mergedIntoId, mergedFromIds }`
- `event.bulk_unverify` (batch unverify) — integration test shows metadata

### Pattern for Contest Actions

For contest-review endpoints, follow the same pattern:

```typescript
ctx.set('auditActorId', adminUser.userId)
ctx.set('auditAction', 'contest.resolve') // or 'contest.approve_parent', etc.
ctx.set('auditTargetId', parentSubmissionId)
ctx.set('auditMeta', {
  parentId: parentSubmissionId,
  challengerId: challengerSubmissionId,
  resolution: 'parent_wins' | 'challenger_wins',
  parentBefore: { status, price },
  parentAfter: { status, price },
})
```

---

## 6. Admin Types in `packages/types/`

**Location:** `packages/types/src/index.ts` (273–289)

### PriceSubmission Interface

```typescript
export interface PriceSubmission {
  id: string
  eventId: string
  userId: string
  priceMin: string
  priceMax: string | null
  tier: Tier
  vendor: Vendor
  howFound: HowFound
  sourceCategory: SourceCategory | null
  disputedSubmissionId: string | null
  status: 'pending' | 'corroborated' | 'disputed' | 'stale'
  corroborationCount: number
  createdAt: string
  updatedAt: string
}
```

**Note:** `note` field is NOT in the shared types interface, only in the DB schema and admin page components. Will need to be added to the shared type when contest-review consumes it.

### Related Types

- `Tier` (line 78): `'GA' | 'Reserved' | 'VIP' | 'Pit' | 'Lawn'`
- `Vendor` (line 81): `'AXS' | 'Ticketmaster' | 'SeatGeek' | 'DICE' | 'Eventbrite' | 'VenueBoxOffice'`
- `HowFound` (line 100): `'bought_myself' | 'saw_listing' | 'at_the_venue'`
- `SourceCategory` (line 106): `'boxoffice' | 'standard' | 'resale'`

### Type Location

- **DB-inferred types** defined in `packages/db/src/schema/prices.ts` (lines 121–126):
  ```typescript
  export type PriceSubmission = typeof priceSubmissions.$inferSelect
  export type NewPriceSubmission = typeof priceSubmissions.$inferInsert
  ```

- **Shared API types** in `packages/types/src/index.ts` — this is what consumers/API handlers use

Both should stay in sync. The shared type is the contract; if DB schema changes, the type definition is updated to match.

---

## 7. Existing Dispute-Related Code (Consumer Side)

### DisputeForm

**Location:** `apps/web/src/components/consumer/DisputeForm.tsx` (1–175)

- **Purpose:** Consumer UI for disputing a corroborated price
- **Input:** A `PriceSubmission` object + `eventId`
- **Form fields:** 
  - Floor (required): $1–$2,000
  - Ceiling (optional): $1–$2,000, must be ≥ floor
  - Vendor (required): 6 choices (AXS, Ticketmaster, etc.)
- **Validation:** Client-side using `SP_POLICY` constants
- **API call:** `POST /v1/submissions/:submissionId/dispute` with `{ floor, ceiling, vendor }`
- **On success:** Redirects to `/events/:eventId`

**Key detail:** Form accepts vendor, but the server ignores it (see submissions.ts:87–92). The vendor is inherited from the parent submission.

### CounterSubmitSheet

**Location:** `apps/web/src/components/consumer/CounterSubmitSheet.tsx` (1–100+)

- **Purpose:** Modal form for submitting a counter-submission against a disputed price
- **Input:** `eventId`, `disputedSubmissionId`, `currentFloor`, `currentCeiling`, `currentVendor`, `onSuccess` callback
- **Form fields:**
  - Floor + Ceiling (required)
  - Tier (GA, Reserved, VIP, Pit, Lawn) — required
  - Vendor (required)
  - How Found (bought_myself, saw_listing, at_the_venue) — required
- **Difference from DisputeForm:** More fields (tier, howFound explicit)
- **API endpoint:** `POST /v1/events/:eventId/price-submissions` with `disputedSubmissionId` in the JSON body (see `apps/web/src/components/consumer/CounterSubmitSheet.tsx:163`). The challenger is just a normal submission with the parent ID set on `disputed_submission_id`.

### DisputedPriceCard

**Location:** Mentioned but not fully read — appears to display a disputed price inline on the event detail page.

### Consumer Data Flow

```
Event Detail Page
├── Fetch event including priceByTier / pending submissions
├── Show corroborated price (headline)
├── If user not submitter + not yet disputed:
│   └── Show "Dispute this price" button → DisputeForm
├── If disputed (status='disputed') AND user is submitter:
│   └── Show CounterSubmitSheet to respond
└── Show counter-submissions and their statuses
```

---

## 8. Render Flow: Admin Approve/Reject Today

### Current Flow (Single Submission)

1. **Admin clicks approve** on a submission row
   - Calls `onApprove(submissionId)` prop handler
   - Handler: `PATCH /v1/admin/prices/submissions/:id` with `{ status: 'corroborated' }`

2. **Server-side transaction** (`apps/api/src/routes/admin/prices.ts:258–330`):
   ```
   BEGIN TRANSACTION
     SELECT id, status, userId, eventId, priceMin, priceMax FROM price_submissions 
       WHERE id = :id FOR UPDATE
     
     UPDATE price_submissions 
       SET status = 'corroborated', updated_at = NOW()
       WHERE id = :id
       RETURNING *
     
     IF status was 'pending' (not already corroborated):
       UPDATE user_roles 
         SET price_cred_score = price_cred_score + 1 
         WHERE user_id = :userId
       
       UPDATE events 
         SET ticket_price_min = :priceMin, ticket_price_max = :priceMax, price_source = 'community'
         WHERE id = :eventId
   COMMIT
   ```

3. **Audit log** writes automatically via middleware (auditAction='price.submission.update')

4. **UI invalidates cache** via `useInvalidateReviewQueries()` → client re-fetches tab counts and submission list

### Transactional Atomicity

- **What's atomic:** Single submission status update + event propagation + cred award (all in one txn)
- **What's NOT atomic:**
  - Parent submission + child dispute submission operations
  - No exists-or-create for dispute rows
  - No contest state machine (e.g., "resolve parent → auto-reject children")

### Key Functions in Transactional Code

**Location:** `apps/api/src/routes/admin/prices.ts:259–330`

- Lock-for-update: `.for('update')` on line 286
- SQL function: `sql\`now()\`` for timestamp updates
- Returning clause: `.returning()` to get updated row
- Transaction wrapper: `db.transaction(async (tx) => { ... })`

**If contest-review needs transaction support, mirror this pattern.**

---

## Notable Gaps / Open Questions

The recon couldn't determine the following; the bridging spec will need to resolve:

### 1. Contest Queue Visibility
- **Gap:** How does admin discover "there's a pending dispute on this submission"?
- **Current:** Disputes exist in DB but don't surface to the review page yet
- **Need:** New tab or filter on `/admin/review` to show disputed submissions + pending counter-submissions? Or separate `/admin/contests` route?
- **Open:** Count endpoint — does `GET /v1/admin/review/counts` include a `disputes` or `contests` field?

### 2. Parent+Challenger Atomicity on Resolution
- **Gap:** When admin approves the parent, what happens to the challenger submission?
- **Options:**
  - Auto-reject the challenger?
  - Leave it pending (so user can respond)?
  - Mark as "contested" with a relationship back to the parent?
- **Current:** PATCH endpoint only touches one row; no parent+challenger logic exists yet

### 3. UI Layout for Contest Display
- **Gap:** How are parent + challenger shown together on the review page?
- **Options:**
  - Expandable row showing parent + all disputed children?
  - Separate table tab for "Contests" with dual-column layout?
  - Modal/panel on submission hover?
- **Current:** PendingSubmissionsPanel shows flat list of submissions; no grouping

### 4. Admin Actions on Disputes
- **Gap:** What are the possible admin outcomes?
- **Options:**
  - Approve parent (reject challenger)?
  - Approve challenger (reject parent)?
  - Mark both as stale?
  - Manually merge prices?
  - Force a corroborated price that differs from both?
- **Current:** Code supports corroborated/disputed/stale; no special contest outcomes

### 5. Counter-Submission Creation Today
- **Resolved:** There are two distinct write paths:
  - **Initial dispute** — `POST /v1/submissions/:id/dispute` (called by DisputeForm.tsx:87). Creates a child row with `disputedSubmissionId = :id`, flips parent to `disputed`.
  - **Counter-submission against a disputed parent** — `POST /v1/events/:eventId/price-submissions` with `disputedSubmissionId` in the JSON body (called by CounterSubmitSheet.tsx:163). Reuses the generic price-submission ingest route; the `disputedSubmissionId` field is what makes it a counter rather than a fresh submission.
- **Implication for spec:** §4.6's DB-level partial unique index covers BOTH routes (it's enforced at insert regardless of which route triggers it). The spec's app-level pre-insert check at §4.6 lives in `apps/api/src/routes/submissions.ts` for the `/dispute` path; the implementer should consider whether the same pre-check belongs in the `/v1/events/:eventId/price-submissions` route (which CounterSubmitSheet uses) so consumers get the clean 409 message rather than a unique-violation surface. Recommended: yes — but the DB is the source of truth either way.

### 6. Partial Indexes for Contest Queries
- **Gap:** DB has no indexed query for "all disputed submissions" or "submissions with disputed_submission_id IS NOT NULL"
- **Current:** Schema only has basic indexes on event_id, created_at, status
- **Impact:** Contest queue queries may be slow without optimization
- **Need:** Should the migration include a partial index on `WHERE status = 'disputed'` or `WHERE disputed_submission_id IS NOT NULL`?

### 7. Audit Log Metadata for Contests
- **Gap:** What metadata should be captured when resolving a contest?
- **Current:** `price.submission.update` action doesn't include parent/child context
- **Need:** Define `auditMeta` schema for contest-specific actions (e.g., `{ parentId, challengerId, resolution, reason }`)

### 8. Cred/Points for Dispute Winners
- **Gap:** If a challenger's price is approved, should they gain cred?
- **Current:** Only corroborated parents award +1 cred to submitter (line 301–304 in prices.ts)
- **Need:** Define cred rules for contest outcomes (winner gets +2? Both get +1 for participation?)

### 9. Consumer Notification on Contest Outcome
- **Gap:** When admin resolves a dispute, should the parent submitter and challenger both be notified?
- **Current:** No notification triggers in existing code
- **Need:** Notification policy for contest outcomes (admin action → user email/in-app alert?)

### 10. Bulk Contest Operations
- **Gap:** Can admin resolve multiple contests at once (like bulk event approval)?
- **Current:** PATCH endpoint only touches one row
- **Need:** Design for bulk/batch contest resolution (if needed)

---

## Summary

**Shipped admin conventions:**
- ✅ Auth gate: `requireAdminUser()`
- ✅ Layout: AdminShell + sidebar + responsive
- ✅ Nav structure: Flat list, badge counts, two sections (operations / account)
- ✅ API pattern: REST `/v1/admin/...` routes, Zod validation, Hono server
- ✅ Transactions: Lock-for-update, sql`` helpers, returning()
- ✅ Audit log: Context vars → automatic insertion, post-response middleware

**Contest data model available:**
- ✅ `priceSubmissions.disputedSubmissionId` (FK to parent)
- ✅ `priceSubmissions.status` enum (pending, corroborated, disputed, stale)
- ✅ `priceSubmissions.corroborationCount` (observer count)
- ✅ `priceSubmissions.note` (submitter-provided free-text on insert, content-moderated server-side; admin's archive reason is a separate `archived_reason` column added in migration 0041)
- ⚠️ No indexes yet for dispute/contest queries
- ⚠️ No contest-specific status values (relying on generic enum)

**Admin API surface:**
- ✅ `PATCH /v1/admin/prices/submissions/:id` — approve/reject
- ✅ `GET /v1/admin/prices/submissions` — paginated queue
- ⚠️ No contest-resolution endpoints yet
- ⚠️ No parent+challenger atomicity

**Consumer dispute flow exists:**
- ✅ DisputeForm (floor/ceiling/vendor)
- ✅ `POST /v1/submissions/:id/dispute` endpoint (creates disputed child)
- ✅ Parent marked as status='disputed' automatically
- ⚠️ No counter-submission API (CounterSubmitSheet endpoint unclear)

---

**Next step:** Spec author should use this reconnaissance to design:
1. Contest queue visibility on admin/review (new tab? modal? separate route?)
2. Parent+challenger atomicity rules (what happens on admin approval?)
3. Admin outcome types (parent-wins? challenger-wins? merge?)
4. Audit metadata schema for contest actions
5. Notification policy for outcomes
6. DB indexes for performance

