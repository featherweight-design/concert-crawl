# Event &amp; artist imagery — design handoff

Brief: `docs/superpowers/specs/2026-08-08-artist-imagery-standardization-design.md`. Track 2.

**Round 3 is the current state.** R2's shape call stands and is locked — two shapes,
photographs stay photographs, generated art keeps its templates. R3 closes the four
things the audit asked for: the real source chain, evidence for the retune, the
taste-pick card, and three small corrections. Round 1 is kept as the record of how
the framing changed.

| File | Round | What it holds |
|---|---|---|
| `Composed Bands.html` | 3 · **current** | The shape system · event-detail band (mobile + desktop, all sources) · browse hero · event card · **the taste-pick fill region** · following shelf · artist page |
| `Slots and States.html` | 3 · **current** | The mixed list at 390 / 320 / desktop · small slots · **the full source chain and its three failure outcomes** · **retune evidence at real sizes** · token + component contract |
| `Imagery Directions.html` | 1 | Unification scope A/B/C, four treatment languages |
| `Placeholder Retune.html` | 1 | Three placeholder retunes |

Tweaks in both current files: theme (Electric / Jade / Light), **failed remotes**
(none / artwork / portrait / both), and surface (browse / watching / venue) for the
lists.

## The turn this handoff took

Round 1 read the brief's two problems as *pixel* problems and proposed re-inking
photographs (riso duotone languages) plus a placeholder retune. Then Hugh sent
screenshots of all eight live image slots, and the pattern in them was different:

> **Every strong slot is square or portrait and large. Every weak slot is wide.**

The following shelf (3:4) and the artist page (1:1) already work with *both* a
press photo and generated art — Hotel Allan's rings read as a record sleeve next
to Caamp's sunflowers. The event-detail and browse heroes fail for one shared
reason: a square source stretched across a wide band collapses into a colour
wash, which then needs a monogram tile floating over the title to say who it is.

So the defect is **shape**, not ink. Re-inking a portrait cannot fix a 300px band.

## Round 3 — what changed

**The failure path mocks the real chain.** R2 collapsed every failure to the
placeholder in one hop. The locked chain is `artwork → portrait → generated`, and
shipped `EventImage` already walks `[imageUrl, artistPhotoUrl]` before
`IdentityArt` — so a venue artwork that 404s must fall to the **headliner's
portrait**. Fixed at the source: `EAI_EVENTS` now records what each event *holds*
(artwork and/or portrait; 3 of 8 hold artwork, 2 of those hold a portrait behind
it), `resolveEventImage(entry, dead)` walks
the chain and returns the hops it took, and `resolveArtistImage` is the two-hop
artist version that never borrows event artwork. `Slots and States.html` §8 shows
all **four** outcomes — healthy, artwork ✗ → portrait, both ✗ → generated, and the
portrait-only event whose chain is genuinely two hops — each with a chain receipt,
plus the swap inside a live list.

**The retune is shown, not asserted.** §9 renders the generated art at 44 / 56 /
112 / 208 in the four loudest palette-template combinations in the registry (p2
saffron+crimson and p0 fuchsia+cobalt on mesh, p6 violet+lime on halftone, p4
ember+aqua on stripes), shipped rendering beside retuned, plus one combo across all
three themes and — the artboard that actually decides it — the retuned tiles inside
real rows. Our read: at 44–56 the palette is an accent and the row's hierarchy
holds; at 112–208 the geometry becomes the subject, which is what the shelf and the
artist page want. **One honest exception:** `mesh` at hero scale still reads hot in
p0/p2, because mesh is a gradient field with no geometry to resolve into — scale
only makes it a bigger gradient. **The cut was taken (Hugh, 2026-08-14):** `mesh` is
dropped from the template pool **at hero scale only** and stays available at tile and
micro. Palettes are unchanged and are not to be re-opened without new evidence.

**The taste-pick card is in the system as a fill region.** `DiscoveryShelf`'s
Spotify pick cannot take a ratio — its image is `flex-1` with a 116px floor because
pinning an aspect broke the row in #763 r4. So it is not handed 3:4: it gets
`FlexArt`, which pins **no ratio and no crop promise**, composes the art square and
cover-fills whatever height the row gives it, and keeps the same radius, hairline
and tint as every other slot. This **corrects decision 2**: the product has two
shapes *and one fill region*, and that is the only one. `Composed Bands.html` §4b
renders four cards at four different image heights on purpose.

**Corrections.** `SHELF_CARD_WIDTH = 168` (was 176 — ours, not yours).
`useSlotSource` is the single lookup on the `Slots and States` canvas and the dead
map binding is gone; `Composed Bands` calls the same two resolvers through a local
`src()` helper, so there is one chain implementation, not two. `SLOT_SPEC` describes the event card as a
full-width 180px banner (≈4:1 desktop, ≈2:1 mobile), not 16:9 — the error came from
the brief and correcting it doesn't change the answer.

## Decisions (round 2 — locked)

**1 · Wide slots stop being image slots.** A hero is now a **band**: a 1:1 panel,
an ink field derived from the art behind it, and the type as a real column beside
the panel. The band absorbs the title block that used to sit under the hero,
which removes the negative-margin overlap as a side effect.

**2 · Two shapes, plus one fill region.** `Panel` at 1:1 (rows, cards, every hero,
artist page), `Card` at 3:4 (the following shelf), and `FlexArt` with no ratio at
all (the taste-pick card — see R3). Because the source is square and the slot is
square, the subject-placement problem — the failure we cannot detect — stops
existing.

**3 · The monogram chip is retired everywhere.** It existed only because a wide
image couldn't say who it was. The panel is the identity object and the name sits
beside it at full size.

**4 · Photographs get frame + `--image-tint` and nothing else.** At panel size
they are already right. The riso press languages from round 1 are **not** part of
the recommendation; `imagery-treatments.jsx` stays in the folder as the record of
that exploration.

**5 · The generated placeholder keeps its palettes, and all its templates except
`mesh` at hero scale** — now with evidence (see R3 above). Hugh's call,
and the bands justify it: `mesh` only failed because it was being stretched wide.
Rendered in a 1:1 panel at the size it was designed for, it holds. The retune is
therefore *only* the monogram removal — the smallest change that fixes the
complaint, and no new art system to maintain.

**6 · The shipped `EventRow` is not forked.** Both round-2 lists render the real
component from `design_handoff_event_row_system`; only its image slot is swapped
(`window.IdentityArt` → a `Panel` shim, with per-artboard state passed through
React context, never through a mutated global). Meta budget, truncation ladder
and price stack are untouched.

**7 · Cost went down, not up.** The tallest image on event detail drops from
~300px of scrimmed pixels to a 128px panel; the field behind it is a two-stop
gradient. No filter chains, no blend layers, no second image fetch.

## Flagged for the spec (not designed)

**The 44px row tile.** At row size a scraped flyer is unreadable text (ISOxo,
Dimmu Borgir in the live screenshots) and a press portrait is a colour swatch
(REZZ), while the generated mark stays legible. Preferring the generated mark in
the smallest slots would fix it — and that is a change to the **locked source
priority**, so it needs a spec decision, not a design one. **Deferred (Hugh, 2026-08-14)** — it
does not gate this build. Everything in this handoff works either way.

## Files

- `imagery-slots.jsx` — **the deliverable.** `Panel`, `FlexArt`, `HeroBand`,
  `BandCard`, `ShelfCard`, `RowTile`, `AvatarSlot`, `SLOT_SPEC`, `useSlotSource`,
  `sl_field`, `SL_RADIUS`, `SHELF_CARD_WIDTH`.
- `imagery-sources.jsx` — the source states as stand-ins: `PortraitBase` (five
  subject placements), `VenueArtBase`, `EAI_EVENTS` (what each event holds),
  `resolveEventImage` / `resolveArtistImage` (the chain), and `EAI_SOURCE_MAP` as a
  healthy-chain view for the round-1 canvases.
- `imagery-treatments.jsx` — round 1's treatment languages. Superseded; kept as
  the record.
- `placeholder-v2.jsx` — round 1's three retunes. Superseded by decision 5; kept.
- Copied unmodified: `theme-context.jsx`, `ios-frame.jsx`, `tweaks-panel.jsx`,
  `identity-art.jsx`, `event-row.jsx`, `row-data.jsx`, `spotify-shared.jsx`,
  `cc-tip.jsx`.
- `design-canvas.jsx` — **locally modified**: artboards mount on a stagger
  (`DCLazy`), because a canvas full of image slots otherwise paints in one
  blocking frame.

## Gap report

- **No real photographs.** Both photo sources are geometric tonal stand-ins (the
  same approach `design_handoff_venue_imagery` took with `FacadeBase`), watermarked
  on every artboard. Drop real press photos in and nothing about the composition
  changes — that is the point of choosing shape over treatment.
- **Copy is out of scope** per the brief; the mocks reuse shipped strings only.
- **Nine themes, three mocked.** Token-only discipline. The single non-token
  colour is the band field for generated art, and it is derived from the art's own
  palette rather than authored.
- **The follow shelf renders through `CardArt`,** not the shared component, so
  `ShelfCard` assumes a unification the eng spec never ordered. Noted in §4b;
  per the audit that is a Spec A amendment, not a change here.
- **Venue imagery** (`design_handoff_venue_imagery`) specifies a riso treatment
  for facade photos, which under decision 4 artists don't get. **Settled 2026-08-14:
  the ink is venue-only on purpose** — a facade is a place and prints well, a
  portrait is a person and doesn't. Neither handoff changes; noted in both.
