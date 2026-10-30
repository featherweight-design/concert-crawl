# Monetization Review

Your get-up-to-speed doc for the monetization epic. It covers **what shipped**,
**what's live vs. dormant right now**, and — most importantly — **the tasks that
need you** before and at launch. Read this once, then work the checklist.

For the actual launch-day flip, this doc points you at
[`monetization-launch.md`](./monetization-launch.md) — that runbook is the source
of truth for the sequence. This is the map; that is the turn-by-turn.

---

## 1. What shipped (by phase)

Every phase below is merged to `main`, CI-green, and deployed to prod + staging —
**except** 6.2 (Analytics), which is still in progress, and 7 (Launch day), which
is human-owned and has no code. The shipped code is live; most of it stays
**dormant** until you flip the founder window open (see §3).

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

**Where the templates live.** All 10 transactional templates are TypeScript
render functions in `apps/api/src/emails/templates/` (welcome-paid, welcome-gifted,
renewal-receipt-monthly, cancellation-ack, dunning-1/2/3, card-expiring-soon,
gifting-ending-notice, winback). Shared shell (header/footer/palette) is in
`apps/api/src/emails/layout.ts` + `palette.ts`; the send pipeline is
`apps/api/src/lib/email.ts`.

**Review them in a browser** (no keys needed — renders to local HTML files):

```bash
pnpm --filter @concert-crawl/api email:preview
# → writes apps/api/.email-preview/*.html + index.html; open index.html
```

**Test-send one (or all) to yourself.** Needs a Resend key in the shell; use a
test key against a verified domain. `--only <key>` picks one template (keys are
the snake_case names, e.g. `welcome_paid`, `dunning_1_card_declined`, `winback`):

```bash
RESEND_API_KEY=re_... pnpm --filter @concert-crawl/api email:preview -- \
  --send you@example.com --only welcome_paid
# omit --only to send the whole set
```

Sends go from `billing@concertcrawl.app` with subject prefixed `[preview]`.
Eyeball cross-client render in **Gmail + Apple Mail** at minimum.

**Confirm the sending domain is healthy in Resend:**

- [ ] Resend dashboard → **Domains** → `concertcrawl.app` shows **Verified**
      (SPF and DKIM green). That's the real gate — an unverified domain lands in
      spam or bounces. Resend may still flag DMARC: the live `_dmarc` record is
      maintained by hand rather than taken from Resend's suggestion, so that row
      is expected to disagree. See _Email — `venues@concertcrawl.app`, and the
      DMARC path_ in `production-launch.md`.
- [ ] Send a few previews (above) to a Gmail + an Apple Mail address and confirm
      they hit the **inbox, not spam**. Resend has no numeric "reputation" score;
      "warm" here just means the domain is verified and recent sends aren't
      bouncing or getting flagged — check **Resend → Logs** for
      delivered/bounced/complained after your test sends.
- [ ] Read the copy in each once more in your own voice — templates are written,
      but you own the final tone.

### C. Render — daily billing cron

- [ ] Create the **`concert-crawl-billing-jobs`** cron service (prod) — Node runtime,
      schedule `0 15 * * *`, build command
      `npm install -g pnpm && pnpm install --frozen-lockfile && pnpm turbo build --filter=@concert-crawl/api`,
      env var `NPM_CONFIG_PREFIX=/opt/render/.npm-global` (or the first build fails
      with EROFS; see `render-service-config.md`),
      start command `node apps/api/dist/jobs/billing-daily.js` (the build compiles
      the API to `dist/`, so the cron runs plain `node` — no `tsx` needed at runtime).
      Render runs cron in UTC: `15:00 UTC` = **9 AM MDT / 8 AM MST**. The schedule
      is pinned to UTC and intentionally not adjusted for DST (the send hour isn't
      load-bearing). If 9 AM local ever becomes a hard requirement, use `0 16 * * *`
      during MST months. The full env-var list is in `render.yaml` (descriptive
      reference — the file does not auto-create the service; add it by hand).
- [ ] Optionally create the **`-staging`** twin (test Stripe key) to dry-run it.
- [ ] The job is **idempotent** — safe to trigger manually once to confirm it runs
      clean before the schedule takes over.

### D. PostHog — analytics (once #6.2 merges)

- [ ] Create a **PostHog Cloud project, US region** (free tier: 1M events/mo, no card).
      In the project you need two values from **Project Settings**:
      the **Project API key** (starts `phc_…`) and the **API host**
      (US region = `https://us.i.posthog.com`).
- [ ] Add these env vars (PR 6.2 reads them; instrumentation **no-ops if the key
      is absent**, so nothing breaks if you defer this):

  | Env var                    | Where        | Value                      |
  | -------------------------- | ------------ | -------------------------- |
  | `NEXT_PUBLIC_POSTHOG_KEY`  | Vercel (web) | the `phc_…` project key    |
  | `NEXT_PUBLIC_POSTHOG_HOST` | Vercel (web) | `https://us.i.posthog.com` |

  The vars are `NEXT_PUBLIC_`-prefixed because the browser SDK reads them. The
  API no longer sends PostHog anything: billing events were removed when the app
  moved to a free tier, so there are no Render PostHog vars.

  > Exact var names are confirmed when PR 6.2 lands — if they differ, this table
  > is updated on that PR. Nothing to add until 6.2 is merged.

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
