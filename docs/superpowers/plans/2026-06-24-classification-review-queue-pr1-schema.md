# Classification Review Queue — PR 1: Schema + LLM signal + crawler INSERT

> **Sub-plan of:** [`2026-06-24-classification-review-queue.md`](2026-06-24-classification-review-queue.md) — read the index first for Goal, Architecture, Global Constraints, and File Structure.
> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**What this PR ships:** Migration 0042 (`events.is_concert_review_needed` column), `reviewNeeded` field on the LLM `save_events` tool schema + Zod + `IS_CONCERT_RULES` prompt block + `NormalizedEvent` TS type, and the crawler INSERT mapping that writes the column. No UI, no API change, no backfill — those land in PRs 2 + 3. Ships independently; next crawl after deploy starts populating the column.

**Dependencies:** none. Can land first.

---

# PR 1 — Schema migration + LLM signal + crawler INSERT

### Task 1.1: Create worktree + branch + env files

**Files:**
- Create: `.worktrees/feat-classification-review-schema/` (worktree dir)

**Interfaces:**
- Produces: a clean worktree at `.worktrees/feat-classification-review-schema/` with `.env.local` files in place, on branch `feat/classification-review-schema`.

- [ ] **Step 1: Create the worktree**

```bash
git worktree add .worktrees/feat-classification-review-schema -b feat/classification-review-schema
```

- [ ] **Step 2: Copy local env files into the worktree**

```bash
cp apps/web/.env.local .worktrees/feat-classification-review-schema/apps/web/.env.local
cp apps/api/.env.local .worktrees/feat-classification-review-schema/apps/api/.env.local
cp apps/crawler/.env.local .worktrees/feat-classification-review-schema/apps/crawler/.env.local
```

- [ ] **Step 3: Install + sanity check**

```bash
cd .worktrees/feat-classification-review-schema
pnpm install
pnpm typecheck
```

Expected: typecheck passes (the worktree is at a clean main).

All remaining tasks for PR 1 run inside `.worktrees/feat-classification-review-schema/`.

---

### Task 1.2: Add `is_concert_review_needed` column migration

**Files:**
- Create: `packages/db/migrations/0042_events_is_concert_review_needed.sql`
- Modify: `packages/db/migrations/meta/_journal.json` (append 0042 entry)
- Modify: `packages/db/src/schema/events.ts:75-78` (add column accessor next to `hiddenFromConsumer`)

**Interfaces:**
- Produces: `events.isConcertReviewNeeded` Drizzle column of type `boolean`, NOT NULL, default `false`. Available via `import { events } from '@concert-crawl/db'` → `events.isConcertReviewNeeded`.

- [ ] **Step 1: Write the failing schema test**

Add to `packages/db/src/schema.test.ts` (locate the existing `events` table assertions; add this in the same `describe` block):

```typescript
it('events has is_concert_review_needed column with NOT NULL DEFAULT FALSE', async () => {
  const result = await db.execute<{
    column_name: string
    data_type: string
    is_nullable: string
    column_default: string | null
  }>(
    sql`SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'events' AND column_name = 'is_concert_review_needed'`,
  )
  expect(result.rows).toHaveLength(1)
  expect(result.rows[0]?.data_type).toBe('boolean')
  expect(result.rows[0]?.is_nullable).toBe('NO')
  expect(result.rows[0]?.column_default).toBe('false')
})
```

- [ ] **Step 2: Run the test, verify it fails**

```bash
pnpm --filter @concert-crawl/db test schema.test
```

Expected: FAIL — column does not exist.

- [ ] **Step 3: Write the migration SQL**

Create `packages/db/migrations/0042_events_is_concert_review_needed.sql`:

```sql
-- LLM-classifier uncertainty signal for the isConcert predicate. Written
-- once on INSERT by the crawler's LLM extractor when the model emits
-- reviewNeeded=true; left untouched on re-crawl (crawler-frozen, mirroring
-- the hidden_from_consumer convention from migration 0039). A one-shot
-- backfill script may UPDATE this column to refresh against the latest
-- prompt. Admin actions on hidden_from_consumer never touch this column —
-- the bit reflects the LLM's view, not the admin's resolution.
--
-- Expand-only: NOT NULL DEFAULT FALSE so no existing row changes behavior
-- on rollout. Rolling back the code is sufficient if abort is needed —
-- the column stays in place with no data loss. No partial index pre-
-- emptively; at ~3K events the chip's hidden_from_consumer=true AND
-- is_concert_review_needed=true scan is small. Revisit at ~10K corpus.

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS is_concert_review_needed BOOLEAN NOT NULL DEFAULT FALSE;
```

- [ ] **Step 4: Add the journal entry**

Open `packages/db/migrations/meta/_journal.json`. The last entry is `idx: 41, when: 1782604800000, tag: "0041_admin_contest_review"`. Append:

```json
    {
      "idx": 42,
      "version": "7",
      "when": 1782691200000,
      "tag": "0042_events_is_concert_review_needed",
      "breakpoints": true
    }
```

(Note: `1782691200000` = 1 day after 0041. If you regenerated via `pnpm drizzle-kit generate`, verify `when` is greater than `1782604800000` and hand-edit if not.)

- [ ] **Step 5: Add the Drizzle column accessor**

In `packages/db/src/schema/events.ts`, after the `hiddenFromConsumer` column (line 78):

```typescript
    hiddenFromConsumer: boolean('hidden_from_consumer')
      .notNull()
      .default(false),
    // LLM-classifier uncertainty signal for the isConcert predicate. Set
    // by the crawler INSERT path when the LLM emits reviewNeeded=true;
    // crawler-frozen on UPDATE. Written symmetrically (both true and
    // false isConcert classifications) but only the hidden-and-flagged
    // slice surfaces in the admin UI today. The one-shot backfill script
    // (scripts/2026-06-24-isconcert-review-needed-backfill.ts) is the
    // only post-INSERT writer. Admin actions never touch this column.
    isConcertReviewNeeded: boolean('is_concert_review_needed')
      .notNull()
      .default(false),
```

- [ ] **Step 6: Run the migration locally + re-run the test**

```bash
pnpm db:migrate
pnpm --filter @concert-crawl/db test schema.test
```

Expected: migration applies cleanly, schema test PASSES.

- [ ] **Step 7: Commit**

```bash
git add packages/db/migrations/0042_events_is_concert_review_needed.sql \
        packages/db/migrations/meta/_journal.json \
        packages/db/src/schema/events.ts \
        packages/db/src/schema.test.ts
git commit -m "feat(db): add events.is_concert_review_needed column"
```

---

### Task 1.3: Add `reviewNeeded` to `NormalizedEvent` + LLM Zod schema

**Files:**
- Modify: `packages/crawler-core/src/types.ts:1-13`
- Modify: `packages/crawler-core/src/lib/extractors/llm.ts:13-23` (NormalizedEventSchema)

**Interfaces:**
- Consumes: nothing.
- Produces: `NormalizedEvent.reviewNeeded?: boolean`. Zod schema in `llm.ts` accepts `reviewNeeded: z.boolean().optional()`. The output mapping at `llm.ts:184-197` includes it conditionally.

- [ ] **Step 1: Write failing test (Zod round-trip)**

Add to `packages/crawler-core/src/lib/extractors/llm.test.ts`, after the existing `isConcert` tests (around line 215):

```typescript
it('returns reviewNeeded=true when the LLM emits it (borderline event)', async () => {
  const mockEvents = [
    {
      title: 'PRESIDENT: North American Campaign 2026',
      artist: 'PRESIDENT',
      date: '2026-08-15',
      confidence: 0.7,
      isConcert: false,
      reviewNeeded: true,
    },
  ]
  mockCreate.mockResolvedValue(makeAnthropicResponse(mockEvents))
  const result = await extractWithLlm('<html>...</html>', SOURCE_URL)
  expect(result.events).toHaveLength(1)
  expect(result.events[0]?.reviewNeeded).toBe(true)
})

it('returns reviewNeeded=false when the LLM emits it (unambiguous event)', async () => {
  const mockEvents = [
    {
      title: 'Wynonna Judd Live',
      artist: 'Wynonna Judd',
      date: '2026-08-15',
      confidence: 0.95,
      isConcert: true,
      reviewNeeded: false,
    },
  ]
  mockCreate.mockResolvedValue(makeAnthropicResponse(mockEvents))
  const result = await extractWithLlm('<html>...</html>', SOURCE_URL)
  expect(result.events).toHaveLength(1)
  expect(result.events[0]?.reviewNeeded).toBe(false)
})

it('defaults reviewNeeded to undefined when the LLM omits the field', async () => {
  const mockEvents = [
    {
      title: 'Open Mic',
      artist: 'Various',
      date: '2026-08-15',
      confidence: 0.6,
      isConcert: true,
      // reviewNeeded intentionally omitted
    },
  ]
  mockCreate.mockResolvedValue(makeAnthropicResponse(mockEvents))
  const result = await extractWithLlm('<html>...</html>', SOURCE_URL)
  expect(result.events).toHaveLength(1)
  expect(result.events[0]?.reviewNeeded).toBeUndefined()
})
```

- [ ] **Step 2: Run the tests, verify they fail**

```bash
pnpm --filter @concert-crawl/crawler-core test llm.test
```

Expected: all three new tests FAIL — `reviewNeeded` not surfaced through extractWithLlm.

- [ ] **Step 3: Add the field to `NormalizedEvent`**

In `packages/crawler-core/src/types.ts`, after line 12:

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
  reviewNeeded?: boolean
}
```

- [ ] **Step 4: Extend the Zod schema in `llm.ts`**

In `packages/crawler-core/src/lib/extractors/llm.ts:13-23`, change:

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
  reviewNeeded: z.boolean().optional(),
})
```

- [ ] **Step 5: Pass `reviewNeeded` through the output mapping**

In `packages/crawler-core/src/lib/extractors/llm.ts`, after line 196 (the `isConcert` spread), add:

```typescript
    ...(evt.reviewNeeded != null && { reviewNeeded: evt.reviewNeeded }),
```

So the mapping reads:

```typescript
  const events = parsed.data.events.map((evt) => ({
    title: evt.title,
    artist: evt.artist,
    date: evt.date,
    confidence: evt.confidence,
    sourceUrl,
    ...(evt.doorsTime != null &&
      evt.doorsTime !== '' && { doorsTime: evt.doorsTime }),
    ...(evt.showTime != null &&
      evt.showTime !== '' && { showTime: evt.showTime }),
    ...(evt.ticketUrl != null && { ticketUrl: evt.ticketUrl }),
    ...(evt.description != null && { description: evt.description }),
    ...(evt.isConcert != null && { isConcert: evt.isConcert }),
    ...(evt.reviewNeeded != null && { reviewNeeded: evt.reviewNeeded }),
  }))
```

- [ ] **Step 6: Run the tests, verify they pass**

```bash
pnpm --filter @concert-crawl/crawler-core test llm.test
```

Expected: all `reviewNeeded` tests PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/crawler-core/src/types.ts \
        packages/crawler-core/src/lib/extractors/llm.ts \
        packages/crawler-core/src/lib/extractors/llm.test.ts
git commit -m "feat(crawler-core): emit reviewNeeded from LLM extractor"
```

---

### Task 1.4: Update tool schema + IS_CONCERT_RULES prompt block

**Files:**
- Modify: `packages/crawler-core/src/lib/extractors/llm.ts:34-51` (IS_CONCERT_RULES const)
- Modify: `packages/crawler-core/src/lib/extractors/llm.ts:67-117` (SAVE_EVENTS_TOOL)

**Interfaces:**
- Consumes: existing `IS_CONCERT_RULES` block reference.
- Produces: updated prompt + tool input schema so the LLM is instructed to emit `reviewNeeded` and the tool's `required` array includes it.

- [ ] **Step 1: Write the failing prompt/tool tests**

Add to `packages/crawler-core/src/lib/extractors/llm.test.ts`:

```typescript
it('SAVE_EVENTS_TOOL declares reviewNeeded as a required boolean property', async () => {
  mockCreate.mockResolvedValue(makeAnthropicResponse([]))
  await extractWithLlm('<html>test</html>', SOURCE_URL)

  const call = mockCreate.mock.calls[0]?.[0]
  const tool = call.tools[0]
  expect(tool.name).toBe('save_events')
  const itemSchema = tool.input_schema.properties.events.items
  expect(itemSchema.properties.reviewNeeded).toEqual({
    type: 'boolean',
    description: expect.stringContaining('reasonable doubt'),
  })
  expect(itemSchema.required).toContain('reviewNeeded')
})

it('system prompt instructs the LLM to set reviewNeeded for borderline cases', async () => {
  mockCreate.mockResolvedValue(makeAnthropicResponse([]))
  await extractWithLlm('<html>test</html>', SOURCE_URL)

  const call = mockCreate.mock.calls[0]?.[0]
  const systemText: string = call.system[0].text
  expect(systemText).toContain('reviewNeeded')
  expect(systemText).toContain('ambiguous')
  expect(systemText).toContain('PRESIDENT')
})
```

- [ ] **Step 2: Run the tests, verify they fail**

```bash
pnpm --filter @concert-crawl/crawler-core test llm.test
```

Expected: FAIL — `reviewNeeded` not in tool schema, not in IS_CONCERT_RULES.

- [ ] **Step 3: Extend `IS_CONCERT_RULES`**

In `packages/crawler-core/src/lib/extractors/llm.ts`, replace the closing backtick of `IS_CONCERT_RULES` at line 51 to append the new block. The const now ends with:

```typescript
... Only treat as FALSE when the artist's name is clearly being used as a theme (their recordings being played back by unnamed DJs), as with "Olivia Rodrigo Dance Party" or "BASS BINGO – Wooli Edition".

For every classification, ALSO set reviewNeeded:
- true: you weighed both interpretations and the evidence is genuinely ambiguous. Examples:
  - Title contains a brand or made-up name (e.g. "PRESIDENT", "Levity Presents") with no obvious touring-artist signal but URL/venue framing implies a live act
  - Title uses "Presents" or "Featuring" but the named entity could be a DJ brand OR a live performer and the venue alone doesn't disambiguate
  - Title contains "LIVE" but the brand context is DJ/recorded-music culture
- false: the classification is unambiguous in either direction (clear band-tour announcement OR clear bingo/trivia/movie/lip-sync framing)

reviewNeeded is independent of isConcert — emit it whenever you had to choose between two plausible interpretations, regardless of which direction you ended up picking.`
```

- [ ] **Step 4: Add `reviewNeeded` to `SAVE_EVENTS_TOOL`**

In `packages/crawler-core/src/lib/extractors/llm.ts:104-112`, after the `isConcert` property definition:

```typescript
            isConcert: {
              type: 'boolean',
              description:
                'true if a concert (named musicians performing live music). false for non-concert events like themed parties, bingo, trivia, movies, comedy, listening parties, karaoke.',
            },
            reviewNeeded: {
              type: 'boolean',
              description:
                'true when you had reasonable doubt about the isConcert classification (genuinely ambiguous title/framing). false when the classification is unambiguous in either direction.',
            },
          },
          required: ['title', 'artist', 'date', 'confidence', 'isConcert', 'reviewNeeded'],
```

- [ ] **Step 5: Run the tests, verify they pass**

```bash
pnpm --filter @concert-crawl/crawler-core test llm.test
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/crawler-core/src/lib/extractors/llm.ts \
        packages/crawler-core/src/lib/extractors/llm.test.ts
git commit -m "feat(crawler-core): add reviewNeeded to LLM tool schema + prompt"
```

---

### Task 1.5: Wire crawler INSERT mapping + integration tests

**Files:**
- Modify: `packages/crawler-core/src/crawl.ts:642-644` (add sibling to `hiddenFromConsumer` in INSERT values)
- Modify: `packages/crawler-core/src/crawl.integration.test.ts` (add INSERT + UPDATE cases)

**Interfaces:**
- Consumes: `NormalizedEvent.reviewNeeded` from task 1.3.
- Produces: events INSERTed by the crawler have `isConcertReviewNeeded = (event.reviewNeeded === true)`. Re-crawls (the `onConflictDoUpdate` path) leave the column unchanged.

- [ ] **Step 1: Write failing INSERT integration test**

Add to `packages/crawler-core/src/crawl.integration.test.ts`, inside the `describe('crawlVenue — non-concert auto-classification (#696)', ...)` block (after the existing UPDATE-doesn't-overwrite case around line 829):

```typescript
it('INSERT path sets is_concert_review_needed=true when LLM returns reviewNeeded=true', async () => {
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
        title: 'PRESIDENT: North American Campaign 2026',
        artist: 'PRESIDENT',
        date: dateA,
        confidence: 0.7,
        sourceUrl: venue.url,
        isConcert: false,
        reviewNeeded: true,
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
      isConcertReviewNeeded: events.isConcertReviewNeeded,
    })
    .from(events)
    .where(eq(events.venueId, venue.id))

  expect(row?.hiddenFromConsumer).toBe(true)
  expect(row?.isConcertReviewNeeded).toBe(true)
})

it('INSERT path defaults is_concert_review_needed=false when LLM omits reviewNeeded', async () => {
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
        // reviewNeeded intentionally undefined
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
    .select({ isConcertReviewNeeded: events.isConcertReviewNeeded })
    .from(events)
    .where(eq(events.venueId, venue.id))

  expect(row?.isConcertReviewNeeded).toBe(false)
})

it('UPDATE path leaves is_concert_review_needed alone (crawler-frozen)', async () => {
  const venue = await seedTestVenue()
  const dateA = futureDate(7)

  // Seed an event with is_concert_review_needed=true (as if from a prior
  // crawl). Re-crawl with reviewNeeded=false; column should stay true.
  await db.insert(events).values({
    venueId: venue.id,
    title: 'Borderline Show',
    artist: 'Borderline Artist',
    canonicalArtist: 'borderline artist',
    date: dateA,
    status: 'upcoming',
    isConcertReviewNeeded: true,
    sourceHash: 'old-hash',
  })

  mockFetchPage.mockResolvedValue({
    html: HTML_BASE_V2,
    finalUrl: venue.url,
    httpStatus: 200,
  })
  mockExtractWithLlm.mockResolvedValue({
    events: [
      {
        title: 'Borderline Show — Updated',
        artist: 'Borderline Artist',
        date: dateA,
        confidence: 0.95,
        sourceUrl: venue.url,
        isConcert: true,
        reviewNeeded: false, // LLM now confident
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
      isConcertReviewNeeded: events.isConcertReviewNeeded,
      title: events.title,
    })
    .from(events)
    .where(eq(events.venueId, venue.id))

  expect(row?.isConcertReviewNeeded).toBe(true) // crawler-frozen
  expect(row?.title).toBe('Borderline Show — Updated') // mutable fields update normally
})
```

- [ ] **Step 2: Run the tests, verify they fail**

```bash
pnpm --filter @concert-crawl/crawler-core test crawl.integration
```

Expected: FAIL — `isConcertReviewNeeded` not present in INSERT values.

- [ ] **Step 3: Update the crawler INSERT mapping**

In `packages/crawler-core/src/crawl.ts`, find lines 638-644 (the `hiddenFromConsumer` block inside `eventValues`). Add a sibling line after `hiddenFromConsumer`:

```typescript
            // LLM-classified non-concert events get pre-hidden from the
            // consumer surface (#696). Only takes effect on INSERT — admin
            // owns the field once the row exists, so onConflictDoUpdate below
            // does NOT include hiddenFromConsumer in its `set` clause. Mirrors
            // the one-way promotion pattern for `artist` and `verified`
            // already in this file.
            hiddenFromConsumer: event.isConcert === false,
            // LLM-classifier uncertainty signal (#788). INSERT-only — the
            // onConflictDoUpdate `set` clause below intentionally excludes
            // this column so re-crawls don't churn the value. The one-shot
            // backfill script is the only post-INSERT writer.
            isConcertReviewNeeded: event.reviewNeeded === true,
```

Confirm that the `onConflictDoUpdate` `set` clause at lines 667-688 does NOT include `isConcertReviewNeeded` (it shouldn't — only mutable fields are listed there).

- [ ] **Step 4: Run the tests, verify they pass**

```bash
pnpm --filter @concert-crawl/crawler-core test crawl.integration
```

Expected: all three new tests PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/crawler-core/src/crawl.ts \
        packages/crawler-core/src/crawl.integration.test.ts
git commit -m "feat(crawler-core): write is_concert_review_needed on INSERT"
```

---

### Task 1.6: Pre-push checks + PR

**Files:**
- (none — verification only)

**Interfaces:**
- Produces: a green branch ready to push.

- [ ] **Step 1: Full test suite, typecheck, lint**

```bash
pnpm typecheck
pnpm lint
pnpm test
```

Expected: all green.

- [ ] **Step 2: Rebase + push**

```bash
git fetch origin
git rebase origin/main
# If rebase rewrote commits, use --force-with-lease; otherwise plain push.
git push -u origin feat/classification-review-schema
```

- [ ] **Step 3: Open PR**

```bash
gh pr create --title "feat: classification review queue — schema + LLM signal + crawler INSERT (PR 1/3)" --body "$(cat <<'EOF'
## Summary

PR 1 of 3 for the classification review queue (spec: `docs/superpowers/specs/2026-06-24-classification-review-queue-design.md`).

- Adds `events.is_concert_review_needed` column (migration 0042, NOT NULL DEFAULT FALSE)
- LLM `save_events` tool schema + `IS_CONCERT_RULES` prompt now require `reviewNeeded`
- `NormalizedEventSchema` Zod + `NormalizedEvent` TS type carry the field
- Crawler INSERT mapping writes the column from `event.reviewNeeded === true`
- `onConflictDoUpdate` does NOT touch the column (crawler-frozen on re-crawl)
- No UI, no API change, no backfill — those land in PRs 2 + 3

## Test plan

- [ ] `pnpm --filter @concert-crawl/db test schema.test` (column shape)
- [ ] `pnpm --filter @concert-crawl/crawler-core test llm.test` (Zod round-trip + tool schema + prompt)
- [ ] `pnpm --filter @concert-crawl/crawler-core test crawl.integration` (INSERT writes column, UPDATE doesn't)
- [ ] Trigger a venue crawl via staging admin > venue trigger button after deploy; verify a new event row has `is_concert_review_needed` populated (true or false depending on LLM)

## Env vars

None.

## Risk

Low. Expand-only column; ON CONFLICT path untouched; rollback by reverting code.
EOF
)"
```

- [ ] **Step 4: Request Copilot review**

```bash
PR=$(gh pr view --json number -q .number)
gh api -X POST "repos/HartiganHM/concert-crawl/pulls/${PR}/requested_reviewers" --input - <<< '{"reviewers":["copilot-pull-request-reviewer[bot]"]}'
# Verify the bot is actually requested:
gh api "repos/HartiganHM/concert-crawl/pulls/${PR}" --jq '.requested_reviewers[].login'
```

Expected output: `copilot-pull-request-reviewer[bot]`.

- [ ] **Step 5: Iterate Copilot reviews to merge bar**

Min 2 SUCCESSFUL Copilot rounds, no Crit/High/Medium remaining, apply valid Nits, skip invalid (push back via thread reply). Do not iterate to zero. Hand off to user for merge.

---

