# Needs Price Table — Server-Side Filtering & Pagination

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hard-coded 500-row limit on the Needs Price table with server-side `missingOnly` filtering (default on) and paginated fetching so the table stays fast regardless of how many total events exist.

**Architecture:** The API gains `missingOnly`, `limit`, and `offset` query params. `ReviewPageClient` owns filter + pagination state and fetches using those params; it passes the state and a `loadMore` callback down to `PriceCoverageTable` (desktop) and into `AdminReviewMobile` (mobile). Both components drop their client-side filter logic and instead call back up when the toggle changes. Pagination appends results; toggling the filter resets to page 1.

**Tech Stack:** Hono + Zod (API), React + `useCallback`/`useEffect` (web), Vitest (API integration tests), Drizzle ORM.

---

### Task 1: API — add `missingOnly`, `limit`, `offset` to `GET /v1/admin/prices/events`

**Files:**

- Modify: `apps/api/src/routes/admin/prices.ts:22-62`
- Modify: `apps/api/src/routes/admin/prices.integration.test.ts` (add new `describe` block at the end)

- [ ] **Step 1: Write the failing tests**

Add a new `describe` block at the bottom of `apps/api/src/routes/admin/prices.integration.test.ts`:

```typescript
describe('GET /v1/admin/prices/events', () => {
  beforeEach(() => {
    setAdminAuth()
    return clearTables()
  })

  it('returns only missing-price events by default', async () => {
    const venue = await seedVenue()
    await seedEvent(venue.id, {
      date: '2026-07-01',
      status: 'upcoming',
      ticketPriceMin: null,
    })
    await seedEvent(venue.id, {
      date: '2026-07-02',
      status: 'upcoming',
      ticketPriceMin: '25.00',
    })

    const res = await app.request('/v1/admin/prices/events', {
      headers: ADMIN_HEADERS,
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data).toHaveLength(1)
    expect(body.data[0].priceMin).toBeNull()
  })

  it('returns all upcoming events when missingOnly=false', async () => {
    const venue = await seedVenue()
    await seedEvent(venue.id, {
      date: '2026-07-01',
      status: 'upcoming',
      ticketPriceMin: null,
    })
    await seedEvent(venue.id, {
      date: '2026-07-02',
      status: 'upcoming',
      ticketPriceMin: '25.00',
    })

    const res = await app.request('/v1/admin/prices/events?missingOnly=false', {
      headers: ADMIN_HEADERS,
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data).toHaveLength(2)
  })

  it('respects limit and offset', async () => {
    const venue = await seedVenue()
    // Seed 5 events without prices, ordered by date
    for (let idx = 1; idx <= 5; idx++) {
      await seedEvent(venue.id, {
        date: `2026-07-0${idx}`,
        status: 'upcoming',
        ticketPriceMin: null,
      })
    }

    const res = await app.request(
      '/v1/admin/prices/events?missingOnly=true&limit=2&offset=2',
      { headers: ADMIN_HEADERS },
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data).toHaveLength(2)
    // Third and fourth events by date
    expect(body.data[0].date).toBe('2026-07-03')
    expect(body.data[1].date).toBe('2026-07-04')
  })

  it('excludes past events', async () => {
    const venue = await seedVenue()
    await seedEvent(venue.id, {
      date: '2020-01-01',
      status: 'upcoming',
      ticketPriceMin: null,
    })
    await seedEvent(venue.id, {
      date: '2026-07-01',
      status: 'upcoming',
      ticketPriceMin: null,
    })

    const res = await app.request('/v1/admin/prices/events', {
      headers: ADMIN_HEADERS,
    })
    const body = await res.json()
    expect(body.data).toHaveLength(1)
    expect(body.data[0].date).toBe('2026-07-01')
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd apps/api
pnpm vitest run src/routes/admin/prices.integration.test.ts --reporter=verbose 2>&1 | grep -A 3 "GET /v1/admin/prices/events"
```

Expected: 4 failing tests (endpoint exists but ignores the new params).

- [ ] **Step 3: Add query params to the route**

Replace the route declaration and query in `apps/api/src/routes/admin/prices.ts`. The route currently starts at line 23 (`pricesAdminRouter.get('/events', async (ctx) => {`). Replace the entire route:

```typescript
// GET /v1/admin/prices/events — upcoming events with current price data + last retrieval info
pricesAdminRouter.get(
  '/events',
  zValidator(
    'query',
    z.object({
      missingOnly: z
        .enum(['true', 'false'])
        .default('true')
        .transform((val) => val === 'true'),
      limit: z.coerce.number().int().min(1).max(100).default(50),
      offset: z.coerce.number().int().min(0).default(0),
    }),
  ),
  async (ctx) => {
    const { missingOnly, limit, offset } = ctx.req.valid('query')

    const latestLog = db
      .select({
        eventId: priceRetrievalLog.eventId,
        lastRetrievedAt: max(priceRetrievalLog.attemptedAt).as(
          'last_retrieved_at',
        ),
        lastOutcome: sql<string | null>`(
          array_agg(${priceRetrievalLog.outcome} ORDER BY ${priceRetrievalLog.attemptedAt} DESC)
        )[1]`.as('last_outcome'),
      })
      .from(priceRetrievalLog)
      .groupBy(priceRetrievalLog.eventId)
      .as('latest_log')

    const today = new Date().toLocaleDateString('en-CA', {
      timeZone: 'America/Denver',
    })

    const conditions = [
      eq(events.status, 'upcoming'),
      gte(events.date, today),
      ...(missingOnly ? [isNull(events.ticketPriceMin)] : []),
    ]

    const rows = await db
      .select({
        eventId: events.id,
        eventTitle: events.title,
        artist: events.artist,
        venueName: venues.name,
        date: events.date,
        ticketUrl: events.ticketUrl,
        priceMin: events.ticketPriceMin,
        priceMax: events.ticketPriceMax,
        priceSource: events.priceSource,
        lastRetrievedAt: latestLog.lastRetrievedAt,
        lastOutcome: latestLog.lastOutcome,
      })
      .from(events)
      .leftJoin(venues, eq(events.venueId, venues.id))
      .leftJoin(latestLog, eq(latestLog.eventId, events.id))
      .where(and(...conditions))
      .orderBy(asc(events.date))
      .limit(limit)
      .offset(offset)

    return ctx.json({ success: true, data: rows } as const)
  },
)
```

Also add the missing imports at the top of the file. The route needs `isNull`, `gte`, `and` from drizzle-orm. Check the existing import line and add any that are missing:

```typescript
import { eq, max, sql, asc, isNull, gte, and } from 'drizzle-orm'
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd apps/api
pnpm vitest run src/routes/admin/prices.integration.test.ts --reporter=verbose 2>&1 | grep -E "✓|✗|PASS|FAIL|prices/events"
```

Expected: all 4 new tests pass, no existing tests regress.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/routes/admin/prices.ts apps/api/src/routes/admin/prices.integration.test.ts
git commit -m "feat(api): add missingOnly + pagination to admin prices/events endpoint"
```

---

### Task 2: `ReviewPageClient` — own filter + pagination state, fetch with params

The client currently fetches once and passes the whole array to children. After this task it owns `missingOnly` + `offset` state and provides a `loadMorePriceEvents` callback and `hasMorePriceEvents` flag to pass down.

**Files:**

- Modify: `apps/web/src/components/admin/review/ReviewPageClient.tsx`

- [ ] **Step 1: Replace the price-events fetch effect and add state**

In `ReviewPageClient.tsx`, replace the price-events `useEffect` (lines ~113-133) and add new state:

```typescript
// New state — add after the existing priceEventsLoading declaration
const [priceFilter, setPriceFilter] = useState<'missing' | 'all'>('missing')
const [priceOffset, setPriceOffset] = useState(0)
const [isFetchingMorePrices, setIsFetchingMorePrices] = useState(false)
const [hasMorePriceEvents, setHasMorePriceEvents] = useState(true)
```

Replace the existing price-events `useEffect` with a function that re-fetches when the filter changes, and an initial call:

```typescript
const fetchPriceEvents = useCallback(
  async (missingOnly: boolean, offset: number, append: boolean) => {
    if (isFetchingMorePrices) return
    setIsFetchingMorePrices(true)
    if (!append) setPriceEventsLoading(true)
    try {
      const token = await getToken()
      if (!token) return
      const params = new URLSearchParams({
        missingOnly: String(missingOnly),
        limit: '50',
        offset: String(offset),
      })
      const rows = await apiClient.get<PriceEvent[]>(
        `/v1/admin/prices/events?${params.toString()}`,
        token,
      )
      if (append) {
        setPriceEvents((prev) => {
          const seen = new Set(prev.map((ev) => ev.eventId))
          return [...prev, ...rows.filter((ev) => !seen.has(ev.eventId))]
        })
      } else {
        setPriceEvents(rows)
      }
      setHasMorePriceEvents(rows.length === 50)
    } catch (fetchErr) {
      console.error('Failed to load price coverage data', fetchErr)
      setHasMorePriceEvents(false)
    } finally {
      setIsFetchingMorePrices(false)
      setPriceEventsLoading(false)
    }
  },
  [isFetchingMorePrices, getToken],
)

// Initial load + re-fetch when filter changes
useEffect(() => {
  setPriceOffset(0)
  setPriceEvents([])
  setHasMorePriceEvents(true)
  void fetchPriceEvents(priceFilter === 'missing', 0, false)
  // fetchPriceEvents excluded from deps intentionally — it's recreated only
  // when getToken changes, which is effectively once per mount.
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [priceFilter])

const loadMorePriceEvents = useCallback(() => {
  const nextOffset = priceOffset + 50
  setPriceOffset(nextOffset)
  void fetchPriceEvents(priceFilter === 'missing', nextOffset, true)
}, [priceOffset, priceFilter, fetchPriceEvents])

const togglePriceFilter = useCallback(() => {
  setPriceFilter((prev) => (prev === 'missing' ? 'all' : 'missing'))
}, [])
```

- [ ] **Step 2: Thread new props down to `PriceCoverageTable` and `AdminReviewMobile`**

In the desktop return branch, update the `PriceCoverageTable` call:

```tsx
<PriceCoverageTable
  events={priceEvents}
  loading={priceEventsLoading}
  onAddPrice={addPrice}
  showMissingOnly={priceFilter === 'missing'}
  onToggleMissingOnly={togglePriceFilter}
  hasMore={hasMorePriceEvents}
  onLoadMore={loadMorePriceEvents}
  isFetchingMore={isFetchingMorePrices}
/>
```

In the mobile return branch, update the `AdminReviewMobile` call:

```tsx
<AdminReviewMobile
  events={events}
  submissions={submissions}
  priceEvents={priceEvents}
  onApprove={approveEvent}
  onReject={rejectEvent}
  onApproveSubmission={approveSubmission}
  onDenySubmission={denySubmission}
  onAddPrice={addPrice}
  initialTab={mobileInitialTab}
  showMissingPricesOnly={priceFilter === 'missing'}
  onToggleMissingPricesOnly={togglePriceFilter}
  hasMorePriceEvents={hasMorePriceEvents}
  onLoadMorePriceEvents={loadMorePriceEvents}
  isFetchingMorePriceEvents={isFetchingMorePrices}
/>
```

- [ ] **Step 3: Confirm TypeScript compiles (tests come in Tasks 3 & 4)**

```bash
cd apps/web
pnpm typecheck 2>&1 | grep -v "watching.ts\|watching.test.ts" | tail -10
```

Expected: only the pre-existing `watching.ts` errors (unrelated to this change). The new props will cause type errors in `PriceCoverageTable` and `AdminReviewMobile` — that's expected and will be fixed in Tasks 3 and 4.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/admin/review/ReviewPageClient.tsx
git commit -m "feat(web): lift price filter+pagination state into ReviewPageClient"
```

---

### Task 3: `PriceCoverageTable` — remove client-side filter, accept server-driven props

**Files:**

- Modify: `apps/web/src/components/admin/review/PriceCoverageTable.tsx`

- [ ] **Step 1: Update the props interface**

Replace the `PriceCoverageTableProps` interface:

```typescript
interface PriceCoverageTableProps {
  events: PriceEvent[]
  loading?: boolean
  onAddPrice?: (
    eventId: string,
    priceMin: string,
    priceMax: string | null,
    vendor: SubmissionVendor,
    howFound: SubmissionHowFound,
  ) => Promise<void>
  showMissingOnly: boolean
  onToggleMissingOnly: () => void
  hasMore: boolean
  onLoadMore: () => void
  isFetchingMore: boolean
}
```

- [ ] **Step 2: Update the component signature and remove client-side filter state**

Replace the component signature and delete the `showMissingOnly` + `missingCount` + `filteredEvents` local state:

```typescript
export const PriceCoverageTable = ({
  events,
  loading = false,
  onAddPrice,
  showMissingOnly,
  onToggleMissingOnly,
  hasMore,
  onLoadMore,
  isFetchingMore,
}: PriceCoverageTableProps) => {
  const [addingForEventId, setAddingForEventId] = useState<string | null>(null)
  const [priceMin, setPriceMin] = useState('')
  const [priceMax, setPriceMax] = useState('')
  const [vendor, setVendor] = useState<SubmissionVendor>('Ticketmaster')
  const [howFound, setHowFound] = useState<SubmissionHowFound>('saw_listing')
  const [isSaving, setIsSaving] = useState(false)

  // events is already filtered by the server; render all of them
  const filteredEvents = events
```

Remove the `missingCount` calculation (was `events.filter(ev => ev.priceMin === null).length`) — the server now only sends missing-price events when the filter is on, so `events.length` is the missing count when `showMissingOnly` is true.

Update `missingBadge` to use `events.length` when `showMissingOnly` is active:

```typescript
const missingBadge =
  !loading && showMissingOnly && events.length > 0 ? (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 9px',
        borderRadius: 20,
        border: '1.5px solid var(--warning)',
        fontSize: 12,
        fontWeight: 600,
        color: 'var(--warning)',
        letterSpacing: 0,
        lineHeight: 1.4,
      }}
    >
      {events.length} missing
    </span>
  ) : null
```

- [ ] **Step 3: Wire the toggle to `onToggleMissingOnly`**

Find the `panelAction` block (the `AdminButton` that calls `setShowMissingOnly`). Replace:

```tsx
const panelAction = !loading ? (
  <AdminButton
    variant={showMissingOnly ? 'outline' : 'ghost'}
    size="sm"
    onClick={onToggleMissingOnly}
  >
    {ADMIN_COPY.review.priceCoverage.missingOnly}
  </AdminButton>
) : null
```

- [ ] **Step 4: Add a Load More row at the bottom of the table**

Just before the closing `</Panel>` tag, inside the scrollable area after the `<AdminTable>` closing tag, add:

```tsx
{
  hasMore && (
    <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
      <AdminButton
        variant="ghost"
        size="sm"
        onClick={onLoadMore}
        disabled={isFetchingMore}
      >
        {isFetchingMore
          ? ADMIN_COPY.review.priceCoverage.loadingMore
          : ADMIN_COPY.review.priceCoverage.loadMore}
      </AdminButton>
    </div>
  )
}
```

Add the two copy strings to `apps/web/src/components/admin/definitions/copy.ts` under `review.priceCoverage`:

```typescript
loadMore: 'Load more',
loadingMore: 'Loading…',
```

- [ ] **Step 5: Verify TypeScript**

```bash
cd apps/web
pnpm typecheck 2>&1 | grep -v "watching.ts\|watching.test.ts" | tail -10
```

Expected: no new errors beyond the pre-existing `watching.ts` ones.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/admin/review/PriceCoverageTable.tsx apps/web/src/components/admin/definitions/copy.ts
git commit -m "feat(web): server-driven filter and load-more in PriceCoverageTable"
```

---

### Task 4: `AdminReviewMobile` — remove client-side filter, use server-driven props

**Files:**

- Modify: `apps/web/src/components/admin/review/AdminReviewMobile.tsx`

- [ ] **Step 1: Extend the `AdminReviewMobileProps` interface**

Add the new props to the interface:

```typescript
interface AdminReviewMobileProps {
  events: EventFlag[]
  submissions: PriceSubmission[]
  priceEvents: PriceEvent[]
  onApprove: (id: string) => void
  onReject: (id: string) => void
  onApproveSubmission: (id: string) => void
  onDenySubmission: (id: string) => void
  onAddPrice?: (
    eventId: string,
    priceMin: string,
    priceMax: string | null,
    vendor: string,
    howFound: string,
  ) => Promise<void>
  initialTab?: 'flags' | 'prices'
  showMissingPricesOnly: boolean
  onToggleMissingPricesOnly: () => void
  hasMorePriceEvents: boolean
  onLoadMorePriceEvents: () => void
  isFetchingMorePriceEvents: boolean
}
```

- [ ] **Step 2: Update the component signature**

Add the new props to the destructuring:

```typescript
export function AdminReviewMobile({
  events,
  submissions,
  priceEvents,
  onApprove,
  onReject,
  onApproveSubmission,
  onDenySubmission,
  onAddPrice,
  initialTab = 'flags',
  showMissingPricesOnly,
  onToggleMissingPricesOnly,
  hasMorePriceEvents,
  onLoadMorePriceEvents,
  isFetchingMorePriceEvents,
}: AdminReviewMobileProps) {
```

- [ ] **Step 3: Remove client-side filter state and wire server-driven props**

Delete the local `showMissingOnly` state:

```typescript
// DELETE this line:
const [showMissingOnly, setShowMissingOnly] = useState(false)
```

Replace the three lines that compute `missingPriceEvents`, `visiblePriceEvents`, and `priceCount`:

```typescript
// BEFORE:
const missingPriceEvents = priceEvents.filter((ev) => ev.priceMin === null)
const visiblePriceEvents = showMissingOnly ? missingPriceEvents : priceEvents
const priceCount = submissions.length + missingPriceEvents.length

// AFTER:
// Server applies the missing-only filter; when the filter is on, every row in
// priceEvents is missing a price, so priceEvents.length IS the missing count.
const missingCount = showMissingPricesOnly
  ? priceEvents.length
  : priceEvents.filter((ev) => ev.priceMin === null).length
const visiblePriceEvents = priceEvents
const priceCount = submissions.length + missingCount
```

In the "Needs price" section header, replace the toggle button:

```tsx
// BEFORE:
<AdminButton
  variant={showMissingOnly ? 'outline' : 'ghost'}
  size="sm"
  onClick={() => setShowMissingOnly((prev) => !prev)}
>
  {ADMIN_COPY.review.adminReviewMobile.missingOnly}
</AdminButton>

// AFTER:
<AdminButton
  variant={showMissingPricesOnly ? 'outline' : 'ghost'}
  size="sm"
  onClick={onToggleMissingPricesOnly}
>
  {ADMIN_COPY.review.adminReviewMobile.missingOnly}
</AdminButton>
```

- [ ] **Step 4: Add a "Load More" button at the bottom of the Needs Price section**

After the `visiblePriceEvents.map(...)` block, just before the closing `</div>` of the scrollable area in the "Needs price" section, add:

```tsx
{
  hasMorePriceEvents && (
    <div
      style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}
    >
      <AdminButton
        variant="ghost"
        size="sm"
        fullWidth
        onClick={onLoadMorePriceEvents}
        disabled={isFetchingMorePriceEvents}
      >
        {isFetchingMorePriceEvents
          ? ADMIN_COPY.review.adminReviewMobile.loadingMore
          : ADMIN_COPY.review.adminReviewMobile.loadMore}
      </AdminButton>
    </div>
  )
}
```

Add the copy keys to `apps/web/src/components/admin/definitions/copy.ts` under `review.adminReviewMobile`:

```typescript
loadMore: 'Load more',
loadingMore: 'Loading…',
```

- [ ] **Step 5: Verify TypeScript**

```bash
cd apps/web
pnpm typecheck 2>&1 | grep -v "watching.ts\|watching.test.ts" | tail -10
```

Expected: no errors beyond pre-existing `watching.ts` ones.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/admin/review/AdminReviewMobile.tsx apps/web/src/components/admin/definitions/copy.ts
git commit -m "feat(web): server-driven filter and load-more in AdminReviewMobile"
```

---

### Task 5: Also fix the auto-fetch loop guard (from Copilot review)

This is the real bug identified in comment 1 and 2 of the Copilot review: if `getToken()` returns null or the network throws, the `useEffect` re-fires in a loop.

**Files:**

- Modify: `apps/web/src/components/admin/review/ReviewPageClient.tsx`

- [ ] **Step 1: Add `hasMoreEvents = false` in the catch and empty-token paths**

In `ReviewPageClient.tsx`, find the `fetchMoreEvents` callback (the one for event flags, not price events). Update the two terminal-failure paths:

```typescript
const fetchMoreEvents = useCallback(async () => {
  if (isFetchingMoreEvents || !hasMoreEvents) return
  setIsFetchingMoreEvents(true)
  try {
    const token = await getToken()
    if (!token) {
      setHasMoreEvents(false) // can't fetch without a token; stop the loop
      return
    }
    const batch = await apiClient.get<EventFlag[]>(
      '/v1/admin/events?verified=false&limit=10',
      token,
    )
    if (batch.length === 0) {
      setHasMoreEvents(false)
    } else {
      setEvents((prev) => {
        const seen = new Set(prev.map((ev) => ev.id))
        return [...prev, ...batch.filter((ev) => !seen.has(ev.id))]
      })
      if (batch.length < 10) setHasMoreEvents(false)
    }
  } catch (fetchErr) {
    console.error('Failed to fetch more events', fetchErr)
    setHasMoreEvents(false) // stop the loop on persistent error
  } finally {
    setIsFetchingMoreEvents(false)
  }
}, [isFetchingMoreEvents, hasMoreEvents, getToken])
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd apps/web
pnpm typecheck 2>&1 | grep -v "watching.ts\|watching.test.ts" | tail -5
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/admin/review/ReviewPageClient.tsx
git commit -m "fix(web): stop auto-fetch loop on token failure or network error"
```

---

### Task 6: Revert the 500-limit change from the current PR

The 500-limit in `prices.ts` was a stopgap that this plan supersedes. The limit is now controlled by the `limit` query param (max 100).

**Files:**

- Modify: `apps/api/src/routes/admin/prices.ts`

- [ ] **Step 1: Confirm the limit is now controlled by the query schema**

The route modified in Task 1 uses `.limit(limit)` where `limit` comes from the Zod schema (max 100). The hard-coded `.limit(500)` from the stopgap no longer exists after Task 1 rewrote the route. Verify:

```bash
grep -n "limit(500)" apps/api/src/routes/admin/prices.ts
```

Expected: no output. If the line is still present, remove it — Task 1 should have replaced the entire route block.

- [ ] **Step 2: Confirm tests still pass**

```bash
cd apps/api
pnpm vitest run src/routes/admin/prices.integration.test.ts --reporter=verbose 2>&1 | tail -10
```

Expected: all tests pass.

- [ ] **Step 3: If any stopgap remains, clean it up and commit**

If step 1 found no `.limit(500)`, no commit needed — Task 1 already handled it. If it was still present, commit the removal:

```bash
git add apps/api/src/routes/admin/prices.ts
git commit -m "chore(api): remove stopgap 500-row limit superseded by pagination"
```

---

### Task 7: Reply to Copilot review comments and open PR

**Files:** none (GitHub operations only)

- [ ] **Step 1: Reply to comment 1 (offset loop risk)**

```bash
gh api repos/HartiganHM/concert-crawl/pulls/570/comments/3304304789/replies \
  -X POST \
  --input - <<'EOF'
{"body": "Good catch. The missing-only + pagination approach (separate PR) removes the need for a client-side offset entirely. For the event-flags auto-fetch the loop guard is now fixed: `setHasMoreEvents(false)` on empty token and on catch."}
EOF
```

- [ ] **Step 2: Reply to comment 2 (effect loop on failure)**

```bash
gh api repos/HartiganHM/concert-crawl/pulls/570/comments/3304304874/replies \
  -X POST \
  --input - <<'EOF'
{"body": "Fixed. Both the empty-token path and the catch block now call `setHasMoreEvents(false)` to stop further auto-fetch attempts."}
EOF
```

- [ ] **Step 3: Reply to comment 3 (PR scope)**

```bash
gh api repos/HartiganHM/concert-crawl/pulls/570/comments/3304304926/replies \
  -X POST \
  --input - <<'EOF'
{"body": "The auto-fetch behavior is intentional and part of the fix. PR description updated to call it out."}
EOF
```

- [ ] **Step 4: Reply to comment 4 (500 limit)**

```bash
gh api repos/HartiganHM/concert-crawl/pulls/570/comments/3304304977/replies \
  -X POST \
  --input - <<'EOF'
{"body": "Agreed — superseded. The /events endpoint now accepts missingOnly (default true), limit (max 100), and offset params, addressed in a follow-up PR."}
EOF
```

- [ ] **Step 5: Update the current PR #570 body to mention auto-fetch**

```bash
gh pr edit 570 --body "$(cat <<'EOF'
## What does this PR do?

Four admin UI bug fixes:

1. **Mobile community submissions**: shows event name instead of truncated UUID — falls back to \`sub.eventTitle\` before truncating to event ID.
2. **Stat card icon overflow**: icon is now \`position: absolute\` top-right, removed from flex flow so it can never displace content on narrow viewports.
3. **Event review auto-fetch**: when the unverified-event queue drops to ≤5 items, the client silently fetches the next 10 without a button. Loop guard added: stops on empty token or network error.
4. **Needs Price table cap**: raised API limit 100→500 as a stopgap (superseded by follow-up PR adding server-side missingOnly filter + pagination).

## How to test

1. Admin → Review on mobile: community submissions should show event names
2. Admin dashboard on mobile: stat card icons should stay inside card borders
3. Admin → Review: approve/reject events until <5 remain; next batch should load automatically

## Checklist

- [ ] Tests pass locally (\`pnpm test\`)
- [ ] Types pass (\`pnpm typecheck\`)
- [ ] No new lint errors (\`pnpm lint\`)
- [ ] Relevant documentation updated
EOF
)"
```

- [ ] **Step 6: Push final branch state**

```bash
git push
```
