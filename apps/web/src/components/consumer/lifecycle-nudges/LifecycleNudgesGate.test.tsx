// @vitest-environment jsdom

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

let pathname = '/'
let isSignedIn = true

beforeEach(() => {
  pathname = '/'
  isSignedIn = true
  vi.clearAllMocks()
  window.sessionStorage.clear()
  mockGetToken.mockResolvedValue('test-token')
  mockFetchMe.mockResolvedValue(meResponse())
  mockDismissNudge.mockResolvedValue(undefined)
  mockMarkTrialTakeoverShown.mockResolvedValue(undefined)
  mockNavigateToPortalSession.mockResolvedValue(undefined)
})

const mockGetToken = vi.fn()
vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: mockGetToken, isSignedIn }),
}))

const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn() }),
  usePathname: () => pathname,
}))

const mockFetchMe = vi.fn()
vi.mock('@/lib/users', () => ({
  fetchMe: (token: string, sessionStartedAt?: string) =>
    mockFetchMe(token, sessionStartedAt),
}))

const mockDismissNudge = vi.fn()
const mockMarkTrialTakeoverShown = vi.fn()
vi.mock('@/lib/billing', () => ({
  dismissNudge: (token: string, nudge: string) =>
    mockDismissNudge(token, nudge),
  markTrialTakeoverShown: (token: string) => mockMarkTrialTakeoverShown(token),
}))

const mockNavigateToPortalSession = vi.fn()
vi.mock('@/lib/portal-navigation', () => ({
  navigateToPortalSession: (getToken: () => Promise<string | null>) =>
    mockNavigateToPortalSession(getToken),
}))

// The presentational surfaces have their own suites — the gate tests only
// care about which one mounts and what its callbacks do.
vi.mock('./TrialEndedTakeover', () => ({
  TrialEndedTakeover: ({
    onDismiss,
    onSelectTier,
  }: {
    onDismiss: () => void
    onSelectTier: (tierKey: string) => void
  }) => (
    <div data-testid="mock-takeover">
      <button type="button" onClick={onDismiss}>
        mock-takeover-dismiss
      </button>
      <button type="button" onClick={() => onSelectTier('premium')}>
        mock-takeover-select
      </button>
    </div>
  ),
}))

vi.mock('./DayThirteenBanner', () => ({
  DayThirteenBanner: ({
    variant,
    onDismiss,
  }: {
    variant: string
    onDismiss: () => void
  }) => (
    <div data-testid="mock-banner" data-variant={variant}>
      <button type="button" onClick={onDismiss}>
        mock-banner-dismiss
      </button>
    </div>
  ),
}))

vi.mock('./PastDueBanner', () => ({
  PastDueBanner: ({
    variant,
    onDismiss,
    onUpdateCard,
    updateCardPending,
  }: {
    variant: string
    onDismiss: () => void
    onUpdateCard: () => void
    updateCardPending?: boolean
  }) => (
    <div
      data-testid="mock-past-due-banner"
      data-variant={variant}
      data-pending={updateCardPending ? 'true' : 'false'}
    >
      <button type="button" onClick={onDismiss}>
        mock-past-due-dismiss
      </button>
      <button type="button" onClick={onUpdateCard}>
        mock-past-due-update-card
      </button>
    </div>
  ),
}))

import { LifecycleNudgesGate } from './LifecycleNudgesGate'
import { beginPaymentFlow } from '@/components/consumer/tier-picker/lib/payment-flow-signal'
import { SESSION_STARTED_AT_KEY } from './definitions/constants'
import { PLAN_SETTINGS_ROUTE } from '@/components/consumer/tier-picker/definitions/constants'

const meResponse = (
  overrides: {
    showTrialEndedTakeover?: boolean
    showDayThirteenBanner?: boolean
    showPastDueBanner?: boolean
  } = {},
) => ({
  showTrialEndedTakeover: false,
  showDayThirteenBanner: false,
  showPastDueBanner: false,
  ...overrides,
})

describe('LifecycleNudgesGate', () => {
  it('renders nothing and skips the fetch when signed out', async () => {
    mockGetToken.mockResolvedValue(null)
    const { container } = render(<LifecycleNudgesGate />)
    await waitFor(() => expect(mockGetToken).toHaveBeenCalled())
    expect(mockFetchMe).not.toHaveBeenCalled()
    expect(container.firstChild).toBeNull()
  })

  it('does not fetch (or lock the ref) while signed out', () => {
    isSignedIn = false
    const { container } = render(<LifecycleNudgesGate />)
    expect(mockGetToken).not.toHaveBeenCalled()
    expect(mockFetchMe).not.toHaveBeenCalled()
    expect(container.firstChild).toBeNull()
  })

  it('fetches once sign-in resolves after a signed-out mount', async () => {
    isSignedIn = false
    const { rerender } = render(<LifecycleNudgesGate />)
    expect(mockFetchMe).not.toHaveBeenCalled()
    isSignedIn = true
    rerender(<LifecycleNudgesGate />)
    await waitFor(() => expect(mockFetchMe).toHaveBeenCalledTimes(1))
  })

  it('renders nothing on admin routes', () => {
    pathname = '/admin/venues'
    const { container } = render(<LifecycleNudgesGate />)
    expect(mockFetchMe).not.toHaveBeenCalled()
    expect(container.firstChild).toBeNull()
  })

  it('sets the session marker once and passes it to fetchMe', async () => {
    window.sessionStorage.setItem(
      SESSION_STARTED_AT_KEY,
      '2026-07-11T10:00:00.000Z',
    )
    render(<LifecycleNudgesGate />)
    await waitFor(() =>
      expect(mockFetchMe).toHaveBeenCalledWith(
        'test-token',
        '2026-07-11T10:00:00.000Z',
      ),
    )
    expect(window.sessionStorage.getItem(SESSION_STARTED_AT_KEY)).toBe(
      '2026-07-11T10:00:00.000Z',
    )
  })

  it('creates the session marker when absent', async () => {
    render(<LifecycleNudgesGate />)
    await waitFor(() => expect(mockFetchMe).toHaveBeenCalled())
    const marker = window.sessionStorage.getItem(SESSION_STARTED_AT_KEY)
    expect(marker).toBeTruthy()
    expect(mockFetchMe).toHaveBeenCalledWith('test-token', marker)
  })

  it('shows the takeover when flagged and marks it shown exactly once', async () => {
    mockFetchMe.mockResolvedValue(meResponse({ showTrialEndedTakeover: true }))
    const { rerender } = render(<LifecycleNudgesGate />)
    await waitFor(() =>
      expect(screen.getByTestId('mock-takeover')).toBeTruthy(),
    )
    await waitFor(() =>
      expect(mockMarkTrialTakeoverShown).toHaveBeenCalledWith('test-token'),
    )
    rerender(<LifecycleNudgesGate />)
    await waitFor(() =>
      expect(mockMarkTrialTakeoverShown).toHaveBeenCalledTimes(1),
    )
  })

  it('takeover wins over the banner when both flags are set', async () => {
    mockFetchMe.mockResolvedValue(
      meResponse({ showTrialEndedTakeover: true, showDayThirteenBanner: true }),
    )
    render(<LifecycleNudgesGate />)
    await waitFor(() =>
      expect(screen.getByTestId('mock-takeover')).toBeTruthy(),
    )
    expect(screen.queryByTestId('mock-banner')).toBeNull()
  })

  it('takeover dismiss hides it without posting', async () => {
    mockFetchMe.mockResolvedValue(meResponse({ showTrialEndedTakeover: true }))
    render(<LifecycleNudgesGate />)
    await waitFor(() =>
      expect(screen.getByTestId('mock-takeover')).toBeTruthy(),
    )
    fireEvent.click(screen.getByText('mock-takeover-dismiss'))
    expect(screen.queryByTestId('mock-takeover')).toBeNull()
    expect(mockDismissNudge).not.toHaveBeenCalled()
  })

  it('takeover tier selection routes to Settings · Plan and hides', async () => {
    mockFetchMe.mockResolvedValue(meResponse({ showTrialEndedTakeover: true }))
    render(<LifecycleNudgesGate />)
    await waitFor(() =>
      expect(screen.getByTestId('mock-takeover')).toBeTruthy(),
    )
    fireEvent.click(screen.getByText('mock-takeover-select'))
    expect(mockPush).toHaveBeenCalledWith(PLAN_SETTINGS_ROUTE)
    expect(screen.queryByTestId('mock-takeover')).toBeNull()
  })

  it('shows the pinned banner when flagged', async () => {
    mockFetchMe.mockResolvedValue(meResponse({ showDayThirteenBanner: true }))
    render(<LifecycleNudgesGate />)
    await waitFor(() => expect(screen.getByTestId('mock-banner')).toBeTruthy())
    expect(screen.getByTestId('mock-banner').dataset.variant).toBe('pinned')
    expect(mockMarkTrialTakeoverShown).not.toHaveBeenCalled()
  })

  it('banner dismiss hides it and posts the day13 dismissal', async () => {
    mockFetchMe.mockResolvedValue(meResponse({ showDayThirteenBanner: true }))
    render(<LifecycleNudgesGate />)
    await waitFor(() => expect(screen.getByTestId('mock-banner')).toBeTruthy())
    fireEvent.click(screen.getByText('mock-banner-dismiss'))
    expect(screen.queryByTestId('mock-banner')).toBeNull()
    await waitFor(() =>
      expect(mockDismissNudge).toHaveBeenCalledWith('test-token', 'day13'),
    )
  })

  it('renders nothing when no flags are set', async () => {
    const { container } = render(<LifecycleNudgesGate />)
    await waitFor(() => expect(mockFetchMe).toHaveBeenCalled())
    expect(container.firstChild).toBeNull()
  })

  it('shows the pinned past-due banner when flagged', async () => {
    mockFetchMe.mockResolvedValue(meResponse({ showPastDueBanner: true }))
    render(<LifecycleNudgesGate />)
    await waitFor(() =>
      expect(screen.getByTestId('mock-past-due-banner')).toBeTruthy(),
    )
    expect(screen.getByTestId('mock-past-due-banner').dataset.variant).toBe(
      'pinned',
    )
    expect(mockMarkTrialTakeoverShown).not.toHaveBeenCalled()
  })

  it('takeover wins over the past-due banner when both flags are set', async () => {
    mockFetchMe.mockResolvedValue(
      meResponse({ showTrialEndedTakeover: true, showPastDueBanner: true }),
    )
    render(<LifecycleNudgesGate />)
    await waitFor(() =>
      expect(screen.getByTestId('mock-takeover')).toBeTruthy(),
    )
    expect(screen.queryByTestId('mock-past-due-banner')).toBeNull()
  })

  it('past-due dismiss hides it immediately and posts the dismissal', async () => {
    mockFetchMe.mockResolvedValue(meResponse({ showPastDueBanner: true }))
    render(<LifecycleNudgesGate />)
    await waitFor(() =>
      expect(screen.getByTestId('mock-past-due-banner')).toBeTruthy(),
    )
    fireEvent.click(screen.getByText('mock-past-due-dismiss'))
    expect(screen.queryByTestId('mock-past-due-banner')).toBeNull()
    await waitFor(() =>
      expect(mockDismissNudge).toHaveBeenCalledWith('test-token', 'past-due'),
    )
  })

  it('update card navigates to the billing portal', async () => {
    mockFetchMe.mockResolvedValue(meResponse({ showPastDueBanner: true }))
    render(<LifecycleNudgesGate />)
    await waitFor(() =>
      expect(screen.getByTestId('mock-past-due-banner')).toBeTruthy(),
    )
    fireEvent.click(screen.getByText('mock-past-due-update-card'))
    await waitFor(() =>
      expect(mockNavigateToPortalSession).toHaveBeenCalledTimes(1),
    )
    expect(screen.getByTestId('mock-past-due-banner').dataset.pending).toBe(
      'true',
    )
  })

  it('update card re-enables the CTA when portal navigation fails', async () => {
    mockNavigateToPortalSession.mockRejectedValue(new Error('portal down'))
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined)
    mockFetchMe.mockResolvedValue(meResponse({ showPastDueBanner: true }))
    render(<LifecycleNudgesGate />)
    await waitFor(() =>
      expect(screen.getByTestId('mock-past-due-banner')).toBeTruthy(),
    )
    fireEvent.click(screen.getByText('mock-past-due-update-card'))
    await waitFor(() =>
      expect(screen.getByTestId('mock-past-due-banner').dataset.pending).toBe(
        'false',
      ),
    )
    expect(consoleError).toHaveBeenCalled()
    consoleError.mockRestore()
  })

  it('suppresses the past-due banner while a payment flow is active and re-shows it on release', async () => {
    mockFetchMe.mockResolvedValue(meResponse({ showPastDueBanner: true }))
    render(<LifecycleNudgesGate />)
    await waitFor(() =>
      expect(screen.getByTestId('mock-past-due-banner')).toBeTruthy(),
    )
    let releasePaymentFlow: () => void = () => undefined
    act(() => {
      releasePaymentFlow = beginPaymentFlow()
    })
    expect(screen.queryByTestId('mock-past-due-banner')).toBeNull()
    act(() => {
      releasePaymentFlow()
    })
    expect(screen.getByTestId('mock-past-due-banner')).toBeTruthy()
  })
})
