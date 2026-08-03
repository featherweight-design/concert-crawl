// @vitest-environment jsdom

// Behavior contract for the attending toggle (#70):
// - going: true → PUT, going: false → DELETE
// - the optimistic patch touches only `attendingAt`, never watch membership,
//   because Watching and Attending are independent relationships
// - a failed mutation restores the exact pre-mutation cache
// - a 403 exposes `code: 'entitlement_required'` so the caller can route to the
//   paywall instead of showing a generic error

import type { ReactNode } from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { WatchingShow } from '@concert-crawl/types'

const TEST_USER_ID = 'user_1'

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: async () => 'tok', userId: TEST_USER_ID }),
}))

const putMock = vi.fn()
const deleteMock = vi.fn()

vi.mock('@/lib/api', () => ({
  apiClient: {
    put: (path: string, token: string) => putMock(path, token),
    delete: (path: string, token: string) => deleteMock(path, token),
  },
}))

const { useAttendingToggle } = await import('./use-attending-toggle')
const { watchingQueryKey } = await import('./use-watching')

const show = (over: Partial<WatchingShow> = {}): WatchingShow => ({
  userEventId: 'ue1',
  eventId: 'ev1',
  artist: 'Khruangbin',
  venueName: 'Ogden',
  venueSlug: 'ogden',
  date: '2026-06-01',
  showTime: null,
  ticketUrl: null,
  ticketLinks: null,
  savedAt: '2026-05-01T00:00:00.000Z',
  savedPrice: null,
  currentPrice: null,
  sourceKind: null,
  eventStatus: 'upcoming',
  watchStatus: 'live',
  updatedAt: '2026-05-01T00:00:00.000Z',
  priceObservedAt: null,
  imageUrl: null,
  attendingAt: null,
  ...over,
})

const setup = (seed?: WatchingShow[]) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  if (seed) client.setQueryData(watchingQueryKey(TEST_USER_ID), seed)
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  const hook = renderHook(() => useAttendingToggle(), { wrapper })
  return { client, hook }
}

describe('useAttendingToggle', () => {
  beforeEach(() => {
    putMock.mockReset().mockResolvedValue({
      going: true,
      attendingAt: '2026-06-02T00:00:00.000Z',
    })
    deleteMock
      .mockReset()
      .mockResolvedValue({ going: false, attendingAt: null })
  })

  it('PUTs when going is true', async () => {
    const { hook } = setup()
    hook.result.current.mutate({ eventId: 'ev1', going: true })
    await waitFor(() => expect(hook.result.current.isSuccess).toBe(true))
    expect(putMock).toHaveBeenCalledWith('/v1/attending/ev1', 'tok')
    expect(deleteMock).not.toHaveBeenCalled()
  })

  it('DELETEs when going is false', async () => {
    const { hook } = setup()
    hook.result.current.mutate({ eventId: 'ev1', going: false })
    await waitFor(() => expect(hook.result.current.isSuccess).toBe(true))
    expect(deleteMock).toHaveBeenCalledWith('/v1/attending/ev1', 'tok')
    expect(putMock).not.toHaveBeenCalled()
  })

  it('optimistically stamps attendingAt without changing watch membership', async () => {
    const { client, hook } = setup([show(), show({ eventId: 'ev2' })])
    hook.result.current.mutate({ eventId: 'ev1', going: true })

    await waitFor(() => {
      const rows = client.getQueryData<WatchingShow[]>(
        watchingQueryKey(TEST_USER_ID),
      )
      expect(
        rows?.find((row) => row.eventId === 'ev1')?.attendingAt,
      ).not.toBeNull()
    })

    const rows = client.getQueryData<WatchingShow[]>(
      watchingQueryKey(TEST_USER_ID),
    )
    // Still two watched rows — attendance is not watch membership.
    expect(rows).toHaveLength(2)
    expect(rows?.find((row) => row.eventId === 'ev2')?.attendingAt).toBeNull()
  })

  it('clears attendingAt optimistically on release', async () => {
    const { client, hook } = setup([
      show({ attendingAt: '2026-06-02T00:00:00.000Z' }),
    ])
    hook.result.current.mutate({ eventId: 'ev1', going: false })

    await waitFor(() => {
      const rows = client.getQueryData<WatchingShow[]>(
        watchingQueryKey(TEST_USER_ID),
      )
      expect(rows?.[0]?.attendingAt).toBeNull()
    })
    expect(
      client.getQueryData<WatchingShow[]>(watchingQueryKey(TEST_USER_ID)),
    ).toHaveLength(1)
  })

  it('rolls back to the pre-mutation snapshot on failure', async () => {
    putMock.mockRejectedValue(new Error('nope'))
    const seed = [show()]
    const { client, hook } = setup(seed)

    hook.result.current.mutate({ eventId: 'ev1', going: true })
    await waitFor(() => expect(hook.result.current.isError).toBe(true))

    expect(
      client.getQueryData<WatchingShow[]>(watchingQueryKey(TEST_USER_ID))?.[0]
        ?.attendingAt,
    ).toBeNull()
  })

  it('leaves a cold watching cache untouched when the mutation fails', async () => {
    putMock.mockRejectedValue(new Error('nope'))
    const { client, hook } = setup()

    hook.result.current.mutate({ eventId: 'ev1', going: true })
    await waitFor(() => expect(hook.result.current.isError).toBe(true))

    // Rollback must not write `undefined` into the cache — a resolved query
    // with no data would break consumers that expect WatchingShow[].
    expect(client.getQueryState(watchingQueryKey(TEST_USER_ID))).toBeUndefined()
  })

  it('surfaces the entitlement code from a 403 so callers can route to the paywall', async () => {
    putMock.mockRejectedValue(
      Object.assign(new Error('Upgrade required'), {
        status: 403,
        code: 'entitlement_required',
      }),
    )
    const { hook } = setup()

    hook.result.current.mutate({ eventId: 'ev1', going: true })
    await waitFor(() => expect(hook.result.current.isError).toBe(true))

    const err = hook.result.current.error
    expect(err).toMatchObject({ status: 403, code: 'entitlement_required' })
  })
})
