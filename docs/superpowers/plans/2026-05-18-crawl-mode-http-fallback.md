# Crawl Mode: HTTP-First with Browser Fallback — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add per-venue `crawl_mode` that defaults to auto-detecting HTTP-first crawling, falling back to Playwright only when needed, with admin override via the Admin UI.

**Architecture:** New nullable `crawl_mode` column on venues. Fetcher gains a `fetchPageHttp()` sibling to the existing `fetchPage()`. Orchestration in `crawl.ts` tries HTTP first when mode is `null` or `'http'`, falls back to browser on fetch error or zero events (auto-detect only), and stores the resolved mode after the first successful detection. Admin UI gains a "Fetch mode" select in the Crawl Settings section.

**Tech Stack:** Drizzle ORM migrations, Playwright, native `fetch()`, Hono/Zod API, Next.js server actions, React controlled state

**Working directory:** `/Users/huey/Projects/concert-crawl/.worktrees/feat/crawl-mode-http-fallback`

All commands must be run from the worktree root above. Run `pnpm` not `npm`.

---

## File Map

| File | Action |
|---|---|
| `packages/db/migrations/0022_venue_crawl_mode.sql` | Create — adds `crawl_mode` column |
| `packages/db/src/schema/venues.ts` | Modify — add `crawlMode` field, import `varchar` |
| `packages/crawler-core/src/lib/fetcher.ts` | Modify — add `fetchPageHttp()`, export `FetchResult` |
| `packages/crawler-core/src/lib/fetcher.test.ts` | Modify — add tests for `fetchPageHttp()` |
| `packages/crawler-core/src/crawl.ts` | Modify — import `fetchPageHttp`, add `runExtraction` helper, mode-aware fetch orchestration, save resolved mode |
| `packages/crawler-core/src/crawl.test.ts` | Modify — add tests for each `crawlMode` behavior |
| `apps/api/src/routes/admin/venues.ts` | Modify — add `crawlMode` to `updateVenueSchema` |
| `apps/web/src/lib/actions/venues.ts` | Modify — add `crawlMode` parsing and passthrough |
| `apps/web/src/components/admin/VenueDetailsClient.tsx` | Modify — add Fetch mode state, dirty check, formData, and Select |

---

## Task 1: DB Migration + Schema

**Files:**
- Create: `packages/db/migrations/0022_venue_crawl_mode.sql`
- Modify: `packages/db/src/schema/venues.ts`

- [ ] **Step 1: Write the migration file**

Create `packages/db/migrations/0022_venue_crawl_mode.sql`:

```sql
ALTER TABLE "venues" ADD COLUMN "crawl_mode" varchar(10) CHECK ("crawl_mode" IN ('http', 'browser'));
```

- [ ] **Step 2: Update the Drizzle schema**

In `packages/db/src/schema/venues.ts`, add `varchar` to the import and add the `crawlMode` field after `crawlWaitForSelector`:

```typescript
import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'
```

Add after `crawlWaitForSelector` (around line 48):

```typescript
  crawlMode: varchar('crawl_mode', { length: 10 }).$type<'http' | 'browser'>(),
```

- [ ] **Step 3: Run the migration against the local DB**

```bash
pnpm db:migrate
```

Expected: migration runs without error. Verify:

```bash
docker exec -it concert-crawl-db psql -U postgres -d concert_crawl_db -c "\d venues" | grep crawl_mode
```

Expected output contains: `crawl_mode | character varying(10) |`

- [ ] **Step 4: Verify TypeScript compiles**

```bash
pnpm --filter @concert-crawl/db typecheck
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add packages/db/migrations/0022_venue_crawl_mode.sql packages/db/src/schema/venues.ts
git commit -m "feat(db): add crawl_mode column to venues"
```

---

## Task 2: `fetchPageHttp()` + Tests

**Files:**
- Modify: `packages/crawler-core/src/lib/fetcher.ts`
- Modify: `packages/crawler-core/src/lib/fetcher.test.ts`

- [ ] **Step 1: Write failing tests for `fetchPageHttp`**

Add to the end of `packages/crawler-core/src/lib/fetcher.test.ts`:

```typescript
describe('fetchPageHttp', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('fetches the URL with the ConcertCrawl user agent', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValue({
      status: 200,
      url: 'https://example.com',
      text: vi.fn().mockResolvedValue('<html>events</html>'),
    } as unknown as Response)

    await fetchPageHttp('https://example.com', 0)

    expect(mockFetch).toHaveBeenCalledWith(
      'https://example.com',
      expect.objectContaining({
        headers: expect.objectContaining({
          'User-Agent': 'ConcertCrawl/1.0 (+https://concertcrawl.app/bot)',
        }),
      }),
    )
  })

  it('returns html, httpStatus, and finalUrl on success', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValue({
      status: 200,
      url: 'https://example.com/redirected',
      text: vi.fn().mockResolvedValue('<html>event content</html>'),
    } as unknown as Response)

    const result = await fetchPageHttp('https://example.com', 0)

    expect(result).toEqual({
      html: '<html>event content</html>',
      httpStatus: 200,
      finalUrl: 'https://example.com/redirected',
    })
  })

  it('throws CrawlFetchError on 403', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValue({
      status: 403,
      url: 'https://example.com',
      text: vi.fn().mockResolvedValue(''),
    } as unknown as Response)

    await expect(fetchPageHttp('https://example.com', 0)).rejects.toThrow(
      CrawlFetchError,
    )
  })

  it('throws CrawlFetchError on 429', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValue({
      status: 429,
      url: 'https://example.com',
      text: vi.fn().mockResolvedValue(''),
    } as unknown as Response)

    await expect(fetchPageHttp('https://example.com', 0)).rejects.toThrow(
      CrawlFetchError,
    )
  })

  it('throws a generic Error on other 4xx', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValue({
      status: 404,
      url: 'https://example.com',
      text: vi.fn().mockResolvedValue(''),
    } as unknown as Response)

    await expect(fetchPageHttp('https://example.com', 0)).rejects.toThrow(
      'HTTP 404',
    )
  })
})
```

Also add `fetchPageHttp` to the import at the top of `fetcher.test.ts`:

```typescript
import { fetchPage, fetchPageHttp, CrawlFetchError } from './fetcher.js'
```

- [ ] **Step 2: Run to verify tests fail**

```bash
pnpm --filter @concert-crawl/crawler-core test packages/crawler-core/src/lib/fetcher.test.ts
```

Expected: tests fail with "fetchPageHttp is not a function" or similar.

- [ ] **Step 3: Implement `fetchPageHttp` and export `FetchResult`**

Replace the contents of `packages/crawler-core/src/lib/fetcher.ts` with:

```typescript
import type { Browser } from 'playwright'

const HONEST_USER_AGENT = 'ConcertCrawl/1.0 (+https://concertcrawl.app/bot)'

export class CrawlFetchError extends Error {
  constructor(
    public readonly httpStatus: number,
    message: string,
  ) {
    super(message)
    this.name = 'CrawlFetchError'
  }
}

export interface FetchResult {
  html: string
  httpStatus: number
  finalUrl: string
}

function jitter(ms: number): number {
  return ms + Math.floor(Math.random() * 1000) - 500
}

export async function fetchPage(
  url: string,
  browser: Browser,
  crawlDelayMs = 3000,
  waitUntil: 'networkidle' | 'load' | 'domcontentloaded' = 'networkidle',
  waitForSelector?: string,
): Promise<FetchResult> {
  const delay = Math.max(0, jitter(crawlDelayMs))
  if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay))

  const context = await browser.newContext({
    userAgent: HONEST_USER_AGENT,
  })
  try {
    const page = await context.newPage()

    console.log(JSON.stringify({ event: 'fetch.start', url }))

    let httpStatus = 200
    page.on('response', (response) => {
      if (
        response.url() === page.url() ||
        response.request().isNavigationRequest()
      ) {
        httpStatus = response.status()
      }
    })

    // When a CSS selector is provided, use domcontentloaded for navigation
    // (fast connection) then let waitForSelector handle SPA render timing —
    // avoids networkidle/load timeouts on pages with persistent third-party requests.
    const response = await page.goto(url, {
      waitUntil: waitForSelector ? 'domcontentloaded' : waitUntil,
      timeout: 60_000,
    })

    const finalStatus = response?.status() ?? httpStatus

    if (finalStatus === 403 || finalStatus === 429) {
      console.log(
        JSON.stringify({ event: 'fetch.blocked', url, status: finalStatus }),
      )
      throw new CrawlFetchError(
        finalStatus,
        `HTTP ${finalStatus} — venue may have blocked crawler`,
      )
    }

    if (finalStatus >= 400) {
      console.log(
        JSON.stringify({ event: 'fetch.error', url, status: finalStatus }),
      )
      throw new Error(`HTTP ${finalStatus}`)
    }

    if (waitForSelector) {
      await page.waitForSelector(waitForSelector, { timeout: 30_000 })
    }

    const html = await page.content()
    const finalUrl = page.url()

    console.log(
      JSON.stringify({
        event: 'fetch.success',
        url,
        finalUrl,
        status: finalStatus,
      }),
    )
    return { html, httpStatus: finalStatus, finalUrl }
  } finally {
    await context.close()
  }
}

export async function fetchPageHttp(
  url: string,
  crawlDelayMs = 3000,
): Promise<FetchResult> {
  const delay = Math.max(0, jitter(crawlDelayMs))
  if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay))

  console.log(JSON.stringify({ event: 'fetch.start', url, mode: 'http' }))

  const response = await fetch(url, {
    headers: {
      'User-Agent': HONEST_USER_AGENT,
      Accept: 'text/html,application/xhtml+xml',
    },
    redirect: 'follow',
  })

  if (response.status === 403 || response.status === 429) {
    console.log(
      JSON.stringify({ event: 'fetch.blocked', url, status: response.status }),
    )
    throw new CrawlFetchError(
      response.status,
      `HTTP ${response.status} — venue may have blocked crawler`,
    )
  }

  if (response.status >= 400) {
    console.log(
      JSON.stringify({ event: 'fetch.error', url, status: response.status }),
    )
    throw new Error(`HTTP ${response.status}`)
  }

  const html = await response.text()
  const finalUrl = response.url

  console.log(
    JSON.stringify({
      event: 'fetch.success',
      url,
      finalUrl,
      status: response.status,
      mode: 'http',
    }),
  )
  return { html, httpStatus: response.status, finalUrl }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm --filter @concert-crawl/crawler-core test packages/crawler-core/src/lib/fetcher.test.ts
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/crawler-core/src/lib/fetcher.ts packages/crawler-core/src/lib/fetcher.test.ts
git commit -m "feat(crawler-core): add fetchPageHttp for plain HTTP crawling"
```

---

## Task 3: Crawl Orchestration + Tests

**Files:**
- Modify: `packages/crawler-core/src/crawl.ts`
- Modify: `packages/crawler-core/src/crawl.test.ts`

- [ ] **Step 1: Write failing tests**

Add to `packages/crawler-core/src/crawl.test.ts`. First, update the mock at the top to include `fetchPageHttp`:

```typescript
vi.mock('./lib/fetcher.js', () => ({
  fetchPage: vi.fn(),
  fetchPageHttp: vi.fn(),
  CrawlFetchError: class CrawlFetchError extends Error {
    constructor(
      public httpStatus: number,
      message: string,
    ) {
      super(message)
    }
  },
}))
```

Add after the existing imports of mocked modules:

```typescript
import { fetchPage, fetchPageHttp } from './lib/fetcher.js'
const mockFetchPage = vi.mocked(fetchPage)
const mockFetchPageHttp = vi.mocked(fetchPageHttp)
```

Remove the old `const mockFetchPage = vi.mocked(fetchPage)` line if present, replace with both lines above.

Add `mockFetchPageHttp.mockClear()` inside `beforeEach`.

Also update `seedVenue` to default `crawlMode` to `'browser'` so existing tests that expect `fetchPage` to be called are not broken by the new HTTP-first logic:

```typescript
function seedVenue(overrides: Record<string, unknown> = {}) {
  const venue = {
    id: crypto.randomUUID(),
    name: 'Test Venue',
    slug: `test-venue-${crypto.randomUUID()}`,
    websiteUrl: 'https://test-venue.example.com',
    city: 'Denver',
    active: true,
    verified: true,
    consecutiveFailures: 0,
    crawlDelayMs: 3000,
    crawlWaitUntil: 'networkidle' as const,
    crawlWaitForSelector: null,
    crawlMode: 'browser' as const,   // default: existing tests use browser path
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
  stores.venues.push(venue)
  return venue
}
```

New tests in the orchestration describe block override `crawlMode` explicitly via `seedVenue({ crawlMode: 'http' })` etc.

Then add a new describe block at the end of the test file:

```typescript
describe('crawlVenue — crawlMode orchestration', () => {
  const FETCH_RESULT = {
    html: HTML_V1,
    httpStatus: 200,
    finalUrl: 'https://test-venue.example.com',
  }

  beforeEach(() => {
    mockExtractWithLlm.mockResolvedValue({
      events: [METALLICA_EVENT],
      usage: { inputTokens: 100, outputTokens: 50 },
    })
  })

  it('uses fetchPageHttp when crawlMode is http', async () => {
    const venue = seedVenue({ crawlMode: 'http' })
    mockFetchPageHttp.mockResolvedValue(FETCH_RESULT)

    await crawlVenue(venue.id, mockBrowser)

    expect(mockFetchPageHttp).toHaveBeenCalledWith(
      venue.websiteUrl,
      venue.crawlDelayMs,
    )
    expect(mockFetchPage).not.toHaveBeenCalled()
  })

  it('uses fetchPage when crawlMode is browser', async () => {
    const venue = seedVenue({ crawlMode: 'browser' })
    mockFetchPage.mockResolvedValue(FETCH_RESULT)

    await crawlVenue(venue.id, mockBrowser)

    expect(mockFetchPage).toHaveBeenCalledWith(
      venue.websiteUrl,
      mockBrowser,
      venue.crawlDelayMs,
      venue.crawlWaitUntil,
      undefined,
    )
    expect(mockFetchPageHttp).not.toHaveBeenCalled()
  })

  it('auto-detect: saves crawlMode=http when HTTP fetch returns events', async () => {
    const venue = seedVenue({ crawlMode: null })
    mockFetchPageHttp.mockResolvedValue(FETCH_RESULT)

    await crawlVenue(venue.id, mockBrowser)

    expect(mockFetchPageHttp).toHaveBeenCalled()
    expect(mockFetchPage).not.toHaveBeenCalled()

    const savedVenue = stores.venues.find((vv) => vv.id === venue.id)
    expect(savedVenue?.crawlMode).toBe('http')
  })

  it('auto-detect: falls back to browser and saves crawlMode=browser when HTTP returns no events', async () => {
    const venue = seedVenue({ crawlMode: null })
    const emptyHtml = '<html><body>No events here</body></html>'
    mockFetchPageHttp.mockResolvedValue({
      html: emptyHtml,
      httpStatus: 200,
      finalUrl: venue.websiteUrl,
    })
    mockFetchPage.mockResolvedValue(FETCH_RESULT)
    // First LLM call (for HTTP html) returns no events
    // Second LLM call (for browser html) returns events
    mockExtractWithLlm
      .mockResolvedValueOnce({ events: [], usage: { inputTokens: 50, outputTokens: 10 } })
      .mockResolvedValueOnce({ events: [METALLICA_EVENT], usage: { inputTokens: 100, outputTokens: 50 } })

    await crawlVenue(venue.id, mockBrowser)

    expect(mockFetchPageHttp).toHaveBeenCalled()
    expect(mockFetchPage).toHaveBeenCalled()

    const savedVenue = stores.venues.find((vv) => vv.id === venue.id)
    expect(savedVenue?.crawlMode).toBe('browser')
  })

  it('auto-detect: falls back to browser and saves crawlMode=browser when HTTP fetch throws', async () => {
    const venue = seedVenue({ crawlMode: null })
    mockFetchPageHttp.mockRejectedValue(new Error('network error'))
    mockFetchPage.mockResolvedValue(FETCH_RESULT)

    await crawlVenue(venue.id, mockBrowser)

    expect(mockFetchPage).toHaveBeenCalled()

    const savedVenue = stores.venues.find((vv) => vv.id === venue.id)
    expect(savedVenue?.crawlMode).toBe('browser')
  })

  it('forced http: does not fall back to browser when HTTP returns no events', async () => {
    const venue = seedVenue({ crawlMode: 'http' })
    const emptyHtml = '<html><body>No events</body></html>'
    mockFetchPageHttp.mockResolvedValue({
      html: emptyHtml,
      httpStatus: 200,
      finalUrl: venue.websiteUrl,
    })
    mockExtractWithLlm.mockResolvedValue({ events: [], usage: { inputTokens: 50, outputTokens: 10 } })

    await crawlVenue(venue.id, mockBrowser)

    expect(mockFetchPage).not.toHaveBeenCalled()
  })

  it('forced http: propagates fetch errors without falling back', async () => {
    const venue = seedVenue({ crawlMode: 'http' })
    mockFetchPageHttp.mockRejectedValue(new Error('timeout'))

    const result = await crawlVenue(venue.id, mockBrowser)

    expect(result.status).toBe('failed')
    expect(mockFetchPage).not.toHaveBeenCalled()
  })

  it('does not overwrite a stored crawlMode on subsequent crawls', async () => {
    const venue = seedVenue({ crawlMode: 'http' })
    mockFetchPageHttp.mockResolvedValue(FETCH_RESULT)

    await crawlVenue(venue.id, mockBrowser)

    // crawlMode should still be 'http', not re-saved
    const savedVenue = stores.venues.find((vv) => vv.id === venue.id)
    expect(savedVenue?.crawlMode).toBe('http')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm --filter @concert-crawl/crawler-core test packages/crawler-core/src/crawl.test.ts 2>&1 | tail -20
```

Expected: multiple failures related to `fetchPageHttp` not being used / crawlMode not being saved.

- [ ] **Step 3: Update `crawl.ts` imports and add `runExtraction` helper**

At the top of `packages/crawler-core/src/crawl.ts`, update the fetcher import:

```typescript
import { fetchPage, fetchPageHttp, CrawlFetchError, type FetchResult } from './lib/fetcher.js'
```

Add a private helper function just before `crawlVenue` (after all imports):

```typescript
async function runExtraction(html: string, finalUrl: string): Promise<{
  normalizedEvents: NormalizedEvent[]
  strategy: 'structured_data' | 'llm'
  tokenUsage: TokenUsage | undefined
}> {
  let normalizedEvents: NormalizedEvent[] = extractJsonLd(html, finalUrl)
  let strategy: 'structured_data' | 'llm' = 'structured_data'
  let tokenUsage: TokenUsage | undefined
  if (normalizedEvents.length === 0) {
    strategy = 'llm'
    const llmResult = await extractWithLlm(html, finalUrl)
    normalizedEvents = llmResult.events
    tokenUsage = llmResult.usage
  }
  return { normalizedEvents, strategy, tokenUsage }
}
```

- [ ] **Step 4: Replace the fetch block and extraction block in `crawl.ts`**

Find and replace the existing fetch call (lines 77-83, the `const { html, httpStatus, finalUrl } = await fetchPage(...)` block) and the extraction block (lines 135-144) with the new mode-aware orchestration.

Replace lines 77-83 (the old single `fetchPage` call) with:

```typescript
    // Determine fetch strategy and execute
    let fetchResult: FetchResult
    let resolvedMode: 'http' | 'browser'

    if (venue.crawlMode === 'browser') {
      fetchResult = await fetchPage(
        venue.websiteUrl,
        browser,
        venue.crawlDelayMs,
        venue.crawlWaitUntil,
        venue.crawlWaitForSelector ?? undefined,
      )
      resolvedMode = 'browser'
    } else {
      // crawlMode is 'http' or null (auto-detect: HTTP first)
      let httpResult: FetchResult | null = null
      try {
        httpResult = await fetchPageHttp(venue.websiteUrl, venue.crawlDelayMs)
      } catch (httpErr) {
        if (venue.crawlMode === 'http') {
          throw httpErr // forced HTTP — no browser fallback
        }
        // auto-detect: HTTP failed, will fall through to browser below
      }

      if (httpResult !== null) {
        fetchResult = httpResult
        resolvedMode = 'http'
      } else {
        // auto-detect: HTTP threw — fall back to browser
        fetchResult = await fetchPage(
          venue.websiteUrl,
          browser,
          venue.crawlDelayMs,
          venue.crawlWaitUntil,
          venue.crawlWaitForSelector ?? undefined,
        )
        resolvedMode = 'browser'
      }
    }

    const { html, httpStatus, finalUrl } = fetchResult
```

Now find the `pageHash` early-return block (lines 96-132, the "crawl.skipped" block). Inside the DB update for skipped crawls, add `crawlMode` persistence for auto-detect:

```typescript
      await db
        .update(venues)
        .set({
          lastCrawledAt: new Date(),
          consecutiveFailures: 0,
          ...(venue.crawlMode === null ? { crawlMode: resolvedMode } : {}),
          updatedAt: new Date(),
        })
        .where(eq(venues.id, venueId))
```

Replace the old extraction block (lines 135-144):

```typescript
    // Structured data first — LLM fallback only when needed
    let normalizedEvents: NormalizedEvent[] = extractJsonLd(html, finalUrl)
    let strategy: 'structured_data' | 'llm' = 'structured_data'
    let tokenUsage: TokenUsage | undefined

    if (normalizedEvents.length === 0) {
      strategy = 'llm'
      const llmResult = await extractWithLlm(html, finalUrl)
      normalizedEvents = llmResult.events
      tokenUsage = llmResult.usage
    }
```

Replace with:

```typescript
    // Extract events from HTTP result; if auto-detect and no events, fall back to browser
    let extraction = await runExtraction(html, finalUrl)

    if (venue.crawlMode === null && resolvedMode === 'http' && extraction.normalizedEvents.length === 0) {
      // HTTP returned content but no events — fall back to browser for auto-detect
      const browserResult = await fetchPage(
        venue.websiteUrl,
        browser,
        venue.crawlDelayMs,
        venue.crawlWaitUntil,
        venue.crawlWaitForSelector ?? undefined,
      )
      extraction = await runExtraction(browserResult.html, browserResult.finalUrl)
      resolvedMode = 'browser'
    }

    let { normalizedEvents, strategy, tokenUsage } = extraction
```

Finally, find the successful crawl `db.update(venues).set(...)` block (around line 320-328) and add `crawlMode` persistence:

```typescript
    await db
      .update(venues)
      .set({
        lastCrawledAt: new Date(),
        consecutiveFailures: 0,
        blockedAt: null,
        ...(venue.crawlMode === null ? { crawlMode: resolvedMode } : {}),
        updatedAt: new Date(),
      })
      .where(eq(venues.id, venueId))
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
pnpm --filter @concert-crawl/crawler-core test packages/crawler-core/src/crawl.test.ts
```

Expected: all tests pass including the new `crawlMode orchestration` describe block.

- [ ] **Step 6: Run full crawler-core test suite**

```bash
pnpm --filter @concert-crawl/crawler-core test
```

Expected: all tests pass.

- [ ] **Step 7: Typecheck**

```bash
pnpm --filter @concert-crawl/crawler-core typecheck
```

Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add packages/crawler-core/src/crawl.ts packages/crawler-core/src/crawl.test.ts
git commit -m "feat(crawler-core): HTTP-first crawl mode with auto-detect and browser fallback"
```

---

## Task 4: API — Add `crawlMode` to venue update schema

**Files:**
- Modify: `apps/api/src/routes/admin/venues.ts`

- [ ] **Step 1: Add `crawlMode` to `updateVenueSchema`**

In `apps/api/src/routes/admin/venues.ts`, `updateVenueSchema` is defined at line 48. The PATCH handler uses `{ ...body, ...verificationFields, updatedAt: new Date() }` spread, so adding to the schema is all that's needed.

Change `updateVenueSchema` from:

```typescript
const updateVenueSchema = createVenueSchema.partial().extend({
  active: z.boolean().optional(),
  verified: z.boolean().optional(),
  verifiedBy: z.string().max(200).nullable().optional(),
})
```

To:

```typescript
const updateVenueSchema = createVenueSchema.partial().extend({
  active: z.boolean().optional(),
  verified: z.boolean().optional(),
  verifiedBy: z.string().max(200).nullable().optional(),
  crawlMode: z.enum(['http', 'browser']).nullable().optional(),
})
```

- [ ] **Step 2: Typecheck the API**

```bash
pnpm --filter @concert-crawl/api typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/routes/admin/venues.ts
git commit -m "feat(api): add crawlMode to venue update schema"
```

---

## Task 5: Server Action — Parse and forward `crawlMode`

**Files:**
- Modify: `apps/web/src/lib/actions/venues.ts`

- [ ] **Step 1: Add `crawlMode` parsing to `updateVenue`**

In `apps/web/src/lib/actions/venues.ts`, the `updateVenue` function is at line 71. Inside the try block, after the `ticketVendor` parsing block (around line 112), add:

```typescript
    const crawlModeRaw = formData.get('crawlMode')
    const crawlMode =
      crawlModeRaw === 'http' || crawlModeRaw === 'browser'
        ? (crawlModeRaw as 'http' | 'browser')
        : crawlModeRaw === ''
          ? null
          : undefined
```

Then add `crawlMode` to the `apiClient.patch` call body (around line 114):

```typescript
    await apiClient.patch<Venue>(`/v1/admin/venues/${id}`, token, {
      name: formData.get('name'),
      slug: formData.get('slug'),
      websiteUrl: formData.get('websiteUrl'),
      city: formData.get('city') || 'Denver',
      active: formData.get('active') === 'true',
      crawlWaitUntil,
      crawlDelayMs,
      crawlWaitForSelector,
      ticketVendor,
      crawlMode,
    })
```

- [ ] **Step 2: Typecheck**

```bash
pnpm --filter @concert-crawl/web typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/lib/actions/venues.ts
git commit -m "feat(web): pass crawlMode through venue update server action"
```

---

## Task 6: Admin UI — Fetch mode selector

**Files:**
- Modify: `apps/web/src/components/admin/VenueDetailsClient.tsx`

The venue prop type is inferred from the API response. The `crawlMode` field will now be present as `string | null` — no explicit type change is needed since the Venue type flows from the DB schema through the API.

- [ ] **Step 1: Add `crawlModeVal` state**

After the existing `ticketVendorVal` state line (around line 431), add:

```typescript
  const [crawlModeVal, setCrawlModeVal] = useState<'http' | 'browser' | null>(
    (venue.crawlMode as 'http' | 'browser' | null) ?? null,
  )
```

- [ ] **Step 2: Add to `isDirty`**

Update the `isDirty` expression (around line 437) to include crawlMode:

```typescript
  const isDirty =
    nameVal !== venue.name ||
    slugVal !== venue.slug ||
    urlVal !== venue.websiteUrl ||
    cityVal !== venue.city ||
    waitUntilVal !== venue.crawlWaitUntil ||
    crawlDelayVal !== venue.crawlDelayMs ||
    (waitForSelectorVal || null) !== venue.crawlWaitForSelector ||
    ticketVendorVal !== (venue.ticketVendor ?? null) ||
    crawlModeVal !== ((venue.crawlMode as 'http' | 'browser' | null) ?? null)
```

- [ ] **Step 3: Add to `handleDiscard`**

Inside `handleDiscard` (around line 466), add after the `setTicketVendorVal` line:

```typescript
    setCrawlModeVal((venue.crawlMode as 'http' | 'browser' | null) ?? null)
```

- [ ] **Step 4: Add to `handleSave` FormData**

Inside `handleSave` (around line 492), after the `ticketVendor` conditional block, add:

```typescript
    formData.set('crawlMode', crawlModeVal ?? '')
```

- [ ] **Step 5: Add the Fetch mode select to the Crawl Settings section**

After the closing `</Field>` of the Wait strategy field (around line 1016) and before the `{/* Crawl delay */}` comment, insert:

```tsx
            {/* Fetch mode */}
            <Field
              label="Fetch mode"
              htmlFor="edit-venue-crawl-mode"
              hint={
                <div
                  style={{
                    fontSize: 11,
                    color: 'var(--fg-muted)',
                    lineHeight: 1.5,
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  {crawlModeVal === null && (
                    <>
                      <strong style={{ color: 'var(--fg)' }}>Auto-detect</strong>{' '}
                      — tries plain HTTP first. If events are found, saves{' '}
                      <strong style={{ color: 'var(--fg)' }}>HTTP only</strong> for
                      future crawls. Falls back to browser if HTTP returns no events.
                    </>
                  )}
                  {crawlModeVal === 'http' && (
                    <>
                      <strong style={{ color: 'var(--fg)' }}>HTTP only</strong>{' '}
                      — fetches the page with a plain HTTP request. Fast and
                      lightweight. Only works for server-rendered sites where event
                      data is present in the raw HTML. A crawl returning zero events
                      is recorded as a failure — it will not escalate to browser.
                    </>
                  )}
                  {crawlModeVal === 'browser' && (
                    <>
                      <strong style={{ color: 'var(--fg)' }}>Browser only</strong>{' '}
                      — always uses Playwright (headless Chromium). Required for
                      JavaScript-rendered pages and SPAs. Set this if auto-detect
                      incorrectly detected HTTP mode for a venue.
                    </>
                  )}
                </div>
              }
            >
              <StyledSelect
                id="edit-venue-crawl-mode"
                value={crawlModeVal ?? ''}
                disabled={isDisabled}
                onChange={(evt) => {
                  const val = evt.target.value
                  setCrawlModeVal(
                    val === 'http' || val === 'browser' ? val : null,
                  )
                }}
              >
                <option value="">auto-detect — HTTP first, browser fallback</option>
                <option value="http">HTTP only — server-rendered pages</option>
                <option value="browser">Browser only — JS-rendered pages</option>
              </StyledSelect>
            </Field>
```

- [ ] **Step 6: Typecheck the web app**

```bash
pnpm --filter @concert-crawl/web typecheck
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/components/admin/VenueDetailsClient.tsx
git commit -m "feat(web): add Fetch mode selector to Admin venue Crawl Settings"
```

---

## Task 7: Pre-push checks, progress doc, and PR

**Files:**
- Modify: `docs/superpowers/progress.md`

- [ ] **Step 1: Run full typecheck + lint + test suite**

```bash
pnpm typecheck && pnpm lint && pnpm test
```

Expected: all pass with no errors.

- [ ] **Step 2: Update progress.md**

In `docs/superpowers/progress.md`, add a row for this PR in the in-progress section:

```markdown
| 🔄 | feat/crawl-mode-http-fallback | HTTP-first crawl mode with auto-detect, admin UI, staging sweep (Red Rocks, Larimer Lounge, Cervantes) |
```

- [ ] **Step 3: Commit progress doc**

```bash
git add docs/superpowers/progress.md
git commit -m "chore: update progress for crawl-mode PR"
```

- [ ] **Step 4: Rebase on main before pushing**

```bash
git fetch origin && git rebase origin/main
```

Expected: clean rebase, no conflicts.

- [ ] **Step 5: Push and open PR**

```bash
git push -u origin feat/crawl-mode-http-fallback
```

Open the PR using the template:

```bash
gh pr create \
  --title "feat(crawler): HTTP-first crawl mode with auto-detect and admin override" \
  --body "$(cat <<'EOF'
## Summary

- Adds `crawl_mode` column to venues (`null` = auto-detect, `http` = HTTP only, `browser` = browser only)
- Crawler now tries plain HTTP fetch first; falls back to Playwright only when HTTP returns no events or throws
- Detected mode is stored on the venue after first successful crawl — no re-detection on subsequent runs
- Forced `http` venues that return zero events record a failed crawl (no silent browser escalation)
- Admin UI gains a **Fetch mode** selector in Crawl Settings with contextual help text

## Staging impact

Sweep of all 12 active venues confirmed 3 can use HTTP mode:
- **Red Rocks Amphitheatre** — 738KB, 367 dates, 881 event links
- **Larimer Lounge** — 865KB, 103 dates, 424 event links  
- **Cervantes' Masterpiece Ballroom** — 851KB, 120 events (currently inactive, Sentry CONCERT-CRAWL-CRAWLER-2)

After merge: set these three venues to `http` via Admin UI and re-activate Cervantes.

## New env vars

None.

## Migration

`0022_venue_crawl_mode.sql` — additive only, no data loss. Run `pnpm db:migrate` on staging after deploy.

## Test plan

- [ ] All existing crawler-core tests pass
- [ ] New crawlMode orchestration tests cover all 7 mode behaviors
- [ ] fetchPageHttp tests cover success, 403, 429, other 4xx
- [ ] Admin UI: Fetch mode select appears in Crawl Settings, dirty-tracks, saves correctly
- [ ] Set Larimer Lounge to `http` in staging Admin UI, trigger a crawl, confirm events found
- [ ] Set a browser-only venue's mode to `null`, confirm auto-detect runs and saves `browser`

Closes #416
EOF
)"
```

- [ ] **Step 6: Verify PR was created and note the URL**

```bash
gh pr view --json number,url --jq '"PR #\(.number): \(.url)"'
```
