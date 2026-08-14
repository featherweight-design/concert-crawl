# Event &amp; artist imagery — engineering prompt

Design: `design_handoff_event_artist_imagery/` (round 2 is the recommendation).
Spec: `docs/superpowers/specs/2026-08-08-artist-imagery-standardization-design.md`.
Read `README.md` in this folder first — it carries the decisions log and the one
open spec question.

Open `Composed Bands.html` and `Slots and States.html` to see every state. Both
canvases render the shipped `EventRow` unforked, so what you see in the lists is
the real row with a different image slot.

---

## What this change is

A treatment change **inside existing slots** — with one structural exception that
is the point of the whole handoff:

> **Wide slots stop being image slots.** The event-detail hero and the browse
> tonight hero become *bands*: a 1:1 panel, an ink field, and the type as a
> column beside the panel. The band **absorbs the title block** that currently
> sits below the hero.

Nothing else re-lays out. Rows, cards, shelf and avatars keep their geometry.

## The shape system

Two shapes and one fill region. Anything not in this table does not get an image.

| Slot | Shape | Panel size | Radius |
|---|---|---|---|
| `EventRow` tile (browse / watching / venue) | 1:1 | 56, 44 at ≤360 | 8 |
| `SmallEventRow` tile | 1:1 | 40 | 8 |
| Artist search / crew avatar | 1:1 | 40 | full |
| Event card (`HeroEventCard`) | 1:1 | 112 + text column | 14 (card) |
| Event detail hero | 1:1 | 128 mobile / 208 desktop, in a band | 12 |
| Browse tonight hero | 1:1 | 128, in a band | 12 |
| Artist page hero | 1:1 | 128 mobile band / 208 desktop rail | 12 |
| Following shelf | **3:4** | `SHELF_CARD_WIDTH = 168` | 14 |
| Taste-pick card (`DiscoveryShelf`) | **no ratio** | `flex-1`, ≥116 tall | 14 |

The following shelf is the only 3:4 in the product. Press portraits are shot for
1:1 and survive a 3:4 crop; nothing else needs a crop we can't predict.

`HeroEventCard` ships today as a full-width 180px banner (≈4:1 desktop, ≈2:1
mobile) — earlier drafts of this prompt called it 16:9, which came from the brief.
It becomes `BandCard` either way.

**The taste-pick card is a fill region, not a shape.** Its image is `flex-1` with a
116px floor because pinning an aspect ratio there broke the row in #763 r4.
`FlexArt` therefore sets **no `aspect-ratio` and no min/max crop promise** — the row
owns the height. The art is composed square and cover-filled, so it degrades by
cropping rather than stretching, and it keeps the same radius, hairline and tint as
every other slot.

## Source resolution (priority unchanged) — walk the WHOLE chain

```
event surfaces : events.imageUrl → headliner artists.photoUrl → generated art
artist surfaces: artists.photoUrl → generated art
```

Reference: `resolveEventImage(entry, dead)` / `resolveArtistImage(entry, dead)` in
`imagery-sources.jsx`; `useSlotSource(name, dead, surface)` is the single lookup every
surface uses. Both return the hops walked, so a surface can label or log which
source it landed on.

**A dead artwork URL falls to the headliner’s portrait, not to generated art.** This
is the thing an implementation most easily gets wrong (our own R2 mock got it wrong):
on an event surface holding both sources there are three outcomes —
`artwork → portrait`, `portrait → generated`, and `artwork → portrait → generated`
when both remotes die. `Slots and States.html` §8 renders all of them with chain
receipts.

- **Photograph** (either source): render it, `object-fit: cover`, plus
  `var(--image-tint)` and the panel hairline. **No filters, no duotone, no
  blend layers.** At panel size a photograph is already right.
- **Generated art**: the shipped Phase 7.5 `IdentityArt`, `showInitials={false}`,
  `grain={0.06}`. Templates and palettes are unchanged — §9 of `Slots and States.html`
  carries the evidence at 44 / 56 / 112 / 208 across all three themes, including the
  one exception we would accept a cut on (`mesh` at hero scale).
- The image **never sets its own height**. The panel owns the box; the source
  fills it.

## Components to build

`Panel` is the only image primitive. Everything else composes it.

```
Panel      ({ name, size, ratio = "1 / 1", radius, source, place|art|tone })
FlexArt    ({ name, minHeight = 116, radius, source… })   // no ratio, ever
HeroBand   (Panel + { eyebrow, title, sub, chips, size: "mobile"|"desktop", back })
BandCard   (Panel + { eyebrow, sub, width })
ShelfCard  (Panel at 3:4 + { sub, meta, width = SHELF_CARD_WIDTH })
RowTile    (Panel + { watching })
AvatarSlot (Panel + { size })
```

Reference implementation: `imagery-slots.jsx` in this folder. It is a mock (it
renders stand-in art instead of an `<img>`), but the geometry, tokens and
composition are final — port it, swapping the source branch for the real
`<img>` / `IdentityArt` pair.

### `HeroBand` details

- Field background, generated art:
  `linear-gradient(120deg, color-mix(in srgb, {palette.primary} 26%, var(--bg)) 0%, var(--bg) 62%)`
  where `palette.primary` comes from `identityFor(name, 'artist').palette`.
- Field background, photograph (cannot be sampled client-side — no proxy, no CDN):
  `linear-gradient(120deg, color-mix(in oklch, var(--surface-2) 92%, transparent) 0%, var(--bg) 66%)`
- Bottom edge: `1px solid var(--border)`. No scrim, no vignette.
- Padding: `16px 16px 18px` mobile / `26px 34px 28px` desktop.
- Type: eyebrow `--signal` mono 10/11 at 0.14em; title Inter 900, 26 mobile /
  44 desktop, `letter-spacing: -0.035em`; sub mono `--fg-muted`.
- The back chip lives in the band, above the panel, 44×44 target.
- **The page below the band starts at content.** Delete the negative top margin
  that currently pulls the title over the hero.

### Removals

1. **The monogram / initials chip is deleted everywhere.** `IdentityArt` is always
   called with `showInitials={false}`. The panel is the identity object and the
   name sits beside it at full size. (`ia_getInitials` stays — alt text and the
   admin surfaces still use it.)
2. **The wide hero image, its bottom scrim and its blur wash** go with it.
3. **`HeroEventCard`'s 16:9 crop** is replaced by `BandCard` at the same grid
   footprint.

## Tokens

| Thing | Value |
|---|---|
| Panel hairline | `inset 0 0 0 1px color-mix(in oklch, var(--fg) 12%, transparent)` |
| Photo tint | `var(--image-tint)` (transparent in Light, by design) |
| Band field · art | `color-mix(in srgb, {palette.primary} 26%, var(--bg))` → `var(--bg)` |
| Band field · photo | `color-mix(in oklch, var(--surface-2) 92%, transparent)` → `var(--bg)` |
| Watching tick | `var(--accent)`, 12px, `2px solid var(--bg)` ring, on the panel |
| Eyebrow | `var(--signal)` |
| Radius | 8 row · 12 panel · 14 card · full avatar |
| Shelf width | `SHELF_CARD_WIDTH = 168` |

Every value is a token or derived from one. The single non-token colour is the
band field for generated art, and it is derived from that art's own palette
rather than authored — the same call Phase 7.5 made about palettes being
theme-independent.

## Failure path

Remote URLs (Spotify portraits especially) are signed and expire, and can fail
**after** render begins. Wire `onError` on the `<img>` and advance to the **next hop in the chain** — not a
null check at fetch time, and not a jump to `IdentityArt`. On an event surface a dead
artwork lands on the headliner’s portrait; only a dead portrait (or no portrait at
all) lands on generated art.

Because the generated art is deterministic per name and the panel is the same box
in both states, the swap costs **no layout and no reflow**. No spinner, no broken
image glyph, no placeholder shimmer. `Slots and States.html` §8 has the toggle.

## Performance

Cheaper than what ships today, and deliberately so — these slots appear 20+ times
in a scrolling list:

- Tallest image on event detail: ~300px of scrimmed pixels → a 128px panel.
- No CSS filter chains, no `mix-blend-mode`, no SVG filter graphs, no second copy
  of an image. The field is a two-stop gradient.
- Row tiles render `IdentityArt` at `micro` / `tile` scale, never `hero`.

## Open question for product (blocks nothing)

**The 44px row tile.** At row size a scraped flyer is unreadable text and a press
portrait is a colour swatch, while the generated mark stays legible. Preferring
the generated mark in the smallest slots would fix it, but that changes the locked
source priority, so it needs a product decision. Everything above works either
way — it is one branch in `Panel`.

## Also worth resolving

The follow shelf renders through `CardArt` rather than the shared component, so the
`ShelfCard` mock assumes a unification this spec never ordered. Per the audit that is
a Spec A amendment; nothing in this prompt depends on it.


`design_handoff_venue_imagery` still specifies a riso duotone treatment for venue
facade photos. Under this handoff artist photographs stay photographs, so the two
halves of the product disagree. Either venues drop the ink, or the ink becomes
venue-only on purpose. Design call, not an implementation blocker.
