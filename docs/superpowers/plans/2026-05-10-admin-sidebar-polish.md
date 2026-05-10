# Admin Sidebar Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix four visual discrepancies in the admin sidebar to align with the design spec (issue #139).

**Architecture:** Four independent, self-contained changes: a CSS token fix, a component relocation with import updates, a nav data change, and a section label rendering extension. No new components, no schema changes, no API changes.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS, CSS custom properties (admin.css), Lucide icons, Vitest

**Worktree:** `/Users/huey/Projects/concert-crawl/.worktrees/fix/admin-sidebar-polish`
**Branch:** `fix/admin-sidebar-polish`

All commands should be run from inside the worktree directory unless otherwise noted.

---

## File Map

| File | Change |
|------|--------|
| `apps/web/src/app/(protected)/admin/admin.css` | Darken `--warning` in Electric + Jade themes |
| `apps/web/src/components/consumer/cc-mark/CCMark.tsx` | **Delete** — moving to brand/ |
| `apps/web/src/components/brand/cc-mark/CCMark.tsx` | **Create** — canonical home for CCMark |
| `apps/web/src/components/consumer/app-header/AppHeader.tsx` | Update CCMark import path |
| `apps/web/src/components/admin/shell/AdminSidebar.tsx` | Replace inline SVG + wordmark with CCMark + CCWordmark; add OPERATIONS label |
| `apps/web/src/components/admin/shell/nav.ts` | `iconName: 'Ticket'` → `iconName: 'Key'` for invite-codes |
| `apps/web/src/components/admin/shell/nav.test.ts` | New — verifies nav config invariants |

---

## Task 1: Fix warning badge contrast in Electric and Jade themes

**Files:**
- Modify: `apps/web/src/app/(protected)/admin/admin.css`

The `--warning` token in Electric and Jade is `#ffd27a` — too bright for white badge text. Change it to `#c97920` (burnt amber, contrast ratio ~5.5:1 against white).

- [ ] **Step 1: Update Electric theme warning token**

In `apps/web/src/app/(protected)/admin/admin.css`, find the `[data-admin-theme="electric"]` block and change:

```css
  --warning: #ffd27a;
```

to:

```css
  --warning: #c97920;
```

- [ ] **Step 2: Update Jade theme warning token**

In the same file, find the `[data-admin-theme="jade"]` block and change:

```css
  --warning: #ffd27a;
```

to:

```css
  --warning: #c97920;
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/(protected)/admin/admin.css
git commit -m "fix(admin): darken --warning token in Electric and Jade for badge contrast"
```

---

## Task 2: Move CCMark to components/brand/

**Files:**
- Create: `apps/web/src/components/brand/cc-mark/CCMark.tsx`
- Delete: `apps/web/src/components/consumer/cc-mark/CCMark.tsx`
- Modify: `apps/web/src/components/consumer/app-header/AppHeader.tsx`

`CCMark` is a brand asset used across consumer and admin. Moving it to `components/brand/` alongside `CCWordmark` makes it a first-class shared asset.

- [ ] **Step 1: Create the file at its new canonical location**

Create `apps/web/src/components/brand/cc-mark/CCMark.tsx` with this content (identical to the existing component):

```tsx
interface CCMarkProps {
  size?: number
}

const TRAIL = [
  { cx: 14, cy: 76, radius: 1.5 },
  { cx: 24, cy: 70, radius: 2 },
  { cx: 34, cy: 64, radius: 2.5 },
  { cx: 42, cy: 58, radius: 3 },
  { cx: 50, cy: 50, radius: 4 },
  { cx: 58, cy: 42, radius: 5 },
  { cx: 66, cy: 32, radius: 6 },
]

export function CCMark({ size = 24 }: CCMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 96 96"
      aria-hidden
      focusable="false"
    >
      <rect width="96" height="96" fill="var(--bg)" rx="16" />
      <circle cx="72" cy="24" r="20" fill="var(--accent)" opacity="0.22" />
      <circle cx="72" cy="24" r="12" fill="var(--accent)" opacity="0.42" />
      <circle cx="72" cy="24" r="7" fill="var(--signal)" />
      {TRAIL.map((dot, idx) => (
        <circle
          key={idx}
          cx={dot.cx}
          cy={dot.cy}
          r={dot.radius}
          fill="var(--signal)"
          opacity={0.35 + idx * 0.09}
        />
      ))}
    </svg>
  )
}
```

- [ ] **Step 2: Delete the old file**

```bash
rm apps/web/src/components/consumer/cc-mark/CCMark.tsx
rmdir apps/web/src/components/consumer/cc-mark
```

- [ ] **Step 3: Update AppHeader.tsx import**

In `apps/web/src/components/consumer/app-header/AppHeader.tsx`, change:

```tsx
import { CCMark } from '../cc-mark'
```

to:

```tsx
import { CCMark } from '@/components/brand/cc-mark'
```

- [ ] **Step 4: Verify no broken imports remain**

```bash
cd apps/web && grep -r "consumer/cc-mark\|from '../cc-mark'" src/ --include="*.tsx" --include="*.ts"
```

Expected: no output (zero matches).

- [ ] **Step 5: Run typecheck**

```bash
cd apps/web && pnpm typecheck
```

Expected: exits with no errors.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/brand/cc-mark/CCMark.tsx \
        apps/web/src/components/consumer/app-header/AppHeader.tsx
git rm apps/web/src/components/consumer/cc-mark/CCMark.tsx
git commit -m "refactor(brand): move CCMark to components/brand — canonical shared asset"
```

---

## Task 3: Wire CCMark + CCWordmark into AdminSidebar

**Files:**
- Modify: `apps/web/src/components/admin/shell/AdminSidebar.tsx`

Replace the duplicate inline SVG logo (appears in both full and rail mode) and the inline wordmark text with `CCMark` and `CCWordmark`. Also add the OPERATIONS section label in this task since it's in the same file.

`CCMark` uses `var(--bg)` for its background rect. In the admin sidebar the outer sidebar `background` is `var(--bg-elevated)`. Wrap `CCMark` in an `overflow: hidden` container with `borderRadius: 8` so the mark's internal rounded rect is clipped cleanly — matching the consumer AppHeader pattern.

`CCWordmark` renders `concert<accent>crawl.</accent>` in Inter 900 weight at a configurable `size`. Use `size={13}` to match the current sidebar wordmark (13px). Keep the existing ADMIN badge below it.

- [ ] **Step 1: Add imports at the top of AdminSidebar.tsx**

The current import block begins with:

```tsx
'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useClerk } from '@clerk/nextjs'
import * as LucideIcons from 'lucide-react'
import { LogOut } from 'lucide-react'
import { NAV, type NavItem } from './nav'
```

Add two new imports after the `NAV` import line:

```tsx
import { CCMark } from '@/components/brand/cc-mark'
import { CCWordmark } from '@/components/brand/cc-wordmark'
```

- [ ] **Step 2: Replace the full-mode logo block**

Find this block in `AdminSidebar.tsx` (inside the `{effectiveMode === 'full' ? (` branch, starting at the `{/* Logo mark */}` comment):

```tsx
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Logo mark */}
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: '#0d0c09',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <circle cx="9" cy="9" r="2.5" fill="#c89bf0" />
                <circle cx="3" cy="4" r="1.5" fill="#7ab4ff" opacity="0.8" />
                <circle cx="15" cy="3" r="1" fill="#c89bf0" opacity="0.6" />
                <circle cx="14" cy="14" r="1.5" fill="#7ab4ff" opacity="0.7" />
                <circle cx="4" cy="13" r="1" fill="#c89bf0" opacity="0.5" />
                <line
                  x1="3"
                  y1="4"
                  x2="9"
                  y2="9"
                  stroke="#7ab4ff"
                  strokeWidth="0.75"
                  opacity="0.4"
                />
                <line
                  x1="9"
                  y1="9"
                  x2="14"
                  y2="14"
                  stroke="#c89bf0"
                  strokeWidth="0.75"
                  opacity="0.4"
                />
                <line
                  x1="15"
                  y1="3"
                  x2="9"
                  y2="9"
                  stroke="#7ab4ff"
                  strokeWidth="0.75"
                  opacity="0.4"
                />
              </svg>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <div
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 800,
                  fontSize: 13,
                  lineHeight: 1,
                  letterSpacing: '-0.02em',
                }}
              >
                <span style={{ color: 'var(--fg)' }}>concert</span>
                <span style={{ color: 'var(--accent)' }}>crawl.</span>
              </div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  height: 14,
                  padding: '0 5px',
                  borderRadius: 999,
                  background: 'rgba(122,58,168,0.18)',
                  color: 'var(--accent)',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 9,
                  fontWeight: 700,
                  textTransform: 'uppercase' as const,
                  letterSpacing: '0.08em',
                  alignSelf: 'flex-start',
                }}
              >
                ADMIN
              </div>
            </div>
          </div>
```

Replace it with:

```tsx
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                overflow: 'hidden',
                flexShrink: 0,
              }}
            >
              <CCMark size={32} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <CCWordmark size={13} />
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  height: 14,
                  padding: '0 5px',
                  borderRadius: 999,
                  background: 'rgba(122,58,168,0.18)',
                  color: 'var(--accent)',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 9,
                  fontWeight: 700,
                  textTransform: 'uppercase' as const,
                  letterSpacing: '0.08em',
                  alignSelf: 'flex-start',
                }}
              >
                ADMIN
              </div>
            </div>
          </div>
```

- [ ] **Step 3: Replace the rail-mode logo block**

Find this block (inside the `else` branch of `effectiveMode === 'full'`):

```tsx
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: '#0d0c09',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <circle cx="9" cy="9" r="2.5" fill="#c89bf0" />
              <circle cx="3" cy="4" r="1.5" fill="#7ab4ff" opacity="0.8" />
              <circle cx="15" cy="3" r="1" fill="#c89bf0" opacity="0.6" />
              <circle cx="14" cy="14" r="1.5" fill="#7ab4ff" opacity="0.7" />
              <circle cx="4" cy="13" r="1" fill="#c89bf0" opacity="0.5" />
              <line
                x1="3"
                y1="4"
                x2="9"
                y2="9"
                stroke="#7ab4ff"
                strokeWidth="0.75"
                opacity="0.4"
              />
              <line
                x1="9"
                y1="9"
                x2="14"
                y2="14"
                stroke="#c89bf0"
                strokeWidth="0.75"
                opacity="0.4"
              />
              <line
                x1="15"
                y1="3"
                x2="9"
                y2="9"
                stroke="#7ab4ff"
                strokeWidth="0.75"
                opacity="0.4"
              />
            </svg>
          </div>
```

Replace it with:

```tsx
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              overflow: 'hidden',
            }}
          >
            <CCMark size={32} />
          </div>
```

- [ ] **Step 4: Add the OPERATIONS section label**

Find this block in the `NAV.map(...)` render:

```tsx
              {isNewSection &&
                effectiveMode === 'full' &&
                item.section === 'account' && (
                  <>
                    <div
                      style={{
                        height: 1,
                        background: 'var(--border)',
                        margin: '6px 0',
                      }}
                    />
                    <div
                      style={{
                        padding: '4px 10px',
                        fontSize: 10,
                        fontWeight: 700,
                        color: 'var(--fg-subtle)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                      }}
                    >
                      Account
                    </div>
                  </>
                )}
```

Replace it with:

```tsx
              {isNewSection && effectiveMode === 'full' && (
                <>
                  {item.section === 'account' && (
                    <div
                      style={{
                        height: 1,
                        background: 'var(--border)',
                        margin: '6px 0',
                      }}
                    />
                  )}
                  <div
                    style={{
                      padding: '4px 10px',
                      fontSize: 10,
                      fontWeight: 700,
                      color: 'var(--fg-subtle)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                    }}
                  >
                    {item.section === 'account' ? 'Account' : 'Operations'}
                  </div>
                </>
              )}
```

- [ ] **Step 5: Run typecheck**

```bash
cd apps/web && pnpm typecheck
```

Expected: exits with no errors.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/admin/shell/AdminSidebar.tsx
git commit -m "fix(admin): use CCMark/CCWordmark in sidebar header; add OPERATIONS section label"
```

---

## Task 4: Fix Invite Codes icon

**Files:**
- Modify: `apps/web/src/components/admin/shell/nav.ts`
- Create: `apps/web/src/components/admin/shell/nav.test.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/components/admin/shell/nav.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { NAV } from './nav'

describe('NAV config', () => {
  it('invite-codes item uses Key icon', () => {
    const item = NAV.find((navItem) => navItem.key === 'invite-codes')
    expect(item).toBeDefined()
    expect(item?.iconName).toBe('Key')
  })

  it('all operations items come before account items', () => {
    const sections = NAV.map((navItem) => navItem.section)
    const firstAccount = sections.indexOf('account')
    const lastOperations = sections.lastIndexOf('operations')
    expect(lastOperations).toBeLessThan(firstAccount)
  })

  it('dashboard is the first nav item', () => {
    expect(NAV[0]?.key).toBe('dashboard')
  })
})
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
cd apps/web && pnpm vitest run src/components/admin/shell/nav.test.ts
```

Expected: FAIL — `expect('Ticket').toBe('Key')`

- [ ] **Step 3: Fix the icon in nav.ts**

In `apps/web/src/components/admin/shell/nav.ts`, find the invite-codes entry:

```ts
  {
    key: 'invite-codes',
    label: 'Invite codes',
    href: '/admin/invite-codes',
    iconName: 'Ticket',
    section: 'operations',
  },
```

Change `iconName: 'Ticket'` to `iconName: 'Key'`:

```ts
  {
    key: 'invite-codes',
    label: 'Invite codes',
    href: '/admin/invite-codes',
    iconName: 'Key',
    section: 'operations',
  },
```

- [ ] **Step 4: Run the test to confirm it passes**

```bash
cd apps/web && pnpm vitest run src/components/admin/shell/nav.test.ts
```

Expected: all 3 tests PASS.

- [ ] **Step 5: Run the full web test suite**

```bash
cd apps/web && pnpm test
```

Expected: all tests pass, no regressions.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/admin/shell/nav.ts \
        apps/web/src/components/admin/shell/nav.test.ts
git commit -m "fix(admin): swap Invite Codes icon Ticket → Key; add nav config tests"
```

---

## Task 5: Final checks and close issue

- [ ] **Step 1: Run full typecheck**

```bash
cd apps/web && pnpm typecheck
```

Expected: exits with no errors.

- [ ] **Step 2: Run full lint**

```bash
cd apps/web && pnpm lint
```

Expected: exits with no errors.

- [ ] **Step 3: Run full test suite**

```bash
pnpm --filter @concert-crawl/web test
```

Expected: all tests pass.

- [ ] **Step 4: Push branch**

```bash
git push -u origin fix/admin-sidebar-polish
```

- [ ] **Step 5: Open PR referencing issue #139**

Use the PR template at `.github/pull_request_template.md`. Include `Closes #139` in the body.
