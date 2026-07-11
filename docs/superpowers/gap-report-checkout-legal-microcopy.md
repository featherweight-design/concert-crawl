# Gap Report — #782 Checkout Legal Microcopy (PR 4.1)

Design table: `docs/superpowers/design-tables/checkout-legal-microcopy.md`
Verified: 2026-07-11 (design-review Agent 2, deterministic row-by-row)

## Visual gaps

None. All properties match, including exact copy strings (punctuation,
em-dashes, middle dots), the PRICE_PROMISE per-tier map wiring, LegalBlock /
BottomMonoRail layout values, and the lock-glyph SVG geometry.

## State reachability gaps

None.

- SCA notice: `me/page.tsx` resolves `x-vercel-ip-country` via `isScaRegion`
  (EEA + UK; unknown ⇒ true, fail-safe toward compliance) and the boolean
  threads me/page → SettingsRoute/SettingsRouteDesktop → PlanPanel →
  TierPickerSheet → CheckoutPanel.
- Refund link: CheckoutPanel links `/legal/terms#refunds`; the terms page
  contains the `id="refunds"` anchor (spec §7 — refund policy as a terms
  section, no standalone page yet).

## Accepted equivalences (documented in the design table)

- `var(--font-mono)` in place of the mock's hardcoded 'JetBrains Mono'.
- Rail text segments are styled spans (the mock's MonoEyebrow helper doesn't
  exist in the app); size/color/tracking/uppercase match.
- LegalLink is a real anchor (Next Link, new tab) — cursor comes free;
  in-surface navigation would abandon the in-flight subscription.

VERDICT: 0 visual gaps, 0 state gaps — ready to ship.
