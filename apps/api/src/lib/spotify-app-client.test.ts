import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createSpotifyAppClient,
  getAppToken,
  resetAppTokenCache,
} from './spotify-app-client.js'
import { SpotifyAuthError, SpotifyRateLimitError } from './spotify.js'

const tokenResponse = (accessToken: string, expiresIn = 3600): Response =>
  new Response(
    JSON.stringify({
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: expiresIn,
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  )

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

const withCredentials = (): void => {
  process.env['SPOTIFY_CLIENT_ID'] = 'test-client-id'
  process.env['SPOTIFY_CLIENT_SECRET'] = 'test-client-secret'
}

describe('getAppToken', () => {
  beforeEach(() => {
    resetAppTokenCache()
    delete process.env['SPOTIFY_CLIENT_ID']
    delete process.env['SPOTIFY_CLIENT_SECRET']
  })

  it('posts grant_type=client_credentials with a Basic auth header', async () => {
    withCredentials()
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(tokenResponse('t1'))

    const token = await getAppToken({ fetchFn })

    expect(token).toBe('t1')
    expect(fetchFn).toHaveBeenCalledTimes(1)
    const [url, init] = fetchFn.mock.calls[0] ?? []
    expect(url).toBe('https://accounts.spotify.com/api/token')
    expect(init?.method).toBe('POST')
    expect(init?.body).toBe('grant_type=client_credentials')
    const headers = new Headers(init?.headers)
    expect(headers.get('Content-Type')).toBe(
      'application/x-www-form-urlencoded',
    )
    expect(headers.get('Authorization')).toBe(
      `Basic ${Buffer.from('test-client-id:test-client-secret').toString('base64')}`,
    )
  })

  it('caches the token in-process until expires_in minus the 60s skew', async () => {
    withCredentials()
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(tokenResponse('t1'))
    let clock = 1_000_000

    const first = await getAppToken({ fetchFn, now: () => clock })
    clock += (3600 - 61) * 1000
    const second = await getAppToken({ fetchFn, now: () => clock })

    expect(first).toBe('t1')
    expect(second).toBe('t1')
    expect(fetchFn).toHaveBeenCalledTimes(1)
  })

  it('refetches once the cached token passes the skew-adjusted expiry', async () => {
    withCredentials()
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(tokenResponse('t1'))
      .mockResolvedValueOnce(tokenResponse('t2'))
    let clock = 1_000_000

    const first = await getAppToken({ fetchFn, now: () => clock })
    clock += (3600 - 59) * 1000
    const second = await getAppToken({ fetchFn, now: () => clock })

    expect(first).toBe('t1')
    expect(second).toBe('t2')
    expect(fetchFn).toHaveBeenCalledTimes(2)
  })

  it('throws SpotifyAuthError when Spotify rejects the credentials', async () => {
    withCredentials()
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response('nope', { status: 401 }))

    await expect(getAppToken({ fetchFn })).rejects.toBeInstanceOf(
      SpotifyAuthError,
    )
  })

  // Step 21 — the PR-C-skipped path. With the credentials unset the whole
  // feature must go quiet, not crash.
  describe('with credentials unset', () => {
    it('returns null without touching the network', async () => {
      const fetchFn = vi.fn<typeof fetch>()

      const token = await getAppToken({ fetchFn })

      expect(token).toBeNull()
      expect(fetchFn).not.toHaveBeenCalled()
    })

    it('returns null when only one of the two vars is set', async () => {
      process.env['SPOTIFY_CLIENT_ID'] = 'test-client-id'
      const fetchFn = vi.fn<typeof fetch>()

      expect(await getAppToken({ fetchFn })).toBeNull()
      expect(fetchFn).not.toHaveBeenCalled()
    })

    it('createSpotifyAppClient returns null so every caller no-ops', async () => {
      const fetchFn = vi.fn<typeof fetch>()

      const client = await createSpotifyAppClient({ fetchFn })

      expect(client).toBeNull()
      expect(fetchFn).not.toHaveBeenCalled()
    })
  })
})

describe('createSpotifyAppClient().searchArtists', () => {
  beforeEach(() => {
    resetAppTokenCache()
    withCredentials()
  })

  it('returns Zod-validated artist candidates', async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(tokenResponse('t1'))
      .mockResolvedValueOnce(
        jsonResponse({
          artists: {
            items: [
              {
                id: 'sp1',
                name: 'Khruangbin',
                images: [{ url: 'https://i.scdn.co/image/one' }],
                popularity: 70,
                genres: ['psychedelic soul'],
                external_urls: {
                  spotify: 'https://open.spotify.com/artist/sp1',
                },
              },
            ],
          },
        }),
      )

    const client = await createSpotifyAppClient({ fetchFn })
    const candidates = await client?.searchArtists('Khruangbin')

    expect(candidates).toEqual([
      {
        id: 'sp1',
        name: 'Khruangbin',
        images: [{ url: 'https://i.scdn.co/image/one' }],
        popularity: 70,
        genres: ['psychedelic soul'],
        spotifyUrl: 'https://open.spotify.com/artist/sp1',
      },
    ])
    const searchUrl = fetchFn.mock.calls[1]?.[0]
    expect(String(searchUrl)).toContain('/search?q=Khruangbin&type=artist')
  })

  it('defaults the fields Spotify omits rather than dropping the candidate', async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(tokenResponse('t1'))
      .mockResolvedValueOnce(
        jsonResponse({ artists: { items: [{ id: 'sp2', name: 'Nobody' }] } }),
      )

    const client = await createSpotifyAppClient({ fetchFn })
    const candidates = await client?.searchArtists('Nobody')

    expect(candidates).toEqual([
      {
        id: 'sp2',
        name: 'Nobody',
        images: [],
        popularity: null,
        genres: [],
        spotifyUrl: null,
      },
    ])
  })

  // Both URLs are rendered by the admin picker — the image as a src, the
  // profile as an href — so a non-http scheme is dropped rather than passed on.
  it('drops non-http URLs without dropping the candidate', async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(tokenResponse('t1'))
      .mockResolvedValueOnce(
        jsonResponse({
          artists: {
            items: [
              {
                id: 'sp3',
                name: 'Sketchy',
                // eslint-disable-next-line no-script-url
                images: [{ url: 'javascript:alert(1)' }],
                external_urls: { spotify: 'javascript:alert(1)' },
              },
            ],
          },
        }),
      )

    const client = await createSpotifyAppClient({ fetchFn })
    const candidates = await client?.searchArtists('Sketchy')

    expect(candidates).toEqual([
      {
        id: 'sp3',
        name: 'Sketchy',
        images: [],
        popularity: null,
        genres: [],
        spotifyUrl: null,
      },
    ])
  })

  it('surfaces a persistent 429 as SpotifyRateLimitError', async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(tokenResponse('t1'))
      .mockResolvedValue(
        new Response('slow down', {
          status: 429,
          headers: { 'Retry-After': '0' },
        }),
      )

    const client = await createSpotifyAppClient({ fetchFn })
    await expect(client?.searchArtists('Khruangbin')).rejects.toBeInstanceOf(
      SpotifyRateLimitError,
    )
  })
})
