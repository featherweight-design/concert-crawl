# Browse Filters Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the Price and Vibe filter chips on the Browse page to actually filter the event list, backed by a new LLM genre-tagging step in the crawler.

**Architecture:** Three independent layers — (1) a new `genre-tagger.ts` module in `packages/crawler-core` that classifies events via Claude Haiku and writes genres back to `events.genre` after each crawl, (2) two new query params (`filterPrice`, `filterVibe`) on `GET /v1/events` that apply WHERE clauses against `ticket_price_min` and the `genre` array, (3) a two-line change in the Browse page's `fetchEvents()` to forward those params to the API.

**Tech Stack:** Claude Haiku (`claude-haiku-4-5-20251001`), Drizzle ORM, Postgres array overlap operator (`&&`), Zod, Vitest, Hono, Next.js App Router

**Worktree:** `.worktrees/feat/browse-filters` on branch `feat/browse-filters`

---

## File Map

| File                                                 | Action     | Responsibility                                             |
| ---------------------------------------------------- | ---------- | ---------------------------------------------------------- |
| `packages/crawler-core/src/lib/genre-tagger.ts`      | **Create** | Anthropic call + result parsing; DB write of genres + cost |
| `packages/crawler-core/src/lib/genre-tagger.test.ts` | **Create** | Unit tests for `classifyGenres` (mock Anthropic)           |
| `packages/crawler-core/src/index.ts`                 | **Modify** | Export `tagEventsWithGenres`                               |
| `apps/crawler/src/run.ts`                            | **Modify** | Call `tagEventsWithGenres` after each venue crawl          |
| `apps/api/src/routes/events.ts`                      | **Modify** | Add `filterPrice` + `filterVibe` params and WHERE clauses  |
| `apps/api/src/routes/events.integration.test.ts`     | **Modify** | Integration tests for price + vibe filtering               |
| `apps/web/src/app/(protected)/events/page.tsx`       | **Modify** | Forward `filterPrice` + `filterVibe` to the API            |

All work is done inside the worktree at `.worktrees/feat/browse-filters`. Every `git` command below should be run from that directory.

---

## Task 1: Genre Tagger — Write Failing Unit Tests

**Files:**

- Create: `packages/crawler-core/src/lib/genre-tagger.test.ts`

- [ ] **Step 1: Create the test file**

```typescript
// packages/crawler-core/src/lib/genre-tagger.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockCreate = vi.fn()

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: { create: mockCreate },
  })),
}))

// Dynamic import after mock registration
const { classifyGenres } = await import('./genre-tagger.js')

function makeToolResponse(
  results: { eventId: string; genres: string[] }[],
  usage = {
    input_tokens: 100,
    output_tokens: 50,
    cache_read_input_tokens: 0,
    cache_creation_input_tokens: 0,
  },
) {
  return {
    content: [
      {
        type: 'tool_use',
        id: 'tool_abc',
        name: 'tag_genres',
        input: { results },
      },
    ],
    usage,
  }
}

describe('classifyGenres', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns tagged results with token usage', async () => {
    mockCreate.mockResolvedValue(
      makeToolResponse([{ eventId: 'evt-uuid-1', genres: ['metal', 'rock'] }]),
    )

    const { results, tokenUsage } = await classifyGenres([
      { id: 'evt-uuid-1', title: 'Metal Night', artist: 'Metallica' },
    ])

    expect(results).toHaveLength(1)
    expect(results[0]?.genres).toContain('metal')
    expect(results[0]?.genres).toContain('rock')
    expect(tokenUsage.inputTokens).toBe(100)
    expect(tokenUsage.outputTokens).toBe(50)
  })

  it('sends system prompt with cache_control ephemeral', async () => {
    mockCreate.mockResolvedValue(makeToolResponse([]))

    await classifyGenres([
      { id: 'evt-uuid-1', title: 'Test', artist: 'Artist' },
    ])

    const call = mockCreate.mock.calls[0]?.[0]
    expect(Array.isArray(call.system)).toBe(true)
    expect(call.system[0].cache_control).toEqual({ type: 'ephemeral' })
  })

  it('uses claude-haiku-4-5-20251001 model', async () => {
    mockCreate.mockResolvedValue(makeToolResponse([]))

    await classifyGenres([
      { id: 'evt-uuid-1', title: 'Test', artist: 'Artist' },
    ])

    const call = mockCreate.mock.calls[0]?.[0]
    expect(call.model).toBe('claude-haiku-4-5-20251001')
  })

  it('forces tag_genres tool choice', async () => {
    mockCreate.mockResolvedValue(makeToolResponse([]))

    await classifyGenres([
      { id: 'evt-uuid-1', title: 'Test', artist: 'Artist' },
    ])

    const call = mockCreate.mock.calls[0]?.[0]
    expect(call.tool_choice).toEqual({ type: 'tool', name: 'tag_genres' })
  })

  it('returns empty results when response has no tool_use block', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'oops' }],
      usage: {
        input_tokens: 10,
        output_tokens: 5,
        cache_read_input_tokens: 0,
        cache_creation_input_tokens: 0,
      },
    })

    const { results } = await classifyGenres([
      { id: 'evt-uuid-1', title: 'Test', artist: 'Artist' },
    ])

    expect(results).toHaveLength(0)
  })

  it('maps cache token usage correctly', async () => {
    mockCreate.mockResolvedValue(
      makeToolResponse([], {
        input_tokens: 200,
        output_tokens: 30,
        cache_read_input_tokens: 5000,
        cache_creation_input_tokens: 8000,
      }),
    )

    const { tokenUsage } = await classifyGenres([])
    expect(tokenUsage.cacheReadTokens).toBe(5000)
    expect(tokenUsage.cacheWriteTokens).toBe(8000)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd .worktrees/feat/browse-filters
pnpm --filter @concert-crawl/crawler-core test -- --reporter=verbose genre-tagger
```

Expected: 6 failures — `genre-tagger.js` does not exist yet.

---

## Task 2: Genre Tagger — Implement to Pass Tests

**Files:**

- Create: `packages/crawler-core/src/lib/genre-tagger.ts`

- [ ] **Step 1: Create genre-tagger.ts**

```typescript
// packages/crawler-core/src/lib/genre-tagger.ts
import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import { and, eq, isNull } from 'drizzle-orm'
import { db, events, costTracking } from '@concert-crawl/db'
import { createLogger } from '@concert-crawl/logger'
import { calculateCost } from './cost.js'
import type { TokenUsage } from '../types.js'

const logger = createLogger('genre-tagger')
const MODEL = 'claude-haiku-4-5-20251001'

export type GenreLabel =
  | 'rock'
  | 'indie'
  | 'hip-hop'
  | 'electronic'
  | 'country'
  | 'jazz'
  | 'pop'
  | 'metal'

export interface GenreTagInput {
  id: string
  title: string
  artist: string
}

interface GenreTagResult {
  eventId: string
  genres: GenreLabel[]
}

const SYSTEM_PROMPT = `You are a music genre classifier. Given concert events, classify each into 1–3 genres from this list only: rock, indie, hip-hop, electronic, country, jazz, pop, metal.

Rules:
- Only use genres from the list above — no other values allowed
- Prefer fewer genres over more when uncertain
- Base classification on artist name and event title`

const TAG_GENRES_TOOL: Anthropic.Tool = {
  name: 'tag_genres',
  description: 'Tag each concert event with genre labels',
  input_schema: {
    type: 'object' as const,
    properties: {
      results: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            eventId: { type: 'string', description: 'The event UUID' },
            genres: {
              type: 'array',
              items: {
                type: 'string',
                enum: [
                  'rock',
                  'indie',
                  'hip-hop',
                  'electronic',
                  'country',
                  'jazz',
                  'pop',
                  'metal',
                ],
              },
              description: '1–3 genre labels for this event',
            },
          },
          required: ['eventId', 'genres'],
        },
      },
    },
    required: ['results'],
  },
}

const TagResponseSchema = z.object({
  results: z.array(
    z.object({
      eventId: z.string().uuid(),
      genres: z.array(
        z.enum([
          'rock',
          'indie',
          'hip-hop',
          'electronic',
          'country',
          'jazz',
          'pop',
          'metal',
        ]),
      ),
    }),
  ),
})

export async function classifyGenres(eventInputs: GenreTagInput[]): Promise<{
  results: GenreTagResult[]
  tokenUsage: TokenUsage
}> {
  const client = new Anthropic()

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    tools: [TAG_GENRES_TOOL],
    tool_choice: { type: 'tool', name: 'tag_genres' },
    system: [
      {
        type: 'text',
        text: SYSTEM_PROMPT,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [
      {
        role: 'user',
        content: `Tag these concert events with genres:\n${JSON.stringify(
          eventInputs.map((ev) => ({
            id: ev.id,
            title: ev.title,
            artist: ev.artist,
          })),
        )}`,
      },
    ],
  })

  const usage = response.usage
  const tokenUsage: TokenUsage = {
    inputTokens: usage.input_tokens,
    outputTokens: usage.output_tokens,
    cacheReadTokens: usage.cache_read_input_tokens ?? 0,
    cacheWriteTokens: usage.cache_creation_input_tokens ?? 0,
  }

  const toolBlock = response.content.find((bl) => bl.type === 'tool_use')
  if (!toolBlock || toolBlock.type !== 'tool_use') {
    logger.error('genre-tagger: no tool_use block in response')
    return { results: [], tokenUsage }
  }

  const parsed = TagResponseSchema.safeParse(toolBlock.input)
  if (!parsed.success) {
    logger.error(
      { error: parsed.error.message },
      'genre-tagger: invalid tool response schema',
    )
    return { results: [], tokenUsage }
  }

  return { results: parsed.data.results, tokenUsage }
}

export async function tagEventsWithGenres(
  venueId: string,
  crawlRunId?: string,
): Promise<void> {
  const untagged = await db
    .select({ id: events.id, title: events.title, artist: events.artist })
    .from(events)
    .where(and(eq(events.venueId, venueId), isNull(events.genre)))

  if (untagged.length === 0) {
    logger.info({ venueId }, 'No untagged events — skipping genre tagging')
    return
  }

  logger.info({ venueId, count: untagged.length }, 'Tagging events with genres')

  try {
    const { results, tokenUsage } = await classifyGenres(untagged)

    for (const { eventId, genres } of results) {
      await db
        .update(events)
        .set({ genre: genres })
        .where(eq(events.id, eventId))
    }

    const costUsd = calculateCost(tokenUsage)
    await db.insert(costTracking).values({
      service: 'genre-tagger',
      costUsd: costUsd.toFixed(6),
      tokensUsed: String(tokenUsage.inputTokens + tokenUsage.outputTokens),
      metadata: JSON.stringify({
        crawlRunId,
        venueId,
        eventsTagged: results.length,
        ...tokenUsage,
      }),
    })

    logger.info(
      { venueId, eventsTagged: results.length, costUsd },
      'Genre tagging complete',
    )
  } catch (err) {
    logger.error(
      { err, venueId },
      'Genre tagging failed — events will retry on next crawl',
    )
  }
}
```

- [ ] **Step 2: Run tests to verify they pass**

```bash
pnpm --filter @concert-crawl/crawler-core test -- --reporter=verbose genre-tagger
```

Expected: 6 passing.

- [ ] **Step 3: Commit**

```bash
git add packages/crawler-core/src/lib/genre-tagger.ts packages/crawler-core/src/lib/genre-tagger.test.ts
git commit -m "feat(crawler-core): add genre-tagger module with classifyGenres + tagEventsWithGenres"
```

---

## Task 3: Export Genre Tagger + Wire into run.ts

**Files:**

- Modify: `packages/crawler-core/src/index.ts`
- Modify: `apps/crawler/src/run.ts`

- [ ] **Step 1: Export from crawler-core index**

Add one line to `packages/crawler-core/src/index.ts`:

```typescript
// packages/crawler-core/src/index.ts — full file after edit:
export type { NormalizedEvent, TokenUsage, LLMResult } from './types.js'
export { isAllowed } from './lib/robots.js'
export { fetchPage } from './lib/fetcher.js'
export type { FetchResult } from './lib/fetcher.js'
export { extractJsonLd } from './lib/extractors/json-ld.js'
export { extractWithLlm } from './lib/extractors/llm.js'
export { calculateCost } from './lib/cost.js'
export { crawlVenue } from './crawl.js'
export { tagEventsWithGenres } from './lib/genre-tagger.js'
export type { GenreLabel, GenreTagInput } from './lib/genre-tagger.js'
```

- [ ] **Step 2: Wire into run.ts**

Replace the import line and add `tagEventsWithGenres` calls in both functions. Full updated `apps/crawler/src/run.ts`:

```typescript
import { createLogger } from '@concert-crawl/logger'
import { db, venues, crawlTriggers } from '@concert-crawl/db'
import { eq, and } from 'drizzle-orm'
import { crawlVenue, tagEventsWithGenres } from '@concert-crawl/crawler-core'

const logger = createLogger('crawler')
const MAX_CONCURRENT = 3

export async function runTriggeredCrawls(): Promise<{ processed: number }> {
  const claimed = await db
    .update(crawlTriggers)
    .set({ status: 'processing', updatedAt: new Date() })
    .where(eq(crawlTriggers.status, 'pending'))
    .returning({ id: crawlTriggers.id, venueId: crawlTriggers.venueId })

  if (claimed.length === 0) {
    logger.info('No pending crawl triggers')
    return { processed: 0 }
  }

  logger.info({ count: claimed.length }, 'Processing pending crawl triggers')

  for (const trigger of claimed) {
    try {
      const crawlRun = await crawlVenue(trigger.venueId)
      await tagEventsWithGenres(trigger.venueId, crawlRun.id)
      const triggerStatus = crawlRun.status === 'failed' ? 'failed' : 'done'
      await db
        .update(crawlTriggers)
        .set({
          status: triggerStatus,
          crawlRunId: crawlRun.id,
          updatedAt: new Date(),
        })
        .where(eq(crawlTriggers.id, trigger.id))
    } catch (err) {
      logger.error(
        { err, triggerId: trigger.id, venueId: trigger.venueId },
        'Triggered crawl threw unexpectedly',
      )
      await db
        .update(crawlTriggers)
        .set({ status: 'failed', updatedAt: new Date() })
        .where(eq(crawlTriggers.id, trigger.id))
    }
  }

  return { processed: claimed.length }
}

export async function runDailyCrawl(): Promise<{
  succeeded: number
  failed: number
  total: number
}> {
  logger.info('Starting daily crawl')

  const activeVenues = await db
    .select({ id: venues.id, name: venues.name })
    .from(venues)
    .where(and(eq(venues.active, true), eq(venues.verified, true)))

  logger.info({ venueCount: activeVenues.length }, 'Fetched active venues')

  let succeeded = 0
  let failed = 0

  for (
    let batchStart = 0;
    batchStart < activeVenues.length;
    batchStart += MAX_CONCURRENT
  ) {
    const batch = activeVenues.slice(batchStart, batchStart + MAX_CONCURRENT)
    const results = await Promise.allSettled(
      batch.map((venue) => crawlVenue(venue.id)),
    )

    for (const [idx, result] of results.entries()) {
      const venue = batch[idx]
      if (result.status === 'fulfilled') {
        succeeded++
        logger.info(
          { venueId: venue?.id, name: venue?.name },
          'Crawl succeeded',
        )
        if (venue?.id) {
          await tagEventsWithGenres(venue.id, result.value.id)
        }
      } else {
        failed++
        logger.error(
          { venueId: venue?.id, name: venue?.name, err: result.reason },
          'Crawl failed',
        )
      }
    }
  }

  logger.info(
    { succeeded, failed, total: activeVenues.length },
    'Daily crawl complete',
  )
  return { succeeded, failed, total: activeVenues.length }
}
```

- [ ] **Step 3: Type-check**

```bash
pnpm --filter @concert-crawl/crawler-core typecheck
pnpm --filter concert-crawl-crawler typecheck
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add packages/crawler-core/src/index.ts apps/crawler/src/run.ts
git commit -m "feat(crawler): wire tagEventsWithGenres after each venue crawl"
```

---

## Task 4: API — Write Failing Integration Tests for filterPrice + filterVibe

**Files:**

- Modify: `apps/api/src/routes/events.integration.test.ts`

- [ ] **Step 1: Add the failing tests**

Append a new `describe` block at the end of `apps/api/src/routes/events.integration.test.ts` (after the closing `})` of the existing `GET /v1/events/:id` block):

```typescript
describe('GET /v1/events — filterPrice', () => {
  beforeEach(async () => {
    await clearTables()
  })

  it('under-25 returns only events with price < 25', async () => {
    const venue = await seedVenue()
    await seedEvent(venue.id, {
      title: 'Cheap Show',
      ticketPriceMin: '15',
      date: '2027-06-01',
    })
    await seedEvent(venue.id, {
      title: 'Pricey Show',
      ticketPriceMin: '60',
      date: '2027-06-01',
    })
    await seedEvent(venue.id, { title: 'No Price', date: '2027-06-01' })

    const res = await app.request('/v1/events?filterPrice=under-25')
    const body = (await res.json()) as {
      success: boolean
      data: { data: { title: string }[]; total: number }
    }
    expect(res.status).toBe(200)
    expect(body.data.data).toHaveLength(1)
    expect(body.data.data[0]?.title).toBe('Cheap Show')
  })

  it('25-50 returns events with 25 <= price < 50', async () => {
    const venue = await seedVenue()
    await seedEvent(venue.id, {
      title: 'Low Show',
      ticketPriceMin: '10',
      date: '2027-06-01',
    })
    await seedEvent(venue.id, {
      title: 'Mid Show',
      ticketPriceMin: '35',
      date: '2027-06-01',
    })
    await seedEvent(venue.id, {
      title: 'Boundary Show',
      ticketPriceMin: '25',
      date: '2027-06-01',
    })
    await seedEvent(venue.id, {
      title: 'High Show',
      ticketPriceMin: '75',
      date: '2027-06-01',
    })

    const res = await app.request('/v1/events?filterPrice=25-50')
    const body = (await res.json()) as {
      success: boolean
      data: { data: { title: string }[] }
    }
    expect(res.status).toBe(200)
    expect(body.data.data).toHaveLength(2)
    const titles = body.data.data.map((ev) => ev.title).sort()
    expect(titles).toEqual(['Boundary Show', 'Mid Show'])
  })

  it('50-plus returns events with price >= 50', async () => {
    const venue = await seedVenue()
    await seedEvent(venue.id, {
      title: 'Cheap Show',
      ticketPriceMin: '20',
      date: '2027-06-01',
    })
    await seedEvent(venue.id, {
      title: 'Boundary Show',
      ticketPriceMin: '50',
      date: '2027-06-01',
    })
    await seedEvent(venue.id, {
      title: 'Pricey Show',
      ticketPriceMin: '120',
      date: '2027-06-01',
    })

    const res = await app.request('/v1/events?filterPrice=50-plus')
    const body = (await res.json()) as {
      success: boolean
      data: { data: { title: string }[] }
    }
    expect(res.status).toBe(200)
    expect(body.data.data).toHaveLength(2)
    const titles = body.data.data.map((ev) => ev.title).sort()
    expect(titles).toEqual(['Boundary Show', 'Pricey Show'])
  })

  it('tbd returns only events with no price data', async () => {
    const venue = await seedVenue()
    await seedEvent(venue.id, {
      title: 'Priced Show',
      ticketPriceMin: '45',
      date: '2027-06-01',
    })
    await seedEvent(venue.id, { title: 'TBD Show', date: '2027-06-01' })

    const res = await app.request('/v1/events?filterPrice=tbd')
    const body = (await res.json()) as {
      success: boolean
      data: { data: { title: string }[] }
    }
    expect(res.status).toBe(200)
    expect(body.data.data).toHaveLength(1)
    expect(body.data.data[0]?.title).toBe('TBD Show')
  })

  it('returns 400 for an invalid filterPrice value', async () => {
    const res = await app.request('/v1/events?filterPrice=invalid')
    expect(res.status).toBe(400)
  })
})

describe('GET /v1/events — filterVibe', () => {
  beforeEach(async () => {
    await clearTables()
  })

  it('returns only events whose genre array contains the selected vibe', async () => {
    const venue = await seedVenue()
    await seedEvent(venue.id, {
      title: 'Rock Night',
      genre: ['rock', 'indie'],
      date: '2027-06-01',
    })
    await seedEvent(venue.id, {
      title: 'Jazz Evening',
      genre: ['jazz'],
      date: '2027-06-01',
    })
    await seedEvent(venue.id, { title: 'No Genre', date: '2027-06-01' })

    const res = await app.request('/v1/events?filterVibe=rock')
    const body = (await res.json()) as {
      success: boolean
      data: { data: { title: string }[] }
    }
    expect(res.status).toBe(200)
    expect(body.data.data).toHaveLength(1)
    expect(body.data.data[0]?.title).toBe('Rock Night')
  })

  it('matches events that have the vibe among multiple genres', async () => {
    const venue = await seedVenue()
    await seedEvent(venue.id, {
      title: 'Indie Rock Show',
      genre: ['indie', 'rock'],
      date: '2027-06-01',
    })
    await seedEvent(venue.id, {
      title: 'Pure Indie',
      genre: ['indie'],
      date: '2027-06-01',
    })
    await seedEvent(venue.id, {
      title: 'Pop Show',
      genre: ['pop'],
      date: '2027-06-01',
    })

    const res = await app.request('/v1/events?filterVibe=indie')
    const body = (await res.json()) as {
      success: boolean
      data: { data: { title: string }[] }
    }
    expect(res.status).toBe(200)
    expect(body.data.data).toHaveLength(2)
    const titles = body.data.data.map((ev) => ev.title).sort()
    expect(titles).toEqual(['Indie Rock Show', 'Pure Indie'])
  })

  it('returns 400 for an invalid filterVibe value', async () => {
    const res = await app.request('/v1/events?filterVibe=reggae')
    expect(res.status).toBe(400)
  })

  it('combines filterPrice and filterVibe', async () => {
    const venue = await seedVenue()
    await seedEvent(venue.id, {
      title: 'Cheap Rock',
      genre: ['rock'],
      ticketPriceMin: '20',
      date: '2027-06-01',
    })
    await seedEvent(venue.id, {
      title: 'Pricey Rock',
      genre: ['rock'],
      ticketPriceMin: '80',
      date: '2027-06-01',
    })
    await seedEvent(venue.id, {
      title: 'Cheap Jazz',
      genre: ['jazz'],
      ticketPriceMin: '15',
      date: '2027-06-01',
    })

    const res = await app.request(
      '/v1/events?filterVibe=rock&filterPrice=under-25',
    )
    const body = (await res.json()) as {
      success: boolean
      data: { data: { title: string }[] }
    }
    expect(res.status).toBe(200)
    expect(body.data.data).toHaveLength(1)
    expect(body.data.data[0]?.title).toBe('Cheap Rock')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm --filter concert-crawl-api test:integration -- --reporter=verbose filterPrice filterVibe
```

Expected: 8 failures — the API does not yet accept these params.

---

## Task 5: API — Implement filterPrice + filterVibe

**Files:**

- Modify: `apps/api/src/routes/events.ts`

- [ ] **Step 1: Update events.ts**

Replace the full content of `apps/api/src/routes/events.ts`:

```typescript
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { db, events, venues } from '@concert-crawl/db'
import {
  type SQL,
  and,
  asc,
  count,
  eq,
  gte,
  ilike,
  isNotNull,
  isNull,
  lt,
  lte,
  or,
  sql,
} from 'drizzle-orm'
import { todayInTimezone } from '../lib/time.js'

const listEventsSchema = z.object({
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  venueSlug: z.string().optional(),
  search: z.string().max(200).optional(),
  filterPrice: z.enum(['under-25', '25-50', '50-plus', 'tbd']).optional(),
  filterVibe: z
    .enum([
      'rock',
      'indie',
      'hip-hop',
      'electronic',
      'country',
      'jazz',
      'pop',
      'metal',
    ])
    .optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
})

export const eventsRouter = new Hono()

// GET /v1/events — public event listing with filters and pagination
eventsRouter.get('/', zValidator('query', listEventsSchema), async (ctx) => {
  const {
    from,
    to,
    venueSlug,
    search,
    filterPrice,
    filterVibe,
    limit,
    offset,
  } = ctx.req.valid('query')

  const conditions: SQL[] = [
    eq(events.status, 'upcoming'),
    gte(events.date, from ?? todayInTimezone('UTC')),
  ]

  if (to) {
    conditions.push(lte(events.date, to))
  }

  if (venueSlug) {
    const [venue] = await db
      .select({ id: venues.id })
      .from(venues)
      .where(eq(venues.slug, venueSlug))
      .limit(1)
    if (!venue) {
      return ctx.json({
        success: true,
        data: { data: [], total: 0, limit, offset },
      })
    }
    conditions.push(eq(events.venueId, venue.id))
  }

  if (search) {
    const searchCondition = or(
      ilike(events.title, `%${search}%`),
      ilike(events.artist, `%${search}%`),
    )
    if (searchCondition) conditions.push(searchCondition)
  }

  const priceCondition =
    filterPrice === 'under-25'
      ? and(isNotNull(events.ticketPriceMin), lt(events.ticketPriceMin, '25'))
      : filterPrice === '25-50'
        ? and(
            isNotNull(events.ticketPriceMin),
            gte(events.ticketPriceMin, '25'),
            lt(events.ticketPriceMin, '50'),
          )
        : filterPrice === '50-plus'
          ? and(
              isNotNull(events.ticketPriceMin),
              gte(events.ticketPriceMin, '50'),
            )
          : filterPrice === 'tbd'
            ? and(isNull(events.ticketPriceMin), isNull(events.ticketPriceMax))
            : undefined

  if (priceCondition) conditions.push(priceCondition)

  if (filterVibe) {
    conditions.push(sql`${events.genre} && ARRAY[${filterVibe}]::text[]`)
  }

  const where = and(...conditions)

  const countResult = await db
    .select({ total: count() })
    .from(events)
    .where(where)

  const total = countResult[0]?.total ?? 0

  const rows = await db
    .select({
      id: events.id,
      venueId: events.venueId,
      title: events.title,
      artist: events.artist,
      date: events.date,
      doorsTime: events.doorsTime,
      showTime: events.showTime,
      ticketUrl: events.ticketUrl,
      ticketPriceMin: events.ticketPriceMin,
      ticketPriceMax: events.ticketPriceMax,
      priceSource: events.priceSource,
      description: events.description,
      imageUrl: events.imageUrl,
      genre: events.genre,
      status: events.status,
      confidenceScore: events.confidenceScore,
      verified: events.verified,
      sourceUrl: events.sourceUrl,
      createdAt: events.createdAt,
      updatedAt: events.updatedAt,
      venue: {
        id: venues.id,
        name: venues.name,
        slug: venues.slug,
        city: venues.city,
        timezone: venues.timezone,
        websiteUrl: venues.websiteUrl,
      },
    })
    .from(events)
    .innerJoin(venues, eq(events.venueId, venues.id))
    .where(where)
    .orderBy(asc(events.date), asc(events.showTime))
    .limit(limit)
    .offset(offset)

  return ctx.json({
    success: true,
    data: { data: rows, total, limit, offset },
  })
})

// GET /v1/events/:id — single event with venue
eventsRouter.get('/:id', async (ctx) => {
  const { id } = ctx.req.param()

  const [row] = await db
    .select({
      id: events.id,
      venueId: events.venueId,
      title: events.title,
      artist: events.artist,
      date: events.date,
      doorsTime: events.doorsTime,
      showTime: events.showTime,
      ticketUrl: events.ticketUrl,
      ticketPriceMin: events.ticketPriceMin,
      ticketPriceMax: events.ticketPriceMax,
      priceSource: events.priceSource,
      description: events.description,
      imageUrl: events.imageUrl,
      genre: events.genre,
      status: events.status,
      confidenceScore: events.confidenceScore,
      verified: events.verified,
      sourceUrl: events.sourceUrl,
      createdAt: events.createdAt,
      updatedAt: events.updatedAt,
      venue: {
        id: venues.id,
        name: venues.name,
        slug: venues.slug,
        city: venues.city,
        timezone: venues.timezone,
        websiteUrl: venues.websiteUrl,
      },
    })
    .from(events)
    .innerJoin(venues, eq(events.venueId, venues.id))
    .where(eq(events.id, id))

  if (!row) {
    return ctx.json({ success: false, error: 'Event not found' }, 404)
  }

  return ctx.json({ success: true, data: row })
})
```

- [ ] **Step 2: Run integration tests to verify they pass**

```bash
pnpm --filter concert-crawl-api test:integration -- --reporter=verbose filterPrice filterVibe
```

Expected: 8 passing.

- [ ] **Step 3: Run the full API test suite to check for regressions**

```bash
pnpm --filter concert-crawl-api test:integration -- --reporter=verbose
```

Expected: All passing.

- [ ] **Step 4: Type-check**

```bash
pnpm --filter concert-crawl-api typecheck
```

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/routes/events.ts apps/api/src/routes/events.integration.test.ts
git commit -m "feat(api): add filterPrice and filterVibe to GET /v1/events"
```

---

## Task 6: Web — Forward filterPrice + filterVibe in fetchEvents

**Files:**

- Modify: `apps/web/src/app/(protected)/events/page.tsx`

- [ ] **Step 1: Add the two forwarding lines**

In `apps/web/src/app/(protected)/events/page.tsx`, inside `fetchEvents()`, add after the `offsetParam` block and before `qs.set('limit', ...)`:

```typescript
// existing lines for context:
if (typeof offsetParam === 'string' && /^\d+$/.test(offsetParam)) {
  const parsed = Number(offsetParam)
  if (Number.isSafeInteger(parsed) && parsed >= 0)
    qs.set('offset', String(parsed))
}
// ADD THESE TWO LINES:
if (typeof params['filterPrice'] === 'string')
  qs.set('filterPrice', params['filterPrice'])
if (typeof params['filterVibe'] === 'string')
  qs.set('filterVibe', params['filterVibe'])
// existing line:
qs.set('limit', String(PAGE_LIMIT))
```

- [ ] **Step 2: Type-check**

```bash
pnpm --filter concert-crawl-web typecheck
```

Expected: No errors.

- [ ] **Step 3: Run full lint + type-check across all packages**

```bash
cd .worktrees/feat/browse-filters
pnpm typecheck
pnpm lint
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/(protected)/events/page.tsx
git commit -m "feat(web): forward filterPrice and filterVibe params to events API"
```

---

## Self-Review Checklist

**Spec coverage:**

| Spec requirement                                                       | Task                                           |
| ---------------------------------------------------------------------- | ---------------------------------------------- |
| Genre tagging pipeline — Haiku call with prompt caching                | Task 2                                         |
| Genre tagging — writes to `events.genre`                               | Task 2                                         |
| Genre tagging — logs to `cost_tracking` with `service: 'genre-tagger'` | Task 2                                         |
| Genre tagging — never throws (failure doesn't block crawl)             | Task 2 (`try/catch` in `tagEventsWithGenres`)  |
| Genre tagging — skip if no untagged events                             | Task 2 (early return in `tagEventsWithGenres`) |
| Genre tagging — runs after daily and triggered crawls                  | Task 3                                         |
| API `filterPrice` with 4 buckets                                       | Task 5                                         |
| API `filterVibe` with array overlap                                    | Task 5                                         |
| 400 on invalid param values                                            | Task 5 (Zod enum validation via zValidator)    |
| Web forwards filterPrice + filterVibe                                  | Task 6                                         |
| Unit tests for `classifyGenres`                                        | Task 1                                         |
| Integration tests for price + vibe filters                             | Task 4                                         |

**No placeholders:** All steps have actual code. ✓

**Type consistency:** `GenreTagInput` defined in Task 2 and used by `classifyGenres`. `tagEventsWithGenres` uses `GenreTagInput[]` internally. Export in Task 3 matches. ✓
