# Release Notes & Feature Spotlight Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a changelog page (`/changelog`) and floating feature-drop pill + spotlight modal, wired to static release data with localStorage read-state tracking, culminating in a drop-in replacement for the UserMenu version footer.

**Architecture:** Static release data lives in `lib/definitions/releases.ts` (types + real data — no API, no DB). A `useReleaseReadState` hook abstracts all localStorage I/O. The protected layout gains a `FeatureDropPillGate` client component (mirrors `FeedbackEdgeTabGate`). The `ReleasePage` client component manages its own spotlight modal state for the "See the announcement" strip on `/changelog`. Both the pill and the strip render the same `SpotlightModal` component independently. The `UserMenuVersionFooter` replaces the static version footer in `UserMenu.tsx`.

**Tech Stack:** Next.js 14 App Router, TypeScript strict, React hooks, Tailwind CSS with CSS custom properties (theme tokens), Vitest + Testing Library, localStorage (no server state).

---

## File Structure

**Create:**
- `apps/web/src/lib/definitions/releases.ts` — Release types + static data
- `apps/web/src/components/consumer/release-notes/useReleaseReadState.ts` — localStorage hook
- `apps/web/src/components/consumer/release-notes/useReleaseReadState.test.ts` — hook tests
- `apps/web/src/components/consumer/release-notes/SpotlightHero.tsx` — animated SVG map hero
- `apps/web/src/components/consumer/release-notes/SpotlightModal.tsx` — full-screen takeover modal
- `apps/web/src/components/consumer/release-notes/SpotlightModal.test.tsx` — modal tests
- `apps/web/src/components/consumer/release-notes/ReleaseEntry.tsx` — single changelog entry (timeline node + spotlight strip + items)
- `apps/web/src/components/consumer/release-notes/ReleaseEntry.test.tsx` — entry tests
- `apps/web/src/components/consumer/release-notes/ReleasePage.tsx` — full /changelog page body (client, owns modal state for the strip re-opener)
- `apps/web/src/components/consumer/release-notes/FeatureDropPill.tsx` — floating pill
- `apps/web/src/components/consumer/release-notes/FeatureDropPill.test.tsx` — pill tests
- `apps/web/src/components/consumer/release-notes/FeatureDropPillGate.tsx` — pill + modal state manager added to protected layout
- `apps/web/src/components/consumer/release-notes/UserMenuVersionFooter.tsx` — drop-in footer replacement
- `apps/web/src/components/consumer/release-notes/UserMenuVersionFooter.test.tsx` — footer tests
- `apps/web/src/components/consumer/release-notes/index.ts` — public re-exports
- `apps/web/src/app/(protected)/changelog/page.tsx` — server page: metadata + renders ReleasePage

**Modify:**
- `apps/web/src/app/globals.css` — add `rn*` keyframes
- `apps/web/src/app/(protected)/layout.tsx` — add `<FeatureDropPillGate />`
- `apps/web/src/components/consumer/user-menu/UserMenu.tsx` — replace static status footer with `<UserMenuVersionFooter />`

---

## Task 1: Release types + static data

**Files:**
- Create: `apps/web/src/lib/definitions/releases.ts`

- [ ] **Step 1: Create the types + data file**

```ts
// apps/web/src/lib/definitions/releases.ts

export interface ReleaseItem {
  kind: 'added' | 'fixed' | 'changed' | 'removed'
  text: string
}

export interface ReleaseSpotlight {
  title: string
  tagline: string
  /** Which animated hero to render inside SpotlightHero. Only 'map' exists today. */
  hero: string
  cta?: string
  ctaHref?: string
  steps: Array<{ caption: string }>
  founderNote?: string
  founderEyebrow?: string
  founderSign?: string
}

export interface Release {
  version: string
  date: string
  headline?: string | null
  items: ReleaseItem[]
  spotlight?: ReleaseSpotlight
}

export const RELEASES: Release[] = [
  {
    version: 'v0.5.0-beta',
    date: 'May 8, 2026',
    headline: 'Community pricing is here. Help each other know what to pay.',
    spotlight: {
      title: 'Submit a price. Help the next fan.',
      tagline: 'Community-sourced ticket prices, right on the event page.',
      hero: 'map',
      cta: 'Try it on an event',
      ctaHref: '/events',
      steps: [
        {
          caption:
            "Open any event. If we don't have a price yet, you can submit what you paid.",
        },
        {
          caption:
            'Submitted prices get a trust mark — venue-official, resale, or community-verified.',
        },
        {
          caption: 'Prices expire automatically. Fresh data only.',
        },
      ],
      founderNote:
        "I built this after paying $90 for a show I thought was $20. The venue site had no price listed. We're fixing that, one show at a time.",
      founderSign: '— Hugh',
    },
    items: [
      {
        kind: 'added',
        text: 'Price submission — tap any event to submit what you paid. Helps everyone who comes after.',
      },
      {
        kind: 'added',
        text: 'Trust marks on prices — venue-official, resale platform, or community-submitted.',
      },
      {
        kind: 'added',
        text: 'Price expiry — submitted prices auto-expire after 7 days. No stale data.',
      },
      { kind: 'fixed', text: 'Watching list no longer flashes empty on cold start.' },
      { kind: 'fixed', text: 'Filter chips stay readable in light theme.' },
    ],
  },
  {
    version: 'v0.4.1-beta',
    date: 'Apr 24, 2026',
    headline: null,
    items: [
      {
        kind: 'added',
        text: 'Identity art for artists and venues — generative, deterministic, never the same twice.',
      },
      {
        kind: 'fixed',
        text: "Empty calendar view no longer shows yesterday's shows for a frame.",
      },
      {
        kind: 'changed',
        text: 'Filter sheet remembers your last selection within a session.',
      },
    ],
  },
  {
    version: 'v0.4.0-beta',
    date: 'Apr 15, 2026',
    headline: 'First build you can actually use end-to-end.',
    items: [
      {
        kind: 'added',
        text: 'Browse page with date picker, price filter, and venue filter.',
      },
      {
        kind: 'added',
        text: 'Event detail page with venue map and show times.',
      },
      { kind: 'added', text: 'Watching list — save shows you care about.' },
      { kind: 'added', text: 'Search across events and venues.' },
    ],
  },
]
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/lib/definitions/releases.ts
git commit -m "chore: add release types + static release data"
```

---

## Task 2: CSS keyframes

**Files:**
- Modify: `apps/web/src/app/globals.css` (after the existing `@keyframes` block, around line 88–100)

- [ ] **Step 1: Add rn* keyframes to globals.css**

Append after the `@keyframes ccEventHighlight` block:

```css
@keyframes rnPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.45; }
}
@keyframes rnSweep {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}
@keyframes rnPinDrop {
  0% { transform: translateY(-18px) scale(0.6); opacity: 0; }
  60% { transform: translateY(0) scale(1.1); opacity: 1; }
  100% { transform: translateY(0) scale(1); opacity: 1; }
}
@keyframes rnRadar {
  0% { transform: scale(0.6); opacity: 0.55; }
  100% { transform: scale(2.6); opacity: 0; }
}
@keyframes rnDrift {
  0% { transform: translate(0, 0); }
  100% { transform: translate(-12px, -8px); }
}
@keyframes rnFadeUp {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
```

- [ ] **Step 2: Verify globals.css parses (no syntax errors)**

```bash
pnpm --filter web typecheck
```

Expected: exit 0

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/globals.css
git commit -m "chore: add rn* keyframes for release notes animations"
```

---

## Task 3: useReleaseReadState hook + tests

**Files:**
- Create: `apps/web/src/components/consumer/release-notes/useReleaseReadState.ts`
- Create: `apps/web/src/components/consumer/release-notes/useReleaseReadState.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// apps/web/src/components/consumer/release-notes/useReleaseReadState.test.ts
// @vitest-environment jsdom

import { renderHook, act } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { useReleaseReadState } from './useReleaseReadState'

const VERSION = 'v0.5.0-beta'

afterEach(() => {
  localStorage.clear()
})

describe('useReleaseReadState', () => {
  it('starts unread when localStorage is empty', () => {
    const { result } = renderHook(() => useReleaseReadState(VERSION))
    expect(result.current.unread).toBe(true)
  })

  it('starts read when lastSeen matches latestVersion', () => {
    localStorage.setItem('cc.lastSeenRelease', VERSION)
    const { result } = renderHook(() => useReleaseReadState(VERSION))
    expect(result.current.unread).toBe(false)
  })

  it('markSeen sets unread=false and writes to localStorage', () => {
    const { result } = renderHook(() => useReleaseReadState(VERSION))
    expect(result.current.unread).toBe(true)
    act(() => result.current.markSeen())
    expect(result.current.unread).toBe(false)
    expect(localStorage.getItem('cc.lastSeenRelease')).toBe(VERSION)
  })

  it('pillDismissed starts false', () => {
    const { result } = renderHook(() => useReleaseReadState(VERSION))
    expect(result.current.pillDismissed).toBe(false)
  })

  it('dismissPill sets pillDismissed=true and writes to localStorage', () => {
    const { result } = renderHook(() => useReleaseReadState(VERSION))
    act(() => result.current.dismissPill())
    expect(result.current.pillDismissed).toBe(true)
    const stored = JSON.parse(localStorage.getItem('cc.dismissedSpotlights') ?? '[]') as string[]
    expect(stored).toContain(VERSION)
  })

  it('pillDismissed starts true if version already in dismissedSpotlights', () => {
    localStorage.setItem('cc.dismissedSpotlights', JSON.stringify([VERSION]))
    const { result } = renderHook(() => useReleaseReadState(VERSION))
    expect(result.current.pillDismissed).toBe(true)
  })

  it('dismissPill preserves other dismissed versions', () => {
    localStorage.setItem('cc.dismissedSpotlights', JSON.stringify(['v0.4.0-beta']))
    const { result } = renderHook(() => useReleaseReadState(VERSION))
    act(() => result.current.dismissPill())
    const stored = JSON.parse(localStorage.getItem('cc.dismissedSpotlights') ?? '[]') as string[]
    expect(stored).toContain('v0.4.0-beta')
    expect(stored).toContain(VERSION)
  })
})
```

- [ ] **Step 2: Run tests and verify they fail**

```bash
pnpm --filter web test -- --run useReleaseReadState
```

Expected: FAIL with "Cannot find module './useReleaseReadState'"

- [ ] **Step 3: Implement the hook**

```ts
// apps/web/src/components/consumer/release-notes/useReleaseReadState.ts
'use client'

import { useState, useEffect } from 'react'

const LAST_SEEN_KEY = 'cc.lastSeenRelease'
const DISMISSED_KEY = 'cc.dismissedSpotlights'

export function useReleaseReadState(latestVersion: string) {
  const [unread, setUnread] = useState(false)
  const [pillDismissed, setPillDismissed] = useState(false)

  useEffect(() => {
    const lastSeen = localStorage.getItem(LAST_SEEN_KEY)
    setUnread(lastSeen !== latestVersion)

    try {
      const raw = localStorage.getItem(DISMISSED_KEY)
      const dismissed = JSON.parse(raw ?? '[]') as unknown[]
      setPillDismissed(Array.isArray(dismissed) && dismissed.includes(latestVersion))
    } catch (err) {
      console.warn('useReleaseReadState: failed to parse dismissed spotlights', err)
    }
  }, [latestVersion])

  function markSeen() {
    localStorage.setItem(LAST_SEEN_KEY, latestVersion)
    setUnread(false)
  }

  function dismissPill() {
    try {
      const raw = localStorage.getItem(DISMISSED_KEY)
      const existing = JSON.parse(raw ?? '[]') as unknown[]
      const dismissed = Array.isArray(existing) ? existing : []
      const updated = [...new Set([...dismissed, latestVersion])]
      localStorage.setItem(DISMISSED_KEY, JSON.stringify(updated))
    } catch (err) {
      console.warn('useReleaseReadState: failed to save dismissed spotlight', err)
    }
    setPillDismissed(true)
  }

  return { unread, pillDismissed, markSeen, dismissPill }
}
```

- [ ] **Step 4: Run tests and verify they pass**

```bash
pnpm --filter web test -- --run useReleaseReadState
```

Expected: all 7 tests PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/consumer/release-notes/useReleaseReadState.ts \
        apps/web/src/components/consumer/release-notes/useReleaseReadState.test.ts
git commit -m "feat(release-notes): useReleaseReadState localStorage hook"
```

---

## Task 4: SpotlightHero component

**Files:**
- Create: `apps/web/src/components/consumer/release-notes/SpotlightHero.tsx`

No tests for this task — it is pure animation and SVG rendering; meaningful behavior tests don't exist. Visual correctness is verified in the design-review step.

- [ ] **Step 1: Create SpotlightHero**

```tsx
// apps/web/src/components/consumer/release-notes/SpotlightHero.tsx
'use client'

interface SpotlightHeroProps {
  hero?: string
  compact?: boolean
}

export function SpotlightHero({ hero = 'map', compact = false }: SpotlightHeroProps) {
  if (hero === 'map') return <MapHero compact={compact} />
  return null
}

// ── Map hero: city grid + identity-art pins + radar + parallax ─
const MAP_PINS = [
  { x: '28%', y: '55%', c: 'var(--signal)',  delay: '0.1s' },
  { x: '55%', y: '35%', c: 'var(--accent)',  delay: '0.5s' },
  { x: '70%', y: '60%', c: 'var(--success)', delay: '0.9s' },
  { x: '40%', y: '70%', c: 'var(--warning)', delay: '1.3s' },
  { x: '62%', y: '25%', c: 'var(--signal)',  delay: '1.7s' },
  { x: '20%', y: '38%', c: 'var(--accent)',  delay: '2.1s' },
  { x: '82%', y: '44%', c: 'var(--success)', delay: '2.5s' },
]

function MapHero({ compact }: { compact: boolean }) {
  const pinSize = compact ? 18 : 22
  const pinHeight = compact ? 24 : 28

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: 'var(--surface-2)',
        overflow: 'hidden',
      }}
    >
      {/* parallax drift layer */}
      <div
        style={{
          position: 'absolute',
          inset: '-10%',
          animation: 'rnDrift 18s ease-in-out infinite alternate',
        }}
      >
        {/* city grid SVG */}
        <svg
          width="120%"
          height="120%"
          viewBox="0 0 400 300"
          style={{ position: 'absolute', inset: 0 }}
          aria-hidden
        >
          {/* grid lines */}
          {[50, 100, 150, 200, 250, 300, 350].map((x) => (
            <line
              key={`v${x}`}
              x1={x} y1={0} x2={x} y2={300}
              stroke="var(--border)"
              strokeWidth="0.5"
              opacity="0.6"
            />
          ))}
          {[50, 100, 150, 200, 250].map((y) => (
            <line
              key={`h${y}`}
              x1={0} y1={y} x2={400} y2={y}
              stroke="var(--border)"
              strokeWidth="0.5"
              opacity="0.6"
            />
          ))}
          {/* river */}
          <path
            d="M 0 180 Q 80 160 140 175 Q 200 190 260 170 Q 320 150 400 165"
            fill="none"
            stroke="var(--signal)"
            strokeWidth="3"
            opacity="0.15"
          />
          {/* roads */}
          <path
            d="M 0 100 L 400 100"
            fill="none"
            stroke="var(--fg-subtle)"
            strokeWidth="1"
            opacity="0.25"
          />
          <path
            d="M 200 0 L 200 300"
            fill="none"
            stroke="var(--fg-subtle)"
            strokeWidth="1"
            opacity="0.25"
          />
          <path
            d="M 0 230 Q 120 210 260 225 L 400 220"
            fill="none"
            stroke="var(--fg-subtle)"
            strokeWidth="0.8"
            opacity="0.18"
          />
        </svg>

        {/* pins */}
        {MAP_PINS.map((pin, idx) => (
          <div
            key={idx}
            style={{
              position: 'absolute',
              left: pin.x,
              top: pin.y,
              transform: 'translate(-50%, -100%)',
              animation: `rnPinDrop 0.5s cubic-bezier(.2,.8,.2,1) ${pin.delay} both`,
            }}
          >
            {/* radar ring on last pin */}
            {idx === MAP_PINS.length - 1 && (
              <span
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: 'calc(100% - 4px)',
                  width: 12,
                  height: 12,
                  marginLeft: -6,
                  marginTop: -6,
                  borderRadius: 12,
                  background: pin.c,
                  opacity: 0.4,
                  animation: 'rnRadar 1.8s ease-out infinite',
                }}
              />
            )}
            <svg
              width={pinSize}
              height={pinHeight}
              viewBox="0 0 22 28"
              aria-hidden
              style={{
                filter: `drop-shadow(0 0 6px ${pin.c}) drop-shadow(0 4px 6px rgba(0,0,0,0.4))`,
              }}
            >
              <path
                d="M11 1 C 5 1 1 5 1 11 C 1 17 11 27 11 27 C 11 27 21 17 21 11 C 21 5 17 1 11 1 Z"
                fill="var(--bg-elevated)"
                stroke={pin.c}
                strokeWidth="1.5"
              />
              <circle cx="11" cy="11" r="3.5" fill={pin.c} />
            </svg>
          </div>
        ))}
      </div>

      {/* coordinate eyebrow */}
      {!compact && (
        <div
          style={{
            position: 'absolute',
            top: 14,
            left: 14,
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            fontWeight: 700,
            color: 'var(--fg-subtle)',
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            pointerEvents: 'none',
          }}
        >
          39.7°N · 104.9°W · Denver
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/consumer/release-notes/SpotlightHero.tsx
git commit -m "feat(release-notes): SpotlightHero map animation component"
```

---

## Task 5: SpotlightModal component + tests

**Files:**
- Create: `apps/web/src/components/consumer/release-notes/SpotlightModal.tsx`
- Create: `apps/web/src/components/consumer/release-notes/SpotlightModal.test.tsx`

- [ ] **Step 1: Write failing tests**

```tsx
// apps/web/src/components/consumer/release-notes/SpotlightModal.test.tsx
// @vitest-environment jsdom

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Release } from '@/lib/definitions/releases'
import { SpotlightModal } from './SpotlightModal'

const RELEASE: Release = {
  version: 'v0.5.0-beta',
  date: 'May 8, 2026',
  items: [],
  spotlight: {
    title: 'Submit a price. Help the next fan.',
    tagline: 'Community-sourced ticket prices.',
    hero: 'map',
    cta: 'Try it',
    ctaHref: '/events',
    steps: [
      { caption: 'Step one caption.' },
      { caption: 'Step two caption.' },
    ],
    founderNote: 'Some founder note.',
    founderSign: '— Hugh',
  },
}

describe('SpotlightModal', () => {
  it('renders spotlight title and tagline', () => {
    render(<SpotlightModal release={RELEASE} onClose={vi.fn()} />)
    expect(screen.getByText('Submit a price. Help the next fan.')).toBeTruthy()
    expect(screen.getByText('Community-sourced ticket prices.')).toBeTruthy()
  })

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn()
    render(<SpotlightModal release={RELEASE} onClose={onClose} />)
    fireEvent.click(screen.getByLabelText('Close'))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onClose when "Maybe later" is clicked', () => {
    const onClose = vi.fn()
    render(<SpotlightModal release={RELEASE} onClose={onClose} />)
    fireEvent.click(screen.getByText('Maybe later'))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('shows step 1 caption initially', () => {
    render(<SpotlightModal release={RELEASE} onClose={vi.fn()} />)
    expect(screen.getByText('Step one caption.')).toBeTruthy()
  })

  it('advances to step 2 when Next is clicked', () => {
    render(<SpotlightModal release={RELEASE} onClose={vi.fn()} />)
    fireEvent.click(screen.getByText('Next →'))
    expect(screen.getByText('Step two caption.')).toBeTruthy()
  })

  it('calls onCTA when CTA button is clicked', () => {
    const onCTA = vi.fn()
    render(<SpotlightModal release={RELEASE} onClose={vi.fn()} onCTA={onCTA} />)
    fireEvent.click(screen.getByText('Try it'))
    expect(onCTA).toHaveBeenCalledOnce()
  })

  it('renders founder note', () => {
    render(<SpotlightModal release={RELEASE} onClose={vi.fn()} />)
    expect(screen.getByText('Some founder note.')).toBeTruthy()
  })

  it('returns null when release has no spotlight', () => {
    const releaseNoSpotlight: Release = {
      version: 'v0.4.0-beta',
      date: 'Apr 15, 2026',
      items: [],
    }
    const { container } = render(
      <SpotlightModal release={releaseNoSpotlight} onClose={vi.fn()} />,
    )
    expect(container.firstChild).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests and verify they fail**

```bash
pnpm --filter web test -- --run SpotlightModal
```

Expected: FAIL with "Cannot find module './SpotlightModal'"

- [ ] **Step 3: Implement SpotlightModal**

```tsx
// apps/web/src/components/consumer/release-notes/SpotlightModal.tsx
'use client'

import { useState } from 'react'
import type { Release } from '@/lib/definitions/releases'
import { SpotlightHero } from './SpotlightHero'

interface SpotlightModalProps {
  release: Release
  onClose: () => void
  onCTA?: () => void
  variant?: 'desktop' | 'mobile'
}

export function SpotlightModal({
  release,
  onClose,
  onCTA,
  variant = 'desktop',
}: SpotlightModalProps) {
  const sp = release.spotlight
  const [step, setStep] = useState(0)

  if (!sp) return null

  const isMobile = variant === 'mobile'
  const totalSteps = sp.steps.length

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--scrim)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isMobile ? 0 : 32,
        zIndex: 200,
      }}
    >
      <div
        style={{
          width: isMobile ? '100%' : 580,
          maxWidth: '100%',
          height: isMobile ? '100%' : 'auto',
          maxHeight: isMobile ? '100%' : '90vh',
          background: 'var(--bg-elevated)',
          borderRadius: isMobile ? 0 : 20,
          border: isMobile ? 'none' : '1px solid var(--border-strong)',
          boxShadow: isMobile ? 'none' : '0 32px 80px rgba(0,0,0,0.55)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: 'var(--font-ui)',
          color: 'var(--fg)',
        }}
      >
        {/* hero */}
        <div
          style={{
            position: 'relative',
            height: isMobile ? 280 : 300,
            background: 'var(--surface-2)',
            flexShrink: 0,
          }}
        >
          <SpotlightHero hero={sp.hero} />

          {/* close button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              all: 'unset',
              cursor: 'pointer',
              position: 'absolute',
              top: 14,
              right: 14,
              width: 32,
              height: 32,
              borderRadius: 16,
              background: 'rgba(0,0,0,0.45)',
              border: '1px solid var(--border-strong)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--fg)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
              <path
                d="M3 3l6 6M9 3l-6 6"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>

          {/* eyebrow over hero */}
          <div
            style={{
              position: 'absolute',
              left: 22,
              bottom: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: 6,
                background: 'var(--accent)',
                boxShadow: '0 0 6px var(--accent)',
                animation: 'rnPulse 1.4s ease-in-out infinite',
              }}
            />
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                fontWeight: 700,
                color: 'var(--accent)',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                textShadow: '0 1px 4px rgba(0,0,0,0.6)',
              }}
            >
              Feature drop · {release.version}
            </span>
          </div>
        </div>

        {/* body */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: isMobile ? '22px 22px 18px' : '26px 30px 22px',
          }}
        >
          <h2
            style={{
              fontSize: isMobile ? 28 : 30,
              fontWeight: 900,
              letterSpacing: '-0.03em',
              lineHeight: 1.08,
              margin: '0 0 6px',
            }}
          >
            {sp.title}
          </h2>
          <p
            style={{
              fontSize: 16,
              fontWeight: 500,
              color: 'var(--fg-muted)',
              margin: '0 0 22px',
              lineHeight: 1.4,
            }}
          >
            {sp.tagline}
          </p>

          {/* walkthrough carousel */}
          <div
            style={{
              background: 'var(--surface-1)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: '16px 18px',
              marginBottom: 18,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 10,
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  fontWeight: 700,
                  color: 'var(--fg-subtle)',
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                }}
              >
                How it works
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  fontWeight: 700,
                  color: 'var(--fg-subtle)',
                  letterSpacing: '0.12em',
                }}
              >
                {String(step + 1).padStart(2, '0')} / {String(totalSteps).padStart(2, '0')}
              </span>
            </div>

            <div
              key={step}
              style={{
                display: 'flex',
                gap: 14,
                alignItems: 'flex-start',
                padding: '10px 0 16px',
                animation: 'rnFadeUp 360ms ease both',
              }}
            >
              <div
                style={{
                  flexShrink: 0,
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  background: 'var(--surface-3)',
                  border: '1px solid var(--signal)',
                  color: 'var(--signal)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 14,
                  fontWeight: 800,
                }}
              >
                {step + 1}
              </div>
              <div
                style={{
                  flex: 1,
                  fontSize: 15,
                  lineHeight: 1.45,
                  color: 'var(--fg)',
                  letterSpacing: '-0.005em',
                  paddingTop: 5,
                }}
              >
                {sp.steps[step]?.caption}
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
              }}
            >
              <button
                type="button"
                onClick={() => setStep(Math.max(0, step - 1))}
                disabled={step === 0}
                style={{
                  all: 'unset',
                  cursor: step === 0 ? 'default' : 'pointer',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  fontWeight: 800,
                  color: step === 0 ? 'var(--fg-subtle)' : 'var(--fg-muted)',
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  opacity: step === 0 ? 0.4 : 1,
                }}
              >
                ← Back
              </button>

              {/* step dots */}
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                {Array.from({ length: totalSteps }).map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setStep(idx)}
                    aria-label={`Go to step ${idx + 1}`}
                    style={{
                      all: 'unset',
                      cursor: 'pointer',
                      width: idx === step ? 22 : 6,
                      height: 6,
                      borderRadius: 6,
                      background:
                        idx === step ? 'var(--signal)' : 'var(--border-strong)',
                      transition: 'width 220ms ease',
                    }}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={() => setStep(Math.min(totalSteps - 1, step + 1))}
                disabled={step === totalSteps - 1}
                style={{
                  all: 'unset',
                  cursor: step === totalSteps - 1 ? 'default' : 'pointer',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  fontWeight: 800,
                  color:
                    step === totalSteps - 1 ? 'var(--fg-subtle)' : 'var(--signal)',
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  opacity: step === totalSteps - 1 ? 0.4 : 1,
                }}
              >
                Next →
              </button>
            </div>
          </div>

          {/* founder note */}
          {sp.founderNote && (
            <div
              style={{
                padding: '14px 16px',
                borderLeft: '2px solid var(--accent)',
                background: 'var(--surface-1)',
                borderRadius: '0 10px 10px 0',
                marginBottom: 4,
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  fontWeight: 700,
                  color: 'var(--accent)',
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  marginBottom: 6,
                }}
              >
                {sp.founderEyebrow ?? 'Behind the build'}
              </div>
              <p
                style={{
                  fontSize: 14,
                  lineHeight: 1.5,
                  color: 'var(--fg)',
                  letterSpacing: '-0.005em',
                  margin: 0,
                }}
              >
                {sp.founderNote}
              </p>
              <div
                style={{
                  marginTop: 8,
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  fontWeight: 800,
                  color: 'var(--fg-muted)',
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                }}
              >
                {sp.founderSign ?? '— Hugh'}
              </div>
            </div>
          )}
        </div>

        {/* footer CTAs */}
        <div
          style={{
            padding: isMobile ? '14px 22px 22px' : '16px 30px 24px',
            borderTop: '1px solid var(--border)',
            background: 'var(--surface-1)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            flexShrink: 0,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              all: 'unset',
              cursor: 'pointer',
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              fontWeight: 800,
              color: 'var(--fg-muted)',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
            }}
          >
            Maybe later
          </button>
          <span style={{ flex: 1 }} />
          {sp.cta && sp.ctaHref ? (
            <button
              type="button"
              onClick={onCTA ?? onClose}
              style={{
                all: 'unset',
                cursor: 'pointer',
                background: 'var(--signal)',
                color: 'var(--fg-on-accent)',
                padding: '12px 20px',
                borderRadius: 999,
                fontWeight: 800,
                fontSize: 14,
                letterSpacing: '-0.01em',
                boxShadow: '0 6px 16px var(--overlay-press)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              {sp.cta}
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden>
                <path
                  d="M4 3l4 3-4 3"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              style={{
                all: 'unset',
                cursor: 'pointer',
                background: 'var(--signal)',
                color: 'var(--fg-on-accent)',
                padding: '12px 20px',
                borderRadius: 999,
                fontWeight: 800,
                fontSize: 14,
                letterSpacing: '-0.01em',
                boxShadow: '0 6px 16px var(--overlay-press)',
              }}
            >
              Got it
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run tests and verify they pass**

```bash
pnpm --filter web test -- --run SpotlightModal
```

Expected: all 8 tests PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/consumer/release-notes/SpotlightModal.tsx \
        apps/web/src/components/consumer/release-notes/SpotlightModal.test.tsx
git commit -m "feat(release-notes): SpotlightModal takeover component"
```

---

## Task 6: ReleaseEntry component + tests

**Files:**
- Create: `apps/web/src/components/consumer/release-notes/ReleaseEntry.tsx`
- Create: `apps/web/src/components/consumer/release-notes/ReleaseEntry.test.tsx`

- [ ] **Step 1: Write failing tests**

```tsx
// apps/web/src/components/consumer/release-notes/ReleaseEntry.test.tsx
// @vitest-environment jsdom

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Release } from '@/lib/definitions/releases'
import { ReleaseEntry } from './ReleaseEntry'

const BASE_RELEASE: Release = {
  version: 'v0.5.0-beta',
  date: 'May 8, 2026',
  headline: 'Community pricing is here.',
  items: [
    { kind: 'added', text: 'Price submission feature.' },
    { kind: 'fixed', text: 'Watching list flash fixed.' },
  ],
}

const SPOTLIGHT_RELEASE: Release = {
  ...BASE_RELEASE,
  spotlight: {
    title: 'Submit a price.',
    tagline: 'Community pricing.',
    hero: 'map',
    steps: [{ caption: 'Step one.' }],
  },
}

describe('ReleaseEntry', () => {
  it('renders version and date', () => {
    render(<ReleaseEntry release={BASE_RELEASE} />)
    expect(screen.getByText('v0.5.0-beta')).toBeTruthy()
    expect(screen.getByText('May 8, 2026')).toBeTruthy()
  })

  it('renders headline when present', () => {
    render(<ReleaseEntry release={BASE_RELEASE} />)
    expect(screen.getByText('Community pricing is here.')).toBeTruthy()
  })

  it('renders release items', () => {
    render(<ReleaseEntry release={BASE_RELEASE} />)
    expect(screen.getByText('Price submission feature.')).toBeTruthy()
    expect(screen.getByText('Watching list flash fixed.')).toBeTruthy()
  })

  it('shows Live badge when isLatest', () => {
    render(<ReleaseEntry release={BASE_RELEASE} isLatest />)
    expect(screen.getByText('Live')).toBeTruthy()
  })

  it('does not show Live badge when not isLatest', () => {
    render(<ReleaseEntry release={BASE_RELEASE} />)
    expect(screen.queryByText('Live')).toBeNull()
  })

  it('does not render spotlight strip when no spotlight', () => {
    render(<ReleaseEntry release={BASE_RELEASE} />)
    expect(screen.queryByText('Feature drop · announcement')).toBeNull()
  })

  it('renders spotlight strip when spotlight present', () => {
    render(<ReleaseEntry release={SPOTLIGHT_RELEASE} />)
    expect(screen.getByText('Feature drop · announcement')).toBeTruthy()
  })

  it('calls onOpenSpotlight when spotlight strip clicked', () => {
    const onOpenSpotlight = vi.fn()
    render(
      <ReleaseEntry
        release={SPOTLIGHT_RELEASE}
        onOpenSpotlight={onOpenSpotlight}
      />,
    )
    fireEvent.click(screen.getByText('See the announcement'))
    expect(onOpenSpotlight).toHaveBeenCalledWith(SPOTLIGHT_RELEASE)
  })
})
```

- [ ] **Step 2: Run tests and verify they fail**

```bash
pnpm --filter web test -- --run ReleaseEntry
```

Expected: FAIL with "Cannot find module './ReleaseEntry'"

- [ ] **Step 3: Implement ReleaseEntry**

```tsx
// apps/web/src/components/consumer/release-notes/ReleaseEntry.tsx
'use client'

import type { Release, ReleaseItem } from '@/lib/definitions/releases'

const KIND_LABEL: Record<ReleaseItem['kind'], string> = {
  added: 'Added',
  fixed: 'Fixed',
  changed: 'Changed',
  removed: 'Removed',
}

const KIND_COLOR: Record<ReleaseItem['kind'], string> = {
  added: 'var(--success)',
  fixed: 'var(--signal)',
  changed: 'var(--fg-muted)',
  removed: 'var(--warning)',
}

interface ReleaseEntryProps {
  release: Release
  isLatest?: boolean
  onOpenSpotlight?: (release: Release) => void
}

export function ReleaseEntry({
  release,
  isLatest = false,
  onOpenSpotlight,
}: ReleaseEntryProps) {
  return (
    <div style={{ position: 'relative', paddingLeft: 36, paddingBottom: 36 }}>
      {/* timeline node */}
      <div
        style={{
          position: 'absolute',
          left: 6,
          top: 6,
          width: 11,
          height: 11,
          borderRadius: 11,
          background: isLatest ? 'var(--signal)' : 'var(--bg)',
          border: `1.5px solid ${isLatest ? 'var(--signal)' : 'var(--border-strong)'}`,
          boxShadow: isLatest ? '0 0 8px var(--signal)' : 'none',
        }}
      />

      {/* meta line */}
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 12,
          marginBottom: 8,
          flexWrap: 'wrap',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 14,
            fontWeight: 800,
            color: 'var(--fg)',
            letterSpacing: '0.02em',
          }}
        >
          {release.version}
        </span>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            fontWeight: 600,
            color: 'var(--fg-subtle)',
            letterSpacing: '0.10em',
            textTransform: 'uppercase',
          }}
        >
          {release.date}
        </span>
        {isLatest && (
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              fontWeight: 800,
              color: 'var(--signal)',
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              padding: '2px 6px',
              border: '1px solid var(--signal)',
              borderRadius: 3,
            }}
          >
            Live
          </span>
        )}
      </div>

      {/* spotlight strip */}
      {release.spotlight && (
        <SpotlightStrip
          release={release}
          onOpen={() => onOpenSpotlight?.(release)}
        />
      )}

      {/* headline */}
      {release.headline && (
        <div
          style={{
            fontSize: 19,
            fontWeight: 700,
            color: 'var(--fg)',
            letterSpacing: '-0.02em',
            lineHeight: 1.25,
            marginBottom: 10,
          }}
        >
          {release.headline}
        </div>
      )}

      {/* items grouped by kind */}
      {(['added', 'fixed', 'changed', 'removed'] as const).map((kind) => {
        const inGroup = release.items.filter((item) => item.kind === kind)
        return inGroup.map((item, idx) => (
          <ReleaseItemRow key={`${kind}-${idx}`} item={item} />
        ))
      })}
    </div>
  )
}

// ── Spotlight strip ────────────────────────────────────────────

function SpotlightStrip({
  release,
  onOpen,
}: {
  release: Release
  onOpen: () => void
}) {
  const sp = release.spotlight
  if (!sp) return null

  return (
    <button
      type="button"
      onClick={onOpen}
      style={{
        all: 'unset',
        cursor: 'pointer',
        display: 'block',
        width: '100%',
        marginBottom: 18,
        borderRadius: 14,
        overflow: 'hidden',
        border: '1px solid var(--border-strong)',
        background: 'var(--bg-elevated)',
        position: 'relative',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 200px) minmax(0, 1fr)',
          minHeight: 132,
        }}
      >
        {/* mini hero */}
        <div style={{ position: 'relative', background: 'var(--surface-2)' }}>
          {/* small colored indicator instead of full hero to avoid animation cost */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                background: 'var(--accent)',
                boxShadow: '0 0 24px var(--accent)',
                opacity: 0.6,
                animation: 'rnPulse 2s ease-in-out infinite',
              }}
            />
          </div>
        </div>

        {/* text */}
        <div
          style={{
            padding: '16px 18px',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            justifyContent: 'center',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              fontWeight: 700,
              color: 'var(--accent)',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
            }}
          >
            Feature drop · announcement
          </span>
          <div
            style={{
              fontSize: 18,
              fontWeight: 800,
              letterSpacing: '-0.02em',
              color: 'var(--fg)',
              lineHeight: 1.2,
            }}
          >
            {sp.title}
          </div>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              fontWeight: 700,
              color: 'var(--signal)',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              marginTop: 4,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            See the announcement
            <svg width="9" height="9" viewBox="0 0 12 12" fill="none" aria-hidden>
              <path
                d="M4 3l4 3-4 3"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      </div>
    </button>
  )
}

// ── Single item row ────────────────────────────────────────────

function ReleaseItemRow({ item }: { item: ReleaseItem }) {
  const label = KIND_LABEL[item.kind]
  const color = KIND_COLOR[item.kind]

  return (
    <div
      style={{
        display: 'flex',
        gap: 12,
        padding: '9px 0',
        alignItems: 'flex-start',
      }}
    >
      <div style={{ paddingTop: 2 }}>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            fontWeight: 800,
            color,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            padding: '2px 6px',
            borderRadius: 3,
            border: `1px solid ${color}`,
            opacity: 0.85,
            flexShrink: 0,
            lineHeight: 1.2,
            display: 'inline-block',
          }}
        >
          {label}
        </span>
      </div>
      <div
        style={{
          flex: 1,
          minWidth: 0,
          fontSize: 14,
          lineHeight: 1.5,
          color: 'var(--fg)',
          letterSpacing: '-0.005em',
        }}
      >
        {item.text}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run tests and verify they pass**

```bash
pnpm --filter web test -- --run ReleaseEntry
```

Expected: all 8 tests PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/consumer/release-notes/ReleaseEntry.tsx \
        apps/web/src/components/consumer/release-notes/ReleaseEntry.test.tsx
git commit -m "feat(release-notes): ReleaseEntry changelog block component"
```

---

## Task 7: ReleasePage + /changelog route

**Files:**
- Create: `apps/web/src/components/consumer/release-notes/ReleasePage.tsx`
- Create: `apps/web/src/app/(protected)/changelog/page.tsx`

No unit tests for ReleasePage — it is a composition component and its children are individually tested. The page is a trivial server component with metadata. Verified in the design-review step.

- [ ] **Step 1: Create ReleasePage (client component)**

```tsx
// apps/web/src/components/consumer/release-notes/ReleasePage.tsx
'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Release } from '@/lib/definitions/releases'
import { useReleaseReadState } from './useReleaseReadState'
import { ReleaseEntry } from './ReleaseEntry'
import { SpotlightModal } from './SpotlightModal'
import { FeedbackModal } from '@/components/consumer/feedback/FeedbackModal'

interface ReleasePageProps {
  releases: Release[]
}

export function ReleasePage({ releases }: ReleasePageProps) {
  const router = useRouter()
  const latestVersion = releases[0]?.version ?? ''
  const { markSeen } = useReleaseReadState(latestVersion)

  const [spotlightRelease, setSpotlightRelease] = useState<Release | null>(null)
  const [feedbackOpen, setFeedbackOpen] = useState(false)

  // Mark changelog as seen on mount
  useEffect(() => {
    markSeen()
  // markSeen is stable — only run once on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleOpenSpotlight = useCallback((release: Release) => {
    setSpotlightRelease(release)
  }, [])

  const handleCloseSpotlight = useCallback(() => {
    setSpotlightRelease(null)
  }, [])

  const handleCTA = useCallback(() => {
    if (!spotlightRelease?.spotlight?.ctaHref) return
    setSpotlightRelease(null)
    void router.push(spotlightRelease.spotlight.ctaHref)
  }, [router, spotlightRelease])

  return (
    <>
      <div
        style={{
          width: '100%',
          minHeight: '100%',
          background: 'var(--bg)',
          color: 'var(--fg)',
          fontFamily: 'var(--font-ui)',
          padding: '56px 32px 80px',
        }}
      >
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          {/* page header */}
          <div
            style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: 6,
                background: 'var(--signal)',
                boxShadow: '0 0 6px var(--signal)',
                animation: 'rnPulse 1.8s ease-in-out infinite',
              }}
            />
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                fontWeight: 700,
                color: 'var(--signal)',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
              }}
            >
              Transmission log
            </span>
          </div>

          <h1
            style={{
              fontSize: 46,
              fontWeight: 900,
              letterSpacing: '-0.035em',
              margin: '4px 0 8px',
              lineHeight: 1.04,
            }}
          >
            What we shipped.
          </h1>

          <p
            style={{
              fontSize: 16,
              fontWeight: 500,
              color: 'var(--fg-muted)',
              margin: '0 0 36px',
              maxWidth: 540,
              lineHeight: 1.5,
            }}
          >
            Everything we&apos;ve shipped, in one place. Spotted a bug or got an idea?{' '}
            <button
              type="button"
              onClick={() => setFeedbackOpen(true)}
              style={{
                all: 'unset',
                cursor: 'pointer',
                color: 'var(--accent)',
                borderBottom: '1px dotted var(--accent)',
              }}
            >
              Send us a note
            </button>
            .
          </p>

          {/* timeline */}
          <div style={{ position: 'relative' }}>
            <div
              style={{
                position: 'absolute',
                left: 11,
                top: 8,
                bottom: 8,
                width: 1,
                background:
                  'linear-gradient(to bottom, var(--border-strong), transparent 95%)',
              }}
            />
            {releases.map((release, idx) => (
              <ReleaseEntry
                key={release.version}
                release={release}
                isLatest={idx === 0}
                onOpenSpotlight={handleOpenSpotlight}
              />
            ))}
          </div>

          <div
            style={{
              marginTop: 20,
              padding: '18px 0',
              textAlign: 'center',
              color: 'var(--fg-subtle)',
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
            }}
          >
            — end of log —
          </div>
        </div>
      </div>

      {/* spotlight modal triggered from the strip re-opener */}
      {spotlightRelease && (
        <SpotlightModal
          release={spotlightRelease}
          onClose={handleCloseSpotlight}
          onCTA={handleCTA}
        />
      )}

      {feedbackOpen && <FeedbackModal onClose={() => setFeedbackOpen(false)} />}
    </>
  )
}
```

- [ ] **Step 2: Check FeedbackModal export path**

```bash
grep -n "export.*FeedbackModal" apps/web/src/components/consumer/feedback/FeedbackModal.tsx
```

If the export path differs, update the import in ReleasePage.tsx accordingly.

- [ ] **Step 3: Create the /changelog page**

```tsx
// apps/web/src/app/(protected)/changelog/page.tsx
import type { Metadata } from 'next'
import { RELEASES } from '@/lib/definitions/releases'
import { ReleasePage } from '@/components/consumer/release-notes/ReleasePage'

export const metadata: Metadata = {
  title: 'What we shipped — Concert Crawl',
  description: 'Every update, in one place.',
}

export default function ChangelogPage() {
  return <ReleasePage releases={RELEASES} />
}
```

- [ ] **Step 4: Run typecheck**

```bash
pnpm --filter web typecheck
```

Expected: exit 0 (fix any type errors before continuing)

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/consumer/release-notes/ReleasePage.tsx \
        apps/web/src/app/(protected)/changelog/page.tsx
git commit -m "feat(release-notes): ReleasePage + /changelog route"
```

---

## Task 8: FeatureDropPill component + tests

**Files:**
- Create: `apps/web/src/components/consumer/release-notes/FeatureDropPill.tsx`
- Create: `apps/web/src/components/consumer/release-notes/FeatureDropPill.test.tsx`

- [ ] **Step 1: Write failing tests**

```tsx
// apps/web/src/components/consumer/release-notes/FeatureDropPill.test.tsx
// @vitest-environment jsdom

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Release } from '@/lib/definitions/releases'
import { FeatureDropPill } from './FeatureDropPill'

const RELEASE: Release = {
  version: 'v0.5.0-beta',
  date: 'May 8, 2026',
  items: [],
  spotlight: {
    title: 'Submit a price.',
    tagline: 'Community pricing.',
    hero: 'map',
    steps: [{ caption: 'Step one.' }],
  },
}

describe('FeatureDropPill', () => {
  it('renders the spotlight title', () => {
    render(<FeatureDropPill release={RELEASE} onOpen={vi.fn()} />)
    expect(screen.getByText('Submit a price.')).toBeTruthy()
  })

  it('calls onOpen when pill button is clicked', () => {
    const onOpen = vi.fn()
    render(<FeatureDropPill release={RELEASE} onOpen={onOpen} />)
    // click the pill wrapper (first button)
    fireEvent.click(screen.getAllByRole('button')[0]!)
    expect(onOpen).toHaveBeenCalledOnce()
  })

  it('calls onDismiss when dismiss X is clicked (without triggering onOpen)', () => {
    const onOpen = vi.fn()
    const onDismiss = vi.fn()
    render(
      <FeatureDropPill release={RELEASE} onOpen={onOpen} onDismiss={onDismiss} />,
    )
    fireEvent.click(screen.getByLabelText('Dismiss'))
    expect(onDismiss).toHaveBeenCalledOnce()
    expect(onOpen).not.toHaveBeenCalled()
  })

  it('returns null when release has no spotlight', () => {
    const noSpotlight: Release = {
      version: 'v0.4.0-beta',
      date: 'Apr 15, 2026',
      items: [],
    }
    const { container } = render(
      <FeatureDropPill release={noSpotlight} onOpen={vi.fn()} />,
    )
    expect(container.firstChild).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests and verify they fail**

```bash
pnpm --filter web test -- --run FeatureDropPill
```

Expected: FAIL with "Cannot find module './FeatureDropPill'"

- [ ] **Step 3: Implement FeatureDropPill**

```tsx
// apps/web/src/components/consumer/release-notes/FeatureDropPill.tsx
'use client'

import type { Release } from '@/lib/definitions/releases'

interface FeatureDropPillProps {
  release: Release
  onOpen: () => void
  onDismiss?: () => void
  variant?: 'desktop' | 'mobile'
}

export function FeatureDropPill({
  release,
  onOpen,
  onDismiss,
  variant = 'desktop',
}: FeatureDropPillProps) {
  const sp = release.spotlight
  if (!sp) return null

  const isMobile = variant === 'mobile'

  return (
    <button
      type="button"
      onClick={onOpen}
      style={{
        all: 'unset',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        padding: isMobile ? '8px 12px 8px 10px' : '10px 14px 10px 12px',
        borderRadius: 999,
        background: 'var(--bg-elevated)',
        border: '1px solid var(--accent)',
        boxShadow: '0 12px 32px rgba(0,0,0,0.45), 0 0 0 4px var(--overlay-hover)',
        color: 'var(--fg)',
        fontFamily: 'var(--font-ui)',
        position: 'relative',
        animation: 'rnFadeUp 600ms cubic-bezier(.2,.8,.2,1) both',
      }}
    >
      {/* radar dot */}
      <span
        style={{
          position: 'relative',
          width: 14,
          height: 14,
          flexShrink: 0,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 14,
            background: 'var(--accent)',
            opacity: 0.35,
            animation: 'rnRadar 1.8s ease-out infinite',
          }}
        />
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: 8,
            background: 'var(--accent)',
            boxShadow: '0 0 8px var(--accent)',
          }}
        />
      </span>

      {/* text */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          minWidth: 0,
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            fontWeight: 800,
            color: 'var(--accent)',
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
          }}
        >
          Feature drop
        </span>
        <span
          style={{
            fontSize: isMobile ? 13 : 14,
            fontWeight: 700,
            letterSpacing: '-0.015em',
            color: 'var(--fg)',
            whiteSpace: 'nowrap',
          }}
        >
          {sp.title}
        </span>
      </div>

      {/* dismiss X */}
      {onDismiss && (
        <span
          role="button"
          tabIndex={0}
          onClick={(ev) => {
            ev.stopPropagation()
            onDismiss()
          }}
          onKeyDown={(ev) => {
            if (ev.key === 'Enter' || ev.key === ' ') {
              ev.stopPropagation()
              onDismiss()
            }
          }}
          aria-label="Dismiss"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 22,
            height: 22,
            borderRadius: 11,
            color: 'var(--fg-subtle)',
            marginLeft: 2,
            cursor: 'pointer',
          }}
        >
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden>
            <path
              d="M3 3l6 6M9 3l-6 6"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </span>
      )}
    </button>
  )
}
```

- [ ] **Step 4: Run tests and verify they pass**

```bash
pnpm --filter web test -- --run FeatureDropPill
```

Expected: all 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/consumer/release-notes/FeatureDropPill.tsx \
        apps/web/src/components/consumer/release-notes/FeatureDropPill.test.tsx
git commit -m "feat(release-notes): FeatureDropPill floating pill component"
```

---

## Task 9: FeatureDropPillGate + protected layout integration

**Files:**
- Create: `apps/web/src/components/consumer/release-notes/FeatureDropPillGate.tsx`
- Modify: `apps/web/src/app/(protected)/layout.tsx`

No unit tests — gate is a thin integration shell. Verified visually in design review.

- [ ] **Step 1: Create FeatureDropPillGate**

```tsx
// apps/web/src/components/consumer/release-notes/FeatureDropPillGate.tsx
'use client'

import { useCallback, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { RELEASES } from '@/lib/definitions/releases'
import { useReleaseReadState } from './useReleaseReadState'
import { FeatureDropPill } from './FeatureDropPill'
import { SpotlightModal } from './SpotlightModal'

const LATEST = RELEASES[0]

export function FeatureDropPillGate() {
  const pathname = usePathname()
  const router = useRouter()

  const latestVersion = LATEST?.version ?? ''
  const { pillDismissed, dismissPill } = useReleaseReadState(latestVersion)

  const [modalOpen, setModalOpen] = useState(false)

  // Don't show pill on the changelog itself or admin pages
  const hidden = pathname === '/changelog' || pathname.startsWith('/admin')

  const handleOpen = useCallback(() => setModalOpen(true), [])
  const handleClose = useCallback(() => setModalOpen(false), [])
  const handleDismiss = useCallback(() => dismissPill(), [dismissPill])

  const handleCTA = useCallback(() => {
    if (!LATEST?.spotlight?.ctaHref) return
    setModalOpen(false)
    void router.push(LATEST.spotlight.ctaHref)
  }, [router])

  if (!LATEST?.spotlight || pillDismissed || hidden) return null

  return (
    <>
      {/* pill: bottom-right on desktop, above 52px tab bar on mobile */}
      <div
        style={{
          position: 'fixed',
          right: 20,
          bottom: 20,
          zIndex: 80,
        }}
        className="sm:bottom-5 sm:right-5 bottom-[72px]"
      >
        <FeatureDropPill
          release={LATEST}
          variant="desktop"
          onOpen={handleOpen}
          onDismiss={handleDismiss}
        />
      </div>

      {modalOpen && (
        <SpotlightModal
          release={LATEST}
          onClose={handleClose}
          onCTA={handleCTA}
        />
      )}
    </>
  )
}
```

**Note on mobile positioning:** Tailwind `bottom-[72px]` puts the pill 72px from the bottom (20px above the 52px tab bar). `sm:bottom-5` resets to 20px on desktop (sm breakpoint = 640px). The `style` inline `bottom: 20` acts as the desktop fallback; Tailwind classes override it at the right breakpoints.

- [ ] **Step 2: Add FeatureDropPillGate to protected layout**

Open `apps/web/src/app/(protected)/layout.tsx` and add the import + component:

```tsx
// apps/web/src/app/(protected)/layout.tsx
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { FeedbackEdgeTabGate } from '@/components/consumer/feedback'
import { OnboardingThemeFlush } from '@/components/auth/OnboardingThemeFlush'
import { FeatureDropPillGate } from '@/components/consumer/release-notes/FeatureDropPillGate'

interface ProtectedLayoutProps {
  children: React.ReactNode
}

export default async function ProtectedLayout({
  children,
}: ProtectedLayoutProps) {
  const { userId } = await auth()

  if (!userId) {
    redirect('/sign-in')
  }

  return (
    <>
      {children}
      <FeedbackEdgeTabGate />
      <FeatureDropPillGate />
      <OnboardingThemeFlush />
    </>
  )
}
```

- [ ] **Step 3: Run typecheck**

```bash
pnpm --filter web typecheck
```

Expected: exit 0

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/consumer/release-notes/FeatureDropPillGate.tsx \
        apps/web/src/app/(protected)/layout.tsx
git commit -m "feat(release-notes): FeatureDropPillGate + protected layout integration"
```

---

## Task 10: UserMenuVersionFooter + UserMenu integration

**Files:**
- Create: `apps/web/src/components/consumer/release-notes/UserMenuVersionFooter.tsx`
- Create: `apps/web/src/components/consumer/release-notes/UserMenuVersionFooter.test.tsx`
- Modify: `apps/web/src/components/consumer/user-menu/UserMenu.tsx`

- [ ] **Step 1: Write failing tests**

```tsx
// apps/web/src/components/consumer/release-notes/UserMenuVersionFooter.test.tsx
// @vitest-environment jsdom

import { render, screen, fireEvent } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { UserMenuVersionFooter } from './UserMenuVersionFooter'

const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

afterEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
})

describe('UserMenuVersionFooter', () => {
  it('renders the build label', () => {
    render(<UserMenuVersionFooter build="v0.5.0-beta" />)
    expect(screen.getByText('v0.5.0-beta')).toBeTruthy()
  })

  it('shows Changelog text when not unread', () => {
    localStorage.setItem('cc.lastSeenRelease', 'v0.5.0-beta')
    render(<UserMenuVersionFooter build="v0.5.0-beta" />)
    expect(screen.getByText("Changelog")).toBeTruthy()
  })

  it('shows What\'s new when unread', () => {
    // no lastSeen in localStorage → unread
    render(<UserMenuVersionFooter build="v0.5.0-beta" />)
    // wait for effect to run (useReleaseReadState uses useEffect)
    // use getByText after initial render; effect sets unread=true
    // Note: in jsdom useEffect runs synchronously inside act, which render wraps
    expect(screen.getByText("What's new")).toBeTruthy()
  })

  it('navigates to /changelog when clicked', () => {
    render(<UserMenuVersionFooter build="v0.5.0-beta" />)
    fireEvent.click(screen.getByRole('button'))
    expect(mockPush).toHaveBeenCalledWith('/changelog')
  })
})
```

- [ ] **Step 2: Run tests and verify they fail**

```bash
pnpm --filter web test -- --run UserMenuVersionFooter
```

Expected: FAIL with "Cannot find module './UserMenuVersionFooter'"

- [ ] **Step 3: Implement UserMenuVersionFooter**

```tsx
// apps/web/src/components/consumer/release-notes/UserMenuVersionFooter.tsx
'use client'

import { useRouter } from 'next/navigation'
import { RELEASES } from '@/lib/definitions/releases'
import { useReleaseReadState } from './useReleaseReadState'

interface UserMenuVersionFooterProps {
  build: string
}

export function UserMenuVersionFooter({ build }: UserMenuVersionFooterProps) {
  const router = useRouter()
  const latestVersion = RELEASES[0]?.version ?? ''
  const { unread } = useReleaseReadState(latestVersion)

  return (
    <button
      type="button"
      onClick={() => void router.push('/changelog')}
      aria-label="View changelog"
      style={{
        all: 'unset',
        cursor: 'pointer',
        width: '100%',
        padding: '10px 14px',
        borderTop: '1px solid var(--border)',
        background: 'var(--surface-1)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        boxSizing: 'border-box',
      }}
    >
      <span
        style={{
          width: 5,
          height: 5,
          borderRadius: 5,
          flexShrink: 0,
          background: 'var(--signal)',
          boxShadow: '0 0 5px var(--signal)',
          animation: 'rnPulse 2.2s ease-in-out infinite',
        }}
      />
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          fontWeight: 700,
          color: 'var(--fg-muted)',
          letterSpacing: '0.10em',
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
        }}
      >
        {build}
      </span>
      <span style={{ flex: 1 }} />
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          fontWeight: 700,
          color: unread ? 'var(--accent)' : 'var(--fg-subtle)',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        {unread && (
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: 6,
              background: 'var(--accent)',
              boxShadow: '0 0 6px var(--accent)',
              animation: 'rnPulse 1.4s ease-in-out infinite',
            }}
          />
        )}
        {unread ? "What's new" : 'Changelog'}
        <svg width="9" height="9" viewBox="0 0 12 12" fill="none" aria-hidden>
          <path
            d="M4 3l4 3-4 3"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </button>
  )
}
```

- [ ] **Step 4: Run tests and verify they pass**

```bash
pnpm --filter web test -- --run UserMenuVersionFooter
```

Expected: all 4 tests PASS

- [ ] **Step 5: Replace static footer in UserMenu.tsx**

In `apps/web/src/components/consumer/user-menu/UserMenu.tsx`:

Add the import after existing imports:
```tsx
import { UserMenuVersionFooter } from '@/components/consumer/release-notes/UserMenuVersionFooter'
```

Find the static "Status footer" section in `MenuBody` (around the `umPulse` animation block) and replace it entirely with:

```tsx
      {/* Status footer — routes to /changelog, shows unread dot */}
      <UserMenuVersionFooter build={buildLabel} />
```

The static footer block to remove starts with:
```tsx
      {/* Status footer */}
      <div
        style={{
          padding: '10px 14px',
          borderTop: '1px solid var(--border)',
          background: 'var(--surface-1)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
```
...and ends after the closing `</div>` of that footer section.

- [ ] **Step 6: Run typecheck + tests**

```bash
pnpm --filter web typecheck && pnpm --filter web test -- --run
```

Expected: 0 type errors, all tests pass

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/components/consumer/release-notes/UserMenuVersionFooter.tsx \
        apps/web/src/components/consumer/release-notes/UserMenuVersionFooter.test.tsx \
        apps/web/src/components/consumer/user-menu/UserMenu.tsx
git commit -m "feat(release-notes): UserMenuVersionFooter + UserMenu integration"
```

---

## Task 11: Index re-exports + full quality gate

**Files:**
- Create: `apps/web/src/components/consumer/release-notes/index.ts`

- [ ] **Step 1: Create index.ts**

```ts
// apps/web/src/components/consumer/release-notes/index.ts
export { FeatureDropPill } from './FeatureDropPill'
export { FeatureDropPillGate } from './FeatureDropPillGate'
export { ReleaseEntry } from './ReleaseEntry'
export { ReleasePage } from './ReleasePage'
export { SpotlightHero } from './SpotlightHero'
export { SpotlightModal } from './SpotlightModal'
export { UserMenuVersionFooter } from './UserMenuVersionFooter'
export { useReleaseReadState } from './useReleaseReadState'
```

- [ ] **Step 2: Full quality gate**

```bash
pnpm --filter web typecheck
pnpm --filter web lint
pnpm --filter web test -- --run
```

Expected: 0 type errors, 0 lint errors, all tests pass. Fix any issues before continuing.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/consumer/release-notes/index.ts
git commit -m "chore(release-notes): re-export index for release-notes module"
```

---

## Task 12: Open GH issue + update progress.md

- [ ] **Step 1: Open GitHub issue**

```bash
gh issue create \
  --title "feat(release-notes): changelog page + feature spotlight system" \
  --label "type: feature,source: internal,phase: beta,priority: normal" \
  --body "$(cat <<'EOF'
## Summary

Implements the release notes system from the design handoff at \`design/design_handoff_release_notes/\`.

## Components
- \`/changelog\` — protected route with transmission-log visual style
- \`FeatureDropPillGate\` — floating pill (bottom-right desktop, above tab bar mobile) for marquee feature drops
- \`SpotlightModal\` — full-screen takeover with animated hero, walkthrough carousel, founder note, CTA
- \`UserMenuVersionFooter\` — drop-in for the static version footer; navigates to /changelog; shows unread dot
- Static release data in \`lib/definitions/releases.ts\`; localStorage read-state (no server tracking)

## Decisions
- Static TS file for releases (deploy-gated, founder-authored, no infra)
- Pill shows only when latest release has a spotlight and hasn't been dismissed
- \`/changelog\` marks releases as seen on mount; unread dot persists until next visit
- Pill hidden on \`/changelog\` and \`/admin\` routes

Closes this issue when merged.
EOF
)"
```

- [ ] **Step 2: Update docs/superpowers/progress.md**

Add a 🔄 row for this PR. Check the current progress.md format with:

```bash
tail -20 docs/superpowers/progress.md
```

Then add a row matching the existing format, marking the PR as In Progress.

- [ ] **Step 3: Commit progress update**

```bash
git add docs/superpowers/progress.md
git commit -m "docs(progress): track release notes PR"
```

---

## Self-Review Against Spec

Checked design handoff README against plan tasks:

| Spec requirement | Covered in |
|---|---|
| Floating feature-drop pill, bottom-right desktop | Task 9 (FeatureDropPillGate) |
| Pill above tab bar on mobile | Task 9 (bottom-[72px]) |
| Pill shows only when release has spotlight | Task 9 (gate condition) |
| Pill dismissible; re-openable from changelog strip | Task 8 (dismiss), Task 6 (strip) |
| SpotlightModal: hero + carousel + founder note + CTA | Task 5 |
| "Maybe later" always available | Task 5 |
| /changelog with timeline rail, monospace eyebrows | Task 7 (ReleasePage) |
| Spotlight strip in /changelog entry → re-opens modal | Tasks 6 + 7 |
| UMStatusFooterRN drop-in for UserMenu footer | Task 10 |
| Unread dot on footer: localStorage keyed by version | Tasks 3 + 10 |
| Pill dismissal: localStorage cc.dismissedSpotlights | Task 3 |
| Changelog read: cc.lastSeenRelease on /changelog mount | Tasks 3 + 7 |
| Static release data, Price Transparency as spotlight | Task 1 |
| No raw hex — all theme tokens | All component tasks |
| Validated across electric/jade/light (design-review) | Design review step |
| /changelog private for pre-launch | Task 7 (under (protected)) |
