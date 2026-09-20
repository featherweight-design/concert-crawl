/**
 * Concert Crawl — prod→staging public-data sync CLI entry.
 *
 * Copies public venue/event/artist/price-log/guide-chip rows from prod into the
 * staging DB so the staging environment reflects real data shapes and volume
 * without manual data entry.
 *
 * Usage:
 *
 *   Dry run (reads prod + staging, prints what would change, writes nothing):
 *     NEON_PROD_DIRECT=... NEON_STAGING_DIRECT=... \
 *       pnpm db:seed:staging:sync -- --dry-run
 *
 *   Commit (upserts venues, events, artists, price log, guide chips into staging):
 *     NEON_PROD_DIRECT=... NEON_STAGING_DIRECT=... \
 *       pnpm db:seed:staging:sync
 *
 * Required environment variables (read from process.env — never CLI args):
 *   NEON_PROD_DIRECT      Full Postgres URL for the prod Neon DB (read-only usage)
 *   NEON_STAGING_DIRECT   Full Postgres URL for the staging Neon DB (write target)
 *
 * Prod read-only guarantee:
 *   The prod connection is opened via `openProdReadonly`, which returns a
 *   structurally narrowed client that exposes only `.select` — write methods
 *   are not part of the client's returned surface, and the Drizzle client
 *   passed into the `.select` callback is itself a proxied minimal wrapper
 *   that exposes only `.select` and `.query` (every other property access,
 *   including Drizzle's internal write-capable handles, throws). The
 *   write-host guard (`assertWriteHostNotProd`) provides an additional
 *   belt-and-braces check: it throws before any DB connection is opened if
 *   both env vars resolve to the same Neon host.
 *
 * Idempotency:
 *   All five sync steps use ON CONFLICT upsert or query-and-skip semantics.
 *   Re-running the script produces identical results (no duplicate rows).
 *
 * FK order:
 *   venues → events → artists → price_retrieval_log → venue_guide_chips.
 *   No transaction wrap — each step is independently idempotent and the FK
 *   chain is enforced by execution order. `artists` has no FK into venues (it
 *   is a projection joined on events.canonical_artist), so its position is
 *   convention; `venue_guide_chips` genuinely requires venueIdMap and so must
 *   follow venues.
 *
 * Never synced:
 *   Everything else. This entrypoint invokes exactly the five public-content
 *   modules imported below and touches no other table, so the allowlist IS the
 *   contract — a second partial denylist here would only drift out of step with
 *   the schema. The reason the line is hard, and the table-by-table reading of
 *   it, live in docs/runbooks/staging-environment.md: the staging
 *   transactional-email gate (#1613) fails OPEN, so a prod user row in staging
 *   plus a restorable cron is a path to emailing a real customer from staging.
 *   Content tables carry no FK into any user table, which is what makes the
 *   split enforceable rather than aspirational.
 */

import { pathToFileURL } from 'node:url'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '../../packages/db/src/schema/index.js'
import { isLocalConnectionString } from '../../packages/db/src/connection.js'
import { openProdReadonly } from './prod-readonly-client.js'
import { syncVenues } from './sync-venues.js'
import { syncEvents } from './sync-events.js'
import { syncArtists } from './sync-artists.js'
import { syncPriceRetrievalLog } from './sync-price-retrieval-log.js'
import { syncVenueGuideChips } from './sync-venue-guide-chips.js'
import {
  parseArgs,
  assertWriteHostNotProd,
} from './sync-prod-public-data-helpers.js'

export async function main(): Promise<void> {
  // 1. Read + validate env vars.
  const prodUrl = process.env['NEON_PROD_DIRECT'] ?? ''
  const stagingUrl = process.env['NEON_STAGING_DIRECT'] ?? ''

  if (!prodUrl) {
    throw new Error(
      'NEON_PROD_DIRECT is required but not set. Export the prod Neon connection string before running.',
    )
  }
  if (!stagingUrl) {
    throw new Error(
      'NEON_STAGING_DIRECT is required but not set. Export the staging Neon connection string before running.',
    )
  }

  // 2. Belt-and-braces guard: refuse if staging URL resolves to the prod host.
  assertWriteHostNotProd(prodUrl, stagingUrl)

  // 3. Parse CLI flags.
  const { dryRun } = parseArgs(process.argv)

  if (dryRun) {
    console.log('[sync] DRY RUN — no rows will be written to staging.')
  }

  // 4. Open both connections inside try so the finally block always has a chance
  //    to close them — even if the staging URL is malformed and postgres() throws.
  let prod: ReturnType<typeof openProdReadonly> | undefined
  let stagingSql: ReturnType<typeof postgres> | undefined

  try {
    prod = openProdReadonly(prodUrl)
    stagingSql = postgres(stagingUrl, {
      max: 2,
      prepare: false,
      // Local docker Postgres has no TLS cert; Neon requires TLS. Gate on
      // the target host so this script works for both prod→staging and
      // prod→local seeding without needing an env override.
      ssl: isLocalConnectionString(stagingUrl) ? false : 'require',
    })
    const staging = drizzle(stagingSql, { schema })

    const now = new Date()

    // Step 1: venues.
    console.log('\n[sync] Step 1/5 — venues')
    const venueResult = await syncVenues({ prod, staging, dryRun })
    console.log(
      `[sync] venues: scanned=${venueResult.scanned} ${dryRun ? 'wouldProcess' : 'processed'}=${venueResult.processed}`,
    )

    // Step 2: events (depends on venueIdMap).
    console.log('\n[sync] Step 2/5 — events')
    const eventResult = await syncEvents({
      prod,
      staging,
      dryRun,
      now,
      venueIdMap: venueResult.venueIdMap,
    })
    console.log(
      `[sync] events: scanned=${eventResult.scanned} ${dryRun ? 'wouldProcess' : 'processed'}=${eventResult.processed}`,
    )

    // Step 3: artists (no FK parents — position is convention, not requirement).
    console.log('\n[sync] Step 3/5 — artists')
    const artistResult = await syncArtists({ prod, staging, dryRun })
    console.log(
      `[sync] artists: scanned=${artistResult.scanned} ${dryRun ? 'wouldProcess' : 'processed'}=${artistResult.processed}`,
    )

    // Step 4: price retrieval log (depends on both maps).
    console.log('\n[sync] Step 4/5 — price_retrieval_log')
    const priceResult = await syncPriceRetrievalLog({
      prod,
      staging,
      dryRun,
      venueIdMap: venueResult.venueIdMap,
      eventIdMap: eventResult.eventIdMap,
      now,
    })
    console.log(
      `[sync] price_retrieval_log: scanned=${priceResult.scanned} ${dryRun ? 'wouldInsert' : 'inserted'}=${priceResult.inserted} skippedMissingFk=${priceResult.skippedMissingFk} skippedDuplicates=${priceResult.skippedDuplicates}`,
    )

    // Step 5: venue guide chips (depends on venueIdMap).
    console.log('\n[sync] Step 5/5 — venue_guide_chips')
    const chipResult = await syncVenueGuideChips({
      prod,
      staging,
      dryRun,
      venueIdMap: venueResult.venueIdMap,
    })
    console.log(
      `[sync] venue_guide_chips: scanned=${chipResult.scanned} ${dryRun ? 'wouldProcess' : 'processed'}=${chipResult.processed} skippedMissingFk=${chipResult.skippedMissingFk}`,
    )

    // 5. Summary.
    console.log('\n[sync] ─── Summary ───────────────────────────────────────')
    console.log(
      `  mode:                ${dryRun ? 'dry-run (no writes)' : 'commit'}`,
    )
    console.log(
      `  venues   scanned=${venueResult.scanned}  ${dryRun ? 'wouldProcess' : 'processed'}=${venueResult.processed}`,
    )
    console.log(
      `  events   scanned=${eventResult.scanned}  ${dryRun ? 'wouldProcess' : 'processed'}=${eventResult.processed}`,
    )
    console.log(
      `  artists  scanned=${artistResult.scanned}  ${dryRun ? 'wouldProcess' : 'processed'}=${artistResult.processed}`,
    )
    console.log(
      `  price_log scanned=${priceResult.scanned}  ${dryRun ? 'wouldInsert' : 'inserted'}=${priceResult.inserted}  skippedMissingFk=${priceResult.skippedMissingFk}  skippedDuplicates=${priceResult.skippedDuplicates}`,
    )
    console.log(
      `  chips    scanned=${chipResult.scanned}  ${dryRun ? 'wouldProcess' : 'processed'}=${chipResult.processed}  skippedMissingFk=${chipResult.skippedMissingFk}`,
    )
    console.log('[sync] ──────────────────────────────────────────────────────')

    if (dryRun) {
      console.log(
        '[sync] Dry run complete — re-run without --dry-run to commit.',
      )
    } else {
      console.log('[sync] Sync complete.')
    }
  } finally {
    // 6. Close both connections regardless of outcome (guards against partial
    //    initialisation if the staging URL was malformed and postgres() threw).
    await Promise.allSettled([prod?.close(), stagingSql?.end()])
  }
}

// CLI entrypoint guard — mirrors scripts/2026-07-11-gifted-comps-backfill.ts:179-195.
// Allows the module to be imported by tests without auto-running.
const invokedUrl = process.argv[1]
  ? pathToFileURL(process.argv[1]).href
  : undefined
if (invokedUrl && import.meta.url === invokedUrl) {
  main()
    .then(() => {
      process.exit(0)
    })
    .catch((err: unknown) => {
      console.error('[sync] Fatal error:', err)
      process.exit(1)
    })
}
