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
})
