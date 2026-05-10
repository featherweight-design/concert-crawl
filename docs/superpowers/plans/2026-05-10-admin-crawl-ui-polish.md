# Admin Crawl UI Polish — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the admin `/admin/crawl` page fully in line with the design spec, closing all remaining gaps from issues #174–#182 (plus related #151, #158, #160) that are not yet addressed by prior commits on this branch.

**Architecture:** All changes are confined to `apps/web`. The three files to touch are `page.tsx`, `CrawlSplitView.tsx`, and `IssuesBanner.tsx`. One new Next.js API route is added for run-all. No DB or Hono API changes needed beyond what prior commits already added.

**Tech Stack:** Next.js 14 App Router, React client components, TypeScript strict, Lucide icons (via `StatCard`), inline styles (project convention for admin), `next/navigation` for client routing.

**Worktree:** `/Users/huey/Projects/concert-crawl/.worktrees/fix-admin-crawl-ui-polish`
**Branch:** `fix/admin-crawl-ui-polish`

---

## Context — what prior commits already addressed

Prior commits on this branch already fixed: #148 (eyebrow), #152 (sweep hint), #153 (runs breakdown), #157 (status filter), #158 (stat card labels), #159 (venue row timestamps), #160 (run detail fields), #161 (selectable runs), #163 (queued state).

**Remaining open issues this plan addresses:**

| Issue | Title                                                                     |
| ----- | ------------------------------------------------------------------------- |
| #174  | Venue list status badges don't match design spec (need dot + capitalized) |
| #175  | BUG: Venue shows "blocked" badge when last run was success                |
| #176  | Run history table not scrollable / no sticky header                       |
| #177  | Venues panel header not sticky                                            |
| #178  | "Run all" button misplaced — should be in page header                     |
| #179  | Venue crawl filter button visual design doesn't match spec                |
| #180  | Right panel cards have gap — should be flush                              |
| #181  | Venue title in detail panel too small                                     |
| #182  | "Started" field shows time only — missing date/day                        |
| #160  | Error section: raw error dump — needs structured display for 403/blocked  |
| #158  | Events Ingested stat card has wrong icon                                  |

---

## File Map

| File                                                     | Action | Purpose                                                                                                                             |
| -------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web/src/app/(protected)/admin/crawl/page.tsx`      | Modify | Add page header with Run all button; fix Events Ingested icon; add `lastRunStatus` to `CrawlStatusRow`                              |
| `apps/web/src/components/admin/crawl/CrawlSplitView.tsx` | Modify | All split-view fixes: badge with dot, sticky header, flush panels, large title, date in Started, scrollable table, structured error |
| `apps/web/src/components/admin/crawl/IssuesBanner.tsx`   | Modify | Wire Jump to issues via router.push to select blocked venue                                                                         |
| `apps/web/src/app/api/admin/crawl/run-all/route.ts`      | Create | Next.js POST handler proxying to `/v1/admin/crawl`                                                                                  |

---

## Task 1: Fix venue list badge — show last run status + dot + capitalized (#174, #175)

**Files:**

- Modify: `apps/web/src/app/(protected)/admin/crawl/page.tsx`
- Modify: `apps/web/src/components/admin/crawl/CrawlSplitView.tsx`

**Problem:** `deriveVenueStatus()` returns `'blocked'` whenever `venue.blockedAt != null`, regardless of the last run. The venue list badge reads `row.status` (venue-level), so a venue that ran successfully today can still show "blocked" if it was blocked in the past.

**Fix:** Add a `lastRunStatus` field that always holds the last run's actual status. The badge uses `lastRunStatus`. The `status` field (venue-level) stays for IssuesBanner filtering. The dot color uses `status` so blocked venues still have a red dot even if the last run succeeded.

- [ ] **Step 1: Add `lastRunStatus` to `CrawlStatusRow` and `toStatusRow` in `page.tsx`**

In `apps/web/src/app/(protected)/admin/crawl/page.tsx`:

Find the `CrawlStatusRow` interface and add `lastRunStatus: string` after the `status` field:

```typescript
export interface CrawlStatusRow {
  venueId: string
  venueName: string
  websiteUrl: string
  status: string // venue-level: used by IssuesBanner and dot color
  lastRunStatus: string // last run's actual status: used by the venue list badge
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
```

Find `toStatusRow` and add `lastRunStatus` to its return:

```typescript
function toStatusRow(venue: RawVenueStatus): CrawlStatusRow {
  return {
    venueId: venue.id,
    venueName: venue.name,
    websiteUrl: venue.websiteUrl,
    status: deriveVenueStatus(venue),
    lastRunStatus: venue.lastRun?.status ?? 'never',
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
```

- [ ] **Step 2: Add `lastRunStatus` to the `CrawlStatusRow` interface in `CrawlSplitView.tsx`**

In `apps/web/src/components/admin/crawl/CrawlSplitView.tsx`, find the local `CrawlStatusRow` interface and add `lastRunStatus: string` after `status`:

```typescript
interface CrawlStatusRow {
  venueId: string
  venueName: string
  websiteUrl: string
  status: string
  lastRunStatus: string
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
```

- [ ] **Step 3: Update the venue list badge to use `lastRunStatus` with dot + capitalized text**

In `CrawlSplitView.tsx`, find the `StatusBadge` inside the venue list `filteredStatus.map(...)`. Replace:

```tsx
<StatusBadge kind={STATUS_KIND[row.status] ?? 'neutral'} variant="soft">
  {row.status}
</StatusBadge>
```

With:

```tsx
<StatusBadge kind={STATUS_KIND[row.lastRunStatus] ?? 'neutral'} dot>
  {row.lastRunStatus.charAt(0).toUpperCase() + row.lastRunStatus.slice(1)}
</StatusBadge>
```

Note: The dot color `span` above the badge (using `STATUS_KIND[row.status]`) stays as-is — it correctly shows venue-level status.

- [ ] **Step 4: Run typecheck**

```bash
cd /Users/huey/Projects/concert-crawl/.worktrees/fix-admin-crawl-ui-polish
pnpm --filter @concert-crawl/web typecheck
```

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
cd /Users/huey/Projects/concert-crawl/.worktrees/fix-admin-crawl-ui-polish
git add apps/web/src/app/\(protected\)/admin/crawl/page.tsx \
        apps/web/src/components/admin/crawl/CrawlSplitView.tsx
git commit -m "fix(admin/crawl): venue badge shows last run status (not venue-level) with dot + capitalized text"
```

---

## Task 2: Make venue panel header sticky + update label (#177, #179)

**Files:**

- Modify: `apps/web/src/components/admin/crawl/CrawlSplitView.tsx`

The header div inside the left rail needs `position: sticky` so it stays visible when scrolling. The label changes to "Latest run · per venue N" with the count bolded. The select stays (spec shows a filter control here).

- [ ] **Step 1: Update the venue panel header in `CrawlSplitView.tsx`**

Find the header div inside the left rail (the one with `padding: '10px 14px'` and `borderBottom` and `display: flex`). Add sticky styles and update the label:

```tsx
<div
  style={{
    padding: '10px 14px',
    borderBottom: '1px solid var(--border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    flexShrink: 0,
    position: 'sticky',
    top: 0,
    zIndex: 1,
    background: 'var(--bg-elevated)',
  }}
>
  <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg-muted)' }}>
    Latest run · per venue{' '}
    <span style={{ fontWeight: 700, color: 'var(--fg)' }}>
      {filteredStatus.length}
    </span>
  </span>
  <select
    value={statusFilter}
    onChange={(ev) => setStatusFilter(ev.target.value)}
    style={{
      fontSize: 11,
      fontWeight: 600,
      color: 'var(--fg-muted)',
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border)',
      borderRadius: 6,
      padding: '2px 6px',
      cursor: 'pointer',
    }}
  >
    {STATUS_FILTER_OPTIONS.map((opt) => (
      <option key={opt.value} value={opt.value}>
        {opt.label}
      </option>
    ))}
  </select>
</div>
```

- [ ] **Step 2: Run typecheck**

```bash
cd /Users/huey/Projects/concert-crawl/.worktrees/fix-admin-crawl-ui-polish
pnpm --filter @concert-crawl/web typecheck
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/huey/Projects/concert-crawl/.worktrees/fix-admin-crawl-ui-polish
git add apps/web/src/components/admin/crawl/CrawlSplitView.tsx
git commit -m "fix(admin/crawl): sticky venues panel header with 'Latest run · per venue N' label"
```

---

## Task 3: Add "Run all" button to page header + create API route (#178)

**Files:**

- Modify: `apps/web/src/app/(protected)/admin/crawl/page.tsx`
- Modify: `apps/web/src/components/admin/crawl/CrawlSplitView.tsx` (add `CrawlRunAllButton` export)
- Create: `apps/web/src/app/api/admin/crawl/run-all/route.ts`

`page.tsx` is a React Server Component — it can't have click handlers. Solution: add a `CrawlRunAllButton` client component inside `CrawlSplitView.tsx` (which is already `'use client'`) and import it into `page.tsx`.

- [ ] **Step 1: Create the Next.js run-all API route**

Create `apps/web/src/app/api/admin/crawl/run-all/route.ts`:

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

  const body: unknown = await upstream.json().catch(() => ({}))
  return NextResponse.json(body, { status: upstream.status })
}
```

Note: The `POST /v1/admin/crawl` (no venueId) endpoint is added by the `feat/admin-crawl-data-and-run-all` PR. Once that merges, this route works end-to-end. Until then, the button shows its error state gracefully.

- [ ] **Step 2: Add `CrawlRunAllButton` to `CrawlSplitView.tsx`**

Add this exported component at the bottom of `CrawlSplitView.tsx` (after the `CrawlSplitView` export):

```tsx
export const CrawlRunAllButton = () => {
  const [state, setState] = useState<
    'idle' | 'triggering' | 'queued' | 'error'
  >('idle')

  async function handleRunAll() {
    setState('triggering')
    try {
      const res = await fetch('/api/admin/crawl/run-all', { method: 'POST' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setState('queued')
      setTimeout(() => setState('idle'), 5000)
    } catch {
      setState('error')
      setTimeout(() => setState('idle'), 4000)
    }
  }

  const label =
    state === 'triggering'
      ? 'Queuing…'
      : state === 'queued'
        ? 'Queued ✓'
        : state === 'error'
          ? 'Error — retry?'
          : 'Run all'

  return (
    <button
      onClick={handleRunAll}
      disabled={state === 'triggering' || state === 'queued'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        height: 32,
        padding: '0 14px',
        borderRadius: 8,
        fontSize: 13,
        fontWeight: 600,
        border: '1px solid var(--border-strong)',
        background: state === 'queued' ? 'rgba(47,122,77,0.1)' : 'transparent',
        color:
          state === 'queued'
            ? 'var(--success)'
            : state === 'error'
              ? 'var(--danger)'
              : 'var(--fg)',
        cursor:
          state === 'triggering' || state === 'queued'
            ? 'not-allowed'
            : 'pointer',
      }}
    >
      ↻ {label}
    </button>
  )
}
```

- [ ] **Step 3: Import `CrawlRunAllButton` in `page.tsx` and add to page header**

In `apps/web/src/app/(protected)/admin/crawl/page.tsx`, update the import:

```typescript
import {
  CrawlSplitView,
  CrawlRunAllButton,
} from '@/components/admin/crawl/CrawlSplitView'
```

Find the page title block (the `<div>` containing `<h1>Crawl status</h1>`). Replace it with a two-column header row:

```tsx
<div
  style={{
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
  }}
>
  <div>
    <h1
      style={{
        fontSize: 22,
        fontWeight: 700,
        color: 'var(--fg)',
        margin: 0,
      }}
    >
      Crawl status
    </h1>
    <p style={{ fontSize: 13, color: 'var(--fg-muted)', margin: '4px 0 0' }}>
      Every venue crawl, run by run. The dataset is only as fresh as this page.
    </p>
  </div>
  <CrawlRunAllButton />
</div>
```

- [ ] **Step 4: Run typecheck**

```bash
cd /Users/huey/Projects/concert-crawl/.worktrees/fix-admin-crawl-ui-polish
pnpm --filter @concert-crawl/web typecheck
```

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
cd /Users/huey/Projects/concert-crawl/.worktrees/fix-admin-crawl-ui-polish
git add apps/web/src/app/\(protected\)/admin/crawl/page.tsx \
        apps/web/src/components/admin/crawl/CrawlSplitView.tsx \
        "apps/web/src/app/api/admin/crawl/run-all/route.ts"
git commit -m "fix(admin/crawl): move Run all to page header; add run-all Next.js API route"
```

---

## Task 4: Fix Events Ingested stat card icon (#158)

**Files:**

- Modify: `apps/web/src/app/(protected)/admin/crawl/page.tsx`

Current: `iconName="CheckSquare"`. Spec shows a calendar/checklist icon. Fix: `CalendarCheck2`.

- [ ] **Step 1: Change the icon**

Find the `StatCard` for "Events ingested" and change `iconName="CheckSquare"` to `iconName="CalendarCheck2"`.

- [ ] **Step 2: Commit**

```bash
cd /Users/huey/Projects/concert-crawl/.worktrees/fix-admin-crawl-ui-polish
git add apps/web/src/app/\(protected\)/admin/crawl/page.tsx
git commit -m "fix(admin/crawl): update Events Ingested stat card icon to CalendarCheck2"
```

---

## Task 5: Wire "Jump to issues" to select blocked venue via URL param (#151)

**Files:**

- Modify: `apps/web/src/components/admin/crawl/IssuesBanner.tsx`

Currently `jumpToIssues` calls `scrollIntoView` but may not select the venue in the split view. Using `router.push(?venueId=xxx)` causes a soft navigation so `page.tsx` re-renders with `initialSelectedId` pointing to the blocked venue, which selects it in `CrawlSplitView`.

- [ ] **Step 1: Update `IssuesBanner.tsx` to use `useRouter`**

Replace the entire file:

```tsx
'use client'

import { useRouter } from 'next/navigation'

interface IssueVenue {
  venueId: string
  venueName: string
  status: string
  consecutiveFailures: number
  blockedAt: string | null
}

interface Props {
  blockedVenues: IssueVenue[]
}

export function IssuesBanner({ blockedVenues }: Props) {
  const router = useRouter()

  if (blockedVenues.length === 0) return null

  const blocked = blockedVenues.filter((row) => row.status === 'blocked')
  const failed = blockedVenues.filter((row) => row.status === 'failed')
  const paused = blockedVenues.filter((row) => row.status === 'paused')

  const parts: string[] = []
  if (blocked.length > 0)
    parts.push(
      `${blocked.length} venue${blocked.length > 1 ? 's' : ''} blocked`,
    )
  if (failed.length > 0)
    parts.push(`${failed.length} venue${failed.length > 1 ? 's' : ''} failed`)
  if (paused.length > 0)
    parts.push(`${paused.length} venue${paused.length > 1 ? 's' : ''} paused`)

  const headline = parts.join(' · ')

  function jumpToIssues() {
    const firstVenue = blockedVenues[0]
    if (!firstVenue) return
    router.push(`?venueId=${firstVenue.venueId}`)
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        padding: '10px 14px',
        borderRadius: 10,
        background: 'rgba(184,56,26,0.08)',
        border: '1px solid rgba(184,56,26,0.25)',
      }}
    >
      <span
        style={{ color: 'var(--danger)', fontSize: 14, flexShrink: 0 }}
        aria-hidden
      >
        ⚠
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: 13, color: 'var(--danger)', fontWeight: 600 }}>
          {headline}
        </span>
        <div
          style={{
            marginTop: 4,
            display: 'flex',
            flexWrap: 'wrap' as const,
            gap: '4px 10px',
          }}
        >
          {blockedVenues.map((venue) => (
            <span
              key={venue.venueId}
              style={{ fontSize: 12, color: 'var(--fg-muted)' }}
            >
              {venue.venueName}
              {venue.consecutiveFailures > 0 && (
                <span style={{ color: 'var(--fg-subtle)' }}>
                  {' '}
                  ({venue.consecutiveFailures}×)
                </span>
              )}
              {venue.status === 'blocked' && venue.blockedAt && (
                <span style={{ color: 'var(--fg-subtle)' }}>
                  {' '}
                  · HTTP blocked
                </span>
              )}
            </span>
          ))}
        </div>
      </div>
      <button
        onClick={jumpToIssues}
        style={{
          flexShrink: 0,
          fontSize: 12,
          fontWeight: 500,
          color: 'var(--danger)',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: '2px 0',
          whiteSpace: 'nowrap' as const,
        }}
      >
        Jump to issues ›
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Run typecheck**

```bash
cd /Users/huey/Projects/concert-crawl/.worktrees/fix-admin-crawl-ui-polish
pnpm --filter @concert-crawl/web typecheck
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/huey/Projects/concert-crawl/.worktrees/fix-admin-crawl-ui-polish
git add apps/web/src/components/admin/crawl/IssuesBanner.tsx
git commit -m "fix(admin/crawl): Jump to issues navigates to blocked venue via URL param"
```

---

## Task 6: Right panel — flush panels, large venue title, better button labels (#180, #181, #160)

**Files:**

- Modify: `apps/web/src/components/admin/crawl/CrawlSplitView.tsx`

Three changes to the right inspector:

1. Remove `gap: 16` between the two panels → `gap: 0`, wrap both in a single bordered container
2. Render venue title as a large `<h2>` instead of the Panel's 14px header
3. Update Source button label to "Source URL" with icon; Re-crawl gets "↻" prefix

- [ ] **Step 1: Replace the right inspector container**

In `CrawlSplitView.tsx`, find:

```tsx
{/* Right inspector */}
<div
  style={{
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    overflowY: 'auto',
  }}
>
```

Replace with:

```tsx
{/* Right inspector */}
<div
  style={{
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    border: '1px solid var(--border)',
    borderRadius: 12,
    background: 'var(--bg-elevated)',
    overflow: 'hidden',
    minHeight: 0,
  }}
>
```

- [ ] **Step 2: Replace the venue detail Panel with an inline section**

Find `<Panel title={selected.venueName} action={...}>` and replace it with a plain `<div>` that has a larger title heading. The action buttons (Source URL, Re-crawl) move into the heading row.

Replace from `<Panel title={selected.venueName} action={...}>` through to `</Panel>` (the first Panel, not the Run history one) with:

```tsx
{
  /* Venue detail — inline, not in a Panel */
}
;<div
  style={{
    padding: '16px 20px',
    borderBottom: '1px solid var(--border)',
    flexShrink: 0,
  }}
>
  {/* Header: venue name + action buttons */}
  <div
    style={{
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
      marginBottom: 16,
    }}
  >
    <h2
      style={{
        fontSize: 22,
        fontWeight: 700,
        color: 'var(--fg)',
        margin: 0,
        lineHeight: 1.2,
      }}
    >
      {selected.venueName}
    </h2>
    <div
      style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}
    >
      {selected.websiteUrl && (
        <a
          href={selected.websiteUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
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
      )}
      <button
        onClick={() => handleTrigger(selected.venueId)}
        disabled={
          venueRecrawlState === 'triggering' || venueRecrawlState === 'queued'
        }
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          height: 28,
          padding: '0 10px',
          borderRadius: 6,
          fontSize: 12,
          fontWeight: 500,
          border: '1px solid var(--border-strong)',
          background:
            venueRecrawlState === 'queued'
              ? 'rgba(255,170,0,0.1)'
              : 'transparent',
          color:
            venueRecrawlState === 'triggering' || venueRecrawlState === 'queued'
              ? 'var(--fg-subtle)'
              : 'var(--fg)',
          cursor:
            venueRecrawlState === 'triggering' || venueRecrawlState === 'queued'
              ? 'not-allowed'
              : 'pointer',
        }}
      >
        {venueRecrawlState === 'triggering'
          ? '↻ Triggering…'
          : venueRecrawlState === 'queued'
            ? '↻ Queued'
            : '↻ Re-crawl'}
      </button>
    </div>
  </div>
  {/* Run detail content (unchanged from existing) */}
  {activeRun ? (
    <>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 14,
        }}
      >
        <code
          style={{
            fontSize: 12,
            color: 'var(--fg-muted)',
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          {shortRunId(activeRun.id)}
        </code>
        <StatusBadge kind={STATUS_KIND[activeRun.status] ?? 'neutral'} dot>
          {activeRun.status.charAt(0).toUpperCase() + activeRun.status.slice(1)}
        </StatusBadge>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 16,
          marginBottom: 14,
        }}
      >
        {[
          {
            label: 'Started',
            value: fmtDateTimeMT(activeRun.startedAt ?? activeRun.createdAt),
          },
          {
            label: 'Duration',
            value: activeRun.durationMs
              ? `${(activeRun.durationMs / 1000).toFixed(1)}s`
              : '—',
          },
          {
            label: 'HTTP',
            value: activeRun.httpStatusCode
              ? String(activeRun.httpStatusCode)
              : '—',
            danger:
              activeRun.httpStatusCode !== null &&
              activeRun.httpStatusCode >= 400,
          },
          {
            label: 'LLM Cost',
            value:
              activeRun.llmCostUsd != null
                ? `$${activeRun.llmCostUsd.toFixed(2)}`
                : '$0.00',
          },
        ].map((stat) => (
          <div key={stat.label}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase' as const,
                color: 'var(--fg-subtle)',
                marginBottom: 4,
              }}
            >
              {stat.label}
            </div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                color:
                  'danger' in stat && stat.danger
                    ? 'var(--danger)'
                    : 'var(--fg)',
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              {stat.value}
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginBottom: activeRun.errorMessage ? 14 : 0 }}>
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase' as const,
            color: 'var(--fg-subtle)',
            marginBottom: 4,
          }}
        >
          Events
        </div>
        <div style={{ fontSize: 14, color: 'var(--fg)' }}>
          <span style={{ fontWeight: 600 }}>{activeRun.eventsFound}</span>
          <span style={{ color: 'var(--fg-muted)' }}> found · </span>
          <span style={{ fontWeight: 600 }}>{activeRun.eventsInserted}</span>
          <span style={{ color: 'var(--fg-muted)' }}> inserted</span>
        </div>
      </div>
      {activeRun.errorMessage && (
        <ErrorBlock
          errorMessage={activeRun.errorMessage}
          httpStatusCode={activeRun.httpStatusCode}
          consecutiveFailures={selected.consecutiveFailures}
          blockedAt={selected.blockedAt}
        />
      )}
    </>
  ) : (
    <div style={{ fontSize: 13, color: 'var(--fg-muted)' }}>No runs yet</div>
  )}
  {venueRecrawlError && (
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
      {venueRecrawlError}
    </div>
  )}
</div>
```

- [ ] **Step 3: Replace the Run history Panel with an inline section**

Find `<Panel title="Run history" padding={0}>` through its closing `</Panel>` and replace with:

```tsx
{
  /* Run history — flush below venue detail */
}
;<div
  style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}
>
  <div
    style={{
      padding: '10px 16px',
      borderBottom: '1px solid var(--border)',
      fontSize: 14,
      fontWeight: 700,
      color: 'var(--fg)',
      flexShrink: 0,
    }}
  >
    Run history
  </div>
  <div style={{ overflowY: 'auto', flex: 1 }}>
    <AdminTable>
      <THead>
        <tr>
          <TH>Run</TH>
          <TH>Started</TH>
          <TH>Status</TH>
          <TH align="right" mono>
            Events
          </TH>
          <TH align="right" mono>
            Duration
          </TH>
          <TH align="right" mono>
            LLM cost
          </TH>
        </tr>
      </THead>
      <tbody>
        {selectedRuns.map((run) => (
          <TR
            key={run.id}
            active={run.id === activeRunId}
            onClick={() => setSelectedRunId(run.id)}
          >
            <TD color="var(--fg-muted)">
              <code
                style={{
                  fontSize: 11,
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                {shortRunId(run.id)}
              </code>
            </TD>
            <TD color="var(--fg-muted)">
              {fmtDateTimeMT(run.startedAt ?? run.createdAt)}
            </TD>
            <TD>
              <StatusBadge kind={STATUS_KIND[run.status] ?? 'neutral'} dot>
                {run.status.charAt(0).toUpperCase() + run.status.slice(1)}
              </StatusBadge>
            </TD>
            <TD align="right" mono>
              {run.eventsFound}
            </TD>
            <TD align="right" mono color="var(--fg-muted)">
              {run.durationMs ? `${(run.durationMs / 1000).toFixed(1)}s` : '—'}
            </TD>
            <TD align="right">
              <CostText value={run.llmCostUsd ?? 0} />
            </TD>
          </TR>
        ))}
      </tbody>
    </AdminTable>
  </div>
</div>
```

Also remove the import of `Panel` from primitives if it's no longer used — check all usages first.

- [ ] **Step 4: Typecheck — will fail until Tasks 7 and 8 are done (fmtDateTimeMT and ErrorBlock)**

Proceed to Tasks 7 and 8 before running typecheck.

---

## Task 7: Add `fmtDateTimeMT` — "Started" shows date + time (#182)

**Files:**

- Modify: `apps/web/src/components/admin/crawl/CrawlSplitView.tsx`

Add a new formatter that shows "Today, HH:MM:SS" for today or "May 9, HH:MM:SS" for other days.

- [ ] **Step 1: Add `fmtDateTimeMT` after `fmtTimeMT` in `CrawlSplitView.tsx`**

```typescript
function fmtDateTimeMT(iso: string): string {
  const date = new Date(iso)
  const nowDateMT = new Date().toLocaleDateString('en-US', {
    timeZone: MT_TIMEZONE,
  })
  const thisDateMT = date.toLocaleDateString('en-US', {
    timeZone: MT_TIMEZONE,
  })
  const timePart = date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: MT_TIMEZONE,
  })
  if (thisDateMT === nowDateMT) {
    return `Today, ${timePart}`
  }
  const datePart = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: MT_TIMEZONE,
  })
  return `${datePart}, ${timePart}`
}
```

The venue list rows still use `fmtTimeMT` (time-only is fine there for the compact format). Only the detail panel and run history table use `fmtDateTimeMT`.

---

## Task 8: Structured error display for blocked/failed runs (#160)

**Files:**

- Modify: `apps/web/src/components/admin/crawl/CrawlSplitView.tsx`

The spec shows a structured error card for 403/blocked: icon + bold title + body lines. Raw errors (timeouts, etc.) show in a readable monospace block — not a raw dump.

- [ ] **Step 1: Add `ErrorBlock` component before `CrawlSplitView` export**

```tsx
interface ErrorBlockProps {
  errorMessage: string
  httpStatusCode: number | null
  consecutiveFailures: number
  blockedAt: string | null
}

function ErrorBlock({
  errorMessage,
  httpStatusCode,
  consecutiveFailures,
  blockedAt,
}: ErrorBlockProps) {
  const isHttpBlock =
    httpStatusCode !== null &&
    (httpStatusCode === 403 || httpStatusCode === 429)

  const title = isHttpBlock
    ? `HTTP ${httpStatusCode} · venue blocked`
    : errorMessage.length > 100
      ? `${errorMessage.slice(0, 100)}…`
      : errorMessage

  return (
    <div style={{ marginTop: 14 }}>
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase' as const,
          color: 'var(--fg-subtle)',
          marginBottom: 6,
        }}
      >
        Error
      </div>
      <div
        style={{
          padding: '10px 12px',
          borderRadius: 8,
          background: 'rgba(184,56,26,0.08)',
          border: '1px solid rgba(184,56,26,0.2)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 8,
            marginBottom: isHttpBlock ? 8 : 0,
          }}
        >
          <span style={{ color: 'var(--danger)', fontSize: 14, flexShrink: 0 }}>
            ⊘
          </span>
          <span
            style={{ fontSize: 13, fontWeight: 600, color: 'var(--danger)' }}
          >
            {title}
          </span>
        </div>
        {isHttpBlock && (
          <div style={{ paddingLeft: 22 }}>
            <p
              style={{
                fontSize: 12,
                color: 'var(--fg-muted)',
                margin: '2px 0',
              }}
            >
              Consecutive failures: {consecutiveFailures}
              {consecutiveFailures >= 2
                ? ' · Will pause venue on next failure.'
                : '.'}
            </p>
            {blockedAt && (
              <p
                style={{
                  fontSize: 12,
                  color: 'var(--fg-muted)',
                  margin: '2px 0',
                }}
              >
                HTTP {httpStatusCode} first observed:{' '}
                {new Date(blockedAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}{' '}
                · Try requesting a new IP allowlist.
              </p>
            )}
          </div>
        )}
        {!isHttpBlock && (
          <div
            style={{
              marginTop: 6,
              fontSize: 11,
              color: 'var(--fg-muted)',
              fontFamily: "'JetBrains Mono', monospace",
              wordBreak: 'break-all' as const,
              whiteSpace: 'pre-wrap' as const,
            }}
          >
            {errorMessage}
          </div>
        )}
      </div>
    </div>
  )
}
```

---

## Task 9: Run typecheck + lint + commit Tasks 6–8 together

Tasks 6, 7, and 8 all modify `CrawlSplitView.tsx` and must be applied together before the build is clean.

- [ ] **Step 1: Run typecheck**

```bash
cd /Users/huey/Projects/concert-crawl/.worktrees/fix-admin-crawl-ui-polish
pnpm --filter @concert-crawl/web typecheck
```

Expected: No errors. If `Panel` is unused, remove its import. If `THead` needs a style update for sticky, do it here.

- [ ] **Step 2: Run lint**

```bash
cd /Users/huey/Projects/concert-crawl/.worktrees/fix-admin-crawl-ui-polish
pnpm --filter @concert-crawl/web lint
```

Expected: No new errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/huey/Projects/concert-crawl/.worktrees/fix-admin-crawl-ui-polish
git add apps/web/src/components/admin/crawl/CrawlSplitView.tsx
git commit -m "fix(admin/crawl): flush panels, large venue title, fmtDateTimeMT, structured error display, dot badges in run table"
```

---

## Task 10: Make run history table header sticky (#176)

**Files:**

- Modify: `apps/web/src/components/admin/primitives/AdminTable.tsx`

The run history table needs a sticky `<thead>` so column labels stay visible while scrolling.

- [ ] **Step 1: Read `AdminTable.tsx` to find `THead`**

```bash
cat /Users/huey/Projects/concert-crawl/.worktrees/fix-admin-crawl-ui-polish/apps/web/src/components/admin/primitives/AdminTable.tsx
```

- [ ] **Step 2: Add `sticky` prop to `THead` if it doesn't already have one**

If `THead` renders a plain `<thead>`, add sticky positioning:

```tsx
interface THeadProps {
  children: React.ReactNode
  sticky?: boolean
}

export const THead = ({ children, sticky = false }: THeadProps) => (
  <thead
    style={
      sticky
        ? {
            position: 'sticky',
            top: 0,
            zIndex: 1,
            background: 'var(--bg-elevated)',
          }
        : undefined
    }
  >
    {children}
  </thead>
)
```

If `THead` already has different props, extend carefully without breaking existing usages.

- [ ] **Step 3: Update the Run history `THead` in `CrawlSplitView.tsx` to use sticky**

Change `<THead>` to `<THead sticky>` in the run history table section added in Task 6.

- [ ] **Step 4: Run typecheck**

```bash
cd /Users/huey/Projects/concert-crawl/.worktrees/fix-admin-crawl-ui-polish
pnpm --filter @concert-crawl/web typecheck
```

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
cd /Users/huey/Projects/concert-crawl/.worktrees/fix-admin-crawl-ui-polish
git add apps/web/src/components/admin/primitives/AdminTable.tsx \
        apps/web/src/components/admin/crawl/CrawlSplitView.tsx
git commit -m "fix(admin/crawl): sticky run history table header"
```

---

## Task 11: Final checks and push

- [ ] **Step 1: Full monorepo typecheck**

```bash
cd /Users/huey/Projects/concert-crawl/.worktrees/fix-admin-crawl-ui-polish
pnpm typecheck
```

Expected: No errors.

- [ ] **Step 2: Full monorepo lint**

```bash
cd /Users/huey/Projects/concert-crawl/.worktrees/fix-admin-crawl-ui-polish
pnpm lint
```

Expected: No errors.

- [ ] **Step 3: Run tests**

```bash
cd /Users/huey/Projects/concert-crawl/.worktrees/fix-admin-crawl-ui-polish
pnpm test
```

Expected: All pass.

- [ ] **Step 4: Push**

```bash
cd /Users/huey/Projects/concert-crawl/.worktrees/fix-admin-crawl-ui-polish
git push -u origin fix/admin-crawl-ui-polish
```

- [ ] **Step 5: Open PR**

```bash
gh pr create \
  --title "fix(admin/crawl): UI polish — badges, layout, sticky headers, error display, Run all placement" \
  --body "$(cat <<'EOF'
## What does this PR do?

Closes all remaining visual and behavioral gaps between the admin `/admin/crawl` page and the design spec, building on prior commits on this branch that already addressed #148, #151–#153, #157–#163.

**Bug fixes:**
- #175: Venue list badge now shows last run status (not venue-level blocked status) — a venue that ran successfully today no longer shows "blocked" just because it was blocked in the past

**Layout:**
- #178: "Run all" button moved to page header per spec; adds `POST /api/admin/crawl/run-all` route
- #180: Right panel venue detail + run history are now flush (single bordered container, no gap)
- #181: Venue title in detail panel increased to 22px display heading
- #176: Run history table is scrollable with sticky column header
- #177: Venues panel header is now sticky

**Polish:**
- #174: Venue list status badges use dot indicator + capitalized text to match spec
- #182: "Started" field shows "Today, HH:MM:SS" or "May 9, HH:MM:SS" (includes date)
- #160: Error section shows structured card for HTTP 403/429 (blocked), monospace block for other errors
- #160: Source URL and Re-crawl buttons have icon prefixes and correct labels
- Events Ingested stat card icon updated to CalendarCheck2

## How to test

1. Go to `/admin/crawl` (requires admin role)
2. Verify venue list badges show dot + capitalized last-run status (not venue blocked status)
3. Verify "Run all" button is in the top-right of the page header, not inside the venues list
4. Verify venue detail + run history panels are flush with no gap between them
5. Verify venue title is large (22px)
6. Verify "Started" shows "Today, HH:MM:SS" for today's runs
7. Verify run history table scrolls independently with header staying fixed
8. Click a failed 403 run — verify structured error card with icon and body text
9. Click a timeout/other error run — verify raw error in readable monospace
10. If a blocked venue exists, verify IssuesBanner "Jump to issues" selects that venue

## Screen recordings / captures

<!-- Attach before/after screenshots -->

## Checklist

- [ ] Tests pass locally (`pnpm test`)
- [ ] Types pass (`pnpm typecheck`)
- [ ] No new lint errors (`pnpm lint`)
- [ ] Relevant documentation updated

Closes #174
Closes #175
Closes #176
Closes #177
Closes #178
Closes #179
Closes #180
Closes #181
Closes #182
EOF
)"
```

---

## Spec Coverage Check

| Issue | Requirement                                       | Task        |
| ----- | ------------------------------------------------- | ----------- |
| #174  | Status badges: dot + capitalized + correct colors | Task 1      |
| #175  | BUG: badge shows last run status not venue status | Task 1      |
| #176  | Run history scrollable + sticky header            | Tasks 6, 10 |
| #177  | Venues panel header sticky                        | Task 2      |
| #178  | Run all button in page header                     | Task 3      |
| #179  | Venue panel header label redesign                 | Task 2      |
| #180  | Right panel cards flush (no gap)                  | Task 6      |
| #181  | Venue title larger                                | Task 6      |
| #182  | Started field includes date                       | Task 7      |
| #160  | Structured error for 403/blocked                  | Task 8      |
| #160  | Source URL / Re-crawl button labels               | Task 6      |
| #158  | Events Ingested icon                              | Task 4      |
| #151  | Jump to issues selects venue                      | Task 5      |
