# Classification Review Queue Design

**Date:** 2026-06-24
**Status:** Spec → plan
**Companion to:** spec `2026-06-18-non-concert-auto-classification-design.md` (the original `isConcert` work), PR #730 (`isConcert` prompt iteration for DJ-as-headliner billings)

## Goal

Close the recovery gap for LLM `isConcert` false positives. Today's classifier produces ~1–2% false positives on backfills — real concerts misclassified as non-concerts, then hidden from consumers via `hidden_from_consumer=true`. There's no admin UI affordance to un-hide an event, so false positives sit hidden indefinitely.

This spec adds (1) a per-row LLM-uncertainty signal so admins can find the borderline calls, (2) a filter chip on the existing All Events tab that scopes to hidden-and-flagged rows, and (3) an editor affordance to flip an event back to visible.

## Background

The original auto-classification work (`2026-06-18-non-concert-auto-classification-design.md`) deliberately deferred admin override UI: "the API already supports `PATCH /v1/admin/events/:id { hiddenFromConsumer: false }`; for v1 we use that directly. UI affordance gets revisited in v2 once we have data on misclassification rates."

We now have that data. The 2026-06-24 prod backfill hid 130 events, with 2 known false positives (PRESIDENT: North American Campaign 2026, Levity Presents: Laser Therapy) excluded by hand from the dry-run review because there was no un-hide path. Operating without an inverse affordance has reached its breaking point: the next backfill cycle will produce more borderline calls, and human dry-run review is fallible.

The 3 events that motivated PR #730's prompt iteration illustrate the borderline shape this spec targets:

| Event | Verdict | Why it was borderline |
|---|---|---|
| PRESIDENT: North American Campaign 2026 | Real concert (LLM wrong) | Masked-mystery-band brand; no obvious touring-artist name in the title |
| Levity Presents: Laser Therapy | Real concert (LLM wrong) | "Presents" framing where the named entity could be a DJ brand OR a live act |
| R&B ONLY LIVE - 18+ | Correctly non-concert | DJ-driven brand with "LIVE" used to mean "in-person experience," not live music |

The first two are the recovery cases. The third is what the LLM should keep getting right.

## Out of scope

- Numeric LLM confidence scores. Binary `reviewNeeded` only. The brainstorm explicitly weighed confidence-as-number vs boolean and picked boolean — tuning surface (threshold knob, audit semantics, retroactive re-tuning) doesn't justify itself at the current volume.
- Bulk "Mark as concert" endpoint. At expected steady-state queue volume (~1–2 events per backfill cycle, ≤5 active at any time), single-row action is sufficient. The existing bulk "Mark non-concert" endpoint remains as-is for the primary-direction workflow.
- Surfacing visible-but-flagged events in the admin UI. The `is_concert_review_needed` column is written symmetrically (on both `isConcert=true` and `isConcert=false` classifications), but only the hidden-and-flagged slice surfaces in this cycle. The visible-and-flagged data is preserved for future tuning and a possible later UI.
- Separate audit action keys for single-row Mark as concert vs Mark non-concert. Both audit as `event.update` today (inherited from the existing PATCH route's blanket action key). Reconciling that asymmetry is a separate cleanup tracked as a follow-up issue.
- Re-classifying every visible event in the corpus. Backfill is scoped to currently-hidden events only (option ii from the brainstorm).
- Design handoff. The brainstorm explicitly chose to ship additive — new affordances follow existing patterns (filter chip, confirm modal). This is admin-internal tooling at a volume that doesn't justify a separate design cycle.

## Design

### Data model

One new column on `events`:

```sql
ALTER TABLE events
  ADD COLUMN is_concert_review_needed BOOLEAN NOT NULL DEFAULT FALSE;
```

Semantically: "the LLM had reasonable doubt about the `isConcert` classification of this row." Written on INSERT only, by the crawler and the one-shot backfill script. Admin actions (Mark non-concert, Mark as concert) flip `hidden_from_consumer`; they do NOT clear `is_concert_review_needed`, so re-running the backfill remains idempotent — the bit reflects the LLM's view, not the admin's resolution.

No partial index pre-emptively. At current corpus size (~3,000 events) the filter chip's `WHERE hidden_from_consumer=true AND is_concert_review_needed=true` is a small sequential scan. If the corpus grows past ~10k events with the chip in active use, add a partial index then.

### LLM tool schema + prompt

`NormalizedEventSchema` in `packages/crawler-core/src/lib/extractors/llm.ts` gains:

```typescript
reviewNeeded: z.boolean(),
```

…and the matching field is added to the `save_events` tool input schema's `properties` and `required` array alongside `title`, `artist`, `date`, `confidence`, `isConcert`. The runtime `NormalizedEvent` type in `packages/crawler-core/src/types.ts` gains the matching field.

`IS_CONCERT_RULES` gets a new trailing block:

```
For every classification, ALSO set reviewNeeded:
- true: you weighed both interpretations and the evidence is genuinely ambiguous. Examples:
  - Title contains a brand or made-up name (e.g. "PRESIDENT", "Levity Presents") with no obvious touring-artist signal but URL/venue framing implies a live act
  - Title uses "Presents" or "Featuring" but the named entity could be a DJ brand OR a live performer and the venue alone doesn't disambiguate
  - Title contains "LIVE" but the brand context is DJ/recorded-music culture
- false: the classification is unambiguous in either direction (clear band-tour announcement OR clear bingo/trivia/movie/lip-sync framing)

reviewNeeded is independent of isConcert — emit it whenever you had to choose between two plausible interpretations, regardless of which direction you ended up picking.
```

### Crawler write path (INSERT only)

In `packages/crawler-core/src/crawl.ts`, the existing block that sets `hiddenFromConsumer: event.isConcert === false` gains a sibling:

```typescript
isConcertReviewNeeded: event.reviewNeeded === true,
```

The existing `onConflictDoUpdate` `set` clause does NOT include this field, mirroring the existing `hiddenFromConsumer` rule: once a row exists, the column is admin- and backfill-frozen. The crawler does not re-evaluate it on subsequent crawls.

### Backfill script (targeted to currently-hidden events)

New file `scripts/2026-06-24-isconcert-review-needed-backfill.ts`, following the pattern established by `scripts/2026-06-19-non-concert-backfill.ts`. Behavior:

1. Load all events where `hidden_from_consumer = true AND date >= CURRENT_DATE AND status IN ('upcoming', 'cancelled', 'postponed')` — ~130 rows on prod today.
2. Batch of 25–50. Single Haiku call per batch using the same prompt as the live crawler (the `IS_CONCERT_RULES` block, including the new `reviewNeeded` rules). Output schema: `[{id, isConcert, reviewNeeded}]`.
3. Dry-run by default → CSV at `dry-run-isconcert-review-needed-YYYY-MM-DDTHH-MM-SS.csv`:
   - Columns: `event_id, title, artist, date, venue_name, current_isConcert_implied, llm_isConcert, llm_reviewNeeded, action`
   - `action` is one of:
     - `flag-for-review` — `reviewNeeded=true`, will write `is_concert_review_needed=true`
     - `unflag` — `reviewNeeded=false`, column stays `false` (no-op write)
     - `disagrees-with-prior` — LLM now says `isConcert=true` while the row was hidden. The script does NOT auto-unhide; this surface is purely informational for the human reviewer to consider applying the new UI's Mark-as-concert action after commit.
   - Sorted: `flag-for-review` + `disagrees-with-prior` rows first; `unflag` rows last.
4. `--commit`: opens transaction, runs `UPDATE events SET is_concert_review_needed = $1 WHERE id = $2` per row. **Does NOT touch `hidden_from_consumer`.**
5. Run plan: local dry-run → staging dry-run → staging commit → consumer-feed smoke → prod dry-run → prod commit.
6. Idempotent — re-running with the same inputs produces the same classifications (modulo LLM nondeterminism, which is low for this binary-with-examples task).

Cost: 130 events × ~300 tokens × Haiku ≈ $0.05 per env.

### Admin UI — Editor

#### `ClassificationSection` becomes interactive

Today it's read-only and shows only genre. After this work it owns the event's classification state:

- Existing genre display stays.
- New "Visible to consumers" control with two actions:
  - **Mark non-concert** (shown when `hiddenFromConsumer=false`) — sets `hiddenFromConsumer: true`.
  - **Mark as concert** (shown when `hiddenFromConsumer=true`) — sets `hiddenFromConsumer: false`.
- Both actions route through `EventConfirmModal` with new `kind` values `'mark-non-concert'` and `'mark-as-concert'`. Confirm modal copy lives in `ADMIN_COPY`.
- A small inline pill ("LLM flagged for review") renders when `is_concert_review_needed=true`, so the admin opening the editor sees the flag immediately.

Both actions hit the existing `PATCH /v1/admin/events/:id { hiddenFromConsumer: true | false }` — no API change, the endpoint already supports both directions.

#### `DangerZoneSection` slim

Drops the Mark non-concert button. After this work it contains only Merge and Delete — the two genuinely destructive operations. The `pendingDanger` discriminated union in `EventEditorClient` drops the `'non-concert'` variant.

This is a small semantic-correctness refactor surfaced during brainstorming: reclassifying is reversible, not destructive, so its Danger Zone placement was always a category error.

### Admin UI — All Events filter chip

#### New query param on `GET /v1/admin/events`

```typescript
view: z.enum(['hidden-flagged-for-review']).optional()
```

When `view=hidden-flagged-for-review`, the where clause ANDs `eq(events.hiddenFromConsumer, true)` and `eq(events.isConcertReviewNeeded, true)`. Single combined param (rather than two orthogonal `hiddenFromConsumer` + `reviewNeeded` params) keeps the API surface narrow until a second use case demands the orthogonal shape.

#### New chip on All Events filter rail

Labeled per `feedback_definitions_copy_rule`: defined in `ADMIN_COPY`. Placeholder copy:

- Chip label: `Hidden — flagged for review`
- Count badge: live count from existing `count=true` mechanism
- Empty state when chip is active and zero rows: `No hidden events are flagged for review.`

The chip composes with existing date / genre / query filters via the existing filter param infrastructure. The chip just sets `view=hidden-flagged-for-review`.

### Audit

- Single-row Mark as concert audits as `event.update` (inherits the existing PATCH route's blanket action key — same as single-row Mark non-concert does today). The PATCH body in audit meta records `{ hiddenFromConsumer: false }` so the action is greppable.
- No new bulk endpoint, no new bulk audit action key.

## Tests

- **Unit (crawler-core):** `llm.test.ts` gains `reviewNeeded` round-trip assertions on the Zod schema and tool input. The classifier-helper tests gain coverage of the new prompt rules.
- **Integration (crawler-core):** `crawl.integration.test.ts` adds a case where a crawl with `reviewNeeded=true` produces `is_concert_review_needed=true` on INSERT, and a subsequent re-crawl with `reviewNeeded=false` leaves the column unchanged.
- **Integration (apps/api):** `admin/events.integration.test.ts` covers `GET /v1/admin/events?view=hidden-flagged-for-review` returning the right rows. The existing PATCH test covers `hiddenFromConsumer: false`.
- **Component (apps/web):** `EventEditorClient.test.tsx` covers ClassificationSection's Mark-as-concert flow including the confirm modal, and the inverse Mark-non-concert flow now living in ClassificationSection instead of Danger Zone.
- **Script:** `scripts/2026-06-24-isconcert-review-needed-backfill.test.ts` covers the dry-run CSV generation logic, the `--commit` update statement scope (does not touch `hidden_from_consumer`), and idempotency.

## PR sequence

1. **PR 1 — schema migration + LLM signal + crawler INSERT.**
   - Migration `0042_events_is_concert_review_needed.sql` adds the column.
   - Prompt + tool schema + Zod + `NormalizedEvent` type updates.
   - Crawler INSERT mapping (`crawl.ts`).
   - Unit + integration tests.
   - No UI, no API endpoint change, no backfill.
   - Ships independently; next crawl starts populating the column.
2. **PR 2 — backfill script.**
   - New script + helpers + script test.
   - Run plan documented in PR body: local dry-run → staging dry-run+commit → consumer-feed smoke → prod dry-run+commit.
   - Lands after PR 1 deploys.
3. **PR 3 — admin UI + API filter + audit.**
   - `ClassificationSection` becomes interactive; absorbs Mark non-concert from Danger Zone; adds Mark as concert.
   - `DangerZoneSection` slim.
   - `EventConfirmModal` gets new `kind` values + copy.
   - `GET /v1/admin/events` gains `view=hidden-flagged-for-review` param.
   - New filter chip on All Events tab with `ADMIN_COPY` strings + empty state.
   - Component + API integration tests.
   - Ships independently of PR 2 — only depends on PR 1's column being live.

PRs 1 and 3 share no code paths (column write vs column read), so they can be developed in parallel — but PR 1 must merge first because PR 3's filter chip query needs the column to exist. PR 2 can land any time after PR 1 deploys; without PR 2 the chip is functional but renders an empty queue until enough new hidden events arrive via crawls with `reviewNeeded=true`.

## Risks + mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| LLM emits `reviewNeeded=true` too liberally; queue floods with false alarms | Medium | Dry-run review surfaces this before commit. Prompt examples are tight. If observed post-deploy: tighten prompt, re-run backfill. |
| LLM emits `reviewNeeded=false` on genuinely borderline cases; real FPs stay hidden | Medium | This is the recovery story we already have — admin can still un-hide via the editor directly (now possible via the new button without going through the queue first). Manual scan of the full hidden list remains an option for high-stakes corpora. |
| Re-running backfill flips review-needed differently each run | Low (binary classification with examples should be stable) | If observed: pin model version in the script + record it alongside the flag. Initial version doesn't need this. |
| Existing admin "Mark non-concert" callers (bulk dock, all-events row menu) drift after the editor refactor | Low | The bulk + row menu paths don't change; only `DangerZoneSection`'s affordance moves to `ClassificationSection`. Component test covers it. |
| Single `view=hidden-flagged-for-review` param limits future composability | Low | If a second use case appears (e.g. visible-and-flagged queue), refactor to orthogonal params then. YAGNI now. |
| Watching/wishlist visibility on a row that the admin then Marks as concert | Low (positive outcome) | `/v1/watching` already filters `hidden_from_consumer = false`. Marking-as-concert restores visibility to users who had previously watched the row before it was auto-hidden. This is the intended recovery behavior, called out so future readers don't misread it as a bug. |

## Acceptance criteria

- Crawler emits `reviewNeeded` on every extracted event (unit tests pass).
- New events arriving via INSERT have `is_concert_review_needed` populated; UPDATE re-crawls leave it alone (integration test passes).
- Backfill script produces a dry-run CSV listing every currently-hidden event with the LLM's new opinion; `--commit` writes only `is_concert_review_needed`, never `hidden_from_consumer`.
- Admin can apply the "Hidden — flagged for review" chip on All Events and see the queue.
- Admin can click into a hidden event's editor, hit Mark as concert in `ClassificationSection`, confirm via modal, and the event re-appears on the consumer surface within one router-refresh cycle. Audit log records the flip.
- Existing Mark non-concert flow continues to work end-to-end from `ClassificationSection`'s new home (component test covers it).
- `DangerZoneSection` contains only Merge + Delete; no Mark non-concert affordance there.

## Follow-up issues (to open during the writing-plans phase)

- Reconcile single-row vs bulk audit action key asymmetry. Today single-row Mark non-concert audits as generic `event.update`; bulk audits as `event.bulk_mark_non_concert`. Adding distinct keys for `event.mark_non_concert` and `event.mark_as_concert` would let compliance grep cleanly without parsing meta JSON.
- Promote the filter chip to a top-level Review tab if the queue grows past ~20 active rows at steady state.
- Build a visible-but-flagged admin UI surface if FPs in the visible direction become an operational problem. The `is_concert_review_needed` column already carries this data symmetrically per the B2 brainstorm decision.

## Open questions

None. All six brainstorm open questions resolved:

- Numeric confidence vs boolean: **boolean** (`is_concert_review_needed`)
- Threshold tunable: **N/A** — boolean shape eliminates the question
- Inverse-risk surfacing: **column stores it, UI defers** (B2)
- Backfill scope: **targeted to currently-hidden events** (option ii)
- UI placement: **filter chip on All Events tab** (option a)
- Design handoff: **none — ship additive following existing patterns**

And two bonus decisions captured during the brainstorm:

- `ClassificationSection` becomes interactive; absorbs Mark non-concert from `DangerZoneSection`.
- API surface is a single `view` enum param, not two orthogonal `hiddenFromConsumer` + `reviewNeeded` params — YAGNI cut.
