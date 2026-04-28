import { and, eq, sql } from 'drizzle-orm'
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
import { fetchPage } from './lib/fetcher.js'
import { extractJsonLd } from './lib/extractors/json-ld.js'
import { extractWithLlm } from './lib/extractors/llm.js'
import { calculateCost } from './lib/cost.js'
import type { NormalizedEvent, TokenUsage } from './types.js'

const USER_AGENT = 'ConcertCrawl/1.0 (+https://concertcrawl.app/bot)'

export async function crawlVenue(
  venueId: string,
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

  // Check robots.txt — fail closed (never crawl if disallowed)
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
    return crawlRun!
  }

  try {
    const { html, httpStatus, finalUrl } = await fetchPage(
      venue.websiteUrl,
      venue.crawlDelayMs,
    )

    // Structured data first — LLM fallback only when needed
    let normalizedEvents: NormalizedEvent[] = extractJsonLd(html, finalUrl)
    let strategy: 'structured_data' | 'llm' = 'structured_data'
    let tokenUsage: TokenUsage | undefined

    if (normalizedEvents.length === 0) {
      strategy = 'llm'
      const llmResult = await extractWithLlm(html, finalUrl)
      normalizedEvents = llmResult.events
      tokenUsage = llmResult.usage
    }

    // Upsert events — insert on first crawl, update mutable fields on re-crawl
    let eventsInserted = 0
    if (normalizedEvents.length > 0) {
      const eventValues = normalizedEvents.map((event) => ({
        venueId,
        title: event.title,
        artist: event.artist,
        date: event.date,
        doorsTime: event.doorsTime ?? null,
        showTime: event.showTime ?? null,
        ticketUrl: event.ticketUrl ?? null,
        description: event.description ?? null,
        imageUrl: event.imageUrl ?? null,
        sourceUrl: event.sourceUrl,
        status: 'upcoming' as const,
        confidenceScore: event.confidence.toFixed(2),
        verified: strategy === 'structured_data',
        extractionStrategy: strategy,
        rawHtml: html,
      }))

      const upserted = await db
        .insert(events)
        .values(eventValues)
        .onConflictDoUpdate({
          target: [events.venueId, events.date, events.artist],
          set: {
            title: sql`excluded.title`,
            ticketUrl: sql`excluded.ticket_url`,
            description: sql`excluded.description`,
            imageUrl: sql`excluded.image_url`,
            status: sql`excluded.status`,
            updatedAt: new Date(),
          },
        })
        .returning()

      eventsInserted = upserted.length
    }

    // Notify admin on low-confidence LLM extractions
    const lowConfidence = normalizedEvents.filter((e) => e.confidence < 0.7)
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

    const [crawlRun] = await db
      .insert(crawlRuns)
      .values({
        id,
        venueId,
        status: 'success',
        httpStatusCode: httpStatus,
        robotsTxtBlocked: 'no',
        extractionStrategyUsed: strategy,
        eventsFound: normalizedEvents.length,
        eventsInserted,
        durationMs,
      })
      .returning()

    if (tokenUsage) {
      const costUsd = calculateCost(tokenUsage)
      await db.insert(costTracking).values({
        service: 'claude',
        costUsd: costUsd.toFixed(6),
        tokensUsed: String(tokenUsage.inputTokens + tokenUsage.outputTokens),
        metadata: JSON.stringify({ crawlRunId: id, venueId, ...tokenUsage }),
      })
    }

    await db
      .update(venues)
      .set({
        lastCrawledAt: new Date(),
        consecutiveFailures: 0,
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
        durationMs,
      }),
    )

    return crawlRun!
  } catch (err) {
    const isBlocked =
      (err as NodeJS.ErrnoException).code === '403' ||
      (err as NodeJS.ErrnoException).code === '429'

    const [updatedVenue] = await db
      .update(venues)
      .set({
        consecutiveFailures: sql`${venues.consecutiveFailures} + 1`,
        ...(isBlocked ? { blockedAt: new Date() } : {}),
        updatedAt: new Date(),
      })
      .where(eq(venues.id, venueId))
      .returning()

    const newFailureCount = updatedVenue?.consecutiveFailures ?? 3

    if (newFailureCount >= 3) {
      await db.insert(notifications).values({
        type: 'admin_alert',
        category: 'crawl.failed',
        title: `Crawl failing: ${venue.name}`,
        body: `${newFailureCount} consecutive failures for ${venue.name}`,
        metadata: JSON.stringify({ venueId }),
      })
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

    console.log(
      JSON.stringify({
        event: 'crawl.failed',
        venueId,
        error: String(err),
        durationMs,
      }),
    )

    return crawlRun!
  }
}
