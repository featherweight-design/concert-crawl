/**
 * Concert Crawl — decode HTML entities in event titles (#1338).
 *
 * Cervantes' feed serves entity-encoded headlines (`&amp;`, `&#8217;`,
 * `&#8211;`) that reached `events.title` verbatim and rendered as literal
 * `&#8217;` to consumers. `description` has decoded at the extractor seam
 * since #827; titles had no equivalent pass until the forward fix in this
 * PR, which decodes `title` / `rawTitle` in crawl.ts before anything reads
 * them. This script applies the same decode to rows already in the DB.
 *
 * Run:
 *   pnpm tsx scripts/2026-08-02-decode-title-entities.ts            # dry-run
 *   pnpm tsx scripts/2026-08-02-decode-title-entities.ts --commit   # writes
 *
 * Against staging/prod set DATABASE_URL accordingly.
 *
 * Idempotent: the candidate WHERE narrows the scan, but the guarantee comes
 * from the per-row before/after comparison — a title that still contains an
 * `&word;` token after decoding (an unknown entity the decoder preserves on
 * purpose) survives the filter on a re-run, compares equal, and is not
 * marked dirty.
 *
 * Writes `canonical_title` alongside `title`. crawl.ts's upsert treats the
 * two as a pair — canonical_title is the display/search projection of title
 * — so updating one without the other would desync the search index from
 * what the row actually shows.
 */

import { pathToFileURL } from 'node:url'
import { and, eq, sql } from 'drizzle-orm'
import { db, events, venues } from '@concert-crawl/db'
// Relative source import (not the package barrel) so this one-shot runs
// against a clean checkout without a prior crawler-core build. tsx resolves
// the `.js` suffix back to the `.ts` source.
import { decodeHtmlEntities } from '../packages/crawler-core/src/lib/strip-description-html.js'
import { canonicalizeTitle } from '../packages/crawler-core/src/lib/canonical-title.js'

export interface DecodeSummary {
  rowsScanned: number
  rowsDirty: number
  rowsUpdated: number
  // Dirty rows whose title changed between the SELECT and the
  // optimistic-locked UPDATE — re-run to pick them up if still dirty.
  rowsSkippedConcurrentEdit: number
  committed: boolean
}

interface DirtyRow {
  id: string
  venueName: string | null
  before: string
  after: string
}

export const runDecode = async (opts: {
  commit: boolean
}): Promise<DecodeSummary> => {
  // Require `&` to be followed by alphanumerics + a semicolon so legitimate
  // text like "Band & Friends" doesn't widen the candidate set.
  const candidates = await db
    .select({
      id: events.id,
      title: events.title,
      venueName: venues.name,
    })
    .from(events)
    .leftJoin(venues, eq(events.venueId, venues.id))
    .where(
      sql`${events.title} ~ '&[a-zA-Z]+;' OR ${events.title} ~* '&#x?[0-9a-fA-F]+;'`,
    )

  console.warn(`Loaded ${candidates.length} candidate rows from events.`)

  const dirty: DirtyRow[] = []
  for (const row of candidates) {
    const decoded = decodeHtmlEntities(row.title)
    if (decoded === row.title) continue
    dirty.push({
      id: row.id,
      venueName: row.venueName,
      before: row.title,
      after: decoded,
    })
  }

  console.warn(`Of those, ${dirty.length} actually need a rewrite.`)

  // Per-row operator log in both modes — the dry-run is a spot-check audit,
  // the --commit run is the before/after record.
  for (const row of dirty) {
    console.warn(
      [
        '---',
        `id     = ${row.id}`,
        `venue  = ${row.venueName ?? '(no venue)'}`,
        `before = ${row.before}`,
        `after  = ${row.after}`,
      ].join('\n'),
    )
  }

  if (!opts.commit) {
    console.warn('---')
    console.warn('Dry-run — nothing written. Re-run with --commit to apply.')
    return {
      rowsScanned: candidates.length,
      rowsDirty: dirty.length,
      rowsUpdated: 0,
      rowsSkippedConcurrentEdit: 0,
      committed: false,
    }
  }

  // Optimistic-lock on the original title so a concurrent crawl between the
  // SELECT and the UPDATE doesn't get clobbered.
  let updatedCount = 0
  let skippedCount = 0
  for (const row of dirty) {
    const updated = await db
      .update(events)
      .set({ title: row.after, canonicalTitle: canonicalizeTitle(row.after) })
      .where(and(eq(events.id, row.id), eq(events.title, row.before)))
      .returning({ id: events.id })
    if (updated.length === 0) {
      console.warn(`Skipped ${row.id} — title changed between scan and update`)
      skippedCount += 1
      continue
    }
    updatedCount += 1
  }

  console.warn('---')
  console.warn(
    `Committed. Updated ${updatedCount} rows. Skipped ${skippedCount} (concurrent edit).`,
  )

  return {
    rowsScanned: candidates.length,
    rowsDirty: dirty.length,
    rowsUpdated: updatedCount,
    rowsSkippedConcurrentEdit: skippedCount,
    // Reflects whether writes actually happened, not the flag that was
    // passed — matches the shape of the #844 backfill.
    committed: updatedCount > 0,
  }
}

const invokedUrl = process.argv[1]
  ? pathToFileURL(process.argv[1]).href
  : undefined
if (invokedUrl && import.meta.url === invokedUrl) {
  const commit = process.argv.includes('--commit')
  runDecode({ commit })
    .then((summary) => {
      console.warn('---')
      console.warn(JSON.stringify(summary, null, 2))
      process.exit(0)
    })
    .catch((err) => {
      console.error('Title decode failed:', err)
      process.exit(1)
    })
}
