// Live Nation venue-site platform adapter (#1127).
//
// Live Nation's Denver venues (Fillmore, Marquis) run a shared Next.js
// template whose `/shows` page server-renders JSON-LD for **exactly 36
// events and no more**. There is no pagination parameter that moves that
// window — `?page=2`, `?p=2`, `?offset=36` and `?skip=36` all return the
// identical first 36 — so the structured-data cascade silently truncated
// every one of these venues at a fixed item count. That is what made the
// far-future shows appear to vanish in a single crawl run rather than
// falling off one at a time.
//
// The shows past #36 are reachable through the site's own monthly calendar
// pages, which `sitemap.xml` advertises (12 rolling months). Those pages
// emit no JSON-LD, but the React Server Component flight payload embedded
// in the HTML carries complete event records. Everything here is read from
// the venue's own public pages — no ticketing-vendor API is involved, by
// standing product decision. Verified
// 2026-07-25: the union of the 12 months is a strict superset of the 36
// JSON-LD entries on both venues (49 vs 36 for Fillmore, 67 vs 36 for
// Marquis) with zero titles present in JSON-LD but absent from the
// calendar, so switching to this source loses nothing.
//
// Summit Music Hall is on the same template and is capped the same way, but
// is deliberately NOT onboarded here and stays on the structured-data
// cascade. Its calendar months carry no SWRFallback in the flight payload at
// all — unlike the sibling venues, that route is client-fetched, and the
// browser reads its records from an authenticated Live Nation content API
// that 403s without the key the page ships. Calling that is out by the
// standing no-ticketing-vendor-API decision, and nothing else the site
// serves exposes the hidden shows: the per-room pages are each capped at 36
// in turn, and the sitemap advertises no per-event URLs. Investigated in
// full under #1196. The #1185 capped-catalogue guard is the accepted
// mitigation, so expect it to fire on this venue rather than reading that as
// a regression.

import { z } from 'zod'
import type { Venue } from '@concert-crawl/db'
import { createLogger } from '@concert-crawl/logger'
import type { NormalizedEvent } from '../../types.js'
import { isAllowed } from '../robots.js'
import { createDeadline } from './deadline.js'
import type {
  PlatformFetcher,
  PlatformFetchOptions,
  PlatformFetchResult,
} from './index.js'

const logger = createLogger('livenation-fetcher')
const USER_AGENT = 'ConcertCrawl/1.0 (+https://concertcrawl.app/bot)'

// Jitter the crawl delay (±500ms) so the 12 sequential month requests don't
// hit the venue on a bot-like fixed interval — mirrors VenuePilot and the
// cascade fetcher (lib/fetcher.ts).
function jitter(ms: number): number {
  // A venue that asks for no delay gets none — without this, jittering zero
  // would sometimes return up to 499ms and pace the admin probe.
  if (ms <= 0) return 0
  return Math.max(0, ms + Math.floor(Math.random() * 1000) - 500)
}

// Only the fields we map are required. The records carry ~35 keys and
// Live Nation adds to them freely, so everything else passes through.
const LiveNationImageSchema = z
  .object({
    url: z.string(),
    width: z.number().optional(),
  })
  .passthrough()

const LiveNationArtistSchema = z
  .object({
    name: z.string(),
  })
  .passthrough()

const LiveNationEventSchema = z
  .object({
    // The listing's stable per-event id in the page payload. Used only to
    // dedupe a show that appears on two months' pages.
    tm_id: z.string(),
    name: z.string(),
    url: z.string().optional(),
    // "YYYY-MM-DD" in the venue's local timezone. The record also carries
    // start_datetime_utc, but reading the local fields directly avoids a
    // UTC round-trip that would shift the day boundary on late shows.
    start_date_local: z.string(),
    start_time_local: z.string().optional(),
    status_code: z.string().optional(),
    venue: z
      .object({ discovery_id: z.string().optional() })
      .passthrough()
      .optional(),
    artists: z.array(LiveNationArtistSchema).optional(),
    images: z.array(LiveNationImageSchema).optional(),
  })
  .passthrough()

export type LiveNationEvent = z.infer<typeof LiveNationEventSchema>

export class LiveNationFetchError extends Error {
  constructor(
    public readonly httpStatus: number,
    public readonly url: string,
    message: string,
  ) {
    super(message)
    this.name = 'LiveNationFetchError'
  }
}

// A show that has been called off is not a listing we want to surface.
// 'rescheduled' events keep their (new) date and stay in.
const DROPPED_STATUS_CODES = new Set(['cancelled', 'canceled'])

async function fetchText(url: string, timeoutMs?: number): Promise<string> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml',
    },
    // A hung connection must not pin the caller — the admin probe endpoint
    // holds an API worker slot while this resolves.
    ...(timeoutMs !== undefined
      ? { signal: AbortSignal.timeout(timeoutMs) }
      : {}),
  })
  if (!response.ok) {
    throw new LiveNationFetchError(
      response.status,
      url,
      // The admin probe surfaces err.message only, so name the URL that
      // failed — otherwise a bad month is indistinguishable from a bad site.
      `Live Nation fetch failed: HTTP ${response.status} for ${url}`,
    )
  }
  return response.text()
}

/**
 * Reassemble the RSC flight payload from the `self.__next_f.push([1,"…"])`
 * calls Next.js sprinkles through the document. Each call carries one
 * JSON-string-escaped chunk of a single logical stream, so they must be
 * unescaped individually and then concatenated — a record can straddle a
 * chunk boundary.
 */
export function reassembleFlightPayload(html: string): string {
  const chunks: string[] = []
  let skippedChunkCount = 0
  const pattern = /self\.__next_f\.push\(\[1,\s*"((?:[^"\\]|\\.)*)"\]\)/g
  for (const match of html.matchAll(pattern)) {
    try {
      chunks.push(JSON.parse(`"${match[1]}"`))
    } catch {
      // A chunk we can't unescape is a chunk we can't trust to join
      // cleanly with its neighbours. Skipping it can only cost us events,
      // never invent them. Note the count-vs-baseline alert only catches a
      // severe drop (SOFT_DROP_RATIO = 0.3), so a partial truncation would
      // pass silently — skippedChunkCount below is the signal for that.
      skippedChunkCount++
    }
  }
  if (skippedChunkCount > 0) {
    // Logged in aggregate rather than per chunk: a format drift on Next.js's
    // side would otherwise emit hundreds of identical lines per page.
    logger.debug(
      { skippedChunkCount, totalChunks: chunks.length + skippedChunkCount },
      'livenation: skipped unparseable flight chunks',
    )
  }
  return chunks.join('')
}

/**
 * Pull the event records out of a reassembled flight payload.
 *
 * The payload is a React element stream, not a JSON document, so it can't
 * be parsed as a whole. The event list appears as a `"data":[…]` property
 * of a client-component prop object. We locate each such key and scan
 * forward with a brace/bracket counter (string-aware, so punctuation
 * inside event titles doesn't throw the depth off) to find the matching
 * close bracket, then JSON.parse that slice. Arrays that don't look like
 * event lists are discarded.
 */
export function extractEventRecords(flight: string): unknown[] {
  const records: unknown[] = []
  let unparseableSliceCount = 0
  const marker = '"data":['
  let searchFrom = 0
  let markerIndex = flight.indexOf(marker, searchFrom)
  while (markerIndex !== -1) {
    const start = markerIndex + marker.length - 1
    const end = findMatchingBracket(flight, start)
    if (end !== -1) {
      try {
        const parsed: unknown = JSON.parse(flight.slice(start, end + 1))
        if (Array.isArray(parsed) && parsed.some(looksLikeEventRecord)) {
          records.push(...parsed)
        }
      } catch {
        // Not a self-contained JSON array (most `"data":[` hits in the
        // stream are React props, asset manifests, etc). Move on.
        unparseableSliceCount++
      }
    }
    searchFrom = start + 1
    markerIndex = flight.indexOf(marker, searchFrom)
  }
  if (unparseableSliceCount > 0) {
    // Aggregated to one line per page rather than one per slice: on a healthy
    // page most `"data":[` hits are React props that legitimately fail to
    // parse, so per-slice logging would be hundreds of lines of noise. Empty
    // records with a non-zero count is the shape that means format drift.
    logger.debug(
      { unparseableSliceCount, recordCount: records.length },
      'livenation: some flight payload slices were not parseable JSON',
    )
  }
  return records
}

function looksLikeEventRecord(value: unknown): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    'start_date_local' in value &&
    'tm_id' in value
  )
}

function findMatchingBracket(text: string, openIndex: number): number {
  let depth = 0
  let inString = false
  let escaped = false
  for (let i = openIndex; i < text.length; i++) {
    const char = text[i]!
    if (escaped) {
      escaped = false
      continue
    }
    if (char === '\\') {
      escaped = true
      continue
    }
    if (inString) {
      if (char === '"') inString = false
      continue
    }
    if (char === '"') {
      inString = true
      continue
    }
    if (char === '[' || char === '{') {
      depth++
    } else if (char === ']' || char === '}') {
      depth--
      if (depth === 0) return i
    }
  }
  return -1
}

/**
 * Read the venue's advertised monthly calendar URLs out of its sitemap.
 *
 * Deliberately sitemap-driven rather than generating the next N months
 * ourselves: the sitemap is what the site publishes as crawlable, the
 * rolling window it exposes is the site's decision to make, and a month
 * URL that isn't listed generally 404s.
 */
export function parseCalendarUrls(
  sitemapXml: string,
  origin: string,
): string[] {
  const seen = new Set<string>()
  const pattern = /<loc>\s*([^<\s]*\/shows\/calendar\/\d{4}-\d{2})\s*<\/loc>/g
  for (const match of sitemapXml.matchAll(pattern)) {
    const url = match[1]!
    // Ignore any sister-venue URLs that share the sitemap — we only ever
    // want the calendar of the venue we're crawling.
    if (!url.startsWith(origin)) continue
    seen.add(url)
  }
  return [...seen].sort()
}

function pickImageUrl(images: LiveNationEvent['images']): string | undefined {
  if (!images || images.length === 0) return undefined
  let best: { width: number; url: string } | null = null
  for (const image of images) {
    const width = image.width ?? 0
    if (best === null || width > best.width) {
      best = { width, url: image.url }
    }
  }
  return best?.url
}

function normalizeTime(local: string | undefined): string | undefined {
  if (!local) return undefined
  const match = local.match(/^(\d{2}:\d{2}(?::\d{2})?)$/)
  if (!match) return undefined
  return match[1]!.length === 5 ? `${match[1]}:00` : match[1]!
}

function normalize(
  event: LiveNationEvent,
  venueCalendarUrl: string,
): NormalizedEvent | null {
  if (event.status_code && DROPPED_STATUS_CODES.has(event.status_code)) {
    return null
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(event.start_date_local)) {
    logger.warn(
      { tmId: event.tm_id, startDateLocal: event.start_date_local },
      'livenation: skipping event with unparseable start_date_local',
    )
    return null
  }

  const artistNames = (event.artists ?? [])
    .map((artist) => artist.name.trim())
    .filter((name) => name.length > 0)
  // The payload lists the headliner first. When the record carries no
  // artist breakdown at all (festival passes, multi-bill packages), the
  // listing name is the best artist string available — the same fallback
  // the LLM path lands on for those listings.
  const artist = artistNames[0] ?? event.name
  const supportingArtists = artistNames.slice(1)

  const showTime = normalizeTime(event.start_time_local)
  const imageUrl = pickImageUrl(event.images)

  // tsconfig sets `exactOptionalPropertyTypes: true`, so optional fields
  // have to be spread in rather than passed as `undefined`.
  return {
    title: event.name,
    // Platform JSON ships the venue's own canonical headline with no
    // LLM-style decoration, so rawTitle mirrors title (#826).
    rawTitle: event.name,
    artist,
    ...(supportingArtists.length > 0 ? { supportingArtists } : {}),
    date: event.start_date_local,
    ...(showTime !== undefined ? { showTime } : {}),
    ...(event.url !== undefined ? { ticketUrl: event.url } : {}),
    ...(imageUrl !== undefined ? { imageUrl } : {}),
    sourceUrl: venueCalendarUrl,
    // No LLM uncertainty on a platform fetch — anything that deviates from
    // the schema is dropped at the record level, not down-weighted.
    confidence: 1.0,
  }
}

async function liveNationFetch(
  venue: Venue,
  opts: PlatformFetchOptions,
): Promise<PlatformFetchResult> {
  const origin = new URL(venue.websiteUrl).origin
  const sitemapUrl = `${origin}/sitemap.xml`
  const startedAt = Date.now()
  const deadline = createDeadline(opts)

  // crawl.ts gates on venue.websiteUrl only, which is a different path from
  // the two this adapter requests. robots.txt rules are per-path, so a site
  // could allow /shows and disallow /sitemap.xml or /shows/calendar/ — each
  // URL we fetch has to clear the gate on its own. isAllowed() caches
  // robots.txt per domain, so this is one extra request for the whole run.
  if (!(await isAllowed(sitemapUrl, USER_AGENT))) {
    throw new LiveNationFetchError(
      0,
      sitemapUrl,
      `robots.txt disallows ${sitemapUrl}`,
    )
  }

  const allCalendarUrls = parseCalendarUrls(
    await deadline.run('sitemap', (timeoutMs) =>
      fetchText(sitemapUrl, timeoutMs),
    ),
    origin,
  )
  if (allCalendarUrls.length === 0) {
    throw new LiveNationFetchError(
      0,
      sitemapUrl,
      `Live Nation sitemap for ${origin} listed no /shows/calendar/ URLs`,
    )
  }

  const allowedFlags = await Promise.all(
    allCalendarUrls.map((url) => isAllowed(url, USER_AGENT)),
  )
  const calendarUrls = allCalendarUrls.filter((_, i) => allowedFlags[i])
  const robotsSkippedCount = allCalendarUrls.length - calendarUrls.length
  if (robotsSkippedCount > 0) {
    logger.warn(
      { venueId: venue.id, robotsSkippedCount, origin },
      'livenation: robots.txt disallowed some calendar months — skipping them',
    )
  }
  if (calendarUrls.length === 0) {
    throw new LiveNationFetchError(
      0,
      sitemapUrl,
      `robots.txt disallows every calendar month for ${origin}`,
    )
  }

  // Deduped by the payload's event id: a show spanning a month boundary is
  // listed on both months' pages. The value carries the month page the record
  // came off so each event's sourceUrl points at a page that actually lists
  // it — /shows can't serve that role, since it stops at 36 events, which is
  // the whole reason this adapter exists. Either month page is a valid source
  // for a boundary-spanning show, so the last one wins as before.
  const byEventId = new Map<
    string,
    { event: LiveNationEvent; calendarUrl: string }
  >()
  let rawRecordCount = 0
  let schemaRejectCount = 0
  let otherVenueCount = 0

  for (const calendarUrl of calendarUrls) {
    // Every month page is a request to the venue's own domain, so the
    // venue's configured per-domain delay applies to each of them.
    await deadline.wait(jitter(opts.crawlDelayMs))
    const html = await deadline.run(`calendar ${calendarUrl}`, (timeoutMs) =>
      fetchText(calendarUrl, timeoutMs),
    )
    const records = extractEventRecords(reassembleFlightPayload(html))
    rawRecordCount += records.length

    for (const record of records) {
      const parsed = LiveNationEventSchema.safeParse(record)
      if (!parsed.success) {
        schemaRejectCount++
        continue
      }
      // The calendar pages occasionally surface a sister venue's on-sale.
      // platform_venue_id holds this venue's id as it appears in the page
      // payload, so we can drop those precisely rather than string-matching
      // names (the payload's venue name isn't our display name).
      if (
        parsed.data.venue?.discovery_id &&
        parsed.data.venue.discovery_id !== venue.platformVenueId
      ) {
        otherVenueCount++
        continue
      }
      byEventId.set(parsed.data.tm_id, { event: parsed.data, calendarUrl })
    }
  }

  if (schemaRejectCount > 0) {
    // Not fatal — a shape change on Live Nation's side should cost us the
    // affected rows, not the whole crawl. The count is the signal that the
    // schema needs revisiting.
    logger.warn(
      { venueId: venue.id, schemaRejectCount, rawRecordCount },
      'livenation: some calendar records failed schema validation',
    )
  }

  const events: NormalizedEvent[] = []
  for (const { event, calendarUrl } of byEventId.values()) {
    const normalized = normalize(event, calendarUrl)
    if (normalized) events.push(normalized)
  }

  return {
    events,
    sourceUrl: sitemapUrl,
    meta: {
      fetchLatencyMs: Date.now() - startedAt,
      calendarMonthsFetched: calendarUrls.length,
      robotsSkippedCount,
      rawRecordCount,
      uniqueEventCount: byEventId.size,
      schemaRejectCount,
      otherVenueCount,
      eventsAfterNormalization: events.length,
    },
  }
}

export const liveNationFetcher: PlatformFetcher = {
  source: 'livenation',
  canHandle(venue) {
    return Boolean(
      venue.platform === 'livenation' &&
      venue.platformVenueId &&
      venue.platformVenueId.length > 0,
    )
  },
  fetch: liveNationFetch,
}
