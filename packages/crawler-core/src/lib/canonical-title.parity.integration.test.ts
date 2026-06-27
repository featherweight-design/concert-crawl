import { describe, it, expect } from 'vitest'
import { sql } from 'drizzle-orm'
import { db } from '@concert-crawl/db'
import { canonicalizeTitle } from './canonical-title.js'

/**
 * Parity test for canonical_title — confirms that the SQL normalization
 * used to recompute canonical_title in backfills produces byte-identical
 * output to the JS canonicalizeTitle function on a curated set of inputs.
 *
 * Why this exists: see CLAUDE.md memory `feedback_migration_js_parity` on
 * the 2026-06-17 Ø/ø incident. Backfills that touch the same column the
 * runtime crawler writes must match JS output exactly, or ON CONFLICT
 * lookups miss silently. This test pins the contract so any drift
 * surfaces immediately rather than at the next prod re-crawl.
 *
 * The SQL expression below is the canonical reference for "what SQL has
 * to look like to match canonicalizeTitle today". Migration 0043 is
 * frozen at the original (pre-#850) rule set — the in-flight #850
 * backfill recomputes via the JS function (no new SQL backfill exists
 * yet). When the next migration adds a fresh SQL backfill it MUST copy
 * the expression below verbatim.
 *
 * The SQL ordering matches canonicalizeTitle's JS ordering exactly:
 *   1. Markdown bold first (`**...**`, `__...__`), italic next
 *      (`*...*`, `_..._`). Two-char markers run before single-char so
 *      the italic pass doesn't half-strip a bold pair.
 *   2. NFD + strip combining marks.
 *   3. Latin Extended translate() — matches LATIN_EXTENDED_MAP.
 *   4. Strip apostrophe variants (curly + straight).
 *   5. Lowercase, collapse whitespace, trim.
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

  // Issue #850 — Markdown emphasis markers stripped, inner text kept.
  // Both forms (`**...**`, `__...__`, `*...*`, `_..._`) and a real prod
  // dupe shape (Swing Nights Lindy Jam trailing-annotation pattern).
  { label: 'Markdown bold **', input: 'Foo **Bar**' },
  { label: 'Markdown bold __', input: 'Foo __Bar__' },
  { label: 'Markdown italic *', input: 'Foo *Bar*' },
  { label: 'Markdown italic _', input: 'Foo _Bar_' },
  {
    label: 'real-prod trailing-annotation bold',
    input: 'Swing Nights Lindy Jam **TUESDAY 7/14**',
  },

  // Issue #850 — apostrophe variants stripped. All forms canonicalize
  // identically to the apostrophe-less variant.
  { label: 'curly right apostrophe', input: 'Earl Sweatshirt’s SICK! Tour' },
  { label: 'curly left apostrophe', input: 'Rock‘8 Roll' },
  { label: 'high-reversed-9 apostrophe', input: 'Don‛t Stop' },
  { label: 'straight apostrophe', input: "Zed's Dead" },
  {
    label: 'real-prod apostrophe dupe',
    input: 'BASS BINGO – Road to Zed’s Dead Jamboree!',
  },
]

describe('canonical_title — SQL backfill / JS function parity', () => {
  it.each(PARITY_INPUTS)('matches on: $label', async ({ input }) => {
    // Canonical reference SQL — must produce byte-identical output to
    // canonicalizeTitle. When the next backfill migration runs, copy
    // this expression verbatim. Order of operations matches the JS
    // function exactly.
    //
    // Drizzle's db.execute<T> over postgres-js returns the rows array as a
    // RowList<T>, which is iterable + indexable like a regular array. No
    // double-cast needed — the SELECT here yields exactly one row.
    //
    // Markdown stripping uses regexp_replace with a backref (`\1`) to
    // keep the inner text. The inner group uses POSIX `[^*]+` for `*`
    // markers and `[^_]+` for `_` markers — non-greedy quantifiers and
    // `.+?` aren't supported by Postgres' POSIX regex engine, so an
    // exclude-the-marker character class is the equivalent. Two-char
    // markers strip first (so single-char passes don't see the bold
    // pair); the 'g' flag runs each substitution across every match in
    // the title.
    //
    // Apostrophes (curly + straight) are stripped via translate() with
    // an empty replacement set — translate() drops any char in the
    // `from` argument that has no matching position in `to`.
    const rows = await db.execute<{ canonical: string }>(sql`
      WITH
        md_stripped AS (
          SELECT regexp_replace(
            regexp_replace(
              regexp_replace(
                regexp_replace(
                  ${input}::text,
                  '\\*\\*([^*]+)\\*\\*', '\\1', 'g'
                ),
                '__([^_]+)__', '\\1', 'g'
              ),
              '\\*([^*]+)\\*', '\\1', 'g'
            ),
            '_([^_]+)_', '\\1', 'g'
          ) AS val
        ),
        nfd AS (
          SELECT regexp_replace(
            normalize(val, NFD),
            '[̀-ͯ]', '', 'g'
          ) AS val
          FROM md_stripped
        ),
        latin AS (
          SELECT translate(
            val,
            'ÀÁÂÃÄÅàáâãäåÈÉÊËèéêëÌÍÎÏìíîïÒÓÔÕÖØòóôõöøÙÚÛÜùúûüÝýÿÑñÇçŸŠšŽž',
            'AAAAAAaaaaaaEEEEeeeeIIIIiiiiOOOOOOooooooUUUUuuuuYyyNnCcYSsZz'
          ) AS val
          FROM nfd
        ),
        apos AS (
          SELECT translate(val, '''‘’‛', '') AS val
          FROM latin
        )
      SELECT trim(
        regexp_replace(lower(val), '\\s+', ' ', 'g')
      ) AS canonical
      FROM apos
    `)

    const sqlCanonical = rows[0]?.canonical
    const jsCanonical = canonicalizeTitle(input)

    expect(sqlCanonical).toBe(jsCanonical)
  })
})
