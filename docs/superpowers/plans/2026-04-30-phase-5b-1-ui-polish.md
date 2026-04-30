# Phase 5b-1: UI Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply hi-fi design polish to the consumer-facing browse, event detail, and venue profile pages, matching the design handoff at `design/design_handoff_phase5b_screens/`.

**Architecture:** Component-by-component pass in a fixed order (infrastructure → shared components → page-level). New components live under `apps/web/src/components/consumer/`. Pages are refactored in-place. No backend changes — missing data fields (venue address, type, capacity, event ages) use fallback values.

**Tech Stack:** Next.js 14 App Router, Tailwind CSS, shadcn/ui, Lucide React, Vitest (unit), `pnpm` monorepo.

**Design reference:** `design/design_handoff_phase5b_screens/browse-home.jsx`, `detail-screens.jsx`, `detail-desktop.jsx`.

**Branch:** `feat/phase-5b-design-polish`

---

## File Map

| Action | Path                                                                  | Responsibility                                               |
| ------ | --------------------------------------------------------------------- | ------------------------------------------------------------ |
| Modify | `apps/web/src/app/layout.tsx`                                         | Add JetBrains Mono weight 700                                |
| Create | `apps/web/src/components/consumer/cc-mark/CCMark.tsx`                 | SVG logo mark (trail + accent blob)                          |
| Modify | `apps/web/src/components/consumer/app-header/AppHeader.tsx`           | Responsive: slim mobile bar + full desktop TopNav            |
| Create | `apps/web/src/components/consumer/bottom-nav/BottomNav.tsx`           | Mobile-only 4-tab sticky bottom bar                          |
| Modify | `apps/web/src/components/consumer/definitions/lib.ts`                 | Add `venueShort`, `formatShortDate`, `googleMapsUrl` helpers |
| Modify | `apps/web/src/components/consumer/event-card/EventCard.tsx`           | Row layout (no card border, divider-separated)               |
| Modify | `apps/web/src/components/consumer/hero-event-card/HeroEventCard.tsx`  | 180px image, overlap content, accent badge, no CTA           |
| Create | `apps/web/src/components/consumer/small-event-row/SmallEventRow.tsx`  | Compact 40×40 event row for related/upcoming lists           |
| Create | `apps/web/src/components/consumer/section-header/SectionHeader.tsx`   | Label + rule + count header for list sections                |
| Create | `apps/web/src/components/consumer/map-placeholder/MapPlaceholder.tsx` | SVG decorative map with accent dot                           |
| Modify | `apps/web/src/app/(protected)/events/page.tsx`                        | Day-group headers, dividers, BottomNav                       |
| Modify | `apps/web/src/app/(protected)/events/[id]/page.tsx`                   | Hero+scrim+floating buttons, InfoRows, full-width CTA        |
| Modify | `apps/web/src/app/(protected)/venues/[slug]/page.tsx`                 | Hero+scrim, stats row, SmallEventRow, MapPlaceholder         |

---

### Task 1: Add JetBrains Mono weight 700

**Files:**

- Modify: `apps/web/src/app/layout.tsx`

- [ ] **Add weight 700 to the JetBrains Mono font config**

Open `apps/web/src/app/layout.tsx`. The `JetBrains_Mono` call currently loads weights `['400', '500', '600']`. Change it to:

```ts
const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['400', '500', '600', '700'],
})
```

- [ ] **Verify TypeScript compiles**

```bash
cd apps/web && pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Commit**

```bash
git add apps/web/src/app/layout.tsx
git commit -m "fix: add JetBrains Mono weight 700 for design system labels"
```

---

### Task 2: CCMark SVG component

**Files:**

- Create: `apps/web/src/components/consumer/cc-mark/CCMark.tsx`

- [ ] **Create the component**

```tsx
interface CCMarkProps {
  size?: number
}

const TRAIL = [
  { x: 14, y: 76, r: 1.5 },
  { x: 24, y: 70, r: 2 },
  { x: 34, y: 64, r: 2.5 },
  { x: 42, y: 58, r: 3 },
  { x: 50, y: 50, r: 4 },
  { x: 58, y: 42, r: 5 },
  { x: 66, y: 32, r: 6 },
]

export function CCMark({ size = 24 }: CCMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 96 96"
      aria-hidden
      focusable="false"
    >
      <rect width="96" height="96" fill="var(--bg)" rx="16" />
      <circle cx="72" cy="24" r="20" fill="var(--accent)" opacity="0.22" />
      <circle cx="72" cy="24" r="12" fill="var(--accent)" opacity="0.42" />
      <circle cx="72" cy="24" r="7" fill="var(--signal)" />
      {TRAIL.map((d, i) => (
        <circle
          key={i}
          cx={d.x}
          cy={d.y}
          r={d.r}
          fill="var(--signal)"
          opacity={0.35 + i * 0.09}
        />
      ))}
    </svg>
  )
}
```

- [ ] **Verify TypeScript compiles**

```bash
cd apps/web && pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Commit**

```bash
git add apps/web/src/components/consumer/cc-mark/CCMark.tsx
git commit -m "feat: add CCMark SVG logo component"
```

---

### Task 3: Update AppHeader — responsive mobile/desktop

**Files:**

- Modify: `apps/web/src/components/consumer/app-header/AppHeader.tsx`

The mobile header is a slim bar: CCMark + wordmark + circular search button. The desktop header is a full TopNav with nav tabs, ⌘K search bar, and UserButton.

- [ ] **Replace AppHeader.tsx entirely**

```tsx
import Link from 'next/link'
import { UserButton } from '@clerk/nextjs'
import { Search } from 'lucide-react'
import { ThemeToggle } from '../theme-toggle'
import { CCMark } from '../cc-mark'

export function AppHeader() {
  return (
    <header className="w-full">
      {/* ── Mobile bar (hidden sm+) ─────────────────────── */}
      <div className="flex items-center justify-between px-4 pb-2.5 pt-[62px] bg-bg sm:hidden">
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
      <div className="hidden sm:flex h-16 w-full items-center justify-between border-b border-border bg-bg-elevated px-8 sticky top-0 z-40">
        {/* Left: logo + nav tabs */}
        <div className="flex items-center gap-8">
          <Link href="/events" className="flex items-center gap-2.5">
            <div className="h-8 w-8 overflow-hidden rounded-[7px] shrink-0">
              <CCMark size={32} />
            </div>
            <span
              className="text-[17px] font-extrabold tracking-[-0.02em] text-fg"
              style={{ fontFamily: 'var(--font-ui)' }}
            >
              concert<span className="text-accent">crawl.</span>
            </span>
          </Link>

          <nav className="flex gap-1">
            {[
              { label: 'Browse', href: '/events' },
              { label: 'Search', href: '/search' },
              { label: 'Saved', href: '/saved' },
            ].map((tab) => (
              <Link
                key={tab.href}
                href={tab.href}
                className="rounded-lg px-3.5 py-2 text-[13px] font-medium text-fg-muted tracking-[-0.01em] hover:bg-surface-1 hover:text-fg transition-colors"
              >
                {tab.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Right: search bar + user + theme */}
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

          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface-2">
            <UserButton />
          </div>

          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
```

- [ ] **Verify TypeScript compiles**

```bash
cd apps/web && pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Commit**

```bash
git add apps/web/src/components/consumer/app-header/AppHeader.tsx
git commit -m "feat: responsive AppHeader — slim mobile bar + full desktop TopNav"
```

---

### Task 4: BottomNav component

**Files:**

- Create: `apps/web/src/components/consumer/bottom-nav/BottomNav.tsx`

Mobile-only sticky bottom bar with 4 tabs. Uses `usePathname` — must be a client component.

- [ ] **Create BottomNav.tsx**

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  {
    key: 'browse',
    label: 'browse',
    href: '/events',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
        <rect
          x="1"
          y="1"
          width="7"
          height="7"
          rx="2"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <rect
          x="10"
          y="1"
          width="7"
          height="7"
          rx="2"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <rect
          x="1"
          y="10"
          width="7"
          height="7"
          rx="2"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <rect
          x="10"
          y="10"
          width="7"
          height="7"
          rx="2"
          stroke="currentColor"
          strokeWidth="1.5"
        />
      </svg>
    ),
  },
  {
    key: 'search',
    label: 'search',
    href: '/search',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
        <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M12.5 12.5L16 16"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    key: 'saved',
    label: 'saved',
    href: '/saved',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
        <path
          d="M9 15l-6.5-6A3.5 3.5 0 019 4.5 3.5 3.5 0 0115.5 9L9 15z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    key: 'me',
    label: 'me',
    href: '/me',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
        <circle cx="9" cy="6" r="3.5" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M2.5 16.5c0-3.5 3-5.5 6.5-5.5s6.5 2 6.5 5.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
] as const

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="sm:hidden fixed bottom-0 inset-x-0 z-40 flex h-[52px] items-center justify-around border-t border-border bg-bg-elevated pb-0.5"
      aria-label="Main navigation"
    >
      {TABS.map((tab) => {
        const isActive = pathname.startsWith(tab.href)
        return (
          <Link
            key={tab.key}
            href={tab.href}
            className="flex flex-col items-center gap-[3px]"
            style={{ color: isActive ? 'var(--signal)' : 'var(--fg-subtle)' }}
          >
            {tab.icon}
            <span
              className="text-[9px] tracking-[0.04em]"
              style={{
                fontFamily: 'var(--font-mono)',
                fontWeight: isActive ? 700 : 500,
              }}
            >
              {tab.label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
```

- [ ] **Verify TypeScript compiles**

```bash
cd apps/web && pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Commit**

```bash
git add apps/web/src/components/consumer/bottom-nav/BottomNav.tsx
git commit -m "feat: add BottomNav mobile tab bar (browse/search/saved/me)"
```

---

### Task 5: Helper functions — venueShort, formatShortDate, googleMapsUrl

**Files:**

- Modify: `apps/web/src/components/consumer/definitions/lib.ts`
- Test: (inline Vitest test in this task — run manually, no test file required for this PR unless test infra is already wired for consumer components)

- [ ] **Read the existing lib.ts first**

```bash
cat apps/web/src/components/consumer/definitions/lib.ts
```

- [ ] **Add three helpers at the bottom of lib.ts**

Append to the end of `apps/web/src/components/consumer/definitions/lib.ts`:

```ts
/**
 * Shortens a venue name for compact display in event rows.
 * "Red Rocks Amphitheatre" → "Red Rocks"
 * "Gothic Theatre" → "Gothic"
 */
export function venueShort(name: string): string {
  return name
    .replace(
      /\s+(Amphitheatre|Amphitheater|Theatre|Theater|Ballroom|Auditorium|Hall|Arena)$/i,
      '',
    )
    .trim()
}

/**
 * Formats a YYYY-MM-DD date string to "Apr 28" / "May 3".
 * Uses Mountain Time noon anchor to avoid UTC rollover issues.
 */
export function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/**
 * Returns a Google Maps URL for the given address string.
 */
export function googleMapsUrl(address: string): string {
  return `https://maps.google.com/?q=${encodeURIComponent(address)}`
}
```

- [ ] **Verify TypeScript compiles**

```bash
cd apps/web && pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Commit**

```bash
git add apps/web/src/components/consumer/definitions/lib.ts
git commit -m "feat: add venueShort, formatShortDate, googleMapsUrl helpers"
```

---

### Task 6: Update EventCard — row layout

**Files:**

- Modify: `apps/web/src/components/consumer/event-card/EventCard.tsx`

The existing component is a bordered card. The design uses divider-separated rows. Remove card border/bg/padding; the parent renders dividers between rows.

- [ ] **Replace EventCard.tsx**

```tsx
import Link from 'next/link'
import type { EventWithVenue } from '@concert-crawl/types'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { EventImage } from '../event-image'
import { formatShowTime, artistInitial, venueShort } from '../definitions/lib'
import { copy } from '../definitions/copy'

interface EventCardProps {
  event: EventWithVenue
  className?: string
}

export function EventCard({ event, className }: EventCardProps) {
  const showTime = formatShowTime(event.showTime)
  const isCancelled = event.status === 'cancelled'
  const isPostponed = event.status === 'postponed'

  const priceDisplay =
    event.ticketPriceMin != null
      ? `$${parseFloat(event.ticketPriceMin).toFixed(0)}`
      : null

  return (
    <Link
      href={`/events/${event.id}`}
      className={cn(
        'group flex items-center gap-2.5 py-2.5 transition-colors',
        className,
      )}
    >
      {/* Thumbnail — 48×48 */}
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md">
        <EventImage
          src={event.imageUrl}
          alt={event.artist}
          fallbackInitial={artistInitial(event.artist)}
          className="h-full w-full"
        />
      </div>

      {/* Info */}
      <div className="flex min-w-0 flex-1 flex-col">
        {isCancelled || isPostponed ? (
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-bold text-fg group-hover:text-signal transition-colors">
              {event.artist}
            </p>
            {isCancelled && (
              <Badge variant="destructive">{copy.cancelledLabel}</Badge>
            )}
            {isPostponed && (
              <Badge variant="secondary">{copy.postponedLabel}</Badge>
            )}
          </div>
        ) : (
          <p className="truncate text-sm font-bold text-fg group-hover:text-signal transition-colors">
            {event.artist}
          </p>
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
          <span>{venueShort(event.venue.name)}</span>
          {showTime && (
            <>
              <span className="opacity-40">·</span>
              <span>{showTime}</span>
            </>
          )}
        </p>
      </div>

      {/* Price */}
      <div className="shrink-0">
        {!isCancelled && priceDisplay ? (
          <span className="text-[13px] font-extrabold text-signal">
            {priceDisplay}
          </span>
        ) : !isCancelled ? (
          <span
            className="text-fg-subtle"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '9px',
              letterSpacing: '0.03em',
            }}
          >
            tba
          </span>
        ) : null}
      </div>
    </Link>
  )
}
```

- [ ] **Verify TypeScript compiles**

```bash
cd apps/web && pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Commit**

```bash
git add apps/web/src/components/consumer/event-card/EventCard.tsx
git commit -m "feat: update EventCard to row layout (divider-separated, no card border)"
```

---

### Task 7: Update HeroEventCard — overlap layout

**Files:**

- Modify: `apps/web/src/components/consumer/hero-event-card/HeroEventCard.tsx`

Key changes: fixed 180px image height, content overlaps image by −40px, accent badge (no pulse dot), no CTA button, whole card is a Link.

- [ ] **Replace HeroEventCard.tsx**

```tsx
import Link from 'next/link'
import type { EventWithVenue } from '@concert-crawl/types'
import { EventImage } from '../event-image'
import { formatShowTime, venueShort, artistInitial } from '../definitions/lib'
import { copy } from '../definitions/copy'

interface HeroEventCardProps {
  event: EventWithVenue
  label?: string
}

export function HeroEventCard({
  event,
  label = copy.heroTonight,
}: HeroEventCardProps) {
  const showTime = formatShowTime(event.showTime)
  const priceDisplay =
    event.ticketPriceMin != null
      ? `$${parseFloat(event.ticketPriceMin).toFixed(0)}`
      : null

  return (
    <Link
      href={`/events/${event.id}`}
      className="relative block overflow-hidden rounded-[12px] border border-border-strong bg-surface-1"
    >
      {/* Hero image — fixed 180px height */}
      <div className="relative h-[180px] w-full">
        <EventImage
          src={event.imageUrl}
          alt={event.artist}
          fallbackInitial={artistInitial(event.artist)}
          className="h-full w-full"
          fill
          sizes="(max-width: 1024px) 100vw, 720px"
        />
        {/* Bottom scrim */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, transparent 30%, var(--bg) 100%)',
          }}
          aria-hidden
        />
        {/* Tonight's pick badge */}
        <div className="absolute left-2.5 top-2.5">
          <span
            className="rounded-[4px] bg-accent px-2 py-[3px] text-fg-on-accent"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '9px',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            ★ {label}
          </span>
        </div>
      </div>

      {/* Content — overlaps image by 40px */}
      <div className="relative -mt-10 px-3.5 pb-3.5 pt-3">
        <p
          className="text-[20px] text-fg"
          style={{
            fontFamily: 'var(--font-ui)',
            fontWeight: 800,
            letterSpacing: '-0.02em',
            lineHeight: 1.15,
          }}
        >
          {event.artist}
        </p>
        {event.title !== event.artist && (
          <p
            className="mt-0.5 text-[12px] font-medium text-fg-muted"
            style={{ lineHeight: 1.3 }}
          >
            {event.title}
          </p>
        )}
        <div
          className="mt-2 flex items-center gap-1.5 text-fg-muted"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            letterSpacing: '0.02em',
          }}
        >
          <span className="text-signal">{venueShort(event.venue.name)}</span>
          {showTime && (
            <>
              <span className="opacity-40">·</span>
              <span>{showTime}</span>
            </>
          )}
          {priceDisplay && (
            <>
              <span className="opacity-40">·</span>
              <span className="text-signal">{priceDisplay}</span>
            </>
          )}
        </div>
        {event.genre && event.genre.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {event.genre.map((g) => (
              <span
                key={g}
                className="rounded-[4px] bg-surface-3 px-[7px] py-[2px] text-fg-muted"
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '9px',
                  letterSpacing: '0.03em',
                }}
              >
                {g}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  )
}
```

- [ ] **Verify TypeScript compiles**

```bash
cd apps/web && pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Commit**

```bash
git add apps/web/src/components/consumer/hero-event-card/HeroEventCard.tsx
git commit -m "feat: update HeroEventCard — 180px image, overlap layout, accent badge"
```

---

### Task 8: SmallEventRow component

**Files:**

- Create: `apps/web/src/components/consumer/small-event-row/SmallEventRow.tsx`

Used in "More at venue" on EventDetail and "Upcoming" on VenueProfile.

- [ ] **Create SmallEventRow.tsx**

```tsx
import Link from 'next/link'
import type { EventWithVenue, Event } from '@concert-crawl/types'
import { EventImage } from '../event-image'
import { formatShowTime, artistInitial } from '../definitions/lib'

interface SmallEventRowProps {
  event: EventWithVenue | Event
  date: string
  showVenue?: boolean
}

function getVenueName(event: EventWithVenue | Event): string | null {
  if ('venue' in event && event.venue) return event.venue.name
  return null
}

export function SmallEventRow({
  event,
  date,
  showVenue = true,
}: SmallEventRowProps) {
  const showTime = formatShowTime(event.showTime)
  const venueName = getVenueName(event)
  const priceDisplay =
    event.ticketPriceMin != null
      ? `$${parseFloat(event.ticketPriceMin).toFixed(0)}`
      : null

  const metaParts: string[] = []
  if (showVenue && venueName) metaParts.push(venueName)
  metaParts.push(date)
  if (showTime) metaParts.push(showTime)

  return (
    <Link
      href={`/events/${event.id}`}
      className="group flex items-center gap-2.5 py-2.5 transition-colors"
    >
      {/* Thumbnail — 40×40 */}
      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md">
        <EventImage
          src={event.imageUrl}
          alt={event.artist}
          fallbackInitial={artistInitial(event.artist)}
          className="h-full w-full"
        />
      </div>

      {/* Info */}
      <div className="flex min-w-0 flex-1 flex-col">
        <p className="truncate text-[13px] font-bold text-fg group-hover:text-signal transition-colors">
          {event.artist}
        </p>
        <p
          className="mt-[1px] text-fg-muted"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '9px',
            letterSpacing: '0.02em',
          }}
        >
          {metaParts.join(' · ')}
        </p>
      </div>

      {/* Price */}
      <div className="shrink-0">
        {priceDisplay ? (
          <span className="text-[12px] font-extrabold text-signal">
            {priceDisplay}
          </span>
        ) : (
          <span
            className="text-fg-subtle"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '9px',
              letterSpacing: '0.03em',
            }}
          >
            tba
          </span>
        )}
      </div>
    </Link>
  )
}
```

- [ ] **Verify TypeScript compiles**

```bash
cd apps/web && pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Commit**

```bash
git add apps/web/src/components/consumer/small-event-row/SmallEventRow.tsx
git commit -m "feat: add SmallEventRow component for related/upcoming event lists"
```

---

### Task 9: SectionHeader component

**Files:**

- Create: `apps/web/src/components/consumer/section-header/SectionHeader.tsx`

- [ ] **Create SectionHeader.tsx**

```tsx
interface SectionHeaderProps {
  title: string
  count?: string
}

export function SectionHeader({ title, count }: SectionHeaderProps) {
  return (
    <div className="mb-1 flex items-center gap-2">
      <span
        className="shrink-0 text-[14px] text-fg"
        style={{
          fontFamily: 'var(--font-ui)',
          fontWeight: 800,
          letterSpacing: '-0.01em',
          lineHeight: 1,
        }}
      >
        {title}
      </span>
      <div className="h-px flex-1 bg-border" />
      {count && (
        <span
          className="shrink-0 text-fg-subtle"
          style={{ fontFamily: 'var(--font-mono)', fontSize: '9px' }}
        >
          {count}
        </span>
      )}
    </div>
  )
}
```

- [ ] **Verify TypeScript compiles**

```bash
cd apps/web && pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Commit**

```bash
git add apps/web/src/components/consumer/section-header/SectionHeader.tsx
git commit -m "feat: add SectionHeader component (label + rule + count)"
```

---

### Task 10: MapPlaceholder component

**Files:**

- Create: `apps/web/src/components/consumer/map-placeholder/MapPlaceholder.tsx`

Decorative SVG map — curved grid lines, accent dot, address label.

- [ ] **Create MapPlaceholder.tsx**

```tsx
interface MapPlaceholderProps {
  address: string
}

export function MapPlaceholder({ address }: MapPlaceholderProps) {
  return (
    <div className="relative h-[110px] overflow-hidden rounded-[10px] border border-border bg-surface-1">
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 360 110"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden
      >
        <rect width="360" height="110" fill="var(--surface-1)" />
        <g
          stroke="var(--border-strong)"
          strokeWidth="0.6"
          fill="none"
          opacity="0.6"
        >
          <path d="M 0 28 Q 90 23 180 33 T 360 26" />
          <path d="M 0 55 Q 120 50 200 62 T 360 57" />
          <path d="M 0 82 Q 80 77 160 87 T 360 80" />
          <path d="M 80 0 Q 85 37 82 73 T 88 110" />
          <path d="M 200 0 Q 205 46 198 82 T 204 110" />
          <path d="M 300 0 Q 295 41 302 78 T 298 110" />
        </g>
        <circle cx="180" cy="55" r="8" fill="var(--accent)" opacity="0.8" />
        <circle cx="180" cy="55" r="3" fill="var(--fg-on-accent)" />
      </svg>
      {address && (
        <div
          className="absolute bottom-[7px] left-2.5 text-fg-subtle"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '8px',
            letterSpacing: '0.04em',
          }}
        >
          {address}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Verify TypeScript compiles**

```bash
cd apps/web && pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Commit**

```bash
git add apps/web/src/components/consumer/map-placeholder/MapPlaceholder.tsx
git commit -m "feat: add MapPlaceholder SVG component"
```

---

### Task 11: Browse page — day-group headers, dividers, BottomNav

**Files:**

- Modify: `apps/web/src/app/(protected)/events/page.tsx`

Three changes: (1) new day-group header style, (2) dividers between EventCard rows instead of gap, (3) BottomNav at the bottom.

- [ ] **Replace events/page.tsx**

```tsx
import { Fragment, Suspense } from 'react'
import type { EventsListResponse, VenuePublic } from '@concert-crawl/types'
import { publicApiClient } from '@/lib/api'
import { AppHeader } from '@/components/consumer/app-header'
import { BottomNav } from '@/components/consumer/bottom-nav'
import { HeroEventCard } from '@/components/consumer/hero-event-card'
import { EventCard } from '@/components/consumer/event-card'
import { FilterBar } from '@/components/consumer/filter-bar'
import { LoadMoreButton } from '@/components/consumer/load-more'
import { EmptyState } from '@/components/consumer/empty-state'
import { dateGroupLabel, isToday } from '@/components/consumer/definitions/lib'
import { copy } from '@/components/consumer/definitions/copy'

const PAGE_LIMIT = 20

interface BrowsePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

async function fetchEvents(
  params: Record<string, string | string[] | undefined>,
): Promise<EventsListResponse> {
  const qs = new URLSearchParams()
  if (typeof params['search'] === 'string') qs.set('search', params['search'])
  if (typeof params['venueSlug'] === 'string')
    qs.set('venueSlug', params['venueSlug'])
  if (typeof params['from'] === 'string') qs.set('from', params['from'])
  const offsetParam = params['offset']
  if (typeof offsetParam === 'string' && /^\d+$/.test(offsetParam)) {
    const parsed = Number(offsetParam)
    if (Number.isSafeInteger(parsed) && parsed >= 0)
      qs.set('offset', String(parsed))
  }
  qs.set('limit', String(PAGE_LIMIT))
  return publicApiClient.get<EventsListResponse>(`/v1/events?${qs.toString()}`)
}

async function fetchVenues(): Promise<VenuePublic[]> {
  return publicApiClient.get<VenuePublic[]>('/v1/venues')
}

export default async function BrowsePage({ searchParams }: BrowsePageProps) {
  const params = await searchParams

  const [eventsResult, venues] = await Promise.all([
    fetchEvents(params),
    fetchVenues(),
  ])

  const { data: events, total, limit } = eventsResult

  const firstEventIsToday =
    events.length > 0 && events[0] !== undefined && isToday(events[0].date)
  const heroEvent = firstEventIsToday ? events[0] : null
  const listEvents = heroEvent ? events.slice(1) : events

  const groups = new Map<string, typeof events>()
  for (const event of listEvents) {
    const key = event.date
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(event)
  }

  const isFiltered = params['search'] ?? params['venueSlug'] ?? params['from']
  const currentOffset =
    typeof params['offset'] === 'string' ? parseInt(params['offset'], 10) : 0

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <AppHeader />

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-20 pt-4 sm:px-6 sm:pb-6">
        {/* Filter bar */}
        <div className="mb-5">
          <Suspense>
            <FilterBar venues={venues} />
          </Suspense>
        </div>

        {events.length === 0 && (
          <EmptyState
            message={isFiltered ? copy.emptyFiltered : copy.emptyTonight}
            {...(isFiltered
              ? { action: { label: copy.emptyFilteredCta, href: '/events' } }
              : {})}
          />
        )}

        {heroEvent && (
          <div className="mb-6">
            <HeroEventCard event={heroEvent} />
          </div>
        )}

        {groups.size > 0 && (
          <div className="flex flex-col gap-6">
            {Array.from(groups.entries()).map(([date, dateEvents]) => {
              const label = dateGroupLabel(date)
              const isTonight = label.toLowerCase() === 'tonight'
              return (
                <section key={date} aria-label={label}>
                  {/* Day group header */}
                  <div className="mb-1 flex items-center gap-2 py-2">
                    <span
                      className="shrink-0 text-[12px] uppercase"
                      style={{
                        fontFamily: 'var(--font-ui)',
                        fontWeight: 800,
                        letterSpacing: '0.05em',
                        color: isTonight ? 'var(--accent)' : 'var(--fg)',
                      }}
                    >
                      {label}
                    </span>
                    <div className="h-px flex-1 bg-border" />
                    <span
                      className="shrink-0 text-fg-subtle"
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '9px',
                      }}
                    >
                      {dateEvents.length} show
                      {dateEvents.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  {/* Event rows with dividers */}
                  <div>
                    {dateEvents.map((event, i) => (
                      <Fragment key={event.id}>
                        {i > 0 && (
                          <div
                            className="h-px bg-border"
                            style={{ marginLeft: 58 }}
                          />
                        )}
                        <EventCard event={event} />
                      </Fragment>
                    ))}
                  </div>
                </section>
              )
            })}
          </div>
        )}

        {events.length > 0 && (
          <div className="mt-8">
            <Suspense>
              <LoadMoreButton
                currentOffset={currentOffset}
                limit={limit}
                total={total}
              />
            </Suspense>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  )
}
```

- [ ] **Verify TypeScript compiles**

```bash
cd apps/web && pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Commit**

```bash
git add apps/web/src/app/(protected)/events/page.tsx
git commit -m "feat: update browse page — day-group headers, row dividers, BottomNav"
```

---

### Task 12: EventDetail page — hero with scrim, InfoRows, full-width CTA

**Files:**

- Modify: `apps/web/src/app/(protected)/events/[id]/page.tsx`

This is a significant refactor. The hero becomes full-bleed 320px with a bottom scrim, floating back/save buttons on mobile. Content uses InfoRows with icons. Get Tickets becomes a full-width accent button.

- [ ] **Replace events/[id]/page.tsx**

```tsx
import { Fragment } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { EventWithVenue, EventsListResponse } from '@concert-crawl/types'
import { publicApiClient } from '@/lib/api'
import { AppHeader } from '@/components/consumer/app-header'
import { EventImage } from '@/components/consumer/event-image'
import { SmallEventRow } from '@/components/consumer/small-event-row'
import { SectionHeader } from '@/components/consumer/section-header'
import {
  formatEventDate,
  formatShowTime,
  formatPrice,
  artistInitial,
  formatShortDate,
} from '@/components/consumer/definitions/lib'
import { copy } from '@/components/consumer/definitions/copy'

interface EventDetailPageProps {
  params: Promise<{ id: string }>
}

async function fetchEvent(id: string): Promise<EventWithVenue | null> {
  try {
    return await publicApiClient.get<EventWithVenue>(`/v1/events/${id}`)
  } catch {
    return null
  }
}

async function fetchRelated(
  venueSlug: string,
  excludeId: string,
): Promise<EventWithVenue[]> {
  try {
    const result = await publicApiClient.get<EventsListResponse>(
      `/v1/events?venueSlug=${encodeURIComponent(venueSlug)}&limit=4&offset=0`,
    )
    return result.data.filter((ev) => ev.id !== excludeId).slice(0, 3)
  } catch {
    return []
  }
}

export default async function EventDetailPage({
  params,
}: EventDetailPageProps) {
  const { id } = await params
  const event = await fetchEvent(id)
  if (!event) notFound()

  const related = await fetchRelated(event.venue.slug, event.id)

  const showTime = formatShowTime(event.showTime)
  const doorsTime = formatShowTime(event.doorsTime)
  const price = formatPrice(event.ticketPriceMin, event.ticketPriceMax)
  const dateLabel = formatEventDate(event.date, event.venue.timezone)
  const isCancelled = event.status === 'cancelled'

  const doorsShow =
    doorsTime && showTime
      ? `${doorsTime} / ${showTime}`
      : (showTime ?? doorsTime ?? '—')

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      {/* Desktop-only AppHeader */}
      <div className="hidden sm:block">
        <AppHeader />
      </div>

      {/* Hero — 320px, full-bleed */}
      <div className="relative w-full shrink-0" style={{ height: 320 }}>
        <EventImage
          src={event.imageUrl}
          alt={event.artist}
          fallbackInitial={artistInitial(event.artist)}
          className="h-full w-full"
          fill
          sizes="(max-width: 1024px) 100vw, 720px"
        />
        {/* Bottom scrim */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-20"
          style={{ background: 'linear-gradient(transparent, var(--bg))' }}
          aria-hidden
        />
        {/* Mobile: floating back button */}
        <Link
          href="/events"
          aria-label="Back to browse"
          className="sm:hidden absolute left-3.5 top-14 z-10 flex h-9 w-9 items-center justify-center rounded-full"
          style={{ background: 'var(--scrim)' }}
        >
          <svg
            width="10"
            height="16"
            viewBox="0 0 10 16"
            fill="none"
            aria-hidden
          >
            <path
              d="M8 2L2 8l6 6"
              stroke="var(--fg)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
        {/* Mobile: floating save button */}
        <button
          aria-label="Save show"
          className="sm:hidden absolute right-3.5 top-14 z-10 flex h-9 w-9 items-center justify-center rounded-full"
          style={{ background: 'var(--scrim)' }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 18 18"
            fill="none"
            aria-hidden
          >
            <path
              d="M9 15l-6.5-6A3.5 3.5 0 019 4.5 3.5 3.5 0 0115.5 9L9 15z"
              stroke="var(--fg)"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        {/* Desktop: breadcrumb (absolute over hero) */}
        <div className="hidden sm:flex absolute bottom-4 left-6 items-center gap-1.5 text-[13px]">
          <Link
            href="/events"
            className="text-fg-muted hover:text-fg transition-colors flex items-center gap-1.5"
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden
            >
              <path
                d="M11 4L5 8l6 4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Browse
          </Link>
          <span
            className="text-fg-subtle"
            style={{ fontFamily: 'var(--font-mono)', fontSize: '11px' }}
          >
            /
          </span>
          <span className="text-fg font-medium">{event.artist}</span>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="relative -mt-5 flex-1 px-[18px] pb-10">
        {/* Genre chips */}
        {event.genre && event.genre.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1">
            {event.genre.map((g) => (
              <span
                key={g}
                className="rounded-[4px] bg-surface-3 px-2 py-[3px] text-fg-muted"
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '9px',
                  letterSpacing: '0.03em',
                }}
              >
                {g}
              </span>
            ))}
          </div>
        )}

        {/* Title */}
        <h1
          className="text-fg"
          style={{
            fontFamily: 'var(--font-ui)',
            fontWeight: 900,
            fontSize: 26,
            letterSpacing: '-0.03em',
            lineHeight: 1.1,
            margin: 0,
          }}
        >
          {event.artist}
        </h1>
        {event.title !== event.artist && (
          <p className="mt-1 text-[14px] font-medium text-fg-muted">
            {event.title}
          </p>
        )}

        {/* Info block */}
        <div className="mt-4 border-y border-border py-1">
          <InfoRow
            icon={<IconPin />}
            label="Venue"
            value={event.venue.name}
            href={`/venues/${event.venue.slug}`}
          />
          <InfoRow icon={<IconCalendar />} label="Date" value={dateLabel} />
          <InfoRow
            icon={<IconClock />}
            label="Doors / Show"
            value={doorsShow}
          />
          <InfoRow
            icon={<IconTicket />}
            label="Price"
            value={price ?? 'TBA'}
            signal={!!price}
          />
          <InfoRow icon={<IconUsers />} label="Ages" value="All Ages" />
        </div>

        {/* About */}
        {event.description && (
          <div className="mt-4">
            <p
              className="mb-1.5 uppercase text-fg-subtle"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '9px',
                letterSpacing: '0.06em',
              }}
            >
              About
            </p>
            <p
              className="text-[13px] leading-[1.55] text-fg-muted"
              style={{ textWrap: 'pretty' } as React.CSSProperties}
            >
              {event.description}
            </p>
          </div>
        )}

        {/* Get Tickets CTA */}
        {event.ticketUrl && !isCancelled && (
          <a
            href={event.ticketUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 flex h-12 w-full items-center justify-center rounded-[10px] text-fg-on-accent"
            style={{
              background: 'var(--accent)',
              fontFamily: 'var(--font-ui)',
              fontWeight: 800,
              fontSize: 15,
              letterSpacing: '-0.01em',
            }}
          >
            {copy.ticketsCta} ↗
          </a>
        )}

        {/* Sign-up nudge */}
        <p
          className="mt-2.5 text-center text-fg-subtle"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '9px',
            letterSpacing: '0.02em',
          }}
        >
          <Link href="/sign-up" className="text-signal">
            Sign up
          </Link>{' '}
          to save this show
        </p>

        {/* Related shows */}
        {related.length > 0 && (
          <div className="mt-6">
            <SectionHeader
              title={`More at ${event.venue.name}`}
              count={`${related.length} show${related.length !== 1 ? 's' : ''}`}
            />
            {related.map((r, i) => (
              <Fragment key={r.id}>
                {i > 0 && (
                  <div className="h-px bg-border" style={{ marginLeft: 50 }} />
                )}
                <SmallEventRow event={r} date={formatShortDate(r.date)} />
              </Fragment>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Icon components (16×16, 1.5px stroke, --fg-subtle) ────────────

function IconPin() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M8 1.5C5.24 1.5 3 3.74 3 6.5C3 10.25 8 14.5 8 14.5C8 14.5 13 10.25 13 6.5C13 3.74 10.76 1.5 8 1.5Z"
        stroke="var(--fg-subtle)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle
        cx="8"
        cy="6.5"
        r="2"
        stroke="var(--fg-subtle)"
        strokeWidth="1.5"
      />
    </svg>
  )
}

function IconCalendar() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect
        x="2"
        y="3"
        width="12"
        height="11"
        rx="2"
        stroke="var(--fg-subtle)"
        strokeWidth="1.5"
      />
      <path d="M2 7h12" stroke="var(--fg-subtle)" strokeWidth="1.5" />
      <path
        d="M5.5 1.5v3M10.5 1.5v3"
        stroke="var(--fg-subtle)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

function IconClock() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle
        cx="8"
        cy="8"
        r="6.5"
        stroke="var(--fg-subtle)"
        strokeWidth="1.5"
      />
      <path
        d="M8 4.5V8l3 1.5"
        stroke="var(--fg-subtle)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconTicket() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M1.5 5a2 2 0 010 4v3.5h13V9a2 2 0 010-4V1.5h-13V5z"
        stroke="var(--fg-subtle)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M6 5.5v5"
        stroke="var(--fg-subtle)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeDasharray="1.5 2"
      />
    </svg>
  )
}

function IconUsers() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle
        cx="6"
        cy="5"
        r="2.5"
        stroke="var(--fg-subtle)"
        strokeWidth="1.5"
      />
      <path
        d="M1 14c0-2.8 2.2-4.5 5-4.5s5 1.7 5 4.5"
        stroke="var(--fg-subtle)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle
        cx="11.5"
        cy="5.5"
        r="2"
        stroke="var(--fg-subtle)"
        strokeWidth="1.2"
      />
      <path
        d="M12.5 9.5c1.8.4 3 1.6 3 3.5"
        stroke="var(--fg-subtle)"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  )
}

// ── InfoRow ───────────────────────────────────────────────────────

interface InfoRowProps {
  icon: React.ReactNode
  label: string
  value: string
  signal?: boolean
  href?: string
}

function InfoRow({ icon, label, value, signal = false, href }: InfoRowProps) {
  const inner = (
    <>
      <div className="h-4 w-4 shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p
          className="uppercase text-fg-subtle"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '9px',
            letterSpacing: '0.06em',
          }}
        >
          {label}
        </p>
        <p
          className="mt-[1px] text-[14px] font-semibold tracking-[-0.01em]"
          style={{ color: signal ? 'var(--signal)' : 'var(--fg)' }}
        >
          {value}
        </p>
      </div>
      {href && (
        <svg
          width="14"
          height="14"
          viewBox="0 0 16 16"
          fill="none"
          className="shrink-0 text-fg-subtle"
          aria-hidden
        >
          <path
            d="M6 4l4 4-4 4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </>
  )

  const className = 'flex items-center gap-2.5 py-2'

  if (href) {
    return (
      <Link
        href={href}
        className={`${className} hover:text-signal transition-colors`}
      >
        {inner}
      </Link>
    )
  }
  return <div className={className}>{inner}</div>
}
```

- [ ] **Verify TypeScript compiles**

```bash
cd apps/web && pnpm tsc --noEmit
```

Expected: no errors. If there are `textWrap` type errors, cast the style prop as `React.CSSProperties`.

- [ ] **Commit**

```bash
git add apps/web/src/app/(protected)/events/[id]/page.tsx
git commit -m "feat: refactor EventDetail — hero scrim, floating nav, InfoRows, full-width CTA"
```

---

### Task 13: VenueProfile page — hero with scrim, stats row, SmallEventRow, MapPlaceholder

**Files:**

- Modify: `apps/web/src/app/(protected)/venues/[slug]/page.tsx`

- [ ] **Replace venues/[slug]/page.tsx**

```tsx
import { Fragment } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { VenueWithEvents, Event } from '@concert-crawl/types'
import { publicApiClient } from '@/lib/api'
import { AppHeader } from '@/components/consumer/app-header'
import { SmallEventRow } from '@/components/consumer/small-event-row'
import { SectionHeader } from '@/components/consumer/section-header'
import { MapPlaceholder } from '@/components/consumer/map-placeholder'
import { EmptyState } from '@/components/consumer/empty-state'
import {
  formatShortDate,
  googleMapsUrl,
} from '@/components/consumer/definitions/lib'
import { copy } from '@/components/consumer/definitions/copy'

interface VenueProfilePageProps {
  params: Promise<{ slug: string }>
}

async function fetchVenueWithEvents(
  slug: string,
): Promise<VenueWithEvents | null> {
  try {
    return await publicApiClient.get<VenueWithEvents>(`/v1/venues/${slug}`)
  } catch {
    return null
  }
}

export default async function VenueProfilePage({
  params,
}: VenueProfilePageProps) {
  const { slug } = await params
  const result = await fetchVenueWithEvents(slug)
  if (!result) notFound()

  const { venue, upcomingEvents } = result

  // Initials from first two words
  const words = venue.name.split(' ')
  const initials =
    words.length >= 2
      ? (words[0]?.charAt(0) ?? '') + (words[1]?.charAt(0) ?? '')
      : venue.name.charAt(0)

  // Deterministic gradient hue from venue name
  const hue =
    [30, 160, 260, 80, 320, 200][
      venue.name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 6
    ] ?? 200

  const mapsAddress = `${venue.name}, ${venue.city}`

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      {/* Desktop-only AppHeader */}
      <div className="hidden sm:block">
        <AppHeader />
      </div>

      {/* Hero — 320px */}
      <div className="relative w-full shrink-0" style={{ height: 320 }}>
        {/* Gradient placeholder — replace with real imagery later */}
        <div
          className="h-full w-full flex items-center justify-center"
          style={{
            background: `linear-gradient(160deg, oklch(0.28 0.08 ${hue}), oklch(0.18 0.06 ${hue + 40}))`,
          }}
        >
          <span
            className="select-none"
            style={{
              fontFamily: 'var(--font-ui)',
              fontWeight: 800,
              fontSize: 106,
              color: `oklch(0.60 0.12 ${hue})`,
              opacity: 0.5,
              letterSpacing: '-0.03em',
            }}
          >
            {initials}
          </span>
        </div>
        {/* Image tint */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: 'var(--image-tint)' }}
          aria-hidden
        />
        {/* Bottom scrim */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-20"
          style={{ background: 'linear-gradient(transparent, var(--bg))' }}
          aria-hidden
        />
        {/* Mobile: floating back button */}
        <Link
          href="/events"
          aria-label="Back to browse"
          className="sm:hidden absolute left-3.5 top-14 z-10 flex h-9 w-9 items-center justify-center rounded-full"
          style={{ background: 'var(--scrim)' }}
        >
          <svg
            width="10"
            height="16"
            viewBox="0 0 10 16"
            fill="none"
            aria-hidden
          >
            <path
              d="M8 2L2 8l6 6"
              stroke="var(--fg)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
        {/* Desktop: breadcrumb */}
        <div className="hidden sm:flex absolute bottom-4 left-6 items-center gap-1.5 text-[13px]">
          <Link
            href="/events"
            className="text-fg-muted hover:text-fg transition-colors flex items-center gap-1.5"
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden
            >
              <path
                d="M11 4L5 8l6 4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Browse
          </Link>
          <span
            className="text-fg-subtle"
            style={{ fontFamily: 'var(--font-mono)', fontSize: '11px' }}
          >
            /
          </span>
          <span className="text-fg font-medium">{venue.name}</span>
        </div>
      </div>

      {/* Content */}
      <div className="relative -mt-5 flex-1 px-[18px] pb-10">
        {/* Venue name */}
        <h1
          className="text-fg"
          style={{
            fontFamily: 'var(--font-ui)',
            fontWeight: 900,
            fontSize: 26,
            letterSpacing: '-0.03em',
            lineHeight: 1.1,
            margin: 0,
          }}
        >
          {venue.name}
        </h1>

        {/* City + Directions */}
        <div className="mt-1.5 flex items-center gap-2">
          <span
            className="text-fg-muted"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              letterSpacing: '0.04em',
            }}
          >
            {venue.city}
          </span>
          <span className="text-fg-subtle opacity-40">·</span>
          <a
            href={googleMapsUrl(mapsAddress)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-signal"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              letterSpacing: '0.03em',
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              aria-hidden
            >
              <path
                d="M7 1l5.5 5.5L7 12"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M12.5 6.5H5a3.5 3.5 0 00-3.5 3.5v1"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            Directions
          </a>
        </div>

        {/* Stats row */}
        <div className="mt-3.5 flex gap-3 border-y border-border py-3">
          <StatPill
            label="Upcoming"
            value={`${upcomingEvents.length} show${upcomingEvents.length !== 1 ? 's' : ''}`}
            signal
          />
          <StatPill label="City" value={venue.city} />
          <StatPill label="Website" value="↗" />
        </div>

        {/* Venue website link */}
        <div className="mt-2">
          <a
            href={venue.websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[13px] text-signal hover:underline"
          >
            {venue.websiteUrl.replace(/^https?:\/\//, '')}
          </a>
        </div>

        {/* Upcoming shows */}
        <div className="mt-5">
          <SectionHeader
            title="Upcoming"
            count={`${upcomingEvents.length} show${upcomingEvents.length !== 1 ? 's' : ''}`}
          />

          {upcomingEvents.length === 0 ? (
            <EmptyState message={copy.venueNoShows} />
          ) : (
            <div>
              {upcomingEvents.map((event: Event, i: number) => (
                <Fragment key={event.id}>
                  {i > 0 && (
                    <div
                      className="h-px bg-border"
                      style={{ marginLeft: 50 }}
                    />
                  )}
                  <SmallEventRow
                    event={event}
                    date={formatShortDate(event.date)}
                    showVenue={false}
                  />
                </Fragment>
              ))}
            </div>
          )}
        </div>

        {/* Map placeholder */}
        <div className="mt-5 mb-6">
          <MapPlaceholder address={mapsAddress} />
        </div>
      </div>
    </div>
  )
}

function StatPill({
  label,
  value,
  signal = false,
}: {
  label: string
  value: string
  signal?: boolean
}) {
  return (
    <div className="flex flex-1 flex-col gap-0.5">
      <span
        className="uppercase text-fg-subtle"
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '8px',
          letterSpacing: '0.06em',
        }}
      >
        {label}
      </span>
      <span
        className="text-[12px] font-bold tracking-[-0.01em]"
        style={{ color: signal ? 'var(--signal)' : 'var(--fg)' }}
      >
        {value}
      </span>
    </div>
  )
}
```

- [ ] **Verify TypeScript compiles**

```bash
cd apps/web && pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Commit**

```bash
git add apps/web/src/app/(protected)/venues/[slug]/page.tsx
git commit -m "feat: refactor VenueProfile — hero scrim, stats row, SmallEventRow, MapPlaceholder"
```

---

### Task 14: Final lint check and clean-up

- [ ] **Run ESLint across the web app**

```bash
cd apps/web && pnpm lint
```

Fix any errors (unused imports, missing `key` props, etc.) before proceeding.

- [ ] **Run full TypeScript check from repo root**

```bash
pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Commit any lint fixes**

```bash
git add -A
git commit -m "fix: address lint errors in phase 5b-1 UI polish"
```

_(Skip this commit if there's nothing to fix.)_

---

## Self-Review Notes

### Spec coverage check

| Spec requirement                                               | Covered in task |
| -------------------------------------------------------------- | --------------- |
| JetBrains Mono weight 700                                      | Task 1          |
| CCMark SVG                                                     | Task 2          |
| AppHeader mobile slim                                          | Task 3          |
| AppHeader desktop TopNav                                       | Task 3          |
| BottomNav 4 tabs                                               | Task 4          |
| venueShort helper                                              | Task 5          |
| formatShortDate helper                                         | Task 5          |
| googleMapsUrl helper                                           | Task 5          |
| EventCard row layout (no border)                               | Task 6          |
| EventCard dividers in parent                                   | Task 11         |
| HeroEventCard 180px / overlap / badge                          | Task 7          |
| SmallEventRow                                                  | Task 8          |
| SectionHeader                                                  | Task 9          |
| MapPlaceholder                                                 | Task 10         |
| Browse day-group headers (Tonight/date)                        | Task 11         |
| Browse pb-20 for BottomNav clearance                           | Task 11         |
| EventDetail hero+scrim+floating buttons                        | Task 12         |
| EventDetail InfoRows with icons                                | Task 12         |
| EventDetail genre chips above title                            | Task 12         |
| EventDetail full-width accent CTA                              | Task 12         |
| EventDetail SmallEventRow related                              | Task 12         |
| EventDetail desktop breadcrumb                                 | Task 12         |
| VenueProfile hero+scrim+back button                            | Task 13         |
| VenueProfile stats row                                         | Task 13         |
| VenueProfile SmallEventRow upcoming                            | Task 13         |
| VenueProfile MapPlaceholder                                    | Task 13         |
| VenueProfile desktop breadcrumb                                | Task 13         |
| Missing fields fallbacks (ages→"All Ages", address→city, etc.) | Tasks 12, 13    |

### Known gaps / deferred

- **Active nav tab highlight on desktop TopNav**: `AppHeader` renders nav tabs as plain Links without active-state detection (would require `'use client'` for `usePathname`). The desktop nav tabs show no active state in 5b-1 — acceptable, fix in a follow-up.
- **BottomNav `/me` route**: no `/me` page exists. Link renders but goes nowhere. Acceptable for 5b-1.
- **BottomNav `/saved` route**: same as above.
- **`/search` route**: stub — `/search` page doesn't exist until 5b-3.
- **Save button on EventDetail (mobile)**: renders as a `<button>` stub with no action (no backend in this PR).
- **`venue.websiteUrl` in StatPill**: renders the URL text as a "↗" placeholder — the stat row shows the website link separately below.
