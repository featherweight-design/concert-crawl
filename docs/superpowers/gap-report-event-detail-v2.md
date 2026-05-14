# Gap Report — Event Detail v2

Branch: `feat/event-detail-v2`
Date: 2026-05-14

## Fix Status

### Round 1 (original implementation)

| Fix    | Description                                                        | Status                          |
| ------ | ------------------------------------------------------------------ | ------------------------------- |
| Fix 1  | Desktop layout: 880px centered column, -60px hero overlap          | IMPLEMENTED                     |
| Fix 2  | Community-handoff card for null-price state                        | IMPLEMENTED                     |
| Fix 3  | PrimaryCTA always renders (href="#" fallback)                      | IMPLEMENTED                     |
| Fix 4  | Resale color to coral `oklch(0.65 0.20 25)` in EventCard PriceChip | IMPLEMENTED                     |
| Fix 5  | SoldOutCTA trigger via `price.status === 'soldout'`                | IMPLEMENTED — see Round 2 Fix 1 |
| Fix 6  | TrustMark community pill bg 12% → 16%                              | IMPLEMENTED                     |
| Fix 7  | Light theme `--trust-community` 0.52 → 0.62                        | IMPLEMENTED                     |
| Fix 8  | Full PriceBlockB implementation                                    | IMPLEMENTED                     |
| Fix 9  | TrustMark handles all four tiers                                   | IMPLEMENTED                     |
| Fix 10 | Sparkline component                                                | IMPLEMENTED                     |
| Fix 11 | Remove extra PriceSection component                                | IMPLEMENTED                     |
| Fix 12 | Remove sign-up nudge                                               | IMPLEMENTED                     |

### Round 2 (design gap fixes 2026-05-14)

| Fix    | Description                                                                | Status                                                                                                                                                                                                     |
| ------ | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fix 1  | `isSoldOut` derived from API `priceStatus` field                           | IMPLEMENTED — `priceStatus?: 'live' \| 'soldout' \| null` added to `EventDetailResponse`; API route returns `null` until sold-out submission query is wired; `isSoldOut = event.priceStatus === 'soldout'` |
| Fix 2  | Delta pill in PriceBlockB when `openedAt` differs from current price       | IMPLEMENTED — `DeltaPill` component; down = success green with dot, up = muted; null-safe (no render when `openedAt` is null)                                                                              |
| Fix 3  | Box-office attribution line (`BoxOfficeAttribution` component)             | IMPLEMENTED — renders "Bought/Saw at {venue} box office by @{handle} · by phone"; anonymous fallback in italics; null-safe when `venueName` absent                                                         |
| Fix 4  | Sold-out reporter attribution (`SoldOutReporterAttribution`)               | IMPLEMENTED — renders "Reported sold out by @{handle} · N fans confirmed"; null-safe when fields absent                                                                                                    |
| Fix 5  | Community submitter @handle (vs always "anonymous fan")                    | IMPLEMENTED — renders linked @handle when `submitter` is present, italic "an anonymous fan" when null                                                                                                      |
| Fix 6  | Headline `fontWeight: 800` → `900`                                         | IMPLEMENTED — Inter 900 at 28px per spec                                                                                                                                                                   |
| Fix 7  | Sparkline gate: `sourceKind !== 'community' && sourceKind !== 'boxoffice'` | IMPLEMENTED — allows resale + primary sparklines, excludes community + box-office                                                                                                                          |
| Fix 8  | Replace `AZURE` constant with `var(--trust-community)` CSS token           | IMPLEMENTED — `COMMUNITY = 'var(--trust-community)'`; all `color-mix()` usages updated                                                                                                                     |
| Fix 9  | Desktop content column `sm:z-10` → `sm:z-[1]`                              | IMPLEMENTED                                                                                                                                                                                                |
| Fix 10 | Delete `PriceSection.tsx` (no callers)                                     | IMPLEMENTED                                                                                                                                                                                                |
| Fix 11 | Delete `WatchButton.tsx` and `watch-button/` directory (no callers)        | IMPLEMENTED                                                                                                                                                                                                |
| Fix 12 | Fee all-in label logic                                                     | IMPLEMENTED — 'face value' (no fees), 'all-in, including fees' (fees > 0), 'starting, all-in' (ranged price)                                                                                               |
| Fix 13 | `SetlistPreview` owns its card surface                                     | IMPLEMENTED — card chrome (bg, border, borderRadius, overflow, padding) moved into `SetlistPreview.tsx`; page.tsx wrapper simplified                                                                       |

## Notes

- All attribution fields (`boxOfficeAction`, `boxOfficeMethod`, `submitter`, `soldOutBy`,
  `soldOutConfirms`) are null in the current API response. The render paths are wired and
  null-safe — they will activate when the API begins returning these fields from `user_events`.
- `range14d` is not yet returned by the API event detail endpoint. When added, the Sparkline
  activates for primary and resale tier events with ≥4 datapoints — no frontend change needed.
- The `FeeBreakdown` component short-circuits when `feeBreakdown` is null/empty. It will
  activate when the price pipeline returns itemized fees.
- The `AlternateSourceRow` list short-circuits when `alternates` is empty. The "Or pay for
  convenience" section will appear automatically when the API returns alternates.
- `priceStatus` in the API currently returns `null`; a follow-up is needed to query
  `user_events` for corroborated sold-out submissions and return `'soldout'` when found.
