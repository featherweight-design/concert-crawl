/**
 * Concert Crawl — one-time events.canonical_supporting backfill
 * (#763 PR 1, eng spec §4).
 *
 * Migration 0053 adds nullable `canonical_supporting` text[]; the crawler
 * now writes it in lock-step with `supporting_artists` on every upsert.
 * This script covers the historical rows: every event with a non-NULL
 * supporting_artists but a still-NULL canonical_supporting gets
 * canonicalizeSupporting(supporting_artists) written (canonicalized,
 * deduped, ''-filtered).
 *
 * Canonicalization lives ONLY in JS (@concert-crawl/crawler-core) — this
 * script never re-implements the transform in SQL (Ø/ø parity rule).
 *
 * Usage (after migration 0053 has been applied to the target DB):
 *
 *   Dry run (default — lists planned updates, writes nothing):
 *     DATABASE_URL=... tsx scripts/2026-07-18-events-canonical-supporting-backfill.ts
 *
 *   Commit:
 *     DATABASE_URL=... tsx scripts/2026-07-18-events-canonical-supporting-backfill.ts --commit
 *
 * Staging first (notify-and-proceed, capture before/after counts), then prod
 * — prod runs require explicit human approval per CLAUDE.md (HARD PAUSE).
 *
 * Idempotent: only rows where canonical_supporting IS NULL are selected, and
 * the write always produces a non-NULL array (possibly []), so a re-run
 * plans 0 updates. Rows the crawler has already touched post-0053 are
 * skipped for the same reason — the script never fights fresher crawler
 * writes.
 */

import { pathToFileURL } from 'node:url'
import { and, eq, isNotNull, isNull } from 'drizzle-orm'
import { db, events } from '@concert-crawl/db'
import { planSupportingBackfill } from './2026-07-18-spotify-schema-backfill-helpers.js'

export interface BackfillSummary {
  rowsScanned: number
  updatesPlanned: number
  rowsUpdated: number
  committed: boolean
}

export async function runBackfill(opts: {
  commit: boolean
}): Promise<BackfillSummary> {
  // 1. Select the un-backfilled rows: supporting_artists written by the
  //    crawler, canonical_supporting never populated.
  const rows = await db
    .select({
      id: events.id,
      supportingArtists: events.supportingArtists,
      canonicalSupporting: events.canonicalSupporting,
    })
    .from(events)
    .where(
      and(
        isNotNull(events.supportingArtists),
        isNull(events.canonicalSupporting),
      ),
    )

  // 2. Plan via the pure helper.
  const updates = planSupportingBackfill(rows)

  console.log(
    `Scanned ${rows.length} events with supporting_artists and NULL canonical_supporting; ${updates.length} updates planned.`,
  )

  // Per-row operator log (dry-run and --commit alike).
  const supportingById = new Map(
    rows.map((row) => [row.id, row.supportingArtists]),
  )
  for (const update of updates) {
    console.log(
      `---\nid                  = ${update.id}\nsupportingArtists   = ${JSON.stringify(supportingById.get(update.id))}\ncanonicalSupporting = ${JSON.stringify(update.canonicalSupporting)}`,
    )
  }

  if (updates.length === 0 || !opts.commit) {
    if (!opts.commit) {
      console.log('---')
      console.log(
        'Dry-run mode — no rows written. Re-run with --commit to apply.',
      )
    }
    return {
      rowsScanned: rows.length,
      updatesPlanned: updates.length,
      rowsUpdated: 0,
      // Sibling-script convention: committed reflects commit-mode
      // invocation, not whether any rows changed.
      committed: opts.commit,
    }
  }

  // 3. --commit path: per-row updates keyed by primary key, with an
  //    optimistic IS NULL re-check so a crawler write landing between the
  //    scan and this update is never clobbered.
  let updatedCount = 0
  for (const update of updates) {
    const updated = await db
      .update(events)
      .set({ canonicalSupporting: update.canonicalSupporting })
      .where(and(eq(events.id, update.id), isNull(events.canonicalSupporting)))
      .returning({ id: events.id })
    if (updated.length > 0) {
      updatedCount += 1
    } else {
      console.log(
        `Skipped ${update.id} — canonical_supporting written since scan`,
      )
    }
  }

  console.log('---')
  console.log(`Committed. Updated ${updatedCount} rows.`)

  return {
    rowsScanned: rows.length,
    updatesPlanned: updates.length,
    rowsUpdated: updatedCount,
    committed: true,
  }
}

// CLI entrypoint guard so the module can be imported by a test without
// auto-running — same shape as the sibling scripts.
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
