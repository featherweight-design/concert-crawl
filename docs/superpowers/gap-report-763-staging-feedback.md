# Design Gap Report — #763 Staging Feedback Fixes

**Date:** 2026-07-19
**Branch:** `fix/763-staging-feedback`
**Property table:** `docs/superpowers/design-tables/763-spotify-connect-ui.md`
**Scope:** surfaces changed by the staging-feedback fix — OAuthHandoffSheet (rail + fail-connect states, header removal in error phase, direct retry), ModalShell optional header, taste-filter connect-nudge empty state.

## Verification (design-review Agent 2, dual-pass)

### Pass 1 — Visual properties

All table rows for the changed surfaces verified ✅ MATCH:

- **OAuthHandoff rail:** glyph pair container (gap 14px), 3-dot sequence (5px, `var(--signal)`, opacity 0.4/0.65/0.9), eyebrow (10px / 0.16em / signal), heading (25px / 900 / -0.03em / 1.15), subheading (13.5px / fg-muted / 1.45 / max-w 320px / mb 22px), honesty-rail card (16px radius, surface-1, 16px padding), footer (column, gap 10px), SignalButton + TextButton.
- **FailConnectDown:** all copy verbatim from the handoff (`spotify · no answer` / "Spotify's not picking up." / body / "Try again" / "Maybe later"); NoAnswerGlyph SVG path `d` strings byte-identical; StateBody eyebrow/title/body specs match.

### Pass 2 — State reachability / behavior

- Error state reachable and renders with **no header band** (conditional prop spread — header genuinely absent, not undefined) ✅
- "Try again" retries the connection **directly** via `beginHandoff`, disabled while in flight, no flash back to the rail ✅
- Cancelled Clerk reverification returns to the rail, not the error state ✅
- ModalShell omitted header renders no container div in both mobile and desktop branches ✅
- Redirect result keeps the button disabled until navigation; dismiss-while-in-flight cancels the redirect ✅

## Design-uncovered surface (documented, not a gap)

The taste-filter **not-connected empty state** (`SPOTIFY_COPY.tasteFilter.emptyNotConnected`) has no counterpart in the design handoff — `taste-filter.jsx` mocks only the chip, upsell, and filtered-rows states. The surface arose from staging feedback (#763). It reuses the shipped shared `EmptyState` component (established Browse empty-state pattern), so it inherits the design system rather than introducing bespoke styling.

## Verdict

**0 visual gaps, 0 state gaps.** No Agent 3 confirmation round required.
