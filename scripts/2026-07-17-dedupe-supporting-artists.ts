/**
 * Concert Crawl — remove headliner-in-openers from existing events (#643).
 *
 * The 2026-07-17 prod finding: the overnight crawl persisted rows where the
 * headliner also appears in `supporting_artists` — e.g. artist "Vandoliers"
 * with supporting_artists `{Vandoliers, Mya Byrne}`. The consumer surface
 * renders the headliner bold AND again in the "with …" openers line, so the
 * name shows twice.
 *
 * PR #1004 fixed the LLM extractor; this branch fixes the JSON-LD extractor
 * (the path that produced the Vandoliers row) and routes both extractors plus
 * this script through the shared `normalizeSupportingArtists` helper so the
 * rule stays byte-identical everywhere. Fresh/re-crawled rows are now clean at
 * write time; this script cleans historical rows that were persisted before
 * the fix and won't be re-crawled soon (past events, or venues not due for a
 * re-crawl).
 *
 * What it does:
 *   1. Pull every `events` row with a non-empty `supporting_artists` array.
 *   2. For each row: run `normalizeSupportingArtists(artist, supportingArtists)`
 *      — trims each opener, drops blanks, and drops any opener that repeats the
 *      headliner case-insensitively. If the result differs from the stored
 *      array, mark the row dirty.
 *   3. Per-row dry-run output: event id, venue name, title, artist, before /
 *      after arrays so an operator can spot-check.
 *   4. With --commit: UPDATE the dirty rows to their cleaned array.
 *
 * Run:
 *   pnpm tsx scripts/2026-07-17-dedupe-supporting-artists.ts            # dry-run
 *   pnpm tsx scripts/2026-07-17-dedupe-supporting-artists.ts --commit   # writes
 *
 * Against staging/prod set DATABASE_URL accordingly:
 *   DATABASE_URL=$NEON_STAGING_DIRECT pnpm tsx scripts/2026-07-17-dedupe-supporting-artists.ts
 *   DATABASE_URL=$NEON_PROD_DIRECT    pnpm tsx scripts/2026-07-17-dedupe-supporting-artists.ts --commit
 *
 * Idempotent: re-running after --commit is a no-op. The candidate WHERE filter
 * only narrows the scan; the real guarantee is the per-row before/after
 * comparison — an already-clean array falls through `same(cleaned, before)`
 * and is not marked dirty.
 *
 * Read-only by default. Dry-run takes no row-level locks.
 *
 * NOTE — scope: this deliberately only removes the headliner and blank
 * entries. It does NOT attempt to split comma-run-on `artist` values
 * (e.g. "Dylan Earl, The Gray Jays, Johno Leeroy" stored as one artist) —
 * band names can legitimately contain commas, so that class is tracked
 * separately and handled via re-crawl + extractor prompt work, not data
 * surgery.
 */

import { pathToFileURL } from 'node:url'
import { and, eq, isNotNull, sql } from 'drizzle-orm'
import { db, events, venues } from '@concert-crawl/db'
// Relative source import (not package barrel) so this one-shot script runs
// against a clean checkout without requiring a prior
// `pnpm build --filter=@concert-crawl/crawler-core`. tsx resolves the `.js`
// suffix back to the `.ts` source. Mirrors the sibling backfill scripts.
import { normalizeSupportingArtists } from '../packages/crawler-core/src/lib/normalize-supporting-artists.js'

export interface BackfillSummary {
  rowsScanned: number
  rowsDirty: number
  rowsUpdated: number
  // Dirty rows whose supporting_artists changed between the initial SELECT and
  // the optimistic-locked UPDATE — operator should re-run to pick them up.
  rowsSkippedConcurrentEdit: number
  committed: boolean
}

interface DirtyRow {
  id: string
  venueName: string | null
  title: string
  artist: string
  before: string[]
  after: string[]
}

// Order-sensitive array equality. The normalizer never reorders openers, so a
// same-length element-wise compare is sufficient to decide whether a row needs
// a rewrite.
function sameArray(left: readonly string[], right: readonly string[]): boolean {
  if (left.length !== right.length) return false
  return left.every((value, index) => value === right[index])
}

export async function runBackfill(opts: {
  commit: boolean
}): Promise<BackfillSummary> {
  // Candidates: any row that actually has openers. `supporting_artists` is a
  // nullable text[] — null (legacy/pre-recrawl) and empty-array rows have
  // nothing to dedup, so exclude both to keep the scan tight.
  const candidates = await db
    .select({
      id: events.id,
      title: events.title,
      artist: events.artist,
      supportingArtists: events.supportingArtists,
      venueName: venues.name,
    })
    .from(events)
    .leftJoin(venues, eq(events.venueId, venues.id))
    .where(
      and(
        isNotNull(events.supportingArtists),
        sql`array_length(${events.supportingArtists}, 1) > 0`,
      ),
    )

  console.log(`Loaded ${candidates.length} candidate rows from events.`)

  const dirty: DirtyRow[] = []
  for (const row of candidates) {
    if (row.supportingArtists === null) continue
    const cleaned = normalizeSupportingArtists(
      row.artist,
      row.supportingArtists,
    )
    if (sameArray(cleaned, row.supportingArtists)) continue
    dirty.push({
      id: row.id,
      venueName: row.venueName,
      title: row.title,
      artist: row.artist,
      before: row.supportingArtists,
      after: cleaned,
    })
  }

  console.log(`Of those, ${dirty.length} actually need a rewrite.`)

  if (dirty.length === 0) {
    return {
      rowsScanned: candidates.length,
      rowsDirty: 0,
      rowsUpdated: 0,
      rowsSkippedConcurrentEdit: 0,
      // committed=false on no-op early-return paths even if --commit was passed
      // — the summary reflects whether writes actually happened, not the flag.
      committed: false,
    }
  }

  // Per-row operator log (always — both dry-run and --commit). Keeps the
  // dry-run a spot-check audit and the --commit run a before/after record.
  for (const row of dirty) {
    console.log(
      [
        '---',
        `id     = ${row.id}`,
        `venue  = ${row.venueName ?? '(no venue)'}`,
        `title  = ${row.title}`,
        `artist = ${row.artist}`,
        `before = [${row.before.join(', ')}]`,
        `after  = [${row.after.join(', ')}]`,
      ].join('\n'),
    )
  }

  if (!opts.commit) {
    console.log('---')
    console.log(
      `Dry-run mode — no rows touched. Re-run with --commit to apply.`,
    )
    return {
      rowsScanned: candidates.length,
      rowsDirty: dirty.length,
      rowsUpdated: 0,
      rowsSkippedConcurrentEdit: 0,
      committed: false,
    }
  }

  // --commit: one UPDATE per row. Optimistic-lock the WHERE on the original
  // array so a concurrent crawler / admin edit between the SELECT and the
  // UPDATE isn't silently clobbered. If the row's supporting_artists changed
  // in the window, .returning() yields zero rows and we log + skip.
  let updatedCount = 0
  let skippedCount = 0
  for (const row of dirty) {
    const updated = await db
      .update(events)
      .set({ supportingArtists: row.after })
      .where(
        and(eq(events.id, row.id), eq(events.supportingArtists, row.before)),
      )
      .returning({ id: events.id })
    if (updated.length === 0) {
      console.log(
        `Skipped ${row.id} — supporting_artists changed between scan and update`,
      )
      skippedCount += 1
      continue
    }
    updatedCount += 1
  }

  console.log('---')
  console.log(
    `Committed. Updated ${updatedCount} rows. Skipped ${skippedCount} rows (concurrent edit).`,
  )

  return {
    rowsScanned: candidates.length,
    rowsDirty: dirty.length,
    rowsUpdated: updatedCount,
    rowsSkippedConcurrentEdit: skippedCount,
    // `committed` reflects whether writes actually happened.
    committed: updatedCount > 0,
  }
}

// CLI entrypoint guard so the module can also be imported by a test without
// auto-running.
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
