# Plan — Admin Inbox (#542)

**Issue:** #542 — unified admin inbox aggregating every attention item across the four
operational surfaces, with per-item read/unread state.
**Scope decision:** Option B (full four-category aggregation + read/unread), chosen by Hugh
over the lighter read-only feed.
**Read-state storage:** two new tables — `inbox_reads` (per-**occurrence** marks, keyed
`(item_type, item_id, source_created_at)` so a re-blocked venue / re-flagged event re-enters the
inbox as unread) and `inbox_read_watermarks` (per-category `read_up_to` for O(1) mark-all-read).
See the Decisions table and Task 1.

## Goal

Give admins one paginated, filterable inbox at `/admin/inbox` that unifies the four kinds of
things that currently demand attention across separate admin screens:

1. **Event flags** — unverified events (`events.verified = false`)
2. **Price submissions** — pending community price submissions (`price_submissions.status = 'pending'`)
3. **Blocked venues** — venues with `blockedAt` set
4. **Crawl failures** — `crawl.failed` / `crawl.event_count_dropped` admin notifications

Each row carries a title, body, deep link to the source surface, a timestamp, and a per-item
**read/unread** state that persists across sessions and is shared across all admins (global,
not per-user). The dashboard `AttentionFeed` regains its "Inbox ›" link pointing here.

## Decisions

| Decision                  | Resolution                                                                                                                                                                                                                                                                       | Rationale                                                                                                                                                                                                                                                                                                                                                            |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Scope                     | Option B — aggregate all four categories with read/unread                                                                                                                                                                                                                        | Hugh's call; the inbox is only useful if it's the single pane                                                                                                                                                                                                                                                                                                        |
| Read-state storage        | Two tables: `inbox_reads` (per-occurrence, `(item_type, item_id, source_created_at)`) + `inbox_read_watermarks` (per-category `read_up_to`)                                                                                                                                      | Per-item marks + O(1) mark-all-read; no backfill, doesn't mutate the 4 source tables, expand-only                                                                                                                                                                                                                                                                    |
| Read-state granularity    | Global (shared across admins), not per-user                                                                                                                                                                                                                                      | Solo-admin today; per-user adds a column with no consumer. KISS                                                                                                                                                                                                                                                                                                      |
| Read derivation           | An item is **read** if a matching `inbox_reads` row exists (same `source_created_at`) **OR** its `sourceCreatedAt <= watermark[itemType]`                                                                                                                                        | Lets mark-all-read be a single watermark upsert instead of an unbounded bulk insert                                                                                                                                                                                                                                                                                  |
| Recurrence handling       | Read key is **per-occurrence** — `(item_type, item_id, source_created_at)` — and `source_created_at` advances whenever an entity re-enters the inbox (venue re-blocked → new `blockedAt`; event re-unverified → new `updatedAt`; submissions/notifications are new rows already) | An entity-only key `(item_type, item_id)` would keep a re-blocked venue or re-flagged event **permanently read** after its first occurrence was cleared. Keying on the occurrence timestamp makes each recurrence a distinct, separately-markable item, and the watermark comparison (`sourceCreatedAt <= read_up_to`) already treats the newer occurrence as unread |
| Aggregation               | API-side `UNION ALL` of 4 normalized subqueries, `sourceCreatedAt DESC`                                                                                                                                                                                                          | One round trip; keeps the client dumb                                                                                                                                                                                                                                                                                                                                |
| Pagination                | **Server-side** `limit`/`offset` for v1, deterministic `(sourceCreatedAt, item_type, item_id)` order                                                                                                                                                                             | Inbox grows unbounded; can't load-all like the prices page. Offset degrades at large offsets, but the default `status=unread` working set stays small; keyset/cursor on the same `(sourceCreatedAt, item_type, item_id)` tuple is the documented upgrade path if deep paging becomes real                                                                            |
| Total count               | Opt-in via `count=true`, matching `/v1/admin/prices/*`                                                                                                                                                                                                                           | Avoids an extra `count(*)` when the UI doesn't need it                                                                                                                                                                                                                                                                                                               |
| `item_id` type            | `text` (heterogeneous: event uuid, submission uuid, venue uuid, notification uuid)                                                                                                                                                                                               | Single column fits all four; no polymorphic FK                                                                                                                                                                                                                                                                                                                       |
| Category filter           | Query param `category` optional enum (event_flag \| price_submission \| blocked_venue \| crawl_failure); **omit = all**                                                                                                                                                          | Mirrors the four source surfaces; no explicit `all` sentinel                                                                                                                                                                                                                                                                                                         |
| Read filter               | Query param `status` (unread \| read \| all), default `unread`                                                                                                                                                                                                                   | Inbox opens on what still needs attention                                                                                                                                                                                                                                                                                                                            |
| Mark-read auth trail      | Audit `inbox.mark_read` / `inbox.mark_all_read` via existing middleware                                                                                                                                                                                                          | Consistent with every other admin mutation                                                                                                                                                                                                                                                                                                                           |
| releases.ts / progress.md | **Skipped** — admin-internal tooling, not customer-facing                                                                                                                                                                                                                        | Matches the substantive-bar rule                                                                                                                                                                                                                                                                                                                                     |

## Task 1 — DB: `inbox_reads` + `inbox_read_watermarks`

Add the schema definitions in `packages/db/src/schema/inbox-reads.ts`, then generate the SQL
migration into `packages/db/migrations/` (schema lives under `src/schema/`; generated migration
files live under `migrations/` — keep them in their correct homes):

```ts
export const inboxItemType = pgEnum('inbox_item_type', [
  'event_flag',
  'price_submission',
  'blocked_venue',
  'crawl_failure',
])

// Per-occurrence read marks. The key includes `source_created_at` (the same
// occurrence timestamp the GET row exposes) so an entity that re-enters the
// inbox — a re-blocked venue, a re-unverified event — is a NEW, unread
// occurrence rather than staying permanently read off a stale mark.
// onConflictDoNothing keeps the FIRST reader's row, so `readBy` records who
// first cleared THAT occurrence — later reads are captured only in audit_log,
// not here. Read-state itself is global (any admin's mark counts).
export const inboxReads = pgTable(
  'inbox_reads',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    itemType: inboxItemType('item_type').notNull(),
    itemId: text('item_id').notNull(),
    // The occurrence timestamp — must equal the row's sourceCreatedAt so the
    // GET join matches this mark to that occurrence and only that occurrence.
    sourceCreatedAt: timestamp('source_created_at', {
      withTimezone: true,
    }).notNull(),
    readAt: timestamp('read_at', { withTimezone: true }).notNull().defaultNow(),
    readBy: text('read_by').notNull(), // first reader only (see note above)
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    uniqueItem: unique(
      'inbox_reads_item_type_item_id_source_created_at_unique',
    ).on(table.itemType, table.itemId, table.sourceCreatedAt),
  }),
)

// Per-category "read up to" watermark. mark-all-read upserts read_up_to = now()
// for a category (O(1)) instead of inserting one inbox_reads row per historical
// item. An item is read if it has an inbox_reads row OR its sourceCreatedAt is
// <= read_up_to for its type.
export const inboxReadWatermarks = pgTable('inbox_read_watermarks', {
  itemType: inboxItemType('item_type').primaryKey(),
  readUpTo: timestamp('read_up_to', { withTimezone: true }).notNull(),
  readBy: text('read_by').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})
```

- Expand-only: purely additive, no changes to `events`/`price_submissions`/`venues`/`notifications`.
- Migration timestamp must exceed all existing entries (check the latest `when` in the journal
  before generating).
- Export both tables from `packages/db/src/schema/index.ts`.

## Task 2 — API: inbox router

**New file:** `apps/api/src/routes/admin/inbox.ts`, mounted in
`apps/api/src/routes/admin/index.ts` as `inboxAdminRouter` under `/inbox`.

### `GET /v1/admin/inbox`

- Zod query: `category` optional enum (`event_flag`|`price_submission`|`blocked_venue`|`crawl_failure`)
  — **omitted means all categories**, no explicit `all` value; `status` optional enum
  (`unread`|`read`|`all`, default `unread`); `count` optional string flag parsed as
  `z.enum(['true','false']).optional().transform((val) => val === 'true')` — mirroring
  `apps/api/src/routes/admin/prices.ts:25-38` exactly (no `.default('false')`; an omitted param is
  `undefined`, and `undefined === 'true'` is `false`). **Not** `z.coerce.boolean()`, which wrongly
  coerces the string `"false"` to `true` (query params are strings);
  `limit` `z.coerce.number().int().min(1).max(100).default(50)`, `offset`
  `z.coerce.number().int().min(0).default(0)`.
- Build four Drizzle subqueries selecting a **normalized row shape**:
  `{ itemType, itemId, title, body, actionUrl, sourceCreatedAt }`. The `sourceCreatedAt` column is
  explicitly mapped per category (below) — never a generic `createdAt` — so sort order and watermark
  read-derivation key off the timestamp that actually reflects when the item entered the inbox.
  - event_flag: `events` where `verified = false` → `itemId = events.id`, title = event name,
    `sourceCreatedAt = events.updatedAt`, actionUrl = `/admin/review`. **Use `updatedAt`, not
    `createdAt`:** `POST /v1/admin/events/bulk/unverify` flips `verified` back to `false` and bumps
    `updatedAt` (`apps/api/src/routes/admin/events.ts:817-819`) while leaving `createdAt` frozen. Keying
    off `updatedAt` means a re-flagged event both sorts as freshly-arrived and — because the occurrence
    timestamp advanced — becomes a new unread occurrence instead of inheriting the read state of its
    original creation. (A newly-crawled unverified event has `updatedAt == createdAt`, so first-arrival
    ordering is unaffected.)
  - price_submission: `price_submissions` where `status = 'pending'` AND `disputedSubmissionId IS NULL`
    (exclude contest counters, matching the existing submissions endpoint) →
    `itemId = price_submissions.id`, `sourceCreatedAt = price_submissions.createdAt`,
    actionUrl = `/admin/prices/submissions`.
  - blocked_venue: `venues` where `blockedAt IS NOT NULL` → `itemId = venues.id`,
    `sourceCreatedAt = venues.blockedAt` (when the venue was blocked, not when the row was created).
    `blockedAt` is cleared on a successful crawl and re-set on a later block
    (`packages/crawler-core/src/crawl.ts:841-847` clears, `:926-934` re-sets), so a re-blocked venue
    carries a **new** `blockedAt` — with the occurrence read key it re-enters the inbox as unread
    rather than staying read off the prior block's mark. actionUrl = `/admin/venues` (or venue detail
    once #519 lands).
  - crawl_failure: `notifications` where `type = 'admin_alert'` AND `category IN ('crawl.failed','crawl.event_count_dropped')`
    → `itemId = notifications.id`, `sourceCreatedAt = notifications.createdAt`. The current crawl
    notification writers (`packages/crawler-core/src/crawl.ts`,
    `packages/crawler-core/src/lib/event-count-alert.ts`) set
    only `metadata`, **not** the `actionUrl` column, so derive the link with a Drizzle
    ``coalesce(notifications.actionUrl, sql`'/admin/crawl'`)`` rather than assuming `actionUrl` is populated.
- `UNION ALL` the four, `LEFT JOIN inbox_reads` on `(item_type, item_id, source_created_at)` — the
  `source_created_at` term is what keeps a stale mark from an earlier occurrence from masking a fresh
  one — and `LEFT JOIN inbox_read_watermarks` on `item_type` to derive the effective read state.
  Because either join can
  miss (no row → NULL) and `sourceCreatedAt <= NULL` evaluates to NULL (not false) in SQL, guard the
  watermark branch explicitly:
  **read** = `inbox_reads.read_at IS NOT NULL OR (inbox_read_watermarks.read_up_to IS NOT NULL AND sourceCreatedAt <= inbox_read_watermarks.read_up_to)`.
  Filter by `status` (unread = not read, read = read, all = no filter). Order
  `sourceCreatedAt DESC, item_type ASC, item_id ASC` — the `(item_type, item_id)` tie-breaker keeps
  `limit`/`offset` paging deterministic when multiple items share a timestamp. `readAt` in the row is
  `coalesce(inbox_reads.read_at, inbox_read_watermarks.read_up_to)` when read, else null.
- Also return per-category **unread counts** (for filter-rail badges) computed in the same handler.
  These are **always computed across the full inbox per category, independent of the current
  `category`/`status` query params** — the badges must show each category's total unread even while
  the list is filtered to a single category or to `status=read`, so they can't inherit the list filters.
- `total` (post-filter row count) is only computed and included when `count=true`.
- Response: `{ success: true, data: { items: InboxItem[], total?: number, unreadCounts: Record<InboxItemType, number> } }`
  — `total` present only when `count=true`.

### `POST /v1/admin/inbox/read`

- Zod body: `{ itemType: InboxItemType, itemId: string, sourceCreatedAt: string }` (ISO timestamp —
  the client echoes back the `sourceCreatedAt` of the row it's marking, so the mark targets that exact
  occurrence). Validate with `z.string().datetime()` and convert to a `Date` for insertion.
- Insert into `inbox_reads` (`onConflictDoNothing` on the `(item_type, item_id, source_created_at)`
  unique constraint) with `readBy = getAuthUser(ctx).userId`. First reader of that occurrence wins;
  subsequent reads no-op at the row level and are captured only in `audit_log`.
- Set audit: action `inbox.mark_read`, targetId = itemId, meta `{ itemType, sourceCreatedAt }`.

### `POST /v1/admin/inbox/read-all`

- Zod body: `{ category?: InboxItemType }` — omitted means all four categories.
- **Watermark upsert, not bulk insert:** for the target category (or each of the four), upsert the
  `inbox_read_watermarks` row via `onConflictDoUpdate` on the `item_type` PK, setting `read_up_to`
  and `updated_at` to the database clock and `read_by` to `getAuthUser(ctx).userId`. The
  `defaultNow()` only fires on insert, so the update branch must set `updated_at` explicitly or the
  timestamp goes stale after the first mark-all-read.
- **Write the timestamps with the DB clock, not app-side `new Date()`.** In Drizzle that's the
  `sql` helper with a bare `now()` call (Postgres `CURRENT_TIMESTAMP`). `read_up_to` is compared
  against `sourceCreatedAt` values that all originate from the database, so writing it with the same
  clock avoids app-server skew silently marking too many (or too few) items read.
- This is O(1) per category regardless of how much history the inbox holds — no row is written per
  historical item. Any item with `sourceCreatedAt <= read_up_to` is thereafter treated as read (see
  the Task 2 GET derivation). Items created after the watermark stay unread.
- Audit: action `inbox.mark_all_read`, meta `{ category }` (or `{ category: 'all' }`).

### Types

Shared in `packages/types`: `InboxItemType`, `InboxItem`
(`{ itemType: InboxItemType, itemId: string, title: string, body: string, actionUrl: string,
sourceCreatedAt: string, readAt: string | null }` — both timestamps are ISO strings, since the
row is serialized over HTTP), `InboxResponse` (`total` optional). Imported by both API and web.

### Tests

`inbox.test.ts` (route-level, mocked db, following `crawl.test.ts` conventions): each category
surfaces; `status` filter (unread/read/all); category omitted = all vs. single category;
per-item mark-read then that item reads as read; **watermark** mark-all-read flips older items to
read while a newer item stays unread; **recurrence** — mark an occurrence read, then the same entity
re-enters with a newer `source_created_at` (venue re-blocked / event re-unverified) and reads as
**unread** again (the stale mark must not mask it); read derivation (row OR watermark); `count=true` includes
`total`, `count=false` omits it; unreadCounts math; mark-read/mark-all-read idempotency; Zod
validation (bad category/status, limit/offset bounds); audit fields set.

## Task 3 — Web: inbox page

**New SSR page:** `apps/web/src/app/(protected)/admin/inbox/page.tsx` — server-fetches the first
page (`status=unread`) to seed `initialData`, `.catch` fallback so it never breaks the route.

**New hook:** `apps/web/src/lib/queries/use-admin-inbox.ts` — `useAdminInbox({ category, status, page })`
with **server-side pagination** (page/pageSize → offset), `inboxQueryKeys`,
`placeholderData: (prev) => prev`; plus `useMarkInboxRead()` / `useMarkAllInboxRead()` mutations
that invalidate the list + counts. Model on `use-admin-review.ts`.

**New client:** `apps/web/src/components/admin/inbox/AdminInboxClient.tsx` — category filter rail
(with unread-count badges), read/unread filter, per-row mark-read control, mark-all-read action,
`actionUrl` deep links, empty state, auth/load error banner (reuse the `isAuthError` helper
pattern from the prices page). Presentational sub-rows factored into `inbox/` components; logic
in `inbox/lib/`.

**Copy:** all strings in `apps/web/src/components/admin/definitions/copy.ts` under `adminInbox`.

**AttentionFeed:** restore the "Inbox ›" link (removed in `fix/admin-ui-polish`) pointing to
`/admin/inbox` — `apps/web/src/components/admin/dashboard/AttentionFeed.tsx` (link) and, if the
href is passed in, `apps/web/src/app/(protected)/admin/page.tsx`.

## Task 4 — Verification

- `pnpm typecheck && pnpm lint && pnpm test` in the worktree.
- Local pass: `pnpm dev`, seed data across all four categories, verify each surfaces, mark-read
  persists, category + status filters, mobile (320px) layout, empty state.
- design-review skill is N/A (no design handoff for this admin-internal tool); do a manual visual
  pass for token/theme consistency with the other admin screens.

## Out of scope

- Per-user read state (global is sufficient for solo admin).
- Real-time/SSE updates — poll on navigation is fine.
- Consumer-facing anything — admin-only; no `releases.ts`, no `progress.md` row.
- Bulk actions beyond mark-read/mark-all-read (no bulk verify/approve from the inbox).

## PR shape

One cohesive feature PR (`feat/admin-inbox`) closing #542: `inbox_reads` +
`inbox_read_watermarks` migration + types + inbox router + tests, then the web
page/hook/client/copy + AttentionFeed link restore. Body:
`Closes #542`. No new env vars. (May optionally split DB+API from web if the diff grows large,
but it's one feature, not multi-concern.)
