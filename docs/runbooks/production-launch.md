# Production Launch Runbook

Steps to bring the production environment fully online. Complete these in order — later steps depend on earlier ones.

This runbook reflects the post-2026-06-15 architecture: **web on Vercel, Postgres on Neon, API + crawler crons on Render**, updated for the Render exit. The staging API moved to Vercel on 2026-10-30. **From the prod cutover, the prod API is on Vercel too** (project `concert-crawl-api`, production, `https://api.concertcrawl.app`), with match-artists and spotify-weekly as Vercel Cron Jobs inside it. Only the two crawler crons stay on Render. Where a step differs before and after the cutover, it says so. See `docs/superpowers/progress.md` for the migration history.

---

## Prerequisites

- Staging environment is healthy and all pre-beta checklist items are validated there
- Access to dashboards: Vercel, Neon, Render, Cloudflare, Clerk (both Production and Staging apps), Resend, Sentry, GitHub repository settings. (Stripe is not yet wired — see Step 5.)
- Local tools: Docker (for `pg_dump`/`psql` via `postgres:16` image), `pnpm`, `gh` CLI

### Service inventory

| Concern                    | Provider       | Resource                                                                                                                                                                     |
| -------------------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Web (prod)                 | Vercel         | project `concert-crawl`, custom domain `concertcrawl.app`                                                                                                                    |
| Web (staging)              | Vercel         | project `concert-crawl-staging`, custom domain `staging.concertcrawl.app`                                                                                                    |
| API (prod)                 | Vercel         | project `concert-crawl-api`, production environment, custom domain `api.concertcrawl.app` (from the prod cutover)                                                            |
| API (prod, fallback)       | Render         | web service `concert-crawl-api`, suspended at the prod cutover for a 7-day watch                                                                                             |
| API (staging)              | Vercel         | project `concert-crawl-api`, `staging` custom environment, `api-staging.concertcrawl.app` (since 2026-10-30)                                                                 |
| API (staging, fallback)    | Render         | web service `concert-crawl-api-staging`, auto-deploy off                                                                                                                     |
| Match artists (prod)       | Vercel         | Cron Job in `concert-crawl-api`, `0 16 * * *` (Render cron `concert-crawl-match-artists` suspended at the cutover)                                                           |
| Spotify weekly (prod)      | Vercel         | Cron Job in `concert-crawl-api`, `30 15 * * 1` (Render cron `concert-crawl-spotify-weekly` suspended at the cutover)                                                         |
| Crawler triggers (prod)    | GitHub Actions | `crawler-triggers.yml`, dispatched by the API on each admin-queued crawl (Render cron suspended at the crawler cutover)                                                      |
| Crawler daily (prod)       | GitHub Actions | `crawler-daily.yml`, dispatched at 09:07 UTC by the `concert-crawl-api` Cron Job; its own `7 12 * * *` schedule is the backup (Render cron suspended at the crawler cutover) |
| Crawler triggers (staging) | Render         | cron job `concert-crawl-crawler-triggers-staging`                                                                                                                            |
| Crawler daily (staging)    | Render         | cron job `concert-crawl-crawler-daily-staging`                                                                                                                               |
| Database                   | Neon           | project `concert-crawl`, branches `production` + `staging` (PG 16, AWS us-west-2 Oregon)                                                                                     |
| Auth                       | Clerk          | two apps: **Concert Crawl** (prod, Production instance) and **Concert Crawl Staging** (staging, Production instance)                                                         |
| DNS                        | Cloudflare     | zone `concertcrawl.app` — DNS only, no proxy                                                                                                                                 |

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

| Key                                   | Value                                                                                                                                                                                                                                                                                               | Sensitive |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| `NEXT_PUBLIC_SITE_URL`                | `https://concertcrawl.app` (staging project: `https://staging.concertcrawl.app`) — canonical origin for share links and Open Graph tags. See the note below; leaving it unset is a silent defect, not a default                                                                                     | OFF       |
| `NEXT_PUBLIC_API_URL`                 | `https://api.concertcrawl.app` from the prod cutover (it was `https://concert-crawl-api.onrender.com`). Inlined at build time, so changing it needs a web redeploy                                                                                                                                  | OFF       |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`   | prod `pk_live_*` from Step 1 (encodes `clerk.concertcrawl.app`)                                                                                                                                                                                                                                     | OFF       |
| `CLERK_SECRET_KEY`                    | prod `sk_live_*` from Step 1                                                                                                                                                                                                                                                                        | ON        |
| `NEXT_PUBLIC_CLERK_DOMAIN`            | `concertcrawl.app` — **required** to disable Vercel's auto-proxy logic in `@clerk/nextjs` that would otherwise inject a broken `/__clerk` script src                                                                                                                                                | OFF       |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL`       | `/sign-in`                                                                                                                                                                                                                                                                                          | OFF       |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL`       | `/sign-up`                                                                                                                                                                                                                                                                                          | OFF       |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` | `/events`                                                                                                                                                                                                                                                                                           | OFF       |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` | `/auth/complete`                                                                                                                                                                                                                                                                                    | OFF       |
| `NEXT_PUBLIC_SENTRY_DSN`              | Web project DSN from Step 5                                                                                                                                                                                                                                                                         | OFF       |
| `SENTRY_DSN`                          | Same                                                                                                                                                                                                                                                                                                | ON        |
| `NEXT_PUBLIC_SENTRY_ENVIRONMENT`      | `production`                                                                                                                                                                                                                                                                                        | OFF       |
| `SENTRY_ENVIRONMENT`                  | `production`                                                                                                                                                                                                                                                                                        | OFF       |
| `SENTRY_AUTH_TOKEN`                   | From Step 5                                                                                                                                                                                                                                                                                         | ON        |
| `INVITE_COOKIE_SECRET`                | Generate fresh: `openssl rand -hex 32`                                                                                                                                                                                                                                                              | ON        |
| `INTERNAL_API_SECRET`                 | Generate fresh: `openssl rand -hex 32` — **must match** the same key in the API's env vars (Step 8)                                                                                                                                                                                                 | ON        |
| `REVALIDATE_SECRET`                   | Generate fresh: `openssl rand -hex 32` — **must match** the same key on both crawler cron jobs (Step 8). Unset → `/api/revalidate` fails closed (401) and the landing page relies on its 5-minute ISR window alone (#847)                                                                           | ON        |
| `NEXT_PUBLIC_POSTHOG_KEY`             | PostHog project API key (`phc_*`) — client-side usage analytics (pageviews, autocapture, no replay) plus share events; no billing events. Turn on the project's "Discard client IP data" first. Absent → no-op; also no-op off `concertcrawl.app`. Set only after Hugh approves the privacy wording | OFF       |
| `NEXT_PUBLIC_POSTHOG_HOST`            | `https://us.i.posthog.com` (US cloud region)                                                                                                                                                                                                                                                        | OFF       |

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

## Step 8 — API + Crawler Cron Env Vars

### concert-crawl-api (prod) — Vercel project, production environment

From the prod cutover, the prod API's runtime env vars live on the **production**
environment of the Vercel project `concert-crawl-api` (team featherweight-design).
They were copied by script from the Render prod `concert-crawl-api` service, plus
the extra vars of the `concert-crawl-match-artists` and
`concert-crawl-spotify-weekly` cron services, since those jobs now run inside the
API. The Render-only `NPM_CONFIG_PREFIX` is not needed on Vercel. Change a value
with `vercel env` or the dashboard, then redeploy: a running deployment keeps the
values it was built with. Never paste values into chat or this file.

| Variable                   | Value                                                                                                                                                                                                                                                                                                                                                                                  |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`             | `<NEON_PROD_POOLED>` URL from Step 2 (**pooled**). Migrations do not use it; `deploy-prod.yml` migrates over `DATABASE_URL_DIRECT` (Step 9)                                                                                                                                                                                                                                            |
| `DB_POOL_MAX`              | `3`. Caps each serverless instance's connections. (Render left it unset, which means postgres.js's default of 10)                                                                                                                                                                                                                                                                      |
| `CLERK_SECRET_KEY`         | prod `sk_live_*` from Step 1 (must match the web project's `CLERK_SECRET_KEY`)                                                                                                                                                                                                                                                                                                         |
| `CLERK_PUBLISHABLE_KEY`    | prod `pk_live_*` from Step 1                                                                                                                                                                                                                                                                                                                                                           |
| `ALLOWED_ORIGIN`           | `https://concertcrawl.app`                                                                                                                                                                                                                                                                                                                                                             |
| `ANTHROPIC_API_KEY`        | From Anthropic console                                                                                                                                                                                                                                                                                                                                                                 |
| `RESEND_API_KEY`           | From Step 5. Also used by the spotify-weekly digest                                                                                                                                                                                                                                                                                                                                    |
| `SENTRY_DSN`               | API project DSN from Step 5                                                                                                                                                                                                                                                                                                                                                            |
| `SENTRY_ENVIRONMENT`       | `production`                                                                                                                                                                                                                                                                                                                                                                           |
| `LOG_LEVEL`                | `info`                                                                                                                                                                                                                                                                                                                                                                                 |
| `NODE_ENV`                 | `production`                                                                                                                                                                                                                                                                                                                                                                           |
| `INTERNAL_API_SECRET`      | **Same value** as set in the Vercel web prod project (Step 6)                                                                                                                                                                                                                                                                                                                          |
| `SPOTIFY_CLIENT_ID`        | Spotify app client ID. Used by the API and the match-artists cron. Unset → the matcher no-ops                                                                                                                                                                                                                                                                                          |
| `SPOTIFY_CLIENT_SECRET`    | Spotify app client secret. Same                                                                                                                                                                                                                                                                                                                                                        |
| `CRON_SECRET`              | **Hugh sets it, never through chat** (set on production and staging since 2026-10-30). A random string of 32+ characters (`openssl rand -hex 32` into a file), production and staging. Vercel Cron sends it as a bearer token, and it arms `/v1/internal/cron/*`, the daily crawl's included. Unset → those routes return 404 and the daily crawl waits for the GitHub backup schedule |
| `CRAWLER_DISPATCH_TOKEN`   | Fine-grained GitHub token, this repository only, **Actions: read and write** (write includes read). It dispatches `crawler-triggers.yml` and `crawler-daily.yml`, and lists `crawler-daily.yml` runs so the daily cron can skip a day that already has one. Unset → admin crawls wait for the next daily run, and the daily cron answers 503                                           |
| `CRAWLER_DISPATCH_REPO`    | `featherweight-design/concert-crawl`. Unset → the old default, `HartiganHM/concert-crawl`                                                                                                                                                                                                                                                                                              |
| `EMAIL_UNSUBSCRIBE_SECRET` | **Same value as on Render** (the spotify-weekly service). Unsubscribe links already sent are signed with it, so a new value would break them                                                                                                                                                                                                                                           |
| `API_PUBLIC_URL`           | `https://api.concertcrawl.app`. Unsubscribe links in emails point at it                                                                                                                                                                                                                                                                                                                |
| `NATIVE_DIGEST_ENABLED`    | Optional, copied from the spotify-weekly service. `1` digests every follower, not just Spotify ones                                                                                                                                                                                                                                                                                    |
| `SPOTIFY_SYNC_DRY_RUN`     | Optional, copied from the spotify-weekly service. `1` makes a log-only cycle (no writes, no emails)                                                                                                                                                                                                                                                                                    |

**Cron Jobs.** `vercel.json` in the API project defines three Vercel Cron Jobs:
`0 16 * * *` → `GET /v1/internal/cron/match-artists`, `30 15 * * 1` →
`GET /v1/internal/cron/spotify-weekly`, and `7 9 * * *` →
`GET /v1/internal/cron/crawler-daily`. They run only on production deployments.
The project is on the team's Pro plan, so each fires within its minute (Hobby
would allow these once-a-day schedules too, but anywhere in the hour). Cron Jobs
were **disabled** on the project at first, because Vercel counted the first
staging deploy as production and registered them against it; they were
re-enabled after the first prod deploy (enabled on 2026-11-01, when this was
last checked). If they are ever re-enabled after a pause, suspend the Render
crons `concert-crawl-match-artists` and `concert-crawl-spotify-weekly` in the
same sitting, so neither job runs twice or not at all. `prod-deploy-health.yml`
alerts while they are disabled.

The `crawler-daily` route starts the daily venue crawl, because GitHub's own
schedule drops runs on this repository. It needs `CRON_SECRET`,
`CRAWLER_DISPATCH_TOKEN` and `CRAWLER_DISPATCH_REPO` above, and acts only on the
production deployment. It lists the `crawler-daily.yml` runs on `main` created
since 00:00 UTC, skips when a production run has crawled today (still running,
or its crawl step ran), and otherwise dispatches one with `skip_if_ran_today`
set, so the workflow checks again from inside the run. The dispatched run
crawls only while `CRAWLER_GHA_DAILY_ENABLED` is `true`. A check it cannot make answers 503 and dispatches
nothing. Every outcome writes an `audit_log` row (`actor_id`
`system:vercel-cron`, action `crawl.daily_cron`). GitHub's `7 12 * * *`
schedule is the backup and skips the same way; see
`docs/runbooks/crawler-github-actions.md`.

**Domain.** `api.concertcrawl.app` is added to the project on the production
environment, with a Cloudflare `CNAME` record `api` pointing at the target Vercel
shows, **DNS only** (see "Cloudflare DNS proxy must be OFF for Vercel domains"
below). Production custom domains are not covered by the project's Standard
Deployment Protection (`ssoProtection` is `all_except_custom_domains`), so unlike
the staging custom-environment domain, it needed no exception.

**Stripe webhook.** At the cutover, edit the live Stripe webhook endpoint's URL to
`https://api.concertcrawl.app/v1/webhooks/stripe`. Edit the existing endpoint
rather than creating a new one: editing the URL keeps its signing secret, so
`STRIPE_WEBHOOK_SECRET` does not change.

### concert-crawl-api (prod) — Render, suspended fallback

At the prod cutover this service is **suspended, not deleted**, and kept for a
7-day watch. Deleting it needs Hugh's OK. Its env vars stay as they were, so it
can be resumed as a rollback target; see "Falling back to Render" below. Its env vars (Render dashboard → **Environment**)
are the table above, minus `DB_POOL_MAX` (unset, default 10) and `CRON_SECRET`
(unset, so `/v1/internal/cron/*` returns 404), plus
`NPM_CONFIG_PREFIX=/opt/render/.npm-global`, without which the build's
`npm install -g pnpm` fails with EROFS. `API_PUBLIC_URL`,
`EMAIL_UNSUBSCRIBE_SECRET` and the optional digest flags were on the
spotify-weekly cron service, not on this one.

#### Falling back to Render

For when Vercel itself is the problem, or the API has no Vercel deployment to
roll back to (the first production deploy). Only possible while the Render
services still exist (the 7-day watch). Every consumer of the API moves back,
in one sitting:

1. **API.** Resume `concert-crawl-api` on Render and redeploy it from `main`
   (Builds tab → Manual Deploy). Its build runs `pnpm db:migrate`; prod is
   already migrated, so that is a no-op unless `main` has newer migrations.
   Wait for `https://concert-crawl-api.onrender.com/v1/health` to return 200.
2. **Crons.** Resume `concert-crawl-match-artists` and
   `concert-crawl-spotify-weekly` on Render, and in the same sitting turn off
   Cron Jobs on the Vercel `concert-crawl-api` project (Settings → Cron Jobs),
   so neither job runs twice.
3. **Stripe.** Edit the live webhook endpoint's URL back to
   `https://concert-crawl-api.onrender.com/v1/webhooks/stripe`. Editing keeps
   its signing secret, which Render's `STRIPE_WEBHOOK_SECRET` already matches.
   Send a test event.
4. **Web.** Set the web prod project's `NEXT_PUBLIC_API_URL` back to
   `https://concert-crawl-api.onrender.com` and redeploy web from the Vercel
   dashboard (Redeploy, cache off). Not through Deploy to Production: that
   workflow now deploys the API to Vercel. The service worker accepts both
   origins.
5. **GitHub.** Set the repository variable `PROD_API_URL` back to
   `https://concert-crawl-api.onrender.com`.
6. **Pipeline.** Revert the PR that moved `deploy-prod.yml`,
   `prod-deploy-health.yml`, `prod-drift-alert.yml`, `rollback-prod.yml` and
   `prod-smoke-after-deploy.yml` to Vercel, which restores the Render
   versions. Until that merges, do not dispatch Deploy to Production, and
   expect the deploy-health and drift monitors to report that they could not
   run.

Emails sent while prod was on Vercel carry unsubscribe links on
`api.concertcrawl.app`; they work again once the Vercel API is back.

The `concert-crawl-match-artists` and `concert-crawl-spotify-weekly` Render crons
are suspended the same way; their env vars are listed in `render.yaml`.

> **Render build commands (the suspended fallbacks only).** Both Render API services, prod `concert-crawl-api` and `concert-crawl-api-staging`, build with:
>
> ```
> npm install -g pnpm && pnpm install --frozen-lockfile && pnpm db:migrate && pnpm turbo build --filter=@concert-crawl/api
> ```
>
> So resuming and redeploying either one migrates its database. On Vercel there is no migration in the build: `deploy-prod.yml` and `deploy-api-staging.yml` run `pnpm db:migrate` over the direct URL before deploying. (An earlier version of this note said the prod build skipped `pnpm db:migrate`; `render.yaml` and `render-service-config.md` record that it runs it.)
>
> On some Node versions Render serves Node from a read-only `/usr/lib` that already holds a pnpm, and `npm install -g pnpm` then fails with `EROFS: read-only file system`. Every Node service therefore sets `NPM_CONFIG_PREFIX=/opt/render/.npm-global`, which moves npm's global prefix somewhere writable. Set it when creating any Node service. See `render-service-config.md` → "`NPM_CONFIG_PREFIX` keeps `npm install -g pnpm` working". (An earlier version of this note recommended swapping in `corepack enable`; the live build commands never changed, and on 2026-10-27 the env var was the fix that shipped.)

### concert-crawl-crawler-triggers + concert-crawl-crawler-daily (prod)

> **Suspended since the crawler cutover (Render exit step 2).** The prod crawler runs on GitHub Actions and reads its env from the `production` GitHub environment; see `docs/runbooks/crawler-github-actions.md`. This section is kept for the fallback during the 7-day watch. The API needs `CRAWLER_DISPATCH_TOKEN` (a fine-grained GitHub token with Actions: write on this repo, which includes the read that lists runs) on the Vercel `concert-crawl-api` project, production and staging; it dispatches admin-queued crawls and, from the production Cron Job, the daily crawl.

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

The staging API runs on Vercel since 2026-10-30; its env vars are described in `docs/runbooks/staging-environment.md`. For the Render fallbacks, use the same variable set on `concert-crawl-api-staging`, `concert-crawl-crawler-triggers-staging`, `concert-crawl-crawler-daily-staging`, but with:

- **Staging Clerk keys** (`pk_live_*` / `sk_live_*` from the Concert Crawl Staging app — different app, different keys)
- `NEON_STAGING_POOLED` as the `DATABASE_URL`
- `SENTRY_ENVIRONMENT=staging`
- `ALLOWED_ORIGIN=https://staging.concertcrawl.app`

---

## Step 9 — GitHub Environment Secrets and Variables

GitHub Actions workflows use a mix of **environment-scoped** secrets (e.g. `deploy-prod.yml` + `prod-smoke-after-deploy.yml` read from the `production` GH environment) and **repository-level** secrets/vars (e.g. `staging-smoke.yml`, `staging-e2e.yml`, `smoke.yml`). The split below reflects that — don't drop env-scoped secrets thinking they're duplicates of repo-level ones.

GitHub → repository → **Settings** → **Environments**.

### Crawler (`crawler-run.yml`), both environments

The crawler on GitHub Actions reads its own copies, in the `production` and
`staging` environments: secrets `CRAWLER_DATABASE_URL` (pooled Neon URL),
`CRAWLER_SENTRY_DSN`, `CRAWLER_RESEND_API_KEY`, `ANTHROPIC_API_KEY`,
`CLERK_SECRET_KEY`, `VAPID_PRIVATE_KEY`, `REVALIDATE_SECRET`; variables
`ADMIN_URL`, `VAPID_PUBLIC_KEY`, `VAPID_SUBJECT` (plus the existing
`SENTRY_ENVIRONMENT`, `LOG_LEVEL` and the repo-level `ADMIN_EMAIL`). The repo
variable `CRAWLER_GHA_DAILY_ENABLED` arms the daily schedule. **Rotating any of
these values (a Neon password, the Sentry DSN, an API key) means updating the
crawler's copy too.** Details: `docs/runbooks/crawler-github-actions.md`.

### `staging` environment — Secrets

| Secret         | Value                                                                     |
| -------------- | ------------------------------------------------------------------------- |
| `DATABASE_URL` | `NEON_STAGING_POOLED` from Step 2 — for future crawler/migration GHA jobs |
| `SENTRY_DSN`   | Staging Sentry project DSN                                                |

The staging API deploys from `deploy-api-staging.yml` to Vercel on API pushes to `main` (see `docs/runbooks/staging-environment.md`); Render's `concert-crawl-api-staging` is a fallback with auto-deploy off. **Prod does not** auto-deploy — Git deployments are off on both prod Vercel projects, the crawler crons have `Auto-Deploy: no`, and prod is promoted only by dispatching `deploy-prod.yml`; see `docs/runbooks/auto-deploy-prod.md`. `staging-smoke.yml` and `staging-e2e.yml` wait for that workflow's run with `GITHUB_TOKEN` (`gha-wait-for-workflow.sh`) and no longer read the repo-level `RENDER_API_TOKEN`. The same token exists separately in the `production` GH environment for prod workflows (`deploy-prod.yml`, `prod-smoke-after-deploy.yml`, `rollback-prod.yml`, `prod-deploy-health.yml`, `prod-drift-alert.yml`) — see those tables for prod usage. Staging web is deployed by Vercel's GitHub integration directly — no deploy hook needed there either.

### `staging` environment — Variables

| Variable             | Value     |
| -------------------- | --------- |
| `SENTRY_ENVIRONMENT` | `staging` |
| `LOG_LEVEL`          | `info`    |

### `production` environment — Secrets

| Secret                | Value                                                                                                                                                                                                                                                                                                                                                                  |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`        | `NEON_PROD_POOLED` from Step 2                                                                                                                                                                                                                                                                                                                                         |
| `SENTRY_DSN`          | Crawler project DSN from Step 5                                                                                                                                                                                                                                                                                                                                        |
| `RENDER_API_TOKEN`    | Render → Account Settings → **API Keys** → generate token with deploy + read permissions. From the prod cutover it covers only the two crawler crons: `deploy-prod.yml` triggers their deploys with it, and `prod-smoke-after-deploy.yml`, `rollback-prod.yml` and `prod-deploy-health.yml` use it for their crawler steps. `prod-drift-alert.yml` no longer reads it. |
| `DATABASE_URL_DIRECT` | **New at the prod cutover.** The prod Neon branch's **direct** connection string (no `-pooler` in the host). `deploy-prod.yml` runs `pnpm db:migrate` with it before the API deploy, and refuses a `-pooler` host.                                                                                                                                                     |
| `VERCEL_TOKEN`        | Vercel → Account Settings → Tokens. Already there for the web promotion. From the prod cutover it also deploys, rolls back and reads the API project, so it must have access to the **featherweight-design** team. Consumed by `deploy-prod.yml`, `rollback-prod.yml`, `prod-smoke-after-deploy.yml`, `prod-deploy-health.yml` and `prod-drift-alert.yml`.             |
| `RESEND_API_KEY`      | Same Resend API key the API + crawler runtime use. Consumed by `prod-smoke-after-deploy.yml` and `deploy-prod.yml` (Notify-admin step on auto-rollback). Optional — if missing, the workflow gracefully degrades to a `::warning::` annotation; primary failure signal still goes out via the GHA workflow-failure email.                                              |

No per-service `RENDER_DEPLOY_HOOK_*` secrets are needed — the promotion workflow uses the Render API with `RENDER_API_TOKEN` + the service IDs in the variables table below.

`DATABASE_URL` above is not what migrates prod; `DATABASE_URL_DIRECT` is.

### `production` environment — Variables

| Variable                             | Value                                                                                                                                                                                                                                                                     |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SENTRY_ENVIRONMENT`                 | `production`                                                                                                                                                                                                                                                              |
| `LOG_LEVEL`                          | `info`                                                                                                                                                                                                                                                                    |
| `RENDER_SERVICE_ID_CRAWLER_TRIGGERS` | Service ID for `concert-crawl-crawler-triggers`. Unused since the crawler cutover; deleted with the suspended service.                                                                                                                                                    |
| `RENDER_SERVICE_ID_CRAWLER_DAILY`    | Service ID for `concert-crawl-crawler-daily`. Same.                                                                                                                                                                                                                       |
| `VERCEL_ORG_ID`                      | The featherweight-design Team ID (`team_*`). Already present for the web promotion; shared by the web and API projects.                                                                                                                                                   |
| `VERCEL_PROJECT_ID`                  | The **web** prod project `concert-crawl` (`prj_*`). Already present.                                                                                                                                                                                                      |
| `VERCEL_PROJECT_ID_API`              | **New at the prod cutover.** `prj_akzBWiGHyaLqECpGOGWSoWr6E7C0`, the `concert-crawl-api` project (the same project staging uses). Consumed by `deploy-prod.yml`, `rollback-prod.yml`, `prod-smoke-after-deploy.yml`, `prod-deploy-health.yml` and `prod-drift-alert.yml`. |
| `RENDER_SERVICE_ID_API`              | Render → `concert-crawl-api` → service ID (`srv-...`). **Unused from the prod cutover**: no workflow reads it once the API is on Vercel. Deleted in the removal PR with the suspended service, after the 7-day watch and Hugh's OK.                                       |
| `RENDER_SERVICE_ID_MATCH_ARTISTS`    | Service ID for `concert-crawl-match-artists`. **Unused from the prod cutover**; deleted with the service, as above.                                                                                                                                                       |
| `RENDER_SERVICE_ID_SPOTIFY_WEEKLY`   | Service ID for `concert-crawl-spotify-weekly`. **Unused from the prod cutover**; deleted with the service, as above.                                                                                                                                                      |

> Note: `ADMIN_EMAIL` is at the **repo level** in current operational state (see the Repository-level variables table below) and is consumed by `vars.ADMIN_EMAIL` from workflows scoped to `environment: production`. Hugh — if you want to scope it to the `production` environment instead for tighter PII exposure, move the value via Settings → Environments → production → Variables and delete the repo-level entry; all four prod-touching workflows already declare `environment: production` so they'll resolve it from the env scope. Strictly an operator hygiene change; not blocking.

### Repository-level secrets (Settings → Secrets → Actions)

| Secret                   | Value                                                                                                                                                                                                                                           |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GH_TOKEN`               | Personal access token with `repo` scope — used by `release.yml` (semantic-release) to push the release commit back to `main`                                                                                                                    |
| `SENTRY_DSN_SMOKE`       | Sentry DSN for smoke test error reporting                                                                                                                                                                                                       |
| `E2E_TEST_USER_EMAIL`    | Email of the test Clerk user (staging instance) for staging E2E runs                                                                                                                                                                            |
| `E2E_TEST_USER_PASSWORD` | Password of the test Clerk user for staging E2E runs                                                                                                                                                                                            |
| `ANTHROPIC_API_KEY`      | Pre-provisioned for future crawler GHA jobs                                                                                                                                                                                                     |
| `RENDER_API_TOKEN`       | Render → Account Settings → **API Keys** → same token as the production-env one (re-stored at repo level for workflows not scoped to the `production` environment; `staging-smoke.yml` and `staging-e2e.yml` stopped reading it on 2026-10-30). |

### Repository-level variables (Settings → Variables → Actions)

| Variable                        | Value                                                                                                                                                                                                                                                                                                                                                  |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `SMOKE_ENABLED`                 | `false` during private beta; flip to `true` at public launch. Gates the scheduled 6-hourly `smoke.yml` only — the deploy pipeline uses separate kill switches.                                                                                                                                                                                         |
| `STAGING_SMOKE_ENABLED`         | `false` by default. Set to `true` to enable `staging-smoke.yml`. See `docs/runbooks/auto-deploy-prod.md`.                                                                                                                                                                                                                                              |
| `AUTO_DEPLOY_PROD_ENABLED`      | `false` by default. Set to `true` to arm `deploy-prod.yml`, the **only automated** path to production. While it is `false` no promotion can run; a Render dashboard Manual Deploy, a manual Vercel redeploy, and `rollback-prod.yml` still reach prod by design. Counter-intuitive name, kept for continuity. See `docs/runbooks/auto-deploy-prod.md`. |
| `PROD_SMOKE_RECONCILER_ENABLED` | Vestigial. `prod-smoke-after-deploy.yml` is `workflow_dispatch`-only and every dispatch satisfies its job `if:`, so this switch gates nothing today. Kept so re-arming the workflow on push or schedule has a switch ready.                                                                                                                            |
| `PROD_URL`                      | `https://concertcrawl.app`                                                                                                                                                                                                                                                                                                                             |
| `PROD_API_URL`                  | `https://api.concertcrawl.app` from the prod cutover (it was `https://concert-crawl-api.onrender.com`). The Vercel scripts resolve its hostname to find the deployment prod serves, so it must be the custom domain.                                                                                                                                   |
| `STAGING_URL`                   | `https://staging.concertcrawl.app`                                                                                                                                                                                                                                                                                                                     |
| `STAGING_API_URL`               | `https://api-staging.concertcrawl.app` (Vercel, since 2026-10-30). Consumed by `staging-smoke.yml` and the health check in `deploy-api-staging.yml`.                                                                                                                                                                                                   |
| `RENDER_SERVICE_ID_API_STAGING` | Render → `concert-crawl-api-staging` → service ID from the dashboard URL (`srv-...`). No longer read by any workflow since the staging API moved to Vercel (2026-10-30); remove it with the Render staging service.                                                                                                                                    |
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

Normal path: dispatch **Deploy to Production** (`deploy-prod.yml`) with a reason. It triggers the two Render crawler deploys right after its main-HEAD check, migrates the prod database, deploys the API to Vercel production and checks `/v1/health`, promotes the Vercel web build, then smokes prod. See `docs/runbooks/auto-deploy-prod.md`.

The manual controls below are for first-time setup, env var changes, and recovery:

- **Web (Vercel):** git builds are disabled (Ignored Build Step = `exit 0`), so a push deploys nothing. **Deployments tab → Redeploy** with cache off after env var changes.
- **API (Vercel):** Git deployments are off on `concert-crawl-api`, so use the dispatch, including after an env var change. A dashboard **Redeploy** also works, but that deployment does not record the one it replaced (`meta.prevApiDeployment`), so rolling it back with `rollback-prod.yml` then needs the `api_deployment` input. If the project is in a rollback state, a new production deployment does not take the domain until it is promoted; see `auto-deploy-prod.md`.
- **Crawler (GitHub Actions):** nothing to redeploy. Each run builds the image at the commit the production API serves and reads the `production` GitHub environment, so a changed value applies on the next run.

### Smoke checks

```bash
# API health
curl https://api.concertcrawl.app/v1/health
# expect 200 with {"status":"ok","timestamp":"...","version":"..."}

# CORS preflight from prod web origin
curl -I -X OPTIONS https://api.concertcrawl.app/v1/health \
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
3. The API dispatches **Crawler triggers**; the run starts within a minute or two and builds for about three
4. GitHub → Actions → **Crawler triggers** → the newest `production` run → **Run crawler** step → confirm the log shows:
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
2. Delete `REQUIRE_BETA_AUTH` wherever it is set: the Vercel `concert-crawl-api` production environment (if the cutover copied it) and the Render `concert-crawl-api` service → **Environment**
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

- **Web (Vercel):** Deployments tab → click any previous deploy → **Instant Rollback** (older UIs say **Promote to Production**). No rebuild.
- **API (Vercel):** dispatch **Rollback Production (manual)** (`rollback-prod.yml`), which runs `vercel rollback` on `concert-crawl-api`, or use Instant Rollback in that project's dashboard. This also rolls back match-artists and spotify-weekly, which run inside the API. After a rollback the project stops giving new production deployments the domain until one is promoted; `deploy-prod.yml` does that promote itself. If Vercel itself is the problem, fall back to the suspended Render services (during the 7-day watch); see "Falling back to Render" in Step 8.
- **Crawler (GitHub Actions):** follows the API. It runs the commit the production API serves, so rolling the API back rolls the crawler back on its next run.
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

**What it is still worth, which is less than when it was written.** The original case was that an unknown URL fell through to `auth.protect` and 307'd to `/sign-in`, so a scanner sweeping 200 WordPress paths also bought 200 sign-in renders from the redirects it followed. The `KNOWN_TOP_LEVEL_SEGMENTS` gate in `apps/web/src/proxy.ts` (#1704) removed that on its own — unknown paths now 404 at the middleware. What survives is narrower: a WAF deny happens at the edge, ahead of the middleware, so it skips the middleware invocation that `config.matcher` otherwise makes unavoidable. Real, but small, and the smallness is the reason the rule gets no latitude to harm real visitors.

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

### Vercel API domain

`api.concertcrawl.app` (prod) and `api-staging.concertcrawl.app` (staging) are Cloudflare `CNAME` records to the target Vercel shows for each, both **DNS only**. The prod domain is attached to the `concert-crawl-api` project's production environment, which the project's Deployment Protection leaves public (`all_except_custom_domains`). The staging domain belongs to a custom environment and needed a protection exception. If the API answers with a Vercel login page, that exception or setting has changed.

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
