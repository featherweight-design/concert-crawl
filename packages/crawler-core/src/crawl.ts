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
import {
  fetchPage,
  fetchPageHttp,
  CrawlFetchError,
  type FetchResult,
} from './lib/fetcher.js'
import { extractJsonLd } from './lib/extractors/json-ld.js'
import { extractWithLlm } from './lib/extractors/llm.js'
import { calculateCost } from './lib/cost.js'
import { dispatch } from './lib/fetchers/index.js'
import type { PlatformSource } from './lib/fetchers/index.js'
import {
  detectCrossVenuePresale,
  type CrossVenueCandidate,
} from './lib/cross-venue-filter.js'
import { canonicalizeArtist } from './lib/canonical-artist.js'
import { canonicalizeTitle } from './lib/canonical-title.js'
import { hashPage, hashEvent } from './lib/hash.js'
import { deriveTicketLinks } from './lib/ticket-links/index.js'
import type { NormalizedEvent, TokenUsage } from './types.js'

const USER_AGENT = 'ConcertCrawl/1.0 (+https://concertcrawl.app/bot)'

const AUTO_APPROVE_THRESHOLD = 0.7

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

// Normalize an extractor-provided ticket URL. Empty strings become null so
// events.ticket_url and events.ticket_links agree on "no URL available" —
// deriveTicketLinks already treats '' as missing, but the column would
// otherwise persist as a non-null empty string.
function normalizeTicketUrl(url: string | null | undefined): string | null {
  return url && url !== '' ? url : null
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

export async function crawlVenue(
  venueId: string,
  browser: Browser,
  crawlRunId?: string,
  crossVenueCandidates: CrossVenueCandidate[] = [],
  // When true, both hash-skip short-circuits are bypassed: the venue-level
  // page-hash skip never fires, and every extracted event is re-upserted even
  // if its source hash is unchanged. Used to reprocess legacy rows whose
  // listings are byte-identical to the last crawl (e.g. backfilling
  // supportingArtists). Default false preserves the cost-saving skip path for
  // normal + scheduled crawls.
  force = false,
): Promise<CrawlRun> {
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
    return crawlRun
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
          browser,
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
            browser,
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
        return crawlRun
      }

      // Extract events. In auto-detect mode, only check JSON-LD on the HTTP HTML
      // before deciding to fall back — avoids paying an LLM call on HTTP markup
      // that a JS-rendered venue won't populate anyway.
      if (venue.crawlMode === null && resolvedMode === 'http') {
        const httpJsonLdEvents = extractJsonLd(html, finalUrl, venue.timezone)
        if (httpJsonLdEvents.length > 0) {
          extraction = {
            normalizedEvents: httpJsonLdEvents,
            strategy: 'structured_data' as const,
            tokenUsage: undefined,
          }
        } else {
          // No structured data on HTTP HTML — fall back to browser before invoking LLM.
          // The crawlDelayMs fires inside both fetchPageHttp (above) and fetchPage (here),
          // which is intentional: each request to the venue's origin deserves its own delay.
          const browserResult = await fetchPage(
            venue.websiteUrl,
            browser,
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
    const normalizedEvents = extraction.normalizedEvents.filter((evt) => {
      const match = detectCrossVenuePresale({
        title: evt.rawTitle,
        sourceVenueId: venueId,
        candidates: crossVenueCandidates,
      })
      if (!match) return true
      console.log(
        JSON.stringify({
          event: 'crawler.skip_cross_venue',
          sourceUrl: evt.sourceUrl,
          sourceVenueSlug: venue.slug,
          matchedVenueSlug: match.matchedVenueSlug,
          title: evt.title,
          rawTitle: evt.rawTitle,
        }),
      )
      return false
    })

    // Upsert events — insert on first crawl, update mutable fields on re-crawl
    let eventsInserted = 0
    let eventsUpdated = 0
    // Track (canonical_title, date) pairs we've actually upserted this run so
    // the stale-event detection below can refresh last_seen_at for them.
    // Includes both the freshly-inserted and the already-existed-with-unchanged-hash
    // cases — "seen" means "the venue's page still advertised this show",
    // independent of whether we touched the DB row. Keyed by canonical_title
    // (not raw title) so minor case/whitespace variation in the LLM's title
    // transcription doesn't cause Pass 2 below to stamp the row missing.
    const seenEventCoords: { canonicalTitle: string; date: string }[] = []
    if (normalizedEvents.length > 0) {
      // Compute sourceHash for each extracted event, then deduplicate by
      // (canonical_title, date). LLM extraction can return the same listing
      // twice with slightly different artist-substring choices on compound
      // titles ("BPM BINGO!" vs "Dombresky" vs "Dombresky / Walker & Royce"
      // for one Larimer 7/31 row — see #821). Both rows would survive a
      // canonical_artist-keyed dedup and then the ON CONFLICT against the
      // partial UNIQUE on canonical_title would fail with "cannot affect
      // row a second time."
      const seenEventKeys = new Set<string>()
      const eventsWithHashes = normalizedEvents
        .map((event) => ({
          ...event,
          canonicalArtist: canonicalizeArtist(event.artist),
          canonicalTitle: canonicalizeTitle(event.title),
          sourceHash: hashEvent({
            title: event.title,
            date: event.date,
            doorsTime: event.doorsTime ?? null,
            showTime: event.showTime ?? null,
          }),
        }))
        // Defensive: drop any event whose title canonicalizes to '' before
        // the dedup-by-(canonicalTitle, date) filter below. Distinct events
        // on the same date whose extractor emitted empty/whitespace-only
        // titles would otherwise collapse to a single ('|YYYY-MM-DD') key
        // and the subsequent upsert would risk a UNIQUE violation against
        // events_venue_date_canonical_title_idx. canonicalizeTitle returns
        // '' for empty / non-string / whitespace-only input, so this guard
        // covers all the malformed-extractor cases at once. (#821 R3)
        .filter((evt) => evt.canonicalTitle !== '')
        .filter((evt) => {
          const key = `${evt.canonicalTitle}|${evt.date}`
          if (seenEventKeys.has(key)) return false
          seenEventKeys.add(key)
          return true
        })

      // Load existing UPCOMING events for this venue to compare hashes.
      // Keyed by canonical_title so a re-extraction with a different
      // LLM-chosen artist substring hits the row stored under the same
      // listing's first extraction.
      //
      // status='upcoming' filter mirrors the ON CONFLICT target's predicate
      // (the partial UNIQUE index in 0044). Without it, an admin-cancelled
      // row would still appear in existingMap — and a fresh extraction of
      // the same show would be incorrectly classified as an update (when
      // it should INSERT a new upcoming row alongside the cancelled one),
      // and changedVerified would fire spurious alerts for source-data
      // changes on rows the admin has already cancelled.
      const existingRows = await db
        .select({
          canonicalTitle: events.canonicalTitle,
          date: events.date,
          title: events.title,
          sourceHash: events.sourceHash,
          verified: events.verified,
        })
        .from(events)
        .where(and(eq(events.venueId, venueId), eq(events.status, 'upcoming')))

      const existingMap = new Map(
        existingRows.map(
          (row) => [`${row.canonicalTitle}|${row.date}`, row] as const,
        ),
      )

      // Notify admin when a verified event's source data has changed
      const changedVerified = eventsWithHashes.filter((evt) => {
        const existing = existingMap.get(`${evt.canonicalTitle}|${evt.date}`)
        return (
          existing &&
          existing.verified === true &&
          existing.sourceHash !== null &&
          existing.sourceHash !== evt.sourceHash
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
      // the upsert path is skipped because every hash matched.
      for (const evt of eventsWithHashes) {
        seenEventCoords.push({
          canonicalTitle: evt.canonicalTitle,
          date: evt.date,
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
              `${evt.canonicalTitle}|${evt.date}`,
            )
            if (!existing) return true // new event
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
          const normalizedTicketUrl = normalizeTicketUrl(event.ticketUrl)
          return {
            venueId,
            title: event.title,
            artist: event.artist,
            supportingArtists: event.supportingArtists ?? [],
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
          if (existingMap.has(`${evt.canonicalTitle}|${evt.date}`)) {
            eventsUpdated++
          } else {
            eventsInserted++
          }
        }

        await db
          .insert(events)
          .values(eventValues)
          .onConflictDoUpdate({
            // Conflict target is the partial UNIQUE index added in 0044 —
            // (venue_id, date, canonical_title) WHERE status='upcoming'.
            // targetWhere mirrors the partial index predicate so Postgres
            // can identify the index for ON CONFLICT resolution. Status
            // overrides (cancelled, postponed) sit outside this index and
            // won't be touched by future crawls.
            target: [events.venueId, events.date, events.canonicalTitle],
            targetWhere: eq(events.status, 'upcoming'),
            set: {
              title: sql`excluded.title`,
              // canonical_title is the dedup key — the ON CONFLICT matched
              // because incoming canonical_title equaled the existing row's
              // canonical_title, so writing `excluded.canonical_title` here
              // is a no-op on the stored value. The set entry exists to
              // document the lock-step invariant: any future code path that
              // updates `title` MUST also update `canonical_title`. The pair
              // is load-bearing for dedup; drift would silently break the
              // ON CONFLICT match on subsequent crawls.
              canonicalTitle: sql`excluded.canonical_title`,
              // canonical_artist is no longer a dedup key but DOES still
              // get written (column kept for search/display per #821). We
              // also update it here so it tracks artist-substring drift
              // over crawl runs — the row's canonical_artist will represent
              // whichever artist substring the most recent crawl picked.
              canonicalArtist: sql`excluded.canonical_artist`,
              // artist intentionally NOT updated — once the winner row is
              // established (either via the #821 consolidation backfill or
              // the first crawl after this PR ships), its artist string
              // stays. Otherwise the field flips between extractions
              // ("BPM BINGO!" one day, "Dombresky" the next).
              supportingArtists: sql`excluded.supporting_artists`,
              tourName: sql`excluded.tour_name`,
              doorsTime: sql`excluded.doors_time`,
              showTime: sql`excluded.show_time`,
              ticketUrl: sql`excluded.ticket_url`,
              ticketLinks: sql`excluded.ticket_links`,
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
      }
    }

    // Stale-event detection (#607) — two-pass update on a successful crawl.
    // Skipped on the error path because we don't want to mark events stale
    // when we never got a clean read of the venue's page.
    //
    // Pass 1: for every event the crawl actually saw, refresh last_seen_at
    // and clear first_missing_at. Matched by (venue_id, date, canonical_title)
    // to mirror the upsert's ON CONFLICT target — without that, a re-crawl
    // that picked a different LLM artist substring for the same listing
    // would fail to match the existing DB row here and Pass 2 below would
    // stamp it missing on every artist-substring variation.
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
            // and the partial UNIQUE index in 0044. Without it, a cancelled
            // row sharing (venue, date, canonical_title) with a freshly-
            // upserted upcoming row would also get last_seen_at refreshed
            // and first_missing_at cleared — but cancelled rows are by
            // definition outside the crawler's seen-state upkeep.
            eq(events.status, 'upcoming'),
            or(
              ...seenEventCoords.map((coord) =>
                and(
                  eq(events.date, coord.date),
                  eq(events.canonicalTitle, coord.canonicalTitle),
                ),
              ),
            ),
          ),
        )
    }
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

    const [crawlRun] = await db
      .insert(crawlRuns)
      .values({
        id,
        venueId,
        status: 'success',
        httpStatusCode: httpStatus,
        robotsTxtBlocked: 'no',
        extractionStrategyUsed: strategy,
        pageHash,
        eventsFound: normalizedEvents.length,
        eventsInserted,
        eventsUpdated,
        llmCostUsd,
        durationMs,
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
        consecutiveFailures: 0,
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
        eventsInserted,
        eventsUpdated,
        llmCostUsd,
        durationMs,
      }),
    )

    // #624 — Surface "successful crawl, suspiciously few events" before it
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
      lastEventCountAlertAt: venue.lastEventCountAlertAt,
    })

    return crawlRun
  } catch (err) {
    const isHttpBlocked =
      err instanceof CrawlFetchError &&
      (err.httpStatus === 403 || err.httpStatus === 429)
    // Playwright TimeoutError fires when bot-detection silently hangs the connection
    // (no HTTP error, just no response). When the current error is a TimeoutError
    // and consecutiveFailures is already ≥2 (i.e. this is the 3rd failure), treat
    // it the same as a 403/429 block so the venue is paused and admin is notified.
    const isTimeoutBlock =
      err instanceof Error &&
      err.name === 'TimeoutError' &&
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

    return crawlRun
  }
}
