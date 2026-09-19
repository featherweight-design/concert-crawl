# Prod→Staging Content Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the existing prod→staging public-data sync to cover `artists` and `venue_guide_chips`, and run it on a schedule, so staging holds realistic prod content without ever holding a prod user row.

**Architecture:** `scripts/seed-staging/sync-prod-public-data.ts` already orchestrates `syncVenues` → `syncEvents` → `syncPriceRetrievalLog` behind two safety layers (`assertWriteHostNotProd` before any connection opens, `openProdReadonly` returning a select-only Proxy). This plan adds two more step modules that follow the same shape — read all prod rows, upsert into staging on a unique index, never carry the prod `id` — then wires them into the orchestrator and schedules the whole script from GitHub Actions.

**Tech Stack:** TypeScript (tsx), Drizzle ORM, postgres-js, Vitest (`pnpm test:scripts`), GitHub Actions, Neon Postgres.

**Spec:** `docs/superpowers/specs/2026-09-01-prod-promotion-gate-design.md` — this plan implements workstream 4 (decision D6). Workstreams 1, 2, 3 and 5 are in `docs/superpowers/plans/2026-09-01-prod-promotion-gate.md`. Neither plan depends on the other; this one delivers value whether or not the promotion gate ships.

## Global Constraints

- **Synced tables (content only):** `venues`, `events`, `artists`, `price_retrieval_log` (excluding `source='community'`), `venue_guide_chips`. This plan adds the third and fifth; the rest already exist.
- **Never synced — hard line, no exceptions:** `price_submissions`, `submission_confirms`, `event_reports`, `event_report_confirms`, `crews`, `social`, `notifications`, `user_profiles`, `user_notification_preferences`, `users`, `commerce`, `spotify`, `venue_fault_acknowledgements`. Reason: the staging transactional-email gate (#1613) **fails open**, so a prod user row in staging plus a restorable cron is a path to emailing a real customer from staging.
- **Every prod read goes through `ProdReadonlyClient.select`.** Never open a second prod connection, never widen the Proxy.
- **Never carry the prod `id` into a staging insert.** Strip it and let `defaultRandom()` assign a staging uuid; downstream FK translation uses the returned id maps.
- **Write target is always `NEON_STAGING_DIRECT`.** `NEON_PROD_DIRECT` is a read source and a guard value, never a write target.
- **Both env vars are read from `process.env`, never from CLI args.**
- **No `as` casts in source.** Test files may use `as any` on mock objects — that is the established pattern in `scripts/seed-staging/*.test.ts` and is the only place it is allowed.
- **Identifiers are ≥2 chars** (ESLint `id-length`), except `i`, `j`, `k`, `x`, `y`, `z`, `_`.
- **Every step module is idempotent.** A second run in commit mode must produce the same staging state as the first.
- Run `pnpm test:scripts` for these tests — they are under the root `vitest.scripts.config.ts`, not a workspace package.

---

## File Structure

| File | Responsibility |
| --- | --- |
| `scripts/seed-staging/sync-artists.ts` (create) | Read prod `artists`, upsert into staging on `slug`. No FK parents, no id map needed by anything downstream. |
| `scripts/seed-staging/sync-artists.test.ts` (create) | Unit tests: upsert per row, dry-run writes nothing, scanned/processed counts. |
| `scripts/seed-staging/sync-venue-guide-chips.ts` (create) | Read prod `venue_guide_chips`, translate `venueId` through `venueIdMap`, upsert on the `(venue_id, chip_type)` unique index, count rows skipped for a missing FK parent. |
| `scripts/seed-staging/sync-venue-guide-chips.test.ts` (create) | Unit tests: upsert with translated venueId, skip on unmapped venue, dry-run writes nothing. |
| `scripts/seed-staging/sync-prod-public-data.ts` (modify) | Orchestrate five steps instead of three; update the FK-order docblock, the step labels, and the summary block. |
| `scripts/seed-staging/sync-prod-public-data-main.test.ts` (create) | Assert `main()` runs all five steps, threads `venueIdMap` into the chip step, and propagates `dryRun`. The existing `sync-prod-public-data.test.ts` covers only the pure helpers and is left alone. |
| `.github/workflows/staging-content-sync.yml` (create) | Weekly `schedule` + `workflow_dispatch` runner with a `dry_run` input defaulting to `true`. |
| `docs/runbooks/staging-environment.md` (modify or create) | Document what is synced, what is never synced and why, how to run it by hand, and the two secrets it needs. |

`artists` has no FK into `venues`, so ordering it after venues is convention, not requirement. `venue_guide_chips` **does** have `venue_id` → `venues.id ON DELETE CASCADE`, so it must run after `syncVenues` and consume its `venueIdMap`. Placing chips last keeps the existing three steps' numbering contiguous with their current log labels' meaning.

Step order: `venues` → `events` → `artists` → `price_retrieval_log` → `venue_guide_chips`.

---

## Task 1: Sync artists

**Files:**
- Create: `scripts/seed-staging/sync-artists.ts`
- Test: `scripts/seed-staging/sync-artists.test.ts`

**Interfaces:**
- Consumes: `ProdReadonlyClient` from `./prod-readonly-client.js`; `DrizzleWriteDb` re-exported from `./sync-venues.js`.
- Produces: `syncArtists(deps: { prod: ProdReadonlyClient; staging: DrizzleWriteDb; dryRun: boolean }): Promise<{ scanned: number; processed: number }>`. No id map — nothing references `artists` by foreign key.

**Background the implementer needs:** `packages/db/src/schema/artists.ts` declares two unique indexes, `artists_slug_idx` on `slug` and `artists_canonical_name_idx` on `canonical_name`. Upsert on `slug`, because `slug` is the URL identity staging pages are walked by. `canonicalName` is also unique, so a prod row whose slug is new but whose canonical name already exists in staging would violate that second index — in practice impossible, since both are derived from the same source string by the same `artistSlug()` code path on both databases. Do not add a second `onConflictDoUpdate`; Drizzle supports only one conflict target per statement, and a real collision here means the two databases disagree about canonicalization, which is a bug worth surfacing as an error rather than swallowing.

- [ ] **Step 1: Write the failing test**

Create `scripts/seed-staging/sync-artists.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest'
import { syncArtists } from './sync-artists.js'

describe('syncArtists', () => {
  const rows = [
    {
      id: 'a1',
      name: 'Khruangbin',
      canonicalName: 'khruangbin',
      slug: 'khruangbin',
      spotifyArtistId: 'spotify-1',
      matchStatus: 'matched',
      matchConfidence: '0.980',
      photoUrl: 'https://i.scdn.co/image/abc',
      photoFetchedAt: new Date('2026-08-01T00:00:00Z'),
      hidden: false,
      matchCheckedAt: new Date('2026-08-01T00:00:00Z'),
      matchAttempts: 0,
      spotifyCandidates: null,
      spotifyCandidatesFetchedAt: null,
      createdAt: new Date('2026-07-01T00:00:00Z'),
      updatedAt: new Date('2026-08-01T00:00:00Z'),
    },
    {
      id: 'a2',
      name: 'Tobacco City',
      canonicalName: 'tobacco city',
      slug: 'tobacco-city',
      spotifyArtistId: null,
      matchStatus: 'unmatched',
      matchConfidence: null,
      photoUrl: null,
      photoFetchedAt: null,
      hidden: false,
      matchCheckedAt: null,
      matchAttempts: 0,
      spotifyCandidates: null,
      spotifyCandidatesFetchedAt: null,
      createdAt: new Date('2026-07-01T00:00:00Z'),
      updatedAt: new Date('2026-08-01T00:00:00Z'),
    },
  ]

  const prod = {
    select: vi.fn(
      async (
        fn: (db: {
          select: () => { from: () => typeof rows }
        }) => Promise<typeof rows>,
      ) => fn({ select: () => ({ from: () => rows }) }),
    ),
    close: vi.fn(),
  }

  const stagingFor = (upsertSpy: ReturnType<typeof vi.fn>) => ({
    insert: () => ({
      values: (row: unknown) => ({ onConflictDoUpdate: () => upsertSpy(row) }),
    }),
  })

  it('upserts one row per prod artist', async () => {
    const upsertSpy = vi.fn().mockResolvedValue([])
    const result = await syncArtists({
      prod: prod as any,
      staging: stagingFor(upsertSpy) as any,
      dryRun: false,
    })
    expect(upsertSpy).toHaveBeenCalledTimes(2)
    expect(result.scanned).toBe(2)
    expect(result.processed).toBe(2)
  })

  it('never carries the prod id into the staging insert', async () => {
    const upsertSpy = vi.fn().mockResolvedValue([])
    await syncArtists({
      prod: prod as any,
      staging: stagingFor(upsertSpy) as any,
      dryRun: false,
    })
    const firstArg = upsertSpy.mock.calls[0]?.[0]
    expect(firstArg).not.toHaveProperty('id')
    expect(firstArg).toMatchObject({ slug: 'khruangbin' })
  })

  it('makes no writes when dryRun is true', async () => {
    const upsertSpy = vi.fn()
    const result = await syncArtists({
      prod: prod as any,
      staging: stagingFor(upsertSpy) as any,
      dryRun: true,
    })
    expect(upsertSpy).not.toHaveBeenCalled()
    expect(result.scanned).toBe(2)
    expect(result.processed).toBe(2)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test:scripts -- sync-artists`
Expected: FAIL — `Failed to resolve import "./sync-artists.js"`.

- [ ] **Step 3: Write the implementation**

Create `scripts/seed-staging/sync-artists.ts`:

```ts
/**
 * Concert Crawl — sync artists from prod to staging.
 *
 * Reads all artist rows from prod (via ProdReadonlyClient) and upserts them
 * into staging on the unique `slug` column.
 *
 * No id map is returned: `artists` is a projection table and nothing
 * references it by foreign key (see packages/db/src/schema/artists.ts), so a
 * missing row degrades to "no artist page" rather than to a broken event.
 * That is also why this step can run in any position after venues.
 *
 * Upsert target is `slug` rather than `canonical_name` even though both are
 * unique: `slug` is the URL identity staging pages are walked by. Both columns
 * are derived from the same source string by the same artistSlug() code path on
 * both databases, so a canonical-name collision under a new slug would mean the
 * two databases disagree about canonicalization — an error worth surfacing, not
 * swallowing.
 */

import { artists } from '../../packages/db/src/schema/index.js'
import type { ProdReadonlyClient } from './prod-readonly-client.js'
import type { DrizzleWriteDb } from './sync-venues.js'

export async function syncArtists(deps: {
  prod: ProdReadonlyClient
  staging: DrizzleWriteDb
  dryRun: boolean
}): Promise<{ scanned: number; processed: number }> {
  const { prod, staging, dryRun } = deps

  const prodRows = await prod.select((db) => db.select().from(artists))

  const scanned = prodRows.length
  // `processed` counts rows we attempted to upsert (or, in dry-run, would
  // attempt) — not rows that actually changed. ON CONFLICT UPDATE fires even
  // when incoming values match stored ones. Same naming rationale as
  // sync-venues.ts.
  let processed = 0

  for (const row of prodRows) {
    if (!dryRun) {
      const { id: _prodId, ...rowWithoutId } = row
      await staging
        .insert(artists)
        .values(rowWithoutId)
        .onConflictDoUpdate({
          target: artists.slug,
          set: {
            name: row.name,
            canonicalName: row.canonicalName,
            spotifyArtistId: row.spotifyArtistId,
            matchStatus: row.matchStatus,
            matchConfidence: row.matchConfidence,
            photoUrl: row.photoUrl,
            photoFetchedAt: row.photoFetchedAt,
            hidden: row.hidden,
            matchCheckedAt: row.matchCheckedAt,
            matchAttempts: row.matchAttempts,
            spotifyCandidates: row.spotifyCandidates,
            spotifyCandidatesFetchedAt: row.spotifyCandidatesFetchedAt,
            updatedAt: row.updatedAt,
          },
        })
    }
    processed++
  }

  return { scanned, processed }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test:scripts -- sync-artists`
Expected: PASS, 3 tests.

- [ ] **Step 5: Typecheck and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: both clean.

- [ ] **Step 6: Commit**

```bash
git add scripts/seed-staging/sync-artists.ts scripts/seed-staging/sync-artists.test.ts
git commit -m "feat(seed-staging): sync artists from prod to staging"
```

---

## Task 2: Sync venue guide chips

**Files:**
- Create: `scripts/seed-staging/sync-venue-guide-chips.ts`
- Test: `scripts/seed-staging/sync-venue-guide-chips.test.ts`

**Interfaces:**
- Consumes: `ProdReadonlyClient`; `IdMap` and `DrizzleWriteDb` from `./sync-venues.js`; the `venueIdMap` produced by `syncVenues`.
- Produces: `syncVenueGuideChips(deps: { prod: ProdReadonlyClient; staging: DrizzleWriteDb; dryRun: boolean; venueIdMap: IdMap }): Promise<{ scanned: number; processed: number; skippedMissingFk: number }>`.

**Background the implementer needs:** `packages/db/src/schema/venue-guide.ts` declares `venueGuideChips` with `venueId uuid NOT NULL REFERENCES venues(id) ON DELETE CASCADE`, `chipType text NOT NULL`, `body text NOT NULL`, `isPlaceholder boolean NOT NULL DEFAULT false`, and a unique index `venue_guide_chips_venue_type_idx` on `(venueId, chipType)`. Migration 0068 adds a `venue_guide_chips_state_check` constraint — the design's third chip state, `blank`, is the absence of a row. So never insert a synthetic empty-body row to represent a blank chip; just don't insert.

Prod venue uuids do not exist in staging, so `venueId` must be translated through `venueIdMap`. A prod chip whose venue is absent from the map is skipped and counted — this is the expected mass case on a fresh staging DB, where `venueIdMap` is empty until at least one commit-mode venue sync has run (documented in `sync-venues.ts`'s docblock). Cap the per-row warnings the same way `sync-price-retrieval-log.ts` does, or the log floods.

- [ ] **Step 1: Write the failing test**

Create `scripts/seed-staging/sync-venue-guide-chips.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest'
import { syncVenueGuideChips } from './sync-venue-guide-chips.js'

describe('syncVenueGuideChips', () => {
  const rows = [
    {
      id: 'c1',
      venueId: 'v1',
      chipType: 'parking',
      body: 'Street parking fills up by 7.',
      isPlaceholder: false,
      createdAt: new Date('2026-07-01T00:00:00Z'),
      updatedAt: new Date('2026-08-01T00:00:00Z'),
    },
    {
      id: 'c2',
      venueId: 'v-unknown',
      chipType: 'bag-policy',
      body: 'Small bags only.',
      isPlaceholder: false,
      createdAt: new Date('2026-07-01T00:00:00Z'),
      updatedAt: new Date('2026-08-01T00:00:00Z'),
    },
  ]

  const prod = {
    select: vi.fn(
      async (
        fn: (db: {
          select: () => { from: () => typeof rows }
        }) => Promise<typeof rows>,
      ) => fn({ select: () => ({ from: () => rows }) }),
    ),
    close: vi.fn(),
  }

  const stagingFor = (upsertSpy: ReturnType<typeof vi.fn>) => ({
    insert: () => ({
      values: (row: unknown) => ({ onConflictDoUpdate: () => upsertSpy(row) }),
    }),
  })

  const venueIdMap = new Map([['v1', 'staging-v1']])

  it('upserts with the translated staging venueId and skips unmapped parents', async () => {
    const upsertSpy = vi.fn().mockResolvedValue([])
    const result = await syncVenueGuideChips({
      prod: prod as any,
      staging: stagingFor(upsertSpy) as any,
      dryRun: false,
      venueIdMap,
    })
    expect(upsertSpy).toHaveBeenCalledTimes(1)
    expect(upsertSpy.mock.calls[0]?.[0]).toMatchObject({
      venueId: 'staging-v1',
      chipType: 'parking',
    })
    expect(upsertSpy.mock.calls[0]?.[0]).not.toHaveProperty('id')
    expect(result.scanned).toBe(2)
    expect(result.processed).toBe(1)
    expect(result.skippedMissingFk).toBe(1)
  })

  it('makes no writes when dryRun is true', async () => {
    const upsertSpy = vi.fn()
    const result = await syncVenueGuideChips({
      prod: prod as any,
      staging: stagingFor(upsertSpy) as any,
      dryRun: true,
      venueIdMap,
    })
    expect(upsertSpy).not.toHaveBeenCalled()
    expect(result.scanned).toBe(2)
    expect(result.processed).toBe(1)
    expect(result.skippedMissingFk).toBe(1)
  })

  it('skips every row when the venueIdMap is empty', async () => {
    const upsertSpy = vi.fn()
    const result = await syncVenueGuideChips({
      prod: prod as any,
      staging: stagingFor(upsertSpy) as any,
      dryRun: false,
      venueIdMap: new Map(),
    })
    expect(upsertSpy).not.toHaveBeenCalled()
    expect(result.processed).toBe(0)
    expect(result.skippedMissingFk).toBe(2)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test:scripts -- sync-venue-guide-chips`
Expected: FAIL — `Failed to resolve import "./sync-venue-guide-chips.js"`.

- [ ] **Step 3: Write the implementation**

Create `scripts/seed-staging/sync-venue-guide-chips.ts`:

```ts
/**
 * Concert Crawl — sync venue_guide_chips from prod to staging.
 *
 * Reads all chip rows from prod, translates each row's venueId through the
 * venueIdMap produced by syncVenues, then upserts into staging on the
 * (venue_id, chip_type) unique index.
 *
 * A chip whose prod venue is absent from the map is skipped, not invented: the
 * design's third chip state, `blank`, IS the absence of a row (enforced by
 * venue_guide_chips_state_check, migration 0068), so there is no empty-body
 * row to fall back on. On a fresh staging DB the map is empty and every row is
 * skipped — expected, and why syncVenues must run in commit mode first.
 *
 * Per-row skip warnings are capped for the same reason as in
 * sync-price-retrieval-log.ts: an empty map would otherwise emit one warning
 * per prod chip. The aggregate count is always reported.
 */

import { venueGuideChips } from '../../packages/db/src/schema/index.js'
import type { ProdReadonlyClient } from './prod-readonly-client.js'
import type { IdMap, DrizzleWriteDb } from './sync-venues.js'

const MAX_SKIP_WARNINGS = 5

export async function syncVenueGuideChips(deps: {
  prod: ProdReadonlyClient
  staging: DrizzleWriteDb
  dryRun: boolean
  venueIdMap: IdMap
}): Promise<{ scanned: number; processed: number; skippedMissingFk: number }> {
  const { prod, staging, dryRun, venueIdMap } = deps

  const prodRows = await prod.select((db) => db.select().from(venueGuideChips))

  const scanned = prodRows.length
  let processed = 0
  let skippedMissingFk = 0
  let skipWarningsEmitted = 0

  const warnSkip = (msg: string): void => {
    if (skipWarningsEmitted < MAX_SKIP_WARNINGS) {
      console.warn(msg)
      skipWarningsEmitted++
      if (skipWarningsEmitted === MAX_SKIP_WARNINGS) {
        console.warn(
          '[sync-venue-guide-chips] (further per-row skip warnings suppressed — see aggregate summary at end)',
        )
      }
    }
  }

  for (const row of prodRows) {
    const stagingVenueId = venueIdMap.get(row.venueId)
    if (stagingVenueId === undefined) {
      warnSkip(
        `[sync-venue-guide-chips] skipping chip ${row.id} — prod venueId ${row.venueId} not in venueIdMap`,
      )
      skippedMissingFk++
      continue
    }

    if (!dryRun) {
      const { id: _prodId, venueId: _prodVenueId, ...rest } = row
      await staging
        .insert(venueGuideChips)
        .values({ ...rest, venueId: stagingVenueId })
        .onConflictDoUpdate({
          target: [venueGuideChips.venueId, venueGuideChips.chipType],
          set: {
            body: row.body,
            isPlaceholder: row.isPlaceholder,
            updatedAt: row.updatedAt,
          },
        })
    }
    processed++
  }

  return { scanned, processed, skippedMissingFk }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test:scripts -- sync-venue-guide-chips`
Expected: PASS, 3 tests.

- [ ] **Step 5: Typecheck and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: both clean.

- [ ] **Step 6: Commit**

```bash
git add scripts/seed-staging/sync-venue-guide-chips.ts scripts/seed-staging/sync-venue-guide-chips.test.ts
git commit -m "feat(seed-staging): sync venue guide chips from prod to staging"
```

---

## Task 3: Wire both steps into the orchestrator

**Files:**
- Modify: `scripts/seed-staging/sync-prod-public-data.ts`
- Test: `scripts/seed-staging/sync-prod-public-data-main.test.ts` (create)

**Interfaces:**
- Consumes: `syncArtists` (Task 1) and `syncVenueGuideChips` (Task 2), with exactly the signatures given there.
- Produces: nothing new for later tasks; Task 4's workflow invokes this file through `pnpm db:seed:staging:sync`.

The orchestrator becomes five steps. Log labels change from `Step N/3` to `Step N/5`, and the summary block gains two lines. The `now` value stays shared across steps so the rolling window is computed once.

**Why a new test file.** `scripts/seed-staging/sync-prod-public-data.test.ts` covers only the two pure helpers (`parseArgs`, `assertWriteHostNotProd`) — there is no existing test of `main()` and no module mocking in that file. Rather than bolt a heavy `vi.mock` block onto a pure-function test file, add a sibling. The orchestrator's job is step ordering and FK plumbing, and that is the one thing no step-module unit test can check.

- [ ] **Step 1: Write the failing test**

Create `scripts/seed-staging/sync-prod-public-data-main.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

// The orchestrator opens real connections, so every I/O boundary is mocked:
// postgres-js, Drizzle, the prod read-only client, and all five step modules.
// What is under test is ordering and FK plumbing — nothing else.
vi.mock('postgres', () => ({
  default: vi.fn(() => ({ end: vi.fn() })),
}))
vi.mock('drizzle-orm/postgres-js', () => ({
  drizzle: vi.fn(() => ({ __staging: true })),
}))
vi.mock('./prod-readonly-client.js', () => ({
  openProdReadonly: vi.fn(() => ({ select: vi.fn(), close: vi.fn() })),
}))
vi.mock('./sync-venues.js', () => ({
  syncVenues: vi.fn().mockResolvedValue({
    scanned: 2,
    processed: 2,
    venueIdMap: new Map([['v1', 'staging-v1']]),
  }),
}))
vi.mock('./sync-events.js', () => ({
  syncEvents: vi.fn().mockResolvedValue({
    scanned: 5,
    processed: 5,
    eventIdMap: new Map([['e1', 'staging-e1']]),
  }),
}))
vi.mock('./sync-artists.js', () => ({
  syncArtists: vi.fn().mockResolvedValue({ scanned: 3, processed: 3 }),
}))
vi.mock('./sync-price-retrieval-log.js', () => ({
  syncPriceRetrievalLog: vi.fn().mockResolvedValue({
    scanned: 7,
    inserted: 7,
    skippedMissingFk: 0,
    skippedDuplicates: 0,
  }),
}))
vi.mock('./sync-venue-guide-chips.js', () => ({
  syncVenueGuideChips: vi
    .fn()
    .mockResolvedValue({ scanned: 4, processed: 4, skippedMissingFk: 0 }),
}))

import { main } from './sync-prod-public-data.js'
import { syncVenues } from './sync-venues.js'
import { syncEvents } from './sync-events.js'
import { syncArtists } from './sync-artists.js'
import { syncPriceRetrievalLog } from './sync-price-retrieval-log.js'
import { syncVenueGuideChips } from './sync-venue-guide-chips.js'

describe('sync-prod-public-data main', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env['NEON_PROD_DIRECT'] =
      'postgres://u:p@ep-prod.us-east-2.aws.neon.tech/db'
    process.env['NEON_STAGING_DIRECT'] =
      'postgres://u:p@ep-staging.us-east-2.aws.neon.tech/db'
    process.argv = ['tsx', 'sync-prod-public-data.ts', '--dry-run']
  })

  it('runs all five steps', async () => {
    await main()
    expect(syncVenues).toHaveBeenCalledTimes(1)
    expect(syncEvents).toHaveBeenCalledTimes(1)
    expect(syncArtists).toHaveBeenCalledTimes(1)
    expect(syncPriceRetrievalLog).toHaveBeenCalledTimes(1)
    expect(syncVenueGuideChips).toHaveBeenCalledTimes(1)
  })

  it('passes the venueIdMap from syncVenues into the chip step', async () => {
    await main()
    const chipArgs = vi.mocked(syncVenueGuideChips).mock.calls[0]?.[0]
    expect(chipArgs?.venueIdMap.get('v1')).toBe('staging-v1')
  })

  it('propagates dryRun to every step', async () => {
    await main()
    for (const step of [
      syncVenues,
      syncEvents,
      syncArtists,
      syncPriceRetrievalLog,
      syncVenueGuideChips,
    ]) {
      expect(vi.mocked(step).mock.calls[0]?.[0]).toMatchObject({
        dryRun: true,
      })
    }
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test:scripts -- sync-prod-public-data-main`
Expected: FAIL — `Cannot find module './sync-artists.js'` if Task 1 is not yet merged, otherwise `syncArtists` received 0 calls.

- [ ] **Step 3: Confirm the failure is the ordering gap, not a mocking mistake**

Before writing the orchestrator change, check that the first test's `syncVenues` / `syncEvents` / `syncPriceRetrievalLog` assertions already pass and only the two new ones fail. If all five fail, the mock of `postgres` or `drizzle-orm/postgres-js` is wrong and `main()` is throwing before step 1 — fix that first, because otherwise the test will go green for the wrong reason later.

- [ ] **Step 4: Update the orchestrator's FK-order docblock**

In `scripts/seed-staging/sync-prod-public-data.ts`, replace the `Idempotency:` and `FK order:` docblock paragraphs with:

```
 * Idempotency:
 *   All five sync steps use ON CONFLICT upsert or query-and-skip semantics.
 *   Re-running the script produces identical results (no duplicate rows).
 *
 * FK order:
 *   venues → events → artists → price_retrieval_log → venue_guide_chips.
 *   No transaction wrap — each step is independently idempotent and the FK
 *   chain is enforced by execution order. `artists` has no FK into venues (it
 *   is a projection joined on events.canonical_artist), so its position is
 *   convention; `venue_guide_chips` genuinely requires venueIdMap and so must
 *   follow venues.
 *
 * Never synced:
 *   Every table carrying user identity or user-authored text —
 *   price_submissions, submission_confirms, event_reports,
 *   event_report_confirms, crews, social, notifications, user_profiles,
 *   user_notification_preferences, users, commerce, spotify,
 *   venue_fault_acknowledgements. The staging transactional-email gate (#1613)
 *   fails OPEN, so a prod user row in staging plus a restorable cron is a path
 *   to emailing a real customer from staging. Content tables carry no FK into
 *   any user table, which is what makes this split enforceable.
```

Also update the header line `Copies public venue/event/price-log rows` to `Copies public venue/event/artist/price-log/guide-chip rows`.

- [ ] **Step 5: Add the two imports**

```ts
import { syncArtists } from './sync-artists.js'
import { syncVenueGuideChips } from './sync-venue-guide-chips.js'
```

- [ ] **Step 6: Renumber the existing step labels**

Change `'\n[sync] Step 1/3 — venues'` to `'\n[sync] Step 1/5 — venues'`, `Step 2/3 — events` to `Step 2/5 — events`, and `Step 3/3 — price_retrieval_log` to `Step 4/5 — price_retrieval_log`.

- [ ] **Step 7: Insert the artists step between events and the price log**

```ts
    // Step 3: artists (no FK parents — position is convention, not requirement).
    console.log('\n[sync] Step 3/5 — artists')
    const artistResult = await syncArtists({ prod, staging, dryRun })
    console.log(
      `[sync] artists: scanned=${artistResult.scanned} ${dryRun ? 'wouldProcess' : 'processed'}=${artistResult.processed}`,
    )
```

- [ ] **Step 8: Append the guide-chips step after the price log**

```ts
    // Step 5: venue guide chips (depends on venueIdMap).
    console.log('\n[sync] Step 5/5 — venue_guide_chips')
    const chipResult = await syncVenueGuideChips({
      prod,
      staging,
      dryRun,
      venueIdMap: venueResult.venueIdMap,
    })
    console.log(
      `[sync] venue_guide_chips: scanned=${chipResult.scanned} ${dryRun ? 'wouldProcess' : 'processed'}=${chipResult.processed} skippedMissingFk=${chipResult.skippedMissingFk}`,
    )
```

- [ ] **Step 9: Add both to the summary block**

After the existing `events` summary line, insert:

```ts
    console.log(
      `  artists  scanned=${artistResult.scanned}  ${dryRun ? 'wouldProcess' : 'processed'}=${artistResult.processed}`,
    )
```

and after the `price_log` line:

```ts
    console.log(
      `  chips    scanned=${chipResult.scanned}  ${dryRun ? 'wouldProcess' : 'processed'}=${chipResult.processed}  skippedMissingFk=${chipResult.skippedMissingFk}`,
    )
```

- [ ] **Step 10: Run the full scripts suite**

Run: `pnpm test:scripts`
Expected: PASS, including the orchestrator test.

- [ ] **Step 11: Typecheck and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: both clean.

- [ ] **Step 12: Commit**

```bash
git add scripts/seed-staging/sync-prod-public-data.ts scripts/seed-staging/sync-prod-public-data-main.test.ts
git commit -m "feat(seed-staging): run artists and guide chips in the prod sync pipeline"
```

---

## Task 4: Schedule the sync

**Files:**
- Create: `.github/workflows/staging-content-sync.yml`

**Interfaces:**
- Consumes: `pnpm db:seed:staging:sync` (package.json:17 → `tsx scripts/seed-staging/sync-prod-public-data.ts`) and the five-step orchestrator from Task 3.
- Produces: nothing consumed by later tasks.

**New GitHub secrets required** (repository scope, both already exist as local shell values Hugh holds; neither belongs in a file):

| Name | Purpose | How to create |
| --- | --- | --- |
| `NEON_PROD_DIRECT` | Read source — full Postgres URL for the prod Neon branch | Neon console → project → prod branch → Connection string (direct, not pooled) → GitHub → Settings → Secrets and variables → Actions → New repository secret |
| `NEON_STAGING_DIRECT` | Write target — full Postgres URL for the staging Neon branch | Same path, staging branch |

The job fails loudly with a named missing-secret error rather than running a half-configured sync, because a sync that silently no-ops looks identical to a sync that found nothing to do.

- [ ] **Step 1: Create the workflow**

Create `.github/workflows/staging-content-sync.yml`:

```yaml
name: Staging Content Sync

# Copies PUBLIC CONTENT ONLY from the prod Neon branch into staging, so the
# staging environment holds realistic data shapes and volume. It never copies a
# user row — see scripts/seed-staging/sync-prod-public-data.ts's "Never synced"
# docblock for the list and the reason (the staging transactional-email gate
# fails OPEN).
#
# Two guards sit under this workflow rather than in it: assertWriteHostNotProd()
# throws before any connection opens if both URLs resolve to the same Neon host,
# and openProdReadonly() hands the prod connection back as a select-only proxy.

on:
  schedule:
    # Mondays 15:00 UTC (09:00 MDT) — after the weekend's nightly crawls have
    # landed in prod, inside working hours so a failure is noticed same day.
    - cron: '0 15 * * 1'
  workflow_dispatch:
    inputs:
      dry_run:
        description: 'Read prod + staging and report what would change, without writing'
        type: boolean
        default: true

permissions:
  contents: read

concurrency:
  group: staging-content-sync
  cancel-in-progress: false

jobs:
  sync:
    name: Sync prod content to staging
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - name: Checkout
        uses: actions/checkout@v7

      - name: Setup pnpm
        uses: pnpm/action-setup@v6

      - name: Setup Node.js
        uses: actions/setup-node@v7
        with:
          node-version-file: '.node-version'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Preflight — required secrets present
        env:
          NEON_PROD_DIRECT: ${{ secrets.NEON_PROD_DIRECT }}
          NEON_STAGING_DIRECT: ${{ secrets.NEON_STAGING_DIRECT }}
        run: |
          missing=""
          [ -n "$NEON_PROD_DIRECT" ] || missing="$missing NEON_PROD_DIRECT"
          [ -n "$NEON_STAGING_DIRECT" ] || missing="$missing NEON_STAGING_DIRECT"
          if [ -n "$missing" ]; then
            echo "::error::Missing required repository secret(s):$missing"
            exit 1
          fi
          echo "Both connection secrets are present."

      - name: Run sync
        env:
          NEON_PROD_DIRECT: ${{ secrets.NEON_PROD_DIRECT }}
          NEON_STAGING_DIRECT: ${{ secrets.NEON_STAGING_DIRECT }}
        run: |
          # A scheduled run always commits. A manual dispatch defaults to
          # dry-run so an operator has to opt in to writing.
          if [ "${{ github.event_name }}" = "workflow_dispatch" ] && [ "${{ inputs.dry_run }}" = "true" ]; then
            pnpm db:seed:staging:sync -- --dry-run
          else
            pnpm db:seed:staging:sync
          fi
```

- [ ] **Step 2: Validate the workflow YAML parses**

Run: `python3 -c "import yaml,sys; yaml.safe_load(open('.github/workflows/staging-content-sync.yml')); print('ok')"`
Expected: `ok`.

Note: `on.schedule` parses as the boolean key `True` in Python's YAML loader. That is a known YAML 1.1 quirk and harmless — GitHub's parser reads it correctly. Do not "fix" it by quoting `on`.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/staging-content-sync.yml
git commit -m "feat(ci): schedule the prod-to-staging content sync weekly"
```

- [ ] **Step 4: After merge — create the two secrets, then dry-run**

These steps run against live infrastructure and are done by the operator once the PR has merged.

1. Create `NEON_PROD_DIRECT` and `NEON_STAGING_DIRECT` as repository secrets per the table above.
2. Dispatch the workflow with `dry_run: true`:
   ```bash
   gh workflow run staging-content-sync.yml -f dry_run=true
   ```
3. Read the summary block. On a staging DB that has already been synced at least once, `skippedMissingFk` for chips should be 0 or near it. If it equals the chip `scanned` count, `venueIdMap` came back empty — run the venue step in commit mode first (that is the documented fresh-DB behaviour, not a bug).
4. Dispatch again with `dry_run: false` and confirm the summary reports non-zero `processed` for artists and chips.

---

## Task 5: Document the staging data contract

**Files:**
- Modify or create: `docs/runbooks/staging-environment.md`
- Modify: `docs/superpowers/progress.md`

**Interfaces:** none — documentation only.

- [ ] **Step 1: Check whether the runbook already exists**

Run: `ls docs/runbooks/ | grep -i stag || echo "none"`

If a staging runbook exists under another name, extend it in place rather than creating a second one. If nothing exists, create `docs/runbooks/staging-environment.md`.

- [ ] **Step 2: Write the data-contract section**

Add (or create the file around) this content:

````markdown
## Staging data

Staging holds **prod content, never prod users.**

### Synced from prod

`venues`, `events` (rolling window), `artists`, `price_retrieval_log`
(excluding `source='community'`), `venue_guide_chips`.

Mechanism: `scripts/seed-staging/sync-prod-public-data.ts`, run weekly by
`.github/workflows/staging-content-sync.yml` (Mondays 15:00 UTC) and on demand
via `gh workflow run staging-content-sync.yml -f dry_run=true`.

By hand, with both connection strings exported:

```bash
pnpm db:seed:staging:sync -- --dry-run   # reports, writes nothing
pnpm db:seed:staging:sync                # commits
```

### Never synced

`price_submissions`, `submission_confirms`, `event_reports`,
`event_report_confirms`, `crews`, `social`, `notifications`, `user_profiles`,
`user_notification_preferences`, `users`, `commerce`, `spotify`,
`venue_fault_acknowledgements`.

**Why this line is hard:** the staging transactional-email gate (#1613) **fails
open**. A prod user row in staging, plus one of the suspended staging crons
being restored, is a path to emailing a real customer from staging. Content
tables carry no foreign key into any user table, which is what makes the split
enforceable rather than aspirational.

`event_reports` is excluded even though it holds no contact information: its
`reporter_id` is a Clerk user ID, and a moderation queue is not test data
anybody needs.

**A Neon branch from prod is the wrong tool here.** It is one command and it
copies every user row.

### Two safety layers

1. `assertWriteHostNotProd(prodUrl, stagingUrl)` throws before any connection
   opens if both URLs resolve to the same Neon host.
2. `openProdReadonly(prodUrl)` returns a client exposing only `.select`, whose
   inner Drizzle handle is a proxy exposing only `.select` and `.query`; every
   other property access throws.

Any table added to the sync must route through both. Never open a second prod
connection.

### Synthetic users

Staging user fixtures come from `scripts/seed-staging/seed-synthetic.ts`
(`pnpm db:seed:staging:synthetic`), not from prod. `pnpm db:seed:staging` runs
the content sync and the synthetic seed in that order.
````

- [ ] **Step 3: Add a progress.md row**

Add a ✅ Complete row to `docs/superpowers/progress.md` dated 2026-09-01 describing the prod→staging content sync extension. This clears the substantive bar: it changes what staging contains, which changes what can be validated there.

- [ ] **Step 4: Commit**

```bash
git add docs/runbooks/staging-environment.md docs/superpowers/progress.md
git commit -m "docs(runbooks): document the staging content-sync data contract"
```

---

## Self-Review

**Spec coverage.** Spec D6 names five synced tables; three already sync, and Tasks 1 and 2 add the two missing ones. D6's never-sync list is reproduced verbatim in Task 3's docblock and Task 5's runbook. The spec's scope table says workstream 4 is "add `artists` + `venue_guide_chips`, schedule it" — Task 4 schedules it. The spec's risk row "Content sync writes to prod → existing `assertWriteHostNotProd()` + `openProdReadonly()`; new tables must route through the same helpers" is satisfied because both new step modules take `prod: ProdReadonlyClient` and never construct a connection.

**Type consistency.** `syncArtists` returns `{ scanned, processed }` and `syncVenueGuideChips` returns `{ scanned, processed, skippedMissingFk }`; Task 3's orchestrator code and Task 3's test mocks both use exactly those shapes. `IdMap` and `DrizzleWriteDb` are imported from `./sync-venues.js`, which is where they are actually exported (`sync-venues.ts:25,32`) — not from `@concert-crawl/db` directly, matching how `sync-price-retrieval-log.ts` does it.

**Known gaps, stated rather than hidden.**

- **Event volume and prod row counts are unmeasured.** `artists` and `venue_guide_chips` are both small relative to `events`, so the 20-minute job timeout is a guess with headroom rather than a measured bound. If the job ever times out, the fix is batching, not a longer timeout.
- **`artists` is synced in full, with no rolling window**, unlike `events` and `price_retrieval_log`. That is deliberate — an artist row has no date to window on, and the table is a projection of the event funnel, so its size tracks distinct acts rather than show count.
- **Chips are upserted, never deleted.** A chip removed in prod stays in staging until someone truncates. Acceptable: staging is test data, and a delete pass is a new class of write against the staging DB for no test-value gain.
- **Task 4 Step 4 cannot be executed in CI.** It needs the two secrets, which only Hugh can create. Until they exist the scheduled run fails at the preflight step with a named error — which is the intended behaviour, not a silent no-op.
