# #1122 — Make the Admin "Missing from crawl" list actionable

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the admin missing-events list from an undifferentiated pile into a triageable queue — each row carries a "why is this missing" classification (likely removed / possible crawl gap / possible duplicate) and a venue-cluster hint, sorted soonest-show-first.

**Architecture:** Two coordinated changes. (1) **Read-side enrichment (no schema change):** the admin API computes three per-row signals in SQL (live-sibling existence, venue event-horizon, venue cluster count) and derives a classification from them; the admin UI renders classification + cluster badges on desktop and mobile. (2) **Runtime self-heal (crawl-path):** after the post-crawl stale-detection pass, a per-venue reconciliation guard deletes drift-duplicate false-missing rows and reassigns their FK rows onto the live sibling — the runtime analogue of the one-shot sweep, byte-identical match rule for parity. A one-time ops sweep clears the existing backlog.

**Tech Stack:** Hono + Drizzle (API), React (Next.js App Router, admin UI), Vitest (unit + integration).

## Global Constraints

- **No schema migration.** All classification is computed on read. (Respects KISS — exhaust existing fields first.)
- **Consumer calendar is untouched.** Consumers already filter `firstMissingAt IS NOT NULL`; nothing here changes their query.
- **Drift-duplicate detection must reuse the merged sweep's match rule verbatim** for parity: headliner containment via `strpos()` on lowercased `canonical_*` fields, same-venue same-date, live sibling has `first_missing_at IS NULL`. Source of truth: `scripts/2026-07-19-missing-event-orphan-cleanup.sql` lines 176–185.
- **Denver-today gating** everywhere the current route uses it: `new Date().toLocaleDateString('en-CA', { timeZone: 'America/Denver' })`.
- **Mobile/desktop parity** — every badge added to `MissingRow` (desktop) also renders in `MissingMobile`, same PR.
- **Classification enum is a single shared union** in `@concert-crawl/types`, imported by both API and web — no duplicate string literals.
- **Copy rule** — all customer/admin-facing strings live in `apps/web/src/components/admin/definitions/copy.ts`.

---

## File Structure

| File                                                                                               | Change | Responsibility                                                         |
| -------------------------------------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------- |
| `packages/types/src/index.ts`                                                                      | Modify | Add `MissingClassification` union                                      |
| `apps/api/src/routes/admin/lib/classify-missing.ts`                                                | Create | Pure `classifyMissing()` fn + input type                               |
| `apps/api/src/routes/admin/lib/classify-missing.test.ts`                                           | Create | Unit tests for the pure fn                                             |
| `apps/api/src/routes/admin/events.ts`                                                              | Modify | Missing branch: derived SQL columns, classification map, sort          |
| `apps/api/src/routes/admin/events.integration.test.ts` (or existing admin-events integration test) | Modify | Integration coverage for the three classifications + cluster           |
| `apps/web/src/components/admin/review/missing/MissingRow.tsx`                                      | Modify | Extend `MissingRowEvent`; pass new props to chips                      |
| `apps/web/src/components/admin/review/missing/MissingMobile.tsx`                                   | Modify | Pass new props to chips (parity)                                       |
| `apps/web/src/components/admin/review/missing/MissingChips.tsx`                                    | Modify | Render classification + cluster badges                                 |
| `apps/web/src/components/admin/definitions/copy.ts`                                                | Modify | Classification + cluster labels                                        |
| `packages/crawler-core/src/reconcile-drift-duplicates.ts`                                          | Create | Runtime per-venue drift-dup self-heal (ports the sweep)                |
| `packages/crawler-core/src/reconcile-drift-duplicates.integration.test.ts`                         | Create | Integration coverage + FK-table-set guard test                         |
| `packages/crawler-core/src/crawl.ts`                                                               | Modify | Wire `reconcileDriftDuplicates` after Pass 2 (try/catch, log+continue) |

Classification is derived in **two layers**: SQL produces the raw facts (`hasLiveSibling`, `venueHorizon`, `clusterCount`); a pure JS function turns facts into the enum. The pure layer is unit-testable in isolation; the SQL layer is covered by integration tests.

---

## Classification model (reference — read before Task 1)

For a missing row at venue `V`, date `D` (both `YYYY-MM-DD`):

- **`duplicate`** — a live sibling exists: another `upcoming` event at the same venue+date, `first_missing_at IS NULL`, with headliner containment (one row's `canonical_artist` is a substring of the other's `canonical_title`). The show is still being crawled under a sibling row; this row is a stale copy. Safe to dismiss.
- **`crawl_gap`** — no live sibling, AND (`venueHorizon IS NULL` OR `D > venueHorizon`). `venueHorizon` = the max date among the venue's currently-seen (`first_missing_at IS NULL`) future events. If this event is beyond the furthest date the crawl currently reaches, the crawl likely isn't paginating deep enough (cf. #1127 Fillmore). May self-resolve once the crawl reaches it.
- **`removed`** — no live sibling, AND `D <= venueHorizon`. The crawl reaches past this date but stopped returning this specific show → the venue actively de-listed it. Actionable: cancel/dismiss.

`venueHorizon` is the shared primitive #1127's "event horizon shrank" alert will reuse.

Pure derivation (implemented in Task 1):

```ts
if (hasLiveSibling) return 'duplicate'
if (venueHorizon === null || date > venueHorizon) return 'crawl_gap'
return 'removed'
```

Date/horizon are `YYYY-MM-DD` strings — lexicographic `>` is correct.

---

## Task 1: Shared union + pure `classifyMissing` helper

**Files:**

- Modify: `packages/types/src/index.ts`
- Create: `apps/api/src/routes/admin/lib/classify-missing.ts`
- Test: `apps/api/src/routes/admin/lib/classify-missing.test.ts`

**Interfaces:**

- Produces: `MissingClassification` union; `classifyMissing(input: MissingClassificationInput): MissingClassification`; `MissingClassificationInput` shape `{ date: string; venueHorizon: string | null; hasLiveSibling: boolean }`.

- [ ] **Step 1: Add the union to `packages/types/src/index.ts`**

Add near the other event-related exports:

```ts
/**
 * Why an event landed on the admin "missing from crawl" list.
 * - removed: crawl reaches past this date but stopped returning this show (venue de-listed it)
 * - crawl_gap: event is beyond the furthest date the crawl currently reaches (likely pagination/depth)
 * - duplicate: a live sibling row for the same show is still being crawled
 */
export type MissingClassification = 'removed' | 'crawl_gap' | 'duplicate'
```

- [ ] **Step 2: Write the failing unit test**

Create `apps/api/src/routes/admin/lib/classify-missing.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { classifyMissing } from './classify-missing'

describe('classifyMissing', () => {
  it('returns duplicate when a live sibling exists, regardless of horizon', () => {
    expect(
      classifyMissing({
        date: '2026-08-01',
        venueHorizon: '2026-12-01',
        hasLiveSibling: true,
      }),
    ).toBe('duplicate')
  })

  it('returns crawl_gap when the event is beyond the venue horizon', () => {
    expect(
      classifyMissing({
        date: '2026-12-15',
        venueHorizon: '2026-11-30',
        hasLiveSibling: false,
      }),
    ).toBe('crawl_gap')
  })

  it('returns crawl_gap when the venue has no currently-seen future events', () => {
    expect(
      classifyMissing({
        date: '2026-08-01',
        venueHorizon: null,
        hasLiveSibling: false,
      }),
    ).toBe('crawl_gap')
  })

  it('returns removed when the crawl reaches past this date but dropped the show', () => {
    expect(
      classifyMissing({
        date: '2026-08-01',
        venueHorizon: '2026-12-01',
        hasLiveSibling: false,
      }),
    ).toBe('removed')
  })

  it('treats an event on the horizon date itself as removed', () => {
    expect(
      classifyMissing({
        date: '2026-12-01',
        venueHorizon: '2026-12-01',
        hasLiveSibling: false,
      }),
    ).toBe('removed')
  })
})
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `pnpm --filter @concert-crawl/api test classify-missing`
Expected: FAIL — cannot find module `./classify-missing`.

- [ ] **Step 4: Implement the helper**

Create `apps/api/src/routes/admin/lib/classify-missing.ts`:

```ts
import { type MissingClassification } from '@concert-crawl/types'

export interface MissingClassificationInput {
  /** Event date, YYYY-MM-DD. */
  date: string
  /** Max date among the venue's currently-seen future events, YYYY-MM-DD, or null if none. */
  venueHorizon: string | null
  /** True when a live sibling row for the same show is still being crawled. */
  hasLiveSibling: boolean
}

export const classifyMissing = ({
  date,
  venueHorizon,
  hasLiveSibling,
}: MissingClassificationInput): MissingClassification => {
  if (hasLiveSibling) return 'duplicate'
  if (venueHorizon === null || date > venueHorizon) return 'crawl_gap'
  return 'removed'
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm --filter @concert-crawl/api test classify-missing`
Expected: PASS (5 tests).

- [ ] **Step 6: Commit**

```bash
git add packages/types/src/index.ts apps/api/src/routes/admin/lib/classify-missing.ts apps/api/src/routes/admin/lib/classify-missing.test.ts
git commit -m "feat(admin): add missing-event classification helper (#1122)"
```

---

## Task 2: Admin API — derived signals, classification, cluster, sort

**Files:**

- Modify: `apps/api/src/routes/admin/events.ts:296-461` (the `GET /` handler, missing branch)
- Test: the admin-events integration test file (add cases)

**Interfaces:**

- Consumes: `classifyMissing` from Task 1.
- Produces: missing rows now include `classification: MissingClassification` and `clusterCount: number`, ordered by `date ASC, first_missing_at DESC`. Existing fields unchanged.

**Context:** The handler builds a shared `baseSelect` then branches for `missing`. The missing branch needs three extra computed columns. Because the missing branch already diverges (order-by differs — see the existing comment at lines 323–325), add a dedicated `missingSelect` for it rather than polluting `baseSelect`. The count query (`countQuery`, lines 452–456) uses `whereClause` only — **do not change `whereClause`**, so the count stays correct.

- [ ] **Step 1: Write the failing integration test**

In the admin-events integration test, add a block that seeds one venue with:

- a currently-seen future event (`first_missing_at = null`, `date = today + 60d`) → sets the horizon,
- a missing event within horizon (`date = today + 10d`, no sibling) → expect `removed`,
- a missing event beyond horizon (`date = today + 120d`, no sibling) → expect `crawl_gap`,
- a missing event with a live sibling (same venue+date as a seen event, headliner containment) → expect `duplicate`.

```ts
it('classifies missing events and returns venue cluster counts', async () => {
  // ...seed per the four rows above against the test DB...
  const res = await app.request(
    '/v1/admin/events?missing=true&count=true&limit=50&offset=0',
    { headers: adminAuthHeaders },
  )
  expect(res.status).toBe(200)
  const body = await res.json()
  const rows = body.data.rows as Array<{
    id: string
    date: string
    classification: string
    clusterCount: number
  }>

  const byDate = Object.fromEntries(rows.map((r) => [r.date, r]))
  expect(byDate[withinHorizonDate].classification).toBe('removed')
  expect(byDate[beyondHorizonDate].classification).toBe('crawl_gap')
  expect(byDate[siblingDate].classification).toBe('duplicate')

  // All missing rows at this venue share the cluster count (3 admin-visible missing).
  for (const row of rows) expect(row.clusterCount).toBe(3)

  // Sorted soonest-show-first.
  const dates = rows.map((r) => r.date)
  expect(dates).toEqual([...dates].sort())
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @concert-crawl/api test:integration -- events`
Expected: FAIL — `classification`/`clusterCount` undefined; order wrong.
(If the per-worktree test DB errors on first run, build crawler-core first: `pnpm turbo run build --filter=@concert-crawl/crawler-core`.)

- [ ] **Step 3: Add the derived-column select for the missing branch**

In `apps/api/src/routes/admin/events.ts`, after `baseSelect` is defined (line ~352) add a `missingSelect` that extends it with three correlated-subquery columns. Place this inside the handler so `today` is in scope:

```ts
// Missing branch needs three per-row signals computed over the FULL venue
// data (not the current page): whether a live sibling still covers this show,
// the venue's crawl "event horizon", and how many missing rows cluster at the
// venue. Correlated subqueries reference the outer `events` row.
const missingSelect = db
  .select({
    id: events.id,
    title: events.title,
    artist: events.artist,
    date: events.date,
    doorsTime: events.doorsTime,
    showTime: events.showTime,
    ticketPriceMin: events.ticketPriceMin,
    ticketPriceMax: events.ticketPriceMax,
    confidenceScore: sql<number | null>`(${events.confidenceScore})::float`,
    verified: events.verified,
    hiddenFromConsumer: events.hiddenFromConsumer,
    isConcertReviewNeeded: events.isConcertReviewNeeded,
    status: events.status,
    extractionStrategy: events.extractionStrategy,
    sourceUrl: events.sourceUrl,
    genre: events.genre,
    createdAt: events.createdAt,
    lastSeenAt: events.lastSeenAt,
    firstMissingAt: events.firstMissingAt,
    venueId: events.venueId,
    venueName: venues.name,
    isSoldOut: isSoldOutExpr(),
    // Live sibling: same show still crawled under another row (headliner
    // containment — mirrors scripts/2026-07-19-missing-event-orphan-cleanup.sql).
    hasLiveSibling: sql<boolean>`EXISTS (
      SELECT 1 FROM ${events} sib
      WHERE sib.venue_id = ${events.venueId}
        AND sib.date = ${events.date}
        AND sib.status = 'upcoming'
        AND sib.first_missing_at IS NULL
        AND sib.id <> ${events.id}
        AND ${events.canonicalArtist} <> '' AND sib.canonical_artist <> ''
        AND ${events.canonicalTitle} <> '' AND sib.canonical_title <> ''
        AND ( strpos(sib.canonical_title, ${events.canonicalArtist}) > 0
           OR strpos(${events.canonicalTitle}, sib.canonical_artist) > 0 )
    )`,
    // Event horizon: furthest date the crawl currently reaches at this venue.
    venueHorizon: sql<string | null>`(
      SELECT MAX(h.date) FROM ${events} h
      WHERE h.venue_id = ${events.venueId}
        AND h.status = 'upcoming'
        AND h.first_missing_at IS NULL
        AND h.date >= ${today}
    )`,
    // Cluster size: admin-visible missing rows at this venue (matches the
    // missing whereClause population below).
    clusterCount: sql<number>`(
      SELECT COUNT(*)::int FROM ${events} c
      WHERE c.venue_id = ${events.venueId}
        AND c.first_missing_at IS NOT NULL
        AND c.status = 'upcoming'
        AND c.date >= ${today}
        AND c.hidden_from_consumer = false
    )`,
  })
  .from(events)
  .leftJoin(venues, eq(events.venueId, venues.id))
```

> Note: `${events}` inside a raw `sql` template renders the table name; the inner alias (`sib`/`h`/`c`) disambiguates it from the correlated outer reference. If Drizzle's interpolation of `${events}` as a FROM target needs `sql.raw('events')`, the implementer should adjust — verify against the generated SQL in the failing test output.

- [ ] **Step 4: Point the missing branch at `missingSelect` and fix the sort**

Replace the `rowsPromise` missing branch (lines 431–436):

```ts
const rowsPromise = missing
  ? missingSelect
      .where(whereClause)
      .orderBy(asc(events.date), desc(events.firstMissingAt))
      .limit(limit)
      .offset(offset)
  : baseSelect
      .where(whereClause)
      .orderBy(asc(events.date), desc(events.createdAt))
      .limit(limit)
      .offset(offset)
```

Then map the classification onto the returned rows before responding. Extract a small mapper so both the `count` and non-`count` paths share it:

```ts
const withClassification = <
  T extends {
    date: string
    venueHorizon: string | null
    hasLiveSibling: boolean
  },
>(
  rows: T[],
) =>
  rows.map(({ venueHorizon, hasLiveSibling, ...row }) => ({
    ...row,
    classification: classifyMissing({
      date: row.date,
      venueHorizon,
      hasLiveSibling,
    }),
  }))
```

Apply it in both response paths, but only for the missing branch (the standard branch has no `venueHorizon`/`hasLiveSibling`):

```ts
if (!count) {
  const rows = await rowsPromise
  return ctx.json({
    success: true,
    data: missing ? withClassification(rows) : rows,
  })
}
// ...
const [rows, countResult] = await Promise.all([rowsPromise, countQuery])
const total = countResult[0]?.total ?? 0
return ctx.json({
  success: true,
  data: { rows: missing ? withClassification(rows) : rows, total },
})
```

`venueHorizon` and `hasLiveSibling` are stripped from the response by the mapper's destructure — they're internal facts, not part of the API contract. `clusterCount` stays.

- [ ] **Step 5: Update the imports and the handler doc comment**

Ensure `asc` is imported (it is — used by the standard branch), and add:

```ts
import { classifyMissing } from './lib/classify-missing'
```

Update the comment at lines 297–300 to describe the new order (`date ASC`) and the classification/cluster enrichment.

- [ ] **Step 6: Run the integration test to verify it passes**

Run: `pnpm --filter @concert-crawl/api test:integration -- events`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/routes/admin/events.ts apps/api/src/routes/admin/events.integration.test.ts
git commit -m "feat(admin): classify + cluster + soonest-first sort for missing events (#1122)"
```

---

## Task 3: Web types — consume the new fields

**Files:**

- Modify: `apps/web/src/components/admin/review/missing/MissingRow.tsx:12-20`

**Interfaces:**

- Consumes: `MissingClassification` from `@concert-crawl/types`.
- Produces: `MissingRowEvent` now carries `classification` + `clusterCount`.

- [ ] **Step 1: Extend `MissingRowEvent`**

```ts
import { type MissingClassification } from '@concert-crawl/types'

export interface MissingRowEvent {
  id: string
  title: string
  venueName: string | null
  date: string
  showTime: string | null
  lastSeenAt: string | null
  firstMissingAt: string
  classification: MissingClassification
  clusterCount: number
}
```

No behavior change yet — this just threads the type. The React Query hook (`use-admin-review.ts`) passes the API payload straight through, so no hook change is needed; the wider type flows automatically.

- [ ] **Step 2: Verify the web app still type-checks**

Run: `pnpm --filter @concert-crawl/web typecheck`
Expected: PASS (no consumers break — fields are additive; test fixtures may need the new fields, fix them if the compiler flags them).

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/admin/review/missing/MissingRow.tsx
git commit -m "feat(admin): thread classification + clusterCount into MissingRowEvent (#1122)"
```

---

## Task 4: Web UI — classification + cluster badges (desktop + mobile)

**Files:**

- Modify: `apps/web/src/components/admin/definitions/copy.ts` (missing section, ~1498–1522)
- Modify: `apps/web/src/components/admin/review/missing/MissingChips.tsx`
- Modify: `apps/web/src/components/admin/review/missing/MissingRow.tsx` (chip call site, line 112)
- Modify: `apps/web/src/components/admin/review/missing/MissingMobile.tsx` (chip call site, line 218)

**Interfaces:**

- Consumes: `event.classification`, `event.clusterCount` from Task 3.

- [ ] **Step 1: Add copy**

In `copy.ts`, inside `review.missing`, add:

```ts
classificationRemoved: 'Likely removed',
classificationCrawlGap: 'Possible crawl gap',
classificationDuplicate: 'Possible duplicate',
clusterBadge: (count: number, venue: string) => `${count} missing at ${venue}`,
```

- [ ] **Step 2: Render the badges in `MissingChips`**

Extend props and rendering. Cluster badge shows only when `clusterCount >= 3` (systemic venue issue — singletons and pairs stay quiet):

```tsx
import { type MissingClassification } from '@concert-crawl/types'
import { StatusBadge } from '@/components/admin/primitives'
import { ADMIN_COPY } from '@/components/admin/definitions/copy'

const CLUSTER_THRESHOLD = 3

const classificationBadge: Record<
  MissingClassification,
  { label: string; kind: 'danger' | 'warning' | 'neutral' }
> = {
  removed: {
    label: ADMIN_COPY.review.missing.classificationRemoved,
    kind: 'danger',
  },
  crawl_gap: {
    label: ADMIN_COPY.review.missing.classificationCrawlGap,
    kind: 'warning',
  },
  duplicate: {
    label: ADMIN_COPY.review.missing.classificationDuplicate,
    kind: 'neutral',
  },
}

export interface MissingChipsProps {
  missedCount: number
  classification: MissingClassification
  clusterCount: number
  venueName: string | null
}

export const MissingChips = ({
  missedCount,
  classification,
  clusterCount,
  venueName,
}: MissingChipsProps) => {
  const missedKind = missedCount >= 4 ? 'danger' : 'warning'
  const cls = classificationBadge[classification]
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      <StatusBadge kind={cls.kind} variant="outline" mono>
        {cls.label}
      </StatusBadge>
      <StatusBadge kind={missedKind} variant="outline" mono>
        {ADMIN_COPY.review.missing.chipMissed(missedCount)}
      </StatusBadge>
      <StatusBadge kind="neutral" mono>
        {ADMIN_COPY.review.missing.chipCadence}
      </StatusBadge>
      {clusterCount >= CLUSTER_THRESHOLD && (
        <StatusBadge kind="warning" mono>
          {ADMIN_COPY.review.missing.clusterBadge(
            clusterCount,
            venueName ?? '—',
          )}
        </StatusBadge>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Pass the new props at both call sites**

`MissingRow.tsx` line 112:

```tsx
<MissingChips
  missedCount={missed}
  classification={event.classification}
  clusterCount={event.clusterCount}
  venueName={event.venueName}
/>
```

`MissingMobile.tsx` line 218 (inside the `events.map`):

```tsx
<MissingChips
  missedCount={missed}
  classification={event.classification}
  clusterCount={event.clusterCount}
  venueName={event.venueName}
/>
```

- [ ] **Step 4: Typecheck + lint the web app**

Run: `pnpm --filter @concert-crawl/web typecheck && pnpm --filter @concert-crawl/web lint`
Expected: PASS.

- [ ] **Step 5: Manual UI check**

Start the web dev server, sign in as admin, open the review → Missing tab against a DB seeded with the four-row fixture from Task 2. Confirm: classification badge per row, cluster badge only on the venue with ≥3 missing, list sorted soonest-first, and the mobile layout (narrow viewport) shows the same badges. If the DB can't be seeded locally, say so explicitly rather than claiming the UI works.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/admin/definitions/copy.ts apps/web/src/components/admin/review/missing/MissingChips.tsx apps/web/src/components/admin/review/missing/MissingRow.tsx apps/web/src/components/admin/review/missing/MissingMobile.tsx
git commit -m "feat(admin): render classification + cluster badges on missing list (#1122)"
```

---

## Task 5: Runtime drift-duplicate self-heal in `crawl.ts`

**Files:**

- Create: `packages/crawler-core/src/reconcile-drift-duplicates.ts`
- Test: `packages/crawler-core/src/reconcile-drift-duplicates.integration.test.ts`
- Modify: `packages/crawler-core/src/crawl.ts` (wire after Pass 2, ~line 941)

**Interfaces:**

- Produces: `reconcileDriftDuplicates(venueId: string): Promise<{ reconciledLosers: number }>`.
- Consumes: `db`, `events` + FK tables from `@concert-crawl/db`; `createLogger` from `@concert-crawl/logger`.

**Context:** The runtime analogue of the one-time sweep (Task 6). After the post-crawl stale-detection Pass 2 stamps `first_missing_at`, a drift-duplicate can be freshly created: a title-variant orphan whose live sibling was just re-seen. This guard immediately reassigns the orphan's FK rows onto the live sibling and deletes the orphan — so it never surfaces on the admin list. It ports the sweep's MAP → REASSIGN → DELETE **byte-identically** (same match rule, same FK table set, same dedup logic) for parity (`feedback_migration_js_parity`), with these deliberate differences from the sweep:

1. **Scoped to the just-crawled venue** (`venue_id = ${venueId}`) — not a global sweep.
2. **No snapshot / no DO_EXECUTE gate** — this is a frequent, low-volume op and the winner is definitively live (`first_missing_at IS NULL`); the sweep's 7-day rollback window is for the one-shot bulk backfill, not per-crawl maintenance.
3. **No `RAISE EXCEPTION` FK-sanity block** — that would abort a crawl if a new FK table appeared. Instead a **CI test** (Step 2 below) asserts the FK-table set matches, failing the build (not the crawl) when the schema drifts.
4. **Wrapped in try/catch at the call site** that logs via `reportFailure` and continues — crawl resilience is existential; a reconcile failure must never fail the crawl.

- [ ] **Step 1: Write the failing integration test**

Create `packages/crawler-core/src/reconcile-drift-duplicates.integration.test.ts`. Seed (against the crawler-core integration test DB) one venue with:

- a live sibling: `status='upcoming'`, `first_missing_at = null`, `canonical_title='band x live'`, `canonical_artist='band x'`, `date = today+30d`, `show_time='20:00'`,
- a drift orphan: same venue+date+show_time, `first_missing_at = <stamp>`, `canonical_title='band x with support'`, `canonical_artist='band x with support'` (headliner containment: `strpos('band x with support', 'band x') > 0`),
- an unrelated missing row: same venue+date, `canonical_artist='other act'`, `canonical_title='other act'`, `first_missing_at` set (no containment → must survive),
- a `user_events` watch row and a `price_submissions` row both pointing at the orphan.

```ts
it('reassigns FK rows to the live sibling and deletes the drift orphan', async () => {
  // ...seed per the four rows above...
  const result = await reconcileDriftDuplicates(venueId)

  expect(result.reconciledLosers).toBe(1)

  // Orphan deleted; sibling + unrelated row survive.
  const remaining = await db
    .select({ id: events.id })
    .from(events)
    .where(eq(events.venueId, venueId))
  const ids = remaining.map((r) => r.id)
  expect(ids).toContain(siblingId)
  expect(ids).toContain(unrelatedId)
  expect(ids).not.toContain(orphanId)

  // Watch + price submission now point at the sibling.
  const watch = await db
    .select({ eventId: userEvents.eventId })
    .from(userEvents)
    .where(eq(userEvents.id, watchId))
  expect(watch[0]?.eventId).toBe(siblingId)

  const sub = await db
    .select({ eventId: priceSubmissions.eventId })
    .from(priceSubmissions)
    .where(eq(priceSubmissions.id, submissionId))
  expect(sub[0]?.eventId).toBe(siblingId)
})

it('is a no-op when there are no drift orphans', async () => {
  // seed a venue with only a live sibling + one genuinely-gone missing row (no containment)
  const result = await reconcileDriftDuplicates(venueId)
  expect(result.reconciledLosers).toBe(0)
})
```

Add the FK-table-set guard test in the same file — the CI replacement for the sweep's `RAISE EXCEPTION`:

```ts
it('EVENT_FK_TABLES matches every FK table referencing events.id', async () => {
  const rows = await db.execute(sql`
    SELECT DISTINCT tc.table_name AS table_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_schema = tc.constraint_schema
     AND ccu.constraint_name   = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.constraint_schema = 'public'
      AND ccu.table_schema = 'public'
      AND ccu.table_name = 'events'
      AND ccu.column_name = 'id'
  `)
  const actual = [...rows].map((r) => r.table_name).sort()
  expect(actual).toEqual([...EVENT_FK_TABLES].sort())
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @concert-crawl/crawler-core test:integration -- reconcile-drift-duplicates`
Expected: FAIL — module not found.
(If the test DB errors on first run, build the package first: `pnpm turbo run build --filter=@concert-crawl/crawler-core`.)

- [ ] **Step 3: Implement the reconcile module**

Create `packages/crawler-core/src/reconcile-drift-duplicates.ts`. Runs one transaction: MAP orphans→winners into a temp table (scoped to `venueId`, `date >= Denver-today`), build the `event_target` dedup map, REASSIGN the five FK tables (user_events + spotify_alert_log deduped, the other three plain), DELETE losers, return the loser count.

```ts
import { sql } from 'drizzle-orm'
import { db } from '@concert-crawl/db'
import { createLogger } from '@concert-crawl/logger'

const logger = createLogger('reconcile-drift-duplicates')

/**
 * FK tables referencing events.id. Kept in sync with the DB by the
 * "EVENT_FK_TABLES matches …" integration test — the CI analogue of the
 * one-shot sweep's RAISE EXCEPTION FK-sanity block. A schema drift fails the
 * build, never a crawl.
 */
export const EVENT_FK_TABLES = [
  'event_reports',
  'price_retrieval_log',
  'price_submissions',
  'spotify_alert_log',
  'user_events',
] as const

/**
 * Runtime analogue of scripts/2026-07-19-missing-event-orphan-cleanup.sql,
 * scoped to a single venue and run after each crawl's stale-detection pass.
 * Deletes false-missing "drift duplicate" orphans (a title-variant row whose
 * live sibling is still being crawled) and reassigns their FK rows onto the
 * live sibling. Match rule is byte-identical to the sweep for parity.
 */
export const reconcileDriftDuplicates = async (
  venueId: string,
): Promise<{ reconciledLosers: number }> =>
  db.transaction(async (tx) => {
    // MAP — one deterministic live sibling per orphan, scoped to this venue.
    await tx.execute(sql`
      CREATE TEMP TABLE orphan_map ON COMMIT DROP AS
      WITH missing_orphans AS (
        SELECT id, venue_id, date, canonical_title, canonical_artist, show_time
        FROM events
        WHERE status = 'upcoming'
          AND first_missing_at IS NOT NULL
          AND venue_id = ${venueId}
          AND date >= (NOW() AT TIME ZONE 'America/Denver')::date
      ),
      candidates AS (
        SELECT
          o.id AS loser_id,
          s.id AS winner_id,
          ROW_NUMBER() OVER (
            PARTITION BY o.id
            ORDER BY
              (s.canonical_title = o.canonical_title)          DESC,
              (s.show_time IS NOT DISTINCT FROM o.show_time)    DESC,
              s.last_seen_at DESC NULLS LAST,
              s.id ASC
          ) AS rn
        FROM missing_orphans o
        JOIN events s
          ON s.venue_id = o.venue_id
         AND s.date = o.date
         AND s.status = 'upcoming'
         AND s.first_missing_at IS NULL
         AND s.id <> o.id
         AND o.canonical_artist <> '' AND s.canonical_artist <> ''
         AND o.canonical_title  <> '' AND s.canonical_title  <> ''
         AND ( strpos(s.canonical_title, o.canonical_artist) > 0
            OR strpos(o.canonical_title, s.canonical_artist) > 0 )
      )
      SELECT loser_id, winner_id FROM candidates WHERE rn = 1
    `)

    const [{ loser_count }] = [
      ...(await tx.execute(
        sql`SELECT COUNT(*)::int AS loser_count FROM orphan_map`,
      )),
    ] as Array<{ loser_count: number }>

    if (loser_count === 0) {
      // Temp table is ON COMMIT DROP — nothing to clean up, just return.
      return { reconciledLosers: 0 }
    }

    await tx.execute(sql`
      CREATE TEMP TABLE event_target ON COMMIT DROP AS
      SELECT loser_id AS event_id, winner_id AS target_id FROM orphan_map
      UNION
      SELECT DISTINCT winner_id AS event_id, winner_id AS target_id FROM orphan_map
    `)

    // user_events — dedup on (user_id, target_id) then redirect.
    await tx.execute(sql`
      WITH target_user_rows AS (
        SELECT ue.id AS ue_id,
          ROW_NUMBER() OVER (PARTITION BY ue.user_id, et.target_id
            ORDER BY ue.created_at DESC, ue.id DESC) AS rn,
          COUNT(*) OVER (PARTITION BY ue.user_id, et.target_id) AS group_size
        FROM user_events ue
        JOIN event_target et ON et.event_id = ue.event_id
      )
      DELETE FROM user_events ue USING target_user_rows tur
      WHERE ue.id = tur.ue_id AND tur.group_size > 1 AND tur.rn > 1
    `)
    await tx.execute(sql`
      UPDATE user_events ue SET event_id = om.winner_id
      FROM orphan_map om WHERE ue.event_id = om.loser_id
    `)

    // spotify_alert_log — dedup on (user_id, kind, target_id) then redirect.
    await tx.execute(sql`
      WITH target_alert_rows AS (
        SELECT sal.id AS sal_id,
          ROW_NUMBER() OVER (PARTITION BY sal.user_id, sal.kind, et.target_id
            ORDER BY sal.created_at DESC, sal.id DESC) AS rn,
          COUNT(*) OVER (PARTITION BY sal.user_id, sal.kind, et.target_id) AS group_size
        FROM spotify_alert_log sal
        JOIN event_target et ON et.event_id = sal.event_id
      )
      DELETE FROM spotify_alert_log sal USING target_alert_rows tar
      WHERE sal.id = tar.sal_id AND tar.group_size > 1 AND tar.rn > 1
    `)
    await tx.execute(sql`
      UPDATE spotify_alert_log sal SET event_id = om.winner_id
      FROM orphan_map om WHERE sal.event_id = om.loser_id
    `)

    // No user-uniqueness — plain redirect.
    await tx.execute(sql`
      UPDATE price_submissions ps SET event_id = om.winner_id
      FROM orphan_map om WHERE ps.event_id = om.loser_id
    `)
    await tx.execute(sql`
      UPDATE price_retrieval_log prl SET event_id = om.winner_id
      FROM orphan_map om WHERE prl.event_id = om.loser_id
    `)
    await tx.execute(sql`
      UPDATE event_reports er SET event_id = om.winner_id
      FROM orphan_map om WHERE er.event_id = om.loser_id
    `)

    // DELETE losers — FK rows reassigned, CASCADE has nothing to chase.
    await tx.execute(sql`
      DELETE FROM events e USING orphan_map om WHERE e.id = om.loser_id
    `)

    logger.info(
      { venueId, reconciledLosers: loser_count },
      'reconciled drift-duplicate orphans',
    )
    return { reconciledLosers: loser_count }
  })
```

> The `db.execute` return shape from the `postgres-js` driver is iterable rows; the `[...(await tx.execute(...))]` spread materializes them. If the implementer finds the driver returns a `{ rows }` wrapper instead, adjust the count extraction to match the shape the failing test reveals — do NOT add an `as` cast to force it.

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @concert-crawl/crawler-core test:integration -- reconcile-drift-duplicates`
Expected: PASS (3 tests: reassign+delete, no-op, FK-table-set guard).

- [ ] **Step 5: Wire it into `crawl.ts` after Pass 2**

In `packages/crawler-core/src/crawl.ts`, add the import near the other local imports (line ~37):

```ts
import { reconcileDriftDuplicates } from './reconcile-drift-duplicates.js'
```

Immediately after the Pass 2 `if (seenEventCoords.length > 0) { ... }` block (ends ~line 941), add:

```ts
// Runtime drift-duplicate self-heal (#1122). Pass 2 above can freshly
// stamp first_missing_at on a title-variant orphan whose live sibling was
// just re-seen. Reassign its FK rows onto the sibling and delete it so it
// never reaches the admin missing list. Guarded: a reconcile failure must
// never fail the crawl (crawl resilience is existential) — log and continue.
if (seenEventCoords.length > 0) {
  try {
    await reconcileDriftDuplicates(venueId)
  } catch (err) {
    reportFailure({
      error: err,
      context: 'reconcileDriftDuplicates',
      metadata: { venueId, crawlRunId: id },
    })
  }
}
```

> Verify the exact `reportFailure` signature against its other call sites in this file (lines ~1128, ~1155) and match it — the fields above are illustrative.

- [ ] **Step 6: Run the crawler-core test suite + typecheck**

Run: `pnpm --filter @concert-crawl/crawler-core test && pnpm --filter @concert-crawl/crawler-core typecheck`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/crawler-core/src/reconcile-drift-duplicates.ts packages/crawler-core/src/reconcile-drift-duplicates.integration.test.ts packages/crawler-core/src/crawl.ts
git commit -m "feat(crawler): runtime drift-duplicate self-heal after stale-detection pass (#1122)"
```

---

## Task 6: One-time drift-duplicate sweep (ops — no code)

The already-merged `scripts/2026-07-19-missing-event-orphan-cleanup.sql` deletes false-missing orphans (date ≥ today) that have a live sibling, reassigning their FK rows to the winner. Run it staging-first, then prod.

- [ ] **Step 1: Diagnose staging (dry run)**

Run the script against staging with `DO_EXECUTE` unset (default dry-run). Read the DIAGNOSE output (matched_orphans per venue) and the DRY-RUN projection.

- [ ] **Step 2: Execute staging if orphans exist**

If `matched_orphans > 0`, re-run with `-v DO_EXECUTE=1`. Confirm the VALIDATE NOTICE passes. If `matched_orphans = 0`, record "staging clean" and skip.

- [ ] **Step 3: Diagnose + execute prod**

Repeat Steps 1–2 against prod. **Surface the prod DIAGNOSE output before executing** — this mutates prod. Sidecar `events_missing_orphan_cleanup_1122` is the 7-day rollback window.

- [ ] **Step 4: Record the result**

Note per-env matched/deleted counts in the PR description (or the pickup memory if run outside the PR).

---

## Runtime reconciliation guard — in scope (Task 5)

Hugh pulled the **drift-duplicate self-heal** into this plan's scope directly. It ships as Task 5: a per-venue reconcile that runs after the post-crawl stale-detection pass, mirroring the one-shot sweep byte-for-byte but scoped to the just-crawled venue, without the snapshot/DO_EXECUTE gate, with the FK-sanity check moved to a CI test, and wrapped in a log-and-continue guard so it can never fail a crawl. On-read classification (Tasks 1–4) remains the safety net for anything the runtime guard doesn't catch.

---

## Self-Review

**Spec coverage vs. the user's locked answers (#1122):**

- "Organize, not auto-cancel" → ✅ classification + sort + cluster; zero auto-state-changes.
- "Insights per event: definitely removed vs crawl just missed it" → ✅ `removed` / `crawl_gap` / `duplicate` (Task 1–4).
- "No cutoff, keep the list manageable; design for a future ~30/40/50 cap" → ✅ no cutoff added; cluster count + soonest-first sort make a large list scannable; a future cap can key off `clusterCount`/classification without rework.
- "Sweep now" → ✅ Task 6.
- Refine tooling from the signal → ✅ `crawl_gap` + `venueHorizon` are the exact primitive #1127's alert reuses.
- Runtime self-heal in scope → ✅ Task 5 (per-venue reconcile after Pass 2, sweep-parity match rule, log-and-continue guard).

**Placeholder scan:** none — every step carries real code or an exact command.

**Type consistency:** `MissingClassification` defined once in `@concert-crawl/types`, imported by `classify-missing.ts`, the API mapper, `MissingRowEvent`, and `MissingChips`. `MissingClassificationInput` fields (`date`, `venueHorizon`, `hasLiveSibling`) match the SQL column names selected in Task 2 and the mapper's destructure. `reconcileDriftDuplicates` and `EVENT_FK_TABLES` are the only exports Task 5 adds; the crawl.ts import matches the module's named export.

**Risk:** Tasks 1–4 are read-only + additive; consumer path untouched. Task 5 mutates at crawl time (deletes orphans + reassigns FKs) but is scoped to one venue, byte-parity with the reviewed sweep, covered by integration tests, and wrapped in a log-and-continue guard so it can never fail a crawl. Task 6 is the already-reviewed, snapshot-guarded sweep behind a dry-run gate.
