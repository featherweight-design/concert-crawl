/**
 * Concert Crawl — duplicated-trailing-word stripper for LLM-extracted
 * event titles (issue #851).
 *
 * Prod symptom: two Larimer Lounge rows for the same show, distinguishable
 * only by a trailing duplicated word:
 *   - "BPM BINGO! Dombresky / Walker & Royce Edition"          (clean)
 *   - "BPM BINGO! Dombresky / Walker & Royce Edition Edition"  (typo)
 *
 * Root cause: Claude Haiku's `title` output occasionally duplicates the
 * final word. The two variants survive PR #821's title-based dedup because
 * `canonicalizeTitle` correctly produces two different keys — they ARE
 * different strings, just one is malformed.
 *
 * Fix at the extractor boundary, not at the canonicalize layer.
 * canonical-title.ts (lines 33-38) explicitly declines to handle this:
 * collapsing "X X" at canonicalize time would also collapse legitimate
 * titles like "New York, New York" (and any future "Word Word" stylistic
 * choice). At the extractor we have a different contract — we're cleaning
 * malformed LLM output, not collapsing legitimately-similar titles — so a
 * narrower rule is safe here.
 *
 * The rule is deliberately tight:
 *   - The repeat must be at the END of the string (`$`).
 *   - The repeat must be separated by whitespace ONLY (`\s+`).
 *   - The match is case-insensitive on the word, but the kept variant
 *     preserves the FIRST occurrence's casing (the natural source casing
 *     before the LLM's trailing duplication).
 *
 * This keeps "New York, New York" (comma boundary) and "Hello Hello World"
 * (mid-string) untouched, while cleaning the exact LLM-glitch shape from
 * #851.
 *
 * rawTitle cross-check (#863): the tight rule above still false-positived
 * on legitimate titles that genuinely end in a repeated word — a real
 * Mission Ballroom bill ends in the band name "Bow Wow Wow", which the
 * regex would truncate to "Bow Wow". Because `rawTitle` is byte-for-byte
 * verbatim from the source page, it is the ground truth for whether the
 * repeat is real: if the doubled pair also appears in rawTitle (whole-word,
 * case-insensitive, any whitespace between), the source itself says the
 * repeat is intentional and the strip is skipped. Only when rawTitle lacks
 * the pair — or no rawTitle is provided — is the trailing repeat treated
 * as an LLM duplication glitch.
 *
 * Only applied to the cleaned `title` field. NEVER applied to `rawTitle`,
 * which the system prompt and downstream cross-venue routing (#826)
 * require to be byte-for-byte verbatim from the source page.
 */

// `(^|[^\p{L}\p{M}\p{N}_])([\p{L}\p{M}\p{N}_]+)\s+\2\s*$/iu`
//   (^|[^...])  — Unicode-aware word boundary: either start-of-string, or
//                  a character that is NOT a letter / mark / number / `_`.
//                  This replaces `\b`, which in JS is ASCII-only and would
//                  miss Unicode-letter titles like "Beyoncé Beyoncé".
//                  Captured (group 1) so the replace can put the boundary
//                  character back; the backreference uses group 2.
//   ([\p{L}\p{M}\p{N}_]+)
//                — the trailing word, made of Unicode letters (\p{L}),
//                  combining marks (\p{M}, for accented forms split into
//                  base + diacritic), Unicode digits (\p{N}), and `_`.
//                  Captures the token (group 2) for the `\2` backreference.
//   \s+         — one-or-more whitespace separating the two occurrences
//                  (rules out comma-separated repeats like "New York,
//                  New York" and hyphen-joined repeats like
//                  "Edition-Edition").
//   \2          — backreference to the captured token (case-insensitive
//                  via /i).
//   \s*$        — optional trailing whitespace, then end-of-string
//                  (the end-anchor is what keeps "Hello Hello World"
//                  intact).
//   /iu         — `u` enables Unicode mode (required for \p{...}); `i`
//                  keeps the duplicate match case-insensitive.
const DUPLICATED_TRAILING_WORD_REGEX =
  /(^|[^\p{L}\p{M}\p{N}_])([\p{L}\p{M}\p{N}_]+)\s+\2\s*$/iu

const UNICODE_WORD_CLASS = '[\\p{L}\\p{M}\\p{N}_]'
const NON_UNICODE_WORD_CLASS = '[^\\p{L}\\p{M}\\p{N}_]'

export function stripDuplicatedTrailingWord(
  title: string,
  rawTitle?: string,
): string {
  // Mirror the non-string guard shape used by canonicalizeTitle /
  // canonicalizeArtist (see canonical-title.ts:46-49): return '' rather
  // than the input so the declared `string` return type holds at runtime
  // even when an upstream caller bypasses TypeScript and passes
  // null / undefined / a number.
  if (typeof title !== 'string' || title.length === 0) {
    return ''
  }

  const match = title.match(DUPLICATED_TRAILING_WORD_REGEX)
  if (!match) {
    return title
  }

  // rawTitle cross-check (#863): if the verbatim source title also contains
  // the doubled pair as whole words, the repeat is real (e.g. the band
  // "Bow Wow Wow") — keep the title untouched. The word token is drawn from
  // the same [\p{L}\p{M}\p{N}_]+ class as the main regex, so it cannot
  // contain regex metacharacters and needs no escaping. Whole-word guards
  // on both sides prevent substring false negatives ("Edition Editions").
  if (typeof rawTitle === 'string' && rawTitle.length > 0) {
    const word = match[2]
    const doubledPairInRawTitle = new RegExp(
      `(?:^|${NON_UNICODE_WORD_CLASS})${word}\\s+${word}(?!${UNICODE_WORD_CLASS})`,
      'iu',
    )
    if (doubledPairInRawTitle.test(rawTitle)) {
      return title
    }
  }

  // Single pass. "Edition Edition Edition" collapses to "Edition Edition"
  // (not "Edition") — the bug class is a single trailing duplication, and
  // iterating would risk eating a legitimate stylistic adjacent repeat
  // that the single-pass regex deliberately tolerates.
  //
  // Replacement preserves group 1 (the boundary char, or empty if the
  // match started at the beginning of the string) and group 2 (the
  // first-occurrence word, in its original casing). The trailing repeat
  // + separating whitespace are dropped.
  return title.replace(DUPLICATED_TRAILING_WORD_REGEX, '$1$2')
}
