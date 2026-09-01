import { describe, expect, it, vi } from 'vitest'
import { ARTIST_MATCH_MIN_CONFIDENCE, matchArtist } from './artist-match.js'
import type { SpotifyArtistCandidate } from './spotify-app-client.js'

const candidate = (
  id: string,
  name: string,
  images: { url: string }[] = [],
): SpotifyArtistCandidate => ({
  id,
  name,
  images,
  // `/search` returns simplified artist objects, so this is always empty in
  // production too — the picker hydrates genres in a separate call.
  genres: [],
  spotifyUrl: `https://open.spotify.com/artist/${id}`,
})

const snapshotOf = (
  id: string,
  name: string,
  imageUrl: string | null = null,
) => ({
  id,
  name,
  imageUrl,
  genres: null,
  spotifyUrl: `https://open.spotify.com/artist/${id}`,
})

const searchReturning = (
  candidates: SpotifyArtistCandidate[],
): { search: ReturnType<typeof vi.fn> } => ({
  search: vi.fn().mockResolvedValue(candidates),
})

describe('matchArtist', () => {
  it('exposes a 1.0 bar today (a future fuzzy tier lowers the constant)', () => {
    expect(ARTIST_MATCH_MIN_CONFIDENCE).toBe(1.0)
  })

  it('matches a single exact canonical hit with the first image URL', async () => {
    const deps = searchReturning([
      candidate('sp1', 'Khruangbin', [
        { url: 'https://i.scdn.co/image/big' },
        { url: 'https://i.scdn.co/image/small' },
      ]),
      candidate('sp2', 'Khruangbin Tribute Band'),
    ])

    const result = await matchArtist('khruangbin', deps)

    expect(result).toEqual({
      status: 'matched',
      spotifyArtistId: 'sp1',
      confidence: 1,
      photoUrl: 'https://i.scdn.co/image/big',
      candidates: [
        snapshotOf('sp1', 'Khruangbin', 'https://i.scdn.co/image/big'),
        snapshotOf('sp2', 'Khruangbin Tribute Band'),
      ],
    })
    expect(deps.search).toHaveBeenCalledWith('khruangbin')
  })

  it('matches with a null photoUrl when the artist has no images', async () => {
    const deps = searchReturning([candidate('sp1', 'Khruangbin')])

    const result = await matchArtist('khruangbin', deps)

    expect(result).toEqual({
      status: 'matched',
      spotifyArtistId: 'sp1',
      confidence: 1,
      photoUrl: null,
      candidates: [snapshotOf('sp1', 'Khruangbin')],
    })
  })

  it('returns ambiguous when more than one exact candidate carries a photo', async () => {
    const deps = searchReturning([
      candidate('sp1', 'Nirvana', [{ url: 'https://i.scdn.co/image/one' }]),
      candidate('sp2', 'NIRVANA', [{ url: 'https://i.scdn.co/image/two' }]),
    ])

    const result = await matchArtist('nirvana', deps)

    expect(result).toEqual({
      status: 'ambiguous',
      spotifyArtistId: null,
      confidence: null,
      photoUrl: null,
      candidates: [
        snapshotOf('sp1', 'Nirvana', 'https://i.scdn.co/image/one'),
        snapshotOf('sp2', 'NIRVANA', 'https://i.scdn.co/image/two'),
      ],
    })
  })

  // The production shape this exists for: "Blue October" searches to the band
  // plus a silent namesake that uploaded no artwork at all.
  it('breaks a same-name tie toward the only candidate with a photo', async () => {
    const deps = searchReturning([
      candidate('sp1', 'blue october'),
      candidate('sp2', 'Blue October', [
        { url: 'https://i.scdn.co/image/big' },
        { url: 'https://i.scdn.co/image/small' },
      ]),
    ])

    const result = await matchArtist('blue october', deps)

    expect(result.status).toBe('matched')
    expect(result.spotifyArtistId).toBe('sp2')
    expect(result.photoUrl).toBe('https://i.scdn.co/image/big')
  })

  it('stays ambiguous when no exact candidate carries a photo', async () => {
    const deps = searchReturning([
      candidate('sp1', 'Nirvana'),
      candidate('sp2', 'NIRVANA'),
    ])

    const result = await matchArtist('nirvana', deps)

    expect(result.status).toBe('ambiguous')
    expect(result.spotifyArtistId).toBeNull()
  })

  // Three-way ties are the common production shape, not a hypothetical: the
  // photo only has to be unique, not the sole candidate.
  it('breaks a three-way tie when exactly one candidate has a photo', async () => {
    const deps = searchReturning([
      candidate('sp1', 'Wednesday'),
      candidate('sp2', 'WEDNESDAY', [{ url: 'https://i.scdn.co/image/one' }]),
      candidate('sp3', 'wednesday'),
    ])

    const result = await matchArtist('wednesday', deps)

    expect(result.status).toBe('matched')
    expect(result.spotifyArtistId).toBe('sp2')
  })

  it('returns no_match when the search comes back empty', async () => {
    const deps = searchReturning([])

    const result = await matchArtist('an artist that does not exist', deps)

    expect(result).toEqual({
      status: 'no_match',
      spotifyArtistId: null,
      confidence: null,
      photoUrl: null,
      candidates: [],
    })
  })

  // A wrong artist photo is worse than no photo (plan Task 8, brief §3.3).
  it('returns no_match on a near miss rather than guessing', async () => {
    const deps = searchReturning([
      candidate('sp1', 'The Beatles', [{ url: 'https://i.scdn.co/image/one' }]),
    ])

    const result = await matchArtist('beatles', deps)

    expect(result.status).toBe('no_match')
    expect(result.spotifyArtistId).toBeNull()
    expect(result.photoUrl).toBeNull()
  })

  it('treats duplicate Spotify ids as one candidate, not an ambiguity', async () => {
    const deps = searchReturning([
      candidate('sp1', 'Khruangbin', [{ url: 'https://i.scdn.co/image/one' }]),
      candidate('sp1', 'khruangbin'),
    ])

    const result = await matchArtist('khruangbin', deps)

    expect(result.status).toBe('matched')
    expect(result.spotifyArtistId).toBe('sp1')
    // Deduping happens before scoring, so the snapshot the caller persists
    // carries the same one-per-artist list the matcher judged.
    expect(result.candidates).toHaveLength(1)
  })

  // The snapshot is what lets the admin picker open on a search the match job
  // already paid for (#1525), so it has to survive the verdict that discards
  // everything else.
  it('snapshots every candidate on an unresolved verdict, not just the exact hits', async () => {
    const deps = searchReturning([
      candidate('sp1', 'The Beatles'),
      candidate('sp2', 'Beatles Karaoke'),
    ])

    const result = await matchArtist('beatles', deps)

    expect(result.status).toBe('no_match')
    expect(result.candidates.map((entry) => entry.id)).toEqual(['sp1', 'sp2'])
  })

  // `[]` would claim Spotify lists no genres. It cannot say that from a
  // `/search` response, which never carries them.
  it('records unhydrated genres as null rather than an empty list', async () => {
    const deps = searchReturning([candidate('sp1', 'Khruangbin')])

    const result = await matchArtist('khruangbin', deps)

    expect(result.candidates[0]?.genres).toBeNull()
  })

  // Tier 0. The canonical form of "Joslyn & the Sweet Compression" is "joslyn",
  // which ties with every other Joslyn Spotify returns — an ambiguity the
  // truncation invented, since the full billing is sitting in the results.
  it('resolves a truncated billing when one candidate carries the full name', async () => {
    const deps = searchReturning([
      candidate('sp1', 'Joslyn', [{ url: 'https://i.scdn.co/image/a' }]),
      candidate('sp2', 'Joslyn & the Sweet Compression', [
        { url: 'https://i.scdn.co/image/b' },
      ]),
      candidate('sp3', 'Joslyn James', [{ url: 'https://i.scdn.co/image/c' }]),
    ])

    const result = await matchArtist(
      'joslyn',
      deps,
      'Joslyn & the Sweet Compression',
    )

    expect(result.status).toBe('matched')
    expect(result.spotifyArtistId).toBe('sp2')
    expect(result.photoUrl).toBe('https://i.scdn.co/image/b')
  })

  // A real co-bill: no candidate is billed as both acts, so there is nothing to
  // resolve to and picking either one would be a guess.
  it('leaves a genuine co-headline bill ambiguous when no candidate carries it', async () => {
    const deps = searchReturning([
      candidate('sp1', 'Ziggy Marley', [{ url: 'https://i.scdn.co/image/a' }]),
      candidate('sp2', 'Ziggy Marley', [{ url: 'https://i.scdn.co/image/b' }]),
      candidate('sp3', 'Stephen Marley', [
        { url: 'https://i.scdn.co/image/c' },
      ]),
    ])

    const result = await matchArtist(
      'ziggy marley',
      deps,
      'Ziggy Marley & Stephen Marley',
    )

    expect(result.status).toBe('ambiguous')
    expect(result.spotifyArtistId).toBeNull()
  })

  // Two acts really do share the exact billing, so the full name settles
  // nothing and the row falls through to the usual tiers.
  it('does not resolve on the full name when several candidates carry it', async () => {
    const deps = searchReturning([
      candidate('sp1', 'Venus', [{ url: 'https://i.scdn.co/image/a' }]),
      candidate('sp2', 'Venus', [{ url: 'https://i.scdn.co/image/b' }]),
    ])

    const result = await matchArtist('venus', deps, 'Venus')

    expect(result.status).toBe('ambiguous')
  })

  // Case, diacritics and whitespace are folded — the billing is a raw venue
  // spelling and Spotify's casing is its own.
  it('folds case, diacritics and whitespace when comparing the full name', async () => {
    const deps = searchReturning([
      candidate('sp1', 'Sigur Rós', [{ url: 'https://i.scdn.co/image/a' }]),
      candidate('sp2', 'Sigur Ros Tribute'),
    ])

    const result = await matchArtist('sigur ros', deps, '  SIGUR   ROS  ')

    expect(result.status).toBe('matched')
    expect(result.spotifyArtistId).toBe('sp1')
  })

  // Every existing caller shape still has to work: no billing supplied means
  // the canonical tiers decide, exactly as before.
  it('falls back to the canonical tiers when no billing is supplied', async () => {
    const deps = searchReturning([
      candidate('sp1', 'Blue October', [{ url: 'https://i.scdn.co/image/a' }]),
      candidate('sp2', 'Blue October'),
    ])

    const result = await matchArtist('blue october', deps)

    expect(result.status).toBe('matched')
    expect(result.spotifyArtistId).toBe('sp1')
  })
})
