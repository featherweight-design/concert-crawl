# Favicon Design — Concert Crawl

**Date:** 2026-05-14
**Issue:** #337

## Problem

The app has no favicon. Browser tabs show a blank icon; Apple touch icons fall back to a screenshot. This is a pre-beta gap.

## Solution

Add two files to `apps/web/src/app/`:

- `icon.svg` — SVG favicon with `prefers-color-scheme` media queries
- `apple-icon.tsx` — Next.js `ImageResponse` RSC generating a 180×180 PNG

Both derive from the existing `MiniMark` geometry. Next.js App Router auto-discovers both from the `app/` directory — no changes to `metadata` are needed.

---

## Design

### Icon geometry

Same as `MiniMark.tsx`:

- **Canvas:** 48×48 viewBox, `rx=10` rounded rect as background
- **Signal ring:** Three concentric circles at `cx=34 cy=14` — `r=9` (accent, 22% opacity), `r=5` (accent-2, 45% opacity), `r=3` (signal, full)
- **Dot trail:** Seven dots at positions `(14,38) (18,34) (22,30) (26,26) (30,22) (34,18) (14,32)`, radius 1.6, opacity 0.45–0.87

### Color tokens

| Token       | Electric (dark)  | Light            |
|-------------|------------------|------------------|
| `surface-2` | `#171D3A`        | `#E8EDF6`        |
| `accent`    | `#FF7BD4`        | `#E0297A`        |
| `signal`    | `#7AE6FF`        | `#0080A0`        |
| `fg`        | `#E8F3FF`        | `#070A1A`        |

### `icon.svg`

A static SVG file. A `<style>` block defines CSS classes (`bg`, `accent`, `signal`, `dot`) with Light theme values as the default, overridden by `@media (prefers-color-scheme: dark)` to Electric values. Each shape element uses the appropriate class.

### `apple-icon.tsx`

A Next.js route segment file:

```ts
export const size = { width: 180, height: 180 }
export const contentType = 'image/png'
```

Default export: async function returning `ImageResponse` with JSX that mirrors the MiniMark geometry scaled to 180×180. Uses Electric theme colors hardcoded (no media query support in canvas-rendered PNGs).

### `layout.tsx` — minor update

Update `themeColor` in the `viewport` export from `#000000` to `#070A1A` (Electric `bg`) for accuracy.

---

## Files changed

| File | Change |
|------|--------|
| `apps/web/src/app/icon.svg` | New |
| `apps/web/src/app/apple-icon.tsx` | New |
| `apps/web/src/app/layout.tsx` | Update `themeColor` |

---

## Out of scope

- `.ico` file (SVG favicon is supported by all modern browsers; legacy browser coverage is not a pre-beta concern)
- Per-theme favicon variants beyond light/dark
- Animated or dynamic favicons
