# Monetization Emails — #783 brand pass

Hi-fi templates for the 10 emails locked in the #783 brief (PR #846). Picks up
where the brief left off: the monetization eng infra shipped these as basic
Resend defaults with zero brand identity — this is the design pass that makes
them read as Concert Crawl.

Open **`Monetization Emails.html`** — a design canvas. Pan/zoom, drag to
reorder, click any artboard to focus (←/→/Esc). Each rendered email sits next to
its subject + preheader lock, plain-text fallback, and a decisions note.

---

## The email DNA (inherited, not reinvented)

Established in `design/design_handoff_spotify_sync/digest-email.jsx` (the weekly
digest, same #783 family). This family sits alongside it and matches
deliberately:

- **Inline hex, single palette.** Email clients can't parse CSS custom
  properties, so this is the *one* place we don't use `var(--*)` tokens. Single
  electric-derived palette (`ME` in `email-primitives.jsx`), **not** per-user
  themed (Hugh dropped the theme ask 2026-07-15 — send-pipeline complexity beats
  the incremental cohesion).
- **Table layout, mobile-first.** 600px card on a `#04050C` page, 320px-safe.
- **Type.** Inter for text; JetBrains Mono for eyebrows + metadata (uppercase,
  tracked). Wordmark is the canonical `concert` + `crawl.` lockup.
- **Plain-text fallback for every template** — shown beside each render.
- **Footer contract.** Per-family unsubscribe first, all-email-settings second,
  `manage subscription` where a payment relationship exists (never on Gifted),
  `Concert Crawl · Denver, CO`. From-name `Concert Crawl <billing@concertcrawl.app>`.

## What this improves on (vs. the prod defaults)

| Prod today | Hi-fi |
|---|---|
| Welcome: plain blue serif headline + bullet list | Branded shell, tier-aware accent + badge, feature acknowledgment, price promise |
| Receipt: green headline + bare data table | Signal-cyan amount hero (**generic green retired**), formal data block, outcome-led subject |
| Subject "Your monthly receipt from Concert Crawl" | "Premium's paid up for July." — leads with outcome, not object |

Tier accent maps to the app tier shells: **Premium = signal**, **Supporter =
accent**, **Founder = signal + accent halo**, **Gifted = accent**.

---

## The 10 templates

| # | Template | Component | Notes |
|---|---|---|---|
| 1 | Welcome · Premium | `WelcomeEmail tier="premium"` | Full feature acknowledgment + price promise |
| 2 | Welcome · Supporter | `WelcomeEmail tier="supporter"` | Badge only; "no Premium unlocks, that's the point"; accent CTA |
| 3 | Welcome · Founder | `WelcomeEmail tier="founder" seat={n}` | Seat #N of 100 stamp, $3-locked, **understated (no exclamation)** |
| 4 | Welcome · Gifted | `WelcomeEmail tier="gifted"` | Gratitude beat; **no manage-subscription CTA** (comped) |
| 5 | Monthly receipt | `ReceiptEmail period="monthly"` | Lean+ tax-record fields |
| 6 | Annual receipt | `ReceiptEmail period="annual"` | + "two months on the house" note |
| 7–9 | Dunning 1 / 2 / 3 | `DunningEmail step={1\|2\|3}` | De-blamed gentle ramp, 3-step tracker |
| 10 | Cancellation ack | `CancellationEmail` | Confirmation, **not a pitch** |
| — | Win-back | `WinbackEmail` | Basic shape: single hero block + one CTA |
| — | Founder receipt | `ReceiptEmail tier="founder"` | Subtle price-promise line under the amount |

(The brief counts welcome_paid as one template with 3 tier variants → 10.)

## Files

| File | What it does |
|---|---|
| `README.md` | This file — DNA, template inventory, prod-vs-hi-fi comparison, voice guardrails |
| `READINESS.md` | Design Readiness Review verdict (🟢 Green), per-template guardrail checks, deferred prototype-polish |
| `Monetization Emails.html` | The canvas — 5 sections, all renders + plain-text + notes. **Requires network access** (loads React/Babel from unpkg + Inter/JetBrains Mono from Google Fonts, same convention as sibling handoff canvases). |
| `email-primitives.jsx` | `ME` palette + shared atoms (shell, header, button, footer, tier badge, data table, price promise, seat stamp, plain-text renderer) |
| `email-welcome.jsx` | `WelcomeEmail`, `WELCOME_COPY`, `welcomePlain` |
| `email-receipts.jsx` | `ReceiptEmail`, `RECEIPT_COPY`, `receiptPlain` |
| `email-dunning.jsx` | `DunningEmail`, `DUNNING_COPY`, `dunningPlain` |
| `email-lifecycle.jsx` | `CancellationEmail`, `WinbackEmail`, `LIFECYCLE_COPY`, `cancellationPlain`, `winbackPlain` |
| `design-canvas.jsx` | Canvas chrome (copied dep, unchanged) |

Every subject + preheader is exported in the `*_COPY` maps for a direct lift
into `copy.ts` at build. Body copy lives in the components.

---

## Voice guardrails honored (Sour Patch bar, #782)

- Honest + slight cheek, never blamey. Formal-ish for receipts (tax record);
  casual for welcome / win-back.
- **Dunning** de-blamed, gentle ramp: *"give it a refresh?"* → *"we're still
  trying"* → *"pauses tomorrow if we can't get a fresh one."* Amber = calm
  attention, never alarm red; CTA stays branded signal. **Never the word
  "fraud", never "last chance!".**
- **Cancellation** is a confirmation surface, not a sales pitch — no win-back
  hook, no urgency, no countdown. The only affordance is a neutral *Manage
  subscription*.
- **Win-back** — single hero block + single CTA. No "we miss you", no countdown,
  no discount gimmick.
- **Founder** understated (no exclamation). **Gifted** gratitude, comped, no
  billing affordance.

## Illustrative data (swap at integration)

Sample values are placeholders: seat `#37`, `Visa ·· 4242`, `cus_Qk28fLp0`,
dates `Jul 15, 2026`, annual `$50`. Eng wires the real template variables
(`{amount}`, `{charge_date}`, `{tier_name}`, `{customer_id}`,
`{stripe_receipt_url}`, `{period_end}`, card last-4, seat number).

## Open for Hugh's audit

- Final voice pass on all subjects + bodies (Track 2 audit).
- Annual price shown as `$50/yr` (illustrative) — confirm the real annual number.
- Confirm the dunning cadence day-offsets for the 3-step tracker copy.
