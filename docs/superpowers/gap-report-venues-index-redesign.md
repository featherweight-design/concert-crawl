# Gap Report — Venues Index Redesign

## IMPLEMENTED (20)

- **VenueIdentityTile** — 72×72 (desktop) / 56×56 (mobile) identity art + monogram chip on every row [apps/web/src/components/consumer/venues-index/VenueIdentityTile.tsx]
- **VenueRow (desktop)** — 5-column grid: tile | name+distance+neighborhood | capacity stat | upcoming stat | chevron [apps/web/src/components/consumer/venues-index/VenueRow.tsx]
- **VenueRow (mobile)** — compact flex row: tile | name+distance+capacity | upcoming+chevron [apps/web/src/components/consumer/venues-index/VenueRow.tsx]
- **VenueFeatureCard (desktop)** — wide horizontal card: 360px art panel + meta column, stripes template, ★ Flagship eyebrow, stats triad, chevron circle [apps/web/src/components/consumer/venues-index/VenueFeatureCard.tsx]
- **VenueFeatureCard (mobile)** — vertical card with full-width art + meta below [apps/web/src/components/consumer/venues-index/VenueFeatureCard.tsx]
- **Type chip on flagship only** — shown on flagship card eyebrow; absent from list rows per spec [apps/web/src/components/consumer/venues-index/VenueFeatureCard.tsx]
- **Stats triad on flagship** — CAPACITY / UPCOMING / DISTANCE with Inter 700 22px values [apps/web/src/components/consumer/venues-index/VenueFeatureCard.tsx]
- **Stripes template on flagship** — uses `templateOverride="stripes"` matching Red Rocks detail page [apps/web/src/components/consumer/venues-index/VenueFeatureCard.tsx]
- **Sort pill (always-on)** — mono "SORT" prefix, 5 options, signals active when non-default [apps/web/src/components/consumer/venues-index/VenueFilterBar.tsx]
- **Capacity filter pill** — 5 tiers: Intimate/Club/Mid-size/Large/Arena; active = signal bg [apps/web/src/components/consumer/venues-index/VenueFilterBar.tsx]
- **Distance filter pill** — 4 buckets: Walking/Nearby/Metro/Day trip; active = signal bg [apps/web/src/components/consumer/venues-index/VenueFilterBar.tsx]
- **× Clear filters button** — dashed, appears only when capacity or distance filter active [apps/web/src/components/consumer/venues-index/VenueFilterBar.tsx]
- **Desktop popover** — FilterPopover anchored under each chip [apps/web/src/components/consumer/venues-index/VenueFilterBar.tsx]
- **Mobile bottom sheet** — FilterSheet with scrim [apps/web/src/components/consumer/venues-index/VenueFilterBar.tsx]
- **Flagship hides when filters active** — `filtersActive = !!capacity || !!distance` [apps/web/src/components/consumer/venues-index/VenuesIndexClient.tsx]
- **Geolocation with LoDo fallback** — browser API on mount, silently falls back to 39.7508/-104.9997 [apps/web/src/components/consumer/venues-index/VenuesIndexClient.tsx]
- **Empty state (Hybrid voice)** — "No venues match." / "Loosen a filter or two and they'll come back." [apps/web/src/components/consumer/venues-index/VenuesIndexClient.tsx]
- **1120px max-width** — widened from 880px to match flagship card [apps/web/src/app/(protected)/venues/page.tsx]
- **DB migration** — neighborhood, featured, lat, lng columns + Denver coordinate seed data [packages/db/migrations/0025_venue_index_fields.sql]
- **Admin form** — neighborhood text input, featured flagship toggle, generate-about returns neighborhood + brand voice (#476) [apps/web/src/components/admin/VenueDetailsClient.tsx, apps/api/src/routes/admin/venues.ts]

## GAPS (0)

None found after 3× design comparison review.

## DEFERRED (3)

- **Mobile navigation changes (Me tab, AppBar search icon)** — reason: explicitly excluded by user before implementation started; separate agent handles this
- **"N within 20 mi of you" geolocation eyebrow** — reason: Open Question #2 in design spec; "N in Denver" fallback is the specified default until geolocation copy is finalized
- **Flagship selection mechanism** — reason: Open Question #3 in design spec; hardcoded on Red Rocks via `featured = true` flag per design intent; algorithmic/editorial approach deferred to future phase
