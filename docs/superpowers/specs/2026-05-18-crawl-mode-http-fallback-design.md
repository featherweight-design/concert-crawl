# Crawl Mode: HTTP-First with Browser Fallback

**Date:** 2026-05-18
**Status:** Approved — ready for implementation

---

## Problem

The crawler uses Playwright (headless Chromium) for every venue regardless of whether the page requires JS execution. This is expensive and fragile: some venues with anti-bot detection silently hang headless browser connections (returning no error, just a 60-second timeout), while their event pages are fully server-rendered and accessible via plain HTTP fetch.

**Observed impact:** Cervantes' Masterpiece Ballroom has been timing out daily since 2026-05-11 (Sentry CONCERT-CRAWL-CRAWLER-2). Red Rocks and Larimer Lounge are also server-rendered but currently crawled with Playwright unnecessarily.

---

## Staging Sweep Results

Plain HTTP sweep of all 12 active staging venues (2026-05-18):

| Venue | HTTP Signal | Mode |
|---|---|---|
| Larimer Lounge | 865KB, 103 dates, 424 event links | `http` |
| Red Rocks Amphitheatre | 738KB, 367 dates, 881 event links | `http` |
| Cervantes' Masterpiece Ballroom *(inactive)* | 851KB, 120 events confirmed | `http` |
| Bluebird Theater | Zero event signal | `browser` |
| Fiddler's Green | Navigation links only | `browser` |
| Gothic Theatre | Navigation links only | `browser` |
| Hi-Dive | Navigation links only | `browser` |
| Levitt Pavilion | Navigation links only | `browser` |
| Marquis Theater | Navigation links only | `browser` |
| Mission Ballroom | Zero event signal | `browser` |
| Ogden Theatre | Zero event signal | `browser` |
| Summit Music Hall | Navigation links only | `browser` |
| The Fillmore Auditorium | Navigation links only | `browser` |

---

## Design

### Crawl Mode Values

A new nullable `crawl_mode` column on the `venues` table:

| Value | Meaning |
|---|---|
| `null` | Auto-detect: try HTTP first, fall back to browser, store the result |
| `'http'` | Always use plain HTTP fetch — skip Playwright entirely |
| `'browser'` | Always use Playwright — skip HTTP attempt |

`null` is the default for all existing venues. The system self-heals: after the first successful crawl, the detected mode is stored and subsequent crawls go straight to the right method.

### Crawl Orchestration (Option A — orchestrate in `crawl.ts`)

Keep `fetcher.ts` focused on transport. Two clean functions:

- **`fetchPage()`** — existing Playwright browser fetch (unchanged)
- **`fetchPageHttp()`** — new plain `fetch()` with `ConcertCrawl/1.0` user agent, crawl delay, same `FetchResult` return shape, throws `CrawlFetchError` on 403/429

Orchestration logic in `crawl.ts`:

```
if crawlMode === 'browser':
  → fetchPage() directly

if crawlMode === 'http':
  → fetchPageHttp()
  → extract events
  → if zero events: record as failed crawl (do NOT escalate to browser)

if crawlMode === null (auto-detect):
  → fetchPageHttp()
  → extract events
  → if events found: save crawlMode = 'http', done
  → if zero events or fetch error: fetchPage() (browser)
  → extract events
  → save crawlMode = 'browser'
```

A forced `'http'` venue that returns zero events is recorded as a failed crawl — the admin set it explicitly and should know it isn't working, rather than silently escalating to browser.

### Data Layer

**Migration:** Add nullable column to `venues`:
```sql
ALTER TABLE venues ADD COLUMN crawl_mode varchar(10) CHECK (crawl_mode IN ('http', 'browser'));
```

**Drizzle schema** (`packages/db/src/schema/venues.ts`):
```ts
crawlMode: varchar('crawl_mode', { length: 10 })
  .$type<'http' | 'browser'>()
  .default(sql`NULL`)
```

**Seed / staging update:** Set `crawl_mode = 'http'` for Larimer Lounge, Red Rocks, and Cervantes (and re-activate Cervantes).

### API

Add to `updateVenueSchema` in `apps/api/src/routes/admin/venues.ts`:
```ts
crawlMode: z.enum(['http', 'browser']).nullable().optional()
```

Include `crawlMode` in venue SELECT queries so it is returned in all venue responses.

### Admin UI

Add a **"Fetch mode"** field to the Crawl Settings section of `VenueDetailsClient` (`apps/web/src/components/admin/VenueDetailsClient.tsx`), alongside the existing Wait strategy and Crawl delay fields.

- **Control:** Select with three options
  - `Auto-detect` → stored as `null`
  - `HTTP only` → stored as `'http'`
  - `Browser only` → stored as `'browser'`
- **Help text:** "Auto-detect tries HTTP first and remembers what works. Use HTTP only for fast server-rendered sites. Use Browser only for JS-heavy pages that require a real browser."
- Wired into existing dirty-tracking and `updateVenue()` save flow.

---

## Out of Scope

- A per-venue "Test HTTP" button in the Admin UI (value too low; one-time script suffices)
- Automatic re-detection after a stored mode starts failing (manual admin reset via Admin UI is sufficient)
- HTTP fetch for the price pipeline (separate system, separate decision)

---

## Rollout

1. Deploy migration (expand step — additive only, no breaking change)
2. Deploy updated crawler, API, and web
3. Set `crawl_mode = 'http'` for Larimer Lounge and Red Rocks via Admin UI
4. Re-activate Cervantes and set `crawl_mode = 'http'`
5. Monitor next daily crawl run for all three venues
