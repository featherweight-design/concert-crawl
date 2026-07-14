/**
 * Concert Crawl — synthetic user data seeder orchestrator.
 *
 * Ties together the five generators (Tasks 2–4) into a single idempotent run:
 *   1. cleanupFixtures  — delete all fixture-owned rows from staging
 *   2. fetch eventIds   — select up to 500 event IDs from staging
 *   3. generateUserProfiles
 *   4. generateUserEvents        (skipped if eventIds is empty)
 *   5. generateFeedback
 *   6. generatePriceSubmissions  (skipped if eventIds is empty)
 *   7. generateNotifications
 *
 * Usage:
 *   NEON_PROD_DIRECT=... NEON_STAGING_DIRECT=... pnpm db:seed:staging:synthetic
 *
 * Required environment variables (read from process.env — never CLI args):
 *   NEON_PROD_DIRECT      Full Postgres URL for the prod Neon DB (guard-only — not connected)
 *   NEON_STAGING_DIRECT   Full Postgres URL for the staging Neon DB (write target)
 *
 * Idempotency:
 *   The script deletes all fixture-user-owned rows before inserting new ones,
 *   so re-running with the same seed always produces the same final state.
 *
 * Determinism:
 *   A single seeded RNG instance (mulberry32) is created from FIXTURE_SEED and
 *   threaded to every generator. The same seed always produces the same rows.
 *   Never use Math.random() — it is non-deterministic across runs.
 */

import { pathToFileURL } from 'node:url'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { events } from '@concert-crawl/db'
import * as schema from '../../packages/db/src/schema/index.js'
import { cleanupFixtures } from './cleanup-fixtures.js'
import { createRng } from './seeded-rng.js'
import { FIXTURE_USER_IDS, FIXTURE_SEED } from './fixture-users.js'
import { assertWriteHostNotProd } from './sync-prod-public-data-helpers.js'
import { generateUserProfiles } from './generators/user-profiles.js'
import { generateUserEvents } from './generators/user-events.js'
import { generateFeedback } from './generators/feedback.js'
import { generatePriceSubmissions } from './generators/price-submissions.js'
import { generateNotifications } from './generators/notifications.js'
import type { DrizzleWriteDb } from './sync-venues.js'

// ---------------------------------------------------------------------------
// Orchestrator (exported for tests)
// ---------------------------------------------------------------------------

export async function runSynthetic(deps: {
  staging: DrizzleWriteDb
  fixtureUserIds: readonly string[]
  seed: number
}): Promise<{
  deleted: Record<string, number>
  inserted: Record<string, number>
}> {
  const { staging, fixtureUserIds, seed } = deps

  // 1. Delete all fixture-user-owned rows (idempotency reset).
  const { deleted } = await cleanupFixtures({ staging, fixtureUserIds })

  // 2. Fetch event IDs once — used by event-linked generators.
  // ORDER BY id is REQUIRED: LIMIT without ORDER BY lets Postgres return
  // rows in an arbitrary order even when the events table is unchanged,
  // which would break the seeder's binding same-seed → same-rows contract
  // (the rng would be consumed against a different eventIds sequence
  // across runs).
  const eventRows = await staging
    .select({ id: events.id })
    .from(events)
    .orderBy(events.id)
    .limit(500)
  const eventIds: readonly string[] = eventRows.map((row) => row.id)

  if (eventIds.length === 0) {
    console.warn(
      '[synthetic] WARNING: no events found in staging. ' +
        'Run pnpm db:seed:staging:sync first to populate events. ' +
        'user_events and price_submissions generators will be skipped.',
    )
  }

  // 3. Create ONE rng instance from seed and thread it through all generators.
  const rng = createRng(seed)

  const generatorDeps = { staging, fixtureUserIds, eventIds, rng }

  // 4. Run generators in strict order: profiles → user_events → feedback →
  //    price_submissions → notifications. Generators that require eventIds are
  //    skipped when eventIds is empty.
  const profilesResult = await generateUserProfiles(generatorDeps)

  let userEventsInserted = 0
  if (eventIds.length > 0) {
    const userEventsResult = await generateUserEvents(generatorDeps)
    userEventsInserted = userEventsResult.inserted
  }

  const feedbackResult = await generateFeedback(generatorDeps)

  let priceSubmissionsInserted = 0
  if (eventIds.length > 0) {
    const priceSubmissionsResult = await generatePriceSubmissions(generatorDeps)
    priceSubmissionsInserted = priceSubmissionsResult.inserted
  }

  const notificationsResult = await generateNotifications(generatorDeps)

  return {
    deleted,
    inserted: {
      userProfiles: profilesResult.inserted,
      userEvents: userEventsInserted,
      feedback: feedbackResult.inserted,
      priceSubmissions: priceSubmissionsInserted,
      notifications: notificationsResult.inserted,
    },
  }
}

// ---------------------------------------------------------------------------
// CLI entry
// ---------------------------------------------------------------------------

export async function main(): Promise<void> {
  // 1. Read + validate env vars.
  const prodUrl = process.env['NEON_PROD_DIRECT'] ?? ''
  const stagingUrl = process.env['NEON_STAGING_DIRECT'] ?? ''

  if (!prodUrl) {
    throw new Error(
      'NEON_PROD_DIRECT is required but not set. ' +
        'Export both NEON_PROD_DIRECT and NEON_STAGING_DIRECT before running.',
    )
  }
  if (!stagingUrl) {
    throw new Error(
      'NEON_STAGING_DIRECT is required but not set. ' +
        'Export both NEON_PROD_DIRECT and NEON_STAGING_DIRECT before running.',
    )
  }

  // 2. Belt-and-braces guard: refuse if staging URL resolves to the prod host.
  //    Generating against prod would delete all real user data — catastrophic.
  assertWriteHostNotProd(prodUrl, stagingUrl)

  // 3. Open the staging connection inside try so the finally block can close it.
  let stagingSql: ReturnType<typeof postgres> | undefined

  try {
    stagingSql = postgres(stagingUrl, {
      max: 2,
      prepare: false,
      ssl: 'require',
    })
    const staging = drizzle(stagingSql, { schema })

    console.log('\n[synthetic] Starting synthetic user data seeder…')

    const result = await runSynthetic({
      staging,
      fixtureUserIds: FIXTURE_USER_IDS,
      seed: FIXTURE_SEED,
    })

    // 4. Summary.
    console.log(
      '\n[synthetic] ─── Summary ───────────────────────────────────────',
    )
    console.log('  deleted:')
    for (const [table, count] of Object.entries(result.deleted)) {
      console.log(`    ${table}: ${count}`)
    }
    console.log('  inserted:')
    for (const [table, count] of Object.entries(result.inserted)) {
      console.log(`    ${table}: ${count}`)
    }
    console.log(
      '[synthetic] ────────────────────────────────────────────────────',
    )
    console.log('[synthetic] Synthetic seeder complete.')
  } finally {
    // 5. Close connection regardless of outcome. Use Promise.allSettled so a
    // failure inside .end() (e.g. Neon socket already torn down mid-run)
    // doesn't mask the original error from the try block. Mirrors the
    // pattern in sync-prod-public-data.ts.
    await Promise.allSettled([stagingSql?.end()])
  }
}

// CLI entrypoint guard — mirrors sync-prod-public-data.ts.
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
      console.error('[synthetic] Fatal error:', err)
      process.exit(1)
    })
}
