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
// Self-closing paragraph-level tags — `<p/>`, `<div/>`, `<h2/>`, etc.
// Some AEG feeds emit these as paragraph separators; a browser renders
// the empty element with vertical margin, producing a paragraph break.
// Match that behavior with `\n\n`, same as an explicit `</p>` (#1132).
// Runs BEFORE BLOCK_OPENING so `<p/>` gets the break treatment instead
// of being stripped to empty.
const SELF_CLOSING_PARAGRAPH = /<(p|div|h[1-6]|blockquote)(\s[^>]*)?\/>/gi
const BLOCK_OPENING = /<(p|div|li|tr|ul|ol|h[1-6]|blockquote)(\s[^>]*)?>/gi
// Leading `\/?` covers the malformed `</br>` closing form of the void
// `<br>` element that some AEG feeds emit (#1132). Both forms collapse
// to a single newline — matches what a browser would render.
const BR_TAG = /<\/?br\s*\/?>/gi

// Whitelist of inline + uncommon block tag names that may survive the
// block-level pass above. Restricting the "remaining tag" strip to
// KNOWN HTML element names protects the round-trip / idempotency
// contract: plain text like "<heart>" (which can appear in event
// descriptions, especially after entity decoding lifts `&lt;heart&gt;`
// out) is left alone rather than being silently deleted on a re-run
// (#844 Copilot R1).
//
// Script / style content is intentionally NOT in this list — the
// extractors that feed us have already stripped those, and silently
// stripping just `<script>`/`</script>` while leaving JS/CSS in the
// text would be worse than the current behavior of leaving the markup
// intact for a human to notice.
// Includes `ul` and `ol` so their CLOSING tags (e.g. `</ul>`) get
// stripped — opening tags are already handled by BLOCK_OPENING above,
// but the closings would otherwise survive (block-pass only matches
// closings for p/div/h*/blockquote and tight closings for li/tr).
const KNOWN_HTML_TAG_NAMES =
  'a|abbr|address|article|aside|b|bdi|bdo|caption|cite|code|data|dd|' +
  'details|dfn|dialog|dl|dt|em|figcaption|figure|footer|header|hr|i|' +
  'img|kbd|main|mark|nav|ol|picture|pre|q|rp|rt|ruby|s|samp|section|' +
  'small|source|span|strong|sub|summary|sup|table|tbody|td|tfoot|th|' +
  'thead|time|u|ul|var|wbr'
const KNOWN_TAG = new RegExp(`<\\/?(?:${KNOWN_HTML_TAG_NAMES})\\b[^>]*>`, 'gi')

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
  // Punctuation entities seen in real AEG / RHP-CMS feeds. Without these
  // a curly-quote description (e.g. "NPR&rsquo;s Tiny Desk") leaks as a
  // literal `&rsquo;` to consumers (#844 Copilot R3).
  rsquo: '’', // right single quote ’
  lsquo: '‘', // left single quote  ‘
  ldquo: '“', // left double quote  “
  rdquo: '”', // right double quote ”
  ndash: '–', // en dash –
  mdash: '—', // em dash —
  hellip: '…', // ellipsis …
}
const NAMED_ENTITY_RE = /&([a-zA-Z]+);/g
// Case-insensitive `x`/`X` prefix for hex entities — both `&#x2014;` and
// `&#X2014;` appear in the wild (#844 Copilot R2).
const NUMERIC_ENTITY_RE = /&#(x?)([0-9a-fA-F]+);/gi

/**
 * Decode named + numeric HTML entities to their characters. Unknown named
 * entities and out-of-range numeric ones are left verbatim rather than
 * dropped, so the transform is lossless for non-entity text and idempotent
 * on already-decoded input.
 *
 * Exported for `title` / `rawTitle`, which need entity decoding but NOT the
 * tag-stripping passes `stripDescriptionHtml` layers on top (#1338).
 */
export function decodeHtmlEntities(input: string): string {
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
 * - Falsy input (null/undefined/empty) returns `''` without throwing —
 *   the parameter type accepts null/undefined so callers don't need
 *   casts or `@ts-expect-error` guards (#844 Copilot R4).
 */
export function stripDescriptionHtml(html: string | null | undefined): string {
  if (!html) return ''

  // 1. Decode entities FIRST so any entity-encoded markup (e.g.
  //    `&lt;p&gt;Hello&lt;/p&gt;` from feeds that double-encoded their
  //    HTML) is promoted to real tags BEFORE the tag-stripping passes
  //    below — otherwise the literal `<p>` tags would survive in the
  //    output (#844 Copilot R2).
  //
  //    The KNOWN_TAG whitelist in step 3 means an entity that decodes
  //    to a non-tag construct (e.g. `&lt;heart&gt;` → `<heart>`) is
  //    still preserved as user content, so this reorder doesn't break
  //    the round-trip / idempotency contract from R1.
  let out = decodeHtmlEntities(html)

  // 2. Block boundaries → newlines. Closing tag emits `\n\n` (paragraph
  //    break); opening tag drops to empty so adjacent `</p><p>` doesn't
  //    gain a stray third newline before step 4 normalizes. The step-4
  //    `\n{3,}` collapse and per-line trim handle nested cases (`<ul><li>
  //    …</li></ul>`) and consecutive empty blocks. `<br>` is a single
  //    line break, not a paragraph break — matches the HTML rendering
  //    semantics consumers would have seen in a browser.
  out = out
    .replace(BR_TAG, '\n')
    .replace(SELF_CLOSING_PARAGRAPH, '\n\n')
    .replace(PARAGRAPH_CLOSING, '\n\n')
    .replace(TIGHT_CLOSING, '\n')
    .replace(BLOCK_OPENING, '')

  // 3. Strip remaining KNOWN HTML tags (inline: <strong>, <a>, <span>,
  //    table cells, less-common block elements). Unknown angle-bracketed
  //    content like "<heart>" is preserved so idempotency holds — the
  //    whitelist is the safety net that lets us decode entities first
  //    without eating legitimate user content (#844 Copilot R1+R2).
  out = out.replace(KNOWN_TAG, '')

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
