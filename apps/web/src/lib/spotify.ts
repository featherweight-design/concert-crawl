// Client functions for the Spotify connection API (#763 PR 5).
import type {
  SpotifyConnectionResponse,
  SpotifyConnectionView,
  SpotifyTastePicksResponse,
} from '@concert-crawl/types'
import { apiClient } from './api'

// Spotify is in Development Mode: 5 authenticated users, hard cap, and
// Extended Quota needs 250k MAU. Past the cap OAuth still SUCCEEDS and every
// subsequent API call 403s, which reads to the user as a working connection
// that does nothing. Hiding the door is the only honest option.
//
// This gates the surfaces that offer a NEW connection. It never touches the
// ones that offer a reconnect (SpotifyStatusBanner, DiscoveryShelf), because
// those only render for a user who already holds one of the five slots.
//
// Deliberately global. A per-user override belongs to the flag system, not an
// env var.
export const spotifyConnectEnabled = (): boolean =>
  process.env['NEXT_PUBLIC_SPOTIFY_CONNECT_ENABLED'] === '1'

export async function fetchSpotifyConnection(
  token: string,
): Promise<SpotifyConnectionResponse> {
  return apiClient.get<SpotifyConnectionResponse>(
    '/v1/spotify/connection',
    token,
  )
}

// Post-OAuth-return: verifies the Clerk external account, creates our
// connection row, and runs the first sync inline (the response carries the
// real artist + Denver-match counts for the success screen).
export async function connectSpotify(
  token: string,
): Promise<SpotifyConnectionView> {
  return apiClient.post<SpotifyConnectionView>(
    '/v1/spotify/connection',
    token,
    {},
  )
}

// On-demand "Refresh my taste" — throws ApiError 429 (Retry-After) when the
// last sync is under 10 minutes old.
export async function syncSpotifyConnection(
  token: string,
): Promise<SpotifyConnectionView> {
  return apiClient.post<SpotifyConnectionView>(
    '/v1/spotify/connection/sync',
    token,
    {},
  )
}

export async function patchSpotifyConnection(
  token: string,
  updates: {
    autoWatch?: boolean
    digestEnabled?: boolean
    pushEnabled?: boolean
  },
): Promise<SpotifyConnectionView> {
  return apiClient.patch<SpotifyConnectionView>(
    '/v1/spotify/connection',
    token,
    updates,
  )
}

export async function disconnectSpotify(token: string): Promise<void> {
  await apiClient.delete<void>('/v1/spotify/connection', token)
}

// "Based on your taste" shelf (#763 PR 8) — entitlement-gated server-side;
// carries the connection status so the shelf can render its own failure state.
export async function fetchTastePicks(
  token: string,
): Promise<SpotifyTastePicksResponse> {
  return apiClient.get<SpotifyTastePicksResponse>(
    '/v1/spotify/taste-picks',
    token,
  )
}

// The post-first-watch nudge is no longer a Spotify pitch (native following,
// PR 10) — it asks for a FOLLOW on the headliner, and its dismissal lives on
// the device rather than on `spotifyNudgeSeenAt`. The client helpers that read
// GET /v1/spotify/nudge are gone with it. The endpoints and the column are
// left standing for a later contraction, so a rollback has something to land
// on; nothing in the app calls them now.
