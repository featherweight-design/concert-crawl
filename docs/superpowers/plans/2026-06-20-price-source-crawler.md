# Price-Source Discoverability — Crawler PR (PR 2 of 4) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Have the crawler emit a typed `ticketLinks[{kind, vendor, url}]` array for every event upsert, derived from the extracted `ticketUrl` plus venue context (host matching + vendor heuristics). Backfill existing rows so the data is consistent everywhere — not only on rows that re-crawl within 24 hours.

**Architecture:** Pure-function helper `deriveTicketLinks(ticketUrl, venue)` lives in `packages/crawler-core/src/lib/ticket-links/`. The crawler's `crawl.ts` upsert path calls it once per event and writes the result into `events.ticket_links` on both INSERT and ON CONFLICT UPDATE. A one-shot CLI script in `packages/db/` re-runs the same helper over every event row so prod data reflects the better heuristic immediately. Extractors (JSON-LD, LLM, AEG fetcher) keep emitting `ticketUrl` strings — the conversion happens at the single upsert site.

**Tech Stack:** TypeScript strict · Drizzle ORM · Postgres `jsonb` · Vitest (unit + integration against local Postgres) · pnpm workspaces · Playwright (existing crawler, untouched) · Conventional commits

## Global Constraints

- TypeScript strict mode across packages; **no `as` casts** (use Zod `safeParse`, type guards, or interface augmentation per CLAUDE.md "Type safety is the first line of defence")
- **No single-character variable names** — ESLint enforces minimum identifier length of 2 (`err` not `e`, `idx` not `i`, `ctx` not `c`)
- **Expand-only** — `ticket_url` stays as the extractor output; `ticket_links` is the new derived array (parallel-live during the cycle). The contract PR that drops `ticket_url` runs after PR 4 ships.
- **All extractors remain unchanged** — they emit `ticketUrl: string | undefined`. The derivation happens at the crawl-upsert layer, not at extraction.
- **Crawl ethics unchanged** — no new outbound requests, no host probing. Heuristic is pure URL-string parsing.
- Worktree: `.worktrees/feat/price-source-crawler` on branch `feat/price-source-crawler`.
- Before push: `pnpm typecheck && pnpm lint && pnpm test && pnpm --filter @concert-crawl/api test:integration` clean in the worktree.
- After PR opens: request Copilot review via REST POST `requested_reviewers` with body `{"reviewers":["copilot-pull-request-reviewer[bot]"]}`. Verify `response.requested_reviewers[].login` is non-empty before declaring success. Iterate multi-round until Copilot only flags Low/Nit issues.
- **design-review skill does NOT apply** (no UI). PR 4 (Consumer UI) is where design-review is a hard gate.
- No `progress.md` row required — schema scaffolding-class PR.

---

## File Structure

**Create:**

- `packages/crawler-core/src/lib/ticket-links/host-rules.ts` — pure-data constants: `KNOWN_VENDOR_HOSTS`, `KNOWN_RESALE_HOSTS`. One responsibility: lookup tables.
- `packages/crawler-core/src/lib/ticket-links/host-rules.test.ts` — unit tests that pin the table contents (regression safety against accidental edits).
- `packages/crawler-core/src/lib/ticket-links/parse-host.ts` — `parseHost(url): string | null`. Normalizes a URL string to a lowercase hostname; returns `null` for invalid URLs.
- `packages/crawler-core/src/lib/ticket-links/parse-host.test.ts`
- `packages/crawler-core/src/lib/ticket-links/derive.ts` — `deriveTicketLinks(ticketUrl, venue): TicketLink[] | null`. The composer that consumes host-rules + parse-host and returns the typed array.
- `packages/crawler-core/src/lib/ticket-links/derive.test.ts`
- `packages/crawler-core/src/lib/ticket-links/index.ts` — barrel re-export of `deriveTicketLinks` and the `TicketLinkVenueContext` interface.
- `apps/crawler/scripts/backfill-ticket-links.ts` — one-shot CLI: iterate every event row, derive `ticketLinks` from current `ticketUrl` + venue, update in place. Idempotent.
- `apps/api/src/test/backfill-ticket-links.integration.test.ts` — integration test: seed events with `ticketUrl` only, run the script, assert resulting `ticketLinks`.

**Modify:**

- `packages/crawler-core/src/crawl.ts` — at the eventValues map (currently ~line 591–616), also populate `ticketLinks: deriveTicketLinks(event.ticketUrl, venueRecord)`. Add `ticketLinks: sql\`excluded.ticket_links\``to the`onConflictDoUpdate.set` clause (currently ~line 638–658) so re-crawls refresh the array.
- `packages/crawler-core/src/crawl.test.ts` — extend the existing upsert-path test to assert `ticketLinks` lands on the row.
- `apps/crawler/package.json` — add a `backfill-ticket-links` script that runs the new CLI.

**Not modified:**

- `packages/crawler-core/src/types.ts` `NormalizedEvent` — keeps emitting `ticketUrl: string | undefined` from extractors. Derivation happens at the crawl-upsert layer.
- All extractors (`json-ld.ts`, `llm.ts`, `fetchers/aeg.ts`) — unchanged.
- Migration 0040 — already added the `ticket_links` column and a first-pass backfill; this PR replaces the per-row content with a richer derivation but doesn't touch the schema.

---

## Task Right-Sizing Rationale

Seven tasks. Each ends with an independently testable deliverable + commit:

1. `parse-host` helper (pure URL parsing) — smallest unit
2. `host-rules` lookup tables (data-only) — paired tests pin the values
3. `deriveTicketLinks` composer — the public API; full table-driven test suite
4. Wire into `crawl.ts` upsert path (INSERT + UPDATE) + crawl test update
5. Backfill CLI script
6. Integration test for the backfill script
7. Sweep + PR + Copilot iteration

---

### Task 1: `parseHost` URL-to-hostname helper

**Files:**

- Create: `packages/crawler-core/src/lib/ticket-links/parse-host.ts`
- Create: `packages/crawler-core/src/lib/ticket-links/parse-host.test.ts`

**Interfaces:**

- Consumes: none (leaf)
- Produces:

  ```ts
  export function parseHost(url: string | null | undefined): string | null
  ```

  Behavior:
  - Returns lowercased `URL(url).hostname` for any URL that the global `URL` constructor accepts.
  - Strips a leading `www.` so `parseHost('https://www.ticketmaster.com/foo')` returns `'ticketmaster.com'`.
  - Returns `null` for empty strings, `null`, `undefined`, or strings that throw `TypeError` when passed to `new URL(...)`.

- [ ] **Step 1: Write the failing test**

Create `packages/crawler-core/src/lib/ticket-links/parse-host.test.ts`:

```typescript
import { describe, expect, it } from 'vitest'
import { parseHost } from './parse-host.js'

describe('parseHost', () => {
  it('returns the lowercased hostname for a full https URL', () => {
    expect(parseHost('https://Ticketmaster.com/event/123')).toBe(
      'ticketmaster.com',
    )
  })

  it('strips a leading www. subdomain', () => {
    expect(parseHost('https://www.axs.com/events/abc')).toBe('axs.com')
  })

  it('preserves non-www subdomains', () => {
    expect(parseHost('https://tickets.larimerlounge.com/event/42')).toBe(
      'tickets.larimerlounge.com',
    )
  })

  it('returns null for null', () => {
    expect(parseHost(null)).toBeNull()
  })

  it('returns null for undefined', () => {
    expect(parseHost(undefined)).toBeNull()
  })

  it('returns null for an empty string', () => {
    expect(parseHost('')).toBeNull()
  })

  it('returns null for a malformed URL', () => {
    expect(parseHost('not a url')).toBeNull()
  })

  it('returns null for a URL with no host (mailto:)', () => {
    expect(parseHost('mailto:tickets@example.com')).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter @concert-crawl/crawler-core test -- parse-host
```

Expected: FAIL (cannot find module `./parse-host.js`).

- [ ] **Step 3: Implement `parseHost`**

Create `packages/crawler-core/src/lib/ticket-links/parse-host.ts`:

```typescript
// Pure URL → hostname normalization. Returns null for any input that the
// runtime URL parser refuses, so callers can fall through to a "no host
// available" branch without try/catch noise at every site.
export function parseHost(url: string | null | undefined): string | null {
  if (url == null || url === '') return null
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return null
  }
  const hostname = parsed.hostname.toLowerCase()
  if (hostname === '') return null
  return hostname.startsWith('www.') ? hostname.slice(4) : hostname
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm --filter @concert-crawl/crawler-core test -- parse-host
```

Expected: PASS — 8 tests.

- [ ] **Step 5: Commit**

```bash
git add packages/crawler-core/src/lib/ticket-links/parse-host.ts \
        packages/crawler-core/src/lib/ticket-links/parse-host.test.ts
git commit -m "feat(crawler-core): add parseHost URL-to-hostname helper"
```

---

### Task 2: `host-rules` vendor + resale lookup tables

**Files:**

- Create: `packages/crawler-core/src/lib/ticket-links/host-rules.ts`
- Create: `packages/crawler-core/src/lib/ticket-links/host-rules.test.ts`

**Interfaces:**

- Consumes: none (leaf)
- Produces:

  ```ts
  export const KNOWN_VENDOR_HOSTS: ReadonlyMap<string, Vendor>
  export const KNOWN_RESALE_HOSTS: ReadonlySet<string>
  export function vendorForHost(host: string | null): Vendor | null
  export function isResaleHost(host: string | null): boolean
  ```

  `Vendor` is imported from `@concert-crawl/types`.

- [ ] **Step 1: Write the failing test**

Create `packages/crawler-core/src/lib/ticket-links/host-rules.test.ts`:

```typescript
import { describe, expect, it } from 'vitest'
import {
  KNOWN_RESALE_HOSTS,
  KNOWN_VENDOR_HOSTS,
  isResaleHost,
  vendorForHost,
} from './host-rules.js'

describe('KNOWN_VENDOR_HOSTS', () => {
  it('maps ticketmaster.com to Ticketmaster', () => {
    expect(KNOWN_VENDOR_HOSTS.get('ticketmaster.com')).toBe('Ticketmaster')
  })

  it('maps axs.com to AXS', () => {
    expect(KNOWN_VENDOR_HOSTS.get('axs.com')).toBe('AXS')
  })

  it('maps seatgeek.com to SeatGeek', () => {
    expect(KNOWN_VENDOR_HOSTS.get('seatgeek.com')).toBe('SeatGeek')
  })

  it('maps dice.fm to DICE', () => {
    expect(KNOWN_VENDOR_HOSTS.get('dice.fm')).toBe('DICE')
  })

  it('maps eventbrite.com to Eventbrite', () => {
    expect(KNOWN_VENDOR_HOSTS.get('eventbrite.com')).toBe('Eventbrite')
  })
})

describe('KNOWN_RESALE_HOSTS', () => {
  it('contains stubhub.com', () => {
    expect(KNOWN_RESALE_HOSTS.has('stubhub.com')).toBe(true)
  })

  it('contains vividseats.com', () => {
    expect(KNOWN_RESALE_HOSTS.has('vividseats.com')).toBe(true)
  })

  it('contains viagogo.com', () => {
    expect(KNOWN_RESALE_HOSTS.has('viagogo.com')).toBe(true)
  })

  it('does NOT contain seatgeek.com (SeatGeek is a primary vendor per memory)', () => {
    expect(KNOWN_RESALE_HOSTS.has('seatgeek.com')).toBe(false)
  })
})

describe('vendorForHost', () => {
  it('returns the mapped vendor for a known host', () => {
    expect(vendorForHost('ticketmaster.com')).toBe('Ticketmaster')
  })

  it('returns null for an unknown host', () => {
    expect(vendorForHost('larimerlounge.com')).toBeNull()
  })

  it('returns null for null input', () => {
    expect(vendorForHost(null)).toBeNull()
  })
})

describe('isResaleHost', () => {
  it('returns true for stubhub.com', () => {
    expect(isResaleHost('stubhub.com')).toBe(true)
  })

  it('returns false for ticketmaster.com', () => {
    expect(isResaleHost('ticketmaster.com')).toBe(false)
  })

  it('returns false for null', () => {
    expect(isResaleHost(null)).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter @concert-crawl/crawler-core test -- host-rules
```

Expected: FAIL.

- [ ] **Step 3: Implement `host-rules`**

Create `packages/crawler-core/src/lib/ticket-links/host-rules.ts`:

```typescript
import type { Vendor } from '@concert-crawl/types'

// Hosts → vendor enum value (the same case-sensitive strings used in the
// submission_vendor pgEnum + the Vendor type in @concert-crawl/types).
// SeatGeek lives here as a primary vendor (per memory project_price_source_discoverability
// → 'SeatGeek stays in vendor enum and UI').
export const KNOWN_VENDOR_HOSTS: ReadonlyMap<string, Vendor> = new Map([
  ['ticketmaster.com', 'Ticketmaster'],
  ['livenation.com', 'Ticketmaster'],
  ['axs.com', 'AXS'],
  ['seatgeek.com', 'SeatGeek'],
  ['dice.fm', 'DICE'],
  ['eventbrite.com', 'Eventbrite'],
])

// Resale-marketplace hosts. Kept narrow — only the largest ones whose presence
// is unambiguous evidence of resale, not a price-comparison aggregator that
// also lists primary tickets. Extend conservatively.
export const KNOWN_RESALE_HOSTS: ReadonlySet<string> = new Set([
  'stubhub.com',
  'vividseats.com',
  'viagogo.com',
  'ticketnetwork.com',
])

export function vendorForHost(host: string | null): Vendor | null {
  if (host == null) return null
  return KNOWN_VENDOR_HOSTS.get(host) ?? null
}

export function isResaleHost(host: string | null): boolean {
  if (host == null) return false
  return KNOWN_RESALE_HOSTS.has(host)
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm --filter @concert-crawl/crawler-core test -- host-rules
```

Expected: PASS — 15 tests.

- [ ] **Step 5: Commit**

```bash
git add packages/crawler-core/src/lib/ticket-links/host-rules.ts \
        packages/crawler-core/src/lib/ticket-links/host-rules.test.ts
git commit -m "feat(crawler-core): add host-rules vendor + resale lookup tables"
```

---

### Task 3: `deriveTicketLinks` composer

**Files:**

- Create: `packages/crawler-core/src/lib/ticket-links/derive.ts`
- Create: `packages/crawler-core/src/lib/ticket-links/derive.test.ts`
- Create: `packages/crawler-core/src/lib/ticket-links/index.ts`

**Interfaces:**

- Consumes:
  - `parseHost` from `./parse-host.js`
  - `vendorForHost`, `isResaleHost` from `./host-rules.js`
  - `TicketLink`, `TicketVendor` from `@concert-crawl/types`
- Produces:

  ```ts
  export interface TicketLinkVenueContext {
    websiteUrl: string
    ticketVendor: TicketVendor | null
  }
  export function deriveTicketLinks(
    ticketUrl: string | null | undefined,
    venue: TicketLinkVenueContext,
  ): TicketLink[] | null
  ```

  Behavior:
  - Returns `null` when `ticketUrl` is null/undefined/empty.
  - Returns a single-element `TicketLink[]` otherwise.
  - **kind** resolution (first match wins):
    1. URL host equals the venue's own host → `'boxoffice'`.
    2. `venue.ticketVendor === 'venue_box_office'` → `'boxoffice'`.
    3. URL host is in `KNOWN_RESALE_HOSTS` → `'resale'`.
    4. Otherwise → `'primary'`.
  - **vendor** resolution (first non-null wins):
    1. Vendor mapped from the URL host (`KNOWN_VENDOR_HOSTS`).
    2. Vendor mapped from `venue.ticketVendor` (lowercase enum → `Vendor` casing). When `venue.ticketVendor === 'venue_box_office'` the vendor is `'VenueBoxOffice'` (legacy expand-only value); when `venue.ticketVendor === 'unknown'` the vendor is `null`.
    3. `null` otherwise.

- [ ] **Step 1: Write the failing test**

Create `packages/crawler-core/src/lib/ticket-links/derive.test.ts`:

```typescript
import { describe, expect, it } from 'vitest'
import { deriveTicketLinks } from './derive.js'

const BOXOFFICE_VENUE = {
  websiteUrl: 'https://www.larimerlounge.com/',
  ticketVendor: null,
} as const

describe('deriveTicketLinks', () => {
  it('returns null when ticketUrl is null', () => {
    expect(deriveTicketLinks(null, BOXOFFICE_VENUE)).toBeNull()
  })

  it('returns null when ticketUrl is undefined', () => {
    expect(deriveTicketLinks(undefined, BOXOFFICE_VENUE)).toBeNull()
  })

  it('returns null when ticketUrl is empty', () => {
    expect(deriveTicketLinks('', BOXOFFICE_VENUE)).toBeNull()
  })

  it('marks a URL on the venue host as boxoffice', () => {
    const result = deriveTicketLinks(
      'https://www.larimerlounge.com/events/42',
      BOXOFFICE_VENUE,
    )
    expect(result).toEqual([
      {
        kind: 'boxoffice',
        vendor: null,
        url: 'https://www.larimerlounge.com/events/42',
      },
    ])
  })

  it('marks a venue-subdomain URL as boxoffice when the base host matches', () => {
    const result = deriveTicketLinks(
      'https://tickets.larimerlounge.com/event/42',
      BOXOFFICE_VENUE,
    )
    expect(result).toEqual([
      {
        kind: 'boxoffice',
        vendor: null,
        url: 'https://tickets.larimerlounge.com/event/42',
      },
    ])
  })

  it('marks any URL as boxoffice when venue.ticketVendor is venue_box_office', () => {
    const result = deriveTicketLinks('https://example.com/box-office/sale', {
      websiteUrl: 'https://gothictheatre.example.com/',
      ticketVendor: 'venue_box_office',
    })
    expect(result).toEqual([
      {
        kind: 'boxoffice',
        vendor: 'VenueBoxOffice',
        url: 'https://example.com/box-office/sale',
      },
    ])
  })

  it('marks a Ticketmaster URL as primary with vendor Ticketmaster', () => {
    const result = deriveTicketLinks(
      'https://www.ticketmaster.com/event/abc123',
      BOXOFFICE_VENUE,
    )
    expect(result).toEqual([
      {
        kind: 'primary',
        vendor: 'Ticketmaster',
        url: 'https://www.ticketmaster.com/event/abc123',
      },
    ])
  })

  it('marks an AXS URL as primary with vendor AXS', () => {
    const result = deriveTicketLinks(
      'https://www.axs.com/events/xyz',
      BOXOFFICE_VENUE,
    )
    expect(result).toEqual([
      { kind: 'primary', vendor: 'AXS', url: 'https://www.axs.com/events/xyz' },
    ])
  })

  it('marks a StubHub URL as resale with null vendor', () => {
    const result = deriveTicketLinks(
      'https://www.stubhub.com/some-show/event/1234',
      BOXOFFICE_VENUE,
    )
    expect(result).toEqual([
      {
        kind: 'resale',
        vendor: null,
        url: 'https://www.stubhub.com/some-show/event/1234',
      },
    ])
  })

  it('marks a VividSeats URL as resale', () => {
    const result = deriveTicketLinks(
      'https://www.vividseats.com/some-show-tickets',
      BOXOFFICE_VENUE,
    )
    expect(result?.[0]?.kind).toBe('resale')
  })

  it('falls back to venue.ticketVendor mapping when the host is unknown', () => {
    const result = deriveTicketLinks(
      'https://tickets.unknown-platform.example/event',
      { websiteUrl: 'https://larimerlounge.com/', ticketVendor: 'axs' },
    )
    expect(result).toEqual([
      {
        kind: 'primary',
        vendor: 'AXS',
        url: 'https://tickets.unknown-platform.example/event',
      },
    ])
  })

  it('returns vendor null when the venue.ticketVendor is "unknown"', () => {
    const result = deriveTicketLinks(
      'https://tickets.unknown-platform.example/event',
      { websiteUrl: 'https://larimerlounge.com/', ticketVendor: 'unknown' },
    )
    expect(result).toEqual([
      {
        kind: 'primary',
        vendor: null,
        url: 'https://tickets.unknown-platform.example/event',
      },
    ])
  })

  it('prefers URL-derived vendor over venue.ticketVendor when both exist', () => {
    const result = deriveTicketLinks('https://www.ticketmaster.com/event/abc', {
      websiteUrl: 'https://example.com/',
      ticketVendor: 'axs',
    })
    expect(result?.[0]?.vendor).toBe('Ticketmaster')
  })

  it('keeps a malformed-URL ticketUrl in the output (no host inference)', () => {
    // Defensive: extractors should never emit garbage, but if they do we
    // surface the value so it's visible/auditable rather than swallowed.
    const result = deriveTicketLinks('not-a-real-url', BOXOFFICE_VENUE)
    expect(result).toEqual([
      { kind: 'primary', vendor: null, url: 'not-a-real-url' },
    ])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter @concert-crawl/crawler-core test -- ticket-links/derive
```

Expected: FAIL — `./derive.js` not found.

- [ ] **Step 3: Implement `deriveTicketLinks`**

Create `packages/crawler-core/src/lib/ticket-links/derive.ts`:

```typescript
import type { TicketLink, TicketVendor, Vendor } from '@concert-crawl/types'
import { isResaleHost, vendorForHost } from './host-rules.js'
import { parseHost } from './parse-host.js'

export interface TicketLinkVenueContext {
  websiteUrl: string
  ticketVendor: TicketVendor | null
}

// Map the lower-cased TicketVendor enum (DB shape) to the camel/Pascal-cased
// Vendor enum used everywhere else (submission_vendor + TS Vendor union). The
// 'unknown' entry collapses to null so callers don't carry meaningless data.
const VENDOR_FROM_TICKET_VENDOR: Record<TicketVendor, Vendor | null> = {
  axs: 'AXS',
  ticketmaster: 'Ticketmaster',
  seatgeek: 'SeatGeek',
  dice: 'DICE',
  eventbrite: 'Eventbrite',
  venue_box_office: 'VenueBoxOffice',
  unknown: null,
}

function vendorFromVenue(vendor: TicketVendor | null): Vendor | null {
  if (vendor == null) return null
  return VENDOR_FROM_TICKET_VENDOR[vendor]
}

function isSameOrSubdomain(linkHost: string, venueHost: string): boolean {
  if (linkHost === venueHost) return true
  return linkHost.endsWith(`.${venueHost}`)
}

export function deriveTicketLinks(
  ticketUrl: string | null | undefined,
  venue: TicketLinkVenueContext,
): TicketLink[] | null {
  if (ticketUrl == null || ticketUrl === '') return null

  const linkHost = parseHost(ticketUrl)
  const venueHost = parseHost(venue.websiteUrl)

  // kind resolution — first match wins.
  let kind: TicketLink['kind'] = 'primary'
  if (
    linkHost != null &&
    venueHost != null &&
    isSameOrSubdomain(linkHost, venueHost)
  ) {
    kind = 'boxoffice'
  } else if (venue.ticketVendor === 'venue_box_office') {
    kind = 'boxoffice'
  } else if (isResaleHost(linkHost)) {
    kind = 'resale'
  }

  // vendor resolution — URL-derived first, then venue fallback.
  const vendor: Vendor | null =
    vendorForHost(linkHost) ?? vendorFromVenue(venue.ticketVendor)

  return [{ kind, vendor, url: ticketUrl }]
}
```

- [ ] **Step 4: Create barrel re-export**

Create `packages/crawler-core/src/lib/ticket-links/index.ts`:

```typescript
export { deriveTicketLinks, type TicketLinkVenueContext } from './derive.js'
```

- [ ] **Step 5: Run test to verify it passes**

```bash
pnpm --filter @concert-crawl/crawler-core test -- ticket-links/derive
```

Expected: PASS — 13 tests.

- [ ] **Step 6: Commit**

```bash
git add packages/crawler-core/src/lib/ticket-links/derive.ts \
        packages/crawler-core/src/lib/ticket-links/derive.test.ts \
        packages/crawler-core/src/lib/ticket-links/index.ts
git commit -m "feat(crawler-core): add deriveTicketLinks composer"
```

---

### Task 4: Wire `deriveTicketLinks` into `crawl.ts`

**Files:**

- Modify: `packages/crawler-core/src/crawl.ts`
- Modify: `packages/crawler-core/src/crawl.test.ts`

**Interfaces:**

- Consumes: `deriveTicketLinks` from `./lib/ticket-links/index.js`
- Produces: every `events` INSERT / ON CONFLICT UPDATE now writes `ticket_links` as a derived `TicketLink[] | null` value.

- [ ] **Step 1: Read the existing upsert site**

Open `packages/crawler-core/src/crawl.ts` and locate two spots:

- The `eventValues = eventsToUpsert.map(event => ({...}))` block (~line 591–616 in the snapshot from PR 1; line numbers may shift).
- The `onConflictDoUpdate({ ... set: { ... } })` block (~line 638–658).

You also need the venue record fields `websiteUrl` and `ticketVendor`. Confirm they're already in scope via the `venueRecord` / `venue` variable in the outer crawl function — they should be, since the crawler already passes the venue row through (`venueRecord.websiteUrl` is used for robots.txt resolution).

- [ ] **Step 2: Extend the existing crawl test to assert `ticketLinks`**

In `packages/crawler-core/src/crawl.test.ts`, find the test that asserts an event row is inserted with `ticketUrl: 'https://test-venue.example.com/tickets'` (around line 224). Add an additional assertion on the same row:

```typescript
expect(insertedRow.ticketLinks).toEqual([
  {
    kind: 'boxoffice',
    vendor: null,
    url: 'https://test-venue.example.com/tickets',
  },
])
```

(`test-venue.example.com` is the venue's own host in that test, so the derived kind is `'boxoffice'`.)

- [ ] **Step 3: Run the test to verify it fails**

```bash
pnpm --filter @concert-crawl/crawler-core test -- crawl
```

Expected: FAIL — `insertedRow.ticketLinks` is `null` or missing.

- [ ] **Step 4: Wire `deriveTicketLinks` into the INSERT path**

In `packages/crawler-core/src/crawl.ts`, add an import at the top of the imports block:

```typescript
import { deriveTicketLinks } from './lib/ticket-links/index.js'
```

In the `eventValues = eventsToUpsert.map(...)` block, add the new field next to `ticketUrl`:

```typescript
const eventValues = eventsToUpsert.map((event) => ({
  venueId,
  title: event.title,
  artist: event.artist,
  canonicalArtist: event.canonicalArtist,
  date: event.date,
  doorsTime: event.doorsTime && event.doorsTime !== '' ? event.doorsTime : null,
  showTime: event.showTime && event.showTime !== '' ? event.showTime : null,
  ticketUrl: event.ticketUrl ?? null,
  // Derived from (ticketUrl + venue context) at upsert time. Replaces the
  // single-link first-pass backfill from migration 0040 with full host +
  // vendor inference. See packages/crawler-core/src/lib/ticket-links/derive.ts.
  ticketLinks: deriveTicketLinks(event.ticketUrl, {
    websiteUrl: venueRecord.websiteUrl,
    ticketVendor: venueRecord.ticketVendor,
  }),
  description: event.description ?? null,
  imageUrl: event.imageUrl ?? null,
  sourceUrl: event.sourceUrl,
  sourceHash: event.sourceHash,
  status: 'upcoming' as const,
  confidenceScore: event.confidence.toFixed(2),
  verified: event.confidence >= AUTO_APPROVE_THRESHOLD,
  extractionStrategy: strategy,
  hiddenFromConsumer: event.isConcert === false,
}))
```

(Use the actual local variable name for the venue row in `crawl.ts` — likely `venueRecord` or `venue`. Match what's already in scope.)

- [ ] **Step 5: Wire the UPDATE path**

In the `onConflictDoUpdate({ ..., set: { ... } })` block, add the field below `ticketUrl`:

```typescript
set: {
  title: sql`excluded.title`,
  doorsTime: sql`excluded.doors_time`,
  showTime: sql`excluded.show_time`,
  ticketUrl: sql`excluded.ticket_url`,
  ticketLinks: sql`excluded.ticket_links`,
  description: sql`excluded.description`,
  imageUrl: sql`excluded.image_url`,
  status: sql`excluded.status`,
  extractionStrategy: sql`excluded.extraction_strategy`,
  confidenceScore: sql`excluded.confidence_score`,
  sourceHash: sql`excluded.source_hash`,
  updatedAt: new Date(),
  verified: sql`CASE WHEN excluded.verified = TRUE THEN TRUE ELSE ${events.verified} END`,
},
```

- [ ] **Step 6: Run the test to verify it passes**

```bash
pnpm --filter @concert-crawl/crawler-core test -- crawl
```

Expected: PASS. Also run the full crawler-core suite to catch any other test that needs updating:

```bash
pnpm --filter @concert-crawl/crawler-core test
```

Expected: PASS. If a test that didn't previously assert ticketLinks now sees a non-null value where it expected null, update its expected snapshot/assertion to include the derived array.

- [ ] **Step 7: Commit**

```bash
git add packages/crawler-core/src/crawl.ts \
        packages/crawler-core/src/crawl.test.ts
git commit -m "feat(crawler-core): emit ticketLinks on every event upsert"
```

---

### Task 5: Backfill CLI script

**Files:**

- Create: `apps/crawler/scripts/backfill-ticket-links.ts`
- Modify: `apps/crawler/package.json` (add script entry)

**Interfaces:**

- Consumes: `deriveTicketLinks` from `@concert-crawl/crawler-core`; `db`, `events`, `venues` from `@concert-crawl/db`.
- Produces: a CLI executable via `pnpm --filter @concert-crawl/crawler backfill-ticket-links` that re-derives every event's `ticket_links` from its current `(ticket_url, venue)`.

- [ ] **Step 1: Add the package.json script entry**

In `apps/crawler/package.json`, under `scripts`, add:

```json
"backfill-ticket-links": "tsx scripts/backfill-ticket-links.ts"
```

- [ ] **Step 2: Implement the script**

Create `apps/crawler/scripts/backfill-ticket-links.ts` (sibling to `seed.ts` — that's the established convention for one-shot CLIs in this package):

```typescript
import { eq, isNotNull } from 'drizzle-orm'
import { db, events, venues } from './src/index.js'
import { deriveTicketLinks } from '@concert-crawl/crawler-core'

// One-shot backfill. Re-derives every event's ticket_links from its current
// (ticket_url + venue) so prod data reflects the PR 2 heuristic immediately
// instead of waiting for each row's next crawl cycle. Idempotent: running it
// twice produces the same result, since deriveTicketLinks is a pure function
// of its inputs.

async function main(): Promise<void> {
  console.warn('[backfill-ticket-links] starting')

  // Batch by venue so we only fetch each venue row once.
  const rows = await db
    .select({
      eventId: events.id,
      ticketUrl: events.ticketUrl,
      venueWebsiteUrl: venues.websiteUrl,
      venueTicketVendor: venues.ticketVendor,
    })
    .from(events)
    .innerJoin(venues, eq(events.venueId, venues.id))
    .where(isNotNull(events.ticketUrl))

  console.warn(`[backfill-ticket-links] ${rows.length} rows to consider`)

  let updated = 0
  for (const row of rows) {
    const ticketLinks = deriveTicketLinks(row.ticketUrl, {
      websiteUrl: row.venueWebsiteUrl,
      ticketVendor: row.venueTicketVendor,
    })

    await db
      .update(events)
      .set({ ticketLinks, updatedAt: new Date() })
      .where(eq(events.id, row.eventId))
    updated += 1
  }

  console.warn(`[backfill-ticket-links] updated ${updated} rows`)
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[backfill-ticket-links] failed:', err)
    process.exit(1)
  })
```

- [ ] **Step 3: Typecheck the script**

```bash
pnpm --filter @concert-crawl/db typecheck
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/crawler/scripts/backfill-ticket-links.ts \
        apps/crawler/package.json
git commit -m "feat(db): add backfill-ticket-links CLI script"
```

---

### Task 6: Integration test for the backfill script

**Files:**

- Create: `apps/api/src/test/backfill-ticket-links.integration.test.ts`

**Interfaces:**

- Consumes: `deriveTicketLinks` (via direct import — the test invokes the helper, not the CLI, so we can run it inside Vitest); `testDb` from `./helpers/db.js`; seed helpers from `./helpers/seed.js`.
- Produces: an integration test that seeds heterogeneous events (venue-host URL, Ticketmaster URL, StubHub URL, null ticketUrl), runs the same logic the CLI runs, and asserts the resulting `ticketLinks` for each row.

> **Why in apps/api instead of packages/db:** the API package already has the `vitest.integration.ts` harness (global-setup runs migrations on `concert_crawl_test`). Adding the integration test here reuses that infrastructure rather than standing up a parallel one in packages/db.

- [ ] **Step 1: Write the failing test**

Create `apps/api/src/test/backfill-ticket-links.integration.test.ts`:

```typescript
import { beforeEach, describe, expect, it } from 'vitest'
import { eq, isNotNull } from 'drizzle-orm'
import { events, venues } from '@concert-crawl/db'
import { deriveTicketLinks } from '@concert-crawl/crawler-core'
import { testDb } from './helpers/db.js'
import { clearTables, seedEvent, seedVenue } from './helpers/seed.js'

// Re-implementation of the CLI loop, kept in the test file so the test runs
// inside vitest (the CLI uses `process.exit` and a fresh DB connection, which
// don't play nicely with the integration harness). The behavior under test is
// `deriveTicketLinks`'s integration with the events + venues tables.
async function runBackfill(): Promise<void> {
  const rows = await testDb
    .select({
      eventId: events.id,
      ticketUrl: events.ticketUrl,
      venueWebsiteUrl: venues.websiteUrl,
      venueTicketVendor: venues.ticketVendor,
    })
    .from(events)
    .innerJoin(venues, eq(events.venueId, venues.id))
    .where(isNotNull(events.ticketUrl))

  for (const row of rows) {
    const ticketLinks = deriveTicketLinks(row.ticketUrl, {
      websiteUrl: row.venueWebsiteUrl,
      ticketVendor: row.venueTicketVendor,
    })
    await testDb
      .update(events)
      .set({ ticketLinks })
      .where(eq(events.id, row.eventId))
  }
}

describe('backfill-ticket-links integration', () => {
  beforeEach(async () => {
    await clearTables()
  })

  it('marks venue-host URLs as boxoffice', async () => {
    const venue = await seedVenue({
      slug: `boxoffice-venue-${Date.now()}`,
      websiteUrl: 'https://www.larimerlounge.com/',
      ticketVendor: null,
    })
    const event = await seedEvent(venue.id, {
      ticketUrl: 'https://www.larimerlounge.com/event/42',
      artist: 'Boxoffice Test',
    })

    await runBackfill()

    const [reloaded] = await testDb
      .select({ ticketLinks: events.ticketLinks })
      .from(events)
      .where(eq(events.id, event.id))

    expect(reloaded?.ticketLinks).toEqual([
      {
        kind: 'boxoffice',
        vendor: null,
        url: 'https://www.larimerlounge.com/event/42',
      },
    ])
  })

  it('marks Ticketmaster URLs as primary with vendor Ticketmaster', async () => {
    const venue = await seedVenue({
      slug: `primary-venue-${Date.now()}`,
      websiteUrl: 'https://example-venue.com/',
      ticketVendor: 'ticketmaster',
    })
    const event = await seedEvent(venue.id, {
      ticketUrl: 'https://www.ticketmaster.com/event/abc',
      artist: 'Ticketmaster Test',
    })

    await runBackfill()

    const [reloaded] = await testDb
      .select({ ticketLinks: events.ticketLinks })
      .from(events)
      .where(eq(events.id, event.id))

    expect(reloaded?.ticketLinks).toEqual([
      {
        kind: 'primary',
        vendor: 'Ticketmaster',
        url: 'https://www.ticketmaster.com/event/abc',
      },
    ])
  })

  it('marks StubHub URLs as resale', async () => {
    const venue = await seedVenue({
      slug: `resale-venue-${Date.now()}`,
      websiteUrl: 'https://example-venue.com/',
      ticketVendor: null,
    })
    const event = await seedEvent(venue.id, {
      ticketUrl: 'https://www.stubhub.com/show-tickets/event/123',
      artist: 'StubHub Test',
    })

    await runBackfill()

    const [reloaded] = await testDb
      .select({ ticketLinks: events.ticketLinks })
      .from(events)
      .where(eq(events.id, event.id))

    expect(reloaded?.ticketLinks?.[0]?.kind).toBe('resale')
    expect(reloaded?.ticketLinks?.[0]?.vendor).toBeNull()
  })

  it('leaves events with null ticketUrl unchanged', async () => {
    const venue = await seedVenue({
      slug: `no-ticket-venue-${Date.now()}`,
      websiteUrl: 'https://example-venue.com/',
      ticketVendor: null,
    })
    const event = await seedEvent(venue.id, {
      ticketUrl: null,
      artist: 'No Ticket Test',
    })

    await runBackfill()

    const [reloaded] = await testDb
      .select({ ticketLinks: events.ticketLinks })
      .from(events)
      .where(eq(events.id, event.id))

    expect(reloaded?.ticketLinks).toBeNull()
  })

  it('is idempotent — running twice produces the same result', async () => {
    const venue = await seedVenue({
      slug: `idem-venue-${Date.now()}`,
      websiteUrl: 'https://example-venue.com/',
      ticketVendor: 'axs',
    })
    const event = await seedEvent(venue.id, {
      ticketUrl: 'https://www.axs.com/events/xyz',
      artist: 'Idempotency Test',
    })

    await runBackfill()
    const [afterFirst] = await testDb
      .select({ ticketLinks: events.ticketLinks })
      .from(events)
      .where(eq(events.id, event.id))

    await runBackfill()
    const [afterSecond] = await testDb
      .select({ ticketLinks: events.ticketLinks })
      .from(events)
      .where(eq(events.id, event.id))

    expect(afterSecond?.ticketLinks).toEqual(afterFirst?.ticketLinks)
  })
})
```

- [ ] **Step 2: Run the test to verify it passes**

```bash
pnpm --filter @concert-crawl/api test:integration -- backfill-ticket-links
```

Expected: PASS — 5 tests.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/test/backfill-ticket-links.integration.test.ts
git commit -m "test(api): integration tests for ticket-links backfill"
```

---

### Task 7: Sweep + PR + Copilot iteration

**Files:** none (CI / git / gh)

- [ ] **Step 1: Build all packages so workspace consumers resolve from dist**

```bash
pnpm -r --filter './packages/*' build
```

Expected: all packages build clean.

- [ ] **Step 2: Run the full worktree gate**

```bash
pnpm -r typecheck
pnpm -r lint
pnpm -r test
pnpm --filter @concert-crawl/api test:integration
```

Expected: all PASS. Fix any failures before continuing — never push speculatively (memory `feedback_precheck_before_push.md`).

- [ ] **Step 3: Verify the main repo directory is clean**

```bash
git -C /Users/huey/Projects/concert-crawl status
```

Expected: `nothing to commit, working tree clean`.

- [ ] **Step 4: Rebase on latest origin/main**

```bash
git fetch origin
git rebase origin/main
```

Resolve conflicts if any. Re-run the gate after rebase.

- [ ] **Step 5: Push**

```bash
git push -u origin feat/price-source-crawler
```

- [ ] **Step 6: Open PR**

```bash
gh pr create --title "feat: crawler emits ticketLinks for every event upsert" --body "$(cat <<'EOF'
## What does this PR do?

PR 2 of 4 for the price-source-discoverability cycle (issues #641 + #644). Crawler now derives a typed \`ticketLinks[{kind, vendor, url}]\` array from each event's \`ticketUrl\` + venue context (host matching + vendor heuristics), and writes it on every event upsert.

- New \`deriveTicketLinks(ticketUrl, venue)\` helper in \`packages/crawler-core/src/lib/ticket-links/\`.
- Host-rule lookups: \`KNOWN_VENDOR_HOSTS\` (Ticketmaster / AXS / SeatGeek / DICE / Eventbrite + LiveNation) + \`KNOWN_RESALE_HOSTS\` (StubHub / VividSeats / Viagogo / TicketNetwork).
- kind resolution: venue-host match → \`boxoffice\`; \`venue.ticket_vendor='venue_box_office'\` → \`boxoffice\`; resale host → \`resale\`; otherwise \`primary\`.
- vendor resolution: URL-derived first, venue-fallback second, null otherwise.
- Wired into \`crawl.ts\` INSERT + ON CONFLICT UPDATE paths.
- One-shot \`apps/crawler/scripts/backfill-ticket-links.ts\` CLI re-derives every existing row so prod data reflects the heuristic immediately (idempotent).

Extractors (JSON-LD, LLM, AEG fetcher) are unchanged — derivation happens at the single upsert site.

## How to test

1. \`pnpm -r typecheck && pnpm -r test\` — all green.
2. \`pnpm --filter @concert-crawl/api test:integration\` — 5 new backfill integration tests + the existing 241 stay green.
3. \`pnpm --filter @concert-crawl/crawler backfill-ticket-links\` against the local dev DB — should update every event row idempotently.
4. \`psql\` check: \`SELECT ticket_url, ticket_links FROM events WHERE ticket_url IS NOT NULL LIMIT 5;\` — every row's \`ticket_links\` should be a single-element array whose \`kind\` matches the derivation rules.

## What's next after merge

- **PR 3 — API aggregation:** per-tier \`alternates\`, source-mix within tier, pending-submission lists in event detail response, \`reports\` count per active submission, contest scope shrink.
- **PR 4 — Consumer UI:** \`FaceValueCard\`, \`ProvenanceCTA\` variants, submit form reorder, etc. \`design-review\` skill is a hard gate before opening this PR.
- **Contract PR (after PR 4):** drop \`ticket_url\` (and \`how_found\`, and the \`'VenueBoxOffice'\` vendor enum value) once \`ticket_links\` is the canonical read path.

## New environment variables

None.

## Checklist

- [x] Tests pass locally (\`pnpm test\`)
- [x] Types pass (\`pnpm typecheck\`)
- [x] No new lint errors (\`pnpm lint\`)
- [x] Backfill script runs against the local DB

Plan: \`docs/superpowers/plans/2026-06-20-price-source-crawler.md\`
EOF
)"
```

- [ ] **Step 7: Request Copilot review**

```bash
PR_NUMBER=$(gh pr view --json number -q .number)
gh api -X POST "repos/HartiganHM/concert-crawl/pulls/${PR_NUMBER}/requested_reviewers" \
  -H "Content-Type: application/json" \
  --input - <<<'{"reviewers":["copilot-pull-request-reviewer[bot]"]}'
```

Verify the response contains `copilot-pull-request-reviewer[bot]` (or `Copilot`) in `requested_reviewers[].login`.

- [ ] **Step 8: Iterate Copilot review until Low/Nit threshold**

Same pattern as PR 1 — poll every 60s, address every Critical/High/Medium comment with a code fix + regression test, push, re-request review. Stop when a round produces only Low/Nit comments.

- [ ] **Step 9: Watch CI**

```bash
gh pr checks --watch
```

All checks must be green before reporting complete.

---

## What's Next After Merge

1. **PR 3 — API aggregation.** Per-tier `alternates`, source-mix within tier, pending-submission lists in event detail response, `reports` count per active submission, contest scope shrink (DisputeForm becomes price-only, server inherits `(tier, source_category)` from parent).
2. **PR 4 — Consumer UI.** `FaceValueCard`, `ProvenanceCTA` (3 variants), submit form reorder, `MTAddTierSuccess`, `MultiSourceMultiTierCard`, vendor "Venue" relabel, copy sweep, `PriceChip` selection parity. **`design-review` skill is a hard gate** before opening this PR.
3. **Contract PR (after PR 4 ships).** Drop `how_found` column on `price_submissions`, drop `'VenueBoxOffice'` from `submission_vendor` enum, drop `ticket_url` on `events`.

## Notes Carried Forward

- **SeatGeek is a primary vendor** in the `KNOWN_VENDOR_HOSTS` map per the locked decision in memory `project_price_source_discoverability.md`. It is deliberately NOT in `KNOWN_RESALE_HOSTS`.
- **Resale detection is conservative.** Only the largest unambiguous resale marketplaces. Aggregators that list both primary and resale tickets (e.g. SeatGeek itself, Gametime) are kept out to avoid mis-classifying primary inventory.
- **No outbound requests** — heuristic is pure string parsing. Crawl ethics rules (CLAUDE.md) are unaffected.
- **Extractors stay simple.** They keep emitting `ticketUrl` strings. The conversion lives at the crawl-upsert layer so we can iterate on rules without touching every extractor.
