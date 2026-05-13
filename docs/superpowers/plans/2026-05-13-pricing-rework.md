# Pricing Rework Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gut the dead API-polling tiers from the price pipeline, establish ticket vendor tracking on venues, fix the missing "Get Tickets" button for AXS events, and set up the infrastructure for community price submission as the hero feature (consumer UI deferred to follow-up PR pending design).

**Architecture:** The price pipeline is simplified to tier 1 (JSON-LD structured data) + tier 6 (community submissions) — all middle tiers are removed because they produce zero hits and waste bandwidth. A `ticketVendor` enum column is added to venues (auto-detected on creation via HTML signal detection, admin-overridable, backfilled for existing venues). A `pipelineExhaustedAt` timestamp on events stops the pipeline from re-running after a full-miss pass. Consumer-facing community price UI changes (hero CTA + onboarding callout) are deferred to a follow-up branch once designs are delivered.

**Two-PR strategy:**
- **This PR (feat/pricing-rework):** Backend + admin + bug fix — Tasks 1-9. No consumer UI changes.
- **Follow-up PR:** Consumer hero CTA + onboarding — Tasks 10-11. Blocked on design.

**Tech Stack:** Drizzle ORM (migrations), Hono (API routes), Zod (validation), Next.js App Router, TypeScript strict mode, Vitest

---

## File Map

| File | Action | What changes |
|------|--------|-------------|
| `packages/db/migrations/0020_ticket_vendor.sql` | Create | Adds `ticket_vendor_enum` + `ticket_vendor` column to `venues` |
| `packages/db/migrations/0021_pipeline_exhausted_at.sql` | Create | Adds `pipeline_exhausted_at` column to `events` |
| `packages/db/src/schema/venues.ts` | Modify | Add `ticketVendorEnum` pgEnum + `ticketVendor` column |
| `packages/db/src/schema/events.ts` | Modify | Add `pipelineExhaustedAt` timestamp column |
| `packages/types/src/index.ts` | Modify | Add `TicketVendor` type; add `ticketVendor` + `priceUrl` to `Venue`; add `pipelineExhaustedAt` to `Event` |
| `packages/price-pipeline/src/index.ts` | Modify | Remove tiers 2-5; set `pipelineExhaustedAt` on full miss; skip events already exhausted |
| `packages/price-pipeline/src/tier2-ticketmaster.ts` | Delete | Dead code |
| `packages/price-pipeline/src/tier3-eventbrite-dice.ts` | Delete | Dead code |
| `packages/price-pipeline/src/tier4-songkick-bandsintown.ts` | Delete | Dead code |
| `packages/price-pipeline/src/tier5-seatgeek.ts` | Delete | Dead code |
| `packages/price-pipeline/src/__tests__/tier2.test.ts` | Delete | Tests for deleted module |
| `apps/api/src/routes/admin/venues.ts` | Modify | Add `ticketVendor` to create/update schemas; detect vendor on create |
| `apps/api/src/lib/detect-ticket-vendor.ts` | Create | `detectTicketVendor(url)` — fetches homepage HTML, looks for AXS/TM/SeatGeek signals |
| `apps/crawler/src/run.ts` | Modify | Skip events with `pipelineExhaustedAt` set; pass `priceUrl` to pipeline |
| `packages/types/src/index.ts` | Modify | Already listed above |
| `apps/web/src/app/(protected)/events/[id]/page.tsx` | Modify | Fall back to `venue.websiteUrl` when `ticketUrl` is null |
| `apps/web/src/components/admin/VenueDetailsClient.tsx` | Modify | Add `ticketVendor` dropdown to venue edit form |
| `apps/api/.env.example` | Modify | Remove dead price pipeline API key vars |
| `apps/crawler/.env.example` | Modify | Remove dead price pipeline API key vars |
| `docs/runbooks/production-launch.md` | Modify | Remove `TICKETMASTER_API_KEY` row from concert-crawl-api env table |
| `apps/api/scripts/backfill-ticket-vendor.ts` | Create | One-time script to detect + set `ticketVendor` for all existing venues |
| `apps/web/src/components/consumer/PriceSection.tsx` | Modify | **Follow-up PR** — hero CTA when no submissions (blocked on design) |
| `apps/web/src/components/consumer/SubmitPriceCardCta.tsx` | Modify | **Follow-up PR** — upgrade copy + visual weight (blocked on design) |
| `apps/web/src/components/onboarding/steps/YoureIn.tsx` | Modify | **Follow-up PR** — community pricing callout (blocked on design) |

---

## Task 1: DB migration — `ticket_vendor` on venues

**Files:**
- Create: `packages/db/migrations/0020_ticket_vendor.sql`
- Modify: `packages/db/src/schema/venues.ts`

- [ ] **Step 1: Write the migration**

```sql
-- packages/db/migrations/0020_ticket_vendor.sql
CREATE TYPE "public"."ticket_vendor_enum" AS ENUM(
  'axs',
  'ticketmaster',
  'seatgeek',
  'dice',
  'eventbrite',
  'venue_box_office',
  'unknown'
);

ALTER TABLE "venues" ADD COLUMN "ticket_vendor" "ticket_vendor_enum";
```

> **Important:** The `when` field in `drizzle.config.ts` must be greater than all prior entries. Check `packages/db/migrations/meta/_journal.json` for the latest timestamp and add 1+ seconds.

- [ ] **Step 2: Update the journal**

Open `packages/db/migrations/meta/_journal.json`. Add an entry:

```json
{
  "idx": 20,
  "version": "7",
  "when": <last_when + 1>,
  "tag": "0020_ticket_vendor",
  "breakpoints": true
}
```

- [ ] **Step 3: Update the Drizzle schema**

In `packages/db/src/schema/venues.ts`, add the enum and column:

```ts
// add to existing imports: pgEnum is already imported
export const ticketVendorEnum = pgEnum('ticket_vendor_enum', [
  'axs',
  'ticketmaster',
  'seatgeek',
  'dice',
  'eventbrite',
  'venue_box_office',
  'unknown',
])

// add inside pgTable definition, after priceUrl:
ticketVendor: ticketVendorEnum('ticket_vendor'),
```

- [ ] **Step 4: Run migration locally**

```bash
cd /Users/huey/Projects/concert-crawl/.worktrees/feat/pricing-rework
pnpm db:migrate
```

Expected: migration runs without error; `\d venues` in psql shows `ticket_vendor` column.

- [ ] **Step 5: Commit**

```bash
git add packages/db/migrations/0020_ticket_vendor.sql packages/db/migrations/meta/_journal.json packages/db/src/schema/venues.ts
git commit -m "feat(db): add ticket_vendor enum + column to venues"
```

---

## Task 2: DB migration — `pipeline_exhausted_at` on events

**Files:**
- Create: `packages/db/migrations/0021_pipeline_exhausted_at.sql`
- Modify: `packages/db/src/schema/events.ts`

- [ ] **Step 1: Write the migration**

```sql
-- packages/db/migrations/0021_pipeline_exhausted_at.sql
ALTER TABLE "events" ADD COLUMN "pipeline_exhausted_at" timestamp with time zone;
```

- [ ] **Step 2: Update the journal**

Add to `packages/db/migrations/meta/_journal.json`:

```json
{
  "idx": 21,
  "version": "7",
  "when": <0020_when + 1>,
  "tag": "0021_pipeline_exhausted_at",
  "breakpoints": true
}
```

- [ ] **Step 3: Update the Drizzle schema**

In `packages/db/src/schema/events.ts`, add after `priceSource`:

```ts
pipelineExhaustedAt: timestamp('pipeline_exhausted_at', { withTimezone: true }),
```

- [ ] **Step 4: Run migration locally**

```bash
pnpm db:migrate
```

Expected: no error; `pipeline_exhausted_at` column visible in events table.

- [ ] **Step 5: Commit**

```bash
git add packages/db/migrations/0021_pipeline_exhausted_at.sql packages/db/migrations/meta/_journal.json packages/db/src/schema/events.ts
git commit -m "feat(db): add pipeline_exhausted_at to events"
```

---

## Task 3: Update shared types

**Files:**
- Modify: `packages/types/src/index.ts`

- [ ] **Step 1: Add `TicketVendor` type and update `Venue` + `Event` interfaces**

In `packages/types/src/index.ts`:

1. Add after the existing `Vendor` type (around line 58):

```ts
export type TicketVendor =
  | 'axs'
  | 'ticketmaster'
  | 'seatgeek'
  | 'dice'
  | 'eventbrite'
  | 'venue_box_office'
  | 'unknown'
```

2. In the `Venue` interface (around line 91), add after `contactEmail`:

```ts
priceUrl: string | null
ticketVendor: TicketVendor | null
```

3. In the `Event` interface (around line 164), add after `priceSource`:

```ts
pipelineExhaustedAt: string | null
```

- [ ] **Step 2: Typecheck**

```bash
pnpm --filter @concert-crawl/types typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add packages/types/src/index.ts
git commit -m "feat(types): add TicketVendor, ticketVendor to Venue, pipelineExhaustedAt to Event"
```

---

## Task 4: Ticket vendor auto-detection on venue create

**Files:**
- Create: `apps/api/src/lib/detect-ticket-vendor.ts`
- Modify: `apps/api/src/routes/admin/venues.ts`

- [ ] **Step 1: Write a failing test for `detectTicketVendor`**

Create `apps/api/src/lib/__tests__/detect-ticket-vendor.test.ts`:

```ts
import { describe, it, expect, vi, afterEach } from 'vitest'
import { detectTicketVendor } from '../detect-ticket-vendor.js'

afterEach(() => vi.restoreAllMocks())

const mockFetch = (html: string) =>
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({ ok: true, text: async () => html }),
  )

describe('detectTicketVendor', () => {
  it('returns axs when AXS button class found', async () => {
    mockFetch('<button class="axs-btn">Buy</button>')
    expect(await detectTicketVendor('https://venue.example')).toBe('axs')
  })

  it('returns axs when axs.com link found', async () => {
    mockFetch('<a href="https://www.axs.com/events/123">Tickets</a>')
    expect(await detectTicketVendor('https://venue.example')).toBe('axs')
  })

  it('returns ticketmaster when ticketmaster.com link found', async () => {
    mockFetch('<a href="https://www.ticketmaster.com/event/456">Tickets</a>')
    expect(await detectTicketVendor('https://venue.example')).toBe('ticketmaster')
  })

  it('returns seatgeek when seatgeek.com link found', async () => {
    mockFetch('<a href="https://seatgeek.com/event/789">Tickets</a>')
    expect(await detectTicketVendor('https://venue.example')).toBe('seatgeek')
  })

  it('returns dice when dice.fm link found', async () => {
    mockFetch('<a href="https://dice.fm/event/abc">Tickets</a>')
    expect(await detectTicketVendor('https://venue.example')).toBe('dice')
  })

  it('returns eventbrite when eventbrite.com link found', async () => {
    mockFetch('<a href="https://www.eventbrite.com/e/event-123">Tickets</a>')
    expect(await detectTicketVendor('https://venue.example')).toBe('eventbrite')
  })

  it('returns unknown when no vendor signals found', async () => {
    mockFetch('<html><body>No ticket links here</body></html>')
    expect(await detectTicketVendor('https://venue.example')).toBe('unknown')
  })

  it('returns unknown when fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('timeout')))
    expect(await detectTicketVendor('https://venue.example')).toBe('unknown')
  })

  it('returns unknown when response is not ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
    expect(await detectTicketVendor('https://venue.example')).toBe('unknown')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter @concert-crawl/api vitest run src/lib/__tests__/detect-ticket-vendor.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `detectTicketVendor`**

Create `apps/api/src/lib/detect-ticket-vendor.ts`:

```ts
import type { TicketVendor } from '@concert-crawl/types'

const VENDOR_SIGNALS: Array<{ pattern: RegExp; vendor: TicketVendor }> = [
  { pattern: /axs\.com/i, vendor: 'axs' },
  { pattern: /class="axs-/i, vendor: 'axs' },
  { pattern: /ticketmaster\.com/i, vendor: 'ticketmaster' },
  { pattern: /seatgeek\.com/i, vendor: 'seatgeek' },
  { pattern: /dice\.fm/i, vendor: 'dice' },
  { pattern: /eventbrite\.com/i, vendor: 'eventbrite' },
]

export async function detectTicketVendor(websiteUrl: string): Promise<TicketVendor> {
  try {
    const res = await fetch(websiteUrl, {
      headers: { 'User-Agent': 'ConcertCrawl/1.0 (+https://concertcrawl.app/bot)' },
      signal: AbortSignal.timeout(8_000),
    })
    if (!res.ok) return 'unknown'
    const html = await res.text()
    for (const { pattern, vendor } of VENDOR_SIGNALS) {
      if (pattern.test(html)) return vendor
    }
    return 'unknown'
  } catch {
    return 'unknown'
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm --filter @concert-crawl/api vitest run src/lib/__tests__/detect-ticket-vendor.test.ts
```

Expected: all 9 tests PASS.

- [ ] **Step 5: Wire into venue creation route**

In `apps/api/src/routes/admin/venues.ts`:

1. Add import at top:

```ts
import { detectTicketVendor } from '../../lib/detect-ticket-vendor.js'
```

2. Update `createVenueSchema` to include optional `ticketVendor` (admin can pre-set it):

```ts
const createVenueSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().min(2).max(60).regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/, '...'),
  websiteUrl: z.string().url(),
  city: z.string().default('Denver'),
  active: z.boolean().default(true),
  crawlDelayMs: z.number().int().min(1000).max(30000).default(3000),
  crawlWaitUntil: z.enum(['networkidle', 'load', 'domcontentloaded']).default('networkidle'),
  crawlWaitForSelector: z.string().max(200).transform((val) => val.trim() || null).nullable().optional(),
  ticketVendor: z.enum(['axs', 'ticketmaster', 'seatgeek', 'dice', 'eventbrite', 'venue_box_office', 'unknown']).nullable().optional(),
})
```

3. Update the POST handler body to auto-detect when `ticketVendor` not supplied:

```ts
const detectedVendor = body.ticketVendor ?? await detectTicketVendor(body.websiteUrl)

const [venue] = await db
  .insert(venues)
  .values({ ...body, ticketVendor: detectedVendor, verified: true })
  .returning()
```

4. Update `updateVenueSchema` to allow admin override:

```ts
const updateVenueSchema = createVenueSchema.partial().extend({
  active: z.boolean().optional(),
  verified: z.boolean().optional(),
  verifiedBy: z.string().max(200).nullable().optional(),
  ticketVendor: z.enum(['axs', 'ticketmaster', 'seatgeek', 'dice', 'eventbrite', 'venue_box_office', 'unknown']).nullable().optional(),
})
```

- [ ] **Step 6: Typecheck**

```bash
pnpm --filter @concert-crawl/api typecheck
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/lib/detect-ticket-vendor.ts apps/api/src/lib/__tests__/detect-ticket-vendor.test.ts apps/api/src/routes/admin/venues.ts
git commit -m "feat(api): auto-detect ticketVendor on venue creation"
```

---

## Task 5: Strip dead pipeline tiers (2-5)

**Files:**
- Modify: `packages/price-pipeline/src/index.ts`
- Delete: `packages/price-pipeline/src/tier2-ticketmaster.ts`
- Delete: `packages/price-pipeline/src/tier3-eventbrite-dice.ts`
- Delete: `packages/price-pipeline/src/tier4-songkick-bandsintown.ts`
- Delete: `packages/price-pipeline/src/tier5-seatgeek.ts`
- Delete: `packages/price-pipeline/src/__tests__/tier2.test.ts`

- [ ] **Step 1: Write a test verifying the new pipeline structure**

Create `packages/price-pipeline/src/__tests__/pipeline.test.ts`:

```ts
import { describe, it, expect, vi, afterEach } from 'vitest'

afterEach(() => vi.restoreAllMocks())

describe('runPricePipeline', () => {
  it('does not call ticketmaster, eventbrite, dice, songkick, bandsintown, or seatgeek sources', async () => {
    // Check that the index module does not import any tier 2-5 modules
    const src = await import('fs').then((fs) =>
      fs.readFileSync(
        new URL('../index.ts', import.meta.url).pathname,
        'utf-8',
      ),
    )
    expect(src).not.toContain('tier2-ticketmaster')
    expect(src).not.toContain('tier3-eventbrite')
    expect(src).not.toContain('tier4-songkick')
    expect(src).not.toContain('tier5-seatgeek')
  })
})
```

- [ ] **Step 2: Run test to verify it fails (currently the imports are present)**

```bash
pnpm --filter @concert-crawl/price-pipeline vitest run src/__tests__/pipeline.test.ts
```

Expected: FAIL — strings found in index.ts.

- [ ] **Step 3: Rewrite `packages/price-pipeline/src/index.ts`**

Replace the entire file:

```ts
import { eq, isNull, sql } from 'drizzle-orm'
import { db, events, priceRetrievalLog } from '@concert-crawl/db'
import type { PriceSource } from '@concert-crawl/types'
import type { PipelineContext, PriceTierResult } from './types.js'
import { tier1StructuredData } from './tier1-structured-data.js'
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

async function updateEventPrice(
  eventId: string,
  result: PriceTierResult,
): Promise<void> {
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
  const t1 = await runTier(ctx, 'structured_data', tier1StructuredData)
  if (t1) {
    await updateEventPrice(ctx.eventId, t1)
    return
  }

  const t6 = await runTier(ctx, 'community', tier6Community)
  if (t6) {
    await updateEventPrice(ctx.eventId, t6)
    return
  }

  // All tiers exhausted — mark event so the crawler skips it on subsequent runs
  await db
    .update(events)
    .set({ pipelineExhaustedAt: sql`now()` })
    .where(eq(events.id, ctx.eventId))
}

export type { PipelineContext, PriceTierResult } from './types.js'
export type { PriceSource } from '@concert-crawl/types'
```

- [ ] **Step 4: Delete the dead tier files**

```bash
rm packages/price-pipeline/src/tier2-ticketmaster.ts
rm packages/price-pipeline/src/tier3-eventbrite-dice.ts
rm packages/price-pipeline/src/tier4-songkick-bandsintown.ts
rm packages/price-pipeline/src/tier5-seatgeek.ts
rm packages/price-pipeline/src/__tests__/tier2.test.ts
```

- [ ] **Step 5: Run the pipeline test to verify it passes**

```bash
pnpm --filter @concert-crawl/price-pipeline vitest run src/__tests__/pipeline.test.ts
```

Expected: PASS.

- [ ] **Step 6: Run full price-pipeline test suite**

```bash
pnpm --filter @concert-crawl/price-pipeline vitest run
```

Expected: all remaining tests pass (tier1, tier6, community tests).

- [ ] **Step 7: Typecheck price-pipeline**

```bash
pnpm --filter @concert-crawl/price-pipeline typecheck
```

Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add packages/price-pipeline/src/index.ts
git rm packages/price-pipeline/src/tier2-ticketmaster.ts packages/price-pipeline/src/tier3-eventbrite-dice.ts packages/price-pipeline/src/tier4-songkick-bandsintown.ts packages/price-pipeline/src/tier5-seatgeek.ts packages/price-pipeline/src/__tests__/tier2.test.ts
git add packages/price-pipeline/src/__tests__/pipeline.test.ts
git commit -m "feat(price-pipeline): strip dead tiers 2-5, set pipelineExhaustedAt on full miss"
```

---

## Task 6: Skip exhausted events in the crawler

**Files:**
- Modify: `apps/crawler/src/run.ts`

- [ ] **Step 1: Read the crawler run.ts to find the event selection query**

The function `runPricesForVenue` selects events and calls `runPricePipeline`. Find its event SELECT query.

- [ ] **Step 2: Write a failing test**

Since `run.ts` is an integration entrypoint (Playwright + DB), add a narrow unit test in `apps/crawler/src/__tests__/price-skip.test.ts`:

```ts
import { describe, it, expect } from 'vitest'

describe('exhausted event filter', () => {
  it('SQL filter string includes pipeline_exhausted_at IS NULL', () => {
    // Minimal check that the query builder includes the exhausted filter.
    // This acts as a canary — if someone removes the filter, this test fails.
    const src = require('fs').readFileSync(
      require('path').join(__dirname, '../run.ts'),
      'utf-8',
    )
    expect(src).toContain('pipelineExhaustedAt')
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

```bash
pnpm --filter @concert-crawl/crawler vitest run src/__tests__/price-skip.test.ts
```

Expected: FAIL.

- [ ] **Step 4: Update `run.ts` to filter out exhausted events and pass `priceUrl`**

Find the event selection in `runPricesForVenue`. Add `isNull(events.pipelineExhaustedAt)` to the WHERE clause:

```ts
// Before: .where(eq(events.status, 'upcoming'))
// After:
.where(
  and(
    eq(events.status, 'upcoming'),
    isNull(events.pipelineExhaustedAt),
  ),
)
```

Also add `priceUrl: venues.priceUrl` to the SELECT and pass it through to `runPricePipeline`:

```ts
await runPricePipeline({
  eventId: event.id,
  venueId: narrowedVenueId,
  artist: event.artist,
  date: event.date,
  priceUrl: event.venue?.priceUrl ?? null,  // enables tier 1 from crawler path
  ticketUrl: event.ticketUrl,
})
```

- [ ] **Step 5: Run test to verify it passes**

```bash
pnpm --filter @concert-crawl/crawler vitest run src/__tests__/price-skip.test.ts
```

Expected: PASS.

- [ ] **Step 6: Typecheck crawler**

```bash
pnpm --filter @concert-crawl/crawler typecheck
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add apps/crawler/src/run.ts apps/crawler/src/__tests__/price-skip.test.ts
git commit -m "fix(crawler): skip exhausted events, pass priceUrl to pipeline"
```

---

## Task 7: Fix "Get Tickets" button for events with null ticketUrl (Issue #324)

**Files:**
- Modify: `apps/web/src/app/(protected)/events/[id]/page.tsx`

The current code (line ~322): `event.ticketUrl && (<a href={event.ticketUrl}>...)`. When `ticketUrl` is null (AXS events), the button disappears entirely. Fix: fall back to `venue.websiteUrl`.

- [ ] **Step 1: Write a failing test**

This is a UI component — no Vitest unit test is appropriate. Instead, add a comment-guarded integration note and verify by manual inspection after implementation. However, write a type-level assertion to confirm `websiteUrl` is available in scope:

Read `apps/web/src/app/(protected)/events/[id]/page.tsx` lines 1-50 to confirm the `event` object shape. The `EventDetailResponse` type already includes `venue.websiteUrl` via `EventWithVenue`. No new data fetching needed.

- [ ] **Step 2: Update the CTA block**

In `apps/web/src/app/(protected)/events/[id]/page.tsx`, replace lines 317-341 (the primary CTA block):

```tsx
{/* Primary CTA — sold out or get tickets */}
{!isCancelled && !isPostponed && (
  <div className="mt-5">
    {isSoldOut ? (
      <SoldOutCta />
    ) : (
      (() => {
        const href = event.ticketUrl ?? event.venue.websiteUrl
        return (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-12 w-full items-center justify-center rounded-[10px] text-fg-on-accent"
            style={{
              background: 'var(--accent)',
              fontFamily: 'var(--font-ui)',
              fontWeight: 800,
              fontSize: 15,
              letterSpacing: '-0.01em',
            }}
          >
            {event.ticketUrl ? copy.ticketsCta : 'Visit Venue Website'} ↗
          </a>
        )
      })()
    )}
  </div>
)}
```

- [ ] **Step 3: Verify in browser**

Start dev server: `pnpm dev` (from worktree root). Navigate to an AXS event detail page (e.g. Ogden or Gothic Theatre event). Confirm "Visit Venue Website ↗" button appears and links to the venue's website. Then navigate to a TM event and confirm "Get Tickets ↗" still appears with `ticketUrl`.

- [ ] **Step 4: Typecheck**

```bash
pnpm --filter @concert-crawl/web typecheck
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/(protected)/events/\[id\]/page.tsx
git commit -m "fix(web): fall back to venue websiteUrl when ticketUrl is null (closes #324)"
```

---

## Task 8: Backfill `ticketVendor` for existing venues (one-time script)

**Files:**
- Create: `apps/api/scripts/backfill-ticket-vendor.ts`

Existing venues were created before `ticket_vendor` existed and will have `NULL`. This script fetches each venue's homepage and writes the detected vendor.

- [ ] **Step 1: Write the script**

Create `apps/api/scripts/backfill-ticket-vendor.ts`:

```ts
/**
 * One-time backfill: detect and set ticket_vendor for all venues where it is NULL.
 *
 * Run from the monorepo root:
 *   env $(grep -v '^#' apps/api/.env.local | grep -v '^$' | xargs) \
 *     apps/crawler/node_modules/.bin/tsx apps/api/scripts/backfill-ticket-vendor.ts
 */
import { isNull } from 'drizzle-orm'
import { db, venues } from '@concert-crawl/db'
import { detectTicketVendor } from '../src/lib/detect-ticket-vendor.js'

const DELAY_MS = 2_000 // polite delay between requests

async function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

const rows = await db
  .select({ id: venues.id, name: venues.name, websiteUrl: venues.websiteUrl })
  .from(venues)
  .where(isNull(venues.ticketVendor))

console.log(`Backfilling ${rows.length} venue(s)...`)

for (const row of rows) {
  process.stdout.write(`  ${row.name} (${row.websiteUrl}) → `)
  const vendor = await detectTicketVendor(row.websiteUrl)
  await db.update(venues).set({ ticketVendor: vendor }).where(eq(venues.id, row.id))
  console.log(vendor)
  await sleep(DELAY_MS)
}

console.log('Done.')
```

Also add the missing `eq` import: `import { eq, isNull } from 'drizzle-orm'`

- [ ] **Step 2: Run locally to verify**

```bash
env $(grep -v '^#' apps/api/.env.local | grep -v '^$' | xargs) \
  apps/crawler/node_modules/.bin/tsx apps/api/scripts/backfill-ticket-vendor.ts
```

Expected: each venue name printed with detected vendor; no errors.

Verify in psql: `SELECT name, ticket_vendor FROM venues;`

- [ ] **Step 3: Commit**

```bash
git add apps/api/scripts/backfill-ticket-vendor.ts
git commit -m "feat(api): one-time backfill script for ticket_vendor on existing venues"
```

---

## Task 9: Remove dead env vars + update runbook

**Files:**
- Modify: `apps/api/.env.example`
- Modify: `apps/crawler/.env.example`
- Modify: `docs/runbooks/production-launch.md`

Dead vars being removed: `TICKETMASTER_API_KEY`, `EVENTBRITE_API_TOKEN`, `DICE_API_KEY`, `SONGKICK_API_KEY`, `BANDSINTOWN_APP_ID`, `SEATGEEK_CLIENT_ID`, `SEATGEEK_CLIENT_SECRET`

- [ ] **Step 1: Update `apps/api/.env.example`**

Remove the entire section at the bottom of the file:

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

- [ ] **Step 2: Update `apps/crawler/.env.example`**

Remove the same section from the crawler `.env.example`.

- [ ] **Step 3: Update `docs/runbooks/production-launch.md`**

In the **concert-crawl-api** env table (Step 4 section), remove the row:

```
| `TICKETMASTER_API_KEY`  | From Ticketmaster developer portal (price pipeline)                |
```

- [ ] **Step 4: Commit**

```bash
git add apps/api/.env.example apps/crawler/.env.example docs/runbooks/production-launch.md
git commit -m "chore: remove dead price pipeline API key env vars"
```

---

## Task 10: Admin venue edit — ticketVendor dropdown

**Files:**
- Modify: `apps/web/src/components/admin/VenueDetailsClient.tsx`

- [ ] **Step 1: Read the existing edit form in `VenueDetailsClient.tsx`**

Find the venue update form (look for `PATCH /v1/admin/venues/:id` call or a form with `name`, `slug`, etc. inputs).

- [ ] **Step 2: Add the `ticketVendor` field to the displayed venue type and form state**

In `VenueDetailsClient.tsx`, the venue prop comes in as `VenueWithCrawlHealth` from `@concert-crawl/types`. After Task 3 above updates that type to include `ticketVendor`, the form needs a new `<select>` for it.

Locate the section of the form that renders the venue edit inputs. Add a new field after the existing fields:

```tsx
<div>
  <label
    htmlFor="ticketVendor"
    style={{ fontSize: 12, color: 'var(--fg-muted)', fontFamily: 'var(--font-ui)' }}
  >
    Ticket Vendor
  </label>
  <select
    id="ticketVendor"
    value={form.ticketVendor ?? ''}
    onChange={(evt) => setForm((prev) => ({ ...prev, ticketVendor: evt.target.value || null }))}
    style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-1)', color: 'var(--fg)', fontFamily: 'var(--font-ui)', fontSize: 13 }}
  >
    <option value="">— Auto-detected / Unknown —</option>
    <option value="axs">AXS</option>
    <option value="ticketmaster">Ticketmaster</option>
    <option value="seatgeek">SeatGeek</option>
    <option value="dice">DICE</option>
    <option value="eventbrite">Eventbrite</option>
    <option value="venue_box_office">Venue Box Office</option>
    <option value="unknown">Unknown</option>
  </select>
</div>
```

Ensure the form state type includes `ticketVendor: string | null` and the PATCH payload sends it:

```ts
await apiClient.patch(`/v1/admin/venues/${venue.id}`, token, {
  ...otherFields,
  ticketVendor: form.ticketVendor ?? null,
})
```

- [ ] **Step 3: Verify in browser**

Navigate to an admin venue detail page. Confirm the Ticket Vendor dropdown appears, shows the current value (or empty for auto/unknown), and can be changed and saved.

- [ ] **Step 4: Typecheck**

```bash
pnpm --filter @concert-crawl/web typecheck
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/admin/VenueDetailsClient.tsx
git commit -m "feat(admin): add ticketVendor dropdown to venue edit form"
```

---

## Task 11: Pre-push checks + open PR

- [ ] **Step 1: Run full typecheck + lint + tests across the monorepo**

```bash
cd /Users/huey/Projects/concert-crawl/.worktrees/feat/pricing-rework
pnpm typecheck && pnpm lint && pnpm test
```

Expected: all pass.

- [ ] **Step 2: Rebase on main**

```bash
git fetch origin && git rebase origin/main
```

- [ ] **Step 3: Update `docs/superpowers/progress.md`**

Add a 🔄 row for this PR.

- [ ] **Step 4: Push and open PR**

```bash
git push -u origin feat/pricing-rework
gh pr create --title "feat: pricing rework — strip dead tiers, ticketVendor, fix Get Tickets" --body "$(cat <<'EOF'
## Summary
- Strip dead price pipeline tiers 2-5 (TM, Eventbrite/Dice, Songkick/Bandsintown, SeatGeek) — zero historical hits, wasted bandwidth
- Add `pipeline_exhausted_at` to events; pipeline marks it on full miss; crawler skips those events on subsequent runs
- Add `ticket_vendor` enum + column to venues; auto-detected via HTML signal scan on venue creation; admin-overridable dropdown in venue edit form; one-time backfill script for existing venues
- Remove dead API key env vars (`TICKETMASTER_API_KEY`, `EVENTBRITE_API_TOKEN`, etc.) from `.env.example` and runbook
- Fix #324: "Get Tickets" button now falls back to `venue.websiteUrl` when `ticketUrl` is null (AXS events)

Consumer-facing community price UI (hero CTA, onboarding callout) tracked in follow-up PR pending design.

## Dead env vars — remove from Render after deploy
These are no longer used and can be deleted from Render environment settings:
- `TICKETMASTER_API_KEY`
- `EVENTBRITE_API_TOKEN`
- `DICE_API_KEY`
- `SONGKICK_API_KEY`
- `BANDSINTOWN_APP_ID`
- `SEATGEEK_CLIENT_ID`
- `SEATGEEK_CLIENT_SECRET`

## New migrations
- `0020_ticket_vendor.sql` — `ticket_vendor_enum` type + `ticket_vendor` column on `venues`
- `0021_pipeline_exhausted_at.sql` — `pipeline_exhausted_at` column on `events`

Run `pnpm db:migrate` on staging and prod after deploy.

## Post-deploy one-time action
Run the backfill script to populate `ticket_vendor` on existing venues:
```
env $(cat apps/api/.env.local | grep -v '^#' | xargs) \
  apps/crawler/node_modules/.bin/tsx apps/api/scripts/backfill-ticket-vendor.ts
```

## Test plan
- [ ] `pnpm test` passes across all packages
- [ ] Local: create a new venue via admin UI — ticket vendor auto-detected and displayed
- [ ] Local: override ticket vendor via admin venue edit dropdown — saves correctly
- [ ] Local: navigate to AXS event detail — "Visit Venue Website ↗" button appears
- [ ] Local: navigate to TM event detail — "Get Tickets ↗" button still appears
- [ ] Local: run backfill script — all existing venues get a vendor value
- [ ] Staging: run migrations, trigger crawler run, verify exhausted events are skipped on second pass

Closes #324
EOF
)"
```

---

## Task 12: Follow-up PR — community price hero UI (BLOCKED ON DESIGN)

> **Status:** Do not implement until designs are delivered. See design prompt in the plan's design section below.

**Scope:**
- `apps/web/src/components/consumer/PriceSection.tsx` — hero "no price yet" state
- `apps/web/src/components/consumer/SubmitPriceCardCta.tsx` — update or retire
- `apps/web/src/components/onboarding/steps/YoureIn.tsx` — community pricing paragraph

These changes require a new worktree (`feat/community-price-hero`) once designs arrive.

---

## Design Brief (for Tasks 12)

### Event Detail — Community Price Hero State

**Context:** The event detail page (`/events/[id]`) shows a price card when a price exists. When no price is found (most AXS venues), the current UI shows a small dashed-border "Saw a different price?" link and hides the community price section entirely. This needs to become a prominent, purposeful call to action.

**Scenarios to design:**

1. **No price, no community submissions** — primary hero state. Most events will be in this state at launch.
2. **Community submissions exist but no official price** — current `CommunityPriceChip` + confirm flow (this state already works; keep as-is or refine).
3. **Official price exists** — current `PriceDisplay` card (keep as-is).

**What to design for Scenario 1:**
- A card or section that communicates "we don't have a price for this show — help us get one"
- Must feel like a feature, not an absence. This is the product's grassroots identity.
- Should include: a short headline, 1-2 lines of body copy, a clear CTA ("Report a price" or similar)
- The current submit flow is at `/events/[id]/submit-price` — the CTA links there
- Consider: does the card replace the price card container, sit below it, or both?

**Design constraints:**
- Mobile-first (320px baseline). Most users will see this on iPhone.
- Existing token system: `--fg`, `--fg-muted`, `--fg-subtle`, `--signal`, `--accent`, `--border`, `--border-strong`, `--surface-1`, `var(--font-ui)`, `var(--font-mono)`
- The signal color (`--signal`) is the brand's "action" color — appropriate for this CTA
- Existing component for reference: the current `SubmitPriceCardCta` (dashed border, "Saw a different price?" copy)
- The `CommunityPriceChip` component shows the confirmed community state — the new design should feel like a step earlier in that journey

### Onboarding — Community Pricing Callout

**Context:** The `YoureIn` onboarding step tells new beta users "you're not just here to use the thing — you're here to make it better." We want to make community pricing concrete: what does "making it better" mean in practice?

**What to design:**
- A paragraph or card addition to the `YoureIn` step that names community pricing specifically
- Should feel like a personal ask from the founder, not a product feature list
- Tone: direct, human, low-pressure. "When you buy a ticket, report the price. That's it."
- Consider: inline paragraph vs. a highlighted callout card vs. a small icon+text row

**Design constraints:** Same token system as above. This is a static component (no interactive state needed).

---

## Self-Review

**Files:**
- Modify: `apps/web/src/components/consumer/PriceSection.tsx`
- Modify: `apps/web/src/components/consumer/SubmitPriceCardCta.tsx`
- Modify: `apps/web/src/app/(protected)/events/[id]/page.tsx`

**Goal:** When no price exists and no community submissions exist, show a bold, prominent "Be the first to report the price" card — not the hidden `null` return from `PriceSection`. The `SubmitPriceCardCta` should be the hero in that state.

- [ ] **Step 1: Redesign `PriceSection.tsx` to show a hero state when empty**

Replace the `if (loading || !topSubmission) return null` line and add a hero-empty state. Full replacement of `PriceSection.tsx`:

```tsx
'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import Link from 'next/link'
import { CommunityPriceChip } from './CommunityPriceChip'
import { VerifySheet } from './VerifySheet'
import type {
  SubmissionListResponse,
  SubmissionWithMeta,
} from '@concert-crawl/types'

interface PriceSectionProps {
  eventId: string
  artistName: string
  venueName: string
  eventDate: string
}

export function PriceSection({
  eventId,
  artistName,
  venueName,
  eventDate,
}: PriceSectionProps) {
  const { getToken, userId } = useAuth()
  const [verifyOpen, setVerifyOpen] = useState(false)
  const [submissions, setSubmissions] = useState<SubmissionWithMeta[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchSubmissions() {
      try {
        const token = await getToken()
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/v1/events/${eventId}/price-submissions`,
          token ? { headers: { Authorization: `Bearer ${token}` } } : {},
        )
        if (!res.ok) return
        const data = (await res.json()) as {
          success: boolean
          data: SubmissionListResponse
        }
        if (data.success) setSubmissions(data.data.submissions)
      } finally {
        setLoading(false)
      }
    }
    void fetchSubmissions()
  }, [eventId, getToken])

  async function handleQuickConfirm() {
    const topSub = submissions[0]
    if (!topSub) return
    const token = await getToken()
    if (!token) return
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/v1/submissions/${topSub.id}/confirm`,
      { method: 'POST', headers: { Authorization: `Bearer ${token}` } },
    )
    if (res.ok) {
      const data = (await res.json()) as {
        data: { confirms: number; status: SubmissionWithMeta['status'] }
      }
      setSubmissions((prev) =>
        prev.map((sub, idx) =>
          idx === 0
            ? {
                ...sub,
                confirms: data.data.confirms,
                status: data.data.status,
                byYou: true,
              }
            : sub,
        ),
      )
    }
  }

  const topSubmission = submissions[0]

  if (loading) return null

  if (!topSubmission) {
    return (
      <Link
        href={`/events/${eventId}/submit-price`}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          padding: '14px 16px',
          borderRadius: 10,
          border: '1.5px solid var(--signal)',
          background: 'color-mix(in srgb, var(--signal) 6%, transparent)',
          textDecoration: 'none',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-ui)',
            fontWeight: 800,
            fontSize: 14,
            color: 'var(--fg)',
            letterSpacing: '-0.01em',
          }}
        >
          No price listed yet — be first.
        </span>
        <span
          style={{
            fontFamily: 'var(--font-ui)',
            fontSize: 12,
            color: 'var(--fg-muted)',
            lineHeight: 1.45,
          }}
        >
          Report what you paid or saw. Two confirms makes it official.
        </span>
        <span
          style={{
            marginTop: 4,
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: 'var(--signal)',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}
        >
          Submit a price →
        </span>
      </Link>
    )
  }

  return (
    <>
      <CommunityPriceChip
        topSubmission={topSubmission}
        submissionCount={submissions.length}
        currentUserId={userId ?? null}
        onConfirm={handleQuickConfirm}
        onOpenVerify={() => setVerifyOpen(true)}
      />
      <VerifySheet
        open={verifyOpen}
        onClose={() => setVerifyOpen(false)}
        submissions={submissions}
        eventId={eventId}
        artistName={artistName}
        venueName={venueName}
        eventDate={eventDate}
        currentUserId={userId ?? null}
      />
    </>
  )
}
```

- [ ] **Step 2: Remove the now-redundant `SubmitPriceCardCta` from the event detail page**

In `apps/web/src/app/(protected)/events/[id]/page.tsx`, remove the `SubmitPriceCardCta` block (lines ~267-270):

```tsx
{/* Remove this entire block: */}
{/* Submit-a-price card CTA */}
<div className="mt-3">
  <SubmitPriceCardCta eventId={event.id} />
</div>
```

Also remove the `SubmitPriceCardCta` import if it's no longer used elsewhere in the file.

- [ ] **Step 3: Verify in browser**

Navigate to an event page with no price and no submissions. Confirm the signal-colored "No price listed yet — be first." card appears where the small dashed-border link used to be. Navigate to an event with existing community submissions — confirm the `CommunityPriceChip` renders as before.

- [ ] **Step 4: Typecheck**

```bash
pnpm --filter @concert-crawl/web typecheck
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/consumer/PriceSection.tsx apps/web/src/app/(protected)/events/\[id\]/page.tsx
git commit -m "feat(web): elevate community price submission to hero feature on event detail"
```

---

## Task 10: Admin venue edit — ticketVendor dropdown

**Files:**
- Modify: `apps/web/src/components/admin/VenueDetailsClient.tsx`

- [ ] **Step 1: Read the existing edit form in `VenueDetailsClient.tsx`**

Find the venue update form (look for `PATCH /v1/admin/venues/:id` call or a form with `name`, `slug`, etc. inputs).

- [ ] **Step 2: Add the `ticketVendor` field to the displayed venue type and form state**

In `VenueDetailsClient.tsx`, the venue prop comes in as `VenueWithCrawlHealth` from `@concert-crawl/types`. After Task 3 above updates that type to include `ticketVendor`, the form needs a new `<select>` for it.

Locate the section of the form that renders the venue edit inputs. Add a new field after the existing fields:

```tsx
<div>
  <label
    htmlFor="ticketVendor"
    style={{ fontSize: 12, color: 'var(--fg-muted)', fontFamily: 'var(--font-ui)' }}
  >
    Ticket Vendor
  </label>
  <select
    id="ticketVendor"
    value={form.ticketVendor ?? ''}
    onChange={(evt) => setForm((prev) => ({ ...prev, ticketVendor: evt.target.value || null }))}
    style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-1)', color: 'var(--fg)', fontFamily: 'var(--font-ui)', fontSize: 13 }}
  >
    <option value="">— Auto-detected / Unknown —</option>
    <option value="axs">AXS</option>
    <option value="ticketmaster">Ticketmaster</option>
    <option value="seatgeek">SeatGeek</option>
    <option value="dice">DICE</option>
    <option value="eventbrite">Eventbrite</option>
    <option value="venue_box_office">Venue Box Office</option>
    <option value="unknown">Unknown</option>
  </select>
</div>
```

Ensure the form state type includes `ticketVendor: string | null` and the PATCH payload sends it:

```ts
await apiClient.patch(`/v1/admin/venues/${venue.id}`, token, {
  ...otherFields,
  ticketVendor: form.ticketVendor ?? null,
})
```

- [ ] **Step 3: Verify in browser**

Navigate to an admin venue detail page. Confirm the Ticket Vendor dropdown appears, shows the current value (or "Auto-detected / Unknown"), and can be changed and saved.

- [ ] **Step 4: Typecheck**

```bash
pnpm --filter @concert-crawl/web typecheck
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/admin/VenueDetailsClient.tsx
git commit -m "feat(admin): add ticketVendor dropdown to venue edit form"
```

---

## Task 10: Onboarding — community pricing callout

**Files:**
- Modify: `apps/web/src/components/onboarding/steps/YoureIn.tsx`

- [ ] **Step 1: Read the current `YoureIn.tsx`**

Open `apps/web/src/components/onboarding/steps/YoureIn.tsx`. Find the paragraph that says "You're not just here to use the thing — you're here to make it better."

- [ ] **Step 2: Add a community pricing paragraph**

After the existing "make it better" paragraph, add:

```tsx
<p style={{ marginTop: 10, fontSize: 13.5, lineHeight: 1.6, color: 'var(--fg-muted)' }}>
  Ticket prices aren't listed anywhere yet — that's where you come in. When you
  buy or see a ticket price, report it. Two people confirming a price is all it
  takes to make it official for everyone.
</p>
```

The exact JSX structure should match the surrounding code (inline styles or Tailwind, depending on what the file uses).

- [ ] **Step 3: Verify in browser**

Go through the onboarding flow (or navigate directly to the YoureIn step). Confirm the pricing callout paragraph appears.

- [ ] **Step 4: Typecheck**

```bash
pnpm --filter @concert-crawl/web typecheck
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/onboarding/steps/YoureIn.tsx
git commit -m "feat(web): add community pricing callout to onboarding"
```

---

## Task 11: Pre-push checks + PR

- [ ] **Step 1: Run full typecheck + lint + tests across the monorepo**

```bash
cd /Users/huey/Projects/concert-crawl/.worktrees/feat/pricing-rework
pnpm typecheck && pnpm lint && pnpm test
```

Expected: all pass.

- [ ] **Step 2: Rebase on main**

```bash
git fetch origin && git rebase origin/main
```

- [ ] **Step 3: Update `docs/superpowers/progress.md`**

Add a 🔄 row for this PR (open status, no merge date yet).

- [ ] **Step 4: Push and open PR**

```bash
git push -u origin feat/pricing-rework
gh pr create --title "feat: pricing rework — strip dead tiers, ticketVendor, hero community CTA" --body "$(cat <<'EOF'
## Summary
- Strip dead price pipeline tiers 2-5 (TM, Eventbrite/Dice, Songkick/Bandsintown, SeatGeek) — zero historical hits, wasted bandwidth
- Add `pipeline_exhausted_at` to events; pipeline marks it on full miss and crawler skips those events
- Add `ticket_vendor` enum + column to venues; auto-detected via HTML signal scan on venue creation; admin-overridable dropdown in venue edit form
- Fix #324: "Get Tickets" button now falls back to `venue.websiteUrl` when `ticketUrl` is null (AXS events)
- Promote community price submission from footnote to hero feature: prominent signal-colored CTA when no price/submissions exist
- Add community pricing callout to onboarding YoureIn step

## New env vars
None.

## New migrations
- `0020_ticket_vendor.sql` — `ticket_vendor_enum` type + `ticket_vendor` column on `venues`
- `0021_pipeline_exhausted_at.sql` — `pipeline_exhausted_at` column on `events`

Run `pnpm db:migrate` on staging and prod after deploy.

## Test plan
- [ ] `pnpm test` passes across all packages
- [ ] Local: create a new venue via admin UI — ticket vendor auto-detected
- [ ] Local: override ticket vendor via admin venue edit dropdown
- [ ] Local: navigate to AXS event detail — "Visit Venue Website ↗" button appears
- [ ] Local: navigate to TM event detail — "Get Tickets ↗" button still appears
- [ ] Local: navigate to event with no price — hero "No price listed yet — be first." card visible
- [ ] Local: navigate to event with community submission — `CommunityPriceChip` renders as before
- [ ] Local: complete onboarding — community pricing paragraph visible on YoureIn step
- [ ] Staging: run migrations, verify crawler skips exhausted events after a full pass

Closes #324
EOF
)"
```

---

## Self-Review

**Spec coverage check:**

| Requirement | Covered by | PR |
|-------------|-----------|-----|
| Strip tiers 2-5 | Task 5 | This PR |
| `ticketVendor` enum + DB column | Task 1 | This PR |
| Auto-detect vendor on venue create | Task 4 | This PR |
| Backfill existing venues | Task 8 | This PR |
| Admin override dropdown | Task 10 | This PR |
| `pipelineExhaustedAt` — stop retrying | Tasks 2 + 5 | This PR |
| Crawler skips exhausted events | Task 6 | This PR |
| Crawler passes `priceUrl` (tier 1 fix) | Task 6 | This PR |
| Dead env var cleanup | Task 9 | This PR |
| Fix #324 Get Tickets button | Task 7 | This PR |
| Hero community submit CTA | Task 12 | Follow-up |
| Onboarding callout | Task 12 | Follow-up |
| Shared types updated | Task 3 | This PR |

**Type consistency check:**

- `TicketVendor` values (`'axs'`, `'ticketmaster'`, etc.) are consistent across: DB enum, `packages/types`, Zod schema, and UI dropdown options.
- `pipelineExhaustedAt` is `timestamp with time zone` in DB → `string | null` in types (ISO string after JSON serialization) — correct.
- `detectTicketVendor` returns `TicketVendor` (not nullable) — callers treat `'unknown'` as the null-equivalent. DB column is nullable (no vendor detected yet on existing venues).
