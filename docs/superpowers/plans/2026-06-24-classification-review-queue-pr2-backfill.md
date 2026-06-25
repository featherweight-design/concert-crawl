# Classification Review Queue — PR 2: Backfill script

> **Sub-plan of:** [`2026-06-24-classification-review-queue.md`](2026-06-24-classification-review-queue.md) — read the index first for Goal, Architecture, Global Constraints, and File Structure.
> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**What this PR ships:** One-shot backfill script (`scripts/2026-06-24-isconcert-review-needed-backfill.ts`) targeting currently-hidden events (status in upcoming/cancelled/postponed, date >= today, Denver tz). Dry-run by default produces CSV with `event_id, title, artist, date, venue_name, current_hidden, llm_is_concert, llm_review_needed, action` columns; `--commit` writes only `is_concert_review_needed` — NEVER `hidden_from_consumer`. Optimistic-locked + idempotent. Estimated LLM cost ~$0.05 per env.

**Dependencies:** PR 1 deployed (column exists). May land any time after.

**Run plan (documented in PR body):** local dry-run → staging dry-run → staging commit → consumer-feed smoke → prod dry-run → prod commit.

---

# PR 2 — Backfill script

PR 2 is opened after PR 1's column has deployed to prod. Same worktree conventions; new branch.

### Task 2.1: Create worktree + branch + env files

**Files:**
- Create: `.worktrees/feat-classification-review-backfill/`

**Interfaces:**
- Produces: clean worktree on branch `feat/classification-review-backfill`.

- [ ] **Step 1: Create the worktree**

```bash
git worktree add .worktrees/feat-classification-review-backfill -b feat/classification-review-backfill
```

- [ ] **Step 2: Copy env files**

```bash
cp apps/web/.env.local .worktrees/feat-classification-review-backfill/apps/web/.env.local
cp apps/api/.env.local .worktrees/feat-classification-review-backfill/apps/api/.env.local
cp apps/crawler/.env.local .worktrees/feat-classification-review-backfill/apps/crawler/.env.local
```

- [ ] **Step 3: Install**

```bash
cd .worktrees/feat-classification-review-backfill
pnpm install
```

All remaining tasks for PR 2 run inside this worktree.

---

### Task 2.2: Write backfill helpers + tests

**Files:**
- Create: `scripts/2026-06-24-isconcert-review-needed-backfill-helpers.ts`
- Create: `scripts/2026-06-24-isconcert-review-needed-backfill.test.ts`

**Interfaces:**
- Produces: `buildBatches<T>(items: T[], batchSize: number): T[][]`, `formatCsvRow(result: ClassificationResult): string`, and types `EventForClassification`, `ClassificationResult`, `BatchClassification`. Imported by `2026-06-24-isconcert-review-needed-backfill.ts` (task 2.3) and the test file (this task).

- [ ] **Step 1: Write failing helper tests**

Create `scripts/2026-06-24-isconcert-review-needed-backfill.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import {
  buildBatches,
  formatCsvRow,
  type EventForClassification,
  type ClassificationResult,
} from './2026-06-24-isconcert-review-needed-backfill-helpers.js'

describe('isconcert-review-needed-backfill — buildBatches', () => {
  it('splits events into batches of the configured size', () => {
    const events: EventForClassification[] = Array.from({ length: 53 }, (_, idx) => ({
      id: `evt-${idx}`,
      title: `Show ${idx}`,
      artist: `Artist ${idx}`,
      description: null,
      date: '2026-08-01',
      venueName: 'Test Venue',
      currentHidden: true,
      currentReviewNeeded: false,
    }))
    const batches = buildBatches(events, 25)
    expect(batches).toHaveLength(3)
    expect(batches[0]).toHaveLength(25)
    expect(batches[1]).toHaveLength(25)
    expect(batches[2]).toHaveLength(3)
  })

  it('returns empty array for empty input', () => {
    expect(buildBatches([], 25)).toEqual([])
  })
})

describe('isconcert-review-needed-backfill — formatCsvRow', () => {
  const baseResult: ClassificationResult = {
    eventId: 'abc-123',
    title: 'Borderline Show',
    artist: 'PRESIDENT',
    date: '2026-08-01',
    venueName: 'Test Venue',
    currentHiddenFromConsumer: true,
    llmIsConcert: true,
    llmReviewNeeded: true,
    action: 'disagrees-with-prior',
  }

  it('quotes fields containing commas', () => {
    const row = formatCsvRow({ ...baseResult, title: 'Show, with, commas' })
    expect(row).toContain('"Show, with, commas"')
  })

  it('escapes embedded double quotes by doubling them (RFC 4180)', () => {
    const row = formatCsvRow({ ...baseResult, title: 'Show "with" quotes' })
    expect(row).toContain('"Show ""with"" quotes"')
  })

  it('includes the action label in the trailing column', () => {
    const row = formatCsvRow({ ...baseResult, action: 'flag-for-review' })
    expect(row.trimEnd().endsWith(',flag-for-review')).toBe(true)
  })
})
```

- [ ] **Step 2: Run the tests, verify they fail**

```bash
pnpm test:scripts scripts/2026-06-24-isconcert-review-needed-backfill.test
```

Expected: FAIL — helper module does not exist.

- [ ] **Step 3: Write the helpers**

Create `scripts/2026-06-24-isconcert-review-needed-backfill-helpers.ts`:

```typescript
/**
 * Pure helpers for the isConcert-review-needed backfill script.
 * Extracted so the test file can import them without pulling in the
 * Anthropic SDK or @concert-crawl/db. Mirrors the structure of
 * scripts/2026-06-19-non-concert-backfill-helpers.ts.
 */

export type BackfillAction = 'flag-for-review' | 'unflag' | 'disagrees-with-prior'

export interface EventForClassification {
  id: string
  title: string
  artist: string
  description: string | null
  date: string
  venueName: string
  currentHidden: boolean
  currentReviewNeeded: boolean
}

export interface ClassificationResult {
  eventId: string
  title: string
  artist: string
  date: string
  venueName: string
  currentHiddenFromConsumer: boolean
  llmIsConcert: boolean
  llmReviewNeeded: boolean
  action: BackfillAction
}

export interface BatchClassification {
  eventId: string
  isConcert: boolean
  reviewNeeded: boolean
}

export function buildBatches<T>(items: T[], batchSize: number): T[][] {
  const batches: T[][] = []
  for (let idx = 0; idx < items.length; idx += batchSize) {
    batches.push(items.slice(idx, idx + batchSize))
  }
  return batches
}

export function classifyAction(input: {
  currentHidden: boolean
  llmIsConcert: boolean
  llmReviewNeeded: boolean
}): BackfillAction {
  // disagrees-with-prior takes precedence over flag/unflag: the row is
  // currently hidden, but the LLM now thinks it's a concert. Surface this
  // for the human reviewer to consider applying Mark-as-concert post-
  // commit. The script itself NEVER auto-unhides.
  if (input.currentHidden && input.llmIsConcert) return 'disagrees-with-prior'
  return input.llmReviewNeeded ? 'flag-for-review' : 'unflag'
}

export function formatCsvRow(result: ClassificationResult): string {
  const escape = (val: string): string => {
    if (val.includes(',') || val.includes('"') || val.includes('\n')) {
      return `"${val.replace(/"/g, '""')}"`
    }
    return val
  }
  return (
    [
      result.eventId,
      escape(result.title),
      escape(result.artist),
      result.date,
      escape(result.venueName),
      String(result.currentHiddenFromConsumer),
      String(result.llmIsConcert),
      String(result.llmReviewNeeded),
      result.action,
    ].join(',') + '\n'
  )
}
```

- [ ] **Step 4: Run the tests, verify they pass**

```bash
pnpm test:scripts scripts/2026-06-24-isconcert-review-needed-backfill.test
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/2026-06-24-isconcert-review-needed-backfill-helpers.ts \
        scripts/2026-06-24-isconcert-review-needed-backfill.test.ts
git commit -m "feat(scripts): isconcert-review-needed backfill helpers"
```

---

### Task 2.3: Write the backfill script main module

**Files:**
- Create: `scripts/2026-06-24-isconcert-review-needed-backfill.ts`

**Interfaces:**
- Consumes: helpers from task 2.2.
- Produces: `runBackfill({ commit: boolean, outputPath?: string }): Promise<BackfillSummary>` where `BackfillSummary = { totalEvents: number, flaggedCount: number, unflaggedCount: number, disagreementCount: number, committed: boolean, raceSkipped: string[] }`. CLI entry point at bottom of file.

- [ ] **Step 1: Write failing `classifyBatch` test**

Append to `scripts/2026-06-24-isconcert-review-needed-backfill.test.ts`:

```typescript
// classifyBatch tests — mock the Anthropic SDK so we exercise response
// parsing without making real API calls. Pattern mirrors
// scripts/2026-06-19-non-concert-backfill.test.ts.

const mockCreate = vi.fn()
vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(
    class {
      messages = { create: mockCreate }
    },
  ),
}))

const { classifyBatch } = await import('./2026-06-24-isconcert-review-needed-backfill.js')

const Anthropic = (await import('@anthropic-ai/sdk')).default

describe('isconcert-review-needed-backfill — classifyBatch', () => {
  it('parses isConcert + reviewNeeded out of the tool_use response', async () => {
    mockCreate.mockResolvedValue({
      content: [
        {
          type: 'tool_use',
          id: 'tool_1',
          name: 'classify_events',
          input: {
            classifications: [
              { eventId: 'evt-1', isConcert: true, reviewNeeded: true },
              { eventId: 'evt-2', isConcert: false, reviewNeeded: false },
            ],
          },
        },
      ],
      usage: { input_tokens: 100, output_tokens: 30 },
    })
    const client = new Anthropic()
    const out = await classifyBatch(client, [
      {
        id: 'evt-1',
        title: 'PRESIDENT',
        artist: 'PRESIDENT',
        description: null,
        date: '2026-08-01',
        venueName: 'V',
        currentHidden: true,
        currentReviewNeeded: false,
      },
      {
        id: 'evt-2',
        title: 'Bingo',
        artist: 'Bingo',
        description: null,
        date: '2026-08-01',
        venueName: 'V',
        currentHidden: true,
        currentReviewNeeded: false,
      },
    ])
    expect(out).toEqual([
      { eventId: 'evt-1', isConcert: true, reviewNeeded: true },
      { eventId: 'evt-2', isConcert: false, reviewNeeded: false },
    ])
  })

  it('throws when the LLM returns no classify_events tool_use block', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'no tool call' }],
      usage: { input_tokens: 10, output_tokens: 5 },
    })
    const client = new Anthropic()
    await expect(
      classifyBatch(client, [
        {
          id: 'evt-1',
          title: 'X',
          artist: 'X',
          description: null,
          date: '2026-08-01',
          venueName: 'V',
          currentHidden: true,
          currentReviewNeeded: false,
        },
      ]),
    ).rejects.toThrow(/classify_events/)
  })

  it('rejects malformed classification entries', async () => {
    mockCreate.mockResolvedValue({
      content: [
        {
          type: 'tool_use',
          id: 'tool_1',
          name: 'classify_events',
          input: {
            classifications: [{ eventId: 'evt-1', isConcert: 'yes' }],
          },
        },
      ],
      usage: { input_tokens: 10, output_tokens: 5 },
    })
    const client = new Anthropic()
    await expect(
      classifyBatch(client, [
        {
          id: 'evt-1',
          title: 'X',
          artist: 'X',
          description: null,
          date: '2026-08-01',
          venueName: 'V',
          currentHidden: true,
          currentReviewNeeded: false,
        },
      ]),
    ).rejects.toThrow(/wrong types|Malformed/)
  })
})
```

- [ ] **Step 2: Run the test, verify it fails**

```bash
pnpm test:scripts scripts/2026-06-24-isconcert-review-needed-backfill.test
```

Expected: FAIL — `./2026-06-24-isconcert-review-needed-backfill.js` does not exist.

- [ ] **Step 3: Write the script**

Create `scripts/2026-06-24-isconcert-review-needed-backfill.ts`:

```typescript
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
import { IS_CONCERT_RULES } from '../packages/crawler-core/src/lib/extractors/llm.js'
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

  const flaggedCount = results.filter((row) => row.action === 'flag-for-review').length
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
    const weightDelta = actionWeight(firstRow.action) - actionWeight(secondRow.action)
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
```

- [ ] **Step 4: Run the tests, verify they pass**

```bash
pnpm test:scripts scripts/2026-06-24-isconcert-review-needed-backfill.test
```

Expected: PASS.

- [ ] **Step 5: Smoke-test the dry-run locally**

```bash
pnpm tsx scripts/2026-06-24-isconcert-review-needed-backfill.ts
```

Expected: a CSV at `./dry-run-isconcert-review-needed-<timestamp>.csv` listing every locally-hidden event with the LLM's verdict + `action` column. (Local DB may have zero hidden events — that's fine; empty CSV header-only output is the expected outcome.)

- [ ] **Step 6: Commit**

```bash
git add scripts/2026-06-24-isconcert-review-needed-backfill.ts \
        scripts/2026-06-24-isconcert-review-needed-backfill.test.ts
git commit -m "feat(scripts): isconcert-review-needed backfill main + classifyBatch"
```

---

### Task 2.4: Pre-push + PR

- [ ] **Step 1: Full checks**

```bash
pnpm typecheck
pnpm lint
pnpm test
```

Expected: green.

- [ ] **Step 2: Rebase + push**

```bash
git fetch origin
git rebase origin/main
git push -u origin feat/classification-review-backfill
```

- [ ] **Step 3: Open PR with run plan in the body**

```bash
gh pr create --title "feat(scripts): isConcert review-needed backfill (PR 2/3)" --body "$(cat <<'EOF'
## Summary

PR 2 of 3 for the classification review queue. One-shot backfill that populates `events.is_concert_review_needed` on every currently-hidden, non-terminal event (status in upcoming/cancelled/postponed, date >= today, Denver tz).

- Default dry-run → CSV with `event_id, title, artist, date, venue_name, current_hidden, llm_is_concert, llm_review_needed, action` columns
- `action` ∈ {flag-for-review, unflag, disagrees-with-prior}; sorted with flagged + disagreement rows first
- `--commit` mode writes only `is_concert_review_needed`, NEVER `hidden_from_consumer`
- Optimistic-locked on `(hiddenFromConsumer, isConcertReviewNeeded)` so concurrent admin actions mid-run are surfaced as race-skipped
- Idempotent — re-runs with same inputs produce same classifications modulo LLM nondeterminism

## Run plan

1. Local dry-run (sanity): `pnpm tsx scripts/2026-06-24-isconcert-review-needed-backfill.ts` — verify CSV header + any hidden rows present
2. Staging dry-run: `DATABASE_URL=<staging> pnpm tsx scripts/...` — review CSV, count `disagrees-with-prior` rows
3. Staging commit: `DATABASE_URL=<staging> pnpm tsx scripts/... --commit`
4. Consumer-feed smoke on staging: confirm no events became newly visible (no `hidden_from_consumer` change)
5. Prod dry-run + sanity review
6. Prod commit

Estimated LLM cost: ~$0.05 per env (130 hidden events × ~300 tokens × Haiku).

## Test plan

- [ ] `pnpm test:scripts scripts/2026-06-24-isconcert-review-needed-backfill.test` (helpers + classifyBatch with mocked SDK)
- [ ] Local dry-run produces a non-throwing CSV
- [ ] Staging dry-run CSV looks reasonable (manual review)
- [ ] Staging `--commit` writes only the review-needed flag (psql spot-check on a few rows)

## Env vars

None new; reuses `DATABASE_URL` and `ANTHROPIC_API_KEY`.

## Risk

Medium. Direct DB UPDATEs, but optimistic-locked + scoped to a single column. Race-skipped rows are surfaced rather than silently overwritten. Roll-forward by re-running.
EOF
)"
```

- [ ] **Step 4: Request Copilot review**

```bash
PR=$(gh pr view --json number -q .number)
gh api -X POST "repos/HartiganHM/concert-crawl/pulls/${PR}/requested_reviewers" --input - <<< '{"reviewers":["copilot-pull-request-reviewer[bot]"]}'
gh api "repos/HartiganHM/concert-crawl/pulls/${PR}" --jq '.requested_reviewers[].login'
```

- [ ] **Step 5: Iterate Copilot reviews to merge bar**

Same rules as PR 1. Hand off for merge.

---

