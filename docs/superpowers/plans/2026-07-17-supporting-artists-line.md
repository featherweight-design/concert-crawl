# Supporting Artists Line (#643) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give supporting artists and the tour name their own structured fields on `Event` and render them as a legible billing line (openers) + kicker (tour) across every event surface, replacing today's run-on `title` string.

**Architecture:** Data-first. At extraction time the crawler produces a `supportingArtists` string array (empty `[]` when there are no openers — never `null`) and a `tourName` that is a string when known and `null` when unknown. `supportingArtists` populates on **both** extraction paths (the LLM tool schema and the JSON-LD path); `tourName` populates on the **LLM path only** — JSON-LD carries no tour-name field, and the LLM only runs when JSON-LD yields zero events, so JSON-LD venues leave `tourName` as `null`. The upsert persists `supportingArtists ?? []`, so freshly crawled rows always hold an array and a `null` `supportingArtists` is reserved exclusively as the legacy/pre-recrawl marker. The columns are stored as `supportingArtists: string[] | null` and `tourName: string | null` — for `supportingArtists`, `null` means "legacy row"; for `tourName`, `null` means "no tour name known" (either a JSON-LD venue or an LLM row with no tour). Both flow through the Hono API serializers, and the web app renders them via one shared `EventTitleBlock` component. Legacy rows keep their raw `title` until re-crawl; the UI falls back to the old `title !== artist` line only when `supportingArtists` is `null` (the pre-recrawl marker) — a freshly extracted `[]` means "known no openers" and shows the headliner alone. When `tourName` is `null` the UI simply omits the tour kicker; broader JSON-LD tour-name enrichment is tracked as follow-up #992.

**Tech Stack:** TypeScript (strict), Drizzle ORM + Postgres, Hono, Zod, Anthropic Claude Haiku extraction, Next.js 14 App Router, Tailwind + CSS-variable theme tokens, Vitest, Playwright.

**Shipped as TWO PRs:**

- **PR 1 — Data layer** (Tasks 1–6): types → DB → crawler extraction → upsert → API. Produces working software: the fields extract, persist, and serve. No UI consumes them yet; existing UI is unchanged.
- **PR 2 — UI** (Tasks 7–12): `EventTitleBlock` component + integration into the three surfaces, copy, a11y, release note. Consumes PR 1's fields.

PR 2 depends on PR 1 being merged (the `Event` type must carry the new fields). Each PR is independently reviewable and shippable.

## Global Constraints

- **TypeScript strict mode** — all packages. No unsafe type-assertion `as` casts (e.g. `x as SomeType`) in runtime/production code; use Zod `safeParse`, type guards, or declaration merging (project rule #6). `as const` assertions are fine and used across the repo (e.g. JSON tool schemas). One scoped exception: annotating a locally-issued `await res.json()` response shape with `as { ... }` inside an integration test — this is the pervasive, established convention in `apps/api/src/routes/events.integration.test.ts` (all ~41 existing tests do it), and a new appended test MUST mirror its siblings rather than introduce a lone `safeParse`. (Some other suites, e.g. `billing-founder-window.integration.test.ts`, do use `safeParse`; follow the convention of the file you are editing.)
- **Zod validation at every API boundary** — no raw input reaches the DB.
- **Drizzle only** — no hand-built raw SQL strings in runtime code; the parameterized `sql` template tag is fine.
- **Expand/contract migrations** — additive columns only; nullable / defaulted, never destructive in one deploy.
- **Migration `when` must exceed all prior journal entries** — `db:generate` handles this; verify the new entry sorts last.
- **Token-only colors** across all 9 themes (`electric, jade, light, pulse, forge, bluenote, drip, cedar, gloss`) — every color is a `var(--*)` token or a Tailwind token class (`text-fg-muted`, `text-fg-subtle`, `border-border-strong`, `text-danger`, `text-warning`, `text-signal`). No raw hex.
- **All customer-facing strings live in `apps/web/src/components/consumer/definitions/copy.ts`** — artist names + tour names are DATA (pass through untouched); scaffolding ("with", "+N more") is COPY.
- **Component conventions** — arrow-function components, no `handle*` names, non-trivial logic in `lib/`, semantic HTML, a11y (keyboard/ARIA/touch) in the same PR, no native `title=` tooltips.
- **Mobile + desktop parity** — one component, behavioral parity across viewports; 320px baseline.
- **id-length ≥ 2** (except `i, j, k, x, y, z, _`).
- **Descriptive commit prefixes:** `feat:`, `fix:`, `test:`, `docs:`, `refactor:`, `chore:`.
- **Fallback posture:** legacy (pre-recrawl) rows have `supportingArtists === null` — for those the UI renders the old run-on line (`title` when `title !== artist`). Freshly extracted rows always persist `[]` or a populated array (never null), so `[]` means "known no openers" and must NOT trigger the legacy fallback. Gate the fallback on `supportingArtists === null` (strict), not on array length. `null` is the _sole_ legacy marker; because `EventTitleBlock` takes `supportingArtists` as a **required** prop (`string[] | null`, non-optional — see Task 9), `undefined` cannot reach the check, so an accidentally-missing field is a compile-time/type error rather than a silent legacy fallback. PR 2 Task must preserve this.

---

## PR 1 — Data Layer

### Task 1: Add `supportingArtists` + `tourName` to the shared `Event` type

**Files:**

- Modify: `packages/types/src/index.ts:345-368` (the `Event` interface)
- Modify: existing typed `Event`/`EventWithVenue` fixtures across the repo (see Step 2) so they satisfy the two new non-optional fields — required to keep CI's cross-package typecheck green.

**Interfaces:**

- Produces: `Event.supportingArtists: string[] | null` and `Event.tourName: string | null`. `EventWithVenue` and `EventDetailResponse` extend `Event` and inherit both fields automatically (no change needed there).

- [ ] **Step 1: Add the two fields to the `Event` interface**

In `packages/types/src/index.ts`, inside `export interface Event { ... }`, add the two fields immediately after `artist: string`:

```typescript
export interface Event {
  id: string
  venueId: string
  title: string
  artist: string
  supportingArtists: string[] | null
  tourName: string | null
  date: string
  // ...rest unchanged
}
```

Both fields are **non-optional** (matching the existing `genre: string[] | null` convention). That means every existing object literal typed as `Event`/`EventWithVenue` must now supply them, or `tsc` fails.

- [ ] **Step 2: Update existing typed event fixtures so the repo still typechecks**

CI runs `turbo typecheck` across every package on each PR, so this type change breaks any file that constructs an `Event`/`EventWithVenue` literal — even though PR 1 doesn't otherwise touch the web/admin apps. Find them and add the two fields (default both to `null` — these fixtures predate the feature):

Run: `git grep -l "artist:" -- 'apps/web/src/**/*.test.tsx' 'apps/web/src/**/*.test.ts'`

For each fixture object typed as `Event`/`EventWithVenue`/`EventDetailResponse` (the ones that already set `genre:` are the tell — they're full event literals), add immediately after the `artist:` line:

```typescript
  supportingArtists: null,
  tourName: null,
```

Known sites include `apps/web/src/components/consumer/event-card/EventCard.test.tsx` and `apps/web/src/components/consumer/venue-event-list/VenueEventList.test.tsx`; the grep is authoritative — update every literal it surfaces. If a shared fixture factory/helper exists (e.g. a `makeEvent(...)` builder), prefer adding the defaults there once rather than at each call site.

- [ ] **Step 3: Typecheck the whole repo**

Run: `pnpm typecheck`
Expected: PASS. If any file still errors with "missing the following properties … supportingArtists, tourName", it's another event literal — add the two `null` fields there too.

- [ ] **Step 4: Commit**

```bash
git add packages/types/src/index.ts apps/web/src
git commit -m "feat(types): add supportingArtists + tourName to Event (#643)"
```

---

### Task 2: DB schema columns + migration

**Files:**

- Modify: `packages/db/src/schema/events.ts:46-164` (the `events` pgTable)
- Create: `packages/db/migrations/0050_supporting_artists_tour_name.sql` (generated)
- Modify: `packages/db/migrations/meta/_journal.json` (generated)

**Interfaces:**

- Consumes: nothing.
- Produces: `events.supportingArtists` (`text[]`, nullable) and `events.tourName` (`text`, nullable) as Drizzle columns `supportingArtists` / `tourName`. `typeof events.$inferSelect` gains both.

- [ ] **Step 1: Add the columns to the Drizzle schema**

In `packages/db/src/schema/events.ts`, add both columns immediately after the `artist` column (line ~52). Follow the existing array pattern (`genre: text('genre').array()`) and nullable-text pattern:

```typescript
    artist: text('artist').notNull(),
    supportingArtists: text('supporting_artists').array(),
    tourName: text('tour_name'),
```

- [ ] **Step 2: Generate the migration**

Run: `pnpm --filter @concert-crawl/db db:generate`
Expected: creates `packages/db/migrations/0050_<random-name>.sql`. Rename the file to `0050_supporting_artists_tour_name.sql` **and** update the matching `tag` in `packages/db/migrations/meta/_journal.json` to `0050_supporting_artists_tour_name` so file and journal agree.

- [ ] **Step 3: Verify the generated SQL is additive-only**

Read `packages/db/migrations/0050_supporting_artists_tour_name.sql`. It MUST contain only additive `ALTER TABLE` statements and nothing destructive:

```sql
ALTER TABLE "events" ADD COLUMN "supporting_artists" text[];
ALTER TABLE "events" ADD COLUMN "tour_name" text;
```

If `db:generate` emitted anything else (drops, renames), stop and investigate — do not hand-edit around it.

- [ ] **Step 4: Verify the journal entry sorts last**

Read the last entry of `packages/db/migrations/meta/_journal.json`. Confirm `idx` is `50` and its `when` is greater than the previous entry's `when` (the `0049` entry). `when` is a JSON number (epoch milliseconds), so if it isn't already the largest, replace it with a literal current-epoch-ms value — get one by running `node -p "Date.now()"` and pasting the printed integer (e.g. `1784300000000`), not the string `Date.now()`.

- [ ] **Step 5: Apply the migration to the local DB**

Run: `DATABASE_URL=postgresql://postgres:postgres@localhost:5433/concert_crawl_db pnpm --filter @concert-crawl/db db:migrate`
Expected: migration `0050` applies cleanly; no errors. (Requires `docker compose up -d`.)

- [ ] **Step 6: Typecheck**

Run: `pnpm --filter @concert-crawl/db typecheck`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/db/src/schema/events.ts packages/db/migrations/0050_supporting_artists_tour_name.sql packages/db/migrations/meta/_journal.json
git commit -m "feat(db): supporting_artists + tour_name columns on events (#643)"
```

---

### Task 3: Extend the crawler `NormalizedEvent` shape (type + Zod)

**Files:**

- Modify: `packages/crawler-core/src/types.ts:1-25` (`NormalizedEvent` interface)
- Modify: `packages/crawler-core/src/lib/extractors/llm.ts:16-31` (`NormalizedEventSchema`)
- Test: `packages/crawler-core/src/lib/extractors/llm.test.ts` (append — this file already exists; it hoists a `vi.mock('@anthropic-ai/sdk', …)` and pulls the module via `const { extractWithLlm } = await import('./llm.js')` after the mock. Do NOT recreate it — add a new `describe` block and reuse that same post-mock dynamic import.)

**Interfaces:**

- Consumes: nothing.
- Produces: `NormalizedEvent.supportingArtists?: string[]` and `NormalizedEvent.tourName?: string | null`; `NormalizedEventSchema` parses both (optional, defaulting to `[]` / `null` at read sites).

- [ ] **Step 1: Add fields to the `NormalizedEvent` interface**

In `packages/crawler-core/src/types.ts`, add after `artist: string`:

```typescript
export interface NormalizedEvent {
  title: string
  rawTitle: string
  artist: string
  supportingArtists?: string[]
  tourName?: string | null
  date: string
  // ...rest unchanged
}
```

- [ ] **Step 2: Write a failing test for the Zod schema accepting the new fields**

First export the schema (it's currently module-private): in `llm.ts` change `const NormalizedEventSchema` to `export const NormalizedEventSchema`.

Then **append** to the existing `packages/crawler-core/src/lib/extractors/llm.test.ts` a new `describe` block. The file already registers the hoisted SDK mock, so pull the schema through the same post-mock dynamic import the file uses (note the explicit `.js` extension — this package requires it):

```typescript
// appended to llm.test.ts — the vi.mock('@anthropic-ai/sdk', …) at the top of
// the file is hoisted, so this dynamic import is safe here too.
const { NormalizedEventSchema } = await import('./llm.js')

describe('NormalizedEventSchema', () => {
  it('parses supportingArtists and tourName when present', () => {
    const parsed = NormalizedEventSchema.parse({
      title: 'Wednesday',
      rawTitle: 'Wednesday',
      artist: 'Wednesday',
      supportingArtists: ['Hotline TNT', 'MJ Lenderman'],
      tourName: 'Rat Saw God Tour',
      date: '2026-08-01',
      confidence: 0.9,
    })
    expect(parsed.supportingArtists).toEqual(['Hotline TNT', 'MJ Lenderman'])
    expect(parsed.tourName).toBe('Rat Saw God Tour')
  })

  it('defaults missing supportingArtists/tourName to undefined', () => {
    const parsed = NormalizedEventSchema.parse({
      title: 'Solo Act',
      rawTitle: 'Solo Act',
      artist: 'Solo Act',
      date: '2026-08-01',
      confidence: 0.9,
    })
    expect(parsed.supportingArtists).toBeUndefined()
    expect(parsed.tourName).toBeUndefined()
  })
})
```

(The `export` was added at the top of this step — the dynamic import above relies on it.)

- [ ] **Step 3: Run the test to verify it fails**

Run: `pnpm --filter @concert-crawl/crawler-core test -- llm.test`
Expected: FAIL — schema strips unknown keys, so `supportingArtists`/`tourName` come back `undefined` in the first test.

- [ ] **Step 4: Add the fields to `NormalizedEventSchema`**

In `packages/crawler-core/src/lib/extractors/llm.ts`, add to the object schema after `artist: z.string(),`:

```typescript
export const NormalizedEventSchema = z.object({
  title: z.string(),
  rawTitle: z.string(),
  artist: z.string(),
  supportingArtists: z.array(z.string()).optional(),
  tourName: z.string().nullable().optional(),
  date: isoDateSchema,
  // ...rest unchanged
})
```

(and `export const NormalizedEventSchema` per Step 2.)

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm --filter @concert-crawl/crawler-core test -- llm.test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/crawler-core/src/types.ts packages/crawler-core/src/lib/extractors/llm.ts packages/crawler-core/src/lib/extractors/llm.test.ts
git commit -m "feat(crawler): supportingArtists + tourName on NormalizedEvent schema (#643)"
```

---

### Task 4: Teach the LLM extractor to fill the fields

**Files:**

- Modify: `packages/crawler-core/src/lib/extractors/llm.ts:97-112` (`SYSTEM_PROMPT`)
- Modify: `packages/crawler-core/src/lib/extractors/llm.ts:114-182` (`save_events` tool JSON schema)

**Interfaces:**

- Consumes: `NormalizedEventSchema` from Task 3.
- Produces: extracted events now carry `supportingArtists` + `tourName` when the page exposes them.

- [ ] **Step 1: Add tool-schema properties for the two fields**

In the `save_events` tool `properties` block (after the `artist` property), add:

```typescript
        artist: {
          type: 'string',
          description: 'Main performing (headlining) artist or band name',
        },
        supportingArtists: {
          type: 'array',
          items: { type: 'string' },
          description:
            'Opening / supporting acts, in billing order, EXCLUDING the headliner in the artist field. Order-preserved as printed on the source. Omit or use an empty array if there are no named openers.',
        },
        tourName: {
          type: ['string', 'null'],
          description:
            'The tour or run name when the source clearly labels one (e.g. "Rat Saw God Tour"). This is NOT the openers and NOT "AEG Presents"-style promoter text. Use null when no distinct tour name is present.',
        },
```

- [ ] **Step 2: Add extraction rules to the system prompt**

In `SYSTEM_PROMPT`, add these bullets to the `Rules:` list:

```
- supportingArtists: list the opening/supporting acts in the order printed, and do NOT include the headliner (already in artist). If the page shows no distinct openers, use an empty array.
- tourName: only set this when the source names a tour/run distinctly (e.g. "The Eras Tour"). Do not put promoter/presenter text ("AEG Presents"), venue names, or opener names here. Use null when there is no tour name.
```

- [ ] **Step 3: Typecheck the package**

Run: `pnpm --filter @concert-crawl/crawler-core typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add packages/crawler-core/src/lib/extractors/llm.ts
git commit -m "feat(crawler): extract supportingArtists + tourName in LLM prompt/tool (#643)"
```

---

### Task 5: Map JSON-LD performers → supportingArtists; persist both fields on upsert

**Files:**

- Modify: `packages/crawler-core/src/lib/extractors/json-ld.ts:83-128` (`mapToNormalizedEvent`)
- Modify: `packages/crawler-core/src/crawl.ts:621-732` (`eventValues` map + `onConflictDoUpdate` set)
- Test: `packages/crawler-core/src/lib/extractors/json-ld.test.ts` (append)

**Interfaces:**

- Consumes: `NormalizedEvent` fields (Task 3), `events` columns (Task 2).
- Produces: DB rows whose `supporting_artists` / `tour_name` reflect extraction.

- [ ] **Step 1: Write a failing test for JSON-LD multi-performer mapping**

Append a test inside the existing `describe('extractJsonLd', ...)` block in `packages/crawler-core/src/lib/extractors/json-ld.test.ts`, using the file's existing `makeHtml(...)` helper and `SOURCE_URL` constant. Assert that when `performer` is an array of names, the first becomes `artist` and the rest become `supportingArtists`:

```typescript
it('maps trailing JSON-LD performers to supportingArtists', () => {
  const html = makeHtml({
    '@context': 'https://schema.org',
    '@type': 'MusicEvent',
    name: 'Wednesday',
    startDate: '2026-08-01T20:00:00-06:00',
    performer: [
      { '@type': 'MusicGroup', name: 'Wednesday' },
      { '@type': 'MusicGroup', name: 'Hotline TNT' },
    ],
  })
  const events = extractJsonLd(html, SOURCE_URL)
  expect(events[0]?.artist).toBe('Wednesday')
  expect(events[0]?.supportingArtists).toEqual(['Hotline TNT'])
})
```

(The extractor is `extractJsonLd`, imported from `./json-ld.js` — it takes HTML (not a raw JSON string) plus `SOURCE_URL`, and an optional third `timeZone` arg that the existing tests omit; follow them and pass just the two args. `makeHtml(jsonLd)` wraps the object in a `<script type="application/ld+json">` tag; both `makeHtml` and `SOURCE_URL` already exist at the top of the test file.)

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @concert-crawl/crawler-core test -- json-ld.test`
Expected: FAIL — `supportingArtists` is currently `undefined`.

- [ ] **Step 3: Map trailing performers in `mapToNormalizedEvent`**

In `json-ld.ts`, replace the single-artist derivation with headliner + rest. Add a helper that returns all performer names in order, then split:

```typescript
const performerNames = getPerformerNames(obj['performer']) // returns string[] in order
const artist = performerNames[0] ?? name
const supportingArtists = performerNames.slice(1)
// ...
const event: NormalizedEvent = {
  title: name,
  rawTitle: name,
  artist,
  date,
  sourceUrl,
  confidence: 1.0,
}
if (supportingArtists.length > 0) event.supportingArtists = supportingArtists
```

Add `getPerformerNames` next to the existing `getArtistName` (keep `getArtistName` if other call sites use it): it accepts the same `performer` union (single object, array, or string) and returns an ordered `string[]` of `name` values, filtering non-strings. JSON-LD has no standard tour-name field, so leave `tourName` unset on this path.

> **Accepted limitation — `tourName` on JSON-LD venues.** The crawl cascade (`crawl.ts:126-138`) runs JSON-LD first and only falls back to the LLM when JSON-LD returns **zero** events. So any venue that emits valid JSON-LD never reaches the LLM path, and — because schema.org has no tour-name field — its `tourName` stays `null`. This is intentional for #643: the primary deliverable (`supportingArtists`) _is_ populated on the JSON-LD path, and the UI degrades gracefully (`EventTitleBlock` renders no tour kicker when `tourName` is null). Forcing an LLM pass on every JSON-LD venue just to fish for a tour name would violate the cost-conscious principle. Enrichment (admin manual entry, targeted LLM, or title heuristics) is tracked as follow-up **#992** and is out of scope here.

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @concert-crawl/crawler-core test -- json-ld.test`
Expected: PASS.

- [ ] **Step 5: Persist both fields in the upsert insert values**

In `crawl.ts`, in the `eventValues` map (after `artist: event.artist,`), add:

```typescript
    artist: event.artist,
    supportingArtists: event.supportingArtists ?? [],
    tourName: event.tourName ?? null,
```

- [ ] **Step 6: Update the conflict set so re-crawls refresh the fields**

In the same file's `onConflictDoUpdate({ set: { ... } })`, add:

```typescript
      supportingArtists: sql`excluded.supporting_artists`,
      tourName: sql`excluded.tour_name`,
```

- [ ] **Step 7: Typecheck + run the crawler-core test suite**

Run: `pnpm --filter @concert-crawl/crawler-core typecheck && pnpm --filter @concert-crawl/crawler-core test`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add packages/crawler-core/src/lib/extractors/json-ld.ts packages/crawler-core/src/lib/extractors/json-ld.test.ts packages/crawler-core/src/crawl.ts
git commit -m "feat(crawler): map JSON-LD performers + persist supportingArtists/tourName (#643)"
```

---

### Task 6: Serialize the fields in the events API

**Files:**

- Modify: `apps/api/src/routes/events.ts:162-200` (list `select`)
- Modify: `apps/api/src/routes/events.ts:366-398` (detail `select`)
- Modify: `apps/api/src/routes/events.ts:938-969` (`GET /:id/related` slim `select` — feeds the related-shows `EventCard`)
- Modify: `apps/api/src/routes/venues-public.ts:137-160` (`GET /v1/venues/:slug` `upcomingEvents` slim `select` — feeds the venue-profile `EventCard`s)
- Test: `apps/api/src/routes/events.integration.test.ts` (append — seeded HTTP test hitting a real row; NOT `events.test.ts`, which mocks `@concert-crawl/db` and cannot seed)
- Test: `apps/api/src/routes/venues-public.integration.test.ts` (append — assert the venue-profile events echo both fields)

**Interfaces:**

- Consumes: `events` columns (Task 2), `Event` type (Task 1).
- Produces: `GET /v1/events`, `GET /v1/events/:id`, `GET /v1/events/:id/related`, and `GET /v1/venues/:slug` (`upcomingEvents`) responses include `supportingArtists` + `tourName`.

- [ ] **Step 1: Write a failing integration test**

Append to `apps/api/src/routes/events.integration.test.ts` a test that inserts an event with `supportingArtists: ['Hotline TNT']` + `tourName: 'Rat Saw God Tour'` and asserts the list + detail responses echo them. Mirror the existing seeded HTTP pattern exactly: `seedVenue({ name, slug })` first, then `seedEvent(venue.id, { ... })` (venueId is the first positional arg and it returns the inserted row incl. `id`). The list response is wrapped as `{ success, data: { data: Row[], total, ... } }` — i.e. `body.data` is the paginated wrapper and `body.data.data` is the row array — and the detail response is `{ success, data: Row }`. Both type assertions below include `success` and (for the list) `total` to match the envelope shape the ~41 sibling tests in this file use. The `(await res.json()) as { ... }` response-shape annotation is deliberate — it is the file's convention (see the Global Constraints carve-out); do NOT swap in a lone `safeParse` here:

```typescript
it('returns supportingArtists and tourName on list + detail', async () => {
  const venue = await seedVenue({ name: 'Ogden', slug: 'ogden' })
  const event = await seedEvent(venue.id, {
    title: 'Wednesday',
    date: '2027-06-01',
    supportingArtists: ['Hotline TNT'],
    tourName: 'Rat Saw God Tour',
  })

  const list = await app.request('/v1/events')
  const listBody = (await list.json()) as {
    success: boolean
    data: {
      data: Array<{
        id: string
        supportingArtists: string[] | null
        tourName: string | null
      }>
      total: number
    }
  }
  const listed = listBody.data.data.find((row) => row.id === event.id)
  expect(listed?.supportingArtists).toEqual(['Hotline TNT'])
  expect(listed?.tourName).toBe('Rat Saw God Tour')

  const detail = await app.request(`/v1/events/${event.id}`)
  const detailBody = (await detail.json()) as {
    success: boolean
    data: { supportingArtists: string[] | null; tourName: string | null }
  }
  expect(detailBody.data.supportingArtists).toEqual(['Hotline TNT'])
  expect(detailBody.data.tourName).toBe('Rat Saw God Tour')
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @concert-crawl/api test -- events.integration.test`
Expected: FAIL — `supportingArtists`/`tourName` are `undefined` in the response.

- [ ] **Step 3: Add both columns to the list `select`**

In the list route's `.select({ ... })`, add after `artist: events.artist,`:

```typescript
    artist: events.artist,
    supportingArtists: events.supportingArtists,
    tourName: events.tourName,
```

- [ ] **Step 4: Add both columns to the detail `select` and the related `select`**

Make the identical addition (after `artist: events.artist,`) in the detail route's `.select({ ... })` AND in the `GET /:id/related` slim `.select({ ... })` (~events.ts:938-969). The related panel renders `EventCard`, so its rows must carry `supportingArtists` + `tourName` too, or related cards fall back to the legacy title. Extend the related-shows assertion in the integration test (or add one) to cover this — seed a second same-venue event with openers and assert `GET /v1/events/:id/related` echoes them.

- [ ] **Step 5: Add both columns to the venue-profile `upcomingEvents` select**

The venue profile page (`/v1/venues/:slug`) renders `EventCard`s from a **separate** slim select in `apps/api/src/routes/venues-public.ts` (`upcomingEvents`, ~lines 137-160), typed via `VenueWithEvents` (which embeds `Omit<EventWithVenue, 'venue'>`). It is NOT covered by the `events.ts` edits above, so without this step the venue surface keeps rendering the legacy run-on `title` even after PR 2. Add, after `artist: events.artist,`:

```typescript
      artist: events.artist,
      supportingArtists: events.supportingArtists,
      tourName: events.tourName,
```

Then append an assertion to the `GET /v1/venues/:slug — integration` block in `apps/api/src/routes/venues-public.integration.test.ts` (mirror the existing `seedVenue` + `seedEvent(venue.id, { ... })` pattern). `seedEvent` defaults `date` to `2026-06-01` (a past date) and the `upcomingEvents` select filters to future events, so you MUST pass an explicit future `date` (the sibling tests use `2027-06-05`) or the seeded row never appears in the response:

```typescript
it('serializes supportingArtists and tourName on venue-profile events', async () => {
  const venue = await seedVenue({ name: 'Ogden', slug: 'ogden' })
  await seedEvent(venue.id, {
    artist: 'Wednesday',
    date: '2027-06-05',
    supportingArtists: ['Hotline TNT'],
    tourName: 'Rat Saw God Tour',
  })
  const res = await app.request('/v1/venues/ogden')
  const body = (await res.json()) as {
    success: boolean
    data: {
      venue: { slug: string }
      upcomingEvents: {
        supportingArtists: string[] | null
        tourName: string | null
      }[]
    }
  }
  expect(body.data.upcomingEvents[0]?.supportingArtists).toEqual([
    'Hotline TNT',
  ])
  expect(body.data.upcomingEvents[0]?.tourName).toBe('Rat Saw God Tour')
})
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `pnpm --filter @concert-crawl/api test -- events.integration.test venues-public.integration.test`
Expected: PASS.

- [ ] **Step 7: Full typecheck + lint across touched packages**

Run: `pnpm --filter @concert-crawl/api --filter @concert-crawl/crawler-core --filter @concert-crawl/db --filter @concert-crawl/types typecheck && pnpm lint`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/routes/events.ts apps/api/src/routes/events.integration.test.ts apps/api/src/routes/venues-public.ts apps/api/src/routes/venues-public.integration.test.ts
git commit -m "feat(api): serialize supportingArtists + tourName on events + venue endpoints (#643)"
```

**PR 1 ends here.** Open the PR (`feat/643-supporting-artists-data`), run the Copilot loop, merge. Do NOT add a `releases.ts` entry for PR 1 (no user-visible change yet). Add a `progress.md` row only after PR 2 ships the visible feature.

---

## PR 2 — UI

> Depends on PR 1 merged (Event type carries `supportingArtists` + `tourName`). Branch from fresh `origin/main` after PR 1 lands.

### Task 7: Copy strings + a11y/format helpers

**Files:**

- Modify: `apps/web/src/components/consumer/definitions/copy.ts` (add an `eventTitle` section)
- Create: `apps/web/src/components/consumer/event-title-block/lib/supportingLine.ts`
- Test: `apps/web/src/components/consumer/event-title-block/lib/supportingLine.test.ts`

**Interfaces:**

- Produces:
  - `CONSUMER_COPY.eventTitle.lead: 'with'`
  - `formatMoreCount(n: number): string` → `"+3 more"`
  - `supportingA11yLabel(lead: string, artists: string[]): string` → natural-language list
  - `SEPARATORS: Record<'middot' | 'bullet' | 'slash' | 'comma', string>`

- [ ] **Step 1: Add copy strings**

In `copy.ts`, add a top-level `eventTitle` section to `CONSUMER_COPY`:

```typescript
  eventTitle: {
    lead: 'with',
    moreSuffix: 'more',
  },
```

(`moreSuffix` keeps the `as const` object function-free; the `+N more` string is assembled in the lib helper below.)

- [ ] **Step 2: Write failing tests for the helpers**

Create `apps/web/src/components/consumer/event-title-block/lib/supportingLine.test.ts`:

```typescript
import { describe, expect, it } from 'vitest'
import { formatMoreCount, supportingA11yLabel } from './supportingLine'

describe('supportingA11yLabel', () => {
  it('returns empty string for no artists', () => {
    expect(supportingA11yLabel('with', [])).toBe('')
  })
  it('handles one artist', () => {
    expect(supportingA11yLabel('with', ['Hotline TNT'])).toBe(
      'with Hotline TNT',
    )
  })
  it('handles two artists', () => {
    expect(supportingA11yLabel('with', ['A', 'B'])).toBe('with A and B')
  })
  it('handles three or more with Oxford comma', () => {
    expect(supportingA11yLabel('with', ['A', 'B', 'C'])).toBe(
      'with A, B, and C',
    )
  })
})

describe('formatMoreCount', () => {
  it('formats the overflow tail', () => {
    expect(formatMoreCount(3)).toBe('+3 more')
  })
})
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `pnpm --filter @concert-crawl/web test -- supportingLine.test`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement the helpers**

Create `apps/web/src/components/consumer/event-title-block/lib/supportingLine.ts`:

```typescript
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'

export const SEPARATORS = {
  middot: '·',
  bullet: '•',
  slash: '/',
  comma: ',',
} as const

export type SeparatorKey = keyof typeof SEPARATORS

export const formatMoreCount = (count: number): string =>
  `+${count} ${CONSUMER_COPY.eventTitle.moreSuffix}`

export const supportingA11yLabel = (
  lead: string,
  artists: string[],
): string => {
  if (artists.length === 0) return ''
  if (artists.length === 1) return `${lead} ${artists[0]}`
  if (artists.length === 2) return `${lead} ${artists[0]} and ${artists[1]}`
  const head = artists.slice(0, -1).join(', ')
  const last = artists[artists.length - 1]
  return `${lead} ${head}, and ${last}`
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm --filter @concert-crawl/web test -- supportingLine.test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/consumer/definitions/copy.ts apps/web/src/components/consumer/event-title-block/lib/supportingLine.ts apps/web/src/components/consumer/event-title-block/lib/supportingLine.test.ts
git commit -m "feat(web): eventTitle copy + supporting-line a11y/format helpers (#643)"
```

---

### Task 8: `SupportingLine` component (openers billing line)

**Files:**

- Create: `apps/web/src/components/consumer/event-title-block/SupportingLine.tsx`
- Test: `apps/web/src/components/consumer/event-title-block/SupportingLine.test.tsx`

**Interfaces:**

- Consumes: `SEPARATORS`, `formatMoreCount`, `supportingA11yLabel` (Task 7); `CONSUMER_COPY.eventTitle.lead`.
- Produces:

  ```typescript
  type Surface = 'card' | 'hero' | 'detail'
  interface SupportingLineProps {
    artists: string[]
    surface?: Surface // default 'card'
    maxInline?: number | null // default null (show all)
    dim?: boolean // default false
    separator?: SeparatorKey // default 'middot'
  }
  export const SupportingLine: (
    props: SupportingLineProps,
  ) => JSX.Element | null
  ```

- [ ] **Step 1: Write failing tests**

Create `SupportingLine.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SupportingLine } from './SupportingLine'

describe('SupportingLine', () => {
  it('renders nothing with no artists', () => {
    const { container } = render(<SupportingLine artists={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('exposes the full roster to screen readers even when truncated', () => {
    render(<SupportingLine artists={['A', 'B', 'C', 'D']} maxInline={2} />)
    expect(screen.getByRole('group')).toHaveAttribute(
      'aria-label',
      'with A, B, C, and D',
    )
  })

  it('shows a +N more tail when truncated', () => {
    render(<SupportingLine artists={['A', 'B', 'C', 'D']} maxInline={2} />)
    expect(screen.getByText('+2 more')).toBeInTheDocument()
  })

  it('drops the separator for a single opener', () => {
    render(<SupportingLine artists={['Solo']} />)
    expect(screen.queryByText('·')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @concert-crawl/web test -- SupportingLine.test`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `SupportingLine`**

Create `SupportingLine.tsx`. Port the billing variant from the handoff (`design/design_handoff_supporting_artists_line/supporting-line.jsx:141-190`), converted to an arrow-function TSX component with token classes and a numeric size ramp. Colors come from token classes; per-surface font sizes come from a `RAMP` constant (inline `style` for the numeric sizes is acceptable — Tailwind has no token for arbitrary ramps):

```tsx
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'
import {
  formatMoreCount,
  SEPARATORS,
  supportingA11yLabel,
  type SeparatorKey,
} from './lib/supportingLine'

type Surface = 'card' | 'hero' | 'detail'

const RAMP: Record<Surface, { lead: number; name: number }> = {
  card: { lead: 10, name: 12 },
  hero: { lead: 11, name: 13 },
  detail: { lead: 13, name: 16 },
}

interface SupportingLineProps {
  artists: string[]
  surface?: Surface
  separator?: SeparatorKey
  maxInline?: number | null
  dim?: boolean
}

export const SupportingLine = ({
  artists,
  surface = 'card',
  separator = 'middot',
  maxInline = null,
  dim = false,
}: SupportingLineProps): JSX.Element | null => {
  if (artists.length === 0) return null
  const ramp = RAMP[surface]
  const sep = SEPARATORS[separator]
  const lead = CONSUMER_COPY.eventTitle.lead
  const limit = maxInline == null ? artists.length : Math.max(1, maxInline)
  const shown = artists.slice(0, limit)
  const hidden = artists.length - shown.length
  const nameColor = dim ? 'text-fg-subtle' : 'text-fg-muted'

  return (
    <div
      role="group"
      aria-label={supportingA11yLabel(lead, artists)}
      className="flex min-w-0 items-baseline"
    >
      <span
        aria-hidden="true"
        className="mr-1.5 shrink-0 font-mono tracking-wide text-fg-subtle"
        style={{ fontSize: ramp.lead }}
      >
        {lead}
      </span>
      <span className="min-w-0 truncate" aria-hidden="true">
        {shown.map((name, index) => (
          <span key={`${name}-${index}`}>
            {index > 0 && (
              <span
                className="px-1.5 font-normal text-fg-subtle"
                style={{ fontSize: ramp.name }}
              >
                {sep}
              </span>
            )}
            <span
              className={`font-semibold ${nameColor}`}
              style={{ fontSize: ramp.name }}
            >
              {name}
            </span>
          </span>
        ))}
        {hidden > 0 && (
          <>
            <span
              className="px-1.5 text-fg-subtle"
              style={{ fontSize: ramp.name }}
            >
              {sep}
            </span>
            <span
              className="whitespace-nowrap font-mono font-medium text-fg-subtle"
              style={{ fontSize: ramp.name - 1.5 }}
            >
              {formatMoreCount(hidden)}
            </span>
          </>
        )}
      </span>
    </div>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @concert-crawl/web test -- SupportingLine.test`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/consumer/event-title-block/SupportingLine.tsx apps/web/src/components/consumer/event-title-block/SupportingLine.test.tsx
git commit -m "feat(web): SupportingLine openers billing component (#643)"
```

---

### Task 9: `EventTitleBlock` composed component (tour kicker + headliner + openers + status)

**Files:**

- Create: `apps/web/src/components/consumer/event-title-block/EventTitleBlock.tsx`
- Create: `apps/web/src/components/consumer/event-title-block/index.ts` (re-export)
- Test: `apps/web/src/components/consumer/event-title-block/EventTitleBlock.test.tsx`

**Interfaces:**

- Consumes: `SupportingLine` (Task 8); `EventStatus` from `@concert-crawl/types`.
- Produces:

  ```typescript
  interface EventTitleBlockProps {
    headliner: string
    // Required, not optional: these are always present on `Event` (nullable
    // but non-optional), so callers must pass them. `null` is the sole legacy
    // marker — keeping the prop required prevents a missing/undefined prop from
    // silently masquerading as a legacy row.
    supportingArtists: string[] | null
    tourName: string | null
    fallbackTitle?: string | null // legacy run-on title; rendered only for legacy rows (supportingArtists === null)
    surface?: 'card' | 'hero' | 'detail'
    status?: EventStatus
    maxInline?: number | null
    headlinerAs?: 'h1' | 'div' // detail passes 'h1' to keep the page's single top-level heading; cards keep 'div'
  }
  export const EventTitleBlock: (props: EventTitleBlockProps) => JSX.Element
  ```

- [ ] **Step 1: Write failing tests (incl. the legacy fallback)**

Create `EventTitleBlock.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { EventTitleBlock } from './EventTitleBlock'

describe('EventTitleBlock', () => {
  it('renders headliner + openers', () => {
    render(
      <EventTitleBlock
        headliner="Wednesday"
        supportingArtists={['Hotline TNT']}
        tourName={null}
      />,
    )
    expect(screen.getByText('Wednesday')).toBeInTheDocument()
    expect(screen.getByRole('group')).toHaveAttribute(
      'aria-label',
      'with Hotline TNT',
    )
  })

  it('renders the tour name as a kicker', () => {
    render(
      <EventTitleBlock
        headliner="Wednesday"
        supportingArtists={[]}
        tourName="Rat Saw God Tour"
      />,
    )
    expect(screen.getByText('Rat Saw God Tour')).toBeInTheDocument()
  })

  it('falls back to the legacy title for legacy rows (supportingArtists === null)', () => {
    render(
      <EventTitleBlock
        headliner="Wednesday"
        supportingArtists={null}
        tourName={null}
        fallbackTitle="Wednesday + Hotline TNT / MJ Lenderman"
      />,
    )
    expect(
      screen.getByText('Wednesday + Hotline TNT / MJ Lenderman'),
    ).toBeInTheDocument()
  })

  it('suppresses the legacy fallback for freshly extracted solo shows (supportingArtists === [])', () => {
    // `[]` means the crawler ran and found no openers — the headliner alone is
    // correct, so the run-on `fallbackTitle` must NOT reappear even when it
    // differs from the headliner (e.g. carries promoter/presenter text).
    render(
      <EventTitleBlock
        headliner="Wednesday"
        supportingArtists={[]}
        tourName={null}
        fallbackTitle="AEG Presents Wednesday"
      />,
    )
    expect(screen.queryByText('AEG Presents Wednesday')).not.toBeInTheDocument()
  })

  it('omits the legacy fallback when it equals the headliner', () => {
    render(
      <EventTitleBlock
        headliner="Wednesday"
        supportingArtists={null}
        tourName={null}
        fallbackTitle="Wednesday"
      />,
    )
    expect(screen.queryByText('Wednesday')).toBeInTheDocument()
    // headliner is present exactly once — no duplicate fallback paragraph
    expect(screen.getAllByText('Wednesday')).toHaveLength(1)
  })

  it('renders the headliner as an <h1> when headlinerAs="h1"', () => {
    render(
      <EventTitleBlock
        headliner="Wednesday"
        supportingArtists={[]}
        tourName={null}
        headlinerAs="h1"
      />,
    )
    expect(
      screen.getByRole('heading', { level: 1, name: 'Wednesday' }),
    ).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @concert-crawl/web test -- EventTitleBlock.test`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `EventTitleBlock`**

Create `EventTitleBlock.tsx`. Port the composition from `supporting-line.jsx:249-317` (kicker row with status pill + tour eyebrow, headliner, openers) plus the fallback branch. Use token classes; numeric head/tour sizes from a `RAMP`:

```tsx
import type { EventStatus } from '@concert-crawl/types'
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'
import { SupportingLine } from './SupportingLine'

type Surface = 'card' | 'hero' | 'detail'

const RAMP: Record<Surface, { head: number; tour: number; gap: number }> = {
  card: { head: 15, tour: 9, gap: 2 },
  hero: { head: 22, tour: 10, gap: 3 },
  detail: { head: 34, tour: 12, gap: 5 },
}

// Labels come from CONSUMER_COPY (copy-rule). The pill span carries the
// `uppercase` class, so 'Cancelled'/'Postponed' still render all-caps.
const STATUS_PILL: Record<
  Exclude<EventStatus, 'upcoming'>,
  { label: string; tone: string }
> = {
  cancelled: {
    label: CONSUMER_COPY.cancelledLabel,
    tone: 'text-danger border-danger',
  },
  postponed: {
    label: CONSUMER_COPY.postponedLabel,
    tone: 'text-warning border-warning',
  },
}

interface EventTitleBlockProps {
  headliner: string
  supportingArtists: string[] | null
  tourName: string | null
  fallbackTitle?: string | null
  surface?: Surface
  status?: EventStatus
  maxInline?: number | null
  headlinerAs?: 'h1' | 'div'
}

export const EventTitleBlock = ({
  headliner,
  supportingArtists,
  tourName,
  fallbackTitle,
  surface = 'card',
  status = 'upcoming',
  maxInline = null,
  headlinerAs = 'div',
}: EventTitleBlockProps): JSX.Element => {
  const ramp = RAMP[surface]
  const dim = status !== 'upcoming'
  const openers = supportingArtists ?? []
  const hasOpeners = openers.length > 0
  // `null` marks a legacy/pre-recrawl row (the crawler never wrote this field);
  // `[]` means the crawler ran and found no openers. Only legacy rows get the
  // run-on `fallbackTitle` — a freshly extracted solo show (`[]`) shows the
  // headliner alone, never the legacy title. Strict `=== null`: `null` is the
  // sole legacy marker, and the prop is required so `undefined` cannot reach here.
  const isLegacyRow = supportingArtists === null
  const pill = status !== 'upcoming' ? STATUS_PILL[status] : null
  const Headliner = headlinerAs
  const showLegacyFallback =
    isLegacyRow && !!fallbackTitle && fallbackTitle !== headliner

  return (
    <div className="flex min-w-0 flex-col" style={{ gap: ramp.gap }}>
      {(pill || tourName) && (
        <div className="mb-0.5 flex min-w-0 items-center gap-2">
          {pill && (
            <span
              className={`inline-flex shrink-0 items-center rounded border px-1.5 py-0.5 font-mono font-bold uppercase tracking-widest ${pill.tone}`}
              style={{ fontSize: ramp.tour }}
            >
              {pill.label}
            </span>
          )}
          {tourName && (
            <div
              className={`truncate font-mono uppercase tracking-[0.14em] ${dim ? 'text-fg-subtle' : 'text-fg-muted'}`}
              style={{ fontSize: ramp.tour }}
            >
              {tourName}
            </div>
          )}
        </div>
      )}

      <Headliner
        // `detail` wraps to as many lines as needed (no `truncate`); `card`/`hero`
        // stay one line via `truncate` (which sets overflow-hidden + ellipsis +
        // whitespace-nowrap). Applying `truncate` on `detail` too would clip a
        // multi-line title, so it is scoped to the non-detail surfaces only.
        className={`m-0 min-w-0 font-extrabold leading-tight ${dim ? 'text-fg-muted' : 'text-fg'} ${surface === 'detail' ? 'whitespace-normal' : 'truncate'}`}
        style={{
          fontSize: ramp.head,
          ...(status === 'cancelled'
            ? {
                textDecoration: 'line-through',
                textDecorationColor: 'var(--danger)',
                textDecorationThickness: 2,
              }
            : {}),
        }}
      >
        {headliner}
      </Headliner>

      {hasOpeners && (
        <SupportingLine
          artists={openers}
          surface={surface}
          maxInline={maxInline}
          dim={dim}
        />
      )}

      {showLegacyFallback && (
        <p
          className={`truncate font-medium ${dim ? 'text-fg-subtle' : 'text-fg-muted'}`}
          style={{ fontSize: RAMP[surface].tour + 3 }}
        >
          {fallbackTitle}
        </p>
      )}
    </div>
  )
}
```

Create `index.ts`:

```typescript
export { EventTitleBlock } from './EventTitleBlock'
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @concert-crawl/web test -- EventTitleBlock.test`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/consumer/event-title-block/EventTitleBlock.tsx apps/web/src/components/consumer/event-title-block/index.ts apps/web/src/components/consumer/event-title-block/EventTitleBlock.test.tsx
git commit -m "feat(web): EventTitleBlock composed title component (#643)"
```

---

### Task 10: Integrate into `EventCard`

**Files:**

- Modify: `apps/web/src/components/consumer/event-card/EventCard.tsx:117-120`
- Test: `apps/web/src/components/consumer/event-card/EventCard.test.tsx` (append if present)

**Interfaces:**

- Consumes: `EventTitleBlock` (Task 9). `event` already carries `artist`, `title`, `supportingArtists`, `tourName`, `status`.

- [ ] **Step 1: Replace the run-on title paragraph**

Replace the existing block:

```tsx
{
  event.title !== event.artist && (
    <p className="truncate text-[12px] font-medium text-fg-muted">
      {event.title}
    </p>
  )
}
```

The `EventCard` currently renders `event.artist` inside a `<Link href={`/events/${event.id}`}>` (there are two responsive variants of this headliner `Link`, ~lines 96–101 and 110–115) and then renders the run-on `event.title` paragraph below. Replace BOTH the headliner text and this paragraph with a single `EventTitleBlock` (surface `card`), passing the legacy `title` as `fallbackTitle`.

**Preserve the navigation:** `EventTitleBlock` renders only the title text — it must stay wrapped in the existing `<Link href={`/events/${event.id}`}>` so the card title remains a click target to the event detail page. Keep the `Link` (and its existing className / responsive wrappers); swap only the `{event.artist}` child (and delete the separate `event.title` paragraph). Do NOT drop the `Link`:

```tsx
<Link href={`/events/${event.id}`} className={/* existing classes unchanged */}>
  <EventTitleBlock
    headliner={event.artist}
    supportingArtists={event.supportingArtists}
    tourName={event.tourName}
    fallbackTitle={event.title}
    status={event.status}
    surface="card"
    maxInline={2}
  />
</Link>
```

Read the surrounding JSX first: keep the existing wrapper element/classes that positioned the artist + title, and swap only the artist line + title paragraph for `EventTitleBlock`. Do not remove date/venue/price/genre elements.

- [ ] **Step 2: Add/adjust a render test**

If `EventCard.test.tsx` exists, add a case asserting a card with `supportingArtists: ['Hotline TNT']` renders the openers group; otherwise rely on the component-level tests. Mirror the existing test's event fixture and add the two new fields to it.

- [ ] **Step 3: Typecheck + test**

Run: `pnpm --filter @concert-crawl/web typecheck && pnpm --filter @concert-crawl/web test -- EventCard`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/consumer/event-card/
git commit -m "feat(web): render EventTitleBlock in EventCard (#643)"
```

---

### Task 11: Integrate into `HeroEventCard` + Event detail header

**Files:**

- Modify: `apps/web/src/components/consumer/hero-event-card/HeroEventCard.tsx:81-88`
- Modify: `apps/web/src/app/(protected)/(main)/events/[id]/page.tsx:159-163`

**Interfaces:**

- Consumes: `EventTitleBlock` (Task 9).

- [ ] **Step 1: Swap `HeroEventCard`'s title block**

Replace the artist line + `event.title` paragraph (lines ~81-88) with:

```tsx
<EventTitleBlock
  headliner={event.artist}
  supportingArtists={event.supportingArtists}
  tourName={event.tourName}
  fallbackTitle={event.title}
  status={event.status}
  surface="hero"
  maxInline={3}
/>
```

Preserve the surrounding hero layout (image, date badge, CTA); swap only the artist + title text.

- [ ] **Step 2: Swap the detail header**

The current detail header renders the headliner inside an `<h1>` (`events/[id]/page.tsx:146-163`). Replace that `<h1>` + the `event.title` paragraph (lines ~159-163) with `EventTitleBlock` at `surface="detail"`, passing `headlinerAs="h1"` so the block emits the page's single top-level heading directly (no wrapping `<h1>` — nesting a block element inside `<h1>` is invalid markup). No `maxInline` — detail has room to show all openers:

```tsx
<EventTitleBlock
  headliner={event.artist}
  supportingArtists={event.supportingArtists}
  tourName={event.tourName}
  fallbackTitle={event.title}
  status={event.status}
  surface="detail"
  headlinerAs="h1"
/>
```

Do NOT leave the old `<h1>` wrapper around the block — `EventTitleBlock` now owns the `<h1>`. The a11y test in Step 4 confirms the detail page has exactly one top-level heading.

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter @concert-crawl/web typecheck`
Expected: PASS.

- [ ] **Step 4: Manual + a11y verification (dev server)**

Run `pnpm --filter @concert-crawl/web dev`. Load a browse page, a hero placement, and an event detail page against seeded staging data (or local seed). Confirm at 320px and desktop: openers read as a `with A · B` line, tour renders as a kicker above the headliner, `+N more` appears when openers overflow on a card, cancelled shows the strike + pill, and legacy events (no `supportingArtists`) still show their old title line. Confirm the detail page has exactly one `<h1>`.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/consumer/hero-event-card/ "apps/web/src/app/(protected)/(main)/events/[id]/page.tsx"
git commit -m "feat(web): render EventTitleBlock in HeroEventCard + detail header (#643)"
```

---

### Task 12: Release note + final verification

**Files:**

- Modify: `apps/web/src/lib/definitions/releases.ts`
- Modify: `docs/superpowers/progress.md`

- [ ] **Step 1: Add a release note entry**

Add a new entry to `releases.ts` (mirror the newest existing entry's shape — version, date, title, bullet copy). Use the human-readable date format the file already uses (e.g. `Jul 12, 2026`), set to this PR's actual merge date — not a hard-coded value. Copy in Hugh's voice, e.g. title "Openers get their own line" with a bullet explaining supporting acts + tour names now render clearly. Check for a matching spotlight asset in `design/design_handoff_spotlight_heroes/`; wire it if one exists, otherwise a text-only entry.

- [ ] **Step 2: Add a progress.md row**

Add a ✅ Complete row for the supporting-artists feature (this is a user-facing feature — it qualifies). Use this PR's actual merge date in the existing `merged YYYY-MM-DD` convention — not a hard-coded value.

- [ ] **Step 3: Full workspace verification**

Run: `pnpm typecheck && pnpm lint && pnpm --filter @concert-crawl/web test`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/lib/definitions/releases.ts docs/superpowers/progress.md
git commit -m "docs(web): release note + progress row for supporting artists line (#643)"
```

**PR 2 ends here.** Run the `design-review` skill against the handoff before opening the PR (hard gate). Open the PR (`feat/643-supporting-artists-ui`), run the Copilot loop + the `design-review` skill, merge. `Closes #643` in the PR body.

---

## Self-Review

**Spec coverage** (against `docs/superpowers/specs/2026-07-11-supporting-artists-title-separator-design.md` + READINESS):

- Structured `supportingArtists: string[] | null` + `tourName: string | null` data-first fix → Tasks 1–6. ✅
- Every surface that renders `event.title` (EventCard, HeroEventCard, detail, related-shows panel, venue-profile list) → Tasks 10–11 (shared `EventCard`/`EventTitleBlock`); related panel's `EventCard` fed by the `GET /:id/related` select and the venue-profile list fed by the `GET /v1/venues/:slug` `upcomingEvents` select, both serialized in Task 6. ✅
- Separator treatment (middot inside "with" lead) → Task 8. ✅
- Tour name as kicker above headliner → Task 9. ✅
- Overflow `+N more` at 320px → Tasks 8 (`maxInline`) + 10 (`maxInline={2}` on card). ✅
- Empty / single / tour-only / solo → Tasks 8 (single drops separator, empty returns null) + 9 (tour-only kicker, solo headliner). ✅
- Cancelled / postponed pill + strike + dim → Task 9. ✅
- Forward-compat with #84 → openers are discrete nodes (Task 8); the `interactive` tap affordance is explicitly out of scope for this ticket, so it is NOT ported — #84 owns it. ✅ (documented departure from the handoff's `interactive` prop)
- A11y: `role="group"` + natural-language `aria-label`, glyphs `aria-hidden` → Tasks 7–8. ✅
- Token-only across 9 themes → token classes throughout. ✅
- Copy in `copy.ts` → Task 7. ✅
- Legacy fallback during backfill → Task 9 (`fallbackTitle`) + Tasks 10–11 (pass `event.title`). ✅
- Backfill/re-crawl of legacy titles → owned by eng, happens naturally on next crawl (Task 5 conflict-set refresh); no migration backfill needed since the UI falls back. ✅

**Placeholder scan:** No TBD/TODO; every code step shows real code; commands have expected output. The two spots that require reading real code before editing (JSON-LD extractor export name in Task 5; API seed-helper + response envelope in Task 6; EventCard/HeroEventCard surrounding JSX in Tasks 10–11) are called out explicitly with instructions to mirror existing patterns — these are integration seams, not placeholders.

**Type consistency:** `supportingArtists: string[] | null` on `Event` (Task 1) ↔ `supporting_artists text[]` nullable (Task 2) ↔ `supportingArtists?: string[]` on `NormalizedEvent` (Task 3) ↔ `event.supportingArtists ?? []` at upsert (Task 5) ↔ `SupportingLine` takes `string[]` with `?? []` normalization in `EventTitleBlock` (Task 9). `Surface` union (`'card' | 'hero' | 'detail'`) identical in Tasks 8 + 9. `formatMoreCount` / `supportingA11yLabel` / `SEPARATORS` names consistent Tasks 7→8. `EventStatus` from `@concert-crawl/types` reused in Task 9 (not redefined).
