import { beforeEach, describe, expect, it } from 'vitest'
import { asc } from 'drizzle-orm'
import { artists } from '@concert-crawl/db'
import { disambiguateArtistsWithMusicBrainz } from '@concert-crawl/db/scripts/musicbrainz-disambiguate'
import { testDb } from './helpers/db.js'
import { clearTables } from './helpers/seed.js'
import { MATCH_ATTEMPT_LIMIT } from '../lib/artist-exhaustion.js'

// The `ambiguous` queue is a human queue: more than one Spotify artist matched
// the name exactly, so the match job refused to guess. MusicBrainz breaks the
// tie because it is a curated identity database rather than a search index.
//
// The safety property under test is the cross-check. A MusicBrainz answer is
// only accepted when the Spotify ID it points at is already one of the
// candidates our own search snapshotted, so both sources have to independently
// name the same artist. Every test below is ultimately about that.
describe('musicbrainz-disambiguate integration', () => {
  beforeEach(async () => {
    await clearTables()
  })

  const listArtists = async () =>
    testDb.select().from(artists).orderBy(asc(artists.canonicalName))

  /**
   * IDs here are real Spotify base62, not readable placeholders. The URL
   * pattern the script reads relations with only accepts `[A-Za-z0-9]`, so a
   * hyphenated stand-in silently truncates and every cross-check fails for a
   * reason that has nothing to do with what is under test.
   */
  const candidate = (id: string, name: string) => ({
    id,
    name,
    imageUrl: null,
    genres: null,
    spotifyUrl: `https://open.spotify.com/artist/${id}`,
  })

  const seedAmbiguous = async (over: Partial<typeof artists.$inferInsert>) =>
    testDb.insert(artists).values({
      name: 'Mirrors',
      canonicalName: 'mirrors',
      slug: 'mirrors',
      matchStatus: 'ambiguous',
      spotifyCandidates: [
        candidate('1uNFoZAHBGtllmzznpCI3s', 'Mirrors'),
        candidate('06HL4z0CvFAxyc27GXpf02', 'Mirrors'),
      ],
      ...over,
    })

  /**
   * `fetch` accepts `RequestInfo | URL`, but every stub here only cares about
   * the URL. Narrowing here keeps the stubs cast-free.
   */
  const stubFetch =
    (respond: (url: string) => Promise<Response>): typeof fetch =>
    (input) =>
      respond(input instanceof Request ? input.url : input.toString())

  /**
   * Stands in for MusicBrainz. Routes on the two URL shapes the script uses,
   * so a test only has to say what the search and the lookup return.
   */
  const stubMusicBrainz = (responses: {
    search?: { id: string; name: string }[]
    relations?: { url?: { resource: string } }[]
  }): typeof fetch => {
    const body = (payload: unknown) =>
      Promise.resolve(
        new Response(JSON.stringify(payload), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
    return stubFetch((url) =>
      url.includes('/artist/?query=')
        ? body({ artists: responses.search ?? [] })
        : body({ relations: responses.relations ?? [] }),
    )
  }

  const noSleep = () => Promise.resolve()

  const run = (fetchImpl: typeof fetch, dryRun = false) =>
    disambiguateArtistsWithMusicBrainz(testDb, {
      dryRun,
      fetchImpl,
      sleepImpl: noSleep,
    })

  it('resolves a row both sources independently name', async () => {
    await seedAmbiguous({})

    const result = await run(
      stubMusicBrainz({
        search: [{ id: 'mbid-1', name: 'Mirrors' }],
        relations: [
          {
            url: {
              resource:
                'https://open.spotify.com/artist/06HL4z0CvFAxyc27GXpf02',
            },
          },
        ],
      }),
    )

    expect(result.resolved).toBe(1)
    expect(result.updated).toBe(1)
    const [row] = await listArtists()
    expect(row?.spotifyArtistId).toBe('06HL4z0CvFAxyc27GXpf02')
    expect(row?.matchStatus).toBe('matched')
  })

  it('records the resolution the way a hand-resolution is recorded', async () => {
    // The admin picker leaves `matchConfidence` null because no algorithm
    // scored the row, and clears the cached photo so the photo job re-fetches
    // against the identity just settled on. Anything else would leave a
    // stranger's face on the page.
    // Seeded one short of the limit rather than at zero: resolving has to clear
    // a partly-spent budget, or the row would carry those attempts into the
    // admin's `exhausted` queue if it ever came back. A fully spent budget
    // cannot be used here — the selection excludes it.
    await seedAmbiguous({
      photoUrl: 'https://i.scdn.co/image/stale',
      photoFetchedAt: new Date(),
      matchAttempts: MATCH_ATTEMPT_LIMIT - 1,
    })

    await run(
      stubMusicBrainz({
        search: [{ id: 'mbid-1', name: 'Mirrors' }],
        relations: [
          {
            url: {
              resource:
                'https://open.spotify.com/artist/1uNFoZAHBGtllmzznpCI3s',
            },
          },
        ],
      }),
    )

    const [row] = await listArtists()
    expect(row?.matchConfidence).toBeNull()
    expect(row?.photoUrl).toBeNull()
    expect(row?.photoFetchedAt).toBeNull()
    expect(row?.matchCheckedAt).not.toBeNull()
    expect(row?.matchAttempts).toBe(0)
  })

  it('refuses a MusicBrainz answer our own search never saw', async () => {
    // The whole safety property. Without it we would be trusting a bare name
    // match on precisely the names we already know are ambiguous.
    await seedAmbiguous({})

    const result = await run(
      stubMusicBrainz({
        search: [{ id: 'mbid-1', name: 'Mirrors' }],
        relations: [
          {
            url: {
              resource:
                'https://open.spotify.com/artist/3TVXtAsR1Inumwj472S9r4',
            },
          },
        ],
      }),
    )

    expect(result.resolved).toBe(0)
    expect(result.skipped['spotify-id-not-among-candidates']).toBe(1)
    const [row] = await listArtists()
    expect(row?.matchStatus).toBe('ambiguous')
    expect(row?.spotifyArtistId).toBeNull()
  })

  /** Two MusicBrainz artists bearing the name exactly — the ambiguity verdict. */
  const bothSourcesAmbiguous = () =>
    stubMusicBrainz({
      search: [
        { id: 'mbid-1', name: 'Mirrors' },
        { id: 'mbid-2', name: 'Mirrors' },
      ],
    })

  it('spends the budget on a row MusicBrainz finds as ambiguous as Spotify did', async () => {
    // Two independent catalogues have now said the name maps to more than one
    // act, so re-asking Spotify cannot break the tie. Spending the budget is
    // what moves the row out of the admin's `ambiguous` queue — it keeps its
    // candidates and its public page and simply stops being offered as work.
    await seedAmbiguous({})

    const result = await run(bothSourcesAmbiguous())

    expect(result.skipped['several-exact-name-matches']).toBe(1)
    expect(result.resolved).toBe(0)
    expect(result.exhausted).toBe(1)

    const [row] = await listArtists()
    expect(row?.matchAttempts).toBe(MATCH_ATTEMPT_LIMIT)
    // The verdict is untouched: exhaustion answers "have we stopped asking",
    // which is a different question from what the last search found.
    expect(row?.matchStatus).toBe('ambiguous')
    expect(row?.spotifyCandidates).toHaveLength(2)
  })

  it('does not reconsider a row whose budget is already spent', async () => {
    // A second pass must not re-buy a verdict it already paid for. The row
    // stays `ambiguous` after being exhausted, so the spent budget is the only
    // thing keeping it out of the selection.
    await seedAmbiguous({ matchAttempts: MATCH_ATTEMPT_LIMIT })

    const result = await run(bothSourcesAmbiguous())

    expect(result.considered).toBe(0)
    expect(result.skipped['several-exact-name-matches']).toBe(0)
    expect(result.exhausted).toBe(0)
  })

  it('does not spend the budget on a dry run', async () => {
    await seedAmbiguous({})

    const result = await run(bothSourcesAmbiguous(), true)

    expect(result.skipped['several-exact-name-matches']).toBe(1)
    expect(result.exhausted).toBe(0)
    const [row] = await listArtists()
    expect(row?.matchAttempts).toBe(0)
  })

  it('leaves the budget alone when MusicBrainz simply does not know the name', async () => {
    // Absence of evidence. MusicBrainz not carrying the artist says nothing
    // about whether Spotify's tie will break once the act releases something.
    await seedAmbiguous({})

    const result = await run(stubMusicBrainz({ search: [] }))

    expect(result.skipped['no-exact-name-match']).toBe(1)
    expect(result.exhausted).toBe(0)
    const [row] = await listArtists()
    expect(row?.matchAttempts).toBe(0)
  })

  it('leaves the budget alone when the sole MusicBrainz artist has no Spotify link', async () => {
    // The missing piece is a link an editor can add any day, so the row is
    // still worth re-asking.
    await seedAmbiguous({})

    const result = await run(
      stubMusicBrainz({
        search: [{ id: 'mbid-1', name: 'Mirrors' }],
        relations: [],
      }),
    )

    expect(result.skipped['no-spotify-link']).toBe(1)
    expect(result.exhausted).toBe(0)
    const [row] = await listArtists()
    expect(row?.matchAttempts).toBe(0)
  })

  it('compares names through the same canonicaliser the row was written with', async () => {
    // The row holds `sigur ros` and MusicBrainz holds `Sigur Rós`. Compared
    // raw, no diacritic-carrying artist could ever be resolved.
    await seedAmbiguous({
      name: 'Sigur Ros',
      canonicalName: 'sigur ros',
      slug: 'sigur-ros',
    })

    const result = await run(
      stubMusicBrainz({
        search: [{ id: 'mbid-1', name: 'Sigur Rós' }],
        relations: [
          {
            url: {
              resource:
                'https://open.spotify.com/artist/1uNFoZAHBGtllmzznpCI3s',
            },
          },
        ],
      }),
    )

    expect(result.resolved).toBe(1)
  })

  it('reads a Spotify link copied from a localised client', async () => {
    await seedAmbiguous({})

    const result = await run(
      stubMusicBrainz({
        search: [{ id: 'mbid-1', name: 'Mirrors' }],
        relations: [
          {
            url: {
              resource:
                'https://open.spotify.com/intl-de/artist/1uNFoZAHBGtllmzznpCI3s?si=abc',
            },
          },
        ],
      }),
    )

    expect(result.resolved).toBe(1)
  })

  it('skips a MusicBrainz artist linking two different Spotify artists', async () => {
    await seedAmbiguous({})

    const result = await run(
      stubMusicBrainz({
        search: [{ id: 'mbid-1', name: 'Mirrors' }],
        relations: [
          {
            url: {
              resource:
                'https://open.spotify.com/artist/1uNFoZAHBGtllmzznpCI3s',
            },
          },
          {
            url: {
              resource:
                'https://open.spotify.com/artist/06HL4z0CvFAxyc27GXpf02',
            },
          },
        ],
      }),
    )

    expect(result.skipped['several-spotify-links']).toBe(1)
    expect(result.resolved).toBe(0)
  })

  it('writes nothing on a dry run', async () => {
    await seedAmbiguous({})

    const result = await run(
      stubMusicBrainz({
        search: [{ id: 'mbid-1', name: 'Mirrors' }],
        relations: [
          {
            url: {
              resource:
                'https://open.spotify.com/artist/1uNFoZAHBGtllmzznpCI3s',
            },
          },
        ],
      }),
      true,
    )

    expect(result.resolved).toBe(1)
    expect(result.updated).toBe(0)
    const [row] = await listArtists()
    expect(row?.matchStatus).toBe('ambiguous')
  })

  it('never examines a row with no candidate snapshot', async () => {
    // The cross-check has nothing to compare against, so the row is not
    // reachable at all — it needs the match job to run again first.
    await seedAmbiguous({ spotifyCandidates: null })

    const result = await run(
      stubMusicBrainz({
        search: [{ id: 'mbid-1', name: 'Mirrors' }],
        relations: [
          {
            url: {
              resource:
                'https://open.spotify.com/artist/1uNFoZAHBGtllmzznpCI3s',
            },
          },
        ],
      }),
    )

    expect(result.considered).toBe(0)
    expect(result.resolved).toBe(0)
  })

  it('never touches a row that is not ambiguous', async () => {
    await seedAmbiguous({
      matchStatus: 'matched',
      spotifyArtistId: '1uNFoZAHBGtllmzznpCI3s',
    })

    const result = await run(
      stubMusicBrainz({
        search: [{ id: 'mbid-1', name: 'Mirrors' }],
        relations: [
          {
            url: {
              resource:
                'https://open.spotify.com/artist/06HL4z0CvFAxyc27GXpf02',
            },
          },
        ],
      }),
    )

    expect(result.considered).toBe(0)
    const [row] = await listArtists()
    expect(row?.spotifyArtistId).toBe('1uNFoZAHBGtllmzznpCI3s')
  })

  it('costs one row, not the run, when MusicBrainz cannot answer', async () => {
    await seedAmbiguous({})
    await seedAmbiguous({
      name: 'Zebra',
      canonicalName: 'zebra',
      slug: 'zebra',
    })

    const failing = stubFetch(() =>
      Promise.resolve(new Response('nope', { status: 500 })),
    )

    const result = await run(failing)

    expect(result.considered).toBe(2)
    expect(result.skipped['musicbrainz-unavailable']).toBe(2)
    expect(result.resolved).toBe(0)
  })

  it('retries a rate-limited request rather than losing the row', async () => {
    // 503 is MusicBrainz's documented rate-limit response.
    await seedAmbiguous({})

    let searchAttempts = 0
    const flaky = stubFetch((url) => {
      if (url.includes('/artist/?query=')) {
        searchAttempts += 1
        if (searchAttempts === 1) {
          return Promise.resolve(new Response('slow down', { status: 503 }))
        }
        return Promise.resolve(
          new Response(
            JSON.stringify({ artists: [{ id: 'mbid-1', name: 'Mirrors' }] }),
            {
              status: 200,
            },
          ),
        )
      }
      return Promise.resolve(
        new Response(
          JSON.stringify({
            relations: [
              {
                url: {
                  resource:
                    'https://open.spotify.com/artist/1uNFoZAHBGtllmzznpCI3s',
                },
              },
            ],
          }),
          { status: 200 },
        ),
      )
    })

    const result = await run(flaky)

    expect(searchAttempts).toBe(2)
    expect(result.resolved).toBe(1)
  })

  it('bounds every request so a stalled connection cannot wedge the run', async () => {
    // Nothing above the request loop watches the clock, so without a signal a
    // hung socket costs the whole queue rather than one row.
    await seedAmbiguous({})

    const signals: (AbortSignal | null | undefined)[] = []
    const capturing: typeof fetch = (_input, init) => {
      signals.push(init?.signal)
      return Promise.resolve(
        new Response(JSON.stringify({ artists: [] }), { status: 200 }),
      )
    }

    await run(capturing)

    expect(signals.length).toBeGreaterThan(0)
    for (const signal of signals) expect(signal).toBeInstanceOf(AbortSignal)
  })

  it('skips a row whose request aborts rather than failing the run', async () => {
    await seedAmbiguous({})
    await seedAmbiguous({
      name: 'Zebra',
      canonicalName: 'zebra',
      slug: 'zebra',
    })

    const aborting = stubFetch(() =>
      Promise.reject(
        new DOMException('The operation was aborted.', 'TimeoutError'),
      ),
    )

    const result = await run(aborting)

    expect(result.considered).toBe(2)
    expect(result.skipped['musicbrainz-unavailable']).toBe(2)
  })

  it('sends a name carrying Lucene metacharacters as a quoted phrase', async () => {
    // Band names carry every metacharacter freely. A quoted phrase neutralises
    // them, so only the quote itself and its escape need handling.
    await seedAmbiguous({
      name: 'Zed"s $UICIDEBOY',
      canonicalName: 'zed"s $uicideboy',
      slug: 'zeds-uicideboy',
    })

    let searchUrl = ''
    const capturing = stubFetch((url) => {
      if (url.includes('/artist/?query=')) searchUrl = url
      return Promise.resolve(
        new Response(JSON.stringify({ artists: [] }), { status: 200 }),
      )
    })

    await run(capturing)

    const query = decodeURIComponent(
      searchUrl.split('query=')[1]?.split('&')[0] ?? '',
    )
    expect(query).toBe('artist:"Zed\\"s $UICIDEBOY"')
  })
})
