/**
 * Canonicalizes an event title into a stable identifier intended to be the
 * dedup key for events at the same venue + date. Title is more stable across
 * LLM extraction runs than `artist` — the LLM transcribes the listing's
 * headline string verbatim, while `artist` is the LLM's interpretation of
 * which substring of the title represents the headliner.
 *
 * Why this exists alongside `canonicalArtist`: see issue #821. The
 * canonical_artist key correctly collapses minor artist drift like
 * "Earl Sweatshirt" vs "Earl Sweatshirt & MIKE". It does not — and structurally
 * cannot — collapse the case where the LLM picks fundamentally different
 * substrings from a compound title across crawl runs (e.g. for "BPM BINGO!
 * Dombresky / Walker & Royce Edition" the LLM extracts "BPM BINGO!" on one
 * run, "Dombresky" on the next, "Dombresky / Walker & Royce" on a third).
 * Each variant produces a different canonical_artist and the unique index
 * misses, creating duplicate rows. Title-based dedup closes that gap.
 *
 * Rules (in order):
 *   1. NFD normalize + strip combining marks (diacritics).
 *   2. Map Latin Extended characters that don't decompose into base +
 *      combining mark — same LATIN_EXTENDED_MAP as canonical-artist.ts.
 *   3. Lowercase.
 *   4. Collapse runs of whitespace to a single space.
 *   5. Trim.
 *
 * Deliberately does NOT split on separators (& / + ft. / etc.) the way
 * canonicalizeArtist does — titles legitimately use those tokens to convey
 * event structure (multi-headliner billings, brand-prefix titles) and
 * splitting would discard the parts that make titles distinguishable
 * between distinct shows.
 *
 * Punctuation is preserved. "M.I.A." stays "m.i.a.", "AC/DC" stays "ac/dc".
 *
 * Known edge case: LLM transcription typos that duplicate a trailing word
 * (e.g. "...Edition Edition") will NOT collapse to the typo-free variant.
 * These are rare enough to triage via the admin merge action (#820) rather
 * than encode a "collapse adjacent repeated words" rule that would break
 * legitimate titles like "New York, New York".
 */

// Latin Extended characters that don't decompose into base + combining mark
// under NFD. Must stay in sync with the SQL `translate()` char map in the
// migration that backfills canonical_title — drift here causes silent
// ON CONFLICT misses (see CLAUDE.md memory on the 2026-06-17 Ø/ø incident).
//
// Scope is intentionally narrow (just Ø/ø) — the only chars in the
// migration's translate() set that are NOT decomposable via NFD. Wider Latin
// Extended coverage (Ł, Æ, ß, Þ, etc.) is tracked as #648 and would update
// both this map and the migration's char map together.
const LATIN_EXTENDED_MAP: Record<string, string> = {
  Ø: 'O',
  ø: 'o',
}

export function canonicalizeTitle(title: string): string {
  if (typeof title !== 'string' || title.length === 0) {
    return ''
  }

  // NFD normalize + strip combining marks (Unicode property: M = Mark).
  const decomposed = title.normalize('NFD').replace(/\p{M}/gu, '')

  // Handle the Latin Extended characters that don't decompose via NFD.
  const stripped = decomposed.replace(
    /[Øø]/g,
    (char) => LATIN_EXTENDED_MAP[char] ?? char,
  )

  // Lowercase + collapse whitespace + trim.
  return stripped.toLowerCase().replace(/\s+/g, ' ').trim()
}
