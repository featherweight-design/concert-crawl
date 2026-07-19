// @vitest-environment jsdom

// Behavior contract for the push toggle mutation (#763 PR 9):
// - never rejects — every failure resolves to { ok: false }
// - toggle-off PATCHes the server preference BEFORE local teardown, so a
//   failed unsubscribe can't strand the opt-out
// - a refused permission prompt resolves as 'permission-denied' without
//   touching the server preference

import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { SpotifyConnectionView } from '@concert-crawl/types'

let token: string | null

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({
    getToken: async () => token,
    userId: 'user_1',
  }),
}))

type SubscribeResult =
  | { status: 'subscribed'; id: string }
  | { status: 'permission-denied' | 'unsupported' | 'error' }
type UnsubscribeResult = { status: 'unsubscribed' | 'unsupported' | 'error' }

let subscribeMock: ReturnType<
  typeof vi.fn<(token: string) => Promise<SubscribeResult>>
>
let unsubscribeMock: ReturnType<
  typeof vi.fn<(token: string, id?: string) => Promise<UnsubscribeResult>>
>

vi.mock('@/lib/push/client', () => ({
  getPushDeviceState: async () => ({
    support: 'supported',
    permission: 'granted',
    subscribed: false,
  }),
  subscribeToPush: (token: string) => subscribeMock(token),
  unsubscribeFromPush: (token: string, id?: string) =>
    unsubscribeMock(token, id),
}))

let patchMock: ReturnType<
  typeof vi.fn<
    (
      token: string,
      body: { pushEnabled: boolean },
    ) => Promise<SpotifyConnectionView>
  >
>

vi.mock('@/lib/spotify', () => ({
  patchSpotifyConnection: (token: string, body: { pushEnabled: boolean }) =>
    patchMock(token, body),
}))

import { usePushToggle } from './use-push-toggle'

const VIEW: SpotifyConnectionView = {
  status: 'connected',
  displayName: 'maya.k',
  artistCount: 34,
  lastSyncedAt: null,
  autoWatch: false,
  digestEnabled: true,
  pushEnabled: false,
  denverArtistCount: 9,
  denverShowCount: 12,
  matchedArtists: [],
}

const renderToggle = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return renderHook(() => usePushToggle(), {
    wrapper: ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  token = 'token-1'
  subscribeMock = vi
    .fn()
    .mockResolvedValue({ status: 'subscribed', id: 'sub-row-1' })
  unsubscribeMock = vi.fn().mockResolvedValue({ status: 'unsubscribed' })
  patchMock = vi.fn().mockResolvedValue(VIEW)
})

describe('usePushToggle', () => {
  it('toggling on subscribes then patches the preference', async () => {
    const { result } = renderToggle()
    const outcome = await result.current.mutateAsync(true)
    expect(outcome).toEqual({ ok: true, view: VIEW })
    expect(subscribeMock).toHaveBeenCalledWith('token-1')
    expect(patchMock).toHaveBeenCalledWith('token-1', { pushEnabled: true })
  })

  it('resolves permission-denied without patching when the prompt is refused', async () => {
    subscribeMock.mockResolvedValue({ status: 'permission-denied' })
    const { result } = renderToggle()
    const outcome = await result.current.mutateAsync(true)
    expect(outcome).toEqual({ ok: false, reason: 'permission-denied' })
    expect(patchMock).not.toHaveBeenCalled()
  })

  it('toggling off patches the preference before local teardown', async () => {
    const order: string[] = []
    patchMock.mockImplementation(async () => {
      order.push('patch')
      return VIEW
    })
    unsubscribeMock.mockImplementation(async () => {
      order.push('unsubscribe')
      return { status: 'unsubscribed' }
    })
    const { result } = renderToggle()
    const outcome = await result.current.mutateAsync(false)
    expect(outcome).toEqual({ ok: true, view: VIEW })
    expect(order).toEqual(['patch', 'unsubscribe'])
    expect(patchMock).toHaveBeenCalledWith('token-1', { pushEnabled: false })
  })

  it('still honors the opt-out when local unsubscribe fails', async () => {
    unsubscribeMock.mockResolvedValue({ status: 'error' })
    const { result } = renderToggle()
    const outcome = await result.current.mutateAsync(false)
    expect(outcome).toEqual({ ok: true, view: VIEW })
    expect(patchMock).toHaveBeenCalledWith('token-1', { pushEnabled: false })
  })

  it('resolves { ok: false } and rolls back the subscription when the enable PATCH throws', async () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined)
    patchMock.mockRejectedValue(new Error('network down'))
    const { result } = renderToggle()
    const outcome = await result.current.mutateAsync(true)
    expect(outcome).toEqual({ ok: false, reason: 'error' })
    expect(unsubscribeMock).toHaveBeenCalledWith('token-1', 'sub-row-1')
    await waitFor(() => expect(result.current.error).toBeNull())
    consoleError.mockRestore()
  })

  it('resolves { ok: false } when unauthenticated', async () => {
    token = null
    const { result } = renderToggle()
    const outcome = await result.current.mutateAsync(true)
    expect(outcome).toEqual({ ok: false, reason: 'error' })
    expect(subscribeMock).not.toHaveBeenCalled()
    expect(patchMock).not.toHaveBeenCalled()
  })
})
