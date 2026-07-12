# Staging Seeder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `pnpm db:seed:staging` — one idempotent command that makes staging prod-like by (a) syncing public/crawled data from prod Neon to staging Neon and (b) generating deterministic, layout-hostile synthetic user data attached to a small set of staging Clerk fixture users.

**Architecture:** Two tsx scripts under `scripts/seed-staging/`, driven by a thin root wrapper. Half A opens a **structurally read-only** wrapper over `NEON_PROD_DIRECT` and upserts venues/events/prices into `NEON_STAGING_DIRECT` on natural keys. Half B deletes all fixture-tagged rows for the reserved Clerk IDs and regenerates them from a seeded PRNG so two runs produce identical rows. Both halves are safe to re-run; both refuse to write to prod.

**Tech Stack:** tsx + Drizzle ORM (upsert on natural keys), `postgres` driver connections to Neon (existing shell env vars — never checked in), Vitest for unit + one integration assertion, `pnpm` for orchestration. No new external deps.

## Global Constraints

- Environment: `NEON_PROD_DIRECT` and `NEON_STAGING_DIRECT` are pre-set in Hugh's shell; never commit them, never reference them in CI, never accept them as CLI args. Read them via `process.env` only.
- Never run this from CI. It is a manual, local-only command.
- Prod is structurally read-only in every code path. The prod client wrapper exposes `select` only; there is no code path that can write to prod.
- Idempotency is required. Public-data sync uses `.onConflictDoUpdate` on natural keys; synthetic data uses "delete all fixture-tagged rows, then regenerate".
- Determinism is required for synthetic data. All RNG goes through a seeded PRNG so two runs produce identical rows.
- `sync-prod-public-data.ts` must refuse to run if the resolved _write_-side host matches the prod host (belt-and-braces against swapped env vars).
- Follow the existing `scripts/<date>-<name>.ts` + `<name>-helpers.ts` + `<name>.test.ts` pattern; tests run under `pnpm test:scripts` via `vitest.scripts.config.ts`.
- Type safety in shipped code: no `as` value casts. Use Zod `safeParse` for JSON.parse-like boundaries; use type guards for narrowing. Exceptions: `as const` for readonly literal narrowing is fine (it prevents widening, it isn't a value cast); and unit-test mocks may use `as any` where reconstructing a full Drizzle client type would dwarf the test itself — the runtime spy shape is what the test actually asserts against.
- Follow-up (not in this plan, open at implementation time): a GH issue to delete the paused staging crawler Render cron once prod→staging sync ships. Add label `type: chore`, `source: internal`, `phase: beta`, `priority: normal`.

**Reference spec:** `docs/superpowers/specs/2026-07-11-ui-audit-staging-seeder-design.md` §1a, §1b, and "Env/infra notes" / "Guard rails".

---

## PR 1 — Prod → Staging Public-Data Sync

**Deliverable:** `pnpm db:seed:staging:sync` (add `-- --dry-run` for a preview) copies venues, events (within a rolling window: past 30 days → all future), and venue/vendor-sourced price retrieval log rows from prod to staging, idempotently. The script name is a root-level entry wired into `package.json` in Task 5 below.

### Task 1: Read-only prod client wrapper

**Files:**

- Create: `scripts/seed-staging/prod-readonly-client.ts`
- Create: `scripts/seed-staging/prod-readonly-client.test.ts`

**Interfaces:**

- Consumes: `postgres` driver, `drizzle-orm/postgres-js`.
- Produces:
  - `openProdReadonly(url: string): ProdReadonlyClient` — factory. Throws if url is empty.
  - `type ProdReadonlyClient = { select: <T>(fn: (db: DrizzleReadDb) => Promise<T>) => Promise<T>; close: () => Promise<void> }`
  - `DrizzleReadDb` = a Drizzle client narrowed to `.select(...).from(...)` — no `.insert`, `.update`, `.delete` methods on the exposed surface.

- [ ] **Step 1: Write the failing tests.**

```ts
// scripts/seed-staging/prod-readonly-client.test.ts
import { describe, it, expect } from 'vitest'
import { openProdReadonly } from './prod-readonly-client.js'

describe('openProdReadonly', () => {
  it('throws if the url is empty', () => {
    expect(() => openProdReadonly('')).toThrow(/NEON_PROD_DIRECT/i)
  })

  it('exposes select but not insert/update/delete on the returned surface', () => {
    const client = openProdReadonly(
      'postgres://user:pw@example/db?sslmode=require',
    )
    expect(typeof client.select).toBe('function')
    expect(typeof client.close).toBe('function')
    expect('insert' in client).toBe(false)
    expect('update' in client).toBe(false)
    expect('delete' in client).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail.**

Run: `pnpm test:scripts scripts/seed-staging/prod-readonly-client`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement `openProdReadonly`.**

Internally: open a `postgres(url, { max: 2, prepare: false })` connection, wrap it with `drizzle(sql, { schema })`. Return an object whose only exposed methods are `select` (which invokes the caller's callback with the drizzle client) and `close` (which calls `await sql.end()`). Do NOT return the raw drizzle client — return the wrapper so `.insert` / `.update` / `.delete` are structurally absent from the caller's type.

- [ ] **Step 4: Run tests and verify they pass.**

- [ ] **Step 5: Commit.**

```bash
git add scripts/seed-staging/prod-readonly-client.ts scripts/seed-staging/prod-readonly-client.test.ts
git commit -m "feat(seed-staging): read-only prod client wrapper (no write surface)"
```

### Task 2: Venues sync

**Files:**

- Create: `scripts/seed-staging/sync-venues.ts`
- Create: `scripts/seed-staging/sync-venues.test.ts`

**Interfaces:**

- Consumes: `ProdReadonlyClient` from Task 1; a staging `db` client (drizzle over `NEON_STAGING_DIRECT`).
- Produces:
  - `syncVenues(deps: { prod: ProdReadonlyClient; staging: DrizzleWriteDb; dryRun: boolean }): Promise<{ scanned: number; upserted: number }>`
  - Upsert target: `venues.slug` (UNIQUE, per `packages/db/src/schema/venues.ts:38`).

- [ ] **Step 1: Write the failing test.**

Test the pure logic: given a fixed list of "prod rows" (constructed manually), calling `syncVenues` with a mock staging client records one upsert call per row; passing `dryRun: true` records zero writes. Mock the staging client with a spy; do NOT hit a real DB in this unit test.

```ts
// scripts/seed-staging/sync-venues.test.ts
import { describe, it, expect, vi } from 'vitest'
import { syncVenues } from './sync-venues.js'

describe('syncVenues', () => {
  const rows = [
    {
      id: 'v1',
      slug: 'ogden-theatre',
      name: 'Ogden Theatre',
      websiteUrl: 'https://…',
    },
    {
      id: 'v2',
      slug: 'bluebird',
      name: 'Bluebird Theater',
      websiteUrl: 'https://…',
    },
  ]
  const prod = {
    select: vi.fn(async (fn) => fn({ select: () => ({ from: () => rows }) })),
    close: vi.fn(),
  }
  const stagingFor = (upsertSpy: ReturnType<typeof vi.fn>) => ({
    insert: () => ({
      values: (r: unknown) => ({ onConflictDoUpdate: () => upsertSpy(r) }),
    }),
  })

  it('upserts one row per prod venue', async () => {
    const upsertSpy = vi.fn().mockResolvedValue([])
    const result = await syncVenues({
      prod: prod as any,
      staging: stagingFor(upsertSpy) as any,
      dryRun: false,
    })
    expect(upsertSpy).toHaveBeenCalledTimes(2)
    expect(result.upserted).toBe(2)
  })

  it('makes no writes when dryRun is true', async () => {
    const upsertSpy = vi.fn()
    const result = await syncVenues({
      prod: prod as any,
      staging: stagingFor(upsertSpy) as any,
      dryRun: true,
    })
    expect(upsertSpy).not.toHaveBeenCalled()
    expect(result).toEqual({ scanned: 2, upserted: 0 })
  })
})
```

- [ ] **Step 2: Implement `syncVenues`.**

Prod read: `prod.select((db) => db.select().from(venues))`. For each row, `staging.insert(venues).values(row).onConflictDoUpdate({ target: venues.slug, set: { …every non-key column… } })`. Skip on `dryRun`. Log per-row action to console at debug volume (`console.log` with a compact one-liner).

- [ ] **Step 3: Run tests and verify they pass.**

- [ ] **Step 4: Commit.**

```bash
git add scripts/seed-staging/sync-venues.ts scripts/seed-staging/sync-venues.test.ts
git commit -m "feat(seed-staging): sync venues with slug upsert"
```

### Task 3: Events sync (rolling window)

**Files:**

- Create: `scripts/seed-staging/sync-events.ts`
- Create: `scripts/seed-staging/sync-events-helpers.ts`
- Create: `scripts/seed-staging/sync-events.test.ts`

**Interfaces:**

- Consumes: `ProdReadonlyClient`, staging drizzle client.
- Produces:
  - `rollingWindow(now: Date): { fromDate: string; }` — returns `{ fromDate: <YYYY-MM-DD>=today-30d> }`. The read query is `WHERE date >= fromDate`; there is no upper bound (spec: "past 30 days → all future"). Exported from `-helpers.ts` for pure-function testing.
  - `syncEvents(deps: { prod; staging; dryRun; now: Date }): Promise<{ scanned: number; upserted: number }>`.
  - Upsert target: `events.venueDateCanonicalTitleIdx` — partial UNIQUE on `(venue_id, date, canonical_title) WHERE status = 'upcoming'` (per `packages/db/src/schema/events.ts:158-162`). Rows with `status` in `('cancelled', 'postponed')` sit outside the index; treat them as insert-only for now. Simplest correct: for `upcoming` rows call `.onConflictDoUpdate({ target: [events.venueId, events.date, events.canonicalTitle], targetWhere: eq(events.status, 'upcoming'), set: {...} })` — `targetWhere` mirrors the partial index predicate so Postgres identifies the right unique index (mirror the canonical usage at `packages/crawler-core/src/crawl.ts:685-693`, which upserts against the same index). For `cancelled`/`postponed` rows use `.onConflictDoNothing()` via a second insert path. Split by status in the loop.

- [ ] **Step 1: Write failing tests.**

Test `rollingWindow` (pure): given `now = 2026-07-12T18:00Z`, `fromDate === '2026-06-12'` (30 days back, MT-aware not required — dates are stored as `date` type). Test `syncEvents` upsert dispatch: given a mock stream of 3 events (2 upcoming, 1 cancelled), the upcoming ones go through `onConflictDoUpdate` and the cancelled one through `onConflictDoNothing`. Both counts are reported.

```ts
// scripts/seed-staging/sync-events.test.ts
import { describe, it, expect, vi } from 'vitest'
import { rollingWindow } from './sync-events-helpers.js'
import { syncEvents } from './sync-events.js'

describe('rollingWindow', () => {
  it('returns fromDate 30 days before now', () => {
    expect(rollingWindow(new Date('2026-07-12T18:00:00Z'))).toEqual({
      fromDate: '2026-06-12',
    })
  })
  it('normalizes to UTC midnight', () => {
    expect(rollingWindow(new Date('2026-07-12T00:00:00Z')).fromDate).toBe(
      '2026-06-12',
    )
  })
})

describe('syncEvents', () => {
  it('splits upserts by status: upcoming → update, cancelled/postponed → nothing', async () => {
    // …spies for insert(events).values().onConflictDoUpdate() and .onConflictDoNothing()…
    // Assert counts by status.
  })
})
```

- [ ] **Step 2: Implement `rollingWindow` in the `-helpers.ts` file.**

Pure function. Subtract 30 days from `now` (`new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)`), format as `YYYY-MM-DD` (UTC).

- [ ] **Step 3: Implement `syncEvents`.**

Prod read filter: `db.select().from(events).where(gte(events.date, fromDate))`. Loop per row; upcoming rows use `onConflictDoUpdate` on the composite target with `targetWhere: eq(events.status, 'upcoming')` (mirrors the partial-index predicate — see the "Upsert target" note above and the canonical usage at `packages/crawler-core/src/crawl.ts:685-693`); cancelled/postponed rows use `onConflictDoNothing` (no valid unique target for them yet — insert-once semantics are acceptable and match the spec's read-only nature of these events).

- [ ] **Step 4: Run tests, verify they pass.**

- [ ] **Step 5: Commit.**

```bash
git add scripts/seed-staging/sync-events.ts scripts/seed-staging/sync-events-helpers.ts scripts/seed-staging/sync-events.test.ts
git commit -m "feat(seed-staging): sync events with rolling window and status-aware upsert"
```

### Task 4: Price retrieval log sync

**Files:**

- Create: `scripts/seed-staging/sync-price-retrieval-log.ts`
- Create: `scripts/seed-staging/sync-price-retrieval-log.test.ts`

**Interfaces:**

- Consumes: `ProdReadonlyClient`, staging drizzle client.
- Produces:
  - `syncPriceRetrievalLog(deps: { prod; staging; dryRun }): Promise<{ scanned: number; upserted: number }>`.
  - The `price_retrieval_log` table has no natural unique key — use `.onConflictDoNothing({ target: priceRetrievalLog.id })` on the PK. Rows are deterministic UUIDs from prod, so re-run == no-op.

Rationale: spec §1a limits price sync to "venue/vendor-sourced price rows only — not user submissions." The `price_retrieval_log` table records only crawler-driven fetches (see `packages/db/src/schema/prices.ts:63-90`); `price_submissions` is user-owned and excluded from public-data sync entirely.

- [ ] **Step 1: Write the failing test** (mock streams as in earlier tasks).

- [ ] **Step 2: Implement.**

- [ ] **Step 3: Run tests.**

- [ ] **Step 4: Commit.**

```bash
git add scripts/seed-staging/sync-price-retrieval-log.ts scripts/seed-staging/sync-price-retrieval-log.test.ts
git commit -m "feat(seed-staging): sync price retrieval log rows (venue/vendor only)"
```

### Task 5: CLI orchestrator + guard rails

**Files:**

- Create: `scripts/seed-staging/sync-prod-public-data.ts`
- Create: `scripts/seed-staging/sync-prod-public-data-helpers.ts`
- Create: `scripts/seed-staging/sync-prod-public-data.test.ts`
- Modify: root `package.json` — add `"db:seed:staging:sync": "tsx scripts/seed-staging/sync-prod-public-data.ts"`.

**Interfaces:**

- Consumes: everything above.
- Produces:
  - `assertWriteHostNotProd(prodUrl: string, stagingUrl: string): void` — throws if the parsed host of `stagingUrl` matches the parsed host of `prodUrl`. Exported from `-helpers.ts`.
  - `parseArgs(argv: string[]): { dryRun: boolean }` — parses `--dry-run`. Exported from `-helpers.ts`.
  - `main(): Promise<void>` — CLI entry.

- [ ] **Step 1: Write failing tests for `parseArgs` and `assertWriteHostNotProd`.**

```ts
import { describe, it, expect } from 'vitest'
import {
  parseArgs,
  assertWriteHostNotProd,
} from './sync-prod-public-data-helpers.js'

describe('parseArgs', () => {
  it('defaults dryRun to false', () => {
    expect(parseArgs(['tsx', 'x.ts'])).toEqual({ dryRun: false })
  })
  it('flips dryRun to true when --dry-run is passed', () => {
    expect(parseArgs(['tsx', 'x.ts', '--dry-run'])).toEqual({ dryRun: true })
  })
})

describe('assertWriteHostNotProd', () => {
  it('throws if write host matches prod host', () => {
    expect(() =>
      assertWriteHostNotProd(
        'postgres://u:p@ep-prod.us-east-2.aws.neon.tech/db',
        'postgres://u:p@ep-prod.us-east-2.aws.neon.tech/db',
      ),
    ).toThrow(/refusing to write to prod/i)
  })
  it('passes when hosts differ', () => {
    expect(() =>
      assertWriteHostNotProd(
        'postgres://u:p@ep-prod.us-east-2.aws.neon.tech/db',
        'postgres://u:p@ep-staging.us-east-2.aws.neon.tech/db',
      ),
    ).not.toThrow()
  })
})
```

- [ ] **Step 2: Implement helpers.**

`assertWriteHostNotProd`: `new URL(prodUrl).host === new URL(stagingUrl).host` → throw with an actionable error message.

- [ ] **Step 3: Wire the CLI entry.**

Follow `scripts/2026-07-11-gifted-comps-backfill.ts:179-195` for the `pathToFileURL`-guarded invocation. Load env vars; refuse to run if `NEON_PROD_DIRECT` or `NEON_STAGING_DIRECT` is empty; call `assertWriteHostNotProd`; open prod read-only client; open staging drizzle client; run `syncVenues → syncEvents → syncPriceRetrievalLog` in that order (respecting the FK graph); print per-step counts; close both connections. FK order enforced by execution order — no explicit transaction wrap.

- [ ] **Step 4: Wire the pnpm script and human-readable docs comment at the top of the file** (mirror `2026-07-11-gifted-comps-backfill.ts:1-45` — describe usage, required env vars, and the read-only guarantee).

- [ ] **Step 5: Run all tests and verify they pass.**

Run: `pnpm test:scripts`

- [ ] **Step 6: Commit.**

```bash
git add scripts/seed-staging/sync-prod-public-data.ts scripts/seed-staging/sync-prod-public-data-helpers.ts scripts/seed-staging/sync-prod-public-data.test.ts package.json
git commit -m "feat(seed-staging): CLI entry with write-host guard and dry-run"
```

**PR-close steps for PR 1 (do at end of PR 1 branch):**

- [ ] Manual staging validation: `NEON_PROD_DIRECT=… NEON_STAGING_DIRECT=… pnpm db:seed:staging:sync -- --dry-run` — observe row counts printed, no writes. The `--` separator forwards `--dry-run` through pnpm to tsx (matches the Deliverable line above).
- [ ] Manual staging validation: `pnpm db:seed:staging:sync` (no `-- --dry-run`); re-run and confirm counts are stable (idempotent).
- [ ] Open a follow-up GH issue to delete the paused staging crawler Render cron. Title: `chore(infra): retire staging crawler cron — replaced by db:seed:staging:sync`. Labels: `type: chore,source: internal,phase: beta,priority: normal`.
- [ ] Open PR titled `feat(seed-staging): prod→staging public-data sync` linking to spec.

---

## PR 2 — Synthetic User Data

**Deliverable:** `pnpm db:seed:staging:synthetic` deletes and regenerates layout-hostile user-shaped data for ~5 reserved staging Clerk fixture user IDs. `pnpm db:seed:staging` (root) runs sync then synthetic.

### Task 1: Fixture user config + seeded PRNG

**Files:**

- Create: `scripts/seed-staging/fixture-users.ts`
- Create: `scripts/seed-staging/seeded-rng.ts`
- Create: `scripts/seed-staging/seeded-rng.test.ts`

**Interfaces:**

- Produces:
  - `FIXTURE_USER_IDS: readonly string[]` — array of ~5 staging Clerk user IDs (real IDs, checked in — IDs are not secrets; the associated Clerk sessions and any tokens are). Add a top-of-file comment explaining how new IDs are provisioned via the Clerk staging dashboard.
  - `type FixtureUserId = (typeof FIXTURE_USER_IDS)[number]`.
  - `createRng(seed: number): { next: () => number; int: (min: number, max: number) => number; pick: <T>(arr: readonly T[]) => T }` — deterministic PRNG (mulberry32 is simple and adequate). Same seed → identical stream.

- [ ] **Step 1: Write failing tests for `createRng`.**

```ts
import { describe, it, expect } from 'vitest'
import { createRng } from './seeded-rng.js'

describe('createRng', () => {
  it('produces identical streams from the same seed', () => {
    const rng1 = createRng(42)
    const rng2 = createRng(42)
    const stream1 = Array.from({ length: 100 }, () => rng1.next())
    const stream2 = Array.from({ length: 100 }, () => rng2.next())
    expect(stream1).toEqual(stream2)
  })
  it('int is inclusive of both bounds', () => {
    const rng = createRng(1)
    const samples = Array.from({ length: 5000 }, () => rng.int(0, 3))
    expect(new Set(samples)).toEqual(new Set([0, 1, 2, 3]))
  })
  it('pick returns an element from the array', () => {
    const rng = createRng(7)
    const arr = ['a', 'b', 'c'] as const
    expect(arr).toContain(rng.pick(arr))
  })
})
```

- [ ] **Step 2: Implement `createRng`.** Mulberry32:

```ts
export const createRng = (seed: number) => {
  let state = seed >>> 0
  const next = () => {
    state |= 0
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  return {
    next,
    int: (min: number, max: number) =>
      Math.floor(next() * (max - min + 1)) + min,
    pick: <T>(arr: readonly T[]): T => arr[Math.floor(next() * arr.length)]!,
  }
}
```

- [ ] **Step 3: Create the fixture-users file.**

Content stub — real IDs to be filled in at PR-open time from the Clerk staging dashboard:

```ts
// Reserved staging Clerk test users owned by the synthetic seeder. Adding a
// new fixture user: create in Clerk staging → paste the user_XXX id below →
// re-run pnpm db:seed:staging. IDs are not secrets; the associated Clerk
// sessions and any tokens are and must never be committed.
export const FIXTURE_USER_IDS = [
  'user_2fixture_alpha',
  'user_2fixture_bravo',
  'user_2fixture_charlie',
  'user_2fixture_delta',
  'user_2fixture_echo',
] as const

export type FixtureUserId = (typeof FIXTURE_USER_IDS)[number]

export const FIXTURE_SEED = 202607_12
```

- [ ] **Step 4: Verify tests pass.**

- [ ] **Step 5: Commit.**

```bash
git add scripts/seed-staging/fixture-users.ts scripts/seed-staging/seeded-rng.ts scripts/seed-staging/seeded-rng.test.ts
git commit -m "feat(seed-staging): fixture user config + deterministic RNG"
```

### Task 2: Fixture cleanup helper

**Files:**

- Create: `scripts/seed-staging/cleanup-fixtures.ts`
- Create: `scripts/seed-staging/cleanup-fixtures.test.ts`

**Interfaces:**

- Produces:
  - `cleanupFixtures(deps: { staging: DrizzleWriteDb; fixtureUserIds: readonly string[] }): Promise<{ deleted: Record<string, number> }>` — deletes rows owned by the fixture users from `userEvents`, `feedback`, `priceSubmissions`, `submissionConfirms`, `userProfiles`, `notifications` (only rows with `userId in fixtureUserIds`; nullable `userId` in notifications is left alone).

- [ ] **Step 1: Write the failing test.**

Use a mocked staging client; assert one `.delete().where(inArray(<table>.userId, fixtureUserIds))` is issued per table (6 calls total), and the returned `deleted` map has one entry per table with the returned row count.

- [ ] **Step 2: Implement.** One issued statement per table; import each table from `@concert-crawl/db`.

- [ ] **Step 3: Test.** Ensure the delete order is: `submissionConfirms → priceSubmissions → feedback → userEvents → notifications → userProfiles` (child rows before parents where FKs exist).

- [ ] **Step 4: Commit.**

```bash
git add scripts/seed-staging/cleanup-fixtures.ts scripts/seed-staging/cleanup-fixtures.test.ts
git commit -m "feat(seed-staging): cleanup helper deletes all fixture-owned rows"
```

### Task 3: Generators — profiles, watches, feedback

**Files:**

- Create: `scripts/seed-staging/generators/user-profiles.ts`
- Create: `scripts/seed-staging/generators/user-events.ts`
- Create: `scripts/seed-staging/generators/feedback.ts`
- Create: `scripts/seed-staging/generators/generators.test.ts` — one file with a describe block per generator.

**Interfaces (each generator's shape):**

```ts
export type GeneratorDeps = {
  staging: DrizzleWriteDb
  fixtureUserIds: readonly string[]
  eventIds: readonly string[]  // sample from these — pre-fetched by the orchestrator
  rng: ReturnType<typeof createRng>
}
export type GenResult = { inserted: number }

export const generateUserProfiles = (deps: GeneratorDeps): Promise<GenResult> => { … }
export const generateUserEvents = (deps: GeneratorDeps): Promise<GenResult> => { … }
export const generateFeedback = (deps: GeneratorDeps): Promise<GenResult> => { … }
```

**Layout-hostile shapes (per spec §1b):**

- `user_profiles`: for each fixture user, one row with a **long display handle** (e.g. `'seededHandle_' + 40-char slug`), missing `city` for some, mixed themes across the enum.
- `user_events`: mix of `going` / `interested` / `watching`; **few** rows for some users (0–1), **many** rows for others (25+); events sampled from both past 30 days and future.
- `feedback`: for each fixture user, several rows covering every `feedback_status` enum value (`unread`, `read`, `flagged`, `issue_opened`, `resolved`, `archived`) and every `feedback_category`; message bodies include a **long unbroken URL** (>200 chars, no whitespace), a **full mobile user-agent string** in one metadata blob, and one row with `adminNotes` populated to stress the admin card layout.

- [ ] **Step 1: Write failing tests.** For each generator, assert:
  - Every returned row's `userId` is in `fixtureUserIds`.
  - Determinism: two runs with `createRng(SAME_SEED)` produce identical row arrays (compare by JSON.stringify of the inserts recorded on a spy).
  - Layout-hostile coverage: at least one feedback message contains a substring of length ≥ 200 with no whitespace; at least one user has ≥ 25 `user_events`.

- [ ] **Step 2: Implement each generator.** Use `deps.rng.pick(deps.fixtureUserIds)`, `deps.rng.int()`, and `deps.rng.pick()` throughout — always reach for fixture users through `deps`, never import `FIXTURE_USER_IDS` from `fixture-users.ts` directly (that would break test/reuse with a narrowed fixture set). **Never** call `Math.random()`.

- [ ] **Step 3: Run tests.**

- [ ] **Step 4: Commit.**

```bash
git add scripts/seed-staging/generators/user-profiles.ts scripts/seed-staging/generators/user-events.ts scripts/seed-staging/generators/feedback.ts scripts/seed-staging/generators/generators.test.ts
git commit -m "feat(seed-staging): profile/watch/feedback generators (layout-hostile, deterministic)"
```

### Task 4: Generators — price submissions, confirms, notifications

**Files:**

- Create: `scripts/seed-staging/generators/price-submissions.ts`
- Create: `scripts/seed-staging/generators/notifications.ts`
- Extend: `scripts/seed-staging/generators/generators.test.ts` with `describe('generatePriceSubmissions')` and `describe('generateNotifications')` blocks.

**Layout-hostile shapes:**

- `price_submissions`: mix of `pending` / `corroborated` / `disputed` / `stale` / `archived`; include edge amounts ($0.50, $999+, free = 0); a **disputed** row must point to another synthetic submission via `disputedSubmissionId`; some rows carry a 280-char `note`. For each `corroborated` submission, insert 1–4 `submission_confirms` rows keyed to other fixture users.
- `notifications`: mix of `admin_alert` and `user_notification`; mix `readAt = null` vs. set; long `title` and long `body` for at least one row per user.

- [ ] **Step 1: Failing tests for both generators.** Assert (a) rows are fixture-owned, (b) deterministic, (c) at least one submission has a linked confirm, (d) at least one notification has `readAt = null`, (e) at least one submission has `priceMin = '0.50'` and one has `priceMin >= 999`.

- [ ] **Step 2: Implement.**

- [ ] **Step 3: Test.**

- [ ] **Step 4: Commit.**

```bash
git add scripts/seed-staging/generators/price-submissions.ts scripts/seed-staging/generators/notifications.ts scripts/seed-staging/generators/generators.test.ts
git commit -m "feat(seed-staging): price submission + notification generators"
```

### Task 5: Orchestrator + pnpm script wiring

**Files:**

- Create: `scripts/seed-staging/seed-synthetic.ts`
- Create: `scripts/seed-staging/seed-synthetic.test.ts`
- Modify: root `package.json` — add:
  - `"db:seed:staging:synthetic": "tsx scripts/seed-staging/seed-synthetic.ts"`
  - `"db:seed:staging": "pnpm db:seed:staging:sync && pnpm db:seed:staging:synthetic"`

**Interfaces:**

- Consumes: cleanup, generators, fixture-users, seeded-rng.
- Produces:
  - `runSynthetic(deps: { staging; fixtureUserIds; seed: number }): Promise<{ deleted: Record<string, number>; inserted: Record<string, number> }>` — cleans, then invokes each generator in the order: profiles → user_events → feedback → price_submissions → notifications.
  - Fetches `eventIds` once at the top by `select().from(events).limit(500)` on the staging DB (post-sync it should have plenty of events; if empty, log and skip event-linked generators — profiles + feedback + notifications still run).

- [ ] **Step 1: Failing tests.** Assert (a) integration-like: two `runSynthetic` invocations against a mock staging DB with the same seed produce identical insert arguments to the spies (idempotency + determinism combined); (b) if `eventIds` is empty, only the four user-only generators run.

- [ ] **Step 2: Implement `runSynthetic`.**

- [ ] **Step 3: CLI entry.** Mirror `sync-prod-public-data.ts` structure — check `NEON_STAGING_DIRECT` is set (delete-and-regenerate against prod would be catastrophic); guard with `assertWriteHostNotProd(process.env['NEON_PROD_DIRECT'] ?? '', process.env['NEON_STAGING_DIRECT'] ?? '')` imported from `../sync-prod-public-data-helpers.js` (throws if the write host matches the prod host, per PR 1 Task 5); then execute.

- [ ] **Step 4: Wire the pnpm scripts** and add a one-line summary block to the root README or CLAUDE.md if there is a natural place; otherwise commit the script wiring only.

- [ ] **Step 5: Test.** Run `pnpm test:scripts` — all seed-staging tests should pass.

- [ ] **Step 6: Commit.**

```bash
git add scripts/seed-staging/seed-synthetic.ts scripts/seed-staging/seed-synthetic.test.ts package.json
git commit -m "feat(seed-staging): synthetic orchestrator + pnpm db:seed:staging entry"
```

**PR-close steps for PR 2 (do at end of PR 2 branch):**

- [ ] Provision ~5 staging Clerk fixture users via the Clerk staging dashboard; paste their IDs into `scripts/seed-staging/fixture-users.ts` replacing the placeholder IDs.
- [ ] Manual staging validation: `pnpm db:seed:staging` runs cleanly end to end; the admin Feedback page shows unread + long-URL feedback rows for fixture users; the admin Contests page shows pending + disputed price submissions.
- [ ] Re-run `pnpm db:seed:staging`; confirm row counts are unchanged (delete + regenerate is idempotent).
- [ ] Open PR titled `feat(seed-staging): synthetic user data for fixture Clerk users` linking to spec + PR 1.

---

## Self-Review Checklist for PR 1 + PR 2

- [ ] Spec §1a (sync scope, prod read-only, natural-key upsert, rolling window, dry-run, write-host guard) and §1b (fixture Clerk IDs, layout-hostile shapes across all six tables, delete-and-regenerate idempotency, seeded RNG) all covered by the tasks above.
- [ ] No new env vars; uses `NEON_PROD_DIRECT` / `NEON_STAGING_DIRECT` from Hugh's shell; never runs from CI. Staging-crawler-cron retirement follow-up captured in PR 1 close checklist.
- [ ] Production code stays free of `as` value casts (the read-only wrapper enforces the prod guarantee structurally); `as any` in unit-test mock shims is the exemption spelled out in Global Constraints.
