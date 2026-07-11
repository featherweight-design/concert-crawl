# Supporting Artists Title Separator (#643 · Round 1)

> Track-2 rendering fix across every surface that shows `event.title`. Beta feedback:
> supporting artists render as a run-on string below the headliner with no visible
> separators, and the tour name is mashed into the same line. The fix is **data-first**
> (structured `supportingArtists: string[]` + `tourName: string | null`) with a proper
> billing treatment on top.
> Status: **first pass, ready for Hugh's review.**

Open `Supporting Artists Line.html` and toggle **Tweaks** in the toolbar to drive the
Section 0 browse list across separator variant · glyph · lead word · tour-name placement ·
overflow limit · status · all 9 themes.

---

## What's here

| File | What it does |
|---|---|
| `Supporting Artists Line.html` | The canvas — 11 sections, mobile + desktop, all 9 themes. |
| `supporting-line.jsx` | **The core.** `<EventTitleBlock/>` (the composed block every surface renders), `<SupportingLine/>` (atomic openers billing line), `<TourEyebrow/>`/`<TourSubtitle/>`, `<StatusPill/>`, `supportingA11yLabel()`, and the `SUPPORT_COPY` scaffolding strings. |
| `event-cards.jsx` | The three reference surfaces rebuilt on `EventTitleBlock`: `<EventCard/>` (browse/watching row), `<HeroEventCard/>`, `<DetailHeader/>`. |
| `theme-context.jsx`, `ios-frame.jsx`, `design-canvas.jsx`, `tweaks-panel.jsx` | Canonical deps, copied verbatim (9-theme token set). |

---

## The deliverables — calls made

1. **Separator treatment → spaced middot inside a mono lead-word.**
   Names are Inter 600 `--fg-muted`, joined by a `·` in `--fg-subtle` with 6px of air
   either side. The whole run is prefixed by a quiet mono lead-word (**"with"**) so it
   never reads as the venue·time·price metadata line — the lead-word frames the row as a
   *support bill*. **Variant B (Chips)** is provided as the tap-forward alternative (§2).

2. **Tour-name hierarchy → mono uppercase KICKER above the headliner.**
   This is the crux: the tour name was colliding with the openers because both wanted the
   line *below* the headliner. Lifting the tour to a kicker *above* the headliner puts the
   two concerns on different rows — collision gone. Subtitle + hidden placements are shown
   for comparison and are one Tweak away (§3).

3. **Overflow at 320px (4+ openers) → truncate + honest "+N more".**
   Show the names that fit on one line, roll the rest into `+N more` (Sour Patch copy).
   Row height is constant and the count never lies. Rejected: **wrap** (breaks list
   rhythm), **marquee** (motion tax, a11y hostile), **fade-out** (hides the count).
   The mock uses a count knob (`maxInline`); eng tunes it to measured width.

4. **Empty / single / tour-only / solo (§5).** Scaffolding never renders without data:
   single opener drops the separator (`with Hotline TNT`), tour-only shows the kicker and
   skips the billing line, solo headliner renders the name alone.

5. **Cancelled / postponed (§6).** Status pill sits in the kicker row beside the tour
   eyebrow; the block dims to `--fg-muted`, cancelled adds a `--danger` strike on the
   headliner. The openers line stays coherent — quieter, never fighting the badge.

6. **Forward-compat with #84 (§7).** Every opener name is already its own node. Flip
   `interactive` and names/chips become real tap targets (hover → `--signal`) for #84 to
   wire to the artist route — no re-layout.

7. **A11y (§10).** Openers are an `role="group"` whose `aria-label` is a natural-language
   list (`with A, B, and C`); glyphs are `aria-hidden`. Screen readers hear the **complete**
   roster even when the eye sees `+N more`. Tour kicker carries `aria-label="Tour: {name}"`.

---

## Voice (Sour Patch — scaffolding only)

Scaffolding strings are **copy**; artist names are **data** and never get styled voice.
Authored strings live in `SUPPORT_COPY`:

- **Lead word** — default `with`. Alternates in Tweaks: `plus`, `feat.`, `also playing`.
- **Overflow** — `+N more`.

At integration these externalize to `copy.ts` per the project copy rule.

---

## Data assumption (from eng)

`Event` gains `supportingArtists: string[]` and `tourName: string | null`. Design proceeds
against those — no parsing of the legacy run-on `title` string on the client.

---

## Reference surfaces aligned

- `EventCard.tsx` (browse, watching) → `<EventCard surface="card">`
- `HeroEventCard.tsx` → `<HeroEventCard surface="hero">`
- `events/[id]/page.tsx` → `<DetailHeader surface="detail">`

One `EventTitleBlock`, one size ramp (`RAMP` in `supporting-line.jsx`); each surface only
differs by ramp step + truncation. Mobile and desktop share the component.

---

## Out of scope (owned elsewhere)

- #84 Support Act Spotlight (clickable openers / artist route) — this only stays *compatible*.
- The `supportingArtists` / `tourName` data migration + backfill of legacy titles → eng.
- Genre-tag chips, price, watch state on the cards — untouched here.
