/**
 * Latin Extended characters that don't decompose into base + combining mark
 * under Unicode NFD normalization. Both `canonicalizeArtist` and
 * `canonicalizeTitle` apply this map after their NFD + combining-mark
 * stripping pass to catch precomposed letters with built-in modifications
 * (e.g. Ø is a single code point with a built-in stroke, not O + a combining
 * stroke; `String.prototype.normalize('NFD')` leaves it untouched).
 *
 * **Parity contract:** the SQL `translate()` char map in the relevant
 * migration backfills (currently `0031_event_canonical_artist.sql` and
 * `0043_event_canonical_title.sql`) MUST match this map character-for-
 * character. Drift between SQL and JS sides causes silent ON CONFLICT
 * misses + duplicate-key failures once the corresponding unique index
 * is in place. See CLAUDE.md memory `feedback_migration_js_parity` for
 * the 2026-06-17 Ø/ø incident this rule encodes.
 *
 * Scope is intentionally narrow (Ø/ø only) — those are the only chars in
 * the existing migrations' `translate()` sets that are NOT decomposable
 * via NFD. Wider Latin Extended coverage (Ł, Æ, ß, Þ, Ð, Œ, Đ) is tracked
 * separately as #648 so any expansion updates this map AND both migration
 * char maps in lock-step. Centralizing here (rather than duplicating per
 * canonicalizer) means future-#648 can edit one file instead of two.
 */
export const LATIN_EXTENDED_MAP: Record<string, string> = {
  Ø: 'O',
  ø: 'o',
}

/**
 * Character class used by the regex that consumes LATIN_EXTENDED_MAP. Stays
 * in sync with the map's keys so adding a new mapping in one place doesn't
 * silently leave the regex narrower than the map. Currently `[Øø]` — the
 * #648 set will extend both this and the map together.
 */
export const LATIN_EXTENDED_REGEX = /[Øø]/g
