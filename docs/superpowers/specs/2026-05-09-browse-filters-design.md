# Browse Filters — Price & Vibe Design

**Date:** 2026-05-09
**Issue:** #56 — Browse filters wired to event list
**Status:** Approved for implementation

---

## Overview

The Browse page has four filter chips (When, Where, Price, Vibe). When and Where are fully wired. Price and Vibe set URL params but neither reaches the API nor the database query. This spec covers wiring both filters end-to-end, including an LLM genre-tagging pipeline to populate the currently empty `events.genre` field.

---

## Problem Statement

On staging: 438 events, 0 with genre data, 0 with price data. Both the Price and Vibe filter chips are UI-complete but produce no effect because:

1. `fetchEvents()` in the Browse page does not forward `filterPrice` or `filterVibe` to the API
2. `GET /v1/events` does not accept or apply those params
3. The `events.genre` column is never populated (crawler doesn't extract it)
4. The price pipeline exists but is not wired to the crawler (tracked separately in issue #126)

---

## Architecture

Three independent layers of work:

```
UI chips (already wired) → fetchEvents() → GET /v1/events → Drizzle query → Postgres
                                ↑                ↑
                           [Section 3]      [Section 2]

Crawler → crawlVenue() → genre-tagger → events.genre + cost_tracking
                                ↑
                           [Section 1]
```

---

## Section 1: Genre Tagging Pipeline

### Location

`packages/crawler-core/src/lib/genre-tagger.ts` — new module, same package as `llm.ts`.

### How it works

After each crawl run, newly inserted events with `genre IS NULL` are tagged in a single Claude Haiku call. All events from the run are bundled in one user message; the system prompt is prompt-cached (identical across all calls in a session).

**Input:** `{id: string, title: string, artist: string}[]` for events with null genre from this venue/run.

**Anthropic call:**

- Model: `claude-haiku-4-5-20251001` (same as LLM extractor)
- System prompt: cached via `cache_control: { type: 'ephemeral' }` — contains the genre taxonomy and instructions
- Tool use: `tag_genres` tool returning `{eventId: string, genres: GenreLabel[]}[]`
- Max output tokens: 4096 (sufficient for ~100 events)

**Genre labels** — constrained to exactly the 8 values in `filter-defs.ts`:

```
'rock' | 'indie' | 'hip-hop' | 'electronic' | 'country' | 'jazz' | 'pop' | 'metal'
```

One event may receive multiple labels (e.g. `['rock', 'indie']`). The Haiku call should instruct the model to use only labels from this fixed list and to prefer fewer labels over more when ambiguous.

**Output:**

- Drizzle `update` on `events` — sets `genre` array for each tagged event
- `cost_tracking` insert: `service: 'genre-tagger'`, `costUsd`, `tokensUsed`, `metadata: JSON.stringify({ crawlRunId, venueId, eventsTagged, ...tokenUsage })`
- Uses existing `calculateCost()` from `packages/crawler-core/src/lib/cost.ts`

**Error handling:**

- If the Haiku call fails, log the error and continue — untagged events will be retried on the next crawl
- If Zod validation of the tool response fails, log and skip (don't crash the crawl)
- Never throw from `tagEventsWithGenres()` — genre tagging failure must not block event insertion

### Integration in run.ts

```
runDailyCrawl()
  → crawlVenue() × N venues
  → tagEventsWithGenres(venueId)  ← called once per venue after its crawl

runTriggeredCrawls()
  → crawlVenue(venueId)
  → tagEventsWithGenres(venueId)  ← called after each triggered crawl
```

`tagEventsWithGenres(venueId)` queries `events WHERE venue_id = ? AND genre IS NULL`, then calls Haiku if any are found. If none, returns immediately with no API call.

### Backfill

On first deploy, `tagEventsWithGenres()` will tag all 438 existing null-genre events during the next daily crawl (each venue's events tagged in separate calls). No one-time migration script needed.

### Cost

| Scope                          | Estimate    |
| ------------------------------ | ----------- |
| One-time backfill (438 events) | ~$0.06      |
| Ongoing (~50 events/day × 365) | ~$2.74/year |

Costs land in `cost_tracking` with `service: 'genre-tagger'` and will surface in the Cost Tracking admin UI (issue #67, beta deliverable).

---

## Section 2: API Changes

**File:** `apps/api/src/routes/events.ts`

### Schema extension

Add two optional params to `listEventsSchema`:

```typescript
filterPrice: z.enum(['under-25', '25-50', '50-plus', 'tbd']).optional(),
filterVibe: z.enum(['rock', 'indie', 'hip-hop', 'electronic', 'country', 'jazz', 'pop', 'metal']).optional(),
```

### Price WHERE conditions

Applied as additional `and()` clauses in the Drizzle query:

| `filterPrice` value | WHERE condition                                                                     |
| ------------------- | ----------------------------------------------------------------------------------- |
| `under-25`          | `ticket_price_min IS NOT NULL AND ticket_price_min < 25`                            |
| `25-50`             | `ticket_price_min IS NOT NULL AND ticket_price_min >= 25 AND ticket_price_min < 50` |
| `50-plus`           | `ticket_price_min IS NOT NULL AND ticket_price_min >= 50`                           |
| `tbd`               | `ticket_price_min IS NULL AND ticket_price_max IS NULL`                             |

**Transitional note:** Until issue #126 (price pipeline not wired) is resolved, all events have null prices. The `tbd` filter will match all 438 events during this period. This resolves automatically once the price pipeline runs — no code change needed.

### Vibe WHERE condition

Postgres array overlap operator — matches events where the `genre` array contains the selected vibe:

```typescript
sql`${events.genre} && ARRAY[${filterVibe}]::text[]`
```

Applied as an additional `and()` clause. Returns events that have at least one matching genre label.

---

## Section 3: Web Changes

**File:** `apps/web/src/app/(protected)/events/page.tsx`

In `fetchEvents()`, forward the two new params alongside the existing ones:

```typescript
if (typeof params['filterPrice'] === 'string')
  qs.set('filterPrice', params['filterPrice'])
if (typeof params['filterVibe'] === 'string')
  qs.set('filterVibe', params['filterVibe'])
```

No other web changes required. The URL param read, chip UI, and active-filter indicator are already wired correctly in `FilterBar.tsx` and `filter-defs.ts`.

---

## Section 4: Cost Tracking

Genre-tagger writes to `cost_tracking` following the exact same pattern as the existing LLM extractor in `crawl.ts`:

```typescript
await db.insert(costTracking).values({
  service: 'genre-tagger',
  costUsd: costUsd.toFixed(6),
  tokensUsed: String(tokenUsage.inputTokens + tokenUsage.outputTokens),
  metadata: JSON.stringify({
    crawlRunId,
    venueId,
    eventsTagged: results.length,
    ...tokenUsage,
  }),
})
```

This data is immediately queryable from the DB and will surface in the Cost Tracking admin UI when issue #67 ships.

---

## Section 5: Testing

### Unit tests

**`packages/crawler-core/src/lib/genre-tagger.test.ts`** (new):

- Mock Anthropic client — verify correct tool use payload structure
- Verify Drizzle updates are called with correct genre arrays per event
- Verify `cost_tracking` insert happens with `service: 'genre-tagger'`
- Verify function returns without throwing when Haiku call fails
- Verify no API call is made when all events already have genres

### Integration tests

**`apps/api/src/routes/events.integration.test.ts`** (extend existing):

- `filterPrice=under-25` returns only events with `ticket_price_min < 25`
- `filterPrice=tbd` returns only events with null price fields
- `filterVibe=rock` returns only events where genre array contains 'rock'
- Combined `filterPrice` + `filterVibe` applies both conditions
- Unknown `filterPrice`/`filterVibe` values return 400

### No new E2E tests

The existing browse E2E covers the filter UI path. Filter correctness is verified by integration tests.

---

## Related Issues

| Issue | Description                                                          | Status                  |
| ----- | -------------------------------------------------------------------- | ----------------------- |
| #56   | Browse filters wired to event list                                   | This feature            |
| #126  | Price pipeline not wired to crawler (root cause: price data missing) | Open                    |
| #67   | Cost tracking admin UI (where genre-tagger costs will surface)       | Open — beta deliverable |

---

## Out of Scope

- Multiple simultaneous vibe filters (single-select matches the current UI)
- Price range display on event cards (separate UI work)
- Genre admin editing / manual override
- Batch API for Haiku calls (real-time API is sufficient at this volume; revisit if events/day exceeds 500)
