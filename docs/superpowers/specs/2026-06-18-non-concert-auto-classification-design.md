# Non-Concert Auto-Classification Design

**Date:** 2026-06-18
**Status:** Draft → user review
**Companion to:** PR #674 (consumer-surface `first_missing_at` filter), issue #676 (within-crawl dedup follow-on)

## Goal

Stop relying on admin manual triage to hide non-concert events (bingo nights, themed dance parties, movies, comedy, trivia) from the consumer surface. Have the LLM classify each event at extraction time and pre-populate the existing `hidden_from_consumer` flag. Backfill the existing event corpus in a single supervised pass.

## Background

Today's `apps/api`/`apps/crawler` flow:

- The crawler extracts events from venue pages, then writes them to `events` with `hidden_from_consumer = false` (the schema default).
- The admin Review UI has a one-way "Mark non-concert" action that sets `hidden_from_consumer = true`. Three surfaces use it: the editor's Danger Zone, the bulk dock, and the row menu.
- The consumer-surface API filters on `hidden_from_consumer = false` (PR 6).
- Admins have not been using this flow at any meaningful scale — the field exists, the UI is built, but the manual triage is tedious enough that bingo nights / dance parties / movies are still leaking through.

Today's triage (PR #674 rollout, 2026-06-18) showed that roughly 70% of the visible duplicate events on prod were non-concert events. The downstream dedup work (issue #676) is much smaller if non-concerts are filtered upstream.

## Out of scope

- Multi-category classification (`kind: concert | dj_set | movie | bingo | ...`). Binary `isConcert` only. We're a concert app, not an everything app.
- Admin override UI for false negatives (LLM said non-concert, admin disagrees). The API already supports `PATCH /v1/admin/events/:id { hiddenFromConsumer: false }`; for v1 we use that directly. UI affordance gets revisited in v2 once we have data on misclassification rates.
- Re-classifying existing events on every crawl. LLM runs once on INSERT (and during the one-shot backfill); subsequent crawls don't touch `hidden_from_consumer`. Mirrors how the existing `verified` field's one-way promotion works.
- Provenance fields (who/when classified). The audit log already captures change provenance per row if it's ever needed.
- New columns. `hidden_from_consumer` carries the full semantic; constraining when it's written makes a separate `is_concert` column unnecessary.

## Design

### Data model

No schema changes. Reuses existing `events.hidden_from_consumer` (boolean, default false).

Write rules:

| Path | Rule |
|---|---|
| Crawler INSERT | If LLM returns `isConcert: false`, set `hidden_from_consumer = true`. Else `false`. |
| Crawler UPDATE (re-crawl) | Never write `hidden_from_consumer`. Admin owns it from first insert onward. |
| Admin PATCH | Bidirectional, as today. `PATCH { hiddenFromConsumer: true \| false }`. |
| Backfill script | Writes `hidden_from_consumer` for every existing row based on LLM classification. Dry-run by default; `--commit` writes for real. |

### LLM tool schema

Add `isConcert` to the `save_events` tool's per-event schema in `packages/crawler-core/src/lib/extractors/llm.ts`:

```typescript
isConcert: {
  type: 'boolean',
  description: 'true if this is a concert (named musicians performing live music); false for non-concert events like themed parties, bingo, trivia, movies, comedy, listening parties, karaoke',
}
```

Add to the `required` array alongside `title`, `artist`, `date`, `confidence`.

The runtime `NormalizedEvent` type in `packages/crawler-core/src/types.ts` gains a matching field. The Anthropic SDK response handling parses and validates it (Zod safeParse — no `as` casts, per project convention).

### Prompt update

Add to the SYSTEM_PROMPT in `llm.ts`:

```
For each event, set isConcert:
- true: named musician(s) performing live music. Includes bands, solo artists, DJ sets, orchestras, jazz performances, tribute bands when they're performing themselves
- false: non-performance events that happen at music venues — themed dance parties (e.g. "Liv, Laugh, Love: Olivia Rodrigo Dance Party"), bingo (e.g. "BASS BINGO – Wooli Edition!"), trivia, comedy, film/movie screenings (e.g. "Film on the Rocks: Sinners"), karaoke, listening parties, private events

Extract events of both kinds — admin tooling uses isConcert to decide what reaches consumers, and non-concert events are still useful for auditing what venues are advertising.
```

### Crawler change

In `packages/crawler-core/src/crawl.ts`, the upsert block builds `eventValues` from `eventsToUpsert`. The mapping today sets `verified: event.confidence >= AUTO_APPROVE_THRESHOLD`. Add:

```typescript
// LLM-classified non-concert events get pre-hidden from consumer.
// Only written on INSERT — once a row exists, hidden_from_consumer
// is admin-owned. The crawler does NOT write it on the ON CONFLICT
// UPDATE path below (no field appears for it in the `set` clause).
hiddenFromConsumer: event.isConcert === false,
```

The existing `onConflictDoUpdate` `set` clause does NOT include `hiddenFromConsumer`, so re-crawls leave it alone. (The clause already follows this pattern for `artist` — see crawl.ts comment around line 632-638 about why artist stays put.)

### Backfill script

New file under `scripts/` — exact path/date determined in the implementation plan; follows the existing `scripts/YYYY-MM-DD-<topic>.ts` convention used by `scripts/2026-06-17-event-canonical-artist-consolidate.sql` (the #608 backfill precedent).

Behavior:

1. Load all events from the DB matching `status IN ('upcoming', 'cancelled', 'postponed') AND date >= CURRENT_DATE` (skip historical past events — they're not consumer-facing anyway).
2. Batch into groups of 25-50. For each batch, single Haiku call with structured tool output: `[{ id, title, artist, description, date, venue }] -> [{ id, isConcert }]`.
3. Compare results against current `hidden_from_consumer` state.
4. Default behavior: write a `dry-run-non-concert-backfill-YYYY-MM-DDTHH-MM-SS.csv` file with columns:
   - `event_id`, `title`, `artist`, `date`, `venue_name`, `current_hidden`, `llm_isConcert`, `would_change`
   - Sorted: rows where `would_change=true` first (these are the deltas to review), then unchanged rows
5. With `--commit` flag: opens a transaction, runs `UPDATE events SET hidden_from_consumer = NOT $1 WHERE id = $2` per row, prints summary, commits (or rolls back on any error).
6. Idempotent: re-running with same inputs produces same classifications and same diff (modulo LLM nondeterminism — but binary classification with clear examples should be stable).

Run plan (operator):
1. Local: `pnpm tsx scripts/2026-06-19-non-concert-backfill.ts` → produces dry-run CSV
2. Hugh + Claude review the dry-run together. Sort by `would_change=true`, spot-check that the LLM didn't misclassify obvious concerts as non-concerts.
3. If looks good on local: re-run against staging connection → produce staging dry-run → review
4. `--commit` against staging → verify on consumer surface
5. Repeat against prod
6. Same script can be re-run later if the LLM prompt is sharpened — re-classification cycle on demand

Output target should be configurable: defaults to a local file path, can be redirected to stdout for piping.

### Cost estimate

- Live crawl: ~1 extra token per event in the LLM response. Negligible (~$0.001/crawl).
- Backfill: ~1000 events on prod × ~300 tokens per event = 300k tokens. At Haiku pricing ($1/MTok input, $5/MTok output): ~$0.30-0.50 per env. Trivial.

## Implementation plan (rough — fully expanded in writing-plans phase)

**PR 1:** LLM tool schema + prompt update + crawler INSERT-path mapping + unit tests. No DB or admin changes. Tested via unit tests on the prompt structure + an integration test confirming that an insert with `isConcert: false` produces `hidden_from_consumer = true`. Ships independently as soon as it's green.

**PR 2:** Backfill script + dry-run CSV format + integration test. Run locally first (no commit), then staging with `--commit` after manual review, then prod with `--commit` after manual review.

Both PRs are small and independent. PR 1 starts taking effect on next crawl; PR 2 catches the existing corpus.

## Risks + mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| LLM misclassifies obvious concerts as non-concerts (false negatives) | Medium | Dry-run CSV reviewed before commit. Watch the consumer feed for a week post-deploy; any pattern of misses → tighten prompt, re-run backfill. |
| LLM misclassifies non-concerts as concerts (false positives) | Medium | Admin can still flag via existing "Mark non-concert" UI. Same workflow as today. |
| Prompt change affects extraction quality for other fields (artist, title, date) | Low | New field is additive; existing fields' descriptions unchanged. Integration tests exercise the full extraction. |
| Backfill incorrectly overwrites admin-curated `hidden_from_consumer` values | Low (no admin curation exists today per user) | Dry-run review surfaces every flip. Backfill is a one-shot supervised pass, not a recurring job. |
| LLM classifications drift across re-runs of the backfill | Low for binary classification | If observed: store classifications with model version in audit_log so we can diff. Initial version doesn't need this. |
| Non-concert events disappearing breaks any internal references / saved watches | Low | Watches are by event ID; hidden events stay accessible to their watchers (no consumer-API filter applies to `/v1/watching`). Verified during PR #674 rollout. |

## Acceptance criteria

- Crawler emits `isConcert` on every extracted event (`unit tests pass for prompt + schema`).
- INSERT path sets `hidden_from_consumer = true` for events with `isConcert: false` (`integration test passes`).
- UPDATE path leaves `hidden_from_consumer` untouched (`integration test passes`).
- Backfill script produces a dry-run CSV that Hugh + Claude can review together.
- After staging + prod backfill commits, the count of currently-visible non-concert events on the consumer feed drops materially (target: by at least 50% in the first week).
- The existing admin "Mark non-concert" flow continues to work end-to-end.

## Open questions

None — resolved in brainstorm:

- ✅ Binary vs categorical: binary
- ✅ New column vs reuse hidden_from_consumer: reuse
- ✅ Admin override UI: defer to v2 based on observed misclassification rate
- ✅ Backfill input: stored fields (title, artist, description), not re-fetched venue page (cost/time)
- ✅ Backfill safety: dry-run by default, `--commit` flag required, reviewed CSV
