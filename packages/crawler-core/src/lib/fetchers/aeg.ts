// AEG `template12` platform adapter (#623).
//
// Fetches events directly from AEG's per-venue JSON blob, bypassing the
// HTML → JSON-LD → LLM cascade entirely. Each AEG sister venue has its
// own events.json file at a shard-id path:
//
//   https://aegwebprod.blob.core.windows.net/json/events/<shardId>/events.json
//
// The shard id is NOT the path-fragment id from data_rv1/ that the spec
// originally referenced — those are two different numbers and only the
// events-shard id resolves. Stored per-venue in
// `venues.platform_venue_id`. Discovery during the #623 audit:
//
//   Bluebird Theater          = 2
//   Fiddler's Green           = 44
//   Gothic Theatre            = 37
//   Mission Ballroom          = 89
//   Ogden Theatre             = 7
//
// (Fillmore was originally suspected to be on the same platform but is
// actually Next.js + AXS, so it's not onboarded here.)

import { z } from 'zod'
import type { Venue } from '@concert-crawl/db'
import { createLogger } from '@concert-crawl/logger'
import type { NormalizedEvent } from '../../types.js'
import { stripDescriptionHtml } from '../strip-description-html.js'
import type { PlatformFetcher, PlatformFetchResult } from './index.js'

const logger = createLogger('aeg-fetcher')
const USER_AGENT = 'ConcertCrawl/1.0 (+https://concertcrawl.app/bot)'
const BLOB_BASE = 'https://aegwebprod.blob.core.windows.net/json/events'

// Schema validation. Only the fields we actually map are required; we
// don't validate the full ~50-key event shape AEG ships, to stay tolerant
// of additions on their side. Required-but-nullable fields use
// `.nullable()`; optional fields use `.optional()`.
const AegMediaItemSchema = z
  .object({
    width: z.number().optional(),
    file_name: z.string().optional(),
  })
  .passthrough()

const AegEventSchema = z
  .object({
    eventId: z.string(),
    active: z.boolean(),
    publishStatus: z.number(),
    title: z
      .object({
        headlinersText: z.string().nullable(),
        supportingText: z.string().nullable(),
        tour: z.string().nullable(),
        eventTitleText: z.string().nullable(),
      })
      .passthrough(),
    eventDateTimeISO: z.string().nullable(),
    doorDateTime: z.string().nullable(),
    ticketing: z
      .object({
        url: z.string().nullable(),
        // Some AEG shards (e.g. Gothic shard 37) omit `ticketURL` entirely
        // and only ship `url`. Downstream falls back to `url`.
        ticketURL: z.string().nullable().optional(),
      })
      .passthrough()
      .nullable(),
    description: z.string().nullable().optional(),
    // AEG inconsistently ships media as either an object keyed by image
    // size code OR an empty array when no media exists. Accept either
    // shape; the picker treats both as "no usable image".
    media: z
      .union([z.record(AegMediaItemSchema), z.array(z.unknown())])
      .optional(),
  })
  .passthrough()

const AegResponseSchema = z
  .object({
    meta: z.object({ total: z.number() }).passthrough(),
    events: z.array(AegEventSchema),
  })
  .passthrough()

export type AegEvent = z.infer<typeof AegEventSchema>
export type AegResponse = z.infer<typeof AegResponseSchema>

export class AegFetchError extends Error {
  constructor(
    public readonly httpStatus: number,
    public readonly url: string,
    message: string,
  ) {
    super(message)
    this.name = 'AegFetchError'
  }
}

export class AegSchemaError extends Error {
  constructor(
    public readonly url: string,
    public readonly issues: z.ZodIssue[],
    message: string,
  ) {
    super(message)
    this.name = 'AegSchemaError'
  }
}

function endpointUrl(shardId: string): string {
  return `${BLOB_BASE}/${encodeURIComponent(shardId)}/events.json`
}

/**
 * Pull "YYYY-MM-DD" + "HH:MM:SS" from AEG's `eventDateTimeISO` string
 * (e.g. "2026-06-18T20:00:00-06:00"). We deliberately read the LOCAL
 * portion of the offset-aware string instead of converting through Date
 * (which would jump to the crawler's UTC tz and shift the day boundary
 * for late-night shows). AEG always emits the venue's local time + the
 * matching UTC offset, so the local portion IS the venue local date.
 *
 * Returns null for unparseable input (e.g. "TBD"). Callers should skip
 * those events rather than failing the whole crawl.
 */
function parseEventDate(
  iso: string,
): { date: string; showTime: string } | null {
  const match = iso.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}(?::\d{2})?)/)
  if (!match) {
    return null
  }
  const time = match[2]!.length === 5 ? `${match[2]}:00` : match[2]!
  return { date: match[1]!, showTime: time }
}

function parseDoorTime(naive: string | null): string | undefined {
  if (!naive) return undefined
  const match = naive.match(/T(\d{2}:\d{2}(?::\d{2})?)/)
  if (!match) return undefined
  return match[1]!.length === 5 ? `${match[1]}:00` : match[1]!
}

function pickImageUrl(
  media: AegEvent['media'] | undefined,
): string | undefined {
  if (!media) return undefined
  // AEG ships empty media as `[]` (array) instead of `{}` (empty object).
  // Skip the array form — it never contains usable images.
  if (Array.isArray(media)) return undefined
  // Pick the largest available image by width. Falls back to the first
  // item that has a file_name if no widths are populated (defensive
  // against schema drift on AEG's side).
  let best: { width: number; url: string } | null = null
  for (const item of Object.values(media)) {
    if (!item.file_name) continue
    const width = item.width ?? 0
    if (best === null || width > best.width) {
      best = { width, url: item.file_name }
    }
  }
  return best?.url
}

function eventTitle(title: AegEvent['title']): string {
  // Prefer eventTitleText (the canonical display name). Fall back to
  // headlinersText for events that omit eventTitleText. Strip the
  // "Artist: Tour" pattern that AEG sometimes embeds in eventTitleText
  // by NOT stripping — the LLM path doesn't strip it either, and the
  // existing dedupe/canonical-artist pipeline handles variants.
  return title.eventTitleText ?? title.headlinersText ?? '(untitled event)'
}

function eventDescription(
  title: AegEvent['title'],
  description: string | null | undefined,
): string | undefined {
  // Compose a description that preserves the supporting-acts + tour
  // information AEG breaks out into separate fields. The bare LLM-path
  // description tends to embed this; preserving it here keeps the
  // `events.description` column consistent across extraction sources.
  //
  // AEG's `description` field commonly ships RHP-CMS HTML (e.g. Gothic
  // shard 37 surfaced `<p>`-wrapped prose that leaked through to the
  // consumer UI in #827). Strip HTML BEFORE composition so the joined
  // result is uniformly plain text — `tour` and `supportingText` are
  // already plain. An empty post-strip description is treated as absent
  // so we don't emit a trailing blank-line separator.
  const parts: string[] = []
  if (title.tour) parts.push(title.tour)
  if (title.supportingText) parts.push(`Supporting: ${title.supportingText}`)
  if (description) {
    const cleanDescription = stripDescriptionHtml(description)
    if (cleanDescription) parts.push(cleanDescription)
  }
  if (parts.length === 0) return undefined
  return parts.join('\n\n')
}

function normalize(
  event: AegEvent,
  venueCalendarUrl: string,
): NormalizedEvent | null {
  // Filter inactive / unpublished events at the adapter boundary so the
  // downstream pipeline only sees real upcoming shows. AEG marks
  // cancelled events with active=false; unpublished drafts with
  // publishStatus !== 1.
  if (!event.active) return null
  if (event.publishStatus !== 1) return null
  if (!event.eventDateTimeISO) return null

  const headliner = event.title.headlinersText
  if (!headliner) return null // can't normalize without an artist

  const parsedDate = parseEventDate(event.eventDateTimeISO)
  if (!parsedDate) {
    // AEG occasionally ships placeholder strings like "TBD" before a show
    // is officially announced. Skip those rather than failing the whole
    // crawl run — the next nightly crawl will pick them up once AEG sets a
    // real date.
    logger.warn(
      {
        eventId: event.eventId,
        eventDateTimeISO: event.eventDateTimeISO,
        headliner,
        venueCalendarUrl,
      },
      'aeg: skipping event with unparseable eventDateTimeISO',
    )
    return null
  }
  const { date, showTime } = parsedDate
  const doorsTime = parseDoorTime(event.doorDateTime)
  const ticketUrl =
    event.ticketing?.ticketURL ?? event.ticketing?.url ?? undefined
  const imageUrl = pickImageUrl(event.media)

  // Build the result with optional fields only included when populated.
  // tsconfig sets `exactOptionalPropertyTypes: true`, so we can't pass
  // `field: undefined` for `field?: string`.
  const description = eventDescription(event.title, event.description)
  const title = eventTitle(event.title)
  return {
    title,
    // Platform JSON ships AEG's own canonical headline — no LLM-style
    // decoration. Mirroring `title` into `rawTitle` keeps the cross-venue
    // filter's input contract uniform across extractors (#826).
    rawTitle: title,
    artist: headliner,
    date,
    showTime,
    ...(doorsTime !== undefined ? { doorsTime } : {}),
    ...(ticketUrl !== undefined ? { ticketUrl } : {}),
    ...(imageUrl !== undefined ? { imageUrl } : {}),
    ...(description !== undefined ? { description } : {}),
    // sourceUrl is the venue's human-visitable calendar URL (matches the
    // LLM path's convention; the AEG blob URL itself is logged separately
    // via PlatformFetchResult.sourceUrl).
    sourceUrl: venueCalendarUrl,
    // Confidence is 1.0 for platform fetches — no LLM uncertainty
    // (any deviation from the AEG schema becomes an AegSchemaError, not
    // a low-confidence row).
    confidence: 1.0,
  }
}

/**
 * Pull `https://host` out of an absolute URL. The AEG blob uses the
 * Origin header to authorize the request; deriving it from each venue's
 * own website URL means a per-venue branded subdomain check (if AEG ever
 * adds one) won't break us — and an audit log of who initiated the
 * fetch always points at the right venue.
 */
function originFromVenueUrl(websiteUrl: string): string {
  const parsed = new URL(websiteUrl)
  return `${parsed.protocol}//${parsed.host}`
}

async function fetchAegBlob(
  url: string,
  origin: string,
  timeoutMs?: number,
): Promise<unknown> {
  const response = await fetch(url, {
    headers: {
      // AEG's blob CORS layer checks Origin. We pass each venue's own
      // origin so a per-venue allowlist (if AEG adds one) keeps working,
      // and so any AEG-side telemetry attributes the request correctly.
      Origin: origin,
      'User-Agent': USER_AGENT,
      Accept: 'application/json',
    },
    // A hung CDN connection must not pin the caller (the admin probe
    // endpoint holds an API worker slot while this resolves).
    ...(timeoutMs !== undefined
      ? { signal: AbortSignal.timeout(timeoutMs) }
      : {}),
  })
  if (!response.ok) {
    throw new AegFetchError(
      response.status,
      url,
      `AEG fetch failed: HTTP ${response.status}`,
    )
  }
  return response.json()
}

async function aegFetch(
  venue: Venue,
  opts: { crawlDelayMs: number; timeoutMs?: number },
): Promise<PlatformFetchResult> {
  if (!venue.platformVenueId) {
    // Dispatcher's canHandle() should have caught this, but be defensive.
    throw new AegFetchError(
      0,
      '',
      `Venue ${venue.id} has platform='aeg' but no platform_venue_id`,
    )
  }
  const url = endpointUrl(venue.platformVenueId)
  const fetchedAt = Date.now()
  // Respect the venue's per-domain crawl delay. The platform blob is on
  // a different domain from the venue's website, but rate-limiting our
  // requests to AEG's CDN with the same conservative pacing is the
  // crawl-ethics-conservative call.
  if (opts.crawlDelayMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, opts.crawlDelayMs))
  }
  const raw = await fetchAegBlob(
    url,
    originFromVenueUrl(venue.websiteUrl),
    opts.timeoutMs,
  )
  const parseResult = AegResponseSchema.safeParse(raw)
  if (!parseResult.success) {
    throw new AegSchemaError(
      url,
      parseResult.error.issues,
      `AEG response did not match expected schema (${parseResult.error.issues.length} issue(s))`,
    )
  }
  const data = parseResult.data
  const fetchLatencyMs = Date.now() - fetchedAt

  // Filter to events at THIS venue. AEG's per-shard JSON usually only
  // contains the venue's own events, but the meta.total + an explicit
  // venue filter make us robust against AEG ever consolidating shards.
  // Note: AEG's `venue.title` is a display name, not an id — that's why
  // we compare it against `venue.name` (our DB display-name column).
  const filtered = data.events.filter((event) => {
    const eventVenueName = (event as { venue?: { title?: string } }).venue
      ?.title
    return !eventVenueName || eventVenueName === venue.name
  })

  const events: NormalizedEvent[] = []
  for (const event of filtered) {
    const normalized = normalize(event, venue.websiteUrl)
    if (normalized) events.push(normalized)
  }

  return {
    events,
    sourceUrl: url,
    meta: {
      fetchLatencyMs,
      totalEventsInBlob: data.meta.total,
      eventsAfterVenueFilter: filtered.length,
      eventsAfterNormalization: events.length,
    },
  }
}

export const aegFetcher: PlatformFetcher = {
  source: 'aeg',
  canHandle(venue) {
    return Boolean(
      venue.platform === 'aeg' &&
      venue.platformVenueId &&
      venue.platformVenueId.length > 0,
    )
  },
  fetch: aegFetch,
}
