# Admin Dashboard Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the visual and functional gap between the current admin dashboard and the hi-fi design mocks across the shell chrome and dashboard page.

**Architecture:** All changes are UI-layer only — no new API endpoints or data models required. Shell changes (AdminTopbar, AdminThemeProvider, AdminSidebar) are isolated. Dashboard changes extract small client components for interactivity and a utility module for pure logic. Each task produces a focused commit.

**Tech Stack:** Next.js 14 App Router, React, TypeScript strict, Clerk (`useClerk` hook), Lucide React icons, Vitest (node environment — component tests via pure functions only)

**Spec:** `docs/superpowers/specs/2026-05-09-admin-dashboard-polish-design.md`

**Deferred tickets:** #111 Inbox, #112 LLM spend chart, #113 Search, #114 Top spend, #115 SSE, #116 Activity feed events/invites

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `apps/web/src/components/admin/shell/AdminThemeProvider.tsx` | Modify | Default theme → Electric |
| `apps/web/src/components/admin/shell/AdminTopbar.tsx` | Modify | Remove theme selector + Clerk UserButton |
| `apps/web/src/components/admin/shell/AdminSidebar.tsx` | Modify | User card → sign-out popover |
| `apps/web/src/components/admin/primitives/AdminTable.tsx` | Modify | Add `onClick` prop to `TR` |
| `apps/web/src/components/admin/primitives/StatCard.tsx` | Modify | Footer separator |
| `apps/web/src/components/admin/dashboard/lib/dashboard.ts` | **Create** | Shared types + pure helper functions |
| `apps/web/src/components/admin/dashboard/lib/dashboard.test.ts` | **Create** | Unit tests for pure helpers |
| `apps/web/src/components/admin/dashboard/RunAllVenuesButton.tsx` | **Create** | Client component — form + useFormStatus |
| `apps/web/src/components/admin/dashboard/CrawlHealthTable.tsx` | **Create** | Client component — strategy col + clickable rows |
| `apps/web/src/components/admin/dashboard/ActivityFeed.tsx` | Modify | Events + Invites tabs (stubs) |
| `apps/web/src/app/(protected)/admin/page.tsx` | Modify | Data fetching, stat card content, layout |

---

## Task 1: Fix default theme → Electric

**Files:**
- Modify: `apps/web/src/components/admin/shell/AdminThemeProvider.tsx`

- [ ] **Step 1: Update the fallback in `useEffect`**

Replace the system-preference fallback with a hardcoded `'electric'` default. Open `AdminThemeProvider.tsx` and change the `useEffect` body:

```ts
useEffect(() => {
  const raw = localStorage.getItem(STORAGE_KEY)
  const stored: AdminTheme | null = VALID_THEMES.includes(raw as AdminTheme)
    ? (raw as AdminTheme)
    : null
  setThemeState(stored ?? 'electric')
}, [])
```

The `preferred` variable and `window.matchMedia` call are removed entirely. Users with no stored preference now get Electric.

- [ ] **Step 2: Verify TypeScript**

```bash
cd apps/web && pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/admin/shell/AdminThemeProvider.tsx
git commit -m "fix: default admin theme to Electric instead of system preference"
```

---

## Task 2: Simplify AdminTopbar

**Files:**
- Modify: `apps/web/src/components/admin/shell/AdminTopbar.tsx`

The topbar becomes breadcrumb-only. Remove the theme selector group and the Clerk `UserButton`.

- [ ] **Step 1: Replace the entire file content**

```tsx
'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { NAV } from './nav'
import { buildBreadcrumbs } from './breadcrumbs'

const useBreadcrumbs = () => {
  const pathname = usePathname()
  return buildBreadcrumbs(pathname, NAV)
}

export const AdminTopbar = () => {
  const crumbs = useBreadcrumbs()

  return (
    <header
      style={{
        height: 52,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        padding: '0 24px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-elevated)',
      }}
    >
      <nav
        aria-label="Breadcrumb"
        style={{ display: 'flex', alignItems: 'center', gap: 6 }}
      >
        {crumbs.map((crumb, idx) => (
          <span
            key={crumb.label}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            {idx > 0 && (
              <span style={{ fontSize: 13, color: 'var(--fg-subtle)' }}>/</span>
            )}
            {crumb.href ? (
              <Link
                href={crumb.href}
                style={{
                  fontSize: 14,
                  fontWeight: idx === crumbs.length - 1 ? 600 : 400,
                  color: 'var(--fg-muted)',
                  textDecoration: 'none',
                }}
              >
                {crumb.label}
              </Link>
            ) : (
              <span
                style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)' }}
              >
                {crumb.label}
              </span>
            )}
          </span>
        ))}
      </nav>
    </header>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd apps/web && pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/admin/shell/AdminTopbar.tsx
git commit -m "fix: remove theme selector and Clerk UserButton from admin topbar"
```

---

## Task 3: AdminSidebar — user card sign-out popover

**Files:**
- Modify: `apps/web/src/components/admin/shell/AdminSidebar.tsx`

Convert the static user card into a button that opens a popover with a "Sign out" action. Uses `useClerk().signOut()` — no Clerk UI components.

- [ ] **Step 1: Add imports at the top of `AdminSidebar.tsx`**

Add `useRef` to the existing React import and add the Clerk hook import:

```tsx
import { useEffect, useState, useRef } from 'react'
import { useClerk } from '@clerk/nextjs'
```

The existing `import { useEffect, useState } from 'react'` becomes the above.

- [ ] **Step 2: Add state and refs inside the `AdminSidebar` component**

Add these after the existing state declarations (`mode`, `viewportMode`, `pathname`):

```tsx
const { signOut } = useClerk()
const [signOutOpen, setSignOutOpen] = useState(false)
const userCardRef = useRef<HTMLDivElement>(null)
```

- [ ] **Step 3: Add outside-click handler**

Add this `useEffect` after the existing viewport `useEffect`:

```tsx
useEffect(() => {
  if (!signOutOpen) return
  const handler = (evt: MouseEvent) => {
    if (
      userCardRef.current &&
      !userCardRef.current.contains(evt.target as Node)
    ) {
      setSignOutOpen(false)
    }
  }
  document.addEventListener('mousedown', handler)
  return () => document.removeEventListener('mousedown', handler)
}, [signOutOpen])
```

- [ ] **Step 4: Replace the user card section**

Find the `{/* User card */}` comment block (starting at line 379) and replace it with:

```tsx
{/* User card */}
<div
  ref={userCardRef}
  style={{
    padding: '8px 8px 0',
    borderTop: '1px solid var(--border)',
    position: 'relative',
  }}
>
  {signOutOpen && (
    <div
      style={{
        position: 'absolute',
        bottom: '100%',
        left: 8,
        right: 8,
        marginBottom: 4,
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        boxShadow: 'var(--shadow-md)',
        overflow: 'hidden',
        zIndex: 50,
      }}
    >
      <button
        onClick={() => void signOut({ redirectUrl: '/' })}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '9px 12px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          fontSize: 13,
          color: 'var(--fg-muted)',
          fontFamily: "'Inter', sans-serif",
        }}
      >
        <NavIcon name="LogOut" size={14} />
        Sign out
      </button>
    </div>
  )}

  {effectiveMode === 'full' ? (
    <button
      onClick={() => setSignOutOpen((prev) => !prev)}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 10px',
        borderRadius: 7,
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        textAlign: 'left',
      }}
    >
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          background: 'var(--accent)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 11,
          fontWeight: 700,
          color: '#fff',
          flexShrink: 0,
        }}
      >
        {userInitial}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--fg)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {user.firstName ?? user.email}
        </div>
        <div
          style={{
            fontSize: 11,
            color: 'var(--fg-subtle)',
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          admin
        </div>
      </div>
    </button>
  ) : (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        padding: '8px 0',
      }}
    >
      <button
        onClick={() => setSignOutOpen((prev) => !prev)}
        title="User menu"
        style={{
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: 'var(--accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 11,
            fontWeight: 700,
            color: '#fff',
          }}
        >
          {userInitial}
        </div>
      </button>
    </div>
  )}
</div>
```

- [ ] **Step 5: Verify TypeScript**

```bash
cd apps/web && pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Manual smoke test**

Start the dev server (`pnpm dev`) and navigate to `/admin`. Click the user card — the popover should appear with "Sign out". Click outside — it should close. Test in both full and rail sidebar modes.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/components/admin/shell/AdminSidebar.tsx
git commit -m "feat: replace Clerk UserButton with custom sign-out popover on admin sidebar user card"
```

---

## Task 4: Add `onClick` to TR + StatCard footer separator

**Files:**
- Modify: `apps/web/src/components/admin/primitives/AdminTable.tsx`
- Modify: `apps/web/src/components/admin/primitives/StatCard.tsx`

Two small primitives changes needed before implementing the dashboard content tasks.

- [ ] **Step 1: Add `onClick` prop to `TR`**

In `AdminTable.tsx`, update the `TR` component:

```tsx
export const TR = ({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode
  active?: boolean
  onClick?: () => void
}) => (
  <tr
    onClick={onClick}
    style={{
      borderBottom: '1px solid var(--border)',
      background: active ? 'var(--surface-2)' : undefined,
      borderLeft: active ? '2px solid var(--signal)' : '2px solid transparent',
      cursor: onClick ? 'pointer' : undefined,
    }}
    onMouseEnter={(ev) => {
      if (!active)
        (ev.currentTarget as HTMLElement).style.background =
          'var(--overlay-hover)'
    }}
    onMouseLeave={(ev) => {
      if (!active) (ev.currentTarget as HTMLElement).style.background = ''
    }}
  >
    {children}
  </tr>
)
```

- [ ] **Step 2: Add footer separator to StatCard**

In `StatCard.tsx`, replace the footer wrapper `<div>`:

```tsx
{footer && (
  <div
    style={{
      borderTop: '1px solid var(--border)',
      paddingTop: 12,
      marginTop: -4,
    }}
  >
    {footer}
  </div>
)}
```

(The existing code is `{footer && <div>{footer}</div>}` — replace only that line.)

- [ ] **Step 3: Verify TypeScript**

```bash
cd apps/web && pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/admin/primitives/AdminTable.tsx \
        apps/web/src/components/admin/primitives/StatCard.tsx
git commit -m "fix: add onClick to TR primitive, add footer separator to StatCard"
```

---

## Task 5: Dashboard utility module + tests

**Files:**
- Create: `apps/web/src/components/admin/dashboard/lib/dashboard.ts`
- Create: `apps/web/src/components/admin/dashboard/lib/dashboard.test.ts`

Pure functions for hint text and sparkline data. All logic that can be unit-tested lives here; components stay thin.

- [ ] **Step 1: Create the utility module**

Create `apps/web/src/components/admin/dashboard/lib/dashboard.ts`:

```ts
import type { Event, Venue } from '@concert-crawl/types'
import type { CrawlRun } from '@concert-crawl/types'

export interface CrawlStatusRow {
  venueId: string
  venueName: string
  status: string
  lastRunAt: string | null
  eventsFound: number
  strategy: string
  cost: number
  error: string | null
  consecutiveFailures: number
  blockedAt: string | null
}

/** Display label for an extraction strategy value. */
export function formatStrategy(raw: string | null): string {
  if (!raw || raw === '—') return '—'
  if (raw === 'structured_data') return 'structured'
  return raw
}

/** Top-3 venues by pending event count, formatted as "Bluebird (5), Gothic (4)". */
export function buildPendingReviewHint(
  events: Event[],
  venues: Venue[],
): string {
  const venueNameById = new Map(venues.map((v) => [v.id, v.name]))
  const counts = new Map<string, number>()
  for (const evt of events) {
    counts.set(evt.venueId, (counts.get(evt.venueId) ?? 0) + 1)
  }
  return [...counts.entries()]
    .sort((ax, bx) => bx[1] - ax[1])
    .slice(0, 3)
    .map(([id, n]) => `${venueNameById.get(id) ?? 'Unknown'} (${n})`)
    .join(', ')
}

function ordinalSuffix(n: number): string {
  if (n % 100 >= 11 && n % 100 <= 13) return 'th'
  switch (n % 10) {
    case 1: return 'st'
    case 2: return 'nd'
    case 3: return 'rd'
    default: return 'th'
  }
}

/**
 * Returns a hint for the Crawl Health stat card.
 * Prefers the worst blocked venue; falls back to the venue with most consecutive failures.
 */
export function buildCrawlHealthHint(rows: CrawlStatusRow[]): string {
  const blocked = rows.find((r) => r.blockedAt !== null)
  if (blocked) {
    const n = blocked.consecutiveFailures
    return `${blocked.venueName} blocked · ${n}${ordinalSuffix(n)} failure`
  }
  const worst = [...rows]
    .filter((r) => r.consecutiveFailures > 0)
    .sort((ax, bx) => bx.consecutiveFailures - ax.consecutiveFailures)[0]
  if (worst) {
    const n = worst.consecutiveFailures
    return `${worst.venueName} · ${n} consecutive failure${n > 1 ? 's' : ''}`
  }
  return ''
}

/** "X paused · Y blocked · +Z this week" hint for the Active Venues stat card. */
export function buildActiveVenuesHint(venues: Venue[]): string {
  const now = Date.now()
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000
  const paused = venues.filter((v) => !v.active && v.blockedAt === null).length
  const blocked = venues.filter((v) => v.blockedAt !== null).length
  const addedThisWeek = venues.filter(
    (v) => now - new Date(v.createdAt).getTime() < sevenDaysMs,
  ).length

  const parts: string[] = []
  if (paused > 0 || blocked > 0) parts.push(`${paused} paused · ${blocked} blocked`)
  if (addedThisWeek > 0) parts.push(`+${addedThisWeek} this week`)
  return parts.join(' · ')
}

/**
 * Last-8-run binary outcomes (1 = success, 0 = any other status), oldest-first.
 * Suitable for passing to the Sparkline primitive.
 */
export function buildSparklineData(runs: CrawlRun[]): number[] {
  return runs
    .slice(0, 8)
    .reverse()
    .map((r) => (r.status === 'success' ? 1 : 0))
}

export const LLM_BUDGET_USD = 40
```

- [ ] **Step 2: Write the failing tests**

Create `apps/web/src/components/admin/dashboard/lib/dashboard.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  formatStrategy,
  buildPendingReviewHint,
  buildCrawlHealthHint,
  buildActiveVenuesHint,
  buildSparklineData,
} from './dashboard'
import type { CrawlStatusRow } from './dashboard'
import type { Event, Venue, CrawlRun } from '@concert-crawl/types'

// Minimal factory helpers
const venue = (overrides: Partial<Venue> = {}): Venue => ({
  id: 'v1',
  name: 'Bluebird',
  slug: 'bluebird',
  websiteUrl: 'https://bluebird.com',
  city: 'Denver',
  timezone: 'America/Denver',
  active: true,
  verified: true,
  lastCrawledAt: null,
  crawlNotes: null,
  crawlDelayMs: 3000,
  robotsTxtAllowed: null,
  robotsTxtCheckedAt: null,
  consecutiveFailures: 0,
  blockedAt: null,
  extractionStrategy: null,
  contactEmail: null,
  createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
})

const event = (overrides: Partial<Event> = {}): Event => ({
  id: 'e1',
  venueId: 'v1',
  title: 'Test Show',
  artist: 'Test Artist',
  date: '2026-06-01',
  doorsTime: null,
  showTime: null,
  ticketUrl: null,
  ticketPriceMin: null,
  ticketPriceMax: null,
  priceSource: null,
  description: null,
  imageUrl: null,
  genre: null,
  status: 'upcoming',
  confidenceScore: null,
  verified: false,
  sourceUrl: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
})

const crawlRun = (overrides: Partial<CrawlRun> = {}): CrawlRun => ({
  id: 'r1',
  venueId: 'v1',
  venueName: 'Bluebird',
  status: 'success',
  startedAt: null,
  completedAt: null,
  eventsFound: 10,
  eventsInserted: 10,
  errorMessage: null,
  extractionStrategyUsed: 'structured_data',
  llmCostUsd: 0,
  createdAt: new Date().toISOString(),
  ...overrides,
})

const row = (overrides: Partial<CrawlStatusRow> = {}): CrawlStatusRow => ({
  venueId: 'v1',
  venueName: 'Bluebird',
  status: 'success',
  lastRunAt: null,
  eventsFound: 0,
  strategy: 'structured_data',
  cost: 0,
  error: null,
  consecutiveFailures: 0,
  blockedAt: null,
  ...overrides,
})

describe('formatStrategy', () => {
  it('maps structured_data → structured', () => {
    expect(formatStrategy('structured_data')).toBe('structured')
  })
  it('passes llm through unchanged', () => {
    expect(formatStrategy('llm')).toBe('llm')
  })
  it('returns — for null', () => {
    expect(formatStrategy(null)).toBe('—')
  })
  it('returns — for the literal dash', () => {
    expect(formatStrategy('—')).toBe('—')
  })
})

describe('buildPendingReviewHint', () => {
  it('returns empty string when no events', () => {
    expect(buildPendingReviewHint([], [venue()])).toBe('')
  })

  it('lists top 3 venues by count, descending', () => {
    const venues = [
      venue({ id: 'v1', name: 'Bluebird' }),
      venue({ id: 'v2', name: 'Gothic' }),
      venue({ id: 'v3', name: 'Ogden' }),
    ]
    const events = [
      event({ venueId: 'v1' }),
      event({ venueId: 'v1' }),
      event({ venueId: 'v1' }),
      event({ venueId: 'v1' }),
      event({ venueId: 'v1' }),
      event({ venueId: 'v2' }),
      event({ venueId: 'v2' }),
      event({ venueId: 'v2' }),
      event({ venueId: 'v2' }),
      event({ venueId: 'v3' }),
    ]
    expect(buildPendingReviewHint(events, venues)).toBe(
      'Bluebird (5), Gothic (4), Ogden (1)',
    )
  })

  it('caps at 3 venues even when more exist', () => {
    const venues = ['v1', 'v2', 'v3', 'v4'].map((id) =>
      venue({ id, name: `Venue ${id}` }),
    )
    const events = ['v1', 'v2', 'v3', 'v4'].map((id) => event({ venueId: id }))
    const result = buildPendingReviewHint(events, venues)
    expect(result.split(', ').length).toBe(3)
  })
})

describe('buildCrawlHealthHint', () => {
  it('returns empty string when all healthy', () => {
    expect(buildCrawlHealthHint([row()])).toBe('')
  })

  it('surfaces the blocked venue with ordinal failure count', () => {
    const rows = [
      row({ venueName: 'Bluebird', blockedAt: '2026-05-01', consecutiveFailures: 3 }),
    ]
    expect(buildCrawlHealthHint(rows)).toBe('Bluebird blocked · 3rd failure')
  })

  it('uses correct ordinal suffixes', () => {
    const make = (n: number) =>
      buildCrawlHealthHint([row({ blockedAt: '2026-05-01', consecutiveFailures: n })])
    expect(make(1)).toContain('1st')
    expect(make(2)).toContain('2nd')
    expect(make(3)).toContain('3rd')
    expect(make(4)).toContain('4th')
    expect(make(11)).toContain('11th')
    expect(make(12)).toContain('12th')
    expect(make(21)).toContain('21st')
  })

  it('falls back to worst failing venue when none blocked', () => {
    const rows = [
      row({ venueName: 'Gothic', consecutiveFailures: 2 }),
      row({ venueName: 'Bluebird', consecutiveFailures: 5 }),
    ]
    expect(buildCrawlHealthHint(rows)).toBe('Bluebird · 5 consecutive failures')
  })

  it('uses singular "failure" for count of 1', () => {
    expect(
      buildCrawlHealthHint([row({ venueName: 'Ogden', consecutiveFailures: 1 })]),
    ).toBe('Ogden · 1 consecutive failure')
  })
})

describe('buildActiveVenuesHint', () => {
  it('returns empty string when no paused, blocked, or recent venues', () => {
    const old = venue({ active: true, blockedAt: null, createdAt: new Date(0).toISOString() })
    expect(buildActiveVenuesHint([old])).toBe('')
  })

  it('shows paused and blocked counts', () => {
    const venues = [
      venue({ active: false, blockedAt: null }),
      venue({ active: false, blockedAt: null }),
      venue({ active: true, blockedAt: '2026-05-01' }),
      venue({ active: true }),
    ]
    const hint = buildActiveVenuesHint(venues)
    expect(hint).toContain('2 paused · 1 blocked')
  })

  it('shows +N this week for recently created venues', () => {
    const recent = venue({ createdAt: new Date().toISOString() })
    const old = venue({ createdAt: new Date(0).toISOString() })
    const hint = buildActiveVenuesHint([recent, old])
    expect(hint).toContain('+1 this week')
  })
})

describe('buildSparklineData', () => {
  it('returns empty array for empty runs', () => {
    expect(buildSparklineData([])).toEqual([])
  })

  it('maps success → 1, others → 0', () => {
    const runs = [
      crawlRun({ status: 'success' }),
      crawlRun({ status: 'failed' }),
      crawlRun({ status: 'partial' }),
    ]
    // slice(0,8).reverse() — with 3 items, reversed = [partial, failed, success]
    expect(buildSparklineData(runs)).toEqual([0, 0, 1])
  })

  it('takes only the 8 most recent (first in DESC array)', () => {
    const runs = Array.from({ length: 12 }, (_, idx) =>
      crawlRun({ status: idx < 8 ? 'success' : 'failed' }),
    )
    expect(buildSparklineData(runs)).toHaveLength(8)
    expect(buildSparklineData(runs).every((v) => v === 1)).toBe(true)
  })
})
```

- [ ] **Step 3: Run tests (expect failure — module doesn't exist yet)**

```bash
cd apps/web && pnpm vitest run src/components/admin/dashboard/lib/dashboard.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 4: Create the implementation file** (from Step 1 above — the file content is in Step 1; paste it now if you haven't already)

- [ ] **Step 5: Run tests again**

```bash
cd apps/web && pnpm vitest run src/components/admin/dashboard/lib/dashboard.test.ts
```

Expected: all tests PASS.

- [ ] **Step 6: Verify TypeScript**

```bash
cd apps/web && pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/components/admin/dashboard/lib/dashboard.ts \
        apps/web/src/components/admin/dashboard/lib/dashboard.test.ts
git commit -m "feat: extract dashboard utility functions and tests"
```

---

## Task 6: Fetch events + update pending review stat card

**Files:**
- Modify: `apps/web/src/app/(protected)/admin/page.tsx`

Add an event count fetch to the existing data function and wire the pending review stat card.

- [ ] **Step 1: Add `Event` to the type import and events to `fetchDashboardData`**

In `page.tsx`, update the type import line:

```ts
import type { CrawlRun, Venue, Event } from '@concert-crawl/types'
```

Then in `fetchDashboardData`, add events to the `Promise.all`:

```ts
async function fetchDashboardData(token: string) {
  const [rawStatus, venues, runs, pendingEvents] = await Promise.all([
    apiClient
      .get<RawVenueStatus[]>('/v1/admin/crawl/status', token)
      .catch((err: unknown) => {
        throw new Error(
          `Failed to load crawl status: ${err instanceof Error ? err.message : String(err)}`,
        )
      }),
    apiClient.get<Venue[]>('/v1/admin/venues', token).catch((err: unknown) => {
      throw new Error(
        `Failed to load venues: ${err instanceof Error ? err.message : String(err)}`,
      )
    }),
    apiClient
      .get<CrawlRun[]>('/v1/admin/crawl/runs?limit=20', token)
      .catch((err: unknown) => {
        throw new Error(
          `Failed to load crawl runs: ${err instanceof Error ? err.message : String(err)}`,
        )
      }),
    apiClient
      .get<Event[]>('/v1/admin/events?verified=false&limit=100', token)
      .catch(() => [] as Event[]),
  ])
  return { status: rawStatus.map(toStatusRow), venues, runs, pendingEvents }
}
```

Note the events fetch uses `.catch(() => [])` — a failed events call degrades gracefully (pending review shows 0 with no hint).

- [ ] **Step 2: Import shared types and helpers**

Remove the local `CrawlStatusRow` interface and `toStatusRow` function from `page.tsx` — they will move to `dashboard.ts`. Add imports:

```ts
import {
  CrawlStatusRow,
  buildPendingReviewHint,
  buildCrawlHealthHint,
  buildActiveVenuesHint,
  buildSparklineData,
  formatStrategy,
  LLM_BUDGET_USD,
} from '@/components/admin/dashboard/lib/dashboard'
```

Update `toStatusRow` in `page.tsx` to include the new fields, or if you've already removed it, define it in `dashboard.ts`. Here is the updated `toStatusRow` to place in `dashboard.ts` (add it after the `CrawlStatusRow` interface):

```ts
export function toStatusRow(venue: {
  id: string
  name: string
  consecutiveFailures: number
  blockedAt: string | null
  lastRun: {
    status: string
    createdAt: string
    eventsFound: number
    extractionStrategyUsed: string | null
    errorMessage: string | null
  } | null
}): CrawlStatusRow {
  return {
    venueId: venue.id,
    venueName: venue.name,
    status: venue.lastRun?.status ?? 'never',
    lastRunAt: venue.lastRun?.createdAt ?? null,
    eventsFound: venue.lastRun?.eventsFound ?? 0,
    strategy: venue.lastRun?.extractionStrategyUsed ?? '—',
    cost: 0,
    error: venue.lastRun?.errorMessage ?? null,
    consecutiveFailures: venue.consecutiveFailures,
    blockedAt: venue.blockedAt,
  }
}
```

Import `toStatusRow` from `dashboard.ts` in `page.tsx` as well. Remove the local definitions.

- [ ] **Step 3: Destructure `pendingEvents` in `AdminDashboardPage` and compute hints**

In `AdminDashboardPage`, update the destructuring and add derived values:

```ts
const { status, venues, runs, pendingEvents } = await fetchDashboardData(token)

// existing derived values...
const pendingReviewHint = buildPendingReviewHint(pendingEvents, venues)
```

- [ ] **Step 4: Update the pending review StatCard**

Replace the current pending review `<StatCard>` with:

```tsx
<StatCard
  label="Pending review"
  value={String(pendingEvents.length)}
  unit="events"
  iconName="CheckSquare"
  kind={pendingEvents.length > 0 ? 'warning' : 'neutral'}
  hint={pendingReviewHint || undefined}
  footer={
    <a
      href="/admin/events"
      style={{ textDecoration: 'none', display: 'block' }}
    >
      <AdminButton variant="ghost" size="sm" iconRight={ChevronRight} fullWidth>
        Open queue
      </AdminButton>
    </a>
  }
/>
```

Note: `<a>` wrapping the `AdminButton` ensures the link works without `onClick`. The current broken "Open queue" is fixed this way.

- [ ] **Step 5: Verify TypeScript**

```bash
cd apps/web && pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/(protected)/admin/page.tsx \
        apps/web/src/components/admin/dashboard/lib/dashboard.ts
git commit -m "fix: wire pending review count and hint from events API, fix Open queue link"
```

---

## Task 7: Update LLM cost, crawl health, and active venues stat cards

**Files:**
- Modify: `apps/web/src/app/(protected)/admin/page.tsx`

- [ ] **Step 1: Compute the values needed for all three cards**

In `AdminDashboardPage`, add after existing derived values:

```ts
const sparklineData = buildSparklineData(runs)
const crawlHealthHint = buildCrawlHealthHint(status)
const activeVenuesHint = buildActiveVenuesHint(venues)
const llmBudgetPct = Math.min(Math.round((totalCost / LLM_BUDGET_USD) * 100), 100)
```

- [ ] **Step 2: Update the LLM cost StatCard**

Replace the current LLM cost `<StatCard>` footer with a stacked layout that includes a progress bar and a budget label:

```tsx
<StatCard
  label="LLM cost · 30d"
  value={`$${totalCost.toFixed(2)}`}
  iconName="DollarSign"
  kind="signal"
  {...(costTrend !== undefined ? { trend: costTrend } : {})}
  footer={
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <ProgressBar value={llmBudgetPct} kind="signal" showLabel={false} />
      <span style={{ fontSize: 11, color: 'var(--fg-muted)' }}>
        Budget ${LLM_BUDGET_USD} · {llmBudgetPct}% used
      </span>
    </div>
  }
/>
```

- [ ] **Step 3: Update the crawl health StatCard**

Replace the current crawl health `<StatCard>` with:

```tsx
<StatCard
  label="Crawl health"
  value={`${greenCount}/${status.length}`}
  unit="green"
  iconName="Activity"
  kind={blockedCount > 0 ? 'warning' : 'success'}
  hint={crawlHealthHint || undefined}
  footer={
    sparklineData.length > 0 ? (
      <Sparkline data={sparklineData} />
    ) : undefined
  }
/>
```

Add `Sparkline` to the primitives import at the top of `page.tsx`:

```ts
import {
  StatCard,
  Panel,
  AdminTable,
  THead,
  TR,
  TH,
  TD,
  StatusBadge,
  AdminButton,
  ProgressBar,
  CostText,
  RelTime,
  Sparkline,
} from '@/components/admin/primitives'
```

`Sparkline` is already exported from the primitives index — no change needed there.

- [ ] **Step 4: Update the active venues StatCard**

Replace the current active venues `<StatCard>` with:

```tsx
<StatCard
  label="Active venues"
  value={String(venues.filter((v) => v.active).length)}
  unit="venues"
  iconName="MapPin"
  kind="neutral"
  hint={activeVenuesHint || undefined}
/>
```

- [ ] **Step 5: Verify TypeScript**

```bash
cd apps/web && pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/(protected)/admin/page.tsx
git commit -m "feat: populate LLM cost budget label, crawl health sparkline, and active venues hints"
```

---

## Task 8: Run all venues — Server Action + button component

**Files:**
- Create: `apps/web/src/components/admin/dashboard/RunAllVenuesButton.tsx`
- Modify: `apps/web/src/app/(protected)/admin/page.tsx`

- [ ] **Step 1: Create `RunAllVenuesButton.tsx`**

```tsx
'use client'

import { useFormStatus } from 'react-dom'
import { AdminButton } from '@/components/admin/primitives'
import { Play } from 'lucide-react'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <AdminButton variant="primary" size="sm" icon={Play} disabled={pending}>
      {pending ? 'Running…' : 'Run all venues'}
    </AdminButton>
  )
}

export function RunAllVenuesButton({
  action,
}: {
  action: () => Promise<void>
}) {
  return (
    <form action={action}>
      <SubmitButton />
    </form>
  )
}
```

- [ ] **Step 2: Add the Server Action and greeting buttons in `page.tsx`**

Add a Server Action inside `AdminDashboardPage` (must be defined with `'use server'` directive inside the async server component):

```ts
async function triggerAllVenuesAction() {
  'use server'
  const { getToken } = await auth()
  const token = await getToken()
  if (!token) return

  const allVenues = await apiClient
    .get<Venue[]>('/v1/admin/venues', token)
    .catch(() => [] as Venue[])

  const targets = allVenues.filter((v) => v.active && v.verified)
  await Promise.allSettled(
    targets.map((v) => apiClient.post(`/v1/admin/crawl/${v.id}`, token, {})),
  )
}
```

Add `RunAllVenuesButton` import:

```ts
import { RunAllVenuesButton } from '@/components/admin/dashboard/RunAllVenuesButton'
```

Add `Link` import (if not already present):

```ts
import Link from 'next/link'
```

Update the greeting block to include action buttons on the right:

```tsx
{/* Greeting */}
<div
  style={{
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 14,
    flexWrap: 'wrap',
  }}
>
  <div>
    <h1
      style={{
        margin: 0,
        fontFamily: "'Inter', sans-serif",
        fontSize: 26,
        fontWeight: 700,
        color: 'var(--fg)',
        letterSpacing: '-0.025em',
      }}
    >
      {greeting}, {firstName}.
    </h1>
    <div style={{ marginTop: 4, fontSize: 13, color: 'var(--fg-muted)' }}>
      {greenCount} of {status.length} venues green ·{' '}
      {blockedCount > 0 ? `${blockedCount} blocked` : 'all healthy'}
    </div>
  </div>
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
    <RunAllVenuesButton action={triggerAllVenuesAction} />
    <Link href="/admin/venues/new" style={{ textDecoration: 'none' }}>
      <AdminButton variant="outline" size="sm">
        + Add venue
      </AdminButton>
    </Link>
  </div>
</div>
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd apps/web && pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Manual smoke test**

Navigate to `/admin`. The "Run all venues" and "+ Add venue" buttons should appear top-right of the greeting. Click "Add venue" → should navigate to `/admin/venues/new`. Click "Run all venues" → button should disable while in flight.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/admin/dashboard/RunAllVenuesButton.tsx \
        apps/web/src/app/(protected)/admin/page.tsx
git commit -m "feat: add Run all venues server action and Add venue button to dashboard greeting"
```

---

## Task 9: Extract CrawlHealthTable client component

**Files:**
- Create: `apps/web/src/components/admin/dashboard/CrawlHealthTable.tsx`
- Modify: `apps/web/src/app/(protected)/admin/page.tsx`

Extracts the health table to a client component so rows can navigate using `useRouter`, and adds the Strategy column.

- [ ] **Step 1: Create `CrawlHealthTable.tsx`**

```tsx
'use client'

import { useRouter } from 'next/navigation'
import {
  AdminTable,
  THead,
  TR,
  TH,
  TD,
  StatusBadge,
  RelTime,
  CostText,
} from '@/components/admin/primitives'
import type { StatusKind } from '@/components/admin/primitives'
import { formatStrategy, type CrawlStatusRow } from './lib/dashboard'

const STATUS_KIND: Record<string, StatusKind> = {
  success: 'success',
  failed: 'danger',
  blocked: 'danger',
  partial: 'warning',
  paused: 'warning',
  never: 'neutral',
}

interface CrawlHealthTableProps {
  rows: CrawlStatusRow[]
}

export function CrawlHealthTable({ rows }: CrawlHealthTableProps) {
  const router = useRouter()

  return (
    <AdminTable>
      <THead>
        <tr>
          <TH>Venue</TH>
          <TH>Status</TH>
          <TH>Last crawl</TH>
          <TH>Strategy</TH>
          <TH align="right" mono>
            Events
          </TH>
          <TH align="right" mono>
            Cost
          </TH>
        </tr>
      </THead>
      <tbody>
        {rows.map((row) => (
          <TR
            key={row.venueId}
            onClick={() => router.push(`/admin/crawl?venue=${row.venueId}`)}
          >
            <TD>{row.venueName}</TD>
            <TD>
              <StatusBadge kind={STATUS_KIND[row.status] ?? 'neutral'} dot>
                {row.status}
              </StatusBadge>
            </TD>
            <TD color="var(--fg-muted)">
              {row.lastRunAt ? <RelTime iso={row.lastRunAt} /> : '—'}
            </TD>
            <TD>
              {row.strategy && row.strategy !== '—' ? (
                <StatusBadge kind="neutral" variant="mono">
                  {formatStrategy(row.strategy)}
                </StatusBadge>
              ) : (
                <span style={{ color: 'var(--fg-subtle)' }}>—</span>
              )}
            </TD>
            <TD align="right" mono>
              {row.eventsFound}
            </TD>
            <TD align="right">
              <CostText value={row.cost} />
            </TD>
          </TR>
        ))}
      </tbody>
    </AdminTable>
  )
}
```

- [ ] **Step 2: Replace the inline table in `page.tsx`**

Remove the inline `<AdminTable>` block (including `<THead>` and `<tbody>`) from the health panel. Replace it with:

```tsx
import { CrawlHealthTable } from '@/components/admin/dashboard/CrawlHealthTable'

// ...

<Panel title="Crawl health · today" padding={0}>
  <CrawlHealthTable rows={status} />
</Panel>
```

Also remove the `STATUS_KIND` constant from `page.tsx` (it moved to `CrawlHealthTable.tsx`).

Also remove the now-unused imports from `page.tsx`: `AdminTable`, `THead`, `TR`, `TH`, `TD` — if they are not used elsewhere in the file.

- [ ] **Step 3: Verify TypeScript**

```bash
cd apps/web && pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/admin/dashboard/CrawlHealthTable.tsx \
        apps/web/src/app/(protected)/admin/page.tsx
git commit -m "feat: extract CrawlHealthTable with Strategy column and clickable rows"
```

---

## Task 10: Activity feed — Events + Invites tabs

**Files:**
- Modify: `apps/web/src/components/admin/dashboard/ActivityFeed.tsx`

Add Events and Invites tabs. Both show an empty state since the feed only receives `CrawlRun[]`. The `FilterTab` type is designed so #116 can wire real data without structural changes.

- [ ] **Step 1: Replace the file content**

```tsx
'use client'

import { useState } from 'react'
import type { CrawlRun } from '@concert-crawl/types'

type FilterTab = 'all' | 'crawl' | 'events' | 'invites'

const TABS: { id: FilterTab; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'crawl', label: 'Crawl' },
  { id: 'events', label: 'Events' },
  { id: 'invites', label: 'Invites' },
]

interface Props {
  runs: CrawlRun[]
}

export function ActivityFeed({ runs }: Props) {
  const [tab, setTab] = useState<FilterTab>('all')

  const showCrawlRuns = tab === 'all' || tab === 'crawl'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 12 }}>
        {TABS.map((tabItem) => (
          <button
            key={tabItem.id}
            onClick={() => setTab(tabItem.id)}
            style={{
              height: 26,
              padding: '0 10px',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 500,
              border: 'none',
              cursor: 'pointer',
              background:
                tab === tabItem.id ? 'var(--surface-2)' : 'transparent',
              color: tab === tabItem.id ? 'var(--fg)' : 'var(--fg-muted)',
            }}
          >
            {tabItem.label}
          </button>
        ))}
      </div>

      {/* Crawl run items */}
      {showCrawlRuns &&
        runs.slice(0, 8).map((run) => (
          <div
            key={run.id}
            style={{
              display: 'flex',
              gap: 12,
              alignItems: 'flex-start',
              paddingBottom: 10,
            }}
          >
            <span
              style={{
                fontSize: 11,
                color: 'var(--fg-subtle)',
                fontVariantNumeric: 'tabular-nums',
                minWidth: 56,
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              {new Date(run.startedAt ?? run.createdAt).toLocaleTimeString(
                'en-US',
                { hour: '2-digit', minute: '2-digit' },
              )}
            </span>
            <div style={{ flex: 1, fontSize: 13 }}>
              <div style={{ color: 'var(--fg)', fontWeight: 500 }}>
                {run.status === 'success'
                  ? `${run.venueName ?? 'Venue'} crawl ok`
                  : `${run.venueName ?? 'Venue'} crawl ${run.status}`}
              </div>
              <div style={{ color: 'var(--fg-muted)', fontSize: 12 }}>
                {run.eventsFound} events · {run.extractionStrategyUsed ?? '—'}
              </div>
            </div>
          </div>
        ))}

      {/* Empty states for tabs with no data yet */}
      {!showCrawlRuns && (
        <div
          style={{ color: 'var(--fg-subtle)', fontSize: 13, padding: '12px 0' }}
        >
          No recent activity.
        </div>
      )}

      {showCrawlRuns && runs.length === 0 && (
        <div
          style={{ color: 'var(--fg-subtle)', fontSize: 13, padding: '12px 0' }}
        >
          No activity yet.
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd apps/web && pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/admin/dashboard/ActivityFeed.tsx
git commit -m "feat: add Events and Invites filter tabs to activity feed (stubs, wired in #116)"
```

---

## Task 11: Final verification

- [ ] **Step 1: Run full type check**

```bash
cd apps/web && pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 2: Run tests**

```bash
cd apps/web && pnpm vitest run
```

Expected: all tests pass including `dashboard.test.ts`.

- [ ] **Step 3: Run lint**

```bash
cd apps/web && pnpm lint
```

Expected: no errors or warnings introduced by this work.

- [ ] **Step 4: Manual walkthrough checklist**

Start `pnpm dev` and walk through:

- [ ] Default theme is Electric for a new session (clear localStorage `cc-admin-theme` and reload)
- [ ] Topbar shows breadcrumbs only — no theme selector, no Clerk avatar
- [ ] Clicking the sidebar user card opens the sign-out popover
- [ ] "Sign out" in the popover signs the user out and redirects to `/`
- [ ] Popover closes when clicking outside
- [ ] "Run all venues" button appears, disables during flight, re-enables after
- [ ] "+ Add venue" navigates to `/admin/venues/new`
- [ ] "Open queue" footer on the pending review card navigates to `/admin/events`
- [ ] Pending review count is dynamic (not hardcoded 0)
- [ ] LLM cost card shows budget progress bar + "Budget $40 · X% used" label
- [ ] Crawl health card shows sparkline in footer
- [ ] Active venues card shows paused/blocked hint
- [ ] Crawl health table has a Strategy column
- [ ] Clicking a crawl health table row navigates to `/admin/crawl?venue=<id>`
- [ ] Activity feed has All / Crawl / Events / Invites tabs
- [ ] Events and Invites tabs show "No recent activity."
- [ ] No regressions on /admin/venues, /admin/events, /admin/prices, /admin/invite-codes, /admin/settings
