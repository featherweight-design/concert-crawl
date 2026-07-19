// @vitest-environment jsdom

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { SpotifyConnectStart } from '@/lib/spotify-connect'
import type * as spotifyConnectModule from '@/lib/spotify-connect'

const startSpotifyConnect =
  vi.fn<(...args: unknown[]) => Promise<SpotifyConnectStart>>()

// Keep the real sessionStorage resume-intent helpers — the resume tests
// below exercise them against jsdom storage; only the connect call is faked.
vi.mock('@/lib/spotify-connect', async (importOriginal) => {
  const actual = await importOriginal<typeof spotifyConnectModule>()
  return {
    ...actual,
    startSpotifyConnect: (...args: unknown[]) => startSpotifyConnect(...args),
  }
})

vi.mock('@clerk/nextjs', () => ({
  useUser: () => ({
    user: { id: 'user_1', createExternalAccount: vi.fn() },
  }),
  useReverification: (fetcher: (...args: unknown[]) => Promise<unknown>) =>
    fetcher,
}))

beforeEach(() => {
  vi.clearAllMocks()
  sessionStorage.clear()
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
    // "Try again" retries the connection directly — no detour back through
    // the handoff rail (#763 staging feedback).
    fireEvent.click(screen.getByRole('button', { name: FAIL_COPY.primaryCta }))
    expect(startSpotifyConnect).toHaveBeenCalledTimes(2)
    expect(screen.queryByText(HANDOFF_COPY.title)).toBeNull()
    await waitFor(() => {
      expect(screen.getByText(FAIL_COPY.title)).toBeTruthy()
    })
  })

  it('disables "Try again" while the retry is in flight', async () => {
    startSpotifyConnect.mockResolvedValueOnce({ status: 'error' })
    render(<OAuthHandoffSheet open onClose={vi.fn()} />)
    fireEvent.click(
      screen.getByRole('button', { name: HANDOFF_COPY.continueCta }),
    )
    await waitFor(() => {
      expect(screen.getByText(FAIL_COPY.title)).toBeTruthy()
    })
    startSpotifyConnect.mockReturnValueOnce(
      new Promise<SpotifyConnectStart>(() => undefined),
    )
    const tryAgain = screen.getByRole('button', { name: FAIL_COPY.primaryCta })
    fireEvent.click(tryAgain)
    await waitFor(() => {
      expect(tryAgain.hasAttribute('disabled')).toBe(true)
    })
  })

  it('returns to the rail when reverification is cancelled', async () => {
    startSpotifyConnect.mockResolvedValue({ status: 'cancelled' })
    render(<OAuthHandoffSheet open onClose={vi.fn()} />)
    fireEvent.click(
      screen.getByRole('button', { name: HANDOFF_COPY.continueCta }),
    )
    await waitFor(() => {
      expect(startSpotifyConnect).toHaveBeenCalledTimes(1)
    })
    expect(screen.queryByText(FAIL_COPY.title)).toBeNull()
    expect(screen.getByText(HANDOFF_COPY.title)).toBeTruthy()
  })

  it('does not redirect when cancelled while the handoff is in flight', async () => {
    let resolveConnect: (value: SpotifyConnectStart) => void = () => undefined
    startSpotifyConnect.mockReturnValue(
      new Promise<SpotifyConnectStart>((resolve) => {
        resolveConnect = resolve
      }),
    )
    const assign = vi.fn()
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { origin: 'http://localhost', assign },
    })
    const onClose = vi.fn()
    render(<OAuthHandoffSheet open onClose={onClose} />)
    fireEvent.click(
      screen.getByRole('button', { name: HANDOFF_COPY.continueCta }),
    )
    fireEvent.click(
      screen.getByRole('button', { name: HANDOFF_COPY.cancelCta }),
    )
    resolveConnect({
      status: 'redirect',
      url: 'https://accounts.spotify.com/authorize',
    })
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
    // Let the in-flight promise chain settle before asserting no redirect.
    await Promise.resolve()
    await Promise.resolve()
    expect(assign).not.toHaveBeenCalled()
  })

  it('marks a resume intent before the connect starts and clears it on settle', async () => {
    startSpotifyConnect.mockImplementation(() => {
      // The flag must already be persisted when the reverification-capable
      // call begins — a mid-flow reload is exactly what it protects against.
      expect(sessionStorage.getItem('cc-spotify-connect-resume')).not.toBeNull()
      return Promise.resolve<SpotifyConnectStart>({ status: 'error' })
    })
    render(<OAuthHandoffSheet open onClose={vi.fn()} />)
    fireEvent.click(
      screen.getByRole('button', { name: HANDOFF_COPY.continueCta }),
    )
    await waitFor(() => {
      expect(screen.getByText(FAIL_COPY.title)).toBeTruthy()
    })
    expect(sessionStorage.getItem('cc-spotify-connect-resume')).toBeNull()
  })

  it('clears the resume intent before redirecting to Spotify', async () => {
    startSpotifyConnect.mockResolvedValue({
      status: 'redirect',
      url: 'https://accounts.spotify.com/authorize',
    })
    const assign = vi.fn(() => {
      expect(sessionStorage.getItem('cc-spotify-connect-resume')).toBeNull()
    })
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { origin: 'http://localhost', assign },
    })
    render(<OAuthHandoffSheet open onClose={vi.fn()} />)
    fireEvent.click(
      screen.getByRole('button', { name: HANDOFF_COPY.continueCta }),
    )
    await waitFor(() => expect(assign).toHaveBeenCalledTimes(1))
  })

  it('resumes the connect after a reload interrupted it mid-reverification', async () => {
    sessionStorage.setItem('cc-spotify-connect-resume', String(Date.now()))
    startSpotifyConnect.mockReturnValue(
      new Promise<SpotifyConnectStart>(() => undefined),
    )
    render(<OAuthHandoffSheet open={false} onClose={vi.fn()} />)
    await waitFor(() => {
      expect(startSpotifyConnect).toHaveBeenCalledTimes(1)
    })
    // The sheet opens itself while resuming, even though the parent's open
    // state was reset by the reload.
    expect(screen.getByText(HANDOFF_COPY.title)).toBeTruthy()
    // The resumed attempt re-marks its own intent while in flight, so a
    // second reload mid-resume is protected too.
    expect(sessionStorage.getItem('cc-spotify-connect-resume')).not.toBeNull()
  })

  it('clears the resume intent when the sheet is dismissed mid-flight', async () => {
    startSpotifyConnect.mockReturnValue(
      new Promise<SpotifyConnectStart>(() => undefined),
    )
    const onClose = vi.fn()
    render(<OAuthHandoffSheet open onClose={onClose} />)
    fireEvent.click(
      screen.getByRole('button', { name: HANDOFF_COPY.continueCta }),
    )
    await waitFor(() => {
      expect(sessionStorage.getItem('cc-spotify-connect-resume')).not.toBeNull()
    })
    fireEvent.click(
      screen.getByRole('button', { name: HANDOFF_COPY.cancelCta }),
    )
    // Cancel wins across reloads — no lingering mark to auto-resume from.
    expect(sessionStorage.getItem('cc-spotify-connect-resume')).toBeNull()
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('does not resume from a stale intent', async () => {
    sessionStorage.setItem(
      'cc-spotify-connect-resume',
      String(Date.now() - 11 * 60 * 1000),
    )
    render(<OAuthHandoffSheet open={false} onClose={vi.fn()} />)
    // Give any (incorrect) resume effect a chance to fire.
    await Promise.resolve()
    expect(startSpotifyConnect).not.toHaveBeenCalled()
    expect(screen.queryByText(HANDOFF_COPY.title)).toBeNull()
    expect(sessionStorage.getItem('cc-spotify-connect-resume')).toBeNull()
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
