# Phase 7.6 Admin UI — Complete Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 4 regressions from PR #42 and bring the admin UI to full spec fidelity across all pages.

**Architecture:** All UI work in `apps/web/src/app/(protected)/admin/` (server components) and `apps/web/src/components/admin/` (client components). Two new API endpoints added to `apps/api/src/routes/admin/`. Design tokens live in `admin.css` and are never duplicated in JS. Interactive leaf nodes have `'use client'`; page-level components are server components that pass serializable data down.

**Tech Stack:** Next.js 15, React 19, TypeScript strict, Hono (API), Drizzle ORM, Clerk auth, inline CSS via CSS custom properties, Lucide icons, Vitest for tests.

---

## Worktree Setup

- [ ] Create worktree and branch:
```bash
git worktree add .worktrees/fix/phase-76-complete -b fix/phase-76-complete
cd .worktrees/fix/phase-76-complete
pnpm install
```

All subsequent work is done inside `.worktrees/fix/phase-76-complete/`.

---

## Task 1: Investigate and Fix "Something Went Wrong" Crash

**Affects:** Dashboard, Venues, Invite Codes pages
**Files:**
- Modify: `apps/web/src/app/(protected)/admin/error.tsx`
- Modify: `apps/web/src/app/(protected)/admin/page.tsx`
- Modify: `apps/web/src/app/(protected)/admin/venues/page.tsx`
- Modify: `apps/web/src/app/(protected)/admin/invite-codes/page.tsx`

- [ ] **Step 1: Expose the full error message in development**

Update `apps/web/src/app/(protected)/admin/error.tsx` to show full details in dev:

```tsx
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
        If you were trying to access a restricted page, try signing out and
        back in to refresh your session. Otherwise, reload and try again.
      </p>
      {process.env.NODE_ENV === 'development' && (
        <pre className="rounded bg-surface-1 p-3 text-xs text-danger overflow-auto max-h-48">
          {error.message}
          {'\n\n'}
          {error.stack}
        </pre>
      )}
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

- [ ] **Step 2: Reload a failing page and read the error**

Start the dev server (`pnpm dev` from the worktree root) and navigate to `/admin`. The error boundary now shows the full stack trace. Read it.

**Known likely causes and fixes:**

**Cause A — `new URL(venue.websiteUrl)` throws on a malformed URL.**
Fix in `apps/web/src/app/(protected)/admin/venues/page.tsx`: wrap with a helper.

Add this helper before the component:
```tsx
function safeHostname(url: string): string {
  try { return new URL(url).hostname } catch { return url }
}
```
Then replace all `new URL(venue.websiteUrl).hostname` with `safeHostname(venue.websiteUrl)`.

**Cause B — React 19 rejects a Server Component that passes a function prop to another Server Component without `'use client'`.**
`StatCard` has `onClick?: () => void` which is a function type. In React 19 strict mode this can fail even when onClick is not passed. Fix: add `'use client'` to `apps/web/src/components/admin/primitives/StatCard.tsx`.

**Cause C — Server Action in invite-codes/page.tsx causes module-level evaluation failure.**
If Next.js 15 strict mode rejects the `'use server'` inline function, extract the action to a separate file. Create `apps/web/src/app/(protected)/admin/invite-codes/actions.ts`:
```ts
'use server'
import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { apiClient } from '@/lib/api'

export async function mintInviteCode() {
  const { getToken } = await auth()
  const token = await getToken()
  if (!token) return
  await apiClient.post('/v1/admin/invite-codes', token, {})
  revalidatePath('/admin/invite-codes')
}
```
Then in `invite-codes/page.tsx` replace the inline function with:
```tsx
import { mintInviteCode } from './actions'
```

**Cause D — API error thrown as unhandled rejection.** Wrap each `apiClient.get()` call in the failing pages with try/catch that re-throws a user-readable error:
```tsx
const venues = await apiClient.get<Venue[]>('/v1/admin/venues', token).catch((err: unknown) => {
  throw new Error(`Failed to load venues: ${err instanceof Error ? err.message : String(err)}`)
})
```

- [ ] **Step 3: Apply the fix matching the actual error message, run the dev server, verify the page loads**

- [ ] **Step 4: Commit**
```bash
git add apps/web/src/app/\(protected\)/admin/
git commit -m "fix: surface admin page crash and apply root-cause fix"
```

---

## Task 2: Fix Theme Switcher in Settings

**Files:**
- Modify: `apps/web/src/components/admin/ThemePicker.tsx`
- Modify: `apps/web/src/components/admin/shell/AdminThemeProvider.tsx`

- [ ] **Step 1: Understand the admin theme API**

Read `apps/web/src/components/admin/shell/AdminThemeProvider.tsx`. It exposes `useAdminTheme()` which returns `{ theme: 'light' | 'dark', setTheme, toggle }`.

- [ ] **Step 2: Rewrite ThemePicker to use the admin theme**

Replace `apps/web/src/components/admin/ThemePicker.tsx` entirely:

```tsx
'use client'

import { useAdminTheme } from '@/components/admin/shell/AdminThemeProvider'

const ADMIN_THEMES = [
  {
    id: 'light' as const,
    label: 'Light',
    bg: '#f7f5f0',
    signal: '#1d5fbf',
    accent: '#7a3aa8',
  },
  {
    id: 'dark' as const,
    label: 'Dark',
    bg: '#15140f',
    signal: '#7ab4ff',
    accent: '#c89bf0',
  },
]

export function ThemePicker() {
  const { theme, setTheme } = useAdminTheme()

  return (
    <div role="radiogroup" aria-label="Admin theme" style={{ display: 'flex', gap: 12 }}>
      {ADMIN_THEMES.map((t) => {
        const isSelected = theme === t.id
        return (
          <button
            key={t.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => setTheme(t.id)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              borderRadius: 12,
              padding: 16,
              border: isSelected
                ? '2px solid var(--signal)'
                : '1px solid var(--border)',
              background: 'var(--bg-elevated)',
              cursor: 'pointer',
              outline: isSelected ? '2px solid var(--signal)' : 'none',
              outlineOffset: 2,
            }}
          >
            <div style={{ display: 'flex', gap: 6 }}>
              <span style={{ width: 16, height: 16, borderRadius: '50%', background: t.bg, border: '1px solid rgba(0,0,0,0.15)' }} />
              <span style={{ width: 16, height: 16, borderRadius: '50%', background: t.signal }} />
              <span style={{ width: 16, height: 16, borderRadius: '50%', background: t.accent }} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg)' }}>
              {t.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 3: Verify the AdminThemeProvider exports `setTheme`**

Read `AdminThemeProvider.tsx`. If it only exposes `toggle`, add `setTheme`:
```tsx
// inside the context value
setTheme: (newTheme: 'light' | 'dark') => {
  setThemeState(newTheme)
  localStorage.setItem('cc-admin-theme', newTheme)
},
```
Also update the context interface to include `setTheme: (t: 'light' | 'dark') => void`.

- [ ] **Step 4: Test in browser** — Navigate to `/admin/settings`, click Light/Dark, verify the admin UI theme changes and persists on reload.

- [ ] **Step 5: Commit**
```bash
git add apps/web/src/components/admin/ThemePicker.tsx apps/web/src/components/admin/shell/AdminThemeProvider.tsx
git commit -m "fix: wire admin settings theme picker to admin theme system"
```

---

## Task 3: Add Individual Venue Crawl Trigger

**Files:**
- Modify: `apps/web/src/components/admin/crawl/CrawlSplitView.tsx`

The API endpoint `POST /v1/admin/crawl/:venueId` already exists.

- [ ] **Step 1: Add trigger button and polling to the right-panel inspector**

In `CrawlSplitView.tsx`, add state for crawl status and a trigger function. Replace the selected-venue inspector section (the `<Panel title={selected.venueName}>` block) header with action buttons:

```tsx
// Add near top of component (it already has 'use client')
const [triggering, setTriggering] = useState<string | null>(null)
const [triggerError, setTriggerError] = useState<string | null>(null)

async function handleTrigger(venueId: string) {
  setTriggering(venueId)
  setTriggerError(null)
  try {
    const res = await fetch(`/api/admin/crawl/${venueId}`, { method: 'POST' })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.error ?? `HTTP ${res.status}`)
    }
  } catch (err) {
    setTriggerError(err instanceof Error ? err.message : 'Crawl trigger failed')
  } finally {
    setTriggering(null)
  }
}
```

> **Note:** The trigger must go through a Next.js Route Handler (not directly to the Hono API) because the Clerk token is only available server-side. Create the route handler first.

- [ ] **Step 2: Create the Next.js Route Handler for crawl trigger**

Create `apps/web/src/app/api/admin/crawl/[venueId]/route.ts`:

```ts
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ venueId: string }> },
) {
  const { getToken } = await auth()
  const token = await getToken()
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { venueId } = await params

  const upstream = await fetch(`${API_URL}/v1/admin/crawl/${venueId}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  })

  const body = await upstream.json()
  return NextResponse.json(body, { status: upstream.status })
}
```

- [ ] **Step 3: Add Re-crawl button to the inspector panel header**

Inside the `{selected ? (…) : (…)}` branch in `CrawlSplitView.tsx`, update the `<Panel title={selected.venueName}>` to include an action prop:

```tsx
<Panel
  title={selected.venueName}
  action={
    <button
      onClick={() => handleTrigger(selected.venueId)}
      disabled={triggering === selected.venueId}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        height: 28,
        padding: '0 10px',
        borderRadius: 6,
        fontSize: 12,
        fontWeight: 500,
        border: '1px solid var(--border-strong)',
        background: 'transparent',
        color: triggering === selected.venueId ? 'var(--fg-subtle)' : 'var(--fg)',
        cursor: triggering === selected.venueId ? 'not-allowed' : 'pointer',
      }}
    >
      {triggering === selected.venueId ? 'Triggering…' : 'Re-crawl'}
    </button>
  }
>
```

Add an error display below the vitals grid:
```tsx
{triggerError && (
  <div style={{
    marginTop: 8,
    padding: '8px 10px',
    borderRadius: 6,
    background: 'rgba(184,56,26,0.08)',
    color: 'var(--danger)',
    fontSize: 12,
  }}>
    {triggerError}
  </div>
)}
```

- [ ] **Step 4: Test** — Navigate to `/admin/crawl`, select a venue, click "Re-crawl". Verify no 401/404 appears in console. (Actual crawl may take time; a success toast or status update is out of scope for this task.)

- [ ] **Step 5: Commit**
```bash
git add apps/web/src/app/api/admin/crawl/ apps/web/src/components/admin/crawl/CrawlSplitView.tsx
git commit -m "feat: add per-venue crawl trigger button to crawl inspector"
```

---

## Task 4: Fix Admin Sidebar Logo + ADMIN Badge

**Files:**
- Modify: `apps/web/src/components/admin/shell/AdminSidebar.tsx`

- [ ] **Step 1: Replace the text lockup with the correct logo + badge**

Find the wordmark section in `AdminSidebar.tsx` (the part that renders `"concertcrawl./admin"` and `"cc/"`). Replace the entire logo area with:

```tsx
{/* Full mode: logo mark + wordmark + ADMIN badge */}
{mode === 'full' ? (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
    {/* Logo mark — dark rounded square with icon */}
    <div style={{
      width: 32,
      height: 32,
      borderRadius: 8,
      background: '#0d0c09',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    }}>
      {/* Constellation dot pattern — matches IdentityArt micro palette */}
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <circle cx="9" cy="9" r="2.5" fill="#c89bf0" />
        <circle cx="3" cy="4" r="1.5" fill="#7ab4ff" opacity="0.8" />
        <circle cx="15" cy="3" r="1" fill="#c89bf0" opacity="0.6" />
        <circle cx="14" cy="14" r="1.5" fill="#7ab4ff" opacity="0.7" />
        <circle cx="4" cy="13" r="1" fill="#c89bf0" opacity="0.5" />
        <line x1="3" y1="4" x2="9" y2="9" stroke="#7ab4ff" strokeWidth="0.75" opacity="0.4" />
        <line x1="9" y1="9" x2="14" y2="14" stroke="#c89bf0" strokeWidth="0.75" opacity="0.4" />
        <line x1="15" y1="3" x2="9" y2="9" stroke="#7ab4ff" strokeWidth="0.75" opacity="0.4" />
      </svg>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Wordmark: "concert" white, "crawl." accent */}
      <div style={{
        fontFamily: "'Inter', sans-serif",
        fontWeight: 800,
        fontSize: 13,
        lineHeight: 1,
        letterSpacing: '-0.02em',
      }}>
        <span style={{ color: 'var(--fg)' }}>concert</span>
        <span style={{ color: 'var(--accent)' }}>crawl.</span>
      </div>
      {/* ADMIN badge */}
      <div style={{
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
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        alignSelf: 'flex-start',
      }}>
        ADMIN
      </div>
    </div>
  </div>
) : (
  /* Rail mode: logo mark only */
  <div style={{
    width: 32,
    height: 32,
    borderRadius: 8,
    background: '#0d0c09',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }}>
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <circle cx="9" cy="9" r="2.5" fill="#c89bf0" />
      <circle cx="3" cy="4" r="1.5" fill="#7ab4ff" opacity="0.8" />
      <circle cx="15" cy="3" r="1" fill="#c89bf0" opacity="0.6" />
      <circle cx="14" cy="14" r="1.5" fill="#7ab4ff" opacity="0.7" />
      <circle cx="4" cy="13" r="1" fill="#c89bf0" opacity="0.5" />
      <line x1="3" y1="4" x2="9" y2="9" stroke="#7ab4ff" strokeWidth="0.75" opacity="0.4" />
      <line x1="9" y1="9" x2="14" y2="14" stroke="#c89bf0" strokeWidth="0.75" opacity="0.4" />
      <line x1="15" y1="3" x2="9" y2="9" stroke="#7ab4ff" strokeWidth="0.75" opacity="0.4" />
    </svg>
  </div>
)}
```

> **Refactoring note:** Extract the SVG into a `<CCMark />` component in `apps/web/src/components/admin/shell/CCMark.tsx` if it is used more than once after this change.

- [ ] **Step 2: Visual check** — Run dev server, confirm the sidebar shows the logo mark, "concertcrawl." two-tone wordmark, and "ADMIN" pill. Check both full and rail modes.

- [ ] **Step 3: Commit**
```bash
git add apps/web/src/components/admin/shell/AdminSidebar.tsx
git commit -m "fix: replace plain text sidebar lockup with logo mark and ADMIN badge"
```

---

## Task 5: Shell — Nav Badge Counts + Section Labels

**Files:**
- Modify: `apps/web/src/components/admin/shell/nav.ts`
- Modify: `apps/web/src/components/admin/shell/AdminSidebar.tsx`

- [ ] **Step 1: Read the current nav.ts badge shape**

Open `nav.ts`. The `NavItem` type likely has `badge?: { kind: string }`. Update it to include a count:

```ts
export interface NavItem {
  key: string
  label: string
  icon: string        // Lucide icon name
  href: string
  badge?: {
    count: number
    kind: 'danger' | 'warning'
  }
  section?: 'operations' | 'account'
}
```

Add `section` to each NAV item:
```ts
export const NAV: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard', href: '/admin', section: 'operations' },
  { key: 'venues',    label: 'Venues',    icon: 'MapPin',          href: '/admin/venues', section: 'operations' },
  { key: 'crawl',     label: 'Crawl',     icon: 'RefreshCw',       href: '/admin/crawl',  section: 'operations' },
  { key: 'events',    label: 'Event review', icon: 'CalendarCheck', href: '/admin/events', section: 'operations' },
  { key: 'prices',    label: 'Prices',    icon: 'DollarSign',      href: '/admin/prices', section: 'operations' },
  { key: 'invites',   label: 'Invite codes', icon: 'Ticket',       href: '/admin/invite-codes', section: 'operations' },
  { key: 'settings',  label: 'Settings',  icon: 'Settings',        href: '/admin/settings', section: 'account' },
]
```

- [ ] **Step 2: Pass live badge counts from the layout**

The layout at `apps/web/src/app/(protected)/admin/layout.tsx` is a server component. Add badge data fetching there:

```tsx
// In AdminLayout, fetch badge counts:
const { getToken } = await auth()
const token = await getToken()

let pendingEvents = 0
let blockedCrawls = 0

if (token) {
  const [statusRes, eventsRes] = await Promise.allSettled([
    apiClient.get<{ id: string; status: string }[]>('/v1/admin/crawl/status', token),
    apiClient.get<{ id: string }[]>('/v1/admin/events?verified=false&limit=1', token),
  ])
  if (statusRes.status === 'fulfilled') {
    blockedCrawls = statusRes.value.filter(
      (v) => v.status === 'blocked' || v.status === 'failed'
    ).length
  }
  if (eventsRes.status === 'fulfilled') {
    pendingEvents = eventsRes.value.length
  }
}
```

Then pass these counts into `AdminSidebar` as props so it can apply them to the matching nav items.

> **Note:** `Promise.allSettled` prevents a single API failure from breaking the entire layout.

- [ ] **Step 3: Update AdminSidebar to display counts**

Add `badgeCounts?: Record<string, number>` prop to AdminSidebar. In the NavLink, show a count badge in full mode and a dot in rail mode:

```tsx
// In NavLink, inside the full-mode label span:
{mode === 'full' && badge && badge.count > 0 && (
  <span style={{
    marginLeft: 'auto',
    minWidth: 18,
    height: 18,
    padding: '0 5px',
    borderRadius: 999,
    background: badge.kind === 'danger' ? 'var(--danger)' : 'var(--warning)',
    color: '#fff',
    fontSize: 10,
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: "'JetBrains Mono', monospace",
  }}>
    {badge.count}
  </span>
)}
// Rail mode: small dot
{mode === 'rail' && badge && badge.count > 0 && (
  <span style={{
    position: 'absolute',
    top: 2,
    right: 2,
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: badge.kind === 'danger' ? 'var(--danger)' : 'var(--warning)',
  }} />
)}
```

- [ ] **Step 4: Add section labels in full mode**

Above the "operations" section and before the "account" section, render a small section header:

```tsx
// In the nav items render loop, before first item of each section:
{item.section === 'operations' && idx === 0 && mode === 'full' && (
  <div style={{ padding: '4px 10px', fontSize: 10, fontWeight: 700, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
    Operations
  </div>
)}
{item.section === 'account' && prevItem?.section !== 'account' && mode === 'full' && (
  <>
    <div style={{ height: 1, background: 'var(--border)', margin: '8px 0' }} />
    <div style={{ padding: '4px 10px', fontSize: 10, fontWeight: 700, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
      Account
    </div>
  </>
)}
```

- [ ] **Step 5: Commit**
```bash
git add apps/web/src/components/admin/shell/ apps/web/src/app/\(protected\)/admin/layout.tsx
git commit -m "feat: add nav badge counts and section labels to admin sidebar"
```

---

## Task 6: Shell — ThemePill in Topbar + User Card in Sidebar

**Files:**
- Modify: `apps/web/src/components/admin/shell/AdminTopbar.tsx`
- Modify: `apps/web/src/components/admin/shell/AdminSidebar.tsx`

- [ ] **Step 1: Replace the single icon toggle in AdminTopbar with a ThemePill**

Find the theme toggle in `AdminTopbar.tsx`. Replace it with a pill that shows Light/Dark options:

```tsx
// In AdminTopbar (client component):
const { theme, setTheme } = useAdminTheme()

// Replace icon button with:
<div
  role="group"
  aria-label="Theme"
  style={{
    display: 'flex',
    background: 'var(--surface-1)',
    borderRadius: 8,
    padding: 2,
    gap: 2,
    border: '1px solid var(--border)',
  }}
>
  {(['light', 'dark'] as const).map((t) => (
    <button
      key={t}
      onClick={() => setTheme(t)}
      aria-pressed={theme === t}
      style={{
        height: 26,
        padding: '0 10px',
        borderRadius: 6,
        fontSize: 12,
        fontWeight: 500,
        border: 'none',
        cursor: 'pointer',
        background: theme === t ? 'var(--bg-elevated)' : 'transparent',
        color: theme === t ? 'var(--fg)' : 'var(--fg-muted)',
        boxShadow: theme === t ? 'var(--shadow-sm)' : 'none',
        transition: 'background 0.1s, color 0.1s',
      }}
    >
      {t.charAt(0).toUpperCase() + t.slice(1)}
    </button>
  ))}
</div>
```

- [ ] **Step 2: Add user card to sidebar bottom**

The `AdminSidebar` needs a `user` prop: `user: { firstName: string | null; email: string; imageUrl?: string }`.

Pass user data from the layout (which already calls `requireAdminUser()`). Add to layout:
```tsx
const user = await requireAdminUser()
// pass to AdminSidebar: user={{ firstName: user.firstName, email: user.email }}
```

In `AdminSidebar.tsx`, add a bottom section after the nav links:

```tsx
{/* Bottom user card */}
<div style={{
  marginTop: 'auto',
  paddingTop: 8,
  borderTop: '1px solid var(--border)',
}}>
  {mode === 'full' ? (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '8px 10px',
      borderRadius: 7,
    }}>
      <div style={{
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
      }}>
        {(user.firstName ?? user.email).charAt(0).toUpperCase()}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {user.firstName ?? user.email}
        </div>
        <div style={{ fontSize: 11, color: 'var(--fg-subtle)', fontFamily: "'JetBrains Mono', monospace" }}>
          owner
        </div>
      </div>
    </div>
  ) : (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0' }}>
      <div style={{
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
      }}>
        {(user.firstName ?? user.email).charAt(0).toUpperCase()}
      </div>
    </div>
  )}
</div>
```

- [ ] **Step 3: Verify** — Admin sidebar shows user initials card at bottom. Topbar shows Light/Dark pill. Both modes (full/rail) look correct.

- [ ] **Step 4: Commit**
```bash
git add apps/web/src/components/admin/shell/
git commit -m "feat: add ThemePill to topbar and user card to sidebar bottom"
```

---

## Task 7: Shell — Auto Sidebar Mode (1280px Breakpoint)

**Files:**
- Modify: `apps/web/src/components/admin/shell/AdminSidebar.tsx`

- [ ] **Step 1: Add auto mode logic**

The sidebar currently reads mode from localStorage (`cc-admin-sidebar`) with only `full` / `rail` values. Add `auto` mode which collapses to rail under 1280px and expands on hover.

In `AdminSidebar.tsx`, add viewport width tracking (client-side only):

```tsx
// Add to the useState/useEffect section:
const [viewportMode, setViewportMode] = useState<SidebarMode>('full')

useEffect(() => {
  const stored = localStorage.getItem(STORAGE_KEY) as SidebarMode | null
  if (stored && stored !== 'auto') {
    setMode(stored)
    return
  }
  // Auto mode — collapse under 1280px
  const mq = window.matchMedia('(min-width: 1280px)')
  const update = () => setViewportMode(mq.matches ? 'full' : 'rail')
  update()
  mq.addEventListener('change', update)
  return () => mq.removeEventListener('change', update)
}, [])

// The effective mode used for rendering:
const effectiveMode = mode === 'auto' ? viewportMode : mode
```

Replace all uses of `mode` in the render with `effectiveMode`.

Add `auto` as a valid value for `SidebarMode`:
```ts
type SidebarMode = 'full' | 'rail' | 'auto'
```

Add a toggle button in the sidebar that cycles through `full → rail → auto`:
```tsx
// Add a small collapse icon button near the user card:
<button
  onClick={() => {
    const next = mode === 'full' ? 'rail' : mode === 'rail' ? 'auto' : 'full'
    setMode(next)
    localStorage.setItem(STORAGE_KEY, next)
  }}
  title={`Mode: ${mode} → click to cycle`}
  style={{ /* ghost button styles */ }}
>
  <ChevronLeft size={14} style={{ transform: mode === 'rail' ? 'rotate(180deg)' : undefined }} />
</button>
```

- [ ] **Step 2: Test** — Resize browser below/above 1280px in auto mode. Confirm sidebar collapses/expands. Confirm full/rail manual modes still work.

- [ ] **Step 3: Commit**
```bash
git add apps/web/src/components/admin/shell/AdminSidebar.tsx
git commit -m "feat: add auto sidebar mode with 1280px breakpoint"
```

---

## Task 8: Dashboard — Stat Cards, Activity Feed Filter Tabs, Strategy Column

**Files:**
- Modify: `apps/web/src/app/(protected)/admin/page.tsx`

- [ ] **Step 1: Extract the activity feed to a client component**

Create `apps/web/src/components/admin/dashboard/ActivityFeed.tsx`:

```tsx
'use client'

import { useState } from 'react'
import type { CrawlRun } from '@concert-crawl/types'

type FilterTab = 'all' | 'crawl' | 'events' | 'invites'

const TABS: { id: FilterTab; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'crawl', label: 'Crawl' },
  { id: 'events', label: 'Events' },
  { id: 'invites', label: 'Invites' },
]

interface Props { runs: CrawlRun[] }

export function ActivityFeed({ runs }: Props) {
  const [tab, setTab] = useState<FilterTab>('all')

  const filtered = tab === 'crawl' ? runs : tab === 'all' ? runs : []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 12 }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              height: 26,
              padding: '0 10px',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 500,
              border: 'none',
              cursor: 'pointer',
              background: tab === t.id ? 'var(--surface-2)' : 'transparent',
              color: tab === t.id ? 'var(--fg)' : 'var(--fg-muted)',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
      {/* Activity items */}
      {filtered.slice(0, 8).map((run) => (
        <div key={run.id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', paddingBottom: 10 }}>
          <span style={{
            fontSize: 11,
            color: 'var(--fg-subtle)',
            fontVariantNumeric: 'tabular-nums',
            minWidth: 56,
            fontFamily: "'JetBrains Mono', monospace",
          }}>
            {new Date(run.startedAt ?? run.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
          </span>
          <div style={{ flex: 1, fontSize: 13 }}>
            <div style={{ color: 'var(--fg)', fontWeight: 500 }}>
              {run.status === 'success'
                ? `${run.venueName ?? 'Venue'} crawl ok`
                : `${run.venueName ?? 'Venue'} crawl ${run.status}`}
            </div>
            <div style={{ color: 'var(--fg-muted)', fontSize: 12 }}>
              {run.eventsFound} events · {run.extractionStrategyUsed ?? '—'}
            </div>
          </div>
        </div>
      ))}
      {filtered.length === 0 && (
        <div style={{ color: 'var(--fg-subtle)', fontSize: 13, padding: '12px 0' }}>
          No {tab} activity yet.
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Add "Strategy" column + action link to the venue health table in page.tsx**

In the `<AdminTable>` inside the "Crawl health · today" Panel, add a `<TH>Strategy</TH>` header and in the row, add:
```tsx
<TD color="var(--fg-muted)" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>
  {row.strategy !== '—' ? (
    <span style={{
      padding: '2px 6px',
      borderRadius: 999,
      border: '1px solid var(--border)',
      fontSize: 10,
      color: row.strategy === 'llm' ? 'var(--accent)' : 'var(--signal)',
    }}>
      {row.strategy}
    </span>
  ) : '—'}
</TD>
```

Also add a chevron action column:
```tsx
<TH></TH>
// ...
<TD>
  <Link href={`/admin/crawl?venue=${row.venueId}`} style={{ color: 'var(--fg-muted)' }}>
    <ChevronRight size={14} />
  </Link>
</TD>
```

- [ ] **Step 3: Replace the inline activity section with `<ActivityFeed>`**

In `page.tsx`, remove the raw activity feed rendering and replace with:
```tsx
import { ActivityFeed } from '@/components/admin/dashboard/ActivityFeed'
// ...
<Panel title="Recent activity">
  <ActivityFeed runs={runs} />
</Panel>
```

- [ ] **Step 4: Add trend to LLM cost StatCard**

The `StatCard` already accepts `trend?: { dir: 'up' | 'down'; text: string; good: boolean }`. Compute a 7-day vs prior 7-day comparison if data is available. For now, pass a static placeholder if there's insufficient history:

```tsx
// In fetchDashboardData, compute cost trend:
const recentCost = runs.slice(0, 7).reduce((s, r) => s + (r.llmCostUsd ?? 0), 0)
const priorCost = runs.slice(7, 14).reduce((s, r) => s + (r.llmCostUsd ?? 0), 0)
const costTrend = priorCost > 0
  ? { dir: recentCost > priorCost ? 'up' as const : 'down' as const, text: `${Math.round(Math.abs(recentCost - priorCost) / priorCost * 100)}% wow`, good: recentCost <= priorCost }
  : undefined

// Then pass to StatCard:
<StatCard ... trend={costTrend} />
```

- [ ] **Step 5: Commit**
```bash
git add apps/web/src/app/\(protected\)/admin/page.tsx apps/web/src/components/admin/dashboard/
git commit -m "feat: add activity feed filter tabs, strategy column, and cost trend to dashboard"
```

---

## Task 9: Crawl — Stats Row, Banners, Enhanced Inspector, Run History

**Files:**
- Modify: `apps/web/src/app/(protected)/admin/crawl/page.tsx`
- Modify: `apps/web/src/components/admin/crawl/CrawlSplitView.tsx`

- [ ] **Step 1: Add CrawlStats row to crawl/page.tsx**

After the `<SectionHead>`, add a 4-card stat row using the page's existing `status` and `runs` data:

```tsx
{/* Stats row */}
<div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
  <StatCard
    label="Last sweep"
    value={runs[0]?.startedAt
      ? `${Math.round((Date.now() - new Date(runs[0].startedAt).getTime()) / 60000)}m ago`
      : '—'}
    icon={RefreshCw}
    kind="neutral"
    hint={runs[0]?.startedAt ? new Date(runs[0].startedAt).toLocaleString() : undefined}
  />
  <StatCard
    label="Today's runs"
    value={String(runs.filter(r => new Date(r.createdAt).toDateString() === new Date().toDateString()).length)}
    icon={Activity}
    kind="signal"
    hint={`${status.filter(s => s.status === 'success').length} ok · ${status.filter(s => s.status === 'failed').length} failed`}
  />
  <StatCard
    label="Events ingested"
    value={String(runs.reduce((s, r) => s + r.eventsInserted, 0))}
    icon={CheckSquare}
    kind="success"
    hint="today"
  />
  <StatCard
    label="LLM cost · today"
    value={`$${runs.reduce((s, r) => s + (r.llmCostUsd ?? 0), 0).toFixed(2)}`}
    icon={DollarSign}
    kind="signal"
  />
</div>
```

You'll need to add `import { Activity, CheckSquare, DollarSign } from 'lucide-react'` and `import { StatCard } from '@/components/admin/primitives'`.

- [ ] **Step 2: Add IssuesBanner — show blocked/failed venues**

Create `apps/web/src/components/admin/crawl/IssuesBanner.tsx`:

```tsx
interface Props {
  blockedVenues: { venueId: string; venueName: string; status: string }[]
}

export function IssuesBanner({ blockedVenues }: Props) {
  if (blockedVenues.length === 0) return null

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '10px 14px',
      borderRadius: 10,
      background: 'rgba(184,56,26,0.08)',
      border: '1px solid rgba(184,56,26,0.25)',
    }}>
      <span style={{ fontSize: 13, color: 'var(--danger)', fontWeight: 600 }}>
        {blockedVenues.length} venue{blockedVenues.length > 1 ? 's' : ''} blocked or failed
      </span>
      <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
        {blockedVenues.map(v => v.venueName).join(' · ')}
      </span>
    </div>
  )
}
```

In `crawl/page.tsx`, add between `<SectionHead>` and the stats row:
```tsx
import { IssuesBanner } from '@/components/admin/crawl/IssuesBanner'
// ...
<IssuesBanner blockedVenues={status.filter(s => s.status === 'blocked' || s.status === 'failed')} />
```

- [ ] **Step 3: Enhance CrawlSplitView inspector with HTTP code and events grid**

In `CrawlSplitView.tsx`, the right inspector currently shows a 4-stat grid. Expand it to include run ID, HTTP code, and events breakdown. The `initialRuns` data includes `httpStatusCode`, `eventsFound`, `eventsInserted`.

Update the inspector panel stats grid:
```tsx
// Replace the 4-item stats grid with:
{[
  {
    label: 'Status',
    value: <StatusBadge kind={STATUS_KIND[selected.status] ?? 'neutral'} dot>{selected.status}</StatusBadge>,
  },
  {
    label: 'HTTP',
    value: selectedRuns[0]?.httpStatusCode ? (
      <span style={{ color: selectedRuns[0].httpStatusCode === 200 ? 'var(--success)' : 'var(--danger)', fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 600 }}>
        {selectedRuns[0].httpStatusCode}
      </span>
    ) : '—',
  },
  { label: 'Events found',   value: selected.eventsFound },
  { label: 'Strategy',       value: selected.strategy },
].map(stat => (
  <div key={stat.label}>
    <div style={{ fontSize: 11, color: 'var(--fg-subtle)', marginBottom: 4 }}>{stat.label}</div>
    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)' }}>{stat.value}</div>
  </div>
))}
```

Add an events created/updated mini-grid below the main stats:
```tsx
{selectedRuns[0] && (
  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
    {[
      { label: 'Found',   value: selectedRuns[0].eventsFound,    color: 'var(--signal)' },
      { label: 'Created', value: selectedRuns[0].eventsInserted, color: 'var(--success)' },
    ].map(item => (
      <div key={item.label} style={{
        flex: 1,
        padding: '8px 10px',
        borderRadius: 8,
        background: 'var(--surface-1)',
        border: '1px solid var(--border)',
      }}>
        <div style={{ fontSize: 10, color: 'var(--fg-subtle)', marginBottom: 2 }}>{item.label}</div>
        <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: item.color }}>
          {item.value}
        </div>
      </div>
    ))}
  </div>
)}
```

- [ ] **Step 4: Commit**
```bash
git add apps/web/src/app/\(protected\)/admin/crawl/ apps/web/src/components/admin/crawl/
git commit -m "feat: add crawl stats row, issues banner, enhanced inspector to crawl page"
```

---

## Task 10: Event Review — Filter Rail, Flags, Inspector Enhancements

**Files:**
- Modify: `apps/web/src/components/admin/events/EventQueueSplit.tsx`
- Modify: `apps/web/src/app/(protected)/admin/events/page.tsx`

- [ ] **Step 1: Add EventFilterRail**

Create `apps/web/src/components/admin/events/EventFilterRail.tsx`:

```tsx
'use client'

import { useState } from 'react'

type StatusFilter = 'pending' | 'low_conf' | 'duplicates' | 'approved' | 'rejected'

const FILTERS: { id: StatusFilter; label: string; kind: 'warning' | 'signal' | 'neutral' }[] = [
  { id: 'pending',    label: 'Pending',    kind: 'warning' },
  { id: 'low_conf',  label: 'Low conf.',  kind: 'warning' },
  { id: 'duplicates', label: 'Duplicates', kind: 'warning' },
  { id: 'approved',  label: 'Approved',  kind: 'neutral' },
  { id: 'rejected',  label: 'Rejected',  kind: 'neutral' },
]

interface Props {
  activeFilter: StatusFilter | null
  onFilterChange: (f: StatusFilter | null) => void
}

export function EventFilterRail({ activeFilter, onFilterChange }: Props) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
      <button
        onClick={() => onFilterChange(null)}
        style={{
          height: 28,
          padding: '0 12px',
          borderRadius: 999,
          fontSize: 12,
          fontWeight: 500,
          border: activeFilter === null ? '2px solid var(--signal)' : '1px solid var(--border)',
          background: activeFilter === null ? 'rgba(29,95,191,0.08)' : 'transparent',
          color: activeFilter === null ? 'var(--signal)' : 'var(--fg-muted)',
          cursor: 'pointer',
        }}
      >
        All
      </button>
      {FILTERS.map(f => (
        <button
          key={f.id}
          onClick={() => onFilterChange(activeFilter === f.id ? null : f.id)}
          style={{
            height: 28,
            padding: '0 12px',
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 500,
            border: activeFilter === f.id ? `2px solid var(--${f.kind})` : '1px solid var(--border)',
            background: activeFilter === f.id ? `rgba(var(--${f.kind}-rgb, 184,117,20),0.08)` : 'transparent',
            color: activeFilter === f.id ? `var(--${f.kind})` : 'var(--fg-muted)',
            cursor: 'pointer',
          }}
        >
          {f.label}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Add filter rail and confidence flags to EventQueueSplit**

`EventQueueSplit` is a client component. Add `EventFilterRail` above the queue list. Add flag pills to each queue item:

```tsx
// In the left rail queue item, after the venue/date:
<div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
  {event.confidenceScore !== null && parseFloat(event.confidenceScore) < 0.7 && (
    <span style={{ padding: '1px 6px', borderRadius: 999, fontSize: 10, background: 'rgba(184,117,20,0.12)', color: 'var(--warning)', border: '1px solid rgba(184,117,20,0.25)' }}>
      low conf.
    </span>
  )}
  {!event.verified && (
    <span style={{ padding: '1px 6px', borderRadius: 999, fontSize: 10, background: 'rgba(29,95,191,0.10)', color: 'var(--signal)', border: '1px solid rgba(29,95,191,0.20)', fontFamily: "'JetBrains Mono', monospace' }}>
      {event.extractionStrategy ?? 'unchecked'}
    </span>
  )}
</div>
```

- [ ] **Step 3: Add footer meta to inspector (Run ID, keyboard cues)**

In the inspector right panel, after the action buttons (Reject/Approve), add a footer:

```tsx
<div style={{
  marginTop: 'auto',
  paddingTop: 12,
  borderTop: '1px solid var(--border)',
  display: 'flex',
  gap: 16,
  fontSize: 11,
  color: 'var(--fg-subtle)',
}}>
  {selectedEvent.sourceUrl && (
    <span style={{ fontFamily: "'JetBrains Mono', monospace", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
      {new URL(selectedEvent.sourceUrl).hostname}
    </span>
  )}
  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
    {[['J', 'prev'], ['K', 'next'], ['A', 'approve'], ['R', 'reject']].map(([key, label]) => (
      <span key={key} style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
        <span style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 4, padding: '1px 5px', fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }}>{key}</span>
        <span>{label}</span>
      </span>
    ))}
  </div>
</div>
```

- [ ] **Step 4: Make bulk action buttons functional via Route Handler**

The bulk Approve/Reject buttons need to call the events API. Create `apps/web/src/app/api/admin/events/[id]/route.ts`:

```ts
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { getToken } = await auth()
  const token = await getToken()
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()

  const upstream = await fetch(`${API_URL}/v1/admin/events/${id}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  const result = await upstream.json()
  return NextResponse.json(result, { status: upstream.status })
}
```

In `EventQueueSplit.tsx`, wire the approve/reject buttons:
```tsx
async function handleApprove(id: string) {
  await fetch(`/api/admin/events/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ verified: true }),
  })
  // Remove from local state
  setEvents(prev => prev.filter(e => e.id !== id))
}

async function handleReject(id: string) {
  await fetch(`/api/admin/events/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'cancelled' }),
  })
  setEvents(prev => prev.filter(e => e.id !== id))
}
```

> **Check first:** Verify `PATCH /v1/admin/events/:id` exists in `apps/api/src/routes/admin/events.ts`. If not, add it:
```ts
eventsAdminRouter.patch('/:id', zValidator('json', z.object({ verified: z.boolean().optional(), status: z.enum(['upcoming','cancelled','postponed']).optional() })), async (ctx) => {
  const { id } = ctx.req.param()
  const body = ctx.req.valid('json')
  const [updated] = await db.update(events).set({ ...body, updatedAt: new Date() }).where(eq(events.id, id)).returning()
  if (!updated) return ctx.json({ success: false, error: 'Not found' }, 404)
  ctx.set('auditAction', 'event.update')
  ctx.set('auditTargetId', id)
  ctx.set('auditActorId', getAuthUser(ctx).userId)
  return ctx.json({ success: true, data: updated })
})
```

- [ ] **Step 5: Commit**
```bash
git add apps/web/src/app/\(protected\)/admin/events/ apps/web/src/components/admin/events/ apps/web/src/app/api/admin/events/
git commit -m "feat: add event filter rail, confidence flags, bulk actions to event review"
```

---

## Task 11: Venues Table — Stat Row, Missing Columns, Action Menu

**Files:**
- Modify: `apps/web/src/app/(protected)/admin/venues/page.tsx`

- [ ] **Step 1: Replace the bare stat grid with proper StatCards**

Replace the 4 plain `<div>` stat boxes with `<StatCard>` components:

```tsx
import { MapPin, Activity, ShieldCheck, AlertTriangle } from 'lucide-react'

// Replace the stat grid:
<div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
  <StatCard label="Total"         value={String(venues.length)}                    icon={MapPin}       kind="neutral" />
  <StatCard label="Active"        value={String(activeVenues.length)}              icon={Activity}     kind="success" />
  <StatCard label="Inactive"      value={String(inactiveVenues.length)}            icon={AlertTriangle} kind="warning"
    hint={venues.filter(v => v.blockedAt).length > 0 ? `${venues.filter(v => v.blockedAt).length} blocked` : undefined}
  />
  <StatCard label="Verified"      value={String(venues.filter(v => v.verified).length)} icon={ShieldCheck} kind="signal" />
</div>
```

- [ ] **Step 2: Add robots.txt, strategy, and health columns to the table**

Replace the existing table header:
```tsx
<THead>
  <tr>
    <TH>Venue</TH>
    <TH>Source URL</TH>
    <TH>robots.txt</TH>
    <TH>Strategy</TH>
    <TH>Status</TH>
    <TH>Health</TH>
    <TH align="right" mono>Last crawl</TH>
    <TH></TH>
  </tr>
</THead>
```

And update the row body:
```tsx
<TR key={venue.id}>
  <TD>
    <div style={{ fontWeight: 500 }}>{venue.name}</div>
    <div style={{ fontSize: 12, color: 'var(--fg-muted)', fontFamily: "'JetBrains Mono', monospace" }}>{venue.slug}</div>
  </TD>
  <TD mono color="var(--fg-muted)">
    <a href={venue.websiteUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--signal)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
      {safeHostname(venue.websiteUrl)}
      <ExternalLink size={11} />
    </a>
  </TD>
  <TD>
    {venue.robotsTxtAllowed === null ? (
      <StatusBadge kind="neutral">unchecked</StatusBadge>
    ) : venue.robotsTxtAllowed ? (
      <StatusBadge kind="success" dot>allowed</StatusBadge>
    ) : (
      <StatusBadge kind="danger" dot>blocked</StatusBadge>
    )}
  </TD>
  <TD>
    {venue.extractionStrategy ? (
      <StatusBadge kind={venue.extractionStrategy === 'llm' ? 'accent' : 'signal'} variant="outline">
        {venue.extractionStrategy}
      </StatusBadge>
    ) : '—'}
  </TD>
  <TD>
    <StatusBadge kind={venue.active ? 'success' : venue.blockedAt ? 'danger' : 'neutral'} dot>
      {venue.blockedAt ? 'blocked' : venue.active ? 'active' : 'inactive'}
    </StatusBadge>
  </TD>
  <TD>
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{
        width: 8, height: 8, borderRadius: '50%',
        background: venue.consecutiveFailures === 0 ? 'var(--success)' : venue.consecutiveFailures >= 3 ? 'var(--danger)' : 'var(--warning)',
      }} />
      <span style={{ fontSize: 12, color: 'var(--fg-muted)', fontFamily: "'JetBrains Mono', monospace" }}>
        {venue.consecutiveFailures === 0 ? '100%' : `${Math.max(0, 100 - venue.consecutiveFailures * 20)}%`}
      </span>
    </div>
  </TD>
  <TD align="right" mono color="var(--fg-muted)">
    {venue.lastCrawledAt ? <RelTime iso={venue.lastCrawledAt} /> : '—'}
  </TD>
  <TD>
    <Link href={`/admin/venues/${venue.id}`}>
      <AdminButton variant="ghost" size="sm">Edit</AdminButton>
    </Link>
  </TD>
</TR>
```

Add `import { ExternalLink } from 'lucide-react'` and the `safeHostname` helper from Task 1.

- [ ] **Step 3: Commit**
```bash
git add apps/web/src/app/\(protected\)/admin/venues/page.tsx
git commit -m "feat: add StatCards, robots.txt, strategy, and health columns to venues page"
```

---

## Task 12: Prices Page — Full Redesign with Proper Data

**Files:**
- Modify: `apps/web/src/app/(protected)/admin/prices/page.tsx`
- Modify: `apps/api/src/routes/admin/prices.ts`

The current `/v1/admin/prices/activity` returns retrieval log entries, not price data. The design spec wants a table of events with their current prices, delta, and sparkline. We need a new endpoint.

- [ ] **Step 1: Add `/v1/admin/prices/events` endpoint to the API**

In `apps/api/src/routes/admin/prices.ts`, add:

```ts
// GET /v1/admin/prices/events — events with current prices and recent retrieval status
pricesAdminRouter.get('/events', async (ctx) => {
  const rows = await db
    .select({
      eventId: events.id,
      eventTitle: events.title,
      artist: events.artist,
      venueName: venues.name,
      date: events.date,
      ticketUrl: events.ticketUrl,
      priceMin: events.ticketPriceMin,
      priceMax: events.ticketPriceMax,
      priceSource: events.priceSource,
      lastRetrievedAt: sql<string>`(
        SELECT MAX(attempted_at) FROM price_retrieval_log
        WHERE event_id = ${events.id}
      )`,
      lastOutcome: sql<string>`(
        SELECT outcome FROM price_retrieval_log
        WHERE event_id = ${events.id}
        ORDER BY attempted_at DESC
        LIMIT 1
      )`,
    })
    .from(events)
    .leftJoin(venues, eq(events.venueId, venues.id))
    .where(eq(events.status, 'upcoming'))
    .orderBy(desc(events.date))
    .limit(100)

  return ctx.json({ success: true, data: rows })
})
```

> **Note:** The `sql` import already exists at the top of prices.ts. This query uses correlated subqueries which are acceptable at this data volume. If performance is a concern, use a lateral join instead.

- [ ] **Step 2: Rewrite prices/page.tsx**

```tsx
import { auth } from '@clerk/nextjs/server'
import { requireAdminUser } from '@/lib/auth'
import { apiClient } from '@/lib/api'
import { DollarSign, TrendingUp, AlertTriangle, Search } from 'lucide-react'
import {
  SectionHead,
  StatCard,
  Panel,
  AdminTable,
  THead,
  TR,
  TH,
  TD,
  StatusBadge,
  RelTime,
} from '@/components/admin/primitives'
import type { StatusKind } from '@/components/admin/primitives'

interface PriceEvent {
  eventId: string
  eventTitle: string | null
  artist: string
  venueName: string | null
  date: string
  ticketUrl: string | null
  priceMin: string | null
  priceMax: string | null
  priceSource: string | null
  lastRetrievedAt: string | null
  lastOutcome: string | null
}

const OUTCOME_KIND: Record<string, StatusKind> = {
  hit: 'success',
  miss: 'warning',
  error: 'danger',
}

export default async function AdminPricesPage() {
  await requireAdminUser()
  const { getToken } = await auth()
  const token = await getToken()
  if (!token) return null

  const priceEvents = await apiClient
    .get<PriceEvent[]>('/v1/admin/prices/events', token)
    .catch(() => [] as PriceEvent[])

  const withPrices = priceEvents.filter(e => e.priceMin !== null)
  const noPrices = priceEvents.filter(e => e.priceMin === null)
  const recentHits = priceEvents.filter(e => e.lastOutcome === 'hit')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <SectionHead
        eyebrow="Phase 7 · Pricing"
        title="Price snapshots"
        actions={
          <AdminButton
            variant="outline"
            icon={Search}
            onClick={undefined}
          >
            Snapshot now
          </AdminButton>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <StatCard label="Tracked events"  value={String(priceEvents.length)} icon={DollarSign} kind="neutral" />
        <StatCard label="With prices"     value={String(withPrices.length)}  icon={TrendingUp}  kind="success"
          hint={priceEvents.length > 0 ? `${Math.round(withPrices.length / priceEvents.length * 100)}% coverage` : undefined}
        />
        <StatCard label="No price data"   value={String(noPrices.length)}    icon={AlertTriangle} kind="warning" />
        <StatCard label="Recent hits"     value={String(recentHits.length)}  icon={DollarSign} kind="signal"
          hint="last retrieval ok"
        />
      </div>

      <Panel title="Event prices" padding={0}>
        <AdminTable>
          <THead>
            <tr>
              <TH>Event</TH>
              <TH>Venue / Date</TH>
              <TH align="right" mono>Min</TH>
              <TH align="right" mono>Max</TH>
              <TH>Source</TH>
              <TH>Last retrieval</TH>
              <TH>Status</TH>
            </tr>
          </THead>
          <tbody>
            {priceEvents.map(row => (
              <TR key={row.eventId}>
                <TD>
                  <div style={{ fontWeight: 500 }}>{row.eventTitle ?? row.artist}</div>
                  <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{row.artist}</div>
                </TD>
                <TD>
                  <div style={{ fontSize: 13, color: 'var(--fg-muted)' }}>{row.venueName ?? '—'}</div>
                  <div style={{ fontSize: 12, color: 'var(--fg-subtle)', fontFamily: "'JetBrains Mono', monospace" }}>{row.date}</div>
                </TD>
                <TD align="right" mono color={row.priceMin ? 'var(--fg)' : 'var(--fg-subtle)'}>
                  {row.priceMin ? `$${parseFloat(row.priceMin).toFixed(0)}` : '—'}
                </TD>
                <TD align="right" mono color={row.priceMax ? 'var(--fg)' : 'var(--fg-subtle)'}>
                  {row.priceMax ? `$${parseFloat(row.priceMax).toFixed(0)}` : '—'}
                </TD>
                <TD>
                  {row.priceSource ? (
                    <StatusBadge kind="signal" variant="outline">
                      {row.priceSource}
                    </StatusBadge>
                  ) : '—'}
                </TD>
                <TD color="var(--fg-muted)">
                  {row.lastRetrievedAt ? <RelTime iso={row.lastRetrievedAt} /> : '—'}
                </TD>
                <TD>
                  {row.lastOutcome ? (
                    <StatusBadge kind={OUTCOME_KIND[row.lastOutcome] ?? 'neutral'} dot>
                      {row.lastOutcome}
                    </StatusBadge>
                  ) : <StatusBadge kind="neutral">unchecked</StatusBadge>}
                </TD>
              </TR>
            ))}
            {priceEvents.length === 0 && (
              <TR>
                <TD colSpan={7} color="var(--fg-subtle)">
                  No events found. Ensure venues have been crawled and events seeded.
                </TD>
              </TR>
            )}
          </tbody>
        </AdminTable>
      </Panel>
    </div>
  )
}
```

> **Import note:** `AdminButton` needs `'use client'` or wrap in a client component if the `onClick={undefined}` pattern triggers a server component prop warning. If so, extract the "Snapshot now" button to a `<SnapshotButton>` client component that calls `POST /api/admin/prices/snapshot`.

- [ ] **Step 3: Add the missing `import { AdminButton } from '@/components/admin/primitives'` and any other missing imports**

- [ ] **Step 4: Commit**
```bash
git add apps/web/src/app/\(protected\)/admin/prices/ apps/api/src/routes/admin/prices.ts
git commit -m "feat: redesign prices page with event price table and coverage stats"
```

---

## Task 13: Invite Codes — Inline Mint Form, Invitee Column

**Files:**
- Modify: `apps/web/src/app/(protected)/admin/invite-codes/page.tsx`
- Modify: `apps/web/src/app/(protected)/admin/invite-codes/actions.ts` (from Task 1 Cause C)

- [ ] **Step 1: Upgrade StatCards to use the `<StatCard>` primitive**

The current page uses plain `<div>` stat boxes. Replace with `<StatCard>`:

```tsx
import { Ticket, CheckCircle, XCircle, Users } from 'lucide-react'

<div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
  <StatCard label="Outstanding" value={String(outstanding)} icon={Ticket}      kind="signal"  hint="unredeemed active codes" />
  <StatCard label="Redeemed"    value={String(redeemed)}    icon={CheckCircle}  kind="success" />
  <StatCard label="Total issued" value={String(codes.length)} icon={Users}    kind="neutral" />
  <StatCard label="Revoked"     value={String(revoked)}     icon={XCircle}    kind="danger" />
</div>
```

- [ ] **Step 2: Replace the header form with an inline InviteCreatorPanel**

Create `apps/web/src/components/admin/invite-codes/InviteCreatorPanel.tsx`:

```tsx
'use client'

import { useState, useTransition } from 'react'
import { mintInviteCodeWithOptions } from '../../../app/(protected)/admin/invite-codes/actions'

export function InviteCreatorPanel() {
  const [email, setEmail] = useState('')
  const [expiresIn, setExpiresIn] = useState<'7d' | '30d' | 'never'>('30d')
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<{ ok: boolean; code?: string; error?: string } | null>(null)

  function handleSubmit() {
    startTransition(async () => {
      const res = await mintInviteCodeWithOptions({ email: email || undefined, expiresIn })
      setResult(res)
      if (res.ok) setEmail('')
    })
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '14px 16px',
      borderRadius: 12,
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border)',
      flexWrap: 'wrap',
    }}>
      <input
        type="email"
        placeholder="Recipient email (optional)"
        value={email}
        onChange={e => setEmail(e.target.value)}
        style={{
          flex: '1 1 200px',
          height: 32,
          padding: '0 10px',
          borderRadius: 6,
          border: '1px solid var(--border)',
          background: 'var(--surface-1)',
          color: 'var(--fg)',
          fontSize: 13,
          fontFamily: "'Inter', sans-serif",
          outline: 'none',
        }}
      />
      {/* Expires buttons */}
      <div style={{ display: 'flex', gap: 4 }}>
        {(['7d', '30d', 'never'] as const).map(opt => (
          <button
            key={opt}
            onClick={() => setExpiresIn(opt)}
            style={{
              height: 32,
              padding: '0 10px',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 500,
              border: expiresIn === opt ? '2px solid var(--signal)' : '1px solid var(--border)',
              background: expiresIn === opt ? 'rgba(29,95,191,0.08)' : 'transparent',
              color: expiresIn === opt ? 'var(--signal)' : 'var(--fg-muted)',
              cursor: 'pointer',
            }}
          >
            {opt}
          </button>
        ))}
      </div>
      <button
        onClick={handleSubmit}
        disabled={isPending}
        style={{
          height: 32,
          padding: '0 16px',
          borderRadius: 6,
          fontSize: 13,
          fontWeight: 500,
          border: 'none',
          background: 'var(--signal)',
          color: 'var(--fg-on-accent)',
          cursor: isPending ? 'not-allowed' : 'pointer',
          opacity: isPending ? 0.7 : 1,
        }}
      >
        {isPending ? 'Minting…' : 'Mint code'}
      </button>
      {result?.ok && result.code && (
        <span style={{ fontSize: 12, color: 'var(--success)', fontFamily: "'JetBrains Mono', monospace", padding: '3px 8px', background: 'rgba(47,122,77,0.08)', borderRadius: 6 }}>
          ✓ {result.code}
        </span>
      )}
      {result?.error && (
        <span style={{ fontSize: 12, color: 'var(--danger)' }}>{result.error}</span>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Update actions.ts to support options and return the created code**

In `apps/web/src/app/(protected)/admin/invite-codes/actions.ts`:

```ts
'use server'
import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { apiClient } from '@/lib/api'

interface MintOptions {
  email?: string
  expiresIn: '7d' | '30d' | 'never'
}

export async function mintInviteCodeWithOptions(
  opts: MintOptions,
): Promise<{ ok: boolean; code?: string; error?: string }> {
  const { getToken } = await auth()
  const token = await getToken()
  if (!token) return { ok: false, error: 'Not authenticated' }

  const expiresAt =
    opts.expiresIn === '7d'
      ? new Date(Date.now() + 7 * 86400_000).toISOString()
      : opts.expiresIn === '30d'
        ? new Date(Date.now() + 30 * 86400_000).toISOString()
        : undefined

  try {
    const result = await apiClient.post<{ code: string }>('/v1/admin/invite-codes', token, {
      expiresAt,
      // email is informational only — not stored in current schema; no-op if API doesn't accept it
    })
    revalidatePath('/admin/invite-codes')
    return { ok: true, code: result.code }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Mint failed' }
  }
}

// Legacy no-arg form action (kept for the plain form fallback)
export async function mintInviteCode() {
  await mintInviteCodeWithOptions({ expiresIn: '30d' })
}
```

- [ ] **Step 4: Wire InviteCreatorPanel into the page and add sent-by stub**

In `invite-codes/page.tsx`:
- Remove the old `<form action={mintInviteCode}>` from the `SectionHead` `actions` prop
- Add `<InviteCreatorPanel />` between the stat row and the `<Panel title="Code log">`:

```tsx
import { InviteCreatorPanel } from '@/components/admin/invite-codes/InviteCreatorPanel'
// ...
{/* Inline mint form */}
<InviteCreatorPanel />
```

Add a `Created by` column (shows first 8 chars of createdBy as a monospace ID chip):
```tsx
// In THead:
<TH>Sent by</TH>

// In TR body:
<TD mono color="var(--fg-muted)">
  <span style={{ padding: '2px 6px', background: 'var(--surface-1)', borderRadius: 4, border: '1px solid var(--border)', fontSize: 11 }}>
    {code.createdBy.slice(-8)}
  </span>
</TD>
```

- [ ] **Step 5: Commit**
```bash
git add apps/web/src/app/\(protected\)/admin/invite-codes/ apps/web/src/components/admin/invite-codes/
git commit -m "feat: add inline invite creator panel, stat cards, and sent-by column"
```

---

## Task 14: Seed — Price Retrieval Log Data

**Files:**
- Modify: `packages/db/seed.ts`

- [ ] **Step 1: Add price retrieval log seed entries**

The `price_retrieval_log` table has: `id`, `event_id`, `venue_id`, `source`, `outcome`, `attempted_at`, and any other columns. Check the schema first:

```bash
docker exec concert-crawl-db psql -U postgres -d concert_crawl_db -c "\d price_retrieval_log"
```

- [ ] **Step 2: Update seed.ts to insert price log entries for each seeded event**

In `packages/db/seed.ts`, import the schema and add after the venues insert:

```ts
import {
  venues,
  events as eventsTable,
  priceRetrievalLog,
  type NewVenue,
} from './src/schema/index.js'

// After inserting venues, fetch their IDs and insert sample events + price log:
async function seed() {
  console.warn('Seeding database...')

  await db.insert(venues).values(SEED_VENUES).onConflictDoNothing({ target: venues.slug })
  console.warn(`Inserted ${SEED_VENUES.length} venues.`)

  // Fetch inserted venues to get their IDs
  const insertedVenues = await db.select().from(venues)

  // Insert sample events for each venue
  const SAMPLE_ARTISTS = ['Khruangbin', 'Explosions in the Sky', 'Modest Mouse', 'Soccer Mommy', 'Phoebe Bridgers', 'Big Thief']
  const sampleEvents = insertedVenues.flatMap((venue, vi) =>
    SAMPLE_ARTISTS.slice(0, 3).map((artist, ai) => ({
      venueId: venue.id,
      title: `${artist} at ${venue.name}`,
      artist,
      date: new Date(2026, 5 + ai, 10 + vi * 3).toISOString().slice(0, 10),
      status: 'upcoming' as const,
      ticketUrl: `${venue.websiteUrl}`,
      ticketPriceMin: ai % 2 === 0 ? String(25 + ai * 10) : null,
      ticketPriceMax: ai % 2 === 0 ? String(55 + ai * 10) : null,
      priceSource: ai % 2 === 0 ? ('structured_data' as const) : null,
    }))
  )

  const insertedEvents = await db
    .insert(eventsTable)
    .values(sampleEvents)
    .onConflictDoNothing()
    .returning()
  console.warn(`Inserted ${insertedEvents.length} events.`)

  // Insert price retrieval log entries
  const OUTCOMES = ['hit', 'miss', 'error'] as const
  const SOURCES = ['structured_data', 'ticketmaster', 'seatgeek'] as const

  const logEntries = insertedEvents.flatMap((event) =>
    Array.from({ length: 3 }, (_, idx) => ({
      eventId: event.id,
      venueId: event.venueId,
      source: SOURCES[idx % SOURCES.length],
      outcome: OUTCOMES[idx % OUTCOMES.length],
      attemptedAt: new Date(Date.now() - idx * 3_600_000),
    }))
  )

  await db.insert(priceRetrievalLog).values(logEntries).onConflictDoNothing()
  console.warn(`Inserted ${logEntries.length} price retrieval log entries.`)

  process.exit(0)
}
```

> **Note:** Before running this, check the `priceRetrievalLog` schema to confirm the exact column names. Adjust `source` enum values to match the DB enum.

- [ ] **Step 3: Check the priceRetrievalLog schema for required fields**

```bash
docker exec concert-crawl-db psql -U postgres -d concert_crawl_db -c "\d price_retrieval_log"
```

Adjust the `logEntries` object shape to match exactly.

- [ ] **Step 4: Run the seed**

```bash
pnpm db:seed
```

Expected output:
```
Seeding database...
Inserted 5 venues.
Inserted N events.
Inserted N price retrieval log entries.
```

If the seed errors on duplicate events, that's OK — `onConflictDoNothing()` will skip duplicates from previous seed runs. Only price log entries (which have no unique constraint) will duplicate. For idempotency, add a check:

```ts
// Before inserting events, clear price log for re-seeding:
if (insertedEvents.length > 0) {
  // Optional: truncate only for development/local
  await db.delete(priceRetrievalLog)
    .where(inArray(priceRetrievalLog.eventId, insertedEvents.map(e => e.id)))
    .catch(() => {}) // no-op if table is empty
}
```

- [ ] **Step 5: Commit**
```bash
git add packages/db/seed.ts
git commit -m "feat: expand seed to include sample events and price retrieval log data"
```

---

## Task 15: Final Polish — TypeScript Check, Tests, PR

**Files:**
- Various (type errors found by compiler)

- [ ] **Step 1: Run TypeScript checks**
```bash
pnpm --filter @concert-crawl/web exec tsc --noEmit
pnpm --filter @concert-crawl/api exec tsc --noEmit
```
Fix any errors before proceeding.

- [ ] **Step 2: Run existing tests**
```bash
pnpm --filter @concert-crawl/web test
pnpm --filter @concert-crawl/api test
```
Fix any regressions. Key tests to watch: `apps/api/src/routes/admin/venues.test.ts`, `apps/api/src/routes/admin/invite-codes.test.ts`.

- [ ] **Step 3: Smoke check all admin pages in browser**

Visit each page and confirm no "Something went wrong" errors:
- [ ] `/admin` — Dashboard loads with greeting, 4 stat cards, health table, activity feed
- [ ] `/admin/venues` — Venues table with robots.txt, strategy, health columns
- [ ] `/admin/crawl` — Crawl split view with Re-crawl button in inspector
- [ ] `/admin/events` — Event queue with filter rail and functional approve/reject
- [ ] `/admin/prices` — Price events table with coverage stats
- [ ] `/admin/invite-codes` — Inline mint form + code log table
- [ ] `/admin/settings` — Light/Dark theme picker that actually changes the theme

- [ ] **Step 4: Open PR**

```bash
git push origin fix/phase-76-complete
gh pr create \
  --title "fix/feat: Phase 7.6 admin UI complete — bug fixes + design spec implementation" \
  --body "$(cat <<'EOF'
## Summary

- Fixes "Something went wrong" crash on Dashboard, Venues, and Invite Codes pages
- Fixes admin settings theme switcher (was wired to consumer themes instead of admin light/dark)
- Adds per-venue crawl trigger button to the Crawl inspector panel
- Replaces plain "concertcrawl./admin" text with logo mark + ADMIN badge
- Implements full design spec across all admin pages: sidebar badges/user card, nav section labels, ThemePill, crawl stats/banners, event filter rail + bulk actions, venues columns, prices table redesign, invite codes inline mint form
- Expands seed data to include sample events and price retrieval log entries

## New env vars

None.

## New API endpoints

- `GET /v1/admin/prices/events` — events with current prices and last retrieval status
- `PATCH /v1/admin/events/:id` — approve/reject events (may already exist; added if missing)

## New Next.js Route Handlers

- `POST /api/admin/crawl/[venueId]` — proxies crawl trigger to Hono API with Clerk token
- `PATCH /api/admin/events/[id]` — proxies event update to Hono API with Clerk token

## Test plan

- [ ] All 7 admin pages load without error in dev
- [ ] Theme picker in Settings changes admin UI theme and persists on reload
- [ ] Re-crawl button in Crawl inspector triggers without 401/404
- [ ] Approve/Reject buttons in Event Review update event and remove from queue
- [ ] Sidebar shows correct counts on Crawl and Event Review badges
- [ ] `pnpm --filter @concert-crawl/web exec tsc --noEmit` passes
- [ ] `pnpm --filter @concert-crawl/api exec tsc --noEmit` passes
- [ ] `pnpm test` passes across all packages
EOF
)"
```

---

## Self-Review Checklist

**Spec coverage:**
- [x] BUG-1: Crash — Task 1
- [x] BUG-2: Theme picker — Task 2
- [x] BUG-3: Crawl trigger — Task 3
- [x] BUG-4: Logo heading — Task 4
- [x] Shell: nav badge counts — Task 5
- [x] Shell: section labels — Task 5
- [x] Shell: ThemePill — Task 6
- [x] Shell: user card — Task 6
- [x] Shell: auto mode — Task 7
- [x] Dashboard: activity filter tabs — Task 8
- [x] Dashboard: strategy column — Task 8
- [x] Dashboard: cost trend — Task 8
- [x] Crawl: stats row — Task 9
- [x] Crawl: issues banner — Task 9
- [x] Crawl: enhanced inspector — Task 9
- [x] Events: filter rail — Task 10
- [x] Events: confidence flags — Task 10
- [x] Events: bulk actions — Task 10
- [x] Events: footer meta/keyboard cues — Task 10
- [x] Venues: stat row + columns — Task 11
- [x] Prices: full redesign — Task 12
- [x] Invite codes: inline mint form — Task 13
- [x] Settings: admin theme — Task 2
- [x] Seed: prices data — Task 14

**Known gaps (deferred as complex, non-critical, or requiring separate feature work):**
- Inbox panel (notification center) — significant feature, no data model yet
- Topbar search box — requires a search API endpoint
- CostPanel 30-day chart on Dashboard — requires time-series cost data (no current data model)
- Event Review: extracted vs. raw source diff view — requires storing raw HTML in crawl runs
- Sparkline data on prices page — requires historical price snapshots table
- "Sent by" with avatar on invite codes — requires Clerk user lookup by ID
