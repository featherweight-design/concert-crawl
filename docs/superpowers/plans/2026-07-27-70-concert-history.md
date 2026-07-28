# Concert History (attended shows) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship [#70](https://github.com/HartiganHM/concert-crawl/issues/70) — a user's history of shows they **actually attended**. Attendance is an explicit "I'm going!" commitment on Event Detail, never derived from Watching. Three surfaces plus a teaser: the Going CTA, the Watching nudge, the History page (under a renamed **My shows** destination), and a Passport teaser link to [#85](https://github.com/HartiganHM/concert-crawl/issues/85).

**Architecture:** One nullable `attending_at timestamptz` column on the existing `user_events` table (`packages/db/src/schema/social.ts:36-56`). `going` is derived at read time from `attending_at IS NOT NULL`. Watching stays `status = 'watching'`; the two concerns coexist on the same row under the existing `user_events_user_event_idx` unique index. `status` drops its `NOT NULL` so an attendance-only row has a place to exist without lying about Watching. Two new Hono routers (`/v1/attending`, `/v1/history`) behind `requireFeature()`. Five consumer components lifted from the design handoff.

**Tech Stack:** Next.js (App Router), React, TypeScript strict, Tailwind, Drizzle/Postgres, Hono, Zod, Vitest, Playwright.

**Design handoff:** `design/design_handoff_concert_history/` — Readiness verdict **🟢 Green** (`READINESS.md`, 🟡 Yellow PR [#870](https://github.com/HartiganHM/concert-crawl/pull/870) → 🟢 Green addendum PR [#916](https://github.com/HartiganHM/concert-crawl/pull/916)).
**Concept lock:** Watching ≠ Attending — History requires an explicit "I'm going!", it is not derived from the watch list. Do not re-open. Authoritative in-repo source: the READINESS addendum in `design/design_handoff_concert_history/READINESS.md`. (Also held as a Claude agent memory record, `project_concert_history_attending.md`, which lives outside the repo under `~/.claude/projects/` — don't go looking for it in the tree.)

---

## Locked decisions inherited (do not re-litigate)

| # | Decision | Source |
| - | -------- | ------ |
| 1 | Schema is `attending_at timestamptz` on `user_events` (TS/API `attendingAt`), **not** a new `user_event_attendance` table. `going` = `attending_at IS NOT NULL`. | READINESS addendum §1 |
| 2 | `status = 'going'` is **not written going forward**. Existing values migrate into `attending_at`, then the contract PR nulls them out. | READINESS addendum §1 |
| 3 | Supporter tier already exists in `subscription_tier` (`packages/db/src/schema/commerce.ts`) via PR [#878](https://github.com/HartiganHM/concert-crawl/pull/878). Gate through `packages/entitlements`, never a hand-rolled tier string comparison. | READINESS addendum §2 |
| 4 | **Passport card is out of scope** — moved to `shareable_cards` ([#72](https://github.com/HartiganHM/concert-crawl/issues/72)). This build ships `<PassportTeaser>` as a link to [#85](https://github.com/HartiganHM/concert-crawl/issues/85) only. | READINESS addendum §3 |
| 5 | The Watching affordance stays the **eye** (`lucide` `Eye`, shipped in `WatchShowButton.tsx:292`). Going is a separate, differently-shaped button. Browse rows stay eye-only — no Going on cards. | Handoff README "Browse stays eye-only" |
| 6 | No post-show "did you go?" prompt. The 7-day pre-show nudge is the only ask. | Handoff README §Source-of-truth |

---

## ⚠️ Decision gate before PR-2 merges — the entitlement matrix says Premium, not Supporter

The READINESS addendum §2 asserts "the paywall gate for History detail can key off `tier === 'supporter' || tier === 'founder'` immediately." **The shipped code disagrees.**

`packages/entitlements/src/index.ts:58-73`:

```ts
'concert-history': {
  'logged-out': 'tier-picker-on-tap',
  free: 'paywall-on-tap',
  supporter: 'paywall-on-tap',   // ← Supporter is LOCKED OUT today
  premium: 'visible-active',
  founder: 'visible-active',
  gifted: 'visible-active',
},
'calendar-export': { /* identical shape — supporter: 'paywall-on-tap' */ },
```

The handoff's `<HistoryLocked>` card and issue #70 both call Concert History the marquee **Supporter** perk. The matrix is canonically "#781 §6 with the R6 Watching-is-Free amendment" per the comment at `packages/entitlements/src/index.ts:41-45`.

**Two ways out, both one line each — Hugh picks before PR-2 merges:**

- **(A)** Flip `concert-history.supporter` and `calendar-export.supporter` to `'visible-active'` in `ENTITLEMENTS_MATRIX` (plus the lockstep table in `packages/entitlements/src/index.test.ts`). Matches the handoff and #70.
- **(B)** Leave the matrix alone (History is Premium+) and re-voice the locked card away from "+ Supporter".

**Nothing else in this plan depends on which way it goes** — every gate in every task calls `requireFeature('concert-history')` / `useEntitlement('concert-history')`, so the answer lives in exactly one file. Do not hardcode `'supporter'` anywhere.

---

## Global Constraints

- **TDD**: every new module lands with a failing test first. Integration tests for every new Hono route.
- **Vocabulary is LOCKED.** **Watching** (never Saved / Favorites / Following), **Submitted prices**, **price check**. The Watching affordance is an **eye**. There is no heart icon in this product and none is introduced here — `git diff origin/main -- apps/web/src | grep -n '^+.*[Hh]eart'` before every push must return nothing. A repo-wide `grep` is useless here — `heart` already appears in shipped copy (e.g. `apps/web/src/components/consumer/spotify/definitions/copy.ts`), so only the added lines are meaningful.
- **"I'm going!" keeps the exclamation mark.** Confirmed state is just **"Going"**. Copy lifts **verbatim** from the handoff (`going-cta.jsx`, `history-screens.jsx`, `history-routes.jsx`) — the strings are voice-passed and the READINESS audit locked them. Do not rewrite.
- **All customer-facing strings in `definitions/copy.ts`.** The handoff hardcodes copy in JSX (READINESS §Codebase fit flags this); externalizing is part of every UI task.
- **TypeScript strict; no `as` casts.** Zod `safeParse` at boundaries (API responses, `localStorage` reads), type guards for union narrowing, declaration merging for library types. `status` becoming nullable will surface narrowing sites — narrow them, don't cast them.
- **Zod validation at every Hono endpoint**; all routes under `/v1/`.
- **Drizzle only.** Expand/contract migrations only, never destructive in a single deploy. Manual `_journal.json` `when` values must exceed every prior entry (Drizzle sorts by timestamp) — last shipped is `0063_vendor_picker_values`, `when: 1785628800000`.
- **Tokens only** — every color reads `var(--*)`. No hardcoded hex on in-app surfaces, no Tailwind `dark:` variants. Parity holds across all 9 themes. **One carve-out:** the 7-colour stamp brand set in `stamp.ts` (PR-3 Task 1) is *identity data*, not theming — the same exception `IA_PALETTES` (`IdentityArt.tsx:85`) already takes. It is deterministic per user and must not shift with the theme; see PR-3 for the full rationale. (The handoff's only other hex is the Passport share-card gradient, out of scope here.)
- **Mobile/desktop parity in the same PR** — non-negotiable. The handoff draws `<HistoryRoute>` (mobile) and `<HistoryRouteDesktop>` (desktop 2-column) together; they ship together.
- **a11y in the same PR** — 44px minimum tap targets, `aria-pressed` on toggles, `aria-live="polite"` on the nudge banner (READINESS ♿ flag), `role="status"` on the Going state change (READINESS Open observation 4), full keyboard paths. No native `title=` **tooltips** on interactive UI — this bans `title` used to convey hover-only information, not the `title` attribute where ARIA requires it for labelling (e.g. `<iframe title=...>`).
- **Components**: arrow functions, no `handle*` names, logic in `lib/`, semantic HTML.
- **Release notes** — PR-5 (the user-visible landing) adds an entry to `apps/web/src/lib/definitions/releases.ts` on the same branch. PR-1/2/6 are invisible plumbing and skip it.
- **progress.md** — one ✅ Complete row, added on PR-5 only. Six rows for one feature is per-PR logging, which the convention forbids.
- **Pre-push in every worktree:**
  ```
  pnpm turbo run build --filter=@concert-crawl/db --filter=@concert-crawl/types --filter=@concert-crawl/entitlements --filter=@concert-crawl/push
  pnpm typecheck && pnpm lint && pnpm test
  ```
- **`DATABASE_URL_TEST`** — per-worktree test DB so concurrent agents don't truncate each other. The name is derived automatically from the worktree path below `.worktrees/` (sanitized) by `apps/api/src/test/setup/global-setup.ts` — don't hand-pick one; set `DATABASE_URL_TEST` only if you need to override the derived value.

---

## Sequencing lock

Data model first, API second, UI in dependency order, contract last. Each PR passes CI standalone.

| PR   | Scope                                            | Depends on                                        | Ticket seam |
| ---- | ------------------------------------------------ | ------------------------------------------------- | ----------- |
| PR-1 | `attending_at` expand migration + backfill + write-path safety | — | — |
| PR-2 | `/v1/attending` + `/v1/history` + `.ics` export + types | PR-1 (column exists) | #764 reads the contract this PR defines |
| PR-3 | "I'm going!" CTA + stub stamp on Event Detail    | PR-2 (mutation endpoint)                          | #1096 displays counts later |
| PR-4 | Watching nudge (7-day window)                    | PR-3 (`GoingButton` + toggle hook), PR-2 (`attendingAt` on `WatchingShow`) | — |
| PR-5 | **My shows** rename + History route + teaser     | PR-2 (`GET /v1/history`), PR-3 (`StubStamp`)      | Teaser links to #85 |
| PR-6 | Contract: retire `status = 'going'` from data    | PR-1 backfill verified in prod                    | — |

**PR-6 must not merge until a prod count query confirms the backfill is complete** (Task 6.1). It is the only irreversible step in the chain.

---

## Phase / PR-1 — Data model: `attending_at` expand + write-path safety

Purely additive schema, plus the write-path repairs that stop Watching from destroying attendance data. No user-visible change.

### Task 1: Migration `0064_user_events_attending_at.sql`

**Files:**

- Create: `packages/db/migrations/0064_user_events_attending_at.sql`
- Modify: `packages/db/migrations/meta/_journal.json`
- Modify: `packages/db/src/schema/social.ts`

**Interfaces:**

Three expand operations plus a backfill, all non-destructive and re-runnable:

1. `ALTER TABLE "user_events" ADD COLUMN IF NOT EXISTS "attending_at" timestamptz;`
2. `ALTER TABLE "user_events" ALTER COLUMN "status" DROP NOT NULL;`
3. `CREATE INDEX IF NOT EXISTS "user_events_user_attending_idx" ON "user_events" ("user_id", "attending_at") WHERE "attending_at" IS NOT NULL;`
4. Backfill: `UPDATE "user_events" SET "attending_at" = "created_at" WHERE "status" = 'going' AND "attending_at" IS NULL;`

**Why `status` becomes nullable — read this before proposing an alternative.**

`status` is `notNull` today (`packages/db/src/schema/social.ts:44`) and the unique index `user_events_user_event_idx` on `(user_id, event_id)` (`:51-54`) means a user gets exactly one row per event. A user who marks "I'm going!" on a show they are *not* watching needs that row to exist. The available encodings:

- Write `status = 'watching'` — **wrong**: silently adds them to the Watching list (`apps/api/src/routes/watching.ts:75`) and to the watch push fan-out (`packages/push/src/watch-fanout.ts:185`).
- Write `status = 'going'` — forbidden by locked decision #2.
- Add a new `'none'` enum value — a sentinel that means "no value," which is what `NULL` is for, and it would need handling in every `AdminUserEventStatus` consumer anyway.
- **Drop `NOT NULL`** — chosen. `NULL` means "this row carries no Watching relationship." Every existing reader filters `eq(userEvents.status, 'watching')`, and SQL equality excludes `NULL` rows automatically, so no shipped query changes meaning. Dropping a `NOT NULL` constraint is a pure expand: old code that still writes a status keeps working.

The Drizzle column becomes `status: userEventStatusEnum('status')` (no `.notNull()`), typing as `'going' | 'interested' | 'watching' | null`.

- [ ] **Step 1: Confirm the migration number and journal timestamp**

`ls packages/db/migrations | tail -3` — if `main` has advanced past `0063`, renumber and pick a `when` greater than the newest entry. Baseline: `0063` uses `when: 1785628800000`; use `1785715200000` for `0064` unless a later entry exists.

- [ ] **Step 2: Write the migration SQL**

Header comment must state: expand-only; the backfill uses `created_at` as the best available proxy for the going timestamp because no dedicated timestamp was ever recorded for `status = 'going'` rows; `IF NOT EXISTS` makes the whole file idempotent.

- [ ] **Step 3: Update the Drizzle schema**

```ts
// packages/db/src/schema/social.ts
status: userEventStatusEnum('status'),               // was .notNull()
attendingAt: timestamp('attending_at', { withTimezone: true }),
// index (table) =>
userAttendingIdx: index('user_events_user_attending_idx')
  .on(table.userId, table.attendingAt)
  .where(sql`${table.attendingAt} IS NOT NULL`),
```

The `.where(...)` predicate is not optional — it must mirror the **partial** index the migration in Step 2 creates. A full index here would make the Drizzle model diverge from the database and produce a spurious diff on the next `drizzle-kit generate`.

Add a block comment above `userEventStatusEnum` recording that `'going'` is legacy-read-only (locked decision #2) and that attendance is `attendingAt`, so the next reader doesn't reintroduce it.

- [ ] **Step 4: Run `pnpm db:migrate` locally and verify**

`\d user_events` in psql (`docker exec -it concert-crawl-db psql -U postgres -d concert_crawl_db`) — confirm the column, the dropped `NOT NULL`, and the partial index.

- [ ] **Step 5: Typecheck the monorepo and fix the narrowing fallout**

`pnpm typecheck`. Every site that reads `userEvents.status` into a non-nullable slot now errors. Expected hits: `apps/api/src/routes/watching.ts:122`, `apps/api/src/routes/admin/users.ts`, `packages/db/seed.ts`. Narrow with explicit checks — **no `as` casts**.

### Task 2: Un-watching must not delete an attendance row

**Files:**

- Modify: `apps/api/src/routes/watching.ts` (`PUT /v1/watching/:eventId`, lines 107-179)
- Modify: `apps/api/src/routes/events.ts` (`DELETE /v1/events/:id/watch`, lines 1263-1293)
- Modify: `apps/api/src/routes/watching.integration.test.ts`
- Modify: `apps/api/src/routes/events.test.ts`

**This is the highest-value bug prevented by this PR.** Both un-watch paths currently do a hard `db.delete(userEvents)` (`watching.ts:134`, `events.ts:1289`). Once `attending_at` shares the row, un-watching a show you already committed to would erase the night from your history.

**Interfaces:**

- New shared helper `releaseWatch(userId, eventId)` in `apps/api/src/lib/user-events.ts`:
  - Loads the row's `id` + `attendingAt`.
  - `attendingAt === null` → `DELETE` the row (unchanged behavior, keeps the table from accumulating tombstones).
  - `attendingAt !== null` → `UPDATE ... SET status = null, saved_price = null`.
  - Returns `{ deleted: boolean }` for logging.
- Both routes call it. The watch-**on** paths (`watching.ts:157-168`, `events.ts:1240-1251`) already use `onConflictDoUpdate` with a `set` that touches only `status` + `savedPrice`, so `attending_at` survives untouched — verify with a test, change nothing.

- [ ] **Step 1: Failing integration test**

`apps/api/src/routes/watching.integration.test.ts` — seed a row with `status: 'watching'` and `attendingAt: new Date()`, `PUT /v1/watching/:eventId` to toggle off, assert the row **still exists** with `status === null` and `attendingAt` unchanged. Second test: row with `attendingAt: null` toggles off → row is gone. Third: watch-on over an attending row preserves `attendingAt`.

- [ ] **Step 2: Implement `releaseWatch` and swap both call sites**

- [ ] **Step 3: Mirror the tests for `DELETE /v1/events/:id/watch`**

Note that `events.ts:1276-1286` selects with `eq(userEvents.status, 'watching')` in the predicate — keep that filter (un-watching a non-watched row stays a no-op) but route the mutation through `releaseWatch`.

### Task 3: 90-day purge reads `attending_at`, not `status = 'going'`

**Files:**

- Modify: `apps/api/src/jobs/billing-daily.ts` (`runNinetyDayPurge`, lines 636-722)
- Modify: `apps/api/src/jobs/billing-daily.integration.test.ts`

`billing-daily.ts:694-703` deletes `user_events` where `status = 'going'` as the "concert history (attended)" purge category. After PR-6 that predicate matches zero rows and the GDPR-adjacent purge silently stops working.

**Interfaces:**

- Predicate becomes `and(eq(userEvents.userId, ...), isNotNull(userEvents.attendingAt))`.
- **Do not `DELETE` unconditionally** — a row that is also `status = 'watching'` must survive with `attending_at = NULL`, because Watching is a Free feature that §5.3 explicitly protects (the existing comment at `:643` says "Watching = status 'watching' is NEVER touched").
  - `status IS NULL AND attending_at IS NOT NULL` → `DELETE`.
  - `status = 'watching' AND attending_at IS NOT NULL` → `UPDATE SET attending_at = NULL`.
- `attendedHistory` count in the `data_purged` event = deleted + nulled.

- [ ] **Step 1: Failing test** — three seeded rows (attending-only, attending+watching, watching-only) for a purge-eligible user; assert row 1 gone, row 2 survives with `attendingAt === null` and `status === 'watching'`, row 3 completely untouched, and `counts.attendedHistory === 2`.
- [ ] **Step 2: Implement inside the existing transaction** (`:693`) — keep it atomic with the follows delete and the audit event insert.
- [ ] **Step 3: Update the doc comment at `:641-647`** to describe `attending_at`, not `status 'going'`.

### Task 4: Event merge coalesces `attending_at`

**Files:**

- Modify: `apps/api/src/routes/admin/events.ts` (merge handler, lines 1294-1315)
- Modify: `apps/api/src/routes/admin/events.integration.test.ts`

Today the merge drops conflicting **source** `user_events` rows so the target wins (`:1294-1309`). If the source row carried `attending_at` and the target's didn't, an attended night silently disappears on an admin merge.

**Interfaces:** before the delete, `UPDATE` the target rows to `attending_at = LEAST(target.attending_at, source.attending_at)` where the source has one (earliest commitment wins — it's the honest timestamp for when the user decided). Then delete the source rows as today.

- [ ] **Step 1: Failing test** — user-a has an attending row on the source and a watching-only row on the target; merge; assert the surviving target row has the source's `attendingAt`.
- [ ] **Step 2: Implement the coalesce; extend the existing `userEventsDropped` audit payload with `attendingCoalesced`.**

### Task 5: Seeds + staging generator write `attendingAt`, not `'going'`

**Files:**

- Modify: `packages/db/seed.ts` (13 `status: 'going' | 'interested'` literals across lines 1581-1698)
- Modify: `scripts/seed-staging/generators/user-events.ts` (`STATUSES` const, line 27)
- Modify: `scripts/seed-staging/generators/generators.test.ts` (line 205, "covers all status enum values")

These are the **only** writers of `'going'` / `'interested'` in the tree — application code has never written either.

**Interfaces:**

- `packages/db/seed.ts`: rows that were `'going'` become `{ status: null, attendingAt: <past date> }` for past shows and `{ status: 'watching', attendingAt: <now> }` for a couple of upcoming ones (so local dev exercises both the attending-only and watching+attending shapes). Rows that were `'interested'` become `status: 'watching'` — `'interested'` has no product surface and keeping it alive only breeds confusion.
- `scripts/seed-staging/generators/user-events.ts`: replace the `STATUSES` mix with a deterministic split driven by the existing seeded RNG (`scripts/seed-staging/seeded-rng.ts`) — ~60% watching-only, ~25% watching+attending, ~15% attending-only. Past-dated events must be the ones that get `attendingAt` so the staging History page has content.
- The generator test's "covers all status enum values" assertion is replaced by "covers all three attendance shapes."

- [ ] **Step 1: Update the generator + its test first (the test names the contract).**
- [ ] **Step 2: Update `packages/db/seed.ts`; run `pnpm db:seed` against a fresh local DB and confirm no constraint errors.**

### Task 6: Admin user-detail surfaces attendance

**Files:**

- Modify: `packages/types/src/index.ts` (`AdminUserEventStatus`, `AdminUserTrackedEventItem`, lines 1052-1079)
- Modify: `apps/api/src/routes/admin/users.ts`
- Modify: `apps/web/src/components/admin/users/UserDetailClient.tsx` (status→tone map, line 30)
- Modify: `apps/web/src/components/admin/users/UserDetailClient.test.tsx`

**Interfaces:**

- `AdminUserTrackedEventItem.status` becomes `AdminUserEventStatus | null`.
- Add `attendingAt: string | null` to the same interface.
- `UserDetailClient` renders an "Attending" chip when `attendingAt !== null`, independently of the status chip. A row can now show both. `status === null` renders no status chip (not an empty one).
- The comment at `packages/types/src/index.ts:1069-1071` explaining the "full tracked-event set" naming gets updated — going/interested are legacy.

- [ ] **Step 1: Failing component test for the three shapes.**
- [ ] **Step 2: Widen the type, extend the API select, render the chip.**

### Task 7: Verification pass

- [ ] `pnpm typecheck && pnpm lint && pnpm test` clean at the repo root.
- [ ] Integration suite green against a fresh per-worktree DB (proves the migration applies from zero).
- [ ] `pnpm db:migrate` twice in a row on the same DB — second run is a clean no-op (idempotency).
- [ ] `grep -rn "status, 'going'" apps packages` returns only the legacy-read comment and PR-6's future contract file.

---

## Phase / PR-2 — API: `/v1/attending`, `/v1/history`, `.ics` export

Everything the UI needs, with server-side entitlement enforcement. No UI in this PR.

### Task 1: Shared types

**Files:**

- Modify: `packages/types/src/index.ts`

**Interfaces:**

```ts
// Attendance mutation — PUT/DELETE /v1/attending/:eventId
export interface AttendingToggleResponse {
  going: boolean
  attendingAt: string | null   // ISO, null when released
}

// One attended night — GET /v1/history
export interface HistoryShow {
  eventId: string
  artist: string
  venueName: string
  venueSlug: string
  neighborhood: string | null
  date: string              // YYYY-MM-DD, event local date
  dateLabel: string         // pre-formatted "Mon, Oct 20" — Mountain Time
  showTime: string | null   // pre-formatted "8:00 PM"
  priceFinal: number | null // last observed face price
  genre: string | null      // single word, drives "top genre"
  attendingAt: string       // ISO — non-null by construction on this surface
}

export interface HistoryStats {
  nights: number
  venues: number
  artists: number
  topGenre: string | null
  topVenue: string | null
  first: string | null      // YYYY-MM-DD
  last: string | null
  totalSpent: number | null // null when no row has priceFinal
}

export interface HistoryResponse {
  shows: HistoryShow[]
  stats: HistoryStats
}
```

`HistoryShow` is the handoff's `HistoryShow` (README §Data shape) with the repo's naming applied: `goingMarkedAt` → `attendingAt`, `venue` → `venueName` + `venueSlug`, `dateISO` → `date`. `dateLabel` / `showTime` stay pre-formatted on the row because the handoff treats date formatting as data, not copy (READINESS 🔌 finding).

Also extend the existing `WatchingShow` (line ~1020) with `attendingAt: string | null` — PR-4's nudge needs it to know whether to fire, and PR-3's `past-*` states read it.
Extend `EventDetail` (line ~680, alongside `isWatching`) with `attendingAt: string | null`.

- [ ] **Step 1: Add the types + build `@concert-crawl/types`.**

### Task 2: `attendingRouter` — commit and release attendance

**Files:**

- Create: `apps/api/src/routes/attending.ts`
- Create: `apps/api/src/routes/attending.integration.test.ts`
- Modify: `apps/api/src/routes/index.ts` (mount at `/v1/attending`, alongside line 43)

**Interfaces:**

- `PUT /v1/attending/:eventId` → sets `attending_at = now()` (idempotent — a second PUT does **not** move the timestamp; the first commitment is the honest one). Returns `AttendingToggleResponse`.
- `DELETE /v1/attending/:eventId` → mirror of `releaseWatch`: if `status === null` delete the row, else `UPDATE SET attending_at = null`.
- Both mount `clerkMiddleware()` then `requireFeature('concert-history')` (`apps/api/src/middleware/entitlement.ts:31`). Attendance is the paid write path; the 403 carries `code: 'entitlement_required'` which the client already routes to a paywall.
- `eventId` validated with `z.string().uuid()` (`safeParse`, 400 on failure) — same shape as `watching.ts:10`.
- Event must exist and satisfy `eq(events.hiddenFromConsumer, false)`, else 404 — matching `watching.ts:145`.
- **Reject future-only commitment? No.** A user marks Going *before* the show; that's the whole point. The `date < today` filter lives on the read side.

- [ ] **Step 1: Failing integration tests** — 401 unauthenticated; 403 for a plan the matrix denies (assert on `code`, not the message); 400 on a non-UUID; 404 on a hidden event; happy path creates the row with `status === null`; PUT over an existing watching row keeps `status === 'watching'`; second PUT is idempotent on the timestamp; DELETE on an attending-only row removes it; DELETE on watching+attending nulls only `attending_at`.
- [ ] **Step 2: Implement the router; reuse `apps/api/src/lib/user-events.ts` from PR-1 Task 2.**
- [ ] **Step 3: Mount it and confirm the route list test (if one exists) is updated.**

### Task 3: `GET /v1/history`

**Files:**

- Create: `apps/api/src/routes/history.ts`
- Create: `apps/api/src/lib/history-stats.ts`
- Create: `apps/api/src/lib/history-stats.test.ts`
- Create: `apps/api/src/routes/history.integration.test.ts`
- Modify: `apps/api/src/routes/index.ts`

**Interfaces:**

- `GET /v1/history` → `{ success: true, data: HistoryResponse }`. Behind `requireFeature('concert-history')`.
- Query: join `user_events` → `events` → `venues` where
  - `user_events.user_id = auth.userId`
  - `user_events.attending_at IS NOT NULL`
  - `events.date < (NOW() AT TIME ZONE 'America/Denver')::date` — **Mountain Time**, using the established `sql` pattern from `packages/crawler-core/src/crawl.ts:214`, not `new Date().toISOString().slice(0,10)` (which `watching.ts:48` uses and which is UTC — a real off-by-one for late-evening Denver users; do not copy it here).
  - `events.hidden_from_consumer = false`
  - `events.status <> 'cancelled'` — **this is the plan's answer to [#1212](https://github.com/HartiganHM/concert-crawl/issues/1212)** ("`event_status` has no terminal value, so past shows stay `upcoming`"). History does not need a terminal status: a past date plus not-cancelled is a defensible "this show happened," and it needs no schema change and no backfill of 594 prod rows. A cancelled show a user marked Going for is not a night they attended. Postponed rows stay in (the show usually still happens; the date row that survives is the one that matters).
  - Order: `events.date DESC, events.show_time DESC` (reverse-chrono, per the handoff's bucket list).
- `computeHistoryStats(shows: HistoryShow[]): HistoryStats` in `history-stats.ts` — a pure function, the server-side equivalent of the handoff's `h_stats` (`history-data.jsx:128-160`). Single source of truth for the stat hero and any future summary surface (#85 will import it).
  - `topGenre` / `topVenue`: highest count, ties broken by most recent attendance (deterministic — no `Math.random`, and stable for SSR).
  - `totalSpent`: sum of non-null `priceFinal`; `null` when every row is null (so the UI can hide the tile rather than render `$0`).
- `dateLabel` / `showTime` formatted server-side in Mountain Time via `Intl.DateTimeFormat` with `timeZone: MT_TIME_ZONE` — reuse the constant pattern at `apps/api/src/routes/events.ts:92`.

- [ ] **Step 1: Failing unit tests for `computeHistoryStats`** — empty array → all zeros/nulls; single show; tie-break on genre; `totalSpent` null when all prices null; venue/artist counts are distinct counts, not row counts.
- [ ] **Step 2: Failing integration tests** — 403 for a denied plan; only `attending_at IS NOT NULL` rows appear; a watching-only past show does **not** appear (the Watching-≠-Attending guarantee, asserted at the API boundary); a future attending show does not appear; a cancelled past attending show does not appear; a hidden event does not appear; ordering is reverse-chrono.
- [ ] **Step 3: Implement.**

### Task 4: `GET /v1/history/export.ics`

**Files:**

- Create: `apps/api/src/lib/ics.ts`
- Create: `apps/api/src/lib/ics.test.ts`
- Modify: `apps/api/src/routes/history.ts`

**Answering handoff open question #2 (calendar export format): point-in-time `.ics` download for v1, not a subscribable feed.** A subscribe URL needs an unguessable long-lived token in a URL that calendar clients log and sync unauthenticated — that's a new auth surface for a keepsake feature. A download is a plain authenticated GET. If users ask for live subscribe, it's a follow-up.

**Interfaces:**

- `buildHistoryIcs(shows: HistoryShow[]): string` — RFC 5545. `VCALENDAR` / `VEVENT` per attended night, `UID` = `<eventId>@concertcrawl.app`, `DTSTART;VALUE=DATE` (all-day when `showTime` is null, otherwise a floating local `DTSTART` with `TZID=America/Denver`), `SUMMARY` = artist, `LOCATION` = venue name, `DESCRIPTION` = neighborhood + price when present.
- **Escape `,` `;` `\` and newlines** in every text field, and fold lines at 75 octets. Both are the classic `.ics` correctness bugs — cover them in tests explicitly.
- Route: same `requireFeature` gate, but on `'calendar-export'` (its own matrix key) rather than `'concert-history'`. `Content-Type: text/calendar; charset=utf-8`, `Content-Disposition: attachment; filename="concert-crawl-history.ics"`.

- [ ] **Step 1: Failing unit tests** — a venue named `Larimer Lounge, Denver` escapes the comma; a 200-char artist name folds; all-day vs timed; empty history yields a valid empty `VCALENDAR`.
- [ ] **Step 2: Implement + one integration test asserting headers and the 403 path.**

### Task 5: Expose `attendingAt` on the surfaces the UI already fetches

**Files:**

- Modify: `apps/api/src/routes/events.ts` (event detail select, ~lines 634-660)
- Modify: `apps/api/src/routes/watching.ts` (`GET /v1/watching` select + map, lines 50-101)
- Modify: their respective tests

**Interfaces:**

- Event detail: the existing signed-in `isWatching` lookup (`events.ts:642-654`) already selects the user's row — widen it to `select({ id, status, attendingAt })`, drop the `eq(status, 'watching')` from the `where` (so an attending-only row is found), and derive **both** `isWatching = row?.status === 'watching'` and `attendingAt = row?.attendingAt ?? null`. One query, two answers.
- `GET /v1/watching`: add `attendingAt: userEvents.attendingAt` to the select and `attendingAt: row.attendingAt?.toISOString() ?? null` to the map. The `eq(status,'watching')` filter stays — Watching is still Watching.
- **Do not** change `watchingCount` (`events.ts:634-637`) — it counts watchers and stays that way. An attending count is #1096's job, explicitly out of scope.

- [ ] **Step 1: Failing tests on both routes.**
- [ ] **Step 2: Implement.**

### Task 6: Document the #764 seam

**Files:**

- Modify: `apps/api/src/routes/history.ts` (header comment)

[#764](https://github.com/HartiganHM/concert-crawl/issues/764) (venue first-timer guide) needs to know whether a user has been to a venue before. **The dependency runs #764 → #70**, not the reverse: #764 cannot detect a first-timer until attendance data exists.

Record the contract it will consume, and build nothing for it here:

```
-- #764 first-timer predicate (do not build until #764 opens):
SELECT EXISTS (
  SELECT 1 FROM user_events ue
  JOIN events ev ON ev.id = ue.event_id
  WHERE ue.user_id = $1
    AND ev.venue_id = $2
    AND ue.attending_at IS NOT NULL
    AND ev.date < (NOW() AT TIME ZONE 'America/Denver')::date
)
```

`user_events_user_attending_idx` (PR-1 Task 1) keeps the `user_id` + `attending_at IS NOT NULL` half index-backed; the `venue_id` narrowing rides the existing `events` PK join. No new index is needed for #764.

- [ ] **Step 1: Add the comment. That is the whole task.**

---

## Phase / PR-3 — "I'm going!" CTA + stub stamp on Event Detail

The commitment surface. Mobile and desktop in the same PR — the handoff's `<EventDetailCTABlock>` is one component with a `variant` prop, and Event Detail is a single responsive page (`apps/web/src/app/(protected)/(main)/events/[id]/page.tsx`), so parity is structural rather than duplicated.

### Task 1: Deterministic stamp identity

**Files:**

- Create: `apps/web/src/components/consumer/going/lib/stamp.ts`
- Create: `apps/web/src/components/consumer/going/lib/stamp.test.ts`

**Interfaces:**

```ts
export type StampGlyph = 'star' | 'diamond' | 'ring' | 'triangle'
export const stampAccentFor = (artist: string): string   // one of 7 brand hexes
export const stampGlyphFor = (artist: string): StampGlyph
export const stampRotationFor = (eventId: string): number // deterministic ±4deg
```

The handoff uses FNV-1a for the accent and djb2 for the glyph (`history-data.jsx:191-208`) specifically so the two vary independently. The shipped `ia_hashName(name, namespace)` (`apps/web/src/components/consumer/identity-art/IdentityArt.tsx:48-56`) **is** FNV-1a with a namespace prefix — use it for both, with namespaces `'stamp-accent'` and `'stamp-glyph'`. Same independence, one hash implementation, no second algorithm to maintain. Note the substitution in a comment so a future reader diffing against the handoff isn't confused.

The 7-colour brand set (`#7AE6FF / #FF7BD4 / #FFE36B / #A075FF / #C9F26E / #FFB838 / #5DD4D6`) is the one place hex is allowed on an in-app surface, because it is *identity data* — the same exception `IA_PALETTES` (`IdentityArt.tsx:85`) already takes. Keep the array in `stamp.ts`, not in a component.

- [ ] **Step 1: Failing tests** — same artist → same accent and glyph across calls; different artists distribute across all 7 accents and all 4 glyphs over a fixed 200-name fixture; accent and glyph are not correlated (a name that maps to accent index 0 does not always map to glyph index 0); rotation is stable per `eventId` and within ±4.
- [ ] **Step 2: Implement.**

### Task 2: `<StubStamp>`

**Files:**

- Create: `apps/web/src/components/consumer/going/StubStamp.tsx`
- Create: `apps/web/src/components/consumer/going/StubStamp.test.tsx`

**Interfaces:** `<StubStamp artist={string} size={number} accent?={string} glyph?={StampGlyph} />` — ticket-stub silhouette with a perforation edge and a centred glyph, per `history-screens.jsx:71-117`. Sizes used across the app: 24/28/32 (History rows), 28/32/38 (inside the Going button), 36 (empty-state badge), 32 (Passport teaser). Pure SVG, no state, `aria-hidden` by default with an optional `aria-label` escape hatch — the stamp is decoration everywhere it appears; the surrounding text carries the meaning.

- [ ] **Step 1: Failing tests** — renders at the passed size; accent/glyph derive from the artist when not overridden; `aria-hidden` by default.
- [ ] **Step 2: Implement from `history-screens.jsx:71-117`.**

### Task 3: `GOING_COPY` definitions

**Files:**

- Create: `apps/web/src/components/consumer/going/definitions/copy.ts`

**Interfaces:** verbatim from the handoff (README §Voice + `going-cta.jsx`):

```ts
export const GOING_COPY = {
  button: {
    default: "I'm going!",
    going: 'Going',
    pastYes: (date: string) => `You went · ${date}`,
    pastNo: "Didn't make it",
    ariaGoing: 'Going to this show',
    ariaNotGoing: 'Mark that you are going to this show',
    stateChangeGoing: 'Marked as going',      // role="status" announcement
    stateChangeReleased: 'No longer going',
  },
  support: {
    default: 'Going saves the night · Watch tracks the price.',
    going: "We'll add this to your history.",
  },
  error: {
    failed: "Couldn't save that. Try again.",  // READINESS 🎭 flag — no error state was drawn
  },
  nudge: { /* PR-4 */ },
} as const
```

The error string closes the READINESS "no error state drawn" gap at the mutation layer, as that finding anticipated.

- [ ] **Step 1: Write the file. Cross-check every string against the handoff character-for-character, including the exclamation mark and the middle dots.**

### Task 4: `useAttendingToggle`

**Files:**

- Create: `apps/web/src/lib/queries/use-attending-toggle.ts`
- Create: `apps/web/src/lib/queries/use-attending-toggle.test.tsx`

**Interfaces:** mirror `apps/web/src/lib/queries/use-watch-toggle.ts` exactly — same `apiClient` usage, same optimistic-update-then-invalidate shape. `mutate({ eventId, going: boolean })` → `PUT` or `DELETE /v1/attending/:eventId`. Invalidates the `history` and `watching` query keys plus the event detail key. A 403 with `code: 'entitlement_required'` surfaces as a locked-state signal, not a generic error (the existing `use-entitlement` + `TierPickerEntry` path handles the routing).

- [ ] **Step 1: Failing test** — PUT on `going: true`, DELETE on `going: false`, rollback on error, 403 exposes the entitlement code.
- [ ] **Step 2: Implement.**

### Task 5: `<GoingButton>`

**Files:**

- Create: `apps/web/src/components/consumer/going/GoingButton.tsx`
- Create: `apps/web/src/components/consumer/going/GoingButton.test.tsx`

**Interfaces:** `<GoingButton show={{ eventId, artist, date }} state={'default'|'going'|'past-yes'|'past-no'} size={'sm'|'md'|'lg'} fullWidth?={boolean} onChange={(going: boolean) => void} />`, from `going-cta.jsx:77-182`.

- Ticket-stub shape; on `going` the stub fills with the artist's accent and the glyph snaps into the centre so the button visually *is* the stamp it becomes in History.
- `past-yes` / `past-no` are **disabled, read-only displays** (`cursor: default`), not affordances. The retroactive "I went, actually" toggle is out of v1 (see Out of scope).
- `aria-pressed` reflects `state === 'going'`. A visually-hidden `role="status"` region announces `stateChangeGoing` / `stateChangeReleased` on transition — READINESS Open observation 4.
- Minimum 44px tap target at every size (the handoff's `sm` is 36px tall; pad the hit area, don't shrink the target).
- Colors: `var(--signal)` for the forward action, the artist accent for the filled stamp. Never a verb on `var(--danger)`.
- Pending state disables the button and dims to 0.6 opacity — same treatment as `WatchShowButton.tsx:245`.

- [ ] **Step 1: Failing tests** — all four states render their copy; `going` sets `aria-pressed`; `past-*` are disabled and don't call `onChange`; the status region announces on transition; disabled during pending.
- [ ] **Step 2: Implement.**

### Task 6: `<EventDetailCtaBlock>` + wire into Event Detail

**Files:**

- Create: `apps/web/src/components/consumer/going/EventDetailCtaBlock.tsx`
- Create: `apps/web/src/components/consumer/going/EventDetailCtaBlock.test.tsx`
- Create: `apps/web/src/components/consumer/going/index.ts`
- Modify: `apps/web/src/app/(protected)/(main)/events/[id]/page.tsx` (the watch strip, lines 173-180)

**Interfaces:**

- `<EventDetailCtaBlock event={EventDetail} />` — one row: `<GoingButton fullWidth size="lg">` filling the available width, then the existing `<WatchShowButton>` (the eye) to its right. One mono support line beneath, switching between `GOING_COPY.support.default` and `.going`.
- **The eye does not change.** `WatchShowButton` ships today at `watch-show-button/WatchShowButton.tsx` with the exact affordance the handoff's `<WatchingEye>` mirrors (READINESS §Codebase fit: "we re-use that exact affordance here"). Do not reimplement it, do not restyle it, do not port `<WatchingPill>`.
- State derivation, all from the `EventDetail` payload PR-2 Task 5 added:
  - `date >= today (MT)` and `attendingAt === null` → `default`
  - `date >= today (MT)` and `attendingAt !== null` → `going`
  - `date < today (MT)` and `attendingAt !== null` → `past-yes` (label formats `attendingAt`… **no** — formats the *show* date; "You went · Oct 14, 2026" is the night, not the tap)
  - `date < today (MT)` and `attendingAt === null` → `past-no`
  - `events.status === 'cancelled'` → render nothing (a cancelled show has no night to commit to). Matches the API's history filter.
- Entitlement: `useEntitlement('concert-history')`. When `active === false`, the button still renders (it's the discovery surface for the perk) and a tap routes by `surface` — `'paywall-on-tap'` opens the paywall, `'tier-picker-on-tap'` opens the tier picker, via the shipped `TierPickerEntry` path. Hold rendering while `isLoading` rather than flashing a locked treatment (the documented contract at `use-entitlement.ts:17-19`).
- Mount replaces the bare `<WatchShowButton>` block at `page.tsx:173-180`; the `watchingCount` prop keeps flowing through to the eye.

- [ ] **Step 1: Failing tests** — the four states derive correctly across the date/attendingAt matrix; cancelled renders nothing; a locked plan routes the tap instead of mutating; loading holds; the eye is still present in every state.
- [ ] **Step 2: Implement + mount.**
- [ ] **Step 3: Manual check at 320px** — Going (full width) plus a 44px eye must not overflow. This app has a documented history of container-overflow regressions; if the row bleeds, invoke the `css-layout-triage` skill (a Claude Code agent skill, `/css-layout-triage` — not an in-repo script) rather than guessing at container properties. Working without it: instrument the DOM to find the actual overflowing node before changing any container property. One failed fix is the signal to stop guessing.

---

## Phase / PR-4 — Watching nudge (7-day window)

One banner, one ask, three exits, never again. "Asking before is honest, asking after is interrogation."

### Task 1: Nudge window predicate + dismissal persistence

**Files:**

- Create: `apps/web/src/lib/going/nudge-window.ts`
- Create: `apps/web/src/lib/going/nudge-window.test.ts`
- Create: `apps/web/src/lib/going/nudge-dismissal.ts`
- Create: `apps/web/src/lib/going/nudge-dismissal.test.ts`

**Interfaces:**

- `isInNudgeWindow(show: WatchingShow, now?: Date): boolean` — `daysUntil >= 0 && daysUntil <= 7 && show.attendingAt === null`. Day math in Mountain Time via `DENVER_TIME_ZONE` from `apps/web/src/lib/time.ts:2`. Port of `h_isInNudgeWindow` (`history-data.jsx:115-120`).
- `daysUntilLabel(show, now?): string` — `"Tonight."` / `"Tomorrow."` / `"In 4 days."`. The special-cases are a deliberate detail in the handoff (READINESS Open observation 3) and must survive copy externalization, so they live here as a formatter and the copy file supplies the templates.
- Dismissal — **answering handoff open question #1: localStorage for v1, no user-record sync.** Key `cc-nudge-dismissed`, value `Record<eventId, 'going' | 'declined' | 'dismissed'>`. Model the module on the shipped `apps/web/src/lib/pwa/post-watch-dismissal.ts` (same read/write/guard shape).
  - `readNudgeState(eventId): NudgeOutcome | null`, `markNudge(eventId, outcome): void`.
  - **Zod `safeParse` the parsed JSON** — `localStorage` is an untrusted boundary; a malformed blob must degrade to "no dismissals," never throw and never get `as`-cast.
  - Cross-device re-ask once per device is the accepted v1 cost, exactly as the handoff proposes.

- [ ] **Step 1: Failing tests** — boundary days 0/7/8; already-attending suppresses; the three labels; malformed localStorage returns empty; a dismissed id stays dismissed across reads; a quota-exceeded write doesn't throw.
- [ ] **Step 2: Implement.**

### Task 2: `<GoingNudge>`

**Files:**

- Create: `apps/web/src/components/consumer/going/GoingNudge.tsx`
- Create: `apps/web/src/components/consumer/going/GoingNudge.test.tsx`
- Modify: `apps/web/src/components/consumer/going/definitions/copy.ts` (fill the `nudge` block)

**Interfaces:**

- `<GoingNudge show={WatchingShow} onYes onDecline onDismiss />`, from `going-cta.jsx:236-306`.
- Copy verbatim: `"Still going?"` + the days label, `"Mark it so it lands in your history."`, actions `Yes` / `Not me` / `×`.
- **`aria-live="polite"` on the banner** — it appears passively when a show crosses into the window and a screen reader would otherwise miss it entirely (READINESS ♿ flag).
- The `×` gets `aria-label="Dismiss"` and a 44px hit area. All three actions are real `<button>` elements.
- All three outcomes call `markNudge` — the banner never re-fires for that show.

- [ ] **Step 1: Failing tests** — renders copy for each day label; each of the three buttons fires its callback and persists the right outcome; `aria-live` present; keyboard reachable in DOM order Yes → Not me → Dismiss.
- [ ] **Step 2: Implement.**

### Task 3: Mount under the Watching row — mobile and desktop

**Files:**

- Modify: `apps/web/src/components/consumer/watching/WatchingItem.tsx`
- Modify: `apps/web/src/components/consumer/watching/WatchingItem.test.tsx`

**Interfaces:**

- `WatchingItem` renders `<GoingNudge>` beneath its row when `isInNudgeWindow(show)` **and** `readNudgeState(show.eventId) === null`. Per `going-cta.jsx:443` (`<WatchingRowWithNudge>`) the nudge is attached to the row, not floated.
- `onYes` calls `useAttendingToggle().mutate({ eventId, going: true })` (PR-3 Task 4) and marks `'going'`.
- The nudge is inside the row component, so it appears identically in the mobile list and the desktop list — parity is structural, not duplicated. Verify at both breakpoints anyway.
- Hydration: `readNudgeState` touches `localStorage`, so gate the render behind a mounted flag to avoid an SSR/client mismatch. `WatchingContent` is already `'use client'` (`WatchingContent.tsx:1`) but the page server-renders `initialShows` (`watching/page.tsx:12`).

- [ ] **Step 1: Failing tests** — nudge shows in-window, hides out-of-window, hides when already dismissed, hides when `attendingAt` is set; Yes fires the mutation.
- [ ] **Step 2: Implement; check for hydration warnings in the dev console.**

---

## Phase / PR-5 — "My shows" destination + History route + Passport teaser

The landing. Renames the top-level destination, adds the sub-tabs, ships all three route states plus the teaser.

### Task 1: Rename the destination to **My shows**

**Files:**

- Modify: `apps/web/src/components/consumer/definitions/copy.ts` (`appHeader.nav.tabs[2]` line 603; `bottomNav.nav.tabs[2]` line 625)
- Modify: `apps/web/src/components/consumer/app-header/AppHeader.test.tsx`
- Modify: `apps/web/src/components/consumer/bottom-nav/BottomNav.tsx` (active-state matching)

**Interfaces:**

- Desktop label `Watching` → `My shows`; mobile label `watching` → `my shows`. Both hrefs stay `/watching` — **no route rename, no redirect** — because `/watching` remains the default landing tab and renaming the URL would break every existing link, bookmark, and the `usePathname().startsWith(tab.href)` active check.
- `BottomNav` active state must light for both `/watching` and `/history`. Change the check for that tab from `pathname.startsWith(tab.href)` to a per-tab `matchPrefixes: readonly string[]` in the copy tab objects. Same for `AppHeader`.
- **The vocabulary lock is untouched.** "Watching" is still the name of the Watching list and the sub-tab; "My shows" is the container the handoff introduces specifically to avoid a *Watching > Watching > History* redundancy (handoff README §3). Nothing here renames Watching, and nothing introduces "Saved."

- [ ] **Step 1: Failing tests** — nav renders "My shows"; the tab is active on `/watching` **and** `/history`.
- [ ] **Step 2: Implement.**

### Task 2: `<MyShowsTabs>`

**Files:**

- Create: `apps/web/src/components/consumer/history/MyShowsTabs.tsx`
- Create: `apps/web/src/components/consumer/history/MyShowsTabs.test.tsx`
- Modify: `apps/web/src/components/consumer/watching/WatchingContent.tsx` (mount above the headline block, line ~151)

**Interfaces:** `<MyShowsTabs active={'watching' | 'history'} />` — two `next/link` tabs (`/watching`, `/history`) styled per `history-screens.jsx:329` (mobile) and `history-routes.jsx:406` (desktop `DesktopSubTabs`). One component, responsive — not two. `role="tablist"` with `aria-current="page"` on the active link (they're navigations, so links with `aria-current`, not `role="tab"` buttons with panels).

- [ ] **Step 1: Failing tests** — both tabs render; active carries `aria-current`; each links to the right href.
- [ ] **Step 2: Implement; mount in both `WatchingContent` and (Task 5) `HistoryContent`.**

### Task 3: History copy + row/header components

**Files:**

- Create: `apps/web/src/components/consumer/history/definitions/copy.ts`
- Create: `apps/web/src/components/consumer/history/HistoryItem.tsx`
- Create: `apps/web/src/components/consumer/history/HistoryItem.test.tsx`
- Create: `apps/web/src/components/consumer/history/HistoryHeader.tsx`
- Create: `apps/web/src/components/consumer/history/HistoryHeader.test.tsx`

**Interfaces:**

- `HISTORY_COPY` — verbatim strings: eyebrow `HISTORY`, empty headline `"Nothing's behind you yet."`, locked headline `"Keep the nights."`, locked footer `"Free tier keeps everything else. No paywalls in the way of seeing shows."`, stat tile labels (`nights` / `venues` / `artists` / `top genre` / `top venue` / `spent`), calendar row label, teaser label `"See your Passport →"`.
- `<HistoryItem show={HistoryShow} density={'compact'|'cozy'|'roomy'} />` — from `history-screens.jsx:119-187`. Left `<StubStamp>` (PR-3 Task 2) sized by density (24/28/32), artist + venue + neighborhood, right-aligned date and price. **No remove affordance** — past attendance isn't editable in v1 (handoff §Deliberate exclusions).
- `<HistoryHeader stats={HistoryStats} />` — the stat hero, `history-screens.jsx:216-259`. Tiles hide (not zero out) when their value is null.
- Reverse-chrono month buckets: reuse the bucket-grouping shape from `WatchingContent.tsx:91-104` rather than porting `h_groupBuckets` — the shipped grouper already handles the month/year label case and is tested.

- [ ] **Step 1: Failing tests per component**, including all three densities and the null-stat hiding.
- [ ] **Step 2: Implement.**

### Task 4: Locked, empty, and calendar/teaser rows

**Files:**

- Create: `apps/web/src/components/consumer/history/HistoryLocked.tsx`
- Create: `apps/web/src/components/consumer/history/HistoryLocked.test.tsx`
- Create: `apps/web/src/components/consumer/history/HistoryEmpty.tsx`
- Create: `apps/web/src/components/consumer/history/SaveCalendarRow.tsx`
- Create: `apps/web/src/components/consumer/history/PassportTeaser.tsx`
- Create: `apps/web/src/components/consumer/history/PassportTeaser.test.tsx`

**Interfaces:**

- `<HistoryLocked />` — route-level takeover per `history-routes.jsx:135-221`. **It is not a modal**: no dismiss, no focus trap, no modal chrome (READINESS ♿ flag — confirm by structure, don't build a dialog). The perk list **must be sourced from the canonical monetization definitions**, not re-declared inline the way `history-routes.jsx:184-195` does — that inline list is the exact drift class Copilot caught on #820, and READINESS flags it explicitly. Locate the shipped canonical list under `apps/web/src/components/consumer/multi-tier/` or `tier-picker/` and import it; if no canonical export exists, add one there and consume it from both places in this PR.
- CTA colors: `var(--signal)` for "Become a Supporter" / "Browse tonight's shows"; `var(--accent)` only for the tier brand-presence chip.
- **Free-tier stat preview — answering handoff open question #4: v1 hides everything.** No blurred `?? nights`. The handoff's default, and the honest one. A/B is a post-launch question.
- `<HistoryEmpty />` — `history-routes.jsx:57-93`, headline `"Nothing's behind you yet."`, 36px `<StubStamp>` badge, CTA to `/events`.
- `<SaveCalendarRow count={number} />` — downloads `GET /v1/history/export.ics` with the Clerk bearer token via the shipped `apiClient`, then triggers a blob download. Disabled with an explanatory label when `count === 0`. Gated on `useEntitlement('calendar-export')`.
- `<PassportTeaser stats={HistoryStats} />` — a small link, `history-routes.jsx:300-351`. **This is the entire Passport scope in this build.** It renders the stat strip plus a `next/link` to the Passport surface owned by [#85](https://github.com/HartiganHM/concert-crawl/issues/85). #85 has no route yet, so v1 renders the teaser with the link pointing at a placeholder route only when a `PASSPORT_ROUTE` constant is set, and renders the strip **without** a link otherwise — never a dead `href`. Decorative stamps stay `aria-hidden` (`history-routes.jsx:330`). Do **not** build `<PassportCard>`, `<PassportInner>`, `<PassportStamp>`, `<PassportStat>`, the 320×500 compact card, the 1080×1080 share card, or any `html-to-image` rasterization.

- [ ] **Step 1: Failing tests** — locked renders takeover semantics and sources its perk list from the canonical export (assert against the imported constant, so a future divergence fails the test); empty renders the headline + CTA; teaser renders no anchor when no route is configured; calendar row disabled at zero.
- [ ] **Step 2: Implement.**

### Task 5: `/history` route + `<HistoryContent>`

**Files:**

- Create: `apps/web/src/app/(protected)/(main)/history/page.tsx`
- Create: `apps/web/src/app/(protected)/(main)/history/loading.tsx`
- Create: `apps/web/src/components/consumer/history/HistoryContent.tsx`
- Create: `apps/web/src/components/consumer/history/HistoryContent.test.tsx`
- Create: `apps/web/src/components/consumer/history/index.ts`
- Create: `apps/web/src/lib/history.ts` (`fetchHistory(token)`)
- Create: `apps/web/src/lib/queries/use-history.ts`

**Interfaces:**

- `page.tsx` mirrors `watching/page.tsx:1-15` exactly: server component, `auth()` → `getToken()` → `fetchHistory(token)` → pass as `initialData`. `loading.tsx` mirrors the shipped `watching/loading.tsx`.
- A 403 from `/v1/history` is **not an error** — it's the locked state. `fetchHistory` must distinguish `entitlement_required` from a real failure and let the page render `<HistoryLocked>`. Client-side `useEntitlement('concert-history')` decides what to paint; the 403 is the server's belt-and-braces.
- `<HistoryContent initialData={HistoryResponse | null} locked={boolean} />` — the route-state switch from `history-routes.jsx:242-298`:
  - `locked` → `<HistoryLocked>`
  - `shows.length === 0` → `<HistoryEmpty>`
  - otherwise → `<MyShowsTabs active="history">` → `<HistoryHeader>` → bucketed `<HistoryItem>` list → `<SaveCalendarRow>` → `<PassportTeaser>`
- **Desktop parity**: `history-routes.jsx:447-502` (`<HistoryRouteDesktop>`) is a 2-column layout with a sticky right rail holding the calendar row and the teaser. Implement as responsive Tailwind on the same component (`lg:grid lg:grid-cols-[1fr_320px]`), not a second component — the handoff splits them only for canvas storyboarding, and READINESS Open observation 2 says to route these through real props, not designer knobs.
- The handoff's `themeKey` / `density` props are **not** ported. Theme comes from the shipped theme context; density is fixed at `cozy` to match the Watching list (`WatchingContent.tsx:236`).

- [ ] **Step 1: Failing tests** — all three route states; the desktop rail renders at `lg`; the mobile stack renders below; `initialData` seeds the query without a flash of empty.
- [ ] **Step 2: Implement.**
- [ ] **Step 3: Manual sweep** — all 9 themes at 320px, 768px, 1280px. No hardcoded hex outside `stamp.ts`. No horizontal overflow.

### Task 6: Release notes + progress row

**Files:**

- Modify: `apps/web/src/lib/definitions/releases.ts`
- Modify: `docs/superpowers/progress.md`

**Interfaces:**

- One `RELEASES[0]` entry, `kind: 'added'`, in Hugh's voice — casual, honest, one idea. It must say what History *is* (the nights you went) and what it *isn't* (not your Watching list). No spotlight asset exists for this feature, so no `spotlight` block.
- One ✅ Complete row in `progress.md` dated `2026-07-27` (or the actual merge date), covering the whole #70 feature — not one row per PR.

- [ ] **Step 1: Write both. Read the two entries above the new one first and match their register.**

---

## Phase / PR-6 — Contract: retire `status = 'going'` from the data

The only irreversible step. Gated on prod verification.

### Task 1: Verify the backfill in prod BEFORE writing the migration

- [ ] **Step 1: Count the legacy rows in prod.**

Using `NEON_PROD_DIRECT`:

```sql
SELECT
  count(*) FILTER (WHERE status = 'going')                             AS going_rows,
  count(*) FILTER (WHERE status = 'going' AND attending_at IS NULL)    AS unbackfilled,
  count(*) FILTER (WHERE status = 'interested')                        AS interested_rows
FROM user_events;
```

**Expected: `unbackfilled = 0`.** Grounded expectation on `going_rows` itself: **zero, or near it.** No application code has ever written `'going'` or `'interested'` — the only writers in the tree are `packages/db/seed.ts` (local) and `scripts/seed-staging/` (staging). If prod returns a non-zero `going_rows`, **stop and investigate before proceeding**: it means a writer exists that this plan's grep did not find, and the whole locked-decision-#2 premise needs re-checking.

- [ ] **Step 2: Repeat against staging.** Staging *will* have seeded `'going'` rows; confirm `unbackfilled = 0` there too, which is the real proof PR-1's backfill ran.

### Task 2: Migration `0065_user_events_retire_going_status.sql`

**Files:**

- Create: `packages/db/migrations/0065_user_events_retire_going_status.sql`
- Modify: `packages/db/migrations/meta/_journal.json` (`when` greater than `0064`'s)

**Interfaces:**

```sql
-- Contract half of the attending_at expand (#70, migration 0064).
-- Safe only because 0064 backfilled attending_at from created_at for every
-- status='going' row, and no application code has written 'going' since.
UPDATE "user_events"
  SET "attending_at" = COALESCE("attending_at", "created_at")
  WHERE "status" = 'going' AND "attending_at" IS NULL;

UPDATE "user_events" SET "status" = NULL WHERE "status" = 'going';
```

The re-backfill on the first statement is deliberate belt-and-braces: it makes the file safe even if a row slipped in between 0064 and now, so the second statement can never destroy an unrecorded attendance.

**The `'going'` value stays in the `user_event_status` Postgres enum.** Removing an enum value requires recreating the type and rewriting every dependent column — a destructive operation for zero benefit. The value simply becomes unreachable. Record this in the migration header so nobody files it as unfinished work.

- [ ] **Step 1: Write the migration + journal entry.**
- [ ] **Step 2: Apply locally against a DB seeded with legacy `'going'` rows; confirm every one lands with a non-null `attending_at` and a null `status`.**

### Task 3: Regression guard

**Files:**

- Create: `apps/api/src/routes/attending.contract.test.ts`

**Interfaces:** a test that asserts no shipped writer can produce `status = 'going'`:

- Exercise every attendance and watch endpoint against a seeded DB, then assert `SELECT count(*) FROM user_events WHERE status = 'going'` is `0`.
- A static half: read `packages/db/seed.ts` and `scripts/seed-staging/generators/user-events.ts` and assert neither source contains the literal `'going'`. Crude, but it catches the copy-paste that reintroduces it, which is the actual failure mode.

- [ ] **Step 1: Write it; confirm it fails if you temporarily reintroduce a `'going'` write.**

### Task 4: Post-deploy verification

- [ ] Re-run the Task 1 count against prod after the deploy: `going_rows = 0`.
- [ ] Confirm `runNinetyDayPurge` (PR-1 Task 3) still finds attendance rows — check the next `billing-daily` run's `data_purged` event shape in logs, or force one against staging.

---

## Files

**`packages/db`**

- Create: `packages/db/migrations/0064_user_events_attending_at.sql`
- Create: `packages/db/migrations/0065_user_events_retire_going_status.sql`
- Modify: `packages/db/migrations/meta/_journal.json`
- Modify: `packages/db/src/schema/social.ts` — `attendingAt`, nullable `status`, `user_events_user_attending_idx`
- Modify: `packages/db/seed.ts`

**`packages/types` / `packages/entitlements`**

- Modify: `packages/types/src/index.ts` — `AttendingToggleResponse`, `HistoryShow`, `HistoryStats`, `HistoryResponse`; `attendingAt` on `WatchingShow` + `EventDetail`; nullable `AdminUserTrackedEventItem.status` + `attendingAt`
- Modify (pending the decision gate): `packages/entitlements/src/index.ts` + `index.test.ts` — `concert-history` / `calendar-export` supporter cell

**`apps/api`**

- Create: `apps/api/src/lib/user-events.ts` (`releaseWatch`)
- Create: `apps/api/src/lib/history-stats.ts` + test
- Create: `apps/api/src/lib/ics.ts` + test
- Create: `apps/api/src/routes/attending.ts` + integration test + contract test
- Create: `apps/api/src/routes/history.ts` + integration test
- Modify: `apps/api/src/routes/index.ts` — mount `/v1/attending`, `/v1/history`
- Modify: `apps/api/src/routes/watching.ts` — `releaseWatch`, `attendingAt` in the list payload
- Modify: `apps/api/src/routes/events.ts` — `releaseWatch`, `attendingAt` on detail
- Modify: `apps/api/src/routes/admin/events.ts` — merge coalesce
- Modify: `apps/api/src/routes/admin/users.ts` — attendance in tracked events
- Modify: `apps/api/src/jobs/billing-daily.ts` — purge by `attending_at`

**`apps/web` — going**

- Create: `apps/web/src/components/consumer/going/{StubStamp,GoingButton,GoingNudge,EventDetailCtaBlock}.tsx` + tests + `index.ts`
- Create: `apps/web/src/components/consumer/going/lib/stamp.ts` + test
- Create: `apps/web/src/components/consumer/going/definitions/copy.ts`
- Create: `apps/web/src/lib/going/{nudge-window,nudge-dismissal}.ts` + tests
- Create: `apps/web/src/lib/queries/use-attending-toggle.ts` + test
- Modify: `apps/web/src/app/(protected)/(main)/events/[id]/page.tsx`
- Modify: `apps/web/src/components/consumer/watching/WatchingItem.tsx` + test

**`apps/web` — history**

- Create: `apps/web/src/app/(protected)/(main)/history/{page,loading}.tsx`
- Create: `apps/web/src/components/consumer/history/{HistoryContent,HistoryItem,HistoryHeader,HistoryEmpty,HistoryLocked,MyShowsTabs,SaveCalendarRow,PassportTeaser}.tsx` + tests + `index.ts`
- Create: `apps/web/src/components/consumer/history/definitions/copy.ts`
- Create: `apps/web/src/lib/history.ts`, `apps/web/src/lib/queries/use-history.ts`
- Modify: `apps/web/src/components/consumer/definitions/copy.ts` — **My shows** nav labels + `matchPrefixes`
- Modify: `apps/web/src/components/consumer/{app-header/AppHeader,bottom-nav/BottomNav}.tsx` + tests
- Modify: `apps/web/src/components/consumer/watching/WatchingContent.tsx` — mount `<MyShowsTabs>`
- Modify: `apps/web/src/lib/definitions/releases.ts`
- Modify: `apps/web/src/components/admin/users/UserDetailClient.tsx` + test

**Scripts / docs**

- Modify: `scripts/seed-staging/generators/user-events.ts` + `generators.test.ts`
- Modify: `docs/superpowers/progress.md`

---

## Tests

**Unit (Vitest)**

- `stamp.ts` — determinism, distribution across all 7 accents and 4 glyphs, accent/glyph independence, rotation bounds.
- `history-stats.ts` — empty, single, tie-break by recency, distinct counts, `totalSpent` null when all prices null.
- `ics.ts` — comma/semicolon/backslash/newline escaping, 75-octet line folding, all-day vs timed, empty calendar.
- `nudge-window.ts` — day boundaries 0/7/8 in Mountain Time, suppression when already attending, `Tonight.` / `Tomorrow.` / `In N days.`
- `nudge-dismissal.ts` — malformed JSON degrades to empty (Zod `safeParse`), quota-exceeded write doesn't throw, outcomes persist.
- Components — `StubStamp`, `GoingButton` (four states, `aria-pressed`, `role="status"`, disabled past states), `GoingNudge` (three exits, `aria-live`), `EventDetailCtaBlock` (state matrix, cancelled renders nothing, locked routes the tap), `HistoryItem` (three densities), `HistoryHeader` (null tiles hidden), `HistoryLocked` (perk list sourced from the canonical export), `HistoryEmpty`, `PassportTeaser` (no dead href), `MyShowsTabs`, `HistoryContent` (three route states + desktop rail).

**Integration (Vitest + Postgres)**

- **The data-safety trio, and the reason PR-1 exists:** un-watching an attending row preserves `attending_at`; watch-on over an attending row preserves it; releasing attendance on a watching row preserves `status = 'watching'`.
- `/v1/attending` — 401 / 403-with-code / 400 / 404 / create / idempotent re-PUT / delete-vs-null.
- `/v1/history` — entitlement gate; only `attending_at IS NOT NULL`; **a watching-only past show is absent** (the Watching-≠-Attending guarantee asserted at the API boundary); future shows absent; cancelled absent; hidden absent; reverse-chrono order; Mountain-Time date boundary (a show yesterday-in-Denver at 23:00 UTC-today).
- `/v1/history/export.ics` — headers, `calendar-export` gate.
- `billing-daily` purge — attending-only deleted, attending+watching nulled, watching-only untouched, counts correct.
- Admin merge — `attending_at` coalesces to the earliest before the source row is dropped.
- Contract guard — no endpoint produces `status = 'going'`.

**Manual (staging, before each PR merges)**

- PR-3: Event Detail on iOS Safari at 320px — Going + eye fit; tap Going; reload; state persists; support line switches.
- PR-4: a watched show 4 days out shows the nudge; Yes commits and the nudge never returns; hard-refresh confirms; VoiceOver announces the banner.
- PR-5: locked (Free), empty (entitled, no history), populated (staging seeder data) across all 9 themes at 320/768/1280. `.ics` downloads and imports cleanly into Apple Calendar and Google Calendar.
- PR-6: prod count queries before and after.

---

## Out of scope

- **The Passport card itself** — `<PassportCard>`, `<PassportInner>`, `<PassportStamp>`, `<PassportStat>`, the 320×500 compact and 1080×1080 share renders, `html-to-image` rasterization, OG image generation, download path. Owned by [#72](https://github.com/HartiganHM/concert-crawl/issues/72) / [#85](https://github.com/HartiganHM/concert-crawl/issues/85). This build ships the teaser link only (locked decision #4). Handoff open question #5 (DOM→PNG vs SVG) is #72's to answer.
- **Retroactive "I went, actually"** (`<GoingPostShowState>`, `going-cta.jsx:184`) — deferred to a quiet settings micro-action. `past-yes` / `past-no` ship as read-only displays. File a follow-up issue when PR-3 merges.
- **Going on Browse rows** — explicitly rejected in the handoff. Browse stays eye-only.
- **Editing or removing past attendance** — no remove affordance in `<HistoryItem>`; not editable in v1.
- **"N going" social display on Event Detail** — [#1096](https://github.com/HartiganHM/concert-crawl/issues/1096), blocked on this ticket shipping. `watchingCount` is not touched here.
- **Venue first-timer detection** — [#764](https://github.com/HartiganHM/concert-crawl/issues/764). Depends on this ticket; the query contract is documented in PR-2 Task 6 and the index that serves it ships in PR-1, but nothing is built for it.
- **Subscribable `.ics` feed URL** — v1 is a point-in-time download (PR-2 Task 4).
- **Cross-device nudge-dismissal sync** — v1 is `localStorage`; re-asking once per device is accepted (handoff open question #1).
- **Free-tier blurred stat preview** — v1 hides everything (handoff open question #4).
- **A terminal `event_status` value** — [#1212](https://github.com/HartiganHM/concert-crawl/issues/1212) is answered for *this* feature by `date < today (MT) AND status <> 'cancelled'`; the broader schema question stays open and unblocked.
- **Removing `'going'` / `'interested'` from the `user_event_status` Postgres enum** — unreachable values are free; recreating the type is not.
- **Threading, comments, watchparty invites, public history** — History is a solo keepsake.

---

## Next

Start at PR-1 Task 1. Before writing the migration, re-run `ls packages/db/migrations | tail -3` — if `main` advanced past `0063`, renumber and pick a `when` above the newest journal entry.

**Blocked on Hugh:** the entitlement decision gate above (Supporter vs. Premium for `concert-history` + `calendar-export`). PR-1 does not depend on it; PR-2 cannot merge without it.
