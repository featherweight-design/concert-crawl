/**
 * One-shot non-concert auto-classification backfill (#696).
 *
 * Reads non-terminal events from the DB (status in {upcoming, cancelled,
 * postponed} AND date >= today — the same statuses the consumer
 * /v1/events endpoint serves), sends them through Haiku in batches,
 * compares the LLM's isConcert classification against the current
 * hidden_from_consumer value, and either:
 *   - Default: writes a dry-run CSV to ./non-concert-backfill-dry-run-<ts>.csv
 *   - With --commit: updates hidden_from_consumer in a transaction
 *     (optimistic-locks each row on its previously-observed currentHidden
 *     value so admin edits between SELECT and UPDATE aren't overwritten)
 *
 * Run:
 *   pnpm tsx scripts/2026-06-19-non-concert-backfill.ts            # dry-run
 *   pnpm tsx scripts/2026-06-19-non-concert-backfill.ts --commit   # writes
 *
 * Against staging/prod set DATABASE_URL accordingly.
 *
 * Idempotent: re-running with same inputs produces same classifications
 * (modulo LLM nondeterminism — binary classification on clear examples
 * should be stable across runs).
 */

import { writeFileSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import Anthropic from '@anthropic-ai/sdk'
import { and, eq, gte, inArray } from 'drizzle-orm'
// Relative source import (not package barrel) so this one-shot script
// runs against a clean checkout without requiring a prior
// `pnpm build --filter=@concert-crawl/crawler-core`. tsx resolves the
// `.js` suffix back to the `.ts` source. The package's `index.ts` still
// re-exports IS_CONCERT_RULES for normal workspace consumers.
import { IS_CONCERT_RULES } from '../packages/crawler-core/src/lib/extractors/llm.js'
import { db, events, venues } from '@concert-crawl/db'
import {
  buildBatches,
  formatCsvRow,
  type BatchClassification,
  type ClassificationResult,
  type EventForClassification,
} from './2026-06-19-non-concert-backfill-helpers.js'

const MODEL = 'claude-haiku-4-5-20251001'
const BATCH_SIZE = 25

export interface BackfillSummary {
  totalEvents: number
  wouldChange: number
  committed: boolean
  // Rows whose hidden_from_consumer changed between our SELECT and
  // our UPDATE (admin or another operator). Only populated in --commit
  // mode. The script does NOT overwrite these — they're surfaced for
  // operator review.
  raceSkipped: string[]
}

// Main function exported for testability; CLI invocation is at the bottom.
export async function runBackfill(opts: {
  commit: boolean
  outputPath?: string
}): Promise<BackfillSummary> {
  const today = new Date().toISOString().slice(0, 10)
  const rows = await db
    .select({
      id: events.id,
      title: events.title,
      artist: events.artist,
      description: events.description,
      date: events.date,
      venueName: venues.name,
      currentHidden: events.hiddenFromConsumer,
    })
    .from(events)
    .leftJoin(venues, eq(events.venueId, venues.id))
    .where(
      and(
        inArray(events.status, ['upcoming', 'cancelled', 'postponed']),
        gte(events.date, today),
      ),
    )

  const inputs: EventForClassification[] = rows.map((row) => ({
    id: row.id,
    title: row.title,
    artist: row.artist,
    description: row.description,
    date: row.date,
    venueName: row.venueName ?? '(no venue)',
    currentHidden: row.currentHidden,
  }))

  console.log(`Loaded ${inputs.length} events for classification`)
  const batches = buildBatches(inputs, BATCH_SIZE)
  console.log(`Split into ${batches.length} batches of ${BATCH_SIZE}`)

  const results: ClassificationResult[] = []
  const client = new Anthropic()

  for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
    const batch = batches[batchIdx]
    if (!batch) continue
    console.log(`Classifying batch ${batchIdx + 1}/${batches.length}...`)
    const classifications = await classifyBatch(client, batch)
    for (const evt of batch) {
      const result = classifications.find((cls) => cls.eventId === evt.id)
      if (!result) {
        console.error(
          `MISSING classification for event ${evt.id} (${evt.title}); aborting before any DB write`,
        )
        throw new Error(`Classification missing for event ${evt.id}`)
      }
      const llmIsConcert = result.isConcert
      results.push({
        eventId: evt.id,
        title: evt.title,
        artist: evt.artist,
        date: evt.date,
        venueName: evt.venueName,
        currentHidden: evt.currentHidden,
        llmIsConcert,
        wouldChange: evt.currentHidden !== !llmIsConcert,
      })
    }
  }

  const wouldChangeCount = results.filter((row) => row.wouldChange).length
  console.log(
    `Classification done. ${wouldChangeCount}/${results.length} events would change hidden_from_consumer.`,
  )

  // Sort: wouldChange first (desc), then by title alphabetical
  results.sort((firstRow, secondRow) => {
    if (firstRow.wouldChange !== secondRow.wouldChange) {
      return firstRow.wouldChange ? -1 : 1
    }
    return firstRow.title.localeCompare(secondRow.title)
  })

  const header =
    'event_id,title,artist,date,venue_name,current_hidden,llm_is_concert,would_change\n'
  const csv = header + results.map(formatCsvRow).join('')

  if (!opts.commit) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const outPath =
      opts.outputPath ??
      path.resolve(`./non-concert-backfill-dry-run-${timestamp}.csv`)
    writeFileSync(outPath, csv, 'utf-8')
    console.log(`Dry-run CSV written to ${outPath}`)
    return {
      totalEvents: results.length,
      wouldChange: wouldChangeCount,
      committed: false,
      raceSkipped: [],
    }
  }

  // --commit path: transactionally update every row that would change,
  // optimistic-locking each UPDATE on the previously-observed
  // currentHidden so an admin edit between our SELECT and UPDATE
  // doesn't get silently overwritten. Race-skipped rows are surfaced
  // in the summary for operator review.
  const toUpdate = results.filter((row) => row.wouldChange)
  console.log(`Committing ${toUpdate.length} updates...`)
  const raceSkipped: string[] = []
  await db.transaction(async (tx) => {
    for (const row of toUpdate) {
      const updated = await tx
        .update(events)
        .set({ hiddenFromConsumer: !row.llmIsConcert })
        .where(
          and(
            eq(events.id, row.eventId),
            eq(events.hiddenFromConsumer, row.currentHidden),
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
      `Skipped ${raceSkipped.length} rows whose hidden_from_consumer changed between SELECT and UPDATE (admin edit / concurrent run). Event IDs:`,
    )
    for (const id of raceSkipped) {
      console.warn(`  ${id}`)
    }
  }
  return {
    totalEvents: results.length,
    wouldChange: wouldChangeCount,
    committed: true,
    raceSkipped,
  }
}

const CLASSIFY_TOOL_NAME = 'classify_events'

// Exported for test coverage (mocks @anthropic-ai/sdk; covers response
// shape edge cases the dry-run CSV can't surface).
export async function classifyBatch(
  client: Anthropic,
  batch: EventForClassification[],
): Promise<BatchClassification[]> {
  const tool: Anthropic.Tool = {
    name: CLASSIFY_TOOL_NAME,
    description: 'Classify each event as concert (true) or non-concert (false)',
    input_schema: {
      type: 'object' as const,
      properties: {
        classifications: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              eventId: { type: 'string' },
              isConcert: { type: 'boolean' },
            },
            required: ['eventId', 'isConcert'],
          },
        },
      },
      required: ['classifications'],
    },
  }

  const eventList = batch
    .map(
      (evt) =>
        `- id: ${evt.id}\n  title: ${evt.title}\n  artist: ${evt.artist}\n  date: ${evt.date}\n  venue: ${evt.venueName}${evt.description ? `\n  description: ${evt.description}` : ''}`,
    )
    .join('\n\n')

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 8192,
    tools: [tool],
    tool_choice: { type: 'tool', name: CLASSIFY_TOOL_NAME },
    messages: [
      {
        role: 'user',
        content: `Classify each event below as concert (true) or non-concert (false).

${IS_CONCERT_RULES}

Return one entry per event id. Do not omit any.

Events:
${eventList}`,
      },
    ],
  })

  // Find a tool_use block AND verify it's our classify_events tool.
  // Forcing tool_choice constrains the response today, but a name check
  // is cheap insurance against a future schema where additional tools
  // could be invoked (or a Haiku regression that ignores tool_choice).
  const toolUseBlock = response.content.find(
    (blk) => blk.type === 'tool_use' && blk.name === CLASSIFY_TOOL_NAME,
  )
  if (!toolUseBlock || toolUseBlock.type !== 'tool_use') {
    throw new Error(`LLM did not return a ${CLASSIFY_TOOL_NAME} tool_use block`)
  }
  const inputRaw = toolUseBlock.input
  if (typeof inputRaw !== 'object' || inputRaw === null) {
    throw new Error('LLM tool_use input was not an object')
  }
  const classificationsField =
    'classifications' in inputRaw ? inputRaw.classifications : undefined
  if (!Array.isArray(classificationsField)) {
    throw new Error('LLM tool_use input.classifications was not an array')
  }
  return classificationsField.map((cls: unknown): BatchClassification => {
    if (
      typeof cls !== 'object' ||
      cls === null ||
      !('eventId' in cls) ||
      !('isConcert' in cls)
    ) {
      throw new Error(`Malformed classification entry: ${JSON.stringify(cls)}`)
    }
    const eventId = (cls as { eventId: unknown }).eventId
    const isConcert = (cls as { isConcert: unknown }).isConcert
    if (typeof eventId !== 'string' || typeof isConcert !== 'boolean') {
      throw new Error(
        `Classification entry has wrong types: ${JSON.stringify(cls)}`,
      )
    }
    return { eventId, isConcert }
  })
}

// CLI entry point — only runs when file is executed directly (not imported).
// Use pathToFileURL to handle relative paths, special chars, and
// platform-specific URL encoding correctly (process.argv[1] is not
// guaranteed to be a clean absolute URL-safe path).
const entryArg = process.argv[1]
const isCli =
  typeof entryArg === 'string' &&
  import.meta.url === pathToFileURL(entryArg).href
if (isCli) {
  const commit = process.argv.includes('--commit')
  runBackfill({ commit })
    .then((summary) => {
      console.log(
        `Done. ${summary.totalEvents} events processed, ${summary.wouldChange} would change, committed=${summary.committed}`,
      )
      process.exit(0)
    })
    .catch((err: unknown) => {
      console.error('Backfill failed:', err)
      process.exit(1)
    })
}
