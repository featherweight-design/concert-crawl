// @vitest-environment jsdom

// Behavior contract for the notification-preferences hooks (#1063):
// - queryFn throws when getToken returns null
// - queryFn falls back to DEFAULT_PREFERENCES when the API returns null/undefined
// - mutation success writes the returned prefs into the userId-scoped cache
// - mutation rejects when the auth token is unavailable

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

let token: string | null
let userId: string | null

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({
    getToken: async () => token,
    isSignedIn: true,
    userId,
  }),
}))

const getMock = vi.fn()
const patchMock = vi.fn()

vi.mock('@/lib/api', () => ({
  apiClient: {
    get: (path: string, tok: string) => getMock(path, tok),
    patch: (path: string, tok: string, body: unknown) =>
      patchMock(path, tok, body),
  },
}))

import {
  notificationPreferencesQueryKey,
  useNotificationPreferences,
  usePatchNotificationPreferences,
} from './use-notification-preferences'

const renderWithClient = <THook,>(hook: () => THook) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const result = renderHook(hook, {
    wrapper: ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  })
  return { ...result, queryClient }
}

beforeEach(() => {
  vi.clearAllMocks()
  token = 'token-1'
  userId = 'user_1'
})

describe('useNotificationPreferences', () => {
  it('fetches and returns the server preferences', async () => {
    getMock.mockResolvedValue({
      masterEnabled: true,
      watchUpdatesEnabled: false,
      priceDropsEnabled: true,
    })
    const { result } = renderWithClient(() => useNotificationPreferences())
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual({
      masterEnabled: true,
      watchUpdatesEnabled: false,
      priceDropsEnabled: true,
    })
    expect(getMock).toHaveBeenCalledWith(
      '/v1/me/notification-preferences',
      'token-1',
    )
  })

  it('falls back to defaults when the API returns null', async () => {
    getMock.mockResolvedValue(null)
    const { result } = renderWithClient(() => useNotificationPreferences())
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual({
      masterEnabled: false,
      watchUpdatesEnabled: true,
      priceDropsEnabled: true,
      artistAlertsEnabled: true,
      artistAutoWatch: false,
      weeklyDigestEnabled: true,
      productEmailsEnabled: true,
    })
  })

  it('throws when the auth token is unavailable', async () => {
    token = null
    const { result } = renderWithClient(() => useNotificationPreferences())
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBeInstanceOf(Error)
    expect(getMock).not.toHaveBeenCalled()
  })
})

describe('usePatchNotificationPreferences', () => {
  it('PATCHes the API and writes the response into the userId-scoped cache', async () => {
    const next = {
      masterEnabled: true,
      watchUpdatesEnabled: true,
      priceDropsEnabled: false,
    }
    patchMock.mockResolvedValue(next)
    const { result, queryClient } = renderWithClient(() =>
      usePatchNotificationPreferences(),
    )
    const returned = await result.current.mutateAsync({
      priceDropsEnabled: false,
    })
    expect(returned).toEqual(next)
    expect(patchMock).toHaveBeenCalledWith(
      '/v1/me/notification-preferences',
      'token-1',
      { priceDropsEnabled: false },
    )
    expect(
      queryClient.getQueryData(notificationPreferencesQueryKey('user_1')),
    ).toEqual(next)
  })

  it('falls back to defaults when the PATCH response is null', async () => {
    patchMock.mockResolvedValue(null)
    const { result } = renderWithClient(() => usePatchNotificationPreferences())
    const returned = await result.current.mutateAsync({ masterEnabled: false })
    expect(returned).toEqual({
      masterEnabled: false,
      watchUpdatesEnabled: true,
      priceDropsEnabled: true,
      artistAlertsEnabled: true,
      artistAutoWatch: false,
      weeklyDigestEnabled: true,
      productEmailsEnabled: true,
    })
  })

  it('rejects when the auth token is unavailable', async () => {
    token = null
    const { result } = renderWithClient(() => usePatchNotificationPreferences())
    await expect(
      result.current.mutateAsync({ masterEnabled: true }),
    ).rejects.toThrow(/Not authenticated/)
    expect(patchMock).not.toHaveBeenCalled()
  })

  it('scopes the cache write by userId — a sign-in switch does not leak state', () => {
    // Two different query keys for two different users. Assert the tuple
    // shape directly rather than relying on setQueryData behavior.
    expect(notificationPreferencesQueryKey('user_1')).toEqual([
      'notification-preferences',
      'user_1',
    ])
    expect(notificationPreferencesQueryKey('user_2')).toEqual([
      'notification-preferences',
      'user_2',
    ])
    expect(notificationPreferencesQueryKey(null)).toEqual([
      'notification-preferences',
      null,
    ])
  })
})
