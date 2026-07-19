// @vitest-environment jsdom

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { SpotifyConnectStart } from '@/lib/spotify-connect'

const startSpotifyConnect = vi.fn<() => Promise<SpotifyConnectStart>>()

vi.mock('@/lib/spotify-connect', () => ({
  SPOTIFY_RETURN_PATH: '/me?section=connections&spotify=return',
  startSpotifyConnect: (...args: unknown[]) =>
    startSpotifyConnect(...(args as [])),
}))

vi.mock('@clerk/nextjs', () => ({
  useUser: () => ({ user: { id: 'user_1' } }),
}))

beforeEach(() => {
  vi.clearAllMocks()
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

import { OAuthHandoffSheet } from './OAuthHandoffSheet'
import { SPOTIFY_COPY } from './definitions/copy'

const HANDOFF_COPY = SPOTIFY_COPY.oauthHandoff
const FAIL_COPY = SPOTIFY_COPY.failConnectDown

describe('OAuthHandoffSheet', () => {
  it('renders the honesty rail with the continue and cancel actions', () => {
    render(<OAuthHandoffSheet open onClose={vi.fn()} />)
    expect(screen.getByText(HANDOFF_COPY.title)).toBeTruthy()
    for (const line of SPOTIFY_COPY.honestyRail) {
      expect(screen.getByText(line.head)).toBeTruthy()
      expect(screen.getByText(line.sub)).toBeTruthy()
    }
    expect(
      screen.getByRole('button', { name: HANDOFF_COPY.continueCta }),
    ).toBeTruthy()
    expect(
      screen.getByRole('button', { name: HANDOFF_COPY.cancelCta }),
    ).toBeTruthy()
  })

  it('renders nothing when closed', () => {
    render(<OAuthHandoffSheet open={false} onClose={vi.fn()} />)
    expect(screen.queryByText(HANDOFF_COPY.title)).toBeNull()
  })

  it('calls onClose from cancel without starting the handoff', () => {
    const onClose = vi.fn()
    render(<OAuthHandoffSheet open onClose={onClose} />)
    fireEvent.click(
      screen.getByRole('button', { name: HANDOFF_COPY.cancelCta }),
    )
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(startSpotifyConnect).not.toHaveBeenCalled()
  })

  it('swaps to the "Spotify is not picking up" state when the handoff fails', async () => {
    startSpotifyConnect.mockResolvedValue({ status: 'error' })
    render(<OAuthHandoffSheet open onClose={vi.fn()} />)
    fireEvent.click(
      screen.getByRole('button', { name: HANDOFF_COPY.continueCta }),
    )
    await waitFor(() => {
      expect(screen.getByText(FAIL_COPY.title)).toBeTruthy()
    })
    // "Try again" returns to the rail — nothing was linked.
    fireEvent.click(screen.getByRole('button', { name: FAIL_COPY.primaryCta }))
    expect(screen.getByText(HANDOFF_COPY.title)).toBeTruthy()
  })

  it('dismisses the failure state via "Maybe later"', async () => {
    startSpotifyConnect.mockResolvedValue({ status: 'error' })
    const onClose = vi.fn()
    render(<OAuthHandoffSheet open onClose={onClose} />)
    fireEvent.click(
      screen.getByRole('button', { name: HANDOFF_COPY.continueCta }),
    )
    await waitFor(() => {
      expect(screen.getByText(FAIL_COPY.title)).toBeTruthy()
    })
    fireEvent.click(
      screen.getByRole('button', { name: FAIL_COPY.secondaryCta }),
    )
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
