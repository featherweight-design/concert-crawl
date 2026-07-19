# PWA Cluster — install polish · offline polish · web push — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Take the three PWA cluster tickets — [#969](https://github.com/HartiganHM/concert-crawl/issues/969) install polish · [#970](https://github.com/HartiganHM/concert-crawl/issues/970) offline polish · [#971](https://github.com/HartiganHM/concert-crawl/issues/971) web push (Tier C) — from the merged design handoff into shipped features. Turn the Tier B minimal install prompt + offline banner into on-brand, voice-passed surfaces, and add a narrow web push stack (watch updates + price drops only) with a settings home in the existing profile screen.

**Architecture:** Extract a shared `AppChrome` (top `AppBar` + bottom `PwaTabBar`) so the install slot and offline pill live in one canonical top-right chrome. Ship a new `~offline` fallback route that reads real Serwist cache entries. Add `push_subscriptions` + `user_notification_preferences` Drizzle tables (expand/contract), five new `watch.*` notification categories (kept as free-text on the existing `notifications.category` column and constrained at the write layer with Zod), a `push` + `notificationclick` handler in the service worker, and a `send-push` pipeline that respects per-user preferences before firing.

**Tech Stack:** Next.js 15.5.20 (App Router), React 19, TypeScript strict, Tailwind v4, Serwist (`@serwist/next` + `serwist`), `web-push` (Node), Vitest, Playwright.

**Spec:** [`docs/superpowers/specs/2026-07-18-pwa-cluster-design-brief.md`](../specs/2026-07-18-pwa-cluster-design-brief.md) (merged in PR [#1039](https://github.com/HartiganHM/concert-crawl/pull/1039))
**Design handoff:** `design/design_handoff_pwa_cluster/` — Readiness verdict: 🟢 Green (READINESS.md)
**Predecessor:** PWA Tier B ([plan](2026-07-16-pwa-tier-b.md), shipped in PRs [#990](https://github.com/HartiganHM/concert-crawl/pull/990) + [#1000](https://github.com/HartiganHM/concert-crawl/pull/1000) + [#1001](https://github.com/HartiganHM/concert-crawl/pull/1001) + [#1007](https://github.com/HartiganHM/concert-crawl/pull/1007) + fixes [#1020](https://github.com/HartiganHM/concert-crawl/pull/1020)/[#1029](https://github.com/HartiganHM/concert-crawl/pull/1029)/[#1035](https://github.com/HartiganHM/concert-crawl/pull/1035))

## Global Constraints

- **TDD**: every new module lands with tests first (see per-task TDD steps).
- **Voice bar (Sour Patch, #782)** — every displayed string reads like a concert-goer wrote it. Copy lifts **verbatim** from `INSTALL_COPY` / `OFFLINE_COPY` / `PUSH_COPY` in `design/design_handoff_pwa_cluster/pwa-data.jsx` into `definitions/copy.ts` files. Do not rewrite copy — the strings are voice-passed and the READINESS audit locked them.
- **Web-first principle** — every ask dismissible; no on-load takeovers; browser permission dialogs only fire from an explicit user tap; `Escape` + scrim-tap always close sheets.
- **Tokens only** — every color reads from `var(--*)`; no ad-hoc hex on authored surfaces. Theme parity holds across Electric / Jade / Light.
- **TypeScript strict; no `as` casts** — use Zod `safeParse` at boundaries (untrusted Web Push payloads in the SW, permission API results, cached JSON reads, `localStorage` reads), type guards, or declaration merging (`BeforeInstallPromptEvent` — already merged in `apps/web/src/lib/pwa/beforeinstallprompt.ts`).
- **All customer-facing strings in `definitions/copy.ts`** (project convention).
- **Components**: arrow functions, no `handle*` names, logic in `lib/`, semantic HTML, a11y (keyboard/ARIA/44px touch), no native `title=` tooltips on authored surfaces.
- **Mobile/desktop parity in the same PR** — non-negotiable. Every consumer surface must ship both mobile and desktop artboards in the same PR; the design handoff covers both. Reference: the parity rule is documented in `docs/superpowers/design-pipeline.md` under the Readiness Review audit dimensions.
- **Pre-push**: run workspace pkg builds so integration tests resolve subpath imports:
  ```
  pnpm turbo run build --filter=@concert-crawl/crawler-core --filter=@concert-crawl/price-pipeline --filter=@concert-crawl/types --filter=@concert-crawl/entitlements
  ```
  Then `pnpm --filter @concert-crawl/web typecheck && pnpm --filter @concert-crawl/web lint && pnpm --filter @concert-crawl/web test`.
- **DATABASE_URL_TEST** — set a session-local test DB (e.g. `concert_crawl_test_pwa_cluster`) to avoid shared-DB truncation with concurrent agents.
- **Cluster ships as 3 sequential impl PRs.** Each PR passes CI on its own. Low-risk-first order (install → offline → push) per Hugh's Q2 lock.
- **Category constraint** — the existing `notifications.category` column stays `text` (not enum) to match the current admin categories (`crawl.*`, `contest.*`) that ship in production. New push categories are validated at the write layer via a Zod union so the added user categories can't be typo'd. See PR-C Task 1.
- **Release notes on user-facing PRs** — each of PR-A, PR-B, PR-C adds an entry to `apps/web/src/lib/definitions/releases.ts` on the same branch.

---

## Sequencing lock

PR order is **install → offline → push**. Low-risk-first — install has no backend, offline has no data model, push has schema + external delivery. Merge each in sequence:

| PR   | Ticket              | Depends on                                                                                            |
| ---- | ------------------- | ----------------------------------------------------------------------------------------------------- |
| PR-A | #969 install polish | Tier B PWA (merged)                                                                                   |
| PR-B | #970 offline polish | PR-A (shared `AppChrome`)                                                                             |
| PR-C | #971 push stack     | PR-B (only for `NotificationsSection` live in real `SettingsRoute`; push infra itself is independent) |

`AppChrome` extraction happens in PR-A (Task 1) so PR-B's offline pill can slot into it without re-shuffling.

---

## Phase / PR-A — #969 Install polish

Extract the shared app chrome, add the polished install slot + iOS "Here's how" sheet, wire dismissal persistence per the design (first dismiss 30 days, second dismiss forever), lift verbatim copy.

**Removes the Tier B `InstallPrompt.tsx` (fixed-position bottom card) — it's replaced by the header slot.**

### Task 1: Extract shared `AppChrome` (`AppBar` + `PwaTabBar`)

**Files:**

- Create: `apps/web/src/components/consumer/app-chrome/AppChrome.tsx`
- Create: `apps/web/src/components/consumer/app-chrome/AppBar.tsx`
- Create: `apps/web/src/components/consumer/app-chrome/PwaTabBar.tsx`
- Create: `apps/web/src/components/consumer/app-chrome/definitions/copy.ts`
- Create: `apps/web/src/components/consumer/app-chrome/__tests__/AppBar.test.tsx`
- Modify: existing `apps/web/src/components/consumer/app-header/AppHeader.tsx` callers to consume `AppBar` (or leave `AppHeader` in place and have `AppBar` render it — see interfaces).

**Interfaces:**

- Produces: `<AppChrome>{children}</AppChrome>` — renders top `AppBar` (mark + wordmark + search + right-side slots), children (page content), and bottom `PwaTabBar` (browse · venues · watching · account).
- `<AppBar rightSlots?: ReactNode />` — top-right slot host used by `InstallSlot` (PR-A) and `OfflinePill` (PR-B). No hard-wired knowledge of either; each caller passes them in.
- `<PwaTabBar />` — bottom nav, 4 tabs matching the design (browse · venues · watching · account). Reuses existing routing.

- [ ] **Step 1: Audit current header usage**

Grep for `AppHeader` usage across `apps/web/src/app/**` and `apps/web/src/components/**`. Note every mount so we can migrate them to `AppChrome`. Also check `apps/web/src/components/consumer/bottom-nav/` for the existing bottom nav — reuse or replace with `PwaTabBar`.

- [ ] **Step 2: Write failing test for `AppBar` slot rendering**

```tsx
// apps/web/src/components/consumer/app-chrome/__tests__/AppBar.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AppBar } from '../AppBar'

describe('AppBar', () => {
  it('renders the mark + wordmark', () => {
    render(<AppBar />)
    expect(screen.getByLabelText(/concert crawl/i)).toBeInTheDocument()
  })

  it('renders right-side slot children in the top-right', () => {
    render(<AppBar rightSlots={<button>Install</button>} />)
    expect(screen.getByRole('button', { name: /install/i })).toBeInTheDocument()
  })

  it('collapses the wordmark at ≤320px', () => {
    // JSDOM defaults to 1024w; test the collapse class prop directly.
    // Require BOTH `hidden` at the base breakpoint AND `sm:inline` — either
    // alone leaves the ≤320px regression signal weak (an implementation that
    // sets sm:inline without hidden at base would falsely pass).
    render(<AppBar />)
    const wordmark = screen.getByTestId('appbar-wordmark')
    expect(wordmark.className).toMatch(/\bhidden\b/)
    expect(wordmark.className).toMatch(/\bsm:inline\b/)
  })
})
```

Run: `pnpm --filter @concert-crawl/web test -- AppBar`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `AppBar`**

Model the shape after the existing `AppHeader` — mark + wordmark + search circle on the left, `rightSlots?: ReactNode` on the right. Collapse the wordmark below `sm` so the slot never clips at 320px (per design gap-report item #4 in READINESS.md).

Reference:

```tsx
// apps/web/src/components/consumer/app-chrome/AppBar.tsx
import Link from 'next/link'
// import existing mark from consumer/app-header/AppHeader or wherever CCMark lives

interface AppBarProps {
  rightSlots?: React.ReactNode
}

export const AppBar = ({ rightSlots }: AppBarProps) => (
  <header
    className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-bg px-4 py-3"
    aria-label="Concert Crawl"
  >
    <div className="flex items-center gap-3">
      {/* CCMark link home */}
      <Link href="/" aria-label="Concert Crawl">
        {/* <CCMark size={32} /> */}
      </Link>
      <span
        data-testid="appbar-wordmark"
        className="hidden sm:inline text-lg font-extrabold text-fg"
      >
        Concert Crawl
      </span>
    </div>
    <div className="flex items-center gap-2">
      {rightSlots}
      {/* search circle, account glyph, etc. — carry forward from existing AppHeader */}
    </div>
  </header>
)
```

- [ ] **Step 4: Implement `PwaTabBar` and `AppChrome` wrapper**

```tsx
// apps/web/src/components/consumer/app-chrome/AppChrome.tsx
import { AppBar } from './AppBar'
import { PwaTabBar } from './PwaTabBar'

interface AppChromeProps {
  rightSlots?: React.ReactNode
  children: React.ReactNode
}

export const AppChrome = ({ rightSlots, children }: AppChromeProps) => (
  <>
    <AppBar rightSlots={rightSlots} />
    <main className="flex-1 pb-[64px]">{children}</main>
    <PwaTabBar />
  </>
)
```

`PwaTabBar` should either reuse the existing `bottom-nav` component verbatim or supersede it — decide by inspection. If the existing bottom nav is only mounted in one place, migrate it here and re-export for compatibility. If it's mounted across many pages, wrap it here without moving the source file.

- [ ] **Step 5: Migrate callers**

Replace `<AppHeader />` mounts with `<AppChrome rightSlots={...}>...</AppChrome>` in every page/layout that hosts consumer chrome. Keep `AppHeader` in place if it has non-chrome responsibilities; otherwise delete it.

- [ ] **Step 6: Run tests + typecheck + lint**

Run: `pnpm --filter @concert-crawl/web typecheck && pnpm --filter @concert-crawl/web lint && pnpm --filter @concert-crawl/web test`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/components/consumer/app-chrome apps/web/src/app apps/web/src/components/consumer/app-header
git commit -m "refactor(web): extract AppChrome (AppBar + PwaTabBar) with right-slot host"
```

### Task 2: Dismissal persistence store

**Files:**

- Create: `apps/web/src/lib/pwa/install-dismissal.ts`
- Create: `apps/web/src/lib/pwa/__tests__/install-dismissal.test.ts`

**Interfaces:**

- Produces: `getDismissalState(now?: Date): 'active' | 'quiet' | 'retired'` + `dismissOnce(now?: Date): void`.
- Both functions accept an optional `now` parameter so tests can pin the clock; production callers omit it (default `new Date()`).
- Uses `localStorage`. Schema: `{ count: number; firstDismissedAt: string /* ISO */ }`. On first dismiss → count=1, quiet for 30d. Second dismiss → count=2, retired forever.
- Returns `'active'` when the 30d quiet window has elapsed.

- [ ] **Step 1: Write failing tests**

```ts
// apps/web/src/lib/pwa/__tests__/install-dismissal.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { getDismissalState, dismissOnce } from '../install-dismissal'

describe('install-dismissal', () => {
  beforeEach(() => localStorage.clear())

  it('defaults to active with no record', () => {
    expect(getDismissalState()).toBe('active')
  })

  it('goes quiet on first dismiss', () => {
    dismissOnce(new Date('2026-07-18T00:00:00Z'))
    expect(getDismissalState(new Date('2026-07-25T00:00:00Z'))).toBe('quiet')
  })

  it('returns to active after 30 days', () => {
    dismissOnce(new Date('2026-07-18T00:00:00Z'))
    expect(getDismissalState(new Date('2026-08-20T00:00:00Z'))).toBe('active')
  })

  it('retires forever on second dismiss', () => {
    dismissOnce(new Date('2026-07-18T00:00:00Z'))
    dismissOnce(new Date('2026-07-19T00:00:00Z'))
    expect(getDismissalState(new Date('2030-01-01T00:00:00Z'))).toBe('retired')
  })
})
```

Run: `pnpm --filter @concert-crawl/web test -- install-dismissal`
Expected: FAIL — module not found.

- [ ] **Step 2: Implement the store**

```ts
// apps/web/src/lib/pwa/install-dismissal.ts
import { z } from 'zod'

const KEY = 'cc-install-dismissal'
const QUIET_MS = 30 * 24 * 60 * 60 * 1000

const RecordSchema = z.object({
  count: z.number().int().min(0).max(2),
  firstDismissedAt: z.string().datetime(),
})

export type DismissalState = 'active' | 'quiet' | 'retired'

const readRecord = () => {
  if (typeof localStorage === 'undefined') return null
  const raw = localStorage.getItem(KEY)
  if (!raw) return null
  // Wrap JSON.parse in try/catch — localStorage can hold invalid JSON from
  // manual devtools testing, a corrupted write, or an older on-disk format.
  // Throwing here would break the install slot render entirely; instead
  // treat the record as absent and let the UI default to `active`.
  try {
    const parsed = RecordSchema.safeParse(JSON.parse(raw))
    return parsed.success ? parsed.data : null
  } catch (parseErr) {
    console.warn('install-dismissal: dropping unparseable record', parseErr)
    return null
  }
}

export const getDismissalState = (now: Date = new Date()): DismissalState => {
  const record = readRecord()
  if (!record) return 'active'
  if (record.count >= 2) return 'retired'
  const first = new Date(record.firstDismissedAt).getTime()
  return now.getTime() - first < QUIET_MS ? 'quiet' : 'active'
}

export const dismissOnce = (now: Date = new Date()): void => {
  if (typeof localStorage === 'undefined') return
  const existing = readRecord()
  // Clamp count to 2 so we never write a value the schema rejects on next
  // read (safeParse would return null → UI reverts to 'active' instead of
  // staying 'retired'). Once we've hit 2, further dismisses are no-ops on
  // the count and leave firstDismissedAt untouched.
  const next = existing
    ? {
        count: Math.min(existing.count + 1, 2),
        firstDismissedAt: existing.firstDismissedAt,
      }
    : { count: 1, firstDismissedAt: now.toISOString() }
  localStorage.setItem(KEY, JSON.stringify(next))
}
```

Runtime uses Zod `safeParse` on the localStorage read — matches the no-`as` policy for boundary parsing.

- [ ] **Step 3: Verify tests pass**

Run: `pnpm --filter @concert-crawl/web test -- install-dismissal`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/lib/pwa/install-dismissal.ts apps/web/src/lib/pwa/__tests__/install-dismissal.test.ts
git commit -m "feat(web): add install-dismissal persistence store"
```

### Task 3: `InstallSlot` + `IosHowToSheet` + `BottomSheet` primitive

**Files:**

- Create: `apps/web/src/components/pwa/InstallSlot.tsx`
- Create: `apps/web/src/components/pwa/IosHowToSheet.tsx`
- Create: `apps/web/src/components/pwa/BottomSheet.tsx` (reusable — also used by `PostWatchSheet` in PR-C)
- Create: `apps/web/src/components/pwa/__tests__/InstallSlot.test.tsx`
- Create: `apps/web/src/components/pwa/__tests__/IosHowToSheet.test.tsx`
- Modify: `apps/web/src/components/pwa/definitions/copy.ts` (replace with `INSTALL_COPY` lift)
- Delete: `apps/web/src/components/pwa/InstallPrompt.tsx` (replaced)
- Modify: `apps/web/src/app/layout.tsx` (remove `<InstallPrompt />`)
- Modify: whichever consumer layout mounts `AppChrome` — pass `<InstallSlot />` into `rightSlots`.

**Interfaces:**

- `<InstallSlot />` — top-right chrome button. States: `installable` (Android/desktop, tap fires native prompt), `ios` (opens `IosHowToSheet`), `hidden` (dismissed / retired / already-installed).
- `<IosHowToSheet open onClose />` — 3-step Share → Add row → Add walkthrough per `INSTALL_COPY.sheet.steps`.
- `<BottomSheet open onClose title>{children}</BottomSheet>` — `role="dialog"`, `aria-modal`, focus trap, Escape + scrim-tap close.

- [ ] **Step 1: Lift copy verbatim**

Replace `apps/web/src/components/pwa/definitions/copy.ts` with the design's `INSTALL_COPY` (from `pwa-data.jsx` lines 226–248). Preserve exact strings including the Unicode escapes (rendered as smart-quotes / em-dashes).

```ts
export const INSTALL_COPY = {
  slotLabel: 'Install',
  slotAria: 'Install Concert Crawl',
  sheet: {
    eyebrow: 'Add to Home Screen',
    title: 'Put Concert Crawl on your home screen',
    sub: "Safari won't do it for you on iPhone — here's the 10-second version.",
    steps: [
      {
        icon: 'share',
        n: '1',
        label: 'Tap Share',
        detail: "The square-with-an-arrow, down in Safari's toolbar.",
      },
      {
        icon: 'plus',
        n: '2',
        label: 'Scroll to “Add to Home Screen”',
        detail: "It's a few rows down, past the AirDrop stuff.",
      },
      {
        icon: 'home',
        n: '3',
        label: 'Tap Add',
        detail: 'Top-right corner. Now it opens full-screen, no address bar.',
      },
    ],
    done: 'Got it',
  },
  dismissNote:
    "We'll quit asking. You can still add it from Settings whenever.",
} as const
```

Delete the old `PWA_COPY` const (or migrate remaining callers — grep for `PWA_COPY`).

- [ ] **Step 2: Write BottomSheet tests + implement**

Tests cover: opens on `open=true`, closes on Escape, closes on scrim click, traps focus, restores focus on close, sets `role="dialog"` + `aria-modal`.

Implementation uses a simple focus-trap pattern — `useEffect` sets focus to the first focusable child on mount; on unmount, restores to `document.activeElement` before mount. Escape handler on the dialog element. Scrim is a sibling `<div>` with `onClick={onClose}`.

- [ ] **Step 3: Write InstallSlot tests + implement**

Test states:

- No `beforeinstallprompt` fired + not iOS → hidden
- iOS Safari (matches UA via `isIosSafari()`) → shows slot; tap opens sheet
- `beforeinstallprompt` fired → shows slot; tap fires native prompt
- Dismissal state = `retired` → hidden regardless
- Dismissal state = `quiet` → hidden

Reuses `isIosSafari` + `isStandalone` from `apps/web/src/lib/pwa/beforeinstallprompt.ts`.

- [ ] **Step 4: Write IosHowToSheet test + implement**

Test: renders 3 steps with correct labels + details; `Got it` closes; sheet is a `BottomSheet`.

- [ ] **Step 5: Wire InstallSlot into AppChrome**

In the consumer layout that mounts `AppChrome`, pass `<InstallSlot />` into `rightSlots`. Remove the old `<InstallPrompt />` mount in `apps/web/src/app/layout.tsx`.

- [ ] **Step 6: Delete Tier B `InstallPrompt.tsx`**

```bash
git rm apps/web/src/components/pwa/InstallPrompt.tsx
```

- [ ] **Step 7: Verify + commit**

Run: `pnpm --filter @concert-crawl/web typecheck && pnpm --filter @concert-crawl/web lint && pnpm --filter @concert-crawl/web test`
Expected: PASS.

```bash
git add apps/web/src/components/pwa apps/web/src/app/layout.tsx
git commit -m "feat(web): #969 install slot + iOS how-to sheet + bottom sheet primitive"
```

### Task 4: Release notes + open PR-A

- [ ] **Step 1: Add release-notes entry**

Add an entry to `apps/web/src/lib/definitions/releases.ts` (bump version, keep the existing shape):

Use the **actual merge date** for `date` — the snippet below shows a placeholder. Bump the version in step with prior releases; the entry below reserves the slot but implementer picks the exact string at build time (semantic-release may adjust it).

```ts
{
  version: 'v0.9.0-beta', // adjust if a release has shipped between plan and impl
  date: '<merge date, e.g. Jul 21, 2026>',
  headline: 'The install nudge grew up.',
  items: [
    {
      kind: 'changed',
      text: 'Install lives in the top corner now — quiet, always there when you want it, gone when you don't. On iPhone, it walks you through the Share → Add to Home Screen tap-dance in three steps.',
    },
  ],
}
```

- [ ] **Step 2: Sanity-check pre-push**

Run:

```
pnpm turbo run build --filter=@concert-crawl/crawler-core --filter=@concert-crawl/price-pipeline --filter=@concert-crawl/types --filter=@concert-crawl/entitlements
pnpm --filter @concert-crawl/web typecheck
pnpm --filter @concert-crawl/web lint
pnpm --filter @concert-crawl/web test
```

- [ ] **Step 3: Push branch + open PR-A**

Branch: `feat/pwa-969-install-polish`. PR title: `feat(pwa): #969 install slot polish (top-right chrome + iOS how-to sheet)`. PR body must reference #969 (`Closes #969`), the design brief PR #1039, and the design handoff dir. Include the new env vars section (empty — no new env vars for PR-A).

- [ ] **Step 4: Run `./scripts/request-copilot-review.sh <PR-A-number>` and iterate to clean bar**

Per canonical Copilot policy: at least 2 successful rounds (or 1 with clearly diminishing returns), no Critical/High/Medium remaining, fix every valid Low/Nit. Push fixes reset the counter; the round is clean if findings are Low/Nit or doc-sync only.

**→ Merge PR-A** once the bar is met. Immediately start PR-B.

---

## Phase / PR-B — #970 Offline polish

Add the header `OfflinePill`, add the `~offline` fallback page with real cached-shortcuts, remove the Tier B fixed-position `OfflineBanner`.

**Prereq: PR-A merged** — `AppChrome` and its `rightSlots` host must exist.

### Task 5: `OfflinePill` component

**Files:**

- Create: `apps/web/src/components/pwa/OfflinePill.tsx`
- Create: `apps/web/src/components/pwa/__tests__/OfflinePill.test.tsx`
- Modify: `apps/web/src/components/pwa/definitions/copy.ts` (append `OFFLINE_COPY` from design)
- Delete: `apps/web/src/components/pwa/OfflineBanner.tsx` (replaced)
- Modify: `apps/web/src/app/layout.tsx` (remove `<OfflineBanner />`)
- Modify: consumer layout — pass `<OfflinePill />` into `AppChrome`'s `rightSlots` alongside `<InstallSlot />`.

**Interfaces:**

- `<OfflinePill />` — small status pill with `--warning` dot + `OFFLINE_COPY.pillLabel`. `role="status"`, `aria-live="polite"`, `aria-label={OFFLINE_COPY.pillAria}`. Renders `null` when online.

- [ ] **Step 1: Lift OFFLINE_COPY**

Append to `apps/web/src/components/pwa/definitions/copy.ts`:

```ts
export const OFFLINE_COPY = {
  pillLabel: 'Offline · cached OK',
  pillAria: "You're offline. Cached shows are still available.",
  fallback: {
    eyebrow: 'No signal',
    title: "You're offline — here's what you can still see.",
    sub: "The shows you've already looked at are saved on your phone. Live prices and anything new will load when you're back.",
    retry: 'Try again',
    shortcutsLabel: 'Saved on your phone',
    authNote:
      "Your account stuff (watchlist, settings) needs a connection — it'll be back when you are.",
    empty: {
      title: 'Nothing cached yet.',
      sub: "First visit, or a fresh phone? There's nothing saved to show offline yet. Hit retry once you've got signal and we'll start keeping the shows you browse.",
      link: 'Back to cached content',
    },
  },
} as const
```

- [ ] **Step 2: Write failing test**

```tsx
// apps/web/src/components/pwa/__tests__/OfflinePill.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { OfflinePill } from '../OfflinePill'

describe('OfflinePill', () => {
  it('renders nothing when online', () => {
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      configurable: true,
    })
    const { container } = render(<OfflinePill />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders status + label when offline', () => {
    Object.defineProperty(navigator, 'onLine', {
      value: false,
      configurable: true,
    })
    render(<OfflinePill />)
    const status = screen.getByRole('status')
    expect(status).toHaveTextContent(/offline/i)
    expect(status).toHaveAttribute('aria-live', 'polite')
  })
})
```

- [ ] **Step 3: Implement**

Uses existing `useOnlineStatus`. Dot is `aria-hidden` (color-only signal masked; label carries the meaning).

- [ ] **Step 4: Delete Tier B OfflineBanner**

```bash
git rm apps/web/src/components/pwa/OfflineBanner.tsx
```

Remove its mount from `apps/web/src/app/layout.tsx`.

- [ ] **Step 5: Wire OfflinePill into AppChrome**

In the consumer layout, add `<OfflinePill />` to the same `rightSlots` array as `<InstallSlot />`.

- [ ] **Step 6: Verify + commit**

```bash
git add apps/web/src/components/pwa apps/web/src/app/layout.tsx
git commit -m "feat(web): #970 offline pill in top-right chrome"
```

### Task 6: SW cache-reading helpers

**Files:**

- Create: `apps/web/src/lib/pwa/cached-content.ts`
- Create: `apps/web/src/lib/pwa/__tests__/cached-content.test.ts`

**Interfaces:**

- Produces: `getCachedEvents(): Promise<CachedEvent[]>` + `getCachedVenues(): Promise<CachedVenue[]>`.
- Reads from `caches.open('public-api')` (the runtime cache name set in `apps/web/src/app/sw.ts` PR3 Tier B), enumerates entries matching the **collection routes only** (`/v1/events` and `/v1/venues` — NOT their sub-paths like `/v1/events/genres` or `/v1/events/:id`, which have different JSON shapes). Parses body JSON, returns typed rows. Returns `[]` when Cache Storage unavailable (SSR / lower browsers) or the named cache hasn't been created.
- **Design note on scope** — the SW allowlist in `apps/web/src/lib/pwa/route-cache.ts` also caches detail routes (`/v1/events/:id`, `/v1/venues/:slug`), so a user who's browsed to individual events has those cached and reachable offline. This helper deliberately scopes to the collection cache for the shortcuts list because (a) collection JSON already contains the summary shape we render, (b) merging the detail-route items would require a second schema pass and duplicate detection, and (c) the design shows shortcuts as a small ~6-item list, not an exhaustive "everything cached" view. Detail-route pages continue to render from cache when navigated to directly.

- [ ] **Step 1: Write failing tests**

Mock `global.caches` with a fake `CacheStorage` implementation. Assert:

- Returns `[]` when the named cache doesn't exist — implement by checking `await caches.keys()` for the cache name first, since `caches.open(name)` **creates** the cache if it doesn't exist (would break this expectation otherwise).
- Enumerates events + venues from cached responses (collection routes only)
- Ignores non-matching cached routes AND sub-paths (`/v1/events/genres`, `/v1/events/abc-123` are not included — only the exact collection URL matches)
- Handles malformed cached responses without throwing — the implementation catches `response.clone().json()` throws (invalid JSON) with a single `console.warn` per bad entry. Individual schema-mismatch rows are silently skipped (no per-row warning) so a stale response with N mismatched rows doesn't flood the log.

- [ ] **Step 2: Implement**

```ts
// apps/web/src/lib/pwa/cached-content.ts
import { z } from 'zod'

const EventSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  venueName: z.string(),
  startTime: z.string(),
  // extend as needed for CachedShortcuts display
})

const VenueSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  upcomingCount: z.number().int(),
})

export type CachedEvent = z.infer<typeof EventSummarySchema>
export type CachedVenue = z.infer<typeof VenueSummarySchema>

const CACHE_NAME = 'public-api'

const readCache = async <T>(
  pathPrefix: string,
  schema: z.ZodType<T>,
  extract: (data: unknown) => unknown,
): Promise<T[]> => {
  if (typeof caches === 'undefined') return []
  // Check the cache exists BEFORE opening — caches.open(name) creates the
  // cache when it's absent, which would make an "empty" cache indistinguishable
  // from "never populated" and cause the offline fallback to lose its honest
  // empty state.
  const cacheNames = await caches.keys()
  if (!cacheNames.includes(CACHE_NAME)) return []
  const cache = await caches.open(CACHE_NAME).catch(() => null)
  if (!cache) return []
  const keys = await cache.keys()
  const results: T[] = []
  for (const request of keys) {
    const url = new URL(request.url)
    // Match the collection URL exactly — sub-paths (`/v1/events/genres`,
    // `/v1/events/:id`) have different JSON shapes and would fail safeParse
    // anyway, but skipping them here keeps the log noise down.
    if (url.pathname !== pathPrefix) continue
    const response = await cache.match(request)
    if (!response) continue
    try {
      const raw = await response.clone().json()
      const rows = extract(raw)
      if (Array.isArray(rows)) {
        for (const row of rows) {
          const parsed = schema.safeParse(row)
          if (parsed.success) results.push(parsed.data)
        }
      }
    } catch (parseErr) {
      // Malformed cached entry — log + skip so one bad row can't blank the
      // whole shortcuts list. Every catch block logs (project convention).
      console.warn('cached-content: skipping malformed entry', {
        url: request.url,
        err: parseErr,
      })
    }
  }
  return results
}

export const getCachedEvents = (): Promise<CachedEvent[]> =>
  readCache('/v1/events', EventSummarySchema, (data) => data)

export const getCachedVenues = (): Promise<CachedVenue[]> =>
  readCache('/v1/venues', VenueSummarySchema, (data) => data)
```

Adjust `extract` per each endpoint's actual JSON shape (list vs. wrapped `{ items: [...] }`). Check current shape by inspecting the API route bodies.

- [ ] **Step 3: Verify tests pass**

Run: `pnpm --filter @concert-crawl/web test -- cached-content`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/lib/pwa/cached-content.ts apps/web/src/lib/pwa/__tests__/cached-content.test.ts
git commit -m "feat(web): add Serwist cache reader helpers"
```

### Task 7: `OfflineFallback` route replaces the Tier B `~offline` page

**Files:**

- Modify: `apps/web/src/app/~offline/page.tsx` (rewrite to render `OfflineFallback`)
- Modify: `apps/web/src/app/~offline/definitions/copy.ts` (replace with pointer to `OFFLINE_COPY`)
- Create: `apps/web/src/components/pwa/OfflineFallback.tsx`
- Create: `apps/web/src/components/pwa/CachedShortcuts.tsx`
- Create: `apps/web/src/components/pwa/__tests__/OfflineFallback.test.tsx`

**Interfaces:**

- `<OfflineFallback />` — client component. Loads cached events + venues on mount, renders `<CachedShortcuts>` populated, or `<CachedShortcuts.Empty>` when both are empty. `Retry` button triggers `router.refresh()` (Next.js). `authNote` line included.
- `<CachedShortcuts events venues />` — populated block. `<CachedShortcuts.Empty />` — honest empty state per `OFFLINE_COPY.fallback.empty`.

- [ ] **Step 1: Write failing tests**

Test rendering paths:

- With cached events + venues → renders shortcuts + `authNote`
- With no cached content → renders empty state + `Back to cached content` link
- Retry button clicks trigger `router.refresh` (mocked)

- [ ] **Step 2: Implement OfflineFallback + CachedShortcuts**

Mobile 320 + 390 + desktop. Uses `OFFLINE_COPY.fallback`. Populated shortcuts list: events first, then venues. Grid on desktop, list on mobile. Cap at 6 items each with a "Show more" link — reference design decision from READINESS section "Prototype polish deferred to plan PR" item 2.

- [ ] **Step 3: Rewrite ~offline page.tsx to use OfflineFallback**

```tsx
// apps/web/src/app/~offline/page.tsx
import { OfflineFallback } from '@/components/pwa/OfflineFallback'

export default function OfflinePage() {
  return <OfflineFallback />
}
```

- [ ] **Step 4: Verify + commit**

```bash
git add apps/web/src/app/~offline apps/web/src/components/pwa/OfflineFallback.tsx apps/web/src/components/pwa/CachedShortcuts.tsx apps/web/src/components/pwa/__tests__/OfflineFallback.test.tsx
git commit -m "feat(web): #970 offline fallback with cached shortcuts + honest empty"
```

### Task 8: Release notes + open PR-B

- [ ] **Step 1: Add release-notes entry**

Use the **actual PR-B merge date** for `date` (placeholder below).

```ts
{
  version: 'v0.9.1-beta', // adjust to whatever version follows PR-A on merge
  date: '<PR-B merge date>',
  headline: "Offline mode looks like it means it now.",
  items: [
    { kind: 'changed',
      text: "The offline signal is a tiny pill in the header, not a bar across the page. Lose signal deep in the app and you land on a real page — with everything you already loaded still browsable, and honest about what needs a connection." },
  ],
}
```

- [ ] **Step 2: Sanity-check pre-push (as in PR-A Task 4)**

- [ ] **Step 3: Push branch + open PR-B**

Branch: `feat/pwa-970-offline-polish`. PR title: `feat(pwa): #970 offline pill + real fallback page with cached shortcuts`. `Closes #970`. Reference PR-A + design brief.

- [ ] **Step 4: Copilot review loop to clean bar, merge.**

---

## Phase / PR-C — #971 Web push (Tier C)

The big one — schema + external delivery + settings + on-page permission flow.

### Task 9: Schema — `push_subscriptions` + `user_notification_preferences`

**Files:**

- Create: `packages/db/src/schema/push.ts`
- Modify: `packages/db/src/schema/index.ts` (re-export)
- Create migration: `packages/db/migrations/0054_push_subscriptions_prefs.sql`
- Create: `packages/db/src/schema.test.ts` additions (or a new `push.test.ts`)

**Interfaces:**

- `pushSubscriptions` — `id uuid pk`, `userId text notnull`, `endpoint text notnull unique`, `p256dhKey text notnull`, `authKey text notnull`, `userAgent text`, `createdAt timestamptz notnull default now()`, `lastActiveAt timestamptz notnull default now()`.
- `userNotificationPreferences` — `userId text primary key` (one row per user), `masterEnabled boolean notnull default false`, `watchUpdatesEnabled boolean notnull default true`, `priceDropsEnabled boolean notnull default true`, `updatedAt timestamptz notnull default now()`.

- [ ] **Step 1: Write the schema file**

```ts
// packages/db/src/schema/push.ts
import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

export const pushSubscriptions = pgTable(
  'push_subscriptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull(),
    endpoint: text('endpoint').notNull(),
    p256dhKey: text('p256dh_key').notNull(),
    authKey: text('auth_key').notNull(),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastActiveAt: timestamp('last_active_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    endpointUnique: uniqueIndex('push_subscriptions_endpoint_unique').on(
      table.endpoint,
    ),
    userIdx: index('push_subscriptions_user_id_idx').on(table.userId),
  }),
)

export const userNotificationPreferences = pgTable(
  'user_notification_preferences',
  {
    userId: text('user_id').primaryKey(),
    masterEnabled: boolean('master_enabled').notNull().default(false),
    watchUpdatesEnabled: boolean('watch_updates_enabled')
      .notNull()
      .default(true),
    priceDropsEnabled: boolean('price_drops_enabled').notNull().default(true),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
)
```

- [ ] **Step 2: Write the migration**

`packages/db/migrations/0054_push_subscriptions_prefs.sql` — hand-write per project convention. Include CREATE TABLE + indexes. The `when` timestamp in `packages/db/migrations/meta/_journal.json` must exceed every prior entry — Drizzle applies migrations in `when` order, and reusing an earlier timestamp silently reorders the apply sequence. Use `pnpm db:generate` to have Drizzle produce the meta entry, then verify the timestamp exceeds `0053`'s.

- [ ] **Step 3: Migrate + run schema tests**

Run migrations against test DB, verify tables exist with correct columns. Add coverage in `schema.test.ts` (or new `push.test.ts`) exercising `db.insert` + `db.select` round-trips.

- [ ] **Step 4: Commit**

```bash
git add packages/db
git commit -m "feat(db): push_subscriptions + user_notification_preferences tables (#971)"
```

### Task 10: Category constraint via Zod (no DB enum change)

**Files:**

- Create: `packages/db/src/schema/notification-categories.ts`
- Modify: any writer that inserts a `user_notification` row (contest-notifications helper + the new push writer in Task 13).

**Interfaces:**

- Produces: `UserNotificationCategory` Zod union + TS type covering `contest.resolved | contest.needs_info | watch.cancelled | watch.postponed | watch.soldout | watch.backonsale | watch.pricedrop`.

- [ ] **Step 1: Write the union**

```ts
// packages/db/src/schema/notification-categories.ts
import { z } from 'zod'

export const UserNotificationCategorySchema = z.enum([
  'contest.resolved',
  'contest.needs_info',
  'watch.cancelled',
  'watch.postponed',
  'watch.soldout',
  'watch.backonsale',
  'watch.pricedrop',
])
export type UserNotificationCategory = z.infer<
  typeof UserNotificationCategorySchema
>

export const PUSH_ELIGIBLE_CATEGORIES = new Set<UserNotificationCategory>([
  'watch.cancelled',
  'watch.postponed',
  'watch.soldout',
  'watch.backonsale',
  'watch.pricedrop',
])

export const PRICE_DROP_CATEGORY: UserNotificationCategory = 'watch.pricedrop'
```

- [ ] **Step 2: Migrate contest-notifications writer**

`apps/api/src/lib/contest-notifications.ts` — swap the string literal categories for the typed values. Tests pin the exact keys, so this is a compile-time refactor with no behavioral change.

- [ ] **Step 3: Commit**

```bash
git add packages/db/src/schema/notification-categories.ts apps/api/src/lib/contest-notifications.ts
git commit -m "feat(db): type-constrain user notification categories (Zod union)"
```

### Task 11: VAPID key generation + environment plumbing

**Files:**

- Create: `scripts/generate-vapid-keys.ts` (dev helper)
- Modify: `apps/api/.env.example` (add `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_CONTACT_EMAIL`)
- Modify: `apps/web/.env.example` (add `NEXT_PUBLIC_VAPID_PUBLIC_KEY`)
- Modify: `apps/api/src/env.ts` (Zod-validate the new vars)
- Modify: `apps/web/src/env.ts` (or wherever public envs are validated — Zod)

**Interfaces:**

- Staging + prod each get an independently generated VAPID keypair (Hugh's Q5 lock: separate). Public key is exposed to the web app as `NEXT_PUBLIC_VAPID_PUBLIC_KEY`; private key stays server-side in the API service.
- `VAPID_CONTACT_EMAIL` is `mailto:` string used in the `Subject:` header per RFC 8292.

- [ ] **Step 1: Write generator script**

```ts
// scripts/generate-vapid-keys.ts
import webpush from 'web-push'

const keys = webpush.generateVAPIDKeys()
console.log('VAPID_PUBLIC_KEY=' + keys.publicKey)
console.log('VAPID_PRIVATE_KEY=' + keys.privateKey)
```

- [ ] **Step 2: Add env schema entries**

Extend the API + web Zod env schemas with the new vars. The web schema uses `NEXT_PUBLIC_VAPID_PUBLIC_KEY` only.

- [ ] **Step 3: Update `.env.example` files** — placeholders only, never real values.

- [ ] **Step 4: Commit**

```bash
git add scripts/generate-vapid-keys.ts apps/api/.env.example apps/web/.env.example apps/api/src/env.ts apps/web/src/env.ts
git commit -m "feat(push): VAPID keypair env plumbing + generator"
```

### Task 12: API — subscribe / unsubscribe / preferences endpoints

**Files:**

- Create: `apps/api/src/routes/me/push.ts`
- Create: `apps/api/src/routes/me/push.integration.test.ts`
- Modify: `apps/api/src/routes/me/index.ts` (mount `/push`)

**Interfaces:**

- `POST /v1/me/push/subscriptions` — body `{ endpoint, keys: { p256dh, auth }, userAgent? }` — upserts on `endpoint`. Returns `{ id }` (the row's UUID). Auth required.
- `DELETE /v1/me/push/subscriptions/:id` — deletes by row UUID (returned from POST above). Auth required + ownership check. Chosen over `DELETE …/:endpoint` because push endpoint URLs contain `/`, `?`, and can be several hundred characters — encoding them as a path segment is brittle. Chosen over a DELETE-with-body payload because DELETE-with-body isn't idiomatic REST and some intermediaries strip request bodies from DELETEs.
- `GET /v1/me/notification-preferences` — **side-effect-free.** Returns `{ masterEnabled, watchUpdatesEnabled, priceDropsEnabled }`. When no row exists, returns the defaults **without inserting a row**. First write happens on `PATCH` (upsert).
- `PATCH /v1/me/notification-preferences` — body: partial of the three flags. Upserts.

All Zod-validated. Categories are enforced with `UserNotificationCategorySchema` where the API returns notification-shaped payloads elsewhere.

- [ ] **Step 1: Write integration tests first**

Tests cover:

- Anonymous requests get 401
- Subscribe upserts (second call with same endpoint doesn't duplicate)
- Unsubscribe removes the row
- Preferences GET returns defaults for a new user **without inserting a row** (side-effect-free)
- Preferences PATCH persists (upsert — creates the row on first write)

- [ ] **Step 2: Implement handlers**

Hono routes with Clerk `getAuthUser` guard. Category/preference writes never throw uncaught — best-effort logging matches the contest-notifications pattern.

- [ ] **Step 3: Verify + commit**

```bash
git add apps/api/src/routes/me/push.ts apps/api/src/routes/me/push.integration.test.ts apps/api/src/routes/me/index.ts
git commit -m "feat(api): push subscribe / unsubscribe / prefs endpoints (#971)"
```

### Task 13: Push send pipeline

**Files:**

- Create: `apps/api/src/lib/push/send-push.ts`
- Create: `apps/api/src/lib/push/send-push.test.ts`

**Interfaces:**

- `sendPushForNotification(notification: { userId, category, title, body, actionUrl? })` — reads the user's `user_notification_preferences`, checks whether the notification's category is push-eligible AND the matching per-category toggle is on, then iterates the user's `push_subscriptions` and fires `webpush.sendNotification` per row. Removes subscriptions returning 410 (Gone) or 404 (subscription revoked).

- [ ] **Step 1: Write tests**

Mock `web-push`. Cases:

- Master off → no push fired even for push-eligible category
- Watch updates off + category `watch.cancelled` → no push (row still written for bell)
- Price drops off + category `watch.pricedrop` → no push
- 410 response → subscription row deleted
- Non-push-eligible category (`contest.resolved`) → returns without firing

- [ ] **Step 2: Implement**

Import `web-push`, initialize with VAPID env vars once (module top-level). Fan out per subscription; log delivery failures with `apiLogger.warn`.

- [ ] **Step 3: Wire into notification writers**

Any place that INSERTs a `user_notification` row for a push-eligible category (initially: the new watch-update writers in Task 15) calls `sendPushForNotification` post-commit. `contest-notifications.ts` does NOT — contest categories stay bell-only per brief Q5.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/lib/push
git commit -m "feat(api): send-push pipeline gated by user prefs + category"
```

### Task 14: Service worker — push + notificationclick handlers

**Files:**

- Modify: `apps/web/src/app/sw.ts` (add `push` and `notificationclick` handlers)

- [ ] **Step 1: Extend `sw.ts`**

Reference existing worker; add:

```ts
import { z } from 'zod'

// Push payloads cross a trust boundary (attacker could POST to a compromised
// endpoint URL). Validate shape with Zod and constrain actionUrl to a
// same-origin path — never trust it as a full URL that could open externally.
const PushPayloadSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(500),
  // Relative path only (leading /, no scheme or double-slash).
  actionUrl: z
    .string()
    .regex(/^\/(?!\/)/, 'actionUrl must be a same-origin path starting with /')
    .max(500)
    .optional(),
  tag: z.string().max(100).optional(),
})

const safeSameOriginPath = (raw: unknown): string => {
  if (typeof raw !== 'string') return '/'
  // Strip any scheme + host by resolving against self.location.origin and
  // taking only the path + search. Anything malformed lands on '/'.
  try {
    const parsed = new URL(raw, self.location.origin)
    if (parsed.origin !== self.location.origin) return '/'
    return parsed.pathname + parsed.search
  } catch {
    return '/'
  }
}

self.addEventListener('push', (event) => {
  if (!event.data) return
  // Wrap json() in try/catch — non-JSON payloads throw. safeParse guards shape.
  let payload: z.infer<typeof PushPayloadSchema>
  try {
    const raw = event.data.json()
    const parsed = PushPayloadSchema.safeParse(raw)
    if (!parsed.success) {
      console.warn('sw: dropping push with invalid payload', parsed.error)
      return
    }
    payload = parsed.data
  } catch (parseErr) {
    console.warn('sw: dropping push with unparseable body', parseErr)
    return
  }
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/api/pwa/icon-192',
      badge: '/api/pwa/icon-maskable-192',
      data: { actionUrl: safeSameOriginPath(payload.actionUrl) },
      tag: payload.tag,
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  // Re-normalize on click too — defense in depth in case the stored data was
  // ever tampered with (e.g. via a compromised extension writing to the SW
  // registration).
  const target = safeSameOriginPath(event.notification.data?.actionUrl)
  event.waitUntil(
    // includeUncontrolled: true is critical — after a fresh SW install or
    // update, existing tabs aren't controlled yet, so the default matchAll
    // returns [] and we'd wastefully openWindow a duplicate tab. Including
    // uncontrolled clients focuses the tab the user already has open.
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        for (const client of clients) {
          if (new URL(client.url).origin === self.location.origin) {
            return client.focus().then(() => client.navigate(target))
          }
        }
        return self.clients.openWindow(target)
      }),
  )
})
```

`safeSameOriginPath` is the critical security bit: push payloads are untrusted, and `notification.data` persists across events, so a malicious `actionUrl` like `https://evil.example.com/steal` must never reach `client.navigate` or `openWindow`.

- [ ] **Step 2: Manual verify (dev + local production)**

Trigger a fake push from Chrome DevTools → Application → Service Workers → Push field; confirm the toast appears and clicking it opens the app.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/sw.ts
git commit -m "feat(web): SW push + notificationclick handlers"
```

### Task 15: Watch-update writers → push send

**Files:**

- Modify: whichever module writes watch-affecting events (cancelled / postponed / soldout / backonsale / pricedrop). Grep for existing crawler-side notification points to find the right hook.

**Interfaces:**

- Each watch-affecting event writes a `user_notification` row per watching user with the appropriate `watch.*` category, then calls `sendPushForNotification`.

- [ ] **Step 1: Locate the write sites**

Grep for the four watch-status transitions:

- Cancelled: event soft-delete / status change to cancelled
- Postponed: date change on a watched event
- Sold-out: status transition
- Back-on-sale: transition from sold-out
- Price drop: existing `price_alerts` mechanism — surface where alerts fire today

Each site should already be under an admin or crawler code path.

- [ ] **Step 2: Add write + push**

For each transition, iterate the users watching the affected event, insert a `user_notification` row using the typed `UserNotificationCategory`, then call `sendPushForNotification`.

- [ ] **Step 3: Integration tests**

New tests per writer verifying: row inserted with correct category, `sendPush` called once per watcher, existing behavior unchanged for events with no watchers.

- [ ] **Step 4: Commit**

```bash
git add apps/api packages/crawler-core
git commit -m "feat(push): fire watch-update + price-drop pushes on state transitions"
```

### Task 16: Client — subscribe flow + `PostWatchSheet`

**Files:**

- Create: `apps/web/src/lib/pwa/push-client.ts` (subscribe / unsubscribe helpers, permission checks)
- Create: `apps/web/src/lib/pwa/__tests__/push-client.test.ts`
- Create: `apps/web/src/components/pwa/PostWatchSheet.tsx`
- Create: `apps/web/src/components/pwa/__tests__/PostWatchSheet.test.tsx`
- Modify: `apps/web/src/components/consumer/watch-show-button/` — the Watch tap fires `PostWatchSheet` on first successful watch when master preference is unset AND no dismiss recorded.

**Interfaces:**

- `subscribeToPush(): Promise<PushSubscription>` — requests permission if not already granted; converts VAPID public key; calls `pushManager.subscribe`; POSTs the result to `/v1/me/push/subscriptions`.
- `unsubscribeFromPush(): Promise<void>` — reverse.
- `<PostWatchSheet variant="default" | "ios" open onClose />` — bottom sheet. Default fires the browser permission dialog on "Turn on notifications". iOS variant opens `IosHowToSheet`.
- `hasDismissedPostWatchAsk(): boolean` + `markPostWatchAskDismissed(): void` — a **separate, simpler** store from the install dismissal (they follow different UX rules: install is 30-day quiet → retire; post-watch is one-shot never-re-ask). Keyed at `cc-push-postwatch-dismissed` in `localStorage` as a boolean flag. Manual re-enable path is Settings → Notifications. **Do not reuse `getDismissalState` / `dismissOnce` from install-dismissal** — the signatures and semantics differ.

- [ ] **Step 1: Push-client tests + implementation**

- [ ] **Step 2: PostWatchSheet tests + implementation**

Test both variants. Delay controlled by prop (default 500ms per design lock).

- [ ] **Step 3: Wire into watch-show-button**

On first successful watch commit, if `hasDismissedPostWatchAsk() === false` AND `masterEnabled` is unknown/false, fire the sheet after 500ms. Both "Not now" and scrim/Escape close call `markPostWatchAskDismissed()`. iOS + not-installed → `variant="ios"`.

Never blocks the Watch commit — the sheet is a second beat.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/lib/pwa/push-client.ts apps/web/src/components/pwa/PostWatchSheet.tsx apps/web/src/components/consumer/watch-show-button
git commit -m "feat(web): post-watch push permission sheet (#971)"
```

### Task 17: `NotificationsSection` in `SettingsRoute` + `SettingsRouteDesktop`

**Files:**

- Create: `apps/web/src/components/settings/NotificationsSection.tsx`
- Create: `apps/web/src/components/settings/__tests__/NotificationsSection.test.tsx`
- Modify: `apps/web/src/components/settings/SettingsRoute.tsx` (mount inline after Appearance)
- Modify: `apps/web/src/components/settings/SettingsRouteDesktop.tsx` (sidebar entry + panel)
- Modify: `apps/web/src/components/settings/definitions/constants.ts` if the section labels live there

**Interfaces:**

- `<NotificationsSection />` — reads `/v1/me/notification-preferences`, renders master `Switch`, and — when master is on — the two sub-toggles (Watch updates + Price drops). Empty state (never asked): `PUSH_COPY.settings.empty`. Denied state (browser permission denied): `PUSH_COPY.settings.denied` + Blocked badge + link.
- Master toggle-on → triggers `subscribeToPush()`. Toggle-off → `unsubscribeFromPush()` for this device only. Sub-toggle changes PATCH the preferences endpoint.
- iOS-installed hint shown per `PUSH_COPY.settings.iosHint`.

- [ ] **Step 1: Append PUSH_COPY to copy.ts**

Append `PUSH_COPY` to `apps/web/src/components/pwa/definitions/copy.ts` OR create a new `apps/web/src/components/settings/definitions/push-copy.ts` — pick based on where the strings are consumed (bulk are in the pwa surface, but the settings section is settings-side). Suggest the pwa `copy.ts` since `PostWatchSheet` also reads from it.

Lift the full `PUSH_COPY` from `pwa-data.jsx` lines 272–335, including all 5 notification card shapes.

- [ ] **Step 2: Tests + implementation**

Tests for on / empty / denied / iOS-installed states. Mock the `/v1/me/notification-preferences` API. Mock `Notification.permission`.

- [ ] **Step 3: Wire into SettingsRoute + SettingsRouteDesktop**

Mobile: insert `<NotificationsSection />` after the Appearance block. Desktop: add sidebar entry + panel per existing sidebar shape.

- [ ] **Step 4: Verify + commit**

```bash
git add apps/web/src/components/settings apps/web/src/components/pwa/definitions/copy.ts
git commit -m "feat(web): #971 Settings → Notifications section (master + sub-toggles)"
```

### Task 18: E2E — install slot, offline pill, post-watch sheet, settings toggles

**Files:**

- Modify: `apps/e2e/src/e2e/pwa.spec.ts` (extend the existing Tier B spec)

- [ ] **Step 1: Add specs**

- `installSlot` — visible when installable; hidden after dismiss; visible again after 30 days (mock `localStorage` state).
- `offlinePill` — visible on `context.setOffline(true)`; hidden on reconnect.
- `postWatchSheet` — fires after Watch tap on first watch; not shown on repeat watch.
- `settingsNotifications` — toggling master fires the mocked permission API.

Use existing pattern (mock the API where needed via `apps/e2e/src/mocks/`).

- [ ] **Step 2: Run e2e locally against `pnpm --filter @concert-crawl/web build && pnpm --filter @concert-crawl/web start`**

- [ ] **Step 3: Commit**

```bash
git add apps/e2e/src/e2e/pwa.spec.ts
git commit -m "test(e2e): PWA cluster surfaces (install slot, offline pill, post-watch, settings)"
```

### Task 19: Release notes + open PR-C

- [ ] **Step 1: Add release-notes entry**

Use the **actual PR-C merge date** for `date` (placeholder below).

```ts
{
  version: 'v0.9.2-beta', // adjust to whatever version follows PR-B on merge
  date: '<PR-C merge date>',
  headline: 'Watching a show? We can ping you if it changes.',
  items: [
    { kind: 'added',
      text: "After you first watch a show, we ask if you want a heads-up — for sell-outs, price drops, cancellations, and reschedules. Only shows you're watching. Turn it off anytime in Settings → Notifications." },
    { kind: 'added',
      text: "Settings → Notifications gives you a master switch and two sub-toggles (Watch updates + Price drops). One tap disables push on this device without losing your preferences." },
  ],
}
```

- [ ] **Step 2: Sanity-check pre-push (as before)** — plus a fresh migration timestamp check.

- [ ] **Step 3: Push branch + open PR-C**

Branch: `feat/pwa-971-push-stack`. PR title: `feat(pwa): #971 web push stack (watch updates + price drops)`. `Closes #971`. Reference #969/#970 merged PRs + design brief.

PR body must include an **Env vars** section listing:

- `VAPID_PUBLIC_KEY` (API + web `NEXT_PUBLIC_VAPID_PUBLIC_KEY`) — purpose: browser subscribe target; creation: `pnpm tsx scripts/generate-vapid-keys.ts` per env
- `VAPID_PRIVATE_KEY` (API only) — purpose: sign push payloads; keep secret
- `VAPID_CONTACT_EMAIL` (API) — `mailto:` per RFC 8292

Follow project convention: never paste real values in chat.

- [ ] **Step 4: Copilot review loop to clean bar, merge.**

---

## Post-merge cleanup

After PR-C merges, prune the cluster's own worktrees:

```bash
pnpm worktree:prune --dry-run design/pwa-cluster-plan feat/pwa-969-install-polish feat/pwa-970-offline-polish feat/pwa-971-push-stack
pnpm worktree:prune design/pwa-cluster-plan feat/pwa-969-install-polish feat/pwa-970-offline-polish feat/pwa-971-push-stack
```

Update `docs/superpowers/progress.md` with three ✅ Complete rows (one per PR — all are user-facing).

Update the memory pickup for PWA (project_pickup_pwa_native.md) to reflect the cluster shipped.

Notify Hugh: phone-install testing hold is released. Test flows recommended:

- Install slot on Android Chrome (native prompt fires)
- iOS Safari install (Share → Add to Home Screen walkthrough opens)
- Offline pill + fallback (DevTools Offline throttling)
- Watch a show while signed in on installed PWA (post-watch sheet fires)
- Settings → Notifications toggles (master + sub-toggles + denied state, if reachable)

---

## Self-Review notes

- **Design coverage:** every surface + state in the 🟢 Green READINESS.md maps to a task above. Missing surfaces → treat as a plan gap and add a task rather than shipping without.
- **Voice bar:** every user-visible string comes from `pwa-data.jsx` `*_COPY` maps — do not rewrite.
- **Web-first invariant:** every sheet is dismissible; browser permission dialogs only ever fire from an explicit tap (`InstallSlot` on Android/desktop, "Turn on notifications" in PostWatchSheet / master toggle). Never from a page-load handler.
- **Type safety:** no `as` casts. Boundaries use Zod `safeParse` (`install-dismissal`, `cached-content`, push payload parse in SW). Non-standard DOM types (`BeforeInstallPromptEvent`) merged via `declare global` — already in place.
- **Category strategy:** `notifications.category` stays free-text (`text` column) — the added values live in the Zod union at the write layer. This preserves the shipped admin categories (`crawl.*`) and contest categories (`contest.*`) without a Postgres enum migration, and gives compile-time safety on new writes.
- **VAPID separation:** staging + prod get independently generated keypairs per Hugh's Q5 lock; a staging subscription can never receive a prod payload (endpoint origin differs) and the send pipeline is scoped to the running service's key.
- **AppChrome extraction:** intentionally lands in PR-A so the offline pill has a right-slot host in PR-B. `AppHeader` is either superseded or wraps `AppBar` — decide by inspecting current callers; don't leave dead code.
- **Sequencing hard-lock:** PR-A must merge before PR-B (shared `rightSlots`), and both should ideally merge before PR-C to avoid rebase pain. PR-C could theoretically start in parallel once PR-A is merged, but the Settings section wants the finalized `AppChrome` shape.
- **What's out of scope (documented v2 issues):**
  - Multi-device management ([#1036](https://github.com/HartiganHM/concert-crawl/issues/1036)) — no per-device UI; users manage by opting out on each device.
  - New-show-from-followed-artist category ([#1037](https://github.com/HartiganHM/concert-crawl/issues/1037)).
  - Send-frequency batching ([#1038](https://github.com/HartiganHM/concert-crawl/issues/1038)).
- **Follow-ups worth watching:** consumer notification bell (#737) can now consume `watch.*` rows without changes when it ships; the shared category union already covers it.
