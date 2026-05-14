# Gap Report — Event Detail v2

Branch: `feat/event-detail-v2`
Date: 2026-05-14

## Fix Status

| Fix    | Description                                                        | Status                                                                                                                                                                                                                                                                                                                                                      |
| ------ | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fix 1  | Desktop layout: 880px centered column, -60px hero overlap          | IMPLEMENTED                                                                                                                                                                                                                                                                                                                                                 |
| Fix 2  | Community-handoff card for null-price state                        | IMPLEMENTED                                                                                                                                                                                                                                                                                                                                                 |
| Fix 3  | PrimaryCTA always renders (href="#" fallback)                      | IMPLEMENTED                                                                                                                                                                                                                                                                                                                                                 |
| Fix 4  | Resale color to coral `oklch(0.65 0.20 25)` in EventCard PriceChip | IMPLEMENTED                                                                                                                                                                                                                                                                                                                                                 |
| Fix 5  | SoldOutCTA trigger via `price.status === 'soldout'`                | DEFERRED — `EventDetailResponse` does not yet carry `priceStatus`; `isSoldOut` is hardcoded to `false` until the API adds the field. Issue to open: add `priceStatus?: 'live' \| 'soldout'` to the event detail API route and `EventDetailResponse` type.                                                                                                   |
| Fix 6  | TrustMark community pill bg 12% → 16%                              | IMPLEMENTED                                                                                                                                                                                                                                                                                                                                                 |
| Fix 7  | Light theme `--trust-community` 0.52 → 0.62                        | IMPLEMENTED                                                                                                                                                                                                                                                                                                                                                 |
| Fix 8  | Full PriceBlockB implementation                                    | IMPLEMENTED — headline price, TrustMark, fee breakdown (expandable), stale stamp, source link, verified stamp, alternate sources ("Or pay for convenience"), sparkline (primary ≥4 datapoints). Box-office gold tier structure wired but the API does not yet return `boxOfficeAction`/`boxOfficeMethod` — renders as `primary` until Phase 7.2 data lands. |
| Fix 9  | TrustMark handles all four tiers                                   | IMPLEMENTED — boxoffice (gold ★), community (azure), resale (coral), primary (vendor muted)                                                                                                                                                                                                                                                                 |
| Fix 10 | Sparkline component                                                | IMPLEMENTED — SVG polyline, end-dot, only when `range14d.length >= 4` and `sourceKind === 'primary'`                                                                                                                                                                                                                                                        |
| Fix 11 | Remove extra PriceSection component                                | IMPLEMENTED                                                                                                                                                                                                                                                                                                                                                 |
| Fix 12 | Remove sign-up nudge                                               | IMPLEMENTED                                                                                                                                                                                                                                                                                                                                                 |

## Deferred Items

### Fix 5 — SoldOut trigger

**Reason:** `EventDetailResponse` and the API event detail route do not yet expose a `priceStatus` field. The design requires `price.status === 'soldout'` to drive the `SoldOutCTA`. Until the API returns this field, `isSoldOut` is `false` (no regressions — the button was already not rendering for most events). Follow-up: add `priceStatus?: 'live' | 'soldout'` to the API event detail endpoint and the `EventDetailResponse` type in `packages/types`.

### Box-office tier (Phase 7.2 data)

**Reason:** `boxOfficeAction`, `boxOfficeMethod`, `submitter`, `soldOutBy`, `soldOutConfirms`, and `verification` are all wired in `PriceBlockPrice` and the render path in `PriceDisplay`, but the API does not yet return these fields. All sub-components handle null/empty gracefully and will activate automatically once the API adds them — no code changes needed on the frontend.

### Sold-out attribution copy

**Reason:** Requires `soldOutBy` + `soldOutConfirms` from the API (see Fix 5 dependency). Render path is in place in the design reference but not wired to live data.

## Notes

- `range14d` is not yet returned by the API event detail endpoint. When it is added as `range14d?: number[]`, the `Sparkline` will activate automatically for primary-tier events with ≥4 datapoints — no frontend change needed.
- The `FeeBreakdown` component short-circuits when `feeBreakdown` is null/empty (current API state). It will activate when the price pipeline begins returning itemized fees.
- The `AlternateSourceRow` list short-circuits when `alternates` is empty (current API state). The "Or pay for convenience" section will appear automatically when the API returns alternates.
