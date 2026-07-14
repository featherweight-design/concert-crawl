# Monetization — Eng Infra Spec, Part 2: Stripe, Founder Window, Resend, Jobs, Analytics

**Status:** Draft for review
**Ticket:** [#775](https://github.com/HartiganHM/concert-crawl/issues/775) — Part 2 of 2
**Authored:** 2026-07-10
**Authors:** Hugh Hartigan, Claude
**Companion:** Part 1 (`2026-07-10-monetization-eng-infra-design-part-1.md`) — schema, `derivePlan`, entitlements. Read Part 1 first; its Decisions log (numbered 1–14) governs both files.

---

## 1. Stripe wiring

### 1.1 SDKs + versions

- `apps/api`: `stripe` (server SDK). `apps/web`: `@stripe/stripe-js` + `@stripe/react-stripe-js`.
- Install latest stable at implementation time; pin the API version explicitly in the Stripe client constructor (`apiVersion`) so dashboard-side version bumps never change behavior under us.

### 1.2 Products + prices — checked-in idempotent script

`scripts/stripe-provision.ts` (repo root `scripts/`, run with `tsx`), executed once per mode (`--mode test | live`, key from `STRIPE_SECRET_KEY` env — never pasted in chat):

| lookup_key          | Product                 | unit_amount (cents) | Interval |
| ------------------- | ----------------------- | ------------------- | -------- |
| `supporter_monthly` | Concert Crawl Supporter | **200**             | month    |
| `premium_monthly`   | Concert Crawl Premium   | **500**             | month    |
| `founder_monthly`   | Concert Crawl Founder   | **300**             | month    |

Amounts verified against #781's locked pricing (Supporter $2 / Premium $5 / Founder $3, all monthly). Idempotency: the script resolves each `lookup_key` first; if the price exists with matching amount/interval it no-ops, if it exists with a **different** amount it exits non-zero with a loud error (prices are immutable in Stripe — a mismatch means human investigation, not auto-fix), otherwise it creates product + price and transfers the `lookup_key`. Server code always resolves prices by `lookup_key`, never by hard-coded `price_…` IDs (IDs differ across test/live).

No trial configuration on any price — the 14-day trial is DB-side (Part 1, Decision 6).

### 1.3 Payment flow — embedded Payment Element (Decision 2)

```
Client                          API                                Stripe
  │  POST /v1/billing/checkout-session {tier}
  │ ────────────────────────────►│
  │                              │  (founder: atomic seat claim — §3.1)
  │                              │  ensure Stripe customer (create if absent,
  │                              │    store stripeCustomerId)
  │                              │  create subscription:
  │                              │    price by lookup_key,
  │                              │    payment_behavior: 'default_incomplete',
  │                              │    payment_settings.save_default_payment_method:
  │                              │      'on_subscription',
  │                              │    expand: latest_invoice.payment_intent
  │ ◄────────────────────────────│  { clientSecret, subscriptionId }
  │  <PaymentElement> confirm (stripe.confirmPayment, redirect: 'if_required')
  │ ──────────────────────────────────────────────────────────────►│
  │ ◄── success / error (decline surfaces §1.6) ────────────────────│
  │                              │ ◄── webhooks drive DB state (§1.5)
```

- **Upgrade/downgrade** (Supporter ↔ Premium) never creates a new subscription — `POST /v1/billing/change-tier` updates the existing subscription item's price (§1.4).
- **Trial conversion** is a normal checkout (`premium`); the user has no Stripe objects until this moment.
- **3DS/SCA:** `confirmPayment` mounts the challenge inside our #782 challenge-mount chrome; `redirect: 'if_required'` keeps non-redirect methods in-surface.
- **Abandon:** closing the surface calls `POST /v1/billing/checkout-abandon {subscriptionId}` (best-effort — cancels the incomplete subscription and, for founder, restores the seat §3.2). The webhook path covers clients that vanish without calling it.

### 1.4 Endpoint contracts (`apps/api`, all Zod-validated, all under `/v1/`)

| Endpoint                                  | Auth                            | Contract                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ----------------------------------------- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /v1/billing/checkout-session`       | Clerk (signed-in)               | Body `{ tier: 'supporter' \| 'premium' \| 'founder' }`. Founder gate (§3.3) runs FIRST: 403 `founder_window_not_open` / 410 `founder_window_closed` / 410 `founder_seats_exhausted`. Rejects if user already has an active/trialing/past_due subscription (409 — use change-tier), or is gifted (409). Returns `{ clientSecret, subscriptionId }`. Writes `subscription_events: checkout_started`                                                   |
| `POST /v1/billing/checkout-abandon`       | Clerk                           | Body `{ subscriptionId }`. Verifies ownership; cancels iff status `incomplete`; founder seat restore §3.2                                                                                                                                                                                                                                                                                                                                           |
| `POST /v1/billing/portal-session`         | Clerk                           | No body. Creates Stripe Billing-Portal session (`return_url` = `/settings/plan`), returns `{ url }`. Portal config (live + test) allows payment-method update, invoice history, billing email/tax — **not** cancel/plan-switch (those are in-app per #780 §1)                                                                                                                                                                                       |
| `POST /v1/billing/cancel`                 | Clerk                           | Sets `cancel_at_period_end: true` on the live subscription. Mirrors to DB immediately (webhook confirms). Writes `cancel_scheduled` event. #780 §3                                                                                                                                                                                                                                                                                                  |
| `POST /v1/billing/resubscribe`            | Clerk                           | Inside cancel-grace only: flips `cancel_at_period_end: false`. 409 otherwise                                                                                                                                                                                                                                                                                                                                                                        |
| `POST /v1/billing/change-tier`            | Clerk                           | Body `{ tier: 'supporter' \| 'premium' }` (founder is never a change-tier target — claim-only). Upgrade: `proration_behavior: 'always_invoice'` → immediate prorated charge, Premium unlocks now. Downgrade: immediate switch + `proration_behavior: 'create_prorations'` → credit to customer balance (Decision 8). Response includes the proration amount for the #780 disclosure line (preview via Stripe's upcoming-invoice API before confirm) |
| `GET /v1/billing/proration-preview?tier=` | Clerk                           | Read-only upcoming-invoice preview so the confirm surface can show "$X.XX" before the user commits                                                                                                                                                                                                                                                                                                                                                  |
| `GET /v1/billing/founder-window`          | **Public**                      | `{ state: 'pre-launch' \| 'open' \| 'closed', seatsRemaining, seatsTotal, closesAt }` for the scarcity rail. Cached 10s (in-process) — the rail polls; per-request DB reads are unnecessary. `seatsRemaining` omitted in `pre-launch`                                                                                                                                                                                                               |
| `POST /v1/webhooks/stripe`                | **Stripe signature** (no Clerk) | §1.5                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `POST /v1/billing/nudges/dismiss`         | Clerk                           | Body `{ nudge: 'day13' \| 'past-due' }` → sets the matching `user_billing` timestamp (Part 1 §3 predicates)                                                                                                                                                                                                                                                                                                                                         |
| `DELETE /v1/users/me`                     | Clerk                           | Existing route grows the subscription branch: active sub ⇒ `subscriptions.cancel` (immediate, no proration credit) → `customers.del` → Clerk delete → DB cascade. Gifted ⇒ revoke `gifted_comps` + Clerk metadata, no Stripe calls. #780 §7                                                                                                                                                                                                         |

Session-bootstrap payload additions (existing `GET /v1/users/me`): full `PlanState` (Part 1) + evaluated nudge flags (`showTrialEndedTakeover`, `showDayThirteenBanner`, `showPastDueBanner`) + `founderWindow` snapshot. Server evaluates predicates; client renders (§6).

### 1.5 Webhook handler

`POST /v1/webhooks/stripe` mounts **before** any body-parsing middleware — signature verification (`stripe.webhooks.constructEvent`) requires the raw body (Hono: `await ctx.req.text()`). No Clerk middleware, no audit-log middleware (not user-initiated). Idempotency per Decision 4 (`processed_stripe_events` insert-first). Always 200 on handled + duplicate; 400 on bad signature; 500 only on genuine processing failure (Stripe retries).

| Event                                          | Handling                                                                                                                                                                                                                                                                                                                                                                                                      |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `checkout.session.completed`                   | Not used — no hosted Checkout in this architecture (Decision 2). Registered defensively as a logged no-op                                                                                                                                                                                                                                                                                                     |
| `invoice.payment_succeeded`                    | Upsert subscription row (tier from price lookup_key, `status`, period start/end). First invoice (`billing_reason: 'subscription_create'`): `subscription_created` event + `welcome_paid` email (founder variant carries seat number from subscription metadata). Renewals: `renewal_succeeded` event + `renewal_receipt_monthly` email. Clears `premiumDataExpiresAt` on re-upgrade (#780 §5)                 |
| `invoice.payment_failed`                       | `payment_failed` event (+ `past_due_entered` on first). Status → `past_due`. Dunning email by `attempt_count`: 1 → `dunning_1_card_declined`, 2 → `dunning_2_still_declined`, ≥3 → `dunning_3_final_warning` (Decision 11; Smart Retries configured to 2 retries ≈ day 3–4 + day 7). Incomplete first invoices (subscription never activated): no dunning — the in-surface #782 decline flow owns that moment |
| `customer.subscription.updated`                | Mirror `status`, `cancel_at_period_end`, price/tier, period bounds. `incomplete_expired`: founder seat restore §3.2. `cancel_at_period_end` flips: true → `cancel_scheduled` event + `cancellation_ack` email (fires at cancel time per #783 — covers in-app AND portal cancels; skipped when the flip came from account-deletion, flagged via subscription metadata); false → `resubscribed` event           |
| `customer.subscription.deleted`                | Status → `cancelled`, `cancel_completed` event (no email — `cancellation_ack` already fired at cancel-schedule time, see `customer.subscription.updated`), set `premiumDataExpiresAt = now + 90d` for premium-and-up tiers (#780 §5), founder seat restore if subscription never had a paid invoice (§3.2)                                                                                                    |
| `payment_intent.payment_failed`                | Log + `payment_failed` event with decline category (§1.6) for funnel analytics. No state change — the client surface owns the retry UX                                                                                                                                                                                                                                                                        |
| `customer.updated` / `payment_method.attached` | Refresh cached card metadata used by the card-expiry timer (§5.1)                                                                                                                                                                                                                                                                                                                                             |

Live-mode + test-mode endpoints are registered separately (one `STRIPE_WEBHOOK_SECRET` per mode, per environment — env-var matrix §9). Registration happens via a checked-in script (`scripts/stripe-provision.ts --webhooks`) targeting `https://<api-host>/v1/webhooks/stripe`.

### 1.6 `decline_code` → 5-category mapping (#782 §2)

Pure function in `packages/types`-adjacent shared lib (used by API for analytics + by web for surface routing):

```ts
export type DeclineCategory =
  | 'insufficient_funds'
  | 'expired_or_incorrect_card'
  | 'issuer_declined'
  | 'fraud_block'
  | 'network_timeout'
```

| Category                    | Mapped from                                                                                                                                                |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `insufficient_funds`        | `decline_code: insufficient_funds`                                                                                                                         |
| `expired_or_incorrect_card` | `expired_card`, `incorrect_cvc`, `incorrect_number`, `invalid_expiry_month`, `invalid_expiry_year` (+ Stripe validation-error `code`s of the same names)   |
| `fraud_block`               | `fraudulent`, `stolen_card`, `lost_card`, `pickup_card`, `restricted_card`                                                                                 |
| `network_timeout`           | No `decline_code`: `api_error` / `api_connection_error` types, HTTP 5xx, fetch/network failure, timeout                                                    |
| `issuer_declined`           | **Default for every other `decline_code`** (`do_not_honor`, `generic_decline`, `card_velocity_exceeded`, `currency_not_supported`, …) — catch-all per #782 |

The raw `decline_code` is never rendered; it flows into `subscription_events.metadata` + PostHog only.

### 1.7 SCA-region detection (#782 §6.1c)

The conditional "Your bank may ask to confirm this." line renders when the request's country header is in a constant `SCA_REGIONS` set (EEA members + UK) — Vercel provides `x-vercel-ip-country` on the web tier; the web layer resolves the boolean server-side and passes it to the payment surface as a prop. No IP handling in our code, no persistence. Unknown country ⇒ show the line (harmless, one sentence — fail-safe toward compliance).

## 2. (reserved — section merged into §1; numbering kept stable for review references)

## 3. Founder window mechanics

### 3.1 Atomic claim (inside `checkout-session` for `tier: 'founder'`)

Single-statement decrement via Drizzle (no raw SQL outside migrations):

```ts
const claimed = await db
  .update(founderWindow)
  .set({ seatsRemaining: sql`${founderWindow.seatsRemaining} - 1` })
  .where(
    and(
      gt(founderWindow.seatsRemaining, 0),
      isNotNull(founderWindow.opensAt),
      lte(founderWindow.opensAt, now),
      gt(founderWindow.closesAt, now),
    ),
  )
  .returning({ seatsRemaining: founderWindow.seatsRemaining })
```

The §3.3 gates run **before** this UPDATE, so window-not-open/closed cases are already rejected with their distinct error codes; an empty result here therefore means the seat race was lost (seats exhausted between gate check and decrement) ⇒ 410 `founder_seats_exhausted` (the #781 "Just missed it" surface). Non-empty ⇒ seat number = `seatsTotal - seatsRemaining` (e.g. 100 − 62 = seat #38), stamped into the Stripe subscription `metadata.founderSeatNumber` + the `founder_claimed` event. The claim happens **before** subscription creation; the seat is held by the `incomplete` subscription.

### 3.2 Seat restoration

Restore = increment `seatsRemaining` by 1, guarded `WHERE seats_remaining < seats_total`, write `founder_seat_restored` event. Fires on exactly these paths, each keyed to the claiming subscription (idempotent via a `seatRestoredAt` check in the subscription metadata mirror stored on `subscription_events` — a seat is restored at most once per claim):

1. `checkout-abandon` endpoint (user dismissed the surface).
2. `customer.subscription.updated` → `incomplete_expired` (Stripe auto-expires unconfirmed subscriptions after ~23h).
3. `customer.subscription.deleted` where the subscription never produced a paid invoice.

A paid-then-cancelled Founder does **not** restore a seat — seats are lifetime claims, not concurrent-subscriber counts.

### 3.3 Server-side gates

Evaluated inside `checkout-session` before any Stripe call (and mirrored in `GET /v1/billing/founder-window`):

| Condition                                      | Response                                                                                             |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `opensAt IS NULL`                              | 403 `founder_window_not_open` — **stays this way until launch day; flipping `opensAt` is Hugh-only** |
| `closesAt < now`                               | 410 `founder_window_closed`                                                                          |
| `seatsRemaining = 0` (or claim raced to empty) | 410 `founder_seats_exhausted`                                                                        |

### 3.4 Admin simulate-claim (pre-launch E2E)

`POST /v1/admin/founder-window/simulate-claim` (admin router: Clerk + `requireRole('admin')` + audit middleware). Runs the identical claim SQL against `seatsRemainingTest`, bypassing the `opensAt` gate. Never touches `seatsRemaining`, never creates Stripe objects. `POST …/simulate-reset` restores `seatsRemainingTest = seatsTotal`. Admin dashboard tile (execution-plan PR 6.1) reads both counters.

### 3.5 Launch-day flip

Out of scope for implementation here (execution-plan Phases 6–7 own the admin UI + runbook), but the contract is fixed: `UPDATE founder_window SET opens_at = NOW() WHERE id = 1` via the audited admin route; rollback is `opens_at = NULL`. `closesAt` derives automatically.

## 4. Resend email infrastructure (#849 fold-in)

### 4.1 Existing base + sender strategy

`resend` SDK is already installed in `apps/api`; `concertcrawl.app` already sends (`alerts@`, `noreply@`) — sender domain, DKIM/SPF/DMARC are live. Billing mail gets a dedicated address: **`billing@concertcrawl.app`**, display name "Concert Crawl" (reuses the verified domain; no new DNS). Reply-to: `support@concertcrawl.app` — a role address on the verified domain (forwards to Hugh's inbox via Cloudflare Email Routing; rotatable later without template changes), matching #782's contact-support direction.

### 4.2 Template module shape

`apps/api/src/emails/` — one module per template key exporting:

```ts
export interface RenderedEmail {
  subject: string
  preheader: string
  html: string
  text: string
}
export type TemplateRenderer<Vars> = (vars: Vars) => RenderedEmail
```

Plain TS string-template functions (table-based HTML, inline styles, single `<head>` media-query block, email-only palette constants in `apps/api/src/emails/palette.ts`) per #783 §5. No JSX email framework — 10 templates don't justify the dependency; revisit if the inventory triples. Copy strings live in the email modules themselves (server-side; the web `definitions/copy.ts` convention governs customer-facing **UI** strings — emails are API-side and version-controlled here).

### 4.3 Send pipeline

`sendTransactionalEmail({ templateKey, userId, dedupeKey, vars })` in `apps/api/src/lib/email.ts` (alongside the existing helpers):

1. Kill switch: look up the `email_template_config` row for **this** `templateKey`; if its `enabled = false` ⇒ log + record `suppressed` ⇒ return (the table is per-template, Part 1 schema).
2. Idempotency: insert `email_send_log` (`ON CONFLICT` on `templateKey+dedupeKey` ⇒ already sent ⇒ return).
3. Resolve recipient email from Clerk.
4. `resend.emails.send(...)` — failure logs the error (every catch logs) and updates the row to `failed`; a `failed` row's dedupe key blocks silent duplicates, and the daily job retries rows `failed` < 24h old (max 3 attempts, tracked in row metadata).

### 4.4 Trigger map (all 10 #783 templates)

| Template                                                                           | Trigger                                                                                    | Dedupe key                                                                           |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| `welcome_paid`                                                                     | `invoice.payment_succeeded`, `billing_reason: subscription_create`                         | `sub:{subscriptionId}`                                                               |
| `welcome_gifted`                                                                   | Admin gift-grant flow (gifted_comps insert)                                                | `gift:{giftId}`                                                                      |
| `renewal_receipt_monthly`                                                          | `invoice.payment_succeeded`, renewal reasons                                               | `invoice:{invoiceId}`                                                                |
| `dunning_1_card_declined` / `dunning_2_still_declined` / `dunning_3_final_warning` | `invoice.payment_failed` attempt_count 1 / 2 / ≥3 (§1.5 webhook table)                     | `invoice:{invoiceId}:attempt:{n}`                                                    |
| `card_expiring_soon`                                                               | Daily job §5.1 — 30/14/7 days before card expiry                                           | `{cardFingerprint}:{expMonth}-{expYear}:{window}`                                    |
| `cancellation_ack`                                                                 | `customer.subscription.updated` — `cancel_at_period_end` flips true (not account-deletion) | `sub:{subscriptionId}:{currentPeriodEnd}` (re-acks a later cancel after resubscribe) |
| `gifting_ending_notice`                                                            | Daily job — `gifted_comps.expiresAt` within 7 days                                         | `gift:{giftId}`                                                                      |
| `winback`                                                                          | Daily job — 60 days post-cancel (`cancel_completed` + no new sub)                          | `sub:{subscriptionId}`                                                               |

Winback day-60 is this spec's call (execution plan allowed 30–90); single-shot per subscription.

## 5. Timers + background jobs

### 5.1 The daily billing job

New Render Cron Job **`concert-crawl-billing-jobs`** (staging + prod), daily 9 AM MT, running `apps/api`'s compiled `node apps/api/dist/jobs/billing-daily.js` (same deploy artifact as the API — no new package; matches `render.yaml` and the launch runbook). Env: `DATABASE_URL`, `STRIPE_SECRET_KEY`, `RESEND_API_KEY`, `CLERK_SECRET_KEY`. Each sub-task is independently wrapped in try/catch + logged; one failure never blocks the rest:

1. **Card-expiry warnings** — iterate active subscriptions' default payment methods (cached card metadata refreshed by webhooks; fallback: Stripe list call), fire `card_expiring_soon` at the 30/14/7-day windows.
2. **Gift-ending notices** — `gifted_comps.expiresAt` within 7 days ⇒ `gifting_ending_notice`; expired gifts ⇒ revoke (set `revokedAt`, repair Clerk mirror, `gift_revoked` event, set `premiumDataExpiresAt = expiresAt + 90d`).
3. **Trial-end events** — `trialEndsAt` crossed since last run ⇒ `trial_ended` event + set `premiumDataExpiresAt = trialEndsAt + 90d` if the user never upgraded. (The takeover itself is session-driven, Part 1 predicates.)
4. **Winback** — §4.4.
5. **90-day purge** — §5.3.
6. **Dunning fallback sweep** — subscriptions `past_due` > 8 days with no `customer.subscription.deleted` processed ⇒ re-fetch from Stripe and reconcile (webhook-loss safety net).
7. **Housekeeping** — prune `processed_stripe_events` > 90 days; retry `failed` email sends < 24h.

Idempotency throughout comes from the email dedupe keys + event-existence checks, so a re-run (or a missed day catching up) is safe.

### 5.2 Stripe Smart Retries configuration

Dashboard (test + live, done once, documented in the runbook): Smart Retries with 2 retries inside the 7-day window; on exhaustion **cancel** the subscription. This produces exactly the #782/#783 dunning shape: Day 0 fail → dunning_1, ~Day 3–4 retry fail → dunning_2, Day 7 final fail → dunning_3 + next-day cancellation → downgrade webhook. Stripe's own emails to customers are **disabled** (we own dunning voice).

### 5.3 90-day preserve-then-purge (#780 §5)

Purge runs for users whose `premiumDataExpiresAt < now` AND whose current derived plan is still non-premium (re-upgrade clears the field via webhook, but the guard is re-checked at purge time):

| Data                               | Purge action                                   |
| ---------------------------------- | ---------------------------------------------- |
| Watching                           | **Never touched** (Free feature)               |
| Concert history (attended records) | Delete attended rows                           |
| Following                          | Delete `user_artist_follows` rows              |
| Alert prefs                        | Delete prefs (user unsubscribed)               |
| Spotify sync state                 | Revoke OAuth token via Clerk, clear sync state |

Each purge writes a `data_purged` event with per-category counts in metadata, then clears `premiumDataExpiresAt`. The 90-day clock start (effective downgrade date) is set at: cancel-grace end (`customer.subscription.deleted`), `trialEndsAt` (job task 3), gift expiry (job task 2), or immediate downgrade (`change-tier` to supporter — history/following/alerts are premium-only, supporter doesn't retain them).

## 6. Session-start logic (banner/takeover wiring contract)

- Web captures `sessionStartedAt` once per browser session (`sessionStorage`; Decision 9).
- `GET /v1/users/me` accepts optional `sessionStartedAt` query param and returns evaluated flags: `showTrialEndedTakeover`, `showDayThirteenBanner`, `showPastDueBanner` (predicates in Part 1 §3 — evaluated server-side with the client-supplied session timestamp; the timestamp only _narrows_ visibility of the past-due banner, never grants access to anything, so client control of it is not a security surface).
- Rendering a single-fire surface calls the corresponding mutation (`nudges/dismiss`, or the takeover's implicit `lastTrialEndedShownAt` write on `POST /v1/billing/nudges/trial-takeover-shown`).

## 7. Region + legal microcopy support

- SCA region boolean: §1.7.
- `/legal/refund` route: shipped as a section inside `/legal/terms` (anchor link) — smallest surface satisfying #782 §6.1a; standalone page deferred until legal copy demands it.

## 8. Analytics — PostHog funnel

Wired in execution-plan PR 6.2 (`posthog-js` web; `posthog-node` in the API webhook handler for server-truth events). Event names locked now so earlier PRs can annotate call sites behind a no-op shim (`packages/`-level `track()` that logs until PostHog lands):

| Event                                                                             | Source        | Properties                                                                                  |
| --------------------------------------------------------------------------------- | ------------- | ------------------------------------------------------------------------------------------- |
| `monetization_picker_viewed`                                                      | web           | `entry` (settings / paywall / logged-out-paywall / takeover), `plan`                        |
| `monetization_tier_selected`                                                      | web           | `tier`, `plan`                                                                              |
| `payment_surface_opened`                                                          | web           | `tier`, `flow` (new / trial-conversion / upgrade)                                           |
| `payment_failed`                                                                  | web + API     | `tier`, `declineCategory` (never raw `decline_code` client-side; raw code server-side only) |
| `payment_succeeded`                                                               | API (webhook) | `tier`, `amountCents`, `flow`                                                               |
| `trial_ended_takeover_shown`                                                      | web           | —                                                                                           |
| `cancel_initiated` / `cancel_completed`                                           | web / API     | `tier`, `daysSubscribed`                                                                    |
| `founder_window_view`                                                             | web           | `state`                                                                                     |
| `founder_claim_attempted` / `founder_claim_succeeded` / `founder_claim_raced_out` | API           | `seatNumber` (succeeded only)                                                               |

The #775 issue's event list is canonical; the three founder events extend it (execution-plan PR 6.2 list reconciled here). Env: `NEXT_PUBLIC_POSTHOG_KEY` + `NEXT_PUBLIC_POSTHOG_HOST` (web), `POSTHOG_KEY` (api) — added in PR 6.2, not before.

## 9. Env-var matrix

| Var                                  | Where                     | Staging                   | Prod                      | Status                                                                                               |
| ------------------------------------ | ------------------------- | ------------------------- | ------------------------- | ---------------------------------------------------------------------------------------------------- |
| `STRIPE_SECRET_KEY`                  | Render API + billing cron | test key                  | live key                  | ✅ placed 2026-07-10                                                                                 |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Vercel web                | test key                  | live key                  | ✅ placed 2026-07-10                                                                                 |
| `STRIPE_WEBHOOK_SECRET`              | Render API                | test-mode endpoint secret | live-mode endpoint secret | ⏳ created when webhook endpoints are registered (PR 2.3) — listed in that PR body for Hugh to place |
| `RESEND_API_KEY`                     | Render API + billing cron | ✅ exists                 | ✅ exists                 | Reused                                                                                               |
| `CLERK_SECRET_KEY`                   | billing cron              | exists on API             | exists on API             | Added to the new cron service                                                                        |
| `DATABASE_URL`                       | billing cron              | Neon staging              | Neon prod                 | Added to the new cron service                                                                        |
| PostHog keys                         | Vercel + Render           | —                         | —                         | PR 6.2                                                                                               |

`.env.example` updates ride with the PR that first reads each var. `docs/runbooks/production-launch.md` env tables updated in the same PRs.

## 10. CI + secret handling

- **Test vs live:** staging uses test-mode keys end-to-end; prod uses live-mode. Never mixed. The provision script + webhook registration run per mode.
- **CI:** unit/integration tests use `stripe` in mock mode (constructed with a dummy key; network calls stubbed at the SDK boundary via dependency-injected client). No Stripe keys in GitHub Actions. Webhook signature verification is tested with `stripe.webhooks.generateTestHeaderString`.
- **Rotation runbook:** `docs/runbooks/stripe-secrets.md` (ships in PR 2.3): rotating `STRIPE_WEBHOOK_SECRET` = roll secret in dashboard → update Render env → redeploy (Stripe dual-delivers during roll); rotating `STRIPE_SECRET_KEY` = create restricted replacement → swap env → revoke old.

## 11. Testing strategy

| Layer                                         | Coverage                                                                                                                                                                                                                                                                                       |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit (Vitest)                                 | `derivePlan` (every branch incl. precedence: role → gifted → tier → trial → free), entitlements matrix exhaustive table (Part 1), decline mapping (every listed code + defaults), predicate evaluation (trial/day-13/past-due windows with boundary timestamps), email dedupe-key construction |
| Integration (Vitest + local PG)               | Atomic claim under concurrency (N parallel claims against seats=1 ⇒ exactly 1 win), seat restore idempotency, webhook handler idempotency (duplicate event ID ⇒ single processing), enum expansion migration on a seeded snapshot, purge job on fixture users                                  |
| E2E (Playwright, staging)                     | Test-mode card matrix: `4242…` success, `9995` insufficient_funds, `0002` generic decline, `3155` 3DS-required — walking the #782 surfaces; portal round-trip; cancel → grace → resubscribe                                                                                                    |
| Staging validation (per execution-plan gates) | Real test-mode checkout end-to-end; webhook events observed landing; admin simulate-claim exercised; email sends observed in Resend dashboard (staging sends restricted to a test-recipient allowlist via env flag `EMAIL_TEST_RECIPIENTS` to avoid mailing real beta users from staging)      |

The `EMAIL_TEST_RECIPIENTS` guard: when set (staging), every transactional send is redirected to the allowlist with the original recipient noted in the subject — standard staging-mail hygiene.

## 12. Rollout mapping (execution-plan phases)

| Execution-plan PR             | This spec's sections                   |
| ----------------------------- | -------------------------------------- |
| 2.1 schema                    | Part 1 §Schema (migration sketch)      |
| 2.2 SDK + checkout            | §1.1–1.4, §3.1–3.3                     |
| 2.3 webhooks + portal         | §1.5, §3.2, §4.3 skeleton, §10 runbook |
| 3.1 derivePlan + entitlements | Part 1 §derivePlan + §Entitlements     |
| 3.2–3.4, 4.x UI PRs           | Consume contracts §1.4, §6             |
| 5.1–5.3 emails                | §4, §5.1–5.2                           |
| 6.1 admin                     | §3.4–3.5                               |
| 6.2 analytics                 | §8                                     |
| 6.3 runbook                   | §3.5, §5.2, §10                        |

## Acceptance (from #775)

- [x] Schema delta + migration sketch (Part 1)
- [x] Env-var matrix update (§9)
- [x] Decisions log: expand-existing-subscriptions (not fresh schema), embedded Payment Element (not hosted Checkout / not raw one-off PaymentIntent), in-app cancel + portal-for-tooling hybrid (Part 1 Decisions log)
- [ ] Spec PR merged → Monetization plan PRs may open (Phase 2)
