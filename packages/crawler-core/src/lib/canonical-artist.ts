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

// Latin Extended characters that don't decompose into base + combining mark
// under NFD. Mirrors the SQL translate() char map in
// 0031_event_canonical_artist.sql so canonical values computed by this
// function match the canonical values the migration wrote for existing rows.
// Without this step, e.g. "Eivør" canonicalizes to "eivør" here but the
// existing DB row has canonical "eivor" — the crawler's ON CONFLICT
// (canonical_artist) target misses on re-crawl, and the legacy partial
// unique index on (venue_id, date, artist) fires with a duplicate-key
// violation, failing the entire batch INSERT.
//
// Scope is intentionally narrow (just Ø/ø) — those are the only chars in
// the migration's translate() set that are NOT decomposable via NFD. Wider
// Latin Extended coverage (Ł, Æ, ß, Þ, etc.) is tracked separately so any
// expansion can update both this map and the migration's char map together.
const LATIN_EXTENDED_MAP: Record<string, string> = {
  Ø: 'O',
  ø: 'o',
}

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

  // Handle the Latin Extended characters that don't decompose via NFD
  // (currently just Ø/ø — see LATIN_EXTENDED_MAP).
  const stripped = decomposed.replace(
    /[Øø]/g,
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
