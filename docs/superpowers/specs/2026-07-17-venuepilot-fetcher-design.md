# VenuePilot API Fetcher — Design (#505)

**Date:** 2026-07-17
**Issue:** #505 — VenuePilot API integration for API-backed venue crawling
**Depends on:** #506 (shipped) — added `venues.api_provider` (`'venuepilot'`) + `venues.api_account_id` columns and the admin UI to set them.

## Problem

When a venue has `apiProvider = 'venuepilot'` and `apiAccountId` set, the crawler should pull events directly from the VenuePilot GraphQL API instead of running the HTML → JSON-LD → LLM cascade. First target: **Levitt Pavilion Denver, account 1105**.

The crawler already has a vendor-API dispatch mechanism — the **PlatformFetcher registry** (#623), which routes venues to a platform-specific adapter that returns `NormalizedEvent[]` directly, bypassing the cascade. AEG is the only current adapter, keyed off `venues.platform`. VenuePilot slots into this same registry as a sibling adapter, keyed off `venues.api_provider`.

We deliberately **reuse** the fetcher registry rather than building the standalone `extractors/venuepilot.ts` the original issue text suggested — that would be a third parallel mechanism doing the same job. The `api_provider`/`api_account_id` columns from #506 stay as-is; no schema change.

## Verified VenuePilot contract

Probed live on 2026-07-17 against account 1105 (the issue's documented contract was stale — wrong argument shape, wrong image path, wrong pagination knob):

- **Endpoint:** `POST https://www.venuepilot.co/graphql` — public, no auth, no API key.
- **Query:** single field `paginatedEvents(arguments: EventsApiArguments)`:
  - `accountIds: [Int!]` — the venue's VenuePilot account id (e.g. `[1105]`).
  - `startDate: String` — `"YYYY-MM-DD"`; filters to events on/after this date.
  - `page: Int` — 1-based. Default page size is 100 (`metadata.limitValue`); there is no `perPage` argument.
- **Response:**
  ```
  data.paginatedEvents.collection: Event[]
  data.paginatedEvents.metadata: { totalCount, totalPages, currentPage, limitValue }
  ```
- **Event fields used:**
  | GraphQL field | Type | Notes |
  |---|---|---|
  | `id` | Int | stable event id |
  | `name` | String | ⚠ may carry trailing whitespace — trim |
  | `date` | `"YYYY-MM-DD"` | venue-local |
  | `doorTime` | `"HH:MM:SS"` | venue-local |
  | `startTime` | `"HH:MM:SS"` | venue-local |
  | `description` | HTML String | heavy markup incl. `<iframe-embed>` — must be stripped |
  | `ticketsUrl` | String | public ticketing URL |
  | `status` | String | display text ("FREE RSVP/UPGRADE", "BUY TICKETS") — not a clean enum |
  | `announceArtists` | `[{ name }]` | headliner first; **can be empty** on some events |
  | `announceImages` | `[{ highlighted: Bool, variants: [{ variant, src }] }]` | `variant ∈ { 'cover', 'cover_small', 'thumb' }` — no `original` |

  Sample (account 1105): `{ id:166377, name:"High Fade with Atlas Radio", date:"2026-07-03", doorTime:"18:00:00", startTime:"19:00:00", ticketsUrl:"https://tickets.venuepilot.com/e/...", announceArtists:[{name:"High Fade"},{name:"Atlas Radio"}] }`.

## Field mapping → `NormalizedEvent`

| NormalizedEvent | Source | Rule |
|---|---|---|
| `title` | `name` | `.trim()` |
| `rawTitle` | `name` | same as `title` (mirrors AEG; keeps the cross-venue presale filter's input contract uniform, #826) |
| `artist` | `announceArtists[0].name` | headliner; **fallback to `title`** when the array is empty |
| `date` | `date` | passthrough — already `YYYY-MM-DD` venue-local |
| `showTime` | `startTime` | passthrough — already `HH:MM:SS` |
| `doorsTime` | `doorTime` | passthrough; omit when absent |
| `ticketUrl` | `ticketsUrl` | omit when absent/empty |
| `imageUrl` | highlighted image → `variant === 'cover'` `.src` | fallback: first variant of the highlighted image, then first image overall; omit if no images |
| `description` | `description` | `stripDescriptionHtml()` (existing helper); omit when the stripped result is empty |
| `confidence` | — | `1.0` (platform fetch, no LLM uncertainty) |
| `sourceUrl` | `venue.websiteUrl` | the venue's canonical calendar URL (matches AEG/LLM convention) |

`exactOptionalPropertyTypes: true` → optional fields are conditionally spread, never set to `undefined`.

## New file — `packages/crawler-core/src/lib/fetchers/venuepilot.ts`

Mirrors `aeg.ts` structure exactly:

- **Zod schema** for the GraphQL response with `.passthrough()` on objects; only the mapped fields are required. Schema drift → `VenuePilotSchemaError`.
- **Error classes:** `VenuePilotFetchError` (HTTP / GraphQL errors, carries status + url) and `VenuePilotSchemaError` (Zod issues + url). Both bubble to `crawlVenue`'s outer catch → treated as a normal crawl failure (`consecutive_failures++`, `status='failed'`). No silent fallback to the LLM path — a broken fetcher must be audible.
- **`normalize(event, venue): NormalizedEvent | null`** — applies the mapping above; returns `null` (with a warn log) for events with an empty/whitespace-only `name`.
- **`fetch(venue, { crawlDelayMs, timeoutMs })`:**
  - `accountIds = [Number(venue.apiAccountId)]`; `startDate` = today in `venue.timezone` (so only upcoming shows return).
  - `AbortSignal.timeout(timeoutMs)` when provided; honest `User-Agent: ConcertCrawl/1.0 (+https://concertcrawl.app/bot)`; `Content-Type: application/json`.
  - Respects `crawlDelayMs` before each request (including between pages).
  - Paginates `page = 1..metadata.totalPages` (Levitt = 1 page; larger accounts loop). A hard page cap (e.g. 50) guards against a runaway `totalPages`.
  - GraphQL `errors[]` in the body → `VenuePilotFetchError` even on HTTP 200.
  - Returns `PlatformFetchResult { events, sourceUrl: endpoint, meta: { fetchLatencyMs, totalCount, pagesFetched, eventsAfterNormalization } }`.
- **Export** `venuePilotFetcher: PlatformFetcher`.

## Registry reconciliation (the only change to shipped crawler code)

`dispatch.ts` currently short-circuits on `!venue.platform` and matches `entry.platform === venue.platform` — AEG-specific. Generalize it:

- `dispatch(venue)` becomes `FETCHERS.find((f) => f.canHandle(venue)) ?? null`. Drop the `venue.platform` early-return.
- Each fetcher owns its own matching in `canHandle`:
  - AEG (unchanged): `venue.platform === 'aeg' && venue.platformVenueId`.
  - VenuePilot: `venue.apiProvider === 'venuepilot' && venue.apiAccountId` (non-empty). A VenuePilot venue has `platform = null`, so it never matches AEG.
- `FETCHERS = [aegFetcher, venuePilotFetcher]`.

The `PlatformFetcher.platform` field is used only to build the `extraction_strategy_used` string (`platform:${x}`) and the structured log. It is broadened and **renamed to `source`** (VenuePilot is an `apiProvider`, not a "platform") with type `'aeg' | 'venuepilot'`:

- `index.ts`: `readonly source: 'aeg' | 'venuepilot'` replaces `readonly platform: VenuePlatform`.
- `aeg.ts`: `source: 'aeg'` replaces `platform: 'aeg'`.
- `crawl.ts`: `platformFetcher.platform` → `platformFetcher.source`; the local `strategy` type widens from `` `platform:${VenuePlatform}` `` to `` `platform:${'aeg' | 'venuepilot'}` ``. `crawl_runs.extraction_strategy_used` (free text) records `'platform:venuepilot'`, keeping the existing `platform:*` = "came from a fetcher" convention operators already know. The `crawl.platform_fetch` log's `platform` key is renamed to `source`.

No behavioral change to the AEG path — same dispatch result, same strategy string `platform:aeg`.

## Tests

- **`venuepilot.test.ts`** (unit) against a captured real-response fixture from account 1105:
  - happy path: full normalize, `date`/`showTime`/`doorsTime` passthrough, headliner artist, `cover` image selection.
  - edge cases: empty `announceArtists` → artist falls back to title; no images → `imageUrl` omitted; whitespace-only `name` → event skipped; HTML description stripped; trailing-whitespace title trimmed.
  - schema drift → `VenuePilotSchemaError`; HTTP non-200 → `VenuePilotFetchError`; GraphQL `errors[]` on 200 → `VenuePilotFetchError`.
  - pagination: multi-page `metadata.totalPages` loops and concatenates; page cap respected.
- **`dispatch.test.ts`** (extend): a `apiProvider='venuepilot'` venue routes to `venuePilotFetcher`; AEG venue still routes to `aegFetcher` (regression); a venue with neither returns `null`; `apiProvider='venuepilot'` but no `apiAccountId` returns `null`.

## Scope / non-goals

- **No schema/migration change** — #506 already shipped the columns.
- **No API/UI change** — crawler-only.
- **No AEG migration** — the two column pairs coexist; unifying them is explicitly out of scope.
- First live validation: enable a crawl for Levitt Pavilion (account 1105) after merge; verify `extraction_strategy_used = 'platform:venuepilot'` and events populate.
