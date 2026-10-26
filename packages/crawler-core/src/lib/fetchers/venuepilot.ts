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
import { CRAWLER_USER_AGENT } from '@concert-crawl/types'
import type { NormalizedEvent } from '../../types.js'
import { stripDescriptionHtml } from '../strip-description-html.js'
import { CrawlFetchError } from '../fetcher.js'
import {
  CrawlSkipError,
  getCrawlDelayMs,
  isAllowedOrSkip,
  resolveCrawlDelayMs,
} from '../robots.js'
import { createDeadline } from './deadline.js'
import { jitter } from './jitter.js'
import type {
  PlatformFetcher,
  PlatformFetchOptions,
  PlatformFetchResult,
} from './index.js'

const logger = createLogger('venuepilot-fetcher')
const ENDPOINT = 'https://www.venuepilot.co/graphql'
// Guard against a runaway metadata.totalPages pinning the crawl.
const MAX_PAGES = 50

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

// Extends CrawlFetchError so crawl.ts's block classifier
// (`err instanceof CrawlFetchError && (httpStatus === 403 || 429)`) treats a
// VenuePilot 403/429 as an HTTP block — setting venues.blockedAt for admin
// recovery — rather than a plain failure that just increments
// consecutiveFailures and auto-pauses. Non-HTTP failures (validation, robots)
// pass httpStatus 0, which is neither 403 nor 429, so they never misclassify.
export class VenuePilotFetchError extends CrawlFetchError {
  constructor(
    httpStatus: number,
    public readonly url: string,
    message: string,
  ) {
    super(httpStatus, message)
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
// venues.timezone is a free-text column and can be invalid — an unknown
// timeZone makes Intl.DateTimeFormat throw a RangeError, which would fail
// the whole crawl. Fall back to UTC and log so the crawl still proceeds
// (mirrors the json-ld extractor's timezone guard).
function todayInTimezone(timezone: string, venueId: string): string {
  const format = (tz: string): string => {
    // Build the date from parts (matching the json-ld extractor) rather than
    // relying on .format() returning an ISO-like string — locale/ICU builds
    // can vary. timeZone shifts to the venue-local day.
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date())
    const pick = (type: Intl.DateTimeFormatPartTypes): string =>
      parts.find((part) => part.type === type)?.value ?? ''
    return `${pick('year')}-${pick('month')}-${pick('day')}`
  }
  try {
    return format(timezone)
  } catch (err) {
    logger.warn(
      { venueId, timezone, err },
      'venuepilot: invalid venue timezone — falling back to UTC for startDate',
    )
    return format('UTC')
  }
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

// "YYYY-MM-DD" with real calendar validity (rejects 2026-13-40 and the like).
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/
function isValidIsoDate(value: string): boolean {
  const match = ISO_DATE.exec(value)
  if (!match) return false
  const [, year, month, day] = match
  const date = new Date(`${value}T00:00:00Z`)
  return (
    !Number.isNaN(date.getTime()) &&
    date.getUTCFullYear() === Number(year) &&
    date.getUTCMonth() + 1 === Number(month) &&
    date.getUTCDate() === Number(day)
  )
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

  // event.date drives NormalizedEvent.date and the downstream events.date
  // upsert. VenuePilot's schema types it as a bare string, so guard the
  // format (and calendar validity) here — skip a malformed row with a warn
  // rather than failing the whole response, so one bad event can't drop the
  // venue's entire batch.
  if (!isValidIsoDate(event.date)) {
    logger.warn(
      { eventId: event.id, date: event.date, venueCalendarUrl },
      'venuepilot: skipping event with invalid date',
    )
    return null
  }

  // `announceArtists` is the venue's own performer list. The title fallback
  // below survives only as the DISPLAY string — it is not recorded as an
  // observation, which is what keeps 11 event titles out of the artists
  // projection.
  const announcedNames = (event.announceArtists ?? [])
    .map((entry) => entry.name.trim())
    .filter((name) => name.length > 0)
  // `announceArtists` carries no billing emphasis, so the only honest reading
  // is "first is the headliner, rest are openers". Reported as that split, not
  // one flat list the ladder would read as a co-headline bill (#1203).
  const observedPerformers = announcedNames.slice(0, 1)
  const observedSupportingArtists = announcedNames.slice(1)
  const artist = observedPerformers[0] ?? title

  const showTime = event.startTime ?? undefined
  const doorsTime = event.doorTime ?? undefined
  const trimmedTicketUrl = event.ticketsUrl?.trim()
  const ticketUrl =
    trimmedTicketUrl && trimmedTicketUrl.length > 0
      ? trimmedTicketUrl
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
    observedPerformers,
    observedSupportingArtists,
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
      'User-Agent': CRAWLER_USER_AGENT,
    },
    body: JSON.stringify({
      query: EVENTS_QUERY,
      variables: { args: { accountIds: [accountId], startDate, page } },
    }),
    // The endpoint is the only URL robots.txt cleared for this run, so a
    // redirect is not followed: it surfaces as a non-OK response below.
    redirect: 'manual',
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
  opts: PlatformFetchOptions,
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

  // The GraphQL endpoint is a path on VenuePilot's host like any other, so it
  // clears the same robots.txt gate as every page we fetch. Their file carries
  // a Cloudflare-managed `User-agent: *` / `Allow: /` group and a hand-written
  // `User-agent: *` / `Disallow: /` group; RFC 9309 combines the two and an
  // equal-length tie goes to Allow, so today this passes. If VenuePilot ever
  // closes it for real, the venue fails here and is paused like any other.
  if (!(await isAllowedOrSkip(ENDPOINT, CRAWLER_USER_AGENT))) {
    throw new VenuePilotFetchError(
      0,
      ENDPOINT,
      `robots.txt disallows ${ENDPOINT}`,
    )
  }
  // The endpoint's host states its own pacing, separate from the venue's
  // website, and it is the host every page of this run is asked of.
  const crawlDelayMs = resolveCrawlDelayMs(
    opts.crawlDelayMs,
    await getCrawlDelayMs(ENDPOINT, CRAWLER_USER_AGENT),
    { venueId: venue.id, url: ENDPOINT },
  )
  if (crawlDelayMs === null) {
    throw new CrawlSkipError(
      `robots.txt Crawl-delay for ${ENDPOINT} exceeds the cap; not crawled`,
    )
  }

  const startDate = todayInTimezone(venue.timezone, venue.id)
  const startedAt = Date.now()
  const deadline = createDeadline(opts)
  // The run budget crawl.ts handed us was sized from the venue site's delay.
  // When the endpoint asks for a longer one, widen the budget by the extra
  // wait per page so honoring it can't time the run out.
  deadline.extend((crawlDelayMs - opts.crawlDelayMs) * MAX_PAGES)
  const events: NormalizedEvent[] = []
  let totalCount = 0
  let totalPages = 1
  let pagesFetched = 0

  for (let page = 1; page <= Math.min(totalPages, MAX_PAGES); page += 1) {
    await deadline.wait(jitter(crawlDelayMs))
    const paginated = await deadline.run(`page-${page}`, (timeoutMs) =>
      fetchPage(accountId, startDate, page, timeoutMs),
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
  // Pagination stops at MAX_PAGES, and page 1 is inside that loop.
  maxRequests: MAX_PAGES,
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
