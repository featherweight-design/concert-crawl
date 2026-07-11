// @vitest-environment jsdom

// Wiring tests for the settings "Your plan" surface (PR 3.4): CTA →
// portal-session navigation for paid plans, CTA → tier picker for free
// users, past-due precedence, and the compare-plans affordance.
// Copy-matrix coverage lives in lib/resolve-plan-card.test.ts.

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { PlanState } from '@concert-crawl/types'
import type * as TierPickerModule from '@/components/consumer/tier-picker'

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
})

const mockGetToken = vi.fn()
vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: mockGetToken }),
}))

// PlanPanel now runs usePlanOpenParam (PR 4.2) which needs the app router.
const mockReplace = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: mockReplace }),
  usePathname: () => '/me',
}))

const mockCreatePortalSession = vi.fn()
// Mocked at the network boundary only — the real shared
// navigateToPortalSession (lib/portal-navigation) runs end-to-end.
vi.mock('@/lib/billing', () => ({
  createPortalSession: (token: string) => mockCreatePortalSession(token),
}))

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

import { PlanPanel } from './PlanPanel'
import { PLAN_CARD_COPY } from './definitions/copy'
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

const pickerOpenState = () =>
  screen.getByTestId('tier-picker-sheet').getAttribute('data-open')

describe('PlanPanel — free upgrade path', () => {
  it('renders the free card and opens the tier picker from the primary CTA', () => {
    render(<PlanPanel planState={state()} scaRegion />)
    expect(screen.getByText(PLAN_CARD_COPY.free.headline)).toBeTruthy()
    expect(pickerOpenState()).toBe('false')
    fireEvent.click(
      screen.getByRole('button', { name: PLAN_CARD_COPY.free.cta }),
    )
    expect(pickerOpenState()).toBe('true')
    expect(mockCreatePortalSession).not.toHaveBeenCalled()
  })

  it('free users get no manage-subscription CTA (portal is paid-only)', () => {
    render(<PlanPanel planState={state()} scaRegion />)
    expect(
      screen.queryByRole('button', {
        name: PLAN_CARD_COPY.activePremium.manageCta,
      }),
    ).toBeNull()
  })

  it('?plan=open auto-opens the picker and strips the param (PR 4.2)', () => {
    window.history.replaceState(null, '', '/me?plan=open')
    render(<PlanPanel planState={state()} scaRegion />)
    expect(pickerOpenState()).toBe('true')
    expect(mockReplace).toHaveBeenCalledWith('/me', { scroll: false })
    window.history.replaceState(null, '', '/')
  })

  it('the compare-plans entry opens the tier picker for every state', () => {
    render(
      <PlanPanel
        planState={state({ plan: 'premium', status: 'active' })}
        scaRegion
      />,
    )
    fireEvent.click(
      screen.getByRole('button', { name: TIER_PICKER_COPY.entry.compare }),
    )
    expect(pickerOpenState()).toBe('true')
  })
})

describe('PlanPanel — manage subscription (paid plans)', () => {
  it.each(['supporter', 'premium', 'founder'] as const)(
    '%s manage CTA creates a portal session and navigates to it',
    async (plan) => {
      const assignSpy = vi.fn()
      Object.defineProperty(window, 'location', {
        writable: true,
        value: { ...window.location, assign: assignSpy },
      })
      render(
        <PlanPanel planState={state({ plan, status: 'active' })} scaRegion />,
      )
      fireEvent.click(
        screen.getByRole('button', {
          name: PLAN_CARD_COPY.activePremium.manageCta,
        }),
      )
      await waitFor(() =>
        expect(mockCreatePortalSession).toHaveBeenCalledWith('test-token'),
      )
      await waitFor(() =>
        expect(assignSpy).toHaveBeenCalledWith('https://stripe.test/portal'),
      )
    },
  )

  it('portal failure surfaces the error alert and logs', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockCreatePortalSession.mockRejectedValue(new Error('boom'))
    render(
      <PlanPanel
        planState={state({ plan: 'premium', status: 'active' })}
        scaRegion
      />,
    )
    fireEvent.click(
      screen.getByRole('button', {
        name: PLAN_CARD_COPY.activePremium.manageCta,
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
    render(
      <PlanPanel
        planState={state({ plan: 'premium', status: 'active' })}
        scaRegion
      />,
    )
    fireEvent.click(
      screen.getByRole('button', {
        name: PLAN_CARD_COPY.activePremium.manageCta,
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
    render(
      <PlanPanel
        planState={state({ plan: 'premium', status: 'active' })}
        scaRegion
      />,
    )
    const manageButton = screen.getByRole('button', {
      name: PLAN_CARD_COPY.activePremium.manageCta,
    })
    expect(manageButton.style.cursor).toBe('pointer')
    fireEvent.click(manageButton)
    await waitFor(() =>
      expect(manageButton.hasAttribute('disabled')).toBe(true),
    )
    expect(manageButton.style.cursor).toBe('default')
    resolvePortal({ url: 'https://stripe.test/portal' })
    await waitFor(() =>
      expect(assignSpy).toHaveBeenCalledWith('https://stripe.test/portal'),
    )
  })
})

describe('PlanPanel — lifecycle states', () => {
  it('past_due outranks the founder celebration and routes Update card to the portal', async () => {
    render(
      <PlanPanel
        planState={state({ plan: 'founder', status: 'past_due' })}
        scaRegion
      />,
    )
    expect(screen.getByText(PLAN_CARD_COPY.pastDue.headline)).toBeTruthy()
    expect(screen.queryByText(PLAN_CARD_COPY.activeFounder.headline)).toBeNull()
    fireEvent.click(
      screen.getByRole('button', {
        name: PLAN_CARD_COPY.pastDue.updateCardCta,
      }),
    )
    await waitFor(() =>
      expect(mockCreatePortalSession).toHaveBeenCalledWith('test-token'),
    )
  })

  it('cancel-at-period-end renders the winding-down card with a portal CTA', () => {
    render(
      <PlanPanel
        scaRegion
        planState={state({
          plan: 'premium',
          status: 'active',
          cancelAtPeriodEnd: true,
          currentPeriodEnd: '2026-07-15T07:00:00Z',
        })}
      />,
    )
    expect(
      screen.getByText(
        PLAN_CARD_COPY.cancelGrace.headline('Premium', 'Jul 15'),
      ),
    ).toBeTruthy()
    expect(
      screen.getByRole('button', {
        name: PLAN_CARD_COPY.cancelGrace.manageCta,
      }),
    ).toBeTruthy()
  })

  it('trial renders the countdown card and its CTA opens the tier picker', () => {
    render(
      <PlanPanel
        scaRegion
        planState={state({
          plan: 'premium',
          onTrial: true,
          trialEndsAt: new Date(Date.now() + 8 * DAY_MS).toISOString(),
        })}
      />,
    )
    expect(screen.getByText(PLAN_CARD_COPY.trial.early.headline)).toBeTruthy()
    fireEvent.click(
      screen.getByRole('button', { name: PLAN_CARD_COPY.trial.early.cta }),
    )
    expect(pickerOpenState()).toBe('true')
  })

  it('gifted card has no manage CTA; discovery opens the picker', () => {
    render(<PlanPanel planState={state({ plan: 'gifted' })} scaRegion />)
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
    render(
      <PlanPanel
        scaRegion
        planState={state({
          plan: 'premium',
          onTrial: true,
          trialEndsAt: 'not-a-date',
        })}
      />,
    )
    expect(document.body.textContent).not.toContain('NaN')
  })
})

describe('PlanPanel — a11y and viewport parity', () => {
  it('the card is a labelled region', () => {
    render(<PlanPanel planState={state()} scaRegion />)
    expect(
      screen.getByRole('region', { name: PLAN_CARD_COPY.ariaLabel }),
    ).toBeTruthy()
  })

  it('mobile viewport renders the same CTAs (behavioral parity)', () => {
    mobileViewport = true
    render(
      <PlanPanel
        planState={state({ plan: 'premium', status: 'active' })}
        scaRegion
      />,
    )
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
