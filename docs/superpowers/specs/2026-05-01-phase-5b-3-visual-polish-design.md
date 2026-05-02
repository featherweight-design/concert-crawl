# Phase 5b-3: Visual Polish — Design Spec

**Date:** 2026-05-01
**Branch:** `feat/phase-5b-3-visual-polish`
**Reference mocks:** `/design/design_handoff_phase5b_screens/browse-home.jsx`, `browse-desktop.jsx`

---

## Scope

A single focused PR that resolves all post-filter-redesign visual discrepancies identified in the memory punch list. No new features. No structural refactors outside the files listed below.

---

## 1. AppHeader / Top Nav

**File:** `apps/web/src/components/consumer/app-header/AppHeader.tsx`

### Active link styling

- Use `usePathname()` from `next/navigation` to detect the current route.
- Active link: `font-bold text-[--fg] bg-[--surface-2] rounded-lg px-[14px] py-[8px]`
- Inactive link: `font-medium text-[--fg-muted] bg-transparent px-[14px] py-[8px]`
- Inactive links get a hover state: `hover:bg-surface-1 hover:text-fg` with `transition-colors`.

### User avatar

- Replace raw Clerk `<UserButton>` with a custom `<UserAvatar>` component.
- Reads first name initial (and last name initial if available) from Clerk `useUser()`.
- Dimensions: 36×36px circle (`w-9 h-9 rounded-full`).
- Background: `bg-[--surface-2] border border-[--border]`
- Text: `text-[--fg-muted] font-bold text-[13px]`
- Fallback initial when name is unavailable: first character of the user's email address.
- Component lives alongside `AppHeader` (not a shared/global component — only used here).

### Nav responsiveness

- Ensure the nav container uses `max-w-5xl mx-auto` and that nav items use `shrink-0` so they don't compress.
- If overflow still occurs at narrow desktop widths, add `overflow-x-auto` to the nav container as a safety valve — this is a compressed-desktop edge case, not a mobile concern.

---

## 2. FilterBar

**File:** `apps/web/src/components/consumer/filter-bar/FilterBar.tsx`

### cursor-pointer

- Add `cursor-pointer` to all filter chips and to the List/Cal toggle buttons.

### List/Cal toggle visibility

- Wrap the List/Cal toggle in `hidden sm:flex` — mobile uses chips only, no toggle.

### Mobile chip overflow

- Change the chips container from `flex-wrap` to `flex-nowrap overflow-x-auto scrollbar-none`.
- This keeps chips on a single horizontal scroll row at all viewport widths.
- No shrink/truncate; chips retain their natural width and the row scrolls.

---

## 3. EventImage — Artist avatar gradient

**File:** `apps/web/src/components/consumer/event-card/EventImage.tsx`

Replace the flat `bg-surface-2` fallback with a hue-shifted gradient derived from the artist name.

**Hash function:**

```ts
const hash = artist.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
const hues = [280, 200, 340, 160, 30, 220, 310, 180, 50, 260]
const hue = hues[hash % hues.length]
```

**Gradient (inline style on the fallback div):**

```ts
background: `linear-gradient(135deg, oklch(0.35 0.08 ${hue}), oklch(0.22 0.06 ${hue + 40}))`
```

**Initial letter color:**

```ts
color: `oklch(0.75 0.12 ${hue})`
```

- Extract this logic into a small helper (`getArtistGradientStyle(artist: string)`) co-located in the `event-card/` folder (not global `definitions/`).
- If `artist` is undefined or empty, fall back to hue index 0 (purple).

---

## 4. Date Group Labels

**File:** `apps/web/src/components/consumer/definitions/lib.ts`

- In `dateGroupLabel()`, change `weekday: 'long'` → `weekday: 'short'`.
- Output changes from "Thursday" → "Thu". No other changes to this function.

---

## 5. Load More Button

**File:** `apps/web/src/components/consumer/load-more/LoadMoreButton.tsx`

Replace the current `outline` variant with explicit token-based styling:

```
bg-[--surface-2] border border-[--border-strong] text-[--signal] font-bold text-[13px]
```

- Keep existing click / loading / disabled behaviour untouched.
- Width and padding stay as-is unless the mock shows otherwise.

---

## 6. Mobile Font Sizes

- Do a visual audit of the browse page at 390px width in a browser (DevTools device emulation).
- Only adjust sizes that are obviously mismatched against the mock — no speculative resizing.
- This is a "look and see" pass, not a predetermined list of changes. If nothing looks wrong, nothing changes.

---

## Out of Scope

- Event detail screen visual issues (deferred — user has separate notes)
- Venue detail screen visual issues (deferred)
- Any functional changes (filtering logic, API calls, state management)
- New components beyond `<UserAvatar>`

---

## Testing

1. Run `pnpm dev`, open http://localhost:3000
2. Verify browse page at 390px (mobile), 768px (tablet), 1280px (desktop)
3. Check: active nav link highlighted on `/events`; avatar visible top-right
4. Check: filter chips scroll horizontally on mobile; List/Cal toggle visible on mobile (text-only, icons hidden at `sm`+)
5. Check: artist fallback tiles show hue-shifted gradients (no two adjacent artists should look identical if they have different names)
6. Check: date group headers show "Thu" not "Thursday"
7. Check: Load More button matches token styling
8. TypeScript + ESLint must pass (`pnpm typecheck && pnpm lint`)
