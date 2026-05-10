# Search Page Design

**Date:** 2026-05-10
**Issue:** #57 — Search nav item dead link (pre-beta blocker)
**Status:** Approved, ready for implementation

---

## Overview

Wire the dead `/search` nav link by building a fully functional search experience. Mobile gets a dedicated `/search` page; desktop gets a command palette overlay triggered by ⌘K or clicking the search bar in `AppHeader`. Both surfaces share a single `useSearch` hook and navigate into existing routes on selection.

---

## Context

- The nav search item has always pointed to `/search` but the route does not exist.
- The API already supports `GET /v1/events?search=` (matches `events.title` and `events.artist`).
- The Browse page already consumes `?search=` query params.
- PR #145 built `EmptyState` for all surfaces except search (explicitly deferred). The `empty-state-content.jsx` design handoff already defines `search.no-data` and `search.filtered` copy.
- Design mocks exist at `design/design_handoff_phase5b_screens/search-mobile.jsx` and `search-desktop.jsx`.

---

## Search Scope

Artists and venues — matching `events.title`, `events.artist`, and `venues.name`.

- `venues.name` requires extending the existing `or()` in `GET /v1/events` to join venues and add `ilike(venues.name, '%${search}%')`.
- Genre is excluded — it is already handled by Browse filter chips and would produce noisy text results.

---

## Navigation Targets

| Result type | Destination |
|-------------|-------------|
| Artist row  | `/events?search=<artist name>` (full page navigation, shows all their upcoming shows) |
| Venue row   | `/venues/<slug>` (existing venue detail page) |
| "Browse all shows" CTA | `/events` |

Tapping any result also persists the query to recent searches before navigating.

---

## API Changes

### 1. Extend `GET /v1/events` search condition

Add `venues.name` to the existing `or()` search clause via a join on `events.venueId = venues.id`. No schema migration required.

**Before:**
```ts
or(ilike(events.title, `%${search}%`), ilike(events.artist, `%${search}%`))
```

**After:**
```ts
or(
  ilike(events.title, `%${search}%`),
  ilike(events.artist, `%${search}%`),
  ilike(venues.name, `%${search}%`),
)
```

### 2. New endpoint: `GET /v1/search/popular`

Returns the top 5 upcoming events ordered by watcher count (number of `user_events` rows with `status = 'watching'`). No authentication required — the count is an aggregate with no PII exposed.

**Response shape** (matches existing event list items):
```ts
{
  success: true,
  data: Array<{
    id: string
    title: string
    artist: string
    date: string
    venue: { name: string; slug: string }
    ticketPriceMin: string | null
    watcherCount: number
  }>
}
```

Falls back gracefully to soonest upcoming events if no watcher data exists yet.

---

## Shared `useSearch` Hook

Location: `apps/web/src/lib/search/useSearch.ts`

Encapsulates all stateful logic consumed by both the mobile page and desktop palette.

### State

| Field | Type | Source |
|-------|------|--------|
| `query` | `string` | Controlled input |
| `recentSearches` | `string[]` | `localStorage` key `cc_recent_searches`, max 5 entries, FIFO eviction |
| `popularEvents` | `PopularEvent[]` | Fetched once on mount from `GET /v1/search/popular` |
| `artistResults` | `ArtistResult[]` | Derived client-side from `GET /v1/events?search=<query>` response |
| `venueResults` | `VenueResult[]` | Derived client-side from same response |
| `isLoading` | `boolean` | True during debounced fetch |

### Behaviour

- **Debounce:** 300ms after query changes before firing the events fetch.
- **Recent searches:** Written on navigation (before `router.push`); read on mount. Stored as `string[]`, max 5, newest first.
- **Artist/venue split:** The flat events array is reduced client-side into deduplicated artist entries (with next show date/venue as subtitle) and venue entries (with upcoming show count as subtitle). Artists section renders first.
- **Navigation:** `router.push` with appropriate URL; writes query to recent searches first.

### Return shape

```ts
{
  query: string
  setQuery: (q: string) => void
  clearQuery: () => void
  recentSearches: string[]
  popularEvents: PopularEvent[]
  artistResults: ArtistResult[]
  venueResults: VenueResult[]
  isLoading: boolean
  navigateTo: (type: 'artist' | 'venue', value: string | { slug: string }) => void
}
```

---

## Mobile: `/search` Page

**Location:** `apps/web/src/app/(protected)/search/page.tsx`

A thin wrapper that mounts `useSearch` and renders the appropriate state. No logic lives in the page component itself.

### Layout

Full-screen, uses standard `var(--bg)` background. Bottom nav remains visible with the search tab highlighted.

### Components

**`SearchBar`** (`search/SearchBar.tsx`)
- Sticky at top
- Back arrow (→ `router.back()`) on the left
- Pill input: search icon left, placeholder "Search artists, venues…", clear button (×) appears when query non-empty
- Autofocuses on mount

**`SearchDefaultState`** (`search/SearchDefaultState.tsx`)
- Shown when `query.trim() === ""`
- "Recent" section: history icon, mono uppercase header, up to 5 tappable rows (each calls `setQuery`)
- "Popular this week" section: fire icon (accent-colored), 5 event rows — artist name bold, mono subtitle with venue short + day label + price (or "TBA")

**`SearchResultsState`** (`search/SearchResultsState.tsx`)
- Shown when query is non-empty and results exist
- "Artists · N" section: circular avatar (IdentityArt), name bold, next show date + venue short as mono subtitle
- "Venues · N" section: pin icon avatar, venue name bold, upcoming show count as mono subtitle
- Hairline dividers between rows within each section

**`SearchEmptyState`** (`search/SearchEmptyState.tsx`)
- Shown when query is non-empty and no results
- Renders `EmptyState` component with `state="filtered"`, `density="default"`
- Copy from `copy.ts` `search` keys; query interpolated into body at render time
- Primary CTA: "Browse all shows" → `/events`
- Note: "Watch this artist" CTA deferred until artist following ships

### Empty state copy additions (`copy.ts`)

```ts
search: {
  noResultsEyebrow: "No results",
  noResultsBody: "Try another spelling, or browse what's on tonight.",
  noResultsCta: "Browse all shows",
}
```

`copy.ts` holds only static strings. The `title` prop is query-interpolated at render time and passed directly to `EmptyState`: `title={\`Nothing for "${query}".\`}` — matching the mock exactly. `body` and `eyebrow` come from `copy.ts` unchanged.

---

## Desktop: Command Palette

**Location:** `apps/web/src/components/consumer/search-palette/SearchPalette.tsx`

A modal overlay rendered from `AppHeader`. Consumes the same `useSearch` hook.

### Trigger / Dismiss

| Action | Effect |
|--------|--------|
| Click search bar in `AppHeader` | Opens palette |
| Press ⌘K (global `keydown` on `AppHeader` mount) | Opens palette |
| Press `Escape` | Closes palette |
| Click backdrop | Closes palette |

The existing `AppHeader` desktop search bar becomes a `<button>` (not a real input) that fires the open handler. The ⌘K hint already present in the UI remains.

### Shell

560×540px centered panel. `background: var(--bg-elevated)`, `border: 1px solid var(--border)`, `border-radius: 14px`, heavy `box-shadow`. Semi-transparent backdrop behind.

### Structure

**Header (56px, border-bottom)**
- Search icon left
- Autofocused input, placeholder "Search artists or venues…"
- Clear button (×) when query non-empty
- `esc` kbd hint right

**Body (flex: 1, scrollable)**
- Same three states as mobile: default, results, no results
- No-results uses `EmptyState` with `density="dense"`

**Footer (38px, border-top)**
- Mono keyboard hints: `↑ ↓ navigate`, `↵ open`
- Concert crawl accent dot branding (right-aligned)

### Keyboard Navigation

`↑`/`↓` moves a highlight indicator through result rows. `Enter` navigates to the highlighted item (same URL as tapping). Arrow keys are scoped to the palette — no global interference.

---

## AppHeader Wiring

- **Desktop:** existing search bar `<div>` → `<button onClick={openPalette}>`. ⌘K listener added on mount, removed on unmount.
- **Mobile:** search icon in `AppHeader` already links to `/search` (no change needed — the route now exists).
- **`BottomNav`:** search tab already points to `/search` (no change needed).

---

## Testing

### Unit / integration (Vitest)

**`useSearch` hook**
- Debounce: fetch fires after 300ms, not before
- Recent searches: persists to localStorage, evicts oldest when count exceeds 5, reads on init
- `clearQuery` resets query and results
- `navigateTo` writes recent search then calls `router.push` with correct URL

**`SearchPage` (mobile)**
- Default state: recent rows and popular events visible when query is empty
- Results state: artist and venue sections render when query matches
- No-results state: `EmptyState` rendered with correct props when query returns nothing
- Recent row tap: calls `setQuery` with that query

**`SearchPalette` (desktop)**
- Opens on ⌘K, closes on Escape
- Closes on backdrop click
- Input autofocuses on open
- Keyboard navigation: ↑↓ moves highlight, Enter triggers navigation

**API: `GET /v1/search/popular`**
- Seeds events with varying watcher counts; asserts top 5 returned in descending order
- Asserts no auth required (200 without session token)
- Asserts graceful fallback to soonest events when no watcher data exists

**API: `GET /v1/events?search=`**
- Extends existing search tests: asserts venue name match returns results

---

## Out of Scope

- Artist detail page — post-launch, when Spotify data is available
- "Watch this artist" CTA in no-results state — when artist following ships
- Server-side recent search persistence — localStorage is sufficient for beta
- Search result pagination — the events endpoint returns up to 100 results; sufficient for beta volume
