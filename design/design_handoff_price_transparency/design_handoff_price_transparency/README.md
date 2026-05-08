# Phase 7 — Price Transparency · Engineering Handoff

**Branch context.** Concert Crawl, private beta. Consumer-facing. Dark by default. Anti-Ticketmaster in tone. Builds on the Phase 5b consumer system (Electric theme, Inter / JetBrains Mono, `var(--*)` tokens) and the Phase 6 admin Prices page that already collects the underlying data.

**Canvas:** `design_handoff_phase7_price_transparency/Price Transparency Canvas.html`

---

## TL;DR — what to build

Add a **price block** to Event Detail (mobile + desktop) and a **price chip** to event cards (Browse / Search). Both must render gracefully when we have no price data — that's the common case in Phase 7, not the edge case.

**Recommended variant: Editorial (Variant C).** Reads as a sentence, degrades into a quieter sentence when data is missing. Spacious (Variant B) is a feature card that breaks the page when there's nothing to show. Compact (Variant A) loses the trend / sparkline story.

The other variants are kept on canvas as reference; one `<PriceBlock variant="…">` prop swaps between them so we can A/B without a refactor.

---

## Guiding principles (don't quietly drop these in implementation)

1. **Casual browsing first.** Price is a _bonus_ on top of "when/where is my band playing." It never gets in the way of the show, and never crowds the title or date.
2. **Transparent, not noisy.** Absolute deltas (`+$8`, `−$4`). No percentages. No "32% over face" alarmism.
3. **Graceful when data is missing.** No-price is a first-class state. We never invent a number to fill space and we never render a dashed-border feature box that screams "broken." When we have nothing to say, we say one quiet line — or omit the section entirely.
4. **One color for "down."** Drop = `--success` (green). Up / flat = neutral muted. We don't paint the screen red.
5. **No "Check waitlist" promises.** If the show's sold out, we say "Show closed." We don't pretend a waitlist exists unless engineering builds one.
6. **No "We'll notify you" promises** until notifications ship. Watch toggle is local-state only for now (visual affordance).

---

## Components

All in `design_handoff_phase7_price_transparency/`. Drop them into the consumer codebase next to the existing `detail-screens.jsx` / `browse-home.jsx` files.

| File                  | Exports                                                                                                                                                                                                           | Notes                                                                                                                                                                                                            |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `price-block.jsx`     | `PriceBlockA` (Compact) · `PriceBlockB` (Spacious) · `PriceBlockC` (Editorial) · `PriceChip` · `Sparkline` · `WatchAffordance` · `FeeBreakdownExpander` · `StaleStamp` · `DeltaPill` · `SourceLink` · `TONE_COPY` | Self-contained. Consumes `window.phase7` helpers + theme tokens.                                                                                                                                                 |
| `price-data.jsx`      | `PHASE7_EVENTS` sample data · `phase7.{formatUSD, formatDelta, relTime, isStale, allIn, deltaVsOpen, deltaFlag, priceChipText, feeSummary}`                                                                       | Demo seed + pure helpers. The real shape mirrors the admin's `AdminPricesPage` snapshot rows.                                                                                                                    |
| `phase7-surfaces.jsx` | `MockEventDetailMobile` · `MockEventDetailDesktop` · `MockBrowseList`                                                                                                                                             | Trimmed reference surfaces for the canvas only — _don't ship these_. The real impls live in `detail-screens.jsx` / `detail-desktop.jsx` / `browse-home.jsx`; just slot `<PriceBlockC />` and `<PriceChip />` in. |
| `phase7-canvas.jsx`   | `Phase7Canvas` · `Phase7Tweaks`                                                                                                                                                                                   | Canvas composition + Tweaks panel. Reference, not shipped.                                                                                                                                                       |

---

## Data contract

```ts
type Price = {
  face: number;                  // base ticket price (cheapest tier today, USD)
  fees: number;                  // total fees on top
  feeBreakdown?: Array<{ label: string; amount: number }>;
  openedAt: number;              // face price at first observed snapshot
  low14d: number;
  high14d: number;
  range14d: number[];            // 14 daily face values for sparkline
  observedAt: string;            // ISO — most recent crawl
  source: string;                // "Mission Ballroom" / "AXS"
  sourceUrl: string;
  status: "live" | "soldout" | "presale" | "tba";
  tier: "from" | "fixed" | "range";
};

type Event = {
  …existing fields…
  price: Price | null;           // null is the COMMON case in Phase 7
};
```

**Important:** `price === null` should hit the `<PriceBlockC price={null} />` no-data branch, _not_ be treated as "show no section." The Editorial variant collapses to a single quiet sentence in that case, which is the intended look.

---

## Visual / token rules

| Token         | Where it appears in Phase 7                                        |
| ------------- | ------------------------------------------------------------------ |
| `--signal`    | Default price numerics, source links                               |
| `--success`   | Drop arrow + tinted price (browse chip, Editorial inline emphasis) |
| `--warning`   | Stale stamp dot (>24h), sold-out badge in Spacious                 |
| `--accent`    | Watch-active state, primary CTA                                    |
| `--fg-muted`  | Fees summary, secondary numerics, spike arrow                      |
| `--fg-subtle` | Timestamps, source attribution, sold-out strikethrough             |

**Fonts.** Inter for the price number itself (large, display-style). JetBrains Mono for fee summaries, deltas, timestamps, source labels. Don't mix this up — mono on the headline price reads as terminal-cosplay.

**Sparkline.** Stroke-only, no fill, end-dot only. 14 points. Width 56–84px depending on context. Color tracks `deltaFlag(price)`: drop = `--success`, spike = `--fg-subtle` (we don't shout up).

---

## States to implement

All five are designed and on canvas. Don't drop any.

1. **Has price, drift only** — default. Number + fees summary + sparkline + stale stamp + watch toggle.
2. **Drop** — same layout, `↓` glyph + green tint on the number. Δ pill in `--success`. Sparkline trends down.
3. **Spike** — same layout, `↑` glyph + neutral muted tint. Δ pill in `--fg-muted`. Intentionally quieter than drop.
4. **Sold out** — strikethrough number, "Sold out" badge, no sparkline, no fee breakdown. CTA becomes "Show closed" (disabled-style).
5. **No price** — quiet single line: `Price TBA. We'll watch for it.` (tone-dependent). CTA becomes "Add to my list."
6. **Stale (>24h)** — same layout as 1, `StaleStamp` adds a warning dot + "may be outdated" suffix.

---

## Tone

`TONE_COPY` table in `price-block.jsx` ships three voices: **Dry**, **Deadpan**, **Snark**. **Default is Snark** (per user). All copy that says "we'll notify you" / "check waitlist" has been removed — no promises about features that don't exist.

If product wants to soften to Deadpan later, change one prop. The mechanism is in place.

---

## Watch toggle — scope warning

The `WatchAffordance` is a visual-only toggle today. Local React state, persists nothing. Two reasons to be careful:

1. **Don't wire it to a real watchlist** until we have a notifications surface (Phase 6/8) and a backend table.
2. **Don't put a "Watching" item in the nav** until we know how that list looks. Open question for Phase 7.5+.

---

## Out of scope (please don't quietly add)

- Cross-marketplace comparison ("$55 on AXS, $62 on StubHub"). One source per row, the admin already picks the canonical one.
- Percentage deltas. Absolute only.
- Price-history modal / full chart on tap. The 14-day sparkline is the whole story for Phase 7.
- Hero image upgrade. Tracked separately as **Phase 7.5 — Identity Imagery**.

---

## Tweaks panel (canvas only)

Theme picker (Electric / Jade / Light) and Voice picker (Dry / Deadpan / Snark) live in the canvas's right-side panel. These are reviewer affordances — not shipped to production. The `theme` choice should match whatever the consumer app's theme is at runtime; the `tone` choice is a build-time prop on `<PriceBlock />`.

---

## Files in this folder

```
design_handoff_phase7_price_transparency/
├── Price Transparency Canvas.html   ← reviewer canvas
├── price-block.jsx                  ← SHIP THIS
├── price-data.jsx                   ← SHIP HELPERS (drop sample data)
├── phase7-surfaces.jsx              ← canvas-only reference, don't ship
├── phase7-canvas.jsx                ← canvas-only, don't ship
├── theme-context.jsx                ← copy of consumer system, don't ship duplicate
├── ios-frame.jsx                    ← copy of starter component, don't ship duplicate
├── design-canvas.jsx                ← starter component, don't ship
├── tweaks-panel.jsx                 ← starter component, don't ship
├── primitives.jsx                   ← unused in this canvas
└── README.md                        ← this file
```

---

## Acceptance checklist

- [ ] `<PriceBlockC price={event.price} tone="snark" />` renders in Event Detail mobile + desktop, between the info block and the CTA
- [ ] `<PriceChip price={event.price} tone="snark" />` renders in event card right-aligned, replacing the placeholder "tba" stamp where price exists
- [ ] No-price events render the quiet single-line state, not a dashed feature card or empty container
- [ ] Sold-out events show "Show closed" CTA, no waitlist link
- [ ] Drop state uses `--success` + `↓` arrow; spike uses `--fg-muted` + `↑` arrow
- [ ] Watch toggle is local-state only; not persisted; no "Watching" nav entry yet
- [ ] All three themes (Electric / Jade / Light) render correctly without modification

---

## Open questions for product

1. Watching surface — inbox in nav, or inline toggle only? (Pairs with Phase 6 notifications work.)
2. Pre-onsale ("not on sale yet, but we know about the show") — separate copy from "TBA" / "no price"?
3. Multi-marketplace — when we have prices from two sources, show lower, both, or pick one canonical? (Default for now: pick one canonical via admin.)
