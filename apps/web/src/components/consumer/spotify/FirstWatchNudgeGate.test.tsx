// @vitest-environment jsdom

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

let pathname: string

vi.mock('next/navigation', () => ({
  usePathname: () => pathname,
}))

const getToken = vi.fn()
let signedIn: boolean

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken, isSignedIn: signedIn }),
}))

// Minimal shape of the mutation-cache 'updated' notification the gate
// listens for.
interface CacheEvent {
  type: string
  mutation: { options: { mutationKey?: readonly unknown[] } }
  action: { type: string; data?: unknown }
}

type CacheListener = (event: CacheEvent) => void
let cacheListeners: CacheListener[]
const emit = (event: CacheEvent) => {
  for (const listener of cacheListeners) listener(event)
}

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({
    getMutationCache: () => ({
      subscribe: (listener: CacheListener) => {
        cacheListeners.push(listener)
        return () => {
          cacheListeners = cacheListeners.filter((fn) => fn !== listener)
        }
      },
    }),
  }),
}))

let eligible: boolean
const fetchEligibility = vi.fn(async (_token: string) => ({ eligible }))
const markSeen = vi.fn(async (_token: string) => undefined)

vi.mock('@/lib/spotify', () => ({
  fetchSpotifyNudgeEligibility: (token: string) => fetchEligibility(token),
  markSpotifyNudgeSeen: (token: string) => markSeen(token),
}))

vi.mock('./OAuthHandoffSheet', () => ({
  OAuthHandoffSheet: ({ open }: { open: boolean }) =>
    open ? <div data-testid="handoff-sheet" /> : null,
}))

beforeEach(() => {
  vi.clearAllMocks()
  getToken.mockResolvedValue('tok')
  pathname = '/events'
  cacheListeners = []
  eligible = true
  signedIn = true
})

import { FirstWatchNudgeGate } from './FirstWatchNudgeGate'
import { SPOTIFY_COPY } from './definitions/copy'

const COPY = SPOTIFY_COPY.firstWatchNudge

const watchSuccess = (watching: boolean): CacheEvent => ({
  type: 'updated',
  mutation: { options: { mutationKey: ['watch-toggle'] } },
  action: { type: 'success', data: { watching, savedPrice: null } },
})

describe('FirstWatchNudgeGate', () => {
  it('shows the nudge and marks it seen on the first successful watch', async () => {
    render(<FirstWatchNudgeGate />)
    emit(watchSuccess(true))
    await waitFor(() =>
      expect(screen.getByTestId('first-watch-nudge')).toBeTruthy(),
    )
    expect(fetchEligibility).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(markSeen).toHaveBeenCalledTimes(1))
  })

  it('ignores unwatches, other mutations and non-success updates', async () => {
    render(<FirstWatchNudgeGate />)
    emit(watchSuccess(false))
    emit({
      type: 'updated',
      mutation: { options: { mutationKey: ['something-else'] } },
      action: { type: 'success', data: { watching: true, savedPrice: null } },
    })
    emit({
      type: 'updated',
      mutation: { options: { mutationKey: ['watch-toggle'] } },
      action: { type: 'error' },
    })
    await Promise.resolve()
    expect(fetchEligibility).not.toHaveBeenCalled()
    expect(screen.queryByTestId('first-watch-nudge')).toBeNull()
  })

  it('retries on a later watch when the auth token was not ready', async () => {
    getToken.mockResolvedValueOnce(null)
    render(<FirstWatchNudgeGate />)
    emit(watchSuccess(true))
    await waitFor(() => expect(getToken).toHaveBeenCalledTimes(1))
    expect(fetchEligibility).not.toHaveBeenCalled()
    emit(watchSuccess(true))
    await waitFor(() => expect(fetchEligibility).toHaveBeenCalledTimes(1))
    await waitFor(() =>
      expect(screen.getByTestId('first-watch-nudge')).toBeTruthy(),
    )
  })

  it('retries on a later watch when the eligibility fetch fails', async () => {
    fetchEligibility.mockRejectedValueOnce(new Error('network down'))
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined)
    render(<FirstWatchNudgeGate />)
    emit(watchSuccess(true))
    await waitFor(() => expect(fetchEligibility).toHaveBeenCalledTimes(1))
    expect(screen.queryByTestId('first-watch-nudge')).toBeNull()
    emit(watchSuccess(true))
    await waitFor(() => expect(fetchEligibility).toHaveBeenCalledTimes(2))
    await waitFor(() =>
      expect(screen.getByTestId('first-watch-nudge')).toBeTruthy(),
    )
    consoleError.mockRestore()
  })

  it('does not re-trigger when only the seen marker fails after display', async () => {
    markSeen.mockRejectedValueOnce(new Error('network down'))
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined)
    render(<FirstWatchNudgeGate />)
    emit(watchSuccess(true))
    await waitFor(() =>
      expect(screen.getByTestId('first-watch-nudge')).toBeTruthy(),
    )
    await waitFor(() => expect(consoleError).toHaveBeenCalled())
    emit(watchSuccess(true))
    await Promise.resolve()
    expect(fetchEligibility).toHaveBeenCalledTimes(1)
    consoleError.mockRestore()
  })

  it('checks eligibility only once even across multiple watches', async () => {
    render(<FirstWatchNudgeGate />)
    emit(watchSuccess(true))
    emit(watchSuccess(true))
    await waitFor(() => expect(fetchEligibility).toHaveBeenCalledTimes(1))
  })

  it('stays hidden and unmarked when the server says ineligible', async () => {
    eligible = false
    render(<FirstWatchNudgeGate />)
    emit(watchSuccess(true))
    await waitFor(() => expect(fetchEligibility).toHaveBeenCalledTimes(1))
    expect(screen.queryByTestId('first-watch-nudge')).toBeNull()
    expect(markSeen).not.toHaveBeenCalled()
  })

  it('dismisses without opening the handoff', async () => {
    render(<FirstWatchNudgeGate />)
    emit(watchSuccess(true))
    await waitFor(() =>
      expect(screen.getByTestId('first-watch-nudge')).toBeTruthy(),
    )
    fireEvent.click(screen.getByRole('button', { name: COPY.dismissAria }))
    expect(screen.queryByTestId('first-watch-nudge')).toBeNull()
    expect(screen.queryByTestId('handoff-sheet')).toBeNull()
  })

  it('opens the handoff sheet from Connect Spotify', async () => {
    render(<FirstWatchNudgeGate />)
    emit(watchSuccess(true))
    await waitFor(() =>
      expect(screen.getByTestId('first-watch-nudge')).toBeTruthy(),
    )
    fireEvent.click(screen.getByRole('button', { name: COPY.primaryCta }))
    expect(screen.queryByTestId('first-watch-nudge')).toBeNull()
    expect(screen.getByTestId('handoff-sheet')).toBeTruthy()
  })

  // #794: /events is public now, so this gate mounts for anonymous visitors
  // and must not subscribe or hit the authed eligibility endpoint.
  it('never subscribes to the mutation cache while signed out', async () => {
    signedIn = false
    render(<FirstWatchNudgeGate />)
    expect(cacheListeners).toHaveLength(0)
    emit(watchSuccess(true))
    await Promise.resolve()
    expect(fetchEligibility).not.toHaveBeenCalled()
    expect(getToken).not.toHaveBeenCalled()
  })

  it('renders nothing on admin routes', () => {
    pathname = '/admin/venues'
    const { container } = render(<FirstWatchNudgeGate />)
    expect(container.innerHTML).toBe('')
  })

  it('ignores watch toggles fired while on an admin route', async () => {
    pathname = '/admin/venues'
    render(<FirstWatchNudgeGate />)
    emit(watchSuccess(true))
    await Promise.resolve()
    expect(fetchEligibility).not.toHaveBeenCalled()
  })
})
