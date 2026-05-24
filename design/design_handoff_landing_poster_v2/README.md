# Landing Poster v2 — engineering handoff

Redesign of the hero poster animation on the landing page (replaces the
`GigPosterStack` in `landing-screens.jsx`). The animated posters now share
their visual language with the shipped sharable poster
(`design_handoff_shareable_cards/share-cards.jsx → PosterCard`) and the
Phase 7.5 IdentityArt engine.

> **Out of scope:** the original `Auth Gate.html` is untouched. This handoff
> only redesigns the poster + animation. Code-entry screens and the rest of
> the auth-gate flow stay as they are; ship by swapping the import inside
> `landing-screens.jsx`.

## Files

| File | Role |
|---|---|
| `Landing Poster v2.html` | Canvas — landing screens + motion-mode comparison + single-poster QA |
| **`landing-poster.jsx`** | **Ship this.** `<LandingPoster show width height grain/>` — single static poster |
| **`landing-poster-stack.jsx`** | **Ship this.** `<LandingPosterAnimation mode="stack\|ticker\|wall"/>` |
| `landing-screens-v2.jsx` | Updated `LandingMobile` / `LandingDesktop` showing the new poster in context (reference; the production landing screens just swap the import) |
| `landing-events.jsx` | Canvas-only fixture for the poster animation |
| `identity-art.jsx` | Copy of the Phase 7.5 engine — `<LandingPoster>` depends on `window.IdentityArt` + `window.identityFor` |
| `theme-context.jsx`, `design-canvas.jsx`, `tweaks-panel.jsx`, `ios-frame.jsx` | Shared infra copies |

## What the new poster does differently

| Old (`gig-poster.jsx`) | New (`landing-poster.jsx`) |
|---|---|
| 8 hand-picked tri-tone palettes (orange+black, electric blue, etc.) | Palette comes from `identityFor(artist, "artist")` — same image the share card uses |
| Decorative SVG shapes (blobs, circles, slash) | Full-bleed `<IdentityArt scale="hero">` |
| 290×400 mobile / 420×580 desktop | **5:7 portrait card** at all sizes (matches original aspect; gives long band names room) |
| Date in lowercase mono at top | Mono date row above the title; **state pill** (TONIGHT / GOING / SOLD OUT / PRICE DROP) top-right; city eyebrow top-left |
| Plain heavy title | Heavy title with **mis-registered ink-ghost** (riso overprint cue) |
| Opener line in Caveat | Opener as a small mono "+" attribution |
| Always-on `Caveat` script font | Inter + JetBrains Mono only — matches CLAUDE.md type system |

## Three animation modes

`<LandingPosterAnimation mode>` accepts:

- **`stack`** (default) — drift-and-fade pile of 3 cards. Same motion as the
  previous gig-poster stack; just wearing the new poster. Best when the
  animation IS the focal element of the hero.
- **`ticker`** — three cards slide leftward at a steady pace, leftmost
  wraps to the right. Feels like a flyer wall. Good when the hero has lots
  of horizontal room.
- **`wall`** — single column scrolling upward, loops seamlessly. Feels
  like a feed. Works well on tall mobile heroes.

Switch them at runtime with the Tweaks panel. Recommendation in scope-out
below; default ships as `stack`.

## Recommendation

**Ship `stack`** as the default. It matches what's there today (no
regression in motion expectations), and the redesigned posters carry all
the brand work on their own — no need to make the motion louder. `ticker`
and `wall` are exposed as options in case product wants to A/B against
"feed" energy, but they aren't necessary to win the redesign.

## API

```jsx
<LandingPoster
  show={{
    artist:    "Geese",
    venue:     "Larimer Lounge",
    city:      "Denver, CO",
    dateShort: "MAY 23",
    showTime:  "9:00pm",
    opener:    "Mary in the Junkyard",   // optional
    state:     "tonight",                // tonight | going | soldout | drop
  }}
  width={300}
  height={533}             // optional; defaults to 16:9 portrait (width × 16/9)
  grain={0.10}             // optional; passed through to IdentityArt
/>

<LandingPosterAnimation
  mode="stack"             // "stack" | "ticker" | "wall"
  shows={LP_EVENTS}
  width={300}
  height={533}             // optional
  intervalMs={5200}        // stack: time between advances; ticker/wall: loop length
/>
```

## Sizing notes

Everything inside `<LandingPoster>` (padding, type, pill sizes) is
proportional to `width`. The same component renders cleanly at:

- ticker tile: 230–300px wide
- stack hero (mobile): 280px wide
- stack hero (desktop): 340–380px wide
- one-frame screenshot: 380–420px wide

The aspect ratio defaults to **5:7 portrait card** (`height = width × 1.38`),
the same aspect as the original landing posters. Overriding `height` is
supported but not recommended; the title autofit assumes that ratio.

> **Why not 9:16 like the share card?** The share card lives at full
> screen on a phone (1080×1920). The landing animation lives in a small
> hero slot alongside a heading and CTAs — 9:16 forces the card too
> narrow there and chokes long artist names. The two contexts pull in
> opposite directions; we let them.

## Stack motion — 4-card rotation

The stack renders FOUR cards even though only three are visible at rest.
The fourth ("on deck") sits below-and-behind the bottom card at opacity 0.
When `advance()` fires, layer 0 drifts up + fades, layer 1 promotes to top,
layer 2 promotes to mid, and the on-deck card slides up + fades in to take
the bottom slot — so the pile never thins to two cards during a transition.
Without this, there is a brief moment mid-animation where the stack reads
as a 2-card pile, then a 4th card pops in once `idx` advances. This file
fixes that.


## State pill

Driven by `LP_STATE_PILLS` in `landing-events.jsx`. The TONIGHT pill is
intentionally the loudest — inverted (ink-on-paper) with a pulsing dot — so
when an event is happening today, the urgency reads from the hero without
needing a separate badge or callout. Other pills (GOING / SOLD OUT / PRICE
DROP) render as an outlined stamp on the bottom paper scrim.

## Wiring into production

1. Drop `landing-poster.jsx` + `landing-poster-stack.jsx` next to
   `landing-screens.jsx`.
2. In `landing-screens.jsx`, replace the `window.GigPosterStack` references
   with `window.LandingPosterAnimation mode="stack"` (same call shape,
   different name + a `mode` prop).
3. Map the `getHeroShows()` data to include `state` and a `dateShort`
   field — both already in `CC_EVENTS` for tonight's events; the helper
   just needs to forward them.
4. `gig-poster.jsx` becomes unused on the landing page. It is still
   referenced by `Auth Gate.html` directly — keep it around until you've
   pointed that file at the new component too, then delete.

## Open questions

1. **TONIGHT detection** — currently a fixed `state: "tonight"` on the
   fixture. In prod we want `event.startsAt < end-of-today`; this should
   live in `getHeroShows()` or upstream in the data layer, not in the
   poster component.
2. **Stack vs. ticker for desktop hero** — recommendation above is stack,
   but ticker reads as "tonight's roster" more legibly. Worth A/B if we
   have signal.
3. **Wall on mobile** — the wall mode is intentionally tall. If we ship
   it on mobile we need to either give it dedicated height or constrain
   the viewport. Out of scope here.
