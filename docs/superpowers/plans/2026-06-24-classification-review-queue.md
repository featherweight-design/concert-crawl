# Classification Review Queue Implementation Plan — Index

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps in the sub-plans use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the recovery gap for LLM `isConcert` false negatives — real concerts auto-hidden as non-concerts — by surfacing a per-row LLM-uncertainty signal and a "Mark as concert" affordance in the admin editor.

**Architecture:** New `events.is_concert_review_needed` column written by the LLM extractor on INSERT, populated retroactively for currently-hidden events by a one-shot backfill, and surfaced via a filter chip on All Events + a Mark-as-concert action in the Classification section of the event editor. The column reflects the LLM's view, not the admin's resolution — admin actions only flip `hidden_from_consumer`.

**Tech Stack:** Drizzle ORM (migration + schema), Hono (admin API), Next.js App Router + React Query (admin UI), Vitest (unit + integration + component tests), Anthropic Haiku (LLM signal + backfill classifier).

**Spec:** `docs/superpowers/specs/2026-06-24-classification-review-queue-design.md` (merged PR #785).

---

## Sub-plan files

The implementation is sequenced across three PRs. Each sub-plan is self-contained for execution; the Global Constraints below apply to all three.

| Sub-plan | What it ships | Depends on |
|---|---|---|
| [PR 1 — Schema + LLM signal + crawler INSERT](2026-06-24-classification-review-queue-pr1-schema.md) | Migration 0042, `reviewNeeded` Zod + tool schema + prompt block, crawler INSERT mapping. No UI, no API change. | — |
| [PR 2 — Backfill script](2026-06-24-classification-review-queue-pr2-backfill.md) | Targeted to currently-hidden events; dry-run CSV → `--commit` UPDATE; writes only the review-needed flag, NEVER `hidden_from_consumer`. | PR 1 deployed |
| [PR 3 — Admin UI + API filter](2026-06-24-classification-review-queue-pr3-ui.md) | `ClassificationSection` interactive (absorbs Mark-non-concert + gains Mark-as-concert + flag pill); Danger Zone slim; `GET /v1/admin/events?view=hidden-flagged-for-review`; new filter chip + empty state. | PR 1 deployed (column exists) |

PRs 1 + 3 share no code paths and can be developed in parallel; PR 3 only needs PR 1's column live. PR 2 lands any time after PR 1.

---

## Global Constraints

Apply to every sub-plan. Sub-plans link back here rather than repeating.

- **Migration timestamp:** new journal `when` must be **greater than 1782604800000** (the value for 0041, the highest existing entry). If `pnpm drizzle-kit generate` writes a smaller value because today's epoch is already less than that, hand-edit the journal entry to `1782691200000` (1 day after 0041).
- **Expand-only schema:** the new column must ship with `NOT NULL DEFAULT FALSE` so the deploy is a no-op on existing rows and the code rollback is sufficient.
- **Crawler-frozen invariant:** the column is crawler-frozen on UPDATE (only INSERT + backfill write it). Admin actions never touch it.
- **No type casts in production code:** new fields cross system boundaries via Zod `safeParse` only (per `feedback_no_type_casting`). Scope: `apps/{api,web,crawler}` and `packages/*`. One-shot `scripts/*` are exempt and follow the lighter `cls as { eventId: unknown }` pattern established by `scripts/2026-06-19-non-concert-backfill.ts:288-289` — runtime type checks first, narrow cast after, throw on shape mismatch.
- **Single-character vars banned:** ESLint blocks identifiers shorter than 2 chars (e.g. `err` not `e`, `ctx` not `c`).
- **Customer-facing copy lives in `ADMIN_COPY`** (per `feedback_definitions_copy_rule`) — every new string lands in `apps/web/src/components/admin/definitions/copy.ts`.
- **Worktree required:** every PR's branch lives in `.worktrees/<branch>`. Copy `apps/{web,api,crawler}/.env.local` into the worktree immediately after `git worktree add`.
- **Pre-push checks:** `pnpm typecheck && pnpm lint && pnpm test` clean in the worktree before any `git push`.
- **Copilot review:** request via REST `requested_reviewers` with `["copilot-pull-request-reviewer[bot]"]`; min 2 successful rounds, no Crit/High/Medium remaining, apply valid Nits, skip invalid.

---

## File structure across the three PRs

### PR 1 — schema + LLM signal + crawler INSERT

| Path | Action | Responsibility |
|---|---|---|
| `packages/db/migrations/0042_events_is_concert_review_needed.sql` | Create | Add `is_concert_review_needed BOOLEAN NOT NULL DEFAULT FALSE` column |
| `packages/db/migrations/meta/_journal.json` | Modify | Append the 0042 entry with `when > 1782604800000` |
| `packages/db/src/schema/events.ts` | Modify | Add `isConcertReviewNeeded` Drizzle column accessor |
| `packages/crawler-core/src/types.ts` | Modify | Add `reviewNeeded?: boolean` to `NormalizedEvent` |
| `packages/crawler-core/src/lib/extractors/llm.ts` | Modify | Extend `NormalizedEventSchema`, `IS_CONCERT_RULES`, `SAVE_EVENTS_TOOL`, output mapping |
| `packages/crawler-core/src/lib/extractors/llm.test.ts` | Modify | Add `reviewNeeded` round-trip cases |
| `packages/crawler-core/src/crawl.ts` | Modify | Set `isConcertReviewNeeded: event.reviewNeeded === true` in INSERT mapping (around line 643) |
| `packages/crawler-core/src/crawl.integration.test.ts` | Modify | Add INSERT-writes-column + UPDATE-leaves-column-alone cases |

### PR 2 — backfill script

| Path | Action | Responsibility |
|---|---|---|
| `scripts/2026-06-24-isconcert-review-needed-backfill-helpers.ts` | Create | Pure helpers (`buildBatches`, `formatCsvRow`, types) |
| `scripts/2026-06-24-isconcert-review-needed-backfill.ts` | Create | DB load, batched classify, dry-run CSV, `--commit` UPDATE |
| `scripts/2026-06-24-isconcert-review-needed-backfill.test.ts` | Create | Helpers + `classifyBatch` mocked SDK coverage |

### PR 3 — admin UI + API filter + audit

| Path | Action | Responsibility |
|---|---|---|
| `apps/api/src/routes/admin/events.ts` | Modify | Add `view` query enum; thread into the where clause; include `isConcertReviewNeeded` in list + detail projections (~lines 96-130, 255-280, 332-346, 446-480) |
| `apps/api/src/routes/admin/events.integration.test.ts` | Modify | Cover `view=hidden-flagged-for-review` scoping + projection field |
| `apps/web/src/components/admin/definitions/copy.ts` | Modify | Add `editor.classification.{markAsConcert*, reviewNeededPill*}`, `review.allEvents.filters.flaggedChip*`; remove `editor.dangerZone.markNonConcert` (in task 3.7) |
| `apps/web/src/components/admin/review/all/filters.ts` | Modify | Add `flagged: boolean` to `AllEventsFilters`, serialize/parse as `view=hidden-flagged-for-review` |
| `apps/web/src/components/admin/review/all/filters.test.ts` | Modify | Cover new round-trip parse/serialize cases |
| `apps/web/src/components/admin/review/all/EventsFilterBar.tsx` | Modify | Render flagged-for-review chip |
| `apps/web/src/components/admin/review/_tabs/AllEventsTabContent.tsx` | Modify | Empty-state copy when chip is active + zero rows |
| `apps/web/src/components/admin/review/all/EventConfirmModal.tsx` | Modify | Add `'mark-as-concert'` to `ConfirmKind` + COPY routing |
| `apps/web/src/components/admin/review/all/types.ts` | Modify | Add `hiddenFromConsumer: boolean` + `isConcertReviewNeeded: boolean` to `AllEvent` |
| `apps/web/src/components/admin/events/editor/sections/ClassificationSection.tsx` | Modify | Become interactive: render Mark-non-concert OR Mark-as-concert button + flag pill |
| `apps/web/src/components/admin/events/editor/sections/DangerZoneSection.tsx` | Modify | Drop `onMarkNonConcert` prop + button — Merge + Delete only |
| `apps/web/src/components/admin/events/editor/EventEditorClient.tsx` | Modify | Thread `pendingDanger` discriminated union — drop `'non-concert'`, add a separate `pendingClassification: 'mark-non-concert' \| 'mark-as-concert' \| null` |
| `apps/web/src/components/admin/events/editor/EventEditorClient.test.tsx` | Modify | Cover Mark-non-concert (now in ClassificationSection) + Mark-as-concert flow + Danger Zone slim |

---

## PR sequencing

PR 1 must merge + deploy first (PR 3 reads the column). PR 2 may land any time after PR 1 deploys. PR 3 can be opened in parallel with PR 2 — only the column existence is the dependency.

Each PR follows the standard process:

1. Worktree → branch → copy `.env.local` files.
2. TDD: write failing tests first, implement, run, commit.
3. Pre-push: `pnpm typecheck && pnpm lint && pnpm test` clean.
4. `git fetch origin && git rebase origin/main`.
5. Push → open PR → request Copilot review → ≥2 successful Copilot rounds → merge.

---

## Self-review notes (filled out by author after writing the plan)

**Spec coverage check** — every spec section maps to at least one task:

| Spec section | Tasks |
|---|---|
| Data model (column + crawler-frozen rule) | 1.2, 1.5 |
| LLM tool schema + prompt | 1.3, 1.4 |
| Crawler write path (INSERT only) | 1.5 |
| Backfill script (3 actions, optimistic lock, dry-run + commit, idempotent) | 2.2, 2.3 |
| Admin UI — ClassificationSection interactive | 3.6, 3.8 |
| Admin UI — DangerZoneSection slim | 3.7, 3.8 |
| Admin UI — EventConfirmModal new kinds | 3.5 |
| Admin UI — All Events filter chip + empty state | 3.4, 3.9 |
| API — `view=hidden-flagged-for-review` param + projection | 3.2 |
| Audit | inherited from existing PATCH handler — no task needed |
| Tests — unit (llm.test.ts) | 1.3, 1.4 |
| Tests — integration (crawl + admin events) | 1.5, 3.2 |
| Tests — component (EventEditorClient) | 3.6, 3.8 |
| Tests — script | 2.2, 2.3 |
| Acceptance criteria | every criterion has a corresponding test or manual check (in 3.10) |

**Open follow-ups opened during plan-writing:**

- #789 — audit action key asymmetry
- #790 — promote chip to tab at ~20 rows
- #791 — visible-but-flagged UI surface

All three are referenced in PR 3's body.
