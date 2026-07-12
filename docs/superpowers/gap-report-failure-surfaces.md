# Design Gap Report — Payment Failure Surfaces + 3DS/SCA Challenge (PR 4.4)

Verified against `docs/superpowers/design-tables/failure-surfaces.md` via the design-review skill (Agent 2 dual-pass verify → fixes → Agent 3 confirm).

## Agent 2 verify (commit f20cf770)

**Pass 1 — visual + copy + a11y:** all five failure-category configs (eyebrow / code 01–05 / headline / body / primary / secondary / note) verbatim; FailureStatus danger block (9%/34% color-mix, 22/900/-0.03em assertive headline), card-kept note, RailHeader failure (muted) + challenge (signal) variants, FailureActions matrix (secondary only for 01/02), ChallengeMount + StripeChallengeFrame (dashed frame, `mPaySpin` spinner, lock, verbatim labels) — all match. Voice rules hold: the word "fraud" never renders; forward action stays `--signal`; tokens only; all copy in `definitions/copy.ts`.

**Pass 2 — state reachability:** all seven states reachable end-to-end — five decline categories via `mapDeclineCategory` (packages/types/src/decline-category.ts) wired from `confirmPayment` result errors (thrown/transport errors → `network_timeout`), plus 3DS and SCA challenges via the `retrievePaymentIntent` requires-action poller with `scaRegion` selecting the kind. `freshCard`/`freshEmpty`/`hasSecondary`/note-tone behavior matrix matches the design table per category; webhook side records decline category + raw code in `subscription_events.metadata` only.

**Visual gaps found: 4**

1. Failure-layout stack wrapper gap — 14 → design 13
2. Challenge header — flattened single column (gap 13) → design inner header column gap 10
3. Failure dismiss (Escape / close-X) — no focus management, focus fell to body → design: return to the tier CTA that opened payment
4. Challenge cancel — no focus management → design: return to the payment surface's primary CTA

**State gaps: 1 (adjudicated as accepted deviation)** — trial pricing context not threaded into the failure/challenge tier summary. The shipped checkout surface (PR 4.1) carries no trial framing either; the failure summary is at parity with it. Belongs to the TierSummaryRail/TotalsBlock deviation below.

## Fixes

All 4 visual gaps fixed in commit `fix(web): design-review gaps — spacing, challenge header column, focus return on dismiss/cancel`:

- `gap: isFailure ? 13 : 14` on the surface stack wrapper
- ChallengeMount header column (close row + headline + body) wrapped at gap 10 inside the outer gap-13 column
- `returnFocusTier` in TierPickerSheet → `autoFocusCta` through TierRowMobile/TierCardDesktop → `TierCtaButton` focuses on mount
- `payButtonRef` + surface-transition effect focuses the pay CTA on challenge → checkout

## Agent 3 confirm

All 4 items FIXED with file:line evidence, no regressions in surrounding wiring. **VERDICT: 0 gaps remain — ready to ship.**

## Accepted deviations (documented, not gaps)

- **Tertiary "Save it for later · email me a link" not shipped** — no email-link backend or template exists anywhere in #775/#783; a button promising an email that only dismisses would be deceptive. Same CTA in the checkout design was likewise not shipped in PR 4.1. Follow-up: issue #905.
- **ChallengeMount is chrome around Stripe's own challenge overlay**, driven by polling `retrievePaymentIntent` for `requires_action` — stripe-js v9's Payment Element `confirmPayment` offers no client-side confirm/next-action split, so the challenge iframe cannot be hosted in the frame.
- **Design's SheetChrome/ModalChrome/MMark/TierSummaryRail/TotalsBlock/StripeElementsSlot components** were never shipped in prior checkout PRs — this PR reuses the existing ModalShell chrome (desktop widths 520 failure / 500 challenge honored) and a lean `TierSummaryLine` (no trial framing, at parity with the shipped checkout surface).
- **Headline/body ids `fail-h-{category}` / `chal-h-{kind}`** without variant suffixes — only one DOM instance renders at a time.
- **`alertdialog`/`dialog` roles live on the ModalShell root, not a nested wrapper** (Copilot round 2) — the shell is the single `aria-modal` root in the accessibility tree; failure/challenge surfaces re-role and relabel it via `failureDialogProps`/`challengeDialogProps` instead of nesting a second dialog.
- **`var(--font-mono)`** instead of literal 'JetBrains Mono' — codebase token convention.
- **`validation_error` stays on the checkout layout** — the Payment Element renders its own field-level errors; no decline occurred.
- **"Cancel payment" during a challenge hides the chrome but cannot abort the in-flight `confirmPayment`** — Stripe exposes no client-side abort; an eventual decline still routes to the correct failure surface.
