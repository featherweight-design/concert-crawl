# Genre Chips on Browse Event Cards — Design

**Date:** 2026-05-14
**Issue:** #341
**Status:** Approved — ready for implementation

---

## Problem

Genre tags (e.g. `pop`, `jazz`) are only visible on the spotlight show at the top of the Browse page. Event list cards below the spotlight do not display genre tags, even though `Event.genre: string[] | null` is already populated and returned in the event list API response.

---

## Solution

Extract the genre chip rendering into a shared `GenreChips` component and use it in `EventCard`, replacing the inline chip blocks in `HeroEventCard` and the event detail page at the same time.

---

## Components

### `GenreChips` (new)

**File:** `apps/web/src/components/consumer/GenreChips.tsx`

- Props: `genre: string[] | null`
- Renders a flex row of chip spans, or nothing if `genre` is null or empty
- Chip styling (matches current `HeroEventCard` implementation):
  - `bg-surface-3`, `text-fg-muted`, `rounded-[4px]`
  - `px-[7px] py-[2px]`
  - Font: `var(--font-mono)`, `9px`, `letterSpacing: 0.03em`
  - Container: `flex flex-wrap gap-1`

### `EventCard` (updated)

**File:** `apps/web/src/components/consumer/event-card/EventCard.tsx`

- Add `<GenreChips genre={event.genre} />` below the venue + time line
- No other changes

### `HeroEventCard` (updated)

**File:** `apps/web/src/components/consumer/hero-event-card/HeroEventCard.tsx`

- Replace inline chip block (lines 107–123) with `<GenreChips genre={event.genre} />`

### Event detail page (updated)

**File:** `apps/web/src/app/(protected)/events/[id]/page.tsx`

- Replace inline chip block (lines 168–183) with `<GenreChips genre={event.genre} />`

---

## Data

No API changes. `genre` is already present in the event list response. No new fetching required.

---

## Edge Cases

- `genre: null` → renders nothing (no empty row)
- `genre: []` → renders nothing (no empty row)
- Long genre lists → `flex-wrap` handles overflow naturally
