# Onboarding Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix onboarding layout, chrome, copy, back-button style, Caveat font, and add a returning-user middleware redirect — closing issues #134, #135, #138, #80, and the script-font sign-off callout.

**Architecture:** All changes are confined to `apps/web`. The shell (`OnboardingShell.tsx`) gets a full layout overhaul — responsive desktop card at ≥1240px, correct chrome (top header, BetaPill, wordmark), and a restructured nav with the Next button above a secondary row containing the back link and step counter. The middleware gets one new guard for the returning-user redirect. Everything else is targeted copy/style fixes.

**Tech Stack:** Next.js 14 App Router, React, inline styles (no Tailwind in onboarding shell), `next/font/google` for Caveat, Clerk middleware, Vitest for the middleware unit test.

---

## File Map

| Action | Path | Purpose |
|--------|------|---------|
| Create | `apps/web/src/components/brand/cc-cluster-mark/CCClusterMark.tsx` | SVG cluster mark icon |
| Modify | `apps/web/src/app/layout.tsx` | Add Caveat font via `next/font/google` |
| Modify | `apps/web/src/components/onboarding/OnboardingShell.tsx` | Full layout refactor — mobile + desktop |
| Modify | `apps/web/src/components/onboarding/steps/YoureIn.tsx` | Step 5 copy (#138) |
| Modify | `apps/web/src/middleware.ts` | Returning-user redirect (#80) |
| Modify | `apps/web/src/middleware.test.ts` | Unit test for returning-user redirect |

---

## Task 1: Create CCClusterMark component

The cluster mark is an SVG that appears in the onboarding top chrome (mobile + desktop) and as the faint desktop watermark. It does not exist as a production component yet.

**Files:**
- Create: `apps/web/src/components/brand/cc-cluster-mark/CCClusterMark.tsx`

- [ ] **Step 1.1: Create the component**

```tsx
// apps/web/src/components/brand/cc-cluster-mark/CCClusterMark.tsx
interface CCClusterMarkProps {
  size?: number
  color?: string
  glow?: string | null
  className?: string
  style?: React.CSSProperties
}

export function CCClusterMark({
  size = 32,
  color = 'currentColor',
  glow = null,
  className,
  style,
}: CCClusterMarkProps) {
  const glowColor = glow ?? color
  const trail = [
    { cx: 14, cy: 76, r: 1.5 },
    { cx: 24, cy: 70, r: 2 },
    { cx: 34, cy: 64, r: 2.5 },
    { cx: 42, cy: 58, r: 3 },
    { cx: 50, cy: 50, r: 4 },
    { cx: 58, cy: 42, r: 5 },
    { cx: 66, cy: 32, r: 6 },
  ]
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 96 96"
      style={{ display: 'block', ...style }}
      className={className}
      aria-hidden="true"
    >
      <circle cx="72" cy="24" r="20" fill={glowColor} opacity="0.18" />
      <circle cx="72" cy="24" r="12" fill={glowColor} opacity="0.36" />
      <circle cx="72" cy="24" r="7" fill={color} />
      {trail.map((dot, idx) => (
        <circle
          key={idx}
          cx={dot.cx}
          cy={dot.cy}
          r={dot.r}
          fill={color}
          opacity={0.35 + idx * 0.09}
        />
      ))}
    </svg>
  )
}
```

- [ ] **Step 1.2: Commit**

```bash
git add apps/web/src/components/brand/cc-cluster-mark/CCClusterMark.tsx
git commit -m "feat(brand): add CCClusterMark SVG component"
```

---

## Task 2: Load Caveat font

Caveat is referenced in `FounderNote.tsx` for the `— Hugh` sign-off but is not loaded — it currently falls back to Inter, rendering as sans-serif instead of script.

**Files:**
- Modify: `apps/web/src/app/layout.tsx`

- [ ] **Step 2.1: Add Caveat to font imports**

In `apps/web/src/app/layout.tsx`, add Caveat to the existing `next/font/google` imports:

```tsx
import { Inter, JetBrains_Mono, Caveat } from 'next/font/google'
```

- [ ] **Step 2.2: Configure the font**

After the `mono` constant (around line 19), add:

```tsx
const caveat = Caveat({
  subsets: ['latin'],
  variable: '--font-handwriting',
  weight: ['400', '600', '700'],
})
```

- [ ] **Step 2.3: Apply the variable to the html element**

Update the `className` on `<html>` to include the new variable:

```tsx
className={cn(inter.variable, mono.variable, caveat.variable)}
```

- [ ] **Step 2.4: Update FounderNote to use the CSS variable**

In `apps/web/src/components/onboarding/steps/FounderNote.tsx`, change the sign-off `fontFamily` from the hardcoded string to the CSS variable:

```tsx
// Before:
fontFamily: "'Caveat', 'Inter', system-ui",

// After:
fontFamily: "var(--font-handwriting), 'Caveat', system-ui",
```

- [ ] **Step 2.5: Commit**

```bash
git add apps/web/src/app/layout.tsx apps/web/src/components/onboarding/steps/FounderNote.tsx
git commit -m "fix(onboarding): load Caveat font for founder sign-off script style"
```

---

## Task 3: Update YoureIn step 5 copy (#138)

**Files:**
- Modify: `apps/web/src/components/onboarding/steps/YoureIn.tsx`

Changes:
1. Subtitle line 2: `Tell us when we're wrong.` → `You'll be shaping the app.`
2. Expand the lede paragraph
3. Remove the `BETA CHANNEL · ALWAYS OPEN` box (which contains the email)

- [ ] **Step 3.1: Replace the entire YoureIn component**

```tsx
// apps/web/src/components/onboarding/steps/YoureIn.tsx
import { Eyebrow, Lede, StepHeading } from './_primitives'

export function YoureIn() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <Eyebrow tone="accent">You&apos;re in</Eyebrow>
      <StepHeading>
        One last thing.
        <br />
        <span style={{ color: 'var(--accent)' }}>
          You&apos;ll be shaping the app.
        </span>
      </StepHeading>
      <Lede>
        You&apos;re not just here to use the thing — you&apos;re here to make
        it better. When something changes, we&apos;ll ask what you think.
        When something breaks, we want to know.
      </Lede>
      <Lede>
        The Give Feedback button lives in your menu — always there, never
        buried. Tap it and you&apos;ll see a quick category picker and a
        free-form message field. Thirty seconds. I read every one.
      </Lede>
    </div>
  )
}
```

- [ ] **Step 3.2: Commit**

```bash
git add apps/web/src/components/onboarding/steps/YoureIn.tsx
git commit -m "fix(onboarding): update step 5 copy — feedback nudge, remove email (#138)"
```

---

## Task 4: Refactor OnboardingShell — mobile layout (#135)

This task fixes the mobile layout: adds top chrome, restructures the nav to match the spec (Next button full-width, then a secondary row with the back link + step counter), and reskins the back button as a text link.

**Files:**
- Modify: `apps/web/src/components/onboarding/OnboardingShell.tsx`

The back button must now be **always rendered** (disabled on step 1 with `opacity: 0.4` and `cursor: default`) rather than conditionally mounted. The step counter format changes from `1 / 5` to `STEP 1 OF 5`.

- [ ] **Step 4.1: Replace the OnboardingShell with the corrected mobile layout**

Replace the full file content:

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ProgressDots } from './ProgressDots'
import { CCClusterMark } from '@/components/brand/cc-cluster-mark/CCClusterMark'
import { CCWordmark } from '@/components/brand/cc-wordmark/CCWordmark'
import { BetaPill } from '@/components/brand/beta-pill/BetaPill'
import { FounderNote } from './steps/FounderNote'
import { HowItWorks } from './steps/HowItWorks'
import { WhatItDoesToday } from './steps/WhatItDoesToday'
import { WhatItDoesntYet } from './steps/WhatItDoesntYet'
import { YoureIn } from './steps/YoureIn'

const FLOW = ['welcome', 'how', 'today', 'notyet', 'done'] as const
type StepKey = (typeof FLOW)[number]

const STEP_LABELS: Record<StepKey, string> = {
  welcome: 'WELCOME',
  how: 'HOW IT WORKS',
  today: 'TODAY',
  notyet: 'NOT YET',
  done: "YOU'RE IN",
}

// Steps whose desktop card is wider (620px instead of 520px)
const WIDE_STEPS = new Set<StepKey>(['welcome', 'today', 'notyet'])

function StepContent({ stepKey }: { stepKey: StepKey }) {
  if (stepKey === 'welcome') return <FounderNote />
  if (stepKey === 'how') return <HowItWorks />
  if (stepKey === 'today') return <WhatItDoesToday />
  if (stepKey === 'notyet') return <WhatItDoesntYet />
  if (stepKey === 'done') return <YoureIn />
  return null
}

export function OnboardingShell() {
  const [index, setIndex] = useState(0)
  const router = useRouter()
  const total = FLOW.length
  const isFirst = index === 0
  const isLast = index === total - 1
  const stepKey = FLOW[index]!

  function goNext() {
    if (isLast) {
      router.push('/sign-up')
      return
    }
    setIndex((ii) => Math.min(ii + 1, total - 1))
  }

  function goBack() {
    if (isFirst) return
    setIndex((ii) => ii - 1)
  }

  return (
    <>
      {/* Mobile layout (< 1240px) */}
      <div
        style={{
          height: '100dvh',
          background: 'var(--bg)',
          color: 'var(--fg)',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: 'Inter, system-ui',
        }}
        className="onboarding-mobile"
      >
        {/* Top chrome */}
        <header
          style={{
            flexShrink: 0,
            padding: '18px 20px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <CCClusterMark size={22} color="var(--signal)" glow="var(--accent)" />
            <CCWordmark size={16} />
          </div>
          <BetaPill />
        </header>

        {/* Progress strip */}
        <div
          style={{
            flexShrink: 0,
            padding: '4px 22px 8px',
          }}
        >
          <ProgressDots total={total} index={index} />
        </div>

        {/* Scrollable body */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            padding: '10px 22px 8px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'safe center',
          }}
        >
          <StepContent stepKey={stepKey} />
        </div>

        {/* Nav */}
        <nav
          style={{
            flexShrink: 0,
            padding: '12px 22px 22px',
            display: 'flex',
            flexDirection: 'column',
            gap: 0,
          }}
        >
          {/* Primary CTA */}
          <button
            onClick={goNext}
            style={{
              all: 'unset',
              cursor: 'pointer',
              textAlign: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: 52,
              borderRadius: 10,
              background: 'var(--signal)',
              color: 'var(--fg-on-accent)',
              fontFamily: 'Inter, system-ui',
              fontWeight: 800,
              fontSize: 16,
              letterSpacing: '-0.01em',
              boxShadow: '0 12px 32px -12px var(--signal)',
            }}
          >
            {isLast ? 'Continue to sign-up →' : 'Next →'}
          </button>

          {/* Secondary row: back link + step counter */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: 14,
            }}
          >
            <button
              onClick={goBack}
              disabled={isFirst}
              style={{
                all: 'unset',
                cursor: isFirst ? 'default' : 'pointer',
                opacity: isFirst ? 0.4 : 1,
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.10em',
                textTransform: 'uppercase',
                color: 'var(--fg-muted)',
              }}
            >
              ← Back
            </button>
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'var(--fg-subtle)',
              }}
            >
              Step {index + 1} of {total}
            </span>
          </div>
        </nav>
      </div>

      {/* Desktop layout (≥ 1240px) — same content, centered card */}
      <div
        style={{ display: 'none' }}
        className="onboarding-desktop"
      >
        <OnboardingDesktop
          index={index}
          total={total}
          isFirst={isFirst}
          isLast={isLast}
          stepKey={stepKey}
          onNext={goNext}
          onBack={goBack}
        />
      </div>
    </>
  )
}

interface DesktopProps {
  index: number
  total: number
  isFirst: boolean
  isLast: boolean
  stepKey: StepKey
  onNext: () => void
  onBack: () => void
}

function OnboardingDesktop({
  index,
  total,
  isFirst,
  isLast,
  stepKey,
  onNext,
  onBack,
}: DesktopProps) {
  const cardWidth = WIDE_STEPS.has(stepKey) ? 620 : 520

  return (
    <div
      style={{
        position: 'relative',
        height: '100dvh',
        background: 'var(--bg)',
        color: 'var(--fg)',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'Inter, system-ui',
        overflow: 'hidden',
      }}
    >
      {/* Faint watermark — cluster mark top-right */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: -60,
          right: -60,
          pointerEvents: 'none',
          zIndex: 0,
        }}
      >
        <CCClusterMark
          size={380}
          color="var(--fg)"
          style={{ opacity: 0.07, transform: 'rotate(-12deg)' } as React.CSSProperties}
        />
      </div>

      {/* Outer header */}
      <header
        style={{
          position: 'relative',
          zIndex: 1,
          flexShrink: 0,
          padding: '22px 48px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--fg-subtle)',
          }}
        >
          Code accepted · Welcome
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <CCClusterMark size={26} color="var(--signal)" glow="var(--accent)" />
          <CCWordmark size={20} />
        </div>
        <BetaPill />
      </header>

      {/* Centered card */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 48px 32px',
        }}
      >
        <div
          style={{
            width: cardWidth,
            height: 640,
            borderRadius: 16,
            border: '1px solid var(--border-strong)',
            boxShadow: '0 32px 80px rgba(0,0,0,0.4)',
            background: 'var(--bg-elevated)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Card header: progress dots + step label */}
          <div
            style={{
              flexShrink: 0,
              padding: '22px 32px 10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <ProgressDots total={total} index={index} />
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'var(--fg-subtle)',
              }}
            >
              {STEP_LABELS[stepKey]}
            </span>
          </div>

          {/* Card body */}
          <div
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: 'auto',
              padding: '8px 32px 12px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'safe center',
            }}
          >
            <StepContent stepKey={stepKey} />
          </div>

          {/* Card nav */}
          <nav
            style={{
              flexShrink: 0,
              padding: '14px 32px 22px',
              borderTop: '1px solid var(--border)',
              display: 'flex',
              flexDirection: 'column',
              gap: 0,
            }}
          >
            <button
              onClick={onNext}
              style={{
                all: 'unset',
                cursor: 'pointer',
                textAlign: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: 52,
                borderRadius: 10,
                background: 'var(--signal)',
                color: 'var(--fg-on-accent)',
                fontFamily: 'Inter, system-ui',
                fontWeight: 800,
                fontSize: 16,
                letterSpacing: '-0.01em',
                boxShadow: '0 12px 32px -12px var(--signal)',
              }}
            >
              {isLast ? 'Continue to sign-up →' : 'Next →'}
            </button>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: 14,
              }}
            >
              <button
                onClick={onBack}
                disabled={isFirst}
                style={{
                  all: 'unset',
                  cursor: isFirst ? 'default' : 'pointer',
                  opacity: isFirst ? 0.4 : 1,
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.10em',
                  textTransform: 'uppercase',
                  color: 'var(--fg-muted)',
                }}
              >
                ← Back
              </button>
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: 'var(--fg-subtle)',
                }}
              >
                Step {index + 1} of {total}
              </span>
            </div>
          </nav>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4.2: Add responsive CSS to globals.css**

The mobile/desktop toggle uses CSS classes. Add the following to `apps/web/src/app/globals.css` (append after existing rules):

```css
/* Onboarding responsive layout */
.onboarding-mobile { display: flex; }
.onboarding-desktop { display: none; }

@media (min-width: 1240px) {
  .onboarding-mobile { display: none !important; }
  .onboarding-desktop { display: block !important; }
}
```

- [ ] **Step 4.3: Run typecheck**

```bash
pnpm --filter web typecheck
```

Expected: no errors.

- [ ] **Step 4.4: Commit**

```bash
git add apps/web/src/components/onboarding/OnboardingShell.tsx \
        apps/web/src/components/brand/cc-cluster-mark/CCClusterMark.tsx \
        apps/web/src/app/globals.css
git commit -m "fix(onboarding): layout overhaul — chrome, desktop card, back button (#134 #135)"
```

---

## Task 5: Add returning-user redirect to middleware (#80)

Users who redeemed an invite code but never completed sign-up will have the `invite_verified` cookie set but no Clerk session. When they land on `/` they currently see the public landing page. This adds a redirect to `/onboarding` for that case.

**Files:**
- Modify: `apps/web/src/middleware.ts`
- Modify (or create): `apps/web/src/middleware.test.ts`

- [ ] **Step 5.1: Write the failing test**

Check if a test file exists first: `ls apps/web/src/middleware.test.ts`. If it does not exist, create it. If it does, append the new `describe` block.

```ts
// apps/web/src/middleware.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

// Minimal stub — we test only the redirect logic, not Clerk internals
vi.mock('@clerk/nextjs/server', () => ({
  clerkMiddleware: (handler: (auth: unknown, req: NextRequest) => unknown) =>
    handler,
  createRouteMatcher: (patterns: string[]) => (req: NextRequest) =>
    patterns.some((p) => {
      const base = p.replace(/\(.*\)/, '')
      return req.nextUrl.pathname.startsWith(base)
    }),
}))

describe('middleware — returning-user redirect', () => {
  it('redirects unauthenticated users with invite cookie from / to /onboarding', async () => {
    const { default: middleware } = await import('./middleware')

    const req = new NextRequest('http://localhost/', {
      headers: { cookie: 'invite_verified=abc123' },
    })

    // Cast: our stub exposes the handler directly
    const result = await (middleware as unknown as (auth: { userId: null }, req: NextRequest) => Promise<NextResponse>)(
      { userId: null },
      req,
    )

    expect(result).toBeInstanceOf(NextResponse)
    expect(result?.headers.get('location')).toContain('/onboarding')
  })

  it('does not redirect unauthenticated users without invite cookie from /', async () => {
    const { default: middleware } = await import('./middleware')

    const req = new NextRequest('http://localhost/')

    const result = await (middleware as unknown as (auth: { userId: null }, req: NextRequest) => Promise<NextResponse | undefined>)(
      { userId: null },
      req,
    )

    // isAlwaysPublic — should return undefined (no redirect)
    expect(result).toBeUndefined()
  })
})
```

- [ ] **Step 5.2: Run the test to confirm it fails**

```bash
pnpm --filter web test middleware
```

Expected: both tests fail (the redirect does not exist yet).

- [ ] **Step 5.3: Add the redirect guard to middleware.ts**

In `apps/web/src/middleware.ts`, add the check immediately **after** the `if (userId)` block and **before** the `if (isAlwaysPublic(req)) return` line:

```ts
// Returning users: redeemed code but never completed sign-up
// invite_verified cookie is set but no Clerk session → send them to onboarding
if (!userId && req.nextUrl.pathname === '/') {
  const hasInviteCookie = req.cookies.has('invite_verified')
  if (hasInviteCookie) {
    return NextResponse.redirect(new URL('/onboarding', req.url))
  }
}
```

The updated handler should look like:

```ts
export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth()

  if (userId) {
    if (isPreAuth(req)) {
      return NextResponse.redirect(new URL('/events', req.url))
    }
    return
  }

  // Returning users: redeemed code but never completed sign-up
  if (!userId && req.nextUrl.pathname === '/') {
    const hasInviteCookie = req.cookies.has('invite_verified')
    if (hasInviteCookie) {
      return NextResponse.redirect(new URL('/onboarding', req.url))
    }
  }

  if (isAlwaysPublic(req)) return

  if (isInviteGated(req)) {
    const cookieValue = req.cookies.get('invite_verified')?.value
    if (!cookieValue) {
      return NextResponse.redirect(new URL('/auth/code', req.url))
    }
    return
  }

  await auth.protect()
})
```

- [ ] **Step 5.4: Run the test to confirm it passes**

```bash
pnpm --filter web test middleware
```

Expected: both tests pass.

- [ ] **Step 5.5: Run typecheck**

```bash
pnpm --filter web typecheck
```

Expected: no errors.

- [ ] **Step 5.6: Commit**

```bash
git add apps/web/src/middleware.ts apps/web/src/middleware.test.ts
git commit -m "fix(middleware): redirect returning users with invite cookie to /onboarding (#80)"
```

---

## Task 6: Final checks and PR

- [ ] **Step 6.1: Run lint**

```bash
pnpm --filter web lint
```

Fix any reported issues before continuing.

- [ ] **Step 6.2: Run full test suite**

```bash
pnpm --filter web test
```

Expected: all tests pass.

- [ ] **Step 6.3: Run typecheck**

```bash
pnpm --filter web typecheck
```

Expected: no errors.

- [ ] **Step 6.4: Open the app locally and walk through all 5 onboarding steps**

Verify visually on both mobile viewport (375px wide) and desktop viewport (≥1240px):
- Top chrome present: cluster mark + wordmark left, PRIVATE BETA pill right
- Progress dots advance correctly on each step
- Step 1: back button rendered but visually muted (opacity 0.4), disabled
- Steps 2–5: back button active, clicking it goes back
- Step counter reads "Step X of 5" in the secondary row
- Desktop: card appears centered with correct width (620px on welcome/today/notyet, 520px on how/done)
- Desktop: outer header shows "CODE ACCEPTED · WELCOME" left, wordmark center, BetaPill right
- Desktop: faint cluster mark watermark top-right
- Step 1 (FounderNote): `— Hugh` renders in Caveat script font
- Step 5 (YoureIn): new copy, no email callout box

- [ ] **Step 6.5: Push and open PR**

```bash
git push -u origin fix/onboarding-polish
```

Open PR using `.github/pull_request_template.md`. Include `Closes #134`, `Closes #135`, `Closes #138`, `Closes #80` in the PR body.
