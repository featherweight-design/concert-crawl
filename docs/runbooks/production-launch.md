# Production Launch Runbook

Steps to bring the production environment fully online. Complete these in order — later steps depend on earlier ones.

---

## Prerequisites

- Staging environment is healthy and all pre-beta checklist items are validated there
- Access to: Cloudflare dashboard, Clerk dashboard, Render dashboard, Stripe dashboard, Resend dashboard, Sentry, GitHub repository settings

---

## Step 1 — Create Clerk Production Instance

1. Go to [clerk.com](https://clerk.com) → switch to the **Production** instance (or create one)
2. Under **Domains**, add `concertcrawl.app` as the production domain
3. Configure OAuth providers (Spotify) using production credentials
4. **Configure the JWT session token template** — this is required for API role-based auth:
   - Go to **Sessions** → **Customize session token**
   - Add the following to the token claims:
     ```json
     { "metadata": "{{user.public_metadata}}" }
     ```
   - Without this, `requireRole()` in the API will always return 403
5. Copy the following values — you'll need them in Step 4:
   - **Publishable Key** (`pk_live_...`)
   - **Secret Key** (`sk_live_...`)

---

## Step 2 — Point DNS to Render

1. Go to Cloudflare dashboard → `concertcrawl.app` zone
2. Add a **CNAME** record:
   - Name: `@` (or `www`)
   - Target: `concert-crawl-web.onrender.com`
   - Proxy: **DNS only** (grey cloud) initially — enable proxy after verifying
3. Verify in Render dashboard: **concert-crawl-web** → Settings → Custom Domain → add `concertcrawl.app`
4. Wait for SSL cert provisioning (usually < 5 minutes on Render)

---

## Step 3 — Provision Third-Party Services

### Stripe

1. Switch Stripe account to **Live** mode
2. Copy live **Secret Key** (`sk_live_...`)
3. Set up a webhook endpoint pointing to `https://concert-crawl-api.onrender.com/v1/webhooks/stripe`
4. Copy the **Webhook Signing Secret**

### Resend

1. Verify the `concertcrawl.app` domain in Resend (add DNS TXT record via Cloudflare)
2. Copy the **API Key**

### Sentry

Create three projects — one per app. The crawler projects may share the same DSN as the API or have their own; a single shared DSN is fine.

1. Create a **concert-crawl-api** project in Sentry → copy DSN
2. Create a **concert-crawl-web** project in Sentry → copy DSN
3. Create a **concert-crawl-crawler** project (or reuse the API DSN) → copy DSN
4. For the web project, generate a **SENTRY_AUTH_TOKEN** (Organization Settings → Auth Tokens) for source map uploads at build time

---

## Step 4 — Set Environment Variables in Render (Production)

Go to each service in the Render dashboard → **Environment** tab. `DATABASE_URL` is auto-injected via the `fromDatabase` reference in `render.yaml` — verify it is populated but do not override it manually.

### concert-crawl-api

| Variable                | Value                                                              |
| ----------------------- | ------------------------------------------------------------------ |
| `DATABASE_URL`          | Auto-set via `fromDatabase` in render.yaml — verify it's populated |
| `CLERK_SECRET_KEY`      | `sk_live_...` from Step 1                                          |
| `ALLOWED_ORIGIN`        | `https://concertcrawl.app`                                         |
| `ANTHROPIC_API_KEY`     | From Anthropic console                                             |
| `STRIPE_SECRET_KEY`     | `sk_live_...` from Step 3                                          |
| `STRIPE_WEBHOOK_SECRET` | From Step 3                                                        |
| `RESEND_API_KEY`        | From Step 3                                                        |
| `SENTRY_DSN`            | API project DSN from Step 3                                        |
| `SENTRY_ENVIRONMENT`    | `production`                                                       |
| `TICKETMASTER_API_KEY`  | From Ticketmaster developer portal (price pipeline)                |
| `LOG_LEVEL`             | `info`                                                             |
| `NODE_ENV`              | `production`                                                       |

### concert-crawl-web

| Variable                              | Value                                                         |
| ------------------------------------- | ------------------------------------------------------------- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`   | `pk_live_...` from Step 1                                     |
| `CLERK_SECRET_KEY`                    | `sk_live_...` from Step 1                                     |
| `NEXT_PUBLIC_API_URL`                 | `https://concert-crawl-api.onrender.com`                      |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL`       | `/sign-in`                                                    |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL`       | `/sign-up`                                                    |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` | `/events`                                                     |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` | `/auth/complete`                                              |
| `INVITE_COOKIE_SECRET`                | Generate: `openssl rand -hex 32` — gates the invite code wall |
| `SENTRY_DSN`                          | Web project DSN from Step 3                                   |
| `NEXT_PUBLIC_SENTRY_DSN`              | Same as `SENTRY_DSN`                                          |
| `SENTRY_ENVIRONMENT`                  | `production`                                                  |
| `NEXT_PUBLIC_SENTRY_ENVIRONMENT`      | `production`                                                  |
| `SENTRY_AUTH_TOKEN`                   | Auth token from Step 3 (source map uploads)                   |
| `NODE_ENV`                            | `production`                                                  |

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

---

## Step 5 — Configure GitHub Environment Secrets and Variables

The GitHub Actions workflows use environment-scoped secrets and variables. These must be set before automated deploys and crawls can run.

Go to the repository on GitHub → **Settings** → **Environments**.

### `production` environment — Secrets

| Secret                   | Value                                                                         |
| ------------------------ | ----------------------------------------------------------------------------- |
| `RENDER_DEPLOY_HOOK_API` | Render → `concert-crawl-api` → Settings → Deploy Hook → generate and copy URL |
| `RENDER_DEPLOY_HOOK_WEB` | Render → `concert-crawl-web` → Settings → Deploy Hook → generate and copy URL |
| `DATABASE_URL`           | Production DB connection string (from Render Postgres dashboard)              |
| `ANTHROPIC_API_KEY`      | Same value as in Render env vars above                                        |
| `RESEND_API_KEY`         | Same value as in Render env vars above                                        |
| `SENTRY_DSN`             | Crawler project DSN from Step 3                                               |

### `production` environment — Variables (not secrets)

| Variable        | Value                                              |
| --------------- | -------------------------------------------------- |
| `CRAWL_ENABLED` | `false` initially — see Step 9 for when to enable  |
| `ADMIN_EMAIL`   | Your email address for crawl failure notifications |

### `staging` environment — Variables

| Variable        | Value  |
| --------------- | ------ |
| `CRAWL_ENABLED` | `true` |

### Repository-level variables (Settings → Variables, not environment-scoped)

These are used by the smoke test workflow, which has no environment scope.

| Variable        | Value                                       |
| --------------- | ------------------------------------------- |
| `SMOKE_ENABLED` | `false` initially — set to `true` at launch |
| `PROD_URL`      | `https://concertcrawl.app`                  |
| `PROD_API_URL`  | `https://concert-crawl-api.onrender.com`    |

### Repository-level secrets

| Secret             | Value                                                                |
| ------------------ | -------------------------------------------------------------------- |
| `SENTRY_DSN_SMOKE` | Sentry DSN for smoke test error reporting (API or dedicated project) |

3. In the Render dashboard, set **Auto-Deploy → No** on `concert-crawl-api` and `concert-crawl-web` — GitHub Actions (`deploy-staging.yml`) is the deploy trigger. The crawler cron jobs are always-on via Render's native scheduler and do not use deploy hooks.

> A `deploy-production.yml` workflow triggered on the `release: published` GitHub event is needed to automate production deploys. Each merge to `main` that contains a releasable commit (`feat:` or `fix:`) automatically creates a GitHub Release via `release.yml`. Until `deploy-production.yml` exists, trigger production deploys manually from the Render dashboard after a release appears in the GitHub Releases tab.

---

## Step 6 — Seed the Production Database and Set Up Admin

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

## Step 7 — Generate Beta Invite Codes

Before opening the beta, generate invite codes for your initial cohort.

1. Sign in as admin at `https://concertcrawl.app`
2. Go to `/admin/invite-codes` → generate codes for each beta user
3. Send codes to your invitees — the invite gate at sign-up will require a valid code

---

## Step 8 — Deploy and Verify

1. Trigger a manual deploy for both **concert-crawl-api** and **concert-crawl-web** in the Render dashboard
2. Wait for deploys to complete (watch the deploy logs)
3. Verify API health:
   ```bash
   curl https://concert-crawl-api.onrender.com/v1/health
   ```
   Expect `200 OK`.
4. Verify CORS:
   ```bash
   curl -I -X OPTIONS https://concert-crawl-api.onrender.com/v1/admin/venues \
     -H "Origin: https://concertcrawl.app"
   ```
   Response must include `access-control-allow-origin: https://concertcrawl.app`. If missing, check `ALLOWED_ORIGIN` on `concert-crawl-api`.
5. Open `https://concertcrawl.app` — verify the app loads, sign-up works, and the invite gate fires
6. Sign in as admin and verify `/admin` dashboard is accessible

---

## Step 9 — Enable the Production Crawler

The GitHub Actions daily crawler is gated by `CRAWL_ENABLED` in the `production` environment (set to `false` in Step 5). The Render cron jobs run on their own schedule once deployed and are always-on — suspend them in the Render dashboard if you need to pause crawling.

**Do not enable until:**

- At least one successful staging crawl run has completed (verify in GitHub Actions tab)
- Production DB has venue records seeded (Step 6)
- Step 8 passes (API healthy, app loads)

**To enable the GitHub Actions crawler:**

1. Go to **Settings** → **Environments** → `production`
2. Under **Environment variables**, set `CRAWL_ENABLED` to `true`
3. The crawler will run at the next scheduled time (3 AM MT), or trigger manually via **Actions** → **Daily Crawler (Production)** → **Run workflow**

**To verify the Render cron jobs are running:**

1. Render dashboard → `concert-crawl-crawler-triggers` → **Logs** — look for successful runs every 10 minutes
2. Render dashboard → `concert-crawl-crawler-daily` → **Logs** — look for a successful 3 AM MT run

---

## Step 10 — Enable Production Smoke Tests (At Public Launch)

Smoke tests run every 6 hours but are gated by `SMOKE_ENABLED`. Enable this only at public launch, not during private beta.

1. Go to the repository → **Settings** → **Variables** (repository-level, not environment-scoped)
2. Set `SMOKE_ENABLED` to `true`
3. Verify the next scheduled run succeeds: **Actions** → **Production Smoke Tests**

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
- Staging uses the same `render.yaml` structure with separate Clerk dev keys and staging DB
- After a role change in Clerk, the user must sign out and back in before the API sees the new role (JWT reissue)
