# Design Property Table — Calendar Jump Picker

Source of truth: `design/design_handoff_calendar_jump_picker/{README.md, calendar-picker.jsx, calendar-surfaces.jsx, picker-a11y.jsx}`. Design-call config for this build: `cueStyle="chip"`, `indicators="dots"`, `closing="both"`, `weekendEmphasis=true`, `anim="scale"`. Every property below is stated at those settings unless a comparison branch is explicitly noted.

---

## 1. Cue (WeekStripHeader chip)

**Element:** `<button type="button" className="cjp-cue">` (calendar-picker.jsx L176–187).

**Base chrome (`cueBase`, all cue styles):**

| Property      | Value                                               |
| ------------- | --------------------------------------------------- |
| display       | `inline-flex`                                       |
| alignItems    | `center`                                            |
| gap           | `7` (px, between label span and caret)              |
| fontFamily    | `Inter, system-ui`                                  |
| fontWeight    | `800`                                               |
| letterSpacing | `-0.02em`                                           |
| color         | `var(--fg)`                                         |
| fontSize      | `17`                                                |
| lineHeight    | `1`                                                 |
| border        | `1px solid transparent` (overridden by chip chrome) |
| borderRadius  | `999`                                               |
| padding       | `7px 12px`                                          |
| cursor        | `pointer`                                           |

**Chip chrome (`cueStyle === "chip"`), rest state (`open === false`):**

| Property   | Value                            |
| ---------- | -------------------------------- |
| background | `var(--surface-2)`               |
| border     | `1px solid var(--border-strong)` |

**Chip chrome, open state (`open === true`):**

| Property   | Value                           |
| ---------- | ------------------------------- |
| background | `var(--overlay-press)`          |
| border     | `1px solid var(--border-focus)` |

**Hover (CSS `.cjp-cue:hover`, L112):** `background: var(--overlay-hover)`; transition `background .12s, border-color .12s`.

**Label span:** `<span>{monthLabel}</span>` — text = `monthLabel` prop (e.g. `"April 2026"`). Format from `cjpMonthLabelFor`: `${MONTHS[m-1]} ${y}` (full month name + 4-digit year).

**Caret glyph (`.cjp-car` span, L182–186):**

| Property                       | Value                                                        |
| ------------------------------ | ------------------------------------------------------------ |
| container display              | `inline-flex`                                                |
| rest transform                 | `none`                                                       |
| open transform                 | `rotate(180deg)`                                             |
| caret transition               | `transform .16s cubic-bezier(.2,.7,.3,1)` (`.cjp-car`, L117) |
| svg width                      | `11`                                                         |
| svg height                     | `7`                                                          |
| viewBox                        | `0 0 11 7`                                                   |
| path d                         | `M1 1l4.5 4.5L10 1` (downward chevron / "v")                 |
| stroke                         | `var(--fg-muted)`                                            |
| strokeWidth                    | `1.8`                                                        |
| fill                           | `none`                                                       |
| strokeLinecap / strokeLinejoin | `round` / `round`                                            |
| aria-hidden                    | `"true"`                                                     |

**Cue ARIA:**

| Attribute     | Value                                                                       |
| ------------- | --------------------------------------------------------------------------- |
| aria-haspopup | `"dialog"`                                                                  |
| aria-expanded | `{open}` (boolean; `false` at rest, `true` when picker open)                |
| aria-label    | `` `${monthLabel}. Jump to a date` `` (e.g. `"April 2026. Jump to a date"`) |

**Layout position relative to chevrons + strip (L173–200):**

- Outer wrapper: `padding: "2px 12px 10px"`.
- Cue row: `display:flex; alignItems:center; justifyContent:space-between; gap:8; marginBottom:8`. Cue is the **left** child; the chevron pair is the **right** child.
- Chevron pair container: `display:flex; gap:4`. Prev then Next.
- The 7-day WeekStrip renders **below** the cue+chevron row (`display:flex; gap:2`).

**Flanking chevrons (± week pager, L188–199):**

| Property           | Value                                                                                                                                                                       |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| className          | `cjp-chev`                                                                                                                                                                  |
| width × height     | `34 × 34`                                                                                                                                                                   |
| borderRadius       | `9`                                                                                                                                                                         |
| border             | `1px solid var(--border-strong)`                                                                                                                                            |
| base reset         | `all: unset` + `boxSizing: border-box` + flex-center                                                                                                                        |
| prev aria-label    | `"Previous week"`                                                                                                                                                           |
| next aria-label    | `"Next week"`                                                                                                                                                               |
| prev disabled when | `atMin`                                                                                                                                                                     |
| next disabled when | `atMax`                                                                                                                                                                     |
| glyph              | `<Chevron>` — svg 14×14, viewBox `0 0 16 16`, color `var(--fg-muted)`, strokeWidth `2`; left path `M10 3L5 8l5 5`, right path `M6 3l5 5-5 5`, caps/joins round, aria-hidden |
| hover              | `.cjp-chev:hover:not(:disabled){ background: var(--overlay-hover) }`                                                                                                        |
| disabled           | `.cjp-chev:disabled{ opacity:.32; cursor:default }`                                                                                                                         |
| transition         | `background .12s, opacity .12s`                                                                                                                                             |

---

## 2. Picker container

**Element:** `<div role="dialog" className="cjp-pop scale [cjp-in]">` (JumpPicker, L262–270).

| Property     | Value                                                                                                                                                                          |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| width        | prop `width`. **Mobile:** `"100%"` (passed by CalSurfaceMobile L152). **Desktop:** `324` px (CalSurfaceDesktop L242). **Default prop:** `300`. a11y annotated view uses `300`. |
| background   | `var(--bg-elevated)`                                                                                                                                                           |
| border       | `1px solid var(--border-strong)`                                                                                                                                               |
| borderRadius | `16`                                                                                                                                                                           |
| boxShadow    | `0 20px 50px rgba(0,0,0,0.42), 0 2px 8px rgba(0,0,0,0.3)`                                                                                                                      |
| padding      | `14`                                                                                                                                                                           |
| boxSizing    | `border-box`                                                                                                                                                                   |
| color        | `var(--fg)`                                                                                                                                                                    |
| fontFamily   | `Inter, system-ui`                                                                                                                                                             |

**Internal cell grid metric:** `cell = 38`, `gap = 2` (L260).

**Mobile positioning (sheet, CalSurfaceMobile L144–156):**

- Scrim `<div>`: `position:absolute; inset:0; background:var(--scrim); backdropFilter:blur(3px); WebkitBackdropFilter:blur(3px); zIndex:4; cursor: pointer` (when `canClosePane`, else `default`). Scrim onClick closes only when `canClosePane` (`closing==="both"||"scrim"`).
- Picker positioner `<div>`: `position:absolute; top:150; left:12; right:12; zIndex:5; display:flex; justifyContent:center`.
- Picker width = `"100%"` (fills the 12px-inset band → full-width sheet under the header).

**Desktop positioning (popover, CalSurfaceDesktop L235–246):**

- Anchored inside a `position:relative` wrapper around the WeekStripHeader.
- Scrim catcher `<div>` (when `canClosePane`): `position:fixed; inset:0; zIndex:8` (invisible click-catcher, no bg/blur).
- Picker positioner `<div>`: `position:absolute; top:46; left:12; zIndex:9`.
- Picker width = `324`.

**Scrim token summary:** mobile scrim = `var(--scrim)` + `blur(3px)` backdrop-filter (both `backdropFilter` and `WebkitBackdropFilter`). Desktop has NO visible scrim/blur — only a transparent fixed click-catcher.

---

## 3. Grid cells

**Weekday header row (L294–303):**

| Property                                                | Value                                                                    |
| ------------------------------------------------------- | ------------------------------------------------------------------------ |
| container                                               | `display:grid; gridTemplateColumns:repeat(7,1fr); gap:2; marginBottom:4` |
| labels                                                  | `DOW1 = ["S","M","T","W","T","F","S"]` (Sunday-first single letters)     |
| each cell aria-hidden                                   | `"true"`                                                                 |
| textAlign                                               | `center`                                                                 |
| fontFamily                                              | `'JetBrains Mono', monospace`                                            |
| fontSize                                                | `9`                                                                      |
| fontWeight                                              | `700`                                                                    |
| letterSpacing                                           | `0.06em`                                                                 |
| color (weekend cols i===0 or i===6, weekendEmphasis on) | `var(--fg-muted)`                                                        |
| color (weekday cols)                                    | `var(--fg-subtle)`                                                       |
| paddingBottom                                           | `2`                                                                      |

**Day grid container (L305–306):** `role="grid"; display:grid; gridTemplateColumns:repeat(7,1fr); gap:2`. 42 cells (6×7).

**Day cell button (L332–345):**

| Property                               | Value                                                                                 |
| -------------------------------------- | ------------------------------------------------------------------------------------- |
| element                                | `<button type="button" role="gridcell" className="cjp-day cjp-hit [cjp-dis]">`        |
| base reset                             | `all: unset`                                                                          |
| boxSizing                              | `border-box`                                                                          |
| position                               | `relative`                                                                            |
| height                                 | `cell` = `38`                                                                         |
| borderRadius                           | `9`                                                                                   |
| layout                                 | `display:flex; flexDirection:column; alignItems:center; justifyContent:center; gap:2` |
| transition (`.cjp-day`)                | `background .12s, box-shadow .12s`                                                    |
| hover (`.cjp-hit:hover:not(.cjp-dis)`) | `background: var(--overlay-hover)`                                                    |

**Day number typography (L346):**

| Property   | Value                                  |
| ---------- | -------------------------------------- |
| fontFamily | `Inter, system-ui`                     |
| fontWeight | `800` if selected OR today, else `600` |
| fontSize   | `13.5`                                 |
| lineHeight | `1`                                    |
| color      | `numColor` (see §4)                    |

---

## 4. Day states

Common computed flags (L308–315): `isWknd = dow===0||dow===6`; `past = ymd(...) < TODAY_YMD`; `sel = iso===selectedISO`; `today = iso===CJP_TODAY_ISO`; `disabled = !c.inMonth || past`.

**Background resolution priority (L317–325):** selected → heat tint → weekend tint (heat only when `indicators==="heat"`; not this build).

| State                                              | Value                                                                                                                                    |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **default (in-month, future, not sel/today/wknd)** | background `transparent`; opacity `1`; numColor `var(--fg)`; fontWeight `600`                                                            |
| **selected**                                       | background `var(--signal)`; numColor `var(--fg-on-accent)`; fontWeight `800`                                                             |
| **today (not selected)**                           | boxShadow `inset 0 0 0 1.5px var(--accent)` (1.5px inset ring); numColor `var(--accent)`; fontWeight `800`                               |
| **today AND selected**                             | ring suppressed (`today && !sel` is false → boxShadow `none`); background `var(--signal)`; numColor `var(--fg-on-accent)`                |
| **past (in-month, before today)**                  | opacity `0.45`; numColor `var(--fg-subtle)`; `disabled=true`; no dot; `cursor:default`                                                   |
| **out-of-month (prev/next spill)**                 | opacity `0.4`; numColor `var(--fg-subtle)`; `disabled=true`; no dot; no weekend tint (guard `c.inMonth`)                                 |
| **weekend tint (in-month, future, not selected)**  | background `color-mix(in oklch, var(--surface-2) 60%, transparent)` — applied when `weekendEmphasis && isWknd && c.inMonth && !disabled` |
| **disabled (out-of-month OR past)**                | className adds `cjp-dis`; `onClick=undefined`; `cursor:default`; `aria-disabled=true`; no hover bg (`:not(.cjp-dis)`)                    |

**numColor precedence (L327–330):** `sel → var(--fg-on-accent)` · `!inMonth → var(--fg-subtle)` · `past → var(--fg-subtle)` · `today → var(--accent)` · else `var(--fg)`.

**opacity precedence (L342):** `!inMonth → 0.4` · `past → 0.45` · else `1`.

**Heat-map branch (not this build, for completeness, L320–322):** `a = min(0.34, 0.08 + count*0.045)`; `bg = color-mix(in oklch, var(--signal) ${round(a*100)}%, transparent)`.

---

## 5. Event indicators (dots)

**Dot element (L350–352):** rendered only when `indicators === "dots" && count > 0 && !disabled`.

| Property                     | Value                                                                          |
| ---------------------------- | ------------------------------------------------------------------------------ |
| width × height               | `4 × 4`                                                                        |
| borderRadius                 | `4`                                                                            |
| background (default)         | `var(--accent)`                                                                |
| background (on selected day) | `var(--fg-on-accent)`                                                          |
| placement                    | below the day number, in the column-flex cell (`gap:2` between number and dot) |

**Spacer when no dot / non-dots mode (L353):** `indicators !== "dots"` → `<span style={{ height: 4 }} />` (reserves the dot's vertical slot). When `indicators === "dots"` but count is 0 / disabled, no dot and no spacer element renders.

**WeekStrip dot parity (L224):** WeekStrip day dot is `4×4`, radius `4`, `var(--accent)` (or `var(--fg-on-accent)` when that day is selected), else `transparent`.

---

## 6. Empty month

**Detection:** `monthEmpty = !cjpMonthHasShows(view.y, view.m)` (L257). Empty-month set = `CJP_EMPTY_MONTHS = Set(["2026-11"])` → **December 2026** (month index 11). Grid stays live and every day remains selectable (README §Empty-month).

**Footer copy switch (L370–372):**

- Empty month → `<MonoEyebrow size={9.5} color="var(--fg-subtle)" letterSpacing="0.1em">Crickets in {MON3[view.m]}. Try later.</MonoEyebrow>` → for December: **`"Crickets in Dec. Try later."`**
- Non-empty month → `<MonoEyebrow size={9.5} color="var(--fg-subtle)" letterSpacing="0.1em">Dots = shows on sale</MonoEyebrow>`

(`MON3[view.m]` is the 3-letter month abbreviation; empty-month line interpolates it, so the string tracks whatever empty month is viewed.)

---

## 7. Animation (`anim="scale"`)

CSS from injected `#cjp-styles` block (L99–121):

| Property                              | Value                                                                                                           |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| base (`.cjp-pop`) transition          | `transform .13s cubic-bezier(.2,.7,.3,1), opacity .13s ease`                                                    |
| scale pre-mount (`.cjp-pop.scale`)    | `transform: scale(.95); opacity: 0; transform-origin: 34px -6px`                                                |
| mounted end-state (`.cjp-pop.cjp-in`) | `transform: none; opacity: 1`                                                                                   |
| duration                              | `130ms` (`.13s`) for both transform and opacity                                                                 |
| easing (transform)                    | `cubic-bezier(.2,.7,.3,1)`                                                                                      |
| easing (opacity)                      | `ease`                                                                                                          |
| transform-origin                      | `34px -6px` (near the header/cue, top-left)                                                                     |
| mount trigger                         | `mounted` state set true via `requestAnimationFrame` in `useEffect` (L243–244) → applies `cjp-in` on next frame |

**Other anim branches (not this build):** `.cjp-pop.slide{ transform:translateY(-10px); opacity:0 }`; `.cjp-pop.fade{ opacity:0 }`.

**prefers-reduced-motion (L118):** `@media (prefers-reduced-motion: reduce){ .cjp-pop{ transition:none!important; transform:none!important; opacity:1!important } .cjp-car{ transition:none!important } }` → picker shows end-state immediately, no scale/opacity pre-state; caret rotation is instant. README §Open-animation: reduced-motion + print + PDF show the end-state, never the pre-animation `opacity:0`.

---

## 8. Keyboard model

From `PA11Y_KEYS` (picker-a11y.jsx L78–85) + README §Accessibility. (Design-doc spec; no JS handler in the mock — this is the required implementation contract.)

| Key                               | Behavior                                                                                                          |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| **Enter / Space**                 | On the cue: open the picker (focus moves to the selected day). On a day: select it + close.                       |
| **Esc**                           | Close the picker, return focus to the month/year cue. Selection unchanged.                                        |
| **← → ↑ ↓**                       | Move day-by-day (←/→) / week-by-week (↑/↓) within the grid; wraps across weeks; skips disabled days.              |
| **PageUp / PageDown**             | Previous / next month (same as the `◂ ▸` pager).                                                                  |
| **Shift+PageUp / Shift+PageDown** | ± year.                                                                                                           |
| **Home / End**                    | Jump to the first / last day of the current week row.                                                             |
| **Tab**                           | Cycles: pager buttons → grid (**one stop**) → Today → then out. Grid is a single tab-stop; arrows move within it. |

**Tab-stop model:** grid is a **single tab-stop** (roving tabindex within the grid; arrows navigate, not Tab). Disabled days (out-of-month / past) are skipped by arrow keys — no dead tab-stops (README §Accessibility, a11y item 6).

**Focus behavior:**

- On open: focus lands on the **selected day** (SR walkthrough step 2; keyboard Enter/Space row).
- On close (all three paths — scrim · X · Esc): focus **returns to the cue** (README §Accessibility, a11y item 7).

---

## 9. ARIA

| Element                  | Role / attributes                                                                                                                                              |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Cue** (button)         | `aria-haspopup="dialog"`, `aria-expanded={open}`, `aria-label="${monthLabel}. Jump to a date"`                                                                 |
| **Picker** (container)   | `role="dialog"`, `aria-modal="false"` (non-modal, anchored), `aria-label="Jump to a date — ${MONTHS[view.m]} ${view.y}"` (e.g. `"Jump to a date — June 2026"`) |
| **Month pager prev**     | `aria-label="Previous month"`, `disabled={atMin}` (aria-disabled at forward-window ends per a11y item 3)                                                       |
| **Month pager next**     | `aria-label="Next month"`, `disabled={atMax}`                                                                                                                  |
| **Close (X)** button     | `aria-label="Close date picker"`                                                                                                                               |
| **Grid**                 | `role="grid"`                                                                                                                                                  |
| **Weekday header cells** | `aria-hidden="true"` (7 of them)                                                                                                                               |
| **Day cell**             | `role="gridcell"`, `aria-disabled={disabled}`, `aria-selected={sel}`                                                                                           |
| **Day cell aria-label**  | `` `${DOWFULL[dow]}, ${MONTHS[c.m]} ${c.d}${count > 0 ? `, ${count} show${count > 1 ? "s" : ""}` : ", no shows"}${today ? ", today" : ""}` ``                  |

**Day cell aria-label format breakdown:**

- Weekday full name (`DOWFULL[dow]`, Sunday-first array) + `, ` + full month name + ` ` + day number.
- Then show count clause: `, N show` (N===1) / `, N shows` (N>1) / `, no shows` (0).
- Then `, today` appended only when the cell is today.
- Examples: `"Saturday, June 27, 3 shows"`; `"Tuesday, April 28, 2 shows, today"`; `"Wednesday, May 6, no shows"`.

**a11y assertions (README §Accessibility / picker-a11y items):**

- `role="dialog"` labelled by visible month + year (a11y item 1).
- Cue owns `aria-expanded`/`aria-haspopup`; focus returns on close (item 2).
- Selected carries `aria-selected`; today keeps a **1.5px ring AND accent text** so it clears the 3:1 non-text contrast bar without relying on hue (item 5, README §Accessibility).
- Disabled days `aria-disabled` + arrow-skip, no dead tab-stops (item 6).
- The dot is **never the only signal** — count is always in the aria-label (item 4).
- Month heading is a polite live region (SR walkthrough step 3).
- Empty-month line is associated / read after the grid (SR walkthrough step 6).

**WeekStrip day button ARIA (for parity, L209–211):** `aria-label="${DOWFULL[dow]} ${MON3[wd.m]} ${wd.d}${has ? ", shows" : ""}"`, `aria-pressed={sel}`. (Note: WeekStrip uses `aria-pressed` + abbreviated month + `", shows"` binary, whereas the picker grid uses `aria-selected` + full month + explicit count. These formats differ by design.)

---

## 10. Responsive parity

**Identical across mobile & desktop (parity constraint, README §Constraints + calendar-surfaces header):**

- Behavior: same states, same close paths, same keyboard model.
- The `JumpPicker` component itself (all day states, dots, weekend tint, today ring, animation, ARIA, pager, footer, Today reset) is the same component with the same props on both surfaces.
- `pick = (iso) => { setSelected(iso); setOpen(false); }` identical (L126 / L192).
- `canClosePane = closing === "both" || closing === "scrim"` identical.

**Differs (layout only):**

| Aspect             | Mobile                                                                 | Desktop                                                                                    |
| ------------------ | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Picker width prop  | `"100%"`                                                               | `324`                                                                                      |
| Presentation       | full-width sheet under the header                                      | floated popover anchored to the cue                                                        |
| Positioner         | `position:absolute; top:150; left:12; right:12; zIndex:5; flex-center` | `position:absolute; top:46; left:12; zIndex:9`                                             |
| Scrim              | visible: `var(--scrim)` + `blur(3px)`, zIndex 4                        | invisible fixed click-catcher, `position:fixed; inset:0; zIndex:8`, no bg/blur             |
| Surrounding chrome | MobileTop (26px MMark, "What's on?" 24px, list/cal toggle h32)         | DesktopChrome browser frame + app bar (MMark 26, title 30px), maxWidth-620 centered column |

---

## 11. Constants

| Constant               | Value / definition (L26–43)                                                                                         |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **CJP_TODAY**          | `{ y: 2026, m: 3, d: 28 }` → **Tue Apr 28, 2026** (m is 0-indexed → April)                                          |
| **CJP_TODAY_ISO**      | `"2026-04-28"`                                                                                                      |
| **CJP_MIN**            | `{ y: 2026, m: 3 }` → April 2026 (can't page before current month)                                                  |
| **CJP_MAX**            | `{ y: 2027, m: 3 }` → April 2027 (forward window ≈ 12 months)                                                       |
| **Forward window cap** | ≈12 months (README open-question #1: `CJP_MAX`, confirm ceiling)                                                    |
| **TODAY_YMD**          | `ymd(2026,3,28)` = `20260428` (integer compare key)                                                                 |
| **MONTHS**             | full names Jan–Dec, index 0–11                                                                                      |
| **MON3**               | `["Jan",...,"Dec"]` 3-letter                                                                                        |
| **DOW1**               | `["S","M","T","W","T","F","S"]` — **Sunday-first**                                                                  |
| **DOWFULL**            | `["Sunday",...,"Saturday"]` — Sunday-first                                                                          |
| **DOW ordering**       | **Sunday-first** throughout (matrix `startDow = new Date(y,m,1).getDay()`, header DOW1, week strip)                 |
| **CJP_EMPTY_MONTHS**   | `Set(["2026-11"])` → December 2026 forced empty (note key uses raw 0-indexed month `${y}-${m}`, so `2026-11` = Dec) |
| **Matrix size**        | 42 cells (6 rows × 7), prev/next spill included (`cjpMatrix`, L61–69)                                               |
| **atMin (picker)**     | `view.y===CJP_MIN.y && view.m===CJP_MIN.m`                                                                          |
| **atMax (picker)**     | `view.y===CJP_MAX.y && view.m===CJP_MAX.m`                                                                          |

**cjpShowCount density model (L44–53), for reference:** past days / empty-months → 0. Fri/Sat (dow 5,6): `r<26?0:1+(r%6)` (busy). Thu/Sun (dow 4,0): `r<52?0:1+(r%4)` (medium). Other weekdays: `r<70?0:1+(r%3)` (light). Seed: `((y*372+(m+1)*31+d)*2654435761)>>>0`, `r = seed%100`.

**Named event rows (CJP_EVENTS, L76–91):** `2026-04-28` (2 shows: Wednesday@Larimer Lounge 8:00 PM $, MJ Lenderman@Bluebird Theater 9:00 PM $$), `2026-05-02` (3 shows), `2026-06-27` (3 shows: Sleep Token@Fillmore Auditorium 8:00 PM $$$, Julien Baker@Boettcher 7:30 PM $$, Anemone@Hi-Dive 9:00 PM $).

---

## 12. Verbatim copy

Every user-facing string, exact:

**Picker footer:**

- `Crickets in Dec. Try later.` — empty-month line (interpolated `Crickets in {MON3[view.m]}. Try later.`; "Dec" for the seeded empty month).
- `Dots = shows on sale` — non-empty-month footer hint.
- `Today` — footer reset chip label (`textTransform: uppercase` → renders "TODAY").

**Cue / dialog accessible names:**

- `${monthLabel}. Jump to a date` — cue aria-label (e.g. `April 2026. Jump to a date`).
- `Jump to a date — ${MONTHS[view.m]} ${view.y}` — dialog aria-label (e.g. `Jump to a date — June 2026`).

**Pager / control labels (aria):**

- `Previous week` · `Next week` (WeekStrip chevrons)
- `Previous month` · `Next month` (picker pager)
- `Close date picker` (X)

**Day-list empty states (calendar-surfaces.jsx DayList, L36–51):**

- `No shows tonight, grandpa.` — when the empty date is today.
- `Nothing on ${wd}. Rest up.` — when empty date is not today (`wd` = weekday abbrev, e.g. `Nothing on Wed. Rest up.`).
- `jump to a busier day ↑` — sub-eyebrow under the empty day-list message.

**Day-list populated header (L55–56):**

- `${cjpFmtDate(iso)} · ${events.length} show${events.length !== 1 ? "s" : ""}` — e.g. `Sat, Jun 27 · 3 shows`. `cjpFmtDate` format: `${["Sun".."Sat"][dow]}, ${MON3[m-1]} ${d}`.

**Surface chrome copy (context, calendar-surfaces.jsx):**

- `concertcrawl.` (wordmark; "crawl." accented) — MobileTop L82–83 & desktop app bar L201.
- `What's on?` — page title (mobile 24px L91 / desktop 30px L215).
- `Denver, CO` — location eyebrow (L92 / L216).
- `list` / `cal` — view toggle (uppercase; L95–101 / L219–220).
- Desktop nav: `Browse`, `Search`, `Saved` (L204).
- Desktop URL chip: `concertcrawl.app/browse` (DesktopChrome default `url`, L162).
- Avatar initial: `H` (L207).

---

_Section 4 (day states), Section 7 (animation), and Section 9 (ARIA day-label format) carry the most easily-missed exact values (1.5px inset ring, `transform-origin: 34px -6px`, 130ms/`cubic-bezier(.2,.7,.3,1)`, weekend `color-mix(in oklch, var(--surface-2) 60%, transparent)`, `--signal` for selected vs `--accent` for today/dots) — verify these precisely against the implementation._
