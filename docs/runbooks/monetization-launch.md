# Monetization Launch Runbook

**What this is:** the operational sequence for opening the founder window and taking
paid subscriptions live in production. This is the Phase 7 launch trigger from the
monetization execution plan (`docs/superpowers/plans/2026-06-27-monetization-execution-plan.md`).

**Who runs it:** Hugh. The actual `opens_at` flip is a human decision — Hugh's call,
Hugh's hand on the keyboard. Nothing in this runbook should be automated or run by an
agent. Claude builds and validates the machinery; a human pulls the trigger.

> ⚠️ **The launch flip is effectively irreversible once real claims land.** `opens_at`
> stamps the founder window open and starts the countdown (`closes_at` is a generated
> column). You can roll it back to `NULL` **only** in the seconds/minutes before the first
> real founder claim — see [Rollback](#rollback-emergency-only). After that, reverting the
> window orphans paid subscriptions against a dormant window. Treat launch as one-way.

---

## Pre-launch checklist

Work top to bottom. Every box must be checked before the flip. Items marked **(Hugh /
infra)** are human-owned and cannot be done by an agent.

### Payments — Stripe LIVE mode

- [ ] **(Hugh / infra)** LIVE Stripe keys placed on the **prod** API service
      (`concert-crawl-api`, Render): `STRIPE_SECRET_KEY` (`sk_live_*`) and
      `STRIPE_WEBHOOK_SECRET` (`whsec_*` for the live-mode endpoint). As of the Phase 5
      handoff the prod API had **no** Stripe vars — staging ran the whole epic in sandbox
      (test mode). Placing live keys is the notify-and-proceed cutover.
- [ ] **(Hugh / infra)** LIVE publishable key on the prod **web** project
      (`concert-crawl`, Vercel): `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (`pk_live_*`).
- [ ] **(Hugh / infra)** Live-mode Stripe **products + prices** provisioned
      (`supporter_monthly`, `premium_monthly`, `founder_monthly`) via
      `STRIPE_SECRET_KEY=sk_live_… tsx scripts/stripe-provision.ts --mode live`. Verify one
      price per `lookup_key` (the script and the API both loud-fail on duplicates).
- [ ] **(Hugh / infra)** Live-mode **webhook endpoint** pointed at the prod API
      (`https://<prod-api-host>/v1/webhooks/stripe`) via
      `… tsx scripts/stripe-provision.ts --webhooks --mode live`, then copy its signing
      secret into `STRIPE_WEBHOOK_SECRET` (above). Confirm reachability: a bogus-signature
      POST returns `400 Invalid signature` (proves the secret landed), a no-signature POST
      returns `400`. See `docs/runbooks/stripe-secrets.md`.
- [ ] **(Hugh)** Stripe **Smart Retries** dunning schedule configured in the live-mode
      dashboard (the daily job issues our own dunning emails; Smart Retries drives the
      retry attempts).

### Email

- [ ] **(Hugh / infra)** Sender-domain reputation initialized on `concertcrawl.app`:
      SPF / DKIM / DMARC verified in Resend, warmup underway. Without this, transactional
      billing email lands in spam or bounces.
- [ ] **(Hugh)** Cross-client render check passed (Gmail / Apple Mail / Outlook web, via
      Litmus or test inboxes) on all 10 transactional templates.
- [ ] **(Hugh / infra)** The **`concert-crawl-billing-jobs`** Render cron is deployed on
      prod (daily 9 AM MT, `tsx apps/api/src/jobs/billing-daily.ts`, env
      `DATABASE_URL` / `STRIPE_SECRET_KEY` / `RESEND_API_KEY` / `CLERK_SECRET_KEY`). Until
      it runs, **no** dunning / card-expiry / winback / 90-day-purge sends fire.

### Founder window state (prod DB)

Run against the prod Neon branch (direct connection string). See
[Prod DB access](#prod-db-access) for the connection gotcha.

- [ ] `opens_at IS NULL` — the window has never been opened (a non-null value means it was
      already launched; the admin endpoint refuses to re-stamp it).
- [ ] `seats_total = seats_remaining = 100` — no real seats consumed yet.
- [ ] `window_days` is the intended open duration (drives `closes_at`).

```sql
SELECT id, opens_at, closes_at, seats_total, seats_remaining, seats_remaining_test, window_days
FROM founder_window WHERE id = 1;
```

Expected pre-launch row: `opens_at = NULL`, `closes_at = NULL`,
`seats_remaining = seats_total = 100`.

- [ ] **Public API reads pre-launch:** `GET /v1/billing/founder-window` returns
      `state: "pre-launch"`.
- [ ] **Admin panel loads:** `/admin/founder-window` renders the control with the window
      state, seats, and the "Open the founder window" button.

### Staging dress rehearsal (Phase 6→7 gate)

- [ ] The full launch sequence below has been walked **on staging** end to end: flip via
      the admin UI, verify state `open`, run the post-launch smoke, then reset staging
      (`UPDATE founder_window SET opens_at = NULL WHERE id = 1;`) so staging returns to
      pre-launch. Hugh has signed off on this runbook after the rehearsal.

---

## Launch sequence

### Primary path — admin UI (audited)

This is the intended launch mechanism. It is a single audited API call behind a
confirmation modal, built in PR 6.1.

1. Sign in to production as an admin.
2. Go to **`/admin/founder-window`**.
3. Click **"Open the founder window"**. A confirmation modal appears — a single click
   cannot launch the world.
4. Click **"Open the window"** to confirm.

This issues `POST /v1/admin/founder-window/open`, which:

- Guards on `opens_at IS NULL` in an atomic `UPDATE` (a second click, or a concurrent
  opener, gets `409 founder_window_already_open` — it cannot reset the clock).
- Stamps `opens_at` with the current server timestamp; `closes_at` follows automatically.
- Writes an **audit log** entry (`founder_window.open`, actor = admin user id, meta =
  `{ opensAt }`).

The panel refreshes to the open state (state badge, opened-at / closes-on line). The
"Open the founder window" button is now gone.

### Break-glass path — raw SQL (only if the admin UI is unavailable)

Use this **only** if the admin app or API is down at T-0. It bypasses the audited
endpoint, so you must record the launch manually.

```sql
-- Atomic, idempotent flip. The WHERE clause makes a double-run a no-op.
UPDATE founder_window
SET opens_at = NOW()
WHERE id = 1 AND opens_at IS NULL
RETURNING id, opens_at, closes_at;
```

> ⚠️ This does **not** write an `audit_log` row. If you launch this way, add a manual
> audit note (date, actor, `opens_at` value) so the launch is still traceable.

---

## Post-launch verification

### 1. Read-only state checks (immediate, safe)

- `GET /v1/billing/founder-window` → `state: "open"`, `opensAt` set, `closesAt` =
  `opensAt` + `window_days`.
- Admin tile at `/admin/founder-window` shows **Open**, seats remaining, and (once claims
  land) the recent-claims list.
- Automated read-only smoke (does **not** claim a seat or spend money):

  ```bash
  FOUNDER_LAUNCH_SMOKE=1 \
  PLAYWRIGHT_SMOKE_BASE_URL=https://concertcrawl.app \
  PLAYWRIGHT_API_URL=https://<prod-api-host> \
  pnpm --filter @concert-crawl/e2e exec playwright test --config playwright.smoke.config.ts founder-launch
  ```

  The spec (`apps/e2e/src/smoke/founder-launch.spec.ts`) **self-skips** unless
  `FOUNDER_LAUNCH_SMOKE=1` is set, so it stays inert in the routine 6-hourly prod smoke
  cron (where the window is still `pre-launch`). When run, it asserts the founder window
  API reports `open` with seats remaining, and that the public tier picker renders the
  founder tier. It is a launch-confirmation check, not a claim test.

### 2. First-claim validation (manual — Hugh, deliberate)

The definitive proof that the paid path works end to end. **Not** automated: it consumes a
real founder seat and creates a real live-mode Stripe subscription (real money). Run it
once, deliberately, immediately after launch.

1. As a **synthetic** signed-in user (a throwaway account you control), walk the tier
   picker → **Founder** → complete Stripe checkout with a **real card**.
2. Verify, in the prod DB:
   - `subscription_events` has a `founder_claimed` row for the user with a seat number in
     metadata (and a `subscription_created` row).
   - `founder_window.seats_remaining` decremented by 1 (now 99).
   - `subscriptions` row: `tier = founder`, `status = active`.
3. Verify the `welcome_paid` email arrived (with the "Founder #N of 100" badge).
4. Confirm the admin recent-claims list shows the claim.

If everything checks out, the launch is validated. If you want the seat back, handle it as
a normal cancellation + seat restore — do **not** roll back the window.

---

## Rollback (emergency only)

**Only viable before the first real claim.** If checkout is on fire at T-0 and no real
founder claim has landed yet, you can return the window to dormant:

```sql
-- Safe ONLY if seats_remaining still equals seats_total (no real claims).
UPDATE founder_window
SET opens_at = NULL
WHERE id = 1 AND seats_remaining = seats_total
RETURNING id, opens_at, seats_remaining, seats_total;
```

- `closes_at` auto-clears (it is generated from `opens_at`).
- After this, `GET /v1/billing/founder-window` returns `pre-launch` again, and the admin
  "Open the founder window" button reappears — the endpoint's `opens_at IS NULL` guard is
  satisfied, so you can re-launch cleanly once the problem is fixed.
- The `RETURNING` clause returns **zero rows** if any real seat was consumed — that is the
  guard doing its job. **Do not** force it. Once claims exist, leave the window open and
  address the incident without reverting `opens_at` (reverting would orphan the paid
  subscriptions against a dormant window). For a full schema rollback, see
  `docs/runbooks/db-rollback.md`.

---

## During launch — what to watch

- **Stripe dashboard** (live mode): incoming subscriptions, failed payments.
- **Sentry**: API + web error spikes, and any `smoke-test` source failures.
- **Admin `/admin/founder-window`**: seats remaining ticking down, recent claims flowing.
- **Resend**: `welcome_paid` deliveries succeeding (not bouncing / spam-foldering).
- **Seat exhaustion**: at `seats_remaining = 0` the founder tier closes to new claims
  automatically (the claim gate refuses); the window state stays `open` until `closes_at`.

---

## Prod DB access

Staging and prod run on **Neon** (not Render Postgres — the Render MCP cannot query them).
Use the direct (non-pooled) connection string. On this machine `psql "$NEON_PROD_DIRECT"`
fails with channel-binding + SNI errors; the fix is to replace
`channel_binding=require` → `prefer` **and** append
`options=endpoint%3D<first-domain-label>` to the connection string. The Neon dashboard SQL
editor also works for these read-only checks and the flip.

---

## Reference

- Execution plan: `docs/superpowers/plans/2026-06-27-monetization-execution-plan.md`
  (Phase 6 = admin + analytics + launch prep; Phase 7 = launch day)
- Admin control: `apps/api/src/routes/admin/founder-window.ts` (PR 6.1, #917),
  `apps/web/src/components/admin/founder-window/FounderWindowControl.tsx`
- Public founder window: `apps/api/src/routes/billing-founder-window.ts`
  (`resolveFounderWindowView`)
- Stripe secrets: `docs/runbooks/stripe-secrets.md`
- Production launch (infra): `docs/runbooks/production-launch.md`
- DB rollback: `docs/runbooks/db-rollback.md`
