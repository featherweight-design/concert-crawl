# Showtime Spotlight Heroes — Engineering Handoff

This package contains 15 Spotlight hero animations on a shared **Showtime stage** (dark cinematic backdrop · warm + cool drifting washes · JetBrains Mono eyebrow with pulsing dot · brand 7-colour accent set). Each hero has a distinct motion personality but lives on the same stage.

---

## 1. Hero key → component map

The dispatcher in `release-notes.jsx` keys on a `hero` string. The full set:

| `hero` value | Feature # | Component | Source file |
|---|---|---|---|
| `"map"` | (legacy) | `SpotlightHero` (original) | `release-notes.jsx` |
| `"price"` | #1 Submit a Price | `PricesShowtime` | `priority-1-heroes.jsx` |
| `"tiers"` | #2 Upgrade · Tier Badges | `TierShowtime` | `more-features-showtime.jsx` |
| `"history"` | #3 Concert History | `HistoryShowtime` | `more-features-showtime.jsx` |
| `"calendar"` | #4 Calendar Export | `CalendarShowtime` | `priority-1-heroes.jsx` |
| `"share"` | #5 Shareable Show Cards | `ShareableShowtime` | `priority-1-heroes.jsx` |
| `"watchers"` | #6 Who Else Is Watching | `WatchersShowtime` | `priority-1-heroes.jsx` |
| `"spotify"` | #7 Spotify Sync | `SpotifyShowtime` | `priority-1-heroes.jsx` |
| `"following"` | #8 Artist Following | `FollowingShowtime` | `priority-2-heroes.jsx` |
| `"price-drop"` | #9 Price Drop Alerts | `PriceDropShowtime` | `priority-2-heroes.jsx` |
| `"setlist"` | #10 Setlist Preview | `SetlistShowtime` | `priority-2-heroes.jsx` |
| `"first-timer"` | #11 Venue First-Timer Guide | `FirstTimerShowtime` | `priority-2-heroes.jsx` |
| `"last-time"` | #12 Last Time in Denver | `LastTimeShowtime` | `priority-2-heroes.jsx` |
| `"support-act"` | #13 Support Act Spotlight | `SupportActShowtime` | `priority-2-heroes.jsx` |
| `"passport"` | #14 Concert Passport | `PassportShowtimeStubs` | `passport-concepts-v2.jsx` |
| `"venue-passport"` | #15 Venue Passport Card | `VenuePassportShowtime` | `priority-2-heroes.jsx` |

**Dispatcher pattern** (extend the existing `SpotlightHeroV2` in `spotlight-heroes.jsx`):

```jsx
const SHOWTIME_HEROES = {
  "map":             SpotlightHero,           // legacy, from release-notes.jsx
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

function SpotlightHeroDispatcher({ hero }) {
  const Cmp = SHOWTIME_HEROES[hero] || SpotlightHero;
  return <Cmp/>;
}
```

---

## 2. Render contract

Every hero in this set is built to the **same fixed contract**:

| Property | Value | Notes |
|---|---|---|
| Render size | **580 × 300 px** | Designed and laid out for this exact frame |
| Positioning | `position: absolute; inset: 0` inside parent | Parent must be 580×300 and `position: relative; overflow: hidden` |
| Background | Owns its own (radial gradient + drifting washes) | Don't wrap in another backdrop |
| Border-radius | Owns its own (clipped by parent overflow) | Parent should clip with `border-radius` if rounding is desired |
| Motion | Auto-starts on mount | No JS API to play/pause; CSS keyframes only |
| Theme | **Stage is theme-independent** | Uses hard-coded Showtime palette (see §3) — does **not** read `var(--bg)` / `var(--accent)` / `var(--signal)` |

Engineering should wrap the hero in whatever container the SpotlightModal provides, sized 580×300, with overflow:hidden and the rounded corners it wants:

```jsx
<div style={{
  position: "relative",
  width: 580, height: 300,
  borderRadius: 14,
  overflow: "hidden",
  boxShadow: "0 18px 40px rgba(0,0,0,0.25)",
}}>
  <SpotlightHeroDispatcher hero={spotlight.hero}/>
</div>
```

If the SpotlightModal's hero container is a different aspect ratio, **scale the wrapper**, don't try to reflow each hero — these are composed by hand inside a 580×300 frame and won't gracefully re-layout. Pattern:

```jsx
// If the modal hero is e.g. 480×248:
const SCALE = 480 / 580; // 0.828
<div style={{ width: 480, height: 248, overflow: "hidden", position: "relative" }}>
  <div style={{
    width: 580, height: 300,
    transform: `scale(${SCALE})`,
    transformOrigin: "top left",
  }}>
    <SpotlightHeroDispatcher hero={spotlight.hero}/>
  </div>
</div>
```

---

## 3. Why the stage is theme-independent

The Showtime stage is **always dark cinematic** — that's the brand intent (these are heroes for *moments*, not the chrome of the app). They don't switch with the `electric / jade / light` theme.

That means:
- ✅ Reading the hero on `electric`: looks correct.
- ✅ Reading the hero on `jade`: still dark cinematic.
- ✅ Reading the hero on `light`: still dark cinematic — surrounded by light app chrome, the hero becomes a deliberate dark "stage" inside the modal.

The palette is intentionally hard-coded:

```
Stage background:    radial-gradient(ellipse at 70% 30%, #1A1228, #0A0613)
Warm wash:           rgba(255,184,56,0.22)   ← drifting amber
Cool wash:           rgba(122,230,255,0.20)  ← drifting teal

Brand accent set (rotated per hero):
  #7AE6FF (cyan)     #FF7BD4 (pink)     #FFE36B (gold)
  #A075FF (violet)   #C9F26E (lime)     #FFB838 (amber)
  #5DD4D6 (teal)
```

If product later wants themed heroes, that's a re-design — these compositions assume a dark stage.

---

## 4. File load order

Heroes have a few cross-file dependencies. Load in this exact order (the canvas HTML already does this):

```html
<!-- React + Babel -->
<script src="https://unpkg.com/react@18.3.1/..."></script>
<script src="https://unpkg.com/react-dom@18.3.1/..."></script>
<script src="https://unpkg.com/@babel/standalone@7.29.0/..."></script>

<!-- 1. Base keyframes (pc2StubDealVaried, pc2StubBreathe, pc2BgShift, pc2Sparkle, pc2Pulse, pc2EyebrowEnter) -->
<script type="text/babel" src="passport-concepts-v2.jsx"></script>

<!-- 2. StubGlyph component (used by stubs / stamps / calendar / venue-passport) -->
<script type="text/babel" src="passport-concepts-v3.jsx"></script>

<!-- 3. Shared Showtime helpers (ShowtimeBackdrop, ShowtimeEyebrow, ShowtimeSparkles)
        AND priority-1 heroes that lifted these helpers earlier (Tier, History) -->
<script type="text/babel" src="more-features-showtime.jsx"></script>

<!-- 4. Priority-1 heroes (Calendar, Shareable, Watchers, Spotify, Prices) + p1-keyframes -->
<script type="text/babel" src="priority-1-heroes.jsx"></script>

<!-- 5. Priority-2 heroes (Following, Price Drop, Setlist, First-Timer, Last Time, Support Act, Venue Passport) + p2-keyframes -->
<script type="text/babel" src="priority-2-heroes.jsx"></script>

<!-- 6. Compact 200×132 variants of all 15 — + compact-keyframes. Safe to load even if you don't use them. -->
<script type="text/babel" src="compact-heroes.jsx"></script>
```

**Keyframe injection** is idempotent — each `if (!document.getElementById("..."))` guard prevents double-injection. Safe to mount multiple heroes on the same page.

Engineering can convert these to real ES modules + bundler imports — the `window.X` exports are only for the in-browser Babel demo.

---

## 5. Compact / changelog strip (200 × 132)

Every hero has a compact variant in `compact-heroes.jsx`. The 15 compact components are NOT scaled-down 580×300 heroes — each is hand-composed at 200×132 with a single hero artifact + minimal mono eyebrow. See `Showtime Compact Heroes.html` for the canvas.

**Dispatcher — add `compact` to the routing:**

```jsx
// At top of file, alongside the FULL_HEROES map:
const COMPACT_HEROES = window.SPOTLIGHT_COMPACT_HEROES;
  // map of {hero: ComponentForCompact} — see compact-heroes.jsx

function SpotlightHeroDispatcher({ hero, compact }) {
  const Cmp = compact
    ? (COMPACT_HEROES[hero] || COMPACT_HEROES.passport)  // sensible fallback
    : (SHOWTIME_HEROES[hero] || SpotlightHero);
  return <Cmp/>;
}
```

**Sizing:** wrap in a 200×132 div with `position: relative; overflow: hidden; border-radius: 8px` (the smaller radius reads better at this scale than the full hero's 14px):

```jsx
<div style={{
  position: "relative",
  width: 200, height: 132,
  borderRadius: 8,
  overflow: "hidden",
  boxShadow: "0 8px 18px rgba(0,0,0,0.18)",
}}>
  <SpotlightHeroDispatcher hero={spotlight.hero} compact/>
</div>
```

**Compact-mode design rules** (so future heroes match the system):

- **One artifact per hero** — the strongest visual mnemonic, alone. No multi-element compositions.
- **One mono eyebrow** at top-left, 7px JetBrains Mono with a pulsing dot. No headline phrase, no subtitle.
- **Stage stays Showtime** but with smaller, contained washes (140×140 / 130×130 instead of 360×360 / 320×320) so the dark cinematic backdrop still reads.
- **≤ 2 looping animations.** Entrance + one rhythmic loop (the artifact's breathe or, for radar-style heroes, the rings/bars). Everything else is one-shot.
- **Particle restraint preserved.** Only #14 Passport keeps sparkles (6 instead of 12).

**What each compact carries** (the strongest mnemonic):

| Hero | Compact keeps | Drops vs. full |
|---|---|---|
| 1 Prices | `$48` + ✓ verified pill | 6 drifting tags, sparkline, footer |
| 2 Tiers | Founder medallion only | Supporter + Premium medallions |
| 3 History | `47` counter + 1 tonight stub | 6 past stubs, year axis |
| 4 Calendar | 4-row grid + 1 stamp on the 14th | 4 stamps, weekday row, header, destinations |
| 5 Share | 1 halftone poster tilted | 2 satellites, share arrow |
| 6 Watchers | `247` + 2 ripple rings | 4 rings → 2; halo simplified |
| 7 Spotify | 10 EQ bars + `27` count | 3 artist tags, divider |
| 8 Following | Bell glyph + ping ring + `RUN THE JEWELS` | Notification stack, presale chip |
| 9 Price Drop | `$120 → $48` + SAVED chip | Sparkline floor, twin arrow trails |
| 10 Setlist | Mini receipt: SETLIST + 5/14 + 3 lines | Full track list, footer, runtime |
| 11 First-Timer | Venue plate + `THE GOTHIC` | All 6 info chips |
| 12 Last Time | Single tilted polaroid | TONIGHT plate, dot trail, copy column |
| 13 Support Act | Opener card only | Headliner card behind |
| 14 Passport (marquee) | 3 stubs fanned + 6 sparkles | 7 stubs → 3, sparkles 12 → 6 |
| 15 Venue Passport | Single `RED ROCKS · 10` stamp | 10-stamp ledger grid, perforation, label column |

**File load:** add `compact-heroes.jsx` after `priority-2-heroes.jsx` in the script order (depends on the same shared helpers: ShowtimeBackdrop, StubGlyph). Compact-keyframes block is idempotent (id-guarded), safe to mount alongside the full heroes.

---

## 6. Real data hookups

Every hero ships with **static placeholder content** for the demo (artist names, venue names, dates, counts). In production, each needs to read from the release/feature payload.

Pattern: each hero should accept a `data` prop the dispatcher passes through. Concrete fields per hero:

| Hero | Data fields |
|---|---|
| `following` | `artistName`, `artistArt` (riso style), `venueName`, `cityName`, `date`, `presaleAt` |
| `price-drop` | `oldPrice`, `newPrice`, `savedAmount`, `artistName`, `watchDays`, `sparklinePoints` |
| `setlist` | `tracks: [{n, name, dur, debut}]`, `likelyCount`, `totalTracks`, `estimatedRuntime` |
| `first-timer` | `venueName`, `infoChips: [{label, accent}]` (paired left/right) |
| `last-time` | `artistName`, `cityName`, `visits: [{date, venue, current?}]`, `lastVisitArt` |
| `support-act` | `headliner: {band, time, art}`, `opener: {band, time, art, followerCount}` |
| `venue-passport` | `venueName`, `cityName`, `nightCount`, `firstVisitYear`, `stampLedger: [{accent, glyph}]` |
| `passport` | `userStubs: [{venue, date, accent, glyph, current?}]`, `nightsCount` |
| `tiers` | (none — pricing is canonical, no per-user state) |
| `history` | `userStubs: [...]`, `nightsKeptCount` |
| `calendar` | `showDates: [{date, accent, glyph, current?}]`, `month`, `year` |
| `share` | `posters: [{band, venue, palette, style}]` |
| `watchers` | `watchingNowCount` |
| `spotify` | `importedCount`, `artists: [{name, accent}]` |
| `prices` | `verifiedPrice`, `submissions: [{val, src, accent}]`, `reportCount`, `reportWindowDays` |

Right now everything is inline — engineering should refactor each component to accept these as props with the current strings as defaults so the demo keeps working.

---

## 7. Reduced motion

**Deferred.** None of these honour `prefers-reduced-motion: reduce` yet. When implemented, the cheapest pattern is to pin every animation to its final frame in a media query:

```css
@media (prefers-reduced-motion: reduce) {
  [class*="Showtime"] *,
  [class*="-hero"] * {
    animation-duration: 0.01ms !important;
    animation-delay: -10s !important;
    animation-iteration-count: 1 !important;
  }
}
```

This snaps every hero straight to its rest pose. Not ideal (loses the moment) but correct.

---

## 8. Performance notes

Heaviest scenes:

- **Passport (#14)** — 12 sparkles + 7 stubs dealing in + breathe. **The only one with sparkles** by design.
- **Watchers (#6)** — 4 ripple rings on infinite loop.
- **Prices (#1)** — 6 price-tag drift animations on infinite loop.
- **Spotify (#7)** — 14 EQ bars on infinite alternate loop.
- **First-Timer (#11)** — 6 chip deal-ins + plate.
- **Venue Passport (#15)** — 10 mini-stamp ink-ins (one-shot).

All transforms are GPU-composited (translate / scale / rotate / opacity). No layout thrash. Soak-tested at 60fps in Chrome on a dev laptop; budget on mobile should be similar to the existing `map` hero.

**Concurrent heroes on one page** (e.g. a release-notes archive showing several): keep it to ≤ 3 on screen. Visibility-based pause (IntersectionObserver → `animation-play-state: paused`) is a sensible optimization if pages have more.

---

## 9. Open product questions

Stashed here so they don't get lost:

1. **Watcher count** — `"247"` is a stand-in. Hard-code a feel-good number or aggregate?
2. **Spotify import count** — `"27"` is a stand-in. Real number from import?
3. **Price-drop dollar values** — `$120 → $48 (saved $72)` placeholder. Real numbers per release.
4. **Setlist debut markers** — currently star-flagged "DEBUT?". Source: setlist.fm scrape? Or our own heuristic? "DEBUT?" with the question-mark is intentional uncertainty.
5. **Last-Time polaroid art** — currently a hard-coded riso treatment. Should it be the artist's identity-art, or always abstract?
6. **Founder badge "001"** — placeholder. Should marketing animations show the user's actual serial?

---

## 10. What's still moving

Per `CLAUDE.md` project state (as of May 22, 2026):

- Heroes for #1–#7 and #14 are **locked** (priority-1 batch).
- Heroes for #8–#13 and #15 are **shipped here** (priority-2 batch) and ready for code review.
- Passport pair direction (stamps vs constellation) decision still open per the original README — current implementation uses **stamps** for #14 (`PassportShowtimeStubs`) and **a single oversized card** for #15 (`VenuePassportShowtime`). The asymmetry is intentional: #14 is the marquee (sparkles, 7 stubs); #15 is the ledger (no sparkles, one card with a 10-stamp grid inside).
