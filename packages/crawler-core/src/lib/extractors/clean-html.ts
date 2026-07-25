// Input character cap on the user-message HTML. Haiku 4.5 has a 200K
// input context; the prior 50K cap was tight enough that a successful
// Red Rocks crawl only saw ~half of the rendered event grid in its input
// window. 200K lets the cleaned text reach the model in full for all
// currently-tracked venues.
export const MAX_INPUT_HTML_CHARS = 200_000

const SCRIPT_BLOCK = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi
const STYLE_BLOCK = /<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi
const NAV_BLOCK = /<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi
const FOOTER_BLOCK = /<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi
const ANCHOR_OPEN_TAG = /<a\b[^>]*>/gi
// `\bhref` would also match `data-href` and `x-href`, since a word boundary
// sits after the hyphen — those carry framework routing values, not links a
// fan can visit.
const HREF_ATTR = /(?:^|\s)href\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/i
const ANY_TAG = /<[^>]+>/g
const LINK_MARKER = /\[link: (\S+)\]/g
const TRAILING_PARTIAL_MARKER = /\[(?:l(?:i(?:n(?:k(?::(?: \S*)?)?)?)?)?)?$/

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  quot: '"',
  lt: '<',
  gt: '>',
}

const NAMED_ENTITY_RE = /&([a-zA-Z]+);/g
const NUMERIC_ENTITY_RE = /&#(x?)([0-9a-fA-F]+);/gi

// Numeric entities have to decode generically, not from a fixed list: an href
// written `javascript&#58;…` would otherwise reach `new URL` with its colon
// still encoded, parse as a relative path, and be emitted as a link marker
// the model can never visit.
function decodeEntities(value: string): string {
  return value
    .replace(NAMED_ENTITY_RE, (match, name: string) => {
      return NAMED_ENTITIES[name.toLowerCase()] ?? match
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

// Resolve an href against the page URL and keep only web-navigable links.
// `javascript:`, `mailto:` and `#fragment` hrefs are not event pages, and
// letting them through would hand the model — and ultimately the rendered
// "Get tickets" href — a URL scheme the UI refuses to link anyway.
function toAbsoluteHttpUrl(href: string, baseUrl: string): string | null {
  const trimmed = decodeEntities(href).trim()
  if (trimmed === '' || trimmed.startsWith('#')) return null

  let parsed: URL
  try {
    parsed = new URL(trimmed, baseUrl)
  } catch {
    // An unparseable base URL rejects even absolute hrefs, so retry
    // without one before giving up.
    try {
      parsed = new URL(trimmed)
    } catch {
      return null
    }
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null
  return parsed.toString()
}

export interface CleanedPage {
  /** Tag-stripped page text with each anchor's href inlined as a marker. */
  text: string
  /** Every absolute http(s) URL the page linked to, in first-seen order. */
  linkUrls: Set<string>
}

/**
 * Flatten venue HTML into the plain text handed to the LLM.
 *
 * Anchor hrefs are inlined as `[link: URL]` markers rather than dropped
 * with the rest of the markup. Without them the model has no way to name
 * an event's own detail page, so `eventUrl` came back null for every
 * LLM-extracted venue and the "Get tickets" CTA fell all the way back to
 * the venue's calendar index (#1152).
 */
export function cleanHtml(html: string, sourceUrl: string): CleanedPage {
  const truncated = html
    .replace(SCRIPT_BLOCK, '')
    .replace(STYLE_BLOCK, '')
    .replace(NAV_BLOCK, '')
    .replace(FOOTER_BLOCK, '')
    .replace(ANCHOR_OPEN_TAG, (tag) => {
      const match = HREF_ATTR.exec(tag)
      const href = match?.[1] ?? match?.[2] ?? match?.[3]
      if (href == null) return ' '
      const url = toAbsoluteHttpUrl(href, sourceUrl)
      if (url == null) return ' '
      return ` [link: ${url}] `
    })
    .replace(ANY_TAG, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, MAX_INPUT_HTML_CHARS)

  // Truncation can slice a marker in half. A dangling "[link: https://…"
  // is noise to the model and can never round-trip through
  // resolveExtractedUrl anyway, so drop the partial tail.
  const text = truncated.replace(TRAILING_PARTIAL_MARKER, '').trimEnd()

  // Collected from the truncated text, not the full page: a URL past the
  // cap never reaches the model's input window, so accepting it back from
  // the model would mean accepting a link it could not have read.
  const linkUrls = new Set(
    [...text.matchAll(LINK_MARKER)].flatMap((match) =>
      match[1] == null ? [] : [match[1]],
    ),
  )

  return { text, linkUrls }
}

/**
 * Accept a model-supplied URL only when the page actually linked to it.
 *
 * The model reads the `[link: …]` markers out of the flattened page, but
 * nothing stops it from assembling a plausible-looking slug of its own.
 * A hallucinated deep link is worse than no link at all — it sends fans
 * to a 404 instead of the venue's calendar — so anything absent from the
 * page's own anchor set is discarded.
 */
export function resolveExtractedUrl(
  url: string | null | undefined,
  linkUrls: Set<string>,
): string | null {
  if (url == null) return null
  const canonical = toAbsoluteHttpUrl(url, url)
  if (canonical == null) return null
  return linkUrls.has(canonical) ? canonical : null
}
