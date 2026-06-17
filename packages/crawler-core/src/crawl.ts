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
import {
  detectCrossVenuePresale,
  type CrossVenueCandidate,
} from './lib/cross-venue-filter.js'
import { canonicalizeArtist } from './lib/canonical-artist.js'
import { hashPage, hashEvent } from './lib/hash.js'
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
    // Determine fetch strategy and execute
    let fetchResult: FetchResult
    let resolvedMode: 'http' | 'browser'

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

    const { html, httpStatus, finalUrl } = fetchResult

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

    const pageHash = hashPage(html)

    const [lastRun] = await db
      .select({ pageHash: crawlRuns.pageHash })
      .from(crawlRuns)
      .where(
        and(eq(crawlRuns.venueId, venueId), eq(crawlRuns.status, 'success')),
      )
      .orderBy(desc(crawlRuns.createdAt))
      .limit(1)

    if (
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
    let extraction: Awaited<ReturnType<typeof runExtraction>>

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

    const { strategy, tokenUsage } = extraction

    // Cross-venue presale filter — drop "Artist AT OTHER VENUE" rows so the
    // host venue's crawl owns the canonical row (see issue #605). Emits a
    // structured log per skip for auditability.
    const normalizedEvents = extraction.normalizedEvents.filter((evt) => {
      const match = detectCrossVenuePresale({
        title: evt.title,
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
        }),
      )
      return false
    })

    // Upsert events — insert on first crawl, update mutable fields on re-crawl
    let eventsInserted = 0
    let eventsUpdated = 0
    // Track (canonical_artist, date) pairs we've actually upserted this run so
    // the stale-event detection below can refresh last_seen_at for them.
    // Includes both the freshly-inserted and the already-existed-with-unchanged-hash
    // cases — "seen" means "the venue's page still advertised this show",
    // independent of whether we touched the DB row. Keyed by canonical_artist
    // (not raw artist) so an extraction of "Wynonna Judd" matches a DB row
    // stored as "Wynonna Judd & Melissa Etheridge" — without that, Pass 2
    // below would stamp the row missing on every crawl that produced a
    // different artist-string variant.
    const seenEventCoords: { canonicalArtist: string; date: string }[] = []
    if (normalizedEvents.length > 0) {
      // Compute sourceHash for each extracted event, then deduplicate by
      // (canonical_artist, date) — LLM extraction can return the same show
      // twice under slightly different artist strings ("Ziggy Marley" and
      // "Ziggy Marley & Stephen Marley"). Deduping by raw artist here would
      // let both variants through, then the ON CONFLICT against the partial
      // UNIQUE index on canonical_artist would fail with "cannot affect row
      // a second time."
      const seenEventKeys = new Set<string>()
      const eventsWithHashes = normalizedEvents
        .map((event) => ({
          ...event,
          canonicalArtist: canonicalizeArtist(event.artist),
          sourceHash: hashEvent({
            title: event.title,
            artist: event.artist,
            date: event.date,
            doorsTime: event.doorsTime ?? null,
            showTime: event.showTime ?? null,
          }),
        }))
        .filter((evt) => {
          const key = `${evt.canonicalArtist}|${evt.date}`
          if (seenEventKeys.has(key)) return false
          seenEventKeys.add(key)
          return true
        })

      // Load existing UPCOMING events for this venue to compare hashes.
      // Keyed by canonical_artist so a re-extraction of "Wynonna Judd"
      // hits the row stored as "Wynonna Judd & Melissa Etheridge" — same
      // canonical, same show.
      //
      // status='upcoming' filter mirrors the ON CONFLICT target's predicate
      // (the partial UNIQUE index in 0034). Without it, an admin-cancelled
      // row would still appear in existingMap — and a fresh extraction of
      // the same show would be incorrectly classified as an update (when
      // it should INSERT a new upcoming row alongside the cancelled one),
      // and changedVerified would fire spurious alerts for source-data
      // changes on rows the admin has already cancelled.
      const existingRows = await db
        .select({
          canonicalArtist: events.canonicalArtist,
          date: events.date,
          title: events.title,
          sourceHash: events.sourceHash,
          verified: events.verified,
        })
        .from(events)
        .where(and(eq(events.venueId, venueId), eq(events.status, 'upcoming')))

      const existingMap = new Map(
        existingRows.map(
          (row) => [`${row.canonicalArtist}|${row.date}`, row] as const,
        ),
      )

      // Notify admin when a verified event's source data has changed
      const changedVerified = eventsWithHashes.filter((evt) => {
        const existing = existingMap.get(`${evt.canonicalArtist}|${evt.date}`)
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
          canonicalArtist: evt.canonicalArtist,
          date: evt.date,
        })
      }

      // Only upsert events that are new or have changed content
      const eventsToUpsert = eventsWithHashes.filter((evt) => {
        const existing = existingMap.get(`${evt.canonicalArtist}|${evt.date}`)
        if (!existing) return true // new event
        return (
          existing.sourceHash === null || existing.sourceHash !== evt.sourceHash
        ) // null hash backfill or content changed
      })

      if (eventsToUpsert.length > 0) {
        const eventValues = eventsToUpsert.map((event) => ({
          venueId,
          title: event.title,
          artist: event.artist,
          canonicalArtist: event.canonicalArtist,
          date: event.date,
          doorsTime:
            event.doorsTime && event.doorsTime !== '' ? event.doorsTime : null,
          showTime:
            event.showTime && event.showTime !== '' ? event.showTime : null,
          ticketUrl: event.ticketUrl ?? null,
          description: event.description ?? null,
          imageUrl: event.imageUrl ?? null,
          sourceUrl: event.sourceUrl,
          sourceHash: event.sourceHash,
          status: 'upcoming' as const,
          confidenceScore: event.confidence.toFixed(2),
          verified: event.confidence >= AUTO_APPROVE_THRESHOLD,
          extractionStrategy: strategy,
        }))

        for (const evt of eventsToUpsert) {
          if (existingMap.has(`${evt.canonicalArtist}|${evt.date}`)) {
            eventsUpdated++
          } else {
            eventsInserted++
          }
        }

        await db
          .insert(events)
          .values(eventValues)
          .onConflictDoUpdate({
            // Conflict target is the partial UNIQUE index added in 0034 —
            // (venue_id, date, canonical_artist) WHERE status='upcoming'.
            // targetWhere mirrors the partial index predicate so Postgres
            // can identify the index for ON CONFLICT resolution. Status
            // overrides (cancelled, postponed) sit outside this index and
            // won't be touched by future crawls.
            target: [events.venueId, events.date, events.canonicalArtist],
            targetWhere: eq(events.status, 'upcoming'),
            set: {
              title: sql`excluded.title`,
              // artist intentionally NOT updated — once the winner row is
              // established (either via the consolidation backfill or the
              // first crawl after this PR ships), its artist string stays.
              // Otherwise the field flips between extractions ("Wynonna
              // Judd" one day, "Wynonna Judd & Melissa Etheridge" the next).
              doorsTime: sql`excluded.doors_time`,
              showTime: sql`excluded.show_time`,
              ticketUrl: sql`excluded.ticket_url`,
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
    // and clear first_missing_at. Matched by (venue_id, date, canonical_artist)
    // to mirror the upsert's ON CONFLICT target — without that, a "Wynonna
    // Judd" extraction wouldn't match a "Wynonna Judd & Melissa Etheridge"
    // DB row and Pass 2 below would stamp it missing.
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
            // and the partial UNIQUE index in 0034. Without it, a cancelled
            // row sharing (venue, date, canonical_artist) with a freshly-
            // upserted upcoming row would also get last_seen_at refreshed
            // and first_missing_at cleared — but cancelled rows are by
            // definition outside the crawler's seen-state upkeep.
            eq(events.status, 'upcoming'),
            or(
              ...seenEventCoords.map((coord) =>
                and(
                  eq(events.date, coord.date),
                  eq(events.canonicalArtist, coord.canonicalArtist),
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
        ...(venue.crawlMode === null ? { crawlMode: resolvedMode } : {}),
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

    const [updatedVenue] = await db
      .update(venues)
      .set({
        consecutiveFailures: sql`${venues.consecutiveFailures} + 1`,
        ...(isBlocked ? { blockedAt: new Date() } : {}),
        updatedAt: new Date(),
      })
      .where(eq(venues.id, venueId))
      .returning()

    const newFailureCount = updatedVenue?.consecutiveFailures ?? 0

    if (newFailureCount >= 3) {
      await db.insert(notifications).values({
        type: 'admin_alert',
        category: 'crawl.failed',
        title: `Crawl failing: ${venue.name}`,
        body: `${newFailureCount} consecutive failures for ${venue.name}`,
        metadata: JSON.stringify({ venueId }),
      })

      if (newFailureCount === 3) {
        // Await the email send. The crawler hard-exits via process.exit(0)
        // when main() resolves; a detached Promise here gets severed before
        // the HTTP request to Resend completes, which is why no crawl.failed
        // email has ever arrived since PR #51 (#649).
        try {
          await sendCrawlFailureEmail(venue.name, newFailureCount)
        } catch (emailErr) {
          console.log(
            JSON.stringify({
              event: 'crawl.email_error',
              venueId,
              error: String(emailErr),
            }),
          )
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

    console.log(
      JSON.stringify({
        event: 'crawl.failed',
        venueId,
        error: String(err),
        durationMs,
      }),
    )

    return crawlRun
  }
}
