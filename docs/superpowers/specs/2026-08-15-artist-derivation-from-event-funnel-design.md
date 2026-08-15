# Deriving artists from the event funnel

**Date:** 2026-08-15
**Status:** In review — approved in conversation 2026-08-15, pending review of this document
**Related:** #1203 (co-headliner splitting), PR #1562 (artist reap), PR #1564 (MusicBrainz disambiguation)

---

## The problem

The `artists` projection is polluted. Of 2,653 rows in prod, 1,235 are not matched to
Spotify, and a large share of those are not artists at all — they are event titles.
Admin queues that a human is supposed to drain (589 ambiguous, 483 no match) are
therefore meaningless, and the pollution reaches customers: a follow whose canonical
name does not join to a projection row renders as a dead, unclickable card on Browse.

The governing reframe: we should be deriving artists from the event funnel, not
scraping an artist string off every event we capture. Two questions, in order:

1. Is this a legitimate concert?
2. If yes, who are the artists?

The second answer must be informed by the first.

## Root cause

The derivation rules largely already exist. The LLM extraction prompt
(`packages/crawler-core/src/lib/extractors/llm.ts:144-185`) already specifies
headliner-only, run-on splitting on `with` / `w/` / `feat.` / `&`, false-positive
protection for real comma-names ("Goodnight, Texas", "Earth, Wind & Fire"), and — at
line 149 — an explicit instruction to return `null` when the listing names no
performer, with "do not copy the title into artist".

That is overwritten in two different ways, and which way depends on the path. Four
paths carry an inline fallback that copies the title into `artist` when their own
performer signal is missing. One path has no performer field at all and assigns the
title unconditionally. One path takes a structured headliner and never falls back:

| Path | Performer signal | Title fallback | Junk rows |
| --- | --- | --- | --- |
| JSON-LD | `performer[]` | `performerNames[0] ?? name` | 80 |
| LLM | `evt.artist` | `evt.artist?.trim() \|\| title` | 65 |
| AEG | `title.headlinersText` | none — returns null without one | 64 |
| VenuePilot | `announceArtists[].name` | falls back to `title` | 11 |
| LiveNation | `artistNames[]` | `artistNames[0] ?? event.name` | 2 |
| Ticketure | none | `artist: title`, unconditional | — |
| Genre tagger | n/a | `row.artist ?? ''` | — |
| detail-page | n/a — delegates to JSON-LD | inherits JSON-LD's | (in AEG's 64) |

Two distinct defects sit behind those 222 rows, and the difference matters because
they need different fixes. JSON-LD, the LLM, VenuePilot and LiveNation leak the
**title** into the artist field whenever their performer signal is absent — that is
a fallback to delete. AEG leaks nothing: its 64 rows are junk *inside*
`headlinersText`, because the venue really did bill a bingo night as the headliner.
No amount of plumbing fixes that one; it needs the adjudication step. The LLM path
is the sharpest case, since its own fallback silently defeats the prompt it ships
with.

`isConcert` has the same shape of gap: only the LLM extractor and Ticketure ever
produce it. `crawl.ts:1020` maps an explicit `isConcert === false` to
`hiddenFromConsumer` on INSERT, and the artist-projection filter at `crawl.ts:1188`
drops only `evt.isConcert !== false`. Both fail open when the field is absent, which
they must today: the comment at `crawl.ts:1180-1182` records why — extractors other
than the LLM emit no verdict at all, so treating "unclassified" as "not a concert"
would stop projecting most of the catalogue. That is why a dance-fitness party at
Levitt (VenuePilot) sits unhidden in the calendar.

**The inconsistency is architectural, not a coverage problem.** Nobody wrote a bad
rule; four of six paths never wrote a rule at all.

## Rejected approaches

**Blanket LLM classification of every event.** Considered because uniform provenance
sounds like it would improve consistency. It would not:

- Where JSON-LD carries a real `performer[]`, that is the venue's own structured
  field — strictly better than a model re-reading a page title. Re-deciding ~500
  currently-correct rows adds variance to the part of the pipeline that works.
- Events are re-extracted every crawl. If every artist is a model output, the same
  event can answer differently day to day, churning artist rows and orphaning
  follows. That is the exact consistency failure this design exists to fix.

**Deterministic rules with no LLM at all.** Free, but reimplementing the prompt's
splitting rules plus a non-concert keyword list in code is the per-venue-heuristic
road that `feedback_llm_first_extraction.md` exists to keep us off.

**Changing `canonicalizeArtist` / `canonical_artist`.** `canonical_artist` is the live
dedup key:

```sql
CREATE UNIQUE INDEX events_venue_date_canonical_artist_showtime_idx
  ON events (venue_id, date, canonical_artist, show_time)
  NULLS NOT DISTINCT WHERE status = 'upcoming';
```

Touching it is a keyed migration with collision risk. Rejected in favour of Option A
below.

## Option A (approved)

`events.artist` stays the event's **display string**. Artist derivation becomes a
separate concern writing to `canonical_headliners`, which already exists (migration
`0074_events_headliners.sql`) and is allowed to be empty. The dedup key is untouched.

---

## 1. The derivation stage

**New:** `packages/crawler-core/src/lib/derive-artists.ts`, one exported function
every extraction path calls.

Extractors stop deciding. They return what they **observed** — `observedPerformers:
string[]` (empty when the source had no performer field) plus the title. Every inline
fallback in the table above is deleted, and the paths that pass the title through
untouched start returning an empty `observedPerformers` instead.

`deriveArtists()` runs a fixed precedence ladder:

1. **`observedPerformers` non-empty** → headliner is `[0]`, the rest are supporting,
   `isConcert = true`. Deterministic, no LLM, no cost.
2. **Empty, or the observation is suspicious** — equals the title verbatim, contains
   `presents:`, matches an event-word list, or leads with a digit → one Haiku call
   answering `isConcert`, `headliners[]`, `supportingArtists[]`. The existing prompt
   moves here and becomes the only place those rules live.
3. **No performer determinable** → `canonical_headliners = []`, `isConcert = false`,
   `hiddenFromConsumer = true`. No fallback to title, ever. Empty is a legitimate
   answer.

Beyond the artist problem this makes `isConcert` universal rather than
LLM-and-Ticketure-only: every event carries a verdict.

**The fail-open filters stay as they are, and this is deliberate.** `crawl.ts:1188`'s
`evt.isConcert !== false` is correct both before and after: once the field is always
set, "unclassified" simply stops occurring and the filter tightens on its own. Making
it stricter — requiring an explicit `true` — is only safe once the re-derivation pass
in section 2 has backfilled every stored row, and even then it buys nothing that an
always-set field does not already give. Tightening it during the transition would
unproject
most of the catalogue, exactly as the comment at `crawl.ts:1180-1182` warns. Leave it.

### Writes

- `events.artist` — unchanged behaviour. Ladder step 1 writes the observed performer;
  steps 2 and 3 leave the title in place. It is a display string.
- `canonical_artist` — never touched. No migration, no collision risk.
- `canonical_headliners` / `canonical_supporting` — become the artist truth.

### backfillArtists

Changes to read `canonical_headliners` first, falling back to `canonical_artist` only
for rows re-derivation has not reached. That single change **is** #1203: co-headliners
split properly. It is also the precondition for narrowing the reaper's
`BILLED_IN_LIVE_TITLE` guard, which is deliberately out of scope here.

---

## 2. The one-off re-derivation pass

`packages/db/src/scripts/rederive-event-artists.ts` — same shape as the reap and the
disambiguator: dry-run by default, `--apply` to write, idempotent, re-runnable.

**Selection:** every event, not only the suspicious ones, so provenance is uniform
across the table. Only ladder steps 2 and 3 cost anything, so the LLM bill is the
rows that either carry no performer signal or carry one the ladder flags as
suspicious — on today's data, on the order of the 222 junk rows, not the full 2,218.

**Per event:** run `deriveArtists()` against stored extraction data, then write
`canonical_headliners`, `canonical_supporting`, `is_concert`. `events.artist` and
`canonical_artist` are never touched, so the unique index and every existing follow
stay exactly where they are.

**Non-concerts:** a row returning `isConcert = false` gets `hidden_from_consumer =
true`. This is the one place the pass changes what a customer sees, and it is the
correct direction — HUMP! Film Festival and ActiVida Dance Fitness Party leave the
calendar.

### Hard sequence

1. **Derive** — rewrite `canonical_headliners` / `is_concert`.
2. **Backfill** — `backfillArtists` re-runs against the new headliners. This is where
   "Thee Sacred Souls, LA LOM, & The Womack Sisters" becomes three rows and the
   Spotify follow finds its slug.
3. **Reap** — `prune-artists.ts` re-runs with its `BILLED_IN_LIVE_TITLE` guard
   **unchanged**. Rows orphaned because every referencing event came back non-concert
   are unreferenced by definition and are removed.

Reaping before the backfill would delete rows the split is about to legitimise. The
order is not negotiable.

Narrowing the reaper guard is a **separate decision on real numbers** after observing
what this run would delete. It is not part of this design.

**Expected shape:** the ambiguous and no-match queues drop substantially, because most
of their contents are titles that resolve to `[]` and disappear rather than resolving
to an artist.

---

## 3. The admin surface

Most of this is already built and unused. `apps/api/src/routes/admin/artists.ts`
already supports `?search=` (line 73, ilike on `canonicalName`) and already exposes
`GET /v1/admin/artists/counts` (lines 89-104). The page at
`apps/web/src/app/(protected)/admin/artists/page.tsx:76` calls neither and hardcodes
`limit=200`. The missing search, counts and pagination are a front-end gap, not a
missing API.

**One table, filters as chips.** The four tabs collapse into a single table with
status chips carrying live counts from `/counts`. Chips filter; they are not routes.
Default filter is Ambiguous — the queue that actually needs a human. The search box
queries across **all** statuses regardless of the active chip, since finding a
specific artist should not require knowing which bucket it landed in. Offset
pagination against the existing `limit` / `offset` params; the table is ~2,600 rows
and shrinking, so nothing more elaborate is warranted.

### The `not_an_artist` state

New fifth value on `artistMatchStatusEnum`. Distinct from the existing four because
those all answer *"how confident is the Spotify match?"* and this one answers *"there
is nothing here to match."* Reusing the orthogonal `hidden` boolean would conflate
"do not show this on the consumer surface" with "this was never an artist", and those
must stay separable.

Two behaviours justify the migration:

- **It is sticky.** `backfillArtists` upserts on `canonicalName` and must preserve an
  existing `not_an_artist` rather than resetting it to `unmatched`. Otherwise every
  crawl resurrects the row and the admin's decision is worthless.
- **The reaper leaves it alone.** It survives as a tombstone. Deleting it would let
  the next backfill recreate it as `unmatched`, straight back into the queue — the
  exact churn the state exists to prevent.

**Sizing note:** after section 2 this state should rarely be needed. Most of what an
admin would mark not-an-artist is a title that re-derivation resolves to `[]` and the
reap removes. It is the residue handler, not the main event — hence one enum value and
one button, not a workflow.

---

## 4. The Browse shelf

Two defects, one change.

**The dead card.** `ShelfCard.tsx:237` renders a `<Link>` only when `artist.slug !==
null`, otherwise a plain `<span>`. Slug goes null at `artist-follows.ts:268` when no
projection row matches the follow's `canonicalName`. Section 2 fixes the underlying
data, but the card should never be inert regardless.

**The wrong target.** Even with a slug it links to `/artists/${slug}`. It should link
to the event.

**Fix:** `FollowedArtistNextShow` already carries `eventId`
(`packages/types/src/artist.ts:111-126`); the server flattener drops it when building
`ShelfArtist`. Add `eventId: string | null` to `ShelfArtist`, thread it through, and
target `/events/${eventId}`. No API change — the payload is already on the wire.

New link precedence:

1. `eventId` present → `/events/${eventId}`
2. else `slug` present → `/artists/${slug}` (a followed act with nothing on the books;
   the artist page is the only meaningful destination)
3. else → `<span>`, unchanged

**Auth posture is unchanged.** `/events/[id]` and `/artists/[slug]` both sit under
`(protected)` and neither is in `isAlwaysPublic` (`middleware.ts:18`), so the starter
shelf's signed-out behaviour is exactly as it is today.

**Implementation caution.** `ShelfCard` is deliberately kept in lockstep with the
Spotify taste card (`spotify/DiscoveryShelf.tsx` `TastePickCard`) — they share one
slot on Browse. This change is an href swap and should not bite, but the plan must say
so explicitly.

---

## Testing

- **`deriveArtists()` unit tests** carry the weight. Table-driven across the ladder:
  observed performers present; observed equals title; `presents:` titles; event-word
  tails; leading digits; the real comma-name false positives the prompt protects
  ("Goodnight, Texas", "hey, nothing", "Crosby, Stills & Nash", "Earth, Wind & Fire");
  and the no-performer case asserting `[]` rather than a title fallback.
- **Per-extractor tests** assert each path now returns `observedPerformers` and no
  longer settles an artist itself. One regression test per deleted fallback.
- **`backfillArtists` integration tests** (against the real per-worktree DB) cover the
  headliners-first read, multi-headliner fan-out, and `not_an_artist` stickiness
  across a re-run.
- **The re-derivation script** ships with a dry-run assertion test and is validated by
  running dry against prod before `--apply`, exactly as the reap and disambiguator
  were.
- **Browse** gets a component test per link-precedence branch.

`packages/db` exports built `dist`, so `pnpm --filter @concert-crawl/db build` must run
before the `apps/api` integration suite sees any change made here.

## Sequencing

The four sections are independently shippable and should be separate PRs:

1. Section 1 (derivation stage + extractor changes + backfillArtists) — the core.
2. Section 2 (re-derivation script) — depends on 1.
3. Section 3 (admin table + `not_an_artist`) — independent of 1 and 2; can land in
   parallel.
4. Section 4 (Browse shelf) — independent; the data fix arrives via 2 but the link
   precedence change stands alone.

## Out of scope

- Narrowing the reaper's `BILLED_IN_LIVE_TITLE` guard — a separate decision on the
  numbers section 2 produces.
- Changing `canonicalizeArtist` or the `canonical_artist` dedup key.
- Storing MusicBrainz MBIDs as a stable identity anchor (noted as a real gap; not
  this design).
- Any change to Spotify's role. Spotify remains the identity registry and the only
  source of artist photos; MusicBrainz remains the arbiter used by the disambiguator.
  MusicBrainz cannot replace it — no images, not an account system, and at 1 req/sec
  it cannot serve the interactive admin picker.
