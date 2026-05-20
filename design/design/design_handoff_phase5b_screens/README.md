# Concert Crawl — Phase 5b Design Handoff

## Overview

This handoff covers the **consumer-facing UI for Concert Crawl's private beta** — a curated concert discovery app for Denver/Front Range. It includes:

1. **Auth gate** (landing page, waitlist modal, invite-code entry)
2. **Browse / Home** (event discovery — list + calendar views)
3. **Search** (typed search with empty / typing / results / no-results states)
4. **Event Detail** (show page)
5. **Venue Profile** (venue page)
6. **Filter system** (When / Where / How much / Vibe — bottom sheet on mobile, popover on desktop)

All screens cover **mobile (375px iPhone frame)** and **desktop (≥1024px)**.

---

## About the Design Files

**The HTML files in this bundle are design references, not production code.** They were authored as in-browser React prototypes (JSX transpiled by Babel-standalone at runtime) so we could iterate quickly on look-and-feel, theming, and interactions.

Your job is to **recreate these designs in Concert Crawl's existing codebase** using its established framework, component primitives, and styling conventions — not to ship the HTML directly. If no consumer frontend exists yet, choose the most appropriate framework for the project (Next.js + Tailwind is a reasonable default given the admin app conventions) and build there.

The `.jsx` files are the source of truth for **structure, copy, spacing, and component breakdown**. The `.html` files load them and host the iOS/desktop frames around them.

---

## Fidelity

**Hi-fi.** Pixel-perfect with finalized:

- Color tokens (3 themes — see Design Tokens below)
- Typography scale (Inter + JetBrains Mono, weights and sizes locked)
- Spacing, radii, shadows
- Hover/active/focus states
- Empty / loading / error / no-results states
- Animation timings and easings
- Copy (every string is final unless flagged)

Recreate pixel-perfectly using the codebase's existing libraries (Tailwind, shadcn, etc.). Lift exact hex values and spacing from the JSX.

---

## File Map

### HTML preview pages (open these to see the designs)

| File                  | What it shows                                                                                                                |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `Auth Gate.html`      | Landing page, waitlist modal, invite-code entry — all 9 code-entry states. Mobile + desktop side-by-side on a design canvas. |
| `Browse Home.html`    | Mobile Browse — list view, cal view, hero card, event cards, filter pills, bottom nav.                                       |
| `Browse Desktop.html` | Desktop Browse — single-column list/cal, filter chips with popovers, theme switcher, click-through to detail page.           |
| `Detail Screens.html` | Mobile event detail + venue profile.                                                                                         |
| `Search Mobile.html`  | Mobile search — empty, typing, results, no-results.                                                                          |
| `Search Desktop.html` | Desktop search modal/route mirroring mobile.                                                                                 |

### Source JSX (the actual components)

| File                  | Exports                                                                                                                   |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `theme-context.jsx`   | `ThemeProvider`, `ThemeSwitcher`, `useThemeState`, `CC_THEMES` (token sets)                                               |
| `landing-screens.jsx` | `LandingMobile`, `LandingDesktop`, `WaitlistModal`                                                                        |
| `code-entry.jsx`      | `CodeEntryMobile`, `CodeEntryDesktop` (9 states: idle, focused, partial, full, validating, valid, invalid, expired, used) |
| `browse-home.jsx`     | `BrowseHomeMobile`, shared cards (`EventCard`, `HeroCard`, `WeekStrip`)                                                   |
| `browse-desktop.jsx`  | `BrowseDesktop`                                                                                                           |
| `detail-screens.jsx`  | `EventDetailMobile`, `VenueProfileMobile`                                                                                 |
| `detail-desktop.jsx`  | `EventDetailDesktop`, `VenueProfileDesktop`                                                                               |
| `search-mobile.jsx`   | `SearchMobile`                                                                                                            |
| `search-desktop.jsx`  | `SearchDesktop`                                                                                                           |
| `filter-system.jsx`   | `FILTER_DEFS`, `applyFilters`, `FilterSheet` (mobile bottom sheet), `FilterPopover` (desktop), `NoResultsState`           |
| `gig-poster.jsx`      | `GigPosterStack` — animated screen-print poster pile (used on landing)                                                    |
| `ios-frame.jsx`       | iOS device chrome wrapper                                                                                                 |
| `design-canvas.jsx`   | Pan/zoom canvas used by the .html preview pages — **do not port, reference only**                                         |
| `primitives.jsx`      | Low-level primitives (Button, Chip, etc.)                                                                                 |

---

## Design Tokens

Three themes ship with the app: **Electric (primary, dark)**, **Jade (dark, alternate)**, **Light (light mode)**. All consumer screens read tokens via CSS custom properties (`var(--bg)`, `var(--fg)`, etc.) so theme switching is a one-line wrapper change.

The full token tables live in `theme-context.jsx`. Excerpt for the **primary Electric theme**:

```
--bg:            #070A1A   (deep blue-black)
--bg-elevated:   #0E1226
--surface-1:     #11162E
--surface-2:     #171D3A
--surface-3:     #1F2748
--fg:            #E8F3FF
--fg-muted:      #9AA8C7
--fg-subtle:     #5A6788
--fg-on-accent:  #070A1A
--border:        #1F2748
--border-strong: #2C3661
--signal:        #7AE6FF   (cyan — primary accent, CTAs, active states)
--accent:        #FF7BD4   (hot pink — secondary accent, hearts, badges)
--success:       #7BFFB0
--warning:       #FFD27A
--danger:        #FF7A8A
```

**Implementation note:** wire tokens up as Tailwind theme extensions (or CSS vars on `:root` with theme classes on `<html>`). All three themes must be available; theme persists in localStorage as `cc-theme`.

### Typography

- **Inter** — UI text, headings, body. Weights used: 400, 500, 600, 700, 800, 900.
- **JetBrains Mono** — small caps labels, theme switcher, code/keyboard hints. Weight 700 for emphasis.
- Letter-spacing: most headings use `-0.02em` to `-0.04em` (tight), monospace small caps use `+0.04em` to `+0.08em`.
- `text-wrap: pretty` is used widely on body copy.

### Spacing

Loose 4px grid: 4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 56 / 80. Cards typically `padding: 16px` (mobile) / `24px` (desktop). Section gaps `24–32px`.

### Radii

- Cards: `12px` (mobile) / `16px` (desktop)
- Pills / chips / buttons: `999px` (full)
- Inputs: `10–12px`
- Modals: `20px` top corners (mobile sheet), `16px` (desktop modal)

### Shadows

Mostly tokenless — shadows used sparingly. Common pattern: `0 6px 20px rgba(0,0,0,0.35)` on floating elements like the theme switcher.

---

## Screens & Behavior

### 1. Auth Gate (`Auth Gate.html`)

Three sub-screens, all gated before any consumer content. **The whole consumer app sits behind this** during private beta.

#### Landing page (`landing-screens.jsx`)

- **Hero**: "CONCERT CRAWL" wordmark, tagline, two CTAs — "I have a code" → code entry, "Join waitlist" → waitlist modal.
- **GigPosterStack**: animated screen-print concert posters that pull off a pile on hover/click. Decorative, on desktop only.
- **Mobile**: posters compressed to a single hero illustration; CTAs stacked.
- **Desktop**: split layout — copy left, poster stack right.

#### Waitlist modal (`WaitlistModal`)

- Email input → submit → success state ("You're on the list").
- Validates email format, shows inline error.
- Modal dismissible via Esc, click-outside, or × button.

#### Invite-code entry (`code-entry.jsx`)

6-digit code input with 9 distinct states. Each state has its own visual treatment:

| State        | Trigger                 | Treatment                                                      |
| ------------ | ----------------------- | -------------------------------------------------------------- |
| `idle`       | Initial load            | Empty boxes, subtle placeholder                                |
| `focused`    | Input focused, no chars | Cursor pulse on first slot                                     |
| `partial`    | 1–5 chars typed         | Filled slots show char, remaining are empty                    |
| `full`       | 6 chars typed           | All slots filled, "Continue" button enabled                    |
| `validating` | Submitting              | Inline spinner, button shows "Checking…"                       |
| `valid`      | Accepted                | Green pulse, success copy, redirect after 600ms                |
| `invalid`    | Rejected                | Red shake animation, "That code didn't work. Double-check it?" |
| `expired`    | Code expired            | Amber, "This code expired. Want to join the waitlist?" CTA     |
| `used`       | Already redeemed        | Amber, "This code has been used."                              |

Layout is a 6-slot input row with monospace digits. Mobile uses a numeric keypad (system).

---

### 2. Browse / Home (`Browse Home.html`, `Browse Desktop.html`)

The primary discovery surface. Two view modes — **List** (default) and **Cal** (week strip + day-grouped events).

#### Mobile (`browse-home.jsx`)

- **Top app bar**: "Concert Crawl" wordmark left, search icon + heart icon right.
- **View toggle**: segmented control under the app bar — `List | Cal`.
- **Filter pills**: 4 horizontal-scrolling chips below the toggle — `When`, `Where`, `How much`, `Vibe`. Tapping opens the filter bottom sheet.
- **Hero card**: top-billed featured event (`HeroCard` component) — large poster, headliner, date, venue.
- **Event cards**: scrollable list, grouped by date (`Today`, `Tomorrow`, `Sat Apr 30`, etc.). Each card: poster (left, 88×88), title + supporting acts, venue, date, price tier (`$`, `$$`, `$$$`), heart button (right).
- **Bottom nav**: Browse / Search / Saved / Profile (4 tabs).
- **Cal view variant**: replaces the list with a 7-day week strip (Mon–Sun) of the current week. Each day shows a dot if events exist. Tapping a day filters to that day. Empty days show **"No shows tonight, grandpa."** copy with `text-align: center` and muted styling.

#### Desktop (`browse-desktop.jsx`)

- **Single column**, ~720px max-width centered. Same content hierarchy as mobile but with desktop-scale typography and a top nav instead of bottom nav.
- **Filter chips → popovers**: clicking a chip opens an anchored popover under the chip with the same options as the mobile sheet.
- **Click-through**: cards route to `/events/:id` (we removed the old modal pattern).
- **Theme switcher**: floating control top-right.

#### Filter system (`filter-system.jsx`)

Single-select per dimension. Today is hard-coded as `2026-04-28` for the demo data.

- **When**: Tonight / This weekend / This week / Next week
- **Where**: Hard-coded venue list (Red Rocks, Gothic, Bluebird, Ogden, Mission, Larimer, Cervantes, Globe Hall) — **wire to your real venue table**
- **How much**: Free / Cheap ($) / Moderate ($$) / Big-ticket ($$$)
- **Vibe**: Rock / Indie / Hip-Hop / Electronic / Country / Jazz / Pop / Metal — **wire to your real genre/tag system**

When any filter is active:

- The chip turns `--signal` color and shows the selected option label inline.
- A `× Clear` dashed pill appears at the end of the chip row.
- If filters return zero events, the list is replaced by `<NoResultsState>` — text-only "Crickets." headline, supporting copy, and a "Clear all filters" button.

---

### 3. Search (`Search Mobile.html`, `Search Desktop.html`)

Dedicated route, accessible from the search icon in the app bar. Searches across event titles, artists, and venues.

States:

- **Empty** (no query): suggested searches + recent searches sections (use localStorage for recents, key `cc-recent-searches`, max 5).
- **Typing** (1–2 chars): inline hint "Keep typing…"
- **Results**: same event-card list pattern as Browse, grouped by match type (Events, Artists, Venues).
- **No-results**: same `NoResultsState` component as Browse with adjusted copy.

Mobile: full-screen route. Desktop: command-palette-style modal (see `search-desktop.jsx`).

---

### 4. Event Detail (`Detail Screens.html`)

#### Mobile (`detail-screens.jsx → EventDetailMobile`)

- **Hero**: poster image full-bleed at top, with `--scrim` gradient overlay so the back button + heart stay legible.
- **Title block**: artist name (display weight 900), supporting acts, venue + date inline with `JetBrains Mono` small caps.
- **Info grid**: 2×2 — Doors, Show, Ages, Price.
- **About**: rich-text description.
- **Get tickets** CTA — pill button, `--signal` background, full-width.
- **Related shows**: horizontal-scroll mini-card list.

#### Desktop (`detail-desktop.jsx`)

Two-column layout: poster + info card on left (sticky), description + related on right.

---

### 5. Venue Profile (`Detail Screens.html`)

Mirrors event detail structure but for a venue:

- **Hero**: stylized venue mark (we used a gradient + text treatment as placeholder — **swap for real venue photography when available**).
- **Info**: address, capacity, tagline.
- **Upcoming shows**: vertical list of event cards filtered by venue.

Desktop version mirrors the event-detail desktop layout.

---

## Interactions & Animations

- **Theme switch**: instant, no transition (CSS vars swap).
- **Card hover (desktop)**: `transform: translateY(-2px)`, 120ms `ease-out`.
- **Heart toggle**: scale `1 → 1.2 → 1` over 200ms, color swap to `--accent`.
- **Filter chip activation**: background fades to `--signal` over 120ms.
- **Bottom sheet (mobile filters)**: slides up from bottom, 240ms `cubic-bezier(0.32, 0.72, 0, 1)`. Backdrop fades to `--scrim` over the same duration.
- **Code entry shake (invalid)**: `translateX(±8px)` 4 cycles over 400ms.
- **GigPosterStack pull**: posters animate from a tilted pile to a fan-out on hover. See `gig-poster.jsx` for the spring config.

---

## State Management

Recommended approach (the prototypes do this in-component; production should lift state):

- **Theme**: `useThemeState` hook → localStorage key `cc-theme`.
- **Filters**: lift to a route-level state object `{date, venue, price, vibe}`, sync to URL search params so deep-links work. Use `applyFilters(events, state)` from `filter-system.jsx` as the single source of filtering logic.
- **Saved/hearted shows**: server-side once auth is wired; for the prototypes we use localStorage key `cc-saved-event-ids`.
- **Recent searches**: localStorage key `cc-recent-searches`, max 5 entries.
- **Auth**: invite-code redemption hits backend → JWT/session → all consumer routes gate behind it.

---

## Empty / Error States

- **Browse Cal view, empty day**: "No shows tonight, grandpa." (centered, muted, no illustration).
- **Filter no-results**: "Crickets." headline + "No shows match these filters. Try a wider date range or drop a filter to bring the volume back." + Clear-all button. Text-only — illustration was prototyped (boombox line-art) but pulled for now; revisit in a polish pass.
- **Search no-results**: "Crickets." pattern with adjusted body copy.
- **Network error**: not yet designed — please use a generic toast pattern from the codebase for now.
- **Loading**: not yet designed — use existing skeleton/spinner conventions.

---

## Assets

- **Poster images**: the prototypes use placeholder gradient + text overlays. Wire real poster URLs from your event records.
- **Venue photography**: not yet sourced — placeholder gradient marks in `Detail Screens.html`. Track this for content team.
- **Icons**: inline SVGs, mostly Lucide-style strokes. Replace with the codebase's icon library (Lucide React is a clean drop-in).
- **Fonts**: Inter + JetBrains Mono via Google Fonts. The HTML files load them inline; production should self-host or use the codebase's existing font pipeline.

---

## Out of Scope for Phase 5b (intentionally deferred)

These were discussed but not designed — coming next phase:

- Onboarding flow (post-auth first-time experience)
- User profile / settings screens
- Saved / liked shows list
- Admin UI updates (will be built before next design phase)
- Map view of venues
- Notifications / reminders
- Anonymous nudge sheet (not needed — auth gate covers private beta)

---

## Implementation Checklist

- [ ] Stand up theme system: 3 themes as CSS vars, `cc-theme` localStorage persistence, theme switcher component.
- [ ] Build typography + spacing primitives matching the JSX.
- [ ] Auth gate route + components (Landing, Waitlist modal, Code entry with all 9 states).
- [ ] Browse Home (mobile + desktop), wired to real event data.
- [ ] Filter system — bottom sheet (mobile), popover (desktop), URL state, real venue/genre data.
- [ ] Event Detail page (mobile + desktop), routing from Browse.
- [ ] Venue Profile page (mobile + desktop).
- [ ] Search route — empty / typing / results / no-results, recent searches in localStorage.
- [ ] All empty states wired ("grandpa" + "Crickets.").
- [ ] Cross-browser smoke test on iOS Safari + Chrome Android + desktop Chrome/Safari/Firefox.

---

## Questions / Open Items

- Real event/venue/artist data shape — confirm the API contract and adjust component prop types.
- Stripe checkout flow integration point — design exists for "Get tickets" CTA but the actual checkout sheet is Phase 8.
- Image CDN + sizing strategy for posters and venue photos.
- Analytics hooks — where do we instrument card views, filter use, search queries?

Reach out if anything in the JSX is ambiguous — the components are commented but not exhaustive.
