# Production Promotion Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make prod deploy only on an explicit human promotion, with staging as the gate that earns it, and an alert when prod falls behind `main`.

**Architecture:** `main` keeps auto-deploying staging. Render's native auto-deploy is turned off on the five prod services and on the Vercel prod project, leaving `.github/workflows/deploy-prod.yml` (`workflow_dispatch`, required `reason` input, gate → deploy → smoke → rollback) as the only path to prod. Before that switch is thrown, the staging E2E suite is repaired and re-armed on push, the two unwired prod cron services are added to every prod workflow, and a scheduled drift alert is added.

**Tech Stack:** GitHub Actions, Render REST API v1, Vercel CLI, Playwright, bash.

**Spec:** `docs/superpowers/specs/2026-09-01-prod-promotion-gate-design.md`

## Global Constraints

- Six active Render services; the five prod ones are `concert-crawl-api` (`srv-d7lngqfavr4c73eme3b0`), `concert-crawl-crawler-triggers` (`crn-d8o7c10k1i2s7389t3v0`), `concert-crawl-crawler-daily` (`crn-d8o7egog4nts73d2tni0`), `concert-crawl-match-artists` (`crn-d9nm08e7bikc73c6q39g`), `concert-crawl-spotify-weekly` (`crn-d9e46ad7vvec73dsn7bg`). Service IDs never appear in workflow YAML — they are `production`-environment **variables**.
- Render's API accepts `commitId` only for `srv-*` services. `crn-*` deploys always build branch HEAD, and `render-rollback.sh` cannot roll a cron back (HTTP 400; it warns and exits 0). Promotion is therefore HEAD-only by design.
- Render honors `[skip render]`, `[render skip]`, `[skip deploy]`, `[skip cd]` — **not** `[skip ci]`.
- `pnpm db:migrate` runs in the prod API `buildCommand` (`render.yaml:47`), so gating the API deploy gates prod migrations. Migrations are expand/contract-only, so a one-promotion lag is compatible both ways.
- All file changes happen in a git worktree, never in `/Users/huey/Projects/concert-crawl` directly.
- Run `pnpm typecheck` and `pnpm lint` in the worktree before every push.
- Workflow YAML has no linter in this repo. Validate syntax with `python3 -c "import sys,yaml;yaml.safe_load(open(sys.argv[1]))" <file>` before committing.
- Never commit a secret or a real service ID value outside `render.yaml`'s existing declarative entries.

---

## File Structure

| File | Responsibility | Change |
| --- | --- | --- |
| `apps/e2e/src/fixtures/auth.ts` | Clerk sign-in + storage-state write; owns the storage-state path constant | Modify |
| `apps/e2e/playwright.config.ts` | Imports the storage-state constant instead of duplicating the literal | Modify |
| `apps/e2e/src/e2e/price-transparency-v2.spec.ts` | Price submit/dispute flows; must resolve a real event id | Modify |
| `apps/e2e/src/e2e/event-detail.spec.ts` | Event detail navigation | Modify |
| `apps/e2e/src/e2e/venue-detail.spec.ts` | Venue detail navigation | Modify |
| `apps/e2e/src/e2e/browse.spec.ts` | Browse + load-more | Modify |
| `apps/e2e/src/e2e/pwa.spec.ts` | Manifest, SW registration, offline fallback | Modify |
| `apps/web/src/middleware.ts` | Route gating; `/~offline` must be publicly reachable | Modify |
| `apps/web/src/lib/pwa/route-cache.ts` | Cacheable-route allowlist + the `/~offline` rationale comment | Modify |
| `.github/workflows/staging-e2e.yml` | Staging E2E on push to main | Modify |
| `.github/workflows/deploy-prod.yml` | The promotion pipeline: gate, deploy (5 Render services + Vercel), smoke, rollback | Modify |
| `.github/workflows/rollback-prod.yml` | Manual incident rollback across all prod services | Modify |
| `.github/workflows/prod-deploy-health.yml` | Suspended/failed-deploy checker | Modify |
| `.github/workflows/prod-smoke-after-deploy.yml` | Retired from push; dispatch-only | Modify |
| `.github/workflows/prod-drift-alert.yml` | Scheduled "is prod current?" alert | Create |
| `.github/scripts/render-live-sha.sh` | Prints the SHA a Render service is currently live on | Create |
| `render.yaml` | Descriptive mirror of live Render config | Modify |
| `docs/runbooks/auto-deploy-prod.md` | The prod deploy/promotion runbook | Modify |
| `docs/runbooks/render-service-config.md` | Live Render config of record | Modify |
| `CLAUDE.md` | Environments architecture-decision row | Modify |
| `docs/superpowers/progress.md` | Phase tracker row | Modify |

---

### Task 1: One storage-state path, and a price spec that uses a real event

The four `price-transparency-v2.spec.ts` tests fail in 11ms each with
`Error reading storage state from playwright/.auth/user.json: ENOENT`. The spec
overrides `storageState` with a path nothing writes: `playwright/.auth/user.json`.
The config uses `.auth/user.json` and `globalSetup` writes
`path.resolve('.auth')/user.json`. Two spellings of the same idea, one of which
is wrong.

The spec also targets `process.env['TEST_EVENT_ID'] ?? 'test-event-id'`. That
variable is set nowhere, so even with auth fixed every test would load
`/events/test-event-id` and 404. Resolve a real event id from the browse page
instead, and skip when staging has no events.

**Files:**
- Modify: `apps/e2e/src/fixtures/auth.ts`
- Modify: `apps/e2e/playwright.config.ts`
- Modify: `apps/e2e/src/e2e/price-transparency-v2.spec.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `STORAGE_STATE_PATH: string` exported from `apps/e2e/src/fixtures/auth.ts` — the single relative path both the config and any spec must use.

- [ ] **Step 1: Export the storage-state path from the fixture**

In `apps/e2e/src/fixtures/auth.ts`, add the constant above `loginAndSave` and
make `globalSetup` derive its paths from it:

```ts
/**
 * The one spelling of the storage-state path. Playwright resolves a relative
 * `storageState` against the config directory, and globalSetup writes with
 * `path.resolve` from the same cwd, so a single relative string is correct for
 * both — but only if there is exactly one of them. A second spelling
 * (`playwright/.auth/user.json`) silently ENOENT'd four specs for months.
 */
export const STORAGE_STATE_PATH = '.auth/user.json'
```

In the `globalSetup` body, replace the hardcoded directory and filename:

```ts
  const authFile = path.resolve(STORAGE_STATE_PATH)
  const authDir = path.dirname(authFile)
  fs.mkdirSync(authDir, { recursive: true })
```

- [ ] **Step 2: Point the config at the constant**

In `apps/e2e/playwright.config.ts`, import it and use it:

```ts
import { defineConfig, devices } from '@playwright/test'
import { STORAGE_STATE_PATH } from './src/fixtures/auth'
```

and inside `use`:

```ts
    storageState: STORAGE_STATE_PATH,
```

- [ ] **Step 3: Delete the bad override and resolve a real event id**

Replace the top of `apps/e2e/src/e2e/price-transparency-v2.spec.ts` (lines 1–10)
with this. The `test.use` line goes away entirely — the config already supplies
the signed-in state, and an override is what broke it.

```ts
import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

/**
 * Resolve an event id from the browse page. TEST_EVENT_ID used to be read from
 * the environment and defaulted to the string 'test-event-id', which 404s on
 * every environment — the specs never ran against a real event.
 */
const resolveEventId = async (page: Page): Promise<string | null> => {
  await page.goto('/events')
  const firstRowLink = page
    .locator('[data-testid="event-row"] a.event-row-stretch')
    .first()
  if (!(await firstRowLink.isVisible())) return null
  const href = await firstRowLink.getAttribute('href')
  if (href === null) return null
  const match = /\/events\/([^/?#]+)/.exec(href)
  return match?.[1] ?? null
}

test.describe('Price Transparency v2', () => {
  test('submit flow — fill form and see success state', async ({ page }) => {
    const eventId = await resolveEventId(page)
    if (eventId === null) {
      test.skip(true, 'No events on this environment — nothing to price')
      return
    }
    await page.goto(`/events/${eventId}/submit-price`)
    await expect(page.getByText('Submit a price')).toBeVisible()
```

Then in each of the three remaining tests, replace the
`` await page.goto(`/events/${EVENT_ID}/submit-price`) `` line (and the dispute
spec's equivalent) with the same two-line preamble:

```ts
    const eventId = await resolveEventId(page)
    if (eventId === null) {
      test.skip(true, 'No events on this environment — nothing to price')
      return
    }
```

and use `` `/events/${eventId}/...` `` in the navigation that follows. Delete the
now-unused `const EVENT_ID = ...` line.

- [ ] **Step 4: Verify the paths agree and nothing references the old spelling**

Run:

```bash
grep -rn "playwright/.auth\|'\.auth/user\.json'" apps/e2e
```

Expected: exactly one hit — the `STORAGE_STATE_PATH` definition in
`src/fixtures/auth.ts`. Any other hit is a second spelling and must be removed.

- [ ] **Step 5: Typecheck and lint**

```bash
pnpm typecheck && pnpm lint
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/e2e/src/fixtures/auth.ts apps/e2e/playwright.config.ts apps/e2e/src/e2e/price-transparency-v2.spec.ts
git commit -m "fix(e2e): one storage-state path and a real event id for price specs"
```

---

### Task 2: Wait for the navigation, not for the network

`event-detail.spec.ts:23` and `venue-detail.spec.ts:18` both fail with
`Received string: "https://staging.concertcrawl.app/events"` — the click
happened and the assertion read `page.url()` before the App Router's
client-side transition committed. `waitForLoadState('networkidle')` is not a
navigation barrier for a soft nav: it can resolve before the RSC request even
starts. These specs passed in May 2026 and broke when the Event Row System
(#1430/#1436/#1445) made rows client-side prefetched links.

Two changes per spec: click the stretched anchor explicitly rather than the row
container (the container's centre can land on the action gutter's button, which
sits above the stretch overlay at `z-index: 2` and navigates nowhere), and wait
on the URL.

**Files:**
- Modify: `apps/e2e/src/e2e/event-detail.spec.ts`
- Modify: `apps/e2e/src/e2e/venue-detail.spec.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Fix `event-detail.spec.ts`**

Replace the body of `renders event details from the browse page` (lines 4–30)
with:

```ts
  test('renders event details from the browse page', async ({ page }) => {
    await page.goto('/events')

    // The row's link is the stretched artist-name anchor. Clicking the row
    // container instead can land on the action gutter's button, which sits
    // above the stretch overlay (globals.css: .event-row button { z-index: 2 })
    // and does not navigate.
    const firstRowLink = page
      .locator('[data-testid="event-row"] a.event-row-stretch')
      .first()
    if (!(await firstRowLink.isVisible())) {
      test.skip(true, 'No event rows on this environment')
      return
    }

    await firstRowLink.click()
    // waitForURL, not waitForLoadState: an App Router soft navigation can leave
    // the network idle before the transition commits, so networkidle is not a
    // navigation barrier.
    await page.waitForURL(/\/events\/[a-z0-9-]+/)

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.locator('[data-testid="event-venue-name"]')).toBeVisible()
  })
```

- [ ] **Step 2: Fix the back-navigation test in the same file**

Its line 49 assertion (`expect(page.url()).toMatch(/\/events$/)`) has the same
defect. Replace the click-and-assert pair with:

```ts
    await page.goBack()
    await page.waitForURL(/\/events$/)
```

- [ ] **Step 3: Fix `venue-detail.spec.ts`**

`renders venue info and event list` currently clicks
`[data-testid="venue-name-link"]`, which lives inside an event row
(`WhenWhere.tsx:164`) rather than on the venues index. Keep that entry point —
it is the real user path from browse — and fix the barrier:

```ts
    const venueLink = page.locator('[data-testid="venue-name-link"]').first()
    if (!(await venueLink.isVisible())) {
      test.skip(true, 'No venue name link found on browse page')
      return
    }

    await venueLink.click()
    await page.waitForURL(/\/venues\/[a-z0-9-]+/)

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
```

Delete the now-redundant `await page.waitForLoadState('networkidle')` that
preceded the assertion, and the `expect(page.url()).toMatch(...)` line.

- [ ] **Step 4: Typecheck and lint**

```bash
pnpm typecheck && pnpm lint
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/e2e/src/e2e/event-detail.spec.ts apps/e2e/src/e2e/venue-detail.spec.ts
git commit -m "fix(e2e): wait on the URL for client-side navigations"
```

---

### Task 3: Load-more asserts on the appended rows

`browse.spec.ts:65` fails `expect(newCount).toBeGreaterThan(initialCount)`.
`/events` renders `EventsList`, which appends via a react-query
`fetchNextPage()` (`EventsList.tsx:200-210`) — there is no document
navigation, so `waitForLoadState('networkidle')` can return before the appended
rows render, and the count is read one tick early.

**Files:**
- Modify: `apps/e2e/src/e2e/browse.spec.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: nothing.

- [ ] **Step 1: Replace the count-then-compare with a polled expectation**

Replace lines 60–66 of `apps/e2e/src/e2e/browse.spec.ts` with:

```ts
    const rows = page.locator('[data-testid="event-row"]')
    const initialCount = await rows.count()
    await loadMoreButton.click()

    // EventsList appends through react-query's fetchNextPage — no navigation
    // happens, so networkidle can resolve before the new rows render. Poll the
    // count instead of sampling it once.
    await expect
      .poll(async () => rows.count(), { timeout: 10_000 })
      .toBeGreaterThan(initialCount)
```

- [ ] **Step 2: Typecheck and lint**

```bash
pnpm typecheck && pnpm lint
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/e2e/src/e2e/browse.spec.ts
git commit -m "fix(e2e): poll the row count after load more"
```

---

### Task 4: The offline fallback has to reach a signed-out visitor

`pwa.spec.ts:41` fails with
`page.goto: net::ERR_FAILED at https://staging.concertcrawl.app/a-path-that-was-never-cached`
— the Serwist `fallbacks.entries` navigation fallback did not serve `/~offline`.
`apps/web/src/lib/pwa/route-cache.ts:44-47` records why that is plausible:
*"/~offline … is not public in middleware at all."* A precache fetch for a
middleware-gated route is redirected, so the fallback entry can be missing from
the cache entirely.

This is a product bug, not only a test bug: an offline page that requires auth
to have been cached is not an offline page. Reproduce first, because the fix
differs depending on whether the entry is absent or present-but-unmatched.

**Files:**
- Modify: `apps/web/src/middleware.ts`
- Modify: `apps/web/src/lib/pwa/route-cache.ts`
- Modify: `apps/e2e/src/e2e/pwa.spec.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: nothing.

- [ ] **Step 1: Reproduce against a local production build**

The service worker is production-only, so `pnpm dev` cannot show this.

```bash
pnpm --filter @concert-crawl/web build
pnpm --filter @concert-crawl/web start
```

Then, in a Chromium window at `http://localhost:3000`, open DevTools →
Application → Cache Storage and run in the console:

```js
const keys = await caches.keys()
for (const key of keys) {
  const cache = await caches.open(key)
  const urls = (await cache.keys()).map((req) => req.url)
  console.log(key, urls.filter((url) => url.includes('offline')))
}
```

Record the result. **Absent** means the precache fetch was gated (expected).
**Present** means the fallback matcher is not firing and Step 3's middleware
change alone will not fix it — in that case also check that the failing request
has `destination === 'document'`, which is what `sw.ts:110-116` matches on.

- [ ] **Step 2: Confirm the middleware gates `/~offline`**

```bash
grep -n "offline" apps/web/src/middleware.ts
```

Expected: no output — the route is not in any public matcher, which is the
cause.

- [ ] **Step 3: Make `/~offline` publicly reachable**

Add `/~offline` to the middleware's always-public route list, beside the other
`isAlwaysPublic` entries. It renders static copy with no data fetch and no user
context, so there is nothing to leak. Follow the existing entry's exact
spelling and ordering in that file rather than inventing a new pattern.

- [ ] **Step 4: Update the stale rationale comment**

In `apps/web/src/lib/pwa/route-cache.ts`, replace the `/~offline` paragraph
(lines 44–47) with:

```
// /~offline is absent for a different reason: it is served to an offline
// visitor from Serwist's precache via `fallbacks.entries`, not from this
// list, so adding it here would buy nothing. It IS public in middleware —
// it has to be, or the precache fetch is redirected and the fallback never
// lands in the cache at all.
```

- [ ] **Step 5: Re-run the reproduction and confirm the fallback is cached**

Rebuild, restart, reload once to let the worker install, then re-run the
console snippet from Step 1. Expected: a `/~offline` entry now appears.
Then in DevTools → Network, tick Offline and navigate to
`/a-path-that-was-never-cached`. Expected: the offline page renders with an
"offline" heading rather than `ERR_FAILED`.

- [ ] **Step 6: Make the spec's failure message say what broke**

In `apps/e2e/src/e2e/pwa.spec.ts`, the bare `page.goto` inside `try` reports a
transport error that reads like a network flake. Replace lines 40–45 with:

```ts
    try {
      // A navigation that the SW must answer from its precached fallback. If
      // this throws ERR_FAILED, the /~offline entry is missing from the cache
      // — usually because middleware gated the precache fetch.
      await page.goto('/a-path-that-was-never-cached')
      await expect(
        page.getByRole('heading', { name: /offline/i }),
      ).toBeVisible()
    } finally {
```

- [ ] **Step 7: Run the web unit tests, typecheck, lint**

```bash
pnpm --filter @concert-crawl/web test && pnpm typecheck && pnpm lint
```

Expected: PASS. If a middleware test asserts the exact public-route list, update
it to include `/~offline` — that assertion is the guard working.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/middleware.ts apps/web/src/lib/pwa/route-cache.ts apps/e2e/src/e2e/pwa.spec.ts
git commit -m "fix(pwa): serve the offline fallback to signed-out visitors"
```

---

### Task 5: Staging E2E runs on every merge again

With Tasks 1–4 landed the suite should be green. Re-arm it on push so the
promotion decision has an artifact, and replace the fixed `sleep 180` with the
existing wait-for-live script so the suite cannot run against the previous
staging build.

**Files:**
- Modify: `.github/workflows/staging-e2e.yml`

**Interfaces:**
- Consumes: `render-wait-for-live.sh <service-id> <sha>` (existing script).
- Produces: a `staging-e2e` check on every push to `main`.

- [ ] **Step 1: Dispatch the current suite to confirm Tasks 1–4 worked**

```bash
gh workflow run staging-e2e.yml --ref <this-branch>
gh run list --workflow staging-e2e.yml --limit 1
```

Wait for completion, then read the failures:

```bash
gh api repos/HartiganHM/concert-crawl/actions/runs/<run-id>/jobs --jq '.jobs[].id'
gh api repos/HartiganHM/concert-crawl/actions/jobs/<job-id>/logs | grep -E "✘|Error:"
```

Expected: 21 passed, 0 failed. Baseline for comparison is run `35452413434`
(9 failed / 12 passed). Do not proceed to Step 2 while anything is red — an
arming push that turns `main` red is worse than a dispatch-only suite.

- [ ] **Step 2: Add the push trigger**

Replace the `on:` block of `.github/workflows/staging-e2e.yml` with:

```yaml
on:
  push:
    branches: [main]
  workflow_dispatch:
```

Add a header paragraph above it explaining the role change:

```yaml
# Staging E2E. Runs on every push to main, because staging is now the gate a
# prod promotion is granted on (see docs/runbooks/auto-deploy-prod.md). A red
# run here does not block the merge that caused it — the merge already
# happened — it blocks the promotion decision.
```

- [ ] **Step 3: Replace the fixed sleep with the wait-for-live script**

Find the `Wait for Render staging deploy` step (`run: sleep 180`) and replace
the whole step with:

```yaml
      - name: Wait for staging API to be live on this SHA
        env:
          RENDER_API_TOKEN: ${{ secrets.RENDER_API_TOKEN }}
        run: |
          bash .github/scripts/render-wait-for-live.sh \
            "${{ vars.RENDER_SERVICE_ID_API_STAGING }}" \
            "${{ github.sha }}"
```

`RENDER_SERVICE_ID_API_STAGING` already exists as a repo variable —
`staging-smoke.yml` reads it. A fixed sleep either wastes two minutes or smokes
the previous build; this waits for the right one.

- [ ] **Step 4: Validate the YAML**

```bash
python3 -c "import sys,yaml;yaml.safe_load(open(sys.argv[1]))" .github/workflows/staging-e2e.yml
```

Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/staging-e2e.yml
git commit -m "ci(staging): run E2E on every push and wait for the right build"
```

---

### Task 6: Wire `match-artists` and `spotify-weekly` into every prod workflow

Two of the five prod services are invisible to the prod pipeline: they deploy,
roll back, and fail without any workflow knowing they exist. A promotion that
skips them leaves two crons on whatever Render last built.

**Files:**
- Modify: `.github/workflows/deploy-prod.yml`
- Modify: `.github/workflows/rollback-prod.yml`
- Modify: `.github/workflows/prod-deploy-health.yml`
- Modify: `.github/workflows/prod-smoke-after-deploy.yml`

**Interfaces:**
- Consumes: `render-trigger-deploy.sh <service-id> <sha> <label>`, `render-rollback.sh <service-id> <label>`, `render-check-deploy-health.sh`.
- Produces: two new `production`-environment variables, `RENDER_SERVICE_ID_MATCH_ARTISTS` and `RENDER_SERVICE_ID_SPOTIFY_WEEKLY`, consumed by Tasks 7 and 10.

- [ ] **Step 1: Extend the `deploy` job preflight**

In `.github/workflows/deploy-prod.yml`, add to the `env:` block of
*Verify Render API token + service ID variables are configured* (after line 210):

```yaml
          SERVICE_ID_MATCH_ARTISTS: ${{ vars.RENDER_SERVICE_ID_MATCH_ARTISTS }}
          SERVICE_ID_SPOTIFY_WEEKLY: ${{ vars.RENDER_SERVICE_ID_SPOTIFY_WEEKLY }}
```

and to the `missing` checks:

```bash
          [ -z "$SERVICE_ID_MATCH_ARTISTS" ] && missing+=("RENDER_SERVICE_ID_MATCH_ARTISTS (production-env var)")
          [ -z "$SERVICE_ID_SPOTIFY_WEEKLY" ] && missing+=("RENDER_SERVICE_ID_SPOTIFY_WEEKLY (production-env var)")
```

- [ ] **Step 2: Add the two deploy triggers**

After the *Trigger Render deploy — crawler daily cron* step, add:

```yaml
      - name: Trigger Render deploy — match-artists cron
        env:
          RENDER_API_TOKEN: ${{ secrets.RENDER_API_TOKEN }}
        run: |
          bash .github/scripts/render-trigger-deploy.sh \
            "${{ vars.RENDER_SERVICE_ID_MATCH_ARTISTS }}" \
            "${{ github.event.workflow_run.head_sha || github.sha }}" \
            "Match-artists"

      - name: Trigger Render deploy — spotify-weekly cron
        env:
          RENDER_API_TOKEN: ${{ secrets.RENDER_API_TOKEN }}
        run: |
          bash .github/scripts/render-trigger-deploy.sh \
            "${{ vars.RENDER_SERVICE_ID_SPOTIFY_WEEKLY }}" \
            "${{ github.event.workflow_run.head_sha || github.sha }}" \
            "Spotify-weekly"
```

- [ ] **Step 3: Add them to both rollback paths**

In `deploy-prod.yml`'s `rollback` job, extend the preflight `missing` checks
(lines 548–550) with the two variables, and add after the crawler-daily
rollback step:

```yaml
      - name: Roll back match-artists cron
        env:
          RENDER_API_TOKEN: ${{ secrets.RENDER_API_TOKEN }}
        run: bash .github/scripts/render-rollback.sh "${{ vars.RENDER_SERVICE_ID_MATCH_ARTISTS }}" "concert-crawl-match-artists"

      - name: Roll back spotify-weekly cron
        env:
          RENDER_API_TOKEN: ${{ secrets.RENDER_API_TOKEN }}
        run: bash .github/scripts/render-rollback.sh "${{ vars.RENDER_SERVICE_ID_SPOTIFY_WEEKLY }}" "concert-crawl-spotify-weekly"
```

Make the identical two additions to `.github/workflows/rollback-prod.yml`,
matching that file's existing step shape. Both scripts already no-op with a
`::warning::` for `crn-*` services, so these steps document the intent and
surface the limitation in the log rather than hiding it.

- [ ] **Step 4: Add them to the health checker**

In `.github/workflows/prod-deploy-health.yml`, add the two variables to the
preflight `missing` checks and two more `check` invocations:

```bash
          check "${{ vars.RENDER_SERVICE_ID_MATCH_ARTISTS }}" "concert-crawl-match-artists"
          check "${{ vars.RENDER_SERVICE_ID_SPOTIFY_WEEKLY }}" "concert-crawl-spotify-weekly"
```

- [ ] **Step 5: Add them to `prod-smoke-after-deploy.yml`'s preflight**

That workflow's rollback job validates the three current IDs. Add the two new
ones to its `missing` checks and its rollback steps, matching Step 3. Task 8
retires its push trigger but keeps it dispatchable, so it must stay correct.

- [ ] **Step 6: Validate every touched workflow**

```bash
for file in deploy-prod rollback-prod prod-deploy-health prod-smoke-after-deploy; do
  python3 -c "import sys,yaml;yaml.safe_load(open(sys.argv[1]))" ".github/workflows/$file.yml"
done
```

Expected: no output.

- [ ] **Step 7: Confirm no workflow references an unknown variable**

```bash
grep -rn "RENDER_SERVICE_ID_" .github/workflows/ | grep -c "MATCH_ARTISTS\|SPOTIFY_WEEKLY"
```

Expected: 12 or more (preflight + step per file, across four files).

- [ ] **Step 8: Commit**

```bash
git add .github/workflows/deploy-prod.yml .github/workflows/rollback-prod.yml .github/workflows/prod-deploy-health.yml .github/workflows/prod-smoke-after-deploy.yml
git commit -m "ci(prod): wire match-artists and spotify-weekly into the prod pipeline"
```

---

### Task 7: Promotion is HEAD-only, with a loud override

Because `render-trigger-deploy.sh` cannot pin a `crn-*` service to a
`commitId`, four of the five prod services build branch HEAD regardless of what
the operator asked for. Refuse the mismatch rather than let it pass silently.

**Files:**
- Modify: `.github/workflows/deploy-prod.yml`

**Interfaces:**
- Consumes: `resolve-deployable-sha.sh <sha>` (existing).
- Produces: a `allow_stale_head` boolean dispatch input, read by nothing else.

- [ ] **Step 1: Add the input**

Replace the `on:` block's inputs with:

```yaml
on:
  workflow_dispatch:
    inputs:
      reason:
        description: 'Why are you promoting to prod?'
        required: true
        type: string
      allow_stale_head:
        description: 'Deploy even though main has advanced past this ref (four cron services will build main HEAD regardless)'
        required: false
        default: false
        type: boolean
```

- [ ] **Step 2: Add the HEAD-only gate step**

In the `gate` job, after the *Refuse workflow_dispatch from non-main ref* step,
add:

```yaml
      # Four of the five prod services are Render cron jobs, and the Render API
      # rejects `commitId` for `crn-*` — those deploys always build branch HEAD
      # (see .github/scripts/render-trigger-deploy.sh:99-119). So promoting a
      # SHA that is not main HEAD would ship the requested code to the API and
      # HEAD to the crons, from one green run. Refuse instead, unless the
      # operator opts in explicitly.
      - name: Refuse promotion of a SHA that is not main HEAD
        run: |
          git fetch origin main --depth=20
          main_sha=$(git rev-parse origin/main)
          requested=$(bash .github/scripts/resolve-deployable-sha.sh "${{ github.sha }}")
          head=$(bash .github/scripts/resolve-deployable-sha.sh "$main_sha")
          if [ "$requested" = "$head" ]; then
            echo "Promoting main HEAD ($head); all five prod services will run the same code."
            exit 0
          fi
          echo "Requested deployable: $requested"
          echo "main HEAD deployable: $head"
          if [ "${{ inputs.allow_stale_head }}" = "true" ]; then
            echo "::warning::Promoting $requested while main HEAD is $head. concert-crawl-crawler-triggers, concert-crawl-crawler-daily, concert-crawl-match-artists and concert-crawl-spotify-weekly cannot be pinned and WILL build main HEAD. Only the API service gets $requested."
            exit 0
          fi
          echo "✗ Refusing: the requested ref is not main HEAD."
          echo "  Re-dispatch from main HEAD, or set allow_stale_head=true and accept that"
          echo "  the four cron services will build main HEAD while the API gets the older SHA."
          exit 1
```

This step must come after the existing `Checkout` step so `git fetch` has a
repository — move it below the checkout if the file's step order puts the
refuse-non-main check first.

- [ ] **Step 3: Correct the file header**

The header describes the old model ("prod deploys happen via Render's native
git auto-deploy on push to main"). Replace that opening paragraph with:

```yaml
# The ONLY path to production. Render's native auto-deploy is off on all five
# prod services and the Vercel prod project's git builds are disabled, so prod
# changes exclusively through a dispatch of this workflow. Staging still
# auto-deploys from main on every merge; promotion is the deliberate human step
# that follows a green staging E2E run.
#
# Emergency hotfix path: merge the fix to main as usual, then dispatch this
# workflow. There is no separate procedure — this IS the fast path.
```

Leave the `workflow_run` notes below it intact; they still explain the dead
drift-guard steps.

- [ ] **Step 4: Validate and commit**

```bash
python3 -c "import sys,yaml;yaml.safe_load(open(sys.argv[1]))" .github/workflows/deploy-prod.yml
git add .github/workflows/deploy-prod.yml
git commit -m "ci(prod): refuse promoting a SHA that is not main HEAD"
```

---

### Task 8: Retire the push-triggered prod smoke

`prod-smoke-after-deploy.yml` waits for Render to auto-deploy `github.sha` to
prod. Once auto-deploy is off, that wait can only time out — on every merge.
`deploy-prod.yml` already contains equivalent `smoke` and `rollback` jobs, so
the coverage moves rather than disappears.

**Files:**
- Modify: `.github/workflows/prod-smoke-after-deploy.yml`

**Interfaces:**
- Consumes: nothing.
- Produces: nothing.

- [ ] **Step 1: Drop the push trigger**

Replace its `on:` block with:

```yaml
on:
  workflow_dispatch:
```

- [ ] **Step 2: Rewrite the header's first paragraph**

```yaml
# Dispatch-only prod smoke + rollback. It used to run on every push to main,
# waiting for Render's native auto-deploy; under the promotion gate prod does
# not deploy on push, so that wait could only time out. The promotion path's
# own smoke + rollback jobs live in deploy-prod.yml.
#
# Kept dispatchable because it is the right tool for "smoke prod right now
# without deploying anything" — after a Render incident, or to validate a
# semantic-release commit explicitly.
```

- [ ] **Step 3: Confirm nothing else depends on its push trigger**

```bash
grep -rn "prod-smoke-after-deploy" .github docs | grep -v "^\.github/workflows/prod-smoke-after-deploy.yml"
```

Every hit must be documentation, which Task 11 updates. A `workflow_run`
consumer keyed on this workflow would break — there is none today, and this
check is how you find out if that changed.

- [ ] **Step 4: Validate and commit**

```bash
python3 -c "import sys,yaml;yaml.safe_load(open(sys.argv[1]))" .github/workflows/prod-smoke-after-deploy.yml
git add .github/workflows/prod-smoke-after-deploy.yml
git commit -m "ci(prod): make the post-deploy smoke dispatch-only"
```

---

### Task 9: Promote the web app in the same dispatch

Render is five of the six things prod runs; the sixth is the Vercel web
project. Without this step a promotion ships an API the front end has not
caught up to.

**Files:**
- Modify: `.github/workflows/deploy-prod.yml`

**Interfaces:**
- Consumes: `VERCEL_TOKEN` (secret), `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` (variables), all in the `production` GitHub environment.
- Produces: nothing.

- [ ] **Step 1: Extend the deploy preflight**

Add to the same preflight step's `env:` and `missing` checks:

```yaml
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
          VERCEL_ORG_ID: ${{ vars.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ vars.VERCEL_PROJECT_ID }}
```

```bash
          [ -z "$VERCEL_TOKEN" ] && missing+=("VERCEL_TOKEN (secret)")
          [ -z "$VERCEL_ORG_ID" ] && missing+=("VERCEL_ORG_ID (production-env var)")
          [ -z "$VERCEL_PROJECT_ID" ] && missing+=("VERCEL_PROJECT_ID (production-env var)")
```

- [ ] **Step 2: Add the Vercel promotion step**

Place it **before** the Render trigger steps, so the web build starts while
Render builds, and after the preflight:

```yaml
      # The Vercel prod project's git builds are disabled (Settings → Git →
      # Ignored Build Step = `exit 0`), so this CLI deploy is the only way the
      # web app reaches production. --prod makes it the production deployment
      # and assigns the production domains once the build is healthy; Vercel
      # keeps serving the previous deployment until then.
      - name: Promote web app to Vercel production
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
          VERCEL_ORG_ID: ${{ vars.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ vars.VERCEL_PROJECT_ID }}
        run: |
          npx --yes vercel@latest deploy --prod --yes \
            --token "$VERCEL_TOKEN" \
            --cwd apps/web
```

- [ ] **Step 3: Note the rollback asymmetry in the `rollback` job header**

Add to that job's leading comment:

```yaml
      # Vercel is NOT rolled back here. Its rollback is instant and
      # deployment-scoped (`vercel rollback` / Instant Rollback in the
      # dashboard), it needs no rebuild, and scripting it would mean holding a
      # deployment id across jobs. The runbook carries the two-command manual
      # procedure; see docs/runbooks/auto-deploy-prod.md.
```

- [ ] **Step 4: Validate and commit**

```bash
python3 -c "import sys,yaml;yaml.safe_load(open(sys.argv[1]))" .github/workflows/deploy-prod.yml
git add .github/workflows/deploy-prod.yml
git commit -m "ci(prod): promote the Vercel web app in the prod dispatch"
```

---

### Task 10: Alert when prod falls behind `main`

Manual promotion makes prod deliberately non-current. The 2026-08-29 incident's
lesson was that every alert answered "is prod broken?" and none answered "is
prod current?" — that question is now load-bearing.

**Files:**
- Create: `.github/scripts/render-live-sha.sh`
- Create: `.github/workflows/prod-drift-alert.yml`

**Interfaces:**
- Consumes: `RENDER_API_TOKEN`, `RENDER_SERVICE_ID_API`, `sentry-capture-message.sh`.
- Produces: `render-live-sha.sh <service-id>` printing a bare 40-char SHA on stdout.

- [ ] **Step 1: Write the live-SHA script**

Create `.github/scripts/render-live-sha.sh`:

```bash
#!/usr/bin/env bash
# Print the commit SHA a Render service is currently live on.
#
# Reads the most recent deploy with status `live`. Deliberately NOT the newest
# deploy of any status: a queued or failed build must not read as what prod is
# serving. Deactivated deploys are skipped for the same reason — and note that
# `finishedAt` on a deactivated deploy is when it was superseded, not when it
# built, so never do duration arithmetic on those rows.
set -euo pipefail

service_id="${1:?usage: render-live-sha.sh <service-id>}"
: "${RENDER_API_TOKEN:?RENDER_API_TOKEN must be set}"

response=$(curl -sS --fail-with-body \
  -H "Authorization: Bearer $RENDER_API_TOKEN" \
  -H 'Accept: application/json' \
  "https://api.render.com/v1/services/${service_id}/deploys?limit=20")

sha=$(echo "$response" \
  | jq -r 'first(.[] | select(.deploy.status == "live") | .deploy.commit.id) // empty')

if [ -z "$sha" ]; then
  echo "No live deploy found for $service_id in the last 20 deploys" >&2
  exit 1
fi

echo "$sha"
```

```bash
chmod +x .github/scripts/render-live-sha.sh
```

- [ ] **Step 2: Verify the script against the real service**

With a Render API token exported:

```bash
RENDER_API_TOKEN=... bash .github/scripts/render-live-sha.sh srv-d7lngqfavr4c73eme3b0
```

Expected: one 40-character hex SHA. Cross-check it against
`git log --oneline -1 <sha>` — it must resolve to a real commit on `main`.

- [ ] **Step 3: Write the alert workflow**

Create `.github/workflows/prod-drift-alert.yml`:

```yaml
name: Prod drift alert

# Answers "is prod current?", which no other alert does. Under the promotion
# gate prod is deliberately behind main; this bounds how far. Warn only — it
# never promotes anything, because the whole point of the gate is that a human
# decides.

on:
  schedule:
    # 15:00 UTC daily — after the 09:00 UTC crawl and the 16:00 UTC
    # match-artists cron have both settled, so a drift warning is never
    # competing with a crawl incident for attention.
    - cron: '0 15 * * *'
  workflow_dispatch:

permissions:
  contents: read

jobs:
  drift:
    name: Compare prod live SHA against main
    runs-on: ubuntu-latest
    timeout-minutes: 10
    environment: production
    env:
      MAX_DAYS_BEHIND: 7
      MAX_COMMITS_BEHIND: 25
    steps:
      - name: Checkout
        uses: actions/checkout@v7
        with:
          fetch-depth: 0

      - name: Verify configuration
        env:
          RENDER_API_TOKEN: ${{ secrets.RENDER_API_TOKEN }}
        run: |
          missing=()
          [ -z "$RENDER_API_TOKEN" ] && missing+=("RENDER_API_TOKEN (secret)")
          [ -z "${{ vars.RENDER_SERVICE_ID_API }}" ] && missing+=("RENDER_SERVICE_ID_API (production-env var)")
          if [ ${#missing[@]} -gt 0 ]; then
            printf 'Missing configuration:\n'
            printf '  - %s\n' "${missing[@]}"
            exit 1
          fi

      - name: Measure drift
        id: measure
        env:
          RENDER_API_TOKEN: ${{ secrets.RENDER_API_TOKEN }}
        run: |
          live_sha=$(bash .github/scripts/render-live-sha.sh "${{ vars.RENDER_SERVICE_ID_API }}")
          main_sha=$(git rev-parse origin/main)
          echo "live_sha=$live_sha" >> "$GITHUB_OUTPUT"

          if [ "$live_sha" = "$main_sha" ]; then
            echo "Prod is current on $live_sha."
            echo "drifted=false" >> "$GITHUB_OUTPUT"
            exit 0
          fi

          # A SHA Render is live on can be missing locally if it was never on
          # main (a hand-triggered Render build from another ref). Treat that as
          # drift with unknown distance rather than failing the job — "prod is
          # running something main does not contain" is exactly what this alert
          # is for.
          if ! git cat-file -e "${live_sha}^{commit}" 2>/dev/null; then
            echo "commits=unknown" >> "$GITHUB_OUTPUT"
            echo "days=unknown" >> "$GITHUB_OUTPUT"
            echo "drifted=true" >> "$GITHUB_OUTPUT"
            exit 0
          fi

          commits=$(git rev-list --count "${live_sha}..origin/main")
          live_ts=$(git show -s --format=%ct "$live_sha")
          days=$(( ( $(date -u +%s) - live_ts ) / 86400 ))
          echo "commits=$commits" >> "$GITHUB_OUTPUT"
          echo "days=$days" >> "$GITHUB_OUTPUT"
          echo "Prod is $commits commits and $days days behind main."

          if [ "$commits" -gt "$MAX_COMMITS_BEHIND" ] || [ "$days" -gt "$MAX_DAYS_BEHIND" ]; then
            echo "drifted=true" >> "$GITHUB_OUTPUT"
          else
            echo "drifted=false" >> "$GITHUB_OUTPUT"
          fi

      - name: Report drift to Sentry
        if: steps.measure.outputs.drifted == 'true'
        env:
          SENTRY_DSN: ${{ secrets.SENTRY_DSN }}
        run: |
          bash .github/scripts/sentry-capture-message.sh \
            "Prod is behind main: ${{ steps.measure.outputs.commits }} commits, ${{ steps.measure.outputs.days }} days (live ${{ steps.measure.outputs.live_sha }}). Promote with the Deploy to Production workflow, or say why not."
```

Match `sentry-capture-message.sh`'s actual argument order and required
environment variables — read the script's header before writing this step
rather than assuming the signature above.

- [ ] **Step 4: Validate the YAML and shellcheck the script**

```bash
python3 -c "import sys,yaml;yaml.safe_load(open(sys.argv[1]))" .github/workflows/prod-drift-alert.yml
shellcheck .github/scripts/render-live-sha.sh
```

Expected: no output from either. If `shellcheck` is not installed, skip it and
say so in the PR body.

- [ ] **Step 5: Dispatch it and read the output**

```bash
gh workflow run prod-drift-alert.yml --ref <this-branch>
```

Expected: the run reports prod as current (or a small non-zero drift) and does
not send to Sentry. A `drifted=true` on the first run before the gate is armed
means the measurement is wrong — investigate before merging.

- [ ] **Step 6: Commit**

```bash
git add .github/scripts/render-live-sha.sh .github/workflows/prod-drift-alert.yml
git commit -m "ci(prod): alert when prod falls behind main"
```

---

### Task 11: Make the documentation match the new model

Every runbook currently describes push-to-deploy prod. `render.yaml` is
descriptive and hand-synced, and one previous lapse in that sync *was* an
outage — so it changes in the same session as the live config.

**Files:**
- Modify: `render.yaml`
- Modify: `docs/runbooks/auto-deploy-prod.md`
- Modify: `docs/runbooks/render-service-config.md`
- Modify: `CLAUDE.md`
- Modify: `docs/superpowers/progress.md`

**Interfaces:**
- Consumes: nothing.
- Produces: nothing.

- [ ] **Step 1: Declare `autoDeploy: false` on the five prod services**

In `render.yaml`, add `autoDeploy: false` to `concert-crawl-api` (line 24's
block), `concert-crawl-crawler-triggers`, `concert-crawl-crawler-daily`,
`concert-crawl-match-artists` and `concert-crawl-spotify-weekly`. Leave every
`-staging` entry alone — staging keeps auto-deploying. Add above the first one:

```yaml
    # Prod deploys only through .github/workflows/deploy-prod.yml. This file is
    # descriptive, not a Blueprint: editing it deploys nothing and changes no
    # live setting. The live value is set over the Render API — keep both in
    # sync in the same session.
```

- [ ] **Step 2: Rewrite the prod deploy runbook**

`docs/runbooks/auto-deploy-prod.md` needs, at minimum:
- The new flow: merge → staging auto-deploys → staging-smoke + staging-e2e →
  human validates → dispatch **Deploy to Production** with a reason.
- That the emergency hotfix path is the same dispatch, not a separate one.
- That four of five services build `main` HEAD and cannot be pinned or
  auto-rolled-back, and what `allow_stale_head` therefore means.
- That prod migrations run in the API `buildCommand` and so are gated with it,
  and why expand/contract makes the lag safe.
- The Vercel rollback procedure, since the workflow does not do it:
  `npx vercel@latest rollback --token "$VERCEL_TOKEN" --cwd apps/web` (or
  Instant Rollback in the dashboard), then re-dispatch once the fix is on main.
- That `prod-smoke-after-deploy.yml` is dispatch-only now and what it is for.
- The drift alert's thresholds and what to do when it fires.

- [ ] **Step 3: Update the Render config runbook**

In `docs/runbooks/render-service-config.md`, change the "Active services"
paragraph — it currently reads *"All have `autoDeploy: yes`"*, which becomes
wrong for the five prod services — and add an `autoDeploy` column to the table.
Note that `concert-crawl-billing-jobs` is declared for prod in `render.yaml`
but has no live prod service.

- [ ] **Step 4: Update the `CLAUDE.md` Environments row**

Replace the Environments architecture-decision row's rationale with the
promotion model: staging auto-deploys from `main` and is now a gate; prod
deploys only by dispatch; CI on the PR is still the pre-merge gate. Keep the
row's format identical to its neighbours.

- [ ] **Step 5: Add the progress row**

Add a ✅ Complete row to `docs/superpowers/progress.md` dated `2026-09-01`
describing the promotion gate. This qualifies as substantive: it changes how
every future change reaches production.

- [ ] **Step 6: Check for other stale references**

```bash
grep -rln "auto-deploy\|autoDeploy\|auto deploy" docs CLAUDE.md
```

Read each hit and fix any that asserts prod deploys on push. Fix the whole
class in this commit — a stale deploy doc is how the next session learns the
wrong model.

- [ ] **Step 7: Commit**

```bash
git add render.yaml docs CLAUDE.md
git commit -m "docs(deploy): describe the prod promotion gate"
```

---

### Task 12: Throw the switch

Everything above is inert until the live configuration changes. This is the only
task that touches production, and it is last on purpose. It is Hugh's call to
run it; an agent must not flip these without him saying go.

**Files:** none — live configuration only.

**Interfaces:**
- Consumes: Tasks 6, 7, 9, 10 merged to `main`.
- Produces: a promotion-gated production environment.

- [ ] **Step 1: Create the GitHub configuration**

In Settings → Environments → `production`:
- Variables: `RENDER_SERVICE_ID_MATCH_ARTISTS` = `crn-d9nm08e7bikc73c6q39g`,
  `RENDER_SERVICE_ID_SPOTIFY_WEEKLY` = `crn-d9e46ad7vvec73dsn7bg`,
  `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` (both from Vercel → the `concert-crawl`
  project → Settings → General).
- Secret: `VERCEL_TOKEN`, created at Vercel → Account Settings → Tokens, scoped
  to the team that owns the project.

Never paste a token into chat, a file, or a commit.

- [ ] **Step 2: Arm the workflow**

Set the repository variable `AUTO_DEPLOY_PROD_ENABLED` to `true`. Until it is,
`deploy-prod.yml`'s gate job silently skips and a dispatch does nothing.

- [ ] **Step 3: Prove the pipeline works while auto-deploy is still on**

Dispatch **Deploy to Production** from `main` with reason
`promotion-gate dry run — verifying the dispatch path before disabling auto-deploy`.
Expected: gate passes, five Render deploys trigger, the Vercel step deploys,
wait-for-live succeeds, smoke passes, rollback does not run. Fix any failure
here — this is the last moment at which the old path is still a safety net.

- [ ] **Step 4: Disable Vercel's git production builds**

Vercel → `concert-crawl` (production project) → Settings → Git → Ignored Build
Step → "Custom" → `exit 0`. Exit code 0 means "skip this build". Do **not**
change `concert-crawl-staging`, and do **not** put this in `vercel.json` — both
projects read the same file and it would disable staging too.

Verify: push any commit to `main` and confirm the prod project records a skipped
deployment while the staging project builds normally.

- [ ] **Step 5: Disable Render auto-deploy on the five prod services**

For each of the five prod service IDs in Global Constraints:

```bash
curl -sS --fail-with-body -X PATCH \
  -H "Authorization: Bearer $RENDER_API_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"autoDeploy": "no"}' \
  "https://api.render.com/v1/services/<service-id>" | jq '{name, autoDeploy}'
```

Expected per service: `"autoDeploy": "no"`. Read the value back rather than
trusting the 200 — a Render API 200 has previously been returned for a change
that did not take.

Do not touch `srv-d7lnkdmgvqtc73f8eec0` (`concert-crawl-api-staging`).

- [ ] **Step 6: Confirm a merge no longer deploys prod**

Merge anything to `main` (a docs change is ideal) and confirm: the staging API
builds, the prod API records no new deploy, `staging-smoke` and `staging-e2e`
both run, and `prod-smoke-after-deploy.yml` does not.

- [ ] **Step 7: Promote for real, and record the result**

Dispatch **Deploy to Production** with a real reason. Confirm all five services
reach `live` on the same SHA and that `/v1/health` returns 200. Note the total
wall-clock time in the runbook — that number is what "how long does a promotion
take" should be answered with, rather than an estimate.

---

## Self-Review

**Spec coverage.** Workstream 1 → Tasks 1–5. Workstream 2 → Task 6.
Workstream 3 → Tasks 7–9 and 12. Workstream 5 → Task 10. Documentation of
D3/D4 → Task 11. Workstream 4 is the separate
`2026-09-01-prod-to-staging-content-sync.md` plan.

**Decisions traced.** D1 (manual promotion) → Task 7's dispatch inputs. D2
(dispatch mechanism) → Tasks 7, 12. D3 (HEAD-only) → Task 7 Step 2. D4
(migrations coupled) → Task 11 Step 2. D5 (drift alert) → Task 10. D6 (content
sync) → the other plan. D7 (staging E2E) → Tasks 1–5.

**Known gaps, stated rather than hidden.**
- Task 4 Step 1 is a genuine reproduction step, not a placeholder: the fix in
  Step 3 is correct for the expected finding (fallback absent from the cache),
  and Step 1 says explicitly what a different finding means.
- Task 10 Step 3 tells the implementer to read
  `sentry-capture-message.sh`'s header for its real signature rather than
  trusting the invocation shown.
- Vercel's current Production Branch and Ignored Build Step values are unknown
  (`vercel project inspect` does not expose them). Task 12 Step 4 sets the one
  that matters; if the Production Branch is not `main`, stop and reconcile
  before continuing.
