# Venue Imagery — design handoff

A **visual system + samples**, not a stateful screen. It defines how a venue
facade photo becomes a Concert Crawl–styled image, the hand-drawn overlay
language that carries per-venue signature, and the rules that keep the venue's
signature detail alive through every downstream crop.

Open **`Venue Imagery.html`** (pannable canvas, 8 sections).

## Files
- `Venue Imagery.html` — the canvas (recipe · palette · overlays · safe zone · 5 venues × 3 themes · fallback · alt text · artist brief).
- `venue-treatment.jsx` — **system half**: the riso recipe engine (`RisoImage`, SVG filters), `INK` palette + `INK_ENVELOPE`, `RECIPE_STEPS`, `FacadeBase` stand-ins, verbatim `CCMark`.
- `venue-overlays.jsx` — **artist half**: the 8 overlay marks, `SampleVenue`, `SAFE`/`CROPS`, theme-aware `FallbackCard`, and `VENUE_IMAGERY_COPY`.

---

## Decisions

**Treatment = 2-ink riso screenprint duotone.** Concert Crawl already speaks
riso (`gig-poster.jsx`, shareable show cards). Federal blue + fluorescent pink
on bone paper reads as a *printed object*, which is why it survives all three
themes: the card carries its own paper ground, so the image is
**theme-independent** — its palette is standalone, exactly as the brief scopes
it. The recipe is five real, executable steps (desaturate → duotone map →
halftone screen → misregistration → grain + paper); the SVG `feComponentTransfer`
duotone and the misregistered pink shadow-silhouette are the whole trick and are
documented in-code so an artist or the renderer can reproduce them on any photo.

**Overlay language = 8 marks, one hero.** Wordmark (hero) + blob, flourish,
burst, cluster trail, medallion, stub tag, hand arrow. Composition is
deliberately starved: one hero + ≤2 supporting, pop ink exactly once, everything
multiply-blended so it sits *in* the print rather than on it. The cluster trail
is a direct nod to `CCMark`, tying venue art back to the brand without a logo
slap.

**Safe zone = central 60% × 66%.** The signature detail + hero mark live inside
a box contained by all four crops (square venue card, 21:9 hero, 4:3 event
fallback, 1.91:1 share). `focal_x`/`focal_y` pivot the crops. Section 4 renders
the four crops from one master to prove the marquee never falls off.

**Signature-less fallback is two-tier.** (1) *In-image* — a warehouse with no
distinct detail (The Substation) gets a bold typographic name treatment instead
of a bespoke hand mark, still on the treated photo. (2) *No image at all* — the
theme-aware `FallbackCard`: system dot-cluster ground + monogram + name.

**Theme-token boundary.** Per the brief, the *image* is theme-independent (ink
palette). The **only** theme-aware pieces are the no-image `FallbackCard` and
system chrome around images — all their colors are `var(--*)`. This resolves the
brief's one internal tension (it lists "overlay typography" as theme-aware while
also calling the image theme-independent): the hand overlay is baked into the
theme-independent image and uses ink; theme tokens kick in only when there is no
image. **Flagged for Hugh's audit** in case the intent was the opposite.

**Voice (Sour Patch).** Alt text is one WCAG-A sentence describing the real
detail like a local ("its blue blade marquee lit up over Colfax"). Fallback tail
is *"portrait's in the mail"* — honest it's coming, light cheek, no apology.
Grepped clean of "last chance / we miss you / fraud / oops / image unavailable".

## Copy (ready for `copy.ts`)
All customer-facing strings are externalized in `VENUE_IMAGERY_COPY`
(`venue-overlays.jsx`), keyed for lift into
`apps/web/src/components/consumer/definitions/copy.ts` per the project copy rule:
- `altTemplate(name, signature)` — the pattern.
- `alt.{venue}` — the 5 WCAG-A per-venue strings.
- `fallback.eyebrow` / `fallback.tail` / `fallback.alt(name)` — no-image card.

## Accessibility
- **1.1.1 (A)** — every sample ships alt text; fallback card's name is its alt.
- **1.4.3 (AA)** — any text on ink clears 4.5:1 (blue `#1B2A4A` on bone `#F2EBDD`
  ≈ 11:1; fallback name is `--fg` on `--surface-2`). Documented in the palette
  envelope. Text-on-pop is avoided; pink is decorative only.
- Mobile-first: samples render legibly at 150–256px; safe zone holds at
  tight-crop 1:1.

## Surfaces this fills (no layout changes — image slot only)
venues-index cards · venue detail hero · event-card fallback · share-card
background. Crop ratios in §4 are lifted from those slots.

---

## Gap report
- **Real photos.** Facade bases here are simple geometric stand-ins so the *same*
  recipe visibly transforms all five (proving it's a system). Production runs the
  recipe on the artist's real photos — filter values are final; inputs are not.
- **Overlay specimens are stand-ins.** The 8 marks carry the spec (weight, ink,
  placement), not final hand-lettering — that's the artist's day-one output per
  §8. `SignaturelessTreatment` is production-ready as-is.
- **Halftone is an even screen**, not luminance-mapped (that needs `feImage`,
  out of scope for a browser demo). Reads correctly; a true amplitude-modulated
  screen is an integration nicety, not a blocker.
- **Theme-token boundary** flagged above — confirm the intended side.
- **Copy** lives in `VENUE_IMAGERY_COPY`, not yet in `copy.ts` (plan-PR stage).
