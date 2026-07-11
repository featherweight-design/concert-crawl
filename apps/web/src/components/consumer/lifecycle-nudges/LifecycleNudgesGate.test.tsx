// @vitest-environment jsdom

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

let pathname = '/'

beforeEach(() => {
  pathname = '/'
  vi.clearAllMocks()
  window.sessionStorage.clear()
  mockGetToken.mockResolvedValue('test-token')
  mockFetchMe.mockResolvedValue(meResponse())
  mockDismissNudge.mockResolvedValue(undefined)
  mockMarkTrialTakeoverShown.mockResolvedValue(undefined)
})

const mockGetToken = vi.fn()
vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: mockGetToken }),
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

import { LifecycleNudgesGate } from './LifecycleNudgesGate'
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

  it('renders nothing for past-due (PR 4.3 surface) or no flags', async () => {
    mockFetchMe.mockResolvedValue(meResponse({ showPastDueBanner: true }))
    const { container } = render(<LifecycleNudgesGate />)
    await waitFor(() => expect(mockFetchMe).toHaveBeenCalled())
    expect(container.firstChild).toBeNull()
  })
})
