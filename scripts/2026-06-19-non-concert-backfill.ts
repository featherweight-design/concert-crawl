/**
 * One-shot non-concert auto-classification backfill (#696).
 *
 * Reads upcoming events from the DB, sends them through Haiku in batches,
 * compares the LLM's isConcert classification against the current
 * hidden_from_consumer value, and either:
 *   - Default: writes a dry-run CSV to ./non-concert-backfill-dry-run-<ts>.csv
 *   - With --commit: updates hidden_from_consumer in a transaction
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
import Anthropic from '@anthropic-ai/sdk'
import { and, eq, gte, inArray } from 'drizzle-orm'
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

// Main function exported for testability; CLI invocation is at the bottom.
export async function runBackfill(opts: {
  commit: boolean
  outputPath?: string
}): Promise<{ totalEvents: number; wouldChange: number; committed: boolean }> {
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
    }
  }

  // --commit path: transactionally update every row that would change
  const toUpdate = results.filter((row) => row.wouldChange)
  console.log(`Committing ${toUpdate.length} updates...`)
  await db.transaction(async (tx) => {
    for (const row of toUpdate) {
      await tx
        .update(events)
        .set({ hiddenFromConsumer: !row.llmIsConcert })
        .where(eq(events.id, row.eventId))
    }
  })
  console.log(`Commit done. Updated ${toUpdate.length} rows.`)
  return {
    totalEvents: results.length,
    wouldChange: wouldChangeCount,
    committed: true,
  }
}

async function classifyBatch(
  client: Anthropic,
  batch: EventForClassification[],
): Promise<BatchClassification[]> {
  const tool: Anthropic.Tool = {
    name: 'classify_events',
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
    tool_choice: { type: 'tool', name: 'classify_events' },
    messages: [
      {
        role: 'user',
        content: `Classify each event below as concert (true) or non-concert (false).

isConcert=true: named musician(s) performing live music — bands, solo artists, DJ sets, orchestras, jazz performances, tribute bands when themselves performing
isConcert=false: non-performance events at music venues — themed dance parties (e.g. "Liv, Laugh, Love: Olivia Rodrigo Dance Party"), bingo (e.g. "BASS BINGO – Wooli Edition!"), trivia, comedy, film/movie screenings (e.g. "Film on the Rocks: Sinners"), karaoke, listening parties, private events

Return one entry per event id. Do not omit any.

Events:
${eventList}`,
      },
    ],
  })

  const toolUseBlock = response.content.find((blk) => blk.type === 'tool_use')
  if (!toolUseBlock || toolUseBlock.type !== 'tool_use') {
    throw new Error('LLM did not return tool_use block')
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

// CLI entry point — only runs when file is executed directly (not imported)
const isCli = import.meta.url === `file://${process.argv[1]}`
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
