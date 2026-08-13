// #1345 — the candidate picker for the ambiguous/no_match queue.
//
// Spotify is mocked at the app-client seam rather than at fetch, because what
// this route owns is everything *around* the search: resolving the row, the
// dormant-credentials path, dedupe, the exact-match flag, the query override,
// and the error taxonomy. The client's own HTTP behaviour is already covered
// by spotify-app-client.test.ts.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { eq } from 'drizzle-orm'

interface AuthState {
  current: {
    userId: string
    sessionClaims: { metadata?: { role?: string } }
  } | null
}

interface SpotifyCandidate {
  id: string
  name: string
  images: { url: string }[]
  popularity: number | null
  genres: string[]
  spotifyUrl: string | null
}

interface SearchState {
  /** Resolves to these candidates, unless `error` is set. */
  candidates: SpotifyCandidate[]
  error: Error | null
  /** False models unset SPOTIFY_CLIENT_ID/SECRET — the dormant path. */
  clientAvailable: boolean
  lastQuery: string | null
  /** What `GET /artists/{id}` reports, keyed by artist id. */
  detailsById: Record<string, { genres: string[]; popularity: number | null }>
  /** Thrown by `fetchArtistDetails` — the degrade-to-unhydrated path. */
  detailsError: Error | null
  /** The ids the route asked to hydrate, or null if it never asked. */
  lastDetailIds: string[] | null
  /**
   * How many clients the route built. Building one mints an app token, so a
   * cache hit that needs no hydration must leave this at zero.
   */
  clientBuilds: number
}

const { authState, searchState } = vi.hoisted(
  (): {
    authState: AuthState
    searchState: SearchState
  } => ({
    authState: { current: null },
    searchState: {
      candidates: [],
      error: null,
      clientAvailable: true,
      lastQuery: null,
      detailsById: {},
      detailsError: null,
      lastDetailIds: null,
      clientBuilds: 0,
    },
  }),
)

vi.mock('@hono/clerk-auth', () => ({
  clerkMiddleware: () => async (_ctx: unknown, next: () => Promise<void>) =>
    next(),
  getAuth: () => authState.current,
}))

vi.mock('../../lib/spotify-app-client.js', () => ({
  createSpotifyAppClient: async () => {
    searchState.clientBuilds += 1
    if (!searchState.clientAvailable) return null
    return {
      searchArtists: async (query: string) => {
        searchState.lastQuery = query
        if (searchState.error !== null) throw searchState.error
        return searchState.candidates
      },
      fetchArtistDetails: async (artistIds: string[]) => {
        searchState.lastDetailIds = artistIds
        if (searchState.detailsError !== null) throw searchState.detailsError
        return new Map(
          artistIds
            .filter((id) => searchState.detailsById[id] !== undefined)
            .map((id) => [
              id,
              searchState.detailsById[id] ?? { genres: [], popularity: null },
            ]),
        )
      },
      getCallCount: () => 1,
    }
  },
}))

import { artists, type SpotifyCandidateSnapshot } from '@concert-crawl/db'
import { createApp } from '../../app.js'
import { testDb } from '../../test/helpers/db.js'
import { SpotifyAuthError, SpotifyRateLimitError } from '../../lib/spotify.js'

const app = createApp()

const ADMIN_HEADERS = { Authorization: 'Bearer admin-token' }

const CANONICAL = 'sublime'

/** When a seeded snapshot was taken — any instant before "now" works. */
const CACHED_AT = new Date('2026-08-01T12:00:00Z')

const snapshot = (
  id: string,
  name: string,
  overrides: Partial<SpotifyCandidateSnapshot> = {},
): SpotifyCandidateSnapshot => ({
  id,
  name,
  imageUrl: `https://i.scdn.co/image/${id}`,
  popularity: 50,
  genres: null,
  spotifyUrl: `https://open.spotify.com/artist/${id}`,
  ...overrides,
})

interface CandidateBody {
  success: boolean
  query?: string
  cachedAt?: string | null
  data?: Array<{
    id: string
    name: string
    isExactMatch: boolean
    imageUrl: string | null
    genres: string[] | null
    popularity: number | null
  }>
  error?: string
}

const candidate = (
  id: string,
  name: string,
  overrides: Partial<SpotifyCandidate> = {},
): SpotifyCandidate => ({
  id,
  name,
  images: [{ url: `https://i.scdn.co/image/${id}` }],
  // Null and empty on purpose: Spotify's `/search` returns simplified artist
  // objects carrying neither popularity nor genres. Anything the picker shows
  // has to come from the hydration call, so a fixture that pre-filled either
  // would hide a regression — as a `popularity: 50` fixture did, while prod
  // served nulls to every candidate.
  popularity: null,
  genres: [],
  spotifyUrl: `https://open.spotify.com/artist/${id}`,
  ...overrides,
})

const seedAmbiguous = async (
  cached: SpotifyCandidateSnapshot[] | null = null,
): Promise<string> => {
  const [row] = await testDb
    .insert(artists)
    .values({
      name: 'Sublime',
      canonicalName: CANONICAL,
      slug: 'sublime-1345',
      matchStatus: 'ambiguous',
      spotifyCandidates: cached,
      spotifyCandidatesFetchedAt: cached === null ? null : CACHED_AT,
    })
    .returning({ id: artists.id })
  if (!row) throw new Error('seed failed')
  return row.id
}

const readCache = async (
  id: string,
): Promise<{
  spotifyCandidates: SpotifyCandidateSnapshot[] | null
  spotifyCandidatesFetchedAt: Date | null
}> => {
  const [row] = await testDb
    .select({
      spotifyCandidates: artists.spotifyCandidates,
      spotifyCandidatesFetchedAt: artists.spotifyCandidatesFetchedAt,
    })
    .from(artists)
    .where(eq(artists.id, id))
  if (!row) throw new Error('artist vanished')
  return row
}

describe('GET /v1/admin/artists/:id/candidates', () => {
  beforeEach(async () => {
    authState.current = {
      userId: 'admin_candidates_test',
      sessionClaims: { metadata: { role: 'admin' } },
    }
    searchState.candidates = []
    searchState.error = null
    searchState.clientAvailable = true
    searchState.lastQuery = null
    searchState.detailsById = {}
    searchState.detailsError = null
    searchState.lastDetailIds = null
    searchState.clientBuilds = 0
    await testDb.delete(artists).where(eq(artists.canonicalName, CANONICAL))
  })

  it('hydrates genres for the candidates it returns', async () => {
    const id = await seedAmbiguous()
    searchState.candidates = [
      candidate('spotify_ska', 'Sublime'),
      candidate('spotify_other', 'Subliminal'),
    ]
    searchState.detailsById = {
      spotify_ska: { genres: ['ska punk', 'reggae rock'], popularity: 80 },
      spotify_other: { genres: ['hip hop'], popularity: 12 },
    }

    const res = await app.request(`/v1/admin/artists/${id}/candidates`, {
      headers: ADMIN_HEADERS,
    })
    const body: CandidateBody = await res.json()

    expect(res.status).toBe(200)
    // Hydration is asked only for the candidates actually being returned.
    expect(searchState.lastDetailIds).toEqual(['spotify_ska', 'spotify_other'])
    // Search and hydration share one client, so one token mint covers both.
    expect(searchState.clientBuilds).toBe(1)
    expect(body.data?.map((row) => row.genres)).toEqual([
      ['ska punk', 'reggae rock'],
      ['hip hop'],
    ])
  })

  it('hydrates popularity, which /search never returns', async () => {
    // The regression this locks down: hydration used to carry genres alone, so
    // every candidate kept the `popularity: null` that `/search` hands back.
    // The picker's suggested-pick highlight reads popularity and nothing else,
    // and a null anywhere disqualifies the comparison — so it silently never
    // fired in prod for any row.
    const id = await seedAmbiguous()
    searchState.candidates = [
      candidate('spotify_ska', 'Sublime'),
      candidate('spotify_other', 'Subliminal'),
    ]
    searchState.detailsById = {
      spotify_ska: { genres: ['ska punk'], popularity: 80 },
      spotify_other: { genres: ['hip hop'], popularity: 12 },
    }

    const res = await app.request(`/v1/admin/artists/${id}/candidates`, {
      headers: ADMIN_HEADERS,
    })
    const body: CandidateBody = await res.json()

    expect(body.data?.map((row) => row.popularity)).toEqual([80, 12])
    // And it is persisted, so reopening the row costs no further Spotify call.
    expect(
      (await readCache(id)).spotifyCandidates?.map((row) => row.popularity),
    ).toEqual([80, 12])
  })

  it('still serves candidates when genre hydration fails', async () => {
    const id = await seedAmbiguous()
    searchState.candidates = [candidate('spotify_ska', 'Sublime')]
    searchState.detailsError = new Error('spotify said no')

    const res = await app.request(`/v1/admin/artists/${id}/candidates`, {
      headers: ADMIN_HEADERS,
    })
    const body: CandidateBody = await res.json()

    // Genres are a nicety; losing them must not cost the admin the picker.
    expect(res.status).toBe(200)
    // Still `null`, not `[]` — the hydration never happened, so claiming
    // Spotify lists no genres would be a lie the next open would believe.
    expect(body.data).toEqual([
      expect.objectContaining({ id: 'spotify_ska', genres: null }),
    ])
  })

  it('leaves genres unknown for an id Spotify would not resolve', async () => {
    const id = await seedAmbiguous([
      snapshot('spotify_ska', 'Sublime'),
      snapshot('spotify_gone', 'Sublime'),
    ])
    searchState.detailsById = {
      spotify_ska: { genres: ['ska punk'], popularity: 80 },
    }

    const res = await app.request(`/v1/admin/artists/${id}/candidates`, {
      headers: ADMIN_HEADERS,
    })
    const body: CandidateBody = await res.json()

    // `[]` would claim Spotify lists no genres for a row we never read, and
    // would be persisted — no later open would retry it.
    expect(body.data?.map((row) => row.genres)).toEqual([['ska punk'], null])
    expect(
      (await readCache(id)).spotifyCandidates?.map((row) => row.genres),
    ).toEqual([['ska punk'], null])
  })

  it('searches the row’s canonical name and flags the exact collisions', async () => {
    const id = await seedAmbiguous()
    searchState.candidates = [
      candidate('spotify_ska', 'Sublime'),
      candidate('spotify_other', 'Subliminal'),
    ]

    const res = await app.request(`/v1/admin/artists/${id}/candidates`, {
      headers: ADMIN_HEADERS,
    })
    const body: CandidateBody = await res.json()

    expect(res.status).toBe(200)
    expect(searchState.lastQuery).toBe(CANONICAL)
    // The flag is what tells the admin which rows actually collided —
    // "Subliminal" came back from the same search but never competed.
    expect(body.data).toEqual([
      expect.objectContaining({ id: 'spotify_ska', isExactMatch: true }),
      expect.objectContaining({ id: 'spotify_other', isExactMatch: false }),
    ])
  })

  it('honours a query override so a no_match row can be searched by hand', async () => {
    const id = await seedAmbiguous()
    searchState.candidates = [candidate('spotify_mike', 'Mike Smoak')]

    const res = await app.request(
      `/v1/admin/artists/${id}/candidates?query=Mike%20Smoak`,
      { headers: ADMIN_HEADERS },
    )
    const body: CandidateBody = await res.json()

    expect(searchState.lastQuery).toBe('Mike Smoak')
    expect(body.query).toBe('Mike Smoak')
    // Nothing matched the row's canonical name, which is the honest answer for
    // a hand-typed spelling — the admin picks it anyway.
    expect(body.data).toEqual([
      expect.objectContaining({ id: 'spotify_mike', isExactMatch: false }),
    ])
  })

  it('returns each artist once when Spotify echoes a duplicate', async () => {
    const id = await seedAmbiguous()
    searchState.candidates = [
      candidate('spotify_ska', 'Sublime'),
      candidate('spotify_ska', 'Sublime'),
    ]

    const res = await app.request(`/v1/admin/artists/${id}/candidates`, {
      headers: ADMIN_HEADERS,
    })
    const body: CandidateBody = await res.json()

    expect(body.data).toHaveLength(1)
  })

  it('404s an unknown artist id without spending a search', async () => {
    const res = await app.request(
      '/v1/admin/artists/11111111-1111-1111-1111-111111111111/candidates',
      { headers: ADMIN_HEADERS },
    )

    expect(res.status).toBe(404)
    expect(searchState.lastQuery).toBeNull()
  })

  it('serves the snapshot the match job left, without spending a search', async () => {
    const id = await seedAmbiguous([
      snapshot('spotify_ska', 'Sublime', { genres: ['ska punk'] }),
      snapshot('spotify_other', 'Subliminal', { genres: [] }),
    ])

    const res = await app.request(`/v1/admin/artists/${id}/candidates`, {
      headers: ADMIN_HEADERS,
    })
    const body: CandidateBody = await res.json()

    expect(res.status).toBe(200)
    // The whole point of #1525 — opening the picker costs Spotify nothing.
    // Not even a client: building one mints an app token over the network.
    expect(searchState.clientBuilds).toBe(0)
    expect(searchState.lastQuery).toBeNull()
    expect(searchState.lastDetailIds).toBeNull()
    expect(body.cachedAt).toBe(CACHED_AT.toISOString())
    expect(body.data).toEqual([
      expect.objectContaining({ id: 'spotify_ska', isExactMatch: true }),
      expect.objectContaining({ id: 'spotify_other', isExactMatch: false }),
    ])
  })

  it('hydrates a snapshot’s genres once and writes them back', async () => {
    const id = await seedAmbiguous([snapshot('spotify_ska', 'Sublime')])
    searchState.detailsById = {
      spotify_ska: { genres: ['ska punk'], popularity: 80 },
    }

    const first = await app.request(`/v1/admin/artists/${id}/candidates`, {
      headers: ADMIN_HEADERS,
    })
    const body: CandidateBody = await first.json()

    expect(body.data?.[0]?.genres).toEqual(['ska punk'])
    // Persisted, so the second open is free.
    expect((await readCache(id)).spotifyCandidates?.[0]?.genres).toEqual([
      'ska punk',
    ])

    searchState.lastDetailIds = null
    searchState.clientBuilds = 0
    await app.request(`/v1/admin/artists/${id}/candidates`, {
      headers: ADMIN_HEADERS,
    })
    expect(searchState.clientBuilds).toBe(0)
    expect(searchState.lastDetailIds).toBeNull()
    expect(searchState.lastQuery).toBeNull()
  })

  it('spends a search on refresh and replaces the snapshot', async () => {
    const id = await seedAmbiguous([snapshot('spotify_stale', 'Sublime')])
    searchState.candidates = [candidate('spotify_fresh', 'Sublime')]

    const res = await app.request(
      `/v1/admin/artists/${id}/candidates?refresh=true`,
      { headers: ADMIN_HEADERS },
    )
    const body: CandidateBody = await res.json()

    expect(searchState.lastQuery).toBe(CANONICAL)
    expect(body.data).toEqual([
      expect.objectContaining({ id: 'spotify_fresh' }),
    ])
    const stored = await readCache(id)
    expect(stored.spotifyCandidates?.map((row) => row.id)).toEqual([
      'spotify_fresh',
    ])
    expect(stored.spotifyCandidatesFetchedAt?.getTime()).toBeGreaterThan(
      CACHED_AT.getTime(),
    )
  })

  it('never writes a hand-typed query back over the row’s snapshot', async () => {
    const id = await seedAmbiguous([snapshot('spotify_ska', 'Sublime')])
    searchState.candidates = [candidate('spotify_mike', 'Mike Smoak')]

    const res = await app.request(
      `/v1/admin/artists/${id}/candidates?query=Mike%20Smoak`,
      { headers: ADMIN_HEADERS },
    )
    const body: CandidateBody = await res.json()

    // An override answers a different question from the one the row asks, so
    // caching it under the canonical name would poison the row.
    expect(body.data).toEqual([expect.objectContaining({ id: 'spotify_mike' })])
    expect(body.cachedAt).toBeNull()
    expect(
      (await readCache(id)).spotifyCandidates?.map((row) => row.id),
    ).toEqual(['spotify_ska'])
  })

  it('serves a snapshot even when the Spotify credentials are unset', async () => {
    const id = await seedAmbiguous([snapshot('spotify_ska', 'Sublime')])
    searchState.clientAvailable = false

    const res = await app.request(`/v1/admin/artists/${id}/candidates`, {
      headers: ADMIN_HEADERS,
    })
    const body: CandidateBody = await res.json()

    // Dormant credentials stop searching, not reading — the snapshot is
    // already ours, and the paste-an-id escape hatch needs the list beside it.
    expect(res.status).toBe(200)
    expect(body.data).toHaveLength(1)
  })

  it('503s when the credentials are unset and the row has no snapshot', async () => {
    const id = await seedAmbiguous()
    searchState.clientAvailable = false

    const res = await app.request(`/v1/admin/artists/${id}/candidates`, {
      headers: ADMIN_HEADERS,
    })
    const body: CandidateBody = await res.json()

    // A configuration state, not a request failure — the admin needs to be
    // told to provision credentials, not to retry.
    expect(res.status).toBe(503)
    expect(body.error).toContain('credentials')
  })

  it('maps the Spotify error taxonomy to distinct statuses', async () => {
    const id = await seedAmbiguous()

    searchState.error = new SpotifyRateLimitError()
    const limited = await app.request(`/v1/admin/artists/${id}/candidates`, {
      headers: ADMIN_HEADERS,
    })
    expect(limited.status).toBe(429)

    searchState.error = new SpotifyAuthError('rejected')
    const rejected = await app.request(`/v1/admin/artists/${id}/candidates`, {
      headers: ADMIN_HEADERS,
    })
    expect(rejected.status).toBe(502)
  })

  it('refuses a non-admin caller', async () => {
    const id = await seedAmbiguous()
    authState.current = { userId: 'plain_user', sessionClaims: {} }

    const res = await app.request(`/v1/admin/artists/${id}/candidates`, {
      headers: ADMIN_HEADERS,
    })

    expect(res.status).toBe(403)
    expect(searchState.lastQuery).toBeNull()
  })
})
