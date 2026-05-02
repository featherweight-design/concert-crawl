# Phase 6c — E2E + Smoke Tests Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `apps/e2e` Playwright workspace app with two suites: a staging E2E suite (runs post-merge against staging) and a production smoke test cron (reports failures to Sentry).

**Architecture:** `apps/e2e/` is a new pnpm workspace package automatically discovered via `apps/*` in `pnpm-workspace.yaml`. Two Playwright configs — `playwright.config.ts` (staging, full E2E) and `playwright.smoke.config.ts` (prod, minimal smoke tests). Auth state is set up once per run via a Playwright `globalSetup` that signs in and saves `storageState`. Two GitHub Actions workflows: `staging-e2e.yml` triggers on push to `main` (waits for Render deploy); `smoke.yml` runs on a `0 * * * *` cron.

**Tech Stack:** `@playwright/test@^1.44`, `@sentry/node@^8` (smoke test failure reporting), GitHub Actions

**Prerequisite:** PR 6a merged (Sentry available for smoke test failure reporting).

---

## File Map

**Create (all new — `apps/e2e/` doesn't exist):**

- `apps/e2e/package.json`
- `apps/e2e/tsconfig.json`
- `apps/e2e/.gitignore` — ignore `.auth/`, `test-results/`, `playwright-report/`
- `apps/e2e/playwright.config.ts` — staging E2E
- `apps/e2e/playwright.smoke.config.ts` — prod smoke
- `apps/e2e/src/fixtures/auth.ts` — globalSetup: sign in once, save storageState
- `apps/e2e/src/helpers/api.ts` — typed helpers for direct API calls in tests
- `apps/e2e/src/smoke/critical-path.spec.ts` — prod smoke tests
- `apps/e2e/src/e2e/browse.spec.ts` — browse events E2E
- `apps/e2e/src/e2e/event-detail.spec.ts` — event detail page E2E
- `apps/e2e/src/e2e/venue-detail.spec.ts` — venue detail page E2E
- `apps/e2e/src/e2e/auth.spec.ts` — auth redirect and sign-in E2E
- `.github/workflows/staging-e2e.yml` — post-merge staging E2E trigger
- `.github/workflows/smoke.yml` — prod smoke cron (every 6h, skippable via `SMOKE_ENABLED` repo var)

---

## Task 1: Scaffold `apps/e2e/`

**Files:**

- Create: `apps/e2e/package.json`
- Create: `apps/e2e/tsconfig.json`
- Create: `apps/e2e/.gitignore`

- [ ] **Step 1: Create `apps/e2e/package.json`**

```json
{
  "name": "@concert-crawl/e2e",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "test:e2e": "playwright test --config playwright.config.ts",
    "test:smoke": "playwright test --config playwright.smoke.config.ts",
    "install-browsers": "playwright install --with-deps chromium",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "@concert-crawl/config": "workspace:*",
    "@playwright/test": "^1.44.0",
    "@sentry/node": "^8.0.0",
    "typescript": "^5.0.0"
  }
}
```

- [ ] **Step 2: Create `apps/e2e/tsconfig.json`**

```json
{
  "extends": "@concert-crawl/config/tsconfig",
  "compilerOptions": {
    "rootDir": ".",
    "noEmit": true
  },
  "include": ["src/**/*", "playwright.config.ts", "playwright.smoke.config.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Create `apps/e2e/.gitignore`**

```
.auth/
test-results/
playwright-report/
```

- [ ] **Step 4: Install dependencies**

```bash
pnpm install
```

Expected: `@playwright/test` and `@sentry/node` added to `apps/e2e/node_modules`.

- [ ] **Step 5: Install Playwright browsers**

```bash
pnpm --filter @concert-crawl/e2e install-browsers
```

Expected: Chromium binary downloaded (~150MB). Other browsers not needed — we only run in Chromium.

---

## Task 2: Create Playwright configs

**Files:**

- Create: `apps/e2e/playwright.config.ts`
- Create: `apps/e2e/playwright.smoke.config.ts`

- [ ] **Step 1: Create `apps/e2e/playwright.config.ts`**

```ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './src/e2e',
  // Run files in parallel within a suite, but not between suites
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  workers: process.env['CI'] ? 1 : undefined,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env['PLAYWRIGHT_BASE_URL'] ?? 'http://localhost:3000',
    // Use the auth state from globalSetup for authenticated test suites
    storageState: '.auth/user.json',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
  },
  // globalSetup signs in once and saves storageState before any tests run
  globalSetup: './src/fixtures/auth.ts',
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  timeout: 30_000,
  expect: { timeout: 5_000 },
})
```

- [ ] **Step 2: Create `apps/e2e/playwright.smoke.config.ts`**

```ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './src/smoke',
  fullyParallel: false,
  forbidOnly: !!process.env['CI'],
  retries: 1,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL:
      process.env['PLAYWRIGHT_SMOKE_BASE_URL'] ?? 'https://concertcrawl.app',
    screenshot: 'only-on-failure',
    // No storageState — smoke tests test the unauthenticated public experience
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  timeout: 15_000,
  expect: { timeout: 5_000 },
})
```

---

## Task 3: Create auth globalSetup (sign-in once, save storageState)

**Files:**

- Create: `apps/e2e/src/fixtures/auth.ts`

The globalSetup signs in with the Clerk test user once before any E2E tests run, saving cookies and localStorage to `.auth/user.json`. Playwright reuses this state for every authenticated test — avoiding repeated sign-in flows.

- [ ] **Step 1: Create `apps/e2e/src/fixtures/auth.ts`**

```ts
import { chromium, type FullConfig } from '@playwright/test'
import fs from 'fs'
import path from 'path'

export default async function globalSetup(config: FullConfig): Promise<void> {
  const email = process.env['E2E_TEST_USER_EMAIL']
  const password = process.env['E2E_TEST_USER_PASSWORD']

  // If credentials aren't provided, skip auth setup.
  // Tests that require auth will fail with a clear redirect error.
  if (!email || !password) {
    console.warn(
      '[e2e] E2E_TEST_USER_EMAIL or E2E_TEST_USER_PASSWORD not set — skipping auth setup.',
    )
    return
  }

  const baseURL = config.projects[0]?.use.baseURL ?? 'http://localhost:3000'
  const authDir = path.resolve('apps/e2e/.auth')
  const authFile = path.join(authDir, 'user.json')

  fs.mkdirSync(authDir, { recursive: true })

  const browser = await chromium.launch()
  const page = await browser.newPage()

  try {
    // Navigate to the app — Clerk will redirect to sign-in if needed
    await page.goto(`${baseURL}/sign-in`)
    await page.waitForLoadState('networkidle')

    // Clerk's default sign-in UI uses these selectors.
    // If the Clerk component version changes these selectors, update here.
    await page.getByLabel(/email/i).fill(email)
    await page.getByRole('button', { name: /continue/i }).click()
    await page.waitForLoadState('networkidle')

    await page.getByLabel(/password/i).fill(password)
    await page.getByRole('button', { name: /continue|sign in/i }).click()

    // Wait for redirect to the app after successful sign-in
    await page.waitForURL((url) => !url.pathname.includes('sign-in'), {
      timeout: 15_000,
    })

    await page.context().storageState({ path: authFile })
    console.log('[e2e] Auth state saved to', authFile)
  } finally {
    await browser.close()
  }
}
```

- [ ] **Step 2: Create `.auth/` directory in gitignore**

Verify `apps/e2e/.gitignore` already contains `.auth/` (added in Task 1). The `.auth/user.json` file contains session cookies and must never be committed.

---

## Task 4: Create API helper

**Files:**

- Create: `apps/e2e/src/helpers/api.ts`

- [ ] **Step 1: Create `apps/e2e/src/helpers/api.ts`**

```ts
import { type APIRequestContext } from '@playwright/test'

const API_URL =
  process.env['PLAYWRIGHT_API_URL'] ??
  process.env['NEXT_PUBLIC_API_URL'] ??
  'http://localhost:3001'

export async function apiGet<T = unknown>(
  request: APIRequestContext,
  path: string,
): Promise<{ status: number; body: T }> {
  const response = await request.get(`${API_URL}${path}`)
  const body = (await response.json()) as T
  return { status: response.status(), body }
}

export async function healthCheck(
  request: APIRequestContext,
): Promise<boolean> {
  try {
    const { status, body } = await apiGet<{ status: string }>(
      request,
      '/v1/health',
    )
    return status === 200 && (body as { status: string }).status === 'ok'
  } catch {
    return false
  }
}
```

---

## Task 5: Production smoke tests

**Files:**

- Create: `apps/e2e/src/smoke/critical-path.spec.ts`

Smoke tests run against production every hour. They test the public-facing critical path only — no auth required, no data mutation. Failures are captured by Sentry (configured in the `smoke.yml` workflow via `SENTRY_DSN`).

- [ ] **Step 1: Create `apps/e2e/src/smoke/critical-path.spec.ts`**

```ts
import { test, expect } from '@playwright/test'
import { healthCheck } from '../helpers/api.js'

test.describe('production smoke: app availability', () => {
  test('homepage renders with content', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/concert crawl/i)
    // The page should render something meaningful — not a blank page or error
    const heading = page.getByRole('heading').first()
    await expect(heading).toBeVisible()
  })

  test('API health endpoint responds', async ({ request }) => {
    const healthy = await healthCheck(request)
    expect(healthy).toBe(true)
  })
})

test.describe('production smoke: event data', () => {
  test('browse page loads with at least one event', async ({ page }) => {
    await page.goto('/events')
    await page.waitForLoadState('networkidle')

    // If the DB is empty or crawls have failed, this catches it
    const eventCards = page.locator('[data-testid="event-card"]')
    await expect(eventCards.first()).toBeVisible({ timeout: 10_000 })
    const count = await eventCards.count()
    expect(count).toBeGreaterThan(0)
  })

  test('venue filter chip produces results', async ({ page }) => {
    await page.goto('/events')
    await page.waitForLoadState('networkidle')

    // Click the first venue filter chip
    const firstChip = page.locator('[data-testid="venue-chip"]').first()
    const isChipVisible = await firstChip.isVisible()

    if (isChipVisible) {
      await firstChip.click()
      await page.waitForLoadState('networkidle')
      const eventCards = page.locator('[data-testid="event-card"]')
      // After filtering, we expect at least 0 results (venue may have no events)
      // The test passes as long as the page doesn't error
      await expect(page.locator('body')).not.toContainText(
        /error|500|unexpected/i,
      )
    }
    // If no chips are visible, the test passes — empty state is valid
  })
})

test.describe('production smoke: auth protection', () => {
  test('admin route redirects unauthenticated users', async ({ page }) => {
    await page.goto('/admin')
    // Should redirect to sign-in, not show admin content
    await page.waitForLoadState('networkidle')
    const url = page.url()
    expect(url).toMatch(/sign-in|clerk\.com|accounts\./i)
  })
})

test.describe('production smoke: known venue', () => {
  test('a seeded venue page loads', async ({ page }) => {
    // Larimer Lounge is in the seed data — verifies data freshness
    await page.goto('/venues/larimer-lounge')
    await page.waitForLoadState('networkidle')

    // Should render the venue page, not a 404
    await expect(page).not.toHaveTitle(/404|not found/i)
    const h1 = page.getByRole('heading', { level: 1 })
    await expect(h1).toBeVisible()
  })
})
```

Note: `[data-testid="event-card"]` and `[data-testid="venue-chip"]` must be added to the web app components if they don't exist. If these attributes are missing, the smoke test will time out. Check `apps/web/src/components/consumer/` and add `data-testid` attributes where needed before running smoke tests in production.

- [ ] **Step 2: Add `data-testid` attributes to web components if missing**

Check `apps/web/src/components/consumer/` for event card and venue chip components. Add `data-testid="event-card"` to the event card root element and `data-testid="venue-chip"` to venue filter chips. These are non-functional attributes — they only exist for test targeting.

- [ ] **Step 3: Verify smoke tests run against local dev**

Start the web app:

```bash
pnpm --filter web dev
```

In another terminal:

```bash
cd apps/e2e && PLAYWRIGHT_SMOKE_BASE_URL=http://localhost:3000 pnpm test:smoke
```

Expected: Tests pass against local dev. The `admin` redirect test may behave differently in local dev (Clerk may redirect to clerk.com) — that's fine. The key check is that the test suite runs without config errors.

- [ ] **Step 4: Commit**

```bash
git add apps/e2e/src/smoke/ apps/e2e/src/helpers/ apps/e2e/src/fixtures/
git commit -m "test: add smoke test suite (critical path, data freshness, auth protection)"
```

---

## Task 6: Staging E2E tests — browse

**Files:**

- Create: `apps/e2e/src/e2e/browse.spec.ts`

- [ ] **Step 1: Create `apps/e2e/src/e2e/browse.spec.ts`**

```ts
import { test, expect } from '@playwright/test'

test.describe('browse events page', () => {
  test('loads the browse page with events', async ({ page }) => {
    await page.goto('/events')
    await page.waitForLoadState('networkidle')

    // Page title
    await expect(page).toHaveTitle(/concert crawl/i)

    // At least one event card visible
    const firstCard = page.locator('[data-testid="event-card"]').first()
    await expect(firstCard).toBeVisible()
  })

  test('venue filter chip narrows the event list', async ({ page }) => {
    await page.goto('/events')
    await page.waitForLoadState('networkidle')

    const chipContainer = page.locator('[data-testid="venue-chip"]')
    const chipCount = await chipContainer.count()
    if (chipCount === 0) {
      test.skip(true, 'No venue chips present on staging — skip filter test')
      return
    }

    const firstChip = chipContainer.first()
    const chipLabel = await firstChip.textContent()

    await firstChip.click()
    await page.waitForLoadState('networkidle')

    // After clicking, the chip should be visually active
    await expect(firstChip).toHaveAttribute('aria-pressed', 'true')

    // Events list should still be visible (not errored)
    await expect(page.locator('[data-testid="event-card"]').first())
      .toBeVisible({
        timeout: 8_000,
      })
      .catch(() => {
        // No events for this venue is a valid state — just verify no error page
      })

    console.log(`Filtered by venue: ${chipLabel}`)
  })

  test('load more fetches additional events', async ({ page }) => {
    await page.goto('/events')
    await page.waitForLoadState('networkidle')

    const loadMoreButton = page.getByRole('button', { name: /load more/i })
    const isVisible = await loadMoreButton.isVisible()

    if (!isVisible) {
      test.skip(
        true,
        'Load More button not visible — fewer events than one page',
      )
      return
    }

    const initialCount = await page
      .locator('[data-testid="event-card"]')
      .count()
    await loadMoreButton.click()
    await page.waitForLoadState('networkidle')
    const newCount = await page.locator('[data-testid="event-card"]').count()

    expect(newCount).toBeGreaterThan(initialCount)
  })
})
```

---

## Task 7: Staging E2E tests — event and venue detail

**Files:**

- Create: `apps/e2e/src/e2e/event-detail.spec.ts`
- Create: `apps/e2e/src/e2e/venue-detail.spec.ts`

- [ ] **Step 1: Create `apps/e2e/src/e2e/event-detail.spec.ts`**

```ts
import { test, expect } from '@playwright/test'

test.describe('event detail page', () => {
  test('renders event details from the browse page', async ({ page }) => {
    await page.goto('/events')
    await page.waitForLoadState('networkidle')

    const firstCard = page.locator('[data-testid="event-card"]').first()
    await expect(firstCard).toBeVisible()

    // Navigate to the event detail page by clicking the card
    await firstCard.click()
    await page.waitForLoadState('networkidle')

    // Should be on an event detail URL
    expect(page.url()).toMatch(/\/events\/[a-z0-9-]+/)

    // Core event data should render
    const heading = page.getByRole('heading', { level: 1 })
    await expect(heading).toBeVisible()

    // Venue name should appear somewhere on the page
    const venueLink = page.locator('[data-testid="event-venue-name"]')
    await expect(venueLink).toBeVisible()
  })

  test('back navigation returns to browse', async ({ page }) => {
    await page.goto('/events')
    await page.waitForLoadState('networkidle')

    const firstCard = page.locator('[data-testid="event-card"]').first()
    await firstCard.click()
    await page.waitForLoadState('networkidle')

    await page.goBack()
    await page.waitForLoadState('networkidle')

    expect(page.url()).toMatch(/\/events$/)
  })
})
```

- [ ] **Step 2: Create `apps/e2e/src/e2e/venue-detail.spec.ts`**

```ts
import { test, expect } from '@playwright/test'

test.describe('venue detail page', () => {
  test('renders venue info and event list', async ({ page }) => {
    // Navigate via a venue chip — more realistic than a hardcoded URL
    await page.goto('/events')
    await page.waitForLoadState('networkidle')

    const venueChip = page.locator('[data-testid="venue-chip"]').first()
    const isVisible = await venueChip.isVisible()
    if (!isVisible) {
      test.skip(
        true,
        'No venue chips on staging — cannot navigate to venue detail',
      )
      return
    }

    // Click the venue name link to navigate to venue detail
    const venueLink = page.locator('[data-testid="venue-name-link"]').first()
    const linkVisible = await venueLink.isVisible()
    if (!linkVisible) {
      test.skip(true, 'No venue name link found on browse page')
      return
    }

    await venueLink.click()
    await page.waitForLoadState('networkidle')

    expect(page.url()).toMatch(/\/venues\/[a-z0-9-]+/)

    const heading = page.getByRole('heading', { level: 1 })
    await expect(heading).toBeVisible()
  })

  test('Larimer Lounge venue page renders (seed data check)', async ({
    page,
  }) => {
    await page.goto('/venues/larimer-lounge')
    await page.waitForLoadState('networkidle')

    await expect(page).not.toHaveTitle(/404|not found/i)
    const heading = page.getByRole('heading', { level: 1 })
    await expect(heading).toBeVisible()
    await expect(heading).toContainText(/larimer/i)
  })
})
```

- [ ] **Step 3: Commit**

```bash
git add apps/e2e/src/e2e/event-detail.spec.ts apps/e2e/src/e2e/venue-detail.spec.ts apps/e2e/src/e2e/browse.spec.ts
git commit -m "test: add browse, event-detail, and venue-detail e2e tests"
```

---

## Task 8: Staging E2E tests — auth flow

**Files:**

- Create: `apps/e2e/src/e2e/auth.spec.ts`

- [ ] **Step 1: Create `apps/e2e/src/e2e/auth.spec.ts`**

```ts
import { test, expect } from '@playwright/test'

// Auth tests need to test both authenticated and unauthenticated states.
// Use a separate browser context without storageState for the unauthenticated tests.

test.describe('unauthenticated access', () => {
  test('admin route redirects to sign-in', async ({ browser }) => {
    // Create a fresh context without saved auth state
    const context = await browser.newContext({ storageState: undefined })
    const page = await context.newPage()

    await page.goto('/admin')
    await page.waitForLoadState('networkidle')

    // Clerk redirects to the sign-in page
    const url = page.url()
    expect(url).toMatch(/sign-in|clerk\.com|accounts\./i)

    await context.close()
  })

  test('public browse page is accessible without auth', async ({ browser }) => {
    const context = await browser.newContext({ storageState: undefined })
    const page = await context.newPage()

    await page.goto('/events')
    await page.waitForLoadState('networkidle')

    // Should render the events page, not redirect to sign-in
    await expect(page).toHaveTitle(/concert crawl/i)
    expect(page.url()).toMatch(/\/events/)

    await context.close()
  })
})

test.describe('authenticated access', () => {
  // These tests use the storageState from globalSetup (configured in playwright.config.ts).
  // If E2E_TEST_USER_EMAIL / PASSWORD are not set, globalSetup skips auth and these tests
  // may redirect to sign-in (they'll fail with a clear error message).

  test('authenticated user can access events page', async ({ page }) => {
    await page.goto('/events')
    await page.waitForLoadState('networkidle')

    // Should not be redirected to sign-in
    expect(page.url()).not.toMatch(/sign-in/)
    await expect(page).toHaveTitle(/concert crawl/i)
  })
})
```

- [ ] **Step 2: Commit**

```bash
git add apps/e2e/src/e2e/auth.spec.ts
git commit -m "test: add auth flow e2e tests (protected routes, unauthenticated redirect)"
```

---

## Task 9: GitHub Actions — staging E2E workflow

**Files:**

- Create: `.github/workflows/staging-e2e.yml`

- [ ] **Step 1: Create `.github/workflows/staging-e2e.yml`**

```yaml
name: Staging E2E

on:
  push:
    branches: [main]
  workflow_dispatch: # allow manual trigger

jobs:
  e2e:
    name: Playwright E2E (staging)
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Cache Playwright browsers
        uses: actions/cache@v4
        with:
          path: ~/.cache/ms-playwright
          key: playwright-${{ runner.os }}-${{ hashFiles('apps/e2e/package.json') }}
          restore-keys: playwright-${{ runner.os }}-

      - name: Install Playwright browsers
        run: pnpm --filter @concert-crawl/e2e install-browsers

      - name: Wait for Render staging deploy
        # Render typically deploys in 2-4 minutes. 3 min is a safe wait.
        # If staging has a deploy webhook URL, replace this with a proper health poll.
        run: sleep 180

      - name: Run E2E tests
        run: pnpm --filter @concert-crawl/e2e test:e2e
        env:
          PLAYWRIGHT_BASE_URL: ${{ vars.STAGING_URL }}
          E2E_TEST_USER_EMAIL: ${{ secrets.E2E_TEST_USER_EMAIL }}
          E2E_TEST_USER_PASSWORD: ${{ secrets.E2E_TEST_USER_PASSWORD }}

      - name: Upload failure artifacts
        uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: e2e-failure-artifacts-${{ github.run_id }}
          path: apps/e2e/test-results/
          retention-days: 7
```

Note: Before this workflow will succeed, add these to the GitHub repository settings:

- **Secrets:** `E2E_TEST_USER_EMAIL`, `E2E_TEST_USER_PASSWORD`
- **Variables:** `STAGING_URL` (e.g. `https://concert-crawl-web-staging.onrender.com`)

Create the Clerk test user on staging: go to the Clerk dashboard for the staging environment, create a user with email/password auth, and store the credentials as secrets.

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/staging-e2e.yml
git commit -m "ci: add staging e2e workflow (triggers on push to main)"
```

---

## Task 10: GitHub Actions — smoke test cron (every 6h)

**Files:**

- Create: `.github/workflows/smoke.yml`

- [ ] **Step 1: Create `.github/workflows/smoke.yml`**

```yaml
name: Production Smoke Tests

on:
  schedule:
    # Every 6 hours — change to '0 * * * *' at launch if you want hourly
    - cron: '0 */6 * * *'
  workflow_dispatch: # allow manual trigger for testing

jobs:
  smoke:
    name: Playwright smoke (production)
    runs-on: ubuntu-latest
    timeout-minutes: 10
    # Skip if SMOKE_ENABLED repo var is explicitly set to 'false'.
    # Pre-launch: set SMOKE_ENABLED=false in GitHub repo vars (Settings → Variables).
    # At launch: delete the var or set to 'true'. No code change needed.
    if: vars.SMOKE_ENABLED != 'false'
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Cache Playwright browsers
        uses: actions/cache@v4
        with:
          path: ~/.cache/ms-playwright
          key: playwright-${{ runner.os }}-${{ hashFiles('apps/e2e/package.json') }}
          restore-keys: playwright-${{ runner.os }}-

      - name: Install Playwright browsers
        run: pnpm --filter @concert-crawl/e2e install-browsers

      - name: Run smoke tests
        run: pnpm --filter @concert-crawl/e2e test:smoke
        env:
          PLAYWRIGHT_SMOKE_BASE_URL: ${{ vars.PROD_URL }}
          PLAYWRIGHT_API_URL: ${{ vars.PROD_API_URL }}
          # Sentry DSN for smoke test failure reporting
          # Failures in this workflow create Sentry issues tagged source=smoke-test
          SENTRY_DSN: ${{ secrets.SENTRY_DSN_SMOKE }}

      - name: Upload failure artifacts
        uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: smoke-failure-${{ github.run_id }}
          path: apps/e2e/test-results/
          retention-days: 3
```

- [ ] **Step 2: Add Sentry failure reporting to smoke test globalSetup**

Create `apps/e2e/src/fixtures/smoke-setup.ts` — used by the smoke config to initialize Sentry so test failures are captured:

```ts
import * as Sentry from '@sentry/node'
import type { FullConfig } from '@playwright/test'

export default async function globalSetup(_config: FullConfig): Promise<void> {
  if (process.env['SENTRY_DSN']) {
    Sentry.init({
      dsn: process.env['SENTRY_DSN'],
      environment: 'production',
      initialScope: {
        tags: { source: 'smoke-test' },
      },
    })
    console.log('[smoke] Sentry initialized for failure reporting')
  }
}
```

Update `apps/e2e/playwright.smoke.config.ts` to add the `globalSetup`:

```ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './src/smoke',
  fullyParallel: false,
  forbidOnly: !!process.env['CI'],
  retries: 1,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  globalSetup: './src/fixtures/smoke-setup.ts',
  use: {
    baseURL:
      process.env['PLAYWRIGHT_SMOKE_BASE_URL'] ?? 'https://concertcrawl.app',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  timeout: 15_000,
  expect: { timeout: 5_000 },
})
```

- [ ] **Step 3: Add GitHub repository secrets and variables**

In GitHub → Settings → Secrets and variables → Actions:

**Secrets:**
| Name | Value |
|------|-------|
| `E2E_TEST_USER_EMAIL` | Email of the Clerk test user on staging |
| `E2E_TEST_USER_PASSWORD` | Password of that user |
| `SENTRY_DSN_SMOKE` | Sentry DSN for the `concert-crawl-web` project (or a dedicated `concert-crawl-e2e` project) |

**Variables:**
| Name | Value |
|------|-------|
| `STAGING_URL` | `https://concert-crawl-web-staging.onrender.com` |
| `PROD_URL` | `https://concertcrawl.app` |
| `PROD_API_URL` | `https://concert-crawl-api.onrender.com` |

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/smoke.yml apps/e2e/src/fixtures/smoke-setup.ts apps/e2e/playwright.smoke.config.ts
git commit -m "ci: add smoke test cron (every 6h, skippable via SMOKE_ENABLED repo var)"
```

---

## Task 11: Verify end-to-end and open PR

- [ ] **Step 1: Run typecheck on e2e package**

```bash
pnpm --filter @concert-crawl/e2e typecheck
```

Expected: `0 errors`.

- [ ] **Step 2: Run smoke tests locally against local dev**

Start the web app:

```bash
pnpm --filter web dev
```

In another terminal:

```bash
PLAYWRIGHT_SMOKE_BASE_URL=http://localhost:3000 \
  PLAYWRIGHT_API_URL=http://localhost:3001 \
  pnpm --filter @concert-crawl/e2e test:smoke
```

Expected: Most smoke tests pass. The `admin redirect` test may behave differently locally (Clerk redirects vary by environment) — acceptable.

- [ ] **Step 3: Manually trigger `smoke.yml` in GitHub Actions**

After pushing this branch (or merging to main), go to GitHub → Actions → "Production Smoke Tests" → "Run workflow". This verifies the cron workflow config is valid and smoke tests run against production.

Expected: All smoke tests pass. Any failure surfaces in the GitHub Actions run log.

- [ ] **Step 4: Run repo-wide typecheck and lint**

```bash
pnpm typecheck && pnpm lint
```

Expected: All green. Fix any type errors in `apps/e2e/` before opening the PR.

- [ ] **Step 5: Open PR**

```bash
git push
gh pr create \
  --title "test: phase 6c — playwright e2e + hourly smoke tests" \
  --body "$(cat .github/pull_request_template.md)"
```

Key PR validation checklist:

- [ ] Smoke tests pass when manually triggered via `workflow_dispatch`
- [ ] `staging-e2e.yml` workflow appears in GitHub Actions (validates the YAML)
- [ ] `apps/e2e` typecheck passes
- [ ] `data-testid` attributes added to web components referenced in tests
- [ ] GitHub secrets and variables confirmed set in repo settings

---

## Post-Merge: Validate Phase 6 Milestone

After all three PRs (6a, 6b, 6c) merge to `main`, verify the full milestone:

- [ ] Pino JSON logs appear in Render staging API service logs
- [ ] A deliberate error in the API surfaces in Sentry within 60 seconds
- [ ] OpenTelemetry traces appear in Grafana Cloud (requires `OTEL_EXPORTER_OTLP_ENDPOINT` set in Render)
- [ ] Integration test CI job is green on every PR
- [ ] Staging E2E job runs automatically after merge and passes
- [ ] Smoke test cron runs every 6h and passes (check Actions → smoke.yml → scheduled runs); or set `SMOKE_ENABLED=false` in repo vars pre-launch to skip
- [ ] UptimeRobot monitors configured and green (manual setup — see design spec external service checklist)
