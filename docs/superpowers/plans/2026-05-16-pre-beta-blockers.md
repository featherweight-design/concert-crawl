# Pre-Beta Blocker Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix four pre-beta blockers — UserMenu broken link (#350), missing auth headers on API calls (#351), Load More replaces instead of appends (#352), and watching state not persisting across renders (#353).

**Architecture:** Two sequential PRs. PR 1 (`fix/pre-beta-blockers-1`) covers the navigation fix and auth header sweep — targeted changes to existing files with no structural changes. PR 2 (`fix/pre-beta-blockers-2`) covers client-side event accumulation (new `EventsList` client component) and WatchShowButton state sync — a contained refactor of the browse page list rendering.

**Tech Stack:** Next.js 14 App Router, Clerk (`useAuth`, `getToken`, `auth()`), TypeScript strict, `@concert-crawl/types`, Vitest, Tailwind CSS, pnpm monorepo

---

## PR 1 — Navigation + Auth Header Sweep

### Task 1: Fix UserMenu "Submitted prices" link + pre-select submissions section

**Context:** `UserMenu.tsx` links "Submitted prices" to `/me/submissions`, which does not exist. The My Submissions content already renders inside `/me`. On desktop, `/me` uses `SettingsRouteDesktop` — a client component with `useState<NavSection>('profile')` for the active section and no URL awareness. On mobile, `SettingsRoute` is a single scrollable page (all sections always visible, no tab switching).

Fix: change the link to `/me?section=submissions`, then read that param in `SettingsRouteDesktop` to initialize the active section. Mobile already shows all sections in a scroll, so no change needed there.

**Files:**
- Modify: `apps/web/src/components/consumer/user-menu/UserMenu.tsx` (~line 331)
- Modify: `apps/web/src/components/settings/SettingsRouteDesktop.tsx`

- [ ] **Step 1: Update the UserMenu href**

In `apps/web/src/components/consumer/user-menu/UserMenu.tsx`, find the `MenuRow` with `label="Submitted prices"`:

```tsx
<MenuRow
  label="Submitted prices"
  href="/me/submissions"
  {...(submissionCount > 0 ? { meta: `${submissionCount} live` } : {})}
  kbd="P"
  last
/>
```

Change `href="/me/submissions"` to `href="/me?section=submissions"`:

```tsx
<MenuRow
  label="Submitted prices"
  href="/me?section=submissions"
  {...(submissionCount > 0 ? { meta: `${submissionCount} live` } : {})}
  kbd="P"
  last
/>
```

- [ ] **Step 2: Read the section param in SettingsRouteDesktop**

`SettingsRouteDesktop` is already a client component (`'use client'`). Add `useSearchParams` to the React import and `useSearchParams` from Next.js.

At the top of `apps/web/src/components/settings/SettingsRouteDesktop.tsx`, add to the existing Next.js import:

```typescript
// BEFORE:
import Link from 'next/link'

// AFTER:
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
```

Inside `SettingsRouteDesktop`, the function currently initializes active section with:

```typescript
const [activeSection, setActiveSection] = useState<NavSection>('profile')
```

Replace with:

```typescript
const searchParams = useSearchParams()
const sectionParam = searchParams.get('section')
const initialSection: NavSection =
  sectionParam !== null &&
  NAV_ITEMS.some((item) => item.key === sectionParam)
    ? (sectionParam as NavSection)
    : 'profile'
const [activeSection, setActiveSection] = useState<NavSection>(initialSection)
```

This reads the `?section=` param on first render, validates it against the known `NAV_ITEMS` keys, and falls back to `'profile'` if the param is missing or invalid.

- [ ] **Step 3: TypeScript check**

```bash
pnpm --filter web typecheck
```

Expected: no errors.

- [ ] **Step 4: Verify manually**

Start the dev server (`pnpm --filter web dev`). Sign in, open the user menu, click "Submitted prices". On desktop: confirm `/me?section=submissions` loads with the "My submissions" panel active in the sidebar. On mobile: confirm `/me?section=submissions` loads and shows the full settings page (submissions section visible on scroll).

- [ ] **Step 5: Commit**

```bash
git add \
  apps/web/src/components/consumer/user-menu/UserMenu.tsx \
  apps/web/src/components/settings/SettingsRouteDesktop.tsx
git commit -m "fix(settings): deep-link Submitted prices to /me?section=submissions"
```

---

### Task 2: Fix server-side auth headers on protected pages

**Context:** Three server-component pages fetch `GET /v1/events/:id` without passing the auth token, despite the token being available from `auth()`. When `REQUIRE_BETA_AUTH=true` is set on the API, these fetches return 401.

- `apps/web/src/app/(protected)/events/[id]/submit-price/page.tsx` line 19 — event fetch has no Authorization header
- `apps/web/src/app/(protected)/events/[id]/submissions/[submissionId]/dispute/page.tsx` line 17 — same issue
- `apps/web/src/app/(protected)/events/page.tsx` lines 58+62 — `fetchEvents` and `fetchVenues` use `publicApiClient` (no auth)

**Files:**
- Modify: `apps/web/src/app/(protected)/events/[id]/submit-price/page.tsx`
- Modify: `apps/web/src/app/(protected)/events/[id]/submissions/[submissionId]/dispute/page.tsx`
- Modify: `apps/web/src/app/(protected)/events/page.tsx`

- [ ] **Step 1: Fix submit-price/page.tsx — add auth header to event fetch**

In `apps/web/src/app/(protected)/events/[id]/submit-price/page.tsx`, the token is already on line 17. Add it to the event fetch on line 19:

```tsx
// BEFORE (line 19):
fetch(`${process.env.NEXT_PUBLIC_API_URL}/v1/events/${id}`),

// AFTER:
fetch(
  `${process.env.NEXT_PUBLIC_API_URL}/v1/events/${id}`,
  token ? { headers: { Authorization: `Bearer ${token}` } } : {},
),
```

The full `Promise.all` block becomes:

```tsx
const [eventRes, submissionsRes] = await Promise.all([
  fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/v1/events/${id}`,
    token ? { headers: { Authorization: `Bearer ${token}` } } : {},
  ),
  fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/v1/events/${id}/price-submissions`,
    token ? { headers: { Authorization: `Bearer ${token}` } } : {},
  ),
])
```

- [ ] **Step 2: Fix dispute/page.tsx — same pattern**

In `apps/web/src/app/(protected)/events/[id]/submissions/[submissionId]/dispute/page.tsx`, token is on line 15. Add it to the event fetch on line 17:

```tsx
// BEFORE (line 17-18):
const [eventRes, submissionRes] = await Promise.all([
  fetch(`${process.env.NEXT_PUBLIC_API_URL}/v1/events/${id}`),

// AFTER:
const [eventRes, submissionRes] = await Promise.all([
  fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/v1/events/${id}`,
    token ? { headers: { Authorization: `Bearer ${token}` } } : {},
  ),
```

The full `Promise.all` stays the same for the `submissionRes` fetch (it already passes the token).

- [ ] **Step 3: Fix events/page.tsx — pass token to fetchEvents and fetchVenues**

In `apps/web/src/app/(protected)/events/page.tsx`, add `apiClient` to the import and update both fetch functions to accept and use the token.

At the top of the file, the import is currently:
```typescript
import { publicApiClient } from '@/lib/api'
```

Change to:
```typescript
import { apiClient, publicApiClient } from '@/lib/api'
```

Update `fetchEvents` signature and implementation:

```typescript
// BEFORE:
async function fetchEvents(
  params: Record<string, string | string[] | undefined>,
): Promise<EventsListResponse> {
  const qs = new URLSearchParams()
  if (typeof params['search'] === 'string') qs.set('search', params['search'])
  const venueSlug = params['filterWhere'] ?? params['venueSlug']
  if (typeof venueSlug === 'string') qs.set('venueSlug', venueSlug)
  if (typeof params['from'] === 'string') qs.set('from', params['from'])
  if (typeof params['to'] === 'string') qs.set('to', params['to'])
  const offsetParam = params['offset']
  if (typeof offsetParam === 'string' && /^\d+$/.test(offsetParam)) {
    const parsed = Number(offsetParam)
    if (Number.isSafeInteger(parsed) && parsed >= 0)
      qs.set('offset', String(parsed))
  }
  if (typeof params['filterPrice'] === 'string')
    qs.set('filterPrice', params['filterPrice'])
  if (typeof params['filterVibe'] === 'string')
    qs.set('filterVibe', params['filterVibe'])
  qs.set('limit', String(PAGE_LIMIT))
  return publicApiClient.get<EventsListResponse>(`/v1/events?${qs.toString()}`)
}

// AFTER:
async function fetchEvents(
  params: Record<string, string | string[] | undefined>,
  token: string | null,
): Promise<EventsListResponse> {
  const qs = new URLSearchParams()
  if (typeof params['search'] === 'string') qs.set('search', params['search'])
  const venueSlug = params['filterWhere'] ?? params['venueSlug']
  if (typeof venueSlug === 'string') qs.set('venueSlug', venueSlug)
  if (typeof params['from'] === 'string') qs.set('from', params['from'])
  if (typeof params['to'] === 'string') qs.set('to', params['to'])
  const offsetParam = params['offset']
  if (typeof offsetParam === 'string' && /^\d+$/.test(offsetParam)) {
    const parsed = Number(offsetParam)
    if (Number.isSafeInteger(parsed) && parsed >= 0)
      qs.set('offset', String(parsed))
  }
  if (typeof params['filterPrice'] === 'string')
    qs.set('filterPrice', params['filterPrice'])
  if (typeof params['filterVibe'] === 'string')
    qs.set('filterVibe', params['filterVibe'])
  qs.set('limit', String(PAGE_LIMIT))
  const path = `/v1/events?${qs.toString()}`
  return token
    ? apiClient.get<EventsListResponse>(path, token)
    : publicApiClient.get<EventsListResponse>(path)
}
```

Update `fetchVenues` signature:

```typescript
// BEFORE:
async function fetchVenues(): Promise<VenuePublic[]> {
  return publicApiClient.get<VenuePublic[]>('/v1/venues')
}

// AFTER:
async function fetchVenues(token: string | null): Promise<VenuePublic[]> {
  return token
    ? apiClient.get<VenuePublic[]>('/v1/venues', token)
    : publicApiClient.get<VenuePublic[]>('/v1/venues')
}
```

In `BrowsePage`, token is already fetched on line 127-128:
```typescript
const { getToken } = await auth()
const token = await getToken()
```

Update the `Promise.all` call to pass the token (currently around line 134):

```typescript
// BEFORE:
const [eventsResult, venues, watchedShows] = await Promise.all([
  fetchEvents(fetchParams),
  fetchVenues(),
  watchedShowsPromise,
])

// AFTER:
const [eventsResult, venues, watchedShows] = await Promise.all([
  fetchEvents(fetchParams, token),
  fetchVenues(token),
  watchedShowsPromise,
])
```

- [ ] **Step 4: TypeScript check**

```bash
cd /path/to/worktree && pnpm --filter web typecheck
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add \
  apps/web/src/app/\(protected\)/events/\[id\]/submit-price/page.tsx \
  apps/web/src/app/\(protected\)/events/\[id\]/submissions/\[submissionId\]/dispute/page.tsx \
  apps/web/src/app/\(protected\)/events/page.tsx
git commit -m "fix(auth): pass token to server-side event fetches on protected pages"
```

---

### Task 3: Fix useSearch.ts — add auth headers to client-side fetches

**Context:** `useSearch.ts` is a client-side hook that makes two unauthenticated fetches:
1. `GET /v1/search/popular` on mount (line 106) — fetches popular events for the search overlay
2. `GET /v1/events?search=...` in a debounced effect (line 131) — fetches search results

Both need an `Authorization: Bearer <token>` header when REQUIRE_BETA_AUTH is active.

**Files:**
- Modify: `apps/web/src/lib/search/useSearch.ts`

- [ ] **Step 1: Add useAuth import**

At the top of `apps/web/src/lib/search/useSearch.ts`, add Clerk's hook:

```typescript
// Add to existing imports:
import { useAuth } from '@clerk/nextjs'
```

- [ ] **Step 2: Call useAuth inside the hook**

Inside `useSearch`, alongside the existing `useState` and `useRef` calls, add:

```typescript
const { getToken } = useAuth()
```

- [ ] **Step 3: Fix the popular events fetch (mount effect)**

The current mount effect (around lines 103-112):

```typescript
useEffect(() => {
  setRecentSearches(readRecent())

  fetch(`${API_URL}/v1/search/popular`)
    .then((res) => res.json())
    .then((body: { success: boolean; data: PopularEvent[] }) => {
      if (body.success) setPopularEvents(body.data)
    })
    .catch(() => {})
}, [])
```

Replace with:

```typescript
useEffect(() => {
  setRecentSearches(readRecent())

  void (async () => {
    try {
      const token = await getToken()
      const headers: Record<string, string> = token
        ? { Authorization: `Bearer ${token}` }
        : {}
      const res = await fetch(`${API_URL}/v1/search/popular`, { headers })
      const body = (await res.json()) as {
        success: boolean
        data: PopularEvent[]
      }
      if (body.success) setPopularEvents(body.data)
    } catch {
      // ignore
    }
  })()
}, [getToken])
```

- [ ] **Step 4: Fix the debounced search fetch**

The current debounced effect sets up a `setTimeout` callback that calls `fetch` (around lines 127-144). The fix wraps the fetch in an async function to await `getToken()` first.

Replace the `setTimeout` callback body:

```typescript
// BEFORE (inside setTimeout):
debounceRef.current = setTimeout(() => {
  const controller = new AbortController()
  abortRef.current = controller
  fetch(
    `${API_URL}/v1/events?search=${encodeURIComponent(trimmed)}&limit=100`,
    { signal: controller.signal },
  )
    .then((res) => res.json())
    .then((body: { success: boolean; data: { data: EventRow[] } }) => {
      if (body.success) {
        setArtistResults(deriveArtistResults(body.data.data))
        setVenueResults(deriveVenueResults(body.data.data))
      }
    })
    .catch(() => {})
    .finally(() => {
      if (!controller.signal.aborted) setIsLoading(false)
    })
}, DEBOUNCE_MS)

// AFTER:
debounceRef.current = setTimeout(() => {
  const controller = new AbortController()
  abortRef.current = controller

  void (async () => {
    try {
      const token = await getToken()
      const headers: Record<string, string> = token
        ? { Authorization: `Bearer ${token}` }
        : {}
      const res = await fetch(
        `${API_URL}/v1/events?search=${encodeURIComponent(trimmed)}&limit=100`,
        { signal: controller.signal, headers },
      )
      const body = (await res.json()) as {
        success: boolean
        data: { data: EventRow[] }
      }
      if (body.success) {
        setArtistResults(deriveArtistResults(body.data.data))
        setVenueResults(deriveVenueResults(body.data.data))
      }
    } catch {
      // ignore (includes AbortError)
    } finally {
      if (!controller.signal.aborted) setIsLoading(false)
    }
  })()
}, DEBOUNCE_MS)
```

- [ ] **Step 5: TypeScript check**

```bash
pnpm --filter web typecheck
```

Expected: no errors.

- [ ] **Step 6: Verify manually**

Start the dev server. Open search overlay. Confirm popular events load and search results appear when typing.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/lib/search/useSearch.ts
git commit -m "fix(search): add auth token to popular-events and search fetches"
```

---

### Task 4: Update progress.md and open PR for PR 1

**Files:**
- Modify: `docs/superpowers/progress.md`

- [ ] **Step 1: Run typecheck + lint across the monorepo**

```bash
pnpm typecheck && pnpm lint
```

Expected: no errors.

- [ ] **Step 2: Update progress.md**

Add a 🔄 row to the "Phase Sequence" table in `docs/superpowers/progress.md` under the existing open items:

```markdown
| — | fix: UserMenu link, auth header sweep (#350, #351) | 🔄 Open |
```

- [ ] **Step 3: Commit progress.md**

```bash
git add docs/superpowers/plans/2026-05-16-pre-beta-blockers.md docs/superpowers/progress.md
git commit -m "chore: add pre-beta blocker plan + progress row"
```

- [ ] **Step 4: Rebase onto main and push**

```bash
git fetch origin
git rebase origin/main
git push -u origin fix/pre-beta-blockers-1
```

- [ ] **Step 5: Open PR**

```bash
gh pr create \
  --title "fix: UserMenu link + auth header sweep (#350, #351)" \
  --body "$(cat <<'EOF'
## Summary

- Fixes \`/me/submissions\` 404 by changing UserMenu's 'Submitted prices' href to \`/me\` (the existing My Submissions section is already there)
- Adds \`Authorization: Bearer\` headers to all server-side event fetches on protected pages that were missing them: \`submit-price\`, \`dispute\`, and the main browse page (\`fetchEvents\` + \`fetchVenues\`)
- Adds \`useAuth()\` + \`getToken()\` to \`useSearch.ts\` for the popular-events and search fetch calls

Closes #350
Closes #351

## New env vars

None.

## Test plan

- [ ] Click 'Submitted prices' in UserMenu → lands on \`/me\` with My Submissions visible
- [ ] With \`REQUIRE_BETA_AUTH=true\` on API: browse page loads events, search overlay loads popular events, submit-price and dispute pages load event data — no 401 errors in console
- [ ] TypeScript strict passes: \`pnpm typecheck\`
- [ ] Lint passes: \`pnpm lint\`
EOF
)"
```

---

## PR 2 — Load More Accumulation + Watching Persistence

> **Before starting PR 2:** Create a new worktree on branch `fix/pre-beta-blockers-2`:
> ```bash
> git -C /path/to/main/repo worktree add .worktrees/fix/pre-beta-blockers-2 -b fix/pre-beta-blockers-2
> ```
> Copy `.env.local` files into all three apps in the new worktree.

### Task 5: Create EventsList client component

**Context:** Currently the browse page (`events/page.tsx`) is a pure server component. "Load More" works by calling `router.replace()` with an incremented `?offset=` URL param, which triggers a full server re-render that fetches and renders ONLY the new page — replacing the existing events list. The fix is to extract the event list into a client component that fetches additional pages and appends them to local state, without changing the URL.

The server component will continue to fetch and render:
- FilterBar, WeekStrip, HeroEventCard, EmptyState (unchanged)
- The initial page of events (first 20)
- Initial watching state

The new `EventsList` client component will own:
- Accumulated events state
- "Load More" logic (client-side fetch + append)
- Date grouping and EventCard rendering
- Watching ID set (seeded from server, stable after initial render)

**Files:**
- Create: `apps/web/src/components/consumer/events-list/EventsList.tsx`
- Create: `apps/web/src/components/consumer/events-list/index.ts`

- [ ] **Step 1: Create the EventsList component file**

Create `apps/web/src/components/consumer/events-list/EventsList.tsx`:

```tsx
'use client'

import { Fragment, useState, useTransition } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import type { EventWithVenue, EventsListResponse } from '@concert-crawl/types'
import { EventCard } from '@/components/consumer/event-card'
import { dateGroupLabel } from '@/components/consumer/definitions/lib'
import { copy } from '@/components/consumer/definitions/copy'
import { cn } from '@/lib/utils'

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001'

export interface EventsListProps {
  initialEvents: EventWithVenue[]
  initialOffset: number
  total: number
  limit: number
  initialWatchedIds: string[]
}

export function EventsList({
  initialEvents,
  initialOffset,
  total,
  limit,
  initialWatchedIds,
}: EventsListProps) {
  const [events, setEvents] = useState<EventWithVenue[]>(initialEvents)
  const [offset, setOffset] = useState(initialOffset)
  const [watchedIds] = useState(() => new Set(initialWatchedIds))
  const [isPending, startTransition] = useTransition()
  const { getToken } = useAuth()
  const searchParams = useSearchParams()

  const hasMore = offset + limit < total

  const loadMore = () => {
    startTransition(async () => {
      const nextOffset = offset + limit
      const qs = new URLSearchParams()

      const search = searchParams.get('search')
      const filterWhere =
        searchParams.get('filterWhere') ?? searchParams.get('venueSlug')
      const from = searchParams.get('from')
      const to = searchParams.get('to')
      const filterPrice = searchParams.get('filterPrice')
      const filterVibe = searchParams.get('filterVibe')

      if (search) qs.set('search', search)
      if (filterWhere) qs.set('venueSlug', filterWhere)
      if (from) qs.set('from', from)
      if (to) qs.set('to', to)
      if (filterPrice) qs.set('filterPrice', filterPrice)
      if (filterVibe) qs.set('filterVibe', filterVibe)
      qs.set('offset', String(nextOffset))
      qs.set('limit', String(limit))

      try {
        const token = await getToken()
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        }
        if (token) headers['Authorization'] = `Bearer ${token}`

        const res = await fetch(`${API_URL}/v1/events?${qs.toString()}`, {
          headers,
        })
        if (!res.ok) return

        const body = (await res.json()) as {
          success: boolean
          data: EventsListResponse
        }
        if (body.success) {
          setEvents((prev) => [...prev, ...body.data.data])
          setOffset(nextOffset)
        }
      } catch {
        // ignore
      }
    })
  }

  // Build date groups from accumulated events
  const groups = new Map<string, EventWithVenue[]>()
  for (const event of events) {
    if (!groups.has(event.date)) groups.set(event.date, [])
    groups.get(event.date)!.push(event)
  }

  return (
    <>
      <div className="flex flex-col gap-6">
        {Array.from(groups.entries()).map(([date, dateEvents]) => {
          const label = dateGroupLabel(date)
          const isTonight = label.toLowerCase() === 'tonight'
          return (
            <section key={date} aria-label={label}>
              <div
                className="mb-1 flex items-baseline gap-2.5 px-4 pb-2"
                style={{ borderBottom: '1px solid var(--border)' }}
              >
                <h2
                  className="shrink-0 leading-none"
                  style={{
                    fontFamily: 'Inter, system-ui',
                    fontWeight: 900,
                    fontSize: 18,
                    letterSpacing: '-0.02em',
                    color: isTonight ? 'var(--accent)' : 'var(--fg)',
                  }}
                >
                  {label}
                </h2>
                <span
                  className="shrink-0 uppercase text-fg-subtle"
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10,
                    letterSpacing: '0.06em',
                  }}
                >
                  {dateEvents.length} show
                  {dateEvents.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div>
                {dateEvents.map((event, idx) => (
                  <Fragment key={event.id}>
                    {idx > 0 && (
                      <div
                        className="h-px bg-border"
                        style={{ marginLeft: 58 }}
                      />
                    )}
                    <EventCard
                      event={event}
                      isWatching={watchedIds.has(event.id)}
                    />
                  </Fragment>
                ))}
              </div>
            </section>
          )
        })}
      </div>

      {hasMore && (
        <div className="mt-8 flex justify-center pt-2">
          <button
            type="button"
            onClick={loadMore}
            disabled={isPending}
            className={cn(
              'inline-flex h-10 items-center justify-center rounded-md border border-border-strong bg-surface-2 px-4 text-[13px] font-bold text-signal transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-1',
              isPending && 'pointer-events-none opacity-60',
            )}
          >
            {isPending ? 'Loading…' : copy.loadMore}
          </button>
        </div>
      )}
    </>
  )
}
```

- [ ] **Step 2: Create the barrel export**

Create `apps/web/src/components/consumer/events-list/index.ts`:

```typescript
export { EventsList } from './EventsList'
export type { EventsListProps } from './EventsList'
```

- [ ] **Step 3: TypeScript check**

```bash
pnpm --filter web typecheck
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/consumer/events-list/
git commit -m "feat(browse): add EventsList client component for client-side event accumulation"
```

---

### Task 6: Refactor events/page.tsx to use EventsList

**Context:** Replace the server-side groups rendering + `<LoadMoreButton>` in `events/page.tsx` (list view only) with the new `<EventsList>` client component. Calendar view rendering stays server-side and is unchanged. The hero event also stays server-rendered. The `LoadMoreButton` component is no longer used from the server page — it can be kept in the codebase for now (the new Load More button is inlined in `EventsList`).

**Files:**
- Modify: `apps/web/src/app/(protected)/events/page.tsx`

- [ ] **Step 1: Add EventsList import**

At the top of `apps/web/src/app/(protected)/events/page.tsx`, add:

```typescript
import { EventsList } from '@/components/consumer/events-list'
```

Remove the `LoadMoreButton` import (it is no longer rendered by the server component):

```typescript
// Remove this line:
import { LoadMoreButton } from '@/components/consumer/load-more'
```

- [ ] **Step 2: Replace the shared groups block with split list/cal rendering**

The current code has a single `{groups.size > 0 && ...}` block that renders event rows for **both** list and calendar view, followed by a separate `{events.length > 0 && view === 'list' && <LoadMoreButton>}` block.

**Important:** `groups` is still needed for the calendar view empty-state check (`{view === 'cal' && groups.size === 0 && <EmptyState>}`), so the `groups` computation at the top of `BrowsePage` stays unchanged.

Find and replace **the entire existing `{groups.size > 0 && ...}` block AND the `{events.length > 0 && view === 'list' && ...}` LoadMoreButton block** with the following two separate blocks:

```tsx
{/* List view — client-side accumulation */}
{view === 'list' && listEvents.length > 0 && (
  <Suspense>
    <EventsList
      initialEvents={listEvents}
      initialOffset={currentOffset}
      total={total}
      limit={limit}
      initialWatchedIds={Array.from(watchedIds)}
    />
  </Suspense>
)}

{/* Calendar view — server-rendered date groups */}
{view === 'cal' && groups.size > 0 && (
  <div className="flex flex-col gap-6">
    {Array.from(groups.entries()).map(([date, dateEvents]) => {
      const label = dateGroupLabel(date)
      const isTonight = label.toLowerCase() === 'tonight'
      return (
        <section key={date} aria-label={label}>
          <div
            className="mb-1 flex items-baseline gap-2.5 px-4 pb-2"
            style={{ borderBottom: '1px solid var(--border)' }}
          >
            <h2
              className="shrink-0 leading-none"
              style={{
                fontFamily: 'Inter, system-ui',
                fontWeight: 900,
                fontSize: 18,
                letterSpacing: '-0.02em',
                color: isTonight ? 'var(--accent)' : 'var(--fg)',
              }}
            >
              {label}
            </h2>
            <span
              className="shrink-0 uppercase text-fg-subtle"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                letterSpacing: '0.06em',
              }}
            >
              {dateEvents.length} show
              {dateEvents.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div>
            {dateEvents.map((event, idx) => (
              <Fragment key={event.id}>
                {idx > 0 && (
                  <div
                    className="h-px bg-border"
                    style={{ marginLeft: 58 }}
                  />
                )}
                <EventCard
                  event={event}
                  isWatching={watchedIds.has(event.id)}
                />
              </Fragment>
            ))}
          </div>
        </section>
      )
    })}
  </div>
)}
```

The existing empty-state blocks (for list view when `events.length === 0`, and for cal view when `groups.size === 0`) remain untouched.

- [ ] **Step 3: Remove now-unused server-side groups computation for list view**

The `groups` map is still needed for calendar view. But the `dateGroupLabel` and `isToday` imports from `definitions/lib` are now only used in the calendar grouping path. Verify no unused imports remain and remove any that do.

The `currentOffset` variable is `eventsResult.offset` (already computed). The `total` and `limit` variables are already destructured from `eventsResult`. No new variables needed.

The `Fragment` import from React is still needed for the calendar view groups rendering. Keep it.

Remove the `LoadMoreButton` import if you haven't already.

- [ ] **Step 4: TypeScript check**

```bash
pnpm --filter web typecheck
```

Expected: no errors.

- [ ] **Step 5: Verify manually**

Start the dev server (`pnpm --filter web dev`). Navigate to `/events` (list view). Confirm events load. Click "Load More" — new events should append below existing ones without the page scrolling to top or the existing events disappearing. Check that switching to calendar view still works correctly.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/\(protected\)/events/page.tsx
git commit -m "fix(browse): use EventsList client component for load-more accumulation"
```

---

### Task 7: Fix WatchShowButton useEffect sync

**Context:** `WatchShowButton` uses `useState(initialWatching)` to seed its local state. React does not re-sync `useState` when props change on the same component instance (e.g., when a parent re-renders with different data after navigation). Adding a `useEffect` that watches `initialWatching` ensures the component stays in sync with server-provided state.

**Files:**
- Modify: `apps/web/src/components/consumer/watch-show-button/WatchShowButton.tsx`

- [ ] **Step 1: Add useEffect to the existing import**

In `apps/web/src/components/consumer/watch-show-button/WatchShowButton.tsx`, the current import is:

```typescript
import { useState, useCallback } from 'react'
```

Change to:

```typescript
import { useState, useCallback, useEffect } from 'react'
```

- [ ] **Step 2: Add the sync effect**

Immediately after the `const [isWatching, setIsWatching] = useState(initialWatching)` line, add:

```typescript
useEffect(() => {
  setIsWatching(initialWatching)
}, [initialWatching])
```

The full top of the component body now reads:

```typescript
const [isWatching, setIsWatching] = useState(initialWatching)
useEffect(() => {
  setIsWatching(initialWatching)
}, [initialWatching])
const [isConfirming, setIsConfirming] = useState(false)
const [isPending, setIsPending] = useState(false)
const { getToken } = useAuth()
```

- [ ] **Step 3: TypeScript check**

```bash
pnpm --filter web typecheck
```

Expected: no errors.

- [ ] **Step 4: Verify manually**

Navigate to `/events`. Watch a show (click "Watch this show"). Navigate away and come back. The watched show should still show the "Watching" state. Unwatch and confirm the state resets correctly.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/consumer/watch-show-button/WatchShowButton.tsx
git commit -m "fix(watching): sync WatchShowButton state when initialWatching prop changes"
```

---

### Task 8: Update progress.md and open PR for PR 2

**Files:**
- Modify: `docs/superpowers/progress.md`

- [ ] **Step 1: Run full typecheck + lint**

```bash
pnpm typecheck && pnpm lint
```

Expected: no errors.

- [ ] **Step 2: Update progress.md**

Add a 🔄 row under the existing open items:

```markdown
| — | fix: load-more accumulation + watching persistence (#352, #353) | 🔄 Open |
```

- [ ] **Step 3: Commit progress.md**

```bash
git add docs/superpowers/progress.md
git commit -m "chore: add progress row for load-more + watching PR"
```

- [ ] **Step 4: Rebase onto main and push**

```bash
git fetch origin
git rebase origin/main
git push -u origin fix/pre-beta-blockers-2
```

- [ ] **Step 5: Open PR**

```bash
gh pr create \
  --title "fix: load-more accumulation + watching persistence (#352, #353)" \
  --body "$(cat <<'EOF'
## Summary

- Adds a new \`EventsList\` client component that holds accumulated events in state and fetches subsequent pages client-side via \`useAuth()\` + \`getToken()\` — no URL changes, no full re-render
- Removes the URL-param-based \`LoadMoreButton\` from the server-rendered browse page (list view); calendar view is unchanged
- Adds \`useEffect\` sync to \`WatchShowButton\` so \`isWatching\` stays in sync when the \`initialWatching\` prop changes (e.g., after server re-render)

Closes #352
Closes #353

## New env vars

None.

## Test plan

- [ ] Browse page loads initial events correctly
- [ ] Clicking Load More appends events below the existing list (no flash, no scroll-to-top)
- [ ] Calendar view continues to work correctly (server-rendered, unaffected)
- [ ] Watch a show → navigate away → return → show still appears as Watching
- [ ] Unwatch → confirm button returns to Watch state
- [ ] TypeScript strict passes: \`pnpm typecheck\`
- [ ] Lint passes: \`pnpm lint\`
EOF
)"
```
