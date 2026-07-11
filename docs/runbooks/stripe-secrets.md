# Stripe Secrets — Placement + Rotation Runbook

Source of truth: monetization eng infra spec Part 2 §9 (env-var matrix) and
§10 (CI + secret handling). This runbook covers the three Stripe secrets:
where each lives, how to rotate each, and the test-vs-live rules.

## Where each secret lives

| Secret                               | Where it is set                              | Staging value                         | Prod value                            |
| ------------------------------------ | -------------------------------------------- | ------------------------------------- | ------------------------------------- |
| `STRIPE_SECRET_KEY`                  | Render API service + billing cron (env vars) | test-mode key (`sk_test_…`)           | live-mode key (`sk_live_…`)           |
| `STRIPE_WEBHOOK_SECRET`              | Render API service (env var)                 | test-mode endpoint secret (`whsec_…`) | live-mode endpoint secret (`whsec_…`) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Vercel web project (env var)                 | test-mode key (`pk_test_…`)           | live-mode key (`pk_live_…`)           |

- **GitHub Actions has NO Stripe keys.** CI tests use a dummy key with the
  SDK stubbed at the dependency-injected client boundary; webhook signature
  tests sign with `stripe.webhooks.generateTestHeaderString` (spec §10).
- Local dev: `apps/api/.env.local` (never committed). Get a local webhook
  secret from `stripe listen --print-secret`.

## Test vs live — never mixed

Staging is test-mode end-to-end; prod is live-mode end-to-end. A single
environment must never hold a mix (e.g. a live secret key with a test
webhook secret): checkout would succeed while webhooks silently fail
signature verification. `scripts/stripe-provision.ts` enforces the key/mode
pairing via `--mode test | live` against the key prefix, and webhook
endpoints are registered separately per mode.

## Rotating `STRIPE_WEBHOOK_SECRET`

Stripe lets you roll an endpoint's signing secret with a grace window during
which BOTH the old and new secrets' signatures are delivered (dual-delivery),
so rotation is zero-downtime:

1. Stripe Dashboard → Developers → Webhooks → select the endpoint
   (`https://<api-host>/v1/webhooks/stripe`) → **Roll secret**. Choose a
   grace window (e.g. 24h) — Stripe signs with both secrets until it ends.
2. Copy the NEW `whsec_…` value (shown once).
3. Render Dashboard → API service → Environment → update
   `STRIPE_WEBHOOK_SECRET` → save.
4. Redeploy the API service (Builds → Manual Deploy) so the new value is
   picked up.
5. Verify: Stripe Dashboard → the endpoint's recent deliveries show 2xx
   responses after the deploy. A 400 spike means the env var didn't land —
   the old secret is still valid inside the grace window, so re-check step 3
   and redeploy.

Repeat per environment (staging test-mode endpoint, prod live-mode endpoint)
— each endpoint has its own secret.

## Rotating `STRIPE_SECRET_KEY`

Create the replacement BEFORE revoking the old key so API calls never gap:

1. Stripe Dashboard → Developers → API keys → **Create restricted key** (or
   roll the standard key if a restricted key isn't in use yet). Prefer a
   restricted key scoped to what the API actually uses: Customers,
   Subscriptions, Prices, Billing Portal, Webhook Endpoints, PaymentIntents
   (read).
2. Render Dashboard → API service AND billing cron → Environment → update
   `STRIPE_SECRET_KEY` → save → redeploy each service.
3. Verify checkout works (staging: run a test-mode checkout; prod: watch
   Sentry + Stripe request logs for auth errors).
4. Stripe Dashboard → revoke/delete the old key.

## Rotating `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

Publishable keys are not secret (they ship in the browser bundle), but they
are rolled together with the secret key when a full credential reset is
needed:

1. Stripe Dashboard → Developers → API keys → roll the publishable key.
2. Vercel Dashboard → web project → Settings → Environment Variables →
   update `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` for the affected environment.
3. Redeploy the web project (`NEXT_PUBLIC_` vars are baked at build time —
   an env change without a redeploy does nothing).
4. Verify the payment element mounts on the checkout surface.

## Registering webhook endpoints (initial setup, not rotation)

Endpoint registration is scripted and idempotent:

```bash
# Staging (test mode):
STRIPE_SECRET_KEY=$STAGING_STRIPE_KEY tsx scripts/stripe-provision.ts \
  --mode test --webhooks https://<staging-api-host>/v1/webhooks/stripe --commit

# Prod (live mode):
STRIPE_SECRET_KEY=$PROD_STRIPE_KEY tsx scripts/stripe-provision.ts \
  --mode live --webhooks https://<prod-api-host>/v1/webhooks/stripe --commit
```

The script prints the signing secret ONCE on creation — place it as
`STRIPE_WEBHOOK_SECRET` on the Render API service immediately (it is not
retrievable from the script later; the dashboard can reveal it if lost).
Re-running against an existing URL is a logged no-op and warns if the
endpoint's `enabled_events` drifted from the handled set.
