# Gap Report — Monetization Dunning/Reminder/Winback Emails (PR 5.3)

Design-review verify pass (Agent 2) against the lock table `docs/superpowers/design-tables/monetization-dunning-emails.md`, checking the 6 renderer modules + shared helpers.

## Visual/copy gaps

_None._ All checkable renderer properties across the six templates match the locked design table.

- Every subject sits inside G1's 35–50 char band: dunning_1 = 43, dunning_2 = 48, dunning_3 = 39, card_expiring_soon = 36, gifting_ending_notice = 39, winback = 40.
- Every preheader sits inside G5's 50–100 char band: 80 / 82 / 77 / 76 / 80 / 89.
- Literal-copy locks present verbatim: D2-5 ("Heads up — we're still trying to get this through."), D3-4 ("Your card hasn't cleared — {tierName} pauses tomorrow if we can't get a fresh one.").
- G19 satisfied: the word "fraud" appears only in code comments/tests, never in rendered dunning copy.
- G20 linear escalation confirmed: dunning_1 "give it a refresh?" → dunning_2 "we're still trying" → dunning_3 "pauses tomorrow".
- G13 palette: dunning trio headings use `EMAIL_WARNING_AMBER`; card-expiry + winback use `EMAIL_BRAND_PRIMARY` (heads-up, not failure); gifting uses `EMAIL_ACCENT_PREMIUM`.
- WB-6/WB-8: winback is single-hero, single-CTA, no discount/coupon/percent-off language, not multi-stage.
- Null guards: `tierName` null coalesces on every template (no literal "null" leak); gifter name sanitized + falls back to "a friend of the crawl".

## Out-of-renderer-scope rows (marked, not failed)

Trigger / dedupe / timing rows are owned by the send pipeline (`stripe-webhook-handlers.ts`, already wired in PR 5.1) and the daily billing job (`src/jobs/billing-daily.ts`, this PR): D1-1/D1-2/D1-9, D2-1/D2-2/D2-7, D3-1/D3-2/D3-7, CE-1/CE-6, GE-1/GE-2, WB-1/WB-2, M6.

## Verdict

**0 in-scope gaps.** No code fixes were required by the verify pass, so no Agent 3 confirmation pass was run (per design-review skill: confirm only re-checks previously-flagged items).
