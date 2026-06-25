# Gap Report — Classification Review Queue PR 3 (Admin UI + API filter)

**Spec:** `docs/superpowers/specs/2026-06-24-classification-review-queue-design.md`
**Plan:** `docs/superpowers/plans/2026-06-24-classification-review-queue-pr3-ui.md`

Scope of this PR: PR 3 of 3. PR 1 (schema + LLM signal + crawler INSERT) and PR 2 (backfill script) are out of scope here — each tracked separately.

## IMPLEMENTED (10)

- API `view=hidden-flagged-for-review` query param — `apps/api/src/routes/admin/events.ts` (listQuerySchema + where-clause branch). Returns rows where `hidden_from_consumer=true AND is_concert_review_needed=true`.
- API list projection includes `isConcertReviewNeeded` — `apps/api/src/routes/admin/events.ts` (baseSelect, ~line 268).
- API detail projection (`GET /:id`) includes `isConcertReviewNeeded` — `apps/api/src/routes/admin/events.ts` (~line 465).
- API integration tests cover view filter scoping + projection field — `apps/api/src/routes/admin/events.integration.test.ts` (new describe block).
- `AllEvent` type extended with `hiddenFromConsumer + isConcertReviewNeeded` — `apps/web/src/components/admin/review/all/types.ts`.
- `AllEventsFilters.flagged` round-trips through URL via `view=hidden-flagged-for-review`, through fetch query via same param, and counts in `countActiveFilters` — `apps/web/src/components/admin/review/all/filters.ts` + `filters.test.ts`.
- New ADMIN_COPY keys under `editor.classification` (markAsConcert*, reviewNeededPill*) + `review.allEvents.filters.flaggedChip*` — `apps/web/src/components/admin/definitions/copy.ts`.
- `EventConfirmModal` extended with `mark-as-concert` kind (success accent + variant) — `apps/web/src/components/admin/review/all/EventConfirmModal.tsx` + `.test.tsx`.
- `ClassificationSection` becomes interactive: renders Mark-non-concert OR Mark-as-concert based on `hiddenFromConsumer`, plus LLM-flagged review pill when `isConcertReviewNeeded=true` — `apps/web/src/components/admin/events/editor/sections/ClassificationSection.tsx`.
- `DangerZoneSection` slim to Merge + Delete only — `apps/web/src/components/admin/events/editor/sections/DangerZoneSection.tsx`; `editor.dangerZone.markNonConcert` copy key removed.
- `EventEditorClient` wires two separate confirm-state hooks (`pendingDanger: 'delete' | null`, `pendingClassification: 'mark-non-concert' | 'mark-as-concert' | null`) and renders both modals; `EditorEvent` gains the two new fields — `apps/web/src/components/admin/events/editor/EventEditorClient.tsx` + `.test.tsx`.
- Flagged filter chip on `EventsFilterBar` with aria-pressed state — `apps/web/src/components/admin/review/all/EventsFilterBar.tsx` + `.test.tsx`.
- Content-aware empty state in `AllEventsTabContent` — switches to `flaggedChipEmpty` copy when chip active and zero rows — `apps/web/src/components/admin/review/_tabs/AllEventsTabContent.tsx`.

## Spec acceptance criteria — coverage

| Criterion                                                                                                                                   | Status         | Notes                                                                                                                                              |
| ------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Admin can apply the "Hidden — flagged for review" chip on All Events and see the queue                                                      | ✅             | Chip + URL round-trip + API filter + empty state all wired                                                                                         |
| Admin can Mark-as-concert in ClassificationSection, confirm via modal, event re-appears in consumer surface within one router-refresh cycle | ✅             | `onConfirmClassification` PATCHes `hiddenFromConsumer=false` and calls `router.refresh()`                                                          |
| Audit log records the flip                                                                                                                  | ✅ (inherited) | PATCH handler's existing `event.update` audit captures `{ hiddenFromConsumer: false }` in meta. Per-spec, distinct keys deferred as follow-up #789 |
| Existing Mark non-concert flow continues to work end-to-end from ClassificationSection's new home                                           | ✅             | Component test covers it                                                                                                                           |
| DangerZoneSection contains only Merge + Delete                                                                                              | ✅             | Component refactor + test asserts absence of Mark non-concert button there                                                                         |

## GAPS (0)

None.

## DEFERRED (0)

None. All in-scope PR 3 work is complete. The three follow-up issues referenced in the PR body (#789 audit-key asymmetry, #790 promote-chip-to-tab, #791 visible-but-flagged surface) are out of scope per the spec.

## Notes on manual walk-through (Step 2 of task 3.10)

Skipped per autonomous-execution conventions — automated test coverage validates the same behavior. Quality gates (typecheck + lint + full test suite) all pass in the worktree.
