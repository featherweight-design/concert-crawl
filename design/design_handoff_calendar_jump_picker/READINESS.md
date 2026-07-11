# Readiness Review — Calendar Jump Picker (#642 · Round 1)

**Verdict:** 🟢 Green — ready for plan PR
**Audited:** 2026-07-11
**Auditor:** Claude (autonomous Track 2 Readiness Review, single round)
**Audited handoff:** `design/design_handoff_calendar_jump_picker/` (Round 1)
**Source brief:** `docs/superpowers/specs/2026-06-28-calendar-jump-picker-design.md` (authored 2026-06-28, merged 2026-07-11 via PR [#862](https://github.com/HartiganHM/concert-crawl/pull/862))
**Related ticket(s):** [#642](https://github.com/HartiganHM/concert-crawl/issues/642) — Calendar surface jump picker (beta-feedback, phase: beta). Related-but-separate: [#636](https://github.com/HartiganHM/concert-crawl/issues/636) (empty-day arrow-nav skip; the picker aligns with whatever pattern lands there).
**Plan PR target:** `docs/superpowers/plans/<date>-calendar-jump-picker-implementation-plan.md` per `docs/superpowers/design-pipeline.md`.

## Summary

Design nailed the light-brainstorm scope in one pass. Every "Open for Design to call" item from the brief lands with a clear recommendation + rationale (star-marked in the README's table). The two-mode nav lock from the brief — chevrons keep SSR week-paging, picker writes both `weekOffset` + `selectedDate` when crossing weeks — is honored verbatim (per `README.md` §"Two-mode nav — preserved"). All 9 themes render token-only in §8 of the canvas (`CC_THEME_KEYS.map` iteration in `Calendar Jump Picker.html:268-272`). Mobile 320 baseline + desktop parity is real behavioral parity, not just visual copies — both surfaces share the same `WeekStripHeader` + `JumpPicker` components, same close paths, same keyboard model. A11y wiring is real in the JSX itself (`role="dialog"` + `aria-haspopup` + `aria-expanded` on cue + `role="grid"` on the day grid), not annotation-only.

R1 verdict is Green with four small observations — all Low/Nit, none blocking a plan PR — captured in the "Open observations" section below. No R2 needed.

## Per-dimension findings

### 🗺️ Scope clarity

- ✅ Handoff is calendar-surface-only per the brief lock. `WeekStripHeader` + `JumpPicker` live inside `CalSurfaceMobile` / `CalSurfaceDesktop`; FilterBar is untouched.
- ✅ All 8 brief deliverables present in the canvas map (README §"Canvas map"): (1) header at rest, (2) picker open mobile 320 + 390 + desktop, (3) closing affordance treatments, (4) empty-month treatment, (5) event-indicator variants, (6) open animation, (7) a11y annotation pass, (8) mobile+desktop parity.
- ✅ Out-of-scope items from the brief (FilterBar redesign, empty-day arrow skip #636, fetch-model change, new URL params, calendar surface beyond the picker) are left untouched. No scope creep.
- ✅ Two-mode nav preserved: chevron paging (`◂ ▸`) stays SSR week-paging; the picker is the second mode. The brief's picker-specific refinement (URL includes both `weekOffset` + `selectedDate` when crossing weeks, unlike the chev hrefs) is called out explicitly in the README's Two-mode nav table and in the `calendar-picker.jsx` header comment (`calendar-picker.jsx:6-11`).

### 🎭 State coverage

- ✅ Header at rest ships **all three cue treatments** (Chip ★ / Caret / Underline) side-by-side in §1 for the audit + the Tweaks panel drives them live in §0.
- ✅ Picker open ships **three viewports** — mobile 320 (`NARROW_W`), mobile 390 (`PHONE_W`), desktop popover (`DESK_W`).
- ✅ Event indicators ship **all three variants** (Dots ★ / Heat-map / None) in §4.
- ✅ Closing affordances ship **both configurations** (X + scrim + Esc; scrim + Esc only) in §5. Both variants surface in `JumpPicker` behind the `closing` prop (`calendar-picker.jsx:239, 258, 284-291`).
- ✅ Weekend emphasis ships **On + Off** side-by-side in §5.
- ✅ Empty-month state ships in §6 with December 2026 forced empty via `CJP_EMPTY_MONTHS` (`calendar-picker.jsx:43`); grid stays live + selectable + Sour Patch line drops in (`Crickets in Dec. Try later.`). Empty-day list context also renders in §6.
- ✅ Selected + today states differentiated: selected = `--signal` fill; today = 1.5px `--accent` ring + accent text color (`calendar-picker.jsx:343, 346`) — passes 3:1 non-text contrast without hue-only signalling.
- ✅ Past days rendered but disabled (`aria-disabled`, opacity 0.45); out-of-month spill days rendered but disabled (opacity 0.4). Matches the brief's intent that the picker be forward-only navigable.

### 🔌 Data contract

- ✅ URL contract matches the brief lock: picker's cross-week navigation URL CAN include both `weekOffset` AND `selectedDate` (a picker-specific refinement over chev behavior). Handoff surfaces this as the design intent in the README's Two-mode nav table + the file-header comment on `calendar-picker.jsx`.
- ✅ In-week day selection stays client-side (React state in the design's prototype maps to `window.history.replaceState` in prod per the brief). Cross-week day selection maps to full SSR navigation with both params.
- ✅ Existing `weekOffset` / `selectedDate` params are the only ones the picker writes to — no new URL params introduced, per the brief's "What's NOT in this brief" table.
- ✅ Fetch model is unchanged: dots/heat-map read from a per-day `cjpShowCount(y, m, d)` accessor which is Design's placeholder for whatever eng wires up. The brief flagged that Design's event-indicator choice determines fetch shape; Design chose dots ★ which is the minimum-fetch-change option (a per-month "has shows on day D" bitmap or count is a modest extension of the current per-week query, not a rewrite). Heat-map is presented as an alternative that would need a per-day count.
- ✅ Forward window bounded at `CJP_MIN` (current month) → `CJP_MAX` (current month + 12). Pager buttons `aria-disabled` at bounds. README R1 open question #1 asks Hugh to confirm the 12-month ceiling is right — reasonable default; see "Open observations" below.

### 🧱 Codebase fit

- ✅ Token-only colors verified across `calendar-picker.jsx`, `calendar-surfaces.jsx`, `picker-a11y.jsx`. Every accent reads from `var(--*)`. Spot-checked: `--signal` (selected day + view-toggle active), `--accent` (today ring + dots + brand accent), `--fg-on-accent` (selected day number + dot when selected), `--surface-2` (chip cue background + weekend tint via `color-mix`), `--border-strong` (chip border + chev button borders), `--overlay-hover` (cue hover), `--overlay-press` (cue active), `--scrim` (mobile pane backdrop), `--fg-muted` / `--fg-subtle` (secondary text). No hardcoded hex outside `ArtRect`'s gradient placeholder (which is design-only stub for event artwork).
- ✅ All 9 themes present in `theme-context.jsx` (`electric`, `jade`, `light`, `pulse`, `forge`, `bluenote`, `drip`, `cedar`, `gloss`) and iterated in the parity grid `Calendar Jump Picker.html:268-272`.
- ✅ Drip's optional `accent-2` token: not used by this picker (no need — the picker is `--signal` + `--accent` dominant). No fallback needed.
- ✅ No new dependencies — hand-built grid with native `Date` math (`calendar-picker.jsx:38, 61-69`). Neither shadcn Calendar nor `react-day-picker` pulled in. `date-fns` not added. Matches the brief's technical requirement.
- ✅ Past-day pattern matches existing `WeekStrip.tsx` convention — dim + inert. Picker uses opacity 0.45; prod WeekStrip uses opacity-30 (0.3). Same design language; the small numeric delta is a build-PR call, not a Design gap. See "Open observations."
- ✅ Sunday-first week convention (`DOW1 = ["S","M","T","W","T","F","S"]`) matches JS `Date.getDay()` semantics + WeekStrip's own week layout. No convention split.

### ♿ Cross-cutting

- ✅ **A11y wiring is real in the component code, not annotation-only.** `WeekStripHeader` button carries `aria-haspopup="dialog"` + `aria-expanded={open}` + a compound `aria-label` naming the month/year + intent (`calendar-picker.jsx:178`). `JumpPicker` root carries `role="dialog"` + `aria-modal="false"` + a compound `aria-label` naming the target month/year (`calendar-picker.jsx:264`). Day grid carries `role="grid"` + `gridcell` children with compound `aria-label` speaking weekday, month, date, show count, and today marker (`calendar-picker.jsx:337`). Pager + close buttons all carry explicit `aria-label`. Selected days carry `aria-selected`. Disabled days carry `aria-disabled`.
- ✅ Non-text contrast: today's 1.5px `--accent` ring + accent text color survives the 3:1 bar without relying on hue alone (README §"Accessibility" + `calendar-picker.jsx:343`).
- ✅ Keyboard model documented + coherent in `picker-a11y.jsx:78-85`: single-tab-stop grid (arrow keys move within), PageUp/Down page months (Shift+Page = ±year), Home/End jump week-row ends, Enter/Space selects, Esc closes + returns focus to cue.
- ✅ Screen-reader walkthrough scripts a realistic future-weekend jump in `picker-a11y.jsx:105-112` — 6 steps from cue focus → activation → month page → arrow to Sat 27 → select → return focus. Empty-month announcement (`Crickets in December, try later.`) is called out as associated-with-grid so it reads after cells, not lost.
- ✅ Focus return on close: README §"Accessibility" pin #7 + walkthrough step 5 both spec "focus returns to the cue" on all three close paths (scrim / X / Esc).
- ✅ Reduced motion: `@media (prefers-reduced-motion: reduce)` clause in the injected stylesheet zeroes `transition` + `transform` + `opacity` on `.cjp-pop` + `.cjp-car` (`calendar-picker.jsx:118`). Reduced-motion users see the end state, never the pre-animation `opacity:0`.
- ✅ Mobile + desktop **behavioral parity** — same components, same states, same close paths, same keyboard model. Only layout differs: mobile drops a full-width sheet under the header behind a scrim; desktop floats a popover anchored to the cue without a full-viewport scrim. Both surfaces share `WeekStripHeader` + `JumpPicker` (`calendar-surfaces.jsx:112-159` vs `179-255`).

### ⏰ Drift from reality

- ✅ Handoff honors the merged brief on every locked decision. The two locks (picker pattern = tappable header → mini-grid; scope = calendar surface only) are preserved verbatim.
- ✅ Every "Open for Design to call" item from the brief's §"Open for Design to call" is resolved in the README's design-calls table with a recommendation + rationale:
  - Header interactive cue → Chip ★
  - Event indicators in grid → Dots ★
  - Closing affordance → Both (scrim + X + Esc) ★
  - Empty-month treatment → grid stays live + Sour Patch line
  - Weekend emphasis → On ★
  - Open animation → Scale-from-cue ★ (~130ms + reduced-motion respect)
- ✅ Sour Patch voice preserved: empty-month "Crickets in Dec. Try later.", empty-day "No shows tonight, grandpa." + "Nothing on Wed. Rest up.", picker footer "Dots = shows on sale". Warm without whiny, matches the brand voice anchor.
- ✅ WeekStrip conventions preserved: dot pattern for "has shows" (`calendar-picker.jsx:224`) matches prod; past-day dimming pattern matches prod; Sunday-first week matches prod.
- 🟡 Handoff's brief-language footnote — the brief says "The month/year text that lives above the WeekStrip becomes an interactive control." In current prod code, no month/year label exists above the WeekStrip (`WeekStrip.tsx` has no header text; `CalendarView.tsx` renders WeekStrip directly). The handoff introduces this cue as **new UI**. Not a defect — the brief's phrasing was slightly aspirational; Design correctly builds the new affordance. Flagging so the plan PR knows this is a new element, not a mutation of an existing one.

### 📝 Decision log

- ✅ README's design-calls table addresses **all 6** "Open for Design to call" items with recommendation + rationale + rejected-option reasoning.
- ✅ README's "Open questions for the Readiness Review" surfaces **3 additional design calls** Design made that weren't in the brief's list but merit Hugh's confirmation:
  1. **Forward window** capped at ~12 months (`CJP_MAX`) — reasonable default; confirm ceiling or track a data horizon
  2. **Past days inside the current month** shown but disabled (not hidden) — matches WeekStrip's past-day convention
  3. **Heat-map interpretation** — implemented as cell-tint scaling with count, not dot-scaling as the brief's language could imply; Design flagged the change explicitly
- ✅ Rationale for the chip cue over caret/underline is clear (chip + caret glyph reads unmistakably as a control; underline reads as hyperlink). The star ★ mark convention is consistent across the design-calls table.

## Deliberate exclusions (unchanged from brief)

- **FilterBar `filterWhen` redesign / consolidation** — separate ticket if pattern surfaces later
- **Empty-day arrow-navigation skip behavior** — [#636](https://github.com/HartiganHM/concert-crawl/issues/636)
- **Fetch-model changes if event indicators need wider data** — Design chose Dots ★ which is the minimum-fetch-change option; eng follow-up is a modest extension, not a rewrite
- **New URL params or routing model** — picker reuses existing `weekOffset` / `selectedDate`
- **Calendar surface beyond the picker** — event card rendering, scroll behavior, etc. all out of scope

## Open observations (no addendum required)

- **Forward window ceiling** — the 12-month `CJP_MAX` is a reasonable default (concert calendars rarely publish further than that), but if Concert Crawl's data horizon is meaningfully different, the plan PR should thread the max as a config value driven off the actual event-date range in the DB rather than a hardcoded constant. Design's R1 open question #1 already asks Hugh to confirm this. Low.
- **Past-day opacity delta** — picker uses opacity 0.45; prod `WeekStrip.tsx` uses `opacity-30` (0.3) for past days. Same design language (dim + inert), small numeric difference. Plan PR should decide whether to align on 0.3 (matches WeekStrip) or 0.45 (matches picker's grid density). Nit.
- **Copy externalization** — customer-facing strings inside the prototype ("Crickets in Dec. Try later.", "No shows tonight, grandpa.", "Nothing on Wed. Rest up.", "Dots = shows on sale", "Jump to a date") ship hardcoded in JSX per the standard prototype convention. Plan PR must externalize to `apps/web/src/components/consumer/definitions/copy.ts` per `feedback_definitions_copy_rule.md`. Standard convention violation the plan PR carries — Design owns wording; eng owns location. Low.
- **Weekend tint token via `color-mix`** — picker's weekend tint uses `color-mix(in oklch, var(--surface-2) 60%, transparent)` (`calendar-picker.jsx:325`) and heat-map tint uses `color-mix(in oklch, var(--signal) X%, transparent)` (`calendar-picker.jsx:322`). Both are supported in modern browsers but the plan PR should confirm the app's browser support matrix covers `color-mix(in oklch)` or adopt a `token-alpha` fallback (already used elsewhere in prod). Low.

## Next step

R1 verdict is 🟢 Green. No R2 required. Eng plan gate is now **unblocked** for #642.

Path forward per `docs/superpowers/design-pipeline.md`:
1. Hugh routes to eng-planning to write the implementation plan at `docs/superpowers/plans/<date>-calendar-jump-picker-implementation-plan.md`.
2. Plan PR carries the observations from this audit (forward-window config, past-day opacity alignment, copy externalization, `color-mix` fallback check).
3. Post-plan, the build PR wires `WeekStripHeader` + `JumpPicker` into `apps/web/src/components/consumer/calendar-view/CalendarView.tsx`, extending the existing `WeekStrip` composition with the new header shell.

This verdict supersedes nothing — it's the Track 2 parity gate per `docs/superpowers/design-pipeline.md`.
