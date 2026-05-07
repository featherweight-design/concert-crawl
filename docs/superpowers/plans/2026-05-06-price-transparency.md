# Price Transparency Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Populate `ticketPriceMin`/`ticketPriceMax` for events via a 6-tier automated price retrieval pipeline, display prices with source attribution in the consumer UI, accept community submissions for AXS/no-price events, and surface pipeline health in an admin dashboard.

**Architecture:** A price pipeline module in `packages/crawler-core/src/lib/price-pipeline/` runs each source in order (venue structured data → Ticketmaster → Eventbrite+Dice → Songkick+Bandsintown → SeatGeek → community), stops on the first hit, and logs every attempt to `price_retrieval_log`. The pipeline is callable on-demand via an admin API endpoint and will hook into the nightly crawl in Phase 7. Community submissions corroborate each other within ±15% / 7 days and award cred to original submitters.

**Tech Stack:** Drizzle ORM (schema + migrations), Hono + Zod (API routes), Next.js App Router (UI), Vitest (unit + integration tests), `fetch` with `AbortSignal.timeout` (external API calls)

---

## File Map

**New files:**
- `packages/db/src/schema/prices.ts` — `price_retrieval_log` + `price_submissions` tables + retrieval-only enums
- `packages/crawler-core/src/lib/price-pipeline/types.ts` — `PipelineContext`, `PriceTierResult`
- `packages/crawler-core/src/lib/price-pipeline/tier1-structured-data.ts`
- `packages/crawler-core/src/lib/price-pipeline/tier2-ticketmaster.ts`
- `packages/crawler-core/src/lib/price-pipeline/tier3-eventbrite-dice.ts`
- `packages/crawler-core/src/lib/price-pipeline/tier4-songkick-bandsintown.ts`
- `packages/crawler-core/src/lib/price-pipeline/tier5-seatgeek.ts`
- `packages/crawler-core/src/lib/price-pipeline/tier6-community.ts`
- `packages/crawler-core/src/lib/price-pipeline/index.ts` — `runPricePipeline` orchestrator
- `packages/crawler-core/src/lib/price-pipeline/__tests__/tier1.test.ts`
- `packages/crawler-core/src/lib/price-pipeline/__tests__/tier2.test.ts`
- `packages/crawler-core/src/lib/price-pipeline/__tests__/orchestrator.test.ts`
- `apps/api/src/routes/price-submissions.ts` — `POST /v1/events/:id/price-submissions` + `GET /v1/events/:id/price-submissions`
- `apps/api/src/routes/admin/prices.ts` — admin price endpoints
- `apps/api/src/routes/price-submissions.integration.test.ts`
- `apps/api/src/routes/admin/prices.integration.test.ts`
- `apps/web/src/components/consumer/PriceDisplay.tsx`
- `apps/web/src/components/consumer/PriceSubmissionForm.tsx`
- `apps/web/src/app/(protected)/admin/prices/page.tsx`

**Modified files:**
- `packages/db/src/schema/events.ts` — add `priceSourceEnum` + `priceSource` field
- `packages/db/src/schema/venues.ts` — add `priceUrl` field
- `packages/db/src/schema/users.ts` — add `priceCredScore` field to `userRoles` (see Task 2 note)
- `packages/db/src/schema/index.ts` — export `prices.ts` tables
- `packages/types/src/index.ts` — add `priceSource` to `Event`, add `PriceSource` type, `PriceSubmission` interface
- `apps/api/src/routes/events.ts` — add `priceSource` to both select queries
- `apps/api/src/routes/index.ts` — register `priceSubmissionsRouter` + `pricesAdminRouter`
- `apps/api/src/routes/admin/index.ts` — mount `pricesAdminRouter`
- `apps/api/src/test/helpers/seed.ts` — add `seedPriceSubmission` helper, add new tables to `clearTables`
- `apps/web/src/app/(protected)/events/[id]/page.tsx` — use `PriceDisplay` + `PriceSubmissionForm`
- `apps/web/src/components/consumer/EventCard.tsx` — show price source attribution
- `apps/crawler/.env.example` — add price API keys
- `apps/api/.env.example` — add price API keys

---

## Task 1: DB Schema — prices.ts

**Files:**
- Create: `packages/db/src/schema/prices.ts`

- [ ] **Step 1: Write the schema file**

```typescript
// packages/db/src/schema/prices.ts
import {
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'
import { events } from './events.js'
import { venues } from './venues.js'

export const priceRetrievalOutcomeEnum = pgEnum('price_retrieval_outcome', [
  'hit',
  'miss',
  'error',
])

export const priceSubmissionStatusEnum = pgEnum('price_submission_status', [
  'pending',
  'corroborated',
  'disputed',
  'stale',
])

export const priceRetrievalLog = pgTable(
  'price_retrieval_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    eventId: uuid('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    venueId: uuid('venue_id')
      .notNull()
      .references(() => venues.id),
    source: text('source').notNull(),
    outcome: priceRetrievalOutcomeEnum('outcome').notNull(),
    latencyMs: integer('latency_ms').notNull(),
    errorMessage: text('error_message'),
    attemptedAt: timestamp('attempted_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    venueSourceIdx: index('price_log_venue_source_attempted_at_idx').on(
      table.venueId,
      table.source,
      table.attemptedAt,
    ),
  }),
)

export const priceSubmissions = pgTable('price_submissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventId: uuid('event_id')
    .notNull()
    .references(() => events.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull(),
  priceMin: numeric('price_min', { precision: 10, scale: 2 }).notNull(),
  priceMax: numeric('price_max', { precision: 10, scale: 2 }),
  tierLabel: text('tier_label'),
  sourceNote: text('source_note'),
  status: priceSubmissionStatusEnum('status').notNull().default('pending'),
  corroborationCount: integer('corroboration_count').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type PriceRetrievalLog = typeof priceRetrievalLog.$inferSelect
export type NewPriceRetrievalLog = typeof priceRetrievalLog.$inferInsert
export type PriceSubmission = typeof priceSubmissions.$inferSelect
export type NewPriceSubmission = typeof priceSubmissions.$inferInsert
```

Note: `source` is stored as `text` (not a PG enum) so new sources can be added without a migration. The TypeScript layer enforces the allowed values.

- [ ] **Step 2: Verify TypeScript compiles**

```bash
pnpm --filter @concert-crawl/db typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add packages/db/src/schema/prices.ts
git commit -m "feat: add price_retrieval_log and price_submissions schema"
```

---

## Task 2: DB Schema — Extend Existing Tables

**Files:**
- Modify: `packages/db/src/schema/events.ts`
- Modify: `packages/db/src/schema/venues.ts`
- Modify: `packages/db/src/schema/users.ts`
- Modify: `packages/db/src/schema/index.ts`

**Note on users table:** The existing `users.ts` has `userRoles`, `inviteCodes`, and `auditLog` but no user-profile table. Add `priceCredScore` to `userRoles` since that table carries the Clerk user ID and is the closest to a user profile. Cred is scoped per-role row for the user.

- [ ] **Step 1: Add `priceSourceEnum` and `priceSource` field to events.ts**

Add the enum before the `events` table definition and add the field inside the table:

```typescript
// At the top of packages/db/src/schema/events.ts, after existing imports
export const priceSourceEnum = pgEnum('price_source', [
  'structured_data',
  'ticketmaster',
  'eventbrite',
  'dice',
  'songkick',
  'bandsintown',
  'seatgeek',
  'community',
])
```

Add inside `events` table columns (after `ticketPriceMax`):

```typescript
    priceSource: priceSourceEnum('price_source'),
```

- [ ] **Step 2: Add `priceUrl` to venues.ts**

Add inside the `venues` table columns (after `contactEmail`):

```typescript
    priceUrl: text('price_url'),
```

- [ ] **Step 3: Add `priceCredScore` to users.ts**

Add the `integer` import to the existing import list. Then add inside the `userRoles` table columns (after `permissions`):

```typescript
    priceCredScore: integer('price_cred_score').notNull().default(0),
```

- [ ] **Step 4: Export prices.ts from the schema index**

Add to `packages/db/src/schema/index.ts`:

```typescript
export * from './prices.js'
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
pnpm --filter @concert-crawl/db typecheck
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add packages/db/src/schema/events.ts packages/db/src/schema/venues.ts packages/db/src/schema/users.ts packages/db/src/schema/index.ts
git commit -m "feat: add priceSource to events, priceUrl to venues, priceCredScore to user_roles"
```

---

## Task 3: Generate and Apply Migration

**Files:**
- Auto-generated: `packages/db/migrations/XXXX_price_transparency.sql`

- [ ] **Step 1: Generate the migration**

```bash
pnpm --filter @concert-crawl/db drizzle-kit generate
```

Expected: a new file appears in `packages/db/migrations/` (e.g., `0004_price_transparency.sql`).

- [ ] **Step 2: Review the generated SQL**

Open the new migration file. Verify it contains:
- `CREATE TYPE "price_source" AS ENUM (...)` — 8 values
- `CREATE TYPE "price_retrieval_outcome" AS ENUM ('hit', 'miss', 'error')`
- `CREATE TYPE "price_submission_status" AS ENUM ('pending', 'corroborated', 'disputed', 'stale')`
- `ALTER TABLE "events" ADD COLUMN "price_source" "price_source"`
- `ALTER TABLE "venues" ADD COLUMN "price_url" text`
- `ALTER TABLE "user_roles" ADD COLUMN "price_cred_score" integer DEFAULT 0 NOT NULL`
- `CREATE TABLE "price_retrieval_log" (...)`
- `CREATE TABLE "price_submissions" (...)`
- `CREATE INDEX "price_log_venue_source_attempted_at_idx" ...`

If the SQL looks wrong, do not apply — revisit Task 1 and 2 instead.

- [ ] **Step 3: Apply the migration**

```bash
pnpm db:migrate
```

Expected: migration runs without errors. Postgres now has both new tables and all new columns.

- [ ] **Step 4: Spot-check the schema via psql**

```bash
docker exec -it concert-crawl-db psql -U postgres -d concert_crawl_db -c "\d price_retrieval_log"
```

Expected: columns `id`, `event_id`, `venue_id`, `source`, `outcome`, `latency_ms`, `error_message`, `attempted_at`.

- [ ] **Step 5: Commit**

```bash
git add packages/db/migrations/
git commit -m "chore: apply price transparency migration"
```

---

## Task 4: Pipeline Types and Env Vars

**Files:**
- Create: `packages/crawler-core/src/lib/price-pipeline/types.ts`
- Modify: `apps/crawler/.env.example`
- Modify: `apps/api/.env.example`

- [ ] **Step 1: Create types.ts**

```typescript
// packages/crawler-core/src/lib/price-pipeline/types.ts

export type PriceSource =
  | 'structured_data'
  | 'ticketmaster'
  | 'eventbrite'
  | 'dice'
  | 'songkick'
  | 'bandsintown'
  | 'seatgeek'
  | 'community'

export interface PriceTierResult {
  priceMin: number
  priceMax: number | null
  source: PriceSource
}

export interface PipelineContext {
  eventId: string
  venueId: string
  artist: string
  date: string        // YYYY-MM-DD
  priceUrl?: string | null
  ticketUrl?: string | null
}
```

- [ ] **Step 2: Add price API keys to apps/crawler/.env.example**

Append to `apps/crawler/.env.example`:

```
# Price pipeline — external ticketing APIs
# All optional: tiers are skipped when the key is absent.
TICKETMASTER_API_KEY=
EVENTBRITE_API_TOKEN=
DICE_API_KEY=
SONGKICK_API_KEY=
BANDSINTOWN_APP_ID=
SEATGEEK_CLIENT_ID=
SEATGEEK_CLIENT_SECRET=
```

- [ ] **Step 3: Add the same keys to apps/api/.env.example**

The admin API's on-demand pipeline trigger runs in the API process and needs the same keys. Append the same block to `apps/api/.env.example`.

- [ ] **Step 4: Commit**

```bash
git add packages/crawler-core/src/lib/price-pipeline/types.ts apps/crawler/.env.example apps/api/.env.example
git commit -m "feat: add price pipeline types and env var stubs"
```

---

## Task 5: Tier 1 — Venue Structured Data

**Files:**
- Create: `packages/crawler-core/src/lib/price-pipeline/tier1-structured-data.ts`
- Create: `packages/crawler-core/src/lib/price-pipeline/__tests__/tier1.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/crawler-core/src/lib/price-pipeline/__tests__/tier1.test.ts
import { describe, it, expect, vi, afterEach } from 'vitest'
import { tier1StructuredData } from '../tier1-structured-data.js'
import type { PipelineContext } from '../types.js'

const baseCtx: PipelineContext = {
  eventId: 'evt-1',
  venueId: 'ven-1',
  artist: 'Test Artist',
  date: '2026-06-01',
  priceUrl: 'https://venue.example.com/events/test',
}

afterEach(() => vi.restoreAllMocks())

describe('tier1StructuredData', () => {
  it('returns null when priceUrl is absent', async () => {
    const result = await tier1StructuredData({ ...baseCtx, priceUrl: null })
    expect(result).toBeNull()
  })

  it('returns null on non-200 fetch', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
    const result = await tier1StructuredData(baseCtx)
    expect(result).toBeNull()
  })

  it('extracts price from JSON-LD Offer with lowPrice + highPrice', async () => {
    const html = `
      <html><head>
      <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "MusicEvent",
        "offers": { "@type": "Offer", "lowPrice": 35, "highPrice": 75 }
      }
      </script>
      </head></html>
    `
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, text: async () => html }))
    const result = await tier1StructuredData(baseCtx)
    expect(result).toEqual({ priceMin: 35, priceMax: 75, source: 'structured_data' })
  })

  it('extracts price from JSON-LD Offer with single price', async () => {
    const html = `
      <html><head>
      <script type="application/ld+json">
      {"@type": "Event", "offers": {"@type": "Offer", "price": 20}}
      </script>
      </head></html>
    `
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, text: async () => html }))
    const result = await tier1StructuredData(baseCtx)
    expect(result).toEqual({ priceMin: 20, priceMax: null, source: 'structured_data' })
  })

  it('returns null when JSON-LD has no Offer price', async () => {
    const html = `
      <html><head>
      <script type="application/ld+json">
      {"@type": "Event", "name": "A Show"}
      </script>
      </head></html>
    `
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, text: async () => html }))
    const result = await tier1StructuredData(baseCtx)
    expect(result).toBeNull()
  })
})
```

- [ ] **Step 2: Run the test and confirm it fails**

```bash
cd packages/crawler-core && pnpm vitest run src/lib/price-pipeline/__tests__/tier1.test.ts
```

Expected: FAIL — `tier1-structured-data.ts` does not exist yet.

- [ ] **Step 3: Implement tier1-structured-data.ts**

```typescript
// packages/crawler-core/src/lib/price-pipeline/tier1-structured-data.ts
import type { PipelineContext, PriceTierResult } from './types.js'

const CRAWLER_UA = 'ConcertCrawl/1.0 (+https://concertcrawl.com/bot)'
const JSON_LD_RE = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi

function extractOfferPrice(data: unknown): { min: number; max: number | null } | null {
  if (!data || typeof data !== 'object') return null
  const obj = data as Record<string, unknown>

  // Direct offers field
  const offers = obj['offers'] as Record<string, unknown> | undefined
  if (offers) {
    const min = parseFloat(String(offers['lowPrice'] ?? offers['price'] ?? ''))
    if (!isNaN(min)) {
      const rawMax = offers['highPrice']
      const max = rawMax ? parseFloat(String(rawMax)) : null
      return { min, max: max && !isNaN(max) ? max : null }
    }
  }

  // @graph array
  const graph = obj['@graph']
  if (Array.isArray(graph)) {
    for (const node of graph) {
      const result = extractOfferPrice(node)
      if (result) return result
    }
  }

  return null
}

export async function tier1StructuredData(
  ctx: PipelineContext,
): Promise<PriceTierResult | null> {
  if (!ctx.priceUrl) return null

  let res: Response
  try {
    res = await fetch(ctx.priceUrl, {
      headers: { 'User-Agent': CRAWLER_UA },
      signal: AbortSignal.timeout(10_000),
    })
  } catch {
    return null
  }

  if (!res.ok) return null
  const html = await res.text()

  for (const match of html.matchAll(JSON_LD_RE)) {
    try {
      const data: unknown = JSON.parse(match[1] ?? '')
      const items = Array.isArray(data) ? data : [data]
      for (const item of items) {
        const price = extractOfferPrice(item)
        if (price) {
          return { priceMin: price.min, priceMax: price.max, source: 'structured_data' }
        }
      }
    } catch {
      continue
    }
  }

  return null
}
```

- [ ] **Step 4: Run the test and confirm it passes**

```bash
cd packages/crawler-core && pnpm vitest run src/lib/price-pipeline/__tests__/tier1.test.ts
```

Expected: 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/crawler-core/src/lib/price-pipeline/tier1-structured-data.ts packages/crawler-core/src/lib/price-pipeline/__tests__/tier1.test.ts
git commit -m "feat: price pipeline tier 1 — venue structured data (JSON-LD)"
```

---

## Task 6: Tier 2 — Ticketmaster

**Files:**
- Create: `packages/crawler-core/src/lib/price-pipeline/tier2-ticketmaster.ts`
- Create: `packages/crawler-core/src/lib/price-pipeline/__tests__/tier2.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/crawler-core/src/lib/price-pipeline/__tests__/tier2.test.ts
import { describe, it, expect, vi, afterEach } from 'vitest'
import { tier2Ticketmaster } from '../tier2-ticketmaster.js'
import type { PipelineContext } from '../types.js'

const ctx: PipelineContext = {
  eventId: 'evt-1',
  venueId: 'ven-1',
  artist: 'Radiohead',
  date: '2026-08-15',
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
})

describe('tier2Ticketmaster', () => {
  it('returns null when TICKETMASTER_API_KEY is not set', async () => {
    vi.stubEnv('TICKETMASTER_API_KEY', '')
    const result = await tier2Ticketmaster(ctx)
    expect(result).toBeNull()
  })

  it('returns null on non-200 response', async () => {
    vi.stubEnv('TICKETMASTER_API_KEY', 'test-key')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
    const result = await tier2Ticketmaster(ctx)
    expect(result).toBeNull()
  })

  it('returns price from first event with priceRanges', async () => {
    vi.stubEnv('TICKETMASTER_API_KEY', 'test-key')
    const body = {
      _embedded: {
        events: [
          { name: 'Radiohead', priceRanges: [{ min: 55, max: 120 }] },
        ],
      },
    }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => body }))
    const result = await tier2Ticketmaster(ctx)
    expect(result).toEqual({ priceMin: 55, priceMax: 120, source: 'ticketmaster' })
  })

  it('returns null when no events have priceRanges', async () => {
    vi.stubEnv('TICKETMASTER_API_KEY', 'test-key')
    const body = { _embedded: { events: [{ name: 'Radiohead', priceRanges: [] }] } }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => body }))
    const result = await tier2Ticketmaster(ctx)
    expect(result).toBeNull()
  })
})
```

- [ ] **Step 2: Run the test — confirm FAIL**

```bash
cd packages/crawler-core && pnpm vitest run src/lib/price-pipeline/__tests__/tier2.test.ts
```

- [ ] **Step 3: Implement tier2-ticketmaster.ts**

```typescript
// packages/crawler-core/src/lib/price-pipeline/tier2-ticketmaster.ts
import type { PipelineContext, PriceTierResult } from './types.js'

export async function tier2Ticketmaster(
  ctx: PipelineContext,
): Promise<PriceTierResult | null> {
  const apiKey = process.env['TICKETMASTER_API_KEY']
  if (!apiKey) return null

  const url = new URL('https://app.ticketmaster.com/discovery/v2/events.json')
  url.searchParams.set('keyword', ctx.artist)
  url.searchParams.set('city', 'Denver')
  url.searchParams.set('startDateTime', `${ctx.date}T00:00:00Z`)
  url.searchParams.set('endDateTime', `${ctx.date}T23:59:59Z`)
  url.searchParams.set('apikey', apiKey)

  let res: Response
  try {
    res = await fetch(url.toString(), { signal: AbortSignal.timeout(10_000) })
  } catch {
    return null
  }

  if (!res.ok) return null

  const data = (await res.json()) as {
    _embedded?: { events?: Array<{ priceRanges?: Array<{ min: number; max?: number }> }> }
  }

  const tmEvent = data._embedded?.events?.find(
    (e) => e.priceRanges && e.priceRanges.length > 0,
  )
  if (!tmEvent) return null

  const range = tmEvent.priceRanges![0]!
  return { priceMin: range.min, priceMax: range.max ?? null, source: 'ticketmaster' }
}
```

- [ ] **Step 4: Run the test — confirm PASS**

```bash
cd packages/crawler-core && pnpm vitest run src/lib/price-pipeline/__tests__/tier2.test.ts
```

Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/crawler-core/src/lib/price-pipeline/tier2-ticketmaster.ts packages/crawler-core/src/lib/price-pipeline/__tests__/tier2.test.ts
git commit -m "feat: price pipeline tier 2 — Ticketmaster Discovery API"
```

---

## Task 7: Tier 3 — Eventbrite + Dice (Parallel)

**Files:**
- Create: `packages/crawler-core/src/lib/price-pipeline/tier3-eventbrite-dice.ts`

- [ ] **Step 1: Write the implementation**

(Tests for this tier are included in the orchestrator test in Task 11 via integration. The internal helpers are private.)

```typescript
// packages/crawler-core/src/lib/price-pipeline/tier3-eventbrite-dice.ts
import type { PipelineContext, PriceTierResult } from './types.js'

async function fetchEventbrite(ctx: PipelineContext): Promise<PriceTierResult | null> {
  const token = process.env['EVENTBRITE_API_TOKEN']
  if (!token) return null

  const url = new URL('https://www.eventbriteapi.com/v3/events/search/')
  url.searchParams.set('q', ctx.artist)
  url.searchParams.set('location.address', 'Denver, CO')
  url.searchParams.set('start_date.range_start', `${ctx.date}T00:00:00Z`)
  url.searchParams.set('start_date.range_end', `${ctx.date}T23:59:59Z`)
  url.searchParams.set('expand', 'ticket_classes')

  let res: Response
  try {
    res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10_000),
    })
  } catch {
    return null
  }

  if (!res.ok) return null

  const data = (await res.json()) as {
    events?: Array<{ ticket_classes?: Array<{ cost?: { major_value: string } }> }>
  }

  for (const event of data.events ?? []) {
    const prices = (event.ticket_classes ?? [])
      .map((tc) => parseFloat(tc.cost?.major_value ?? ''))
      .filter((p) => !isNaN(p) && p > 0)
    if (prices.length === 0) continue
    prices.sort((a, b) => a - b)
    return {
      priceMin: prices[0]!,
      priceMax: prices.length > 1 ? prices[prices.length - 1]! : null,
      source: 'eventbrite',
    }
  }

  return null
}

async function fetchDice(ctx: PipelineContext): Promise<PriceTierResult | null> {
  const apiKey = process.env['DICE_API_KEY']
  if (!apiKey) return null

  const url = new URL('https://api.dice.fm/v1/events')
  url.searchParams.set('query', ctx.artist)
  url.searchParams.set('country_code', 'US')

  let res: Response
  try {
    res = await fetch(url.toString(), {
      headers: { 'x-api-key': apiKey },
      signal: AbortSignal.timeout(10_000),
    })
  } catch {
    return null
  }

  if (!res.ok) return null

  const data = (await res.json()) as {
    data?: Array<{ date: string; price?: { face_value: number; max_price?: number } }>
  }

  const match = data.data?.find((e) => e.date?.startsWith(ctx.date) && e.price?.face_value)
  if (!match?.price) return null

  return {
    priceMin: match.price.face_value / 100,
    priceMax: match.price.max_price ? match.price.max_price / 100 : null,
    source: 'dice',
  }
}

export async function tier3EventbriteDice(
  ctx: PipelineContext,
): Promise<{ eventbrite: PriceTierResult | null; dice: PriceTierResult | null }> {
  const [eventbrite, dice] = await Promise.allSettled([
    fetchEventbrite(ctx),
    fetchDice(ctx),
  ])
  return {
    eventbrite: eventbrite.status === 'fulfilled' ? eventbrite.value : null,
    dice: dice.status === 'fulfilled' ? dice.value : null,
  }
}
```

Note: The orchestrator (Task 11) calls `tier3EventbriteDice` and receives both results, logging each separately and stopping on the first non-null.

- [ ] **Step 2: Verify TypeScript compiles**

```bash
pnpm --filter @concert-crawl/crawler-core typecheck
```

- [ ] **Step 3: Commit**

```bash
git add packages/crawler-core/src/lib/price-pipeline/tier3-eventbrite-dice.ts
git commit -m "feat: price pipeline tier 3 — Eventbrite + Dice.fm (parallel)"
```

---

## Task 8: Tier 4 — Songkick + Bandsintown (Parallel)

**Files:**
- Create: `packages/crawler-core/src/lib/price-pipeline/tier4-songkick-bandsintown.ts`

- [ ] **Step 1: Write the implementation**

```typescript
// packages/crawler-core/src/lib/price-pipeline/tier4-songkick-bandsintown.ts
import type { PipelineContext, PriceTierResult } from './types.js'

// Denver metro Songkick location ID
const DENVER_SK_LOCATION_ID = '37551'

async function fetchSongkick(ctx: PipelineContext): Promise<PriceTierResult | null> {
  const apiKey = process.env['SONGKICK_API_KEY']
  if (!apiKey) return null

  const url = new URL('https://api.songkick.com/api/3.0/events.json')
  url.searchParams.set('artists', ctx.artist)
  url.searchParams.set('location', `sk:${DENVER_SK_LOCATION_ID}`)
  url.searchParams.set('min_date', ctx.date)
  url.searchParams.set('max_date', ctx.date)
  url.searchParams.set('apikey', apiKey)

  let res: Response
  try {
    res = await fetch(url.toString(), { signal: AbortSignal.timeout(10_000) })
  } catch {
    return null
  }

  if (!res.ok) return null

  const data = (await res.json()) as {
    resultsPage?: {
      results?: {
        event?: Array<{ performance?: unknown[]; start?: { date: string } }>
      }
    }
  }

  const skEvent = data.resultsPage?.results?.event?.[0]
  if (!skEvent) return null

  // Songkick rarely includes price; return null if not present (still worth attempting)
  return null
}

async function fetchBandsintown(ctx: PipelineContext): Promise<PriceTierResult | null> {
  const appId = process.env['BANDSINTOWN_APP_ID']
  if (!appId) return null

  const artist = encodeURIComponent(ctx.artist)
  const url = `https://rest.bandsintown.com/artists/${artist}/events?app_id=${appId}&date=${ctx.date}`

  let res: Response
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(10_000) })
  } catch {
    return null
  }

  if (!res.ok) return null

  const events = (await res.json()) as Array<{
    datetime?: string
    offers?: Array<{ type?: string; url?: string; status?: string }>
  }>

  const match = events.find((e) => e.datetime?.startsWith(ctx.date))
  if (!match) return null

  // Bandsintown events link to ticketing but rarely include raw prices
  return null
}

export async function tier4SongkickBandsintown(
  ctx: PipelineContext,
): Promise<{ songkick: PriceTierResult | null; bandsintown: PriceTierResult | null }> {
  const [sk, bat] = await Promise.allSettled([
    fetchSongkick(ctx),
    fetchBandsintown(ctx),
  ])
  return {
    songkick: sk.status === 'fulfilled' ? sk.value : null,
    bandsintown: bat.status === 'fulfilled' ? bat.value : null,
  }
}
```

Note: Songkick's public API has been restricted (as of 2022, new API key requests are paused). Bandsintown's API links to ticketing but rarely returns raw price data. Both tiers are implemented for completeness and future API access; they currently return null. When keys are unavailable, the functions short-circuit immediately.

- [ ] **Step 2: Verify TypeScript compiles**

```bash
pnpm --filter @concert-crawl/crawler-core typecheck
```

- [ ] **Step 3: Commit**

```bash
git add packages/crawler-core/src/lib/price-pipeline/tier4-songkick-bandsintown.ts
git commit -m "feat: price pipeline tier 4 — Songkick + Bandsintown (parallel)"
```

---

## Task 9: Tier 5 — SeatGeek

**Files:**
- Create: `packages/crawler-core/src/lib/price-pipeline/tier5-seatgeek.ts`

- [ ] **Step 1: Write the implementation**

```typescript
// packages/crawler-core/src/lib/price-pipeline/tier5-seatgeek.ts
import type { PipelineContext, PriceTierResult } from './types.js'

export async function tier5SeatGeek(ctx: PipelineContext): Promise<PriceTierResult | null> {
  const clientId = process.env['SEATGEEK_CLIENT_ID']
  const clientSecret = process.env['SEATGEEK_CLIENT_SECRET']
  if (!clientId || !clientSecret) return null

  const url = new URL('https://api.seatgeek.com/2/events')
  url.searchParams.set('q', ctx.artist)
  url.searchParams.set('venue.city', 'Denver')
  url.searchParams.set('datetime_local.gte', `${ctx.date}T00:00:00`)
  url.searchParams.set('datetime_local.lte', `${ctx.date}T23:59:59`)
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('client_secret', clientSecret)

  let res: Response
  try {
    res = await fetch(url.toString(), { signal: AbortSignal.timeout(10_000) })
  } catch {
    return null
  }

  if (!res.ok) return null

  const data = (await res.json()) as {
    events?: Array<{
      stats?: { lowest_price: number | null; highest_price: number | null }
    }>
  }

  const sgEvent = data.events?.find(
    (e) => e.stats?.lowest_price != null,
  )
  if (!sgEvent?.stats?.lowest_price) return null

  return {
    priceMin: sgEvent.stats.lowest_price,
    priceMax: sgEvent.stats.highest_price ?? null,
    source: 'seatgeek',
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
pnpm --filter @concert-crawl/crawler-core typecheck
```

- [ ] **Step 3: Commit**

```bash
git add packages/crawler-core/src/lib/price-pipeline/tier5-seatgeek.ts
git commit -m "feat: price pipeline tier 5 — SeatGeek (resale)"
```

---

## Task 10: Tier 6 — Community Fallback

**Files:**
- Create: `packages/crawler-core/src/lib/price-pipeline/tier6-community.ts`

- [ ] **Step 1: Write the implementation**

```typescript
// packages/crawler-core/src/lib/price-pipeline/tier6-community.ts
import { and, desc, eq } from 'drizzle-orm'
import { db, priceSubmissions } from '@concert-crawl/db'
import type { PipelineContext, PriceTierResult } from './types.js'

export async function tier6Community(ctx: PipelineContext): Promise<PriceTierResult | null> {
  const rows = await db
    .select({
      priceMin: priceSubmissions.priceMin,
      priceMax: priceSubmissions.priceMax,
    })
    .from(priceSubmissions)
    .where(
      and(
        eq(priceSubmissions.eventId, ctx.eventId),
        eq(priceSubmissions.status, 'corroborated'),
      ),
    )
    .orderBy(desc(priceSubmissions.createdAt))
    .limit(20)

  if (rows.length === 0) return null

  const mins = rows.map((r) => parseFloat(r.priceMin)).filter((n) => !isNaN(n))
  const maxes = rows
    .map((r) => (r.priceMax ? parseFloat(r.priceMax) : null))
    .filter((n): n is number => n !== null && !isNaN(n))

  const median = (arr: number[]): number => {
    const sorted = [...arr].sort((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)
    return sorted.length % 2 === 0
      ? (sorted[mid - 1]! + sorted[mid]!) / 2
      : sorted[mid]!
  }

  if (mins.length === 0) return null

  return {
    priceMin: Math.round(median(mins) * 100) / 100,
    priceMax: maxes.length > 0 ? Math.round(median(maxes) * 100) / 100 : null,
    source: 'community',
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
pnpm --filter @concert-crawl/crawler-core typecheck
```

- [ ] **Step 3: Commit**

```bash
git add packages/crawler-core/src/lib/price-pipeline/tier6-community.ts
git commit -m "feat: price pipeline tier 6 — community corroborated median"
```

---

## Task 11: Pipeline Orchestrator

**Files:**
- Create: `packages/crawler-core/src/lib/price-pipeline/index.ts`
- Create: `packages/crawler-core/src/lib/price-pipeline/__tests__/orchestrator.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/crawler-core/src/lib/price-pipeline/__tests__/orchestrator.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { PipelineContext } from '../types.js'

// Mock the DB and all tier modules before importing the orchestrator
vi.mock('@concert-crawl/db', () => ({
  db: {
    insert: vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue([]) }),
    update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }) }),
  },
  priceRetrievalLog: {},
  events: { id: 'id' },
}))

vi.mock('../tier1-structured-data.js', () => ({ tier1StructuredData: vi.fn() }))
vi.mock('../tier2-ticketmaster.js', () => ({ tier2Ticketmaster: vi.fn() }))
vi.mock('../tier3-eventbrite-dice.js', () => ({
  tier3EventbriteDice: vi.fn().mockResolvedValue({ eventbrite: null, dice: null }),
}))
vi.mock('../tier4-songkick-bandsintown.js', () => ({
  tier4SongkickBandsintown: vi.fn().mockResolvedValue({ songkick: null, bandsintown: null }),
}))
vi.mock('../tier5-seatgeek.js', () => ({ tier5SeatGeek: vi.fn() }))
vi.mock('../tier6-community.js', () => ({ tier6Community: vi.fn() }))

const { runPricePipeline } = await import('../index.js')
const { tier1StructuredData } = await import('../tier1-structured-data.js')
const { tier2Ticketmaster } = await import('../tier2-ticketmaster.js')
const { tier3EventbriteDice } = await import('../tier3-eventbrite-dice.js')
const { tier5SeatGeek } = await import('../tier5-seatgeek.js')
const { tier6Community } = await import('../tier6-community.js')
const { db } = await import('@concert-crawl/db')

const ctx: PipelineContext = {
  eventId: 'evt-1',
  venueId: 'ven-1',
  artist: 'Test Artist',
  date: '2026-06-01',
}

beforeEach(() => {
  vi.mocked(tier1StructuredData).mockResolvedValue(null)
  vi.mocked(tier2Ticketmaster).mockResolvedValue(null)
  vi.mocked(tier3EventbriteDice).mockResolvedValue({ eventbrite: null, dice: null })
  vi.mocked(tier5SeatGeek).mockResolvedValue(null)
  vi.mocked(tier6Community).mockResolvedValue(null)
})

afterEach(() => vi.clearAllMocks())

describe('runPricePipeline', () => {
  it('stops at tier 1 on first hit and updates event', async () => {
    vi.mocked(tier1StructuredData).mockResolvedValue({
      priceMin: 40, priceMax: 80, source: 'structured_data',
    })
    await runPricePipeline(ctx)
    expect(tier2Ticketmaster).not.toHaveBeenCalled()
    const insertMock = vi.mocked(db.insert)
    expect(insertMock).toHaveBeenCalledWith(expect.anything()) // priceRetrievalLog
  })

  it('logs a miss and continues to next tier when tier returns null', async () => {
    vi.mocked(tier1StructuredData).mockResolvedValue(null)
    vi.mocked(tier2Ticketmaster).mockResolvedValue({ priceMin: 55, priceMax: null, source: 'ticketmaster' })
    await runPricePipeline(ctx)
    expect(tier6Community).not.toHaveBeenCalled()
  })

  it('logs an error and continues when tier throws', async () => {
    vi.mocked(tier1StructuredData).mockRejectedValue(new Error('network failure'))
    vi.mocked(tier2Ticketmaster).mockResolvedValue({ priceMin: 30, priceMax: 60, source: 'ticketmaster' })
    await runPricePipeline(ctx)
    expect(tier6Community).not.toHaveBeenCalled()
  })

  it('reaches tier 6 when all previous tiers return null', async () => {
    await runPricePipeline(ctx)
    expect(tier6Community).toHaveBeenCalledWith(ctx)
  })
})
```

- [ ] **Step 2: Run the test — confirm FAIL**

```bash
cd packages/crawler-core && pnpm vitest run src/lib/price-pipeline/__tests__/orchestrator.test.ts
```

- [ ] **Step 3: Implement the orchestrator**

```typescript
// packages/crawler-core/src/lib/price-pipeline/index.ts
import { eq, sql } from 'drizzle-orm'
import { db, events, priceRetrievalLog } from '@concert-crawl/db'
import type { PipelineContext, PriceTierResult, PriceSource } from './types.js'
import { tier1StructuredData } from './tier1-structured-data.js'
import { tier2Ticketmaster } from './tier2-ticketmaster.js'
import { tier3EventbriteDice } from './tier3-eventbrite-dice.js'
import { tier4SongkickBandsintown } from './tier4-songkick-bandsintown.js'
import { tier5SeatGeek } from './tier5-seatgeek.js'
import { tier6Community } from './tier6-community.js'

async function logAttempt(
  ctx: PipelineContext,
  source: PriceSource,
  outcome: 'hit' | 'miss' | 'error',
  latencyMs: number,
  errorMessage?: string,
): Promise<void> {
  await db.insert(priceRetrievalLog).values({
    eventId: ctx.eventId,
    venueId: ctx.venueId,
    source,
    outcome,
    latencyMs,
    errorMessage: errorMessage ?? null,
  })
}

async function updateEventPrice(eventId: string, result: PriceTierResult): Promise<void> {
  await db
    .update(events)
    .set({
      ticketPriceMin: String(result.priceMin),
      ticketPriceMax: result.priceMax != null ? String(result.priceMax) : null,
      priceSource: result.source,
      updatedAt: sql`now()`,
    })
    .where(eq(events.id, eventId))
}

async function runTier(
  ctx: PipelineContext,
  source: PriceSource,
  fn: (ctx: PipelineContext) => Promise<PriceTierResult | null>,
): Promise<PriceTierResult | null> {
  const start = Date.now()
  let result: PriceTierResult | null = null
  let outcome: 'hit' | 'miss' | 'error' = 'miss'
  let errorMessage: string | undefined

  try {
    result = await fn(ctx)
    outcome = result ? 'hit' : 'miss'
  } catch (err) {
    outcome = 'error'
    errorMessage = err instanceof Error ? err.message : String(err)
  }

  await logAttempt(ctx, source, outcome, Date.now() - start, errorMessage)
  return result
}

export async function runPricePipeline(ctx: PipelineContext): Promise<void> {
  // Tier 1
  const t1 = await runTier(ctx, 'structured_data', tier1StructuredData)
  if (t1) { await updateEventPrice(ctx.eventId, t1); return }

  // Tier 2
  const t2 = await runTier(ctx, 'ticketmaster', tier2Ticketmaster)
  if (t2) { await updateEventPrice(ctx.eventId, t2); return }

  // Tier 3 — run Eventbrite + Dice in parallel, log each source separately
  const tier3 = await tier3EventbriteDice(ctx)
  const ebStart = Date.now()
  await logAttempt(ctx, 'eventbrite', tier3.eventbrite ? 'hit' : 'miss', Date.now() - ebStart)
  if (tier3.eventbrite) { await updateEventPrice(ctx.eventId, tier3.eventbrite); return }
  const diceStart = Date.now()
  await logAttempt(ctx, 'dice', tier3.dice ? 'hit' : 'miss', Date.now() - diceStart)
  if (tier3.dice) { await updateEventPrice(ctx.eventId, tier3.dice); return }

  // Tier 4 — run Songkick + Bandsintown in parallel, log each separately
  const tier4 = await tier4SongkickBandsintown(ctx)
  const skStart = Date.now()
  await logAttempt(ctx, 'songkick', tier4.songkick ? 'hit' : 'miss', Date.now() - skStart)
  if (tier4.songkick) { await updateEventPrice(ctx.eventId, tier4.songkick); return }
  const batStart = Date.now()
  await logAttempt(ctx, 'bandsintown', tier4.bandsintown ? 'hit' : 'miss', Date.now() - batStart)
  if (tier4.bandsintown) { await updateEventPrice(ctx.eventId, tier4.bandsintown); return }

  // Tier 5
  const t5 = await runTier(ctx, 'seatgeek', tier5SeatGeek)
  if (t5) { await updateEventPrice(ctx.eventId, t5); return }

  // Tier 6
  const t6 = await runTier(ctx, 'community', tier6Community)
  if (t6) { await updateEventPrice(ctx.eventId, t6); return }
}

export type { PipelineContext, PriceTierResult, PriceSource } from './types.js'
```

- [ ] **Step 4: Run the tests — confirm PASS**

```bash
cd packages/crawler-core && pnpm vitest run src/lib/price-pipeline/__tests__/orchestrator.test.ts
```

Expected: 4 tests pass.

- [ ] **Step 5: Run all crawler-core tests**

```bash
cd packages/crawler-core && pnpm vitest run
```

Expected: all tests pass (tier1, tier2, orchestrator).

- [ ] **Step 6: Commit**

```bash
git add packages/crawler-core/src/lib/price-pipeline/index.ts packages/crawler-core/src/lib/price-pipeline/__tests__/orchestrator.test.ts
git commit -m "feat: price pipeline orchestrator — runPricePipeline with 6 tiers and retrieval logging"
```

---

## Task 12: Shared Types

**Files:**
- Modify: `packages/types/src/index.ts`

- [ ] **Step 1: Add `PriceSource` type and `priceSource` field to `Event`**

In `packages/types/src/index.ts`, add after the `EventStatus` type:

```typescript
export type PriceSource =
  | 'structured_data'
  | 'ticketmaster'
  | 'eventbrite'
  | 'dice'
  | 'songkick'
  | 'bandsintown'
  | 'seatgeek'
  | 'community'
```

In the `Event` interface, add after `ticketPriceMax`:

```typescript
  priceSource: PriceSource | null
```

- [ ] **Step 2: Add `PriceSubmission` interface**

Add after the `Event` interface:

```typescript
export interface PriceSubmission {
  id: string
  eventId: string
  userId: string
  priceMin: string
  priceMax: string | null
  tierLabel: string | null
  sourceNote: string | null
  status: 'pending' | 'corroborated' | 'disputed' | 'stale'
  corroborationCount: number
  createdAt: string
  updatedAt: string
}
```

- [ ] **Step 3: Verify TypeScript compiles across all packages**

```bash
pnpm --filter @concert-crawl/types typecheck
pnpm --filter @concert-crawl/api typecheck
pnpm --filter @concert-crawl/web typecheck
```

The API and web builds will fail if the new `priceSource` field on `Event` breaks existing spread/destructure patterns. Fix any errors before proceeding.

- [ ] **Step 4: Commit**

```bash
git add packages/types/src/index.ts
git commit -m "feat: add PriceSource type and priceSource to Event, add PriceSubmission type"
```

---

## Task 13: API — Expose priceSource in Event Responses

**Files:**
- Modify: `apps/api/src/routes/events.ts`

The events route has two select queries: one in `GET /v1/events` (list) and one in `GET /v1/events/:id` (detail). Both need `priceSource` added.

- [ ] **Step 1: Write a failing integration test**

Open `apps/api/src/routes/events.integration.test.ts` and add this test case inside the existing `describe` block:

```typescript
  it('includes priceSource in event detail response', async () => {
    const venue = await seedVenue()
    await seedEvent(venue.id, {
      priceSource: 'ticketmaster',
      ticketPriceMin: '45',
      ticketPriceMax: '90',
    } as Parameters<typeof seedEvent>[1])

    const eventsRes = await app.request('/v1/events')
    const listBody = (await eventsRes.json()) as {
      success: boolean
      data: { data: Array<{ id: string }> }
    }
    const eventId = listBody.data.data[0]?.id
    expect(eventId).toBeDefined()

    const res = await app.request(`/v1/events/${eventId}`)
    const body = (await res.json()) as {
      success: boolean
      data: { priceSource: string | null }
    }
    expect(body.success).toBe(true)
    expect(body.data.priceSource).toBe('ticketmaster')
  })
```

- [ ] **Step 2: Run the test — confirm FAIL**

```bash
cd apps/api && pnpm vitest run src/routes/events.integration.test.ts
```

Expected: test fails because `priceSource` is not in the response.

- [ ] **Step 3: Add priceSource to the list query**

In `apps/api/src/routes/events.ts`, inside the `GET /v1/events` select object (in the `rows` query), add after `ticketPriceMax`:

```typescript
      priceSource: events.priceSource,
```

- [ ] **Step 4: Add priceSource to the detail query**

Find the `GET /v1/events/:id` handler. In its `db.select()` call, add after `ticketPriceMax`:

```typescript
      priceSource: events.priceSource,
```

- [ ] **Step 5: Run the test — confirm PASS**

```bash
cd apps/api && pnpm vitest run src/routes/events.integration.test.ts
```

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/routes/events.ts
git commit -m "feat: expose priceSource in public event responses"
```

---

## Task 14: API — Community Price Submissions Route

**Files:**
- Create: `apps/api/src/routes/price-submissions.ts`
- Modify: `apps/api/src/routes/index.ts`
- Modify: `apps/api/src/test/helpers/seed.ts`
- Create: `apps/api/src/routes/price-submissions.integration.test.ts`

- [ ] **Step 1: Write the failing integration test**

```typescript
// apps/api/src/routes/price-submissions.integration.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { app } from '../app.js'
import { clearTables, seedEvent, seedVenue } from '../test/helpers/seed.js'

// Mock Clerk auth — price submissions require a logged-in user
vi.mock('@clerk/backend', () => ({
  createClerkClient: vi.fn().mockReturnValue({}),
  verifyToken: vi.fn().mockResolvedValue({
    sub: 'user_abc123',
    metadata: { role: 'user' },
    sessionClaims: { metadata: { role: 'user' } },
  }),
}))

describe('POST /v1/events/:id/price-submissions', () => {
  let eventId: string

  beforeEach(async () => {
    await clearTables()
    const venue = await seedVenue()
    const event = await seedEvent(venue.id)
    eventId = event.id
  })

  it('returns 401 without auth', async () => {
    const res = await app.request(`/v1/events/${eventId}/price-submissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priceMin: 25 }),
    })
    expect(res.status).toBe(401)
  })

  it('creates a pending submission', async () => {
    const res = await app.request(`/v1/events/${eventId}/price-submissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      },
      body: JSON.stringify({ priceMin: 35, priceMax: 65, tierLabel: 'GA' }),
    })
    expect(res.status).toBe(201)
    const body = (await res.json()) as { success: boolean; data: { status: string; priceMin: string } }
    expect(body.success).toBe(true)
    expect(body.data.status).toBe('pending')
    expect(body.data.priceMin).toBe('35')
  })

  it('returns 422 when priceMin is missing', async () => {
    const res = await app.request(`/v1/events/${eventId}/price-submissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test-token' },
      body: JSON.stringify({ priceMax: 65 }),
    })
    expect(res.status).toBe(422)
  })
})

describe('GET /v1/events/:id/price-submissions', () => {
  it('returns corroborated submissions for an event', async () => {
    await clearTables()
    const venue = await seedVenue()
    const event = await seedEvent(venue.id)
    await seedPriceSubmission(event.id, 'user_1', { status: 'corroborated', priceMin: '40' })

    const res = await app.request(`/v1/events/${event.id}/price-submissions`)
    const body = (await res.json()) as { success: boolean; data: Array<{ status: string }> }
    expect(body.success).toBe(true)
    expect(body.data[0]?.status).toBe('corroborated')
  })
})
```

- [ ] **Step 2: Add `seedPriceSubmission` to seed helpers**

In `apps/api/src/test/helpers/seed.ts`, add at the top:

```typescript
import { priceSubmissions } from '@concert-crawl/db'
```

Add to the `clearTables` TRUNCATE list — update the existing `sql` call to include new tables:

```typescript
export async function clearTables(): Promise<void> {
  await testDb.execute(
    sql`TRUNCATE events, venues, crawl_runs, audit_log, invite_codes, user_roles, price_retrieval_log, price_submissions RESTART IDENTITY CASCADE`,
  )
}
```

Add the helper function:

```typescript
export async function seedPriceSubmission(
  eventId: string,
  userId: string,
  overrides: Partial<typeof priceSubmissions.$inferInsert> = {},
): Promise<typeof priceSubmissions.$inferSelect> {
  const [submission] = await testDb
    .insert(priceSubmissions)
    .values({
      eventId,
      userId,
      priceMin: '35',
      status: 'pending',
      corroborationCount: 0,
      ...overrides,
    })
    .returning()
  if (!submission) throw new Error('seedPriceSubmission: insert returned no rows')
  return submission
}
```

- [ ] **Step 3: Run the test — confirm FAIL**

```bash
cd apps/api && pnpm vitest run src/routes/price-submissions.integration.test.ts
```

- [ ] **Step 4: Implement the route**

```typescript
// apps/api/src/routes/price-submissions.ts
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { and, desc, eq, gte, ne, sql } from 'drizzle-orm'
import { db, events, priceSubmissions, userRoles } from '@concert-crawl/db'
import { clerkAuth } from '../middleware/auth.js'
import { getAuthUser } from '../middleware/auth.js'

const submissionBodySchema = z.object({
  priceMin: z.number().positive(),
  priceMax: z.number().positive().optional(),
  tierLabel: z.string().max(50).optional(),
  sourceNote: z.string().max(200).optional(),
})

export const priceSubmissionsRouter = new Hono()

// GET /v1/events/:id/price-submissions — public, returns corroborated submissions
priceSubmissionsRouter.get('/:id/price-submissions', async (ctx) => {
  const { id } = ctx.req.param()

  const rows = await db
    .select()
    .from(priceSubmissions)
    .where(
      and(
        eq(priceSubmissions.eventId, id),
        eq(priceSubmissions.status, 'corroborated'),
      ),
    )
    .orderBy(desc(priceSubmissions.createdAt))
    .limit(10)

  return ctx.json({ success: true, data: rows })
})

// POST /v1/events/:id/price-submissions — requires auth
priceSubmissionsRouter.post(
  '/:id/price-submissions',
  clerkAuth,
  zValidator('json', submissionBodySchema, (result, ctx) => {
    if (!result.success) return ctx.json({ success: false, error: 'Invalid input' }, 422)
  }),
  async (ctx) => {
    const { id: eventId } = ctx.req.param()
    const userId = getAuthUser(ctx).userId
    const body = ctx.req.valid('json')

    // Verify event exists
    const [event] = await db.select({ id: events.id }).from(events).where(eq(events.id, eventId)).limit(1)
    if (!event) return ctx.json({ success: false, error: 'Event not found' }, 404)

    // Insert submission
    const [newSub] = await db
      .insert(priceSubmissions)
      .values({
        eventId,
        userId,
        priceMin: String(body.priceMin),
        priceMax: body.priceMax != null ? String(body.priceMax) : null,
        tierLabel: body.tierLabel ?? null,
        sourceNote: body.sourceNote ?? null,
      })
      .returning()
    if (!newSub) return ctx.json({ success: false, error: 'Failed to create submission' }, 500)

    // Check for corroborating submissions (different user, within ±15%, within 7 days, pending status)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const existing = await db
      .select()
      .from(priceSubmissions)
      .where(
        and(
          eq(priceSubmissions.eventId, eventId),
          ne(priceSubmissions.userId, userId),
          eq(priceSubmissions.status, 'pending'),
          gte(priceSubmissions.createdAt, sevenDaysAgo),
        ),
      )

    const tolerance = 0.15
    const corroborating = existing.filter((s) => {
      const diff = Math.abs(parseFloat(s.priceMin) - body.priceMin) / body.priceMin
      return diff <= tolerance
    })

    if (corroborating.length > 0) {
      // Mark new submission as corroborated
      await db
        .update(priceSubmissions)
        .set({ status: 'corroborated', updatedAt: sql`now()` })
        .where(eq(priceSubmissions.id, newSub.id))

      // Update existing submissions and award cred
      for (const s of corroborating) {
        const wasFirstCorroboration = s.corroborationCount === 0
        await db
          .update(priceSubmissions)
          .set({
            status: 'corroborated',
            corroborationCount: s.corroborationCount + 1,
            updatedAt: sql`now()`,
          })
          .where(eq(priceSubmissions.id, s.id))

        const credDelta = wasFirstCorroboration ? 10 : 2
        await db
          .update(userRoles)
          .set({ priceCredScore: sql`${userRoles.priceCredScore} + ${credDelta}` })
          .where(eq(userRoles.userId, s.userId))
      }
    }

    return ctx.json({ success: true, data: newSub }, 201)
  },
)
```

- [ ] **Step 5: Register the router in routes/index.ts**

In `apps/api/src/routes/index.ts`, add the import and registration:

```typescript
import { priceSubmissionsRouter } from './price-submissions.js'
```

Inside `registerRoutes`:

```typescript
  app.route('/v1/events', priceSubmissionsRouter)
```

- [ ] **Step 6: Run the test — confirm PASS**

```bash
cd apps/api && pnpm vitest run src/routes/price-submissions.integration.test.ts
```

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/routes/price-submissions.ts apps/api/src/routes/index.ts apps/api/src/test/helpers/seed.ts apps/api/src/routes/price-submissions.integration.test.ts
git commit -m "feat: POST/GET /v1/events/:id/price-submissions with corroboration and cred logic"
```

---

## Task 15: API — Admin Price Routes

**Files:**
- Create: `apps/api/src/routes/admin/prices.ts`
- Modify: `apps/api/src/routes/admin/index.ts`
- Create: `apps/api/src/routes/admin/prices.integration.test.ts`

- [ ] **Step 1: Write the failing integration test**

```typescript
// apps/api/src/routes/admin/prices.integration.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { app } from '../../app.js'
import { clearTables, seedEvent, seedVenue } from '../../test/helpers/seed.js'

vi.mock('@clerk/backend', () => ({
  createClerkClient: vi.fn().mockReturnValue({}),
  verifyToken: vi.fn().mockResolvedValue({
    sub: 'admin_user',
    metadata: { role: 'admin' },
    sessionClaims: { metadata: { role: 'admin' } },
  }),
}))

const ADMIN_HEADERS = {
  Authorization: 'Bearer admin-token',
  'Content-Type': 'application/json',
}

describe('GET /v1/admin/prices/health', () => {
  beforeEach(() => clearTables())

  it('returns pipeline health stats', async () => {
    const res = await app.request('/v1/admin/prices/health', { headers: ADMIN_HEADERS })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { success: boolean; data: { stats: unknown[] } }
    expect(body.success).toBe(true)
    expect(Array.isArray(body.data.stats)).toBe(true)
  })
})

describe('GET /v1/admin/prices/log', () => {
  it('returns last retrieval attempts', async () => {
    const res = await app.request('/v1/admin/prices/log', { headers: ADMIN_HEADERS })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { success: boolean; data: unknown[] }
    expect(body.success).toBe(true)
    expect(Array.isArray(body.data)).toBe(true)
  })
})

describe('POST /v1/admin/prices/pipeline/:eventId', () => {
  it('returns 202 and starts pipeline for existing event', async () => {
    await clearTables()
    const venue = await seedVenue()
    const event = await seedEvent(venue.id)

    const res = await app.request(`/v1/admin/prices/pipeline/${event.id}`, {
      method: 'POST',
      headers: ADMIN_HEADERS,
    })
    expect(res.status).toBe(202)
    const body = (await res.json()) as { success: boolean; data: { eventId: string } }
    expect(body.data.eventId).toBe(event.id)
  })

  it('returns 404 for unknown event', async () => {
    const res = await app.request('/v1/admin/prices/pipeline/00000000-0000-0000-0000-000000000000', {
      method: 'POST',
      headers: ADMIN_HEADERS,
    })
    expect(res.status).toBe(404)
  })
})
```

- [ ] **Step 2: Run the test — confirm FAIL**

```bash
cd apps/api && pnpm vitest run src/routes/admin/prices.integration.test.ts
```

- [ ] **Step 3: Implement the admin prices router**

```typescript
// apps/api/src/routes/admin/prices.ts
import { Hono } from 'hono'
import { and, count, desc, eq, gte, max, sql } from 'drizzle-orm'
import { db, events, priceRetrievalLog, priceSubmissions, venues } from '@concert-crawl/db'
import { runPricePipeline } from '@concert-crawl/crawler-core'
import { createLogger } from '../../lib/logger.js'
import type { AdminVariables } from './index.js'

const logger = createLogger('admin:prices')

export const pricesAdminRouter = new Hono<AdminVariables>()

// GET /v1/admin/prices/health — per-source × per-venue success rates
pricesAdminRouter.get('/health', async (ctx) => {
  const stats = await db
    .select({
      venueId: priceRetrievalLog.venueId,
      source: priceRetrievalLog.source,
      totalCount: count(),
      hitCount: count(
        sql`CASE WHEN ${priceRetrievalLog.outcome} = 'hit' THEN 1 END`,
      ),
      lastAttemptedAt: max(priceRetrievalLog.attemptedAt),
    })
    .from(priceRetrievalLog)
    .groupBy(priceRetrievalLog.venueId, priceRetrievalLog.source)

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const autoFlagged = stats.filter(
    (s) =>
      Number(s.hitCount) === 0 &&
      s.lastAttemptedAt != null &&
      new Date(s.lastAttemptedAt) < thirtyDaysAgo,
  )

  return ctx.json({ success: true, data: { stats, autoFlagged } })
})

// GET /v1/admin/prices/log — last 100 retrieval attempts
pricesAdminRouter.get('/log', async (ctx) => {
  const rows = await db
    .select()
    .from(priceRetrievalLog)
    .orderBy(desc(priceRetrievalLog.attemptedAt))
    .limit(100)

  return ctx.json({ success: true, data: rows })
})

// GET /v1/admin/prices/coverage — % of upcoming events with price data
pricesAdminRouter.get('/coverage', async (ctx) => {
  const [total] = await db
    .select({ count: count() })
    .from(events)
    .where(eq(events.status, 'upcoming'))

  const [withPrice] = await db
    .select({ count: count() })
    .from(events)
    .where(
      and(
        eq(events.status, 'upcoming'),
        sql`${events.ticketPriceMin} IS NOT NULL`,
      ),
    )

  const totalCount = total?.count ?? 0
  const pricedCount = withPrice?.count ?? 0
  const pct = totalCount > 0 ? Math.round((pricedCount / totalCount) * 100) : 0

  return ctx.json({
    success: true,
    data: { total: totalCount, withPrice: pricedCount, pct },
  })
})

// GET /v1/admin/prices/submissions — community submission queue
pricesAdminRouter.get('/submissions', async (ctx) => {
  const rows = await db
    .select()
    .from(priceSubmissions)
    .orderBy(desc(priceSubmissions.createdAt))
    .limit(50)

  return ctx.json({ success: true, data: rows })
})

// PATCH /v1/admin/prices/submissions/:id — approve (corroborated), dispute, or stale
pricesAdminRouter.patch('/submissions/:id', async (ctx) => {
  const { id } = ctx.req.param()
  const body = (await ctx.req.json()) as { status: 'corroborated' | 'disputed' | 'stale' }
  const validStatuses = ['corroborated', 'disputed', 'stale'] as const
  if (!validStatuses.includes(body.status)) {
    return ctx.json({ success: false, error: 'Invalid status' }, 422)
  }

  const [updated] = await db
    .update(priceSubmissions)
    .set({ status: body.status, updatedAt: sql`now()` })
    .where(eq(priceSubmissions.id, id))
    .returning()

  if (!updated) return ctx.json({ success: false, error: 'Submission not found' }, 404)

  ctx.set('auditAction', 'price.submission.update')
  ctx.set('auditTargetId', id)

  return ctx.json({ success: true, data: updated })
})

// POST /v1/admin/prices/pipeline/:eventId — on-demand price pipeline run
pricesAdminRouter.post('/pipeline/:eventId', async (ctx) => {
  const { eventId } = ctx.req.param()

  const [event] = await db
    .select({
      id: events.id,
      venueId: events.venueId,
      artist: events.artist,
      date: events.date,
      ticketUrl: events.ticketUrl,
      venue: { priceUrl: venues.priceUrl },
    })
    .from(events)
    .innerJoin(venues, eq(events.venueId, venues.id))
    .where(eq(events.id, eventId))
    .limit(1)

  if (!event) return ctx.json({ success: false, error: 'Event not found' }, 404)

  // Fire and forget — pipeline can take several seconds across tiers
  void (async () => {
    try {
      await runPricePipeline({
        eventId: event.id,
        venueId: event.venueId,
        artist: event.artist,
        date: event.date,
        priceUrl: event.venue.priceUrl,
        ticketUrl: event.ticketUrl,
      })
    } catch (err) {
      logger.error({ err, eventId }, 'on-demand price pipeline failed')
    }
  })()

  return ctx.json({ success: true, data: { eventId, message: 'Pipeline started' } }, 202)
})
```

- [ ] **Step 4: Mount the router in admin/index.ts**

Add the import at the top:

```typescript
import { pricesAdminRouter } from './prices.js'
```

After the existing `adminRouter.route('/crawl', crawlAdminRouter)` line, add:

```typescript
adminRouter.route('/prices', pricesAdminRouter)
```

- [ ] **Step 5: Run the test — confirm PASS**

```bash
cd apps/api && pnpm vitest run src/routes/admin/prices.integration.test.ts
```

- [ ] **Step 6: Verify full API test suite still passes**

```bash
cd apps/api && pnpm vitest run
```

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/routes/admin/prices.ts apps/api/src/routes/admin/index.ts apps/api/src/routes/admin/prices.integration.test.ts
git commit -m "feat: admin price routes — health, log, coverage, submissions queue, on-demand pipeline"
```

---

## Task 16: PriceDisplay Component

**Files:**
- Create: `apps/web/src/components/consumer/PriceDisplay.tsx`

This component renders a price (or no-price state) with source attribution. It detects AXS events by checking `ticketUrl` for `axs.com`.

- [ ] **Step 1: Write the component**

```typescript
// apps/web/src/components/consumer/PriceDisplay.tsx
import type { PriceSource } from '@concert-crawl/types'

interface PriceDisplayProps {
  priceMin: string | null
  priceMax: string | null
  priceSource: PriceSource | null
  venueName: string
  ticketUrl: string | null
}

function formatPrice(min: string | null, max: string | null): string | null {
  if (!min) return null
  const minNum = parseFloat(min)
  if (isNaN(minNum)) return null
  const minStr = `$${minNum.toFixed(0)}`
  if (!max) return minStr
  const maxNum = parseFloat(max)
  if (isNaN(maxNum) || maxNum <= minNum) return minStr
  return `${minStr}–$${maxNum.toFixed(0)}`
}

function sourceLabel(source: PriceSource, venueName: string): string {
  switch (source) {
    case 'structured_data': return `From ${venueName}`
    case 'ticketmaster': return 'From Ticketmaster'
    case 'eventbrite': return 'From Eventbrite'
    case 'dice': return 'From Dice.fm'
    case 'songkick': return 'From Songkick'
    case 'bandsintown': return 'From Bandsintown'
    case 'seatgeek': return 'From SeatGeek · resale prices'
    case 'community': return 'Community reported'
  }
}

function isAxsVenue(ticketUrl: string | null): boolean {
  return ticketUrl?.includes('axs.com') ?? false
}

export function PriceDisplay({
  priceMin,
  priceMax,
  priceSource,
  venueName,
  ticketUrl,
}: PriceDisplayProps) {
  const formatted = formatPrice(priceMin, priceMax)
  const axs = isAxsVenue(ticketUrl)

  if (formatted && priceSource) {
    const label = sourceLabel(priceSource, venueName)
    const isSeatGeek = priceSource === 'seatgeek'
    const isCommunity = priceSource === 'community'

    return (
      <div>
        <p className="text-foreground font-medium">
          {formatted}
          {axs && isSeatGeek && (
            <span className="text-muted-foreground ml-1 text-xs">(resale)</span>
          )}
        </p>
        {isCommunity ? (
          <p
            className="text-muted-foreground text-xs"
            title="Prices submitted by Concert Crawl community members. Not verified by venue."
          >
            {label}
          </p>
        ) : (
          <p className="text-muted-foreground text-xs">{label}</p>
        )}
        {axs && isSeatGeek && (
          <p className="text-muted-foreground text-xs">
            AXS doesn&apos;t list face value publicly
          </p>
        )}
      </div>
    )
  }

  if (axs) {
    return (
      <div>
        <p className="text-muted-foreground text-sm">
          AXS doesn&apos;t share pricing publicly — check back closer to the show or call
          the box office
        </p>
      </div>
    )
  }

  return (
    <div>
      <p className="text-muted-foreground text-sm">Price not yet available</p>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
pnpm --filter @concert-crawl/web typecheck
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/consumer/PriceDisplay.tsx
git commit -m "feat: PriceDisplay component with source attribution and AXS no-price messaging"
```

---

## Task 17: PriceSubmissionForm Component

**Files:**
- Create: `apps/web/src/components/consumer/PriceSubmissionForm.tsx`

Shown when no authoritative price exists. Requires the user to be signed in (the form is an auth gate if not signed in).

- [ ] **Step 1: Write the component**

```typescript
// apps/web/src/components/consumer/PriceSubmissionForm.tsx
'use client'

import { useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface PriceSubmissionFormProps {
  eventId: string
  apiUrl: string
  isAxsEvent: boolean
}

type FormState = 'idle' | 'submitting' | 'success' | 'error'

export function PriceSubmissionForm({ eventId, apiUrl, isAxsEvent }: PriceSubmissionFormProps) {
  const { isSignedIn } = useUser()
  const [state, setState] = useState<FormState>('idle')
  const [priceMin, setPriceMin] = useState('')
  const [priceMax, setPriceMax] = useState('')
  const [tierLabel, setTierLabel] = useState('')
  const [sourceNote, setSourceNote] = useState('')

  if (!isSignedIn) {
    return (
      <p className="text-muted-foreground text-sm">
        <a href="/sign-in" className="underline">Sign in</a> to submit a price.
      </p>
    )
  }

  const prompt = isAxsEvent
    ? "AXS doesn't publish pricing. Know what face value tickets cost? Submit a price →"
    : 'Know the ticket price? Help the community.'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const min = parseFloat(priceMin)
    if (isNaN(min) || min <= 0) return

    setState('submitting')
    try {
      const res = await fetch(`${apiUrl}/v1/events/${eventId}/price-submissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceMin: min,
          priceMax: priceMax ? parseFloat(priceMax) : undefined,
          tierLabel: tierLabel || undefined,
          sourceNote: sourceNote || undefined,
        }),
        credentials: 'include',
      })
      setState(res.ok ? 'success' : 'error')
    } catch {
      setState('error')
    }
  }

  if (state === 'success') {
    return <p className="text-muted-foreground text-sm">Thanks! Your submission is pending corroboration.</p>
  }

  return (
    <div className="space-y-3">
      <p className="text-muted-foreground text-sm">{prompt}</p>
      <form onSubmit={handleSubmit} className="space-y-2">
        <div className="flex gap-2">
          <div className="flex-1">
            <Label htmlFor="priceMin" className="text-xs">Floor price *</Label>
            <Input
              id="priceMin"
              type="number"
              min="0"
              step="0.01"
              placeholder="35"
              value={priceMin}
              onChange={(e) => setPriceMin(e.target.value)}
              required
              className="h-8 text-sm"
            />
          </div>
          <div className="flex-1">
            <Label htmlFor="priceMax" className="text-xs">Ceiling price</Label>
            <Input
              id="priceMax"
              type="number"
              min="0"
              step="0.01"
              placeholder="75"
              value={priceMax}
              onChange={(e) => setPriceMax(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
        </div>
        <div>
          <Label htmlFor="tierLabel" className="text-xs">Tier (e.g. GA, Reserved)</Label>
          <Input
            id="tierLabel"
            placeholder="GA"
            value={tierLabel}
            onChange={(e) => setTierLabel(e.target.value)}
            maxLength={50}
            className="h-8 text-sm"
          />
        </div>
        <div>
          <Label htmlFor="sourceNote" className="text-xs">Source (e.g. box office, just bought)</Label>
          <Input
            id="sourceNote"
            placeholder="box office"
            value={sourceNote}
            onChange={(e) => setSourceNote(e.target.value)}
            maxLength={200}
            className="h-8 text-sm"
          />
        </div>
        {state === 'error' && (
          <p className="text-destructive text-xs">Something went wrong. Try again.</p>
        )}
        <Button type="submit" size="sm" disabled={state === 'submitting'}>
          {state === 'submitting' ? 'Submitting…' : 'Submit price'}
        </Button>
      </form>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
pnpm --filter @concert-crawl/web typecheck
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/consumer/PriceSubmissionForm.tsx
git commit -m "feat: PriceSubmissionForm component with AXS-directed prompt and auth gate"
```

---

## Task 18: Wire Up Event Detail Page and EventCard

**Files:**
- Modify: `apps/web/src/app/(protected)/events/[id]/page.tsx`
- Modify: `apps/web/src/components/consumer/EventCard.tsx`

- [ ] **Step 1: Update the event detail page to use PriceDisplay + PriceSubmissionForm**

Open `apps/web/src/app/(protected)/events/[id]/page.tsx`.

Add the imports near the top of the file:

```typescript
import { PriceDisplay } from '@/components/consumer/PriceDisplay'
import { PriceSubmissionForm } from '@/components/consumer/PriceSubmissionForm'
```

Find the section that renders the price `InfoRow` (currently shows `price ?? 'TBA'`). Replace it with:

```typescript
            <PriceDisplay
              priceMin={event.ticketPriceMin}
              priceMax={event.ticketPriceMax}
              priceSource={event.priceSource}
              venueName={event.venue.name}
              ticketUrl={event.ticketUrl}
            />
```

Below the `InfoRow` block (before the ticket CTA button), add the submission form — only when there is no authoritative price:

```typescript
            {!event.ticketPriceMin && (
              <PriceSubmissionForm
                eventId={event.id}
                apiUrl={process.env.NEXT_PUBLIC_API_URL ?? ''}
                isAxsEvent={event.ticketUrl?.includes('axs.com') ?? false}
              />
            )}
```

- [ ] **Step 2: Update EventCard to show price source**

Open `apps/web/src/components/consumer/EventCard.tsx`.

Find the price display logic (currently shows `$XX` or null). The card has limited space, so just append a small source badge when the source is `seatgeek` or `community`:

```typescript
// Replace the existing priceDisplay derivation with:
const priceDisplay =
  event.ticketPriceMin != null
    ? `$${parseFloat(event.ticketPriceMin).toFixed(0)}`
    : null

const priceSourceBadge =
  event.priceSource === 'seatgeek'
    ? 'resale'
    : event.priceSource === 'community'
      ? 'community'
      : null
```

In the JSX where price is rendered, add the badge:

```typescript
{priceDisplay ? (
  <span className="text-sm font-medium">
    {priceDisplay}
    {priceSourceBadge && (
      <span className="text-muted-foreground ml-1 text-xs">({priceSourceBadge})</span>
    )}
  </span>
) : (
  <span className="text-muted-foreground text-sm">TBA</span>
)}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
pnpm --filter @concert-crawl/web typecheck
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/\(protected\)/events/\[id\]/page.tsx apps/web/src/components/consumer/EventCard.tsx
git commit -m "feat: wire PriceDisplay + PriceSubmissionForm into event detail; price source badge on EventCard"
```

---

## Task 19: Admin Prices Dashboard Page

**Files:**
- Create: `apps/web/src/app/(protected)/admin/prices/page.tsx`

This page has four tabs: Pipeline Health, Retrieval Log, Coverage, and Submissions.

- [ ] **Step 1: Install shadcn Tabs if not already present**

```bash
cd apps/web && npx shadcn@latest add tabs
```

If the component already exists at `apps/web/src/components/ui/tabs.tsx`, skip this step.

- [ ] **Step 2: Write the page**

```typescript
// apps/web/src/app/(protected)/admin/prices/page.tsx
import { requireAdminUser } from '@concert-crawl/auth'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? ''

async function fetchAdminJson<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  const json = (await res.json()) as { success: boolean; data: T }
  if (!json.success) throw new Error(`Failed to fetch ${path}`)
  return json.data
}

export default async function AdminPricesPage() {
  const { token } = await requireAdminUser()

  const [health, log, coverage, submissions] = await Promise.all([
    fetchAdminJson<{
      stats: Array<{ venueId: string; source: string; hitCount: number; totalCount: number; lastAttemptedAt: string | null }>
      autoFlagged: Array<{ venueId: string; source: string }>
    }>('/v1/admin/prices/health', token),
    fetchAdminJson<Array<{ id: string; source: string; outcome: string; latencyMs: number; attemptedAt: string; errorMessage: string | null }>>(
      '/v1/admin/prices/log',
      token,
    ),
    fetchAdminJson<{ total: number; withPrice: number; pct: number }>(
      '/v1/admin/prices/coverage',
      token,
    ),
    fetchAdminJson<Array<{ id: string; eventId: string; userId: string; priceMin: string; priceMax: string | null; status: string; corroborationCount: number; createdAt: string }>>(
      '/v1/admin/prices/submissions',
      token,
    ),
  ])

  return (
    <main className="container py-8">
      <h1 className="mb-6 text-2xl font-semibold">Price Dashboard</h1>

      <Tabs defaultValue="health">
        <TabsList>
          <TabsTrigger value="health">Pipeline Health</TabsTrigger>
          <TabsTrigger value="log">Retrieval Log</TabsTrigger>
          <TabsTrigger value="coverage">Coverage</TabsTrigger>
          <TabsTrigger value="submissions">Submissions</TabsTrigger>
        </TabsList>

        {/* Pipeline Health */}
        <TabsContent value="health">
          {health.autoFlagged.length > 0 && (
            <div className="bg-destructive/10 border-destructive/30 mb-4 rounded border p-3 text-sm">
              <strong>{health.autoFlagged.length} source(s) auto-flagged</strong> — no hits in
              30+ days.
            </div>
          )}
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground border-b text-left">
                <th className="py-2 pr-4">Venue ID</th>
                <th className="py-2 pr-4">Source</th>
                <th className="py-2 pr-4">Hit Rate</th>
                <th className="py-2">Last Attempt</th>
              </tr>
            </thead>
            <tbody>
              {health.stats.map((row) => (
                <tr key={`${row.venueId}-${row.source}`} className="border-b">
                  <td className="py-2 pr-4 font-mono text-xs">{row.venueId.slice(0, 8)}…</td>
                  <td className="py-2 pr-4">{row.source}</td>
                  <td className="py-2 pr-4">
                    {row.totalCount > 0
                      ? `${Math.round((row.hitCount / row.totalCount) * 100)}%`
                      : '—'}{' '}
                    ({row.hitCount}/{row.totalCount})
                  </td>
                  <td className="text-muted-foreground py-2 text-xs">
                    {row.lastAttemptedAt
                      ? new Date(row.lastAttemptedAt).toLocaleString('en-US', {
                          timeZone: 'America/Denver',
                        })
                      : 'never'}
                  </td>
                </tr>
              ))}
              {health.stats.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-muted-foreground py-4 text-center">
                    No pipeline attempts yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </TabsContent>

        {/* Retrieval Log */}
        <TabsContent value="log">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground border-b text-left">
                <th className="py-2 pr-4">Source</th>
                <th className="py-2 pr-4">Outcome</th>
                <th className="py-2 pr-4">Latency</th>
                <th className="py-2 pr-4">Attempted</th>
                <th className="py-2">Error</th>
              </tr>
            </thead>
            <tbody>
              {log.map((row) => (
                <tr key={row.id} className="border-b">
                  <td className="py-2 pr-4">{row.source}</td>
                  <td className="py-2 pr-4">
                    <span
                      className={
                        row.outcome === 'hit'
                          ? 'text-green-600'
                          : row.outcome === 'error'
                            ? 'text-destructive'
                            : 'text-muted-foreground'
                      }
                    >
                      {row.outcome}
                    </span>
                  </td>
                  <td className="py-2 pr-4">{row.latencyMs}ms</td>
                  <td className="text-muted-foreground py-2 pr-4 text-xs">
                    {new Date(row.attemptedAt).toLocaleString('en-US', {
                      timeZone: 'America/Denver',
                    })}
                  </td>
                  <td className="text-muted-foreground py-2 text-xs">{row.errorMessage ?? '—'}</td>
                </tr>
              ))}
              {log.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-muted-foreground py-4 text-center">
                    No retrieval attempts yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </TabsContent>

        {/* Coverage */}
        <TabsContent value="coverage">
          <div className="mt-4 space-y-2">
            <p className="text-4xl font-bold">{coverage.pct}%</p>
            <p className="text-muted-foreground text-sm">
              {coverage.withPrice} of {coverage.total} upcoming events have price data.
            </p>
          </div>
        </TabsContent>

        {/* Community Submissions */}
        <TabsContent value="submissions">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground border-b text-left">
                <th className="py-2 pr-4">Event ID</th>
                <th className="py-2 pr-4">Price</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Corroborations</th>
                <th className="py-2">Submitted</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((row) => (
                <tr key={row.id} className="border-b">
                  <td className="py-2 pr-4 font-mono text-xs">{row.eventId.slice(0, 8)}…</td>
                  <td className="py-2 pr-4">
                    ${parseFloat(row.priceMin).toFixed(0)}
                    {row.priceMax && `–$${parseFloat(row.priceMax).toFixed(0)}`}
                  </td>
                  <td className="py-2 pr-4">{row.status}</td>
                  <td className="py-2 pr-4">{row.corroborationCount}</td>
                  <td className="text-muted-foreground py-2 text-xs">
                    {new Date(row.createdAt).toLocaleDateString('en-US', {
                      timeZone: 'America/Denver',
                    })}
                  </td>
                </tr>
              ))}
              {submissions.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-muted-foreground py-4 text-center">
                    No community submissions yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </TabsContent>
      </Tabs>
    </main>
  )
}
```

- [ ] **Step 3: Add a link to the admin nav**

Find the admin navigation (likely in `apps/web/src/app/(protected)/admin/` layout or a nav component). Add a link to `/admin/prices`.

- [ ] **Step 4: Verify TypeScript compiles**

```bash
pnpm --filter @concert-crawl/web typecheck
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/\(protected\)/admin/prices/
git commit -m "feat: admin prices dashboard — health, log, coverage, submissions tabs"
```

---

## Spec Coverage Check

| Spec requirement | Task |
|---|---|
| `price_url` on venues | Task 2 |
| `price_source` enum on events | Task 2 |
| `price_retrieval_log` table | Task 1 |
| `price_submissions` table | Task 1 |
| Tier 1 — venue structured data | Task 5 |
| Tier 2 — Ticketmaster | Task 6 |
| Tier 3 — Eventbrite + Dice | Task 7 |
| Tier 4 — Songkick + Bandsintown | Task 8 |
| Tier 5 — SeatGeek | Task 9 |
| Tier 6 — Community median | Task 10 |
| Pipeline logging (every attempt) | Task 11 |
| Source attribution labels (all 8 sources) | Task 16 |
| No-price states (generic + AXS) | Task 16 |
| AXS + SeatGeek combined state | Task 16 |
| Community submission form | Task 17 |
| Corroboration logic (±15%, 7 days) | Task 14 |
| Cred (+10 first, +2 subsequent) | Task 14 |
| Community submissions GET | Task 14 |
| Admin pipeline health view | Task 15 |
| Admin retrieval log | Task 15 |
| Admin coverage summary | Task 15 |
| Admin submissions queue | Task 15 |
| Admin manual submission status update | Task 15 |
| On-demand pipeline trigger | Task 15 |
| Rep tier architecture (no implementation) | ✅ already in user_roles — nothing to do |

**Gaps from spec:**
- `price_cred_score` is stored on `user_roles` (per the existing schema structure), not a dedicated user-profile table. Cred is correctly accumulated per Clerk user ID.
- Leaderboard (top contributors) is not built in this plan — spec says "admin leaderboard of highest-cred users." Add a `GET /v1/admin/prices/leaderboard` endpoint and a tab on the admin page as a follow-up.
- Auto-flagging (30+ day miss streak with disable action) is detected in the `/health` endpoint but the admin UI has no disable action yet — add a `PATCH /v1/admin/prices/health/:venueId/:source/disable` endpoint and button as a follow-up.
- Community submissions tooltip ("Not verified by venue") is in the `PriceDisplay` component but not as a Radix tooltip — add a `<Tooltip>` wrapper from shadcn as a follow-up.
