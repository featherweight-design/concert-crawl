# #1114 — Bespoke per-venue imagery (design brief)

**Ticket:** [#1114](https://github.com/HartiganHM/concert-crawl/issues/1114) — Bespoke per-venue imagery — real venue vibe with a design twist
**Phase / Priority:** Launch · Normal
**Track:** 2 (needs design)
**Status:** Amended 2026-07-20 (see §10) — 🚦 Paused, awaiting human illustrator engagement
**Follow-up filed:** [#1128](https://github.com/HartiganHM/concert-crawl/issues/1128) — Fully illustrated per-venue imagery (**superseded by the 2026-07-20 amendment; to be closed**)

> **⚠️ Amended 2026-07-20:** the Q3 technique lock was re-scoped after Claude Design's initial handoff attempt landed 🔴 Red (`design/design_handoff_venue_imagery/READINESS.md`). v1 skips the AI-assisted iteration entirely — illustration is human-commissioned from day one. See §10 for the full amendment. The rest of the brief (Q1, Q2, Q4, Q5, Q6 locks + technical requirements) still holds and shapes what the illustrator delivers within.

---

## 1. Purpose

Displace the current generic placeholder / genre-color fallback with a bespoke image per Denver venue. Denver's ~20–50 venues have wildly different vibes — Bluebird's marquee, Ophelia's neon storefront, Larimer's brick warmth, Red Rocks' geology — and losing that distinctiveness in the product flattens the scene the app represents.

The bar is both: **cohesive as a visual system** (all venues feel like siblings) AND **recognizable per venue** (someone who's been to Bluebird should see it and immediately think "yes, that's Bluebird"). Hitting both is the tension we're designing around.

## 2. App context

- **Surfaces rendering venue imagery today:** venue index cards (`apps/web/src/components/consumer/venues-index/`), venue detail page hero, event card fallback (when an event has no primary image, it falls back to venue imagery), share cards (social sharing background).
- **Current state:** generic placeholder / genre-color solid — no venue-level distinctiveness.
- **Denver venue count:** ~20–50 in the crawl at any given time; new venues added regularly by the crawler.
- **Existing atoms:** none directly reusable — this is a net-new asset system. Genre colors and theme tokens are the only existing visual primitives that intersect.
- **Voice:** Sour Patch for any surrounding copy — cheek + honesty rail + warmth. No brochure copy.
- **Hugh's bar:** "blow people away" quality; willing to bring in an artist to hit it.

## 3. Locked decisions

| # | Decision | Rationale |
|---|---|---|
| 1 | **Hybrid template + per-venue signature for v1.** Artist collaboration is on the table (Hugh's stated openness). Bespoke fully-illustrated is v2 (#1128). | Balances the designer-quality bar with production feasibility for ~20–50 venues. Hybrid means the base scales via a repeatable treatment recipe; the per-venue signature carries the artist's touch. |
| 2 | **Facade / exterior signature** is the recognizability anchor. | Most photo-referenceable (existing venue photos + Google Street View). Most literal on the ticket's "what it looks like" frame. Fallback for venues without a signature facade is a deliberate Design call. |
| 3 | **Photo base + illustrated overlay** is the v1 technique. Fully illustrated from photo reference is v2 (#1128). | Base scales via the treatment recipe; overlay carries the per-venue signature the artist owns. Directly matches Q1's "template + signature" lock. |
| 4 | **Theme-independent.** One image per venue works across all 3 themes (Electric / Jade / Light). | Simplest production, cleanest venue identity (Bluebird looks like Bluebird everywhere). Design constrains the palette to read against all 3 theme backgrounds. |
| 5 | **One source per venue** with safe-zone composition + per-venue focal-point coordinate. | Downstream surfaces use `object-position` set to the focal point to crop to any aspect ratio without cutting the signature detail. One artist-produced piece per venue; aspect-ratio problem solved at the code layer. |
| 6 | **System pattern + venue mark** for the fallback (venues without a bespoke image yet). | Cohesive with the visual DNA even before the specific art ships. Honest — reads as "placeholder" without feeling broken. No infra dependency. |

## 4. What Design will produce

- **Photo treatment recipe** — the visual system that turns a facade photo into a Concert Crawl-styled base (halftone / screenprint / cyanotype / riso — Design's call in §8).
- **Illustrated overlay language** — the vocabulary of hand-drawn elements that carry per-venue signature (typography treatment, decorative marks, spot illustration).
- **3–5 sample venues fully mocked** in the proposed style (photo base + overlay), rendered across all 3 themes to prove theme-independence.
- **Composition safe-zone template** — layout rules ensuring the venue's signature detail sits in a defined safe zone that survives all downstream crops (venue index square, detail hero wide, event card fallback, share cards).
- **Fallback pattern + typography treatment** for the venue-mark placeholder (Q6 lock).
- **Alt text voice pattern** — how venue images are described accessibly. Design's voice call.
- **Palette envelope** — the acceptable color range that reads against all 3 theme backgrounds (Q4 lock).
- **Artist collaboration brief** — what the artist produces per venue (the illustrated overlay) and what remains system-defined (treatment recipe, safe-zone rules, palette). Enables Hugh to onboard an artist with a clear scope.
- Component handoff with `var(--*)` token references where any theme-aware element renders.

## 5. Technical requirements

- **One source image per venue** (Q5 lock), rendered across venue index, detail hero, event card fallback, share cards. Downstream crops via CSS `object-position` set to the venue's focal-point coordinate.
- **New venue-table fields:**
  - `image_url` — path to the bespoke image asset. `NULL` = render the fallback (Q6 lock).
  - `focal_x`, `focal_y` — stored as numbers 0–100 (percentage coordinates); rendered to CSS as `object-position: ${focal_x}% ${focal_y}%`. Default `50, 50` if unspecified.
- **Fallback state:** system pattern renders whenever `image_url IS NULL`. No new columns needed; the pattern is stateless.
- **Asset storage:** Design flags preference; eng picks the exact target. Likely candidates given Vercel deploy: Vercel Blob (best for editorial CMS-shape), or in-repo `public/` (simplest for a fixed asset set). Not prescriptive at brief level.
- **Responsive delivery:** multiple render sizes needed (small list card, medium venue index card, large hero, share-card export sizes). Either pre-generated variants at deploy time or on-demand via Vercel Image Optimization — eng's call.
- **All colors via `var(--*)` tokens** where theme-aware (fallback pattern, overlay typography). The image itself is theme-independent so its palette is standalone.
- **Themes:** Electric / Jade / Light (project ships 3, not 9). Image is theme-independent (Q4) but must read against all 3 backgrounds.
- **WCAG-compliant alt text** per venue is required (WCAG Level A, SC 1.1.1); **AA contrast** (SC 1.4.3) for any text overlaid on the image or fallback.
- **Mobile-first** — 320px baseline; safe-zone composition must survive tight-crop rendering.
- **All customer-facing strings in `apps/web/src/components/consumer/definitions/copy.ts`** — including the alt-text pattern.
- **Free tier / universal** — no entitlements gate. Venue imagery renders for signed-in + signed-out users alike.

## 6. What's NOT in this brief (out of scope)

| Excluded | Owner / where handled |
|---|---|
| Fully illustrated per-venue imagery (photo-reference-only, no photo base) | [#1128](https://github.com/HartiganHM/concert-crawl/issues/1128) — v2 of this ticket. Blocked on v1 shipping + artist relationship. |
| Interior mood / atmosphere imagery | Not v1 — facade is the anchor per Q2. Could be a future direction. |
| Iconic-detail-only compositions (marquee close-ups as a systematic approach) | Not v1. If a venue's facade IS the iconic detail, that's fine, but not systematic. |
| Video / motion | Not v1 — still images only. |
| Interior room shots / multi-shot galleries | Not this ticket. |
| User-uploaded venue photos | Out of scope for private beta trust posture. |
| Multiple aspect-native variants per venue | Rejected in Q5 in favor of one source + focal-point. Possible v2 elevation. |
| Theme-tinted / theme-variant imagery | Rejected in Q4. |
| Auto-generated photo-base fallback via Street View ingest | Rejected in Q6 for infra dependency. Possible v2 nicety. |
| Retiring / redesigning the surrounding surfaces | Venue index / detail hero / event card / share card layouts stay as-is; this ticket only changes what fills the image slot. |

## 7. Decisions inherited

- **3 themes** — Electric / Jade / Light (project scope; PWA cluster brief confirmed this project ships 3, not 9)
- **Sour Patch voice** default for any customer-facing copy (alt text pattern, fallback typography content)
- **Mobile-first 320px baseline** (project-wide guiding principle)
- **All customer-facing strings in `definitions/copy.ts`** (project-wide convention)
- **`avatarColor` and other user-identity tokens** — not used here; venue imagery is its own visual system

## 8. Open for Design to call

- **Photo treatment recipe** — halftone / screenprint / cyanotype / riso / duotone / other. The base-layer visual language.
- **Overlay language** — what illustrated elements sit on top and how they vary per venue (typography, marks, decorative illustration, spot color). Design defines the vocabulary; the artist executes per venue.
- **Fallback pattern** — one universal system pattern, or per-genre variants? Level of texture / abstraction. Should read as "placeholder" without feeling broken.
- **Alt text voice** — literal ("Bluebird Theater exterior at night with lit marquee"), evocative ("Colfax's dressed-up neighbor"), or templated ("[Venue name] — [architectural type] on [street]"). Design's voice call within the Sour Patch envelope.
- **Composition safe-zone rules** — subject placement discipline, background treatment, margin rules that survive all downstream crops.
- **Palette envelope** — the acceptable color range across venue images that reads against all 3 theme backgrounds without any single image dominating or disappearing.
- **Artist collaboration model** — does Design own the overlay language and the artist executes per venue? Or does the artist define both? Or does the artist propose the overlay language with Design directing?
- **Facade-fallback for signature-less venues** — for warehouses / tucked-away rooms without a photographable facade, what's the treatment? A rendered logo? An interior signature? The system fallback (Q6)?
- **Asset export spec** — what file format(s), what resolution(s), what naming convention. Practical spec for the artist's handoff.

## 9. Cross-references

- **Source ticket:** [#1114](https://github.com/HartiganHM/concert-crawl/issues/1114)
- **Follow-up ticket (v2):** [#1128](https://github.com/HartiganHM/concert-crawl/issues/1128) — Fully illustrated per-venue imagery
- **Adjacent shipped design:** `design/design_handoff_venue_first_timer_guide/` (#764 Green) — lives in the same venue detail hero this imagery fills
- **Adjacent shipped design:** `design/design_handoff_shareable_cards/` (#72 Green) — renders venue imagery as social card background
- **Adjacent shipped design:** `design/design_handoff_concert_history/` (#55 Green) — event cards' venue-fallback path pulls from here
- **Pipeline workflow:** `docs/superpowers/design-pipeline.md`
- **Persona + locked decisions:** `memory:feedback_design_track_persona` — lives outside the repo in Claude's per-project memory store (not repo-browsable); referenced here by filename convention used across other docs (matches `design-pipeline-status.md`).

---

## Process

Track 2 design ticket per [design-pipeline.md](../design-pipeline.md). After Claude Design produces the R1 handoff to `design/design_handoff_venue_imagery/`, runs Readiness Review before opening the plan PR. Handoff prompt to Claude Design is delivered separately (chat, not committed).

**Artist onboarding note:** because Hugh's willing to bring in an outside artist, the Design deliverables include an artist-collaboration brief (§4) — the scope the artist works within. Design should structure the handoff so the artist can be onboarded with a clear per-venue overlay task, without needing to re-derive the system.

---

## 10. Amendment — 2026-07-20 Path A pivot

**Trigger:** Claude Design's initial handoff (`design/design_handoff_venue_imagery/`) landed 🔴 Red. The system-level thinking (riso treatment recipe, safe-zone composition, overlay grammar, theme-independence) was coherent, but the AI-drawn samples of both facade bases and overlay marks read as placeholder-grade rather than shippable-grade. Hugh's read: *"they just feel like cheap illustrations and the illustrations I'm looking for can't be done by AI."* Full verdict rationale: `design/design_handoff_venue_imagery/READINESS.md`.

**What changes:**

| Section | Before amendment | After amendment |
|---|---|---|
| **Q3 lock** (§3 row 3) | "Photo base + illustrated overlay for v1; fully illustrated is v2 (#1128)." | **"Human-commissioned illustration from photo reference, v1 direct."** The AI-assisted iteration is skipped entirely — no photo-base treatment recipe, no overlay-vocab-as-stand-in step. Illustrator produces the finished per-venue art directly. |
| **§4 What Design will produce** | Photo treatment recipe + illustrated overlay language + AI-drawn samples + safe-zone template + fallback pattern + alt text voice + palette envelope + artist collaboration brief. | **Design's role narrows.** No more AI-drawn samples. Design still owns: safe-zone template (Q5 lock), fallback pattern (Q6 lock), alt text voice pattern, palette envelope, and the **artist-brief document** that the commissioning workflow uses to onboard illustrators. Everything else Design would have generated is now the illustrator's output. |
| **#1128 (v2 follow-up)** | Was scoped as "fully illustrated from photo reference." | **Superseded by this amendment** — the v1 scope now covers what #1128 was going to. #1128 to be closed as-superseded when this amendment merges. |
| **Path forward** | Design produces handoff → Readiness Review → 🟢 → eng-planning. | **Hugh drives illustrator engagement offline** using `docs/runbooks/commissioning-illustrators.md`. Ticket sits in 🚦 Paused until first illustrator work lands. Then: illustrator's output becomes the handoff → eng-plan wires it in (venue-table fields, asset storage, fallback rendering per Q5 + Q6 unchanged). |

**What DOESN'T change:**

- **Q1 spirit** — hybrid template + per-venue signature *approach* still holds, but the "template" is now defined by the illustrator's style guide (produced in commission Phase 1), not a code-executed treatment recipe.
- **Q2 lock** — facade / exterior signature is still the recognizability anchor.
- **Q4 lock** — theme-independent, one image per venue works across all 3 themes.
- **Q5 lock** — one source per venue with safe-zone + focal-point coordinate. Illustrator delivers to this spec; eng data model (`image_url`, `focal_x`, `focal_y`) is unchanged.
- **Q6 lock** — system pattern + venue mark fallback. Design still produces this; it's stateless and doesn't need per-venue artist work.
- **Voice, tokens, copy externalization, mobile-first, WCAG, tier gate** — all unchanged.

**Preserved as design-thinking reference:**

The Red-verdict handoff at `design/design_handoff_venue_imagery/` stays in-repo. Its treatment recipe, overlay grammar, and composition rules remain defensible ideas the illustrator can consider (not required to execute against). `VENUE_IMAGERY_COPY` from `venue-overlays.jsx` is still the copy anchor for the eng plan when it eventually lands.

**Runbook:** `docs/runbooks/commissioning-illustrators.md` covers where to find illustrators, how to shortlist, three-phase commission structure, rights posture, and Denver-local starting points. Written to be reusable beyond just this ticket.
