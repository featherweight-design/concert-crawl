# Phase 7.5 — Identity Imagery (Artists + Venues) · Engineering Handoff

## What this is

Generative-from-hash visual identity for **artists and venues**, replacing the
single-letter monogram on a hashed gradient that we shipped in Phase 5b. Same
input → same image, deterministically. No content pipeline (no Spotify OAuth,
no Bandsintown). Real press photos slot in over the same crops in **Phase 8**;
this art remains as the deterministic fallback.

## What landed in this folder

| File                                                                                            | Role                                                                                                                                          |
| ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `Identity Imagery Canvas.html`                                                                  | Reviewer canvas — surfaces, gallery, engine QA, tweaks                                                                                        |
| **`identity-art.jsx`**                                                                          | **Ship this.** Engine: hash → template + palette + rotation → SVG. Exports `<IdentityArt />`, `identityFor()`, `IA_TEMPLATES`, `IA_PALETTES`. |
| `surfaces.jsx`                                                                                  | Canvas-only mock surfaces. Real impls live in `detail-screens.jsx`, `detail-desktop.jsx`, `browse-home.jsx`, `search-mobile.jsx`.             |
| `gallery.jsx`                                                                                   | Canvas-only gallery / matrix / collision-check. Don't ship.                                                                                   |
| `phase75-canvas.jsx`                                                                            | Canvas composition + Tweaks. Don't ship.                                                                                                      |
| `theme-context.jsx`, `tweaks-panel.jsx`, `design-canvas.jsx`, `primitives.jsx`, `ios-frame.jsx` | Copies of shared infra.                                                                                                                       |

**You ship `identity-art.jsx`** (as a port — no JSX/Babel runtime). Replace
every existing `HeroImage` / monogram-on-gradient with `<IdentityArt />`.

## Public API

```jsx
<IdentityArt
  name="Wednesday" // entity name; required
  kind="artist" // 'artist' | 'venue'   — drives template subset
  scale="hero" // 'hero' | 'tile' | 'micro'
  showInitials={true} // default: hero only. Stamp lives bottom-left.
  grain={0.1} // 0..1 grain overlay; 0 = clean SVG
  templateOverride="halftone" // optional; else hash picks
  paletteOverride="p4" // optional; else hash picks
  rotateOverride={2} // 0|1|2|3 — 90° increments. else hash picks
  width={88}
  height={88} // CSS px; default 100% of parent
/>
```

There's also a pure resolver:

```js
identityFor('Mission Ballroom', 'venue')
// → { hash, template, palette, rotate, kind }
```

…handy when you need to read the palette outside the SVG (e.g. to color a
chip). `template` is one of the entries in `IA_TEMPLATES`; `palette` is one
of the entries in `IA_PALETTES`.

## Engine

- **Hash:** FNV-1a 32-bit over `"<namespace>:<name>"`. Two namespaces:
  `artist` and `venue`. Same name in different namespaces produces different
  art (so a hypothetical artist named "Mission Ballroom" doesn't collide with
  the venue).
- **Template:** `hash % templatesFor(kind).length`. Pools:
  - **Artist pool:** mesh, stripes, concentric, halftone (4)
  - **Venue pool:** mesh, stripes, concentric, blueprint (4)
  - 3 templates are shared, 1 is reserved per side (per the design plan).
- **Palette:** `(hash >> 8) % 8`. 8 riso-inspired palettes; 4 light papers, 4
  dark papers. **Palette is fixed per entity across all 3 themes** — the art
  is theme-independent on purpose. The chrome around it (page bg, text)
  reskins; the entity's "owned" image does not.
- **Rotation:** `(hash >> 16) & 3` → 0/90/180/270°.
- **Per-template variation:** seeded RNG (LCG) starting from the same hash
  drives blob positions, stripe angle, focal point, halftone corner, etc.

## Templates (ship all 5)

1. **mesh** — riso overprint blobs (radial gradients, multiply blend).
   Soft, atmospheric. Reads at every scale.
2. **stripes** — silkscreen stripes with a 4–6px secondary mis-registration.
   Bold; carries print-craft DNA the brand wants.
3. **concentric** — record-groove arcs from an off-center focal. Mis-reg’d
   secondary underneath. Music-graphic vocabulary.
4. **halftone** _(artist)_ — solid mass anchored to a corner + halftone-dot
   field of secondary. The most "gig poster" of the set.
5. **blueprint** _(venue)_ — plan-view: fine + heavy grid, footprint
   rectangle with dashed inner rule, stage circle, sightline sweep,
   dimension ticks. Reads as architectural drawing rather than abstract.

## Palettes

8 IDs (`p0`–`p7`). Each is `{ bg, primary, secondary, ink }`.

Light papers (use dark text overlays): p0 fuchsia+cobalt, p1 tangerine+teal,
p3 mint+plum, p7 cobalt+coral.

Dark papers (use light text overlays): p2 saffron+crimson, p4 ember+aqua,
p5 gold+marine, p6 violet+lime.

**Blend mode is paper-aware.** Templates blend `multiply` on light papers
(builds the riso overprint look) and `screen` on dark papers (so inks build
rather than crush toward black). The engine picks via `ia_isDark(palette.bg)`
from perceived luminance — don't override unless you know what you're doing.

## Initials

Hero scale only by default. Computed by `ia_getInitials()`:

- "The" / "and" / "of" / "for" / "a" / "an" / "&" / "to" / "in" / "on" / "at"
  are dropped before picking words
- 1 word → first 2 chars (e.g. "Geese" → "GE")
- ≥2 words → first letter of first two words (e.g. "Mannequin Pussy" → "MP")

**Initials render in a chip with a translucent backplate** (white-tinted on
light papers, black-tinted on dark, with backdrop-blur). This guarantees
legibility over busy art — no matter where stripes / halftones / arcs land,
"RR" on Red Rocks stays readable. The chip sits bottom-left of the art.

Tile and search-row surfaces default to `showInitials={false}` — the art
itself is the identity at small scale, and the surface already has the
written name next to it.

## Surfaces touched (replace the monogram, keep the layout)

| Surface                      | Where it is                                | Crop / size                             |
| ---------------------------- | ------------------------------------------ | --------------------------------------- |
| Event Detail · mobile hero   | `detail-screens.jsx` `EventDetailMobile`   | full-width, 320–360px tall              |
| Event Detail · desktop hero  | `detail-desktop.jsx` `EventDetailDesktop`  | square-ish in the left column, ~480×480 |
| Venue Profile · mobile hero  | `detail-screens.jsx` `VenueProfileMobile`  | full-width, ~320px tall                 |
| Venue Profile · desktop hero | `detail-desktop.jsx` `VenueProfileDesktop` | mirrors event-detail desktop            |
| Browse list tile             | `browse-home.jsx` `EventCard`              | 88×88                                   |
| Search results row           | `search-mobile.jsx` / `search-desktop.jsx` | 64×64                                   |
| Watching list (future)       | not built yet                              | 56×56                                   |

Aspect-ratio contract: **the engine renders square** (`viewBox="0 0 400 400"`,
`preserveAspectRatio="xMidYMid slice"`). When you crop a 16:9 hero from it,
you get a centered crop. This is intentional — it keeps the same image
working from `360×360` hero down to `56×56` watching-list thumbnail.

## Phase 8 fallback contract

Hard-swap. `<IdentityArt />` is the placeholder; once a real photo is
available, render the photo in the same slot at the same crop and the
generative art is gone. **No layout churn, no aspect-ratio change.**
We did _not_ design a crossfade — the engine is fast enough (it's just SVG)
that a hard swap on photo-load doesn't cause a flash.

If you want to keep some of the generative DNA after photo arrives (a
colored frame, an inset mark, a hover state), the `identityFor()` resolver
gives you the resolved palette for the entity — you can color a 1px frame
or a price chip without re-deriving anything.

## Tweaks exposed in the canvas

- **Theme** — chrome only (`electric` / `jade` / `light`). Art is
  theme-independent.
- **Show initials at hero** — toggle.
- **Grain** — slider 0..0.4. Default 0.10. Higher reads riso-printed,
  lower reads digital-clean.
- **Force template** — `auto` or any of the 5 IDs. Lets us preview an
  artist as if it had won a different template.
- **Force rotation** — `auto` or 0/1/2/3.

These exist for design review. **None of them ship as user-facing toggles**
in v1. If product wants any of them user-facing later (e.g. an admin override
on a per-entity basis), `templateOverride` and `paletteOverride` already
take a string ID — wire to a DB column and we're done.

## Accessibility / contrast

- **Initials chip** has ≥4.5:1 contrast against its own backplate by
  construction (white text on rgba(0,0,0,0.55) over any palette; dark text
  on rgba(255,255,255,0.78) over any palette).
- **Art-only contrast** is decorative; the surface always pairs the art
  with the entity's name as real DOM text. Don't read identity off the art
  alone — it's a visual marker, not a label.
- **Color-blindness:** template choice gives a strong second signal beyond
  palette — `mesh` reads soft, `stripes` reads geometric, `concentric` reads
  radial, `halftone` reads dotted-mass, `blueprint` reads architectural.
  No two same-template entities share both palette and rotation across the
  12+12 gallery (verified on canvas).

## Performance

- Each `<IdentityArt />` is one SVG with 5–25 child shapes. No filters
  (`feTurbulence` runs once, in the grain overlay's data-URL — not per
  paint). No JS animation. The grain overlay is a single 160×160 PNG-ish
  data-URL that the browser caches.
- For a 12-tile Browse list: ~12 SVGs, each <2KB serialized. Cheap.
- If we ever want to be defensive: memoize `identityFor()` results.

## Open questions / known gaps

1. **No "compact monogram" template** — we removed it on purpose; the new
   set is opinionated. If product wants a fallback "just initials on a flat
   color" treatment for low-bandwidth or accessibility cases, add a 6th
   template. Easy to wire: append to `IA_TEMPLATES` with `kinds: ["artist","venue"]`.
2. **No artist-vs-venue stylebook divergence beyond the reserved templates.**
   We considered subset-splitting palettes too (cooler/architectural for
   venues, hotter for artists) but it bordered on contrived; we kept the
   palette pool shared and let the _template_ carry the kind signal.
3. **Initials stamp typography is Inter Black 900.** The brand wordmark uses
   the same. If we ever want a different display face (e.g. a condensed
   sans for poster vibes), it's one declaration in `<IdentityArt>`.
4. **No "official" mode.** When a real venue / artist supplies their own
   logo or color, we'll want a path for "use this instead." Out of scope
   here — pairs with Phase 8 content pipeline.

## Voice

This art is **not a logo system** — don't market it as such. It's a
placeholder that's intentional enough to ship. The internal language is
"identity art" (per the design plan), not "artist artwork" (which implies
something curated by the artist).

## What to recreate in code

Port `identity-art.jsx` to your real React tree. The component is pure,
takes only props, and has no external dependencies beyond React. No
context, no hooks, no localStorage. The `Object.assign(window, …)` lines
at the bottom are canvas-only globals — drop them on port and use named
exports.

The grain overlay uses a small inline SVG data-URL — keep it; it's the
single biggest contributor to the riso feel. Strip it and the art reads
flat-vector / digital.

---

**Status:** ready for review. Pinged Code with the canvas link; will iterate
based on Hugh's first-pass on the gallery distribution.
