# Venues Index — Engineering Handoff

Redesign of the bare-bones Venues index ([screenshot](../uploads/pasted-1779232001252-0.png)), pulling the visual vocabulary of the existing Venue Detail page (identity art, monogram chip, type chip, capacity / upcoming mono stats) into the list surface so rows preview what they link into.

## Files

| File | Role |
|---|---|
| `Venues Index.html` | Desktop entry point |
| `Venues Index Mobile.html` | Mobile entry point (402×874 iPhone frame) |
| `venues-index.jsx` | Desktop page + **canonical data, filter defs, formatters**. Exports `VI_VENUES`, `VI_FILTER_DEFS`, `VI_FILTER_KEYS`, `vi_applyFilters`, `vi_chipLabel`, `fmtNum`, `fmtDistance` on `window` so the mobile file reuses them. |
| `venues-index-mobile.jsx` | Mobile page. Pure presentation — all data/logic read from globals set by `venues-index.jsx`. |
| `identity-art.jsx` | Copy of the Phase 7.5 engine. Source of truth lives in `design_handoff_phase7_5_identity_imagery/`. |
| `theme-context.jsx` | Copy of the shared theme system. |
| `ios-frame.jsx` | Device bezel for the mobile shell. |

When wiring this up in the real app, **delete the local copies of `identity-art.jsx`, `theme-context.jsx`, and `ios-frame.jsx`** and import from their canonical locations. Only `venues-index.jsx` and `venues-index-mobile.jsx` are new.

## What was pulled from the Venue Detail page

- **Identity art tile + monogram chip** on every row, sized 72×72 (desktop) / 56×56 (mobile). Same input → same image as the detail hero, so the row tile and the detail page hero are visually the same venue.
- **Type chip** (`Amphitheater`, `Theater`, `Ballroom`, …) — kept on the flagship card eyebrow only; dropped from list rows because most venue names already contained the type ("Bluebird _Theater_", "Mission _Ballroom_").
- **Stats triad** (`CAPACITY` / `UPCOMING` / `DISTANCE`) — identical mono label + Inter 700 22px value pair from the detail page's stats row.
- **Diagonal stripes hero** on the flagship card uses the same `stripes` template the production Red Rocks detail page uses.

## Filter + sort UX

Standardized to the Browse FilterPills pattern (see `browse-desktop.jsx → FilterPillsBD`). Three pill chips:

| Chip | Behavior |
|---|---|
| `Sort` | Always-on. Default `Most upcoming shows`. Reads with a mono "SORT" prefix to signal it's not a clearable filter. |
| `Capacity` | 5 tiers: Intimate (<500) / Club (500–1.5k) / Mid-size (1.5–4k) / Large (4–10k) / Arena (10k+). |
| `Distance` | 4 buckets: Walking (<1mi) / Nearby (<5) / Metro (<15) / Day trip (15+). |

Active chips flip to `var(--signal)` + `var(--fg-on-accent)` text. A dashed `× Clear filters` button appears once any clearable filter is active. Tier definitions are easy to tune in `VI_FILTER_DEFS` once Code has real data on hand.

**Desktop:** anchored popover under each chip (`VI_Popover`).
**Mobile:** bottom sheet with scrim (`VIM_FilterSheet`), rendered with `position: fixed` so it overlays the device bezel.

## Flagship card

Red Rocks gets a wide horizontal card at the top — the same identity art treatment + monogram chip + Inter 800 title + stats triad as the detail page, just compressed into one row. The card is **entirely clickable** (no inner CTA button); a 36×36 chevron in the top-right of the meta column is the click affordance, lighting up signal-color on hover.

**The flagship card hides automatically when any filter is active** — once the user narrows by capacity or distance, Red Rocks drops into the regular row list so the flagship treatment doesn't fight the filter intent.

Flagship designation is currently hardcoded on Red Rocks via a `featured: true` flag on `VI_VENUES`. Worth discussing whether this becomes:
- Editorial ("featured this week") — set by admin
- Algorithmic (most upcoming, most-watched)
- Personalized (nearest with shows the user is watching)

## Navigation conventions (mobile vs. desktop)

**Desktop:** top nav with Browse / Venues / Watching tabs, search bar + user avatar (`H` chip) in the top-right. No bottom nav.

**Mobile:** bottom tab bar with Browse / Venues / Watching / **Me** (4 tabs), search icon (36×36 circle) in the top-right of the AppBar.

**Why no "Me" affordance in the desktop top-right is paired with a "Me" tab on mobile and not considered redundant:** mobile and desktop don't share a profile-entry surface — desktop uses the top-right avatar as its only profile entry (no bottom nav exists), mobile uses the bottom-right Me tab as its only profile entry (the top-right slot is occupied by search). They're parallel single-entry points on their respective surfaces, not duplicates. Search lives in the top-right on both surfaces (as an input on desktop, as an icon button on mobile that would expand into a full search sheet).

If Code adds a desktop bottom nav or a mobile top-right avatar later, revisit this — we'd want to drop the redundant entry point.

## Open questions / things to wire up

1. **Capacity, neighborhood, distance, and upcoming counts are mocked** in `VI_VENUES`. Capacity comes from public knowledge, distance from a downtown Denver centroid. Wire to crawl data + user geolocation before ship.
2. **"13 in Denver" eyebrow** should become something like `13 within 20 mi of you` once we have geolocation, with a fallback when geolocation is denied.
3. **Flagship is hardcoded** on Red Rocks (see above) — pick a mechanism.
4. **Search top-right on mobile** is a placeholder — clicking it should route to the existing Search Mobile screen.
5. **Row click → venue detail page.** Currently rows are styled as `<button>` with no onClick handler. Wire to the venue detail route.

## Voice

Empty state copy ("No venues match." / "Loosen a filter or two and they'll come back.") follows the Hybrid empty state voice from `design_handoff_empty_state/` — playful + clear, brand presence + clear status, not dry/generic.
