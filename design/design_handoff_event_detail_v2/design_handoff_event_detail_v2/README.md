# Event Detail v2 — Engineering Handoff

**Branch context.** Concert Crawl, private Beta. v2 of the Event Detail screen: phase 5b's foundation kept intact, with three additions wired in — **Setlist preview**, **Watch this show** (separate from Save), and an inline **Submit-a-price** entry. Built on the existing theme system (electric / jade / light) and the Phase 7 price-block stack — no new visual primitives.

A single arrangement is shipping: **Modular cards**. Earlier exploration covered Tight stack, Modular tightened, and Editorial flow; those were rejected and removed.

---

## What changed since v1 (phase 5b)

| Module | v1 (5b) | v2 |
|---|---|---|
| Hero | 320px image + back/save | Same, height 300px |
| Title block | h1 + chip row | Same h1 + chip row, plus **Watch CTA + watching count** strip directly underneath |
| Info grid | venue/date/doors/ages + price row | Same grid, **price row removed** — price now lives in its own card |
| Price | inline row | **Spacious PriceBlockB card** (Phase 7 component) — sparkline, breakdown, source, stale/verified stamps, trust marks |
| Submit-a-price | n/a | **Card-end CTA** beneath the price card |
| Setlist | n/a | **Dedicated card** above primary CTA, collapsed by default |
| Primary CTA | "Get Tickets" / disabled | **`SoldOutCTA`** (disabled "Sold out" button) when `price.status === "soldout"`, otherwise unchanged |
| About / Related | unchanged | unchanged |

Watching is **separate** from Saving. Save = the heart in the top-right (existing). Watch = the new outline button under the title that opts the user into price-drop + sold-out alerts. Two distinct mental models, two distinct affordances.

---

## File map

This bundle:

```
design_handoff_event_detail_v2/
├── Event Detail v2.html          ← entry point (open this)
├── event-detail-v2.jsx           ← main screen (EventDetail) + new modules
├── event-detail-v2-canvas.jsx    ← review canvas (artboards)
├── README.md                     ← this file
│
├── price-block.jsx               ← Phase 7 price components (modified)
├── price-data.jsx                ← Phase 7 sample data + helpers (unchanged)
│
├── theme-context.jsx             ← shared theme system (unchanged)
├── primitives.jsx                ← shared primitives (unchanged)
├── ios-frame.jsx                 ← device frame (unchanged)
└── design-canvas.jsx             ← review canvas chrome (unchanged)
```

**Modified file:** `price-block.jsx`. Changes are limited to PriceBlockB and TrustMark — see "Price block changes" below.

---

## New modules in `event-detail-v2.jsx`

### `<EventDetail event chrome="mobile" />`

The full screen. Composes hero, title block, Watch strip, info grid, price card, submit CTA, setlist card, primary CTA, about, related. Reads `event.price` and routes sold-out vs live to the right CTA.

`event` shape is the existing 5b shape extended with:
- `event.watching: number` — count of users watching, drives the supporting count next to the Watch button. Hide if `null` or `0`.
- `event.setlist: { songs: string[], encore?: string[] }` — pass-through to `SetlistPreview`.

### `<WatchShowButton initialActive initialConfirming count />`

Outline button + count strip. Three states:

| State | Visual | Action |
|---|---|---|
| Inactive | `+ Watch this show` outline button. Count: `14 watching · alerts on price + sold out` | Click → active |
| Active | `✓ Watching` accent-tinted button. Count: `14 watching` | Click → confirming |
| Confirming | Two-button row: `Stop watching` (warning) + `Cancel` | Cancel → active. Stop watching → inactive |

Specs:
- Height **28px**, padding `0 11px`, radius 7
- Inter 600, 12px, letterSpacing -0.005em
- Inactive: bg transparent, border `1px solid --border-strong`, color `--fg`
- Active: bg `color-mix(in oklab, --accent 12%, transparent)`, border `1px solid --accent`, color `--accent`
- Stop watching: bg transparent, border `1px solid --warning`, color `--warning`
- Count: JetBrains Mono 9.5px 700, `--fg-subtle`, accent dot prefix (4×4)

The inline confirm is intentional — no modal, no nav, easily reversible. Engineering: the active→confirming→inactive transition does **not** post the unwatch optimistically; only the final "Stop watching" click should fire the API call.

### `<SoldOutCTA />`

Disabled primary-button shape. Replaces the Get Tickets CTA when `price.status === "soldout"`. Same 48px height + 10px radius as the live button; bg `--surface-1`, border `--border`, text `--fg-subtle`. The chip treatment lives **on the price** (existing PriceBlockB SOLD OUT pill), not on the button.

### `<SetlistPreview setlist defaultOpen=false dense=false />`

Collapsible card. Closed shows `{first 3 songs}, +N more`. Open shows the full numbered list with an "Encore" divider when `setlist.encore` is non-empty. `dense` reduces vertical padding for tighter contexts (was used by the deprecated Tight stack — keep the prop, no current caller).

Renders `null` when `setlist` is missing or empty — safe to wire even when the data isn't there.

### `<SubmitPriceCardCTA />`

Full-width card-shape CTA that routes to the existing Phase 8 submit flow. Used directly under the price card. Hits `#submit-price` — engineering: replace with the actual route when wiring.

---

## Price block changes (`price-block.jsx`)

Two surgical changes to PriceBlockB. No new components added.

### 1. TrustMark in PriceBlockB headline

`PriceBlockB` now renders the `TrustMark` pill inline with the headline price when `sourceKind` is `"resale"` or `"community"`. Previously the trust mark was only in PriceBlockC. Engineering impact: none — `TrustMark` already exists; we just call it from a second site.

```jsx
{(ph.isResale(price) || ph.isCommunity(price)) && (
  <TrustMark kind={ph.sourceKind(price)}/>
)}
```

### 2. Community trust color

`TrustMark` and the small-row `trustTell` letter now use **azure** (`oklch(0.62 0.12 240)`) for community, not `--fg-muted`. Resale stays on `--warning`. The eye reads three distinct states: primary (no mark), resale (warning), community (azure).

Add to your token set if you want a named token: suggest `--trust-community: oklch(0.62 0.12 240)`. Currently inline in `TrustMark` and the row trustTell — happy to refactor to a token before merge.

### 3. Watch affordance removed from price card footer

The inline `<WatchAffordance/>` link in PriceBlockB and PriceBlockC footers is **commented out** behind a `false &&` guard. Reasoning: the prominent `<WatchShowButton/>` under the title now carries the same promise (alerts on price drops + sold out), so the footer link was redundant and missable. Single mental model, single button.

If you want me to actually delete the dead branches before merge, say the word — left in for diff readability.

---

## Price-state coverage

The matrix on the canvas exercises every state engineering must handle:

| State | Trigger | Visual |
|---|---|---|
| Drift / default | `status: "live"`, fresh, primary | Headline price, all-in tag, sparkline, source link |
| Drop | `current < openedAt` (≥ $2) | Green delta pill `↓ $X` |
| Sold out | `status: "soldout"` | SOLD OUT pill on price, disabled "Sold out" button |
| Resale | `sourceKind: "resale"` | Warning trust mark + warning trustTell letter |
| Community | `sourceKind: "community"` | Azure trust mark + azure trustTell letter |
| Stale (>24h) | `observedAt > 24h` | Warning dot on timestamp |
| Verified | `verification: { by, at }` | `VerifiedStamp` in footer |
| No price yet | `price: null` | Quiet `we'll watch` line + Submit-a-price CTA |

Fixtures live in `price-data.jsx` (`PHASE7_EVENTS`). Canvas swaps `event.price` only — same screen, same arrangement.

---

## Tokens used (no new ones added)

All from the existing theme set. New token suggestion is `--trust-community` (see above) — optional.

| Use | Token |
|---|---|
| Primary text / button | `--fg`, `--bg` |
| Muted text | `--fg-muted`, `--fg-subtle` |
| Surface (cards) | `--surface-1` |
| Border | `--border`, `--border-strong` |
| Accent (Watch) | `--accent` |
| Warning (resale, sold out, stop watching) | `--warning` |
| Success (price drop) | `--success` |
| Signal (links) | `--signal` |
| Community trust | `oklch(0.62 0.12 240)` (inline; suggest token) |

---

## Open questions for engineering

1. **Watch persistence.** Where does the "watching" set live — same store as saved shows or separate? Confirm the API endpoint so I can hook the inline confirm correctly.
2. **Watching count latency.** The `14 watching` count: is it real-time, or eventually-consistent? If it's lagging, we should consider rounding (`14+`) when the number is high.
3. **Submit-a-price route.** The `SubmitPriceCardCTA` currently href's `#submit-price`. Wire to the actual Phase 8 route.
4. **`--trust-community` token.** Do you want me to add it to `theme-context.jsx` for all three themes before merge, or leave inline?

---

## Out of scope (not in this bundle)

- Changes to the existing **Save** affordance (heart, top-right) — that stays exactly as 5b.
- Notifications surface — Watch fires alerts but the alert/digest UI is a separate phase.
- Price submission flow itself — that's Phase 8, already shipped. We just route to it.
- Desktop layout — confirmed shared mobile layout for Beta. Will revisit post-Beta if needed.
