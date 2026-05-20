# Venues Index Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the bare-bones venues list into a rich index with identity art tiles, Sort/Capacity/Distance filter chips, a flagship card for Red Rocks, and per-venue stats (capacity, upcoming count, distance via geolocation).

**Architecture:** DB migration adds `neighborhood`, `featured`, `lat`, `lng` columns. Public API gains upcoming-count subquery and new fields. A set of focused client components (`VenueFilterBar`, `VenueRow`, `VenueFeatureCard`, `VenueIdentityTile`, `VenuesIndexClient`) replace the bare list. The existing `FilterPopover` and `FilterSheet` from `filter-bar/` are reused directly. Geolocation runs in the client component with a LoDo centroid fallback.

**Tech Stack:** Next.js 14 App Router, Drizzle ORM, Hono, `@concert-crawl/types`, `IdentityArt` component, existing `FilterPopover`/`FilterSheet`

**Out of scope:** Mobile bottom nav tab changes (Me tab, AppBar search icon behaviour) — handled by a separate agent.

---

## Venue coordinates seed data (reference for Task 1)

```
Bluebird Theater           39.7313  -104.9719
Cervantes' Masterpiece     39.7606  -104.9818
Fiddler's Green            39.5934  -104.8915
Gothic Theatre             39.6491  -104.9885
Hi-Dive                    39.7025  -104.9885
Larimer Lounge             39.7561  -104.9810
Levitt Pavilion            39.6888  -105.0197
Marquis Theater            39.7502  -104.9967
Mission Ballroom           39.7639  -104.9728
Ogden Theatre              39.7319  -104.9800
Red Rocks Amphitheatre     39.6654  -105.2057
Summit Music Hall          39.7531  -104.9971
The Fillmore Auditorium    39.7333  -104.9789
LoDo centroid (fallback)   39.7508  -104.9997
```

---

## Task 1: DB migration — add neighborhood, featured, lat, lng

**Files:**
- Create: `packages/db/migrations/0025_venue_index_fields.sql`
- Modify: `packages/db/migrations/meta/_journal.json`
- Modify: `packages/db/src/schema/venues.ts`

- [ ] **Step 1: Write the migration SQL**

Create `packages/db/migrations/0025_venue_index_fields.sql`:

```sql
ALTER TABLE "venues" ADD COLUMN IF NOT EXISTS "neighborhood" text;--> statement-breakpoint
ALTER TABLE "venues" ADD COLUMN IF NOT EXISTS "featured" boolean NOT NULL DEFAULT false;--> statement-breakpoint
ALTER TABLE "venues" ADD COLUMN IF NOT EXISTS "lat" double precision;--> statement-breakpoint
ALTER TABLE "venues" ADD COLUMN IF NOT EXISTS "lng" double precision;--> statement-breakpoint

-- Seed coordinates and neighborhood for all known Denver venues
UPDATE "venues" SET lat = 39.7313, lng = -104.9719, neighborhood = 'Colfax'            WHERE slug = 'bluebird-theater';
UPDATE "venues" SET lat = 39.7606, lng = -104.9818, neighborhood = 'Five Points'        WHERE slug = 'cervantes-masterpiece-ballroom';
UPDATE "venues" SET lat = 39.5934, lng = -104.8915, neighborhood = 'Greenwood Village'  WHERE slug = 'fiddlers-green-amphitheatre';
UPDATE "venues" SET lat = 39.6491, lng = -104.9885, neighborhood = 'Englewood'          WHERE slug = 'gothic-theatre';
UPDATE "venues" SET lat = 39.7025, lng = -104.9885, neighborhood = 'South Broadway'     WHERE slug = 'hi-dive';
UPDATE "venues" SET lat = 39.7561, lng = -104.9810, neighborhood = 'RiNo'               WHERE slug = 'larimer-lounge';
UPDATE "venues" SET lat = 39.6888, lng = -105.0197, neighborhood = 'Ruby Hill'          WHERE slug = 'levitt-pavilion';
UPDATE "venues" SET lat = 39.7502, lng = -104.9967, neighborhood = 'LoDo'              WHERE slug = 'marquis-theater';
UPDATE "venues" SET lat = 39.7639, lng = -104.9728, neighborhood = 'RiNo'               WHERE slug = 'mission-ballroom';
UPDATE "venues" SET lat = 39.7319, lng = -104.9800, neighborhood = 'Capitol Hill'       WHERE slug = 'ogden-theatre';
UPDATE "venues" SET lat = 39.6654, lng = -105.2057, neighborhood = 'Morrison',
                    featured = true                                                       WHERE slug = 'red-rocks-amphitheatre';
UPDATE "venues" SET lat = 39.7531, lng = -104.9971, neighborhood = 'Ballpark'           WHERE slug = 'summit-music-hall';
UPDATE "venues" SET lat = 39.7333, lng = -104.9789, neighborhood = 'Capitol Hill'       WHERE slug = 'the-fillmore-auditorium';
```

- [ ] **Step 2: Register migration in journal**

Open `packages/db/migrations/meta/_journal.json`. The last entry has `"when": 1778710000005`. Append to the `entries` array:

```json
{
  "idx": 25,
  "version": "7",
  "when": 1779000000001,
  "tag": "0025_venue_index_fields",
  "breakpoints": true
}
```

- [ ] **Step 3: Update Drizzle schema**

In `packages/db/src/schema/venues.ts`, add four columns after `about`:

```ts
// after: about: text('about'),
neighborhood: text('neighborhood'),
featured: boolean('featured').notNull().default(false),
lat: doublePrecision('lat'),
lng: doublePrecision('lng'),
```

Add `doublePrecision` to the drizzle-orm import at the top:

```ts
import {
  boolean,
  doublePrecision,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'
```

- [ ] **Step 4: Run migration locally**

```bash
cd /path/to/worktree
pnpm db:migrate
```

Expected: migration 0025 applies without error.

- [ ] **Step 5: Verify columns exist**

```bash
docker exec -it concert-crawl-db psql -U postgres -d concert_crawl_db \
  -c "SELECT slug, neighborhood, featured, lat, lng FROM venues ORDER BY name LIMIT 5;"
```

Expected: rows show neighborhood strings and lat/lng values; Red Rocks row has `featured = true`.

- [ ] **Step 6: Commit**

```bash
git add packages/db/migrations/0025_venue_index_fields.sql \
        packages/db/migrations/meta/_journal.json \
        packages/db/src/schema/venues.ts
git commit -m "feat(db): add neighborhood, featured, lat/lng to venues; seed Denver coords"
```

---

## Task 2: Update shared types + public venues API

**Files:**
- Modify: `packages/types/src/index.ts`
- Modify: `apps/api/src/routes/venues-public.ts`

- [ ] **Step 1: Extend VenuePublic type**

In `packages/types/src/index.ts`, update `VenuePublic`:

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
  neighborhood: string | null
  featured: boolean
  lat: number | null
  lng: number | null
  upcomingCount: number
}
```

- [ ] **Step 2: Update the public GET /v1/venues handler**

Replace the `venuesPublicRouter.get('/')` handler in `apps/api/src/routes/venues-public.ts`:

```ts
import { Hono } from 'hono'
import { clerkMiddleware } from '@hono/clerk-auth'
import { db, events, venues } from '@concert-crawl/db'
import { type SQL, and, asc, count, eq, gte, isNotNull } from 'drizzle-orm'
import { todayInTimezone } from '../lib/time.js'
import { requireAuth } from '../middleware/auth.js'

export const venuesPublicRouter = new Hono()

if (process.env.REQUIRE_BETA_AUTH === 'true') {
  venuesPublicRouter.use('*', clerkMiddleware(), requireAuth)
}

// GET /v1/venues — list active venues with upcoming event counts (public)
venuesPublicRouter.get('/', async (ctx) => {
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
      neighborhood: venues.neighborhood,
      featured: venues.featured,
      lat: venues.lat,
      lng: venues.lng,
    })
    .from(venues)
    .where(eq(venues.active, true))
    .orderBy(asc(venues.name))

  const today = new Date().toISOString().slice(0, 10)
  const eventCounts = await db
    .select({ venueId: events.venueId, total: count(events.id) })
    .from(events)
    .where(
      and(
        eq(events.status, 'upcoming'),
        gte(events.date, today),
        isNotNull(events.venueId),
      ),
    )
    .groupBy(events.venueId)

  const countByVenueId = new Map(
    eventCounts.map((row) => [row.venueId, row.total]),
  )

  const data = rows.map((venue) => ({
    ...venue,
    upcomingCount: countByVenueId.get(venue.id) ?? 0,
  }))

  return ctx.json({ success: true, data })
})
```

The `/:slug` handler lower in the file does not need to change — it already returns a single venue for the detail page.

- [ ] **Step 3: Type-check the API**

```bash
pnpm --filter @concert-crawl/api typecheck
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add packages/types/src/index.ts apps/api/src/routes/venues-public.ts
git commit -m "feat(api): add neighborhood, featured, lat/lng, upcomingCount to public venues endpoint"
```

---

## Task 3: Expand generate-about — add neighborhood + fix brand voice (#476)

**Files:**
- Modify: `apps/api/src/routes/admin/venues.ts` (generate-about handler, lines ~382–470)

- [ ] **Step 1: Update the generate-about handler**

Replace the entire `// POST /v1/admin/venues/:id/generate-about` handler (from the comment to the closing `})`):

```ts
// POST /v1/admin/venues/:id/generate-about — LLM-generate capacity, venueType, neighborhood, and about copy
// Does NOT persist to DB; returns suggestions for admin review before saving
venuesAdminRouter.post('/:id/generate-about', async (ctx) => {
  const { id } = ctx.req.param()

  const [venue] = await db
    .select({
      name: venues.name,
      address: venues.address,
      venueType: venues.venueType,
    })
    .from(venues)
    .where(eq(venues.id, id))

  if (!venue) {
    return ctx.json({ success: false, error: 'Venue not found' }, 404)
  }

  const generateResponseSchema = z.object({
    capacity: z.number().int().positive().nullable(),
    venueType: z.string().min(1).max(100),
    neighborhood: z.string().min(1).max(100),
    about: z.string().min(10).max(280),
  })

  const prompt = `You are writing copy for Concert Crawl — a Denver live music calendar for people who actually go to shows, not tourists reading a brochure. Voice: direct, local, slightly irreverent. Short sentences. No fluff.

Venue: ${venue.name}
Address: ${venue.address ?? 'unknown'}
Current type: ${venue.venueType ?? 'unknown'}

Generate a JSON object with:
- "capacity": approximate standing/seated capacity as an integer (null if genuinely unknown)
- "venueType": one of "Amphitheater", "Theater", "Concert Hall", "Music Hall", "Ballroom", "Bar", "Auditorium", "Outdoor Pavilion", "Club"
- "neighborhood": the Denver neighborhood or suburb this venue is in (e.g. "Capitol Hill", "RiNo", "Morrison", "LoDo")
- "about": 1–2 punchy sentences. What makes this room distinctive for a show-goer? Be specific. Avoid: "known for", "vibrant atmosphere", "cornerstone of Denver's music scene". Max 280 characters.

Respond with only valid JSON, no markdown, no extra text.`

  try {
    const anthropic = new Anthropic()
    const message = await anthropic.messages.create(
      {
        model: 'claude-haiku-4-5',
        max_tokens: 256,
        messages: [{ role: 'user', content: prompt }],
      },
      { signal: AbortSignal.timeout(30_000) },
    )

    const textBlock = message.content.find((block) => block.type === 'text')
    if (!textBlock || textBlock.type !== 'text') {
      return ctx.json(
        { success: false, error: 'No text response from model' },
        503,
      )
    }

    const rawText = textBlock.text
      .replace(/^```(?:json)?\s*\n?/i, '')
      .replace(/\n?```\s*$/i, '')
      .trim()

    let parsed: unknown
    try {
      parsed = JSON.parse(rawText)
    } catch {
      return ctx.json(
        { success: false, error: 'Model returned invalid JSON' },
        503,
      )
    }

    const result = generateResponseSchema.safeParse(parsed)
    if (!result.success) {
      return ctx.json(
        { success: false, error: 'Model response did not match expected shape' },
        503,
      )
    }

    return ctx.json({ success: true, data: result.data })
  } catch (err) {
    apiLogger.error({ err }, 'generate-about: Anthropic call failed')
    return ctx.json(
      { success: false, error: 'Failed to generate venue description' },
      503,
    )
  }
})
```

- [ ] **Step 2: Type-check**

```bash
pnpm --filter @concert-crawl/api typecheck
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/routes/admin/venues.ts
git commit -m "feat(api): expand generate-about to include neighborhood; tighten brand voice (#476)"
```

---

## Task 4: Admin API PATCH — support neighborhood + featured

**Files:**
- Modify: `apps/api/src/routes/admin/venues.ts` (PATCH /:id handler)

- [ ] **Step 1: Find the PATCH handler**

Search for `venuesAdminRouter.patch('/:id'` in `apps/api/src/routes/admin/venues.ts`. It currently accepts a body and calls `db.update(venues)`.

- [ ] **Step 2: Add neighborhood and featured to the Zod schema and update query**

In the PATCH handler's Zod body schema, add:

```ts
neighborhood: z.string().max(100).nullable().optional(),
featured: z.boolean().optional(),
```

In the `db.update` call's `.set()` object, add:

```ts
...(body.neighborhood !== undefined && { neighborhood: body.neighborhood }),
...(body.featured !== undefined && { featured: body.featured }),
```

When `featured: true` is being set, unset any other featured venue first. Add this block **before** the main `db.update` call:

```ts
if (body.featured === true) {
  await db
    .update(venues)
    .set({ featured: false })
    .where(and(eq(venues.featured, true), not(eq(venues.id, id))))
}
```

Add `not` to the drizzle-orm imports at the top of the file.

- [ ] **Step 3: Type-check**

```bash
pnpm --filter @concert-crawl/api typecheck
```

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/routes/admin/venues.ts
git commit -m "feat(api): add neighborhood and featured to venue PATCH endpoint"
```

---

## Task 5: Admin form — neighborhood field + featured toggle

**Files:**
- Modify: `apps/web/src/lib/actions/venues.ts`
- Modify: `apps/web/src/components/admin/VenueDetailsClient.tsx`

### Part A: Server action

- [ ] **Step 1: Update GenerateAboutResult type**

In `apps/web/src/lib/actions/venues.ts`, update `GenerateAboutResult`:

```ts
export interface GenerateAboutResult {
  success: boolean
  data?: { capacity: number | null; venueType: string; neighborhood: string; about: string }
  error?: string
}
```

- [ ] **Step 2: Update generateVenueAbout return type**

Update the `apiClient.post` call's generic in `generateVenueAbout`:

```ts
const data = await apiClient.post<{
  capacity: number | null
  venueType: string
  neighborhood: string
  about: string
}>(`/v1/admin/venues/${id}/generate-about`, token, {})
```

- [ ] **Step 3: Add neighborhood + featured to updateVenue**

In the `updateVenue` function, add neighborhood and featured parsing alongside the existing fields:

```ts
const neighborhoodRaw = formData.get('neighborhood')
const neighborhood =
  neighborhoodRaw !== null && String(neighborhoodRaw).trim()
    ? String(neighborhoodRaw).trim()
    : null

const featuredRaw = formData.get('featured')
const featured = featuredRaw === 'true' ? true : featuredRaw === 'false' ? false : undefined
```

Add `neighborhood` and `featured` to the `apiClient.patch` call body.

### Part B: VenueDetailsClient

- [ ] **Step 4: Add neighborhoodVal state**

Near the other `useState` declarations (around line 480–535), add:

```ts
const [neighborhoodVal, setNeighborhoodVal] = useState(venue.neighborhood ?? '')
const [featuredVal, setFeaturedVal] = useState(venue.featured ?? false)
```

- [ ] **Step 5: Wire neighborhood into handleGenerateAbout**

In `handleGenerateAbout`, destructure `neighborhood` from `result.data` and set it:

```ts
const { capacity, venueType, neighborhood, about } = result.data
setCapacityVal(capacity != null ? String(capacity) : '')
setVenueTypeVal(venueType)
setNeighborhoodVal(neighborhood)
setAboutVal(about)
```

- [ ] **Step 6: Add neighborhood and featured to the hasChanges check**

Find where the component computes whether there are unsaved changes. Add:

```ts
|| neighborhoodVal !== (venue.neighborhood ?? '')
|| featuredVal !== (venue.featured ?? false)
```

- [ ] **Step 7: Add neighborhood to handleDiscard**

In `handleDiscard`, add:

```ts
setNeighborhoodVal(venue.neighborhood ?? '')
setFeaturedVal(venue.featured ?? false)
```

- [ ] **Step 8: Add neighborhood and featured to the form's hidden inputs / FormData**

Find where other fields like `about` are submitted (look for `formData.append` or a `<form>` with `action`). Add the two fields in the same pattern:

```tsx
<input type="hidden" name="neighborhood" value={neighborhoodVal} />
<input type="hidden" name="featured" value={String(featuredVal)} />
```

- [ ] **Step 9: Add neighborhood text input to the Details section**

In the Details section of the form (near the `about` textarea), add a neighborhood row following the same label + input pattern used for `address`:

```tsx
{/* Neighborhood */}
<div className="flex flex-col gap-1.5">
  <label className="text-[11px] uppercase tracking-widest text-fg-subtle"
         style={{ fontFamily: 'var(--font-mono)' }}>
    Neighborhood
  </label>
  <input
    type="text"
    name="neighborhood"
    value={neighborhoodVal}
    onChange={(evt) => setNeighborhoodVal(evt.target.value)}
    disabled={isDisabled}
    placeholder="e.g. Capitol Hill"
    className="rounded-lg border border-border bg-surface-1 px-3 py-2 text-[13px] text-fg placeholder:text-fg-subtle focus:outline-none focus:ring-1 focus:ring-signal disabled:opacity-50"
  />
</div>
```

Remove the `<input type="hidden" name="neighborhood" />` from Step 8 — the text input's `name="neighborhood"` submits it directly via FormData.

- [ ] **Step 10: Add featured toggle to the Details section**

Below neighborhood, add a "Flagship venue" toggle:

```tsx
{/* Flagship toggle */}
<div className="flex items-center justify-between rounded-lg border border-border bg-surface-1 px-3 py-2.5">
  <div>
    <div className="text-[13px] font-medium text-fg">Flagship venue</div>
    <div className="text-[11px] text-fg-muted">
      Shown as a featured card at the top of the Venues index. Only one venue can be flagship.
    </div>
  </div>
  <button
    type="button"
    role="switch"
    aria-checked={featuredVal}
    disabled={isDisabled}
    onClick={() => setFeaturedVal((prev) => !prev)}
    className={cn(
      'relative h-5 w-9 shrink-0 rounded-full border transition-colors focus:outline-none focus:ring-2 focus:ring-signal focus:ring-offset-1',
      featuredVal ? 'border-signal bg-signal' : 'border-border-strong bg-surface-2',
    )}
  >
    <span className={cn(
      'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform',
      featuredVal ? 'translate-x-4' : 'translate-x-0',
    )} />
  </button>
</div>
<input type="hidden" name="featured" value={String(featuredVal)} />
```

- [ ] **Step 11: Type-check web app**

```bash
pnpm --filter @concert-crawl/web typecheck
```

- [ ] **Step 12: Commit**

```bash
git add apps/web/src/lib/actions/venues.ts \
        apps/web/src/components/admin/VenueDetailsClient.tsx
git commit -m "feat(admin): add neighborhood field and flagship toggle to venue edit form"
```

---

## Task 6: Venue filter definitions

**Files:**
- Create: `apps/web/src/components/consumer/venues-index/venue-filter-defs.ts`

- [ ] **Step 1: Create the file**

```ts
import type { VenuePublic } from '@concert-crawl/types'

export type VenueFilterKey = 'sort' | 'capacity' | 'distance'

export interface VenueFilterOption {
  value: string
  label: string
}

export interface VenueFilterDef {
  label: string
  placeholder: string
  alwaysOn?: boolean
  options: VenueFilterOption[]
}

export const VENUE_FILTER_DEFS: Record<VenueFilterKey, VenueFilterDef> = {
  sort: {
    label: 'Sort',
    placeholder: 'Most upcoming shows',
    alwaysOn: true,
    options: [
      { value: 'upcoming', label: 'Most upcoming shows' },
      { value: 'distance', label: 'Nearest first' },
      { value: 'cap-desc', label: 'Largest capacity' },
      { value: 'cap-asc', label: 'Smallest capacity' },
      { value: 'alpha', label: 'Alphabetical' },
    ],
  },
  capacity: {
    label: 'Capacity',
    placeholder: 'Any capacity',
    options: [
      { value: 'intimate', label: 'Intimate (< 500)' },
      { value: 'club', label: 'Club (500 – 1,500)' },
      { value: 'mid', label: 'Mid-size (1,500 – 4,000)' },
      { value: 'large', label: 'Large (4,000 – 10,000)' },
      { value: 'arena', label: 'Arena (10,000+)' },
    ],
  },
  distance: {
    label: 'Distance',
    placeholder: 'Any distance',
    options: [
      { value: 'walking', label: 'Walking (< 1 mi)' },
      { value: 'near', label: 'Nearby (< 5 mi)' },
      { value: 'metro', label: 'Metro (< 15 mi)' },
      { value: 'far', label: 'Day trip (15+ mi)' },
    ],
  },
}

export const VENUE_FILTER_ORDER: VenueFilterKey[] = ['sort', 'capacity', 'distance']

export interface VenueFilterState {
  sort: string
  capacity: string | null
  distance: string | null
}

export const VENUE_FILTER_DEFAULT: VenueFilterState = {
  sort: 'upcoming',
  capacity: null,
  distance: null,
}

// Haversine distance in miles between two lat/lng points
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 3958.8 // Earth radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const sinDLat = Math.sin(dLat / 2)
  const sinDLng = Math.sin(dLng / 2)
  const aa =
    sinDLat * sinDLat +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      sinDLng *
      sinDLng
  return R * 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa))
}

// LoDo centroid fallback (used when geolocation is denied)
export const LODO_LAT = 39.7508
export const LODO_LNG = -104.9997

export function fmtDistance(miles: number): string {
  return miles < 10 ? `${miles.toFixed(1)} mi` : `${Math.round(miles)} mi`
}

export function fmtNum(n: number): string {
  return n.toLocaleString('en-US')
}

export function venueChipLabel(key: VenueFilterKey, value: string | null): string {
  const def = VENUE_FILTER_DEFS[key]
  if (!value) return def.placeholder
  return def.options.find((opt) => opt.value === value)?.label ?? def.placeholder
}

export type VenueWithDistance = VenuePublic & { distanceMi: number }

export function applyVenueFilters(
  venues: VenueWithDistance[],
  state: VenueFilterState,
): VenueWithDistance[] {
  let out = venues

  if (state.capacity) {
    out = out.filter((venue) => {
      const cap = venue.capacity ?? 0
      switch (state.capacity) {
        case 'intimate': return cap < 500
        case 'club':     return cap >= 500 && cap < 1500
        case 'mid':      return cap >= 1500 && cap < 4000
        case 'large':    return cap >= 4000 && cap < 10000
        case 'arena':    return cap >= 10000
        default:         return true
      }
    })
  }

  if (state.distance) {
    out = out.filter((venue) => {
      switch (state.distance) {
        case 'walking': return venue.distanceMi < 1
        case 'near':    return venue.distanceMi < 5
        case 'metro':   return venue.distanceMi < 15
        case 'far':     return venue.distanceMi >= 15
        default:        return true
      }
    })
  }

  return [...out].sort((aa, bb) => {
    switch (state.sort) {
      case 'distance': return aa.distanceMi - bb.distanceMi
      case 'cap-desc': return (bb.capacity ?? 0) - (aa.capacity ?? 0)
      case 'cap-asc':  return (aa.capacity ?? 0) - (bb.capacity ?? 0)
      case 'alpha':    return aa.name.localeCompare(bb.name)
      default:         return bb.upcomingCount - aa.upcomingCount
    }
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/consumer/venues-index/venue-filter-defs.ts
git commit -m "feat(venues): venue filter definitions, haversine helper, apply/sort logic"
```

---

## Task 7: VenueIdentityTile component

**Files:**
- Create: `apps/web/src/components/consumer/venues-index/VenueIdentityTile.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { IdentityArt, ia_getInitials, ia_isDark, identityFor } from '../identity-art/IdentityArt'

interface VenueIdentityTileProps {
  name: string
  size?: number
}

export function VenueIdentityTile({ name, size = 72 }: VenueIdentityTileProps) {
  const identity = identityFor(name, 'venue')
  const dark = ia_isDark(identity.palette.bg)
  const initials = ia_getInitials(name, 2)

  return (
    <div
      style={{
        position: 'relative',
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: 10,
        overflow: 'hidden',
        border: '1px solid var(--border)',
      }}
    >
      <IdentityArt
        name={name}
        kind="venue"
        scale="tile"
        showInitials={false}
        grain={0.08}
        width={size}
        height={size}
      />
      {/* Monogram chip — bottom-left, same convention as the detail page hero */}
      <div
        style={{
          position: 'absolute',
          left: 6,
          bottom: 6,
          padding: '2px 6px',
          borderRadius: 5,
          background: dark ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.78)',
          backdropFilter: 'blur(4px)',
          fontFamily: 'var(--font-sans)',
          fontWeight: 900,
          fontSize: size <= 56 ? 9 : 10,
          letterSpacing: '0.04em',
          color: dark ? '#F1E6D5' : '#191418',
          lineHeight: 1,
        }}
      >
        {initials}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/consumer/venues-index/VenueIdentityTile.tsx
git commit -m "feat(venues): VenueIdentityTile — identity art tile with monogram chip"
```

---

## Task 8: VenueRow component

**Files:**
- Create: `apps/web/src/components/consumer/venues-index/VenueRow.tsx`

- [ ] **Step 1: Create the component**

```tsx
'use client'

import Link from 'next/link'
import { VenueIdentityTile } from './VenueIdentityTile'
import { fmtNum, fmtDistance, type VenueWithDistance } from './venue-filter-defs'

interface VenueRowProps {
  venue: VenueWithDistance
  last?: boolean
}

function IconChevron() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M5 3l5 5-5 5" stroke="currentColor" strokeWidth="1.75"
            strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconPin({ size = 11 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none" aria-hidden>
      <path d="M6 1.5c2 0 3.5 1.5 3.5 3.5 0 2.6-3.5 6-3.5 6S2.5 7.6 2.5 5c0-2 1.5-3.5 3.5-3.5z"
            stroke="currentColor" strokeWidth="1.2" fill="none" />
      <circle cx="6" cy="5" r="1.2" fill="currentColor" />
    </svg>
  )
}

export function VenueRow({ venue, last = false }: VenueRowProps) {
  return (
    <Link
      href={`/venues/${venue.slug}`}
      className="group block w-full"
      style={{ borderBottom: last ? 'none' : '1px solid var(--border)' }}
    >
      {/* Desktop layout */}
      <div className="hidden sm:grid items-center px-2 py-4 group-hover:bg-overlay-hover transition-colors"
           style={{ gridTemplateColumns: '88px 1fr 120px 120px 24px', gap: 20 }}>
        <VenueIdentityTile name={venue.name} size={72} />

        <div className="min-w-0">
          <div className="truncate text-[22px] font-bold tracking-tight text-fg leading-[1.15]">
            {venue.name}
          </div>
          <div className="mt-2 flex items-center gap-2.5"
               style={{ fontFamily: 'var(--font-mono)', fontSize: 11,
                         color: 'var(--fg-muted)', letterSpacing: '0.06em',
                         textTransform: 'uppercase' }}>
            <span className="flex items-center gap-1.5 font-semibold text-fg">
              <IconPin />
              {fmtDistance(venue.distanceMi)}
            </span>
            <span style={{ color: 'var(--fg-subtle)' }}>·</span>
            <span>{venue.neighborhood ?? venue.city}</span>
          </div>
        </div>

        {/* Capacity stat */}
        <div className="flex flex-col items-end gap-1.5">
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 500,
                          letterSpacing: '0.12em', textTransform: 'uppercase',
                          color: 'var(--fg-subtle)', whiteSpace: 'nowrap' }}>
            Capacity
          </span>
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: 22, fontWeight: 700,
                          letterSpacing: '-0.02em', color: 'var(--fg)',
                          lineHeight: 1, whiteSpace: 'nowrap' }}>
            {venue.capacity ? fmtNum(venue.capacity) : '—'}
          </span>
        </div>

        {/* Upcoming stat */}
        <div className="flex flex-col items-end gap-1.5">
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 500,
                          letterSpacing: '0.12em', textTransform: 'uppercase',
                          color: 'var(--fg-subtle)', whiteSpace: 'nowrap' }}>
            Upcoming
          </span>
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: 22, fontWeight: 700,
                          letterSpacing: '-0.02em', color: 'var(--signal)',
                          lineHeight: 1, whiteSpace: 'nowrap' }}>
            {venue.upcomingCount}
          </span>
        </div>

        {/* Chevron */}
        <div className="flex justify-end text-fg-subtle group-hover:text-fg transition-colors"
             style={{ transform: 'translateX(0)' }}>
          <IconChevron />
        </div>
      </div>

      {/* Mobile layout */}
      <div className="flex sm:hidden items-center gap-3.5 px-4 py-3 group-hover:bg-overlay-hover transition-colors">
        <VenueIdentityTile name={venue.name} size={56} />
        <div className="flex-1 min-w-0">
          <div className="truncate text-[16px] font-bold tracking-tight text-fg leading-[1.2]">
            {venue.name}
          </div>
          <div className="mt-1.5 flex items-center gap-1.5"
               style={{ fontFamily: 'var(--font-mono)', fontSize: 10,
                         letterSpacing: '0.04em', color: 'var(--fg-muted)' }}>
            <span className="flex items-center gap-1 font-semibold text-fg">
              <IconPin size={9} />
              {fmtDistance(venue.distanceMi)}
            </span>
            <span style={{ color: 'var(--fg-subtle)' }}>·</span>
            <span className="truncate min-w-0">
              {venue.capacity ? fmtNum(venue.capacity) : '—'} cap
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex flex-col items-end gap-0.5">
            <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 16,
                            color: 'var(--signal)', letterSpacing: '-0.02em', lineHeight: 1 }}>
              {venue.upcomingCount}
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9,
                            letterSpacing: '0.12em', textTransform: 'uppercase',
                            color: 'var(--fg-subtle)' }}>
              shows
            </span>
          </div>
          <span className="text-fg-subtle"><IconChevron /></span>
        </div>
      </div>
    </Link>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/consumer/venues-index/VenueRow.tsx
git commit -m "feat(venues): VenueRow — enriched desktop + mobile list row"
```

---

## Task 9: VenueFeatureCard component

**Files:**
- Create: `apps/web/src/components/consumer/venues-index/VenueFeatureCard.tsx`

- [ ] **Step 1: Create the component**

```tsx
'use client'

import Link from 'next/link'
import { IdentityArt, ia_getInitials, ia_isDark, identityFor } from '../identity-art/IdentityArt'
import { fmtNum, fmtDistance, type VenueWithDistance } from './venue-filter-defs'

interface VenueFeatureCardProps {
  venue: VenueWithDistance
}

export function VenueFeatureCard({ venue }: VenueFeatureCardProps) {
  const identity = identityFor(venue.name, 'venue')
  const dark = ia_isDark(identity.palette.bg)
  const initials = ia_getInitials(venue.name, 2)

  return (
    <Link href={`/venues/${venue.slug}`} className="group block w-full">
      {/* Desktop — horizontal card */}
      <div className="hidden sm:grid rounded-[14px] overflow-hidden border border-border group-hover:border-border-strong bg-surface-1 group-hover:bg-surface-2 transition-all"
           style={{ gridTemplateColumns: '360px 1fr' }}>
        {/* Left — identity art panel */}
        <div className="relative" style={{ height: 240, background: identity.palette.bg }}>
          <IdentityArt
            name={venue.name}
            kind="venue"
            scale="hero"
            showInitials={false}
            grain={0.10}
            style={{ width: '100%', height: '100%' }}
            templateOverride="stripes"
          />
          {/* Flagship eyebrow */}
          <div style={{
            position: 'absolute', left: 14, top: 14,
            padding: '4px 10px', borderRadius: 999,
            background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)',
            fontFamily: 'var(--font-mono)',
            fontSize: 10, fontWeight: 600, letterSpacing: '0.16em',
            textTransform: 'uppercase', color: '#F1E6D5',
          }}>★ Flagship</div>
          {/* Monogram chip */}
          <div style={{
            position: 'absolute', left: 14, bottom: 14,
            padding: '8px 12px', borderRadius: 8,
            background: dark ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.78)',
            backdropFilter: 'blur(6px)',
            fontFamily: 'var(--font-sans)', fontWeight: 900,
            fontSize: 24, letterSpacing: '0.02em',
            color: dark ? '#F1E6D5' : '#191418', lineHeight: 1,
          }}>{initials}</div>
        </div>

        {/* Right — meta column */}
        <div className="relative flex flex-col justify-between p-7">
          {/* Chevron — top-right */}
          <div className="absolute top-5 right-5 w-9 h-9 rounded-full flex items-center justify-center border transition-all"
               style={{
                 background: 'var(--surface-2)',
                 borderColor: 'var(--border-strong)',
               }}
               aria-hidden>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M5 3l5 5-5 5" stroke="currentColor" strokeWidth="1.75"
                    strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          <div style={{ paddingRight: 52 }}>
            {/* Type chip */}
            {venue.venueType && (
              <span style={{
                display: 'inline-block', padding: '4px 10px', borderRadius: 6,
                background: 'var(--surface-2)', border: '1px solid var(--border-strong)',
                fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 500,
                letterSpacing: '0.04em', color: 'var(--fg-muted)',
              }}>{venue.venueType}</span>
            )}
            <div className="mt-2.5 text-[34px] font-extrabold tracking-tight text-fg leading-[1.05]">
              {venue.name}
            </div>
            <div className="mt-2 flex items-center gap-2.5"
                 style={{ fontFamily: 'var(--font-mono)', fontSize: 12,
                           color: 'var(--fg-muted)', letterSpacing: '0.04em' }}>
              <span>{venue.neighborhood ?? venue.city}</span>
              <span style={{ color: 'var(--fg-subtle)' }}>·</span>
              <span className="flex items-center gap-1" style={{ color: 'var(--signal)' }}>
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6h7M6 3l3 3-3 3" stroke="currentColor" strokeWidth="1.5"
                        strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Directions
              </span>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-5 pt-4 flex gap-10 items-end"
               style={{ borderTop: '1px solid var(--border)' }}>
            {[
              { label: 'Capacity', value: venue.capacity ? fmtNum(venue.capacity) : '—', signal: false },
              { label: 'Upcoming', value: String(venue.upcomingCount), signal: true },
              { label: 'Distance', value: fmtDistance(venue.distanceMi), signal: false },
            ].map(({ label, value, signal }) => (
              <div key={label} className="flex flex-col gap-1.5">
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 500,
                                letterSpacing: '0.12em', textTransform: 'uppercase',
                                color: 'var(--fg-subtle)', whiteSpace: 'nowrap' }}>
                  {label}
                </span>
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: 22, fontWeight: 700,
                                letterSpacing: '-0.02em', lineHeight: 1, whiteSpace: 'nowrap',
                                color: signal ? 'var(--signal)' : 'var(--fg)' }}>
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile — vertical card */}
      <div className="sm:hidden mx-4 rounded-[14px] overflow-hidden border border-border bg-surface-1">
        <div className="relative" style={{ height: 180, background: identity.palette.bg }}>
          <IdentityArt
            name={venue.name} kind="venue" scale="hero" showInitials={false}
            grain={0.10} style={{ width: '100%', height: '100%' }}
            templateOverride="stripes"
          />
          <div style={{
            position: 'absolute', left: 12, top: 12,
            padding: '3px 9px', borderRadius: 999,
            background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)',
            fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 600,
            letterSpacing: '0.16em', textTransform: 'uppercase', color: '#F1E6D5',
          }}>★ Flagship</div>
          <div style={{
            position: 'absolute', left: 12, bottom: 12,
            padding: '6px 10px', borderRadius: 7,
            background: dark ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.78)',
            backdropFilter: 'blur(6px)',
            fontFamily: 'var(--font-sans)', fontWeight: 900,
            fontSize: 18, letterSpacing: '0.02em',
            color: dark ? '#F1E6D5' : '#191418', lineHeight: 1,
          }}>{initials}</div>
        </div>
        <div className="p-4 pb-4.5">
          {venue.venueType && (
            <span style={{
              display: 'inline-block', padding: '3px 9px', borderRadius: 5,
              background: 'var(--surface-2)', border: '1px solid var(--border-strong)',
              fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 500,
              letterSpacing: '0.04em', color: 'var(--fg-muted)',
            }}>{venue.venueType}</span>
          )}
          <div className="mt-2 text-2xl font-extrabold tracking-tight text-fg leading-[1.1]">
            {venue.name}
          </div>
          <div className="mt-1.5 flex items-center gap-2 flex-wrap"
               style={{ fontFamily: 'var(--font-mono)', fontSize: 11,
                         color: 'var(--fg-muted)', letterSpacing: '0.04em' }}>
            <span>{venue.neighborhood ?? venue.city}</span>
            <span style={{ color: 'var(--fg-subtle)' }}>·</span>
            <span className="flex items-center gap-1" style={{ color: 'var(--signal)' }}>
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                <path d="M2 6h7M6 3l3 3-3 3" stroke="currentColor" strokeWidth="1.5"
                      strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Directions
            </span>
          </div>
          <div className="mt-4 pt-3.5 flex gap-6"
               style={{ borderTop: '1px solid var(--border)' }}>
            {[
              { label: 'Capacity', value: venue.capacity ? fmtNum(venue.capacity) : '—', signal: false },
              { label: 'Upcoming', value: String(venue.upcomingCount), signal: true },
              { label: 'Distance', value: fmtDistance(venue.distanceMi), signal: false },
            ].map(({ label, value, signal }) => (
              <div key={label} className="flex flex-col gap-1">
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 500,
                                letterSpacing: '0.12em', textTransform: 'uppercase',
                                color: 'var(--fg-subtle)', whiteSpace: 'nowrap' }}>
                  {label}
                </span>
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: 18, fontWeight: 700,
                                letterSpacing: '-0.02em', lineHeight: 1, whiteSpace: 'nowrap',
                                color: signal ? 'var(--signal)' : 'var(--fg)' }}>
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Link>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/consumer/venues-index/VenueFeatureCard.tsx
git commit -m "feat(venues): VenueFeatureCard — flagship horizontal/vertical hero card"
```

---

## Task 10: VenueFilterBar component

**Files:**
- Create: `apps/web/src/components/consumer/venues-index/VenueFilterBar.tsx`

This reuses the existing `FilterPopover` and `FilterSheet` from `filter-bar/`.

- [ ] **Step 1: Create the component**

```tsx
'use client'

import { useRef, useState } from 'react'
import { FilterPopover } from '../filter-bar/FilterPopover'
import { FilterSheet } from '../filter-bar/FilterSheet'
import {
  VENUE_FILTER_DEFS,
  VENUE_FILTER_ORDER,
  venueChipLabel,
  type VenueFilterKey,
  type VenueFilterState,
} from './venue-filter-defs'
import { cn } from '@/lib/utils'

interface VenueFilterBarProps {
  state: VenueFilterState
  onChange: (next: VenueFilterState) => void
}

function IconChevDown() {
  return (
    <svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden style={{ flexShrink: 0 }}>
      <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5"
            strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function VenueFilterBar({ state, onChange }: VenueFilterBarProps) {
  const [openKey, setOpenKey] = useState<VenueFilterKey | null>(null)
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null)
  const chipRefs = useRef<Partial<Record<VenueFilterKey, HTMLButtonElement | null>>>({})

  const clearable = VENUE_FILTER_ORDER.filter((key) => !VENUE_FILTER_DEFS[key].alwaysOn)
  const anyActive = clearable.some((key) => state[key])

  function openFilter(key: VenueFilterKey) {
    const rect = chipRefs.current[key]?.getBoundingClientRect() ?? null
    setAnchorRect(rect)
    setOpenKey(key)
  }

  function handleSelect(value: string) {
    if (!openKey) return
    const def = VENUE_FILTER_DEFS[openKey]
    const current = state[openKey]
    const next = !def.alwaysOn && current === value ? null : value
    onChange({ ...state, [openKey]: next })
    setOpenKey(null)
  }

  function clearFilters() {
    onChange({ ...state, capacity: null, distance: null })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {VENUE_FILTER_ORDER.map((key) => {
        const def = VENUE_FILTER_DEFS[key]
        const value = state[key]
        const active = def.alwaysOn
          ? (!!value && value !== def.options[0]?.value)
          : !!value
        const label = venueChipLabel(key, value)

        return (
          <button
            key={key}
            ref={(el) => { chipRefs.current[key] = el }}
            type="button"
            onClick={() => openFilter(key)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-[7px] text-[12.5px] font-semibold transition-colors',
              active
                ? 'border border-signal bg-signal text-fg-on-accent'
                : 'border border-border bg-surface-1 text-fg hover:bg-surface-2',
            )}
          >
            {def.alwaysOn && (
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: 10,
                letterSpacing: '0.12em', textTransform: 'uppercase',
                opacity: active ? 0.7 : 1,
                color: active ? 'var(--fg-on-accent)' : 'var(--fg-subtle)',
              }}>Sort</span>
            )}
            <span className="whitespace-nowrap">{label}</span>
            <IconChevDown />
          </button>
        )
      })}

      {anyActive && (
        <button
          type="button"
          onClick={clearFilters}
          className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-dashed border-border-strong px-3 py-[7px] text-[12.5px] font-semibold text-fg-muted transition-colors hover:text-fg"
        >
          × Clear filters
        </button>
      )}

      {/* Desktop popover */}
      {openKey && (
        <FilterPopover
          open={!!openKey}
          title={VENUE_FILTER_DEFS[openKey]?.label ?? ''}
          placeholder={VENUE_FILTER_DEFS[openKey]?.placeholder ?? ''}
          options={VENUE_FILTER_DEFS[openKey]?.options ?? []}
          value={state[openKey] ?? ''}
          anchorRect={anchorRect}
          onSelect={handleSelect}
          onClose={() => setOpenKey(null)}
        />
      )}

      {/* Mobile bottom sheet */}
      {openKey && (
        <FilterSheet
          open={!!openKey}
          title={VENUE_FILTER_DEFS[openKey]?.label ?? ''}
          placeholder={VENUE_FILTER_DEFS[openKey]?.placeholder ?? ''}
          options={VENUE_FILTER_DEFS[openKey]?.options ?? []}
          value={state[openKey] ?? ''}
          onSelect={handleSelect}
          onClose={() => setOpenKey(null)}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/consumer/venues-index/VenueFilterBar.tsx
git commit -m "feat(venues): VenueFilterBar — Sort/Capacity/Distance chips with popover + sheet"
```

---

## Task 11: VenuesIndexClient component

**Files:**
- Create: `apps/web/src/components/consumer/venues-index/VenuesIndexClient.tsx`

- [ ] **Step 1: Create the component**

```tsx
'use client'

import { useEffect, useState } from 'react'
import type { VenuePublic } from '@concert-crawl/types'
import { EmptyState } from '../empty-state'
import { VenueFeatureCard } from './VenueFeatureCard'
import { VenueFilterBar } from './VenueFilterBar'
import { VenueRow } from './VenueRow'
import {
  LODO_LAT,
  LODO_LNG,
  VENUE_FILTER_DEFAULT,
  applyVenueFilters,
  haversineDistance,
  type VenueFilterState,
  type VenueWithDistance,
} from './venue-filter-defs'

interface VenuesIndexClientProps {
  venues: VenuePublic[]
}

export function VenuesIndexClient({ venues }: VenuesIndexClientProps) {
  const [filterState, setFilterState] = useState<VenueFilterState>(VENUE_FILTER_DEFAULT)
  const [userLat, setUserLat] = useState<number>(LODO_LAT)
  const [userLng, setUserLng] = useState<number>(LODO_LNG)

  // Request geolocation once on mount; fall back silently to LoDo centroid
  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLat(pos.coords.latitude)
        setUserLng(pos.coords.longitude)
      },
      () => { /* permission denied or unavailable — keep LoDo centroid */ },
      { timeout: 5000, maximumAge: 5 * 60 * 1000 },
    )
  }, [])

  const venuesWithDistance: VenueWithDistance[] = venues.map((venue) => ({
    ...venue,
    distanceMi:
      venue.lat != null && venue.lng != null
        ? haversineDistance(userLat, userLng, venue.lat, venue.lng)
        : haversineDistance(userLat, userLng, LODO_LAT, LODO_LNG),
  }))

  const filtersActive = !!filterState.capacity || !!filterState.distance
  const filtered = applyVenueFilters(venuesWithDistance, filterState)
  const featured = filtersActive ? null : filtered.find((venue) => venue.featured) ?? null
  const listVenues = featured ? filtered.filter((venue) => venue !== featured) : filtered

  return (
    <>
      {/* Filter bar */}
      <div className="mb-7">
        <VenueFilterBar state={filterState} onChange={setFilterState} />
      </div>

      {/* Flagship card */}
      {featured && (
        <div className="mb-8">
          <VenueFeatureCard venue={featured} />
        </div>
      )}

      {/* Column headers — desktop only */}
      {listVenues.length > 0 && (
        <div className="hidden sm:grid px-2 py-5 border-b border-border"
             style={{
               gridTemplateColumns: '88px 1fr 120px 120px 24px',
               gap: 20,
               fontFamily: 'var(--font-mono)',
               fontSize: 10, fontWeight: 500, letterSpacing: '0.12em',
               textTransform: 'uppercase', color: 'var(--fg-subtle)',
             }}>
          <div />
          <div>Venue</div>
          <div style={{ textAlign: 'right' }}>Capacity</div>
          <div style={{ textAlign: 'right' }}>Upcoming</div>
          <div />
        </div>
      )}

      {/* Venue list */}
      {listVenues.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-border bg-surface-1 sm:rounded-none sm:border-0 sm:bg-transparent">
          {listVenues.map((venue, idx) => (
            <VenueRow
              key={venue.id}
              venue={venue}
              last={idx === listVenues.length - 1}
            />
          ))}
        </div>
      ) : !featured ? (
        <div className="py-20 text-center">
          <div className="text-[18px] font-bold tracking-tight text-fg">
            No venues match.
          </div>
          <div className="mt-1.5 text-[14px] text-fg-muted">
            Loosen a filter or two and they'll come back.
          </div>
          <button
            type="button"
            onClick={() => setFilterState((prev) => ({ ...prev, capacity: null, distance: null }))}
            className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-border-strong px-3.5 py-2 text-[12.5px] font-semibold text-fg-muted hover:text-fg transition-colors"
          >
            × Clear filters
          </button>
        </div>
      ) : null}
    </>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/consumer/venues-index/VenuesIndexClient.tsx
git commit -m "feat(venues): VenuesIndexClient — geolocation, filter state, featured/list logic"
```

---

## Task 12: Create barrel export + update venues page

**Files:**
- Create: `apps/web/src/components/consumer/venues-index/index.ts`
- Modify: `apps/web/src/app/(protected)/venues/page.tsx`

- [ ] **Step 1: Create barrel export**

```ts
export { VenueFeatureCard } from './VenueFeatureCard'
export { VenueFilterBar } from './VenueFilterBar'
export { VenueIdentityTile } from './VenueIdentityTile'
export { VenueRow } from './VenueRow'
export { VenuesIndexClient } from './VenuesIndexClient'
```

- [ ] **Step 2: Replace the venues page**

Replace the entire contents of `apps/web/src/app/(protected)/venues/page.tsx`:

```tsx
import { auth } from '@clerk/nextjs/server'
import type { VenuePublic } from '@concert-crawl/types'
import { publicApiClient, apiClient } from '@/lib/api'
import { AppHeader } from '@/components/consumer/app-header'
import { SectionHeader } from '@/components/consumer/section-header'
import { EmptyState } from '@/components/consumer/empty-state'
import { VenuesIndexClient } from '@/components/consumer/venues-index'

export const metadata = { title: 'Venues — Concert Crawl' }

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

      <div className="mx-auto w-full max-w-[1120px] px-[18px] pb-24 pt-6 sm:px-8">
        <div className="mb-4 sm:mb-[18px]">
          <SectionHeader
            title="Venues"
            count={`${venues.length} in Denver`}
          />
        </div>

        {venues.length === 0 ? (
          <EmptyState
            state="no-data"
            density="dense"
            eyebrow="No venues"
            title="Nothing here yet"
            body="Venues will appear here once they're added."
          />
        ) : (
          <VenuesIndexClient venues={venues} />
        )}
      </div>
    </div>
  )
}
```

Note the `max-w` changes from `880px` to `1120px` to match the design's wider layout for the flagship card.

- [ ] **Step 3: Type-check web app**

```bash
pnpm --filter @concert-crawl/web typecheck
```

- [ ] **Step 4: Lint**

```bash
pnpm --filter @concert-crawl/web lint
```

- [ ] **Step 5: Run tests**

```bash
pnpm --filter @concert-crawl/web test
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/consumer/venues-index/index.ts \
        apps/web/src/app/(protected)/venues/page.tsx
git commit -m "feat(venues): wire VenuesIndexClient into venues page; widen max-w to 1120px"
```

---

## Self-Review Checklist

Design requirements and whether they're covered:

| Requirement | Task |
|---|---|
| Identity art tile 72×72 desktop / 56×56 mobile | Task 7 |
| Monogram chip on tile | Task 7 |
| Sort / Capacity / Distance filter chips | Tasks 6 + 10 |
| Desktop popover under chip | Task 10 (reuses FilterPopover) |
| Mobile bottom sheet | Task 10 (reuses FilterSheet) |
| `× Clear filters` dashed button | Tasks 10 + 11 |
| Flagship card with stripes template | Task 9 |
| Flagship hides when filters active | Task 11 |
| Column header row (desktop) | Task 11 |
| Stats triad: Capacity / Upcoming / Distance | Tasks 8 + 9 |
| Upcoming count from DB | Task 2 |
| Neighborhood on row meta | Task 8 |
| Distance via geolocation + LoDo fallback | Tasks 6 + 11 |
| Empty state with clear-filters CTA | Task 11 |
| Row click → venue detail | Task 8 (Link href) |
| neighborhood in DB + generate-about | Tasks 1 + 3 |
| featured column + admin toggle | Tasks 1 + 4 + 5 |
| Brand voice fix (#476) | Task 3 |
| Mobile nav unchanged | Out of scope ✓ |
