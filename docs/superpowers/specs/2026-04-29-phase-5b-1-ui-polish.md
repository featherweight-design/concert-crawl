# Phase 5b-1: UI Polish — Design Spec

**Branch:** `feat/phase-5b-design-polish`
**PR scope:** AppHeader, EventCard, HeroEventCard, Browse layout + BottomNav, EventDetail, VenueProfile
**Design reference:** `design/design_handoff_phase5b_screens/` — primary sources: `browse-home.jsx`, `detail-screens.jsx`, `detail-desktop.jsx`
**Out of scope for this PR:** filter chips/bottom sheet, cal/week-strip view, search route, auth gate (5b-2 through 5b-4)

---

## Token / font baseline

JetBrains Mono weight 700 is missing from `apps/web/src/app/layout.tsx` — the current config loads 400/500/600 only. The design uses 700 for mono small-caps labels (filter chips, tab bar, day-group headers, info labels). Add `'700'` to the `JetBrains_Mono` weight array.

All other tokens (CSS vars, Tailwind extensions, theme switching) are already correct from Phase 4. No changes needed to `globals.css`, `tailwind.config.ts`, or `themes.ts`.

---

## Components

### 1. `CCMark` — new SVG component

**File:** `apps/web/src/components/consumer/cc-mark/CCMark.tsx`

A 96×96 SVG logo mark: accent circle cluster (top-right) + signal dot trail (bottom-left diagonal). Used in AppHeader on all sizes.

```
circle cx=72 cy=24 r=20 fill=--accent opacity=0.22
circle cx=72 cy=24 r=12 fill=--accent opacity=0.42
circle cx=72 cy=24 r=7  fill=--signal
trail: 7 circles from (14,76)→(66,32), radii 1.5→6, fill=--signal opacity 0.35+i×0.09
background rect fill=--bg rx=16
```

Props: `size?: number` (default 24). Renders as `<svg width={size} height={size}>`.

---

### 2. `AppHeader` — responsive header (updated)

**File:** `apps/web/src/components/consumer/app-header/AppHeader.tsx`

Two layouts within one component, switching at the `sm` breakpoint.

#### Mobile (below `sm`)

```
height: auto, padding: 62px top 10px (status bar clearance) 16px sides
left: CCMark(28) + "concert crawl." wordmark
  - "concert" Inter 800 17px --fg tracking-tight (-0.02em)
  - "crawl." in --accent
right: circular button 36×36, border-strong, search icon (Lucide Search 16px, stroke --fg-muted)
  - links to /search (stub — no route yet in 5b-1)
```

No ThemeToggle, no UserButton on mobile. UserButton surfaces in the "me" tab of BottomNav (5b-1 scope: just render the Me tab as a placeholder).

#### Desktop (`sm` and above)

Sticky header height 64px, `bg-bg-elevated`, `border-b border-border`.

```
left cluster (gap-8):
  CCMark(32) + "concertcrawl." wordmark
  nav tabs: Browse | Search | Saved
    - active: Inter 700, bg-surface-2 rounded-lg
    - inactive: Inter 500, fg-muted
    - each: padding 8px 14px, rounded-lg, text 13px

right cluster (gap-3):
  search bar input: 280px wide, bg-surface-1, border-border, rounded-lg h-36
    - search icon 14px + placeholder "Search artists or venues…" + "⌘K" mono badge
    - links to /search (stub)
  user avatar: 36×36 circle, bg-surface-2, border-border
    - render <UserButton /> from Clerk inside this slot (the Clerk UserButton replaces the initials placeholder)
ThemeToggle: keep as a floating element (existing pattern) — don't add to desktop nav header
```

---

### 3. `BottomNav` — new component

**File:** `apps/web/src/components/consumer/bottom-nav/BottomNav.tsx`

Mobile-only sticky bottom bar. Hidden at `sm` breakpoint and above.

```
height: 52px
background: --bg-elevated
border-top: 1px --border
padding-bottom: 2px (home indicator clearance)

4 tabs, evenly spaced:
  browse   — grid-of-4-squares icon (18×18)  — links to /events
  search   — circle+line icon                — links to /search (stub)
  saved    — heart outline icon              — links to /saved (stub)
  me       — person outline icon             — no route yet; renders UserButton or placeholder

active tab: --signal color
inactive tab: --fg-subtle

label: JetBrains Mono 9px, fontWeight 700 active / 500 inactive, letterSpacing 0.04em
icon: 18×18 inline SVG (exact paths from TabBarCC in browse-home.jsx)
```

Active tab is determined by pathname. Use `usePathname()` — mark component `'use client'`.

SVG icon paths from the design:

- **browse**: `<rect x="1" y="1" w="7" h="7" rx="2"/>` × 4 (2×2 grid)
- **search**: `<circle cx="8" cy="8" r="5.5"/>` + `<path d="M12.5 12.5L16 16"/>`
- **saved**: `<path d="M9 15l-6.5-6A3.5 3.5 0 019 4.5 3.5 3.5 0 0115.5 9L9 15z"/>`
- **me**: `<circle cx="9" cy="6" r="3.5"/>` + `<path d="M2.5 16.5c0-3.5 3-5.5 6.5-5.5s6.5 2 6.5 5.5"/>`

---

### 4. `EventCard` — updated to row layout

**File:** `apps/web/src/components/consumer/event-card/EventCard.tsx`

The Phase 5 implementation is a bordered card. The design uses divider-separated rows inside day groups — no individual card border or background.

**Updated layout:**

```
Link (full row, clickable) — no border, no bg, no rounded
  flex gap-[10px] padding-y-[10px] items-center

  left: 48×48 image, borderRadius 6px (rounded-md)
    - EventImage component (existing) — fallback initial

  middle (flex-1, min-w-0):
    - artist: Inter 700 14px --fg, truncate, hover:--signal
    - subtitle (if title ≠ artist): Inter 500 12px --fg-muted, truncate
    - venue + time: JetBrains Mono 9.5px --fg-muted, flex gap-[5px] items-center
      format: "Gothic · 9:00 PM" (venueShort helper + time)

  right (shrink-0):
    - if price: Inter 800 13px --signal (show start of range only)
    - if no price: JetBrains Mono 9px --fg-subtle "tba"
    - if cancelled/postponed: show Badge instead
```

**Price display**: show `ticketPriceMin` formatted as `$XX` when available; omit range on browse rows. Show "tba" (lowercase mono) when no price.

**Venue short name**: add `venueShort(name: string)` to `definitions/lib.ts` — strips common suffixes ("Amphitheatre"→"", "Theatre"→"", "Theater"→"", "Ballroom"→"") and trims. Example: "Red Rocks Amphitheatre" → "Red Rocks", "Gothic Theatre" → "Gothic".

**Dividers are rendered by the parent** (browse page date groups), not by EventCard itself.

---

### 5. `HeroEventCard` — updated

**File:** `apps/web/src/components/consumer/hero-event-card/HeroEventCard.tsx`

**Updated layout:**

```
Link href=/events/:id — no CTA button; whole card is the link
  outer: rounded-[12px] overflow-hidden bg-surface-1 border border-border-strong
  margin: 0 16px 14px (mobile) / 0 0 14px (desktop, full width of column)

  hero image area:
    - EventImage: 100% width, fixed height 180px (not aspect-ratio based)
    - bottom scrim: absolute inset-0, gradient linear 180deg transparent 30% → --bg 100%
    - badge: absolute top-[10px] left-[10px]
        JetBrains Mono 9px 700 letterSpacing 0.08em uppercase
        bg-accent text-fg-on-accent padding 3px 8px rounded-[4px]
        text: "★ tonight's pick"

  content area:
    - padding: 12px 14px 14px
    - marginTop: -40px (overlaps bottom of image)
    - position: relative (above scrim)

    - artist: Inter 800 20px --fg tracking-tight (-0.02em) lineHeight 1.15
    - subtitle (title ≠ artist): Inter 500 12px --fg-muted marginTop 2px
    - venue/time/price row: flex gap-[6px] alignItems center marginTop 8px
        JetBrains Mono 10px --fg-muted letterSpacing 0.02em
        venue: --signal color
        · separator: opacity 0.4
        time: --fg-muted
        price (if present): --signal
    - genre chips (if any): flex gap-[4px] marginTop 8px flexWrap
        each chip: JetBrains Mono 9px --fg-muted bg-surface-3 padding 2px 7px rounded-[4px]
```

No "Get Tickets" CTA button — the card itself is a link to the detail page.

---

### 6. `SmallEventRow` — new component

**File:** `apps/web/src/components/consumer/small-event-row/SmallEventRow.tsx`

Used in the "More at venue" section on EventDetail and the "Upcoming" section on VenueProfile. Compact version of EventCard.

```
Link href=/events/:id
  flex gap-[10px] padding-y-[10px] items-center

  left: 40×40 image, borderRadius 6px
    - EventImage with fallback initial

  middle (flex-1, min-w-0):
    - artist: Inter 700 13px --fg, truncate
    - meta: JetBrains Mono 9px --fg-muted marginTop 1px
        format: "[venue · ] date · time"  (venue optional — omit when component is on venue page)

  right (shrink-0):
    - price: Inter 800 12px --signal
    - no price: JetBrains Mono 9px --fg-subtle "tba"
```

Props:

```ts
interface SmallEventRowProps {
  event: EventWithVenue | Event
  showVenue?: boolean // default true; set false on VenueProfile (venue is redundant)
  date: string // formatted "Apr 28"
}
```

---

### 7. `SectionHeader` — new shared component

**File:** `apps/web/src/components/consumer/section-header/SectionHeader.tsx`

Reusable across EventDetail ("More at Red Rocks") and VenueProfile ("Upcoming"). Matches the design's consistent pattern.

```
flex items-center gap-[8px] marginBottom 4px
  label: Inter 800 14px --fg tracking-tight (-0.01em) whitespace-nowrap
  rule: flex-1 h-px bg-border
  count (optional): JetBrains Mono 9px --fg-subtle whitespace-nowrap
```

Props: `title: string`, `count?: string`

---

### 8. Browse page — layout update

**File:** `apps/web/src/app/(protected)/events/page.tsx`

Changes:

1. **Import and render `BottomNav`** below `<main>` — mobile-only (component itself handles visibility via `sm:hidden`).
2. **Day group headers**: replace current `<h2 className="... uppercase tracking-widest ...">` with the design pattern:
   ```
   flex items-center gap-[8px] padding 10px 0 4px
     label: Inter 800 12px
       "Tonight" → color --accent
       other dates → color --fg
       letterSpacing 0.05em textTransform uppercase
     rule: flex-1 h-px bg-border
     count: JetBrains Mono 9px --fg-subtle "N show(s)"
   ```
3. **EventCard dividers**: change the date group inner render from `flex-col gap-2` to dividers between rows:
   ```tsx
   {
     dateEvents.map((event, i) => (
       <Fragment key={event.id}>
         {i > 0 && <div className="h-px bg-border ml-[58px]" />}
         <EventCard event={event} />
       </Fragment>
     ))
   }
   ```
4. **Page wrapper**: add `pb-16 sm:pb-0` to the `<main>` element so content doesn't hide behind the BottomNav on mobile.
5. **Max-width**: keep `max-w-5xl` for desktop. The design is single-column at ~720px on desktop — this is already narrower than 5xl which is fine.

---

### 9. EventDetail page — refactor

**File:** `apps/web/src/app/(protected)/events/[id]/page.tsx`

This is the largest change. The design removes the shared `AppHeader` on mobile and replaces it with floating navigation buttons overlaid on the hero.

**Layout structure:**

```
<div className="flex min-h-screen flex-col bg-bg">
  {/* Desktop-only: AppHeader (hidden on mobile) */}
  <div className="hidden sm:block">
    <AppHeader />
  </div>

  {/* Hero section — full-bleed, no padding, relative for floating buttons */}
  <div className="relative w-full shrink-0" style={{ height: 320 }}>
    <EventImage fill src={event.imageUrl} alt={event.artist} ... />
    {/* Bottom scrim */}
    <div className="absolute inset-x-0 bottom-0 h-20 pointer-events-none"
         style={{ background: 'linear-gradient(transparent, var(--bg))' }} />
    {/* Mobile-only: floating back button */}
    <Link href="/events" className="sm:hidden absolute top-14 left-3.5 ...">
      ← chevron SVG
    </Link>
    {/* Mobile-only: floating save button */}
    <button className="sm:hidden absolute top-14 right-3.5 ...">
      heart SVG
    </button>
    {/* Desktop: breadcrumb replaces floating buttons — rendered below */}
  </div>

  {/* Scrollable content */}
  <div className="flex-1 relative -mt-5 px-[18px] pb-8">
    {/* Desktop breadcrumb */}
    <div className="hidden sm:flex items-center gap-1.5 mb-4 text-sm ...">
      ← Browse / {event.artist}
    </div>

    <ChipRow items={event.genre} />

    <h1 className="... font-black text-[26px] tracking-[-0.03em] leading-[1.1]">
      {event.artist}
    </h1>
    {title ≠ artist && <p ...>{event.title}</p>}

    {/* Info block — bordered top and bottom */}
    <div className="mt-4 border-y border-border py-1">
      <InfoRow icon={<IconPin/>} label="Venue" value={event.venue.name} onClick→venue />
      <InfoRow icon={<IconCalendar/>} label="Date" value={dateLabel} />
      <InfoRow icon={<IconClock/>} label="Doors / Show" value={`${doors} / ${show}`} />
      <InfoRow icon={<IconTicket/>} label="Price" value={price || "TBA"} signal={!!price} />
      <InfoRow icon={<IconUsers/>} label="Ages" value={event.ages || "All Ages"} />
    </div>

    <AboutSection text={event.description} />

    {/* CTA */}
    {ticketUrl && (
      <a href={ticketUrl} ... className="mt-5 flex w-full h-12 rounded-[10px]
         bg-accent text-fg-on-accent items-center justify-center
         font-extrabold text-[15px] tracking-[-0.01em]">
        Get Tickets ↗
      </a>
    )}

    {/* "Sign up to save" micro-copy */}
    <p className="mt-2.5 text-center font-mono text-[9px] text-fg-subtle">
      <Link href="/sign-up" className="text-signal">Sign up</Link> to save this show
    </p>

    {/* Related shows */}
    {related.length > 0 && (
      <div className="mt-6">
        <SectionHeader title={`More at ${event.venue.name}`}
                       count={`${related.length} shows`} />
        {related.map((r, i) => (
          <Fragment key={r.id}>
            {i > 0 && <div className="h-px bg-border ml-[50px]" />}
            <SmallEventRow event={r} date={formatShortDate(r.date)} />
          </Fragment>
        ))}
      </div>
    )}
  </div>
</div>
```

**New icon components** (inline SVGs, 16×16, 1.5px stroke, `--fg-subtle` color, matching `detail-screens.jsx`):

- `IconPin` — location pin
- `IconCalendar` — calendar
- `IconClock` — clock with hands
- `IconTicket` — ticket shape
- `IconUsers` — two people silhouette

**`InfoRow` component** (inline in page file or extracted to `consumer/info-row/`):

```ts
interface InfoRowProps {
  icon: ReactNode
  label: string // JetBrains Mono 9px uppercase --fg-subtle
  value: string // Inter 600 14px --fg (or --signal when signal=true)
  signal?: boolean
  onClick?: () => void // makes it a <button> instead of <div>; adds chevron
}
```

**`AboutSection` component** (inline or extracted):

```
"About" label: JetBrains Mono 9px uppercase --fg-subtle marginBottom 6px
body: Inter 13px --fg-muted lineHeight 1.55 textWrap pretty
```

**`ChipRow` component** (inline or extracted):

```
flex gap-[5px] marginBottom 8px flexWrap
each chip: JetBrains Mono 9px --fg-muted bg-surface-3 padding 3px 8px rounded-[4px]
```

**`formatShortDate`** — add to `definitions/lib.ts`:
Returns "Apr 28", "May 3", etc. (no year, no weekday). Used in SmallEventRow date prop.

---

### 10. VenueProfile page — refactor

**File:** `apps/web/src/app/(protected)/venues/[slug]/page.tsx`

Mirrors EventDetail structure. Replace `VenueEventRow` inline component with `SmallEventRow`.

**Layout structure:**

```
<div className="flex min-h-screen flex-col bg-bg">
  {/* Desktop-only AppHeader */}
  <div className="hidden sm:block"><AppHeader /></div>

  {/* Hero 320px */}
  <div className="relative w-full shrink-0" style={{ height: 320 }}>
    <VenueHeroPlaceholder name={venue.name} />  {/* gradient bg + initials */}
    {/* Bottom scrim */}
    <div className="absolute inset-x-0 bottom-0 h-20 ..." />
    {/* Floating back button (mobile) */}
    <Link href="/events" className="sm:hidden absolute top-14 left-3.5 ...">
  </div>

  {/* Content */}
  <div className="flex-1 relative -mt-5 px-[18px] pb-8">
    <ChipRow items={[venue.type || 'Venue']} />
    <h1 className="font-black text-[26px] tracking-[-0.03em] leading-[1.1]">
      {venue.name}
    </h1>

    {/* Neighborhood + directions */}
    <div className="flex items-center gap-2 mt-1.5">
      <span className="font-mono text-[10px] text-fg-muted tracking-[0.04em]">
        {venue.city}
      </span>
      <span className="text-fg-subtle opacity-40">·</span>
      <a href={googleMapsUrl(venue.address)} target="_blank"
         className="inline-flex items-center gap-1 font-mono text-[10px] text-signal">
        <IconDirections /> Directions
      </a>
    </div>

    {/* Stats row */}
    <div className="flex gap-3 mt-3.5 py-3 border-y border-border">
      <StatPill label="Capacity" value={venue.capacity || '—'} />
      <StatPill label="Upcoming" value={`${upcomingEvents.length} shows`} signal />
      <StatPill label="Type" value={venue.type || '—'} />
    </div>

    {venue.description && <AboutSection text={venue.description} />}

    {/* Upcoming shows */}
    <div className="mt-[22px]">
      <SectionHeader title="Upcoming" count={`${upcomingEvents.length} shows`} />
      {upcomingEvents.map((e, i) => (
        <Fragment key={e.id}>
          {i > 0 && <div className="h-px bg-border ml-[50px]" />}
          <SmallEventRow event={e} showVenue={false} date={formatShortDate(e.date)} />
        </Fragment>
      ))}
    </div>

    {/* Map placeholder */}
    <div className="mt-5 mb-6">
      <MapPlaceholder address={venue.address} />
    </div>
  </div>
</div>
```

**`VenueHeroPlaceholder`** (inline component or extracted): deterministic gradient from venue name + initials (first 2 words' initials), same pattern as `HeroImage` in `detail-screens.jsx` with `venueStyle=true`.

**`StatPill`** (inline or extracted):

```
flex-1 flex flex-col gap-0.5
  label: JetBrains Mono 8px uppercase tracking-[0.06em] --fg-subtle
  value: Inter 700 12px --fg (or --signal when signal)
```

**`MapPlaceholder`** (extracted to `components/consumer/map-placeholder/`):
SVG-based map decoration: grid of light curved lines, accent circle + white dot at center, address label bottom-left. Height 110px, rounded-[10px], bg-surface-1 border-border. Exact SVG from `detail-screens.jsx MapPlaceholder`.

**`IconDirections`** (14×14): arrow pointing right + path curving left. From `detail-screens.jsx`.

**`googleMapsUrl(address: string)`** — add to `definitions/lib.ts`:
Returns `https://maps.google.com/?q=${encodeURIComponent(address)}`.

**Missing fields on `VenuePublic`** — confirmed absent from `packages/types/src/index.ts`:

- `address`: use `${venue.name}, ${venue.city}` for the Google Maps link. MapPlaceholder renders with `venue.city` as the label.
- `type`: omit the type chip on VenueProfile (design shows "Outdoor" — not yet in schema).
- `capacity`: StatPill shows `'—'` as fallback.
- `description`: `VenuePublic` has no description field. Conditionally render `<AboutSection>` only when the field is defined — it will be absent for now.

**Missing field on `Event`** — `ages` is not in the `Event` type. Hardcode `"All Ages"` as the value for the Ages InfoRow on EventDetail.

These are all UI-layer fallbacks. No schema changes in this PR — defer to a later betterment task.

---

## Desktop detail/venue pages

Both `EventDetailPageDD` and `VenueProfilePageDD` in the design show the content inside a `bg-bg-elevated rounded-[16px] border-border` card with a `BreadcrumbDD` header inside a `max-w-[720px]` column.

For 5b-1, the desktop layout is:

```
AppHeader (sticky) + main content
  max-w-[720px] mx-auto px-8
    breadcrumb + page actions (Save + Share buttons)
    card wrapper: rounded-2xl border border-border bg-bg-elevated overflow-hidden
      [EventDetail or VenueProfile content — same component, chrome="desktop"]
```

The existing pages already wrap content in a `max-w-5xl` container. This narrows to 720px for detail/venue and adds the card wrapper. The page action buttons (Save, Share) are UI stubs in 5b-1 (no backend).

---

## Error and empty states

- **Related shows empty**: hide the "More at venue" section entirely when `related.length === 0`. No empty state needed.
- **VenueProfile no events**: existing `EmptyState` component stays for now (design doesn't show a special state here yet).
- **No AppHeader on mobile detail/venue**: if JS is disabled, the floating back button still renders (it's static HTML). Acceptable.

---

## What this PR does NOT change

- Filter bar (`FilterBar`) — replaced entirely in 5b-2
- `LoadMoreButton` — unchanged
- `EmptyState` — unchanged
- `ThemeToggle` — unchanged (stays as floating element)
- Any admin pages
- API routes
- DB schema (venue type/address fields deferred if absent)
