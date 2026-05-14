# Event Detail v2 — Implementation Plan

**Issue:** #195
**Branch:** feat/event-detail-v2
**Design:** design/design_handoff_event_detail_v2/
**Spec:** design/design_handoff_event_detail_v2/README.md

## Tasks

- [x] Task 1: Add `--trust-community` CSS token (`oklch(0.62 0.12 240)`) to all three theme files (electric/jade/light)
- [x] Task 2: Update `TrustMark` in `PriceDisplay.tsx` — use `--trust-community` for community tier (was `--fg-muted`), keep `--warning` for resale; update pill bg accordingly
- [x] Task 3: Update `PriceDisplay.tsx` (PriceBlockB) — render `TrustMark` inline in headline when `sourceKind` is resale or community; guard `WatchAffordance` with `false &&`; restrict sparkline to ≥4 datapoints AND sourceKind not community/boxoffice
- [x] Task 4: Create `WatchShowButton` component — 3 states (inactive/active/confirming) per README specs (28px height, Inter 600 12px, accent tint on active, warning on stop-watching; count strip in JetBrains Mono 9.5px)
- [x] Task 5: Create `SetlistPreview` component — collapsible card; closed shows first 3 songs + N more; open shows full numbered list with Encore divider; renders null when setlist missing/empty; accepts `dense` prop
- [x] Task 6: Create `SoldOutCTA` component — disabled 48px full-width button; bg `--surface-1`, border `--border`, text `--fg-subtle`; same shape as live CTA (no SOLD OUT chip — that lives on the price card)
- [x] Task 7: Create `SubmitPriceCardCTA` component — full-width card-shape CTA ("Saw a different price?"); routes to `/events/[id]/submit-price`; only rendered when a price exists
- [x] Task 8: DB migration — watching uses `user_events` table with `status='watching'` (migration 0010); `setlist` jsonb column added to `events` (migration 0017); watching count + isWatching in GET /v1/events/:id response
- [x] Task 9: API — watching endpoints implemented: `POST /v1/events/:id/watch`, `DELETE /v1/events/:id/watch` (events.ts); `GET /v1/watching` (watching.ts); EventDetailResponse includes `watching` count + `isWatching`; types updated
- [x] Task 10: Rewire Event Detail page — removed heart/save icon; WatchShowButton below title; SubmitPriceCardCTA conditional on price existence; SetlistPreview present; SoldOutCta vs anchor CTA routing; sign-up nudge updated to "watch this show"
- [x] Task 11: Browse page — EventCard updated to use `WatchShowButton` (replaced WatchButton heart icon); wired to watching API via POST/DELETE /v1/events/:id/watch
- [x] Task 12: Mobile nav — "saved" tab renamed to "watching"; heart icon replaced with eye icon (outline ellipse + pupil); route already pointed to `/watching`

## Key file paths

- Theme files: `apps/web/src/styles/themes/` (verify exact paths in worktree)
- PriceDisplay: `apps/web/src/components/consumer/PriceDisplay.tsx`
- New components dir: `apps/web/src/components/consumer/`
- Events API: `apps/api/src/routes/events.ts`
- Watching API: `apps/api/src/routes/watching.ts` (rename from saved.ts if exists)
- DB schema: `packages/db/src/schema/`
- Migrations: `packages/db/drizzle/`
- Event Detail page: `apps/web/src/app/(consumer)/events/[id]/page.tsx` (verify path)
- Browse page: `apps/web/src/app/(consumer)/browse/page.tsx` (verify path)
- Mobile nav: `apps/web/src/components/layout/MobileNav.tsx` (verify path)

## Decisions

- Watching consolidates saved shows — single `watching_shows` table replaces `saved_shows`
- Migration must copy all existing `saved_shows` rows into `watching_shows` before dropping
- Browse card uses full `WatchShowButton` (same component as event detail, not just an icon)
- Desktop layout: max-width 880px column, full-bleed hero behind, margin-top -60px overlap
- `--trust-community` token added to all three themes (consolidates 4 inline sites)
- Heart/save icon removed from event detail (Watch CTA is the single mechanism)
- `SoldOutCTA` is a separate component from `WatchShowButton` — it replaces the Get Tickets button, not the Watch strip
