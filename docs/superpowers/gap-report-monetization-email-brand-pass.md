# Gap Report — #783 Monetization Email Brand Pass

Verified via design-review Agent 2 (verify) against the committed property table
`docs/superpowers/design-tables/monetization-email-brand-pass.md` and the full
implementation under `apps/api/src/emails/`.

**VERDICT: 0 visual gaps.** The implementation is an exact port of the design
property table — every hex value, font size/weight, letter-spacing, padding,
and border-radius matches, and every template's copy/footer contract matches.

## IMPLEMENTED

- Palette (`palette.ts`) — all 17 ME hex/rgba tokens, both font stacks,
  TIER_ACCENT, TIER_META, PRICE_PROMISE
- Atoms (`atoms.ts`) — wordmark, monoEyebrow, headerRow, ledeRow, button (signal
  / accent / ghost), tierBadge (founder gradient halo + beta pill), featureList,
  dataTable, callout, pricePromise (subtle + full), seatStamp, footerRow,
  amountHero, statusEyebrow, cardChip, richTextRow, row
- Shells (`layout.ts`) — renderEmailShell / renderTextShell, hidden preheader
  span, legal line "Concert Crawl · Denver, CO", per-family footer contract
- Templates — welcome (premium / supporter / founder / gifted), receipts
  (monthly / annual / founder), dunning 1–3, cancellation, win-back,
  card-expiring, gift-ending: copy, accents, titleSizes, atom order, and footer
  family+showManage all verified

## GAPS

None.

## DEFERRED

None.

## Approved / documented deviations (on the record)

1. **SVG icons render as styled Unicode glyphs.** Gmail/Outlook strip inline
   `<svg>`, so decorative icons are glyphs: `&#10003;` (check), `&#9733;`
   (future star), `&#128274;` (lock). Documented in the `atoms.ts` header.
2. **Receipt card-on-file chip omitted.** The design mock showed a
   "Payment · Visa ·· 4242" row; the `cardChip` atom exists and is used by
   card-expiring-soon, but `receipt-core.ts` does not emit it because card
   brand/last4 are not in the receipt vars contract. Documented in the
   `receipt-core.ts` header (fabricating card data would be misleading).
3. **Receipt billing-period-start row omitted.** The mock showed a
   "Billing period Jul 15 – Aug 15" row; omitted for the same reason — the
   period start is not in the vars contract. Documented in `receipt-core.ts`.
4. **Dunning step-3 copy reconciled.** Design draft said "two weeks"; corrected
   to "a week" to match the actual ~7-day dunning window. Reconciled in the
   property table before implementation.

## Out of scope (follow-up issue)

The `renewal_receipt_annual` template ships here, but the annual billing
pipeline (Stripe `premium_annual` SKU, checkout wiring, renewal webhook that
triggers the annual send) is out of #783 scope — this PR delivers the template

- registry/fixtures/preview/seed only. A follow-up issue tracks the pipeline.
