# Production Launch Runbook

Steps to bring the production environment fully online. Complete these in order — later steps depend on earlier ones.

This runbook reflects the post-2026-06-15 architecture: **web on Vercel, Postgres on Neon, API + crawler crons on Render**. See `docs/superpowers/progress.md` for the migration history.

---

## Prerequisites

- Staging environment is healthy and all pre-beta checklist items are validated there
- Access to dashboards: Vercel, Neon, Render, Cloudflare, Clerk (both Production and Staging apps), Stripe, Resend, Sentry, GitHub repository settings
- Local tools: Docker (for `pg_dump`/`psql` via `postgres:16` image), `pnpm`, `gh` CLI

### Service inventory

| Concern | Provider | Resource |
| --- | --- | --- |
| Web (prod) | Vercel | project `concert-crawl`, custom domain `concertcrawl.app` |
| Web (staging) | Vercel | project `concert-crawl-staging`, custom domain `staging.concertcrawl.app` |
| API (prod) | Render | web service `concert-crawl-api` |
| API (staging) | Render | web service `concert-crawl-api-staging` |
| Crawler triggers (prod) | Render | cron job `concert-crawl-crawler-triggers` (`*/10 * * * *`) |
| Crawler daily (prod) | Render | cron job `concert-crawl-crawler-daily` (`0 9 * * *` = 3 AM MT) |
| Crawler triggers (staging) | Render | cron job `concert-crawl-crawler-triggers-staging` |
| Crawler daily (staging) | Render | cron job `concert-crawl-crawler-daily-staging` |
| Database | Neon | project `concert-crawl`, branches `production` + `staging` (PG 16, AWS us-west-2 Oregon) |
| Auth | Clerk | two apps: **Concert Crawl** (prod, Production instance) and **Concert Crawl Staging** (staging, Production instance) |
| DNS | Cloudflare | zone `concertcrawl.app` — DNS only, no proxy |

---

## Step 1 — Clerk Production Instance

Concert Crawl uses **two separate Clerk apps** for isolation between staging and prod.

1. Go to [clerk.com](https://clerk.com) → select the **Concert Crawl** app (or create it if it doesn't exist) → open the **Production** instance
2. Under **Domains**, add `concertcrawl.app` as the production domain (Clerk derives `clerk.concertcrawl.app` as the Frontend API host)
3. **Configure the JWT session token template** — required for API role-based auth:
   - **Sessions** → **Customize session token**
   - Add to the token claims:
     ```json
     { "metadata": "{{user.public_metadata}}" }
     ```
   - Without this, `requireRole()` in the API always returns 403
4. Configure social providers — mirror what staging has (Google, etc.). For Google specifically, see issue #589 for the future migration from a shared OAuth client (current state) to a dedicated prod client.
5. Copy these values — you'll need them in later steps:
   - **Publishable Key** — `pk_live_*` (encodes `clerk.concertcrawl.app`)
   - **Secret Key** — `sk_live_*`

> ⚠️ **Multi-service Clerk key consistency.** The Vercel web project, the Render API service, and any service that validates Clerk JWTs must all use the **same Clerk instance's keys**. Mixing prod and staging keys across services results in 401s on cross-service calls — verify by decoding the `pk` (base64 of bytes after `pk_live_`) to confirm the encoded domain matches. See the operational notes section.

---

## Step 2 — Neon Database

1. Sign in to [neon.tech](https://neon.tech) → workspace owner ≥ **Launch** plan (~$19/mo) for production
2. **Create project** `concert-crawl`:
   - **Postgres version:** 16 (match Render's default; cross-major dumps are flaky)
   - **Region:** AWS us-west-2 (Oregon) — co-located with Render's API region for sub-10ms latency
   - **Enable Neon Auth:** OFF (we use Clerk)
3. The default branch is `production` (or rename to match if Neon defaults differ)
4. **Create the staging branch:** sidebar **Branches** → **Create branch** → name `staging`, parent = `production`, "Branch data and schema"
5. For each branch, grab **both** connection strings from **Connection Details**:
   - **Pooled** (hostname contains `-pooler`) — used by API + crawler crons at runtime, for connection multiplexing under load. The DB client sets `prepare: false` for pooler compatibility (poolers don't speak prepared-statement protocol); that setting works against the direct URL too, so the choice between pooled/direct is about runtime scaling, not protocol correctness.
   - **Direct** (no `-pooler`) — used for `pg_dump`/`pg_restore` and `pnpm db:migrate` (DDL transactions can choke on pgbouncer-style pooling)
6. Save all four URLs locally (not in repo, not in chat) — they're needed in Steps 4, 6, and 7.

> Neon's `channel_binding=require` query param is present in default URLs and is honored by `postgres-js` — leave it in.

---

## Step 3 — Run Migrations Against Neon Prod

Migrations do **not** run automatically on production deploys. Run them manually before the first deploy and before any deploy that includes schema changes.

```bash
DATABASE_URL='<NEON_PROD_DIRECT>' pnpm db:migrate
```

Use the **direct** URL — `db:migrate` runs a transaction and the pooled URL can mis-handle that.

Verify migration count matches staging:

```bash
docker run --rm postgres:16 psql '<NEON_PROD_DIRECT>' -c \
  "SELECT COUNT(*) FROM drizzle.__drizzle_migrations;"
```

> **Expand/contract discipline:** always run the expand migration before deploying new code that depends on it. Never run a destructive (contract) migration in the same deploy as the code change. See `docs/runbooks/db-rollback.md` for rollback steps.

---

## Step 4 — Seed Neon Prod from Staging

Production schema is empty after Step 3. Seed at least `venues` (crawler dependency) and optionally `events` (public catalog data — no user FKs).

```bash
mkdir -p ~/concert-crawl-migration && cd ~/concert-crawl-migration

export NEON_STAGING_DIRECT='<staging direct URL>'
export NEON_PROD_DIRECT='<prod direct URL>'

# Dump venues then events from Neon staging
docker run --rm postgres:16 pg_dump \
  --data-only --no-owner --no-privileges \
  --table=public.venues "$NEON_STAGING_DIRECT" > venues.sql

docker run --rm postgres:16 pg_dump \
  --data-only --no-owner --no-privileges \
  --table=public.events "$NEON_STAGING_DIRECT" > events.sql

# Restore venues first (events depends on venues via FK)
docker run --rm -i postgres:16 psql "$NEON_PROD_DIRECT" < venues.sql
docker run --rm -i postgres:16 psql "$NEON_PROD_DIRECT" < events.sql

# Verify counts match staging
docker run --rm postgres:16 psql "$NEON_PROD_DIRECT" -c "
  SELECT 'venues' AS t, COUNT(*) FROM public.venues
  UNION ALL SELECT 'events', COUNT(*) FROM public.events;"
```

**Do NOT** copy user-tied tables (`users`, `user_profiles`, `user_events`, `user_artist_follows`, `price_submissions`, `feedback`, `invite_codes`, `audit_log`, `crawl_runs`, `crawl_triggers`, `price_retrieval_log`) — they reference users from the *staging* Clerk instance and would break FK constraints + leak staging-only operational data.

---

## Step 5 — Third-Party Services

### Stripe

1. Switch Stripe account to **Live** mode → copy live **Secret Key** (`sk_live_*`)
2. Set up a **production** webhook endpoint:
   - URL: `https://concert-crawl-api.onrender.com/v1/webhooks/stripe`
   - Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
   - Copy the **Webhook Signing Secret**
3. Staging webhook (if not already set up):
   - URL: `https://concert-crawl-api-staging.onrender.com/v1/webhooks/stripe`
   - Same events; copy the staging webhook secret separately

### Resend

1. Resend dashboard → **Domains** → **Add Domain** → `concertcrawl.app`
2. Resend shows four DNS records (two DKIM `TXT`, one SPF `TXT`, one DMARC `TXT`) — add all in Cloudflare. Merge with any existing SPF record rather than creating a second.
3. **Verify** in Resend — wait for all four to go green
4. Copy the **API Key**

### Sentry

Create three Sentry projects (or reuse existing):

1. `concert-crawl-api` — copy DSN
2. `concert-crawl-web` — copy DSN
3. `concert-crawl-crawler` — copy DSN
4. Generate a **`SENTRY_AUTH_TOKEN`** for source map uploads (used by the Next.js build on Vercel):
   - Sentry → Organization Settings → **Auth Tokens** → New Token
   - Scopes: `project:releases`, `org:read`

---

## Step 6 — Vercel Web Project

Create the **prod** Vercel project. (The staging project should already exist as `concert-crawl-staging` from the migration; if not, follow the same steps with staging values.)

### Create the project

1. Vercel dashboard → **New Project** → import `HartiganHM/concert-crawl`
2. **Project Name:** `concert-crawl`
3. **Root Directory:** `apps/web` (critical — Vercel will auto-detect Vite if the root isn't set explicitly)
4. **Framework Preset:** Next.js (should auto-detect)
5. **Build and Output Settings:** leave all defaults (Vercel handles Turborepo + pnpm)

### Environment variables

Add under **Production + Preview** scope. **All `NEXT_PUBLIC_*` keys must have Sensitive OFF** — Sensitive blocks `NEXT_PUBLIC_` inlining at build time, which breaks Clerk + Sentry at runtime.

| Key | Value | Sensitive |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | `https://concert-crawl-api.onrender.com` | OFF |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | prod `pk_live_*` from Step 1 (encodes `clerk.concertcrawl.app`) | OFF |
| `CLERK_SECRET_KEY` | prod `sk_live_*` from Step 1 | ON |
| `NEXT_PUBLIC_CLERK_DOMAIN` | `concertcrawl.app` — **required** to disable Vercel's auto-proxy logic in `@clerk/nextjs` that would otherwise inject a broken `/__clerk` script src | OFF |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `/sign-in` | OFF |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | `/sign-up` | OFF |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` | `/events` | OFF |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` | `/auth/complete` | OFF |
| `NEXT_PUBLIC_SENTRY_DSN` | Web project DSN from Step 5 | OFF |
| `SENTRY_DSN` | Same | ON |
| `NEXT_PUBLIC_SENTRY_ENVIRONMENT` | `production` | OFF |
| `SENTRY_ENVIRONMENT` | `production` | OFF |
| `SENTRY_AUTH_TOKEN` | From Step 5 | ON |
| `INVITE_COOKIE_SECRET` | Generate fresh: `openssl rand -hex 32` | ON |
| `INTERNAL_API_SECRET` | Generate fresh: `openssl rand -hex 32` — **must match** the same key in the Render API's env vars (Step 8) | ON |

`NEXT_PUBLIC_APP_VERSION` is hard-set at build time by `apps/web/next.config.ts` from `package.json#version` plus the deploy's commit SHA. **Current limitation:** the SHA fallback chain only reads `RENDER_GIT_COMMIT`, so on Vercel deploys the version banner reads `vX.Y.Z · dev` instead of `vX.Y.Z · abc1234`. Tracked in #595 (one-line fix to add `VERCEL_GIT_COMMIT_SHA` to the fallback chain).

### Add the custom domain

1. Vercel → project → **Settings → Domains → Add Domain**
2. Add `concertcrawl.app` (apex) — set as the **production** (canonical) domain
3. Add `www.concertcrawl.app` — configure to **redirect to apex** (308). Apex canonical matches the staging pattern (`staging.concertcrawl.app`).

Vercel will show the DNS records needed in Step 7.

> **Preview deployments on prod project** are currently *not* configurable to "off" via the Vercel UI toggle. See issue #592 for the planned `vercel.json` fix.

---

## Step 7 — Cloudflare DNS Swap

1. Cloudflare → `concertcrawl.app` zone → **DNS → Records**
2. For the apex: replace the existing `A`/`CNAME` records with the **exact records Vercel shows you** in the prod project's Domains settings (Vercel rotates anycast IPs over time, so don't copy from this runbook). Typically that's:
   - **A record** for `@` → the Vercel anycast IP Vercel provides at setup time
   - OR **CNAME** for `@` if your DNS provider supports CNAME at apex (Cloudflare does via CNAME flattening)
3. For `www`: CNAME → `cname.vercel-dns.com`
4. **Proxy status:** **DNS only (grey cloud)** on both records. Cloudflare proxy ↔ Vercel CDN creates double-CDN issues and breaks Vercel's SSL provisioning.
5. Wait for Vercel to flip the domain status from "Invalid Configuration" → "Valid Configuration" → SSL active (~30 sec each)

---

## Step 8 — Render API + Crawler Cron Env Vars

### concert-crawl-api (prod)

In the Render dashboard for this service → **Environment** tab. The service may already exist suspended from the migration; un-suspend after env vars are correct.

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | `<NEON_PROD_POOLED>` URL from Step 2 (pooled) |
| `CLERK_SECRET_KEY` | prod `sk_live_*` from Step 1 (must match Vercel's `CLERK_SECRET_KEY`) |
| `CLERK_PUBLISHABLE_KEY` | prod `pk_live_*` from Step 1 |
| `ALLOWED_ORIGIN` | `https://concertcrawl.app` |
| `ANTHROPIC_API_KEY` | From Anthropic console |
| `STRIPE_SECRET_KEY` | `sk_live_*` from Step 5 |
| `STRIPE_WEBHOOK_SECRET` | Production webhook signing secret from Step 5 |
| `RESEND_API_KEY` | From Step 5 |
| `SENTRY_DSN` | API project DSN from Step 5 |
| `SENTRY_ENVIRONMENT` | `production` |
| `LOG_LEVEL` | `info` |
| `NODE_ENV` | `production` |
| `REQUIRE_BETA_AUTH` | `true` — gates `/v1/events`, `/v1/venues`, `/v1/search` behind Clerk during private beta. Remove or set `false` at public launch (Step 12) |
| `INTERNAL_API_SECRET` | **Same value** as set in the Vercel prod project (Step 6) |

> **Build command — Node-version-dependent.** The current `render.yaml` and the deployed services use:
>
> ```
> npm install -g pnpm && pnpm install --frozen-lockfile && pnpm db:migrate && pnpm turbo build --filter=@concert-crawl/api
> ```
>
> This works on Render's older Node base images (Node 22-era), which is what the existing services run on. **It will break on newer Node 24+ images** with `EROFS: read-only file system` because Node 24 ships with pnpm pre-installed at `/usr/lib/node_modules/pnpm` and `npm install -g pnpm` cannot overwrite it.
>
> If a Render service rebuilds onto a Node 24+ image (which can happen silently when Render refreshes their base images) and the build fails with EROFS, the durable fix is to replace `npm install -g pnpm &&` with `corepack enable &&` in the service's Build Command (Render dashboard → service → Settings). The current prod API was rebuilt this way on 2026-06-15.

### concert-crawl-crawler-triggers + concert-crawl-crawler-daily (prod)

Both crawler cron jobs need the same env var set. The Dockerfile (`apps/crawler/Dockerfile`) is `node:22-bookworm` + `playwright install --with-deps chromium` (no MCR dependency — see issue #547 / PR #591 for context).

| Variable | Value |
| --- | --- |
| `NODE_ENV` | `production` |
| `CRAWL_MODE` | `triggers` (triggers cron) / `daily` (daily cron) |
| `DATABASE_URL` | `<NEON_PROD_POOLED>` from Step 2 |
| `ANTHROPIC_API_KEY` | From Anthropic console |
| `RESEND_API_KEY` | From Step 5 |
| `ADMIN_EMAIL` | Your email for crawl failure notifications |
| `ADMIN_URL` | `https://concertcrawl.app` |
| `SENTRY_DSN` | Crawler project DSN from Step 5 |
| `SENTRY_ENVIRONMENT` | `production` |
| `LOG_LEVEL` | `info` |

> **MCR rate-limit gotcha.** The crawler base image was previously `mcr.microsoft.com/playwright`, which Microsoft anonymously rate-limits at 200 req/6h per IP. This regularly throttled Render's build pool and broke all-cron rebuilds. The current Dockerfile sidesteps MCR entirely (PR #591). If a future Playwright bump tempts you back to MCR, don't — chase down a non-MCR mirror first.

### Staging API + crawler crons

Use the same variable set on `concert-crawl-api-staging`, `concert-crawl-crawler-triggers-staging`, `concert-crawl-crawler-daily-staging`, but with:
- **Staging Clerk keys** (`pk_live_*` / `sk_live_*` from the Concert Crawl Staging app — different app, different keys)
- `NEON_STAGING_POOLED` as the `DATABASE_URL`
- `SENTRY_ENVIRONMENT=staging`
- `ALLOWED_ORIGIN=https://staging.concertcrawl.app`

---

## Step 9 — GitHub Environment Secrets and Variables

GitHub Actions workflows use a mix of **environment-scoped** secrets (e.g. `deploy-staging.yml` reads from the `staging` GH environment) and **repository-level** secrets/vars (e.g. `staging-e2e.yml`, `smoke.yml`). The split below reflects that — don't drop env-scoped secrets thinking they're duplicates of repo-level ones.

GitHub → repository → **Settings** → **Environments**.

### `staging` environment — Secrets

| Secret | Value |
| --- | --- |
| `DATABASE_URL` | `NEON_STAGING_POOLED` from Step 2 — for future crawler/migration GHA jobs |
| `SENTRY_DSN` | Staging Sentry project DSN |
| `RENDER_DEPLOY_HOOK_API` | Render → `concert-crawl-api-staging` → **Settings → Deploy Hook** → generate and copy. Required by `deploy-staging.yml` to trigger the API redeploy on merge to `main`. No equivalent web hook exists since web is on Vercel (auto-deploys via GitHub integration). |

### `staging` environment — Variables

| Variable | Value |
| --- | --- |
| `SENTRY_ENVIRONMENT` | `staging` |
| `LOG_LEVEL` | `info` |

### `production` environment — Secrets

| Secret | Value |
| --- | --- |
| `DATABASE_URL` | `NEON_PROD_POOLED` from Step 2 |
| `SENTRY_DSN` | Crawler project DSN from Step 5 |
| `RENDER_DEPLOY_HOOK_API` | Render → `concert-crawl-api` → **Settings → Deploy Hook** → generate and copy. Pre-provisioned for the eventual `deploy-production.yml` workflow; no current workflow consumes it. |

### `production` environment — Variables

| Variable | Value |
| --- | --- |
| `SENTRY_ENVIRONMENT` | `production` |
| `LOG_LEVEL` | `info` |
| `ADMIN_EMAIL` | Pre-provisioned |

### Repository-level secrets (Settings → Secrets → Actions)

| Secret | Value |
| --- | --- |
| `GH_TOKEN` | Personal access token with `repo` scope — used by `release.yml` (semantic-release) to push the release commit back to `main` |
| `SENTRY_DSN_SMOKE` | Sentry DSN for smoke test error reporting |
| `E2E_TEST_USER_EMAIL` | Email of the test Clerk user (staging instance) for staging E2E runs |
| `E2E_TEST_USER_PASSWORD` | Password of the test Clerk user for staging E2E runs |
| `ANTHROPIC_API_KEY` | Pre-provisioned for future crawler GHA jobs |
| `RESEND_API_KEY` | Pre-provisioned |

### Repository-level variables (Settings → Variables → Actions)

| Variable | Value |
| --- | --- |
| `SMOKE_ENABLED` | `false` during private beta; flip to `true` at public launch |
| `PROD_URL` | `https://concertcrawl.app` |
| `PROD_API_URL` | `https://concert-crawl-api.onrender.com` |
| `STAGING_URL` | `https://staging.concertcrawl.app` |
| `ADMIN_EMAIL` | Pre-provisioned |

---

## Step 10 — Branch Protection and Environment Protection

These must be in place before any traffic reaches production.

### Branch protection on `main`

1. GitHub → **Settings** → **Branches** → **Add branch protection rule**
2. Branch name pattern: `main`
3. Enable:
   - Require a pull request before merging (1 required approval)
   - Require status checks to pass — add all of: `Security audit`, `Typecheck`, `Lint`, `Test`, `Build`, `Integration Tests`
   - Require branches to be up to date before merging
   - Do not allow bypassing the above settings

> `release.yml` pushes a release commit back to `main` via `GH_TOKEN`. The commit uses `[skip ci]` and is authored by `github-actions[bot]`. Add `github-actions[bot]` to bypass actors if the release workflow starts failing after protection is enabled.

### `production` environment protection

1. GitHub → **Settings** → **Environments** → `production`
2. Enable **Required reviewers** → add yourself
3. **Deployment branches** → **Selected branches** → add `main`

---

## Step 11 — Deploy and Verify

### Trigger deploys

- **Web (Vercel):** auto-deploys on push to `main` for the prod project. Or **Deployments tab → Redeploy** with cache off after env var changes.
- **API (Render):** **Builds tab → Manual Deploy → Deploy latest commit**. (The Render dashboard's manual deploy button is under the **Builds** tab, not Settings or Events — easy to miss.)
- **Crawler crons (Render):** Same — Builds tab manual deploy. Confirms env vars apply on rebuild. Crons execute on schedule afterward; they do not run on-deploy.

### Smoke checks

```bash
# API health
curl https://concert-crawl-api.onrender.com/v1/health
# expect 200 with {"status":"ok","timestamp":"...","version":"..."}

# CORS preflight from prod web origin
curl -I -X OPTIONS https://concert-crawl-api.onrender.com/v1/health \
  -H "Origin: https://concertcrawl.app" \
  -H "Access-Control-Request-Method: GET"
# expect 204 with access-control-allow-origin: https://concertcrawl.app
```

In a **fresh incognito browser** (avoids stale staging cookies):

1. Visit `https://concertcrawl.app/` → should render the landing page (no redirect to `/events`)
2. Sign in via Clerk → after sign-in, lands on `/events`
3. Browse events, open a detail page, hit `/admin/review` (if admin)
4. DevTools console should be clean — no `/__clerk/*` 404s, no Sentry init errors, no CORS errors

### Canary the prod crawler

The triggers cron's no-pending-triggers code path doesn't exercise Chromium launch. To validate Chromium end-to-end on prod:

1. Sign in to `https://concertcrawl.app/admin` as admin
2. **Trigger a crawl** for a single venue (Bluebird Theater or similar fast one)
3. Wait <10 min for the next prod triggers cron run
4. Render dashboard → `concert-crawl-crawler-triggers` → **Logs** → confirm the run shows:
   - `crawl.start` for the queued venue
   - `robots.allowed`
   - `fetch.start` / `fetch.success` (Chromium launched successfully under non-root `pwuser`)
   - `llm.extracted` and/or `crawl.complete` with `eventsInserted` > 0

---

## Step 12 — Flip `REQUIRE_BETA_AUTH` at Public Launch

When transitioning from private beta to public launch:

1. Render dashboard → `concert-crawl-api` → **Environment**
2. Remove `REQUIRE_BETA_AUTH` (or set to `false`)
3. **Builds tab → Manual Deploy** on `concert-crawl-api`
4. Verify `/v1/events`, `/v1/venues`, `/v1/search` are accessible without a Clerk token

---

## Step 13 — Enable Production Smoke Tests at Public Launch

Smoke tests run on a schedule but are gated by `SMOKE_ENABLED`. Enable only at public launch.

1. Repository → **Settings** → **Variables** (repository-level)
2. Set `SMOKE_ENABLED=true`
3. Verify next scheduled run succeeds: **Actions** → **Production Smoke Tests**

---

## Rollback

If a deploy breaks production:

- **Web (Vercel):** Deployments tab → click any previous deploy → **Promote to Production**. Instant rollback (no rebuild).
- **API or crawler cron (Render):** Builds tab → previous successful build → **Rollback**. Render redeploys the previous image.
- **DB:** see `docs/runbooks/db-rollback.md`.

---

## Operational notes

These are gotchas the 2026-06-15 migration uncovered. Skim before any prod-touching work.

### Multi-service Clerk key sweep

When rotating Clerk keys or migrating between Clerk instances, **every service that validates JWTs** must be updated in one sweep:

- Vercel web project (`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` + `CLERK_SECRET_KEY`)
- Render API service (`CLERK_SECRET_KEY` + `CLERK_PUBLISHABLE_KEY`)
- Crawler crons do NOT validate JWTs (they're backend-only); skip
- Any future GitHub Actions or other service consuming Clerk tokens

Decode the active `pk` on the prod web to confirm which Clerk instance is in play:

```bash
echo "<paste pk_live_... without the pk_live_ prefix>" | base64 -d
```

Expected output for prod: `clerk.concertcrawl.app`. For staging: `clerk.staging.concertcrawl.app`. Any mismatch between services causes 401s on cross-service calls.

### Vercel Sensitive env var quirk

Vercel's bulk `.env` import marks **all** values as **Sensitive** by default. Sensitive blocks `NEXT_PUBLIC_*` env vars from being inlined into the browser bundle at build time, which breaks Clerk, Sentry, and any `NEXT_PUBLIC_*`-dependent code at runtime.

**Always flip Sensitive OFF on every `NEXT_PUBLIC_*` key.** Sensitive is fine for true secrets (`CLERK_SECRET_KEY`, `INVITE_COOKIE_SECRET`, `SENTRY_AUTH_TOKEN`, etc.).

### Clerk + Vercel auto-proxy trap

`@clerk/nextjs` has Vercel-specific logic that auto-injects `data-clerk-proxy-url="/__clerk"` into the script tag when:

- `pk_live_*` is set
- `VERCEL_TARGET_ENV=production`
- `VERCEL_PROJECT_PRODUCTION_URL` ends in `.vercel.app`
- Neither `NEXT_PUBLIC_CLERK_PROXY_URL` nor `NEXT_PUBLIC_CLERK_DOMAIN` is set

Without a matching app-side rewrite to forward `/__clerk/*` to Clerk's CDN, all script loads 404. Set `NEXT_PUBLIC_CLERK_DOMAIN=concertcrawl.app` (per Step 6 table) to short-circuit the auto-proxy.

### Cloudflare DNS proxy must be OFF for Vercel domains

Cloudflare's orange-cloud proxy interferes with Vercel's SSL provisioning and creates double-CDN issues. Always **DNS only** (grey cloud) for any record pointing at Vercel.

### Vercel "preview deploys on prod project" can't be toggled in the UI

The Vercel dashboard toggle for disabling preview deploys on the prod project doesn't persist as of 2026-06-15. Tracked in issue #592 — workaround is a `vercel.json` config-file approach.

### Render manual deploy is under the Builds tab

Not Settings, not Events. For services where `autoDeploy: no`, the **Builds tab → Manual Deploy** button is the only UI path. Don't reach for env-var-nudge workarounds.

### MCR rate limits will return

`mcr.microsoft.com/playwright:*` has anonymous-pull rate limits that throttle Render's build pool. The current crawler Dockerfile (PR #591) avoids MCR entirely. If you find yourself adding `FROM mcr.microsoft.com/...` to any new image, stop and use a non-MCR alternative.

### Pre-existing follow-up issues from the migration

- #589 — Separate Google OAuth client for production (currently shared with staging)
- #592 — Vercel preview-on-prod toggle via `vercel.json`
- #547 — already closed by the migration; kept for the historical record

---

## Notes

- Keep all `sk_live_*` keys out of git — dashboards and GitHub secrets only
- `NEXT_PUBLIC_APP_VERSION` is unset at runtime; Next.js reads version from `package.json` (auto-bumped by `semantic-release`)
- After a Clerk role change, the user must sign out and back in before the API sees the new role (JWT reissue)
- The four crawler cron jobs (2 prod + 2 staging) all share the same Dockerfile (`apps/crawler/Dockerfile`); changes apply to all when the image is rebuilt
