# Phase 5b-3 Visual Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all post-filter-redesign visual discrepancies across AppHeader, FilterBar, EventImage, date labels, and LoadMore button without changing any functional behaviour.

**Architecture:** Six targeted edits across existing files — no new pages, no new routes, no API changes. One new co-located component (`UserAvatar`) and one new co-located helper (`artist-gradient.ts`). All changes are purely styling or lightweight client-side reads.

**Tech Stack:** Next.js 14 App Router, Tailwind CSS v3, shadcn/ui, Clerk (`useUser`, `usePathname`), Vitest, oklch colour space (CSS-native)

---

## File Map

| Status | Path                                                                   | Change                                                                                                          |
| ------ | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Modify | `apps/web/src/components/consumer/app-header/AppHeader.tsx`            | Add `'use client'`, `usePathname` active-link logic, swap `<UserButton>` for `<UserAvatar>`, nav responsiveness |
| Create | `apps/web/src/components/consumer/app-header/UserAvatar.tsx`           | Custom initials avatar using `useUser()` from Clerk                                                             |
| Modify | `apps/web/src/components/consumer/filter-bar/FilterBar.tsx`            | `cursor-pointer` on chips/toggle, `hidden sm:flex` on toggle, horizontal-scroll on chip row                     |
| Create | `apps/web/src/components/consumer/event-image/artist-gradient.ts`      | Pure helper `getArtistGradientStyle(artist)`                                                                    |
| Create | `apps/web/src/components/consumer/event-image/artist-gradient.test.ts` | Vitest unit tests for the gradient helper                                                                       |
| Modify | `apps/web/src/components/consumer/event-image/EventImage.tsx`          | Use gradient helper in `Fallback`                                                                               |
| Modify | `apps/web/src/components/consumer/definitions/lib.ts`                  | `dateGroupLabel`: `weekday: 'long'` → `weekday: 'short'`                                                        |
| Modify | `apps/web/src/components/consumer/load-more/LoadMoreButton.tsx`        | Replace `buttonVariants({ variant: 'outline' })` with explicit token classes                                    |

---

## Task 1: UserAvatar component

**Files:**

- Create: `apps/web/src/components/consumer/app-header/UserAvatar.tsx`

- [ ] **Step 1: Create the component**

```tsx
'use client'

import { useUser } from '@clerk/nextjs'

export function UserAvatar() {
  const { user } = useUser()

  let initials = '?'
  if (user) {
    const first = user.firstName?.charAt(0) ?? ''
    const last = user.lastName?.charAt(0) ?? ''
    if (first || last) {
      initials = (first + last).toUpperCase()
    } else {
      initials = (
        user.emailAddresses[0]?.emailAddress.charAt(0) ?? '?'
      ).toUpperCase()
    }
  }

  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface-2">
      <span className="text-[13px] font-bold text-fg-muted">{initials}</span>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd apps/web && pnpm tsc --noEmit --project tsconfig.json 2>&1 | head -20
```

Expected: no errors for the new file.

---

## Task 2: AppHeader — active link styling, UserAvatar swap, nav responsiveness

**Files:**

- Modify: `apps/web/src/components/consumer/app-header/AppHeader.tsx`

The component is currently a server component. Adding `usePathname()` requires it to become a client component. `ThemeToggle`, `CCMark`, `Link` all work fine in client components.

- [ ] **Step 1: Rewrite AppHeader.tsx**

Replace the entire file contents with:

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ThemeToggle } from '../theme-toggle'
import { CCMark } from '../cc-mark'
import { UserAvatar } from './UserAvatar'

const NAV_TABS = [
  { label: 'Browse', href: '/events' },
  { label: 'Search', href: '/search' },
  { label: 'Saved', href: '/saved' },
] as const

export function AppHeader() {
  const pathname = usePathname()

  return (
    <header className="w-full">
      {/* ── Mobile bar (hidden sm+) ─────────────────────── */}
      <div className="flex items-center justify-between bg-bg px-4 pb-2.5 pt-[62px] sm:hidden">
        <Link href="/events" className="flex items-center gap-2">
          <CCMark size={28} />
          <span
            className="text-[17px] font-extrabold tracking-[-0.02em] text-fg"
            style={{ fontFamily: 'var(--font-ui)' }}
          >
            concert
            <span className="text-accent">crawl.</span>
          </span>
        </Link>
        <Link
          href="/search"
          aria-label="Search"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border-strong"
        >
          <Search size={16} className="text-fg-muted" strokeWidth={1.5} />
        </Link>
      </div>

      {/* ── Desktop TopNav (shown sm+) ──────────────────── */}
      <div className="sticky top-0 z-40 hidden h-16 w-full items-center justify-between border-b border-border bg-bg-elevated px-8 sm:flex">
        {/* Left: logo + nav tabs */}
        <div className="flex items-center gap-8">
          <Link href="/events" className="flex items-center gap-2.5">
            <div className="h-8 w-8 shrink-0 overflow-hidden rounded-[7px]">
              <CCMark size={32} />
            </div>
            <span
              className="text-[17px] font-extrabold tracking-[-0.02em] text-fg"
              style={{ fontFamily: 'var(--font-ui)' }}
            >
              concert<span className="text-accent">crawl.</span>
            </span>
          </Link>

          <nav className="flex gap-1 overflow-x-auto">
            {NAV_TABS.map((tab) => {
              const isActive = pathname === tab.href
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={cn(
                    'shrink-0 rounded-lg px-[14px] py-[8px] text-[13px] tracking-[-0.01em]',
                    isActive
                      ? 'bg-surface-2 font-bold text-fg'
                      : 'bg-transparent font-medium text-fg-muted',
                  )}
                >
                  {tab.label}
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Right: search bar + user avatar + theme */}
        <div className="flex items-center gap-3">
          <Link
            href="/search"
            className="flex h-9 w-[280px] items-center gap-2 rounded-lg border border-border bg-surface-1 px-3 text-fg-subtle"
          >
            <Search size={14} strokeWidth={1.5} />
            <span className="flex-1 text-[13px]">
              Search artists or venues…
            </span>
            <span
              className="rounded border border-border-strong px-1.5 py-0.5 text-[10px] text-fg-subtle"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              ⌘K
            </span>
          </Link>

          <UserAvatar />

          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd apps/web && pnpm tsc --noEmit --project tsconfig.json 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/consumer/app-header/UserAvatar.tsx \
        apps/web/src/components/consumer/app-header/AppHeader.tsx
git commit -m "feat: AppHeader active link styling, UserAvatar component, nav responsiveness"
```

---

## Task 3: FilterBar — cursor-pointer, hide toggle on mobile, horizontal chip scroll

**Files:**

- Modify: `apps/web/src/components/consumer/filter-bar/FilterBar.tsx`

Three changes, all in the JSX return:

1. The List/Cal toggle `<div>` wrapper: add `hidden sm:flex` (it currently has no responsive class).
2. The toggle `<button>` elements inside: add `cursor-pointer`.
3. The chips container `<div>`: change `flex-wrap` to `flex-nowrap overflow-x-auto scrollbar-none`.
4. The filter chip `<button>` elements: add `cursor-pointer`.
5. The "× Clear filters" `<button>`: add `cursor-pointer`.

- [ ] **Step 1: Hide List/Cal toggle on mobile**

In `FilterBar.tsx`, find the List/Cal toggle wrapper `<div>` at line 207:

```tsx
        <div
          className="inline-flex items-center"
          style={{
```

Change `"inline-flex items-center"` to `"hidden sm:inline-flex items-center"`:

```tsx
        <div
          className="hidden sm:inline-flex items-center"
          style={{
```

- [ ] **Step 2: Add cursor-pointer to toggle buttons**

Each toggle `<button>` (inside the map at line 223) has:

```tsx
className = 'inline-flex items-center gap-1.5 transition-colors'
```

Change to:

```tsx
className = 'inline-flex cursor-pointer items-center gap-1.5 transition-colors'
```

- [ ] **Step 3: Change chips container to horizontal scroll**

Find the chips container at line 249:

```tsx
      <div className="flex flex-wrap items-center gap-2">
```

Change to:

```tsx
      <div className="flex flex-nowrap items-center gap-2 overflow-x-auto scrollbar-none">
```

- [ ] **Step 4: Add cursor-pointer to filter chip buttons**

The filter chip `<button>` at line 260 has:

```tsx
className = 'inline-flex h-9 items-center gap-1.5 rounded-full border px-3'
```

Change to:

```tsx
className =
  'inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border px-3'
```

- [ ] **Step 5: Add cursor-pointer to Clear filters button**

The "× Clear filters" `<button>` at line 293 has:

```tsx
className =
  'inline-flex h-9 items-center gap-1 rounded-full border border-dashed border-border-strong px-3'
```

Change to:

```tsx
className =
  'inline-flex h-9 cursor-pointer items-center gap-1 rounded-full border border-dashed border-border-strong px-3'
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
cd apps/web && pnpm tsc --noEmit --project tsconfig.json 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/components/consumer/filter-bar/FilterBar.tsx
git commit -m "feat: FilterBar cursor-pointer, hide toggle on mobile, horizontal chip scroll"
```

---

## Task 4: Artist gradient helper — write tests first, then implement

**Files:**

- Create: `apps/web/src/components/consumer/event-image/artist-gradient.ts`
- Create: `apps/web/src/components/consumer/event-image/artist-gradient.test.ts`

The helper is a pure function — ideal for TDD.

The hash algorithm: sum of `charCodeAt` values for each character, then `% 10` to index into the hues array. Empty/undefined artist always maps to index 0 (hue 280).

Pre-computed values for tests:

- `''` → hash 0, index 0, hue 280
- `'Radiohead'` → R(82)+a(97)+d(100)+i(105)+o(111)+h(104)+e(101)+a(97)+d(100) = 897, 897 % 10 = 7, hue 180
- `'Wilco'` → W(87)+i(105)+l(108)+c(99)+o(111) = 510, 510 % 10 = 0, hue 280

- [ ] **Step 1: Write the failing tests**

Create `apps/web/src/components/consumer/event-image/artist-gradient.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { getArtistGradientStyle } from './artist-gradient'

describe('getArtistGradientStyle', () => {
  it('returns background and color style properties', () => {
    const style = getArtistGradientStyle('Radiohead')
    expect(style).toHaveProperty('background')
    expect(style).toHaveProperty('color')
  })

  it('background is a linear-gradient using oklch', () => {
    const { background } = getArtistGradientStyle('Radiohead')
    expect(background).toMatch(/^linear-gradient\(135deg, oklch/)
  })

  it('color is an oklch value', () => {
    const { color } = getArtistGradientStyle('Radiohead')
    expect(color).toMatch(/^oklch\(/)
  })

  it('is deterministic — same input always produces same output', () => {
    const a = getArtistGradientStyle('Radiohead')
    const b = getArtistGradientStyle('Radiohead')
    expect(a.background).toBe(b.background)
    expect(a.color).toBe(b.color)
  })

  it('uses hue 180 for Radiohead (hash 897, index 7)', () => {
    const { background } = getArtistGradientStyle('Radiohead')
    expect(background).toContain('oklch(0.35 0.08 180)')
    expect(background).toContain('oklch(0.22 0.06 220)')
  })

  it('falls back to hue 280 for empty string (index 0)', () => {
    const { background } = getArtistGradientStyle('')
    expect(background).toContain('oklch(0.35 0.08 280)')
  })

  it('falls back to hue 280 for undefined artist (index 0)', () => {
    const { background } = getArtistGradientStyle(
      undefined as unknown as string,
    )
    expect(background).toContain('oklch(0.35 0.08 280)')
  })

  it('different names with different hashes produce different gradients', () => {
    // 'Radiohead' → hue 180; 'Wilco' → hash 510, index 0, hue 280
    const r = getArtistGradientStyle('Radiohead')
    const w = getArtistGradientStyle('Wilco')
    expect(r.background).not.toBe(w.background)
  })
})
```

- [ ] **Step 2: Run tests — expect failure**

```bash
cd apps/web && pnpm vitest run src/components/consumer/event-image/artist-gradient.test.ts
```

Expected: FAIL — `Cannot find module './artist-gradient'`

- [ ] **Step 3: Create the implementation**

Create `apps/web/src/components/consumer/event-image/artist-gradient.ts`:

```ts
const HUES = [280, 200, 340, 160, 30, 220, 310, 180, 50, 260] as const

function artistHue(artist: string): number {
  if (!artist) return HUES[0]
  const hash = artist.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return HUES[hash % HUES.length]
}

export function getArtistGradientStyle(artist: string): {
  background: string
  color: string
} {
  const hue = artistHue(artist ?? '')
  return {
    background: `linear-gradient(135deg, oklch(0.35 0.08 ${hue}), oklch(0.22 0.06 ${hue + 40}))`,
    color: `oklch(0.75 0.12 ${hue})`,
  }
}
```

- [ ] **Step 4: Run tests — expect all pass**

```bash
cd apps/web && pnpm vitest run src/components/consumer/event-image/artist-gradient.test.ts
```

Expected: all 8 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/consumer/event-image/artist-gradient.ts \
        apps/web/src/components/consumer/event-image/artist-gradient.test.ts
git commit -m "feat: getArtistGradientStyle helper with tests"
```

---

## Task 5: EventImage — use gradient in Fallback

**Files:**

- Modify: `apps/web/src/components/consumer/event-image/EventImage.tsx`

The `Fallback` component currently renders `bg-surface-2 text-fg-subtle`. Replace with the gradient helper. The `fallbackInitial` prop carries the artist's first letter; we need the full artist name to compute the hash. Pass `artist` down instead of just `fallbackInitial`.

Looking at call sites: `EventCard.tsx` calls `<EventImage src={event.imageUrl} alt={event.artist} fallbackInitial={artistInitial(event.artist)} .../>`. We need to pass `artist` to `EventImage` so `Fallback` can compute the gradient.

- [ ] **Step 1: Rewrite EventImage.tsx**

Replace the entire file with:

```tsx
'use client'

import { useState } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { getArtistGradientStyle } from './artist-gradient'

interface EventImageProps {
  src: string | null
  alt: string
  artist?: string
  fallbackInitial?: string
  className?: string
  fill?: boolean
  sizes?: string
}

function Fallback({
  artist,
  fallbackInitial,
  alt,
  className,
}: {
  artist: string | undefined
  fallbackInitial: string | undefined
  alt: string
  className: string | undefined
}) {
  const gradientStyle = getArtistGradientStyle(artist ?? fallbackInitial ?? '')
  return (
    <div
      className={cn('flex items-center justify-center select-none', className)}
      style={gradientStyle}
      aria-label={alt}
    >
      <span className="text-2xl font-bold opacity-80">
        {fallbackInitial ?? '♪'}
      </span>
    </div>
  )
}

export function EventImage({
  src,
  alt,
  artist,
  fallbackInitial,
  className,
  fill = false,
  sizes,
}: EventImageProps) {
  const [errored, setErrored] = useState(false)

  if (!src || errored) {
    return (
      <Fallback
        artist={artist}
        fallbackInitial={fallbackInitial}
        alt={alt}
        className={className}
      />
    )
  }

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {fill ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes ?? '(max-width: 768px) 100vw, 50vw'}
          className="object-cover"
          loading="lazy"
          onError={() => setErrored(true)}
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          className="h-full w-full object-cover"
          loading="lazy"
          onError={() => setErrored(true)}
        />
      )}
      {/* image-tint overlay — blends hotlinked images into active theme */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'var(--image-tint)' }}
        aria-hidden
      />
    </div>
  )
}
```

- [ ] **Step 2: Update EventCard.tsx to pass artist prop**

In `apps/web/src/components/consumer/event-card/EventCard.tsx`, find the `<EventImage>` call (around line 34):

```tsx
<EventImage
  src={event.imageUrl}
  alt={event.artist}
  fallbackInitial={artistInitial(event.artist)}
  className="h-full w-full"
/>
```

Change to:

```tsx
<EventImage
  src={event.imageUrl}
  alt={event.artist}
  artist={event.artist}
  fallbackInitial={artistInitial(event.artist)}
  className="h-full w-full"
/>
```

- [ ] **Step 3: Check for other EventImage call sites and update them if needed**

```bash
grep -r "<EventImage" apps/web/src --include="*.tsx" -l
```

For each file found, check if it has an `artist` value available to pass. If the call site has access to an artist name, add the `artist` prop. If not (e.g. a venue detail page with no artist), omit it — the gradient helper falls back to hue 0 gracefully.

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd apps/web && pnpm tsc --noEmit --project tsconfig.json 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/consumer/event-image/EventImage.tsx \
        apps/web/src/components/consumer/event-card/EventCard.tsx
git commit -m "feat: EventImage hue-shifted gradient fallback"
```

---

## Task 6: dateGroupLabel — abbreviated weekday

**Files:**

- Modify: `apps/web/src/components/consumer/definitions/lib.ts`

- [ ] **Step 1: Update dateGroupLabel**

In `lib.ts`, find `dateGroupLabel` (line 70). The body calls `formatEventDate` with `weekday: 'long'`. Change to `weekday: 'short'`:

```ts
export function dateGroupLabel(dateStr: string, timezone = 'UTC'): string {
  if (isToday(dateStr, timezone)) return 'Tonight'
  if (isTomorrow(dateStr, timezone)) return 'Tomorrow'
  return formatEventDate(dateStr, timezone, {
    weekday: 'short',
    month: 'long',
    day: 'numeric',
  })
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd apps/web && pnpm tsc --noEmit --project tsconfig.json 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/consumer/definitions/lib.ts
git commit -m "fix: dateGroupLabel uses weekday short (Thu not Thursday)"
```

---

## Task 7: LoadMoreButton — token-based styling

**Files:**

- Modify: `apps/web/src/components/consumer/load-more/LoadMoreButton.tsx`

- [ ] **Step 1: Replace buttonVariants with explicit token classes**

Replace the entire file with:

```tsx
'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useTransition } from 'react'
import { cn } from '@/lib/utils'
import { copy } from '../definitions/copy'

interface LoadMoreButtonProps {
  currentOffset: number
  limit: number
  total: number
}

export function LoadMoreButton({
  currentOffset,
  limit,
  total,
}: LoadMoreButtonProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const nextOffset = currentOffset + limit
  const hasMore = nextOffset < total

  if (!hasMore) return null

  const handleLoadMore = () => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('offset', String(nextOffset))
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    })
  }

  return (
    <div className="flex justify-center pt-2">
      <button
        type="button"
        onClick={handleLoadMore}
        disabled={isPending}
        className={cn(
          'inline-flex h-10 items-center justify-center rounded-md border border-border-strong bg-surface-2 px-4 text-[13px] font-bold text-signal transition-colors',
          isPending && 'pointer-events-none opacity-60',
        )}
      >
        {isPending ? 'Loading…' : copy.loadMore}
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd apps/web && pnpm tsc --noEmit --project tsconfig.json 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/consumer/load-more/LoadMoreButton.tsx
git commit -m "fix: LoadMoreButton explicit token-based styling"
```

---

## Task 8: Full typecheck + lint pass

- [ ] **Step 1: Run full typecheck**

```bash
cd /Users/huey/Projects/concert-crawl && pnpm typecheck
```

Expected: no errors. Fix any type errors before proceeding.

- [ ] **Step 2: Run lint**

```bash
cd /Users/huey/Projects/concert-crawl && pnpm lint
```

Expected: no errors. Fix any lint errors before proceeding.

- [ ] **Step 3: Run test suite**

```bash
cd /Users/huey/Projects/concert-crawl && pnpm test
```

Expected: all tests pass including the new `artist-gradient.test.ts`.

- [ ] **Step 4: Commit any lint/type fixes** (if there were any)

```bash
git add -p
git commit -m "fix: typecheck and lint cleanup for phase 5b-3"
```

---

## Task 9: Manual visual verification

Start the dev server and verify at three viewport widths.

- [ ] **Step 1: Start dev server**

```bash
cd /Users/huey/Projects/concert-crawl && pnpm dev
```

Open http://localhost:3000/events

- [ ] **Step 2: Desktop (1280px)**

- Active "Browse" nav link shows `bg-surface-2` background and `font-bold` weight.
- Inactive links show `text-fg-muted` and no background.
- Top-right avatar shows user initials (not Clerk's default button).
- Filter chips have pointer cursor on hover.
- List/Cal toggle is visible and has pointer cursor.
- Date group headers show "Thu, January 15" format (not "Thursday, January 15").
- Load More button uses signal-coloured bold text on surface-2 background.

- [ ] **Step 3: Mobile (390px) — DevTools emulation**

- List/Cal toggle is hidden.
- Filter chips sit on a single horizontal scroll row (no wrapping).
- Mobile header shows logo + search icon (no nav tabs — expected, tabs only appear sm+).
- Artist thumbnail fallbacks show distinct hue-shifted gradients.

- [ ] **Step 4: Tablet (768px)**

- Nav tabs visible; active state applied.
- Filter bar shows toggle (≥ sm breakpoint).
- Chips scroll horizontally if overflowing.

- [ ] **Step 5: Mobile font sizes audit**

At 390px, compare each text element against the design mock in `/design/design_handoff_phase5b_screens/browse-home.jsx`. Only change sizes that are obviously mismatched. If nothing is clearly wrong, make no changes and proceed.

- [ ] **Step 6: Commit any font-size adjustments** (if any were needed)

```bash
git add <affected files>
git commit -m "fix: mobile font size adjustments from visual audit"
```

---

## Task 10: Push and open PR

- [ ] **Step 1: Push branch**

```bash
git push -u origin feat/phase-5b-3-visual-polish
```

- [ ] **Step 2: Open PR using the project template**

```bash
gh pr create \
  --title "feat: phase 5b-3 visual polish — nav active state, avatar, filter UX, gradients" \
  --body "$(cat .github/pull_request_template.md)"
```

Fill in the template body with a summary of each change area (AppHeader, FilterBar, EventImage, dateGroupLabel, LoadMoreButton).
