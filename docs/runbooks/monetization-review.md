# Monetization Review

Your get-up-to-speed doc for the monetization epic. It covers **what shipped**,
**what's live vs. dormant right now**, and — most importantly — **the tasks that
need you** before and at launch. Read this once, then work the checklist.

For the actual launch-day flip, this doc points you at
[`monetization-launch.md`](./monetization-launch.md) — that runbook is the source
of truth for the sequence. This is the map; that is the turn-by-turn.

---

## 1. What shipped (by phase)

Every phase below is merged to `main`, CI-green, and deployed to prod + staging.
The code is live; most of it stays **dormant** until you flip the founder window
open (see §3).

| Phase                              | What it delivers                                                                                                                            | PRs                          |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| 1 — Spec                           | Monetization eng infra design                                                                                                               | #873                         |
| 2 — Schema + Stripe core           | DB expand, checkout-session + founder atomic claim, webhooks + portal + abandon                                                             | #878, #879, #880             |
| 3 — Plan + entitlements + picker   | `derivePlan` rewrite + entitlements package, six-state tier picker + embedded checkout, entitlement gating across surfaces                  | #885, #886, #887             |
| 4 — Payment + lifecycle + failures | Checkout legal microcopy, trial-end/founder-claim reveals, past-due banner, five failure surfaces + 3DS/SCA, cancel/resubscribe/change-tier | #900, #901, #902, #906, #908 |
| 5 — Email + daily job              | Dunning/reminder/winback emails + daily billing job                                                                                         | #912                         |
| 6 — Admin + launch prep            | Admin founder-window launch control, launch runbook + gated smoke                                                                           | #917, #922                   |
| 6.2 — Analytics                    | PostHog funnel instrumentation                                                                                                              | _in progress_                |
| 7 — Launch day                     | **Human-owned — you flip the switch**                                                                                                       | —                            |

---

## 2. What's live vs. dormant right now

- **Live in prod today:** all the code paths, the Stripe **test-mode** wiring, the
  admin founder-window control (reads `pre-launch`), and the price-submission flow.
- **Dormant until you act:** the founder window is `pre-launch`, so the tier picker
  doesn't offer the founder tier, no real charges happen, and the launch smoke
  self-skips. Nothing bills a real card until you (a) put Stripe in live mode and
  (b) open the window.
- **Not yet running:** the daily billing cron. The code (`apps/api/src/jobs/billing-daily.ts`)
  is merged, but the **Render service doesn't exist yet** — you create it (§3, Render).

---

## 3. YOUR tasks — the checklist

Grouped by system. Nothing here is code I can finish for you: each item needs a
real account, a real key, or a human judgment call. Do them in roughly this order.

### A. Stripe — go live

- [ ] Switch the Stripe dashboard to **live mode**; create the founder + paid
      products/prices to match the test-mode ones.
- [ ] Grab the live secret (`sk_live_*`) and the live webhook signing secret.
- [ ] Point a **live webhook endpoint** at the prod API `/v1/billing/webhook`
      (subscribe to the same events as test mode).
- [ ] Turn on **Smart Retries** (dunning) in the live billing settings.
- [ ] See [`stripe-secrets.md`](./stripe-secrets.md) for where each key goes.

### B. Email — Resend + deliverability

- [ ] Confirm the **sender domain is verified** in Resend and reputation is warm.
- [ ] Send yourself one of each template (trial-end, dunning, winback, gift-ending)
      and **eyeball cross-client render** (Gmail + Apple Mail at minimum).
- [ ] Read the copy in each once more in your own voice — templates are written,
      but you own the final tone.

### C. Render — daily billing cron

- [ ] Create the **`concert-crawl-billing-jobs`** cron service (prod) — Node runtime,
      schedule `0 15 * * *` (Render runs cron in UTC: 15:00 UTC = 9 AM MDT / 8 AM MST),
      start command
      `pnpm --filter @concert-crawl/api exec tsx src/jobs/billing-daily.ts`.
      The full env-var list is in `render.yaml` (descriptive reference — the file
      does not auto-create the service; you add it by hand in the dashboard).
- [ ] Optionally create the **`-staging`** twin (test Stripe key) to dry-run it.
- [ ] The job is **idempotent** — safe to trigger manually once to confirm it runs
      clean before the schedule takes over.

### D. PostHog — analytics (once #6.2 merges)

- [ ] Create a **PostHog Cloud project, US region** (free tier: 1M events/mo, no card).
- [ ] Put the project key in Vercel (web) + Render (api) env. Instrumentation
      **no-ops if the key is absent**, so nothing breaks if you defer this.

### E. Launch day — flip the switch

- [ ] When A–C are done and you've done the staging dress rehearsal, follow
      [`monetization-launch.md`](./monetization-launch.md) §"Launch sequence":
      open the founder window via the **admin UI** (audited), then run the
      post-launch read-only checks and the one deliberate first-claim validation.

---

## 4. How to launch (pointer)

The flip itself is one action in the admin founder-window control, and the runbook
walks it end to end:

- **Pre-launch checklist** → `monetization-launch.md` §"Pre-launch checklist"
- **The flip** → §"Launch sequence" (primary path = admin UI; break-glass = raw SQL)
- **After** → §"Post-launch verification" and §"During launch — what to watch"
- **If it goes wrong** → §"Rollback (emergency only)"

You never edit `founder_window.opens_at` in prod by hand — the admin UI owns that,
and it's audited.

---

## 5. Flags & open follow-ups

- **Dependabot alert** — someone else is handling it; not part of this epic.
- **Manual validation** is the plan by design — you don't need automated e2e for the
  first live claim; the runbook's first-claim step is the intentional manual gate.
- The prod founder-launch smoke (`FOUNDER_LAUNCH_SMOKE=1`) stays inert until the
  window is open, then confirms the flip took.
