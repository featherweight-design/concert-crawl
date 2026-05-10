# Shared Playwright Browser Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Share a single Chromium browser instance across all venue crawls in both the daily and triggered runners, eliminating the OOM crash caused by spawning one browser process per concurrent venue.

**Architecture:** `fetchPage` stops launching its own browser and instead accepts a `Browser` instance as a parameter. `crawlVenue` forwards that instance from its own parameter. Both `runDailyCrawl` and `runTriggeredCrawls` launch one browser before their respective loops and close it in a `finally` block. Each crawl still creates its own browser context, preserving session isolation.

**Tech Stack:** Playwright (`chromium`, `Browser`, `BrowserContext`), Vitest, TypeScript strict mode, pnpm monorepo (Turborepo)

**GitHub Issue:** #133

---

## File Map

| Action | File                                       | Change                                                                             |
| ------ | ------------------------------------------ | ---------------------------------------------------------------------------------- |
| Modify | `packages/crawler-core/src/lib/fetcher.ts` | Accept `Browser` param; manage context lifecycle instead of browser lifecycle      |
| Modify | `packages/crawler-core/src/crawl.ts`       | Accept `Browser` param; forward to `fetchPage`                                     |
| Modify | `apps/crawler/src/run.ts`                  | Launch one browser per runner function; pass to `crawlVenue`; close in `finally`   |
| Modify | `packages/crawler-core/src/crawl.test.ts`  | Pass mock browser to `crawlVenue` calls                                            |
| Modify | `apps/crawler/src/run.test.ts`             | Mock `chromium.launch`; update `crawlVenue` call assertions to include browser arg |

---

## Task 1: Refactor `fetchPage` to accept a `Browser` param

**Files:**

- Modify: `packages/crawler-core/src/lib/fetcher.ts`

The current function calls `chromium.launch()` internally. After this change it will receive a `Browser` from its caller and manage only the `BrowserContext` lifecycle.

- [ ] **Step 1: Update `fetcher.ts`**

Replace the entire file content:

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

    const response = await page.goto(url, {
      waitUntil: 'networkidle',
      timeout: 30_000,
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
```

- [ ] **Step 2: Verify TypeScript compiles in the package**

Run from the repo root:

```bash
pnpm --filter @concert-crawl/crawler-core tsc --noEmit
```

Expected: no errors. (The call sites in `crawl.ts` will now error — that's fine, they're fixed in Task 2.)

---

## Task 2: Refactor `crawlVenue` to accept and forward `Browser`

**Files:**

- Modify: `packages/crawler-core/src/crawl.ts`

- [ ] **Step 1: Update the `crawlVenue` signature and `fetchPage` call**

Change the function signature from:

```typescript
export async function crawlVenue(
  venueId: string,
  crawlRunId?: string,
): Promise<CrawlRun>
```

To:

```typescript
import type { Browser } from 'playwright'

export async function crawlVenue(
  venueId: string,
  browser: Browser,
  crawlRunId?: string,
): Promise<CrawlRun>
```

Then update the `fetchPage` call at line ~75 (inside the `try` block) from:

```typescript
const { html, httpStatus, finalUrl } = await fetchPage(
  venue.websiteUrl,
  venue.crawlDelayMs,
)
```

To:

```typescript
const { html, httpStatus, finalUrl } = await fetchPage(
  venue.websiteUrl,
  venue.crawlDelayMs,
  browser,
)
```

Add the import at the top of the file alongside the existing imports:

```typescript
import type { Browser } from 'playwright'
```

- [ ] **Step 2: Verify TypeScript compiles in crawler-core**

```bash
pnpm --filter @concert-crawl/crawler-core tsc --noEmit
```

Expected: no errors.

---

## Task 3: Update `crawl.test.ts` for the new `crawlVenue` signature

**Files:**

- Modify: `packages/crawler-core/src/crawl.test.ts`

`fetchPage` is fully mocked in this file, so no real browser is needed. A plain empty object cast to `Browser` is sufficient.

- [ ] **Step 1: Add mock browser constant and update all `crawlVenue` calls**

Add this constant near the top of the file, after the existing imports:

```typescript
import type { Browser } from 'playwright'
const mockBrowser = {} as Browser
```

Then update every `crawlVenue(venue.id)` call to `crawlVenue(venue.id, mockBrowser)`.

There are 8 call sites — search for `crawlVenue(venue.id)` and replace all:

| Before                       | After                                     |
| ---------------------------- | ----------------------------------------- |
| `await crawlVenue(venue.id)` | `await crawlVenue(venue.id, mockBrowser)` |

- [ ] **Step 2: Run the crawl.test.ts suite**

```bash
pnpm --filter @concert-crawl/crawler-core vitest run src/crawl.test.ts
```

Expected: all tests pass (same count as before — 5 tests across 2 describe blocks).

- [ ] **Step 3: Commit Tasks 1–3**

```bash
cd <worktree-root>
git add packages/crawler-core/src/lib/fetcher.ts packages/crawler-core/src/crawl.ts packages/crawler-core/src/crawl.test.ts
git commit -m "refactor(crawler-core): accept Browser param in fetchPage and crawlVenue"
```

---

## Task 4: Update `run.ts` to manage a shared browser lifecycle

**Files:**

- Modify: `apps/crawler/src/run.ts`

Both `runDailyCrawl` and `runTriggeredCrawls` need to launch one browser, pass it to every `crawlVenue` call, and close it in a `finally` block.

- [ ] **Step 1: Rewrite `run.ts`**

Replace the entire file:

```typescript
import { chromium } from 'playwright'
import { createLogger } from '@concert-crawl/logger'
import { db, venues, crawlTriggers } from '@concert-crawl/db'
import { eq, and } from 'drizzle-orm'
import { crawlVenue, tagEventsWithGenres } from '@concert-crawl/crawler-core'

const logger = createLogger('crawler')
const MAX_CONCURRENT = 3

export async function runTriggeredCrawls(): Promise<{ processed: number }> {
  const claimed = await db
    .update(crawlTriggers)
    .set({ status: 'processing', updatedAt: new Date() })
    .where(eq(crawlTriggers.status, 'pending'))
    .returning({ id: crawlTriggers.id, venueId: crawlTriggers.venueId })

  if (claimed.length === 0) {
    logger.info('No pending crawl triggers')
    return { processed: 0 }
  }

  logger.info({ count: claimed.length }, 'Processing pending crawl triggers')

  const browser = await chromium.launch({ headless: true })
  try {
    for (const trigger of claimed) {
      try {
        const crawlRun = await crawlVenue(trigger.venueId, browser)
        await tagEventsWithGenres(trigger.venueId, crawlRun.id)
        const triggerStatus = crawlRun.status === 'failed' ? 'failed' : 'done'
        await db
          .update(crawlTriggers)
          .set({
            status: triggerStatus,
            crawlRunId: crawlRun.id,
            updatedAt: new Date(),
          })
          .where(eq(crawlTriggers.id, trigger.id))
      } catch (err) {
        logger.error(
          { err, triggerId: trigger.id, venueId: trigger.venueId },
          'Triggered crawl threw unexpectedly',
        )
        await db
          .update(crawlTriggers)
          .set({ status: 'failed', updatedAt: new Date() })
          .where(eq(crawlTriggers.id, trigger.id))
      }
    }
  } finally {
    await browser.close()
  }

  return { processed: claimed.length }
}

export async function runDailyCrawl(): Promise<{
  succeeded: number
  failed: number
  total: number
}> {
  logger.info('Starting daily crawl')

  const activeVenues = await db
    .select({ id: venues.id, name: venues.name })
    .from(venues)
    .where(and(eq(venues.active, true), eq(venues.verified, true)))

  logger.info({ venueCount: activeVenues.length }, 'Fetched active venues')

  let succeeded = 0
  let failed = 0

  const browser = await chromium.launch({ headless: true })
  try {
    for (
      let batchStart = 0;
      batchStart < activeVenues.length;
      batchStart += MAX_CONCURRENT
    ) {
      const batch = activeVenues.slice(batchStart, batchStart + MAX_CONCURRENT)
      const results = await Promise.allSettled(
        batch.map((venue) => crawlVenue(venue.id, browser)),
      )

      for (const [idx, result] of results.entries()) {
        if (result.status === 'fulfilled') {
          succeeded++
          if (batch[idx]?.id) {
            await tagEventsWithGenres(batch[idx].id, result.value.id)
          }
          logger.info(
            { venueId: batch[idx]?.id, name: batch[idx]?.name },
            'Crawl succeeded',
          )
        } else {
          failed++
          logger.error(
            {
              venueId: batch[idx]?.id,
              name: batch[idx]?.name,
              err: result.reason,
            },
            'Crawl failed',
          )
        }
      }
    }
  } finally {
    await browser.close()
  }

  logger.info(
    { succeeded, failed, total: activeVenues.length },
    'Daily crawl complete',
  )
  return { succeeded, failed, total: activeVenues.length }
}
```

- [ ] **Step 2: Verify TypeScript compiles in the crawler app**

```bash
pnpm --filter @concert-crawl/crawler tsc --noEmit
```

Expected: no errors.

---

## Task 5: Update `run.test.ts` for the new `crawlVenue` signature

**Files:**

- Modify: `apps/crawler/src/run.test.ts`

`crawlVenue` is fully mocked, but the tests currently assert it was called with just `'venue-N'`. After our change it receives `(venueId, browser)`. We need to mock `chromium.launch` and update the call assertions.

- [ ] **Step 1: Add playwright mock and update `crawlVenue` call assertions**

Replace the entire `run.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock DB
const mockVenues = [
  { id: 'venue-1', name: 'Ogden Theatre' },
  { id: 'venue-2', name: 'Bluebird Theater' },
  { id: 'venue-3', name: 'Red Rocks' },
  { id: 'venue-4', name: 'Mission Ballroom' },
]

const mockDbChain = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockResolvedValue(mockVenues),
}
vi.mock('@concert-crawl/db', () => ({
  db: mockDbChain,
  venues: { id: 'id', name: 'name', active: 'active', verified: 'verified' },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  and: vi.fn(),
}))

// Mock Playwright — return a minimal browser-shaped object
const mockBrowser = { close: vi.fn().mockResolvedValue(undefined) }
vi.mock('playwright', () => ({
  chromium: {
    launch: vi.fn().mockResolvedValue(mockBrowser),
  },
}))

// Mock crawlVenue and tagEventsWithGenres
const mockCrawlVenue = vi
  .fn()
  .mockResolvedValue({ id: 'run-uuid-1', status: 'success' })
const mockTagEventsWithGenres = vi.fn().mockResolvedValue(undefined)
vi.mock('@concert-crawl/crawler-core', () => ({
  crawlVenue: mockCrawlVenue,
  tagEventsWithGenres: mockTagEventsWithGenres,
}))

// Mock logger
vi.mock('@concert-crawl/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  }),
}))

describe('runDailyCrawl', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    mockDbChain.select.mockReturnThis()
    mockDbChain.from.mockReturnThis()
    mockDbChain.where.mockResolvedValue(mockVenues)
    mockCrawlVenue.mockResolvedValue({ id: 'run-uuid-1', status: 'success' })
    mockBrowser.close.mockResolvedValue(undefined)
  })

  it('calls crawlVenue for each active venue, passing the shared browser', async () => {
    const { chromium } = await import('playwright')
    const { runDailyCrawl } = await import('./run.js')
    await runDailyCrawl()
    const browser = await vi.mocked(chromium.launch).mock.results[0]?.value
    expect(mockCrawlVenue).toHaveBeenCalledTimes(4)
    expect(mockCrawlVenue).toHaveBeenCalledWith('venue-1', browser)
    expect(mockCrawlVenue).toHaveBeenCalledWith('venue-2', browser)
    expect(mockCrawlVenue).toHaveBeenCalledWith('venue-3', browser)
    expect(mockCrawlVenue).toHaveBeenCalledWith('venue-4', browser)
  })

  it('closes the browser after all crawls complete', async () => {
    const { runDailyCrawl } = await import('./run.js')
    await runDailyCrawl()
    expect(mockBrowser.close).toHaveBeenCalledTimes(1)
  })

  it('closes the browser even when a crawl throws', async () => {
    mockCrawlVenue.mockRejectedValueOnce(new Error('blocked'))
    const { runDailyCrawl } = await import('./run.js')
    await runDailyCrawl()
    expect(mockBrowser.close).toHaveBeenCalledTimes(1)
  })

  it('returns succeeded and failed counts', async () => {
    mockCrawlVenue.mockRejectedValueOnce(new Error('blocked'))
    const { runDailyCrawl } = await import('./run.js')
    const result = await runDailyCrawl()
    expect(result.succeeded).toBe(3)
    expect(result.failed).toBe(1)
  })

  it('continues processing remaining venues when one fails', async () => {
    mockCrawlVenue
      .mockRejectedValueOnce(new Error('venue-1 blocked'))
      .mockResolvedValue({ id: 'run-uuid-1', status: 'success' })
    const { runDailyCrawl } = await import('./run.js')
    await runDailyCrawl()
    expect(mockCrawlVenue).toHaveBeenCalledTimes(4)
  })

  it('processes no more than 3 venues concurrently per batch', async () => {
    let maxConcurrent = 0
    let currentConcurrent = 0
    mockCrawlVenue.mockImplementation(async () => {
      currentConcurrent++
      maxConcurrent = Math.max(maxConcurrent, currentConcurrent)
      await new Promise((resolve) => setTimeout(resolve, 10))
      currentConcurrent--
      return { id: 'run-uuid-1', status: 'success' }
    })

    const { runDailyCrawl } = await import('./run.js')
    await runDailyCrawl()
    expect(maxConcurrent).toBeLessThanOrEqual(3)
  })

  it('returns zero counts when no active venues exist', async () => {
    mockDbChain.where.mockResolvedValue([])
    const { runDailyCrawl } = await import('./run.js')
    const result = await runDailyCrawl()
    expect(result.succeeded).toBe(0)
    expect(result.failed).toBe(0)
    expect(mockCrawlVenue).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run the full test suite for the crawler app**

```bash
pnpm --filter @concert-crawl/crawler vitest run
```

Expected: all tests pass.

- [ ] **Step 3: Run the full test suite for crawler-core to confirm no regressions**

```bash
pnpm --filter @concert-crawl/crawler-core vitest run
```

Expected: all tests pass.

- [ ] **Step 4: Run typecheck across the whole monorepo**

```bash
pnpm -r tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit Task 4 + 5**

```bash
cd <worktree-root>
git add apps/crawler/src/run.ts apps/crawler/src/run.test.ts
git commit -m "fix(crawler): share single Playwright browser instance across venue crawls

Closes #133"
```

---

## Next

Open a PR from `fix/shared-playwright-browser` → `main`, referencing issue #133.
