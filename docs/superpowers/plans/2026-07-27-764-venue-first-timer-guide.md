# Venue first-timer guide (#764) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship [#764](https://github.com/HartiganHM/concert-crawl/issues/764) — a "what to know before your first show here" guide on the venue profile, plus the admin surface that authors it. Four consumer states (populated · thin · returner · anonymous), three admin states (populated · empty · validation) plus a chip-state legend.

**Architecture:** One new table (`venue_guide_chips`) plus two new columns on `venues` (`insider_tip`, `guide_published_at`). A shared pure module in `packages/types/src/venue-guide.ts` owns the chip pool, the chip-state derivation, the publish-gate predicate, and the viewer-mode resolver — imported by both `apps/api` (validation + serialization) and `apps/web` (admin badge + consumer branch) so the two can never drift. The consumer surface is a set of new components under `apps/web/src/components/consumer/venue-guide/`; the admin surface is a new `VenueGuideBlock` mounted from the existing `VenueDetailsClient` (which is already 2714 lines — the block does **not** go inline).

**Tech Stack:** Next.js App Router (`apps/web`), Hono (`apps/api`), Drizzle + Postgres (`packages/db`), shared types (`packages/types`), Vitest, Playwright.

**Spec:** [`docs/superpowers/specs/2026-07-17-764-venue-first-timer-guide-design-brief.md`](../specs/2026-07-17-764-venue-first-timer-guide-design-brief.md) (brief PR [#999](https://github.com/HartiganHM/concert-crawl/pull/999), merged 2026-07-17)
**Design handoff:** `design/design_handoff_venue_first_timer_guide/` — Readiness verdict **🟢 Green** via PR [#1008](https://github.com/HartiganHM/concert-crawl/pull/1008), one-pass audit, every locked decision honored.

---

## Global Constraints

- **TDD** — every new module lands with a failing test first. Pure logic in `packages/types/src/venue-guide.ts` is tested exhaustively before any UI consumes it.
- **Voice bar (Sour Patch, #782)** — every displayed string lifts **verbatim** from the `*_COPY` maps in `design/design_handoff_venue_first_timer_guide/guide-data.jsx:55-114` (`ROXY_GUIDE_COPY` is *sample content*, not shipped copy — only `CALLOUT_COPY`, `EVENT_CHIP_COPY`, `PLACEHOLDER_COPY`, `ADMIN_COPY` are shipped strings). Do not rewrite them; the READINESS audit voice-passed them (READINESS.md:92-104).
- **All customer-facing strings in `definitions/copy.ts`** — consumer strings extend `CONSUMER_COPY` (`apps/web/src/components/consumer/definitions/copy.ts`) under a new `venueGuide` block, next to the existing `venueProfile` block at line 676. Admin strings extend `ADMIN_COPY.venueDetailsClient` (`apps/web/src/components/admin/definitions/copy.ts:658`).
- **Vocabulary is locked** — **Watching** (never Saved/Favorites/Following), **Submitted prices**, **price check**. The Watching affordance is an **eye** (lucide `Eye`). There is no heart icon in this product and none is introduced here. The prototype's `WatchingPill` (`guide-consumer.jsx:373`) is scaffolding for the canvas only — the real page keeps the shipped `WatchShowButton`.
- **Tokens only** — every color reads from `var(--*)`. No ad-hoc hex, no Tailwind `dark:` variants. All 9 production themes must hold; spot-check Electric / Jade / Light.
- **TypeScript strict; no `as` casts** — the chip-type union, the chip-state union, and the API payloads all cross boundaries. Use Zod `safeParse` at the Hono boundary and in the web server actions, and type guards (`isGuideChipKey`, `isAuthoredChip`) for narrowing.
- **Zod at every Hono endpoint; audit-log every admin mutation** — `ctx.set('auditAction' | 'auditTargetId' | 'auditActorId')` per the `AdminVariables` middleware at `apps/api/src/routes/admin/index.ts:19-62`.
- **Drizzle only; expand/contract migrations only** — next migration index is **0064** (`packages/db/migrations/0063_vendor_picker_values.sql` is current head). The `_journal.json` `when` must exceed `1785628800000`.
- **Mobile/desktop parity in the same PR** — non-negotiable. The consumer PR ships 320 / 390 / desktop in one go. Desktop is single-column matching prod (handoff README "Design calls made"), with the chip list widening to a 2-column grid.
- **a11y in the same PR** — `aria-expanded` on the returner accordion, `aria-pressed` on chip-picker toggles, `role="switch"` + `aria-checked` on the "Can't document yet" toggle, `aria-hidden` on every decorative glyph, ≥44px tap targets, no native `title=` tooltips.
- **Release notes** — PR-3 and PR-4 each add an entry to `apps/web/src/lib/definitions/releases.ts` on the same branch, prepended to the array (newest-first). Do not anchor to a version string — `releases.ts` gains entries continuously; take the next version at write time.
- **Per-worktree test DB** — set `DATABASE_URL_TEST` (e.g. `concert_crawl_test__764_guide`) before running integration tests.
- **Pre-push in each worktree:**
  ```
  pnpm turbo run build --filter=@concert-crawl/types --filter=@concert-crawl/db
  pnpm --filter @concert-crawl/api typecheck && pnpm --filter @concert-crawl/web typecheck
  pnpm --filter @concert-crawl/api lint && pnpm --filter @concert-crawl/web lint
  pnpm --filter @concert-crawl/api test && pnpm --filter @concert-crawl/web test
  ```

---

## Prototype-polish items the READINESS verdict deferred to this plan

READINESS.md:137-158 deferred four integration seams. All four are **resolved here**; none are passed downstream.

### 1. Chip-key naming — use the brief's descriptive keys, no translation table

READINESS recommended the brief names over Design's short keys, and that's the call. Canonical enum values, snake_case to match every other string enum in the schema (`venue_box_office`, `structured_data`, `spotify_followed`):

```
accessibility · parking · age_policy · bag_check · coat_check · will_call · food_drink · transit
```

Design's short keys (`age`, `bag`, `coat`, `entry`, `food`) were display-only in the canvas (`guide-data.jsx:16`). **There is no mapping layer.** The same key is used in the DB column, the Zod enum, the TS union, the `copy.ts` label map, and the admin placeholder map. A translation table between design keys and schema keys is exactly the kind of thing that rots — kill it now. Labels are unchanged from the handoff (`Accessibility`, `Parking`, `Age policy`, `Bag check`, `Coat check`, `Will-call / entry`, `Food + drink`, `Getting there`).

`chip_type` is a **`text` column validated by Zod, not a `pgEnum`.** Direct precedent: `venues.platform` (`packages/db/src/schema/venues.ts:76-81`) — "intentionally not a Postgres enum, to avoid the ALTER TYPE pain when we add more platforms." #997 adds four more chip types; that must not require a migration.

### 2. Chip-state data model — `blank` is *absence*, not a stored value

Design's three states are `blank | authored | honest_placeholder` (`guide-data.jsx:127-131`). Persisting all three would require storing empty rows, which then need cleanup rules. Instead:

| Design state | Storage |
| --- | --- |
| `blank` | **no row** in `venue_guide_chips` |
| `authored` | row with `is_placeholder = false`, `body` non-empty after trim |
| `honest_placeholder` | row with `is_placeholder = true`, `body = ''`, `chip_type = 'accessibility'` |

A DB CHECK constraint makes `blank` **unrepresentable**:

```sql
CONSTRAINT venue_guide_chips_state_check CHECK (
  (is_placeholder AND chip_type = 'accessibility' AND body = '')
  OR (NOT is_placeholder AND length(btrim(body)) > 0)
)
```

Consequence, accepted deliberately: a chip the admin *selects in the picker but leaves empty* is not persisted. Select Parking, type nothing, save, reload → the chip is unselected again. This is honest (a blank chip renders nowhere on display anyway, per the legend at `guide-admin.jsx:306`) and it costs zero cleanup machinery. Document it in the admin help copy? **No** — it's non-surprising and adding copy for it clutters the block. The `blank` state stays purely a client-side, in-session concept.

**No `sort_order` column.** The brief mentions one (brief line 182) but display order is fully determined by `GUIDE_CHIP_ORDER` in `packages/types` (accessibility pinned first, per Q4). Per-venue reordering was never a designed affordance. YAGNI — killed explicitly.

**Insider tip lives on `venues`, not in the chip table.** It's 1:1 with the venue, it's not a chip (different render treatment, different admin panel, different position), and per the KISS convention we exhaust existing tables first: `venues.insider_tip text`.

### 3. Publish-state derivation — the *badge* is derived, the *published* flag is persisted

Two distinct things the READINESS item conflates:

- **The badge** (`Ready to publish` / `Publishable · access marked undocumented` / `Blocked · accessibility required`, `guide-admin.jsx:213-215`) is **never persisted.** It is computed by a single shared pure function, `deriveGuidePublishState()`, exported from `packages/types/src/venue-guide.ts` and imported by *both* the admin client (badge) and the API `POST .../guide/publish` handler (server-side gate). One function, two call sites — the client cannot show "Ready" for something the server will reject, and the server cannot be bypassed by a hand-rolled request.
- **Publication itself** is persisted as `venues.guide_published_at timestamptz null`. The admin block has two buttons (`Save draft` / `Publish guide`, `guide-admin.jsx:293-295`), so a draft/live distinction genuinely exists. `Save draft` writes chips + insider tip and leaves `guide_published_at` untouched. `Publish guide` runs the gate and, on pass, sets `guide_published_at = now()`. The consumer endpoint returns a guide **only** when `guide_published_at IS NOT NULL`.

### 4. v2 chip hooks — two arrays, one Zod enum, zero migrations

`packages/types/src/venue-guide.ts` exports:

```ts
export const GUIDE_CHIP_ORDER = ['accessibility','parking','age_policy','bag_check','coat_check','will_call','food_drink','transit'] as const
export const GUIDE_CHIP_V2_KEYS = ['weather','restrooms','atm','cell_service'] as const   // #997, not authorable
```

The Zod enum is built from `GUIDE_CHIP_ORDER` only. The admin picker renders `GUIDE_CHIP_V2_KEYS` as disabled ghosts with a `SOON · #997` marker (`guide-admin.jsx:96-104`). Because `chip_type` is `text` (decision 1) and there is no value CHECK on it, #997 is a pure application-code change: move keys from the v2 array into `GUIDE_CHIP_ORDER`, add label + placeholder copy, done. **No migration, no `ALTER TYPE`.** The `is_placeholder`/`body` CHECK stays — that invariant never expands.

---

## Correction to the handoff's sequencing note

`design/design_handoff_venue_first_timer_guide/README.md:180-182` says: *"If eng ships the section before detection is wired, everyone sees the collapsed (returner) state."*

**That is inverted and this plan does the opposite.** Brief Q7 (spec lines 68-72) and the READINESS lifecycle sweep (READINESS.md:124-127) both lock *anonymous → callout fires; we default to helpful when we don't know the user's history*. Before #70 lands we do not know anyone's history — so the pre-detection default is **first-timer for everyone**, callout firing, guide expanded. The returner accordion is dark until detection exists. Shipping the collapsed state as the default would suppress the callout for 100% of users, which is the exact opposite of the locked decision.

---

## Sequencing lock

Four PRs, strictly ordered. Each passes CI standalone.

| PR | Scope | Depends on | Blocked by |
| --- | --- | --- | --- |
| **PR-1** | Schema + shared pure module (`packages/db`, `packages/types`) | — | — |
| **PR-2** | Admin authoring surface (API + admin UI) | PR-1 | — |
| **PR-3** | Consumer surface: populated · thin · anonymous | PR-1, PR-2 (needs real data to eyeball) | — |
| **PR-4** | **Returner state only** | PR-3 | **#70 Concert History** must ship `user_events.attending_at` |

PR-1 → PR-3 ship immediately. **PR-4 is the only thing gated on #70** — this is the seam the READINESS verdict called "the section ships independent of the callout."

### The #70 data contract (name it, don't guess it)

⚠️ **The brief and handoff both cite "#55" for Concert History. That is wrong.** [#55](https://github.com/HartiganHM/concert-crawl/issues/55) is *"Saving shows (Watching)"* and is **closed**. Concert History is [#70](https://github.com/HartiganHM/concert-crawl/issues/70), open, design-🟢-Green, unbuilt. Fix the reference wherever it's repeated.

What PR-4 needs from #70, per `design/design_handoff_concert_history/READINESS.md:13-17`:

- `user_events.attending_at timestamptz NULL` on the existing table (expand-only `ADD COLUMN`; the `user_events_user_event_idx` unique index on `(user_id, event_id)` is preserved).
- TS/API field name `attendingAt`; `going` is derived at read time from `attending_at IS NOT NULL`.
- No new table, no split of Watching from Attending.

PR-4 consumes it with exactly one predicate, added to `GET /v1/venues/:slug` and evaluated **only when the request is authenticated**:

```
EXISTS (
  SELECT 1 FROM user_events ue
  JOIN events ev ON ev.id = ue.event_id
  WHERE ue.user_id = :viewerId
    AND ev.venue_id = :venueId
    AND ue.attending_at IS NOT NULL
)
```

surfaced as `viewerHasAttended: boolean` on `VenueWithEvents`. If #70 lands with a different shape, **only** this one query and the `resolveGuideViewerMode` call site change — nothing else in the feature touches attendance.

### Adjacent: #794 logged-out UX

[#794](https://github.com/HartiganHM/concert-crawl/issues/794) (design-🟢) makes `/venues` and `/venues/[slug]` public; today they sit under `apps/web/src/app/(protected)/(main)/venues/`. The **anonymous** state built in PR-3 is precisely what an unauthenticated visitor sees there, and it needs no extra code — anonymous and signed-in-first-timer are the *same branch* (brief Q7: "copy reads identically because it's a question, not an assertion"). Two consequences to honor in PR-3:

1. The guide payload must ride on the **unauthenticated** response of `GET /v1/venues/:slug` — that endpoint already serves `publicApiClient` (`apps/web/src/app/(protected)/(main)/venues/[slug]/page.tsx:27-34`), so do not gate the guide fields behind a token.
2. `resolveGuideViewerMode` must handle `isSignedIn: false` explicitly, and PR-3's tests must cover it, even though the state is not *reachable* in prod until #794 moves the route out of `(protected)` (or `REQUIRE_BETA_AUTH` flips — see `apps/api/src/routes/venues-public.ts:28-30`).

---

## Phase / PR-1 — Schema + shared guide module

No UI. Lands the data model, the migration, and the pure logic every later PR imports.

Branch: `feat/764-guide-schema`

### Task 1: Shared guide module in `packages/types`

**Files:**

- Create: `packages/types/src/venue-guide.ts`
- Create: `packages/types/src/venue-guide.test.ts`
- Modify: `packages/types/src/index.ts` — re-export the module; extend `VenuePublic` / `VenueWithEvents`

**Interfaces produced:**

```ts
export const GUIDE_CHIP_ORDER = [
  'accessibility', 'parking', 'age_policy', 'bag_check',
  'coat_check', 'will_call', 'food_drink', 'transit',
] as const
export type GuideChipKey = (typeof GUIDE_CHIP_ORDER)[number]

export const GUIDE_CHIP_V2_KEYS = ['weather', 'restrooms', 'atm', 'cell_service'] as const
export type GuideChipV2Key = (typeof GUIDE_CHIP_V2_KEYS)[number]

export const isGuideChipKey = (value: string): value is GuideChipKey => ...

/** One persisted chip. `blank` is absence — never a row. */
export interface VenueGuideChip {
  chipType: GuideChipKey
  body: string
  isPlaceholder: boolean
}

export type GuideChipState = 'blank' | 'authored' | 'honest_placeholder'
export const deriveChipState = (input: { body: string; isPlaceholder: boolean } | undefined): GuideChipState

export type GuidePublishState =
  | { kind: 'ready' }
  | { kind: 'ready_with_placeholder' }
  | { kind: 'blocked'; reason: 'accessibility_required' }
export const deriveGuidePublishState = (input: {
  accessibilityBody: string
  accessibilityPlaceholder: boolean
}): GuidePublishState

export type GuideViewerMode = 'first_timer' | 'returner'
/** hasAttendedVenue === null means "detection not wired yet" (pre-#70). */
export const resolveGuideViewerMode = (input: {
  isSignedIn: boolean
  hasAttendedVenue: boolean | null
}): GuideViewerMode

export type GuideDensity = 'populated' | 'thin'
/** thin === accessibility is the only authored chip AND no insider tip. */
export const deriveGuideDensity = (input: {
  chips: VenueGuideChip[]
  insiderTip: string | null
}): GuideDensity

export interface VenueGuide {
  chips: VenueGuideChip[]      // ordered by GUIDE_CHIP_ORDER, accessibility first
  insiderTip: string | null
  publishedAt: string | null
}
```

`VenuePublic` gains `guide: VenueGuide | null` (null when unpublished). `VenueWithEvents` gains `viewerHasAttended: boolean | null` — **added in PR-1, always `null` until PR-4**, so no later type churn.

- [ ] **Step 1: Write the failing test file**

`packages/types/src/venue-guide.test.ts`, covering:

- `deriveChipState(undefined) === 'blank'`; `{ body: '   ', isPlaceholder: false } === 'blank'`; authored; placeholder wins over body.
- `deriveGuidePublishState` — all three kinds, plus whitespace-only accessibility body is `blocked`.
- `resolveGuideViewerMode` — table: `(false, null) → first_timer`, `(false, false) → first_timer`, `(true, null) → first_timer` (**pre-#70 default; asserts the handoff-README correction**), `(true, false) → first_timer`, `(true, true) → returner`.
- `deriveGuideDensity` — accessibility-only + no tip → `thin`; accessibility-only + tip → `populated`; two chips → `populated`.
- `isGuideChipKey` narrows and rejects `'age'` / `'bag'` / `'coat'` / `'entry'` / `'food'` (the design short keys) and every `GUIDE_CHIP_V2_KEYS` member.

Run: `pnpm --filter @concert-crawl/types test`
Expected: FAIL — module not found.

- [ ] **Step 2: Implement `venue-guide.ts`** until green. No `as` casts; `isGuideChipKey` is a real predicate over the const tuple.

- [ ] **Step 3: Extend `packages/types/src/index.ts`** — `export * from './venue-guide.js'`, add `guide` to `VenuePublic` (index.ts:804-822) and `viewerHasAttended` to `VenueWithEvents` (index.ts:825-834).

- [ ] **Step 4:** `pnpm --filter @concert-crawl/types typecheck && lint && test` → PASS.

- [ ] **Step 5: Commit** — `feat(types): venue first-timer guide chip pool, chip-state + publish-state derivation`

### Task 2: Migration 0064 + Drizzle schema

**Files:**

- Create: `packages/db/migrations/0064_venue_first_timer_guide.sql`
- Modify: `packages/db/migrations/meta/_journal.json` — `idx: 64`, `when` **>** `1785628800000` (use `1785715200000`)
- Create: `packages/db/src/schema/venue-guide.ts`
- Modify: `packages/db/src/schema/venues.ts` — add `insiderTip`, `guidePublishedAt`
- Modify: `packages/db/src/schema/index.ts` — export the new table

- [ ] **Step 1: Write the migration** (expand-only; header comment in the house style of `0062_url_coverage_guard.sql`)

```sql
-- #764 Venue first-timer guide.
--
-- venue_guide_chips: one row per AUTHORED or PLACEHOLDER chip. The design's
-- third state, `blank`, is deliberately unrepresentable — it is the absence of
-- a row. The CHECK below enforces that, and enforces that the honest
-- placeholder is only ever valid on the accessibility chip (brief Q4).
--
-- chip_type is TEXT, not an enum, matching venues.platform: #997 expands the
-- pool to weather/restrooms/ATMs/cell service and must not need ALTER TYPE.
-- Values are validated by Zod at the API boundary.
--
-- No sort_order: display order is the GUIDE_CHIP_ORDER constant in
-- packages/types, with accessibility pinned first. Per-venue reordering was
-- never a designed affordance.

CREATE TABLE IF NOT EXISTS venue_guide_chips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  chip_type text NOT NULL,
  -- No DEFAULT: an empty body is legal only for placeholder rows, which insert
  -- '' explicitly. A DEFAULT '' would let a non-placeholder insert omit body
  -- and land in a state the CHECK below rejects.
  body text NOT NULL,
  is_placeholder boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT venue_guide_chips_state_check CHECK (
    (is_placeholder AND chip_type = 'accessibility' AND body = '')
    OR (NOT is_placeholder AND length(btrim(body)) > 0)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS venue_guide_chips_venue_type_idx
  ON venue_guide_chips (venue_id, chip_type);

-- The free-form Insider tip is 1:1 with the venue and renders with its own
-- treatment (it LEADS the guide, per Hugh's R2 lock) — it is not a chip.
ALTER TABLE venues ADD COLUMN IF NOT EXISTS insider_tip text;

-- Draft vs. live. NULL = never published; the consumer endpoint omits the
-- guide entirely until this is set by the publish gate.
ALTER TABLE venues ADD COLUMN IF NOT EXISTS guide_published_at timestamp with time zone;
```

- [ ] **Step 2: Drizzle schema** — `packages/db/src/schema/venue-guide.ts` declaring `venueGuideChips` with the unique index, and `export type VenueGuideChipRow = typeof venueGuideChips.$inferSelect`. Add `insiderTip: text('insider_tip')` and `guidePublishedAt: timestamp('guide_published_at', { withTimezone: true })` to `venues` (after `about`/`neighborhood`, `packages/db/src/schema/venues.ts:88-93`).

- [ ] **Step 3: Verify the CHECK actually bites** — integration test `apps/api/src/routes/admin/venue-guide.integration.test.ts` (created in PR-2) will assert it; for PR-1 verify by hand against the local DB:

```
pnpm db:migrate
docker exec -it concert-crawl-db psql -U postgres -d concert_crawl_db \
  -c "insert into venue_guide_chips (venue_id, chip_type, body) select id,'parking','' from venues limit 1;"
```
Expected: `new row for relation "venue_guide_chips" violates check constraint`.

Also confirm `is_placeholder = true` on a non-accessibility chip is rejected.

- [ ] **Step 4:** `pnpm --filter @concert-crawl/db typecheck && lint` → PASS. Confirm `pnpm db:migrate` is idempotent on a second run.

- [ ] **Step 5: Commit** — `feat(db): venue_guide_chips table + insider_tip / guide_published_at on venues (#764)`

### Task 3: Seed coverage

**Files:**

- Modify: `packages/db/src/seed.ts` (or the seed module that populates venues — locate via `pnpm db:seed`'s entrypoint)

- [ ] **Step 1:** Seed three shapes so every consumer state is reachable locally without hand-editing SQL:
  - one venue **populated** — insider tip + accessibility + 4 chips, published
  - one venue **thin** — accessibility only, no insider tip, published
  - one venue **placeholder** — accessibility as `honest_placeholder`, published
  - leave the rest unpublished so the no-guide path is also exercised

Seed bodies must be voice-passed — reuse the `ROXY_GUIDE_COPY` samples from `guide-data.jsx:55-65` verbatim (they exist precisely as the reference set).

- [ ] **Step 2:** `pnpm db:seed` → verify by query. Commit — `feat(db): seed venue guide fixtures for populated/thin/placeholder states`

### Task 4: Open PR-1

- [ ] Branch `feat/764-guide-schema`, PR title `feat(db): #764 venue first-timer guide data model`. No `Closes #764` (that goes on PR-3). No release-notes entry (nothing user-facing). No `progress.md` row (schema-only).
- [ ] `./scripts/request-copilot-review.sh <pr>` → review loop to the clean bar → merge.

---

## Phase / PR-2 — Admin authoring surface

The three admin states (populated · empty · validation) plus the chip-state legend. Automation stays admin-side; nothing auto-drafts (brief principle 2 — #996 is v2).

Branch: `feat/764-guide-admin`

### Task 5: API — `GET` / `PUT` / `POST publish` under `/v1/admin/venues/:id/guide`

**Files:**

- Create: `apps/api/src/routes/admin/venue-guide.ts`
- Create: `apps/api/src/routes/admin/venue-guide.test.ts` (unit — Zod schema behavior)
- Create: `apps/api/src/routes/admin/venue-guide.integration.test.ts`
- Modify: `apps/api/src/routes/admin/venues.ts` — mount `venueGuideAdminRouter` at `/:id/guide`

The routes live in a **separate file**, not appended to `admin/venues.ts` (already 925 lines).

**Interfaces:**

- `GET /v1/admin/venues/:id/guide` → `{ success: true, data: VenueGuide }` (chips ordered by `GUIDE_CHIP_ORDER`).
- `PUT /v1/admin/venues/:id/guide` — save draft. Body:
  ```ts
  const saveGuideSchema = z.object({
    insiderTip: z.string().max(400).nullable().optional()
      .transform((val) => { if (val == null) return val; const trimmed = val.trim(); return trimmed === '' ? null : trimmed }),
    chips: z.array(z.object({
      chipType: z.enum(GUIDE_CHIP_ORDER),
      body: z.string().max(400),
      isPlaceholder: z.boolean().default(false),
    })).max(GUIDE_CHIP_ORDER.length),
  })
  .superRefine(...)   // isPlaceholder only on accessibility; duplicate chipType rejected
  ```
  The transform/trim shape mirrors the existing `about` / `neighborhood` fields (`admin/venues.ts:78-97`).
  Server drops any chip whose trimmed body is empty and `isPlaceholder === false` (that's `blank` → no row), then replaces the venue's chip set inside a single `db.transaction`.
- `POST /v1/admin/venues/:id/guide/publish` — re-derives the gate with `deriveGuidePublishState()` from `packages/types` against the **persisted** rows (not the request body). On `blocked` → `400 { success: false, error, field: 'accessibility' }`. On pass → set `guidePublishedAt = new Date()`.

**Audit logging** (required on both mutations — the PUT save and the POST publish):

| Route | `auditAction` | `auditTargetId` | `auditMeta` |
| --- | --- | --- | --- |
| `PUT .../guide` | `venue.guide.save` | venue id | `{ chipCount, hasInsiderTip, accessibilityState }` |
| `POST .../guide/publish` | `venue.guide.publish` | venue id | `{ publishState }` |

`auditActorId` from `getAuthUser(ctx).userId`, matching `admin/venues.ts:440-442`.

- [ ] **Step 1: Failing integration test** — `venue-guide.integration.test.ts`:
  - `PUT` with accessibility authored + 2 chips → 200, rows persisted, order stable on `GET`.
  - `PUT` with a chip whose body is `'   '` → 200, chip **not** persisted.
  - `PUT` with `isPlaceholder: true` on `parking` → 400 from Zod `superRefine`.
  - `PUT` with duplicate `chipType` → 400.
  - `PUT` twice → replacement, not accumulation (second `PUT` with one chip leaves exactly one row).
  - `PUT` with a design short key (`'age'`) → 400 (proves decision 1's enum).
  - `POST .../publish` with blank accessibility → 400, `guide_published_at` still NULL.
  - `POST .../publish` with placeholder accessibility → 200, `guide_published_at` set.
  - Audit rows written for both mutations with the right action strings.
  - Non-admin caller → 403 (inherited from `requireRole('admin')`).

Run: `pnpm --filter @concert-crawl/api test -- venue-guide` → FAIL.

- [ ] **Step 2: Implement** the router until green. `db.transaction` for the replace. Never construct SQL by hand.

- [ ] **Step 3: Mount + typecheck + lint + full API test run.**

- [ ] **Step 4: Commit** — `feat(api): admin venue guide save + publish endpoints with audit logging (#764)`

### Task 6: Server actions + admin copy

**Files:**

- Modify: `apps/web/src/lib/actions/venues.ts` — add `saveVenueGuide(venueId, payload)` and `publishVenueGuide(venueId)`
- Modify: `apps/web/src/components/admin/definitions/copy.ts` — new `ADMIN_COPY.venueDetailsClient.guide` block

- [ ] **Step 1:** Actions mirror `updateVenue` (`apps/web/src/lib/actions/venues.ts:83-128`): `getToken()`, `apiClient.put` / `apiClient.post`, `revalidatePath(\`/admin/venues/${venueId}\`)` — the concrete path, not a `:id` pattern, `ApiError` narrowing for the 400 accessibility case returning `{ success: false, field: 'accessibility', error }`. Every catch logs (async try/catch convention).

- [ ] **Step 2:** Copy block — lift verbatim from `ADMIN_COPY` in `guide-data.jsx:92-114` plus the legend rows from `guide-admin.jsx:305-309`:

```ts
guide: {
  blockTitle, blockSub, voiceReminder, accessRequired, accessPlaceholder,
  vibeLabel: 'Insider tip', vibePlaceholder, vibeHelp,
  fieldPlaceholder: { parking, age_policy, bag_check, coat_check, will_call, food_drink, transit },
  chipLabels: { accessibility: 'Accessibility', parking: 'Parking', age_policy: 'Age policy',
                bag_check: 'Bag check', coat_check: 'Coat check', will_call: 'Will-call / entry',
                food_drink: 'Food + drink', transit: 'Getting there' },
  adminHints: { ... },                        // from CHIP_DEFS[*].adminHint
  publishBadge: { ready, readyWithPlaceholder, blocked },
  validationBanner: { title, body },          // guide-admin.jsx:256-257
  placeholderToggleLabel: "Can't document yet",
  placeholderPreviewPrefix: 'Will show the honest placeholder on the venue page:',
  addMoreChips: 'Add more chips', v2Marker: 'SOON · #997',
  saveDraft: 'Save draft', publish: 'Publish guide',
  legend: { heading: 'Chip state indicators', rows: [...] },
}
```

Note the `fieldPlaceholder` keys are re-keyed from Design's short keys to the canonical schema keys. Strings themselves unchanged.

- [ ] **Step 3:** typecheck + lint. Commit — `feat(web): venue guide server actions + admin copy (#764)`

### Task 7: `VenueGuideBlock` admin component

**Files:**

- Create: `apps/web/src/components/admin/venue-guide/VenueGuideBlock.tsx`
- Create: `apps/web/src/components/admin/venue-guide/ChipStateDot.tsx`
- Create: `apps/web/src/components/admin/venue-guide/ChipPicker.tsx`
- Create: `apps/web/src/components/admin/venue-guide/AccessibilityField.tsx`
- Create: `apps/web/src/components/admin/venue-guide/ChipStateLegend.tsx`
- Create: `apps/web/src/components/admin/venue-guide/GuideIcon.tsx`
- Create: `apps/web/src/components/admin/venue-guide/VenueGuideBlock.test.tsx`
- Modify: `apps/web/src/components/admin/VenueDetailsClient.tsx` — mount one `<VenueGuideBlock venueId={venue.id} venueName={venue.name} initialGuide={guide} />` (the interface below is authoritative; `guide` comes from the server-side fetch in the next bullet) between the Editorial section (line 2066) and Identity art (line 2290)
- Modify: `apps/web/src/app/(protected)/admin/venues/[id]/page.tsx` — fetch the guide server-side and pass it in

**Why separate files:** `VenueDetailsClient.tsx` is 2714 lines. Adding ~450 lines inline blows past the Copilot reviewability ceiling and makes the PR unreviewable. The block is self-contained state; the only touch to `VenueDetailsClient` is the mount plus an import.

**Interfaces:**

- `<VenueGuideBlock venueId venueName initialGuide />` — owns its own state and its own save/publish buttons. It does **not** participate in `handleSave()` (`VenueDetailsClient.tsx:750-827`); the guide is a distinct resource with a distinct gate, and folding it into the venue PATCH would mean the accessibility gate could block a slug rename.
- Reuses existing admin primitives from `@/components/admin/primitives` (`Panel`/`VDSection` equivalent, `AdminButton`, `StatusBadge`, `MonoLabel`, `AdminIcon`, `Kbd`) per READINESS.md:120. Follow the `VDSection` / `VDField` shape already in `VenueDetailsClient.tsx:110-283` rather than inventing chrome.
- `GuideIcon` ports the eight tokenized SVG paths from `guide-data.jsx:38-52` verbatim, keyed by canonical chip key, each `aria-hidden`.

**Layout order (locked by Hugh's R2, `guide-admin.jsx:225-284`):**

1. Block sub-copy
2. **Insider tip panel — FIRST**, accent-tinted, `SURFACED FIRST` marker. This is the R2 lock; it sits *above* accessibility even though accessibility is the required field.
3. Validation banner (only when publish was attempted and the gate failed)
4. Accessibility field (pinned, `REQUIRED`, two-mode with the `role="switch"` toggle)
5. `Add more chips` header + `ChipPicker` (7 selectable + 4 ghosted v2)
6. One `ChipField` per selected chip, in `GUIDE_CHIP_ORDER`
7. Voice-reminder strip
8. Footer: `Save draft` (ghost) / `Publish guide` (primary)

The `ChipStateLegend` renders once, below the block.

- [ ] **Step 1: Failing tests** — `VenueGuideBlock.test.tsx`:
  - **empty state:** no chips selected, no insider tip, badge reads `blocked`.
  - **populated state:** initial guide hydrates picker selection + field values; badge reads `ready`.
  - **validation state:** clicking `Publish guide` with blank accessibility shows the banner, sets `aria-invalid` on the accessibility textarea, and does **not** call the publish action.
  - **placeholder toggle:** flipping the switch shows the honest-placeholder preview, hides the textarea, and moves the badge to `readyWithPlaceholder`.
  - **picker a11y:** every toggle has `aria-pressed` reflecting selection; v2 ghosts are `disabled` and not `aria-pressed`.
  - **insider tip is the first field in DOM order** (assert via `getAllByRole('textbox')[0]`) — this is a regression guard on Hugh's R2 lock, not a cosmetic check.
  - **removing a chip** clears its value from the payload sent to `saveVenueGuide`.
  - **blank selected chip is dropped** from the save payload.
  - Badge label strings come from copy, never inlined.

Run: `pnpm --filter @concert-crawl/web test -- VenueGuideBlock` → FAIL.

- [ ] **Step 2: Implement** the six components. Tokens only. Every tap target ≥44px (the picker toggles are `minHeight: 32` in the prototype — **raise to 44** in the real build; the prototype's admin surface predates the tap-target sweep and 32px fails the constraint). Badge state comes from `deriveGuidePublishState()` — do not re-implement the predicate locally.

- [ ] **Step 3: Mount** in `VenueDetailsClient.tsx` and fetch in the admin venue page. Verify the existing `VenueDetailsClient.address.test.tsx` and `.platform.test.tsx` still pass unchanged.

- [ ] **Step 4:** typecheck + lint + full web test run.

- [ ] **Step 5: Commit** — `feat(web): admin first-timer guide authoring block (#764)`

### Task 8: Open PR-2

- [ ] PR title `feat(admin): #764 venue first-timer guide authoring`. No `Closes`. No release note (admin-only, customer-invisible). No `progress.md` row.
- [ ] Copilot review loop → merge.

---

## Phase / PR-3 — Consumer surface: populated · thin · anonymous

Everything a first-timer and an anonymous visitor sees. **Ships without #70.**

Branch: `feat/764-guide-consumer`

### Task 9: Serve the guide from `GET /v1/venues/:slug`

**Files:**

- Modify: `apps/api/src/routes/venues-public.ts` — add the guide to the `/:slug` handler
- Modify: `apps/api/src/routes/venues-public.integration.test.ts`

- [ ] **Step 1: Failing integration tests:**
  - published venue → `data.venue.guide` has ordered chips + `insiderTip`.
  - unpublished venue → `data.venue.guide === null` even when chip rows exist (draft must not leak).
  - `data.viewerHasAttended === null` on every response (PR-4 flips this).
  - **unauthenticated request** returns the same `guide` payload as an authenticated one — the #794 requirement.
  - chip order matches `GUIDE_CHIP_ORDER` regardless of insertion order.
  - `GET /v1/venues` (the list endpoint) is **unchanged** — no guide on the index, it isn't rendered there.

- [ ] **Step 2: Implement.** One extra `db.select()` against `venueGuideChips` filtered by `venues.guidePublishedAt IS NOT NULL`, sorted in JS by `GUIDE_CHIP_ORDER` index (the pool is 8 items — an ORDER BY CASE is noise). Add `insiderTip` and `guidePublishedAt` to the venue projection at `venues-public.ts:93-110`.

- [ ] **Step 3:** typecheck/lint/test. Commit — `feat(api): serve published venue guide on the public venue endpoint (#764)`

### Task 10: Consumer copy + components

**Files:**

- Create: `apps/web/src/components/consumer/venue-guide/GuideSection.tsx`
- Create: `apps/web/src/components/consumer/venue-guide/FirstTimerCallout.tsx`
- Create: `apps/web/src/components/consumer/venue-guide/GuideChipRow.tsx`
- Create: `apps/web/src/components/consumer/venue-guide/InsiderTip.tsx`
- Create: `apps/web/src/components/consumer/venue-guide/StillGathering.tsx`
- Create: `apps/web/src/components/consumer/venue-guide/AccessPlaceholderRow.tsx`
- Create: `apps/web/src/components/consumer/venue-guide/GuideIcon.tsx`
- Create: `apps/web/src/components/consumer/venue-guide/index.ts`
- Create: `apps/web/src/components/consumer/venue-guide/GuideSection.test.tsx`
- Create: `apps/web/src/components/consumer/venue-guide/FirstTimerCallout.test.tsx`
- Modify: `apps/web/src/components/consumer/definitions/copy.ts` — new `venueGuide` block beside `venueProfile` (line 676)

**Copy block** — verbatim from `guide-data.jsx:75-89`, with `{venue}` interpolation replacing the hard-coded `"Roxy"`:

```ts
venueGuide: {
  sectionTitle: 'Before you go',
  sectionEyebrow: 'First-timer guide',
  calloutEyebrow: 'New here',
  callout: {
    question: (venueShortName: string) => `First time at ${venueShortName}?`,
    populatedSub: 'Two minutes of stuff worth knowing before you walk in.',
    thinSub: "Here's what we've got so far.",
  },
  jumpAriaLabel: 'Jump to the first-timer guide',
  eventChip: (venueShortName: string) => `First time at ${venueShortName}? Guide`,
  insiderTipEyebrow: 'Insider tip',
  accessibilityAlwaysHere: '★ ALWAYS HERE',
  accessibilityNotDocumented: 'NOT DOCUMENTED',
  accessibilityPlaceholder: 'Not documented yet. Best to call the venue and ask before you head out — details are on the main page.',
  thinLabel: 'Still gathering',
  thinFooter: (venueShortName: string) => `That's the lot for now — ${venueShortName}'s new to us.`,
  chipLabels: { /* same 8 labels as admin */ },
  returnerCollapsedLabel: 'First-timer guide',
  returnerOpenSub: 'The stuff worth knowing before you walk in',
  returnerToggleAriaLabel: 'Show the first-timer guide',
}
```

`venueShortName` derivation is a small pure helper in `apps/web/src/components/consumer/venue-guide/lib.ts` with its own tests — strip a leading `The `, take the first token for multi-word names only when the full name exceeds ~18 chars, otherwise use the name as-is. The prototype hard-codes `"Roxy"` for `"The Roxy"`; encode that rule once rather than at five call sites.

**Interfaces:**

- `<GuideSection guide mode density venueShortName />` where `mode: GuideViewerMode`, `density: GuideDensity`. Renders the `id="ft-guide"` anchor target with `scroll-margin-top`.
- `<FirstTimerCallout variant venueShortName />` — `variant: GuideDensity`. The jump control is a real `<button>` with `aria-label`, ≥44px, `scrollIntoView({ behavior: 'smooth', block: 'start' })`; respect `prefers-reduced-motion` by falling back to `'auto'`.
- Insider tip **leads** the section — locked. `GuideSection.test.tsx` asserts DOM order.

- [ ] **Step 1: Failing tests** covering:
  - populated: insider tip renders first, then accessibility, then remaining chips in `GUIDE_CHIP_ORDER`; no `StillGathering`.
  - thin: callout sub-copy is the thin variant; `StillGathering` renders the 7 non-accessibility chips as dashed ghosts + the honest footer; **no insider tip element at all** when `insiderTip === null` (the handoff's deliberate blank, README gap-report item 2).
  - placeholder accessibility: `AccessPlaceholderRow` renders with the `NOT DOCUMENTED` marker and the honest copy; the star row is absent.
  - guide `null` (unpublished): `GuideSection` renders nothing and `FirstTimerCallout` does not mount.
  - callout jump: clicking focuses/scrolls to `#ft-guide`; button has the copy's `aria-label` and 44px min box.
  - every decorative `svg` is `aria-hidden`.
  - no string is inlined — assert against `CONSUMER_COPY.venueGuide`.

- [ ] **Step 2: Implement.** Port the prototype markup from `guide-consumer.jsx:43-163` to Tailwind + `var(--*)` inline styles matching the shipped venue page's idiom (`page.tsx` uses inline `style` for typography, Tailwind for layout — follow that, don't introduce a third idiom). No `color-mix` fallbacks needed; it's already used across the shipped consumer surface.

- [ ] **Step 3:** typecheck + lint + test. Commit — `feat(web): venue first-timer guide consumer components (#764)`

### Task 11: Wire into the venue profile page (mobile + desktop, same commit)

**Files:**

- Modify: `apps/web/src/app/(protected)/(main)/venues/[slug]/page.tsx`
- Delete: `apps/web/src/components/consumer/map-placeholder/MapPlaceholder.tsx`
- Delete: `apps/web/src/components/consumer/map-placeholder/index.ts`

**Page order after this task** (Hugh's R2 lock, README "Design calls made"):

hero → type chip → title → Directions row → stats row → About → **callout** → **guide (`#ft-guide`)** → Upcoming

- [ ] **Step 1: Remove the map.** `MapPlaceholder` is mounted in exactly one place (`page.tsx:222-228`) and imported nowhere else — verified. Delete the component directory with the mount; leaving orphaned code is worse than the diff. The Directions link (`page.tsx:146-179`) already covers the need, and the `Getting there` chip carries the in-voice how.

- [ ] **Step 2: Mount** `FirstTimerCallout` + `GuideSection`. Mode comes from `resolveGuideViewerMode({ isSignedIn: token !== null, hasAttendedVenue: result.viewerHasAttended })` — with `viewerHasAttended` always `null` today, this yields `first_timer` for everyone, which is the locked pre-#70 behavior. **Wire the resolver now**, so PR-4 is a data change and not a refactor.

- [ ] **Step 3: Desktop parity in this commit.** The page already caps at `max-w-[880px]`. Widen the chip list to a 2-column grid at `sm:` and up (`GuideSection` takes `columns` derived from a CSS grid class, not a JS breakpoint — no `isMobile` state on a server component). Callout, insider tip, and `StillGathering` stay full-width. Verify 320 / 390 / 768 / 1280.

- [ ] **Step 4: Test** — extend or add `apps/web/src/app/(protected)/(main)/venues/[slug]/page.test.tsx` if one exists; otherwise assert via the component tests plus a Playwright check in Task 13.

- [ ] **Step 5:** typecheck + lint + test. Commit — `feat(web): mount first-timer guide on the venue profile, drop the map placeholder (#764)`

### Task 12: Event-detail first-timer chip

**Files:**

- Create: `apps/web/src/components/consumer/venue-guide/EventFirstTimerChip.tsx`
- Create: `apps/web/src/components/consumer/venue-guide/EventFirstTimerChip.test.tsx`
- Modify: `apps/web/src/app/(protected)/(main)/events/[id]/page.tsx` — render it in the venue row (currently the `copy.venueLabel` / `event-venue-name` row around line 196-199)
- Modify: `apps/api/src/routes/events.ts` — the event-detail response must carry `venueGuidePublished: boolean` (chip only shows when there's a guide to jump to)

- [ ] **Step 1: Failing tests:**
  - chip renders only when `mode === 'first_timer'` **and** the venue has a published guide.
  - `href` is `/venues/${venue.slug}#ft-guide` (real cross-page link; the prototype's `preventDefault` at `guide-consumer.jsx:413` is canvas-only scaffolding).
  - chip is **signal**-tinted, not accent — R2 fix so it never reads as a commit action beside the accent Watching control and the Get Tickets CTA.
  - chip is right-aligned in the venue row, below the venue name, not in the CTA row.
  - ≥44px tap target (prototype has `minHeight: 32` — **raise to 44**).
  - returner / no-guide → nothing renders, event detail unchanged.

- [ ] **Step 2: Implement.** Add the `venueGuidePublished` boolean to the event-detail API projection (one join-free lookup — the venue row is already fetched).

- [ ] **Step 3:** typecheck/lint/test. Commit — `feat(web): event-detail first-timer chip anchoring to the venue guide (#764)`

### Task 13: E2E + release notes + open PR-3

- [ ] **Step 1: Playwright** — `apps/e2e/tests/venue-first-timer-guide.spec.ts`:
  - populated venue → callout visible, tapping GUIDE scrolls the guide into view, insider tip is the first thing inside the section.
  - thin venue → thin sub-copy + "Still gathering" cluster.
  - event detail → chip visible, click lands on `/venues/<slug>#ft-guide` with the guide in viewport.
  - 320px viewport → no horizontal overflow on the venue page (`document.documentElement.scrollWidth <= clientWidth`).

- [ ] **Step 2: Release notes** — `apps/web/src/lib/definitions/releases.ts`, prepend (use the actual merge date):

```ts
{
  version: '<next version at merge time>',
  date: '<PR-3 merge date>',
  headline: "Never been to the room? Here's what to know before you walk in.",
  items: [
    { kind: 'added',
      text: "Venue pages now carry a first-timer guide — where to park, what the age policy is, which door will-call is behind, and an insider tip from someone who's actually been. Accessibility is always there, and if we can't document it yet we say so instead of guessing." },
    { kind: 'added',
      text: "Event pages show a quick \"First time here? Guide →\" link next to the venue when there's a guide to read." },
    { kind: 'removed',
      text: 'The placeholder map on venue pages is gone. The Directions link does the job, and the guide tells you the part a map never could.' },
  ],
}
```

- [ ] **Step 3: progress.md** — add one ✅ Complete row (this is a meaningful feature; PR-1/PR-2/PR-4 do not get rows).

- [ ] **Step 4: Open PR-3** — title `feat(venues): #764 first-timer guide on venue + event detail`. Body includes `Closes #764`. No new env vars. Copilot loop → merge.

---

## Phase / PR-4 — Returner state (blocked on #70)

**Do not start this PR until [#70](https://github.com/HartiganHM/concert-crawl/issues/70) has merged `user_events.attending_at`.** Everything above ships without it.

Branch: `feat/764-guide-returner`

### Task 14: `viewerHasAttended` on the venue endpoint

**Files:**

- Modify: `apps/api/src/routes/venues-public.ts`
- Modify: `apps/api/src/routes/venues-public.integration.test.ts`

- [ ] **Step 1: Failing tests:**
  - unauthenticated → `viewerHasAttended === null` (we cannot know; must not resolve to `false`, which would be a claim).
  - authenticated, no `attending_at` rows at this venue → `false`.
  - authenticated, a row with `attending_at` set at this venue → `true`.
  - authenticated, a row at this venue with `attending_at IS NULL` (watching only) → `false`. **Watching is not attending.**
  - a row with `attending_at` set at a *different* venue → `false`.

- [ ] **Step 2: Implement** the single `EXISTS` predicate named in the Sequencing lock. Guard it behind `viewerId != null` so the anonymous path adds zero queries.

- [ ] **Step 3:** Commit — `feat(api): resolve viewerHasAttended for first-timer detection (#764, depends on #70)`

### Task 15: Returner accordion

**Files:**

- Create: `apps/web/src/components/consumer/venue-guide/ReturnerGuideAccordion.tsx`
- Create: `apps/web/src/components/consumer/venue-guide/ReturnerGuideAccordion.test.tsx`
- Modify: `apps/web/src/components/consumer/venue-guide/GuideSection.tsx` — branch on `mode === 'returner'`
- Modify: `apps/web/src/app/(protected)/(main)/venues/[slug]/page.tsx` — callout suppression (one condition; the resolver call is already wired from Task 11)
- Modify: `apps/web/src/app/(protected)/(main)/events/[id]/page.tsx` — chip suppression for returners

Treatment locked by Hugh's R2 (`guide-consumer.jsx:186-223`): an **accent-tinted** card (not muted) with a one-line preview strip `Access · Parking · Age +N`, opening in one gesture, insider tip leading the expanded state. It is an inline peer in the single column — never a sidebar, so desktop never shows an empty rail.

- [ ] **Step 1: Failing tests:**
  - returner: callout does **not** render; the accordion does, collapsed by default.
  - preview strip shows the first three authored chip labels joined by `·` plus `+N` when more exist; no `+N` at exactly three.
  - toggle button has `aria-expanded` reflecting state, ≥44px, and is keyboard-operable (Enter + Space).
  - expanded: insider tip renders first, then chips.
  - accent tokens present (assert the class/style hook, not a hex) — this is the R2 "emphasize with accent" lock.
  - event detail: returner → no first-timer chip, page otherwise unchanged.
  - thin + returner: accordion still renders (accessibility floor guarantees content); `StillGathering` does **not** appear inside the accordion.
  - reduced motion: chevron rotation is suppressed.

- [ ] **Step 2: Implement.**

- [ ] **Step 3:** typecheck/lint/test/E2E. Add a Playwright case: seed a user with an `attending_at` row → venue page shows the collapsed accordion and no callout.

- [ ] **Step 4: Release notes** — next version at merge time, one `changed` item: the guide now folds itself down once you've been to a room, and stays one tap away.

- [ ] **Step 5: Open PR-4** — title `feat(venues): #764 returner state for the first-timer guide`. Body notes the #70 dependency. Copilot loop → merge.

---

## Files

**Create**

- `packages/types/src/venue-guide.ts` · `venue-guide.test.ts`
- `packages/db/src/schema/venue-guide.ts`
- `packages/db/migrations/0064_venue_first_timer_guide.sql`
- `apps/api/src/routes/admin/venue-guide.ts` · `.test.ts` · `.integration.test.ts`
- `apps/web/src/components/admin/venue-guide/` — `VenueGuideBlock.tsx`, `ChipStateDot.tsx`, `ChipPicker.tsx`, `AccessibilityField.tsx`, `ChipStateLegend.tsx`, `GuideIcon.tsx`, `VenueGuideBlock.test.tsx`
- `apps/web/src/components/consumer/venue-guide/` — `GuideSection.tsx`, `FirstTimerCallout.tsx`, `GuideChipRow.tsx`, `InsiderTip.tsx`, `StillGathering.tsx`, `AccessPlaceholderRow.tsx`, `EventFirstTimerChip.tsx`, `ReturnerGuideAccordion.tsx` (PR-4), `GuideIcon.tsx`, `lib.ts`, `index.ts`, + tests
- `apps/e2e/tests/venue-first-timer-guide.spec.ts`

**Modify**

- `packages/types/src/index.ts` — re-export; `VenuePublic.guide`; `VenueWithEvents.viewerHasAttended`
- `packages/db/src/schema/venues.ts` — `insiderTip`, `guidePublishedAt`
- `packages/db/src/schema/index.ts` · `packages/db/migrations/meta/_journal.json` · seed
- `apps/api/src/routes/admin/venues.ts` — mount the guide router only
- `apps/api/src/routes/venues-public.ts` · `venues-public.integration.test.ts`
- event-detail API route — `venueGuidePublished`
- `apps/web/src/lib/actions/venues.ts` — `saveVenueGuide`, `publishVenueGuide`
- `apps/web/src/components/admin/definitions/copy.ts` — `venueDetailsClient.guide`
- `apps/web/src/components/admin/VenueDetailsClient.tsx` — one mount
- `apps/web/src/app/(protected)/admin/venues/[id]/page.tsx` — fetch guide
- `apps/web/src/components/consumer/definitions/copy.ts` — `venueGuide` block
- `apps/web/src/app/(protected)/(main)/venues/[slug]/page.tsx` · `apps/web/src/app/(protected)/(main)/events/[id]/page.tsx`
- `apps/web/src/lib/definitions/releases.ts` · `docs/superpowers/progress.md`

**Delete**

- `apps/web/src/components/consumer/map-placeholder/` (single call site, verified)

---

## Tests

**Unit (Vitest, `packages/types`)** — `deriveChipState`, `deriveGuidePublishState`, `resolveGuideViewerMode` (5-row truth table including the pre-#70 default), `deriveGuideDensity`, `isGuideChipKey` rejecting design short keys and v2 keys.

**Integration (Vitest + Postgres, `apps/api`)** — admin save/publish happy paths; blank-body chip dropped; placeholder-on-non-accessibility rejected; duplicate chip rejected; short-key rejected; PUT replaces rather than accumulates; publish gate re-derived server-side; audit rows written with `venue.guide.save` / `venue.guide.publish`; non-admin 403. Public endpoint: published vs. draft; unauthenticated parity; chip ordering; `viewerHasAttended` truth table (PR-4).

**DB constraint** — `venue_guide_chips_state_check` rejects empty non-placeholder bodies and placeholder-on-non-accessibility; unique index rejects a duplicate `(venue_id, chip_type)`.

**Component (Vitest + RTL, `apps/web`)** — admin: 3 states + legend + toggle + `aria-pressed` + insider-tip-first DOM-order guard. Consumer: populated / thin / placeholder / unpublished / returner; callout jump; `aria-hidden` on glyphs; 44px targets; every string sourced from copy.

**E2E (Playwright, staging)** — populated + thin venue flows, event-chip cross-page anchor, 320px no-overflow, returner accordion (PR-4).

**Manual (staging, after PR-3)** — author a real guide in admin end-to-end; publish gate blocks then passes via the toggle; theme sweep across Electric / Jade / Light; 320 / 390 / desktop.

---

## Out of scope

- **[#981](https://github.com/HartiganHM/concert-crawl/issues/981) community-submitted tips** — v1 is admin-authored only. This is why the thin state has no "suggest an edit" CTA.
- **[#996](https://github.com/HartiganHM/concert-crawl/issues/996) draft-generation from scraped data** — v1 automation is passive (curated pool + pre-populated venue basics). No auto-drafting anywhere in the admin block; the "automation never reaches display" principle is a hard rule.
- **[#997](https://github.com/HartiganHM/concert-crawl/issues/997) chip-pool expansion** — weather / restrooms / ATMs / cell service ship as disabled ghosts only. The `text` column + Zod enum means #997 needs no migration.
- **Per-venue chip reordering** — killed; order is the shared constant.
- **Admin mobile artboards** — desktop-first per README gap-report item 3. The block is responsive (fields stack) but no 320px admin pass. Flag for follow-up only if Hugh edits venues on a phone.
- **Guide content on the `/venues` index** — the guide is a detail-page surface; the list endpoint is untouched.
- **Photo galleries, live conditions, mapping-app integration** — permanently out per the ticket.
- **Making `/venues/[slug]` public** — that's [#794](https://github.com/HartiganHM/concert-crawl/issues/794). This plan builds the anonymous branch and tests it; #794 makes it reachable.
- **Concert History itself** — [#70](https://github.com/HartiganHM/concert-crawl/issues/70). PR-4 consumes one column from it and nothing else.

---

## Self-Review notes

- **Design coverage:** all 4 consumer states, both event-detail states, the guide anatomy pieces (callout ×2, insider tip, chip ×2, accessibility both states), all 3 admin states, and the chip-state legend map to tasks. The theme-parity row is covered by the tokens-only constraint plus the manual sweep.
- **Two deviations from the prototype, both deliberate and both justified above:** (a) 32px tap targets on the admin picker toggles and the event chip are raised to 44px; (b) the handoff README's "everyone sees the returner state pre-detection" line is inverted — first-timer is the pre-#70 default, per brief Q7.
- **One factual correction:** Concert History is #70, not #55. #55 is closed and is Watching.
- **Drift prevention:** `deriveGuidePublishState` and `resolveGuideViewerMode` live in `packages/types` and are imported by both apps. There is no second implementation of either predicate anywhere.
- **File-size discipline:** the admin block is six small files, not 450 lines appended to a 2714-line component. The API routes are a new file, not appended to a 925-line router.
- **Riskiest task:** Task 7 (`VenueGuideBlock`) — most surface area, most states, and it lands inside the most-touched admin component in the repo. Mitigated by the separate-file split and by the existing `VenueDetailsClient.address.test.tsx` / `.platform.test.tsx` acting as regression guards on the mount.

---

## Post-merge cleanup

```bash
pnpm worktree:prune --dry-run plan/764-eng feat/764-guide-schema feat/764-guide-admin feat/764-guide-consumer feat/764-guide-returner
pnpm worktree:prune plan/764-eng feat/764-guide-schema feat/764-guide-admin feat/764-guide-consumer feat/764-guide-returner
```

Update `docs/superpowers/progress.md` (one row, landed with PR-3). If PR-4 is deferred behind #70 for any length of time, leave a `## Next` note pointing at Task 14 so a fresh session picks it up without re-reading the handoff.
