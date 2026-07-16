# Monetization Emails — Readiness

**Status: 🟢 Green** · 12 / 12 templates hi-fi · #783 family complete

Design pass over the wired Resend defaults. Every template ships branded HTML
(inline hex, single electric palette, 600px table, plain-text fallback) plus a
subject/preheader copy lock in the `*_COPY` maps.

## Scope table

| #   | Template                  | Trigger                  | State | Notes                                              |
| --- | ------------------------- | ------------------------ | ----- | -------------------------------------------------- |
| 1   | welcome_paid · Premium    | New paid subscriber      | 🟢    |                                                    |
| 2   | welcome_paid · Supporter  | New Supporter            | 🟢    | Badge only                                         |
| 3   | welcome_paid · Founder    | New Founder              | 🟢    | Seat #N/100, $3 locked                             |
| 4   | welcome_gifted            | Comped Premium granted   | 🟢    | No manage CTA                                      |
| 5   | receipt_monthly           | Monthly renewal charge   | 🟢    | Lean+ fields                                       |
| 6   | receipt_annual            | Annual renewal charge    | 🟢    | Eng owns SKU/price in build PR                     |
| 7   | dunning_1                 | Charge failed (day ~1)   | 🟢    | "give it a refresh?"                               |
| 8   | dunning_2                 | Retry failed (day ~3)    | 🟢    | "still trying"                                     |
| 9   | dunning_3                 | Final retry (day ~6)     | 🟢    | "pauses tomorrow"                                  |
| 10  | cancellation_ack          | Subscription cancelled   | 🟢    | Confirmation, not a pitch                          |
| 11  | **card_expiring_soon**    | Card expires in 30/14/7d | 🟢    | **Added in sweep** · one template, `days` variable |
| 12  | **gifting_ending_notice** | Gift wraps in ~7d        | 🟢    | **Added in sweep** · no billing affordance         |

Win-back and the Founder receipt variant ship alongside as documented in
`README.md` (win-back = basic shape per brief; Founder receipt = tier variant of #5).

## Added in the build-time sweep (this pass)

Two live, already-wired transactional sends the original handoff never drew.
Both fired from the daily billing job on the old un-branded shell — now on the
family DNA. `card_expiring_soon` was in the original #783 brief and had slipped
through. See `email-notices.jsx` + canvas section 5.

## Open for Hugh's audit

- Final voice pass on the two new templates (Track 2).
- Confirm annual price (illustrative $50) — eng owns in the build PR.
- Confirm dunning + card-expiry day-offsets for the timeframe copy.
