// @vitest-environment jsdom

import React from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { PlanState, UserPlan } from '@concert-crawl/types'
import {
  featureFlagDefaults,
  type FeatureFlagView,
} from '@concert-crawl/entitlements'

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

// The flag map is mocked at the hook, not the fetch: useFeatureFlags has its
// own test file covering the network shape. Read lazily so each test can swap
// the result without re-importing the module under test.
let mockFlagsResult: {
  data: FeatureFlagView | undefined
  isPending: boolean
} = { data: featureFlagDefaults(), isPending: false }
vi.mock('./use-feature-flags', () => ({
  useFeatureFlags: () => mockFlagsResult,
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

  it('activates calendar-export for a supporter (a Supporter unlock since 2026-07-29)', async () => {
    setProfilePlan(planState('supporter', { status: 'active' }))
    const { result } = renderHook(() => useEntitlement('calendar-export'), {
      wrapper: withProvider(),
    })
    await waitFor(() => expect(result.current.active).toBe(true))
    expect(result.current.surface).toBe('visible-active')
  })

  it('locks following for a supporter (Premium keeps the active-cost features)', async () => {
    setProfilePlan(planState('supporter', { status: 'active' }))
    const { result } = renderHook(() => useEntitlement('following'), {
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

describe('useEntitlement flag seam', () => {
  const mockSignedIn = ({
    plan,
    roleComped,
  }: {
    plan: UserPlan
    roleComped: boolean
  }) => {
    signedIn = true
    setProfilePlan(planState(plan, { status: 'active', roleComped }))
  }

  const mockSignedOut = () => {
    signedIn = false
  }

  const mockFlags = (overrides: Partial<FeatureFlagView>) => {
    mockFlagsResult = {
      data: { ...featureFlagDefaults(), ...overrides },
      isPending: false,
    }
  }

  const mockFlagsLoading = () => {
    mockFlagsResult = { data: undefined, isPending: true }
  }

  // Settled but dataless: the fetch rejected and React Query holds no map.
  const mockFlagsError = () => {
    mockFlagsResult = { data: undefined, isPending: false }
  }

  beforeEach(() => {
    vi.clearAllMocks()
    signedIn = true
    currentUserId = 'user_test'
    mockGetToken.mockResolvedValue('test-token')
    mockFlags({})
  })

  it('forces hidden for a founder when the flag is off', () => {
    mockSignedIn({ plan: 'founder', roleComped: false })
    mockFlags({ crews: false })
    const { result } = renderHook(() => useEntitlement('crews'), {
      wrapper: withProvider(),
    })
    expect(result.current).toEqual({
      isLoading: false,
      active: false,
      surface: 'hidden',
    })
  })

  it('forces hidden for a comped user when the flag is off', () => {
    mockSignedIn({ plan: 'free', roleComped: true })
    mockFlags({ crews: false })
    const { result } = renderHook(() => useEntitlement('crews'), {
      wrapper: withProvider(),
    })
    expect(result.current.active).toBe(false)
    expect(result.current.surface).toBe('hidden')
  })

  it('forces hidden for a logged-out visitor when the flag is off', () => {
    mockSignedOut()
    mockFlags({ crews: false })
    const { result } = renderHook(() => useEntitlement('crews'), {
      wrapper: withProvider(),
    })
    expect(result.current.surface).toBe('hidden')
  })

  it('leaves the matrix answer alone when the flag is on', async () => {
    mockSignedIn({ plan: 'free', roleComped: false })
    mockFlags({ crews: true })
    const { result } = renderHook(() => useEntitlement('crews'), {
      wrapper: withProvider(),
    })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.surface).toBe('paywall-on-tap')
  })

  it('never grants a feature the matrix denies, flag on', async () => {
    mockSignedIn({ plan: 'free', roleComped: false })
    mockFlags({ crews: true })
    const { result } = renderHook(() => useEntitlement('alerts'), {
      wrapper: withProvider(),
    })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.active).toBe(false)
  })

  it('holds rendering while the flag map is still loading', () => {
    mockSignedIn({ plan: 'premium', roleComped: false })
    mockFlagsLoading()
    const { result } = renderHook(() => useEntitlement('crews'), {
      wrapper: withProvider(),
    })
    expect(result.current).toEqual({
      isLoading: true,
      active: false,
      surface: null,
    })
  })

  it('is unaffected for a feature no flag names', async () => {
    mockSignedIn({ plan: 'premium', roleComped: false })
    mockFlags({ crews: false })
    const { result } = renderHook(() => useEntitlement('watching'), {
      wrapper: withProvider(),
    })
    await waitFor(() => expect(result.current.active).toBe(true))
  })

  // The registry default for `crews` is false, so an outage must not reveal it.
  it('falls back to the registry default when the flag fetch errors', () => {
    mockSignedIn({ plan: 'premium', roleComped: false })
    mockFlagsError()
    const { result } = renderHook(() => useEntitlement('crews'), {
      wrapper: withProvider(),
    })
    expect(result.current.surface).toBe('hidden')
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
