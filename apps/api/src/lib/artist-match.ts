// apps/api/src/lib/artist-match.ts
//
// Confidence-gated Spotify artist matcher (#1115, plan PR-C Task 8).
//
// Design brief §3.2 locks *that* matching is confidence-gated and leaves the
// scoring to engineering. The scoring, in order of authority:
//
//   1. canonicalizeArtist(candidate.name) === canonicalName → confidence 1.0.
//   2. More than one distinct Spotify artist clears (1) → `ambiguous`,
//      regardless of popularity. Guessing would put the wrong press photo on
//      a public page; a human resolves it from the admin queue.
//   3. Nothing clears (1) → `no_match`. There is deliberately NO fuzzy tier:
//      a wrong photo is worse than no photo, and the brief's §3.3 fallback
//      (IdentityArt plate) is a designed, shipped-quality state.
//
// The bar is the named constant ARTIST_MATCH_MIN_CONFIDENCE so a future fuzzy
// tier can lower it without a rewrite.
//
// Canonicalization reuses crawler-core's canonicalizeArtist — the same
// function the crawler and spotify-sync write with. A second normalizer here
// would reintroduce the SQL↔JS parity class of bug (the Ø/ø incident).
import { canonicalizeArtist } from '@concert-crawl/crawler-core/canonical'
import type { SpotifySearch } from './spotify-app-client.js'

/** Minimum confidence for a `matched` verdict. 1.0 = exact canonical equality. */
export const ARTIST_MATCH_MIN_CONFIDENCE = 1.0

/** Score awarded to an exact canonical-name equality. */
const EXACT_MATCH_CONFIDENCE = 1.0

export type ArtistMatchStatus = 'matched' | 'ambiguous' | 'no_match'

export interface ArtistMatchResult {
  status: ArtistMatchStatus
  spotifyArtistId: string | null
  confidence: number | null
  photoUrl: string | null
}

export interface ArtistMatchDeps {
  search: SpotifySearch
}

const unresolved = (status: ArtistMatchStatus): ArtistMatchResult => ({
  status,
  spotifyArtistId: null,
  confidence: null,
  photoUrl: null,
})

/**
 * Resolve a canonical artist name to a Spotify artist identity.
 *
 * `canonicalName` is expected to already be canonical (it comes from
 * `artists.canonical_name`), but candidate names are canonicalized here
 * before comparison.
 */
export const matchArtist = async (
  canonicalName: string,
  deps: ArtistMatchDeps,
): Promise<ArtistMatchResult> => {
  const candidates = await deps.search(canonicalName)

  // Score, then gate on the bar. There is one scoring tier today (exact
  // canonical equality); a fuzzy tier would add a score here and lower the
  // constant, and this gate would need no change.
  const scored = candidates.map((candidate) => ({
    candidate,
    confidence:
      canonicalizeArtist(candidate.name) === canonicalName
        ? EXACT_MATCH_CONFIDENCE
        : 0,
  }))
  const exact = scored
    .filter((entry) => entry.confidence >= ARTIST_MATCH_MIN_CONFIDENCE)
    .map((entry) => entry.candidate)

  // Spotify can echo the same artist twice across a paged/rescored result.
  // Distinctness is by id, not by name — two rows for one artist are one
  // artist, not an ambiguity.
  const distinctIds = new Set(exact.map((candidate) => candidate.id))

  if (distinctIds.size === 0) return unresolved('no_match')
  if (distinctIds.size > 1) return unresolved('ambiguous')

  // Prefer the first occurrence that actually carries an image — Spotify
  // orders images widest-first, so images[0] is the best available.
  const withImage = exact.find((candidate) => candidate.images.length > 0)
  const winner = withImage ?? exact[0]
  if (winner === undefined) return unresolved('no_match')

  return {
    status: 'matched',
    spotifyArtistId: winner.id,
    confidence: EXACT_MATCH_CONFIDENCE,
    photoUrl: winner.images[0]?.url ?? null,
  }
}
