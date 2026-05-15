# Genre Chips on Browse Event Cards — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract genre chip rendering into a shared `GenreChips` component and add it to `EventCard`, replacing inline chip blocks in `HeroEventCard` and the event detail page.

**Architecture:** New `GenreChips` component owns all chip rendering logic. Three existing callsites replace their inline chip blocks with `<GenreChips />`. `EventCard` gets chips for the first time, placed inside the info column below the venue + time line.

**Tech Stack:** Next.js 14 App Router, React, Tailwind CSS, Vitest + React Testing Library

---

### Task 1: Create `GenreChips` component (TDD)

**Files:**

- Create: `apps/web/src/components/consumer/GenreChips.test.tsx`
- Create: `apps/web/src/components/consumer/GenreChips.tsx`

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/components/consumer/GenreChips.test.tsx`:

```tsx
// @vitest-environment jsdom

import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { GenreChips } from './GenreChips'

describe('GenreChips', () => {
  it('renders a chip for each genres', () => {
    render(<GenreChips genres={['pop', 'jazz']} />)
    expect(screen.getByText('pop')).toBeTruthy()
    expect(screen.getByText('jazz')).toBeTruthy()
  })

  it('renders nothing when genres is null', () => {
    const { container } = render(<GenreChips genres={null} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when genres is an empty array', () => {
    const { container } = render(<GenreChips genres={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('applies className to the container', () => {
    const { container } = render(
      <GenreChips genres={['rock']} className="mt-2" />,
    )
    expect(
      (container.firstChild as HTMLElement).classList.contains('mt-2'),
    ).toBe(true)
  })
})
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
pnpm --filter @concert-crawl/web test -- --run src/components/consumer/GenreChips.test.tsx
```

Expected: FAIL — `GenreChips` is not defined.

- [ ] **Step 3: Implement `GenreChips`**

Create `apps/web/src/components/consumer/GenreChips.tsx`:

```tsx
import { cn } from '@/lib/utils'

interface GenreChipsProps {
  genres: string[] | null
  className?: string
  maxChips?: number
}

export function GenreChips({ genres, className, maxChips }: GenreChipsProps) {
  if (!genres || genres.length === 0) return null

  const chips =
    maxChips != null ? genres.slice(0, Math.max(1, maxChips)) : genres

  return (
    <div className={cn('flex flex-wrap gap-1', className)}>
      {chips.map((tag) => (
        <span
          key={tag}
          className="rounded-[4px] bg-surface-3 px-[7px] py-[2px] text-fg-muted"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '9px',
            letterSpacing: '0.03em',
          }}
        >
          {tag}
        </span>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Run the test to confirm it passes**

```bash
pnpm --filter @concert-crawl/web test -- --run src/components/consumer/GenreChips.test.tsx
```

Expected: PASS — 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/consumer/GenreChips.tsx \
        apps/web/src/components/consumer/GenreChips.test.tsx
git commit -m "feat(consumer): add GenreChips shared component"
```

---

### Task 2: Update `HeroEventCard` to use `GenreChips`

**Files:**

- Modify: `apps/web/src/components/consumer/hero-event-card/HeroEventCard.tsx`

- [ ] **Step 1: Replace the inline chip block**

In `HeroEventCard.tsx`, replace lines 107–123:

```tsx
{
  event.genres && event.genres.length > 0 && (
    <div className="mt-2 flex flex-wrap gap-1">
      {event.genres.map((genres) => (
        <span
          key={genres}
          className="rounded-[4px] bg-surface-3 px-[7px] py-[2px] text-fg-muted"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '9px',
            letterSpacing: '0.03em',
          }}
        >
          {genres}
        </span>
      ))}
    </div>
  )
}
```

With:

```tsx
<GenreChips genres={event.genre} className="mt-2" />
```

- [ ] **Step 2: Add the import**

Add to the imports at the top of `HeroEventCard.tsx` (after the existing local imports):

```tsx
import { GenreChips } from '../GenreChips'
```

- [ ] **Step 3: Verify no type errors**

```bash
pnpm --filter @concert-crawl/web exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/consumer/hero-event-card/HeroEventCard.tsx
git commit -m "refactor(consumer): use GenreChips in HeroEventCard"
```

---

### Task 3: Update event detail page to use `GenreChips`

**Files:**

- Modify: `apps/web/src/app/(protected)/events/[id]/page.tsx`

- [ ] **Step 1: Replace the inline chip block**

In `apps/web/src/app/(protected)/events/[id]/page.tsx`, replace lines 168–184:

```tsx
{
  /* Genre chips */
}
{
  event.genres && event.genres.length > 0 && (
    <div className="mb-2 flex flex-wrap gap-1">
      {event.genres.map((genres) => (
        <span
          key={genres}
          className="rounded-[4px] bg-surface-3 px-2 py-[3px] text-fg-muted"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '9px',
            letterSpacing: '0.03em',
          }}
        >
          {genres}
        </span>
      ))}
    </div>
  )
}
```

With:

```tsx
{
  /* Genre chips */
}
;<GenreChips genres={event.genre} className="mb-2" />
```

- [ ] **Step 2: Add the import**

Add to the imports at the top of `page.tsx`:

```tsx
import { GenreChips } from '@/components/consumer/GenreChips'
```

- [ ] **Step 3: Verify no type errors**

```bash
pnpm --filter @concert-crawl/web exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add "apps/web/src/app/(protected)/events/[id]/page.tsx"
git commit -m "refactor(consumer): use GenreChips in event detail page"
```

---

### Task 4: Add `GenreChips` to `EventCard`

**Files:**

- Modify: `apps/web/src/components/consumer/event-card/EventCard.tsx`

- [ ] **Step 1: Add the import**

Add to the imports at the top of `EventCard.tsx` (after the existing local imports):

```tsx
import { GenreChips } from '../GenreChips'
```

- [ ] **Step 2: Add `GenreChips` below the venue + time line**

In `EventCard.tsx`, the info column ends at line 184 with the closing `</div>` after the venue+time `<p>`. Add `<GenreChips />` between the venue+time line and that closing tag:

```tsx
{
  /* Info */
}
;<div className="flex min-w-0 flex-1 flex-col">
  {isCancelled || isPostponed ? (
    <div className="flex items-center gap-2">
      <Link
        href={`/events/${event.id}`}
        className="truncate text-sm font-bold text-fg transition-colors hover:text-signal"
      >
        {event.artist}
      </Link>
      {isCancelled && (
        <Badge variant="destructive">{copy.cancelledLabel}</Badge>
      )}
      {isPostponed && <Badge variant="secondary">{copy.postponedLabel}</Badge>}
    </div>
  ) : (
    <Link
      href={`/events/${event.id}`}
      className="truncate text-sm font-bold text-fg transition-colors hover:text-signal"
    >
      {event.artist}
    </Link>
  )}
  {event.title !== event.artist && (
    <p className="truncate text-[12px] font-medium text-fg-muted">
      {event.title}
    </p>
  )}
  <p
    className="mt-0.5 flex items-center gap-1.5 text-fg-muted"
    style={{
      fontFamily: 'var(--font-mono)',
      fontSize: '9.5px',
      letterSpacing: '0.02em',
    }}
  >
    <Link
      href={`/venues/${event.venue.slug}`}
      data-testid="venue-name-link"
      className="hover:underline"
    >
      <span>{venueShort(event.venue.name)}</span>
    </Link>
    {showTime && (
      <>
        <span className="opacity-40">·</span>
        <span>{showTime}</span>
      </>
    )}
  </p>
  <GenreChips genres={event.genre} className="mt-1" maxChips={3} />
</div>
```

- [ ] **Step 3: Verify no type errors**

```bash
pnpm --filter @concert-crawl/web exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Run the full web test suite**

```bash
pnpm --filter @concert-crawl/web test -- --run
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/consumer/event-card/EventCard.tsx
git commit -m "feat(browse): show genres chips on all EventCard rows"
```

---

### Task 5: Push and open PR

- [ ] **Step 1: Rebase onto latest main**

```bash
git fetch origin && git rebase origin/main
```

- [ ] **Step 2: Push**

```bash
git push -u origin feat/genres-chips-browse
```

- [ ] **Step 3: Open PR**

```bash
gh pr create \
  --title "feat(browse): GenreChips component + genre tags on all event cards" \
  --body "$(cat <<'EOF'
## Summary

- Extracts genre chip rendering into a shared `GenreChips` component
- Adds genres chips to `EventCard` rows on the Browse page
- Replaces inline chip blocks in `HeroEventCard` and the event detail page with the shared component

Closes #341

## Test plan

- [ ] Browse page: event cards with genres show chips below venue + time line
- [ ] Browse page: event cards with no genres show no chip row (no empty gap)
- [ ] Spotlight: genres chips still render correctly
- [ ] Event detail page: genres chips still render correctly
- [ ] All existing tests pass
EOF
)"
```
