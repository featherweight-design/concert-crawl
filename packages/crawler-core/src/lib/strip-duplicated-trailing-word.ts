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
 * `canonicalize_title` correctly produces two different keys — they ARE
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
 * Only applied to the cleaned `title` field. NEVER applied to `rawTitle`,
 * which the system prompt and downstream cross-venue routing (#826)
 * require to be byte-for-byte verbatim from the source page.
 */

// `\b(\w+)\s+\1\s*$/i`
//   \b      — word boundary so we capture a whole token
//   (\w+)   — the trailing word (letters / digits / underscores)
//   \s+     — one-or-more whitespace separating the two occurrences
//             (rules out comma-separated repeats like "New York, New York"
//             and hyphen-joined repeats like "Edition-Edition")
//   \1      — backreference to the captured token (case-insensitive via /i)
//   \s*$    — optional trailing whitespace, then end-of-string
//             (the end-anchor is what keeps "Hello Hello World" intact)
const DUPLICATED_TRAILING_WORD_REGEX = /\b(\w+)\s+\1\s*$/i

export function stripDuplicatedTrailingWord(title: string): string {
  if (typeof title !== 'string' || title.length === 0) {
    return title
  }

  // Single pass. "Edition Edition Edition" collapses to "Edition Edition"
  // (not "Edition") — the bug class is a single trailing duplication, and
  // iterating would risk eating a legitimate stylistic adjacent repeat
  // that the single-pass regex deliberately tolerates.
  return title.replace(DUPLICATED_TRAILING_WORD_REGEX, '$1')
}
