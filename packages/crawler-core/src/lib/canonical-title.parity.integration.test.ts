import { describe, it, expect } from 'vitest'
import { sql } from 'drizzle-orm'
import { db } from '@concert-crawl/db'
import { canonicalizeTitle } from './canonical-title.js'

/**
 * Parity test for canonical_title — confirms that the SQL normalization in
 * the migration backfill produces byte-identical output to the JS
 * canonicalizeTitle function on a curated set of inputs.
 *
 * Why this exists: see CLAUDE.md memory `feedback_migration_js_parity` on
 * the 2026-06-17 Ø/ø incident. Migration backfills shared columns must
 * match runtime JS output exactly, or ON CONFLICT lookups miss silently
 * once the index swap lands. This test pins the contract so any drift
 * surfaces immediately rather than at next prod re-crawl.
 *
 * Runs the same SQL expression used by migration 0043 against a literal
 * value (no test table needed). If 0043's char set ever changes, this
 * test's PARITY_SQL must change with it.
 */

// Curated edge-case inputs the SQL backfill and JS function must agree on.
// Each entry is documented with why it's a parity-critical case.
const PARITY_INPUTS: { label: string; input: string }[] = [
  // Plain ASCII — baseline that nothing weird happens.
  { label: 'plain ASCII', input: 'Yoga on the Rocks' },

  // Whitespace handling — collapsing runs to a single space.
  { label: 'collapsed whitespace', input: 'Yoga  on  the  Rocks' },
  { label: 'leading/trailing whitespace', input: '  Yoga on the Rocks  ' },

  // Diacritic decomposition via NFD + strip combining marks.
  // Both SQL (translate) and JS (NFD + LATIN_EXTENDED_MAP) cover the same
  // char set per the parity rule.
  { label: 'É with acute', input: 'Beyoncé World Tour' },
  { label: 'mixed diacritics', input: 'Mötley Crüe: The End' },

  // Latin Extended chars that don't decompose under NFD — the Ø/ø case
  // that bit canonical_artist on 2026-06-17. SQL handles via translate(),
  // JS handles via LATIN_EXTENDED_MAP.
  { label: 'Ø (precomposed, not NFD-decomposable)', input: 'Eivør Live' },
  { label: 'standalone Ø', input: 'Mötorhead Ø' },

  // Pre-decomposed input — base char + combining mark already split apart
  // (some upstream copy-paste / clipboard chains produce this). PR #822 R1
  // case from Copilot: JS strips the combining mark via /\p{M}/, SQL must
  // also strip via the NFD pass + combining-marks range or output diverges.
  { label: 'pre-decomposed e + combining acute', input: 'Beyoncé Live' },
  { label: 'pre-decomposed o + combining umlaut', input: 'Mötley Crüe' },

  // Punctuation preservation — title-specific characters that signal event
  // structure and must round-trip through canonicalization.
  { label: 'exclamation', input: 'BPM BINGO!' },
  { label: 'slash within token', input: 'AC/DC: Power Up' },
  { label: 'periods', input: 'M.I.A. Tour' },

  // Compound titles — the #821 dedup target. Both backfill and runtime
  // must produce the same canonical for these or post-swap re-crawls will
  // miss conflict.
  {
    label: 'compound brand-prefix',
    input: 'BPM BINGO! Dombresky / Walker & Royce Edition',
  },
  {
    label: 'multi-headliner billing',
    input: 'AEG Presents Sublime & Slightly Stoopid & 311 w/ Special Guests',
  },
  {
    label: 'feat. billing',
    input: 'Yoi Toki – A Future Funk/Vaporwave Party ft. Saint Pepsi',
  },
]

describe('canonical_title — SQL backfill / JS function parity', () => {
  it.each(PARITY_INPUTS)('matches on: $label', async ({ input }) => {
    // Inline the exact SQL expression from migration 0043. If the
    // migration's normalization changes, copy the new expression here
    // and update PARITY_INPUTS with any new edge cases.
    // Drizzle's db.execute over postgres-js returns the rows array
    // directly (postgres-js's RowList<Row>). Each row is an object with the
    // selected columns; the SELECT here yields exactly one row.
    const rows = await db.execute<{ canonical: string }>(sql`
      SELECT trim(
        regexp_replace(
          lower(
            translate(
              regexp_replace(
                normalize(${input}::text, NFD),
                '[̀-ͯ]', '', 'g'
              ),
              'ÀÁÂÃÄÅàáâãäåÈÉÊËèéêëÌÍÎÏìíîïÒÓÔÕÖØòóôõöøÙÚÛÜùúûüÝýÿÑñÇçŸŠšŽž',
              'AAAAAAaaaaaaEEEEeeeeIIIIiiiiOOOOOOooooooUUUUuuuuYyyNnCcYSsZz'
            )
          ),
          '\\s+', ' ', 'g'
        )
      ) AS canonical
    `)

    const sqlCanonical = (rows as unknown as { canonical: string }[])[0]
      ?.canonical
    const jsCanonical = canonicalizeTitle(input)

    expect(sqlCanonical).toBe(jsCanonical)
  })
})
