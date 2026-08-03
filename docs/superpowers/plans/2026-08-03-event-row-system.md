# Event Row system — unified Browse / Venue / Watching row — Implementation Plan

**Ticket:** none. This handoff entered outside Track 2 intake — Hugh authored the audit himself after noticing event rows "were starting to get cluttered and drift in consistency." Tracked in `docs/superpowers/design-pipeline-status.md` under the `— (no source ticket)` convention. Phase **beta** · Priority **normal**.
**Design handoff:** `design/design_handoff_event_row_system/` — 🟢 Green at R3 (PR #1399, 2026-08-03), R1 🟡 → R2 → R3. **No `READINESS.md`**: Hugh ran the audit, so the verdict lives in `README.md` §8/§9 and the PR thread.
**Eng kickoff brief:** `design/design_handoff_event_row_system/CLAUDE_CODE_PROMPT.md`

**Goal:** Collapse the event-row dialects into one `EventRow` governed by a slot contract, so a feature can no longer buy space on the row by arriving with its own pill. The row is four lines max, the surface declares what context it already carries (Rule 1), and the meta line runs a fixed two-chip budget that measures itself (Rule 2).

**Architecture:** One `apps/web/src/components/consumer/event-row/` folder exporting `EventRow` + `EventRowList`, a `SURFACES` config keyed by `'browse' | 'venue' | 'watching'`, one `RowMetaChip` replacing five ad-hoc pills, and two `ResizeObserver` measure passes (the meta budget and the line-3 drop ladder). One API change ahead of it to make provenance mean the same thing on every surface. No schema change, no migration.

---

## What the production audit found that the handoff does not say

The handoff was written against the design prototypes. Four things about the shipped code materially change the plan, and one of them is a live bug. **Read this section before the task list.**

### 1. Browse and Venue are already one component

`EventCard` (`apps/web/src/components/consumer/event-card/EventCard.tsx:41-177`) already serves both — Browse via `apps/web/src/components/consumer/events-list/EventsList.tsx:127`, Venue via `apps/web/src/components/consumer/venue-event-list/VenueEventList.tsx:100`. The handoff's "the Browse/Venue row" is one file, not two. What differs between the surfaces is only what Rule 1 wants to subtract, which is the point.

**Consequence:** the consolidation is 3 → 1, not 2 → 1, and the Browse/Venue split is a `SURFACES` config entry from day one rather than a refactor.

### 2. There is a THIRD row the handoff never names

`apps/web/src/components/consumer/artist-page/ShowRow.tsx` renders event rows on the artist page (#1115, shipped 2026-08-03) with its own `DateStamp`, its own `PriceChip`, its own `StatusPill` usage and its own `WatchShowButton`. It is a fourth dialect of the same object, shipped after the drift this handoff diagnoses and before the fix landed.

**This plan does not convert it.** Design never looked at the artist row, its left-hand `DateStamp` is a genuinely different reading pattern, and folding it in would mean designing a fourth `SURFACES` entry in engineering — exactly the drift the handoff exists to stop. It is scoped out and filed back to Design (see **Open calls**). The `SURFACES` config is built so adding it later is a config entry, per the handoff's own §6.

### 3. Provenance already reaches Browse — and Watching disagrees with itself

The handoff's non-negotiable is that provenance keys off production's `source_category`. Half of that is already true and half is a bug.

- **Browse/Venue already do it.** `pickBrowseHeadline` (`apps/web/src/components/consumer/price-region/lib/pick-headline.ts:43-52`) reads `block.headline.sourceCategory` off `TierPriceBlock` (`packages/types/src/index.ts:650-661`) — the real enum, sourced from `priceSubmissions.sourceCategory` (`packages/db/src/schema/prices.ts:63-67`). Venue builds the same blocks at `apps/api/src/routes/venues-public.ts:309-345`.
- **But it re-translates on the way out.** `kindFromCategory` (`apps/web/src/components/consumer/price-region/lib/pick-headline.ts:24-29`) maps the enum onto a parallel `BrowseHeadlineKind = 'boxoffice' | 'community' | 'resale'`. That is a second vocabulary living one function away from the first — a translation layer that exists only to rename `standard` to `community`. The handoff's `PROVENANCE` lookup does the same job correctly by keying the *label* off the enum and never renaming the *key*.
- **Watching is worse, and it is a live bug.** `apps/api/src/routes/watching.ts` computes `currentPrice` and `priceObservedAt` from the corroborated tier headline (`lowestHeadlinePrice` / `lowestHeadlineObservedAt`, `apps/api/src/lib/price-aggregation/build-price-by-tier.ts:107-121`) but computes `sourceKind` from `mapSourceKind(row.priceSource)` (`apps/api/src/routes/watching.ts:25-32`) — the event scalar's *crawler origin*, a different field describing a different price.

  So the price a Watching row shows and the provenance chip beside it can describe two different prices. A community-submitted headline can render with no chip because the scalar says the crawler found it; `mapSourceKind` has no `boxoffice` branch at all, so a box-office price is unrepresentable there. This is precisely the class #1364/#1365/#1366 fixed for price and staleness — provenance was left behind.

**Consequence:** PR-A is not "plumb a new field through." It is finishing the single-source-of-truth work, and it fixes a real mismatch independent of the row redesign. It goes first.

Note that `sourceCategory` is `null` for crawler-sourced prices, which have no submission row. That is exactly the handoff's `primary` value — **null IS `primary`**, and it renders no chip. No `'primary'` literal needs to exist in the type.

### 4. `compact` and `roomy` are already dead

`WatchingItem` takes a `density` prop with three branches (`apps/web/src/components/consumer/watching/WatchingItem.tsx:94-99`, `DENSITY_CONFIG`), but the only call site passes `density="cozy"` (`apps/web/src/components/consumer/watching/WatchingContent.tsx:235`). The handoff says cozy ships and compact/roomy "stay supported." Production says the other two branches are unreachable.

**Consequence:** per YAGNI, `EventRow` ships **cozy only** — no `density` prop. If a density control is ever wanted it is a new feature with a design pass, not a prop preserved on spec for a caller that does not exist. Flagged in the PR body so the divergence from the handoff is explicit.

### 5. `GoingNudge` is on the Watching row and the handoff does not mention it

`apps/web/src/components/consumer/watching/WatchingItem.tsx:403` renders `GoingNudge` (from #70 / #1357 attendance work). The handoff's four-line contract has no slot for it, and it is not a meta chip — it is a conditional block below the row. It must survive the migration unchanged. `EventRow` takes an optional `footer` slot that Watching fills; it is outside the four-line contract and outside the chip budget, and this is documented so it is not mistaken for a Rule 2 exemption.

---

## Global Constraints

- **TDD** — every measurement helper and every pure formatter lands with its test in the same task. The measure passes are the risk in this feature; test the pure `chooseLevel` / `fitChips` functions directly rather than only through the DOM.
- **Vocabulary is locked** — **Watching**, never Saved / Favorites / Bookmarks. The Watching affordance is the lucide **`Eye`**; **no heart icon exists in this codebase and none is introduced.** On a row the watch state is a non-interactive accent tick on the identity art, `role="img"` with `aria-label`.
- **Provenance vocabulary is production's, not the row's.** Keys are `source_category`: `boxoffice` | `standard` | `resale`, plus `null` for crawled. Labels are the ones admin already renders: **Box office** / **Community** / **Resale**. Do not introduce a fourth spelling; deleting the existing one (`BrowseHeadlineKind`) is a task in PR-B.
- **Tokens only** — every color reads `var(--*)`. No hex in screen code, no Tailwind `dark:` variants.
- **Nine production themes, not three.** The handoff verifies across Electric / Jade / Light because the mock ships three; `userThemeEnum` (`packages/db/src/schema/user-profiles.ts`) ships **nine**. Chip tones (`neutral · strong · warn · signal`) must be contrast-checked on all nine.
- **No literal customer-facing strings in JSX** — all copy into a `definitions/copy.ts` under the new folder. `"from"`, `"$"`, `"Stale"`, `"Sold out"` and the provenance labels are all row-side formatting; none of them belong in the data. Any PR that adds or edits a `definitions/copy.ts` — PR-B for the row's own strings, PR-C for the release note — runs the `copy-review` skill before opening, per the repo convention.
- **No native `title=` tooltips.** Context the visible text does not carry goes in screen-reader-only spans. This bans `title` as a hover-only information channel, not the attribute where ARIA requires it for labeling.
- **TypeScript strict, no `as` casts.** `SourceCategory` already exists (`packages/types/src/index.ts:220`); narrow with type guards.
- **Mobile/desktop parity in the same PR** — non-negotiable. 320 baseline.
- **a11y in the same PR** — chips dropped by the measure pass are `aria-hidden` and stay mounted out of flow so the measure is stable; 44×44 minimum targets (the Watching `⨯` is a 28px paint box padded to 44); status never rides on color alone; the artist name is a real anchor with a stretched-link `::after` rather than a click handler on a `div`.
- **Components** — arrow components, no `handle*` handler names, logic in `lib/`, semantic HTML.
- **Pre-push in the worktree:**
  ```
  pnpm turbo run build --filter=@concert-crawl/types --filter=@concert-crawl/db
  pnpm --filter @concert-crawl/api typecheck && pnpm --filter @concert-crawl/api lint && pnpm --filter @concert-crawl/api test
  pnpm --filter @concert-crawl/web typecheck && pnpm --filter @concert-crawl/web lint && pnpm --filter @concert-crawl/web test
  ```
- **`DATABASE_URL_TEST`** — per-worktree test DB, auto-derived by `apps/api/src/test/setup/global-setup.ts`. Never the shared `concert_crawl_test`.
- **Release notes** — PR-C is the user-visible one (the Watching row changes shape and Browse loses its eye). One entry in `apps/web/src/lib/definitions/releases.ts` on that branch. PR-A and PR-B are invisible in isolation; no entries.
- **`progress.md`** — one ✅ row lands with PR-C.

---

## Sequencing lock

| PR   | Scope | Depends on |
| ---- | ----- | ---------- |
| PR-A | API — provenance parity: `lowestHeadlineSourceCategory`, Watching's `sourceKind` → `priceSourceCategory`, `mapSourceKind` deleted | none |
| PR-B | The `EventRow` component + `SURFACES` + `RowMetaChip` + both measure passes, wired to **Browse and Venue only**. `EventCard` deleted. | PR-A (provenance shape settled) |
| PR-C | Watching migrated onto `EventRow`. `WatchingItem`, `SourcePill`, `DeltaTag` deleted. Release note + `progress.md`. | PR-B |

Three PRs, strictly sequential — every one of them touches the same new folder, so there is no parallel lane here. PR-B and PR-C are each a delete-and-replace of a live consumer surface; they do not get bundled.

---

## PR-A — Provenance parity in the API

**Why first:** the row cannot render a provenance chip off `source_category` on Watching until Watching actually sends it, and today it sends a different field describing a different price. This PR is independently correct and independently shippable.

### Task A1 — `lowestHeadlineSourceCategory`

Add the sibling export next to `lowestHeadlineObservedAt` in `apps/api/src/lib/price-aggregation/build-price-by-tier.ts:117-121`, reading `lowestHeadline(blocks)?.sourceCategory ?? null`. Same `lowestHeadline` helper, same null semantics: null means no corroborated submission, i.e. a crawled price.

Test in `build-price-by-tier.test.ts`: returns the cheapest tier's category; returns `null` for empty blocks; returns `null` when every headline is null; **and returns the category from the same block `lowestHeadlinePrice` picked** — the three helpers must never disagree about which headline they are describing.

### Task A2 — Replace `WatchingShow.sourceKind`

In `packages/types/src/index.ts` (`WatchingShow`, ~line 1062): replace `sourceKind: 'primary' | 'resale' | 'community' | null` with `priceSourceCategory: SourceCategory | null`.

In `apps/api/src/routes/watching.ts`: set it from `lowestHeadlineSourceCategory(priceByTierByEventId.get(row.eventId) ?? [])`. **Delete `mapSourceKind` (lines 25-32) entirely** and drop `priceSource` from the row select if nothing else reads it.

Test in `apps/api/src/routes/events-watch.integration.test.ts`: a watched event whose cheapest corroborated submission is `boxoffice` returns `priceSourceCategory: 'boxoffice'` — the case `mapSourceKind` could not represent at all. A crawler-priced event returns `null`. An event whose scalar `priceSource` disagrees with its corroborated headline returns the **headline's** category; this is the regression test for the bug in finding 3.

### Task A3 — Keep the web app compiling

`WatchingItem.tsx` and `SourcePill.tsx` read `show.sourceKind`. PR-A is not the redesign, so adapt at the read site: derive the old three-value display from the new field so `SourcePill` renders the same thing it does today, with `boxoffice` newly reachable and rendering the `Box office` label admin uses. Both files are deleted in PR-C; this is a two-line bridge, not a new abstraction.

---

## PR-B — `EventRow`, wired to Browse and Venue

New folder `apps/web/src/components/consumer/event-row/`.

### Task B1 — The row's data shape

`lib/row-model.ts`. One `EventRowShow` matching the handoff §5:

```
price: { amount, isFloor, source: SourceCategory | null, observedAt } | null
saved: { at, price } | null        // Watching only
supports: string[]
status: 'live' | 'soldout' | 'presale'
```

Plus adapters — `fromEventWithVenue()` and (in PR-C) `fromWatchingShow()` — that normalize the two API responses into it. **No display copy in the data**; `"from $68"` as a string does not survive this PR.

The adapter reuses `pickBrowseHeadline` for the amount rather than reimplementing tier selection, and takes `source` straight off the same headline. Test the adapters against realistic API fixtures including: no price, tier-only price, legacy scalar-only price, and sold out.

### Task B2 — `SURFACES` and Rule 1

`definitions/surfaces.ts`. Per-surface: `carries` (what the context already states, so the row subtracts it), the meta-chip priority order, whether an action gutter exists, `carded` vs divided.

| Surface | Carries | Line 3 renders | Chip priority |
|---|---|---|---|
| browse | date group headers | time · venue | following → genre |
| venue | the venue | date · time | following → genre |
| watching | nothing (loose windows) | date · time · venue | freshness → provenance |

Adding a surface must be an entry here and nothing else. Test that each surface's line-3 unit list is derived from `carries` rather than hardcoded per surface.

### Task B3 — `RowMetaChip`

One component. Same size, radius, mono uppercase, letter-spacing; **tone is the only variable** (`neutral · strong · warn · signal`). Contrast-check all four tones across all nine themes.

### Task B4 — Rule 2, the measured meta budget

`MetaRow` + a pure `fitChips(candidates, availableWidth, measuredWidths)` in `lib/`. Budget is two chips, one when a support line is present. Overflowing chips stay mounted and `aria-hidden` so the `ResizeObserver` measure pass is stable — but they must be mounted **out of flow** (an absolutely positioned measurement container, `visibility: hidden`, `pointer-events: none`). `visibility: hidden` alone still occupies layout, so the chips the budget just rejected would go on widening the meta column and feed a corrupted `availableWidth` back into the next measure pass. Chips are never sliced and never wrap.

Test `fitChips` directly with synthetic widths — including the handoff's stated case that `Stale · 9d ago` alone fills a 320 meta column, so provenance drops.

### Task B5 — The line-3 drop ladder

Pure `chooseLevel(measuredWidths, available)` returning 0-3 per handoff §2. **The level comes from measurement, never from the `narrow` flag** — deriving it from `narrow` is the bug that clipped the 390 Watching list. Date and time are `flex-shrink: 0`; the venue is the only unit allowed to ellipsis; at level 2 the venue and its separator drop as one unit.

Separator spacing comes from flex `gap`, **not** from literal `" · "` strings — flex trims leading/trailing whitespace in children and the spaces vanish. Same on the support-billing line.

Test the ladder as a pure function at the handoff's measured geometries, including the level-2 floor of 103px against the 100px narrow column that forced price min-width to 56.

### Task B6 — `PriceStack`

Price rendering identical on every surface; `from $` only when `isFloor`. **The delta is gated on surface, not data** — it renders on Watching and nowhere else, because Browse fixtures do carry a `saved` price and a Browse price must never go green.

`status === 'soldout'` short-circuits the slot: renders the Sold out chip instead of price + delta, spends **no** chip budget, and **dims the artwork, not the row** (a row-level opacity pushes `--fg-muted` toward the AA floor). Document it in code as Rule 2's one exemption so it is not read as a chip that won the budget.

Staleness comes from `isPriceStale` / `relTimeAgo` in `apps/web/src/components/consumer/lib/staleness.ts` — **import, do not reimplement.** That file is the single source of truth from #1366.

### Task B7 — Narrow, and the row as a link

`narrow` (≤360) shrinks art 56→44, gap 14→10, title 15.5→14.5, price min-width 78→**56**. The action gutter is 36px and exists **only on surfaces that have an action** — do not reserve it on Browse/Venue, where at 320 it collapses the title column to 80px.

The artist name is a real anchor with a stretched-link `::after`. This needs a real stylesheet rule, not inline styles.

### Task B8 — Wire Browse and Venue, delete `EventCard`

Swap `apps/web/src/components/consumer/events-list/EventsList.tsx:127` and `apps/web/src/components/consumer/venue-event-list/VenueEventList.tsx:100` onto `EventRow`. Delete `EventCard.tsx` and its test, migrating the test's coverage (tier-price resolution, legacy fallback, Following chip) onto the new adapters and row.

**Delete the interactive eye from Browse/Venue rows** — `WatchShowButton` at `apps/web/src/components/consumer/event-card/EventCard.tsx:144`. Watching becomes a non-interactive accent tick on the identity art. This is a deliberate behavior removal ruled by the handoff (§2 "Watching state is not a row object"), and it settles the Spotify Sync R1 conflict in R1's favor. The toggle remains on Event Detail. `WatchShowButton` itself is **not** deleted — Event Detail and `ShowRow` still use it.

Delete `kindFromCategory` and the `BrowseHeadlineKind` type from `pick-headline.ts`; `pickBrowseHeadline` returns `SourceCategory | null` directly and the row owns the labels.

### Task B9 — Retire the ad-hoc pills on these surfaces

`GenreChips` and `FollowingChip` usage on the row becomes `RowMetaChip`. Leave the components in place if other surfaces still import them; remove them if the row was the last caller. Check before deleting.

---

## PR-C — Watching onto `EventRow`

### Task C1 — `fromWatchingShow` adapter

Maps `WatchingShow` onto `EventRowShow`, using `priceSourceCategory` from PR-A. `saved` comes from `savedPrice` / `savedAt`.

### Task C2 — Wire `WatchingContent`, delete the old row

Swap `apps/web/src/components/consumer/watching/WatchingContent.tsx:235` onto `EventRow` with `surface="watching"` and `carded`. Delete `WatchingItem.tsx`, `SourcePill.tsx`, `DeltaTag.tsx` and the density config. **Ships cozy-only — no `density` prop** (finding 4).

Preserve, unchanged: the group headers (Tonight / This week / month names) stay in `design_handoff_watching` and are not re-specced; the `⨯` remove action and its 44px target; and **`GoingNudge`**, which moves to `EventRow`'s optional `footer` slot (finding 5) and is explicitly outside the four-line contract and the chip budget.

Migrate `WatchingItem.test.tsx`'s coverage — the delta classification, the stale marker, the remove callback — onto the new row rather than deleting it.

### Task C3 — The truncation regression test

The bug that motivated the handoff: the live Watching row truncates the **date** away (`"Mission Ballroom · Sat…"`). Lock it. At 320 and at 390, with a long venue and a long artist, assert the date is present and the venue is what shrank.

### Task C4 — Release note + `progress.md`

Release note covers the two user-visible changes: the Watching row's new shape, and the eye leaving Browse rows (with Event Detail named as where watching is toggled). Run it through the `copy-review` skill. One ✅ `progress.md` row.

---

## Open calls — for Hugh and Design, not settled here

1. **The `boxoffice` chip's tone.** The R3 audit assigned it `strong`; Design did not. Admin renders box office in gold, and the row's tone set has no gold. Either Design adds a tone or confirms `strong`. **PR-B blocks on this only for the token value** — the lookup ships either way.
2. **Freshness vs provenance at 320.** Rule 2's priority order means a stale box-office price drops its provenance chip on a narrow Watching row (README §2 calls this out deliberately). Correct as specified, but it is a priority-order decision. If box office should outrank staleness, that is a one-line change to the `SURFACES` watching priority.
3. **The artist-page `ShowRow` (finding 2).** A third row dialect exists that the handoff never saw, and after this epic it will be the only surface with an interactive eye on a row — a new inconsistency created by fixing the old one. It should go back to Design as a short addendum: does the artist page become a fourth `SURFACES` entry, or is its `DateStamp` layout a deliberate difference? **Not an eng call.** Filed as [#1418](https://github.com/HartiganHM/concert-crawl/issues/1418) — a short addendum against the existing handoff, not a new design cycle. It should be answered before PR-B merges, so the answer arrives before the pattern sets.

---

## Out of scope

- `apps/web/src/components/consumer/artist-page/ShowRow.tsx` — see open call 3 and [#1418](https://github.com/HartiganHM/concert-crawl/issues/1418).
- Event Detail's price region (`PriceDisplay.tsx`) — a different surface with a different contract, and #1387's plan (`2026-08-03-event-detail-cta-tooltip.md`) is already touching it. **Watch for collision on Event Detail during PR-C**; this plan does not enter that file.
- `design/design_handoff_browse_row_right_column/` — shelved, superseded by this handoff. Do not build from it.
- Any schema change. `source_category` has shipped since migration 0040; this plan reads it, it does not alter it.
