import { reportFailure } from '@concert-crawl/logger'
import {
  DEFAULT_TIME_ZONE,
  extractDateOnly,
  extractTimeOnly,
  validateTimeZone,
} from './datetime.js'
import type { NormalizedEvent } from '../../types.js'
import { normalizeSupportingArtists } from '../normalize-supporting-artists.js'
import { stripDescriptionHtml } from '../strip-description-html.js'

const EVENT_TYPES = new Set(['Event', 'MusicEvent'])

function isEvent(obj: Record<string, unknown>): boolean {
  const type = obj['@type']
  if (typeof type === 'string') return EVENT_TYPES.has(type)
  if (Array.isArray(type))
    return type.some((t) => typeof t === 'string' && EVENT_TYPES.has(t))
  return false
}

// JSON-LD is untrusted source data, so read `name` via runtime narrowing
// rather than casting. Blank/whitespace-only performer names are dropped so
// they never become an empty artist or supporting-artist entry.
function performerName(value: unknown): string | undefined {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : undefined
  }
  if (value && typeof value === 'object' && 'name' in value) {
    const name = value.name
    if (typeof name === 'string') {
      const trimmed = name.trim()
      return trimmed.length > 0 ? trimmed : undefined
    }
  }
  return undefined
}

function getPerformerNames(performer: unknown): string[] {
  const items = Array.isArray(performer) ? performer : [performer]
  const names: string[] = []
  for (const item of items) {
    const name = performerName(item)
    if (name !== undefined) names.push(name)
  }
  return names
}

// schema.org `Offer.url` is the actual purchase/checkout link, distinct from
// `Event.url` (the detail page). `offers` may be a single Offer or an array;
// take the first entry that carries a string `url`. Untrusted source data, so
// narrow at runtime rather than casting.
//
// An `AggregateOffer` carries no `url` of its own — it nests the real Offers
// under its own `offers` key, one per price tier. The Oriental Theater ships
// every event that way, so without unwrapping it all 41 of its events arrive
// with no ticket link at all.
function getOfferUrl(offers: unknown): string | undefined {
  const items = Array.isArray(offers) ? offers : [offers]
  for (const item of items) {
    if (!item || typeof item !== 'object') continue

    if ('url' in item) {
      const url = item.url
      if (typeof url === 'string') {
        const trimmed = url.trim()
        if (trimmed.length > 0) return trimmed
      }
    }

    if ('offers' in item) {
      const nested = getOfferUrl(item.offers)
      if (nested !== undefined) return nested
    }
  }
  return undefined
}

function mapToNormalizedEvent(
  obj: Record<string, unknown>,
  sourceUrl: string,
  timeZone: string,
): NormalizedEvent | null {
  const name = obj['name']
  const startDate = obj['startDate']

  if (typeof name !== 'string' || typeof startDate !== 'string') return null

  const observedPerformers = getPerformerNames(obj['performer'])
  // `name` is still the display string when the listing names no performer,
  // but it is NOT recorded as an observation — that coalesce is what put 80
  // event titles into the artists projection.
  const artist = observedPerformers[0] ?? name
  // Some venues list the headliner more than once in `performer[]` (or repeat
  // it after the openers). `slice(1)` alone would keep those duplicates and
  // surface the headliner as its own supporting act. Route through the shared
  // normalizer so this path stays byte-identical to the LLM path (#643).
  const supportingArtists = normalizeSupportingArtists(
    artist,
    observedPerformers.slice(1),
  )
  const date = extractDateOnly(startDate, timeZone)
  if (date === undefined) {
    reportFailure({
      event: 'json-ld.invalid_start_date',
      severity: 'warn',
      sourceUrl,
      name,
      startDate,
    })
    return null
  }
  const showTime = extractTimeOnly(startDate, timeZone)
  const doorsTime =
    typeof obj['doorTime'] === 'string'
      ? extractTimeOnly(obj['doorTime'], timeZone)
      : undefined
  // `Event.url` is the event's own detail page; `offers.url` is the real
  // purchase link. Prefer the purchase link for `ticketUrl`, but fall back to
  // the detail page when a venue exposes no offer URL (many don't) so existing
  // JSON-LD venues keep a working ticket link.
  const detailUrl = typeof obj['url'] === 'string' ? obj['url'] : undefined
  const ticketUrl = getOfferUrl(obj['offers']) ?? detailUrl
  // Always capture the detail page as `eventUrl` — the "Get tickets" fallback
  // so a listing without a direct purchase link still deep-links to the
  // specific event page rather than the venue's generic index (#1152).
  const eventUrl = detailUrl
  // schema.org `Event.description` is commonly populated with HTML from
  // the venue's CMS (RHP, Squarespace, etc.). Strip at the extractor
  // boundary so the DB stores plain text and the consumer surface stays
  // a safe no-escape read (#827).
  const rawDescription =
    typeof obj['description'] === 'string' ? obj['description'] : undefined
  const description = rawDescription
    ? stripDescriptionHtml(rawDescription) || undefined
    : undefined

  const event: NormalizedEvent = {
    title: name,
    // JSON-LD structured data is already the source's own canonical
    // headline — no LLM-style decoration is ever added. Mirroring
    // `title` into `rawTitle` keeps the cross-venue filter's input
    // contract uniform across extractors (#826).
    rawTitle: name,
    artist,
    observedPerformers,
    date,
    sourceUrl,
    confidence: 1.0,
  }
  if (supportingArtists.length > 0) event.supportingArtists = supportingArtists
  if (doorsTime !== undefined) event.doorsTime = doorsTime
  if (showTime !== undefined) event.showTime = showTime
  if (ticketUrl !== undefined) event.ticketUrl = ticketUrl
  if (eventUrl !== undefined) event.eventUrl = eventUrl
  if (description !== undefined) event.description = description
  return event
}

function extractEventsFromParsed(
  parsed: unknown,
  sourceUrl: string,
  timeZone: string,
): NormalizedEvent[] {
  const events: NormalizedEvent[] = []

  if (!parsed || typeof parsed !== 'object') return events

  if (Array.isArray(parsed)) {
    for (const item of parsed) {
      events.push(...extractEventsFromParsed(item, sourceUrl, timeZone))
    }
    return events
  }

  const obj = parsed as Record<string, unknown>

  // Handle @graph
  if ('@graph' in obj && Array.isArray(obj['@graph'])) {
    for (const item of obj['@graph']) {
      events.push(...extractEventsFromParsed(item, sourceUrl, timeZone))
    }
    return events
  }

  if (isEvent(obj)) {
    const event = mapToNormalizedEvent(obj, sourceUrl, timeZone)
    if (event) events.push(event)
  }

  return events
}

function nextNonWhitespaceChar(json: string, from: number): string | undefined {
  for (let i = from; i < json.length; i++) {
    const ch = json[i]!
    if (!/\s/.test(ch)) return ch
  }
  return undefined
}

// Venue CMSs that interpolate event titles straight into JSON-LD emit
// unescaped inner quotes for any title containing quotation marks — e.g.
// `"name": "20th Anniversary of "The Price Of Existence" Album"`. Escape the
// quotes that aren't structural delimiters so the block parses. A quote only
// closes a string when the next non-whitespace character is `,` `:` `}` `]`
// or end-of-input; anything else means the title itself contained it.
function escapeUnescapedQuotes(json: string): string {
  let out = ''
  let inString = false

  for (let i = 0; i < json.length; i++) {
    const ch = json[i]!

    if (inString && ch === '\\') {
      out += ch + (json[i + 1] ?? '')
      i++
      continue
    }

    if (ch !== '"') {
      out += ch
      continue
    }

    if (!inString) {
      inString = true
      out += ch
      continue
    }

    const next = nextNonWhitespaceChar(json, i + 1)
    if (
      next === undefined ||
      next === ',' ||
      next === ':' ||
      next === '}' ||
      next === ']'
    ) {
      inString = false
      out += ch
    } else {
      out += '\\"'
    }
  }

  return out
}

export function extractJsonLd(
  html: string,
  sourceUrl: string,
  timeZone: string = DEFAULT_TIME_ZONE,
): NormalizedEvent[] {
  const effectiveTimeZone = validateTimeZone(
    timeZone,
    sourceUrl,
    'json-ld.invalid_timezone',
  )
  const events: NormalizedEvent[] = []
  const scriptRegex =
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi

  let match: RegExpExecArray | null
  while ((match = scriptRegex.exec(html)) !== null) {
    const content = match[1]
    if (!content) continue

    let parsed: unknown
    try {
      parsed = JSON.parse(content)
    } catch (err) {
      // A block that fails outright would otherwise be skipped silently: the
      // page still yields events from its sibling blocks, so the cascade sees
      // a successful structured-data extraction and never escalates to the
      // LLM. Attempt a repair before giving the event up.
      try {
        parsed = JSON.parse(escapeUnescapedQuotes(content))
        // warn, not log: a repaired block means the venue is emitting
        // malformed structured data, which is worth filtering and alerting
        // on even though the event itself was recovered.
        console.warn(
          JSON.stringify({
            event: 'json-ld.repaired',
            severity: 'warn',
            sourceUrl,
            error: err instanceof Error ? err.message : String(err),
          }),
        )
      } catch (repairErr) {
        // Include both parse errors so Sentry issues are actionable. Without
        // them the event groups by sourceUrl alone and gives no clue what
        // shape the malformed JSON-LD took. The two can differ: the repair
        // moves the failure point, and where it lands is what says whether
        // the block is malformed some other way or the repair itself is
        // incomplete.
        reportFailure({
          event: 'json-ld.parse_error',
          severity: 'warn',
          sourceUrl,
          error: err instanceof Error ? err.message : String(err),
          repairError:
            repairErr instanceof Error ? repairErr.message : String(repairErr),
        })
        continue
      }
    }

    events.push(
      ...extractEventsFromParsed(parsed, sourceUrl, effectiveTimeZone),
    )
  }

  console.log(
    JSON.stringify({
      event: 'json-ld.extracted',
      sourceUrl,
      count: events.length,
    }),
  )
  return events
}
