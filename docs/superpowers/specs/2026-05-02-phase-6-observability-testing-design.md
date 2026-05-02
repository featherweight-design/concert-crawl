# Phase 6 — Observability + Testing Design

**Date:** 2026-05-02  
**Phase:** 6  
**Branch:** `feat/phase-6-observability-testing` (or sub-branches per PR)  
**Author:** Claude Code (brainstormed autonomously; user asleep — assumptions documented below)

---

## Goal

Add a full observability stack and a meaningful test harness to Concert Crawl. After this phase:

- Every API request and crawl run is structured-logged and traced
- Errors in any app surface in Sentry with environment context
- Integration tests hit a real Postgres instance in CI
- Playwright E2E runs against staging after every merge
- Hourly smoke tests run against production; failures trigger alerts

Milestone from spec: _Full observability stack live; smoke tests running; alerts firing correctly._

---

## Assumptions

These were made in lieu of user questions (user was unavailable). Flag any that need revision:

1. **OpenTelemetry scope**: Traces only — HTTP request spans + Postgres query spans in `apps/api`. No custom business metrics (reserved for Phase 7+ when crawl automation adds meaningful signal).
2. **Sentry scope**: Error tracking only. Performance monitoring disabled (stays on free tier).
3. **E2E is not a PR gate**: Staging isn't available at PR time. E2E runs post-merge as deploy verification. Unit + integration tests are the PR gate.
4. **Integration test auth**: Clerk middleware mocked at the transport layer (same as unit tests). Real DB, synthetic auth context. No real Clerk test tenant needed.
5. **Test DB**: Separate database `concert_crawl_test` in the Docker Postgres service. Environment variable `DATABASE_URL_TEST` points to it.
6. **Playwright test user**: Credentials stored as GitHub Actions secrets (`E2E_TEST_USER_EMAIL`, `E2E_TEST_USER_PASSWORD`). `storageState` reused across tests in a session.
7. **`apps/e2e/`**: New workspace app — all Playwright lives here (E2E + smoke). Not colocated with unit/integration tests.
8. **Grafana alert chain**: Smoke test failures are captured as Sentry events tagged `source: smoke-test`. Grafana alert fires on new Sentry issues matching that tag. No direct OTLP→Grafana alert needed.
9. **`packages/logger`**: New shared package. Both `apps/api` and `apps/crawler` import from it. Avoids duplicating Pino config.

---

## PR Decomposition

Three focused PRs, shipped in order:

| PR  | Name              | Depends on                              |
| --- | ----------------- | --------------------------------------- |
| 6a  | Observability SDK | —                                       |
| 6b  | Integration Tests | 6a (Pino in API)                        |
| 6c  | E2E + Smoke Tests | 6a (Sentry for smoke failure reporting) |

PRs 6b and 6c can be parallelized after 6a merges.

---

## PR 6a — Observability SDK

### 1. Pino Structured Logging

**New package: `packages/logger`**

```
packages/logger/
  src/
    index.ts          # exports createLogger(name: string) → pino.Logger
    middleware.ts     # Hono request logger middleware
  package.json
  tsconfig.json
```

`createLogger(name)` returns a Pino instance configured by environment:

- `NODE_ENV !== 'production'` → `pino-pretty` transport (human-readable, colorized)
- `NODE_ENV === 'production'` → raw JSON to stdout (Render captures it)
- Log level from `LOG_LEVEL` env var, defaulting to `info`

Child logger per request: `logger.child({ requestId })` — propagated via Hono context.

**`apps/api` changes:**

- Remove `hono/logger` import from `app.ts`
- Replace with `packages/logger` Hono middleware: logs `{ requestId, method, path, status, durationMs }` on response
- `src/index.ts` → `console.warn` replaced with `apiLogger.info(...)`
- Request ID injected via `crypto.randomUUID()` in middleware, stored on `c.set('requestId', id)`

**`apps/crawler` changes:**

- Replace `console.log/warn/error` calls with Pino logger (import from `packages/logger`)
- Log shape: `{ requestId?, venueId, venueSlug, event: 'crawl_start' | 'crawl_success' | 'crawl_failure', durationMs?, errorMessage? }`

### 2. Sentry Error Tracking

**`apps/api`:**

`src/instrument.ts` — must be the first import in `src/index.ts` (Node.js `--import` flag in `package.json` dev/start scripts, or top-of-file import since it's CJS-compatible):

```ts
import * as Sentry from '@sentry/node'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT ?? 'local',
  tracesSampleRate: 0, // traces handled by OTEL, not Sentry
})
```

Hono error handler in `app.ts`:

```ts
app.onError((err, c) => {
  Sentry.captureException(err, { extra: { requestId: c.get('requestId') } })
  return c.json({ error: 'Internal server error' }, 500)
})
```

Catch blocks in route handlers: add `Sentry.captureException(err)` before `logger.error(err)`.

**`apps/web`:**

`next.config.ts` wrapped with `withSentryConfig`. `sentry.client.config.ts` + `sentry.server.config.ts` + `sentry.edge.config.ts` per Next.js SDK conventions. Source maps uploaded via `@sentry/nextjs` build plugin.

`NEXT_PUBLIC_SENTRY_DSN` added to `.env.example` for web (client-side DSN is safe to expose).

**`apps/crawler`:**

Same pattern as API: `instrument.ts` + `Sentry.init()` at crawler entry point. Captures crawl run failures with `{ venueId, venueSlug }` as Sentry context.

**Shared env vars** (all already in `.env.example`, just need real values in Render):

- `SENTRY_DSN`
- `SENTRY_ENVIRONMENT` (set to `staging` / `production` in Render env groups)

### 3. OpenTelemetry → Grafana Cloud

**`apps/api` only** (web and crawler traces not worth the overhead at this stage).

`src/instrument.ts` extended (runs before app boot, same file as Sentry init):

```ts
import { NodeSDK } from '@opentelemetry/sdk-node'
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { Resource } from '@opentelemetry/resources'
// Note: SEMRESATTRS_* constants are deprecated in newer @opentelemetry/semantic-conventions.
// Use string literals to avoid the deprecation warnings:
const sdk = new NodeSDK({
  resource: new Resource({
    'service.name': 'concert-crawl-api',
    'deployment.environment': process.env.SENTRY_ENVIRONMENT ?? 'local',
  }),
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
    headers: {
      Authorization: `Basic ${process.env.OTEL_EXPORTER_OTLP_HEADERS}`,
    },
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-fs': { enabled: false }, // too noisy
    }),
  ],
})

sdk.start()
```

OTEL is only active when `OTEL_EXPORTER_OTLP_ENDPOINT` is set — safe to leave unset in local dev.

New `.env.example` entries for API:

```
OTEL_EXPORTER_OTLP_ENDPOINT=          # Grafana Cloud OTLP endpoint
OTEL_EXPORTER_OTLP_HEADERS=           # base64(instanceId:apiToken)
```

### 4. New package.json entries (`packages/logger`)

Added to `pnpm-workspace.yaml` (if not auto-detected) and `turbo.json` pipeline.

---

## PR 6b — Integration Tests

### Problem

All existing API tests mock Drizzle and `drizzle-orm`. Query construction bugs, schema mismatches, and join errors are invisible. The current test suite gives false confidence.

### Approach

Separate Vitest project for integration tests. Unit tests (`vitest.config.ts`) remain untouched and fast. Integration tests (`vitest.integration.ts`) require a running Postgres instance.

### File Structure

```
apps/api/
  vitest.config.ts              # unchanged — unit tests, mocked DB
  vitest.integration.ts         # new — integration project, real DB
  src/
    test/
      helpers/
        db.ts                   # getTestDb() → Drizzle instance pointed at test DB
        seed.ts                 # seedVenue(), seedEvent(), seedUser(), clearTables()
      setup/
        global-setup.ts         # runs migrations on concert_crawl_test before suite
    routes/
      events.integration.test.ts
      venues-public.integration.test.ts
      health.integration.test.ts
      admin/
        venues.integration.test.ts
```

### Test DB Config

`vitest.integration.ts`:

```ts
import { defineConfig } from 'vitest/config'
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    globalSetup: './src/test/setup/global-setup.ts',
    testMatch: ['**/*.integration.test.ts'],
    poolOptions: { forks: { singleFork: true } }, // avoid parallel DB conflicts
  },
})
```

`global-setup.ts` runs `drizzle-kit migrate` against `DATABASE_URL_TEST`. If migration fails, suite aborts with a clear message.

`clearTables()` in `beforeEach`: truncates `events`, `venues`, `crawl_runs` in reverse dependency order. `users` and `audit_log` truncated selectively.

### Auth in Integration Tests

Clerk middleware is mocked at the Hono app level — same `vi.mock('@hono/clerk-auth', ...)` pattern as unit tests. Integration tests inject auth context via a helper:

```ts
// test helper
function makeAuthHeaders(role: Role = 'user') {
  return { 'x-test-user-id': 'test-user-1', 'x-test-role': role }
}
```

The mock reads these headers and populates `c.get('authUser')`. No real Clerk tokens needed.

### Coverage

| Endpoint                | Scenarios                                                                                                     |
| ----------------------- | ------------------------------------------------------------------------------------------------------------- |
| `GET /v1/events`        | Returns paginated list; filters by `venueId`, `startDate`, `endDate`, `search`; respects `limit` and `cursor` |
| `GET /v1/events/:id`    | Returns event + venue join; 404 on unknown ID                                                                 |
| `GET /v1/venues`        | Returns only `active: true` venues                                                                            |
| `GET /v1/venues/:slug`  | Returns venue + event count; 404 on unknown slug                                                              |
| `GET /v1/health`        | 200 `{ status: "ok" }`                                                                                        |
| `GET /v1/admin/venues`  | 401 without auth header; 403 for `role: 'user'`; 200 for `role: 'admin'`                                      |
| `POST /v1/admin/venues` | Creates venue, returns 201 with new record; 400 on invalid body                                               |

### New Scripts (`apps/api/package.json`)

```json
"test:integration": "vitest run --config vitest.integration.ts",
"test:all": "vitest run && vitest run --config vitest.integration.ts"
```

### CI Job (`ci.yml` addition)

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
      ports: ['5432:5432']
      options: >-
        --health-cmd pg_isready
        --health-interval 10s
        --health-timeout 5s
        --health-retries 5
  steps:
    - uses: actions/checkout@v4
    - uses: pnpm/action-setup@v4
    - uses: actions/setup-node@v4
      with: { node-version: 24, cache: 'pnpm' }
    - run: pnpm install --frozen-lockfile
    - name: Cache Turborepo
      uses: actions/cache@v4
      with:
        path: .turbo
        key: turbo-int-test-${{ runner.os }}-${{ github.sha }}
        restore-keys: turbo-int-test-${{ runner.os }}-
    - run: pnpm --filter api test:integration
      env:
        DATABASE_URL_TEST: postgresql://postgres:postgres@localhost:5432/concert_crawl_test
```

---

## PR 6c — E2E + Smoke Tests

### New Workspace App: `apps/e2e/`

```
apps/e2e/
  package.json
  tsconfig.json
  playwright.config.ts           # staging E2E config
  playwright.smoke.config.ts     # prod smoke config
  src/
    e2e/
      browse.spec.ts
      event-detail.spec.ts
      venue-detail.spec.ts
      auth.spec.ts
    smoke/
      critical-path.spec.ts
    fixtures/
      auth.ts                    # storageState setup — signs in once, saves to file
    helpers/
      api.ts                     # direct API calls for test setup/assertions
```

`apps/e2e/package.json`:

```json
{
  "name": "@concert-crawl/e2e",
  "private": true,
  "scripts": {
    "test:e2e": "playwright test --config playwright.config.ts",
    "test:smoke": "playwright test --config playwright.smoke.config.ts",
    "install-browsers": "playwright install --with-deps chromium"
  },
  "devDependencies": {
    "@playwright/test": "^1.44.0",
    "@sentry/node": "^8.0.0"
  }
}
```

### Playwright Configs

`playwright.config.ts` (staging E2E):

```ts
export default defineConfig({
  testDir: './src/e2e',
  baseURL:
    process.env.PLAYWRIGHT_BASE_URL ??
    'https://concert-crawl-web-staging.onrender.com',
  use: {
    storageState: '.auth/user.json',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  globalSetup: './src/fixtures/auth.ts',
  retries: 2,
  timeout: 30_000,
})
```

`playwright.smoke.config.ts` (prod smoke):

```ts
export default defineConfig({
  testDir: './src/smoke',
  baseURL: process.env.PLAYWRIGHT_SMOKE_BASE_URL ?? 'https://concertcrawl.app',
  use: { screenshot: 'only-on-failure' },
  retries: 1,
  timeout: 15_000,
})
```

### E2E Test Scenarios (staging)

| File                   | Tests                                                                                                                                 |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `browse.spec.ts`       | Browse page loads; event cards render; venue filter chip updates list; date range picker updates results; Load More fetches next page |
| `event-detail.spec.ts` | Event detail page renders title, venue name, date; back navigation works                                                              |
| `venue-detail.spec.ts` | Venue detail renders name and event list                                                                                              |
| `auth.spec.ts`         | `/admin` redirects to Clerk sign-in for unauthenticated user; authenticated user reaches admin dashboard                              |

### Smoke Test Scenarios (prod, hourly)

`src/smoke/critical-path.spec.ts`:

| Test                                         | Signal                                         |
| -------------------------------------------- | ---------------------------------------------- |
| Homepage renders `<h1>`                      | App is up, JS hydrates                         |
| `GET /v1/health` → 200 `{ status: "ok" }`    | API is up                                      |
| Browse page has ≥1 event card                | DB is live and seeded                          |
| Venue filter chip produces non-empty results | Filter logic works                             |
| `/admin` redirects unauthenticated user      | Auth gate active                               |
| Known venue slug page loads                  | Data freshness (e.g. `/venues/larimer-lounge`) |

On failure, Sentry captures the error with tags `{ source: 'smoke-test', environment: 'production' }`. Grafana alert fires on new Sentry issues matching those tags.

### GitHub Actions Workflows

**`staging-e2e.yml`** — triggered on push to `main`:

```yaml
name: Staging E2E
on:
  push:
    branches: [main]
jobs:
  e2e:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 24, cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - name: Cache Playwright browsers
        uses: actions/cache@v4
        with:
          path: ~/.cache/ms-playwright
          key: playwright-${{ runner.os }}-${{ hashFiles('**/package.json') }}
          restore-keys: playwright-${{ runner.os }}-
      - run: pnpm --filter e2e install-browsers
      - name: Wait for Render deploy
        run: sleep 180 # 3 min — Render typically deploys in 2-4 min
      - run: pnpm --filter e2e test:e2e
        env:
          PLAYWRIGHT_BASE_URL: ${{ vars.STAGING_URL }}
          E2E_TEST_USER_EMAIL: ${{ secrets.E2E_TEST_USER_EMAIL }}
          E2E_TEST_USER_PASSWORD: ${{ secrets.E2E_TEST_USER_PASSWORD }}
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: e2e-failure-artifacts
          path: apps/e2e/test-results/
```

**`smoke.yml`** — hourly cron:

```yaml
name: Production Smoke Tests
on:
  schedule:
    - cron: '0 * * * *'
  workflow_dispatch: # manual trigger for testing
jobs:
  smoke:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 24, cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - name: Cache Playwright browsers
        uses: actions/cache@v4
        with:
          path: ~/.cache/ms-playwright
          key: playwright-${{ runner.os }}-${{ hashFiles('**/package.json') }}
      - run: pnpm --filter e2e install-browsers
      - run: pnpm --filter e2e test:smoke
        env:
          PLAYWRIGHT_SMOKE_BASE_URL: ${{ vars.PROD_URL }}
          SENTRY_DSN: ${{ secrets.SENTRY_DSN_E2E }}
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: smoke-failure-artifacts
          path: apps/e2e/test-results/
          retention-days: 3
```

---

## External Service Setup (no code — ops checklist)

Complete these before or alongside PR 6a. Values go into Render environment groups.

### Sentry

1. Create Sentry organization (free tier)
2. Create three projects: `concert-crawl-api`, `concert-crawl-web`, `concert-crawl-crawler`
3. Copy DSNs to:
   - Render `staging` env group: `SENTRY_DSN` (per service), `SENTRY_ENVIRONMENT=staging`
   - Render `production` env group: `SENTRY_DSN` (per service), `SENTRY_ENVIRONMENT=production`
4. Configure source map upload: API and web build steps (`SENTRY_AUTH_TOKEN` as secret)
5. Create alert: new issue in any project → notify via email

### Grafana Cloud

1. Create free account at grafana.com
2. Create stack, note OTLP endpoint URL + instance ID + API token
3. Add to Render `staging` and `production` env groups:
   - `OTEL_EXPORTER_OTLP_ENDPOINT`
   - `OTEL_EXPORTER_OTLP_HEADERS` (base64 of `instanceId:apiToken`)
4. Create alert in Grafana: new Sentry issue with tag `source=smoke-test` → notify via email
   - Connect via Sentry webhook (Sentry → Settings → Integrations → Webhooks → Grafana)

### UptimeRobot

1. Create free account
2. Add HTTP monitor: `GET https://concertcrawl.app` — 5-min interval
3. Add HTTP monitor: `GET https://concert-crawl-api.onrender.com/v1/health` — 5-min interval
4. Alert contacts: email on down/up transitions

### GitHub Secrets / Vars (needed for CI)

| Key                      | Type   | Description                                                                                                                                                          |
| ------------------------ | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `E2E_TEST_USER_EMAIL`    | Secret | Clerk test user email for E2E                                                                                                                                        |
| `E2E_TEST_USER_PASSWORD` | Secret | Clerk test user password                                                                                                                                             |
| `SENTRY_DSN_E2E`         | Secret | Sentry DSN for smoke test error reporting (use the `concert-crawl-web` project DSN, or create a dedicated `concert-crawl-e2e` project for cleaner signal separation) |
| `STAGING_URL`            | Var    | `https://concert-crawl-web-staging.onrender.com`                                                                                                                     |
| `PROD_URL`               | Var    | `https://concertcrawl.app`                                                                                                                                           |

---

## Milestone Criteria

Phase 6 is complete when all of the following are true:

- [ ] `pnpm --filter api dev` shows structured JSON (or pretty-printed) Pino logs
- [ ] A deliberate `throw new Error()` in an API route appears in Sentry within 60 seconds
- [ ] OpenTelemetry traces from the API appear in Grafana Cloud
- [ ] `pnpm --filter api test:integration` passes against a local test DB
- [ ] Integration test CI job is green on a PR
- [ ] Playwright E2E suite passes against staging after a merge to `main`
- [ ] Smoke tests pass against production
- [ ] A manually triggered smoke test failure creates a Sentry event
- [ ] UptimeRobot monitors are green

---

## Appendix: `.env.example` Additions

**`apps/api/.env.example`** (new entries):

```
LOG_LEVEL=info
SENTRY_DSN=
SENTRY_ENVIRONMENT=local
OTEL_EXPORTER_OTLP_ENDPOINT=
OTEL_EXPORTER_OTLP_HEADERS=
DATABASE_URL_TEST=postgresql://postgres:postgres@localhost:5432/concert_crawl_test
```

**`apps/web/.env.example`** (new entries):

```
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_DSN=
SENTRY_ENVIRONMENT=local
SENTRY_AUTH_TOKEN=
```

**`apps/crawler/.env.example`** (new entries):

```
LOG_LEVEL=info
SENTRY_DSN=
SENTRY_ENVIRONMENT=local
```
