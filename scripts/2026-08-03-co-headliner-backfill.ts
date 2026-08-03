/**
 * One-shot co-headliner backfill (#1203).
 *
 * PR #1416 added `events.headliners` / `events.canonical_headliners` and
 * backfilled every existing row to the single-act default
 * (`headliners = ARRAY[artist]`). That default is correct for the vast
 * majority of rows but wrong for historical bills the LLM extractor
 * flattened — "Desert Dwellers & Great Dane" became one `artist` string with
 * the second real headliner demoted into `supporting_artists`.
 *
 * This script re-reads consumer-visible, non-terminal rows whose `artist`
 * COULD be a co-headline bill (see `isCoHeadlinerCandidate` — a cheap net,
 * not a decision), asks Haiku which acts are actually top-billed, and for
 * rows with 2+ headliners rewrites:
 *   - headliners           (stored `artist` first — invariant, see below)
 *   - canonical_headliners (canonicalizeSupporting(headliners))
 *   - supporting_artists   (promoted co-headliner removed)
 *   - canonical_supporting (recomputed from the trimmed list)
 *
 * Rows the LLM reports as single-headliner are left completely untouched;
 * the migration default is already correct for them.
 *
 * INVARIANTS (hard-won in #1416 review — do not relax):
 *   1. headliners[0] ALWAYS equals the row's stored `artist`, exactly.
 *   2. canonical_headliners is written by canonicalizeSupporting(), which
 *      dedupes, sorts and drops empties. It is SET-LIKE and is NOT
 *      positionally aligned with headliners. Never index into it.
 *   3. NOTHING here splits an artist string on punctuation. "Iron & Wine" is
 *      one act. Only the LLM decides that a bill has more than one headliner.
 *
 * Run:
 *   pnpm tsx scripts/2026-08-03-co-headliner-backfill.ts            # dry-run
 *   pnpm tsx scripts/2026-08-03-co-headliner-backfill.ts --commit   # writes
 *
 * Against staging/prod set DATABASE_URL accordingly.
 */

import { writeFileSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import Anthropic from '@anthropic-ai/sdk'
import { and, eq, sql } from 'drizzle-orm'
// Relative source import (not the package barrel) so this one-shot script runs
// against a clean checkout without requiring a prior
// `pnpm build --filter=@concert-crawl/crawler-core`. tsx resolves the `.js`
// suffix back to the `.ts` source. Mirrors how the non-concert backfill
// imports IS_CONCERT_RULES.
import { canonicalizeSupporting } from '../packages/crawler-core/src/lib/canonical-artist.js'
import { db, events, venues } from '@concert-crawl/db'
// Same reason as canonicalizeSupporting above: the
// `@concert-crawl/db/upcoming-events` subpath resolves to dist, which a clean
// checkout has not built yet.
import {
  SCHEDULED_STATUSES,
  upcomingEventConditions,
} from '../packages/db/src/lib/upcoming-events.js'
import {
  buildBatches,
  buildHeadlinerUpdate,
  formatCsvRow,
  untraceableHeadliners,
  type BatchHeadliners,
  type EventForHeadlinerCheck,
  type HeadlinerResult,
} from './2026-08-03-co-headliner-backfill-helpers.js'

const MODEL = 'claude-haiku-4-5-20251001'
const BATCH_SIZE = 25

export interface BackfillSummary {
  totalCandidates: number
  wouldChange: number
  committed: boolean
  // Rows whose artist/supporting_artists changed between our SELECT and our
  // UPDATE (a concurrent crawl or an admin edit). Only populated in --commit
  // mode. The script does NOT overwrite these — they're surfaced for
  // operator review.
  raceSkipped: string[]
  // Rows where the LLM proposed a headliner traceable to neither the stored
  // artist string nor supporting_artists. Never written, in either mode.
  untraceableRejected: string[]
}

// Main function exported for testability; CLI invocation is at the bottom.
export async function runBackfill(opts: {
  commit: boolean
  outputPath?: string
}): Promise<BackfillSummary> {
  const rows = await db
    .select({
      id: events.id,
      title: events.title,
      artist: events.artist,
      supportingArtists: events.supportingArtists,
      date: events.date,
      venueName: venues.name,
    })
    .from(events)
    .leftJoin(venues, eq(events.venueId, venues.id))
    .where(
      and(
        // The #1212 helper, so this one-shot sees exactly the slice the
        // consumer surfaces see. The date bound is Denver local rather than
        // the process's UTC date: run in the evening, `new Date()` has already
        // rolled over and would skip tonight's shows.
        ...upcomingEventConditions({
          from: sql`(NOW() AT TIME ZONE 'America/Denver')::date`,
          statuses: SCHEDULED_STATUSES,
        }),
        // SQL mirror of isCoHeadlinerCandidate. `\y` is Postgres' word
        // boundary, so "Portland" and "Sandy" are not candidates.
        sql`${events.artist} ~* '(&|\\+|\\yand\\y)'`,
      ),
    )

  const inputs: EventForHeadlinerCheck[] = rows.map((row) => ({
    id: row.id,
    title: row.title,
    artist: row.artist,
    supportingArtists: row.supportingArtists,
    date: row.date,
    venueName: row.venueName ?? '(no venue)',
  }))

  console.log(`Loaded ${inputs.length} co-headliner candidate events`)
  const batches = buildBatches(inputs, BATCH_SIZE)
  console.log(`Split into ${batches.length} batches of up to ${BATCH_SIZE}`)

  const results: HeadlinerResult[] = []
  const untraceableRejected: string[] = []
  const client = new Anthropic()

  for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
    const batch = batches[batchIdx]
    if (!batch) continue
    console.log(
      `Identifying headliners for batch ${batchIdx + 1}/${batches.length}...`,
    )
    const identified = await identifyHeadlinersBatch(client, batch)
    for (const evt of batch) {
      const match = identified.find((entry) => entry.eventId === evt.id)
      if (!match) {
        console.error(
          `MISSING headliner result for event ${evt.id} (${evt.title}); aborting before any DB write`,
        )
        throw new Error(`Headliner result missing for event ${evt.id}`)
      }
      const update = buildHeadlinerUpdate(
        evt.artist,
        match.headliners,
        evt.supportingArtists,
      )
      const untraceable = untraceableHeadliners(
        evt.artist,
        evt.supportingArtists,
        update.headliners,
      )
      if (untraceable.length > 0) {
        console.error(
          `REJECTED event ${evt.id} (${evt.title}): headliner(s) ${untraceable.join(', ')} appear in neither the stored artist nor supporting_artists`,
        )
        untraceableRejected.push(evt.id)
        continue
      }
      results.push({
        eventId: evt.id,
        title: evt.title,
        artist: evt.artist,
        date: evt.date,
        venueName: evt.venueName,
        currentSupporting: evt.supportingArtists,
        proposedHeadliners: update.headliners,
        proposedSupporting: update.supportingArtists,
        wouldChange: update.wouldChange,
      })
    }
  }

  const wouldChangeCount = results.filter((row) => row.wouldChange).length
  console.log(
    `Identification done. ${wouldChangeCount}/${results.length} candidate events are genuine co-headline bills.`,
  )
  if (untraceableRejected.length > 0) {
    console.warn(
      `Rejected ${untraceableRejected.length} rows whose proposed headliners were not traceable to stored text (see REJECTED lines above).`,
    )
  }

  // Sort: wouldChange first, then by date so an operator reviews the
  // actionable rows at the top of the file.
  results.sort((firstRow, secondRow) => {
    if (firstRow.wouldChange !== secondRow.wouldChange) {
      return firstRow.wouldChange ? -1 : 1
    }
    return firstRow.date.localeCompare(secondRow.date)
  })

  const header =
    'event_id,date,venue_name,title,current_artist,current_supporting_artists,proposed_headliners,would_change\n'
  const csv = header + results.map(formatCsvRow).join('')

  if (!opts.commit) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const outPath =
      opts.outputPath ??
      path.resolve(`./co-headliner-backfill-dry-run-${timestamp}.csv`)
    writeFileSync(outPath, csv, 'utf-8')
    console.log(`Dry-run CSV written to ${outPath}`)
    return {
      totalCandidates: results.length,
      wouldChange: wouldChangeCount,
      committed: false,
      raceSkipped: [],
      untraceableRejected,
    }
  }

  // --commit path: transactionally rewrite every genuine co-headline row,
  // optimistic-locking each UPDATE on the previously-observed `artist` AND
  // `supporting_artists` so a concurrent crawl upsert or an admin edit
  // between our SELECT and our UPDATE isn't silently overwritten.
  // Race-skipped rows are surfaced for operator review, never swallowed.
  const toUpdate = results.filter((row) => row.wouldChange)
  console.log(`Committing ${toUpdate.length} updates...`)
  const raceSkipped: string[] = []
  await db.transaction(async (tx) => {
    for (const row of toUpdate) {
      const updated = await tx
        .update(events)
        .set({
          headliners: row.proposedHeadliners,
          // Set-like companion, written through the same canonicalizer the
          // crawler uses. Any path that writes headliners MUST write this.
          canonicalHeadliners: canonicalizeSupporting(row.proposedHeadliners),
          supportingArtists: row.proposedSupporting,
          canonicalSupporting: canonicalizeSupporting(row.proposedSupporting),
          // Bumped so the rewrite surfaces in recently-changed admin views
          // rather than looking like a row nobody has touched since its crawl.
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(events.id, row.eventId),
            eq(events.artist, row.artist),
            sql`${events.supportingArtists} IS NOT DISTINCT FROM ${row.currentSupporting}::text[]`,
          ),
        )
        .returning({ id: events.id })
      if (updated.length === 0) {
        raceSkipped.push(row.eventId)
      }
    }
  })
  const updatedCount = toUpdate.length - raceSkipped.length
  console.log(`Commit done. Updated ${updatedCount} rows.`)
  if (raceSkipped.length > 0) {
    console.warn(
      `Skipped ${raceSkipped.length} rows whose artist/supporting_artists changed between SELECT and UPDATE (concurrent crawl / admin edit). Event IDs:`,
    )
    for (const id of raceSkipped) {
      console.warn(`  ${id}`)
    }
  }
  return {
    totalCandidates: results.length,
    wouldChange: wouldChangeCount,
    committed: true,
    raceSkipped,
    untraceableRejected,
  }
}

const HEADLINER_TOOL_NAME = 'identify_headliners'

export const HEADLINER_RULES = `A HEADLINER is an act with top billing on the show. Return the ordered list of headliners for each event.

Rules:
- A band whose registered name contains "&", "+", or "and" is ONE act. NEVER split it.
  "Iron & Wine" is one headliner. "Hall & Oates" is one headliner.
  "Florence + the Machine" is one headliner. "Earth, Wind & Fire" is one headliner.
- Return more than one headliner ONLY when the bill genuinely presents two or more
  acts as co-equal top billing — an "A & B" co-headline tour, a split bill, or a
  dual-room night. When in doubt, return a single headliner.
- Opening and supporting acts must NOT appear in the headliner list. The supporting
  acts already recorded for the event are given to you so you can exclude them —
  unless one of them is in fact a co-equal headliner that was mis-filed.
- Use the exact spelling as it appears in the event's artist or supporting acts.
- Return one entry for EVERY event id given. Omitting an event is an error.`

// Exported for test coverage (mocks @anthropic-ai/sdk; covers response shape
// edge cases the dry-run CSV can't surface).
export async function identifyHeadlinersBatch(
  client: Anthropic,
  batch: EventForHeadlinerCheck[],
): Promise<BatchHeadliners[]> {
  const tool: Anthropic.Tool = {
    name: HEADLINER_TOOL_NAME,
    description: 'Return the ordered list of headliners for each event',
    input_schema: {
      type: 'object' as const,
      properties: {
        results: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              eventId: { type: 'string' },
              headliners: { type: 'array', items: { type: 'string' } },
            },
            required: ['eventId', 'headliners'],
          },
        },
      },
      required: ['results'],
    },
  }

  const eventList = batch
    .map(
      (evt) =>
        `- id: ${evt.id}\n  title: ${evt.title}\n  artist: ${evt.artist}\n  supporting acts: ${
          evt.supportingArtists && evt.supportingArtists.length > 0
            ? evt.supportingArtists.join(' | ')
            : '(none)'
        }\n  date: ${evt.date}\n  venue: ${evt.venueName}`,
    )
    .join('\n\n')

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 8192,
    tools: [tool],
    tool_choice: { type: 'tool', name: HEADLINER_TOOL_NAME },
    messages: [
      {
        role: 'user',
        content: `Identify the headliners for each event below.

${HEADLINER_RULES}

Events:
${eventList}`,
      },
    ],
  })

  // Find a tool_use block AND verify it's our identify_headliners tool.
  // Forcing tool_choice constrains the response today, but a name check is
  // cheap insurance against a future schema where additional tools could be
  // invoked (or a Haiku regression that ignores tool_choice).
  const toolUseBlock = response.content.find(
    (blk) => blk.type === 'tool_use' && blk.name === HEADLINER_TOOL_NAME,
  )
  if (!toolUseBlock || toolUseBlock.type !== 'tool_use') {
    throw new Error(
      `LLM did not return a ${HEADLINER_TOOL_NAME} tool_use block`,
    )
  }
  const inputRaw = toolUseBlock.input
  if (typeof inputRaw !== 'object' || inputRaw === null) {
    throw new Error('LLM tool_use input was not an object')
  }
  const resultsField = 'results' in inputRaw ? inputRaw.results : undefined
  if (!Array.isArray(resultsField)) {
    throw new Error('LLM tool_use input.results was not an array')
  }
  return resultsField.map((entry: unknown): BatchHeadliners => {
    if (
      typeof entry !== 'object' ||
      entry === null ||
      !('eventId' in entry) ||
      !('headliners' in entry)
    ) {
      throw new Error(`Malformed headliner entry: ${JSON.stringify(entry)}`)
    }
    const { eventId, headliners } = entry
    if (typeof eventId !== 'string') {
      throw new Error(
        `Headliner entry has wrong types: ${JSON.stringify(entry)}`,
      )
    }
    if (
      !Array.isArray(headliners) ||
      headliners.some((name) => typeof name !== 'string')
    ) {
      throw new Error(
        `Headliner entry has wrong types: ${JSON.stringify(entry)}`,
      )
    }
    const names: string[] = headliners.filter(
      (name): name is string => typeof name === 'string',
    )
    return { eventId, headliners: names }
  })
}

// CLI entry point — only runs when file is executed directly (not imported).
// Use pathToFileURL to handle relative paths, special chars, and
// platform-specific URL encoding correctly (process.argv[1] is not guaranteed
// to be a clean absolute URL-safe path).
const entryArg = process.argv[1]
const isCli =
  typeof entryArg === 'string' &&
  import.meta.url === pathToFileURL(entryArg).href
if (isCli) {
  const commit = process.argv.includes('--commit')
  runBackfill({ commit })
    .then((summary) => {
      console.log(
        `Done. ${summary.totalCandidates} candidates processed, ${summary.wouldChange} co-headline bills, committed=${summary.committed}`,
      )
      process.exit(0)
    })
    .catch((err: unknown) => {
      console.error('Backfill failed:', err)
      process.exit(1)
    })
}
