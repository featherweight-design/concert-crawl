# Phase 7.6 — Admin UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the admin UI to match `design/design_handoff_admin_ui/` — isolated token system, new primitives kit, three-mode sidebar, and fully wired pages for Dashboard, Crawl, Events, Venues, Prices, and Invite Codes.

**Architecture:** Admin tokens (light/dark) are scoped via `data-admin-theme` on the layout root div — fully isolated from the consumer `data-theme` system. A `primitives/` layer provides atomic components. Pages replace existing placeholder content with real API data via the existing `/v1/admin/*` endpoints. No new API routes needed.

**Tech Stack:** Next.js App Router (server + client components), Tailwind CSS (admin tokens as CSS vars), Lucide React (icons), existing `/v1/admin/*` Hono API, `apiClient` + `auth()` pattern already in use.

**Design reference:** `design/design_handoff_admin_ui/README.md` — canonical. All token values, copy, column orders, and component states are defined there. Cross-reference `admin-theme.jsx`, `admin-primitives.jsx`, `admin-shell.jsx`, `admin-dashboard.jsx`, `admin-crawl.jsx`, `admin-events.jsx`, `admin-tables.jsx`.

**Branch:** `feat/phase-76-admin-ui-redesign`
**Worktree:** `.worktrees/phase-76-admin-ui-redesign`

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `apps/web/src/app/(protected)/admin/admin.css` | Admin CSS token definitions (light + dark themes) |
| Modify | `apps/web/src/app/(protected)/admin/layout.tsx` | Add `data-admin-theme`, import admin.css, rebuild shell |
| Create | `apps/web/src/components/admin/primitives/index.ts` | Barrel export for all primitives |
| Create | `apps/web/src/components/admin/primitives/StatusBadge.tsx` | Status badge with kind × variant matrix |
| Create | `apps/web/src/components/admin/primitives/AdminButton.tsx` | Button variants: primary/outline/ghost/danger/success |
| Create | `apps/web/src/components/admin/primitives/MonoLabel.tsx` | Uppercase mono eyebrow label |
| Create | `apps/web/src/components/admin/primitives/CostText.tsx` | Money formatter — always 2 decimals, mono |
| Create | `apps/web/src/components/admin/primitives/RelTime.tsx` | Relative time display (client component) |
| Create | `apps/web/src/components/admin/primitives/ProgressBar.tsx` | Tinted progress bar with optional label |
| Create | `apps/web/src/components/admin/primitives/StatCard.tsx` | Stat card with icon chip, trend, footer slot |
| Create | `apps/web/src/components/admin/primitives/Panel.tsx` | Titled panel wrapper with optional action |
| Create | `apps/web/src/components/admin/primitives/AdminTable.tsx` | Table primitives: AdminTable, THead, TR, TH, TD |
| Create | `apps/web/src/components/admin/primitives/Sparkline.tsx` | 80×24 inline SVG sparkline |
| Create | `apps/web/src/components/admin/primitives/ConfidenceBar.tsx` | 4px bar + numeric readout for confidence scores |
| Create | `apps/web/src/components/admin/primitives/Kbd.tsx` | Keyboard key badge |
| Create | `apps/web/src/components/admin/primitives/SectionHead.tsx` | Page H1 with eyebrow + action cluster |
| Create | `apps/web/src/components/admin/primitives/primitives.test.ts` | Unit tests for pure logic (CostText, ConfidenceBar color) |
| Create | `apps/web/src/components/admin/shell/AdminSidebar.tsx` | 3-mode sidebar (full/rail/auto) + localStorage |
| Create | `apps/web/src/components/admin/shell/AdminTopbar.tsx` | Breadcrumb + theme toggle + inbox toggle + account |
| Create | `apps/web/src/components/admin/shell/InboxPanel.tsx` | Slide-in inbox panel |
| Create | `apps/web/src/components/admin/shell/AdminThemeProvider.tsx` | Client component: reads/writes cc-admin-theme localStorage |
| Create | `apps/web/src/components/admin/shell/nav.ts` | NAV const — route definitions with icons and badge kinds |
| Modify | `apps/web/src/app/(protected)/admin/page.tsx` | Dashboard: greeting + stat row + cost panel + health + activity |
| Modify | `apps/web/src/app/(protected)/admin/crawl/page.tsx` | Crawl: running banner + stat row + split view + run history |
| Modify | `apps/web/src/app/(protected)/admin/events/page.tsx` | Events: filter rail + split view + bulk action bar + kbd nav |
| Modify | `apps/web/src/app/(protected)/admin/venues/page.tsx` | Venues: stat row + big table |
| Modify | `apps/web/src/app/(protected)/admin/prices/page.tsx` | Prices: stat row + activity table with sparklines |
| Modify | `apps/web/src/app/(protected)/admin/invite-codes/page.tsx` | Invites: stat row + creator panel + code log table |

---

## Task 1: Worktree + admin CSS token system

**Files:**
- Create: `.worktrees/phase-76-admin-ui-redesign/` (via git worktree)
- Create: `apps/web/src/app/(protected)/admin/admin.css`
- Modify: `apps/web/src/app/(protected)/admin/layout.tsx`

- [ ] **Step 1: Create worktree**

```bash
git worktree add .worktrees/phase-76-admin-ui-redesign -b feat/phase-76-admin-ui-redesign
cd .worktrees/phase-76-admin-ui-redesign
```

- [ ] **Step 2: Create `admin.css`**

Create `apps/web/src/app/(protected)/admin/admin.css`:

```css
/* Admin-only design tokens — isolated from consumer theme system.
   Scoped to [data-admin-theme] on the layout root div.
   Never import this file outside the admin route group. */

[data-admin-theme="light"] {
  --bg: #f7f5f0;
  --bg-elevated: #ffffff;
  --surface-1: #f0ede5;
  --surface-2: #e6e2d8;
  --ink: #1f1d18;
  --paper: #f7f5f0;

  --fg: #1f1d18;
  --fg-muted: #5e5a52;
  --fg-subtle: #8a857a;
  --fg-on-accent: #ffffff;

  --border: #e2dfd6;
  --border-strong: #c9c5b8;
  --overlay-hover: rgba(31, 29, 24, 0.05);

  --success: #2f7a4d;
  --warning: #b87514;
  --danger: #b8381a;
  --signal: #1d5fbf;
  --accent: #7a3aa8;

  --shadow-sm: 0 1px 2px rgba(31, 29, 24, 0.06);
  --shadow-md: 0 4px 12px rgba(31, 29, 24, 0.08);
  --shadow-lg: 0 12px 32px rgba(31, 29, 24, 0.16);
}

[data-admin-theme="dark"] {
  --bg: #15140f;
  --bg-elevated: #1c1a14;
  --surface-1: #23211a;
  --surface-2: #2c2922;
  --ink: #eeeae0;
  --paper: #15140f;

  --fg: #eeeae0;
  --fg-muted: #9b968a;
  --fg-subtle: #6c6759;
  --fg-on-accent: #ffffff;

  --border: #2f2c24;
  --border-strong: #48443a;
  --overlay-hover: rgba(238, 234, 224, 0.05);

  --success: #5fc28a;
  --warning: #e2a04a;
  --danger: #ea6d50;
  --signal: #7ab4ff;
  --accent: #c89bf0;

  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.4);
  --shadow-lg: 0 12px 32px rgba(0, 0, 0, 0.5);
}
```

- [ ] **Step 3: Update layout.tsx to import CSS and add theme wrapper**

Replace `apps/web/src/app/(protected)/admin/layout.tsx`:

```tsx
import './admin.css'
import { requireAdminUser } from '@/lib/auth'
import { AdminThemeProvider } from '@/components/admin/shell/AdminThemeProvider'
import { AdminSidebar } from '@/components/admin/shell/AdminSidebar'
import { AdminTopbar } from '@/components/admin/shell/AdminTopbar'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireAdminUser()

  return (
    <AdminThemeProvider>
      <div className="flex h-screen overflow-hidden bg-[var(--bg)] text-[var(--fg)]">
        <AdminSidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <AdminTopbar />
          <main className="flex-1 overflow-y-auto p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </AdminThemeProvider>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/(protected)/admin/admin.css \
        apps/web/src/app/(protected)/admin/layout.tsx
git commit -m "feat: admin CSS token system — light/dark themes, isolated from consumer"
```

---

## Task 2: Primitives — atomic components

**Files:**
- Create: `apps/web/src/components/admin/primitives/StatusBadge.tsx`
- Create: `apps/web/src/components/admin/primitives/AdminButton.tsx`
- Create: `apps/web/src/components/admin/primitives/MonoLabel.tsx`
- Create: `apps/web/src/components/admin/primitives/CostText.tsx`
- Create: `apps/web/src/components/admin/primitives/RelTime.tsx`
- Create: `apps/web/src/components/admin/primitives/ProgressBar.tsx`
- Create: `apps/web/src/components/admin/primitives/Kbd.tsx`
- Create: `apps/web/src/components/admin/primitives/primitives.test.ts`

- [ ] **Step 1: Write failing tests**

Create `apps/web/src/components/admin/primitives/primitives.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { formatCost, confidenceColor } from './utils'

describe('formatCost', () => {
  it('formats zero as $0.00', () => {
    expect(formatCost(0)).toBe('$0.00')
  })
  it('formats positive value with 2 decimal places', () => {
    expect(formatCost(28.7)).toBe('$28.70')
    expect(formatCost(28.74)).toBe('$28.74')
  })
  it('formats sub-cent values rounded', () => {
    expect(formatCost(0.001)).toBe('$0.00')
    expect(formatCost(0.005)).toBe('$0.01')
  })
})

describe('confidenceColor', () => {
  it('returns success for >= 0.80', () => {
    expect(confidenceColor(0.80)).toBe('success')
    expect(confidenceColor(1.0)).toBe('success')
  })
  it('returns signal for >= 0.70', () => {
    expect(confidenceColor(0.70)).toBe('signal')
    expect(confidenceColor(0.79)).toBe('signal')
  })
  it('returns warning for >= 0.60', () => {
    expect(confidenceColor(0.60)).toBe('warning')
    expect(confidenceColor(0.69)).toBe('warning')
  })
  it('returns danger for < 0.60', () => {
    expect(confidenceColor(0.59)).toBe('danger')
    expect(confidenceColor(0)).toBe('danger')
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
pnpm --filter @concert-crawl/web test run
```

Expected: fail with `Cannot find module './utils'`

- [ ] **Step 3: Create `utils.ts`**

Create `apps/web/src/components/admin/primitives/utils.ts`:

```typescript
export const formatCost = (value: number): string =>
  `$${value.toFixed(2)}`

export type StatusKind = 'success' | 'warning' | 'danger' | 'signal' | 'accent' | 'neutral'

export const confidenceColor = (score: number): StatusKind => {
  if (score >= 0.8) return 'success'
  if (score >= 0.7) return 'signal'
  if (score >= 0.6) return 'warning'
  return 'danger'
}

export const KIND_COLORS: Record<StatusKind, { bg: string; fg: string; border: string }> = {
  success: { bg: 'rgba(47,122,77,0.12)', fg: 'var(--success)', border: 'rgba(47,122,77,0.25)' },
  warning: { bg: 'rgba(184,117,20,0.12)', fg: 'var(--warning)', border: 'rgba(184,117,20,0.25)' },
  danger:  { bg: 'rgba(184,56,26,0.12)',  fg: 'var(--danger)',  border: 'rgba(184,56,26,0.25)' },
  signal:  { bg: 'rgba(29,95,191,0.12)',  fg: 'var(--signal)',  border: 'rgba(29,95,191,0.25)' },
  accent:  { bg: 'rgba(122,58,168,0.12)', fg: 'var(--accent)',  border: 'rgba(122,58,168,0.25)' },
  neutral: { bg: 'rgba(90,86,76,0.10)',   fg: 'var(--fg-muted)',border: 'var(--border)' },
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
pnpm --filter @concert-crawl/web test run
```

Expected: all tests pass

- [ ] **Step 5: Create `StatusBadge.tsx`**

Create `apps/web/src/components/admin/primitives/StatusBadge.tsx`:

```tsx
import { KIND_COLORS, type StatusKind } from './utils'

interface StatusBadgeProps {
  kind?: StatusKind
  variant?: 'soft' | 'outline' | 'mono'
  dot?: boolean
  children: React.ReactNode
}

export const StatusBadge = ({
  kind = 'neutral',
  variant = 'soft',
  dot = false,
  children,
}: StatusBadgeProps) => {
  const colors = KIND_COLORS[kind]
  const isMono = variant === 'mono'
  const isOutline = variant === 'outline'

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: isMono ? '2px 6px' : '3px 8px',
        borderRadius: 999,
        fontSize: isMono ? 10 : 11,
        fontWeight: isMono ? 600 : 600,
        fontFamily: isMono ? "'JetBrains Mono', monospace" : "'Inter', sans-serif",
        letterSpacing: isMono ? '0.02em' : '0.01em',
        textTransform: isMono ? 'lowercase' : undefined,
        color: colors.fg,
        background: isOutline ? 'transparent' : colors.bg,
        border: `1px solid ${isOutline ? colors.border : 'transparent'}`,
        whiteSpace: 'nowrap',
      }}
    >
      {dot && (
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: colors.fg,
            flexShrink: 0,
          }}
        />
      )}
      {children}
    </span>
  )
}
```

- [ ] **Step 6: Create remaining atomic components**

Create `apps/web/src/components/admin/primitives/AdminButton.tsx`:

```tsx
import { type ButtonHTMLAttributes } from 'react'
import { type LucideIcon } from 'lucide-react'

interface AdminButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'ghost' | 'danger' | 'success'
  size?: 'sm' | 'md'
  icon?: LucideIcon
  iconRight?: LucideIcon
  fullWidth?: boolean
}

const VARIANT_STYLES: Record<NonNullable<AdminButtonProps['variant']>, React.CSSProperties> = {
  primary: { background: 'var(--signal)', color: 'var(--fg-on-accent)', border: '1px solid transparent' },
  outline: { background: 'transparent', color: 'var(--fg)', border: '1px solid var(--border-strong)' },
  ghost:   { background: 'transparent', color: 'var(--fg-muted)', border: '1px solid transparent' },
  danger:  { background: 'rgba(184,56,26,0.1)', color: 'var(--danger)', border: '1px solid rgba(184,56,26,0.25)' },
  success: { background: 'rgba(47,122,77,0.1)', color: 'var(--success)', border: '1px solid rgba(47,122,77,0.25)' },
}

export const AdminButton = ({
  variant = 'outline',
  size = 'md',
  icon: Icon,
  iconRight: IconRight,
  fullWidth = false,
  children,
  style,
  ...props
}: AdminButtonProps) => {
  const height = size === 'sm' ? 28 : 32
  const px = size === 'sm' ? 10 : 12
  const fontSize = size === 'sm' ? 12 : 13

  return (
    <button
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        height,
        padding: `0 ${px}px`,
        borderRadius: 6,
        fontSize,
        fontWeight: 500,
        fontFamily: "'Inter', sans-serif",
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        width: fullWidth ? '100%' : undefined,
        ...VARIANT_STYLES[variant],
        ...style,
      }}
      {...props}
    >
      {Icon && <Icon size={14} />}
      {children}
      {IconRight && <IconRight size={14} />}
    </button>
  )
}
```

Create `apps/web/src/components/admin/primitives/MonoLabel.tsx`:

```tsx
interface MonoLabelProps {
  children: React.ReactNode
}

export const MonoLabel = ({ children }: MonoLabelProps) => (
  <span
    style={{
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 10,
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.1em',
      color: 'var(--fg-subtle)',
    }}
  >
    {children}
  </span>
)
```

Create `apps/web/src/components/admin/primitives/CostText.tsx`:

```tsx
import { formatCost } from './utils'

interface CostTextProps {
  value: number
  dim?: boolean
}

export const CostText = ({ value, dim }: CostTextProps) => (
  <span
    style={{
      fontFamily: "'JetBrains Mono', monospace",
      fontVariantNumeric: 'tabular-nums',
      color: value === 0 || dim ? 'var(--fg-subtle)' : 'var(--fg)',
    }}
  >
    {formatCost(value)}
  </span>
)
```

Create `apps/web/src/components/admin/primitives/RelTime.tsx`:

```tsx
'use client'

import { useEffect, useState } from 'react'

interface RelTimeProps {
  iso: string
}

const toRel = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export const RelTime = ({ iso }: RelTimeProps) => {
  const [label, setLabel] = useState(toRel(iso))

  useEffect(() => {
    const interval = setInterval(() => setLabel(toRel(iso)), 30_000)
    return () => clearInterval(interval)
  }, [iso])

  return (
    <time
      dateTime={iso}
      title={new Date(iso).toLocaleString()}
      style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--fg-muted)' }}
    >
      {label}
    </time>
  )
}
```

Create `apps/web/src/components/admin/primitives/ProgressBar.tsx`:

```tsx
import type { StatusKind } from './utils'

interface ProgressBarProps {
  value: number
  kind?: StatusKind
  showLabel?: boolean
}

const KIND_STROKE: Record<StatusKind, string> = {
  success: 'var(--success)',
  warning: 'var(--warning)',
  danger:  'var(--danger)',
  signal:  'var(--signal)',
  accent:  'var(--accent)',
  neutral: 'var(--fg-subtle)',
}

export const ProgressBar = ({ value, kind = 'signal', showLabel = false }: ProgressBarProps) => {
  const clamped = Math.min(100, Math.max(0, value))
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div
        style={{
          flex: 1,
          height: 4,
          borderRadius: 999,
          background: 'var(--surface-2)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${clamped}%`,
            height: '100%',
            background: KIND_STROKE[kind],
            borderRadius: 999,
          }}
        />
      </div>
      {showLabel && (
        <span style={{ fontSize: 11, color: 'var(--fg-muted)', fontVariantNumeric: 'tabular-nums', minWidth: 32 }}>
          {clamped}%
        </span>
      )}
    </div>
  )
}
```

Create `apps/web/src/components/admin/primitives/Kbd.tsx`:

```tsx
export const Kbd = ({ children }: { children: React.ReactNode }) => (
  <kbd
    style={{
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 10,
      fontWeight: 600,
      padding: '2px 5px',
      borderRadius: 4,
      background: 'var(--surface-1)',
      border: '1px solid var(--border)',
      color: 'var(--fg-muted)',
    }}
  >
    {children}
  </kbd>
)
```

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/components/admin/primitives/
git commit -m "feat: admin primitives kit — atomic components (StatusBadge, AdminButton, CostText, RelTime, ProgressBar, Kbd, MonoLabel)"
```

---

## Task 3: Primitives — complex components

**Files:**
- Create: `apps/web/src/components/admin/primitives/StatCard.tsx`
- Create: `apps/web/src/components/admin/primitives/Panel.tsx`
- Create: `apps/web/src/components/admin/primitives/AdminTable.tsx`
- Create: `apps/web/src/components/admin/primitives/Sparkline.tsx`
- Create: `apps/web/src/components/admin/primitives/ConfidenceBar.tsx`
- Create: `apps/web/src/components/admin/primitives/SectionHead.tsx`
- Create: `apps/web/src/components/admin/primitives/index.ts`

- [ ] **Step 1: Create `StatCard.tsx`**

```tsx
import type { LucideIcon } from 'lucide-react'
import type { StatusKind } from './utils'
import { KIND_COLORS } from './utils'

interface StatCardProps {
  label: string
  value: string
  unit?: string
  hint?: string
  trend?: { dir: 'up' | 'down'; text: string; good: boolean }
  kind?: StatusKind
  icon: LucideIcon
  footer?: React.ReactNode
  onClick?: () => void
}

export const StatCard = ({
  label,
  value,
  unit,
  hint,
  trend,
  kind = 'neutral',
  icon: Icon,
  footer,
  onClick,
}: StatCardProps) => {
  const colors = KIND_COLORS[kind]

  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: '16px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        cursor: onClick ? 'pointer' : undefined,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg-muted)', marginBottom: 6 }}>
            {label}
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 30,
              fontWeight: 700,
              fontVariantNumeric: 'tabular-nums',
              lineHeight: 1,
              color: 'var(--fg)',
            }}>
              {value}
            </span>
            {unit && (
              <span style={{ fontSize: 13, color: 'var(--fg-muted)' }}>{unit}</span>
            )}
            {trend && (
              <span style={{
                fontSize: 11,
                fontWeight: 600,
                color: trend.good ? 'var(--success)' : 'var(--danger)',
              }}>
                {trend.text}
              </span>
            )}
          </div>
          {hint && (
            <div style={{ marginTop: 4, fontSize: 12, color: 'var(--fg-muted)' }}>{hint}</div>
          )}
        </div>
        <div style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          background: colors.bg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Icon size={18} color={colors.fg} />
        </div>
      </div>
      {footer && <div>{footer}</div>}
    </div>
  )
}
```

- [ ] **Step 2: Create `Panel.tsx`**

```tsx
interface PanelProps {
  title?: string
  action?: React.ReactNode
  padding?: number | string
  children: React.ReactNode
}

export const Panel = ({ title, action, padding = '16px', children }: PanelProps) => (
  <div
    style={{
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      overflow: 'hidden',
    }}
  >
    {title && (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 16px',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg)' }}>{title}</span>
        {action && <div>{action}</div>}
      </div>
    )}
    <div style={{ padding }}>{children}</div>
  </div>
)
```

- [ ] **Step 3: Create `AdminTable.tsx`**

```tsx
import { cn } from '@/lib/utils'

export const AdminTable = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div style={{ overflowX: 'auto' }}>
    <table
      className={cn(className)}
      style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, color: 'var(--fg)' }}
    >
      {children}
    </table>
  </div>
)

export const THead = ({ children }: { children: React.ReactNode }) => (
  <thead style={{ background: 'var(--surface-1)' }}>{children}</thead>
)

export const TR = ({ children, active }: { children: React.ReactNode; active?: boolean }) => (
  <tr
    style={{
      borderBottom: '1px solid var(--border)',
      background: active ? 'var(--surface-2)' : undefined,
      borderLeft: active ? '2px solid var(--signal)' : '2px solid transparent',
    }}
    onMouseEnter={(ev) => {
      if (!active) (ev.currentTarget as HTMLElement).style.background = 'var(--overlay-hover)'
    }}
    onMouseLeave={(ev) => {
      if (!active) (ev.currentTarget as HTMLElement).style.background = ''
    }}
  >
    {children}
  </tr>
)

interface THProps {
  children?: React.ReactNode
  align?: 'left' | 'center' | 'right'
  mono?: boolean
  width?: number | string
}

export const TH = ({ children, align = 'left', mono, width }: THProps) => (
  <th
    style={{
      padding: '10px 14px',
      textAlign: align,
      fontFamily: mono ? "'JetBrains Mono', monospace" : "'Inter', sans-serif",
      fontSize: 11,
      fontWeight: 600,
      color: 'var(--fg-muted)',
      textTransform: 'uppercase',
      letterSpacing: '0.04em',
      whiteSpace: 'nowrap',
      width,
    }}
  >
    {children}
  </th>
)

interface TDProps {
  children?: React.ReactNode
  align?: 'left' | 'center' | 'right'
  mono?: boolean
  color?: string
  width?: number | string
  colSpan?: number
}

export const TD = ({ children, align = 'left', mono, color, width, colSpan }: TDProps) => (
  <td
    colSpan={colSpan}
    style={{
      padding: '12px 14px',
      textAlign: align,
      fontFamily: mono ? "'JetBrains Mono', monospace" : "'Inter', sans-serif",
      fontVariantNumeric: mono ? 'tabular-nums' : undefined,
      color: color ?? 'var(--fg)',
      width,
    }}
  >
    {children}
  </td>
)
```

- [ ] **Step 4: Create `Sparkline.tsx`**

```tsx
interface SparklineProps {
  data: number[]
  flag?: 'spike' | 'soldout' | null
  width?: number
  height?: number
}

export const Sparkline = ({ data, flag, width = 80, height = 24 }: SparklineProps) => {
  if (!data.length) return <div style={{ width, height }} />

  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1

  const points = data.map((val, idx) => {
    const xx = (idx / (data.length - 1)) * width
    const yy = height - ((val - min) / range) * (height - 4) - 2
    return `${xx},${yy}`
  })

  const color = flag === 'spike' ? 'var(--danger)' : flag === 'soldout' ? 'var(--fg-subtle)' : 'var(--signal)'
  const lastX = (data.length - 1) / (data.length - 1) * width
  const lastY = height - ((data[data.length - 1]! - min) / range) * (height - 4) - 2

  return (
    <svg width={width} height={height} style={{ display: 'block', overflow: 'visible' }}>
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx={lastX} cy={lastY} r={1.6} fill={color} />
    </svg>
  )
}
```

- [ ] **Step 5: Create `ConfidenceBar.tsx`**

```tsx
import { confidenceColor } from './utils'
import { KIND_COLORS } from './utils'

interface ConfidenceBarProps {
  score: number
}

export const ConfidenceBar = ({ score }: ConfidenceBarProps) => {
  const kind = confidenceColor(score)
  const color = KIND_COLORS[kind].fg

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 4, borderRadius: 999, background: 'var(--surface-2)', overflow: 'hidden' }}>
        <div style={{ width: `${score * 100}%`, height: '100%', background: color, borderRadius: 999 }} />
      </div>
      <span style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 11,
        color,
        fontVariantNumeric: 'tabular-nums',
        minWidth: 32,
        textAlign: 'right',
      }}>
        {score.toFixed(2)}
      </span>
    </div>
  )
}
```

- [ ] **Step 6: Create `SectionHead.tsx`**

```tsx
interface SectionHeadProps {
  eyebrow?: string
  title: string
  actions?: React.ReactNode
}

export const SectionHead = ({ eyebrow, title, actions }: SectionHeadProps) => (
  <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
    <div>
      {eyebrow && (
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          color: 'var(--fg-subtle)',
          marginBottom: 4,
        }}>
          {eyebrow}
        </div>
      )}
      <h1 style={{
        margin: 0,
        fontFamily: "'Inter', sans-serif",
        fontSize: 26,
        fontWeight: 700,
        letterSpacing: '-0.025em',
        color: 'var(--fg)',
      }}>
        {title}
      </h1>
    </div>
    {actions && (
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        {actions}
      </div>
    )}
  </div>
)
```

- [ ] **Step 7: Create barrel export `index.ts`**

```typescript
export { StatusBadge } from './StatusBadge'
export { AdminButton } from './AdminButton'
export { MonoLabel } from './MonoLabel'
export { CostText } from './CostText'
export { RelTime } from './RelTime'
export { ProgressBar } from './ProgressBar'
export { Kbd } from './Kbd'
export { StatCard } from './StatCard'
export { Panel } from './Panel'
export { AdminTable, THead, TR, TH, TD } from './AdminTable'
export { Sparkline } from './Sparkline'
export { ConfidenceBar } from './ConfidenceBar'
export { SectionHead } from './SectionHead'
export type { StatusKind } from './utils'
export { formatCost, confidenceColor } from './utils'
```

- [ ] **Step 8: Run tests**

```bash
pnpm --filter @concert-crawl/web test run
```

Expected: all pass

- [ ] **Step 9: Commit**

```bash
git add apps/web/src/components/admin/primitives/
git commit -m "feat: admin primitives — StatCard, Panel, AdminTable, Sparkline, ConfidenceBar, SectionHead"
```

---

## Task 4: Admin shell — ThemeProvider + Sidebar + Topbar

**Files:**
- Create: `apps/web/src/components/admin/shell/AdminThemeProvider.tsx`
- Create: `apps/web/src/components/admin/shell/nav.ts`
- Create: `apps/web/src/components/admin/shell/AdminSidebar.tsx`
- Create: `apps/web/src/components/admin/shell/AdminTopbar.tsx`
- Create: `apps/web/src/components/admin/shell/InboxPanel.tsx`

- [ ] **Step 1: Create `AdminThemeProvider.tsx`**

```tsx
'use client'

import { createContext, useContext, useEffect, useState } from 'react'

type AdminTheme = 'light' | 'dark'
const STORAGE_KEY = 'cc-admin-theme'

const ThemeContext = createContext<{
  theme: AdminTheme
  toggle: () => void
}>({ theme: 'light', toggle: () => {} })

export const useAdminTheme = () => useContext(ThemeContext)

export const AdminThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setTheme] = useState<AdminTheme>('light')

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as AdminTheme | null
    const preferred = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    setTheme(stored ?? preferred)
  }, [])

  const toggle = () => {
    setTheme((prev) => {
      const next: AdminTheme = prev === 'light' ? 'dark' : 'light'
      localStorage.setItem(STORAGE_KEY, next)
      return next
    })
  }

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      <div data-admin-theme={theme} style={{ display: 'contents' }}>
        {children}
      </div>
    </ThemeContext.Provider>
  )
}
```

- [ ] **Step 2: Create `nav.ts`**

```typescript
export type NavKind = 'danger' | 'warning' | 'signal' | 'neutral'

export interface NavItem {
  key: string
  label: string
  href: string
  iconName: string
  badge?: { kind: NavKind }
}

export const NAV: NavItem[] = [
  { key: 'dashboard',    label: 'Dashboard',    href: '/admin',              iconName: 'LayoutDashboard' },
  { key: 'venues',       label: 'Venues',       href: '/admin/venues',       iconName: 'MapPin' },
  { key: 'crawl',        label: 'Crawl',        href: '/admin/crawl',        iconName: 'RefreshCw',  badge: { kind: 'danger' } },
  { key: 'events',       label: 'Event review', href: '/admin/events',       iconName: 'CalendarCheck', badge: { kind: 'warning' } },
  { key: 'prices',       label: 'Prices',       href: '/admin/prices',       iconName: 'DollarSign' },
  { key: 'invite-codes', label: 'Invite codes', href: '/admin/invite-codes', iconName: 'Ticket' },
  { key: 'settings',     label: 'Settings',     href: '/admin/settings',     iconName: 'Settings' },
]
```

- [ ] **Step 3: Create `AdminSidebar.tsx`**

```tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import * as LucideIcons from 'lucide-react'
import { NAV, type NavItem } from './nav'

type SidebarMode = 'full' | 'rail'
const STORAGE_KEY = 'cc-admin-sidebar'

const NavIcon = ({ name, size }: { name: string; size: number }) => {
  const Icon = (LucideIcons as unknown as Record<string, React.ComponentType<{ size: number }>>)[name]
  return Icon ? <Icon size={size} /> : null
}

const NavLink = ({ item, mode, active }: { item: NavItem; mode: SidebarMode; active: boolean }) => {
  const [hovered, setHovered] = useState(false)

  return (
    <Link
      href={item.href}
      title={mode === 'rail' ? item.label : undefined}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: mode === 'full' ? 10 : 0,
        justifyContent: mode === 'rail' ? 'center' : 'flex-start',
        padding: mode === 'full' ? '7px 10px' : '7px 0',
        borderRadius: 7,
        textDecoration: 'none',
        fontSize: 13,
        fontWeight: active ? 600 : 400,
        color: active ? 'var(--fg)' : 'var(--fg-muted)',
        background: active ? 'var(--surface-2)' : hovered ? 'var(--overlay-hover)' : 'transparent',
        borderLeft: active ? '2px solid var(--signal)' : '2px solid transparent',
        position: 'relative',
        transition: 'background 0.12s',
      }}
    >
      <NavIcon name={item.iconName} size={16} />
      {mode === 'full' && <span style={{ flex: 1 }}>{item.label}</span>}
      {mode === 'full' && item.badge && (
        <span style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: `var(--${item.badge.kind})`,
          flexShrink: 0,
        }} />
      )}
      {mode === 'rail' && item.badge && (
        <span style={{
          position: 'absolute',
          top: 4,
          right: 4,
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: `var(--${item.badge.kind})`,
        }} />
      )}
    </Link>
  )
}

export const AdminSidebar = () => {
  const [mode, setMode] = useState<SidebarMode>('full')
  const pathname = usePathname()

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as SidebarMode | null
    if (stored) setMode(stored)
  }, [])

  const toggleMode = () => {
    setMode((prev) => {
      const next: SidebarMode = prev === 'full' ? 'rail' : 'full'
      localStorage.setItem(STORAGE_KEY, next)
      return next
    })
  }

  const width = mode === 'full' ? 240 : 64

  return (
    <aside
      style={{
        width,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        borderRight: '1px solid var(--border)',
        background: 'var(--bg-elevated)',
        transition: 'width 0.18s ease',
        overflow: 'hidden',
      }}
    >
      {/* Wordmark */}
      <div style={{
        padding: mode === 'full' ? '16px 16px 12px' : '16px 0 12px',
        display: 'flex',
        justifyContent: mode === 'rail' ? 'center' : 'flex-start',
        borderBottom: '1px solid var(--border)',
      }}>
        {mode === 'full' ? (
          <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: 13, color: 'var(--fg)' }}>
            concertcrawl./admin
          </span>
        ) : (
          <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: 13, color: 'var(--fg)' }}>
            cc/
          </span>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {NAV.map((item) => {
          const active = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href))
          return <NavLink key={item.key} item={item} mode={mode} active={active} />
        })}
      </nav>

      {/* Bottom */}
      <div style={{ padding: '12px 8px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <button
          onClick={toggleMode}
          title={mode === 'full' ? 'Collapse sidebar' : 'Expand sidebar'}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: mode === 'rail' ? 'center' : 'flex-start',
            gap: 10,
            padding: '6px 10px',
            background: 'transparent',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            color: 'var(--fg-muted)',
            fontSize: 12,
          }}
        >
          <NavIcon name={mode === 'full' ? 'PanelLeftClose' : 'PanelLeft'} size={16} />
          {mode === 'full' && 'Collapse'}
        </button>
      </div>
    </aside>
  )
}
```

- [ ] **Step 4: Create `AdminTopbar.tsx`**

```tsx
'use client'

import { useAdminTheme } from './AdminThemeProvider'
import { UserButton } from '@clerk/nextjs'
import { Sun, Moon } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { NAV } from './nav'

const useBreadcrumb = () => {
  const pathname = usePathname()
  const item = NAV.find((nav) =>
    nav.href !== '/admin' ? pathname.startsWith(nav.href) : pathname === '/admin',
  )
  return item?.label ?? 'Admin'
}

export const AdminTopbar = () => {
  const { theme, toggle } = useAdminTheme()
  const breadcrumb = useBreadcrumb()

  return (
    <header
      style={{
        height: 52,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-elevated)',
      }}
    >
      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)' }}>{breadcrumb}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={toggle}
          title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 32,
            height: 32,
            borderRadius: 6,
            background: 'transparent',
            border: '1px solid var(--border)',
            cursor: 'pointer',
            color: 'var(--fg-muted)',
          }}
        >
          {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
        </button>
        <UserButton />
      </div>
    </header>
  )
}
```

- [ ] **Step 5: Run typecheck**

```bash
pnpm --filter @concert-crawl/web typecheck
```

Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/admin/shell/
git commit -m "feat: admin shell — ThemeProvider, Sidebar (full/rail), AdminTopbar"
```

---

## Task 5: Dashboard page

**Files:**
- Modify: `apps/web/src/app/(protected)/admin/page.tsx`

API used:
- `GET /v1/admin/crawl/status` → per-venue status (used by VenueHealthPanel)
- `GET /v1/admin/events?verified=false&limit=1` → pending count (header stat)
- `GET /v1/admin/venues` → active venue count
- `GET /v1/admin/crawl/runs?limit=10` → recent activity feed

- [ ] **Step 1: Replace `apps/web/src/app/(protected)/admin/page.tsx`**

```tsx
import { auth } from '@clerk/nextjs/server'
import { currentUser } from '@clerk/nextjs/server'
import {
  Clock, DollarSign, Activity, CheckSquare, MapPin, ChevronRight,
} from 'lucide-react'
import { requireAdminUser } from '@/lib/auth'
import { apiClient } from '@/lib/api'
import type { CrawlRun, Venue } from '@concert-crawl/types'
import {
  SectionHead, StatCard, Panel, AdminTable, THead, TR, TH, TD,
  StatusBadge, AdminButton, ProgressBar, CostText, RelTime,
} from '@/components/admin/primitives'

async function fetchDashboardData(token: string) {
  const [status, venues, runs] = await Promise.all([
    apiClient.get<{ venueId: string; venueName: string; status: string; lastRunAt: string | null; eventsFound: number; strategy: string; cost: number; error: string | null }[]>('/v1/admin/crawl/status', token),
    apiClient.get<Venue[]>('/v1/admin/venues', token),
    apiClient.get<CrawlRun[]>('/v1/admin/crawl/runs?limit=20', token),
  ])
  return { status, venues, runs }
}

const STATUS_KIND: Record<string, 'success' | 'danger' | 'warning' | 'neutral'> = {
  success: 'success',
  failed: 'danger',
  blocked: 'danger',
  partial: 'warning',
  paused: 'warning',
  never: 'neutral',
}

export default async function AdminDashboardPage() {
  const user = await requireAdminUser()
  const { getToken } = await auth()
  const token = await getToken()
  if (!token) return null

  const clerkUser = await currentUser()
  const firstName = clerkUser?.firstName ?? user.email

  const { status, venues, runs } = await fetchDashboardData(token)

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  const greenCount = status.filter((vv) => vv.status === 'success').length
  const blockedCount = status.filter((vv) => vv.status === 'blocked' || vv.status === 'failed').length
  const pendingEvents = 0 // TODO wire when events endpoint supports count
  const totalCost = runs.reduce((sum, run) => sum + (run.llmCostUsd ?? 0), 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Greeting */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontFamily: "'Inter', sans-serif", fontSize: 26, fontWeight: 700, color: 'var(--fg)', letterSpacing: '-0.025em' }}>
            {greeting}, {firstName}.
          </h1>
          <div style={{ marginTop: 4, fontSize: 13, color: 'var(--fg-muted)' }}>
            {greenCount} of {status.length} venues green · {blockedCount > 0 ? `${blockedCount} blocked` : 'all healthy'}
          </div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          <StatusBadge kind="signal" variant="mono" dot>SSE LIVE</StatusBadge>
          <AdminButton variant="primary" icon={MapPin}>Add venue</AdminButton>
        </div>
      </div>

      {/* Stat row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <StatCard
          label="Pending review"
          value={String(pendingEvents)}
          unit="events"
          icon={CheckSquare}
          kind="warning"
          footer={<AdminButton variant="ghost" size="sm" iconRight={ChevronRight} fullWidth>Open queue</AdminButton>}
        />
        <StatCard
          label="LLM cost · 30d"
          value={`$${totalCost.toFixed(2)}`}
          icon={DollarSign}
          kind="signal"
          footer={<ProgressBar value={Math.round((totalCost / 40) * 100)} kind="signal" showLabel={false} />}
        />
        <StatCard
          label="Crawl health"
          value={`${greenCount}/${status.length}`}
          unit="green"
          icon={Activity}
          kind={blockedCount > 0 ? 'warning' : 'success'}
          hint={blockedCount > 0 ? `${blockedCount} blocked` : 'All venues healthy'}
        />
        <StatCard
          label="Active venues"
          value={String(venues.filter((vv) => vv.active).length)}
          unit="venues"
          icon={MapPin}
          kind="neutral"
        />
      </div>

      {/* Health table + Activity feed */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Panel title="Crawl health · today" padding={0}>
          <AdminTable>
            <THead>
              <tr>
                <TH>Venue</TH>
                <TH>Status</TH>
                <TH>Last crawl</TH>
                <TH align="right" mono>Events</TH>
                <TH align="right" mono>Cost</TH>
              </tr>
            </THead>
            <tbody>
              {status.map((row) => (
                <TR key={row.venueId}>
                  <TD>{row.venueName}</TD>
                  <TD>
                    <StatusBadge kind={STATUS_KIND[row.status] ?? 'neutral'} dot>
                      {row.status}
                    </StatusBadge>
                  </TD>
                  <TD color="var(--fg-muted)">
                    {row.lastRunAt ? <RelTime iso={row.lastRunAt} /> : '—'}
                  </TD>
                  <TD align="right" mono>{row.eventsFound}</TD>
                  <TD align="right"><CostText value={row.cost} /></TD>
                </TR>
              ))}
            </tbody>
          </AdminTable>
        </Panel>

        <Panel title="Recent activity">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {runs.slice(0, 8).map((run) => (
              <div key={run.id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 11, color: 'var(--fg-subtle)', fontVariantNumeric: 'tabular-nums', minWidth: 56, fontFamily: "'JetBrains Mono', monospace" }}>
                  {run.startedAt ? new Date(run.startedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '—'}
                </span>
                <div style={{ flex: 1, fontSize: 13 }}>
                  <div style={{ color: 'var(--fg)', fontWeight: 500 }}>
                    {run.status === 'success' ? `${run.venueName} crawl ok` : `${run.venueName} crawl ${run.status}`}
                  </div>
                  <div style={{ color: 'var(--fg-muted)', fontSize: 12 }}>
                    {run.eventsFound} events · {run.extractionStrategyUsed ?? '—'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  )
}
```

**Note:** `CrawlRun` type may not have `venueName` or `llmCostUsd` yet — add them to `packages/types/src/index.ts` if missing, or derive from the status endpoint. Run typecheck to confirm.

- [ ] **Step 2: Run typecheck**

```bash
pnpm --filter @concert-crawl/web typecheck
```

Fix any type errors (most likely: missing fields on `CrawlRun` type or `Venue` type — add to `packages/types` as needed).

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/(protected)/admin/page.tsx
git commit -m "feat: admin dashboard — greeting, stat row, health table, activity feed"
```

---

## Task 6: Crawl status page

**Files:**
- Modify: `apps/web/src/app/(protected)/admin/crawl/page.tsx`

API used:
- `GET /v1/admin/crawl/status` → left rail list
- `GET /v1/admin/crawl/runs?limit=50` → run history table
- `POST /v1/admin/crawl/:venueId` → trigger crawl (client action)
- `GET /v1/admin/crawl/:id` → poll run status

- [ ] **Step 1: Replace `apps/web/src/app/(protected)/admin/crawl/page.tsx`**

The page is split-view: left rail (per-venue latest run) + right inspector (selected run detail). The inspector must be a `'use client'` component to handle selection state. The page shell is a server component that fetches initial data.

Create the server page:

```tsx
import { auth } from '@clerk/nextjs/server'
import { requireAdminUser } from '@/lib/auth'
import { apiClient } from '@/lib/api'
import { RefreshCw } from 'lucide-react'
import { SectionHead, AdminButton } from '@/components/admin/primitives'
import { CrawlSplitView } from '@/components/admin/crawl/CrawlSplitView'

export default async function AdminCrawlPage() {
  await requireAdminUser()
  const { getToken } = await auth()
  const token = await getToken()
  if (!token) return null

  const [status, runs] = await Promise.all([
    apiClient.get<CrawlStatusRow[]>('/v1/admin/crawl/status', token),
    apiClient.get<CrawlRun[]>('/v1/admin/crawl/runs?limit=50', token),
  ])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, height: '100%' }}>
      <SectionHead
        eyebrow="Phase 7 · Automation"
        title="Crawl status"
        actions={
          <>
            <AdminButton variant="outline" icon={RefreshCw}>Run all</AdminButton>
          </>
        }
      />
      <CrawlSplitView initialStatus={status} initialRuns={runs} token={token} />
    </div>
  )
}
```

Create `apps/web/src/components/admin/crawl/CrawlSplitView.tsx`:

```tsx
'use client'

import { useState } from 'react'
import {
  StatusBadge, Panel, AdminTable, THead, TR, TH, TD,
  RelTime, CostText, SectionHead,
} from '@/components/admin/primitives'
import type { CrawlRun } from '@concert-crawl/types'

interface CrawlStatusRow {
  venueId: string
  venueName: string
  status: string
  lastRunAt: string | null
  eventsFound: number
  strategy: string
  cost: number
  error: string | null
}

interface Props {
  initialStatus: CrawlStatusRow[]
  initialRuns: CrawlRun[]
  token: string
}

const STATUS_KIND: Record<string, 'success' | 'danger' | 'warning' | 'neutral'> = {
  success: 'success',
  failed: 'danger',
  blocked: 'danger',
  partial: 'warning',
  paused: 'warning',
  never: 'neutral',
}

export const CrawlSplitView = ({ initialStatus, initialRuns }: Props) => {
  const [selectedId, setSelectedId] = useState<string | null>(
    initialStatus[0]?.venueId ?? null,
  )

  const selected = initialStatus.find((row) => row.venueId === selectedId)
  const selectedRuns = initialRuns.filter((run) => run.venueId === selectedId)

  return (
    <div style={{ display: 'flex', gap: 16, flex: 1, minHeight: 0 }}>
      {/* Left rail */}
      <div style={{
        width: 460,
        flexShrink: 0,
        border: '1px solid var(--border)',
        borderRadius: 12,
        background: 'var(--bg-elevated)',
        overflowY: 'auto',
      }}>
        <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', fontSize: 12, fontWeight: 600, color: 'var(--fg-muted)' }}>
          {initialStatus.length} venues
        </div>
        {initialStatus.map((row) => (
          <button
            key={row.venueId}
            onClick={() => setSelectedId(row.venueId)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '12px 14px',
              borderBottom: '1px solid var(--border)',
              background: row.venueId === selectedId ? 'var(--surface-2)' : 'transparent',
              borderLeft: row.venueId === selectedId ? '2px solid var(--signal)' : '2px solid transparent',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: `var(--${STATUS_KIND[row.status] ?? 'neutral'})`, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {row.venueName}
              </div>
              <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
                {row.lastRunAt ? <RelTime iso={row.lastRunAt} /> : 'never'} · {row.eventsFound} ev
              </div>
            </div>
            <StatusBadge kind={STATUS_KIND[row.status] ?? 'neutral'} variant="soft">{row.status}</StatusBadge>
          </button>
        ))}
      </div>

      {/* Right inspector */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto' }}>
        {selected ? (
          <>
            <Panel title={selected.venueName}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                {[
                  { label: 'Status', value: <StatusBadge kind={STATUS_KIND[selected.status] ?? 'neutral'} dot>{selected.status}</StatusBadge> },
                  { label: 'Events found', value: selected.eventsFound },
                  { label: 'Strategy', value: selected.strategy },
                  { label: 'LLM cost', value: <CostText value={selected.cost} /> },
                ].map((stat) => (
                  <div key={stat.label}>
                    <div style={{ fontSize: 11, color: 'var(--fg-subtle)', marginBottom: 4 }}>{stat.label}</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)' }}>{stat.value}</div>
                  </div>
                ))}
              </div>
              {selected.error && (
                <div style={{ marginTop: 12, padding: '10px 12px', borderRadius: 8, background: 'rgba(184,56,26,0.08)', color: 'var(--danger)', fontSize: 12 }}>
                  {selected.error}
                </div>
              )}
            </Panel>

            <Panel title="Run history" padding={0}>
              <AdminTable>
                <THead>
                  <tr>
                    <TH>Started</TH>
                    <TH>Status</TH>
                    <TH>Strategy</TH>
                    <TH align="right" mono>Events</TH>
                    <TH align="right" mono>Duration</TH>
                    <TH align="right" mono>LLM cost</TH>
                  </tr>
                </THead>
                <tbody>
                  {selectedRuns.map((run) => (
                    <TR key={run.id}>
                      <TD color="var(--fg-muted)">
                        {run.startedAt ? <RelTime iso={run.startedAt} /> : '—'}
                      </TD>
                      <TD>
                        <StatusBadge kind={STATUS_KIND[run.status] ?? 'neutral'}>{run.status}</StatusBadge>
                      </TD>
                      <TD color="var(--fg-muted)">{run.extractionStrategyUsed ?? '—'}</TD>
                      <TD align="right" mono>{run.eventsFound}</TD>
                      <TD align="right" mono color="var(--fg-muted)">
                        {run.durationMs ? `${(run.durationMs / 1000).toFixed(1)}s` : '—'}
                      </TD>
                      <TD align="right"><CostText value={run.llmCostUsd ?? 0} /></TD>
                    </TR>
                  ))}
                </tbody>
              </AdminTable>
            </Panel>
          </>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--fg-muted)', fontSize: 14 }}>
            Select a venue to inspect
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Run typecheck**

```bash
pnpm --filter @concert-crawl/web typecheck
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/(protected)/admin/crawl/ \
        apps/web/src/components/admin/crawl/
git commit -m "feat: admin crawl status page — split view, inspector, run history"
```

---

## Task 7: Event review page

**Files:**
- Modify: `apps/web/src/app/(protected)/admin/events/page.tsx`
- Create: `apps/web/src/components/admin/events/EventQueueSplit.tsx`

API used:
- `GET /v1/admin/events?verified=false` → pending queue
- `PATCH /v1/admin/events/:id/verify` → approve
- `DELETE /v1/admin/events/:id` → reject

- [ ] **Step 1: Replace `apps/web/src/app/(protected)/admin/events/page.tsx`**

```tsx
import { auth } from '@clerk/nextjs/server'
import { requireAdminUser } from '@/lib/auth'
import { apiClient } from '@/lib/api'
import { SectionHead, AdminButton } from '@/components/admin/primitives'
import { EventQueueSplit } from '@/components/admin/events/EventQueueSplit'
import { Plus } from 'lucide-react'

export default async function AdminEventsPage() {
  await requireAdminUser()
  const { getToken } = await auth()
  const token = await getToken()
  if (!token) return null

  const events = await apiClient.get<AdminEvent[]>('/v1/admin/events?verified=false', token)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, height: '100%' }}>
      <SectionHead
        title="Event review"
        actions={<AdminButton variant="primary" icon={Plus}>New event</AdminButton>}
      />
      <EventQueueSplit initialEvents={events} token={token} />
    </div>
  )
}
```

- [ ] **Step 2: Create `EventQueueSplit.tsx`**

```tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@clerk/nextjs'
import { apiClient } from '@/lib/api'
import {
  StatusBadge, ConfidenceBar, AdminButton, Panel, Kbd,
} from '@/components/admin/primitives'
import { Check, X } from 'lucide-react'

interface AdminEvent {
  id: string
  title: string
  artist: string
  venue?: { name: string }
  date: string
  doorsTime?: string | null
  showTime?: string | null
  confidenceScore: string | null
  extractionStrategy: string | null
  sourceUrl: string | null
  verified: boolean
}

type FilterKind = 'pending' | 'low-conf' | 'all'

interface Props {
  initialEvents: AdminEvent[]
  token: string
}

export const EventQueueSplit = ({ initialEvents, token }: Props) => {
  const { getToken } = useAuth()
  const [events, setEvents] = useState(initialEvents)
  const [selectedId, setSelectedId] = useState<string | null>(events[0]?.id ?? null)
  const [filter, setFilter] = useState<FilterKind>('pending')
  const [processing, setProcessing] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const filtered = events.filter((ev) => {
    if (filter === 'low-conf') return Number(ev.confidenceScore) < 0.7
    return true
  })

  const selectedIdx = filtered.findIndex((ev) => ev.id === selectedId)
  const selected = filtered.find((ev) => ev.id === selectedId)

  const approve = useCallback(async (id: string) => {
    setProcessing(id)
    try {
      const tok = await getToken()
      if (!tok) return
      await apiClient.patch(`/v1/admin/events/${id}/verify`, tok, {})
      setEvents((prev) => prev.filter((ev) => ev.id !== id))
      const nextIdx = Math.min(selectedIdx, filtered.length - 2)
      setSelectedId(filtered[nextIdx]?.id ?? null)
    } finally {
      setProcessing(null)
    }
  }, [getToken, selectedIdx, filtered])

  const reject = useCallback(async (id: string) => {
    if (!confirm('Delete this event? Cannot be undone.')) return
    setProcessing(id)
    try {
      const tok = await getToken()
      if (!tok) return
      await apiClient.delete(`/v1/admin/events/${id}`, tok)
      setEvents((prev) => prev.filter((ev) => ev.id !== id))
      const nextIdx = Math.min(selectedIdx, filtered.length - 2)
      setSelectedId(filtered[nextIdx]?.id ?? null)
    } finally {
      setProcessing(null)
    }
  }, [getToken, selectedIdx, filtered])

  // Keyboard nav: J/K/A/R
  useEffect(() => {
    const handler = (ev: KeyboardEvent) => {
      if (ev.target instanceof HTMLInputElement || ev.target instanceof HTMLTextAreaElement) return
      if (ev.key === 'j' || ev.key === 'ArrowDown') {
        const next = filtered[selectedIdx + 1]
        if (next) setSelectedId(next.id)
      } else if (ev.key === 'k' || ev.key === 'ArrowUp') {
        const prev = filtered[selectedIdx - 1]
        if (prev) setSelectedId(prev.id)
      } else if (ev.key === 'a' && selectedId) {
        void approve(selectedId)
      } else if (ev.key === 'r' && selectedId) {
        void reject(selectedId)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [selectedId, selectedIdx, filtered, approve, reject])

  const FILTERS: { key: FilterKind; label: string; count: number }[] = [
    { key: 'pending', label: 'Pending', count: events.length },
    { key: 'low-conf', label: 'Low conf.', count: events.filter((ev) => Number(ev.confidenceScore) < 0.7).length },
    { key: 'all', label: 'All', count: events.length },
  ]

  if (events.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 12, color: 'var(--fg-muted)' }}>
        <div style={{ fontSize: 24 }}>✓</div>
        <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--fg)' }}>Queue is clear.</div>
        <div style={{ fontSize: 13 }}>Every event has been reviewed.</div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, flex: 1, minHeight: 0 }}>
      {/* Filter rail */}
      <div style={{ display: 'flex', gap: 8 }}>
        {FILTERS.map((ff) => (
          <button
            key={ff.key}
            onClick={() => setFilter(ff.key)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '5px 12px',
              borderRadius: 999,
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              background: filter === ff.key ? 'var(--signal)' : 'transparent',
              color: filter === ff.key ? 'var(--fg-on-accent)' : 'var(--fg-muted)',
              border: `1px solid ${filter === ff.key ? 'transparent' : 'var(--border)'}`,
            }}
          >
            {ff.label}
            <span style={{
              fontSize: 11,
              fontWeight: 700,
              padding: '1px 5px',
              borderRadius: 999,
              background: 'rgba(0,0,0,0.15)',
            }}>{ff.count}</span>
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 16, flex: 1, minHeight: 0 }}>
        {/* Left queue list */}
        <div style={{
          width: 480,
          flexShrink: 0,
          border: '1px solid var(--border)',
          borderRadius: 12,
          background: 'var(--bg-elevated)',
          overflowY: 'auto',
        }}>
          {filtered.map((ev) => {
            const conf = Number(ev.confidenceScore ?? 0)
            const active = ev.id === selectedId
            return (
              <button
                key={ev.id}
                onClick={() => setSelectedId(ev.id)}
                style={{
                  width: '100%',
                  display: 'flex',
                  gap: 10,
                  padding: '12px 14px',
                  borderBottom: '1px solid var(--border)',
                  background: active ? 'var(--surface-2)' : 'transparent',
                  borderLeft: active ? '2px solid var(--signal)' : '2px solid transparent',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(ev.id)}
                  onChange={(chev) => {
                    chev.stopPropagation()
                    setSelectedIds((prev) => {
                      const next = new Set(prev)
                      if (next.has(ev.id)) next.delete(ev.id)
                      else next.add(ev.id)
                      return next
                    })
                  }}
                  onClick={(chev) => chev.stopPropagation()}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {ev.artist || ev.title}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginBottom: 6 }}>
                    {ev.venue?.name ?? '—'} · {new Date(ev.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                  <ConfidenceBar score={conf} />
                </div>
              </button>
            )
          })}
        </div>

        {/* Right inspector */}
        {selected && (
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <Panel title={selected.artist || selected.title}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Actions */}
                <div style={{ display: 'flex', gap: 8 }}>
                  <AdminButton
                    variant="ghost"
                    icon={X}
                    disabled={processing === selected.id}
                    onClick={() => reject(selected.id)}
                  >
                    Reject
                  </AdminButton>
                  <AdminButton
                    variant="success"
                    icon={Check}
                    disabled={processing === selected.id}
                    onClick={() => approve(selected.id)}
                  >
                    Approve
                  </AdminButton>
                </div>

                {/* Vitals */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                  {[
                    { label: 'Confidence', value: <ConfidenceBar score={Number(selected.confidenceScore ?? 0)} /> },
                    { label: 'Source', value: selected.extractionStrategy ?? '—' },
                    { label: 'Date', value: new Date(selected.date).toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric' }) },
                    { label: 'Venue', value: selected.venue?.name ?? '—' },
                  ].map((row) => (
                    <div key={row.label}>
                      <div style={{ fontSize: 11, color: 'var(--fg-subtle)', marginBottom: 4 }}>{row.label}</div>
                      <div style={{ fontSize: 13, color: 'var(--fg)' }}>{row.value}</div>
                    </div>
                  ))}
                </div>

                {/* Field rows */}
                {[
                  ['Title', selected.title],
                  ['Artist', selected.artist],
                  ['Doors', selected.doorsTime ?? '—'],
                  ['Show', selected.showTime ?? '—'],
                ].map(([label, val]) => (
                  <div key={label} style={{ display: 'flex', gap: 12, alignItems: 'center', paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontSize: 12, color: 'var(--fg-muted)', width: 64, flexShrink: 0 }}>{label}</span>
                    <span style={{ fontSize: 13, color: 'var(--fg)' }}>{val}</span>
                  </div>
                ))}

                {/* Keyboard cues */}
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12, color: 'var(--fg-muted)' }}>
                  <Kbd>J</Kbd><span>next</span>
                  <Kbd>K</Kbd><span>prev</span>
                  <Kbd>A</Kbd><span>approve</span>
                  <Kbd>R</Kbd><span>reject</span>
                </div>
              </div>
            </Panel>
          </div>
        )}
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div style={{
          position: 'fixed',
          bottom: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'var(--ink)',
          borderRadius: 12,
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          boxShadow: 'var(--shadow-lg)',
          zIndex: 50,
        }}>
          <span style={{ fontSize: 13, color: 'var(--paper)', fontWeight: 500 }}>
            {selectedIds.size} selected
          </span>
          <AdminButton variant="success" size="sm">Approve all</AdminButton>
          <AdminButton variant="danger" size="sm">Reject</AdminButton>
          <AdminButton variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())} style={{ color: 'var(--paper)' }}>
            Dismiss
          </AdminButton>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Run typecheck**

```bash
pnpm --filter @concert-crawl/web typecheck
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/(protected)/admin/events/ \
        apps/web/src/components/admin/events/
git commit -m "feat: admin event review — filter rail, split view, keyboard nav (J/K/A/R), bulk action bar"
```

---

## Task 8: Data tables — Venues, Prices, Invite Codes

**Files:**
- Modify: `apps/web/src/app/(protected)/admin/venues/page.tsx`
- Modify: `apps/web/src/app/(protected)/admin/prices/page.tsx`
- Modify: `apps/web/src/app/(protected)/admin/invite-codes/page.tsx`

- [ ] **Step 1: Replace venues page**

```tsx
import { auth } from '@clerk/nextjs/server'
import { requireAdminUser } from '@/lib/auth'
import { apiClient } from '@/lib/api'
import { Plus } from 'lucide-react'
import Link from 'next/link'
import {
  SectionHead, AdminButton, AdminTable, THead, TR, TH, TD, StatusBadge, Panel,
} from '@/components/admin/primitives'
import type { Venue } from '@concert-crawl/types'

export default async function AdminVenuesPage() {
  await requireAdminUser()
  const { getToken } = await auth()
  const token = await getToken()
  if (!token) return null

  const venues = await apiClient.get<Venue[]>('/v1/admin/venues', token)
  const active = venues.filter((vv) => vv.active)
  const inactive = venues.filter((vv) => !vv.active)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <SectionHead
        title="Venues"
        actions={
          <Link href="/admin/venues/new">
            <AdminButton variant="primary" icon={Plus}>Add venue</AdminButton>
          </Link>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        {[
          { label: 'Total', value: venues.length },
          { label: 'Active', value: active.length },
          { label: 'Inactive', value: inactive.length },
          { label: 'Verified', value: venues.filter((vv) => vv.verified).length },
        ].map((stat) => (
          <div key={stat.label} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 20px' }}>
            <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginBottom: 6 }}>{stat.label}</div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 30, fontWeight: 700 }}>{stat.value}</div>
          </div>
        ))}
      </div>

      <Panel title="All venues" padding={0}>
        <AdminTable>
          <THead>
            <tr>
              <TH>Venue</TH>
              <TH>Source URL</TH>
              <TH>Status</TH>
              <TH>Verified</TH>
              <TH>Crawl delay</TH>
              <TH></TH>
            </tr>
          </THead>
          <tbody>
            {venues.map((venue) => (
              <TR key={venue.id}>
                <TD>
                  <div style={{ fontWeight: 500 }}>{venue.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{venue.slug}</div>
                </TD>
                <TD mono color="var(--fg-muted)">
                  <a href={venue.website ?? undefined} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--signal)', textDecoration: 'none' }}>
                    {venue.website ? new URL(venue.website).hostname : '—'}
                  </a>
                </TD>
                <TD>
                  <StatusBadge kind={venue.active ? 'success' : 'neutral'} dot>
                    {venue.active ? 'Active' : 'Inactive'}
                  </StatusBadge>
                </TD>
                <TD>
                  <StatusBadge kind={venue.verified ? 'success' : 'warning'}>
                    {venue.verified ? 'Verified' : 'Unverified'}
                  </StatusBadge>
                </TD>
                <TD mono color="var(--fg-muted)">{venue.crawlDelayMs ? `${venue.crawlDelayMs / 1000}s` : '3s'}</TD>
                <TD>
                  <Link href={`/admin/venues/${venue.id}`}>
                    <AdminButton variant="ghost" size="sm">Edit</AdminButton>
                  </Link>
                </TD>
              </TR>
            ))}
          </tbody>
        </AdminTable>
      </Panel>
    </div>
  )
}
```

- [ ] **Step 2: Replace prices page**

```tsx
import { auth } from '@clerk/nextjs/server'
import { requireAdminUser } from '@/lib/auth'
import { apiClient } from '@/lib/api'
import {
  SectionHead, Panel, AdminTable, THead, TR, TH, TD, StatusBadge, Sparkline,
} from '@/components/admin/primitives'

interface PriceActivity {
  eventId: string
  eventTitle: string
  venueName: string
  date: string
  openedAt: number | null
  currentPrice: number | null
  delta: number | null
  history: number[]
  flag: 'spike' | 'soldout' | null
  updatedAt: string
}

export default async function AdminPricesPage() {
  await requireAdminUser()
  const { getToken } = await auth()
  const token = await getToken()
  if (!token) return null

  const activity = await apiClient.get<PriceActivity[]>('/v1/admin/prices/activity', token).catch(() => [] as PriceActivity[])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <SectionHead title="Prices" />
      <Panel title="Recent price activity" padding={0}>
        {activity.length === 0 ? (
          <div style={{ padding: 24, color: 'var(--fg-muted)', fontSize: 14 }}>No price activity yet.</div>
        ) : (
          <AdminTable>
            <THead>
              <tr>
                <TH>Event</TH>
                <TH>Opened</TH>
                <TH>Current</TH>
                <TH>Δ</TH>
                <TH>14-day trend</TH>
                <TH>Updated</TH>
              </tr>
            </THead>
            <tbody>
              {activity.map((row) => {
                const deltaStr = row.delta === null ? '—'
                  : row.delta === -1 ? 'sold out'
                  : `${row.delta > 0 ? '+' : ''}${(row.delta * 100).toFixed(0)}%`
                const deltaColor = row.delta === null ? 'var(--fg-muted)'
                  : row.delta > 0.15 ? 'var(--danger)'
                  : row.delta < 0 ? 'var(--success)'
                  : 'var(--fg-muted)'
                return (
                  <TR key={row.eventId}>
                    <TD>
                      <div style={{ fontWeight: 500 }}>{row.eventTitle}</div>
                      <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{row.venueName} · {new Date(row.date).toLocaleDateString()}</div>
                    </TD>
                    <TD mono color="var(--fg-muted)">{row.openedAt ? `$${row.openedAt}` : '—'}</TD>
                    <TD mono>{row.currentPrice ? `$${row.currentPrice}` : '—'}</TD>
                    <TD mono color={deltaColor}>{deltaStr}</TD>
                    <TD><Sparkline data={row.history} flag={row.flag} /></TD>
                    <TD color="var(--fg-muted)" mono>{new Date(row.updatedAt).toLocaleDateString()}</TD>
                  </TR>
                )
              })}
            </tbody>
          </AdminTable>
        )}
      </Panel>
    </div>
  )
}
```

- [ ] **Step 3: Replace invite codes page**

```tsx
import { auth } from '@clerk/nextjs/server'
import { requireAdminUser } from '@/lib/auth'
import { apiClient } from '@/lib/api'
import {
  SectionHead, Panel, AdminTable, THead, TR, TH, TD, StatusBadge, AdminButton,
} from '@/components/admin/primitives'
import { Plus } from 'lucide-react'

interface InviteCode {
  id: string
  code: string
  inviteeEmail: string | null
  status: 'active' | 'redeemed' | 'expired' | 'revoked'
  createdAt: string
  redeemedAt: string | null
  expiresAt: string | null
  createdByEmail: string | null
}

const INVITE_STATUS_KIND: Record<InviteCode['status'], 'signal' | 'success' | 'neutral' | 'danger'> = {
  active: 'signal',
  redeemed: 'success',
  expired: 'neutral',
  revoked: 'danger',
}

export default async function AdminInviteCodesPage() {
  await requireAdminUser()
  const { getToken } = await auth()
  const token = await getToken()
  if (!token) return null

  const codes = await apiClient.get<InviteCode[]>('/v1/admin/invite-codes', token)

  const outstanding = codes.filter((cc) => cc.status === 'active').length
  const redeemed = codes.filter((cc) => cc.status === 'redeemed').length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <SectionHead
        title="Invite codes"
        actions={<AdminButton variant="primary" icon={Plus}>Mint code</AdminButton>}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        {[
          { label: 'Outstanding', value: outstanding },
          { label: 'Redeemed', value: redeemed },
          { label: 'Total issued', value: codes.length },
          { label: 'Revoked', value: codes.filter((cc) => cc.status === 'revoked').length },
        ].map((stat) => (
          <div key={stat.label} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 20px' }}>
            <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginBottom: 6 }}>{stat.label}</div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 30, fontWeight: 700 }}>{stat.value}</div>
          </div>
        ))}
      </div>

      <Panel title="Code log" padding={0}>
        <AdminTable>
          <THead>
            <tr>
              <TH>Code</TH>
              <TH>Invitee</TH>
              <TH>Status</TH>
              <TH>Created</TH>
              <TH>Redeemed</TH>
              <TH>Expires</TH>
              <TH>Sent by</TH>
            </tr>
          </THead>
          <tbody>
            {codes.map((code) => (
              <TR key={code.id}>
                <TD>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, padding: '3px 8px', background: 'var(--surface-1)', borderRadius: 6, border: '1px solid var(--border)' }}>
                    {code.code}
                  </span>
                </TD>
                <TD color="var(--fg-muted)">{code.inviteeEmail ?? '—'}</TD>
                <TD>
                  <StatusBadge kind={INVITE_STATUS_KIND[code.status]} dot>
                    {code.status}
                  </StatusBadge>
                </TD>
                <TD mono color="var(--fg-muted)">{new Date(code.createdAt).toLocaleDateString()}</TD>
                <TD mono color="var(--fg-muted)">{code.redeemedAt ? new Date(code.redeemedAt).toLocaleDateString() : '—'}</TD>
                <TD mono color="var(--fg-muted)">{code.expiresAt ? new Date(code.expiresAt).toLocaleDateString() : 'Never'}</TD>
                <TD color="var(--fg-muted)">{code.createdByEmail ?? '—'}</TD>
              </TR>
            ))}
          </tbody>
        </AdminTable>
      </Panel>
    </div>
  )
}
```

- [ ] **Step 4: Run typecheck**

```bash
pnpm --filter @concert-crawl/web typecheck
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/(protected)/admin/venues/page.tsx \
        apps/web/src/app/(protected)/admin/prices/page.tsx \
        apps/web/src/app/(protected)/admin/invite-codes/page.tsx
git commit -m "feat: admin data tables — venues, prices, invite codes"
```

---

## Task 9: API gaps + type fixes

During implementation, some API endpoints may not exist or return shapes that differ from what the design expects. Fix as discovered.

Known gaps to check:
- `GET /v1/admin/crawl/runs` — does it accept `venueId` query param? Check `apps/api/src/routes/admin/crawl.ts:125`
- `GET /v1/admin/prices/activity` — does this endpoint exist? If not, create a minimal one returning recent `priceRetrievalLog` rows joined with `events` and `venues`.
- `CrawlRun` type — add `llmCostUsd`, `venueName`, `startedAt` fields to `packages/types/src/index.ts` if missing.

- [ ] **Step 1: Check crawl runs endpoint accepts venueId filter**

```bash
grep -n "venueId" apps/api/src/routes/admin/crawl.ts
```

If `venueId` filter is missing, add it to the GET `/v1/admin/crawl/runs` query handler.

- [ ] **Step 2: Check if prices activity endpoint exists**

```bash
grep -n "activity" apps/api/src/routes/admin/prices.ts
```

If missing, add minimal endpoint:

```typescript
pricesAdminRouter.get('/activity', async (ctx) => {
  const rows = await db
    .select({
      eventId: priceRetrievalLog.eventId,
      eventTitle: events.title,
      venueName: venues.name,
      date: events.date,
      currentPrice: priceRetrievalLog.priceMin,
      updatedAt: priceRetrievalLog.attemptedAt,
      source: priceRetrievalLog.source,
      outcome: priceRetrievalLog.outcome,
    })
    .from(priceRetrievalLog)
    .leftJoin(events, eq(priceRetrievalLog.eventId, events.id))
    .leftJoin(venues, eq(events.venueId, venues.id))
    .orderBy(desc(priceRetrievalLog.attemptedAt))
    .limit(50)

  return ctx.json(rows)
})
```

- [ ] **Step 3: Commit any API fixes**

```bash
git add apps/api/src/routes/admin/
git commit -m "fix: admin API — add prices activity endpoint, venueId filter on crawl runs"
```

---

## Task 10: Final verification + PR

- [ ] **Step 1: Run full test suite**

```bash
pnpm test
```

Expected: all tests pass

- [ ] **Step 2: Run typecheck across all packages**

```bash
pnpm typecheck
```

Expected: no errors

- [ ] **Step 3: Start dev server and manually verify all pages**

```bash
pnpm dev
```

| Page | URL | Check |
|------|-----|-------|
| Dashboard | `/admin` | Greeting, 4 stat cards, health table, activity feed all render |
| Crawl | `/admin/crawl` | Left rail shows venues; clicking selects; inspector shows run history |
| Events | `/admin/events` | Queue list shows; inspector opens; J/K/A/R keyboard nav works |
| Venues | `/admin/venues` | Table renders with real venue data |
| Prices | `/admin/prices` | Table renders (may be empty) |
| Invite codes | `/admin/invite-codes` | Table renders with real code data |
| Theme toggle | Any | Clicking sun/moon icon switches light/dark; persists on reload |
| Sidebar collapse | Any | Clicking collapse icon shrinks to icon-only; persists on reload |

- [ ] **Step 4: Open PR**

```bash
gh pr create \
  --title "feat: Phase 7.6 — admin UI redesign" \
  --base main \
  --head feat/phase-76-admin-ui-redesign \
  --body "$(cat .github/pull_request_template.md)"
```

---

## Rollback

No DB changes. No API breaking changes (additions only). Rollback is a plain revert of the PR — the old admin layout and page components are in git history.

---

## Parallelism Notes

Once Task 4 (shell) is committed and pushed, Tasks 5–8 are independent and can be dispatched to parallel agents:
- **Agent A**: Task 5 (Dashboard) + Task 6 (Crawl)
- **Agent B**: Task 7 (Event review)
- **Agent C**: Task 8 (Venues + Prices + Invites)

Each agent needs: the worktree path, the branch name, and their specific task number(s). All agents commit to the same branch and push — no conflicts since they touch different files.
