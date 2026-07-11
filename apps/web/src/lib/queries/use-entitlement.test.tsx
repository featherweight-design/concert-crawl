// @vitest-environment jsdom

import React from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { PlanState, UserPlan } from '@concert-crawl/types'

const mockGetToken = vi.fn()
let signedIn: boolean | undefined = true
let currentUserId: string | null = 'user_test'
vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({
    getToken: mockGetToken,
    isSignedIn: signedIn,
    userId: currentUserId,
  }),
}))

const mockFetchMe = vi.fn()
vi.mock('@/lib/users', () => ({
  fetchMe: (token: string) => mockFetchMe(token),
}))

import { useEntitlement } from './use-entitlement'
import { usePlanState } from './use-plan-state'

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

const withProvider = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return wrapper
}

const setProfilePlan = (state: PlanState) => {
  mockFetchMe.mockResolvedValue({ planState: state })
}

describe('useEntitlement', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    signedIn = true
    currentUserId = 'user_test'
    mockGetToken.mockResolvedValue('test-token')
  })

  it('locks concert-history for a free user with paywall-on-tap routing', async () => {
    setProfilePlan(planState('free'))
    const { result } = renderHook(() => useEntitlement('concert-history'), {
      wrapper: withProvider(),
    })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.active).toBe(false)
    expect(result.current.surface).toBe('paywall-on-tap')
  })

  it('locks calendar-export for a supporter (paid means premium-and-up)', async () => {
    setProfilePlan(planState('supporter', { status: 'active' }))
    const { result } = renderHook(() => useEntitlement('calendar-export'), {
      wrapper: withProvider(),
    })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.active).toBe(false)
    expect(result.current.surface).toBe('paywall-on-tap')
  })

  it('activates concert-history for premium', async () => {
    setProfilePlan(planState('premium', { status: 'active' }))
    const { result } = renderHook(() => useEntitlement('concert-history'), {
      wrapper: withProvider(),
    })
    await waitFor(() => expect(result.current.active).toBe(true))
    expect(result.current.surface).toBe('visible-active')
  })

  it('roleComped short-circuits to active even on a free plan', async () => {
    setProfilePlan(planState('free', { roleComped: true }))
    const { result } = renderHook(() => useEntitlement('calendar-export'), {
      wrapper: withProvider(),
    })
    await waitFor(() => expect(result.current.active).toBe(true))
    expect(result.current.surface).toBe('visible-active')
  })

  it('watching is active for a free user (locked decision)', async () => {
    setProfilePlan(planState('free'))
    const { result } = renderHook(() => useEntitlement('watching'), {
      wrapper: withProvider(),
    })
    await waitFor(() => expect(result.current.active).toBe(true))
  })

  it('routes logged-out users to the tier picker without fetching', async () => {
    signedIn = false
    const { result } = renderHook(() => useEntitlement('concert-history'), {
      wrapper: withProvider(),
    })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.active).toBe(false)
    expect(result.current.surface).toBe('tier-picker-on-tap')
    expect(mockFetchMe).not.toHaveBeenCalled()
  })

  it('reports loading (locked, no surface) until plan state resolves', () => {
    signedIn = true
    mockFetchMe.mockReturnValue(new Promise(() => undefined))
    const { result } = renderHook(() => useEntitlement('concert-history'), {
      wrapper: withProvider(),
    })
    expect(result.current.isLoading).toBe(true)
    expect(result.current.active).toBe(false)
    expect(result.current.surface).toBeNull()
  })

  it('fails closed with the logged-out surface when signed in but no token resolves', async () => {
    signedIn = true
    mockGetToken.mockResolvedValue(null)
    const { result } = renderHook(() => useEntitlement('concert-history'), {
      wrapper: withProvider(),
    })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.active).toBe(false)
    expect(result.current.surface).toBe('tier-picker-on-tap')
    expect(mockFetchMe).not.toHaveBeenCalled()
  })
})

describe('usePlanState', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    signedIn = true
    currentUserId = 'user_test'
    mockGetToken.mockResolvedValue('test-token')
  })

  it('fetches planState from /v1/users/me', async () => {
    setProfilePlan(planState('founder', { status: 'active' }))
    const { result } = renderHook(() => usePlanState(), {
      wrapper: withProvider(),
    })
    await waitFor(() => expect(result.current.data?.plan).toBe('founder'))
    expect(mockFetchMe).toHaveBeenCalledWith('test-token')
  })

  it('retries after a transient token gap instead of caching a locked state', async () => {
    // A missing token must reject (so React Query retries), never resolve —
    // a successful null would be cached as fresh for staleTime and pin
    // entitlements locked for minutes after the token becomes available.
    mockGetToken.mockResolvedValueOnce(null).mockResolvedValue('test-token')
    setProfilePlan(planState('premium', { status: 'active' }))
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: 1, retryDelay: 0 } },
    })
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
    const { result } = renderHook(() => usePlanState(), { wrapper })
    await waitFor(() => expect(result.current.data?.plan).toBe('premium'))
    expect(mockGetToken).toHaveBeenCalledTimes(2)
  })

  it('does not serve the previous account plan state after a user switch', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    currentUserId = 'user_a'
    setProfilePlan(planState('premium', { status: 'active' }))
    const { result, rerender } = renderHook(() => usePlanState(), { wrapper })
    await waitFor(() => expect(result.current.data?.plan).toBe('premium'))

    // Same long-lived QueryClient, different signed-in user: user A's cached
    // plan must not be served under user B's key.
    currentUserId = 'user_b'
    setProfilePlan(planState('free'))
    rerender()
    expect(result.current.data?.plan).not.toBe('premium')
    await waitFor(() => expect(result.current.data?.plan).toBe('free'))
  })
})
