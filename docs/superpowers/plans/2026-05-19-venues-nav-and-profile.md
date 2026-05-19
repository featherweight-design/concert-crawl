# Venues Nav + Profile Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add capacity/type/about fields to venues, redesign the venue profile page to match mocks, add a Venues index page and nav entry, and give admins a one-click LLM generate button for venue profile data.

**Architecture:** Schema-first (migration → types → API → UI). The public API exposes new fields through existing endpoints; a new admin-only endpoint calls Claude Haiku to suggest capacity/type/about for a venue. The web UI changes are self-contained React/Next.js components following existing patterns.

**Tech Stack:** Drizzle ORM, Hono, Zod, Next.js 14 App Router, `@anthropic-ai/sdk`, React, Tailwind, Lucide icons

**Spec:** `docs/superpowers/specs/2026-05-19-venues-and-oauth-settings-design.md` (Branch A section)

**Worktree:** `.worktrees/feat/venues` on branch `feat/venues`

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `packages/db/src/schema/venues.ts` | Modify | Add capacity, venueType, about columns |
| `packages/db/migrations/0024_venue_profile_fields.sql` | Create | Migration SQL |
| `packages/db/migrations/meta/_journal.json` | Modify | Register migration |
| `packages/db/seed.ts` | Modify | Seed capacity/type/about for 5 venues |
| `packages/types/src/index.ts` | Modify | Add new fields to VenuePublic |
| `apps/api/package.json` | Modify | Add @anthropic-ai/sdk dependency |
| `apps/api/src/routes/venues-public.ts` | Modify | Expose new fields in list + detail endpoints |
| `apps/api/src/routes/admin/venues.ts` | Modify | Add generate-about endpoint + schema fields |
| `apps/web/src/components/consumer/venue-profile/StatPill.tsx` | Create | Stat pill UI primitive |
| `apps/web/src/app/(protected)/venues/[slug]/page.tsx` | Modify | Add chip, stats row, about section |
| `apps/web/src/app/(protected)/venues/page.tsx` | Create | Venues index page |
| `apps/web/src/components/consumer/app-header/AppHeader.tsx` | Modify | Add Venues nav tab; replace mobile search with Venues |
| `apps/web/src/components/admin/VenueDetailsClient.tsx` | Modify | Add capacity/type/about fields + Generate button |

---

## Task 1: Schema — add capacity, venueType, about to venues

**Files:**
- Modify: `packages/db/src/schema/venues.ts`
- Create: `packages/db/migrations/0024_venue_profile_fields.sql`
- Modify: `packages/db/migrations/meta/_journal.json`

- [ ] **Step 1: Add columns to the Drizzle schema**

Open `packages/db/src/schema/venues.ts`. After the `ticketVendor` line, add:

```ts
  capacity: integer('capacity'),
  venueType: text('venue_type'),
  about: text('about'),
```

The full updated table (only showing the new lines in context):

```ts
  ticketVendor: ticketVendorEnum('ticket_vendor'),
  capacity: integer('capacity'),
  venueType: text('venue_type'),
  about: text('about'),
  createdAt: timestamp('created_at', { withTimezone: true })
```

- [ ] **Step 2: Create the migration SQL file**

Create `packages/db/migrations/0024_venue_profile_fields.sql`:

```sql
ALTER TABLE "venues" ADD COLUMN IF NOT EXISTS "capacity" integer;--> statement-breakpoint
ALTER TABLE "venues" ADD COLUMN IF NOT EXISTS "venue_type" text;--> statement-breakpoint
ALTER TABLE "venues" ADD COLUMN IF NOT EXISTS "about" text;
```

- [ ] **Step 3: Register the migration in the journal**

Open `packages/db/migrations/meta/_journal.json`. Append to the `entries` array (the last entry has `idx: 23, when: 1778710000004`):

```json
{
  "idx": 24,
  "version": "7",
  "when": 1778710000005,
  "tag": "0024_venue_profile_fields",
  "breakpoints": true
}
```

- [ ] **Step 4: Run the migration locally**

```bash
cd /path/to/worktree
pnpm db:migrate
```

Expected output: `Applying migration 0024_venue_profile_fields` with no errors.

- [ ] **Step 5: Verify schema exports new fields**

```bash
pnpm --filter @concert-crawl/db typecheck
```

Expected: no errors. The `Venue` type should now include `capacity: number | null`, `venueType: string | null`, `about: string | null`.

- [ ] **Step 6: Update seed data**

Open `packages/db/seed.ts`. Update the 5 `SEED_VENUES` entries to add `capacity`, `venueType`, and `about`:

```ts
export const SEED_VENUES: NewVenue[] = [
  {
    name: 'Red Rocks Amphitheatre',
    slug: 'red-rocks-amphitheatre',
    websiteUrl: 'https://www.redrocksonline.com/events/',
    city: 'Denver',
    timezone: 'America/Denver',
    active: true,
    verified: true,
    crawlDelayMs: 3000,
    address: '18300 W Alameda Pkwy, Morrison, CO 80465',
    capacity: 9525,
    venueType: 'Amphitheater',
    about:
      'Sandstone monoliths, open sky, and sound that bounces off 200-million-year-old rock faces. An outdoor amphitheater in Morrison that has been hosting concerts since 1941 — there is nowhere else quite like it.',
  },
  {
    name: 'Ogden Theatre',
    slug: 'ogden-theatre',
    websiteUrl: 'https://www.ogdentheatre.com/calendar/',
    city: 'Denver',
    timezone: 'America/Denver',
    active: true,
    verified: true,
    crawlDelayMs: 3000,
    address: '935 E Colfax Ave, Denver, CO 80218',
    capacity: 1600,
    venueType: 'Theater',
    about:
      'A Capitol Hill institution since 1917, the Ogden packs 1,600 into a beautifully preserved historic theater on Colfax. Close quarters, great sight lines, and a room that makes every show feel like an event.',
  },
  {
    name: 'Mission Ballroom',
    slug: 'mission-ballroom',
    websiteUrl: 'https://missionballroom.com/events/',
    city: 'Denver',
    timezone: 'America/Denver',
    active: true,
    verified: true,
    crawlDelayMs: 3000,
    address: '4242 Wynkoop St, Denver, CO 80211',
    capacity: 3900,
    venueType: 'Concert Hall',
    about:
      "RiNo's premier large-format venue opened in 2019 and became Denver's go-to for mid-sized touring acts almost immediately. Standing room for nearly 4,000, top-tier sound, and a floating floor that actually bounces.",
  },
  {
    name: 'Bluebird Theater',
    slug: 'bluebird-theater',
    websiteUrl: 'https://www.bluebirdtheater.net/calendar/',
    city: 'Denver',
    timezone: 'America/Denver',
    active: true,
    verified: true,
    crawlDelayMs: 3000,
    crawlWaitUntil: 'load' as const,
    address: '3317 E Colfax Ave, Denver, CO 80206',
    capacity: 550,
    venueType: 'Theater',
    about:
      'A converted movie house on Colfax that has been one of Denver\'s best small music venues for decades. Intimate, loud, and always a good time — around 550 capacity means you are never far from the stage.',
  },
  {
    name: 'Gothic Theatre',
    slug: 'gothic-theatre',
    websiteUrl: 'https://www.gothictheatre.com/events/',
    city: 'Denver',
    timezone: 'America/Denver',
    active: true,
    verified: true,
    crawlDelayMs: 3000,
    address: '3263 S Broadway, Englewood, CO 80113',
    capacity: 1100,
    venueType: 'Theater',
    about:
      'South Broadway\'s anchor venue in Englewood, the Gothic has been the right size for the right acts since the early 2000s. Around 1,100 capacity, all-ages friendly, and reliably good bookings across rock and alternative.',
  },
]
```

- [ ] **Step 7: Commit**

```bash
git add packages/db/src/schema/venues.ts \
        packages/db/migrations/0024_venue_profile_fields.sql \
        packages/db/migrations/meta/_journal.json \
        packages/db/seed.ts
git commit -m "feat(db): add capacity, venue_type, about columns to venues"
```

---

## Task 2: Types — extend VenuePublic

**Files:**
- Modify: `packages/types/src/index.ts`

- [ ] **Step 1: Write a failing type test**

Open `packages/types/src/index.test.ts`. Add:

```ts
it('VenuePublic includes profile fields', () => {
  const venue: VenuePublic = {
    id: 'abc',
    name: 'Test',
    slug: 'test',
    city: 'Denver',
    timezone: 'America/Denver',
    websiteUrl: 'https://example.com',
    active: true,
    verified: false,
    address: null,
    capacity: null,
    venueType: null,
    about: null,
  }
  expect(venue.capacity).toBeNull()
  expect(venue.venueType).toBeNull()
  expect(venue.about).toBeNull()
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter @concert-crawl/types test
```

Expected: TypeScript error — `capacity`, `venueType`, `about` do not exist on `VenuePublic`.

- [ ] **Step 3: Update VenuePublic in types**

Open `packages/types/src/index.ts`. Find `VenuePublic` (around line 298) and add the three new fields:

```ts
export interface VenuePublic {
  id: string
  name: string
  slug: string
  city: string
  timezone: string
  websiteUrl: string
  active: boolean
  verified: boolean
  address: string | null
  capacity: number | null
  venueType: string | null
  about: string | null
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm --filter @concert-crawl/types test
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/types/src/index.ts packages/types/src/index.test.ts
git commit -m "feat(types): add capacity, venueType, about to VenuePublic"
```

---

## Task 3: Public API — expose new fields

**Files:**
- Modify: `apps/api/src/routes/venues-public.ts`

- [ ] **Step 1: Write a failing integration test**

Open `apps/api/src/routes/events.integration.test.ts` or create `apps/api/src/routes/venues-public.integration.test.ts`. Add a test:

```ts
it('GET /v1/venues returns capacity, venueType, about', async () => {
  const res = await app.request('/v1/venues')
  const body = await res.json()
  expect(res.status).toBe(200)
  expect(body.success).toBe(true)
  const venue = body.data[0]
  expect(Object.keys(venue)).toContain('capacity')
  expect(Object.keys(venue)).toContain('venueType')
  expect(Object.keys(venue)).toContain('about')
})

it('GET /v1/venues/:slug returns capacity, venueType, about', async () => {
  const res = await app.request('/v1/venues/red-rocks-amphitheatre')
  const body = await res.json()
  expect(res.status).toBe(200)
  const { venue } = body.data
  expect(Object.keys(venue)).toContain('capacity')
  expect(Object.keys(venue)).toContain('venueType')
  expect(Object.keys(venue)).toContain('about')
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm --filter @concert-crawl/api test
```

Expected: FAIL — the fields are not in the response yet.

- [ ] **Step 3: Update the list endpoint projection**

Open `apps/api/src/routes/venues-public.ts`. In the `GET /` handler's `.select({...})`, add the three fields:

```ts
const rows = await db
  .select({
    id: venues.id,
    name: venues.name,
    slug: venues.slug,
    city: venues.city,
    timezone: venues.timezone,
    websiteUrl: venues.websiteUrl,
    active: venues.active,
    verified: venues.verified,
    address: venues.address,
    capacity: venues.capacity,
    venueType: venues.venueType,
    about: venues.about,
  })
  .from(venues)
  .where(eq(venues.active, true))
  .orderBy(asc(venues.name))
```

- [ ] **Step 4: Update the detail endpoint projection**

In the same file, in the `GET /:slug` handler's `.select({...})` for the venue query, add the same three fields:

```ts
const [venue] = await db
  .select({
    id: venues.id,
    name: venues.name,
    slug: venues.slug,
    city: venues.city,
    timezone: venues.timezone,
    websiteUrl: venues.websiteUrl,
    active: venues.active,
    verified: venues.verified,
    address: venues.address,
    capacity: venues.capacity,
    venueType: venues.venueType,
    about: venues.about,
  })
  .from(venues)
  .where(eq(venues.slug, slug))
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
pnpm --filter @concert-crawl/api test
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/routes/venues-public.ts \
        apps/api/src/routes/venues-public.integration.test.ts
git commit -m "feat(api): expose capacity, venueType, about in public venue endpoints"
```

---

## Task 4: Admin API — generate-about endpoint + schema fields

**Files:**
- Modify: `apps/api/package.json`
- Modify: `apps/api/src/routes/admin/venues.ts`

- [ ] **Step 1: Add @anthropic-ai/sdk to the API package**

Open `apps/api/package.json`. Add to `dependencies` (match the version in `packages/crawler-core/package.json`):

```json
"@anthropic-ai/sdk": "^0.97.0"
```

Then run:

```bash
pnpm install
```

- [ ] **Step 2: Write a failing unit test for generate-about**

Create `apps/api/src/routes/admin/venues.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import Anthropic from '@anthropic-ai/sdk'

vi.mock('@anthropic-ai/sdk')

describe('generateVenueProfile', () => {
  it('strips markdown and parses JSON from Haiku response', () => {
    const raw = '```json\n{"capacity":9525,"venueType":"Amphitheater","about":"Great venue."}\n```'
    const cleaned = raw.replace(/^```(?:json)?\s*/m, '').replace(/\s*```\s*$/m, '').trim()
    const parsed = JSON.parse(cleaned)
    expect(parsed.capacity).toBe(9525)
    expect(parsed.venueType).toBe('Amphitheater')
    expect(parsed.about).toBe('Great venue.')
  })

  it('returns null capacity when Haiku returns null', () => {
    const raw = '{"capacity":null,"venueType":"Bar","about":"Small bar."}'
    const parsed = JSON.parse(raw)
    expect(parsed.capacity).toBeNull()
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

```bash
pnpm --filter @concert-crawl/api test
```

Expected: FAIL — `generateVenueProfile` not implemented yet.

- [ ] **Step 4: Add generate-about endpoint to admin venues router**

Open `apps/api/src/routes/admin/venues.ts`. Add the import at the top:

```ts
import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
```

(Zod is already imported; add Anthropic.) Then add the endpoint before the `DELETE` handler:

```ts
const generateResponseSchema = z.object({
  capacity: z.number().int().positive().nullable(),
  venueType: z.string().min(1).max(100),
  about: z.string().min(10).max(500),
})

// POST /v1/admin/venues/:id/generate-about — LLM-generate capacity/type/about
venuesAdminRouter.post('/:id/generate-about', async (ctx) => {
  const { id } = ctx.req.param()

  const [venue] = await db
    .select({ name: venues.name, address: venues.address, venueType: venues.venueType })
    .from(venues)
    .where(eq(venues.id, id))

  if (!venue) {
    return ctx.json({ success: false, error: 'Venue not found' }, 404)
  }

  const anthropic = new Anthropic()

  let rawText: string
  try {
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      messages: [
        {
          role: 'user',
          content: `Generate venue profile data for this Denver music venue.

Venue: ${venue.name}
Address: ${venue.address ?? 'Denver, CO'}
${venue.venueType ? `Known type: ${venue.venueType}` : ''}

Return a JSON object with exactly these fields:
- capacity: integer (approximate capacity), or null if genuinely unknown
- venueType: string (pick the most accurate from: Amphitheater, Outdoor Pavilion, Concert Hall, Auditorium, Theater, Music Hall, Ballroom, Bar — or use your best judgment if none fit)
- about: string (1-3 sentences, punchy and specific, written for a music fan — avoid generic descriptions)

Respond with only valid JSON, no markdown fences.`,
        },
      ],
    })

    const block = message.content[0]
    if (block.type !== 'text') {
      return ctx.json({ success: false, error: 'Unexpected Haiku response type' }, 502)
    }
    rawText = block.text.replace(/^```(?:json)?\s*/m, '').replace(/\s*```\s*$/m, '').trim()
  } catch (err) {
    apiLogger.error({ err }, 'generate-about: Anthropic call failed')
    return ctx.json({ success: false, error: 'LLM service unavailable' }, 503)
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(rawText)
  } catch {
    apiLogger.warn({ rawText }, 'generate-about: invalid JSON from Haiku')
    return ctx.json({ success: false, error: 'LLM returned unparseable response' }, 502)
  }

  const result = generateResponseSchema.safeParse(parsed)
  if (!result.success) {
    apiLogger.warn({ parsed, issues: result.error.issues }, 'generate-about: schema validation failed')
    return ctx.json({ success: false, error: 'LLM response did not match expected shape' }, 502)
  }

  return ctx.json({ success: true, data: result.data })
})
```

- [ ] **Step 5: Extend createVenueSchema and updateVenueSchema**

In the same file, add to `createVenueSchema`:

```ts
  capacity: z.number().int().positive().nullable().optional(),
  venueType: z.string().min(1).max(100).nullable().optional(),
  about: z.string().min(1).max(1000).nullable().optional(),
```

And because `updateVenueSchema` is `createVenueSchema.partial().extend({...})`, the new fields are automatically included as optional.

- [ ] **Step 6: Run tests to verify they pass**

```bash
pnpm --filter @concert-crawl/api test
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/api/package.json \
        apps/api/src/routes/admin/venues.ts \
        apps/api/src/routes/admin/venues.test.ts \
        pnpm-lock.yaml
git commit -m "feat(api): add generate-about endpoint and venue profile fields to admin schema"
```

---

## Task 5: StatPill component + venue profile page redesign

**Files:**
- Create: `apps/web/src/components/consumer/venue-profile/StatPill.tsx`
- Modify: `apps/web/src/app/(protected)/venues/[slug]/page.tsx`

- [ ] **Step 1: Create the StatPill component**

Create `apps/web/src/components/consumer/venue-profile/StatPill.tsx`:

```tsx
interface StatPillProps {
  label: string
  value: string
  signal?: boolean
}

export function StatPill({ label, value, signal = false }: StatPillProps) {
  return (
    <div className="flex flex-1 flex-col gap-0.5">
      <span
        className="text-fg-subtle"
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '8px',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </span>
      <span
        className="font-bold"
        style={{
          fontSize: '12px',
          color: signal ? 'var(--signal)' : 'var(--fg)',
          letterSpacing: '-0.01em',
        }}
      >
        {value}
      </span>
    </div>
  )
}
```

- [ ] **Step 2: Update the venue profile page**

Open `apps/web/src/app/(protected)/venues/[slug]/page.tsx`. Make the following changes:

Add `StatPill` to imports:
```tsx
import { StatPill } from '@/components/consumer/venue-profile/StatPill'
```

After the `{ venue, upcomingEvents } = result` destructure, add a helper:
```tsx
const hasStats = venue.capacity != null || venue.venueType != null
```

Replace the content area (starting from `{/* Venue name */}`) with the updated layout:

```tsx
{/* Content */}
<div className="relative -mt-5 flex-1 pb-10">
  <div className="mx-auto w-full max-w-[880px] px-[18px] sm:px-8">

    {/* Type chip */}
    {venue.venueType && (
      <div className="mb-2 flex flex-wrap gap-[5px]">
        <span
          className="text-fg-muted"
          style={{
            padding: '3px 8px',
            borderRadius: 4,
            background: 'var(--surface-3)',
            fontFamily: 'var(--font-mono)',
            fontSize: '9px',
            letterSpacing: '0.03em',
          }}
        >
          {venue.venueType}
        </span>
      </div>
    )}

    {/* Venue name */}
    <h1
      className="text-fg"
      style={{
        fontFamily: 'var(--font-ui)',
        fontWeight: 900,
        fontSize: 26,
        letterSpacing: '-0.03em',
        lineHeight: 1.1,
        margin: 0,
      }}
    >
      {venue.name}
    </h1>

    {/* City + Directions */}
    <div className="mt-1.5 flex items-center gap-2">
      <span
        className="text-fg-muted"
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '10px',
          letterSpacing: '0.04em',
        }}
      >
        {venue.city}
      </span>
      <span className="opacity-40 text-fg-subtle">·</span>
      <a
        href={googleMapsUrl(venue.address ?? mapSearchQuery)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-signal"
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '10px',
          letterSpacing: '0.03em',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
          <path d="M7 1l5.5 5.5L7 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M12.5 6.5H5a3.5 3.5 0 00-3.5 3.5v1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        Directions
      </a>
    </div>

    {/* Stats row */}
    {hasStats && (
      <div
        className="mt-3.5 flex gap-3 py-3"
        style={{
          borderTop: '1px solid var(--border)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <StatPill
          label="Capacity"
          value={venue.capacity != null ? venue.capacity.toLocaleString() : '—'}
        />
        <StatPill
          label="Upcoming"
          value={`${upcomingEvents.length} show${upcomingEvents.length !== 1 ? 's' : ''}`}
          signal
        />
        <StatPill
          label="Type"
          value={venue.venueType ?? '—'}
        />
      </div>
    )}

    {/* About */}
    {venue.about && (
      <div className="mt-4">
        <div
          className="mb-1.5 text-fg-subtle"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '9px',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}
        >
          About
        </div>
        <p
          className="text-fg-muted"
          style={{
            margin: 0,
            fontSize: '13px',
            lineHeight: 1.55,
          }}
        >
          {venue.about}
        </p>
      </div>
    )}

    {/* Map */}
    <div className="mt-5">
      <MapPlaceholder
        venueAddress={venue.address}
        searchQuery={mapSearchQuery}
      />
    </div>

    {/* Upcoming shows */}
    <div className="mt-5">
      <SectionHeader
        title="Upcoming"
        count={`${upcomingEvents.length} show${upcomingEvents.length !== 1 ? 's' : ''}`}
      />
      {upcomingEvents.length === 0 ? (
        <EmptyState
          state="no-data"
          density="dense"
          eyebrow={copy.venueEmptyEyebrow}
          title={copy.venueEmptyTitle}
          body={copy.venueNoShows}
        />
      ) : (
        <VenueEventList
          events={upcomingEvents}
          {...(highlight ? { highlightId: highlight } : {})}
        />
      )}
    </div>
  </div>
</div>
```

- [ ] **Step 3: Typecheck**

```bash
pnpm --filter @concert-crawl/web typecheck
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/consumer/venue-profile/StatPill.tsx \
        apps/web/src/app/\(protected\)/venues/\[slug\]/page.tsx
git commit -m "feat(web): venue profile redesign — type chip, stats row, about section"
```

---

## Task 6: Venues index page

**Files:**
- Create: `apps/web/src/app/(protected)/venues/page.tsx`

- [ ] **Step 1: Create the venues index page**

Create `apps/web/src/app/(protected)/venues/page.tsx`:

```tsx
import { auth } from '@clerk/nextjs/server'
import type { VenuePublic } from '@concert-crawl/types'
import { publicApiClient, apiClient } from '@/lib/api'
import { AppHeader } from '@/components/consumer/app-header'
import { SectionHeader } from '@/components/consumer/section-header'
import Link from 'next/link'

async function fetchVenues(token: string | null): Promise<VenuePublic[]> {
  try {
    if (token) {
      return await apiClient.get<VenuePublic[]>('/v1/venues', token)
    }
    return await publicApiClient.get<VenuePublic[]>('/v1/venues')
  } catch {
    return []
  }
}

export default async function VenuesPage() {
  const { getToken } = await auth()
  const token = await getToken()
  const venues = await fetchVenues(token)

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <div className="hidden sm:block">
        <AppHeader />
      </div>

      <div className="mx-auto w-full max-w-[880px] px-[18px] pb-24 pt-6 sm:px-8 sm:pt-10">
        <div className="mb-4">
          <SectionHeader title="Venues" count={`${venues.length}`} />
        </div>

        {venues.length === 0 ? (
          <p
            className="text-fg-muted"
            style={{ fontFamily: 'var(--font-mono)', fontSize: '13px' }}
          >
            No venues found.
          </p>
        ) : (
          <div className="flex flex-col">
            {venues.map((venue, idx) => (
              <div key={venue.id}>
                {idx > 0 && <div className="mx-0 h-px bg-border" />}
                <Link
                  href={`/venues/${venue.slug}`}
                  className="flex items-center gap-3 py-3.5 transition-opacity hover:opacity-70"
                >
                  <div className="flex flex-1 flex-col gap-0.5 min-w-0">
                    <span
                      className="font-bold text-fg truncate"
                      style={{ fontSize: '15px', letterSpacing: '-0.01em' }}
                    >
                      {venue.name}
                    </span>
                    <span
                      className="text-fg-subtle"
                      style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.03em' }}
                    >
                      {venue.city}
                    </span>
                  </div>
                  {venue.venueType && (
                    <span
                      className="shrink-0 text-fg-muted"
                      style={{
                        padding: '3px 8px',
                        borderRadius: 4,
                        background: 'var(--surface-3)',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '9px',
                        letterSpacing: '0.03em',
                      }}
                    >
                      {venue.venueType}
                    </span>
                  )}
                  <svg width="6" height="10" viewBox="0 0 6 10" fill="none" aria-hidden className="shrink-0 text-fg-subtle">
                    <path d="M1 1l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm --filter @concert-crawl/web typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add "apps/web/src/app/(protected)/venues/page.tsx"
git commit -m "feat(web): add venues index page"
```

---

## Task 7: Navigation — add Venues tab

**Files:**
- Modify: `apps/web/src/components/consumer/app-header/AppHeader.tsx`

- [ ] **Step 1: Write a failing test**

Open `apps/web/src/components/consumer/app-header/AppHeader.test.tsx` (create if it doesn't exist):

```tsx
import { render, screen } from '@testing-library/react'
import { AppHeader } from './AppHeader'

vi.mock('next/navigation', () => ({ usePathname: () => '/events' }))

it('renders Venues nav tab', () => {
  render(<AppHeader />)
  expect(screen.getAllByRole('link', { name: /venues/i }).length).toBeGreaterThan(0)
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter @concert-crawl/web test
```

Expected: FAIL — no Venues link.

- [ ] **Step 3: Update NAV_TABS and mobile header**

Open `apps/web/src/components/consumer/app-header/AppHeader.tsx`.

Update `NAV_TABS`:

```ts
const NAV_TABS = [
  { label: 'Browse', href: '/events' },
  { label: 'Venues', href: '/venues' },
  { label: 'Watching', href: '/watching' },
] as const
```

Add `MapPin` to the lucide-react import at the top of the file:

```ts
import { Search, MapPin } from 'lucide-react'
```

In the mobile bar section, replace the search `<Link>`:

```tsx
{/* Replace this: */}
<Link
  href="/search"
  aria-label="Search"
  className="flex h-9 w-9 items-center justify-center rounded-full border border-border-strong"
>
  <Search size={16} className="text-fg-muted" strokeWidth={1.5} />
</Link>

{/* With this: */}
<Link
  href="/venues"
  aria-label="Venues"
  className="flex h-9 w-9 items-center justify-center rounded-full border border-border-strong"
>
  <MapPin size={16} className="text-fg-muted" strokeWidth={1.5} />
</Link>
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm --filter @concert-crawl/web test
```

Expected: PASS.

- [ ] **Step 5: Typecheck**

```bash
pnpm --filter @concert-crawl/web typecheck
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/consumer/app-header/AppHeader.tsx \
        apps/web/src/components/consumer/app-header/AppHeader.test.tsx
git commit -m "feat(web): add Venues to nav — desktop tab and mobile icon"
```

---

## Task 8: Admin venue form — capacity, type, about + Generate button

**Files:**
- Modify: `apps/web/src/components/admin/VenueDetailsClient.tsx`

- [ ] **Step 1: Locate the form fields in VenueDetailsClient**

Search `VenueDetailsClient.tsx` for the `address` field input — the new fields belong immediately after it. Look for the pattern `name="address"` or the address label.

- [ ] **Step 2: Add the three new fields and Generate button**

In `VenueDetailsClient.tsx`, after the address field, add a `useState` hook for generate loading/error state at the top of the component (alongside other state declarations):

```tsx
const [generateLoading, setGenerateLoading] = useState(false)
const [generateError, setGenerateError] = useState<string | null>(null)
```

Add a `generateProfile` handler (alongside other handlers in the component):

```tsx
async function generateProfile() {
  setGenerateLoading(true)
  setGenerateError(null)
  try {
    const res = await fetch(`/api/admin/venues/${venue.id}/generate-about`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${await getToken()}` },
    })
    const body = await res.json()
    if (!body.success) throw new Error(body.error ?? 'Generation failed')
    if (body.data.capacity != null) setCapacity(String(body.data.capacity))
    setVenueType(body.data.venueType)
    setAbout(body.data.about)
  } catch (err) {
    setGenerateError(err instanceof Error ? err.message : 'Generation failed')
  } finally {
    setGenerateLoading(false)
  }
}
```

Note: `getToken` is available via `useAuth()` from Clerk — add it to the existing Clerk imports if not present. Check for `useAuth` import and add it:

```tsx
import { useAuth } from '@clerk/nextjs'
// then inside component:
const { getToken } = useAuth()
```

Add local state for the three new fields (alongside existing field state):

```tsx
const [capacity, setCapacity] = useState(String(venue.capacity ?? ''))
const [venueType, setVenueType] = useState(venue.venueType ?? '')
const [about, setAbout] = useState(venue.about ?? '')
```

Include the new fields in the existing `updateVenue` call payload (find where the form submit calls `updateVenue` and add):

```tsx
capacity: capacity !== '' ? Number(capacity) : null,
venueType: venueType !== '' ? venueType : null,
about: about !== '' ? about : null,
```

Add the form fields in the JSX (after the address field):

```tsx
{/* Capacity */}
<div className="flex flex-col gap-1">
  <MonoLabel>Capacity</MonoLabel>
  <input
    type="number"
    value={capacity}
    onChange={(evt) => setCapacity(evt.target.value)}
    placeholder="e.g. 9525"
    className="w-full rounded-lg border border-border bg-surface-1 px-3 py-2 text-[13px] text-fg placeholder:text-fg-subtle focus:border-border-focus focus:outline-none"
  />
</div>

{/* Venue Type */}
<div className="flex flex-col gap-1">
  <MonoLabel>Venue Type</MonoLabel>
  <input
    list="venue-type-suggestions"
    value={venueType}
    onChange={(evt) => setVenueType(evt.target.value)}
    placeholder="e.g. Theater"
    className="w-full rounded-lg border border-border bg-surface-1 px-3 py-2 text-[13px] text-fg placeholder:text-fg-subtle focus:border-border-focus focus:outline-none"
  />
  <datalist id="venue-type-suggestions">
    <option value="Amphitheater" />
    <option value="Outdoor Pavilion" />
    <option value="Concert Hall" />
    <option value="Auditorium" />
    <option value="Theater" />
    <option value="Music Hall" />
    <option value="Ballroom" />
    <option value="Bar" />
  </datalist>
</div>

{/* About */}
<div className="flex flex-col gap-1">
  <div className="flex items-center justify-between">
    <MonoLabel>About</MonoLabel>
    <button
      type="button"
      onClick={generateProfile}
      disabled={generateLoading}
      className="inline-flex cursor-pointer items-center gap-1 text-[11px] font-bold uppercase tracking-[0.06em] text-fg-subtle transition-colors hover:text-signal disabled:cursor-not-allowed disabled:opacity-50"
      style={{ fontFamily: 'var(--font-mono)' }}
    >
      {generateLoading ? 'Generating…' : 'Generate ↗'}
    </button>
  </div>
  <textarea
    value={about}
    onChange={(evt) => setAbout(evt.target.value)}
    rows={4}
    placeholder="1–3 sentences describing this venue for music fans…"
    className="w-full resize-none rounded-lg border border-border bg-surface-1 px-3 py-2 text-[13px] text-fg placeholder:text-fg-subtle focus:border-border-focus focus:outline-none"
  />
  {generateError && (
    <p className="text-[11px] text-danger" style={{ fontFamily: 'var(--font-mono)' }}>
      {generateError}
    </p>
  )}
</div>
```

- [ ] **Step 3: Typecheck**

```bash
pnpm --filter @concert-crawl/web typecheck
```

Expected: no errors. Fix any type issues before proceeding.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/admin/VenueDetailsClient.tsx
git commit -m "feat(admin): add capacity, venue type, about fields with LLM generate button"
```

---

## Task 9: Run full checks and verify

- [ ] **Step 1: Run all checks in the worktree**

```bash
pnpm typecheck && pnpm lint && pnpm test
```

Expected: all pass with no errors.

- [ ] **Step 2: Start the dev server and smoke-test manually**

```bash
pnpm dev
```

Check:
- `/venues` — index page loads, shows venue list with type chips
- `/venues/red-rocks-amphitheatre` — type chip, stats row (capacity/upcoming/type), about section, map still in place
- Desktop nav — Browse / Venues / Watching tabs present, active state correct
- Mobile header — MapPin icon replaces search icon, links to `/venues`
- Admin `/admin/venues/:id` — capacity/type/about fields present, Generate button fires, populates all three fields

- [ ] **Step 3: Update progress doc**

Open `docs/superpowers/progress.md` and add a row for this PR.

- [ ] **Step 4: Push and open PR**

```bash
git push -u origin feat/venues
gh pr create --title "feat(venues): nav + profile redesign + admin generate (#401, #404)" \
  --body "$(cat .github/pull_request_template.md)"
```

Fill in the PR template referencing `Closes #401` and `Closes #404`.
