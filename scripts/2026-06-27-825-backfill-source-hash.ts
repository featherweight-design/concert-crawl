/**
 * Concert Crawl — one-time source_hash backfill for the hashEvent
 * cutover (#825).
 *
 * PR #852 drops `artist` from `hashEvent`. The new hash format is
 * `(title, date, doorsTime, showTime)`. Every existing `events` row in
 * staging/prod has its `source_hash` computed under the OLD format
 * (with `artist`), so after the crawler deploys with the new code the
 * first crawl will see `existing.sourceHash !== hashEvent(...)` for
 * every still-upcoming verified row — firing up to ~965 false
 * `crawl.verified_event_changed` notifications in prod even when the
 * underlying listings didn't change. Copilot's R1 review flagged this
 * as low-confidence; the user picked Option A: one-time backfill, so
 * the cutover is clean and the first post-deploy crawl produces only
 * notifications for real changes.
 *
 * Sequencing — read this before running:
 *
 *   1. Merge PR #852 → triggers deploy of new hashEvent code to API +
 *      crawler.
 *   2. Wait for staging API + crawler to redeploy. The crawler must be
 *      running the new hashEvent before this script runs — otherwise
 *      the next crawl re-writes the rows backfilled with new-format
 *      hashes back to the old format, and the cutover problem comes
 *      right back on the *following* crawl.
 *   3. Staging first:
 *        DATABASE_URL=$NEON_STAGING_DIRECT \
 *          tsx scripts/2026-06-27-825-backfill-source-hash.ts --commit
 *   4. Verify the next staging crawl produces zero
 *      `crawl.verified_event_changed` notifications for unchanged
 *      listings.
 *   5. Prod:
 *        DATABASE_URL=$NEON_PROD_DIRECT \
 *          tsx scripts/2026-06-27-825-backfill-source-hash.ts --commit
 *
 * What it does:
 *   1. Selects every `events` row where `verified = true`,
 *      `status = 'upcoming'`, and `date >= today (Denver tz)`. Past
 *      events are excluded because they never get re-crawled; touching
 *      them is wasted work and write risk. `verified = false` rows are
 *      also excluded — the changedVerified notification path only fires
 *      for `verified = true` rows, so unverified rows don't need
 *      preemptive backfill. The "today" comparison uses Denver-local
 *      date (not Postgres `CURRENT_DATE`) to match the crawler's
 *      `DENVER_TODAY` filter in packages/crawler-core/src/crawl.ts —
 *      otherwise a run during the UTC-midnight → Denver-midnight window
 *      (6–7h, depending on DST) would skip same-day Denver events that
 *      the crawler still considers upcoming, leaving exactly the rows
 *      that can still fire false `crawl.verified_event_changed` alerts
 *      at old-format hashes.
 *   2. For each row, recomputes `sourceHash` under the new format using
 *      the `hashEvent` helper from packages/crawler-core/src/lib/hash.ts.
 *   3. Compares to the row's current `source_hash`:
 *        - equal: no-op (already in new format, e.g. a row created
 *          after the crawler deploy)
 *        - different: snapshot the row into the sidecar table
 *          `events_source_hash_825_backup` (7-day rollback window,
 *          pattern from `events_consolidate_821`), then UPDATE the row
 *          to the new-format hash.
 *   4. Dry-run by default. Pass `--commit` to actually write.
 *
 * Per-row snapshot+UPDATE runs inside its own transaction so a single
 * bad row rolls back independently. Mirrors the pattern from
 * scripts/2026-06-26-cleanup-cross-venue-phantoms.ts.
 *
 * Read-only by default. Dry-run takes no row-level locks and creates no
 * objects — the backup table is created only in the `--commit` path via
 * `CREATE TABLE IF NOT EXISTS`, which is itself idempotent.
 *
 * Idempotent: re-running after a successful --commit is a no-op. The
 * second pass sees every row already at the new-format hash and falls
 * through the `currentHash === newHash` short-circuit. The backup table
 * is left intact for the 7-day rollback window — drop it manually after
 * the window expires.
 *
 * Rollback (within 7 days):
 *   UPDATE events e
 *   SET source_hash = b.source_hash
 *   FROM events_source_hash_825_backup b
 *   WHERE b.id = e.id;
 */

import { pathToFileURL } from 'node:url'
import { and, eq, gte, sql } from 'drizzle-orm'
import { db, events } from '@concert-crawl/db'
// Relative source import (not package barrel) so this one-shot script
// runs against a clean checkout without requiring a prior
// `pnpm build --filter=@concert-crawl/crawler-core`. tsx resolves the
// `.js` suffix back to the `.ts` source. Mirrors the pattern in
// scripts/2026-06-27-strip-description-html.ts.
import { hashEvent } from '../packages/crawler-core/src/lib/hash.js'

export interface BackfillSummary {
  rowsScanned: number
  rowsNoop: number
  rowsSnapshotted: number
  rowsUpdated: number
  committed: boolean
}

interface CandidateRow {
  id: string
  title: string
  date: string
  doorsTime: string | null
  showTime: string | null
  sourceHash: string | null
}

interface DirtyRow extends CandidateRow {
  newHash: string
  currentHash: string | null
}

export async function runBackfill(opts: {
  commit: boolean
}): Promise<BackfillSummary> {
  // 1. Load every still-upcoming verified row. The notification path that
  //    we're protecting (`crawl.verified_event_changed`) only fires for
  //    verified rows on future dates that the crawler re-encounters —
  //    everything else is out of scope and updating it is wasted work
  //    plus needless write risk.
  //
  //    "Today" must use Denver-local date, not Postgres CURRENT_DATE.
  //    Mirrors `DENVER_TODAY` in packages/crawler-core/src/crawl.ts:147,
  //    which the crawler uses to decide which rows it'll re-encounter.
  //    If this script ran around UTC midnight with CURRENT_DATE, the
  //    candidate set would advance ~6–7h before Denver's midnight and
  //    miss same-day Denver events that the crawler still considers
  //    upcoming — leaving exactly the rows that can still fire false
  //    `crawl.verified_event_changed` alerts at old-format hashes. Keep
  //    this literal in sync with crawl.ts:147.
  const denverToday = sql`(NOW() AT TIME ZONE 'America/Denver')::date`
  const candidates: CandidateRow[] = await db
    .select({
      id: events.id,
      title: events.title,
      date: events.date,
      doorsTime: events.doorsTime,
      showTime: events.showTime,
      sourceHash: events.sourceHash,
    })
    .from(events)
    .where(
      and(
        eq(events.verified, true),
        eq(events.status, 'upcoming'),
        gte(events.date, denverToday),
      ),
    )

  console.log(
    `Loaded ${candidates.length} candidate rows (verified=true, status=upcoming, date>=today Denver tz).`,
  )

  // 2. Compute new-format hash per row; partition into noop vs dirty.
  const dirty: DirtyRow[] = []
  let noopCount = 0
  for (const row of candidates) {
    const newHash = hashEvent({
      title: row.title,
      date: row.date,
      doorsTime: row.doorsTime,
      showTime: row.showTime,
    })
    if (row.sourceHash === newHash) {
      noopCount += 1
      continue
    }
    dirty.push({ ...row, newHash, currentHash: row.sourceHash })
  }

  console.log(
    `Of those, ${noopCount} already match the new-format hash and ${dirty.length} need a rewrite.`,
  )

  if (dirty.length === 0) {
    return {
      rowsScanned: candidates.length,
      rowsNoop: noopCount,
      rowsSnapshotted: 0,
      rowsUpdated: 0,
      // committed=false on no-op early-return paths even if --commit was
      // passed — the summary reflects whether writes actually happened,
      // not the flag the operator set. Mirrors the convention from
      // scripts/2026-06-27-strip-description-html.ts and
      // scripts/2026-06-26-cleanup-cross-venue-phantoms.ts.
      committed: false,
    }
  }

  // Per-row operator log (always — both dry-run and --commit). Keeps the
  // dry-run useful as a spot-check and the --commit run as a before/after
  // record for incident review.
  for (const row of dirty) {
    console.log(
      [
        '---',
        `id        = ${row.id}`,
        `title     = ${row.title}`,
        `date      = ${row.date}`,
        `doorsTime = ${row.doorsTime ?? '(null)'}`,
        `showTime  = ${row.showTime ?? '(null)'}`,
        `before    = ${row.currentHash ?? '(null)'}`,
        `after     = ${row.newHash}`,
      ].join('\n'),
    )
  }

  if (!opts.commit) {
    console.log('---')
    console.log(
      'Dry-run mode — no rows touched. Re-run with --commit to apply.',
    )
    return {
      rowsScanned: candidates.length,
      rowsNoop: noopCount,
      rowsSnapshotted: 0,
      rowsUpdated: 0,
      committed: false,
    }
  }

  // 3. --commit path. Ensure the sidecar backup table exists. Pattern
  //    mirrors `events_consolidate_821` from
  //    scripts/2026-06-26-event-canonical-title-consolidate.sql: LIKE
  //    events INCLUDING ALL gives us a structurally identical mirror
  //    for the 7-day rollback window, plus a `snapshot_at` column so
  //    operators can see when each row was captured. `IF NOT EXISTS`
  //    keeps re-runs idempotent.
  await db.execute(
    sql`CREATE TABLE IF NOT EXISTS events_source_hash_825_backup (LIKE events INCLUDING ALL)`,
  )
  await db.execute(
    sql`ALTER TABLE events_source_hash_825_backup ADD COLUMN IF NOT EXISTS snapshot_at timestamptz`,
  )

  // 4. Per-row snapshot + UPDATE inside a transaction. Mirrors the
  //    transaction-per-row pattern adopted in PR 853 R1's
  //    scripts/2026-06-27-extractor-dedup-suffix-scan.ts so a transient
  //    failure mid-batch stops the run cleanly rather than leaving
  //    snapshot/UPDATE pairs out of sync.
  //
  //    Optimistic-lock the UPDATE on the original source_hash so a
  //    concurrent crawler write between SELECT and UPDATE doesn't get
  //    silently overwritten. If the row's hash changed in the window
  //    (e.g. the crawler ran and wrote a fresh new-format hash already),
  //    .returning() yields zero rows and we leave the row alone — the
  //    crawler's write is already correct by definition.
  let snapshotCount = 0
  let updatedCount = 0
  for (const row of dirty) {
    await db
      .transaction(async (tx) => {
        // Snapshot first so a rollback below reverts both the snapshot
        // insert and the UPDATE atomically. If the optimistic-lock
        // UPDATE finds zero rows, the whole transaction rolls back and
        // the snapshot disappears too — no orphaned backup rows.
        await tx.execute(sql`
        INSERT INTO events_source_hash_825_backup
        SELECT e.*, NOW() FROM ${events} e WHERE e.id = ${row.id}
      `)

        const lockClause =
          row.currentHash === null
            ? sql`${events.sourceHash} IS NULL`
            : sql`${events.sourceHash} = ${row.currentHash}`
        const updated = await tx
          .update(events)
          .set({ sourceHash: row.newHash })
          .where(and(eq(events.id, row.id), lockClause))
          .returning({ id: events.id })

        if (updated.length === 0) {
          // Concurrent edit between SELECT and UPDATE — roll back the
          // snapshot too by throwing to abort the transaction. The outer
          // loop catches and logs; the row stays at whatever value the
          // concurrent writer set (which, if it was the new-deploy crawler,
          // is already the correct new-format hash).
          throw new ConcurrentEditError(row.id)
        }
      })
      .then(
        () => {
          snapshotCount += 1
          updatedCount += 1
          console.log(`Updated ${row.id} → ${row.newHash}`)
        },
        (err: unknown) => {
          if (err instanceof ConcurrentEditError) {
            console.log(
              `Skipped ${err.rowId} — source_hash changed between scan and update`,
            )
            return
          }
          throw err
        },
      )
  }

  console.log('---')
  console.log(
    `Committed. Snapshotted ${snapshotCount} rows into events_source_hash_825_backup, updated ${updatedCount} rows in events.`,
  )

  return {
    rowsScanned: candidates.length,
    rowsNoop: noopCount,
    rowsSnapshotted: snapshotCount,
    rowsUpdated: updatedCount,
    // Same semantics as the no-op early-return paths: committed reflects
    // whether writes actually happened, not the flag the operator set.
    committed: updatedCount > 0,
  }
}

// Thrown by the per-row transaction body when the optimistic lock fires;
// caught by the outer .then() error handler and logged as a skip.
class ConcurrentEditError extends Error {
  readonly rowId: string
  constructor(rowId: string) {
    super(`concurrent edit on row ${rowId}`)
    this.name = 'ConcurrentEditError'
    this.rowId = rowId
  }
}

// CLI entrypoint guard so the module can also be imported by a test
// without auto-running. Compares import.meta.url against the invoked
// script URL — same shape as the sibling scripts.
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
