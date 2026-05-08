# Production Launch Runbook

Steps to bring the production environment fully online. Complete these in order — later steps depend on earlier ones.

---

## Prerequisites

- Staging environment is healthy and Phase 2+ has been validated there
- Access to: Cloudflare dashboard, Clerk dashboard, Render dashboard, Stripe dashboard, Resend dashboard, Sentry

---

## Step 1 — Create Clerk Production Instance

1. Go to [clerk.com](https://clerk.com) → switch to the **Production** instance (or create one)
2. Under **Domains**, add `concertcrawl.app` as the production domain
3. Configure OAuth providers (Spotify, etc.) using production credentials
4. Copy the following values — you'll need them in Step 4:
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

1. Create a **concert-crawl-api** project in Sentry → copy DSN
2. Create a **concert-crawl-web** project in Sentry → copy DSN

---

## Step 4 — Set Environment Variables in Render (Production)

Go to each service in the Render dashboard → **Environment** tab.

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

### concert-crawl-web

| Variable                              | Value                                    |
| ------------------------------------- | ---------------------------------------- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`   | `pk_live_...` from Step 1                |
| `CLERK_SECRET_KEY`                    | `sk_live_...` from Step 1                |
| `NEXT_PUBLIC_API_URL`                 | `https://concert-crawl-api.onrender.com` |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL`       | `/sign-in`                               |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL`       | `/sign-up`                               |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` | `/events`                                |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` | `/events`                                |
| `SENTRY_DSN`                          | Web project DSN from Step 3              |

---

## Step 5 — Deploy and Verify

1. Trigger a manual deploy for both **concert-crawl-api** and **concert-crawl-web** in the Render dashboard
2. Wait for deploys to complete (watch the deploy logs)
3. Verify API health: `curl https://concert-crawl-api.onrender.com/v1/health` → expect `200 OK`
4. Verify CORS: `curl -I -X OPTIONS https://concert-crawl-api.onrender.com/v1/admin/venues -H "Origin: https://concertcrawl.app"` → response must include `access-control-allow-origin: https://concertcrawl.app`. If missing, check that `ALLOWED_ORIGIN=https://concertcrawl.app` is set on the **concert-crawl-api** service.
5. Open `https://concertcrawl.app` in a browser — verify the app loads and auth works
6. Run the production smoke tests: `pnpm test:smoke` (Playwright, configured in Phase 3+)

---

## Step 6 — Enable the Production Crawler

The daily crawler is gated by `CRAWL_ENABLED` in the GitHub `production` environment. It is set to `false` by default and must be explicitly enabled when you are ready for live crawls.

**Do not enable until:**

- At least one successful staging crawl run has completed (verify in Actions tab)
- Production DB has venue records seeded
- Step 5 above passes (API healthy, app loads)

**To enable:**

1. Go to the repository on GitHub → **Settings** → **Environments** → `production`
2. Under **Environment variables**, find `CRAWL_ENABLED`
3. Change the value from `false` to `true` and save
4. The crawler will run at the next scheduled trigger (3 AM MT), or trigger it manually via **Actions** → **Daily Crawler (Production)** → **Run workflow**

---

## Rollback

If a deploy breaks production:

1. In Render dashboard → service → **Deploys** tab → select the last working deploy → **Rollback**
2. For DB issues, see `docs/runbooks/db-rollback.md`

---

## Notes

- `DATABASE_URL` is injected automatically by Render via the `fromDatabase` reference in `render.yaml` — do not set it manually
- Keep all `sk_live_*` keys out of git — Render dashboard only
- Staging uses the same `render.yaml` structure but with separate Clerk dev keys and staging DB
