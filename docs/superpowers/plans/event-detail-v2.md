# Event Detail v2 — Implementation Plan

**Issue:** #195
**Branch:** feat/event-detail-v2
**Design:** design/design_handoff_event_detail_v2/
**Spec:** design/design_handoff_event_detail_v2/design_handoff_event_detail_v2/README.md

## Tasks

- [ ] Task 1: Add `--trust-community` token to all three theme files (electric/jade/light)
- [ ] Task 2: Update `TrustMark` in `PriceDisplay.tsx` — azure for community, warning for resale
- [ ] Task 3: Update `PriceDisplay.tsx` (PriceBlockB) — TrustMark inline in headline for resale/community; guard `WatchAffordance` with `false &&`
- [ ] Task 4: Create `WatchShowButton` component — 3 states (inactive/active/confirming)
- [ ] Task 5: Create `SetlistPreview` component — collapsible card, renders null when no setlist
- [ ] Task 6: Create `SoldOutCTA` component — disabled button shape for soldout price status
- [ ] Task 7: Create `SubmitPriceCardCTA` component — card CTA linking to `/events/[id]/submit-price`
- [ ] Task 8: DB migration — add `setlist jsonb` nullable to events; add `watching` count + `isWatching` to GET /v1/events/:id
- [ ] Task 9: Add `POST /v1/events/:id/watch` and `DELETE /v1/events/:id/watch` API endpoints
- [ ] Task 10: Rewire Event Detail page — remove price from info grid, add Watch strip + PriceBlockB card + SubmitPriceCardCTA + SetlistPreview, route SoldOutCTA vs Get Tickets

## Key file paths

- Theme files: `apps/web/src/styles/themes/` (or similar)
- PriceDisplay: `apps/web/src/components/consumer/PriceDisplay.tsx`
- Events API: `apps/api/src/routes/events.ts`
- Watching API: `apps/api/src/routes/watching.ts`
- DB schema: `packages/db/src/schema/events.ts`
- Migrations: `packages/db/drizzle/`
- Event Detail page: `apps/web/src/app/(protected)/events/[id]/page.tsx`
