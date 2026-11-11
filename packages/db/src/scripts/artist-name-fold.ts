import { sql, type SQL } from 'drizzle-orm';
import { latinExtendedSql } from '@concert-crawl/types';

/**
 * A raw billed name folded the way `normalizeArtistName` folds Latin names, minus the
 * separator split: NFD with combining marks stripped, the Latin Extended map
 * applied, lowercased, whitespace collapsed and trimmed. Used to pair a raw
 * headliner with the canonical name it belongs to, so `Beyoncé` pairs with
 * `beyonce`, `Røyksopp` with `royksopp` and `Clipse` with `clipse`.
 *
 * Deliberately no separator split: an exact fold can never pair one act with a
 * billing that names another.
 *
 * The same expression shape the canonical migrations and their parity test use
 * (`latinExtendedSql` around the NFD strip), so it stays tied to the JS map.
 * `chr()` builds the U+0300–U+036F combining-mark range so no escape has to
 * survive a template literal. `column` is typed to a fixed set of column
 * references, never input, which is what makes `sql.raw` safe here.
 *
 * Marks outside U+0300–U+036F are not stripped (JS strips every `\p{M}`), so
 * a name carrying one, such as Japanese dakuten or an Indic vowel sign, does
 * not pair and falls back as it did before this fold existed.
 * `artist-name-fold.integration.test.ts` pins it to the JS fold.
 */
// JS `\s`, which `normalizeArtistName` collapses: Postgres `[[:space:]]` alone
// misses the Unicode spaces (no-break, ideographic, the U+2000 block, BOM).
const JS_WHITESPACE_RUN = `'[[:space:]' || ${[
  0xa0, 0x1680, 0x2000, 0x2001, 0x2002, 0x2003, 0x2004, 0x2005, 0x2006, 0x2007,
  0x2008, 0x2009, 0x200a, 0x2028, 0x2029, 0x202f, 0x205f, 0x3000, 0xfeff,
]
  .map((code) => `chr(${code})`)
  .join(' || ')} || ']+'`;

/** The fixed column references the fold is applied to; never input. */
export type FoldableColumn =
  'raw.value' | 'billing.billed_name' | 'input.value' | 'spotify.spotify_name';

export const foldedArtistName = (column: FoldableColumn): SQL => {
  const marksStripped = `regexp_replace(normalize(${column}, NFD), '[' || chr(768) || '-' || chr(879) || ']', '', 'g')`;
  return sql.raw(
    `btrim(regexp_replace(lower(${latinExtendedSql(marksStripped)}), ${JS_WHITESPACE_RUN}, ' ', 'g'))`,
  );
};
