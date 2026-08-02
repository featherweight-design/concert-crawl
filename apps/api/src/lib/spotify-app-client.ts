// apps/api/src/lib/spotify-app-client.ts
//
// App-token ("client credentials") Spotify client for artist identity
// matching (#1115, plan PR-C Task 7).
//
// This is a DIFFERENT grant from apps/api/src/lib/spotify.ts, which is
// user-scoped: there, access tokens come from Clerk and we never hold client
// credentials. Artist search (`GET /search?type=artist`) and artist images
// are not user-scoped, so they need an app token minted from
// SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET.
//
// Dormant by design: when either env var is unset, `getAppToken()` returns
// null and `createSpotifyAppClient()` returns null, so every caller no-ops
// without touching the network. That path is covered by tests in
// spotify-app-client.test.ts ("with credentials unset") — the feature must go
// quiet rather than crash until the credentials are provisioned.
//
// The error taxonomy is reused from ./spotify.js so callers handle one set of
// failures. Every response crosses a system boundary and is Zod-validated —
// no `as` casts.
import { z } from 'zod'
import {
  SpotifyApiError,
  SpotifyAuthError,
  SpotifyRateLimitError,
} from './spotify.js'

const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token'
const SPOTIFY_API_BASE = 'https://api.spotify.com/v1'

/**
 * Refresh this many ms before the token's stated expiry. A request in flight
 * when the token flips must not 401, so the cached token is treated as stale
 * one minute early.
 */
const TOKEN_EXPIRY_SKEW_MS = 60_000

/** Candidates per search. The matcher only accepts exact canonical hits, so a
 * deep page adds nothing — it just widens the ambiguity surface. */
const SEARCH_LIMIT = 10

const tokenResponseSchema = z.object({
  access_token: z.string().min(1),
  expires_in: z.number().positive(),
})

const artistImageSchema = z.object({ url: z.string().min(1) })

const searchArtistSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  images: z.array(artistImageSchema).nullish(),
  popularity: z.number().nullish(),
  // Carried for the admin candidate picker (#1345), which needs enough to tell
  // two identically-named artists apart. The matcher ignores both.
  genres: z.array(z.string()).nullish(),
  external_urls: z.object({ spotify: z.string().min(1) }).nullish(),
})

const searchResponseSchema = z.object({
  artists: z.object({ items: z.array(searchArtistSchema) }),
})

export interface SpotifyArtistCandidate {
  id: string
  name: string
  images: { url: string }[]
  popularity: number | null
  genres: string[]
  spotifyUrl: string | null
}

/** The matcher's only dependency on Spotify — injected so artist-match.ts
 * stays a pure function of its inputs. */
export type SpotifySearch = (query: string) => Promise<SpotifyArtistCandidate[]>

export interface SpotifyAppClientOptions {
  fetchFn?: typeof fetch
  sleepFn?: (ms: number) => Promise<void>
  now?: () => number
}

export interface SpotifyAppClient {
  searchArtists: SpotifySearch
  /** Total HTTP calls issued, token mint included — for cost bookkeeping. */
  getCallCount(): number
}

interface CachedToken {
  token: string
  /** Epoch ms after which the cached token must be re-minted. */
  expiresAtMs: number
}

// Process-lifetime cache. The match job is a short-lived process handling a
// batch, so one mint per run is the norm.
let cachedToken: CachedToken | null = null

// Counts token mints that actually hit the network, so a client built on a
// cached token doesn't claim an HTTP call it never made.
let tokenMintCount = 0

/** Test seam — drops the in-process token cache. */
export const resetAppTokenCache = (): void => {
  cachedToken = null
}

const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms)
  })

const readCredentials = (): {
  clientId: string
  clientSecret: string
} | null => {
  const parsed = z
    .object({
      SPOTIFY_CLIENT_ID: z.string().min(1),
      SPOTIFY_CLIENT_SECRET: z.string().min(1),
    })
    .safeParse(process.env)
  if (!parsed.success) return null
  return {
    clientId: parsed.data.SPOTIFY_CLIENT_ID,
    clientSecret: parsed.data.SPOTIFY_CLIENT_SECRET,
  }
}

/** True when both app-token credentials are present. Callers use this to log
 * "skipped, unconfigured" rather than "failed". */
export const hasSpotifyAppCredentials = (): boolean =>
  readCredentials() !== null

/**
 * Mint (or reuse) a client-credentials app token.
 *
 * Returns `null` when SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET are unset —
 * the dormant path. Throws SpotifyAuthError when the credentials exist but
 * Spotify rejects them, because that is a real misconfiguration.
 */
export const getAppToken = async (
  options: SpotifyAppClientOptions = {},
): Promise<string | null> => {
  const credentials = readCredentials()
  if (credentials === null) return null

  const fetchFn = options.fetchFn ?? fetch
  const now = options.now ?? Date.now

  if (cachedToken !== null && now() < cachedToken.expiresAtMs) {
    return cachedToken.token
  }

  const basic = Buffer.from(
    `${credentials.clientId}:${credentials.clientSecret}`,
  ).toString('base64')

  const response = await fetchFn(SPOTIFY_TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })

  if (
    response.status === 400 ||
    response.status === 401 ||
    response.status === 403
  ) {
    throw new SpotifyAuthError(
      `Spotify rejected the client credentials (${response.status})`,
    )
  }

  if (!response.ok) {
    throw new SpotifyApiError(
      `Spotify token request failed (${response.status})`,
      response.status,
    )
  }

  const body: unknown = await response.json()
  const parsed = tokenResponseSchema.safeParse(body)
  if (!parsed.success) {
    throw new SpotifyApiError(
      'Spotify returned an unexpected token response shape',
      200,
    )
  }

  tokenMintCount += 1
  cachedToken = {
    token: parsed.data.access_token,
    expiresAtMs: now() + parsed.data.expires_in * 1000 - TOKEN_EXPIRY_SKEW_MS,
  }
  return cachedToken.token
}

// Retry-After is delta-seconds or an HTTP-date (RFC 9110 §10.2.3); Spotify
// sends seconds, but honor both. Unparseable or non-positive → 1s, matching
// spotify.ts — a literal `Retry-After: 0` must not become a tight retry loop
// against an endpoint that is already rate-limiting us.
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

/**
 * Build an app-token Spotify client, or `null` when the credentials are
 * unset. A null return is the "PR-C not provisioned" state and callers must
 * treat it as "skip", never as an error.
 */
export const createSpotifyAppClient = async (
  options: SpotifyAppClientOptions = {},
): Promise<SpotifyAppClient | null> => {
  const mintsBefore = tokenMintCount
  const token = await getAppToken(options)
  if (token === null) return null

  const fetchFn = options.fetchFn ?? fetch
  const sleepFn = options.sleepFn ?? defaultSleep
  // 1 when this call minted a fresh token, 0 when it reused a cached one.
  let callCount = tokenMintCount - mintsBefore

  const requestJson = async (
    path: string,
    retried = false,
  ): Promise<unknown> => {
    callCount += 1
    const response = await fetchFn(`${SPOTIFY_API_BASE}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (response.status === 401 || response.status === 403) {
      throw new SpotifyAuthError(
        `Spotify rejected the app token (${response.status}) for ${path}`,
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

  const searchArtists: SpotifySearch = async (query) => {
    const path = `/search?q=${encodeURIComponent(query)}&type=artist&limit=${SEARCH_LIMIT}`
    const body = await requestJson(path)
    const parsed = searchResponseSchema.safeParse(body)
    if (!parsed.success) {
      throw new SpotifyApiError(
        `Spotify returned an unexpected search response shape for ${path}`,
        200,
      )
    }
    return parsed.data.artists.items.map((item) => ({
      id: item.id,
      name: item.name,
      images: item.images ?? [],
      popularity: item.popularity ?? null,
      genres: item.genres ?? [],
      spotifyUrl: item.external_urls?.spotify ?? null,
    }))
  }

  return { searchArtists, getCallCount: () => callCount }
}
