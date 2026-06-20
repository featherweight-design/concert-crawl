# Price-Source Discoverability — Schema PR (PR 1 of 4) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land the schema + server-side foundation for the price-source-discoverability cycle (issues #641 + #644). Add a `source_category` enum + column on `price_submissions`, a `ticket_links` jsonb array on `events`, a partial unique index that pins box-office corroborated prices, and flip the corroboration model so the submitter counts as observation #1 (1/2 instead of 0/2).

**Architecture:** Strict **expand-only** migration. This PR adds new structure alongside the existing fields — `how_found`, the `VenueBoxOffice` vendor enum value, and `ticket_url` all stay in place. PRs 2 (crawler) and 4 (consumer UI) populate and consume the new shape; a later **contract PR** drops the old columns/enum value once nothing reads them. The corroboration-count flip is shipped server-side in this PR (DB default + insert site + both confirm endpoints + display arithmetic) so submission and confirm code stay internally consistent.

**Tech Stack:** Drizzle ORM 0.45 · postgres / `pg` · Hono · Zod · Vitest (integration tests against local Postgres) · pnpm workspaces · Conventional commits

## Global Constraints

- TypeScript strict mode across packages; **no `as` casts** (use Zod `safeParse`, type guards, or interface augmentation per CLAUDE.md "Type safety is the first line of defence")
- **No single-character variable names** — ESLint enforces minimum identifier length of 2 (`err` not `e`, `idx` not `i`, `ctx` not `c`)
- **Expand/contract only** — never destructive schema changes in a single deploy (CLAUDE.md). This PR is **expand-only**. The contract PR that drops `how_found` and the `VenueBoxOffice` enum value is explicitly out of scope (see "What's Next" at the bottom).
- **Drizzle migration `when` timestamps must be strictly greater than every prior entry** in `packages/db/migrations/meta/_journal.json`. Last entry is `1782432000000` (migration 0039). Use `1782518400000` for this migration. If a competing migration lands before this one merges, bump the value at execution time — Drizzle orders by `when`, not by `idx` (see memory `feedback_migration_timestamps.md`).
- **All API endpoint inputs go through Zod** — no raw input reaches the DB.
- Worktree: `.worktrees/feat/price-source-schema` on branch `feat/price-source-schema`.
- Before push: `pnpm typecheck && pnpm lint && pnpm test` clean in the worktree.
- After PR opens: request Copilot review via REST POST `requested_reviewers` with body `{"reviewers":["copilot-pull-request-reviewer[bot]"]}` (memory: `feedback_copilot_auto_review.md`). Verify `response.requested_reviewers[].login` is non-empty before declaring success.
- **design-review skill does NOT apply to this PR** (schema-only, no UI). It IS a hard gate for PR 4 (Consumer UI) — flagged in "What's Next" so the next session knows.
- No `progress.md` row is required for this PR per memory `feedback_progress_optimistic.md` — schema scaffolding is judged a low-impact predecessor, not a milestone. The Consumer UI PR (PR 4) gets the row.

---

## File Structure

**Create:**

- `packages/db/migrations/0040_price_source_category.sql` — single SQL migration: enum + column + jsonb column + backfills + partial unique index + `corroboration_count` default + backfill pending rows. All statements idempotent (`IF NOT EXISTS` / `DO $$ BEGIN ... EXCEPTION WHEN duplicate_object` blocks) where the Drizzle pattern supports it.

**Modify:**

- `packages/db/migrations/meta/_journal.json` — append entry `{ "idx": 40, "version": "7", "when": 1782518400000, "tag": "0040_price_source_category", "breakpoints": true }`. (Drizzle's `pnpm db:generate` produces this automatically when generated from schema, but the hand-written migration approach used in this repo since 0029 means you append manually.)
- `packages/db/src/schema/prices.ts` — add `sourceCategoryEnum`, add `sourceCategory` column on `priceSubmissions`, flip `corroborationCount.default(0)` → `.default(1)`.
- `packages/db/src/schema/events.ts` — add `ticketLinks` jsonb column with a typed array `$type<TicketLink[]>()`.
- `packages/db/src/schema/index.ts` — no change (re-exports happen automatically through `./events.js` and `./prices.js`).
- `packages/types/src/index.ts` — add `SourceCategory`, `TicketLink`; add `sourceCategory: SourceCategory | null` and `ticketLinks: TicketLink[] | null` to `PriceSubmission` and `Event` respectively; keep existing `vendor`, `howFound`, `ticketUrl` fields **unchanged** (parallel-live during expand phase).
- `apps/api/src/routes/price-submissions.ts` — extend `submissionBodySchema` with `sourceCategory: z.enum([...]).optional()`, write the column on insert, set `corroborationCount: 1` explicitly (defensive against DB default drift), and return `sourceCategory` in the select list.
- `apps/api/src/routes/price-submission-confirms.ts` — change the promotion check from `confirmsCount >= confirmsRequired` to `confirmsCount + 1 >= confirmsRequired` to reflect submitter = observation #1.
- `apps/api/src/routes/events.ts` — in the `pendingSubmissions` block (around line 585-607), keep returning `confirmsCount` as the raw `submission_confirms` row count, but verify `confirmsNeeded` semantics are still correct (no change needed — UI does the `+1` for display).
- `packages/db/seed.ts` — update any seed submissions to write `sourceCategory` and start `corroborationCount: 1`. Ensure seed `ticketUrl` rows also get a corresponding `ticketLinks` entry so dev data exercises both code paths.
- `apps/api/src/test/helpers/seed.ts` — same updates for test seed.

**Not modified (parallel-live during expand):**

- `packages/db/src/schema/prices.ts` `howFound` field, `submissionHowFoundEnum`, `submissionVendorEnum` (incl. `VenueBoxOffice`) — stay in place until contract PR.
- `packages/db/src/schema/events.ts` `ticketUrl` field — stays in place until contract PR.
- The 80 callsites that read `ticketUrl` — untouched in this PR. Crawler PR (PR 2) populates `ticketLinks` from the same source; Consumer UI PR (PR 4) starts reading `ticketLinks` first, and a final contract PR drops `ticketUrl`.

---

## Task Right-Sizing Rationale

Eight tasks. Each ends with an independently testable deliverable + commit:

1. Drizzle schema diff for `price_submissions` + `events`
2. The SQL migration (column adds, partial unique index, backfills, journal entry)
3. Migration test (apply migration to a clean local DB; assert resulting structure)
4. `packages/types` exports update + Zod schema extension on the submit endpoint
5. Submit-endpoint behavior — `corroborationCount: 1` and `sourceCategory` round-trip
6. Promotion logic — flip both confirm endpoints to the `+1` formula, with integration tests
7. Seed + helper updates (so `pnpm db:seed` and the API integration suite both pass)
8. Final sweep: `pnpm typecheck && pnpm lint && pnpm test`, commit, push, `gh pr create`, request Copilot review

---

### Task 1: Drizzle schema diff — add `source_category` enum, column, `ticketLinks`, flip `corroborationCount` default

**Files:**

- Modify: `packages/db/src/schema/prices.ts`
- Modify: `packages/db/src/schema/events.ts`

**Interfaces:**

- Produces:
  - `sourceCategoryEnum` pgEnum with values `['boxoffice', 'standard', 'resale']`
  - `priceSubmissions.sourceCategory: pgEnum('source_category', ['boxoffice','standard','resale']) | null`
  - `priceSubmissions.corroborationCount` default `1` (was `0`)
  - `TicketLink` type: `{ kind: 'boxoffice' | 'primary' | 'resale'; vendor: Vendor | null; url: string }`
  - `events.ticketLinks: jsonb('ticket_links').$type<TicketLink[]>() | null`

- [ ] **Step 1: Add `sourceCategoryEnum` and `sourceCategory` column to `priceSubmissions`**

In `packages/db/src/schema/prices.ts`, after the existing `submissionHowFoundEnum` block (line ~50), add:

```typescript
export const sourceCategoryEnum = pgEnum('source_category', [
  'boxoffice',
  'standard',
  'resale',
])
```

In the `priceSubmissions` `pgTable` definition, after the `howFound` column, add:

```typescript
sourceCategory: sourceCategoryEnum('source_category'),
```

Then change the `corroborationCount` line from:

```typescript
corroborationCount: integer('corroboration_count').notNull().default(0),
```

to:

```typescript
corroborationCount: integer('corroboration_count').notNull().default(1),
```

- [ ] **Step 2: Add `ticketLinks` jsonb column to `events`**

In `packages/db/src/schema/events.ts`, define the `TicketLink` type and add the column. At the top of the file, after the imports, add:

```typescript
export type TicketLink = {
  kind: 'boxoffice' | 'primary' | 'resale'
  vendor: string | null
  url: string
}
```

In the `events` `pgTable` definition, immediately after the `ticketUrl: text('ticket_url'),` line, add:

```typescript
// Typed replacement for ticketUrl. Populated by the crawler (PR 2) from
// the URL host + venue.ticketVendor; consumed by the Consumer UI (PR 4)
// for source-category disclosure. ticketUrl stays in place during the
// expand phase and is dropped in a follow-up contract PR.
ticketLinks: jsonb('ticket_links').$type<TicketLink[]>(),
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `pnpm --filter @concert-crawl/db typecheck`
Expected: PASS — no type errors.

- [ ] **Step 4: Commit**

```bash
git add packages/db/src/schema/prices.ts packages/db/src/schema/events.ts
git commit -m "feat(db): add source_category enum + ticket_links jsonb to schema"
```

---

### Task 2: SQL migration — add column, partial unique index, backfills, journal entry

**Files:**

- Create: `packages/db/migrations/0040_price_source_category.sql`
- Modify: `packages/db/migrations/meta/_journal.json`

**Interfaces:**

- Consumes: schema diff from Task 1
- Produces: `0040_price_source_category` migration that brings the DB to match the Drizzle schema, plus backfill for existing rows

- [ ] **Step 1: Write the migration SQL**

Create `packages/db/migrations/0040_price_source_category.sql`:

```sql
-- Price-source discoverability schema (issue #641 + #644, PR 1 of 4).
--
-- Expand-only. This migration:
--   1. Adds the `source_category` pgEnum + nullable column on price_submissions
--   2. Adds a `ticket_links` jsonb column on events (typed array of TicketLink)
--   3. Backfills source_category from existing (vendor, how_found) rows
--   4. Backfills ticket_links from existing ticket_url + venues.ticket_vendor
--   5. Flips price_submissions.corroboration_count default 0 -> 1
--      (submitter counts as observation #1 for the new 1/2 confirmation model)
--   6. Backfills existing rows' corroboration_count by +1 (submitter inclusion)
--   7. Adds partial unique index pinning corroborated box-office prices to one
--      row per (event, tier).
--
-- howFound, the VenueBoxOffice enum value, and ticket_url stay in place. A
-- separate contract PR drops them once nothing reads them.

-- 1. source_category pgEnum (idempotent — Drizzle pattern)
DO $$ BEGIN
  CREATE TYPE "public"."source_category" AS ENUM('boxoffice', 'standard', 'resale');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

-- 2. Nullable column on price_submissions
ALTER TABLE "price_submissions"
  ADD COLUMN IF NOT EXISTS "source_category" "source_category";
--> statement-breakpoint

-- 3. ticket_links jsonb on events
ALTER TABLE "events"
  ADD COLUMN IF NOT EXISTS "ticket_links" jsonb;
--> statement-breakpoint

-- 4. Backfill source_category for legacy rows.
--    Heuristic:
--      vendor = 'VenueBoxOffice'        -> boxoffice
--      how_found = 'at_the_venue'       -> boxoffice (face-value-at-the-door)
--      everything else                  -> standard
--    We can't reliably identify legacy resale from existing data — none of
--    the captured fields signal it — so legacy rows are bucketed boxoffice
--    or standard only. New submissions (post-PR 4) write source_category
--    directly from the submit form.
UPDATE "price_submissions"
   SET "source_category" = 'boxoffice'
 WHERE "source_category" IS NULL
   AND ("vendor" = 'VenueBoxOffice' OR "how_found" = 'at_the_venue');
--> statement-breakpoint

UPDATE "price_submissions"
   SET "source_category" = 'standard'
 WHERE "source_category" IS NULL;
--> statement-breakpoint

-- 5. Backfill ticket_links from existing ticket_url.
--    kind heuristic: if venue.ticket_vendor = 'venue_box_office' -> boxoffice;
--                    else -> primary.
--    Resale links are not present in current crawl output; PR 2 (crawler)
--    adds them when source URL hosts indicate resale.
UPDATE "events" e
   SET "ticket_links" = jsonb_build_array(
         jsonb_build_object(
           'kind',
             CASE
               WHEN v."ticket_vendor" = 'venue_box_office' THEN 'boxoffice'
               ELSE 'primary'
             END,
           'vendor',
             CASE
               WHEN v."ticket_vendor" IS NULL THEN NULL
               ELSE v."ticket_vendor"
             END,
           'url', e."ticket_url"
         )
       )
  FROM "venues" v
 WHERE e."venue_id" = v."id"
   AND e."ticket_url" IS NOT NULL
   AND e."ticket_links" IS NULL;
--> statement-breakpoint

-- Handle rows where venue_id is NULL but ticket_url exists — backfill without
-- vendor inference.
UPDATE "events"
   SET "ticket_links" = jsonb_build_array(
         jsonb_build_object('kind', 'primary', 'vendor', NULL, 'url', "ticket_url")
       )
 WHERE "venue_id" IS NULL
   AND "ticket_url" IS NOT NULL
   AND "ticket_links" IS NULL;
--> statement-breakpoint

-- 6. Flip corroboration_count default + backfill existing rows.
--    Submitter counts as observation #1, so:
--      - new inserts default to 1 (DB-level safety net for the insert)
--      - existing rows get +1 across the board so the data model is uniform
--    Promotion threshold (SP_POLICY.confirmsRequired = 2) is unchanged — the
--    code-side promotion checks already use a `+ 1` formula in submissions.ts
--    and this PR flips price-submission-confirms.ts to match (Task 6).
ALTER TABLE "price_submissions"
  ALTER COLUMN "corroboration_count" SET DEFAULT 1;
--> statement-breakpoint

UPDATE "price_submissions"
   SET "corroboration_count" = "corroboration_count" + 1;
--> statement-breakpoint

-- 7. Partial unique index — at most one corroborated box-office price per
--    (event, tier). Box-office is exempt from staleness (per spec) and
--    deserves a single canonical row; community/standard prices can still
--    coexist as separate corroborated rows for the same (event, tier).
CREATE UNIQUE INDEX IF NOT EXISTS "price_submissions_event_tier_boxoffice_uniq"
  ON "price_submissions" ("event_id", "tier", "source_category")
 WHERE "status" = 'corroborated' AND "source_category" = 'boxoffice';
```

- [ ] **Step 2: Append journal entry**

Read `packages/db/migrations/meta/_journal.json`. The current last entry has `"idx": 39, "when": 1782432000000`. Append a new entry inside the `entries` array:

```json
{
  "idx": 40,
  "version": "7",
  "when": 1782518400000,
  "tag": "0040_price_source_category",
  "breakpoints": true
}
```

Verify the file is still valid JSON.

- [ ] **Step 3: Run the migration on a clean local DB**

Reset the local DB (Postgres in `docker-compose.yml`):

```bash
docker compose down -v && docker compose up -d
# wait ~3s for Postgres readiness
pnpm db:migrate
```

Expected output: no errors; final line reports migration 0040 applied.

- [ ] **Step 4: Verify the resulting structure**

```bash
docker exec -it concert-crawl-db psql -U postgres -d concert_crawl_db \
  -c "\d price_submissions" \
  -c "\d events" \
  -c "\di+ price_submissions*"
```

Expected:

- `price_submissions` has a `source_category` column of type `source_category` (nullable).
- `price_submissions.corroboration_count` `default 1`.
- `events` has a `ticket_links` column of type `jsonb` (nullable).
- A partial unique index `price_submissions_event_tier_boxoffice_uniq` exists with predicate `(status = 'corroborated'::price_submission_status) AND (source_category = 'boxoffice'::source_category)`.

- [ ] **Step 5: Commit**

```bash
git add packages/db/migrations/0040_price_source_category.sql \
        packages/db/migrations/meta/_journal.json
git commit -m "feat(db): migration 0040 — source_category + ticket_links + 1/2 corroboration"
```

---

### Task 3: Migration regression test

**Files:**

- Modify: `packages/db/src/schema.test.ts` (or add `packages/db/src/migration-0040.test.ts` if the existing file is unsuitable)

**Interfaces:**

- Consumes: applied migration from Task 2
- Produces: integration test that asserts (a) `source_category` enum exists, (b) `ticket_links` column accepts the typed shape, (c) partial unique index rejects a second corroborated box-office row for the same (event, tier), (d) `corroboration_count` defaults to 1 on insert

- [ ] **Step 1: Read the existing schema test for the pattern**

Open `packages/db/src/schema.test.ts` to confirm the existing setup uses `db` from `./client.js` and writes to the local container DB. Use the same harness.

- [ ] **Step 2: Write the migration regression test**

Add a new `describe('migration 0040 — source_category + ticket_links + corroboration', ...)` block. Example test cases:

```typescript
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { sql } from 'drizzle-orm'
import { db } from './client.js'
import { events, priceSubmissions, venues } from './schema/index.js'

describe('migration 0040 — source_category + ticket_links + corroboration', () => {
  let venueId: string
  let eventId: string

  beforeAll(async () => {
    const [venue] = await db
      .insert(venues)
      .values({
        name: 'Mig 0040 Test Venue',
        slug: `mig-0040-venue-${Date.now()}`,
        websiteUrl: 'https://example.com',
        city: 'Denver',
        timezone: 'America/Denver',
      })
      .returning({ id: venues.id })
    venueId = venue.id

    const [event] = await db
      .insert(events)
      .values({
        venueId,
        title: 'Mig 0040 Test Event',
        artist: 'Test Artist',
        date: '2030-01-01',
        canonicalArtist: 'test artist',
      })
      .returning({ id: events.id })
    eventId = event.id
  })

  afterAll(async () => {
    await db.delete(events).where(sql`id = ${eventId}`)
    await db.delete(venues).where(sql`id = ${venueId}`)
  })

  it('source_category column accepts boxoffice/standard/resale and rejects others', async () => {
    const [inserted] = await db
      .insert(priceSubmissions)
      .values({
        eventId,
        userId: 'user_test_0040_a',
        priceMin: '25',
        tier: 'GA',
        vendor: 'Ticketmaster',
        howFound: 'bought_myself',
        sourceCategory: 'boxoffice',
      })
      .returning()
    expect(inserted.sourceCategory).toBe('boxoffice')

    await expect(
      db.execute(
        sql`INSERT INTO price_submissions (event_id, user_id, price_min, tier, vendor, how_found, source_category)
            VALUES (${eventId}, 'user_test_0040_b', 25, 'GA', 'Ticketmaster', 'bought_myself', 'invalid_value')`,
      ),
    ).rejects.toThrow()

    await db.delete(priceSubmissions).where(sql`user_id = 'user_test_0040_a'`)
  })

  it('corroboration_count defaults to 1 on insert', async () => {
    const [inserted] = await db
      .insert(priceSubmissions)
      .values({
        eventId,
        userId: 'user_test_0040_default',
        priceMin: '30',
        tier: 'GA',
        vendor: 'Ticketmaster',
        howFound: 'bought_myself',
        sourceCategory: 'standard',
      })
      .returning()
    expect(inserted.corroborationCount).toBe(1)

    await db
      .delete(priceSubmissions)
      .where(sql`user_id = 'user_test_0040_default'`)
  })

  it('partial unique index pins corroborated boxoffice to one row per (event, tier)', async () => {
    await db.insert(priceSubmissions).values({
      eventId,
      userId: 'user_test_0040_first',
      priceMin: '30',
      tier: 'GA',
      vendor: 'VenueBoxOffice',
      howFound: 'at_the_venue',
      sourceCategory: 'boxoffice',
      status: 'corroborated',
    })

    await expect(
      db.insert(priceSubmissions).values({
        eventId,
        userId: 'user_test_0040_second',
        priceMin: '35',
        tier: 'GA',
        vendor: 'VenueBoxOffice',
        howFound: 'at_the_venue',
        sourceCategory: 'boxoffice',
        status: 'corroborated',
      }),
    ).rejects.toThrow(/price_submissions_event_tier_boxoffice_uniq/)

    // Different tier should not collide
    await db.insert(priceSubmissions).values({
      eventId,
      userId: 'user_test_0040_other_tier',
      priceMin: '40',
      tier: 'Reserved',
      vendor: 'VenueBoxOffice',
      howFound: 'at_the_venue',
      sourceCategory: 'boxoffice',
      status: 'corroborated',
    })

    // Different source_category should not collide
    await db.insert(priceSubmissions).values({
      eventId,
      userId: 'user_test_0040_standard',
      priceMin: '50',
      tier: 'GA',
      vendor: 'Ticketmaster',
      howFound: 'bought_myself',
      sourceCategory: 'standard',
      status: 'corroborated',
    })

    await db.delete(priceSubmissions).where(sql`event_id = ${eventId}`)
  })

  it('ticket_links column accepts the TicketLink shape', async () => {
    const links = [
      { kind: 'boxoffice', vendor: null, url: 'https://example.com/box' },
      {
        kind: 'primary',
        vendor: 'ticketmaster',
        url: 'https://example.com/tm',
      },
    ]
    await db
      .update(events)
      .set({ ticketLinks: links })
      .where(sql`id = ${eventId}`)

    const [row] = await db
      .select({ ticketLinks: events.ticketLinks })
      .from(events)
      .where(sql`id = ${eventId}`)

    expect(row.ticketLinks).toEqual(links)
  })
})
```

- [ ] **Step 3: Run the test**

```bash
pnpm --filter @concert-crawl/db test -- schema
```

Expected: all four new test cases pass.

- [ ] **Step 4: Commit**

```bash
git add packages/db/src/schema.test.ts
git commit -m "test(db): regression tests for migration 0040"
```

---

### Task 4: `packages/types` — add `SourceCategory`, `TicketLink`, extend `PriceSubmission` + `Event`

**Files:**

- Modify: `packages/types/src/index.ts`

**Interfaces:**

- Produces:
  - `export type SourceCategory = 'boxoffice' | 'standard' | 'resale'`
  - `export interface TicketLink { kind: 'boxoffice' | 'primary' | 'resale'; vendor: string | null; url: string }`
  - `PriceSubmission.sourceCategory: SourceCategory | null`
  - `Event.ticketLinks: TicketLink[] | null`
  - `pendingSubmissions[].sourceCategory: SourceCategory | null` in `EventDetail`-style response shape

- [ ] **Step 1: Add the new types**

In `packages/types/src/index.ts`, near the existing `PriceSource` / `Vendor` / `HowFound` block (around line 60–100), add:

```typescript
// Source-category for community-submitted prices (issue #641). Distinct from
// PriceSource (which identifies the upstream data origin for events.priceSource).
// Captured directly from the submit form; legacy rows backfilled from
// (vendor, how_found) heuristics in migration 0040.
export type SourceCategory = 'boxoffice' | 'standard' | 'resale'

// Typed entry in events.ticketLinks (issue #641). Populated by the crawler
// (PR 2) and consumed by the Consumer UI (PR 4) for source-category disclosure.
export interface TicketLink {
  kind: 'boxoffice' | 'primary' | 'resale'
  vendor: string | null
  url: string
}
```

- [ ] **Step 2: Extend `PriceSubmission`**

Find the `PriceSubmission` interface (around line 243) and add `sourceCategory` after `howFound`:

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

- [ ] **Step 3: Extend `Event`**

Find the `Event` interface (around line 218) and add `ticketLinks` after `ticketUrl`:

```typescript
ticketUrl: string | null
ticketLinks: TicketLink[] | null
```

- [ ] **Step 4: Extend `WatchingShow.ticketUrl` siblings**

Find `WatchingShow` (around line 497). Leave `ticketUrl` in place; add `ticketLinks: TicketLink[] | null` immediately after it. Do **not** remove `ticketUrl` — parallel-live during expand.

- [ ] **Step 5: Extend the `pendingSubmissions` element shape**

Find the `pendingSubmissions?` array element (around line 360) and add `sourceCategory: SourceCategory | null` after `howFound`:

```typescript
pendingSubmissions?: Array<{
  id: string
  priceMin: string
  priceMax: string | null
  tier: string
  vendor: string
  howFound: string
  sourceCategory: SourceCategory | null
  note: string | null
  submitterHandle: string | null
  submittedAt: string
  confirmsCount: number
  confirmsNeeded: number
  isSubmitter: boolean
}> | null
```

- [ ] **Step 6: Typecheck the types package**

```bash
pnpm --filter @concert-crawl/types typecheck
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/types/src/index.ts
git commit -m "feat(types): add SourceCategory + TicketLink; extend PriceSubmission + Event"
```

---

### Task 5: API submit endpoint — accept `sourceCategory`, write column, `corroborationCount: 1`

**Files:**

- Modify: `apps/api/src/routes/price-submissions.ts`
- Modify: `apps/api/src/routes/price-submissions.integration.test.ts`

**Interfaces:**

- Consumes: `SourceCategory` from `@concert-crawl/types`; schema + column from Task 1+2
- Produces: POST `/v1/events/:id/price-submissions` accepts an optional `sourceCategory` field; persists it; insert is explicit about `corroborationCount: 1`; GET `/v1/events/:id/price-submissions` returns `sourceCategory` in each row

- [ ] **Step 1: Write failing integration test for `sourceCategory` round-trip**

In `apps/api/src/routes/price-submissions.integration.test.ts`, add inside the existing POST describe block:

```typescript
it('persists sourceCategory and returns it on GET', async () => {
  const eventId = await seedEvent()
  const userId = 'user_source_category_test'

  const postResponse = await client.post(
    `/v1/events/${eventId}/price-submissions`,
    {
      headers: authHeader(userId),
      body: {
        priceMin: 25,
        tier: 'GA',
        vendor: 'VenueBoxOffice',
        howFound: 'at_the_venue',
        sourceCategory: 'boxoffice',
      },
    },
  )
  expect(postResponse.status).toBe(201)
  const postBody = await postResponse.json()
  expect(postBody.success).toBe(true)
  expect(postBody.data.sourceCategory).toBe('boxoffice')
  expect(postBody.data.corroborationCount).toBe(1)

  const getResponse = await client.get(
    `/v1/events/${eventId}/price-submissions`,
  )
  const getBody = await getResponse.json()
  const row = getBody.data.submissions.find((sub) => sub.userId === userId)
  expect(row.sourceCategory).toBe('boxoffice')
  expect(row.corroborationCount).toBe(1)
})
```

(Adapt to whatever test client / seed helpers the existing tests use — read them first.)

- [ ] **Step 2: Run the test, confirm it fails**

```bash
pnpm --filter @concert-crawl/api test -- price-submissions.integration
```

Expected: FAIL on the new test (either Zod rejects `sourceCategory`, or the field is missing from the response).

- [ ] **Step 3: Extend the Zod body schema**

In `apps/api/src/routes/price-submissions.ts`, update `submissionBodySchema` to include `sourceCategory`:

```typescript
const submissionBodySchema = z
  .object({
    priceMin: z.number().int().min(SP_POLICY.floorMin).max(SP_POLICY.floorMax),
    priceMax: z.number().int().min(1).max(SP_POLICY.ceilingMax).optional(),
    tier: z.enum(['GA', 'Reserved', 'VIP', 'Pit', 'Lawn']),
    vendor: z.enum([
      'AXS',
      'Ticketmaster',
      'SeatGeek',
      'DICE',
      'Eventbrite',
      'VenueBoxOffice',
    ]),
    howFound: z.enum(['bought_myself', 'saw_listing', 'at_the_venue']),
    sourceCategory: z.enum(['boxoffice', 'standard', 'resale']).optional(),
    note: z.string().max(280).optional(),
    disputedSubmissionId: z.string().uuid().optional(),
  })
  .refine((data) => !data.priceMax || data.priceMax >= data.priceMin, {
    message: "Ceiling can't be below floor.",
    path: ['priceMax'],
  })
```

- [ ] **Step 4: Add `sourceCategory` to GET select list**

In the GET handler (around line 49–82), add `sourceCategory: priceSubmissions.sourceCategory,` to the `.select({...})` projection.

- [ ] **Step 5: Persist `sourceCategory` + explicit `corroborationCount: 1` on insert**

In the POST handler (around line 236–249), update the insert to include `sourceCategory` and `corroborationCount`:

```typescript
const [created] = await db
  .insert(priceSubmissions)
  .values({
    eventId,
    userId,
    priceMin: String(body.priceMin),
    priceMax: body.priceMax != null ? String(body.priceMax) : null,
    tier: body.tier,
    vendor: body.vendor,
    howFound: body.howFound,
    sourceCategory: body.sourceCategory ?? null,
    corroborationCount: 1,
    note: body.note ?? null,
    disputedSubmissionId: body.disputedSubmissionId ?? null,
  })
  .returning()
```

(The DB default also writes `1`, but the explicit value is defensive and easier to spot in code review.)

- [ ] **Step 6: Re-run the test, confirm it passes**

```bash
pnpm --filter @concert-crawl/api test -- price-submissions.integration
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/routes/price-submissions.ts \
        apps/api/src/routes/price-submissions.integration.test.ts
git commit -m "feat(api): accept sourceCategory on submit; corroborationCount starts at 1"
```

---

### Task 6: Promotion logic — flip confirm endpoint to `+1` formula

**Files:**

- Modify: `apps/api/src/routes/price-submission-confirms.ts`
- Modify: `apps/api/src/routes/price-submission-confirms.integration.test.ts`
- Audit: `apps/api/src/routes/submissions.ts` — verify already uses `+1` (no change needed, see notes)
- Audit: `apps/api/src/routes/events.ts` — pendingSubmissions response (verify `confirmsCount` unchanged)

**Interfaces:**

- Consumes: `corroborationCount: 1` insert from Task 5
- Produces: A non-submitter confirm on a pending submission promotes it to `corroborated` after **one** confirm (was two). `submissions.ts` already encodes this via `corroborationCount + 1 >= confirmsRequired`; this task brings `price-submission-confirms.ts` into alignment with the same formula.

- [ ] **Step 1: Confirm both routes are mounted (route-liveness audit)**

Both `submissions.ts` and `price-submission-confirms.ts` are **live** — verified against the codebase at planning time:

- `submissions.ts` mounts at `/v1/submissions/:id/confirm` (and `/dispute`, `/`, `PATCH`, `DELETE`). 285+ lines of integration tests exercise it (`apps/api/src/routes/submissions.integration.test.ts`).
- `price-submission-confirms.ts` mounts at `/v1/events/:id/price-submissions/:submissionId/confirm`.

Both code paths are reachable from production traffic and must stay semantically consistent. Re-verify the audit at execution time by grepping `apps/api/src/index.ts` (or wherever routers are mounted) for both router imports to make sure nothing changed since planning:

```bash
grep -rn "submissionsRouter\|priceSubmissionConfirmsRouter" apps/api/src/
```

Expected: both routers appear in the API entry point's `app.route(...)` calls.

- [ ] **Step 1b: Read both confirm routes side-by-side**

Open both files and confirm:

- `apps/api/src/routes/submissions.ts` line 62-63 already uses `corroborationCount + 1 >= confirmsRequired`. With the new starting value of 1, the first confirm makes `1 + 1 = 2 >= 2` → promoted. **No change needed here**, but verify the formula stayed.
- `apps/api/src/routes/price-submission-confirms.ts` line 104-111 uses raw `confirmsCount >= confirmsRequired` where `confirmsCount` is the count of `submission_confirms` rows. With the old model, first confirm → confirmsCount=1, `1 >= 2` → false. Under the new model we want first confirm → promoted. Fix below.

Also audit `submissions.integration.test.ts` for any tests that rely on the old two-confirm-to-promote behavior — flip their expectations to one-confirm-to-promote in Step 2 of this task. The "transitions to corroborated at confirmsRequired threshold" test (line ~128) is the canonical example.

- [ ] **Step 2: Write failing integration test**

In `apps/api/src/routes/price-submission-confirms.integration.test.ts`, **update the existing "transitions to corroborated at confirmsRequired threshold" test** (or the one analogous to it) to expect **one** confirm to promote, not two:

```typescript
it('promotes a pending submission to corroborated after one non-submitter confirm', async () => {
  const eventId = await seedEvent({ farFutureDate: true }) // not imminent
  const submissionId = await seedPendingSubmission({
    eventId,
    userId: 'submitter_user',
    sourceCategory: 'boxoffice',
  })

  const response = await client.post(
    `/v1/events/${eventId}/price-submissions/${submissionId}/confirm`,
    {
      headers: authHeader('confirmer_user_1'),
      body: { method: 'box-office' },
    },
  )

  expect(response.status).toBe(200)
  const body = await response.json()
  expect(body.data.promoted).toBe(true)
  expect(body.data.confirmsCount).toBe(1)
})
```

Then update other existing tests that currently loop `for (let idx = 0; idx < SP_POLICY.confirmsRequired; idx++)` to expect promotion after the **first** non-submitter confirm (not after `confirmsRequired` confirms).

- [ ] **Step 3: Run the test, confirm it fails**

```bash
pnpm --filter @concert-crawl/api test -- price-submission-confirms.integration
```

Expected: FAIL — promotion currently happens after 2 confirms, not 1.

- [ ] **Step 4: Flip the promotion check**

In `apps/api/src/routes/price-submission-confirms.ts`, change line ~111:

```typescript
const promoted = confirmsCount >= confirmsRequired
```

to:

```typescript
// confirmsCount counts non-submitter confirms; the submitter counts as
// observation #1, so the effective observation count is confirmsCount + 1.
// Promotion happens when total observations meets confirmsRequired.
const promoted = confirmsCount + 1 >= confirmsRequired
```

Also update the corroborationCount update site (around line 116) to write `confirmsCount + 1` instead of `confirmsCount`:

```typescript
corroborationCount: confirmsCount + 1,
```

(This keeps `priceSubmissions.corroborationCount` in sync with the new semantics: total observations including submitter.)

- [ ] **Step 5: Re-run the test, confirm it passes**

```bash
pnpm --filter @concert-crawl/api test -- price-submission-confirms.integration
```

Expected: PASS.

- [ ] **Step 6: Run the broader API suite to catch incidental breakage**

```bash
pnpm --filter @concert-crawl/api test
```

Expected: PASS. If `events.test.ts` fails because of the `pendingSubmissions[].confirmsCount` shape, update it — that response still returns the raw `submission_confirms` count (the UI in PR 4 handles `+1` display).

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/routes/price-submission-confirms.ts \
        apps/api/src/routes/price-submission-confirms.integration.test.ts
git commit -m "feat(api): submitter counts as observation #1 — confirm-once promotes"
```

---

### Task 7: Seed updates — match the new shape

**Files:**

- Modify: `packages/db/seed.ts`
- Modify: `apps/api/src/test/helpers/seed.ts`

**Interfaces:**

- Consumes: schema + types from Tasks 1, 4
- Produces: `pnpm db:seed` succeeds against a freshly migrated DB; API integration test helpers seed rows that include `sourceCategory` and a representative `ticketLinks` shape

- [ ] **Step 1: Update `packages/db/seed.ts` price submissions**

For any seed `priceSubmissions.insert(...).values({...})` calls, add `sourceCategory` (`'boxoffice'` for VenueBoxOffice rows, `'standard'` for primary vendors) and leave `corroborationCount` to the DB default (or explicit `corroborationCount: 1`).

- [ ] **Step 2: Update `packages/db/seed.ts` event rows**

For seed events with `ticketUrl`, also set `ticketLinks: [{ kind: 'primary', vendor: '<vendor>', url: '<same url>' }]`.

- [ ] **Step 3: Update API test seed helper**

Same updates in `apps/api/src/test/helpers/seed.ts` — every test seed should be representative of the new shape.

- [ ] **Step 4: Run the seed against a clean DB**

```bash
docker compose down -v && docker compose up -d
pnpm db:migrate
pnpm db:seed
```

Expected: no errors; final summary reports the seeded counts.

- [ ] **Step 5: Spot-check the data**

```bash
docker exec -it concert-crawl-db psql -U postgres -d concert_crawl_db \
  -c "SELECT id, source_category, corroboration_count FROM price_submissions LIMIT 5;" \
  -c "SELECT id, ticket_url, ticket_links FROM events WHERE ticket_url IS NOT NULL LIMIT 5;"
```

Expected: `source_category` non-null on most rows; `ticket_links` non-null on rows with `ticket_url`.

- [ ] **Step 6: Commit**

```bash
git add packages/db/seed.ts apps/api/src/test/helpers/seed.ts
git commit -m "chore(seed): populate sourceCategory + ticketLinks in seed data"
```

---

### Task 8: Final sweep — pre-push checks, push, open PR, request Copilot

**Files:** none (CI / git / gh)

- [ ] **Step 1: Run the full worktree gate**

From the worktree root:

```bash
pnpm typecheck && pnpm lint && pnpm test
```

Expected: all PASS. If anything fails, fix it before continuing — memory `feedback_precheck_before_push.md`.

- [ ] **Step 2: Verify the main repo directory is clean**

```bash
git -C /Users/huey/Projects/concert-crawl status
```

Expected: `nothing to commit, working tree clean`. (CLAUDE.md rule — never leave uncommitted files in the main repo dir.)

- [ ] **Step 3: Rebase on latest origin/main**

```bash
git fetch origin
git rebase origin/main
```

If conflicts arise, resolve them. Re-run typecheck/lint/test after rebase.

- [ ] **Step 4: Push**

```bash
git push -u origin feat/price-source-schema
```

- [ ] **Step 5: Open PR with the project template**

```bash
gh pr create --title "feat: price-source schema — source_category + ticket_links + 1/2 corroboration" --body "$(cat <<'EOF'
## Summary

PR 1 of 4 for the price-source-discoverability cycle (issues #641 + #644). Schema + server-side foundation only — no UI changes here.

- New `source_category` pgEnum (`boxoffice` / `standard` / `resale`) + nullable column on `price_submissions`.
- New `ticket_links` jsonb column on `events` (typed `TicketLink[]`).
- Partial unique index pinning at most one corroborated box-office row per `(event_id, tier)`.
- `corroboration_count` default flipped `0 -> 1` (submitter counts as observation #1); existing rows backfilled by +1.
- `price-submission-confirms.ts` promotion check flipped to the `confirmsCount + 1` formula already used by `submissions.ts` — first non-submitter confirm now promotes.

**Expand-only** per CLAUDE.md migration strategy. `how_found`, `VenueBoxOffice` enum value, and `ticket_url` stay in place. A follow-up contract PR drops them once nothing reads them (after PR 4 ships the consumer UI).

Closes nothing yet — this is the schema foundation; PR 4 closes #641 + #644.

## What's next after merge

1. PR 2 — Crawler: populate `ticket_links` from URL host + venue heuristics; backfill any rows the migration missed.
2. PR 3 — API aggregation: per-tier `alternates`, source-mix within tier, `reports` count, contest scope shrink.
3. PR 4 — Consumer UI: `FaceValueCard`, `ProvenanceCTA` variants, submit form reorder, `MultiSourceMultiTierCard`. **design-review skill is a hard gate for PR 4** (it does not apply to this PR).
4. Contract PR (after PR 4 ships): drop `how_found` column, drop `VenueBoxOffice` from `submission_vendor` enum, drop `ticket_url` once `ticket_links` is the canonical read path everywhere.

## Test plan

- [x] `pnpm db:migrate` against clean local DB succeeds.
- [x] Migration regression tests in `packages/db/src/schema.test.ts` pass (`source_category` round-trip, `corroborationCount` default = 1, partial unique index rejects duplicate corroborated boxoffice, `ticket_links` accepts typed shape).
- [x] `pnpm --filter @concert-crawl/api test` clean — submit endpoint persists `sourceCategory`, confirm endpoint promotes after one non-submitter confirm.
- [x] `pnpm db:seed` populates `sourceCategory` + `ticketLinks` on dev rows.
- [ ] Staging: apply migration, verify `\d price_submissions` shows the new column + default, smoke-test a submit + confirm against staging.

## New env vars

None.
EOF
)"
```

- [ ] **Step 6: Request Copilot review**

```bash
PR_NUMBER=$(gh pr view --json number -q .number)
gh api -X POST "repos/HartiganHM/concert-crawl/pulls/${PR_NUMBER}/requested_reviewers" \
  --input - <<<'{"reviewers":["copilot-pull-request-reviewer[bot]"]}'
```

**Verify response.requested_reviewers contains `copilot-pull-request-reviewer[bot]`** before declaring success (memory: `feedback_copilot_auto_review.md`).

- [ ] **Step 7: Hand off**

Report:

- PR URL
- Branch name
- Confirmation Copilot is reviewing
- Reminder to user: design-review applies to PR 4, not this PR
- Reminder: contract PR (drop how_found, drop VenueBoxOffice, drop ticket_url) is deferred until PR 4 ships

---

## What's Next After Merge

1. **PR 2 — Crawler PR.** Populate `ticketLinks` from venue + URL host heuristics in `packages/crawler-core`; backfill any rows the migration's heuristic couldn't cover. No schema changes.
2. **PR 3 — API aggregation PR.** Per-tier `alternates`, source-mix within tier, pending-submission lists in event detail response, `reports` count per active submission, contest scope shrink (DisputeForm becomes price-only, server inherits `(tier, source_category)` from parent).
3. **PR 4 — Consumer UI PR.** `FaceValueCard`, `ProvenanceCTA` (3 variants), submit form reorder (source-category lead, vendor demoted but still required), `MTAddTierSuccess`, `MultiSourceMultiTierCard`, vendor "Venue" relabel, copy sweep (1/2 + drop "Anonymous"), `PriceChip` selection parity. **design-review skill is a hard gate for PR 4** (memory: `feedback_design_review_with_complete_and_ship.md`, `feedback_design_review_component_scoped.md`).
4. **Contract PR (later).** Drop `how_found` column on `price_submissions`, drop `'VenueBoxOffice'` from `submission_vendor` enum (requires creating a new enum + swap pattern in Postgres), drop `ticket_url` on `events`. Only safe after PR 4 ships and we've verified nothing reads the old fields. Sequence: code-side removals first, migration to drop columns last.

## Notes Carried Forward

- **Tier enum stays as-is** (`GA / Reserved / VIP / Pit / Lawn`) — deferred until beta produces real "doesn't fit" feedback.
- **Box-office exempt from staleness** is a code-side rule that lands in PR 3 (price-pipeline selection logic). The partial unique index in this PR pins box-office to a single corroborated row per `(event, tier)`; the staleness exemption is a separate concern.
- **Resale = community-submitted** per locked decision. The backfill heuristic in this migration only assigns `boxoffice` or `standard` to legacy rows — resale is a forward-only category captured directly from the submit form (PR 4).
