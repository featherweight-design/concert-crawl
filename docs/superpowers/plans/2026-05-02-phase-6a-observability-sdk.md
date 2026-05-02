# Phase 6a — Observability SDK Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Pino structured logging and Sentry error tracking + traces to `apps/api`, `apps/web`, and `apps/crawler` via a shared `packages/logger` package.

**Architecture:** A new `packages/logger` workspace package exports `createLogger()` and a Hono request-logger middleware. `apps/api` imports from it, replacing `hono/logger`. Sentry is initialized in each app via a dedicated `instrument.ts` file imported before all other code. Sentry's built-in performance tracing (`tracesSampleRate: 0.1`) is used for distributed traces — no separate OpenTelemetry SDK or Grafana Cloud account needed.

**Tech Stack:** `pino@^9`, `pino-pretty@^11`, `@sentry/node@^8`, `@sentry/nextjs@^8`

---

## File Map

**Create:**

- `packages/logger/package.json`
- `packages/logger/tsconfig.json`
- `packages/logger/vitest.config.ts`
- `packages/logger/src/index.ts` — `createLogger()` + `ContextVariableMap` augmentation
- `packages/logger/src/middleware.ts` — `requestLogger()` Hono middleware
- `packages/logger/src/index.test.ts`
- `packages/logger/src/middleware.test.ts`
- `apps/api/src/instrument.ts` — Sentry init with tracing enabled (imported first)
- `apps/api/src/lib/logger.ts` — `apiLogger` singleton
- `apps/web/sentry.client.config.ts`
- `apps/web/sentry.server.config.ts`
- `apps/web/sentry.edge.config.ts`
- `apps/crawler/src/instrument.ts` — Sentry init for crawler

**Modify:**

- `apps/api/src/app.ts` — replace `hono/logger`, add `requestLogger`, add `onError` Sentry handler
- `apps/api/src/index.ts` — add `import './instrument.js'` as first import; replace `console.warn` with `apiLogger`
- `apps/api/package.json` — add `@concert-crawl/logger`, `@sentry/node`
- `apps/api/.env.example` — add `LOG_LEVEL`, `SENTRY_ENVIRONMENT`
- `apps/web/next.config.ts` — wrap with `withSentryConfig`
- `apps/web/package.json` — add `@sentry/nextjs`
- `apps/web/.env.example` — add `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ENVIRONMENT`, `SENTRY_AUTH_TOKEN`
- `apps/crawler/src/index.ts` — add `import './instrument.js'`; replace `console.warn`
- `apps/crawler/package.json` — add `@concert-crawl/logger`, `@sentry/node`
- `apps/crawler/.env.example` — add `LOG_LEVEL`, `SENTRY_ENVIRONMENT`

---

## Task 1: Scaffold `packages/logger`

**Files:**

- Create: `packages/logger/package.json`
- Create: `packages/logger/tsconfig.json`
- Create: `packages/logger/vitest.config.ts`

- [ ] **Step 1: Create `packages/logger/package.json`**

```json
{
  "name": "@concert-crawl/logger",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "lint": "eslint src/",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "pino": "^9.0.0",
    "pino-pretty": "^11.0.0"
  },
  "peerDependencies": {
    "hono": "^4.0.0"
  },
  "devDependencies": {
    "@concert-crawl/config": "workspace:*",
    "hono": "^4.6.0",
    "vitest": "^2.0.0"
  }
}
```

- [ ] **Step 2: Create `packages/logger/tsconfig.json`**

```json
{
  "extends": "@concert-crawl/config/tsconfig",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["dist", "node_modules", "**/*.test.ts"]
}
```

- [ ] **Step 3: Create `packages/logger/vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
})
```

- [ ] **Step 4: Install dependencies**

```bash
pnpm install
```

Expected: pnpm resolves `pino` and `pino-pretty` into `packages/logger/node_modules`.

---

## Task 2: Implement `createLogger`

**Files:**

- Create: `packages/logger/src/index.ts`
- Create: `packages/logger/src/index.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/logger/src/index.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createLogger } from './index.js'

describe('createLogger', () => {
  beforeEach(() => {
    delete process.env['LOG_LEVEL']
  })

  afterEach(() => {
    delete process.env['LOG_LEVEL']
  })

  it('returns a logger with standard methods', () => {
    const logger = createLogger('test')
    expect(typeof logger.info).toBe('function')
    expect(typeof logger.error).toBe('function')
    expect(typeof logger.warn).toBe('function')
    expect(typeof logger.debug).toBe('function')
  })

  it('defaults to info log level', () => {
    const logger = createLogger('test')
    expect(logger.level).toBe('info')
  })

  it('respects LOG_LEVEL env var', () => {
    process.env['LOG_LEVEL'] = 'debug'
    const logger = createLogger('test')
    expect(logger.level).toBe('debug')
  })

  it('includes the name binding', () => {
    const logger = createLogger('api')
    expect(logger.bindings().name).toBe('api')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter @concert-crawl/logger test
```

Expected: `FAIL` — `Cannot find module './index.js'`

- [ ] **Step 3: Create `packages/logger/src/index.ts`**

```ts
import pino, { type Logger } from 'pino'

// Extend Hono's context type map so c.get('requestId') is typed everywhere.
declare module 'hono' {
  interface ContextVariableMap {
    requestId: string
  }
}

export type { Logger }

export function createLogger(name: string): Logger {
  const level = process.env['LOG_LEVEL'] ?? 'info'

  // Skip pretty-printing in tests (avoids worker thread spawning issues)
  // and in production (raw JSON is captured by Render's log aggregator).
  const isProduction = process.env['NODE_ENV'] === 'production'
  const isTest = process.env['NODE_ENV'] === 'test'

  const transport =
    !isProduction && !isTest
      ? pino.transport({ target: 'pino-pretty', options: { colorize: true } })
      : undefined

  return pino({ name, level }, transport)
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm --filter @concert-crawl/logger test
```

Expected: `PASS` — all 4 tests green.

- [ ] **Step 5: Commit**

```bash
git add packages/logger/
git commit -m "feat: scaffold packages/logger with createLogger"
```

---

## Task 3: Implement `requestLogger` Hono middleware

**Files:**

- Create: `packages/logger/src/middleware.ts`
- Create: `packages/logger/src/middleware.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/logger/src/middleware.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { Hono } from 'hono'
import { createLogger } from './index.js'
import { requestLogger } from './middleware.js'

describe('requestLogger', () => {
  const logger = createLogger('test')

  it('calls next() and returns the response', async () => {
    const app = new Hono()
    app.use(requestLogger(logger))
    app.get('/ping', (c) => c.json({ ok: true }))

    const res = await app.request('/ping')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
  })

  it('attaches a UUID requestId to the context', async () => {
    const app = new Hono()
    let capturedId: string | undefined

    app.use(requestLogger(logger))
    app.get('/ping', (c) => {
      capturedId = c.get('requestId')
      return c.json({ ok: true })
    })

    await app.request('/ping')
    expect(capturedId).toBeDefined()
    // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    expect(capturedId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    )
  })

  it('does not overwrite an existing requestId', async () => {
    const app = new Hono()
    let capturedId: string | undefined

    app.use(async (c, next) => {
      c.set('requestId', 'preset-id')
      await next()
    })
    app.use(requestLogger(logger))
    app.get('/ping', (c) => {
      capturedId = c.get('requestId')
      return c.json({ ok: true })
    })

    await app.request('/ping')
    expect(capturedId).toBe('preset-id')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter @concert-crawl/logger test
```

Expected: `FAIL` — `Cannot find module './middleware.js'`

- [ ] **Step 3: Create `packages/logger/src/middleware.ts`**

```ts
import type { MiddlewareHandler } from 'hono'
import type { Logger } from 'pino'

export function requestLogger(logger: Logger): MiddlewareHandler {
  return async (c, next) => {
    // Preserve any requestId set by upstream middleware (e.g. a gateway)
    if (!c.get('requestId')) {
      c.set('requestId', crypto.randomUUID())
    }

    const start = Date.now()
    await next()
    const durationMs = Date.now() - start

    logger.info({
      requestId: c.get('requestId'),
      method: c.req.method,
      path: c.req.path,
      status: c.res.status,
      durationMs,
    })
  }
}
```

- [ ] **Step 4: Run all tests to verify they pass**

```bash
pnpm --filter @concert-crawl/logger test
```

Expected: `PASS` — all 7 tests green.

- [ ] **Step 5: Commit**

```bash
git add packages/logger/src/middleware.ts packages/logger/src/middleware.test.ts
git commit -m "feat: add requestLogger hono middleware to packages/logger"
```

---

## Task 4: Build `packages/logger` and wire into `apps/api`

**Files:**

- Modify: `apps/api/package.json`
- Create: `apps/api/src/lib/logger.ts`
- Modify: `apps/api/src/app.ts`

- [ ] **Step 1: Build the logger package**

```bash
pnpm --filter @concert-crawl/logger build
```

Expected: `packages/logger/dist/` created with `index.js`, `index.d.ts`, `middleware.js`, `middleware.d.ts`.

- [ ] **Step 2: Add `@concert-crawl/logger` to `apps/api/package.json`**

In `apps/api/package.json`, add to `"dependencies"`:

```json
"@concert-crawl/logger": "workspace:*"
```

Then run:

```bash
pnpm install
```

- [ ] **Step 3: Create `apps/api/src/lib/logger.ts`**

```ts
import { createLogger } from '@concert-crawl/logger'

export const apiLogger = createLogger('api')
```

- [ ] **Step 4: Update `apps/api/src/app.ts`**

Replace the existing `hono/logger` import and usage with `requestLogger` from `@concert-crawl/logger`:

```ts
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { requestLogger } from '@concert-crawl/logger'
import { registerRoutes } from './routes/index.js'
import { apiLogger } from './lib/logger.js'

export function createApp() {
  const app = new Hono()

  app.use('*', requestLogger(apiLogger))
  app.use(
    '*',
    cors({
      origin: process.env['ALLOWED_ORIGIN'] ?? 'http://localhost:3000',
      credentials: true,
    }),
  )

  registerRoutes(app)

  return app
}
```

- [ ] **Step 5: Run existing unit tests to confirm nothing regressed**

```bash
pnpm --filter api test
```

Expected: `PASS` — all existing tests still pass (they mock `@hono/clerk-auth` and `@concert-crawl/db`, not `@concert-crawl/logger`, so no change needed).

- [ ] **Step 6: Commit**

```bash
git add apps/api/package.json apps/api/src/lib/logger.ts apps/api/src/app.ts pnpm-lock.yaml
git commit -m "feat: replace hono/logger with pino requestLogger in apps/api"
```

---

## Task 5: Add Sentry to `apps/api`

**Files:**

- Create: `apps/api/src/instrument.ts`
- Modify: `apps/api/src/index.ts`
- Modify: `apps/api/src/app.ts`
- Modify: `apps/api/package.json`
- Modify: `apps/api/.env.example`

- [ ] **Step 1: Install dependencies**

```bash
pnpm add @sentry/node --filter api
```

Expected: package added to `apps/api/package.json` dependencies.

- [ ] **Step 2: Create `apps/api/src/instrument.ts`**

This file must be imported before all other app code so Sentry can instrument modules at load time.

```ts
import * as Sentry from '@sentry/node'

Sentry.init({
  dsn: process.env['SENTRY_DSN'],
  environment: process.env['SENTRY_ENVIRONMENT'] ?? 'local',
  // Sample 10% of traces in production. Sentry's built-in tracing handles
  // distributed traces — no separate OTEL SDK needed.
  tracesSampleRate: 0.1,
})
```

- [ ] **Step 3: Update `apps/api/src/index.ts`**

The `instrument.ts` import must be the very first line so Sentry and OTEL patch modules before they load.

```ts
import './instrument.js'
import { serve } from '@hono/node-server'
import { createApp } from './app.js'
import { env } from './env.js'
import { apiLogger } from './lib/logger.js'

const app = createApp()

serve(
  {
    fetch: app.fetch,
    port: env.PORT,
  },
  () => {
    apiLogger.info({ port: env.PORT }, '🎸 Concert Crawl API running')
  },
)
```

- [ ] **Step 4: Add Sentry error handler to `apps/api/src/app.ts`**

Add `onError` handler after `registerRoutes`. Import Sentry at the top of `app.ts`:

```ts
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import * as Sentry from '@sentry/node'
import { requestLogger } from '@concert-crawl/logger'
import { registerRoutes } from './routes/index.js'
import { apiLogger } from './lib/logger.js'

export function createApp() {
  const app = new Hono()

  app.use('*', requestLogger(apiLogger))
  app.use(
    '*',
    cors({
      origin: process.env['ALLOWED_ORIGIN'] ?? 'http://localhost:3000',
      credentials: true,
    }),
  )

  registerRoutes(app)

  app.onError((err, c) => {
    Sentry.captureException(err, {
      extra: { requestId: c.get('requestId') },
    })
    apiLogger.error({ err, requestId: c.get('requestId') }, 'Unhandled error')
    return c.json({ success: false, error: 'Internal server error' }, 500)
  })

  return app
}
```

- [ ] **Step 5: Update `apps/api/.env.example`**

Add below the existing `SENTRY_DSN` line:

```
SENTRY_ENVIRONMENT=local

# Logging
LOG_LEVEL=info

# Integration testing
DATABASE_URL_TEST=postgresql://postgres:postgres@localhost:5433/concert_crawl_test
```

- [ ] **Step 6: Run typecheck**

```bash
pnpm --filter api typecheck
```

Expected: `0 errors`.

- [ ] **Step 7: Run unit tests**

```bash
pnpm --filter api test
```

Expected: `PASS` — existing tests unaffected.

- [ ] **Step 8: Start the API and verify Pino logs appear**

```bash
pnpm --filter api dev
```

In another terminal:

```bash
curl http://localhost:3001/v1/health
```

Expected: Pino JSON output (or pretty-printed in dev) appears in the API terminal with `requestId`, `method`, `path`, `status`, `durationMs` fields.

- [ ] **Step 9: Commit**

```bash
git add apps/api/src/instrument.ts apps/api/src/index.ts apps/api/src/app.ts apps/api/package.json apps/api/.env.example pnpm-lock.yaml
git commit -m "feat: add sentry instrumentation to apps/api"
```

---

## Task 6: Add Sentry to `apps/web`

**Files:**

- Modify: `apps/web/package.json`
- Create: `apps/web/sentry.client.config.ts`
- Create: `apps/web/sentry.server.config.ts`
- Create: `apps/web/sentry.edge.config.ts`
- Modify: `apps/web/next.config.ts`
- Modify: `apps/web/.env.example`

- [ ] **Step 1: Install `@sentry/nextjs`**

```bash
pnpm add @sentry/nextjs --filter web
```

- [ ] **Step 2: Create `apps/web/sentry.client.config.ts`**

```ts
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env['NEXT_PUBLIC_SENTRY_DSN'],
  environment: process.env['NEXT_PUBLIC_SENTRY_ENVIRONMENT'] ?? 'local',
  tracesSampleRate: 0.1,
})
```

- [ ] **Step 3: Create `apps/web/sentry.server.config.ts`**

```ts
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env['SENTRY_DSN'],
  environment: process.env['SENTRY_ENVIRONMENT'] ?? 'local',
  tracesSampleRate: 0.1,
})
```

- [ ] **Step 4: Create `apps/web/sentry.edge.config.ts`**

```ts
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env['SENTRY_DSN'],
  environment: process.env['SENTRY_ENVIRONMENT'] ?? 'local',
  tracesSampleRate: 0.1,
})
```

- [ ] **Step 5: Update `apps/web/next.config.ts`**

```ts
import type { NextConfig } from 'next'
import { withSentryConfig } from '@sentry/nextjs'

const config: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@concert-crawl/types'],
}

export default withSentryConfig(config, {
  org: 'concert-crawl',
  project: 'concert-crawl-web',
  // Suppress output locally; print in CI for source map upload confirmation
  silent: !process.env['CI'],
  widenClientFileUpload: true,
  hideSourceMaps: true,
  disableLogger: true,
  automaticVercelMonitors: false,
})
```

Note: `org` and `project` must match what you create in the Sentry dashboard (see external service setup in the design spec).

- [ ] **Step 6: Update `apps/web/.env.example`**

Add below the existing `SENTRY_DSN` line:

```
NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...
NEXT_PUBLIC_SENTRY_ENVIRONMENT=local
SENTRY_ENVIRONMENT=local
SENTRY_AUTH_TOKEN=
```

Note: `NEXT_PUBLIC_SENTRY_DSN` is safe to expose client-side (it's a publishable key, not a secret).

- [ ] **Step 7: Run web build to verify Sentry integration compiles**

```bash
pnpm --filter web build
```

Expected: Build succeeds. Without `SENTRY_AUTH_TOKEN` set, source maps won't upload (fine for local dev). The `silent: !process.env.CI` flag suppresses the upload warning locally.

- [ ] **Step 8: Run web unit tests**

```bash
pnpm --filter web test
```

Expected: `PASS` — existing tests unaffected.

- [ ] **Step 9: Commit**

```bash
git add apps/web/sentry.client.config.ts apps/web/sentry.server.config.ts apps/web/sentry.edge.config.ts apps/web/next.config.ts apps/web/package.json apps/web/.env.example pnpm-lock.yaml
git commit -m "feat: add sentry error tracking to apps/web"
```

---

## Task 7: Add Sentry + Pino to `apps/crawler`

**Files:**

- Modify: `apps/crawler/package.json`
- Create: `apps/crawler/src/instrument.ts`
- Modify: `apps/crawler/src/index.ts`
- Modify: `apps/crawler/.env.example`

Note: The crawler is currently a stub (`console.warn` + `process.exit`). This task instruments the stub; Phase 7 will implement real crawler logic using the logger established here.

- [ ] **Step 1: Install dependencies**

```bash
pnpm add @sentry/node @concert-crawl/logger --filter crawler
```

- [ ] **Step 2: Create `apps/crawler/src/instrument.ts`**

```ts
import * as Sentry from '@sentry/node'

Sentry.init({
  dsn: process.env['SENTRY_DSN'],
  environment: process.env['SENTRY_ENVIRONMENT'] ?? 'local',
  tracesSampleRate: 0.1,
})
```

- [ ] **Step 3: Update `apps/crawler/src/index.ts`**

```ts
import './instrument.js'
import { createLogger } from '@concert-crawl/logger'

const logger = createLogger('crawler')

// Crawler stub — implemented in Phase 7 (Automation + Scheduling)
logger.warn('Concert Crawl crawler — not yet implemented. Coming in Phase 7.')
process.exit(0)
```

- [ ] **Step 4: Update `apps/crawler/.env.example`**

Check if `.env.example` exists; if not, create it. Add:

```
# Database
DATABASE_URL=postgres://user:password@localhost:5433/concert_crawl_db

# Anthropic (LLM extraction)
ANTHROPIC_API_KEY=sk-ant-...

# Sentry
SENTRY_DSN=https://...@sentry.io/...
SENTRY_ENVIRONMENT=local

# Logging
LOG_LEVEL=info
```

- [ ] **Step 5: Verify crawler starts without error**

```bash
pnpm --filter crawler start
```

Expected: Pino log line: `{"level":40,"time":...,"name":"crawler","msg":"Concert Crawl crawler — not yet implemented. Coming in Phase 7."}` then process exits with code 0.

- [ ] **Step 6: Run typecheck across all workspaces**

```bash
pnpm typecheck
```

Expected: `0 errors` across all packages.

- [ ] **Step 7: Commit**

```bash
git add apps/crawler/src/instrument.ts apps/crawler/src/index.ts apps/crawler/package.json apps/crawler/.env.example pnpm-lock.yaml
git commit -m "feat: add sentry + pino to apps/crawler"
```

---

## Task 8: Full validation and PR

- [ ] **Step 1: Run all checks from repo root**

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

Expected: All green. Build may warn about missing Sentry DSNs — that's expected without env vars set.

- [ ] **Step 2: Verify Sentry captures errors in dev**

In `apps/api/src/routes/health.ts`, temporarily add a throw:

```ts
// Temporary — remove after verifying
throw new Error('Sentry test error')
```

Set `SENTRY_DSN` in `apps/api/.env.local` to your real staging Sentry DSN.

```bash
pnpm --filter api dev
curl http://localhost:3001/v1/health
```

Expected: Error appears in Sentry dashboard within ~60 seconds. Remove the throw after verifying.

- [ ] **Step 3: Remove the test throw and commit**

```bash
git add apps/api/src/routes/health.ts
git commit -m "test: verify sentry error capture (remove test throw)"
```

- [ ] **Step 4: Open PR**

```bash
git push -u origin feat/phase-6-observability-testing
gh pr create \
  --title "feat: phase 6a — observability SDK (pino + sentry)" \
  --body "$(cat .github/pull_request_template.md)"
```

Fill in the PR template. Key validation checklist:

- [ ] Pino structured logs appear in `pnpm --filter api dev` output
- [ ] `pnpm typecheck` passes
- [ ] `pnpm test` passes
- [ ] `pnpm build` passes
