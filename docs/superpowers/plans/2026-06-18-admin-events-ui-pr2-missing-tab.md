# Admin Events UI — PR 2 (Missing Tab) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the 4th tab "Missing" to `/admin/review` (desktop) and "Missing" as the 3rd tab on mobile. Lists events the crawler stopped seeing (uses the existing `?missing=true` filter from #627). Per-row actions: Mark postponed · Mark cancelled · Dismiss.

**Architecture:** `MissingTabContent.tsx` is a single orchestrator used by both desktop and mobile (it switches internal rendering based on an `isDesktop` prop) — this keeps the pending-action state and disable-on-click behavior identical across surfaces. Desktop: `ReviewPageClient.tsx` renders `<MissingTabContent isDesktop/>` which delegates to `<MissingTable/>` (header banner + rows or empty-state card). Mobile: `AdminReviewMobile.tsx` renders `<MissingTabContent isDesktop={false}/>` which delegates to `<MissingMobile/>` (warning banner + stacked cards). Each `<MissingRow/>` (desktop) and mobile card shows title/venue/date, `<MissingChips/>` (missed-sweeps + cadence chips), a right-aligned "last seen" date column, and `<MissingRowMenu/>` (three inline action buttons). All three actions hit `PATCH /v1/admin/events/:id` — Dismiss sends `{ firstMissingAt: null }` (new); Postponed/Cancelled send `{ status: 'postponed' | 'cancelled' }` (existing). Backend PATCH Zod schema is extended in this PR to accept `firstMissingAt: null`. Row UI uses optimistic-remove on success (any action takes the row out of the "missing + upcoming" query result).

**Tech Stack:** Next.js 14 App Router · React 18 · TypeScript strict · Vitest + Testing Library (jsdom) · Hono + Drizzle · Zod · CSS variables via admin.css tokens · `lucide-react` icons (`Pause`, `X`, `Check`)

## Global Constraints

Copied verbatim from the spec — apply to every task.

- TypeScript strict mode; **no `as` casts** (use Zod `safeParse`, type guards, or interface augmentation)
- **No single-character variable names** (ESLint enforces minimum identifier length of 2)
- All customer-facing strings land in `apps/web/src/components/admin/definitions/copy.ts`
- Existing tests for `EventFlagsSection`, `PendingSubmissionsPanel`, `PriceCoverageTable`, `ReviewTabs`, and the PR 1 tab content wrappers must continue to pass
- Existing PR 1 desktop tab pill shell is the foundation — Missing becomes the 4th tab key (`missing`) routed via the existing `?tab=` URL state
- Worktree: `.worktrees/feat-admin-events-ui-pr2-missing-tab` on branch `feat/admin-events-ui-pr2-missing-tab`
- Before push: `pnpm typecheck && pnpm lint && pnpm test` clean in the worktree
- Before `gh pr create`: run the `design-review` skill (Agent 1 on `admin-missing.jsx`; Agent 2 verify implementation)
- After PR opens: request Copilot review; address **all** valid review feedback before merge (per `feedback_address_all_valid_review_comments.md`)
- **Merge gate:** per `feedback_admin_events_validation_at_end.md`, no per-PR user manual validation gate — Copilot review only, merge when clean

---

## File Structure

**Create:**

- `apps/web/src/components/admin/review/missing/MissingChips.tsx` — two-chip primitive ("missed N sweeps" + "expected daily")
- `apps/web/src/components/admin/review/missing/MissingChips.test.tsx`
- `apps/web/src/components/admin/review/missing/MissingRowMenu.tsx` — three inline action buttons (Postponed, Cancelled, Dismiss); `stacked` prop for mobile
- `apps/web/src/components/admin/review/missing/MissingRowMenu.test.tsx`
- `apps/web/src/components/admin/review/missing/MissingRow.tsx` — desktop row composition
- `apps/web/src/components/admin/review/missing/MissingTable.tsx` — desktop list (header banner + rows OR empty-state card)
- `apps/web/src/components/admin/review/missing/MissingMobile.tsx` — mobile card list (warning banner + stacked cards)
- `apps/web/src/components/admin/review/_tabs/MissingTabContent.tsx` — orchestrator: lazy data fetch, action handlers with optimistic remove, desktop ↔ mobile switch
- `apps/web/src/components/admin/review/_tabs/MissingTabContent.test.tsx`
- `apps/web/src/lib/admin/missing.ts` — `computeMissedSweeps(firstMissingAtIso, todayIso): number` + `formatLastSeen(iso): string`
- `apps/web/src/lib/admin/missing.test.ts`

**Modify:**

- `apps/api/src/routes/admin/events.ts` — extend PATCH `/:id` Zod schema to accept `firstMissingAt: z.null().optional()`; pass through in the update
- `apps/api/src/routes/admin/events.integration.test.ts` — new test cases (Dismiss + Mark postponed/cancelled via the PATCH endpoint)
- `apps/web/src/components/admin/review/ReviewPageClient.tsx` — add `'missing'` to `ReviewTabKey` + `VALID_TAB_KEYS`; add tab descriptor `{ key: 'missing', label: ADMIN_COPY.review.tabs.missing, count: missingEvents.length, kind: 'danger' }`; render `<MissingTabContent/>` when active; pass missing-events state + handlers
- `apps/web/src/components/admin/review/AdminReviewMobile.tsx` — extend `activeTab` type from `'flags' | 'prices'` to `'flags' | 'prices' | 'missing'`; add the 3rd tab button to the existing tab pill; render `<MissingMobile/>` body when active
- `apps/web/src/components/admin/definitions/copy.ts` — add `review.tabs.missing`, `review.missing.{bannerBody, headerTitle, flaggedCount, lastSeenLabel, actionPostponed, actionCancelled, actionDismiss, emptyHeading, emptyBody, chipMissed, chipCadence}`

**Not modified:**

- `ReviewTabs.tsx` — already supports `kind: 'danger'` from PR 1
- PR 1's tab wrapper files (`EventFlagsTabContent`, `PricesTabContent`, `AllEventsTabContent`)
- The mobile tab pill primitive in `AdminReviewMobile.tsx` (just extended with one new entry; no structural change)

---

## Backend: API response shape (already returned by `?missing=true`)

The existing `GET /v1/admin/events?missing=true` endpoint (line 143-202 of events.ts) returns rows with these fields used by the new UI:

```ts
type AdminMissingEvent = {
  id: string
  title: string
  artist: string | null
  date: string // 'YYYY-MM-DD' (event date)
  showTime: string | null // 'HH:MM' or null
  doorsTime: string | null
  status: 'upcoming' | 'cancelled' | 'postponed'
  lastSeenAt: string | null // ISO timestamp
  firstMissingAt: string | null // ISO timestamp — always present for ?missing=true rows
  venueId: string
  venueName: string | null
  isSoldOut: boolean
}
```

No GET-side backend change is required for PR 2.

---

## Task Right-Sizing Rationale

10 implementation tasks + pre-PR pipeline. Each ends with an independently testable deliverable + commit. TDD where the primitive has interesting logic (chips formatting, row-menu wiring, missing-lib helpers, MissingTabContent action wiring); composition tasks (MissingRow, MissingTable, MissingMobile) commit visual-only changes with their wiring exercised through MissingTabContent's tests.

---

### Task 1: Extend PATCH `/v1/admin/events/:id` to accept `firstMissingAt: null`

**Files:**

- Modify: `apps/api/src/routes/admin/events.ts:266-309` (the PATCH `/:id` route)
- Modify: `apps/api/src/routes/admin/events.integration.test.ts` — new test cases

**Interfaces:**

- Consumes: existing PATCH route
- Produces: PATCH `/v1/admin/events/:id` accepts `{ firstMissingAt: null }` in the body, sets `events.first_missing_at = NULL`, returns the updated row.

- [ ] **Step 1: Locate the PATCH Zod schema**

Run: `grep -n "PATCH /v1/admin/events/:id" apps/api/src/routes/admin/events.ts`
Expected: line ~266.

- [ ] **Step 2: Extend the Zod body schema**

Find the body validator inside the PATCH route. Add `firstMissingAt` as the last field:

```ts
zValidator(
  'json',
  z.object({
    verified: z.boolean().optional(),
    status: z.enum(['upcoming', 'cancelled', 'postponed']).optional(),
    title: z.string().min(1).optional(),
    artist: z.string().min(1).optional(),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD')
      .optional(),
    doorsTime: z.string().nullable().optional(),
    showTime: z.string().nullable().optional(),
    ticketPriceMin: z.string().nullable().optional(),
    ticketPriceMax: z.string().nullable().optional(),
    genre: z.array(z.string()).nullable().optional(),
    // Admin "Dismiss" on the Missing tab — clears the stale-event flag so
    // the row falls out of the ?missing=true filter. The crawler will
    // re-stamp it if the event genuinely re-disappears on a future sweep.
    firstMissingAt: z.null().optional(),
  }),
),
```

The handler body (`db.update(events).set({ ...body, updatedAt: new Date() })`) needs no change — Drizzle will set the column to `null` when the spread includes `firstMissingAt: null`.

- [ ] **Step 3: Add integration test for Dismiss**

Open `apps/api/src/routes/admin/events.integration.test.ts`. Find an existing PATCH test (search for `PATCH /v1/admin/events`). Add a new `it()` block alongside it:

```ts
it('PATCH /:id clears firstMissingAt when given firstMissingAt: null', async () => {
  // Seed: insert one event with a non-null firstMissingAt
  const [seeded] = await testDb
    .insert(events)
    .values({
      id: 'test-evt-missing-1',
      title: 'Test Missing Show',
      artist: 'Test Artist',
      date: '2026-07-01',
      venueId: TEST_VENUE_ID,
      firstMissingAt: new Date('2026-06-15T03:00:00Z'),
      lastSeenAt: new Date('2026-06-14T03:00:00Z'),
      verified: true,
      status: 'upcoming',
    })
    .returning()
  expect(seeded.firstMissingAt).not.toBeNull()

  const res = await testApp.request(`/v1/admin/events/${seeded.id}`, {
    method: 'PATCH',
    headers: adminAuthHeaders(),
    body: JSON.stringify({ firstMissingAt: null }),
  })
  expect(res.status).toBe(200)
  const payload = await res.json()
  expect(payload.success).toBe(true)
  expect(payload.data.firstMissingAt).toBeNull()
})

it('PATCH /:id transitions status from upcoming to postponed', async () => {
  const [seeded] = await testDb
    .insert(events)
    .values({
      id: 'test-evt-postpone-1',
      title: 'Test Postpone Show',
      artist: 'Test Artist',
      date: '2026-07-02',
      venueId: TEST_VENUE_ID,
      verified: true,
      status: 'upcoming',
    })
    .returning()

  const res = await testApp.request(`/v1/admin/events/${seeded.id}`, {
    method: 'PATCH',
    headers: adminAuthHeaders(),
    body: JSON.stringify({ status: 'postponed' }),
  })
  expect(res.status).toBe(200)
  const payload = await res.json()
  expect(payload.data.status).toBe('postponed')
})

it('PATCH /:id transitions status to cancelled', async () => {
  const [seeded] = await testDb
    .insert(events)
    .values({
      id: 'test-evt-cancel-1',
      title: 'Test Cancel Show',
      artist: 'Test Artist',
      date: '2026-07-03',
      venueId: TEST_VENUE_ID,
      verified: true,
      status: 'upcoming',
    })
    .returning()

  const res = await testApp.request(`/v1/admin/events/${seeded.id}`, {
    method: 'PATCH',
    headers: adminAuthHeaders(),
    body: JSON.stringify({ status: 'cancelled' }),
  })
  expect(res.status).toBe(200)
  const payload = await res.json()
  expect(payload.data.status).toBe('cancelled')
})
```

**Note on test infra:** The integration test file already imports `testDb`, `testApp`, `adminAuthHeaders`, `TEST_VENUE_ID`. Verify by reading the top 50 lines of the file first; if it uses slightly different helper names, adapt the test to match.

- [ ] **Step 4: Run integration tests**

Run from the worktree root:

```bash
pnpm --filter @concert-crawl/api test
```

Expected: PASS, all existing tests + the 3 new ones green.

If the test DB isn't running, the test runner will skip the integration suite (per the project's pre-push hook pattern). In that case run `docker compose up -d` and re-run.

- [ ] **Step 5: Commit**

```bash
cd .worktrees/feat-admin-events-ui-pr2-missing-tab
git add apps/api/src/routes/admin/events.ts apps/api/src/routes/admin/events.integration.test.ts
git commit -m "feat(api): accept firstMissingAt:null on PATCH /v1/admin/events/:id"
```

---

### Task 2: Add tab + missing-tab copy strings

**Files:**

- Modify: `apps/web/src/components/admin/definitions/copy.ts` — inside the existing `review:` block, add `tabs.missing` (sibling of `eventFlags`/`prices`/`allEvents`) and a new `missing` sub-block.

**Interfaces:**

- Produces:
  - `ADMIN_COPY.review.tabs.missing: string`
  - `ADMIN_COPY.review.missing.{ bannerBody, headerTitle, flaggedCount, lastSeenLabel, actionPostponed, actionCancelled, actionDismiss, emptyHeading, emptyBody, mobileBannerBody }`
  - `ADMIN_COPY.review.missing.chipMissed: (count: number) => string`
  - `ADMIN_COPY.review.missing.chipCadence: string`
  - `ADMIN_COPY.review.missing.flaggedCountText: (count: number) => string`

- [ ] **Step 1: Add the Missing tab label inside `review.tabs`**

Find the existing `review.tabs` block (added in PR 1). Insert `missing` between `prices` and `allEvents` so the tab order in the UI follows the design's `Event flags · Prices · Missing · All events`:

```ts
    tabs: {
      eventFlags: 'Event flags',
      prices: 'Prices',
      missing: 'Missing',
      allEvents: 'All events',
      ariaLabel: 'Review sections',
      allEventsPlaceholderHeading: 'Coming soon',
      allEventsPlaceholderBody:
        'The full events browser lands in PR 4. For now, use Event flags for unverified items.',
    },
```

- [ ] **Step 2: Add the `missing` sub-block**

Add immediately after the closing brace of `tabs:` (so it sits alongside the other top-level `review` sub-blocks like `eventFlags`, `eventFlagRow`, etc.):

```ts
    missing: {
      headerTitle: 'Missing from crawl',
      flaggedCount: (count: number) => `${count} flagged`,
      bannerBody:
        "The crawler expected these in a venue's daily sweep but didn't find them. Usually a cancellation, postponement, or silent lineup change — sometimes just a crawl miss. They stay Upcoming until you act.",
      mobileBannerBody:
        'Expected in a daily sweep but not found. They stay Upcoming until you act.',
      lastSeenLabel: 'last seen',
      actionPostponed: 'Postponed',
      actionCancelled: 'Cancelled',
      actionDismiss: 'Dismiss',
      emptyHeading: "Nothing's gone missing.",
      emptyBody:
        'Every event the crawler expected showed up in the last sweep.',
      chipMissed: (count: number) =>
        `missed ${count} sweep${count === 1 ? '' : 's'}`,
      chipCadence: 'expected daily',
    },
```

- [ ] **Step 3: Verify typecheck still passes**

Run: `pnpm typecheck --filter @concert-crawl/web`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/admin/definitions/copy.ts
git commit -m "feat(admin): add Missing tab + missing-from-crawl copy strings"
```

---

### Task 3: `lib/admin/missing.ts` helpers (TDD)

**Files:**

- Create: `apps/web/src/lib/admin/missing.ts`
- Create: `apps/web/src/lib/admin/missing.test.ts`

**Interfaces:**

- Produces:

  ```ts
  export const computeMissedSweeps: (
    firstMissingAtIso: string,
    nowIso: string,
  ) => number
  export const formatLastSeen: (iso: string | null) => string
  ```

- [ ] **Step 1: Write the failing test**

```ts
// apps/web/src/lib/admin/missing.test.ts
import { describe, it, expect } from 'vitest'
import { computeMissedSweeps, formatLastSeen } from './missing'

describe('computeMissedSweeps', () => {
  it('returns the count of full days between firstMissingAt and now', () => {
    expect(
      computeMissedSweeps('2026-06-12T03:00:00Z', '2026-06-16T03:00:00Z'),
    ).toBe(4)
  })

  it('floors to at least 1 when the gap is shorter than a day', () => {
    expect(
      computeMissedSweeps('2026-06-16T02:00:00Z', '2026-06-16T05:00:00Z'),
    ).toBe(1)
  })

  it('never returns 0 or negative even if firstMissingAt is in the future', () => {
    expect(
      computeMissedSweeps('2026-06-20T03:00:00Z', '2026-06-16T03:00:00Z'),
    ).toBe(1)
  })
})

describe('formatLastSeen', () => {
  it('formats an ISO timestamp as MMM D (Mountain Time)', () => {
    expect(formatLastSeen('2026-06-12T20:00:00Z')).toBe('Jun 12')
  })

  it('returns an em-dash when given null', () => {
    expect(formatLastSeen(null)).toBe('—')
  })
})
```

- [ ] **Step 2: Run, expect failure**

Run: `pnpm --filter @concert-crawl/web exec vitest run lib/admin/missing.test.ts`
Expected: FAIL (module missing).

- [ ] **Step 3: Implement**

```ts
// apps/web/src/lib/admin/missing.ts
const MS_PER_DAY = 1000 * 60 * 60 * 24

/**
 * Number of daily sweeps an admin should believe the event has been missing.
 * Floors at 1 — a row is in the Missing tab because at least one sweep
 * didn't find it. We never want to render "missed 0 sweeps."
 */
export const computeMissedSweeps = (
  firstMissingAtIso: string,
  nowIso: string,
): number => {
  const firstMs = new Date(firstMissingAtIso).getTime()
  const nowMs = new Date(nowIso).getTime()
  const days = Math.floor((nowMs - firstMs) / MS_PER_DAY)
  return Math.max(1, days)
}

/**
 * Last-seen ISO timestamp formatted as e.g. "Jun 12" (Denver-local).
 */
export const formatLastSeen = (iso: string | null): string => {
  if (iso === null) return '—'
  const date = new Date(iso)
  return date.toLocaleDateString('en-US', {
    timeZone: 'America/Denver',
    month: 'short',
    day: 'numeric',
  })
}
```

- [ ] **Step 4: Run, verify pass**

Run: `pnpm --filter @concert-crawl/web exec vitest run lib/admin/missing.test.ts`
Expected: PASS, all 5 tests green.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/admin/missing.ts apps/web/src/lib/admin/missing.test.ts
git commit -m "feat(admin): add missing-tab helpers (computeMissedSweeps, formatLastSeen)"
```

---

### Task 4: `MissingChips` primitive (TDD)

**Files:**

- Create: `apps/web/src/components/admin/review/missing/MissingChips.tsx`
- Create: `apps/web/src/components/admin/review/missing/MissingChips.test.tsx`

**Interfaces:**

- Consumes: `ADMIN_COPY.review.missing.{ chipMissed, chipCadence }`, existing `StatusBadge` primitive from `components/admin/primitives`
- Produces:

  ```ts
  export interface MissingChipsProps {
    missedCount: number
  }
  export const MissingChips: (props: MissingChipsProps) => JSX.Element
  ```

- [ ] **Step 1: Write the failing test**

```tsx
// apps/web/src/components/admin/review/missing/MissingChips.test.tsx
// @vitest-environment jsdom

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MissingChips } from './MissingChips'

describe('MissingChips', () => {
  it('renders pluralised missed-sweep label and the cadence label', () => {
    render(<MissingChips missedCount={3} />)
    expect(screen.getByText('missed 3 sweeps')).toBeTruthy()
    expect(screen.getByText('expected daily')).toBeTruthy()
  })

  it('uses singular label when missed count is 1', () => {
    render(<MissingChips missedCount={1} />)
    expect(screen.getByText('missed 1 sweep')).toBeTruthy()
  })

  it('escalates the missed chip kind to danger at >= 4', () => {
    const { container } = render(<MissingChips missedCount={4} />)
    // The danger-kind StatusBadge sets data-kind="danger" on its root element.
    const dangerChip = container.querySelector('[data-kind="danger"]')
    expect(dangerChip).not.toBeNull()
  })
})
```

- [ ] **Step 2: Confirm `StatusBadge` exposes `data-kind`**

Run: `grep -n "data-kind\|StatusBadge" apps/web/src/components/admin/primitives/*.tsx | head -20`
Expected: if `StatusBadge` doesn't already render `data-kind`, find an alternative selector (e.g. inline-style background color comparison). If `data-kind` is absent, update the test to assert by element role/text + style.background containing `var(--danger)`.

(If `StatusBadge` doesn't expose `data-kind` and the test would otherwise need brittle style inspection, simplify the test to just assert: `<4 → warning chip text present`, `>=4 → danger chip text present` — both can be checked via the chip having the correct background `var(--warning)` vs `var(--danger)` using `element.style.background`.)

- [ ] **Step 3: Implement**

```tsx
// apps/web/src/components/admin/review/missing/MissingChips.tsx
'use client'

import { StatusBadge } from '@/components/admin/primitives'
import { ADMIN_COPY } from '@/components/admin/definitions/copy'

export interface MissingChipsProps {
  missedCount: number
}

export const MissingChips = ({ missedCount }: MissingChipsProps) => {
  const missedKind = missedCount >= 4 ? 'danger' : 'warning'
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      <StatusBadge kind={missedKind} variant="outline">
        {ADMIN_COPY.review.missing.chipMissed(missedCount)}
      </StatusBadge>
      <StatusBadge kind="neutral" variant="outline">
        {ADMIN_COPY.review.missing.chipCadence}
      </StatusBadge>
    </div>
  )
}
```

(If the existing `StatusBadge` doesn't accept a `mono` prop, omit it. The design source uses `mono` but our primitive may not. Verify with: `grep -n "StatusBadge" apps/web/src/components/admin/primitives/*.tsx | head -5`.)

- [ ] **Step 4: Run, verify pass**

Run: `pnpm --filter @concert-crawl/web exec vitest run MissingChips.test.tsx`
Expected: 3 tests green.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/admin/review/missing/MissingChips.tsx apps/web/src/components/admin/review/missing/MissingChips.test.tsx
git commit -m "feat(admin): add MissingChips primitive (missed-sweep + cadence chips)"
```

---

### Task 5: `MissingRowMenu` (TDD)

**Files:**

- Create: `apps/web/src/components/admin/review/missing/MissingRowMenu.tsx`
- Create: `apps/web/src/components/admin/review/missing/MissingRowMenu.test.tsx`

**Interfaces:**

- Consumes: existing `AdminButton` primitive; `ADMIN_COPY.review.missing.{ actionPostponed, actionCancelled, actionDismiss }`; lucide-react icons `Pause`, `X`, `Check`
- Produces:

  ```ts
  export interface MissingRowMenuProps {
    eventId: string
    onMarkPostponed: (id: string) => void
    onMarkCancelled: (id: string) => void
    onDismiss: (id: string) => void
    stacked?: boolean
    disabled?: boolean
  }
  export const MissingRowMenu: (props: MissingRowMenuProps) => JSX.Element
  ```

- [ ] **Step 1: Write the failing test**

```tsx
// apps/web/src/components/admin/review/missing/MissingRowMenu.test.tsx
// @vitest-environment jsdom

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MissingRowMenu } from './MissingRowMenu'

describe('MissingRowMenu', () => {
  it('renders three labeled buttons', () => {
    render(
      <MissingRowMenu
        eventId="evt-1"
        onMarkPostponed={() => {}}
        onMarkCancelled={() => {}}
        onDismiss={() => {}}
      />,
    )
    expect(screen.getByRole('button', { name: /Postponed/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Cancelled/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Dismiss/ })).toBeTruthy()
  })

  it('calls the matching handler with the eventId on click', () => {
    const onMarkPostponed = vi.fn()
    const onMarkCancelled = vi.fn()
    const onDismiss = vi.fn()
    render(
      <MissingRowMenu
        eventId="evt-42"
        onMarkPostponed={onMarkPostponed}
        onMarkCancelled={onMarkCancelled}
        onDismiss={onDismiss}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /Postponed/ }))
    fireEvent.click(screen.getByRole('button', { name: /Cancelled/ }))
    fireEvent.click(screen.getByRole('button', { name: /Dismiss/ }))
    expect(onMarkPostponed).toHaveBeenCalledWith('evt-42')
    expect(onMarkCancelled).toHaveBeenCalledWith('evt-42')
    expect(onDismiss).toHaveBeenCalledWith('evt-42')
  })

  it('disables all buttons when disabled=true', () => {
    render(
      <MissingRowMenu
        eventId="evt-1"
        onMarkPostponed={() => {}}
        onMarkCancelled={() => {}}
        onDismiss={() => {}}
        disabled
      />,
    )
    expect(
      screen
        .getByRole('button', { name: /Postponed/ })
        .hasAttribute('disabled'),
    ).toBe(true)
  })
})
```

- [ ] **Step 2: Run, expect failure**

Run: `pnpm --filter @concert-crawl/web exec vitest run MissingRowMenu.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement**

First verify the `AdminButton` signature:

```bash
grep -n "interface AdminButtonProps\|export const AdminButton" apps/web/src/components/admin/primitives/*.tsx | head -3
```

Expected: see whether it supports `variant`, `size`, `fullWidth`, `disabled`, and how it accepts icons (likely children or an `icon` prop).

```tsx
// apps/web/src/components/admin/review/missing/MissingRowMenu.tsx
'use client'

import { Pause, X, Check } from 'lucide-react'
import { AdminButton } from '@/components/admin/primitives'
import { ADMIN_COPY } from '@/components/admin/definitions/copy'

export interface MissingRowMenuProps {
  eventId: string
  onMarkPostponed: (id: string) => void
  onMarkCancelled: (id: string) => void
  onDismiss: (id: string) => void
  stacked?: boolean
  disabled?: boolean
}

export const MissingRowMenu = ({
  eventId,
  onMarkPostponed,
  onMarkCancelled,
  onDismiss,
  stacked = false,
  disabled = false,
}: MissingRowMenuProps) => (
  <div
    style={{
      display: 'flex',
      gap: 6,
      flexDirection: stacked ? 'column' : 'row',
      width: stacked ? '100%' : 'auto',
    }}
  >
    <AdminButton
      variant="outline"
      size="sm"
      fullWidth={stacked}
      disabled={disabled}
      onClick={() => onMarkPostponed(eventId)}
    >
      <Pause size={14} />
      {ADMIN_COPY.review.missing.actionPostponed}
    </AdminButton>
    <AdminButton
      variant="outline"
      size="sm"
      fullWidth={stacked}
      disabled={disabled}
      onClick={() => onMarkCancelled(eventId)}
    >
      <X size={14} />
      {ADMIN_COPY.review.missing.actionCancelled}
    </AdminButton>
    <AdminButton
      variant="ghost"
      size="sm"
      fullWidth={stacked}
      disabled={disabled}
      onClick={() => onDismiss(eventId)}
    >
      <Check size={14} />
      {ADMIN_COPY.review.missing.actionDismiss}
    </AdminButton>
  </div>
)
```

If `AdminButton` doesn't accept children + icon together (some primitives only allow one or the other), adapt: use `icon` prop if supported, or wrap label + icon in a span.

- [ ] **Step 4: Run, verify pass**

Run: `pnpm --filter @concert-crawl/web exec vitest run MissingRowMenu.test.tsx`
Expected: 3 tests green.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/admin/review/missing/MissingRowMenu.tsx apps/web/src/components/admin/review/missing/MissingRowMenu.test.tsx
git commit -m "feat(admin): add MissingRowMenu (Postponed/Cancelled/Dismiss buttons)"
```

---

### Task 6: `MissingRow` desktop composition

**Files:**

- Create: `apps/web/src/components/admin/review/missing/MissingRow.tsx`

**Interfaces:**

- Consumes: `MissingChips`, `MissingRowMenu`, `formatLastSeen`, `computeMissedSweeps` (from `lib/admin/missing.ts`)
- Produces:

  ```ts
  export interface MissingRowEvent {
    id: string
    title: string
    venueName: string | null
    date: string
    showTime: string | null
    lastSeenAt: string | null
    firstMissingAt: string // non-null for rows shown here
  }

  export interface MissingRowProps {
    event: MissingRowEvent
    nowIso: string
    onMarkPostponed: (id: string) => void
    onMarkCancelled: (id: string) => void
    onDismiss: (id: string) => void
    pending?: boolean
  }
  export const MissingRow: (props: MissingRowProps) => JSX.Element
  ```

- [ ] **Step 1: Implement**

```tsx
// apps/web/src/components/admin/review/missing/MissingRow.tsx
'use client'

import { ADMIN_COPY } from '@/components/admin/definitions/copy'
import { computeMissedSweeps, formatLastSeen } from '@/lib/admin/missing'
import { MissingChips } from './MissingChips'
import { MissingRowMenu } from './MissingRowMenu'

export interface MissingRowEvent {
  id: string
  title: string
  venueName: string | null
  date: string
  showTime: string | null
  lastSeenAt: string | null
  firstMissingAt: string
}

export interface MissingRowProps {
  event: MissingRowEvent
  nowIso: string
  onMarkPostponed: (id: string) => void
  onMarkCancelled: (id: string) => void
  onDismiss: (id: string) => void
  pending?: boolean
}

const formatDate = (date: string): string => {
  const parsed = new Date(date + 'T12:00:00')
  return parsed.toLocaleDateString('en-US', {
    timeZone: 'America/Denver',
    month: 'short',
    day: 'numeric',
  })
}

const formatTime = (showTime: string | null): string => {
  if (!showTime) return ''
  const [hh, mm] = showTime.split(':')
  const hours = parseInt(hh ?? '0', 10)
  const minutes = mm ?? '00'
  const meridiem = hours >= 12 ? 'PM' : 'AM'
  const display = hours % 12 || 12
  return ` ${display}:${minutes} ${meridiem}`
}

export const MissingRow = ({
  event,
  nowIso,
  onMarkPostponed,
  onMarkCancelled,
  onDismiss,
  pending = false,
}: MissingRowProps) => {
  const missed = computeMissedSweeps(event.firstMissingAt, nowIso)
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0,1fr) auto auto',
        gap: 18,
        alignItems: 'center',
        padding: '16px 18px',
        borderBottom: '1px solid var(--border)',
        opacity: pending ? 0.55 : 1,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 8,
            flexWrap: 'wrap',
          }}
        >
          <span
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 13.5,
              fontWeight: 600,
              color: 'var(--fg)',
              letterSpacing: '-0.005em',
            }}
          >
            {event.title}
          </span>
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              color: 'var(--fg-subtle)',
            }}
          >
            ·
          </span>
          <span
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 12,
              color: 'var(--fg-muted)',
            }}
          >
            {event.venueName ?? '—'}
          </span>
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              color: 'var(--fg-subtle)',
            }}
          >
            {formatDate(event.date)}
            {formatTime(event.showTime)}
          </span>
        </div>
        <MissingChips missedCount={missed} />
      </div>
      <div style={{ textAlign: 'right' }}>
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 9.5,
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--fg-subtle)',
          }}
        >
          {ADMIN_COPY.review.missing.lastSeenLabel}
        </div>
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 13,
            fontWeight: 700,
            color: 'var(--warning)',
            marginTop: 3,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {formatLastSeen(event.lastSeenAt)}
        </div>
      </div>
      <MissingRowMenu
        eventId={event.id}
        onMarkPostponed={onMarkPostponed}
        onMarkCancelled={onMarkCancelled}
        onDismiss={onDismiss}
        disabled={pending}
      />
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck --filter @concert-crawl/web`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/admin/review/missing/MissingRow.tsx
git commit -m "feat(admin): add MissingRow desktop composition"
```

---

### Task 7: `MissingTable` desktop list

**Files:**

- Create: `apps/web/src/components/admin/review/missing/MissingTable.tsx`

**Interfaces:**

- Consumes: `MissingRow`, `MissingRowEvent`; `ADMIN_COPY.review.missing.*`; lucide-react `AlertTriangle`, `Check` icons
- Produces:

  ```ts
  export interface MissingTableProps {
    events: MissingRowEvent[]
    nowIso: string
    onMarkPostponed: (id: string) => void
    onMarkCancelled: (id: string) => void
    onDismiss: (id: string) => void
    pendingIds: ReadonlySet<string>
  }
  export const MissingTable: (props: MissingTableProps) => JSX.Element
  ```

- [ ] **Step 1: Implement**

```tsx
// apps/web/src/components/admin/review/missing/MissingTable.tsx
'use client'

import { AlertTriangle, Check } from 'lucide-react'
import { ADMIN_COPY } from '@/components/admin/definitions/copy'
import { StatusBadge } from '@/components/admin/primitives'
import { MissingRow, type MissingRowEvent } from './MissingRow'

export interface MissingTableProps {
  events: MissingRowEvent[]
  nowIso: string
  onMarkPostponed: (id: string) => void
  onMarkCancelled: (id: string) => void
  onDismiss: (id: string) => void
  pendingIds: ReadonlySet<string>
}

export const MissingTable = ({
  events,
  nowIso,
  onMarkPostponed,
  onMarkCancelled,
  onDismiss,
  pendingIds,
}: MissingTableProps) => {
  if (events.length === 0) {
    return (
      <div
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 14,
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            background: 'color-mix(in oklab, var(--success) 14%, transparent)',
            color: 'var(--success)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Check size={18} />
        </div>
        <div>
          <div
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 14,
              fontWeight: 700,
              color: 'var(--fg)',
            }}
          >
            {ADMIN_COPY.review.missing.emptyHeading}
          </div>
          <div
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 12,
              color: 'var(--fg-muted)',
              marginTop: 2,
            }}
          >
            {ADMIN_COPY.review.missing.emptyBody}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '12px 18px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <span
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 14,
              fontWeight: 700,
              color: 'var(--fg)',
            }}
          >
            {ADMIN_COPY.review.missing.headerTitle}
          </span>
          <StatusBadge kind="danger">
            {ADMIN_COPY.review.missing.flaggedCount(events.length)}
          </StatusBadge>
        </div>
      </div>
      <div
        style={{
          padding: '11px 18px',
          borderBottom: '1px solid var(--border)',
          background: 'color-mix(in oklab, var(--warning) 7%, transparent)',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 10,
        }}
      >
        <AlertTriangle size={15} color="var(--warning)" />
        <span
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 12.5,
            color: 'var(--fg)',
            lineHeight: 1.5,
          }}
        >
          {ADMIN_COPY.review.missing.bannerBody}
        </span>
      </div>
      {events.map((event) => (
        <MissingRow
          key={event.id}
          event={event}
          nowIso={nowIso}
          onMarkPostponed={onMarkPostponed}
          onMarkCancelled={onMarkCancelled}
          onDismiss={onDismiss}
          pending={pendingIds.has(event.id)}
        />
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck --filter @concert-crawl/web`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/admin/review/missing/MissingTable.tsx
git commit -m "feat(admin): add MissingTable desktop list (banner + rows + empty)"
```

---

### Task 8: `MissingMobile` mobile card list

**Files:**

- Create: `apps/web/src/components/admin/review/missing/MissingMobile.tsx`

**Interfaces:**

- Consumes: `MissingChips`, `MissingRowMenu`, `formatLastSeen`, `computeMissedSweeps`, `ADMIN_COPY.review.missing.*`, lucide-react `AlertTriangle`, `Check`
- Produces:

  ```ts
  export interface MissingMobileProps {
    events: MissingRowEvent[]
    nowIso: string
    onMarkPostponed: (id: string) => void
    onMarkCancelled: (id: string) => void
    onDismiss: (id: string) => void
    pendingIds: ReadonlySet<string>
  }
  export const MissingMobile: (props: MissingMobileProps) => JSX.Element
  ```

  (`MissingRowEvent` is re-exported from `./MissingRow`.)

- [ ] **Step 1: Implement**

```tsx
// apps/web/src/components/admin/review/missing/MissingMobile.tsx
'use client'

import { AlertTriangle, Check } from 'lucide-react'
import { ADMIN_COPY } from '@/components/admin/definitions/copy'
import { computeMissedSweeps, formatLastSeen } from '@/lib/admin/missing'
import { MissingChips } from './MissingChips'
import { MissingRowMenu } from './MissingRowMenu'
import { type MissingRowEvent } from './MissingRow'

export interface MissingMobileProps {
  events: MissingRowEvent[]
  nowIso: string
  onMarkPostponed: (id: string) => void
  onMarkCancelled: (id: string) => void
  onDismiss: (id: string) => void
  pendingIds: ReadonlySet<string>
}

const formatDate = (date: string): string => {
  const parsed = new Date(date + 'T12:00:00')
  return parsed.toLocaleDateString('en-US', {
    timeZone: 'America/Denver',
    month: 'short',
    day: 'numeric',
  })
}

export const MissingMobile = ({
  events,
  nowIso,
  onMarkPostponed,
  onMarkCancelled,
  onDismiss,
  pendingIds,
}: MissingMobileProps) => {
  if (events.length === 0) {
    return (
      <div
        style={{
          padding: '24px 16px',
          borderRadius: 13,
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 12,
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            background: 'color-mix(in oklab, var(--success) 14%, transparent)',
            color: 'var(--success)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Check size={20} />
        </div>
        <div>
          <div
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 14,
              fontWeight: 700,
              color: 'var(--fg)',
            }}
          >
            {ADMIN_COPY.review.missing.emptyHeading}
          </div>
          <div
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 12,
              color: 'var(--fg-muted)',
              marginTop: 4,
            }}
          >
            {ADMIN_COPY.review.missing.emptyBody}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div
        style={{
          padding: '11px 13px',
          borderRadius: 11,
          background: 'color-mix(in oklab, var(--warning) 8%, transparent)',
          border:
            '1px solid color-mix(in oklab, var(--warning) 28%, transparent)',
          display: 'flex',
          gap: 9,
          alignItems: 'flex-start',
        }}
      >
        <AlertTriangle size={14} color="var(--warning)" />
        <span
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 12,
            color: 'var(--fg)',
            lineHeight: 1.5,
          }}
        >
          {ADMIN_COPY.review.missing.mobileBannerBody}
        </span>
      </div>
      {events.map((event) => {
        const missed = computeMissedSweeps(event.firstMissingAt, nowIso)
        const pending = pendingIds.has(event.id)
        return (
          <div
            key={event.id}
            style={{
              padding: 14,
              borderRadius: 13,
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              opacity: pending ? 0.55 : 1,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                gap: 10,
              }}
            >
              <div
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 14.5,
                  fontWeight: 700,
                  color: 'var(--fg)',
                  letterSpacing: '-0.01em',
                }}
              >
                {event.title}
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: 'var(--fg-subtle)',
                  }}
                >
                  {ADMIN_COPY.review.missing.lastSeenLabel}
                </div>
                <div
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 12.5,
                    fontWeight: 700,
                    color: 'var(--warning)',
                    marginTop: 2,
                  }}
                >
                  {formatLastSeen(event.lastSeenAt)}
                </div>
              </div>
            </div>
            <div
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 12,
                color: 'var(--fg-muted)',
                marginTop: 3,
              }}
            >
              {event.venueName ?? '—'} · {formatDate(event.date)}
            </div>
            <div style={{ margin: '12px 0' }}>
              <MissingChips missedCount={missed} />
            </div>
            <MissingRowMenu
              eventId={event.id}
              onMarkPostponed={onMarkPostponed}
              onMarkCancelled={onMarkCancelled}
              onDismiss={onDismiss}
              stacked
              disabled={pending}
            />
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck --filter @concert-crawl/web`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/admin/review/missing/MissingMobile.tsx
git commit -m "feat(admin): add MissingMobile card list for /admin/review mobile"
```

---

### Task 9: `MissingTabContent` orchestrator (with tests)

**Files:**

- Create: `apps/web/src/components/admin/review/_tabs/MissingTabContent.tsx`
- Create: `apps/web/src/components/admin/review/_tabs/MissingTabContent.test.tsx`

**Interfaces:**

- Consumes: `MissingTable`, `MissingMobile`, `type MissingRowEvent`
- Produces:
  ```ts
  export interface MissingTabContentProps {
    events: MissingRowEvent[]
    isDesktop: boolean
    onMarkPostponed: (id: string) => Promise<void>
    onMarkCancelled: (id: string) => Promise<void>
    onDismiss: (id: string) => Promise<void>
  }
  export const MissingTabContent: (props: MissingTabContentProps) => JSX.Element
  ```

This component is a presentational orchestrator: the _parent_ (`ReviewPageClient`) owns the missing-events list state and async action handlers; this component renders desktop OR mobile and manages a local `pendingIds` set for optimistic disable-on-click. Optimistic _remove_ of the row from the list happens in the parent (after `await` resolves on the handler, parent does `setMissingEvents(prev => prev.filter(...))`).

- [ ] **Step 1: Write the failing test**

```tsx
// apps/web/src/components/admin/review/_tabs/MissingTabContent.test.tsx
// @vitest-environment jsdom

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MissingTabContent } from './MissingTabContent'
import { type MissingRowEvent } from '../missing/MissingRow'

const NOW = '2026-06-16T03:00:00Z'

const SAMPLE: MissingRowEvent[] = [
  {
    id: 'evt-1',
    title: 'Lord Huron',
    venueName: 'Mission Ballroom',
    date: '2026-06-19',
    showTime: '20:00',
    lastSeenAt: '2026-06-12T03:00:00Z',
    firstMissingAt: '2026-06-13T03:00:00Z',
  },
]

describe('MissingTabContent', () => {
  it('renders the desktop table when isDesktop=true', () => {
    render(
      <MissingTabContent
        events={SAMPLE}
        isDesktop
        nowIso={NOW}
        onMarkPostponed={async () => {}}
        onMarkCancelled={async () => {}}
        onDismiss={async () => {}}
      />,
    )
    expect(screen.getByText('Lord Huron')).toBeTruthy()
    expect(screen.getByText('Missing from crawl')).toBeTruthy()
  })

  it('renders the mobile card list when isDesktop=false', () => {
    render(
      <MissingTabContent
        events={SAMPLE}
        isDesktop={false}
        nowIso={NOW}
        onMarkPostponed={async () => {}}
        onMarkCancelled={async () => {}}
        onDismiss={async () => {}}
      />,
    )
    expect(screen.getByText('Lord Huron')).toBeTruthy()
  })

  it('disables the row while a dismiss action is pending', async () => {
    let resolveDismiss: (() => void) | null = null
    const onDismiss = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveDismiss = resolve
        }),
    )
    render(
      <MissingTabContent
        events={SAMPLE}
        isDesktop
        nowIso={NOW}
        onMarkPostponed={async () => {}}
        onMarkCancelled={async () => {}}
        onDismiss={onDismiss}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /Dismiss/ }))
    await waitFor(() => {
      expect(onDismiss).toHaveBeenCalledWith('evt-1')
    })
    expect(
      screen.getByRole('button', { name: /Dismiss/ }).hasAttribute('disabled'),
    ).toBe(true)
    resolveDismiss?.()
  })
})
```

- [ ] **Step 2: Implement**

```tsx
// apps/web/src/components/admin/review/_tabs/MissingTabContent.tsx
'use client'

import { useCallback, useState } from 'react'
import { MissingTable } from '../missing/MissingTable'
import { MissingMobile } from '../missing/MissingMobile'
import { type MissingRowEvent } from '../missing/MissingRow'

export interface MissingTabContentProps {
  events: MissingRowEvent[]
  isDesktop: boolean
  nowIso: string
  onMarkPostponed: (id: string) => Promise<void>
  onMarkCancelled: (id: string) => Promise<void>
  onDismiss: (id: string) => Promise<void>
}

export const MissingTabContent = ({
  events,
  isDesktop,
  nowIso,
  onMarkPostponed,
  onMarkCancelled,
  onDismiss,
}: MissingTabContentProps) => {
  const [pendingIds, setPendingIds] = useState<ReadonlySet<string>>(new Set())

  const wrap = useCallback(
    (handler: (id: string) => Promise<void>) => (id: string) => {
      setPendingIds((prev) => new Set(prev).add(id))
      void handler(id).finally(() => {
        setPendingIds((prev) => {
          const next = new Set(prev)
          next.delete(id)
          return next
        })
      })
    },
    [],
  )

  const wrappedPostponed = wrap(onMarkPostponed)
  const wrappedCancelled = wrap(onMarkCancelled)
  const wrappedDismiss = wrap(onDismiss)

  if (isDesktop) {
    return (
      <MissingTable
        events={events}
        nowIso={nowIso}
        onMarkPostponed={wrappedPostponed}
        onMarkCancelled={wrappedCancelled}
        onDismiss={wrappedDismiss}
        pendingIds={pendingIds}
      />
    )
  }
  return (
    <MissingMobile
      events={events}
      nowIso={nowIso}
      onMarkPostponed={wrappedPostponed}
      onMarkCancelled={wrappedCancelled}
      onDismiss={wrappedDismiss}
      pendingIds={pendingIds}
    />
  )
}
```

- [ ] **Step 3: Run tests**

Run: `pnpm --filter @concert-crawl/web exec vitest run MissingTabContent.test.tsx`
Expected: 3 green.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/admin/review/_tabs/MissingTabContent.tsx apps/web/src/components/admin/review/_tabs/MissingTabContent.test.tsx
git commit -m "feat(admin): add MissingTabContent orchestrator with pending-action state"
```

---

### Task 10: Wire `ReviewPageClient` (desktop) + `AdminReviewMobile`

**Files:**

- Modify: `apps/web/src/components/admin/review/ReviewPageClient.tsx`
- Modify: `apps/web/src/components/admin/review/AdminReviewMobile.tsx`

This is the integration task — both desktop and mobile gain the Missing tab. Combined in one commit so the tab is reachable from both surfaces in a single step.

**Interfaces:**

- Consumes: `MissingTabContent`, `type MissingRowEvent`
- Produces: visible Missing tab on both desktop + mobile; backend PATCH calls for each action.

- [ ] **Step 1: Extend `ReviewTabKey` and validators in `ReviewPageClient.tsx`**

```tsx
type ReviewTabKey = 'event-flags' | 'prices' | 'missing' | 'all-events'

const VALID_TAB_KEYS: ReadonlySet<string> = new Set([
  'event-flags',
  'prices',
  'missing',
  'all-events',
])
```

The `resolveTabFromSearchParams` helper needs no change (still defaults to `event-flags`).

- [ ] **Step 2: Add missing-events state, lazy fetch, and action handlers**

Inside `ReviewPageClient`, near the other lazy-fetched state (alongside `priceEvents`), add:

```tsx
const [missingEvents, setMissingEvents] = useState<MissingRowEvent[]>([])
const [missingLoaded, setMissingLoaded] = useState(false)

const fetchMissingEvents = useCallback(async () => {
  try {
    const token = await getToken()
    if (!token) return
    const rows = await apiClient.get<MissingRowEvent[]>(
      '/v1/admin/events?missing=true&limit=200',
      token,
    )
    setMissingEvents(rows)
  } catch (err) {
    console.error('Failed to load missing events', err)
  } finally {
    setMissingLoaded(true)
  }
}, [getToken])

// Lazy-fetch on first activation of the missing tab.
useEffect(() => {
  if (activeTab === 'missing' && !missingLoaded) {
    void fetchMissingEvents()
  }
}, [activeTab, missingLoaded, fetchMissingEvents])

const patchMissingEvent = useCallback(
  async (id: string, body: Record<string, unknown>): Promise<void> => {
    const token = await getToken()
    if (!token) return
    await apiClient.patch(`/v1/admin/events/${id}`, token, body)
    setMissingEvents((prev) => prev.filter((ev) => ev.id !== id))
    router.refresh()
  },
  [getToken, router],
)

const markMissingPostponed = useCallback(
  (id: string) => patchMissingEvent(id, { status: 'postponed' }),
  [patchMissingEvent],
)
const markMissingCancelled = useCallback(
  (id: string) => patchMissingEvent(id, { status: 'cancelled' }),
  [patchMissingEvent],
)
const dismissMissing = useCallback(
  (id: string) => patchMissingEvent(id, { firstMissingAt: null }),
  [patchMissingEvent],
)
```

You'll need to add `MissingTabContent`, `type MissingRowEvent` to imports:

```tsx
import { MissingTabContent } from './_tabs/MissingTabContent'
import { type MissingRowEvent } from './missing/MissingRow'
```

- [ ] **Step 3: Add the Missing tab descriptor + render**

In the desktop `return`, extend the `tabs` array (insert between `prices` and `all-events`):

```tsx
const tabs: ReadonlyArray<ReviewTabDescriptor> = [
  {
    key: 'event-flags',
    label: ADMIN_COPY.review.tabs.eventFlags,
    count: events.length,
    kind: 'warning',
  },
  {
    key: 'prices',
    label: ADMIN_COPY.review.tabs.prices,
    count: submissions.length,
    kind: 'signal',
  },
  {
    key: 'missing',
    label: ADMIN_COPY.review.tabs.missing,
    count: missingEvents.length,
    kind: 'danger',
  },
  { key: 'all-events', label: ADMIN_COPY.review.tabs.allEvents },
]
```

Add the render branch alongside the other `activeTab === ...` branches:

```tsx
{
  activeTab === 'missing' && (
    <MissingTabContent
      events={missingEvents}
      isDesktop={isDesktop}
      nowIso={new Date().toISOString()}
      onMarkPostponed={markMissingPostponed}
      onMarkCancelled={markMissingCancelled}
      onDismiss={dismissMissing}
    />
  )
}
```

- [ ] **Step 4: Pass through to mobile in the mobile-render branch**

In the existing mobile branch, the props bag handed to `<AdminReviewMobile/>` already includes everything for flags + prices. Add the missing-events props:

```tsx
<AdminReviewMobile
  /* …existing props… */
  missingEvents={missingEvents}
  onMarkMissingPostponed={markMissingPostponed}
  onMarkMissingCancelled={markMissingCancelled}
  onDismissMissing={dismissMissing}
/>
```

- [ ] **Step 5: Extend `AdminReviewMobile.tsx`**

Update the props interface:

```tsx
import { MissingMobile } from './missing/MissingMobile'
import { type MissingRowEvent } from './missing/MissingRow'

interface AdminReviewMobileProps {
  /* …existing props… */
  missingEvents: MissingRowEvent[]
  onMarkMissingPostponed: (id: string) => Promise<void>
  onMarkMissingCancelled: (id: string) => Promise<void>
  onDismissMissing: (id: string) => Promise<void>
}
```

Extend the local activeTab state type from `'flags' | 'prices'` to `'flags' | 'prices' | 'missing'`. Extend the tab pill's tabs config:

```tsx
const TABS_CONFIG = [
  {
    key: 'flags',
    label: ADMIN_COPY.review.adminReviewMobile.tabEventFlags,
    count: events.length,
  },
  {
    key: 'prices',
    label: ADMIN_COPY.review.adminReviewMobile.tabPrices,
    count: priceCount,
  },
  {
    key: 'missing',
    label: ADMIN_COPY.review.tabs.missing,
    count: missingEvents.length,
  },
] as const
```

(Adjust to match the existing inline structure if it's not extracted.)

Add the rendered body for `missing`. Route mobile through `MissingTabContent` (same orchestrator desktop uses) so mobile gets pending-action disable parity for free:

```tsx
{
  activeTab === 'missing' && (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
      }}
    >
      <MissingTabContent
        events={missingEvents}
        isDesktop={false}
        nowIso={new Date().toISOString()}
        onMarkPostponed={onMarkMissingPostponed}
        onMarkCancelled={onMarkMissingCancelled}
        onDismiss={onDismissMissing}
      />
    </div>
  )
}
```

Update the imports at the top of `AdminReviewMobile.tsx`:

```tsx
import { MissingTabContent } from './_tabs/MissingTabContent'
import { type MissingRowEvent } from './missing/MissingRow'
```

(`MissingMobile` is no longer imported here — `MissingTabContent` already wraps it. Drop the direct import.)

- [ ] **Step 6: Run full sweep**

```bash
pnpm typecheck --filter @concert-crawl/web
pnpm lint --filter @concert-crawl/web
pnpm --filter @concert-crawl/web exec vitest run
```

Expected: all green.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/components/admin/review/ReviewPageClient.tsx apps/web/src/components/admin/review/AdminReviewMobile.tsx
git commit -m "feat(admin): wire Missing tab into ReviewPageClient + AdminReviewMobile"
```

---

## After all tasks — pre-PR pipeline

- [ ] **Rebase + full check pass**

```bash
cd .worktrees/feat-admin-events-ui-pr2-missing-tab
git fetch origin && git rebase origin/main
pnpm typecheck && pnpm lint
pnpm --filter @concert-crawl/web exec vitest run
pnpm --filter @concert-crawl/api test
```

All green. Don't push if any of these fail.

- [ ] **design-review skill before `gh pr create`**

Run Agent 1 on `design/design_handoff_admin_events/admin-missing.jsx` to enumerate properties for `MissingRow`, `MissingChips`, `MissingActions`, `MissingMobileCard`, `MissingSection`, and the empty state. Inline Agent 2 (verify implementation against the property table). Fix all gaps before push (per `feedback_address_all_valid_review_comments.md`).

- [ ] **Commit the plan doc**

```bash
git add docs/superpowers/plans/2026-06-18-admin-events-ui-pr2-missing-tab.md
git commit -m "docs(plan): commit PR 2 implementation plan"
```

- [ ] **Push**

```bash
git push -u origin feat/admin-events-ui-pr2-missing-tab
```

- [ ] **Open PR via `gh pr create`**

Use `.github/pull_request_template.md`. PR body should:

- Summarize Missing tab scope (4th tab on desktop, 3rd tab on mobile)
- List new env vars: **None** (per `feedback_env_vars_in_pr.md`)
- "How to test" section with the manual smoke steps
- Reference the spec: `docs/superpowers/specs/2026-06-18-admin-events-ui-design.md` (PR 2 row)
- NO Claude-generated footer (per `feedback_pr_no_claude_footer.md`)

- [ ] **Request Copilot review**

```bash
echo '{"reviewers":["copilot-pull-request-reviewer[bot]"]}' | \
  gh api -X POST repos/HartiganHM/concert-crawl/pulls/<PR_NUMBER>/requested_reviewers --input -
```

Verify response `requested_reviewers` includes `Copilot`.

- [ ] **Address Copilot feedback**

Per `feedback_address_all_valid_review_comments.md` — fix every valid comment, no triage round-trip. Reply on each thread with `Fixed in <sha>`. After fixes land, the user merges when ready (no per-PR manual gate per `feedback_admin_events_validation_at_end.md`).

---

## Self-Review

**Spec coverage:** PR 2 row in the spec table calls for:

- ✅ `MissingTabContent.tsx` (Task 9)
- ✅ `MissingTable.tsx` (Task 7)
- ✅ `MissingRow.tsx` (Task 6)
- ✅ `MissingRowMenu.tsx` (Task 5)
- ✅ Per-row actions: Mark postponed · Mark cancelled · Dismiss (Tasks 5 + 10)
- ✅ Empty state "Nothing's gone missing." (Tasks 7 + 8)
- ✅ Mobile variant (Tasks 8 + 10 Step 5)
- ✅ PATCH `/:id` accepts `firstMissingAt: null` for Dismiss (Task 1)
- ✅ No migration (none planned)
- ✅ Vitest: row menu wiring + Dismiss optimistic update (Tasks 5 + 9)
- ✅ Integration: 3 PATCH-status scenarios + Dismiss (Task 1)
- ✅ design-review gate before `gh pr create` (post-task pipeline)

**Placeholder scan:** No TBDs. Every step has working code or a verification command. The note about adapting `AdminButton`'s icon-handling (Task 5 Step 3) is a real branch in code based on inspection of an existing primitive — not a placeholder.

**Type consistency:** `MissingRowEvent` is defined in `MissingRow.tsx` (Task 6) and consumed by `MissingTable.tsx` (Task 7), `MissingMobile.tsx` (Task 8), `MissingTabContent.tsx` (Task 9), and `ReviewPageClient.tsx` (Task 10) — single source of truth, no shape drift. The `pendingIds: ReadonlySet<string>` shape is identical across `MissingTable` and `MissingMobile`. Tab key `'missing'` is spelled identically in all 4 places it appears.

**Mobile parity confirmed:** `AdminReviewMobile` renders the same `MissingTabContent` orchestrator (with `isDesktop={false}`) so mobile inherits the pending-action disable behavior from the orchestrator's local `pendingIds` state — no separate wiring needed.
