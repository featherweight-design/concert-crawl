import { sql, type SQL } from 'drizzle-orm';

/**
 * A raw billed name folded the way `normalizeArtistName` folds it, minus the
 * separator split: NFD with combining marks stripped, lowercased, whitespace
 * collapsed. Used to pair a raw headliner with the canonical name it belongs
 * to, so `Beyoncé` pairs with `beyonce` and `Clipse` with `clipse`.
 *
 * Deliberately no separator split: an exact fold can never pair one act with a
 * billing that names another. The Latin Extended letters that do not decompose
 * (`Ø`, `ł`) are not mapped here, so a name carrying one simply does not pair
 * and falls back as it did before.
 *
 * `chr()` builds the U+0300–U+036F combining-mark range so no backslash escape
 * has to survive the template literal.
 */
export const foldedArtistName = (raw: SQL): SQL => sql`
  lower(regexp_replace(
    regexp_replace(normalize(btrim(${raw}), NFD), '[' || chr(768) || '-' || chr(879) || ']', '', 'g'),
    '[[:space:]]+', ' ', 'g'
  ))
`;
