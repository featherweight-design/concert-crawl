# DiscoveryShelf loading state — plan

## Problem

On `/events`, entitled + Spotify-connected users see the "Based on your taste" shelf between the page header and the main event list. Today the shelf renders **nothing** while `useTastePicks()` is in flight — reads as absent/broken for a user we KNOW is connected. This adds a skeleton so the shelf announces itself during the transient gap, with zero layout shift when real picks land.

Reproducible only in narrow cases: cold hydration where SSR didn't seed (PR #1137 removed most of these), entitlement upgrade mid-session, or QueryClient cache miss after a long-idle tab.

## Design handoff

`design/design_handoff_discovery_loading/` — commit assets copied verbatim from `design_handoff_spotify_sync/`, README with all 6 open questions answered, motion tokens locked, box-identical to `TastePickCard` (PR #1067).

## Approach

**Triple-gate to render the loading shelf:**

1. `useEntitlement('spotify-sync').active === true`
2. `useSpotifyConnection().data?.status === 'connected'`
3. `useTastePicks().isPending === true && !isError`

Any missing signal → hidden-style (same behavior we ship today for non-entitled / disconnected).

**Components:**

- `DiscoveryLoadingShelf.tsx` — new. Renders header (matches shipped `ShelfHeader`) + 2 skeleton cards + sweeping shimmer overlay. Timeout at 8s flips to a light retry chip (design's answer to open-Q #4).
- `DiscoveryShelf.tsx` — modified. Adds `useSpotifyConnection`, renders `<DiscoveryLoadingShelf onRetry={() => picksQuery.refetch()} />` when the triple-gate passes.

**Motion + a11y:**

- Keyframes (`dlSweep`, `dlDot`) live in `apps/web/src/app/globals.css` alongside other shipped animations.
- `@media (prefers-reduced-motion: reduce)` hard-stops `.dl-anim` + hides `.dl-sweep` — static placeholder still communicates "loading" via `role=status` + `aria-live=polite`.
- Skeleton bars are `aria-hidden` — the region label alone is what SR users hear.

**Copy:**

- `SPOTIFY_COPY.discovery.loading.eyebrow` — "READING YOUR SPOTIFY FOLLOWS…" (design's cold-start variant; the alternative "FINDING YOUR PICKS…" is not reached in current flow — YAGNI, we can add if a background-refetch loading state ever ships).
- `.eyebrowTimeout` — "TAKING LONGER THAN USUAL"
- `.timeout.eyebrow/title/retryCta` — "STILL TUNING" / "Picks are taking a beat." / "Retry"
- `.ariaLabel` — "Loading picks based on your taste"

## Files

- Create: `apps/web/src/components/consumer/spotify/DiscoveryLoadingShelf.tsx`
- Create: `apps/web/src/components/consumer/spotify/DiscoveryLoadingShelf.test.tsx`
- Modify: `apps/web/src/components/consumer/spotify/DiscoveryShelf.tsx` — connection gate + loading branch
- Modify: `apps/web/src/components/consumer/spotify/DiscoveryShelf.test.tsx` — mock `useSpotifyConnection`, add triple-gate coverage
- Modify: `apps/web/src/components/consumer/spotify/definitions/copy.ts` — new `loading` block
- Modify: `apps/web/src/app/globals.css` — `dlSweep` + `dlDot` keyframes + reduced-motion guard

## Tests

Unit (Vitest):

- `DiscoveryLoadingShelf`: shimmer renders initially → timeout chip appears after 8s → Retry click invokes `onRetry` and returns to shimmer → unmount cancels the timer.
- `DiscoveryShelf`: loading shelf renders when triple-gate met, hides when connection undefined, hides when disconnected. Existing tests updated to opt into the new connection mock.

Manual (staging):

- Cold-hydrate with Spotify connected → shelf paints shimmering → real picks land → zero shift.
- Reduced motion enabled at OS level → static skeleton, no shimmer.
- Simulated slow network (Chrome DevTools throttle) → 8s → timeout chip → Retry refetches.

## Out of scope

Happy path / empty / failure states (all shipped in PR #1067), Settings connection card, non-entitled/disconnected surfacing (stays hidden-style), the "OAuth returns disconnected" polish (separate follow-up PR).
