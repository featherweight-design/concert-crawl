# DiscoveryShelf · Loading state

The transient gap on `/events` when a user is **entitled + Spotify-connected but `useTastePicks()` hasn't returned** (cold hydration, missing SSR seed, mid-session upgrade). Today the shelf renders nothing here — reads as absent/broken for someone we _know_ is connected. This adds a skeleton so the shelf announces itself while picks resolve, with **zero layout shift** when they land.

Open **`Discovery Loading.html`** and use **Tweaks** to flip all six open-question answers × 9 themes.

## Design answers to the open questions

1. **Skeleton shape → match-shape** (header + status eyebrow + 2 shimmering pick cards). Slim chip built as the alternative. Match-shape reserves the shelf footprint; slim risks a jump when 2+ cards land.
2. **Shimmer → horizontal sweep (default).** No prior Browse skeleton existed, so this _sets_ the language. Pulse + segmented also built; motion spec on the canvas.
3. **Card skeleton → structured:** image region + reason chip + artist + venue·date + price — box-identical to `TastePickCard` (PR #1067).
4. **Timeout → flip to a light retry chip (~8s).** Lighter than the shipped "taste on pause" failure — "slow", not "broken".
5. **First visit → cold-start eyebrow** ("Reading your Spotify follows…") only when SSR wasn't warmed; generic ("Finding your picks…") otherwise.
6. **Reduced-motion → static placeholder**, via a global `@media (prefers-reduced-motion)` guard. Confirmed.

## Constraints met

- Gated on entitled **and** connected **and** picks-pending (all three); other combinations keep shipped behavior.
- Skeleton height = filled 2-card shelf; condenses (never grows) when fewer real picks arrive.
- No horizontal scroll (non-scrolling row).
- `role=status` + `aria-live=polite`; skeleton bars are `aria-hidden`.
- Token-only; sweep band tied to `--fg`. No green, `--accent` untouched.

## Files

- `discovery-loading.jsx` — `DiscoveryLoadingShelf`, `DiscoveryLoadingScreen`, `DiscoveryLoadingDesktop`, `TimeoutRetryChip`, `DL_MOTION`.
- Deps copied verbatim from `design_handoff_spotify_sync/`: `theme-context`, `ios-frame`, `design-canvas`, `tweaks-panel`, `monetization-shared`, `spotify-shared`, `follow-highlight`, `discovery-surface` (the shipped shelf, shown for the no-shift comparison).

## Not in scope

Happy path / empty / failure (all shipped in PR #1067), Settings connection card, non-entitled + disconnected surfacing (stay hidden-style).
