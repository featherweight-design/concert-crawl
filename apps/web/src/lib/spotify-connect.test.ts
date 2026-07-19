// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest'

const isReverificationCancelledError = vi.fn<(err: unknown) => boolean>()

vi.mock('@clerk/nextjs/errors', () => ({
  isReverificationCancelledError: (err: unknown) =>
    isReverificationCancelledError(err),
}))

import {
  clearSpotifyConnectPending,
  consumeSpotifyConnectPending,
  markSpotifyConnectPending,
  startSpotifyConnect,
} from './spotify-connect'

const REDIRECT_URL = 'https://example.test/me?section=connections'

beforeEach(() => {
  vi.clearAllMocks()
  isReverificationCancelledError.mockReturnValue(false)
})

describe('startSpotifyConnect', () => {
  it('returns the authorize redirect on success', async () => {
    const createExternalAccount = vi.fn().mockResolvedValue({
      verification: {
        externalVerificationRedirectURL: new URL(
          'https://accounts.spotify.com/authorize?x=1',
        ),
      },
    })
    const result = await startSpotifyConnect(
      createExternalAccount,
      REDIRECT_URL,
    )
    expect(createExternalAccount).toHaveBeenCalledWith({
      strategy: 'oauth_spotify',
      redirectUrl: REDIRECT_URL,
    })
    expect(result).toEqual({
      status: 'redirect',
      url: 'https://accounts.spotify.com/authorize?x=1',
    })
  })

  it('returns error when the verification carries no redirect URL', async () => {
    const createExternalAccount = vi.fn().mockResolvedValue({
      verification: { externalVerificationRedirectURL: null },
    })
    const result = await startSpotifyConnect(
      createExternalAccount,
      REDIRECT_URL,
    )
    expect(result).toEqual({ status: 'error' })
  })

  it('returns error when the account creation throws', async () => {
    const errorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined)
    try {
      const createExternalAccount = vi
        .fn()
        .mockRejectedValue(new Error('session_reverification_required'))
      const result = await startSpotifyConnect(
        createExternalAccount,
        REDIRECT_URL,
      )
      expect(result).toEqual({ status: 'error' })
      expect(errorSpy).toHaveBeenCalled()
    } finally {
      errorSpy.mockRestore()
    }
  })

  it('returns cancelled when the user backs out of reverification', async () => {
    isReverificationCancelledError.mockReturnValue(true)
    const createExternalAccount = vi
      .fn()
      .mockRejectedValue(new Error('reverification cancelled'))
    const result = await startSpotifyConnect(
      createExternalAccount,
      REDIRECT_URL,
    )
    expect(result).toEqual({ status: 'cancelled' })
  })
})

describe('spotify connect resume intent', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('consumes a fresh mark exactly once', () => {
    markSpotifyConnectPending()
    expect(consumeSpotifyConnectPending()).toBe(true)
    // Clear-on-read: a second mounted sheet must not also resume.
    expect(consumeSpotifyConnectPending()).toBe(false)
  })

  it('ignores a mark older than the reverification window', () => {
    vi.useFakeTimers()
    try {
      markSpotifyConnectPending()
      vi.advanceTimersByTime(11 * 60 * 1000)
      expect(consumeSpotifyConnectPending()).toBe(false)
    } finally {
      vi.useRealTimers()
    }
  })

  it('ignores a mark with a corrupted timestamp', () => {
    sessionStorage.setItem('cc-spotify-connect-resume', 'not-a-number')
    expect(consumeSpotifyConnectPending()).toBe(false)
    expect(sessionStorage.getItem('cc-spotify-connect-resume')).toBeNull()
  })

  it('returns false when no mark exists', () => {
    expect(consumeSpotifyConnectPending()).toBe(false)
  })

  it('clears the mark when the connect settles without a reload', () => {
    markSpotifyConnectPending()
    clearSpotifyConnectPending()
    expect(consumeSpotifyConnectPending()).toBe(false)
  })
})
