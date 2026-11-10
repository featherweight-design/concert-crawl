# Stripe Secrets — Placement + Rotation Runbook

> **Going free (2026-11-10).** Checkout, the billing portal and the Stripe
> webhook route were deleted. Only account deletion still calls Stripe (to
> cancel any subscription row still chargeable), and it skips that when
> `STRIPE_SECRET_KEY` is unset. The webhook steps below are historical:
> `stripe-provision.ts --webhooks` now refuses to run. **Hugh:** delete the
> Stripe webhook endpoints (live and test) in the dashboard.

Source of truth: monetization eng infra spec Part 2 §9 (env-var matrix) and
§10 (CI + secret handling). This runbook covers the three Stripe secrets:
where each lives, how to rotate each, and the test-vs-live rules.

## Where each secret lives

| Secret                               | Where it is set              | Staging value                         | Prod value                            |
| ------------------------------------ | ---------------------------- | ------------------------------------- | ------------------------------------- |
| `STRIPE_SECRET_KEY`                  | API service (env var)        | test-mode key (`sk_test_…`)           | live-mode key (`sk_live_…`)           |
| `STRIPE_WEBHOOK_SECRET`              | Render API service (env var) | test-mode endpoint secret (`whsec_…`) | live-mode endpoint secret (`whsec_…`) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Vercel web project (env var) | test-mode key (`pk_test_…`)           | live-mode key (`pk_live_…`)           |

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

Retired 2026-11-10: the webhook route is deleted; delete the endpoints in the Stripe dashboard.

## Rotating `STRIPE_SECRET_KEY`

Create the replacement BEFORE revoking the old key so API calls never gap:

1. Stripe Dashboard → Developers → API keys → **Create restricted key** (or
   roll the standard key if a restricted key isn't in use yet). Prefer a
   restricted key scoped to what the API actually uses: Customers,
   Subscriptions, Prices, Billing Portal, Webhook Endpoints, PaymentIntents
   (read).
2. Update `STRIPE_SECRET_KEY` on the API service → save → redeploy it.
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

Retired 2026-11-10: the webhook route is deleted; delete the endpoints in the Stripe dashboard.
