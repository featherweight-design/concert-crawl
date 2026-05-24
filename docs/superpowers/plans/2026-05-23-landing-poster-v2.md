# Landing Poster v2

Design ref: `design/design_handoff_landing_poster_v2/`
Branch: `feat/landing-poster-v2`

Replaces the `GigPosterStack` hero on the landing page with the new `LandingPosterAnimation` (stack mode). Uses the Phase 7.5 IdentityArt engine for full-bleed art and palette, matching the visual language of the shareable poster card.

---

## Tasks

- [ ] **Task 1 — Create `LandingPoster.tsx`**
      Port `landing-poster.jsx` to TypeScript. Replace all `window.*` globals with direct imports from production code:
  - `IdentityArt` from `@/components/consumer/identity-art/IdentityArt`
  - `identityFor`, `ia_isDark` exported from the same module
  - State pills are a local constant (not a window global)
  - New `LandingShow` type: `{ id: string; artist: string; venue: string; city: string; dateShort: string; showTime: string; opener: string | null; state: 'tonight' | 'soldout' | null }`
  - Drop `'use client'` marker — the component is used from `LandingClientShell` which is already a client component
  - Place at `apps/web/src/components/brand/landing-poster/LandingPoster.tsx`

- [ ] **Task 2 — Create `LandingPosterAnimation.tsx`**
      Port `landing-poster-stack.jsx` to TypeScript. Includes `LPStack`, `LPTicker`, `LPWall`, and the unified `LandingPosterAnimation` component (mode prop: `'stack' | 'ticker' | 'wall'`, default `'stack'`). Uses `LandingPoster` (not `GigPoster`).
  - Place at `apps/web/src/components/brand/landing-poster/LandingPosterAnimation.tsx`

- [ ] **Task 3 — Update `page.tsx` data layer**
  - Define new `LandingShow` type (or import from component)
  - Rename `fetchHeroShows` → keep as is, but change return type to `LandingShow[]`
  - Add `formatDateShort(date: string): string` — returns e.g. `"MAY 23"` from `"2026-05-23"`
  - Add `deriveShowState(date: string): 'tonight' | null` — compares event date to today in Mountain Time (America/Denver). Logic: format both sides as `YYYY-MM-DD` in the Denver timezone; if equal, return `'tonight'`; otherwise `null`. Note: `soldout` and `drop` states require API data not available in the public events list; excluded from this PR.
  - Update `FALLBACK_SHOWS` to include `id`, `city`, `dateShort`, `state` fields; remove old `date`/`time` fields
  - Map `EventWithVenue` to `LandingShow`: forward `venue.city` → `city`, compute `dateShort`, set `state`

- [ ] **Task 4 — Update `LandingClientShell.tsx`**
  - Replace `GigPosterStack` import with `LandingPosterAnimation`
  - Replace `Show` type import (from `gig-poster`) with `LandingShow` (from `landing-poster`)
  - Update the JSX: `<LandingPosterAnimation mode="stack" shows={shows} width={290} height={400} intervalMs={5500} />`
  - The container div around the poster needs no changes (`flex justify-center md:justify-end` is correct)

---

## Notes

- `gig-poster.jsx` / `GigPoster.tsx` and `GigPosterStack.tsx` are NOT deleted — still used by the auth gate canvas. Keeping them in place.
- `LandingPoster` renders `IdentityArt` with `showInitials={false}` and `scale="hero"` — matches the design spec.
- TONIGHT detection uses `Intl.DateTimeFormat` with `America/Denver` timezone, not a hardcoded UTC offset, so it handles DST correctly.
- The `lpShuffle` function in the design file shuffles shows per mount — ported to TS as a local helper.
- Indicator dots in `LPStack` use a pill shape (active = wide pill, inactive = circle) — matches the design. The old `GigPosterStack` used simple circles; this is a deliberate improvement.
