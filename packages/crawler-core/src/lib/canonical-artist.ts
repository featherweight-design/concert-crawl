/**
 * Canonicalizes an artist string into a stable identifier intended to be
 * the future dedup key for events that are the same physical show.
 *
 * Different extraction passes (JSON-LD, LLM fallback, re-crawls over time)
 * can produce slightly different artist strings for the same Ogden Theatre
 * show — e.g. "Earl Sweatshirt" vs "Earl Sweatshirt & MIKE". This function
 * collapses those variants to a single canonical form so the new column
 * can act as the dedup signal once the unique index swaps.
 *
 * IMPORTANT — current state vs. eventual state:
 *
 *   - As of this PR the crawler writes canonical_artist on every upsert, but
 *     the upsert's ON CONFLICT target is still (venue_id, date, artist).
 *     That means artist-string drift will continue to produce new rows;
 *     this PR only ships the column + the population.
 *   - The unique-index swap from (venue_id, date, artist) to
 *     (venue_id, date, canonical_artist) is deferred to #608, which also
 *     consolidates existing duplicate rows. Once #608 lands, canonical_artist
 *     becomes the actual dedup key and new artist-string drift will collapse
 *     to a single bucket.
 *
 * Rules (in order):
 *   1. NFD normalize + strip combining marks (diacritics).
 *   2. Map Latin Extended characters that don't decompose into base +
 *      combining mark — e.g. Ø is a single precomposed letter with a built-in
 *      stroke, not O + a combining stroke. See LATIN_EXTENDED_MAP.
 *   3. Lowercase.
 *   4. Collapse runs of whitespace to a single space.
 *   5. Split on the first occurrence of any of: " & ", " w/ ", " ft. ",
 *      " feat. ", " featuring ", " with ", " + ", " x ", " — " (em-dash with
 *      spaces), " - " (hyphen with spaces). Hyphens without surrounding
 *      spaces are preserved so "blink-182" stays intact.
 *   6. Take the first segment and trim.
 *
 * Punctuation that appears in legitimate band names — "/", "!", "." — is
 * preserved. So "AC/DC" → "ac/dc", "P!nk" → "p!nk", "M.I.A." → "m.i.a.".
 *
 * Known false positive: "Earth, Wind & Fire" canonicalizes to "earth, wind"
 * because the rule fires on the embedded " & ". This is accepted scope; a
 * curated allowlist of exceptions can be layered on later if real-data
 * conflicts justify it.
 */

import {
  LATIN_EXTENDED_MAP,
  LATIN_EXTENDED_REGEX,
} from './latin-extended-map.js'

const SEPARATORS = [
  ' & ',
  ' w/ ',
  ' ft. ',
  ' feat. ',
  ' featuring ',
  ' with ',
  ' + ',
  ' x ',
  ' — ', // em-dash with spaces
  ' - ', // hyphen with spaces — does NOT match "blink-182" (no spaces)
] as const

export function canonicalizeArtist(artist: string): string {
  if (typeof artist !== 'string' || artist.length === 0) {
    return ''
  }

  // NFD normalize + strip combining marks (Unicode property: M = Mark).
  // Handles diacritics that are stored as base + combining mark.
  const decomposed = artist.normalize('NFD').replace(/\p{M}/gu, '')

  // Handle the Latin Extended characters that don't decompose via NFD.
  // Map + regex live in latin-extended-map.ts so canonicalizeArtist and
  // canonicalizeTitle share the same set — see #648 follow-up.
  const stripped = decomposed.replace(
    LATIN_EXTENDED_REGEX,
    (char) => LATIN_EXTENDED_MAP[char] ?? char,
  )

  // Lowercase + collapse whitespace.
  const compact = stripped.toLowerCase().replace(/\s+/g, ' ')

  // Find the earliest separator occurrence and split there.
  let firstSeparatorIdx = -1
  for (const separator of SEPARATORS) {
    const idx = compact.indexOf(separator)
    if (idx !== -1 && (firstSeparatorIdx === -1 || idx < firstSeparatorIdx)) {
      firstSeparatorIdx = idx
    }
  }

  const firstSegment =
    firstSeparatorIdx === -1 ? compact : compact.slice(0, firstSeparatorIdx)

  return firstSegment.trim()
}

/**
 * canonicalizeArtist applied element-wise to a supporting-artists array —
 * deduped, sorted, with empty-string results dropped. Backs the
 * events.canonical_supporting column (#763): the equality-match surface for
 * Spotify follow highlighting. Every writer of supporting_artists must write
 * canonical_supporting through this helper so the pair never drifts. Sorted
 * so the stored array is deterministic regardless of upstream ordering —
 * a re-crawl that only reorders supporting artists causes no DB churn.
 */
export function canonicalizeSupporting(artists: string[]): string[] {
  const seen = new Set<string>()
  for (const artist of artists) {
    const canonical = canonicalizeArtist(artist)
    if (canonical !== '') {
      seen.add(canonical)
    }
  }
  return [...seen].sort()
}
