# #762 Who else is watching — social signal on event detail — Implementation Plan

**Ticket:** [#762](https://github.com/HartiganHM/concert-crawl/issues/762) — Who else is watching — social signal on event detail
**Phase / Priority:** Beta · Normal · Free tier
**Spec:** [`docs/superpowers/specs/2026-07-19-762-who-else-is-watching-design-brief.md`](../specs/2026-07-19-762-who-else-is-watching-design-brief.md)
**Design handoff:** `design/design_handoff_who_else_is_watching/` — Readiness verdict: 🟢 **Green, one-pass** (`READINESS.md`; all 9 brief locks honored, no addendum)

**Goal:** Replace the Watch button's `"N watching · alerts on price + sold out"` count tail on event detail with a warm, honest social-proof surface — named handles (colored initials) up to a cap, everyone else folded into an "+ N more in the crawl" tail, an expandable roster, and nothing at all when there are zero other watchers.

**Architecture:** One new read endpoint `GET /v1/events/:id/watchers` (auth-required, viewer-excluded, handle-gated), a headless sentence model in `apps/web/src/lib/watchers.ts` lifted from the handoff, a `watchers/` consumer component folder, and a `WatchZone` composite on event detail that owns the Watch button + rehomed alerts hint + watchers surface. No schema change.

**Ticket status note:** #762 was auto-closed on 2026-07-19 by the handoff PR before any build landed. It has since been **reopened**. The implementation PR closing it is PR-B below.

---

## Global Constraints

- **TDD** — every new module lands with its test in the same task; API privacy behavior is test-first (the negatives are the feature).
- **Vocabulary is locked** — **Watching** only. Never "Saved" / "Favorites" / "Following". The Watching affordance is the lucide **`Eye`** (`WatchShowButton.tsx:292`) — the only icon this feature sits beside. Note the brief §2 and §4 refer to a "heart-toggle"; that is stale prose from the brainstorm, and the shipped button is an eye. No such icon exists in the codebase and none is introduced here.
- **Copy lifts verbatim** from `WATCHERS_COPY` in `design/design_handoff_who_else_is_watching/watchers-data.jsx:75-91` into `apps/web/src/components/consumer/definitions/copy.ts`. The strings are voice-passed (Sour Patch) and the READINESS audit locked them — do not rewrite. No literal customer-facing string in JSX.
- **Tokens only** — every color reads `var(--*)`. No hex, no Tailwind `dark:` variants.
- **9 production themes, not 3.** The brief §7 and the handoff both say "3 themes (Electric / Jade / Light)"; `userThemeEnum` at `packages/db/src/schema/user-profiles.ts:10-20` ships **nine** (`electric`, `jade`, `light`, `pulse`, `forge`, `bluenote`, `drip`, `cedar`, `gloss`). AA contrast for the four `avatarColor` tones must be spot-checked on all nine. De-risked: the same tone-tint recipe already ships across all nine via `apps/web/src/components/settings/Avatar.tsx:41-42`, which this plan reuses rather than reimplements.
- **TypeScript strict, no `as` casts** — Zod `safeParse` at the API boundary (route param) and on the client fetch; type guards for narrowing. `AvatarColor` already exists at `packages/types/src/index.ts:882`.
- **Mobile/desktop parity in the same PR** — non-negotiable. The surface is one component at both widths (the handoff's parity is behavioral, not two layouts); only the tap-target padding differs.
- **a11y in the same PR** — `role="group"` + prose `aria-label`, avatars `aria-hidden`, `+N` expander is a real `<button>` with `aria-expanded`, ≥44px effective tap on mobile, focus ring `var(--focus)`, `role="status"` + `aria-busy` on the skeleton. No native `title=` **tooltips** on interactive UI — this bans `title` used to convey hover-only information, not the `title` attribute where ARIA requires it for labelling (e.g. `<iframe title=...>`).
- **Components** — arrow/function components, no `handle*` handler names, logic in `lib/`, semantic HTML.
- **Pre-push in the worktree:**
  ```
  pnpm turbo run build --filter=@concert-crawl/types --filter=@concert-crawl/db
  pnpm --filter @concert-crawl/api typecheck && pnpm --filter @concert-crawl/api lint && pnpm --filter @concert-crawl/api test
  pnpm --filter @concert-crawl/web typecheck && pnpm --filter @concert-crawl/web lint && pnpm --filter @concert-crawl/web test
  ```
- **`DATABASE_URL_TEST`** — per-worktree test DB (auto-derived by `apps/api/src/test/setup/global-setup.ts`); do not run against the shared `concert_crawl_test`.
- **Release notes** — PR-B is user-facing and adds an entry to `apps/web/src/lib/definitions/releases.ts` on the same branch. PR-A is backend-only: no release note, no `progress.md` row.
- **`progress.md`** — one ✅ row lands with PR-B (the feature ships there), not with PR-A.

---

## Sequencing lock

| PR   | Scope                                                          | Depends on                                      |
| ---- | -------------------------------------------------------------- | ----------------------------------------------- |
| PR-A | API — `GET /v1/events/:id/watchers` + shared types             | none                                            |
| PR-B | Web — surface, copy, WatchZone, count retirement, release notes | PR-A merged (the endpoint must exist to fetch)  |

PR-A ships alone and changes no user-visible behavior — a dead endpoint for one merge cycle. PR-B is the visible change and carries `Closes #762`.

---

## Data contract — the one deliberate divergence from the brief

Brief §5 and READINESS §Sequencing both specify adding `data.watchers` as a sibling field on the existing `GET /v1/events/:id` payload, LIMIT-capped to `NAMED_CAP`. **This plan uses a dedicated endpoint instead.** Four reasons, all discovered in the code:

1. **The roster expansion can't be served by a `NAMED_CAP` list.** Roster expansion (`WatchersRoster`, `watchers-surface.jsx:150-180`) is a Design-introduced feature that post-dates brief §5 — it lists *every* named watcher, not the three shown in the sentence. A payload capped at 3 makes the expander a lie.
2. **`GET /v1/events/:id` is already the slow route.** It runs ~10 sequential queries (`apps/api/src/routes/events.ts:568-1082`) and carries a documented perf incident (#833, see the comment at `apps/web/src/app/(protected)/(main)/events/[id]/page.tsx:65-70`). Adding a join to it makes every event-detail SSR slower for a below-the-fold social row.
3. **The skeleton state only exists if the fetch is separate.** The handoff ships a loading skeleton (§2) with `aria-busy` and a reserved 28px row. Server-rendered data has no loading state — the artboard would be unreachable.
4. **Privacy has one testable surface.** Three negatives (no self, no handle-less identity, no `userId`) are asserted against one small handler instead of being buried in a 500-line response builder.

`EventDetailResponse.watching` (the total count, `events.ts:1095`) **stays** — it is a published type field and removing it is a contract change. It simply loses its only UI consumer (`page.tsx:178`). See Out of scope.

**Response shape:**

```ts
// packages/types/src/index.ts
export interface EventWatcher {
  handle: string          // never null — handle-less watchers are never listed
  avatarColor: AvatarColor | null
}

export interface EventWatchersResponse {
  /** Count of OTHER watchers (excludes the viewer; includes handle-less users). */
  total: number
  /** Handle-bearing other watchers, most-recent-first, capped at ROSTER_CAP. */
  named: EventWatcher[]
}
```

The client derives everything else: `shown = named.slice(0, NAMED_CAP)` (3), `others = total - shown.length`. No `userId`, no `createdAt`, no email, no Clerk id crosses the wire.

`ROSTER_CAP = 25` (server-side `LIMIT`). At beta scale (50–200 users, per brief §2) it will not truncate. If it ever does, named watchers beyond 25 fold silently into the `others` tail — less specific, still honest, never wrong.

---

## Phase / PR-A — API: `GET /v1/events/:id/watchers`

Auth-required, viewer-excluded, handle-gated read endpoint. No schema change, no migration.

### Task 1: Shared types

**Files:**

- Modify: `packages/types/src/index.ts` — add `EventWatcher` + `EventWatchersResponse` (shapes above), exported next to `EventDetailResponse` (currently `packages/types/src/index.ts:677`). `AvatarColor` is already declared at line 882 — import-free, same module.

**Steps:**

- [ ] Add both interfaces with the doc comments above (the "excludes the viewer" note is load-bearing for future readers).
- [ ] `pnpm turbo run build --filter=@concert-crawl/types` so the API and web workspaces resolve the new symbols.

### Task 2: Query helper `getEventWatchers()`

Extracted into `lib/` rather than inlined so it can be unit-tested and so `events.ts` (already 1293 lines) does not grow past the Copilot-reviewability ceiling.

**Files:**

- Create: `apps/api/src/lib/event-watchers.ts`

**Interfaces:**

```ts
export const ROSTER_CAP = 25

export async function getEventWatchers(
  eventId: string,
  viewerUserId: string,
): Promise<EventWatchersResponse>
```

**Steps:**

- [ ] **Step 1 — the count.** `db.select({ total: count() }).from(userEvents).where(and(eq(userEvents.eventId, eventId), eq(userEvents.status, 'watching'), ne(userEvents.userId, viewerUserId)))`. This mirrors the existing count at `apps/api/src/routes/events.ts:634-639` with the added `ne()` self-exclusion. `status = 'watching'` is mandatory — `userEventStatusEnum` (`packages/db/src/schema/social.ts:15-19`) also carries `going` and `interested`, which are **not** this surface.
- [ ] **Step 2 — the named list.** Inner-join `userProfiles` on `userEvents.userId = userProfiles.userId`, same three predicates plus `isNotNull(userProfiles.handle)`, `orderBy(desc(userEvents.createdAt))` (gap-report #4: most-recent-first), `.limit(ROSTER_CAP)`. Select **only** `{ handle: userProfiles.handle, avatarColor: userProfiles.avatarColor }` — never `userId`. The `userProfiles` join is the pattern already used in this route at `events.ts:889-891`.
- [ ] **Step 3 — narrow the handle.** Drizzle types `userProfiles.handle` as `string | null` (`packages/db/src/schema/user-profiles.ts:25`) even under `isNotNull`. Narrow with a type-guard filter — `rows.filter((row): row is EventWatcher => row.handle !== null)` — **not** an `as` cast.
- [ ] **Step 4 — return** `{ total, named }`.

### Task 3: Route handler

**Files:**

- Modify: `apps/api/src/routes/events.ts` — add `eventsRouter.get('/:id/watchers', clerkMiddleware(), ...)`. Registration order does not matter here: `'/:id/watchers'` has two segments and can never be matched by the one-segment `'/:id'` handler at line 568. Declare it beside its siblings `'/:id/related'` (line 1129) and `'/:id/watch'`, both of which are already registered after `'/:id'` and resolve correctly.

**Steps:**

- [ ] **Step 1 — validate.** `uuidSchema.safeParse(ctx.req.param('id'))` (already declared in this file, used at `events.ts:570`). Invalid → `404 { success: false, error: 'Event not found' }`, matching the sibling handler's shape.
- [ ] **Step 2 — require auth.** `const authInfo = getAuth(ctx)`; if `!authInfo?.userId` → `401 { success: false, error: 'Unauthorized' }`. Brief lock Q5: signed-out users see nothing this cycle. Note the neighbouring `'/:id'` handler uses *optional* auth (`events.ts:641-643`) — this endpoint is deliberately stricter. See the #794 contract below.
- [ ] **Step 3 — 404 on unknown/hidden events.** Reuse the same visibility predicate as `'/:id'` (`eq(events.hiddenFromConsumer, false)`, `isNull(events.firstMissingAt)`, `events.ts:622-628`) so a hidden event's watcher roster isn't readable when its detail page 404s.
- [ ] **Step 4 — call** `getEventWatchers(id, authInfo.userId)` and return `ctx.json({ success: true, data })`.
- [ ] **Step 5 — no shared cache.** `ctx.header('Cache-Control', 'private, no-store')`. The response is viewer-specific (self-exclusion), so the `public, max-age=300` treatment used on `/availability` (`events.ts:562`) would cross-serve one user's exclusion set to another.

### Task 4: Integration tests — the privacy negatives

**Files:**

- Create: `apps/api/src/routes/event-watchers.integration.test.ts`

Follow the auth-switching harness from `apps/api/src/routes/watching.integration.test.ts:1-30` (`vi.hoisted` `authState` + `setAuth()`), and the seed helpers `seedVenue` / `seedEvent` / `seedUserEvent` / `seedUserProfile` from `apps/api/src/test/helpers/seed.ts` (`seedUserProfile` already defaults `handle: null`, which is exactly the anon shape this feature turns on).

**Steps:**

- [ ] **Negative 1 — the viewer is never in their own roster.** Seed viewer + two others all watching; viewer has a handle. Assert `total === 2` and `named.every((w) => w.handle !== viewerHandle)`.
- [ ] **Negative 2 — handle-less watchers are never named.** Seed 1 handled + 3 handle-less others. Assert `total === 4`, `named.length === 1`.
- [ ] **Negative 3 — no identity field leaks.** Assert `Object.keys(named[0]).sort()` deep-equals `['avatarColor', 'handle']`. This is the assertion that catches a future `select()` widening.
- [ ] **Negative 4 — no profile row is not a leak.** Seed a watcher with **no** `user_profiles` row at all (not just a null handle). Assert they bump `total` and are absent from `named` (proves the inner join, not a left join).
- [ ] **Negative 5 — clearing a handle is the opt-out.** Seed a handled watcher, assert they appear; `UPDATE` the handle to `null`, re-request, assert they vanish from `named` while `total` is unchanged. This is brief lock Q2's mechanism as a regression test.
- [ ] **Negative 6 — anonymous callers get nothing.** `authState.current = null` → `401`, and assert the body carries no `data`.
- [ ] **Negative 7 — non-watching statuses are excluded.** Seed `status: 'going'` and `status: 'interested'` rows on the same event. Assert `total` counts neither.
- [ ] **Positive coverage:** zero other watchers → `{ total: 0, named: [] }` (drives the client's hide-entirely branch); ordering is most-recent-first by `createdAt`; `ROSTER_CAP` truncates `named` at 25 while `total` reports the true count; unknown uuid → 404; non-uuid → 404; `hiddenFromConsumer` event → 404.

### Task 5: PR-A — open, review, merge

- [ ] Branch `feat/762-watchers-api`. PR body uses `.github/pull_request_template.md`. **No** `Closes #762` (PR-B closes it). No new env vars.
- [ ] `./scripts/request-copilot-review.sh <pr>` after opening and after every fix push. Merge bar per `~/.claude/CLAUDE.md`.

**→ Merge PR-A before starting PR-B.**

---

## Phase / PR-B — Web: the surface, the retirement, the rehomed hint

### Task 6: Copy

**Files:**

- Modify: `apps/web/src/components/consumer/definitions/copy.ts`

**Steps:**

- [ ] **Step 1 — add `CONSUMER_COPY.watchers`,** lifted verbatim from `WATCHERS_COPY` (`watchers-data.jsx:75-91`): `eyebrow`, `loading`, `one`, `areWatching`, `plusOthers(n)`, `countOnly(n)`, `countOnlyHonest`, `rosterToggle(n)`, `rosterHide`, `rosterTitle`, `rosterOthers(n)`, `watchHint`.
- [ ] **Step 2 — retire the count tail.** Delete `CONSUMER_COPY.watchShowButton.watchingCount` (`copy.ts:729-732` — `suffix: 'watching'`, `alertsSuffix: ' · alerts on price + sold out'`). Brief lock Q6: the new surface owns the count; the alerts affordance survives as `watchers.watchHint`. Grep for `watchingCount.suffix` / `alertsSuffix` before deleting to confirm `WatchShowButton.tsx:357-360` is the only reader.

### Task 7: Headless model `lib/watchers.ts`

Ports the handoff's builder so display text and screen-reader text are generated from one source and can never drift.

**Files:**

- Create: `apps/web/src/lib/watchers.ts`
- Create: `apps/web/src/lib/watchers.test.ts`

**Interfaces:**

```ts
export const NAMED_CAP = 3

export type SentencePart = { kind: 'name'; value: string } | { kind: 'text'; value: string }

export function watcherInitial(handle: string): string
export function watcherTone(watcher: EventWatcher): AvatarColor
export function buildWatchers(response: EventWatchersResponse): {
  shown: EventWatcher[]
  others: number
  total: number
  anonOnly: boolean
}
export function watchersToParts(response: EventWatchersResponse): {
  parts: SentencePart[]
  aria: string
  others: number
  anonOnly: boolean
  total: number
}
```

Ported from `watchers-data.jsx:40-102` and `watchers-surface.jsx:101-119`, with three adaptations: the discriminant is `kind`/`value` (the handoff's `t`/`v` violates the ESLint `id-length` 2-char minimum), the input is the API response rather than a flat fixture array (`anonOnly` becomes `named.length === 0 && total > 0`), and the deterministic djb2 tone hash (`w_hash`, `watchers-data.jsx:40-44`) is kept as the fallback when `avatarColor` is null.

**Steps:**

- [ ] **Step 1 — failing tests first,** one per brief §4 state: 1 named (`"marisol is watching this one."`), 3 named (`"marisol, dev_ftw & priya are watching."`), named + others (`"… + 11 more in the crawl, watching."`), all-anon (`"14 in the crawl are watching this one."`). Assert `parts` and `aria` render the same sentence — this is the drift guard.
- [ ] **Step 2 — edge cases:** `total: 0` → callers hide (assert `shown` empty, `others` 0); named beyond `NAMED_CAP` roll into `others`; `watcherInitial('_dev_ftw')` → `'D'` (non-alphanumerics stripped per `watchers-data.jsx:51`); `watcherInitial('🎸')` falls back to the first char uppercased, never throws; `watcherTone` is stable across calls for the same handle.
- [ ] **Step 3 — implement.** Pure functions, no React import.

### Task 8: The surface components

**Files:**

- Create: `apps/web/src/components/consumer/watchers/WatchersSurface.tsx`
- Create: `apps/web/src/components/consumer/watchers/WatcherAvatarStack.tsx`
- Create: `apps/web/src/components/consumer/watchers/WatchersRoster.tsx`
- Create: `apps/web/src/components/consumer/watchers/WatchersSkeleton.tsx`
- Create: `apps/web/src/components/consumer/watchers/index.ts`
- Create: `apps/web/src/components/consumer/watchers/WatchersSurface.test.tsx`
- Create: `apps/web/src/components/consumer/watchers/WatcherAvatarStack.test.tsx`

**Interfaces:**

```tsx
<WatchersSurface data={EventWatchersResponse | undefined} loading={boolean} expandable={boolean} />
<WatcherAvatarStack watchers={EventWatcher[]} overflow={number} size={number} ring={string} />
<WatchersRoster named={EventWatcher[]} anonymousCount={number} />
<WatchersSkeleton />
```

**Steps:**

- [ ] **Step 1 — reuse the shipped avatar.** `WatcherAvatarStack` renders `apps/web/src/components/settings/Avatar.tsx` (already imported cross-folder by `components/consumer/user-menu/UserMenu.tsx:7`, so this is an established path, not a new coupling). It already implements the exact recipe the handoff specifies — `color-mix(in oklch, var(--tone) 22%, var(--surface-1))` fill, 50%-tone border, `aria-hidden`, and a dashed neutral disc for `handle: null` (`Avatar.tsx:36-70`). The 2px separator ring the overlap needs (`watchers-surface.jsx:27`) goes on the **wrapper** div as `boxShadow: 0 0 0 2px var(--bg)` — `Avatar` is not modified. Overlap `-30%` of size, `size={24}`, descending `zIndex`.
- [ ] **Step 2 — the `+N` chip.** `var(--surface-2)` fill, `var(--border-strong)` border, `var(--font-mono)`, `aria-hidden` (the sentence already carries the number). Per `watchers-surface.jsx:71-81`.
- [ ] **Step 3 — `WatchersSurface`.** Returns `null` when `loading === false` and `(!data || data.total === 0)` — brief lock Q4, hide entirely. Renders `WatchersSkeleton` when `loading`. Otherwise: `role="group"` + `aria-label={aria}` wrapping the stack, the sentence (`kind: 'name'` parts in `var(--fg)`/700, connective in `var(--fg-muted)`), and the `+N` expander button. `anonOnly` additionally renders the `countOnlyHonest` honesty line in `var(--fg-subtle)`.
- [ ] **Step 4 — the expander.** Real `<button type="button">` with `aria-expanded`, label `rosterToggle(total)` / `rosterHide`, `var(--signal)` text, focus-visible `2px solid var(--focus)` with 2px offset. **Mobile tap target:** `minHeight: 44` at `<640px`, `minHeight: 28` above — the handoff's "≥44px effective via row padding" made explicit rather than implied. Shown only when `others > 0 || (anonOnly && total > 3)`.
- [ ] **Step 5 — `WatchersRoster`.** Named rows: 28px avatar + handle as **plain text** (no link — no profile pages exist; gap-report #2). Anon rows collapse into one `rosterOthers(n)` summary row above a `var(--border)` divider. `anonymousCount = total - named.length`.
- [ ] **Step 6 — `WatchersSkeleton`.** Three shimmering 24px discs + a 132px bar, `role="status"` + `aria-live="polite"` + `aria-busy="true"` + visually-hidden `copy.loading`. Reserves `minHeight: 28` so the hero does not shift. The `wShimmer` keyframes go in `apps/web/src/app/globals.css` alongside the other shipped animations (`fbSpin`, `dlSweep`) — **not** an injected `<style>` tag as the prototype does at `watchers-surface.jsx:12-21`. Guard with `@media (prefers-reduced-motion: reduce)`.
- [ ] **Step 7 — tests.** All four §4 states render the right sentence; `total: 0` renders nothing; `loading` renders `role="status"` and no sentence; expander toggles `aria-expanded` and reveals/hides the roster; roster shows the anon summary row and **no** fabricated letter for handle-less entries; no rendered element is an `<a>`; no string in the tree is absent from `CONSUMER_COPY.watchers`.

### Task 9: Client query hook

**Files:**

- Create: `apps/web/src/lib/queries/use-event-watchers.ts`

**Interfaces:**

```ts
export const eventWatchersQueryKey = (eventId: string, userId: string | null | undefined) =>
  ['event-watchers', eventId, userId ?? null] as const

export function useEventWatchers(eventId: string)
```

**Steps:**

- [ ] **Step 1 — key by viewer.** The response is self-excluded, so the key includes `userId` — the same account-switch reasoning documented at `apps/web/src/lib/queries/use-taste-picks.ts:11-15`. A shared key would serve the previous account's exclusion set after a switch.
- [ ] **Step 2 — fetch.** `apiClient.get<EventWatchersResponse>('/v1/events/${eventId}/watchers', token)`; `enabled: !!isSignedIn`; `staleTime: 60_000`. Follows `use-watching.ts:14-30`.
- [ ] **Step 3 — validate the boundary.** Zod `safeParse` the response (`z.object({ total: z.number().int().nonnegative(), named: z.array(z.object({ handle: z.string(), avatarColor: z.enum(['signal','accent','success','warning']).nullable() })) })`); throw on failure so React Query surfaces an error state rather than rendering unvalidated data. No `as`.
- [ ] **Step 4 — refresh on toggle.** In `apps/web/src/lib/queries/use-watch-toggle.ts:76-78`, extend `onSettled` to also `invalidateQueries({ queryKey: ['event-watchers'] })` (prefix match). Self-exclusion means the viewer's own toggle doesn't change their own numbers — but it does change what *other* viewers see, and invalidating keeps a long-lived tab honest at near-zero cost.

### Task 10: `WatchZone` — retire the count, rehome the hint

**⚠️ Scope trap found in the code.** `WatchShowButton` is mounted on three surfaces — event detail (`page.tsx:175`), `EventCard.tsx:144`, and `HeroEventCard.tsx:117`. The two card surfaces pass no `watchingCount`, so today's count tail already never renders there. If the rehomed `watchHint` were added *inside* `WatchShowButton`, it would appear under every card in every list — a visual regression across the whole browse grid. **The hint therefore lives in `WatchZone`, not in the button.**

**Files:**

- Create: `apps/web/src/components/consumer/watchers/WatchZone.tsx`
- Create: `apps/web/src/components/consumer/watchers/WatchZone.test.tsx`
- Modify: `apps/web/src/components/consumer/watch-show-button/WatchShowButton.tsx` — delete the count block (`:334-362`) and the now-unused `watchingCount` prop (`:28`, `:34`)
- Modify: `apps/web/src/components/consumer/watch-show-button/WatchShowButton.test.tsx` — drop the count assertions
- Modify: `apps/web/src/app/(protected)/(main)/events/[id]/page.tsx` — swap `<WatchShowButton …/>` (`:174-180`) for `<WatchZone eventId={event.id} initialWatching={event.isWatching} />`

**Interfaces:**

```tsx
<WatchZone eventId={string} initialWatching={boolean} />
```

**Steps:**

- [ ] **Step 1 — layout.** `'use client'`, `flex flex-col items-start gap-3` (12px, per the handoff's locked adjacency at `watchers-surface.jsx:266`). Row 1 `<WatchShowButton>` (**unchanged visually — the button is not ours to restyle**), row 2 the hint (inactive only), row 3 `<WatchersSurface>`.
- [ ] **Step 2 — derive `isWatching` without prop drilling.** `WatchZone` calls `useWatching()` itself and mirrors the derivation at `WatchShowButton.tsx:86-91` (`cacheIsReady ? cache.some(...) : initialWatching`). Same hook, same React Query cache entry, no extra request, no lifted state.
- [ ] **Step 3 — the hint.** `copy.watchers.watchHint` in `var(--fg-subtle)`, rendered only when `!isWatching`. Brief lock Q6's surviving affordance.
- [ ] **Step 4 — the surface.** `const { data, isPending } = useEventWatchers(eventId)`; `<WatchersSurface data={data} loading={isPending && isSignedIn} />`. Signed out → `useEventWatchers` is disabled, `data` is undefined, `isPending` is gated → surface returns `null`. Brief lock Q5 with no extra branch.
- [ ] **Step 5 — remove the prop.** Delete `watchingCount` from `WatchShowButtonProps`; `page.tsx` stops passing `event.watching`. Confirm the three call sites typecheck.
- [ ] **Step 6 — tests.** Hint shows when not watching and disappears when watching; the count string `'watching ·'` appears nowhere in the rendered tree; the surface renders under the button in DOM order; signed-out renders the button with neither hint-dependent fetch nor surface; the existing `WatchShowButton` suite still passes (`PostWatchSheet` / push-permission behavior is untouched).

### Task 11: Release notes, progress, PR-B

**Files:**

- Modify: `apps/web/src/lib/definitions/releases.ts` — new `kind: 'added'` item on the current release: *"See who else is watching a show — named handles from the crawl, right under the Watch button."* No spotlight (no asset exists in `design/design_handoff_spotlight_heroes/` for this ticket).
- Modify: `docs/superpowers/progress.md` — one ✅ Complete row dated 2026-07-27.

**Steps:**

- [ ] Branch `feat/762-who-else-is-watching`. PR body uses `.github/pull_request_template.md` and carries **`Closes #762`**. No new env vars.
- [ ] Run the `design-review` skill against `design/design_handoff_who_else_is_watching/` **before** `gh pr create` — hard gate for any visual PR.
- [ ] Manual staging pass, all four states + skeleton + roster, mobile 320/390 and desktop, across all nine themes: seed one show with 1 handled watcher, one with 3, one with 4 handled + several handle-less, one with only handle-less watchers, and one with zero.
- [ ] `./scripts/request-copilot-review.sh <pr>` after opening and after every fix push.

---

## Files

**Create**

| File | Role |
| --- | --- |
| `apps/api/src/lib/event-watchers.ts` | `getEventWatchers()` + `ROSTER_CAP` |
| `apps/api/src/routes/event-watchers.integration.test.ts` | privacy negatives + positives |
| `apps/web/src/lib/watchers.ts` | headless sentence model, `NAMED_CAP` |
| `apps/web/src/lib/watchers.test.ts` | model unit tests |
| `apps/web/src/lib/queries/use-event-watchers.ts` | React Query hook + Zod boundary |
| `apps/web/src/components/consumer/watchers/WatchersSurface.tsx` | the surface (4 states + hide) |
| `apps/web/src/components/consumer/watchers/WatcherAvatarStack.tsx` | overlapping stack + `+N` chip |
| `apps/web/src/components/consumer/watchers/WatchersRoster.tsx` | expanded roster |
| `apps/web/src/components/consumer/watchers/WatchersSkeleton.tsx` | loading skeleton |
| `apps/web/src/components/consumer/watchers/WatchZone.tsx` | button + hint + surface composite |
| `apps/web/src/components/consumer/watchers/index.ts` | barrel |
| `apps/web/src/components/consumer/watchers/*.test.tsx` | surface / stack / zone tests |

**Modify**

| File | Change |
| --- | --- |
| `packages/types/src/index.ts` | `EventWatcher`, `EventWatchersResponse` |
| `apps/api/src/routes/events.ts` | `GET /:id/watchers` handler |
| `apps/web/src/components/consumer/definitions/copy.ts` | add `watchers`; delete `watchShowButton.watchingCount` |
| `apps/web/src/components/consumer/watch-show-button/WatchShowButton.tsx` | remove count block + `watchingCount` prop |
| `apps/web/src/components/consumer/watch-show-button/WatchShowButton.test.tsx` | drop count assertions |
| `apps/web/src/lib/queries/use-watch-toggle.ts` | invalidate `['event-watchers']` |
| `apps/web/src/app/(protected)/(main)/events/[id]/page.tsx` | `WatchShowButton` → `WatchZone` |
| `apps/web/src/app/globals.css` | `wShimmer` keyframes + reduced-motion guard |
| `apps/web/src/lib/definitions/releases.ts` | release entry (PR-B) |
| `docs/superpowers/progress.md` | ✅ row (PR-B) |

---

## Tests

**API integration** (`event-watchers.integration.test.ts`) — seven negatives (self excluded · handle-less never named · response keys are exactly `handle`+`avatarColor` · missing profile row is not a leak · clearing a handle removes the name · anonymous → 401 · `going`/`interested` excluded) plus zero-watchers, ordering, `ROSTER_CAP` truncation, bad uuid → 404, hidden event → 404.

**Web unit** (Vitest + Testing Library) — `watchers.ts` sentence/aria parity across all four states and the cap edge; `WatchersSurface` renders each state, hides at `total: 0`, skeleton exposes `role="status"`, expander toggles `aria-expanded`; `WatcherAvatarStack` gives handle-less discs no letter; `WatchZone` shows the hint only when not watching and never renders the retired count string.

**Manual (staging)** — all four states seeded, mobile 320/390 + desktop, all nine themes, keyboard-only path to the expander, VoiceOver reads the sentence as one prose utterance, reduced-motion kills the shimmer, zero-watcher page reflows with no gap.

---

## Adjacent-ticket contracts

- **#794 Logged-out UX** owns the signed-out treatment and makes event detail public. **Contract:** the surface's signed-out gate is exactly two lines — `enabled: !!isSignedIn` in `use-event-watchers.ts` and the `401` branch in the route handler. #794 relaxes both (self-exclusion becomes a no-op when `getAuth()` is null, and `total` becomes the full watcher count), then flips integration Negative 6 from "401" to "returns data with no exclusion". Nothing else in this feature is signed-in-specific. #794 must also decide whether `Cache-Control` can loosen to `public` for anonymous callers — with no viewer to exclude, the response becomes cacheable.
- **#1115 Artist page** — **file collision, low risk.** Both tickets edit `apps/web/src/app/(protected)/(main)/events/[id]/page.tsx` (#1115 for the supporting-artist link affordance in `EventTitleBlock`, `page.tsx:163-171`; this ticket for the Watch strip, `page.tsx:174-180`) and both add a block to `apps/web/src/components/consumer/definitions/copy.ts`. Adjacent hunks, ~10 lines apart — a trivial rebase if both are open at once, no shared component. Whichever merges second rebases.
- **#1096 Attending signal (v2)** — out of scope. No `attending_at` read, no `going`/`interested` status anywhere; Negative 7 pins that shut.

---

## Out of scope

- **Attending / "going" signal** — #1096, blocked on #55.
- **Signed-out treatment** — #794 (contract named above).
- **Follow graph, "people you trust" ordering** — no graph exists; `createdAt DESC` is the ordering, and a graph would only change the sort.
- **User profile pages** — handles are plain text, never links (gap-report #2).
- **A per-watch privacy opt-out** — setting/clearing the handle *is* the mechanism (lock Q2), proven by Negative 5.
- **"A new watcher joined" notifications**, watcher activity feed — different tickets.
- **Changing the Watching feature itself** — the toggle, the list page, and the `Eye` affordance are untouched.
- **Removing `EventDetailResponse.watching`** — the field stays (published type, `packages/types/src/index.ts:679`) and simply loses its UI consumer. A later cleanup PR can drop it and its query at `events.ts:634-639` once nothing external reads it.
- **`user_events(event_id, status)` index** — `userEvents` is indexed only on `(user_id, event_id)` (`packages/db/src/schema/social.ts:51-54`), so both the existing count and the new join scan by `event_id`. At 50–200 beta users this is noise; the existing count query has run this way in prod since launch. Trigger to revisit: watcher rows per event into the thousands, or the endpoint showing up in Neon slow queries. Additive index, expand-only, no contract.
- **The `heroes.watchers` marketing copy** — the marketing hero and in-app detail may diverge (brief §6).
