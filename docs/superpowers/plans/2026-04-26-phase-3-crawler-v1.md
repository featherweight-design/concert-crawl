# Phase 3: Crawler v1 — Implementation Plan

**Date:** 2026-04-26
**Milestone:** Admin can trigger a crawl for a single venue, events appear in DB, cost is recorded.

---

## Process

This phase uses granular PRs with explicit user validation checkpoints between each one. No PR proceeds until the previous one is validated by the user. Code quality expectations are unchanged.

---

## First Venue: Red Rocks Amphitheatre

**URL:** `https://www.redrocksonline.com`
**Why:** Denver's most prominent venue, custom-built site with AXS ticketing integration (which typically generates schema.org markup), well-structured event calendar. Best candidate for clean JSON-LD structured data.

**Fallback:** If Red Rocks doesn't publish JSON-LD, the LLM extractor picks it up automatically — the extraction pipeline is strategy-agnostic by design.

---

## What's Already in Place

- `events` table — exists in migration `0000`, schema in `packages/db/src/schema/events.ts`
- `crawl_runs` table — exists in migration `0000`, schema in `packages/db/src/schema/crawl-runs.ts`
- `cost_tracking` table — exists in migration `0000`, schema in `packages/db/src/schema/commerce.ts`
- `extractionStrategyEnum` — `structured_data | llm | manual` defined in venues schema
- `apps/crawler/src/index.ts` — stub only, needs full implementation

**What's missing:**

1. Unique constraint on `events(venue_id, date, artist)` — only an index exists today, not a constraint. Required for upsert deduplication.
2. Red Rocks in the seed data
3. All crawler implementation

---

## Architecture Decision: `packages/crawler-core`

The crawler logic lives in a new shared package — **`packages/crawler-core`** — rather than directly in `apps/crawler`.

**Why:** The admin UI trigger (Phase 3) and the Render cron job (Phase 6) both need to run the same crawl logic. A shared package avoids duplication and enforces a single implementation.

| Consumer                 | How it uses crawler-core                                                |
| ------------------------ | ----------------------------------------------------------------------- |
| `apps/api` (Phase 3)     | Imports `crawlVenue()` for the `POST /v1/admin/crawl/:venueId` endpoint |
| `apps/crawler` (Phase 6) | Entry point calls `crawlVenue()` for all active venues via cron         |

**Playwright dependency note:** Both `apps/api` and `apps/crawler` will transitively depend on `@playwright/test`. Render web services require explicit browser installation (~150MB). For Phase 3 local validation this is fine. Staging/prod browser installation will be addressed before the Phase 6 cron PR — not before.

---

## User-Required Steps

These steps require manual action outside of code changes and must be completed before the relevant PR can be validated.

**Before PR 2 (crawler-core):**

- Add `ANTHROPIC_API_KEY` to `apps/api/.env.example` with a placeholder value (e.g. `sk-ant-...`)
- Copy the key from the Anthropic Console and add `ANTHROPIC_API_KEY=<real_value>` to `apps/api/.env.local`

**Before staging validation (PR 3 / PR 4):**

- Add `ANTHROPIC_API_KEY` to the `concert-crawl-api` service environment variables in Render dashboard
- Redeploy the API service on Render after adding the variable

---

## Crawl Failure Handling

**Failure threshold:** 3 consecutive failures

**What happens at each failure:**

- Each failed crawl increments `venue.consecutive_failures` in the DB
- 403/429 responses additionally set `venue.blocked_at`

**What happens at threshold (consecutive_failures >= 3):**

- A record is written to the `notifications` table:
  - `type: 'admin_alert'`
  - `category: 'crawl.failed'`
  - `message`: includes venue name and failure count
- This notification surfaces in the admin notification bell (already designed in the spec — Phase 3 only writes the record; the UI bell reads from this table)
- The venue is NOT automatically deactivated — admin must take action

**How to inspect crawl health:**

- `crawl_runs` table: every crawl attempt is recorded with status, error message, and HTTP status code
- `venues` table: `consecutive_failures`, `blocked_at`, and `last_crawled_at` columns give point-in-time health
- Admin notification bell: surfaced when `consecutive_failures >= 3`

---

## Observability

**Phase 3:** Structured `console.log` is used as a placeholder throughout `packages/crawler-core`. Every significant crawl event (start, fetch result, extraction strategy chosen, events upserted, cost recorded, failure) emits a structured log object. These logs surface in:

- Local terminal output during development
- Render log stream in staging

**Known gap:** This is not sufficient for production debugging. Structured log output without a log aggregator makes triage on failures difficult — especially for intermittent crawl issues. Pino structured logging + a log aggregator (e.g. Better Stack, Papertrail) is planned for **Phase 5** before production launch.

---

## Cost Calculation

`src/lib/cost.ts` uses **static pricing values** sourced from [Anthropic's published pricing page](https://www.anthropic.com/pricing) at the time of implementation:

| Token type  | Rate                                      |
| ----------- | ----------------------------------------- |
| Input       | $0.80 / 1M tokens                         |
| Output      | $4.00 / 1M tokens                         |
| Cache read  | $0.08 / 1M tokens (90% savings vs. input) |
| Cache write | $1.00 / 1M tokens                         |

**Important:** These values are hardcoded constants. If Anthropic changes Haiku pricing, they must be updated manually in `cost.ts`. The cost tracking records in the DB will reflect whatever values were in effect at crawl time — historical cost_tracking rows are not retroactively updated when pricing changes.

---

## Async Crawl Trigger

A crawl can take 10–30 seconds (Playwright launch + page load + optional LLM call). A synchronous HTTP request would risk client-side timeouts.

**Pattern:**

1. `POST /v1/admin/crawl/:venueId` accepts the request, starts the crawl asynchronously, and immediately returns `202 Accepted` with a `crawl_run_id`
2. The UI polls `GET /v1/admin/crawl-runs/:id` every 2 seconds until `status` is no longer `in_progress`
3. On completion (success / failed / partial), the UI stops polling and renders the result

This avoids timeouts while keeping the trigger feel synchronous from the user's perspective.

---

## PR Breakdown

### PR 1 — DB: deduplication constraint + Red Rocks seed

**Branch:** `feat/phase-3-db-event-dedup`
**Size:** Tiny — one migration file + seed update.

**What changes:**

- New Drizzle migration: add `UNIQUE(venue_id, date, artist)` constraint to `events`
  - This enables `INSERT ... ON CONFLICT DO UPDATE` upserts in the crawler
  - The existing btree index `events_venue_date_artist_idx` stays — it's needed for query performance, separate from the constraint
- Update Drizzle schema to reflect the new constraint
- Update `packages/db/src/seed.ts`: add Red Rocks Amphitheatre as the first verified, active venue
  - `name`: "Red Rocks Amphitheatre"
  - `slug`: "red-rocks"
  - `website_url`: "https://www.redrocksonline.com"
  - `city`: "Denver"
  - `active`: true
  - `verified`: true
  - `crawl_delay_ms`: 3000

**User validation checkpoint:**

_Local:_

- Run `pnpm db:migrate` and confirm it completes without errors
- Run `pnpm db:seed` and confirm Red Rocks is seeded
- Open Drizzle Studio (`pnpm db:studio`) or psql and confirm:
  - `events` table has a unique constraint on `(venue_id, date, artist)` (visible under table constraints, not just indexes)
  - `venues` table has a row for Red Rocks with `active = true` and `verified = true`

_Staging:_

- Not required for this PR — no API or UI changes. Migrations will be applied as part of the next deploy.

---

### PR 2 — `packages/crawler-core`: extraction engine

**Branch:** `feat/phase-3-crawler-core`
**Size:** Medium — new package, several focused modules, unit tests.
**Depends on:** PR 1 merged

**User-required before this PR:** Add `ANTHROPIC_API_KEY` to `.env.example` and `.env.local` (see User-Required Steps above).

**New package:** `packages/crawler-core`

- `package.json` — deps: `playwright`, `@anthropic-ai/sdk`, `@concert-crawl/db`, `@concert-crawl/types`
- `tsconfig.json`

**Modules:**

`src/lib/robots.ts` — robots.txt compliance

- `isAllowed(url: string, userAgent: string): Promise<boolean>`
- Fetches and parses `/robots.txt`, caches result in memory for the process lifetime
- Returns `true` (allowed) if fetch fails (fail open — don't block crawls due to network errors checking robots.txt)
- Emits structured `console.log` on allow/deny/error

`src/lib/fetcher.ts` — rate-limited HTML fetcher

- Uses Playwright to launch a headless Chromium browser
- User-agent: `ConcertCrawl/1.0 (+https://concertcrawl.app/bot)` (honest identification)
- Respects per-venue `crawl_delay_ms` + ±500ms jitter between requests
- Returns: `{ html: string; httpStatus: number; finalUrl: string }`
- Throws on non-2xx responses (caller handles 403/429 blocking logic)
- Emits structured `console.log` on fetch start, success, and error

`src/lib/extractors/json-ld.ts` — structured data extractor

- Parses `<script type="application/ld+json">` tags from HTML
- Finds objects where `@type` is `"Event"` or `"MusicEvent"` (handles arrays + `@graph`)
- Maps to `NormalizedEvent[]`:
  - `title: string`
  - `artist: string`
  - `date: string` (ISO date string)
  - `doorsTime?: string`
  - `showTime?: string`
  - `ticketUrl?: string`
  - `description?: string`
  - `imageUrl?: string`
  - `sourceUrl: string`
  - `confidence: 1.0` (always 1.0 — structured data is authoritative)
- Returns `[]` (not an error) if no JSON-LD events found — caller falls through to LLM
- Emits structured `console.log` with count of events found

`src/lib/extractors/llm.ts` — Claude Haiku extraction with prompt caching

- Cleans raw HTML: strips scripts, styles, nav, footer — keeps main content
- Calls Claude Haiku (`claude-haiku-4-5-20251001`) with structured extraction prompt
- Prompt includes `cache_control: { type: "ephemeral" }` on the system prompt block for prompt caching
- Returns `NormalizedEvent[]` with a `confidence` score from the model (0–1)
- Also returns `{ inputTokens, outputTokens, cacheReadTokens, cacheWriteTokens }` for cost tracking
- Throws on API errors (caller handles)
- Emits structured `console.log` with token usage and confidence scores

`src/lib/cost.ts` — cost calculation

- `calculateCost(usage: TokenUsage): number` — uses static Haiku pricing (see Cost Calculation section above)

**Unit tests** (Vitest):

- `json-ld.test.ts` — fixture HTML with JSON-LD, verify extraction
- `llm.test.ts` — mock Anthropic SDK, verify prompt structure + response parsing
- `robots.test.ts` — mock fetch, verify allow/deny logic

**User validation checkpoint:**

_Local:_

- Run `pnpm test` — all tests pass, no skips
- Run `pnpm typecheck` — 0 errors
- Optionally: write a one-off scratch script in `packages/crawler-core/scripts/` to run JSON-LD extraction against the live Red Rocks page and inspect the output in your terminal (do not commit this file)

_Staging:_

- Not required for this PR — no deployed surface area. Staging validation happens in PR 3.

---

### PR 3 — Orchestrator + API crawl trigger

**Branch:** `feat/phase-3-crawl-trigger`
**Size:** Medium — crawl orchestrator in crawler-core, new API route, tests.
**Depends on:** PR 2 merged

**`packages/crawler-core/src/crawl.ts`** — main orchestrator

`crawlVenue(venueId: string): Promise<CrawlRun>`

Flow:

1. Load venue from DB (`active = true`, `verified = true` — throws if not found or inactive)
2. Emit structured log: `{ event: 'crawl.start', venueId, venueName }`
3. Check robots.txt via `isAllowed()` — if disallowed: write `crawl_run` (status: `failed`, `robots_txt_blocked: 'yes'`) and return early
4. Fetch HTML via `fetcher.ts`
   - 403/429 → set `venue.blocked_at`, increment `consecutive_failures`, write failed `crawl_run`, return
5. Attempt JSON-LD extraction → if events found, strategy = `structured_data`
6. If JSON-LD returns `[]`, fall through to LLM extraction → strategy = `llm`
7. Normalize events → upsert to `events` table on `(venue_id, date, artist)` conflict
   - On conflict: update `title`, `ticket_url`, `description`, `image_url`, `status`, `updated_at`
   - `raw_html` stored on insert, not updated (for debugging)
   - `verified = false` for all LLM extractions; `verified = true` for structured data (confidence = 1.0)
8. Flag low-confidence events: any event with `confidence_score < 0.7` → `verified = false` (already handled above) + write to `notifications` table: `category: 'crawl.low_confidence'`
9. Write `crawl_runs` record: status, strategy used, events_found, events_inserted, duration_ms, http_status_code
10. If LLM used: write `cost_tracking` record for the Claude API call
11. Update venue: `last_crawled_at = now()`, reset `consecutive_failures = 0` on success
12. Emit structured log: `{ event: 'crawl.complete', venueId, strategy, eventsFound, eventsInserted, durationMs }`
13. Return the `CrawlRun` record

Error handling:

- Any unhandled error → increment `consecutive_failures`; if `>= 3`: write `notifications` record (`category: 'crawl.failed'`, `type: 'admin_alert'`)
- Always write a `crawl_run` record (success, failed, or partial)
- Emit structured log on every error path

**`apps/api/src/routes/admin/crawl.ts`** — trigger route

`POST /v1/admin/crawl/:venueId`

- Protected by existing `clerkAuth` + `requireRole('admin')` middleware (inherited from `adminRouter`)
- Validates `venueId` as UUID via Zod
- Starts `crawlVenue(venueId)` asynchronously (does not await)
- Immediately returns `202 Accepted` with the newly created `crawl_run_id`
- Sets `auditAction = 'crawl.trigger'`, `auditTargetId = venueId`
- Returns 404 if venue not found, 400 if inactive/unverified

`GET /v1/admin/crawl-runs/:id`

- Protected by same middleware
- Returns the `CrawlRun` record for the given ID
- UI calls this every 2s until `status !== 'in_progress'`

**Register route:**

- `adminRouter.route('/crawl', crawlAdminRouter)` in `apps/api/src/routes/admin/index.ts`

**Types** (`packages/types/src/index.ts`):

- Export `CrawlRun` type (mirrors DB schema)

**Unit tests:**

- Mock `crawlVenue` — test 202 response, 404, 400, audit log write
- Mock crawl run DB queries — test GET /v1/admin/crawl-runs/:id response shape

**User validation checkpoint:**

_Local:_

- Run `pnpm dev` to start all services
- In Bruno: `POST /v1/admin/crawl/:red-rocks-venue-id`
  - Confirm response is `202` with a `crawl_run_id`
- Poll `GET /v1/admin/crawl-runs/:crawl_run_id` every few seconds until `status` changes from `in_progress`
- In Drizzle Studio or psql, confirm:
  - `crawl_runs` has a new row with `status = 'success'` (or `'failed'` with an error message)
  - `events` table has upserted rows for Red Rocks events (check `venue_id` matches)
  - `cost_tracking` has a new row if LLM was used (strategy = `llm`)
  - `audit_log` has a new row with `action = 'crawl.trigger'`
- Check terminal output for structured log lines at each crawl step

_Staging:_

- Confirm `ANTHROPIC_API_KEY` is set in the Render `concert-crawl-api` environment (see User-Required Steps)
- Deploy PR 3 to staging (Render auto-deploys on merge to main, or trigger manual deploy)
- Run `pnpm db:migrate` against staging DB to apply migration 0001 if not yet applied
- In Bruno with the staging environment: `POST /v1/admin/crawl/:red-rocks-venue-id`
- Confirm same outcomes as local in the staging DB (Drizzle Studio can connect to staging with staging `DATABASE_URL`)

---

### PR 4 — Web: trigger UI + crawl history

**Branch:** `feat/phase-3-crawl-ui`
**Size:** Small — UI only, no new logic.
**Depends on:** PR 3 merged

**Note on venue edit form pattern:** The trigger UI is added to the existing venue detail page (`/admin/venues/[id]/page.tsx`). This page currently reuses the venue submission form as an edit form — this is a known UX pattern to revisit. Venues should have dedicated detail pages rather than repurposing the create form. This is flagged for future redesign; it is not addressed in Phase 3.

**Changes to `apps/web/src/app/(protected)/admin/venues/[id]/page.tsx`:**

Add a **"Trigger Crawl"** section below the venue edit form with two parts:

**1. Trigger button + last run summary**

- "Trigger Crawl" button calls `POST /v1/admin/crawl/:venueId` via a Client Component (not a Server Action — the async/poll pattern requires client-side state)
- On click: button enters loading state, call returns `202` with `crawl_run_id`
- UI polls `GET /v1/admin/crawl-runs/:crawl_run_id` every 2 seconds
- When `status !== 'in_progress'`: stop polling, show result inline without a full page refresh
- On error (network failure, 4xx/5xx): show inline error message, re-enable button
- Last crawl summary card (if a crawl_run exists):
  - Status badge: `success` (green) / `failed` (red) / `partial` (yellow)
  - Extraction strategy used
  - Events found / inserted
  - Duration
  - Timestamp (Mountain Time)

**2. Crawl history table**

- Fetched server-side at page load via `GET /v1/admin/crawl-runs?venueId=:id&limit=10`
- Refreshes after each completed poll cycle
- Columns: Timestamp, Status, Strategy, Events Found, Events Inserted, Duration, Error (if any)
- Simple table, no pagination for Phase 3 (10 rows max)

**New API endpoint** (same PR):

`GET /v1/admin/crawl-runs?venueId=:id&limit=10`

- Returns array of `CrawlRun` sorted by `created_at DESC`

**User validation checkpoint:**

_Local:_

- Run `pnpm dev`
- Navigate to `http://localhost:3000/admin/venues/<red-rocks-id>`
- Click "Trigger Crawl"
- Confirm:
  - Button enters loading/spinner state immediately
  - After 10–30 seconds, loading state resolves without a page refresh
  - Crawl result (status badge, events found, duration) appears inline
  - Crawl history table updates with the new run at the top
  - Re-click "Trigger Crawl" — second run appears in history table (upsert, not duplicate)
- Check DB: `events` rows for Red Rocks are present and updated

_Staging:_

- Deploy PR 4 to staging
- Open staging URL at `/admin/venues/<red-rocks-id>`
- Repeat local validation steps against the staging environment
- Confirm crawl runs and events appear in the staging DB

---

## File Map

```
concert-crawl/
├── packages/
│   ├── crawler-core/                              # NEW
│   │   ├── package.json
│   │   ├── tsconfig.json
│   └── src/
│       ├── lib/
│       │   ├── robots.ts
│       │   ├── fetcher.ts
│       │   ├── cost.ts
│       │   └── extractors/
│       │       ├── json-ld.ts
│       │       └── llm.ts
│       ├── crawl.ts                               # orchestrator
│       └── index.ts                               # barrel export
│   ├── db/
│   │   ├── src/schema/events.ts                   # MODIFY: add unique constraint
│   │   └── migrations/
│   │       └── 0001_event_dedup_constraint.sql    # NEW
│   └── types/
│       └── src/index.ts                           # MODIFY: add CrawlRun type
├── apps/
│   ├── api/
│   │   └── src/routes/admin/
│   │       ├── index.ts                           # MODIFY: register crawl route
│   │       ├── crawl.ts                           # NEW: trigger + crawl-runs endpoints
│   │       └── crawl.test.ts                      # NEW
│   ├── crawler/
│   │   ├── package.json                           # MODIFY: add crawler-core dep
│   │   └── src/index.ts                           # MODIFY: wire up crawlVenue
│   └── web/
│       └── src/
│           ├── app/(protected)/admin/venues/[id]/
│           │   └── page.tsx                       # MODIFY: add trigger section
│           ├── components/admin/
│           │   ├── crawl-trigger-button.tsx        # NEW: trigger + poll + status
│           │   └── crawl-history-table.tsx         # NEW: run history
│           └── lib/api.ts                         # MODIFY: add crawl API calls
└── packages/db/src/seed.ts                        # MODIFY: add Red Rocks
```

---

## Sequence of PRs

| #   | Branch                        | What to validate                                                                |
| --- | ----------------------------- | ------------------------------------------------------------------------------- |
| 1   | `feat/phase-3-db-event-dedup` | Migration applies, unique constraint exists, Red Rocks in seed                  |
| 2   | `feat/phase-3-crawler-core`   | `pnpm test` passes, `pnpm typecheck` clean                                      |
| 3   | `feat/phase-3-crawl-trigger`  | Bruno: 202 response, poll to completion, events + crawl_run in DB               |
| 4   | `feat/phase-3-crawl-ui`       | Trigger button works end-to-end, polling resolves inline, history table updates |

Each PR is reviewed and validated before the next branch is cut.

---

## Out of Scope for Phase 3

- Automated cron scheduling (Phase 6)
- Multiple concurrent venue crawls (Phase 6)
- Search vector / full-text search (Phase 4)
- Sentry / Pino structured logging (Phase 5)
- Staging + prod Playwright browser installation (before Phase 6)
- Venue detail page redesign — flagged for a future phase
