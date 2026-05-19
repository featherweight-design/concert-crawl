# Submit Price Modal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the submit-price dedicated page to a consistent modal (matching FeedbackModal), extract a shared ModalShell primitive, align error states, and replace the shield emoji with a Lucide icon.

**Architecture:** Extract scrim + bottom sheet + desktop card chrome into `ModalShell`. Refactor `FeedbackModal` to use it with no behavior change. Build `SubmitPriceModal` on top. Both trigger sites (`SubmitPriceCardCta` and `PriceDisplay`) become self-contained `'use client'` components that hold `isOpen` state and render the modal inline.

**Tech Stack:** Next.js 14 App Router, React, TypeScript strict, Vitest + @testing-library/react, lucide-react, Clerk (`useAuth`), CSS custom properties (no Tailwind in modal shell — matches existing FeedbackModal style)

**Worktree:** `.worktrees/feat/submit-price-modal`

---

## File Map

**Create:**
- `apps/web/src/components/consumer/modal-shell/ModalShell.tsx`
- `apps/web/src/components/consumer/modal-shell/index.ts`
- `apps/web/src/components/consumer/modal-shell/ModalShell.test.tsx`
- `apps/web/src/components/consumer/submit-price/SubmitPriceModal.tsx`
- `apps/web/src/components/consumer/submit-price/index.ts`
- `apps/web/src/components/consumer/submit-price/SubmitPriceModal.test.tsx`
- `apps/web/src/components/consumer/feedback/FeedbackModal.test.tsx`

**Modify:**
- `apps/web/src/components/consumer/feedback/FeedbackModal.tsx`
- `apps/web/src/components/consumer/SubmitPriceCardCta.tsx`
- `apps/web/src/components/consumer/PriceDisplay.tsx`
- `apps/web/src/app/(protected)/events/[id]/page.tsx`

**Delete:**
- `apps/web/src/app/(protected)/events/[id]/submit-price/page.tsx`
- `apps/web/src/components/consumer/SubmitForm.tsx`
- `apps/web/src/components/consumer/PriceSubmissionForm.tsx`

---

## Task 1: ModalShell primitive

**Files:**
- Create: `apps/web/src/components/consumer/modal-shell/ModalShell.tsx`
- Create: `apps/web/src/components/consumer/modal-shell/index.ts`
- Create: `apps/web/src/components/consumer/modal-shell/ModalShell.test.tsx`

- [ ] **Step 1.1: Write the failing tests**

Create `apps/web/src/components/consumer/modal-shell/ModalShell.test.tsx`:

```tsx
// @vitest-environment jsdom

import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ModalShell } from './ModalShell'

beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
})

const Header = () => <div>Modal Header</div>

describe('ModalShell', () => {
  it('renders nothing when closed', () => {
    render(
      <ModalShell open={false} onClose={vi.fn()} ariaLabel="Test" header={<Header />}>
        <div>Content</div>
      </ModalShell>,
    )
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('renders dialog with header and children when open', () => {
    render(
      <ModalShell open={true} onClose={vi.fn()} ariaLabel="Test" header={<Header />}>
        <div>Content</div>
      </ModalShell>,
    )
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(screen.getByText('Content')).toBeTruthy()
    expect(screen.getByText('Modal Header')).toBeTruthy()
  })

  it('calls onClose when Escape key is pressed', () => {
    const onClose = vi.fn()
    render(
      <ModalShell open={true} onClose={onClose} ariaLabel="Test" header={<Header />}>
        <div>Content</div>
      </ModalShell>,
    )
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when scrim is clicked', () => {
    const onClose = vi.fn()
    render(
      <ModalShell open={true} onClose={onClose} ariaLabel="Test" header={<Header />}>
        <div>Content</div>
      </ModalShell>,
    )
    fireEvent.click(screen.getByTestId('modal-scrim'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('renders footer when provided', () => {
    render(
      <ModalShell
        open={true}
        onClose={vi.fn()}
        ariaLabel="Test"
        header={<Header />}
        footer={<button>Submit</button>}
      >
        <div>Content</div>
      </ModalShell>,
    )
    expect(screen.getByRole('button', { name: 'Submit' })).toBeTruthy()
  })

  it('renders no footer section when footer prop is omitted', () => {
    render(
      <ModalShell open={true} onClose={vi.fn()} ariaLabel="Test" header={<Header />}>
        <div>Content</div>
      </ModalShell>,
    )
    expect(screen.queryByRole('button')).toBeNull()
  })
})
```

- [ ] **Step 1.2: Run tests to confirm they fail**

```bash
cd .worktrees/feat/submit-price-modal && pnpm --filter web test --run src/components/consumer/modal-shell/ModalShell.test.tsx
```

Expected: FAIL — `Cannot find module './ModalShell'`

- [ ] **Step 1.3: Implement ModalShell**

Create `apps/web/src/components/consumer/modal-shell/ModalShell.tsx`:

```tsx
'use client'

import { useState, useEffect, useCallback } from 'react'

interface ModalShellProps {
  open: boolean
  onClose: () => void
  ariaLabel: string
  header: React.ReactNode
  footer?: React.ReactNode
  children: React.ReactNode
  sheetHeight?: 'tall' | 'short'
}

export function ModalShell({
  open,
  onClose,
  ariaLabel,
  header,
  footer,
  children,
  sheetHeight = 'tall',
}: ModalShellProps) {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 639px)')
    setIsMobile(mql.matches)
    const handler = (ev: MediaQueryListEvent) => setIsMobile(ev.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])

  const handleKeyDown = useCallback(
    (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') onClose()
    },
    [onClose],
  )

  useEffect(() => {
    if (!open) return
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, handleKeyDown])

  if (!open) return null

  const heightValue = sheetHeight === 'tall' ? '85%' : '62%'

  return (
    <>
      <div
        data-testid="modal-scrim"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 90,
          background: 'var(--scrim)',
          backdropFilter: 'blur(4px)',
        }}
        onClick={onClose}
      />

      {isMobile ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={ariaLabel}
          style={{
            position: 'fixed',
            left: 0,
            right: 0,
            bottom: 0,
            height: heightValue,
            zIndex: 100,
            background: 'var(--bg-elevated)',
            borderTopLeftRadius: 22,
            borderTopRightRadius: 22,
            boxShadow: '0 -16px 48px rgba(0,0,0,0.45)',
            border: '1px solid var(--border)',
            borderBottom: 'none',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              flexShrink: 0,
              height: 18,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                width: 36,
                height: 4,
                borderRadius: 2,
                background: 'var(--border-strong)',
              }}
            />
          </div>
          <div style={{ flexShrink: 0, padding: '0 18px 12px' }}>{header}</div>
          <div
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: 'auto',
              padding: '6px 18px 18px',
            }}
          >
            {children}
          </div>
          {footer && (
            <div
              style={{
                flexShrink: 0,
                padding: '12px 18px 22px',
                borderTop: '1px solid var(--border)',
                background: 'var(--bg-elevated)',
              }}
            >
              {footer}
            </div>
          )}
        </div>
      ) : (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={ariaLabel}
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 100,
            width: 520,
            maxWidth: 'calc(100% - 64px)',
            maxHeight: 'calc(100% - 80px)',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-strong)',
            borderRadius: 16,
            boxShadow: '0 32px 80px rgba(0,0,0,0.5)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              flexShrink: 0,
              padding: '18px 22px 12px',
              borderBottom: '1px solid var(--border)',
            }}
          >
            {header}
          </div>
          <div
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: 'auto',
              padding: '18px 22px',
            }}
          >
            {children}
          </div>
          {footer && (
            <div
              style={{
                flexShrink: 0,
                padding: '14px 22px 18px',
                borderTop: '1px solid var(--border)',
                background: 'var(--bg-elevated)',
              }}
            >
              {footer}
            </div>
          )}
        </div>
      )}
    </>
  )
}
```

- [ ] **Step 1.4: Create the barrel export**

Create `apps/web/src/components/consumer/modal-shell/index.ts`:

```ts
export { ModalShell } from './ModalShell'
```

- [ ] **Step 1.5: Run tests to confirm they pass**

```bash
pnpm --filter web test --run src/components/consumer/modal-shell/ModalShell.test.tsx
```

Expected: PASS — 6 tests

- [ ] **Step 1.6: Run typecheck**

```bash
pnpm --filter web typecheck
```

Expected: no errors

- [ ] **Step 1.7: Commit**

```bash
git add apps/web/src/components/consumer/modal-shell/
git commit -m "feat(modal-shell): extract shared ModalShell primitive (#448)"
```

---

## Task 2: Refactor FeedbackModal to use ModalShell

**Files:**
- Modify: `apps/web/src/components/consumer/feedback/FeedbackModal.tsx`
- Create: `apps/web/src/components/consumer/feedback/FeedbackModal.test.tsx`

- [ ] **Step 2.1: Write the regression test first**

Create `apps/web/src/components/consumer/feedback/FeedbackModal.test.tsx`:

```tsx
// @vitest-environment jsdom

import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
})

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: vi.fn().mockResolvedValue('tok') }),
  useUser: () => ({ user: null }),
}))
vi.mock('next/navigation', () => ({
  usePathname: () => '/browse',
}))
vi.mock('@/theme/ThemeProvider', () => ({
  useTheme: () => ({ theme: 'electric' }),
}))
vi.mock('@/components/brand/cc-mark', () => ({
  CCMark: () => <div data-testid="cc-mark" />,
}))

import { FeedbackModal } from './FeedbackModal'

describe('FeedbackModal', () => {
  it('renders the dialog with form content when open', () => {
    render(<FeedbackModal open={true} onClose={vi.fn()} />)
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(screen.getByText('Holler at us.')).toBeTruthy()
  })

  it('renders nothing when closed', () => {
    render(<FeedbackModal open={false} onClose={vi.fn()} />)
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
```

- [ ] **Step 2.2: Run test to confirm it passes against the current FeedbackModal**

```bash
pnpm --filter web test --run src/components/consumer/feedback/FeedbackModal.test.tsx
```

Expected: PASS — 2 tests (baseline before refactor)

- [ ] **Step 2.3: Refactor FeedbackModal to use ModalShell**

Replace the contents of `apps/web/src/components/consumer/feedback/FeedbackModal.tsx`. The key structural change: remove `isMobile` state, remove `MobileSheet` and `DesktopCard` local components, remove the scrim div, and wrap everything in `<ModalShell>`. All sub-components (`FormFields`, `SuccessState`, `ErrorState`, `Eyebrow`, `HelpText`, `ContextDisclosure`, `SubmitButton`, `SecondaryButton`, `Spinner`, `CloseIcon`, `StatusRail`) remain unchanged — only the top-level component and shell logic changes.

The refactored `FeedbackModal` function and `HeaderRail` become:

```tsx
'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { useAuth, useUser } from '@clerk/nextjs'
import { useTheme } from '@/theme/ThemeProvider'
import { CCMark } from '@/components/brand/cc-mark'
import { ModalShell } from '@/components/consumer/modal-shell'

// ... (keep all existing type definitions: FeedbackCategory, ModalState, CATEGORIES, API_URL, APP_VERSION)
// ... (keep all existing interfaces: FeedbackModalProps, CtxData, ScreenshotValue, FormProps)
// ... (keep all existing sub-components: FormFields, SuccessState, ErrorState, ContextDisclosure,
//      Eyebrow, HelpText, StatusRail, SubmitButton, SecondaryButton, Spinner, CloseIcon unchanged)

export function FeedbackModal({ open, onClose }: FeedbackModalProps) {
  const pathname = usePathname()
  const { theme } = useTheme()
  const { getToken } = useAuth()
  const { user } = useUser()
  const userEmail = user?.emailAddresses[0]?.emailAddress ?? 'anonymous'
  const [state, setState] = useState<ModalState>('form')
  const [category, setCategory] = useState<FeedbackCategory | null>(null)
  const [message, setMessage] = useState('')
  const [catError, setCatError] = useState(false)
  const [msgError, setMsgError] = useState(false)
  const [screenshot, setScreenshot] = useState<{
    name: string
    dataUrl: string
  } | null>(null)

  const handleScreenshotChange = useCallback((file: File | null) => {
    if (!file) {
      setScreenshot(null)
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setScreenshot({ name: file.name, dataUrl: reader.result as string })
    }
    reader.readAsDataURL(file)
  }, [])

  const reset = useCallback(() => {
    setState('form')
    setCategory(null)
    setMessage('')
    setCatError(false)
    setMsgError(false)
    setScreenshot(null)
  }, [])

  const handleClose = useCallback(() => {
    onClose()
    setTimeout(reset, 300)
  }, [onClose, reset])

  const handleSubmit = useCallback(async () => {
    const catInvalid = !category
    const msgInvalid = !message.trim()
    if (catInvalid || msgInvalid) {
      setCatError(catInvalid)
      setMsgError(msgInvalid)
      return
    }
    setState('loading')
    const token = await getToken()
    if (!token) {
      setState('error')
      return
    }
    const device =
      typeof navigator !== 'undefined'
        ? navigator.userAgent.slice(0, 120)
        : 'unknown'
    try {
      const res = await fetch(`${API_URL}/v1/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          category,
          message: message.trim(),
          pageUrl: pathname,
          metadata: {
            theme,
            build: APP_VERSION,
            device,
            screenshot: screenshot?.dataUrl ?? null,
          },
        }),
      })
      if (!res.ok) throw new Error(`${res.status}`)
      setState('success')
    } catch (err) {
      console.error('Feedback submission failed', err)
      setState('error')
    }
  }, [category, getToken, message, pathname, screenshot, theme])

  const handleCategoryChange = useCallback((cat: FeedbackCategory) => {
    setCategory(cat)
    setCatError(false)
  }, [])

  const handleMessageChange = useCallback((msg: string) => {
    setMessage(msg)
    setMsgError(false)
  }, [])

  const showForm = state === 'form' || state === 'loading'
  const ctxData: CtxData = {
    route: pathname,
    theme,
    build: APP_VERSION,
    device:
      typeof navigator !== 'undefined'
        ? navigator.userAgent.slice(0, 120)
        : 'unknown',
    user: userEmail,
  }

  const header = (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <CCMark size={22} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <HeaderRail state={state} />
      </div>
      <button
        type="button"
        aria-label="Close feedback"
        onClick={handleClose}
        style={{
          all: 'unset',
          cursor: 'pointer',
          width: 30,
          height: 30,
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--fg-muted)',
          border: '1px solid var(--border)',
        }}
      >
        <CloseIcon />
      </button>
    </div>
  )

  const footer = showForm ? (
    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
      <SecondaryButton onClick={handleClose} fullWidth={false}>
        Cancel
      </SecondaryButton>
      <div style={{ width: 200 }}>
        <SubmitButton loading={state === 'loading'} onClick={handleSubmit}>
          Send →
        </SubmitButton>
      </div>
    </div>
  ) : undefined

  return (
    <ModalShell
      open={open}
      onClose={handleClose}
      ariaLabel="Feedback"
      sheetHeight={state === 'success' || state === 'error' ? 'short' : 'tall'}
      header={header}
      footer={footer}
    >
      <div
        style={{
          opacity: state === 'loading' ? 0.5 : 1,
          pointerEvents: state === 'loading' ? 'none' : 'auto',
        }}
      >
        {state === 'success' && (
          <SuccessState onClose={handleClose} onReset={reset} />
        )}
        {state === 'error' && (
          <ErrorState onReset={reset} onClose={handleClose} />
        )}
        {showForm && (
          <FormFields
            state={state}
            category={category}
            setCategory={handleCategoryChange}
            message={message}
            setMessage={handleMessageChange}
            catError={catError}
            msgError={msgError}
            ctxData={ctxData}
            screenshot={screenshot}
            onScreenshotChange={handleScreenshotChange}
          />
        )}
      </div>
    </ModalShell>
  )
}
```

Note: The mobile `MobileSheet` component previously rendered the footer as a centered full-width `SubmitButton`. With `ModalShell`, a single `footer` prop is used for both mobile and desktop. On mobile the footer container fills the width naturally; on desktop the `justifyContent: 'flex-end'` div right-aligns the Cancel + Send buttons. Remove the `MobileSheet` and `DesktopCard` local components entirely, and remove the `isMobile` state from `FeedbackModal`.

Also note: the mobile-only full-width "Send →" button is now the same footer element as desktop. This is a minor intentional change — the mobile footer now shows "Cancel | Send →" in a right-aligned row. If you want mobile to remain full-width, keep the `isMobile` state and pass different `footer` values. For now, the consistent approach is acceptable.

- [ ] **Step 2.4: Run regression test to confirm it still passes**

```bash
pnpm --filter web test --run src/components/consumer/feedback/FeedbackModal.test.tsx
```

Expected: PASS — 2 tests

- [ ] **Step 2.5: Run typecheck**

```bash
pnpm --filter web typecheck
```

Expected: no errors

- [ ] **Step 2.6: Commit**

```bash
git add apps/web/src/components/consumer/feedback/FeedbackModal.tsx \
        apps/web/src/components/consumer/feedback/FeedbackModal.test.tsx
git commit -m "refactor(feedback): use ModalShell primitive (#448)"
```

---

## Task 3: SubmitPriceModal — form view + shield icon (#399)

**Files:**
- Create: `apps/web/src/components/consumer/submit-price/SubmitPriceModal.tsx`
- Create: `apps/web/src/components/consumer/submit-price/index.ts`
- Create: `apps/web/src/components/consumer/submit-price/SubmitPriceModal.test.tsx`

- [ ] **Step 3.1: Write the failing test for the form view**

Create `apps/web/src/components/consumer/submit-price/SubmitPriceModal.test.tsx`:

```tsx
// @vitest-environment jsdom

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
  vi.clearAllMocks()
})

const mockGetToken = vi.fn().mockResolvedValue('test-token')
vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: mockGetToken }),
}))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))
vi.mock('@/components/brand/cc-mark', () => ({
  CCMark: () => <div data-testid="cc-mark" />,
}))
vi.mock('lucide-react', () => ({
  ShieldCheck: () => <svg data-testid="shield-check-icon" />,
}))
vi.mock('@/lib/sp-policy', () => ({
  validateSubmission: () => ({ valid: true, errors: {}, warnings: {} }),
}))

// Default: no existing submission
global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: async () => ({ alreadySubmitted: false, userSubmission: null }),
})

import { SubmitPriceModal } from './SubmitPriceModal'

const defaultProps = {
  open: true,
  onClose: vi.fn(),
  eventId: 'evt-1',
  artist: 'Radiohead',
  venueName: 'Red Rocks',
  date: '2099-07-15T19:00:00.000Z',
}

describe('SubmitPriceModal — form view', () => {
  it('renders nothing when closed', () => {
    render(<SubmitPriceModal {...defaultProps} open={false} />)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('shows the form after checking for existing submission', async () => {
    render(<SubmitPriceModal {...defaultProps} />)
    await waitFor(() => expect(screen.getByText('Floor')).toBeTruthy())
    expect(screen.getByText('Radiohead')).toBeTruthy()
    expect(screen.getByText('Red Rocks')).toBeTruthy()
  })

  it('renders the ShieldCheck icon in the anti-abuse banner', async () => {
    render(<SubmitPriceModal {...defaultProps} />)
    await waitFor(() => expect(screen.getByTestId('shield-check-icon')).toBeTruthy())
  })

  it('renders tier chip options', async () => {
    render(<SubmitPriceModal {...defaultProps} />)
    await waitFor(() => expect(screen.getByText('GA')).toBeTruthy())
    expect(screen.getByText('VIP')).toBeTruthy()
  })
})
```

- [ ] **Step 3.2: Run tests to confirm they fail**

```bash
pnpm --filter web test --run src/components/consumer/submit-price/SubmitPriceModal.test.tsx
```

Expected: FAIL — `Cannot find module './SubmitPriceModal'`

- [ ] **Step 3.3: Implement SubmitPriceModal with form view**

Create `apps/web/src/components/consumer/submit-price/SubmitPriceModal.tsx`:

```tsx
'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { ShieldCheck } from 'lucide-react'
import { ModalShell } from '@/components/consumer/modal-shell'
import { CCMark } from '@/components/brand/cc-mark'
import { SPNumberField } from '../SPNumberField'
import { ChipGroup } from '../ChipGroup'
import { validateSubmission, type SubmissionInput } from '@/lib/sp-policy'
import type { Tier, Vendor, HowFound, SubmissionWithMeta } from '@concert-crawl/types'

type ModalState =
  | 'loading-check'
  | 'form'
  | 'submitting'
  | 'success'
  | 'error'
  | 'alreadySubmitted'

interface SubmitPriceModalProps {
  open: boolean
  onClose: () => void
  eventId: string
  artist: string
  venueName: string
  date: string
}

const TIER_OPTIONS = [
  { value: 'GA', label: 'GA' },
  { value: 'Reserved', label: 'Reserved' },
  { value: 'VIP', label: 'VIP' },
  { value: 'Pit', label: 'Pit' },
  { value: 'Lawn', label: 'Lawn' },
]

const VENDOR_OPTIONS = [
  { value: 'AXS', label: 'AXS' },
  { value: 'Ticketmaster', label: 'Ticketmaster' },
  { value: 'SeatGeek', label: 'SeatGeek' },
  { value: 'DICE', label: 'DICE' },
  { value: 'Eventbrite', label: 'Eventbrite' },
  { value: 'VenueBoxOffice', label: 'Venue box office' },
]

const HOW_FOUND_OPTIONS = [
  { value: 'bought_myself', label: 'Bought it myself' },
  { value: 'saw_listing', label: 'Saw the listing' },
  { value: 'at_the_venue', label: 'At the venue' },
]

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? ''

export function SubmitPriceModal({
  open,
  onClose,
  eventId,
  artist,
  venueName,
  date,
}: SubmitPriceModalProps) {
  const router = useRouter()
  const { getToken } = useAuth()

  const [modalState, setModalState] = useState<ModalState>('loading-check')
  const [formState, setFormState] = useState<SubmissionInput>({
    floor: '',
    ceiling: '',
    tier: null,
    vendor: null,
    howFound: null,
  })
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<string, string>>>({})
  const [fieldWarnings, setFieldWarnings] = useState<Partial<Record<string, string>>>({})
  const [existingSubmission, setExistingSubmission] =
    useState<SubmissionWithMeta | null>(null)

  useEffect(() => {
    if (!open) return
    setModalState('loading-check')
    setFieldErrors({})
    setFieldWarnings({})

    const checkExisting = async () => {
      try {
        const token = await getToken()
        if (!token) {
          setModalState('form')
          return
        }
        const res = await fetch(
          `${API_URL}/v1/events/${eventId}/price-submissions`,
          { headers: { Authorization: `Bearer ${token}` } },
        )
        if (res.ok) {
          const data = (await res.json()) as {
            alreadySubmitted: boolean
            userSubmission: SubmissionWithMeta | null
          }
          if (data.alreadySubmitted && data.userSubmission) {
            setExistingSubmission(data.userSubmission)
            setModalState('alreadySubmitted')
            return
          }
        }
      } catch (err) {
        console.error('Failed to check existing submission', err)
      }
      setModalState('form')
    }
    void checkExisting()
  }, [open, eventId, getToken])

  const handleSubmit = useCallback(async () => {
    const validation = validateSubmission(formState)
    setFieldErrors(validation.errors)
    setFieldWarnings(validation.warnings)
    if (!validation.valid) return

    setModalState('submitting')
    try {
      const token = await getToken()
      if (!token) {
        setErrorMsg('You must be signed in to submit a price.')
        setModalState('error')
        return
      }
      const res = await fetch(
        `${API_URL}/v1/events/${eventId}/price-submissions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            priceMin: Number(formState.floor),
            priceMax: formState.ceiling ? Number(formState.ceiling) : undefined,
            tier: formState.tier as Tier,
            vendor: formState.vendor as Vendor,
            howFound: formState.howFound as HowFound,
          }),
        },
      )
      const data = (await res.json()) as { error?: string }
      if (!res.ok) {
        if (res.status === 409) {
          setModalState('alreadySubmitted')
          router.refresh()
          return
        }
        throw new Error(data.error ?? 'Submission failed')
      }
      setModalState('success')
    } catch (err) {
      console.error('Price submission failed', err)
      setModalState('error')
    }
  }, [formState, getToken, eventId, router])

  const handleWithdraw = useCallback(async () => {
    if (!existingSubmission) return
    try {
      const token = await getToken()
      await fetch(`${API_URL}/v1/submissions/${existingSubmission.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token ?? ''}` },
      })
      router.refresh()
      onClose()
    } catch (err) {
      console.error('Withdraw failed', err)
    }
  }, [existingSubmission, getToken, router, onClose])

  const dateStr = new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'America/Denver',
  })

  const showForm = modalState === 'form' || modalState === 'submitting'
  const isShort =
    modalState === 'success' ||
    modalState === 'error' ||
    modalState === 'alreadySubmitted'

  const header = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <CCMark size={22} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <PriceHeaderRail state={modalState} />
      </div>
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        style={{
          all: 'unset',
          cursor: 'pointer',
          width: 30,
          height: 30,
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--fg-muted)',
          border: '1px solid var(--border)',
        }}
      >
        <CloseIcon />
      </button>
    </div>
  )

  const footer = showForm ? (
    <SubmitButton
      loading={modalState === 'submitting'}
      onClick={handleSubmit}
    >
      Submit price
    </SubmitButton>
  ) : undefined

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      ariaLabel="Submit price"
      sheetHeight={isShort ? 'short' : 'tall'}
      header={header}
      footer={footer}
    >
      {modalState === 'loading-check' && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: 120,
            color: 'var(--fg-subtle)',
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            letterSpacing: '0.08em',
          }}
        >
          Checking…
        </div>
      )}

      {modalState === 'success' && (
        <SuccessState
          onClose={onClose}
          onReset={() => {
            setFormState({ floor: '', ceiling: '', tier: null, vendor: null, howFound: null })
            setFieldErrors({})
            setFieldWarnings({})
            setModalState('form')
          }}
        />
      )}

      {modalState === 'error' && (
        <ErrorState
          onReset={() => setModalState('form')}
          onClose={onClose}
        />
      )}

      {modalState === 'alreadySubmitted' && existingSubmission && (
        <AlreadySubmittedState
          submission={existingSubmission}
          onEdit={() => setModalState('form')}
          onWithdraw={handleWithdraw}
        />
      )}

      {showForm && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 18,
            opacity: modalState === 'submitting' ? 0.6 : 1,
            pointerEvents: modalState === 'submitting' ? 'none' : 'auto',
          }}
        >
          {/* Context header */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <p
              style={{
                margin: 0,
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                fontWeight: 700,
                color: 'var(--fg-muted)',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
              }}
            >
              Submit a price
            </p>
            <p
              style={{
                margin: 0,
                fontFamily: 'var(--font-ui)',
                fontSize: 18,
                fontWeight: 700,
                color: 'var(--fg)',
                letterSpacing: '-0.02em',
              }}
            >
              {artist}
            </p>
            <p
              style={{
                margin: 0,
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                color: 'var(--fg-muted)',
              }}
            >
              {venueName} · {dateStr}
            </p>
          </div>

          {/* Anti-abuse banner */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
              borderRadius: 8,
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              padding: '10px 12px',
            }}
          >
            <ShieldCheck
              size={14}
              style={{ flexShrink: 0, color: 'var(--fg-muted)', marginTop: 1 }}
            />
            <p
              style={{
                margin: 0,
                fontFamily: 'var(--font-ui)',
                fontSize: 12,
                color: 'var(--fg-muted)',
                lineHeight: 1.5,
              }}
            >
              Prices are capped at <strong>$2000</strong>. Submissions stay{' '}
              <em>pending</em> until 2 fans confirm.
            </p>
          </div>

          {/* Floor + Ceiling */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <SPNumberField
              label="Floor"
              value={formState.floor}
              onChange={(val) => setFormState((prev) => ({ ...prev, floor: val }))}
              placeholder="35"
              required
              error={fieldErrors['floor']}
              warning={fieldWarnings['floor']}
            />
            <SPNumberField
              label="Ceiling"
              value={formState.ceiling}
              onChange={(val) => setFormState((prev) => ({ ...prev, ceiling: val }))}
              placeholder="75"
              error={fieldErrors['ceiling']}
            />
          </div>

          <ChipGroup
            label="Tier *"
            options={TIER_OPTIONS}
            value={formState.tier}
            onChange={(val) => setFormState((prev) => ({ ...prev, tier: val }))}
            error={fieldErrors['tier']}
          />

          <ChipGroup
            label="Where it's listed *"
            options={VENDOR_OPTIONS}
            value={formState.vendor}
            onChange={(val) => setFormState((prev) => ({ ...prev, vendor: val }))}
            error={fieldErrors['vendor']}
          />

          <ChipGroup
            label="How you found out *"
            options={HOW_FOUND_OPTIONS}
            value={formState.howFound}
            onChange={(val) => setFormState((prev) => ({ ...prev, howFound: val }))}
            error={fieldErrors['howFound']}
          />

          <p
            style={{
              margin: 0,
              fontFamily: 'var(--font-ui)',
              fontSize: 11,
              color: 'var(--fg-subtle)',
              textAlign: 'center',
              lineHeight: 1.5,
            }}
          >
            Anonymous to other fans. Rate-limited at 1 per show per 24h.
          </p>
        </div>
      )}
    </ModalShell>
  )
}

// ── Sub-views ────────────────────────────────────────────────────────────────

function SuccessState({
  onClose,
  onReset,
}: {
  onClose: () => void
  onReset: () => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '8px 0' }}>
      <div
        style={{
          fontSize: 30,
          fontWeight: 900,
          letterSpacing: '-0.035em',
          lineHeight: 1.0,
          color: 'var(--fg)',
        }}
      >
        Got it.
      </div>
      <div
        style={{
          fontSize: 14,
          color: 'var(--fg-muted)',
          lineHeight: 1.55,
          letterSpacing: '-0.005em',
        }}
      >
        Your price is pending — two more fans confirming it moves it out of
        pending.
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
        <PrimaryButton onClick={onClose}>Back to show</PrimaryButton>
        <GhostButton onClick={onReset}>Submit another</GhostButton>
      </div>
    </div>
  )
}

function ErrorState({
  onReset,
  onClose,
}: {
  onReset: () => void
  onClose: () => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '8px 0' }}>
      <StatusRail tone="error" />
      <div
        style={{
          fontSize: 30,
          fontWeight: 900,
          letterSpacing: '-0.035em',
          lineHeight: 1.0,
          color: 'var(--fg)',
        }}
      >
        Didn&apos;t go through.
      </div>
      <div
        style={{
          fontSize: 14,
          color: 'var(--fg-muted)',
          lineHeight: 1.55,
          letterSpacing: '-0.005em',
        }}
      >
        Couldn&apos;t reach the server — your inputs are still here. Try again
        or come back later.
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
        <PrimaryButton onClick={onReset}>Try again</PrimaryButton>
        <GhostButton onClick={onClose}>Close</GhostButton>
      </div>
    </div>
  )
}

function AlreadySubmittedState({
  submission,
  onEdit,
  onWithdraw,
}: {
  submission: SubmissionWithMeta
  onEdit: () => void
  onWithdraw: () => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '8px 0' }}>
      <div
        style={{
          fontSize: 30,
          fontWeight: 900,
          letterSpacing: '-0.035em',
          lineHeight: 1.0,
          color: 'var(--fg)',
        }}
      >
        Already in.
      </div>
      <p
        style={{
          margin: 0,
          fontFamily: 'var(--font-mono)',
          fontSize: 12,
          color: 'var(--fg-muted)',
        }}
      >
        ${submission.priceMin}
        {submission.priceMax ? ` – $${submission.priceMax}` : ''} ·{' '}
        {submission.tier} · {submission.vendor}
      </p>
      <p
        style={{
          margin: 0,
          fontFamily: 'var(--font-ui)',
          fontSize: 12,
          color: 'var(--fg-subtle)',
        }}
      >
        You can submit one price per show every 24h.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
        <PrimaryButton onClick={onEdit}>Edit submission</PrimaryButton>
        <GhostButton onClick={onWithdraw}>Withdraw</GhostButton>
      </div>
    </div>
  )
}

// ── Primitive atoms ───────────────────────────────────────────────────────────

function PriceHeaderRail({ state }: { state: ModalState }) {
  const isError = state === 'error'
  const isSuccess = state === 'success'
  const isDone = state === 'alreadySubmitted'
  const accent = isError
    ? 'var(--warning)'
    : isSuccess
      ? 'var(--signal)'
      : 'var(--accent)'
  const eyebrow = isError
    ? 'Hmm · stalled'
    : isSuccess
      ? 'Got it · submitted'
      : isDone
        ? 'Already submitted'
        : 'Community prices · open'
  const code = isError ? 'ERR' : isSuccess ? 'SENT' : isDone ? 'DONE' : 'OPEN'
  const pulse = state === 'form' || state === 'submitting' || state === 'loading-check'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}>
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: 6,
          background: accent,
          flexShrink: 0,
          boxShadow: pulse ? `0 0 8px ${accent}` : 'none',
          animation: pulse ? 'fbPulse 1.6s ease-in-out infinite' : 'none',
        }}
      />
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          color: accent,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          fontWeight: 700,
          whiteSpace: 'nowrap',
        }}
      >
        {eyebrow}
      </span>
      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          color: 'var(--fg-subtle)',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          fontWeight: 700,
        }}
      >
        {code}
      </span>
    </div>
  )
}

function StatusRail({ tone }: { tone: 'error' }) {
  const accent = 'var(--warning)'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}>
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: 6,
          background: accent,
          flexShrink: 0,
        }}
      />
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          color: accent,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          fontWeight: 700,
          whiteSpace: 'nowrap',
        }}
      >
        Didn&apos;t save · price channel
      </span>
      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          color: 'var(--fg-subtle)',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          fontWeight: 700,
        }}
      >
        ERR · 503
      </span>
    </div>
  )
}

function PrimaryButton({
  children,
  onClick,
  loading = false,
}: {
  children: React.ReactNode
  onClick: () => void
  loading?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      style={{
        all: 'unset',
        cursor: loading ? 'not-allowed' : 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: 48,
        width: '100%',
        boxSizing: 'border-box',
        background: 'var(--signal)',
        color: 'var(--fg-on-accent)',
        borderRadius: 10,
        fontFamily: 'var(--font-ui)',
        fontWeight: 800,
        fontSize: 14.5,
        letterSpacing: '-0.005em',
        boxShadow: loading ? 'none' : '0 12px 32px -16px var(--signal)',
        opacity: loading ? 0.55 : 1,
        transition: 'opacity .12s',
      }}
    >
      {children}
    </button>
  )
}

// Alias so the footer slot can use the same component name as FeedbackModal
const SubmitButton = PrimaryButton

function GhostButton({
  children,
  onClick,
}: {
  children: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        all: 'unset',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        boxSizing: 'border-box',
        height: 44,
        borderRadius: 10,
        color: 'var(--fg-muted)',
        fontFamily: 'var(--font-ui)',
        fontWeight: 700,
        fontSize: 13,
        letterSpacing: '-0.005em',
        textAlign: 'center',
      }}
    >
      {children}
    </button>
  )
}

function CloseIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 12 12" fill="none">
      <path
        d="M2 2l8 8M10 2l-8 8"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  )
}
```

- [ ] **Step 3.4: Create the barrel export**

Create `apps/web/src/components/consumer/submit-price/index.ts`:

```ts
export { SubmitPriceModal } from './SubmitPriceModal'
```

- [ ] **Step 3.5: Run form view tests**

```bash
pnpm --filter web test --run src/components/consumer/submit-price/SubmitPriceModal.test.tsx
```

Expected: PASS — 4 tests

- [ ] **Step 3.6: Run typecheck**

```bash
pnpm --filter web typecheck
```

Expected: no errors

- [ ] **Step 3.7: Commit**

```bash
git add apps/web/src/components/consumer/submit-price/
git commit -m "feat(submit-price): SubmitPriceModal form view + ShieldCheck icon (#399 #403)"
```

---

## Task 4: SubmitPriceModal — state transitions (#398)

**Files:**
- Modify: `apps/web/src/components/consumer/submit-price/SubmitPriceModal.test.tsx`

The implementation code was written in Task 3. This task adds the tests for the remaining state transitions to verify correctness.

- [ ] **Step 4.1: Add state transition tests to SubmitPriceModal.test.tsx**

Append to `apps/web/src/components/consumer/submit-price/SubmitPriceModal.test.tsx`:

```tsx
describe('SubmitPriceModal — success state', () => {
  it('shows success view after successful submission', async () => {
    // First call: check existing (none). Second call: submit (success).
    let callCount = 0
    global.fetch = vi.fn().mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ alreadySubmitted: false, userSubmission: null }),
        })
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({}),
      })
    })

    render(<SubmitPriceModal {...defaultProps} />)
    await waitFor(() => expect(screen.getByText('Floor')).toBeTruthy())

    fireEvent.click(screen.getByText('Submit price'))
    await waitFor(() => expect(screen.getByText('Got it.')).toBeTruthy())
    expect(screen.getByText('Back to show')).toBeTruthy()
    expect(screen.getByText('Submit another')).toBeTruthy()
  })
})

describe('SubmitPriceModal — error state (#398)', () => {
  it('shows full error view (not inline text) when submission fails', async () => {
    let callCount = 0
    global.fetch = vi.fn().mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ alreadySubmitted: false, userSubmission: null }),
        })
      }
      return Promise.resolve({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Server error' }),
      })
    })

    render(<SubmitPriceModal {...defaultProps} />)
    await waitFor(() => expect(screen.getByText('Floor')).toBeTruthy())

    fireEvent.click(screen.getByText('Submit price'))
    await waitFor(() => expect(screen.getByText("Didn't go through.")).toBeTruthy())
    expect(screen.getByText('Try again')).toBeTruthy()
    expect(screen.getByText('Close')).toBeTruthy()
    // Must NOT use the old inline error text pattern
    expect(screen.queryByText('Something went wrong.')).toBeNull()
  })

  it('returns to form with "Try again"', async () => {
    let callCount = 0
    global.fetch = vi.fn().mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ alreadySubmitted: false, userSubmission: null }),
        })
      }
      return Promise.resolve({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Server error' }),
      })
    })

    render(<SubmitPriceModal {...defaultProps} />)
    await waitFor(() => expect(screen.getByText('Floor')).toBeTruthy())
    fireEvent.click(screen.getByText('Submit price'))
    await waitFor(() => expect(screen.getByText("Didn't go through.")).toBeTruthy())
    fireEvent.click(screen.getByText('Try again'))
    await waitFor(() => expect(screen.getByText('Floor')).toBeTruthy())
  })
})

describe('SubmitPriceModal — alreadySubmitted state', () => {
  it('starts in alreadySubmitted when existing submission is found', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        alreadySubmitted: true,
        userSubmission: {
          id: 'sub-1',
          priceMin: 45,
          priceMax: 75,
          tier: 'GA',
          vendor: 'AXS',
        },
      }),
    })

    render(<SubmitPriceModal {...defaultProps} />)
    await waitFor(() => expect(screen.getByText('Already in.')).toBeTruthy())
    expect(screen.getByText(/\$45/)).toBeTruthy()
    expect(screen.getByText('Edit submission')).toBeTruthy()
    expect(screen.getByText('Withdraw')).toBeTruthy()
  })

  it('transitions to alreadySubmitted on 409 from POST', async () => {
    let callCount = 0
    global.fetch = vi.fn().mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ alreadySubmitted: false, userSubmission: null }),
        })
      }
      return Promise.resolve({
        ok: false,
        status: 409,
        json: async () => ({}),
      })
    })

    render(<SubmitPriceModal {...defaultProps} />)
    await waitFor(() => expect(screen.getByText('Floor')).toBeTruthy())
    fireEvent.click(screen.getByText('Submit price'))
    await waitFor(() => expect(screen.getByText('Already in.')).toBeTruthy())
  })
})
```

- [ ] **Step 4.2: Run all SubmitPriceModal tests**

```bash
pnpm --filter web test --run src/components/consumer/submit-price/SubmitPriceModal.test.tsx
```

Expected: PASS — 9 tests total

- [ ] **Step 4.3: Commit**

```bash
git add apps/web/src/components/consumer/submit-price/SubmitPriceModal.test.tsx
git commit -m "test(submit-price): state transition tests for success, error, alreadySubmitted (#398)"
```

---

## Task 5: Wire up SubmitPriceCardCta as modal trigger

**Files:**
- Modify: `apps/web/src/components/consumer/SubmitPriceCardCta.tsx`
- Modify: `apps/web/src/app/(protected)/events/[id]/page.tsx`

- [ ] **Step 5.1: Rewrite SubmitPriceCardCta as a self-contained modal trigger**

Replace the full contents of `apps/web/src/components/consumer/SubmitPriceCardCta.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { SubmitPriceModal } from '@/components/consumer/submit-price'

interface SubmitPriceCardCtaProps {
  eventId: string
  artist: string
  venueName: string
  date: string
}

export function SubmitPriceCardCta({
  eventId,
  artist,
  venueName,
  date,
}: SubmitPriceCardCtaProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        style={{
          all: 'unset',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          padding: '10px 12px',
          borderRadius: 8,
          border: '1px dashed var(--border-strong)',
          color: 'var(--fg-muted)',
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span
            style={{
              fontFamily: 'var(--font-ui)',
              fontWeight: 700,
              fontSize: 12.5,
              color: 'var(--fg)',
              letterSpacing: '-0.005em',
            }}
          >
            Saw a different price?
          </span>
          <span
            style={{
              fontFamily: 'var(--font-ui)',
              fontSize: 11.5,
              color: 'var(--fg-muted)',
              letterSpacing: '-0.005em',
            }}
          >
            Two confirms moves a community price out of pending.
          </span>
        </div>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: 'var(--signal)',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            flexShrink: 0,
          }}
        >
          Submit
          <svg width="9" height="9" viewBox="0 0 10 10" fill="none" aria-hidden>
            <path
              d="M3 2l4 3-4 3"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>

      <SubmitPriceModal
        open={isOpen}
        onClose={() => setIsOpen(false)}
        eventId={eventId}
        artist={artist}
        venueName={venueName}
        date={date}
      />
    </>
  )
}
```

- [ ] **Step 5.2: Update the event detail page to pass new props**

In `apps/web/src/app/(protected)/events/[id]/page.tsx`, find the `SubmitPriceCardCta` usage (around line 203) and update it:

```tsx
// Before:
<SubmitPriceCardCta eventId={event.id} />

// After:
<SubmitPriceCardCta
  eventId={event.id}
  artist={event.artist}
  venueName={event.venue.name}
  date={event.date}
/>
```

- [ ] **Step 5.3: Run typecheck**

```bash
pnpm --filter web typecheck
```

Expected: no errors

- [ ] **Step 5.4: Commit**

```bash
git add apps/web/src/components/consumer/SubmitPriceCardCta.tsx \
        "apps/web/src/app/(protected)/events/[id]/page.tsx"
git commit -m "feat(submit-price): convert SubmitPriceCardCta to modal trigger (#403)"
```

---

## Task 6: Convert PriceDisplay submit link to modal trigger

**Files:**
- Modify: `apps/web/src/components/consumer/PriceDisplay.tsx`

- [ ] **Step 6.1: Add artist and date props to PriceDisplayProps, convert Link to button**

In `apps/web/src/components/consumer/PriceDisplay.tsx`, make three changes:

**1.** Add `artist` and `date` to the `PriceDisplayProps` interface (around line 50):

```tsx
// Before:
interface PriceDisplayProps {
  priceMin: string | null
  priceMax: string | null
  priceSource: PriceSource | null
  venueName: string
  ticketUrl: string | null
  eventId: string
  observedAt?: string | null
  range14d?: number[] | null
  priceStatus?: 'live' | 'soldout' | null
  ticketPriceOpenedAt?: number | null
  ticketFees?: number | null
}

// After:
interface PriceDisplayProps {
  priceMin: string | null
  priceMax: string | null
  priceSource: PriceSource | null
  venueName: string
  ticketUrl: string | null
  eventId: string
  artist: string
  date: string
  observedAt?: string | null
  range14d?: number[] | null
  priceStatus?: 'live' | 'soldout' | null
  ticketPriceOpenedAt?: number | null
  ticketFees?: number | null
}
```

**2.** Add `artist` and `date` to the destructured props in the component function signature. Locate the function that destructures `PriceDisplayProps` and add `artist` and `date` to the destructuring.

**3.** Add `isSubmitOpen` state and replace the `<Link href={...}>` CTA (around line 911) with a button that opens `SubmitPriceModal`:

Add at the top of the component function body (near other `useState` calls):
```tsx
const [isSubmitOpen, setIsSubmitOpen] = useState(false)
```

Replace the `<Link href={`/events/${eventId}/submit-price`}>` block and its closing `</Link>` with:
```tsx
<>
  <button
    type="button"
    onClick={() => setIsSubmitOpen(true)}
    style={{
      // copy all existing styles from the Link element verbatim
      marginTop: 14,
      boxSizing: 'border-box',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      height: 44,
      width: '100%',
      borderRadius: 9,
      background: 'var(--signal)',
      color: 'var(--fg-on-accent)',
      fontFamily: 'var(--font-ui)',
      fontWeight: 800,
      fontSize: 14,
      letterSpacing: '-0.005em',
      cursor: 'pointer',
      border: 'none',
    }}
  >
    {/* copy existing button children verbatim */}
  </button>
  <SubmitPriceModal
    open={isSubmitOpen}
    onClose={() => setIsSubmitOpen(false)}
    eventId={eventId}
    artist={artist}
    venueName={venueName}
    date={date}
  />
</>
```

Add the import at the top of `PriceDisplay.tsx`:
```tsx
import { SubmitPriceModal } from '@/components/consumer/submit-price'
```

Also remove the `import Link from 'next/link'` if it is no longer used elsewhere in the file (search for other `<Link` usages first).

- [ ] **Step 6.2: Update the event detail page to pass artist and date to PriceDisplay**

In `apps/web/src/app/(protected)/events/[id]/page.tsx`, find the `<PriceDisplay` call (around line 188) and add the two new props:

```tsx
<PriceDisplay
  priceMin={event.ticketPriceMin}
  priceMax={event.ticketPriceMax}
  priceSource={event.priceSource}
  venueName={event.venue.name}
  ticketUrl={event.ticketUrl}
  eventId={event.id}
  artist={event.artist}
  date={event.date}
  priceStatus={event.priceStatus ?? null}
  ticketPriceOpenedAt={event.ticketPriceOpenedAt ?? null}
  ticketFees={event.ticketFees ?? null}
/>
```

- [ ] **Step 6.3: Run typecheck**

```bash
pnpm --filter web typecheck
```

Expected: no errors

- [ ] **Step 6.4: Commit**

```bash
git add apps/web/src/components/consumer/PriceDisplay.tsx \
        "apps/web/src/app/(protected)/events/[id]/page.tsx"
git commit -m "feat(submit-price): convert PriceDisplay submit link to modal trigger (#403)"
```

---

## Task 7: Delete dead routes and components

**Files to delete:**
- `apps/web/src/app/(protected)/events/[id]/submit-price/page.tsx`
- `apps/web/src/components/consumer/SubmitForm.tsx`
- `apps/web/src/components/consumer/PriceSubmissionForm.tsx`

- [ ] **Step 7.1: Verify nothing imports the files being deleted**

```bash
grep -r "submit-price/page\|SubmitForm\|PriceSubmissionForm" \
  .worktrees/feat/submit-price-modal/apps/web/src --include="*.tsx" --include="*.ts" -l
```

Expected: no output (or only the files themselves)

- [ ] **Step 7.2: Delete the submit-price page route**

```bash
rm "apps/web/src/app/(protected)/events/[id]/submit-price/page.tsx"
rmdir "apps/web/src/app/(protected)/events/[id]/submit-price"
```

- [ ] **Step 7.3: Delete dead components**

```bash
rm apps/web/src/components/consumer/SubmitForm.tsx
rm apps/web/src/components/consumer/PriceSubmissionForm.tsx
```

- [ ] **Step 7.4: Run typecheck to confirm no dangling imports**

```bash
pnpm --filter web typecheck
```

Expected: no errors

- [ ] **Step 7.5: Run the full test suite**

```bash
pnpm --filter web test --run
```

Expected: all tests pass

- [ ] **Step 7.6: Run lint**

```bash
pnpm --filter web lint
```

Expected: no errors

- [ ] **Step 7.7: Commit**

```bash
git add -A
git commit -m "chore: delete submit-price page route and superseded form components (#403)"
```

---

## Post-implementation

- [ ] **Push the branch**

```bash
git push -u origin feat/submit-price-modal
```

- [ ] **Open PR**

Use the PR template at `.github/pull_request_template.md`. Include `Closes #398`, `Closes #399`, `Closes #403`, `Closes #448` in the body. Add a `🔄` row to `docs/superpowers/progress.md`.

- [ ] **Manual smoke test**

1. Open an event detail page that has a price → click "Saw a different price?" → modal opens, form renders, ShieldCheck icon visible, no shield emoji
2. Open an event detail page with no price → PriceDisplay CTA opens same modal
3. Fill in the form and submit → success state renders with "Got it." heading and "Back to show" / "Submit another" buttons
4. Simulate error (disconnect network) → error state shows "Didn't go through." with "Try again" / "Close" — no inline red text
5. Open modal when already submitted → "Already in." state with existing price visible
6. Feedback modal still works correctly (regression check)
