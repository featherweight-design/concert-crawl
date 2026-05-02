# Phase 6b — Integration Tests Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Vitest integration test suite to `apps/api` that runs against a real Postgres database, replacing the current all-mocked unit test approach for API route coverage.

**Architecture:** A separate Vitest project config (`vitest.integration.ts`) targets `*.integration.test.ts` files and injects `DATABASE_URL_TEST` as `DATABASE_URL` so `@concert-crawl/db`'s singleton connects to the test database. A `globalSetup` file runs migrations against the test DB before the suite starts. Each test file seeds what it needs and calls `clearTables()` in `beforeEach`. Clerk auth is mocked via `vi.hoisted` — real DB, synthetic auth context. A new CI job runs these tests against a Docker Postgres service.

**Tech Stack:** Vitest 2.x (already installed), `drizzle-orm/postgres-js` migrator (already installed), GitHub Actions Docker service, `postgres` package (already installed via `@concert-crawl/db`)

**Prerequisite:** PR 6a merged (Pino in API gives better error output when integration tests fail).

---

## File Map

**Create:**

- `apps/api/vitest.integration.ts` — integration test Vitest project config
- `apps/api/src/test/setup/global-setup.ts` — runs DB migrations before suite
- `apps/api/src/test/helpers/db.ts` — `testDb` re-export (pointed at test DB)
- `apps/api/src/test/helpers/seed.ts` — `clearTables()`, `seedVenue()`, `seedEvent()`
- `apps/api/src/routes/health.integration.test.ts`
- `apps/api/src/routes/venues-public.integration.test.ts`
- `apps/api/src/routes/events.integration.test.ts`
- `apps/api/src/routes/admin/venues.integration.test.ts`

**Modify:**

- `apps/api/package.json` — add `test:integration` and `test:all` scripts
- `.github/workflows/ci.yml` — add `integration-test` job with Postgres service

---

## Task 1: Create Vitest integration config

**Files:**

- Create: `apps/api/vitest.integration.ts`

- [ ] **Step 1: Create `apps/api/vitest.integration.ts`**

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Run migrations before any test files load
    globalSetup: './src/test/setup/global-setup.ts',
    // Only pick up integration tests; unit tests stay in vitest.config.ts
    testMatch: ['**/*.integration.test.ts'],
    // Single-fork prevents parallel tests from racing on shared DB state
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    // Override DATABASE_URL so the @concert-crawl/db singleton connects to the test DB.
    // This env is injected into test workers before any module loads.
    env: {
      DATABASE_URL:
        process.env['DATABASE_URL_TEST'] ??
        'postgresql://postgres:postgres@localhost:5433/concert_crawl_test',
    },
  },
})
```

- [ ] **Step 2: Add scripts to `apps/api/package.json`**

In the `"scripts"` block, add:

```json
"test:integration": "vitest run --config vitest.integration.ts",
"test:all": "vitest run && vitest run --config vitest.integration.ts"
```

- [ ] **Step 3: Verify the config is valid (no tests yet)**

```bash
pnpm --filter api test:integration
```

Expected: `No test files found` or similar — no failures.

---

## Task 2: Create global setup (DB migrations)

**Files:**

- Create: `apps/api/src/test/setup/global-setup.ts`

- [ ] **Step 1: Create `apps/api/src/test/setup/global-setup.ts`**

The globalSetup runs in the main Vitest process (not a worker) and receives the raw `DATABASE_URL_TEST` env var from the shell. It runs migrations so the test DB schema is current before any tests execute.

```ts
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Path from apps/api/src/test/setup/ → repo root → packages/db/migrations
const MIGRATIONS_FOLDER = path.resolve(
  __dirname,
  '../../../../../packages/db/migrations',
)

export async function setup(): Promise<void> {
  const testDbUrl =
    process.env['DATABASE_URL_TEST'] ??
    'postgresql://postgres:postgres@localhost:5433/concert_crawl_test'

  console.log('[test] Running migrations on test DB...')

  const client = postgres(testDbUrl, { max: 1 })
  const db = drizzle(client)

  await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER })

  await client.end()

  console.log('[test] Migrations complete.')
}

export async function teardown(): Promise<void> {
  // Leave the DB in place for post-failure inspection
}
```

- [ ] **Step 2: Verify the migration path exists**

```bash
ls packages/db/migrations/
```

Expected: Migration files visible (e.g. `0000_init.sql`). If the folder is named differently, update the `MIGRATIONS_FOLDER` path in `global-setup.ts` to match.

- [ ] **Step 3: Create the test database locally**

```bash
docker exec -it concert-crawl-db psql -U postgres -c "CREATE DATABASE concert_crawl_test;"
```

Expected: `CREATE DATABASE` output.

- [ ] **Step 4: Run the config to verify migrations run**

```bash
DATABASE_URL_TEST=postgresql://postgres:postgres@localhost:5433/concert_crawl_test \
  pnpm --filter api test:integration
```

Expected: `[test] Running migrations on test DB...` then `[test] Migrations complete.` then `No test files found`.

- [ ] **Step 5: Commit**

```bash
git add apps/api/vitest.integration.ts apps/api/src/test/setup/global-setup.ts apps/api/package.json
git commit -m "test: add vitest integration config and global migration setup"
```

---

## Task 3: Create seed helpers

**Files:**

- Create: `apps/api/src/test/helpers/db.ts`
- Create: `apps/api/src/test/helpers/seed.ts`

- [ ] **Step 1: Create `apps/api/src/test/helpers/db.ts`**

The `@concert-crawl/db` singleton reads `DATABASE_URL` at module init time. In integration test workers, `DATABASE_URL` is overridden to `DATABASE_URL_TEST` via the Vitest config `env` option — so `db` from `@concert-crawl/db` automatically connects to the test DB. Re-export it for clarity.

```ts
export { db as testDb } from '@concert-crawl/db'
```

- [ ] **Step 2: Create `apps/api/src/test/helpers/seed.ts`**

```ts
import { sql } from 'drizzle-orm'
import { events, venues } from '@concert-crawl/db'
import { testDb } from './db.js'

/**
 * Truncate all core tables before each test.
 * CASCADE handles FK constraints (events → venues, etc.).
 * RESTART IDENTITY resets serial sequences.
 */
export async function clearTables(): Promise<void> {
  await testDb.execute(
    sql`TRUNCATE events, venues, crawl_runs, audit_log, invite_codes, user_roles RESTART IDENTITY CASCADE`,
  )
}

export async function seedVenue(
  overrides: Partial<typeof venues.$inferInsert> = {},
): Promise<typeof venues.$inferSelect> {
  const [venue] = await testDb
    .insert(venues)
    .values({
      id: crypto.randomUUID(),
      name: 'Test Venue',
      slug: 'test-venue',
      websiteUrl: 'https://testvenue.example.com',
      city: 'Denver',
      state: 'CO',
      timezone: 'America/Denver',
      active: true,
      verified: true,
      ...overrides,
    })
    .returning()

  if (!venue) throw new Error('seedVenue: insert returned no rows')
  return venue
}

export async function seedEvent(
  venueId: string,
  overrides: Partial<typeof events.$inferInsert> = {},
): Promise<typeof events.$inferSelect> {
  const [event] = await testDb
    .insert(events)
    .values({
      id: crypto.randomUUID(),
      venueId,
      title: 'Test Show',
      artist: 'Test Artist',
      date: new Date('2026-06-01T20:00:00Z'),
      status: 'confirmed',
      confidence: 1.0,
      ...overrides,
    })
    .returning()

  if (!event) throw new Error('seedEvent: insert returned no rows')
  return event
}
```

Note: If `venues.$inferInsert` or `events.$inferInsert` don't include `state` or other columns, check `packages/db/src/schema/` for the exact column names and adjust accordingly.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/test/helpers/
git commit -m "test: add testDb and seed helpers for integration tests"
```

---

## Task 4: Health endpoint integration test

**Files:**

- Create: `apps/api/src/routes/health.integration.test.ts`

This is the simplest test — it proves the whole integration test setup works end-to-end before adding more complex cases.

- [ ] **Step 1: Write the test**

Create `apps/api/src/routes/health.integration.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock Clerk auth — health endpoint doesn't require auth but other
// routes loaded by createApp do. This prevents Clerk from making real API calls.
vi.mock('@hono/clerk-auth', () => ({
  clerkMiddleware: () => async (_c: unknown, next: () => Promise<void>) =>
    next(),
  getAuth: () => null,
}))

import { createApp } from '../app.js'
import { clearTables } from '../test/helpers/seed.js'

const app = createApp()

describe('GET /v1/health — integration', () => {
  beforeEach(async () => {
    await clearTables()
  })

  it('returns 200 with status ok', async () => {
    const res = await app.request('/v1/health')
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body).toMatchObject({ status: 'ok' })
  })
})
```

- [ ] **Step 2: Run to verify it fails (no DB connected yet)**

```bash
DATABASE_URL_TEST=postgresql://postgres:postgres@localhost:5433/concert_crawl_test \
  pnpm --filter api test:integration
```

Expected: Test runs and PASSES (health endpoint doesn't query the DB, so this is a baseline test that confirms the setup works).

If it fails with a DB connection error, verify the test DB exists and migrations ran in Task 2 Step 4.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/routes/health.integration.test.ts
git commit -m "test: add health endpoint integration test"
```

---

## Task 5: Venues public endpoint integration tests

**Files:**

- Create: `apps/api/src/routes/venues-public.integration.test.ts`

- [ ] **Step 1: Write the test**

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('@hono/clerk-auth', () => ({
  clerkMiddleware: () => async (_c: unknown, next: () => Promise<void>) =>
    next(),
  getAuth: () => null,
}))

import { createApp } from '../app.js'
import { clearTables, seedVenue, seedEvent } from '../test/helpers/seed.js'

const app = createApp()

describe('GET /v1/venues — integration', () => {
  beforeEach(async () => {
    await clearTables()
  })

  it('returns an empty list when no venues exist', async () => {
    const res = await app.request('/v1/venues')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.venues).toHaveLength(0)
  })

  it('returns only active venues', async () => {
    await seedVenue({ slug: 'active-venue', active: true })
    await seedVenue({ slug: 'inactive-venue', active: false })

    const res = await app.request('/v1/venues')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.venues).toHaveLength(1)
    expect(body.venues[0].slug).toBe('active-venue')
  })

  it('returns multiple active venues', async () => {
    await seedVenue({ slug: 'venue-a', name: 'Venue A' })
    await seedVenue({ slug: 'venue-b', name: 'Venue B' })

    const res = await app.request('/v1/venues')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.venues).toHaveLength(2)
  })
})

describe('GET /v1/venues/:slug — integration', () => {
  beforeEach(async () => {
    await clearTables()
  })

  it('returns venue by slug', async () => {
    const venue = await seedVenue({
      slug: 'larimer-lounge',
      name: 'Larimer Lounge',
    })
    await seedEvent(venue.id)

    const res = await app.request('/v1/venues/larimer-lounge')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.venue.name).toBe('Larimer Lounge')
    expect(body.venue.slug).toBe('larimer-lounge')
  })

  it('returns 404 for unknown slug', async () => {
    const res = await app.request('/v1/venues/does-not-exist')
    expect(res.status).toBe(404)
  })
})
```

- [ ] **Step 2: Run integration tests**

```bash
DATABASE_URL_TEST=postgresql://postgres:postgres@localhost:5433/concert_crawl_test \
  pnpm --filter api test:integration
```

Expected: All tests PASS. If a test fails with an unexpected field name, inspect the actual response body and adjust the assertions to match the real API response shape.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/routes/venues-public.integration.test.ts
git commit -m "test: add venues-public integration tests"
```

---

## Task 6: Events endpoint integration tests

**Files:**

- Create: `apps/api/src/routes/events.integration.test.ts`

- [ ] **Step 1: Write the test**

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('@hono/clerk-auth', () => ({
  clerkMiddleware: () => async (_c: unknown, next: () => Promise<void>) =>
    next(),
  getAuth: () => null,
}))

import { createApp } from '../app.js'
import { clearTables, seedVenue, seedEvent } from '../test/helpers/seed.js'

const app = createApp()

describe('GET /v1/events — integration', () => {
  beforeEach(async () => {
    await clearTables()
  })

  it('returns empty list when no events exist', async () => {
    const res = await app.request('/v1/events')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.events).toHaveLength(0)
  })

  it('returns events with venue data', async () => {
    const venue = await seedVenue({
      name: 'Bluebird Theater',
      slug: 'bluebird',
    })
    await seedEvent(venue.id, { title: 'Rock Night', artist: 'The Rocks' })

    const res = await app.request('/v1/events')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.events).toHaveLength(1)
    expect(body.events[0].title).toBe('Rock Night')
    expect(body.events[0].artist).toBe('The Rocks')
    // Venue join should be present
    expect(body.events[0].venue?.name).toBe('Bluebird Theater')
  })

  it('filters by venueId query param', async () => {
    const venueA = await seedVenue({ slug: 'venue-a' })
    const venueB = await seedVenue({ slug: 'venue-b' })
    await seedEvent(venueA.id, { title: 'Show at A' })
    await seedEvent(venueB.id, { title: 'Show at B' })

    const res = await app.request(`/v1/events?venueId=${venueA.id}`)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.events).toHaveLength(1)
    expect(body.events[0].title).toBe('Show at A')
  })

  it('filters by startDate query param', async () => {
    const venue = await seedVenue()
    await seedEvent(venue.id, {
      title: 'Past Show',
      date: new Date('2026-01-01T20:00:00Z'),
    })
    await seedEvent(venue.id, {
      title: 'Future Show',
      date: new Date('2026-12-01T20:00:00Z'),
    })

    const res = await app.request('/v1/events?startDate=2026-06-01')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.events).toHaveLength(1)
    expect(body.events[0].title).toBe('Future Show')
  })

  it('respects the limit query param', async () => {
    const venue = await seedVenue()
    await seedEvent(venue.id, { title: 'Show 1' })
    await seedEvent(venue.id, { title: 'Show 2' })
    await seedEvent(venue.id, { title: 'Show 3' })

    const res = await app.request('/v1/events?limit=2')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.events).toHaveLength(2)
  })
})

describe('GET /v1/events/:id — integration', () => {
  beforeEach(async () => {
    await clearTables()
  })

  it('returns an event by id', async () => {
    const venue = await seedVenue({ name: 'Ogden Theatre', slug: 'ogden' })
    const event = await seedEvent(venue.id, { title: 'Jazz Night' })

    const res = await app.request(`/v1/events/${event.id}`)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.event.title).toBe('Jazz Night')
    expect(body.event.venue?.name).toBe('Ogden Theatre')
  })

  it('returns 404 for unknown id', async () => {
    const res = await app.request(
      '/v1/events/00000000-0000-0000-0000-000000000000',
    )
    expect(res.status).toBe(404)
  })
})
```

- [ ] **Step 2: Run integration tests**

```bash
DATABASE_URL_TEST=postgresql://postgres:postgres@localhost:5433/concert_crawl_test \
  pnpm --filter api test:integration
```

Expected: All tests PASS. If filters or joins differ from the real API response shape, adjust assertions to match — the test structure is correct even if field paths change.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/routes/events.integration.test.ts
git commit -m "test: add events endpoint integration tests"
```

---

## Task 7: Admin venues endpoint integration tests

**Files:**

- Create: `apps/api/src/routes/admin/venues.integration.test.ts`

This tests the RBAC layer against real DB data — the most valuable integration test since auth + DB interaction is where mocks fail silently.

- [ ] **Step 1: Write the test**

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest'

// vi.hoisted creates the shared auth state before any module imports.
// Each test configures authState.current to control what getAuth() returns.
const { authState } = vi.hoisted(() => ({
  authState: {
    current: null as {
      userId: string
      sessionClaims: { metadata?: { role?: string } }
    } | null,
  },
}))

vi.mock('@hono/clerk-auth', () => ({
  clerkMiddleware: () => async (_c: unknown, next: () => Promise<void>) =>
    next(),
  getAuth: () => authState.current,
}))

import { createApp } from '../../app.js'
import { clearTables, seedVenue } from '../../test/helpers/seed.js'

const app = createApp()

function setAuth(role: 'admin' | 'sub_admin' | 'user'): void {
  authState.current = {
    userId: 'test-user-1',
    sessionClaims: { metadata: { role } },
  }
}

function clearAuth(): void {
  authState.current = null
}

describe('GET /v1/admin/venues — integration', () => {
  beforeEach(async () => {
    clearAuth()
    await clearTables()
  })

  it('returns 401 when unauthenticated', async () => {
    const res = await app.request('/v1/admin/venues')
    expect(res.status).toBe(401)
  })

  it('returns 403 when authenticated as a regular user', async () => {
    setAuth('user')
    const res = await app.request('/v1/admin/venues')
    expect(res.status).toBe(403)
  })

  it('returns 200 and venue list when authenticated as admin', async () => {
    setAuth('admin')
    await seedVenue({ name: 'Admin Venue', slug: 'admin-venue' })

    const res = await app.request('/v1/admin/venues')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.venues).toHaveLength(1)
    expect(body.venues[0].name).toBe('Admin Venue')
  })

  it('returns all venues including inactive ones for admin', async () => {
    setAuth('admin')
    await seedVenue({ slug: 'active-venue', active: true })
    await seedVenue({ slug: 'inactive-venue', active: false })

    const res = await app.request('/v1/admin/venues')
    expect(res.status).toBe(200)
    const body = await res.json()
    // Admin endpoint should return all venues, not filter by active
    expect(body.venues).toHaveLength(2)
  })
})

describe('POST /v1/admin/venues — integration', () => {
  beforeEach(async () => {
    clearAuth()
    await clearTables()
  })

  it('returns 401 when unauthenticated', async () => {
    const res = await app.request('/v1/admin/venues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'New Venue',
        slug: 'new-venue',
        websiteUrl: 'https://example.com',
      }),
    })
    expect(res.status).toBe(401)
  })

  it('returns 400 on missing required fields', async () => {
    setAuth('admin')
    const res = await app.request('/v1/admin/venues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Incomplete Venue' }), // missing slug, websiteUrl
    })
    expect(res.status).toBe(400)
  })

  it('creates a venue and returns 201', async () => {
    setAuth('admin')
    const res = await app.request('/v1/admin/venues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Red Rocks Amphitheatre',
        slug: 'red-rocks',
        websiteUrl: 'https://redrocksonline.com',
        city: 'Morrison',
        state: 'CO',
        timezone: 'America/Denver',
      }),
    })
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.venue.name).toBe('Red Rocks Amphitheatre')
    expect(body.venue.slug).toBe('red-rocks')
    expect(body.venue.id).toBeDefined()
  })
})
```

- [ ] **Step 2: Run all integration tests**

```bash
DATABASE_URL_TEST=postgresql://postgres:postgres@localhost:5433/concert_crawl_test \
  pnpm --filter api test:integration
```

Expected: All tests PASS. If the `POST /v1/admin/venues` response shape differs (e.g. field is `data.venue` vs `venue`), check `apps/api/src/routes/admin/venues.ts` for the actual response structure and adjust assertions.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/routes/admin/venues.integration.test.ts
git commit -m "test: add admin venues integration tests with real auth RBAC"
```

---

## Task 8: Add integration test CI job

**Files:**

- Modify: `.github/workflows/ci.yml`

- [ ] **Step 1: Add the `integration-test` job to `ci.yml`**

Add this job after the existing `test` job (it runs in parallel with the other jobs, all waiting on `install`):

```yaml
integration-test:
  name: Integration Tests
  needs: install
  runs-on: ubuntu-latest
  timeout-minutes: 10
  services:
    postgres:
      image: postgres:16
      env:
        POSTGRES_DB: concert_crawl_test
        POSTGRES_USER: postgres
        POSTGRES_PASSWORD: postgres
      ports:
        - 5432:5432
      options: >-
        --health-cmd pg_isready
        --health-interval 10s
        --health-timeout 5s
        --health-retries 5
  steps:
    - name: Checkout
      uses: actions/checkout@v4
      with:
        fetch-depth: 2

    - name: Setup pnpm
      uses: pnpm/action-setup@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: 24
        cache: 'pnpm'

    - name: Install dependencies
      run: pnpm install --frozen-lockfile

    - name: Cache Turborepo
      uses: actions/cache@v4
      with:
        path: .turbo
        key: turbo-int-test-${{ runner.os }}-${{ github.sha }}
        restore-keys: turbo-int-test-${{ runner.os }}-

    - name: Run integration tests
      run: pnpm --filter api test:integration
      env:
        DATABASE_URL_TEST: postgresql://postgres:postgres@localhost:5432/concert_crawl_test
```

Note: CI uses port `5432` (Docker service), not `5433` (local dev Docker). The `DATABASE_URL_TEST` in `.env.example` uses `5433` for local use.

- [ ] **Step 2: Run all unit tests to confirm they still pass**

```bash
pnpm test
```

Expected: `PASS` — unit tests unaffected by the new integration config.

- [ ] **Step 3: Run the full integration suite one final time locally**

```bash
DATABASE_URL_TEST=postgresql://postgres:postgres@localhost:5433/concert_crawl_test \
  pnpm --filter api test:integration
```

Expected: All tests green. Count the number of tests and verify nothing was skipped.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add integration test job with postgres service"
```

---

## Task 9: Full validation and PR

- [ ] **Step 1: Run all checks**

```bash
pnpm typecheck && pnpm lint && pnpm test
```

Expected: All green.

- [ ] **Step 2: Run integration tests**

```bash
DATABASE_URL_TEST=postgresql://postgres:postgres@localhost:5433/concert_crawl_test \
  pnpm --filter api test:integration
```

Expected: All green. Note the test count — it should match the scenarios defined in Tasks 4–7.

- [ ] **Step 3: Push and open PR**

```bash
git push
gh pr create \
  --title "test: phase 6b — vitest integration tests with real postgres" \
  --body "$(cat .github/pull_request_template.md)"
```

Key PR validation checklist:

- [ ] Integration test CI job passes in GitHub Actions
- [ ] Unit tests still pass (no regressions)
- [ ] `pnpm typecheck` passes
- [ ] Integration tests cover: health, venues list/detail, events list/detail, admin auth RBAC
