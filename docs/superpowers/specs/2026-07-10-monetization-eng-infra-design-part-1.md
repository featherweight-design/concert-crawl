# Monetization — Eng Infra Spec, Part 1: Schema, Plan Derivation, Entitlements

**Status:** Draft for review
**Ticket:** [#775](https://github.com/HartiganHM/concert-crawl/issues/775) (`type: chore, priority: high, phase: beta`) — includes Resend infrastructure absorbed from closed [#849](https://github.com/HartiganHM/concert-crawl/issues/849)
**Authored:** 2026-07-10
**Authors:** Hugh Hartigan, Claude
**Companion:** Part 2 (`2026-07-10-monetization-eng-infra-design-part-2.md`) — Stripe wiring, Founder window mechanics, Resend, timers/jobs, analytics, env vars, testing
**Related:**

- **Execution plan:** `docs/superpowers/plans/2026-06-27-monetization-execution-plan.md` (Phase 1 deliverable)
- **Design briefs (all merged, all locked):**
  - `docs/superpowers/specs/2026-06-24-monetization-tier-states-entitlements-design.md` (#781)
  - `docs/superpowers/specs/2026-06-25-monetization-lifecycle-design.md` (#780)
  - `docs/superpowers/specs/2026-06-26-monetization-failure-a11y-microcopy-design.md` (#782)
  - `docs/superpowers/specs/2026-06-27-monetization-emails-design.md` (#783)
- **Beta-to-Launch plan:** `docs/superpowers/specs/2026-05-09-beta-to-launch-design.md`

---

## Purpose

This spec settles every engineering-infrastructure question the four monetization design briefs delegated to #775, so the per-PR implementation plans (execution-plan Phases 2–6) can be written without re-opening architecture debates. It is split into two parts to keep each file reviewable:

- **Part 1 (this file):** schema expansion + migration strategy, `derivePlan` rewrite, entitlements helper.
- **Part 2:** Stripe wiring (payment flow, endpoints, webhooks, decline mapping), Founder window mechanics, Resend email infrastructure, timers/background jobs, analytics, env-var matrix, CI/secret rotation, testing strategy.

## Decisions log (the calls this spec makes)

| #   | Decision                                     | Choice                                                                                                                                                                         | Rationale                                                                                                                                                                                                                                                                                                                                                                                                                 |
| --- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Founder window schema shape                  | Dedicated singleton `founder_window` table (single row), not a generic config table                                                                                            | Generated `closes_at` column + atomic seat decrement want typed columns; a generic key/value config table can't express either                                                                                                                                                                                                                                                                                            |
| 2   | Payment surface architecture                 | **Embedded Payment Element** (server creates subscription with `payment_behavior: 'default_incomplete'`, client confirms in our surface) — NOT hosted Stripe Checkout redirect | #782's five in-app failure surfaces and #781's "we render the container, summary rail, totals, and result states" lock require us to own the payment UI and see `decline_code`s client-side. A hosted-Checkout redirect would render Stripe's UI and swallow declines. This supersedes the execution plan's "returns Stripe checkout URL" wording for PR 2.2; endpoint name (`POST /v1/billing/checkout-session`) is kept |
| 3   | Customer portal pattern                      | Stripe-hosted portal (new tab)                                                                                                                                                 | Locked by #780's hybrid management split — portal owns tooling-heavy ops (card change, invoices, billing email, tax)                                                                                                                                                                                                                                                                                                      |
| 4   | Webhook idempotency                          | `processed_stripe_events` table; `INSERT … ON CONFLICT DO NOTHING` on the Stripe event ID; handler runs only when the insert lands                                             | DB-backed, survives deploys/restarts, one round trip; same pattern as the execution plan sketch                                                                                                                                                                                                                                                                                                                           |
| 5   | Resend ownership                             | Folded into #775 (this spec, Part 2) per #849's recommended resolution                                                                                                         | Email triggers are webhook/timer events this spec already owns                                                                                                                                                                                                                                                                                                                                                            |
| 6   | Trial storage                                | **Our DB, not Stripe.** `user_billing.trialEndsAt` set at account creation; no Stripe object exists until the user adds a card                                                 | Beta-to-Launch locks "14-day free trial of Premium at signup, no credit card required" — Stripe can't model a card-less trial subscription                                                                                                                                                                                                                                                                                |
| 7   | Trial ↔ UserPlan mapping                     | Trial users derive `plan = 'premium'` with a separate `onTrial` descriptor (`trialEndsAt` rides along); no 7th plan value                                                      | #781 locked exactly 6 states; #780's Plan card variants key off `tier=premium, on_trial=true`                                                                                                                                                                                                                                                                                                                             |
| 8   | Downgrade credit storage                     | Stripe customer balance is the source of truth; no `downgrade_credit_balance` DB column                                                                                        | Stripe already tracks proration credit; duplicating it invites drift (KISS — exhaust existing fields first)                                                                                                                                                                                                                                                                                                               |
| 9   | Session-start marker for the past-due banner | Client-side session marker (web `sessionStorage`), not a persisted `session_started_at` column                                                                                 | The predicate only needs "dismissed before this session started"; persisting per-session rows adds writes for no queryable value                                                                                                                                                                                                                                                                                          |
| 10  | Gifted source of truth                       | `gifted_comps` DB table (source of truth, queryable by timers) + Clerk `publicMetadata.plan = 'premium_gifted'` mirror (JWT-fast reads)                                        | Timers (gift-ending notice) need SQL over all gifted users; `derivePlan` needs a zero-DB-hop check. Grant/revoke flows write both                                                                                                                                                                                                                                                                                         |
| 11  | Dunning email cadence driver                 | Stripe Smart Retries configured to retry at ~day 3–4 and day 7; `invoice.payment_failed` webhook `attempt_count` maps to dunning_1/2/3                                         | Stripe already owns the retry clock; a parallel DB timer would drift from actual retry events. Fallback sweep in the daily billing job catches missed webhooks                                                                                                                                                                                                                                                            |
| 12  | Analytics stack                              | PostHog (`posthog-js` on web, `posthog-node` in API for webhook-driven events) — wired in execution-plan Phase 6 (PR 6.2), event names locked here (Part 2 §8)                 | Beta-to-Launch already names PostHog; nothing else is wired today                                                                                                                                                                                                                                                                                                                                                         |
| 13  | Where nudge-dismissal state lives            | New `user_billing` table (one row per user), not `subscriptions`                                                                                                               | Trial + banner state must exist for users with **no** subscription row (card-less trial); subscriptions table stays a pure Stripe mirror                                                                                                                                                                                                                                                                                  |
| 14  | Stripe products/prices provisioning          | Checked-in idempotent script (`lookup_key`-based upsert, both modes), never hand-created in the dashboard                                                                      | Reproducible across test/live; amounts verified in cents against #781's locked pricing                                                                                                                                                                                                                                                                                                                                    |

## Current state (verified 2026-07-10)

| Item                         | Location                                    | State                                                                                                                                                                             |
| ---------------------------- | ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `subscription_tier` pgEnum   | `packages/db/src/schema/commerce.ts`        | `['free', 'premium']`                                                                                                                                                             |
| `subscription_status` pgEnum | same                                        | `['active', 'cancelled', 'past_due']`                                                                                                                                             |
| `subscriptions` table        | same                                        | `id, userId, stripeCustomerId, stripeSubscriptionId, tier, founder (bool), status, currentPeriodEnd, createdAt, updatedAt`                                                        |
| `UserPlan` type              | `packages/types/src/index.ts`               | `'founder' \| 'paid' \| 'trial' \| 'past-due'` — replaced wholesale by this spec                                                                                                  |
| `derivePlan`                 | `apps/api/src/routes/users.ts`              | Returns `'founder'` for everyone without a subscription row                                                                                                                       |
| `PREMIUM_ROLES`              | `packages/types/src/index.ts`               | `['admin', 'sub_admin', 'promoter', 'beta']` — role-holders currently short-circuit to `'founder'`                                                                                |
| Stripe SDK                   | —                                           | Not installed anywhere; `STRIPE_SECRET_KEY` placeholder exists in `apps/api/.env.example`                                                                                         |
| Resend SDK                   | `apps/api`                                  | **Already installed** (`resend`); `sendAdminAlertEmail` + `sendInviteCodeEmail` in `apps/api/src/lib/email.ts`; sends from `alerts@concertcrawl.app` / `noreply@concertcrawl.app` |
| Analytics                    | —                                           | No PostHog wiring (privacy-policy copy mentions it only)                                                                                                                          |
| Latest migration             | `packages/db/migrations/meta/_journal.json` | `0044_event_canonical_title_unique`, `when: 1782864000000` — every new migration timestamp must exceed this                                                                       |

## Schema expansion

All changes are **expand-only** (no drops, no renames, no type narrowing) per the expand/contract rule. Contract steps (dropping the vestigial `subscriptions.founder` boolean, retiring old `UserPlan` values) are deferred to a post-launch cleanup ticket and are out of scope here.

### 1. Enum expansion

```
subscription_tier:   ['free', 'premium']  →  + 'supporter', + 'founder'
subscription_status: ['active', 'cancelled', 'past_due']
                     → + 'trialing', + 'incomplete', + 'incomplete_expired'
```

- `pgEnum` value additions are expand-safe (`ALTER TYPE … ADD VALUE`). Note: Postgres cannot run `ADD VALUE` inside a transaction block on older versions; Neon (PG 16+) allows it, but the migration keeps each `ADD VALUE` as its own statement for safety.
- `subscription_status` mirrors the Stripe subscription statuses we consume. Mapping (Stripe → ours): `trialing → trialing` (only occurs if we ever attach a Stripe-side trial — not the card-less trial, see Decision 6), `active → active`, `past_due → past_due`, `canceled → cancelled`, `incomplete → incomplete`, `incomplete_expired → incomplete_expired`. Statuses we never expect (`unpaid`, `paused`) map to `past_due` with a logged warning — the webhook handler must not throw on unknown status.

### 2. `subscriptions` table additions

| Column               | Type                  | Default | Purpose                                                                                          |
| -------------------- | --------------------- | ------- | ------------------------------------------------------------------------------------------------ |
| `cancelAtPeriodEnd`  | boolean, not null     | `false` | Mirror of Stripe `cancel_at_period_end`; drives the Cancel-grace Plan card variant (#780 §3)     |
| `stripePriceId`      | text, nullable        | —       | The active price (lookup-key-resolved); lets us render tier + amount without a Stripe round trip |
| `currentPeriodStart` | timestamptz, nullable | —       | With `currentPeriodEnd`, supports proration disclosure math rendering                            |

Existing `stripeCustomerId` / `stripeSubscriptionId` columns are reused as-is. The vestigial `founder` boolean stays (expand/contract) but is no longer read once `tier = 'founder'` exists; the contract migration removes it post-launch.

**Uniqueness:** add a unique index on `subscriptions.userId` (one live subscription row per user; historical states live in `subscription_events`, not extra rows). Verified against staging + prod data before the migration lands — today no user has more than one row.

### 3. New table: `user_billing` (one row per user, lazily created)

Billing-adjacent user state that must exist **without** a subscription row (Decision 13).

| Column                         | Type                  | Default | Purpose                                                                                                                                 |
| ------------------------------ | --------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `userId`                       | text, PK              | —       | Clerk user ID                                                                                                                           |
| `trialEndsAt`                  | timestamptz, nullable | —       | Set to `account_created_at + 14 days` on first touch (see below). NULL for pre-monetization accounts that already consumed beta gifting |
| `lastTrialEndedShownAt`        | timestamptz, nullable | —       | Trial-ended takeover single-fire predicate (#780 §2)                                                                                    |
| `dayThirteenBannerDismissedAt` | timestamptz, nullable | —       | Day-13 banner single-fire-per-trial-expiry predicate (#780 §6)                                                                          |
| `pastDueBannerDismissedAt`     | timestamptz, nullable | —       | Past-due banner per-session predicate (#782 §1)                                                                                         |
| `premiumDataExpiresAt`         | timestamptz, nullable | —       | 90-day preserve-then-purge clock (#780 §5); set on effective downgrade date, cleared on re-upgrade                                      |
| `createdAt` / `updatedAt`      | timestamptz, not null | now     | Standard                                                                                                                                |

**Row creation:** lazily upserted the first time any billing read/write path touches the user (the `GET /v1/users/me` plan derivation ensures it). `trialEndsAt` seeding rule: set only for users created **after** monetization ships (`user created_at >= founder_window.opensAt`); existing beta users are gifted and never see a trial. **The cutover is `founder_window.opensAt`, not a constant or an env var** — it is NULL until an admin presses "Open the founder window", which is the same irreversible launch-day instant monetization goes live, so NULL means no account is trial-eligible. An earlier `MONETIZATION_LIVE_AT` env var was removed for requiring two switches to be kept in sync for one event; do not reintroduce it.

**Predicates (locked by the briefs, restated as the eng contract):**

- **Trial-ended takeover:** show iff `trialEndsAt < now AND (lastTrialEndedShownAt IS NULL OR lastTrialEndedShownAt < trialEndsAt)`; render sets `lastTrialEndedShownAt = now`.
- **Day-13 banner:** show iff `trialEndsAt - 48h <= now < trialEndsAt - 24h AND (dayThirteenBannerDismissedAt IS NULL OR dayThirteenBannerDismissedAt < trialEndsAt - 48h)`.
- **Past-due banner:** show iff `subscription.status = 'past_due' AND (pastDueBannerDismissedAt IS NULL OR pastDueBannerDismissedAt < sessionStartedAt)` where `sessionStartedAt` is a client-held timestamp captured when the web session opens (Decision 9; wire contract in Part 2 §6).

All three predicates are evaluated server-side in the session-bootstrap payload (Part 2 §6) so clients can't self-grant quiet.

### 4. New table: `founder_window` (singleton)

Per the execution-plan mechanism, verbatim:

| Column               | Type                   | Constraint                                                                                                             |
| -------------------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `id`                 | integer, PK            | `CHECK (id = 1)` — enforces singleton                                                                                  |
| `opensAt`            | timestamptz, nullable  | **NULL until launch day.** Flipping it is a HARD PAUSE / Hugh-only action                                              |
| `seatsTotal`         | integer, not null      | Seeded `100` (locked, #781)                                                                                            |
| `seatsRemaining`     | integer, not null      | Seeded `100`; `CHECK (seats_remaining >= 0)`                                                                           |
| `seatsRemainingTest` | integer, not null      | Seeded `100`; decremented only by the admin simulate-claim path (Part 2 §3.4) — never by real claims                   |
| `windowDays`         | integer, not null      | Seeded `30` (locked, #781 — "First 100 or 30 days")                                                                    |
| `closesAt`           | timestamptz, generated | `GENERATED ALWAYS AS (opens_at + make_interval(days => window_days)) STORED` — propagates NULL while `opensAt` is NULL |

Drizzle expresses the generated column via `.generatedAlwaysAs(sql`...`)`; the raw expression lives in the migration file (allowed — migrations are the raw-SQL exception). Seed row inserted in the same migration.

### 5. New table: `subscription_events` (audit)

Append-only audit trail for every subscription state change (#775 scope + execution-plan rollback strategy depends on it).

| Column          | Type                             | Notes                                                                                                                                                                                                                                                                                                 |
| --------------- | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`            | uuid, PK                         |                                                                                                                                                                                                                                                                                                       |
| `userId`        | text, not null, indexed          |                                                                                                                                                                                                                                                                                                       |
| `type`          | pgEnum `subscription_event_type` | `['checkout_started', 'subscription_created', 'renewal_succeeded', 'payment_failed', 'past_due_entered', 'cancel_scheduled', 'resubscribed', 'cancel_completed', 'upgraded', 'downgraded', 'founder_claimed', 'founder_seat_restored', 'trial_ended', 'gift_granted', 'gift_revoked', 'data_purged']` |
| `stripeEventId` | text, nullable                   | Correlates to the webhook that produced it (NULL for app-originated events like trial_ended)                                                                                                                                                                                                          |
| `metadata`      | jsonb, nullable                  | Tier from/to, amount, decline category, seat number, etc.                                                                                                                                                                                                                                             |
| `createdAt`     | timestamptz, not null            |                                                                                                                                                                                                                                                                                                       |

### 6. New table: `processed_stripe_events` (webhook idempotency)

| Column        | Type                  | Notes                     |
| ------------- | --------------------- | ------------------------- |
| `eventId`     | text, PK              | Stripe event ID (`evt_…`) |
| `type`        | text, not null        | For observability         |
| `processedAt` | timestamptz, not null |                           |

Handler contract: `INSERT … ON CONFLICT DO NOTHING RETURNING event_id`; if no row returns, the event was already processed — respond 200 and skip. Rows older than 90 days are pruned by the daily billing job (Stripe retries never reach that far back).

### 7. New table: `gifted_comps`

Source of truth for gifted Premium (Decision 10).

| Column       | Type                   | Notes                                                                              |
| ------------ | ---------------------- | ---------------------------------------------------------------------------------- |
| `id`         | uuid, PK               |                                                                                    |
| `userId`     | text, not null, unique |                                                                                    |
| `grantedBy`  | text, not null         | Admin Clerk ID (audit)                                                             |
| `expiresAt`  | timestamptz, nullable  | NULL = lifetime (beta cohort). Non-null gifts drive `gifting_ending_notice` (#783) |
| `redeemedAt` | timestamptz, nullable  | For future gift-link flows; beta grants set it = createdAt                         |
| `revokedAt`  | timestamptz, nullable  | Soft revoke; derivePlan treats revoked/expired as absent                           |
| `createdAt`  | timestamptz, not null  |                                                                                    |

Existing beta users (Clerk `publicMetadata.plan = 'premium_gifted'`, set by hand) are backfilled into this table by a one-off script in the same PR; Clerk metadata remains the JWT-fast mirror and is written by the admin grant/revoke flow going forward. **Precedence rule:** if the table and Clerk metadata disagree, the table wins and the mirror is repaired on next derivation (logged).

### 8. New tables: `email_send_log` + `email_template_config`

Defined here for completeness; behavior specced in Part 2 §4.

`email_send_log` — transactional-send idempotency + audit:

| Column        | Type                  | Notes                                                                                                                                                                              |
| ------------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`          | uuid, PK              |                                                                                                                                                                                    |
| `templateKey` | text, not null        | One of the 10 #783 template keys                                                                                                                                                   |
| `userId`      | text, not null        |                                                                                                                                                                                    |
| `dedupeKey`   | text, not null        | e.g. `invoice:{invoiceId}:attempt:1`, `{cardFingerprint}:{expMonth}-{expYear}:30` (full per-template key shapes in Part 2 §4.4) — **unique index on (`templateKey`, `dedupeKey`)** |
| `resendId`    | text, nullable        | Resend message ID on success                                                                                                                                                       |
| `status`      | text, not null        | `sent` / `failed` / `suppressed` (kill switch)                                                                                                                                     |
| `createdAt`   | timestamptz, not null |                                                                                                                                                                                    |

`email_template_config` — per-template kill switch (execution-plan rollback strategy):

| Column        | Type                            | Notes                                                      |
| ------------- | ------------------------------- | ---------------------------------------------------------- |
| `templateKey` | text, PK                        |                                                            |
| `enabled`     | boolean, not null, default true | Admin-flippable; disabled templates log `suppressed` sends |
| `updatedAt`   | timestamptz, not null           |                                                            |

Seeded with all 10 keys, enabled.

### 9. Migration sketch

One expand migration (execution-plan PR 2.1), single file, `when` timestamp > `1782864000000`:

1. `ALTER TYPE subscription_tier ADD VALUE 'supporter'` / `ADD VALUE 'founder'` (separate statements).
2. `ALTER TYPE subscription_status ADD VALUE` × 3.
3. `CREATE TYPE subscription_event_type` (new enum, single statement).
4. `ALTER TABLE subscriptions ADD COLUMN cancel_at_period_end … , stripe_price_id … , current_period_start …` + unique index on `user_id`.
5. `CREATE TABLE user_billing / founder_window / subscription_events / processed_stripe_events / gifted_comps / email_send_log / email_template_config` + indexes.
6. Seed `founder_window` (single row, `opens_at = NULL`) + `email_template_config` (10 rows).

Backfills (gifted_comps from Clerk metadata) run as a checked-in `tsx` script, not inside the migration (Clerk API calls don't belong in SQL). Staging first; prod migration requires explicit human approval per CLAUDE.md.

**Rollback:** all changes are additive; backout = revert the deploy. No destructive path exists. Seed rows are inert while `opens_at IS NULL` and no code reads the new tables until later PRs.

## `derivePlan` rewrite

Replaces `apps/api/src/routes/users.ts:derivePlan` wholesale. New home: `packages/types` keeps the types; the derivation function moves to a shared server-side module in `apps/api/src/lib/plan.ts` (it needs DB + Clerk context; it is not UI-importable — the UI consumes the derived result from the API, never derives locally).

### New types (`packages/types`)

```ts
export type UserPlan =
  'logged-out' | 'free' | 'supporter' | 'premium' | 'founder' | 'gifted'

export interface PlanState {
  plan: UserPlan
  onTrial: boolean // true ⇒ plan === 'premium' via trial (Decision 7)
  trialEndsAt: string | null // ISO; non-null while trial is live or recently ended
  status: SubscriptionStatus | null // Stripe-mirrored status; null when no subscription row
  cancelAtPeriodEnd: boolean
  currentPeriodEnd: string | null
  roleComped: boolean // PREMIUM_ROLES holder — full entitlements, picker shows "You're in already"
}
```

The old `UserPlan` union (`'founder' | 'paid' | 'trial' | 'past-due'`) is deleted in the same PR; every consumer (currently only the users route + Plan card) migrates to `PlanState`. `'past-due'` is not a plan — it's `status`, rendered by #782's surfaces. `'trial'` is not a plan — it's `onTrial` (Decision 7).

### Derivation order (locked by #781's exclusions table: gifted BEFORE Stripe)

```
1. No auth            → { plan: 'logged-out', … }
2. PREMIUM_ROLES      → roleComped: true; continue derivation for plan display
                        (role grants entitlements, not a tier — see below)
3. gifted_comps row (not revoked, not expired)
                      → plan: 'gifted' (entitlements ≡ premium)
4. subscriptions row:
   tier='founder', status ∈ {active, past_due, trialing} → 'founder'
   tier='premium',  status ∈ {active, past_due, trialing} → 'premium'
   tier='supporter', status ∈ {active, past_due, trialing} → 'supporter'
   status ∈ {cancelled}: treated as no subscription (fall through)
   status ∈ {incomplete, incomplete_expired}: fall through (payment never landed)
5. user_billing.trialEndsAt > now → plan: 'premium', onTrial: true
6. Otherwise          → 'free'
```

Notes:

- **Past-due keeps the paid tier** during the 7-day dunning window (#782 §1) — hence `past_due` maps to the tier, not to Free. The webhook downgrade at dunning exhaustion flips `status` to `cancelled`, which falls through to `free` on next derivation.
- **Role-holders:** `roleComped: true` + whatever tier they actually hold (usually `free`). Entitlements treat `roleComped` as full-access (below). The picker renders the "You're in already" banner off this flag (locked, #781 decisions log). Roles no longer masquerade as the `founder` plan.
- **Cancel-grace:** `cancelAtPeriodEnd: true` with `status: 'active'` — plan stays paid until period end (Stripe flips status via webhook at period end). The Plan card cancel-grace variant keys off this combination.

## Entitlements helper — `packages/entitlements`

New workspace package (pure TypeScript, zero runtime deps) so web, API, and tests share one matrix. The #781 matrix is the canonical content; the package encodes it **once** as data.

```ts
export type PremiumFeature =
  | 'watching'
  | 'concert-history'
  | 'calendar-export'
  | 'following'
  | 'alerts'
  | 'spotify-sync'
  | 'price-drop-alerts'

export type EntitlementCell =
  'visible-active' | 'paywall-on-tap' | 'tier-picker-on-tap' | 'hidden'

export const ENTITLEMENTS_MATRIX: Record<
  PremiumFeature,
  Record<UserPlan, EntitlementCell>
>
```

Matrix content (from #781 §6, including the R6 Watching-is-Free amendment; the spotify-sync row shows the #763 §7 (E8) override that superseded #781's hidden cells):

| Feature           | logged-out         | free           | supporter      | premium        | founder        | gifted         |
| ----------------- | ------------------ | -------------- | -------------- | -------------- | -------------- | -------------- |
| watching          | tier-picker-on-tap | visible-active | visible-active | visible-active | visible-active | visible-active |
| concert-history   | tier-picker-on-tap | paywall-on-tap | paywall-on-tap | visible-active | visible-active | visible-active |
| calendar-export   | tier-picker-on-tap | paywall-on-tap | paywall-on-tap | visible-active | visible-active | visible-active |
| following         | tier-picker-on-tap | paywall-on-tap | paywall-on-tap | visible-active | visible-active | visible-active |
| alerts            | hidden             | hidden         | hidden         | visible-active | visible-active | visible-active |
| spotify-sync      | tier-picker-on-tap | paywall-on-tap | paywall-on-tap | visible-active | visible-active | visible-active |
| price-drop-alerts | hidden             | hidden         | hidden         | visible-active | visible-active | visible-active |

API (per #781 §6's entitlement-vs-UX-routing split):

```ts
// Boolean entitlement — the only function servers use to gate writes
export const canUseFeature = (state: PlanStateLike, feature: PremiumFeature): boolean =>
  state.roleComped || ENTITLEMENTS_MATRIX[feature][state.plan] === 'visible-active'

// UX routing for the false case — what the renderer shows on locked taps
export const lockedSurface = (state: PlanStateLike, feature: PremiumFeature): EntitlementCell
// roleComped never reaches a locked surface (canUseFeature is true first)
```

`PlanStateLike` is `Pick<PlanState, 'plan' | 'roleComped'>` so callers with only the serialized session payload can gate without the full state.

**Server-side enforcement is mandatory:** every API route that writes premium-gated data (`concert-history` attend actions, `following` mutations, alert prefs, calendar-export token issuance, Spotify sync) calls `canUseFeature` with the server-derived `PlanState` — UI gating is never the only gate. The Phase 3 PR 3.3 audit enumerates the exact routes.

**Test surface (required by #775):** an exhaustive `(7 features × 6 plans)` table test asserting every cell, plus `roleComped` overrides for all 7 features, plus the trial mapping (`onTrial ⇒ plan 'premium' ⇒ visible-active on premium features`). The matrix constant is the single point of truth — a matrix edit fails tests until the test table is updated in lockstep, which is the intended review friction.

## Part 1 → Part 2 handoff

Part 2 specifies: Stripe SDK/products/prices script, the embedded-Element payment flow and endpoint contracts, webhook event handling table, decline-code mapping, SCA region detection, Founder claim/restore/simulate mechanics, Resend templates + triggers + kill switch, timers and the daily billing job, the 90-day purge, `DELETE /v1/users/me` branching, PostHog events, env vars, CI/secret rotation, and the testing strategy.
