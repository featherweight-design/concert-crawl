# Auth & Routing Batch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix three pre-beta auth/routing gaps: redirect unauthenticated users to `/`, add a Sign In path on the landing page for existing users, and lock down public API routes behind a feature-flagged env var for private beta.

**Architecture:** Three independent changes — one middleware tweak, one UI addition, and one API middleware addition. The API lockdown uses a `REQUIRE_BETA_AUTH=true` env var checked at module load time so it can be disabled at launch without a code change.

**Tech Stack:** Next.js 14 (App Router), Clerk (`@clerk/nextjs/server`), Hono, `@hono/clerk-auth`, Vitest

---

## Files

| File | Change |
|------|--------|
| `apps/web/src/middleware.ts` | Add `unauthenticatedUrl` option to `auth.protect()` |
| `apps/web/src/app/_components/LandingClientShell.tsx` | Add "Already have an account? Sign in →" link below CTA buttons |
| `apps/api/src/routes/events.ts` | Conditionally add `clerkMiddleware(), requireAuth` to `GET /` |
| `apps/api/src/routes/venues-public.ts` | Conditionally add `clerkMiddleware(), requireAuth` to all routes |
| `apps/api/src/routes/search.ts` | Conditionally add `clerkMiddleware(), requireAuth` to all routes |
| `apps/api/.env.example` | Document `REQUIRE_BETA_AUTH` |
| `apps/api/src/routes/events.integration.test.ts` | Add tests for beta auth gate |
| `apps/api/src/routes/venues-public.integration.test.ts` | Add tests for beta auth gate |
| `apps/api/src/routes/search.integration.test.ts` | Add tests for beta auth gate |

---

## Task 1: Fix unauthenticated redirect → `/` (#339)

**Files:**
- Modify: `apps/web/src/middleware.ts`

The current `auth.protect()` call at line 54 uses Clerk's default redirect, which goes to `/sign-in`. It should redirect to `/` so unauthenticated users land on the landing page.

- [ ] **Step 1: Update `auth.protect()` call**

Replace line 54 in `apps/web/src/middleware.ts`:

```ts
// Before
  await auth.protect()

// After
  await auth.protect({ unauthenticatedUrl: new URL('/', req.url).toString() })
```

Full updated middleware for reference:

```ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isAlwaysPublic = createRouteMatcher([
  '/',
  '/auth/code(.*)',
  '/sign-in(.*)',
  '/api/webhooks(.*)',
  '/legal(.*)',
])

const isInviteGated = createRouteMatcher(['/onboarding(.*)', '/sign-up(.*)'])

const isPreAuth = createRouteMatcher([
  '/auth/code(.*)',
  '/onboarding(.*)',
  '/sign-up(.*)',
])

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth()

  if (userId) {
    if (isPreAuth(req)) {
      return NextResponse.redirect(new URL('/events', req.url))
    }
    return
  }

  if (req.nextUrl.pathname === '/') {
    const inviteCookie = req.cookies.get('invite_verified')?.value
    if (inviteCookie) {
      return NextResponse.redirect(new URL('/onboarding', req.url))
    }
  }

  if (isAlwaysPublic(req)) return

  if (isInviteGated(req)) {
    const cookieValue = req.cookies.get('invite_verified')?.value
    if (!cookieValue) {
      return NextResponse.redirect(new URL('/auth/code', req.url))
    }
    return
  }

  await auth.protect({ unauthenticatedUrl: new URL('/', req.url).toString() })
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
```

- [ ] **Step 2: Verify type-check passes**

```bash
cd /Users/huey/Projects/concert-crawl/.worktrees/feat/auth-routing-batch
pnpm --filter web tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/middleware.ts
git commit -m "fix(web): redirect unauthenticated users to / instead of sign-in"
```

---

## Task 2: Add Sign In path to landing page (#340)

**Files:**
- Modify: `apps/web/src/app/_components/LandingClientShell.tsx`

Add a small "Already have an account? Sign in →" text link below the CTA button groups. It must appear in both the desktop block (line 178) and the mobile block (line 195). Use `var(--fg-muted)` colour so it doesn't compete with the two main CTAs.

- [ ] **Step 1: Add sign-in link element after both CTA groups**

In `apps/web/src/app/_components/LandingClientShell.tsx`, replace the desktop CTA block:

```tsx
{/* CTAs — desktop only (horizontal row: code primary, waitlist secondary) */}
<div className="hidden md:flex flex-col gap-3">
  <div className="flex flex-row gap-3">
    {ctaCode}
    {ctaWaitlist}
  </div>
  <Link
    href="/sign-in"
    style={{
      fontSize: 13,
      color: 'var(--fg-muted)',
      textDecoration: 'none',
      fontFamily: 'Inter, system-ui',
      fontWeight: 500,
    }}
  >
    Already have an account? Sign in →
  </Link>
</div>
```

And replace the mobile CTA block:

```tsx
{/* CTAs — mobile only (stacked: code primary, waitlist secondary) */}
<div className="flex flex-col gap-3 md:hidden">
  {ctaCode}
  {ctaWaitlist}
  <Link
    href="/sign-in"
    style={{
      fontSize: 13,
      color: 'var(--fg-muted)',
      textDecoration: 'none',
      fontFamily: 'Inter, system-ui',
      fontWeight: 500,
    }}
  >
    Already have an account? Sign in →
  </Link>
</div>
```

- [ ] **Step 2: Verify type-check passes**

```bash
pnpm --filter web tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/_components/LandingClientShell.tsx
git commit -m "feat(landing): add Sign In path for existing users below CTA buttons"
```

---

## Task 3: Document `REQUIRE_BETA_AUTH` env var (#106)

**Files:**
- Modify: `apps/api/.env.example`

Add the env var before writing any code that uses it — keeps the intent clear.

- [ ] **Step 1: Add to `.env.example`**

In `apps/api/.env.example`, append after the `ALLOWED_ORIGIN` line:

```
# Beta auth gate — set to "true" to require Clerk JWT on public browse/search/venues routes.
# Remove or set to any other value to open these routes at launch.
REQUIRE_BETA_AUTH=true
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/.env.example
git commit -m "chore(api): document REQUIRE_BETA_AUTH env var"
```

---

## Task 4: Lock down `GET /v1/venues` (#106)

**Files:**
- Modify: `apps/api/src/routes/venues-public.ts`
- Modify: `apps/api/src/routes/venues-public.integration.test.ts`

- [ ] **Step 1: Write the failing test**

In `apps/api/src/routes/venues-public.integration.test.ts`, add a new `describe` block at the end of the file:

```ts
describe('GET /v1/venues — beta auth gate', () => {
  it('returns 401 when REQUIRE_BETA_AUTH=true and no token provided', async () => {
    const original = process.env.REQUIRE_BETA_AUTH
    process.env.REQUIRE_BETA_AUTH = 'true'
    // Re-import to pick up the new env value
    vi.resetModules()
    const { createApp } = await import('../app.js')
    const gatedApp = createApp()
    const res = await gatedApp.request('/v1/venues')
    process.env.REQUIRE_BETA_AUTH = original
    expect(res.status).toBe(401)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter api vitest run src/routes/venues-public.integration.test.ts
```

Expected: new test FAILS (routes return 200, not 401).

- [ ] **Step 3: Add conditional auth to `venues-public.ts`**

In `apps/api/src/routes/venues-public.ts`, add the conditional gate after the router is created:

```ts
import { Hono } from 'hono'
import { clerkMiddleware } from '@hono/clerk-auth'
import { db, events, venues } from '@concert-crawl/db'
import { type SQL, and, asc, eq, gte } from 'drizzle-orm'
import { todayInTimezone } from '../lib/time.js'
import { requireAuth } from '../middleware/auth.js'

export const venuesPublicRouter = new Hono()

if (process.env.REQUIRE_BETA_AUTH === 'true') {
  venuesPublicRouter.use('*', clerkMiddleware(), requireAuth)
}

// GET /v1/venues — list active venues
venuesPublicRouter.get('/', async (ctx) => {
  // ... existing handler unchanged ...
})
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm --filter api vitest run src/routes/venues-public.integration.test.ts
```

Expected: all tests pass. The existing tests pass because `REQUIRE_BETA_AUTH` is not set to `'true'` in the test environment. The new test sets it explicitly and resets it after.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/routes/venues-public.ts apps/api/src/routes/venues-public.integration.test.ts
git commit -m "feat(api): gate GET /v1/venues behind REQUIRE_BETA_AUTH"
```

---

## Task 5: Lock down `GET /v1/search/popular` (#106)

**Files:**
- Modify: `apps/api/src/routes/search.ts`
- Modify: `apps/api/src/routes/search.integration.test.ts`

- [ ] **Step 1: Write the failing test**

In `apps/api/src/routes/search.integration.test.ts`, add at the end:

```ts
describe('GET /v1/search/popular — beta auth gate', () => {
  it('returns 401 when REQUIRE_BETA_AUTH=true and no token provided', async () => {
    const original = process.env.REQUIRE_BETA_AUTH
    process.env.REQUIRE_BETA_AUTH = 'true'
    vi.resetModules()
    const { createApp } = await import('../app.js')
    const gatedApp = createApp()
    const res = await gatedApp.request('/v1/search/popular')
    process.env.REQUIRE_BETA_AUTH = original
    expect(res.status).toBe(401)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter api vitest run src/routes/search.integration.test.ts
```

Expected: new test FAILS.

- [ ] **Step 3: Add conditional auth to `search.ts`**

```ts
import { Hono } from 'hono'
import { clerkMiddleware } from '@hono/clerk-auth'
import { db, events, userEvents, venues } from '@concert-crawl/db'
import { and, asc, desc, eq, gte, sql } from 'drizzle-orm'
import { todayInTimezone } from '../lib/time.js'
import { requireAuth } from '../middleware/auth.js'

export const searchRouter = new Hono()

if (process.env.REQUIRE_BETA_AUTH === 'true') {
  searchRouter.use('*', clerkMiddleware(), requireAuth)
}

// GET /v1/search/popular — top 5 upcoming events by watcher count
searchRouter.get('/popular', async (ctx) => {
  // ... existing handler unchanged ...
})
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm --filter api vitest run src/routes/search.integration.test.ts
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/routes/search.ts apps/api/src/routes/search.integration.test.ts
git commit -m "feat(api): gate GET /v1/search/popular behind REQUIRE_BETA_AUTH"
```

---

## Task 6: Lock down `GET /v1/events` (#106)

**Files:**
- Modify: `apps/api/src/routes/events.ts`
- Modify: `apps/api/src/routes/events.integration.test.ts`

Note: `GET /v1/events/:id` already uses `clerkMiddleware()` for optional auth and must not be changed. Only the list route (`GET /`) is being gated.

- [ ] **Step 1: Write the failing test**

In `apps/api/src/routes/events.integration.test.ts`, add at the end of the file (after all existing `describe` blocks):

```ts
describe('GET /v1/events — beta auth gate', () => {
  it('returns 401 when REQUIRE_BETA_AUTH=true and no token provided', async () => {
    const original = process.env.REQUIRE_BETA_AUTH
    process.env.REQUIRE_BETA_AUTH = 'true'
    vi.resetModules()
    const { createApp } = await import('../app.js')
    const gatedApp = createApp()
    const res = await gatedApp.request('/v1/events')
    process.env.REQUIRE_BETA_AUTH = original
    expect(res.status).toBe(401)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter api vitest run src/routes/events.integration.test.ts
```

Expected: new test FAILS (list returns 200).

- [ ] **Step 3: Add conditional auth to `events.ts`**

In `apps/api/src/routes/events.ts`, after the `eventsRouter` is instantiated (find the line `export const eventsRouter = new Hono()`), add:

```ts
import { clerkMiddleware as clerkMw } from '@hono/clerk-auth'
import { requireAuth } from '../middleware/auth.js'

export const eventsRouter = new Hono()

if (process.env.REQUIRE_BETA_AUTH === 'true') {
  // Gate only the list route — /:id already uses optional clerkMiddleware
  eventsRouter.use('/', clerkMw(), requireAuth)
}
```

Keep all existing route handlers exactly as they are below this block.

Note: `clerkMiddleware` is already imported in `events.ts` as `clerkMiddleware` from `@hono/clerk-auth`. Use an alias `clerkMw` for the module-level import to avoid shadowing the existing per-route usage, OR check if `clerkMiddleware` is already imported and reuse it. Look at the top of `events.ts` before editing — if `clerkMiddleware` is already imported there, reuse it directly without an alias.

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm --filter api vitest run src/routes/events.integration.test.ts
```

Expected: all pass.

- [ ] **Step 5: Run full API test suite**

```bash
pnpm --filter api vitest run
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/routes/events.ts apps/api/src/routes/events.integration.test.ts
git commit -m "feat(api): gate GET /v1/events behind REQUIRE_BETA_AUTH"
```

---

## Task 7: Final checks and PR

- [ ] **Step 1: Run full typecheck across the monorepo**

```bash
cd /Users/huey/Projects/concert-crawl/.worktrees/feat/auth-routing-batch
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 2: Run full lint**

```bash
pnpm lint
```

Expected: no errors.

- [ ] **Step 3: Run full test suite**

```bash
pnpm test
```

Expected: all pass.

- [ ] **Step 4: Update progress.md**

In `docs/superpowers/progress.md`, update the three open rows to completed and add a 🔄 row for this PR:

```markdown
| —           | fix: auth redirect → /, Sign In path, beta API gate (#339, #340, #106) | 🔄 Open |
```

Replace the three existing open rows:
```
| Pre-beta    | Auth redirect: unauthenticated routes → /login (#339)            | 🔄 Open (high)   |
| Pre-beta    | Landing page Sign In path for existing users (#340)              | 🔄 Open (high)   |
| Pre-beta    | Auth on all user-facing API routes (#106)                        | 🔄 Open (normal) |
```

with:

```markdown
| —           | Auth redirect → /, Sign In path, beta API gate (#339, #340, #106) | 🔄 Open |
```

- [ ] **Step 5: Commit progress.md**

```bash
git add docs/superpowers/progress.md
git commit -m "chore: update progress.md — auth/routing batch PR"
```

- [ ] **Step 6: Push and open PR**

```bash
git push -u origin feat/auth-routing-batch
gh pr create \
  --title "fix(auth): redirect → /, landing sign-in path, beta API gate" \
  --body "$(cat <<'EOF'
## Summary

Batches three pre-beta auth/routing issues:

- **#339** — Unauthenticated users hitting protected routes now redirect to `/` (landing page) instead of Clerk's default `/sign-in`
- **#340** — Landing page gains an "Already have an account? Sign in →" text link below the CTA buttons for returning users
- **#106** — `GET /v1/events`, `GET /v1/venues`, and `GET /v1/search/popular` are gated behind a `REQUIRE_BETA_AUTH=true` env var; flip to any other value at launch to open them without a deploy

## Env vars

| Name | Purpose | How to set |
|------|---------|------------|
| `REQUIRE_BETA_AUTH` | When `"true"`, requires a valid Clerk JWT on public browse/search/venue API routes | Set in Render environment variables for both staging and prod API services |

## Test plan

- [ ] Sign out → navigate to `/events` → confirm redirect to `/`
- [ ] Landing page → confirm "Already have an account? Sign in →" appears below buttons on mobile and desktop
- [ ] Click "Sign in →" → confirm lands on `/sign-in` (Clerk sign-in page)
- [ ] With `REQUIRE_BETA_AUTH=true` in API env: `curl /v1/events` returns 401; authenticated request returns 200
- [ ] Integration tests pass: `pnpm --filter api vitest run`

Closes #339
Closes #340
Closes #106
EOF
)"
```
