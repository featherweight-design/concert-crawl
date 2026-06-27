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
 * What it does:
 *   1. SELECT every `events` row whose `title` matches the duplicated-
 *      trailing-word pattern in Postgres (`~*` for case-insensitive
 *      regex, with `[[:<:]]` / `[[:>:]]` word-boundary anchors).
 *   2. For each candidate, recompute the cleaned title in JS via the
 *      same `stripDuplicatedTrailingWord` helper the extractor now uses,
 *      so the SQL filter and the runtime fix can never drift.
 *   3. Per-row dry-run output: event id, venue name, date, current
 *      title, proposed cleaned title — for operator spot-check.
 *   4. With --apply: snapshot dirty rows to `events_851_backup` (created
 *      if missing) so a 7-day rollback is one DELETE+INSERT away, then
 *      UPDATE the live rows.
 *
 * Run:
 *   pnpm tsx scripts/2026-06-27-extractor-dedup-suffix-scan.ts           # dry-run
 *   pnpm tsx scripts/2026-06-27-extractor-dedup-suffix-scan.ts --apply   # writes
 *
 * Against staging/prod set DATABASE_URL accordingly (e.g.
 * `DATABASE_URL=$NEON_STAGING_DIRECT pnpm tsx scripts/...`).
 *
 * Idempotent. Re-running after --apply is a no-op: a previously-cleaned
 * row no longer matches the candidate filter, and any row that survives
 * the filter but is unchanged by the JS helper falls through the
 * `cleaned === row.title` short-circuit.
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
  // Postgres-side filter: trailing duplicated word, case-insensitive,
  // separated by whitespace only. `[[:<:]]` / `[[:>:]]` are POSIX word-
  // boundary anchors (the regex equivalent of `\b` in JS). `(\w+)`
  // captures the word; `\s+\1` requires it to repeat after whitespace;
  // `\s*$` anchors at end-of-string with optional trailing whitespace,
  // mirroring the JS regex in strip-duplicated-trailing-word.ts.
  const candidates = await db
    .select({
      id: events.id,
      title: events.title,
      date: events.date,
      venueName: venues.name,
    })
    .from(events)
    .leftJoin(venues, eq(events.venueId, venues.id))
    .where(sql`${events.title} ~* '[[:<:]](\w+)[[:>:]]\s+\1\s*$'`)

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
  // Per-row INSERTs match the per-row UPDATE granularity so a transient
  // failure mid-batch leaves the snapshot and the live table consistent
  // with each other.
  await db.execute(
    sql`CREATE TABLE IF NOT EXISTS events_851_backup (
      event_id uuid NOT NULL,
      title_before text NOT NULL,
      title_after text NOT NULL,
      snapshotted_at timestamptz NOT NULL DEFAULT now()
    )`,
  )

  // Optimistic-lock the UPDATE on the original title so a concurrent
  // crawler / admin edit between the initial SELECT and the UPDATE
  // doesn't get silently clobbered. If the row's title changed in the
  // window, .returning() yields zero rows and we log + skip rather than
  // overwriting fresher content (mirrors the pattern used by the #827
  // strip-description-html backfill).
  let updatedCount = 0
  let snapshottedCount = 0
  let skippedCount = 0
  for (const row of dirty) {
    await db.execute(
      sql`INSERT INTO events_851_backup (event_id, title_before, title_after)
          VALUES (${row.id}, ${row.before}, ${row.after})`,
    )
    snapshottedCount += 1

    const updated = await db
      .update(events)
      .set({ title: row.after })
      .where(and(eq(events.id, row.id), eq(events.title, row.before)))
      .returning({ id: events.id })
    if (updated.length === 0) {
      console.log(`Skipped ${row.id} — title changed between scan and update`)
      skippedCount += 1
      continue
    }
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
