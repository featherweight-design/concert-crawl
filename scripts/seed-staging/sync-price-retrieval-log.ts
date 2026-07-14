/**
 * Concert Crawl — sync price_retrieval_log rows from prod to staging.
 *
 * Reads all price_retrieval_log rows from prod (crawler-driven fetches only;
 * user-owned price_submissions are excluded per spec §1a), translates each
 * row's eventId and venueId through the maps supplied by Tasks 2 + 3, then
 * inserts into staging using query-and-skip idempotency on the composite
 * (event_id, source, attempted_at). Scoping by event (not venue) prevents
 * cross-event false-positive dedupes — two sibling events at the same
 * venue can share a source+attemptedAt from a batched crawl pass.
 *
 * Idempotency detail: one prefetch SELECT retrieves all existing staging keys
 * for the rolling window, then membership is checked via a Set — O(1) per row
 * instead of N per-row SELECTs. The composite is not UNIQUE, but for
 * prod→staging sync the collision rate is effectively zero and a duplicate
 * insert is harmless (the log is append-only, cost-negligible).
 *
 * The inserted row does NOT include the prod `id` field — Drizzle's
 * defaultRandom() assigns a fresh staging uuid.
 */

import { and, gte, inArray, ne } from 'drizzle-orm'
import { priceRetrievalLog } from '../../packages/db/src/schema/index.js'
import type { ProdReadonlyClient } from './prod-readonly-client.js'
import type { IdMap, DrizzleWriteDb } from './sync-venues.js'
import { rollingWindow } from './sync-events-helpers.js'

export async function syncPriceRetrievalLog(deps: {
  prod: ProdReadonlyClient
  staging: DrizzleWriteDb
  dryRun: boolean
  venueIdMap: IdMap
  eventIdMap: IdMap
  now: Date
}): Promise<{
  scanned: number
  // Named `inserted` (not `upserted`) — this table has no UNIQUE index on the
  // composite (event_id, source, attempted_at), so we use query-and-skip
  // idempotency: existing rows are counted as `skippedDuplicates` rather
  // than updated. Distinct from venues/events where matching rows go through
  // an UPDATE path.
  inserted: number
  skippedMissingFk: number
  skippedDuplicates: number
}> {
  const { prod, staging, dryRun, venueIdMap, eventIdMap, now } = deps

  // 1. Read price_retrieval_log rows from prod within the rolling 30-day window.
  //    Mirrors the window used by syncEvents to avoid pulling the full table on
  //    large prod volumes.
  const { fromDate } = rollingWindow(now)
  const fromDateTs = new Date(`${fromDate}T00:00:00Z`)

  // Exclude source='community' — spec §1a scopes public-data sync to
  // venue/vendor-sourced rows only; community-tier attempts originate from
  // user/community submissions and belong to the user-owned data set that
  // Task 4 explicitly excludes.
  const prodRows = await prod.select((db) =>
    db
      .select()
      .from(priceRetrievalLog)
      .where(
        and(
          gte(priceRetrievalLog.attemptedAt, fromDateTs),
          ne(priceRetrievalLog.source, 'community'),
        ),
      ),
  )

  const scanned = prodRows.length
  let inserted = 0
  let skippedMissingFk = 0
  let skippedDuplicates = 0

  // Cap per-row skip warnings to avoid flooding logs on fresh staging DBs
  // (empty venue/event maps → every row skipped). Aggregate count still
  // reported at end.
  const MAX_SKIP_WARNINGS = 5
  let skipWarningsEmitted = 0
  const warnSkip = (msg: string): void => {
    if (skipWarningsEmitted < MAX_SKIP_WARNINGS) {
      console.warn(msg)
      skipWarningsEmitted++
      if (skipWarningsEmitted === MAX_SKIP_WARNINGS) {
        console.warn(
          `[sync-price-retrieval-log] (further per-row skip warnings suppressed — see aggregate summary at end)`,
        )
      }
    }
  }

  // Translate FKs up-front so we can collect staging venue ids for the prefetch.
  type TranslatedRow = {
    row: (typeof prodRows)[number]
    stagingVenueId: string
    stagingEventId: string
  }
  const translated: TranslatedRow[] = []

  for (const row of prodRows) {
    const stagingVenueId = venueIdMap.get(row.venueId)
    if (stagingVenueId === undefined) {
      warnSkip(
        `[sync-price-retrieval-log] skipping log ${row.id} — prod venueId ${row.venueId} not in venueIdMap`,
      )
      skippedMissingFk++
      continue
    }

    const stagingEventId = eventIdMap.get(row.eventId)
    if (stagingEventId === undefined) {
      warnSkip(
        `[sync-price-retrieval-log] skipping log ${row.id} — prod eventId ${row.eventId} not in eventIdMap`,
      )
      skippedMissingFk++
      continue
    }

    translated.push({ row, stagingVenueId, stagingEventId })
  }

  // Prefetch existing staging keys in one query (read-only — runs in both
  // dry-run and commit modes so dry-run's "would insert" count reflects
  // only genuinely new rows, not already-synced ones).
  // Scope by eventId (not venueId) — two events at the same venue can share
  // (source, attemptedAt) in a single batch crawl pass, so a venue-scoped
  // dedupe would false-positive across sibling events.
  const uniqueStagingEventIds = [
    ...new Set(translated.map((tr) => tr.stagingEventId)),
  ]
  const existingKeys = new Set<string>()

  if (uniqueStagingEventIds.length > 0) {
    const existingRows = await staging
      .select({
        eventId: priceRetrievalLog.eventId,
        source: priceRetrievalLog.source,
        attemptedAt: priceRetrievalLog.attemptedAt,
      })
      .from(priceRetrievalLog)
      .where(
        and(
          gte(priceRetrievalLog.attemptedAt, fromDateTs),
          inArray(priceRetrievalLog.eventId, uniqueStagingEventIds),
        ),
      )

    for (const existingRow of existingRows) {
      existingKeys.add(
        `${existingRow.eventId}|${existingRow.source}|${existingRow.attemptedAt.toISOString()}`,
      )
    }
  }

  if (dryRun) {
    // Count only rows that would actually insert (not already present).
    // Add to existingKeys as we go so in-batch duplicates dedupe correctly
    // (matches commit-mode semantics — first occurrence counts as insert,
    // subsequent identical composites count as skippedDuplicates).
    for (const { row, stagingEventId } of translated) {
      const compositeKey = `${stagingEventId}|${row.source}|${row.attemptedAt.toISOString()}`
      if (existingKeys.has(compositeKey)) {
        skippedDuplicates++
      } else {
        inserted++
        existingKeys.add(compositeKey)
      }
    }
  } else {
    for (const { row, stagingVenueId, stagingEventId } of translated) {
      const compositeKey = `${stagingEventId}|${row.source}|${row.attemptedAt.toISOString()}`

      if (existingKeys.has(compositeKey)) {
        skippedDuplicates++
        continue
      }

      // Insert without the prod id — Drizzle assigns a fresh staging uuid.
      const { id: _omittedId, ...rowWithoutId } = row
      await staging.insert(priceRetrievalLog).values({
        ...rowWithoutId,
        venueId: stagingVenueId,
        eventId: stagingEventId,
      })

      // Add the just-inserted composite to the seen-set so a second prod row
      // with the same (event_id, source, attempted_at) in this same batch
      // dedupes correctly instead of double-inserting.
      existingKeys.add(compositeKey)

      inserted++
    }
  }

  if (skippedMissingFk > 0) {
    console.warn(
      `[sync-price-retrieval-log] skipped ${skippedMissingFk} row(s) due to missing FK parent (venueId or eventId not in map)`,
    )
  }

  return { scanned, inserted, skippedMissingFk, skippedDuplicates }
}
