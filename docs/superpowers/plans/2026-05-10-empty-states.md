# Empty States Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the shared `EmptyState` component to the "hybrid" design from the design handoff, and wire it into every surface that renders zero results: browse list, browse calendar, venue page, and watching.

**Architecture:** Replace the minimal existing `EmptyState` with a new implementation matching the "hybrid" direction (mono status rail + bold headline + body + CTA stack). All four usage sites migrate to the new props API. `WatchingEmpty` is rewritten as a thin wrapper that forwards to `EmptyState`. Copy lives in `definitions/copy.ts`.

**Tech Stack:** Next.js 14+ App Router, React, TypeScript strict, CSS custom properties (design tokens `var(--font-ui)`, `var(--font-mono)`, `var(--accent)`, `var(--signal)`, `var(--warning)`, `var(--fg)`, `var(--fg-muted)`, `var(--fg-subtle)`, `var(--fg-on-accent)`, `var(--border)`, `var(--border-strong)`), Vitest + @testing-library/react.

---

## File Map

| Action | Path                                                               | Responsibility                      |
| ------ | ------------------------------------------------------------------ | ----------------------------------- |
| Modify | `apps/web/src/components/consumer/empty-state/EmptyState.tsx`      | New hybrid implementation           |
| Create | `apps/web/src/components/consumer/empty-state/EmptyState.test.tsx` | Component unit tests                |
| Modify | `apps/web/src/components/consumer/definitions/copy.ts`             | Empty state copy for all surfaces   |
| Modify | `apps/web/src/app/(protected)/events/page.tsx`                     | Browse list + calendar empty states |
| Modify | `apps/web/src/app/(protected)/venues/[slug]/page.tsx`              | Venue page empty state              |
| Modify | `apps/web/src/components/consumer/watching/WatchingEmpty.tsx`      | Rewrite using EmptyState            |

---

### Task 1: Rewrite EmptyState component

**Files:**

- Modify: `apps/web/src/components/consumer/empty-state/EmptyState.tsx`

The new EmptyState implements the "hybrid" design direction:

- **Status rail** — colored dot + mono eyebrow label left, hairline rule, mono status code right
- **Display headline** — heavy weight, tight tracking
- **Body text** — muted, readable line-height
- **CTAs** — primary pill (signal background) and optional secondary (dashed underline)

Accent color and rail-right code are driven by `state`:

- `no-data` → `var(--accent)`, `0 / 0`
- `filtered` → `var(--signal)`, `0 hits`
- `error` → `var(--warning)`, `err`

- [ ] **Step 1: Replace the file contents**

Replace `apps/web/src/components/consumer/empty-state/EmptyState.tsx` with:

```tsx
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface EmptyStateCta {
  label: string
  href?: string
  onClick?: () => void
}

export interface EmptyStateProps {
  state?: 'no-data' | 'filtered' | 'error'
  density?: 'default' | 'dense'
  eyebrow: string
  title: string
  body: string
  primaryCta?: EmptyStateCta
  secondaryCta?: EmptyStateCta
  className?: string
}

function EmptyStatePrimary({
  cta,
  dense,
}: {
  cta: EmptyStateCta
  dense: boolean
}) {
  const style: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    background: 'var(--signal)',
    color: 'var(--fg-on-accent)',
    borderRadius: 999,
    padding: dense ? '9px 16px' : '11px 20px',
    fontFamily: 'var(--font-ui)',
    fontSize: dense ? 12.5 : 13.5,
    fontWeight: 700,
    letterSpacing: '-0.005em',
    textDecoration: 'none',
    cursor: 'pointer',
    border: 'none',
  }
  if (cta.href) {
    return (
      <Link href={cta.href} style={style}>
        {cta.label}
      </Link>
    )
  }
  return (
    <button type="button" onClick={cta.onClick} style={style}>
      {cta.label}
    </button>
  )
}

function EmptyStateSecondary({
  cta,
  dense,
}: {
  cta: EmptyStateCta
  dense: boolean
}) {
  const style: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    background: 'transparent',
    color: 'var(--fg-muted)',
    padding: dense ? '8px 0' : '10px 0',
    fontFamily: 'var(--font-ui)',
    fontSize: dense ? 12 : 13,
    fontWeight: 600,
    letterSpacing: '-0.005em',
    textDecoration: 'none',
    cursor: 'pointer',
    border: 'none',
    borderBottom: '1px dashed var(--border-strong)',
    borderRadius: 0,
  }
  if (cta.href) {
    return (
      <Link href={cta.href} style={style}>
        {cta.label}
      </Link>
    )
  }
  return (
    <button type="button" onClick={cta.onClick} style={style}>
      {cta.label}
    </button>
  )
}

export function EmptyState({
  state = 'no-data',
  density = 'default',
  eyebrow,
  title,
  body,
  primaryCta,
  secondaryCta,
  className,
}: EmptyStateProps) {
  const dense = density === 'dense'
  const accent =
    state === 'error'
      ? 'var(--warning)'
      : state === 'filtered'
        ? 'var(--signal)'
        : 'var(--accent)'
  const railRight =
    state === 'error' ? 'err' : state === 'filtered' ? '0 hits' : '0 / 0'

  return (
    <div
      className={cn(className)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        justifyContent: 'center',
        gap: dense ? 10 : 14,
        padding: dense ? '28px 24px' : '52px 28px',
        fontFamily: 'var(--font-ui)',
        color: 'var(--fg)',
        maxWidth: dense ? 380 : 460,
        marginInline: 'auto',
        width: '100%',
      }}
    >
      {/* Status rail */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          width: '100%',
        }}
      >
        <span
          aria-hidden
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: accent,
            flexShrink: 0,
          }}
        />
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: dense ? 9 : 10,
            color: accent,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            fontWeight: 700,
            whiteSpace: 'nowrap',
          }}
        >
          {eyebrow}
        </div>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: dense ? 9 : 10,
            color: 'var(--fg-subtle)',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
          }}
        >
          {railRight}
        </div>
      </div>

      {/* Headline */}
      <div
        style={{
          fontSize: dense ? 26 : 38,
          fontWeight: 900,
          letterSpacing: dense ? '-0.03em' : '-0.035em',
          lineHeight: 1.0,
          color: 'var(--fg)',
        }}
      >
        {title}
      </div>

      {/* Body */}
      <div
        style={{
          fontSize: dense ? 12.5 : 14,
          color: 'var(--fg-muted)',
          lineHeight: 1.55,
          letterSpacing: '-0.005em',
          maxWidth: 380,
        }}
      >
        {body}
      </div>

      {/* CTAs */}
      {(primaryCta ?? secondaryCta) && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginTop: dense ? 4 : 8,
            flexWrap: 'wrap',
          }}
        >
          {primaryCta && <EmptyStatePrimary cta={primaryCta} dense={dense} />}
          {secondaryCta && (
            <EmptyStateSecondary cta={secondaryCta} dense={dense} />
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
pnpm --filter web typecheck
```

Expected: no errors on this file. (There will be errors in callers — those get fixed in later tasks.)

---

### Task 2: Write EmptyState tests

**Files:**

- Create: `apps/web/src/components/consumer/empty-state/EmptyState.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `apps/web/src/components/consumer/empty-state/EmptyState.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { EmptyState } from './EmptyState'

// Next.js Link renders as <a> in tests
vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    style,
  }: {
    href: string
    children: React.ReactNode
    style?: React.CSSProperties
  }) => (
    <a href={href} style={style}>
      {children}
    </a>
  ),
}))

describe('EmptyState', () => {
  it('renders eyebrow, title, and body', () => {
    render(
      <EmptyState
        eyebrow="Tonight"
        title="No shows tonight, grandpa."
        body="Slow night on the calendar."
      />,
    )
    expect(screen.getByText('Tonight')).toBeTruthy()
    expect(screen.getByText('No shows tonight, grandpa.')).toBeTruthy()
    expect(screen.getByText('Slow night on the calendar.')).toBeTruthy()
  })

  it('renders rail-right as "0 / 0" for no-data state', () => {
    render(
      <EmptyState
        state="no-data"
        eyebrow="Tonight"
        title="No shows"
        body="Nothing here."
      />,
    )
    expect(screen.getByText('0 / 0')).toBeTruthy()
  })

  it('renders rail-right as "0 hits" for filtered state', () => {
    render(
      <EmptyState
        state="filtered"
        eyebrow="Filtered"
        title="Crickets."
        body="Try widening your filters."
      />,
    )
    expect(screen.getByText('0 hits')).toBeTruthy()
  })

  it('renders rail-right as "err" for error state', () => {
    render(
      <EmptyState
        state="error"
        eyebrow="Failed to load"
        title="Signal lost."
        body="Try again."
      />,
    )
    expect(screen.getByText('err')).toBeTruthy()
  })

  it('renders primaryCta as Link when href is provided', () => {
    render(
      <EmptyState
        eyebrow="Watching"
        title="Empty queue."
        body="Nothing saved."
        primaryCta={{ label: 'Browse tonight', href: '/events' }}
      />,
    )
    const link = screen.getByRole('link', { name: 'Browse tonight' })
    expect(link.getAttribute('href')).toBe('/events')
  })

  it('renders primaryCta as button when onClick is provided', () => {
    const handleClick = vi.fn()
    render(
      <EmptyState
        eyebrow="Filtered"
        title="Crickets."
        body="Try widening."
        primaryCta={{ label: 'Clear filters', onClick: handleClick }}
      />,
    )
    expect(screen.getByRole('button', { name: 'Clear filters' })).toBeTruthy()
  })

  it('renders secondaryCta as Link when href is provided', () => {
    render(
      <EmptyState
        eyebrow="Filtered"
        title="Crickets."
        body="Try widening."
        secondaryCta={{ label: 'Clear filters', href: '/events' }}
      />,
    )
    const link = screen.getByRole('link', { name: 'Clear filters' })
    expect(link.getAttribute('href')).toBe('/events')
  })

  it('renders no CTA section when neither primaryCta nor secondaryCta is given', () => {
    render(
      <EmptyState
        eyebrow="Search"
        title="Type something."
        body="Artist or venue."
      />,
    )
    expect(screen.queryByRole('link')).toBeNull()
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('applies className to wrapper', () => {
    const { container } = render(
      <EmptyState
        eyebrow="Test"
        title="Test"
        body="Test"
        className="test-class"
      />,
    )
    expect(container.firstChild).toBeTruthy()
    expect(
      (container.firstChild as HTMLElement).classList.contains('test-class'),
    ).toBe(true)
  })
})
```

- [ ] **Step 2: Run tests to verify they pass**

```bash
pnpm --filter web test EmptyState
```

Expected: all 9 tests PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/consumer/empty-state/
git commit -m "feat(empty-state): implement hybrid design and add unit tests"
```

---

### Task 3: Update copy.ts with empty state copy

**Files:**

- Modify: `apps/web/src/components/consumer/definitions/copy.ts`

Add new copy keys for every surface. Remove `emptyTonight` and `emptyDate` (replaced by structured keys). Keep `venueNoShows` — it's used as the `body` prop on the venue page.

- [ ] **Step 1: Replace copy.ts contents**

```ts
export const copy = {
  // ── Browse — no-data (tonight / no filter active) ──────────────────
  emptyTonightEyebrow: 'Tonight',
  emptyTonightTitle: 'No shows tonight, grandpa.',
  emptyTonightBody:
    'Slow night on the calendar. Browse the rest of the week — usually picks up by the weekend.',

  // ── Browse — filtered (filter active, zero results) ────────────────
  emptyFilteredEyebrow: 'Filtered',
  emptyFilteredTitle: 'Crickets.',
  emptyFilteredBody:
    'These filters are airtight. Drop one, or stretch the dates a few days either side and try again.',
  emptyFilteredCta: 'Clear filters',

  // ── Browse — calendar (selected day has no events) ─────────────────
  emptyCalEyebrow: 'No shows',
  emptyCalTitle: 'Nothing on this day.',
  emptyCalBody: 'Try a different day or drop a filter.',

  // ── Venue ──────────────────────────────────────────────────────────
  venueEmptyEyebrow: 'Upcoming',
  venueEmptyTitle: 'Nothing booked yet.',
  venueNoShows:
    'No shows are scheduled at this venue right now. Check back soon.',

  // ── Watching ───────────────────────────────────────────────────────
  watchingEmptyEyebrow: 'Watching',
  watchingEmptyTitle: 'Empty queue.',
  watchingEmptyBody:
    "Bookmark a show and we'll watch its price for you — drops, spikes, sell-outs. We're patient.",
  watchingEmptyCta: "Browse tonight's shows",

  // ── Shared / misc ──────────────────────────────────────────────────
  loadMore: 'Load more shows',
  ticketsCta: 'Get tickets',
  doorsLabel: 'Doors',
  showLabel: 'Show',
  cancelledLabel: 'Cancelled',
  postponedLabel: 'Postponed',
  freeLabel: 'Free',
  venueUpcoming: 'Upcoming shows',
  heroTonight: 'Tonight',
  heroCommunityPick: 'Community Pick',
} as const
```

- [ ] **Step 2: Run typecheck to catch any removed keys still referenced**

```bash
pnpm --filter web typecheck
```

Expected: errors referencing `copy.emptyTonight`, `copy.emptyDate`, `copy.emptyFiltered` (old keys). These get fixed in Tasks 4–6.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/consumer/definitions/copy.ts
git commit -m "feat(empty-state): update copy.ts with structured empty state copy"
```

---

### Task 4: Wire browse page (list + calendar)

**Files:**

- Modify: `apps/web/src/app/(protected)/events/page.tsx`

Two changes: (a) update the list-view `EmptyState` call to the new API, (b) replace the bare `<p>` calendar empty state with `EmptyState`.

- [ ] **Step 1: Update the list-view empty state block**

In `apps/web/src/app/(protected)/events/page.tsx`, find:

```tsx
{
  events.length === 0 && view === 'list' && (
    <EmptyState
      message={isFiltered ? copy.emptyFiltered : copy.emptyTonight}
      {...(isFiltered
        ? { action: { label: copy.emptyFilteredCta, href: '/events' } }
        : {})}
    />
  )
}
```

Replace with:

```tsx
{
  events.length === 0 && view === 'list' && (
    <EmptyState
      state={isFiltered ? 'filtered' : 'no-data'}
      eyebrow={
        isFiltered ? copy.emptyFilteredEyebrow : copy.emptyTonightEyebrow
      }
      title={isFiltered ? copy.emptyFilteredTitle : copy.emptyTonightTitle}
      body={isFiltered ? copy.emptyFilteredBody : copy.emptyTonightBody}
      {...(isFiltered
        ? {
            secondaryCta: {
              label: copy.emptyFilteredCta,
              href: '/events',
            },
          }
        : {})}
    />
  )
}
```

- [ ] **Step 2: Replace the calendar bare `<p>` with EmptyState**

Find:

```tsx
{
  view === 'cal' && groups.size === 0 && (
    <p className="py-12 text-center text-sm text-fg-muted">
      No shows on this day.
    </p>
  )
}
```

Replace with:

```tsx
{
  view === 'cal' && groups.size === 0 && (
    <EmptyState
      state="no-data"
      density="dense"
      eyebrow={copy.emptyCalEyebrow}
      title={copy.emptyCalTitle}
      body={copy.emptyCalBody}
    />
  )
}
```

- [ ] **Step 3: Run typecheck**

```bash
pnpm --filter web typecheck
```

Expected: errors on this file are gone. Other files may still have errors (venue, watching — fixed in Tasks 5–6).

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/(protected)/events/page.tsx
git commit -m "feat(empty-state): wire browse list and calendar empty states"
```

---

### Task 5: Update venue page empty state

**Files:**

- Modify: `apps/web/src/app/(protected)/venues/[slug]/page.tsx`

- [ ] **Step 1: Update the EmptyState call**

In `apps/web/src/app/(protected)/venues/[slug]/page.tsx`, find:

```tsx
<EmptyState message={copy.venueNoShows} />
```

Replace with:

```tsx
<EmptyState
  state="no-data"
  density="dense"
  eyebrow={copy.venueEmptyEyebrow}
  title={copy.venueEmptyTitle}
  body={copy.venueNoShows}
/>
```

- [ ] **Step 2: Run typecheck**

```bash
pnpm --filter web typecheck
```

Expected: no errors on this file.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/(protected)/venues/[slug]/page.tsx
git commit -m "feat(empty-state): wire venue page empty state"
```

---

### Task 6: Rewrite WatchingEmpty

**Files:**

- Modify: `apps/web/src/components/consumer/watching/WatchingEmpty.tsx`

`WatchingEmpty` is rendered by both `WatchingRoute` (mobile) and `WatchingRouteDesktop`. Replace its bespoke implementation with a call to `EmptyState`.

- [ ] **Step 1: Replace WatchingEmpty.tsx**

```tsx
import { EmptyState } from '@/components/consumer/empty-state'
import { copy } from '@/components/consumer/definitions/copy'

export function WatchingEmpty() {
  return (
    <EmptyState
      state="no-data"
      eyebrow={copy.watchingEmptyEyebrow}
      title={copy.watchingEmptyTitle}
      body={copy.watchingEmptyBody}
      primaryCta={{ label: copy.watchingEmptyCta, href: '/events' }}
    />
  )
}
```

- [ ] **Step 2: Run typecheck**

```bash
pnpm --filter web typecheck
```

Expected: no errors. All usage sites now use the new API.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/consumer/watching/WatchingEmpty.tsx
git commit -m "feat(empty-state): rewrite WatchingEmpty using shared EmptyState"
```

---

### Task 7: Full quality gate

- [ ] **Step 1: Run typecheck across all apps**

```bash
pnpm --filter web typecheck
```

Expected: zero errors.

- [ ] **Step 2: Run lint**

```bash
pnpm --filter web lint
```

Expected: zero errors.

- [ ] **Step 3: Run all tests**

```bash
pnpm --filter web test
```

Expected: all tests pass including the 9 new EmptyState tests.

- [ ] **Step 4: Commit any lint fixes** (if any)

```bash
git add -A
git commit -m "fix(empty-state): address lint feedback"
```

Only needed if lint found issues.
