// @vitest-environment jsdom

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type {
  PlanState,
  UserPlan,
  FounderWindowView,
} from '@concert-crawl/types'

// Viewport toggle read lazily by the matchMedia mock below.
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
  mockUseFounderWindow.mockReturnValue({ data: openWindow })
  mockCreateCheckoutSession.mockResolvedValue({
    clientSecret: 'cs_test_secret',
    subscriptionId: 'sub_test_1',
  })
  mockAbandonCheckout.mockResolvedValue(undefined)
  mockCreatePortalSession.mockResolvedValue({
    url: 'https://stripe.test/portal',
  })
})

const mockGetToken = vi.fn()
vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: mockGetToken }),
}))

const mockPush = vi.fn()
const mockRefresh = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}))

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string
    children: React.ReactNode
    style?: React.CSSProperties
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))

const mockUseFounderWindow = vi.fn()
vi.mock('@/lib/queries/use-founder-window', () => ({
  useFounderWindow: (enabled: boolean) => mockUseFounderWindow(enabled),
}))

const mockCreateCheckoutSession = vi.fn()
const mockAbandonCheckout = vi.fn()
const mockCreatePortalSession = vi.fn()
// Mocked at the network boundary only — the real shared
// navigateToPortalSession (lib/portal-navigation) runs end-to-end.
vi.mock('@/lib/billing', () => ({
  createCheckoutSession: (token: string, tier: string) =>
    mockCreateCheckoutSession(token, tier),
  abandonCheckout: (token: string, subscriptionId: string) =>
    mockAbandonCheckout(token, subscriptionId),
  createPortalSession: (token: string) => mockCreatePortalSession(token),
}))

// Stripe is exercised in CheckoutPanel's own concerns; here we only care
// that the sheet swaps to the checkout phase and wires back/success.
vi.mock('./CheckoutPanel', () => ({
  CheckoutPanel: ({
    tierKey,
    onBack,
    onSuccess,
  }: {
    tierKey: string
    onBack: () => void
    onSuccess: () => void
  }) => (
    <div data-testid="checkout-panel">
      <span data-testid="checkout-tier">{tierKey}</span>
      <button type="button" onClick={onBack}>
        mock-back
      </button>
      <button type="button" onClick={onSuccess}>
        mock-success
      </button>
    </div>
  ),
}))

import { TierPickerSheet } from './TierPickerSheet'
import { TIER_PICKER_COPY } from './definitions/copy'

const futureClose = new Date(Date.now() + 5 * 86_400_000).toISOString()

const openWindow: FounderWindowView = {
  state: 'open',
  seatsTotal: 100,
  seatsRemaining: 37,
  closesAt: futureClose,
}

const planState = (
  plan: UserPlan,
  overrides: Partial<PlanState> = {},
): PlanState => ({
  plan,
  onTrial: false,
  trialEndsAt: null,
  status: null,
  cancelAtPeriodEnd: false,
  currentPeriodEnd: null,
  roleComped: false,
  ...overrides,
})

const renderSheet = (state: PlanState, onClose = vi.fn()) => {
  render(<TierPickerSheet open onClose={onClose} planState={state} scaRegion />)
  return onClose
}

describe('TierPickerSheet — visibility and states', () => {
  it('renders nothing when closed', () => {
    render(
      <TierPickerSheet
        open={false}
        onClose={vi.fn()}
        planState={planState('free')}
        scaRegion
      />,
    )
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('free state / founder window open — four desktop cards with scarcity rail', () => {
    renderSheet(planState('free'))
    expect(screen.getByText(TIER_PICKER_COPY.header.title)).toBeTruthy()
    expect(screen.getByTestId('tier-card-free')).toBeTruthy()
    expect(screen.getByTestId('tier-card-supporter')).toBeTruthy()
    expect(screen.getByTestId('tier-card-premium')).toBeTruthy()
    expect(screen.getByTestId('tier-card-founder')).toBeTruthy()
    expect(screen.getByTestId('scarcity-rail')).toBeTruthy()
  })

  it('price promise renders per tier with locked wording', () => {
    renderSheet(planState('free'))
    expect(
      screen.getAllByText(TIER_PICKER_COPY.card.pricePromise.supporter),
    ).toHaveLength(2) // supporter + premium share the line
    expect(
      screen.getByText(TIER_PICKER_COPY.card.pricePromise.founder),
    ).toBeTruthy()
  })

  it('founder pre-launch — card visible with disabled "Opens at public launch" CTA', () => {
    mockUseFounderWindow.mockReturnValue({
      data: { state: 'pre-launch', seatsTotal: 100, closesAt: null },
    })
    renderSheet(planState('free'))
    expect(screen.getByTestId('tier-card-founder')).toBeTruthy()
    const preLaunchCta = screen.getByRole('button', {
      name: TIER_PICKER_COPY.card.founderPreLaunch,
    })
    expect(preLaunchCta.hasAttribute('disabled')).toBe(true)
    expect(screen.queryByTestId('scarcity-rail')).toBeNull()
  })

  it('founder window closed — founder card hidden for non-founders', () => {
    mockUseFounderWindow.mockReturnValue({
      data: {
        state: 'closed',
        seatsTotal: 100,
        seatsRemaining: 0,
        closesAt: null,
      },
    })
    renderSheet(planState('free'))
    expect(screen.queryByTestId('tier-card-founder')).toBeNull()
    expect(screen.getByTestId('tier-card-premium')).toBeTruthy()
  })

  it('founder window closed — founder still sees their own card', () => {
    mockUseFounderWindow.mockReturnValue({
      data: {
        state: 'closed',
        seatsTotal: 100,
        seatsRemaining: 0,
        closesAt: null,
      },
    })
    renderSheet(planState('founder', { status: 'active' }))
    expect(screen.getByTestId('tier-card-founder')).toBeTruthy()
    expect(
      screen.getByText(TIER_PICKER_COPY.cta.alreadyViaFounder),
    ).toBeTruthy()
  })

  it('roleComped user gets the gifted panel instead of tier cards', () => {
    renderSheet(planState('gifted', { roleComped: true }))
    expect(screen.getByTestId('gifted-thank-you')).toBeTruthy()
    expect(screen.queryByTestId('tier-card-free')).toBeNull()
    expect(screen.getByText(TIER_PICKER_COPY.gifted.title)).toBeTruthy()
  })

  it('scarcity rail is a polite live region for screen readers', () => {
    renderSheet(planState('free'))
    const rail = screen.getByTestId('scarcity-rail')
    expect(rail.getAttribute('role')).toBe('status')
    expect(rail.getAttribute('aria-live')).toBe('polite')
  })

  it('gifted discovery button keeps UA focus styles (no all:unset reset)', () => {
    renderSheet(planState('gifted', { roleComped: true }))
    const discover = screen.getByRole('button', {
      name: TIER_PICKER_COPY.gifted.discover,
    })
    expect(discover.style.getPropertyValue('all')).toBe('')
  })

  it('gifted discovery button closes the sheet back to the app', () => {
    const onClose = renderSheet(planState('gifted', { roleComped: true }))
    fireEvent.click(
      screen.getByRole('button', { name: TIER_PICKER_COPY.gifted.discover }),
    )
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(mockAbandonCheckout).not.toHaveBeenCalled()
  })
})

describe('TierPickerSheet — logged out', () => {
  it('shows the logged-out header and inline sign-in link', () => {
    renderSheet(planState('logged-out'))
    expect(
      screen.getByText(TIER_PICKER_COPY.header.loggedOutTitle),
    ).toBeTruthy()
    const signInLink = screen.getByText(TIER_PICKER_COPY.signIn.link)
    expect(signInLink.getAttribute('href')).toBe('/sign-in')
  })

  it('tier CTAs route to sign-up', () => {
    renderSheet(planState('logged-out'))
    fireEvent.click(
      screen.getByRole('button', { name: TIER_PICKER_COPY.cta.signUpFree }),
    )
    expect(mockPush).toHaveBeenCalledWith('/sign-up')
  })
})

describe('TierPickerSheet — mobile accordion', () => {
  it('renders rows with the current plan expanded; tapping another row expands it', () => {
    mobileViewport = true
    renderSheet(planState('free'))
    expect(screen.getByTestId('tier-row-free')).toBeTruthy()

    // Match by tagline — CTA labels also contain the tier names.
    const freeToggle = screen.getByRole('button', {
      name: new RegExp(TIER_PICKER_COPY.tiers.free.tagline),
    })
    expect(freeToggle.getAttribute('aria-expanded')).toBe('true')

    const premiumToggle = screen.getByRole('button', {
      name: new RegExp(TIER_PICKER_COPY.tiers.premium.tagline),
    })
    expect(premiumToggle.getAttribute('aria-expanded')).toBe('false')
    fireEvent.click(premiumToggle)
    expect(premiumToggle.getAttribute('aria-expanded')).toBe('true')
  })

  it('shows the mobile footer rail', () => {
    mobileViewport = true
    renderSheet(planState('free'))
    expect(screen.getByText(TIER_PICKER_COPY.footer.mobile)).toBeTruthy()
  })
})

describe('TierPickerSheet — checkout flow', () => {
  it('starting a premium trial creates a checkout session and swaps to the checkout panel', async () => {
    renderSheet(planState('free'))
    fireEvent.click(
      screen.getByRole('button', { name: TIER_PICKER_COPY.cta.startTrial }),
    )
    await waitFor(() =>
      expect(mockCreateCheckoutSession).toHaveBeenCalledWith(
        'test-token',
        'premium',
      ),
    )
    await waitFor(() =>
      expect(screen.getByTestId('checkout-panel')).toBeTruthy(),
    )
    expect(screen.getByTestId('checkout-tier').textContent).toBe('premium')
  })

  it('dismissing mid-checkout fires the best-effort abandon call and closes', async () => {
    const onClose = renderSheet(planState('free'))
    fireEvent.click(
      screen.getByRole('button', { name: TIER_PICKER_COPY.cta.startTrial }),
    )
    await waitFor(() =>
      expect(screen.getByTestId('checkout-panel')).toBeTruthy(),
    )
    fireEvent.click(screen.getByTestId('modal-scrim'))
    expect(onClose).toHaveBeenCalled()
    await waitFor(() =>
      expect(mockAbandonCheckout).toHaveBeenCalledWith(
        'test-token',
        'sub_test_1',
      ),
    )
  })

  it('back-to-tiers abandons the in-flight checkout and returns to the grid', async () => {
    renderSheet(planState('free'))
    fireEvent.click(
      screen.getByRole('button', { name: TIER_PICKER_COPY.cta.startTrial }),
    )
    await waitFor(() =>
      expect(screen.getByTestId('checkout-panel')).toBeTruthy(),
    )
    fireEvent.click(screen.getByText('mock-back'))
    await waitFor(() =>
      expect(mockAbandonCheckout).toHaveBeenCalledWith(
        'test-token',
        'sub_test_1',
      ),
    )
    expect(screen.getByTestId('tier-card-premium')).toBeTruthy()
  })

  it('successful checkout closes the sheet and refreshes plan state', async () => {
    const onClose = renderSheet(planState('free'))
    fireEvent.click(
      screen.getByRole('button', { name: TIER_PICKER_COPY.cta.startTrial }),
    )
    await waitFor(() =>
      expect(screen.getByTestId('checkout-panel')).toBeTruthy(),
    )
    fireEvent.click(screen.getByText('mock-success'))
    expect(onClose).toHaveBeenCalled()
    expect(mockRefresh).toHaveBeenCalled()
    expect(mockAbandonCheckout).not.toHaveBeenCalled()
  })

  it('dismissing while the session request is in flight abandons it and never shows checkout', async () => {
    let resolveSession: (value: {
      clientSecret: string
      subscriptionId: string
    }) => void = () => {}
    mockCreateCheckoutSession.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSession = resolve
        }),
    )
    const onClose = renderSheet(planState('free'))
    fireEvent.click(
      screen.getByRole('button', { name: TIER_PICKER_COPY.cta.startTrial }),
    )
    await waitFor(() => expect(mockCreateCheckoutSession).toHaveBeenCalled())

    // Dismiss the sheet before the session request resolves.
    fireEvent.click(screen.getByTestId('modal-scrim'))
    expect(onClose).toHaveBeenCalled()

    resolveSession({
      clientSecret: 'cs_test_secret',
      subscriptionId: 'sub_test_1',
    })
    await waitFor(() =>
      expect(mockAbandonCheckout).toHaveBeenCalledWith(
        'test-token',
        'sub_test_1',
      ),
    )
    expect(screen.queryByTestId('checkout-panel')).toBeNull()
  })

  it('checkout-session failure surfaces the start error and stays on the grid', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockCreateCheckoutSession.mockRejectedValue(new Error('boom'))
    renderSheet(planState('free'))
    fireEvent.click(
      screen.getByRole('button', { name: TIER_PICKER_COPY.cta.startTrial }),
    )
    await waitFor(() =>
      expect(
        screen.getByText(TIER_PICKER_COPY.checkout.startError),
      ).toBeTruthy(),
    )
    expect(screen.queryByTestId('checkout-panel')).toBeNull()
    consoleSpy.mockRestore()
  })
})

describe('TierPickerSheet — manage subscription', () => {
  it('current paid plan CTA opens the billing portal', async () => {
    renderSheet(planState('supporter', { status: 'active' }))
    fireEvent.click(
      screen.getByRole('button', {
        name: TIER_PICKER_COPY.cta.manageSubscription,
      }),
    )
    await waitFor(() =>
      expect(mockCreatePortalSession).toHaveBeenCalledWith('test-token'),
    )
  })
})
