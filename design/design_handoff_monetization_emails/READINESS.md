# Design Readiness Review — monetization emails (#783 brand pass)

**Verdict: 🟢 Green — ready for implementation**

Design shipped hi-fi templates for all 10 emails locked in the #783 brief. Every
guardrail I flagged in the handoff prompt is honored, the family reads as
Concert Crawl (not generic SaaS transactional), and it inherits DNA cleanly from
`digest-email.jsx` so the two live sends land as one system.

Three "open for Hugh's audit" items in the README are addressed inline below;
they resolve to prototype-polish nits the plan PR picks up during integration.

---

## Scope validated

10 templates covered by 4 email files + 1 shared atoms file:

| # | Template | Component | Guardrail check |
|---|---|---|---|
| 1 | Welcome · Premium | `WelcomeEmail tier="premium"` | ✅ Full feature acknowledgment + price promise |
| 2 | Welcome · Supporter | `WelcomeEmail tier="supporter"` | ✅ Badge only; "No Premium unlocks — that's the point." explicit; accent CTA "Wear it on your profile" |
| 3 | Welcome · Founder | `WelcomeEmail tier="founder"` | ✅ Seat #N of 100 stamp; $3-locked-forever line; **no exclamation anywhere** (verified) |
| 4 | Welcome · Gifted | `WelcomeEmail tier="gifted"` | ✅ Distinct template, gratitude beat, `showManage={false}` — **no billing affordance on comped users** |
| 5 | Monthly receipt | `ReceiptEmail period="monthly"` | ✅ Lean+ field set matches Q4 answer exactly; signal-cyan amount hero |
| 6 | Annual receipt | `ReceiptEmail period="annual"` | ✅ "Two months on the house" note; same shape (see caveat below) |
| 7 | Dunning 1 | `DunningEmail step={1}` | ✅ "Give it a refresh?" — no drama; step tracker |
| 8 | Dunning 2 | `DunningEmail step={2}` | ✅ "We're still trying that card." — patient middle |
| 9 | Dunning 3 | `DunningEmail step={3}` | ✅ "Premium pauses tomorrow." — amber only on status/callout, CTA stays signal; kills data-loss fear ("Nothing gets deleted") |
| 10 | Cancellation | `CancellationEmail` | ✅ Confirmation, not a pitch; access-until date prominent; "If this cancel was a surprise, reply" safety valve |
| — | Win-back | `WinbackEmail` | ✅ Single hero + single CTA; no "we miss you", no countdown, no discount |
| — | Founder receipt | `ReceiptEmail tier="founder"` | ✅ Bonus artboard; subtle price-promise line under amount |

## Voice bar (Sour Patch, #782)

- ✅ Grepped: no occurrence of **"fraud"** anywhere in the family
- ✅ Grepped: no **"last chance!"** in body/subject copy (the *step 3 eyebrow* uses
  `"last try"` as a neutral positional label, not a threat — reads as calm status,
  not urgency). **Note:** the current prod `dunning-3-final-warning.ts` subject
  IS `"Last chance — your plan pauses tomorrow"` — the hi-fi design fixes this
  voice-lock violation. Ship it.
- ✅ Founder welcome subject and body carry zero exclamation marks
- ✅ Dunning ramp exactly matches the locked brief shape: "give it a refresh?"
  → "we're still trying" → "pauses tomorrow"
- ✅ Cancellation carries no win-back hook, no countdown, no urgency
- ✅ Win-back has no saccharine ("we miss you") and no discount gimmick

## Improvement over prod (validated)

The prod templates ship as basic Resend defaults with zero brand identity — blue
serif headlines, green amount hero, subject lines that lead with the object
("Your monthly receipt from Concert Crawl") not the outcome. The hi-fi pass:

- ✅ Retires the generic green amount headline (now signal cyan — `#7AE6FF`)
- ✅ Leads receipt subjects with outcome ("Premium's paid up for July.")
- ✅ Introduces branded shell / tier-aware accent / feature acknowledgment
- ✅ Fixes the "Last chance" voice violation in prod dunning-3

## DNA coherence with digest-email.jsx

- ✅ Palette `ME` is electric-derived, matches `DE_C` from digest-email.jsx,
  extended with `amber` for dunning and soft variants for callouts
- ✅ Table layout, 600px card, 320px-safe (same envelope)
- ✅ Wordmark: canonical `concert` + `crawl.` lockup
- ✅ Inter for text, JetBrains Mono for eyebrows + metadata (uppercase, tracked)
- ✅ Footer contract: per-family unsubscribe first, all-email-settings second,
  manage-subscription where a payment relationship exists (never on Gifted),
  `Concert Crawl · Denver, CO`
- ✅ Every template ships a plain-text fallback — verified beside each render

## Tier accent mapping

Matches app tier shells:
- Premium = `ME.signal` (cyan) ✓
- Supporter = `ME.accent` (pink) ✓
- Founder = `ME.signal` + accent-halo gradient ✓
- Gifted = `ME.accent` (pink) ✓

## Answers to Design's 3 open audit items

### 1. Voice pass on subjects + bodies
✅ Complete. All 10 subjects and bodies read tight, hit Sour Patch bar without
overreaching. Founder understated, Gifted grateful, Dunning de-blamed, Cancel
neutral, Win-back low-pressure. Nothing to strip, nothing to add.

### 2. Annual price — "$50/yr" illustrative — confirm real number
❗ **Not yet provisioned.** `scripts/stripe-provision.ts` (lines 8–10)
provisions only three monthly prices: `supporter_monthly $2`, `premium_monthly
$5`, `founder_monthly $3`. There is no `premium_annual` SKU. The annual receipt
template ships **ahead of the SKU** — eng adds the price during the plan PR
integration and decides the actual number. `$50/yr` = two months free vs. $60/yr
(2×$5×12) is a reasonable Design starting point; call it out in the eng plan.

### 3. Dunning cadence day-offsets for the 3-step tracker
✅ Confirmed against prod templates:
- **Step 1** (`dunning-1-card-declined.ts`): **Day 0**, first failed renewal
- **Step 2** (`dunning-2-still-declined.ts`): **Day 3–4**, retry failed
- **Step 3** (`dunning-3-final-warning.ts`): **Day 7**, final retry failed →
  next-day cancellation

Copy aligned to reality inline in R2: `email-dunning.jsx` file header now reads
"~7 days: Day 0 / 3–4 / 7" and step 3 body says *"after a week of trying"*
(was "two weeks").

## 🧹 Prototype polish deferred to build

Non-blocking items eng resolves during plan PR integration:

1. **Annual price SKU not provisioned** — eng adds `premium_annual` to
   `stripe-provision.ts` (or defers the annual template to a follow-on PR that
   ships the SKU + template together)
2. **Sample amounts + IDs are placeholders** — `#37`, `Visa ·· 4242`,
   `cus_Qk28fLp0`, dates `Jul 15, 2026` — eng wires the real template variables
   per the README's "illustrative data" section

None of these are voice, brand, or reachability regressions. They're the
integration seams a good plan PR resolves as part of the build.

**R2 fixes** (applied inline, addressing Copilot R1 comments):
- Dunning step 3 copy aligned to actual 7-day cadence (was "two weeks")
- Dunning `EmHeader` now uses `copy.eyebrow` per step (was hardcoded "Billing")
- Receipt plain-text Stripe URL now uses `{stripe_receipt_url}` template var
  (was literal `…`)
- Welcome `EmHeader` now uses `lede.eyebrow` (was raw lowercase `tier`)
- README digest-email.jsx path corrected to include `design/` prefix
- Tracker "PR TBD" replaced with actual PR #957

**R3 fixes** (applied inline, addressing Copilot R2 comments):
- Tracker shipped-entry count corrected 5 → 3 (matched to row above)
- README Files table gained `README.md` + `READINESS.md` rows + explicit
  network-access note on the canvas HTML (established convention across
  sibling canvases)
- Plain-text footer `{link}` placeholder collision — replaced all 8
  occurrences across 5 files with semantic per-role placeholders:
  `{unsubscribe_url}`, `{email_settings_url}`, `{manage_subscription_url}`

**R4 fix** (applied inline, addressing Copilot R3 comment):
- Founder receipt subject/preheader extracted from canvas HTML into
  `RECEIPT_COPY.founder`; `ReceiptEmail` now selects the copy key by
  `tier === "founder" ? "founder" : period`. README claim that "every
  subject + preheader is exported in the `*_COPY` maps" is now literally
  true.

## What eng picks up

- 10 templates + 1 bonus (Founder receipt) — all copy in `WELCOME_COPY`,
  `RECEIPT_COPY`, `DUNNING_COPY`, `LIFECYCLE_COPY` maps ready for lift into
  `apps/api/src/emails/templates/`
- Palette + shared atoms consolidated in `email-primitives.jsx` — port to the
  existing `apps/api/src/emails/` layout module + palette
- Plain-text fallback renderers per template (`welcomePlain`, `receiptPlain`,
  `dunningPlain`, `cancellationPlain`, `winbackPlain`) — direct lift into the
  `text` field of each `TemplateRenderer`
- Tier-aware branching lives in the component prop (`tier`, `period`, `step`) —
  maps cleanly to the existing `EmailTemplateVars` type
- Footer contract locked (`family`, `showManage`, `note`) — encapsulates the
  per-template unsubscribe + manage-subscription decisions

---

**Reviewer:** Claude (design-track persona)
**Date:** 2026-07-12
**Handoff shipped:** 2026-07-12 (this PR)
