// Starts the Clerk-managed Spotify OAuth handoff (#763 PR 5).
//
// Structural view of Clerk's UserResource — just the one method this flow
// needs, so we don't import transitive @clerk/types directly. useUser()'s
// user is assignable to it.
interface SpotifyOAuthUser {
  createExternalAccount(params: {
    strategy: 'oauth_spotify'
    redirectUrl?: string
  }): Promise<{
    verification: {
      externalVerificationRedirectURL: URL | null
    } | null
  }>
}

export type SpotifyConnectStart =
  { status: 'redirect'; url: string } | { status: 'error' }

// Kicks off the OAuth dance: Clerk creates the pending external account and
// hands back Spotify's authorize URL; the caller navigates there. Any
// failure — including a Clerk instance without the Spotify provider
// configured — resolves to { status: 'error' } so the UI can show the
// "Spotify's not picking up" state instead of crashing (staging guard).
export async function startSpotifyConnect(
  user: SpotifyOAuthUser,
  redirectUrl: string,
): Promise<SpotifyConnectStart> {
  try {
    const account = await user.createExternalAccount({
      strategy: 'oauth_spotify',
      redirectUrl,
    })
    const url = account.verification?.externalVerificationRedirectURL?.href
    if (!url) return { status: 'error' }
    return { status: 'redirect', url }
  } catch (err) {
    console.error('spotify connect: createExternalAccount failed', err)
    return { status: 'error' }
  }
}
