# Admin · Events Management UI — Design Spec

**Date:** 2026-06-18
**Author:** Hugh + Claude (brainstorm session)
**Design handoff:** `design/design_handoff_admin_events/` (11 files, committed via PR #612)
**Status:** Approved for plan-writing — implementation sliced into 11 PRs

---

## Goals & Scope

### Goal

Implement the Admin · Events Management surface per the design handoff: the "find any event in the system — verified or not — and act on it" surface, plus a canonical full-page event editor.

### In scope

1. Desktop tab pill shell on `/admin/review` (replaces stacked layout; mobile is already tabbed)
2. New "Missing" tab — events the crawler stopped seeing (uses `?missing=true` from #627)
3. New "All events" tab — search, multi-filter bar, sort, row `⋯` menu, bulk dock with typed-DELETE
4. New canonical full-page editor at `/admin/events/[id]/edit` — five numbered sections + sticky save bar + danger zone
5. Mobile pass for every new surface (parity gate per PR)
6. Backend additions: `hidden_from_consumer` column, dismiss-missing PATCH support, filter additions (genre / date range / multi-select missing-data), per-action bulk endpoints, unrestricted DELETE
7. Merge-events affordance (#633) as the final PR

See the **PR-by-PR Breakdown** table below for the 11-slice rollout.

### Out of scope

- Replacing the existing `EventFlagInspector` inline-edit flow (deferred — decision revisited once the editor has mutation actions, PR 7+)
- Saved views (handoff stubs these only)
- Date-range custom picker and Genre popover *contents* — drawn in PR 5, not designed to a token-level mock
- Performance benchmarks on bulk endpoints (cap is the mitigation)

### Success criteria

- Admin can find any event in the system (verified or not), inspect it, and take action: status change, sold-out, verify/unverify, mark non-concert, delete, bulk operate, eventually merge.
- "Hide from consumer" semantics work end-to-end — admin sees row, consumer queries exclude it.
- Mobile parity for every desktop surface.
- Each PR ships its own tests + design-review pass before `gh pr create`.

---

## Architecture & File Layout

### Web routes

```
apps/web/src/app/(protected)/admin/
├── review/                          # existing — restructured in PR 1
│   ├── page.tsx                     # tab shell; renders {tab}Content based on ?tab=
│   ├── loading.tsx                  # existing
│   └── _tabs/                       # new
│       ├── EventFlagsTabContent.tsx       # wraps existing EventFlagsSection
│       ├── PricesTabContent.tsx           # wraps PendingSubmissionsPanel + PriceCoverageTable
│       ├── MissingTabContent.tsx          # PR 2
│       └── AllEventsTabContent.tsx        # stub in PR 1; content in PRs 4–6
└── events/
    ├── page.tsx                     # existing 5-line stub — leave alone
    └── [id]/
        └── edit/
            ├── page.tsx             # PR 3 — server component, loads event + Suspense
            ├── loading.tsx          # PR 3
            └── EventEditorClient.tsx # PR 3 — read-only first; mutations layered PRs 7–9
```

### Admin components

```
apps/web/src/components/admin/
├── review/                          # existing — additions only
│   ├── (existing files unchanged)
│   ├── ReviewTabs.tsx               # PR 1 — tab pill; ?tab= query-param URL state
│   └── missing/                     # PR 2
│       ├── MissingTable.tsx
│       ├── MissingRow.tsx
│       └── MissingRowMenu.tsx
├── events/                          # PRs 3–10 — biggest new directory
│   ├── (existing EventQueueSplit.tsx — leave alone)
│   ├── editor/                      # PR 3 + 7–9
│   │   ├── EventEditorClient.tsx
│   │   ├── sections/
│   │   │   ├── IdentitySection.tsx
│   │   │   ├── PricingSection.tsx
│   │   │   ├── ClassificationSection.tsx
│   │   │   ├── StatusSection.tsx
│   │   │   └── ArtSection.tsx
│   │   ├── EditField.tsx            # PR 3 — read-only first; editable in 7+
│   │   ├── SaveBar.tsx              # PR 7
│   │   └── DangerZone.tsx           # PR 9
│   └── all/                         # PRs 4–6 + 10
│       ├── EventsTable.tsx          # PR 4
│       ├── EventsFilterBar.tsx      # PR 5
│       ├── EventRowMenu.tsx         # PR 6
│       ├── BulkDock.tsx             # PR 10
│       └── BulkDeleteConfirm.tsx    # PR 10 — typed-DELETE gate
└── definitions/
    └── copy.ts                      # all customer-facing strings — every PR appends
```

### Shared primitives (already exist — reused, not duplicated)

- `AdminTable`, `AdminButton`, `StatusBadge`, `MonoLabel`, `ConfidenceBar`, `AdminIcon` from `components/admin/primitives/`
- Audit-logging pattern (`ctx.set('auditAction', ...)`) on every new mutation
- Theme tokens (`var(--bg)`, `var(--signal)`, `var(--surface-1)`, etc.) — admin.css already aligned with handoff's expectations

### Backend routes

| PR | Endpoint | Change |
|---|---|---|
| 2 | `PATCH /v1/admin/events/:id` | Accept `firstMissingAt: null` in body (Dismiss missing action) |
| 5 | `GET /v1/admin/events` | Extend filter params: `genre[]`, `dateFrom`, `dateTo`, `missingData[]`, search `q` |
| 6 | `DELETE /v1/admin/events/:id` | Loosen — drop unverified-only guard so admins can delete verified events |
| 6 | `PATCH /v1/admin/events/:id` | Accept `hiddenFromConsumer: boolean` |
| 10 | `POST /v1/admin/events/bulk/unverify` | New — bulk send-back-to-review |
| 10 | `POST /v1/admin/events/bulk/mark-non-concert` | New — bulk hide + tag |
| 10 | `POST /v1/admin/events/bulk/delete` | New — bulk delete, requires typed `confirmation: 'DELETE'` field, cap at 100 ids |
| 11 | `POST /v1/admin/events/:id/merge` | New — moves user-side references (watching, attended, reports) from source to target, deletes source, audit-logs, transactional |

### DB migration

Single migration in PR 6:

```sql
ALTER TABLE events ADD COLUMN hidden_from_consumer BOOLEAN NOT NULL DEFAULT FALSE;
```

- Expand-only. No data loss path on rollback (column stays, code rolls back).
- Migration timestamp generated via `pnpm drizzle-kit generate` *inside the worktree at PR-writing time* — never pre-generated. Per `feedback_migration_timestamps.md`, the `when` must be > all prior migrations; parallel agents could otherwise race the same timestamp.
- In the same PR, every consumer-facing event-listing query in `apps/api/src/routes/` (non-admin) gets `WHERE NOT hidden_from_consumer`. The plan doc will inventory those queries; reviewers confirm completeness.

---

## PR-by-PR Breakdown

| PR | Title | UI scope | Backend scope | Migration | Tests | Design-review |
|---|---|---|---|---|---|---|
| **1** | `feat(admin): desktop tab pill shell on /admin/review` | `ReviewTabs.tsx`; restructure `ReviewPageClient.tsx` to render based on `?tab=`; move existing 3 surfaces into `_tabs/EventFlagsTabContent.tsx` + `PricesTabContent.tsx` + stub `AllEventsTabContent.tsx`. Mobile unchanged. URL state via query param so deep links work. | None | None | Vitest: `ReviewTabs` keyboard nav + URL sync. Existing surface tests unchanged. | ✅ Before PR open |
| **2** | `feat(admin): Missing tab on review` | `MissingTabContent.tsx`, `MissingTable.tsx`, `MissingRow.tsx`, `MissingRowMenu.tsx`. Per-row actions: Mark postponed · Mark cancelled · Dismiss. Empty state "Nothing's gone missing." Mobile variant. | PATCH `/:id` accepts `firstMissingAt: null` for Dismiss | None | Vitest: row menu wiring + Dismiss optimistic update. Integration: 3 PATCH-status scenarios + Dismiss. | ✅ |
| **3** | `feat(admin): event editor page (read-only)` | `/admin/events/[id]/edit/page.tsx` + `EventEditorClient.tsx` rendering 5 numbered sections read-only. Wire `Edit…` link from existing review surfaces (EventFlagInspector inline-edit stays). Mobile shell. `EditField` primitive set up read-only. | None | None | Vitest: page renders all 5 sections, status pill + verification mark correct. Integration: page renders for verified, unverified, missing rows. | ✅ |
| **4** | `feat(admin): all-events tab (read-only table)` | `AllEventsTabContent.tsx`, `EventsTable.tsx`. Status cell (status pill + verified/unverified). Pagination (`limit`/`offset`). Skeleton loading. Row click → editor. Mobile cards. | None — reuses existing `GET /v1/admin/events` | None | Vitest: row rendering + status cell variants + pagination. Integration: existing list endpoint shape unchanged. | ✅ |
| **5** | `feat(admin): all-events filters + search` | `EventsFilterBar.tsx`: search input, verification segmented, Status dropdown, Venue popover, Date range, Genre popover, Missing-data multi-select. Active-filter count + Clear all. | `GET /` extend params: `genre[]`, `dateFrom`, `dateTo`, `missingData[]`, `q` | None | Vitest: filter bar state mgmt + URL sync. Integration: each new param filters correctly + combines with existing ones. | ✅ |
| **6** | `feat(admin): all-events row actions + non-concert + per-row delete` | `EventRowMenu.tsx`: View detail · Edit… · Verify/Send back to review · Mark postponed/cancelled/upcoming · Mark sold out/available · Mark non-concert · Delete. Single-delete simple confirm modal. Mark-non-concert confirm. | Loosen `DELETE /:id` (drop unverified-only guard); PATCH accepts `hiddenFromConsumer`; **add `events.hidden_from_consumer` column**; **add `WHERE NOT hidden_from_consumer` to every consumer-facing event-listing query**. | ✅ `hidden_from_consumer BOOLEAN NOT NULL DEFAULT FALSE` (expand-only) | Vitest: row menu actions. Integration: DELETE works for verified row; PATCH sets `hidden_from_consumer`; consumer event-list query excludes hidden rows. | ✅ |
| **7** | `feat(admin): event editor — status section + save bar` | Activate Status section: status segmented (upcoming/postponed/cancelled). Postponed reveals new-date/TBD field; cancelled reveals note field. Verification control with read-only confidence + source. Introduces `SaveBar.tsx` sticky dirty/save UX + validation. | None — endpoints exist | None | Vitest: dirty detection + validation + save round-trip. Integration: PATCH status round-trip. | ✅ |
| **8** | `feat(admin): event editor — sold-out availability control` | Availability control (Available / Sold out) beside Status segmented. Sold out reveals optional provenance (source / URL / note). Uses SaveBar from PR 7. | None — uses #628 endpoints | None | Vitest: availability toggle + provenance reveal. Integration: POST `/sold-out` round-trip from editor. | ✅ |
| **9** | `feat(admin): event editor — mark non-concert + danger zone` | Classification section: mark-non-concert action (confirm modal). Danger zone: single-event delete with simple confirm. | None — endpoints from PR 6 | None | Vitest: confirm modal + delete redirect. Integration: round-trips. | ✅ |
| **10** | `feat(admin): bulk select + bulk dock on all-events` | Row checkboxes + header select-all; floating `BulkDock`. Bulk Send-back-to-review confirm; Bulk Mark-non-concert confirm; Bulk delete with `BulkDeleteConfirm` (typed-DELETE gate). Mobile: Select toggle + bottom bulk bar. Cap selection at 100 ids per request. | `POST /bulk/unverify`, `POST /bulk/mark-non-concert`, `POST /bulk/delete` — per-action Zod-validated; bulk-delete requires `confirmation: 'DELETE'`; each affected event produces its own audit-log entry (matches the per-mutation pattern, not a single batch entry). | None | Vitest: typed-DELETE gate; bulk dock state. Integration: each bulk endpoint, including N-audit-log-entries-for-N-ids assertions; 100-id cap rejection. | ✅ |
| **11** | `feat(admin): merge-events affordance (#633)` | UI in editor: "Merge with another event" action. Search dialog to pick target. Preview merged result. Confirm. | `POST /:id/merge` with target id; server moves user-side references (watching, attended, reports) from source to target, deletes source, audit-logs, transactional. | None (or constraints if FK strategy needs it — plan will confirm) | Vitest: merge dialog. Integration: full merge round-trip + reference-move correctness + transaction-rollback on FK failure. | ✅ |

---

## Cross-cutting requirements (every PR)

- `pnpm typecheck && pnpm lint && pnpm test` clean in the worktree before push (per `feedback_precheck_before_push.md`)
- All customer-facing strings land in `definitions/copy.ts` (per `feedback_definitions_copy_rule.md`)
- Audit logging wired on every new mutation (`ctx.set('auditAction', ...)` per the existing pattern)
- design-review skill run before `gh pr create` (per `feedback_design_review_with_complete_and_ship.md`)
- Copilot review requested on every PR; receiving-code-review skill applied to feedback (per `feedback_copilot_auto_review.md` and `feedback_ghpr_workflow.md`)
- Branch flow: worktree at `.worktrees/feat-admin-events-ui-<slice>` (per `feedback_worktree_always.md`); `.env.local` files copied into the worktree (per `feedback_worktree_env_files.md`); rebase on `origin/main` before push (per `feedback_rebase_before_push.md`)
- No `as` casts — Zod `safeParse`, type guards, or interface augmentation only (per `feedback_no_type_casting.md`)
- Component-scoped design-review enumeration: Agent 1 split per-file in parallel (per `feedback_design_review_component_scoped.md`); Agent 2 runs both visual properties + state reachability passes (per `feedback_state_reachability_in_design_review.md`); deferrals require explicit user approval (per `feedback_no_unilateral_deferrals.md`)
- **User manual-validation gate before merge.** After `/complete-and-ship` finishes (tests pass, design-review clean, PR open, Copilot feedback triaged), the PR is paused for the user to pull the branch, run it locally, and exercise the new surface in a browser. No PR is merged until the user confirms local validation. `/complete-and-ship` reports "ready for your local validation — pull `feat/admin-events-ui-<slice>` and try X, Y, Z" and waits.

---

## Risk, Rollback & Test Bar

### Highest-risk PR: #6

It's the first one that:
- Adds a schema column (`hidden_from_consumer`)
- Touches consumer-facing event queries (every place that lists events for a user needs the new filter)
- Loosens DELETE to allow verified-event deletion

**Mitigations:**
- Migration is expand-only with `DEFAULT FALSE` — no existing row's behavior changes. Per the project's expand/contract rule.
- The PR's plan will inventory every consumer-side event-listing query that needs `WHERE NOT hidden_from_consumer`. Reviewers confirm completeness against the inventory.
- DELETE loosening keeps the existing audit log path (`event.delete`) — no audit gap.
- Rollback: column stays in place (expand-only). Rolling back the code is sufficient. No data loss.

### Other risks

- **PR 1 desktop layout reshape.** Visible immediately to admins. Mitigation: restructure only; existing surfaces' behavior unchanged; `?tab=event-flags` is the default landing, matching today's first stacked panel.
- **PR 10 bulk delete on mass selection.** Selecting 500 rows and deleting affects server load + audit-log size. Mitigation: `BULK_DELETE_MAX = 100` constant (surfaced in UI as "Select all visible"). Server rejects `ids.length > 100`.
- **PR 11 merge.** Irreversible reference moves. Mitigation: server uses a transaction; any FK move failure rolls back. Audit-log captures source id, target id, and moved-references count.

### Test coverage bar (per PR)

- Vitest unit tests for new components: render with required props, primary action wiring, edge case (empty / loading / error)
- Integration tests for new API endpoints: happy path + auth + Zod-rejection + audit-log assertion
- Existing E2E suite unchanged through PR 10
- PR 11 adds a merge happy-path E2E

### Not testing

- Cross-PR feature interactions before all PRs land (each PR is independently shippable)
- Performance benchmarks on bulk endpoints (cap is the mitigation, not a perf test)

---

## Open Items (deferred, tracked)

1. **Saved views** — handoff stubs only; not in any of the 11 PRs. Defer until post-merge feedback.
2. **Date-range custom picker + Genre popover contents** — handoff stubs the dropdowns. PR 5 draws them; same component shape as Venue/Missing popovers.
3. **`apps/web/src/app/(protected)/admin/events/page.tsx` 5-line stub** — leave alone in PR 4; revisit if it confuses navigation.
4. **EventQueueSplit.tsx** in `components/admin/events/` — pre-existing, not referenced by handoff. Leave alone.
5. **EventFlagInspector inline-edit fate** — decision deferred to PR 7+ when the editor has mutation actions and the duplication is real.

---

## Implementation Flow

1. This spec lands as its own tiny docs PR (current branch: `feat/admin-events-ui-spec`).
2. After it merges, each of the 11 PRs gets its own worktree off main.
3. For each PR:
   - Invoke `writing-plans` skill to produce a step-by-step implementation plan for *that one PR*
   - User approves the plan
   - Hand off to `/complete-and-ship`, which runs `/design-review` as a hard gate before `gh pr create`
   - Copilot review requested; receiving-code-review skill applied to feedback
   - **PR pauses for user manual local validation before merge** — the branch is pulled, run locally, and exercised in a browser by the user; merge happens only after explicit user confirmation
4. PR 6 introduces the schema migration — its plan will explicitly list every consumer-facing event-listing query that gains the `WHERE NOT hidden_from_consumer` filter.
5. PR 11 is the merge affordance; lands only after all other PRs are stable.
