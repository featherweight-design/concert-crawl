# Monetization · Failure States, A11y & Microcopy (#782 · Round 1)

> Extends `design_handoff_monetization/` (PaymentSurface + Plan card) and sits on
> top of `design_handoff_monetization_tier_states/` (#781 — locked picker/matrix/
> atoms) and `design_handoff_monetization_lifecycle/` (#780 — Plan card variants,
> day-13 banner, takeover). **Nothing from #781 or #780 is redesigned.** This round
> adds the failure edge-cases, the past-due surfaces, the required microcopy, and a
> full a11y annotation sweep.
> Status: **first pass, ready for Hugh's review.**

Open `Failure States + A11y + Microcopy.html` and toggle **Tweaks** in the toolbar
to drive the §0 live preview (surface · failure category · challenge kind · tier ·
trial · SCA region · all 9 themes).

Source of truth: `docs/superpowers/specs/2026-06-26-monetization-failure-a11y-microcopy-design.md`.

---

## What's here

| File | What it does |
|---|---|
| `Failure States + A11y + Microcopy.html` | The canvas — 11 sections, mobile + desktop throughout. |
| `failure-surfaces.jsx` | `<FailureSurface category variant tierKey trial/>` (5 categories) + `<ChallengeMount kind variant/>` (3DS/SCA). `FAILURE_CONFIG` is the copy map. |
| `past-due.jsx` | `<PastDueBanner variant inline/>` — warning-toned top-of-app banner (mirrors #780's day-13 chrome). |
| `microcopy.jsx` | `<LegalBlock scaRegion/>`, `<BottomMonoRail/>`, `<PricePromiseLine tier/>` + `PRICE_PROMISE` copy map. |
| `monetization-payment.jsx` | **#782-extended copy** of the locked PaymentSurface — adds the above-CTA `<LegalBlock/>` + refined `<BottomMonoRail/>` + `scaRegion`/`showLegal` props. Original stays locked. |
| `lifecycle-plan-cards.jsx` | **#782-extended copy** — adds the `past-due` branch to `getLifecycleContent` (warning tone, portal-bound `Update card`) on the locked card shell. |
| `a11y.jsx` | Annotation primitives + composites: `<AnnotatedFailure/>`, `<AnnotatedChallenge/>`, `<AnnotatedPastDue/>` (overlays), `<A11yBackTable/>` (back-annotation), `<SRScript/>` (walkthroughs). |
| `theme-context.jsx`, `ios-frame.jsx`, `design-canvas.jsx`, `tweaks-panel.jsx`, `monetization-shared.jsx` | Canonical deps, copied verbatim (9-theme tokens). |

---

## Sections in the canvas

0. **Live preview** — any surface wired to Tweaks (all 9 themes).
1. **Failure surfaces · mobile** — 5 categories, bottom sheets.
2. **Failure surfaces · desktop** — same 5, modals.
3. **3DS / SCA challenge mounts** — chrome around Stripe's iframe, mobile + desktop.
4. **Past-due Plan card variant** — mobile + desktop + Supporter context.
5. **Past-due top-of-app banner** — pinned strip (mobile + desktop) + inline variant.
6. **Required microcopy** — legal block (default + SCA), bottom rail, price-promise on tier cards, + in-context PaymentSurface.
7. **A11y annotations · #782 surfaces** — numbered callout overlays.
8. **A11y back-annotation · #781 + #780** — spec table.
9. **Screen-reader walkthroughs** — tier matrix, payment surface, trial-ended takeover.
10. **Theme parity** — failure / challenge / past-due across Light + genre themes.

---

## Decisions log — the "Open for Design to call" items

The brief left these to Design's judgment. Calls made for this pass (all easy to
flip — flag any you want changed):

1. **Failure headlines → blunt + honest.** "Your bank said no." / "Your bank
   declined it." / "Your card got flagged for review." Locked per the brief's
   honesty-side direction. The `--danger` tone carries the *message*; the forward
   **action button stays `--signal`** (CTA token rule) — we never put the verb on a
   red button.
2. **`fraud_block` → never the word "fraud", no retry-same-card.** Headline "Your
   card got flagged for review."; primary CTA "Try a different card"; one
   **non-CTA** line — "It's worth a quick call to your bank, too." Both per the
   brief's locked dual-action.
3. **`network_timeout` keeps the entered card.** It's not a card problem, so we
   show a "card on file kept — we'll reuse it on retry" note instead of a fresh
   Stripe slot, and a **polite** live-region line — "If it keeps happening, give it
   a minute and try again." (This is guidance for the *user* to wait + retry, not a
   reference to Stripe's automatic retries.)
4. **Above-CTA legal block → stacked mono micro-rows.** Three rows, each a bullet:
   (a) Terms / Privacy / Refund links, (b) auto-renew, (c) conditional SCA notice.
   Keeps every legal line visible (no collapse), eyebrow-weight + `--fg-subtle` so
   it's legally sufficient without shouting. **No "subject to change" disclaimer
   anywhere** — it would undercut the grandfather promise (brief §4).
5. **SCA-region notice → always present for SCA-region users.** Server-set
   (`scaRegion` prop, #775 owns region detection). NOT gated on Stripe's per-charge
   response. Copy: "Your bank may ask to confirm this payment."
6. **Price-promise line → on Supporter + Premium; Founder reinforces.** Supporter
   & Premium (which lacked it) get "Whatever you pay, you pay. We never raise it."
   **Founder keeps its stronger `$3 locked forever` stamp** and gets a complementary
   line ("$3 is $3. New folks may pay double someday — never you.") rather than a
   duplicate. Rendered in a dedicated microcopy row on the card (Design's call vs
   the rationale/punchline slot — the row reads cleanest).
7. **Past-due banner → matches day-13 exactly, warning-toned.** Pinned strip
   (primary) + inline inset variant, `--warning` + card-alert glyph, portal-bound
   `Update card ↗`. **Per-session** dismissible (recurring active alert during
   dunning — gentler than day-13's per-trial single-fire), and **suppressed during
   an active payment flow** so we don't double-stack the alert while they're fixing
   it.
8. **Past-due Plan card → `Update card` sits ALONGSIDE `Manage subscription`.**
   Doesn't replace the manage CTA. Card tone `--warning`; the button stays
   `--signal`; `Update card` is portal-bound (↗) per #780's hybrid split.
9. **A11y annotation format → hybrid** (Hugh's call). Numbered callout **overlays**
   on the net-new #782 surfaces (§7); spec **tables** for back-annotated #781 + #780
   surfaces (§8).
10. **SR walkthrough placement → inline beside the flow** (§9), for cross-reference.
11. **Challenge-mount chrome → honest + calm.** "One quick step from your bank." /
    "Your bank needs a thumbs-up." over a dashed Stripe-owned iframe slot with a
    lock + spinner, "we never see it" framing, and a clear "don't close this window"
    + Cancel path.

---

## Past-due banner show predicate (brief §1 — eng owns the eval in #775)

```
subscription.status = "past_due"
AND (past_due_banner_dismissed_at IS NULL
     OR past_due_banner_dismissed_at < session_started_at)
```

Dismissal sets `past_due_banner_dismissed_at = now`; the predicate then fails for
the rest of the session. On the next session open, `session_started_at` advances
past the dismissal timestamp and the predicate flips true again → **single-fire per
session**, not per dunning-window. No takeover during the 7-day dunning window —
past-due is a quiet-but-persistent signal, not an interrupt. If the window expires
and the user rolls to Free, that's #780's existing post-cancel-grace Free state.

---

## The 5 failure categories (copy + affordance)

Eng infra (#775) owns the `decline_code` → category mapping; the example codes
below are guidance only. Categories 1–4 map from `decline_code`; category 5 maps
from non-decline error sources (network failure, request timeout, Stripe API 5xx).

| Category | Example codes | Headline | Forward action |
|---|---|---|---|
| `insufficient_funds` | `insufficient_funds` | "Your bank said no." | Try again · Use a different card |
| `expired_or_incorrect_card` | `expired_card`, `incorrect_cvc`, `incorrect_number`, `invalid_expiry_*` | "That card won't go through." | Try again (Elements re-renders empty) · Use a different card |
| `issuer_declined` | `do_not_honor`, `generic_decline`, `card_velocity_exceeded`, `currency_not_supported` | "Your bank declined it." | Try a different card (reset in place) |
| `fraud_block` | `fraudulent`, `stolen_card`, `lost_card`, `pickup_card`, `restricted_card` | "Your card got flagged for review." | Try a different card — **no retry-same-card**; non-CTA "call your bank" line |
| `network_timeout` | network failure / timeout / Stripe API 5xx (no `decline_code`) | "That didn't go through — but it's not your card." | Try again (keeps entered card) + polite wait-and-retry line |

**Retry shape (hybrid, brief §3):** active payment flow → reset PaymentSurface in
place (Stripe Elements re-renders). Past-due context → Stripe portal (`Update card`).
`fraud_block` → no retry-same-card path on either route.

---

## A11y sweep (WCAG AA)

§7 annotates the **new** surfaces with numbered overlays; §8 back-annotates every
**locked** #781 + #780 surface in a spec table; §9 ships the **3 SR walkthrough
scripts** (tier matrix · payment surface · trial-ended takeover). Highlights:

- **Failure surfaces + challenge mounts:** failures are `role="alertdialog"` +
  `aria-modal` with the headline an `aria-live="assertive"` region (an error is an
  interrupt); focus moves to the primary action; Escape dismisses to the picker.
  Challenge mounts are `role="dialog"` around Stripe's iframe (Stripe owns the
  iframe's internal a11y; we annotate the chrome).
- **Past-due banner:** `role="region"` + `aria-label`, `aria-live="polite"` (it
  appears between sessions, never mid-interaction), labelled dismiss.
- **One correct assertive use** in the whole flow is the trial-ended takeover mount
  ("Your Premium trial has ended"); everything else (counts, countdowns, banners) is
  polite. `aria-current="true"` (not `"page"`) marks the current-plan column.

---

## Locked decisions honored (from the brief)

- **Voice = Sour Patch**, honesty side. Failures are blunt, not blamey or whiny.
- **Token-only across all 9 themes**; `--danger` for blocking failures, `--warning`
  for past-due. Mobile + desktop parity on every surface.
- **Grandfather everyone forever** — no price hikes on existing users; no "subject
  to change" disclaimer; price-promise microcopy on paid tier cards.
- **Reuse locked atoms** (`SheetChrome`, `ModalChrome`, `RailHeader`, `MonoEyebrow`,
  `TierSummaryRail`, `StripeElementsSlot`, `DragHandle`, `MMark`); past-due banner
  pattern-matches the day-13 banner; past-due card extends the locked Plan-card shell.

---

## Out of scope (owned elsewhere — do not pull back in)

- Subscription lifecycle / cancel / downgrade / upgrade / manage → **#780** (✅).
- Tier picker visuals, entitlements matrix, scarcity rail, founder/gifted → **#781** (✅).
- Email touchpoints incl. payment-failed-N + dunning → **#783**.
- Stripe wiring, `decline_code` → category mapping, SCA region detection,
  `past_due_banner_dismissed_at` schema + session-start check, customer-portal
  endpoint, failure webhooks → **#775**.
- Multi-card / saved cards → **Stripe portal** (not designed here).
- Logged-out broader UX → **#794**. Admin refund/dispute tooling → separate ticket.
- I18n beyond required disclosures → out entirely.

---

## Dev / handoff notes

- `monetization-payment.jsx` and `lifecycle-plan-cards.jsx` here are **#782-extended
  copies** — the originals in `design_handoff_monetization*/` stay locked. Diffs are
  small and commented (`#782 EXTENSION` / `#782 addition`).
- The failure surfaces render `role="alertdialog"` + the assertive headline + focus
  hints as real attributes so eng can lift the semantics directly.
- `~80 new copy slots` (failure × 5, challenge × 2, past-due, legal, price-promise)
  externalize to `copy.ts` at integration per `feedback_definitions_copy_rule`.
- **Sequencing (resolves #780 §8's flag):** this round's past-due Plan card variant
  should ship in lockstep with or before #780's implementation so `past_due` users
  aren't shown a stale "Active" card during the gap.
