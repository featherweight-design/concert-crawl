# Non-Concert Auto-Classification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Have the LLM classify events as concert / non-concert at extraction time. Pre-set `hidden_from_consumer` on INSERT for non-concerts so they never reach the consumer surface. Backfill the existing event corpus in one supervised pass.

**Architecture:** Two PRs. PR 1 wires `isConcert` through the LLM extractor → crawler INSERT path. PR 2 is a one-shot Haiku-powered backfill script with dry-run-by-default behavior. Reuses existing `events.hidden_from_consumer` column — no schema changes. No new admin UI for v1 (false-negative override deferred until misclassification rate is known).

**Tech Stack:** TypeScript, Anthropic SDK (Haiku 4.5), Zod, Drizzle ORM, Vitest, PostgreSQL.

**Spec:** `docs/superpowers/specs/2026-06-18-non-concert-auto-classification-design.md` (issue #696).

## Global Constraints

- **TypeScript strict mode** across all packages (project-wide).
- **No `as` casts.** Use Zod `safeParse` for data crossing system boundaries (LLM responses are a boundary). Per CLAUDE.md "Type safety is the first line of defence" memory.
- **No single-character identifiers.** ESLint enforces min length 2. Use `err` not `e`, `idx` not `i`, `evt` not `e`, etc.
- **No raw SQL outside migrations.** Backfill script uses Drizzle for all reads/writes.
- **Every catch block must log the error.** Per `feedback_async_try_catch.md` memory — empty/silent catches will be rejected.
- **Conventional commits:** `feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`. Per CLAUDE.md.
- **`isConcert` is OPTIONAL in the Zod parser, REQUIRED in the Anthropic tool schema.** Anthropic enforces the tool-schema `required` array reliably for Haiku, so the LLM almost always emits it; but defending Zod against the rare omission prevents one missing field from rejecting the whole batch (50+ events). Default to `true` (treat as concert) when omitted — fail-open for visibility, fail-closed would silently hide events.
- **The crawler writes `hidden_from_consumer` ONLY on INSERT.** On the `onConflictDoUpdate` `set` clause it must NOT appear. This mirrors the existing one-way-promotion pattern for `artist` (see `packages/crawler-core/src/crawl.ts:634-638` comment) and `verified` (see line 649-651).
- **Backfill script defaults to dry-run.** Writing to DB requires `--commit` flag. Output CSV is sorted with `would_change=true` rows first.

---

## PR 1 — LLM Classification + Crawler INSERT Wiring

Branch: `feat/non-concert-classification-pr1`

### Task 1: LLM extractor emits `isConcert`

Add the field through the Zod schema, the Anthropic tool schema, and the prompt. End state: LLM returns `isConcert` per event; the parser exposes it on the `NormalizedEvent` type for downstream consumers.

**Files:**
- Modify: `packages/crawler-core/src/types.ts` — add `isConcert?: boolean` to `NormalizedEvent` interface
- Modify: `packages/crawler-core/src/lib/extractors/llm.ts` — add to `NormalizedEventSchema`, `SAVE_EVENTS_TOOL`, `SYSTEM_PROMPT`, and the events-mapping
- Test: `packages/crawler-core/src/lib/extractors/llm.test.ts` — new test cases for the three parsing branches (true, false, omitted)

**Interfaces:**
- Consumes: existing `NormalizedEvent`, `LLMResult`, `extractWithLlm` signature stays unchanged at function level
- Produces: `NormalizedEvent.isConcert?: boolean` — present when the LLM emits it (which should be every time). Crawler INSERT path (Task 2) reads this.

- [ ] **Step 1: Write failing tests in `llm.test.ts`**

Open `packages/crawler-core/src/lib/extractors/llm.test.ts` and append three new tests inside the existing `describe('extractWithLlm', ...)` block:

```typescript
  it('returns isConcert=true when the LLM emits it as true', async () => {
    const mockEvents = [
      {
        title: 'Miles Davis Tribute',
        artist: 'Miles Davis Tribute',
        date: '2026-08-15',
        confidence: 0.95,
        isConcert: true,
      },
    ]
    mockCreate.mockResolvedValue(makeAnthropicResponse(mockEvents))
    const result = await extractWithLlm('<html>...</html>', SOURCE_URL)
    expect(result.events).toHaveLength(1)
    expect(result.events[0]?.isConcert).toBe(true)
  })

  it('returns isConcert=false when the LLM emits it as false (non-concert event)', async () => {
    const mockEvents = [
      {
        title: 'BASS BINGO – Wooli Edition!',
        artist: 'Wooli',
        date: '2026-06-18',
        confidence: 0.9,
        isConcert: false,
      },
    ]
    mockCreate.mockResolvedValue(makeAnthropicResponse(mockEvents))
    const result = await extractWithLlm('<html>...</html>', SOURCE_URL)
    expect(result.events).toHaveLength(1)
    expect(result.events[0]?.isConcert).toBe(false)
  })

  it('defaults isConcert to undefined when the LLM omits the field (defensive parsing)', async () => {
    // Anthropic enforces required tool schema fields, but defending Zod
    // against the rare omission prevents one missing field from rejecting
    // the whole batch. Defaulting omission to "not set" lets the crawler
    // INSERT path treat it as concert (fail-open).
    const mockEvents = [
      {
        title: 'Open Mic Night',
        artist: 'Various',
        date: '2026-08-15',
        confidence: 0.7,
        // isConcert intentionally omitted
      },
    ]
    mockCreate.mockResolvedValue(makeAnthropicResponse(mockEvents))
    const result = await extractWithLlm('<html>...</html>', SOURCE_URL)
    expect(result.events).toHaveLength(1)
    expect(result.events[0]?.isConcert).toBeUndefined()
  })
```

- [ ] **Step 2: Run the new tests and confirm they FAIL**

```bash
cd /Users/huey/Projects/concert-crawl/.worktrees/feat-non-concert-classification-pr1 && pnpm --filter=@concert-crawl/crawler-core test -- src/lib/extractors/llm.test.ts -t 'isConcert'
```

Expected: 3 failures. The current `NormalizedEventSchema` doesn't define `isConcert` so Zod ignores it on parse, and the mapped `events` array doesn't include it.

- [ ] **Step 3: Add `isConcert` to `NormalizedEvent` interface**

In `packages/crawler-core/src/types.ts`:

```typescript
export interface NormalizedEvent {
  title: string
  artist: string
  date: string
  doorsTime?: string
  showTime?: string
  ticketUrl?: string
  description?: string
  imageUrl?: string
  sourceUrl: string
  confidence: number
  isConcert?: boolean
}
```

- [ ] **Step 4: Add `isConcert` to the Zod schema in `llm.ts`**

In `packages/crawler-core/src/lib/extractors/llm.ts`, update `NormalizedEventSchema` (lines 13-22):

```typescript
const NormalizedEventSchema = z.object({
  title: z.string(),
  artist: z.string(),
  date: isoDateSchema,
  doorsTime: z.string().nullable().optional(),
  showTime: z.string().nullable().optional(),
  ticketUrl: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  confidence: z.number().min(0).max(1),
  isConcert: z.boolean().optional(),
})
```

- [ ] **Step 5: Add `isConcert` to the Anthropic tool schema**

In the same file, update `SAVE_EVENTS_TOOL.input_schema.properties.events.items` (lines 49-79). Add the property and put it in the `required` array so Anthropic enforces emission:

```typescript
        items: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Full event/show title' },
            artist: {
              type: 'string',
              description: 'Main performing artist or band name',
            },
            date: { type: 'string', description: 'ISO date YYYY-MM-DD' },
            doorsTime: {
              type: ['string', 'null'],
              description: 'HH:MM:SS or null',
            },
            showTime: {
              type: ['string', 'null'],
              description: 'HH:MM:SS or null',
            },
            ticketUrl: {
              type: ['string', 'null'],
              description: 'Ticket purchase URL or null',
            },
            description: {
              type: ['string', 'null'],
              description: 'Short description or null',
            },
            confidence: {
              type: 'number',
              description: 'Extraction confidence 0.0 to 1.0',
            },
            isConcert: {
              type: 'boolean',
              description:
                'true if a concert (named musicians performing live music). false for non-concert events like themed parties, bingo, trivia, movies, comedy, listening parties, karaoke.',
            },
          },
          required: ['title', 'artist', 'date', 'confidence', 'isConcert'],
        },
```

- [ ] **Step 6: Update the system prompt with classification guidance**

In the same file, replace the `SYSTEM_PROMPT` constant (lines 30-38) with:

```typescript
const SYSTEM_PROMPT = `You are a concert event data extractor. Given HTML from a venue website, call the save_events tool with all upcoming events you find — including non-concert events. Downstream tooling uses isConcert to decide what reaches consumers.

Rules:
- date must be ISO format YYYY-MM-DD
- confidence reflects how certain you are the extraction is accurate (0.0-1.0)
- Only include actual upcoming events, not past events
- If artist is unclear, use the event title as the artist
- Pass an empty events array if no events are found
- When a date has no year, infer it using today's date (provided in the user message): if the month/day is today or in the future within the current year, use the current year; if the month/day has already passed this year, use next year

isConcert rules (for every event):
- true: named musician(s) performing live music. Includes bands, solo artists, DJ sets, orchestras, jazz performances, tribute bands when they are themselves performing
- false: non-performance events that happen at music venues — themed dance parties (e.g. "Liv, Laugh, Love: Olivia Rodrigo Dance Party"), bingo nights (e.g. "BASS BINGO – Wooli Edition!"), trivia, comedy, film/movie screenings (e.g. "Film on the Rocks: Sinners"), karaoke, listening parties, private events`
```

Note the two semantic changes in the lead: "concert events" → "events" (we now want non-concerts too), and the tool description sentence adjusted in step 5's `description: 'Save all extracted upcoming concert events...'` will need a tweak too. Update it now while you're in the file:

```typescript
const SAVE_EVENTS_TOOL: Anthropic.Tool = {
  name: 'save_events',
  description:
    'Save all extracted upcoming events from the venue page. Includes non-concert events; the isConcert field on each event distinguishes them.',
  input_schema: {
    // ... rest unchanged
  },
}
```

- [ ] **Step 7: Thread `isConcert` through the events-mapping**

In `llm.ts`, update the `events` mapping (lines 151-162). The `parsed.data.events.map((e) => ...)` callback returns an object that becomes `NormalizedEvent`. Add `isConcert`:

```typescript
  const events = parsed.data.events.map((evt) => ({
    title: evt.title,
    artist: evt.artist,
    date: evt.date,
    confidence: evt.confidence,
    sourceUrl,
    ...(evt.doorsTime != null &&
      evt.doorsTime !== '' && { doorsTime: evt.doorsTime }),
    ...(evt.showTime != null && evt.showTime !== '' && { showTime: evt.showTime }),
    ...(evt.ticketUrl != null && { ticketUrl: evt.ticketUrl }),
    ...(evt.description != null && { description: evt.description }),
    ...(evt.isConcert != null && { isConcert: evt.isConcert }),
  }))
```

Note the rename of the callback parameter `e` → `evt` to satisfy the project's no-single-character-identifier rule (mentioned in Global Constraints).

- [ ] **Step 8: Run the new tests and confirm they PASS**

```bash
pnpm --filter=@concert-crawl/crawler-core test -- src/lib/extractors/llm.test.ts -t 'isConcert'
```

Expected: 3 pass.

- [ ] **Step 9: Run the full extractor test suite to ensure no regressions**

```bash
pnpm --filter=@concert-crawl/crawler-core test -- src/lib/extractors/
```

Expected: all pass (existing tests + 3 new).

- [ ] **Step 10: Commit**

```bash
git add packages/crawler-core/src/types.ts packages/crawler-core/src/lib/extractors/llm.ts packages/crawler-core/src/lib/extractors/llm.test.ts
git commit -m "feat(crawler): LLM extractor emits isConcert per event (#696)"
```

---

### Task 2: Crawler INSERT path sets `hidden_from_consumer` based on `isConcert`

Wire the parsed `isConcert` field through `crawl.ts`'s upsert pipeline. INSERT path sets `hidden_from_consumer = (isConcert === false)`; UPDATE path leaves it untouched. End state: crawl integration tests prove both directions.

**Files:**
- Modify: `packages/crawler-core/src/crawl.ts` — add `hiddenFromConsumer` to the `eventValues` map; explicitly NOT in the `onConflictDoUpdate.set` clause
- Test: `packages/crawler-core/src/crawl.integration.test.ts` — two new tests (INSERT sets the flag; UPDATE doesn't touch admin-set value)

**Interfaces:**
- Consumes: `NormalizedEvent.isConcert?: boolean` from Task 1
- Produces: rows inserted into `events` table now have `hidden_from_consumer = true` when LLM says non-concert. Re-crawls don't overwrite admin overrides.

- [ ] **Step 1: Write failing integration tests**

Append to `packages/crawler-core/src/crawl.integration.test.ts`. The simplest home is a new `describe` block at the end of the file. The mock pattern is already established (see lines 29-31, 38, 43 for `mockExtractWithLlm`).

```typescript
describe('crawlVenue — non-concert auto-classification (#696)', () => {
  it('INSERT path sets hidden_from_consumer=true when LLM returns isConcert=false', async () => {
    const venue = await seedTestVenue()
    const dateA = futureDate(7)

    mockFetchPage.mockResolvedValue({
      html: HTML_BASE,
      finalUrl: venue.url,
      httpStatus: 200,
    })
    mockExtractWithLlm.mockResolvedValue({
      events: [
        {
          title: 'BASS BINGO – Wooli Edition!',
          artist: 'Wooli',
          date: dateA,
          confidence: 0.95,
          sourceUrl: venue.url,
          isConcert: false,
        },
      ],
      usage: {
        inputTokens: 100,
        outputTokens: 50,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
      },
    })

    await crawlVenue(venue.id, mockBrowser)

    const [row] = await db
      .select({
        hiddenFromConsumer: events.hiddenFromConsumer,
        artist: events.artist,
      })
      .from(events)
      .where(eq(events.venueId, venue.id))

    expect(row?.hiddenFromConsumer).toBe(true)
    expect(row?.artist).toBe('Wooli')
  })

  it('INSERT path sets hidden_from_consumer=false when LLM returns isConcert=true', async () => {
    const venue = await seedTestVenue()
    const dateA = futureDate(7)

    mockFetchPage.mockResolvedValue({
      html: HTML_BASE,
      finalUrl: venue.url,
      httpStatus: 200,
    })
    mockExtractWithLlm.mockResolvedValue({
      events: [
        {
          title: 'Wynonna Judd Live',
          artist: 'Wynonna Judd',
          date: dateA,
          confidence: 0.95,
          sourceUrl: venue.url,
          isConcert: true,
        },
      ],
      usage: {
        inputTokens: 100,
        outputTokens: 50,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
      },
    })

    await crawlVenue(venue.id, mockBrowser)

    const [row] = await db
      .select({ hiddenFromConsumer: events.hiddenFromConsumer })
      .from(events)
      .where(eq(events.venueId, venue.id))

    expect(row?.hiddenFromConsumer).toBe(false)
  })

  it('INSERT path defaults to hidden_from_consumer=false when LLM omits isConcert (fail-open)', async () => {
    const venue = await seedTestVenue()
    const dateA = futureDate(7)

    mockFetchPage.mockResolvedValue({
      html: HTML_BASE,
      finalUrl: venue.url,
      httpStatus: 200,
    })
    mockExtractWithLlm.mockResolvedValue({
      events: [
        {
          title: 'Ambiguous Show',
          artist: 'Ambiguous Artist',
          date: dateA,
          confidence: 0.8,
          sourceUrl: venue.url,
          // isConcert intentionally undefined
        },
      ],
      usage: {
        inputTokens: 100,
        outputTokens: 50,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
      },
    })

    await crawlVenue(venue.id, mockBrowser)

    const [row] = await db
      .select({ hiddenFromConsumer: events.hiddenFromConsumer })
      .from(events)
      .where(eq(events.venueId, venue.id))

    expect(row?.hiddenFromConsumer).toBe(false)
  })

  it('UPDATE path does NOT overwrite admin-set hidden_from_consumer=true even when LLM says isConcert=true', async () => {
    const venue = await seedTestVenue()
    const dateA = futureDate(7)

    // Seed an event with admin-overridden hidden_from_consumer=true.
    // Crawler re-extracts the same event with isConcert=true; should leave
    // the admin decision in place.
    await db.insert(events).values({
      venueId: venue.id,
      title: 'Originally Misclassified Show',
      artist: 'Test Artist',
      canonicalArtist: 'test artist',
      date: dateA,
      status: 'upcoming',
      hiddenFromConsumer: true,
      sourceHash: 'old-hash',
    })

    mockFetchPage.mockResolvedValue({
      html: HTML_BASE_V2, // different from any prior to bypass page-hash skip
      finalUrl: venue.url,
      httpStatus: 200,
    })
    mockExtractWithLlm.mockResolvedValue({
      events: [
        {
          title: 'Originally Misclassified Show — Updated',
          artist: 'Test Artist',
          date: dateA,
          confidence: 0.95,
          sourceUrl: venue.url,
          isConcert: true, // LLM disagrees with admin
        },
      ],
      usage: {
        inputTokens: 100,
        outputTokens: 50,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
      },
    })

    await crawlVenue(venue.id, mockBrowser)

    const [row] = await db
      .select({
        hiddenFromConsumer: events.hiddenFromConsumer,
        title: events.title,
      })
      .from(events)
      .where(eq(events.venueId, venue.id))

    // Admin override sticks; title updates as normal mutable field
    expect(row?.hiddenFromConsumer).toBe(true)
    expect(row?.title).toBe('Originally Misclassified Show — Updated')
  })
})
```

- [ ] **Step 2: Run the new tests and confirm they FAIL**

```bash
pnpm --filter=@concert-crawl/crawler-core test -- src/crawl.integration.test.ts -t 'non-concert auto-classification'
```

Expected: 4 failures. Current crawler doesn't read `isConcert` so all inserts produce `hidden_from_consumer = false` (the schema default). Tests asserting `true` will fail; the admin-override test will also fail because nothing was changed in the crawler yet — actually wait, the existing crawler doesn't touch `hiddenFromConsumer` on UPDATE either, so that test might pass before the implementation. Run anyway and confirm; either way the 3 INSERT tests fail.

- [ ] **Step 3: Add `hiddenFromConsumer` to the `eventValues` mapping**

In `packages/crawler-core/src/crawl.ts`, find the `eventValues = eventsToUpsert.map(...)` block (around line 591). Add `hiddenFromConsumer` after the `verified` line:

```typescript
        const eventValues = eventsToUpsert.map((event) => ({
          venueId,
          title: event.title,
          artist: event.artist,
          canonicalArtist: event.canonicalArtist,
          date: event.date,
          doorsTime:
            event.doorsTime && event.doorsTime !== '' ? event.doorsTime : null,
          showTime:
            event.showTime && event.showTime !== '' ? event.showTime : null,
          ticketUrl: event.ticketUrl ?? null,
          description: event.description ?? null,
          imageUrl: event.imageUrl ?? null,
          sourceUrl: event.sourceUrl,
          sourceHash: event.sourceHash,
          status: 'upcoming' as const,
          confidenceScore: event.confidence.toFixed(2),
          verified: event.confidence >= AUTO_APPROVE_THRESHOLD,
          extractionStrategy: strategy,
          // LLM-classified non-concert events get pre-hidden from the consumer
          // surface (#696). Only takes effect on INSERT — admin owns the field
          // once the row exists, so onConflictDoUpdate below does NOT include
          // hiddenFromConsumer in its `set` clause. Mirrors the one-way
          // promotion pattern for `artist` and `verified` already in this file.
          hiddenFromConsumer: event.isConcert === false,
        }))
```

Note `event.isConcert === false` (strict equality with `false`) — `undefined` and `true` both map to `hiddenFromConsumer: false`. That's the fail-open default.

- [ ] **Step 4: Verify `onConflictDoUpdate.set` does NOT include `hiddenFromConsumer`**

Inspect the `set` clause block (around line 632-652). It should NOT contain `hiddenFromConsumer`. If you accidentally added it during step 3, remove it. The existing fields in `set` are: `title`, `doorsTime`, `showTime`, `ticketUrl`, `description`, `imageUrl`, `status`, `extractionStrategy`, `confidenceScore`, `sourceHash`, `updatedAt`, `verified`. `hiddenFromConsumer` does NOT belong here.

- [ ] **Step 5: Run the new tests and confirm they PASS**

```bash
pnpm --filter=@concert-crawl/crawler-core test -- src/crawl.integration.test.ts -t 'non-concert auto-classification'
```

Expected: 4 pass.

- [ ] **Step 6: Run the full crawl integration test suite to ensure no regressions**

```bash
pnpm --filter=@concert-crawl/crawler-core test
```

Expected: all pass.

- [ ] **Step 7: Run typecheck + lint to catch any cross-package issues**

```bash
pnpm --filter=@concert-crawl/crawler-core typecheck
pnpm --filter=@concert-crawl/crawler-core lint
```

Expected: zero errors. The `NormalizedEvent.isConcert?: boolean` addition from Task 1 plus the new field in `eventValues` should be typecheck-clean since `events.hiddenFromConsumer` already exists in the Drizzle schema (added in PR 6).

- [ ] **Step 8: Commit**

```bash
git add packages/crawler-core/src/crawl.ts packages/crawler-core/src/crawl.integration.test.ts
git commit -m "feat(crawler): set hidden_from_consumer on INSERT based on isConcert (#696)"
```

- [ ] **Step 9: Push, open PR 1, request Copilot review**

```bash
git push -u origin feat/non-concert-classification-pr1
gh pr create --title "feat(crawler): non-concert auto-classification — LLM + crawler INSERT (#696, PR 1/2)" --body "$(cat <<'EOF'
## What does this PR do?

PR 1 of 2 for non-concert auto-classification (issue #696, spec `docs/superpowers/specs/2026-06-18-non-concert-auto-classification-design.md`).

Wires \`isConcert\` through the LLM extractor → crawler INSERT pipeline:
- LLM emits \`isConcert: boolean\` per event (tool schema requires it; Zod accepts optional for defensive parsing)
- Prompt tightened with concrete concert / non-concert examples (themed parties, bingo, movies, etc.)
- Crawler INSERT path sets \`hidden_from_consumer = true\` when \`isConcert === false\`
- Crawler UPDATE path (re-crawls) never touches \`hidden_from_consumer\` — admin owns it once the row exists

## How to test

Tests cover all paths:
- Unit: \`llm.test.ts\` 3 new cases (true, false, omitted defaults to undefined)
- Integration: \`crawl.integration.test.ts\` 4 new cases (INSERT true, INSERT false, INSERT omitted, UPDATE preserves admin override)
- All existing crawler-core tests pass

## Out of scope for this PR

- Backfill of existing events (that's PR 2)
- Admin "Mark as concert" override UI (deferred to v2 based on observed misclassification rate)

Closes part of #696. PR 2 (backfill script) follows.
EOF
)"

PR_NUM=$(gh pr view --json number -q .number)
gh api -X POST "/repos/HartiganHM/concert-crawl/pulls/$PR_NUM/requested_reviewers" --input - <<'EOF'
{"reviewers": ["copilot-pull-request-reviewer[bot]"]}
EOF
```

Verify the response includes `copilot-pull-request-reviewer[bot]` in `requested_reviewers[].login`. Address review feedback per `superpowers:receiving-code-review` skill.

---

## PR 2 — Backfill Script

Branch: `feat/non-concert-classification-pr2-backfill` (branch off main after PR 1 merges).

### Task 3: One-shot LLM backfill script with dry-run + `--commit`

Create a script that batches existing events through Haiku, classifies each, writes a dry-run CSV by default, commits to DB on `--commit`. End state: operator runs locally → reviews CSV → re-runs with `--commit` on staging → reviews → repeats on prod.

**Files:**
- Create: `scripts/2026-06-19-non-concert-backfill.ts` (date subject to actual ship day; uses the existing `scripts/YYYY-MM-DD-<topic>.{ts,sql}` convention seen in `scripts/2026-06-17-event-canonical-artist-consolidate.sql` and `scripts/2026-06-16-event-date-utc-backfill.sql`)
- Test: `scripts/2026-06-19-non-concert-backfill.test.ts` (alongside)

**Interfaces:**
- Consumes: existing Drizzle `db`, `events`, `venues` exports from `@concert-crawl/db`. Anthropic SDK via `@anthropic-ai/sdk`.
- Produces: a CSV file at `./non-concert-backfill-dry-run-YYYY-MM-DDTHH-MM-SS.csv` (default), or DB writes when `--commit`. Exit code 0 on success, 1 on classification errors (script aborts before commit if any batch fails).

- [ ] **Step 1: Write failing test for batching logic**

Create `scripts/2026-06-19-non-concert-backfill.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { buildBatches, formatCsvRow } from './2026-06-19-non-concert-backfill.js'

describe('non-concert-backfill — buildBatches', () => {
  it('splits events into batches of the configured size', () => {
    const events = Array.from({ length: 53 }, (_, idx) => ({
      id: `evt-${idx}`,
      title: `Show ${idx}`,
      artist: `Artist ${idx}`,
      description: null,
      date: '2026-08-01',
      venueName: 'Test Venue',
      currentHidden: false,
    }))
    const batches = buildBatches(events, 25)
    expect(batches).toHaveLength(3) // 25 + 25 + 3
    expect(batches[0]).toHaveLength(25)
    expect(batches[1]).toHaveLength(25)
    expect(batches[2]).toHaveLength(3)
  })

  it('returns single batch when input fits in one batch', () => {
    const events = Array.from({ length: 10 }, (_, idx) => ({
      id: `evt-${idx}`,
      title: `Show ${idx}`,
      artist: `A`,
      description: null,
      date: '2026-08-01',
      venueName: 'V',
      currentHidden: false,
    }))
    const batches = buildBatches(events, 25)
    expect(batches).toHaveLength(1)
    expect(batches[0]).toHaveLength(10)
  })

  it('returns empty array for empty input', () => {
    expect(buildBatches([], 25)).toEqual([])
  })
})

describe('non-concert-backfill — formatCsvRow', () => {
  it('quotes fields containing commas', () => {
    const row = formatCsvRow({
      eventId: 'abc-123',
      title: 'Show, with, commas',
      artist: 'Artist A',
      date: '2026-08-01',
      venueName: 'Venue Name',
      currentHidden: false,
      llmIsConcert: true,
      wouldChange: false,
    })
    expect(row).toContain('"Show, with, commas"')
  })

  it('escapes embedded double quotes by doubling them (RFC 4180)', () => {
    const row = formatCsvRow({
      eventId: 'abc-123',
      title: 'Show "with" quotes',
      artist: 'Artist',
      date: '2026-08-01',
      venueName: 'Venue',
      currentHidden: false,
      llmIsConcert: true,
      wouldChange: false,
    })
    expect(row).toContain('"Show ""with"" quotes"')
  })

  it('marks wouldChange=true when currentHidden differs from llmIsConcert', () => {
    // currentHidden=false + llmIsConcert=false → would change (hide)
    const row = formatCsvRow({
      eventId: 'abc-123',
      title: 'Bingo Night',
      artist: 'BASS BINGO',
      date: '2026-08-01',
      venueName: 'Larimer',
      currentHidden: false,
      llmIsConcert: false,
      wouldChange: true,
    })
    expect(row).toContain(',true\n')
  })
})
```

- [ ] **Step 2: Run failing test to confirm it FAILS**

```bash
pnpm --filter=. test -- scripts/2026-06-19-non-concert-backfill.test.ts
```

Expected: FAIL — file doesn't exist yet.

- [ ] **Step 3: Create the script skeleton with the two pure functions**

Create `scripts/2026-06-19-non-concert-backfill.ts`:

```typescript
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
import { and, eq, gte, inArray, sql } from 'drizzle-orm'
import { db, events, venues } from '@concert-crawl/db'

const MODEL = 'claude-haiku-4-5-20251001'
const BATCH_SIZE = 25

export interface EventForClassification {
  id: string
  title: string
  artist: string
  description: string | null
  date: string
  venueName: string
  currentHidden: boolean
}

export interface ClassificationResult {
  eventId: string
  title: string
  artist: string
  date: string
  venueName: string
  currentHidden: boolean
  llmIsConcert: boolean
  wouldChange: boolean
}

export function buildBatches<T>(items: T[], batchSize: number): T[][] {
  const batches: T[][] = []
  for (let idx = 0; idx < items.length; idx += batchSize) {
    batches.push(items.slice(idx, idx + batchSize))
  }
  return batches
}

export function formatCsvRow(result: ClassificationResult): string {
  const escape = (val: string): string => {
    if (val.includes(',') || val.includes('"') || val.includes('\n')) {
      return `"${val.replace(/"/g, '""')}"`
    }
    return val
  }
  return [
    result.eventId,
    escape(result.title),
    escape(result.artist),
    result.date,
    escape(result.venueName),
    String(result.currentHidden),
    String(result.llmIsConcert),
    String(result.wouldChange),
  ].join(',') + '\n'
}

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

interface BatchClassification {
  eventId: string
  isConcert: boolean
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
    .catch((err) => {
      console.error('Backfill failed:', err)
      process.exit(1)
    })
}
```

Note the `(cls as { eventId: unknown })` access pattern — this is a narrow type guard, not an `as` cast over the wire (the global constraint allows narrowing within a guard chain after a structural check via `'key' in obj`).

- [ ] **Step 4: Run unit tests and confirm they PASS**

```bash
pnpm --filter=. test -- scripts/2026-06-19-non-concert-backfill.test.ts
```

Expected: all unit tests pass. (These cover the pure functions; the LLM integration is exercised in step 5.)

- [ ] **Step 5: Manual smoke test against local DB**

The local DB should have seeded events from `pnpm db:seed`. Run:

```bash
pnpm tsx scripts/2026-06-19-non-concert-backfill.ts
```

Expected output:
- `Loaded N events for classification`
- `Split into M batches of 25`
- `Classifying batch K/M...` (one per batch)
- `Classification done. P/N events would change hidden_from_consumer.`
- `Dry-run CSV written to ./non-concert-backfill-dry-run-<ts>.csv`

Open the CSV and verify:
- Header row matches `event_id,title,artist,date,venue_name,current_hidden,llm_is_concert,would_change`
- `would_change=true` rows are at the top
- A reasonable sample looks correct (open-mic = concert, comedy show = non-concert)

If anything looks systematically wrong, stop and iterate on the prompt in `classifyBatch` before continuing.

- [ ] **Step 6: Commit**

```bash
git add scripts/2026-06-19-non-concert-backfill.ts scripts/2026-06-19-non-concert-backfill.test.ts
git commit -m "feat(scripts): non-concert auto-classification backfill — dry-run + --commit (#696)"
```

- [ ] **Step 7: Push, open PR 2, request Copilot review**

```bash
git push -u origin feat/non-concert-classification-pr2-backfill
gh pr create --title "feat(scripts): non-concert auto-classification backfill (#696, PR 2/2)" --body "$(cat <<'EOF'
## What does this PR do?

PR 2 of 2 for non-concert auto-classification (issue #696, spec \`docs/superpowers/specs/2026-06-18-non-concert-auto-classification-design.md\`). Companion to PR 1 which wired the crawler INSERT path.

One-shot LLM backfill script:
- Reads all upcoming events from the DB
- Batches them (25 per Haiku call) and classifies as concert / non-concert
- Default: writes a CSV diff for review (no DB writes)
- \`--commit\`: applies updates in a single transaction
- Idempotent: re-running with same inputs produces same classifications (modulo LLM nondeterminism, which should be near-zero for binary classification on clear examples)

## How to test

- Unit tests cover the pure helpers (\`buildBatches\`, \`formatCsvRow\`)
- Local smoke test in dry-run mode against seeded local DB
- Reviewer can manually verify CSV format + classifications

## How to use post-merge

1. \`pnpm tsx scripts/2026-06-19-non-concert-backfill.ts\` → CSV for review
2. Operator + Claude review CSV, spot-check classifications
3. \`DATABASE_URL=<staging> pnpm tsx scripts/2026-06-19-non-concert-backfill.ts\` → staging dry-run CSV
4. Review again; \`--commit\` against staging
5. Verify on consumer surface; if good, repeat against prod

## Cost

~\$0.30-0.50 per env run. ~1000 events × ~300 tokens / Haiku rates.

## Out of scope

- Recurring re-classification (one-shot; manual re-run if prompt is sharpened later)
- Admin override UI for false negatives (deferred — see spec)

Closes #696 (with PR 1).
EOF
)"

PR_NUM=$(gh pr view --json number -q .number)
gh api -X POST "/repos/HartiganHM/concert-crawl/pulls/$PR_NUM/requested_reviewers" --input - <<'EOF'
{"reviewers": ["copilot-pull-request-reviewer[bot]"]}
EOF
```

Verify the response includes `copilot-pull-request-reviewer[bot]` in `requested_reviewers[].login`. Address review feedback per `superpowers:receiving-code-review` skill.

---

## Post-merge rollout

After both PRs merge:

1. **Live crawls start classifying** automatically on next crawl cycle (PR 1's effect — no manual action). Within ~24h, new INSERTs include the correct `hidden_from_consumer` based on LLM classification.

2. **Run the backfill script locally** (PR 2 binary):
   - `pnpm tsx scripts/2026-06-19-non-concert-backfill.ts`
   - Open the CSV, review the would_change=true rows
   - Spot-check: are obvious bingo / movie / comedy events marked as `llm_is_concert=false`? Are obvious concerts marked `true`?
   - If systematically wrong, file follow-up issue to iterate on the prompt (do not commit)

3. **Run against staging** with `--commit`:
   - `DATABASE_URL="<staging-connection-string>" pnpm tsx scripts/2026-06-19-non-concert-backfill.ts` → produces staging dry-run CSV
   - Review again
   - `DATABASE_URL="<staging>" pnpm tsx scripts/2026-06-19-non-concert-backfill.ts --commit`
   - Verify on staging consumer surface: visible non-concert count should drop materially

4. **Run against prod** with `--commit`:
   - Same flow; prod connection string. Per CLAUDE.md "Any destructive operation without explicit user confirmation" rule — pause for Hugh's explicit OK between the staging verify and the prod commit.

5. **Watch metrics for a week:**
   - Count of visible non-concert events on consumer feed (target: down >50% from pre-PR baseline)
   - Admin reports of misclassification (false positives / false negatives)
   - If false-negative rate is high (LLM incorrectly hiding real concerts), consider v2: prompt iteration + UI override affordance

---

## Self-review checklist

**Spec coverage:**
- ✅ "Reuse `hidden_from_consumer`, no schema changes" — confirmed in Task 2 step 3 (`hiddenFromConsumer` added to existing column write)
- ✅ "LLM tool schema gains isConcert" — Task 1 step 5
- ✅ "Prompt tightened with concert / non-concert examples" — Task 1 step 6
- ✅ "Crawler INSERT-only write rule" — Task 2 step 3+4 (explicitly NOT in onConflictDoUpdate.set)
- ✅ "Dry-run by default, --commit required" — Task 3 step 3 (CLI parsing + branching in `runBackfill`)
- ✅ "Backfill input is title + artist + description (not page re-fetch)" — Task 3 step 3 (`runBackfill` SELECT)
- ✅ "No new admin UI for v1" — out of scope, called out explicitly in PR descriptions
- ✅ "No new columns" — verified in `eventValues` mapping; no migration files in any task
- ✅ "Conventional commits" — all commit messages in plan use `feat:` / `chore:` prefixes
- ✅ "No `as` casts over the wire" — Task 3 uses `'key' in obj` narrowing pattern

**Type consistency:** `NormalizedEvent.isConcert?: boolean` defined in Task 1 (types.ts) matches the field added to `NormalizedEventSchema` in Task 1 (Zod) matches the read in Task 2 (`event.isConcert === false`). `EventForClassification`, `ClassificationResult`, and `BatchClassification` defined once in Task 3 and reused throughout.

**Placeholder scan:** No "TBD" / "TODO" / "similar to" — every step has full code + commands + expected output.
