# "Back to Today" Button Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a small, unobtrusive "Back to Today" control to the Browse·Cal header that snaps the calendar back to today's week and selects today in one tap, visible only when the shown week doesn't contain today.

**Architecture:** A new client component `BackToTodayControl` renders in the `WeekStripHeader` nav cluster, left of the `◂ ▸` week chevrons. `CalendarView` already computes the shown week's dates (`weekDates`), so visibility is `!weekDates.has(today)` and the reset action is the existing `onJumpPick(today)` (which `router.push`es to `weekOffset=0` + `selectedDate=today`). A shared `RotateCcwGlyph` gives the header button and the existing JumpPicker footer "Today" chip one consolidated "snap to today" mark, per the R2 handoff.

**Tech Stack:** Next.js 14 (App Router, client components), Tailwind + CSS-variable token theming, Vitest + Testing Library.

**Design source:** `design/design_handoff_calendar_jump_picker/` — R2 section of `README.md` + `back-to-today.jsx`. Readiness: `READINESS.md` (🟢 R1; R2 is an additive companion). Design ★ recommendations approved by Hugh 2026-07-18.

## Global Constraints

- **Token theming only** — every color is a `var(--*)` token; no hardcoded hex, no Tailwind `dark:` variants.
- **No `as` casts** — none needed here.
- **All customer-facing strings in `apps/web/src/components/consumer/definitions/copy.ts`** (`CONSUMER_COPY`).
- **Arrow-function components**, no `handle*` names, semantic HTML + ARIA in the same PR.
- **Mobile/desktop behavioral parity** — identical control + behavior on both; only the label collapses to icon-only at ≤360px via a CSS media query (SSR-safe, no JS viewport branch).
- **44×44 hit target** around the 34px visible pill; unmounts when hidden (no dead tab-stop); motion is reduced-motion + print safe.
- Run `pnpm --filter @concert-crawl/web typecheck && lint && test` before every push; rebase on `origin/main` before pushing.

---

## Locked design decisions (Hugh-approved ★)

- **Trigger:** week-level — visible iff the shown week does not contain today.
- **Action:** full reset — jump to today's week AND select today (mirrors the footer chip).
- **Placement:** inline in the header nav cluster, left of `◂ ▸`, same on mobile + desktop. (Floating-pill variant is comparison-only — **not built**.)
- **Label:** icon + "Today" where it fits; **icon-only at ≤360px**.
- **Wording:** "Today". (Not "Back to tonight".)
- **Glyph:** rotate-ccw in `--accent` — deliberately not a plain `◂`.
- **Consolidation:** header button and JumpPicker footer chip share the rotate-ccw mark. Footer chip stays (`showTodayChip` false-option is not the default).
- **Open questions:** (1) 12-month forward window kept, threaded as config off data horizon is out of scope here (window already lives in `pickerWindow`); (2) past days shown-disabled — unchanged; (3) heat-map — moot (Dots ★).

---

## File Structure

- Create: `apps/web/src/components/consumer/jump-picker/RotateCcwGlyph.tsx` — shared reset glyph.
- Create: `apps/web/src/components/consumer/week-strip/BackToTodayControl.tsx` — the control.
- Create: `apps/web/src/components/consumer/week-strip/BackToTodayControl.test.tsx` — unit tests.
- Modify: `apps/web/src/components/consumer/week-strip/index.ts` — export `BackToTodayControl`.
- Modify: `apps/web/src/components/consumer/week-strip/WeekStripHeader.tsx` — render the control when `showBackToToday`, left of the chevrons; new props `showBackToToday`, `onBackToToday`.
- Modify: `apps/web/src/components/consumer/week-strip/WeekStripHeader.test.tsx` — visibility + action tests.
- Modify: `apps/web/src/components/consumer/calendar-view/CalendarView.tsx` — compute `showBackToToday = !weekDates.has(today)`, pass it + `onBackToToday={() => onJumpPick(today)}`.
- Modify: `apps/web/src/components/consumer/jump-picker/JumpPicker.tsx` — footer chip uses `RotateCcwGlyph` instead of the plain dot.
- Modify: `apps/web/src/components/consumer/definitions/copy.ts` — add `backToTodayLabel`, `backToTodayAriaPrefix`.
- Modify: `apps/web/src/lib/definitions/releases.ts` — release note entry.

**Interfaces produced:**

- `RotateCcwGlyph({ size?, color?, strokeWidth? })` → SVG, `aria-hidden`.
- `BackToTodayControl({ todaySpoken, onClick })` → `<button>` with `aria-label` = `${backToTodayAriaPrefix}, ${todaySpoken}`.
- `WeekStripHeaderProps` gains `showBackToToday: boolean` + `onBackToToday: () => void`.

---

## Tasks

### Task 1: Shared RotateCcwGlyph

- [ ] Create `RotateCcwGlyph.tsx` (viewBox 0 0 24 24, two strokes, `stroke="var(--accent)"` default, `aria-hidden`).
- [ ] Swap the JumpPicker footer chip's 5px dot for `<RotateCcwGlyph size={11} />`.
- [ ] Run web tests — JumpPicker suite still green.

### Task 2: BackToTodayControl component + tests

- [ ] Write `BackToTodayControl.test.tsx`: renders a button with `aria-label` "Back to today, Tuesday, Apr 28"; icon-only label span carries the collapse class; click fires `onClick`.
- [ ] Run it → fails (no component).
- [ ] Create `BackToTodayControl.tsx`: transparent 44px `<button>`, inner 34px pill (`--surface-2` bg, `--border-strong`), `RotateCcwGlyph` + label span; label span hidden ≤360px via injected media-query style; fade+slide-in motion, reduced-motion safe; `aria-label` from prop.
- [ ] Export from `index.ts`.
- [ ] Run it → passes.

### Task 3: Wire into WeekStripHeader

- [ ] Add `showBackToToday` + `onBackToToday` props; render `<BackToTodayControl>` inside the `.flex.gap-1` cluster, before the prev-week chevron, only when `showBackToToday`. Spoken date via `accessibleDayLabelFor(today)`.
- [ ] Add WeekStripHeader tests: control absent when `showBackToToday` false; present + fires `onBackToToday` when true.
- [ ] Run web tests → green.

### Task 4: Wire into CalendarView

- [ ] Compute `showBackToToday = !weekDates.has(today)`; pass it + `onBackToToday={() => onJumpPick(today)}`.
- [ ] Run web tests → green.

### Task 5: Copy + release note

- [ ] Add `backToTodayLabel: 'Today'`, `backToTodayAriaPrefix: 'Back to today'` to copy.ts; use them in the component.
- [ ] Add a `releases.ts` entry (user-facing feature).
- [ ] Quality gate: `pnpm --filter @concert-crawl/web typecheck && lint && test`.
