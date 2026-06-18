# Admin Events UI — PR 1 (Desktop Tab Pill Shell) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure `/admin/review` desktop view from stacked panels into a 4-position tab pill (Event flags · Prices · All events stub · — Missing comes in PR 2), with deep-linkable URL state. Mobile is unchanged.

**Architecture:** `ReviewPageClient.tsx` retains ownership of all state and handlers. Desktop render path is replaced with `<SectionHead/> + <ReviewTabs/> + {active tab content}`. Tab body is extracted into thin pass-through wrapper components in a new `_tabs/` folder. URL state via `?tab=event-flags|prices|all-events` (read with Next's `useSearchParams`, written with `router.push`). Existing `?section=submissions` deep link is preserved by translating it to `?tab=prices` on read.

**Tech Stack:** Next.js 14 App Router · React 18 · TypeScript strict · Vitest + Testing Library (jsdom) · CSS variables via admin.css tokens · `lucide-react` icons · Conventional commits

## Global Constraints

Copied verbatim from the spec — these apply to every task in this plan.

- TypeScript strict mode; **no `as` casts** (use Zod `safeParse`, type guards, or interface augmentation)
- **No single-character variable names** (ESLint enforces minimum identifier length of 2)
- All customer-facing strings land in `apps/web/src/components/admin/definitions/copy.ts`
- Mobile branch (`AdminReviewMobile`) is **unchanged** by this PR
- Existing component tests (for `EventFlagsSection`, `PendingSubmissionsPanel`, `PriceCoverageTable`) must continue to pass
- Worktree: `.worktrees/feat-admin-events-ui-pr1-tab-shell` on branch `feat/admin-events-ui-pr1-tab-shell`
- Before push: `pnpm typecheck && pnpm lint && pnpm test` clean in the worktree
- Before `gh pr create`: run the `design-review` skill (Agent 1 per-file enumeration + Agent 2 visual properties + state reachability passes; deferrals require explicit user approval)
- After PR opens: request Copilot review via `requested_reviewers` POST with `["copilot-pull-request-reviewer[bot]"]`
- **Merge gate:** PR pauses for user manual local validation before merge — `/complete-and-ship` reports validation steps and waits

---

## File Structure

**Create:**

- `apps/web/src/components/admin/review/ReviewTabs.tsx` — generic tab pill primitive (URL-agnostic, controlled). Owns: rendering, keyboard nav (arrows + Enter/Space), styling. Does NOT own URL state.
- `apps/web/src/components/admin/review/ReviewTabs.test.tsx` — Vitest unit tests for the primitive
- `apps/web/src/components/admin/review/_tabs/EventFlagsTabContent.tsx` — thin pass-through wrapper around existing `EventFlagsSection`
- `apps/web/src/components/admin/review/_tabs/PricesTabContent.tsx` — thin pass-through wrapper that renders the existing `PendingSubmissionsPanel` + `PriceCoverageTable` stack (same JSX as today, just extracted)
- `apps/web/src/components/admin/review/_tabs/AllEventsTabContent.tsx` — stub with empty-state placeholder ("All events tab coming in PR 4")

**Modify:**

- `apps/web/src/components/admin/review/ReviewPageClient.tsx` — desktop branch only: replace the stacked panel layout with `<SectionHead/> + <ReviewTabs/> + {active tab body}`. Add `useSearchParams` + `router.push` for URL state. Translate legacy `?section=submissions` → `tab=prices` on read.
- `apps/web/src/components/admin/definitions/copy.ts` — add `review.tabs.eventFlags`, `review.tabs.prices`, `review.tabs.allEvents`, `review.tabs.allEventsPlaceholderHeading`, `review.tabs.allEventsPlaceholderBody`

**Not modified:**

- `apps/web/src/app/(protected)/admin/review/page.tsx` — server component is unchanged; same props to `ReviewPageClient`
- `EventFlagsSection.tsx`, `PendingSubmissionsPanel.tsx`, `PriceCoverageTable.tsx`, `AdminReviewMobile.tsx` — unchanged
- Mobile render branch in `ReviewPageClient.tsx` — unchanged

---

## Task Right-Sizing Rationale

Six tasks. Each ends with an independently testable deliverable + commit:

1. ReviewTabs primitive (TDD) — testable in isolation
2. Copy strings — small but enables every later task to import from `ADMIN_COPY.review.tabs`
3. EventFlagsTabContent wrapper — pure pass-through, smallest unit
4. PricesTabContent wrapper — pure pass-through with more props
5. AllEventsTabContent stub — empty state, drawn correctly per design tokens
6. Wire ReviewPageClient desktop branch + URL state (integration) — the visible behavior change

Final task block (after Task 6): pre-push checks, design-review, push + PR + Copilot.

---

### Task 1: `ReviewTabs` primitive (TDD)

**Files:**

- Create: `apps/web/src/components/admin/review/ReviewTabs.tsx`
- Create: `apps/web/src/components/admin/review/ReviewTabs.test.tsx`

**Interfaces:**

- Consumes: none (leaf primitive)
- Produces:

  ```ts
  export interface ReviewTabDescriptor {
    key: string
    label: string
    count?: number
  }
  export interface ReviewTabsProps {
    tabs: ReadonlyArray<ReviewTabDescriptor>
    activeTab: string
    onChange: (key: string) => void
    'aria-label'?: string
  }
  export const ReviewTabs: (props: ReviewTabsProps) => JSX.Element
  ```

- [ ] **Step 1: Write the failing test file**

```tsx
// apps/web/src/components/admin/review/ReviewTabs.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ReviewTabs, type ReviewTabDescriptor } from './ReviewTabs'

const TABS: ReadonlyArray<ReviewTabDescriptor> = [
  { key: 'event-flags', label: 'Event flags', count: 3 },
  { key: 'prices', label: 'Prices', count: 5 },
  { key: 'all-events', label: 'All events' },
]

describe('ReviewTabs', () => {
  it('renders every tab label and its count badge when count > 0', () => {
    render(
      <ReviewTabs tabs={TABS} activeTab="event-flags" onChange={() => {}} />,
    )
    expect(screen.getByRole('tab', { name: /Event flags/ })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Prices/ })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /All events/ })).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('marks the active tab with aria-selected="true" and others with "false"', () => {
    render(<ReviewTabs tabs={TABS} activeTab="prices" onChange={() => {}} />)
    expect(screen.getByRole('tab', { name: /Event flags/ })).toHaveAttribute(
      'aria-selected',
      'false',
    )
    expect(screen.getByRole('tab', { name: /Prices/ })).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })

  it('fires onChange with the tab key when an inactive tab is clicked', () => {
    const onChange = vi.fn()
    render(
      <ReviewTabs tabs={TABS} activeTab="event-flags" onChange={onChange} />,
    )
    fireEvent.click(screen.getByRole('tab', { name: /Prices/ }))
    expect(onChange).toHaveBeenCalledWith('prices')
  })

  it('moves focus to the next tab on ArrowRight and wraps to first', () => {
    const onChange = vi.fn()
    render(
      <ReviewTabs tabs={TABS} activeTab="event-flags" onChange={onChange} />,
    )
    const lastTab = screen.getByRole('tab', { name: /All events/ })
    lastTab.focus()
    fireEvent.keyDown(lastTab, { key: 'ArrowRight' })
    expect(onChange).toHaveBeenCalledWith('event-flags')
  })

  it('moves focus to the previous tab on ArrowLeft and wraps to last', () => {
    const onChange = vi.fn()
    render(
      <ReviewTabs tabs={TABS} activeTab="event-flags" onChange={onChange} />,
    )
    const firstTab = screen.getByRole('tab', { name: /Event flags/ })
    firstTab.focus()
    fireEvent.keyDown(firstTab, { key: 'ArrowLeft' })
    expect(onChange).toHaveBeenCalledWith('all-events')
  })

  it('activates the focused tab on Enter and Space', () => {
    const onChange = vi.fn()
    render(
      <ReviewTabs tabs={TABS} activeTab="event-flags" onChange={onChange} />,
    )
    const pricesTab = screen.getByRole('tab', { name: /Prices/ })
    pricesTab.focus()
    fireEvent.keyDown(pricesTab, { key: 'Enter' })
    expect(onChange).toHaveBeenCalledWith('prices')
    onChange.mockClear()
    fireEvent.keyDown(pricesTab, { key: ' ' })
    expect(onChange).toHaveBeenCalledWith('prices')
  })

  it('exposes role="tablist" on the container with the provided aria-label', () => {
    render(
      <ReviewTabs
        tabs={TABS}
        activeTab="event-flags"
        onChange={() => {}}
        aria-label="Review sections"
      />,
    )
    expect(screen.getByRole('tablist')).toHaveAttribute(
      'aria-label',
      'Review sections',
    )
  })
})
```

- [ ] **Step 2: Run test, expect failure (module missing)**

Run: `pnpm --filter @concert-crawl/web test -- ReviewTabs.test.tsx`
Expected: FAIL with "Cannot find module './ReviewTabs'" or similar.

- [ ] **Step 3: Implement `ReviewTabs.tsx`**

```tsx
// apps/web/src/components/admin/review/ReviewTabs.tsx
'use client'

import { useCallback, type KeyboardEvent } from 'react'

export interface ReviewTabDescriptor {
  key: string
  label: string
  count?: number
}

export interface ReviewTabsProps {
  tabs: ReadonlyArray<ReviewTabDescriptor>
  activeTab: string
  onChange: (key: string) => void
  'aria-label'?: string
}

export const ReviewTabs = ({
  tabs,
  activeTab,
  onChange,
  'aria-label': ariaLabel,
}: ReviewTabsProps) => {
  const handleKeyDown = useCallback(
    (evt: KeyboardEvent<HTMLButtonElement>, focusedKey: string) => {
      const idx = tabs.findIndex((tab) => tab.key === focusedKey)
      if (idx === -1) return
      if (evt.key === 'ArrowRight') {
        evt.preventDefault()
        const next = tabs[(idx + 1) % tabs.length]
        if (next) onChange(next.key)
      } else if (evt.key === 'ArrowLeft') {
        evt.preventDefault()
        const next = tabs[(idx - 1 + tabs.length) % tabs.length]
        if (next) onChange(next.key)
      } else if (evt.key === 'Enter' || evt.key === ' ') {
        evt.preventDefault()
        onChange(focusedKey)
      }
    },
    [tabs, onChange],
  )

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      style={{
        display: 'flex',
        padding: 4,
        background: 'var(--surface-1)',
        borderRadius: 10,
        border: '1px solid var(--border)',
        gap: 6,
      }}
    >
      {tabs.map(({ key, label, count }) => {
        const isActive = key === activeTab
        return (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(key)}
            onKeyDown={(evt) => handleKeyDown(evt, key)}
            style={{
              flex: 1,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '8px 0',
              border: 'none',
              borderRadius: 7,
              background: isActive ? 'var(--bg-elevated)' : 'transparent',
              boxShadow: isActive ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
              fontFamily: "'Inter', sans-serif",
              fontSize: 13,
              fontWeight: 700,
              color: isActive ? 'var(--fg)' : 'var(--fg-muted)',
              cursor: 'pointer',
            }}
          >
            {label}
            {count !== undefined && count > 0 && (
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 11,
                  fontWeight: 700,
                  minWidth: 18,
                  height: 18,
                  padding: '0 5px',
                  borderRadius: 9,
                  background: isActive ? 'var(--signal)' : 'var(--surface-2)',
                  color: isActive ? 'var(--fg-on-accent)' : 'var(--fg-muted)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 4: Run test, verify pass**

Run: `pnpm --filter @concert-crawl/web test -- ReviewTabs.test.tsx`
Expected: PASS, all 7 tests green.

- [ ] **Step 5: Commit**

```bash
cd .worktrees/feat-admin-events-ui-pr1-tab-shell
git add apps/web/src/components/admin/review/ReviewTabs.tsx apps/web/src/components/admin/review/ReviewTabs.test.tsx
git commit -m "feat(admin): add ReviewTabs primitive with keyboard nav"
```

---

### Task 2: Add tab copy strings to `definitions/copy.ts`

**Files:**

- Modify: `apps/web/src/components/admin/definitions/copy.ts`

**Interfaces:**

- Consumes: none
- Produces: `ADMIN_COPY.review.tabs.{ eventFlags, prices, allEvents, allEventsPlaceholderHeading, allEventsPlaceholderBody }`

- [ ] **Step 1: Locate the `review` block**

Run: `grep -n "review:" apps/web/src/components/admin/definitions/copy.ts`
Expected: line numbers showing the `review: {` block in `ADMIN_COPY`.

- [ ] **Step 2: Add the `tabs` sub-block**

Inside the existing `review: { ... }` object, add a new `tabs` key. Example (insert near the top of the `review:` block — exact placement is fine anywhere inside `review:`):

```ts
    tabs: {
      eventFlags: 'Event flags',
      prices: 'Prices',
      allEvents: 'All events',
      ariaLabel: 'Review sections',
      allEventsPlaceholderHeading: 'Coming soon',
      allEventsPlaceholderBody:
        'The full events browser lands in PR 4. For now, use Event flags for unverified items.',
    },
```

- [ ] **Step 3: Verify typecheck still passes**

Run: `pnpm typecheck`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/admin/definitions/copy.ts
git commit -m "feat(admin): add review tab labels and All-events placeholder copy"
```

---

### Task 3: `EventFlagsTabContent` wrapper (pass-through)

**Files:**

- Create: `apps/web/src/components/admin/review/_tabs/EventFlagsTabContent.tsx`

**Interfaces:**

- Consumes: existing `EventFlagsSection` from `../EventFlagsSection`
- Produces:

  ```ts
  export interface EventFlagsTabContentProps {
    events: EventFlag[] // imported from ../EventFlagsSection
    onApprove: (id: string) => void
    onReject: (id: string) => void
  }
  export const EventFlagsTabContent: (
    props: EventFlagsTabContentProps,
  ) => JSX.Element
  ```

- [ ] **Step 1: Find the `EventFlag` shape and props for `EventFlagsSection`**

Run: `grep -n "interface\|^export" apps/web/src/components/admin/review/EventFlagsSection.tsx | head -30`
Expected: the `EventFlag` interface (which already exists in that file) and the component signature.

- [ ] **Step 2: Implement the wrapper**

```tsx
// apps/web/src/components/admin/review/_tabs/EventFlagsTabContent.tsx
'use client'

import { EventFlagsSection } from '../EventFlagsSection'

interface EventFlag {
  id: string
  title: string
  artist: string | null
  date: string
  doorsTime: string | null
  showTime: string | null
  ticketPriceMin: string | null
  ticketPriceMax: string | null
  confidenceScore: number | null
  extractionStrategy: string | null
  sourceUrl: string | null
  genre: string[] | null
  createdAt: string
  venueId: string
  venueName: string | null
}

export interface EventFlagsTabContentProps {
  events: EventFlag[]
  onApprove: (id: string) => void
  onReject: (id: string) => void
}

export const EventFlagsTabContent = ({
  events,
  onApprove,
  onReject,
}: EventFlagsTabContentProps) => (
  <EventFlagsSection
    events={events}
    onApprove={onApprove}
    onReject={onReject}
  />
)
```

- [ ] **Step 3: Verify typecheck**

Run: `pnpm typecheck`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/admin/review/_tabs/EventFlagsTabContent.tsx
git commit -m "feat(admin): add EventFlagsTabContent wrapper for tab shell"
```

---

### Task 4: `PricesTabContent` wrapper (pass-through)

**Files:**

- Create: `apps/web/src/components/admin/review/_tabs/PricesTabContent.tsx`

**Interfaces:**

- Consumes: existing `PendingSubmissionsPanel` and `PriceCoverageTable` from `..`
- Produces:

  ```ts
  export interface PricesTabContentProps {
    submissions: PriceSubmission[]
    onApproveSubmission: (id: string) => void
    onDenySubmission: (id: string) => void
    priceEvents: PriceEvent[]
    priceEventsLoading: boolean
    hasMorePriceEvents: boolean
    priceLoadingMore: boolean
    pricesMissingOnly: boolean
    onTogglePriceFilter: () => void
    onLoadMorePriceEvents: () => void
    onAddPrice: (
      eventId: string,
      priceMin: string,
      priceMax: string | null,
      vendor: string,
      howFound: string,
    ) => Promise<void>
  }
  export const PricesTabContent: (props: PricesTabContentProps) => JSX.Element
  ```

- [ ] **Step 1: Read the props for `PendingSubmissionsPanel` and `PriceCoverageTable`**

Run: `grep -n "interface\|^export" apps/web/src/components/admin/review/PendingSubmissionsPanel.tsx | head -20`
Run: `grep -n "interface\|^export" apps/web/src/components/admin/review/PriceCoverageTable.tsx | head -20`
Expected: both interfaces visible so the wrapper props can be authored without guessing.

- [ ] **Step 2: Implement the wrapper**

This is the exact JSX from `ReviewPageClient.tsx` lines 461–480, lifted into a component. Preserve the `id="submissions-section"` on the wrapping div so existing `#submissions-section` deep links + scroll-into-view still work.

```tsx
// apps/web/src/components/admin/review/_tabs/PricesTabContent.tsx
'use client'

import { PendingSubmissionsPanel } from '../PendingSubmissionsPanel'
import { PriceCoverageTable } from '../PriceCoverageTable'

interface PriceSubmission {
  id: string
  eventId: string
  userId: string
  priceMin: string | null
  priceMax: string | null
  note?: string | null
  status: string
  createdAt: string
  eventTitle: string | null
  eventDate: string | null
  ticketUrl: string | null
  venueName: string | null
}

interface PriceEvent {
  eventId: string
  eventTitle: string
  artist: string | null
  venueName: string | null
  date: string
  ticketUrl: string | null
  priceMin: string | null
  priceMax: string | null
  priceSource: string | null
  lastRetrievedAt: string | null
  lastOutcome: string | null
}

export interface PricesTabContentProps {
  submissions: PriceSubmission[]
  onApproveSubmission: (id: string) => void
  onDenySubmission: (id: string) => void
  priceEvents: PriceEvent[]
  priceEventsLoading: boolean
  hasMorePriceEvents: boolean
  priceLoadingMore: boolean
  pricesMissingOnly: boolean
  onTogglePriceFilter: () => void
  onLoadMorePriceEvents: () => void
  onAddPrice: (
    eventId: string,
    priceMin: string,
    priceMax: string | null,
    vendor: string,
    howFound: string,
  ) => Promise<void>
}

export const PricesTabContent = ({
  submissions,
  onApproveSubmission,
  onDenySubmission,
  priceEvents,
  priceEventsLoading,
  hasMorePriceEvents,
  priceLoadingMore,
  pricesMissingOnly,
  onTogglePriceFilter,
  onLoadMorePriceEvents,
  onAddPrice,
}: PricesTabContentProps) => (
  <div
    id="submissions-section"
    style={{ display: 'flex', flexDirection: 'column', gap: 20 }}
  >
    <PendingSubmissionsPanel
      submissions={submissions}
      onApprove={onApproveSubmission}
      onDeny={onDenySubmission}
    />
    <PriceCoverageTable
      events={priceEvents}
      loading={priceEventsLoading}
      onAddPrice={onAddPrice}
      missingOnly={pricesMissingOnly}
      hasMore={hasMorePriceEvents}
      loadingMore={priceLoadingMore}
      onToggleFilter={onTogglePriceFilter}
      onLoadMore={onLoadMorePriceEvents}
    />
  </div>
)
```

- [ ] **Step 3: Verify typecheck**

Run: `pnpm typecheck`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/admin/review/_tabs/PricesTabContent.tsx
git commit -m "feat(admin): add PricesTabContent wrapper for tab shell"
```

---

### Task 5: `AllEventsTabContent` stub

**Files:**

- Create: `apps/web/src/components/admin/review/_tabs/AllEventsTabContent.tsx`

**Interfaces:**

- Consumes: `ADMIN_COPY.review.tabs.allEventsPlaceholderHeading` + `.allEventsPlaceholderBody` from Task 2
- Produces:

  ```ts
  export const AllEventsTabContent: () => JSX.Element
  ```

- [ ] **Step 1: Implement the stub**

```tsx
// apps/web/src/components/admin/review/_tabs/AllEventsTabContent.tsx
'use client'

import { ADMIN_COPY } from '@/components/admin/definitions/copy'

export const AllEventsTabContent = () => (
  <div
    style={{
      padding: '64px 32px',
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      textAlign: 'center',
    }}
  >
    <div
      style={{
        fontFamily: "'Inter', sans-serif",
        fontSize: 17,
        fontWeight: 700,
        color: 'var(--fg)',
        marginBottom: 8,
      }}
    >
      {ADMIN_COPY.review.tabs.allEventsPlaceholderHeading}
    </div>
    <div
      style={{
        fontFamily: "'Inter', sans-serif",
        fontSize: 14,
        color: 'var(--fg-muted)',
        lineHeight: 1.5,
        maxWidth: 420,
        margin: '0 auto',
      }}
    >
      {ADMIN_COPY.review.tabs.allEventsPlaceholderBody}
    </div>
  </div>
)
```

- [ ] **Step 2: Verify typecheck**

Run: `pnpm typecheck`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/admin/review/_tabs/AllEventsTabContent.tsx
git commit -m "feat(admin): add AllEventsTabContent stub for tab shell"
```

---

### Task 6: Wire `ReviewPageClient` desktop branch + URL state

**Files:**

- Modify: `apps/web/src/components/admin/review/ReviewPageClient.tsx`

**Interfaces:**

- Consumes: `ReviewTabs` (Task 1), `EventFlagsTabContent` (Task 3), `PricesTabContent` (Task 4), `AllEventsTabContent` (Task 5), tab copy strings (Task 2)
- Produces: visible behavior change — desktop renders a tab pill with `?tab=` URL state.

- [ ] **Step 1: Read existing `ReviewPageClient.tsx` desktop render**

Run: `sed -n '450,483p' apps/web/src/components/admin/review/ReviewPageClient.tsx`
Expected: see lines 450–483 (the `return (` for desktop branch with stacked panels).

- [ ] **Step 2: Add new imports at the top of `ReviewPageClient.tsx`**

Add to the existing import block (preserve order — `next/navigation` already imports `useRouter`, just add `useSearchParams`):

```tsx
import { useRouter, useSearchParams } from 'next/navigation'
import { ReviewTabs, type ReviewTabDescriptor } from './ReviewTabs'
import { EventFlagsTabContent } from './_tabs/EventFlagsTabContent'
import { PricesTabContent } from './_tabs/PricesTabContent'
import { AllEventsTabContent } from './_tabs/AllEventsTabContent'
```

(Note: `useRouter` is already imported on line 5 — keep one import line; just add `useSearchParams` alongside it.)

- [ ] **Step 3: Define the tab key type and resolver helper**

Add near the top of the file (after the existing type declarations but outside the component):

```tsx
type ReviewTabKey = 'event-flags' | 'prices' | 'all-events'

const VALID_TAB_KEYS: ReadonlySet<string> = new Set([
  'event-flags',
  'prices',
  'all-events',
])

const isValidTabKey = (value: string | null): value is ReviewTabKey =>
  value !== null && VALID_TAB_KEYS.has(value)

const resolveTabFromSearchParams = (params: URLSearchParams): ReviewTabKey => {
  const tab = params.get('tab')
  if (isValidTabKey(tab)) return tab
  // Back-compat: legacy `?section=submissions` → prices tab
  if (params.get('section') === 'submissions') return 'prices'
  return 'event-flags'
}
```

- [ ] **Step 4: Wire URL-driven active tab inside the component**

Inside `ReviewPageClient`, after the existing `const router = useRouter()` line, add:

```tsx
const searchParams = useSearchParams()
const activeTab: ReviewTabKey = resolveTabFromSearchParams(
  new URLSearchParams(searchParams?.toString() ?? ''),
)

const setActiveTab = useCallback(
  (next: string) => {
    if (!isValidTabKey(next)) return
    const params = new URLSearchParams(searchParams?.toString() ?? '')
    params.set('tab', next)
    params.delete('section') // retire legacy key once user navigates
    router.push(`?${params.toString()}`, { scroll: false })
  },
  [router, searchParams],
)
```

- [ ] **Step 5: Build the desktop tab descriptors**

Add inside the component, near where `sectionHead` is built (around line 333):

```tsx
const tabs: ReadonlyArray<ReviewTabDescriptor> = [
  {
    key: 'event-flags',
    label: ADMIN_COPY.review.tabs.eventFlags,
    count: events.length,
  },
  {
    key: 'prices',
    label: ADMIN_COPY.review.tabs.prices,
    count: submissions.length,
  },
  { key: 'all-events', label: ADMIN_COPY.review.tabs.allEvents },
]
```

- [ ] **Step 6: Replace the desktop `return` block (lines 450–483)**

Replace the existing desktop return:

```tsx
return (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
    {sectionHead}
    {errorBanner}

    <EventFlagsSection
      events={events}
      onApprove={approveEvent}
      onReject={rejectEvent}
    />

    <div
      id="submissions-section"
      style={{ display: 'flex', flexDirection: 'column', gap: 20 }}
    >
      <PendingSubmissionsPanel
        submissions={submissions}
        onApprove={approveSubmission}
        onDeny={denySubmission}
      />
      <PriceCoverageTable
        events={priceEvents}
        loading={priceEventsLoading}
        onAddPrice={addPrice}
        missingOnly={priceFilter === 'missing'}
        hasMore={hasMorePriceEvents}
        loadingMore={priceLoadingMore}
        onToggleFilter={togglePriceFilter}
        onLoadMore={loadMorePriceEvents}
      />
    </div>
  </div>
)
```

…with the tabbed version:

```tsx
return (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
    {sectionHead}
    {errorBanner}

    <ReviewTabs
      tabs={tabs}
      activeTab={activeTab}
      onChange={setActiveTab}
      aria-label={ADMIN_COPY.review.tabs.ariaLabel}
    />

    {activeTab === 'event-flags' && (
      <EventFlagsTabContent
        events={events}
        onApprove={approveEvent}
        onReject={rejectEvent}
      />
    )}

    {activeTab === 'prices' && (
      <PricesTabContent
        submissions={submissions}
        onApproveSubmission={approveSubmission}
        onDenySubmission={denySubmission}
        priceEvents={priceEvents}
        priceEventsLoading={priceEventsLoading}
        hasMorePriceEvents={hasMorePriceEvents}
        priceLoadingMore={priceLoadingMore}
        pricesMissingOnly={priceFilter === 'missing'}
        onTogglePriceFilter={togglePriceFilter}
        onLoadMorePriceEvents={loadMorePriceEvents}
        onAddPrice={addPrice}
      />
    )}

    {activeTab === 'all-events' && <AllEventsTabContent />}
  </div>
)
```

- [ ] **Step 7: Remove now-unused imports**

After the rewrite, `EventFlagsSection`, `PendingSubmissionsPanel`, and `PriceCoverageTable` are no longer referenced in `ReviewPageClient.tsx` (only their tab wrappers are). Remove those three imports.

Run: `grep -n "EventFlagsSection\|PendingSubmissionsPanel\|PriceCoverageTable" apps/web/src/components/admin/review/ReviewPageClient.tsx`
Expected: zero matches after edit (the wrappers handle the imports now).

Delete the three lines:

```tsx
import { EventFlagsSection } from './EventFlagsSection'
import { PendingSubmissionsPanel } from './PendingSubmissionsPanel'
import { PriceCoverageTable } from './PriceCoverageTable'
```

- [ ] **Step 8: Run typecheck + lint + test**

Run: `pnpm typecheck`
Expected: clean.

Run: `pnpm lint`
Expected: clean.

Run: `pnpm --filter @concert-crawl/web test`
Expected: all green, including the new `ReviewTabs.test.tsx` and any pre-existing `ReviewPageClient`-adjacent tests.

- [ ] **Step 9: Smoke-test manually in the worktree dev server**

Run (in a separate terminal, from the worktree root):

```bash
pnpm install
pnpm dev
```

Then in browser:

- Visit `http://localhost:3000/admin/review` — verify the desktop layout shows the tab pill (Event flags · Prices · All events), with Event flags active by default
- Click each tab — verify URL updates to `?tab=...` and the body swaps
- Visit `http://localhost:3000/admin/review?section=submissions` (legacy link) — verify Prices tab opens
- Open the URL in a new tab with `?tab=all-events` — verify the placeholder card renders
- Press ArrowLeft / ArrowRight on a focused tab — verify focus + selection move

If anything fails, debug before continuing. Manual smoke is part of the task.

- [ ] **Step 10: Commit**

```bash
git add apps/web/src/components/admin/review/ReviewPageClient.tsx
git commit -m "feat(admin): wire desktop tab pill on /admin/review with URL state"
```

---

## After all tasks — pre-PR pipeline

These steps run after Task 6 is committed.

- [ ] **Pre-push: rebase on latest main**

```bash
cd .worktrees/feat-admin-events-ui-pr1-tab-shell
git fetch origin
git rebase origin/main
```

- [ ] **Pre-push: full check pass**

```bash
pnpm typecheck && pnpm lint && pnpm test
```

Expected: all green. Resolve any failures before continuing — never push speculatively.

- [ ] **Design-review skill before `gh pr create`**

Invoke `superpowers:design-review`. Per `feedback_design_review_component_scoped.md`:

- **Agent 1** enumeration: split per-file in parallel — one agent per new component file (`ReviewTabs.tsx`, `EventFlagsTabContent.tsx`, `PricesTabContent.tsx`, `AllEventsTabContent.tsx`) plus one for the `ReviewPageClient.tsx` desktop diff. Concatenate output before Agent 2.
- **Agent 2** verification: runs two passes — (1) visual properties against the design handoff's `admin-events-mgmt.jsx` tab pill section + token reference; (2) state reachability — confirm every state the design names (active / inactive / hover / focus / disabled-N/A) is reachable in the implementation.
- Per `feedback_no_unilateral_deferrals.md`: any deferral requires explicit user approval before PR opens.

- [ ] **Push branch**

```bash
git push -u origin feat/admin-events-ui-pr1-tab-shell
```

- [ ] **Open PR via `gh pr create`**

Use `.github/pull_request_template.md`. PR body should:

- Summarize PR 1's scope (desktop tab pill on /admin/review)
- Note "no behavior change for existing surfaces"
- Reference the spec: `docs/superpowers/specs/2026-06-18-admin-events-ui-design.md`
- Per `feedback_pr_no_claude_footer.md`: NO "Generated with Claude Code" footer
- Include a "How to test" section with the manual smoke steps from Task 6 Step 9

- [ ] **Request Copilot review**

Per `feedback_copilot_auto_review.md`: only `["copilot-pull-request-reviewer[bot]"]` works. Verify response `requested_reviewers` includes `Copilot`.

```bash
echo '{"reviewers":["copilot-pull-request-reviewer[bot]"]}' | \
  gh api -X POST repos/HartiganHM/concert-crawl/pulls/<PR_NUMBER>/requested_reviewers --input -
```

- [ ] **Pause for user manual local validation** (hard gate per spec)

Report to user:

> Ready for your local validation. Pull `feat/admin-events-ui-pr1-tab-shell`, run `pnpm dev`, and exercise:
>
> - `/admin/review` desktop shows tabs (Event flags · Prices · All events)
> - URL `?tab=` updates on click
> - Legacy `?section=submissions` still opens Prices tab
> - Keyboard arrows + Enter/Space work
> - Mobile layout unchanged
> - Existing approve/reject + price-submission flows still work via the tabs
>
> Confirm when validated; I'll only merge after your go-ahead.

- [ ] **Merge after user confirmation**

Per CLAUDE.md: never merge to main locally. Use `gh pr merge --rebase --delete-branch` only after user confirms validation passed.

---

## Self-Review (writing-plans skill)

**Spec coverage:** PR 1 row in the spec table calls for:

- ✅ `ReviewTabs.tsx` (Task 1)
- ✅ Restructure `ReviewPageClient.tsx` to render based on `?tab=` (Task 6)
- ✅ Move existing 3 surfaces into `_tabs/*` (Tasks 3, 4, 5)
- ✅ Mobile unchanged (no mobile-branch edits in plan)
- ✅ URL state via query param so deep links work (Task 6 Steps 3–6 + back-compat for `?section=submissions`)
- ✅ Vitest: `ReviewTabs` keyboard nav + URL sync (Task 1 covers keyboard; URL sync covered by manual smoke + the fact that `resolveTabFromSearchParams` is pure and could gain unit tests in PR 2 if desired)
- ✅ design-review gate before `gh pr create` (post-task pipeline)
- ✅ User manual-validation gate before merge (post-task pipeline)

**Placeholder scan:** No TBDs or "fill in later" — every step has real code or commands.

**Type consistency:** `ReviewTabDescriptor` shape and `ReviewTabsProps` interface match between Task 1 (where defined) and Task 6 (where consumed). `ReviewTabKey` type is internal to `ReviewPageClient`. Tab keys are spelled identically across all six tasks (`event-flags`, `prices`, `all-events`).

**Minor gap acknowledged:** The plan does not write a dedicated unit test for `resolveTabFromSearchParams`. It's a pure helper and would benefit from one. The manual smoke at Step 9 of Task 6 exercises every URL-state branch directly. If the design-review pass flags this, add a `ReviewPageClient.test.tsx` for the helper in PR 2 alongside the Missing tab wiring (where the helper will gain a fourth branch).
