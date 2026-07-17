# Gap Report — Calendar Jump Picker

Verified the implementation against `docs/superpowers/design-tables/calendar-jump-picker.md`
(design-review Agent 2 pass), section by section. Ground truth: the design handoff
at `design/design_handoff_calendar_jump_picker/` at build config `cueStyle="chip"`,
`indicators="dots"`, `closing="both"`, `weekendEmphasis=true`, `anim="scale"`.

## IMPLEMENTED (11 of 12 sections clean on first pass)

- §1 Cue chip — chrome, rest/open background + border tokens, hover, caret glyph
  (11×7, `M1 1l4.5 4.5L10 1`, rotate(180deg), `.16s cubic-bezier(.2,.7,.3,1)`),
  ARIA (haspopup/expanded/label) all match [WeekStripHeader.tsx:81-148]
- §1 Flanking chevrons — 34×34, radius 9, `var(--border-strong)`, prev disabled span
  at week 0, `Previous/Next week` labels, opacity .32 disabled [WeekStripHeader.tsx:150-179]
- §2 Picker container — `var(--bg-elevated)`, border, radius 16, exact boxShadow,
  padding 14 [JumpPicker.tsx:347-365]
- §3 Grid cells — weekday header (`DOW1`, JetBrains Mono 9/700/0.06em, weekend vs
  weekday color), 42-cell grid, day button metrics (38 tall, radius 9) [JumpPicker.tsx:429-558]
- §4 Day states — default / selected (`var(--signal)` + on-accent + 800) / today ring
  (`inset 0 0 0 1.5px var(--accent)` + accent text, suppressed when also selected) /
  past (opacity .45) / out-of-month (opacity .4, no weekend tint) / weekend tint
  (`color-mix(in oklch, var(--surface-2) 60%, transparent)`); numColor + opacity
  precedence exact [JumpPicker.tsx:469-497]
- §5 Dots — 4×4 radius 4, `var(--accent)` → `var(--fg-on-accent)` on selected day,
  only `count>0 && !disabled`, spacer otherwise [JumpPicker.tsx:543-554]
- §6 Empty month — footer switches on real availability (`hasInMonthShows`):
  "Dots = shows on sale" vs "Crickets in {MON3}. Try later." [JumpPicker.tsx:343-345,601-612]
- §7 Animation — `.13s cubic-bezier(.2,.7,.3,1)` transform + `.13s ease` opacity,
  scale(.95)→none, `transform-origin: 34px -6px`, rAF mount, reduced-motion end-state
  [JumpPicker.tsx:73-84,178-186]
- §8 Keyboard — arrows (day/week, disabled-skip), Home/End (week row), PageUp/Down
  (month), Shift+Page (±year), Esc close+refocus, roving single tab-stop, focus lands
  on selected day on open [JumpPicker.tsx:228-328]
- §9 ARIA — dialog role + `aria-modal="false"` + labelled by month/year, gridcell
  `aria-selected`/`aria-disabled`, exact day aria-label format with show-count clause
  [JumpPicker.tsx:347-514]
- §11 Constants / §12 copy — all copy strings sourced from `definitions/copy.ts`,
  Sunday-first display, window from `pickerWindow` [copy.ts, date-math.ts]

## GAPS (1 — found and fixed this pass)

- **§2 / §8 / §10 — picker overlay behavior.** As originally built the picker rendered
  in normal document flow with no absolute positioning and no scrim/click-catcher, so
  (a) opening it pushed the week strip and content down instead of floating over them,
  and (b) it could only be dismissed via the X button or Esc — the design specifies
  `closing="both"`, making click-outside a required close path (§8 lists "scrim · X · Esc"
  as the three close paths, all returning focus to the cue).
  **Fix:** wrapped the picker in an absolutely-positioned popover container
  (`top:48; left:12; right:12; z-index:40`) and added a `.cjp-catch` click-catcher —
  invisible on desktop (popover model), a `var(--scrim)` + `blur(3px)` sheet scrim under
  640px (mobile model) per §10 — that closes the picker and returns focus to the cue on
  click. Picker width made responsive (`min(324px, calc(100vw - 24px))`) so the desktop
  324 never overflows a 320px viewport. Regression test added
  (WeekStripHeader.test.tsx "closes the picker when the click-catcher scrim is clicked").
  [WeekStripHeader.tsx:29-30,86-89,183-204 · JumpPicker.tsx:330-331]

## GAPS (5 — found by Copilot review on PR #987, all fixed)

- **§5 WeekStrip dot parity** — day-strip dot used `var(--signal)`; design table L220 specifies
  `var(--accent)` (→ `var(--fg-on-accent)` when selected). Missed in the first pass because the
  property table's dot row was checked against the picker, not the strip. Fixed [WeekStrip.tsx:87]
- **§8 focus on pick** — picking a day closed the picker via bare `setOpen(false)`, dropping focus
  to `<body>`; §8 requires focus to return to the cue on every dismissal. Now routes through
  `close()`. Regression test added [WeekStripHeader.tsx:201, WeekStripHeader.test.tsx]
- **§1 disabled chevron hover** — the disabled prev-week `<span>` still matched the hover rule
  (`:not(:disabled)` never excludes a span). Added `:not([aria-disabled="true"])` [WeekStripHeader.tsx:24]
- **§8 pager roving tab-stop** — month pager buttons changed `view` but left `focusIso` in the old
  month, so the single tab-stop landed on an out-of-month spill cell. `pageMonth` now advances
  `focusIso` to the new month's first day, gating only the DOM-focus move [JumpPicker.tsx:212]
- **§11 availability date validation** — `to`/`from` accepted regex-matching but impossible dates
  (e.g. `2026-02-31`), which `Date.parse` silently rolled over rather than rejecting. Added a
  round-trip `isRealDate` refine to the Zod schema. Regression test added [events.ts:71]

## GAPS (2 — found by Copilot review round 2 on PR #987, both fixed)

- **§1 stale month cue label** — `CalendarView` forwarded a server-derived `monthLabel` prop
  straight to the cue, so an in-week pick that crossed a month boundary (e.g. Fri May 1 inside an
  Apr 27–May 3 week) left the cue reading "April". Now derived client-side from `selectedDate` via
  `monthLabelFor` (extracted to `date-math.ts`, DRY with the page's former helper). Regression test
  added [CalendarView.tsx:50, date-math.ts:40, CalendarView.test.tsx]
- **§2 / §10 unreachable mobile sheet** — `WeekStripHeader` always anchored the picker at `top:48`
  and never passed `variant="mobile"`, so the documented mobile sheet (top:150, full-width, centered)
  was unreachable and `JumpPicker`'s `variant` prop was dead. Replaced the JS `variant` branch with
  SSR-safe CSS media queries: `.cjp-pos` (desktop popover top:46/left:12 → mobile sheet
  top:150/left:12/right:12/flex-center) and `.cjp-w` (desktop `min(324px,…)` → mobile `100%`) both
  switch at the 640px breakpoint, matching design §2 exactly [WeekStripHeader.tsx:32-34,186 ·
  JumpPicker.tsx:76-78,331-353]

## GAPS (3 — found by Copilot review round 3 on PR #987, all fixed)

- **§5 dots-mode spacer** — cells with no dot rendered a `<span style={{height:4}} />` spacer, but the
  design table §5 (L353) specifies that in dots mode a day with count 0 / disabled renders **no dot and
  no spacer**. Removed the else-branch so the shipped grid matches the handoff's vertical rhythm
  [JumpPicker.tsx:543]
- **§1 cue toggle** — the month cue only ever opened the picker (`setOpen(true)`), so a keyboard user
  pressing Enter on the focused cue while open couldn't dismiss it (mouse users hit the click-catcher).
  Now toggles: `open ? close() : setOpen(true)`. Regression test added
  [WeekStripHeader.tsx:121, WeekStripHeader.test.tsx]
- **test hygiene — `as` casts** — the availability integration tests cast `await res.json()` to inline
  shapes, violating the repo no-`as` rule; `Response.json()` is already `any` here, so the casts were
  unnecessary. Removed all three [events.integration.test.ts]

## DEFERRED (0)

None.
