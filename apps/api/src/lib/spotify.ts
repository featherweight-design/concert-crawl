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
// far fewer (spec §9.2 sizes the canonical set at ≤ ~600 rows); the cap guards
// against a runaway cursor loop — hitting it with a live cursor throws rather
// than silently truncating the set.
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

export class SpotifyTimeoutError extends Error {
  constructor(message = 'Spotify request timed out') {
    super(message)
    this.name = 'SpotifyTimeoutError'
  }
}

/**
 * Ceiling on a single Spotify HTTP call. `fetch` has no default timeout, so an
 * endpoint that accepts the connection and then never answers blocks forever.
 * A cron job hung that way never logs, never throws, and never reaches Sentry —
 * it just stops advancing `lastSuccessfulRunAt`, which is invisible from
 * outside. Prod hit exactly that on 2026-08-06: match-artists ran for ~80
 * minutes doing nothing while every trigger still returned HTTP 200.
 */
export const SPOTIFY_REQUEST_TIMEOUT_MS = 15_000

// A timed-out `/search` would otherwise carry its query string — an artist
// name read from the DB — into every log line and Sentry event.
const withoutQuery = (input: string): string => {
  try {
    const url = new URL(input)
    return `${url.origin}${url.pathname}`
  } catch {
    return input
  }
}

// `AbortSignal.timeout` rejects with a `TimeoutError`; a controller rejects
// with an `AbortError`. Either can reach us through `AbortSignal.any`.
const isAbortError = (err: unknown): boolean =>
  err instanceof Error &&
  (err.name === 'AbortError' || err.name === 'TimeoutError')

/**
 * `fetch` with a hard deadline, translating an abort into the shared error
 * taxonomy so callers handle one set of failures. Any caller-supplied signal is
 * kept — the timeout is added to it, never a replacement for it.
 */
export const fetchWithTimeout = async (
  fetchFn: typeof fetch,
  input: string,
  init: RequestInit = {},
  timeoutMs: number = SPOTIFY_REQUEST_TIMEOUT_MS,
): Promise<Response> => {
  const callerSignal = init.signal instanceof AbortSignal ? init.signal : null
  const timeoutSignal = AbortSignal.timeout(timeoutMs)
  const signal =
    callerSignal === null
      ? timeoutSignal
      : AbortSignal.any([callerSignal, timeoutSignal])

  try {
    return await fetchFn(input, { ...init, signal })
  } catch (err) {
    // Only our own deadline makes a timeout. A caller's abort stays the
    // caller's, and a genuine network error stays itself even when the
    // deadline happens to elapse while it is surfacing — misreporting either
    // one would bury the real cause under a wrong Sentry title.
    if (
      isAbortError(err) &&
      timeoutSignal.aborted &&
      callerSignal?.aborted !== true
    ) {
      throw new SpotifyTimeoutError(
        `Spotify request exceeded ${timeoutMs}ms for ${withoutQuery(input)}`,
      )
    }
    throw err
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

// Retry-After is delta-seconds or an HTTP-date (RFC 9110 §10.2.3); Spotify
// sends seconds, but honor both. Unparseable or non-positive → 1s.
const parseRetryAfterMs = (header: string | null): number => {
  if (header === null) return 1000
  const seconds = Number(header)
  if (Number.isFinite(seconds)) {
    return seconds > 0 ? seconds * 1000 : 1000
  }
  const dateMs = Date.parse(header)
  if (!Number.isNaN(dateMs) && dateMs > Date.now()) {
    return dateMs - Date.now()
  }
  return 1000
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
    const response = await fetchWithTimeout(
      fetchFn,
      `${SPOTIFY_API_BASE}${path}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    )

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
    // Cap exhausted with a live cursor: fail the sync rather than return a
    // truncated set — the replace-set upsert would delete follows beyond the
    // cap. The engine maps this to status='error', preserving the previous set.
    if (after !== null) {
      throw new SpotifyApiError(
        `Spotify followed-artists pagination exceeded ${MAX_FOLLOWED_PAGES} pages`,
        200,
      )
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
