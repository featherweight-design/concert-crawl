// Starts the Clerk-managed Spotify OAuth handoff (#763 PR 5).
import { isReverificationCancelledError } from '@clerk/nextjs/errors'

export interface SpotifyExternalAccountParams {
  strategy: 'oauth_spotify'
  redirectUrl?: string
}

// Structural view of Clerk's createExternalAccount result — just the field
// this flow needs, so we don't import transitive @clerk/types directly.
export interface SpotifyExternalAccountResult {
  verification: {
    externalVerificationRedirectURL: URL | null
  } | null
}

// Callers pass the reverification-enhanced fetcher from useReverification —
// Clerk treats createExternalAccount as a sensitive op, so aged sessions
// (auth factor >10 min old on instances with reverification enabled) get a
// 403 unless the enhanced fetcher re-verifies and retries. A raw
// user.createExternalAccount is also assignable for non-hook contexts.
export type CreateSpotifyExternalAccount = (
  params: SpotifyExternalAccountParams,
) => Promise<SpotifyExternalAccountResult>

// Where Spotify sends the user back after the OAuth dance. The `spotify=return`
// flag is what the return handler on /me watches for; every connect entry
// point shares this path so the handler mounts in exactly one place.
export const SPOTIFY_RETURN_PATH = '/me?section=connections&spotify=return'

export type SpotifyConnectStart =
  | { status: 'redirect'; url: string }
  | { status: 'cancelled' }
  | { status: 'error' }

// Kicks off the OAuth dance: Clerk creates the pending external account and
// hands back Spotify's authorize URL; the caller navigates there. Backing out
// of Clerk's reverification modal resolves to 'cancelled' (not a failure);
// any other failure — including a Clerk instance without the Spotify provider
// configured — resolves to 'error' so the UI can show the "Spotify's not
// picking up" state instead of crashing.
export async function startSpotifyConnect(
  createExternalAccount: CreateSpotifyExternalAccount,
  redirectUrl: string,
): Promise<SpotifyConnectStart> {
  try {
    const account = await createExternalAccount({
      strategy: 'oauth_spotify',
      redirectUrl,
    })
    const url = account.verification?.externalVerificationRedirectURL?.href
    if (!url) return { status: 'error' }
    return { status: 'redirect', url }
  } catch (err) {
    if (isReverificationCancelledError(err)) return { status: 'cancelled' }
    console.error('spotify connect: createExternalAccount failed', err)
    return { status: 'error' }
  }
}
