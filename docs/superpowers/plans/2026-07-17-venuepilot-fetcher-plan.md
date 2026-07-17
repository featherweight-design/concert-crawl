# VenuePilot API Fetcher Implementation Plan (#505)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a venue has `apiProvider = 'venuepilot'` and `apiAccountId` set, pull events directly from the VenuePilot GraphQL API through the existing PlatformFetcher registry, bypassing the HTML → JSON-LD → LLM cascade.

**Architecture:** VenuePilot slots into the `PlatformFetcher` registry (#623) as a sibling adapter to AEG, keyed off `venues.api_provider` instead of `venues.platform`. `dispatch()` is generalized from platform-equality matching to per-fetcher `canHandle()`. The `PlatformFetcher.platform` field (typed `VenuePlatform`) is renamed to `source` (typed `'aeg' | 'venuepilot'`) because VenuePilot is an `apiProvider`, not a "platform". No schema change — the `venues.api_provider` / `venues.api_account_id` columns already exist (added by migration `packages/db/migrations/0049_admin_venue_api_provider.sql`), along with the admin UI to set them.

**Tech Stack:** TypeScript (strict, `exactOptionalPropertyTypes: true`), Zod, Vitest, pnpm + Turborepo. All work in `packages/crawler-core`.

**Spec:** `docs/superpowers/specs/2026-07-17-venuepilot-fetcher-design.md`

## Global Constraints

- **No `as` casts in production code** — use Zod `safeParse` at the API boundary, type guards for narrowing. This ban applies to the adapter/dispatch source only; test files may mirror the existing `as Venue` fixture-builder pattern from sibling test files (`aeg.test.ts`, `dispatch.test.ts`), which is pre-existing test-harness convention.
- **`exactOptionalPropertyTypes: true`** — never pass `field: undefined` for an optional property; conditionally spread instead (`...(x !== undefined ? { x } : {})`).
- **No silent LLM fallback** — a VenuePilot fetch error must bubble to `crawlVenue`'s outer catch (treated as a crawl failure), never fall through to the cascade.
- **Honest User-Agent** — `ConcertCrawl/1.0 (+https://concertcrawl.app/bot)` on every outbound request.
- **Respect `crawlDelayMs`** — wait before each request, including between pages.
- **robots.txt** — the fetcher checks `robots.txt` for its own endpoint domain (`www.venuepilot.co`) via the existing cached `isAllowed()` helper (`lib/robots.ts`) before any GraphQL request; an explicit `Disallow` → `VenuePilotFetchError`. This is in addition to `crawlVenue`'s existing check of `venue.websiteUrl` before `dispatch()` (crawl.ts:206, untouched). The helper caches per domain (one fetch per run) and fails open, so the happy path is unaffected — today `https://www.venuepilot.co/robots.txt` returns `User-agent: *` / `Allow: /`, so the gate is a no-op until VenuePilot tightens their policy. AEG's blob endpoint lacks this gate today (and uses a flat, un-jittered crawl delay); follow-up #985 backfills both the robots gate and the ±500ms jitter into AEG (AEG untouched here). (See the spec's "robots.txt stance" note.)
- **Conventional commits**, one commit per task. TDD: failing test first.
- **No schema/migration, no API/UI, no AEG migration** — crawler-only.

## VenuePilot contract (verified live 2026-07-17, account 1105)

- **Endpoint:** `POST https://www.venuepilot.co/graphql` — public, no auth.
- **Query variable:** `$args: EventsApiArguments!` → `paginatedEvents(arguments: $args)`.
  - `accountIds: [Int!]` (e.g. `[1105]`), `startDate: String` (`"YYYY-MM-DD"`), `page: Int` (1-based; default page size 100, no `perPage`).
- **Response:** `data.paginatedEvents.collection: Event[]`, `data.paginatedEvents.metadata: { totalCount, totalPages, currentPage, limitValue }`.
- Account 1105 today: `totalCount: 38, totalPages: 1`. Event fields used: `id` (Int), `name` (String, may carry trailing whitespace), `date` (`"YYYY-MM-DD"`), `doorTime`/`startTime` (`"HH:MM:SS"`), `description` (HTML), `ticketsUrl` (String), `status` (String), `announceArtists: [{ name }]` (can be empty), `announceImages: [{ highlighted: Bool, variants: [{ variant, src }] }]` (`variant ∈ { cover, cover_small, thumb }`).

## File Structure

- **Create** `packages/crawler-core/src/lib/fetchers/venuepilot.ts` — the VenuePilot adapter (Zod schema, error classes, `normalize`, `fetch`, `venuePilotFetcher` export). Mirrors `aeg.ts`.
- **Create** `packages/crawler-core/src/lib/fetchers/__fixtures__/venuepilot-levitt.json` — captured real GraphQL response body for account 1105.
- **Create** `packages/crawler-core/src/lib/fetchers/venuepilot.test.ts` — unit tests against the fixture.
- **Modify** `packages/crawler-core/src/lib/fetchers/index.ts` — rename `PlatformFetcher.platform: VenuePlatform` → `source: 'aeg' | 'venuepilot'`; export `venuePilotFetcher`.
- **Modify** `packages/crawler-core/src/lib/fetchers/aeg.ts` — `platform: 'aeg'` → `source: 'aeg'` on the exported fetcher.
- **Modify** `packages/crawler-core/src/lib/fetchers/dispatch.ts` — generalize to `canHandle`-based matching; register `venuePilotFetcher`.
- **Modify** `packages/crawler-core/src/lib/fetchers/dispatch.test.ts` — update `.platform` assertions → `.source`; add VenuePilot routing cases.
- **Modify** `packages/crawler-core/src/lib/fetchers/aeg.test.ts` — update the one `fetcher?.platform` reference if present (none today; `canHandle`/`fetch` only — verify).
- **Modify** `packages/crawler-core/src/crawl.ts` — `platformFetcher.platform` → `.source`; widen local `strategy` type; rename the `crawl.platform_fetch` log key `platform` → `source`.

**Task order matters:** Task 1 renames the registry interface (`platform` → `source`) and fixes every existing consumer so the tree stays green. Task 2 adds the VenuePilot adapter against that interface. Task 3 wires it into dispatch. This keeps each task independently green and reviewable.

---

### Task 1: Rename `PlatformFetcher.platform` → `source` across the registry

**Files:**
- Modify: `packages/crawler-core/src/lib/fetchers/index.ts`
- Modify: `packages/crawler-core/src/lib/fetchers/aeg.ts:377-386`
- Modify: `packages/crawler-core/src/crawl.ts:264,278,298`
- Modify: `packages/crawler-core/src/lib/fetchers/dispatch.test.ts:30`

**Interfaces:**
- Produces: `PlatformFetcher.source: 'aeg' | 'venuepilot'` (was `platform: VenuePlatform`). `PlatformFetchResult` unchanged. `dispatch()` signature unchanged.

- [ ] **Step 1: Update the failing assertion in `dispatch.test.ts`**

In `packages/crawler-core/src/lib/fetchers/dispatch.test.ts`, change the AEG assertion from `.platform` to `.source`:

```typescript
  it('returns the AEG fetcher for an AEG-configured venue', () => {
    const fetcher = dispatch(
      makeVenue({ platform: 'aeg', platformVenueId: '2' }),
    )
    expect(fetcher).not.toBeNull()
    expect(fetcher?.source).toBe('aeg')
  })
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @concert-crawl/crawler-core test -- dispatch`
Expected: FAIL — `Property 'source' does not exist on type 'PlatformFetcher'` (type error) / assertion undefined.

- [ ] **Step 3: Rename the interface field in `index.ts`**

In `packages/crawler-core/src/lib/fetchers/index.ts`, replace the `platform` field on `PlatformFetcher`. The `VenuePlatform` import is no longer needed by the interface but is still re-exported for other consumers — keep the `export type { VenuePlatform }` line, drop the interface's use of it:

```typescript
export interface PlatformFetcher {
  /**
   * Identifies the fetcher for logging + the crawl_runs
   * `extraction_strategy_used` string (`platform:${source}`). VenuePilot
   * is an apiProvider, not a venues.platform value, so this is a
   * fetcher-local union rather than `VenuePlatform`.
   */
  readonly source: 'aeg' | 'venuepilot'
  /** Returns false if this fetcher can't handle the venue
   * (e.g. missing platformVenueId / apiAccountId). */
  canHandle(venue: Venue): boolean
  fetch(
    venue: Venue,
    opts: { crawlDelayMs: number; timeoutMs?: number },
  ): Promise<PlatformFetchResult>
}
```

- [ ] **Step 4: Update the AEG fetcher export in `aeg.ts`**

In `packages/crawler-core/src/lib/fetchers/aeg.ts`, change the exported fetcher's field:

```typescript
export const aegFetcher: PlatformFetcher = {
  source: 'aeg',
  canHandle(venue) {
    return Boolean(
      venue.platform === 'aeg' &&
      venue.platformVenueId &&
      venue.platformVenueId.length > 0,
    )
  },
  fetch: aegFetch,
}
```

- [ ] **Step 5: Update `crawl.ts` — strategy type, strategy value, log key**

In `packages/crawler-core/src/crawl.ts`, widen the local `ExtractionResult.strategy` union (it currently uses `` `platform:${VenuePlatform}` ``) and rename the two `platformFetcher.platform` reads:

```typescript
    type ExtractionResult = {
      normalizedEvents: NormalizedEvent[]
      strategy: 'structured_data' | 'llm' | `platform:${'aeg' | 'venuepilot'}`
      tokenUsage: TokenUsage | undefined
    }
```

In the `if (platformFetcher) {` branch, the strategy assignment:

```typescript
        strategy: `platform:${platformFetcher.source}`,
```

And the structured log — rename the `platform` key to `source`:

```typescript
      console.log(
        JSON.stringify({
          event: 'crawl.platform_fetch',
          venueId,
          source: platformFetcher.source,
          endpoint: platformResult.sourceUrl,
          eventsFound: platformResult.events.length,
          meta: platformResult.meta,
        }),
      )
```

If `VenuePlatform` is now unused in `crawl.ts`, remove it from that file's imports (check with the type-check in Step 6; leave other imports untouched).

- [ ] **Step 6: Run type-check + the dispatch/aeg tests to verify green**

Run: `pnpm --filter @concert-crawl/crawler-core typecheck && pnpm --filter @concert-crawl/crawler-core test -- fetchers`
Expected: PASS — no type errors, all existing AEG + dispatch tests green with the renamed field.

- [ ] **Step 7: Commit**

```bash
git add packages/crawler-core/src/lib/fetchers/index.ts packages/crawler-core/src/lib/fetchers/aeg.ts packages/crawler-core/src/lib/fetchers/dispatch.test.ts packages/crawler-core/src/crawl.ts
git commit -m "refactor(crawler): rename PlatformFetcher.platform to source"
```

---

### Task 2: VenuePilot adapter — Zod schema, errors, normalize, fetch

**Files:**
- Create: `packages/crawler-core/src/lib/fetchers/__fixtures__/venuepilot-levitt.json`
- Create: `packages/crawler-core/src/lib/fetchers/venuepilot.ts`
- Test: `packages/crawler-core/src/lib/fetchers/venuepilot.test.ts`

**Interfaces:**
- Consumes: `PlatformFetcher`, `PlatformFetchResult` from `./index.js`; `NormalizedEvent` from `../../types.js`; `stripDescriptionHtml` from `../strip-description-html.js`; `isAllowed` from `../robots.js`; `Venue` from `@concert-crawl/db`.
- Produces: `venuePilotFetcher: PlatformFetcher` (`source: 'venuepilot'`); `VenuePilotFetchError`, `VenuePilotSchemaError`; `type VenuePilotEvent`.

- [ ] **Step 1: Capture the fixture**

Save a real account-1105 GraphQL response body to the fixture path. Run from the worktree root:

```bash
curl -s -X POST https://www.venuepilot.co/graphql \
  -H 'Content-Type: application/json' \
  -H 'User-Agent: ConcertCrawl/1.0 (+https://concertcrawl.app/bot)' \
  -d '{"query":"query($args: EventsApiArguments!){ paginatedEvents(arguments: $args){ collection { id name date doorTime startTime description ticketsUrl status announceArtists { name } announceImages { highlighted variants { variant src } } } metadata { totalCount totalPages currentPage limitValue } } }","variables":{"args":{"accountIds":[1105],"startDate":"2026-07-01","page":1}}}' \
  | python3 -m json.tool > packages/crawler-core/src/lib/fetchers/__fixtures__/venuepilot-levitt.json
```

Verify it has `data.paginatedEvents.collection` (array) and `.metadata.totalPages === 1`. If the live account has changed and returns 0 events, hand-trim the committed AEG-style fixture instead — but the tests below assume at least one event with a non-empty `announceArtists`, at least one image, and an HTML `description`.

- [ ] **Step 2: Write the failing test file**

Create `packages/crawler-core/src/lib/fetchers/venuepilot.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'
import { isAllowed } from '../robots.js'
import {
  venuePilotFetcher,
  VenuePilotFetchError,
  VenuePilotSchemaError,
} from './venuepilot.js'
import type { Venue } from '@concert-crawl/db'

// Mock the robots helper so fetch tests don't issue a real robots.txt request
// (which would otherwise consume a fetch call and leak the module-level cache
// across tests). Defaults to allowed; gate tests override per-case.
vi.mock('../robots.js', () => ({
  isAllowed: vi.fn(async () => true),
}))
const isAllowedMock = vi.mocked(isAllowed)

const FIXTURES_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '__fixtures__',
)
function loadFixture(name: string): string {
  return readFileSync(path.join(FIXTURES_DIR, name), 'utf-8')
}
const LEVITT_FIXTURE = loadFixture('venuepilot-levitt.json')

function makeVenue(overrides: Partial<Venue> = {}): Venue {
  return {
    id: crypto.randomUUID(),
    name: 'Levitt Pavilion Denver',
    slug: 'levitt-pavilion-denver',
    websiteUrl: 'https://levittdenver.org/',
    city: 'Denver',
    timezone: 'America/Denver',
    active: true,
    verified: true,
    crawlMode: 'browser',
    crawlDelayMs: 0,
    platform: null,
    platformVenueId: null,
    apiProvider: 'venuepilot',
    apiAccountId: '1105',
    ...overrides,
  } as Venue
}

// Build a single-page GraphQL response body from an array of events.
function graphqlBody(
  events: unknown[],
  metadata: Record<string, unknown> = {},
): string {
  return JSON.stringify({
    data: {
      paginatedEvents: {
        collection: events,
        metadata: {
          totalCount: events.length,
          totalPages: 1,
          currentPage: 1,
          limitValue: 100,
          ...metadata,
        },
      },
    },
  })
}

describe('venuePilotFetcher.canHandle', () => {
  it('returns true for a venuepilot venue with an account id', () => {
    expect(venuePilotFetcher.canHandle(makeVenue())).toBe(true)
  })

  it('returns false when apiProvider is not venuepilot', () => {
    expect(
      venuePilotFetcher.canHandle(makeVenue({ apiProvider: null })),
    ).toBe(false)
  })

  it('returns false when apiAccountId is missing', () => {
    expect(
      venuePilotFetcher.canHandle(makeVenue({ apiAccountId: null })),
    ).toBe(false)
  })

  it('returns false when apiAccountId is empty', () => {
    expect(
      venuePilotFetcher.canHandle(makeVenue({ apiAccountId: '' })),
    ).toBe(false)
  })

  it('returns false when apiAccountId is whitespace-only', () => {
    expect(
      venuePilotFetcher.canHandle(makeVenue({ apiAccountId: '   ' })),
    ).toBe(false)
  })
})

describe('venuePilotFetcher.fetch', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch')
    isAllowedMock.mockResolvedValue(true)
  })
  afterEach(() => {
    fetchSpy.mockRestore()
  })

  function mockFetchOk(body: string): void {
    fetchSpy.mockResolvedValue(
      new Response(body, {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }) as Response,
    )
  }

  it('POSTs the GraphQL endpoint with accountIds + honest UA', async () => {
    mockFetchOk(LEVITT_FIXTURE)
    const result = await venuePilotFetcher.fetch(makeVenue(), {
      crawlDelayMs: 0,
    })

    expect(fetchSpy).toHaveBeenCalledOnce()
    const [calledUrl, init] = fetchSpy.mock.calls[0]!
    expect(String(calledUrl)).toBe('https://www.venuepilot.co/graphql')
    expect(init?.method).toBe('POST')
    const headers = new Headers(init?.headers)
    expect(headers.get('User-Agent')).toBe(
      'ConcertCrawl/1.0 (+https://concertcrawl.app/bot)',
    )
    const body = JSON.parse(String(init?.body))
    expect(body.variables.args.accountIds).toEqual([1105])
    expect(result.sourceUrl).toBe('https://www.venuepilot.co/graphql')
  })

  it('normalizes the Levitt fixture into NormalizedEvent rows', async () => {
    mockFetchOk(LEVITT_FIXTURE)
    const result = await venuePilotFetcher.fetch(makeVenue(), {
      crawlDelayMs: 0,
    })

    expect(result.events.length).toBeGreaterThan(0)
    const first = result.events[0]!
    expect(first.title).toBeTruthy()
    expect(first.rawTitle).toBe(first.title)
    expect(first.artist).toBeTruthy()
    expect(first.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(first.showTime).toMatch(/^\d{2}:\d{2}:\d{2}$/)
    expect(first.confidence).toBe(1.0)
    expect(first.sourceUrl).toBe('https://levittdenver.org/')
  })

  it('trims trailing whitespace on the title', async () => {
    mockFetchOk(
      graphqlBody([
        {
          id: 1,
          name: 'Trailing Space Show   ',
          date: '2026-08-01',
          doorTime: '18:00:00',
          startTime: '19:00:00',
          description: '',
          ticketsUrl: '',
          status: 'BUY TICKETS',
          announceArtists: [{ name: 'The Band' }],
          announceImages: [],
        },
      ]),
    )
    const result = await venuePilotFetcher.fetch(makeVenue(), {
      crawlDelayMs: 0,
    })
    expect(result.events[0]!.title).toBe('Trailing Space Show')
  })

  it('falls back to the title for artist when announceArtists is empty', async () => {
    mockFetchOk(
      graphqlBody([
        {
          id: 2,
          name: 'No Artist Listed',
          date: '2026-08-02',
          doorTime: '18:00:00',
          startTime: '19:00:00',
          description: '',
          ticketsUrl: '',
          status: 'FREE RSVP/UPGRADE',
          announceArtists: [],
          announceImages: [],
        },
      ]),
    )
    const result = await venuePilotFetcher.fetch(makeVenue(), {
      crawlDelayMs: 0,
    })
    expect(result.events[0]!.artist).toBe('No Artist Listed')
  })

  it('omits imageUrl when there are no images', async () => {
    mockFetchOk(
      graphqlBody([
        {
          id: 3,
          name: 'Imageless',
          date: '2026-08-03',
          doorTime: '18:00:00',
          startTime: '19:00:00',
          description: '',
          ticketsUrl: '',
          status: 'BUY TICKETS',
          announceArtists: [{ name: 'X' }],
          announceImages: [],
        },
      ]),
    )
    const result = await venuePilotFetcher.fetch(makeVenue(), {
      crawlDelayMs: 0,
    })
    expect(result.events[0]!.imageUrl).toBeUndefined()
  })

  it('picks the cover variant of the highlighted image', async () => {
    mockFetchOk(
      graphqlBody([
        {
          id: 4,
          name: 'Has Images',
          date: '2026-08-04',
          doorTime: '18:00:00',
          startTime: '19:00:00',
          description: '',
          ticketsUrl: '',
          status: 'BUY TICKETS',
          announceArtists: [{ name: 'Y' }],
          announceImages: [
            {
              highlighted: false,
              variants: [{ variant: 'thumb', src: 'https://x/thumb-a.png' }],
            },
            {
              highlighted: true,
              variants: [
                { variant: 'thumb', src: 'https://x/thumb-b.png' },
                { variant: 'cover', src: 'https://x/cover-b.png' },
              ],
            },
          ],
        },
      ]),
    )
    const result = await venuePilotFetcher.fetch(makeVenue(), {
      crawlDelayMs: 0,
    })
    expect(result.events[0]!.imageUrl).toBe('https://x/cover-b.png')
  })

  it('skips an event with a whitespace-only name', async () => {
    mockFetchOk(
      graphqlBody([
        {
          id: 5,
          name: '   ',
          date: '2026-08-05',
          doorTime: '18:00:00',
          startTime: '19:00:00',
          description: '',
          ticketsUrl: '',
          status: 'BUY TICKETS',
          announceArtists: [{ name: 'Z' }],
          announceImages: [],
        },
      ]),
    )
    const result = await venuePilotFetcher.fetch(makeVenue(), {
      crawlDelayMs: 0,
    })
    expect(result.events.length).toBe(0)
  })

  it('strips HTML — including VenuePilot <iframe-embed> — from the description', async () => {
    mockFetchOk(
      graphqlBody([
        {
          id: 6,
          name: 'HTML Desc',
          date: '2026-08-06',
          doorTime: '18:00:00',
          startTime: '19:00:00',
          // Real VenuePilot markup carries a custom <iframe-embed> element that
          // the shared stripDescriptionHtml() helper leaves intact (unknown tag).
          description:
            '<p style="text-align: center"><strong>Hello</strong> world</p>' +
            '<iframe-embed src="https://embed.example/x">fallback</iframe-embed>',
          ticketsUrl: '',
          status: 'BUY TICKETS',
          announceArtists: [{ name: 'Q' }],
          announceImages: [],
        },
      ]),
    )
    const result = await venuePilotFetcher.fetch(makeVenue(), {
      crawlDelayMs: 0,
    })
    expect(result.events[0]!.description).toBe('Hello world')
    expect(result.events[0]!.description).not.toContain('<')
    expect(result.events[0]!.description).not.toContain('iframe-embed')
  })

  it('passes an abort signal only when timeoutMs is set', async () => {
    fetchSpy.mockImplementation(
      async () =>
        new Response(LEVITT_FIXTURE, {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
    )
    const venue = makeVenue()

    await venuePilotFetcher.fetch(venue, { crawlDelayMs: 0, timeoutMs: 15_000 })
    expect(fetchSpy.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal)

    await venuePilotFetcher.fetch(venue, { crawlDelayMs: 0 })
    expect(fetchSpy.mock.calls[1]?.[1]?.signal).toBeUndefined()
  })

  it('throws VenuePilotFetchError on a non-200 response', async () => {
    fetchSpy.mockResolvedValue(
      new Response('nope', { status: 502 }) as Response,
    )
    await expect(
      venuePilotFetcher.fetch(makeVenue(), { crawlDelayMs: 0 }),
    ).rejects.toBeInstanceOf(VenuePilotFetchError)
  })

  it('throws VenuePilotFetchError when the body carries GraphQL errors on 200', async () => {
    fetchSpy.mockResolvedValue(
      new Response(
        JSON.stringify({ errors: [{ message: 'boom' }] }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ) as Response,
    )
    await expect(
      venuePilotFetcher.fetch(makeVenue(), { crawlDelayMs: 0 }),
    ).rejects.toBeInstanceOf(VenuePilotFetchError)
  })

  it('throws VenuePilotSchemaError when the response shape is wrong', async () => {
    mockFetchOk(JSON.stringify({ data: { paginatedEvents: { collection: 'not-an-array' } } }))
    await expect(
      venuePilotFetcher.fetch(makeVenue(), { crawlDelayMs: 0 }),
    ).rejects.toBeInstanceOf(VenuePilotSchemaError)
  })

  it('throws VenuePilotFetchError for a whitespace-only apiAccountId without fetching', async () => {
    mockFetchOk(LEVITT_FIXTURE)
    await expect(
      venuePilotFetcher.fetch(makeVenue({ apiAccountId: '   ' }), {
        crawlDelayMs: 0,
      }),
    ).rejects.toBeInstanceOf(VenuePilotFetchError)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('throws VenuePilotFetchError for a non-positive apiAccountId', async () => {
    mockFetchOk(LEVITT_FIXTURE)
    await expect(
      venuePilotFetcher.fetch(makeVenue({ apiAccountId: '0' }), {
        crawlDelayMs: 0,
      }),
    ).rejects.toBeInstanceOf(VenuePilotFetchError)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('throws VenuePilotFetchError and issues no GraphQL request when robots.txt disallows', async () => {
    isAllowedMock.mockResolvedValue(false)
    mockFetchOk(LEVITT_FIXTURE)
    await expect(
      venuePilotFetcher.fetch(makeVenue(), { crawlDelayMs: 0 }),
    ).rejects.toBeInstanceOf(VenuePilotFetchError)
    expect(isAllowedMock).toHaveBeenCalledWith(
      'https://www.venuepilot.co/graphql',
      'ConcertCrawl/1.0 (+https://concertcrawl.app/bot)',
    )
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('proceeds with the fetch when robots.txt allows', async () => {
    isAllowedMock.mockResolvedValue(true)
    mockFetchOk(LEVITT_FIXTURE)
    const result = await venuePilotFetcher.fetch(makeVenue(), {
      crawlDelayMs: 0,
    })
    expect(result.events.length).toBeGreaterThan(0)
    expect(fetchSpy).toHaveBeenCalledOnce()
  })

  it('loops pages up to metadata.totalPages and concatenates', async () => {
    const pageEvent = (id: number) => ({
      id,
      name: `Show ${id}`,
      date: '2026-08-07',
      doorTime: '18:00:00',
      startTime: '19:00:00',
      description: '',
      ticketsUrl: '',
      status: 'BUY TICKETS',
      announceArtists: [{ name: `A${id}` }],
      announceImages: [],
    })
    fetchSpy
      .mockResolvedValueOnce(
        new Response(graphqlBody([pageEvent(1)], { totalPages: 2, currentPage: 1 }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }) as Response,
      )
      .mockResolvedValueOnce(
        new Response(graphqlBody([pageEvent(2)], { totalPages: 2, currentPage: 2 }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }) as Response,
      )
    const result = await venuePilotFetcher.fetch(makeVenue(), {
      crawlDelayMs: 0,
    })
    expect(fetchSpy).toHaveBeenCalledTimes(2)
    expect(result.events.length).toBe(2)
    expect(result.meta?.pagesFetched).toBe(2)
  })

  it('caps pagination at MAX_PAGES against a runaway totalPages', async () => {
    fetchSpy.mockImplementation(
      async () =>
        new Response(
          graphqlBody(
            [
              {
                id: 1,
                name: 'Runaway',
                date: '2026-08-08',
                doorTime: '18:00:00',
                startTime: '19:00:00',
                description: '',
                ticketsUrl: '',
                status: 'BUY TICKETS',
                announceArtists: [{ name: 'R' }],
                announceImages: [],
              },
            ],
            { totalPages: 9999 },
          ),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
    )
    const result = await venuePilotFetcher.fetch(makeVenue(), {
      crawlDelayMs: 0,
    })
    expect(fetchSpy.mock.calls.length).toBeLessThanOrEqual(50)
    // Truncation must be visible in meta so operators can alert on partial fetches.
    expect(result.meta?.truncated).toBe(true)
    expect(result.meta?.totalPages).toBe(9999)
  })
})
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `pnpm --filter @concert-crawl/crawler-core test -- venuepilot`
Expected: FAIL — `Cannot find module './venuepilot.js'`.

- [ ] **Step 4: Write `venuepilot.ts`**

Create `packages/crawler-core/src/lib/fetchers/venuepilot.ts`:

```typescript
// VenuePilot GraphQL API adapter (#505).
//
// Fetches events directly from VenuePilot's public GraphQL endpoint,
// bypassing the HTML → JSON-LD → LLM cascade. Keyed off
// venues.api_provider = 'venuepilot' + venues.api_account_id (the
// venue's VenuePilot account id, e.g. Levitt Pavilion Denver = 1105).
//
// Contract verified live 2026-07-17 against account 1105:
//   POST https://www.venuepilot.co/graphql   (public, no auth)
//   paginatedEvents(arguments: { accountIds: [Int!], startDate, page })
// Default page size is 100 (metadata.limitValue); there is no perPage
// argument.

import { z } from 'zod'
import type { Venue } from '@concert-crawl/db'
import { createLogger } from '@concert-crawl/logger'
import type { NormalizedEvent } from '../../types.js'
import { stripDescriptionHtml } from '../strip-description-html.js'
import { isAllowed } from '../robots.js'
import type { PlatformFetcher, PlatformFetchResult } from './index.js'

const logger = createLogger('venuepilot-fetcher')
const USER_AGENT = 'ConcertCrawl/1.0 (+https://concertcrawl.app/bot)'
const ENDPOINT = 'https://www.venuepilot.co/graphql'
// Guard against a runaway metadata.totalPages pinning the crawl.
const MAX_PAGES = 50

// Jitter the crawl delay (±500ms) so paged requests don't hit VenuePilot on a
// bot-like fixed interval — mirrors the cascade fetcher (lib/fetcher.ts). AEG
// still uses a flat delay; #985 backfills jitter there too.
function jitter(ms: number): number {
  return Math.max(0, ms + Math.floor(Math.random() * 1000) - 500)
}

const EVENTS_QUERY = `query($args: EventsApiArguments!) {
  paginatedEvents(arguments: $args) {
    collection {
      id
      name
      date
      doorTime
      startTime
      description
      ticketsUrl
      status
      announceArtists { name }
      announceImages { highlighted variants { variant src } }
    }
    metadata { totalCount totalPages currentPage limitValue }
  }
}`

// Only the fields we map are required; `.passthrough()` tolerates the
// rest of VenuePilot's event shape. Nullable/optional where the live API
// omits values.
const VariantSchema = z
  .object({ variant: z.string(), src: z.string() })
  .passthrough()

const ImageSchema = z
  .object({
    highlighted: z.boolean().optional(),
    variants: z.array(VariantSchema).optional(),
  })
  .passthrough()

const VenuePilotEventSchema = z
  .object({
    id: z.number(),
    name: z.string(),
    date: z.string(),
    doorTime: z.string().nullable().optional(),
    startTime: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    ticketsUrl: z.string().nullable().optional(),
    status: z.string().nullable().optional(),
    announceArtists: z
      .array(z.object({ name: z.string() }).passthrough())
      .optional(),
    announceImages: z.array(ImageSchema).optional(),
  })
  .passthrough()

const ResponseSchema = z
  .object({
    data: z.object({
      paginatedEvents: z.object({
        collection: z.array(VenuePilotEventSchema),
        metadata: z
          .object({
            totalCount: z.number(),
            totalPages: z.number(),
            currentPage: z.number(),
            limitValue: z.number(),
          })
          .passthrough(),
      }),
    }),
  })
  .passthrough()

// GraphQL can return HTTP 200 with a top-level `errors` array and no
// `data`. This partial schema recognizes that shape so we can surface it
// as a fetch error rather than a schema error.
const GraphQLErrorsSchema = z.object({
  errors: z.array(z.object({ message: z.string() }).passthrough()).min(1),
})

export type VenuePilotEvent = z.infer<typeof VenuePilotEventSchema>

export class VenuePilotFetchError extends Error {
  constructor(
    public readonly httpStatus: number,
    public readonly url: string,
    message: string,
  ) {
    super(message)
    this.name = 'VenuePilotFetchError'
  }
}

export class VenuePilotSchemaError extends Error {
  constructor(
    public readonly url: string,
    public readonly issues: z.ZodIssue[],
    message: string,
  ) {
    super(message)
    this.name = 'VenuePilotSchemaError'
  }
}

// Today, in the venue's timezone, as "YYYY-MM-DD". Filters the query to
// upcoming shows only (VenuePilot returns past events without startDate).
function todayInTimezone(timezone: string): string {
  // en-CA formats as YYYY-MM-DD; timeZone shifts to the venue-local day.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

// Pick the display image: prefer the highlighted image, else the first
// image; from that image prefer the `cover` variant, else its first
// variant. Returns undefined when no usable src exists.
function pickImageUrl(
  images: VenuePilotEvent['announceImages'],
): string | undefined {
  if (!images || images.length === 0) return undefined
  const chosen = images.find((image) => image.highlighted) ?? images[0]
  const variants = chosen?.variants
  if (!variants || variants.length === 0) return undefined
  const cover = variants.find((variant) => variant.variant === 'cover')
  return (cover ?? variants[0])?.src
}

// VenuePilot descriptions embed a custom <iframe-embed> element. The shared
// stripDescriptionHtml() helper only strips KNOWN HTML tag names (it preserves
// unknown tags like <heart> to keep its round-trip idempotent, #844), so it
// would leave <iframe-embed> markup in the plain-text description. Remove the
// whole element here — its inner content is embed chrome, not prose — before
// handing the string to the shared stripper. Runs on the raw markup VenuePilot
// serves (real tags, not entity-encoded, per the live 1105 probe).
const IFRAME_EMBED_BLOCK = /<iframe-embed\b[^>]*>[\s\S]*?<\/iframe-embed>/gi
const IFRAME_EMBED_TAG = /<\/?iframe-embed\b[^>]*>/gi

function stripVenuePilotDescription(html: string | null | undefined): string {
  if (!html) return ''
  const withoutEmbeds = html
    .replace(IFRAME_EMBED_BLOCK, ' ')
    .replace(IFRAME_EMBED_TAG, ' ')
  return stripDescriptionHtml(withoutEmbeds)
}

function normalize(
  event: VenuePilotEvent,
  venueCalendarUrl: string,
): NormalizedEvent | null {
  const title = event.name.trim()
  if (!title) {
    logger.warn(
      { eventId: event.id, venueCalendarUrl },
      'venuepilot: skipping event with empty/whitespace-only name',
    )
    return null
  }

  const headliner = event.announceArtists?.[0]?.name?.trim()
  const artist = headliner && headliner.length > 0 ? headliner : title

  const showTime = event.startTime ?? undefined
  const doorsTime = event.doorTime ?? undefined
  const ticketUrl =
    event.ticketsUrl && event.ticketsUrl.length > 0
      ? event.ticketsUrl
      : undefined
  const imageUrl = pickImageUrl(event.announceImages)
  const cleaned = stripVenuePilotDescription(event.description)
  const description = cleaned.length > 0 ? cleaned : undefined

  return {
    title,
    // Mirror title into rawTitle — the API ships a clean headline with no
    // LLM-style decoration, keeping the cross-venue presale filter's input
    // contract uniform across extractors (#826).
    rawTitle: title,
    artist,
    date: event.date,
    ...(showTime !== undefined ? { showTime } : {}),
    ...(doorsTime !== undefined ? { doorsTime } : {}),
    ...(ticketUrl !== undefined ? { ticketUrl } : {}),
    ...(imageUrl !== undefined ? { imageUrl } : {}),
    ...(description !== undefined ? { description } : {}),
    sourceUrl: venueCalendarUrl,
    confidence: 1.0,
  }
}

async function fetchPage(
  accountId: number,
  startDate: string,
  page: number,
  timeoutMs?: number,
): Promise<z.infer<typeof ResponseSchema>['data']['paginatedEvents']> {
  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'User-Agent': USER_AGENT,
    },
    body: JSON.stringify({
      query: EVENTS_QUERY,
      variables: { args: { accountIds: [accountId], startDate, page } },
    }),
    ...(timeoutMs !== undefined
      ? { signal: AbortSignal.timeout(timeoutMs) }
      : {}),
  })
  if (!response.ok) {
    throw new VenuePilotFetchError(
      response.status,
      ENDPOINT,
      `VenuePilot fetch failed: HTTP ${response.status}`,
    )
  }
  const raw: unknown = await response.json()

  // GraphQL errors come back on HTTP 200 with a top-level `errors` array.
  const errorsResult = GraphQLErrorsSchema.safeParse(raw)
  if (errorsResult.success) {
    const first = errorsResult.data.errors[0]!.message
    throw new VenuePilotFetchError(
      200,
      ENDPOINT,
      `VenuePilot GraphQL error: ${first}`,
    )
  }

  const parsed = ResponseSchema.safeParse(raw)
  if (!parsed.success) {
    throw new VenuePilotSchemaError(
      ENDPOINT,
      parsed.error.issues,
      `VenuePilot response did not match expected schema (${parsed.error.issues.length} issue(s))`,
    )
  }
  return parsed.data.data.paginatedEvents
}

async function venuePilotFetch(
  venue: Venue,
  opts: { crawlDelayMs: number; timeoutMs?: number },
): Promise<PlatformFetchResult> {
  const rawAccountId = venue.apiAccountId?.trim() ?? ''
  if (rawAccountId === '') {
    // canHandle() should have caught this; be defensive.
    throw new VenuePilotFetchError(
      0,
      ENDPOINT,
      `Venue ${venue.id} has apiProvider='venuepilot' but no api_account_id`,
    )
  }
  // Number('  ') coerces to 0 and Number.isInteger(0) is true, so trim first
  // and require a positive integer — otherwise a blank/zero id would silently
  // fetch account 0 instead of failing loudly.
  const accountId = Number(rawAccountId)
  if (!Number.isInteger(accountId) || accountId <= 0) {
    throw new VenuePilotFetchError(
      0,
      ENDPOINT,
      `Venue ${venue.id} has an invalid api_account_id: ${venue.apiAccountId}`,
    )
  }

  // Honor robots.txt for the endpoint domain we actually fetch (in addition to
  // crawlVenue's check of venue.websiteUrl). isAllowed caches per domain and
  // fails open, so this is a no-op unless VenuePilot adds an explicit Disallow.
  if (!(await isAllowed(ENDPOINT, USER_AGENT))) {
    throw new VenuePilotFetchError(
      0,
      ENDPOINT,
      `robots.txt disallows ${USER_AGENT} at ${ENDPOINT}`,
    )
  }

  const startDate = todayInTimezone(venue.timezone)
  const startedAt = Date.now()
  const events: NormalizedEvent[] = []
  let totalCount = 0
  let totalPages = 1
  let pagesFetched = 0

  for (let page = 1; page <= Math.min(totalPages, MAX_PAGES); page += 1) {
    if (opts.crawlDelayMs > 0) {
      const delay = jitter(opts.crawlDelayMs)
      if (delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
    const paginated = await fetchPage(
      accountId,
      startDate,
      page,
      opts.timeoutMs,
    )
    pagesFetched += 1
    totalCount = paginated.metadata.totalCount
    totalPages = paginated.metadata.totalPages
    for (const event of paginated.collection) {
      const normalized = normalize(event, venue.websiteUrl)
      if (normalized) events.push(normalized)
    }
  }

  // totalPages > MAX_PAGES means we stopped short of the full set — surface it
  // in meta (which is logged) so operators can alert on partial fetches rather
  // than silently serving truncated data.
  const truncated = totalPages > MAX_PAGES
  if (truncated) {
    logger.warn(
      { venueId: venue.id, totalPages, pagesFetched, cap: MAX_PAGES },
      'VenuePilot pagination hit MAX_PAGES cap — event set is truncated',
    )
  }

  return {
    events,
    sourceUrl: ENDPOINT,
    meta: {
      fetchLatencyMs: Date.now() - startedAt,
      totalCount,
      totalPages,
      pagesFetched,
      truncated,
      eventsAfterNormalization: events.length,
    },
  }
}

export const venuePilotFetcher: PlatformFetcher = {
  source: 'venuepilot',
  canHandle(venue) {
    // Trim so a whitespace-only api_account_id isn't treated as configured.
    return Boolean(
      venue.apiProvider === 'venuepilot' &&
      venue.apiAccountId &&
      venue.apiAccountId.trim().length > 0,
    )
  },
  fetch: venuePilotFetch,
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm --filter @concert-crawl/crawler-core test -- venuepilot`
Expected: PASS — all `canHandle` + `fetch` cases green.

- [ ] **Step 6: Type-check**

Run: `pnpm --filter @concert-crawl/crawler-core typecheck`
Expected: PASS — no errors. If `Venue` lacks `apiProvider`/`apiAccountId`/`timezone` fields the type-check will flag it; those columns already exist on the `Venue` type, so they should resolve.

- [ ] **Step 7: Commit**

```bash
git add packages/crawler-core/src/lib/fetchers/venuepilot.ts packages/crawler-core/src/lib/fetchers/venuepilot.test.ts packages/crawler-core/src/lib/fetchers/__fixtures__/venuepilot-levitt.json
git commit -m "feat(crawler): add VenuePilot GraphQL fetcher"
```

---

### Task 3: Wire VenuePilot into dispatch

**Files:**
- Modify: `packages/crawler-core/src/lib/fetchers/dispatch.ts`
- Modify: `packages/crawler-core/src/lib/fetchers/index.ts`
- Modify: `packages/crawler-core/src/lib/fetchers/dispatch.test.ts`

**Interfaces:**
- Consumes: `venuePilotFetcher` from `./venuepilot.js` (Task 2).
- Produces: `dispatch(venue)` returns `venuePilotFetcher` for a venuepilot venue, `aegFetcher` for an AEG venue, `null` otherwise. `venuePilotFetcher` re-exported from `index.ts`.

- [ ] **Step 1: Add the failing dispatch tests**

Append to `describe('dispatch', ...)` in `packages/crawler-core/src/lib/fetchers/dispatch.test.ts`. The `makeVenue` helper's base object omits `apiProvider`/`apiAccountId`, so add them to the base object too:

```typescript
function makeVenue(overrides: Partial<Venue> = {}): Venue {
  return {
    id: crypto.randomUUID(),
    name: 'Test Venue',
    slug: 'test-venue',
    websiteUrl: 'https://example.com/',
    timezone: 'America/Denver',
    active: true,
    verified: true,
    platform: null,
    platformVenueId: null,
    apiProvider: null,
    apiAccountId: null,
    ...overrides,
  } as Venue
}
```

New cases inside `describe('dispatch', ...)`:

```typescript
  it('routes a venuepilot venue to the VenuePilot fetcher', () => {
    const fetcher = dispatch(
      makeVenue({ apiProvider: 'venuepilot', apiAccountId: '1105' }),
    )
    expect(fetcher).not.toBeNull()
    expect(fetcher?.source).toBe('venuepilot')
  })

  it('returns null for a venuepilot venue with no apiAccountId', () => {
    expect(
      dispatch(makeVenue({ apiProvider: 'venuepilot', apiAccountId: null })),
    ).toBeNull()
  })

  it('still routes an AEG venue to the AEG fetcher (regression)', () => {
    const fetcher = dispatch(
      makeVenue({ platform: 'aeg', platformVenueId: '2' }),
    )
    expect(fetcher?.source).toBe('aeg')
  })

  it('returns null for a venue with neither platform nor apiProvider', () => {
    expect(dispatch(makeVenue())).toBeNull()
  })
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm --filter @concert-crawl/crawler-core test -- dispatch`
Expected: FAIL — venuepilot venue routes to `null` (dispatcher still platform-only) / `.source` undefined.

- [ ] **Step 3: Generalize `dispatch.ts`**

Replace the body of `packages/crawler-core/src/lib/fetchers/dispatch.ts`:

```typescript
import type { Venue } from '@concert-crawl/db'
import { aegFetcher } from './aeg.js'
import { venuePilotFetcher } from './venuepilot.js'
import type { PlatformFetcher } from './index.js'

// Ordered list of available adapters. Each fetcher owns its own matching
// via canHandle(); dispatch returns the first that claims the venue.
// AEG matches on venue.platform, VenuePilot on venue.apiProvider — a
// venue never matches both (a VenuePilot venue has platform = null).
const FETCHERS: readonly PlatformFetcher[] = [
  aegFetcher,
  venuePilotFetcher,
] as const

/**
 * Pick the platform fetcher for a venue, or null if the venue should
 * fall through to the HTML → JSON-LD → LLM cascade. Each fetcher's
 * canHandle() inspects the columns it cares about (AEG: platform +
 * platformVenueId; VenuePilot: apiProvider + apiAccountId).
 */
export function dispatch(venue: Venue): PlatformFetcher | null {
  return FETCHERS.find((fetcher) => fetcher.canHandle(venue)) ?? null
}
```

- [ ] **Step 4: Export `venuePilotFetcher` from `index.ts`**

In `packages/crawler-core/src/lib/fetchers/index.ts`, add next to the AEG export:

```typescript
export { aegFetcher } from './aeg.js'
export { venuePilotFetcher } from './venuepilot.js'
export { dispatch } from './dispatch.js'
```

- [ ] **Step 5: Run dispatch tests + full fetcher suite**

Run: `pnpm --filter @concert-crawl/crawler-core test -- fetchers`
Expected: PASS — all dispatch (AEG regression + VenuePilot routing) and adapter tests green.

- [ ] **Step 6: Commit**

```bash
git add packages/crawler-core/src/lib/fetchers/dispatch.ts packages/crawler-core/src/lib/fetchers/index.ts packages/crawler-core/src/lib/fetchers/dispatch.test.ts
git commit -m "feat(crawler): route venuepilot venues through dispatch"
```

---

### Task 4: Full quality gate + progress row

**Files:**
- Modify: `docs/superpowers/progress.md`

- [ ] **Step 1: Run the full crawler-core quality gate**

Run: `pnpm --filter @concert-crawl/crawler-core typecheck && pnpm --filter @concert-crawl/crawler-core lint && pnpm --filter @concert-crawl/crawler-core test`
Expected: all three PASS. Fix any lint/type issues before continuing (e.g. an unused `VenuePlatform` import left in `crawl.ts` from Task 1, or `id-length` violations).

- [ ] **Step 2: Add a progress.md row**

Add a ✅ Complete row to `docs/superpowers/progress.md` (today's date, "VenuePilot API fetcher (#505) — API-backed venue crawling via the PlatformFetcher registry; first target Levitt Pavilion Denver, account 1105"). Match the existing table format in that file.

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/progress.md
git commit -m "docs: progress row for VenuePilot fetcher (#505)"
```

Note: no `releases.ts` entry — this is crawler-only with no user-facing UI surface.

---

## Post-implementation

- Open the impl PR (`feat/venuepilot-fetcher`), link `Closes #505`, run the Copilot review loop to the merge bar (min 2 successful reviews, zero Crit/High/Med), merge.
- First live validation (post-merge, manual): enable a crawl for Levitt Pavilion Denver (account 1105) and confirm `crawl_runs.extraction_strategy_used = 'platform:venuepilot'` and events populate.

## Self-Review notes

- **Spec coverage:** field mapping (Task 2 normalize), Zod schema + error classes (Task 2), pagination + cap + GraphQL-errors handling (Task 2 fetch + tests), registry reconciliation incl. `platform`→`source` rename (Task 1) and `canHandle` dispatch (Task 3), tests for both files (Tasks 2–3). Scope non-goals (no schema/API/UI/AEG-migration) respected.
- **Type consistency:** `source: 'aeg' | 'venuepilot'` used identically in `index.ts`, `aeg.ts`, `venuepilot.ts`, `crawl.ts`, and both test files. `PlatformFetchResult.meta.pagesFetched` asserted in the pagination test and produced in `venuePilotFetch`.
