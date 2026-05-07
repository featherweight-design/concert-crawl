# Concert Crawl — Admin UI Design Brief

**Date:** 2026-05-07  
**For:** Claude Design  
**Context:** Phase 7 — Automation + Scheduling

---

## What This Brief Covers

Two things need designing before Phase 7 implementation begins:

1. **Admin UI redesign** — the existing admin area shares the token system but feels like a skeleton: no active nav states, raw HTML tables, placeholder dashboards, no status language. Bring it up to the same visual standard as the consumer app.
2. **New Phase 7 admin screens** — three new surfaces that don't exist yet: a Crawl Status page (`/admin/crawl`), an Event Review page (`/admin/events`), and a Notification Bell component in the admin sidebar.

The design files will live in `design/design_handoff_admin_ui/` alongside this README. Implementation follows the same format as previous handoffs: React prototypes as HTML files, source in `.jsx`, this README as the source of truth for decisions.

---

## Design System Reference

All admin UI must be authored against the token system — never hex values. Three themes must work: Electric, Jade, Light.

### Tokens

| Group        | Tokens                                                                         |
| ------------ | ------------------------------------------------------------------------------ |
| Surfaces     | `--bg`, `--bg-elevated`, `--surface-1`, `--surface-2`, `--surface-3`           |
| Text & icons | `--fg`, `--fg-muted`, `--fg-subtle`, `--fg-on-accent`                          |
| Borders      | `--border`, `--border-strong`, `--border-focus`                                |
| Brand        | `--signal`, `--signal-muted`, `--accent`, `--accent-muted`                     |
| States       | `--success`, `--warning`, `--danger`                                           |
| Misc         | `--focus`, `--overlay-hover`, `--overlay-press`, `--scrim`, `--image-tint`     |

### Electric theme (primary reference)

```
--bg:            #070A1A
--bg-elevated:   #0E1226
--surface-1:     #11162E
--surface-2:     #171D3A
--surface-3:     #1F2748
--fg:            #E8F3FF
--fg-muted:      #9AA8C7
--fg-subtle:     #5A6788
--border:        #1F2748
--border-strong: #2C3661
--signal:        #7AE6FF   ← cyan (active states, CTAs)
--accent:        #FF7BD4   ← pink (badges, highlights)
--success:       #7BFFB0
--warning:       #FFD27A
--danger:        #FF7A8A
```

### Typography

- **UI text:** Inter (weights 400/500/600/700/800)
- **Mono labels, status codes, UUIDs:** JetBrains Mono 700

### Component library

shadcn/ui (Radix primitives, already installed). Use `Card`, `Table`, `Tabs`, `Badge`, `Button`, `Dialog`, `Popover`, `Tooltip` — don't design custom primitives when shadcn already covers the pattern.

### Prior art

- Consumer app screens: `design/design_handoff_phase5b_screens/` — event cards, filter chips, bottom sheets, search states
- Brand & tokens: `design/design_handoff_brand_and_theming/` — logo mark, wordmark geometry, full token tables

---

## Part 1 — Admin UI Redesign

### Current State Audit

The admin area exists and uses tokens correctly, but has several pain points that make it feel disconnected from the consumer app.

#### Layout (`apps/web/src/app/(protected)/admin/layout.tsx`)

```
sidebar (w-56, bg-surface-1)
  "Admin" label (small caps, fg-muted)
  nav links (no active state — every link looks the same)
  UserButton (Clerk, at the bottom)
main (flex-1, p-8)
```

**Pain points:**
- No active nav state — impossible to tell which page you're on without reading the URL
- No logo or wordmark — admin feels like an orphan, not part of Concert Crawl
- No notification bell — Phase 7 introduces the `notifications` table and SSE stream; there's nowhere to surface them
- `UserButton` (Clerk component) is unstyled relative to the rest of the sidebar
- No visual hierarchy between the "Admin" label and the nav items

#### Dashboard (`/admin`)

```
h1 "Admin Dashboard" + welcome message
3 stat cards (Card/CardHeader/CardContent):
  Venues — "—" + "Populated after venue setup"
  Invite Codes — "—"
  Last Crawl — "—" + "Crawler live in Phase 3"
```

**Pain points:**
- All three cards show placeholder dashes — the data exists now (venues, invite codes, crawl runs are all live)
- No crawl health signal — the most operationally important thing to know at a glance is: did the last crawl succeed? How many events are pending review?
- No recent activity — notifications, recent crawl runs, recent invite code redemptions
- "Populated after venue setup" and "Crawler live in Phase 3" copy is stale — the app is in Phase 7

#### Venues (`/admin/venues`, `/admin/venues/[id]`, `/admin/venues/new`)

- List page uses a `VenueTable` component (custom, not a shadcn `Table`)
- No visible status indicators for `consecutive_failures`, `blocked_at`, `robots_txt_allowed`
- No last-crawled timestamp in the list
- The "Add Venue" → `buttonVariants()` on a `Link` pattern is correct

#### Prices (`/admin/prices`)

- Uses raw `<table>` / `<thead>` / `<tbody>` / `<tr>` / `<td>` — not shadcn `Table`
- Outcome values ("hit", "miss", "error") are styled with inline `text-green-600` / `text-destructive` — should use `--success`, `--danger` tokens or `Badge` components
- Hit rate shown as `%` text — could be a progress bar or colored badge
- Coverage percentage is a big number with plain text below — could be a more expressive stat

#### Invite Codes (`/admin/invite-codes`)

- `InviteCodeTable` renders codes with status (used/unused/revoked/expired) — unclear if status uses `Badge` or plain text
- No copy-to-clipboard button on code values

#### Settings (`/admin/settings`)

- Just an `AppearanceSection` with a theme switcher — this is fine as-is

---

### Redesign Goals

1. **Cohesion** — admin should feel like it was designed alongside the consumer app, not independently. Same design language: dark surfaces, electric cyan for active/interactive states, pink accent for highlights, generous spacing.
2. **Operational clarity** — the admin is a tool for one or two people managing a live product. Information density matters more here than on the consumer side. Tables are appropriate; use them well.
3. **Status at a glance** — crawl health, events pending review, blocked venues, notification count should be visible from the sidebar or dashboard without navigating.
4. **Consistent patterns** — every list page should use shadcn `Table`. Every status value should use `Badge`. Every page should have a consistent heading block (page title + subtitle/action).

---

### Redesign Specs

#### Sidebar (revised)

**Structure:**
```
sidebar (w-64, bg-surface-1, border-r border-border)
  ┌─────────────────────────────────┐
  │  [logo mark 20px]  concert      │  ← logo mark + wordmark, links to /admin
  │                    crawl.       │
  ├─────────────────────────────────┤
  │  ADMIN                          │  ← small caps label, fg-subtle, mono font
  ├─────────────────────────────────┤
  │  [icon]  Dashboard              │  ← nav items with icons
  │  [icon]  Venues                 │
  │  [icon]  Crawl     [● 2]        │  ← badge on Crawl if venues are blocked/failing
  │  [icon]  Events    [● 5]        │  ← badge count for events pending review
  │  [icon]  Prices                 │
  │  [icon]  Invite Codes           │
  │  [icon]  Settings               │
  ├─────────────────────────────────┤  ← mt-auto
  │  [🔔 3]  Notifications          │  ← bell icon + unread count, opens panel
  │  [UserButton + name]            │  ← Clerk avatar + display name
  └─────────────────────────────────┘
```

**Active state:** the active nav item should have a `--signal` left border (2px), `--surface-2` background, `--fg` text. Inactive items: `--fg-muted` text, transparent background, `--overlay-hover` on hover.

**Nav icons:** use Lucide React icons (already in codebase). Suggested:
- Dashboard → `LayoutDashboard`
- Venues → `MapPin`
- Crawl → `RefreshCw` (or `Activity`)
- Events → `CalendarCheck`
- Prices → `DollarSign`
- Invite Codes → `Key`
- Settings → `Settings`
- Notifications → `Bell`

**Badge pattern:** small circular badge on nav items (Venues, Crawl, Events) showing actionable counts — blocked venues, failing venues, events pending review. Use `--danger` background for failure counts, `--warning` for pending review counts.

#### Dashboard (revised)

**Page structure:**
```
Page header
  h1 "Dashboard"
  p "Good morning, Hugh · Last crawl: [time ago] · [status chip]"

Stat row (3–4 cards, responsive grid)
  Active Venues         — live count, link to /admin/venues
  Events This Week      — new events from last 7 days
  Pending Review        — events with confidence < 0.7, unverified; link to /admin/events
  LLM Cost (30 days)    — rolling cost in USD

Crawl health section
  Table or card list: one row per venue
    Venue name | Last crawl | Status chip | Events found | Quick action

Recent notifications
  Last 5 notifications, each with icon, title, time, read/unread dot
  "View all" link to notification panel
```

**Status chip palette:**
- `success` → green badge "OK"
- `warning` → amber badge "Partial" or "Low confidence"
- `danger` → red badge "Failed" or "Blocked"
- neutral → `fg-muted` badge "Never crawled"

#### Venues list (revised)

Use shadcn `Table`. Columns:

| Name | Status | Last Crawled | Strategy | Failures | Actions |
| --- | --- | --- | --- | --- | --- |

- **Status**: `Badge` — Active (success), Inactive (fg-muted), Blocked (danger), Robots disallowed (warning)
- **Last Crawled**: relative time (e.g., "3h ago"), `JetBrains Mono` text, `fg-muted` if >24h
- **Strategy**: `Badge` variant — `structured_data` (signal), `llm` (accent), `manual` (warning)
- **Failures**: show `consecutive_failures` as a number with a `--warning` color if ≥ 2, `--danger` if = 3
- **Actions**: `Edit` link, `Trigger crawl` button (if active and not blocked)

#### Prices page (revised)

- Migrate all four `<table>` instances to shadcn `Table` with `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell`
- **Pipeline Health**: replace outcome text with `Badge` — hit (success), miss (fg-muted), error (danger)
- **Hit rate**: small horizontal progress bar (shadcn `Progress`) alongside the `%` text
- **Coverage**: large stat number stays, but add a circular progress indicator or thick progress bar alongside it to make the coverage percentage more visually expressive
- **Submissions**: status column should use `Badge` — pending (warning), approved (success), rejected (danger)

#### Invite Codes (revised)

- Add a copy-to-clipboard icon button next to each code value
- Status `Badge`: active (success), used (fg-muted), expired (warning), revoked (danger)
- `used_at` / `expires_at` columns should use relative time (e.g., "2 days ago")

---

## Part 2 — New Phase 7 Screens

### Screen 1: Crawl Status (`/admin/crawl`)

**Purpose:** Give the admin visibility into every crawl run — what succeeded, what failed, why, and how much it cost. Includes a manual trigger.

**Data sources:**

From `crawl_runs` table:
- `status`: `success` / `failed` / `partial`
- `events_found`, `events_created`, `events_updated`
- `error_message`, `http_status_code`
- `robots_txt_blocked`, `extraction_strategy_used`
- `llm_tokens_used`, `llm_cost_usd`
- `started_at`, `completed_at`

From `venues` table:
- `name`, `consecutive_failures`, `blocked_at`, `last_crawled_at`, `active`, `robots_txt_allowed`

**Layout:**

```
Page header
  h1 "Crawl Status"
  [Run All Venues] button (primary, top-right)

Summary banner (conditional — shown only if there are issues)
  "2 venues blocked · 1 venue paused due to failures"
  Link to affected venue rows

Venues health table
  Venue | Active | Last Crawl | Status | Events Found | Strategy | Cost | Actions

Crawl run history (below or tabbed)
  Filterable by venue, status, date range
  Venue | Run date | Duration | Status | Events | Strategy | LLM Cost | Error
  Expandable row: error_message in full, raw HTTP status, robots_txt_blocked flag
```

**Status indicators:**

| State | Visual |
| --- | --- |
| success | `--success` badge "Success" |
| partial | `--warning` badge "Partial" |
| failed | `--danger` badge "Failed" |
| blocked (403/blocked_at set) | `--danger` badge "Blocked" |
| robots_txt_blocked | `--warning` badge "robots.txt" |
| never crawled | `--fg-muted` badge "Never" |
| in progress | `--signal` badge "Running" + spinner |

**Manual trigger:**
- "Run All Venues" button triggers a crawl for all active, non-blocked venues
- Per-venue "Trigger" button in the Actions column (only shown for active, non-blocked venues)
- After trigger: **live SSE feedback** — the row immediately transitions to "Running" status (spinner) and updates to success/failure in real time without a page reload. Claude Design should spec the running state: spinner placement, any progress text (e.g. "12 venues crawled…"), and whether an abort button appears

**LLM cost column:**
- Format: `$0.0042` in `JetBrains Mono`, `fg-muted` if zero
- Running total at the bottom of the history table
- Consider a rolling 30-day cost card in the summary area

---

### Screen 2: Event Review (`/admin/events`)

**Purpose:** Let the admin review events that the crawler extracted with low confidence (< 0.7) and mark them verified or reject them. This is the core human-in-the-loop gate for data quality.

**Data sources:**

From `events` table:
- `title`, `artist`, `date`, `doors_time`, `show_time`, `venue_id`
- `confidence_score`, `verified`, `extraction_strategy`
- `source_url`, `source_hash`
- `ticket_url`, `ticket_price_min`, `ticket_price_max`
- `description`, `image_url`, `genre[]`

**Layout:**

```
Page header
  h1 "Event Review"
  "[N] events pending review" (fg-muted subtitle)
  Filter controls (top-right): confidence threshold, date range, venue, extraction strategy

Filter bar (below header)
  Confidence: user-configurable threshold (not fixed presets — admin sets "above X")
  Venue: [All] or specific venue
  Date: upcoming only (default) or all

Review list
  Each row = one unverified event
  [Confidence badge] [Artist — Title] [Venue · Date] [Strategy badge] [Approve] [Reject] [Edit]

Bulk action bar (appears when rows are selected via multi-select)
  [✓] N selected · [Approve Selected] [Reject Selected]

Empty state
  "All clear — no events pending review." with a checkmark illustration
```

**Event row detail:**

Each row should show enough to make a decision without clicking through:

```
┌──────────────────────────────────────────────────────────────────┐
│  [0.58]  Radiohead — In Rainbows Tour              [llm] badge   │
│          Red Rocks Amphitheatre · Sat Jun 14, 2026               │
│          $45–$120 · Doors 6pm · Show 8pm                         │
│          source: redrocksonline.com/events/…                      │
│                                        [Edit]  [Reject]  [Approve]│
└──────────────────────────────────────────────────────────────────┘
```

**Confidence badge:** numeric score (e.g., `0.58`) as a `Badge`:
- ≥ 0.7: `--success` (shouldn't appear in the review queue, but handle gracefully)
- 0.5–0.69: `--warning`
- < 0.5: `--danger`

**Actions:**
- **Approve** — sets `verified = true`, removes from review queue. Button: `--success` outline or filled.
- **Reject** — soft-deletes the event. Button: `--danger` outline. Two-step inline confirmation (click Reject → confirm in place), though Claude Design may propose an alternative.
- **Edit** — opens a modal or dedicated page with all editable fields pre-filled. Admin can correct extracted data before approving. Claude Design should choose the pattern based on form complexity.

**Edit modal fields:**
- Artist, Title, Date, Doors time, Show time, Ticket URL, Price min/max, Description, Genre tags
- Source URL (read-only, for reference)
- Confidence score (read-only)
- "Save & Approve" as the primary CTA

---

### Component: Notification Bell

**Purpose:** Persistent alert surface in the admin sidebar for crawl failures, low-confidence extractions, blocked venues, and invite code redemptions. Powered by the `notifications` table and SSE stream.

**Data sources:**

From `notifications` table:
- `type`: `admin_alert` / `user_notification`
- `category`: `crawl.failed`, `crawl.low_confidence`, `event.flagged`, `invite_code.used`, `crawl.blocked`
- `title`, `body`, `action_url`, `read_at`, `metadata`, `created_at`

API: `GET /v1/notifications/stream` (SSE), `PATCH /v1/notifications/:id` (mark read), `POST /v1/notifications/mark-all-read`

**Sidebar position:** between the nav items and the UserButton, pinned to the bottom of the sidebar nav section.

**Bell button (collapsed state):**
```
[🔔]  Notifications   [3]
       ↑ icon          ↑ unread count badge
```

- Count badge: filled circle, `--danger` background, white text. Hidden if count = 0.
- Active state (panel open): `--signal` icon + `--surface-2` background, same as other active nav states.
- If unread count > 9: show "9+"

**Notification panel (expanded — opens as a fixed panel or wide popover anchored to the bell button):**

```
┌────────────────────────────────────┐
│  Notifications          [Mark all read]│
├────────────────────────────────────┤
│  [🚨]  Crawl failed · Red Rocks     │  ← unread (bg-surface-2)
│        HTTP 403 — venue blocked     │
│        2m ago · View crawl →        │
├────────────────────────────────────┤
│  [⚠️]  5 events need review        │  ← unread
│        Bluebird Theater · low conf. │
│        15m ago · Review →           │
├────────────────────────────────────┤
│  [🔑]  Invite code used             │  ← read (bg-transparent, fg-muted)
│        user@example.com redeemed    │
│        1h ago                       │
├────────────────────────────────────┤
│  [View all notifications]           │
└────────────────────────────────────┘
```

**Category icons (Lucide):**
- `crawl.failed` → `AlertCircle` (`--danger`)
- `crawl.blocked` → `ShieldOff` (`--danger`)
- `crawl.low_confidence` → `AlertTriangle` (`--warning`)
- `event.flagged` → `Flag` (`--warning`)
- `invite_code.used` → `Key` (`--signal`)

**Read/unread treatment:**
- Unread: `--surface-2` background, `--fg` title
- Read: transparent background, `--fg-muted` title
- Hover (either state): `--overlay-hover` overlay

**Real-time updates:**
- The bell icon count should update live via SSE without a page reload
- When a new notification arrives while the panel is closed, the count increments and the bell icon subtly pulses (scale 1 → 1.15 → 1 over 300ms, using `--signal` color)
- When the panel is open, new notifications prepend to the list with a brief slide-down animation

**Panel size and positioning:**
- Width: 360px
- Max height: 480px, scrollable
- Anchored to the bell button — opens upward if the button is near the bottom of the sidebar
- Placement and interaction pattern is a design decision — overlay popover and dedicated notifications page are both viable; choose based on data density.

---

## Open Questions

All questions resolved. See below for Claude Design's reference.

### Resolved (for Claude Design's reference)

5. **Manual crawl trigger UX** — live SSE feedback. Running state, progress text, and abort button presence are design decisions.
1. **Sidebar** — collapsible to icon-only mode. Trigger and breakpoint behavior are design decisions.
2. **Mobile** — the admin should be mobile-friendly. Data-dense views (tables, history) should use horizontal scroll and flexible breakpoints rather than strict mobile-first layouts.
3. **Notification panel** — overlay popover or a dedicated notifications page; Claude Design should choose based on data density.
4. **Branding** — sidebar should show the Concert Crawl logo mark/wordmark alongside an "Admin" declaration. Exact lockup is a design decision.
6. **Crawl history** — paginated. Page size and controls are a design decision.
7. **Event edit** — modal or dedicated page; Claude Design should choose based on form complexity.
8. **Rejection confirmation** — two-step inline is acceptable; Claude Design may propose an alternative.
9. **Bulk approve** — multi-select with a user-configurable confidence threshold (not a fixed "above 0.7"). Design should include a threshold input or slider that gates the bulk action.
10. **Dashboard stat cards** — design for extensibility; the exact stats shown are a design decision. Useful candidates: active venues, events this week, events pending review, LLM cost (30d), blocked venues, invite codes remaining.
11. **Activity feed** — track all event types (crawl runs, notifications, invite code uses) but surface them in a filterable UI. Separation vs. unified feed is a design decision.

---

## File Deliverables Expected

Following the format of prior handoffs:

```
design/design_handoff_admin_ui/
  README.md                        ← this file (source of truth)
  Admin Layout.html                ← sidebar redesign + all nav states in all 3 themes
  Dashboard.html                   ← revised dashboard with live stats
  Venues.html                      ← revised venues list
  Prices.html                      ← revised prices page
  Crawl Status.html                ← new Phase 7 screen
  Event Review.html                ← new Phase 7 screen
  Notification Bell.html           ← bell component in all states
  layout.jsx                       ← sidebar source
  dashboard.jsx                    ← dashboard source
  crawl-status.jsx                 ← crawl status source
  event-review.jsx                 ← event review source
  notification-bell.jsx            ← bell source
  primitives.jsx                   ← shared admin primitives (badges, stat cards, tables)
```

---

## Fidelity Target

**Hi-fi.** Same standard as the Phase 5b consumer screens. Pixel-perfect with finalized:
- Colors from the token system (no hex values in components)
- Typography: Inter + JetBrains Mono, weights and sizes locked
- All interactive states: default / hover / active / focused / disabled
- All data states: loaded / empty / error / loading skeleton
- All three themes working

Implementation will follow directly from these files — the engineer reading them should not need to make any design decisions.
