// Which of a row's Spotify candidates the picker should highlight (#1525).
//
// An `ambiguous` row is one where two or more artists carry the same
// canonicalized name, so the matcher refused to guess. The admin then has to
// adjudicate a list of identical names, often for artists they have never
// heard of. Popularity is the only signal already in the snapshot that
// separates them: `/search` returns simplified artist objects with no follower
// count, so anything else costs a second Spotify call per candidate.
//
// This is a suggestion, never a resolution. Nothing here feeds the matcher and
// ARTIST_MATCH_MIN_CONFIDENCE is untouched — the admin still clicks to apply.

interface Rankable {
  id: string
  popularity: number | null
}

export interface CandidateSuggestion {
  candidateId: string
  /**
   * How many times more popular the suggestion is than the runner-up. Null
   * when the runner-up scores zero, where the multiple is undefined but the
   * dominance is not in doubt.
   */
  ratio: number | null
}

/**
 * Twice as popular as the next candidate. Popularity is a 0-100 scale, so
 * closer than that puts two candidates in the same band and highlighting one
 * would be a coin flip wearing the clothes of an answer.
 */
export const SUGGESTION_MIN_RATIO = 2

export const suggestDominantCandidate = (
  candidates: Rankable[],
): CandidateSuggestion | null => {
  const scored: { id: string; popularity: number }[] = []
  for (const candidate of candidates) {
    // A candidate whose popularity we never read could outrank the leader, so
    // an unknown anywhere in the list disqualifies the whole comparison.
    if (candidate.popularity === null) return null
    scored.push({ id: candidate.id, popularity: candidate.popularity })
  }

  scored.sort((left, right) => right.popularity - left.popularity)
  const top = scored[0]
  const runnerUp = scored[1]
  // Fewer than two candidates: there is nothing to disambiguate.
  if (top === undefined || runnerUp === undefined) return null

  if (top.popularity === 0) return null
  if (runnerUp.popularity === 0) return { candidateId: top.id, ratio: null }

  const ratio = top.popularity / runnerUp.popularity
  if (ratio < SUGGESTION_MIN_RATIO) return null
  return { candidateId: top.id, ratio }
}

/** `5` rather than `5.0`, `4.3` rather than `4.285714285714286`. */
export const formatDominanceRatio = (ratio: number): string =>
  ratio.toFixed(1).replace(/\.0$/, '')
