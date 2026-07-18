// apps/api/src/lib/spotify.ts
//
// Thin Spotify Web API client (eng spec §5). Access tokens come from Clerk
// (getUserOauthAccessToken) — we never hold client credentials or refresh
// tokens. Every response crosses a system boundary, so it is Zod-validated
// (no `as` casts). 429s honor Retry-After with a single retry; a second 429
// bubbles as SpotifyRateLimitError so the caller can mark the sync 'error'
// and let the next weekly cycle retry.
import { z } from 'zod'

const SPOTIFY_API_BASE = 'https://api.spotify.com/v1'

// 50 artists/page → 1000-artist ceiling. The typical connected user follows
// far fewer (spec §9.2 sizes the canonical set at ≤ ~600 rows); the cap only
// guards against a runaway cursor loop.
const MAX_FOLLOWED_PAGES = 20

export class SpotifyAuthError extends Error {
  constructor(message = 'Spotify authorization rejected (401/403)') {
    super(message)
    this.name = 'SpotifyAuthError'
  }
}

export class SpotifyRateLimitError extends Error {
  constructor(message = 'Spotify rate limit persisted after retry (429)') {
    super(message)
    this.name = 'SpotifyRateLimitError'
  }
}

export class SpotifyApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'SpotifyApiError'
    this.status = status
  }
}

const artistSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
})

export type SpotifyArtistItem = z.infer<typeof artistSchema>

const profileSchema = z.object({
  id: z.string().min(1),
  display_name: z.string().nullish(),
})

const followedArtistsSchema = z.object({
  artists: z.object({
    items: z.array(artistSchema),
    cursors: z.object({ after: z.string().nullish() }).nullish(),
  }),
})

const topArtistsSchema = z.object({
  items: z.array(artistSchema),
})

export interface SpotifyProfile {
  spotifyUserId: string
  displayName: string | null
}

export interface SpotifyClientOptions {
  fetchFn?: typeof fetch
  sleepFn?: (ms: number) => Promise<void>
}

export interface SpotifyClient {
  getProfile(): Promise<SpotifyProfile>
  getFollowedArtists(): Promise<SpotifyArtistItem[]>
  getTopArtists(): Promise<SpotifyArtistItem[]>
  // Total HTTP calls issued — recorded to cost_tracking metadata (E10).
  getCallCount(): number
}

const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms)
  })

const parseRetryAfterMs = (header: string | null): number => {
  const seconds = Number(header)
  if (!Number.isFinite(seconds) || seconds <= 0) return 1000
  return seconds * 1000
}

export const createSpotifyClient = (
  accessToken: string,
  options: SpotifyClientOptions = {},
): SpotifyClient => {
  const fetchFn = options.fetchFn ?? fetch
  const sleepFn = options.sleepFn ?? defaultSleep
  let callCount = 0

  const requestJson = async (
    path: string,
    retried = false,
  ): Promise<unknown> => {
    callCount += 1
    const response = await fetchFn(`${SPOTIFY_API_BASE}${path}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (response.status === 401 || response.status === 403) {
      throw new SpotifyAuthError(
        `Spotify rejected the access token (${response.status}) for ${path}`,
      )
    }

    if (response.status === 429) {
      if (retried) {
        throw new SpotifyRateLimitError(
          `Spotify rate limit persisted after retry for ${path}`,
        )
      }
      await sleepFn(parseRetryAfterMs(response.headers.get('Retry-After')))
      return requestJson(path, true)
    }

    if (!response.ok) {
      throw new SpotifyApiError(
        `Spotify request failed (${response.status}) for ${path}`,
        response.status,
      )
    }

    const body: unknown = await response.json()
    return body
  }

  const parseOrThrow = <Schema extends z.ZodTypeAny>(
    schema: Schema,
    body: unknown,
    path: string,
  ): z.infer<Schema> => {
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      throw new SpotifyApiError(
        `Spotify returned an unexpected response shape for ${path}`,
        200,
      )
    }
    return parsed.data
  }

  const getProfile = async (): Promise<SpotifyProfile> => {
    const body = await requestJson('/me')
    const profile = parseOrThrow(profileSchema, body, '/me')
    return {
      spotifyUserId: profile.id,
      displayName: profile.display_name ?? null,
    }
  }

  const getFollowedArtists = async (): Promise<SpotifyArtistItem[]> => {
    const items: SpotifyArtistItem[] = []
    let after: string | null = null
    for (let page = 0; page < MAX_FOLLOWED_PAGES; page += 1) {
      const path: string =
        after === null
          ? '/me/following?type=artist&limit=50'
          : `/me/following?type=artist&limit=50&after=${encodeURIComponent(after)}`
      const body = await requestJson(path)
      const parsed = parseOrThrow(followedArtistsSchema, body, path)
      items.push(...parsed.artists.items)
      after = parsed.artists.cursors?.after ?? null
      if (after === null || parsed.artists.items.length === 0) break
    }
    return items
  }

  const getTopArtists = async (): Promise<SpotifyArtistItem[]> => {
    const path = '/me/top/artists?time_range=medium_term&limit=50'
    const body = await requestJson(path)
    return parseOrThrow(topArtistsSchema, body, path).items
  }

  return {
    getProfile,
    getFollowedArtists,
    getTopArtists,
    getCallCount: () => callCount,
  }
}
