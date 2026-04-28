# Handoff: Concert Crawl — Brand & Theming Foundations

## Overview

This handoff covers the **design foundations** for Concert Crawl: the logo mark, brand wordmark, and a three-theme token system (Electric, Jade, Light). These are the elements that have **architectural implications** and should be wired into the codebase before product UI work begins.

> **Phase note:** This package informs **Phase 4** of your dev plan. Specifically: the theming/token architecture should be set up alongside (or before) the first user-facing screens are built, because retrofitting theming after the fact is significantly more work than authoring against tokens from day one.

A second handoff package will follow with the browse, calendar, and admin UI screens once those mocks are at hi-fi.

---

## About the Design Files

The HTML files in this bundle are **design references**, not production code to copy directly. They are React + Babel prototypes used to explore and validate the design. Your task is to **recreate the visuals and behavior in the Concert Crawl codebase** using its established patterns (or, if no front-end environment exists yet, to choose an appropriate framework — React + CSS variables is a natural fit for this token system).

The token values, color hex codes, typography choices, and architectural decisions in this README are the source of truth.

---

## Fidelity

- **Logo & wordmark:** Hi-fi. Final mark, final colors, final lockup.
- **Theme tokens:** Hi-fi. Final hex values across three themes, ~35 semantic tokens.
- **Browse view in the prototype:** Mid-fi. Used here only to demonstrate that the token system holds up across themes — **do not use it as a hi-fi reference for the real browse view**. A separate handoff will cover those screens.

---

## 1 · The Logo (Cluster Path)

### Concept

Seven dots traveling along an implied curve toward a focal halo. Reads as: a crawl across nights, a trail of shows, a path ending at a stage.

### Geometry (96×96 SVG viewBox)

```
Trail dots (cyan, growing in size + opacity along the path):
  (14, 76) r=1.5, opacity 0.35
  (24, 70) r=2,   opacity 0.44
  (34, 64) r=2.5, opacity 0.53
  (42, 58) r=3,   opacity 0.62
  (50, 50) r=4,   opacity 0.71
  (58, 42) r=5,   opacity 0.80
  (66, 32) r=6,   opacity 0.89

Focal halo (top-right):
  (72, 24) r=20, fill: accent, opacity 0.22
  (72, 24) r=12, fill: accent, opacity 0.42
  (72, 24) r=7,  fill: signal  (the bright core)
```

### Color application

- **Trail dots:** `--signal` (cyan in Electric/Light, mint in Jade)
- **Halo (outer + middle rings):** `--accent` (pink in Electric/Light, violet in Jade)
- **Halo core:** `--signal`
- **Background (when contained):** `--bg`

### Sizing

The mark is designed to work from **16px to 220px+**. At 16px the trail simplifies visually but still reads as a directional gesture. Below 16px, use the **focal halo only** (single dot) as a favicon-grade simplification.

### Wordmark lockup

```
concert<accent>crawl</accent><accent>.</accent>
```

- "concert" — `--fg`, ui font weight 800, letter-spacing -0.02em
- "crawl." (including trailing period) — `--accent`, same weight & spacing
- The trailing period is **part of the brand**. Do not drop it.

### Typography

- **Display/UI:** Inter (weights 400/500/600/700/800/900)
- **Mono:** JetBrains Mono (weights 400/500/600)
- **Hand (used in workshop docs only, NOT in product UI):** Caveat — only for design-tool annotations, not user-facing copy

---

## 2 · Theme Token System

Three themes, ~35 semantic tokens each. **Author all components against tokens, never against hex values.**

### Architecture

1. **Source of truth:** A single TS module exports a `THEMES` object with three entries: `electric`, `jade`, `light`. Each is a flat `{ tokenName: cssColorString }` map.
2. **Application:** On theme change, write tokens to `:root` as CSS custom properties (`--bg`, `--fg`, etc.) and set `data-theme="electric|jade|light"` on `<html>`. Components reference `var(--token)`.
3. **User control:** `prefers-color-scheme` drives the default (dark systems → Electric, light systems → Light). Settings → Appearance lets users override to any of the three. Persist to localStorage; sync to user profile when auth ships.

### Token contract

| Group            | Tokens                                                           |
| ---------------- | ---------------------------------------------------------------- |
| **Surfaces**     | `bg`, `bg-elevated`, `surface-1`, `surface-2`, `surface-3`       |
| **Text & icons** | `fg`, `fg-muted`, `fg-subtle`, `fg-on-accent`                    |
| **Borders**      | `border`, `border-strong`, `border-focus`                        |
| **Brand**        | `signal`, `signal-muted`, `accent`, `accent-muted`               |
| **States**       | `success`, `warning`, `danger`                                   |
| **Misc**         | `focus`, `overlay-hover`, `overlay-press`, `scrim`, `image-tint` |

### Theme · Electric (signature, dark, default for dark systems)

```
bg              #070A1A
bg-elevated     #0E1226
surface-1       #11162E
surface-2       #171D3A
surface-3       #1F2748
fg              #E8F3FF
fg-muted        #9AA8C7
fg-subtle       #5A6788
fg-on-accent    #070A1A
border          #1F2748
border-strong   #2C3661
border-focus    #7AE6FF
signal          #7AE6FF        ← cyan, the trail color
signal-muted    #3FA3C2
accent          #FF7BD4        ← pink, the halo color
accent-muted    #B8559A
success         #7BFFB0
warning         #FFD27A
danger          #FF7A8A
focus           #7AE6FF
overlay-hover   rgba(122,230,255,0.08)
overlay-press   rgba(122,230,255,0.16)
scrim           rgba(7,10,26,0.72)
image-tint      rgba(7,10,26,0.20)
```

### Theme · Jade (alternate, dark, calmer)

```
bg              #06201F
bg-elevated     #0A2A28
surface-1       #0E3331
surface-2       #143E3B
surface-3       #1A4A47
fg              #E6FFF6
fg-muted        #8FBFB0
fg-subtle       #557A6F
fg-on-accent    #06201F
border          #1A4A47
border-strong   #2A5C57
border-focus    #1FFFC2
signal          #1FFFC2        ← mint
signal-muted    #15B58A
accent          #9B5CFF        ← violet
accent-muted    #6F44B5
success         #1FFFC2
warning         #FFD27A
danger          #FF7A8A
focus           #1FFFC2
overlay-hover   rgba(31,255,194,0.08)
overlay-press   rgba(31,255,194,0.16)
scrim           rgba(6,32,31,0.72)
image-tint      rgba(6,32,31,0.20)
```

### Theme · Light (inverted electric, light, default for light systems)

```
bg              #FAFCFF
bg-elevated     #FFFFFF
surface-1       #F2F5FB
surface-2       #E8EDF6
surface-3       #DCE3F0
fg              #070A1A
fg-muted        #4A5374
fg-subtle       #8A93B0
fg-on-accent    #FFFFFF
border          #DCE3F0
border-strong   #B8C2D6
border-focus    #0080A0
signal          #0080A0        ← cyan, deepened to read on white
signal-muted    #4DABC2
accent          #E0297A        ← pink, deepened to read on white
accent-muted    #B0205F
success         #1F8A4F
warning         #B86E00
danger          #C42940
focus           #0080A0
overlay-hover   rgba(7,10,26,0.04)
overlay-press   rgba(7,10,26,0.08)
scrim           rgba(7,10,26,0.40)
image-tint      transparent     ← light theme leaves photos alone
```

### Imagery rule

- **Dark themes (Electric, Jade):** Apply `background: var(--image-tint)` as an overlay layer on top of photos at ~20% opacity to unify imagery with surrounding chrome.
- **Light theme:** Photos render untouched (`image-tint` is transparent).
- Photos themselves are NEVER duotoned or hue-shifted — band art stays recognizable.

---

## 3 · Implementation Notes

### Suggested file layout

```
src/theme/
  themes.ts          ← THEMES export, types
  ThemeProvider.tsx  ← context, system-pref detection, localStorage sync
  applyTheme.ts      ← writes CSS vars + data-theme to <html>
  index.css          ← :root defaults (Electric tokens) for SSR/no-JS fallback
```

### React example (sketch)

```tsx
import { THEMES, type ThemeName } from './themes'

export function applyTheme(name: ThemeName) {
  const tokens = THEMES[name]
  const root = document.documentElement
  for (const [k, v] of Object.entries(tokens)) {
    root.style.setProperty(`--${k}`, v)
  }
  root.setAttribute('data-theme', name)
}
```

### Component authoring rules

1. **Never reference hex values in component CSS.** Always `var(--token)`.
2. **If you reach for a color that isn't a token, stop and add a token first.** This is how the system stays coherent.
3. **Test every new component in all three themes** before merging. The Tweaks panel in the prototype demonstrates the QA flow.

### Open questions deferred to later handoffs

- **Charts / data viz:** Will need a separate `--chart-1..n` series. Defer until the first data screen lands.
- **High-contrast a11y theme:** A 4th token set for low-vision users. Cheap to add once the system is in place; ship post-launch.
- **Email templates:** Constrained to inline styles + light theme only — do not try to support all three themes in transactional email.

---

## 4 · Files Included

- `Theming Workshop.html` — the full theming prototype (entry point — open this first)
- `Logo Workshop v5.html` — final logo workshop with the Cluster Path across all five v3 palettes (settled on Electric)
- `theming-workshop.jsx` — token definitions and tokenized browse mock (the source of truth for hex values)
- `logo-workshop-5.jsx` — final logo component
- `primitives.jsx` — sketch primitives used by the wireframes (NOT for production — wireframe-only)
- `tweaks-panel.jsx` — design-tool Tweaks panel (NOT for production)

---

## 5 · Next Handoffs (anticipated)

1. **Admin UI** — currently in design. Will ship as `design_handoff_admin_ui/` once hi-fi.
2. **Browse + Calendar** — Phase 4. Will ship as `design_handoff_browse_calendar/`. Includes hi-fi event row, day groups, calendar grid, map view, filters.

---

## Questions?

The Theming Workshop HTML file is the canonical reference. If a token's intent is unclear, open the prototype and inspect how the tokenized browse view consumes it.
