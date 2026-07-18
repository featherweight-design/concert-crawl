# #642 · Calendar Jump Picker — design handoff (R1)

**Track 2 · Round 1 · July 11, 2026**

A tappable month/year header on the Browse · Cal surface that opens a mini-month
grid, so a user can **jump straight to a specific future weekend** instead of
nudging the WeekStrip `◂ ▸` chevrons day-by-day (the beta-feedback complaint that
opened this track). Calendar surface only.

Open: `Calendar Jump Picker.html`

---

## R2 · "Back to Today" control (July 18, 2026)

Open: `Back to Today.html`

Companion to the jump picker: once a user navigates away from now, there was no
fast way back. This adds a small, unobtrusive control that returns the Cal view
to the current week **and** selects today in one tap.

| Call | Decision |
|---|---|
| **Trigger** | **Week-level** — visible when the shown week doesn't contain today; hidden the instant today is back in view (tapping a different day *within* today's week keeps it hidden). |
| **Action** | **Full reset** — jump to today's week + select today. Mirrors the JumpPicker footer chip exactly. |
| **Placement** | **Inline** in the header nav cluster, left of the `◂ ▸` chevrons — same spot on mobile + desktop (parity). Floating-pill variant shown for comparison. |
| **Label** | **Icon + text** where it fits; collapse to **icon-only** at ≤360 (320 header can't hold a long month label + word + two chevrons). |
| **Wording** | **"Today"** (literal, in budget). Voice option "Back to tonight" is ~2× wider → desktop / floating only. |
| **Glyph** | rotate-ccw (reset). Deliberately **not** a plain `◂` — that would collide with the adjacent prev-week chevron. Drawn in `--accent` (the calendar's "today" colour). |

**Consolidation:** the JumpPicker footer already had a near-duplicate "Today"
reset. Rather than remove one, both now share the **same rotate-ccw mark** so it
reads as one learned "snap to today" gesture. They're modally separated (surface
control = closed header; picker chip = inside the open overlay) so they never
compete. `showTodayChip={false}` removes the picker chip if you'd rather
consolidate to one — live as a Tweak.

**A11y:** standard `<button>`, Tab/Enter/Space, `aria-label="Back to today, Tuesday, April 28"`, `:focus-visible` ring, **44 × 44 hit target** (transparent) around the 34px visible pill. Unmounts when hidden (no dead tab-stop). Motion fades+slides in over 170ms; reduced-motion + print show the end-state. Token-only across Electric / Jade / Light.

Ships into the real surfaces via opt-in props on `CalSurfaceMobile` /
`CalSurfaceDesktop` (`backToToday`, `btLabelStyle`, `btWording`, `btPlacement`,
`showTodayChip`) — the R1 canvas is unchanged (default off). New file:
`back-to-today.jsx` (`BackToTodayControl`, `RotateCcwGlyph`, `b2tWeekHasToday`).

---

## Two-mode nav — preserved

The picker is **additive**; it does not replace the existing chevron paging.

| Gesture | Action | Prod behaviour (per WeekStrip.tsx) |
|---|---|---|
| `◂ ▸` chevrons (flank the cue) | page the loaded week ±1 | SSR week-paging |
| tap **month/year cue** → pick a day | jump to any day in the forward window | client `history.replaceState` |

The cue never blocks the fast path — the chevrons stay exactly where they were.

---

## Design's calls (the brief's "Open for Design" list)

Each is a **live Tweak** in the canvas so they can be audited in the Readiness
Review. Recommendation is marked ★.

| Call | Options (Tweak) | Recommendation |
|---|---|---|
| **Header interactive cue** | Chip ★ / Caret / Underline | **Chip** — surface-2 fill + border + caret reads unmistakably as a control; the caret signals a menu (not a link). Underline reads too much like a hyperlink. |
| **Event indicators in grid** | Dots ★ / Heat-map / None | **Dots** — one `--accent` dot on days with shows, matching the WeekStrip. Calm, binary, enough to steer. Heat-map (tint scales with count) is there when density matters; None keeps it purely navigational. |
| **Closing affordance** | Both ★ / Scrim+Esc / X | **Both** — tap-scrim **and** an explicit X **and** Esc. No one gets trapped; belt-and-suspenders is cheap here. |
| **Empty-month treatment** | — | Grid stays **live and selectable** (the user may still want the date); a Sour Patch line drops in so it doesn't read as broken: *"Crickets in Dec. Try later."* |
| **Weekend emphasis** | On ★ / Off | **On** — a faint column tint on Sat/Sun. The complaint was specifically about reaching a *weekend*, so weekends are scannable. Any day is still selectable. |
| **Open animation** | Scale-from-cue ★ / Slide-down / Fade | **Scale from the cue** (≈130ms, transform-origin near the header). Respects `prefers-reduced-motion` — reduced-motion + print + PDF show the end-state, never the pre-animation opacity:0. |

---

## Canvas map

| § | Section | What's in it |
|---|---|---|
| 0 | **Live preview** | Mobile + desktop, jumped to Sat Jun 27. Driven entirely by the Tweaks panel. |
| 1 | **Header at rest** | The three interactive-cue treatments (mobile) + desktop chip at rest. |
| 2 | **Picker open** | Mobile **320 baseline** + 390 + desktop popover. |
| 3 | **The jump** | before (this week, Apr) → paged to June → after (Sat 27 selected). |
| 4 | **Event indicators** | Dots / Heat-map / None side by side. |
| 5 | **Weekend + closing** | Weekend tint on/off; X-present vs scrim-only. |
| 6 | **Empty month** | Zero-shows month (December) + empty-day list context. |
| 7 | **Accessibility** | Annotated picker (roles + focus), keyboard model, SR walkthrough. |
| 8 | **Theme parity** | The open picker in all 9 themes, token-only. |

---

## Accessibility (WCAG AA)

- Cue: `aria-haspopup="dialog"` + `aria-expanded`; focus **returns to the cue** on every close.
- Picker: `role="dialog"` (non-modal, anchored) labelled by the visible month + year.
- Grid: `role="grid"` / `gridcell`; each day's `aria-label` speaks weekday, date, **and show count** — the dot is never the only signal. Selected = `aria-selected`; **today keeps a 1.5px ring + accent text** so it clears the 3:1 non-text bar without relying on hue.
- Disabled (out-of-month / past) days are `aria-disabled` and skipped by arrow keys — no dead tab-stops.
- Keyboard: the grid is a **single tab-stop**; arrows move within it, PageUp/Down page months, Home/End jump week ends, Esc closes. Full model in §7.
- Close: tap-scrim · X · Esc — all three return focus to the cue.

---

## Constraints met

- **Sour Patch voice** on all copy (empty month "Crickets in Dec. Try later.", empty day "No shows tonight, grandpa." / "Nothing on Wed. Rest up.").
- **Mobile + desktop parity** — identical behaviour (same states, same close paths, same keyboard model); only layout differs (mobile drops a full-width sheet under the header; desktop floats a popover anchored to the cue).
- **Token-only** — every color is `var(--*)`; verified across all 9 themes in §8. Selected = `--signal`, today ring + dots = `--accent`.
- **No new dependencies** — hand-built grid (JS `Date` math), no calendar lib.

---

## Files

| File | Role |
|---|---|
| `Calendar Jump Picker.html` | canvas + Tweaks (entry point) |
| `calendar-picker.jsx` | data + `WeekStripHeader` + `JumpPicker` (all design-calls are props) |
| `calendar-surfaces.jsx` | `CalSurfaceMobile` / `CalSurfaceDesktop` (Browse · Cal context) |
| `picker-a11y.jsx` | annotation pins, keyboard map, SR walkthrough |
| `theme-context.jsx` · `ios-frame.jsx` · `design-canvas.jsx` · `tweaks-panel.jsx` · `monetization-shared.jsx` | shared infra (copied, unmodified) |

Brand mark is the canonical `MMark` (CCMark copy) from `monetization-shared.jsx`, per CLAUDE.md §1. No new logo.

---

## Open questions for the Readiness Review

1. **Forward window** is capped at ≈12 months (`CJP_MAX`). Confirm that's the right ceiling, or if it should track a data horizon.
2. **Past days** inside the current month are shown but disabled (you can't attend a past show). Confirm that's preferred over hiding them.
3. **Heat-map** is implemented as a cell tint scaling with count (clearer than a graduated dot). Flag if you'd rather the dot-scaling reading from the original brief.

> Note for reviewers: the html-to-image screenshot tool under-draws the picker
> card (it can't rasterize `color-mix(oklch)` + the backdrop-filter scrim). It
> renders correctly in a real browser — open the HTML directly to see it live.
