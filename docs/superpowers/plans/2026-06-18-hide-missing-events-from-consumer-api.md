# Hide Missing Events From Consumer API — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop serving events flagged `first_missing_at IS NOT NULL` from public/consumer-facing API endpoints so users only see shows the crawler currently confirms are still scheduled.

**Architecture:** Add `isNull(events.firstMissingAt)` to every consumer-facing query that lists or counts upcoming events. For the detail endpoint, return 404 when the row is flagged missing so direct-link traffic does not see a stale row. The crawler already clears `first_missing_at` when a re-extraction matches (`packages/crawler-core/src/crawl.ts:673-700`), so any row that genuinely re-appears on the venue page will become visible again on the next crawl with no manual intervention.

**Tech stack:** Hono, Drizzle ORM, Vitest (unit + integration), Postgres

## Global Constraints

- Admin surfaces (`/v1/admin/...`) MUST continue to return missing rows — they're the human-triage queue. Do NOT modify any file under `apps/api/src/routes/admin/`.
- User-curated surfaces are out of scope: `/v1/watching` (saved-events list), `/v1/events/:id/price-submissions`, `/v1/events/:id/reports`. The user explicitly opted in to those; silently hiding their saved item is worse UX than a stale row.
- The filter applies only to rows where `status = 'upcoming'`. Cancelled / postponed rows do not have `first_missing_at` set (the crawler's stale-detection update has a `status='upcoming'` predicate at `packages/crawler-core/src/crawl.ts:689`), so adding `isNull(events.firstMissingAt)` is a no-op for those statuses — safe to apply unconditionally.
- Every existing test in this surface must still pass. New tests verify the new exclusion behavior using the integration test harness (real Postgres).
- Use Drizzle's `isNull(events.firstMissingAt)` wherever the existing query is already in the Drizzle builder. The one exception is `GET /v1/events/genres`, which already uses raw SQL via `db.execute()` (because `unnest()` aggregation in the query builder is awkward) — there, append `AND first_missing_at IS NULL` to the existing raw SQL string rather than rewriting the query.
- Inline the predicate alongside the existing `status` / `date` filters with a single-line comment pointing to this PR. Do not extract a `excludeMissingEvents()` helper — only 5 call sites and the surrounding code already inlines its filters with comments.

---

### Task 1: Filter list, detail, and genres in events router

**Files:**

- Modify: `apps/api/src/routes/events.ts` (3 endpoints: `GET /`, `GET /:id`, `GET /genres`)
- Test: `apps/api/src/routes/events.integration.test.ts`

**Interfaces:**

- Consumes: existing `db`, `events`, `venues` from `@concert-crawl/db`; existing Drizzle operators `isNull`, `and`, `eq`, `gte`, `inArray` (most already imported).
- Produces: filter behavior verified by tests below.

- [ ] **Step 1: Write the failing integration tests**

Add to `apps/api/src/routes/events.integration.test.ts` (locate the `describe('GET /v1/events', ...)` block — there are several; add inside the main one near the existing date-range tests):

```typescript
it('excludes rows with first_missing_at set from the list response', async () => {
  const venue = await seedVenue({
    name: 'Hide Missing Venue',
    slug: 'hide-missing-venue',
  })
  await seedEvent(venue.id, {
    title: 'Active Show',
    artist: 'Active Artist',
    date: futureDate(7),
    status: 'upcoming',
    firstMissingAt: null,
  })
  await seedEvent(venue.id, {
    title: 'Stale Show',
    artist: 'Stale Artist',
    date: futureDate(8),
    status: 'upcoming',
    firstMissingAt: new Date('2026-06-17T09:00:00Z'),
  })

  const res = await app.request('/v1/events?venueSlug=hide-missing-venue')
  expect(res.status).toBe(200)
  const body = (await res.json()) as {
    success: boolean
    data: { data: { title: string }[]; total: number }
  }
  expect(body.success).toBe(true)
  expect(body.data.total).toBe(1)
  expect(body.data.data).toHaveLength(1)
  expect(body.data.data[0]?.title).toBe('Active Show')
})
```

Add to the `describe('GET /v1/events/:id', ...)` block (search for it in the file):

```typescript
it('returns 404 when the event is flagged first_missing_at', async () => {
  const venue = await seedVenue({
    name: 'Detail Missing Venue',
    slug: 'detail-missing-venue',
  })
  const evt = await seedEvent(venue.id, {
    title: 'Stale Detail',
    artist: 'Stale Detail Artist',
    date: futureDate(10),
    status: 'upcoming',
    firstMissingAt: new Date('2026-06-17T09:00:00Z'),
  })

  const res = await app.request(`/v1/events/${evt.id}`)
  expect(res.status).toBe(404)
  const body = (await res.json()) as { success: boolean; error?: string }
  expect(body.success).toBe(false)
})
```

Add a new `describe('GET /v1/events/genres', ...)` block (or extend if one exists):

```typescript
it('omits genres that only appear on first_missing_at rows', async () => {
  const venue = await seedVenue({
    name: 'Genre Missing Venue',
    slug: 'genre-missing-venue',
  })
  await seedEvent(venue.id, {
    title: 'Stale Genre Show',
    artist: 'Stale Genre Artist',
    date: futureDate(12),
    status: 'upcoming',
    firstMissingAt: new Date('2026-06-17T09:00:00Z'),
    genre: ['ghost-genre-do-not-show'],
  })

  const res = await app.request('/v1/events/genres')
  expect(res.status).toBe(200)
  const body = (await res.json()) as { success: boolean; data: string[] }
  expect(body.data).not.toContain('ghost-genre-do-not-show')
})
```

If `seedEvent` does not currently accept `firstMissingAt` or `genre`, extend the helper in `apps/api/src/test/helpers/seed.ts` to pass them through to the insert. Confirm the helper supports both before running.

- [ ] **Step 2: Run the new tests and confirm they FAIL**

```bash
cd apps/api && pnpm test:integration -- src/routes/events.integration.test.ts -t 'excludes rows with first_missing_at'
cd apps/api && pnpm test:integration -- src/routes/events.integration.test.ts -t 'returns 404 when the event is flagged first_missing_at'
cd apps/api && pnpm test:integration -- src/routes/events.integration.test.ts -t 'omits genres that only appear on first_missing_at rows'
```

Expected: all three FAIL (list returns stale row, detail returns 200, genres contain the ghost).

- [ ] **Step 3: Add `isNull(events.firstMissingAt)` to the list endpoint conditions**

In `apps/api/src/routes/events.ts`, modify the `conditions` array at line 76:

```typescript
const conditions: SQL[] = [
  inArray(events.status, ['upcoming', 'cancelled', 'postponed']),
  gte(events.date, from ?? todayInTimezone('UTC')),
  // Hide rows the crawler flagged as no longer visible on the venue page
  // (#607). The crawler clears firstMissingAt on re-extraction, so a row
  // that genuinely re-appears becomes visible again automatically.
  isNull(events.firstMissingAt),
]
```

Note: `isNull` is already imported on line 27.

- [ ] **Step 4: Add the same filter to the detail endpoint (404 path)**

In `apps/api/src/routes/events.ts`, modify the `where` clause around line 280:

```typescript
    .from(events)
    .innerJoin(venues, eq(events.venueId, venues.id))
    .where(and(eq(events.id, id), isNull(events.firstMissingAt)))
```

The existing `if (!row) { return ctx.json({ success: false, error: 'Event not found' }, 404) }` block at lines 282-284 already produces the 404.

- [ ] **Step 5: Add the same filter to the genres aggregation**

In `apps/api/src/routes/events.ts`, modify the genres SQL at line 229:

```typescript
const rows = await db.execute(
  sql`SELECT DISTINCT unnest(genre) AS genre FROM ${events} WHERE status = 'upcoming' AND first_missing_at IS NULL AND genre IS NOT NULL ORDER BY genre`,
)
```

- [ ] **Step 6: Run the new tests and confirm they PASS**

```bash
cd apps/api && pnpm test:integration -- src/routes/events.integration.test.ts
```

Expected: all tests pass, including the 3 new ones.

- [ ] **Step 7: Run the full events test suite to ensure no regressions**

```bash
cd apps/api && pnpm test -- src/routes/events
cd apps/api && pnpm test:integration -- src/routes/events
```

Expected: all pass.

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/routes/events.ts apps/api/src/routes/events.integration.test.ts apps/api/src/test/helpers/seed.ts
git commit -m "fix(api): hide first_missing_at rows from public events endpoints"
```

---

### Task 2: Filter venues-public router (list count + detail upcoming events)

**Files:**

- Modify: `apps/api/src/routes/venues-public.ts` (2 queries: upcoming-count for `GET /v1/venues`, and the venue-detail upcoming list+count for `GET /v1/venues/:slug`)
- Test: `apps/api/src/routes/venues-public.integration.test.ts`

**Interfaces:**

- Consumes: existing `db`, `events`, `venues`, Drizzle operators. `isNull` is NOT currently imported in `venues-public.ts` — add it to the import list at line 12.
- Produces: filter behavior verified by tests below.

- [ ] **Step 1: Write the failing tests**

Add to `apps/api/src/routes/venues-public.integration.test.ts`:

```typescript
it('GET /v1/venues — upcomingCount excludes first_missing_at rows', async () => {
  const venue = await seedVenue({
    name: 'Count Missing Venue',
    slug: 'count-missing-venue',
  })
  await seedEvent(venue.id, {
    title: 'Active',
    artist: 'A',
    date: futureDate(5),
    status: 'upcoming',
    firstMissingAt: null,
  })
  await seedEvent(venue.id, {
    title: 'Stale',
    artist: 'B',
    date: futureDate(6),
    status: 'upcoming',
    firstMissingAt: new Date('2026-06-17T09:00:00Z'),
  })

  const res = await app.request('/v1/venues')
  const body = (await res.json()) as {
    data: { slug: string; upcomingCount: number }[]
  }
  const row = body.data.find(
    (venueRow) => venueRow.slug === 'count-missing-venue',
  )
  expect(row?.upcomingCount).toBe(1)
})

it('GET /v1/venues/:slug — upcomingEvents excludes first_missing_at rows and count matches', async () => {
  const venue = await seedVenue({
    name: 'Detail Missing Venue',
    slug: 'detail-missing-venue-2',
  })
  await seedEvent(venue.id, {
    title: 'Active',
    artist: 'A',
    date: futureDate(5),
    status: 'upcoming',
    firstMissingAt: null,
  })
  await seedEvent(venue.id, {
    title: 'Stale',
    artist: 'B',
    date: futureDate(6),
    status: 'upcoming',
    firstMissingAt: new Date('2026-06-17T09:00:00Z'),
  })

  const res = await app.request('/v1/venues/detail-missing-venue-2')
  const body = (await res.json()) as {
    data: {
      venue: { upcomingCount: number }
      upcomingEvents: { title: string }[]
    }
  }
  expect(body.data.venue.upcomingCount).toBe(1)
  expect(body.data.upcomingEvents).toHaveLength(1)
  expect(body.data.upcomingEvents[0]?.title).toBe('Active')
})
```

- [ ] **Step 2: Run tests and confirm they FAIL**

```bash
cd apps/api && pnpm test:integration -- src/routes/venues-public.integration.test.ts -t 'excludes first_missing_at'
```

Expected: both new tests FAIL.

- [ ] **Step 3: Add the filter to the upcomingCount query**

In `apps/api/src/routes/venues-public.ts`, add `isNull` to the imports on line 12-15:

```typescript
import {
  type SQL,
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  isNull,
  sql,
} from 'drizzle-orm'
```

Modify the `eventCounts` query (lines 51-61):

```typescript
const eventCounts = await db
  .select({ venueId: events.venueId, total: count(events.id) })
  .from(events)
  .where(
    and(
      eq(events.status, 'upcoming'),
      gte(events.date, today),
      isNotNull(events.venueId),
      // Hide crawler-flagged stale rows from upcoming-count aggregate (#607).
      isNull(events.firstMissingAt),
    ),
  )
  .groupBy(events.venueId)
```

- [ ] **Step 4: Add the filter to the venue-detail conditions array**

In `apps/api/src/routes/venues-public.ts`, modify the `conditions` array (lines 107-111):

```typescript
const conditions: SQL[] = [
  eq(events.venueId, venue.id),
  eq(events.status, 'upcoming'),
  gte(events.date, today),
  // Hide crawler-flagged stale rows from venue-detail upcoming list (#607).
  isNull(events.firstMissingAt),
]
```

This filter is shared between the count query (line 113) and the list query (line 120) because both use the same `conditions` array — so one change covers both.

- [ ] **Step 5: Run new tests and confirm they PASS**

```bash
cd apps/api && pnpm test:integration -- src/routes/venues-public.integration.test.ts
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/routes/venues-public.ts apps/api/src/routes/venues-public.integration.test.ts
git commit -m "fix(api): hide first_missing_at rows from public venues endpoints"
```

---

### Task 3: Filter search/popular endpoint

**Files:**

- Modify: `apps/api/src/routes/search.ts`
- Test: `apps/api/src/routes/search.integration.test.ts`

**Interfaces:**

- Consumes: existing imports. `isNull` is NOT currently imported in `search.ts` — add to line 4.
- Produces: filter behavior verified by tests below.

- [ ] **Step 1: Write the failing test**

Add to `apps/api/src/routes/search.integration.test.ts`:

```typescript
it('GET /v1/search/popular excludes first_missing_at rows', async () => {
  const venue = await seedVenue({
    name: 'Popular Missing Venue',
    slug: 'popular-missing-venue',
  })
  await seedEvent(venue.id, {
    title: 'Active Popular',
    artist: 'Pop A',
    date: futureDate(5),
    status: 'upcoming',
    firstMissingAt: null,
  })
  await seedEvent(venue.id, {
    title: 'Stale Popular',
    artist: 'Pop B',
    date: futureDate(6),
    status: 'upcoming',
    firstMissingAt: new Date('2026-06-17T09:00:00Z'),
  })

  const res = await app.request('/v1/search/popular')
  expect(res.status).toBe(200)
  const body = (await res.json()) as { data: { title: string }[] }
  const titles = body.data.map((row) => row.title)
  expect(titles).toContain('Active Popular')
  expect(titles).not.toContain('Stale Popular')
})
```

- [ ] **Step 2: Run and confirm it FAILS**

```bash
cd apps/api && pnpm test:integration -- src/routes/search.integration.test.ts -t 'excludes first_missing_at'
```

Expected: FAIL (stale row appears in popular).

- [ ] **Step 3: Add `isNull` import and filter**

In `apps/api/src/routes/search.ts`:

```typescript
import { and, asc, desc, eq, gte, isNull, sql } from 'drizzle-orm'
```

Modify the `where` clause (line 37):

```typescript
    .where(
      and(
        eq(events.status, 'upcoming'),
        gte(events.date, today),
        // Hide crawler-flagged stale rows from popular surface (#607).
        isNull(events.firstMissingAt),
      ),
    )
```

- [ ] **Step 4: Run and confirm it PASSES**

```bash
cd apps/api && pnpm test:integration -- src/routes/search.integration.test.ts
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/routes/search.ts apps/api/src/routes/search.integration.test.ts
git commit -m "fix(api): hide first_missing_at rows from search/popular endpoint"
```

---

### Task 4: Full verification + lint/typecheck + push

**Files:** none

- [ ] **Step 1: Run typecheck across all affected packages**

Run from the repo root (or worktree root):

```bash
pnpm --filter=@concert-crawl/api typecheck
```

Expected: zero errors.

- [ ] **Step 2: Run lint on the API package**

```bash
pnpm --filter=@concert-crawl/api lint
```

Expected: zero errors.

- [ ] **Step 3: Run the FULL API test suite (unit + integration)**

```bash
cd apps/api && pnpm test:all
```

Expected: all pass.

- [ ] **Step 4: Sanity-check against staging DB before push**

Connect to Neon staging and run the same triage query to confirm there are real `first_missing_at` rows to hide. (This is read-only.)

```sql
SELECT COUNT(*) FILTER (WHERE first_missing_at IS NOT NULL) AS would_be_hidden,
       COUNT(*) AS total_upcoming
FROM events
WHERE status = 'upcoming' AND date >= CURRENT_DATE;
```

Confirm `would_be_hidden > 0` on staging so the change is exercising real data once deployed.

- [ ] **Step 5: Rebase + push**

Run from the repo root (or worktree root):

```bash
git fetch origin
git rebase origin/main
git push -u origin fix/hide-missing-events-from-consumer-api
```

- [ ] **Step 6: Open PR with explicit Copilot reviewer request**

```bash
gh pr create --title "fix(api): hide first_missing_at rows from public events surfaces" --body "$(cat <<'EOF'
## Summary
- Stop serving events flagged `first_missing_at IS NOT NULL` from public/consumer endpoints. The crawler already flags these as "no longer on the venue page" (#607), but the consumer API was still showing them — producing visible duplicates whenever the LLM extraction picked a different primary artist string across crawls (e.g., tonight's BASS BINGO – Wooli Edition showed 3 dupes for one show).
- Filter applied to: `GET /v1/events`, `GET /v1/events/:id` (now 404), `GET /v1/events/genres`, `GET /v1/venues` (upcoming count), `GET /v1/venues/:slug` (count + list), `GET /v1/search/popular`.
- Admin surfaces (`/v1/admin/*`) unchanged — the Missing tab still needs these rows for human triage.
- User-curated surfaces (`/v1/watching`, price submissions, event reports) unchanged — silently dropping a user's saved item is worse than a stale row.

## Root cause
The crawler's stale-event detection (`packages/crawler-core/src/crawl.ts:701-712`) sets `first_missing_at` when an event stops appearing on the venue page. The admin Missing tab reads that flag. But the consumer `/v1/events` and friends never filtered on it, so once the LLM produced a new "primary artist" for the same physical show, the old row was flagged but still served — producing N visible copies for one show.

## Scope of impact (measured against prod 2026-06-18)
- 997 upcoming rows total (date ≥ today)
- 216 of those flagged `first_missing_at IS NOT NULL` — all hidden by this PR
- 80 duplicate clusters (same venue/date/title/show_time); zero had 2+ active rows, confirming this filter resolves every visible dupe

## Reversibility
The crawler clears `first_missing_at` automatically on re-extraction (`packages/crawler-core/src/crawl.ts:673-700`). If a venue temporarily drops an event and re-lists it, the row becomes visible again on the next crawl with no manual intervention.

## Test plan
- [x] New integration tests: list/detail/genres exclusion, venue upcomingCount + detail exclusion, search/popular exclusion
- [x] All existing API tests pass (`pnpm test:all`)
- [x] Typecheck + lint clean
- [ ] After merge: deploy API, verify tonight's BASS BINGO duplicates are gone on consumer surface

## Follow-ups (separate issues)
- Stage 2a: scheduled sweep of `first_missing_at > N days` → `status='cancelled'` to clear the partial unique index
- Stage 2b: LLM extraction prompt-tightening or augmented dedup heuristic to reduce primary-artist drift (#633-related)
EOF
)"
```

- [ ] **Step 7: Request Copilot review (verify the response)**

Per the project's "Copilot Auto-Review" memory note, Copilot does NOT auto-review — request explicitly and verify:

```bash
PR_NUM=$(gh pr view --json number -q .number)
gh api -X POST "/repos/HartiganHM/concert-crawl/pulls/$PR_NUM/requested_reviewers" --input - <<'EOF'
{"reviewers": ["copilot-pull-request-reviewer[bot]"]}
EOF
```

Verify the response includes `copilot-pull-request-reviewer[bot]` in `requested_reviewers[].login`. If it doesn't, retry — the silent-fail mode is the known gotcha.

- [ ] **Step 8: File Stage 2a and 2b follow-up GH issues**

```bash
gh issue create --title "Sweep stale events: cancel rows with first_missing_at > 14 days" --label "type: chore,phase: beta,priority: normal,source: internal" --body "After PR for hiding first_missing_at rows lands, 216 stale rows remain in DB occupying the partial unique index. Add a sweep (manual SQL or scheduled job) that transitions rows with first_missing_at > 14 days old to status='cancelled'. This frees the (venue_id, date, canonical_artist) WHERE status='upcoming' index for new inserts and reduces orphaned dedup-loser rows. Stage 2a follow-up to triage from 2026-06-18."
```

```bash
gh issue create --title "Reduce LLM extraction artist-string drift to improve dedup" --label "type: chore,phase: beta,priority: normal,source: internal" --body "Root cause behind first_missing_at duplicates: the LLM extraction returns a different 'primary artist' string for the same physical show across crawls. Examples observed 2026-06-18: BASS BINGO – Wooli Edition produced 4 artist variants (Wooli, BASS BINGO, BASS BINGO!, full title); Olivia Rodrigo Dance Party produced 3 (manually-merged row got re-split by the next crawl). Options: (a) tighten the LLM prompt to pick the headliner or a stable label rule, (b) augment dedup with a (venue_id, date, show_time, normalized_title) secondary key when title is identical, (c) integrate with #633 admin merge tool to make manual merges stick. Stage 2b follow-up to triage from 2026-06-18."
```

- [ ] **Step 9: Watch the Copilot review, apply receiving-code-review skill when comments arrive**

When Copilot review comments arrive, invoke `superpowers:receiving-code-review` and address each one. Per the project memory: address every valid comment. Sync with the user only on real judgment calls.
