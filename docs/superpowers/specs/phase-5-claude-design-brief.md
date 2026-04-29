# Concert Crawl — Phase 5 Design Brief for Claude Design

**Prepared:** 2026-04-28  
**Recipient:** Claude Design  
**Purpose:** All inputs needed to author Phase 5 hi-fi mocks (consumer calendar UI)

---

## Product Summary

Concert Crawl is a concert calendar for Denver, CO. It crawls venue websites daily and presents an accurate, filterable, searchable event listing. The core value is the data — if crawls fail, the product has nothing to show.

**Target user:** Anyone in Denver who goes to live music. Not a niche audiophile product — built for the casual gig-goer through to the obsessive.

---

## Brand Voice

**Sleek and stylish, but with odd humor.** The app should feel like your favorite concert buddy — comfortable, occasionally sarcastic, never corporate. It knows its stuff but doesn't take itself too seriously.

- Copy should be direct and a little cheeky
- Empty states are an opportunity, not a failure
- Avoid generic SaaS language ("Discover amazing events near you!")
- Think: the friend who texts you "you're going to this, no arguments"

---

## Themes

Three themes are implemented. The designer should use **Electric** as the primary design surface (dark, high-contrast, concert-venue feel). **Jade** and **Light** should be validated but are secondary.

### Token Reference

All tokens are applied as CSS custom properties via `data-theme` on the `<html>` element. Token names map 1:1 to CSS vars (`--token-bg`, `--token-signal`, etc.).

| Token           | Electric                 | Jade                    | Light                |
| --------------- | ------------------------ | ----------------------- | -------------------- |
| `bg`            | `#070A1A`                | `#06201F`               | `#FAFCFF`            |
| `bg-elevated`   | `#0E1226`                | `#0A2A28`               | `#FFFFFF`            |
| `surface-1`     | `#11162E`                | `#0E3331`               | `#F2F5FB`            |
| `surface-2`     | `#171D3A`                | `#143E3B`               | `#E8EDF6`            |
| `surface-3`     | `#1F2748`                | `#1A4A47`               | `#DCE3F0`            |
| `fg`            | `#E8F3FF`                | `#E6FFF6`               | `#070A1A`            |
| `fg-muted`      | `#9AA8C7`                | `#8FBFB0`               | `#4A5374`            |
| `fg-subtle`     | `#5A6788`                | `#557A6F`               | `#8A93B0`            |
| `fg-on-accent`  | `#070A1A`                | `#06201F`               | `#FFFFFF`            |
| `border`        | `#1F2748`                | `#1A4A47`               | `#DCE3F0`            |
| `border-strong` | `#2C3661`                | `#2A5C57`               | `#B8C2D6`            |
| `border-focus`  | `#7AE6FF`                | `#1FFFC2`               | `#0080A0`            |
| `signal`        | `#7AE6FF`                | `#1FFFC2`               | `#0080A0`            |
| `signal-muted`  | `#3FA3C2`                | `#15B58A`               | `#4DABC2`            |
| `accent`        | `#FF7BD4`                | `#9B5CFF`               | `#E0297A`            |
| `accent-muted`  | `#B8559A`                | `#6F44B5`               | `#B0205F`            |
| `success`       | `#7BFFB0`                | `#1FFFC2`               | `#1F8A4F`            |
| `warning`       | `#FFD27A`                | `#FFD27A`               | `#B86E00`            |
| `danger`        | `#FF7A8A`                | `#FF7A8A`               | `#C42940`            |
| `focus`         | `#7AE6FF`                | `#1FFFC2`               | `#0080A0`            |
| `overlay-hover` | `rgba(122,230,255,0.08)` | `rgba(31,255,194,0.08)` | `rgba(7,10,26,0.04)` |
| `overlay-press` | `rgba(122,230,255,0.16)` | `rgba(31,255,194,0.16)` | `rgba(7,10,26,0.08)` |
| `scrim`         | `rgba(7,10,26,0.72)`     | `rgba(6,32,31,0.72)`    | `rgba(7,10,26,0.40)` |
| `image-tint`    | `rgba(7,10,26,0.20)`     | `rgba(6,32,31,0.20)`    | `transparent`        |

**Typography:** Inter (all weights). No secondary typeface.  
**Component library:** shadcn/ui (Radix primitives, CSS variable theming).

---

## Geographic Scope

**Denver, CO only.** No multi-city support in Phase 5. All timezone display is Mountain Time. No geolocation prompt — city is hardcoded.

---

## Auth Model

**Two phases:**

| Phase                  | Behavior                                                                                                         |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Private beta (current) | Auth-gated — sign-in wall before any content                                                                     |
| Public launch          | Anonymous-first — browse freely; auth only required for personalized features (save events, notifications, etc.) |

Design should account for both states. The anonymous browse experience is the primary Phase 5 surface. Include a contextual "Sign up" nudge when a user attempts a personalized action (e.g. favoriting a show).

---

## Image Strategy

**Now:** Hotlink artist/venue images directly from source URLs. Apply `image-tint` overlay to blend images into the active theme.

**Placeholder:** When no image URL is available, render a tasteful text/icon placeholder (venue name initial or music icon). Never leave a broken `<img>` visible.

**Aspect ratio:** Designer's call — whatever reads best across 320px → desktop. Consistency across cards matters more than a specific ratio.

**Future (post-launch WOW feature):** Generate unique venue images via Claude AI. This will be a significant differentiator — the hero slot and venue profile pages should be designed with a rich, full-bleed image in mind.

---

## Filter Taxonomy

Filters available from the spec:

- **Artist** — text search
- **Venue** — dropdown (6 venues at launch, growing)
- **Date** — date picker / range
- **Price** — min/max range
- **Genre** — multi-select

> **Note on genre data:** Genre is stored as `text[]` on the events table but is not yet reliably populated by the crawler. Design should include genre filters, but expect the field to be sparse at launch. Treat empty genre gracefully (omit the filter chip, don't show "Unknown").

---

## Browse Page — "Tonight" Hero Treatment

**Current implementation:** Hybrid approach.

- The **first event in the "Tonight" section** is rendered with a promoted card (larger, full-bleed image, prominent CTA).
- Remaining tonight events render as standard cards.
- No editorial curation required — first event by show time wins.

**Future enhancement (Phase 6+):** Hero slot becomes engagement-driven. Track saves, ticket clicks, and shares per event. The "Tonight" event with highest engagement becomes the hero, surfaced as **"Community Pick"** or **"Fan Favorite Tonight"**. Design the hero slot to accommodate this label/badge in the future.

If no events exist for tonight, the hero slot is omitted entirely — fall through to the next available date group.

---

## Performance Constraints

- **Mobile baseline:** 320px minimum width. Mobile-first layout expansion.
- **3G tolerance:** Best-effort — reasonable skeleton/loading states, but 3G is not the primary optimization target.
- **Reduced motion:** Nice-to-have — respect `prefers-reduced-motion` where animations exist, but not required for Phase 5.
- **Pagination:** **Load-more button** (not infinite scroll, not traditional pagination). Initial render is fully indexable. More events load on explicit user action.
- **Images:** Lazy-load all event/artist images. Show placeholder until loaded.

---

## Empty + Edge States

### Zero shows for selected date

**Copy:** "No shows tonight, grandpa." (or variant matching selected date — "No shows this Friday, grandpa.")  
**Action:** Nudge toward a different date. The surrounding UI should already surface upcoming shows — no separate fallback list needed.

### Crawler stale (data > X hours old)

**For users:** No freshness warning. Keep the browse experience clean.  
**For admins:** Surface stale data warnings in the admin dashboard only.

### No filter results

Brief empty state + clear filters CTA. Keep it dry and a little cheeky — consistent with brand voice.

### Geolocation denied

Not applicable in Phase 5. Denver is hardcoded. Geolocation is a post-launch feature.

---

## Sample Event Data

Pulled from local DB (2026-04-28). All events are Red Rocks Amphitheatre — other venues (Mission Ballroom, Fillmore, Ogden, Gothic, Bluebird) are seeded and will populate as crawls run. Price and genre fields are sparsely populated currently.

```json
[
  {
    "title": "Lewis Capaldi",
    "artist": "Lewis Capaldi",
    "date": "2026-04-28",
    "show_time": "19:30",
    "venue": "Red Rocks Amphitheatre"
  },
  {
    "title": "Electric Callboy: Tanzneid World Tour",
    "artist": "Electric Callboy",
    "date": "2026-04-30",
    "show_time": "19:00",
    "venue": "Red Rocks Amphitheatre"
  },
  {
    "title": "Two Friends",
    "artist": "Two Friends",
    "date": "2026-05-01",
    "show_time": "19:00",
    "venue": "Red Rocks Amphitheatre"
  },
  {
    "title": "Jason Isbell and the 400 Unit",
    "artist": "Jason Isbell and the 400 Unit",
    "date": "2026-05-02",
    "show_time": "19:00",
    "venue": "Red Rocks Amphitheatre"
  },
  {
    "title": "Puscifer",
    "artist": "Puscifer",
    "date": "2026-05-03",
    "show_time": "19:30",
    "venue": "Red Rocks Amphitheatre"
  },
  {
    "title": "David Guetta",
    "artist": "David Guetta",
    "date": "2026-05-05",
    "show_time": "20:00",
    "venue": "Red Rocks Amphitheatre"
  },
  {
    "title": "Bright Eyes – 21 Years of Wide Awake & Digital Ash",
    "artist": "Bright Eyes",
    "date": "2026-05-06",
    "show_time": "19:00",
    "venue": "Red Rocks Amphitheatre"
  },
  {
    "title": "Alejandro Fernández: de Rey a Rey",
    "artist": "Alejandro Fernández",
    "date": "2026-05-07",
    "show_time": "20:00",
    "venue": "Red Rocks Amphitheatre"
  },
  {
    "title": "Cloonee",
    "artist": "Cloonee",
    "date": "2026-05-09",
    "show_time": "18:30",
    "venue": "Red Rocks Amphitheatre"
  },
  {
    "title": "Hippie Sabotage",
    "artist": "Hippie Sabotage",
    "date": "2026-05-10",
    "show_time": "19:00",
    "venue": "Red Rocks Amphitheatre"
  },
  {
    "title": "YUNGBLUD: IDOLS – THE WORLD TOUR",
    "artist": "YUNGBLUD",
    "date": "2026-05-11",
    "show_time": "20:00",
    "venue": "Red Rocks Amphitheatre"
  },
  {
    "title": "Paul Simon",
    "artist": "Paul Simon",
    "date": "2026-06-12",
    "show_time": "20:00",
    "venue": "Red Rocks Amphitheatre"
  },
  {
    "title": "Rod Stewart: One Last Time",
    "artist": "Rod Stewart",
    "date": "2026-06-15",
    "show_time": "19:30",
    "venue": "Red Rocks Amphitheatre"
  },
  {
    "title": "Amyl and The Sniffers",
    "artist": "Amyl and The Sniffers",
    "date": "2026-06-17",
    "show_time": "20:00",
    "venue": "Red Rocks Amphitheatre"
  },
  {
    "title": "Louis Tomlinson: How Did We Get Here? World Tour",
    "artist": "Louis Tomlinson",
    "date": "2026-06-19",
    "show_time": "19:00",
    "venue": "Red Rocks Amphitheatre"
  }
]
```

**Venues that will be represented at launch:**

- Red Rocks Amphitheatre (~9,525 cap, Morrison CO — outdoor, iconic)
- Mission Ballroom (~3,950 cap, RiNo)
- Fillmore Auditorium (~3,500 cap, Capitol Hill)
- Ogden Theatre (~1,600 cap, Capitol Hill)
- Gothic Theatre (~1,000 cap, Englewood)
- Bluebird Theater (~550 cap, Capitol Hill)

---

## Key Screens Needed

Based on the Phase 5 scope, hi-fi mocks are needed for:

1. **Browse / Home** — tonight hero, date-grouped event list, load-more, filter bar
2. **Event detail** — full event info, ticket CTA, venue info, related events
3. **Venue profile** — venue info, upcoming shows list (designed for future Claude-generated imagery)
4. **Search / filter results** — filtered list view, active filter chips, empty state
5. **Empty state** — "No shows tonight, grandpa." treatment
6. **Auth gate** (private beta only) — sign-in wall
7. **Anonymous nudge** — contextual sign-up prompt when attempting personalized action

---

## Out of Scope for Phase 5

- User profile / saved events UI (Phase 6+)
- Social features (Phase 7+)
- Admin UI (already implemented)
- Multi-city support
- Geolocation
- "Community Pick" engagement hero (Phase 6+)
- Claude-generated venue imagery (post-launch)
