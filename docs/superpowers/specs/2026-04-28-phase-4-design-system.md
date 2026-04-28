# Phase 4 Design System — Spec

**Date:** 2026-04-28  
**Status:** Approved — ready for implementation planning  
**Reference:** `design/design_handoff_brand_and_theming/README.md`

---

## Overview

Phase 4 wires in the Concert Crawl brand and token system before any consumer UI is built. It covers: a three-theme CSS variable token system (Electric, Jade, Light), font migration (Geist → Inter + JetBrains Mono), shadcn full-replace (strip shadcn token names, update components to reference new tokens), and an admin-only theme switcher at `/admin/settings`. No consumer-facing UI ships in this phase.

---

## 1. Architecture & File Layout

New module at `apps/web/src/theme/`:

```
apps/web/src/theme/
  themes.ts          ← THEMES object (source of truth), ThemeName type
  apply-theme.ts     ← pure DOM function: writes CSS vars + data-theme to <html>
  ThemeProvider.tsx  ← 'use client'; reads data-theme on mount, exposes useTheme()
  index.ts           ← re-exports
```

**Theme application flow:**

1. `layout.tsx` (Server Component) serializes `THEMES` from `themes.ts` into an inline blocking `<script>` injected in `<head>`.
2. The script runs before paint: reads `localStorage['cc-theme']`, falls back to `prefers-color-scheme`, calls `applyTheme` (inline-inlined logic, not a module import).
3. React hydrates; `ThemeProvider` mounts client-side and reads the already-applied `data-theme` attribute from `<html>` — no second `applyTheme` call, no FOUC.
4. `useTheme()` exposes `{ theme, setTheme }`. `setTheme` calls `applyTheme` + writes to `localStorage`.

**Zero-FOUC guarantee:** the blocking script runs synchronously before the browser paints. `ThemeProvider` never re-applies on mount — it only reads the already-applied state.

---

## 2. Token System

Single source of truth: `themes.ts` exports `THEMES` and `ThemeName`.

```ts
export type ThemeName = 'electric' | 'jade' | 'light'
export const THEMES: Record<ThemeName, Record<string, string>> = {
  electric,
  jade,
  light,
}
```

**Token groups and names:**

| Group        | Tokens                                                           |
| ------------ | ---------------------------------------------------------------- |
| Surfaces     | `bg`, `bg-elevated`, `surface-1`, `surface-2`, `surface-3`       |
| Text & icons | `fg`, `fg-muted`, `fg-subtle`, `fg-on-accent`                    |
| Borders      | `border`, `border-strong`, `border-focus`                        |
| Brand        | `signal`, `signal-muted`, `accent`, `accent-muted`               |
| States       | `success`, `warning`, `danger`                                   |
| Misc         | `focus`, `overlay-hover`, `overlay-press`, `scrim`, `image-tint` |

**Token values:** see `design/design_handoff_brand_and_theming/README.md` §2 — that file is the authoritative hex source. Do not duplicate values here.

**`apply-theme.ts`:**

```ts
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

**`globals.css`:** Write Electric tokens to `:root` as a SSR/no-JS fallback. Strip all shadcn token names (`--background`, `--primary`, `--card`, `--muted`, `--ring`, etc.) entirely — no bridge layer.

**Component authoring rule:** always `var(--token)`, never hex values.

---

## 3. ThemeProvider + Inline Script

**`ThemeProvider.tsx`** (`'use client'`):

- On mount: reads `data-theme` from `document.documentElement` (already set by inline script). Does not call `applyTheme` again.
- Exposes `useTheme(): { theme: ThemeName, setTheme: (t: ThemeName) => void }` via React context.
- `setTheme` calls `applyTheme(t)` and writes to `localStorage['cc-theme']`.

**`layout.tsx` inline script** (Server Component, injected into `<head>`):

```ts
import { THEMES } from '@/theme/themes'

const themeScript = `
  (function() {
    var stored = localStorage.getItem('cc-theme');
    var system = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'electric' : 'light';
    var theme = (stored === 'electric' || stored === 'jade' || stored === 'light') ? stored : system;
    var themes = ${JSON.stringify(THEMES)};
    var tokens = themes[theme];
    var root = document.documentElement;
    Object.keys(tokens).forEach(function(k) { root.style.setProperty('--' + k, tokens[k]); });
    root.setAttribute('data-theme', theme);
  })();
`
// Inject as: <script dangerouslySetInnerHTML={{ __html: themeScript }} />
```

`THEMES` is imported at build time (Server Component) and serialized to JSON — single source of truth, no duplication.

**System detection:** `prefers-color-scheme: dark` → Electric, light → Light. Jade is only reachable via explicit user selection. This is wired up in Phase 4.

**HMR:** Changing `themes.ts` triggers a full page reload (layout.tsx is a Server Component). Tokens update without restarting the dev server.

---

## 4. Admin Settings UI

**Route:** `/admin/settings` — general admin settings page, scrollable sections (not tabs).

**Access control:** `requireRole('admin')` guard at the page level (Server Component).

**Layout pattern:**

- `apps/web/src/app/admin/settings/page.tsx` — Server Component, role guard, renders `SettingsLayout` sections.
- `apps/web/src/components/admin/settings/SettingsLayout.tsx` — section wrapper: heading + content slot.
- `apps/web/src/components/admin/settings/AppearanceSection.tsx` — first section; contains `ThemePicker`.
- `apps/web/src/components/admin/ThemePicker.tsx` — `'use client'`; three selectable cards.

**`ThemePicker`:**

- Three cards: Electric, Jade, Light.
- Each card: theme name + swatch row (three dots: `--bg`, `--signal`, `--accent`) + selected ring using `--border-focus`.
- Clicking a card calls `setTheme()` from `useTheme()` — instant live preview, no page reload.
- Persists to `localStorage['cc-theme']`.

**Scope:** Admin-only in Phase 4. User-facing appearance settings ship later with their own design treatment (not a copy of this page).

**Extensibility:** The `SettingsLayout` section pattern establishes a reusable structure for future admin settings (rate limits, crawl config, etc.) with role-based section filtering.

---

## 5. Font Migration

**Remove:** `next/font/local` Geist imports from `layout.tsx`.

**Add** via `next/font/google`:

```ts
import { Inter, JetBrains_Mono } from 'next/font/google'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-ui',
  weight: ['400', '500', '600', '700', '800', '900'],
})

const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['400', '500', '600'],
})

// layout.tsx <html> className: `${inter.variable} ${mono.variable}`
```

**`tailwind.config.ts`:** Map `fontFamily.sans` → `var(--font-ui)` and `fontFamily.mono` → `var(--font-mono)`.

**`globals.css`:** Remove Geist `@font-face` rules (if any). Add:

```css
body {
  font-family: var(--font-ui);
}
code,
pre {
  font-family: var(--font-mono);
}
```

**Caveat font (Handwriting):** Design-tool annotations only — NOT in the product. Do not install.

---

## 6. shadcn Component Updates (Full-Replace)

**Installed components:** badge, button, card, input, label, table (6 files in `apps/web/src/components/ui/`).

**Step 1 — extend `tailwind.config.ts`** with named color aliases for all tokens so component files use readable class names:

```ts
colors: {
  bg: 'var(--bg)',
  'bg-elevated': 'var(--bg-elevated)',
  'surface-1': 'var(--surface-1)',
  'surface-2': 'var(--surface-2)',
  'surface-3': 'var(--surface-3)',
  fg: 'var(--fg)',
  'fg-muted': 'var(--fg-muted)',
  'fg-subtle': 'var(--fg-subtle)',
  'fg-on-accent': 'var(--fg-on-accent)',
  border: 'var(--border)',          // NOTE: overrides Tailwind's default border color alias
  'border-strong': 'var(--border-strong)',
  'border-focus': 'var(--border-focus)',
  accent: 'var(--accent)',
  'accent-muted': 'var(--accent-muted)',
  signal: 'var(--signal)',
  'signal-muted': 'var(--signal-muted)',
  success: 'var(--success)',
  warning: 'var(--warning)',
  danger: 'var(--danger)',
}
```

**Step 2 — update the 6 component files** using this mapping:

| shadcn class                     | → new class                                               | reason                                               |
| -------------------------------- | --------------------------------------------------------- | ---------------------------------------------------- |
| `bg-primary`                     | `bg-accent`                                               | "primary action" = brand accent                      |
| `text-primary-foreground`        | `text-fg-on-accent`                                       | text on filled accent                                |
| `bg-secondary`                   | `bg-surface-2`                                            | secondary surface                                    |
| `text-secondary-foreground`      | `text-fg`                                                 | body text                                            |
| `bg-muted` / `bg-muted/50`       | `bg-surface-1`                                            | surface-1 is the subtle level; drop opacity modifier |
| `text-muted-foreground`          | `text-fg-muted`                                           | de-emphasized text                                   |
| `hover:bg-muted`                 | `hover:bg-surface-1`                                      |                                                      |
| `bg-card`                        | `bg-bg-elevated`                                          | card background                                      |
| `text-card-foreground`           | `text-fg`                                                 | card body text                                       |
| `bg-background`                  | `bg-bg`                                                   | page background                                      |
| `text-foreground`                | `text-fg`                                                 |                                                      |
| `border-border` / `border-input` | `border-border`                                           | same semantic, new source                            |
| `ring-ring`                      | `ring-border-focus`                                       | focus ring                                           |
| `focus-visible:ring-ring/50`     | `focus-visible:ring-border-focus`                         | drop opacity modifier                                |
| `text-destructive`               | `text-danger`                                             | error text                                           |
| `bg-destructive`                 | `bg-danger`                                               | error fill                                           |
| `border-destructive`             | `border-danger`                                           | error border                                         |
| `bg-destructive/10`              | `bg-[color-mix(in_srgb,var(--danger)_15%,transparent)]`   | ~3 instances; inline color-mix                       |
| `ring-destructive/20`            | `ring-[color-mix(in_srgb,var(--danger)_20%,transparent)]` | inline color-mix                                     |
| `dark:*`                         | **remove**                                                | token system handles themes via CSS vars             |

**Opacity modifier note:** Our tokens are hex strings — Tailwind `/50` opacity modifiers don't work on them (requires HSL channel vars). The ~5 opacity-modifier usages in the 6 components are handled explicitly per the mapping above. No HSL conversion needed.

**`dark:` removal:** All `dark:` variants are removed from the 6 component files. They fire on `prefers-color-scheme: dark`, which conflicts with our `data-theme` system. The CSS vars encode the correct value per theme.

**`--radius-md`:** Retained — it's a layout/spacing token, not a color. No conflict.

---

## Out of Scope (Phase 4)

- Consumer-facing appearance toggle (ships in a later phase with its own design)
- Clerk-synced theme persistence (deferred until auth is wired)
- Chart / data-viz token series (`--chart-1..n`) — deferred until first data screen
- High-contrast a11y theme — deferred post-launch
- Email template theming — light theme + inline styles only when needed

---

## Files Touched

| File                                                           | Change                                               |
| -------------------------------------------------------------- | ---------------------------------------------------- |
| `apps/web/src/theme/themes.ts`                                 | Create — THEMES, ThemeName                           |
| `apps/web/src/theme/apply-theme.ts`                            | Create — pure applyTheme fn                          |
| `apps/web/src/theme/ThemeProvider.tsx`                         | Create — client context + useTheme                   |
| `apps/web/src/theme/index.ts`                                  | Create — re-exports                                  |
| `apps/web/src/app/layout.tsx`                                  | Modify — fonts, inline script, ThemeProvider         |
| `apps/web/src/styles/globals.css`                              | Modify — Electric fallback tokens, strip shadcn vars |
| `apps/web/tailwind.config.ts`                                  | Modify — token color aliases, font family            |
| `apps/web/src/components/ui/badge.tsx`                         | Modify — token class names                           |
| `apps/web/src/components/ui/button.tsx`                        | Modify — token class names                           |
| `apps/web/src/components/ui/card.tsx`                          | Modify — token class names                           |
| `apps/web/src/components/ui/input.tsx`                         | Modify — token class names                           |
| `apps/web/src/components/ui/label.tsx`                         | Modify — token class names                           |
| `apps/web/src/components/ui/table.tsx`                         | Modify — token class names                           |
| `apps/web/src/app/admin/settings/page.tsx`                     | Create — settings page, role guard                   |
| `apps/web/src/components/admin/settings/SettingsLayout.tsx`    | Create — section wrapper                             |
| `apps/web/src/components/admin/settings/AppearanceSection.tsx` | Create — appearance section                          |
| `apps/web/src/components/admin/ThemePicker.tsx`                | Create — theme card picker                           |
