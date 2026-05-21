# Production Launch Runbook

Steps to bring the production environment fully online. Complete these in order — later steps depend on earlier ones.

---

## Prerequisites

- Staging environment is healthy and all pre-beta checklist items are validated there
- Access to: Cloudflare dashboard, Clerk dashboard, Render dashboard, Stripe dashboard, Resend dashboard, Sentry, GitHub repository settings
- The following Render services exist (provisioned via `render.yaml`):
  - `concert-crawl-api` — production API web service
  - `concert-crawl-web` — production web service
  - `concert-crawl-crawler-triggers` — production cron job (every 10 min)
  - `concert-crawl-crawler-daily` — production cron job (3 AM MT)
  - `concert-crawl-db` — production Postgres database

> **If `concert-crawl-crawler-triggers` or `concert-crawl-crawler-daily` are missing from the Render dashboard**, create them now via New → Cron Job using the settings in `render.yaml` before continuing. These are required for any events to appear in production. See [Step 0](#step-0--verify-and-fix-render-service-configuration) below.

---

## Step 0 — Verify and Fix Render Service Configuration

Several production services were provisioned with settings that differ from `render.yaml`. Fix these before deploying.

### concert-crawl-api

1. Render dashboard → `concert-crawl-api` → **Settings**
2. Verify / correct:
   - **Root Directory:** leave blank (empty string)
   - **Build Command:** `npm install -g pnpm && pnpm install --frozen-lockfile && pnpm turbo build --filter=@concert-crawl/api`
   - **Start Command:** `node apps/api/dist/index.js`
   - **Health Check Path:** `/v1/health` — must not be blank
   - **Auto-Deploy:** `No` — production deploys are triggered manually from the Render dashboard (see Step 12)
3. Save changes.

### concert-crawl-web

1. Render dashboard → `concert-crawl-web` → **Settings**
2. Verify / correct:
   - **Root Directory:** leave blank (empty string)
   - **Build Command:** `npm install -g pnpm && pnpm install --frozen-lockfile && pnpm turbo build --filter=@concert-crawl/web`
   - **Start Command:** `cd apps/web && pnpm start`
   - **Health Check Path:** `/` (Next.js serves the root)
   - **Auto-Deploy:** `No`
3. Save changes.

### concert-crawl-api-staging

1. Render dashboard → `concert-crawl-api-staging` → **Settings**
2. Verify / correct:
   - **Plan:** `Starter` — the `free` plan spins down after inactivity and breaks E2E tests
   - **Health Check Path:** `/v1/health`
   - **Auto-Deploy:** `No`
3. Save changes.

### concert-crawl-web-staging

1. Render dashboard → `concert-crawl-web-staging` → **Settings**
2. Verify / correct:
   - **Plan:** `Starter` — same reason as above
   - **Auto-Deploy:** `No`
3. Save changes.

### Production crawler cron jobs

If `concert-crawl-crawler-triggers` and `concert-crawl-crawler-daily` do not exist:

1. Render dashboard → **New** → **Cron Job**
2. Create `concert-crawl-crawler-triggers`:
   - **Name:** `concert-crawl-crawler-triggers`
   - **Runtime:** Docker
   - **Dockerfile Path:** `./apps/crawler/Dockerfile`
   - **Schedule:** `*/10 * * * *`
   - **Region:** Oregon
   - **Plan:** Starter
   - **Auto-Deploy:** `No`
3. Create `concert-crawl-crawler-daily`:
   - Same settings except **Name:** `concert-crawl-crawler-daily`, **Schedule:** `0 9 * * *` (3 AM MT)
4. Set env vars per the table in Step 4 below — do this before the first scheduled run.

---

## Step 1 — Create Clerk Production Instance

1. Go to [clerk.com](https://clerk.com) → switch to the **Production** instance (or create one)
2. Under **Domains**, add `concertcrawl.app` as the production domain
3. **Configure the JWT session token template** — required for API role-based auth:
   - Go to **Sessions** → **Customize session token**
   - Add the following to the token claims:
     ```json
     { "metadata": "{{user.public_metadata}}" }
     ```
   - Without this, `requireRole()` in the API will always return 403
4. Copy the following values — you'll need them in Step 4:
   - **Publishable Key** (`pk_live_...`)
   - **Secret Key** (`sk_live_...`)

---

## Step 2 — Point DNS to Render

1. Go to Cloudflare dashboard → `concertcrawl.app` zone
2. Add a **CNAME** record for the apex domain:
   - **Name:** `@`
   - **Target:** `concert-crawl-web.onrender.com`
   - **Proxy:** **DNS only** (grey cloud) initially
3. Add a **CNAME** record for `www`:
   - **Name:** `www`
   - **Target:** `concert-crawl-web.onrender.com`
   - **Proxy:** DNS only initially
4. Add a **Redirect Rule** in Cloudflare to redirect `https://www.concertcrawl.app/*` → `https://concertcrawl.app/$1` (301) so there is a single canonical URL.
5. Render dashboard → `concert-crawl-web` → **Settings** → **Custom Domains** → add `concertcrawl.app` and `www.concertcrawl.app`
6. Wait for Render to provision SSL certificates (usually < 5 minutes)
7. Verify SSL is active in the Render dashboard, then **re-enable the Cloudflare proxy** (orange cloud) on both CNAME records — this restores DDoS protection, CDN caching, and WAF. Do not leave them in DNS-only mode long-term.

---

## Step 3 — Provision Third-Party Services

### Stripe

1. Switch Stripe account to **Live** mode
2. Copy live **Secret Key** (`sk_live_...`)
3. Set up a **production** webhook endpoint:
   - URL: `https://concert-crawl-api.onrender.com/v1/webhooks/stripe`
   - Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
   - Copy the **Webhook Signing Secret**
4. Set up a **staging** webhook endpoint (separate):
   - URL: `https://concert-crawl-api-staging.onrender.com/v1/webhooks/stripe`
   - Same events as above
   - Copy the **Staging Webhook Signing Secret** — stored as `STRIPE_WEBHOOK_SECRET` in the staging API's Render env vars

### Resend

1. In the Resend dashboard → **Domains** → **Add Domain** → enter `concertcrawl.app`
2. Resend will show you **four** DNS records to add in Cloudflare — add all of them:
   - Two **DKIM** `TXT` records (e.g. `resend._domainkey` and `resend2._domainkey`)
   - One **SPF** `TXT` record on `@` (merge with any existing SPF record if one exists — do not create a second SPF record)
   - One **DMARC** `TXT` record on `_dmarc` (Resend provides a permissive starter policy)
3. Click **Verify** in Resend and wait for all four records to show as verified — emails will fail or land in spam if any record is missing
4. Copy the **API Key**

### Sentry

Create three projects — one per app:

1. Create a **concert-crawl-api** project → copy DSN
2. Create a **concert-crawl-web** project → copy DSN
3. Create a **concert-crawl-crawler** project (or reuse the API DSN) → copy DSN
4. Generate a **`SENTRY_AUTH_TOKEN`** for source map uploads:
   - Organization Settings → **Auth Tokens** → New Token
   - Scopes required: `project:releases`, `org:read`
   - This token is used by the Next.js build on Render to upload source maps at build time — without it, Sentry stack traces show minified/obfuscated code

---

## Step 4 — Set Environment Variables in Render (Production)

Go to each service in the Render dashboard → **Environment** tab. `DATABASE_URL` is auto-injected via the `fromDatabase` reference in `render.yaml` — verify it is populated but do not override it manually.

> Many of these variables are declared as `sync: false` in `render.yaml`, meaning Render knows they exist but does not manage their values. Services provisioned before a variable was added to `render.yaml` will not show a warning — set them proactively.

### concert-crawl-api

| Variable                | Value                                                                                                                                            |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `DATABASE_URL`          | Auto-set via `fromDatabase` in render.yaml — verify it's populated                                                                               |
| `CLERK_SECRET_KEY`      | `sk_live_...` from Step 1                                                                                                                        |
| `ALLOWED_ORIGIN`        | `https://concertcrawl.app`                                                                                                                       |
| `ANTHROPIC_API_KEY`     | From Anthropic console                                                                                                                           |
| `STRIPE_SECRET_KEY`     | `sk_live_...` from Step 3                                                                                                                        |
| `STRIPE_WEBHOOK_SECRET` | Production webhook signing secret from Step 3                                                                                                    |
| `RESEND_API_KEY`        | From Step 3                                                                                                                                      |
| `SENTRY_DSN`            | API project DSN from Step 3                                                                                                                      |
| `SENTRY_ENVIRONMENT`    | `production`                                                                                                                                     |
| `LOG_LEVEL`             | `info`                                                                                                                                           |
| `NODE_ENV`              | `production`                                                                                                                                     |
| `REQUIRE_BETA_AUTH`     | `true` — gates public browse/search/venue routes behind Clerk auth during private beta. Remove or set to `false` at public launch (see Step 14). |

> **PORT:** Render injects `PORT=10000` automatically for web services. Do not override it unless Hono is explicitly bound to a different port.

### concert-crawl-web

| Variable                              | Value                                                                  |
| ------------------------------------- | ---------------------------------------------------------------------- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`   | `pk_live_...` from Step 1                                              |
| `CLERK_SECRET_KEY`                    | `sk_live_...` from Step 1                                              |
| `NEXT_PUBLIC_API_URL`                 | `https://concert-crawl-api.onrender.com`                               |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL`       | `/sign-in`                                                             |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL`       | `/sign-up`                                                             |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` | `/events`                                                              |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` | `/auth/complete`                                                       |
| `INVITE_COOKIE_SECRET`                | Generate: `openssl rand -hex 32` — gates the invite code wall          |
| `SENTRY_DSN`                          | Web project DSN from Step 3                                            |
| `NEXT_PUBLIC_SENTRY_DSN`              | Same as `SENTRY_DSN`                                                   |
| `SENTRY_ENVIRONMENT`                  | `production`                                                           |
| `NEXT_PUBLIC_SENTRY_ENVIRONMENT`      | `production`                                                           |
| `SENTRY_AUTH_TOKEN`                   | Auth token from Step 3 — required for source map uploads at build time |
| `NODE_ENV`                            | `production`                                                           |

> `NEXT_PUBLIC_APP_VERSION` is auto-injected at build time: the version prefix comes from the `version` field in root `package.json` (bumped automatically by `semantic-release`), and the commit hash suffix comes from `RENDER_GIT_COMMIT`. No manual setup required.

### concert-crawl-crawler-triggers and concert-crawl-crawler-daily

Both crawler cron jobs need the same set of variables. Set them on each service separately in the Render dashboard.

| Variable             | Value                                                              |
| -------------------- | ------------------------------------------------------------------ |
| `DATABASE_URL`       | Auto-set via `fromDatabase` in render.yaml — verify it's populated |
| `ANTHROPIC_API_KEY`  | From Anthropic console                                             |
| `RESEND_API_KEY`     | From Step 3                                                        |
| `ADMIN_EMAIL`        | Your email address for crawl failure notifications                 |
| `SENTRY_DSN`         | Crawler project DSN from Step 3                                    |
| `SENTRY_ENVIRONMENT` | `production`                                                       |
| `LOG_LEVEL`          | `info`                                                             |
| `NODE_ENV`           | `production`                                                       |

> `CRAWL_MODE` and `ADMIN_URL` are hardcoded in `render.yaml` — do not override them.

### Staging API and web — verify these are set

The staging services need their own values for all the above variables, using staging Clerk keys (`pk_test_` / `sk_test_`), the staging Stripe webhook signing secret from Step 3, and `SENTRY_ENVIRONMENT=staging`.

---

## Step 5 — Configure GitHub Environment Secrets and Variables

The GitHub Actions workflows use environment-scoped secrets and variables. These must be set before automated deploys can run.

Go to the repository on GitHub → **Settings** → **Environments**.

### `staging` environment — Secrets

| Secret                   | Value                                                                             |
| ------------------------ | --------------------------------------------------------------------------------- |
| `RENDER_DEPLOY_HOOK_API` | Render → `concert-crawl-api-staging` → Settings → Deploy Hook → generate and copy |
| `RENDER_DEPLOY_HOOK_WEB` | Render → `concert-crawl-web-staging` → Settings → Deploy Hook → generate and copy |
| `DATABASE_URL`           | Staging DB connection string — for future crawler/migration GHA jobs              |
| `SENTRY_DSN`             | Staging Sentry project DSN — for future observability GHA jobs                    |

### `staging` environment — Variables

| Variable             | Value     |
| -------------------- | --------- |
| `SENTRY_ENVIRONMENT` | `staging` |
| `LOG_LEVEL`          | `info`    |

### `production` environment — Secrets

| Secret                   | Value                                                                                                                                          |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`           | Production DB connection string (from Render Postgres dashboard)                                                                               |
| `SENTRY_DSN`             | Crawler project DSN from Step 3                                                                                                                |
| `RENDER_DEPLOY_HOOK_API` | Render → `concert-crawl-api` → Settings → Deploy Hook → generate and copy _(needed once `deploy-production.yml` is built — pre-provision now)_ |
| `RENDER_DEPLOY_HOOK_WEB` | Render → `concert-crawl-web` → Settings → Deploy Hook → generate and copy _(same)_                                                             |

### `production` environment — Variables

| Variable             | Value                                                                       |
| -------------------- | --------------------------------------------------------------------------- |
| `SENTRY_ENVIRONMENT` | `production`                                                                |
| `LOG_LEVEL`          | `info`                                                                      |
| `ADMIN_EMAIL`        | Pre-provisioned for future crawler GHA jobs — no current workflow uses this |

### Repository-level secrets (Settings → Secrets → Actions)

| Secret                   | Value                                                                                                                                                                                                                                                              |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `GH_TOKEN`               | Personal access token with `repo` scope — used by `release.yml` (semantic-release) to push the release commit back to `main`. Required before branch protection is enabled. Generate at GitHub → Settings → Developer Settings → Personal access tokens (classic). |
| `SENTRY_DSN_SMOKE`       | Sentry DSN for smoke test error reporting                                                                                                                                                                                                                          |
| `E2E_TEST_USER_EMAIL`    | Email of the test Clerk user for staging E2E runs                                                                                                                                                                                                                  |
| `E2E_TEST_USER_PASSWORD` | Password of the test Clerk user for staging E2E runs                                                                                                                                                                                                               |
| `ANTHROPIC_API_KEY`      | Pre-provisioned for future crawler GHA jobs — no current workflow uses this                                                                                                                                                                                        |
| `RESEND_API_KEY`         | Pre-provisioned for future crawler GHA jobs — no current workflow uses this                                                                                                                                                                                        |

### Repository-level variables (Settings → Variables → Actions)

| Variable        | Value                                                                       |
| --------------- | --------------------------------------------------------------------------- |
| `SMOKE_ENABLED` | `false` — set to `true` only at public launch, not during private beta      |
| `PROD_URL`      | `https://concertcrawl.app`                                                  |
| `PROD_API_URL`  | `https://concert-crawl-api.onrender.com`                                    |
| `STAGING_URL`   | `https://concert-crawl-web-staging.onrender.com`                            |
| `ADMIN_EMAIL`   | Pre-provisioned for future crawler GHA jobs — no current workflow uses this |

### Auto-Deploy setting

In the Render dashboard, verify **Auto-Deploy → No** on all four web services (`concert-crawl-api`, `concert-crawl-web`, `concert-crawl-api-staging`, `concert-crawl-web-staging`). GitHub Actions (`deploy-staging.yml`) is the deploy trigger for staging. Production deploys are manual (Render dashboard) until `deploy-production.yml` is built.

The staging crawler cron jobs should also have **Auto-Deploy → No** — they run on their schedule, not on every commit.

---

## Step 6 — Enable Branch Protection and Environment Protection

These must be in place before any traffic reaches production.

### Branch protection on `main`

1. GitHub → repository → **Settings** → **Branches** → **Add branch protection rule**
2. Branch name pattern: `main`
3. Enable:
   - **Require a pull request before merging** (1 required approval)
   - **Require status checks to pass before merging** → add all of:
     - `Security audit`
     - `Typecheck`
     - `Lint`
     - `Test`
     - `Build`
     - `Integration Tests`
   - **Require branches to be up to date before merging**
   - **Do not allow bypassing the above settings** (applies to admins too)
4. Save

> `release.yml` pushes a release commit back to `main` via `GH_TOKEN`. This commit uses `[skip ci]` in its message and is authored by `github-actions[bot]`. The branch protection rule must allow this bot to push — in GitHub's branch protection settings there is an "Allow specified actors to bypass required pull requests" field; add `github-actions[bot]` there if the release workflow starts failing after protection is enabled.

### `production` environment protection

1. GitHub → **Settings** → **Environments** → `production`
2. Enable **Required reviewers** → add yourself
3. Under **Deployment branches**, select **Selected branches** → add `main`

This ensures no workflow can deploy to production without your approval, and only `main` can target the production environment.

---

## Step 7 — Run Database Migrations (Production)

Migrations do **not** run automatically on production deploys. The staging API service is configured to run `pnpm db:migrate` in its build command (set manually in the Render dashboard — `render.yaml` does not currently include this). Run production migrations manually before the first deploy and before any deploy that includes schema changes.

```bash
# From your local machine — uses the production connection string
DATABASE_URL=<prod-connection-string> pnpm db:migrate
```

Get the production connection string from Render → `concert-crawl-db` → **Info** → **External Connection String**.

> **Expand/contract discipline:** always run the expand migration before deploying new code that depends on it. Never run a destructive (contract) migration in the same deploy as the code change. See `docs/runbooks/db-rollback.md` for rollback steps.

---

## Step 8 — Seed the Production Database and Set Up Admin

1. **Seed venues:**

   ```bash
   DATABASE_URL=<prod-connection-string> pnpm db:seed
   ```

   Verify venue records appear at `https://concert-crawl-api.onrender.com/v1/venues`.

2. **Create the admin user:**
   - Sign up at `https://concertcrawl.app` with your account
   - Go to Clerk dashboard → **Users** → find your account
   - Under **Public Metadata**, set:
     ```json
     { "role": "admin" }
     ```
   - Sign out and back in so the role is reflected in the JWT

3. **Seed the FounderNote:**
   The onboarding step 1 message is stored in the `app_config` table (key: `founder_note`). Set it via the admin panel at `https://concertcrawl.app/admin/config`, or directly via the API once the admin user is set up.

---

## Step 9 — Generate Beta Invite Codes

Before opening the beta, generate invite codes for your initial cohort.

1. Sign in as admin at `https://concertcrawl.app`
2. Go to `/admin/invite-codes` → generate codes for each beta user
3. Send codes to your invitees — the invite gate at sign-up will require a valid code

---

## Step 10 — Deploy and Verify

1. Run migrations if any are pending (Step 7)
2. Trigger a manual deploy for both **concert-crawl-api** and **concert-crawl-web** in the Render dashboard
3. Wait for deploys to complete (watch the deploy logs)
4. Verify API health:
   ```bash
   curl https://concert-crawl-api.onrender.com/v1/health
   ```
   Expect `200 OK`.
5. Verify CORS:
   ```bash
   curl -I -X OPTIONS https://concert-crawl-api.onrender.com/v1/admin/venues \
     -H "Origin: https://concertcrawl.app"
   ```
   Response must include `access-control-allow-origin: https://concertcrawl.app`. If missing, check `ALLOWED_ORIGIN` on `concert-crawl-api`.
6. Open `https://concertcrawl.app` — verify the app loads, sign-up works, and the invite gate fires
7. Sign in as admin and verify `/admin` dashboard is accessible

---

## Step 11 — Enable the Production Crawler

The daily crawler runs as two Render Cron Jobs and is always-on once deployed. Suspend them in the Render dashboard if you need to pause crawling.

**Do not proceed until:**

- At least one successful staging crawl run has completed (verify in Render dashboard → `concert-crawl-crawler-daily-staging` → **Logs**)
- Production DB has venue records seeded (Step 8)
- Step 10 passes (API healthy, app loads)

**To verify the Render cron jobs are running:**

1. Render dashboard → `concert-crawl-crawler-triggers` → **Logs** — look for successful runs every 10 minutes
2. Render dashboard → `concert-crawl-crawler-daily` → **Logs** — look for a successful 3 AM MT run

**To trigger the daily crawl manually:**

Render dashboard → `concert-crawl-crawler-daily` → **Triggers** → **Trigger deploy**.

---

## Step 12 — Automate Production Deploys (Before Public Launch)

> This step is **not required for private beta** — manual Render deploys are sufficient. Complete it before public launch.

A `deploy-production.yml` workflow is needed to automate production deploys. The design:

- **Trigger:** `release: published` — fires when `release.yml` creates a GitHub Release after a releasable merge to `main`
- **Jobs:** `deploy-api` → `deploy-web` (sequential; production environment requires reviewer approval — see Step 6)
- **Secrets:** `RENDER_DEPLOY_HOOK_API` and `RENDER_DEPLOY_HOOK_WEB` from the `production` GH environment (pre-provisioned in Step 5)
- **Concurrency:** serialize with `cancel-in-progress: false`, same pattern as `deploy-staging.yml`

Until this workflow exists, the manual production deploy process is:

1. Confirm the GitHub Release was created (check the **Releases** tab)
2. Run pending migrations if any (Step 7)
3. Render dashboard → `concert-crawl-api` → **Manual Deploy** → latest commit → wait for success
4. Verify `/v1/health` returns `200`
5. Render dashboard → `concert-crawl-web` → **Manual Deploy** → latest commit → wait for success
6. Verify the app loads at `https://concertcrawl.app`

---

## Step 13 — Enable Production Smoke Tests (At Public Launch)

Smoke tests run every 6 hours but are gated by `SMOKE_ENABLED`. Enable this only at public launch, not during private beta.

1. Go to the repository → **Settings** → **Variables** (repository-level)
2. Update `SMOKE_ENABLED` to `true`
3. Verify the next scheduled run succeeds: **Actions** → **Production Smoke Tests**

---

## Step 14 — Flip `REQUIRE_BETA_AUTH` at Public Launch

When transitioning from private beta to public launch, the auth gate on public routes must be removed:

1. Render dashboard → `concert-crawl-api` → **Environment**
2. Remove the `REQUIRE_BETA_AUTH` variable (or set it to `false`)
3. Trigger a manual redeploy of `concert-crawl-api`
4. Verify browse, search, and venue pages are accessible without signing in

---

## Rollback

If a deploy breaks production:

1. Render dashboard → service → **Deploys** tab → select the last working deploy → **Rollback**
2. For DB issues, see `docs/runbooks/db-rollback.md`

---

## Notes

- `DATABASE_URL` is injected automatically by Render via the `fromDatabase` reference in `render.yaml` — do not set it manually on Render services
- `NEXT_PUBLIC_APP_VERSION` is injected at build time: version prefix from root `package.json` (auto-bumped by `semantic-release`), commit hash suffix from `RENDER_GIT_COMMIT` — no manual setup needed
- Keep all `sk_live_*` keys out of git — Render dashboard and GitHub secrets only
- Staging uses the same `render.yaml` structure with separate Clerk dev keys (`pk_test_` / `sk_test_`) and a separate staging DB
- After a role change in Clerk, the user must sign out and back in before the API sees the new role (JWT reissue)
- `SENTRY_DSN_CRAWLER` exists as a repo-level GitHub secret but is not referenced by any current workflow — remove it from GitHub repository secrets to avoid confusion, or wire it up when a crawler-specific GHA workflow is added
