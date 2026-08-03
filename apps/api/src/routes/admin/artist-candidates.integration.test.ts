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
    if (!searchState.clientAvailable) return null
    return {
      searchArtists: async (query: string) => {
        searchState.lastQuery = query
        if (searchState.error !== null) throw searchState.error
        return searchState.candidates
      },
      getCallCount: () => 1,
    }
  },
}))

import { artists } from '@concert-crawl/db'
import { createApp } from '../../app.js'
import { testDb } from '../../test/helpers/db.js'
import { SpotifyAuthError, SpotifyRateLimitError } from '../../lib/spotify.js'

const app = createApp()

const ADMIN_HEADERS = { Authorization: 'Bearer admin-token' }

const CANONICAL = 'sublime'

interface CandidateBody {
  success: boolean
  query?: string
  data?: Array<{ id: string; name: string; isExactMatch: boolean }>
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
  popularity: 50,
  genres: ['ska punk'],
  spotifyUrl: `https://open.spotify.com/artist/${id}`,
  ...overrides,
})

const seedAmbiguous = async (): Promise<string> => {
  const [row] = await testDb
    .insert(artists)
    .values({
      name: 'Sublime',
      canonicalName: CANONICAL,
      slug: 'sublime-1345',
      matchStatus: 'ambiguous',
    })
    .returning({ id: artists.id })
  if (!row) throw new Error('seed failed')
  return row.id
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
    await testDb.delete(artists).where(eq(artists.canonicalName, CANONICAL))
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

  it('503s when the Spotify app credentials are unset', async () => {
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
