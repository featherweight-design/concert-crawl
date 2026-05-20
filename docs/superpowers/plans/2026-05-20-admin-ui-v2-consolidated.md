# Admin UI v2 — Consolidated Implementation Plan (7 Surfaces)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Design property table:** `docs/superpowers/design-tables/admin-ui-v2.md` — every implementation decision must satisfy this table.
> **Design handoff files:** `design/design/design_handoff_admin_ui_v2/`
> **Worktree:** `/Users/huey/Projects/concert-crawl/.worktrees/admin-ui-v2`

**Goal:** Replace the existing admin shell, dashboard, crawl inspector, venues table, venue detail, event/price review, and add a new feedback triage page — all matching the v2 design handoff pixel-for-pixel.

**Architecture:** Admin UI uses inline styles (no Tailwind, no shadcn) with CSS variables from the token system. All layout is a mix of server components (data fetching) and client components (interactivity). Mobile breakpoint is 720px. Shell becomes responsive — desktop has sidebar + topbar; mobile has topbar + hamburger drawer + bottom tab bar. Two new pages are added: `/admin/review` (replaces `/admin/events` + `/admin/prices`) and `/admin/feedback`.

**Tech Stack:** Next.js 14 App Router, Hono API, Drizzle ORM, Clerk auth, inline styles, Lucide icons (for icon name → component lookup). ADMIN_FONT=Inter, ADMIN_MONO=JetBrains Mono.

**Design property table:** `docs/superpowers/design-tables/admin-ui-v2.md`

---

## File Map

| File                                                               | Action         | Purpose                                                                                                      |
| ------------------------------------------------------------------ | -------------- | ------------------------------------------------------------------------------------------------------------ | ---------------- |
| `apps/web/src/components/admin/shell/nav.ts`                       | Modify         | NAV_V2: review replaces events+prices, add feedback (signal badge), fix sections                             |
| `apps/web/src/components/admin/shell/AdminSidebar.tsx`             | Modify         | SidebarV2 bg, remove back-to-app, update badge keys, active indicator, new badge shapes                      |
| `apps/web/src/components/admin/shell/AppSwitcher.tsx`              | Create         | Segmented pill "User app                                                                                     | Admin" in topbar |
| `apps/web/src/components/admin/shell/AdminTopbar.tsx`              | Modify         | Height 56, add AppSwitcher + separator, hamburger slot on mobile                                             |
| `apps/web/src/components/admin/shell/MobileDrawer.tsx`             | Create         | Hamburger-controlled full-height drawer (78%, max 320px) with NAV_V2                                         |
| `apps/web/src/components/admin/shell/MobileBottomBar.tsx`          | Create         | Fixed 64px bottom bar, 5 tabs (Dashboard/Venues/Crawl/Review/Feedback), badges                               |
| `apps/web/src/components/admin/shell/AdminShellClient.tsx`         | Create         | Client wrapper owning hamburger state, renders topbar+drawer+bottom bar                                      |
| `apps/web/src/app/(protected)/admin/layout.tsx`                    | Modify         | Fetch review badge (flags+subs), feedback badge (unread), wire AdminShellClient                              |
| `apps/web/src/app/(protected)/admin/page.tsx`                      | Modify         | Remove RunAllVenuesButton + Add Venue CTA, replace ActivityFeed with AttentionFeed                           |
| `apps/web/src/components/admin/dashboard/AttentionFeed.tsx`        | Create         | Exceptions-only feed (failures, flags, pending subs); digest row for successes                               |
| `apps/web/src/components/admin/dashboard/ActivityFeed.tsx`         | Delete/replace | Replaced by AttentionFeed                                                                                    |
| `apps/web/src/components/admin/crawl/CrawlSplitView.tsx`           | Modify         | Add InspectorTabs (Overview/Diagnostics), Diagnostics tab (only if failed/blocked), StagedApplyConfirm modal |
| `apps/web/src/components/admin/crawl/InspectorTabs.tsx`            | Create         | Tab bar with active underline, Diagnostics dot                                                               |
| `apps/web/src/components/admin/crawl/DiagnosticsPanel.tsx`         | Create         | Rule-based diagnostics, OptionsSection with staged actions, StagedApplyConfirm                               |
| `apps/web/src/components/admin/crawl/StagedApplyConfirm.tsx`       | Create         | Modal: config diff (before/after), re-crawl checkbox, Cancel/Apply                                           |
| `apps/web/src/components/admin/venue-table.tsx`                    | Modify         | Add accordion expansion — chevron rotates, expanded row renders VenueQuickView                               |
| `apps/web/src/components/admin/VenueQuickView.tsx`                 | Create         | Info grid, last-error strip, action shelf                                                                    |
| `apps/web/src/components/admin/generate-field/GenerateField.tsx`   | Create         | 5-state GenerateField (idle/loading/review/accepted/error)                                                   |
| `apps/web/src/components/admin/VenueDetailsClient.tsx`             | Modify         | VDSection cards, VDField/VDInput/VDSelect/VDSegToggle, sticky save bar, DeleteVenueConfirm                   |
| `apps/web/src/components/admin/DeleteVenueConfirm.tsx`             | Create         | Modal with typed DELETE gate, staged danger UX                                                               |
| `apps/web/src/app/(protected)/admin/review/page.tsx`               | Create         | New page: EventFlagsSection + PendingSubmissionsPanel + PriceCoverageTable                                   |
| `apps/web/src/components/admin/review/EventFlagsSection.tsx`       | Create         | Flag list + inspector split layout, bulk select, BulkActionDock                                              |
| `apps/web/src/components/admin/review/EventFlagRow.tsx`            | Create         | Row: checkbox, title, venue/date, reason chips, confidence bar, approve/reject                               |
| `apps/web/src/components/admin/review/EventFlagInspector.tsx`      | Create         | Detail panel: LLM reasoning, raw source, run/cost strip, action shelf                                        |
| `apps/web/src/components/admin/review/ConfidenceBar.tsx`           | Create         | 4px track, color-coded fill, mono label                                                                      |
| `apps/web/src/components/admin/review/PriceCoverageTable.tsx`      | Create         | Events × price source table, inline Add form, overflow menu                                                  |
| `apps/web/src/components/admin/review/PendingSubmissionsPanel.tsx` | Create         | Community submission queue — approve/deny                                                                    |
| `apps/web/src/components/admin/review/BulkActionDock.tsx`          | Create         | Sticky dock on var(--ink) bg, count chip, Re-tag / Reject all / Approve N                                    |
| `apps/web/src/components/admin/review/BulkApproveConfirm.tsx`      | Create         | Modal: preview list, warning strip, Approve/Cancel                                                           |
| `apps/web/src/app/(protected)/admin/feedback/page.tsx`             | Create         | New page: FeedbackFilterRail + FeedbackRow list                                                              |
| `apps/web/src/components/admin/feedback/FeedbackFilterRail.tsx`    | Create         | Vertical 200px rail: status filters + source checkboxes                                                      |
| `apps/web/src/components/admin/feedback/FeedbackRow.tsx`           | Create         | Collapsed row: unread dot, handle, badges, body first line                                                   |
| `apps/web/src/components/admin/feedback/FeedbackExpanded.tsx`      | Create         | Expanded: body, screenshot slot, admin notes, context block, GH issue, action shelf                          |
| `apps/web/src/app/(protected)/admin/events/page.tsx`               | Modify         | Redirect to /admin/review                                                                                    |
| `apps/web/src/app/(protected)/admin/prices/page.tsx`               | Modify         | Redirect to /admin/review                                                                                    |
| `packages/db/src/schema/social.ts`                                 | Modify         | Add status enum + adminNotes + issueUrl to feedback table                                                    |
| `packages/db/src/migrations/`                                      | Create         | Migration 0013_feedback_triage_fields.sql                                                                    |
| `apps/api/src/routes/admin/feedback.ts`                            | Create         | GET /v1/admin/feedback, PATCH /v1/admin/feedback/:id                                                         |
| `apps/api/src/routes/admin/index.ts`                               | Modify         | Mount feedback router                                                                                        |

---

## Surface 1 — Shell + Navigation

### Task 1: Update nav.ts to NAV_V2

**Files:**

- Modify: `apps/web/src/components/admin/shell/nav.ts`
- Modify: `apps/web/src/components/admin/shell/nav.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// nav.test.ts
import { describe, it, expect } from 'vitest'
import { NAV } from './nav'

describe('NAV_V2', () => {
  it('contains review and feedback, not events or prices', () => {
    const keys = NAV.map((item) => item.key)
    expect(keys).toContain('review')
    expect(keys).toContain('feedback')
    expect(keys).not.toContain('events')
    expect(keys).not.toContain('prices')
  })

  it('invite-codes and settings are in account section', () => {
    const inviteCodes = NAV.find((item) => item.key === 'invite-codes')
    const settings = NAV.find((item) => item.key === 'settings')
    expect(inviteCodes?.section).toBe('account')
    expect(settings?.section).toBe('account')
  })

  it('review badge kind is warning', () => {
    const review = NAV.find((item) => item.key === 'review')
    expect(review?.badge?.kind).toBe('warning')
  })

  it('feedback badge kind is signal', () => {
    const feedback = NAV.find((item) => item.key === 'feedback')
    expect(feedback?.badge?.kind).toBe('signal')
  })
})
```

- [ ] **Step 2: Run test to see it fail**

Run: `pnpm --filter @concert-crawl/web test -- nav.test.ts`
Expected: FAIL

- [ ] **Step 3: Update nav.ts**

```typescript
// apps/web/src/components/admin/shell/nav.ts
export type NavKind = 'danger' | 'warning' | 'signal'

export interface NavItem {
  key: string
  label: string
  href: string
  iconName: string
  badge?: {
    count: number
    kind: NavKind
  }
  section: 'operations' | 'account'
}

export const NAV: NavItem[] = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    href: '/admin',
    iconName: 'LayoutDashboard',
    section: 'operations',
  },
  {
    key: 'venues',
    label: 'Venues',
    href: '/admin/venues',
    iconName: 'MapPin',
    section: 'operations',
  },
  {
    key: 'crawl',
    label: 'Crawl',
    href: '/admin/crawl',
    iconName: 'RefreshCw',
    badge: { count: 0, kind: 'danger' },
    section: 'operations',
  },
  {
    key: 'review',
    label: 'Review',
    href: '/admin/review',
    iconName: 'ClipboardCheck',
    badge: { count: 0, kind: 'warning' },
    section: 'operations',
  },
  {
    key: 'feedback',
    label: 'Feedback',
    href: '/admin/feedback',
    iconName: 'MessageSquare',
    badge: { count: 0, kind: 'signal' },
    section: 'operations',
  },
  {
    key: 'invite-codes',
    label: 'Invite codes',
    href: '/admin/invite-codes',
    iconName: 'Key',
    section: 'account',
  },
  {
    key: 'settings',
    label: 'Settings',
    href: '/admin/settings',
    iconName: 'Settings',
    section: 'account',
  },
]
```

- [ ] **Step 4: Run tests to confirm pass**

Run: `pnpm --filter @concert-crawl/web test -- nav.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/admin/shell/nav.ts apps/web/src/components/admin/shell/nav.test.ts
git commit -m "feat(admin-shell): NAV_V2 — review + feedback replace events + prices"
```

---

### Task 2: Create AppSwitcher component

**Files:**

- Create: `apps/web/src/components/admin/shell/AppSwitcher.tsx`

- [ ] **Step 1: Create the component**

```tsx
// apps/web/src/components/admin/shell/AppSwitcher.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export const AppSwitcher = () => {
  const pathname = usePathname()
  const isAdmin = pathname.startsWith('/admin')

  const tabs = [
    { label: 'User app', href: '/' },
    { label: 'Admin', href: '/admin' },
  ]

  return (
    <div
      style={{
        display: 'inline-flex',
        padding: 2,
        borderRadius: 8,
        background: 'var(--surface-1)',
        border: '1px solid var(--border)',
        flexShrink: 0,
      }}
    >
      {tabs.map((tab) => {
        const active = tab.label === 'Admin' ? isAdmin : !isAdmin
        return (
          <Link
            key={tab.label}
            href={tab.href}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              height: 30,
              padding: '0 10px',
              gap: 5,
              borderRadius: 6,
              fontFamily: 'var(--font-sans)',
              fontSize: 11,
              fontWeight: 700,
              textDecoration: 'none',
              color: active ? 'var(--fg)' : 'var(--fg-muted)',
              background: active ? 'var(--bg-elevated)' : 'transparent',
              boxShadow: active
                ? '0 1px 2px rgba(0,0,0,0.06), 0 0 0 1px var(--border)'
                : 'none',
              transition: 'background 0.12s',
            }}
          >
            {tab.label}
          </Link>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/admin/shell/AppSwitcher.tsx
git commit -m "feat(admin-shell): add AppSwitcher segmented pill component"
```

---

### Task 3: Update AdminTopbar to v2

**Files:**

- Modify: `apps/web/src/components/admin/shell/AdminTopbar.tsx`

The topbar needs: height 56, AppSwitcher + separator + breadcrumb, hamburger button slot (mobile).

- [ ] **Step 1: Rewrite AdminTopbar.tsx**

Replace the entire file with:

```tsx
'use client'

import { usePathname } from 'next/navigation'
import { NAV } from './nav'
import { buildBreadcrumbs } from './breadcrumbs'
import { usePageTitle } from './PageTitleContext'
import { AppSwitcher } from './AppSwitcher'
import { Menu } from 'lucide-react'

const useBreadcrumbs = (pageTitle: string | null) => {
  const pathname = usePathname()
  const crumbs = buildBreadcrumbs(pathname, NAV)
  if (pageTitle && crumbs.length > 0) {
    return [...crumbs.slice(0, -1), { label: pageTitle }]
  }
  return crumbs
}

interface AdminTopbarProps {
  onMenuOpen?: () => void
  showHamburger?: boolean
}

export const AdminTopbar = ({
  onMenuOpen,
  showHamburger,
}: AdminTopbarProps) => {
  const { pageTitle } = usePageTitle()
  const crumbs = useBreadcrumbs(pageTitle)

  return (
    <header
      style={{
        height: 56,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        padding: '0 24px',
        gap: 16,
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-elevated)',
      }}
    >
      {showHamburger && (
        <button
          onClick={onMenuOpen}
          style={{
            all: 'unset',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 32,
            height: 32,
            borderRadius: 8,
            color: 'var(--fg-muted)',
          }}
          aria-label="Open navigation"
        >
          <Menu size={18} />
        </button>
      )}
      <AppSwitcher />
      <span
        style={{
          width: 1,
          height: 18,
          background: 'var(--border)',
          flexShrink: 0,
        }}
        aria-hidden
      />
      <nav
        aria-label="Breadcrumb"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          flex: 1,
          minWidth: 0,
        }}
      >
        {crumbs.map((crumb, idx) => (
          <span
            key={crumb.label}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            {idx > 0 && (
              <span style={{ fontSize: 13, color: 'var(--fg-subtle)' }}>/</span>
            )}
            {crumb.href ? (
              <a
                href={crumb.href}
                style={{
                  fontSize: 14,
                  fontWeight: idx === crumbs.length - 1 ? 600 : 400,
                  color: 'var(--fg-muted)',
                  textDecoration: 'none',
                }}
              >
                {crumb.label}
              </a>
            ) : (
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: 'var(--fg)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {crumb.label}
              </span>
            )}
          </span>
        ))}
      </nav>
    </header>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/admin/shell/AdminTopbar.tsx
git commit -m "feat(admin-shell): topbar v2 — height 56, AppSwitcher, separator, hamburger slot"
```

---

### Task 4: Update AdminSidebar to SidebarV2

**Files:**

- Modify: `apps/web/src/components/admin/shell/AdminSidebar.tsx`

Key changes:

- `bg: var(--surface-1)` (was `var(--bg-elevated)`)
- Remove back-to-app link (AppSwitcher handles this now)
- Badge keys: `{ crawl, review, feedback }` (was `{ crawl, events }`)
- Active indicator: absolute left=0 top=8 bottom=8 width=2 bg=var(--signal)
- NavItemV2 expanded padding: `8px 10px 8px 14px`
- NavItemV2 collapsed padding: `10px 0`
- Warning badge fg: `var(--bg)`, other kinds: `var(--fg-on-accent)`
- Collapsed dot: top=6 right=12 w=8 h=8 boxShadow="0 0 0 2px var(--surface-1)"
- Signal badge bg: `var(--signal)`, fg: `var(--fg-on-accent)`

- [ ] **Step 1: Read current AdminSidebar.tsx fully**

Read `apps/web/src/components/admin/shell/AdminSidebar.tsx` before editing.

- [ ] **Step 2: Rewrite AdminSidebar**

Replace the entire component. Key structural changes:

1. `background: 'var(--surface-1)'` on the sidebar shell
2. Remove the "Back to site" link and LogOut icon from sidebar top (LogOut stays in bottom user section)
3. `badgeCounts` prop changes from `{ crawl, events }` to `{ crawl, review, feedback }`
4. NavLink updated:
   - expanded padding: `8px 10px 8px 14px`
   - collapsed padding: `10px 0`
   - active indicator: position absolute, left 0, top 8, bottom 8, width 2, bg var(--signal)
   - badge rendering: warning kind uses `var(--bg)` fg; others use `var(--fg-on-accent)`
   - collapsed badge: dot mode (w=8 h=8) with `boxShadow: '0 0 0 2px var(--surface-1)'`
5. Badge for `feedback` uses count from `badgeCounts.feedback`

```tsx
// Interface change:
interface AdminSidebarProps {
  badgeCounts?: { crawl: number; review: number; feedback: number }
  user: { firstName: string | null; email: string }
}
```

The badge count lookup in NavLink must handle `review` and `feedback` keys mapping to their respective counts.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/admin/shell/AdminSidebar.tsx
git commit -m "feat(admin-shell): sidebar v2 — surface-1 bg, NAV_V2 badges, updated indicator + padding"
```

---

### Task 5: Create MobileBottomBar

**Files:**

- Create: `apps/web/src/components/admin/shell/MobileBottomBar.tsx`

- [ ] **Step 1: Create MobileBottomBar**

```tsx
// apps/web/src/components/admin/shell/MobileBottomBar.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import * as LucideIcons from 'lucide-react'

const BOTTOM_TABS = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    href: '/admin',
    iconName: 'LayoutDashboard',
  },
  { key: 'venues', label: 'Venues', href: '/admin/venues', iconName: 'MapPin' },
  { key: 'crawl', label: 'Crawl', href: '/admin/crawl', iconName: 'RefreshCw' },
  {
    key: 'review',
    label: 'Review',
    href: '/admin/review',
    iconName: 'ClipboardCheck',
  },
  {
    key: 'feedback',
    label: 'Feedback',
    href: '/admin/feedback',
    iconName: 'MessageSquare',
  },
]

const TabIcon = ({ name, size }: { name: string; size: number }) => {
  const Icon = (
    LucideIcons as unknown as Record<
      string,
      React.ComponentType<{ size: number }>
    >
  )[name]
  return Icon ? <Icon size={size} /> : null
}

interface MobileBottomBarProps {
  badgeCounts?: { crawl?: number; review?: number; feedback?: number }
}

export const MobileBottomBar = ({ badgeCounts = {} }: MobileBottomBarProps) => {
  const pathname = usePathname()

  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: 64,
        padding: '6px 6px 10px',
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        background: 'var(--bg-elevated)',
        borderTop: '1px solid var(--border)',
        zIndex: 8,
      }}
      aria-label="Mobile navigation"
    >
      {BOTTOM_TABS.map((tab) => {
        const active =
          tab.href === '/admin'
            ? pathname === '/admin'
            : pathname.startsWith(tab.href)
        const count = badgeCounts[tab.key as keyof typeof badgeCounts] ?? 0
        return (
          <Link
            key={tab.key}
            href={tab.href}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
              textDecoration: 'none',
              color: active ? 'var(--signal)' : 'var(--fg-muted)',
              position: 'relative',
            }}
          >
            <TabIcon name={tab.iconName} size={20} />
            <span
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: 10,
                fontWeight: active ? 700 : 600,
              }}
            >
              {tab.label}
            </span>
            {count > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: -4,
                  right: '50%',
                  transform: 'translateX(14px)',
                  minWidth: 16,
                  height: 16,
                  padding: '0 4px',
                  borderRadius: 8,
                  background: 'var(--signal)',
                  color: 'var(--fg-on-accent)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 9,
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 0 2px var(--bg-elevated)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {count}
              </span>
            )}
          </Link>
        )
      })}
    </nav>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/admin/shell/MobileBottomBar.tsx
git commit -m "feat(admin-shell): add MobileBottomBar — 5-tab fixed bottom bar with badges"
```

---

### Task 6: Create MobileDrawer

**Files:**

- Create: `apps/web/src/components/admin/shell/MobileDrawer.tsx`

- [ ] **Step 1: Create MobileDrawer**

```tsx
// apps/web/src/components/admin/shell/MobileDrawer.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { X } from 'lucide-react'
import * as LucideIcons from 'lucide-react'
import { NAV, type NavItem } from './nav'

const NavIcon = ({ name, size }: { name: string; size: number }) => {
  const Icon = (
    LucideIcons as unknown as Record<
      string,
      React.ComponentType<{ size: number }>
    >
  )[name]
  return Icon ? <Icon size={size} /> : null
}

interface MobileDrawerProps {
  open: boolean
  onClose: () => void
  badgeCounts?: { crawl?: number; review?: number; feedback?: number }
}

const BADGE_KIND_BG: Record<string, string> = {
  danger: 'var(--danger)',
  warning: 'var(--warning)',
  signal: 'var(--signal)',
}
const BADGE_KIND_FG: Record<string, string> = {
  danger: 'var(--fg-on-accent)',
  warning: 'var(--bg)',
  signal: 'var(--fg-on-accent)',
}

export const MobileDrawer = ({
  open,
  onClose,
  badgeCounts = {},
}: MobileDrawerProps) => {
  const pathname = usePathname()
  const ops = NAV.filter((it) => it.section === 'operations')
  const acct = NAV.filter((it) => it.section === 'account')

  const renderItem = (item: NavItem) => {
    const active =
      item.href === '/admin'
        ? pathname === '/admin'
        : pathname.startsWith(item.href)
    const count = item.badge
      ? (badgeCounts[item.key as keyof typeof badgeCounts] ?? 0)
      : 0
    return (
      <Link
        key={item.key}
        href={item.href}
        onClick={onClose}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '8px 10px 8px 14px',
          borderRadius: 8,
          textDecoration: 'none',
          fontSize: 13,
          fontFamily: 'var(--font-sans)',
          fontWeight: active ? 700 : 500,
          color: active ? 'var(--fg)' : 'var(--fg-muted)',
          background: active ? 'var(--surface-2)' : 'transparent',
          position: 'relative',
        }}
      >
        {active && (
          <span
            style={{
              position: 'absolute',
              left: 0,
              top: 8,
              bottom: 8,
              width: 2,
              background: 'var(--signal)',
              borderRadius: 2,
            }}
          />
        )}
        <NavIcon name={item.iconName} size={16} />
        <span style={{ flex: 1 }}>{item.label}</span>
        {item.badge && count > 0 && (
          <span
            style={{
              background: BADGE_KIND_BG[item.badge.kind] ?? 'var(--signal)',
              color: BADGE_KIND_FG[item.badge.kind] ?? 'var(--fg-on-accent)',
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              fontWeight: 700,
              padding: '2px 5px',
              borderRadius: 8,
              minWidth: 16,
              height: 16,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {count}
          </span>
        )}
      </Link>
    )
  }

  return (
    <>
      {/* Scrim */}
      {open && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            zIndex: 10,
          }}
          aria-hidden
        />
      )}
      {/* Drawer */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          width: '78%',
          maxWidth: 320,
          background: 'var(--bg-elevated)',
          borderRight: '1px solid var(--border)',
          boxShadow: open ? '8px 0 32px rgba(0,0,0,0.25)' : 'none',
          zIndex: 11,
          transform: open ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.2s ease',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
        }}
        aria-hidden={!open}
      >
        <div
          style={{
            height: 52,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            padding: '0 14px',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <button
            onClick={onClose}
            style={{
              all: 'unset',
              cursor: 'pointer',
              color: 'var(--fg-muted)',
              display: 'flex',
            }}
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>
        </div>
        <nav
          style={{
            padding: '8px 8px',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          {ops.map(renderItem)}
          <div
            style={{
              height: 1,
              background: 'var(--border)',
              margin: '8px 6px',
            }}
          />
          {acct.map(renderItem)}
        </nav>
      </div>
    </>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/admin/shell/MobileDrawer.tsx
git commit -m "feat(admin-shell): add MobileDrawer — slide-in sheet with scrim and NAV_V2"
```

---

### Task 7: Create AdminShellClient + wire layout

**Files:**

- Create: `apps/web/src/components/admin/shell/AdminShellClient.tsx`
- Modify: `apps/web/src/app/(protected)/admin/layout.tsx`
- Create: `apps/web/src/app/(protected)/admin/review/page.tsx` (stub)
- Create: `apps/web/src/app/(protected)/admin/feedback/page.tsx` (stub)
- Modify: `apps/web/src/app/(protected)/admin/events/page.tsx`
- Modify: `apps/web/src/app/(protected)/admin/prices/page.tsx`

- [ ] **Step 1: Create AdminShellClient**

```tsx
// apps/web/src/components/admin/shell/AdminShellClient.tsx
'use client'

import { useState } from 'react'
import { AdminSidebar } from './AdminSidebar'
import { AdminTopbar } from './AdminTopbar'
import { MobileDrawer } from './MobileDrawer'
import { MobileBottomBar } from './MobileBottomBar'

interface AdminShellClientProps {
  children: React.ReactNode
  user: { firstName: string | null; email: string }
  badgeCounts: { crawl: number; review: number; feedback: number }
}

export const AdminShellClient = ({
  children,
  user,
  badgeCounts,
}: AdminShellClientProps) => {
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <div
      style={{
        display: 'flex',
        height: '100dvh',
        overflow: 'hidden',
        background: 'var(--bg)',
        color: 'var(--fg)',
      }}
    >
      {/* Desktop sidebar — hidden on mobile via CSS */}
      <div className="admin-sidebar-desktop">
        <AdminSidebar badgeCounts={badgeCounts} user={user} />
      </div>

      {/* Main column */}
      <div
        style={{
          display: 'flex',
          flex: 1,
          flexDirection: 'column',
          overflow: 'hidden',
          minWidth: 0,
        }}
      >
        {/* Topbar — hamburger visible on mobile */}
        <div className="admin-topbar-mobile-hide">
          <AdminTopbar />
        </div>
        <div className="admin-topbar-mobile-show">
          <AdminTopbar onMenuOpen={() => setDrawerOpen(true)} showHamburger />
        </div>

        {/* Content */}
        <main
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px 28px',
          }}
          className="admin-main-content"
        >
          {children}
        </main>
      </div>

      {/* Mobile drawer + bottom bar */}
      <MobileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        badgeCounts={badgeCounts}
      />
      <div className="admin-bottom-bar-mobile">
        <MobileBottomBar badgeCounts={badgeCounts} />
      </div>
    </div>
  )
}
```

Add to `apps/web/src/app/(protected)/admin/admin.css`:

```css
/* Shell responsive — hide/show desktop sidebar vs mobile nav */
@media (max-width: 720px) {
  .admin-sidebar-desktop {
    display: none !important;
  }
  .admin-topbar-mobile-hide {
    display: none !important;
  }
  .admin-main-content {
    padding: 16px 14px 80px !important;
  } /* 80px = bottom bar clearance */
}
@media (min-width: 721px) {
  .admin-topbar-mobile-show {
    display: none !important;
  }
  .admin-bottom-bar-mobile {
    display: none !important;
  }
}
```

- [ ] **Step 2: Update layout.tsx**

Fetch review badge count (pending flags + pending submissions) and feedback badge (unread). Replace inline shell render with `<AdminShellClient>`.

```tsx
// In layout.tsx — new badge fetches
const [statusRes, reviewRes, submissionsRes, feedbackRes] =
  await Promise.allSettled([
    apiClient.get<CrawlStatusVenue[]>('/v1/admin/crawl/status', token),
    apiClient.get<EventCounts>('/v1/admin/events/count', token),
    apiClient.get<{ data: unknown[] }>('/v1/admin/prices/submissions', token),
    apiClient.get<{ data: unknown[] }>(
      '/v1/admin/feedback?status=unread&limit=100',
      token,
    ),
  ])

// blockedCrawls: same as before
// reviewBadge: pendingEvents + pending submissions count
// feedbackBadge: unread feedback count
```

Replace the inner div structure with:

```tsx
<AdminShellClient
  user={{ firstName: adminUser.firstName, email: adminUser.email }}
  badgeCounts={{
    crawl: blockedCrawls,
    review: reviewBadge,
    feedback: feedbackBadge,
  }}
>
  {children}
</AdminShellClient>
```

- [ ] **Step 3: Create stub review page**

```tsx
// apps/web/src/app/(protected)/admin/review/page.tsx
export default function AdminReviewPage() {
  return (
    <div>
      <h1
        style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 24,
          fontWeight: 700,
          color: 'var(--fg)',
        }}
      >
        Review
      </h1>
      <p style={{ color: 'var(--fg-muted)', marginTop: 8 }}>
        Event flags and price coverage — full implementation in Surface 6.
      </p>
    </div>
  )
}
```

- [ ] **Step 4: Create stub feedback page**

```tsx
// apps/web/src/app/(protected)/admin/feedback/page.tsx
export default function AdminFeedbackPage() {
  return (
    <div>
      <h1
        style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 24,
          fontWeight: 700,
          color: 'var(--fg)',
        }}
      >
        Feedback
      </h1>
      <p style={{ color: 'var(--fg-muted)', marginTop: 8 }}>
        Feedback triage — full implementation in Surface 7.
      </p>
    </div>
  )
}
```

- [ ] **Step 5: Redirect old pages**

```tsx
// apps/web/src/app/(protected)/admin/events/page.tsx
import { redirect } from 'next/navigation'
export default function AdminEventsPage() {
  redirect('/admin/review')
}

// apps/web/src/app/(protected)/admin/prices/page.tsx
import { redirect } from 'next/navigation'
export default function AdminPricesPage() {
  redirect('/admin/review')
}
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/admin/shell/AdminShellClient.tsx \
        apps/web/src/app/\(protected\)/admin/layout.tsx \
        apps/web/src/app/\(protected\)/admin/admin.css \
        apps/web/src/app/\(protected\)/admin/review/page.tsx \
        apps/web/src/app/\(protected\)/admin/feedback/page.tsx \
        apps/web/src/app/\(protected\)/admin/events/page.tsx \
        apps/web/src/app/\(protected\)/admin/prices/page.tsx
git commit -m "feat(admin-shell): wire AdminShellClient, mobile nav, redirects for events+prices"
```

---

## Surface 2 — Dashboard (AttentionFeed)

### Task 8: Create AttentionFeed component

**Files:**

- Create: `apps/web/src/components/admin/dashboard/AttentionFeed.tsx`
- Modify: `apps/web/src/app/(protected)/admin/page.tsx`

- [ ] **Step 1: Create AttentionFeed.tsx**

The component receives a list of attention items (failures, flags, pending subs) and renders:

- One row per exception item: `grid "32px 1fr auto"`, gap=12, padding="14px 18px", borderBottom
- Icon chip: w=28, h=28, borderRadius=8, severity-tinted bg
- Title: fontSize=13, fw=600, letterSpacing=-0.005em, lineHeight=1.4
- Meta: fontSize=12, fg-muted, marginTop=3
- Action link (optional): fontSize=11, fw=700, color=var(--signal)
- DigestRow for success rollup: padding="12px 18px", bg=var(--surface-1), borderTop; icon w=22, h=22, borderRadius=11, success tint

SEV_TINT map:

- danger: bg=`color-mix(in oklab, var(--danger) 14%, transparent)`, border=`color-mix(in oklab, var(--danger) 32%, transparent)`
- warning: bg=`color-mix(in oklab, var(--warning) 16%, transparent)`, border=`color-mix(in oklab, var(--warning) 36%, transparent)`
- signal: bg=`color-mix(in oklab, var(--signal) 12%, transparent)`, border=`color-mix(in oklab, var(--signal) 28%, transparent)`
- neutral: bg=`var(--surface-1)`, border=`var(--border)`

```tsx
// apps/web/src/components/admin/dashboard/AttentionFeed.tsx
export type AttentionSeverity = 'danger' | 'warning' | 'signal' | 'neutral'

export interface AttentionItemData {
  id: string
  severity: AttentionSeverity
  iconName: string
  title: string
  meta: string
  actionLabel?: string
  actionHref?: string
}

interface AttentionFeedProps {
  items: AttentionItemData[]
  successCount?: number
}

const SEV_BG: Record<AttentionSeverity, string> = {
  danger:  'color-mix(in oklab, var(--danger) 14%, transparent)',
  warning: 'color-mix(in oklab, var(--warning) 16%, transparent)',
  signal:  'color-mix(in oklab, var(--signal) 12%, transparent)',
  neutral: 'var(--surface-1)',
}

// ... (full implementation with AttentionItemRow + DigestRow + empty state)
export const AttentionFeed = ({ items, successCount = 0 }: AttentionFeedProps) => { ... }
```

- [ ] **Step 2: Update dashboard page**

In `apps/web/src/app/(protected)/admin/page.tsx`:

1. Remove `RunAllVenuesButton` import and usage
2. Remove "Add venue" CTA
3. Remove `ActivityFeed` import and usage
4. Import and render `AttentionFeed` with data built from failed/blocked venues + pending events
5. Remove `RunAllVenuesButton.tsx` component file

The attention items should be built from:

- Failed/blocked crawl venues → severity `danger` or `warning`
- Pending events (pendingEvents count > 0) → severity `warning`, action links to /admin/review
- Any pending price submissions → severity `signal`, action link to /admin/review

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/admin/dashboard/AttentionFeed.tsx \
        apps/web/src/app/\(protected\)/admin/page.tsx
git commit -m "feat(admin-dashboard): replace ActivityFeed with AttentionFeed, remove RunAll/AddVenue CTAs"
```

---

## Surface 3 — Crawl Inspector (Tabs + Diagnostics)

### Task 9: Add InspectorTabs to CrawlSplitView

**Files:**

- Create: `apps/web/src/components/admin/crawl/InspectorTabs.tsx`
- Modify: `apps/web/src/components/admin/crawl/CrawlSplitView.tsx`

- [ ] **Step 1: Create InspectorTabs**

```tsx
// apps/web/src/components/admin/crawl/InspectorTabs.tsx
'use client'
type Tab = 'overview' | 'diagnostics'
interface InspectorTabsProps {
  active: Tab
  onChange: (tab: Tab) => void
  showDiagnosticsDot?: boolean
}
export const InspectorTabs = ({
  active,
  onChange,
  showDiagnosticsDot,
}: InspectorTabsProps) => (
  <div
    style={{
      padding: '0 22px',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      gap: 4,
      background: 'var(--bg-elevated)',
    }}
  >
    {(['overview', 'diagnostics'] as Tab[]).map((tab) => {
      const isActive = active === tab
      const isDiag = tab === 'diagnostics'
      return (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          style={{
            all: 'unset',
            cursor: 'pointer',
            padding: '12px 14px',
            fontFamily: 'var(--font-sans)',
            fontSize: 13,
            fontWeight: isActive ? 700 : 600,
            color: isActive ? 'var(--fg)' : 'var(--fg-muted)',
            borderBottom: isActive
              ? '2px solid var(--signal)'
              : '2px solid transparent',
            marginBottom: -1,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          {tab === 'overview' ? 'Overview' : 'Diagnostics'}
          {isDiag && showDiagnosticsDot && (
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                background: 'var(--warning)',
                boxShadow: `0 0 0 2px color-mix(in oklab, var(--warning) 22%, transparent)`,
              }}
            />
          )}
        </button>
      )
    })}
  </div>
)
```

- [ ] **Step 2: Add tab state to CrawlSplitView**

In `CrawlSplitView.tsx`, add `useState<'overview' | 'diagnostics'>('overview')`, render `InspectorTabs` above the inspector content, and conditionally show the Diagnostics panel (only when selected run status is `failed` or `blocked`).

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/admin/crawl/InspectorTabs.tsx \
        apps/web/src/components/admin/crawl/CrawlSplitView.tsx
git commit -m "feat(admin-crawl): add InspectorTabs — Overview/Diagnostics with dot indicator"
```

---

### Task 10: Create DiagnosticsPanel + StagedApplyConfirm

**Files:**

- Create: `apps/web/src/components/admin/crawl/DiagnosticsPanel.tsx`
- Create: `apps/web/src/components/admin/crawl/StagedApplyConfirm.tsx`

- [ ] **Step 1: Create DiagnosticsPanel**

The panel shows (only when run is failed/blocked):

- WhatHappenedSection: danger 8% bg, 30% border, padding="14px 16px"; 4-col stats grid paddingLeft=26
- WhyHappenedSection: bg=var(--surface-1), "rule-based" neutral badge, paddingLeft=24
- OptionsSection: grid repeat(auto-fit, minmax(260px, 1fr)), gap=10; each option card padding="14px 14px 12px", borderRadius=10; staged card: signal 6%/40%
- Note strip: bg=var(--surface-1), dashed border, borderRadius=8, fontSize=11
- StrategyHistory: grid "140px 1fr auto auto", padding="10px 14px"

For now, this panel can display placeholder data from the selected crawl run (real data from API in a follow-up if not already structured).

- [ ] **Step 2: Create StagedApplyConfirm modal**

```
w=640, borderRadius=14, boxShadow="0 24px 64px rgba(0,0,0,0.35)"
Config diff: grid "160px 1fr", padding="10px 14px"
Before value: danger color, danger 6% bg, "4px 8px" padding
After value: success color, success 6% bg, same padding
Action shelf: bg=var(--surface-1), "Trigger re-crawl now" checkbox (accentColor=var(--signal)), Cancel + "Apply change" buttons
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/admin/crawl/DiagnosticsPanel.tsx \
        apps/web/src/components/admin/crawl/StagedApplyConfirm.tsx
git commit -m "feat(admin-crawl): add DiagnosticsPanel + StagedApplyConfirm modal"
```

---

## Surface 4 — Venues Table (VenueQuickView accordion)

### Task 11: Add accordion expansion to venues table

**Files:**

- Create: `apps/web/src/components/admin/VenueQuickView.tsx`
- Modify: `apps/web/src/components/admin/venue-table-client.tsx`

- [ ] **Step 1: Create VenueQuickView**

```
Outer: padding="18px 22px", bg=var(--surface-1), borderBottom
Info grid: repeat(auto-fit, minmax(180px, 1fr)), gap=18, marginBottom=14
Ticket URL: ADMIN_MONO, fontSize=11, color=var(--signal), inline-flex gap=4
Consecutive failures: ADMIN_MONO, fontSize=18, fw=700; "of 4" suffix fontSize=11
  - ≥3: color=var(--danger); >0: color=var(--warning); 0: color=var(--fg)
Last error strip: padding="10px 14px", danger-tinted when failures>0, borderRadius=6, marginBottom=14
Action shelf: flex, gap=8, flexWrap=wrap
  - Buttons: "Run crawl now", "Edit venue", "Open detail", "Crawl history"
```

- [ ] **Step 2: Add accordion to venue table**

In `venue-table-client.tsx`:

- Add `expandedId` state (string | null)
- Render a chevron column in each row that rotates 90deg when expanded (transition=.15s)
- When expanded, render an extra `<tr>` with `colSpan=11` containing `<VenueQuickView venue={row} />`
- One open at a time: clicking a chevron closes any other open row

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/admin/VenueQuickView.tsx \
        apps/web/src/components/admin/venue-table-client.tsx
git commit -m "feat(admin-venues): add VenueQuickView accordion — chevron expansion, info grid, action shelf"
```

---

## Surface 5 — Venue Detail (VDSection redesign)

### Task 12: Redesign VenueDetailsClient with VD primitives

**Files:**

- Modify: `apps/web/src/components/admin/VenueDetailsClient.tsx`
- Create: `apps/web/src/components/admin/generate-field/GenerateField.tsx`
- Create: `apps/web/src/components/admin/DeleteVenueConfirm.tsx`

- [ ] **Step 1: Create VenueDetailsClient primitives (VDField, VDInput, VDSelect, VDSegToggle, VDSection)**

Add these as named exports within `VenueDetailsClient.tsx` or a co-located `vd-primitives.tsx`:

```
VDField: label (12px fw=700 letterSpacing=-0.005em), hint (ADMIN_MONO 10px uppercase), helper (11px fg-muted lineHeight=1.5 marginTop=6)
VDInput: h=36, padding="0 4px 0 12px", border=1px solid var(--border-strong), borderRadius=8, bg=var(--bg-elevated); input: fontSize=13, fw=500
VDSelect: h=36, same border; chevron at right=10, rotate(90deg), color=var(--fg-subtle)
VDSegToggle: container padding=2, borderRadius=8, bg=var(--surface-1); option padding="6px 14px", borderRadius=6, fw=700 12px; active: bg=var(--signal), color=var(--fg-on-accent)
VDSection: bg=var(--bg-elevated), border=1px solid var(--border), borderRadius=12; header: padding="16px 22px", borderBottom; eyebrow=MonoLabel; title: 17px fw=700 letterSpacing=-0.015em marginTop=4; body: padding=22
```

- [ ] **Step 2: Replace venue detail sections with VDSection cards**

Wrap each section (Identity, Ticketing, Crawl, Editorial, Identity Art, Danger) in `<VDSection>` with matching eyebrow labels matching the design (`"01 · identity"`, `"02 · ticketing"`, etc.). Replace raw inputs with `VDInput`/`VDSelect`/`VDSegToggle`.

- [ ] **Step 3: Create GenerateField (5 states)**

```
idle: GenerateButton — padding="6px 10px", borderRadius=6, accent 8%/34%, fontSize=12 fw=700; cost: ADMIN_MONO 10px opacity=0.7
loading: signal 6%/28% bg/border, Spinner(14), "Generating…" + "~3–5s"
review: accent 6%/32%, padding="14px 16px"; "suggested" MonoLabel + "llm" badge + cost+tokens (ADMIN_MONO 11px); content: 13px lineHeight=1.55; sources: ADMIN_MONO 10px letterSpacing=0.04em
accepted: success 5%/38%, "generated · accepted" success dot pill
error: danger 8%/32%
```

- [ ] **Step 4: Create DeleteVenueConfirm modal**

```
Scrim: rgba(0,0,0,0.5)
Container: w=520, border=1px solid color-mix(danger 32%), borderTop="3px solid var(--danger)", borderRadius=14, boxShadow="0 24px 64px rgba(0,0,0,0.4)"
Header: padding="22px 24px 16px"; h3: 22px fw=800 letterSpacing=-0.02em
DELETE gate input: ADMIN_MONO 16px fw=700 letterSpacing=0.08em
Container unarmed: 1px solid var(--border-strong), borderRadius=10
Container armed: 1.5px solid var(--danger), transition=0.12s
Action shelf: bg=var(--surface-1), padding="14px 24px"
```

- [ ] **Step 5: Add sticky save bar**

At bottom of VenueDetailsClient, add:

```
position=sticky, bottom=0, marginTop=4, padding="12px 18px", bg=var(--bg-elevated), border=1px solid var(--border), borderRadius=12, boxShadow="0 -6px 18px rgba(0,0,0,0.06)"
Left: unsaved count badge + field names
Right: Discard (ghost) + Save changes (primary)
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/admin/VenueDetailsClient.tsx \
        apps/web/src/components/admin/generate-field/GenerateField.tsx \
        apps/web/src/components/admin/DeleteVenueConfirm.tsx
git commit -m "feat(admin-venue-detail): VDSection redesign, GenerateField 5-state, DeleteVenueConfirm, sticky save bar"
```

---

## Surface 6 — Review page (new)

### Task 13: Add feedback schema + migration + API

**Files:**

- Modify: `packages/db/src/schema/social.ts`
- Create: `packages/db/src/migrations/0013_feedback_triage_fields.sql`
- Create: `apps/api/src/routes/admin/feedback.ts`
- Modify: `apps/api/src/routes/admin/index.ts`

- [ ] **Step 1: Write failing test for feedback API**

```typescript
// apps/api/src/routes/admin/feedback.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
// ... test that GET /v1/admin/feedback returns { success: true, data: [...] }
// ... test that PATCH /v1/admin/feedback/:id updates status
```

- [ ] **Step 2: Add schema columns to feedback table**

In `packages/db/src/schema/social.ts`, add:

```typescript
export const feedbackStatusEnum = pgEnum('feedback_status', [
  'unread',
  'read',
  'flagged',
  'issue_opened',
  'resolved',
  'archived',
])

// In feedback table:
status: feedbackStatusEnum('status').notNull().default('unread'),
adminNotes: text('admin_notes'),
issueUrl: text('issue_url'),
```

- [ ] **Step 3: Create migration**

The `when` timestamp must be greater than all existing migrations. Check the last migration timestamp and set accordingly.

```sql
-- packages/db/src/migrations/0013_feedback_triage_fields.sql
CREATE TYPE feedback_status AS ENUM ('unread','read','flagged','issue_opened','resolved','archived');
ALTER TABLE feedback ADD COLUMN status feedback_status NOT NULL DEFAULT 'unread';
ALTER TABLE feedback ADD COLUMN admin_notes text;
ALTER TABLE feedback ADD COLUMN issue_url text;
```

Update `packages/db/src/migrations/meta/_journal.json` with the new entry (when timestamp > last entry).

- [ ] **Step 4: Create feedback API route**

```typescript
// apps/api/src/routes/admin/feedback.ts
// GET /v1/admin/feedback — list, supports ?status=unread&limit=100
// PATCH /v1/admin/feedback/:id — update status, adminNotes, issueUrl
```

- [ ] **Step 5: Mount in admin index**

```typescript
// apps/api/src/routes/admin/index.ts
import { feedbackAdminRouter } from './feedback.js'
adminRouter.route('/feedback', feedbackAdminRouter)
```

- [ ] **Step 6: Run migration locally**

```bash
pnpm db:migrate
```

- [ ] **Step 7: Run tests**

```bash
pnpm --filter @concert-crawl/api test
```

- [ ] **Step 8: Commit**

```bash
git add packages/db/src/schema/social.ts \
        packages/db/src/migrations/ \
        apps/api/src/routes/admin/feedback.ts \
        apps/api/src/routes/admin/index.ts
git commit -m "feat(feedback-api): add status/adminNotes/issueUrl schema, migration, admin feedback CRUD"
```

---

### Task 14: Build Review page components

**Files:**

- Create: `apps/web/src/components/admin/review/ConfidenceBar.tsx`
- Create: `apps/web/src/components/admin/review/EventFlagRow.tsx`
- Create: `apps/web/src/components/admin/review/EventFlagInspector.tsx`
- Create: `apps/web/src/components/admin/review/EventFlagsSection.tsx`
- Create: `apps/web/src/components/admin/review/PendingSubmissionsPanel.tsx`
- Create: `apps/web/src/components/admin/review/PriceCoverageTable.tsx`
- Create: `apps/web/src/components/admin/review/BulkActionDock.tsx`
- Create: `apps/web/src/components/admin/review/BulkApproveConfirm.tsx`
- Modify: `apps/web/src/app/(protected)/admin/review/page.tsx`

- [ ] **Step 1: Create ConfidenceBar**

```tsx
// 4px track, bg=var(--surface-2); fill: --success(≥0.80)/--signal(≥0.70)/--warning(≥0.60)/--danger(<0.60)
// label: ADMIN_MONO fontSize=11 fw=700 minWidth=32 textAlign=right
// container: flex gap=8 alignItems=center minWidth=96
```

- [ ] **Step 2: Create EventFlagRow**

```
grid "auto 1fr auto auto", gap=14, padding="14px 18px", borderBottom
active: bg=var(--surface-2), borderLeft="2px solid var(--signal)"
selected: bg=color-mix(in oklab, var(--signal) 6%, transparent)
inactive: borderLeft="2px solid transparent"
Checkbox: accentColor=var(--signal), w=15 h=15
Title: fontSize=13, fw=600, letterSpacing=-0.005em, lineHeight=1.4, ellipsis
Venue: fontSize=12, fg-muted; date: ADMIN_MONO 11px fg-muted
Reason chips: StatusBadge per reason, gap=6
ConfidenceBar
Approve/Reject buttons (stop propagation)
```

- [ ] **Step 3: Create EventFlagInspector**

```
Header: padding="14px 18px", borderBottom, bg=var(--surface-1)
  - MonoLabel + status badge; h3: 18px fw=700 letterSpacing=-0.02em
Body: padding="16px 18px", flex col gap=16, flex=1, overflowY=auto
  - Confidence section
  - LLM reasoning: padding="12px 14px", accent 7%/30%, borderRadius=8, fontSize=12 lineHeight=1.55
  - Raw source pre: padding="12px 14px", surface-1, border, borderRadius=8, ADMIN_MONO 11px
  - Run/cost strip: padding="10px 12px", surface-1, border, borderRadius=8, ADMIN_MONO 11px, gap=12
Action shelf: padding="12px 18px", borderTop, bg=var(--bg-elevated)
  - Reject (ghost sm) | Edit & approve (outline sm) | Approve (success sm, marginLeft=auto)
```

- [ ] **Step 4: Create EventFlagsSection**

Two states: empty (queue clear) and with items (list + inspector split grid `1.1fr 1fr`).

Empty state: padding="18px 22px", flex, alignItems=center, justifyContent=space-between; icon chip w=36 h=36 borderRadius=18, success 14%, iconSize=18.

With items: Panel header with select-all checkbox + "Hide non-concert" button; split grid minHeight=420.

- [ ] **Step 5: Create PendingSubmissionsPanel**

```
Panel with title "Community price submissions" + signal badge
Rows: grid "1fr auto auto auto", gap=14, padding="12px 18px", borderBottom
  - Event title (13px fw=600) + venue·date (fg-muted)
  - Submitter (ADMIN_MONO accent fw=700) + note (italic fg-muted)
  - Price range (ADMIN_MONO 13px fw=700 tabular-nums)
  - RelTime
  - Deny (ghost sm) + "Approve · award cred" (success sm)
```

- [ ] **Step 6: Create PriceCoverageTable**

```
Panel with "Price coverage" title + "{N} missing" warning badge
Filter buttons: Source, Missing only
AdminTable inside (no border/radius on table itself)
Columns: Event | Venue/date | Source | Current price | Updated | ⋯
Source badges: crawled=signal outline, community=accent outline, admin=warning outline, null=danger "no price"
Stale label: "STALE" fontSize=10 fw=700 color=var(--warning) letterSpacing=0.04em
AddPriceInlineForm: signal 5%/30%, padding="14px 18px", grid "1fr auto auto auto auto" gap=12
  - Price inputs: h=32, padding="0 10px", borderRadius=6, ADMIN_MONO 13px fw=600, $-prefix
PriceRowMenu: position=absolute right=28 top=100%, minWidth=180, padding=4, borderRadius=10, boxShadow complex
```

- [ ] **Step 7: Create BulkActionDock**

```
position=sticky, bottom=18, alignSelf=center, mx=auto
padding="10px 12px 10px 18px", bg=var(--ink), borderRadius=14
boxShadow="0 12px 36px rgba(0,0,0,0.32), 0 2px 6px rgba(0,0,0,0.18)", zIndex=50
Count chip: minWidth=22, h=22, padding="0 7px", borderRadius=11, bg=var(--signal), fg-on-accent, ADMIN_MONO 11px fw=700
Separator: 1px × 18px, rgba(255,255,255,0.16)
Re-tag: padding="6px 10px" borderRadius=7 fontSize=12 fw=600 color=var(--paper)
Reject all: same size, color=color-mix(danger 60%, #fff)
Approve N: padding="8px 14px" borderRadius=8 bg=var(--success) fg-on-accent 13px fw=700
Clear btn: padding=6 borderRadius=6 color=rgba(255,255,255,0.6)
```

- [ ] **Step 8: Create BulkApproveConfirm**

```
Scrim: rgba(0,0,0,0.45), zIndex=100
Container: w=520, border, borderRadius=14, boxShadow="0 24px 64px rgba(0,0,0,0.35)"
Header: padding="18px 22px", borderBottom; h3: 18px fw=700 letterSpacing=-0.02em margin="6px 0 0"
Event preview list: border, borderRadius=8, overflow=hidden, bg=var(--surface-1)
  - Preview row: grid "1fr auto", gap=12, padding="8px 12px", borderBottom
Warning strip: padding="10px 12px", warning 8%/28%, borderRadius=8, marginTop=12
Action shelf: padding="14px 22px", borderTop, bg=var(--surface-1)
```

- [ ] **Step 9: Replace stub review page.tsx with full page**

The page fetches:

- `GET /v1/admin/events?verified=false&limit=100` → flagged events
- `GET /v1/admin/prices/submissions` → pending submissions
- `GET /v1/admin/prices/events` → price coverage rows

Renders `EventFlagsSection` + `PendingSubmissionsPanel` + `PriceCoverageTable` with data.

- [ ] **Step 10: Commit**

```bash
git add apps/web/src/components/admin/review/ \
        apps/web/src/app/\(protected\)/admin/review/page.tsx
git commit -m "feat(admin-review): new Review page — event flags, pending submissions, price coverage, bulk dock"
```

---

## Surface 7 — Feedback page (new)

### Task 15: Build Feedback page components

**Files:**

- Create: `apps/web/src/components/admin/feedback/FeedbackFilterRail.tsx`
- Create: `apps/web/src/components/admin/feedback/FeedbackRow.tsx`
- Create: `apps/web/src/components/admin/feedback/FeedbackExpanded.tsx`
- Modify: `apps/web/src/app/(protected)/admin/feedback/page.tsx`

- [ ] **Step 1: Create FeedbackFilterRail**

```
Container: w=200, bg=var(--bg-elevated), border=1px solid var(--border), borderRadius=12, padding=8, gap=2, alignSelf=flex-start
Section header: MonoLabel in padding="8px 10px"
Filter items: padding="8px 10px", borderRadius=8; active: bg=var(--surface-2), indicator absolute left=0 top=8 bottom=8 w=2 bg=var(--signal) borderRadius=2
Count badge: ADMIN_MONO 10px fw=700, padding="2px 6px", borderRadius=8, active bg=var(--bg) | inactive bg=var(--surface-1)
Separator: h=1, bg=var(--border), margin="6px 8px"
Source checkboxes: padding="6px 10px", fontSize=12, accentColor=var(--signal)
```

- [ ] **Step 2: Create FeedbackRow (collapsed)**

```
Container: borderBottom; isUnread: bg=var(--surface-2)
Unread dot: position=absolute, left=6, top=22, w=6, h=6, borderRadius=3, bg=var(--signal)
Button: grid "auto 1fr auto auto auto", gap=14, padding="12px 16px 12px 22px"
Handle: ADMIN_MONO 11px fw=700 color=var(--accent) letterSpacing=0.02em
Body first line: fontSize=13, isUnread: fw=600 color=var(--fg) | else fw=500 color=var(--fg-muted); lineHeight=1.4, ellipsis, maxWidth=540
Badges: category badge + status badge (dot for unread/flagged) + screenshot badge + source badge
Chevron icon: chevD when expanded, chevR when collapsed
```

- [ ] **Step 3: Create FeedbackExpanded**

```
Container: padding="4px 22px 18px 22px", bg=var(--bg-elevated), borderTop
Grid: "minmax(0, 1.4fr) minmax(0, 1fr)", gap=20, marginTop=12
Left column:
  - "full body" MonoLabel + body block: padding="14px 16px", surface-1, border, borderRadius=8, 13px lineHeight=1.6
  - Screenshot slot (if hasScreenshot): h=200, borderRadius=8, border, striped bg
  - Admin notes textarea: padding="10px 12px", borderRadius=8, border-strong, bg-elevated, 12px lineHeight=1.5
Right column:
  - "context" MonoLabel + context block: padding="10px 14px", surface-1, border, borderRadius=8, ADMIN_MONO 11px gap=8
    - Key: w=70, 10px uppercase letterSpacing=0.06em fw=700 color=fg-subtle
    - Value: flex=1, fw=600 color=var(--fg)
  - Linked issue block (if issueUrl): accent 7%/32%, padding="12px 14px", borderRadius=8; URL: ADMIN_MONO 12px fw=700 color=var(--accent)
  - Create issue (if no issueUrl): surface-1, dashed border-strong, padding="12px 14px", borderRadius=8; "Open in GitHub…" button
Action shelf: padding="12px 0 0", marginTop=14, borderTop; Mark read/unread + Flag + GitHub + View user | Resolve + Archive
```

- [ ] **Step 4: Replace stub feedback page with full page**

The page:

1. Fetches `GET /v1/admin/feedback?limit=100` (all, with filter on server or client)
2. Shows stat cards: Last 7 days, Unread, Flagged, Issues opened
3. Renders FeedbackFilterRail + Panel with FeedbackRow list
4. Layout: grid "200px minmax(0, 1fr)", gap=20

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/admin/feedback/ \
        apps/web/src/app/\(protected\)/admin/feedback/page.tsx
git commit -m "feat(admin-feedback): new Feedback page — filter rail, feedback rows, expanded view, action shelf"
```

---

## Final QA

### Task 16: Quality gate + type check

- [ ] **Step 1: Run typecheck**

```bash
pnpm --filter @concert-crawl/web typecheck
pnpm --filter @concert-crawl/api typecheck
```

- [ ] **Step 2: Run lint**

```bash
pnpm --filter @concert-crawl/web lint
pnpm --filter @concert-crawl/api lint
```

- [ ] **Step 3: Run tests**

```bash
pnpm --filter @concert-crawl/web test
pnpm --filter @concert-crawl/api test
```

- [ ] **Step 4: Fix all errors**

Fix every type error, lint violation, and test failure before proceeding to design verification.

- [ ] **Step 5: Commit fixes**

```bash
git add -A && git commit -m "fix(admin-ui-v2): typecheck + lint + test fixes"
```

---

## Resume

Next step: Begin executing tasks starting at Task 1. All 16 tasks must be completed before design-review Agent 2 runs.
