# Calendar Jump Picker (Design Brief)

**Status:** Locked decisions, ready for Design handoff
**Ticket:** [#642](https://github.com/HartiganHM/concert-crawl/issues/642) (`type: design, source: beta-feedback, phase: beta, priority: normal`)
**Authored:** 2026-06-28
**Authors:** Hugh Hartigan, Claude (light brainstorm — 2 scope-locking questions)

---

## Purpose

A beta-feedback user (friend, 2026-06-17) flagged that the calendar surface's only navigation affordance is the prev/next-week chevrons. Reaching a specific future weekend — "that festival weekend in August" — costs 8+ clicks. This brief locks the decisions for adding a jump picker to the calendar surface that lets users reach any target date in one action.

This is a **calendar-surface-only** addition. FilterBar's own date control (`filterWhen`) stays as-is; the calendar view's own `selectedDate` param is what the picker writes to. If a shared date-picker pattern across the app becomes worth pursuing later, that's a separate ticket.

## App context

- The calendar surface (`apps/web/src/components/consumer/calendar-view/CalendarView.tsx`) renders a 7-day `WeekStrip` (`apps/web/src/components/consumer/week-strip/WeekStrip.tsx`) with prev/next chev arrows.
- Two navigation modes in play: **week paging** is server-routed via `weekOffset` Link hrefs (each chev tap is a full SSR navigation; chev hrefs intentionally omit `selectedDate`); **day selection within a loaded week** is client-side (`window.history.replaceState` updates `selectedDate` without a navigation). The brief preserves both modes — Design can proceed without prescribing fetch shape.
- Fetch is bounded per-week (100 events max). A month grid that displays event indicators would change the fetch model; the brief flags this as a deliberate downstream consideration (see "Open for Design to call") rather than blocking the picker on a fetch redesign.
- Empty-day arrow-navigation skip behavior is tracked separately in [#636](https://github.com/HartiganHM/concert-crawl/issues/636) and not in scope here. The picker should align with whatever pattern lands in #636 when both surfaces meet.

## Locked decisions

### 1. Picker pattern — tappable month/year header → expandable mini-month grid

The month/year text that lives above the WeekStrip becomes an interactive control. Tap/click expands a small calendar grid below; tap a day → the WeekStrip jumps to the week containing that day + the grid closes.

**Rationale:** Concert calendars have a natural "which weekend in August" mental model that a grid serves directly. A dropdown picks a month but still requires per-week nudging; a typed input is friction for browse-style intent. The grid unifies mobile + desktop with one pattern and reads as "this is a calendar."

### 2. Scope — calendar surface only

The picker lives in the calendar surface (`CalendarView` / `WeekStrip` header). FilterBar stays unchanged. The friend's feedback was about calendar navigation specifically; broadening to FilterBar would double the surface area for a "quick win" ticket.

## What Design will produce

1. Hi-fi mockups of the calendar header at rest (month/year text as a tappable affordance — what does "this is interactive" look like?).
2. Hi-fi mockups of the picker open state — mini-month grid sized for mobile (320px baseline) and desktop.
3. Closing affordance (tap-outside, X button, both — Design call).
4. Empty-day / empty-month treatment inside the grid (visual cue for days with no shows? mute? hide? Design call).
5. Event-indicator treatment in the grid (event dots per day? heat-map shading? nothing? — Design call; the fetch shape can adapt to whatever Design proposes, see "Open for Design to call").
6. Animation / transition shape for grid open + close.
7. A11y annotation pass for the picker — keyboard navigation between days, screen-reader announcement on month change, focus return after close.
8. Mobile + desktop parity.

## Technical requirements

- **Responsive:** 320px mobile baseline → desktop. Single picker pattern (not a per-viewport surface).
- **A11y:** WCAG AA. Picker should be operable via keyboard alone — arrow keys to navigate days, Enter/Space to select, Escape to close. Screen-reader walkthrough: month change announces; selected day announces with day name + date.
- **Token-only colors** across all 9 themes.
- **Preserves other filters:** when a date is picked, search query / venue filter / any other active filter is preserved. The picker only changes the date axis.
- **Navigation:** picker tap outcomes should match the existing two-mode model — a day in the currently loaded week is a client-side `selectedDate` update via `replaceState` (matches today's day-tap behavior in the WeekStrip); a day in a different week is a full navigation to that `weekOffset` (matches today's chev behavior). Unlike the chev hrefs, the picker knows the exact target day, so its navigation URL can include both `weekOffset` and `selectedDate` when crossing weeks — that's a picker-specific refinement, not a chev-behavior change.
- **No new dependencies required:** the grid should be hand-built. Neither shadcn `Calendar` nor `react-day-picker` are currently in the repo, so pulling either in is a real dependency add (not a "already have it" shortcut). Date math today uses native `Date`; if the picker math becomes load-bearing, adding `date-fns` in the build PR is acceptable but should be justified in that PR rather than assumed here.

## What's NOT in this brief

| Concern | Owner |
|---|---|
| FilterBar date control redesign / consolidation | Separate ticket if it surfaces as a pattern |
| Empty-day arrow-navigation skip behavior | [#636](https://github.com/HartiganHM/concert-crawl/issues/636) (handled there) |
| Fetch-model changes if Design wants event indicators in the grid | Eng follow-up if Design specs event indicators — see "Open for Design to call" |
| New URL params or routing model | Out of scope — picker uses existing `weekOffset` / `selectedDate` params |
| Calendar surface beyond the picker (event card rendering, scroll behavior, etc.) | Out of scope — picker is additive only |

## Open for Design to call

These are decisions Design owns inside the locked frame:

- **Event indicators in the grid** (dots, heat-map, nothing). Each option implies a different fetch model — current is per-week. If Design proposes indicators that need wider data, the build PR includes the fetch extension; if not, the picker is pure-UI on existing data.
- **Closing affordance** — tap-outside / X button / both / Escape only.
- **Empty-month treatment** — does the grid show "No shows this month" inline if Concert Crawl has zero events for the picked month? Or just let users pick a day and land on an empty WeekStrip?
- **Grid sizing** — exact dimensions, padding, row height, day-of-week header pattern.
- **Animation** — slide-down, fade, none — Design call based on what reads as "this is the calendar showing me more, not a separate surface."
- **Header treatment** — what does the tappable month/year text look like? Chevron glyph? Dotted underline? Background-fill on hover? Some visual cue that it's not just static text.

## Cross-references

- **Source ticket:** [#642](https://github.com/HartiganHM/concert-crawl/issues/642)
- **Related ticket:** [#636](https://github.com/HartiganHM/concert-crawl/issues/636) (empty-day arrow skip)
- **Existing surface:** `apps/web/src/components/consumer/calendar-view/CalendarView.tsx` + `apps/web/src/components/consumer/week-strip/WeekStrip.tsx`
- **Design pipeline workflow:** `docs/superpowers/design-pipeline.md`
