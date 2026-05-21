# Admin UI v2 — Plan A: Shell + Navigation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the admin shell so the nav matches NAV_V2 (Review + Feedback replace Events + Prices), AppSwitcher lands in the topbar, and ≤720px gets a hamburger drawer + bottom tab bar.

**Architecture:** Convert the layout from a static sidebar-only shell to a responsive shell that hides the sidebar on mobile and replaces it with a hamburger-controlled sheet drawer and a persistent bottom tab bar. The layout stays a server component (auth + badge data); a `AdminShellClient` client component receives the shell data and owns the mobile-open state.

**Tech Stack:** Next.js App Router, React 18, inline styles (no Tailwind for admin), Lucide icons

---

## File Map

| File                                                       | Action | Purpose                                                                                                 |
| ---------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------- | ----------- |
| `apps/web/src/components/admin/shell/nav.ts`               | Modify | NAV_V2 — add Review + Feedback, remove Events + Prices, fix sections, add signal kind                   |
| `apps/web/src/components/admin/shell/AdminSidebar.tsx`     | Modify | Remove back-to-app link, update badge key from `events` → `review`, add `feedback` key                  |
| `apps/web/src/components/admin/shell/AppSwitcher.tsx`      | Create | Segmented pill with `User app                                                                           | Admin` tabs |
| `apps/web/src/components/admin/shell/AdminTopbar.tsx`      | Modify | Add AppSwitcher (right-aligned), add hamburger button (mobile only)                                     |
| `apps/web/src/components/admin/shell/MobileDrawer.tsx`     | Create | Full-height sheet drawer with full NAV_V2 including Account section                                     |
| `apps/web/src/components/admin/shell/MobileBottomBar.tsx`  | Create | Fixed 5-item bottom bar for Dashboard, Venues, Crawl, Review, Feedback                                  |
| `apps/web/src/components/admin/shell/AdminShellClient.tsx` | Create | Client wrapper that owns hamburger open state + passes it to topbar + drawer                            |
| `apps/web/src/app/(protected)/admin/layout.tsx`            | Modify | Wire new badge counts (review = flagged events + pending subs, feedback = unread), use AdminShellClient |
| `apps/web/src/app/(protected)/admin/review/page.tsx`       | Create | Stub page (Plan C will replace with full content)                                                       |
| `apps/web/src/app/(protected)/admin/feedback/page.tsx`     | Create | Stub page (Plan C will replace with full content)                                                       |
| `apps/web/src/app/(protected)/admin/events/page.tsx`       | Modify | Redirect to /admin/review                                                                               |
| `apps/web/src/app/(protected)/admin/prices/page.tsx`       | Modify | Redirect to /admin/review                                                                               |
| `apps/web/src/components/admin/shell/nav.test.ts`          | Modify | Update tests for NAV_V2 shape                                                                           |
| `apps/api/src/routes/admin/events.ts`                      | Read   | Verify `/v1/admin/events/count` returns `{ pending }` — used for review badge                           |
| `apps/api/src/routes/admin/prices.ts`                      | Read   | Verify `/v1/admin/prices/submissions` returns pending submissions                                       |

---

### Task 1: Update nav.ts to NAV_V2

**Files:**

- Modify: `apps/web/src/components/admin/shell/nav.ts`
- Modify: `apps/web/src/components/admin/shell/nav.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `nav.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { NAV } from './nav'

describe('NAV', () => {
  it('contains review but not events or prices', () => {
    const keys = NAV.map((item) => item.key)
    expect(keys).toContain('review')
    expect(keys).toContain('feedback')
    expect(keys).not.toContain('events')
    expect(keys).not.toContain('prices')
  })

  it('review is in operations section', () => {
    const review = NAV.find((item) => item.key === 'review')
    expect(review?.section).toBe('operations')
  })

  it('feedback is in operations section', () => {
    const feedback = NAV.find((item) => item.key === 'feedback')
    expect(feedback?.section).toBe('operations')
  })

  it('invite-codes is in account section', () => {
    const invites = NAV.find((item) => item.key === 'invite-codes')
    expect(invites?.section).toBe('account')
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

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @concert-crawl/web test nav`
Expected: FAIL — review/feedback not found, events/prices still in NAV

- [ ] **Step 3: Rewrite nav.ts**

```typescript
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
    iconName: 'CalendarCheck',
    badge: { count: 0, kind: 'warning' },
    section: 'operations',
  },
  {
    key: 'feedback',
    label: 'Feedback',
    href: '/admin/feedback',
    iconName: 'Inbox',
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

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @concert-crawl/web test nav`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git -C /Users/huey/Projects/concert-crawl/.worktrees/admin-ui-v2 add apps/web/src/components/admin/shell/nav.ts apps/web/src/components/admin/shell/nav.test.ts
git -C /Users/huey/Projects/concert-crawl/.worktrees/admin-ui-v2 commit -m "feat(admin-shell): NAV_V2 — Review + Feedback replace Events + Prices"
```

---

### Task 2: Create AppSwitcher component

**Files:**

- Create: `apps/web/src/components/admin/shell/AppSwitcher.tsx`

- [ ] **Step 1: Create AppSwitcher.tsx**

```tsx
'use client'

import Link from 'next/link'
import { LayoutDashboard, ExternalLink } from 'lucide-react'

interface AppSwitcherProps {
  size?: 'sm' | 'md'
}

const sizes = {
  sm: { h: 26, fs: 10, px: 8, gap: 4, iconSize: 12 },
  md: { h: 30, fs: 11, px: 10, gap: 5, iconSize: 13 },
}

export const AppSwitcher = ({ size = 'md' }: AppSwitcherProps) => {
  const sz = sizes[size]

  return (
    <div
      role="tablist"
      aria-label="App context"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: 2,
        borderRadius: 8,
        background: 'var(--surface-1)',
        border: '1px solid var(--border)',
        height: sz.h + 4,
        flexShrink: 0,
      }}
    >
      <Link
        href="/"
        role="tab"
        aria-selected={false}
        title="Open the consumer app"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: sz.gap,
          height: sz.h,
          padding: `0 ${sz.px}px`,
          borderRadius: 6,
          fontFamily: "'Inter', sans-serif",
          fontSize: sz.fs,
          fontWeight: 700,
          letterSpacing: '-0.005em',
          color: 'var(--fg-muted)',
          background: 'transparent',
          textDecoration: 'none',
          transition: 'background .12s, color .12s',
        }}
        onMouseEnter={(evt) => {
          evt.currentTarget.style.background = 'var(--overlay-hover)'
        }}
        onMouseLeave={(evt) => {
          evt.currentTarget.style.background = 'transparent'
        }}
      >
        <ExternalLink size={sz.iconSize} />
        <span>User app</span>
      </Link>
      <div
        role="tab"
        aria-selected={true}
        title="You are here"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: sz.gap,
          height: sz.h,
          padding: `0 ${sz.px}px`,
          borderRadius: 6,
          fontFamily: "'Inter', sans-serif",
          fontSize: sz.fs,
          fontWeight: 700,
          letterSpacing: '-0.005em',
          color: 'var(--fg)',
          background: 'var(--bg-elevated)',
          boxShadow: '0 1px 2px rgba(0,0,0,0.06), 0 0 0 1px var(--border)',
        }}
      >
        <LayoutDashboard size={sz.iconSize} color="var(--signal)" />
        <span>Admin</span>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git -C /Users/huey/Projects/concert-crawl/.worktrees/admin-ui-v2 add apps/web/src/components/admin/shell/AppSwitcher.tsx
git -C /Users/huey/Projects/concert-crawl/.worktrees/admin-ui-v2 commit -m "feat(admin-shell): AppSwitcher component"
```

---

### Task 3: Update AdminTopbar — add AppSwitcher + mobile hamburger slot

**Files:**

- Modify: `apps/web/src/components/admin/shell/AdminTopbar.tsx`

The topbar needs two additions: AppSwitcher on the right, and a hamburger button on mobile (left of breadcrumb). The hamburger open state lives in `AdminShellClient` (Task 6); we accept `onMenuOpen` as a prop.

- [ ] **Step 1: Update AdminTopbar.tsx**

```tsx
'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Menu } from 'lucide-react'
import { NAV } from './nav'
import { buildBreadcrumbs } from './breadcrumbs'
import { usePageTitle } from './PageTitleContext'
import { AppSwitcher } from './AppSwitcher'

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
}

export const AdminTopbar = ({ onMenuOpen }: AdminTopbarProps) => {
  const { pageTitle } = usePageTitle()
  const crumbs = useBreadcrumbs(pageTitle)

  return (
    <header
      style={{
        height: 52,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px 0 24px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-elevated)',
        gap: 12,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          flex: 1,
          minWidth: 0,
        }}
      >
        {/* Hamburger — mobile only */}
        {onMenuOpen && (
          <button
            onClick={onMenuOpen}
            aria-label="Open navigation menu"
            className="admin-mobile-only"
            style={{
              display: 'none', // overridden by admin.css media query
              flexShrink: 0,
              width: 32,
              height: 32,
              borderRadius: 6,
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--fg-muted)',
              padding: 0,
            }}
          >
            <Menu size={18} />
          </button>
        )}

        {/* Breadcrumb */}
        <nav
          aria-label="Breadcrumb"
          style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}
        >
          {crumbs.map((crumb, idx) => (
            <span
              key={crumb.label}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                minWidth: 0,
              }}
            >
              {idx > 0 && (
                <span
                  style={{
                    fontSize: 13,
                    color: 'var(--fg-subtle)',
                    flexShrink: 0,
                  }}
                >
                  /
                </span>
              )}
              {crumb.href ? (
                <Link
                  href={crumb.href}
                  style={{
                    fontSize: 14,
                    fontWeight: idx === crumbs.length - 1 ? 600 : 400,
                    color: 'var(--fg-muted)',
                    textDecoration: 'none',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {crumb.label}
                </Link>
              ) : (
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: 'var(--fg)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {crumb.label}
                </span>
              )}
            </span>
          ))}
        </nav>
      </div>

      {/* App switcher */}
      <AppSwitcher size="md" />
    </header>
  )
}
```

Then add to `admin.css`:

```css
@media (max-width: 720px) {
  .admin-mobile-only {
    display: inline-flex !important;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git -C /Users/huey/Projects/concert-crawl/.worktrees/admin-ui-v2 add apps/web/src/components/admin/shell/AdminTopbar.tsx apps/web/src/app/(protected)/admin/admin.css
git -C /Users/huey/Projects/concert-crawl/.worktrees/admin-ui-v2 commit -m "feat(admin-shell): AppSwitcher in topbar + mobile hamburger slot"
```

---

### Task 4: Update AdminSidebar — remove back-to-app, update badge keys

**Files:**

- Modify: `apps/web/src/components/admin/shell/AdminSidebar.tsx`

The sidebar currently has `getCount(key)` looking at `badgeCounts.crawl` and `badgeCounts.events`. Update to `review` and `feedback`. Also remove the "Back to app" block (AppSwitcher replaces it). Add `admin-desktop-only` class so the sidebar is hidden on ≤720px.

- [ ] **Step 1: Update AdminSidebar.tsx**

The prop type changes from `{ crawl: number; events: number }` to `{ crawl: number; review: number; feedback: number }`. Update the interface and `getCount`:

```tsx
// Change the interface:
interface AdminSidebarProps {
  badgeCounts?: { crawl: number; review: number; feedback: number }
  user: { firstName: string | null; email: string }
}

// Change getCount:
const getCount = (key: string): number => {
  if (!badgeCounts) return 0
  if (key === 'crawl') return badgeCounts.crawl
  if (key === 'review') return badgeCounts.review
  if (key === 'feedback') return badgeCounts.feedback
  return 0
}
```

Remove the entire "Back to app" `<div>` block (lines ~449–473 in the current file, containing the `<Link href="/watching">` element).

Add `className="admin-desktop-only"` to the `<aside>` element.

Then add to `admin.css`:

```css
@media (max-width: 720px) {
  .admin-desktop-only {
    display: none !important;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git -C /Users/huey/Projects/concert-crawl/.worktrees/admin-ui-v2 add apps/web/src/components/admin/shell/AdminSidebar.tsx apps/web/src/app/(protected)/admin/admin.css
git -C /Users/huey/Projects/concert-crawl/.worktrees/admin-ui-v2 commit -m "feat(admin-shell): update sidebar badge keys, remove back-to-app link"
```

---

### Task 5: Create MobileDrawer and MobileBottomBar

**Files:**

- Create: `apps/web/src/components/admin/shell/MobileDrawer.tsx`
- Create: `apps/web/src/components/admin/shell/MobileBottomBar.tsx`

- [ ] **Step 1: Create MobileDrawer.tsx**

```tsx
'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { X } from 'lucide-react'
import * as LucideIcons from 'lucide-react'
import { NAV, type NavItem } from './nav'
import { CCMark } from '@/components/brand/cc-mark'
import { AppSwitcher } from './AppSwitcher'

interface MobileDrawerProps {
  open: boolean
  onClose: () => void
  badgeCounts: { crawl: number; review: number; feedback: number }
  user: { firstName: string | null; email: string }
}

const NavIcon = ({ name, size }: { name: string; size: number }) => {
  const Icon = (
    LucideIcons as unknown as Record<
      string,
      React.ComponentType<{ size: number }>
    >
  )[name]
  return Icon ? <Icon size={size} /> : null
}

const getCount = (
  key: string,
  counts: MobileDrawerProps['badgeCounts'],
): number => {
  if (key === 'crawl') return counts.crawl
  if (key === 'review') return counts.review
  if (key === 'feedback') return counts.feedback
  return 0
}

const DrawerNavLink = ({
  item,
  active,
  count,
  onClose,
}: {
  item: NavItem
  active: boolean
  count: number
  onClose: () => void
}) => (
  <Link
    href={item.href}
    onClick={onClose}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '10px 14px',
      borderRadius: 8,
      textDecoration: 'none',
      fontSize: 14,
      fontWeight: active ? 600 : 500,
      color: active ? 'var(--fg)' : 'var(--fg-muted)',
      background: active ? 'var(--surface-2)' : 'transparent',
      position: 'relative',
      borderLeft: active ? '2px solid var(--signal)' : '2px solid transparent',
    }}
  >
    <NavIcon name={item.iconName} size={18} />
    <span style={{ flex: 1 }}>{item.label}</span>
    {item.badge !== undefined && count > 0 && (
      <span
        style={{
          minWidth: 18,
          height: 18,
          padding: '0 5px',
          borderRadius: 9,
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10,
          fontWeight: 700,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          color:
            item.badge.kind === 'warning' ? 'var(--bg)' : 'var(--fg-on-accent)',
          background: `var(--${item.badge.kind})`,
        }}
      >
        {count > 99 ? '99+' : count}
      </span>
    )}
  </Link>
)

export const MobileDrawer = ({
  open,
  onClose,
  badgeCounts,
  user,
}: MobileDrawerProps) => {
  const pathname = usePathname()

  // Close on route change
  useEffect(() => {
    onClose()
  }, [pathname, onClose])

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  const userInitial = (user.firstName ?? user.email).charAt(0).toUpperCase()
  const opItems = NAV.filter((item) => item.section === 'operations')
  const accountItems = NAV.filter((item) => item.section === 'account')

  return (
    <>
      {/* Scrim */}
      <div
        aria-hidden
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.4)',
          zIndex: 40,
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 0.2s',
        }}
      />

      {/* Drawer */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          width: 280,
          background: 'var(--bg-elevated)',
          borderRight: '1px solid var(--border)',
          zIndex: 50,
          display: 'flex',
          flexDirection: 'column',
          transform: open ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.22s ease',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 16px',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <CCMark size={28} />
            <AppSwitcher size="sm" />
          </div>
          <button
            onClick={onClose}
            aria-label="Close navigation menu"
            style={{
              width: 32,
              height: 32,
              borderRadius: 6,
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--fg-muted)',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Nav */}
        <nav
          style={{
            flex: 1,
            padding: '10px 10px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
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
            Operations
          </div>
          {opItems.map((item) => (
            <DrawerNavLink
              key={item.key}
              item={item}
              active={
                pathname === item.href ||
                (item.href !== '/admin' && pathname.startsWith(item.href))
              }
              count={getCount(item.key, badgeCounts)}
              onClose={onClose}
            />
          ))}

          <div
            style={{ height: 1, background: 'var(--border)', margin: '8px 0' }}
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
          {accountItems.map((item) => (
            <DrawerNavLink
              key={item.key}
              item={item}
              active={pathname === item.href || pathname.startsWith(item.href)}
              count={0}
              onClose={onClose}
            />
          ))}
        </nav>

        {/* User footer */}
        <div
          style={{
            padding: '12px 16px',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: 'var(--accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 11,
              fontWeight: 700,
              color: '#fff',
              flexShrink: 0,
            }}
          >
            {userInitial}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--fg)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {user.firstName ?? user.email}
            </div>
            <div
              style={{
                fontSize: 11,
                color: 'var(--fg-subtle)',
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              admin
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
```

- [ ] **Step 2: Create MobileBottomBar.tsx**

The bottom tab bar shows 5 ops items: Dashboard, Venues, Crawl, Review, Feedback.

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import * as LucideIcons from 'lucide-react'
import { NAV } from './nav'

const BOTTOM_TABS = NAV.filter((item) =>
  ['dashboard', 'venues', 'crawl', 'review', 'feedback'].includes(item.key),
)

const NavIcon = ({ name, size }: { name: string; size: number }) => {
  const Icon = (
    LucideIcons as unknown as Record<
      string,
      React.ComponentType<{ size: number }>
    >
  )[name]
  return Icon ? <Icon size={size} /> : null
}

interface MobileBottomBarProps {
  badgeCounts: { crawl: number; review: number; feedback: number }
}

const getCount = (
  key: string,
  counts: MobileBottomBarProps['badgeCounts'],
): number => {
  if (key === 'crawl') return counts.crawl
  if (key === 'review') return counts.review
  if (key === 'feedback') return counts.feedback
  return 0
}

export const MobileBottomBar = ({ badgeCounts }: MobileBottomBarProps) => {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Mobile bottom navigation"
      style={{
        display: 'none', // overridden at ≤720px
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: 60,
        background: 'var(--bg-elevated)',
        borderTop: '1px solid var(--border)',
        zIndex: 30,
        alignItems: 'center',
        justifyContent: 'space-around',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
      className="admin-mobile-bottom-bar"
    >
      {BOTTOM_TABS.map((item) => {
        const active =
          pathname === item.href ||
          (item.href !== '/admin' && pathname.startsWith(item.href))
        const count = getCount(item.key, badgeCounts)
        const hasBadge = item.badge !== undefined && count > 0

        return (
          <Link
            key={item.key}
            href={item.href}
            title={item.label}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
              padding: '8px 12px',
              minWidth: 44,
              minHeight: 44,
              textDecoration: 'none',
              color: active ? 'var(--signal)' : 'var(--fg-muted)',
              position: 'relative',
            }}
          >
            {hasBadge && (
              <span
                aria-label={`${count} pending`}
                style={{
                  position: 'absolute',
                  top: 6,
                  right: 8,
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: `var(--${item.badge?.kind ?? 'danger'})`,
                }}
              />
            )}
            <NavIcon name={item.iconName} size={20} />
            <span style={{ fontSize: 10, fontWeight: active ? 600 : 400 }}>
              {item.label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
```

Add to `admin.css`:

```css
@media (max-width: 720px) {
  .admin-mobile-bottom-bar {
    display: flex !important;
  }
  /* Push main content above bottom bar */
  .admin-main-content {
    padding-bottom: 60px !important;
  }
}
```

- [ ] **Step 3: Commit**

```bash
git -C /Users/huey/Projects/concert-crawl/.worktrees/admin-ui-v2 add apps/web/src/components/admin/shell/MobileDrawer.tsx apps/web/src/components/admin/shell/MobileBottomBar.tsx apps/web/src/app/(protected)/admin/admin.css
git -C /Users/huey/Projects/concert-crawl/.worktrees/admin-ui-v2 commit -m "feat(admin-shell): MobileDrawer + MobileBottomBar components"
```

---

### Task 6: Create AdminShellClient and wire up layout

**Files:**

- Create: `apps/web/src/components/admin/shell/AdminShellClient.tsx`
- Modify: `apps/web/src/app/(protected)/admin/layout.tsx`

`AdminShellClient` is a `'use client'` component that owns the `drawerOpen` state and connects the hamburger button in the topbar to the drawer.

- [ ] **Step 1: Create AdminShellClient.tsx**

```tsx
'use client'

import { useState, useCallback } from 'react'
import { AdminSidebar } from './AdminSidebar'
import { AdminTopbar } from './AdminTopbar'
import { MobileDrawer } from './MobileDrawer'
import { MobileBottomBar } from './MobileBottomBar'

interface AdminShellClientProps {
  badgeCounts: { crawl: number; review: number; feedback: number }
  user: { firstName: string | null; email: string }
  children: React.ReactNode
}

export const AdminShellClient = ({
  badgeCounts,
  user,
  children,
}: AdminShellClientProps) => {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const openDrawer = useCallback(() => setDrawerOpen(true), [])
  const closeDrawer = useCallback(() => setDrawerOpen(false), [])

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg)] text-[var(--fg)]">
      <AdminSidebar badgeCounts={badgeCounts} user={user} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <AdminTopbar onMenuOpen={openDrawer} />
        <main className="flex-1 overflow-y-auto p-6 lg:p-8 admin-main-content">
          {children}
        </main>
      </div>
      <MobileDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        badgeCounts={badgeCounts}
        user={user}
      />
      <MobileBottomBar badgeCounts={badgeCounts} />
    </div>
  )
}
```

- [ ] **Step 2: Update layout.tsx**

The layout needs to fetch review badge count (pending event flags + pending price submissions) and feedback unread count. For now, use the existing events count endpoint for review, and 0 for feedback (feedback API is Plan C).

```tsx
import './admin.css'
import { requireAdminUser } from '@/lib/auth'
import { auth } from '@clerk/nextjs/server'
import { apiClient } from '@/lib/api'
import { AdminThemeProvider } from '@/components/admin/shell/AdminThemeProvider'
import { AdminShellClient } from '@/components/admin/shell/AdminShellClient'

interface CrawlStatusVenue {
  id: string
  name: string
  blockedAt: string | null
  lastRun: { status: string } | null
}

interface EventCounts {
  pending: number
  approved: number
}

interface SubmissionsResponse {
  data: unknown[]
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const adminUser = await requireAdminUser()
  const { getToken } = await auth()
  const token = await getToken()

  let blockedCrawls = 0
  let pendingReview = 0

  if (token) {
    const [statusRes, countsRes, subsRes] = await Promise.allSettled([
      apiClient.get<CrawlStatusVenue[]>('/v1/admin/crawl/status', token),
      apiClient.get<EventCounts>('/v1/admin/events/count', token),
      apiClient.get<SubmissionsResponse>('/v1/admin/prices/submissions', token),
    ])

    if (statusRes.status === 'fulfilled') {
      blockedCrawls = statusRes.value.filter(
        (venue) =>
          (venue.blockedAt !== null && venue.lastRun?.status !== 'success') ||
          venue.lastRun?.status === 'failed',
      ).length
    } else {
      console.warn('[admin layout] crawl status fetch failed', {
        reason: statusRes.reason,
      })
    }

    let pendingEvents = 0
    let pendingSubmissions = 0

    if (countsRes.status === 'fulfilled') {
      pendingEvents = countsRes.value.pending
    } else {
      console.warn('[admin layout] event counts fetch failed', {
        reason: countsRes.reason,
      })
    }

    if (subsRes.status === 'fulfilled') {
      pendingSubmissions = Array.isArray(subsRes.value.data)
        ? subsRes.value.data.length
        : 0
    }

    pendingReview = pendingEvents + pendingSubmissions
  }

  return (
    <AdminThemeProvider>
      <AdminShellClient
        badgeCounts={{
          crawl: blockedCrawls,
          review: pendingReview,
          feedback: 0,
        }}
        user={{ firstName: adminUser.firstName, email: adminUser.email }}
      >
        {children}
      </AdminShellClient>
    </AdminThemeProvider>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git -C /Users/huey/Projects/concert-crawl/.worktrees/admin-ui-v2 add apps/web/src/components/admin/shell/AdminShellClient.tsx apps/web/src/app/(protected)/admin/layout.tsx
git -C /Users/huey/Projects/concert-crawl/.worktrees/admin-ui-v2 commit -m "feat(admin-shell): AdminShellClient + responsive layout wiring"
```

---

### Task 7: Add stub pages for Review and Feedback; redirect old pages

**Files:**

- Create: `apps/web/src/app/(protected)/admin/review/page.tsx`
- Create: `apps/web/src/app/(protected)/admin/feedback/page.tsx`
- Modify: `apps/web/src/app/(protected)/admin/events/page.tsx`
- Modify: `apps/web/src/app/(protected)/admin/prices/page.tsx`

- [ ] **Step 1: Create review/page.tsx stub**

```tsx
export default function AdminReviewPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1
          style={{
            margin: 0,
            fontSize: 24,
            fontWeight: 700,
            color: 'var(--fg)',
            letterSpacing: '-0.02em',
          }}
        >
          Review
        </h1>
        <p
          style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--fg-muted)' }}
        >
          Event flags and price coverage — coming soon.
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create feedback/page.tsx stub**

```tsx
export default function AdminFeedbackPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1
          style={{
            margin: 0,
            fontSize: 24,
            fontWeight: 700,
            color: 'var(--fg)',
            letterSpacing: '-0.02em',
          }}
        >
          Feedback
        </h1>
        <p
          style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--fg-muted)' }}
        >
          User feedback inbox — coming soon.
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Redirect events/page.tsx**

Replace the entire file:

```tsx
import { redirect } from 'next/navigation'

export default function AdminEventsRedirect() {
  redirect('/admin/review')
}
```

- [ ] **Step 4: Redirect prices/page.tsx**

Replace the entire file:

```tsx
import { redirect } from 'next/navigation'

export default function AdminPricesRedirect() {
  redirect('/admin/review')
}
```

- [ ] **Step 5: Commit**

```bash
git -C /Users/huey/Projects/concert-crawl/.worktrees/admin-ui-v2 add apps/web/src/app/(protected)/admin/review/page.tsx apps/web/src/app/(protected)/admin/feedback/page.tsx apps/web/src/app/(protected)/admin/events/page.tsx apps/web/src/app/(protected)/admin/prices/page.tsx
git -C /Users/huey/Projects/concert-crawl/.worktrees/admin-ui-v2 commit -m "feat(admin-shell): stub Review + Feedback pages; redirect events + prices"
```

---

### Task 8: Quality gate + push

- [ ] **Step 1: Run type check**

```bash
pnpm --filter @concert-crawl/web typecheck
```

Expected: 0 errors

- [ ] **Step 2: Run lint**

```bash
pnpm --filter @concert-crawl/web lint
```

Expected: 0 errors

- [ ] **Step 3: Run tests**

```bash
pnpm --filter @concert-crawl/web test
```

Expected: all pass

- [ ] **Step 4: Rebase and push**

```bash
git -C /Users/huey/Projects/concert-crawl/.worktrees/admin-ui-v2 fetch origin
git -C /Users/huey/Projects/concert-crawl/.worktrees/admin-ui-v2 rebase origin/main
git -C /Users/huey/Projects/concert-crawl/.worktrees/admin-ui-v2 push origin feat/admin-ui-v2
```

## Next

Plan B (`2026-05-20-admin-ui-v2-plan-b-frontend.md`) can begin as soon as Plan A is committed. It operates on the same branch.
