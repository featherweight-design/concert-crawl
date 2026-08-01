import { reportFailure } from '@concert-crawl/logger'
import type { NormalizedEvent } from '../../types.js'
import { normalizeSupportingArtists } from '../normalize-supporting-artists.js'
import { stripDescriptionHtml } from '../strip-description-html.js'

const EVENT_TYPES = new Set(['Event', 'MusicEvent'])

// Matches ISO datetimes with an explicit timezone designator (Z, +HH:MM, or -HH:MM after the time portion).
// Naive datetimes like "2026-06-15T22:00:00" are intentionally excluded — they're interpreted as already venue-local.
const HAS_EXPLICIT_TZ =
  /T\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})$/

function isEvent(obj: Record<string, unknown>): boolean {
  const type = obj['@type']
  if (typeof type === 'string') return EVENT_TYPES.has(type)
  if (Array.isArray(type))
    return type.some((t) => typeof t === 'string' && EVENT_TYPES.has(t))
  return false
}

function partsInTimezone(
  date: Date,
  timeZone: string,
): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date)

  const pick = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((part) => part.type === type)?.value ?? ''

  // Intl returns "24" for midnight in hour12: false — normalize to "00".
  const hour = pick('hour') === '24' ? '00' : pick('hour')

  return {
    date: `${pick('year')}-${pick('month')}-${pick('day')}`,
    time: `${hour}:${pick('minute')}:${pick('second')}`,
  }
}

// Naive datetimes may separate date from time with `T` or, as Hold My Ticket
// emits, a space ("2026-08-01 20:00:00"). Splitting on `T` alone leaves the
// whole string as the "date" and loses the show time.
const NAIVE_DATETIME_SEPARATOR = /[T ]/

function extractDateOnly(dateStr: string, timeZone: string): string {
  if (HAS_EXPLICIT_TZ.test(dateStr)) {
    return partsInTimezone(new Date(dateStr), timeZone).date
  }
  // Naive datetimes and date-only strings → take the date portion as-is.
  return dateStr.trim().split(NAIVE_DATETIME_SEPARATOR)[0] ?? dateStr
}

function extractTimeOnly(
  dateStr: string,
  timeZone: string,
): string | undefined {
  if (HAS_EXPLICIT_TZ.test(dateStr)) {
    return partsInTimezone(new Date(dateStr), timeZone).time
  }
  const parts = dateStr.trim().split(NAIVE_DATETIME_SEPARATOR)
  if (parts.length < 2) return undefined
  // Strip any malformed trailing timezone fragment defensively.
  return parts[1]?.split(/[+\-Z]/)[0]
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

  const performerNames = getPerformerNames(obj['performer'])
  const artist = performerNames[0] ?? name
  // Some venues list the headliner more than once in `performer[]` (or repeat
  // it after the openers). `slice(1)` alone would keep those duplicates and
  // surface the headliner as its own supporting act. Route through the shared
  // normalizer so this path stays byte-identical to the LLM path (#643).
  const supportingArtists = normalizeSupportingArtists(
    artist,
    performerNames.slice(1),
  )
  const date = extractDateOnly(startDate, timeZone)
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

// Default fallback for callers that haven't yet been updated to pass venue.timezone.
// Production callers should always pass the venue's IANA zone — the default is for backward compat / tests only.
const DEFAULT_TIME_ZONE = 'America/Denver'

// venues.timezone is a plain text column with no IANA validation. A typo would crash
// Intl.DateTimeFormat in partsInTimezone and take down the whole venue's crawl. Validate
// once at the entry point and fall back to UTC so the crawl keeps producing rows.
function validateTimeZone(timeZone: string, sourceUrl: string): string {
  try {
    new Intl.DateTimeFormat('en-CA', { timeZone })
    return timeZone
  } catch {
    reportFailure({
      event: 'json-ld.invalid_timezone',
      severity: 'error',
      sourceUrl,
      timeZone,
      fallback: 'UTC',
    })
    return 'UTC'
  }
}

export function extractJsonLd(
  html: string,
  sourceUrl: string,
  timeZone: string = DEFAULT_TIME_ZONE,
): NormalizedEvent[] {
  const effectiveTimeZone = validateTimeZone(timeZone, sourceUrl)
  const events: NormalizedEvent[] = []
  const scriptRegex =
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi

  let match: RegExpExecArray | null
  while ((match = scriptRegex.exec(html)) !== null) {
    const content = match[1]
    if (!content) continue

    try {
      const parsed: unknown = JSON.parse(content)
      events.push(
        ...extractEventsFromParsed(parsed, sourceUrl, effectiveTimeZone),
      )
    } catch (err) {
      // Include the parse error so Sentry issues are actionable. Without
      // it, the event groups by sourceUrl alone and gives no clue what
      // shape the malformed JSON-LD took.
      reportFailure({
        event: 'json-ld.parse_error',
        severity: 'warn',
        sourceUrl,
        error: err instanceof Error ? err.message : String(err),
      })
    }
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
