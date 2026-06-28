/**
 * Canonicalizes an event title into a stable identifier intended to be the
 * dedup key for events at the same venue + date. Title is more stable across
 * LLM extraction runs than `artist` — the LLM transcribes the listing's
 * headline string verbatim, while `artist` is the LLM's interpretation of
 * which substring of the title represents the headliner.
 *
 * Why this exists alongside `canonicalArtist`: see issue #821. The
 * canonical_artist key correctly collapses minor artist drift like
 * "Earl Sweatshirt" vs "Earl Sweatshirt & MIKE". It does not — and structurally
 * cannot — collapse the case where the LLM picks fundamentally different
 * substrings from a compound title across crawl runs (e.g. for "BPM BINGO!
 * Dombresky / Walker & Royce Edition" the LLM extracts "BPM BINGO!" on one
 * run, "Dombresky" on the next, "Dombresky / Walker & Royce" on a third).
 * Each variant produces a different canonical_artist and the unique index
 * misses, creating duplicate rows. Title-based dedup closes that gap.
 *
 * Rules (in order):
 *   1. Strip Markdown emphasis markers (`**`, `__`, `*`, `_`) wrapping a
 *      span of inner text — preserve the inner text. Closes the residual
 *      dupe case from issue #850 where the LLM occasionally emits styling
 *      around a trailing annotation (e.g. "Swing Nights Lindy Jam
 *      **TUESDAY 7/14**"). Markers are pure styling and never part of
 *      identity; inner text stays so a stylized headliner like
 *      "**Beyoncé** World Tour" does not lose its artist.
 *   2. NFD normalize + strip combining marks (diacritics).
 *   3. Map Latin Extended characters that don't decompose into base +
 *      combining mark — same LATIN_EXTENDED_MAP as canonical-artist.ts.
 *   4. Strip ALL apostrophe variants (curly U+2018, U+2019, U+201B and
 *      straight U+0027) outright in a single pass — the regex character
 *      class matches all four code points and replaces them with the
 *      empty string. This is what collapses real prod dupes like "Zed's
 *      Dead" vs "Zeds Dead". A curly→straight normalization step alone
 *      would still produce two distinct canonicals ("zed's" vs "zeds");
 *      stripping is what closes the gap. See issue #850.
 *   5. Lowercase.
 *   6. Collapse runs of whitespace to a single space.
 *   7. Trim.
 *
 * Deliberately does NOT split on separators (& / + ft. / etc.) the way
 * canonicalizeArtist does — titles legitimately use those tokens to convey
 * event structure (multi-headliner billings, brand-prefix titles) and
 * splitting would discard the parts that make titles distinguishable
 * between distinct shows.
 *
 * Punctuation (other than apostrophes) is preserved. "M.I.A." stays
 * "m.i.a.", "AC/DC" stays "ac/dc".
 *
 * Known edge case: LLM transcription typos that duplicate a trailing word
 * (e.g. "...Edition Edition") will NOT collapse to the typo-free variant.
 * These are rare enough to triage via the admin merge action (#820) rather
 * than encode a "collapse adjacent repeated words" rule that would break
 * legitimate titles like "New York, New York".
 *
 * Known edge case (#850): Markdown stripping preserves inner text, so a
 * recurring listing whose variants are "Foo" vs "Foo **TUESDAY 7/14**" still
 * canonicalizes to "foo" vs "foo tuesday 7/14" and stays distinct. Those
 * prefix-suffix pairs need a separate manual merge via the admin UI —
 * stripping the inner text entirely would discard real content from titles
 * that use bold for the headline rather than an annotation.
 */

import {
  LATIN_EXTENDED_MAP,
  LATIN_EXTENDED_REGEX,
} from './latin-extended-map.js'

// Markdown emphasis: bold (`**...**`, `__...__`) and italic (`*...*`,
// `_..._`). Two-character markers run first so the single-character pass
// doesn't half-strip a bold pair (`**foo**` → `*foo*` if `*` ran first).
// Inner group is `[\s\S]+?` (not `.+?`) so a marker pair spanning a
// newline still matches; `+?` (lazy, one-or-more) prevents collapsing
// `**foo** bar **baz**` into one giant match while still requiring
// non-empty inner content.
const MARKDOWN_BOLD_DOUBLE_STAR = /\*\*([\s\S]+?)\*\*/g
const MARKDOWN_BOLD_DOUBLE_UNDERSCORE = /__([\s\S]+?)__/g
const MARKDOWN_ITALIC_SINGLE_STAR = /\*([\s\S]+?)\*/g
const MARKDOWN_ITALIC_SINGLE_UNDERSCORE = /_([\s\S]+?)_/g

// Apostrophe variants seen in the wild — U+2018 LEFT, U+2019 RIGHT,
// U+201B SINGLE HIGH-REVERSED-9, U+0027 straight ASCII. All collapse to
// nothing (stripped) so "Zed's" and "Zeds" map to the same canonical.
const APOSTROPHE_VARIANTS = /['‘’‛]/g

export function canonicalizeTitle(title: string): string {
  if (typeof title !== 'string' || title.length === 0) {
    return ''
  }

  // Strip Markdown emphasis markers but preserve inner text. Bold pairs
  // first (two-char markers) so the italic pass doesn't half-strip them.
  const unstyled = title
    .replace(MARKDOWN_BOLD_DOUBLE_STAR, '$1')
    .replace(MARKDOWN_BOLD_DOUBLE_UNDERSCORE, '$1')
    .replace(MARKDOWN_ITALIC_SINGLE_STAR, '$1')
    .replace(MARKDOWN_ITALIC_SINGLE_UNDERSCORE, '$1')

  // NFD normalize + strip combining marks (Unicode property: M = Mark).
  const decomposed = unstyled.normalize('NFD').replace(/\p{M}/gu, '')

  // Handle the Latin Extended characters that don't decompose via NFD.
  // Map + regex live in latin-extended-map.ts so canonicalizeArtist and
  // canonicalizeTitle share the same set — see #648 follow-up.
  const stripped = decomposed.replace(
    LATIN_EXTENDED_REGEX,
    (char) => LATIN_EXTENDED_MAP[char] ?? char,
  )

  // Strip apostrophes (curly + straight). See APOSTROPHE_VARIANTS comment.
  const apostropheStripped = stripped.replace(APOSTROPHE_VARIANTS, '')

  // Lowercase + collapse whitespace + trim.
  return apostropheStripped.toLowerCase().replace(/\s+/g, ' ').trim()
}
