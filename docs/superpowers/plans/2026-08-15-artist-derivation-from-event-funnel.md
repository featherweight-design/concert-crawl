# Artist Derivation From The Event Funnel — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop copying event titles into `events.artist`-derived artist rows by routing every extraction path through one `deriveArtists()` stage gated on `isConcert`, then clean up the existing projection.

**Architecture:** Extractors stop deciding who the artist is. Each returns `observedPerformers: string[]` — what the source actually stated — and a single shared stage runs a fixed precedence ladder: observed performers win, an LLM adjudicates only when there is no signal, and "no performer" resolves to an empty headliner list rather than the title. `events.artist` remains the display string and `canonical_artist` (the live dedup key) is never touched.

**Tech Stack:** TypeScript strict, Drizzle ORM, Vitest, Hono, Next.js App Router, Claude Haiku via the existing extractor client.

**Spec:** `docs/superpowers/specs/2026-08-15-artist-derivation-from-event-funnel-design.md`

## Global Constraints

- **Never modify `canonical_artist` or `canonicalizeArtist()`.** It backs the live unique index `events_venue_date_canonical_artist_showtime_idx`. Any change is a keyed migration with collision risk and is out of scope.
- **`events.artist` stays a required `string` and remains the display string.** Ladder step 1 writes the observed performer; steps 2 and 3 leave the source title in place.
- **No `as` casts.** Use Zod `safeParse` at boundaries, type guards for narrowing, declaration merging for library types.
- **`packages/db` exports built `dist`.** Run `pnpm --filter @concert-crawl/db build` before any `apps/api` integration suite, or the suite tests a stale build.
- **All work in a git worktree.** The main repo at `/Users/huey/Projects/concert-crawl` must stay `git status` clean.
- **`id-length` ESLint rule:** 2-char minimum for identifiers (`err`, not `e`), except `i`/`j`/`k`/`x`/`y`/`z`/`_`.
- **Customer-facing strings live in `definitions/copy.ts`.** Admin surfaces are exempt from the copy-review bar but not from the definitions convention.
- **The fail-open projection filter in `crawl.ts` is NOT tightened by this plan.** Find it by searching for the predicate `evt.isConcert !== false` — the line number drifts. See the spec's section 1. Leave it exactly as it is.

---

## File Structure

**Phase 1 — the derivation stage (PR 1)**

| File | Responsibility |
| --- | --- |
| `packages/crawler-core/src/lib/derive-artists.ts` (create) | The precedence ladder. One exported `deriveArtists()`. |
| `packages/crawler-core/src/lib/derive-artists.test.ts` (create) | Table-driven ladder tests. Carries the weight of this phase. |
| `packages/crawler-core/src/types.ts` (modify) | Add `observedPerformers` to `NormalizedEvent`; amend the `headliners` invariant doc. |
| `packages/crawler-core/src/lib/extractors/json-ld.ts` (modify) | Delete the `?? name` fallback; return `observedPerformers`. |
| `packages/crawler-core/src/lib/extractors/llm.ts` (modify) | Delete the `|| title` fallback; move the derivation prompt out. |
| `packages/crawler-core/src/lib/extractors/ticketure.ts` (modify) | No performer field exists. Keep `artist: title` as display; return `observedPerformers: []`. |
| `packages/crawler-core/src/lib/fetchers/livenation.ts` (modify) | Keep `?? event.name` for display; return the whole `artistNames` list as `observedPerformers`. |
| `packages/crawler-core/src/lib/fetchers/venuepilot.ts` (modify) | Return `announceArtists[].name` as `observedPerformers`; keep the title fallback for display only. |
| `packages/crawler-core/src/lib/fetchers/aeg.ts` (modify) | Return `[title.headlinersText]`. No title fallback exists here — the path already returns null without a headliner. |
| `packages/crawler-core/src/lib/fetchers/detail-page.ts` | **No change.** Builds no `NormalizedEvent` literal; inherits the `json-ld.ts` fix. |
| `packages/crawler-core/src/lib/genre-tagger.ts` (modify) | Remove the `?? ''` artist coalesce. |
| `packages/crawler-core/src/crawl.ts` (modify) | Call `deriveArtists()` between extraction and the event write. |
| `packages/db/src/scripts/backfill-artists.ts` (modify) | Read `canonical_headliners` first, `canonical_artist` as fallback. |

**Phase 2 — re-derivation pass (PR 2)**

| File | Responsibility |
| --- | --- |
| `packages/db/src/scripts/rederive-event-artists.ts` (create) | Dry-run-by-default one-off pass over stored events. |
| `packages/db/src/scripts/rederive-event-artists.test.ts` (create) | Selection + write-shape tests. |

**Phase 3 — admin surface (PR 3)**

| File | Responsibility |
| --- | --- |
| `packages/db/migrations/XXXX_artist_not_an_artist.sql` (create) | Add `not_an_artist` to `artist_match_status`. |
| `packages/db/src/schema/artists.ts` (modify) | Add the enum value. |
| `apps/api/src/routes/admin/artists.ts` (modify) | Accept the new status; exclude tombstones from the reaper's view. |
| `apps/web/src/app/(protected)/admin/artists/page.tsx` (modify) | One table, count chips, search, pagination. |
| `apps/web/src/app/(protected)/admin/artists/definitions/` (create) | Admin copy + constants for the consolidated table. |

**Phase 4 — Browse shelf (PR 4)**

| File | Responsibility |
| --- | --- |
| `apps/web/src/components/consumer/following/definitions/types.ts` (modify) | Add `eventId: string \| null` to `ShelfArtist`. |
| `apps/web/src/components/consumer/following/ShelfCard.tsx` (modify) | Link precedence: event → artist → inert. |
| The server flattener building `ShelfArtist` (modify) | Thread `nextShow.eventId` through. |

---

## Phase 1 — The derivation stage

### Task 1: Add `observedPerformers` to the extraction contract

**Files:**
- Modify: `packages/crawler-core/src/types.ts:1-46`

**Interfaces:**
- Consumes: nothing.
- Produces: `NormalizedEvent.observedPerformers: string[]` — every extractor must set it. Empty array means "the source named no performer," which is distinct from "we did not look."

- [ ] **Step 1: Add the field and amend the `headliners` invariant**

In `packages/crawler-core/src/types.ts`, add to `NormalizedEvent`:

```ts
  /**
   * Exactly who the SOURCE named as a performer, in billing order, before any
   * derivation. Empty means the listing named nobody — which is a real answer,
   * not a failure, and is what `deriveArtists()` escalates on.
   *
   * Extractors set this and stop deciding: the `?? title` fallbacks that used
   * to live in each of them are what filled `artists` with event titles.
   */
  observedPerformers: string[]
```

Then amend the existing `headliners` doc comment. It currently asserts
`headliners[0] === artist`; that invariant no longer holds once a non-concert
resolves to `[]` while `artist` keeps the display title. Replace the invariant
sentence with:

```ts
   * Every act headlining the bill, in billing order. Populated by
   * `deriveArtists()`, never by an extractor. MAY BE EMPTY: a listing that
   * names no performer (bingo, trivia, a film festival) resolves to `[]`
   * rather than to the event title. `artist` remains the display string in
   * that case, so `headliners[0] === artist` is NOT an invariant.
```

- [ ] **Step 2: Run typecheck to enumerate every extractor that must change**

Run: `pnpm --filter @concert-crawl/crawler-core typecheck`
Expected: FAIL, one error per object literal constructing a `NormalizedEvent` without `observedPerformers`. This error list is the Task 2 worklist — capture it.

- [ ] **Step 3: Commit the contract alone**

```bash
git add packages/crawler-core/src/types.ts
git commit -m "refactor(crawler): add observedPerformers to the extraction contract"
```

Note: the tree does not typecheck between this commit and Task 2's. That is
intentional — the contract change and the mechanical extractor updates are
easier to review apart. Do not push until Task 2 is green.

---

### Task 2: Separate the observed performers from the display string in every extractor

Line numbers below were correct at the time of writing and drift with every
merge. Search for the quoted expression rather than jumping to the line.

**Files:**
- Modify: `packages/crawler-core/src/lib/extractors/json-ld.ts` — `const artist = performerNames[0] ?? name`
- Modify: `packages/crawler-core/src/lib/extractors/llm.ts` — `const artist = evt.artist?.trim() || title`
- Modify: `packages/crawler-core/src/lib/extractors/ticketure.ts` — `artist: title,`
- Modify: `packages/crawler-core/src/lib/fetchers/livenation.ts` — `const artist = artistNames[0] ?? event.name`
- Modify: `packages/crawler-core/src/lib/fetchers/venuepilot.ts` — `const headliner = event.announceArtists?.[0]?.name?.trim()`
- Modify: `packages/crawler-core/src/lib/fetchers/aeg.ts` — `artist: headliner,`
- Modify: `packages/crawler-core/src/lib/genre-tagger.ts` — `artist: row.artist ?? ''`
- **Not modified:** `packages/crawler-core/src/lib/fetchers/detail-page.ts` — it delegates to `extractJsonLd(...)` and has no literal to amend.

**Interfaces:**
- Consumes: `NormalizedEvent.observedPerformers` from Task 1.
- Produces: every extractor emits `observedPerformers`, and `artist` is now
  always the SOURCE TITLE unless the source named a performer.

- [ ] **Step 1: Write the failing test for the JSON-LD path**

Create `packages/crawler-core/src/lib/extractors/json-ld.observed.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { extractFromJsonLd } from './json-ld.js'

const page = (event: Record<string, unknown>) =>
  `<script type="application/ld+json">${JSON.stringify({
    '@type': 'Event',
    startDate: '2026-09-12T20:00:00-06:00',
    ...event,
  })}</script>`

describe('json-ld observedPerformers', () => {
  it('reports the named performers in billing order', () => {
    const events = extractFromJsonLd(
      page({
        name: 'Thee Sacred Souls at the Ogden',
        performer: [{ name: 'Thee Sacred Souls' }, { name: 'LA LOM' }],
      }),
      'https://example.com/events',
      'America/Denver',
    )

    expect(events[0]?.observedPerformers).toEqual([
      'Thee Sacred Souls',
      'LA LOM',
    ])
  })

  it('reports an EMPTY list when the listing names no performer, and never copies the title', () => {
    const events = extractFromJsonLd(
      page({ name: 'HUMP! Film Festival' }),
      'https://example.com/events',
      'America/Denver',
    )

    expect(events[0]?.observedPerformers).toEqual([])
    expect(events[0]?.artist).toBe('HUMP! Film Festival')
  })
})
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `pnpm --filter @concert-crawl/crawler-core test json-ld.observed`
Expected: FAIL — `observedPerformers` is `undefined`.

- [ ] **Step 3: Fix the JSON-LD extractor**

In `json-ld.ts`, replace:

```ts
  const performerNames = getPerformerNames(obj['performer'])
  const artist = performerNames[0] ?? name
```

with:

```ts
  const observedPerformers = getPerformerNames(obj['performer'])
  // `artist` is the DISPLAY string, so the title is the right value when the
  // listing named nobody. What must never happen is that title reaching the
  // artists projection — `deriveArtists()` owns that, keyed on the empty
  // `observedPerformers` below.
  const artist = observedPerformers[0] ?? name
```

and add `observedPerformers,` to the returned object literal. `supportingArtists`
keeps using `observedPerformers.slice(1)` exactly as before.

- [ ] **Step 4: Confirm the JSON-LD test passes**

Run: `pnpm --filter @concert-crawl/crawler-core test json-ld.observed`
Expected: PASS

- [ ] **Step 5: Fix the LLM extractor — the fallback that defeats its own prompt**

In `llm.ts:441`, replace:

```ts
  const artist = evt.artist?.trim() || title
```

with:

```ts
  // The prompt tells the model to return `artist: null` when the listing names
  // no performer. This used to coalesce that null back into the title, which
  // silently defeated the instruction and is where 65 junk artist rows came
  // from. The null is now preserved as an EMPTY observedPerformers list.
  const observed = evt.artist?.trim()
  const observedPerformers = observed === undefined || observed === '' ? [] : [observed]
  const artist = observed === undefined || observed === '' ? title : observed
```

and add `observedPerformers,` to the returned object literal.

- [ ] **Step 6: Fix the remaining paths**

These are NOT uniform — three of them carry a real structured performer field
and one carries none. Read each before editing; the correct `observedPerformers`
value differs per path.

**`livenation.ts`** — `artistNames` is a genuine performer list and the payload
lists the headliner first. Replace:

```ts
  const artist = artistNames[0] ?? event.name
```

with:

```ts
  // The listing name is still the display string when the record carries no
  // artist breakdown (festival passes, multi-bill packages), but that name is
  // NOT an observation of a performer, so it does not enter observedPerformers.
  const observedPerformers = artistNames
  const artist = observedPerformers[0] ?? event.name
```

and add `observedPerformers,` to its literal. Note it passes the WHOLE list, not
just `[0]` — the tail currently lands in `supportingArtists`, and the ladder
needs the full billing to spot co-headliners (#1203).

**`venuepilot.ts`** — `announceArtists[].name` is the venue's own performer list
and the path has its own title fallback. Replace:

```ts
  const headliner = event.announceArtists?.[0]?.name?.trim()
  const artist = headliner && headliner.length > 0 ? headliner : title
```

with:

```ts
  const observedPerformers = (event.announceArtists ?? [])
    .map((entry) => entry.name.trim())
    .filter((name) => name.length > 0)
  const artist = observedPerformers[0] ?? title
```

and add `observedPerformers,` to its literal.

**`aeg.ts`** — `title.headlinersText` is AEG's own headliner field, and this path
already declines to emit an event without one (`if (!headliner) return null`), so
there is no title fallback to delete. Add to its literal:

```ts
    observedPerformers: [headliner],
```

The junk artist rows attributed to AEG are junk *inside* `headlinersText` (a
bingo night billed as its own headliner), not a title leak. The ladder's
adjudication step is what catches those, not this task.

**`ticketure.ts`** — the only path with no performer field at all. Its
`artist: title` IS the title fallback. Keep `artist: title` as the display
string, correct the comment above it so it no longer implies a derived artist,
and add:

```ts
    observedPerformers: [],
```

**`detail-page.ts`** — no change. It builds no `NormalizedEvent` literal; it
returns whatever `extractJsonLd(...)` produced, so it inherits Step 4's fix.

In `genre-tagger.ts:165`, replace `artist: row.artist ?? ''` with `artist: row.artist`
and adjust the surrounding type so the field is `string | null`. If the tagger
cannot accept null, skip the row instead of tagging an empty string — an event
with no artist has no genre to infer.

- [ ] **Step 7: Typecheck and run the full crawler-core suite**

Run: `pnpm --filter @concert-crawl/crawler-core typecheck && pnpm --filter @concert-crawl/crawler-core test`
Expected: PASS. Existing extractor tests that assert `artist` equals a title
still pass — this task did not change `artist` for any path.

- [ ] **Step 8: Commit**

```bash
git add packages/crawler-core/src
git commit -m "refactor(crawler): every extractor reports observedPerformers instead of deciding"
```

---

### Task 3: The precedence ladder

**Files:**
- Create: `packages/crawler-core/src/lib/derive-artists.ts`
- Create: `packages/crawler-core/src/lib/derive-artists.test.ts`

**Interfaces:**
- Consumes: `NormalizedEvent` with `observedPerformers` (Tasks 1-2).
- Produces:

```ts
export interface DerivedArtists {
  headliners: string[]
  supportingArtists: string[]
  isConcert: boolean
  /** True when an LLM call was made — the caller records cost against this. */
  adjudicated: boolean
}

export type Adjudicator = (input: {
  title: string
  description: string | undefined
}) => Promise<{
  isConcert: boolean
  headliners: string[]
  supportingArtists: string[]
}>

export function isSuspiciousObservation(
  observed: string,
  title: string,
): boolean

export async function deriveArtists(
  event: Pick<
    NormalizedEvent,
    'title' | 'rawTitle' | 'description' | 'observedPerformers'
  >,
  adjudicate: Adjudicator,
): Promise<DerivedArtists>
```

- [ ] **Step 1: Write the failing ladder tests**

Create `packages/crawler-core/src/lib/derive-artists.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest'
import { deriveArtists, isSuspiciousObservation } from './derive-artists.js'

const neverCalled = vi.fn(() => {
  throw new Error('adjudicator must not be called')
})

const base = { rawTitle: '', description: undefined }

describe('ladder step 1 — observed performers win', () => {
  it('takes the headliner and supporting acts without an LLM call', async () => {
    const result = await deriveArtists(
      {
        ...base,
        title: 'Thee Sacred Souls at the Ogden',
        observedPerformers: ['Thee Sacred Souls', 'LA LOM'],
      },
      neverCalled,
    )

    expect(result).toEqual({
      headliners: ['Thee Sacred Souls'],
      supportingArtists: ['LA LOM'],
      isConcert: true,
      adjudicated: false,
    })
  })
})

describe('ladder step 2 — escalation', () => {
  it('escalates when nobody was named', async () => {
    const adjudicate = vi.fn().mockResolvedValue({
      isConcert: true,
      headliners: ['Daedelus'],
      supportingArtists: [],
    })

    const result = await deriveArtists(
      {
        ...base,
        title: '@adsfradio presents: Daedelus',
        observedPerformers: [],
      },
      adjudicate,
    )

    expect(adjudicate).toHaveBeenCalledOnce()
    expect(result.headliners).toEqual(['Daedelus'])
    expect(result.adjudicated).toBe(true)
  })

  it('escalates when the observed performer is just the title', async () => {
    const adjudicate = vi.fn().mockResolvedValue({
      isConcert: true,
      headliners: ['Daedelus'],
      supportingArtists: [],
    })

    await deriveArtists(
      {
        ...base,
        title: '@adsfradio presents: Daedelus',
        observedPerformers: ['@adsfradio presents: Daedelus'],
      },
      adjudicate,
    )

    expect(adjudicate).toHaveBeenCalledOnce()
  })
})

describe('ladder step 3 — no performer is a real answer', () => {
  it('resolves to an empty headliner list and a non-concert', async () => {
    const adjudicate = vi.fn().mockResolvedValue({
      isConcert: false,
      headliners: [],
      supportingArtists: [],
    })

    const result = await deriveArtists(
      { ...base, title: 'HUMP! Film Festival', observedPerformers: [] },
      adjudicate,
    )

    expect(result).toEqual({
      headliners: [],
      supportingArtists: [],
      isConcert: false,
      adjudicated: true,
    })
  })

  it('never falls back to the title when the adjudicator returns nothing', async () => {
    const adjudicate = vi.fn().mockResolvedValue({
      isConcert: true,
      headliners: [],
      supportingArtists: [],
    })

    const result = await deriveArtists(
      { ...base, title: 'Bass Package', observedPerformers: [] },
      adjudicate,
    )

    expect(result.headliners).toEqual([])
  })

  it('treats an adjudicator failure as unresolved rather than as the title', async () => {
    const adjudicate = vi.fn().mockRejectedValue(new Error('haiku 529'))

    const result = await deriveArtists(
      { ...base, title: '80s Bash', observedPerformers: [] },
      adjudicate,
    )

    expect(result).toEqual({
      headliners: [],
      supportingArtists: [],
      isConcert: true,
      adjudicated: false,
    })
  })
})

describe('isSuspiciousObservation', () => {
  const suspicious: [string, string][] = [
    ['80s Bash', '80s Bash'],
    ['@adsfradio presents: Daedelus', '@adsfradio presents: Daedelus'],
    ['303 Boards Benefit Show', '303 Boards Benefit Show'],
    ['A Great Night in Hip Hop', 'A Great Night in Hip Hop'],
  ]
  it.each(suspicious)('flags %s', (observed, title) => {
    expect(isSuspiciousObservation(observed, title)).toBe(true)
  })

  // Real band names that must NOT be escalated — escalating them would spend
  // an LLM call and risk the model second-guessing correct venue data.
  const clean: [string, string][] = [
    ['Goodnight, Texas', 'Goodnight, Texas at Globe Hall'],
    ['hey, nothing', 'hey, nothing — Denver'],
    ['Crosby, Stills & Nash', 'Crosby, Stills & Nash'],
    ['Earth, Wind & Fire', 'Earth, Wind & Fire at Red Rocks'],
    ['blink-182', 'blink-182 at Ball Arena'],
    ['311', '311 at Red Rocks'],
  ]
  it.each(clean)('does not flag %s', (observed, title) => {
    expect(isSuspiciousObservation(observed, title)).toBe(false)
  })
})
```

Note the `Crosby, Stills & Nash` case: it is flagged clean because the observed
performer does NOT equal the title and contains no event word. The leading-digit
rule must not fire on `311` — it applies only when the observation equals the
title AND the title carries an event word, which is why `311 at Red Rocks`
passes.

- [ ] **Step 2: Run to confirm failure**

Run: `pnpm --filter @concert-crawl/crawler-core test derive-artists`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the ladder**

Create `packages/crawler-core/src/lib/derive-artists.ts`:

```ts
import type { NormalizedEvent } from '../types.js'
import { reportFailure } from './report-failure.js'

export interface DerivedArtists {
  headliners: string[]
  supportingArtists: string[]
  isConcert: boolean
  adjudicated: boolean
}

export type Adjudicator = (input: {
  title: string
  description: string | undefined
}) => Promise<{
  isConcert: boolean
  headliners: string[]
  supportingArtists: string[]
}>

// Words that mark a title as describing the EVENT rather than naming an act.
// Deliberately conservative: a false positive here costs one LLM call, but a
// false negative leaves a title in the artists projection.
const EVENT_WORDS = [
  'presents',
  'benefit',
  'festival',
  'bash',
  'party',
  'night',
  'showcase',
  'tribute',
  'karaoke',
  'bingo',
  'trivia',
  'open mic',
  'dj set',
  'brunch',
  'market',
]

export function isSuspiciousObservation(
  observed: string,
  title: string,
): boolean {
  // A performer field that merely echoes the title carries no information —
  // it is the shape every title-as-artist bug takes.
  if (observed.trim().toLowerCase() !== title.trim().toLowerCase()) return false

  const lowered = observed.toLowerCase()
  if (observed.includes(':')) return true
  if (EVENT_WORDS.some((word) => lowered.includes(word))) return true
  return false
}

export async function deriveArtists(
  event: Pick<
    NormalizedEvent,
    'title' | 'rawTitle' | 'description' | 'observedPerformers'
  >,
  adjudicate: Adjudicator,
): Promise<DerivedArtists> {
  const observed = event.observedPerformers.filter(
    (name) => name.trim().length > 0,
  )
  const headliner = observed[0]

  // Step 1 — the source named somebody, and it does not merely echo the title.
  // This is the venue's own structured field; an LLM re-reading the page title
  // is strictly downstream of it.
  if (headliner !== undefined && !isSuspiciousObservation(headliner, event.title)) {
    return {
      headliners: [headliner],
      supportingArtists: observed.slice(1),
      isConcert: true,
      adjudicated: false,
    }
  }

  // Step 2 — no signal, or the signal is the title wearing a performer's hat.
  try {
    const verdict = await adjudicate({
      title: event.title,
      description: event.description,
    })
    return {
      headliners: verdict.headliners,
      supportingArtists: verdict.supportingArtists,
      isConcert: verdict.isConcert,
      adjudicated: true,
    }
  } catch (err) {
    // Step 3 — an adjudicator outage must not become a wrong answer. Leave the
    // headliners empty (the backfill simply does not project this event) and
    // leave `isConcert` true so a transient Haiku failure never hides a real
    // show from the calendar. The next crawl retries.
    reportFailure({
      event: 'derive-artists.adjudicator_failed',
      severity: 'warn',
      title: event.title,
      error: err instanceof Error ? err.message : String(err),
    })
    return {
      headliners: [],
      supportingArtists: [],
      isConcert: true,
      adjudicated: false,
    }
  }
}
```

Check `reportFailure`'s actual exported path and payload shape in
`packages/crawler-core/src/lib/` before importing — match its existing call
sites (e.g. `json-ld.ts`'s `json-ld.invalid_start_date`).

- [ ] **Step 4: Run the tests**

Run: `pnpm --filter @concert-crawl/crawler-core test derive-artists`
Expected: PASS, all cases.

- [ ] **Step 5: Commit**

```bash
git add packages/crawler-core/src/lib/derive-artists.ts packages/crawler-core/src/lib/derive-artists.test.ts
git commit -m "feat(crawler): add the artist derivation precedence ladder"
```

---

### Task 4: Wire the ladder into the crawl

**Files:**
- Modify: `packages/crawler-core/src/crawl.ts` (between extraction and the event write at ~1020)
- Modify: `packages/crawler-core/src/lib/extractors/llm.ts` (export the adjudicator)

**Interfaces:**
- Consumes: `deriveArtists`, `Adjudicator` from Task 3.
- Produces: every event reaching the write has `headliners`, `supportingArtists`
  and `isConcert` set by the ladder.

- [ ] **Step 1: Export an adjudicator from the LLM extractor**

The prompt at `llm.ts:144-185` already carries every rule the adjudicator needs
(headliner-only, run-on splitting, the comma false-positive protections, the
null-when-no-performer instruction). Extract a single-event entry point that
reuses it:

```ts
export const adjudicateEvent: Adjudicator = async ({ title, description }) => {
  // Reuses the extraction prompt's artist rules against one listing rather
  // than a page. Same rules, same tool schema, one event in and one out.
  ...
}
```

Keep the prompt text in one place — if the single-event call needs different
framing, factor the shared rules into an exported constant rather than copying
them. Two copies of these rules is how one of them goes stale.

- [ ] **Step 2: Write the failing integration test**

Add to `packages/crawler-core/src/crawl-artists.integration.test.ts` a case
proving a listing with no performer stores empty headliners and does not
project an artist row:

```ts
it('stores no headliners and projects no artist for a listing that names nobody', async () => {
  // Arrange a crawl whose extractor yields observedPerformers: [] and whose
  // adjudicator returns { isConcert: false, headliners: [], supportingArtists: [] }
  // Assert: events.canonical_headliners is empty, hidden_from_consumer is true,
  // and the artists table gained no row for the title.
})
```

Fill this in against the file's existing harness — it already builds
`ExtractedEvent` fixtures and drives a real DB.

- [ ] **Step 3: Run it to confirm failure**

Run: `pnpm --filter @concert-crawl/crawler-core test crawl-artists`
Expected: FAIL — an artist row is created from the title.

- [ ] **Step 4: Call the ladder in `crawl.ts`**

After extraction and before the event mapping block (search for
`hiddenFromConsumer: event.isConcert === false`), map each event through
`deriveArtists(evt, adjudicateEvent)` and set `headliners`, `supportingArtists`
and `isConcert` from the result. Leave `evt.artist` untouched. Leave the
projection filter (search for `evt.isConcert !== false`) exactly as it is — see
Global Constraints.

- [ ] **Step 5: Run the full suite**

Run: `pnpm --filter @concert-crawl/crawler-core test && pnpm --filter @concert-crawl/crawler-core typecheck`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/crawler-core/src
git commit -m "feat(crawler): derive artists through the ladder on every extraction path"
```

---

### Task 5: `backfillArtists` reads headliners first

**Files:**
- Modify: `packages/db/src/scripts/backfill-artists.ts:47+`
- Modify: `packages/db/src/scripts/backfill-artists.integration.test.ts`

**Interfaces:**
- Consumes: `events.canonical_headliners` populated by Task 4.
- Produces: an `artists` projection with co-headliners split — this is #1203.

- [ ] **Step 1: Write the failing integration test**

Assert that an event with `canonical_headliners = ['thee sacred souls', 'la lom', 'the womack sisters']`
produces THREE artist rows, and that an event with `canonical_headliners = '{}'`
produces none even though `canonical_artist` is set.

- [ ] **Step 2: Run to confirm failure**

Run: `pnpm --filter @concert-crawl/db build && pnpm --filter @concert-crawl/db test backfill-artists`
Expected: FAIL — one row from `canonical_artist`.

- [ ] **Step 3: Change the CTE**

In the `names` CTE, replace the `canonical_artist` branch with an unnest of
`canonical_headliners`, falling back to `canonical_artist` ONLY when
`canonical_headliners IS NULL` (not when it is empty — an empty array is the
ladder's deliberate "no artist" answer and must not fall back):

```sql
SELECT headliner.value AS canonical_name, headliner.value AS display_name
FROM events
CROSS JOIN LATERAL unnest(canonical_headliners) AS headliner(value)
WHERE canonical_headliners IS NOT NULL
  AND hidden_from_consumer = false
UNION ALL
SELECT canonical_artist AS canonical_name, artist AS display_name
FROM events
WHERE canonical_headliners IS NULL
  AND canonical_artist IS NOT NULL AND canonical_artist <> ''
  AND hidden_from_consumer = false
UNION ALL
-- supporting branch unchanged
```

The `IS NULL` vs empty distinction is the whole correctness of this task. Write
a comment saying so.

- [ ] **Step 4: Run the tests**

Run: `pnpm --filter @concert-crawl/db build && pnpm --filter @concert-crawl/db test backfill-artists`
Expected: PASS

- [ ] **Step 5: Run the API integration suite against the rebuilt package**

Run: `pnpm --filter @concert-crawl/db build && pnpm --filter @concert-crawl/api test`
Expected: PASS

- [ ] **Step 6: Commit and open PR 1**

```bash
git add packages/db/src
git commit -m "feat(artists): project co-headliners from canonical_headliners (#1203)"
git push -u origin feat/artist-derivation-funnel
```

Open the PR, then run `./scripts/request-copilot-review.sh <n>`.

---

## Phase 2 — The re-derivation pass (PR 2)

### Task 6: The one-off script

**Files:**
- Create: `packages/db/src/scripts/rederive-event-artists.ts`
- Create: `packages/db/src/scripts/rederive-event-artists.integration.test.ts`

**Interfaces:**
- Consumes: `deriveArtists` (Task 3), `backfillArtists` (Task 5).
- Produces: a CLI mirroring `prune-artists.ts` and `musicbrainz-disambiguate.ts`
  — dry-run by default, `--apply` to write, idempotent, re-runnable.

- [ ] **Step 1: Read the two scripts this one mirrors**

Read `packages/db/src/scripts/prune-artists.ts` and
`packages/db/src/scripts/musicbrainz-disambiguate.ts` end to end. Match their
CLI shape, their dry-run reporting, and their env handling
(`NEON_PROD_DIRECT` exists in `apps/api/.env.local`). Do not invent a new CLI
convention.

- [ ] **Step 2: Write the failing integration test**

Cases, against the real test DB:

- An event with a genuine performer keeps its headliners and stays visible.
- An event whose stored `artist` equals its `title` and which the stubbed
  adjudicator calls a non-concert gets `canonical_headliners = '{}'`,
  `is_concert = false`, `hidden_from_consumer = true`.
- `events.artist` and `canonical_artist` are byte-identical before and after.
  **This is the safety assertion of the whole phase** — assert it explicitly.
- Running the script twice produces the same rows (idempotence).
- Dry-run mode writes nothing.

- [ ] **Step 3: Run to confirm failure**

Run: `pnpm --filter @concert-crawl/db test rederive-event-artists`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement**

Select every event. For each, build the `deriveArtists()` input from stored
columns — `observedPerformers` is `[]` when `artist === title`, otherwise
`[artist]` — then write `canonical_headliners`, `canonical_supporting`,
`is_concert`, and `hidden_from_consumer = true` only when `isConcert === false`.
Never clear an admin's manual hide: `hidden_from_consumer` is only ever set to
`true` here, never to `false`.

Rate-limit the adjudicator and log a per-strategy tally in the dry-run report so
the run is auditable the way the disambiguator's was.

- [ ] **Step 5: Run the tests**

Run: `pnpm --filter @concert-crawl/db build && pnpm --filter @concert-crawl/db test rederive-event-artists`
Expected: PASS

- [ ] **Step 6: Commit and open PR 2**

```bash
git add packages/db/src/scripts
git commit -m "feat(artists): add the one-off event artist re-derivation pass"
```

- [ ] **Step 7: Dry-run against prod, then apply — in this exact order**

After PR 2 merges:

1. `pnpm --filter @concert-crawl/types --filter @concert-crawl/db build`
2. Dry-run `rederive-event-artists` against `NEON_PROD_DIRECT`. Record the tally.
3. `--apply`.
4. Run `backfillArtists` against prod.
5. Dry-run `prune-artists` with its `BILLED_IN_LIVE_TITLE` guard **unchanged**.
   Record what it would delete. Do not narrow the guard.
6. `--apply` the reap.

Reaping before the backfill deletes rows the split is about to legitimise. The
order is not negotiable.

---

## Phase 3 — The admin surface (PR 3)

Independent of Phases 1 and 2; may be built in parallel on its own branch.

### Task 7: The `not_an_artist` state

**Files:**
- Create: `packages/db/migrations/XXXX_artist_not_an_artist.sql`
- Modify: `packages/db/src/schema/artists.ts:39-44`
- Modify: `packages/db/src/scripts/backfill-artists.ts`
- Modify: `packages/db/src/scripts/prune-artists.ts`

**Interfaces:**
- Produces: a fifth `artistMatchStatusEnum` value that survives both a backfill
  and a reap.

- [ ] **Step 1: Write the migration**

```sql
ALTER TYPE artist_match_status ADD VALUE IF NOT EXISTS 'not_an_artist';
```

Set the `when` timestamp in the journal above every prior entry — Drizzle sorts
by timestamp, and a lower value silently never runs.

- [ ] **Step 2: Add the enum value with its rationale**

In `packages/db/src/schema/artists.ts`, append to the enum:

```ts
  'not_an_artist', // a human confirmed there is no act here to match
```

and extend the enum's doc comment to say the first four answer "how confident
is the Spotify match?" while this one answers "there is nothing here to match."

- [ ] **Step 3: Write the failing stickiness tests**

- `backfillArtists` re-run leaves an existing `not_an_artist` row at
  `not_an_artist`, not `unmatched`.
- `prune-artists` does not delete a `not_an_artist` row even when unreferenced.

- [ ] **Step 4: Run to confirm failure**

Run: `pnpm --filter @concert-crawl/db build && pnpm --filter @concert-crawl/db test`
Expected: FAIL on both.

- [ ] **Step 5: Implement**

`backfillArtists`'s insert is already conflict-do-nothing, so verify rather than
assume the first case fails. For the reaper, add `not_an_artist` to its exclusion
set with a comment: deleting the tombstone lets the next backfill recreate the
row as `unmatched`, straight back into the queue.

- [ ] **Step 6: Run the tests, then commit**

Run: `pnpm --filter @concert-crawl/db build && pnpm --filter @concert-crawl/db test`

```bash
git add packages/db
git commit -m "feat(artists): add a not_an_artist tombstone state"
```

---

### Task 8: One admin table with counts, search and pagination

**Files:**
- Modify: `apps/api/src/routes/admin/artists.ts:73-104`
- Modify: `apps/web/src/app/(protected)/admin/artists/page.tsx:76`
- Create: `apps/web/src/app/(protected)/admin/artists/definitions/copy.ts`
- Create: `apps/web/src/app/(protected)/admin/artists/definitions/constants.ts`

**Interfaces:**
- Consumes: `GET /v1/admin/artists?search=&status=&limit=&offset=` and
  `GET /v1/admin/artists/counts` — **both already exist**. Read
  `apps/api/src/routes/admin/artists.ts` before writing any API code; the only
  API change needed is accepting `not_an_artist` in the status Zod enum and in
  the counts response.

- [ ] **Step 1: Confirm what the API already does**

Run: `pnpm --filter @concert-crawl/api test admin/artists`
Read the route file. Confirm `?search=` and `/counts` behave as the spec claims.
If they do, this task is front-end plus one Zod enum widening.

- [ ] **Step 2: Widen the API status enum and counts**

Add `not_an_artist` to the route's Zod status enum and to the `/counts`
aggregation. Add an API test asserting a `not_an_artist` row is filterable and
counted.

- [ ] **Step 3: Replace the four tabs with one table**

In `page.tsx`: one table; status chips reading live counts from `/counts`;
default filter `ambiguous`; a search box that queries across ALL statuses
regardless of the active chip; offset pagination using the existing
`limit`/`offset` params. All strings go in the new `definitions/copy.ts` per the
definitions convention (admin copy is exempt from the copy-review bar, not from
this convention).

- [ ] **Step 4: Add a "not an artist" action to the row**

One button, calling the existing `PATCH /:id` with
`{ matchStatus: 'not_an_artist' }`. Not a workflow — the spec's sizing note is
explicit that this is the residue handler.

- [ ] **Step 5: Run web tests, typecheck and lint**

Run: `pnpm --filter @concert-crawl/web test && pnpm typecheck && pnpm lint`
Expected: PASS

- [ ] **Step 6: Commit and open PR 3**

```bash
git add apps/api/src apps/web/src
git commit -m "feat(admin): consolidate artists into one searchable, counted table"
```

---

## Phase 4 — The Browse shelf (PR 4)

Independent; may be built in parallel.

### Task 9: Link the shelf card to the event

**Files:**
- Modify: `apps/web/src/components/consumer/following/definitions/types.ts:8-35`
- Modify: `apps/web/src/components/consumer/following/ShelfCard.tsx:237-249`
- Modify: the server component that flattens `FollowedArtist` / `ArtistSuggestion`
  into `ShelfArtist` (find it by grepping for `dateLine:` — the flattener is
  the only place that field is constructed)

**Interfaces:**
- Consumes: `FollowedArtistNextShow.eventId` from
  `packages/types/src/artist.ts:111-126` — **already on the wire**, no API change.
- Produces: `ShelfArtist.eventId: string | null`.

- [ ] **Step 1: Write the failing component tests**

Three cases, one per precedence branch:

```tsx
it('links to the event when a next show is known', () => {
  // eventId: 'evt-1', slug: 'thee-sacred-souls'
  // expect the anchor href to be '/events/evt-1'
})

it('falls back to the artist page when there is no next show', () => {
  // eventId: null, slug: 'thee-sacred-souls'
  // expect '/artists/thee-sacred-souls'
})

it('renders inert when neither is known', () => {
  // eventId: null, slug: null
  // expect no anchor
})
```

- [ ] **Step 2: Run to confirm failure**

Run: `pnpm --filter @concert-crawl/web test ShelfCard`
Expected: FAIL — the first case renders `/artists/...`.

- [ ] **Step 3: Add `eventId` to `ShelfArtist`**

```ts
  /**
   * The show `dateLine` describes. The card links HERE first: a card about a
   * night the viewer can buy tickets to should open that night, not a profile.
   * Null when nothing is on the books, which is also when `dateLine` is null.
   */
  eventId: string | null
```

- [ ] **Step 4: Thread it through the flattener**

`FollowedArtistNextShow` already carries `eventId`; the flattener currently
drops it while building `dateLine`. Pass it through. No API change.

- [ ] **Step 5: Change the link precedence in `ShelfCard.tsx`**

Replace the two-branch conditional at 237-249 with three branches: `eventId` →
`/events/${eventId}`, else `slug` → `/artists/${slug}`, else `<span>`. Keep
`shellClass` and `shellStyle` shared across all three exactly as they are now.

- [ ] **Step 6: Check the Spotify taste card**

`ShelfCard`'s header comment states it is kept in lockstep with
`spotify/DiscoveryShelf.tsx`'s `TastePickCard` because they share one slot on
Browse. Read that component. If it links to `/artists/...` on the same data,
apply the same precedence there in this PR. If it has no event to link to,
record that in the PR body — do not leave the question unanswered.

- [ ] **Step 7: Run tests, typecheck, lint**

Run: `pnpm --filter @concert-crawl/web test && pnpm typecheck && pnpm lint`
Expected: PASS

- [ ] **Step 8: Commit and open PR 4**

```bash
git add apps/web/src
git commit -m "fix(following): link shelf cards to the show, not the artist page"
```

---

## Self-review notes

**Spec coverage.** Section 1 → Tasks 1-5. Section 2 → Task 6. Section 3 →
Tasks 7-8. Section 4 → Task 9. The spec's "out of scope" list (reaper guard
narrowing, `canonicalizeArtist` changes, MBID storage, Spotify's role) has no
tasks by design.

**Known soft spots, flagged rather than hidden:**

- Task 2 Step 6's `genre-tagger.ts` change may cascade into that module's types.
  If it does, prefer skipping untagged rows over inventing an empty-string
  artist.
- Task 4 Step 1 requires judgement about how much of the LLM prompt to factor
  out. The rule is one copy of the artist rules, wherever they live.
- Task 9 Step 3 assumes `eventId` is null exactly when `dateLine` is null.
  Verify against the flattener rather than trusting this sentence.

**Release notes:** Phase 4 is a user-visible fix and Phase 2 changes what shows
on the calendar. Add a `releases.ts` entry on the Phase 4 branch and route its
copy through the `copy-review` skill. Phases 1 and 3 are invisible to customers
— no entry.

**progress.md:** add one ✅ row when Phase 2 applies to prod. The other phases
do not clear the substantive bar on their own.
