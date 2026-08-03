import type { Browser } from 'playwright'
import { and, desc, eq, gte, isNull, lt, or, sql } from 'drizzle-orm'
import {
  db,
  venues,
  events,
  crawlRuns,
  notifications,
  costTracking,
} from '@concert-crawl/db'
import type { CrawlRun } from '@concert-crawl/db'
import { reportFailure } from '@concert-crawl/logger'
import { isAllowed } from './lib/robots.js'
import { sendCrawlFailureEmail } from './lib/email.js'
import { checkEventCountDrop } from './lib/event-count-alert.js'
import { checkEventCeiling } from './lib/event-ceiling-alert.js'
import { checkUrlCoverage } from './lib/url-coverage-alert.js'
import { reconcileDriftDuplicates } from './reconcile-drift-duplicates.js'
import {
  fetchPage,
  fetchPageHttp,
  CrawlFetchError,
  CrawlSelectorTimeoutError,
  type FetchResult,
} from './lib/fetcher.js'
import { extractJsonLd } from './lib/extractors/json-ld.js'
import { extractTicketure } from './lib/extractors/ticketure.js'
import { extractWithLlm } from './lib/extractors/llm.js'
import { calculateCost } from './lib/cost.js'
import { dispatch } from './lib/fetchers/index.js'
import type { PlatformFetcher, PlatformSource } from './lib/fetchers/index.js'
import {
  detectCrossVenuePresale,
  type CrossVenueCandidate,
} from './lib/cross-venue-filter.js'
import {
  canonicalizeArtist,
  canonicalizeSupporting,
} from './lib/canonical-artist.js'
import { canonicalizeTitle } from './lib/canonical-title.js'
import { decodeHtmlEntities } from './lib/strip-description-html.js'
import { projectArtists } from './lib/artist-projection.js'
import { hashPage, hashEvent } from './lib/hash.js'
import { deriveTicketLinks } from './lib/ticket-links/index.js'
import { isListingPageUrl } from './lib/listing-url.js'
import type { NormalizedEvent, TokenUsage } from './types.js'

const USER_AGENT = 'ConcertCrawl/1.0 (+https://concertcrawl.app/bot)'

const AUTO_APPROVE_THRESHOLD = 0.7

// Ceiling on any single platform HTTP request (#1199). Without this the
// adapters omit the AbortSignal entirely, so a hung connection on the
// nightly cron hangs until something upstream gives up.
const PLATFORM_PER_REQUEST_TIMEOUT_MS = 20_000

// Multiplier over the analytical worst case, absorbing DNS, TLS, and the
// jitter the adapters add to each crawl delay.
const PLATFORM_DEADLINE_HEADROOM = 1.25

/**
 * Wall-clock budget for a whole platform fetch, derived from the adapter's
 * declared request count and the venue's own pacing.
 *
 * A flat constant can't work across the fetchers: AEG makes one request
 * while VenuePilot can make 50, and at a 3s crawl delay that's 150s of
 * deliberate pacing before a single response counts against the budget. A
 * budget that fits AEG would fail VenuePilot nightly — and a breach records
 * the run as failed, which feeds consecutiveFailures and the 3-strikes
 * auto-pause, so a tight budget wouldn't just lose one night's data, it
 * would take the venue offline.
 *
 * Sized to fire only when a fetch is genuinely stuck rather than merely
 * slow: the per-request timeout is what bounds a single hung connection.
 */
function platformOverallTimeoutMs(
  fetcher: PlatformFetcher,
  venue: { crawlDelayMs: number },
): number {
  const worstCasePerRequest =
    venue.crawlDelayMs + PLATFORM_PER_REQUEST_TIMEOUT_MS
  return Math.ceil(
    fetcher.maxRequests * worstCasePerRequest * PLATFORM_DEADLINE_HEADROOM,
  )
}

// Normalizes a show_time string to the Postgres `time` output form
// (HH:MM:SS) for building the in-memory dedup key. Null/empty/unparseable
// → '' — which groups with the DB's NULL under NULLS NOT DISTINCT. DB rows
// return 'HH:MM:SS' already, so this is idempotent on the existingMap side.
function showTimeKey(raw: string | null | undefined): string {
  if (!raw) return ''
  const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(raw.trim())
  if (!match) return ''
  const hours = match[1] ?? ''
  const minutes = match[2] ?? '00'
  const seconds = match[3] ?? '00'
  return `${hours.padStart(2, '0')}:${minutes}:${seconds}`
}

function dedupKey(
  canonicalArtist: string,
  date: string,
  showTime: string | null | undefined,
): string {
  return `${canonicalArtist}|${date}|${showTimeKey(showTime)}`
}

// Chunk size for HTML capture. Render's log pipeline silently drops stdout
// lines beyond ~16KB *bytes*. JS String.length is UTF-16 code units, but
// when a code unit encodes to UTF-8 it can take up to 4 bytes (emoji,
// supplementary plane chars). Capping at 2000 chars gives a worst-case
// line size of ~8KB even with all-4-byte content — comfortable headroom
// under Render's limit without needing TextEncoder-based byte arithmetic.
// Exported so tests can derive their expectations from this constant
// rather than hardcoding chunk counts.
export const DEBUG_CAPTURE_CHUNK_CHARS = 2000

// Total chars to capture (head only — Squarespace and similar SPAs render
// the calendar markup near the top; the bot-served sparse page is
// usually small anyway). 80K covers most full pages we'd realistically
// want to inspect.
export const DEBUG_CAPTURE_MAX_CHARS = 80_000

// Normalize an extractor-provided URL (both ticketUrl and eventUrl route
// through here). Empty or whitespace-only strings become null so
// events.ticket_url / events.event_url and events.ticket_links agree on "no
// URL available" — deriveTicketLinks already treats '' as missing, but the
// column would otherwise persist as a non-null blank string.
function normalizeTicketUrl(url: string | null | undefined): string | null {
  const trimmed = url?.trim()
  return trimmed ? trimmed : null
}

interface DebugCaptureContext {
  venueId: string
  venueSlug: string
  crawlRunId: string
  mode: 'http' | 'browser'
  finalUrl: string
  httpStatus: number
}

// Logs the fetched HTML to stdout, split into multiple lines so each line
// stays under the host log-aggregator's per-line limit (Render drops lines
// >~16KB). Caller reassembles by filtering on captureId and sorting by
// chunkIdx. A header line (debug.html_capture) precedes the chunk lines
// (debug.html_capture.chunk) so the metadata is preserved even if a chunk
// is dropped.
function logDebugHtmlCapture(html: string, ctx: DebugCaptureContext): void {
  const captured = html.slice(0, DEBUG_CAPTURE_MAX_CHARS)
  const truncated = html.length > DEBUG_CAPTURE_MAX_CHARS
  const totalChunks = Math.ceil(captured.length / DEBUG_CAPTURE_CHUNK_CHARS)
  const captureId = crypto.randomUUID()

  console.log(
    JSON.stringify({
      event: 'debug.html_capture',
      captureId,
      venueId: ctx.venueId,
      venueSlug: ctx.venueSlug,
      crawlRunId: ctx.crawlRunId,
      mode: ctx.mode,
      finalUrl: ctx.finalUrl,
      httpStatus: ctx.httpStatus,
      totalLength: html.length,
      capturedLength: captured.length,
      totalChunks,
      truncated,
    }),
  )

  for (let chunkIdx = 0; chunkIdx < totalChunks; chunkIdx++) {
    const start = chunkIdx * DEBUG_CAPTURE_CHUNK_CHARS
    const chunk = captured.slice(start, start + DEBUG_CAPTURE_CHUNK_CHARS)
    console.log(
      JSON.stringify({
        event: 'debug.html_capture.chunk',
        captureId,
        chunkIdx,
        totalChunks,
        chunk,
      }),
    )
  }
}

async function runExtraction(
  html: string,
  finalUrl: string,
  timeZone: string,
): Promise<{
  normalizedEvents: NormalizedEvent[]
  strategy: 'structured_data' | 'llm'
  tokenUsage: TokenUsage | undefined
}> {
  let normalizedEvents: NormalizedEvent[] = extractJsonLd(
    html,
    finalUrl,
    timeZone,
  )
  let strategy: 'structured_data' | 'llm' = 'structured_data'
  let tokenUsage: TokenUsage | undefined
  // Ticketure venues serve an empty body and hydrate from `__NEXT_DATA__`, so
  // they carry no JSON-LD and the LLM sees a page with no listings — it
  // honestly reports zero (#1340). Read the hydration payload before paying
  // for an LLM call that cannot succeed. A no-op on every other venue.
  if (normalizedEvents.length === 0) {
    normalizedEvents = extractTicketure(html, finalUrl, timeZone)
  }
  if (normalizedEvents.length === 0) {
    strategy = 'llm'
    const llmResult = await extractWithLlm(html, finalUrl)
    normalizedEvents = llmResult.events
    tokenUsage = llmResult.usage
  }
  return { normalizedEvents, strategy, tokenUsage }
}

// "Today" in the venue's reference timezone (Mountain Time). The admin
// stale-event surface filters with the same Denver-tz date — using Postgres
// CURRENT_DATE here would silently diverge around midnight (Render's UTC
// "today" can be ahead of Denver's, marking rows missing that the admin
// surface still considers upcoming, or vice versa).
const DENVER_TODAY = sql`(NOW() AT TIME ZONE 'America/Denver')::date`

// Refreshes last_seen_at + clears first_missing_at for every upcoming event
// at this venue (date >= today). Used by the page-hash skip path in
// crawlVenue: when the venue's page is byte-identical to the prior successful
// run, every event we'd have extracted is identical too — so by definition
// nothing is missing. Past events are intentionally excluded because the
// stale-detection surface only queries date >= today (Denver tz).
async function markEventsSeenForVenue(
  venueId: string,
  seenAt: Date,
): Promise<void> {
  await db
    .update(events)
    .set({ lastSeenAt: seenAt, firstMissingAt: null })
    .where(
      and(
        eq(events.venueId, venueId),
        eq(events.status, 'upcoming'),
        gte(events.date, DENVER_TODAY),
      ),
    )
}

// crawlVenue's return value: the crawl_runs row plus the DB ids of events
// this run INSERTED (as opposed to updated). The Spotify fan-out (#763 §10.1)
// keys "new show" alerts off inserted rows only — an update to an existing
// listing must never re-alert. Empty on the robots-blocked / page-hash-skip /
// failed paths, where by definition nothing was inserted.
export type CrawlVenueResult = CrawlRun & { insertedEventIds: string[] }

// A Browser, or a thunk that launches one on first use. Callers that may crawl
// only `crawlMode: 'http'` venues pass the thunk so Chromium is never launched
// — a browser costs ~150Mi of a 512Mi cron and was OOM-killing whole runs
// (#1352). Resolved at the fetchPage call sites, which is the only place a
// browser is genuinely required, so the auto-detect HTTP→browser fallback still
// gets one.
export type BrowserSource = Browser | (() => Promise<Browser>)

// Memoized per crawlVenue call so the "first use" in the type's contract is
// enforced here rather than assumed of the caller. A single call can reach a
// resolve site more than once (crawlMode: null → HTTP succeeds → no structured
// data → browser fallback), and a caller passing a bare
// `() => chromium.launch()` would otherwise launch and leak a second browser.
// A rejection is deliberately not cached — a transient launch failure would
// otherwise poison the provider for the rest of the call.
const memoizeBrowser = (source: BrowserSource): (() => Promise<Browser>) => {
  if (typeof source !== 'function') return async () => source
  let pending: Promise<Browser> | null = null
  return () => {
    pending ??= source().catch((launchErr: unknown) => {
      pending = null
      throw launchErr
    })
    return pending
  }
}

export async function crawlVenue(
  venueId: string,
  browser: BrowserSource,
  crawlRunId?: string,
  crossVenueCandidates: CrossVenueCandidate[] = [],
  // When true, both hash-skip short-circuits are bypassed: the venue-level
  // page-hash skip never fires, and every extracted event is re-upserted even
  // if its source hash is unchanged. Used to reprocess legacy rows whose
  // listings are byte-identical to the last crawl (e.g. backfilling
  // supportingArtists). Default false preserves the cost-saving skip path for
  // normal + scheduled crawls.
  force = false,
): Promise<CrawlVenueResult> {
  const getBrowser = memoizeBrowser(browser)
  const id = crawlRunId ?? crypto.randomUUID()
  const startedAt = Date.now()
  // Date snapshot captured up-front so the stale-event detection update can
  // compare it against events.last_seen_at after the per-venue upsert pass
  // runs. Using a single value across both update statements guarantees the
  // "events I just saw" set is exactly the complement of the "events that
  // should have appeared but didn't" set.
  const startedAtDate = new Date(startedAt)

  const [venue] = await db
    .select()
    .from(venues)
    .where(
      and(
        eq(venues.id, venueId),
        eq(venues.active, true),
        eq(venues.verified, true),
      ),
    )

  if (!venue) {
    throw new Error(`Venue ${venueId} not found or not active/verified`)
  }

  console.log(
    JSON.stringify({ event: 'crawl.start', venueId, venueName: venue.name }),
  )

  // Check robots.txt — fails open on fetch errors, blocks only on explicit Disallow
  const allowed = await isAllowed(venue.websiteUrl, USER_AGENT)
  if (!allowed) {
    console.log(
      JSON.stringify({
        event: 'crawl.robots_blocked',
        venueId,
        url: venue.websiteUrl,
      }),
    )
    const [crawlRun] = await db
      .insert(crawlRuns)
      .values({
        id,
        venueId,
        status: 'failed',
        robotsTxtBlocked: 'yes',
        eventsFound: 0,
        eventsInserted: 0,
        durationMs: Date.now() - startedAt,
      })
      .returning()
    if (!crawlRun) throw new Error('crawl_runs insert returned no row')
    await db
      .update(venues)
      .set({
        robotsTxtAllowed: false,
        robotsTxtCheckedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(venues.id, venueId))
    return { ...crawlRun, insertedEventIds: [] }
  }

  try {
    // Platform fetcher dispatch (#623). If the venue is on a known
    // platform (AEG today; Etix / Ticketmaster / AXS in follow-up PRs),
    // hit the platform's JSON endpoint directly and skip the HTML
    // retrieval + extraction stages entirely. The dispatcher returns
    // null when no fetcher applies, falling through to the existing
    // HTML → JSON-LD → LLM cascade.
    //
    // Failure semantics: if the platform fetcher throws (network,
    // schema drift, missing config), we let the error bubble into the
    // outer catch, which treats it the same as any other crawl failure
    // (consecutive_failures++, crawl_runs.status='failed'). We do NOT
    // silently fall back to the LLM path on platform errors — the
    // failure mode would be too easy to hide. The crawl.failed alert
    // makes it audible; the operator can manually clear the platform
    // column to revert to LLM if needed.
    const platformFetcher = dispatch(venue)

    // Local widening of the runExtraction return type to also accept the
    // platform path's strategy values. crawl_runs.extraction_strategy_used
    // is plain text, so the database happily stores 'platform:aeg' alongside
    // 'structured_data' / 'llm'; this type just lets the TS compiler
    // recognize both branches as compatible.
    type ExtractionResult = {
      normalizedEvents: NormalizedEvent[]
      strategy: 'structured_data' | 'llm' | `platform:${PlatformSource}`
      tokenUsage: TokenUsage | undefined
    }
    let extraction: ExtractionResult
    let httpStatus: number | null
    let pageHash: string | null
    let resolvedMode: 'http' | 'browser'

    if (platformFetcher) {
      const platformResult = await platformFetcher.fetch(venue, {
        crawlDelayMs: venue.crawlDelayMs,
        perRequestTimeoutMs: PLATFORM_PER_REQUEST_TIMEOUT_MS,
        overallTimeoutMs: platformOverallTimeoutMs(platformFetcher, venue),
      })
      extraction = {
        normalizedEvents: platformResult.events,
        strategy: `platform:${platformFetcher.source}`,
        tokenUsage: undefined,
      }
      // Platform path has no HTML byte stream to hash + no upstream HTTP
      // status to record. The crawl_runs columns are nullable so we leave
      // them empty for these rows — the extraction_strategy_used column
      // ('platform:aeg') is the discriminator that tells operators the
      // row came from a platform fetcher.
      httpStatus = null
      pageHash = null
      // resolvedMode is only used by the existing crawlMode auto-detect
      // venue-update at line ~702; for platform venues we don't want to
      // touch crawlMode, so the value here is functionally a no-op as
      // long as the venue already has a crawlMode set (it does — all
      // onboarded AEG venues were 'browser' before this PR).
      resolvedMode = venue.crawlMode ?? 'browser'
      console.log(
        JSON.stringify({
          event: 'crawl.platform_fetch',
          venueId,
          source: platformFetcher.source,
          endpoint: platformResult.sourceUrl,
          eventsFound: platformResult.events.length,
          meta: platformResult.meta,
        }),
      )
    } else {
      // Existing HTML → JSON-LD → LLM cascade. Branches by venue.crawlMode:
      //   'browser' → Playwright direct
      //   'http'    → HTTP-only (no browser fallback on error)
      //   null      → auto-detect: HTTP first, fall back to browser
      let fetchResult: FetchResult

      if (venue.crawlMode === 'browser') {
        fetchResult = await fetchPage(
          venue.websiteUrl,
          await getBrowser(),
          venue.crawlDelayMs,
          venue.crawlWaitUntil,
          venue.crawlWaitForSelector ?? undefined,
        )
        resolvedMode = 'browser'
      } else {
        // crawlMode is 'http' or null (auto-detect: HTTP first)
        let httpResult: FetchResult | null = null
        try {
          httpResult = await fetchPageHttp(venue.websiteUrl, venue.crawlDelayMs)
        } catch (httpErr) {
          if (venue.crawlMode === 'http') {
            throw httpErr // forced HTTP — no browser fallback
          }
          // auto-detect: HTTP failed, will fall through to browser below
        }

        if (httpResult !== null) {
          fetchResult = httpResult
          resolvedMode = 'http'
        } else {
          // auto-detect: HTTP threw — fall back to browser
          fetchResult = await fetchPage(
            venue.websiteUrl,
            await getBrowser(),
            venue.crawlDelayMs,
            venue.crawlWaitUntil,
            venue.crawlWaitForSelector ?? undefined,
          )
          resolvedMode = 'browser'
        }
      }

      const { html, finalUrl } = fetchResult
      httpStatus = fetchResult.httpStatus

      if (venue.debugCaptureHtml) {
        logDebugHtmlCapture(html, {
          venueId,
          venueSlug: venue.slug,
          crawlRunId: id,
          mode: resolvedMode,
          finalUrl,
          httpStatus,
        })
      }

      pageHash = hashPage(html)

      const [lastRun] = await db
        .select({ pageHash: crawlRuns.pageHash })
        .from(crawlRuns)
        .where(
          and(eq(crawlRuns.venueId, venueId), eq(crawlRuns.status, 'success')),
        )
        .orderBy(desc(crawlRuns.createdAt))
        .limit(1)

      if (
        !force &&
        lastRun?.pageHash !== undefined &&
        lastRun.pageHash !== null &&
        lastRun.pageHash === pageHash
      ) {
        console.log(
          JSON.stringify({
            event: 'crawl.skipped',
            venueId,
            url: venue.websiteUrl,
          }),
        )
        const [crawlRun] = await db
          .insert(crawlRuns)
          .values({
            id,
            venueId,
            status: 'skipped',
            httpStatusCode: httpStatus,
            robotsTxtBlocked: 'no',
            pageHash,
            eventsFound: 0,
            eventsInserted: 0,
            durationMs: Date.now() - startedAt,
          })
          .returning()
        if (!crawlRun) throw new Error('crawl_runs insert returned no row')
        await db
          .update(venues)
          .set({
            lastCrawledAt: new Date(),
            consecutiveFailures: 0,
            robotsTxtAllowed: true,
            robotsTxtCheckedAt: new Date(),
            ...(venue.crawlMode === null ? { crawlMode: resolvedMode } : {}),
            updatedAt: new Date(),
          })
          .where(eq(venues.id, venueId))
        // Page-hash skip path (#607): the page is byte-identical to the last
        // successful crawl, so by definition every event present then is still
        // present now. Refresh last_seen_at + clear any stale first_missing_at
        // on all upcoming events for this venue. Filtering by date >= today
        // matches the API surface — past events never go stale.
        await markEventsSeenForVenue(venueId, startedAtDate)
        return { ...crawlRun, insertedEventIds: [] }
      }

      // Extract events. In auto-detect mode, only check JSON-LD on the HTTP HTML
      // before deciding to fall back — avoids paying an LLM call on HTTP markup
      // that a JS-rendered venue won't populate anyway.
      if (venue.crawlMode === null && resolvedMode === 'http') {
        // Same pre-browser structured check as runExtraction: JSON-LD first,
        // then the Ticketure hydration payload. Finding either means the HTTP
        // markup already carries the listings, so the browser fetch below is
        // pure cost.
        const httpJsonLdEvents = extractJsonLd(html, finalUrl, venue.timezone)
        const httpStructuredEvents =
          httpJsonLdEvents.length > 0
            ? httpJsonLdEvents
            : extractTicketure(html, finalUrl, venue.timezone)
        if (httpStructuredEvents.length > 0) {
          extraction = {
            normalizedEvents: httpStructuredEvents,
            strategy: 'structured_data' as const,
            tokenUsage: undefined,
          }
        } else {
          // No structured data on HTTP HTML — fall back to browser before invoking LLM.
          // The crawlDelayMs fires inside both fetchPageHttp (above) and fetchPage (here),
          // which is intentional: each request to the venue's origin deserves its own delay.
          const browserResult = await fetchPage(
            venue.websiteUrl,
            await getBrowser(),
            venue.crawlDelayMs,
            venue.crawlWaitUntil,
            venue.crawlWaitForSelector ?? undefined,
          )
          if (venue.debugCaptureHtml) {
            logDebugHtmlCapture(browserResult.html, {
              venueId,
              venueSlug: venue.slug,
              crawlRunId: id,
              mode: 'browser',
              finalUrl: browserResult.finalUrl,
              httpStatus: browserResult.httpStatus,
            })
          }
          extraction = await runExtraction(
            browserResult.html,
            browserResult.finalUrl,
            venue.timezone,
          )
          resolvedMode = 'browser'
        }
      } else {
        extraction = await runExtraction(html, finalUrl, venue.timezone)
      }
    }

    const { strategy, tokenUsage } = extraction

    // Cross-venue presale filter — drop "Artist AT OTHER VENUE" rows so the
    // host venue's crawl owns the canonical row (see issue #605). Emits a
    // structured log per skip for auditability.
    //
    // Feed `rawTitle` (the verbatim source headline) into the filter, not
    // the cleaned `title`. The LLM extractor strips listing decoration like
    // "AEG Presents Connor Price & Nic D AT MISSION BALLROOM" down to
    // "AEG Presents Connor Price & Nic D" when populating `title`, dropping
    // the exact "AT MISSION BALLROOM" marker the regex needs. `rawTitle` is
    // required on NormalizedEvent and is populated by every extractor (LLM
    // tool schema; JSON-LD and platform JSON mirror title into rawTitle at
    // the extractor seam) so the filter always sees the verbatim string.
    // See issue #826.
    // Decode HTML entities in the title pair before anything reads them.
    // Cervantes' feed serves entity-encoded headlines (`&amp;`, `&#8217;`)
    // that reached `events.title` verbatim and rendered as literal
    // `&#8217;` to consumers. Description already decodes at the extractor
    // seam; titles had no equivalent pass.
    //
    // This runs BEFORE the cross-venue filter, not after, because the
    // filter compares the marker text against venue names character by
    // character — an encoded "AT FIDDLER&#8217;S GREEN AMPHITHEATRE" never
    // matches the seeded "Fiddler's Green Amphitheatre" under any of the
    // filter's comparison forms, so the presale row leaked through as a
    // duplicate of the host venue's own listing. Decoding first fixes the
    // display bug and closes that filter blind spot in one pass (#1338).
    // `rawTitle` is typed as required on NormalizedEvent but is absent on
    // some real extractor outputs, so it is decoded only when present rather
    // than assumed — calling `.replace` on an undefined throws and takes the
    // whole run to `failed`. The filter call below is the softer half of the
    // same problem: it doesn't throw, it just matches the wrong string.
    const decodedEvents = extraction.normalizedEvents.map((evt) => ({
      ...evt,
      title: decodeHtmlEntities(evt.title),
      ...(typeof evt.rawTitle === 'string'
        ? { rawTitle: decodeHtmlEntities(evt.rawTitle) }
        : {}),
    }))

    const normalizedEvents = decodedEvents.filter((evt) => {
      const match = detectCrossVenuePresale({
        // `rawTitle` is typed as required but is absent on some real extractor
        // outputs. An undefined here doesn't throw — the regex coerces it to
        // the literal "undefined" — it silently tests the wrong string, so the
        // filter quietly stops catching presale markers for that source.
        title: evt.rawTitle ?? evt.title,
        sourceVenueId: venueId,
        sourceVenueName: venue.name,
        ticketUrl: evt.ticketUrl,
        candidates: crossVenueCandidates,
      })
      if (!match) return true
      console.log(
        JSON.stringify({
          event: 'crawler.skip_cross_venue',
          sourceUrl: evt.sourceUrl,
          sourceVenueSlug: venue.slug,
          matchedVenueSlug: match.matchedVenueSlug,
          matchedVenueName: match.matchedVenueName,
          reason: match.reason,
          title: evt.title,
          rawTitle: evt.rawTitle,
        }),
      )
      return false
    })

    // Upsert events — insert on first crawl, update mutable fields on re-crawl
    let eventsInserted = 0
    let eventsUpdated = 0
    // DB ids of rows this run INSERTED (not updated) — recovered from the
    // upsert's RETURNING clause by checking each returned (canonical_artist,
    // date, show_time) key against existingMap. Feeds the Spotify fan-out (#763 §10.1).
    const insertedEventIds: string[] = []
    // Track (canonical_artist, date, show_time) tuples seen this run so the
    // stale-event detection below can refresh last_seen_at for them. Includes
    // both freshly-inserted and unchanged-hash events — "seen" means "the
    // venue's page still advertised this show." Keyed by canonical_artist +
    // show_time (the new dedup key, #1053) so billing-title variants of the
    // same show don't cause Pass 2 to stamp the row missing on the
    // re-extraction that chose a different title.
    const seenEventCoords: {
      canonicalArtist: string
      date: string
      showTime: string | null
    }[] = []
    if (normalizedEvents.length > 0) {
      // Compute sourceHash for each extracted event, then deduplicate by
      // (canonical_artist, date, show_time). LLM extraction can return the
      // same listing twice with slightly different artist-substring choices
      // on compound titles. Both rows have the same canonical_artist (post
      // #643 canonicalization is stable across substrings) and the same
      // show_time, so the second would hit the ON CONFLICT and fail with
      // "cannot affect row a second time." The in-memory dedup drops it
      // before the upsert. (#1053)
      const seenEventKeys = new Set<string>()
      const eventsWithHashes = normalizedEvents
        .map((event) => ({
          ...event,
          canonicalArtist: canonicalizeArtist(event.artist),
          canonicalSupporting: canonicalizeSupporting(
            event.supportingArtists ?? [],
          ),
          canonicalTitle: canonicalizeTitle(event.title),
          sourceHash: hashEvent({
            title: event.title,
            date: event.date,
            // Normalize time formats before hashing so a source emitting
            // 'HH:MM' one crawl and 'HH:MM:SS' the next (or vice-versa)
            // does not churn the hash and fire a false
            // crawl.verified_event_changed. Same rationale as excluding
            // `artist` from the hash (#825); showTimeKey collapses the
            // format variants a real listing change wouldn't. (#1053)
            doorsTime: showTimeKey(event.doorsTime),
            showTime: showTimeKey(event.showTime),
          }),
        }))
        // Defensive: drop any event whose title canonicalizes to '' before
        // the dedup filter below. canonicalizeTitle returns '' for empty /
        // non-string / whitespace-only input. (#821 R3)
        .filter((evt) => evt.canonicalTitle !== '')
        // Defensive: drop any event whose canonical_artist is '' — empty
        // canonical_artist would collapse all no-artist events on the same
        // date into a single ('|YYYY-MM-DD|') key, risking spurious UNIQUE
        // violations against events_venue_date_canonical_artist_showtime_idx.
        // Mirror the canonical_title guard's rationale. (#1053)
        .filter((evt) => evt.canonicalArtist !== '')
        .filter((evt) => {
          const key = dedupKey(evt.canonicalArtist, evt.date, evt.showTime)
          if (seenEventKeys.has(key)) return false
          seenEventKeys.add(key)
          return true
        })

      // Load existing UPCOMING events for this venue to compare hashes.
      // Keyed by (canonical_artist, date, show_time) — the new dedup key
      // (#1053) — so a re-extraction with a different billing title hits the
      // row stored under the same headliner + date + time.
      //
      // status='upcoming' filter mirrors the ON CONFLICT target's predicate
      // (the partial UNIQUE index in 0057). Without it, an admin-cancelled
      // row would still appear in existingMap — and a fresh extraction of
      // the same show would be incorrectly classified as an update (when
      // it should INSERT a new upcoming row alongside the cancelled one),
      // and changedVerified would fire spurious alerts for source-data
      // changes on rows the admin has already cancelled.
      const existingRows = await db
        .select({
          canonicalArtist: events.canonicalArtist,
          canonicalTitle: events.canonicalTitle,
          date: events.date,
          doorsTime: events.doorsTime,
          showTime: events.showTime,
          title: events.title,
          sourceHash: events.sourceHash,
          verified: events.verified,
          eventUrl: events.eventUrl,
        })
        .from(events)
        .where(and(eq(events.venueId, venueId), eq(events.status, 'upcoming')))

      const existingMap = new Map(
        existingRows.map(
          (row) =>
            [
              dedupKey(row.canonicalArtist, row.date, row.showTime),
              row,
            ] as const,
        ),
      )

      // Notify admin when a verified event's source data has changed.
      //
      // Compare the underlying fields directly rather than the stored
      // sourceHash. The hash function has changed over time (e.g. #1053
      // added showTimeKey normalization), so a row hashed under an older
      // scheme has a sourceHash that no longer equals the current hash of
      // identical source data — firing a spurious verified_event_changed
      // on the first crawl after every hash-scheme change (#1124). Field
      // comparison is stable across hash-scheme changes: it fires only on
      // a real change to title, doors time, or show time. Times are run
      // through showTimeKey so a pure 'HH:MM' ↔ 'HH:MM:SS' format shift
      // (same rationale as the hash) does not count as a change. The
      // null-hash guard is retained: a row with no stored hash predates
      // hash tracking entirely and must not alert on backfill.
      const changedVerified = eventsWithHashes.filter((evt) => {
        const existing = existingMap.get(
          dedupKey(evt.canonicalArtist, evt.date, evt.showTime),
        )
        if (
          !existing ||
          existing.verified !== true ||
          existing.sourceHash === null
        ) {
          return false
        }
        return (
          existing.title !== evt.title ||
          showTimeKey(existing.doorsTime) !== showTimeKey(evt.doorsTime) ||
          showTimeKey(existing.showTime) !== showTimeKey(evt.showTime)
        )
      })

      if (changedVerified.length > 0) {
        await db.insert(notifications).values(
          changedVerified.map((e) => ({
            type: 'admin_alert' as const,
            category: 'crawl.verified_event_changed',
            title: `Verified event may have changed: ${venue.name}`,
            body: `Verified event may have changed: "${e.title}" at ${venue.name} on ${e.date}`,
            metadata: JSON.stringify({ venueId, crawlRunId: id }),
          })),
        )
      }

      // Every event the venue still advertises this run — both newly inserted
      // and unchanged-and-skipped — counts as "seen" for stale detection.
      // Populating before the upsert filter keeps the keys correct even when
      // the upsert path is skipped because every hash matched. Push a
      // DB-comparable show_time: normalize empty string to null so the value
      // matches what Postgres stores (the `time` cast rejects empty strings).
      for (const evt of eventsWithHashes) {
        seenEventCoords.push({
          canonicalArtist: evt.canonicalArtist,
          date: evt.date,
          showTime: evt.showTime && evt.showTime !== '' ? evt.showTime : null,
        })
      }

      // Only upsert events that are new or have changed content. A forced
      // reprocess re-upserts every event regardless of source hash, so
      // re-extracted fields not covered by the hash (e.g. supportingArtists)
      // get written back even when title/date/times are unchanged.
      const eventsToUpsert = force
        ? eventsWithHashes
        : eventsWithHashes.filter((evt) => {
            const existing = existingMap.get(
              dedupKey(evt.canonicalArtist, evt.date, evt.showTime),
            )
            if (!existing) return true // new event
            // event_url is not part of sourceHash, so a row stored before
            // the extractor could name a show's own page would never be
            // rewritten by the hash check alone — leaving the "Get tickets"
            // CTA on the venue's calendar index forever (#1152).
            if (
              existing.eventUrl === null &&
              normalizeTicketUrl(evt.eventUrl) !== null
            ) {
              return true
            }
            return (
              existing.sourceHash === null ||
              existing.sourceHash !== evt.sourceHash
            ) // null hash backfill or content changed
          })

      if (eventsToUpsert.length > 0) {
        const eventValues = eventsToUpsert.map((event) => {
          // Empty-string normalization matches doorsTime/showTime so an
          // extractor that yields '' (some LLM/JSON-LD paths do) doesn't
          // persist as a non-null empty URL. Without this, ticketUrl=''
          // ends up paired with ticketLinks=null (deriveTicketLinks treats
          // '' as missing) and downstream consumers can't tell the two
          // states apart. Compute once and reuse so both columns agree.
          // An extractor that hands back the venue's own calendar index as
          // a ticketUrl masks a good per-event eventUrl, because the
          // consumer CTA prefers ticketUrl. Drop it so the CTA falls
          // through to the show's own page (#1152).
          const candidateTicketUrl = normalizeTicketUrl(event.ticketUrl)
          const normalizedTicketUrl = isListingPageUrl(candidateTicketUrl, [
            venue.websiteUrl,
            event.sourceUrl,
          ])
            ? null
            : candidateTicketUrl
          return {
            venueId,
            title: event.title,
            artist: event.artist,
            supportingArtists: event.supportingArtists ?? [],
            // Lock-step pair with supportingArtists (#763): computed via
            // canonicalizeSupporting in the enrichment map above. Any code
            // path that writes supporting_artists MUST also write
            // canonical_supporting.
            canonicalSupporting: event.canonicalSupporting,
            tourName: event.tourName ?? null,
            canonicalArtist: event.canonicalArtist,
            canonicalTitle: event.canonicalTitle,
            date: event.date,
            doorsTime:
              event.doorsTime && event.doorsTime !== ''
                ? event.doorsTime
                : null,
            showTime:
              event.showTime && event.showTime !== '' ? event.showTime : null,
            ticketUrl: normalizedTicketUrl,
            // Derived from (ticketUrl + venue context) at upsert time. Replaces
            // the single-link first-pass backfill from migration 0040 with full
            // host + vendor inference. See packages/crawler-core/src/lib/
            // ticket-links/derive.ts for the kind/vendor resolution rules.
            ticketLinks: deriveTicketLinks(normalizedTicketUrl, {
              websiteUrl: venue.websiteUrl,
              ticketVendor: venue.ticketVendor,
            }),
            // Per-event detail page on the source site — the "Get tickets"
            // fallback when there's no direct ticketUrl (#1152). Same empty→null
            // normalization as ticketUrl so '' never persists as a live URL.
            eventUrl: normalizeTicketUrl(event.eventUrl),
            description: event.description ?? null,
            imageUrl: event.imageUrl ?? null,
            sourceUrl: event.sourceUrl,
            sourceHash: event.sourceHash,
            status: 'upcoming' as const,
            confidenceScore: event.confidence.toFixed(2),
            verified: event.confidence >= AUTO_APPROVE_THRESHOLD,
            extractionStrategy: strategy,
            // LLM-classified non-concert events get pre-hidden from the
            // consumer surface (#696). Only takes effect on INSERT — admin
            // owns the field once the row exists, so onConflictDoUpdate below
            // does NOT include hiddenFromConsumer in its `set` clause. Mirrors
            // the one-way promotion pattern for `artist` and `verified`
            // already in this file.
            hiddenFromConsumer: event.isConcert === false,
            // LLM-classifier uncertainty signal. INSERT-only — the
            // onConflictDoUpdate `set` clause below intentionally excludes
            // this column so re-crawls don't churn the value. The one-shot
            // backfill script is the only post-INSERT writer.
            isConcertReviewNeeded: event.reviewNeeded === true,
          }
        })

        for (const evt of eventsToUpsert) {
          if (
            existingMap.has(
              dedupKey(evt.canonicalArtist, evt.date, evt.showTime),
            )
          ) {
            eventsUpdated++
          } else {
            eventsInserted++
          }
        }

        const upsertedRows = await db
          .insert(events)
          .values(eventValues)
          .onConflictDoUpdate({
            // Conflict target is the partial UNIQUE index added in 0057 —
            // (venue_id, date, canonical_artist, show_time) NULLS NOT
            // DISTINCT WHERE status='upcoming'. targetWhere mirrors the
            // partial index predicate so Postgres can identify the index
            // for ON CONFLICT resolution. Status overrides (cancelled,
            // postponed) sit outside this index and won't be touched by
            // future crawls. (#1053)
            target: [
              events.venueId,
              events.date,
              events.canonicalArtist,
              events.showTime,
            ],
            targetWhere: eq(events.status, 'upcoming'),
            set: {
              title: sql`excluded.title`,
              // canonical_title is now a display/search field only (#1053).
              // We still write it on conflict so the row tracks the latest
              // billing title from the crawler. Any future code path that
              // updates `title` MUST also update `canonical_title` to keep
              // the pair in lock-step.
              canonicalTitle: sql`excluded.canonical_title`,
              // canonical_artist + show_time are the load-bearing dedup
              // pair (#1053). Writing excluded.* here is a no-op on the
              // stored values (they matched to reach this conflict), but
              // keeping them explicit documents the invariant: any future
              // code path that writes artist/show_time MUST keep
              // canonical_artist in lock-step.
              canonicalArtist: sql`excluded.canonical_artist`,
              // artist intentionally NOT updated — once the winner row is
              // established, its artist string stays. Otherwise the field
              // could flip between extractions on compound-title shows.
              supportingArtists: sql`excluded.supporting_artists`,
              canonicalSupporting: sql`excluded.canonical_supporting`,
              tourName: sql`excluded.tour_name`,
              doorsTime: sql`excluded.doors_time`,
              showTime: sql`excluded.show_time`,
              ticketUrl: sql`excluded.ticket_url`,
              ticketLinks: sql`excluded.ticket_links`,
              eventUrl: sql`excluded.event_url`,
              description: sql`excluded.description`,
              imageUrl: sql`excluded.image_url`,
              status: sql`excluded.status`,
              extractionStrategy: sql`excluded.extraction_strategy`,
              confidenceScore: sql`excluded.confidence_score`,
              sourceHash: sql`excluded.source_hash`,
              updatedAt: new Date(),
              // One-way promotion: once verified, stays verified; promotes to
              // true when confidence crosses the threshold on re-crawl.
              verified: sql`CASE WHEN excluded.verified = TRUE THEN TRUE ELSE ${events.verified} END`,
            },
          })
          .returning({
            id: events.id,
            canonicalArtist: events.canonicalArtist,
            date: events.date,
            showTime: events.showTime,
          })

        // A returned row whose (canonical_artist, date, show_time) key was
        // absent from existingMap (loaded before the upsert) is a fresh
        // INSERT — the same classification the eventsInserted counter above
        // uses. If overlapping crawls of the same venue both classify an
        // event as new, the Spotify fan-out's spotify_alert_log claim
        // (onConflictDoNothing per user/event/kind) makes the duplicate
        // fan-out a no-op — no re-alert.
        for (const row of upsertedRows) {
          if (
            !existingMap.has(
              dedupKey(row.canonicalArtist, row.date, row.showTime),
            )
          ) {
            insertedEventIds.push(row.id)
          }
        }

        // Keep the `artists` projection fresh so a show announced today has
        // an artist page today rather than after the next backfill (#1115).
        // Runs AFTER the event upsert and outside its transaction, and
        // swallows its own failures: crawl data is the product's core value,
        // and an artist-projection hiccup must never cost an event row.
        // Headliners and supporting acts both get a row — an artist who only
        // ever opens still has a page.
        await projectArtists(
          eventValues.flatMap((evt) => [
            { name: evt.artist, canonicalName: evt.canonicalArtist },
            ...evt.canonicalSupporting.map((canonicalName) => ({
              // No raw spelling is recoverable per supporting artist:
              // canonical_supporting is deduped and sorted, so it is not
              // positionally aligned with supporting_artists. The canonical
              // string seeds the display name; the backfill's
              // most-frequent-spelling pass corrects it when the artist later
              // headlines.
              name: canonicalName,
              canonicalName,
            })),
          ]),
        )
      }
    }

    // Stale-event detection (#607) — two-pass update on a successful crawl.
    // Skipped on the error path because we don't want to mark events stale
    // when we never got a clean read of the venue's page.
    //
    // Pass 1: for every event the crawl actually saw, refresh last_seen_at
    // and clear first_missing_at. Matched by (venue_id, date, canonical_artist,
    // show_time) to mirror the upsert's ON CONFLICT target — without that, a
    // re-crawl that picked a different billing title for the same listing
    // would fail to match the existing DB row here and Pass 2 below would
    // stamp it missing on every title variation.
    //
    // Pass 2: for every venue event that should have shown up (upcoming,
    // date >= today) but didn't (last_seen_at < this run's start), stamp
    // first_missing_at — but only on the FIRST miss. The `isNull` predicate
    // is what guarantees that: subsequent missing sweeps won't overwrite the
    // original disappearance timestamp, so the admin sees the actual moment
    // the show disappeared rather than the most recent crawl.
    if (seenEventCoords.length > 0) {
      await db
        .update(events)
        .set({
          lastSeenAt: startedAtDate,
          firstMissingAt: null,
        })
        .where(
          and(
            eq(events.venueId, venueId),
            // status='upcoming' mirrors the ON CONFLICT target's predicate
            // and the partial UNIQUE index in 0057. Without it, a cancelled
            // row sharing (venue, date, canonical_artist, show_time) with a
            // freshly-upserted upcoming row would also get last_seen_at
            // refreshed and first_missing_at cleared — but cancelled rows
            // are by definition outside the crawler's seen-state upkeep.
            eq(events.status, 'upcoming'),
            or(
              ...seenEventCoords.map((coord) =>
                and(
                  eq(events.canonicalArtist, coord.canonicalArtist),
                  eq(events.date, coord.date),
                  coord.showTime == null
                    ? isNull(events.showTime)
                    : eq(events.showTime, coord.showTime),
                ),
              ),
            ),
          ),
        )
    }
    // Guard Pass 2 the same way as Pass 1: only stamp first_missing_at when
    // this run actually saw events. A zero-event extraction (bot-detected
    // DOM, JS-repopulated grid, LLM whiff) is "we learned nothing", NOT
    // "every show is gone" — without this guard a single empty crawl marks
    // the venue's entire upcoming catalog missing and the consumer
    // isNull(first_missing_at) filter hides it, which is exactly how the
    // spotlight venue went dark. The #624 went-dark alert still fires so a
    // human is notified; the data stays put until a real crawl confirms it.
    if (seenEventCoords.length > 0) {
      await db
        .update(events)
        .set({ firstMissingAt: startedAtDate })
        .where(
          and(
            eq(events.venueId, venueId),
            eq(events.status, 'upcoming'),
            gte(events.date, DENVER_TODAY),
            lt(events.lastSeenAt, startedAtDate),
            isNull(events.firstMissingAt),
          ),
        )
    }

    // Runtime drift-duplicate self-heal (#1122). Pass 2 above can freshly
    // stamp first_missing_at on a title-variant orphan whose live sibling was
    // just re-seen. Reassign its FK rows onto the sibling and delete it so it
    // never reaches the admin missing list. Guarded: a reconcile failure must
    // never fail the crawl (crawl resilience is existential) — log and continue.
    if (seenEventCoords.length > 0) {
      try {
        await reconcileDriftDuplicates(venueId)
      } catch (err) {
        reportFailure({
          event: 'crawl.reconcile_drift_duplicates_failed',
          severity: 'error',
          venueId,
          crawlRunId: id,
          error: String(err),
        })
      }
    }

    // Notify admin on low-confidence LLM extractions (structured data is always confidence=1.0)
    const lowConfidence =
      strategy === 'llm'
        ? normalizedEvents.filter(
            (ev) => ev.confidence < AUTO_APPROVE_THRESHOLD,
          )
        : []
    if (lowConfidence.length > 0) {
      await db.insert(notifications).values({
        type: 'admin_alert',
        category: 'crawl.low_confidence',
        title: `Low confidence events: ${venue.name}`,
        body: `${lowConfidence.length} event(s) extracted with confidence < ${AUTO_APPROVE_THRESHOLD} from ${venue.name}`,
        metadata: JSON.stringify({ venueId, crawlRunId: id }),
      })
    }

    const durationMs = Date.now() - startedAt
    const llmCostUsd = tokenUsage ? calculateCost(tokenUsage) : null

    // A crawl that fetched the page but came away with nothing is not a
    // success — it's "we learned nothing". Recording it as 'success' is how
    // Red Rocks and Cervantes sat at zero events for days while Admin ▸ Crawls
    // showed green and only the per-venue Crawl Details said "Went Dark"
    // (#1162). 'partial' already exists in the crawl_status enum and the admin
    // filter, so this needs no migration and shows up in the list immediately.
    //
    // Keyed on seenEventCoords rather than normalizedEvents because the
    // downstream guards (cross-venue presale filter, empty canonical
    // artist/title) can drop every extracted row — a run that extracted 10
    // events and kept none learned just as little as one that extracted zero.
    const foundNothing = seenEventCoords.length === 0

    // The venue's announced event horizon (#1185) — recorded per run so the
    // ceiling check can watch it move. Taken from the usable coords rather than
    // normalizedEvents so a row the downstream guards dropped can't inflate it.
    // ISO calendar dates compare correctly as strings.
    const furthestEventDate = seenEventCoords.reduce<string | null>(
      (furthest, coord) =>
        furthest === null || coord.date > furthest ? coord.date : furthest,
      null,
    )

    const [crawlRun] = await db
      .insert(crawlRuns)
      .values({
        id,
        venueId,
        status: foundNothing ? 'partial' : 'success',
        httpStatusCode: httpStatus,
        robotsTxtBlocked: 'no',
        extractionStrategyUsed: strategy,
        pageHash,
        eventsFound: normalizedEvents.length,
        eventsUsable: seenEventCoords.length,
        eventsInserted,
        eventsUpdated,
        llmCostUsd,
        durationMs,
        furthestEventDate,
      })
      .returning()
    if (!crawlRun) throw new Error('crawl_runs insert returned no row')

    if (tokenUsage && llmCostUsd !== null) {
      await db.insert(costTracking).values({
        service: 'claude',
        costUsd: llmCostUsd.toFixed(6),
        tokensUsed: String(tokenUsage.inputTokens + tokenUsage.outputTokens),
        metadata: JSON.stringify({ crawlRunId: id, venueId, ...tokenUsage }),
      })
    }

    await db
      .update(venues)
      .set({
        lastCrawledAt: new Date(),
        // Only a crawl that actually extracted events clears the 3-strikes
        // counter. Resetting it on a zero-event run meant the auto-pause and
        // admin notification could never fire for a venue that silently
        // extracted nothing every day. Not incremented either — the counter
        // tracks hard failures, and auto-pausing a venue whose calendar is
        // genuinely empty would stop us crawling it back to life. The
        // went-dark alert below owns notification for this case.
        ...(foundNothing ? {} : { consecutiveFailures: 0 }),
        blockedAt: null,
        robotsTxtAllowed: true,
        robotsTxtCheckedAt: new Date(),
        // Auto-detect crawlMode write is HTML-path-only. On the platform
        // path we didn't actually probe HTTP vs browser, so persisting
        // resolvedMode here would silently flip a null crawlMode to
        // 'browser' — losing the auto-detect behavior if the operator
        // later clears venue.platform to revert to the LLM cascade.
        ...(!platformFetcher && venue.crawlMode === null
          ? { crawlMode: resolvedMode }
          : {}),
        updatedAt: new Date(),
      })
      .where(eq(venues.id, venueId))

    console.log(
      JSON.stringify({
        event: 'crawl.complete',
        venueId,
        strategy,
        eventsFound: normalizedEvents.length,
        eventsUsable: seenEventCoords.length,
        eventsInserted,
        eventsUpdated,
        llmCostUsd,
        durationMs,
      }),
    )

    // #624 — Surface "crawl didn't fail, suspiciously few events" before it
    // hides in the dashboard. Bluebird was the canary: status 'success'
    // with eventsFound 0 looked healthy because no failure counter ticked
    // up, but the venue was effectively offline. This check runs after
    // the crawl_runs row + venue updates above, so the call into the
    // checker sees the row it's measuring against and a fresh
    // lastEventCountAlertAt would never include the in-flight run.
    await checkEventCountDrop({
      venueId,
      venueName: venue.name,
      crawlRunId: id,
      eventsFound: normalizedEvents.length,
      eventsUsable: seenEventCoords.length,
      lastEventCountAlertAt: venue.lastEventCountAlertAt,
    })

    // #1185 — the other half of "the crawl didn't fail". A hard item cap
    // returns a healthy, stable count, so the check above can never see it;
    // The Fillmore published only its first 36 events for months in total
    // silence. Runs after the crawl_runs insert for the same reason: the
    // checker reads this run's row as part of its history.
    await checkEventCeiling({
      venueId,
      venueName: venue.name,
      crawlRunId: id,
      eventsFound: normalizedEvents.length,
      eventsUsable: seenEventCoords.length,
      furthestEventDate,
      lastEventCeilingAlertAt: venue.lastEventCeilingAlertAt,
    })

    // The third "the crawl didn't fail" shape: healthy counts, real events,
    // but no per-event ticket links, so every consumer CTA silently falls back
    // to the venue homepage. Both checks above key off counts and are blind to
    // it. Reads the stored catalogue rather than this run's rows — see the
    // header note in url-coverage-alert.ts on why the sourceHash gate makes
    // in-run data the wrong denominator. Runs last so it sees the writes this
    // crawl just made.
    await checkUrlCoverage({
      venueId,
      venueName: venue.name,
      crawlRunId: id,
      eventsUsable: seenEventCoords.length,
      lastUrlCoverageAlertAt: venue.lastUrlCoverageAlertAt,
    })

    return { ...crawlRun, insertedEventIds }
  } catch (err) {
    // A selector timeout carries the HTML the page was showing when it gave up.
    // This is the only capture point for that failure — the successful-fetch
    // capture above is never reached when the selector never resolves.
    if (
      err instanceof CrawlSelectorTimeoutError &&
      venue.debugCaptureHtml &&
      err.html !== null
    ) {
      logDebugHtmlCapture(err.html, {
        venueId,
        venueSlug: venue.slug,
        crawlRunId: id,
        mode: 'browser',
        finalUrl: err.finalUrl,
        httpStatus: err.httpStatus,
      })
    }

    const isHttpBlocked =
      err instanceof CrawlFetchError &&
      (err.httpStatus === 403 || err.httpStatus === 429)
    // Playwright TimeoutError fires when bot-detection silently hangs the connection
    // (no HTTP error, just no response). When the current error is a TimeoutError
    // and consecutiveFailures is already ≥2 (i.e. this is the 3rd failure), treat
    // it the same as a 403/429 block so the venue is paused and admin is notified.
    // CrawlSelectorTimeoutError wraps a Playwright TimeoutError to carry the
    // captured HTML, which renames it — it must still count as a timeout here
    // or a browser-mode venue would never reach the 3-strikes auto-pause.
    const isTimeoutBlock =
      err instanceof Error &&
      (err.name === 'TimeoutError' ||
        err instanceof CrawlSelectorTimeoutError) &&
      venue.consecutiveFailures >= 2 // becomes 3 after the increment below
    const isBlocked = isHttpBlocked || isTimeoutBlock

    // CLAUDE.md crawl rule: "3 consecutive failures → pause venue + notify
    // admin". Use a SQL increment + CASE so the increment, the auto-pause
    // flip, and the threshold-derivation all serialize on the row UPDATE.
    // This is what gives the auto-pause + crawl-failure email exactly-once
    // semantics at the threshold under concurrent crawls of the same venue
    // (the daily cron and the triggers cron CAN overlap on the same venue —
    // there's no per-venue lock above this layer). The crawl.failed
    // notification still inserts on every failure where newFailureCount >=
    // 3 — that's intentional re-alerting; only the "venue auto-paused"
    // wording is gated to the === 3 transition.
    //
    // Block vs auto-pause are intentionally separate signals: HTTP blocks
    // (403/429) and TimeoutErrors set `blockedAt`, while non-block
    // failures (schema errors, parse errors, etc.) auto-pause via
    // `active = false`. Conflating them would prevent admins from
    // manually queuing a recovery trigger on a blocked venue (the admin
    // trigger endpoint rejects when !active), forcing an extra Admin UI
    // un-pause step before retry. The CASE on `active` is therefore gated
    // to the non-block branch, and an admin who manually re-activates a
    // still-broken venue isn't fought by the crawler on the next failure
    // (because newFailureCount === 4 doesn't satisfy the CASE). (#743,
    // round-3 review on PR #746)
    const [updatedVenue] = await db
      .update(venues)
      .set({
        consecutiveFailures: sql`${venues.consecutiveFailures} + 1`,
        ...(isBlocked
          ? { blockedAt: new Date() }
          : {
              active: sql`CASE WHEN ${venues.consecutiveFailures} + 1 = 3 THEN false ELSE ${venues.active} END`,
            }),
        updatedAt: new Date(),
      })
      .where(eq(venues.id, venueId))
      .returning()

    const newFailureCount = updatedVenue?.consecutiveFailures ?? 0
    // Auto-pause side-effects (active flip, email, "auto-paused" wording)
    // align on a single gate: non-block 3rd consecutive failure only.
    const shouldAutoPause = !isBlocked && newFailureCount === 3

    if (newFailureCount >= 3) {
      const notificationBody = shouldAutoPause
        ? `${newFailureCount} consecutive failures for ${venue.name} — venue auto-paused`
        : `${newFailureCount} consecutive failures for ${venue.name}`
      // Include crawlRunId in metadata so the admin UI can surface an
      // alert badge on the specific failing row (see #804). A
      // crawl.failed notification fires on every run once
      // consecutive_failures >= 3 (the first, the auto-pause trip at
      // exactly 3 on a non-blocked venue, and every subsequent failure)
      // — the badge attaches to whichever of those failures is most
      // recently unread per the API's first-match-wins join.
      // event_count_dropped notifications have stored crawlRunId since
      // their introduction; this brings crawl.failed to parity.
      await db.insert(notifications).values({
        type: 'admin_alert',
        category: 'crawl.failed',
        title: `Crawl failing: ${venue.name}`,
        body: notificationBody,
        metadata: JSON.stringify({ venueId, crawlRunId: id }),
      })

      if (shouldAutoPause) {
        // Await the email send. The crawler hard-exits via process.exit(0)
        // when main() resolves; a detached Promise here gets severed before
        // the HTTP request to Resend completes, which is why no crawl.failed
        // email has ever arrived since PR #51 (#649).
        try {
          await sendCrawlFailureEmail({
            venueName: venue.name,
            venueId,
            consecutiveFailures: newFailureCount,
          })
        } catch (emailErr) {
          reportFailure({
            event: 'crawl.email_error',
            severity: 'error',
            venueId,
            error: String(emailErr),
          })
        }
      }
    }

    const durationMs = Date.now() - startedAt

    const [crawlRun] = await db
      .insert(crawlRuns)
      .values({
        id,
        venueId,
        status: 'failed',
        robotsTxtBlocked: 'no',
        eventsFound: 0,
        eventsInserted: 0,
        errorMessage: String(err),
        durationMs,
      })
      .returning()
    if (!crawlRun) throw new Error('crawl_runs insert returned no row')

    reportFailure({
      event: 'crawl.failed',
      severity: 'error',
      venueId,
      error: String(err),
      durationMs,
    })

    return { ...crawlRun, insertedEventIds: [] }
  }
}
