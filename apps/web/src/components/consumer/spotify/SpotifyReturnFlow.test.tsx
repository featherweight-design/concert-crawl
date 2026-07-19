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
const connectMutate = vi.fn((_vars: undefined, opts?: ConnectOptions) => {
  if (connectFails) opts?.onError?.(new Error('boom'))
  else if (connectView) opts?.onSuccess?.(connectView)
})
const patchMutate = vi.fn()

vi.mock('@/lib/queries/use-spotify-connection', () => ({
  useSpotifyConnect: () => ({ mutate: connectMutate, data: connectView }),
  useSpotifyPatch: () => ({ mutate: patchMutate, isPending: false }),
}))

beforeEach(() => {
  vi.clearAllMocks()
  params = new URLSearchParams('section=connections&spotify=return')
  connectView = undefined
  connectFails = false
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
    expect(patchMutate).toHaveBeenCalledWith({ autoWatch: true })
    expect(push).toHaveBeenCalledWith('/events')
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
    expect(patchMutate).toHaveBeenCalledWith({ autoWatch: true })
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
})
