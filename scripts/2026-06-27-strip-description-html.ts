/**
 * Concert Crawl — strip HTML from event descriptions (#827).
 *
 * The 2026-06-26 prod incident: event detail pages rendered raw `<p>`
 * tags as visible text. RHP-CMS-backed venue feeds (Gothic Theatre via
 * the AEG shard, schema.org JSON-LD on several sites, occasional
 * LLM passthrough) shipped descriptions wrapped in `<p>` markup that
 * landed verbatim in `events.description`. The consumer surface renders
 * description as plain text (the safe default — never inject untrusted
 * HTML), so the markup leaked through as literal tag text.
 *
 * The forward fix in this PR strips HTML at extraction time in all three
 * extractors (LLM, JSON-LD, AEG). This script applies the same helper to
 * historical rows already in the DB.
 *
 * What it does:
 *   1. Pull every `events` row whose `description` contains either an
 *      HTML tag (`</?` followed by a letter) or an HTML entity (`&NAME;`
 *      / `&#DDDD;`). The filter deliberately excludes bare `&` so
 *      legitimate text like "Band & Friends" doesn't widen the
 *      candidate set (#844 Copilot R1).
 *   2. For each row: run `stripDescriptionHtml`. If the cleaned output
 *      differs from the current value, mark it dirty.
 *   3. Per-row dry-run output: event id, venue name, title, before/after
 *      preview (first ~120 chars each) so an operator can spot-check.
 *   4. With --commit: UPDATE the dirty rows to their cleaned value.
 *
 * Run:
 *   pnpm tsx scripts/2026-06-27-strip-description-html.ts            # dry-run
 *   pnpm tsx scripts/2026-06-27-strip-description-html.ts --commit   # writes
 *
 * Against staging/prod set DATABASE_URL accordingly.
 *
 * Idempotent: re-running after --commit is a no-op — the cleaned rows
 * have no known HTML tags and no entity-shaped substrings, so they fail
 * the WHERE filter on subsequent runs.
 *
 * Read-only by default. Dry-run takes no row-level locks.
 */

import { pathToFileURL } from 'node:url'
import { eq, sql } from 'drizzle-orm'
import { db, events, venues } from '@concert-crawl/db'
// Relative source import (not package barrel) so this one-shot script
// runs against a clean checkout without requiring a prior
// `pnpm build --filter=@concert-crawl/crawler-core`. tsx resolves the
// `.js` suffix back to the `.ts` source.
import { stripDescriptionHtml } from '../packages/crawler-core/src/lib/strip-description-html.js'

export interface BackfillSummary {
  rowsScanned: number
  rowsDirty: number
  rowsUpdated: number
  committed: boolean
}

interface DirtyRow {
  id: string
  venueName: string | null
  title: string
  before: string
  after: string
}

// First ~120 chars of a value for operator dry-run readability. Strips
// trailing newlines to keep each row a tidy single line in the log.
function preview(value: string): string {
  const oneLine = value.replace(/\n+/g, ' ⏎ ')
  if (oneLine.length <= 120) return oneLine
  return `${oneLine.slice(0, 117)}...`
}

export async function runBackfill(opts: {
  commit: boolean
}): Promise<BackfillSummary> {
  // Pull candidates: descriptions that look like they might contain HTML
  // markup or numeric entities. The tag filter matches `</?` followed by
  // a letter (catches `<p>`, `<br>`, `<div>`, `</span>`, …) but skips
  // plain text like "<3" or "<-arrow". The entity filter requires `&`
  // to be followed by alphanumerics + a semicolon, so legitimate text
  // like "Band & Friends" doesn't widen the candidate set (#844 Copilot
  // R1). The JS-side `stripDescriptionHtml` then decides per-row whether
  // the candidate is actually dirty.
  const candidates = await db
    .select({
      id: events.id,
      title: events.title,
      description: events.description,
      venueName: venues.name,
    })
    .from(events)
    .leftJoin(venues, eq(events.venueId, venues.id))
    .where(
      sql`${events.description} ~* '</?[a-z]' OR ${events.description} ~ '&[a-zA-Z]+;' OR ${events.description} ~ '&#[0-9a-fA-F]+;'`,
    )

  console.log(`Loaded ${candidates.length} candidate rows from events.`)

  const dirty: DirtyRow[] = []
  for (const row of candidates) {
    if (row.description === null) continue
    const cleaned = stripDescriptionHtml(row.description)
    if (cleaned === row.description) continue
    dirty.push({
      id: row.id,
      venueName: row.venueName,
      title: row.title,
      before: row.description,
      after: cleaned,
    })
  }

  console.log(`Of those, ${dirty.length} actually need a rewrite.`)

  if (dirty.length === 0) {
    return {
      rowsScanned: candidates.length,
      rowsDirty: 0,
      rowsUpdated: 0,
      // committed=false on no-op early-return paths even if --commit was
      // passed — the summary reflects whether writes actually happened,
      // not the flag the operator set.
      committed: false,
    }
  }

  // Per-row operator log (always — both dry-run and --commit). Keeps the
  // dry-run useful as a spot-check audit and the --commit run as a
  // before/after record for incident review.
  for (const row of dirty) {
    console.log(
      [
        '---',
        `id     = ${row.id}`,
        `venue  = ${row.venueName ?? '(no venue)'}`,
        `title  = ${row.title}`,
        `before = ${preview(row.before)}`,
        `after  = ${preview(row.after)}`,
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
      committed: false,
    }
  }

  // --commit: one UPDATE per row. Per-row writes (vs. a single
  // multi-row CASE WHEN) keep the log line up at the same granularity
  // as the dry-run and let a transient failure mid-batch stop the run
  // cleanly without leaving the audit log out of sync with the DB.
  let updatedCount = 0
  for (const row of dirty) {
    await db
      .update(events)
      .set({ description: row.after })
      .where(eq(events.id, row.id))
    updatedCount += 1
  }

  console.log('---')
  console.log(`Committed. Updated ${updatedCount} rows.`)

  return {
    rowsScanned: candidates.length,
    rowsDirty: dirty.length,
    rowsUpdated: updatedCount,
    committed: true,
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
