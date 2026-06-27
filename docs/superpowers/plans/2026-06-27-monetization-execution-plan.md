# Monetization Execution Plan

**Status:** Draft for review
**Authored:** 2026-06-27
**Authors:** Hugh Hartigan, Claude
**Scope:** End-to-end sequencing for the monetization feature — from eng infra spec through launch day. Includes the build-ahead, trigger-at-launch mechanism for the Founder claim window.
**Target launch:** Late August 2026 (exact date TBD; the plan is launch-date-agnostic — see Phase 7)

---

## Purpose

Monetization is the largest pending feature in the Concert Crawl roadmap and the highest-rigor build (`project_monetization_high_rigor.md`). It touches schema, payment infra, UI surfaces across multiple flows, email, admin tooling, and a launch-day operational sequence. This plan stitches together the four merged design briefs + the still-to-write eng infra spec into one ordered execution path an agent (or a human) can work down.

This is a **roadmap / sequencing doc**, not an implementation plan. Per-PR implementation plans live separately in `docs/superpowers/plans/` and are written using `superpowers:writing-plans` at the start of each PR. This doc tells you which PR to write next, what depends on what, and how the Founder timer mechanism works.

## Inputs

The work this plan sequences is fully specified by these documents:

- **Design briefs (all merged):**
  - `docs/superpowers/specs/2026-06-24-monetization-tier-states-entitlements-design.md` (#781 — tier picker + entitlements matrix)
  - `docs/superpowers/specs/2026-06-25-monetization-lifecycle-design.md` (#780 — subscription lifecycle + management)
  - `docs/superpowers/specs/2026-06-26-monetization-failure-a11y-microcopy-design.md` (#782 — failure states + a11y + microcopy)
  - `docs/superpowers/specs/2026-06-27-monetization-emails-design.md` (#783 — email touchpoints)
- **Design handoffs (visual baseline):**
  - `design/design_handoff_monetization/` (original — Readiness Review verdict 🔴 Red, addressed by the four briefs above)
  - `design/design_handoff_monetization_tier_states/` (#781 R6)
  - `design/design_handoff_monetization_lifecycle/` (#780 R2)
  - `design/design_handoff_monetization_failure_a11y_microcopy/` (#782 R2)
- **Eng infra spec (TO WRITE):** [#775](https://github.com/HartiganHM/concert-crawl/issues/775) — this is Phase 1
- **Resend infra ownership:** [#849](https://github.com/HartiganHM/concert-crawl/issues/849) — recommended resolution is folding into #775; this plan assumes that resolution
- **Beta-to-launch plan:** `docs/superpowers/specs/2026-05-09-beta-to-launch-design.md`

## The Founder claim window mechanism

This is the load-bearing trick that lets us **complete the feature weeks before launch without exposing the Founder claim window until launch day**.

### Schema (defined in #775)

A single config row in a `founder_window` table (or singleton config table — #775 picks the shape):

```
opens_at        timestamptz NULL       -- NULL pre-launch; set to NOW() on launch day
seats_total     integer    NOT NULL    -- 100 (locked per #781)
seats_remaining integer    NOT NULL    -- starts at 100; decrements atomically per claim
window_days     integer    NOT NULL    -- 30 (locked per #781 — "First 100 or 30 days")
```

`closes_at` is computed as `opens_at + (window_days || ' days')::interval`.

### Pre-launch state (`opens_at IS NULL`)

- **UI:** Founder tier card shows `"Opens at public launch"` in the scarcity rail instead of a countdown. The CTA either renders disabled with hover/tap copy "Available at launch" OR routes to a soft waitlist (Design call — defer to Phase 3 implementation).
- **Server-side gate:** Every Founder checkout / claim endpoint short-circuits with `403 Founder window not open` if `opens_at IS NULL`. This is **not** UI-only — the gate is in the API, so a determined user editing client state can't beat it.
- **Stripe products:** Founder product + price live in Stripe live mode the whole time. Gating is in our DB, not Stripe. **Rationale:** test/live mode swaps at launch are operationally messy and a known footgun. Keeping Stripe in live mode the whole pre-launch period means we exercise the real payment path during staging validation.
- **Admin testing:** Admin-only "simulate Founder claim" route lets us E2E the atomic-claim logic before launch without flipping `opens_at`. Bypasses the gate via admin Clerk role check, decrements a separate `seats_remaining_test` counter scoped to a feature flag — never touches production seat count. (#775 details this.)

### Launch day state (`opens_at` set)

- Admin runs a single SQL: `UPDATE founder_window SET opens_at = NOW()` (with audit log entry). That's the launch trigger.
- UI re-renders countdown on next paint based on `closes_at - NOW()`.
- Atomic claim happens via single SQL hop, no race:

```sql
UPDATE founder_window
SET seats_remaining = seats_remaining - 1
WHERE seats_remaining > 0
  AND opens_at IS NOT NULL
  AND opens_at < NOW()
  AND closes_at > NOW()
RETURNING seats_remaining;
```

- Stripe checkout for the Founder price is created **after** the seat is reserved (decrement succeeds). If the Stripe charge fails / abandons, the seat is restored via a webhook handler on `checkout.session.expired` or `payment_intent.payment_failed`.

### Window close (`closes_at < NOW()` OR `seats_remaining = 0`)

- UI flips Founder tier card to "Window closed — Premium or Supporter remain available" or similar (Design copy, Phase 3).
- Server-side gate fires on every Founder checkout attempt with `410 Founder window closed`.
- No automated reopening — if we want to extend, admin updates `window_days` or `closes_at` directly with audit logging.

### Why this works for "build ahead, trigger at launch"

The feature ships fully built. Pre-launch, the Founder tier is visible-but-coming-soon. We can run staging validation, integration tests, and admin smoke tests against the live infrastructure for as long as we need before launch. On launch day, one SQL UPDATE flips the world.

The same DB row also serves the "First 100 OR 30 days" close condition without any cron job or separate timer infra — both checks live in the WHERE clause of the atomic claim.

## Sequenced phases

Each phase has a **gate**: criteria that must be true before the next phase starts. Phases can overlap when explicitly noted (e.g., Phase 4 + Phase 5 are independent and can be parallelized).

### Phase 0: Pre-flight (already done — keep verified)

- [x] All four design briefs merged (#823, #813, #820, #846)
- [x] All four design handoffs reviewed Green (audit verdicts in respective `READINESS.md`)
- [x] #849 (Resend ownership) opened
- [x] CLAUDE.md design-pipeline + plan-PR conventions
- [ ] **Decision needed (Hugh, before Phase 1):** Resolve #849 → fold into #775 (recommended) or stand it up independently. Plan assumes folding.
- [ ] **Decision needed (Hugh, before Phase 1):** Confirm Stripe account is live-mode-ready (production webhooks endpoint reachable, idempotency key strategy agreed, signing secrets in env-var plan).

**Gate to Phase 1:** Both decisions confirmed.

### Phase 1: Eng infra spec — #775 (1 PR, plan-PR class)

The single biggest plan-blocker. Hybrid synth: Claude drafts by synthesizing the four design briefs; Hugh weighs in on 3–4 critical architecture calls.

**Scope (per #775 issue body + this plan's amendments):**

- Schema expansion (expand/contract):
  - `subscription_tier` pgEnum → 4 values (`free`, `supporter`, `premium`, `founder`)
  - `UserPlan` type → 6 values (`free`, `supporter`, `premium`, `founder`, `gifted`, `logged-out`)
  - `founder_window` config table (per the mechanism above)
  - `subscription_event` audit table (cancel / upgrade / downgrade / failed-payment)
  - `past_due_banner_dismissed_at` user column (per #782 predicate)
- Stripe wiring:
  - SDK install (`stripe` server + `@stripe/stripe-js` + `@stripe/react-stripe-js` web)
  - Env vars (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`)
  - Checkout / portal / webhook endpoints
  - Signature verification + idempotency strategy
- `derivePlan` rewrite — replace current `'founder'` default with `'free'`/`'logged-out'`
- Entitlements helper (`hasFeature(plan, feature)`) backed by a constant map matching #781's matrix
- Founder window:
  - Seat counter atomicity (single SQL hop)
  - Admin SQL for `opens_at` flip
  - Webhook handler for seat restoration on abandoned checkout
- **Resend infra (from #849 fold-in):** Resend SDK install, sender domain setup, template registration scaffolding, plain-text fallback handling, retry/idempotency for transactional sends
- Past-due banner predicate evaluation (per #782 session-start logic)
- Dunning timer (7-day window per #782; dunning_2 / dunning_3 trigger schedule per #783)
- Card-expiry pre-warning timer (30/14/7 days per #783)
- Gift-ending notice timer (7 days before gift expiry per #783)
- Analytics events for the monetization funnel (PostHog or similar)

**Hugh's critical calls during draft:**
1. Schema shape — singleton `founder_window` table vs. config-table row
2. Customer portal pattern — Stripe-hosted vs. embedded
3. Founder counter atomicity verification — agree on the WHERE-clause approach above
4. Resend ownership — confirm fold-in per #849 recommendation
5. Webhook idempotency strategy — DB-backed (insert-if-not-exists on event ID) vs. event-table-lookup

**Deliverable:** Eng infra design spec at `docs/superpowers/specs/2026-06-27-monetization-eng-infra-design.md` (or similar date). Same review pattern as the four design briefs (Copilot review loop, ≥2 successful rounds, merge at Low/Nit floor).

**Gate to Phase 2:** Spec PR merged. #849 closed (linked from #775 update if folded).

### Phase 2: Schema migration + Stripe wiring core (3 PRs)

Builds the bones. No user-visible changes; all behind feature gates.

**PR 2.1 — Schema expand (1 PR)**
- Add `subscription_tier` enum values (expand only — keep `free`/`premium`, add `supporter`/`founder`)
- Create `founder_window` config table (seed row with `opens_at = NULL`, `seats_total = 100`, `seats_remaining = 100`, `window_days = 30`)
- Create `subscription_event` audit table
- Add `past_due_banner_dismissed_at` column to users
- Migration tested staging-first per the staging/prod auto-deploy in #786

**PR 2.2 — Stripe SDK install + env vars + checkout endpoint skeleton (1 PR)**
- SDK installed
- `.env.example` updated for `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` / `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `POST /v1/billing/checkout-session` endpoint — accepts tier, returns Stripe checkout URL
- Endpoint is server-side gated by `founder_window.opens_at IS NOT NULL` for Founder tier; returns 403 pre-launch
- No UI yet — endpoint is tested via curl + integration tests
- Founder window decrement logic wired (atomic claim SQL)

**PR 2.3 — Webhook handler + customer portal endpoint + idempotency (1 PR)**
- `POST /v1/webhooks/stripe` with signature verification
- Webhook events handled: `checkout.session.completed`, `invoice.payment_succeeded`, `invoice.payment_failed`, `customer.subscription.deleted`, `customer.subscription.updated`, `checkout.session.expired`, `payment_intent.payment_failed`
- Each handler writes to `subscription_event` for audit
- Idempotency: insert event ID into a `processed_webhook_events` table; ON CONFLICT DO NOTHING short-circuits replay
- `POST /v1/billing/portal-session` — Stripe-hosted portal redirect
- Seat restoration on failed/abandoned Founder checkouts (per the mechanism above)

**Gate to Phase 3:** All 3 PRs merged. Integration tests cover atomic claim race (decrement under concurrent load). Staging validation: trigger a real Stripe test-mode checkout end-to-end against staging.

### Phase 3: Plan + entitlements + tier picker UI (4 PRs)

`derivePlan` rewrite + the UI surfaces from #781 (tier picker + entitlements matrix).

**PR 3.1 — `derivePlan` rewrite + entitlements helper (1 PR)**
- `derivePlan` reads from `subscription_tier` + Clerk `publicMetadata.premium_gifted` flag
- Returns one of 6 values (`free`, `supporter`, `premium`, `founder`, `gifted`, `logged-out`)
- `hasFeature(plan, feature)` pure function backed by the entitlements matrix (`packages/entitlements` or similar)
- Test coverage: every (plan × feature) combo
- No UI changes — pure logic + tests

**PR 3.2 — Tier picker UI (1 PR — #781 handoff implementation)**
- Implement the locked tier picker from `design/design_handoff_monetization_tier_states/`
- Founder tier card variants: pre-launch ("Opens at public launch") vs. live countdown vs. closed
- Price-promise microcopy line (per #782)
- All 9 themes verified (use design-review skill)
- Mobile + desktop parity

**PR 3.3 — Entitlement gating across consumer surfaces (1 PR)**
- Audit existing consumer surfaces (event detail, browse, watching, history) for hard-coded premium/free assumptions
- Replace with `hasFeature(plan, feature)` calls
- Concert history + calendar export gated to paid tiers
- Watching free for all (per locked decision)

**PR 3.4 — Settings/plan page (1 PR — #780 partial — current plan card section)**
- "Your plan" surface in settings with current-tier card + manage subscription CTA → Stripe portal
- Per-tier card content matching the locked #781 + #780 matrix
- Past-due variant (per #782) rendered when applicable

**Gate to Phase 4:** All 4 PRs merged. design-review pass against #781 + #780 handoffs. Staging validation: walk every plan combination through the tier picker.

### Phase 4: Payment + lifecycle + failure surfaces (5 PRs — can parallelize 4.3 + 4.4)

The biggest phase by surface count.

**PR 4.1 — Payment surface (1 PR — #780/#781 handoff)**
- Stripe Elements integration on the embedded payment surface
- Above-CTA legal block (per #782 microcopy)
- Bottom mono rail (per #782 microcopy)
- SCA region conditional disclosure (per #782; region detection logic from #775)
- Mobile sheet + desktop modal parity

**PR 4.2 — Lifecycle takeover + day-13 banner (1 PR — #780 handoff)**
- Trial-end takeover (auto-route to `/settings/plan`)
- Day-13 banner with per-trial-expiry single-fire state predicate
- Founder post-claim "Founder #N of 100" takeover

**PR 4.3 — Past-due Plan card variant + dismissible top-of-app banner (1 PR — #782 handoff)** *(parallelizable with 4.4)*
- Plan card warning variant
- Top-of-app banner with per-session dismiss state (per #782 predicate)
- Suppressed during active payment flow
- Stripe portal CTA for "Update card"

**PR 4.4 — Failure surfaces (1 PR — #782 handoff)** *(parallelizable with 4.3)*
- 5 payment failure surfaces (insufficient_funds, expired_or_incorrect_card, issuer_declined, fraud_block, network_timeout)
- 3DS + SCA challenge mount chrome
- `decline_code` → category mapping (from #775)
- Sour Patch voice; never the word "fraud" in user-facing copy
- Mobile sheet + desktop modal parity, full a11y annotation pass

**PR 4.5 — Cancel / downgrade / upgrade flows (1 PR — #780 handoff)**
- In-app cancel flow with grandfather-forever messaging
- Downgrade pathways (Premium → Supporter, etc.)
- Upgrade pathways with prorated billing handling
- Hybrid management split: in-app for emotional moments, Stripe portal for tooling-heavy operations

**Gate to Phase 5:** All 5 PRs merged. design-review pass against #780 + #782 handoffs. Full E2E test suite covers tier upgrade, downgrade, cancel, past-due, 5 failure categories. Staging validation: walk every lifecycle state.

### Phase 5: Email templates + Resend wiring (3 PRs)

Per #783. Can run in parallel with Phase 4 if Resend infra is folded into #775 and shipped in Phase 2.

**PR 5.1 — Resend sender domain + template scaffolding (1 PR)**
- Sender domain configured (DNS records, DKIM/SPF/DMARC)
- Resend SDK wired in `apps/api`
- Template registration scaffolding (HTML + plain-text fallback)
- Trigger-from-webhook handlers stubbed (welcome_paid, welcome_gifted, renewal_receipt_monthly, dunning_1/2/3, card_expiring_soon, cancellation_ack, gifting_ending_notice, winback)
- Email-only palette constants

**PR 5.2 — Welcome + receipt + lifecycle templates (1 PR)**
- `welcome_paid` (3 tier variants — Premium/Supporter/Founder)
- `welcome_gifted`
- `renewal_receipt_monthly` with tax-record block + extensible template vars (`{charge_date}`, `{customer_id}`, `{stripe_receipt_url}`)
- `cancellation_ack`
- All voice + format locks per #783

**PR 5.3 — Dunning + reminder + win-back templates (1 PR)**
- `dunning_1_card_declined` (Day 0)
- `dunning_2_still_declined` (Day 3–4)
- `dunning_3_final_warning` (Day 7)
- `card_expiring_soon` (30/14/7 day cadence via `{days_remaining}` var)
- `gifting_ending_notice`
- `winback` (basic single-email shape)
- Dunning + expiry + gift-ending timer wiring

**Gate to Phase 6:** All 3 PRs merged. Email rendering validated across Gmail / Apple Mail / Outlook web (Litmus or equivalent). Sender domain reputation initialized.

### Phase 6: Admin + analytics + launch prep (3 PRs)

**PR 6.1 — Admin Founder-window control + admin dashboard tile (1 PR)**
- Admin UI surface to flip `opens_at` (with confirmation modal — single click cannot launch the world)
- Admin tile: seats remaining, window state, recent claims
- Audit log entry for `opens_at` flip
- Read-only "simulate claim" button for pre-launch testing (per the mechanism above)

**PR 6.2 — Analytics + monetization funnel events (1 PR)**
- Analytics stack confirmed in #775 (PostHog is referenced in the beta-to-launch plan but not yet wired — #775 either ships PostHog setup as a precursor PR or scopes monetization events against whatever stack is current)
- Events: `tier_card_view`, `checkout_started`, `checkout_completed`, `payment_failed`, `cancel_started`, `cancel_completed`, `founder_window_view`, `founder_claim_attempted`, `founder_claim_succeeded`
- Funnel dashboard config

**PR 6.3 — Launch day runbook + smoke test (1 PR)**
- Runbook at `docs/runbooks/monetization-launch.md`
- Pre-launch checklist (verify Stripe webhooks reachable, sender domain reputation OK, seat count = 100, opens_at = NULL)
- Launch-day SQL command (the `UPDATE founder_window SET opens_at = NOW()` plus audit log)
- Post-launch smoke test (Playwright spec that walks first-claim path on prod with a synthetic user)
- Rollback procedure (set `opens_at` back to NULL if everything is on fire)

**Gate to Phase 7:** All 3 PRs merged. Staging exercise: simulate the launch-day flip + run the post-launch smoke test against staging. Hugh signs off on the runbook.

### Phase 7: Launch day

Not a PR — an operational sequence. Run when Hugh decides we go.

**T-7 days:**
- Final staging full E2E walk
- Litmus email render check on the latest templates
- Stripe webhook reachability confirmed (live mode)
- Sender domain reputation confirmed
- Founder seat count = 100 verified in prod DB

**T-1 day:**
- Communications drafted (the announcement that triggers user awareness of the Founder window)
- On-call rotation confirmed for the first 48 hours

**T-0 (launch):**
1. Hugh runs the admin UI flip OR the SQL command from the runbook (single action, audit-logged)
2. Post-launch smoke test fires automatically (or Hugh runs it)
3. Watch the funnel dashboard for the first ~50 minutes
4. If anything looks wrong, rollback procedure: SQL to set `opens_at = NULL` — Founder UI reverts to pre-launch state, no further claims accepted

**T+1 day:**
- Verify first ~24 hours of charges settled
- Verify dunning timer accuracy on the first batch of declined cards
- Read the first batch of Sentry / Vercel logs for hot paths

## Rollback strategy

| Failure mode | Rollback |
|---|---|
| Stripe webhook missing events | Replay from Stripe dashboard; idempotency table prevents duplicate processing |
| Wrong tier granted to user | Manual fix in admin UI + audit log entry; rollback via re-deriving plan after correction |
| Founder seats undercounted | Compare `seats_remaining` against actual successful `checkout.session.completed` events with Founder price; admin SQL to reconcile |
| Founder window opened by mistake | `UPDATE founder_window SET opens_at = NULL` — UI reverts, server gate fires; any claims already in progress complete via Stripe but no new ones accepted |
| Schema migration breaks deploy | Expand/contract pattern means we always have a backout — revert the deploy, no destructive changes ever |
| Email rendering broken | Resend templates are version-controlled in the API repo; hotfix + redeploy. Worst case: pause non-critical templates (winback first, then card_expiring, then dunning_2/3) via a kill-switch column on `email_template_config` |
| Past-due banner showing for wrong users | Predicate eval is read-only; ship a hotfix to the predicate. No data needs rollback |

## Human checkpoints

| Checkpoint | When | What Hugh decides |
|---|---|---|
| Phase 0 close | Now | Resolve #849 (fold/separate); confirm Stripe live-mode readiness |
| Phase 1 mid-spec | During #775 draft | Schema shape, portal pattern, idempotency strategy, atomicity verification |
| Phase 3 design review | Per PR | Verify token-color use across all 9 themes + design-review skill output |
| Phase 5 voice review | PR 5.2 + 5.3 | Read every template's subject + body; confirm voice locks |
| Phase 6 runbook sign-off | Before Phase 7 | Walk the runbook end-to-end on staging |
| Phase 7 launch trigger | T-0 | The actual `opens_at` flip — Hugh's call, Hugh's hand on the keyboard |

## What this plan does NOT cover

- **#794 logged-out app UX** — adjacent design ticket, not gating; can land independently
- **Track 2 design queue** (#762, #763, #764, #752) — independent of monetization
- **Marketing email infra** — out of scope per #783
- **Annual billing** — deferred per #783 (template extensible to annual via vars)
- **Internationalization beyond required disclosures** — out of scope entirely
- **Admin refund / dispute tooling** — separate ticket (different audience)
- **#794-adjacent paywall surfaces for logged-out users** — handled by #794 when it runs

## Cross-references

- **Design pipeline workflow:** `docs/superpowers/design-pipeline.md`
- **Beta-to-launch plan:** `docs/superpowers/specs/2026-05-09-beta-to-launch-design.md`
- **Original Readiness Review:** `design/design_handoff_monetization/READINESS.md` (🔴 Red verdict — all 11 items addressed across the four design briefs)
- **Render workspace** (Stripe-relevant infra): `~/.claude/projects/.../memory/reference_render_workspace.md`
- **Neon DB access** (schema migrations): `~/.claude/projects/.../memory/reference_neon_db_access.md`
