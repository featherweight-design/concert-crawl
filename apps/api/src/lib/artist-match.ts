// apps/api/src/lib/artist-match.ts
//
// Confidence-gated Spotify artist matcher (#1115, plan PR-C Task 8).
//
// Design brief §3.2 locks *that* matching is confidence-gated and leaves the
// scoring to engineering. The scoring, in order of authority:
//
//   0. The candidate's name equals the row's full billing, folded for case,
//      diacritics and whitespace but NOT truncated at a separator → the sole
//      such candidate wins. Runs first because it is strictly stronger than
//      (1): the truncation in (1) is itself what makes some of these rows
//      ambiguous. See the tier-0 comment in matchArtist.
//   1. canonicalizeArtist(candidate.name) === canonicalName → confidence 1.0.
//   2. More than one distinct Spotify artist clears (1) → the one carrying a
//      press photo wins, but only if it is the only one. Spotify's February
//      2026 developer-access change removed `popularity` and `followers` from
//      the artist object, so artwork is the sole remaining signal. Two
//      photographed namesakes → `ambiguous`, resolved by a human from the admin
//      queue; guessing there would put a stranger's photo on a public page.
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
import {
  canonicalizeArtist,
  normalizeArtistName,
} from '@concert-crawl/crawler-core/canonical'
import type { SpotifyCandidateSnapshot } from '@concert-crawl/db'
import type {
  SpotifyArtistCandidate,
  SpotifySearch,
} from './spotify-app-client.js'

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
  /**
   * Every distinct candidate the search returned, in Spotify's own order.
   * Surfaced so the caller can snapshot a search it has already paid for —
   * the matcher itself still decides on exact canonical equality alone.
   */
  candidates: SpotifyCandidateSnapshot[]
}

export interface ArtistMatchDeps {
  search: SpotifySearch
}

/** Trim a search hit to the fields the picker renders. */
export const toCandidateSnapshot = (
  candidate: SpotifyArtistCandidate,
): SpotifyCandidateSnapshot => ({
  id: candidate.id,
  name: candidate.name,
  imageUrl: candidate.images[0]?.url ?? null,
  // Search results always carry an empty list, so an empty one here would
  // claim Spotify lists no genres. Only a genre-hydrated snapshot may say that.
  genres: candidate.genres.length > 0 ? candidate.genres : null,
  spotifyUrl: candidate.spotifyUrl,
})

/** Spotify can echo one artist across a rescored result; keep first occurrences. */
export const dedupeCandidates = (
  candidates: SpotifyArtistCandidate[],
): SpotifyArtistCandidate[] => {
  const seen = new Set<string>()
  return candidates.filter((candidate) => {
    if (seen.has(candidate.id)) return false
    seen.add(candidate.id)
    return true
  })
}

const unresolved = (
  status: ArtistMatchStatus,
  candidates: SpotifyCandidateSnapshot[],
): ArtistMatchResult => ({
  status,
  spotifyArtistId: null,
  confidence: null,
  photoUrl: null,
  candidates,
})

/**
 * Resolve a canonical artist name to a Spotify artist identity.
 *
 * `canonicalName` is expected to already be canonical (it comes from
 * `artists.canonical_name`), but candidate names are canonicalized here
 * before comparison.
 *
 * `billedName` is the row's display name — the full billing before
 * `canonicalizeArtist` truncated it at the first separator. Optional because
 * for most rows it folds to the same string; it only earns its keep on the
 * bills the truncation mangles.
 */
export const matchArtist = async (
  canonicalName: string,
  deps: ArtistMatchDeps,
  billedName?: string,
): Promise<ArtistMatchResult> => {
  const candidates = dedupeCandidates(await deps.search(canonicalName))
  const snapshot = candidates.map(toCandidateSnapshot)

  // Tier 0 — the full billing, compared before anything is truncated.
  //
  // canonicalizeArtist keeps only the first segment, so "Joslyn & the Sweet
  // Compression" becomes "joslyn" and then ties with Joslyn, Joslyn James and
  // Joslynn Prim. The truncation manufactured that ambiguity: Spotify returned
  // the exact full string as a candidate, and nothing else it returned matches
  // it. Comparing the whole billing settles the row outright.
  //
  // Strictly stronger evidence than tier 1, so it runs first — and it stays
  // silent unless exactly one candidate matches, which keeps a genuine co-bill
  // like "Ziggy Marley & Stephen Marley" (no candidate carries that name)
  // ambiguous rather than resolving it to one of the two acts.
  const billed = normalizeArtistName(billedName ?? '').trim()
  if (billed !== '') {
    const fullNameHits = candidates.filter(
      (candidate) => normalizeArtistName(candidate.name).trim() === billed,
    )
    const soleHit = fullNameHits.length === 1 ? fullNameHits[0] : undefined
    if (soleHit !== undefined) {
      return {
        status: 'matched',
        spotifyArtistId: soleHit.id,
        confidence: EXACT_MATCH_CONFIDENCE,
        photoUrl: soleHit.images[0]?.url ?? null,
        candidates: snapshot,
      }
    }
  }

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

  // Distinctness is by id, not by name — two rows for one artist are one
  // artist, not an ambiguity. `candidates` is already deduped by id, so this
  // is just a count of the exact hits.
  if (exact.length === 0) return unresolved('no_match', snapshot)

  // Several artists share a name, so the tie needs breaking on something other
  // than the name. A press photo is the only signal Spotify still exposes, and
  // it separates a touring act from a name-squatting upload often enough to be
  // worth acting on: "Blue October" returns the band and a silent namesake with
  // no artwork at all.
  //
  // It only decides when exactly one candidate carries one. Two photographed
  // namesakes is a real ambiguity, and picking between them would put a
  // stranger's press photo on a public artist page.
  const photographed = exact.filter((candidate) => candidate.images.length > 0)
  const winner =
    exact.length === 1
      ? exact[0]
      : photographed.length === 1
        ? photographed[0]
        : undefined
  if (winner === undefined) return unresolved('ambiguous', snapshot)

  return {
    status: 'matched',
    spotifyArtistId: winner.id,
    confidence: EXACT_MATCH_CONFIDENCE,
    photoUrl: winner.images[0]?.url ?? null,
    candidates: snapshot,
  }
}
