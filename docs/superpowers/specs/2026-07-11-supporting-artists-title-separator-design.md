# Supporting Artists Title Separator (Design Brief)

**Status:** Locked decisions, ready for Design handoff
**Ticket:** [#643](https://github.com/HartiganHM/concert-crawl/issues/643) (`type: design, type: feature, source: beta-feedback, phase: beta, priority: normal`)
**Authored:** 2026-07-11
**Authors:** Hugh Hartigan, Claude (direct-write — beta-feedback ticket with pre-drafted design prompt)

---

## Purpose

A beta-feedback user (friend, 2026-06-17) flagged that under the headliner name on event surfaces, supporting artists — and often the tour name — appear as a **single run-on string with no visible separators**. Reading the second line requires guessing where one opener ends and the next begins, or where the tour name starts. The friend suggested slashes or another visible separator.

This brief locks the decisions for restoring visible structure to the "everything below the headliner" line across every surface that renders it.

## App context

- The `Event` type today (`packages/types/src/index.ts:268`) has `artist: string` (headliner) and `title: string` (everything else — openers, tour name, sometimes both concatenated). Both are plain strings from the venue source; whatever the crawl produced lands verbatim.
- The rendering pattern is **uniform** across surfaces. Wherever it appears:

  ```tsx
  {event.artist}
  {event.title !== event.artist && <p>{event.title}</p>}
  ```

  Files: `apps/web/src/components/consumer/event-card/EventCard.tsx`, `apps/web/src/components/consumer/hero-event-card/HeroEventCard.tsx`, `apps/web/src/app/(protected)/(main)/events/[id]/page.tsx`.

- **The frontend cannot insert sensible separators today** — `title` is one flat string mixing openers and tour name. Any string-parsing hack in the UI would be fragile against real-world venue formatting (e.g., an opener whose name contains a slash, or a tour name that reads like a subtitle).
- Structured supporting-artist data is required for the fix to be correct. The engineering work extracts openers into their own field at crawl-extraction time (LLM prompt + Event schema + shared type). The build PR will spec the data-layer shape; this brief locks the visual + interaction call.
- **Related ticket:** [#84 Support Act Spotlight](https://github.com/HartiganHM/concert-crawl/issues/84) — future feature that makes openers clickable and linkable to artist pages. This brief should not preclude that follow-on but does not need to design it either.

## Locked decisions

### 1. Fix path — structured supporting-artist data + rendered separators

The fix is **data-layer first**. The build PR extracts supporting artists into a structured field (`supportingArtists: string[]` on `Event`) at crawl-extraction time and separates the tour name from the openers where the LLM can distinguish them. The frontend then renders that structured data with the separator + hierarchy treatment Design specifies.

**Rationale:** A UI-only fix (LLM normalizes the title string with a chosen separator) is smaller but keeps the data flat, blocks #84 forever, and hides the tour name inside the openers line. Structured data is the correct shape; the size delta is worth paying once.

### 2. Scope — every surface that renders `event.title` today

Consistent treatment across:

- `EventCard` (browse, watching, venue detail, related shows — all share this component)
- `HeroEventCard` (featured / hero placements)
- Event detail page (`/events/[id]`)

Same visual pattern, sized appropriately per surface.

## What Design will produce

1. **Hi-fi separator treatment** for the openers line — what character/pattern reads as "these are distinct performers"? Slash, middot, comma-and-oxford, line break, w/ shorthand, or something else Design proposes.
2. **Visual hierarchy call** — should the tour name (when present) render distinctly from the openers, or in the same line with its own separator? Options include a second line, a differently-styled inline segment, an em-dash lead-in, or a subtitle-style treatment.
3. **Overflow behavior at 320px** for 4+ openers on `EventCard` — truncate with count ("Opener A, Opener B, +3"), wrap to a second line, marquee/scroll, fade-out edge, or a completely different pattern Design owns.
4. **Empty / single-opener treatment** — no supporting artists (Watching page for a headliner-only show), one supporting artist (does the pattern still read right without a separator?), and a tour name with zero openers.
5. **Cancelled / postponed interaction** — the existing pattern shows an inline badge next to the artist name; the openers line should stay coherent alongside that.
6. **Forward-compat hook for #84** — the treatment shouldn't preclude openers becoming clickable later. No need to design the link affordance in this brief, but a call on whether each opener is visually a distinct token vs a segment of running prose helps that future work.
7. **Mobile + desktop parity** — one pattern across viewports, visual differences fine, behavioral asymmetry not.
8. **A11y annotation pass** — screen-reader phrasing for the openers line (comma-separated list vs single sentence), truncation announcement, ordering.

## Technical requirements

- **Responsive:** 320px mobile baseline → desktop. The `EventCard` in browse at 320px is the tightest surface and drives the overflow treatment.
- **A11y:** WCAG AA. Screen readers should announce the openers as a list, not a run-on string. Truncation with a count needs an accessible label ("plus 3 more openers").
- **Token-only colors** across all 9 themes. If Design introduces a new type/muted color for the openers line, it needs a token (no hardcoded hex).
- **Copy pattern:** artist names + tour names are **data, not copy** (per `feedback_definitions_copy_rule.md`). Any surrounding scaffolding strings ("with", "presenting", "+N more") DO go in `apps/web/src/components/consumer/**/definitions/copy.ts`.
- **Data assumption:** the build PR ships `supportingArtists: string[]` on `Event` (order-preserved, headliner excluded) plus a nullable `tourName: string | null` field extracted from the current `title` mash-up. Design can assume both are available; if either field's shape needs to differ for the visual to work, that's a decision to surface in R1.
- **No new dependencies expected** — separator rendering is CSS/JSX; no picker/list library needed.
- **Backfill posture:** existing events keep their current `title` string until the next crawl re-extracts. The UI should render sensibly during the transition (fall back to raw `title` when `supportingArtists` is empty but `title !== artist`). The build PR calls the exact fallback shape.

## What's NOT in this brief

| Concern | Owner |
|---|---|
| Support Act Spotlight — clickable openers linking to artist pages | [#84](https://github.com/HartiganHM/concert-crawl/issues/84) (separate ticket; this brief just avoids precluding it) |
| Artist page / opener detail view design | Out of scope — no artist detail page exists yet |
| LLM extraction prompt changes for opener/tour separation | Eng — build PR owns the crawler-core + LLM prompt change |
| Backfill strategy for historical events' `title` strings | Eng — build PR owns re-crawl / migration strategy |
| Headliner name treatment (the `event.artist` line above) | Out of scope — the beta feedback is about the line below the headliner |
| Featured tag / genre chips / other card metadata | Out of scope — pattern is additive to the openers line only |

## Open for Design to call

These are decisions Design owns inside the locked frame:

- **Separator character/pattern** — slash `/`, middot `·`, comma with oxford `,`, line break, `w/`, or something else. Consider readability at 12px (the current openers line size) and screen-reader phrasing.
- **Tour name treatment** — inline segment with its own visual weight? Separate second line? Prefixed with a symbol / italic / different color token?
- **Overflow at 4+ openers on 320px `EventCard`** — count-collapse ("+N more"), wrap-to-two-lines, ellipsize with hover reveal, marquee — Design call based on what reads as "there's more here" without breaking the card's grid rhythm.
- **Single-opener special case** — does the same pattern hold, or does one-opener get a distinct micro-treatment?
- **Empty state** — when a show has no openers and no tour name, does anything render on that line, or does the line collapse?
- **Visual weight of the openers line vs the headliner** — the current 12px `text-fg-muted` is a baseline; if Design wants a different hierarchy to make the structure legible, that's a Design call.
- **Cancelled/postponed rendering** — badge stays next to headliner as today, or does the openers line need to adapt (e.g., strikethrough, muted further)?

## Cross-references

- **Source ticket:** [#643](https://github.com/HartiganHM/concert-crawl/issues/643)
- **Related ticket:** [#84 Support Act Spotlight](https://github.com/HartiganHM/concert-crawl/issues/84)
- **Existing surfaces:**
  - `apps/web/src/components/consumer/event-card/EventCard.tsx` (browse, watching, venue detail, related shows)
  - `apps/web/src/components/consumer/hero-event-card/HeroEventCard.tsx`
  - `apps/web/src/app/(protected)/(main)/events/[id]/page.tsx`
- **Event type:** `packages/types/src/index.ts` (Event interface, ~line 268)
- **Design pipeline workflow:** `docs/superpowers/design-pipeline.md`
- **Reference brief (same shape):** `docs/superpowers/specs/2026-06-28-calendar-jump-picker-design.md`
