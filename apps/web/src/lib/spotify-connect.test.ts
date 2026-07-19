import { describe, it, expect, vi, beforeEach } from 'vitest'

const isReverificationCancelledError = vi.fn<(err: unknown) => boolean>()

vi.mock('@clerk/nextjs/errors', () => ({
  isReverificationCancelledError: (err: unknown) =>
    isReverificationCancelledError(err),
}))

import { startSpotifyConnect } from './spotify-connect'

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
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const createExternalAccount = vi
      .fn()
      .mockRejectedValue(new Error('session_reverification_required'))
    const result = await startSpotifyConnect(
      createExternalAccount,
      REDIRECT_URL,
    )
    expect(result).toEqual({ status: 'error' })
    expect(console.error).toHaveBeenCalled()
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
