/**
 * Concert Crawl — backfill: collapse duplicated trailing word in
 * `events.title` (issue #851).
 *
 * Prod incident: two Larimer Lounge rows for the same BPM BINGO show,
 * differing only by a duplicated trailing word in `title`:
 *   - "BPM BINGO! Dombresky / Walker & Royce Edition"          (clean)
 *   - "BPM BINGO! Dombresky / Walker & Royce Edition Edition"  (LLM glitch)
 *
 * The forward fix in this PR (`stripDuplicatedTrailingWord` wired into
 * `extractWithLlm`) prevents new rows from landing in this state. This
 * script applies the same cleanup to historical rows.
 *
 * Architecture: two-stage filter.
 *   Stage 1 (SQL prefilter): narrow the candidate set efficiently in-DB
 *     using a Postgres regex (`~*` anchored with `\m` — the modern
 *     Postgres word-start boundary, plus an end-of-string anchor `$`
 *     for the trailing edge) that approximates the JS rule. This is a
 *     perf optimization — it keeps the JS pass from streaming every
 *     events row through the helper.
 *   Stage 2 (JS source of truth): re-run every prefilter hit through
 *     `stripDuplicatedTrailingWord` and trust its verdict. The
 *     `cleaned === row.title` short-circuit below absorbs cases where
 *     the SQL was looser than the JS (regex drift is possible — they
 *     are separate string literals — so this defends against it rather
 *     than asserting it cannot happen).
 *
 * What it does:
 *   1. Run the SQL prefilter to load candidate rows.
 *   2. For each candidate, recompute the cleaned title in JS via the
 *      same `stripDuplicatedTrailingWord` helper the extractor uses,
 *      and only treat rows where JS actually rewrites as dirty.
 *   3. Per-row dry-run output: event id, venue name, date, current
 *      title, proposed cleaned title — for operator spot-check.
 *   4. With --apply: snapshot dirty rows to `events_851_backup` (created
 *      if missing, PRIMARY KEY on `event_id`) so a 7-day rollback is a
 *      single deterministic UPDATE away —
 *      `UPDATE events SET title = b.title_before FROM events_851_backup b
 *      WHERE events.id = b.event_id` restores the pre-script titles
 *      (the backup table stores (event_id, title_before, title_after,
 *      snapshotted_at) — enough to restore titles, not to recreate full
 *      event rows). The PRIMARY KEY guarantees at most one snapshot row
 *      per event_id, so the rollback UPDATE is unambiguous even after
 *      multiple --apply passes (see "Single-pass cleanup" below). On a
 *      conflict, the snapshot upsert preserves the original
 *      `title_before` (the rollback target) and refreshes
 *      `title_after` + `snapshotted_at` — so re-runs against "Edition
 *      Edition Edition" → "Edition Edition" → "Edition" still roll back
 *      to the original three-word title in one statement. Then UPDATE
 *      the live rows. Snapshot + update for each row run inside a single
 *      transaction so a concurrent-edit skip or a transient DB error
 *      doesn't leave a snapshot row whose UPDATE never landed.
 *
 * Run:
 *   pnpm tsx scripts/2026-06-27-extractor-dedup-suffix-scan.ts           # dry-run
 *   pnpm tsx scripts/2026-06-27-extractor-dedup-suffix-scan.ts --apply   # writes
 *
 * Against staging/prod set DATABASE_URL accordingly (e.g.
 * `DATABASE_URL=$NEON_STAGING_DIRECT pnpm tsx scripts/...`).
 *
 * Single-pass cleanup matching the extractor's per-crawl behavior.
 * `stripDuplicatedTrailingWord` is intentionally single-pass — it removes
 * one duplicated trailing word per call so that legitimate repeated tokens
 * (e.g. an artist literally named "Hello Hello") aren't collapsed away.
 * This script mirrors that contract: each --apply run strips exactly one
 * duplicated trailing word per dirty row. For pathological titles with
 * 3+ repeated trailing words (e.g. "Edition Edition Edition" → "Edition
 * Edition" → "Edition"), operators may need to re-run --apply until the
 * candidate scan returns zero rows ("idempotent in the limit"). This
 * matches what the extractor would do across N consecutive crawls of the
 * same listing.
 *
 * In the common case (a single duplicated trailing word, which is what
 * #851 was filed for), one --apply pass is sufficient and re-running is a
 * no-op: a previously-cleaned row no longer matches the candidate filter,
 * and any row that survives the filter but is unchanged by the JS helper
 * falls through the `cleaned === row.title` short-circuit.
 *
 * Read-only by default. Dry-run takes no row-level locks.
 */

import { pathToFileURL } from 'node:url'
import { and, eq, sql } from 'drizzle-orm'
import { db, events, venues } from '@concert-crawl/db'
// Relative source import (not package barrel) so this one-shot script
// runs against a clean checkout without requiring a prior
// `pnpm build --filter=@concert-crawl/crawler-core`. tsx resolves the
// `.js` suffix back to the `.ts` source. Mirrors the import shape used
// by scripts/2026-06-27-strip-description-html.ts.
import { stripDuplicatedTrailingWord } from '../packages/crawler-core/src/lib/strip-duplicated-trailing-word.js'
// Pulled out into a DB-free helper module so the SQL-shape regression
// tests can import the constants without also pulling in
// `@concert-crawl/db`, which constructs a Postgres client at module
// load (PR #853 R6, expanded in R8 for the backup-table DDL +
// upsert).
import {
  BACKUP_TABLE_DDL,
  BACKUP_TABLE_PK_BACKFILL_DDL,
  SQL_PREFILTER_REGEX,
} from './2026-06-27-extractor-dedup-suffix-scan-helpers.js'

export interface BackfillSummary {
  rowsScanned: number
  rowsDirty: number
  rowsUpdated: number
  rowsSnapshotted: number
  // Dirty rows whose title was modified by another process between the
  // initial SELECT and the optimistic-locked UPDATE — operator should
  // re-run to pick them up if still dirty.
  rowsSkippedConcurrentEdit: number
  applied: boolean
}

interface DirtyRow {
  id: string
  venueName: string | null
  // Drizzle's default mapping for a `date()` column is `string`
  // (ISO YYYY-MM-DD). Carry it as-is — no Date construction needed
  // since the log line just prints the date portion.
  date: string
  before: string
  after: string
}

export async function runBackfill(opts: {
  apply: boolean
}): Promise<BackfillSummary> {
  const candidates = await db
    .select({
      id: events.id,
      title: events.title,
      date: events.date,
      venueName: venues.name,
    })
    .from(events)
    .leftJoin(venues, eq(events.venueId, venues.id))
    .where(sql`${events.title} ~* ${SQL_PREFILTER_REGEX}`)

  console.log(`Loaded ${candidates.length} candidate rows from events.`)

  const dirty: DirtyRow[] = []
  for (const row of candidates) {
    const cleaned = stripDuplicatedTrailingWord(row.title)
    // Defensive: a Postgres regex hit that the JS helper doesn't change
    // means the SQL and JS rules drifted — skip rather than no-op-update.
    if (cleaned === row.title) continue
    dirty.push({
      id: row.id,
      venueName: row.venueName,
      date: row.date,
      before: row.title,
      after: cleaned,
    })
  }

  console.log(`Of those, ${dirty.length} actually need a rewrite.`)

  if (dirty.length === 0) {
    return {
      rowsScanned: candidates.length,
      rowsDirty: 0,
      rowsUpdated: 0,
      rowsSnapshotted: 0,
      rowsSkippedConcurrentEdit: 0,
      applied: false,
    }
  }

  // Per-row operator log (always — both dry-run and --apply). Keeps the
  // dry-run useful as a spot-check audit and the --apply run as a
  // before/after record for incident review.
  for (const row of dirty) {
    console.log(
      [
        '---',
        `id     = ${row.id}`,
        `venue  = ${row.venueName ?? '(no venue)'}`,
        `date   = ${row.date}`,
        `before = ${row.before}`,
        `after  = ${row.after}`,
      ].join('\n'),
    )
  }

  if (!opts.apply) {
    console.log('---')
    console.log(
      `Dry-run mode — no rows touched. Re-run with --apply to commit.`,
    )
    return {
      rowsScanned: candidates.length,
      rowsDirty: dirty.length,
      rowsUpdated: 0,
      rowsSnapshotted: 0,
      rowsSkippedConcurrentEdit: 0,
      applied: false,
    }
  }

  // --apply: snapshot first, then per-row optimistic-locked UPDATE.
  //
  // Snapshot table: `events_851_backup`. Created here on first --apply
  // (idempotent CREATE IF NOT EXISTS) with the columns we'd need for a
  // 7-day rollback — id + the before/after pair + when the script ran.
  // PRIMARY KEY on `event_id` guarantees at most one snapshot row per
  // event so the rollback UPDATE is deterministic even across multiple
  // --apply passes (PR #853 R8). Per-row INSERT ... ON CONFLICT below
  // matches the per-row UPDATE granularity so a transient failure
  // mid-batch leaves the snapshot and the live table consistent with
  // each other.
  // DDL bodies live in the helper module so the SQL-shape regression
  // tests can assert their structure without importing the DB client
  // (PR #853 R8). `sql.raw` emits the string verbatim — the DDL has
  // no parameters so this is safe.
  await db.execute(sql.raw(BACKUP_TABLE_DDL))

  // Self-heal: if the table was created by an earlier run of this
  // script (before the PK was added in R8), the CREATE IF NOT EXISTS
  // above is a no-op and the legacy table is still PK-less. Add the
  // constraint idempotently — `ADD CONSTRAINT IF NOT EXISTS` is not
  // valid for PRIMARY KEY in Postgres, so the helper SQL guards with
  // a catalog lookup. If the table already has any PK (this run's or
  // a previous one's), this is a no-op; otherwise it locks the table
  // briefly to add the constraint. Safe to run on every --apply.
  await db.execute(sql.raw(BACKUP_TABLE_PK_BACKFILL_DDL))

  // Optimistic-lock the UPDATE on the original title so a concurrent
  // crawler / admin edit between the initial SELECT and the UPDATE
  // doesn't get silently clobbered. If the row's title changed in the
  // window, .returning() yields zero rows and we log + skip rather than
  // overwriting fresher content (mirrors the pattern used by the #827
  // strip-description-html backfill).
  //
  // Each row's snapshot INSERT + UPDATE run inside a single transaction
  // (#851). Without the transaction, a concurrent-edit skip or a
  // transient DB error between the two statements would leave a
  // `events_851_backup` row whose UPDATE never landed — `rowsSnapshotted`
  // in the summary would then overstate what was actually changed, and
  // an operator using the snapshot for rollback would touch rows the
  // script never updated. Inside `db.transaction`, throwing rolls back
  // both the INSERT and the UPDATE; an optimistic-lock miss throws
  // `ConcurrentEditSkip` so the snapshot is rolled back too. In-memory
  // counters are bumped only after `db.transaction` resolves so a
  // commit-time failure can't leave them out of sync with the DB
  // (mirrors the pattern in scripts/2026-06-26-cleanup-cross-venue-
  // phantoms.ts).
  let updatedCount = 0
  let snapshottedCount = 0
  let skippedCount = 0
  class ConcurrentEditSkip extends Error {}
  for (const row of dirty) {
    try {
      await db.transaction(async (tx) => {
        // UPSERT keyed on event_id (PR #853 R8). On conflict, preserve
        // the original `title_before` (the rollback target — set on the
        // first --apply pass and never overwritten) and refresh
        // `title_after` + `snapshotted_at` so the snapshot reflects the
        // latest cleanup pass. This keeps multi-pass cleanup of
        // pathological titles (e.g. "Edition Edition Edition" → "Edition
        // Edition" → "Edition") rolling back to the original three-word
        // title in a single deterministic UPDATE. The structural
        // invariant (which columns refresh, which preserve) is pinned
        // by `BACKUP_UPSERT_SQL` in the helper module and asserted in
        // the regression test.
        await tx.execute(
          sql`INSERT INTO events_851_backup (event_id, title_before, title_after)
              VALUES (${row.id}, ${row.before}, ${row.after})
              ON CONFLICT (event_id) DO UPDATE SET
                title_after = EXCLUDED.title_after,
                snapshotted_at = now()`,
        )

        const updated = await tx
          .update(events)
          .set({ title: row.after })
          .where(and(eq(events.id, row.id), eq(events.title, row.before)))
          .returning({ id: events.id })
        if (updated.length === 0) {
          // Throwing inside `db.transaction` rolls back the snapshot
          // INSERT above so the backup table stays in lockstep with
          // what actually changed.
          throw new ConcurrentEditSkip()
        }
      })
    } catch (err) {
      if (err instanceof ConcurrentEditSkip) {
        console.log(`Skipped ${row.id} — title changed between scan and update`)
        skippedCount += 1
        continue
      }
      throw err
    }
    snapshottedCount += 1
    updatedCount += 1
  }

  console.log('---')
  console.log(
    `Applied. Snapshotted ${snapshottedCount} rows to events_851_backup. Updated ${updatedCount} rows. Skipped ${skippedCount} rows (concurrent edit).`,
  )

  return {
    rowsScanned: candidates.length,
    rowsDirty: dirty.length,
    rowsUpdated: updatedCount,
    rowsSnapshotted: snapshottedCount,
    rowsSkippedConcurrentEdit: skippedCount,
    // `applied` reflects whether writes actually happened. If every
    // dirty row was skipped by the optimistic lock (concurrent edits),
    // updatedCount is 0 and we report applied=false even though --apply
    // was passed — matches the semantics in the #827 backfill.
    applied: updatedCount > 0,
  }
}

// CLI entrypoint guard so the module can also be imported by a test
// without auto-running.
const invokedUrl = process.argv[1]
  ? pathToFileURL(process.argv[1]).href
  : undefined
if (invokedUrl && import.meta.url === invokedUrl) {
  const apply = process.argv.includes('--apply')
  runBackfill({ apply })
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
