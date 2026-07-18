/**
 * Concert Crawl — one-time user_artist_follows.canonical_name backfill
 * (#763 PR 1, eng spec §4).
 *
 * Migration 0051 adds `canonical_name` with DEFAULT '' — every pre-existing
 * follow row needs canonicalizeArtist(artist_name) written so the Spotify
 * highlighting equality joins (PR 6/7) match manual follows too. Going
 * forward app code writes canonical_name on every insert; this script only
 * covers the historical rows.
 *
 * Canonicalization lives ONLY in JS (@concert-crawl/crawler-core) — this
 * script never re-implements the transform in SQL (Ø/ø parity rule).
 *
 * Usage (after migration 0051 has been applied to the target DB):
 *
 *   Dry run (default — lists planned updates, writes nothing):
 *     DATABASE_URL=... tsx scripts/2026-07-18-follows-canonical-name-backfill.ts
 *
 *   Commit:
 *     DATABASE_URL=... tsx scripts/2026-07-18-follows-canonical-name-backfill.ts --commit
 *
 * Staging first (notify-and-proceed, capture before/after counts), then prod
 * — prod runs require explicit human approval per CLAUDE.md (HARD PAUSE).
 *
 * Idempotent: only rows where canonical_name = '' are selected, and a
 * re-run after commit plans 0 updates (rows whose artist_name legitimately
 * canonicalizes to '' are re-selected but skipped by the planner since
 * stored '' already equals the transform result).
 */

import { pathToFileURL } from 'node:url'
import { eq } from 'drizzle-orm'
import { db, userArtistFollows } from '@concert-crawl/db'
import { planFollowBackfill } from './2026-07-18-spotify-schema-backfill-helpers.js'

export interface BackfillSummary {
  rowsScanned: number
  updatesPlanned: number
  rowsUpdated: number
  committed: boolean
}

export async function runBackfill(opts: {
  commit: boolean
}): Promise<BackfillSummary> {
  // 1. Select the un-backfilled rows (canonical_name still at its '' default).
  const rows = await db
    .select({
      id: userArtistFollows.id,
      artistName: userArtistFollows.artistName,
      canonicalName: userArtistFollows.canonicalName,
    })
    .from(userArtistFollows)
    .where(eq(userArtistFollows.canonicalName, ''))

  // 2. Plan via the pure helper — skips rows already matching the transform.
  const updates = planFollowBackfill(rows)

  console.log(
    `Scanned ${rows.length} follow rows with empty canonical_name; ${updates.length} updates planned.`,
  )

  // Per-row operator log (dry-run and --commit alike).
  const namesById = new Map(rows.map((row) => [row.id, row.artistName]))
  for (const update of updates) {
    console.log(
      `---\nid            = ${update.id}\nartistName    = ${namesById.get(update.id) ?? '(unknown)'}\ncanonicalName = ${update.canonicalName}`,
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

  // 3. --commit path: per-row updates keyed by primary key.
  let updatedCount = 0
  for (const update of updates) {
    await db
      .update(userArtistFollows)
      .set({ canonicalName: update.canonicalName })
      .where(eq(userArtistFollows.id, update.id))
    updatedCount += 1
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
