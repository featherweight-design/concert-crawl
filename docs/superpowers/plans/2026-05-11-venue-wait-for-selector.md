# Venue waitForSelector Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a per-venue `crawlWaitForSelector` CSS selector field that lets the crawler wait for a specific DOM element after page navigation — fixing SPA venues like Levitt Denver that time out or silently return 0 events.

**Architecture:** A new nullable text column on `venues` flows through the type system → API → server action → admin UI. The fetcher gains a 5th `waitForSelector` parameter; when provided it forces `page.goto` to use `domcontentloaded` (fast connection) then calls `page.waitForSelector(selector, { timeout: 30_000 })` before reading content. This lets SPAs finish rendering before extraction begins.

**Tech Stack:** Drizzle ORM (migration + schema), Playwright (`page.waitForSelector`), Hono + Zod (API route), Next.js Server Action, React (admin UI)

**Closes:** #236 / Sentry `CONCERT-CRAWL-CRAWLER-2`

---

## File Map

| File | Change |
|------|--------|
| `packages/db/src/schema/venues.ts` | Add `crawlWaitForSelector` column |
| `packages/db/migrations/0018_venue_wait_for_selector.sql` | Create migration |
| `packages/db/migrations/meta/_journal.json` | Add journal entry |
| `packages/types/src/index.ts` | Add `crawlWaitForSelector: string \| null` to `Venue` |
| `packages/crawler-core/src/lib/fetcher.ts` | Add `waitForSelector?` param + `page.waitForSelector` call |
| `packages/crawler-core/src/lib/fetcher.test.ts` | New: unit tests for waitForSelector behavior |
| `packages/crawler-core/src/crawl.ts` | Pass `venue.crawlWaitForSelector ?? undefined` to `fetchPage` |
| `packages/crawler-core/src/crawl.test.ts` | Add test: selector forwarded from venue to fetchPage |
| `apps/api/src/routes/admin/venues.ts` | Add `crawlWaitForSelector` to `createVenueSchema` |
| `apps/api/src/routes/admin/venues.test.ts` | Add PATCH test for new field |
| `apps/web/src/lib/actions/venues.ts` | Read + forward `crawlWaitForSelector` from FormData |
| `apps/web/src/components/admin/VenueDetailsClient.tsx` | Add text input + state for the new field |

---

## Task 1: DB migration — add `crawlWaitForSelector` column

**Files:**
- Modify: `packages/db/src/schema/venues.ts`
- Create: `packages/db/migrations/0018_venue_wait_for_selector.sql`
- Modify: `packages/db/migrations/meta/_journal.json`

- [ ] **Step 1: Write the migration SQL**

Create `packages/db/migrations/0018_venue_wait_for_selector.sql`:

```sql
ALTER TABLE venues
  ADD COLUMN IF NOT EXISTS crawl_wait_for_selector text;
```

- [ ] **Step 2: Add the journal entry**

In `packages/db/migrations/meta/_journal.json`, append to the `entries` array (after the `0017` entry):

```json
{
  "idx": 18,
  "version": "7",
  "when": 1778623200000,
  "tag": "0018_venue_wait_for_selector",
  "breakpoints": true
}
```

- [ ] **Step 3: Update the Drizzle schema**

In `packages/db/src/schema/venues.ts`, add the new column after `crawlWaitUntil`:

```typescript
crawlWaitUntil: crawlWaitUntilEnum('crawl_wait_until')
  .notNull()
  .default('networkidle'),
crawlWaitForSelector: text('crawl_wait_for_selector'),
```

- [ ] **Step 4: Apply the migration locally**

```bash
pnpm db:migrate
```

Expected: `Applying migration 0018_venue_wait_for_selector` logged with no errors.

- [ ] **Step 5: Commit**

```bash
git add packages/db/src/schema/venues.ts packages/db/migrations/0018_venue_wait_for_selector.sql packages/db/migrations/meta/_journal.json
git commit -m "feat(db): add crawl_wait_for_selector column to venues"
```

---

## Task 2: Update shared `Venue` type

**Files:**
- Modify: `packages/types/src/index.ts`

- [ ] **Step 1: Add the field to the `Venue` interface**

In `packages/types/src/index.ts`, in the `Venue` interface, add `crawlWaitForSelector` after `crawlWaitUntil`:

```typescript
crawlWaitUntil: 'networkidle' | 'load' | 'domcontentloaded'
crawlWaitForSelector: string | null
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
pnpm --filter @concert-crawl/types tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add packages/types/src/index.ts
git commit -m "feat(types): add crawlWaitForSelector to Venue interface"
```

---

## Task 3: fetcher — implement `waitForSelector` support

**Files:**
- Modify: `packages/crawler-core/src/lib/fetcher.ts`
- Create: `packages/crawler-core/src/lib/fetcher.test.ts`

- [ ] **Step 1: Write failing tests**

Create `packages/crawler-core/src/lib/fetcher.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { fetchPage } from './fetcher.js'
import type { Browser, BrowserContext, Page, Response } from 'playwright'

function makeMockPage(overrides: Partial<Page> = {}): Page {
  return {
    on: vi.fn(),
    goto: vi.fn().mockResolvedValue({ status: () => 200 } as unknown as Response),
    waitForSelector: vi.fn().mockResolvedValue(null),
    content: vi.fn().mockResolvedValue('<html><body>loaded</body></html>'),
    url: vi.fn().mockReturnValue('https://example.com'),
    ...overrides,
  } as unknown as Page
}

function makeMockBrowser(page: Page): Browser {
  const context = {
    newPage: vi.fn().mockResolvedValue(page),
    close: vi.fn().mockResolvedValue(undefined),
  } as unknown as BrowserContext
  return {
    newContext: vi.fn().mockResolvedValue(context),
  } as unknown as Browser
}

describe('fetchPage — waitForSelector', () => {
  it('calls page.waitForSelector and forces domcontentloaded when selector is provided', async () => {
    const page = makeMockPage()
    const browser = makeMockBrowser(page)

    await fetchPage('https://example.com', browser, 0, 'networkidle', '.event-card')

    expect(page.goto).toHaveBeenCalledWith('https://example.com', {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    })
    expect(page.waitForSelector).toHaveBeenCalledWith('.event-card', {
      timeout: 30_000,
    })
  })

  it('does not call waitForSelector when no selector is provided', async () => {
    const page = makeMockPage()
    const browser = makeMockBrowser(page)

    await fetchPage('https://example.com', browser, 0, 'networkidle')

    expect(page.goto).toHaveBeenCalledWith('https://example.com', {
      waitUntil: 'networkidle',
      timeout: 30_000,
    })
    expect(page.waitForSelector).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
pnpm --filter @concert-crawl/crawler-core vitest run src/lib/fetcher.test.ts
```

Expected: FAIL — `waitForSelector` called unexpectedly / `domcontentloaded` not used.

- [ ] **Step 3: Implement the changes in `fetcher.ts`**

Replace the `fetchPage` signature and `page.goto` call in `packages/crawler-core/src/lib/fetcher.ts`:

```typescript
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

    // When a CSS selector is provided, use domcontentloaded for the
    // navigation (fast connection) and let waitForSelector handle
    // SPA render timing — avoids networkidle/load timeouts on heavy SPAs.
    const response = await page.goto(url, {
      waitUntil: waitForSelector ? 'domcontentloaded' : waitUntil,
      timeout: 30_000,
    })

    if (waitForSelector) {
      await page.waitForSelector(waitForSelector, { timeout: 30_000 })
    }

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

- [ ] **Step 4: Run tests to confirm they pass**

```bash
pnpm --filter @concert-crawl/crawler-core vitest run src/lib/fetcher.test.ts
```

Expected: PASS — both tests green.

- [ ] **Step 5: Commit**

```bash
git add packages/crawler-core/src/lib/fetcher.ts packages/crawler-core/src/lib/fetcher.test.ts
git commit -m "feat(crawler-core): add waitForSelector support to fetchPage"
```

---

## Task 4: crawl.ts — pass selector from venue to fetcher

**Files:**
- Modify: `packages/crawler-core/src/crawl.ts`
- Modify: `packages/crawler-core/src/crawl.test.ts`

- [ ] **Step 1: Write the failing test**

In `packages/crawler-core/src/crawl.test.ts`, find the existing `describe('crawlVenue — fetch options', ...)` block and add a new test after the existing one:

```typescript
it('passes venue crawlWaitForSelector to fetchPage', async () => {
  const venue = seedVenue({ crawlWaitForSelector: '.event-list-item' })
  mockFetchPage.mockResolvedValue({
    html: HTML_V1,
    httpStatus: 200,
    finalUrl: venue.websiteUrl,
  })
  mockExtractWithLlm.mockResolvedValue({
    events: [],
    usage: { inputTokens: 0, outputTokens: 0 },
  })

  await crawlVenue(venue.id, mockBrowser)

  expect(mockFetchPage).toHaveBeenCalledWith(
    venue.websiteUrl,
    mockBrowser,
    venue.crawlDelayMs,
    venue.crawlWaitUntil,
    '.event-list-item',
  )
})

it('passes undefined to fetchPage when crawlWaitForSelector is null', async () => {
  const venue = seedVenue({ crawlWaitForSelector: null })
  mockFetchPage.mockResolvedValue({
    html: HTML_V1,
    httpStatus: 200,
    finalUrl: venue.websiteUrl,
  })
  mockExtractWithLlm.mockResolvedValue({
    events: [],
    usage: { inputTokens: 0, outputTokens: 0 },
  })

  await crawlVenue(venue.id, mockBrowser)

  expect(mockFetchPage).toHaveBeenCalledWith(
    venue.websiteUrl,
    mockBrowser,
    venue.crawlDelayMs,
    venue.crawlWaitUntil,
    undefined,
  )
})
```

Note: `seedVenue` accepts overrides — you'll need to add `crawlWaitForSelector` to the `seedVenue` helper's default values (set to `null`).

- [ ] **Step 2: Update `seedVenue` default in crawl.test.ts**

Find the `seedVenue` helper function (around line 160) and add `crawlWaitForSelector: null` to its default spread:

```typescript
crawlDelayMs: 3000,
crawlWaitUntil: 'networkidle' as const,
crawlWaitForSelector: null,
```

- [ ] **Step 3: Run tests to confirm they fail**

```bash
pnpm --filter @concert-crawl/crawler-core vitest run src/crawl.test.ts
```

Expected: FAIL — `mockFetchPage` called with only 4 args, not 5.

- [ ] **Step 4: Update the `fetchPage` call in `crawl.ts`**

In `packages/crawler-core/src/crawl.ts`, find the `fetchPage` call (around line 77) and add the 5th argument:

```typescript
const { html, httpStatus, finalUrl } = await fetchPage(
  venue.websiteUrl,
  browser,
  venue.crawlDelayMs,
  venue.crawlWaitUntil,
  venue.crawlWaitForSelector ?? undefined,
)
```

- [ ] **Step 5: Run tests to confirm they pass**

```bash
pnpm --filter @concert-crawl/crawler-core vitest run src/crawl.test.ts
```

Expected: PASS — all tests green including the two new ones.

- [ ] **Step 6: Commit**

```bash
git add packages/crawler-core/src/crawl.ts packages/crawler-core/src/crawl.test.ts
git commit -m "feat(crawler-core): forward crawlWaitForSelector from venue to fetchPage"
```

---

## Task 5: API — expose `crawlWaitForSelector` on venues route

**Files:**
- Modify: `apps/api/src/routes/admin/venues.ts`
- Modify: `apps/api/src/routes/admin/venues.test.ts`

- [ ] **Step 1: Write the failing test**

In `apps/api/src/routes/admin/venues.test.ts`, add a test for the PATCH handler accepting `crawlWaitForSelector`. Find the section with PATCH tests and add:

```typescript
it('PATCH /v1/admin/venues/:id — accepts crawlWaitForSelector', async () => {
  mockDb.returning.mockResolvedValue([
    { ...mockDb._mockVenueRow, crawlWaitForSelector: '.event-card' },
  ])

  const app = createApp()
  const response = await app.request('/v1/admin/venues/venue-1', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer test-token',
    },
    body: JSON.stringify({ crawlWaitForSelector: '.event-card' }),
  })

  expect(response.status).toBe(200)
  const body = await response.json()
  expect(body.data.crawlWaitForSelector).toBe('.event-card')
})

it('PATCH /v1/admin/venues/:id — accepts null crawlWaitForSelector to clear it', async () => {
  mockDb.returning.mockResolvedValue([
    { ...mockDb._mockVenueRow, crawlWaitForSelector: null },
  ])

  const app = createApp()
  const response = await app.request('/v1/admin/venues/venue-1', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer test-token',
    },
    body: JSON.stringify({ crawlWaitForSelector: null }),
  })

  expect(response.status).toBe(200)
  const body = await response.json()
  expect(body.data.crawlWaitForSelector).toBeNull()
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
pnpm --filter @concert-crawl/api vitest run src/routes/admin/venues.test.ts
```

Expected: FAIL — `crawlWaitForSelector` rejected by Zod schema (unknown key).

- [ ] **Step 3: Add field to `createVenueSchema` in `venues.ts`**

In `apps/api/src/routes/admin/venues.ts`, add `crawlWaitForSelector` to `createVenueSchema` after `crawlWaitUntil`:

```typescript
crawlWaitUntil: z
  .enum(['networkidle', 'load', 'domcontentloaded'])
  .default('networkidle'),
crawlWaitForSelector: z.string().nullable().optional(),
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
pnpm --filter @concert-crawl/api vitest run src/routes/admin/venues.test.ts
```

Expected: PASS — all tests green including the two new ones.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/routes/admin/venues.ts apps/api/src/routes/admin/venues.test.ts
git commit -m "feat(api): add crawlWaitForSelector to venue update schema"
```

---

## Task 6: Server action — read and forward `crawlWaitForSelector`

**Files:**
- Modify: `apps/web/src/lib/actions/venues.ts`

- [ ] **Step 1: Update `updateVenue` to read the new field**

In `apps/web/src/lib/actions/venues.ts`, inside the `updateVenue` function, add after the `crawlWaitUntil` block:

```typescript
const crawlWaitForSelectorRaw = formData.get('crawlWaitForSelector')
const crawlWaitForSelector =
  crawlWaitForSelectorRaw === null || String(crawlWaitForSelectorRaw).trim() === ''
    ? null
    : String(crawlWaitForSelectorRaw).trim()
```

Then include it in the `apiClient.patch` call body alongside the other fields:

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
})
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
pnpm --filter @concert-crawl/web tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/lib/actions/venues.ts
git commit -m "feat(web): forward crawlWaitForSelector in updateVenue action"
```

---

## Task 7: Admin UI — add `crawlWaitForSelector` text input

**Files:**
- Modify: `apps/web/src/components/admin/VenueDetailsClient.tsx`

- [ ] **Step 1: Add state for the new field**

In `VenueDetailsClient.tsx`, after the `crawlDelayVal` state (around line 199), add:

```typescript
const [waitForSelectorVal, setWaitForSelectorVal] = useState(
  venue.crawlWaitForSelector ?? '',
)
```

- [ ] **Step 2: Include the field in `isDirty` check**

Add to the `isDirty` expression (after `crawlDelayVal !== venue.crawlDelayMs`):

```typescript
(waitForSelectorVal || null) !== venue.crawlWaitForSelector
```

So the full expression becomes:

```typescript
const isDirty =
  nameVal !== venue.name ||
  slugVal !== venue.slug ||
  urlVal !== venue.websiteUrl ||
  cityVal !== venue.city ||
  active !== venue.active ||
  waitUntilVal !== venue.crawlWaitUntil ||
  crawlDelayVal !== venue.crawlDelayMs ||
  (waitForSelectorVal || null) !== venue.crawlWaitForSelector
```

- [ ] **Step 3: Include the field in `handleDiscard`**

Add after `setCrawlDelayVal(venue.crawlDelayMs)` in `handleDiscard`:

```typescript
setWaitForSelectorVal(venue.crawlWaitForSelector ?? '')
```

- [ ] **Step 4: Include the field in `handleSave`**

Add after `formData.set('crawlDelayMs', ...)` in `handleSave`:

```typescript
formData.set('crawlWaitForSelector', waitForSelectorVal.trim())
```

- [ ] **Step 5: Add the input field to the UI**

In the "Crawl settings" section, after the closing `</Field>` for "Crawl delay (ms)" and before the closing `</div>` of the crawl settings section, add:

```tsx
{/* Wait for selector */}
<Field
  label="Wait for selector (optional)"
  htmlFor="edit-venue-wait-for-selector"
  hint={
    <span style={{ fontSize: 11, color: 'var(--fg-muted)', lineHeight: 1.5 }}>
      CSS selector to wait for after page load — use for SPAs where content
      is injected by JavaScript. Example:{' '}
      <code
        style={{
          fontFamily: 'monospace',
          background: 'var(--surface-1)',
          padding: '1px 3px',
          borderRadius: 3,
        }}
      >
        .event-list-item
      </code>
      . When set, the wait strategy above is ignored and{' '}
      <strong style={{ color: 'var(--fg)' }}>DOM content loaded</strong> is
      used for navigation instead.
    </span>
  }
>
  <input
    id="edit-venue-wait-for-selector"
    type="text"
    value={waitForSelectorVal}
    placeholder="e.g. .event-card or [data-testid='event']"
    disabled={isDisabled}
    onChange={(evt) => setWaitForSelectorVal(evt.target.value)}
    style={inputStyle(false, isDisabled)}
  />
</Field>
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
pnpm --filter @concert-crawl/web tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/components/admin/VenueDetailsClient.tsx
git commit -m "feat(web): add crawlWaitForSelector field to venue admin settings"
```

---

## Task 8: Full run — typecheck, lint, test, then PR

- [ ] **Step 1: Run full typecheck across all packages**

```bash
pnpm --filter @concert-crawl/db tsc --noEmit && pnpm --filter @concert-crawl/types tsc --noEmit && pnpm --filter @concert-crawl/crawler-core tsc --noEmit && pnpm --filter @concert-crawl/api tsc --noEmit && pnpm --filter @concert-crawl/web tsc --noEmit
```

Expected: no errors across all packages.

- [ ] **Step 2: Run all affected tests**

```bash
pnpm --filter @concert-crawl/crawler-core vitest run && pnpm --filter @concert-crawl/api vitest run src/routes/admin/venues.test.ts
```

Expected: all green.

- [ ] **Step 3: Open PR**

```bash
gh pr create \
  --title "feat: per-venue waitForSelector for SPA crawl support" \
  --body "$(cat <<'EOF'
Closes #236

## What

Adds a `crawlWaitForSelector` field to venues. When set, the crawler navigates to the page with `domcontentloaded` (fast) then waits for a specific CSS selector to appear before extracting content — fixing SPAs like Levitt Denver that render event data via JavaScript after load.

## Why

Levitt Denver (`https://www.levittdenver.org/free-concert-series#/events`) times out with `networkidle`/`load` (third-party scripts never settle) and silently returns 0 events with `domcontentloaded` (SPA not yet rendered). Tracked in Sentry as `CONCERT-CRAWL-CRAWLER-2`.

## Changes

- `packages/db` — migration `0018_venue_wait_for_selector` adds `crawl_wait_for_selector text` column
- `packages/crawler-core` — `fetchPage` accepts a 5th `waitForSelector?` arg; when provided, forces `domcontentloaded` goto + calls `page.waitForSelector(selector, { timeout: 30_000 })`
- `packages/types` — `Venue.crawlWaitForSelector: string | null`
- `apps/api` — `crawlWaitForSelector` added to venue update schema
- `apps/web` — server action reads + forwards field; admin venue UI shows the input under Crawl Settings

## New env vars

None.

## How to use

1. Visit admin → Venues → Levitt Pavilion
2. Open the venue page in DevTools, find the CSS selector that appears when the event list renders
3. Enter the selector in "Wait for selector" and save
4. Trigger a crawl — events should now be captured
EOF
)"
```
