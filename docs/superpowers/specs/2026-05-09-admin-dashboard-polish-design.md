# Admin Dashboard Polish — Design Spec

**Date:** 2026-05-09
**Status:** Approved
**Related tickets (deferred):** #111 Inbox, #112 LLM spend chart, #113 Search, #114 Top spend, #115 SSE, #116 Activity feed events/invites

---

## Overview

A focused polish pass on the admin shell and dashboard page to close the gap between the current implementation and the hi-fi design mocks in `design/design_handoff_admin_ui/`. No new data models or API endpoints are required. All changes are UI-layer only.

---

## Scope

### 1. AdminTopbar — simplify chrome

**Remove:**
- Theme selector buttons (Light / Dark / Electric / Jade)
- Clerk `UserButton` component

**Result:** Topbar contains only the breadcrumb navigation. No right-side content. Matches the mock exactly.

**Files:** `apps/web/src/components/admin/shell/AdminTopbar.tsx`

---

### 2. AdminThemeProvider — fix default theme

Change the fallback theme from `'dark'` → `'electric'`. Users who have never set a preference (no `cc-admin-theme` in localStorage) get Electric.

**Files:** `apps/web/src/components/admin/shell/AdminThemeProvider.tsx`

---

### 3. AdminSidebar — user card sign-out dropdown

The existing user card (initials chip + name + role) becomes a button that opens a small popover anchored above it.

**Popover contents:**
- **Sign out** — Lucide `LogOut` icon (14px) + "Sign out" label. Calls `useClerk().signOut()` on click.

**Popover behavior:**
- Anchored above the user card, left-aligned to the sidebar edge
- Closes on outside-click (use a `useEffect` with a `mousedown` listener, or Radix `Popover` primitive if available)
- In rail mode (icon-only sidebar), the popover still opens above the initials chip

**No Clerk UI components used** — only the `useClerk()` hook for `signOut()`.

**Future extension point:** The popover can grow to include "Profile" and "Switch theme" without structural changes.

**Files:** `apps/web/src/components/admin/shell/AdminSidebar.tsx`

---

### 4. Dashboard — greeting action buttons

Add two buttons to the top-right of the greeting block, matching the mock layout (right-aligned, same row as the greeting text or just below the subtext line).

**Run all venues** (`AdminButton` variant `primary`)
- Loops through all active+verified venues and calls `POST /v1/admin/crawl/:venueId` for each (no bulk endpoint exists)
- Uses a Next.js Server Action so the token never reaches the client
- Shows a brief loading spinner (disable button while in flight via `useFormStatus`)
- On success/error: re-enable the button

**Add venue** (`AdminButton` variant `outline`)
- `href="/admin/venues/new"` — navigate, no API call

**Files:** `apps/web/src/app/(protected)/admin/page.tsx`, new `RunAllVenuesButton.tsx` client component

---

### 5. Dashboard — stat card improvements

#### 5a. Footer separator

Add a `1px solid var(--border)` horizontal rule above the footer slot of every stat card that has a footer. This closes the visual gap the mocks show between the body and footer.

Apply by adding a `border-top: 1px solid var(--border)` + `padding-top` inside `StatCard`'s footer slot rendering, conditional on the `footer` prop being present.

**Files:** `apps/web/src/components/admin/primitives/StatCard.tsx`

#### 5b. Pending review card

- **Value:** dynamic count of unverified events. Call `GET /v1/admin/events?verified=false&limit=100` — use the response array length.
- **Hint text:** top-3 venues by pending count, e.g. "Bluebird (5), Gothic (4), Ogden (3)". Computed client-side from the events response — group by `venueId`, sort descending, take 3. Cross-reference with venues array for names.
- **Footer:** "Open queue ›" link fixed to `href="/admin/events"` (currently broken — button has no href).

#### 5c. LLM cost card

- **Progress bar footer:** `ProgressBar` showing spend vs. a $40 budget constant. Label: "Budget $40 · X% used".
- Budget is a hardcoded constant (`LLM_BUDGET_USD = 40`) for now — no `app_config` integration in this pass.

#### 5d. Crawl health card

- **Sparkline:** last-8-run outcomes rendered as a `Sparkline` primitive (already exists). Pass an array of 1 (success) or 0 (failure) values derived from the 8 most recent runs across all venues, sorted by `createdAt DESC`. This gives an aggregate health pulse, matching the mock.
- **Hint text:** if any venue is blocked, show "{venueName} blocked · {N}rd failure". If none blocked but failures exist, show the venue with most consecutive failures. If all healthy, show nothing.

#### 5e. Active venues card

- **Hint text:** "X paused · Y blocked · +Z this week" — computed from venues data. Paused = `active === false && blockedAt === null`. Blocked = `blockedAt !== null`. This week = venues with `createdAt` within the last 7 days.

**Files:** `apps/web/src/app/(protected)/admin/page.tsx`, `apps/web/src/components/admin/primitives/StatCard.tsx`

---

### 6. Dashboard — crawl health table

#### 6a. Strategy column

Add a **Strategy** column between "Last crawl" and "Events". Value from `lastRun.extractionStrategyUsed`.

Render as a `StatusBadge variant="mono"`:
- `structured_data` → display as `structured`
- `llm` → display as `llm`
- `manual` → display as `manual`
- `null` / no run → `—` (plain text, muted)

#### 6b. Clickable rows

Each row navigates to `/admin/crawl?venue={venueId}` on click. Extract the table to a `CrawlHealthTable` client component so `useRouter` can be used.

**Files:** new `CrawlHealthTable.tsx` client component, `apps/web/src/app/(protected)/admin/page.tsx`

---

### 7. Dashboard — activity feed tabs

Add **Events** and **Invites** filter tabs to `ActivityFeed` alongside existing All / Crawl.

```ts
type FilterTab = 'all' | 'crawl' | 'events' | 'invites'
```

Since the feed only receives `CrawlRun[]`, both new tabs show an empty state: "No recent activity."

The `FilterTab` type and tab array are defined so that issue #116 can wire up real data without structural changes to the component.

**Files:** `apps/web/src/components/admin/dashboard/ActivityFeed.tsx`

---

## What this spec does NOT include

| Item | Reason | Ticket |
|---|---|---|
| Inbox sidebar item + drawer | New feature, own scope | #111 |
| LLM spend area chart | Needs chart lib + aggregation API | #112 |
| Admin global search | Scope TBD | #113 |
| Top spend breakdown | Needs aggregation API | #114 |
| SSE live indicator | Needs SSE infrastructure | #115 |
| Events/Invites wired to feed | Needs unified activity type + API | #116 |

---

## Files touched

| File | Change |
|---|---|
| `apps/web/src/components/admin/shell/AdminTopbar.tsx` | Remove theme selector + Clerk UserButton |
| `apps/web/src/components/admin/shell/AdminThemeProvider.tsx` | Default theme → `electric` |
| `apps/web/src/components/admin/shell/AdminSidebar.tsx` | User card → popover with sign-out |
| `apps/web/src/components/admin/primitives/StatCard.tsx` | Footer separator |
| `apps/web/src/components/admin/primitives/AdminTable.tsx` | Add `onClick` to TR |
| `apps/web/src/components/admin/dashboard/lib/dashboard.ts` | Shared types + pure helpers (new) |
| `apps/web/src/components/admin/dashboard/lib/dashboard.test.ts` | Unit tests (new) |
| `apps/web/src/components/admin/dashboard/RunAllVenuesButton.tsx` | Client component (new) |
| `apps/web/src/components/admin/dashboard/CrawlHealthTable.tsx` | Client component (new) |
| `apps/web/src/components/admin/dashboard/ActivityFeed.tsx` | Events + Invites tabs (stubs) |
| `apps/web/src/app/(protected)/admin/page.tsx` | Data fetching, stat card content, layout |

---

## Success criteria

- [ ] Default theme is Electric for new sessions
- [ ] Topbar shows breadcrumb only — no theme selector, no Clerk avatar
- [ ] Clicking the sidebar user card opens a popover; "Sign out" signs the user out
- [ ] "Run all venues" triggers the crawl API; "Add venue" navigates to `/admin/venues/new`
- [ ] "Open queue" navigates to `/admin/events`
- [ ] Stat cards show footer separator + populated hint text
- [ ] Crawl health table has Strategy column and clickable rows
- [ ] Activity feed has All / Crawl / Events / Invites tabs; Events and Invites show empty state
- [ ] No regressions on other admin pages (venues, events, prices, invite codes, settings)
