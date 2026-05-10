# Admin Crawl — LLM Cost Tracking + Events Updated + Run All — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire real LLM cost tracking (add `llm_cost_usd` and `events_updated` columns to `crawl_runs`, write them from the crawler), expose them via the API, display them in the admin UI stat cards, and implement the "Run all" button with a new bulk-trigger API endpoint.

**Architecture:** DB migration (expand-only, additive columns) → crawler writes the new columns → API selects them → page.tsx displays LLM cost breakdown and events updated hints → "Run all" endpoint queues triggers for all active/verified venues and returns a list of trigger IDs → frontend button polls until done.

**Tech Stack:** Drizzle ORM migrations, Vitest (mocked unit tests for API routes), Next.js server + client components.

**Closes:** #150 #155 #156

---

## File map

| File                                                              | Change                                                             |
| ----------------------------------------------------------------- | ------------------------------------------------------------------ |
| `packages/db/src/schema/crawl-runs.ts`                            | Add `llmCostUsd` (numeric) and `eventsUpdated` (integer) columns   |
| `packages/db/src/migrations/NNNN_add_llm_cost_events_updated.sql` | Migration file                                                     |
| `packages/crawler-core/src/`                                      | Write `llmCostUsd` and `eventsUpdated` when saving crawl run       |
| `apps/api/src/routes/admin/crawl.ts`                              | Select new columns; add `POST /v1/admin/crawl` bulk trigger        |
| `apps/api/src/routes/admin/crawl.test.ts`                         | Add tests for new bulk endpoint and verify new fields in runs list |
| `apps/web/src/app/api/admin/crawl/route.ts`                       | New Next.js route handler for `POST /api/admin/crawl`              |
| `apps/web/src/app/(protected)/admin/crawl/page.tsx`               | Wire LLM cost breakdown hint, events updated hint, "Run all" state |
| `apps/web/src/components/admin/crawl/CrawlSplitView.tsx`          | Receive `onRunAll` prop, update Re-crawl polling to refresh data   |

---

## Task 1: DB migration — add llm_cost_usd and events_updated to crawl_runs

**Files:**

- Modify: `packages/db/src/schema/crawl-runs.ts`
- Create: `packages/db/src/migrations/` (new .sql file, timestamp must be > all existing)

- [ ] **Step 1: Check the latest migration timestamp**

```bash
ls packages/db/src/migrations/*.sql | sort | tail -3
```

Note the highest timestamp (e.g. `0014_...sql`). Your new migration must be numbered `0015` (or whatever comes next).

- [ ] **Step 2: Add columns to the Drizzle schema**

In `packages/db/src/schema/crawl-runs.ts`, add two new columns after `durationMs`:

```typescript
import {
  doublePrecision,  // add this import
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'

// Inside pgTable definition, after durationMs:
  durationMs: integer('duration_ms'),
  llmCostUsd: doublePrecision('llm_cost_usd'),        // nullable, actual spend in USD
  eventsUpdated: integer('events_updated').default(0), // count of events updated (not inserted)
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
```

- [ ] **Step 3: Write the migration SQL file**

Create `packages/db/src/migrations/00NN_add_llm_cost_events_updated.sql` (replace NN with the next sequential number):

```sql
ALTER TABLE crawl_runs
  ADD COLUMN IF NOT EXISTS llm_cost_usd DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS events_updated INTEGER NOT NULL DEFAULT 0;
```

- [ ] **Step 4: Run the migration locally**

```bash
pnpm db:migrate
```

Expected: migration runs without error.

- [ ] **Step 5: Verify the columns exist**

```bash
docker exec -it concert-crawl-db psql -U postgres -d concert_crawl_db \
  -c "\d crawl_runs"
```

Expected: `llm_cost_usd` (double precision, nullable) and `events_updated` (integer, not null default 0) appear.

- [ ] **Step 6: Commit**

```bash
git add packages/db/src/schema/crawl-runs.ts packages/db/src/migrations/
git commit -m "feat(db): add llm_cost_usd and events_updated columns to crawl_runs"
```

---

## Task 2: Crawler — write llmCostUsd and eventsUpdated

The crawler-core package is responsible for creating crawl run records. Locate where `eventsInserted` is written and add the two new fields alongside it.

**Files:**

- Modify: `packages/crawler-core/src/` (the file that inserts into `crawl_runs`)

- [ ] **Step 1: Find where the crawl run is persisted**

```bash
grep -rn "eventsInserted\|crawlRuns\|insert" packages/crawler-core/src/ | grep -v ".test." | head -20
```

Identify the file and function that does `db.insert(crawlRuns).values(...)`.

- [ ] **Step 2: Add llmCostUsd and eventsUpdated to the insert**

In the identified file, wherever `eventsInserted` is passed to the DB insert, add the two new fields:

```typescript
await db.insert(crawlRuns).values({
  venueId,
  status,
  httpStatusCode,
  robotsTxtBlocked,
  extractionStrategyUsed,
  eventsFound,
  eventsInserted,
  eventsUpdated: result.eventsUpdated ?? 0, // <-- add
  llmCostUsd: result.llmCostUsd ?? null, // <-- add
  errorMessage,
  durationMs,
})
```

The `result.eventsUpdated` and `result.llmCostUsd` values must come from the crawl result object. If they don't exist yet:

- **eventsUpdated**: the event-upsert logic already knows whether each event was inserted vs. updated — count the "updated" cases and return them in the result object
- **llmCostUsd**: the LLM extraction step receives a response from the Anthropic API; calculate cost from `usage.input_tokens` + `usage.output_tokens` using Claude Haiku pricing ($0.80/M input, $4.00/M output as of 2026-05)

- [ ] **Step 3: Find where LLM cost can be captured**

```bash
grep -rn "anthropic\|llm\|haiku\|usage\|input_tokens" packages/crawler-core/src/ | grep -v ".test." | head -20
```

Find where the Anthropic API is called. After the call, extract usage:

```typescript
const response = await anthropic.messages.create({ ... })

// Capture cost immediately after the call
const INPUT_COST_PER_TOKEN = 0.80 / 1_000_000   // $0.80 per million
const OUTPUT_COST_PER_TOKEN = 4.00 / 1_000_000  // $4.00 per million
const llmCostUsd =
  (response.usage.input_tokens * INPUT_COST_PER_TOKEN) +
  (response.usage.output_tokens * OUTPUT_COST_PER_TOKEN)
```

Pass `llmCostUsd` up through the return value chain so it reaches the crawl run insert.

- [ ] **Step 4: Find where eventsUpdated can be captured**

Locate the upsert/insert logic for events. Drizzle's `.onConflictDoUpdate()` returns inserted/updated rows. Count updates vs inserts:

```typescript
// When upserting events, track how many were updates vs inserts:
let eventsInserted = 0
let eventsUpdated = 0
for (const event of events) {
  const [result] = await db
    .insert(events_table)
    .values(event)
    .onConflictDoUpdate({ ... })
    .returning({ id: events_table.id, isNew: /* ... */ })
  // If the event already existed (conflict), it was updated; otherwise inserted
  // Use `eventsInserted` count from the DB response or track via pre-existing IDs
}
```

The exact approach depends on the existing code pattern. If upsert is done in bulk, count pre-existing IDs before the upsert and compare after.

- [ ] **Step 5: Build the crawler-core package to confirm no TypeScript errors**

```bash
pnpm --filter @concert-crawl/crawler-core build
```

Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add packages/crawler-core/
git commit -m "feat(crawler-core): write llm_cost_usd and events_updated to crawl_runs"
```

---

## Task 3: API — select new columns and add bulk trigger endpoint

**Files:**

- Modify: `apps/api/src/routes/admin/crawl.ts`
- Modify: `apps/api/src/routes/admin/crawl.test.ts`

- [ ] **Step 1: Add llmCostUsd and eventsUpdated to the runs list SELECT**

In `GET /v1/admin/crawl/runs`, add the new columns to the select object (currently lines ~108–120):

```typescript
const dbRuns = await db.select({
  id: crawlRuns.id,
  venueId: crawlRuns.venueId,
  venueName: venues.name,
  status: crawlRuns.status,
  httpStatusCode: crawlRuns.httpStatusCode,
  robotsTxtBlocked: crawlRuns.robotsTxtBlocked,
  extractionStrategyUsed: crawlRuns.extractionStrategyUsed,
  eventsFound: crawlRuns.eventsFound,
  eventsInserted: crawlRuns.eventsInserted,
  eventsUpdated: crawlRuns.eventsUpdated, // <-- add
  errorMessage: crawlRuns.errorMessage,
  durationMs: crawlRuns.durationMs,
  llmCostUsd: crawlRuns.llmCostUsd, // <-- add
  createdAt: crawlRuns.createdAt,
})
```

Also add to the `GET /v1/admin/crawl/runs/:id` single-run select:

```typescript
const [crawlRun] = await db
  .select() // already selects all columns, so new columns are auto-included
  .from(crawlRuns)
  .where(eq(crawlRuns.id, id))
```

`select()` with no args selects all columns, so this route is already covered.

- [ ] **Step 2: Add bulk trigger endpoint POST /v1/admin/crawl**

Add this route before the `POST /:venueId` route:

```typescript
// POST /v1/admin/crawl — queue crawl triggers for all active/verified venues
crawlAdminRouter.post('/', async (ctx) => {
  const activeVenues = await db
    .select({ id: venues.id })
    .from(venues)
    .where(and(eq(venues.active, true), eq(venues.verified, true)))

  if (activeVenues.length === 0) {
    return ctx.json({ success: true, data: { triggerIds: [], count: 0 } })
  }

  const actor = getAuthUser(ctx).userId
  const inserted = await db
    .insert(crawlTriggers)
    .values(
      activeVenues.map((venue) => ({ venueId: venue.id, triggeredBy: actor })),
    )
    .returning({ id: crawlTriggers.id, venueId: crawlTriggers.venueId })

  ctx.set('auditAction', 'crawl.trigger_all')
  ctx.set('auditActorId', actor)

  return ctx.json(
    {
      success: true,
      data: {
        triggerIds: inserted.map((row) => row.id),
        count: inserted.length,
      },
    },
    202,
  )
})
```

Note: `and` must be imported from `drizzle-orm` — add it to the existing import.

- [ ] **Step 3: Write tests for the bulk trigger endpoint**

In `crawl.test.ts`, add a new describe block:

```typescript
describe('POST /v1/admin/crawl (bulk)', () => {
  it('returns 401 for unauthenticated requests', async () => {
    mockGetAuth.mockReturnValue(null)
    const res = await createApp().request('/v1/admin/crawl', { method: 'POST' })
    expect(res.status).toBe(401)
  })

  it('returns 403 for non-admin users', async () => {
    mockGetAuth.mockReturnValue({
      userId: 'user_123',
      sessionClaims: { metadata: { role: 'user' } },
    })
    const res = await createApp().request('/v1/admin/crawl', { method: 'POST' })
    expect(res.status).toBe(403)
  })

  it('returns 202 with empty triggerIds when no active venues', async () => {
    mockGetAuth.mockReturnValue({
      userId: 'admin_123',
      sessionClaims: { metadata: { role: 'admin' } },
    })
    const { db } = await import('@concert-crawl/db')
    vi.mocked(db.select().from().where).mockResolvedValueOnce([])
    const res = await createApp().request('/v1/admin/crawl', { method: 'POST' })
    expect(res.status).toBe(202)
    const body = (await res.json()) as {
      success: boolean
      data: { triggerIds: string[]; count: number }
    }
    expect(body.success).toBe(true)
    expect(body.data.count).toBe(0)
    expect(body.data.triggerIds).toEqual([])
  })

  it('returns 202 with triggerIds for all active venues', async () => {
    mockGetAuth.mockReturnValue({
      userId: 'admin_123',
      sessionClaims: { metadata: { role: 'admin' } },
    })
    const { db } = await import('@concert-crawl/db')
    vi.mocked(db.select().from().where).mockResolvedValueOnce([
      { id: VENUE_ID },
    ])
    vi.mocked(db.insert({}).values().returning).mockResolvedValueOnce([
      { id: TRIGGER_ID, venueId: VENUE_ID },
    ])
    const res = await createApp().request('/v1/admin/crawl', { method: 'POST' })
    expect(res.status).toBe(202)
    const body = (await res.json()) as {
      success: boolean
      data: { triggerIds: string[]; count: number }
    }
    expect(body.success).toBe(true)
    expect(body.data.count).toBe(1)
    expect(body.data.triggerIds).toContain(TRIGGER_ID)
  })
})
```

- [ ] **Step 4: Run API tests**

```bash
pnpm --filter @concert-crawl/api test --run
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/routes/admin/crawl.ts apps/api/src/routes/admin/crawl.test.ts
git commit -m "feat(api): select llmCostUsd/eventsUpdated in runs; add POST /v1/admin/crawl bulk trigger"
```

---

## Task 4: CrawlRun type — add eventsUpdated

**Files:**

- Modify: `packages/types/src/index.ts`

- [ ] **Step 1: Add eventsUpdated to CrawlRun interface**

Find the `CrawlRun` interface and add the field:

```typescript
export interface CrawlRun {
  id: string
  venueId: string
  status: CrawlStatus | 'in_progress'
  httpStatusCode: number | null
  robotsTxtBlocked: string | null
  extractionStrategyUsed: string | null
  eventsFound: number
  eventsInserted: number
  eventsUpdated: number // <-- add
  errorMessage: string | null
  durationMs: number | null
  createdAt: string
  llmCostUsd?: number | null
  venueName?: string | null
  startedAt?: string | null
}
```

- [ ] **Step 2: Build types package**

```bash
pnpm --filter @concert-crawl/types build
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add packages/types/src/index.ts
git commit -m "feat(types): add eventsUpdated to CrawlRun interface"
```

---

## Task 5: Next.js route — POST /api/admin/crawl (proxy for bulk trigger)

**Files:**

- Create: `apps/web/src/app/api/admin/crawl/route.ts`

- [ ] **Step 1: Create the bulk trigger Next.js route**

```typescript
import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { isRole } from '@concert-crawl/types'

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001'

export async function POST() {
  const { getToken, sessionClaims } = await auth()
  const token = await getToken()
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const role = isRole(sessionClaims?.metadata?.role)
    ? sessionClaims.metadata.role
    : null
  if (role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const upstream = await fetch(`${API_URL}/v1/admin/crawl`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  })

  const body = await upstream.json()
  return NextResponse.json(body, { status: upstream.status })
}
```

- [ ] **Step 2: Verify no conflicts with the existing venueId route**

The existing route at `apps/web/src/app/api/admin/crawl/[venueId]/route.ts` handles `POST /api/admin/crawl/:venueId`. The new file at `apps/web/src/app/api/admin/crawl/route.ts` handles `POST /api/admin/crawl`. These are distinct Next.js routes — no conflict.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/api/admin/crawl/route.ts
git commit -m "feat(web): add POST /api/admin/crawl Next.js route for bulk crawl trigger"
```

---

## Task 6: page.tsx — LLM cost breakdown hint + events updated hint + Run all button

**Files:**

- Modify: `apps/web/src/app/(protected)/admin/crawl/page.tsx`
- Modify: `apps/web/src/app/(protected)/admin/crawl/crawl-stats.ts`

Note: This task assumes PR A is already merged. If not, apply these changes on top of the PR A branch.

- [ ] **Step 1: Add formatLlmCostHint to crawl-stats.ts**

In `apps/web/src/app/(protected)/admin/crawl/crawl-stats.ts`, add:

```typescript
/**
 * Returns LLM cost hint, e.g. "2 LLM runs · $0.30 avg".
 * Shows sub-cent precision when cost is > 0 but rounds to $0.00.
 */
export function formatLlmCostHint(
  runs: { llmCostUsd?: number | null }[],
): string {
  const llmRuns = runs.filter((run) => (run.llmCostUsd ?? 0) > 0)
  if (llmRuns.length === 0) return ''
  const total = llmRuns.reduce((sum, run) => sum + (run.llmCostUsd ?? 0), 0)
  const avg = total / llmRuns.length
  return `${llmRuns.length} LLM run${llmRuns.length > 1 ? 's' : ''} · $${avg.toFixed(2)} avg`
}

/**
 * Formats LLM cost value. Shows sub-cent precision when cost rounds to $0.00 but is > 0.
 * e.g. 0.003 → "$0.003" instead of "$0.00"
 */
export function formatCostValue(usd: number): string {
  if (usd === 0) return '$0.00'
  if (usd < 0.01) return `$${usd.toFixed(3)}`
  return `$${usd.toFixed(2)}`
}

/**
 * Returns events ingested breakdown: "N new · N updated"
 */
export function formatEventsBreakdown(
  runs: { eventsInserted: number; eventsUpdated: number }[],
): string {
  const newCount = runs.reduce((sum, run) => sum + run.eventsInserted, 0)
  const updatedCount = runs.reduce((sum, run) => sum + run.eventsUpdated, 0)
  return [
    newCount > 0 ? `${newCount} new` : null,
    updatedCount > 0 ? `${updatedCount} updated` : null,
  ]
    .filter(Boolean)
    .join(' · ')
}
```

- [ ] **Step 2: Write unit tests for the new helpers**

Add to `crawl-stats.test.ts`:

```typescript
import {
  formatLlmCostHint,
  formatCostValue,
  formatEventsBreakdown,
} from './crawl-stats'

describe('formatLlmCostHint', () => {
  it('returns empty string when no LLM runs', () => {
    expect(formatLlmCostHint([{ llmCostUsd: null }, { llmCostUsd: 0 }])).toBe(
      '',
    )
  })

  it('returns hint with count and avg for LLM runs', () => {
    expect(formatLlmCostHint([{ llmCostUsd: 0.3 }, { llmCostUsd: 0.6 }])).toBe(
      '2 LLM runs · $0.45 avg',
    )
  })
})

describe('formatCostValue', () => {
  it('shows $0.00 when cost is exactly zero', () => {
    expect(formatCostValue(0)).toBe('$0.00')
  })

  it('shows 3 decimal places when cost is sub-cent', () => {
    expect(formatCostValue(0.003)).toBe('$0.003')
  })

  it('shows 2 decimal places for normal costs', () => {
    expect(formatCostValue(0.6)).toBe('$0.60')
  })
})

describe('formatEventsBreakdown', () => {
  it('returns empty string when both counts are zero', () => {
    expect(
      formatEventsBreakdown([{ eventsInserted: 0, eventsUpdated: 0 }]),
    ).toBe('')
  })

  it('returns full breakdown when both are non-zero', () => {
    expect(
      formatEventsBreakdown([{ eventsInserted: 11, eventsUpdated: 41 }]),
    ).toBe('11 new · 41 updated')
  })

  it('returns only new when updated is zero', () => {
    expect(
      formatEventsBreakdown([{ eventsInserted: 5, eventsUpdated: 0 }]),
    ).toBe('5 new')
  })
})
```

- [ ] **Step 3: Run tests to confirm they pass**

```bash
pnpm --filter @concert-crawl/web test --run crawl-stats
```

Expected: all tests pass.

- [ ] **Step 4: Update page.tsx to use the new helpers and wire Run all**

In `page.tsx`, update the stat card section and add "Run all" button state:

```typescript
import { formatSweepHint, formatRunsBreakdown, formatLlmCostHint, formatCostValue, formatEventsBreakdown } from './crawl-stats'

// In the component body:
const llmCostTotal = todayRuns.reduce((sum, run) => sum + (run.llmCostUsd ?? 0), 0)
const llmCostHint = formatLlmCostHint(todayRuns)
const eventsBreakdown = formatEventsBreakdown(
  todayRuns.map((run) => ({
    eventsInserted: run.eventsInserted,
    eventsUpdated: run.eventsUpdated ?? 0,
  })),
)

// Update the stat cards:
<StatCard
  label="Events ingested"
  value={String(todayRuns.reduce((sum, run) => sum + run.eventsInserted, 0))}
  hint={eventsBreakdown || 'today'}
  iconName="CheckSquare"
  kind="success"
/>
<StatCard
  label="LLM cost · today"
  value={formatCostValue(llmCostTotal)}
  hint={llmCostHint || undefined}
  iconName="DollarSign"
  kind="signal"
/>
```

Pass `onRunAll` callback to `CrawlSplitView`:

```typescript
<CrawlSplitView
  initialStatus={status}
  initialRuns={runs}
  {...(initialVenueId !== undefined && { initialSelectedId: initialVenueId })}
/>
```

Note: the Run all button state lives in `CrawlSplitView` since it's a client component. Add `onRunAll` via a `useRunAll` hook or manage it directly in `CrawlSplitView`.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/(protected)/admin/crawl/
git commit -m "feat(web): LLM cost breakdown, events updated breakdown, sub-cent cost display"
```

---

## Task 7: CrawlSplitView — Run all button with feedback

**Files:**

- Modify: `apps/web/src/components/admin/crawl/CrawlSplitView.tsx`

The "Run all" button is currently in `page.tsx`'s SectionHead (server component) with no handler. Move it to `CrawlSplitView` or add it as a client component rendered alongside the page title.

For simplicity: remove the button from `page.tsx`'s header and re-add it inside `CrawlSplitView`'s render — above the split layout, in a header bar.

- [ ] **Step 1: Add Run all state to CrawlSplitView**

```typescript
type RunAllState = 'idle' | 'triggering' | 'queued' | 'error'
const [runAllState, setRunAllState] = useState<RunAllState>('idle')
const [runAllError, setRunAllError] = useState<string | null>(null)
const [runAllCount, setRunAllCount] = useState<number>(0)

async function handleRunAll() {
  setRunAllState('triggering')
  setRunAllError(null)
  try {
    const res = await fetch('/api/admin/crawl', { method: 'POST' })
    if (!res.ok) {
      const rawBody: unknown = await res.json().catch(() => ({}))
      throw new Error(extractErrorMessage(rawBody, `HTTP ${res.status}`))
    }
    const body = (await res.json()) as {
      success: boolean
      data: { count: number }
    }
    setRunAllCount(body.success ? body.data.count : 0)
    setRunAllState('queued')
  } catch (err) {
    setRunAllState('error')
    setRunAllError(
      err instanceof Error ? err.message : 'Failed to trigger all crawls',
    )
  }
}
```

- [ ] **Step 2: Add Run all button above the split view layout**

In the `CrawlSplitView` return, add a header row above the main split div:

```typescript
return (
  <>
    {/* Page-level header with Run all */}
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, marginBottom: -8 }}>
      {runAllState === 'queued' && (
        <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
          {runAllCount} crawl{runAllCount !== 1 ? 's' : ''} queued
        </span>
      )}
      {runAllState === 'error' && runAllError && (
        <span style={{ fontSize: 12, color: 'var(--danger)' }}>{runAllError}</span>
      )}
      <button
        onClick={handleRunAll}
        disabled={runAllState === 'triggering' || runAllState === 'queued'}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          height: 32,
          padding: '0 12px',
          borderRadius: 8,
          fontSize: 13,
          fontWeight: 500,
          border: '1px solid var(--border)',
          background: 'transparent',
          color:
            runAllState === 'triggering' || runAllState === 'queued'
              ? 'var(--fg-subtle)'
              : 'var(--fg)',
          cursor:
            runAllState === 'triggering' || runAllState === 'queued'
              ? 'not-allowed'
              : 'pointer',
        }}
      >
        ↻{' '}
        {runAllState === 'triggering'
          ? 'Triggering…'
          : runAllState === 'queued'
            ? `Running (${runAllCount})`
            : 'Run all'}
      </button>
    </div>

    <div style={{ display: 'flex', gap: 16, flex: 1, minHeight: 0 }}>
      {/* ... existing left + right layout ... */}
    </div>
  </>
)
```

- [ ] **Step 3: Remove the Run all button from page.tsx SectionHead**

In `page.tsx`, remove the `SectionHead` import if it's no longer needed, or keep it for the page title and remove only the `actions` prop.

Replace the `SectionHead` block with the plain title/description div already written in PR A's page.tsx.

- [ ] **Step 4: Run typecheck and tests**

```bash
pnpm --filter @concert-crawl/web typecheck
pnpm --filter @concert-crawl/api test --run
pnpm --filter @concert-crawl/web test --run
pnpm lint
```

Expected: 0 errors, all tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/admin/crawl/CrawlSplitView.tsx apps/web/src/app/(protected)/admin/crawl/page.tsx
git commit -m "feat(web): Run all button with triggering/queued feedback in CrawlSplitView"
```

---

## Self-review checklist

- [x] #156 LLM cost not stored — Task 1 (DB column), Task 2 (crawler writes it), Task 3 (API selects it), Task 6 (UI shows it with sub-cent precision)
- [x] #155 Events ingested breakdown — Task 1 (eventsUpdated DB column), Task 2 (crawler writes it), Task 4 (CrawlRun type), Task 6 (UI breakdown hint)
- [x] #150 Run all button — Task 3 (API bulk endpoint), Task 5 (Next.js proxy route), Task 7 (frontend button with feedback)
- [ ] Migration timestamp must be higher than all existing migrations — verify in Task 1 Step 1
- [ ] Crawler code discovery needed in Task 2 — exact files TBD by grep
- [ ] `and` must be imported in crawl.ts for the bulk endpoint WHERE clause
- [ ] PR B depends on PR A's `crawl-stats.ts` module — merge PR A first, or cherry-pick the file
