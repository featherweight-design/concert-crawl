import type { Browser } from 'playwright'
import { and, desc, eq, sql } from 'drizzle-orm'
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
import {
  fetchPage,
  fetchPageHttp,
  CrawlFetchError,
  type FetchResult,
} from './lib/fetcher.js'
import { extractJsonLd } from './lib/extractors/json-ld.js'
import { extractWithLlm } from './lib/extractors/llm.js'
import { calculateCost } from './lib/cost.js'
import { hashPage, hashEvent } from './lib/hash.js'
import type { NormalizedEvent, TokenUsage } from './types.js'

const USER_AGENT = 'ConcertCrawl/1.0 (+https://concertcrawl.app/bot)'

async function runExtraction(
  html: string,
  finalUrl: string,
): Promise<{
  normalizedEvents: NormalizedEvent[]
  strategy: 'structured_data' | 'llm'
  tokenUsage: TokenUsage | undefined
}> {
  let normalizedEvents: NormalizedEvent[] = extractJsonLd(html, finalUrl)
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

export async function crawlVenue(
  venueId: string,
  browser: Browser,
  crawlRunId?: string,
): Promise<CrawlRun> {
  const id = crawlRunId ?? crypto.randomUUID()
  const startedAt = Date.now()

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
          status: 'success',
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
          ...(venue.crawlMode === null ? { crawlMode: resolvedMode } : {}),
          updatedAt: new Date(),
        })
        .where(eq(venues.id, venueId))
      return crawlRun
    }

    // Extract events. In auto-detect mode, only check JSON-LD on the HTTP HTML
    // before deciding to fall back — avoids paying an LLM call on HTTP markup
    // that a JS-rendered venue won't populate anyway.
    let extraction: Awaited<ReturnType<typeof runExtraction>>

    if (venue.crawlMode === null && resolvedMode === 'http') {
      const httpJsonLdEvents = extractJsonLd(html, finalUrl)
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
        extraction = await runExtraction(
          browserResult.html,
          browserResult.finalUrl,
        )
        resolvedMode = 'browser'
      }
    } else {
      extraction = await runExtraction(html, finalUrl)
    }

    const { normalizedEvents, strategy, tokenUsage } = extraction

    // Upsert events — insert on first crawl, update mutable fields on re-crawl
    let eventsInserted = 0
    let eventsUpdated = 0
    if (normalizedEvents.length > 0) {
      // Compute sourceHash for each extracted event, then deduplicate by
      // (artist, date) — LLM extraction can return the same show twice.
      // Deduping here (rather than later) keeps changedVerified and
      // eventsToUpsert both clean, avoiding duplicate admin alerts and
      // the Postgres "ON CONFLICT DO UPDATE cannot affect row a second time"
      // error that otherwise kills the entire batch insert.
      const seenEventKeys = new Set<string>()
      const eventsWithHashes = normalizedEvents
        .map((event) => ({
          ...event,
          sourceHash: hashEvent({
            title: event.title,
            artist: event.artist,
            date: event.date,
            doorsTime: event.doorsTime ?? null,
            showTime: event.showTime ?? null,
          }),
        }))
        .filter((evt) => {
          const key = `${evt.artist}|${evt.date}`
          if (seenEventKeys.has(key)) return false
          seenEventKeys.add(key)
          return true
        })

      // Load existing events for this venue to compare hashes
      const existingRows = await db
        .select({
          artist: events.artist,
          date: events.date,
          title: events.title,
          sourceHash: events.sourceHash,
          verified: events.verified,
        })
        .from(events)
        .where(eq(events.venueId, venueId))

      const existingMap = new Map(
        existingRows.map((e) => [`${e.artist}|${e.date}`, e]),
      )

      // Notify admin when a verified event's source data has changed
      const changedVerified = eventsWithHashes.filter((e) => {
        const existing = existingMap.get(`${e.artist}|${e.date}`)
        return (
          existing &&
          existing.verified === true &&
          existing.sourceHash !== null &&
          existing.sourceHash !== e.sourceHash
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

      // Only upsert events that are new or have changed content
      const eventsToUpsert = eventsWithHashes.filter((e) => {
        const existing = existingMap.get(`${e.artist}|${e.date}`)
        if (!existing) return true // new event
        return (
          existing.sourceHash === null || existing.sourceHash !== e.sourceHash
        ) // null hash backfill or content changed
      })

      if (eventsToUpsert.length > 0) {
        const eventValues = eventsToUpsert.map((event) => ({
          venueId,
          title: event.title,
          artist: event.artist,
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
          verified: strategy === 'structured_data',
          extractionStrategy: strategy,
        }))

        for (const evt of eventsToUpsert) {
          if (existingMap.has(`${evt.artist}|${evt.date}`)) {
            eventsUpdated++
          } else {
            eventsInserted++
          }
        }

        await db
          .insert(events)
          .values(eventValues)
          .onConflictDoUpdate({
            target: [events.venueId, events.date, events.artist],
            set: {
              title: sql`excluded.title`,
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
            },
          })
      }
    }

    // Notify admin on low-confidence LLM extractions (structured data is always confidence=1.0)
    const lowConfidence =
      strategy === 'llm'
        ? normalizedEvents.filter((e) => e.confidence < 0.7)
        : []
    if (lowConfidence.length > 0) {
      await db.insert(notifications).values({
        type: 'admin_alert',
        category: 'crawl.low_confidence',
        title: `Low confidence events: ${venue.name}`,
        body: `${lowConfidence.length} event(s) extracted with confidence < 0.7 from ${venue.name}`,
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
        void sendCrawlFailureEmail(venue.name, newFailureCount).catch(
          (emailErr) => {
            console.log(
              JSON.stringify({
                event: 'crawl.email_error',
                venueId,
                error: String(emailErr),
              }),
            )
          },
        )
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
