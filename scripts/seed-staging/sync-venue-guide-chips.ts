/**
 * Concert Crawl — sync venue_guide_chips from prod to staging.
 *
 * Reads all chip rows from prod, translates each row's venueId through the
 * venueIdMap produced by syncVenues, then upserts into staging on the
 * (venue_id, chip_type) unique index.
 *
 * A chip whose prod venue is absent from the map is skipped, not invented: the
 * design's third chip state, `blank`, IS the absence of a row (enforced by
 * venue_guide_chips_state_check, migration 0068), so there is no empty-body
 * row to fall back on. On a fresh staging DB the map is empty and every row is
 * skipped — expected, and why syncVenues must run in commit mode first.
 *
 * Per-row skip warnings are capped for the same reason as in
 * sync-price-retrieval-log.ts: an empty map would otherwise emit one warning
 * per prod chip. The aggregate count is always reported.
 */

import { venueGuideChips } from '../../packages/db/src/schema/index.js'
import type { ProdReadonlyClient } from './prod-readonly-client.js'
import type { IdMap, DrizzleWriteDb } from './sync-venues.js'

const MAX_SKIP_WARNINGS = 5

export async function syncVenueGuideChips(deps: {
  prod: ProdReadonlyClient
  staging: DrizzleWriteDb
  dryRun: boolean
  venueIdMap: IdMap
}): Promise<{ scanned: number; processed: number; skippedMissingFk: number }> {
  const { prod, staging, dryRun, venueIdMap } = deps

  const prodRows = await prod.select((db) => db.select().from(venueGuideChips))

  const scanned = prodRows.length
  let processed = 0
  let skippedMissingFk = 0
  let skipWarningsEmitted = 0

  const warnSkip = (msg: string): void => {
    if (skipWarningsEmitted < MAX_SKIP_WARNINGS) {
      console.warn(msg)
      skipWarningsEmitted++
      if (skipWarningsEmitted === MAX_SKIP_WARNINGS) {
        console.warn(
          '[sync-venue-guide-chips] (further per-row skip warnings suppressed — see aggregate summary at end)',
        )
      }
    }
  }

  for (const row of prodRows) {
    const stagingVenueId = venueIdMap.get(row.venueId)
    if (stagingVenueId === undefined) {
      warnSkip(
        `[sync-venue-guide-chips] skipping chip ${row.id} — prod venueId ${row.venueId} not in venueIdMap`,
      )
      skippedMissingFk++
      continue
    }

    if (!dryRun) {
      const { id: _prodId, venueId: _prodVenueId, ...rest } = row
      await staging
        .insert(venueGuideChips)
        .values({ ...rest, venueId: stagingVenueId })
        .onConflictDoUpdate({
          target: [venueGuideChips.venueId, venueGuideChips.chipType],
          set: {
            body: row.body,
            isPlaceholder: row.isPlaceholder,
            updatedAt: row.updatedAt,
          },
        })
    }
    processed++
  }

  if (skippedMissingFk > 0) {
    console.warn(
      `[sync-venue-guide-chips] skipped ${skippedMissingFk} row(s) due to missing FK parent (venueId not in venueIdMap)`,
    )
  }

  return { scanned, processed, skippedMissingFk }
}
