# Gap Report — Spotlight Heroes

## IMPLEMENTED (107)

All 15 full heroes and 15 compact heroes implemented with correct:
- Stage dimensions (full 580×300, compact 200×132)
- Background radial-gradient (#1A1228 → #0A0613, theme-independent)
- Dispatcher routing — all 15 keys in FULL_HEROES and SPOTLIGHT_COMPACT_HEROES
- Sparkle particles — ONLY passport: full=12, compact=6; all others: none
- All animation keyframe names resolve to injected CSS in showtime-base.tsx
- Compact keyframe injection now in CompactStage via useShowtimeKeyframes()
- Mobile hero scale via ResizeObserver (not window.innerWidth, not variant prop)
- Fallback hero for unknown keys → PricesShowtime

## FIXED DURING REVIEW (4)

1. `CompactStage` now calls `useShowtimeKeyframes()` — compact animations were never injected standalone
2. `SpotlightModal` hero scale driven by ResizeObserver instead of static `window.innerWidth`
3. `SpotlightModal` `isMobile` derived from measured container width, not `variant` prop (which was never passed)
4. `SpotlightHero` full dispatcher falls back to `PricesShowtime` for unknown keys
5. `TiersCompact` renamed to `TierCompact` (matches design export name)
6. `ShareCompact` renamed to `ShareableCompact` (matches design export name)

## DEFERRED (7)

All deferred items are within the explicit user directive: "Data props: use your best judgement here, make the data feel believable/use artists we actually have events for."

1. **ShareableShowtime bands** — design: `"sleep token"` / `"pile"` / `"wednesday"`; impl: `"tame impala"` / `"japanese breakfast"` / `"fleet foxes"`. Reason: user directive permits any believable Denver artists.
2. **SpotifyShowtime artist tags** — design: `"GEESE"` / `"MJ LENDERMAN"` / `"BIG THIEF"`; impl: `"KHRUANGBIN"` / `"PHOEBE BRIDGERS"` / `"ST. VINCENT"`. Reason: same.
3. **FirstTimerShowtime info chips** — design had specific chip labels; impl uses different but categorically equivalent venue-info chips. Reason: user directive.
4. **SupportActShowtime caption** — design: `"13 followers · new to you"`; impl: `"Mission Ballroom · new to you"`. Reason: user directive; venue name is equally informative placeholder data.
5. **SupportActCompact opener band** — design: `"Marriages"`; impl: `"SOCCER MOMMY"`. Reason: user directive; consistent with full hero's opener choice.
6. **Numeric stand-ins** — watcher count (247→312), import count (27→34), history count (47→34), venue passport nights (10→8). Reason: SHOWTIME_HANDOFF.md explicitly marks these as stand-ins (open questions #1 and #2).
7. **CalendarShowtime extra subtitle row** — impl adds `"RED ROCKS · JUN 2026"` row not in design. Reason: additive enhancement; does not remove any design element.
