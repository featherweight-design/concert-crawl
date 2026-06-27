/**
 * Concert Crawl — description-field HTML stripper (issue #827)
 *
 * Several extractor sources (RHP-CMS-backed AEG venues, schema.org
 * `Event.description` markup, occasional LLM passthrough) ship the event
 * `description` field with embedded `<p>`, `<br>`, etc. The consumer
 * surface renders `description` as plain text (the safe default — we
 * never inject untrusted HTML into the DOM), so raw markup leaks through
 * to the user as visible "<p>" tag text.
 *
 * Fix is at extraction time: every code path that assigns
 * `NormalizedEvent.description` runs the source string through this
 * helper first. Stored output is always plain text; rendering the field
 * stays a no-escaping read. Re-crawl is idempotent — clean text round-
 * trips unchanged.
 *
 * Deliberately not a real HTML parser. The input shapes we actually see
 * (a few `<p>` paragraphs, `<br>` separators, light entity encoding) are
 * served by a tag-and-entity replace. Pulling in cheerio/parse5 would
 * add ~150KB to the crawler bundle for content quality that doesn't
 * benefit from a DOM.
 */

// Block-level tags split into two tiers so paragraph breaks render
// differently from list-item / row breaks. Paragraph closings produce
// blank lines (`\n\n`); tighter closings produce a single newline. Both
// tiers' OPENING tags drop to empty so adjacent `</p><p>` doesn't gain
// stray extra newlines before step 4 normalizes runs.
const PARAGRAPH_CLOSING = /<\/(p|div|h[1-6]|blockquote)\s*>/gi
const TIGHT_CLOSING = /<\/(li|tr)\s*>/gi
const BLOCK_OPENING = /<(p|div|li|tr|ul|ol|h[1-6]|blockquote)(\s[^>]*)?>/gi
const BR_TAG = /<br\s*\/?>/gi

// Greedy tag strip for anything left over after the block-level pass.
// Conservative — won't gracefully handle `<script>` content, but the
// extractors that feed this helper have already gone through `cleanHtml`
// (LLM path) or only see `schema.org` text (JSON-LD path), so script
// blocks shouldn't reach us.
const ANY_TAG = /<[^>]+>/g

// HTML entities — both named and numeric. Decoded BEFORE whitespace
// collapse so that a `&nbsp;` that re-expands to U+00A0 still gets
// folded into a regular space alongside any other run of whitespace.
const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
}
const NAMED_ENTITY_RE = /&([a-zA-Z]+);/g
const NUMERIC_ENTITY_RE = /&#(x?)([0-9a-fA-F]+);/g

function decodeEntities(input: string): string {
  return input
    .replace(NAMED_ENTITY_RE, (match, name: string) => {
      const decoded = NAMED_ENTITIES[name.toLowerCase()]
      return decoded ?? match
    })
    .replace(NUMERIC_ENTITY_RE, (match, isHex: string, digits: string) => {
      const code = parseInt(digits, isHex ? 16 : 10)
      if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return match
      try {
        return String.fromCodePoint(code)
      } catch {
        return match
      }
    })
}

/**
 * Strip HTML markup and decode entities in an event-description string.
 *
 * - Block-level tags (`<p>`, `<div>`, `<li>`, `<br>`, headings, etc.)
 *   collapse to newlines, preserving paragraph structure.
 * - All remaining tags strip to nothing.
 * - Named + numeric entities decode to their characters.
 * - Inline whitespace collapses to single spaces.
 * - Output is trimmed; already-clean text round-trips unchanged.
 * - Falsy input (null/undefined/empty) returns `''` without throwing.
 */
export function stripDescriptionHtml(html: string): string {
  if (!html) return ''

  // 1. Block boundaries → newlines. Closing tag emits `\n\n` (paragraph
  //    break); opening tag drops to empty so adjacent `</p><p>` doesn't
  //    gain a stray third newline before step 4 normalizes. The step-4
  //    `\n{3,}` collapse and per-line trim handle nested cases (`<ul><li>
  //    …</li></ul>`) and consecutive empty blocks. `<br>` is a single
  //    line break, not a paragraph break — matches the HTML rendering
  //    semantics consumers would have seen in a browser.
  let out = html
    .replace(BR_TAG, '\n')
    .replace(PARAGRAPH_CLOSING, '\n\n')
    .replace(TIGHT_CLOSING, '\n')
    .replace(BLOCK_OPENING, '')

  // 2. Any remaining tag (inline: <strong>, <a>, <span>, etc.) → empty.
  out = out.replace(ANY_TAG, '')

  // 3. Decode entities AFTER tag stripping so an entity that encodes a
  //    less-than sign doesn't accidentally get treated as a tag opener
  //    in step 2 (the entity escape is what kept it from being a tag in
  //    the source).
  out = decodeEntities(out)

  // 4. Whitespace cleanup.
  //    - Collapse runs of spaces / tabs (within a single line).
  //    - Collapse 3+ newlines down to exactly 2 (preserves paragraph
  //      breaks but kills accidental triple-spacing).
  //    - Trim trailing space on each line.
  out = out
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  return out
}
