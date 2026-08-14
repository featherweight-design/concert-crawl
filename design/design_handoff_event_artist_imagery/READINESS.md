# Design Readiness Review — Event & artist imagery (#1525)

**2026-08-14 · Round 3 · Verdict: 🟢 Green — ready for an engineering plan.**

Brief: `docs/superpowers/specs/2026-08-08-artist-imagery-standardization-design.md`, Track 2.
R2 was reviewed on the same terms and came back 🟡 Yellow on four gaps. All four are closed.

**Method.** Findings come from executing the prototype, not from reading its README. The
resolvers in `imagery-sources.jsx` were run headless across every event × failure-state
combination; `identityFor` was run against its override arguments; the palette registry was
diffed byte-for-byte against `origin/main`; every geometry claim was checked against the
shipped component rather than the brief. Where a claim in the README turned out to be wrong,
that is recorded below as a nit and fixed in this PR — per the standing rule that one-line
corrections land in the verdict PR rather than triggering another design round.

---

## ✅ Gap 1 — the real source chain — closed

R2 collapsed every failure to the placeholder in a single hop. The locked chain is
`artwork → portrait → generated`, and shipped `EventImage` already walks
`[imageUrl, artistPhotoUrl]` before `IdentityArt`, so an artwork that 404s must fall to the
**headliner's portrait**. R3 fixes this at the source rather than in the artboards.

Executed: 8 events × 4 dead-states × 2 resolvers = **64 outcomes, all correct.**

| Check | Result |
|---|---|
| `holdfast` / `longname`, artwork dead | Falls to the headliner portrait, not the placeholder |
| `fkj`, artwork dead (no portrait behind it) | Falls to generated — correct, there is nothing between |
| `resolveArtistImage`, all 32 cases | Never returns an `art` key — it is structurally incapable of borrowing event artwork |
| `EAI_EVENTS` keys vs `R_SHOWS` ids in `row-data.jsx` | All 8 match; nothing silently degrades to a placeholder because of a typo'd id |
| Chain receipts | Match the hops actually taken in all 64 cases |

`Slots and States.html` §8 renders all four outcomes — healthy, artwork ✗ → portrait,
both ✗ → generated, and the portrait-only event whose chain is genuinely two hops — each with
its receipt, plus the swap inside a live list.

The R2 one-hop collapse survives only in `Imagery Directions.html` and `Placeholder Retune.html`.
Both are round-1 and superseded, and both read `EAI_SOURCE_MAP` (the healthy-chain view), which
is the correct thing for them to read.

## ✅ Gap 2 — evidence for the retune — closed, with a spec consequence

§9 renders the generated art at 44 / 56 / 112 / 208 across the four loudest palette-template
combinations in the registry, shipped rendering beside retuned, plus one combo across all three
themes and the retuned tiles inside real rows.

| Check | Result |
|---|---|
| `identityFor` honours `templateOverride` / `paletteOverride` | Yes — verified by execution, so the artboard is showing the combination it labels |
| `IA_PALETTES` vs `origin/main:apps/web/src/components/consumer/identity-art/IdentityArt.tsx` | Byte-identical, 8 entries p0–p7 — the loud palettes are the real ones |
| `mode="shipped"` column | Faithfully reproduces the shipped `showInitials` default and grain |

**The consequence.** The delivered retune is monogram-off, grain 0.10 → 0.06, panel hairline on.
Brief §2.4 also asked for "lower contrast, less palette variance" — Design declined that on
evidence, having shown the palettes hold once the slot is square. That is a real divergence from
the brief, so the brief is amended rather than left to disagree silently: see §2.4,
*Amended 2026-08-14*.

## ✅ Gap 3 — the taste-pick card — closed

`DiscoveryShelf`'s Spotify pick cannot take an aspect ratio — its image is `flex-1` with a 116px
floor, because pinning a ratio broke the row in #763 r4. R3 gives it `FlexArt`.

`FlexArt` carries **no `aspectRatio` property anywhere** — verified by reading the component, not
its description. It therefore cannot reproduce the r4 regression. It composes the art square,
cover-fills whatever height the row gives it, and keeps the same radius, hairline and tint as
every other slot. §4b renders four cards at 116 / 150 / 132 / 116 on purpose.

This corrects locked decision 2: the product has two shapes **and one fill region**, and that is
the only one.

## ✅ Gap 4 — the three corrections — landed

| Correction | State |
|---|---|
| `SHELF_CARD_WIDTH = 168` (was 176) | ✅ matches shipped `constants.ts` |
| `SLOT_SPEC` event-card row describes the 180px banner, not 16:9 | ✅ |
| Dead-map global binding removed | ✅ gone; state passes through React context |
| README claim that every surface reads `useSlotSource` | ❌ was false — `Composed Bands` calls the resolvers through a local `src()` helper. Fixed in this PR (see nits) |

---

## Nits — fixed in this PR

Three, all one-line, none of them design decisions.

1. **Miscount.** README and `imagery-sources.jsx` said "3 of 8 hold both". Three events hold
   artwork; **two** of those hold a portrait behind it. Corrected in both places.
2. **`resolveEventImage(entry, null)` threw.** The default parameter `dead = {}` fires only on
   `undefined`, never on `null`, so an explicit null dead-map crashed on `dead.artwork`. Both
   resolvers now normalise with `deadArg || {}`. Latent, but the artboards pass a state object
   that can legitimately be null.
3. **Stale 16:9.** `Composed Bands.html`'s event-card artboard — the one that exists to
   demonstrate the 180px-banner correction — was still drawing and labelling a 16:9 card.
   Redrawn at the shipped `h-[180px] w-full` geometry. The same stale reference appeared three
   times in the brief and is corrected there too.

---

## Hugh's calls — resolved 2026-08-14

**1 · Mesh at hero scale — take the cut.** `mesh` is a gradient field with no geometry to
resolve into, so scale only makes it a bigger gradient; it is the one combination that fails its
own test at 208. It is dropped from the template pool **at hero scale only** and stays available
at tile and micro. Palettes are unchanged.

**2 · The 44px row tile — deferred.** At row size a scraped flyer is unreadable text and a press
portrait is a colour swatch, while the generated mark stays legible. Preferring the generated
mark in the smallest slots would fix it, but that is a change to the **locked source priority**
and needs a spec decision, not a design one. Everything in this handoff works either way, so it
does not gate the build.

**3 · Venue riso — the ink becomes venue-only on purpose.** Decision 4 here gives artist
photographs frame plus `--image-tint` and nothing else, while
`design_handoff_venue_imagery` specifies a riso treatment for facade photos. That is no longer
read as a contradiction to reconcile: a venue facade is a place and prints well; an artist
portrait is a person and does not. Neither handoff changes.

---

## Owed upstream (does not block this handoff)

- **Spec A amendment — the `CardArt` bypass.** Four call sites render through `CardArt` rather
  than `EventImage`: `ShelfCard.tsx`, `ArtistPickTile.tsx`, `ArtistManageRow.tsx`,
  `FollowNudgeCard.tsx`. Spec A §3.3 names only `SearchResultsState`. `ShelfCard` here assumes a
  unification the engineering spec never ordered, so the spec needs to order it. Engineering-side,
  not a design change.
- **No real photographs.** Both photo sources are geometric tonal stand-ins, watermarked on every
  artboard — the same approach `design_handoff_venue_imagery` took with `FacadeBase`. Dropping
  real press photos in changes nothing about the composition, which is the point of choosing
  shape over treatment.
- **Three themes mocked, nine shipped.** Token-only discipline throughout. The single non-token
  colour is the band field behind generated art, derived from the art's own palette.

---

## Verdict

🟢 **Green.** The four R2 gaps are closed, the three nits are fixed in this PR, the one place
Design diverged from the brief is now written into the brief, and the three open calls are
decided. The handoff is ready for an engineering plan PR under `docs/superpowers/plans/`.
