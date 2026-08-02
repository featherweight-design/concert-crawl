import { describe, expect, it, vi } from 'vitest'
import { ARTIST_MATCH_MIN_CONFIDENCE, matchArtist } from './artist-match.js'
import type { SpotifyArtistCandidate } from './spotify-app-client.js'

const candidate = (
  id: string,
  name: string,
  images: { url: string }[] = [],
): SpotifyArtistCandidate => ({ id, name, images, popularity: 50 })

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
    })
  })

  it('returns ambiguous when more than one candidate matches exactly', async () => {
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
    })
  })

  it('returns no_match when the search comes back empty', async () => {
    const deps = searchReturning([])

    const result = await matchArtist('an artist that does not exist', deps)

    expect(result).toEqual({
      status: 'no_match',
      spotifyArtistId: null,
      confidence: null,
      photoUrl: null,
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
  })
})
