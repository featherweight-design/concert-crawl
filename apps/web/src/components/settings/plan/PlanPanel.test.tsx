// @vitest-environment jsdom

// Wiring tests for the settings "Your plan" surface (PR 3.4 + PR 4.5):
// paid manage CTA → in-app manage sheet, cancel-grace Resubscribe →
// POST /v1/billing/resubscribe, past-due CTAs → portal navigation, free
// CTA → tier picker, and the compare-plans affordance. Copy-matrix
// coverage lives in lib/resolve-plan-card.test.ts; manage-sheet internals
// in manage/ManageSubscriptionSheet.test.tsx.

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { PlanState } from '@concert-crawl/types'
import type * as TierPickerModule from '@/components/consumer/tier-picker'
import type * as BillingModule from '@/lib/billing'

let mobileViewport = false

beforeEach(() => {
  mobileViewport = false
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: mobileViewport,
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
  mockGetToken.mockResolvedValue('test-token')
  mockCreatePortalSession.mockResolvedValue({
    url: 'https://stripe.test/portal',
  })
  mockResubscribe.mockResolvedValue(undefined)
})

const mockGetToken = vi.fn()
vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: mockGetToken, userId: 'user_test' }),
}))

// PlanPanel runs usePlanOpenParam (PR 4.2) and useResubscribe (PR 4.5),
// which need the app router.
const mockReplace = vi.fn()
const mockRefresh = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: mockReplace,
    refresh: mockRefresh,
  }),
  usePathname: () => '/me',
  useSearchParams: () => new URLSearchParams(window.location.search),
}))

const mockCreatePortalSession = vi.fn()
const mockResubscribe = vi.fn()
// Mocked at the network boundary only — the real shared
// navigateToPortalSession (lib/portal-navigation) runs end-to-end.
vi.mock('@/lib/billing', async () => {
  const actual = await vi.importActual<typeof BillingModule>('@/lib/billing')
  return {
    ...actual,
    createPortalSession: (token: string) => mockCreatePortalSession(token),
    resubscribeSubscription: (token: string) => mockResubscribe(token),
  }
})

// The picker has its own suite — here we only care that the panel opens it.
vi.mock('@/components/consumer/tier-picker', async () => {
  const actual = await vi.importActual<typeof TierPickerModule>(
    '@/components/consumer/tier-picker',
  )
  return {
    ...actual,
    TierPickerSheet: ({ open }: { open: boolean }) => (
      <div
        data-testid="tier-picker-sheet"
        data-open={open ? 'true' : 'false'}
      />
    ),
  }
})

// The manage sheet has its own suite (manage/ManageSubscriptionSheet.test.tsx)
// — here we only care that the panel opens it with the right tier/date.
vi.mock('./manage', () => ({
  ManageSubscriptionSheet: ({
    open,
    tier,
    periodEnd,
  }: {
    open: boolean
    tier: string
    periodEnd: string | null
  }) => (
    <div
      data-testid="manage-sheet"
      data-open={open ? 'true' : 'false'}
      data-tier={tier}
      data-period-end={periodEnd ?? ''}
    />
  ),
}))

import { PlanPanel } from './PlanPanel'
import { PLAN_CARD_COPY } from './definitions/copy'
import { ApiError } from '@/lib/api'
import { TIER_PICKER_COPY } from '@/components/consumer/tier-picker/definitions/copy'

const DAY_MS = 86_400_000

const basePlanState: PlanState = {
  plan: 'free',
  onTrial: false,
  trialEndsAt: null,
  status: null,
  cancelAtPeriodEnd: false,
  currentPeriodEnd: null,
  roleComped: false,
}

const state = (overrides: Partial<PlanState> = {}): PlanState => ({
  ...basePlanState,
  ...overrides,
})

const renderPanel = (planState: PlanState) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <PlanPanel planState={planState} scaRegion />
    </QueryClientProvider>,
  )
}

const pickerOpenState = () =>
  screen.getByTestId('tier-picker-sheet').getAttribute('data-open')

const manageSheet = () => screen.queryByTestId('manage-sheet')

describe('PlanPanel — free upgrade path', () => {
  it('renders the free card and opens the tier picker from the primary CTA', () => {
    renderPanel(state())
    expect(screen.getByText(PLAN_CARD_COPY.free.headline)).toBeTruthy()
    expect(pickerOpenState()).toBe('false')
    fireEvent.click(
      screen.getByRole('button', { name: PLAN_CARD_COPY.free.cta }),
    )
    expect(pickerOpenState()).toBe('true')
    expect(mockCreatePortalSession).not.toHaveBeenCalled()
  })

  it('free users get no manage CTA and no manage sheet mounted', () => {
    renderPanel(state())
    expect(
      screen.queryByRole('button', {
        name: PLAN_CARD_COPY.activePremium.manageCta,
      }),
    ).toBeNull()
    expect(manageSheet()).toBeNull()
  })

  it('?plan=open auto-opens the picker and strips the param (PR 4.2)', () => {
    window.history.replaceState(null, '', '/me?plan=open')
    renderPanel(state())
    expect(pickerOpenState()).toBe('true')
    expect(mockReplace).toHaveBeenCalledWith('/me', { scroll: false })
    window.history.replaceState(null, '', '/')
  })

  it('the compare-plans entry opens the tier picker for every state', () => {
    renderPanel(state({ plan: 'premium', status: 'active' }))
    fireEvent.click(
      screen.getByRole('button', { name: TIER_PICKER_COPY.entry.compare }),
    )
    expect(pickerOpenState()).toBe('true')
  })
})

describe('PlanPanel — manage subscription (paid plans, PR 4.5)', () => {
  it.each(['supporter', 'premium', 'founder'] as const)(
    '%s manage CTA opens the in-app manage sheet (no portal round-trip)',
    (plan) => {
      renderPanel(
        state({
          plan,
          status: 'active',
          currentPeriodEnd: '2026-07-15T07:00:00Z',
        }),
      )
      expect(manageSheet()?.getAttribute('data-open')).toBe('false')
      fireEvent.click(
        screen.getByRole('button', {
          name: PLAN_CARD_COPY.activePremium.manageCta,
        }),
      )
      expect(manageSheet()?.getAttribute('data-open')).toBe('true')
      expect(manageSheet()?.getAttribute('data-tier')).toBe(plan)
      expect(manageSheet()?.getAttribute('data-period-end')).toBe('Jul 15')
      expect(mockCreatePortalSession).not.toHaveBeenCalled()
    },
  )
})

describe('PlanPanel — cancel-grace resubscribe (PR 4.5)', () => {
  const graceState = () =>
    state({
      plan: 'premium',
      status: 'active',
      cancelAtPeriodEnd: true,
      currentPeriodEnd: '2026-07-15T07:00:00Z',
    })

  it('renders the winding-down card with Resubscribe primary + portal ghost', () => {
    renderPanel(graceState())
    expect(
      screen.getByText(
        PLAN_CARD_COPY.cancelGrace.headline('Premium', 'Jul 15'),
      ),
    ).toBeTruthy()
    expect(
      screen.getByRole('button', {
        name: PLAN_CARD_COPY.cancelGrace.resubscribeCta,
      }),
    ).toBeTruthy()
    expect(
      screen.getByRole('button', {
        name: PLAN_CARD_COPY.cancelGrace.manageCta,
      }),
    ).toBeTruthy()
  })

  it('Resubscribe posts to the API and refreshes the server tree', async () => {
    renderPanel(graceState())
    fireEvent.click(
      screen.getByRole('button', {
        name: PLAN_CARD_COPY.cancelGrace.resubscribeCta,
      }),
    )
    await waitFor(() =>
      expect(mockResubscribe).toHaveBeenCalledWith('test-token'),
    )
    await waitFor(() => expect(mockRefresh).toHaveBeenCalled())
  })

  it('the ghost Manage subscription CTA still routes to the Stripe portal', async () => {
    const assignSpy = vi.fn()
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { ...window.location, assign: assignSpy },
    })
    renderPanel(graceState())
    fireEvent.click(
      screen.getByRole('button', {
        name: PLAN_CARD_COPY.cancelGrace.manageCta,
      }),
    )
    await waitFor(() =>
      expect(mockCreatePortalSession).toHaveBeenCalledWith('test-token'),
    )
    await waitFor(() =>
      expect(assignSpy).toHaveBeenCalledWith('https://stripe.test/portal'),
    )
  })

  it('resubscribe failure surfaces the error alert and logs', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockResubscribe.mockRejectedValue(new Error('boom'))
    renderPanel(graceState())
    fireEvent.click(
      screen.getByRole('button', {
        name: PLAN_CARD_COPY.cancelGrace.resubscribeCta,
      }),
    )
    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toBe(
        PLAN_CARD_COPY.errors.resubscribe,
      ),
    )
    expect(consoleSpy).toHaveBeenCalled()
    consoleSpy.mockRestore()
  })

  it('clicking the portal ghost clears a stale resubscribe error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const assignSpy = vi.fn()
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { ...window.location, assign: assignSpy },
    })
    mockResubscribe.mockRejectedValue(new Error('boom'))
    renderPanel(graceState())
    fireEvent.click(
      screen.getByRole('button', {
        name: PLAN_CARD_COPY.cancelGrace.resubscribeCta,
      }),
    )
    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toBe(
        PLAN_CARD_COPY.errors.resubscribe,
      ),
    )
    fireEvent.click(
      screen.getByRole('button', {
        name: PLAN_CARD_COPY.cancelGrace.manageCta,
      }),
    )
    expect(screen.queryByRole('alert')).toBeNull()
    await waitFor(() =>
      expect(assignSpy).toHaveBeenCalledWith('https://stripe.test/portal'),
    )
    consoleSpy.mockRestore()
  })

  it('a 409 (grace lapsed) still re-syncs plan state', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockResubscribe.mockRejectedValue(
      new ApiError(409, 'conflict', 'not_in_cancel_grace'),
    )
    renderPanel(graceState())
    fireEvent.click(
      screen.getByRole('button', {
        name: PLAN_CARD_COPY.cancelGrace.resubscribeCta,
      }),
    )
    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toBe(
        PLAN_CARD_COPY.errors.resubscribe,
      ),
    )
    expect(mockRefresh).toHaveBeenCalled()
    consoleSpy.mockRestore()
  })
})

describe('PlanPanel — portal navigation (past-due, #782)', () => {
  const pastDueState = () => state({ plan: 'premium', status: 'past_due' })

  it('Update card creates a portal session and navigates to it', async () => {
    const assignSpy = vi.fn()
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { ...window.location, assign: assignSpy },
    })
    renderPanel(pastDueState())
    fireEvent.click(
      screen.getByRole('button', {
        name: PLAN_CARD_COPY.pastDue.updateCardCta,
      }),
    )
    await waitFor(() =>
      expect(mockCreatePortalSession).toHaveBeenCalledWith('test-token'),
    )
    await waitFor(() =>
      expect(assignSpy).toHaveBeenCalledWith('https://stripe.test/portal'),
    )
  })

  it('portal failure surfaces the error alert and logs', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockCreatePortalSession.mockRejectedValue(new Error('boom'))
    renderPanel(pastDueState())
    fireEvent.click(
      screen.getByRole('button', {
        name: PLAN_CARD_COPY.pastDue.updateCardCta,
      }),
    )
    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toBe(
        PLAN_CARD_COPY.errors.portal,
      ),
    )
    expect(consoleSpy).toHaveBeenCalled()
    consoleSpy.mockRestore()
  })

  it('opening the compare-plans entry clears a stale portal error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockCreatePortalSession.mockRejectedValue(new Error('boom'))
    renderPanel(pastDueState())
    fireEvent.click(
      screen.getByRole('button', {
        name: PLAN_CARD_COPY.pastDue.updateCardCta,
      }),
    )
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy())
    fireEvent.click(
      screen.getByRole('button', { name: TIER_PICKER_COPY.entry.compare }),
    )
    expect(screen.queryByRole('alert')).toBeNull()
    expect(pickerOpenState()).toBe('true')
    consoleSpy.mockRestore()
  })

  it('a pending portal CTA is disabled and drops the pointer cursor', async () => {
    let resolvePortal: (value: { url: string }) => void = () => {}
    mockCreatePortalSession.mockImplementation(
      () =>
        new Promise<{ url: string }>((resolve) => {
          resolvePortal = resolve
        }),
    )
    const assignSpy = vi.fn()
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { ...window.location, assign: assignSpy },
    })
    renderPanel(pastDueState())
    const updateButton = screen.getByRole('button', {
      name: PLAN_CARD_COPY.pastDue.updateCardCta,
    })
    expect(updateButton.style.cursor).toBe('pointer')
    fireEvent.click(updateButton)
    await waitFor(() =>
      expect(updateButton.hasAttribute('disabled')).toBe(true),
    )
    expect(updateButton.style.cursor).toBe('default')
    resolvePortal({ url: 'https://stripe.test/portal' })
    await waitFor(() =>
      expect(assignSpy).toHaveBeenCalledWith('https://stripe.test/portal'),
    )
  })
})

describe('PlanPanel — lifecycle states', () => {
  it('trial renders the countdown card and its CTA opens the tier picker', () => {
    renderPanel(
      state({
        plan: 'premium',
        onTrial: true,
        trialEndsAt: new Date(Date.now() + 8 * DAY_MS).toISOString(),
      }),
    )
    expect(screen.getByText(PLAN_CARD_COPY.trial.early.headline)).toBeTruthy()
    fireEvent.click(
      screen.getByRole('button', { name: PLAN_CARD_COPY.trial.early.cta }),
    )
    expect(pickerOpenState()).toBe('true')
  })

  it('gifted card has no manage CTA; discovery opens the picker', () => {
    renderPanel(state({ plan: 'gifted' }))
    expect(screen.getByText(PLAN_CARD_COPY.gifted.headline)).toBeTruthy()
    expect(
      screen.queryByRole('button', {
        name: PLAN_CARD_COPY.activePremium.manageCta,
      }),
    ).toBeNull()
    fireEvent.click(
      screen.getByRole('button', { name: PLAN_CARD_COPY.gifted.discoverCta }),
    )
    expect(pickerOpenState()).toBe('true')
  })

  it('unparseable trialEndsAt never renders NaN', () => {
    renderPanel(
      state({ plan: 'premium', onTrial: true, trialEndsAt: 'not-a-date' }),
    )
    expect(document.body.textContent).not.toContain('NaN')
  })
})

describe('PlanPanel — a11y and viewport parity', () => {
  it('the card is a labelled region', () => {
    renderPanel(state())
    expect(
      screen.getByRole('region', { name: PLAN_CARD_COPY.ariaLabel }),
    ).toBeTruthy()
  })

  it('mobile viewport renders the same CTAs (behavioral parity)', () => {
    mobileViewport = true
    renderPanel(state({ plan: 'premium', status: 'active' }))
    expect(
      screen.getByRole('button', {
        name: PLAN_CARD_COPY.activePremium.manageCta,
      }),
    ).toBeTruthy()
    expect(
      screen.getByRole('button', { name: TIER_PICKER_COPY.entry.compare }),
    ).toBeTruthy()
  })
})
