/**
 * Latin Extended characters that don't decompose into base + combining mark
 * under Unicode NFD normalization. Both `canonicalizeArtist` and
 * `canonicalizeTitle` apply this map after their NFD + combining-mark
 * stripping pass to catch precomposed letters with built-in modifications
 * (e.g. Ø is a single code point with a built-in stroke, not O + a combining
 * stroke; `String.prototype.normalize('NFD')` leaves it untouched).
 *
 * **Parity contract:** the SQL used by the migration backfills (currently
 * `0031_event_canonical_artist.sql`, `0043_event_canonical_title.sql` and
 * `0075_latin_extended_canonical.sql`) MUST produce byte-identical output to
 * this map. Drift between the SQL and JS sides causes silent ON CONFLICT
 * misses + duplicate-key failures against the
 * `events_venue_date_canonical_artist_showtime_idx` unique index. See the
 * memory note `feedback_migration_js_parity` for the 2026-06-17 Ø/ø incident
 * this rule encodes. `packages/db/src/latin-extended-sql.test.ts` enforces
 * the contract statically against the migration files, and
 * `packages/crawler-core/src/lib/canonical-artist.parity.integration.test.ts`
 * enforces it against a real Postgres.
 *
 * **The 1→1 / 1→N split is load-bearing.** Postgres `translate()` is strictly
 * positional: it maps one character to one character and silently DROPS a
 * source character whose position has no counterpart in the target string.
 * `Æ` → `ae` therefore cannot go through `translate()` at all — it has to be a
 * `replace()`. The two maps below keep that distinction explicit so the SQL
 * generators can never mix them up.
 */

/**
 * Characters whose replacement is exactly one character. Safe for Postgres
 * `translate()`.
 */
export const LATIN_EXTENDED_SINGLE: Record<string, string> = {
  Ø: 'O',
  ø: 'o',
  Ł: 'L',
  ł: 'l',
  Ð: 'D', // Icelandic eth
  ð: 'd',
  Đ: 'D', // Croatian / Serbian d-with-stroke (distinct code point from Ð)
  đ: 'd',
}

/**
 * Characters whose replacement is more than one character. These MUST be
 * handled with `replace()` in SQL — `translate()` would truncate them.
 *
 * `ẞ` (U+1E9E, capital sharp s) is included alongside `ß` so the uppercase
 * form has coverage; `lower('ẞ')` is `ß` in both Postgres and JS, but the map
 * runs before the lowercasing pass so both need an entry.
 */
export const LATIN_EXTENDED_MULTI: Record<string, string> = {
  Æ: 'AE',
  æ: 'ae',
  Œ: 'OE',
  œ: 'oe',
  ß: 'ss',
  ẞ: 'SS',
  Þ: 'TH', // Icelandic thorn
  þ: 'th',
}

/**
 * The full map consumed by `canonicalizeArtist` / `canonicalizeTitle`.
 */
export const LATIN_EXTENDED_MAP: Record<string, string> = {
  ...LATIN_EXTENDED_SINGLE,
  ...LATIN_EXTENDED_MULTI,
}

/**
 * Character class used by the regex that consumes LATIN_EXTENDED_MAP. Derived
 * from the map's keys so adding a new mapping can never leave the regex
 * narrower than the map. Every key is a letter, so none of them carry a
 * character-class meaning that would need escaping.
 */
export const LATIN_EXTENDED_REGEX = new RegExp(
  `[${Object.keys(LATIN_EXTENDED_MAP).join('')}]`,
  'g',
)

/**
 * `from` argument for the Postgres `translate()` call — the 1→1 keys, in
 * declaration order.
 */
export const LATIN_EXTENDED_TRANSLATE_FROM = Object.keys(
  LATIN_EXTENDED_SINGLE,
).join('')

/**
 * `to` argument for the Postgres `translate()` call. Positionally aligned
 * with LATIN_EXTENDED_TRANSLATE_FROM by construction.
 */
export const LATIN_EXTENDED_TRANSLATE_TO = Object.values(
  LATIN_EXTENDED_SINGLE,
).join('')

/**
 * Builds the SQL expression that applies the whole map to `expr`. The 1→N
 * entries become nested `replace()` calls (applied first, outermost-last so
 * the reading order matches declaration order); the 1→1 entries become a
 * single `translate()` wrapped around the result.
 *
 * Every replacement value is ASCII and no key appears in any value, so the
 * order of the replace() chain relative to translate() cannot matter — no
 * substitution can reintroduce a character another substitution consumes.
 */
export function latinExtendedSql(expr: string): string {
  let sql = expr
  for (const [char, replacement] of Object.entries(LATIN_EXTENDED_MULTI)) {
    sql = `replace(${sql}, '${char}', '${replacement}')`
  }
  return `translate(${sql}, '${LATIN_EXTENDED_TRANSLATE_FROM}', '${LATIN_EXTENDED_TRANSLATE_TO}')`
}
