# Spotlight Heroes — Concert Crawl

Animated hero scenes for `<SpotlightModal>` and the in-changelog teaser strip. Built on the **Showtime stage**: dark cinematic backdrop · warm amber + cool teal drifting washes · JetBrains Mono eyebrow with pulsing dot · brand 7-colour accent set.

15 features in total. Each has both a **full hero** (580×300, for the modal) and a **compact hero** (200×132, for the changelog strip).

## Where to look first

| File | What it is |
|---|---|
| **`SHOWTIME_HANDOFF.md`** | **Engineering handoff doc.** Hero key → component map, render contract, file load order, compact-mode rules, data prop fields per hero, reduced-motion plan, open questions. Start here. |
| `Showtime Beta Launch Heroes.html` | Canvas: all 8 priority-1 heroes (#1–7 + #14 Passport marquee) — locked. |
| `Showtime Priority 2 Heroes.html` | Canvas: 7 priority-2 heroes (#8–13 + #15 Venue Passport pair) — locked. |
| `Showtime Compact Heroes.html` | Canvas: 15 compact 200×132 variants for the changelog strip. |

## Source files (the deliverables)

| File | Exports |
|---|---|
| `passport-concepts-v2.jsx` | Base keyframes (`pc2*`) + #14 Passport (`PassportShowtimeStubs`) |
| `passport-concepts-v3.jsx` | `StubGlyph` SVG component (centroid-centered marks for stubs/stamps/calendar) |
| `more-features-showtime.jsx` | Shared helpers: `ShowtimeBackdrop`, `ShowtimeEyebrow`, `ShowtimeSparkles` + #2 Tiers, #3 History |
| `priority-1-heroes.jsx` | #1 Prices, #4 Calendar, #5 Share, #6 Watchers, #7 Spotify (+`p1-keyframes`) |
| `priority-2-heroes.jsx` | #8 Following, #9 Price Drop, #10 Setlist, #11 First-Timer, #12 Last Time, #13 Support Act, #15 Venue Passport (+`p2-keyframes`) |
| `compact-heroes.jsx` | All 15 compacts + `window.SPOTLIGHT_COMPACT_HEROES` lookup + `CompactStage` (+`compact-keyframes`) |

## All 15 heroes

| # | Feature | `hero` key | Full source | Motion |
|---|---|---|---|---|
| 1 | Submit a Price | `price` | priority-1-heroes.jsx | Radial inflow to verified centre |
| 2 | Upgrade · Tier Badges | `tiers` | more-features-showtime.jsx | Medallion deal-in + Founder halo |
| 3 | Concert History | `history` | more-features-showtime.jsx | Stub cascade across year axis |
| 4 | Calendar Export | `calendar` | priority-1-heroes.jsx | Stamp-pop on dates · current pulses |
| 5 | Shareable Show Cards | `share` | priority-1-heroes.jsx | Card fan reveal + shine sweep |
| 6 | Who Else Is Watching | `watchers` | priority-1-heroes.jsx | Continuous sonar rings |
| 7 | Spotify Sync | `spotify` | priority-1-heroes.jsx | EQ bars (musical rhythm) + tags |
| 8 | Artist Following | `following` | priority-2-heroes.jsx | Slow ping rings + announce-card slide |
| 9 | Price Drop Alerts | `price-drop` | priority-2-heroes.jsx | Price tick down + arrow trail + SAVED |
| 10 | Setlist Preview | `setlist` | priority-2-heroes.jsx | Receipt lines type in (clip-path) |
| 11 | Venue First-Timer Guide | `first-timer` | priority-2-heroes.jsx | Venue plate + info chips deal in |
| 12 | Last Time in Denver | `last-time` | priority-2-heroes.jsx | Polaroid memory card + TONIGHT plate |
| 13 | Support Act Spotlight | `support-act` | priority-2-heroes.jsx | Opener card lifts in front of headliner |
| 14 | Concert Passport (marquee) | `passport` | passport-concepts-v2.jsx | Stub fan-deal + 12 sparkles · breathe |
| 15 | Venue Passport Card | `venue-passport` | priority-2-heroes.jsx | One card + 10 mini-stamps ink in ledger |

**Particle restraint:** only #14 Passport carries sparkles (full hero: 12; compact: 6). Every other hero leans on its own artifact's motion.

## Dispatcher pattern

```jsx
import { SpotlightHero } from "./release-notes.jsx";

const FULL_HEROES = {
  "map":             SpotlightHero,
  "price":           PricesShowtime,
  "tiers":           TierShowtime,
  "history":         HistoryShowtime,
  "calendar":        CalendarShowtime,
  "share":           ShareableShowtime,
  "watchers":        WatchersShowtime,
  "spotify":         SpotifyShowtime,
  "following":       FollowingShowtime,
  "price-drop":      PriceDropShowtime,
  "setlist":         SetlistShowtime,
  "first-timer":     FirstTimerShowtime,
  "last-time":       LastTimeShowtime,
  "support-act":     SupportActShowtime,
  "passport":        PassportShowtimeStubs,
  "venue-passport":  VenuePassportShowtime,
};
const COMPACT_HEROES = window.SPOTLIGHT_COMPACT_HEROES;

function SpotlightHeroDispatcher({ hero, compact }) {
  const Cmp = compact
    ? (COMPACT_HEROES[hero] || COMPACT_HEROES.passport)
    : (FULL_HEROES[hero] || SpotlightHero);
  return <Cmp/>;
}
```

Wrap in a 580×300 (full) or 200×132 (compact) container with `position: relative; overflow: hidden; border-radius: 14px / 8px`. See `SHOWTIME_HANDOFF.md §2` for the scale-wrapper recipe if the modal's hero container has a different aspect ratio.

## Theme

The Showtime stage is **theme-independent** by design — always dark cinematic. Does not read `var(--bg) / --accent / --signal`. See `SHOWTIME_HANDOFF.md §3` for the hard-coded palette.

## What still needs design / product input

Tracked in `SHOWTIME_HANDOFF.md §9`:
- Real watcher count, Spotify import count, price values
- Setlist debut-marker data source
- Last-Time polaroid art rules (artist identity-art vs. abstract?)
- Founder badge serial-number behaviour

Reduced-motion is deferred per `SHOWTIME_HANDOFF.md §7`.

## Earlier exploration (kept for reference)

These predate the Showtime system lock. Not part of the engineering handoff — kept so the design history is browsable:

- `passport-concepts.jsx` / `Passport Hero Concepts.html` — initial passport explorations
- `Passport Hero Concepts v2.html` / `Passport Hero Concepts v3.html` — passport iterations
- `price-hero-concepts.jsx` / `price-concepts-canvas.jsx` / `Price Hero Concepts.html` — price exploration
- `spotlight-heroes.jsx` / `heroes-canvas.jsx` / `Spotlight Heroes.html` — earlier hero set
- `Showtime System Check.html` — system validation pass
- `identity-art.jsx`, `release-data.jsx`, `release-notes.jsx`, `theme-context.jsx`, `design-canvas.jsx`, `ios-frame.jsx` — lifted dependencies for the canvases
