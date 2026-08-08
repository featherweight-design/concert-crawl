// Unit tests for the Spotify Web API client (eng spec §5): Zod-validated
// responses, followed-artists cursor pagination, 429 Retry-After handling
// (sleep + retry once, second 429 fails), 401 → SpotifyAuthError.
import { describe, it, expect } from 'vitest'
import {
  createSpotifyClient,
  fetchWithTimeout,
  MAX_RETRY_AFTER_MS,
  SpotifyAuthError,
  SpotifyRateLimitError,
  SpotifyApiError,
  SpotifyTimeoutError,
} from './spotify.js'

interface StubCall {
  url: string
  authorization: string | null
}

interface StubResponse {
  status: number
  body?: unknown
  headers?: Record<string, string>
}

function makeFetchStub(responses: StubResponse[]) {
  const calls: StubCall[] = []
  const fetchFn: typeof fetch = async (input, init) => {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url
    const headers = new Headers(init?.headers)
    calls.push({ url, authorization: headers.get('Authorization') })
    const next = responses.shift()
    if (!next) throw new Error(`fetch stub exhausted for ${url}`)
    return new Response(JSON.stringify(next.body ?? {}), {
      status: next.status,
      headers: next.headers,
    })
  }
  return { fetchFn, calls }
}

const artist = (id: string, name: string) => ({ id, name })

describe('createSpotifyClient', () => {
  describe('getProfile', () => {
    it('returns spotifyUserId and displayName from /me', async () => {
      const { fetchFn, calls } = makeFetchStub([
        { status: 200, body: { id: 'spotify-user-1', display_name: 'Huey' } },
      ])
      const client = createSpotifyClient('token-abc', { fetchFn })
      const profile = await client.getProfile()
      expect(profile).toEqual({
        spotifyUserId: 'spotify-user-1',
        displayName: 'Huey',
      })
      expect(calls[0]?.url).toBe('https://api.spotify.com/v1/me')
      expect(calls[0]?.authorization).toBe('Bearer token-abc')
    })

    it('maps a missing display_name to null', async () => {
      const { fetchFn } = makeFetchStub([
        { status: 200, body: { id: 'spotify-user-2', display_name: null } },
      ])
      const client = createSpotifyClient('tok', { fetchFn })
      const profile = await client.getProfile()
      expect(profile.displayName).toBeNull()
    })
  })

  describe('getFollowedArtists', () => {
    it('paginates via the after cursor until exhausted', async () => {
      const { fetchFn, calls } = makeFetchStub([
        {
          status: 200,
          body: {
            artists: {
              items: [artist('a1', 'Alpha'), artist('a2', 'Beta')],
              cursors: { after: 'cursor-1' },
            },
          },
        },
        {
          status: 200,
          body: {
            artists: {
              items: [artist('a3', 'Gamma')],
              cursors: { after: null },
            },
          },
        },
      ])
      const client = createSpotifyClient('tok', { fetchFn })
      const artists = await client.getFollowedArtists()
      expect(artists.map((entry) => entry.id)).toEqual(['a1', 'a2', 'a3'])
      expect(calls).toHaveLength(2)
      expect(calls[0]?.url).toContain('/me/following?type=artist&limit=50')
      expect(calls[1]?.url).toContain('after=cursor-1')
    })

    it('returns an empty list when the user follows no one', async () => {
      const { fetchFn } = makeFetchStub([
        {
          status: 200,
          body: { artists: { items: [], cursors: { after: null } } },
        },
      ])
      const client = createSpotifyClient('tok', { fetchFn })
      expect(await client.getFollowedArtists()).toEqual([])
    })

    it('throws SpotifyApiError on an unexpected response shape', async () => {
      const { fetchFn } = makeFetchStub([{ status: 200, body: { nope: true } }])
      const client = createSpotifyClient('tok', { fetchFn })
      await expect(client.getFollowedArtists()).rejects.toBeInstanceOf(
        SpotifyApiError,
      )
    })

    it('fails rather than truncating when the page cap is hit with a live cursor', async () => {
      // 20 pages (the cap), each still advertising a next cursor. Returning a
      // truncated set here would let the replace-set sync delete real follows.
      const pages: StubResponse[] = Array.from({ length: 20 }, (_, i) => ({
        status: 200,
        body: {
          artists: {
            items: [artist(`a${i}`, `Artist ${i}`)],
            cursors: { after: `cursor-${i}` },
          },
        },
      }))
      const { fetchFn, calls } = makeFetchStub(pages)
      const client = createSpotifyClient('tok', { fetchFn })
      await expect(client.getFollowedArtists()).rejects.toBeInstanceOf(
        SpotifyApiError,
      )
      expect(calls).toHaveLength(20)
    })
  })

  describe('getTopArtists', () => {
    it('fetches a single medium_term page of 50', async () => {
      const { fetchFn, calls } = makeFetchStub([
        { status: 200, body: { items: [artist('t1', 'Top One')] } },
      ])
      const client = createSpotifyClient('tok', { fetchFn })
      const top = await client.getTopArtists()
      expect(top).toEqual([{ id: 't1', name: 'Top One' }])
      expect(calls[0]?.url).toContain(
        '/me/top/artists?time_range=medium_term&limit=50',
      )
      expect(calls).toHaveLength(1)
    })
  })

  describe('error handling', () => {
    it('throws SpotifyAuthError on 401', async () => {
      const { fetchFn } = makeFetchStub([{ status: 401 }])
      const client = createSpotifyClient('tok', { fetchFn })
      await expect(client.getProfile()).rejects.toBeInstanceOf(SpotifyAuthError)
    })

    it('sleeps Retry-After seconds and retries once on 429', async () => {
      const sleeps: number[] = []
      const { fetchFn, calls } = makeFetchStub([
        { status: 429, headers: { 'Retry-After': '3' } },
        { status: 200, body: { items: [artist('t1', 'Top One')] } },
      ])
      const client = createSpotifyClient('tok', {
        fetchFn,
        sleepFn: async (ms) => {
          sleeps.push(ms)
        },
      })
      const top = await client.getTopArtists()
      expect(top).toHaveLength(1)
      expect(sleeps).toEqual([3000])
      expect(calls).toHaveLength(2)
    })

    it('honors an HTTP-date Retry-After header', async () => {
      const sleeps: number[] = []
      const { fetchFn } = makeFetchStub([
        {
          status: 429,
          headers: {
            'Retry-After': new Date(Date.now() + 5000).toUTCString(),
          },
        },
        { status: 200, body: { items: [artist('t1', 'Top One')] } },
      ])
      const client = createSpotifyClient('tok', {
        fetchFn,
        sleepFn: async (ms) => {
          sleeps.push(ms)
        },
      })
      await client.getTopArtists()
      // toUTCString truncates to whole seconds, so allow a generous window
      expect(sleeps[0]).toBeGreaterThan(2000)
      expect(sleeps[0]).toBeLessThanOrEqual(5000)
    })

    it('refuses to sleep out a Retry-After longer than the ceiling', async () => {
      const sleeps: number[] = []
      const { fetchFn, calls } = makeFetchStub([
        { status: 429, headers: { 'Retry-After': '3600' } },
        { status: 200, body: { items: [artist('t1', 'Top One')] } },
      ])
      const client = createSpotifyClient('tok', {
        fetchFn,
        sleepFn: async (ms) => {
          sleeps.push(ms)
        },
      })
      await expect(client.getTopArtists()).rejects.toBeInstanceOf(
        SpotifyRateLimitError,
      )
      // The point of the ceiling: no wait at all, and no second request.
      expect(sleeps).toEqual([])
      expect(calls).toHaveLength(1)
    })

    it('still sleeps a Retry-After sitting exactly on the ceiling', async () => {
      const sleeps: number[] = []
      const { fetchFn } = makeFetchStub([
        {
          status: 429,
          headers: { 'Retry-After': String(MAX_RETRY_AFTER_MS / 1000) },
        },
        { status: 200, body: { items: [artist('t1', 'Top One')] } },
      ])
      const client = createSpotifyClient('tok', {
        fetchFn,
        sleepFn: async (ms) => {
          sleeps.push(ms)
        },
      })
      await client.getTopArtists()
      expect(sleeps).toEqual([MAX_RETRY_AFTER_MS])
    })

    it('throws SpotifyRateLimitError on a second consecutive 429', async () => {
      const { fetchFn, calls } = makeFetchStub([
        { status: 429, headers: { 'Retry-After': '1' } },
        { status: 429, headers: { 'Retry-After': '900' } },
      ])
      const client = createSpotifyClient('tok', {
        fetchFn,
        sleepFn: async () => {},
      })
      const failure = await client.getTopArtists().catch((err: unknown) => err)
      expect(failure).toBeInstanceOf(SpotifyRateLimitError)
      // The message must carry the *second* Retry-After, not the 1s already
      // slept: it is the only record of how long the cooldown actually runs.
      if (failure instanceof SpotifyRateLimitError) {
        expect(failure.message).toContain('900s')
      }
      expect(calls).toHaveLength(2)
    })

    it('throws SpotifyApiError carrying the status on 5xx', async () => {
      const { fetchFn } = makeFetchStub([{ status: 503 }])
      const client = createSpotifyClient('tok', { fetchFn })
      const failure = await client.getProfile().catch((err: unknown) => err)
      expect(failure).toBeInstanceOf(SpotifyApiError)
      if (failure instanceof SpotifyApiError) {
        expect(failure.status).toBe(503)
      }
    })
  })

  it('gives up on a Spotify endpoint that accepts the connection and never answers', async () => {
    // A hang, not an error: without the deadline this fetch never settles and
    // the caller (a cron run) blocks silently forever.
    const hangingFetch: typeof fetch = (_input, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          reject(new DOMException('Aborted', 'AbortError'))
        })
      })

    await expect(
      fetchWithTimeout(hangingFetch, 'https://api.spotify.com/v1/me', {}, 20),
    ).rejects.toBeInstanceOf(SpotifyTimeoutError)
  })

  it('keeps the query string out of the timeout message', async () => {
    const hangingFetch: typeof fetch = (_input, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          reject(new DOMException('Aborted', 'AbortError'))
        })
      })

    const failure = await fetchWithTimeout(
      hangingFetch,
      'https://api.spotify.com/v1/search?q=khruangbin&type=artist',
      {},
      20,
    ).catch((err: unknown) => err)

    expect(failure).toBeInstanceOf(SpotifyTimeoutError)
    if (failure instanceof SpotifyTimeoutError) {
      expect(failure.message).toContain('https://api.spotify.com/v1/search')
      expect(failure.message).not.toContain('khruangbin')
    }
  })

  it('lets a real network error through even after the deadline elapses', async () => {
    // The connection dies on its own, slowly enough that the deadline has
    // already fired by the time the rejection surfaces. Reporting that as a
    // timeout would bury the actual cause.
    const failingFetch: typeof fetch = async () => {
      await new Promise((resolve) => setTimeout(resolve, 40))
      throw new TypeError('fetch failed')
    }

    const failure = await fetchWithTimeout(
      failingFetch,
      'https://api.spotify.com/v1/me',
      {},
      10,
    ).catch((err: unknown) => err)

    expect(failure).toBeInstanceOf(TypeError)
    expect(failure).not.toBeInstanceOf(SpotifyTimeoutError)
  })

  it('keeps a caller-supplied signal alongside the timeout', async () => {
    const controller = new AbortController()
    const hangingFetch: typeof fetch = (_input, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          reject(new DOMException('Aborted', 'AbortError'))
        })
      })

    const pending = fetchWithTimeout(
      hangingFetch,
      'https://api.spotify.com/v1/me',
      { signal: controller.signal },
      60_000,
    )
    controller.abort()

    // The caller's abort wins, so it surfaces as an abort, not a timeout.
    await expect(pending).rejects.not.toBeInstanceOf(SpotifyTimeoutError)
  })

  it('counts every HTTP call for cost tracking (E10)', async () => {
    const { fetchFn } = makeFetchStub([
      { status: 200, body: { id: 'u', display_name: 'x' } },
      { status: 200, body: { items: [] } },
    ])
    const client = createSpotifyClient('tok', { fetchFn })
    await client.getProfile()
    await client.getTopArtists()
    expect(client.getCallCount()).toBe(2)
  })
})
