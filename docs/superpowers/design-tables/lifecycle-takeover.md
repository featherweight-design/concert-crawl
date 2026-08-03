# Design Property Table — #780 Lifecycle Takeover + Day-13 Banner (PR 4.2)

Source of truth: `design/design_handoff_monetization_lifecycle/lifecycle-takeover.jsx` (primary),
`monetization-shared.jsx` (only the atoms it uses: `RailHeader`, `MonoEyebrow`, `getFounderState`),
`README.md` §8 / §9 / decisions log item 5.

Conventions in this table:

- "Mobile" = `variant="mobile"` (`wide = false`); "Desktop" = `variant="desktop"` (`wide = true`).
- Values are exact from source. `—` = explicitly absent (e.g. `border: "none"`). Omitted rows = not set in the design.
- `TierStateCard`, `TierRowMobile`, `r5VisibleTiers`, `R5_BY_KEY` are the **LOCKED #781 picker** from
  `monetization-tier-states.jsx` — reused verbatim, NOT re-specified here (per README "Nothing from #781 is redesigned").
  Only the props the takeover passes into them are recorded.

---

## Component: TrialEndedTakeover

Props: `variant = "mobile"` (or `"desktop"`), `founderKind = "open-many"`.
Derived: `founderState = getFounderState(founderKind)`, `tiers = r5VisibleTiers(founderState, "free")`.
Full-bleed surface — owns its own chrome (README dev notes: picker renders inline, **not** inside SheetChrome/ModalChrome).

### Root container (`body`)

| Property       | Mobile                                                                                                  | Desktop     |
| -------------- | ------------------------------------------------------------------------------------------------------- | ----------- |
| width          | 100%                                                                                                    | 100%        |
| height         | 100%                                                                                                    | 100%        |
| background     | `radial-gradient(circle at 50% 0%, color-mix(in oklch, var(--signal) 9%, var(--bg)) 0%, var(--bg) 55%)` | same        |
| color          | `var(--fg)`                                                                                             | same        |
| font-family    | `Inter, system-ui`                                                                                      | same        |
| display        | flex                                                                                                    | flex        |
| flex-direction | column                                                                                                  | column      |
| align-items    | center                                                                                                  | center      |
| padding        | `70px 18px 26px`                                                                                        | `48px 40px` |
| overflow       | auto                                                                                                    | auto        |
| position       | relative                                                                                                | relative    |

### Dismiss X button (top-right)

`<button>` with `all: "unset"`.

| Property        | Mobile                    | Desktop  |
| --------------- | ------------------------- | -------- |
| all             | unset                     | unset    |
| cursor          | pointer                   | pointer  |
| position        | absolute                  | absolute |
| top             | 56                        | 22       |
| right           | 18                        | 26       |
| width           | 34                        | 34       |
| height          | 34                        | 34       |
| border-radius   | 9                         | 9        |
| display         | flex                      | flex     |
| align-items     | center                    | center   |
| justify-content | center                    | center   |
| background      | `var(--surface-1)`        | same     |
| border          | `1px solid var(--border)` | same     |
| color           | `var(--fg-muted)`         | same     |

### Dismiss X icon (SVG)

| Property       | Mobile                    | Desktop |
| -------------- | ------------------------- | ------- |
| width          | 15                        | 15      |
| height         | 15                        | 15      |
| viewBox        | `0 0 16 16`               | same    |
| path d         | `M3 3 L13 13 M13 3 L3 13` | same    |
| stroke         | `currentColor`            | same    |
| stroke-width   | 1.7                       | 1.7     |
| stroke-linecap | round                     | round   |

### Content column (wraps head + picker + dismiss link)

| Property       | Mobile | Desktop |
| -------------- | ------ | ------- |
| width          | 100%   | 100%    |
| max-width      | 100%   | 880     |
| display        | flex   | flex    |
| flex-direction | column | column  |
| gap            | 18     | 26      |
| align-items    | center | center  |

### Head block (outer)

| Property       | Mobile | Desktop |
| -------------- | ------ | ------- |
| display        | flex   | flex    |
| flex-direction | column | column  |
| gap            | 12     | 14      |
| width          | 100%   | 100%    |
| max-width      | 100%   | 880     |

### RailHeader wrapper

| Property  | Mobile | Desktop |
| --------- | ------ | ------- |
| max-width | 420    | 420     |

Contains `<RailHeader tone="muted" eyebrow="Premium trial · done" code="14/14"/>` — see shared atoms below.

### Headline row

| Property        | Mobile        | Desktop       |
| --------------- | ------------- | ------------- |
| display         | flex          | flex          |
| align-items     | flex-start    | flex-end      |
| justify-content | space-between | space-between |
| gap             | 20            | 20            |
| flex-wrap       | wrap          | wrap          |

### Headline column

| Property       | Mobile | Desktop |
| -------------- | ------ | ------- |
| display        | flex   | flex    |
| flex-direction | column | column  |
| gap            | 9      | 9       |
| flex           | 1      | 1       |
| min-width      | auto   | 360     |

### Headline ("Trial's done. Pick a lane.")

| Property       | Mobile      | Desktop |
| -------------- | ----------- | ------- |
| font-weight    | 900         | 900     |
| font-size      | 34          | 52      |
| letter-spacing | -0.04em     | -0.04em |
| line-height    | 1.0         | 1.0     |
| color          | `var(--fg)` | same    |

### Subhead paragraph

| Property       | Mobile            | Desktop  |
| -------------- | ----------------- | -------- |
| font-weight    | 500               | 500      |
| font-size      | 14                | 16       |
| color          | `var(--fg-muted)` | same     |
| letter-spacing | -0.005em          | -0.005em |
| line-height    | 1.5               | 1.5      |
| max-width      | 560               | 560      |

### Picker region — Desktop only: TierStateCard grid

Rendered only when `variant === "desktop"`.

| Property              | Mobile         | Desktop                                                                                          |
| --------------------- | -------------- | ------------------------------------------------------------------------------------------------ |
| width                 | (not rendered) | 100%                                                                                             |
| display               | (not rendered) | grid                                                                                             |
| grid-template-columns | (not rendered) | `repeat(${tiers.length}, 1fr)` (column count = length of `r5VisibleTiers(founderState, "free")`) |
| gap                   | (not rendered) | 12                                                                                               |
| align-items           | (not rendered) | stretch                                                                                          |

Each cell: `<TierStateCard tier={t} state="free" founderState={founderState} urgencyIntensity="medium"/>` (LOCKED #781 component — props only).

### Picker region — Mobile only: TakeoverPickerMobile

Rendered only when `variant !== "desktop"`. See component below.

### Dismiss link row (bottom)

| Property        | Mobile | Desktop |
| --------------- | ------ | ------- |
| display         | flex   | flex    |
| align-items     | center | center  |
| justify-content | center | center  |
| gap             | 7      | 7       |
| padding-top     | 4      | 6       |

### Dismiss link button ("Keep browsing on Free →")

`<button>` with `all: "unset"`.

| Property       | Mobile                        | Desktop    |
| -------------- | ----------------------------- | ---------- |
| all            | unset                         | unset      |
| cursor         | pointer                       | pointer    |
| font-family    | `'JetBrains Mono', monospace` | same       |
| font-size      | 10                            | 10         |
| font-weight    | 700                           | 700        |
| letter-spacing | 0.14em                        | 0.14em     |
| text-transform | uppercase                     | uppercase  |
| color          | `var(--fg-subtle)`            | same       |
| padding        | `8px 10px`                    | `8px 10px` |

### Hover / focus / transitions

No hover, focus, transition, transform, or animation styles are defined anywhere in `lifecycle-takeover.jsx`. `—` for all interactive-state deltas (design leaves them unspecified).

---

## Component: TakeoverPickerMobile

Props: `founderState`, `tiers`. Internal state: `open` (React.useState, initial `"premium"`).

### Root

| Property       | Mobile | Desktop                 |
| -------------- | ------ | ----------------------- |
| display        | flex   | (mobile-only component) |
| flex-direction | column | —                       |
| gap            | 10     | —                       |
| width          | 100%   | —                       |

### Rows

One `<TierRowMobile>` per entry in `tiers` (LOCKED #781 component). Props passed:

| Prop             | Value                                                                                                            |
| ---------------- | ---------------------------------------------------------------------------------------------------------------- |
| tier             | each `t` from `tiers`                                                                                            |
| state            | `"free"`                                                                                                         |
| founderState     | `founderState`                                                                                                   |
| urgencyIntensity | `"medium"`                                                                                                       |
| expanded         | `open === t.key` (initially only `"premium"` expanded)                                                           |
| onToggle         | sets `open` to `t.key`, or `null` if the tapped row was already open (accordion; tapping open row collapses all) |

---

## Component: DayThirteenBanner

Props: `variant = "mobile"` (or `"desktop"`), `inline = false`.
Placement (README decisions log item 5): **default (pinned)** = full-bleed thin strip pinned to the very top, **above the app bar**; **inline** = rounded inset card sitting in content flow **just under the app bar**, for surfaces where a pinned strip is too heavy.

### Root container — pinned (default, `inline = false`)

| Property      | Mobile                                                                   | Desktop     |
| ------------- | ------------------------------------------------------------------------ | ----------- |
| box-sizing    | border-box                                                               | border-box  |
| width         | 100%                                                                     | 100%        |
| display       | flex                                                                     | flex        |
| align-items   | center                                                                   | center      |
| gap           | 10                                                                       | 14          |
| padding       | `9px 13px`                                                               | `10px 20px` |
| margin        | 0                                                                        | 0           |
| border-radius | 0                                                                        | 0           |
| background    | `color-mix(in oklch, var(--signal) 16%, var(--bg-elevated))`             | same        |
| border        | — (`none`)                                                               | — (`none`)  |
| border-bottom | `1px solid color-mix(in oklch, var(--signal) 30%, var(--border-strong))` | same        |
| color         | `var(--fg)`                                                              | same        |
| font-family   | `Inter, system-ui`                                                       | same        |

### Root container — inline (`inline = true`)

| Property      | Mobile                                                                                                                                     | Desktop     |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ----------- |
| box-sizing    | border-box                                                                                                                                 | border-box  |
| width         | 100%                                                                                                                                       | 100%        |
| display       | flex                                                                                                                                       | flex        |
| align-items   | center                                                                                                                                     | center      |
| gap           | 10                                                                                                                                         | 14          |
| padding       | `10px 13px`                                                                                                                                | `11px 16px` |
| margin        | 0                                                                                                                                          | 0           |
| border-radius | 12                                                                                                                                         | 12          |
| background    | `color-mix(in oklch, var(--signal) 10%, var(--surface-1))`                                                                                 | same        |
| border        | `1px solid color-mix(in oklch, var(--signal) 32%, var(--border))`                                                                          | same        |
| border-bottom | `1px solid color-mix(in oklch, var(--signal) 32%, var(--border))` (same mix as the other three sides — declared explicitly after `border`) | same        |
| color         | `var(--fg)`                                                                                                                                | same        |
| font-family   | `Inter, system-ui`                                                                                                                         | same        |

### Hourglass icon (SVG)

| Property        | Mobile                                                                                       | Desktop |
| --------------- | -------------------------------------------------------------------------------------------- | ------- |
| width           | 16                                                                                           | 18      |
| height          | 16                                                                                           | 18      |
| viewBox         | `0 0 16 16`                                                                                  | same    |
| flex-shrink     | 0                                                                                            | 0       |
| color           | `var(--signal)`                                                                              | same    |
| path d          | `M4 2.5 H12 M4 13.5 H12 M4.5 2.5 C4.5 6 11.5 6 11.5 2.5 M4.5 13.5 C4.5 10 11.5 10 11.5 13.5` | same    |
| fill            | none                                                                                         | none    |
| stroke          | `currentColor`                                                                               | same    |
| stroke-width    | 1.4                                                                                          | 1.4     |
| stroke-linecap  | round                                                                                        | round   |
| stroke-linejoin | round                                                                                        | round   |

### Text cluster

| Property    | Mobile   | Desktop  |
| ----------- | -------- | -------- |
| flex        | 1        | 1        |
| min-width   | 0        | 0        |
| display     | flex     | flex     |
| align-items | baseline | baseline |
| gap         | 8        | 8        |
| flex-wrap   | wrap     | wrap     |
| row-gap     | 0        | 0        |

### Title span ("Trial ends tomorrow")

| Property       | Mobile      | Desktop |
| -------------- | ----------- | ------- |
| font-weight    | 800         | 800     |
| font-size      | 13          | 14      |
| letter-spacing | -0.01em     | -0.01em |
| color          | `var(--fg)` | same    |

### Sub span ("Lock it in?")

| Property       | Mobile            | Desktop  |
| -------------- | ----------------- | -------- |
| font-weight    | 500               | 500      |
| font-size      | 12.5              | 13.5     |
| color          | `var(--fg-muted)` | same     |
| letter-spacing | -0.005em          | -0.005em |

### CTA button ("Go Premium")

`<button>` with `all: "unset"`.

| Property       | Mobile                | Desktop    |
| -------------- | --------------------- | ---------- |
| all            | unset                 | unset      |
| cursor         | pointer               | pointer    |
| flex-shrink    | 0                     | 0          |
| padding        | `6px 12px`            | `7px 14px` |
| border-radius  | 8                     | 8          |
| background     | `var(--signal)`       | same       |
| color          | `var(--fg-on-accent)` | same       |
| font-family    | `Inter, system-ui`    | same       |
| font-weight    | 800                   | 800        |
| font-size      | 12                    | 12.5       |
| letter-spacing | -0.005em              | -0.005em   |

### Dismiss X button

`<button>` with `all: "unset"`.

| Property        | Mobile             | Desktop |
| --------------- | ------------------ | ------- |
| all             | unset              | unset   |
| cursor          | pointer            | pointer |
| flex-shrink     | 0                  | 0       |
| width           | 26                 | 26      |
| height          | 26                 | 26      |
| border-radius   | 7                  | 7       |
| display         | flex               | flex    |
| align-items     | center             | center  |
| justify-content | center             | center  |
| color           | `var(--fg-subtle)` | same    |

### Dismiss X icon (SVG)

| Property       | Mobile                    | Desktop |
| -------------- | ------------------------- | ------- |
| width          | 13                        | 13      |
| height         | 13                        | 13      |
| viewBox        | `0 0 16 16`               | same    |
| path d         | `M3 3 L13 13 M13 3 L3 13` | same    |
| stroke         | `currentColor`            | same    |
| stroke-width   | 1.7                       | 1.7     |
| stroke-linecap | round                     | round   |

### Hover / focus / transitions

None defined for any element of the banner. `—`.

---

## Shared atoms used (from monetization-shared.jsx)

Only the pieces `lifecycle-takeover.jsx` actually consumes. (It destructures `MMark` and `MonoEyebrow` from `window` but never renders them directly; `MonoEyebrow` is used indirectly via `RailHeader`.)

### RailHeader — as used: `tone="muted"`, `eyebrow="Premium trial · done"`, `code="14/14"`

With `tone="muted"`, accent color `c = var(--fg-subtle)`.

#### Root row

| Property    | Mobile | Desktop |
| ----------- | ------ | ------- |
| display     | flex   | flex    |
| align-items | center | center  |
| gap         | 10     | 10      |
| width       | 100%   | 100%    |

#### Dot

| Property      | Mobile                                      | Desktop |
| ------------- | ------------------------------------------- | ------- |
| width         | 6                                           | 6       |
| height        | 6                                           | 6       |
| border-radius | 6                                           | 6       |
| background    | `var(--fg-subtle)` (tone-muted `c`)         | same    |
| flex-shrink   | 0                                           | 0       |
| box-shadow    | `0 0 8px var(--fg-subtle)` (`0 0 8px ${c}`) | same    |

#### Eyebrow text (`MonoEyebrow color={c} letterSpacing="0.16em"`)

| Property       | Mobile                              | Desktop   |
| -------------- | ----------------------------------- | --------- |
| font-family    | `'JetBrains Mono', monospace`       | same      |
| font-size      | 10 (MonoEyebrow default)            | 10        |
| font-weight    | 700 (default)                       | 700       |
| text-transform | uppercase                           | uppercase |
| letter-spacing | 0.16em                              | 0.16em    |
| color          | `var(--fg-subtle)` (tone-muted `c`) | same      |

#### Hairline

| Property   | Mobile          | Desktop |
| ---------- | --------------- | ------- |
| flex       | 1               | 1       |
| height     | 1               | 1       |
| background | `var(--border)` | same    |

#### Code text (`MonoEyebrow letterSpacing="0.14em"`, rendered because `code !== undefined`)

| Property       | Mobile                                         | Desktop   |
| -------------- | ---------------------------------------------- | --------- |
| font-family    | `'JetBrains Mono', monospace`                  | same      |
| font-size      | 10 (default)                                   | 10        |
| font-weight    | 700 (default)                                  | 700       |
| text-transform | uppercase                                      | uppercase |
| letter-spacing | 0.14em                                         | 0.14em    |
| color          | `var(--fg-subtle)` (MonoEyebrow default color) | same      |

### MonoEyebrow (defaults, for reference)

| Property       | Value                             |
| -------------- | --------------------------------- |
| font-family    | `'JetBrains Mono', monospace`     |
| font-size      | 10 (prop `size` default)          |
| font-weight    | 700 (prop `weight` default)       |
| text-transform | uppercase                         |
| letter-spacing | 0.14em (prop default)             |
| color          | `var(--fg-subtle)` (prop default) |

### getFounderState(kind) — data helper

Returns `{ open, seatsClaimed, seatsTotal, daysLeft, hoursLeft, hot }`:

| kind                            | open  | seatsClaimed | seatsTotal | daysLeft | hoursLeft | hot   |
| ------------------------------- | ----- | ------------ | ---------- | -------- | --------- | ----- |
| `open-many` (default / unknown) | true  | 23           | 100        | 27       | 14        | false |
| `open-few`                      | true  | 88           | 100        | 19       | 6         | true  |
| `ending-soon`                   | true  | 62           | 100        | 2        | 11        | true  |
| `closed`                        | false | —            | —          | —        | —         | —     |

---

## Copy strings

All strings verbatim from source (punctuation, em-dashes, arrows, middots exact). Per README dev notes, all externalize to `copy.ts` at integration.

| Variant                 | Element             | Exact string                                                                                                                                                            |
| ----------------------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Takeover (all variants) | RailHeader eyebrow  | `Premium trial · done`                                                                                                                                                  |
| Takeover (all variants) | RailHeader code     | `14/14`                                                                                                                                                                 |
| Takeover (all variants) | Headline            | `Trial's done. Pick a lane.`                                                                                                                                            |
| Takeover (all variants) | Subhead             | `Your 14 days of Premium just wrapped. You're on Free now. Browsing and your saved shows stay put; alerts, follows, and history are paused. Pick where you want to be.` |
| Takeover (all variants) | Bottom dismiss link | `Keep browsing on Free →`                                                                                                                                               |
| Banner (all variants)   | Title span          | `Trial ends tomorrow`                                                                                                                                                   |
| Banner (all variants)   | Sub span            | `Lock it in?`                                                                                                                                                           |
| Banner (all variants)   | CTA button          | `Go Premium`                                                                                                                                                            |

Notes: apostrophes in "Trial's" / "You're" are straight quotes (`'`) in source. The subhead is two sentences, with no em-dash. The sub span is a standalone question: `Lock it in?`. Dismiss link ends with ` →`. Eyebrow middot is `·`. No template slots (no `{'#N'}`, no dates) appear in PR 4.2 components.

---

## State Coverage

| State                                 | Triggering condition                                                                                                                                                       | Rendered                                                                                                                                                                                                  |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Takeover · mobile default             | `<TrialEndedTakeover variant="mobile" founderKind="open-many"/>`; fires next session after `trial_ends_at` passed, single-fire via `last_trial_ended_shown_at` (eng, #775) | Full-bleed radial-signal surface, mobile padding `70px 18px 26px`; X at top 56/right 18; headline 34px; `TakeoverPickerMobile` accordion (Premium row expanded by default); bottom dismiss link           |
| Takeover · desktop default            | `variant="desktop" founderKind="open-many"`                                                                                                                                | Same content at max-width 880, padding `48px 40px`; X at top 22/right 26; headline 52px; `TierStateCard` grid, `repeat(tiers.length, 1fr)`, gap 12                                                        |
| Takeover · founder open-few           | `founderKind="open-few"`                                                                                                                                                   | Identical takeover chrome/copy; `founderState = { open: true, 88/100, 19d 6h, hot: true }` passed into the #781 picker (urgency rendering owned by #781)                                                  |
| Takeover · founder ending-soon        | `founderKind="ending-soon"`                                                                                                                                                | Identical chrome/copy; `founderState = { open: true, 62/100, 2d 11h, hot: true }` into picker                                                                                                             |
| Takeover · founder-window-closed (§8) | `founderKind="closed"`                                                                                                                                                     | Identical chrome/copy; `founderState = { open: false }` → `r5VisibleTiers(founderState, "free")` returns the closed-window tier set (#781 logic; on desktop the grid column count follows `tiers.length`) |
| Takeover · dismissed                  | X button or "Keep browsing on Free →"                                                                                                                                      | Takeover closes, user stays on Free; never re-fires (single-fire, README locked decisions)                                                                                                                |
| Picker accordion · row toggle         | Tap a `TierRowMobile`                                                                                                                                                      | `open` set to that tier's key (only one expanded); tapping the already-open row sets `open = null` (all collapsed)                                                                                        |
| Banner · pinned mobile                | `<DayThirteenBanner variant="mobile" inline={false}/>` (default); one-time, day 13 of trial                                                                                | Full-bleed square strip above the app bar; bg `signal 16% / bg-elevated`; bottom border only                                                                                                              |
| Banner · pinned desktop               | `variant="desktop" inline={false}`                                                                                                                                         | Same strip, padding `10px 20px`, gap 14, 18px icon, larger type                                                                                                                                           |
| Banner · inline mobile                | `variant="mobile" inline={true}`                                                                                                                                           | Rounded (12) inset card under the app bar in content flow; bg `signal 10% / surface-1`; full 1px border                                                                                                   |
| Banner · inline desktop               | `variant="desktop" inline={true}`                                                                                                                                          | Same card, padding `11px 16px`, gap 14                                                                                                                                                                    |
| Banner · CTA                          | "Go Premium" tapped                                                                                                                                                        | Routes to upgrade (CTA targets are #781/#775's per README dev notes)                                                                                                                                      |
| Banner · dismissed                    | X tapped; persisted via `day_thirteen_banner_dismissed_at` (eng, #775)                                                                                                     | Banner removed; one-time — no re-fire on ends-today (Plan-card emphasis only, README locked decisions)                                                                                                    |

---

## Ambiguities / notes for implementers

1. **"Founder post-claim takeover" (named in PR 4.2 scope) does not exist as a distinct component** in `lifecycle-takeover.jsx`. The only founder variation is the `founderKind` prop → `getFounderState()` → the locked #781 picker. Takeover headline/subhead/eyebrow copy is identical across all `founderKind` values. If a post-claim ("you claimed Founder") takeover variant is expected, it is not in this design file — flag at plan review.
2. **Which tiers render (and desktop grid column count) is owned by `r5VisibleTiers` in `monetization-tier-states.jsx` (#781, locked, not read for this table).** Verify column count against the #781 source at implementation.
3. **No hover/focus/active/transition styles anywhere** in the takeover or banner. Interactive-state styling is unspecified by design.
4. **Banner `margin` ternary is degenerate** — `inline ? (wide ? "0" : "0") : 0` — always 0.
5. **Banner inline `borderBottom` re-declares the same value as `border`** (`signal 32% / border`); pinned uses a different bottom mix (`signal 30% / border-strong`). Preserve declaration order/effect.
6. Buttons use `all: "unset"` resets — replicate the reset (or equivalent) so UA button styles don't leak.
7. Mobile takeover X `top: 56` presumes the iOS status-bar frame from the canvas; confirm against real app-bar offset at integration.

---

# Design Property Table — #781 R5 FounderClaimTakeover (PR 4.2)

Source: `design/design_handoff_monetization_tier_states/monetization-founder-gifted.jsx` (§3.3), atoms from `monetization-shared.jsx`. Props: `variant = "mobile" | "desktop"` (`wide = variant === "desktop"`), `seatNumber = 37`, `total = 100`. Full-bleed surface (fills its frame — NOT a sheet/modal over a dimmed page). No confetti (brief §3.3). `SeatMeter` is exported from the same file but is NOT used by this component.

## Component: FounderClaimTakeover

### Root surface (outer container)

| Property        | Mobile                                                                                                   | Desktop  |
| --------------- | -------------------------------------------------------------------------------------------------------- | -------- |
| width           | `100%`                                                                                                   | `100%`   |
| height          | `100%`                                                                                                   | `100%`   |
| background      | `radial-gradient(circle at 50% 0%, color-mix(in oklch, var(--accent) 12%, var(--bg)) 0%, var(--bg) 55%)` | same     |
| color           | `var(--fg)`                                                                                              | same     |
| display         | `flex`                                                                                                   | `flex`   |
| align-items     | `center`                                                                                                 | `center` |
| justify-content | `center`                                                                                                 | `center` |
| padding         | `70px 20px 28px`                                                                                         | `40px`   |
| overflow        | `auto`                                                                                                   | `auto`   |

### Body column

| Property       | Mobile             | Desktop  |
| -------------- | ------------------ | -------- |
| width          | `100%`             | `100%`   |
| max-width      | `100%`             | `520px`  |
| display        | `flex`             | `flex`   |
| flex-direction | `column`           | `column` |
| align-items    | `center`           | `center` |
| text-align     | `center`           | `center` |
| gap            | `18px`             | `22px`   |
| font-family    | `Inter, system-ui` | same     |
| color          | `var(--fg)`        | same     |

### RailHeader wrapper

| Property  | Mobile  | Desktop |
| --------- | ------- | ------- |
| width     | `100%`  | `100%`  |
| max-width | `360px` | `360px` |

### RailHeader (shared atom, `tone="signal"` → tone color `var(--signal)`)

Row container:

| Property    | Mobile   | Desktop  |
| ----------- | -------- | -------- |
| display     | `flex`   | `flex`   |
| align-items | `center` | `center` |
| gap         | `10px`   | `10px`   |
| width       | `100%`   | `100%`   |

Dot (span):

| Property      | Mobile                  | Desktop |
| ------------- | ----------------------- | ------- |
| width         | `6px`                   | `6px`   |
| height        | `6px`                   | `6px`   |
| border-radius | `6px`                   | `6px`   |
| background    | `var(--signal)`         | same    |
| flex-shrink   | `0`                     | `0`     |
| box-shadow    | `0 0 8px var(--signal)` | same    |

Eyebrow (MonoEyebrow, `color=var(--signal)` `letterSpacing="0.16em"`, defaults size 10 / weight 700):

| Property       | Mobile                        | Desktop     |
| -------------- | ----------------------------- | ----------- |
| font-family    | `'JetBrains Mono', monospace` | same        |
| font-size      | `10px`                        | `10px`      |
| font-weight    | `700`                         | `700`       |
| text-transform | `uppercase`                   | `uppercase` |
| letter-spacing | `0.16em`                      | `0.16em`    |
| color          | `var(--signal)`               | same        |

Hairline (div):

| Property   | Mobile          | Desktop |
| ---------- | --------------- | ------- |
| flex       | `1`             | `1`     |
| height     | `1px`           | `1px`   |
| background | `var(--border)` | same    |

Code (MonoEyebrow, all defaults, `letterSpacing="0.14em"`) — renders `` `${seatNumber}/${total}` `` (e.g. `37/100`):

| Property       | Mobile                        | Desktop     |
| -------------- | ----------------------------- | ----------- |
| font-family    | `'JetBrains Mono', monospace` | same        |
| font-size      | `10px`                        | `10px`      |
| font-weight    | `700`                         | `700`       |
| text-transform | `uppercase`                   | `uppercase` |
| letter-spacing | `0.14em`                      | `0.14em`    |
| color          | `var(--fg-subtle)`            | same        |

### Mark container ("Mark with halo")

| Property        | Mobile     | Desktop    |
| --------------- | ---------- | ---------- |
| position        | `relative` | `relative` |
| width           | `72px`     | `72px`     |
| height          | `72px`     | `72px`     |
| display         | `flex`     | `flex`     |
| align-items     | `center`   | `center`   |
| justify-content | `center`   | `center`   |

### Halo (absolute div inside mark container)

| Property      | Mobile                                                                                          | Desktop    |
| ------------- | ----------------------------------------------------------------------------------------------- | ---------- |
| position      | `absolute`                                                                                      | `absolute` |
| inset         | `-14px`                                                                                         | `-14px`    |
| border-radius | `30px`                                                                                          | `30px`     |
| background    | `radial-gradient(circle, color-mix(in oklch, var(--accent) 45%, transparent), transparent 72%)` | same       |

### MMark (shared atom, `size={72}`)

SVG: `width=72 height=72 viewBox="0 0 96 96" aria-hidden="true"`. Contents (identical mobile/desktop):

| Element               | Values                                                                                                                                                                 |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `<rect>`              | `width=96 height=96 fill=var(--bg) rx=16`                                                                                                                              |
| `<circle>` outer glow | `cx=72 cy=24 r=20 fill=var(--accent) opacity=0.22`                                                                                                                     |
| `<circle>` mid glow   | `cx=72 cy=24 r=12 fill=var(--accent) opacity=0.42`                                                                                                                     |
| `<circle>` core       | `cx=72 cy=24 r=7 fill=var(--signal)`                                                                                                                                   |
| Trail circles ×7      | `fill=var(--signal)`, `opacity = 0.35 + idx * 0.09` (idx 0–6 → 0.35…0.89); points (cx,cy,r): (14,76,1.5) (24,70,2) (34,64,2.5) (42,58,3) (50,50,4) (58,42,5) (66,32,6) |

### Seat number reveal — column wrapper

| Property       | Mobile   | Desktop  |
| -------------- | -------- | -------- |
| display        | `flex`   | `flex`   |
| flex-direction | `column` | `column` |
| align-items    | `center` | `center` |
| gap            | `2px`    | `2px`    |

### "Your seat" label (MonoEyebrow `size={11}` `color=var(--fg-muted)` `letterSpacing="0.22em"`)

| Property       | Mobile                        | Desktop     |
| -------------- | ----------------------------- | ----------- |
| font-family    | `'JetBrains Mono', monospace` | same        |
| font-size      | `11px`                        | `11px`      |
| font-weight    | `700`                         | `700`       |
| text-transform | `uppercase`                   | `uppercase` |
| letter-spacing | `0.22em`                      | `0.22em`    |
| color          | `var(--fg-muted)`             | same        |

### Seat number row

| Property    | Mobile     | Desktop    |
| ----------- | ---------- | ---------- |
| display     | `flex`     | `flex`     |
| align-items | `baseline` | `baseline` |
| gap         | `8px`      | `8px`      |

### Seat number (span, renders `#{seatNumber}` e.g. `#37`)

| Property       | Mobile                                                         | Desktop   |
| -------------- | -------------------------------------------------------------- | --------- |
| font-weight    | `900`                                                          | `900`     |
| font-size      | `80px`                                                         | `104px`   |
| letter-spacing | `-0.05em`                                                      | `-0.05em` |
| line-height    | `0.9`                                                          | `0.9`     |
| color          | `var(--accent)`                                                | same      |
| text-shadow    | `0 0 40px color-mix(in oklch, var(--accent) 35%, transparent)` | same      |

### "of {total}" (span, renders `of 100`)

| Property       | Mobile            | Desktop   |
| -------------- | ----------------- | --------- |
| font-weight    | `700`             | `700`     |
| font-size      | `20px`            | `24px`    |
| color          | `var(--fg-muted)` | same      |
| letter-spacing | `-0.02em`         | `-0.02em` |

### Headline block (column wrapper)

| Property       | Mobile   | Desktop  |
| -------------- | -------- | -------- |
| display        | `flex`   | `flex`   |
| flex-direction | `column` | `column` |
| gap            | `10px`   | `10px`   |
| align-items    | `center` | `center` |

### Headline ("Founder. Locked in.")

| Property       | Mobile    | Desktop   |
| -------------- | --------- | --------- |
| font-weight    | `900`     | `900`     |
| font-size      | `34px`    | `44px`    |
| letter-spacing | `-0.04em` | `-0.04em` |
| line-height    | `1.0`     | `1.0`     |

### Body copy

| Property       | Mobile            | Desktop    |
| -------------- | ----------------- | ---------- |
| font-weight    | `500`             | `500`      |
| font-size      | `14px`            | `15.5px`   |
| color          | `var(--fg-muted)` | same       |
| letter-spacing | `-0.005em`        | `-0.005em` |
| line-height    | `1.5`             | `1.5`      |
| max-width      | `420px`           | `420px`    |

### Stamp + badge row

| Property        | Mobile   | Desktop  |
| --------------- | -------- | -------- |
| display         | `flex`   | `flex`   |
| align-items     | `center` | `center` |
| gap             | `10px`   | `10px`   |
| flex-wrap       | `wrap`   | `wrap`   |
| justify-content | `center` | `center` |

### Price stamp pill

| Property      | Mobile                                                                                                                                        | Desktop       |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| display       | `inline-flex`                                                                                                                                 | `inline-flex` |
| align-items   | `center`                                                                                                                                      | `center`      |
| gap           | `8px`                                                                                                                                         | `8px`         |
| padding       | `9px 14px`                                                                                                                                    | `9px 14px`    |
| border-radius | `999px`                                                                                                                                       | `999px`       |
| background    | `linear-gradient(135deg, color-mix(in oklch, var(--accent) 16%, var(--surface-1)), color-mix(in oklch, var(--signal) 14%, var(--surface-1)))` | same          |
| border        | `1px solid color-mix(in oklch, var(--signal) 45%, var(--border-strong))`                                                                      | same          |

### Price stamp — "$3" (outer span)

| Property       | Mobile      | Desktop   |
| -------------- | ----------- | --------- |
| font-weight    | `900`       | `900`     |
| font-size      | `18px`      | `18px`    |
| letter-spacing | `-0.03em`   | `-0.03em` |
| color          | `var(--fg)` | same      |

### Price stamp — "/mo" (nested span inside "$3" span)

| Property    | Mobile            | Desktop |
| ----------- | ----------------- | ------- |
| font-size   | `12px`            | `12px`  |
| font-weight | `700`             | `700`   |
| color       | `var(--fg-muted)` | same    |

### Price stamp — vertical divider (span)

| Property   | Mobile                 | Desktop |
| ---------- | ---------------------- | ------- |
| width      | `1px`                  | `1px`   |
| height     | `16px`                 | `16px`  |
| background | `var(--border-strong)` | same    |

### Price stamp — "Locked forever" (MonoEyebrow `size={9.5}` `color=var(--accent)` `letterSpacing="0.16em"`)

| Property       | Mobile                        | Desktop     |
| -------------- | ----------------------------- | ----------- |
| font-family    | `'JetBrains Mono', monospace` | same        |
| font-size      | `9.5px`                       | `9.5px`     |
| font-weight    | `700`                         | `700`       |
| text-transform | `uppercase`                   | `uppercase` |
| letter-spacing | `0.16em`                      | `0.16em`    |
| color          | `var(--accent)`               | same        |

### TierBadge (shared atom, `tier="founder"` `size="lg"`)

Container (span):

| Property       | Mobile                                                                                                                              | Desktop       |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| display        | `inline-flex`                                                                                                                       | `inline-flex` |
| align-items    | `center`                                                                                                                            | `center`      |
| gap            | `6px`                                                                                                                               | `6px`         |
| padding        | `5px 11px`                                                                                                                          | `5px 11px`    |
| border-radius  | `6px`                                                                                                                               | `6px`         |
| background     | `linear-gradient(135deg, color-mix(in oklch, var(--accent) 18%, transparent), color-mix(in oklch, var(--signal) 18%, transparent))` | same          |
| border         | `1px solid color-mix(in oklch, var(--signal) 50%, transparent)`                                                                     | same          |
| color          | `var(--fg)`                                                                                                                         | same          |
| font-family    | `'JetBrains Mono', monospace`                                                                                                       | same          |
| font-weight    | `800`                                                                                                                               | `800`         |
| font-size      | `11px`                                                                                                                              | `11px`        |
| letter-spacing | `0.12em`                                                                                                                            | `0.12em`      |
| text-transform | `uppercase`                                                                                                                         | `uppercase`   |
| white-space    | `nowrap`                                                                                                                            | `nowrap`      |
| line-height    | `1`                                                                                                                                 | `1`           |

Founder glyph (SVG, lg → glyph size 10):

| Property        | Value (both)                           |
| --------------- | -------------------------------------- |
| width / height  | `10` / `10`                            |
| viewBox         | `0 0 10 10`                            |
| path d          | `M1 7 L1 3 L3 5 L5 1 L7 5 L9 3 L9 7 Z` |
| fill            | `var(--signal)`                        |
| stroke          | `var(--accent)`                        |
| stroke-width    | `0.7`                                  |
| stroke-linejoin | `round`                                |

Label text: `Founder` (inner span; rendered uppercase via container transform).

### CTA button ("Take me in.")

| Property        | Mobile                                                                                          | Desktop         |
| --------------- | ----------------------------------------------------------------------------------------------- | --------------- |
| all             | `unset` (reset)                                                                                 | `unset` (reset) |
| cursor          | `pointer`                                                                                       | `pointer`       |
| text-align      | `center`                                                                                        | `center`        |
| width           | `100%`                                                                                          | `320px`         |
| max-width       | `360px`                                                                                         | `360px`         |
| padding         | `15px 16px`                                                                                     | `15px 16px`     |
| border-radius   | `12px`                                                                                          | `12px`          |
| background      | `linear-gradient(135deg, var(--signal), color-mix(in oklch, var(--accent) 60%, var(--signal)))` | same            |
| color           | `var(--fg-on-accent)`                                                                           | same            |
| font-family     | `Inter, system-ui`                                                                              | same            |
| font-weight     | `800`                                                                                           | `800`           |
| font-size       | `15.5px`                                                                                        | `15.5px`        |
| box-shadow      | `0 0 26px color-mix(in oklch, var(--accent) 35%, transparent)`                                  | same            |
| display         | `flex`                                                                                          | `flex`          |
| align-items     | `center`                                                                                        | `center`        |
| justify-content | `center`                                                                                        | `center`        |
| gap             | `8px`                                                                                           | `8px`           |

#### CTA button — hover state

— (none specified in source; no hover/focus/active styles anywhere in this component)

### CTA chevron (SVG inside button)

| Property        | Value (both)            |
| --------------- | ----------------------- |
| width / height  | `15` / `15`             |
| viewBox         | `0 0 12 12`             |
| path d          | `M4.5 2 L8.5 6 L4.5 10` |
| fill            | `none`                  |
| stroke          | `currentColor`          |
| stroke-width    | `1.8`                   |
| stroke-linecap  | `round`                 |
| stroke-linejoin | `round`                 |

### Footer routing hint (MonoEyebrow `size={9}` `color=var(--fg-subtle)` `letterSpacing="0.16em"`)

| Property       | Mobile                        | Desktop     |
| -------------- | ----------------------------- | ----------- |
| font-family    | `'JetBrains Mono', monospace` | same        |
| font-size      | `9px`                         | `9px`       |
| font-weight    | `700`                         | `700`       |
| text-transform | `uppercase`                   | `uppercase` |
| letter-spacing | `0.16em`                      | `0.16em`    |
| color          | `var(--fg-subtle)`            | same        |

## Copy strings

All MonoEyebrow strings render uppercase via `text-transform: uppercase`; source casing shown.

| Element             | Exact string                                                                                                    |
| ------------------- | --------------------------------------------------------------------------------------------------------------- |
| RailHeader eyebrow  | `Founder · claimed`                                                                                             |
| RailHeader code     | `` `${seatNumber}/${total}` `` → `37/100` (defaults)                                                            |
| Seat label          | `Your seat`                                                                                                     |
| Seat number         | `` `#${seatNumber}` `` → `#37` (defaults)                                                                       |
| Seat total          | `` `of ${total}` `` → `of 100` (defaults)                                                                       |
| Headline            | `Founder. Locked in.`                                                                                           |
| Body copy           | `You got in before the rest. $3 a month for as long as you're here — even when everyone else is paying double.` |
| Price stamp         | `$3` + nested `/mo`                                                                                             |
| Price stamp eyebrow | `Locked forever`                                                                                                |
| Tier badge label    | `Founder`                                                                                                       |
| CTA                 | `Take me in.` (trailing period; chevron SVG follows)                                                            |
| Footer hint         | `Routing you to Settings · Plan`                                                                                |

## State Coverage

| State            | Triggering condition         | Rendered                                                                                                                                                     |
| ---------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Mobile (default) | `variant="mobile"` (default) | Root padding `70px 20px 28px`; body max-width `100%`, gap 18; seat number 80px; "of {total}" 20px; headline 34px; body copy 14px; CTA width `100%` (max 360) |
| Desktop          | `variant="desktop"`          | Root padding `40px`; body max-width 520, gap 22; seat number 104px; "of {total}" 24px; headline 44px; body copy 15.5px; CTA width 320                        |
| Seat number prop | `seatNumber` (default `37`)  | Interpolated into RailHeader code (`37/100`) and giant reveal (`#37`); no zero-padding logic in the component                                                |
| Total prop       | `total` (default `100`)      | Interpolated into RailHeader code and `of {total}`                                                                                                           |
| Post-CTA routing | "Take me in." tapped         | → Settings · Plan (README locked decision; footer hint states the destination; routing owned by eng)                                                         |

## Ambiguities / notes for implementers

1. **`#03` zero-padding** — README ("Post-claim seat rendering") says two seat numbers were shown "(#37, #03) to prove the format scales", but the component renders `#{seatNumber}` verbatim with numeric default `37`. `seatNumber = 3` would render `#3`, not `#03`. Zero-padding to 2 digits (matching the canvas's `#03`) must be handled by the caller/eng — decide and lock the format (recommend padding to match the canvas).
2. **No hover/focus/active/transition/animation styles anywhere** in this component or its atoms. No confetti, no entrance animation (brief §3.3 explicitly: no confetti). Interactive-state styling unspecified by design.
3. **Full-bleed surface** — fills the frame (phone screen / desktop content area), not a sheet/modal with scrim. Mobile top padding `70px` presumes the canvas iOS status-bar frame; confirm against real app-bar offset at integration.
4. **CTA uses `all: "unset"`** — replicate the reset (or equivalent) so UA button styles don't leak.
5. **`SeatMeter` is not used** by `FounderClaimTakeover` (only by `FounderRaceLoser`, out of scope for PR 4.2).
6. **RailHeader code has no `#` prefix** (`37/100`), while the giant reveal does (`#37`) — intentional per source.
