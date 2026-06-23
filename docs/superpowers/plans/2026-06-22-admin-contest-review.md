# Admin Contest-Review UI Implementation Plan (#697)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the admin contest-review surface for price disputes — a new tab on `/admin/review` whose queue and per-contest panel let admins atomically promote a counter, keep the original, or defer with an explanatory reason, while closing the existing PATCH foot-gun that lets a contest counter be approved as a normal pending submission.

**Architecture:** A new `admin/contests.ts` Hono router owns four endpoints (list / detail / resolve / defer) that wrap state transitions in a single `SELECT FOR UPDATE` Drizzle transaction (parent + challenger + denormalized `events` projection + cred award + orphan cleanup). Notifications and audit rows are written outside the transaction so their failures cannot roll back resolution. A migration adds `archived` to `price_submission_status`, `archived_reason` + `last_admin_action_at` + `last_admin_action_kind` columns, two performance indexes, one uniqueness index (1-pending-counter-per-parent), and a defensive cleanup CTE. The web app adds a `Contests` tab whose queue and per-contest panel reuse `ReviewTabs`, the existing admin theme tokens, and shared `AdminEntry` sub-component pinned to the design property table.

**Tech Stack:** TypeScript strict · Hono + Zod · Drizzle ORM · Postgres · Vitest (unit + integration against `concert_crawl_test`) · Next.js 14 App Router · React Query · pnpm workspaces · Conventional commits

## Global Constraints

- TypeScript strict mode across packages. Per CLAUDE.md "Type safety is the first line of defence", `as` casts are a **last resort** — prefer Zod `safeParse` for data crossing boundaries (JWTs, API responses, env vars), interface/declaration merging for library types we control, and type guards for discriminated unions. Narrow assertions like `as const` and `satisfies` are fine; type-erasing casts like `as SomeUnrelatedType` should be replaced with one of the alternatives above.
- **Identifier length** — ESLint `id-length` rule enforces `min: 2` with explicit exceptions for `i, j, k, x, y, z, _` (loop indexes + coordinate vars + intentional ignores; see `packages/config/eslint-node.mjs` + `apps/web/eslint.config.mjs`). Prefer descriptive names for everything else (`err` not `e`, `ctx` not `c`, `idx` over `i` if it's not a loop counter).
- **Expand-only migration** — `archived` is added alongside the existing `pending`/`corroborated`/`disputed`/`stale` values. No enum drops; `note` keeps the existing 280-char cap; `archived_reason` is added as nullable text. Defensive pre-index cleanup CTE runs before the unique index in the same migration.
- **Resolution atomicity** — every contest resolution wraps parent flip + challenger flip + `events` projection update + cred award + orphan cleanup in one `db.transaction(...)` with `SELECT FOR UPDATE` on both submission rows at the top. Notifications and audit rows are written **after** the transaction commits.
- **`design-review` is a hard gate before `gh pr create`.** The property table at `docs/superpowers/design-tables/admin-contest-review.md` is the source of truth for every visual + state claim. Run `design-review` against the implementation before opening the PR; resolve every gap.
- Worktree: `.worktrees/feat/admin-contest-review` on branch `feat/admin-contest-review`.
- Pre-push quality gate from the worktree root: `pnpm typecheck && pnpm lint && pnpm test && pnpm --filter @concert-crawl/api test:integration && pnpm --filter @concert-crawl/db test`.
- **2 SUCCESSFUL Copilot reviews before merge** per `memory:feedback_copilot_review_multi_round` (small-to-medium PR; iterate until only Low/Nit remains). Memory files live at `~/.claude/projects/-Users-huey-Projects-concert-crawl/memory/` and are not in-repo; they're loaded into the Claude Code session context at startup.
- **No `progress.md` row** — admin tooling, not a phase milestone.

---

## File Structure

**Create:**

- `packages/db/migrations/0041_admin_contest_review.sql` — enum value, three columns, three indexes (two for queue performance + one uniqueness), defensive pre-index cleanup CTE.
- `packages/db/migrations/0041_admin_contest_review.integration.test.ts` — asserts enum/column/index existence + that the unique-index rejects duplicate pending counters.
- `apps/api/src/routes/admin/contests.ts` — new router: `GET /v1/admin/contests/prices`, `GET /v1/admin/contests/prices/:contestId`, `POST /v1/admin/contests/prices/:contestId/resolve`, `POST /v1/admin/contests/prices/:contestId/defer`.
- `apps/api/src/routes/admin/contests.integration.test.ts` — integration tests for all four endpoints.
- `apps/api/src/lib/contest-notifications.ts` — helper that writes 2 notification rows (parent submitter + challenger submitter, deduped) after a contest action.
- `apps/api/src/lib/contest-notifications.test.ts` — unit tests for the helper.
- `apps/web/src/app/(protected)/admin/review/contests/[contestId]/page.tsx` — SSR shell that loads the contest detail and mounts `AdminDisputePanel`.
- `apps/web/src/components/admin/review/_tabs/ContestsTabContent.tsx` — tab body that mounts `PriceDisputesQueue`.
- `apps/web/src/components/admin/review/PriceDisputesQueue.tsx` — queue table with auto-hide on empty + inline `PriceDisputesQueueRow`.
- `apps/web/src/components/admin/review/PriceDisputesQueue.test.tsx` — RTL tests for auto-hide, row shape, resolve nav.
- `apps/web/src/components/admin/review/AdminDisputePanel.tsx` — 760px two-up surface with reason field + 3 buttons + stale-state read-only fallback.
- `apps/web/src/components/admin/review/AdminDisputePanel.test.tsx` — RTL tests for reason validation, winner-preview state, stale-state banner.
- `apps/web/src/components/admin/review/AdminEntry.tsx` — shared per-side card (parent + counter).
- `apps/web/src/components/admin/review/AdminEntry.test.tsx` — RTL tests for winner border, note rendering, metadata grid.
- `apps/web/src/lib/queries/admin-contests.ts` — `useReviewContestsQuery`, `useReviewContestDetail`, `useResolveContest`, `useDeferContest` React Query hooks.

**Modify:**

- `packages/db/src/schema/prices.ts` — extend `priceSubmissionStatusEnum` literal to include `'archived'`; add `archivedReason`, `lastAdminActionAt`, `lastAdminActionKind` columns to `priceSubmissions`.
- `packages/types/src/index.ts` — `PriceSubmission` interface gains `note: string | null`, `archivedReason: string | null`, `lastAdminActionAt: string | null`, `lastAdminActionKind: 'defer' | null`; status union gains `archived`.
- `apps/api/src/routes/admin/prices.ts` — PATCH `/submissions/:id` rejects rows where `disputedSubmissionId !== null` OR `status === 'disputed'` with 409 + loud Sentry tag `endpoint_lockout: contest_row`.
- `apps/api/src/routes/admin/prices.integration.test.ts` — add contest-row PATCH lockout cases.
- `apps/api/src/routes/submissions.ts` — dispute POST adds a pre-insert duplicate-counter check + translates DB unique-violation into a clean 409.
- `apps/api/src/routes/submissions.integration.test.ts` — add duplicate-counter rejection case.
- `apps/api/src/routes/admin/index.ts` — mount `contestsAdminRouter`.
- `apps/api/src/routes/admin/index.ts` (the counts route owner — `adminRouter.get('/review/counts', ...)` at ~line 73) — `GET /v1/admin/review/counts` adds `priceContests: number`.
- `apps/api/src/routes/admin/index.integration.test.ts` (or the existing test file for the counts endpoint — verify at plan-execution time) — assert `priceContests` appears in the counts payload.
- `apps/api/src/routes/events.ts` — `priceByTier[].counterSubmission` shape gains `lastAdminActionAt: string | null` + `lastAdminActionKind: 'defer' | null`, read off the counter row.
- `apps/api/src/routes/events.integration.test.ts` — defer a contest, then GET event detail, assert `counterSubmission.lastAdminActionKind === 'defer'`.
- `apps/web/src/components/admin/review/ReviewPageClient.tsx` — add `'contests'` to the tab key union + `VALID_TAB_KEYS`; mount `ContestsTabContent`; pass the new `priceContests` count to the tab pill.
- `apps/web/src/lib/queries/use-admin-review.ts` — extend `ReviewCounts` interface with `priceContests: number`.

**Not modified:**

- `apps/crawler/*` — contest resolution is API-only; the crawler does not write to `price_submissions` directly.
- The consumer notification bell/panel — `#737` tracks that surface; this PR only writes the `notifications` rows.
- Consumer dispute affordance hiding — locked for PR 4 of the price-source cycle (`memory:project_pr4_dispute_affordance_hiding`), not this PR.

---

## Task Right-Sizing Rationale

Eighteen tasks. Each ends with an independently testable deliverable + commit:

1. Migration `0041_admin_contest_review.sql` + integration test
2. Drizzle schema sync (`priceSubmissionStatusEnum` + 3 columns)
3. Shared types extension (`PriceSubmission` gains 4 fields + `archived` status)
4. Defensive PATCH lockout on existing `prices.ts` PATCH endpoint
5. Dispute endpoint pre-insert duplicate check + DB unique-violation translation
6. `GET /v1/admin/contests/prices` list endpoint
7. `GET /v1/admin/contests/prices/:contestId` detail endpoint
8. `POST /v1/admin/contests/prices/:contestId/resolve` (the atomic transaction)
9. `POST /v1/admin/contests/prices/:contestId/defer` (sets `last_admin_action_*`)
10. `contest-notifications.ts` helper + unit tests + wire into resolve/defer handlers
11. `GET /v1/admin/review/counts` adds `priceContests` field
12. Event detail handler extends `counterSubmission` with `lastAdminActionAt`/`lastAdminActionKind`
13. `ContestsTabContent` + `PriceDisputesQueue` queue component
14. `AdminEntry` shared sub-component
15. `AdminDisputePanel` + `/admin/review/contests/[contestId]` route
16. React Query hooks (`useReviewContestsQuery`, detail, resolve, defer)
17. `ReviewTabs` integration — add `Contests` descriptor + URL query param wiring + counts pill
18. design-review sweep + open PR + Copilot iteration

---

### Task 1: Migration `0041_admin_contest_review.sql`

**Files:**

- Create: `packages/db/migrations/0041_admin_contest_review.sql`
- Create: `packages/db/migrations/0041_admin_contest_review.integration.test.ts`

**Interfaces:**

- Consumes: existing `price_submissions` table, existing `price_submission_status` enum.
- Produces:
  - `price_submission_status` gains value `'archived'`.
  - `price_submissions.archived_reason text` (nullable).
  - `price_submissions.last_admin_action_at timestamptz` (nullable).
  - `price_submissions.last_admin_action_kind text` (nullable; validated at app boundary, only legal value today is `'defer'`).
  - Index `price_submissions_disputed_status_idx` on `(created_at) WHERE status = 'disputed'`.
  - Index `price_submissions_pending_counters_idx` on `(disputed_submission_id, created_at) WHERE status = 'pending' AND disputed_submission_id IS NOT NULL`.
  - Unique index `price_submissions_pending_counter_unique_idx` on `(disputed_submission_id) WHERE status = 'pending' AND disputed_submission_id IS NOT NULL`.

- [ ] **Step 1: Confirm next migration number**

```bash
ls packages/db/migrations/ | sort | tail -3
```

Expected: shows `0040_price_source_category.sql` as the latest. The new migration is `0041_admin_contest_review.sql`. If a later number has landed since this plan was written, increment accordingly (`0042`, etc.) — the migration filename must be strictly greater than every existing one.

- [ ] **Step 2: Write the migration SQL**

Create `packages/db/migrations/0041_admin_contest_review.sql`:

```sql
-- Admin contest-review (#697) — adds the loser-of-contest 'archived' status,
-- the admin's archive reason column, and the engagement-signal columns that
-- surface via priceByTier[].counterSubmission on the event-detail endpoint.
-- Three indexes back the contest queue (disputed parents + pending counters)
-- and lock 1-pending-counter-per-parent at the DB level.

-- 1. Add 'archived' to the status enum (loser-of-contest sink, distinct from
--    'stale' which keeps its current "outdated/no-longer-valid" semantics).
ALTER TYPE price_submission_status ADD VALUE IF NOT EXISTS 'archived';
--> statement-breakpoint

-- 2. Add the admin's archive reason (no length cap — admins can write longer
--    than the 280-char submitter `note` field).
ALTER TABLE price_submissions
  ADD COLUMN IF NOT EXISTS archived_reason text;
--> statement-breakpoint

-- 3. Add the engagement-signal columns. `last_admin_action_kind` stays as
--    text (not an enum) because the only legal value today is 'defer';
--    validation lives at the application boundary.
ALTER TABLE price_submissions
  ADD COLUMN IF NOT EXISTS last_admin_action_at timestamptz;
--> statement-breakpoint
ALTER TABLE price_submissions
  ADD COLUMN IF NOT EXISTS last_admin_action_kind text;
--> statement-breakpoint

-- 4. Partial indexes that power the contest queue + counter-lookup join.
CREATE INDEX IF NOT EXISTS price_submissions_disputed_status_idx
  ON price_submissions (created_at)
  WHERE status = 'disputed';
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS price_submissions_pending_counters_idx
  ON price_submissions (disputed_submission_id, created_at)
  WHERE status = 'pending' AND disputed_submission_id IS NOT NULL;
--> statement-breakpoint

-- 5. Defensive pre-index cleanup. If any in-flight contests already have
--    multiple pending counters against the same parent (possible in the
--    race-window prior to this PR), archive the older ones so the unique
--    index below can be created safely. In prod today this is expected to
--    update 0 rows, but it's the only path that lets the migration run in
--    every environment without manual intervention.
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY disputed_submission_id
           ORDER BY created_at DESC
         ) AS rn
  FROM price_submissions
  WHERE status = 'pending'
    AND disputed_submission_id IS NOT NULL
)
UPDATE price_submissions
   SET status = 'archived',
       archived_reason = 'superseded by newer counter before schema lock'
 WHERE id IN (SELECT id FROM ranked WHERE rn > 1);
--> statement-breakpoint

-- 6. Schema-enforced 1-pending-counter-per-parent. The dispute POST also
--    rejects with a clean 409 (belt-and-braces), but this is the primary
--    defence — DB makes it impossible to file a 2nd pending counter.
CREATE UNIQUE INDEX IF NOT EXISTS price_submissions_pending_counter_unique_idx
  ON price_submissions (disputed_submission_id)
  WHERE status = 'pending' AND disputed_submission_id IS NOT NULL;
```

- [ ] **Step 3: Register the migration in `meta/_journal.json`**

Open `packages/db/migrations/meta/_journal.json` and append the new entry with `when` strictly greater than every prior entry. Drizzle sorts migrations by the `when` timestamp, not the index, so an out-of-order timestamp will silently break ordering (bit us on 0008 + 0011 per `feedback_migration_timestamps.md`).

```bash
cat packages/db/migrations/meta/_journal.json | tail -10
```

Add the new entry with `idx: 41`, `tag: "0041_admin_contest_review"`, `when: <epoch-ms-now>` (must be greater than the prior `when`).

- [ ] **Step 4: Write the integration test**

Create `packages/db/migrations/0041_admin_contest_review.integration.test.ts`:

```typescript
import { describe, expect, it } from 'vitest'
import { sql } from 'drizzle-orm'
import { db } from '../src/index.js'
import { priceSubmissions } from '../src/schema/prices.js'
import { events } from '../src/schema/events.js'
import { venues } from '../src/schema/venues.js'

describe('migration 0041 — admin contest review', () => {
  it('adds the archived status value to price_submission_status', async () => {
    const rows = await db.execute<{ enumlabel: string }>(sql`
      SELECT enumlabel FROM pg_enum
       WHERE enumtypid = 'price_submission_status'::regtype
       ORDER BY enumsortorder
    `)
    const labels = rows.map((row) => row.enumlabel)
    expect(labels).toContain('archived')
  })

  it('adds archived_reason, last_admin_action_at, last_admin_action_kind columns', async () => {
    const rows = await db.execute<{ column_name: string; data_type: string }>(sql`
      SELECT column_name, data_type FROM information_schema.columns
       WHERE table_name = 'price_submissions'
         AND column_name IN ('archived_reason', 'last_admin_action_at', 'last_admin_action_kind')
       ORDER BY column_name
    `)
    const names = rows.map((row) => row.column_name)
    expect(names).toEqual([
      'archived_reason',
      'last_admin_action_at',
      'last_admin_action_kind',
    ])
  })

  it('creates the three contest-queue indexes', async () => {
    const rows = await db.execute<{ indexname: string }>(sql`
      SELECT indexname FROM pg_indexes
       WHERE tablename = 'price_submissions'
         AND indexname IN (
           'price_submissions_disputed_status_idx',
           'price_submissions_pending_counters_idx',
           'price_submissions_pending_counter_unique_idx'
         )
       ORDER BY indexname
    `)
    const names = rows.map((row) => row.indexname)
    expect(names).toEqual([
      'price_submissions_disputed_status_idx',
      'price_submissions_pending_counter_unique_idx',
      'price_submissions_pending_counters_idx',
    ])
  })

  it('unique index rejects a 2nd pending counter against the same parent', async () => {
    // Seed a venue + event + parent submission so we can attach counters.
    // venues.websiteUrl, events.title, events.artist are notNull — must be
    // provided explicitly to avoid runtime + type errors. canonicalArtist is
    // forced unique-per-(venueId, date) so we set it explicitly to dodge the
    // partial unique index from migration 0035 when tests run in parallel.
    const [venue] = await db
      .insert(venues)
      .values({
        name: 'Contest Test Venue',
        slug: 'contest-mig-test',
        websiteUrl: 'https://contest-mig-test.example.com',
      })
      .returning({ id: venues.id })
    const [event] = await db
      .insert(events)
      .values({
        venueId: venue!.id,
        title: 'Contest Mig Test Show',
        artist: 'Contest Mig Test Artist',
        canonicalArtist: 'contest mig test artist',
        date: '2027-12-01',
        verified: true,
      })
      .returning({ id: events.id })
    const [parent] = await db
      .insert(priceSubmissions)
      .values({
        eventId: event!.id,
        userId: 'parent-user',
        priceMin: '40',
        tier: 'GA',
        vendor: 'AXS',
        howFound: 'saw_listing',
        sourceCategory: 'standard',
        status: 'corroborated',
      })
      .returning({ id: priceSubmissions.id })

    // First pending counter — accepted.
    await db.insert(priceSubmissions).values({
      eventId: event!.id,
      userId: 'challenger-1',
      priceMin: '50',
      tier: 'GA',
      vendor: 'AXS',
      howFound: 'saw_listing',
      sourceCategory: 'standard',
      status: 'pending',
      disputedSubmissionId: parent!.id,
    })

    // Second pending counter against the SAME parent — rejected by unique idx.
    await expect(
      db.insert(priceSubmissions).values({
        eventId: event!.id,
        userId: 'challenger-2',
        priceMin: '60',
        tier: 'GA',
        vendor: 'AXS',
        howFound: 'saw_listing',
        sourceCategory: 'standard',
        status: 'pending',
        disputedSubmissionId: parent!.id,
      }),
    ).rejects.toThrow(/price_submissions_pending_counter_unique_idx|unique/i)
  })
})
```

- [ ] **Step 5: Run the migration locally**

```bash
docker compose up -d
pnpm db:migrate
pnpm --filter @concert-crawl/db test -- 0041_admin_contest_review
```

Expected: migration applies cleanly; all 4 integration tests pass.

- [ ] **Step 6: Commit**

```bash
git add packages/db/migrations/0041_admin_contest_review.sql \
        packages/db/migrations/0041_admin_contest_review.integration.test.ts \
        packages/db/migrations/meta/_journal.json
git commit -m "feat(db): migration 0041 — admin contest review (archived status + indexes)"
```

---

### Task 2: Drizzle schema sync

**Files:**

- Modify: `packages/db/src/schema/prices.ts`

**Interfaces:**

- Consumes: existing `priceSubmissions` table definition.
- Produces:
  - `priceSubmissionStatusEnum` literal extended with `'archived'`.
  - `priceSubmissions.archivedReason: text` (nullable).
  - `priceSubmissions.lastAdminActionAt: timestamptz` (nullable).
  - `priceSubmissions.lastAdminActionKind: text` (nullable).

- [ ] **Step 1: Update the enum + columns**

In `packages/db/src/schema/prices.ts`, replace the existing `priceSubmissionStatusEnum` definition:

```typescript
export const priceSubmissionStatusEnum = pgEnum('price_submission_status', [
  'pending',
  'corroborated',
  'disputed',
  'stale',
  'archived',
])
```

And add three columns to the `priceSubmissions` table after `note`:

```typescript
note: varchar('note', { length: 280 }),
archivedReason: text('archived_reason'),
lastAdminActionAt: timestamp('last_admin_action_at', { withTimezone: true }),
lastAdminActionKind: text('last_admin_action_kind'),
createdAt: timestamp('created_at', { withTimezone: true })
  .notNull()
  .defaultNow(),
```

- [ ] **Step 2: Typecheck**

```bash
pnpm --filter @concert-crawl/db typecheck
pnpm --filter @concert-crawl/api typecheck
pnpm --filter @concert-crawl/web typecheck
```

Expected: all pass. The inferred `PriceSubmission` type from `$inferSelect` automatically gains the three nullable fields and the `'archived'` literal in `status`.

- [ ] **Step 3: Commit**

```bash
git add packages/db/src/schema/prices.ts
git commit -m "feat(db): extend priceSubmissions schema with archived status + admin action columns"
```

---

### Task 3: Shared types extension

**Files:**

- Modify: `packages/types/src/index.ts`

**Interfaces:**

- Consumes: existing `PriceSubmission` interface.
- Produces:
  - `PriceSubmission.status` union gains `'archived'`.
  - `PriceSubmission.note: string | null` (was missing entirely from the shared type — recon noted this).
  - `PriceSubmission.archivedReason: string | null`.
  - `PriceSubmission.lastAdminActionAt: string | null` (ISO timestamp).
  - `PriceSubmission.lastAdminActionKind: 'defer' | null`.

- [ ] **Step 1: Update the interface**

In `packages/types/src/index.ts`, locate the `PriceSubmission` interface (~line 273) and update:

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
  status: 'pending' | 'corroborated' | 'disputed' | 'stale' | 'archived'
  corroborationCount: number
  // Submitter's free-text note (existed in DB but was missing from this
  // shared interface — added during the admin contest-review PR per #697).
  note: string | null
  // Admin's reason text when status = 'archived' (loser-of-contest sink).
  // Plain text, no length cap (admin reasons can run longer than `note`'s
  // 280-char submitter cap).
  archivedReason: string | null
  // Engagement-signal columns surfaced via priceByTier[].counterSubmission
  // so consumers see a quiet "Admin requested more info" pill on the event
  // detail page after an admin defers the contest.
  lastAdminActionAt: string | null
  lastAdminActionKind: 'defer' | null
  createdAt: string
  updatedAt: string
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm --filter @concert-crawl/types typecheck
pnpm --filter @concert-crawl/api typecheck
pnpm --filter @concert-crawl/web typecheck
```

Expected: all pass.

- [ ] **Step 3: Commit**

```bash
git add packages/types/src/index.ts
git commit -m "feat(types): extend PriceSubmission with archived status + admin action fields"
```

---

### Task 4: Defensive PATCH lockout (close the foot-gun)

**Files:**

- Modify: `apps/api/src/routes/admin/prices.ts`
- Modify: `apps/api/src/routes/admin/prices.integration.test.ts`

**Interfaces:**

- Consumes: existing `priceSubmissions` query inside the PATCH handler.
- Produces: PATCH `/v1/admin/prices/submissions/:id` returns 409 with body `{ success: false, error: 'This submission is part of a contest. Resolve via /v1/admin/contests/prices/:contestId instead.' }` when the target row has `disputedSubmissionId !== null` OR `status === 'disputed'`. Logs `apiLogger.warn` + `Sentry.captureMessage` with tag `endpoint_lockout: contest_row`.

- [ ] **Step 1: Write the failing integration test**

Append to `apps/api/src/routes/admin/prices.integration.test.ts` (inside the PATCH `/submissions/:id` describe block):

```typescript
it('rejects PATCH on a counter row (disputedSubmissionId !== null) with 409', async () => {
  const venue = await seedVenue({ name: 'PATCH Lockout', slug: 'patch-lockout-1' })
  const event = await seedEvent(venue.id, { date: '2027-06-01' })
  const submitter = await seedUserProfile('parent-user', { handle: 'parent' })
  const challenger = await seedUserProfile('challenger-user', { handle: 'chal' })
  const parent = await seedPriceSubmission(event.id, submitter.userId, {
    tier: 'GA',
    vendor: 'AXS',
    sourceCategory: 'standard',
    priceMin: '40',
    status: 'corroborated',
  })
  const counter = await seedPriceSubmission(event.id, challenger.userId, {
    tier: 'GA',
    vendor: 'AXS',
    sourceCategory: 'standard',
    priceMin: '50',
    status: 'pending',
    disputedSubmissionId: parent.id,
  })

  const res = await app.request(
    `/v1/admin/prices/submissions/${counter.id}`,
    {
      method: 'PATCH',
      headers: {
        ...ADMIN_HEADERS,
      },
      body: JSON.stringify({ status: 'corroborated' }),
    },
  )

  expect(res.status).toBe(409)
  const body = (await res.json()) as { success: boolean; error: string }
  expect(body.success).toBe(false)
  expect(body.error).toMatch(/contest/i)
  expect(body.error).toMatch(/\/v1\/admin\/contests\/prices/)
})

it('rejects PATCH on a parent row whose status is disputed with 409', async () => {
  const venue = await seedVenue({ name: 'PATCH Lockout 2', slug: 'patch-lockout-2' })
  const event = await seedEvent(venue.id, { date: '2027-06-01' })
  const submitter = await seedUserProfile('parent-user-2', { handle: 'parent2' })
  const parent = await seedPriceSubmission(event.id, submitter.userId, {
    tier: 'GA',
    vendor: 'AXS',
    sourceCategory: 'standard',
    priceMin: '40',
    status: 'disputed',
  })

  const res = await app.request(
    `/v1/admin/prices/submissions/${parent.id}`,
    {
      method: 'PATCH',
      headers: {
        ...ADMIN_HEADERS,
      },
      body: JSON.stringify({ status: 'corroborated' }),
    },
  )

  expect(res.status).toBe(409)
})

it('still accepts PATCH on a non-contest pending row', async () => {
  const venue = await seedVenue({ name: 'PATCH OK', slug: 'patch-ok' })
  const event = await seedEvent(venue.id, { date: '2027-06-01' })
  const submitter = await seedUserProfile('plain-user', { handle: 'plain' })
  const submission = await seedPriceSubmission(event.id, submitter.userId, {
    tier: 'GA',
    vendor: 'AXS',
    sourceCategory: 'standard',
    priceMin: '40',
    status: 'pending',
  })

  const res = await app.request(
    `/v1/admin/prices/submissions/${submission.id}`,
    {
      method: 'PATCH',
      headers: {
        ...ADMIN_HEADERS,
      },
      body: JSON.stringify({ status: 'corroborated' }),
    },
  )
  expect(res.status).toBe(200)
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter @concert-crawl/api test:integration -- prices.integration
```

Expected: FAIL — the two contest-row cases currently return 200, not 409.

- [ ] **Step 3: Add the lockout to the PATCH handler**

In `apps/api/src/routes/admin/prices.ts`, the existing PATCH handler (line 258-330) fetches the existing row inside a transaction. Add the lockout BEFORE the update, right after the `if (!existing) return { ok: false }` guard. The handler currently selects only a few columns — extend the select to include `disputedSubmissionId` so the gate can read it.

Replace the existing select inside the transaction:

```typescript
const [existing] = await tx
  .select({
    userId: priceSubmissions.userId,
    status: priceSubmissions.status,
    eventId: priceSubmissions.eventId,
    priceMin: priceSubmissions.priceMin,
    priceMax: priceSubmissions.priceMax,
    disputedSubmissionId: priceSubmissions.disputedSubmissionId,
  })
  .from(priceSubmissions)
  .where(eq(priceSubmissions.id, id))
  .limit(1)
  .for('update')

if (!existing) return { ok: false }

// Defensive lockout: contests must resolve through /v1/admin/contests/prices/:id.
// This endpoint pre-dates the contest UI and can silently overturn a corroborated
// price when an admin approves a counter via the flat queue. Reject + loud Sentry.
if (existing.disputedSubmissionId !== null || existing.status === 'disputed') {
  return { ok: 'contest_lockout' as const }
}
```

Widen the `TxResult` type:

```typescript
type TxResult =
  | { ok: true; updated: typeof priceSubmissions.$inferSelect }
  | { ok: false }
  | { ok: 'contest_lockout' }
```

And handle the new variant after the transaction:

```typescript
if (result.ok === 'contest_lockout') {
  apiLogger.warn(
    {
      submissionId: id,
    },
    'PATCH lockout: contest row reached the non-contest endpoint',
  )
  Sentry.captureMessage(
    'Contest row hit PATCH /v1/admin/prices/submissions/:id',
    {
      level: 'warning',
      tags: { endpoint_lockout: 'contest_row' },
      extra: { submissionId: id },
    },
  )
  return ctx.json(
    {
      success: false,
      error:
        'This submission is part of a contest. Resolve via /v1/admin/contests/prices/:contestId instead.',
    },
    409,
  )
}

if (!result.ok)
  return ctx.json({ success: false, error: 'Submission not found' }, 404)
```

Required imports if not already present at the top of the file:

```typescript
import { apiLogger } from '@concert-crawl/logger'
import * as Sentry from '@sentry/node'
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm --filter @concert-crawl/api test:integration -- prices.integration
```

Expected: PASS — all three new tests green, all existing PATCH tests still pass.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/routes/admin/prices.ts \
        apps/api/src/routes/admin/prices.integration.test.ts
git commit -m "feat(api): PATCH /v1/admin/prices/submissions/:id rejects contest rows with 409"
```

---

### Task 5: Dispute endpoint pre-insert duplicate check

**Files:**

- Modify: `apps/api/src/routes/submissions.ts`
- Modify: `apps/api/src/routes/submissions.integration.test.ts`

**Interfaces:**

- Consumes: existing dispute POST handler at `apps/api/src/routes/submissions.ts`.
- Produces: `POST /v1/submissions/:id/dispute` returns 409 with body `{ success: false, error: 'Another challenge is already pending against this submission.' }` when a pending counter against the same parent already exists. The DB unique index added in migration 0041 also rejects the insert if somehow racing past the app-level check.

- [ ] **Step 1: Write the failing test**

Append to `apps/api/src/routes/submissions.integration.test.ts`:

```typescript
// submissions.integration.test.ts already uses the hoisted-authState pattern
// with a `setAuth(userId)` helper and standard 'Bearer test-token' headers.
// Mirror that — call setAuth(challenger.userId) before each request to set the
// current actor. Don't invent makeAuthHeader.
it('rejects a 2nd pending counter against the same parent with 409', async () => {
  const venue = await seedVenue({ name: 'Dup Counter', slug: 'dup-counter' })
  const event = await seedEvent(venue.id, { date: '2027-06-01' })
  const submitter = await seedUserProfile('parent-user', { handle: 'parent' })
  const challenger1 = await seedUserProfile('chal-1', { handle: 'chal1' })
  const challenger2 = await seedUserProfile('chal-2', { handle: 'chal2' })

  const parent = await seedPriceSubmission(event.id, submitter.userId, {
    tier: 'GA',
    vendor: 'AXS',
    sourceCategory: 'standard',
    priceMin: '40',
    status: 'corroborated',
  })

  // First counter succeeds.
  setAuth(challenger1.userId)
  const firstRes = await app.request(`/v1/submissions/${parent.id}/dispute`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer test-token',
    },
    body: JSON.stringify({ floor: 50 }),
  })
  expect(firstRes.status).toBe(201)

  // Second counter against the SAME parent — rejected with 409.
  setAuth(challenger2.userId)
  const secondRes = await app.request(`/v1/submissions/${parent.id}/dispute`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer test-token',
    },
    body: JSON.stringify({ floor: 55 }),
  })
  expect(secondRes.status).toBe(409)
  const body = (await secondRes.json()) as { success: boolean; error: string }
  expect(body.success).toBe(false)
  expect(body.error).toMatch(/already pending/i)
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter @concert-crawl/api test:integration -- submissions.integration
```

Expected: FAIL — second counter currently inserts (and the unique index in migration 0041 would throw a raw `unique_violation` if migration ran first; the app-level check produces the clean 409).

- [ ] **Step 3: Add the pre-insert check + unique-violation translation**

In `apps/api/src/routes/submissions.ts` dispute handler, after `parent` is loaded and the self-dispute guard runs (but before the `db.transaction(...)` insert):

```typescript
// 1-pending-counter-per-parent invariant (locked design decision; see
// docs/superpowers/specs/2026-06-22-admin-contest-review-design.md §4.6).
// The DB unique index `price_submissions_pending_counter_unique_idx` is the
// primary defence; this app-level check produces a clean 409 instead of
// the raw unique_violation that would surface from the index.
const [existingCounter] = await db
  .select({ id: priceSubmissions.id })
  .from(priceSubmissions)
  .where(
    and(
      eq(priceSubmissions.disputedSubmissionId, parent.id),
      eq(priceSubmissions.status, 'pending'),
    ),
  )
  .limit(1)

if (existingCounter) {
  return ctx.json(
    {
      success: false,
      error: 'Another challenge is already pending against this submission.',
    },
    409,
  )
}
```

Wrap the existing `db.transaction(...)` insert in a try/catch that translates DB `unique_violation` (Postgres SQLSTATE `23505`) on the contest-uniqueness index into the same clean 409. This handles the race where two challengers POST simultaneously — both pass the SELECT check, but only one INSERT survives the unique index:

```typescript
try {
  const inserted = await db.transaction(async (tx) => {
    // ... existing insert + parent flip-to-disputed logic ...
  })
  return ctx.json({ success: true, data: inserted }, 201)
} catch (err) {
  if (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    err.code === '23505' &&
    'constraint' in err &&
    err.constraint === 'price_submissions_pending_counter_unique_idx'
  ) {
    return ctx.json(
      {
        success: false,
        error: 'Another challenge is already pending against this submission.',
      },
      409,
    )
  }
  throw err
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm --filter @concert-crawl/api test:integration -- submissions.integration
```

Expected: PASS — new test green, all existing dispute tests still pass.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/routes/submissions.ts \
        apps/api/src/routes/submissions.integration.test.ts
git commit -m "feat(api): dispute endpoint rejects duplicate pending counters with 409"
```

---

### Task 6: `GET /v1/admin/contests/prices` list endpoint

**Files:**

- Create: `apps/api/src/routes/admin/contests.ts`
- Create: `apps/api/src/routes/admin/contests.integration.test.ts`
- Modify: `apps/api/src/routes/admin/index.ts` (mount new router)

**Interfaces:**

- Consumes: `priceSubmissions`, `events`, `venues`, `userProfiles` Drizzle schemas. `corroborationCount` on the parent row provides the "fans" count directly (no separate `submission_confirms` aggregation needed).
- Produces:

  ```ts
  // GET /v1/admin/contests/prices?limit=20&offset=0
  // Response:
  interface PriceContestRow {
    contestId: string
    eventId: string
    eventTitle: string
    venueName: string
    eventDate: string
    tier: Tier
    sourceCategory: SourceCategory | null
    parent: {
      id: string
      priceMin: string
      priceMax: string | null
      vendor: Vendor
      submitter: { userId: string; handle: string | null }
      confirms: { fans: number; admin: number }
      observedAt: string
      lastUpdatedAt: string  // parent.updatedAt — see spec §6.1 on naming
      note: string | null
    }
    counter: {
      id: string
      priceMin: string
      priceMax: string | null
      vendor: Vendor
      submitter: { userId: string; handle: string | null }
      confirms: { fans: number; admin: number }
      observedAt: string
      note: string | null
    }
    filedAt: string
  }
  interface ListResponse {
    success: true
    data: {
      items: PriceContestRow[]
      total: number
      limit: number
      offset: number
    }
  }
  ```

- [ ] **Step 1: Write the failing integration test**

Create `apps/api/src/routes/admin/contests.integration.test.ts`. Mirror the pattern from `apps/api/src/routes/admin/prices.integration.test.ts` exactly — hoisted `authState`, mocked Clerk middleware, `createApp()` factory, `setAdminAuth()` helper, `ADMIN_HEADERS` constant. Do NOT invent a `makeAdminAuthHeader` helper or import `{ app }` directly from app.js — neither exists.

```typescript
import { describe, expect, it, beforeEach, vi } from 'vitest'

// Hoisted auth state so the Clerk mock can swap users between tests without
// reloading modules. Same pattern as admin/prices.integration.test.ts.
const { authState } = vi.hoisted(() => ({
  authState: {
    current: null as {
      userId: string
      sessionClaims: { metadata?: { role?: string } }
    } | null,
  },
}))

vi.mock('@hono/clerk-auth', () => ({
  clerkMiddleware: () => async (_c: unknown, next: () => Promise<void>) =>
    next(),
  getAuth: () => authState.current,
}))

import { createApp } from '../../app.js'
import {
  clearTables,
  seedEvent,
  seedPriceSubmission,
  seedUserProfile,
  seedVenue,
} from '../../test/helpers/seed.js'

const app = createApp()

function setAdminAuth(): void {
  authState.current = {
    userId: 'admin_contest_test',
    sessionClaims: { metadata: { role: 'admin' } },
  }
}

function clearAuth(): void {
  authState.current = null
}

const ADMIN_HEADERS = {
  Authorization: 'Bearer admin-token',
  'Content-Type': 'application/json',
}

// Convention: every admin-action test body in this file calls
// `setAdminAuth()` as its first line. The `requires admin auth` test starts
// with the cleared default state from beforeEach to verify the gate. Tests
// for non-admin user scenarios (none in this file — see
// submissions.integration.test.ts for that pattern) would call
// `setAuth(userId)` instead.

describe('GET /v1/admin/contests/prices', () => {
  beforeEach(async () => {
    clearAuth()
    await clearTables()
  })

  it('requires admin auth', async () => {
    const res = await app.request('/v1/admin/contests/prices')
    expect([401, 403]).toContain(res.status)
  })

  it('lists open contests with full parent + counter shape', async () => {
    setAdminAuth()
    const venue = await seedVenue({ name: 'Contest Venue', slug: 'contest-list-1' })
    const event = await seedEvent(venue.id, {
      date: '2027-06-01',
      title: 'Contest Test Show',
    })
    const submitter = await seedUserProfile('parent-u', { handle: 'parent-h' })
    const challenger = await seedUserProfile('chal-u', { handle: 'chal-h' })
    const parent = await seedPriceSubmission(event.id, submitter.userId, {
      tier: 'GA',
      vendor: 'AXS',
      sourceCategory: 'standard',
      priceMin: '40',
      status: 'disputed', // contest is open
      note: 'Original observation',
    })
    await seedPriceSubmission(event.id, challenger.userId, {
      tier: 'GA',
      vendor: 'AXS',
      sourceCategory: 'standard',
      priceMin: '55',
      status: 'pending',
      disputedSubmissionId: parent.id,
      note: 'Saw new price on AXS',
    })

    const res = await app.request('/v1/admin/contests/prices', {
      headers: ADMIN_HEADERS,
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      success: boolean
      data: {
        items: Array<{
          contestId: string
          eventTitle: string
          tier: string
          parent: {
            id: string
            priceMin: string
            submitter: { userId: string; handle: string | null }
            note: string | null
          }
          counter: {
            id: string
            priceMin: string
            submitter: { userId: string; handle: string | null }
            note: string | null
          }
          filedAt: string
        }>
        total: number
      }
    }
    expect(body.success).toBe(true)
    expect(body.data.items).toHaveLength(1)
    const item = body.data.items[0]!
    expect(item.contestId).toBe(parent.id)
    expect(item.eventTitle).toBe('Contest Test Show')
    expect(item.tier).toBe('GA')
    expect(item.parent.priceMin).toBe('40')
    expect(item.parent.note).toBe('Original observation')
    expect(item.parent.submitter.handle).toBe('parent-h')
    expect(item.counter.priceMin).toBe('55')
    expect(item.counter.submitter.handle).toBe('chal-h')
    expect(item.filedAt).toBeTruthy()
    expect(body.data.total).toBe(1)
  })

  it('paginates via limit + offset', async () => {
    // Seed 3 contests, request limit=2 offset=1 → expect 2 items, total=3.
    // ... (write 3 contests + assert)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter @concert-crawl/api test:integration -- contests.integration
```

Expected: FAIL — the route does not exist; expect 404.

- [ ] **Step 3: Create the router + list endpoint**

Create `apps/api/src/routes/admin/contests.ts`:

```typescript
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { and, asc, count, desc, eq, inArray, isNotNull, sql } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { z } from 'zod'
import { db } from '../../db.js'
import {
  events,
  priceSubmissions,
  userProfiles,
  venues,
} from '@concert-crawl/db'
import type { AdminVariables } from './index.js'
import { getAuthUser } from '../../middleware/auth.js'

export const contestsAdminRouter = new Hono<AdminVariables>()

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
})

// GET /v1/admin/contests/prices — paginated open price contests
contestsAdminRouter.get(
  '/prices',
  zValidator('query', listQuerySchema, (result, ctx) => {
    if (!result.success) {
      return ctx.json({ success: false, error: 'Invalid query params' }, 422)
    }
  }),
  async (ctx) => {
    const { limit, offset } = ctx.req.valid('query')

    // Pivot the query around the counter (the pending dispute row) so we can
    // ORDER BY counter.createdAt — the spec's filedAt (oldest contest first).
    // The §4.6 partial unique index guarantees at most one pending counter per
    // parent, so one counter row = one contest. parentAlias is the aliased
    // self-join target.
    const parentAlias = alias(priceSubmissions, 'parent')
    const counterRows = await db
      .select({
        contestId: parentAlias.id,
        eventId: parentAlias.eventId,
        eventTitle: events.title,
        venueName: venues.name,
        eventDate: events.date,
        tier: parentAlias.tier,
        sourceCategory: parentAlias.sourceCategory,
        // Parent fields (the disputed corroborated submission)
        parentId: parentAlias.id,
        parentPriceMin: parentAlias.priceMin,
        parentPriceMax: parentAlias.priceMax,
        parentVendor: parentAlias.vendor,
        parentUserId: parentAlias.userId,
        parentObservedAt: parentAlias.createdAt,
        parentLastUpdatedAt: parentAlias.updatedAt,
        parentNote: parentAlias.note,
        // corroborationCount already includes the submitter's implicit
        // observation (1/2 model: default flipped 0→1 in PR #705 with the
        // (COUNT(submission_confirms)+1) backfill). This is the right field
        // for the "fans" count, NOT a SELECT COUNT(*) on submission_confirms
        // which would undercount by 1.
        parentCorroborationCount: parentAlias.corroborationCount,
        // Counter fields (the pending challenger). createdAt = filedAt per spec §6.1.
        counterId: priceSubmissions.id,
        counterPriceMin: priceSubmissions.priceMin,
        counterPriceMax: priceSubmissions.priceMax,
        counterVendor: priceSubmissions.vendor,
        counterUserId: priceSubmissions.userId,
        counterObservedAt: priceSubmissions.createdAt,
        counterNote: priceSubmissions.note,
        // Counter confirms mirror the parent shape — drives the queue row's
        // counter attribution text per design table §2. corroborationCount
        // on a pending counter starts at 1 (submitter = observation #1).
        counterCorroborationCount: priceSubmissions.corroborationCount,
        filedAt: priceSubmissions.createdAt,
      })
      .from(priceSubmissions)
      .innerJoin(parentAlias, eq(parentAlias.id, priceSubmissions.disputedSubmissionId))
      .innerJoin(events, eq(events.id, parentAlias.eventId))
      .innerJoin(venues, eq(venues.id, events.venueId))
      .where(
        and(
          eq(priceSubmissions.status, 'pending'),
          isNotNull(priceSubmissions.disputedSubmissionId),
          eq(parentAlias.status, 'disputed'),
        ),
      )
      .orderBy(asc(priceSubmissions.createdAt))
      .limit(limit)
      .offset(offset)

    // Resolve handles for every userId surfaced across both sides.
    const parentIds = counterRows.map((row) => row.parentId)
    const allUserIds = Array.from(
      new Set(
        [
          ...counterRows.map((row) => row.parentUserId),
          ...counterRows.map((row) => row.counterUserId),
        ].filter((uid): uid is string => uid !== null),
      ),
    )
    const handleMap = new Map<string, string | null>()
    if (allUserIds.length > 0) {
      const handles = await db
        .select({
          userId: userProfiles.userId,
          handle: userProfiles.handle,
        })
        .from(userProfiles)
        .where(inArray(userProfiles.userId, allUserIds))
      for (const row of handles) handleMap.set(row.userId, row.handle ?? null)
    }

    // `fans` count comes from corroborationCount directly (it already
    // includes the submitter's implicit observation #1 — see the SELECT
    // comment above). Admin=0 stays as a placeholder until the
    // submission_confirms table grows a method/kind that distinguishes
    // admin approvals from fan confirms. No separate count query needed.

    const items = counterRows.map((row) => ({
      contestId: row.contestId,
      eventId: row.eventId,
      eventTitle: row.eventTitle ?? '',
      venueName: row.venueName ?? '',
      eventDate: row.eventDate ?? '',
      tier: row.tier,
      sourceCategory: row.sourceCategory,
      parent: {
        id: row.parentId,
        priceMin: row.parentPriceMin,
        priceMax: row.parentPriceMax,
        vendor: row.parentVendor,
        submitter: {
          userId: row.parentUserId ?? '',
          handle: row.parentUserId
            ? (handleMap.get(row.parentUserId) ?? null)
            : null,
        },
        confirms: {
          fans: row.parentCorroborationCount,
          admin: 0,
        },
        observedAt: row.parentObservedAt.toISOString(),
        lastUpdatedAt: row.parentLastUpdatedAt.toISOString(),
        note: row.parentNote ?? null,
      },
      counter: {
        id: row.counterId,
        priceMin: row.counterPriceMin,
        priceMax: row.counterPriceMax,
        vendor: row.counterVendor,
        submitter: {
          userId: row.counterUserId ?? '',
          handle: row.counterUserId
            ? (handleMap.get(row.counterUserId) ?? null)
            : null,
        },
        confirms: {
          fans: row.counterCorroborationCount,
          admin: 0,
        },
        observedAt: row.counterObservedAt.toISOString(),
        note: row.counterNote ?? null,
      },
      filedAt: row.filedAt.toISOString(),
    }))

    // total counts contests by their pending counter (matching the items
    // shape), not by parents with status='disputed' — those numbers can
    // differ if a parent is flagged disputed but the counter was withdrawn.
    const [{ value: total }] = await db
      .select({ value: count() })
      .from(priceSubmissions)
      .where(
        and(
          eq(priceSubmissions.status, 'pending'),
          isNotNull(priceSubmissions.disputedSubmissionId),
        ),
      )

    return ctx.json({
      success: true,
      data: { items, total, limit, offset },
    })
  },
)
```

- [ ] **Step 4: Mount the router**

In `apps/api/src/routes/admin/index.ts`, add the import and mount:

```typescript
import { contestsAdminRouter } from './contests.js'
// ...
adminRouter.route('/contests', contestsAdminRouter)
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
pnpm --filter @concert-crawl/api test:integration -- contests.integration
```

Expected: PASS — 3 list tests green.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/routes/admin/contests.ts \
        apps/api/src/routes/admin/contests.integration.test.ts \
        apps/api/src/routes/admin/index.ts
git commit -m "feat(api): GET /v1/admin/contests/prices — paginated open price contests"
```

---

### Task 7: `GET /v1/admin/contests/prices/:contestId` detail endpoint

**Files:**

- Modify: `apps/api/src/routes/admin/contests.ts`
- Modify: `apps/api/src/routes/admin/contests.integration.test.ts`

**Interfaces:**

- Consumes: same Drizzle schemas as Task 6.
- Produces: returns a single `PriceContestRow` (same shape as list items) plus an optional `history: []` field (empty array for v1; future PR can populate). Returns 404 when the parent submission with `contestId` doesn't exist. Returns the current state (status reflects archived/withdrawn) for stale-state cases — the panel renders read-only banner client-side based on `parent.status` or `counter.status`.

- [ ] **Step 1: Write the failing test**

Append to `apps/api/src/routes/admin/contests.integration.test.ts`:

```typescript
describe('GET /v1/admin/contests/prices/:contestId', () => {
  it('returns the contest detail when both sides exist', async () => {
    const venue = await seedVenue({ name: 'Detail', slug: 'contest-detail-1' })
    const event = await seedEvent(venue.id, { date: '2027-06-01' })
    const submitter = await seedUserProfile('p-u', { handle: 'p' })
    const challenger = await seedUserProfile('c-u', { handle: 'c' })
    const parent = await seedPriceSubmission(event.id, submitter.userId, {
      tier: 'GA',
      vendor: 'AXS',
      sourceCategory: 'standard',
      priceMin: '40',
      status: 'disputed',
    })
    await seedPriceSubmission(event.id, challenger.userId, {
      tier: 'GA',
      vendor: 'AXS',
      sourceCategory: 'standard',
      priceMin: '55',
      status: 'pending',
      disputedSubmissionId: parent.id,
    })

    const res = await app.request(
      `/v1/admin/contests/prices/${parent.id}`,
      { headers: ADMIN_HEADERS },
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      success: boolean
      data: { contestId: string; parent: { priceMin: string }; counter: { priceMin: string }; history: unknown[] }
    }
    expect(body.success).toBe(true)
    expect(body.data.contestId).toBe(parent.id)
    expect(body.data.parent.priceMin).toBe('40')
    expect(body.data.counter.priceMin).toBe('55')
    expect(body.data.history).toEqual([])
  })

  it('returns 404 for an unknown contestId', async () => {
    const res = await app.request(
      '/v1/admin/contests/prices/00000000-0000-0000-0000-000000000000',
      { headers: ADMIN_HEADERS },
    )
    expect(res.status).toBe(404)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter @concert-crawl/api test:integration -- contests.integration
```

Expected: FAIL — route doesn't exist.

- [ ] **Step 3: Implement the detail handler**

Append to `apps/api/src/routes/admin/contests.ts`:

```typescript
contestsAdminRouter.get('/prices/:contestId', async (ctx) => {
  const { contestId } = ctx.req.param()

  const [parentRow] = await db
    .select({
      id: priceSubmissions.id,
      eventId: priceSubmissions.eventId,
      eventTitle: events.title,
      venueName: venues.name,
      eventDate: events.date,
      tier: priceSubmissions.tier,
      sourceCategory: priceSubmissions.sourceCategory,
      priceMin: priceSubmissions.priceMin,
      priceMax: priceSubmissions.priceMax,
      vendor: priceSubmissions.vendor,
      userId: priceSubmissions.userId,
      observedAt: priceSubmissions.createdAt,
      lastUpdatedAt: priceSubmissions.updatedAt,
      note: priceSubmissions.note,
      status: priceSubmissions.status,
      corroborationCount: priceSubmissions.corroborationCount,
    })
    .from(priceSubmissions)
    .innerJoin(events, eq(events.id, priceSubmissions.eventId))
    .innerJoin(venues, eq(venues.id, events.venueId))
    .where(eq(priceSubmissions.id, contestId))
    .limit(1)

  if (!parentRow) {
    return ctx.json({ success: false, error: 'Contest not found' }, 404)
  }

  // The counter is the one pending row whose disputedSubmissionId matches.
  // If the contest has already resolved (parent_wins → counter archived;
  // challenger_wins → counter corroborated + parent archived), surface the
  // most recent counter regardless of status so the panel can render the
  // stale-state read-only view.
  const [counterRow] = await db
    .select({
      id: priceSubmissions.id,
      priceMin: priceSubmissions.priceMin,
      priceMax: priceSubmissions.priceMax,
      vendor: priceSubmissions.vendor,
      userId: priceSubmissions.userId,
      observedAt: priceSubmissions.createdAt,
      note: priceSubmissions.note,
      status: priceSubmissions.status,
      corroborationCount: priceSubmissions.corroborationCount,
      lastAdminActionAt: priceSubmissions.lastAdminActionAt,
      lastAdminActionKind: priceSubmissions.lastAdminActionKind,
    })
    .from(priceSubmissions)
    .where(eq(priceSubmissions.disputedSubmissionId, contestId))
    .orderBy(desc(priceSubmissions.createdAt))
    .limit(1)

  if (!counterRow) {
    return ctx.json({ success: false, error: 'Counter not found' }, 404)
  }

  // Resolve handles.
  const userIds = [parentRow.userId, counterRow.userId].filter(
    (uid): uid is string => uid !== null,
  )
  const handleMap = new Map<string, string | null>()
  if (userIds.length > 0) {
    const handles = await db
      .select({ userId: userProfiles.userId, handle: userProfiles.handle })
      .from(userProfiles)
      .where(inArray(userProfiles.userId, userIds))
    for (const row of handles) handleMap.set(row.userId, row.handle ?? null)
  }

  // fans = corroborationCount (already includes the submitter's implicit
  // observation #1 — see list endpoint for the same comment). No separate
  // submission_confirms query needed.

  return ctx.json({
    success: true,
    data: {
      contestId: parentRow.id,
      eventId: parentRow.eventId,
      eventTitle: parentRow.eventTitle ?? '',
      venueName: parentRow.venueName ?? '',
      eventDate: parentRow.eventDate ?? '',
      tier: parentRow.tier,
      sourceCategory: parentRow.sourceCategory,
      parent: {
        id: parentRow.id,
        priceMin: parentRow.priceMin,
        priceMax: parentRow.priceMax,
        vendor: parentRow.vendor,
        submitter: {
          userId: parentRow.userId ?? '',
          handle: parentRow.userId ? (handleMap.get(parentRow.userId) ?? null) : null,
        },
        confirms: {
          fans: parentRow.corroborationCount,
          admin: 0,
        },
        observedAt: parentRow.observedAt.toISOString(),
        lastUpdatedAt: parentRow.lastUpdatedAt.toISOString(),
        note: parentRow.note ?? null,
        status: parentRow.status,
      },
      counter: {
        id: counterRow.id,
        priceMin: counterRow.priceMin,
        priceMax: counterRow.priceMax,
        vendor: counterRow.vendor,
        submitter: {
          userId: counterRow.userId ?? '',
          handle: counterRow.userId
            ? (handleMap.get(counterRow.userId) ?? null)
            : null,
        },
        confirms: {
          fans: counterRow.corroborationCount,
          admin: 0,
        },
        observedAt: counterRow.observedAt.toISOString(),
        note: counterRow.note ?? null,
        status: counterRow.status,
        lastAdminActionAt: counterRow.lastAdminActionAt?.toISOString() ?? null,
        lastAdminActionKind: counterRow.lastAdminActionKind ?? null,
      },
      filedAt: counterRow.observedAt.toISOString(),
      history: [],
    },
  })
})
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm --filter @concert-crawl/api test:integration -- contests.integration
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/routes/admin/contests.ts \
        apps/api/src/routes/admin/contests.integration.test.ts
git commit -m "feat(api): GET /v1/admin/contests/prices/:contestId — contest detail"
```

---

### Task 8: `POST /v1/admin/contests/prices/:contestId/resolve` (atomic transaction)

**Files:**

- Modify: `apps/api/src/routes/admin/contests.ts`
- Modify: `apps/api/src/routes/admin/contests.integration.test.ts`

**Interfaces:**

- Consumes: `db.transaction`, `priceSubmissions`, `events`, `userRoles`.
- Produces:
  - `POST /v1/admin/contests/prices/:contestId/resolve` with body `{ resolution: 'parent_wins' | 'challenger_wins', reason: string (10-2000 chars) }`.
  - Single transaction: SELECT FOR UPDATE on both rows; sanity gates; status flips; events projection (challenger_wins only); cred award; orphan cleanup.
  - 200 with `{ success: true, data: { resolution, parent, challenger, eventPriceUpdated: boolean } }` on success.
  - 400 if reason < 10 chars.
  - 404 if contestId not found.
  - 409 if any precondition fails (parent already archived, challenger withdrawn, etc.) with `{ success: false, error: <which precondition> }`.

- [ ] **Step 1: Write the failing tests**

Append to `apps/api/src/routes/admin/contests.integration.test.ts`:

```typescript
describe('POST /v1/admin/contests/prices/:contestId/resolve', () => {
  const seedContest = async () => {
    const venue = await seedVenue({ name: 'Resolve', slug: `resolve-${Date.now()}-${Math.random()}` })
    const event = await seedEvent(venue.id, {
      date: '2027-06-01',
      ticketPriceMin: '40',
      priceSource: 'community',
    })
    const submitter = await seedUserProfile(`sub-${Math.random()}`, { handle: 'sub' })
    const challenger = await seedUserProfile(`chal-${Math.random()}`, { handle: 'chal' })
    const parent = await seedPriceSubmission(event.id, submitter.userId, {
      tier: 'GA',
      vendor: 'AXS',
      sourceCategory: 'standard',
      priceMin: '40',
      status: 'disputed',
    })
    const counter = await seedPriceSubmission(event.id, challenger.userId, {
      tier: 'GA',
      vendor: 'AXS',
      sourceCategory: 'standard',
      priceMin: '55',
      status: 'pending',
      disputedSubmissionId: parent.id,
    })
    return { venue, event, submitter, challenger, parent, counter }
  }

  it('parent_wins keeps parent corroborated + archives counter + events row unchanged', async () => {
    const { event, parent, counter } = await seedContest()
    const res = await app.request(
      `/v1/admin/contests/prices/${parent.id}/resolve`,
      {
        method: 'POST',
        headers: {
          ...ADMIN_HEADERS,
        },
        body: JSON.stringify({
          resolution: 'parent_wins',
          reason: 'Original price still accurate per box-office confirmation.',
        }),
      },
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      data: { resolution: string; eventPriceUpdated: boolean }
    }
    expect(body.data.resolution).toBe('parent_wins')
    expect(body.data.eventPriceUpdated).toBe(false)

    // Parent flips back to corroborated; counter goes to archived with reason.
    const parentAfter = await fetchSubmission(parent.id)
    const counterAfter = await fetchSubmission(counter.id)
    expect(parentAfter.status).toBe('corroborated')
    expect(counterAfter.status).toBe('archived')
    expect(counterAfter.archivedReason).toMatch(/box-office/i)

    // events row unchanged (still $40).
    const eventAfter = await fetchEvent(event.id)
    expect(eventAfter.ticketPriceMin).toBe('40')
  })

  it('challenger_wins corroborates counter + archives parent + updates events row + awards cred', async () => {
    const { event, parent, counter, challenger } = await seedContest()
    const credBefore = await fetchCred(challenger.userId)
    const res = await app.request(
      `/v1/admin/contests/prices/${parent.id}/resolve`,
      {
        method: 'POST',
        headers: {
          ...ADMIN_HEADERS,
        },
        body: JSON.stringify({
          resolution: 'challenger_wins',
          reason: 'Verified AXS face moved to $55 after openers announced.',
        }),
      },
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      data: { resolution: string; eventPriceUpdated: boolean }
    }
    expect(body.data.eventPriceUpdated).toBe(true)

    const parentAfter = await fetchSubmission(parent.id)
    const counterAfter = await fetchSubmission(counter.id)
    expect(parentAfter.status).toBe('archived')
    expect(parentAfter.archivedReason).toMatch(/AXS face moved/i)
    expect(counterAfter.status).toBe('corroborated')

    const eventAfter = await fetchEvent(event.id)
    expect(eventAfter.ticketPriceMin).toBe('55')

    const credAfter = await fetchCred(challenger.userId)
    expect(credAfter).toBe(credBefore + 1)
  })

  it('rejects reason < 10 chars with 400', async () => {
    const { parent } = await seedContest()
    const res = await app.request(
      `/v1/admin/contests/prices/${parent.id}/resolve`,
      {
        method: 'POST',
        headers: {
          ...ADMIN_HEADERS,
        },
        body: JSON.stringify({ resolution: 'parent_wins', reason: 'short' }),
      },
    )
    expect([400, 422]).toContain(res.status)
  })

  it('returns 409 when parent is already archived (stale state)', async () => {
    const { parent } = await seedContest()
    // Simulate concurrent resolution: another admin already archived parent.
    await db
      .update(priceSubmissions)
      .set({ status: 'archived', archivedReason: 'beat-you-to-it' })
      .where(eq(priceSubmissions.id, parent.id))

    const res = await app.request(
      `/v1/admin/contests/prices/${parent.id}/resolve`,
      {
        method: 'POST',
        headers: {
          ...ADMIN_HEADERS,
        },
        body: JSON.stringify({
          resolution: 'parent_wins',
          reason: 'Should be rejected because parent already archived.',
        }),
      },
    )
    expect(res.status).toBe(409)
  })
})
```

(`fetchSubmission`, `fetchEvent`, `fetchCred` are seed-helpers that exist in `apps/api/src/test/helpers/seed.ts` — verify their signatures; if not present, add them as one-line wrappers around `db.select(...).where(...).limit(1)`.)

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm --filter @concert-crawl/api test:integration -- contests.integration
```

Expected: FAIL — resolve route doesn't exist.

- [ ] **Step 3: Implement the resolve handler**

Append to `apps/api/src/routes/admin/contests.ts`:

```typescript
const resolveBodySchema = z.object({
  resolution: z.enum(['parent_wins', 'challenger_wins']),
  reason: z.string().min(10).max(2000),
})

contestsAdminRouter.post(
  '/prices/:contestId/resolve',
  zValidator('json', resolveBodySchema, (result, ctx) => {
    if (!result.success) {
      return ctx.json(
        { success: false, error: 'Reason must be 10–2000 characters.' },
        400,
      )
    }
  }),
  async (ctx) => {
    const { contestId } = ctx.req.param()
    const { resolution, reason } = ctx.req.valid('json')
    const admin = getAuthUser(ctx)

    type TxOutcome =
      | { ok: true; parent: typeof priceSubmissions.$inferSelect; challenger: typeof priceSubmissions.$inferSelect; eventPriceUpdated: boolean; orphanedCounterIds: string[]; before: { parent: { status: string; priceMin: string; priceMax: string | null }; challenger: { status: string; priceMin: string; priceMax: string | null } } }
      | { ok: 'not_found' }
      | { ok: 'precondition_failed'; reason: string }

    const outcome: TxOutcome = await db.transaction(async (tx) => {
      // Lock both rows for the duration of the transaction. The counter is the
      // single pending row pointing at this contestId; the unique index from
      // migration 0041 guarantees there's at most one.
      const [parent] = await tx
        .select()
        .from(priceSubmissions)
        .where(eq(priceSubmissions.id, contestId))
        .limit(1)
        .for('update')
      if (!parent) return { ok: 'not_found' }

      const [challenger] = await tx
        .select()
        .from(priceSubmissions)
        .where(
          and(
            eq(priceSubmissions.disputedSubmissionId, contestId),
            eq(priceSubmissions.status, 'pending'),
          ),
        )
        .limit(1)
        .for('update')
      if (!challenger) {
        return {
          ok: 'precondition_failed',
          reason: 'No pending counter exists for this contest.',
        }
      }

      // Sanity gates.
      if (parent.disputedSubmissionId !== null) {
        return {
          ok: 'precondition_failed',
          reason: 'Target row is a counter, not a parent.',
        }
      }
      if (parent.status !== 'disputed' && parent.status !== 'corroborated') {
        return {
          ok: 'precondition_failed',
          reason: `Parent status is ${parent.status}; cannot resolve.`,
        }
      }
      if (challenger.status !== 'pending') {
        return {
          ok: 'precondition_failed',
          reason: `Challenger status is ${challenger.status}; cannot resolve.`,
        }
      }

      const before = {
        parent: {
          status: parent.status,
          priceMin: parent.priceMin,
          priceMax: parent.priceMax,
        },
        challenger: {
          status: challenger.status,
          priceMin: challenger.priceMin,
          priceMax: challenger.priceMax,
        },
      }

      let eventPriceUpdated = false

      // Every status-flip below also clears lastAdminActionKind +
      // lastAdminActionAt — per spec §4.5, the 'Admin requested more info'
      // pill (powered by lastAdminActionKind === 'defer') must NOT persist
      // past resolution. A previously-deferred contest that's now resolved
      // should look fully resolved on the event detail page.

      if (resolution === 'challenger_wins') {
        await tx
          .update(priceSubmissions)
          .set({
            status: 'corroborated',
            lastAdminActionKind: null,
            lastAdminActionAt: null,
            updatedAt: sql`now()`,
          })
          .where(eq(priceSubmissions.id, challenger.id))
        await tx
          .update(priceSubmissions)
          .set({
            status: 'archived',
            archivedReason: reason,
            lastAdminActionKind: null,
            lastAdminActionAt: null,
            updatedAt: sql`now()`,
          })
          .where(eq(priceSubmissions.id, parent.id))
        await tx
          .update(events)
          .set({
            ticketPriceMin: challenger.priceMin,
            ticketPriceMax: challenger.priceMax ?? null,
            priceSource: 'community',
            updatedAt: sql`now()`,
          })
          .where(eq(events.id, parent.eventId))
        eventPriceUpdated = true
        if (challenger.userId !== null) {
          await tx
            .update(userRoles)
            .set({ priceCredScore: sql`${userRoles.priceCredScore} + 1` })
            .where(eq(userRoles.userId, challenger.userId))
        }
      } else {
        // parent_wins
        await tx
          .update(priceSubmissions)
          .set({
            status: 'corroborated',
            lastAdminActionKind: null,
            lastAdminActionAt: null,
            updatedAt: sql`now()`,
          })
          .where(eq(priceSubmissions.id, parent.id))
        await tx
          .update(priceSubmissions)
          .set({
            status: 'archived',
            archivedReason: reason,
            lastAdminActionKind: null,
            lastAdminActionAt: null,
            updatedAt: sql`now()`,
          })
          .where(eq(priceSubmissions.id, challenger.id))
        // events row already reflects parent's price; no propagation.
        // Parent submitter already had cred from initial corroboration.
      }

      // Orphaned-counter cleanup. The unique index makes this dead-by-
      // construction in steady state (only one pending counter can exist per
      // parent at any time), but a migration-window race could leave stragglers
      // — archive them with a tagged reason.
      const orphanedCounterIds: string[] = []
      if (resolution === 'challenger_wins') {
        const orphans = await tx
          .update(priceSubmissions)
          .set({
            status: 'archived',
            archivedReason:
              'parent was archived in a contest; refile against new winner',
            updatedAt: sql`now()`,
          })
          .where(
            and(
              eq(priceSubmissions.disputedSubmissionId, parent.id),
              sql`${priceSubmissions.id} != ${challenger.id}`,
              eq(priceSubmissions.status, 'pending'),
            ),
          )
          .returning({ id: priceSubmissions.id })
        for (const orphan of orphans) orphanedCounterIds.push(orphan.id)
      }

      const [parentAfter] = await tx
        .select()
        .from(priceSubmissions)
        .where(eq(priceSubmissions.id, parent.id))
        .limit(1)
      const [challengerAfter] = await tx
        .select()
        .from(priceSubmissions)
        .where(eq(priceSubmissions.id, challenger.id))
        .limit(1)
      if (!parentAfter || !challengerAfter) {
        throw new Error('Post-resolution read failed')
      }

      return {
        ok: true,
        parent: parentAfter,
        challenger: challengerAfter,
        eventPriceUpdated,
        orphanedCounterIds,
        before,
      }
    })

    if (outcome.ok === 'not_found') {
      return ctx.json({ success: false, error: 'Contest not found' }, 404)
    }
    if (outcome.ok === 'precondition_failed') {
      return ctx.json({ success: false, error: outcome.reason }, 409)
    }

    // Audit row (outside the transaction).
    ctx.set('auditActorId', admin.userId)
    ctx.set('auditAction', 'contest.resolve')
    ctx.set('auditTargetId', contestId)
    ctx.set('auditMeta', {
      resolution,
      parentId: outcome.parent.id,
      challengerId: outcome.challenger.id,
      eventId: outcome.parent.eventId,
      tier: outcome.parent.tier,
      sourceCategory: outcome.parent.sourceCategory,
      reason,
      parentBefore: outcome.before.parent,
      parentAfter: {
        status: outcome.parent.status,
        priceMin: outcome.parent.priceMin,
        priceMax: outcome.parent.priceMax,
      },
      challengerBefore: outcome.before.challenger,
      challengerAfter: {
        status: outcome.challenger.status,
        priceMin: outcome.challenger.priceMin,
        priceMax: outcome.challenger.priceMax,
      },
      eventPriceUpdated: outcome.eventPriceUpdated,
      orphanedCounterIds: outcome.orphanedCounterIds,
    })

    // Notification fan-out is wired in Task 10.

    return ctx.json({
      success: true,
      data: {
        resolution,
        parent: outcome.parent,
        challenger: outcome.challenger,
        eventPriceUpdated: outcome.eventPriceUpdated,
      },
    })
  },
)
```

Required imports — verify present, otherwise add:

```typescript
import { userRoles } from '@concert-crawl/db'
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm --filter @concert-crawl/api test:integration -- contests.integration
```

Expected: PASS — 4 resolve tests + earlier tests still green.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/routes/admin/contests.ts \
        apps/api/src/routes/admin/contests.integration.test.ts
git commit -m "feat(api): POST /v1/admin/contests/prices/:contestId/resolve — atomic contest resolution"
```

---

### Task 9: `POST /v1/admin/contests/prices/:contestId/defer`

**Files:**

- Modify: `apps/api/src/routes/admin/contests.ts`
- Modify: `apps/api/src/routes/admin/contests.integration.test.ts`

**Interfaces:**

- Consumes: `priceSubmissions` schema.
- Produces:
  - `POST /v1/admin/contests/prices/:contestId/defer` with body `{ reason: string (10-2000 chars) }`.
  - **Sets `last_admin_action_at = NOW()` and `last_admin_action_kind = 'defer'` on the COUNTER row** (the counterSubmission surface is where the consumer pill renders, per spec §4.5).
  - No status changes — parent stays `disputed`, challenger stays `pending`.
  - 200 with `{ success: true, data: { contestId, deferredAt } }`.
  - 400 if reason < 10 chars. 404 if contest not found. 409 if no pending counter exists.

- [ ] **Step 1: Write the failing tests**

Append to `apps/api/src/routes/admin/contests.integration.test.ts`:

```typescript
describe('POST /v1/admin/contests/prices/:contestId/defer', () => {
  it('sets last_admin_action_at + kind on the counter and leaves status unchanged', async () => {
    const { parent, counter } = await seedContest()
    const res = await app.request(
      `/v1/admin/contests/prices/${parent.id}/defer`,
      {
        method: 'POST',
        headers: {
          ...ADMIN_HEADERS,
        },
        body: JSON.stringify({
          reason: 'Need ticket URL screenshot to verify the new price.',
        }),
      },
    )
    expect(res.status).toBe(200)

    const parentAfter = await fetchSubmission(parent.id)
    const counterAfter = await fetchSubmission(counter.id)
    expect(parentAfter.status).toBe('disputed')
    expect(counterAfter.status).toBe('pending')
    expect(counterAfter.lastAdminActionKind).toBe('defer')
    expect(counterAfter.lastAdminActionAt).not.toBeNull()
  })

  it('rejects reason < 10 chars with 400', async () => {
    const { parent } = await seedContest()
    const res = await app.request(
      `/v1/admin/contests/prices/${parent.id}/defer`,
      {
        method: 'POST',
        headers: {
          ...ADMIN_HEADERS,
        },
        body: JSON.stringify({ reason: 'too short' }),
      },
    )
    expect([400, 422]).toContain(res.status)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter @concert-crawl/api test:integration -- contests.integration
```

Expected: FAIL — defer route doesn't exist.

- [ ] **Step 3: Implement the defer handler**

Append to `apps/api/src/routes/admin/contests.ts`:

```typescript
const deferBodySchema = z.object({
  reason: z.string().min(10).max(2000),
})

contestsAdminRouter.post(
  '/prices/:contestId/defer',
  zValidator('json', deferBodySchema, (result, ctx) => {
    if (!result.success) {
      return ctx.json(
        { success: false, error: 'Reason must be 10–2000 characters.' },
        400,
      )
    }
  }),
  async (ctx) => {
    const { contestId } = ctx.req.param()
    const { reason } = ctx.req.valid('json')
    const admin = getAuthUser(ctx)

    const [parent] = await db
      .select({
        id: priceSubmissions.id,
        eventId: priceSubmissions.eventId,
        status: priceSubmissions.status,
        userId: priceSubmissions.userId,
      })
      .from(priceSubmissions)
      .where(eq(priceSubmissions.id, contestId))
      .limit(1)
    if (!parent) {
      return ctx.json({ success: false, error: 'Contest not found' }, 404)
    }

    const [counter] = await db
      .select({
        id: priceSubmissions.id,
        status: priceSubmissions.status,
        userId: priceSubmissions.userId,
      })
      .from(priceSubmissions)
      .where(
        and(
          eq(priceSubmissions.disputedSubmissionId, contestId),
          eq(priceSubmissions.status, 'pending'),
        ),
      )
      .limit(1)
    if (!counter) {
      return ctx.json(
        { success: false, error: 'No pending counter exists for this contest.' },
        409,
      )
    }

    const [updated] = await db
      .update(priceSubmissions)
      .set({
        lastAdminActionAt: sql`now()`,
        lastAdminActionKind: 'defer',
      })
      .where(eq(priceSubmissions.id, counter.id))
      .returning({ lastAdminActionAt: priceSubmissions.lastAdminActionAt })

    ctx.set('auditActorId', admin.userId)
    ctx.set('auditAction', 'contest.defer')
    ctx.set('auditTargetId', contestId)
    ctx.set('auditMeta', {
      parentId: parent.id,
      challengerId: counter.id,
      eventId: parent.eventId,
      reason,
    })

    // Notification fan-out is wired in Task 10.

    return ctx.json({
      success: true,
      data: {
        contestId: parent.id,
        deferredAt: updated?.lastAdminActionAt?.toISOString() ?? null,
      },
    })
  },
)
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm --filter @concert-crawl/api test:integration -- contests.integration
```

Expected: PASS — defer tests green.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/routes/admin/contests.ts \
        apps/api/src/routes/admin/contests.integration.test.ts
git commit -m "feat(api): POST /v1/admin/contests/prices/:contestId/defer — sets last_admin_action_*"
```

---

### Task 10: Notification helper + wire into resolve/defer

**Files:**

- Create: `apps/api/src/lib/contest-notifications.ts`
- Create: `apps/api/src/lib/contest-notifications.test.ts`
- Modify: `apps/api/src/routes/admin/contests.ts` (call the helper after each action)
- Modify: `apps/api/src/routes/admin/contests.integration.test.ts` (assert notification rows exist)

**Interfaces:**

- Consumes: `notifications` Drizzle schema (verify table name — adjust to actual schema export).
- Produces:

  ```ts
  export interface ContestNotificationInput {
    contestId: string
    parentSubmissionId: string
    challengerSubmissionId: string
    parentUserId: string | null
    challengerUserId: string | null
    eventId: string
    action: 'resolve' | 'defer'
    resolution?: 'parent_wins' | 'challenger_wins'
    reason: string
  }
  export async function writeContestNotifications(
    input: ContestNotificationInput,
  ): Promise<{ written: number }>
  ```

  Behavior:
  - Writes 2 rows (parent submitter + challenger submitter) unless both `userId` fields are null.
  - **Dedupes** if `parentUserId === challengerUserId` (same user disputing themselves — impossible by guard, but defensive).
  - Row shape:
    - `type: 'user_notification'`
    - `category: 'contest.resolved'` (resolve) OR `'contest.needs_info'` (defer)
    - `title: 'Your price submission was reviewed.'` (resolve) OR `'More info requested on your price submission.'` (defer)
    - `body: <reason>`
    - `actionUrl: /events/<eventId>`
    - `metadata: JSON.stringify({ submissionId, contestId, resolution? })` (text column in DB, not jsonb)

- [ ] **Step 1: Write the failing unit test**

Create `apps/api/src/lib/contest-notifications.test.ts`:

```typescript
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { writeContestNotifications } from './contest-notifications.js'
import { db } from '../db.js'
import { notifications } from '@concert-crawl/db'
import { eq, inArray } from 'drizzle-orm'

describe('writeContestNotifications', () => {
  const created: string[] = []

  afterEach(async () => {
    if (created.length > 0) {
      await db.delete(notifications).where(inArray(notifications.id, created))
      created.length = 0
    }
  })

  it('writes 2 rows for resolve when parent + challenger users differ', async () => {
    const result = await writeContestNotifications({
      contestId: 'contest-1',
      parentSubmissionId: 'parent-sub-1',
      challengerSubmissionId: 'challenger-sub-1',
      parentUserId: 'user-A',
      challengerUserId: 'user-B',
      eventId: 'event-1',
      action: 'resolve',
      resolution: 'challenger_wins',
      reason: 'Vendor confirmed new face value.',
    })
    expect(result.written).toBe(2)

    const rows = await db
      .select()
      .from(notifications)
      .where(inArray(notifications.userId, ['user-A', 'user-B']))
    rows.forEach((row) => created.push(row.id))
    expect(rows).toHaveLength(2)
    rows.forEach((row) => {
      expect(row.category).toBe('contest.resolved')
      expect(row.title).toBe('Your price submission was reviewed.')
      expect(row.body).toBe('Vendor confirmed new face value.')
      expect(row.actionUrl).toBe('/events/event-1')
    })
  })

  it('dedupes when parentUserId === challengerUserId', async () => {
    const result = await writeContestNotifications({
      contestId: 'contest-2',
      parentSubmissionId: 'parent-sub-2',
      challengerSubmissionId: 'challenger-sub-2',
      parentUserId: 'user-same',
      challengerUserId: 'user-same',
      eventId: 'event-2',
      action: 'defer',
      reason: 'Need vendor screenshot.',
    })
    expect(result.written).toBe(1)
  })

  it('writes contest.needs_info category on defer', async () => {
    const result = await writeContestNotifications({
      contestId: 'contest-3',
      parentSubmissionId: 'parent-sub-3',
      challengerSubmissionId: 'challenger-sub-3',
      parentUserId: 'user-X',
      challengerUserId: 'user-Y',
      eventId: 'event-3',
      action: 'defer',
      reason: 'Need vendor screenshot.',
    })
    expect(result.written).toBe(2)

    const rows = await db
      .select()
      .from(notifications)
      .where(inArray(notifications.userId, ['user-X', 'user-Y']))
    rows.forEach((row) => created.push(row.id))
    rows.forEach((row) => {
      expect(row.category).toBe('contest.needs_info')
      expect(row.title).toBe('More info requested on your price submission.')
    })
  })

  it('skips rows when both user ids are null', async () => {
    const result = await writeContestNotifications({
      contestId: 'contest-4',
      parentSubmissionId: 'parent-sub-4',
      challengerSubmissionId: 'challenger-sub-4',
      parentUserId: null,
      challengerUserId: null,
      eventId: 'event-4',
      action: 'resolve',
      resolution: 'parent_wins',
      reason: 'Original was correct.',
    })
    expect(result.written).toBe(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter @concert-crawl/api test -- contest-notifications
```

Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Implement the helper**

Create `apps/api/src/lib/contest-notifications.ts`:

```typescript
import { db } from '../db.js'
import { notifications } from '@concert-crawl/db'

export interface ContestNotificationInput {
  contestId: string
  parentSubmissionId: string
  challengerSubmissionId: string
  parentUserId: string | null
  challengerUserId: string | null
  eventId: string
  action: 'resolve' | 'defer'
  resolution?: 'parent_wins' | 'challenger_wins'
  reason: string
}

type Recipient = {
  userId: string
  submissionId: string
}

export async function writeContestNotifications(
  input: ContestNotificationInput,
): Promise<{ written: number }> {
  const recipients: Recipient[] = []
  if (input.parentUserId !== null) {
    recipients.push({
      userId: input.parentUserId,
      submissionId: input.parentSubmissionId,
    })
  }
  if (
    input.challengerUserId !== null &&
    input.challengerUserId !== input.parentUserId
  ) {
    recipients.push({
      userId: input.challengerUserId,
      submissionId: input.challengerSubmissionId,
    })
  }

  if (recipients.length === 0) return { written: 0 }

  const category =
    input.action === 'resolve' ? 'contest.resolved' : 'contest.needs_info'
  const title =
    input.action === 'resolve'
      ? 'Your price submission was reviewed.'
      : 'More info requested on your price submission.'

  const rows = recipients.map((recipient) => ({
    userId: recipient.userId,
    type: 'user_notification' as const,
    category,
    title,
    body: input.reason,
    actionUrl: `/events/${input.eventId}`,
    // notifications.metadata is a `text` column per
    // packages/db/src/schema/notifications.ts:17 — serialize to JSON string
    // here. Drizzle won't auto-stringify a plain object into a text column;
    // inserting one would surface a Postgres type error at runtime.
    metadata: JSON.stringify({
      submissionId: recipient.submissionId,
      contestId: input.contestId,
      ...(input.resolution ? { resolution: input.resolution } : {}),
    }),
  }))

  await db.insert(notifications).values(rows)
  return { written: rows.length }
}
```

- [ ] **Step 4: Wire the helper into resolve + defer handlers**

In `apps/api/src/routes/admin/contests.ts`, **after** the transaction commits in the resolve handler and **after** the update commits in the defer handler (and **after** the audit-meta `ctx.set(...)` calls), call the helper. Wrap in a try/catch so notification failures don't fail the response — the audit row already captures intent.

For resolve handler, after setting audit meta:

```typescript
try {
  await writeContestNotifications({
    contestId: outcome.parent.id,
    parentSubmissionId: outcome.parent.id,
    challengerSubmissionId: outcome.challenger.id,
    parentUserId: outcome.parent.userId,
    challengerUserId: outcome.challenger.userId,
    eventId: outcome.parent.eventId,
    action: 'resolve',
    resolution,
    reason,
  })
} catch (notifyErr) {
  apiLogger.warn(
    { contestId, error: notifyErr },
    'Failed to write contest resolve notifications; resolution itself committed.',
  )
}
```

For defer handler, after setting audit meta:

```typescript
try {
  await writeContestNotifications({
    contestId: parent.id,
    parentSubmissionId: parent.id,
    challengerSubmissionId: counter.id,
    parentUserId: parent.userId,
    challengerUserId: counter.userId,
    eventId: parent.eventId,
    action: 'defer',
    reason,
  })
} catch (notifyErr) {
  apiLogger.warn(
    { contestId, error: notifyErr },
    'Failed to write contest defer notifications; defer itself committed.',
  )
}
```

Import the helper at the top of `contests.ts`:

```typescript
import { writeContestNotifications } from '../../lib/contest-notifications.js'
import { apiLogger } from '@concert-crawl/logger'
```

- [ ] **Step 5: Add an integration assertion**

Append to `apps/api/src/routes/admin/contests.integration.test.ts` inside the resolve describe:

```typescript
it('writes notification rows to both parties on resolve', async () => {
  const { parent, challenger } = await seedContest()
  await app.request(`/v1/admin/contests/prices/${parent.id}/resolve`, {
    method: 'POST',
    headers: {
      ...ADMIN_HEADERS,
    },
    body: JSON.stringify({
      resolution: 'challenger_wins',
      reason: 'Verified new face value via AXS confirmation.',
    }),
  })
  // Parent userId comes from parent.userId; challenger comes from contestData.challenger.userId.
  const rows = await db
    .select()
    .from(notifications)
    .where(
      and(
        eq(notifications.category, 'contest.resolved'),
        eq(notifications.actionUrl, `/events/${parent.eventId}`),
      ),
    )
  expect(rows.length).toBeGreaterThanOrEqual(2)
})
```

- [ ] **Step 6: Run tests**

```bash
pnpm --filter @concert-crawl/api test -- contest-notifications
pnpm --filter @concert-crawl/api test:integration -- contests.integration
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/lib/contest-notifications.ts \
        apps/api/src/lib/contest-notifications.test.ts \
        apps/api/src/routes/admin/contests.ts \
        apps/api/src/routes/admin/contests.integration.test.ts
git commit -m "feat(api): write contest notification rows on resolve/defer"
```

---

### Task 11: Counts endpoint extension — `priceContests`

**Files:**

- Modify: `apps/api/src/routes/admin/index.ts` (the `/v1/admin/review/counts` handler at ~line 73 — `adminRouter.get('/review/counts', ...)`)
- Modify: `apps/api/src/routes/admin/review.integration.test.ts`
- Modify: `apps/web/src/lib/queries/use-admin-review.ts` (extend `ReviewCounts` interface)

**Interfaces:**

- Consumes: existing counts response.
- Produces: response gains `priceContests: number` — the count of `price_submissions` rows where `status = 'disputed'`.

- [ ] **Step 1: Write the failing test**

In `apps/api/src/routes/admin/review.integration.test.ts`:

```typescript
it('counts response includes priceContests with the disputed-parent total', async () => {
  // Seed 2 open contests + 5 non-contest pending submissions.
  // ... seeds ...
  const res = await app.request('/v1/admin/review/counts', {
    headers: ADMIN_HEADERS,
  })
  expect(res.status).toBe(200)
  const body = (await res.json()) as {
    data: { priceContests: number; prices: number }
  }
  expect(body.data.priceContests).toBe(2)
  expect(body.data.prices).toBe(5)
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter @concert-crawl/api test:integration -- review.integration
```

Expected: FAIL — `priceContests` undefined.

- [ ] **Step 3: Add the count to the response**

In the counts handler, add a query for disputed-parent count and include in the response:

```typescript
const [contestsRow] = await db
  .select({ value: count() })
  .from(priceSubmissions)
  .where(eq(priceSubmissions.status, 'disputed'))

// ... in the response payload:
return ctx.json({
  success: true,
  data: {
    eventFlags,
    prices,
    missing,
    priceContests: contestsRow?.value ?? 0,
  },
})
```

- [ ] **Step 4: Update the web app type**

In `apps/web/src/lib/queries/use-admin-review.ts`, extend `ReviewCounts`:

```typescript
export interface ReviewCounts {
  eventFlags: number
  prices: number
  missing: number
  priceContests: number
}
```

- [ ] **Step 5: Run tests**

```bash
pnpm --filter @concert-crawl/api test:integration -- review.integration
pnpm --filter @concert-crawl/web typecheck
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/routes/admin/index.ts \
        apps/api/src/routes/admin/review.integration.test.ts \
        apps/web/src/lib/queries/use-admin-review.ts
git commit -m "feat(api): /v1/admin/review/counts adds priceContests field"
```

---

### Task 12: Event detail handler extends `counterSubmission`

**Files:**

- Modify: `apps/api/src/routes/events.ts`
- Modify: `apps/api/src/routes/events.integration.test.ts`
- Modify: `packages/types/src/index.ts` — `TierCounter` interface gains the two new fields

**Interfaces:**

- Consumes: `priceSubmissions.lastAdminActionAt` + `lastAdminActionKind`.
- Produces: `priceByTier[].counterSubmission` shape now includes:

  ```ts
  export interface TierCounter {
    id: string
    parentSubmissionId: string
    floor: number
    ceiling?: number
    submitter: { handle: string } | null
    submittedAt: string
    lastAdminActionAt: string | null
    lastAdminActionKind: 'defer' | null
  }
  ```

- [ ] **Step 1: Extend the `TierCounter` type**

In `packages/types/src/index.ts`, update the existing `TierCounter` interface from PR 3 of the price-source cycle:

```typescript
export interface TierCounter {
  id: string
  parentSubmissionId: string
  floor: number
  ceiling?: number
  submitter: { handle: string } | null
  submittedAt: string
  // Engagement-signal columns surfaced when an admin defers the contest.
  // The consumer event-detail page renders a quiet "Admin requested more
  // info" pill when lastAdminActionKind === 'defer'.
  lastAdminActionAt: string | null
  lastAdminActionKind: 'defer' | null
}
```

- [ ] **Step 2: Write the failing integration test**

Append to `apps/api/src/routes/events.integration.test.ts`:

```typescript
it('priceByTier counterSubmission carries lastAdminActionKind after defer', async () => {
  const venue = await seedVenue({ name: 'Defer surfacing', slug: 'defer-surface' })
  const event = await seedEvent(venue.id, {
    date: '2027-06-01',
    ticketPriceMin: '40',
    priceSource: 'community',
  })
  const submitter = await seedUserProfile('parent-u-d', { handle: 'p-d' })
  const challenger = await seedUserProfile('chal-u-d', { handle: 'c-d' })
  const parent = await seedPriceSubmission(event.id, submitter.userId, {
    tier: 'GA',
    vendor: 'AXS',
    sourceCategory: 'standard',
    priceMin: '40',
    status: 'disputed',
  })
  await seedPriceSubmission(event.id, challenger.userId, {
    tier: 'GA',
    vendor: 'AXS',
    sourceCategory: 'standard',
    priceMin: '55',
    status: 'pending',
    disputedSubmissionId: parent.id,
  })

  // Trigger a defer.
  await app.request(`/v1/admin/contests/prices/${parent.id}/defer`, {
    method: 'POST',
    headers: {
      ...ADMIN_HEADERS,
    },
    body: JSON.stringify({
      reason: 'Need a screenshot from the AXS cart to verify.',
    }),
  })

  const res = await app.request(`/v1/events/${event.id}`)
  const body = (await res.json()) as {
    data: {
      priceByTier: Array<{
        tier: string
        counterSubmission:
          | { lastAdminActionKind: string | null; lastAdminActionAt: string | null }
          | null
      }>
    }
  }
  const gaBlock = body.data.priceByTier.find((block) => block.tier === 'GA')
  expect(gaBlock?.counterSubmission?.lastAdminActionKind).toBe('defer')
  expect(gaBlock?.counterSubmission?.lastAdminActionAt).not.toBeNull()
})

it('counterSubmission.lastAdminActionKind is null when never deferred', async () => {
  // ... seed a contest without deferring it ...
  // Assert lastAdminActionKind === null in the counterSubmission block.
})
```

- [ ] **Step 3: Run test to verify it fails**

```bash
pnpm --filter @concert-crawl/api test:integration -- events.integration
```

Expected: FAIL — fields not yet wired.

- [ ] **Step 4: Wire the fields in the event-detail handler**

In `apps/api/src/routes/events.ts`, the `CounterTierRow` Drizzle select and the `buildCounter` mapping live in either `events.ts` directly or `apps/api/src/lib/price-aggregation/aggregate-by-tier.ts` (PR 3 introduced them). Both need extension:

1. The Drizzle select for counters now includes `lastAdminActionAt` and `lastAdminActionKind`:

   ```typescript
   const counterRows = pendingRows
     .filter(...)
     .map((row) => ({
       id: row.id,
       parentSubmissionId: row.disputedSubmissionId as string,
       tier: row.tier,
       priceMin: row.priceMin,
       priceMax: row.priceMax,
       userId: row.userId,
       createdAt: row.createdAt,
       lastAdminActionAt: row.lastAdminActionAt,
       lastAdminActionKind: row.lastAdminActionKind,
     }))
   ```

2. Extend the `pendingRows` select to fetch those two new columns from `price_submissions`.

3. Extend the `CounterTierRow` interface in `aggregate-by-tier.ts`:

   ```typescript
   export interface CounterTierRow {
     id: string
     parentSubmissionId: string
     tier: Tier
     priceMin: string
     priceMax: string | null
     userId: string | null
     createdAt: Date
     lastAdminActionAt: Date | null
     lastAdminActionKind: string | null
   }
   ```

4. Update the `buildCounter` function to emit the new fields:

   ```typescript
   function buildCounter(
     row: CounterTierRow,
     handles: ReadonlyMap<string, string>,
   ): TierCounter {
     const handle = row.userId !== null ? (handles.get(row.userId) ?? null) : null
     const ceiling = row.priceMax !== null ? parseFloat(row.priceMax) : null
     // Narrow the string `lastAdminActionKind` to the union before exposing it.
     const kind =
       row.lastAdminActionKind === 'defer' ? 'defer' : null
     return {
       id: row.id,
       parentSubmissionId: row.parentSubmissionId,
       floor: parseFloat(row.priceMin),
       ...(ceiling !== null ? { ceiling } : {}),
       submitter: handle !== null ? { handle } : null,
       submittedAt: row.createdAt.toISOString(),
       lastAdminActionAt: row.lastAdminActionAt?.toISOString() ?? null,
       lastAdminActionKind: kind,
     }
   }
   ```

- [ ] **Step 5: Run tests to verify they pass**

```bash
pnpm --filter @concert-crawl/api test:integration -- events.integration
```

Expected: PASS — both new tests + all existing tests still green.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/routes/events.ts \
        apps/api/src/routes/events.integration.test.ts \
        apps/api/src/lib/price-aggregation/aggregate-by-tier.ts \
        packages/types/src/index.ts
git commit -m "feat(api): TierCounter carries lastAdminActionAt + lastAdminActionKind"
```

---

### Task 13: `ContestsTabContent` + `PriceDisputesQueue`

**Files:**

- Create: `apps/web/src/components/admin/review/_tabs/ContestsTabContent.tsx`
- Create: `apps/web/src/components/admin/review/PriceDisputesQueue.tsx`
- Create: `apps/web/src/components/admin/review/PriceDisputesQueue.test.tsx`

**Interfaces:**

- Consumes: `useReviewContestsQuery` (defined in Task 16 — write the component to its target signature; Task 16 wires it).
- Produces:
  - `ContestsTabContent` — wraps the queue with a section header, mirrors the `_tabs/PricesTabContent.tsx` structure.
  - `PriceDisputesQueue` — table component per design property table §1 + §2. Auto-hides when `items.length === 0`. Each row shows event, original price, counter price, filed time, and `Resolve →` button. Visual properties match the table exactly (mono headers, surface tokens, GOLD_Q/AZ_Q badges, etc.).

- [ ] **Step 1: Write the failing component test**

Create `apps/web/src/components/admin/review/PriceDisputesQueue.test.tsx`:

```typescript
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PriceDisputesQueue, type PriceContestRow } from './PriceDisputesQueue'

const mockRow = (overrides: Partial<PriceContestRow>): PriceContestRow => ({
  contestId: 'contest-1',
  eventId: 'event-1',
  eventTitle: 'Electric Callboy',
  venueName: 'Mission Ballroom',
  eventDate: '2027-08-30',
  tier: 'GA',
  sourceCategory: 'standard',
  parent: {
    id: 'parent-1',
    priceMin: '48',
    priceMax: '58',
    vendor: 'AXS',
    submitter: { userId: 'u-1', handle: 'hugh' },
    confirms: { fans: 2, admin: 0 },
    observedAt: '2026-06-20T00:00:00Z',
    lastUpdatedAt: '2026-06-20T00:00:00Z',
    note: 'Standing GA verified on AXS.',
  },
  counter: {
    id: 'counter-1',
    priceMin: '65',
    priceMax: '80',
    vendor: 'AXS',
    submitter: { userId: 'u-2', handle: 'kel' },
    confirms: { fans: 1, admin: 0 },
    observedAt: '2026-06-22T00:00:00Z',
    note: 'Face moved to $65 after openers announced.',
  },
  filedAt: '2026-06-22T00:00:00Z',
  ...overrides,
})

describe('PriceDisputesQueue', () => {
  it('returns null when items is empty', () => {
    const { container } = render(<PriceDisputesQueue items={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders one row per contest', () => {
    render(
      <PriceDisputesQueue
        items={[mockRow({ contestId: 'c1' }), mockRow({ contestId: 'c2' })]}
      />,
    )
    expect(screen.getAllByRole('row')).toHaveLength(3) // header + 2 data rows
  })

  it('renders the count badge with "{n} open"', () => {
    render(<PriceDisputesQueue items={[mockRow({})]} />)
    expect(screen.getByText(/1 open/i)).toBeInTheDocument()
  })

  it('renders the resolve button as a link to /admin/review/contests/:contestId', () => {
    render(<PriceDisputesQueue items={[mockRow({ contestId: 'go-1' })]} />)
    const link = screen.getByRole('link', { name: /resolve/i })
    expect(link).toHaveAttribute('href', '/admin/review/contests/go-1')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter @concert-crawl/web test -- PriceDisputesQueue
```

Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Implement `PriceDisputesQueue`**

Create `apps/web/src/components/admin/review/PriceDisputesQueue.tsx`. Match every property in the design property table §1 + §2 (this is the load-bearing visual spec). Example skeleton:

```tsx
import Link from 'next/link'
import { type FC } from 'react'
import type { Tier, Vendor, SourceCategory } from '@concert-crawl/types'
import { RelTime } from '@/components/admin/primitives/RelTime'

export interface PriceContestRow {
  contestId: string
  eventId: string
  eventTitle: string
  venueName: string
  eventDate: string
  tier: Tier
  sourceCategory: SourceCategory | null
  parent: {
    id: string
    priceMin: string
    priceMax: string | null
    vendor: Vendor
    submitter: { userId: string; handle: string | null }
    confirms: { fans: number; admin: number }
    observedAt: string
    lastUpdatedAt: string
    note: string | null
  }
  counter: {
    id: string
    priceMin: string
    priceMax: string | null
    vendor: Vendor
    submitter: { userId: string; handle: string | null }
    confirms: { fans: number; admin: number }
    observedAt: string
    note: string | null
  }
  filedAt: string
}

interface PriceDisputesQueueProps {
  items: ReadonlyArray<PriceContestRow>
}

const formatPriceRange = (
  floor: string,
  ceiling: string | null,
): string => {
  const floorNum = parseFloat(floor)
  if (ceiling === null) return `$${floorNum}`
  const ceilingNum = parseFloat(ceiling)
  if (ceilingNum > floorNum) return `$${floorNum}–$${ceilingNum}`
  return `$${floorNum}`
}

const formatConfirms = (fans: number, admin: number): string =>
  admin > 0 ? `${fans} fans · ${admin} admin` : `${fans} fans`

export const PriceDisputesQueue: FC<PriceDisputesQueueProps> = ({ items }) => {
  if (items.length === 0) return null

  return (
    <section
      style={{
        background: 'var(--bg-elevated, var(--bg))',
        border: '1px solid var(--border)',
        borderRadius: 12,
        overflow: 'hidden',
        fontFamily: 'Inter, system-ui',
      }}
    >
      <header
        style={{
          padding: '12px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          borderBottom: '1px solid var(--border)',
          background: 'var(--surface-1)',
        }}
      >
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <h3
            style={{
              fontWeight: 700,
              fontSize: 14,
              color: 'var(--fg)',
              margin: 0,
            }}
          >
            Price disputes
          </h3>
          <span
            style={{
              color: 'var(--warning)',
              background:
                'color-mix(in oklab, var(--warning) 16%, transparent)',
              border:
                '1px solid color-mix(in oklab, var(--warning) 35%, transparent)',
              padding: '2px 8px',
              borderRadius: 999,
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 9.5,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            {items.length} open
          </span>
        </div>
        {/* Sort + All disputes ghost buttons deferred per spec §7.8 */}
      </header>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {['Event', 'Original', 'Counter', 'Filed', ''].map((label) => (
              <th
                key={label}
                scope="col"
                style={{
                  padding: '10px 14px',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 9.5,
                  color: 'var(--fg-subtle)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  fontWeight: 700,
                  borderBottom: '1px solid var(--border)',
                  background: 'var(--surface-1)',
                  textAlign: 'left',
                }}
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((row) => (
            <PriceDisputesQueueRow key={row.contestId} row={row} />
          ))}
        </tbody>
      </table>
    </section>
  )
}

const PriceDisputesQueueRow: FC<{ row: PriceContestRow }> = ({ row }) => {
  // Implement per design table §2. Cells: event (title + venue·date subtitle),
  // original (price + box-office gold badge if sourceCategory='boxoffice',
  // submitter · {fans} confirms), counter (price + pending azure badge,
  // submitter), filed (relative time), action (Resolve → link).
  // Use formatPriceRange, formatConfirms helpers above.
  // ... (~70 lines of JSX matching the property table)
  return (
    <tr>
      {/* ... per design table §2 ... */}
    </tr>
  )
}
```

Fill out `PriceDisputesQueueRow` to mirror every cell property in design table §2 (event title font, badge tokens, etc.). The `Resolve →` button is a Next.js `<Link href={`/admin/review/contests/${row.contestId}`}>`.

- [ ] **Step 4: Implement `ContestsTabContent`**

Create `apps/web/src/components/admin/review/_tabs/ContestsTabContent.tsx`:

```tsx
'use client'

import { type FC } from 'react'
import { useReviewContestsQuery } from '@/lib/queries/admin-contests'
import { PriceDisputesQueue } from '../PriceDisputesQueue'

export const ContestsTabContent: FC = () => {
  const { data, isLoading, error } = useReviewContestsQuery()

  if (isLoading) {
    return <div role="status">Loading contests…</div>
    // Skeleton states tracked at design polish; loading text is acceptable
    // for v1 per spec §7.5.
  }
  if (error !== null && error !== undefined) {
    return (
      <div role="alert">
        Failed to load contests. <button type="button">Retry</button>
      </div>
    )
  }
  return <PriceDisputesQueue items={data?.items ?? []} />
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
pnpm --filter @concert-crawl/web test -- PriceDisputesQueue
```

Expected: PASS — 4 tests green.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/admin/review/PriceDisputesQueue.tsx \
        apps/web/src/components/admin/review/PriceDisputesQueue.test.tsx \
        apps/web/src/components/admin/review/_tabs/ContestsTabContent.tsx
git commit -m "feat(web): PriceDisputesQueue + ContestsTabContent"
```

---

### Task 14: `AdminEntry` shared sub-component

**Files:**

- Create: `apps/web/src/components/admin/review/AdminEntry.tsx`
- Create: `apps/web/src/components/admin/review/AdminEntry.test.tsx`

**Interfaces:**

- Consumes: parent + counter row data (from contest detail).
- Produces:

  ```ts
  export interface AdminEntryProps {
    side: 'original' | 'counter'
    priceMin: string
    priceMax: string | null
    tier: Tier
    vendor: Vendor
    sourceCategory: SourceCategory | null
    submitter: { handle: string | null }
    observedAt: string
    confirms: { fans: number; admin: number } | null
    note: string | null
    winner: 'original' | 'counter' | null
  }
  ```

  Renders a card per design table §3b: $price (Inter 30/800), tier (mono uppercase), metadata grid (Submitter/Vendor/Observed/Confirms), optional quoted italic note. Winner border = `2px solid var(--accent-azure)` when `winner === side`; default border `1px solid var(--border)`.

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/components/admin/review/AdminEntry.test.tsx`:

```typescript
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AdminEntry } from './AdminEntry'

const baseProps = {
  side: 'original' as const,
  priceMin: '48',
  priceMax: '58',
  tier: 'GA' as const,
  vendor: 'AXS' as const,
  sourceCategory: 'standard' as const,
  submitter: { handle: 'hugh' },
  observedAt: '2026-06-20T00:00:00Z',
  confirms: { fans: 2, admin: 0 },
  note: null,
  winner: null as 'original' | 'counter' | null,
}

describe('AdminEntry', () => {
  it('renders price range when ceiling > floor', () => {
    render(<AdminEntry {...baseProps} />)
    expect(screen.getByText(/48/)).toBeInTheDocument()
    expect(screen.getByText(/58/)).toBeInTheDocument()
  })

  it('renders winner badge when side matches winner', () => {
    render(<AdminEntry {...baseProps} winner="original" />)
    expect(screen.getByText(/winner/i)).toBeInTheDocument()
  })

  it('does not render winner badge when winner is the other side', () => {
    render(<AdminEntry {...baseProps} side="original" winner="counter" />)
    expect(screen.queryByText(/winner/i)).not.toBeInTheDocument()
  })

  it('renders quoted italic note when present', () => {
    render(
      <AdminEntry
        {...baseProps}
        note="Standing GA verified on AXS."
      />,
    )
    expect(screen.getByText(/standing GA verified/i)).toBeInTheDocument()
  })

  it('omits note block entirely when note is null', () => {
    const { container } = render(<AdminEntry {...baseProps} note={null} />)
    // No element with the note's italic class/style — verify by absence of the
    // sample text and quoted character.
    expect(container.textContent).not.toContain('"')
  })

  it('renders the metadata grid with all four labels', () => {
    render(<AdminEntry {...baseProps} />)
    expect(screen.getByText(/submitter/i)).toBeInTheDocument()
    expect(screen.getByText(/vendor/i)).toBeInTheDocument()
    expect(screen.getByText(/observed/i)).toBeInTheDocument()
    expect(screen.getByText(/confirms/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter @concert-crawl/web test -- AdminEntry
```

Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Implement `AdminEntry`**

Create `apps/web/src/components/admin/review/AdminEntry.tsx`:

```tsx
import { type FC } from 'react'
import type { Tier, Vendor, SourceCategory } from '@concert-crawl/types'
import { RelTime } from '@/components/admin/primitives/RelTime'

export interface AdminEntryProps {
  side: 'original' | 'counter'
  priceMin: string
  priceMax: string | null
  tier: Tier
  vendor: Vendor
  sourceCategory: SourceCategory | null
  submitter: { handle: string | null }
  observedAt: string
  confirms: { fans: number; admin: number } | null
  note: string | null
  winner: 'original' | 'counter' | null
}

const formatPriceRange = (floor: string, ceiling: string | null): string => {
  const floorNum = parseFloat(floor)
  if (ceiling === null) return `$${floorNum}`
  const ceilingNum = parseFloat(ceiling)
  return ceilingNum > floorNum ? `$${floorNum}–$${ceilingNum}` : `$${floorNum}`
}

const formatConfirms = (
  confirms: { fans: number; admin: number } | null,
): string => {
  if (confirms === null) return '0 fans'
  if (confirms.admin > 0) return `${confirms.fans} fans · ${confirms.admin} admin`
  return `${confirms.fans} fans`
}

export const AdminEntry: FC<AdminEntryProps> = ({
  side,
  priceMin,
  priceMax,
  tier,
  vendor,
  submitter,
  observedAt,
  confirms,
  note,
  winner,
}) => {
  const isWinner = winner === side
  return (
    <div
      style={{
        padding: '14px 16px',
        background: 'var(--surface-1)',
        border: isWinner
          ? '2px solid var(--accent-azure, oklch(0.62 0.12 240))'
          : '1px solid var(--border)',
        borderRadius: 12,
        position: 'relative',
      }}
    >
      {isWinner ? (
        <span
          style={{
            position: 'absolute',
            top: -10,
            left: 12,
            padding: '3px 8px',
            background: 'var(--accent-azure, oklch(0.62 0.12 240))',
            color: 'var(--fg-on-accent)',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 9,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            borderRadius: 4,
          }}
        >
          winner
        </span>
      ) : null}
      <div
        style={{
          fontFamily: 'Inter, system-ui',
          fontSize: 30,
          fontWeight: 800,
          letterSpacing: '-0.025em',
          lineHeight: 1,
          color: 'var(--fg)',
        }}
      >
        {formatPriceRange(priceMin, priceMax)}
      </div>
      <div
        style={{
          marginTop: 6,
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 11,
          fontWeight: 700,
          color: 'var(--fg-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
        }}
      >
        {tier}
      </div>
      <div
        style={{
          marginTop: 12,
          display: 'grid',
          gridTemplateColumns: 'auto 1fr',
          gap: '4px 12px',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 9.5,
          letterSpacing: '0.04em',
        }}
      >
        <span style={{ color: 'var(--fg-subtle)', textTransform: 'uppercase' }}>
          Submitter
        </span>
        <span style={{ color: 'var(--fg)' }}>{submitter.handle ?? 'anonymous'}</span>
        <span style={{ color: 'var(--fg-subtle)', textTransform: 'uppercase' }}>
          Vendor
        </span>
        <span style={{ color: 'var(--fg)' }}>{vendor}</span>
        <span style={{ color: 'var(--fg-subtle)', textTransform: 'uppercase' }}>
          Observed
        </span>
        <span style={{ color: 'var(--fg)' }}>
          <RelTime iso={observedAt} />
        </span>
        <span style={{ color: 'var(--fg-subtle)', textTransform: 'uppercase' }}>
          Confirms
        </span>
        <span style={{ color: 'var(--fg)' }}>{formatConfirms(confirms)}</span>
      </div>
      {note !== null ? (
        <blockquote
          style={{
            marginTop: 12,
            padding: '8px 10px',
            background: 'color-mix(in oklab, var(--fg) 4%, transparent)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            fontFamily: 'Inter, system-ui',
            fontSize: 12.5,
            fontStyle: 'italic',
            lineHeight: 1.45,
            letterSpacing: '-0.005em',
            color: 'var(--fg-muted)',
          }}
        >
          &ldquo;{note}&rdquo;
        </blockquote>
      ) : null}
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm --filter @concert-crawl/web test -- AdminEntry
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/admin/review/AdminEntry.tsx \
        apps/web/src/components/admin/review/AdminEntry.test.tsx
git commit -m "feat(web): AdminEntry shared component for contest panel"
```

---

### Task 15: `AdminDisputePanel` + route page

**Files:**

- Create: `apps/web/src/components/admin/review/AdminDisputePanel.tsx`
- Create: `apps/web/src/components/admin/review/AdminDisputePanel.test.tsx`
- Create: `apps/web/src/app/(protected)/admin/review/contests/[contestId]/page.tsx`

**Interfaces:**

- Consumes: `useReviewContestDetail`, `useResolveContest`, `useDeferContest` (from Task 16).
- Produces:
  - `AdminDisputePanel` — 760px two-up surface with parent + counter columns rendered via `AdminEntry`, a reason textarea (min 10 / max 2000 chars), and three action buttons (Need more info, Keep original, Promote counter).
  - `winner` preview state is set optimistically on action click before the API call commits.
  - Stale-state read-only view when `parent.status === 'archived'` OR `counter.status !== 'pending'`: banner reading "This contest was already resolved. View the new live price." + link back to `/admin/review?tab=contests`. No action buttons.
  - ESC keybind navigates back to `/admin/review?tab=contests`.
  - Focus management on mount: first focusable element (Need more info button) receives focus.

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/components/admin/review/AdminDisputePanel.test.tsx`:

```typescript
import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AdminDisputePanel } from './AdminDisputePanel'

const baseContest = {
  contestId: 'c1',
  eventId: 'e1',
  eventTitle: 'Electric Callboy',
  venueName: 'Mission Ballroom',
  eventDate: '2027-08-30',
  tier: 'GA' as const,
  sourceCategory: 'standard' as const,
  parent: {
    id: 'parent-1',
    priceMin: '48',
    priceMax: '58',
    vendor: 'AXS' as const,
    submitter: { userId: 'u-1', handle: 'hugh' },
    confirms: { fans: 2, admin: 0 },
    observedAt: '2026-06-20T00:00:00Z',
    lastUpdatedAt: '2026-06-20T00:00:00Z',
    note: null,
    status: 'disputed' as const,
  },
  counter: {
    id: 'counter-1',
    priceMin: '65',
    priceMax: '80',
    vendor: 'AXS' as const,
    submitter: { userId: 'u-2', handle: 'kel' },
    confirms: { fans: 1, admin: 0 },
    observedAt: '2026-06-22T00:00:00Z',
    note: null,
    status: 'pending' as const,
    lastAdminActionAt: null,
    lastAdminActionKind: null,
  },
  filedAt: '2026-06-22T00:00:00Z',
  history: [],
}

describe('AdminDisputePanel', () => {
  it('renders both sides via AdminEntry', () => {
    render(<AdminDisputePanel contest={baseContest} />)
    expect(screen.getByText(/hugh/)).toBeInTheDocument()
    expect(screen.getByText(/kel/)).toBeInTheDocument()
  })

  it('disables all three action buttons when reason is empty', () => {
    render(<AdminDisputePanel contest={baseContest} />)
    expect(screen.getByRole('button', { name: /need more info/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /keep original/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /promote counter/i })).toBeDisabled()
  })

  it('enables buttons once reason >= 10 chars', () => {
    render(<AdminDisputePanel contest={baseContest} />)
    fireEvent.change(screen.getByLabelText(/reason/i), {
      target: { value: 'long enough reason' },
    })
    expect(screen.getByRole('button', { name: /need more info/i })).toBeEnabled()
  })

  it('shows winner preview on counter when Promote counter is clicked', () => {
    render(<AdminDisputePanel contest={baseContest} />)
    fireEvent.change(screen.getByLabelText(/reason/i), {
      target: { value: 'this is a long enough reason' },
    })
    fireEvent.click(screen.getByRole('button', { name: /promote counter/i }))
    // The counter AdminEntry should now carry the winner badge.
    expect(screen.getByText(/winner/i)).toBeInTheDocument()
  })

  it('renders stale-state banner when parent.status is archived', () => {
    const stale = {
      ...baseContest,
      parent: { ...baseContest.parent, status: 'archived' as const },
    }
    render(<AdminDisputePanel contest={stale} />)
    expect(screen.getByText(/already resolved/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /promote counter/i })).not.toBeInTheDocument()
  })

  it('caps reason at 2000 characters via maxLength attribute', () => {
    render(<AdminDisputePanel contest={baseContest} />)
    const textarea = screen.getByLabelText(/reason/i) as HTMLTextAreaElement
    expect(textarea.maxLength).toBe(2000)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter @concert-crawl/web test -- AdminDisputePanel
```

Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Implement `AdminDisputePanel`**

Create `apps/web/src/components/admin/review/AdminDisputePanel.tsx`. Match every property in design table §3 (760px width, 24px padding, header eyebrow + title + status pill, guidance block, two-up grid with `vs` divider, reason field with min 44px height, three actions per §7.3). The stale-state banner replaces the action area when `parent.status === 'archived'` or `counter.status !== 'pending'`.

Skeleton (full implementation ~250 lines — fill out per property table):

```tsx
'use client'

import { useEffect, useRef, useState, type FC } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AdminEntry } from './AdminEntry'
import { useDeferContest, useResolveContest } from '@/lib/queries/admin-contests'

export interface ContestDetailData {
  contestId: string
  eventId: string
  eventTitle: string
  venueName: string
  eventDate: string
  tier: 'GA' | 'Reserved' | 'VIP' | 'Pit' | 'Lawn'
  sourceCategory: 'boxoffice' | 'standard' | 'resale' | null
  parent: {
    id: string
    priceMin: string
    priceMax: string | null
    vendor: 'AXS' | 'Ticketmaster' | 'SeatGeek' | 'DICE' | 'Eventbrite' | 'VenueBoxOffice'
    submitter: { userId: string; handle: string | null }
    confirms: { fans: number; admin: number }
    observedAt: string
    lastUpdatedAt: string
    note: string | null
    status: 'pending' | 'corroborated' | 'disputed' | 'stale' | 'archived'
  }
  counter: {
    id: string
    priceMin: string
    priceMax: string | null
    vendor: 'AXS' | 'Ticketmaster' | 'SeatGeek' | 'DICE' | 'Eventbrite' | 'VenueBoxOffice'
    submitter: { userId: string; handle: string | null }
    confirms: { fans: number; admin: number }
    observedAt: string
    note: string | null
    status: 'pending' | 'corroborated' | 'disputed' | 'stale' | 'archived'
    lastAdminActionAt: string | null
    lastAdminActionKind: 'defer' | null
  }
  filedAt: string
}

interface AdminDisputePanelProps {
  contest: ContestDetailData
}

const REASON_MIN = 10
const REASON_MAX = 2000

const isStale = (contest: ContestDetailData): boolean =>
  contest.parent.status === 'archived' || contest.counter.status !== 'pending'

export const AdminDisputePanel: FC<AdminDisputePanelProps> = ({ contest }) => {
  const router = useRouter()
  const [reason, setReason] = useState('')
  const [winner, setWinner] = useState<'original' | 'counter' | null>(null)
  const firstButtonRef = useRef<HTMLButtonElement | null>(null)
  const resolve = useResolveContest()
  const defer = useDeferContest()
  const stale = isStale(contest)

  useEffect(() => {
    if (!stale) firstButtonRef.current?.focus()
    const handler = (evt: KeyboardEvent) => {
      if (evt.key === 'Escape') router.push('/admin/review?tab=contests')
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [router, stale])

  const reasonValid = reason.trim().length >= REASON_MIN
  const inFlight = resolve.isPending || defer.isPending
  const disabled = !reasonValid || inFlight || stale

  const onKeep = async () => {
    setWinner('original')
    try {
      await resolve.mutateAsync({
        contestId: contest.contestId,
        resolution: 'parent_wins',
        reason,
      })
      router.push('/admin/review?tab=contests')
    } catch (err) {
      setWinner(null)
      // Toast surfaced by mutation hook
    }
  }

  const onPromote = async () => {
    setWinner('counter')
    try {
      await resolve.mutateAsync({
        contestId: contest.contestId,
        resolution: 'challenger_wins',
        reason,
      })
      router.push('/admin/review?tab=contests')
    } catch (err) {
      setWinner(null)
    }
  }

  const onDefer = async () => {
    try {
      await defer.mutateAsync({ contestId: contest.contestId, reason })
      router.push('/admin/review?tab=contests')
    } catch (err) {
      // Toast surfaced by mutation hook
    }
  }

  return (
    <article
      style={{
        width: 760,
        maxWidth: '100%',
        padding: 24,
        background: 'var(--bg)',
        color: 'var(--fg)',
        fontFamily: 'Inter, system-ui, sans-serif',
        borderRadius: 14,
        border: '1px solid var(--border)',
      }}
    >
      {/* Header per §3 lines 109-120 */}
      <header>
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 9.5,
            color: 'var(--fg-subtle)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}
        >
          Disputes · Phase 8.5
        </div>
        <h2
          style={{
            fontFamily: 'Inter, system-ui',
            fontSize: 22,
            fontWeight: 900,
            letterSpacing: '-0.025em',
            color: 'var(--fg)',
            margin: '4px 0',
          }}
        >
          {contest.eventTitle} · {contest.venueName} · {contest.eventDate}
        </h2>
        <span
          style={{
            display: 'inline-block',
            background: 'color-mix(in oklab, var(--warning) 16%, transparent)',
            color: 'var(--warning)',
            padding: '5px 10px',
            borderRadius: 999,
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
          {stale ? 'resolved' : 'open dispute'}
        </span>
      </header>

      {stale ? (
        <div
          role="status"
          style={{
            marginTop: 18,
            padding: '12px 14px',
            background: 'color-mix(in oklab, var(--fg) 4%, transparent)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            color: 'var(--fg-muted)',
          }}
        >
          This contest was already resolved.{' '}
          <Link href={`/events/${contest.eventId}`}>View the new live price.</Link>
        </div>
      ) : (
        <p
          style={{
            marginTop: 12,
            padding: '10px 14px',
            background: 'color-mix(in oklab, var(--fg) 4%, transparent)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            fontSize: 13,
            lineHeight: 1.5,
            letterSpacing: '-0.005em',
            color: 'var(--fg-muted)',
          }}
        >
          A corroborated price is being challenged. Pick the number that should
          live on the event page. Either entry can be promoted; the loser is
          archived (not deleted) with a reason. The submitter is not penalized —
          disputes are updates, not violations.
        </p>
      )}

      {/* Two-up grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 16px 1fr',
          alignItems: 'start',
          marginTop: 18,
          marginBottom: 18,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 9.5,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: 8,
              color: 'var(--fg-subtle)',
            }}
          >
            Original · live
          </div>
          <AdminEntry
            side="original"
            priceMin={contest.parent.priceMin}
            priceMax={contest.parent.priceMax}
            tier={contest.tier}
            vendor={contest.parent.vendor}
            sourceCategory={contest.sourceCategory}
            submitter={contest.parent.submitter}
            observedAt={contest.parent.observedAt}
            confirms={contest.parent.confirms}
            note={contest.parent.note}
            winner={winner}
          />
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            alignSelf: 'stretch',
            color: 'var(--fg-subtle)',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
          vs
        </div>
        <div>
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 9.5,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: 8,
              color: 'var(--fg-subtle)',
            }}
          >
            Counter · {contest.counter.status}
          </div>
          <AdminEntry
            side="counter"
            priceMin={contest.counter.priceMin}
            priceMax={contest.counter.priceMax}
            tier={contest.tier}
            vendor={contest.counter.vendor}
            sourceCategory={contest.sourceCategory}
            submitter={contest.counter.submitter}
            observedAt={contest.counter.observedAt}
            confirms={null}
            note={contest.counter.note}
            winner={winner}
          />
        </div>
      </div>

      {!stale && (
        <>
          <label>
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 9.5,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--fg-subtle)',
                marginBottom: 8,
              }}
            >
              Reason (shown to both submitters)
            </div>
            <textarea
              value={reason}
              onChange={(evt) => setReason(evt.target.value)}
              maxLength={REASON_MAX}
              style={{
                width: '100%',
                background: 'var(--surface-1)',
                border: '1px solid var(--border-strong)',
                borderRadius: 10,
                padding: '10px 12px',
                fontFamily: 'Inter, system-ui',
                fontSize: 13,
                letterSpacing: '-0.005em',
                color: 'var(--fg)',
                minHeight: 44,
              }}
            />
          </label>

          <div
            style={{
              display: 'flex',
              gap: 10,
              justifyContent: 'flex-end',
              marginTop: 14,
            }}
          >
            <button
              ref={firstButtonRef}
              type="button"
              disabled={disabled}
              onClick={onDefer}
              style={{
                background: 'transparent',
                border: '1px solid var(--border-strong)',
                color: 'var(--fg-muted)',
                padding: '10px 16px',
                borderRadius: 9,
                fontFamily: 'Inter, system-ui',
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              Need more info
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={onKeep}
              style={{
                background: 'transparent',
                border: '1px solid var(--accent-gold, oklch(0.66 0.14 78))',
                color: 'var(--accent-gold, oklch(0.66 0.14 78))',
                padding: '10px 16px',
                borderRadius: 9,
                fontFamily: 'Inter, system-ui',
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              Keep original
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={onPromote}
              style={{
                background: 'var(--accent-azure, oklch(0.62 0.12 240))',
                color: 'var(--fg-on-accent)',
                border: 'none',
                padding: '10px 16px',
                borderRadius: 9,
                fontFamily: 'Inter, system-ui',
                fontSize: 13,
                fontWeight: 800,
              }}
            >
              Promote counter
            </button>
          </div>
        </>
      )}
    </article>
  )
}
```

- [ ] **Step 4: Create the route page**

Create `apps/web/src/app/(protected)/admin/review/contests/[contestId]/page.tsx`:

```tsx
import { notFound } from 'next/navigation'
import { requireAdminUser } from '@/lib/auth'
import { fetchContestDetail } from '@/lib/queries/admin-contests-server'
import { AdminDisputePanel } from '@/components/admin/review/AdminDisputePanel'

interface PageProps {
  params: { contestId: string }
}

export default async function ContestPage({ params }: PageProps) {
  await requireAdminUser()
  const contest = await fetchContestDetail(params.contestId)
  if (!contest) notFound()
  return <AdminDisputePanel contest={contest} />
}
```

(Implement `fetchContestDetail` as a server-side helper in `apps/web/src/lib/queries/admin-contests-server.ts` that calls the API and returns null on 404. Mirrors existing admin pages' server-fetch pattern.)

- [ ] **Step 5: Run tests**

```bash
pnpm --filter @concert-crawl/web test -- AdminDisputePanel
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/admin/review/AdminDisputePanel.tsx \
        apps/web/src/components/admin/review/AdminDisputePanel.test.tsx \
        apps/web/src/app/\(protected\)/admin/review/contests/\[contestId\]/page.tsx \
        apps/web/src/lib/queries/admin-contests-server.ts
git commit -m "feat(web): AdminDisputePanel + /admin/review/contests/:contestId route"
```

---

### Task 16: React Query hooks

**Files:**

- Create: `apps/web/src/lib/queries/admin-contests.ts`

**Interfaces:**

- Consumes: `apiClient`, `useQuery`, `useMutation`, `useQueryClient`.
- Produces:

  ```ts
  export const adminContestsKeys = {
    all: ['admin-contests'] as const,
    list: () => [...adminContestsKeys.all, 'list'] as const,
    detail: (id: string) => [...adminContestsKeys.all, 'detail', id] as const,
  }

  export const useReviewContestsQuery = (): UseQueryResult<{ items: PriceContestRow[]; total: number }>
  export const useReviewContestDetail = (contestId: string): UseQueryResult<ContestDetailData>
  export const useResolveContest = (): UseMutationResult<...>
  export const useDeferContest = (): UseMutationResult<...>
  ```

  - `useResolveContest` and `useDeferContest` invalidate `adminContestsKeys.all` AND `reviewQueryKeys.counts` (counts pill) on success.
  - Both mutations surface toasts on error using the existing toast pattern (e.g., `apps/web/src/lib/toast.ts`).

- [ ] **Step 1: Implement the hooks**

Create `apps/web/src/lib/queries/admin-contests.ts`:

```typescript
'use client'

import { useAuth } from '@clerk/nextjs'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import { reviewQueryKeys } from './use-admin-review'
import type { PriceContestRow } from '@/components/admin/review/PriceDisputesQueue'
import type { ContestDetailData } from '@/components/admin/review/AdminDisputePanel'

export const adminContestsKeys = {
  all: ['admin-contests'] as const,
  list: () => [...adminContestsKeys.all, 'list'] as const,
  detail: (contestId: string) =>
    [...adminContestsKeys.all, 'detail', contestId] as const,
}

interface ListResponse {
  items: PriceContestRow[]
  total: number
  limit: number
  offset: number
}

// apiClient signature per apps/web/src/lib/api.ts and existing admin hooks
// in apps/web/src/lib/queries/use-admin-review.ts:
//   - Every method takes a Clerk auth token as its last arg.
//   - Methods return the parsed data directly (NOT wrapped in `{ data: ... }`).
// Hooks use the `useAuth()` → `getToken()` pattern to fetch the token before
// every request.

export const useReviewContestsQuery = () => {
  const { getToken } = useAuth()
  return useQuery({
    queryKey: adminContestsKeys.list(),
    queryFn: async (): Promise<ListResponse> => {
      const token = await getToken()
      return apiClient.get<ListResponse>('/v1/admin/contests/prices', token)
    },
  })
}

export const useReviewContestDetail = (contestId: string) => {
  const { getToken } = useAuth()
  return useQuery({
    queryKey: adminContestsKeys.detail(contestId),
    queryFn: async (): Promise<ContestDetailData> => {
      const token = await getToken()
      return apiClient.get<ContestDetailData>(
        `/v1/admin/contests/prices/${contestId}`,
        token,
      )
    },
  })
}

interface ResolveInput {
  contestId: string
  resolution: 'parent_wins' | 'challenger_wins'
  reason: string
}

export const useResolveContest = () => {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: ResolveInput) => {
      const token = await getToken()
      return apiClient.post(
        `/v1/admin/contests/prices/${input.contestId}/resolve`,
        { resolution: input.resolution, reason: input.reason },
        token,
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminContestsKeys.all })
      queryClient.invalidateQueries({ queryKey: reviewQueryKeys.counts })
    },
  })
}

interface DeferInput {
  contestId: string
  reason: string
}

export const useDeferContest = () => {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: DeferInput) => {
      const token = await getToken()
      return apiClient.post(
        `/v1/admin/contests/prices/${input.contestId}/defer`,
        { reason: input.reason },
        token,
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminContestsKeys.all })
      queryClient.invalidateQueries({ queryKey: reviewQueryKeys.counts })
    },
  })
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm --filter @concert-crawl/web typecheck
pnpm --filter @concert-crawl/web test
```

Expected: all pass — earlier component tests now have a real hook source.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/lib/queries/admin-contests.ts
git commit -m "feat(web): admin-contests React Query hooks"
```

---

### Task 17: ReviewTabs integration

**Files:**

- Modify: `apps/web/src/components/admin/review/ReviewPageClient.tsx`

**Interfaces:**

- `ReviewTabKey` union gains `'contests'`.
- `VALID_TAB_KEYS` gains `'contests'`.
- `tabs` array passed to `<ReviewTabs>` gains a `Contests` descriptor with `count` from `counts.priceContests` and `kind: 'warning'`.
- `ContestsTabContent` mounts when `activeTab === 'contests'`.

- [ ] **Step 1: Extend the tab key union**

In `apps/web/src/components/admin/review/ReviewPageClient.tsx`:

```typescript
type ReviewTabKey =
  | 'event-flags'
  | 'prices'
  | 'missing'
  | 'all-events'
  | 'contests'

const VALID_TAB_KEYS: ReadonlySet<string> = new Set([
  'event-flags',
  'prices',
  'missing',
  'all-events',
  'contests',
])
```

- [ ] **Step 2: Add the tab descriptor**

In the JSX where `<ReviewTabs tabs={...}>` is rendered (find via grep), add the new tab descriptor:

```typescript
const tabs: ReviewTabDescriptor[] = [
  { key: 'event-flags', label: 'Event flags', count: counts.eventFlags, kind: 'warning' },
  { key: 'prices', label: 'Prices', count: counts.prices, kind: 'signal' },
  { key: 'missing', label: 'Missing', count: counts.missing, kind: 'danger' },
  { key: 'all-events', label: 'All events' },
  { key: 'contests', label: 'Contests', count: counts.priceContests, kind: 'warning' },
]
```

- [ ] **Step 3: Mount `ContestsTabContent`**

Inside the existing tab-content switch (search for `activeTab === 'event-flags'` etc.), add:

```tsx
{activeTab === 'contests' ? <ContestsTabContent /> : null}
```

Import at the top:

```typescript
import { ContestsTabContent } from './_tabs/ContestsTabContent'
```

- [ ] **Step 4: Run typecheck + tests**

```bash
pnpm --filter @concert-crawl/web typecheck
pnpm --filter @concert-crawl/web test -- ReviewTabs
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/admin/review/ReviewPageClient.tsx
git commit -m "feat(web): add Contests tab to /admin/review"
```

---

### Task 18: design-review + sweep + open PR + Copilot iteration

**Files:** None new.

- [ ] **Step 1: Full quality gate**

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm --filter @concert-crawl/api test:integration
pnpm --filter @concert-crawl/db test
```

Expected: every command exits 0.

- [ ] **Step 2: Run design-review against the implementation**

Per `memory:feedback_design_review_with_complete_and_ship` — design-review is a hard gate before `gh pr create` regardless of how visual-heavy the PR is. Run it with the property table at `docs/superpowers/design-tables/admin-contest-review.md` as the source of truth. The agent splits into:

- **Agent 1 (component-scoped enumeration):** per-file passes over `PriceDisputesQueue.tsx`, `AdminDisputePanel.tsx`, `AdminEntry.tsx`. Concatenate output before proceeding.
- **Agent 2 (visual properties + state reachability):** confirm every named state in the property table is reachable in code (field present in type, route computes it, props plumbed). Per `feedback_state_reachability_in_design_review.md`.

Resolve every gap before opening the PR. Any deferral requires explicit user approval per `feedback_no_unilateral_deferrals.md` — never silently list in the gap report.

- [ ] **Step 3: Rebase onto latest origin/main**

```bash
git fetch origin
git rebase origin/main
```

Resolve conflicts if any. Per `feedback_rebase_before_push.md` — squash/merge are not options; repo uses rebase-only merges.

- [ ] **Step 4: Push**

```bash
git push -u origin feat/admin-contest-review
```

- [ ] **Step 5: Open PR**

```bash
gh pr create \
  --title "feat(admin): contest-review UI for price disputes (#697)" \
  --body "$(cat <<'EOF'
## Summary

- Adds a `Contests` tab to `/admin/review` that surfaces open price disputes (parent corroborated + pending counter against same `(tier, source_category)` slot).
- Per-contest panel at `/admin/review/contests/:contestId` renders both sides via the shared `AdminEntry` component with a reason field (10-2000 chars) and three actions: **Keep original** / **Promote counter** / **Need more info** (defer).
- Resolution is **atomic** — single Drizzle transaction with `SELECT FOR UPDATE` on both rows, conditional status flips, denormalized `events` projection update on challenger_wins, +1 cred award for the winner, and orphan-counter cleanup. Notifications and audit rows are written outside the transaction.
- Defensive PATCH lockout: `PATCH /v1/admin/prices/submissions/:id` now rejects contest rows with 409 + loud Sentry tag `endpoint_lockout: contest_row`. Closes the foot-gun where the old flat queue could silently overturn a corroborated price.
- Dispute POST adds a pre-insert duplicate-counter check (belt-and-braces; DB unique index added in migration 0041 is the primary defence).
- `priceByTier[].counterSubmission` shape extended with `lastAdminActionAt` + `lastAdminActionKind` so the consumer event-detail page can surface a quiet "Admin requested more info" pill after a defer (consumer UI ships separately under #737).

Closes #697.

## Migration

- `0041_admin_contest_review.sql` — `archived` enum value + `archived_reason` / `last_admin_action_at` / `last_admin_action_kind` columns + three indexes (queue perf × 2 + 1-counter-per-parent uniqueness) + defensive pre-index cleanup CTE.

## Test plan

- [x] `pnpm typecheck` green
- [x] `pnpm lint` green
- [x] `pnpm test` green
- [x] `pnpm --filter @concert-crawl/api test:integration` green
- [x] `pnpm --filter @concert-crawl/db test` green
- [x] Migration tested locally + against fresh DB
- [x] design-review pass against `docs/superpowers/design-tables/admin-contest-review.md`
- [ ] CI green
- [ ] Manual smoke (post-merge, staging): trigger a defer on a seeded contest, confirm event-detail returns `lastAdminActionKind: 'defer'`; trigger a resolve, confirm events row updates + cred awarded

## New environment variables

None.
EOF
)"
```

- [ ] **Step 6: Request Copilot review**

```bash
REPO=$(gh repo view --json nameWithOwner --jq .nameWithOwner)
PR_NUM=$(gh pr view --json number --jq .number)
gh api \
  --method POST \
  "/repos/$REPO/pulls/$PR_NUM/requested_reviewers" \
  -H "Content-Type: application/json" \
  --input - <<'REVIEWER'
{"reviewers":["copilot-pull-request-reviewer[bot]"]}
REVIEWER
```

Verify `response.requested_reviewers[].login` is non-empty per `feedback_copilot_auto_review.md`. ONLY `["copilot-pull-request-reviewer[bot]"]` works.

- [ ] **Step 7: Iterate Copilot review**

Per `memory:feedback_copilot_review_multi_round` — minimum 2 successful Copilot reviews before merge. For each round:

- **Critical / High** → fix inline, re-run quality gate, commit, push, request next round.
- **Medium** → fix inline, re-run quality gate, commit, push, request next round.
- **Low / Nit** → fix every valid comment per `feedback_address_all_valid_review_comments.md`; never propose "defer the nits".

Repeat until 2 consecutive reviews come back with only Low/Nit. If Copilot errors 3× in a row, leave a "Copilot review pending" note and proceed if CI green.

- [ ] **Step 8: Merge after CI green + Copilot floor met**

```bash
gh pr merge --rebase --delete-branch
```

- [ ] **Step 9: Update memory**

After merge, update `~/.claude/projects/-Users-huey-Projects-concert-crawl/memory/project_price_source_discoverability.md`:

```
**Status as of YYYY-MM-DD:** #697 (Admin contest-review UI) merged as #<PR number>. PR 4 of price-source cycle (Consumer UI dispute affordance + counter pill) now unblocked.
```

And note in `project_phase8a_status.md` that admin tooling is complete for price contests; event-report adjudication (PR 2 of the contest-review split) remains as a follow-up.

---

## Self-Review

After writing the complete plan, look at the spec and design table with fresh eyes and check the plan against them.

**Spec coverage** — every locked decision in `2026-06-22-admin-contest-review-design.md` and §18 sign-offs is mapped to a task:

- §3 In scope (PR 1) — every bullet maps to Task 1-17
- §4.1 Route + integration — Tasks 13, 15, 17 (tab on `/admin/review`)
- §4.3 Single transaction — Task 8 (with literal SELECT FOR UPDATE + conditional updates)
- §4.4 `events` projection — Task 8 (challenger_wins branch)
- §4.5 Notification policy — Task 10 (`writeContestNotifications` writes 2 rows per action, dedupes)
- §4.6 1-counter-per-parent — Task 1 (unique index) + Task 5 (pre-insert check)
- §4.7 Defensive PATCH lockout — Task 4
- §5.1 `archived` enum — Task 1
- §5.2 `archived_reason` column — Task 1
- §5.3 Partial indexes — Task 1
- §5.4 Shared type — Task 3
- §6.1 List endpoint — Task 6
- §6.2 Detail endpoint — Task 7
- §6.3 Resolve endpoint — Task 8
- §6.4 Defer endpoint — Task 9
- §6.5 Counts extension — Task 11
- §6.6 Audit metadata — Task 8 (resolve) + Task 9 (defer)
- §7.1 Route + layout — Task 15 + Task 17
- §7.2 Components — Tasks 13, 14, 15, 16
- §7.3 Actions + reason validation — Task 15
- §7.4 Stale-state read-only view — Task 15 (`isStale` check)
- §7.5 Loading/error states — Task 13 (`ContestsTabContent`) + Task 15 (panel)
- §7.6 Accessibility — Task 15 (focus management, ESC keybind; `<th scope>` on Task 13)
- §7.7 Mobile carve-out — desktop-first acceptable per spec
- §7.8 Sort + filter — v1 is `filed-at asc`, no UI affordance (Task 6)
- §7.9 Submitter handles not clickable — Task 14 (plain text)
- §8 State machine — Tasks 2, 3, 8
- §9 Atomicity guarantees — Task 8
- §10 Edge cases A1-A17 — covered through Tasks 4, 5, 8, 11, 12, 15
- §11 Non-functional (perf + security + observability + testability) — partial indexes (Task 1), Zod (Tasks 8, 9), audit (Tasks 8, 9), tests at every task
- §12 Migration — Task 1 (with defensive cleanup CTE)
- §13 Implementation order — task ordering follows §13 sequence
- §19 Final scope summary — every bullet on the **Backend** + **Frontend** + **Audit** lists is mapped above

**Placeholder scan** — no `TBD`, no `implement later`, no decision-deferring placeholders. Every code block contains real, runnable code with concrete identifiers, real SQL, and real test assertions.

A small number of intentional elisions exist — these are NOT decision placeholders, they're deliberate references to other source-of-truth documents to avoid duplication:
- `// ... per design table §<N>` callouts in component-rendering tasks (Tasks 13, 14, 15) reference visual properties owned by `docs/superpowers/design-tables/admin-contest-review.md`. Task 18's design-review pass (Agent 2) verifies each property against the table, so duplicating them in the plan would create drift.
- Test-data setup boilerplate that mirrors existing patterns in adjacent test files is referenced rather than copied wholesale (e.g., the `seedContest` helper in Task 8's test step is fully written; the cross-cutting boilerplate around it isn't).

Any reader executing the plan can resolve every elision by reading the cited source document. The plan does not defer any decision — only repetition.

**Type consistency** — `PriceSubmission` (Task 3) flows into the API responses (Tasks 6, 7, 8, 9) and the shared `TierCounter` (Task 12). `PriceContestRow` (Task 13) matches the list-endpoint response shape (Task 6). `ContestDetailData` (Task 15) matches the detail-endpoint response shape (Task 7). `winner: 'original' | 'counter' | null` is consistent across `AdminEntry` (Task 14) and `AdminDisputePanel` (Task 15). `ContestNotificationInput.action: 'resolve' | 'defer'` (Task 10) covers exactly the two action endpoints (Tasks 8, 9).

---

## What's next after merge

**PR 4 of the price-source discoverability cycle (Consumer UI) is unblocked.** With contest adjudication on the admin side complete, the consumer dispute affordance can ship: when `priceByTier[tier].counterSubmission !== null`, the consumer UI hides the dispute form and surfaces a CTA to engage with the existing contest. The `lastAdminActionKind === 'defer'` quiet pill ("Admin requested more info") on the counter card lights up automatically. Rule documented at `memory:project_pr4_dispute_affordance_hiding`.

**Event-report adjudication (PR 2 of the contest-review split)** remains a follow-up. Backend semantics differ (events vs price submissions) and no parallel foot-gun gates it. Spec §14 lays out the shape — mirror UI surfaces (`EventReportsQueue` + `EventReportResolutionPanel`), filter chips (`All`, `Sold out`, `Cancelled`, `Postponed`), `imminent · <7 days` row tell for `cancelled` reports — ready to draft when needed.

**Consumer notification UI (#737)** is a separate track. This PR writes `notifications` rows on every contest action so when the bell + panel + consumer endpoints ship under #737, the backfill is automatic. Design pass is required before implementation per `memory:reference_consumer_notifications_gap`.
