# Event Detail v2 — Engineering Handoff

**Branch context.** Concert Crawl, private Beta. v2 of the Event Detail screen: phase 5b's foundation kept intact, with three additions wired in — **Setlist preview**, **Watch this show** (separate from Save), and an inline **Submit-a-price** entry. Built on the existing theme system (electric / jade / light) and the Phase 7 price-block stack — no new visual primitives.

A single arrangement is shipping: **Modular cards**. Earlier exploration covered Tight stack, Modular tightened, and Editorial flow; those were rejected and removed.

> **May 13, 2026 — Strategy update + revisions (after Hugh's review).** Ticketing APIs (TM, AXS, etc.) won't expose prices to us at the public tier, and we're not pursuing partnerships. Community submission is now the **primary** price mechanism, not a fallback. Six changes flow from this:
>
> 1. **No price yet** state is no longer a quiet "we'll watch" line. It's a prominent community-handoff card with the submit-a-price button as the focal point. See _No-price state_ below.
> 2. **Get Tickets** button now always renders. Direct deep-link → `Get Tickets ↗`; otherwise falls back to venue website → `Visit Venue Website ↗`. Same button bounds; no layout shift. See _PrimaryCTA_.
> 3. **Box-office tier** (Phase 7.2). Gold pill, gold-framed price card, named-verb attribution. **Only BOUGHT submissions earn the gold tier** — a fan must have actually purchased a ticket from the venue (in person or by phone). SAW submissions are community tier with a box-office origin context line. See _Trust hierarchy_.
> 4. **Sold-out is community-reported.** No more API-fact — a fan flags a show as sold out and the card surfaces the reporter + confirms (`Reported sold out by @amelia · 3 fans confirmed`). Open question: a "still available?" dispute affordance.
> 5. **Save heart removed.** Watch CTA under the title carries the same intent (subscribe to updates on this show). Two redundant mechanisms collapsed into one.
> 6. **Sparklines deprecated by default.** 14-day lines assumed continuous API pulls; with community submission as primary source, most events have one or two datapoints. `Sparkline` now only renders when `range14d` has ≥4 datapoints AND the source isn't community/box-office. Component preserved for the rare primary case.
> 7. **Tier-color separation pass.** Resale shifted from warning-yellow to **coral** (`oklch(0.65 0.20 25)`) so it no longer collides with the box-office gold pill in the same hue band. Primary tier got an explicit **vendor** pill (muted neutral) instead of rendering with no trust mark — addresses the "where did this price come from?" gap on the default state.

---

## What changed since v1 (phase 5b)

| Module                  | v1 (5b)                                                 | v2                                                                                                                                                                                                                                                      |
| ----------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hero                    | 320px image + back/save                                 | Same, height 300px. **Save heart removed** — Watch CTA below carries that intent.                                                                                                                                                                       |
| Title block             | h1 + chip row                                           | Same h1 + chip row, plus **Watch CTA + watching count** strip directly underneath                                                                                                                                                                       |
| Info grid               | venue/date/doors/ages + price row                       | Same grid, **price row removed** — price now lives in its own card                                                                                                                                                                                      |
| Price (priced)          | inline row                                              | **Spacious PriceBlockB card** (Phase 7 component) — sparkline, breakdown, source, stale/verified stamps, trust marks                                                                                                                                    |
| Price (no price)        | inline `Price TBA` row                                  | **Community-handoff card** — azure-tinted surface with `Submit a price →` as the focal action (replaces the quiet "we'll watch" line)                                                                                                                   |
| Submit-a-price (revise) | n/a                                                     | **Card-end CTA** beneath the price card, only when a price exists                                                                                                                                                                                       |
| Setlist                 | n/a                                                     | **Dedicated card** above primary CTA, collapsed by default                                                                                                                                                                                              |
| Primary CTA             | "Get Tickets" (only when `ticketUrl` exists) / disabled | **Always renders.** `Get Tickets ↗` when `event.ticketUrl` is set, `Visit Venue Website ↗` fallback to `event.venueUrl` otherwise. **`SoldOutCTA`** when `price.status === "soldout"`. Same 48×full-width slot for both copy variants — no layout shift |
| About / Related         | unchanged                                               | unchanged                                                                                                                                                                                                                                               |

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

| State      | Visual                                                                                | Action                                    |
| ---------- | ------------------------------------------------------------------------------------- | ----------------------------------------- |
| Inactive   | `+ Watch this show` outline button. Count: `14 watching · alerts on price + sold out` | Click → active                            |
| Active     | `✓ Watching` accent-tinted button. Count: `14 watching`                               | Click → confirming                        |
| Confirming | Two-button row: `Stop watching` (warning) + `Cancel`                                  | Cancel → active. Stop watching → inactive |

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

Full-width card-shape CTA ("Saw a different price?") that routes to the existing Phase 8 submit flow. Used directly under the price card **only when there is a price to revise**. Hits `#submit-price` — engineering: replace with the actual route when wiring.

For the **no-price** state, the submit affordance is **inside** the price card itself (see _No-price state_ below) — `SubmitPriceCardCTA` is no longer rendered as a second surface beneath it.

### `<PrimaryCTA variant href />` — always renders

The Get Tickets button. **Always renders** on non-sold-out events. Single shape (48px tall, full-width, 10px radius, single 15px line) with two copy variants:

| `variant`            | Copy                    | When                                                                         |
| -------------------- | ----------------------- | ---------------------------------------------------------------------------- |
| `"direct"` (default) | `Get Tickets ↗`         | `event.ticketUrl` is present (we have a deep-link from the ticketing source) |
| `"venue"`            | `Visit Venue Website ↗` | only `event.venueUrl` is known — falls back to the venue's site              |

`EventDetail` picks the variant from the event payload:

```jsx
soldOut ? (
  <SoldOutCTA />
) : event.ticketUrl ? (
  <PrimaryCTA variant="direct" href={event.ticketUrl} />
) : (
  <PrimaryCTA variant="venue" href={event.venueUrl || '#'} />
)
```

**Layout shift:** none. Button bounds are fixed (`height: 48; width: 100%`); both copy strings fit comfortably on one line at Inter 800 / 15px / `letter-spacing: -0.01em` inside the 393px mobile width, and `white-space: nowrap` guarantees the label never wraps. The artboards in the `Get Tickets CTA · copy variants` canvas section verify both at the same width.

Engineering: pick `variant` on the caller side from the URL set you have. The CTA always renders so there is no empty-button gap on no-price events.

### No-price state — community-handoff card

When `event.price` is `null`, `PriceBlockB` renders a **prominent** community-handoff card in the same slot the price card would occupy. Strategy: community submission is the price mechanism, and the state owns it.

Anatomy (top → bottom):

- **`COMMUNITY` badge** pinned to the top-right corner, tinted in the same azure (`oklch(0.62 0.12 240)`) used by the community trust mark on priced states. The card signals where the data lives.
- **`TICKETS`** mono label (consistent with the priced card head).
- **Headline:** `No price yet.` (Inter 900 / 24px) + supporting `Your call.` in azure (Inter 700 / 14px). Voice matches the locked-in Hybrid empty-state direction — playful + clear, brand presence first.
- **Body:** one sentence explaining why and handing the gap to the user. _"Ticketing APIs don't share prices with us, and we're not waiting on them. The community fills the gap — if you saw a number out there, drop it here."_ No apology.
- **Focal submit button:** 44px full-width, signal-toned (`var(--signal)` / `var(--fg-on-accent)`), label `Submit a price →`. Routes to `#submit-price`.
- **Trust footnote:** mono uppercase — `Anonymous works · two confirms moves it live`.

Card tint: 6% azure mix on `--surface-1`; border: 32% azure mix on `--border`. Subtle, but the card reads as distinct from a priced state at a glance.

Voice toggles work too — `TONE_COPY.deadpan` / `dry` / `snark` swap the headline + sub. Defaults documented in `price-block.jsx`.

---

## Price block changes (`price-block.jsx`)

Two surgical changes to PriceBlockB. No new components added.

### 1. TrustMark in PriceBlockB headline

`PriceBlockB` now renders the `TrustMark` pill inline with the headline price when `sourceKind` is `"resale"` or `"community"`. Previously the trust mark was only in PriceBlockC. Engineering impact: none — `TrustMark` already exists; we just call it from a second site.

```jsx
{
  ;(ph.isResale(price) || ph.isCommunity(price)) && (
    <TrustMark kind={ph.sourceKind(price)} />
  )
}
```

### 2. Community trust color

`TrustMark` and the small-row `trustTell` letter now use **azure** (`oklch(0.62 0.12 240)`) for community, not `--fg-muted`. Resale stays on `--warning`. The eye reads three distinct states: primary (no mark), resale (warning), community (azure).

Add to your token set if you want a named token: suggest `--trust-community: oklch(0.62 0.12 240)`. Currently inline in `TrustMark` and the row trustTell — happy to refactor to a token before merge.

### 3. Watch affordance removed from price card footer

The inline `<WatchAffordance/>` link in PriceBlockB and PriceBlockC footers is **commented out** behind a `false &&` guard. Reasoning: the prominent `<WatchShowButton/>` under the title now carries the same promise (alerts on price drops + sold out), so the footer link was redundant and missable. Single mental model, single button.

If you want me to actually delete the dead branches before merge, say the word — left in for diff readability.

---

## Trust hierarchy (Phase 7.2, revised May 13)

Four tiers, ordered most → least authoritative. Each carries a distinct trust mark next to the headline price; the **same pill shape** across tiers so the eye learns one element and reads it as a tier signal.

| Tier                 | `sourceKind` | Trust mark                                               | When                                                                                                                                                                                                                                     |
| -------------------- | ------------ | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Box office**       | `boxoffice`  | Gold pill with star glyph (`oklch(0.66 0.14 78)`)        | A fan **bought** a ticket from the venue (in person or by phone). Face value, no fees. The most honest number a fan can pay.                                                                                                             |
| **Community**        | `community`  | Azure pill (`oklch(0.62 0.12 240)`)                      | Any other fan-reported number — including box-office observations (saw / called) where no purchase happened.                                                                                                                             |
| **Resale**           | `resale`     | Coral pill (`oklch(0.65 0.20 25)`)                       | Secondary market (SeatGeek, StubHub). Markup over face shown when face is known. **Color shifted from warning-yellow to coral on May 13** so it no longer collides with the gold box-office pill — distinctly red-toned, not gold-toned. |
| **Vendor (primary)** | `primary`    | Muted neutral pill labelled `vendor` (`var(--fg-muted)`) | Structured data scraped from the venue or a ticketing site (Mission Ballroom's site, AXS, etc.). Rare under the May-2026 strategy. Pill is intentionally low-key — the eye should read "factual, but a fan didn't verify it."            |

**Color separation:** all four tiers occupy distinct hue families now — gold at h≈78° (amber), coral at h≈25° (red-orange), azure at h≈240° (cool blue), vendor desaturated (no chroma to compete). The previous gold-vs-warning overlap is gone.

### Box-office tier — sub-shapes

**Only BOUGHT submissions earn the gold tier.** A fan must have actually purchased a ticket from the venue. SAW submissions — even in person, even at the box-office window — are community tier with a box-office origin context line. The user is right: "saw at the venue" and "called and asked" are both passive observations; the bigger distinction is **bought vs. observed**.

| `boxOfficeAction` | `boxOfficeMethod`     | Resulting tier        | Card                    | Attribution                                                 |
| ----------------- | --------------------- | --------------------- | ----------------------- | ----------------------------------------------------------- |
| `bought`          | `in-person`           | **Box office** (gold) | Gold-framed card        | "**Bought** at {Venue} box office by @hugh"                 |
| `bought`          | `phone`               | **Box office** (gold) | Gold-framed card        | "**Bought** from {Venue} box office by @hugh · by phone"    |
| `saw`             | `in-person`           | **Community**         | Standard community card | "**Saw** at {Venue} box office · in person" context line    |
| `saw`             | `phone`               | **Community**         | Standard community card | "**Called** the {Venue} box office · by phone" context line |
| (any)             | (vendor ≠ box office) | **Community**         | Standard community card | Normal `@handle` attribution, no box-office context         |

The community card surfaces the box-office origin as a small mono context line above the breakdown so the source isn't lost — but the trust hierarchy stays honest. Only purchases prove a price.

### Override / authority rules

- **Fresh box-office submission always wins the headline slot.** When present and not stale, it occupies the primary number on the card regardless of other sources. Everything else renders as `alternates` below.
- **TM / primary becomes secondary** when a box-office submission exists. The fan sees the box-office number first, with TM's all-in price tucked into an `Or pay for convenience` row.
- **No decay clock for now.** Box office holds the headline until a newer box-office submission lands or it goes >24h stale (existing stale rule applies). We can add a 7- or 14-day decay if Beta data suggests it.
- **Sold-out wins the CTA slot.** Box-office card still renders for reference; `SoldOutCTA` always takes the button.

### Sold-out as community claim

Per Hugh's May-13 feedback: sold-out is itself a community claim now (no API tells us). The card surfaces who reported it and how many fans confirmed:

> _SOLD OUT pill on price_
> _Reported sold out by @amelia · 3 fans confirmed_

Same 2-confirms-to-leave-pending gate as price submissions. Stored as `price.soldOutBy: { handle, url, at }` + `price.soldOutConfirms: number`.

**Open question for engineering:** how do users **dispute** a stale sold-out claim? Likely a `Still available?` affordance somewhere on or near the price card that flips the show back to live + opens a fresh price-submit flow. Not scoped this round — flag for next pass.

### Multi-source display

When `price.alternates` is non-empty, `PriceBlockB` renders an **`Or pay for convenience`** section below the headline. Each alternate is a compact row: kind dot · source label · kind pill · price (all-in when fees are present) · external-link icon. The alternate rows are **visually de-weighted** (12px font, `--fg-muted`, 500-weight) so they don't compete with the headline number — the fan reads the box-office price FIRST.

Design intent: the fan sees the box-office price is best **and** has agency. Some people can't get to the venue — they should be able to see TM's number and pay for the convenience without leaving the app to find it. Honesty over funnel.

### Verification scope

The existing `VerifiedStamp` renders alongside any tier — box office included. When a box-office price has **alternates**, the stamp gets a `subject` prop so the verification scope is explicit:

> _Box-office price verified by @amelia · 20h ago_

…not just "Verified by @amelia," which would be ambiguous (which row did @amelia verify?). When there are no alternates, the bare "Verified" stamp is fine.

### Voice & attribution

`BoxOfficeAttribution` names the act in past tense and surfaces the submitter handle inline. Examples:

- `Bought at Mission box office by @hugh` (in-person purchase)
- `Bought from Red Rocks box office by @kel · by phone` (phone purchase)
- _(community, in-person saw)_ `Saw at Gothic box office · in person`
- _(community, phone saw)_ `Called the Mission box office · by phone`

Anonymous submissions read `by an anonymous fan` in italics. Phone purchases append `· by phone` so we don't claim the fan walked up to the window when they didn't — still gold tier, but the method is explicit.

### PriceChip (browse / search cards)

The per-tier marker on list cards:

| Tier       | Marker                              | Price color |
| ---------- | ----------------------------------- | ----------- |
| Box office | Filled gold star prefix (no letter) | Gold        |
| Community  | `C` letter pill, azure              | Signal      |
| Resale     | `R` letter pill, warning            | Signal      |
| Primary    | none                                | Signal      |

Box office gets a glyph instead of a letter — reads as a positive signal ("a fan vouched by buying"), not a caveat. The star is small (9×9) and sits _before_ the price; the price itself is gold so the chip telegraphs "deal" before the eye even registers the star.

### Sparkline — deprecated by default

14-day sparklines assumed continuous API pulls. With community submission as primary mechanism, most events have one or two data points and a line is misleading. `Sparkline` now only renders in `PriceBlockB` when `range14d` has **≥4 datapoints** AND `sourceKind` isn't `boxoffice` or `community`. Component preserved for the rare primary case.

### Phase 8 form changes

The submission form needs two new questions to capture box-office tier:

- **"What did you do?"** — `Bought a ticket` / `Saw the price` (replaces the existing "How'd you find out?" chips). This is what determines tier: bought → gold, saw → community.
- **"How'd you check?"** — `In person` / `By phone` (conditional: only renders when vendor is `Venue box office`). This is metadata only — doesn't change tier, but flavors the attribution line.

Full spec in [`phase8-addendum.md`](./phase8-addendum.md) — tier-derivation table, payload shape, validation rules, anti-abuse considerations, migration notes.

---

## Price-state coverage

The canvas matrix exercises every state engineering must handle. Box-office tier lives in its own canvas section (`Box-office tier (gold)`) with sub-sections for the two purchase shapes; everything else is in the `Other price states` section.

| State                            | Trigger                                                        | Visual                                                                                                                                                                        |
| -------------------------------- | -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Box office, bought in-person** | `sourceKind: "boxoffice"`, action=`bought`, method=`in-person` | Gold-framed card, gold star pill, `$X · face value · no fees` headline, `Bought at {Venue} box office by @hugh` attribution, alternate-source rows ("Or pay for convenience") |
| **Box office, bought by phone**  | same + method=`phone`                                          | Same card; attribution `Bought from {Venue} box office by @hugh · by phone`                                                                                                   |
| Community, saw at venue          | `sourceKind: "community"`, action=`saw`, method=`in-person`    | Standard community card + `Saw at {Venue} box office · in person` context line                                                                                                |
| Community, called the venue      | `sourceKind: "community"`, action=`saw`, method=`phone`        | Standard community card + `Called the {Venue} box office · by phone` context line                                                                                             |
| Community (general)              | `sourceKind: "community"`, no box-office method                | Azure trust mark, fan handle in attribution                                                                                                                                   |
| Resale (no box office)           | `sourceKind: "resale"`, no box-office submission               | Warning trust mark, markup-vs-face when known                                                                                                                                 |
| Stale (>24h)                     | `observedAt > 24h`                                             | Warning dot on timestamp                                                                                                                                                      |
| Verified                         | `verification: { by, at }`                                     | `VerifiedStamp` in footer; `subject="Box-office price"` when card has alternates                                                                                              |
| Sold out (community-reported)    | `status: "soldout"`, `soldOutBy` + `soldOutConfirms`           | SOLD OUT pill on price + `Reported sold out by @amelia · 3 fans confirmed` attribution + disabled `Sold out` button                                                           |
| Primary (rare)                   | `sourceKind: "primary"`                                        | Headline price, all-in tag, sparkline (when ≥4 datapoints), VENDOR trust pill, vendor source link                                                                             |
| No price yet                     | `price: null`                                                  | **Community-handoff card** — azure-tinted, `Submit a price →` focal button, `Visit Venue Website ↗` fallback CTA below                                                        |

Fixtures live in `price-data.jsx` (`PHASE7_EVENTS`). The canvas swaps the underlying event for box-office sub-states so the screen header and attribution name the same venue.

---

## Tokens used (no new ones added)

All from the existing theme set. New token suggestion is `--trust-community` (see above) — optional.

| Use                                       | Token                                          |
| ----------------------------------------- | ---------------------------------------------- |
| Primary text / button                     | `--fg`, `--bg`                                 |
| Muted text                                | `--fg-muted`, `--fg-subtle`                    |
| Surface (cards)                           | `--surface-1`                                  |
| Border                                    | `--border`, `--border-strong`                  |
| Accent (Watch)                            | `--accent`                                     |
| Warning (resale, sold out, stop watching) | `--warning`                                    |
| Success (price drop)                      | `--success`                                    |
| Signal (links)                            | `--signal`                                     |
| Community trust                           | `oklch(0.62 0.12 240)` (inline; suggest token) |

---

## Open questions for engineering

1. **Watch persistence.** Where does the "watching" set live — same store as saved shows or separate? Confirm the API endpoint so I can hook the inline confirm correctly.
2. **Watching count latency.** The `14 watching` count: is it real-time, or eventually-consistent? If it's lagging, we should consider rounding (`14+`) when the number is high.
3. **Submit-a-price route.** The `SubmitPriceCardCTA` and the new no-price-state submit button both href `#submit-price`. Wire to the actual Phase 8 route.
4. **`--trust-community` token.** Do you want me to add it to `theme-context.jsx` for all three themes before merge, or leave inline? (The no-price card also uses the same azure now — a token would consolidate four sites.)
5. **`event.ticketUrl` vs `event.venueUrl`.** Confirm the field names on the event payload. The CTA picks the variant from which one is present; if the backend names them differently, point me at the shape and I'll align.
6. **Sold out + venue fallback.** Today `SoldOutCTA` always wins regardless of which URLs we have. Confirm that's right — alternative is to render `Visit Venue Website ↗` even when sold out, on the theory that a fan might want to scan the venue page for resale or future dates. My read is the disabled "Sold out" treatment is clearer; happy to change if you disagree.

---

## Out of scope (not in this bundle)

- Changes to the existing **Save** affordance (heart, top-right) — that stays exactly as 5b.
- Notifications surface — Watch fires alerts but the alert/digest UI is a separate phase.
- Price submission flow itself — that's Phase 8, already shipped. We just route to it.
- Desktop layout — confirmed shared mobile layout for Beta. Will revisit post-Beta if needed.
