// VenuePilot GraphQL API adapter (#505).
//
// Fetches events directly from VenuePilot's public GraphQL endpoint,
// bypassing the HTML → JSON-LD → LLM cascade. Keyed off
// venues.api_provider = 'venuepilot' + venues.api_account_id (the
// venue's VenuePilot account id, e.g. Levitt Pavilion Denver = 1105).
//
// Contract verified live 2026-07-17 against account 1105:
//   POST https://www.venuepilot.co/graphql   (public, no auth)
//   paginatedEvents(arguments: { accountIds: [Int!], startDate, page })
// Default page size is 100 (metadata.limitValue); there is no perPage
// argument.

import { z } from 'zod'
import type { Venue } from '@concert-crawl/db'
import { createLogger } from '@concert-crawl/logger'
import type { NormalizedEvent } from '../../types.js'
import { stripDescriptionHtml } from '../strip-description-html.js'
import { isAllowed } from '../robots.js'
import type { PlatformFetcher, PlatformFetchResult } from './index.js'

const logger = createLogger('venuepilot-fetcher')
const USER_AGENT = 'ConcertCrawl/1.0 (+https://concertcrawl.app/bot)'
const ENDPOINT = 'https://www.venuepilot.co/graphql'
// Guard against a runaway metadata.totalPages pinning the crawl.
const MAX_PAGES = 50

// Jitter the crawl delay (±500ms) so paged requests don't hit VenuePilot on a
// bot-like fixed interval — mirrors the cascade fetcher (lib/fetcher.ts). AEG
// still uses a flat delay; #985 backfills jitter there too.
function jitter(ms: number): number {
  return Math.max(0, ms + Math.floor(Math.random() * 1000) - 500)
}

const EVENTS_QUERY = `query($args: EventsApiArguments!) {
  paginatedEvents(arguments: $args) {
    collection {
      id
      name
      date
      doorTime
      startTime
      description
      ticketsUrl
      status
      announceArtists { name }
      announceImages { highlighted variants { variant src } }
    }
    metadata { totalCount totalPages currentPage limitValue }
  }
}`

// Only the fields we map are required; `.passthrough()` tolerates the
// rest of VenuePilot's event shape. Nullable/optional where the live API
// omits values.
const VariantSchema = z
  .object({ variant: z.string(), src: z.string() })
  .passthrough()

const ImageSchema = z
  .object({
    highlighted: z.boolean().optional(),
    variants: z.array(VariantSchema).optional(),
  })
  .passthrough()

const VenuePilotEventSchema = z
  .object({
    id: z.number(),
    name: z.string(),
    date: z.string(),
    doorTime: z.string().nullable().optional(),
    startTime: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    ticketsUrl: z.string().nullable().optional(),
    status: z.string().nullable().optional(),
    announceArtists: z
      .array(z.object({ name: z.string() }).passthrough())
      .optional(),
    announceImages: z.array(ImageSchema).optional(),
  })
  .passthrough()

const ResponseSchema = z
  .object({
    data: z.object({
      paginatedEvents: z.object({
        collection: z.array(VenuePilotEventSchema),
        metadata: z
          .object({
            totalCount: z.number(),
            totalPages: z.number(),
            currentPage: z.number(),
            limitValue: z.number(),
          })
          .passthrough(),
      }),
    }),
  })
  .passthrough()

// GraphQL can return HTTP 200 with a top-level `errors` array and no
// `data`. This partial schema recognizes that shape so we can surface it
// as a fetch error rather than a schema error.
const GraphQLErrorsSchema = z.object({
  errors: z.array(z.object({ message: z.string() }).passthrough()).min(1),
})

export type VenuePilotEvent = z.infer<typeof VenuePilotEventSchema>

export class VenuePilotFetchError extends Error {
  constructor(
    public readonly httpStatus: number,
    public readonly url: string,
    message: string,
  ) {
    super(message)
    this.name = 'VenuePilotFetchError'
  }
}

export class VenuePilotSchemaError extends Error {
  constructor(
    public readonly url: string,
    public readonly issues: z.ZodIssue[],
    message: string,
  ) {
    super(message)
    this.name = 'VenuePilotSchemaError'
  }
}

// Today, in the venue's timezone, as "YYYY-MM-DD". Filters the query to
// upcoming shows only (VenuePilot returns past events without startDate).
function todayInTimezone(timezone: string): string {
  // en-CA formats as YYYY-MM-DD; timeZone shifts to the venue-local day.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

// Pick the display image: prefer the highlighted image, else the first
// image; from that image prefer the `cover` variant, else its first
// variant. Returns undefined when no usable src exists.
function pickImageUrl(
  images: VenuePilotEvent['announceImages'],
): string | undefined {
  if (!images || images.length === 0) return undefined
  const chosen = images.find((image) => image.highlighted) ?? images[0]
  const variants = chosen?.variants
  if (!variants || variants.length === 0) return undefined
  const cover = variants.find((variant) => variant.variant === 'cover')
  return (cover ?? variants[0])?.src
}

// VenuePilot descriptions embed a custom <iframe-embed> element. The shared
// stripDescriptionHtml() helper only strips KNOWN HTML tag names (it preserves
// unknown tags like <heart> to keep its round-trip idempotent, #844), so it
// would leave <iframe-embed> markup in the plain-text description. Remove the
// whole element here — its inner content is embed chrome, not prose — before
// handing the string to the shared stripper. Runs on the raw markup VenuePilot
// serves (real tags, not entity-encoded, per the live 1105 probe).
const IFRAME_EMBED_BLOCK = /<iframe-embed\b[^>]*>[\s\S]*?<\/iframe-embed>/gi
const IFRAME_EMBED_TAG = /<\/?iframe-embed\b[^>]*>/gi

function stripVenuePilotDescription(html: string | null | undefined): string {
  if (!html) return ''
  const withoutEmbeds = html
    .replace(IFRAME_EMBED_BLOCK, ' ')
    .replace(IFRAME_EMBED_TAG, ' ')
  return stripDescriptionHtml(withoutEmbeds)
}

function normalize(
  event: VenuePilotEvent,
  venueCalendarUrl: string,
): NormalizedEvent | null {
  const title = event.name.trim()
  if (!title) {
    logger.warn(
      { eventId: event.id, venueCalendarUrl },
      'venuepilot: skipping event with empty/whitespace-only name',
    )
    return null
  }

  const headliner = event.announceArtists?.[0]?.name?.trim()
  const artist = headliner && headliner.length > 0 ? headliner : title

  const showTime = event.startTime ?? undefined
  const doorsTime = event.doorTime ?? undefined
  const ticketUrl =
    event.ticketsUrl && event.ticketsUrl.length > 0
      ? event.ticketsUrl
      : undefined
  const imageUrl = pickImageUrl(event.announceImages)
  const cleaned = stripVenuePilotDescription(event.description)
  const description = cleaned.length > 0 ? cleaned : undefined

  return {
    title,
    // Mirror title into rawTitle — the API ships a clean headline with no
    // LLM-style decoration, keeping the cross-venue presale filter's input
    // contract uniform across extractors (#826).
    rawTitle: title,
    artist,
    date: event.date,
    ...(showTime !== undefined ? { showTime } : {}),
    ...(doorsTime !== undefined ? { doorsTime } : {}),
    ...(ticketUrl !== undefined ? { ticketUrl } : {}),
    ...(imageUrl !== undefined ? { imageUrl } : {}),
    ...(description !== undefined ? { description } : {}),
    sourceUrl: venueCalendarUrl,
    confidence: 1.0,
  }
}

async function fetchPage(
  accountId: number,
  startDate: string,
  page: number,
  timeoutMs?: number,
): Promise<z.infer<typeof ResponseSchema>['data']['paginatedEvents']> {
  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'User-Agent': USER_AGENT,
    },
    body: JSON.stringify({
      query: EVENTS_QUERY,
      variables: { args: { accountIds: [accountId], startDate, page } },
    }),
    ...(timeoutMs !== undefined
      ? { signal: AbortSignal.timeout(timeoutMs) }
      : {}),
  })
  if (!response.ok) {
    throw new VenuePilotFetchError(
      response.status,
      ENDPOINT,
      `VenuePilot fetch failed: HTTP ${response.status}`,
    )
  }
  const raw: unknown = await response.json()

  // GraphQL errors come back on HTTP 200 with a top-level `errors` array.
  const errorsResult = GraphQLErrorsSchema.safeParse(raw)
  if (errorsResult.success) {
    const first = errorsResult.data.errors[0]!.message
    throw new VenuePilotFetchError(
      200,
      ENDPOINT,
      `VenuePilot GraphQL error: ${first}`,
    )
  }

  const parsed = ResponseSchema.safeParse(raw)
  if (!parsed.success) {
    throw new VenuePilotSchemaError(
      ENDPOINT,
      parsed.error.issues,
      `VenuePilot response did not match expected schema (${parsed.error.issues.length} issue(s))`,
    )
  }
  return parsed.data.data.paginatedEvents
}

async function venuePilotFetch(
  venue: Venue,
  opts: { crawlDelayMs: number; timeoutMs?: number },
): Promise<PlatformFetchResult> {
  const rawAccountId = venue.apiAccountId?.trim() ?? ''
  if (rawAccountId === '') {
    // canHandle() should have caught this; be defensive.
    throw new VenuePilotFetchError(
      0,
      ENDPOINT,
      `Venue ${venue.id} has apiProvider='venuepilot' but no api_account_id`,
    )
  }
  // Require a plain base-10 positive integer (no leading zeros). Number()
  // would otherwise accept non-decimal forms — "1e2" (=> 100), "0x10" (=> 16),
  // "  " (=> 0) — and Number.isInteger would wave them through, silently
  // fetching the wrong account instead of failing loudly.
  if (!/^[1-9][0-9]*$/.test(rawAccountId)) {
    throw new VenuePilotFetchError(
      0,
      ENDPOINT,
      `Venue ${venue.id} has an invalid api_account_id: ${venue.apiAccountId}`,
    )
  }
  const accountId = Number(rawAccountId)

  // Honor robots.txt for the endpoint domain we actually fetch (in addition to
  // crawlVenue's check of venue.websiteUrl). isAllowed caches per domain and
  // fails open, so this is a no-op unless VenuePilot adds an explicit Disallow.
  if (!(await isAllowed(ENDPOINT, USER_AGENT))) {
    throw new VenuePilotFetchError(
      0,
      ENDPOINT,
      `robots.txt disallows ${USER_AGENT} at ${ENDPOINT}`,
    )
  }

  const startDate = todayInTimezone(venue.timezone)
  const startedAt = Date.now()
  const events: NormalizedEvent[] = []
  let totalCount = 0
  let totalPages = 1
  let pagesFetched = 0

  for (let page = 1; page <= Math.min(totalPages, MAX_PAGES); page += 1) {
    if (opts.crawlDelayMs > 0) {
      const delay = jitter(opts.crawlDelayMs)
      if (delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
    const paginated = await fetchPage(
      accountId,
      startDate,
      page,
      opts.timeoutMs,
    )
    pagesFetched += 1
    totalCount = paginated.metadata.totalCount
    totalPages = paginated.metadata.totalPages
    for (const event of paginated.collection) {
      const normalized = normalize(event, venue.websiteUrl)
      if (normalized) events.push(normalized)
    }
  }

  // totalPages > MAX_PAGES means we stopped short of the full set — surface it
  // in meta (which is logged) so operators can alert on partial fetches rather
  // than silently serving truncated data.
  const truncated = totalPages > MAX_PAGES
  if (truncated) {
    logger.warn(
      { venueId: venue.id, totalPages, pagesFetched, cap: MAX_PAGES },
      'VenuePilot pagination hit MAX_PAGES cap — event set is truncated',
    )
  }

  return {
    events,
    sourceUrl: ENDPOINT,
    meta: {
      fetchLatencyMs: Date.now() - startedAt,
      totalCount,
      totalPages,
      pagesFetched,
      truncated,
      eventsAfterNormalization: events.length,
    },
  }
}

export const venuePilotFetcher: PlatformFetcher = {
  source: 'venuepilot',
  canHandle(venue) {
    // Trim so a whitespace-only api_account_id isn't treated as configured.
    return Boolean(
      venue.apiProvider === 'venuepilot' &&
      venue.apiAccountId &&
      venue.apiAccountId.trim().length > 0,
    )
  },
  fetch: venuePilotFetch,
}
