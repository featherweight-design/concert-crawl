import { reportFailure } from '@concert-crawl/logger'
import type { NormalizedEvent } from '../../types.js'

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

function extractDateOnly(dateStr: string, timeZone: string): string {
  if (HAS_EXPLICIT_TZ.test(dateStr)) {
    return partsInTimezone(new Date(dateStr), timeZone).date
  }
  // Naive datetimes and date-only strings → take the date portion as-is.
  return dateStr.split('T')[0] ?? dateStr
}

function extractTimeOnly(
  dateStr: string,
  timeZone: string,
): string | undefined {
  if (HAS_EXPLICIT_TZ.test(dateStr)) {
    return partsInTimezone(new Date(dateStr), timeZone).time
  }
  const parts = dateStr.split('T')
  if (parts.length < 2) return undefined
  // Strip any malformed trailing timezone fragment defensively.
  return parts[1]?.split(/[+\-Z]/)[0]
}

function getArtistName(performer: unknown): string {
  if (typeof performer === 'string') return performer
  if (Array.isArray(performer) && performer.length > 0) {
    const first = performer[0]
    if (typeof first === 'string') return first
    if (first && typeof first === 'object' && 'name' in first) {
      return String((first as Record<string, unknown>)['name'])
    }
  }
  if (performer && typeof performer === 'object' && 'name' in performer) {
    return String((performer as Record<string, unknown>)['name'])
  }
  return ''
}

function mapToNormalizedEvent(
  obj: Record<string, unknown>,
  sourceUrl: string,
  timeZone: string,
): NormalizedEvent | null {
  const name = obj['name']
  const startDate = obj['startDate']

  if (typeof name !== 'string' || typeof startDate !== 'string') return null

  const artist = getArtistName(obj['performer'])
  const date = extractDateOnly(startDate, timeZone)
  const showTime = extractTimeOnly(startDate, timeZone)
  const doorsTime =
    typeof obj['doorTime'] === 'string'
      ? extractTimeOnly(obj['doorTime'], timeZone)
      : undefined
  const ticketUrl = typeof obj['url'] === 'string' ? obj['url'] : undefined
  const description =
    typeof obj['description'] === 'string' ? obj['description'] : undefined

  const event: NormalizedEvent = {
    title: name,
    artist: artist || name,
    date,
    sourceUrl,
    confidence: 1.0,
  }
  if (doorsTime !== undefined) event.doorsTime = doorsTime
  if (showTime !== undefined) event.showTime = showTime
  if (ticketUrl !== undefined) event.ticketUrl = ticketUrl
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
    } catch {
      reportFailure({
        event: 'json-ld.parse_error',
        severity: 'warn',
        sourceUrl,
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
