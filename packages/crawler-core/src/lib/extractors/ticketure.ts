import { reportFailure } from '@concert-crawl/logger'
import type { NormalizedEvent } from '../../types.js'
import { normalizeSupportingArtists } from '../normalize-supporting-artists.js'
import {
  DEFAULT_TIME_ZONE,
  HAS_EXPLICIT_TZ,
  extractDateOnly,
  extractTimeOnly,
  validateTimeZone,
} from './datetime.js'

// Ticketure-backed venues (Meow Wolf) render their listings entirely on the
// client — the served HTML body is empty and every event lives in the Next.js
// `__NEXT_DATA__` hydration payload. Reading that payload is a platform path
// in the same family as the JSON-LD and vendor-API extractors, not a
// per-venue scraping selector: `__NEXT_DATA__` is a framework convention and
// the payload shape below is Ticketure's, shared by every venue on it.
//
// This replaced a browser fetch with a `waitForSelector` on the hydrated DOM.
// That selector was correct but raced ~10 third-party trackers for the main
// thread and timed out, taking the crawl to `failed` (#1340).
// Matched on the `id` alone, which is unique per document. Pinning the
// attribute order (or requiring `type` to follow `id`) would miss a tag that
// carries a CSP nonce or renders its attributes in a different order.
const NEXT_DATA_REGEX =
  /<script[^>]*\bid=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/

// Ticketure tags each listing with a programming category. Only `Music` rows
// are concerts; `Community` covers exhibits, burlesque, film nights and the
// like. Non-music rows are still extracted and stored, flagged
// `isConcert: false` so `hidden_from_consumer` keeps them off the consumer
// surface while leaving an admin able to reverse any individual call.
const MUSIC_CATEGORY = 'Music'

// Supporting acts arrive as a single pipe-delimited string
// ("hellocentral | Jaguar Stevens"), not an array.
const SUPPORTING_ACT_SEPARATOR = '|'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readString(
  obj: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = obj[key]
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

// Walks props.pageProps.events.events without casting. Any missing or
// wrong-typed link in the chain yields an empty list, which makes the
// extractor a safe no-op on every non-Ticketure page.
function readEventList(parsed: unknown): Record<string, unknown>[] {
  if (!isRecord(parsed)) return []
  const props = parsed['props']
  if (!isRecord(props)) return []
  const pageProps = props['pageProps']
  if (!isRecord(pageProps)) return []
  const eventsNode = pageProps['events']
  if (!isRecord(eventsNode)) return []
  const list = eventsNode['events']
  if (!Array.isArray(list)) return []
  return list.filter(isRecord)
}

function supportingActsFrom(text: unknown, artist: string): string[] {
  if (!isRecord(text)) return []
  const raw = readString(text, 'supportingActs')
  if (raw === undefined) return []
  const names = raw
    .split(SUPPORTING_ACT_SEPARATOR)
    .map((name) => name.trim())
    .filter((name) => name.length > 0)
  return normalizeSupportingArtists(artist, names)
}

function mapToNormalizedEvent(
  raw: Record<string, unknown>,
  sourceUrl: string,
  timeZone: string,
): NormalizedEvent | null {
  const title = readString(raw, 'title')
  const startDateTime = readString(raw, 'startDateTime')
  if (title === undefined || startDateTime === undefined) return null

  // Ticketure emits UTC instants (`2026-08-09T01:00:00Z`) for shows that are
  // the prior evening locally — that example is Aug 8, 7pm in Denver. Anything
  // that splits on `T` instead of converting through the venue zone moves
  // every evening show forward a day, so refuse a value we can't convert
  // rather than storing a date that is silently off by one.
  if (!HAS_EXPLICIT_TZ.test(startDateTime)) {
    reportFailure({
      event: 'ticketure.ambiguous_start',
      severity: 'warn',
      sourceUrl,
      title,
      startDateTime,
    })
    return null
  }

  const date = extractDateOnly(startDateTime, timeZone)
  // The instant lines up with the listing's stated "Doors @ 7:00 PM", so it
  // is the doors time, not the set time. Ticketure publishes no set time.
  const doorsTime = extractTimeOnly(startDateTime, timeZone)

  const event: NormalizedEvent = {
    title,
    // Platform JSON is the source's own canonical headline — nothing is
    // decorated or stripped, so mirroring into rawTitle keeps the
    // cross-venue filter's input contract uniform across extractors (#826).
    rawTitle: title,
    artist: title,
    date,
    sourceUrl,
    confidence: 1.0,
    isConcert: readString(raw, 'category') === MUSIC_CATEGORY,
  }

  const supportingArtists = supportingActsFrom(raw['text'], title)
  if (supportingArtists.length > 0) event.supportingArtists = supportingArtists
  if (doorsTime !== undefined) event.doorsTime = doorsTime

  // `url` is a bare slug ("dutch-melrose") relative to the listing index.
  const slug = readString(raw, 'url')
  if (slug !== undefined) {
    try {
      const eventUrl = new URL(`${slug}/`, sourceUrl).toString()
      event.ticketUrl = eventUrl
      event.eventUrl = eventUrl
    } catch (err) {
      // A slug that can't form a URL costs the link, not the event — but it
      // still means every ticket link for this venue may be silently absent,
      // so it has to be diagnosable without re-fetching the page.
      reportFailure({
        event: 'ticketure.invalid_event_url',
        severity: 'warn',
        sourceUrl,
        title,
        slug,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  const imageUrl = readString(raw, 'image')
  if (imageUrl !== undefined) event.imageUrl = imageUrl

  return event
}

export function extractTicketure(
  html: string,
  sourceUrl: string,
  timeZone: string = DEFAULT_TIME_ZONE,
): NormalizedEvent[] {
  const match = NEXT_DATA_REGEX.exec(html)
  const payload = match?.[1]
  if (payload === undefined) return []

  let parsed: unknown
  try {
    parsed = JSON.parse(payload)
  } catch (err) {
    reportFailure({
      event: 'ticketure.parse_error',
      severity: 'warn',
      sourceUrl,
      error: err instanceof Error ? err.message : String(err),
    })
    return []
  }

  const rawEvents = readEventList(parsed)
  if (rawEvents.length === 0) return []

  const effectiveTimeZone = validateTimeZone(
    timeZone,
    sourceUrl,
    'ticketure.invalid_timezone',
  )

  const events: NormalizedEvent[] = []
  for (const raw of rawEvents) {
    const event = mapToNormalizedEvent(raw, sourceUrl, effectiveTimeZone)
    if (event) events.push(event)
  }

  console.log(
    JSON.stringify({
      event: 'ticketure.extracted',
      sourceUrl,
      count: events.length,
      concertCount: events.filter((evt) => evt.isConcert).length,
    }),
  )
  return events
}
