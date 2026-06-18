# Per-Platform Fetcher Dispatch — Design

**Issue:** [#623](https://github.com/HartiganHM/concert-crawl/issues/623)
**Status:** Draft for review
**Author:** Claude
**Date:** 2026-06-17

---

## Context

The Bluebird investigation (2026-06-16, PRs #611/#616/#622) surfaced a class-of-bug rather than a one-off:

- Bluebird isn't a custom Squarespace-y site — it's AEG Presents' `template12` platform
- Events load client-side from a JSON blob hosted at `aegwebprod.blob.core.windows.net/json/data/data_rv1/<venueId>/search_queries.json`
- Playwright was capturing `page.content()` before hydration finished, returning 0 events on a `status: success` crawl
- The temporary fix (set `crawlWaitForSelector = .c-axs-event-card__wrapper`) works but is a workaround — the platform wants to be talked to via its JSON, not its DOM

Subsequent reflection: **most Denver venues run on a small handful of shared third-party platforms**, and many of those platforms have direct JSON APIs we could be hitting instead of scraping rendered HTML. The current "HTML → JSON-LD → LLM" cascade was designed for bespoke venue sites; for platform venues it's the wrong tool.

## Audit findings — 12 active Denver venues

Conducted 2026-06-17 via direct HTML inspection (`WebFetch` + grep for platform markers like `aegwebprod`, `etix.com`, `_next/`, `axs.com`, etc.).

| Venue | Platform | Evidence | Has direct API |
|---|---|---|---|
| Bluebird Theater | **AEG `template12`** | `.c-axs-event-card__wrapper`, AEG blob ref, venue ID **449** | Yes — `aegwebprod` JSON |
| Fiddler's Green Amphitheatre | **AEG `template12`** | Same pattern, venue ID TBD | Yes |
| Gothic Theatre | **AEG `template12`** | Same pattern, venue ID TBD | Yes |
| Mission Ballroom | **AEG `template12`** | Same pattern, venue ID TBD | Yes |
| Ogden Theatre | **AEG `template12`** | Same pattern, venue ID **420** | Yes |
| The Fillmore Auditorium | **AEG `template12`** | Same pattern, venue ID TBD | Yes |
| Cervantes' Masterpiece Ballroom | **Etix (WordPress wrapper)** | `etix.com/ticket/o/6122` references, RankMath SEO, `rhp-event-cta` classes | Etix has a partner-scoped JSON catalog API |
| Larimer Lounge | **Etix (WordPress wrapper)** | Same pattern as Cervantes, partner_id 100 | Yes — same Etix API |
| Marquis Theater | **Ticketmaster (Next.js SPA)** | `/_next/` chunks, Chakra UI, embedded TM event IDs (`1E006466CC26E0AB`-style) | Yes — Ticketmaster Discovery API (public, key-required) |
| Summit Music Hall | **Ticketmaster (Next.js SPA)** | Same pattern as Marquis | Yes — same TM API |
| Red Rocks Amphitheatre | **AXS** | `axs.com/events/` with `skin=redrocks`, WordPress CMS for content | AXS has a partner API; public discovery endpoints exist via the site itself |
| Hi-Dive | **Bespoke (WordPress + Plot Bella theme)** | `wp-theme-plot-bella` class, no ticketing partner detected in initial scan | Unknown — keep on LLM cascade fallback |

**Distribution:**
- **AEG: 50% (6 venues)** — highest payoff per adapter LOC
- **Etix: 17% (2 venues)**
- **Ticketmaster: 17% (2 venues)**
- **AXS: 8% (1 venue)**
- **Bespoke: 8% (1 venue)** — keep on the existing LLM cascade

Adapter implementation ordered by venue-coverage / payoff: AEG → Etix → Ticketmaster → AXS.

---

## Goals

1. **Eliminate the hydration-race class of bugs** for AEG sister venues and any future platform venue.
2. **Reduce LLM cost** — a platform JSON fetch is structured ground truth; no Claude Haiku call needed for those venues.
3. **Reduce crawl latency + memory footprint** for platform venues — no Chromium, no full-page-render wait.
4. **Improve extraction quality** — JSON fields are unambiguous; LLM can confabulate dates / artists.
5. **Make adding new venues easier** — if a venue is on a known platform, onboarding is just identifying the platform + capturing the platform-specific venue ID.

## Non-goals

- **Eliminating the LLM cascade.** Bespoke venues will continue to use it. The dispatch falls through to the existing path when no platform fetcher applies.
- **Auto-detection at runtime as the primary onboarding flow.** We can probe to confirm, but the admin UI / onboarding script sets `venue.platform` explicitly. Auto-detection is a nice-to-have for the future, not in this design.
- **Migrating staging / prod schema in a backward-incompatible way.** All schema changes are additive (new nullable columns).
- **A bidirectional schema sync with platforms.** We read; we don't write.

---

## Architecture

### Module layout

```
packages/crawler-core/src/lib/fetchers/
├── index.ts                # exports dispatch() + the PlatformFetcher type
├── dispatch.ts             # picks the right fetcher for a venue
├── aeg.ts                  # AEG template12 adapter
├── aeg.test.ts             # fixture-driven unit tests
├── etix.ts                 # Etix adapter (later PR)
├── etix.test.ts
├── ticketmaster.ts         # TM Discovery API adapter (later PR)
└── ticketmaster.test.ts
```

The existing `packages/crawler-core/src/lib/fetcher.ts` stays as-is — it handles the **HTML retrieval layer** (Playwright vs HTTP, robots, rate limiting). The new `fetchers/` directory handles the **event extraction layer** for specific platforms, bypassing both HTML retrieval AND the LLM extraction stage entirely when a platform JSON is available.

### Interface

```ts
// fetchers/index.ts
import type { NormalizedEvent } from '../../types.js'
import type { Venue } from '@concert-crawl/db'

export interface PlatformFetchResult {
  events: NormalizedEvent[]
  /** Source URL we ended up fetching, for crawl_runs.source_url */
  sourceUrl: string
  /** Platform-specific metadata we want logged (e.g. JSON page count, fetch latency) */
  meta?: Record<string, unknown>
}

export interface PlatformFetcher {
  readonly platform: VenuePlatform
  /** Returns null if this fetcher can't handle the venue (e.g. missing platformVenueId) */
  canHandle(venue: Venue): boolean
  fetch(venue: Venue, opts: { crawlDelayMs: number }): Promise<PlatformFetchResult>
}

export type VenuePlatform =
  | 'aeg'
  | 'etix'
  | 'ticketmaster'
  | 'axs'
  | 'bespoke'
```

### Dispatcher

```ts
// fetchers/dispatch.ts
import { aegFetcher } from './aeg.js'
// import { etixFetcher } from './etix.js' (later)

const FETCHERS: PlatformFetcher[] = [aegFetcher /*, etixFetcher, ...*/]

export function dispatch(venue: Venue): PlatformFetcher | null {
  if (!venue.platform) return null
  const fetcher = FETCHERS.find((fch) => fch.platform === venue.platform)
  if (!fetcher) return null
  return fetcher.canHandle(venue) ? fetcher : null
}
```

### Integration into `crawl.ts`

The success path in `crawlVenue` (around line 230 of `crawl.ts`) currently calls `fetchPage(...)` or `fetchPageHttp(...)`, then extracts via JSON-LD / LLM. The new flow:

```ts
// At the top of crawlVenue, after venue + robots check but before fetch
const platformFetcher = dispatch(venue)
if (platformFetcher) {
  const { events, sourceUrl, meta } = await platformFetcher.fetch(venue, {
    crawlDelayMs: venue.crawlDelayMs,
  })
  // Run the same normalize → dedupe → upsert pipeline that the LLM path uses
  // (existing code), but skip the HTML retrieval + extraction stages.
  // crawl_runs row records:
  //   - extractionStrategyUsed: 'platform:aeg' (new value, see migration)
  //   - sourceUrl, eventsFound, etc.
  //   - duration_ms reflects only the platform fetch, not Chromium
  return runSuccessPath({ events, sourceUrl, strategy: 'platform:aeg', meta, ... })
}
// Fall through to existing HTML → JSON-LD → LLM cascade
```

The `extraction_strategy_used` column gets new values: `platform:aeg`, `platform:etix`, etc. The existing values (`structured_data`, `llm`, `null`) remain valid for the fallback path. A future PR can split this into a separate `platform` column if the joined naming becomes awkward.

### Schema migration

One additive migration:

```sql
-- 0038_venue_platform.sql
ALTER TABLE venues
  ADD COLUMN IF NOT EXISTS platform text,
  ADD COLUMN IF NOT EXISTS platform_venue_id text;

-- Validate at the application layer (Zod enum on insert/update);
-- intentionally not a Postgres enum to avoid the "drop + recreate" pain
-- if we add platforms (Etix, TM, AXS) in follow-up PRs.
```

No data backfill in the migration itself. Onboarding each AEG venue happens as a separate per-venue UPDATE in the AEG implementation PR (or via admin UI).

### Auto-detection helper (optional, separate PR)

For future onboarding ergonomics, a `detectPlatform(html: string): VenuePlatform | null` helper that grep-matches against known platform markers (the same patterns surfaced in the audit above). Out of scope for this initial design — admin UI manual entry is sufficient for the 12 known venues.

---

## AEG adapter — first concrete implementation

### Data source

```
GET https://aegwebprod.blob.core.windows.net/json/data/data_rv1/<platformVenueId>/search_queries.json
```

No auth required (it's a CDN blob). Response is a JSON object with a top-level `events` array; each event has `name`, `dateString`, `time`, `artistName`, etc. Detailed schema mapping happens in the implementation PR — for the design doc, the relevant property is **it's a stable JSON shape we can parse without an LLM**.

### Mapping to `NormalizedEvent`

| AEG field | `NormalizedEvent` field | Notes |
|---|---|---|
| `name` | `title` | Direct |
| `artistName` | `artist` | Direct |
| `dateString` | `date` | Parse to ISO `YYYY-MM-DD` in venue's tz |
| `time` | `showTime` | Parse to `HH:MM:SS` |
| `doorsTime` (when present) | `doorsTime` | Parse to `HH:MM:SS` |
| `eventUrl` | `ticketUrl` | Direct |
| `imageUrl` (when present) | `imageUrl` | Direct |

`confidence` is set to `1.0` for platform fetches (no LLM uncertainty).

`sourceHash` is computed exactly as today (the existing `hashEvent` function in `packages/crawler-core/src/lib/hash.ts`) so the existing change-detection pipeline (#607) still flags verified-event changes correctly. Verified rows where source data changes still fire `crawl.verified_event_changed` notifications.

### Onboarding the 6 AEG venues

One-time work, can be a single SQL migration block or admin-UI flow:

```sql
UPDATE venues SET platform = 'aeg', platform_venue_id = '449'
  WHERE slug = 'bluebird-theater';
UPDATE venues SET platform = 'aeg', platform_venue_id = '420'
  WHERE slug = 'ogden-theatre';
-- Repeat for Fiddler's Green, Gothic, Mission, Fillmore (IDs TBD via probe crawl)
```

We already know Bluebird = 449 and Ogden = 420 from the audit. The other four IDs will be discovered during the implementation PR by hitting their current pages once and grepping for the AEG blob URL pattern.

After the AEG adapter ships and these venues are onboarded:
- The existing `crawlWaitForSelector = .c-axs-event-card__wrapper` becomes dead code for them (the platform path doesn't use Playwright) — leave it set anyway as a defensive fallback in case the platform is unreachable and we need to fall back to LLM.
- The `crawl_mode = 'browser'` setting similarly becomes irrelevant on the platform path but harmless.

---

## Failure modes & fallback

### What happens when a platform endpoint is down?

The adapter throws. The dispatcher catches and falls through to the existing HTML → LLM path. This means an AEG outage degrades to "crawl works but uses Chromium + Haiku" — slower and more expensive but not broken. Same shape as today.

### What happens when the platform's JSON shape changes?

The adapter's Zod validation rejects the payload. Adapter throws. Same fallback as above. Sentry captures the validation failure so we know to update the schema mapping.

### What happens when `platform_venue_id` is wrong?

Adapter gets a 404 from the blob URL. Treats as platform-down, falls through. We log a warning so admin sees the misconfiguration in the admin notifications inbox.

### What happens when the platform supplies events we'd flag as low-confidence on the LLM path?

Platform fetches don't go through `confidenceScore < AUTO_APPROVE_THRESHOLD` since `confidence: 1.0` is set. Verified-event changes (#607 path) still apply.

### Risk: AEG outage takes out 6 venues simultaneously

Acknowledged. The fallback to LLM path mitigates partially. Counter-arguments:
- The current LLM path already takes out the same 6 venues simultaneously every time AEG changes their hydration timing (we've seen this).
- Sentry + the event-count-drop alert (#624) will surface the regression within a single crawl cycle.

The aggregate risk is lower, not higher, because the platform path is structured and the LLM path is fuzzy.

---

## Testing strategy

### Unit tests (per adapter)

- Fixture-driven: capture a real AEG blob JSON response into `packages/crawler-core/src/lib/fetchers/__fixtures__/aeg-bluebird.json`, assert it maps to N expected `NormalizedEvent` rows.
- Schema validation: feed a malformed fixture, assert the adapter throws cleanly.
- 404 handling: mock `fetch` to return 404, assert the adapter throws `PlatformNotAvailableError` (a new error class).

### Dispatch tests

- `dispatch(venue)` returns the correct fetcher for each `venue.platform` value.
- Returns `null` for `platform === null` (falls through to existing path).
- Returns `null` when `platform_venue_id` is missing (defensive against onboarding bugs).

### Integration test (one per platform)

Reuses the existing `crawl.integration.test.ts` pattern — mocks the HTTP layer, asserts `crawl_runs.extraction_strategy_used === 'platform:aeg'` and the event rows land in the events table correctly. One per platform is sufficient because each adapter is independent.

### No staging probe test

The implementation PR will trigger a single AEG crawl on staging on one venue (Bluebird) to verify the wire-up works end-to-end, then promote.

---

## Implementation order

1. **This spec PR** — design doc only, no code. Get user signoff. (Current PR.)
2. **AEG adapter PR** — schema migration + dispatcher + AEG fetcher + tests + onboard the 6 AEG venues. Closes #623's "AEG implementation" portion.
3. **(Follow-up issue) Etix adapter** — same pattern, 2 venues covered.
4. **(Follow-up issue) Ticketmaster adapter** — needs TM Discovery API key.
5. **(Follow-up issue) AXS adapter** — partner API research first.

Bespoke / Hi-Dive remains on the existing LLM cascade indefinitely.

---

## Open questions for review

1. **Should `platform` be a Postgres enum or text+Zod?** Spec leans toward text+Zod for the iteration cost. Postgres enums are painful to extend (Drizzle requires a migration; existing transactions can't `ADD VALUE` and then `USE` it in the same TX, per the 0034 migration we hit earlier in #631). Text + app-layer Zod is more flexible.

2. **Should the AEG venue IDs live in `venues.platform_venue_id` (a column) or `venues.platform_config` (jsonb)?** Spec leans toward a dedicated column because every platform we've audited needs exactly one ID. If a future platform requires a tuple (e.g. partner_id + venue_id), we'd revisit. Cost of revisiting is one migration.

3. **Should the dispatcher's fallback to the LLM cascade be silent, or should it emit a warning notification?** Spec leans silent — fallback is by design, not a bug — but the admin notification inbox is the natural place for "AEG was unreachable, falling back" once we expect platform fetches to be the norm.

4. **Should we add a `last_platform_fetch_ok_at` column for observability?** Spec doesn't propose this. Same data is recoverable from `crawl_runs.extraction_strategy_used`, but a dedicated column would make "find venues where platform fetch hasn't worked in N days" a single-table query. Open to either.

---

## Done state for this design

Approve, push back, or ask for more depth. After approval, the AEG-adapter implementation PR can land in beta week 3 per the issue's original timeline.
