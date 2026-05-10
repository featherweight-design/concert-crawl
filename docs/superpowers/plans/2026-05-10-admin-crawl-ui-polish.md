# Admin Crawl UI Polish — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the admin Crawl Status page in line with the design mocks (Images #1/#2), fixing layout, stat detail lines, venue list precision, run detail panel, selectable runs, venue/status filtering, and Re-crawl button feedback.

**Architecture:** All changes are frontend-only plus a small API additive select (websiteUrl, durationMs, consecutiveFailures, blockedAt in the status endpoint). No DB migrations needed. All filter logic is client-side in CrawlSplitView.

**Tech Stack:** Next.js 14 App Router, React client components, Hono API, Vitest (mocked unit tests for helpers, API tests for route changes), Intl.DateTimeFormat for MT formatting.

**Closes:** #148 #151 #152 #153 #157 #158 #159 #160 #161 #163

---

## File map

| File                                                           | Change                                                                                           |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `apps/api/src/routes/admin/crawl.ts`                           | Add `websiteUrl`, `durationMs`, `consecutiveFailures`, `blockedAt` to status endpoint SELECT     |
| `apps/api/src/routes/admin/crawl.test.ts`                      | Update status test mock to include new fields                                                    |
| `apps/web/src/app/(protected)/admin/crawl/page.tsx`            | Remove eyebrow; extend `CrawlStatusRow` + `RawVenueStatus`; compute stat hints                   |
| `apps/web/src/app/(protected)/admin/crawl/crawl-stats.test.ts` | New — unit tests for stat helper functions                                                       |
| `apps/web/src/components/admin/primitives/StatCard.tsx`        | Uppercase + letter-spaced labels                                                                 |
| `apps/web/src/components/admin/crawl/IssuesBanner.tsx`         | Redesign with detailed text and "Jump to issues" scroll                                          |
| `apps/web/src/components/admin/crawl/CrawlSplitView.tsx`       | Venue list filter, exact timestamps, selectable runs, run detail redesign, Re-crawl queued state |

---

## Task 1: API — extend status endpoint with venue fields

**Files:**

- Modify: `apps/api/src/routes/admin/crawl.ts`
- Modify: `apps/api/src/routes/admin/crawl.test.ts`

- [ ] **Step 1: Update the status endpoint SELECT to include websiteUrl, durationMs, consecutiveFailures, blockedAt**

In `apps/api/src/routes/admin/crawl.ts`, replace the `venueList` select inside `GET /status`:

```typescript
// OLD
const venueList = await db
  .select({
    id: venues.id,
    name: venues.name,
    active: venues.active,
    verified: venues.verified,
    consecutiveFailures: venues.consecutiveFailures,
    blockedAt: venues.blockedAt,
    lastCrawledAt: venues.lastCrawledAt,
  })
  .from(venues)
  .orderBy(asc(venues.name))

// NEW
const venueList = await db
  .select({
    id: venues.id,
    name: venues.name,
    websiteUrl: venues.websiteUrl,
    active: venues.active,
    verified: venues.verified,
    consecutiveFailures: venues.consecutiveFailures,
    blockedAt: venues.blockedAt,
    lastCrawledAt: venues.lastCrawledAt,
  })
  .from(venues)
  .orderBy(asc(venues.name))
```

Also add `durationMs` and `httpStatusCode` to the `latestRuns` selectDistinctOn:

```typescript
// OLD latestRuns select (lines ~152-165)
const latestRuns =
  venueIds.length > 0
    ? await db
        .selectDistinctOn([crawlRuns.venueId], {
          id: crawlRuns.id,
          venueId: crawlRuns.venueId,
          status: crawlRuns.status,
          createdAt: crawlRuns.createdAt,
          eventsFound: crawlRuns.eventsFound,
          eventsInserted: crawlRuns.eventsInserted,
          errorMessage: crawlRuns.errorMessage,
          extractionStrategyUsed: crawlRuns.extractionStrategyUsed,
        })

// NEW
const latestRuns =
  venueIds.length > 0
    ? await db
        .selectDistinctOn([crawlRuns.venueId], {
          id: crawlRuns.id,
          venueId: crawlRuns.venueId,
          status: crawlRuns.status,
          createdAt: crawlRuns.createdAt,
          eventsFound: crawlRuns.eventsFound,
          eventsInserted: crawlRuns.eventsInserted,
          errorMessage: crawlRuns.errorMessage,
          extractionStrategyUsed: crawlRuns.extractionStrategyUsed,
          httpStatusCode: crawlRuns.httpStatusCode,
          durationMs: crawlRuns.durationMs,
        })
```

- [ ] **Step 2: Update the status test mock to include the new fields**

In `apps/api/src/routes/admin/crawl.test.ts`, find the `GET /v1/admin/crawl/status` test block (around line 316). Update the mock venue object returned by `db.select().from().orderBy`:

```typescript
// In the 'returns 200 with venue crawl status list' test, update the first mockResolvedValueOnce:
vi.mocked(db.select().from().orderBy)
  .mockResolvedValueOnce([
    {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Ogden Theatre',
      websiteUrl: 'https://www.ogdentheatre.com',
      active: true,
      verified: true,
      consecutiveFailures: 0,
      blockedAt: null,
      lastCrawledAt: new Date('2026-05-07T10:00:00Z'),
    },
  ])
  .mockResolvedValueOnce([])
```

- [ ] **Step 3: Run the API tests to verify they pass**

```bash
cd /path/to/worktree
pnpm --filter @concert-crawl/api test --run
```

Expected: all tests pass (the status test assertions only check `body.success === true` and `Array.isArray(body.data)`, so adding fields won't break them).

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/routes/admin/crawl.ts apps/api/src/routes/admin/crawl.test.ts
git commit -m "fix(api): add websiteUrl, httpStatusCode, durationMs to crawl status endpoint"
```

---

## Task 2: page.tsx — remove eyebrow, extend CrawlStatusRow, compute stat hints

**Files:**

- Modify: `apps/web/src/app/(protected)/admin/crawl/page.tsx`
- Create: `apps/web/src/app/(protected)/admin/crawl/crawl-stats.test.ts`

- [ ] **Step 1: Write failing unit tests for the two new stat helper functions**

Create `apps/web/src/app/(protected)/admin/crawl/crawl-stats.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { formatSweepHint, formatRunsBreakdown } from './crawl-stats'

describe('formatSweepHint', () => {
  it('returns empty string when no runs provided', () => {
    expect(formatSweepHint([])).toBe('')
  })

  it('returns a date + time range string when runs are present', () => {
    // All runs on the same day, ordered desc by createdAt
    const runs = [
      { createdAt: '2026-05-07T19:42:00Z' }, // 12:42 MT (UTC-7)
      { createdAt: '2026-05-07T19:14:00Z' }, // 12:14 MT
    ] as { createdAt: string }[]
    const hint = formatSweepHint(runs)
    // Should contain "May 7" and two times separated by "–"
    expect(hint).toMatch(/May 7/)
    expect(hint).toContain('–')
    expect(hint).toContain('12:42')
    expect(hint).toContain('12:14')
  })

  it('returns just the time (no range) when only one run', () => {
    const runs = [{ createdAt: '2026-05-07T19:42:00Z' }] as {
      createdAt: string
    }[]
    const hint = formatSweepHint(runs)
    expect(hint).toMatch(/May 7/)
    // No dash range when only one run
    expect(hint).not.toContain('–')
  })
})

describe('formatRunsBreakdown', () => {
  it('returns empty string when no runs', () => {
    expect(formatRunsBreakdown([])).toBe('')
  })

  it('formats counts for all statuses present', () => {
    const runs = [
      { status: 'success' },
      { status: 'success' },
      { status: 'partial' },
      { status: 'failed' },
    ] as { status: string }[]
    expect(formatRunsBreakdown(runs)).toBe('2 ok · 1 partial · 1 failed')
  })

  it('omits zero-count statuses', () => {
    const runs = [{ status: 'success' }, { status: 'success' }] as {
      status: string
    }[]
    expect(formatRunsBreakdown(runs)).toBe('2 ok')
  })
})
```

- [ ] **Step 2: Run the tests to confirm they fail**

```bash
pnpm --filter @concert-crawl/web test --run crawl-stats
```

Expected: FAIL — `crawl-stats` module not found.

- [ ] **Step 3: Create the crawl-stats.ts helper module**

Create `apps/web/src/app/(protected)/admin/crawl/crawl-stats.ts`:

```typescript
const MT_TIMEZONE = 'America/Denver'

/**
 * Given a list of runs ordered newest-first, returns a hint string
 * showing the sweep date and time range, e.g. "May 7 · 12:14–12:42".
 * Uses the first run as sweep end and the last as sweep start.
 */
export function formatSweepHint(runs: { createdAt: string }[]): string {
  if (runs.length === 0) return ''

  const endDate = new Date(runs[0].createdAt)
  const startDate = new Date(runs[runs.length - 1].createdAt)

  const dateStr = endDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: MT_TIMEZONE,
  })

  const fmtTime = (date: Date) =>
    date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: MT_TIMEZONE,
    })

  if (runs.length === 1) return `${dateStr} · ${fmtTime(endDate)}`
  return `${dateStr} · ${fmtTime(startDate)}–${fmtTime(endDate)}`
}

/**
 * Given today's runs, returns a breakdown string e.g. "20 ok · 1 partial · 2 failed · 1 blocked".
 * Only includes statuses with at least one run.
 */
export function formatRunsBreakdown(runs: { status: string }[]): string {
  if (runs.length === 0) return ''

  const counts: Record<string, number> = {}
  for (const run of runs) {
    counts[run.status] = (counts[run.status] ?? 0) + 1
  }

  return [
    counts['success'] ? `${counts['success']} ok` : null,
    counts['partial'] ? `${counts['partial']} partial` : null,
    counts['failed'] ? `${counts['failed']} failed` : null,
    counts['blocked'] ? `${counts['blocked']} blocked` : null,
  ]
    .filter(Boolean)
    .join(' · ')
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
pnpm --filter @concert-crawl/web test --run crawl-stats
```

Expected: all 6 tests pass.

- [ ] **Step 5: Rewrite page.tsx with all the changes**

Replace the full contents of `apps/web/src/app/(protected)/admin/crawl/page.tsx`:

```typescript
import { auth, requireAdminUser } from '@/lib/auth'
import { apiClient } from '@/lib/api'
import { StatCard } from '@/components/admin/primitives'
import { CrawlSplitView } from '@/components/admin/crawl/CrawlSplitView'
import { IssuesBanner } from '@/components/admin/crawl/IssuesBanner'
import { formatSweepHint, formatRunsBreakdown } from './crawl-stats'
import type { CrawlRun } from '@concert-crawl/types'

export interface CrawlStatusRow {
  venueId: string
  venueName: string
  websiteUrl: string
  status: string
  lastRunAt: string | null
  eventsFound: number
  durationMs: number | null
  httpStatusCode: number | null
  consecutiveFailures: number
  blockedAt: string | null
  strategy: string
  cost: number
  error: string | null
}

interface RawVenueStatus {
  id: string
  name: string
  websiteUrl: string
  active: boolean
  verified: boolean
  consecutiveFailures: number
  blockedAt: string | null
  lastCrawledAt: string | null
  lastRun: {
    id: string
    venueId: string
    status: string
    createdAt: string
    eventsFound: number
    eventsInserted: number
    errorMessage: string | null
    extractionStrategyUsed: string | null
    httpStatusCode: number | null
    durationMs: number | null
  } | null
}

function toStatusRow(venue: RawVenueStatus): CrawlStatusRow {
  return {
    venueId: venue.id,
    venueName: venue.name,
    websiteUrl: venue.websiteUrl,
    status: venue.lastRun?.status ?? 'never',
    lastRunAt: venue.lastRun?.createdAt ?? null,
    eventsFound: venue.lastRun?.eventsFound ?? 0,
    durationMs: venue.lastRun?.durationMs ?? null,
    httpStatusCode: venue.lastRun?.httpStatusCode ?? null,
    consecutiveFailures: venue.consecutiveFailures,
    blockedAt: venue.blockedAt,
    strategy: venue.lastRun?.extractionStrategyUsed ?? '—',
    cost: 0,
    error: venue.lastRun?.errorMessage ?? null,
  }
}

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function AdminCrawlPage({ searchParams }: Props) {
  await requireAdminUser()
  const { getToken } = await auth()
  const token = await getToken()
  if (!token) return null

  const resolvedParams = await searchParams
  const rawVenueId = resolvedParams.venueId
  const initialVenueId =
    (Array.isArray(rawVenueId) ? rawVenueId[0] : rawVenueId) || undefined

  const [rawStatus, runs] = await Promise.all([
    apiClient.get<RawVenueStatus[]>('/v1/admin/crawl/status', token),
    apiClient.get<CrawlRun[]>('/v1/admin/crawl/runs?limit=50', token),
  ])
  const status = rawStatus.map(toStatusRow)
  const todayStr = new Date().toDateString()
  const todayRuns = runs.filter(
    (run) => new Date(run.createdAt).toDateString() === todayStr,
  )

  const sweepHint = formatSweepHint(runs.slice(0, 50))
  const runsBreakdown = formatRunsBreakdown(todayRuns)

  const lastRunRelative = runs[0]?.createdAt
    ? `${String(Math.round((Date.now() - new Date(runs[0].createdAt).getTime()) / 60000))}m ago`
    : '—'

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
        height: '100%',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: 'var(--fg)',
              margin: 0,
            }}
          >
            Crawl status
          </h1>
          <p
            style={{
              fontSize: 13,
              color: 'var(--fg-muted)',
              margin: '4px 0 0',
            }}
          >
            Every venue crawl, run by run. The dataset is only as fresh as this
            page.
          </p>
        </div>
      </div>

      <IssuesBanner
        blockedVenues={status.filter(
          (row) => row.status === 'blocked' || row.status === 'failed',
        )}
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 16,
        }}
      >
        <StatCard
          label="Last sweep"
          value={lastRunRelative}
          hint={sweepHint || undefined}
          iconName="RefreshCw"
          kind="neutral"
        />
        <StatCard
          label="Today's runs"
          value={String(todayRuns.length)}
          hint={runsBreakdown || undefined}
          iconName="Activity"
          kind="signal"
        />
        <StatCard
          label="Events ingested"
          value={String(
            todayRuns.reduce((sum, run) => sum + run.eventsInserted, 0),
          )}
          hint="today"
          iconName="CheckSquare"
          kind="success"
        />
        <StatCard
          label="LLM cost · today"
          value={`$${todayRuns.reduce((sum, run) => sum + (run.llmCostUsd ?? 0), 0).toFixed(2)}`}
          iconName="DollarSign"
          kind="signal"
        />
      </div>

      <CrawlSplitView
        initialStatus={status}
        initialRuns={runs}
        {...(initialVenueId !== undefined && {
          initialSelectedId: initialVenueId,
        })}
      />
    </div>
  )
}
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/(protected)/admin/crawl/
git commit -m "fix(web): remove phase eyebrow, extend CrawlStatusRow, add sweep/run-breakdown hints"
```

---

## Task 3: StatCard — uppercase labels

**Files:**

- Modify: `apps/web/src/components/admin/primitives/StatCard.tsx`

- [ ] **Step 1: Add textTransform and letterSpacing to the label div**

In `apps/web/src/components/admin/primitives/StatCard.tsx`, find the label div (currently line ~62–69). Replace its style:

```typescript
// OLD
<div
  style={{
    fontSize: 12,
    fontWeight: 500,
    color: 'var(--fg-muted)',
    marginBottom: 6,
  }}
>
  {label}
</div>

// NEW
<div
  style={{
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--fg-muted)',
    marginBottom: 6,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.07em',
  }}
>
  {label}
</div>
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/admin/primitives/StatCard.tsx
git commit -m "fix(web): uppercase + letter-spaced StatCard labels to match design"
```

---

## Task 4: IssuesBanner redesign

**Files:**

- Modify: `apps/web/src/components/admin/crawl/IssuesBanner.tsx`

The design shows:

- A banner icon (warning) on the left
- Headline: "N venue blocked · N venue paused due to robots.txt"
- Sub-line: venue names with context (e.g. "Red Rocks (3rd consecutive 403)")
- "Jump to issues ›" link on the right that scrolls to the first problematic venue in the list

The `IssuesBanner` receives `blockedVenues: Array<{ venueId: string; venueName: string; status: string }>`. Add `consecutiveFailures` and `blockedAt` to make the sub-line richer.

- [ ] **Step 1: Update the IssuesBanner props type and page.tsx to pass new fields**

First, update the Props interface in `IssuesBanner.tsx`:

```typescript
interface BlockedVenueInfo {
  venueId: string
  venueName: string
  status: string
  consecutiveFailures: number
  blockedAt: string | null
}

interface Props {
  blockedVenues: BlockedVenueInfo[]
}
```

In `page.tsx`, the `status.filter(...)` call already passes full `CrawlStatusRow` objects (which now include `consecutiveFailures` and `blockedAt`), so no change needed there — TypeScript will check the shape.

- [ ] **Step 2: Rewrite IssuesBanner.tsx**

```typescript
interface BlockedVenueInfo {
  venueId: string
  venueName: string
  status: string
  consecutiveFailures: number
  blockedAt: string | null
}

interface Props {
  blockedVenues: BlockedVenueInfo[]
}

function venueLabel(venue: BlockedVenueInfo): string {
  if (venue.status === 'blocked') {
    return `${venue.venueName} (${venue.consecutiveFailures}rd consecutive 403)`
  }
  return `${venue.venueName} (disallowed)`
}

export function IssuesBanner({ blockedVenues }: Props) {
  if (blockedVenues.length === 0) return null

  const blocked = blockedVenues.filter((venue) => venue.status === 'blocked')
  const failed = blockedVenues.filter((venue) => venue.status === 'failed')

  const headline = [
    blocked.length > 0
      ? `${blocked.length} venue${blocked.length > 1 ? 's' : ''} blocked`
      : null,
    failed.length > 0
      ? `${failed.length} venue${failed.length > 1 ? 's' : ''} paused due to robots.txt`
      : null,
  ]
    .filter(Boolean)
    .join(' · ')

  const subLine = blockedVenues.map(venueLabel).join(' · ')

  function handleJump() {
    const firstId = blockedVenues[0]?.venueId
    if (!firstId) return
    const el = document.getElementById(`venue-row-${firstId}`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 16px',
        borderRadius: 10,
        background: 'rgba(184,56,26,0.08)',
        border: '1px solid rgba(184,56,26,0.25)',
      }}
    >
      <span
        style={{
          fontSize: 16,
          flexShrink: 0,
          color: 'var(--danger)',
        }}
        aria-hidden
      >
        ⚠
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{ fontSize: 13, fontWeight: 600, color: 'var(--danger)' }}
        >
          {headline}
        </div>
        {subLine && (
          <div
            style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 2 }}
          >
            {subLine}
          </div>
        )}
      </div>
      <button
        onClick={handleJump}
        style={{
          fontSize: 12,
          fontWeight: 500,
          color: 'var(--fg-muted)',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          flexShrink: 0,
          padding: '2px 4px',
        }}
      >
        Jump to issues ›
      </button>
    </div>
  )
}
```

Note: `IssuesBanner` must be `'use client'` because it uses `handleJump` with `document`. Add `'use client'` at the top.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/admin/crawl/IssuesBanner.tsx
git commit -m "fix(web): redesign IssuesBanner with breakdown text and Jump to issues link"
```

---

## Task 5: CrawlSplitView — venue list filter

**Files:**

- Modify: `apps/web/src/components/admin/crawl/CrawlSplitView.tsx`

- [ ] **Step 1: Add statusFilter state and filter UI above the venue list**

In `CrawlSplitView.tsx`, add filter state and the filtered list computation after the existing state declarations:

```typescript
const STATUS_FILTER_OPTIONS = [
  { value: null, label: 'All venues' },
  { value: 'failed', label: 'Failed' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'partial', label: 'Partial' },
  { value: 'success', label: 'Success' },
  { value: 'never', label: 'Never crawled' },
] as const

// Add this state after existing useState declarations:
const [statusFilter, setStatusFilter] = useState<string | null>(null)
const [filterOpen, setFilterOpen] = useState(false)

const filteredStatus = statusFilter
  ? initialStatus.filter((row) => row.status === statusFilter)
  : initialStatus
```

Replace all references to `initialStatus` in the venue list render with `filteredStatus`.

- [ ] **Step 2: Update the venue list header to include venue count and Filter button**

Replace the left-rail header div:

```typescript
// OLD
<div
  style={{
    padding: '10px 14px',
    borderBottom: '1px solid var(--border)',
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--fg-muted)',
  }}
>
  {initialStatus.length} venues
</div>

// NEW
<div
  style={{
    padding: '10px 14px',
    borderBottom: '1px solid var(--border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  }}
>
  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-muted)' }}>
    Latest run · per venue {initialStatus.length}
  </span>
  <div style={{ position: 'relative' }}>
    <button
      onClick={() => setFilterOpen((prev) => !prev)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 12,
        fontWeight: 500,
        color: statusFilter ? 'var(--fg)' : 'var(--fg-muted)',
        background: 'none',
        border: '1px solid var(--border)',
        borderRadius: 6,
        padding: '3px 8px',
        cursor: 'pointer',
      }}
    >
      ⊘ {statusFilter ?? 'Filter'}
    </button>
    {filterOpen && (
      <div
        style={{
          position: 'absolute',
          right: 0,
          top: '100%',
          marginTop: 4,
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
          zIndex: 10,
          minWidth: 140,
          overflow: 'hidden',
        }}
      >
        {STATUS_FILTER_OPTIONS.map((opt) => (
          <button
            key={String(opt.value)}
            onClick={() => {
              setStatusFilter(opt.value)
              setFilterOpen(false)
            }}
            style={{
              display: 'block',
              width: '100%',
              padding: '8px 12px',
              textAlign: 'left',
              fontSize: 12,
              background:
                statusFilter === opt.value ? 'var(--surface-2)' : 'transparent',
              color: 'var(--fg)',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>
    )}
  </div>
</div>
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/admin/crawl/CrawlSplitView.tsx
git commit -m "fix(web): add status filter to venue list in CrawlSplitView"
```

---

## Task 6: CrawlSplitView — exact timestamps and duration in venue list rows

The venue row sub-line currently shows `<RelTime iso={row.lastRunAt} /> · {row.eventsFound} ev`.
Design requires: `12:42:08 · 0.8s · 0 ev` (exact HH:MM:SS MT time + duration).

**Files:**

- Modify: `apps/web/src/components/admin/crawl/CrawlSplitView.tsx`

- [ ] **Step 1: Add time formatting helpers at the top of CrawlSplitView.tsx**

Add after the imports:

```typescript
const MT_TIMEZONE = 'America/Denver'

function fmtTimeMT(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: MT_TIMEZONE,
  })
}

function fmtDuration(ms: number | null): string | null {
  if (ms === null) return null
  return `${(ms / 1000).toFixed(1)}s`
}
```

- [ ] **Step 2: Update the venue row sub-line**

Find the venue sub-line (currently using `<RelTime>`). Replace:

```typescript
// OLD
<div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
  {row.lastRunAt ? <RelTime iso={row.lastRunAt} /> : 'never'} ·{' '}
  {row.eventsFound} ev
</div>

// NEW
<div style={{ fontSize: 12, color: 'var(--fg-muted)', fontVariantNumeric: 'tabular-nums' }}>
  {row.lastRunAt ? fmtTimeMT(row.lastRunAt) : 'never'}
  {fmtDuration(row.durationMs) ? ` · ${fmtDuration(row.durationMs)}` : ''}
  {' · '}{row.eventsFound} ev
</div>
```

- [ ] **Step 3: Add `id` to each venue row button for Jump-to-issues scroll target**

Add `id={`venue-row-${row.venueId}`}` to each venue `<button>` element.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/admin/crawl/CrawlSplitView.tsx
git commit -m "fix(web): show exact MT timestamps and duration in venue list rows"
```

---

## Task 7: CrawlSplitView — selectable past runs

The run history table rows are currently non-interactive. The user should be able to click a past run to promote it to the detail section.

**Files:**

- Modify: `apps/web/src/components/admin/crawl/CrawlSplitView.tsx`

- [ ] **Step 1: Add selectedRunId state**

Add a second state for the selected run ID. When a venue is selected, reset to the most recent run (null = auto = first):

```typescript
const [selectedRunId, setSelectedRunId] = useState<string | null>(null)

// When venue selection changes, clear the run selection
// (wrap the existing setSelectedId call)
function handleSelectVenue(venueId: string) {
  setSelectedId(venueId)
  setSelectedRunId(null)
}
```

Update all `onClick={() => setSelectedId(row.venueId)}` calls to `onClick={() => handleSelectVenue(row.venueId)}`.

- [ ] **Step 2: Derive the active run from selectedRunId**

Replace the current `selectedRuns` derivation:

```typescript
// OLD
const selected = initialStatus.find((row) => row.venueId === selectedId)
const selectedRuns = initialRuns.filter((run) => run.venueId === selectedId)

// NEW
const selected = initialStatus.find((row) => row.venueId === selectedId)
const selectedRuns = initialRuns.filter((run) => run.venueId === selectedId)
const activeRun = selectedRunId
  ? (selectedRuns.find((run) => run.id === selectedRunId) ?? selectedRuns[0])
  : selectedRuns[0]
```

- [ ] **Step 3: Make history table rows clickable**

Replace `<TR key={run.id}>` with an interactive row:

```typescript
<TR
  key={run.id}
  onClick={() => setSelectedRunId(run.id)}
  style={{
    cursor: 'pointer',
    background: run.id === activeRun?.id ? 'var(--surface-2)' : undefined,
  }}
>
```

Note: `TR` may need a `style` and `onClick` prop. Check `TR` component signature in `apps/web/src/components/admin/primitives/`. If `TR` doesn't accept these, wrap with a `<tr>` that does, or add the props to `TR`.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/admin/crawl/CrawlSplitView.tsx
git commit -m "fix(web): make run history rows clickable to select a past run"
```

---

## Task 8: CrawlSplitView — run detail panel redesign

The right panel needs: Run ID badge, status badge, Source URL button, STARTED/DURATION/HTTP/LLM COST stats grid, redesigned error section.

**Files:**

- Modify: `apps/web/src/components/admin/crawl/CrawlSplitView.tsx`

- [ ] **Step 1: Add a time formatter for STARTED**

Add helper:

```typescript
function fmtStarted(iso: string): string {
  const date = new Date(iso)
  const today = new Date()
  const isSameDay =
    date.toLocaleDateString('en-US', { timeZone: MT_TIMEZONE }) ===
    today.toLocaleDateString('en-US', { timeZone: MT_TIMEZONE })

  const timeStr = date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: MT_TIMEZONE,
  })

  if (isSameDay) return `Today, ${timeStr}`

  const dateStr = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: MT_TIMEZONE,
  })
  return `${dateStr}, ${timeStr}`
}

function runIdLabel(id: string): string {
  return `R-${id.slice(0, 8)}`
}
```

- [ ] **Step 2: Rewrite the Panel title area and stats grid**

Replace the entire `<Panel title={selected.venueName} action={...}>` block. The panel now shows:

1. Above the Panel: run ID badge + status badge row
2. Panel title: venue name
3. Panel action: Source URL button + Re-crawl button
4. Stats grid: STARTED, DURATION, HTTP, LLM COST (4 columns)
5. EVENTS section: found, created, updated (3 columns)
6. ERROR section (if error): redesigned with title + detail lines

```typescript
{selected ? (
  <>
    {/* Run ID + status row above panel */}
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingLeft: 2 }}>
      {activeRun && (
        <>
          <span style={{ fontSize: 12, color: 'var(--fg-muted)', fontFamily: 'monospace' }}>
            {runIdLabel(activeRun.id)}
          </span>
          <span style={{ color: 'var(--border)' }}>·</span>
        </>
      )}
      <StatusBadge kind={STATUS_KIND[selected.status] ?? 'neutral'} dot>
        {selected.status}
      </StatusBadge>
    </div>

    <Panel
      title={selected.venueName}
      action={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <a
            href={selected.websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              height: 28,
              padding: '0 10px',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 500,
              border: '1px solid var(--border)',
              color: 'var(--fg-muted)',
              textDecoration: 'none',
            }}
          >
            ↗ Source URL
          </a>
          <button
            onClick={() => handleTrigger(selected.venueId)}
            disabled={recrawlState[selected.venueId] === 'triggering' || recrawlState[selected.venueId] === 'queued'}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              height: 28,
              padding: '0 10px',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 500,
              border: '1px solid var(--border-strong)',
              background:
                recrawlState[selected.venueId] === 'queued'
                  ? 'var(--surface-2)'
                  : 'var(--signal)',
              color:
                recrawlState[selected.venueId] === 'triggering' ||
                recrawlState[selected.venueId] === 'queued'
                  ? 'var(--fg-subtle)'
                  : '#fff',
              cursor:
                recrawlState[selected.venueId] === 'triggering' ||
                recrawlState[selected.venueId] === 'queued'
                  ? 'not-allowed'
                  : 'pointer',
            }}
          >
            {recrawlState[selected.venueId] === 'triggering'
              ? 'Triggering…'
              : recrawlState[selected.venueId] === 'queued'
                ? 'Queued'
                : 'Re-crawl'}
          </button>
        </div>
      }
    >
      {/* STARTED / DURATION / HTTP / LLM COST */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        {[
          {
            label: 'Started',
            value: activeRun
              ? fmtStarted(activeRun.startedAt ?? activeRun.createdAt)
              : '—',
          },
          {
            label: 'Duration',
            value: activeRun?.durationMs
              ? `${(activeRun.durationMs / 1000).toFixed(1)}s`
              : '—',
          },
          {
            label: 'HTTP',
            value: activeRun?.httpStatusCode
              ? String(activeRun.httpStatusCode)
              : '—',
            danger: activeRun?.httpStatusCode
              ? activeRun.httpStatusCode >= 400
              : false,
          },
          {
            label: 'LLM cost',
            value: `$${(activeRun?.llmCostUsd ?? 0).toFixed(2)}`,
          },
        ].map((stat) => (
          <div key={stat.label}>
            <div style={{ fontSize: 11, color: 'var(--fg-subtle)', marginBottom: 4, textTransform: 'uppercase' as const, letterSpacing: '0.07em' }}>
              {stat.label}
            </div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: 'danger' in stat && stat.danger ? 'var(--danger)' : 'var(--fg)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* EVENTS section */}
      <div style={{ marginTop: 20 }}>
        <div style={{ fontSize: 11, color: 'var(--fg-subtle)', marginBottom: 10, textTransform: 'uppercase' as const, letterSpacing: '0.07em' }}>
          Events
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {[
            { label: 'Found', value: activeRun?.eventsFound ?? selected.eventsFound },
            { label: 'Created', value: activeRun?.eventsInserted ?? 0 },
            { label: 'Updated', value: 0 },
          ].map((ev) => (
            <div
              key={ev.label}
              style={{
                background: 'var(--surface-2)',
                borderRadius: 8,
                padding: '12px 16px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--fg)', fontVariantNumeric: 'tabular-nums' }}>
                {ev.value}
              </div>
              <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 4, textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>
                {ev.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ERROR section */}
      {selected.error && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 11, color: 'var(--fg-subtle)', marginBottom: 8, textTransform: 'uppercase' as const, letterSpacing: '0.07em' }}>
            Error
          </div>
          <div
            style={{
              padding: '12px 14px',
              borderRadius: 8,
              background: 'rgba(184,56,26,0.08)',
              border: '1px solid rgba(184,56,26,0.2)',
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--danger)', marginBottom: 6 }}>
              {activeRun?.httpStatusCode
                ? `HTTP ${activeRun.httpStatusCode} · ${selected.error.split('\n')[0]}`
                : selected.error.split('\n')[0]}
            </div>
            {selected.consecutiveFailures > 0 && (
              <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginBottom: 4 }}>
                Consecutive failures: {selected.consecutiveFailures} · Will pause venue on next failure.
              </div>
            )}
            {selected.error.split('\n').slice(1).map((line, idx) => (
              <div key={idx} style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
                {line}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Re-crawl trigger error */}
      {recrawlState[selected.venueId] === 'error' && triggerError && (
        <div
          style={{
            marginTop: 8,
            padding: '8px 10px',
            borderRadius: 6,
            background: 'rgba(184,56,26,0.08)',
            color: 'var(--danger)',
            fontSize: 12,
          }}
        >
          {triggerError}
        </div>
      )}
    </Panel>

    <Panel title="Run history" padding={0}>
      {/* ... existing history table, updated with clickable rows from Task 7 ... */}
    </Panel>
  </>
) : (
  /* ... empty state ... */
)}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/admin/crawl/CrawlSplitView.tsx
git commit -m "fix(web): redesign run detail panel with Run ID, Source URL, STARTED/DURATION/HTTP grid, redesigned error section"
```

---

## Task 9: CrawlSplitView — Re-crawl persistent "Queued" state

Replace the `triggering: string | null` state with a richer per-venue state map so the "Queued" state persists after the API call resolves.

**Files:**

- Modify: `apps/web/src/components/admin/crawl/CrawlSplitView.tsx`

- [ ] **Step 1: Replace state types**

```typescript
// OLD
const [triggering, setTriggering] = useState<string | null>(null)
const [triggerError, setTriggerError] = useState<string | null>(null)

// NEW
type RecrawlState = 'triggering' | 'queued' | 'error'
const [recrawlState, setRecrawlState] = useState<Record<string, RecrawlState>>(
  {},
)
const [triggerError, setTriggerError] = useState<string | null>(null)
```

- [ ] **Step 2: Update handleTrigger**

```typescript
async function handleTrigger(venueId: string) {
  setRecrawlState((prev) => ({ ...prev, [venueId]: 'triggering' }))
  setTriggerError(null)
  try {
    const res = await fetch(`/api/admin/crawl/${venueId}`, { method: 'POST' })
    if (!res.ok) {
      const rawBody: unknown = await res.json().catch(() => ({}))
      throw new Error(extractErrorMessage(rawBody, `HTTP ${res.status}`))
    }
    // Stay "queued" — indicates the trigger was accepted
    setRecrawlState((prev) => ({ ...prev, [venueId]: 'queued' }))
  } catch (err) {
    setRecrawlState((prev) => ({ ...prev, [venueId]: 'error' }))
    setTriggerError(err instanceof Error ? err.message : 'Crawl trigger failed')
  }
}
```

The button and error display were already updated in Task 8 to use `recrawlState[selected.venueId]`.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/admin/crawl/CrawlSplitView.tsx
git commit -m "fix(web): Re-crawl button persists Queued state after successful trigger"
```

---

## Task 10: Full CrawlSplitView integration — assemble all changes

After tasks 5–9 applied incrementally, verify the component compiles cleanly. Remove `RelTime` import if it's no longer used in the venue list (it may still be needed in the history table).

- [ ] **Step 1: Run typecheck**

```bash
pnpm --filter @concert-crawl/web typecheck
```

Expected: 0 errors.

- [ ] **Step 2: Run all tests**

```bash
pnpm --filter @concert-crawl/api test --run
pnpm --filter @concert-crawl/web test --run
```

Expected: all pass.

- [ ] **Step 3: Run lint**

```bash
pnpm --filter @concert-crawl/web lint
pnpm --filter @concert-crawl/api lint
```

- [ ] **Step 4: Final commit (if any loose files remain)**

```bash
git status
# Stage anything unstaged
git add -p
git commit -m "fix(web): admin crawl UI polish — assemble full CrawlSplitView changes"
```

---

## Self-review checklist

- [x] #148 Remove "Phase 7 · Automation" — handled in Task 2 (eyebrow removed from page.tsx)
- [x] #151 Issues banner redesign + Jump to issues — Task 4
- [x] #152 Last sweep date/time range hint — Task 2 (formatSweepHint)
- [x] #153 Today's runs breakdown hint — Task 2 (formatRunsBreakdown)
- [x] #157 Venue list filter — Task 5
- [x] #158 Stat card uppercase labels — Task 3
- [x] #159 Exact timestamps + duration in venue list — Task 6
- [x] #160 Run detail panel redesign (Run ID, Source URL, HTTP, Duration, error) — Task 8
- [x] #161 Selectable past runs — Task 7
- [x] #163 Re-crawl persistent Queued state — Task 9
- [ ] TR component accepts onClick+style — verify in Task 7 Step 3, add props if needed
- [ ] `CrawlStatusRow` export from page.tsx is imported nowhere else — confirm no circular dep
