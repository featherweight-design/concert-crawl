/**
 * One-shot backfill that populates events.is_concert_review_needed on
 * currently-hidden events. Reads every hidden, non-terminal event
 * with date >= today (Denver tz), sends them through Haiku in batches,
 * and either:
 *   - Default: writes a dry-run CSV to ./dry-run-isconcert-review-needed-<ts>.csv
 *   - With --commit: updates is_concert_review_needed in a transaction.
 *     Optimistic-locked on the previously-observed (currentHidden,
 *     currentReviewNeeded) tuple so a concurrent admin Mark-as-concert
 *     between SELECT and UPDATE isn't silently overwritten.
 *
 * Does NOT touch hidden_from_consumer under any circumstance — this
 * script's only side effect on commit is writing the review-needed
 * flag. Disagreements ("LLM now says isConcert=true but the row is
 * hidden") are surfaced in the CSV with action='disagrees-with-prior'
 * for the operator to consider applying Mark-as-concert post-commit.
 *
 * Run:
 *   pnpm tsx scripts/2026-06-24-isconcert-review-needed-backfill.ts            # dry-run
 *   pnpm tsx scripts/2026-06-24-isconcert-review-needed-backfill.ts --commit   # writes
 *
 * Against staging/prod set DATABASE_URL accordingly.
 *
 * Idempotent: re-running with the same inputs produces the same
 * classifications (modulo LLM nondeterminism — binary-with-examples
 * should be stable).
 */

import { writeFileSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import Anthropic from '@anthropic-ai/sdk'
import { and, eq, gte, inArray, sql } from 'drizzle-orm'
// Relative source imports (not package barrel) so this one-shot script
// runs against a clean checkout without requiring a prior
// `pnpm build --filter=@concert-crawl/crawler-core`. tsx resolves the
// `.js` suffix back to the `.ts` source. REVIEW_NEEDED_RULES is included
// because this backfill's tool schema accepts + emits reviewNeeded — see
// the export comment in llm.ts naming this script as its consumer. Without
// the rules block the model is asked to emit reviewNeeded with no guidance
// on when to set it.
import {
  IS_CONCERT_RULES,
  REVIEW_NEEDED_RULES,
} from '../packages/crawler-core/src/lib/extractors/llm.js'
import { db, events, venues } from '@concert-crawl/db'
import {
  buildBatches,
  classifyAction,
  formatCsvRow,
  type BatchClassification,
  type ClassificationResult,
  type EventForClassification,
} from './2026-06-24-isconcert-review-needed-backfill-helpers.js'

const MODEL = 'claude-haiku-4-5-20251001'
const BATCH_SIZE = 25
const CLASSIFY_TOOL_NAME = 'classify_events'

export interface BackfillSummary {
  totalEvents: number
  flaggedCount: number
  unflaggedCount: number
  disagreementCount: number
  committed: boolean
  raceSkipped: string[]
}

export async function runBackfill(opts: {
  commit: boolean
  outputPath?: string
}): Promise<BackfillSummary> {
  // Denver-tz "today" mirrors the admin events route + crawl.ts so the
  // backfill window doesn't shift around UTC midnight relative to what
  // admins see in the UI. db.execute returns the rows array directly (see
  // contests.migration.integration.test.ts:21-49) — not { rows: [...] }.
  const todayRows = await db.execute<{ today: string }>(
    sql`SELECT to_char((NOW() AT TIME ZONE 'America/Denver')::date, 'YYYY-MM-DD') AS today`,
  )
  const today = todayRows[0]?.today
  if (!today) throw new Error('Could not determine Denver-tz today')

  const rows = await db
    .select({
      id: events.id,
      title: events.title,
      artist: events.artist,
      description: events.description,
      date: events.date,
      venueName: venues.name,
      currentHidden: events.hiddenFromConsumer,
      currentReviewNeeded: events.isConcertReviewNeeded,
    })
    .from(events)
    .leftJoin(venues, eq(events.venueId, venues.id))
    .where(
      and(
        eq(events.hiddenFromConsumer, true),
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
    currentReviewNeeded: row.currentReviewNeeded,
  }))

  console.log(`Loaded ${inputs.length} hidden events for classification`)
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
      results.push({
        eventId: evt.id,
        title: evt.title,
        artist: evt.artist,
        date: evt.date,
        venueName: evt.venueName,
        currentHiddenFromConsumer: evt.currentHidden,
        llmIsConcert: result.isConcert,
        llmReviewNeeded: result.reviewNeeded,
        action: classifyAction({
          currentHidden: evt.currentHidden,
          llmIsConcert: result.isConcert,
          llmReviewNeeded: result.reviewNeeded,
        }),
      })
    }
  }

  const flaggedCount = results.filter(
    (row) => row.action === 'flag-for-review',
  ).length
  const unflaggedCount = results.filter((row) => row.action === 'unflag').length
  const disagreementCount = results.filter(
    (row) => row.action === 'disagrees-with-prior',
  ).length
  console.log(
    `Classification done. flag-for-review=${flaggedCount}, disagrees-with-prior=${disagreementCount}, unflag=${unflaggedCount}`,
  )

  // Sort: flag-for-review + disagrees-with-prior first, then unflag last.
  // Within each group, alphabetical by title for human scannability.
  const actionWeight = (action: ClassificationResult['action']): number => {
    if (action === 'flag-for-review') return 0
    if (action === 'disagrees-with-prior') return 0
    return 1
  }
  results.sort((firstRow, secondRow) => {
    const weightDelta =
      actionWeight(firstRow.action) - actionWeight(secondRow.action)
    if (weightDelta !== 0) return weightDelta
    return firstRow.title.localeCompare(secondRow.title)
  })

  const header =
    'event_id,title,artist,date,venue_name,current_hidden,llm_is_concert,llm_review_needed,action\n'
  const csv = header + results.map(formatCsvRow).join('')

  if (!opts.commit) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const outPath =
      opts.outputPath ??
      path.resolve(`./dry-run-isconcert-review-needed-${timestamp}.csv`)
    writeFileSync(outPath, csv, 'utf-8')
    console.log(`Dry-run CSV written to ${outPath}`)
    return {
      totalEvents: results.length,
      flaggedCount,
      unflaggedCount,
      disagreementCount,
      committed: false,
      raceSkipped: [],
    }
  }

  // --commit path: write is_concert_review_needed only. Never touches
  // hidden_from_consumer. Optimistic-locked on (currentHidden,
  // currentReviewNeeded) so concurrent admin Mark-as-concert / Mark-non-
  // concert mid-run can't get overwritten.
  //
  // Write every row whose previously-stored review-needed flag differs
  // from the LLM's view. "unflag" rows already at false are no-ops
  // (filtered out here). Rows whose LLM verdict matches the stored flag
  // are skipped to keep the transaction small.
  const inputById = new Map(inputs.map((evt) => [evt.id, evt] as const))
  const writes = results.filter((row) => {
    const inputRow = inputById.get(row.eventId)
    if (!inputRow) return false
    return inputRow.currentReviewNeeded !== row.llmReviewNeeded
  })

  console.log(`Committing ${writes.length} updates...`)
  const raceSkipped: string[] = []
  await db.transaction(async (tx) => {
    for (const row of writes) {
      const inputRow = inputById.get(row.eventId)
      if (!inputRow) continue
      const updated = await tx
        .update(events)
        .set({ isConcertReviewNeeded: row.llmReviewNeeded })
        .where(
          and(
            eq(events.id, row.eventId),
            eq(events.hiddenFromConsumer, inputRow.currentHidden),
            eq(events.isConcertReviewNeeded, inputRow.currentReviewNeeded),
          ),
        )
        .returning({ id: events.id })
      if (updated.length === 0) {
        raceSkipped.push(row.eventId)
      }
    }
  })
  const updatedCount = writes.length - raceSkipped.length
  console.log(`Commit done. Updated ${updatedCount} rows.`)
  if (raceSkipped.length > 0) {
    console.warn(
      `Skipped ${raceSkipped.length} rows whose hidden_from_consumer or is_concert_review_needed changed between SELECT and UPDATE. Event IDs:`,
    )
    for (const eventId of raceSkipped) console.warn(`  ${eventId}`)
  }
  return {
    totalEvents: results.length,
    flaggedCount,
    unflaggedCount,
    disagreementCount,
    committed: true,
    raceSkipped,
  }
}

export async function classifyBatch(
  client: Anthropic,
  batch: EventForClassification[],
): Promise<BatchClassification[]> {
  const tool: Anthropic.Tool = {
    name: CLASSIFY_TOOL_NAME,
    description:
      'Classify each event: isConcert (true/false) + reviewNeeded (true when the classification was ambiguous).',
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
              reviewNeeded: { type: 'boolean' },
            },
            required: ['eventId', 'isConcert', 'reviewNeeded'],
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
        content: `Classify each event below.

${IS_CONCERT_RULES}

${REVIEW_NEEDED_RULES}

Return one entry per event id. Do not omit any.

Events:
${eventList}`,
      },
    ],
  })

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
      !('isConcert' in cls) ||
      !('reviewNeeded' in cls)
    ) {
      throw new Error(`Malformed classification entry: ${JSON.stringify(cls)}`)
    }
    const eventId = (cls as { eventId: unknown }).eventId
    const isConcert = (cls as { isConcert: unknown }).isConcert
    const reviewNeeded = (cls as { reviewNeeded: unknown }).reviewNeeded
    if (
      typeof eventId !== 'string' ||
      typeof isConcert !== 'boolean' ||
      typeof reviewNeeded !== 'boolean'
    ) {
      throw new Error(
        `Classification entry has wrong types: ${JSON.stringify(cls)}`,
      )
    }
    return { eventId, isConcert, reviewNeeded }
  })
}

const entryArg = process.argv[1]
const isCli =
  typeof entryArg === 'string' &&
  import.meta.url === pathToFileURL(entryArg).href
if (isCli) {
  const commit = process.argv.includes('--commit')
  runBackfill({ commit })
    .then((summary) => {
      console.log(
        `Done. ${summary.totalEvents} events processed, flagged=${summary.flaggedCount}, disagreements=${summary.disagreementCount}, unflagged=${summary.unflaggedCount}, committed=${summary.committed}`,
      )
      process.exit(0)
    })
    .catch((err: unknown) => {
      console.error('Backfill failed:', err)
      process.exit(1)
    })
}
