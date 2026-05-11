# Theme Picker — Engineering Handoff

Status: **approved** · Variation B for Settings, A's hero strip for onboarding.
Date: 2026-05-10
Source of truth: `theme-picker.jsx` (showcase) → patterns to lift into existing files.

This package is downstream of `design_handoff_genre_themes/`. That one ships the
theme data; this one ships the picker UI changes needed to accommodate 9 themes.

## What's shipping

A unified picker pattern across **three surfaces**, all built from one `ThemeSwatch` component:

| Surface                    | Pattern                                               | Lives in                                     |
| -------------------------- | ----------------------------------------------------- | -------------------------------------------- |
| Settings → Appearance      | Variation B — pure 3×3 grid, restrained active state  | `profile-settings-screens.jsx`               |
| User menu                  | Collapsed row → opens 3-col popover                   | `app-bar.jsx` / wherever the user menu lives |
| Floating ThemeSwitcher     | Pill trigger → opens 3-col popover                    | `theme-context.jsx`                          |
| Onboarding "make it yours" | Variation A — "currently using" hero strip (one-time) | `design_handoff_onboarding/`                 |

## Integration steps

### 1. `profile-settings-screens.jsx` — `ThemePickerInline`

- Keep the existing `ThemeSwatch` component; absorb the small additions from `theme-picker.jsx`:
  - Add `MiniMark` to the dots row (uses `--accent-2` with fallback)
  - Add role pill in the swatch footer (`base` mode label or genre name)
- Replace the wrapping grid:
  ```jsx
  // before
  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))", gap: 8 }}>
  // after
  <div className="cc-theme-grid">{/* 3-col grid desktop, scroll-snap row on mobile */}</div>
  ```
- Drop `futureSlots` prop — all 9 slots are filled.
- Header row: show the active theme label as a small pill (Variation B treatment).

### 2. `theme-context.jsx` — `ThemeSwitcher`

- Replace the current horizontal flex row of buttons with:
  - A pill trigger (`MiniMark + label + chevron`)
  - On click: a popover positioned `top: calc(100% + 6px)` with a 3-col grid of `ThemeSwatch` components
- Reuse the exact same `ThemeSwatch` as the Settings picker.

### 3. User menu (wherever it lives)

- Replace the inline 3-swatch row next to "Theme" with a trigger row:
  ```jsx
  <MenuRow onClick={openPopover}>
    <span>Theme</span>
    <Right>
      <MiniMark t={activeTheme.t} size={18} />
      <span>{activeTheme.label}</span>
      <Chevron />
    </Right>
  </MenuRow>
  ```
- Popover uses the same 3-col grid of `ThemeSwatch`.

### 4. Onboarding "make it yours" step

- After the user picks a theme, render the **Variation A hero strip** as a one-time confirmation card before continuing. (See showcase for exact treatment.)
- This is the only place the hero strip appears — Settings does not use it.

## Mobile layout

The 3-col grid stays on tablet+. On `max-width: 480px`:

- Settings picker grid → horizontal scroll-snap row, 160px fixed swatch width.
- Popovers (user menu, floating switcher) → bottom sheet style, 3-col grid retained, scrollable height-capped.

## Open questions for next session

- The popover currently positions `right: 0` — needs viewport-edge collision handling on small screens.
- Should the floating switcher show on production builds, or stay dev-only? Currently only on workshop pages.

## Files

- `Theme Picker.html` — the showcase
- `theme-picker.jsx` — full source of all variations, swatches, popovers, mobile
- `README.md` — this file
