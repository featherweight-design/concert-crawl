/**
 * Concert Crawl — recompute canonical_title with the #850 normalizer
 * (Markdown bold/italic markers stripped, apostrophe variants stripped).
 *
 * Context: PR #824 swapped the dedup key to canonical_title. That
 * collapsed ~270 prod dupes via the partial UNIQUE index on
 * (venue_id, date, canonical_title) WHERE status='upcoming'. A residual
 * ~8 dupes survived because their canonical_title strings legitimately
 * differed in ways the original normalizer didn't handle:
 *
 *   - "...zeds dead jamboree!" vs "...zed's dead jamboree!"
 *     (apostrophe variant — collapses post-#850)
 *   - "...comedy presents kristin key **early show**" vs
 *     "...comedy presents kristin key early show"
 *     (Markdown bold markers — collapses post-#850)
 *
 * What this script does:
 *   1. SNAPSHOT — copy every row whose canonical_title would change
 *      under the new normalizer into events_canonicalize_850_backup
 *      (7-day rollback window per the #821 pattern). The sidecar
 *      table is TRUNCATE+INSERTed each run so re-execution is
 *      idempotent rather than accumulating duplicate snapshots.
 *   2. RECOMPUTE — for every row whose newly-computed canonical_title
 *      differs from what's stored, plan an UPDATE.
 *   3. COLLAPSE — identify clusters where the new normalizer creates
 *      a (venue_id, date, canonical_title) collision among upcoming
 *      rows. Only clusters where AT LEAST ONE row's canonical_title
 *      would change under the new normalizer are processed —
 *      pre-existing collisions where every row already shares the same
 *      stored canonical_title are explicitly out of scope for this PR
 *      (see PR #855 Copilot R3 / selectCollapseClusters docstring).
 *      Pick a winner deterministically:
 *        a. highest confidence_score (NULLs sort last)
 *        b. earliest created_at as tiebreak
 *        c. lowest id as final stable tiebreak
 *      Merge non-null fields from losers into the winner (price,
 *      description, image, etc.), reassign FK rows (user_events,
 *      price_submissions, price_retrieval_log, event_reports),
 *      delete losers.
 *   4. APPLY — under --commit, perform the planned writes inside
 *      one transaction per cluster (mirrors the
 *      2026-06-26-cleanup-cross-venue-phantoms.ts pattern — independent
 *      auditable units, partial progress preferable to all-or-nothing
 *      if a surprise FK fires mid-batch).
 *
 * Run:
 *   pnpm tsx scripts/2026-06-27-canonicalize-markdown-apostrophes.ts            # dry-run
 *   pnpm tsx scripts/2026-06-27-canonicalize-markdown-apostrophes.ts --commit   # writes
 *
 * Against staging/prod set DATABASE_URL accordingly. Per
 * reference_neon_env_vars (Hugh's shell exports NEON_STAGING_DIRECT and
 * NEON_PROD_DIRECT for direct non-pooled connection strings), the
 * invocation looks like:
 *
 *   DATABASE_URL=$NEON_STAGING_DIRECT pnpm tsx scripts/2026-06-27-canonicalize-markdown-apostrophes.ts
 *
 * Idempotent: re-running after --commit is a no-op (recompute matches
 * stored value, plan is empty, snapshot table refreshed but contains
 * zero rows).
 *
 * Read-only by default. Dry-run takes no row-level locks on shared
 * tables.
 *
 * Known scope limit: this script does NOT collapse the Lindy Jam
 * trailing-annotation pattern (`X` vs `X **tuesday 7/14**`) because the
 * new normalizer keeps inner markdown text, so the two recomputed
 * canonicals are still distinct ("x" vs "x tuesday 7/14"). Those dupes
 * require manual merge via the admin UI (#820) — stripping inner text
 * would discard real content from titles where bold wraps the
 * headliner (e.g. "**Beyoncé** World Tour").
 */

import { pathToFileURL } from 'node:url'
import { and, eq, inArray, sql } from 'drizzle-orm'
import {
  db,
  events,
  venues,
  userEvents,
  eventReports,
  priceSubmissions,
  priceRetrievalLog,
} from '@concert-crawl/db'
// Relative source import (not package barrel) so this one-shot script
// runs against a clean checkout without requiring a prior
// `pnpm build --filter=@concert-crawl/crawler-core`. tsx resolves the
// `.js` suffix back to the `.ts` source.
import { canonicalizeTitle } from '../packages/crawler-core/src/lib/canonical-title.js'
import {
  chunk,
  planUserEventDedup,
  selectCollapseClusters,
  type UserEventRow,
} from './2026-06-27-canonicalize-markdown-apostrophes-helpers.js'

// Postgres' bind-parameter ceiling is 65,535 and query size grows linearly
// with params. 1000 rows per snapshot INSERT keeps each statement well
// under both limits with headroom for additional per-row params.
const SNAPSHOT_BATCH_SIZE = 1000

// Sidecar table for 7-day rollback. Mirrors events_consolidate_821 from
// scripts/2026-06-26-event-canonical-title-consolidate.sql.
const BACKUP_TABLE = 'events_canonicalize_850_backup'

interface RowWithCanonical {
  id: string
  venueId: string | null
  venueName: string | null
  date: string
  status: 'upcoming' | 'cancelled' | 'postponed'
  title: string
  storedCanonical: string
  computedCanonical: string
  confidenceScore: string | null // numeric → string in postgres-js
  createdAt: Date
  // Mergeable fields used when collapsing losers into a winner.
  description: string | null
  imageUrl: string | null
  ticketUrl: string | null
  doorsTime: string | null
  showTime: string | null
  ticketPriceMin: string | null
  ticketPriceMax: string | null
}

interface ClusterPlan {
  /** Unique cluster key — (venueId, date, newCanonical). */
  key: string
  venueName: string | null
  date: string
  newCanonical: string
  winner: RowWithCanonical
  losers: RowWithCanonical[]
  /** Pre-computed merge patch the winner should receive (non-null fields
   * pulled from losers where the winner is currently null). */
  winnerPatch: Partial<{
    description: string
    imageUrl: string
    ticketUrl: string
    doorsTime: string
    showTime: string
    ticketPriceMin: string
    ticketPriceMax: string
  }>
}

interface RecomputeOnly {
  row: RowWithCanonical
}

export interface BackfillSummary {
  rowsScanned: number
  /** Rows where computedCanonical !== storedCanonical — i.e. the recompute
   * produced a different canonical_title than what's stored. Note this
   * counts the change, not the cluster: a row that gets pulled into a
   * collapse cluster but whose own canonical didn't change (e.g. the
   * winner whose stored canonical already matches the new value) is NOT
   * counted here. See rowsRecomputedStandalone + collapseClustersFound
   * + collapseLosers for cluster-shape breakdowns. */
  rowsRecomputed: number
  /** Standalone recomputes (no collision with another row). */
  rowsRecomputedStandalone: number
  /** Collapse clusters identified. Only counts buckets where the new
   * normalizer would change at least one row's canonical_title; pre-
   * existing (venue_id, date, canonical_title) collisions where every
   * row already has matching canonical_title are intentionally skipped
   * (see selectCollapseClusters / PR #855 R3). */
  collapseClustersFound: number
  /** Loser rows that would be deleted post-collapse. */
  collapseLosers: number
  rowsUpdated: number
  rowsDeleted: number
  fkReassignments: {
    userEvents: number
    eventReports: number
    priceSubmissions: number
    priceRetrievalLog: number
  }
  committed: boolean
}

/** Preview a long string for operator dry-run logs. */
function preview(value: string, max = 80): string {
  if (value.length <= max) return value
  return `${value.slice(0, max - 3)}...`
}

/** Deterministic winner pick: highest confidence_score (numeric, NULL last),
 * then earliest created_at, then lowest id. */
function pickWinner(rows: RowWithCanonical[]): RowWithCanonical {
  return [...rows].sort((left, right) => {
    // confidence_score: NULL sorts last (worst), otherwise higher wins.
    const leftScore =
      left.confidenceScore === null ? -Infinity : Number(left.confidenceScore)
    const rightScore =
      right.confidenceScore === null ? -Infinity : Number(right.confidenceScore)
    if (leftScore !== rightScore) return rightScore - leftScore
    // created_at ASC: earlier row wins.
    const leftCreated = left.createdAt.getTime()
    const rightCreated = right.createdAt.getTime()
    if (leftCreated !== rightCreated) return leftCreated - rightCreated
    // id ASC stable final tiebreak.
    return left.id.localeCompare(right.id)
  })[0]!
}

/** For each mergeable field, prefer winner's value; fall back to the first
 * non-null loser. Output is a patch object containing only fields where the
 * winner is currently null AND at least one loser has a value. */
function buildWinnerPatch(
  winner: RowWithCanonical,
  losers: RowWithCanonical[],
): ClusterPlan['winnerPatch'] {
  const patch: ClusterPlan['winnerPatch'] = {}
  const fields = [
    'description',
    'imageUrl',
    'ticketUrl',
    'doorsTime',
    'showTime',
    'ticketPriceMin',
    'ticketPriceMax',
  ] as const
  for (const field of fields) {
    if (winner[field] !== null) continue
    for (const loser of losers) {
      const value = loser[field]
      if (value !== null) {
        patch[field] = value
        break
      }
    }
  }
  return patch
}

export async function runBackfill(opts: {
  commit: boolean
}): Promise<BackfillSummary> {
  // 1. Load every event row + recompute its canonical_title in JS.
  //    Scan everything (not just status=upcoming) so the snapshot
  //    captures changes on cancelled/postponed rows too — they sit
  //    outside the partial UNIQUE index but still benefit from a
  //    consistent canonical_title for search relevance.
  const rawRows = await db
    .select({
      id: events.id,
      venueId: events.venueId,
      venueName: venues.name,
      date: events.date,
      status: events.status,
      title: events.title,
      storedCanonical: events.canonicalTitle,
      confidenceScore: events.confidenceScore,
      createdAt: events.createdAt,
      description: events.description,
      imageUrl: events.imageUrl,
      ticketUrl: events.ticketUrl,
      doorsTime: events.doorsTime,
      showTime: events.showTime,
      ticketPriceMin: events.ticketPriceMin,
      ticketPriceMax: events.ticketPriceMax,
    })
    .from(events)
    .leftJoin(venues, eq(events.venueId, venues.id))

  console.log(`Scanned ${rawRows.length} events.`)

  const rows: RowWithCanonical[] = rawRows.map((row) => ({
    ...row,
    computedCanonical: canonicalizeTitle(row.title),
  }))

  // 2. Partition: rows whose canonical changed, then split those into
  //    standalone recomputes vs. collapse clusters.
  const changed = rows.filter(
    (row) => row.computedCanonical !== row.storedCanonical,
  )

  console.log(`Of those, ${changed.length} rows recompute to a new canonical.`)

  // Group changed-or-existing rows by their NEW (venue_id, date,
  // canonical) so a row whose recompute lands on an existing row's value
  // surfaces as a cluster. Only consider status='upcoming' rows for the
  // collision check — that matches the partial UNIQUE index's predicate
  // exactly. Non-upcoming rows can recompute freely (standalone path).
  const upcomingByKey = new Map<string, RowWithCanonical[]>()
  for (const row of rows) {
    if (row.status !== 'upcoming') continue
    if (row.venueId === null) continue
    const key = `${row.venueId}|${row.date}|${row.computedCanonical}`
    const bucket = upcomingByKey.get(key) ?? []
    bucket.push(row)
    upcomingByKey.set(key, bucket)
  }

  // Tighten cluster construction so this script only processes
  // collisions the new normalizer is responsible for. A bucket where
  // every row already has the same stored canonical_title is a
  // pre-existing dupe (residual from #821 / earlier cleanup gaps) and
  // would silently widen this script's blast radius beyond what the
  // filename + PR title claim. See helpers/selectCollapseClusters for
  // the full Copilot R3 rationale.
  const qualifyingClusters = selectCollapseClusters(upcomingByKey)
  const skippedPreExistingClusters =
    [...upcomingByKey.values()].filter((bucket) => bucket.length >= 2).length -
    qualifyingClusters.size
  if (skippedPreExistingClusters > 0) {
    console.log(
      `Skipped ${skippedPreExistingClusters} pre-existing collision cluster(s) — every row's canonical already matches the new normalizer (out of scope for #850).`,
    )
  }

  const collapseClusters: ClusterPlan[] = []
  const recomputeOnly: RecomputeOnly[] = []
  const handledRowIds = new Set<string>()

  for (const [key, bucket] of qualifyingClusters) {
    // This bucket has a collision the new normalization is responsible
    // for. Pick a winner deterministically, treat the rest as losers.
    const winner = pickWinner(bucket)
    const losers = bucket.filter((row) => row.id !== winner.id)
    collapseClusters.push({
      key,
      venueName: winner.venueName,
      date: winner.date,
      newCanonical: winner.computedCanonical,
      winner,
      losers,
      winnerPatch: buildWinnerPatch(winner, losers),
    })
    for (const row of bucket) handledRowIds.add(row.id)
  }

  // Remaining changed rows that aren't part of a collapse cluster: plain
  // recompute. Includes status=cancelled/postponed changed rows and
  // upcoming changed rows that landed in their own (size=1) bucket.
  for (const row of changed) {
    if (handledRowIds.has(row.id)) continue
    recomputeOnly.push({ row })
  }

  console.log(
    `Plan: ${recomputeOnly.length} standalone recomputes, ${collapseClusters.length} collapse clusters (${collapseClusters.reduce(
      (sum, plan) => sum + plan.losers.length,
      0,
    )} loser rows to merge + delete).`,
  )

  // 3. Per-cluster dry-run log.
  for (const plan of collapseClusters) {
    console.log('---')
    console.log(`COLLAPSE @ ${plan.venueName ?? '(no venue)'} on ${plan.date}`)
    console.log(`  new canonical = ${preview(plan.newCanonical, 100)}`)
    console.log(
      `  winner id     = ${plan.winner.id} (conf=${plan.winner.confidenceScore ?? 'null'}, title=${preview(plan.winner.title, 60)})`,
    )
    for (const loser of plan.losers) {
      console.log(
        `  loser  id     = ${loser.id} (conf=${loser.confidenceScore ?? 'null'}, title=${preview(loser.title, 60)})`,
      )
    }
    if (Object.keys(plan.winnerPatch).length > 0) {
      console.log(`  winner patch  = ${JSON.stringify(plan.winnerPatch)}`)
    }
  }

  // Standalone recomputes — sample only (long log otherwise). Operator
  // can grep the JSON summary for full counts.
  const sampleStandalone = recomputeOnly.slice(0, 20)
  if (sampleStandalone.length > 0) {
    console.log('---')
    console.log(
      `Standalone recompute sample (first ${sampleStandalone.length} of ${recomputeOnly.length}):`,
    )
    for (const { row } of sampleStandalone) {
      console.log(
        `  id=${row.id} venue=${row.venueName ?? '(no venue)'} date=${row.date}`,
      )
      console.log(`     stored   = ${preview(row.storedCanonical, 100)}`)
      console.log(`     computed = ${preview(row.computedCanonical, 100)}`)
    }
  }

  // 4a. SNAPSHOT — capture every row whose canonical would change OR
  //     that's a loser in a collapse cluster (losers are about to be
  //     deleted). The collapse-cluster winner is also snapshotted so
  //     rollback can restore the original mergeable fields if the merge
  //     patch turns out to be wrong. Sidecar table is recreated each
  //     run; TRUNCATE on every invocation so re-execution refreshes the
  //     window rather than accumulating stale snapshots.
  const idsToSnapshot = new Set<string>()
  for (const { row } of recomputeOnly) idsToSnapshot.add(row.id)
  for (const plan of collapseClusters) {
    idsToSnapshot.add(plan.winner.id)
    for (const loser of plan.losers) idsToSnapshot.add(loser.id)
  }

  console.log('---')
  console.log(`Snapshot plan: ${idsToSnapshot.size} rows.`)

  if (!opts.commit) {
    console.log(
      'Dry-run mode — no rows touched. Re-run with --commit to apply.',
    )
    return {
      rowsScanned: rows.length,
      rowsRecomputed: changed.length,
      rowsRecomputedStandalone: recomputeOnly.length,
      collapseClustersFound: collapseClusters.length,
      collapseLosers: collapseClusters.reduce(
        (sum, plan) => sum + plan.losers.length,
        0,
      ),
      rowsUpdated: 0,
      rowsDeleted: 0,
      fkReassignments: {
        userEvents: 0,
        eventReports: 0,
        priceSubmissions: 0,
        priceRetrievalLog: 0,
      },
      // committed=false on no-op early-return paths even if --commit was
      // passed — the summary reflects whether writes actually happened,
      // not the flag the operator set. Same shape as
      // 2026-06-27-strip-description-html.ts (#844 Copilot R4).
      committed: false,
    }
  }

  if (idsToSnapshot.size === 0) {
    console.log('Nothing to do — no canonical_title changes detected.')
    return {
      rowsScanned: rows.length,
      rowsRecomputed: 0,
      rowsRecomputedStandalone: 0,
      collapseClustersFound: 0,
      collapseLosers: 0,
      rowsUpdated: 0,
      rowsDeleted: 0,
      fkReassignments: {
        userEvents: 0,
        eventReports: 0,
        priceSubmissions: 0,
        priceRetrievalLog: 0,
      },
      committed: false,
    }
  }

  // CREATE TABLE LIKE captures column types but not constraints (so a
  // foreign key to venues.id can't break the snapshot if a venue is
  // later deleted). The snapshot_at column is operator metadata for the
  // 7-day rollback window — query
  //   SELECT * FROM events_canonicalize_850_backup WHERE snapshot_at > NOW() - INTERVAL '7 days'
  // to confirm a rollback is still possible.
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS ${sql.identifier(BACKUP_TABLE)}
      (LIKE events INCLUDING DEFAULTS)
  `)
  await db.execute(sql`
    ALTER TABLE ${sql.identifier(BACKUP_TABLE)}
      ADD COLUMN IF NOT EXISTS snapshot_at timestamptz NOT NULL DEFAULT NOW()
  `)
  await db.execute(sql`TRUNCATE ${sql.identifier(BACKUP_TABLE)}`)
  // INSERT only the columns events has — snapshot_at gets the column
  // default. Using SELECT * would mismatch the column count.
  //
  // Chunked by SNAPSHOT_BATCH_SIZE so a large recompute set doesn't
  // build one giant `WHERE id IN (...)` that blows past Postgres'
  // bind-parameter ceiling (65,535) before any cleanup runs. Each batch
  // is an independent INSERT; partial progress is acceptable here
  // because the cluster transactions below are the actual atomic units.
  const snapshotBatches = chunk(Array.from(idsToSnapshot), SNAPSHOT_BATCH_SIZE)
  let snapshotInserted = 0
  for (const batch of snapshotBatches) {
    await db.execute(sql`
      INSERT INTO ${sql.identifier(BACKUP_TABLE)}
        (id, venue_id, title, artist, date, doors_time, show_time, ticket_url,
         ticket_links, ticket_price_min, ticket_price_max, price_source,
         pipeline_exhausted_at, description, image_url, genre, status,
         confidence_score, verified, hidden_from_consumer,
         is_concert_review_needed, setlist, source_url, source_hash,
         extraction_strategy, canonical_artist, canonical_title,
         last_seen_at, first_missing_at, created_at, updated_at)
      SELECT
        id, venue_id, title, artist, date, doors_time, show_time, ticket_url,
        ticket_links, ticket_price_min, ticket_price_max, price_source,
        pipeline_exhausted_at, description, image_url, genre, status,
        confidence_score, verified, hidden_from_consumer,
        is_concert_review_needed, setlist, source_url, source_hash,
        extraction_strategy, canonical_artist, canonical_title,
        last_seen_at, first_missing_at, created_at, updated_at
      FROM events
      WHERE id IN (${sql.join(
        batch.map((id) => sql`${id}::uuid`),
        sql`, `,
      )})
    `)
    snapshotInserted += batch.length
  }
  console.log(
    `SNAPSHOT captured ${snapshotInserted} rows into ${BACKUP_TABLE} (${snapshotBatches.length} batch(es) of up to ${SNAPSHOT_BATCH_SIZE}).`,
  )

  // 4b. APPLY — process collapse clusters first so the winner update
  //     happens after FK reassignment but before delete. One transaction
  //     per cluster so a single bad cluster doesn't roll back the whole
  //     run.
  let updatedCount = 0
  let deletedCount = 0
  const fkCounts = {
    userEvents: 0,
    eventReports: 0,
    priceSubmissions: 0,
    priceRetrievalLog: 0,
  }

  for (const plan of collapseClusters) {
    await db.transaction(async (tx) => {
      const loserIds = plan.losers.map((loser) => loser.id)

      // FK reassignment — user_events first. UNIQUE(user_id, event_id)
      // means we must dedupe per-user across (winner ∪ losers) before
      // redirecting, NOT just where a winner-side row already exists.
      // If a user has watch rows on losers A and B (neither on winner W),
      // a naive `UPDATE event_id=W WHERE event_id IN (A,B)` sets A→W
      // first, then violates UNIQUE(user,W) when redirecting B. The
      // plan keeps exactly one row per user (winner-side preferred,
      // otherwise the earliest loser-side row) and deletes the rest;
      // remaining loser rows are then collision-free to redirect.
      const clusterEventIds = [plan.winner.id, ...loserIds]
      const userEventRowsForCluster = await tx
        .select({
          id: userEvents.id,
          userId: userEvents.userId,
          eventId: userEvents.eventId,
          createdAt: userEvents.createdAt,
        })
        .from(userEvents)
        .where(inArray(userEvents.eventId, clusterEventIds))

      const userEventRowsTyped: UserEventRow[] = userEventRowsForCluster
      const dedupPlan = planUserEventDedup(userEventRowsTyped, plan.winner.id)

      if (dedupPlan.rowIdsToDelete.length > 0) {
        await tx
          .delete(userEvents)
          .where(inArray(userEvents.id, dedupPlan.rowIdsToDelete))
      }
      // Only redirect the rows the plan explicitly promoted — any
      // surplus loser rows for that user were already deleted above,
      // so this UPDATE is collision-free under the unique index.
      if (dedupPlan.rowIdsToRedirect.length > 0) {
        const ueResult = await tx
          .update(userEvents)
          .set({ eventId: plan.winner.id })
          .where(inArray(userEvents.id, dedupPlan.rowIdsToRedirect))
          .returning({ id: userEvents.id })
        fkCounts.userEvents += ueResult.length
      }

      const erResult = await tx
        .update(eventReports)
        .set({ eventId: plan.winner.id })
        .where(inArray(eventReports.eventId, loserIds))
        .returning({ id: eventReports.id })
      fkCounts.eventReports += erResult.length

      const psResult = await tx
        .update(priceSubmissions)
        .set({ eventId: plan.winner.id })
        .where(inArray(priceSubmissions.eventId, loserIds))
        .returning({ id: priceSubmissions.id })
      fkCounts.priceSubmissions += psResult.length

      const prlResult = await tx
        .update(priceRetrievalLog)
        .set({ eventId: plan.winner.id })
        .where(inArray(priceRetrievalLog.eventId, loserIds))
        .returning({ id: priceRetrievalLog.id })
      fkCounts.priceRetrievalLog += prlResult.length

      // Delete losers (no CASCADE concerns — FKs already reassigned).
      await tx.delete(events).where(inArray(events.id, loserIds))

      // Update winner: new canonical + merge patch.
      await tx
        .update(events)
        .set({
          canonicalTitle: plan.newCanonical,
          ...plan.winnerPatch,
        })
        .where(eq(events.id, plan.winner.id))
    })
    updatedCount += 1
    deletedCount += plan.losers.length
    console.log(
      `COLLAPSE applied: winner ${plan.winner.id}, deleted ${plan.losers.length} loser(s).`,
    )
  }

  // 4c. APPLY standalone recomputes — single UPDATE per row, optimistic-
  //     locked on the original canonical so a concurrent crawler write
  //     between the SELECT and the UPDATE doesn't get silently clobbered.
  //     Pattern matches 2026-06-27-strip-description-html.ts.
  let skippedConcurrent = 0
  for (const { row } of recomputeOnly) {
    const updated = await db
      .update(events)
      .set({ canonicalTitle: row.computedCanonical })
      .where(
        and(
          eq(events.id, row.id),
          eq(events.canonicalTitle, row.storedCanonical),
        ),
      )
      .returning({ id: events.id })
    if (updated.length === 0) {
      console.log(
        `Skipped standalone ${row.id} — canonical_title changed between scan and update`,
      )
      skippedConcurrent += 1
      continue
    }
    updatedCount += 1
  }

  console.log('---')
  console.log(
    `Committed. Updated ${updatedCount} rows. Deleted ${deletedCount} losers. FK reassignments: user_events=${fkCounts.userEvents}, event_reports=${fkCounts.eventReports}, price_submissions=${fkCounts.priceSubmissions}, price_retrieval_log=${fkCounts.priceRetrievalLog}. Skipped (concurrent edit): ${skippedConcurrent}.`,
  )

  return {
    rowsScanned: rows.length,
    rowsRecomputed: changed.length,
    rowsRecomputedStandalone: recomputeOnly.length,
    collapseClustersFound: collapseClusters.length,
    collapseLosers: collapseClusters.reduce(
      (sum, plan) => sum + plan.losers.length,
      0,
    ),
    rowsUpdated: updatedCount,
    rowsDeleted: deletedCount,
    fkReassignments: fkCounts,
    // `committed` reflects whether writes actually happened. If every
    // recompute was skipped by the optimistic lock AND zero collapse
    // clusters ran, updatedCount + deletedCount is 0 and we report
    // committed=false — matches the early-return semantics above.
    committed: updatedCount > 0 || deletedCount > 0,
  }
}

// CLI entrypoint guard so the module can also be imported by a test
// without auto-running.
const invokedUrl = process.argv[1]
  ? pathToFileURL(process.argv[1]).href
  : undefined
if (invokedUrl && import.meta.url === invokedUrl) {
  const commit = process.argv.includes('--commit')
  runBackfill({ commit })
    .then((summary) => {
      console.log('---')
      console.log(JSON.stringify(summary, null, 2))
      process.exit(0)
    })
    .catch((err) => {
      console.error('Backfill failed:', err)
      process.exit(1)
    })
}
