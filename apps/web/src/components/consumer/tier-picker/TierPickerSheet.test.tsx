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
    founderSeatNumber: null,
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
    onSurfaceChange,
  }: {
    tierKey: string
    onBack: () => void
    onSuccess: () => void
    onSurfaceChange: (surface: {
      kind: string
      category?: string
      challenge?: string
    }) => void
  }) => (
    <div data-testid="checkout-panel">
      <span data-testid="checkout-tier">{tierKey}</span>
      <button type="button" onClick={onBack}>
        mock-back
      </button>
      <button type="button" onClick={onSuccess}>
        mock-success
      </button>
      <button
        type="button"
        onClick={() =>
          onSurfaceChange({ kind: 'failure', category: 'insufficient_funds' })
        }
      >
        mock-fail
      </button>
      <button
        type="button"
        onClick={() => onSurfaceChange({ kind: 'challenge', challenge: '3ds' })}
      >
        mock-challenge
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
  render(
    <TierPickerSheet
      open
      onClose={onClose}
      planState={state}
      scaRegion
      entry="settings"
    />,
  )
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
        entry="settings"
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

  it('states the price promise once, not per tier', () => {
    renderSheet(planState('free'))
    expect(screen.getByText(TIER_PICKER_COPY.footer.desktop)).toBeTruthy()
    // Founder keeps a card line because its locked-$3 stamp says something the
    // generic promise does not.
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
      screen.getByText(TIER_PICKER_COPY.header.loggedOut.default.title),
    ).toBeTruthy()
    const signInLink = screen.getByText(TIER_PICKER_COPY.signIn.link)
    expect(signInLink.getAttribute('href')).toBe('/sign-in')
  })

  // One gate, several reaches: an "I'm going!" tap is a reach for Concerts, so
  // the Watching wording would name the wrong feature.
  it('names Concerts when opened from the going CTA', () => {
    render(
      <TierPickerSheet
        open
        onClose={vi.fn()}
        planState={planState('logged-out')}
        scaRegion
        entry="logged-out-going"
      />,
    )
    const going = TIER_PICKER_COPY.header.loggedOut['logged-out-going']
    expect(screen.getByText(going.title)).toBeTruthy()
    expect(
      screen.queryByText(TIER_PICKER_COPY.header.loggedOut.default.title),
    ).toBeNull()
  })

  it('names submitted prices when opened from the price form', () => {
    render(
      <TierPickerSheet
        open
        onClose={vi.fn()}
        planState={planState('logged-out')}
        scaRegion
        entry="logged-out-price"
      />,
    )
    const price = TIER_PICKER_COPY.header.loggedOut['logged-out-price']
    expect(screen.getByText(price.title)).toBeTruthy()
    expect(
      screen.queryByText(TIER_PICKER_COPY.header.loggedOut.default.title),
    ).toBeNull()
  })

  it('tier CTAs route to sign-up', () => {
    renderSheet(planState('logged-out'))
    fireEvent.click(
      screen.getByRole('button', { name: TIER_PICKER_COPY.cta.signUpFree }),
    )
    // Free carries no tier: signing up is the whole of what its CTA promises.
    expect(mockPush).toHaveBeenCalledWith('/sign-up')
  })

  it('a paid CTA carries its tier through sign-up (#1284)', () => {
    renderSheet(planState('logged-out'))
    fireEvent.click(
      screen.getByRole('button', { name: TIER_PICKER_COPY.cta.pickPremium }),
    )
    expect(mockPush).toHaveBeenCalledWith('/sign-up?tier=premium')
  })

  // Locked vocabulary (CLAUDE.md): Watching is never "Saved"/"Favorites"/
  // "Following". This header is the first thing a gated visitor reads.
  it('names Watching without the forbidden synonyms', () => {
    renderSheet(planState('logged-out'))
    expect(screen.getByText(/watching · free with an account/i)).toBeTruthy()
    expect(
      screen.getByText(/keep an eye on the ones you can't miss/i),
    ).toBeTruthy()
    const rendered = screen.getByTestId('tier-picker-header').textContent ?? ''
    expect(rendered).toMatch(/watching/i)
    expect(rendered).not.toMatch(/\b(saved|favorites?|following)\b/i)
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

  it('opens on initialTier instead of the plan-derived default (#1284)', () => {
    mobileViewport = true
    render(
      <TierPickerSheet
        open
        onClose={vi.fn()}
        planState={planState('free')}
        scaRegion
        entry="post-signup"
        initialTier="premium"
      />,
    )
    const premiumToggle = screen.getByRole('button', {
      name: new RegExp(TIER_PICKER_COPY.tiers.premium.tagline),
    })
    expect(premiumToggle.getAttribute('aria-expanded')).toBe('true')
    const freeToggle = screen.getByRole('button', {
      name: new RegExp(TIER_PICKER_COPY.tiers.free.tagline),
    })
    expect(freeToggle.getAttribute('aria-expanded')).toBe('false')
  })

  it('falls back to the default when initialTier is not on screen (#1284)', () => {
    // The param is visitor-editable and Founder stops rendering once its
    // window closes, so a tier that is not shown must not leave every row
    // collapsed.
    mobileViewport = true
    mockUseFounderWindow.mockReturnValue({
      data: { state: 'closed', seatsTotal: 100, seatsRemaining: 0 },
    })
    render(
      <TierPickerSheet
        open
        onClose={vi.fn()}
        planState={planState('free')}
        scaRegion
        entry="post-signup"
        initialTier="founder"
      />,
    )
    const freeToggle = screen.getByRole('button', {
      name: new RegExp(TIER_PICKER_COPY.tiers.free.tagline),
    })
    expect(freeToggle.getAttribute('aria-expanded')).toBe('true')
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

  it('re-roles the ModalShell root as alertdialog while a failure surface is up', async () => {
    renderSheet(planState('free'))
    fireEvent.click(
      screen.getByRole('button', { name: TIER_PICKER_COPY.cta.startTrial }),
    )
    await waitFor(() =>
      expect(screen.getByTestId('checkout-panel')).toBeTruthy(),
    )
    // One modal root, plain dialog, named "Tier picker" during checkout.
    const dialogBefore = screen.getByRole('dialog')
    expect(dialogBefore.getAttribute('aria-label')).toBe(
      TIER_PICKER_COPY.entry.ariaLabel,
    )
    fireEvent.click(screen.getByText('mock-fail'))
    // Failure lifts the alertdialog role/labeling to the shell — never a
    // second nested dialog.
    const alert = screen.getByRole('alertdialog')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(alert.getAttribute('aria-modal')).toBe('true')
    expect(alert.getAttribute('aria-label')).toBeNull()
    expect(alert.getAttribute('aria-labelledby')).toBe(
      'fail-h-insufficient_funds',
    )
    expect(alert.getAttribute('aria-describedby')).toBe(
      'fail-d-insufficient_funds',
    )
  })

  it('keeps the ModalShell a plain dialog relabeled by the challenge chrome', async () => {
    renderSheet(planState('free'))
    fireEvent.click(
      screen.getByRole('button', { name: TIER_PICKER_COPY.cta.startTrial }),
    )
    await waitFor(() =>
      expect(screen.getByTestId('checkout-panel')).toBeTruthy(),
    )
    fireEvent.click(screen.getByText('mock-challenge'))
    const dialog = screen.getByRole('dialog')
    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(dialog.getAttribute('aria-labelledby')).toBe('chal-h-3ds')
    expect(dialog.getAttribute('aria-describedby')).toBe('chal-d-3ds')
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
      founderSeatNumber: number | null
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
      founderSeatNumber: null,
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

describe('TierPickerSheet — founder post-claim takeover', () => {
  it('successful founder checkout shows the seat reveal instead of closing', async () => {
    mockCreateCheckoutSession.mockResolvedValue({
      clientSecret: 'cs_test_secret',
      subscriptionId: 'sub_test_1',
      founderSeatNumber: 38,
    })
    const onClose = renderSheet(planState('free'))
    fireEvent.click(
      screen.getByRole('button', { name: TIER_PICKER_COPY.cta.claimFounder }),
    )
    await waitFor(() =>
      expect(screen.getByTestId('checkout-panel')).toBeTruthy(),
    )
    fireEvent.click(screen.getByText('mock-success'))

    // Takeover replaces the sheet; nothing closes yet.
    expect(screen.getByTestId('founder-claim-takeover')).toBeTruthy()
    expect(screen.getByTestId('founder-claim-seat-number').textContent).toBe(
      TIER_PICKER_COPY.founderClaim.seatNumber(38),
    )
    expect(
      screen.getByText(TIER_PICKER_COPY.founderClaim.seatTotal(100)),
    ).toBeTruthy()
    expect(onClose).not.toHaveBeenCalled()
    expect(mockRefresh).not.toHaveBeenCalled()

    // The single CTA hands control back: close + refresh.
    fireEvent.click(
      screen.getByRole('button', { name: TIER_PICKER_COPY.founderClaim.cta }),
    )
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(mockRefresh).toHaveBeenCalledTimes(1)
    expect(mockAbandonCheckout).not.toHaveBeenCalled()
  })

  it('non-founder checkout success is unchanged — closes without a takeover', async () => {
    const onClose = renderSheet(planState('free'))
    fireEvent.click(
      screen.getByRole('button', { name: TIER_PICKER_COPY.cta.startTrial }),
    )
    await waitFor(() =>
      expect(screen.getByTestId('checkout-panel')).toBeTruthy(),
    )
    fireEvent.click(screen.getByText('mock-success'))
    expect(screen.queryByTestId('founder-claim-takeover')).toBeNull()
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(mockRefresh).toHaveBeenCalledTimes(1)
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
