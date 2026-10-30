# Production Launch Runbook

Steps to bring the production environment fully online. Complete these in order — later steps depend on earlier ones.

This runbook reflects the post-2026-06-15 architecture: **web on Vercel, Postgres on Neon, API + crawler crons on Render**. See `docs/superpowers/progress.md` for the migration history.

---

## Prerequisites

- Staging environment is healthy and all pre-beta checklist items are validated there
- Access to dashboards: Vercel, Neon, Render, Cloudflare, Clerk (both Production and Staging apps), Resend, Sentry, GitHub repository settings. (Stripe is not yet wired — see Step 5.)
- Local tools: Docker (for `pg_dump`/`psql` via `postgres:16` image), `pnpm`, `gh` CLI

### Service inventory

| Concern                    | Provider   | Resource                                                                                                             |
| -------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------- |
| Web (prod)                 | Vercel     | project `concert-crawl`, custom domain `concertcrawl.app`                                                            |
| Web (staging)              | Vercel     | project `concert-crawl-staging`, custom domain `staging.concertcrawl.app`                                            |
| API (prod)                 | Render     | web service `concert-crawl-api`                                                                                      |
| API (staging)              | Render     | web service `concert-crawl-api-staging`                                                                              |
| Crawler triggers (prod)    | Render     | cron job `concert-crawl-crawler-triggers` (`*/10 * * * *`)                                                           |
| Crawler daily (prod)       | Render     | cron job `concert-crawl-crawler-daily` (`0 9 * * *` = 3 AM MT)                                                       |
| Crawler triggers (staging) | Render     | cron job `concert-crawl-crawler-triggers-staging`                                                                    |
| Crawler daily (staging)    | Render     | cron job `concert-crawl-crawler-daily-staging`                                                                       |
| Database                   | Neon       | project `concert-crawl`, branches `production` + `staging` (PG 16, AWS us-west-2 Oregon)                             |
| Auth                       | Clerk      | two apps: **Concert Crawl** (prod, Production instance) and **Concert Crawl Staging** (staging, Production instance) |
| DNS                        | Cloudflare | zone `concertcrawl.app` — DNS only, no proxy                                                                         |

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

**Do NOT** copy user-tied tables (`users`, `user_profiles`, `user_events`, `user_artist_follows`, `price_submissions`, `feedback`, `invite_codes`, `audit_log`, `crawl_runs`, `crawl_triggers`, `price_retrieval_log`) — they reference users from the _staging_ Clerk instance and would break FK constraints + leak staging-only operational data.

---

## Step 5 — Third-Party Services

> **Stripe is deferred.** The API has no Stripe routes or `STRIPE_*` env vars at this time. Payment / subscription billing is monetization work scheduled for after the public launch. When Stripe is wired, the PR that adds it will re-introduce a Stripe sub-section here with the live mode switch, webhook endpoints, and required env vars (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`). Don't configure Stripe webhooks now — they'd point at a non-existent route.

### Resend

> ⚠️ **Read _Email — `venues@concertcrawl.app`, and the DMARC path_ under Operational notes before touching any mail DNS.** The live zone has diverged from what these steps originally described: Resend's own records all sit on the `send.concertcrawl.app` subdomain, the root `TXT` belongs to Cloudflare Email Routing, and DMARC is maintained by hand rather than taken from Resend's suggestion.

1. Resend dashboard → **Domains** → **Add Domain** → `concertcrawl.app`
2. In Cloudflare, add **only** Resend's DKIM `TXT` (`resend._domainkey`) and the SPF `TXT` + `MX` it asks for on `send.concertcrawl.app`. Two of Resend's suggestions must not be applied as shown:
   - **Skip its DMARC suggestion.** `_dmarc.concertcrawl.app` is maintained by hand and must not be overwritten.
   - **Do not merge its SPF into the root `concertcrawl.app` SPF record.** It belongs on `send.concertcrawl.app`, and the Operational notes section explains why that separation is load-bearing.
3. **Verify** in Resend — DKIM and SPF should go green. Resend may keep flagging DMARC, because the live DMARC record is ours and not the one it suggested. That is expected and is not a failure.
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

### Git builds are disabled on the prod project

The prod project's **Settings → Build and Deployment → Ignored Build Step** is
set to `exit 0`, so
a push to `main` does **not** build it. `deploy-prod.yml` promotes the web app
with `vercel deploy --prod` after the Render API deploy has gone live, which is
what makes a prod promotion a single gated decision rather than two independent
races. See `docs/runbooks/auto-deploy-prod.md`.

Consequences worth knowing before changing anything here:

- The CLI deploy runs from the **repository root**, not `apps/web`. The Root
  Directory above is applied to whatever is uploaded, so deploying from
  `apps/web` would have Vercel look for `apps/web/apps/web`. The root is also
  the only upload that carries `pnpm-workspace.yaml`, the lockfile and
  `packages/`, which `apps/web`'s `workspace:*` dependencies need.
- `deploy-prod.yml` needs three items in the **production** GitHub environment:
  the `VERCEL_TOKEN` secret, and the `VERCEL_ORG_ID` + `VERCEL_PROJECT_ID`
  variables. Its preflight step fails fast and names any that are missing.
- Re-enabling git builds would double-deploy every push — once by Vercel, once
  by the workflow. Turn one off before turning the other on.

The **staging** project keeps its git integration. Its Ignored Build Step skips
pushes that do not touch the web app, which is why `staging-e2e.yml`'s web-readiness
wait treats "no deployment for this SHA" as benign.

### Environment variables

Add under **Production-only** scope on the prod Vercel project. **Do NOT** apply them to the Preview environment — scoping these to Preview would cause accidental preview deploys to run against real prod Clerk sessions, the prod Sentry environment, and the prod `INTERNAL_API_SECRET`. Leave Preview unset on the prod project so any preview deploy fails closed (missing required env vars) rather than failing open (running with prod credentials).

Note: PR-branch deploys are disabled per-project via the **Preview environment's Branch Tracking toggle** (Vercel Dashboard → project → Settings → Environments → Preview → Branch Tracking → Disabled), so the Preview environment shouldn't trigger in practice. The Production-only scope is defense in depth.

The staging Vercel project would normally invert this (Production + Preview so per-PR previews exercise the staging stack), but staging previews are also disabled by the same Branch Tracking toggle for now — keep its env vars Production-only as well until the rate-limit-driven default is reverted or per-project Branch Tracking is re-enabled on staging.

**All `NEXT_PUBLIC_*` keys must have Sensitive OFF** — Sensitive blocks `NEXT_PUBLIC_` inlining at build time, which breaks Clerk + Sentry at runtime.

| Key                                   | Value                                                                                                                                                                                                                     | Sensitive |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| `NEXT_PUBLIC_SITE_URL`                | `https://concertcrawl.app` (staging project: `https://staging.concertcrawl.app`) — canonical origin for share links and Open Graph tags. See the note below; leaving it unset is a silent defect, not a default           | OFF       |
| `NEXT_PUBLIC_API_URL`                 | `https://concert-crawl-api.onrender.com`                                                                                                                                                                                  | OFF       |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`   | prod `pk_live_*` from Step 1 (encodes `clerk.concertcrawl.app`)                                                                                                                                                           | OFF       |
| `CLERK_SECRET_KEY`                    | prod `sk_live_*` from Step 1                                                                                                                                                                                              | ON        |
| `NEXT_PUBLIC_CLERK_DOMAIN`            | `concertcrawl.app` — **required** to disable Vercel's auto-proxy logic in `@clerk/nextjs` that would otherwise inject a broken `/__clerk` script src                                                                      | OFF       |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL`       | `/sign-in`                                                                                                                                                                                                                | OFF       |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL`       | `/sign-up`                                                                                                                                                                                                                | OFF       |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` | `/events`                                                                                                                                                                                                                 | OFF       |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` | `/auth/complete`                                                                                                                                                                                                          | OFF       |
| `NEXT_PUBLIC_SENTRY_DSN`              | Web project DSN from Step 5                                                                                                                                                                                               | OFF       |
| `SENTRY_DSN`                          | Same                                                                                                                                                                                                                      | ON        |
| `NEXT_PUBLIC_SENTRY_ENVIRONMENT`      | `production`                                                                                                                                                                                                              | OFF       |
| `SENTRY_ENVIRONMENT`                  | `production`                                                                                                                                                                                                              | OFF       |
| `SENTRY_AUTH_TOKEN`                   | From Step 5                                                                                                                                                                                                               | ON        |
| `INVITE_COOKIE_SECRET`                | Generate fresh: `openssl rand -hex 32`                                                                                                                                                                                    | ON        |
| `INTERNAL_API_SECRET`                 | Generate fresh: `openssl rand -hex 32` — **must match** the same key in the Render API's env vars (Step 8)                                                                                                                | ON        |
| `REVALIDATE_SECRET`                   | Generate fresh: `openssl rand -hex 32` — **must match** the same key on both crawler cron jobs (Step 8). Unset → `/api/revalidate` fails closed (401) and the landing page relies on its 5-minute ISR window alone (#847) | ON        |
| `NEXT_PUBLIC_POSTHOG_KEY`             | PostHog project API key (`phc_*`) — client-side usage analytics (pageviews, autocapture, no replay) plus the funnel. Absent → no-op; also no-op off `concertcrawl.app`. Set only after Hugh approves the privacy wording  | OFF       |
| `NEXT_PUBLIC_POSTHOG_HOST`            | `https://us.i.posthog.com` (US cloud region)                                                                                                                                                                              | OFF       |

> ⚠️ **`NEXT_PUBLIC_SITE_URL` has no safe default and must be set on every project.** `apps/web/src/lib/share/site-origin.ts` resolves `NEXT_PUBLIC_SITE_URL` → `VERCEL_URL` → `http://localhost:3000`. On Vercel, `VERCEL_URL` is the **per-deployment `*.vercel.app` host, never the custom domain**, so with the first unset every absolute URL the app builds points at a deployment hostname that 404s once that deployment ages out. The visible symptom is share-card and Open Graph unfurls (#72) advertising a dead link. It went unset on prod until 2026-09-19 precisely because this table had no row for it. Each project gets its own origin rather than the canonical one — staging and previews are supposed to advertise themselves, which is why the variable exists instead of a hardcoded constant.

`NEXT_PUBLIC_APP_VERSION` is hard-set at build time by `apps/web/next.config.ts` from `package.json#version` plus the deploy's commit SHA. **Current limitation:** the SHA fallback chain only reads `RENDER_GIT_COMMIT`, so on Vercel deploys the version banner reads `vX.Y.Z · dev` instead of `vX.Y.Z · abc1234`. Tracked in #595 (one-line fix to add `VERCEL_GIT_COMMIT_SHA` to the fallback chain).

### Add the custom domain

1. Vercel → project → **Settings → Domains → Add Domain**
2. Add `concertcrawl.app` (apex) — set as the **production** (canonical) domain
3. Add `www.concertcrawl.app` — configure to **redirect to apex** (308). Apex canonical matches the staging pattern (`staging.concertcrawl.app`).

Vercel will show the DNS records needed in Step 7.

> **Preview deployments** (both projects) are disabled via the **Preview environment's Branch Tracking toggle** in Vercel Project Settings → Environments → Preview. When disabled, Vercel doesn't create deployment slots for non-main branches at the webhook layer, so the free-tier 100/day quota isn't consumed by routine PR pushes. CLI/API deploys (used by the `Deploy to Production` workflow) still work. An earlier `vercel.json` `ignoreCommand` workaround was removed once the toggle was confirmed working — see the troubleshooting entry near the bottom of this runbook for history.

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

| Variable                | Value                                                                                                   |
| ----------------------- | ------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`          | `<NEON_PROD_POOLED>` URL from Step 2 (pooled)                                                           |
| `CLERK_SECRET_KEY`      | prod `sk_live_*` from Step 1 (must match Vercel's `CLERK_SECRET_KEY`)                                   |
| `CLERK_PUBLISHABLE_KEY` | prod `pk_live_*` from Step 1                                                                            |
| `ALLOWED_ORIGIN`        | `https://concertcrawl.app`                                                                              |
| `ANTHROPIC_API_KEY`     | From Anthropic console                                                                                  |
| `RESEND_API_KEY`        | From Step 5                                                                                             |
| `SENTRY_DSN`            | API project DSN from Step 5                                                                             |
| `SENTRY_ENVIRONMENT`    | `production`                                                                                            |
| `LOG_LEVEL`             | `info`                                                                                                  |
| `NODE_ENV`              | `production`                                                                                            |
| `NPM_CONFIG_PREFIX`     | `/opt/render/.npm-global`. Without it the build's `npm install -g pnpm` fails with EROFS                |
| `INTERNAL_API_SECRET`   | **Same value** as set in the Vercel prod project (Step 6)                                               |
| `POSTHOG_KEY`           | PostHog project API key (`phc_*`) — server-truth monetization funnel analytics. Absent → capture no-ops |
| `POSTHOG_HOST`          | `https://us.i.posthog.com` (US cloud region)                                                            |
| `DB_POOL_MAX`           | Optional. Leave unset on Render (default 10, postgres.js's own). Set to `3` on a serverless host        |
| `CRON_SECRET`           | Leave unset on Render: `/v1/internal/cron/*` then returns 404 and the jobs run as Render crons          |

> **Build commands — Node-version-dependent + differ between prod and staging.** The current `render.yaml` uses two different build commands:
>
> **Prod (`concert-crawl-api`):**
>
> ```
> npm install -g pnpm && pnpm install --frozen-lockfile && pnpm turbo build --filter=@concert-crawl/api
> ```
>
> **Staging (`concert-crawl-api-staging`):**
>
> ```
> npm install -g pnpm && pnpm install --frozen-lockfile && pnpm db:migrate && pnpm turbo build --filter=@concert-crawl/api
> ```
>
> Staging auto-runs migrations on every deploy; prod does not — production migrations run manually per Step 3 to keep schema changes paired with deliberate code releases.
>
> On some Node versions Render serves Node from a read-only `/usr/lib` that already holds a pnpm, and `npm install -g pnpm` then fails with `EROFS: read-only file system`. Every Node service therefore sets `NPM_CONFIG_PREFIX=/opt/render/.npm-global`, which moves npm's global prefix somewhere writable. Set it when creating any Node service. See `render-service-config.md` → "`NPM_CONFIG_PREFIX` keeps `npm install -g pnpm` working". (An earlier version of this note recommended swapping in `corepack enable`; the live build commands never changed, and on 2026-10-27 the env var was the fix that shipped.)

### concert-crawl-crawler-triggers + concert-crawl-crawler-daily (prod)

Both crawler cron jobs need the same env var set. The Dockerfile (`apps/crawler/Dockerfile`) is `node:24.22.1-bookworm` + `playwright install-deps chromium` as root, then `playwright install chromium` as `pwuser` (no MCR dependency — see issue #547 / PR #591 for context). The two halves are split so that root is used only for the apt packages and everything writing into `/app` or the browsers path runs as `pwuser`, which is what lets the image skip a recursive `chown`; `apps/crawler/scripts/verify-image.sh` guards that.

| Variable             | Value                                             |
| -------------------- | ------------------------------------------------- |
| `NODE_ENV`           | `production`                                      |
| `CRAWL_MODE`         | `triggers` (triggers cron) / `daily` (daily cron) |
| `DATABASE_URL`       | `<NEON_PROD_POOLED>` from Step 2                  |
| `ANTHROPIC_API_KEY`  | From Anthropic console                            |
| `RESEND_API_KEY`     | From Step 5                                       |
| `ADMIN_EMAIL`        | Your email for crawl failure notifications        |
| `ADMIN_URL`          | `https://concertcrawl.app` (the WEB app origin)   |
| `REVALIDATE_SECRET`  | Same value as the Vercel web project (Step 6)     |
| `SENTRY_DSN`         | Crawler project DSN from Step 5                   |
| `SENTRY_ENVIRONMENT` | `production`                                      |
| `LOG_LEVEL`          | `info`                                            |

> **MCR rate-limit gotcha.** The crawler base image was previously `mcr.microsoft.com/playwright`, which Microsoft anonymously rate-limits at 200 req/6h per IP. This regularly throttled Render's build pool and broke all-cron rebuilds. The current Dockerfile sidesteps MCR entirely (PR #591). If a future Playwright bump tempts you back to MCR, don't — chase down a non-MCR mirror first.

### Staging API + crawler crons

Use the same variable set on `concert-crawl-api-staging`, `concert-crawl-crawler-triggers-staging`, `concert-crawl-crawler-daily-staging`, but with:

- **Staging Clerk keys** (`pk_live_*` / `sk_live_*` from the Concert Crawl Staging app — different app, different keys)
- `NEON_STAGING_POOLED` as the `DATABASE_URL`
- `SENTRY_ENVIRONMENT=staging`
- `ALLOWED_ORIGIN=https://staging.concertcrawl.app`

---

## Step 9 — GitHub Environment Secrets and Variables

GitHub Actions workflows use a mix of **environment-scoped** secrets (e.g. `deploy-prod.yml` + `prod-smoke-after-deploy.yml` read from the `production` GH environment) and **repository-level** secrets/vars (e.g. `staging-smoke.yml`, `staging-e2e.yml`, `smoke.yml`). The split below reflects that — don't drop env-scoped secrets thinking they're duplicates of repo-level ones.

GitHub → repository → **Settings** → **Environments**.

### `staging` environment — Secrets

| Secret         | Value                                                                     |
| -------------- | ------------------------------------------------------------------------- |
| `DATABASE_URL` | `NEON_STAGING_POOLED` from Step 2 — for future crawler/migration GHA jobs |
| `SENTRY_DSN`   | Staging Sentry project DSN                                                |

Staging deploys go via Render's git auto-deploy on push to `main` (Render dashboard → service → Settings → Auto-Deploy: On Commit). **Prod does not** — it has `Auto-Deploy: no` and is promoted only by dispatching `deploy-prod.yml`; see `docs/runbooks/auto-deploy-prod.md`. On the staging side, `RENDER_API_TOKEN` (repo-level — see the staging secrets table below) is only consumed by `staging-smoke.yml` and `staging-e2e.yml` to poll Render's API via `render-wait-for-live.sh` — it doesn't trigger any deploy. The same token exists separately in the `production` GH environment for prod workflows (`deploy-prod.yml`, `prod-smoke-after-deploy.yml`, `rollback-prod.yml`, `prod-deploy-health.yml`, `prod-drift-alert.yml`) — see those tables for prod usage. Staging web is deployed by Vercel's GitHub integration directly — no deploy hook needed there either.

### `staging` environment — Variables

| Variable             | Value     |
| -------------------- | --------- |
| `SENTRY_ENVIRONMENT` | `staging` |
| `LOG_LEVEL`          | `info`    |

### `production` environment — Secrets

| Secret             | Value                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `DATABASE_URL`     | `NEON_PROD_POOLED` from Step 2                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `SENTRY_DSN`       | Crawler project DSN from Step 5                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `RENDER_API_TOKEN` | Render → Account Settings → **API Keys** → generate token with deploy + read permissions. Consumed by `deploy-prod.yml` (which triggers every prod deploy), `prod-smoke-after-deploy.yml` (records the live SHA, and `render-rollback.sh` on failure — it has no wait step), `rollback-prod.yml`, `prod-deploy-health.yml`, and `prod-drift-alert.yml`. Prod services have Auto-Deploy off, so this token is what actually starts a production deploy — not an optional extra. |
| `RESEND_API_KEY`   | Same Resend API key the API + crawler runtime use. Consumed by `prod-smoke-after-deploy.yml` and `deploy-prod.yml` (Notify-admin step on auto-rollback). Optional — if missing, the workflow gracefully degrades to a `::warning::` annotation; primary failure signal still goes out via the GHA workflow-failure email.                                                                                                                                                      |

No per-service `RENDER_DEPLOY_HOOK_*` secrets are needed — the promotion workflow uses the Render API with `RENDER_API_TOKEN` + the service IDs in the variables table below.

### `production` environment — Variables

| Variable                             | Value                                                                                                                                                                                                                                                                                                                                                           |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SENTRY_ENVIRONMENT`                 | `production`                                                                                                                                                                                                                                                                                                                                                    |
| `LOG_LEVEL`                          | `info`                                                                                                                                                                                                                                                                                                                                                          |
| `RENDER_SERVICE_ID_API`              | Render → `concert-crawl-api` → service ID from the dashboard URL (`srv-...`). Consumed by `deploy-prod.yml` (deploy trigger, live-SHA wait, and auto-rollback), `prod-smoke-after-deploy.yml` (records the live SHA, and rolls back on failure — it has no wait step), `rollback-prod.yml`, and `prod-deploy-health.yml` (preflight + suspended-service check). |
| `RENDER_SERVICE_ID_CRAWLER_TRIGGERS` | Service ID for `concert-crawl-crawler-triggers`. Consumed by `prod-smoke-after-deploy.yml`, `deploy-prod.yml`, `rollback-prod.yml`, and `prod-deploy-health.yml`.                                                                                                                                                                                               |
| `RENDER_SERVICE_ID_CRAWLER_DAILY`    | Service ID for `concert-crawl-crawler-daily`. Same four callers as above.                                                                                                                                                                                                                                                                                       |
| `RENDER_SERVICE_ID_MATCH_ARTISTS`    | Service ID for `concert-crawl-match-artists`. Same four callers as above.                                                                                                                                                                                                                                                                                       |
| `RENDER_SERVICE_ID_SPOTIFY_WEEKLY`   | Service ID for `concert-crawl-spotify-weekly`. Same four callers as above.                                                                                                                                                                                                                                                                                      |

> Note: `ADMIN_EMAIL` is at the **repo level** in current operational state (see the Repository-level variables table below) and is consumed by `vars.ADMIN_EMAIL` from workflows scoped to `environment: production`. Hugh — if you want to scope it to the `production` environment instead for tighter PII exposure, move the value via Settings → Environments → production → Variables and delete the repo-level entry; all four prod-touching workflows already declare `environment: production` so they'll resolve it from the env scope. Strictly an operator hygiene change; not blocking.

### Repository-level secrets (Settings → Secrets → Actions)

| Secret                   | Value                                                                                                                                                                                                                        |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GH_TOKEN`               | Personal access token with `repo` scope — used by `release.yml` (semantic-release) to push the release commit back to `main`                                                                                                 |
| `SENTRY_DSN_SMOKE`       | Sentry DSN for smoke test error reporting                                                                                                                                                                                    |
| `E2E_TEST_USER_EMAIL`    | Email of the test Clerk user (staging instance) for staging E2E runs                                                                                                                                                         |
| `E2E_TEST_USER_PASSWORD` | Password of the test Clerk user for staging E2E runs                                                                                                                                                                         |
| `ANTHROPIC_API_KEY`      | Pre-provisioned for future crawler GHA jobs                                                                                                                                                                                  |
| `RENDER_API_TOKEN`       | Render → Account Settings → **API Keys** → same token as the production-env one (re-stored at repo level so `staging-smoke.yml` — which is not scoped to the `production` environment — can call `render-wait-for-live.sh`). |

### Repository-level variables (Settings → Variables → Actions)

| Variable                        | Value                                                                                                                                                                                                                                                                                                                                                  |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `SMOKE_ENABLED`                 | `false` during private beta; flip to `true` at public launch. Gates the scheduled 6-hourly `smoke.yml` only — the deploy pipeline uses separate kill switches.                                                                                                                                                                                         |
| `STAGING_SMOKE_ENABLED`         | `false` by default. Set to `true` to enable `staging-smoke.yml`. See `docs/runbooks/auto-deploy-prod.md`.                                                                                                                                                                                                                                              |
| `AUTO_DEPLOY_PROD_ENABLED`      | `false` by default. Set to `true` to arm `deploy-prod.yml`, the **only automated** path to production. While it is `false` no promotion can run; a Render dashboard Manual Deploy, a manual Vercel redeploy, and `rollback-prod.yml` still reach prod by design. Counter-intuitive name, kept for continuity. See `docs/runbooks/auto-deploy-prod.md`. |
| `PROD_SMOKE_RECONCILER_ENABLED` | Vestigial. `prod-smoke-after-deploy.yml` is `workflow_dispatch`-only and every dispatch satisfies its job `if:`, so this switch gates nothing today. Kept so re-arming the workflow on push or schedule has a switch ready.                                                                                                                            |
| `PROD_URL`                      | `https://concertcrawl.app`                                                                                                                                                                                                                                                                                                                             |
| `PROD_API_URL`                  | `https://concert-crawl-api.onrender.com`                                                                                                                                                                                                                                                                                                               |
| `STAGING_URL`                   | `https://staging.concertcrawl.app`                                                                                                                                                                                                                                                                                                                     |
| `STAGING_API_URL`               | `https://concert-crawl-api-staging.onrender.com`. Consumed by `staging-smoke.yml`.                                                                                                                                                                                                                                                                     |
| `RENDER_SERVICE_ID_API_STAGING` | Render → `concert-crawl-api-staging` → service ID from the dashboard URL (`srv-...`). Consumed by `staging-smoke.yml` via `render-wait-for-live.sh` to wait for Render to deploy the pushed SHA before smoking.                                                                                                                                        |
| `ADMIN_EMAIL`                   | Pre-provisioned                                                                                                                                                                                                                                                                                                                                        |

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
2. **Deployment branches** → **Selected branches** → add `main`
3. **Required reviewers** — see warning below before enabling

> ⚠️ **Required reviewers + automated workflows conflict.** Five workflows declare `environment: production` to access env-scoped secrets (e.g. `RESEND_API_KEY`) and would pause for manual approval on every run if Required reviewers is enabled:
>
> - `prod-smoke-after-deploy.yml` — `workflow_dispatch` only. Pausing an operator's own dispatch for approval adds a step and no safety.
> - `deploy-prod.yml` — the only automated path to production; its own `reason` input plus the main-HEAD gate already serve as the deliberate-action check.
> - `rollback-prod.yml` — incident response; pause-for-approval would slow recovery.
> - `prod-deploy-health.yml` — scheduled every 2 hours. An approval prompt would mean the monitor only runs when someone is watching, which is the opposite of its purpose.
> - `prod-drift-alert.yml` — scheduled daily, same reasoning.
>
> Current model: **Required reviewers OFF.** Branch protection on `main` (above) is the pre-merge gate; `AUTO_DEPLOY_PROD_ENABLED` is the operational pause control — setting it to `false` closes the only automated forward path to production (a dashboard Manual Deploy and `rollback-prod.yml` still reach prod, by design, for recovery). If you ever want Required reviewers on prod-mutating workflows specifically, the cleanest path is to create a separate `production-automation` GitHub Environment with no protection rules, mirror the secrets there, and reference it from the two scheduled monitors plus whichever mutating workflows should stay unattended — leaving `production` with Required reviewers on for the rest.

---

## Step 11 — Deploy and Verify

### Trigger deploys

Normal path: dispatch **Deploy to Production** (`deploy-prod.yml`) with a reason. It triggers the five Render prod deploys, waits for the API to report the new SHA live, promotes the Vercel web build, then smokes prod. See `docs/runbooks/auto-deploy-prod.md`.

The manual controls below are for first-time setup, env var changes, and recovery:

- **Web (Vercel):** git builds are disabled (Ignored Build Step = `exit 0`), so a push deploys nothing. **Deployments tab → Redeploy** with cache off after env var changes.
- **API (Render):** **Builds tab → Manual Deploy → Deploy latest commit**. (The Render dashboard's manual deploy button is under the **Builds** tab, not Settings or Events — easy to miss.) Required because prod services have Auto-Deploy off.
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

## Step 12 — Delete the retired `REQUIRE_BETA_AUTH` var

#794 removed the flag from the code: `/v1/events`, `/v1/venues`, `/v1/search` and
`GET /v1/events/:id/price-submissions` now serve anonymous reads unconditionally,
and every mutating route guards itself. The var is inert once that deploy lands
(the check was `=== 'true'`, so its mere presence does nothing), but leave no
stale config behind:

1. Confirm the #794 API deploy is live on `concert-crawl-api`
2. Render dashboard → `concert-crawl-api` → **Environment** → delete `REQUIRE_BETA_AUTH`
3. No redeploy needed — nothing reads the var. Skip the manual deploy.
4. Verify `/v1/events`, `/v1/venues`, `/v1/search` answer 200 without a Clerk token

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

### Vercel WAF — `block-scanner-paths`, and the setting that must stay off

The prod project (`concert-crawl`, `prj_c1b4RmphaUmiGtDVtB987O12pn44`) carries exactly one custom firewall rule. `concert-crawl-staging` is deliberately left unconfigured, which makes it the control when you need to tell a firewall block apart from a real outage.

```
block-scanner-paths · active
  Request Path  matches expression  ^/(wp-|wordpress|\.env|\.git|phpmyadmin|xmlrpc\.php|vendor/)
  Deny, actionDuration: null
```

**What it is still worth, which is less than when it was written.** The original case was that an unknown URL fell through to `auth.protect` and 307'd to `/sign-in`, so a scanner sweeping 200 WordPress paths also bought 200 sign-in renders from the redirects it followed. The `KNOWN_TOP_LEVEL_SEGMENTS` gate in `apps/web/src/middleware.ts` (#1704) removed that on its own — unknown paths now 404 at the middleware. What survives is narrower: a WAF deny happens at the edge, ahead of the middleware, so it skips the middleware invocation that `config.matcher` otherwise makes unavoidable. Real, but small, and the smallness is the reason the rule gets no latitude to harm real visitors.

> ⚠️ **`actionDuration` must stay `null` on this rule. It is not a "how long to block the path" setting — it blocks the _client_.** The rule shipped on 2026-09-19 with `actionDuration: 15m` and within hours was returning 403 for the entire site to an ordinary browsing session. The regex was never at fault; the denies that show up in the dashboard against innocent paths (`/robots.txt`, `/sw.js`, `/watching`) are the aftermath of a client-level block, not evidence of over-matching. Residential and carrier-grade NAT means one probe from any device sharing a visitor's public IP takes that visitor off the whole site, with a bare `403 Forbidden` and no explanation. Set against that, a persistent action saves some middleware invocations on scanner sweeps — a quantity nobody has measured, and one the paragraph above already bounds as small. If scanner volume ever becomes a real cost, measure it first, then reach for a `rateLimit` action rather than reinstating `actionDuration`.

Smoke-testing is safe with `actionDuration: null`, and is the check that the setting has not crept back:

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://concertcrawl.app/.env   # expect 403
curl -s -o /dev/null -w '%{http_code}\n' https://concertcrawl.app/       # expect 200, immediately
```

A 403 on the second call means a persistent action is live again. A firewall denial is identifiable by the `x-vercel-mitigated: deny` response header.

**Other settings, and why they are where they are:**

- **Bot Protection and Attack Mode stay off.** Both challenge non-browser clients, which would break the Render cron's machine-to-machine `POST /api/revalidate` and threaten the hourly Playwright prod smoke tests.
- **AI Bots is on Allow, deliberately.** Blocking saves little while the site is invite-gated, and being the answer when someone asks an assistant what's on in Denver is the point of the product. If a finer line is ever wanted, `apps/web/src/app/robots.ts` can name specific agents rather than using Vercel's single lump toggle.
- **OWASP managed rules:** as read from the live config on 2026-09-19, `gen`, `rce`, `xss` and `sqli` are `active: true` with `action: "log"`, so they record and deny nothing; the other seven are inactive. Log mode is clearly available on this plan. Whether promoting one to **Deny** is also available is unverified — the dashboard has previously shown managed rules as a "Contact Sales" item, so check there before planning around it.

**Reading and editing the config.** The dashboard is the normal path; the API is there for verification, since the config is not stored in this repo. The bearer token is the Vercel CLI's, stored as JSON rather than a bare value:

```bash
# auth.json is macOS `~/Library/Application Support/com.vercel.cli/`,
# Linux `~/.local/share/com.vercel.cli/`. Whichever exists wins.
export VERCEL_AUTH=$(ls "$HOME/Library/Application Support/com.vercel.cli/auth.json" "$HOME/.local/share/com.vercel.cli/auth.json" 2>/dev/null | head -1)
export TOKEN=$(python3 -c "import json,os;print(json.load(open(os.environ['VERCEL_AUTH']))['token'])")
export PROJECT_ID=prj_c1b4RmphaUmiGtDVtB987O12pn44   # concert-crawl (prod)
export TEAM_ID=team_tBEQct4aCLPw5a8jbqRJbuPZ

# read
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://api.vercel.com/v1/security/firewall/config/active?projectId=$PROJECT_ID&teamId=$TEAM_ID"
```

Writes use `PATCH https://api.vercel.com/v1/security/firewall/config` with a body of `{"action":"rules.update","id":"<rule id>","value":{...}}`, where `value` is a complete rule object (`name`, `description`, `active`, `conditionGroup`, `action`) — it replaces the rule rather than patching fields, so read the current rule first and edit from that. A successful write returns `{}` and nothing else, so always re-read the active config to confirm the change landed.

Firewall analytics exports cap at 100 rows sorted by count, so a low-count trigger request is truncated out. An export that shows no matching path has not ruled one out.

### Email — `venues@concertcrawl.app`, and the DMARC path

`venues@concertcrawl.app` is the address `/bot` gives a venue's sysadmin. It is not a mailbox. Inbound mail is forwarded by Cloudflare Email Routing to `hugh@featherweight.design`, and replies are sent from Gmail through Resend's SMTP so the visible From stays on the Concert Crawl domain. Verified end to end on 2026-09-19.

The DNS, all in Cloudflare:

| Record                               | Type | Value                                                       | Priority | Whose                   |
| ------------------------------------ | ---- | ----------------------------------------------------------- | -------- | ----------------------- |
| `concertcrawl.app`                   | MX   | `route1.mx.cloudflare.net`                                  | 64       | Email Routing, inbound  |
| `concertcrawl.app`                   | MX   | `route2.mx.cloudflare.net`                                  | 98       | Email Routing, inbound  |
| `concertcrawl.app`                   | MX   | `route3.mx.cloudflare.net`                                  | 57       | Email Routing, inbound  |
| `concertcrawl.app`                   | TXT  | `v=spf1 include:_spf.mx.cloudflare.net ~all`                | —        | Email Routing, inbound  |
| `resend._domainkey.concertcrawl.app` | TXT  | DKIM public key                                             | —        | Resend, outbound        |
| `send.concertcrawl.app`              | TXT  | `v=spf1 include:amazonses.com ~all`                         | —        | Resend, outbound        |
| `send.concertcrawl.app`              | MX   | `feedback-smtp.us-east-1.amazonses.com`                     | 10       | Resend, outbound        |
| `_dmarc.concertcrawl.app`            | TXT  | `v=DMARC1; p=none; rua=mailto:dmarc@concertcrawl.app; fo=1` | —        | policy, hand-maintained |

**The root SPF record does not list Resend, and that is correct.** Resend's return path is on `send.concertcrawl.app`, which carries its own SPF, and DMARC's relaxed alignment treats that subdomain as the same organizational domain. Do not "fix" this by merging Amazon SES into the root record — the root SPF exists for Cloudflare's inbound routing and is a different job.

That alignment holds only while the DMARC record leaves `aspf` unset, since relaxed is the default and `aspf=s` demands that the envelope sender domain match `concertcrawl.app` exactly. **Adding Amazon SES to the root SPF would not rescue that** — SPF alignment compares the envelope domain, which is `send.concertcrawl.app` no matter what the apex record says, so the only fix would be moving Resend's MAIL FROM domain to the apex. Leave `aspf` unset. DKIM already signs with `d=concertcrawl.app` and aligns strictly on its own, so DMARC has a passing path either way.

**Gmail side, two settings.** Settings ▸ Accounts ▸ Send mail as carries `Concert Crawl <venues@concertcrawl.app>` sending through `smtp.resend.com` on port 465. Under it, "When replying to a message" must be **"Reply from the same address the message was sent to."** That second setting is the one that does the work: without it Gmail replies as the default address and a venue operator sees a personal domain they have no reason to trust. `venues@` is deliberately **not** the Gmail default, so ordinary mail is unaffected.

**Verifying, whenever this is touched.** Send to a mail-tester.com address from Gmail with the From dropdown switched to `venues@` — SPF, DKIM and DMARC should all pass. Then mail `venues@concertcrawl.app`, reply to what arrives, and read the raw headers on the reply. `From:` must be `venues@concertcrawl.app`, `mailed-by:` `send.concertcrawl.app`, `signed-by:` `concertcrawl.app`. Inspect the received copy, never the one in Sent: Gmail writes Sent copies locally and they carry no real authentication headers.

**DMARC is parked at `p=none` on purpose.** It collects reports and enforces nothing, so a misconfigured sender shows up in a report instead of vanishing. Reports land at `dmarc@concertcrawl.app`, which is another Cloudflare routing rule to the same destination. The path forward is `none` → read reports for several weeks → `quarantine` → `reject`, and each step waits on the reports showing no legitimate sender failing. Advancing blind is how a domain silently loses its own mail.

A BIMI logo in Gmail was considered and deferred. It needs `p=quarantine` or stricter, plus a Verified Mark Certificate that costs four figures a year and requires a registered trademark. Revisit after launch, once the domain is enforcing.

### Cloudflare DNS proxy must be OFF for Vercel domains

Cloudflare's orange-cloud proxy interferes with Vercel's SSL provisioning and creates double-CDN issues. Always **DNS only** (grey cloud) for any record pointing at Vercel.

### Vercel preview deploys — disable via Branch Tracking toggle

**Where:** Vercel Dashboard → project → **Settings** → **Environments** → **Preview** → **Branch Tracking** → toggle to **Disabled**, then click Save.

When Disabled, Vercel does not create deployments for any branch that doesn't match another environment — the GitHub webhook is dropped before a deployment slot is consumed. This is what we want on the free tier, where the 100/day `api-deployments-free-per-day` quota is easy to exhaust on a busy PR day. CLI/API deploys (e.g. the `Deploy to Production` GitHub Actions workflow) continue to work because they bypass the Git integration.

**History (for posterity):**

- An earlier `git.deploymentEnabled: { main: true, "*": false }` config (PR #656) was silently ignored — the `*` wildcard isn't supported by `deploymentEnabled`.
- A `vercel.json` `ignoreCommand` workaround (PR #660) prevented BUILDS from running on non-main pushes but did NOT prevent deployment slots from being created. The free-tier daily quota counted those ignored deployments, so on busy days (e.g. 2026-06-24) the quota still tipped over and prod auto-deploy was blocked for 24 hours.
- The dashboard Branch Tracking toggle was reported buggy at migration time (2026-06-15) but appears to work reliably as of 2026-06-24, after which the `vercel.json` was removed in favor of the toggle.

If the toggle ever silently re-enables itself, reintroduce a `vercel.json` with `ignoreCommand` as a build-skip layer (won't help with quota, but at least stops compute waste) and open an issue against Vercel.

If you ever need to re-enable previews on one project but not the other (e.g. staging previews back on for QA), use the per-project Branch Tracking toggle — there's nothing to coordinate in the repo.

### Render manual deploy is under the Builds tab

Not Settings, not Events. For services where `autoDeploy: no`, the **Builds tab → Manual Deploy** button is the only UI path. Don't reach for env-var-nudge workarounds.

### MCR rate limits will return

`mcr.microsoft.com/playwright:*` has anonymous-pull rate limits that throttle Render's build pool. The current crawler Dockerfile (PR #591) avoids MCR entirely. If you find yourself adding `FROM mcr.microsoft.com/...` to any new image, stop and use a non-MCR alternative.

### Pre-existing follow-up issues from the migration

- #589 — Separate Google OAuth client for production (currently shared with staging)
- #547 — already closed by the migration; kept for the historical record

---

## Notes

- Keep all `sk_live_*` keys out of git — dashboards and GitHub secrets only
- `NEXT_PUBLIC_APP_VERSION` is set at build time by `apps/web/next.config.ts` from `package.json#version` plus the deploy's commit SHA. The version prefix bumps automatically via `semantic-release`. SHA fallback chain is Render-only today — see Step 6's note and issue #595
- After a Clerk role change, the user must sign out and back in before the API sees the new role (JWT reissue)
- The four crawler cron jobs (2 prod + 2 staging) all share the same Dockerfile (`apps/crawler/Dockerfile`); changes apply to all when the image is rebuilt
