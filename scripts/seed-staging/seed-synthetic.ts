/**
 * Concert Crawl — synthetic user data seeder orchestrator.
 *
 * Ties the generators together into a single idempotent run:
 *   1. cleanupFixtures  — delete all fixture-owned rows from staging
 *   2. fetch eventIds   — select up to 500 event IDs from staging
 *   3. generateUserProfiles
 *   4. generateUserEvents        (skipped if eventIds is empty)
 *   5. generateFeedback
 *   6. generatePriceSubmissions  (skipped if eventIds is empty)
 *   7. generateNotifications
 *   8. generateWatcherCrowd      (skipped if eventIds is empty)
 *   9. generateOwnerHistory       (skipped if pastEventIds is empty)
 *  10. generateCrews             (skipped if eventIds is empty)
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
import { events } from '../../packages/db/src/schema/index.js'
import * as schema from '../../packages/db/src/schema/index.js'
import { cleanupFixtures } from './cleanup-fixtures.js'
import { createRng } from './seeded-rng.js'
import {
  FIXTURE_USER_IDS,
  FIXTURE_SEED,
  CROWD_USER_IDS,
  OWNER_USER_ID,
} from './fixture-users.js'
import { assertWriteHostNotProd } from './sync-prod-public-data-helpers.js'
import { generateUserProfiles } from './generators/user-profiles.js'
import { generateUserEvents } from './generators/user-events.js'
import { generateFeedback } from './generators/feedback.js'
import { generatePriceSubmissions } from './generators/price-submissions.js'
import { generateNotifications } from './generators/notifications.js'
import { generateWatcherCrowd } from './generators/watcher-crowd.js'
import { generateOwnerHistory } from './generators/owner-history.js'
import { generateCrews } from './generators/crews.js'
import type { DrizzleWriteDb } from './sync-venues.js'

// ---------------------------------------------------------------------------
// Orchestrator (exported for tests)
// ---------------------------------------------------------------------------

export async function runSynthetic(deps: {
  staging: DrizzleWriteDb
  fixtureUserIds: readonly string[]
  /** Profile-only accounts backing the "Who else is watching" rosters. */
  crowdUserIds: readonly string[]
  /** Hugh's own staging account — user_events only, never a full sweep. */
  ownerUserId: string
  seed: number
}): Promise<{
  deleted: Record<string, number>
  inserted: Record<string, number>
}> {
  const { staging, fixtureUserIds, crowdUserIds, ownerUserId, seed } = deps

  // Reject empty fixture sets up front. cleanupFixtures happens to handle
  // it (early-returns zeros), but downstream generators — generateFeedback
  // reads fixtureUserIds[0]!, generateNotifications calls
  // rng.pick(fixtureUserIds), generateUserProfiles would insert().values([])
  // — would fail deep in generation with confusing errors instead. A clear
  // failure at the entry point is more debuggable.
  if (fixtureUserIds.length === 0) {
    throw new Error(
      'runSynthetic: fixtureUserIds must not be empty. Provide at least one Clerk user id.',
    )
  }

  // 1. Delete all fixture-user-owned rows (idempotency reset). The crowd is
  // swept in full — those accounts exist only to populate watcher rosters. The
  // owner is narrowed to user_events, because the rest of that account is real.
  const { deleted } = await cleanupFixtures({
    staging,
    fixtureUserIds: [...fixtureUserIds, ...crowdUserIds],
    userEventsOnlyUserIds: [ownerUserId],
  })

  // 2. Fetch event IDs once — used by event-linked generators.
  // ORDER BY id is REQUIRED: LIMIT without ORDER BY lets Postgres return
  // rows in an arbitrary order even when the events table is unchanged,
  // which would break the seeder's binding same-seed → same-rows contract
  // (the rng would be consumed against a different eventIds sequence
  // across runs).
  const eventRows = await staging
    .select({ id: events.id, date: events.date })
    .from(events)
    .orderBy(events.id)
    .limit(500)
  const eventIds: readonly string[] = eventRows.map((row) => row.id)
  // Concert History (#70) only shows past nights, so the user_events generator
  // needs to know which events already happened to put attendance on them.
  const todayIso = new Date().toISOString().slice(0, 10)
  const pastEventIds: readonly string[] = eventRows
    .filter((row) => typeof row.date === 'string' && row.date < todayIso)
    .map((row) => row.id)

  if (eventIds.length === 0) {
    console.warn(
      '[synthetic] WARNING: no events found in staging. ' +
        'Run pnpm db:seed:staging:sync first to populate events. ' +
        'user_events and price_submissions generators will be skipped.',
    )
  }

  // 3. Create ONE rng instance from seed and thread it through all generators.
  const rng = createRng(seed)

  const generatorDeps = { staging, fixtureUserIds, eventIds, pastEventIds, rng }

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
  // Track confirms separately — cleanup deletes submissionConfirms so the
  // report is asymmetric without this key (deleted.submissionConfirms
  // shows up but inserted.submissionConfirms wouldn't). Makes idempotency
  // validation from the CLI summary straightforward.
  let submissionConfirmsInserted = 0
  if (eventIds.length > 0) {
    const priceSubmissionsResult = await generatePriceSubmissions(generatorDeps)
    priceSubmissionsInserted = priceSubmissionsResult.inserted
    submissionConfirmsInserted = priceSubmissionsResult.insertedConfirms
  }

  const notificationsResult = await generateNotifications(generatorDeps)

  // Watcher crowd and owner history run last so the rng draw sequence of the
  // five original generators is unchanged — appending here keeps every
  // previously-seeded row byte-identical for a given seed.
  let crowdProfilesInserted = 0
  let crowdUserEventsInserted = 0
  let showcaseEventIds: readonly string[] = []
  if (eventIds.length > 0) {
    const crowdResult = await generateWatcherCrowd({
      staging,
      crowdUserIds,
      ownerUserId,
      eventIds,
      pastEventIds,
      rng,
    })
    crowdProfilesInserted = crowdResult.insertedProfiles
    crowdUserEventsInserted = crowdResult.insertedUserEvents
    showcaseEventIds = crowdResult.showcaseEventIds
  }

  // Concert History is past nights only, so with no past-dated events there is
  // nothing for this generator to write.
  let ownerHistoryInserted = 0
  if (pastEventIds.length > 0) {
    const ownerHistoryResult = await generateOwnerHistory({
      staging,
      ownerUserId,
      pastEventIds,
      excludeEventIds: showcaseEventIds,
      rng,
    })
    ownerHistoryInserted = ownerHistoryResult.inserted
  }

  // Crews run after owner history for the same reason: appending here leaves
  // every previously-seeded row byte-identical for a given seed.
  let crewsResult = {
    insertedCrews: 0,
    insertedMembers: 0,
    insertedInvites: 0,
    insertedMutes: 0,
    insertedUserEvents: 0,
  }
  if (eventIds.length > 0) {
    crewsResult = await generateCrews({
      staging,
      crowdUserIds,
      ownerUserId,
      eventIds,
      pastEventIds,
      // The crowd already has user_events on the showcase events; reusing one
      // would collide on the (user_id, event_id) unique index and abort the run.
      excludeEventIds: showcaseEventIds,
      rng,
    })
  }

  if (showcaseEventIds.length > 0) {
    console.log(
      '[synthetic] Watcher-roster showcase events (deep / mixed / single): ' +
        showcaseEventIds.join(', '),
    )
  }

  return {
    deleted,
    inserted: {
      userProfiles: profilesResult.inserted + crowdProfilesInserted,
      userEvents:
        userEventsInserted +
        crowdUserEventsInserted +
        ownerHistoryInserted +
        crewsResult.insertedUserEvents,
      feedback: feedbackResult.inserted,
      priceSubmissions: priceSubmissionsInserted,
      submissionConfirms: submissionConfirmsInserted,
      notifications: notificationsResult.inserted,
      crews: crewsResult.insertedCrews,
      crewMembers: crewsResult.insertedMembers,
      crewInvites: crewsResult.insertedInvites,
      crewMutes: crewsResult.insertedMutes,
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
      crowdUserIds: CROWD_USER_IDS,
      ownerUserId: OWNER_USER_ID,
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
