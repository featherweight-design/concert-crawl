# Handoff · Concert History (Passport)

**First Supporter-gated feature** ($2/mo). Three surfaces:

1. **"I'm going!" CTA** — a second action alongside Watch on Event Detail (and `md` on event cards). The button is shaped like a ticket-stub; tapping it fills the stub in the show's per-show accent and snaps a glyph into the center, so the button visually equals the stamp it will become in History. States: `default` · `going` · `past-yes` (in history) · `past-no` (didn't make it).
2. **Watching nudge** — inline banner attached to a Watching row when the show date is ≤7 days away **and** the user hasn't marked Going. One Yes/Not me/Dismiss, then never asks again. We don't do a post-show "did you go?" — asking before is honest, asking after is interrogation.
3. **Concert History page** — Supporter-only keepsake list sourced from `goingMarkedAt`. Lives under the renamed **"My shows"** top-level destination, alongside the existing Watching list (`My shows → Watching · History`). The top-level rename avoids the _Watching > Watching > History_ redundancy from earlier iterations. Deep-link from Profile too. Reverse-chrono buckets, stat hero, calendar-export + Passport teaser pinned at the bottom.

Stretch:

4. **Passport card** — shareable summary, redesigned as a **stamp book**. Stat band on top, wall of per-show passport stamps below (each one a real night you went to). Compact (320×500, 3×3 = 9 stamps) for in-app + sidebar; full (1080×1080, 4×4 = 16 stamps) for social share, with `+ N more` overflow tag.

---

## Files

| File                                                                                              | Role                                                                                                                                                                                                        |
| ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Concert History.html`                                                                            | Canvas — 13 sections (Live tweaks · Going states · sizes · Event Detail Going+eye · Browse eye-only · Watching nudge · History state matrix · Locked · Density · Themes · Desktop · Row anatomy · Passport) |
| `history-data.jsx`                                                                                | Sample shows, stat helpers (`h_stats`), bucket helpers (`h_groupBuckets`), per-show accent + glyph hash (`h_accentFor` / `h_glyphFor`), 7-day-window predicate (`h_isInNudgeWindow`)                        |
| `history-screens.jsx`                                                                             | `<HistoryItem>`, `<StubStamp>`, `<HistoryHeader>`, `<HistorySection>`, `<SaveCalendarRow>`, `<WatchingHistoryTabs>`                                                                                         |
| `history-routes.jsx`                                                                              | `<HistoryRoute>` mobile · `<HistoryRouteDesktop>` · `<HistoryLocked>` · `<HistoryEmpty>` · `<PassportCard>` · `<PassportTeaser>` · `CCMark` (verbatim)                                                      |
| `going-cta.jsx`                                                                                   | `<GoingButton>`, `<GoingNudge>`, `<EventDetailCTABlock>` (Going + eye), `<WatchingEye>`, `<WatchingPill>` (legacy), `<WatchingRowWithNudge>`, `<HistoryStampInline>`                                        |
| `identity-art.jsx`, `theme-context.jsx`, `ios-frame.jsx`, `design-canvas.jsx`, `tweaks-panel.jsx` | Shared deps copied from `design_handoff_watching/`                                                                                                                                                          |

---

## Source-of-truth rules

- **Watching ≠ attendance.** Watching is a tracking action (price + reminders). It does **not** imply the user went.
- **A show enters History when** `goingMarkedAt != null && dateISO < now`. Server-authoritative.
- The Watching nudge is the only place we ask "Still going?" — fired once, dismiss is persisted in localStorage (key: `cc-nudge-dismissed`, value: `{showId: 'going'|'declined'|'dismissed'}`).
- A retroactive "I went, actually" affordance lives on a past Event Detail page (`<GoingPostShowState>`) as a quiet escape hatch — not a prompt.

---

## Visual system

- **Stub stamp** is the recurring unit. Sizes: 24/28/32 in History rows; 28/32/38 inside the Going-CTA button; 36 in the empty-state badge; 32 in the Passport teaser; 100×92 (compact) or 280×170 (share) inside the Passport card.
- **Stamp determination — deterministic from the artist name:**
  - **Accent** — `h_accentFor(name)` runs FNV-1a over the bytes, mods against the 7-color brand set (`#7AE6FF / #FF7BD4 / #FFE36B / #A075FF / #C9F26E / #FFB838 / #5DD4D6`). Same artist → same accent forever.
  - **Glyph** — `h_glyphFor(name)` runs djb2, mods against `["star", "diamond", "ring", "triangle"]`.
  - The two hashes are different functions so accent and glyph vary independently. End result: every artist has a stable, collectible identity. "Geese" is always cyan-triangle; "Phoebe Bridgers" is always gold-star.
- **Passport stamp (share-only)** is the full version — wide 280×170 stamp showing MONTH/DAY in big Inter 900, YEAR + ARTIST + VENUE + GENRE on the right, oversized accent glyph bottom-right. Slight per-stamp rotation (deterministic, ±4° from show-id hash) so the page reads stamped, not aligned.
- **Type:** Inter (UI) + JetBrains Mono (data / labels / status). No third family.
- **Tokens:** every color reads from `var(--*)` defined in `theme-context.jsx`. Verified across Electric · Jade · Light.
- **Primary CTA color:** `var(--signal)` (per CLAUDE.md). The `+ Supporter` chip uses `var(--accent)` since that's the brand-presence color the feature lives under.

---

## Component contract

### Event Detail CTA hierarchy

- **Going + eye, single row, both breakpoints.** Going (`lg`, full-width, primary stub) fills the available space; `<WatchingEye>` is a 52×52 outlined-accent square with an eye icon and no text — mirrors the affordance the live mobile app already uses for Watch.
- One mono support line below ("Going saves the night · Watch tracks the price." → "We'll add this to your history.").
- Desktop uses the **same** `EventDetailCTABlock` component (just passed `variant="desktop"`) sitting in the right-rail sidebar; the parent container width gives Going more room on desktop without changing the layout.
- `<GoingButton fullWidth>` is the prop that makes the stub button fill its container; default (inline-flex auto-width) is unchanged for inline list uses.

### Browse stays eye-only — no Going on cards

- We deliberately do **not** add Going to Browse rows. Reasoning:
  - Browse is for triage. The eye (soft "remind me") matches that intent.
  - Going is a commitment. It needs the date / venue / ticket-source context that lives on Event Detail.
  - The live app already removed the Watch _text_ from Browse mobile for horizontal space — stacking a second CTA reverses that decision.
- Browse rows: identity art · meta · price · eye. That's the pattern. (See artboard `b-row-eye` in the canvas.)

### `<WatchingEye watching onChange size>`

- The Event Detail / Browse Watch affordance. Outlined accent square with an eye icon; toggles to filled-accent eye when watching. Three sizes (sm 36 / md 44 / lg 52).
- aria-pressed reflects watching state. Single tap to commit, single tap to release. No confirm.

### `<WatchingPill watching onChange size>` (legacy — desktop browse only)

- Outlined `+ Watch this show` → filled `✓ Watching` pill in `var(--accent)`. **Not used on Event Detail anymore** — the eye replaces it there. Kept exported in case a future desktop-browse list view wants the text affordance back.

### `<GoingButton show state size onChange>`

- `state`: `"default" | "going" | "past-yes" | "past-no"`
- `size`: `"sm" | "md" | "lg"` (default `"lg"`)
- `show`: `{ artist, dateISO, ... }` — used for accent/glyph hash + past-state label
- Renders a ticket-stub-shaped button; perforation lit + glyph in accent when "going". `past-*` are disabled.
- Pair with `<EventDetailCTABlock>` for the Watch + Going row on Event Detail.

### `<GoingNudge show onYes onDecline onDismiss>`

- Inline banner. Render under a Watching row when `h_isInNudgeWindow(show)` returns true.
- One Yes → commits, one Not me → silent decline, one × → dismiss. All three persist; never re-fires.
- Copy: _"Still going? In 4 days. Mark it so it lands in your history."_

### `<HistoryRoute shows density locked themeKey>` / `<HistoryRouteDesktop>`

- `locked` swaps the body for `<HistoryLocked>` (paywall).
- `shows.length === 0` swaps for `<HistoryEmpty>`.
- Otherwise: stat header → bucket list → calendar-export → Passport teaser.

### `<PassportCard stats compact handle>`

- `compact`: 300×440 sidebar/teaser preview.
- Non-compact: 1080×1080 share-ready (scales the same inner layout by 3.6×).
- All numbers come from `h_stats(shows)`.

---

## Data shape

```ts
type HistoryShow = {
  id: string
  artist: string
  venue: string
  neighborhood?: string
  dateISO: string // when the show was
  dateLabel: string // pre-formatted, e.g. "Mon, Oct 20"
  showTime?: string // pre-formatted, e.g. "8:00 PM"
  priceFinal?: number // last face price observed
  genre: string // single word — drives "top genre"
  goingMarkedAt: string | null // ISO timestamp of the I'm going! tap
}
```

`h_stats(shows)` returns `{ nights, venues, artists, topGenre, topVenue, first, last, totalSpent }` — single source of truth for the stat header, Passport card, and any future surface that wants a summary.

---

## Open questions for eng

1. **Where does the nudge dismiss live?** Local-only is fine for v1 (`localStorage`), but if the user switches devices it'll re-ask once per device. Confirm whether to sync via the user record.
2. **Calendar export format.** Spec says `.ics` feed (iCal subscribe URL — always live), but we can also offer point-in-time `.ics` download. The button affords both; eng calls which one launches first.
3. **Retroactive "I went, actually" toggle on past Event Detail** — out of v1, sketched as `<GoingPostShowState>`. Worth confirming we _don't_ surface this anywhere prominently (we don't want it to feel like a post-show survey).
4. **Free-tier preview of stat numbers.** Today the locked state hides everything. Worth A/B-ing showing `?? nights · ?? venues` with the actual count behind the blur — read pressure vs. honesty trade.
5. **Passport download.** Full 1080 mode renders as DOM; eng can rasterize to PNG via the existing `html-to-image` setup the share cards use, or we can hand off SVG. Confirm path.

---

## Voice (consistent across surfaces)

- **CTA:** "I'm going!" (with the exclamation — it's a commitment, not a checkbox).
- **Confirmed state:** "Going" (just the verb — the stub fill is the loud part).
- **History stamp on past Event Detail:** "You went · Oct 14, 2026".
- **Nudge:** "Still going? In 4 days." / "Mark it so it lands in your history."
- **Empty state:** _"Nothing's behind you yet."_
- **Locked headline:** _"Keep the nights."_
- **Locked footer:** _"Free tier keeps everything else. No paywalls in the way of seeing shows."_

Matches the Hybrid empty-state and Sour-Patch monetization voice already locked in.
