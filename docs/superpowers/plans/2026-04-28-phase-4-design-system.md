# Phase 4 Design System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the Concert Crawl brand and token system into the web app: three-theme CSS variable system (Electric, Jade, Light), font migration (Geist → Inter + JetBrains Mono), full shadcn token replacement, and an admin-only theme switcher at `/admin/settings`.

**Architecture:** A `src/theme/` module owns all token data (`themes.ts`) and DOM manipulation (`apply-theme.ts`). A blocking inline `<script>` in the root `<head>` applies the correct theme before paint (zero-FOUC). `ThemeProvider` hydrates from the already-applied `data-theme` attribute; it never re-applies on mount. All components reference `var(--token)` via Tailwind color aliases, never raw hex.

**Tech Stack:** Next.js 14 App Router, Tailwind CSS v3, CSS custom properties, React context, Vitest (node environment with per-file jsdom override for DOM tests).

---

## Critical Constraint: Atomic Cutover

`globals.css`, `tailwind.config.ts`, and all 8 affected files (badge, button, card, input, table, admin/layout, admin/error, root layout) **must be committed in a single atomic commit**. Any partial state breaks the visual layer — shadcn's HSL color aliases reference CSS vars that no longer exist after `globals.css` is replaced.

---

## File Map

| File                                                           | Action  | Notes                                                        |
| -------------------------------------------------------------- | ------- | ------------------------------------------------------------ |
| `apps/web/src/theme/themes.ts`                                 | Create  | THEMES object + ThemeName type                               |
| `apps/web/src/theme/apply-theme.ts`                            | Create  | Pure DOM function                                            |
| `apps/web/src/theme/ThemeProvider.tsx`                         | Create  | `'use client'` context + useTheme                            |
| `apps/web/src/theme/index.ts`                                  | Create  | Re-exports                                                   |
| `apps/web/src/theme/themes.test.ts`                            | Create  | Node env — validates token completeness                      |
| `apps/web/src/theme/apply-theme.test.ts`                       | Create  | jsdom override — validates DOM mutations                     |
| `apps/web/src/app/globals.css`                                 | Replace | Electric fallback tokens; strip all shadcn HSL vars          |
| `apps/web/tailwind.config.ts`                                  | Replace | Token color aliases; font vars; remove `darkMode: ['class']` |
| `apps/web/src/app/layout.tsx`                                  | Modify  | Fonts, inline blocking script, ThemeProvider, body class     |
| `apps/web/src/components/ui/badge.tsx`                         | Modify  | Token class names; remove all `dark:` variants               |
| `apps/web/src/components/ui/button.tsx`                        | Modify  | Token class names; remove all `dark:` variants               |
| `apps/web/src/components/ui/card.tsx`                          | Modify  | Token class names                                            |
| `apps/web/src/components/ui/input.tsx`                         | Modify  | Token class names; remove all `dark:` variants               |
| `apps/web/src/components/ui/table.tsx`                         | Modify  | Token class names                                            |
| `apps/web/src/app/(protected)/admin/layout.tsx`                | Modify  | Token class names + Settings nav item                        |
| `apps/web/src/app/(protected)/admin/error.tsx`                 | Modify  | Token class names                                            |
| `apps/web/src/app/(protected)/admin/settings/page.tsx`         | Create  | Server Component, role guard                                 |
| `apps/web/src/components/admin/settings/SettingsLayout.tsx`    | Create  | Section wrapper: heading + content slot                      |
| `apps/web/src/components/admin/settings/AppearanceSection.tsx` | Create  | First settings section                                       |
| `apps/web/src/components/admin/ThemePicker.tsx`                | Create  | `'use client'`; three theme cards                            |

---

## Task 1: Theme module — themes.ts

**Files:**

- Create: `apps/web/src/theme/themes.ts`
- Create: `apps/web/src/theme/themes.test.ts`

- [ ] **Step 1: Create themes.ts**

```ts
// apps/web/src/theme/themes.ts
export type ThemeName = 'electric' | 'jade' | 'light'

const electric: Record<string, string> = {
  bg: '#070A1A',
  'bg-elevated': '#0E1226',
  'surface-1': '#11162E',
  'surface-2': '#171D3A',
  'surface-3': '#1F2748',
  fg: '#E8F3FF',
  'fg-muted': '#9AA8C7',
  'fg-subtle': '#5A6788',
  'fg-on-accent': '#070A1A',
  border: '#1F2748',
  'border-strong': '#2C3661',
  'border-focus': '#7AE6FF',
  signal: '#7AE6FF',
  'signal-muted': '#3FA3C2',
  accent: '#FF7BD4',
  'accent-muted': '#B8559A',
  success: '#7BFFB0',
  warning: '#FFD27A',
  danger: '#FF7A8A',
  focus: '#7AE6FF',
  'overlay-hover': 'rgba(122,230,255,0.08)',
  'overlay-press': 'rgba(122,230,255,0.16)',
  scrim: 'rgba(7,10,26,0.72)',
  'image-tint': 'rgba(7,10,26,0.20)',
}

const jade: Record<string, string> = {
  bg: '#06201F',
  'bg-elevated': '#0A2A28',
  'surface-1': '#0E3331',
  'surface-2': '#143E3B',
  'surface-3': '#1A4A47',
  fg: '#E6FFF6',
  'fg-muted': '#8FBFB0',
  'fg-subtle': '#557A6F',
  'fg-on-accent': '#06201F',
  border: '#1A4A47',
  'border-strong': '#2A5C57',
  'border-focus': '#1FFFC2',
  signal: '#1FFFC2',
  'signal-muted': '#15B58A',
  accent: '#9B5CFF',
  'accent-muted': '#6F44B5',
  success: '#1FFFC2',
  warning: '#FFD27A',
  danger: '#FF7A8A',
  focus: '#1FFFC2',
  'overlay-hover': 'rgba(31,255,194,0.08)',
  'overlay-press': 'rgba(31,255,194,0.16)',
  scrim: 'rgba(6,32,31,0.72)',
  'image-tint': 'rgba(6,32,31,0.20)',
}

const light: Record<string, string> = {
  bg: '#FAFCFF',
  'bg-elevated': '#FFFFFF',
  'surface-1': '#F2F5FB',
  'surface-2': '#E8EDF6',
  'surface-3': '#DCE3F0',
  fg: '#070A1A',
  'fg-muted': '#4A5374',
  'fg-subtle': '#8A93B0',
  'fg-on-accent': '#FFFFFF',
  border: '#DCE3F0',
  'border-strong': '#B8C2D6',
  'border-focus': '#0080A0',
  signal: '#0080A0',
  'signal-muted': '#4DABC2',
  accent: '#E0297A',
  'accent-muted': '#B0205F',
  success: '#1F8A4F',
  warning: '#B86E00',
  danger: '#C42940',
  focus: '#0080A0',
  'overlay-hover': 'rgba(7,10,26,0.04)',
  'overlay-press': 'rgba(7,10,26,0.08)',
  scrim: 'rgba(7,10,26,0.40)',
  'image-tint': 'transparent',
}

export const THEMES: Record<ThemeName, Record<string, string>> = {
  electric,
  jade,
  light,
}
```

- [ ] **Step 2: Create themes.test.ts**

```ts
// apps/web/src/theme/themes.test.ts
import { describe, it, expect } from 'vitest'
import { THEMES, type ThemeName } from './themes'

const REQUIRED_TOKENS = [
  'bg',
  'bg-elevated',
  'surface-1',
  'surface-2',
  'surface-3',
  'fg',
  'fg-muted',
  'fg-subtle',
  'fg-on-accent',
  'border',
  'border-strong',
  'border-focus',
  'signal',
  'signal-muted',
  'accent',
  'accent-muted',
  'success',
  'warning',
  'danger',
  'focus',
  'overlay-hover',
  'overlay-press',
  'scrim',
  'image-tint',
] as const

const THEME_NAMES: ThemeName[] = ['electric', 'jade', 'light']

describe('THEMES', () => {
  it('exports exactly three themes', () => {
    expect(Object.keys(THEMES).sort()).toEqual([...THEME_NAMES].sort())
  })

  for (const name of THEME_NAMES) {
    describe(`theme: ${name}`, () => {
      it('contains every required token', () => {
        for (const token of REQUIRED_TOKENS) {
          expect(THEMES[name], `missing token --${token}`).toHaveProperty(token)
        }
      })

      it('has no undefined or empty token values', () => {
        for (const [token, value] of Object.entries(THEMES[name])) {
          expect(typeof value, `--${token} is not a string`).toBe('string')
          expect(value.length, `--${token} is empty`).toBeGreaterThan(0)
        }
      })
    })
  }
})
```

- [ ] **Step 3: Run test — expect PASS**

Run from `apps/web/`: `npx vitest run src/theme/themes.test.ts`

Expected output: all tests pass, no failures.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/theme/themes.ts apps/web/src/theme/themes.test.ts
git commit -m "feat: add theme token source of truth (THEMES + ThemeName)"
```

---

## Task 2: Theme module — apply-theme.ts

**Files:**

- Create: `apps/web/src/theme/apply-theme.ts`
- Create: `apps/web/src/theme/apply-theme.test.ts`

- [ ] **Step 1: Create apply-theme.ts**

```ts
// apps/web/src/theme/apply-theme.ts
import { THEMES, type ThemeName } from './themes'

export function applyTheme(name: ThemeName): void {
  const tokens = THEMES[name]
  const root = document.documentElement
  for (const [k, v] of Object.entries(tokens)) {
    root.style.setProperty(`--${k}`, v)
  }
  root.setAttribute('data-theme', name)
}
```

- [ ] **Step 2: Create apply-theme.test.ts**

The `// @vitest-environment jsdom` directive at the top of the file overrides the project-level `environment: 'node'` for this file only. jsdom is already installed as a devDependency.

```ts
// @vitest-environment jsdom
// apps/web/src/theme/apply-theme.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { applyTheme } from './apply-theme'
import { THEMES } from './themes'

describe('applyTheme', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('data-theme')
    document.documentElement.style.cssText = ''
  })

  it('sets data-theme attribute on <html>', () => {
    applyTheme('electric')
    expect(document.documentElement.getAttribute('data-theme')).toBe('electric')
  })

  it('writes all CSS custom properties for the chosen theme', () => {
    applyTheme('jade')
    for (const [key, value] of Object.entries(THEMES.jade)) {
      expect(
        document.documentElement.style.getPropertyValue(`--${key}`),
        `--${key} not set`,
      ).toBe(value)
    }
  })

  it('overwrites the previous theme when called again', () => {
    applyTheme('electric')
    applyTheme('light')
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
    expect(document.documentElement.style.getPropertyValue('--bg')).toBe(
      THEMES.light.bg,
    )
  })
})
```

- [ ] **Step 3: Run test — expect PASS**

Run from `apps/web/`: `npx vitest run src/theme/apply-theme.test.ts`

Expected output: 3 tests pass.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/theme/apply-theme.ts apps/web/src/theme/apply-theme.test.ts
git commit -m "feat: add applyTheme DOM function with jsdom tests"
```

---

## Task 3: Theme module — ThemeProvider + index

**Files:**

- Create: `apps/web/src/theme/ThemeProvider.tsx`
- Create: `apps/web/src/theme/index.ts`

No component test: `@testing-library/react` is not installed. The pure-function tests in Tasks 1–2 are sufficient.

- [ ] **Step 1: Create ThemeProvider.tsx**

`ThemeProvider` reads `data-theme` from `<html>` on mount (already set by the inline blocking script — see Task 4). It does **not** call `applyTheme` on mount to avoid double-application. `setTheme` both applies the theme and persists to `localStorage`.

```tsx
// apps/web/src/theme/ThemeProvider.tsx
'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { applyTheme } from './apply-theme'
import type { ThemeName } from './themes'

const VALID_THEMES: ThemeName[] = ['electric', 'jade', 'light']

function isThemeName(v: string | null): v is ThemeName {
  return VALID_THEMES.includes(v as ThemeName)
}

interface ThemeContextValue {
  theme: ThemeName
  setTheme: (t: ThemeName) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>('electric')

  useEffect(() => {
    const attr = document.documentElement.getAttribute('data-theme')
    if (isThemeName(attr)) setThemeState(attr)
  }, [])

  function setTheme(t: ThemeName) {
    applyTheme(t)
    localStorage.setItem('cc-theme', t)
    setThemeState(t)
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (ctx === null)
    throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
```

- [ ] **Step 2: Create index.ts**

```ts
// apps/web/src/theme/index.ts
export { ThemeProvider, useTheme } from './ThemeProvider'
export { applyTheme } from './apply-theme'
export { THEMES, type ThemeName } from './themes'
```

- [ ] **Step 3: TypeScript check**

Run from `apps/web/`: `npx tsc --noEmit`

Expected: no errors. If `applyTheme` import causes issues (DOM types not in scope), this resolves in Task 4 when the file is first consumed.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/theme/ThemeProvider.tsx apps/web/src/theme/index.ts
git commit -m "feat: add ThemeProvider client context and useTheme hook"
```

---

## Task 4: Atomic cutover

**All 10 files in this task must be staged and committed together.** Edit them all before running any verification.

**Files (edit all before committing):**

- Replace: `apps/web/src/app/globals.css`
- Replace: `apps/web/tailwind.config.ts`
- Modify: `apps/web/src/app/layout.tsx`
- Modify: `apps/web/src/components/ui/badge.tsx`
- Modify: `apps/web/src/components/ui/button.tsx`
- Modify: `apps/web/src/components/ui/card.tsx`
- Modify: `apps/web/src/components/ui/input.tsx`
- Modify: `apps/web/src/components/ui/table.tsx`
- Modify: `apps/web/src/app/(protected)/admin/layout.tsx`
- Modify: `apps/web/src/app/(protected)/admin/error.tsx`

### Step 1: Replace globals.css

Strip all shadcn HSL vars (`--background`, `--foreground`, `--card`, `--muted`, `--primary`, etc.) and the `@media (prefers-color-scheme: dark)` block entirely. Write Electric tokens as the SSR/no-JS fallback. Keep `--radius` variables (they are layout, not color).

```css
/* apps/web/src/app/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* Electric theme — SSR / no-JS fallback; overwritten by inline script on the client */
    --bg: #070a1a;
    --bg-elevated: #0e1226;
    --surface-1: #11162e;
    --surface-2: #171d3a;
    --surface-3: #1f2748;
    --fg: #e8f3ff;
    --fg-muted: #9aa8c7;
    --fg-subtle: #5a6788;
    --fg-on-accent: #070a1a;
    --border: #1f2748;
    --border-strong: #2c3661;
    --border-focus: #7ae6ff;
    --signal: #7ae6ff;
    --signal-muted: #3fa3c2;
    --accent: #ff7bd4;
    --accent-muted: #b8559a;
    --success: #7bffb0;
    --warning: #ffd27a;
    --danger: #ff7a8a;
    --focus: #7ae6ff;
    --overlay-hover: rgba(122, 230, 255, 0.08);
    --overlay-press: rgba(122, 230, 255, 0.16);
    --scrim: rgba(7, 10, 26, 0.72);
    --image-tint: rgba(7, 10, 26, 0.2);

    --radius: 0.625rem;
    --radius-md: calc(var(--radius) - 2px);
    --radius-sm: calc(var(--radius) - 4px);
  }

  * {
    @apply border-border;
  }

  body {
    font-family: var(--font-ui);
    font-feature-settings:
      'rlig' 1,
      'calt' 1;
  }

  code,
  pre {
    font-family: var(--font-mono);
  }

  .cl-userButtonOuterIdentifier {
    color: var(--fg);
  }
}
```

- [ ] **Step 2: Replace tailwind.config.ts**

Remove `darkMode: ['class']`. Strip all shadcn HSL color aliases. Add token color aliases. Update `fontFamily` to use `--font-ui` and `--font-mono`. Keep the `borderRadius` block.

```ts
// apps/web/tailwind.config.ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-ui)'],
        mono: ['var(--font-mono)'],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'var(--radius-md)',
        sm: 'var(--radius-sm)',
      },
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
        border: 'var(--border)',
        'border-strong': 'var(--border-strong)',
        'border-focus': 'var(--border-focus)',
        accent: 'var(--accent)',
        'accent-muted': 'var(--accent-muted)',
        signal: 'var(--signal)',
        'signal-muted': 'var(--signal-muted)',
        success: 'var(--success)',
        warning: 'var(--warning)',
        danger: 'var(--danger)',
      },
    },
  },
  plugins: [],
}

export default config
```

- [ ] **Step 3: Update layout.tsx**

Replace Geist with Inter + JetBrains Mono. Add the blocking inline script. Wrap children with `ThemeProvider`. Update the `<html>` className and the `<body>` class.

```tsx
// apps/web/src/app/layout.tsx
import type { Metadata, Viewport } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'
import { Inter, JetBrains_Mono } from 'next/font/google'
import { ThemeProvider } from '@/theme'
import { THEMES } from '@/theme/themes'
import { cn } from '@/lib/utils'

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

export const metadata: Metadata = {
  title: 'Concert Crawl',
  description: 'Denver concert calendar — find shows at your favorite venues.',
  manifest: '/manifest.json',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#000000',
}

interface RootLayoutProps {
  children: React.ReactNode
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        suppressHydrationWarning
        className={cn(inter.variable, mono.variable)}
      >
        <head>
          {/* Blocking script: runs before paint to apply saved/system theme */}
          <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        </head>
        <body className="min-h-screen bg-bg font-sans antialiased">
          <ThemeProvider>{children}</ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}
```

- [ ] **Step 4: Update badge.tsx**

Replace all shadcn token class names. Remove all `dark:` variants. Tokens are hex — Tailwind `/50` opacity modifiers do not work. Use `color-mix` for the three destructive opacity instances. `ring-ring/50` → `ring-border-focus` (border-focus is already the intended focus ring color, no opacity needed).

```tsx
// apps/web/src/components/ui/badge.tsx
import { mergeProps } from '@base-ui/react/merge-props'
import { useRender } from '@base-ui/react/use-render'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-4xl border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-all focus-visible:border-border-focus focus-visible:ring-[3px] focus-visible:ring-border-focus has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-danger aria-invalid:ring-[color-mix(in_srgb,var(--danger)_20%,transparent)] [&>svg]:pointer-events-none [&>svg]:size-3!',
  {
    variants: {
      variant: {
        default: 'bg-accent text-fg-on-accent [a]:hover:bg-accent-muted',
        secondary: 'bg-surface-2 text-fg [a]:hover:bg-surface-3',
        destructive:
          'bg-[color-mix(in_srgb,var(--danger)_15%,transparent)] text-danger focus-visible:ring-[color-mix(in_srgb,var(--danger)_20%,transparent)] [a]:hover:bg-[color-mix(in_srgb,var(--danger)_20%,transparent)]',
        outline:
          'border-border text-fg [a]:hover:bg-surface-1 [a]:hover:text-fg-muted',
        ghost: 'hover:bg-surface-1 hover:text-fg-muted',
        link: 'text-accent underline-offset-4 hover:underline',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

function Badge({
  className,
  variant = 'default',
  render,
  ...props
}: useRender.ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: 'span',
    props: mergeProps<'span'>(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props,
    ),
    render,
    state: {
      slot: 'badge',
      variant,
    },
  })
}

export { Badge, badgeVariants }
```

- [ ] **Step 5: Update button.tsx**

```tsx
// apps/web/src/components/ui/button.tsx
import { Button as ButtonPrimitive } from '@base-ui/react/button'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-border-focus focus-visible:ring-3 focus-visible:ring-border-focus active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-danger aria-invalid:ring-3 aria-invalid:ring-[color-mix(in_srgb,var(--danger)_20%,transparent)] [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: 'bg-accent text-fg-on-accent [a]:hover:bg-accent-muted',
        outline:
          'border-border bg-bg hover:bg-surface-1 hover:text-fg aria-expanded:bg-surface-1 aria-expanded:text-fg',
        secondary:
          'bg-surface-2 text-fg hover:bg-surface-3 aria-expanded:bg-surface-2 aria-expanded:text-fg',
        ghost:
          'hover:bg-surface-1 hover:text-fg aria-expanded:bg-surface-1 aria-expanded:text-fg',
        destructive:
          'bg-[color-mix(in_srgb,var(--danger)_15%,transparent)] text-danger hover:bg-[color-mix(in_srgb,var(--danger)_20%,transparent)] focus-visible:border-danger focus-visible:ring-[color-mix(in_srgb,var(--danger)_20%,transparent)]',
        link: 'text-accent underline-offset-4 hover:underline',
      },
      size: {
        default:
          'h-8 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2',
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: 'h-9 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2',
        icon: 'size-8',
        'icon-xs':
          "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        'icon-sm':
          'size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg',
        'icon-lg': 'size-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

function Button({
  className,
  variant = 'default',
  size = 'default',
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
```

- [ ] **Step 6: Update card.tsx**

Mapping applied:

- `bg-card text-card-foreground ring-1 ring-foreground/10` → `bg-bg-elevated text-fg ring-1 ring-border`
- `text-muted-foreground` → `text-fg-muted`
- `border-t bg-muted/50` in `CardFooter` → `border-t bg-surface-1`

```tsx
// apps/web/src/components/ui/card.tsx
import * as React from 'react'

import { cn } from '@/lib/utils'

function Card({
  className,
  size = 'default',
  ...props
}: React.ComponentProps<'div'> & { size?: 'default' | 'sm' }) {
  return (
    <div
      data-slot="card"
      data-size={size}
      className={cn(
        'group/card flex flex-col gap-4 overflow-hidden rounded-xl bg-bg-elevated py-4 text-sm text-fg ring-1 ring-border has-data-[slot=card-footer]:pb-0 has-[>img:first-child]:pt-0 data-[size=sm]:gap-3 data-[size=sm]:py-3 data-[size=sm]:has-data-[slot=card-footer]:pb-0 *:[img:first-child]:rounded-t-xl *:[img:last-child]:rounded-b-xl',
        className,
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        'group/card-header @container/card-header grid auto-rows-min items-start gap-1 rounded-t-xl px-4 group-data-[size=sm]/card:px-3 has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] [.border-b]:pb-4 group-data-[size=sm]/card:[.border-b]:pb-3',
        className,
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        'font-heading text-base leading-snug font-medium group-data-[size=sm]/card:text-sm',
        className,
      )}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-description"
      className={cn('text-sm text-fg-muted', className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        'col-start-2 row-span-2 row-start-1 self-start justify-self-end',
        className,
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-content"
      className={cn('px-4 group-data-[size=sm]/card:px-3', className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        'flex items-center rounded-b-xl border-t bg-surface-1 p-4 group-data-[size=sm]/card:p-3',
        className,
      )}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
```

- [ ] **Step 7: Update input.tsx**

Mapping applied:

- `border-input` → `border-border`
- `file:text-foreground placeholder:text-muted-foreground` → `file:text-fg placeholder:text-fg-muted`
- `focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50` → `focus-visible:border-border-focus focus-visible:ring-3 focus-visible:ring-border-focus`
- `disabled:bg-input/50` → `disabled:bg-surface-1`
- `aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20` → `aria-invalid:border-danger aria-invalid:ring-3 aria-invalid:ring-[color-mix(in_srgb,var(--danger)_20%,transparent)]`
- Remove all `dark:` variants

```tsx
// apps/web/src/components/ui/input.tsx
import * as React from 'react'
import { Input as InputPrimitive } from '@base-ui/react/input'

import { cn } from '@/lib/utils'

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        'h-8 w-full min-w-0 rounded-lg border border-border bg-transparent px-2.5 py-1 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-fg placeholder:text-fg-muted focus-visible:border-border-focus focus-visible:ring-3 focus-visible:ring-border-focus disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-surface-1 disabled:opacity-50 aria-invalid:border-danger aria-invalid:ring-3 aria-invalid:ring-[color-mix(in_srgb,var(--danger)_20%,transparent)] md:text-sm',
        className,
      )}
      {...props}
    />
  )
}

export { Input }
```

- [ ] **Step 8: Update table.tsx**

Mapping applied:

- `bg-muted/50` (TableFooter + TableRow) → `bg-surface-1`
- `data-[state=selected]:bg-muted` → `data-[state=selected]:bg-surface-2`
- `text-foreground` (TableHead) → `text-fg`
- `text-muted-foreground` (TableCaption) → `text-fg-muted`

```tsx
// apps/web/src/components/ui/table.tsx
'use client'

import * as React from 'react'

import { cn } from '@/lib/utils'

function Table({ className, ...props }: React.ComponentProps<'table'>) {
  return (
    <div
      data-slot="table-container"
      className="relative w-full overflow-x-auto"
    >
      <table
        data-slot="table"
        className={cn('w-full caption-bottom text-sm', className)}
        {...props}
      />
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<'thead'>) {
  return (
    <thead
      data-slot="table-header"
      className={cn('[&_tr]:border-b', className)}
      {...props}
    />
  )
}

function TableBody({ className, ...props }: React.ComponentProps<'tbody'>) {
  return (
    <tbody
      data-slot="table-body"
      className={cn('[&_tr:last-child]:border-0', className)}
      {...props}
    />
  )
}

function TableFooter({ className, ...props }: React.ComponentProps<'tfoot'>) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        'border-t bg-surface-1 font-medium [&>tr]:last:border-b-0',
        className,
      )}
      {...props}
    />
  )
}

function TableRow({ className, ...props }: React.ComponentProps<'tr'>) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        'border-b transition-colors hover:bg-surface-1 has-aria-expanded:bg-surface-1 data-[state=selected]:bg-surface-2',
        className,
      )}
      {...props}
    />
  )
}

function TableHead({ className, ...props }: React.ComponentProps<'th'>) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        'h-10 px-2 text-left align-middle font-medium whitespace-nowrap text-fg [&:has([role=checkbox])]:pr-0',
        className,
      )}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: React.ComponentProps<'td'>) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        'p-2 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0',
        className,
      )}
      {...props}
    />
  )
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<'caption'>) {
  return (
    <caption
      data-slot="table-caption"
      className={cn('mt-4 text-sm text-fg-muted', className)}
      {...props}
    />
  )
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}
```

- [ ] **Step 9: Update admin/layout.tsx**

Changes:

- Add `{ href: '/admin/settings', label: 'Settings' }` to `navItems`
- `bg-muted` → `bg-surface-1`
- `text-muted-foreground` → `text-fg-muted`
- `text-foreground` → `text-fg`
- `hover:bg-accent hover:text-accent-foreground` → `hover:bg-surface-2` (IMPORTANT: after the cutover `accent` = brand pink, not a surface color — this must be `surface-2`)
- Add `border-border` to `border-r` and `border-t` dividers

```tsx
// apps/web/src/app/(protected)/admin/layout.tsx
import { requireAdminUser } from '@/lib/auth'
import { UserButton } from '@clerk/nextjs'
import Link from 'next/link'

const navItems = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/venues', label: 'Venues' },
  { href: '/admin/invite-codes', label: 'Invite Codes' },
  { href: '/admin/settings', label: 'Settings' },
]

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireAdminUser()

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-56 flex-col border-r border-border bg-surface-1 p-4">
        <p className="mb-6 text-sm font-semibold uppercase tracking-wider text-fg-muted">
          Admin
        </p>
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 text-sm text-fg hover:bg-surface-2"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto pt-4 border-t border-border">
          <UserButton showName />
        </div>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  )
}
```

- [ ] **Step 10: Update admin/error.tsx**

Changes:

- `text-destructive` → `text-danger`
- `text-muted-foreground` → `text-fg-muted`
- `bg-primary text-primary-foreground` → `bg-accent text-fg-on-accent`

```tsx
// apps/web/src/app/(protected)/admin/error.tsx
'use client'

import { useEffect } from 'react'

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[admin] page error:', error)
  }, [error])

  return (
    <div className="flex flex-col gap-3 p-6">
      <h2 className="text-lg font-semibold text-danger">
        Something went wrong
      </h2>
      <p className="text-sm text-fg-muted">
        If you were trying to access a restricted page, try signing out and back
        in to refresh your session. Otherwise, reload and try again.
      </p>
      {error.digest && (
        <p className="font-mono text-xs text-fg-muted">
          Error ID: {error.digest}
        </p>
      )}
      <button
        onClick={reset}
        className="w-fit rounded-md bg-accent px-3 py-1.5 text-sm text-fg-on-accent"
      >
        Try again
      </button>
    </div>
  )
}
```

- [ ] **Step 11: TypeScript check — all files edited**

Run from `apps/web/`: `npx tsc --noEmit`

Expected: zero errors. If you see errors about `@/theme` not found, ensure `apps/web/src/theme/index.ts` was created in Task 3.

- [ ] **Step 12: Start dev server and visually verify**

Run from repo root: `pnpm dev`

Open http://localhost:3000 and http://localhost:3001/admin in a browser.

Verify:

1. Dark background (`#070A1A`) loads without flash
2. No console errors about undefined CSS variables
3. Admin sidebar renders with correct surface color (dark navy, not the old gray)
4. Admin nav links hover to `surface-2` (slightly lighter navy), not pink
5. Open DevTools → Elements → `<html>` — confirm `data-theme="electric"` attribute is set
6. In DevTools → `<html>` style — confirm `--bg`, `--accent`, etc. are set as inline styles
7. Toggle system dark/light mode: page should switch between Electric and Light

Stop the dev server before committing.

- [ ] **Step 13: Atomic commit — all 10 files**

```bash
git add \
  apps/web/src/app/globals.css \
  apps/web/tailwind.config.ts \
  apps/web/src/app/layout.tsx \
  apps/web/src/components/ui/badge.tsx \
  apps/web/src/components/ui/button.tsx \
  apps/web/src/components/ui/card.tsx \
  apps/web/src/components/ui/input.tsx \
  apps/web/src/components/ui/table.tsx \
  apps/web/src/app/(protected)/admin/layout.tsx \
  apps/web/src/app/(protected)/admin/error.tsx

git commit -m "feat: atomic cutover to CSS variable token system (Phase 4)"
```

---

## Task 5: Admin settings UI

**Files:**

- Create: `apps/web/src/app/(protected)/admin/settings/page.tsx`
- Create: `apps/web/src/components/admin/settings/SettingsLayout.tsx`
- Create: `apps/web/src/components/admin/settings/AppearanceSection.tsx`
- Create: `apps/web/src/components/admin/ThemePicker.tsx`

- [ ] **Step 1: Create SettingsLayout.tsx**

`SettingsLayout` is a reusable section wrapper used by each settings category. Future sections (crawl config, rate limits, etc.) wrap themselves in `SettingsLayout` the same way.

```tsx
// apps/web/src/components/admin/settings/SettingsLayout.tsx
interface SettingsLayoutProps {
  heading: string
  description?: string
  children: React.ReactNode
}

export function SettingsLayout({
  heading,
  description,
  children,
}: SettingsLayoutProps) {
  return (
    <section className="flex flex-col gap-4 border-b border-border pb-8 last:border-0 last:pb-0">
      <div>
        <h2 className="text-base font-semibold text-fg">{heading}</h2>
        {description && (
          <p className="mt-1 text-sm text-fg-muted">{description}</p>
        )}
      </div>
      {children}
    </section>
  )
}
```

- [ ] **Step 2: Create ThemePicker.tsx**

Each card shows three color swatches (`--bg`, `--signal`, `--accent`) using inline `style` to reference the theme's actual hex values from the THEMES object directly. This lets the cards show their own colors regardless of which theme is currently active.

```tsx
// apps/web/src/components/admin/ThemePicker.tsx
'use client'

import { cn } from '@/lib/utils'
import { THEMES, type ThemeName } from '@/theme/themes'
import { useTheme } from '@/theme'

const THEME_LABELS: Record<ThemeName, string> = {
  electric: 'Electric',
  jade: 'Jade',
  light: 'Light',
}

export function ThemePicker() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="flex flex-wrap gap-3">
      {(Object.keys(THEMES) as ThemeName[]).map((name) => {
        const tokens = THEMES[name]
        const isSelected = theme === name

        return (
          <button
            key={name}
            type="button"
            onClick={() => setTheme(name)}
            className={cn(
              'flex flex-col gap-3 rounded-xl border p-4 text-left transition-all',
              isSelected
                ? 'border-border-focus ring-2 ring-border-focus'
                : 'border-border hover:border-border-strong',
            )}
          >
            <div className="flex gap-1.5">
              <span
                className="size-4 rounded-full ring-1 ring-black/10"
                style={{ background: tokens.bg }}
              />
              <span
                className="size-4 rounded-full"
                style={{ background: tokens.signal }}
              />
              <span
                className="size-4 rounded-full"
                style={{ background: tokens.accent }}
              />
            </div>
            <span className="text-sm font-medium text-fg">
              {THEME_LABELS[name]}
            </span>
          </button>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 3: Create AppearanceSection.tsx**

```tsx
// apps/web/src/components/admin/settings/AppearanceSection.tsx
import { SettingsLayout } from './SettingsLayout'
import { ThemePicker } from '@/components/admin/ThemePicker'

export function AppearanceSection() {
  return (
    <SettingsLayout
      heading="Appearance"
      description="Choose the theme for your admin interface. Your selection is saved locally."
    >
      <ThemePicker />
    </SettingsLayout>
  )
}
```

- [ ] **Step 4: Create settings/page.tsx**

Auth guard uses `requireAdminUser()` from `@/lib/auth` (not `requireRole` directly — consistent with how all other admin pages are guarded in this codebase).

```tsx
// apps/web/src/app/(protected)/admin/settings/page.tsx
import { requireAdminUser } from '@/lib/auth'
import { AppearanceSection } from '@/components/admin/settings/AppearanceSection'

export default async function SettingsPage() {
  await requireAdminUser()

  return (
    <div className="max-w-2xl">
      <h1 className="mb-8 text-2xl font-bold text-fg">Settings</h1>
      <div className="flex flex-col gap-0">
        <AppearanceSection />
      </div>
    </div>
  )
}
```

- [ ] **Step 5: TypeScript check**

Run from `apps/web/`: `npx tsc --noEmit`

Expected: zero errors.

- [ ] **Step 6: Visual verification**

Start `pnpm dev`. Navigate to http://localhost:3000/admin/settings.

Verify:

1. Page renders with "Settings" heading and "Appearance" section
2. Three theme cards are shown (Electric, Jade, Light)
3. Each card shows three color dot swatches using that theme's actual colors (not the current theme's colors)
4. The currently-active theme's card shows a focus ring (using `--border-focus`)
5. Clicking a card immediately changes the page theme (CSS vars update, UI shifts)
6. Reload the page — the previously selected theme loads without flash (localStorage persistence works)
7. Navigate to another admin page (e.g., `/admin/venues`) — theme persists

- [ ] **Step 7: Commit**

```bash
git add \
  apps/web/src/app/(protected)/admin/settings/page.tsx \
  apps/web/src/components/admin/settings/SettingsLayout.tsx \
  apps/web/src/components/admin/settings/AppearanceSection.tsx \
  apps/web/src/components/admin/ThemePicker.tsx

git commit -m "feat: add admin settings page with theme picker (Phase 4)"
```

---

## Self-Review

### Spec coverage check

| Spec requirement                                           | Covered by                     |
| ---------------------------------------------------------- | ------------------------------ |
| Three-theme CSS variable token system                      | Task 1 (themes.ts)             |
| SSR / no-JS fallback via `:root` Electric tokens           | Task 4, Step 1 (globals.css)   |
| Zero-FOUC blocking inline script                           | Task 4, Step 3 (layout.tsx)    |
| `prefers-color-scheme` system default                      | Task 4, Step 3 (inline script) |
| `ThemeProvider` reads `data-theme` on mount; no re-apply   | Task 3                         |
| `useTheme()` hook                                          | Task 3                         |
| `setTheme` calls `applyTheme` + persists to localStorage   | Task 3                         |
| Inter + JetBrains Mono font migration                      | Task 4, Step 3                 |
| Remove `darkMode: ['class']` from Tailwind config          | Task 4, Step 2                 |
| shadcn token color aliases in tailwind.config.ts           | Task 4, Step 2                 |
| Remove all `dark:` variants from components                | Tasks 4, Steps 4–8             |
| badge.tsx token replacement                                | Task 4, Step 4                 |
| button.tsx token replacement                               | Task 4, Step 5                 |
| card.tsx token replacement                                 | Task 4, Step 6                 |
| input.tsx token replacement                                | Task 4, Step 7                 |
| table.tsx token replacement                                | Task 4, Step 8                 |
| admin/layout.tsx token replacement + `hover:bg-accent` fix | Task 4, Step 9                 |
| admin/error.tsx token replacement                          | Task 4, Step 10                |
| root layout body class (`bg-background` → `bg-bg`)         | Task 4, Step 3                 |
| Admin Settings page at `/admin/settings`                   | Task 5                         |
| `requireAdminUser()` auth guard                            | Task 5, Step 4                 |
| Settings nav link in admin sidebar                         | Task 4, Step 9                 |
| `SettingsLayout` section wrapper                           | Task 5, Step 1                 |
| `AppearanceSection`                                        | Task 5, Step 3                 |
| `ThemePicker` three cards with swatches + selection ring   | Task 5, Step 2                 |
| `setTheme` instant live preview                            | Task 5, Step 2                 |
| `localStorage['cc-theme']` persistence                     | Task 3 + Task 5, Step 2        |
| `label.tsx` — no changes needed                            | Confirmed; omitted             |

### Placeholder scan

None. All steps contain the complete file content or precise diff.

### Type consistency

- `ThemeName` defined in `themes.ts`, imported as `type ThemeName` everywhere else
- `applyTheme(name: ThemeName)` — used in `ThemeProvider.setTheme` and the inline script (inline script uses raw string, not the function — correct by design)
- `THEMES` imported from `@/theme/themes` in both `ThemePicker` and `layout.tsx` inline script — same source
- `useTheme()` exported from `@/theme/ThemeProvider` and re-exported from `@/theme/index.ts`
- `requireAdminUser()` imported from `@/lib/auth` consistently with existing admin pages
