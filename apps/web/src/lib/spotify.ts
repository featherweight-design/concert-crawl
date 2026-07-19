// Client functions for the Spotify connection API (#763 PR 5).
import type {
  SpotifyConnectionResponse,
  SpotifyConnectionView,
  SpotifyNudgeResponse,
} from '@concert-crawl/types'
import { apiClient } from './api'

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

export async function fetchSpotifyNudgeEligibility(
  token: string,
): Promise<SpotifyNudgeResponse> {
  return apiClient.get<SpotifyNudgeResponse>('/v1/spotify/nudge', token)
}

// Single-fire: called when the nudge is DISPLAYED, regardless of choice.
export async function markSpotifyNudgeSeen(token: string): Promise<void> {
  await apiClient.post<void>('/v1/spotify/nudge/seen', token, {})
}
