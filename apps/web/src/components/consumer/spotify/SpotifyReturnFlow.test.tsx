// @vitest-environment jsdom

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { SpotifyConnectionView } from '@concert-crawl/types'

const replace = vi.fn()
const push = vi.fn()
let params: URLSearchParams

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, push }),
  useSearchParams: () => params,
}))

interface ConnectOptions {
  onSuccess?: (view: SpotifyConnectionView) => void
  onError?: (error: Error) => void
}

let connectView: SpotifyConnectionView | undefined
let connectFails: boolean
let connectError: Error | undefined
const connectMutate = vi.fn((_vars: undefined, opts?: ConnectOptions) => {
  if (connectFails) opts?.onError?.(connectError ?? new Error('boom'))
  else if (connectView) opts?.onSuccess?.(connectView)
})
interface PatchOptions {
  onSuccess?: () => void
}

let patchFails: boolean
const patchMutate = vi.fn(
  (_vars: { artistAutoWatch: boolean }, opts?: PatchOptions) => {
    if (!patchFails) opts?.onSuccess?.()
  },
)

vi.mock('@/lib/queries/use-spotify-connection', () => ({
  useSpotifyConnect: () => ({ mutate: connectMutate, data: connectView }),
}))

vi.mock('@/lib/queries/use-notification-preferences', () => ({
  usePatchNotificationPreferences: () => ({
    mutate: patchMutate,
    isPending: false,
  }),
}))

beforeEach(() => {
  vi.clearAllMocks()
  params = new URLSearchParams('section=connections&spotify=return')
  connectView = undefined
  connectFails = false
  connectError = undefined
  patchFails = false
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
})

import { SpotifyReturnFlow } from './SpotifyReturnFlow'
import { ApiError } from '@/lib/api'
import { SPOTIFY_COPY } from './definitions/copy'

const VIEW: SpotifyConnectionView = {
  status: 'connected',
  displayName: 'maya.k',
  artistCount: 34,
  lastSyncedAt: new Date().toISOString(),
  autoWatch: false,
  digestEnabled: true,
  pushEnabled: false,
  denverArtistCount: 9,
  denverShowCount: 12,
  matchedArtists: ['Wednesday', 'Geese'],
}

describe('SpotifyReturnFlow', () => {
  it('does nothing without the return param', () => {
    params = new URLSearchParams('section=connections')
    render(<SpotifyReturnFlow />)
    expect(connectMutate).not.toHaveBeenCalled()
    expect(replace).not.toHaveBeenCalled()
  })

  it('fires the connect POST once, cleans the URL and shows success for a Denver match', () => {
    connectView = VIEW
    render(<SpotifyReturnFlow />)
    expect(connectMutate).toHaveBeenCalledTimes(1)
    expect(replace).toHaveBeenCalledWith('/me?section=connections', {
      scroll: false,
    })
    expect(screen.getByText(SPOTIFY_COPY.connectSuccess.title)).toBeTruthy()
  })

  it('continues into the auto-watch sheet; highlight choice writes nothing', () => {
    connectView = VIEW
    render(<SpotifyReturnFlow />)
    fireEvent.click(
      screen.getByRole('button', { name: SPOTIFY_COPY.connectSuccess.cta }),
    )
    expect(screen.getByText(SPOTIFY_COPY.autoWatchSheet.title)).toBeTruthy()
    fireEvent.click(
      screen.getByRole('button', {
        name: SPOTIFY_COPY.autoWatchSheet.ctaHighlight,
      }),
    )
    expect(patchMutate).not.toHaveBeenCalled()
    expect(push).toHaveBeenCalledWith('/events')
  })

  it('patches auto-watch on the explicit auto choice', () => {
    connectView = VIEW
    render(<SpotifyReturnFlow />)
    fireEvent.click(
      screen.getByRole('button', { name: SPOTIFY_COPY.connectSuccess.cta }),
    )
    fireEvent.click(
      screen.getByRole('radio', {
        name: new RegExp(SPOTIFY_COPY.autoWatchSheet.optionAuto.head),
      }),
    )
    fireEvent.click(
      screen.getByRole('button', {
        name: SPOTIFY_COPY.autoWatchSheet.ctaAuto(12),
      }),
    )
    expect(patchMutate).toHaveBeenCalledWith(
      { artistAutoWatch: true },
      expect.anything(),
    )
    expect(push).toHaveBeenCalledWith('/events')
  })

  it('stays on the auto-watch sheet when the auto-watch PATCH fails', () => {
    connectView = VIEW
    patchFails = true
    render(<SpotifyReturnFlow />)
    fireEvent.click(
      screen.getByRole('button', { name: SPOTIFY_COPY.connectSuccess.cta }),
    )
    fireEvent.click(
      screen.getByRole('radio', {
        name: new RegExp(SPOTIFY_COPY.autoWatchSheet.optionAuto.head),
      }),
    )
    fireEvent.click(
      screen.getByRole('button', {
        name: SPOTIFY_COPY.autoWatchSheet.ctaAuto(12),
      }),
    )
    expect(patchMutate).toHaveBeenCalledTimes(1)
    expect(push).not.toHaveBeenCalled()
    expect(screen.getByText(SPOTIFY_COPY.autoWatchSheet.title)).toBeTruthy()
  })

  it('shows the empty Denver match state when no shows matched', () => {
    connectView = { ...VIEW, denverArtistCount: 0, denverShowCount: 0 }
    render(<SpotifyReturnFlow />)
    expect(screen.getByText(SPOTIFY_COPY.emptyDenverMatch.title)).toBeTruthy()
    fireEvent.click(
      screen.getByRole('button', {
        name: SPOTIFY_COPY.emptyDenverMatch.primaryCta,
      }),
    )
    expect(patchMutate).toHaveBeenCalledWith(
      { artistAutoWatch: true },
      expect.anything(),
    )
    expect(push).toHaveBeenCalledWith('/events')
  })

  it('shows the failure state and retries from "Try again"', () => {
    connectFails = true
    render(<SpotifyReturnFlow />)
    expect(screen.getByText(SPOTIFY_COPY.failConnectDown.title)).toBeTruthy()
    fireEvent.click(
      screen.getByRole('button', {
        name: SPOTIFY_COPY.failConnectDown.primaryCta,
      }),
    )
    expect(connectMutate).toHaveBeenCalledTimes(2)
  })

  it('surfaces the tailored "complete the sign-in" copy when the API code is no_external_account', () => {
    // Spotify dev-mode allowlist miss: user tapped Connect, Spotify
    // silently dropped their consent, Clerk got no callback → the API's
    // POST /v1/spotify/connection returns 400 with code
    // 'no_external_account'. The failure modal must swap to the
    // actionable copy variant (not the generic "Spotify's not picking
    // up" body).
    connectFails = true
    connectError = new ApiError(
      400,
      'No Spotify account is linked to this user',
      'no_external_account',
    )
    render(<SpotifyReturnFlow />)
    expect(
      screen.getByText(SPOTIFY_COPY.failConnectDown.noExternalAccountTitle),
    ).toBeTruthy()
    expect(
      screen.getByText(SPOTIFY_COPY.failConnectDown.noExternalAccountBody),
    ).toBeTruthy()
    // Generic body must NOT render alongside the specific variant.
    expect(screen.queryByText(SPOTIFY_COPY.failConnectDown.body)).toBeNull()
  })

  it('falls back to the generic failure copy for non-coded errors', () => {
    connectFails = true
    // Plain Error (no ApiError, no code) → generic branch.
    connectError = new Error('network went sideways')
    render(<SpotifyReturnFlow />)
    expect(screen.getByText(SPOTIFY_COPY.failConnectDown.title)).toBeTruthy()
    expect(screen.getByText(SPOTIFY_COPY.failConnectDown.body)).toBeTruthy()
    expect(
      screen.queryByText(SPOTIFY_COPY.failConnectDown.noExternalAccountTitle),
    ).toBeNull()
  })
})
