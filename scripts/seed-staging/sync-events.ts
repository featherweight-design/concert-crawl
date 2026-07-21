/**
 * Concert Crawl — sync events from prod to staging with a rolling window.
 *
 * Reads upcoming/cancelled/postponed events from prod whose `date` falls
 * within the rolling window (past 30 days → all future), translates each
 * row's venueId through the venueIdMap supplied by Task 2, then upserts
 * into staging using the partial UNIQUE index target for upcoming rows.
 * Cancelled/postponed rows: look up existing staging event by
 * (venue_id, date, canonical_title, status) — scoped to the SAME status
 * so relist patterns (a cancelled row plus a later upcoming row for the
 * same venue/date/title) aren't clobbered. If found, UPDATE the full
 * row so any prod-side field changes propagate. If not found, INSERT
 * with onConflictDoNothing.
 *
 * Returns a prod→staging event-id map (eventIdMap) built from a re-select
 * of the (venue_id, date, canonical_title) triple on upcoming rows only.
 * Cancelled/postponed rows are excluded from the map — Task 4 (price log)
 * always references live upcoming events.
 */

import { and, eq, gte, inArray, sql } from 'drizzle-orm'
import { events } from '../../packages/db/src/schema/index.js'
import { rollingWindow } from './sync-events-helpers.js'
import type { ProdReadonlyClient } from './prod-readonly-client.js'
import type { IdMap, DrizzleWriteDb } from './sync-venues.js'

export async function syncEvents(deps: {
  prod: ProdReadonlyClient
  staging: DrizzleWriteDb
  dryRun: boolean
  now: Date
  venueIdMap: IdMap
}): Promise<{ scanned: number; processed: number; eventIdMap: IdMap }> {
  const { prod, staging, dryRun, now, venueIdMap } = deps

  const { fromDate } = rollingWindow(now)

  // 1. Read events from prod within the rolling window.
  const prodRows = await prod.select((db) =>
    db.select().from(events).where(gte(events.date, fromDate)),
  )

  const scanned = prodRows.length
  // `processed` counts rows we attempted to upsert (or would attempt in
  // dry-run) — NOT rows that actually changed in staging. Drizzle's
  // ON CONFLICT UPDATE path fires even when incoming values match stored
  // ones, so calling this `upserted` misleads operators into reading it
  // as a change count.
  let processed = 0
  let skippedMissingVenue = 0

  // Cap per-row skip warnings to avoid flooding logs on fresh staging DBs
  // (empty venueIdMap → every row skipped). The aggregate summary at the
  // end still reports the total count.
  const MAX_SKIP_WARNINGS = 5
  let skipWarningsEmitted = 0
  const warnSkip = (msg: string): void => {
    if (skipWarningsEmitted < MAX_SKIP_WARNINGS) {
      console.warn(msg)
      skipWarningsEmitted++
      if (skipWarningsEmitted === MAX_SKIP_WARNINGS) {
        console.warn(
          `[sync-events] (further per-row skip warnings suppressed — see aggregate summary at end)`,
        )
      }
    }
  }

  for (const row of prodRows) {
    // FK translation: every row must have a staging venue id.
    // Warnings surface in both dry-run and commit — dry-run especially
    // benefits so the operator sees why `processed` is lower than `scanned`.
    if (row.venueId === null) {
      warnSkip(
        `[sync-events] skipping event ${row.id} ("${row.title}") — venueId is null`,
      )
      skippedMissingVenue++
      continue
    }

    const stagingVenueId = venueIdMap.get(row.venueId)
    if (stagingVenueId === undefined) {
      warnSkip(
        `[sync-events] skipping event ${row.id} ("${row.title}") — prod venueId ${row.venueId} not in venueIdMap (venue not synced)`,
      )
      skippedMissingVenue++
      continue
    }

    if (!dryRun) {
      const { id: _prodId, ...rowRest } = row
      const rowToInsert = { ...rowRest, venueId: stagingVenueId }

      if (row.status === 'upcoming') {
        // Partial UNIQUE index (#0057): (venue_id, date, canonical_artist,
        // show_time) NULLS NOT DISTINCT WHERE status='upcoming'. Mirrors the
        // crawler upsert in packages/crawler-core/src/crawl.ts. The old
        // (venue_id, date, canonical_title) index was dropped in the same
        // migration, so ON CONFLICT against the old target now fails with
        // "no unique or exclusion constraint matching" (blocked local seeding
        // until this was updated).
        await staging
          .insert(events)
          .values(rowToInsert)
          .onConflictDoUpdate({
            target: [
              events.venueId,
              events.date,
              events.canonicalArtist,
              events.showTime,
            ],
            targetWhere: eq(events.status, 'upcoming'),
            set: {
              title: sql`excluded.title`,
              // canonicalTitle is in the ON CONFLICT target, so this SET is a
              // no-op on match — the row was matched *because* incoming and
              // stored canonical_title were equal. It's here to document the
              // lock-step invariant with `title` (any code path updating
              // `title` must update `canonical_title` too). See
              // packages/crawler-core/src/crawl.ts for the same pattern in
              // the crawler upsert.
              canonicalTitle: sql`excluded.canonical_title`,
              artist: sql`excluded.artist`,
              canonicalArtist: sql`excluded.canonical_artist`,
              doorsTime: sql`excluded.doors_time`,
              showTime: sql`excluded.show_time`,
              ticketUrl: sql`excluded.ticket_url`,
              ticketLinks: sql`excluded.ticket_links`,
              ticketPriceMin: sql`excluded.ticket_price_min`,
              ticketPriceMax: sql`excluded.ticket_price_max`,
              priceSource: sql`excluded.price_source`,
              pipelineExhaustedAt: sql`excluded.pipeline_exhausted_at`,
              description: sql`excluded.description`,
              imageUrl: sql`excluded.image_url`,
              genre: sql`excluded.genre`,
              setlist: sql`excluded.setlist`,
              sourceUrl: sql`excluded.source_url`,
              status: sql`excluded.status`,
              extractionStrategy: sql`excluded.extraction_strategy`,
              confidenceScore: sql`excluded.confidence_score`,
              sourceHash: sql`excluded.source_hash`,
              hiddenFromConsumer: sql`excluded.hidden_from_consumer`,
              isConcertReviewNeeded: sql`excluded.is_concert_review_needed`,
              lastSeenAt: sql`excluded.last_seen_at`,
              firstMissingAt: sql`excluded.first_missing_at`,
              updatedAt: sql`excluded.updated_at`,
              verified: sql`excluded.verified`,
            },
          })
      } else {
        // Cancelled/postponed: no valid partial UNIQUE target. Look up by
        // (venue_id, date, canonical_title) scoped to the SAME status — the
        // schema intentionally allows multiple rows with the same natural key
        // across different statuses (e.g. a cancelled override alongside a
        // later relisted upcoming row), so scanning without a status filter
        // could clobber the wrong row.
        const existing = await staging
          .select({ id: events.id })
          .from(events)
          .where(
            and(
              eq(events.venueId, stagingVenueId),
              eq(events.date, row.date),
              eq(events.canonicalTitle, row.canonicalTitle),
              eq(events.status, row.status),
            ),
          )
          .limit(1)
        if (existing.length > 0) {
          // Full mirror: update every mutable column. Strip `createdAt`
          // (codebase convention: created_at is immutable — see the admin
          // events route and the crawler upsert; the upcoming-row upsert
          // path above also omits it from `set`).
          const { createdAt: _immutableCreatedAt, ...updateFields } =
            rowToInsert
          await staging
            .update(events)
            .set(updateFields)
            .where(eq(events.id, existing[0].id))
        } else {
          // Plain INSERT — no ON CONFLICT clause because no UNIQUE index applies
          // to cancelled/postponed rows (the partial UNIQUE covers upcoming only,
          // and the row's natural key was just checked by the SELECT above).
          // A stale `.onConflictDoNothing()` here would only signal protection
          // that doesn't exist.
          await staging.insert(events).values(rowToInsert)
        }
      }
    }

    processed++
  }

  if (skippedMissingVenue > 0) {
    console.warn(
      `[sync-events] skipped ${skippedMissingVenue} row(s) due to missing FK parent in venueIdMap`,
    )
  }

  // 2. Build eventIdMap via a re-select of upcoming rows only.
  //    Performed in BOTH commit and dry-run modes (read-only SELECT is safe either way).
  //    For dry-run, this gives a realistic preview of how many events already exist
  //    in staging (same pattern as venueIdMap in sync-venues.ts).
  //
  //    Key insight: only upcoming rows sit in the partial UNIQUE index, so only those
  //    rows have a stable (venue_id, date, canonical_title) → staging-id mapping.
  //    Task 4 (price log) always references upcoming events, so the map covers its needs.

  // Collect the (venue_id, date, canonical_title) tuples that were processed (or
  // would have been processed in dry-run) — limited to upcoming rows with a valid
  // staging venue id so the WHERE clause stays sane.
  const upcomingRows = prodRows.filter((row) => row.status === 'upcoming')

  // For each upcoming prod row we need the staging venue id to match against
  // what staging actually stored.
  const stagingVenueIds: string[] = []
  for (const row of upcomingRows) {
    if (row.venueId === null) continue
    const stagingVenueId = venueIdMap.get(row.venueId)
    if (stagingVenueId !== undefined) {
      stagingVenueIds.push(stagingVenueId)
    }
  }

  // Dedupe to avoid bloating the inArray param list when many events share a venue.
  const uniqueStagingVenueIds = [...new Set(stagingVenueIds)]

  // Re-select from staging to obtain the authoritative (id, venue_id, date, canonical_title).
  const stagingEventRows =
    uniqueStagingVenueIds.length > 0
      ? await staging
          .select({
            id: events.id,
            venueId: events.venueId,
            date: events.date,
            canonicalTitle: events.canonicalTitle,
          })
          .from(events)
          .where(
            and(
              eq(events.status, 'upcoming'),
              inArray(events.venueId, uniqueStagingVenueIds),
              gte(events.date, fromDate),
            ),
          )
      : []

  // Build a (staging-venue-id + date + canonical-title) → staging-event-id lookup.
  const stagingKey = (
    venueId: string | null,
    date: string,
    canonicalTitle: string,
  ) => `${venueId ?? ''}|${date}|${canonicalTitle}`

  const stagingKeyToId = new Map<string, string>()
  for (const stagingRow of stagingEventRows) {
    stagingKeyToId.set(
      stagingKey(
        stagingRow.venueId,
        stagingRow.date,
        stagingRow.canonicalTitle,
      ),
      stagingRow.id,
    )
  }

  // Map prod-event-id → staging-event-id for upcoming rows.
  const eventIdMap = new Map<string, string>()
  for (const prodRow of upcomingRows) {
    if (prodRow.venueId === null) continue
    const stagingVenueId = venueIdMap.get(prodRow.venueId)
    if (stagingVenueId === undefined) continue

    const key = stagingKey(stagingVenueId, prodRow.date, prodRow.canonicalTitle)
    const stagingId = stagingKeyToId.get(key)
    if (stagingId !== undefined) {
      eventIdMap.set(prodRow.id, stagingId)
    }
  }

  return { scanned, processed, eventIdMap }
}
