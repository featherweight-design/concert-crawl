# Concert Crawl — Admin UI Design Handoff

## Overview

This handoff covers the **internal admin surface** for Concert Crawl — the operator-facing dashboard Hugh (and any future curator) uses to keep the curated concert dataset healthy. Concerns covered:

- **Cost-aware operations**: every LLM call costs money; running cost is surfaced everywhere.
- **Crawl health**: per-venue scrape status, run history, error inspection.
- **Event review queue**: confidence-weighted approval flow with diff against raw source.
- **Reference data tables**: venues (sources/schedules), prices (snapshots), invite codes (referral receipts).
- **Shell / chrome**: sidebar lockup, topbar, inbox panel, theme system.

The bundle is divided into a primitive kit, a shell, five page modules, and a shared canvas presenting every variant side-by-side.

---

## About the Design Files

**The HTML/JSX files in this bundle are design references, not production code.** They are in-browser React prototypes (JSX transpiled by Babel-standalone at runtime) so we could iterate quickly and present every state on a shared canvas. They are not how the admin UI should ship.

**Your task is to recreate these designs in the admin app's existing environment** — match the codebase's framework, component library, routing, state-management, and styling conventions. If no admin codebase exists yet, choose the most appropriate stack for the project (a reasonable default: React + TanStack Router + TanStack Table + Tailwind + Radix primitives, with the token system below mapped to Tailwind theme extensions).

The HTML prototypes are accurate about: layout, hierarchy, copy, color tokens, typography, status semantics, table column orders, badge variants, and empty/error states. They are not accurate about: state management (everything is local), data fetching (all data is hard-coded), or accessibility (focus rings and aria are minimal — production must implement properly).

---

## Fidelity

**Hi-fi.** Pixel-perfect with finalized:

- Color tokens (light + dark) in `admin-theme.jsx`
- Typography scale and weights
- Spacing and radii
- Status semantics (success / warning / danger / signal / accent / neutral)
- Iconography (Lucide-style line icons drawn inline in `admin-primitives.jsx`)
- Component states (active, hover, selected, disabled)
- Copywriting — every label, microcopy line, and column header is intentional

---

## File Map

### Open this first

| File                   | What it shows                                                                                                                                                                                                                                                                                                                          |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Admin UI Canvas.html` | The whole handoff on one design canvas — pan/zoom, drag-reorder, click-to-fullscreen any artboard. Sections: **Overview** (dashboard variants), **Crawl status**, **Event review**, **Data tables** (venues / prices / invites), **Shell** (sidebar variations + topbar), **Primitives** (the atomic kit), **States** (empty + error). |

### Source JSX (the components)

| File                   | Exports                                                                                                                                                                                          |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `admin-theme.jsx`      | `ADMIN_THEMES` (light + dark token sets), `ThemeProvider`, `adminTokenVars`                                                                                                                      |
| `admin-primitives.jsx` | `AdminIcon`, `StatusBadge`, `MonoLabel`, `StatCard`, `SectionHead`, `AdminButton`, `ProgressBar`, `Sparkline`, `Spinner`, `RelTime`, `CostText`, `AdminTable` + `THead/TR/TH/TD`, `Panel`, `Kbd` |
| `admin-shell.jsx`      | `AdminShell`, `Sidebar`, `AdminTopbar`, `InboxPanel`, `InboxRow`, `AdminBrowserFrame`, `NAV`                                                                                                     |
| `admin-dashboard.jsx`  | `AdminDashboard` — composed of `MorningGreeting`, `StatRow`, `CostPanel`, `VenueHealthPanel`, `ActivityPanel`                                                                                    |
| `admin-crawl.jsx`      | `AdminCrawlPage`, `RunningBanner`, `IssuesBanner`, `CrawlStats`, `CrawlSplitView`, `CrawlInspector`, `RunHistory`                                                                                |
| `admin-events.jsx`     | `AdminEventsPage`, `EventFilterRail`, `EventQueueSplit`, `EventInspector`, `BulkActionBar`, `ConfidenceBar`                                                                                      |
| `admin-tables.jsx`     | `AdminVenuesPage`, `AdminPricesPage`, `AdminInvitesPage` (+ `Sparkline`, `PriceDelta`, `HealthDot`, `InviteCreatorPanel`)                                                                        |
| `design-canvas.jsx`    | Presentation chrome only — not part of the production app                                                                                                                                        |

---

## Design Tokens

The admin surface ships with **two themes** — `light` (default) and `dark`. Both define the same token names; consumers always read via `var(--token)`. Full definitions in `admin-theme.jsx`.

### Light theme (default)

```
/* Surfaces — warm paper neutrals */
--bg:            #f7f5f0
--bg-elevated:   #ffffff
--surface-1:     #f0ede5
--surface-2:     #e6e2d8
--ink:           #1f1d18
--paper:         #f7f5f0

/* Foregrounds */
--fg:            #1f1d18
--fg-muted:      #5e5a52
--fg-subtle:     #8a857a
--fg-on-accent:  #ffffff

/* Borders & overlays */
--border:        #e2dfd6
--border-strong: #c9c5b8
--overlay-hover: rgba(31,29,24,0.05)

/* Status palette */
--success:       #2f7a4d   /* OK, approved */
--warning:       #b87514   /* partial, low-conf, paused */
--danger:        #b8381a   /* failed, blocked, revoked */
--signal:        #1d5fbf   /* primary action, "live" */
--accent:        #7a3aa8   /* editorial accent, LLM badge */

/* Shadows */
--shadow-sm: 0 1px 2px  rgba(31,29,24,0.06)
--shadow-md: 0 4px 12px rgba(31,29,24,0.08)
--shadow-lg: 0 12px 32px rgba(31,29,24,0.16)
```

### Dark theme

```
--bg: #15140f       --bg-elevated: #1c1a14
--surface-1: #23211a    --surface-2: #2c2922
--fg: #eeeae0       --fg-muted: #9b968a    --fg-subtle: #6c6759
--border: #2f2c24       --border-strong: #48443a
--success: #5fc28a      --warning: #e2a04a     --danger: #ea6d50
--signal: #7ab4ff       --accent: #c89bf0
```

**Implementation note**: wire tokens up as Tailwind theme extensions (or CSS vars on `:root` with a `data-admin-theme` attribute on `<html>`). Persist user choice in localStorage as `cc-admin-theme`. Default to system preference on first visit. The consumer app (`design_handoff_phase5b_screens`) uses a different theme system (`electric` / `jade` / `light`) — keep them isolated; the admin tokens above are admin-only.

### Typography

- **Inter** — UI text, headings, body. Weights used: 400, 500, 600, 700, 800.
- **JetBrains Mono** — IDs, costs, timestamps, tabular numbers, small-caps labels (`MonoLabel`), badges set with `mono`.
- Numbers should always render with `font-variant-numeric: tabular-nums` for column alignment.
- Two font constants at the top of `admin-primitives.jsx`: `ADMIN_FONT`, `ADMIN_MONO`.

### Type scale used

| Role                    | Size  | Weight                                |
| ----------------------- | ----- | ------------------------------------- |
| Page H1 (`SectionHead`) | 26    | 700                                   |
| Greeting H1             | 26    | 700                                   |
| Inspector H2            | 20–22 | 700                                   |
| Panel title             | 14    | 700                                   |
| Body                    | 13    | 400/500                               |
| Stat number             | 30    | 700 (mono)                            |
| Stat number (inline)    | 22    | 700 (mono)                            |
| Mono label / eyebrow    | 10    | 700 (uppercase, 0.1em letter-spacing) |
| Code/IDs                | 11–12 | 600 (mono)                            |
| Kbd                     | 10    | 600 (mono)                            |

### Spacing

4px grid: 4 / 6 / 8 / 10 / 12 / 14 / 16 / 18 / 20 / 22 / 24 / 28 / 32. Page gutters `24–28px`. Card padding `16–22px`. Panel section gaps `18–24px`. Stat grids use `gap: 16`. Table cell padding `12px 14px` (header `10px 14px`).

### Radii

- Buttons / chips / inputs: `6–8px`
- Cards / panels / tables: `12px`
- Pills / badges: `999px` (full)
- Browser frame chrome: `12px`

### Shadows

Used sparingly. Stat cards and tables get a hairline border + `--bg-elevated`, no shadow. Use `--shadow-md` on the BulkActionBar (floating dock) and `--shadow-lg` on the AdminBrowserFrame's outer drop-shadow.

---

## Information Architecture

The sidebar is the IA. Order matters.

```
Dashboard            /admin
Venues               /admin/venues
Crawl                /admin/crawl              (badge: count of failed/blocked runs, danger)
Event review         /admin/events             (badge: count of pending events, warning)
Prices               /admin/prices
Invite codes         /admin/invite-codes
Settings             /admin/settings
```

`Crawl` and `Event review` always show a numeric badge when there's pending work — these are the two pages that should pull Hugh's attention.

Nav items defined in `NAV` const (`admin-shell.jsx`). Each is `{ key, label, icon, href, badge?: { count, kind } }`.

---

## Sidebar variations

Three modes — implementation must support all three.

| Mode   | Width | Use                                                                                                                                      |
| ------ | ----- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `full` | 240   | Default desktop. Labels + badges visible.                                                                                                |
| `rail` | 64    | Icon-only collapse. Active item shown by left rail; badges become a single dot in the corner. Tooltip on hover (use the icon's `title`). |
| `auto` | n/a   | Collapse to rail under 1280px viewport; expand on hover. The canvas renders the post-hover expanded state visually.                      |

State persists in localStorage as `cc-admin-sidebar`.

The sidebar's bottom region holds: theme toggle, account chip, "Inbox" toggle (NOT a bell icon — operationally we call it Inbox; unread count shows as a small dot on the icon when collapsed, as a badge when expanded).

---

## Components

### `StatusBadge` — status taxonomy

`kind` × `variant` matrix. **Always use the named `kind`** rather than picking a color. The mapping is what carries the meaning.

| `kind`    | Meaning                           | Examples                                                          |
| --------- | --------------------------------- | ----------------------------------------------------------------- |
| `success` | All good, approved, OK            | "Active", "Success", "Approved", "Allowed"                        |
| `warning` | Partial / low-confidence / paused | "Partial", "Low conf.", "Paused", "Possible duplicate"            |
| `danger`  | Hard failure / blocked / revoked  | "Failed", "Blocked", "Revoked", "403", "No price"                 |
| `signal`  | Live / running / primary          | "SSE LIVE", "Running", "Active" (invite), "structured" (strategy) |
| `accent`  | LLM-related editorial accent      | "llm" (strategy badge)                                            |
| `neutral` | Inert / draft / unknown           | "Draft", "Expired", "unchecked"                                   |

Variants:

- `soft` (default) — tinted bg, colored text
- `outline` — outline + colored text, used for taxonomy chips like strategy
- `mono` — JetBrains Mono, lower-case, tighter — for terminal-feel data badges (`structured`, `llm`, `403`, `+18% wow`, `SSE LIVE`)

`dot` prop adds a 6px colored dot to the left for status rows.

### `StatCard`

```jsx
<StatCard
  label="LLM cost · 30d"
  value="$28.74"
  unit="of $40"            // optional
  hint="71% of budget"     // optional second line, fg-muted
  trend={{ dir: "up", text: "+18%", good: false }}  // optional, tinted by `good`
  kind="signal"            // tints the icon chip; values: success | warning | danger | signal | accent | neutral
  icon="cost"              // AdminIcon name
  footer={<ProgressBar … />}  // optional any node
  onClick={…}
/>
```

Always presented in a 4-column grid on desktop, gap 16. Numbers are `ADMIN_MONO`, weight 700, 30px, tabular.

### `AdminTable`

`<AdminTable>` is a styled `<table>` wrapper with `<THead>`, `<TR>`, `<TH align width mono>`, `<TD align mono color width>` primitives. Header row is `--surface-1`; rows have a 1px `--border` separator on the bottom and a hover state of `--overlay-hover`. Numeric and timestamp columns get `mono` (which sets `font-variant-numeric: tabular-nums`).

Use TanStack Table or equivalent in production. Columns defined per page:

- **Venues**: Venue · Source URL · robots.txt · Strategy · Schedule · Status · Health · Last crawl · Events · ⋯
- **Crawl run history**: Run ID · Venue · Started · Duration · Status · Strategy · Events · LLM cost · Error
- **Prices recent activity**: Event · Venue/Date · Opened · Current · Δ · 14-day sparkline · Last update · ›
- **Invite codes**: Code · Invitee · Status · Created · Redeemed · Expires · Sent by · ⋯

### `Panel`

`<Panel title action padding>` is the wrapper for sectioned content. `title` and `action` go in a 14px-fontSize header strip with a bottom border. `padding={0}` for tables (so the table flush-fits to the panel edge).

### `AdminButton`

Variants: `primary` (signal bg), `outline` (default for toolbars), `ghost` (transparent), `danger`, `success`. Sizes: `sm` (28px), `md` (32px). Props: `icon`, `iconRight` (both AdminIcon names), `fullWidth`, `disabled`.

### `CostText`

Renders a money value in mono with two decimals; zero/dim values render as `$0.00` in `--fg-subtle`. Always use this — never raw money strings.

### `ConfidenceBar` (in `admin-events.jsx`)

A 4px bar + numeric (0.00–1.00) fixed-width readout. Color thresholds: ≥0.80 success, ≥0.70 signal, ≥0.60 warning, <0.60 danger. Used in event-queue rows and the inspector vitals strip.

### `Sparkline` (in `admin-tables.jsx`)

Inline 80×24 SVG line chart for price history. Color follows the row's flag — `flag="spike"` → danger, `flag="soldout"` → fg-subtle, otherwise signal. Last point gets a 1.6px dot.

### `BulkActionBar` (in `admin-events.jsx`)

A floating dark dock that appears at the bottom of the event-review viewport whenever ≥1 row is selected. Shows the count, plus Approve all / Reject / Re-tag / Dismiss. Use `--shadow-lg` and `--ink` background regardless of theme (it's a focus-pulling overlay).

### `Kbd`

Small mono "key" rendered with a hairline border and `--surface-1`. Used in the event inspector's keyboard-cue strip (J/K/A/R) and any future palette/help screens.

---

## Pages

### 1. Dashboard (`/admin`)

Order, top to bottom:

1. **Greeting block** — "Good afternoon, Hugh." + one-line operational summary. Right-aligned: `SSE LIVE` badge, "Run all venues" outline button, "Add venue" primary button.
2. **Stat row** — 4 columns: Pending review · LLM cost (30d) · Crawl health · Active venues. Each is a `StatCard` with footer (action button, mini-bar chart, or progress bar).
3. **Cost panel** — 30-day spend chart on the left (filled area, signal stroke), top-spend breakdown on the right (4 venues with mini progress bars). Header includes a `+18% wow` warning badge and an "Open billing" link.
4. **Two-column row**:
   - **Crawl health · today** — table with 8 rows (one per active venue). Columns: Venue · Status · Last crawl · Strategy · Events · Cost · ›
   - **Activity** — filterable feed (All / Crawl / Events / Invites). Each row: 72px timestamp · 8px colored dot · two-line text+meta.

Data shape examples in `admin-dashboard.jsx`: `VENUE_HEALTH`, `ACTIVITY`, `COST_DAYS`.

### 2. Crawl status (`/admin/crawl`)

The page Hugh opens when something feels off.

1. **`SectionHead`** — eyebrow "Phase 7 · Automation", H1 "Crawl status". Actions: "All venues" · "Run all".
2. **Running banner** _(only when a "Run all" sweep is in flight)_ — full-width, signal-tinted, with a spinner, `done of total` text, current venue name, signal progress bar, and a danger "Abort" button. Hidden when idle.
3. **Issues banner** _(only when any venue is blocked/failing)_ — danger-tinted, summarizes the failures with a "Jump to issues" link.
4. **Stat row** — Last sweep · Today's runs · Events ingested · LLM cost today.
5. **Split view** (the main content):
   - **Left rail (460px)**: latest run per venue. Each item: status dot · venue name (ellipsized) · `RelTime · duration · N ev` · status badge. Active item gets a `--surface-2` background and a 2px signal left border. Filter button in header strip.
   - **Right inspector**: header (run ID + status badge + venue H2 + "Source URL" / "Re-crawl" actions); 4-column vitals strip (Started · Duration · HTTP · LLM cost); events block (Found / Created / Updated as 3 stat tiles); error block (only when failed — danger-tinted with consecutive-failure tally and remediation hint); source preview row; strategy row.
6. **Run history** — full table with pagination, columns above. Last row in the visible page is a totals row (right-aligned, `--surface-1` bg, "Total LLM cost (page)" + sum).

`RUNS` array in `admin-crawl.jsx` documents the data shape per run.

### 3. Event review (`/admin/events`)

1. **`SectionHead`** — "Event review", subtitle "Hugh approves the queue. The newsletter only sends what's been touched here." Actions: "Saved views" · "New event".
2. **Filter rail** — segmented pills (Pending / Low conf. / Duplicates / Approved / Rejected), each with a count chip. Right side: 3 `outline` filter buttons (All venues · Date · Source). Pills color by their `kind` when active.
3. **Split view** (the actual queue):
   - **Left list (480px)**: each row is `[checkbox] [title + confidence bar / venue · date · time / flag chips]`. Active row: surface-2 bg, signal left border. Header strip: "select-all" checkbox + sort label.
   - **Right inspector**:
     - Header: event ID, "Pending review" badge, flag badges (low confidence, possible duplicate), event title H2, venue/date subtitle, action cluster (Reject ghost / Edit outline / Approve success).
     - Vitals strip: Confidence bar · Source · Discovered · Price range. (Price range goes danger when missing.)
     - Duplicate banner (only when flagged) — warning tinted, with "Compare" + "Merge" buttons.
     - **Two-column diff**:
       - Left ("extracted, editable"): editable field rows (Title / Artist / Venue / Date / Doors / Show / Price low / Price high / Tags). Tag row supports `+ tag` chip.
       - Right ("raw source · llm input"): `<pre>` showing the raw HTML the LLM was fed, with the price-extraction line highlighted in warning. Below, an `// llm reasoning` block in mono+muted color explaining the confidence reduction.
     - Footer meta row: Run ID · LLM cost · Tokens · keyboard cues (J/K navigate · A approve · R reject).
4. **`BulkActionBar`** docked at viewport bottom whenever ≥1 row is selected.

Keyboard model: J/K traverse the queue, A/R approve/reject, ⌘Enter on the inspector also approves. (Implementation should use a roving-tabindex pattern.)

### 4. Venues (`/admin/venues`)

Configure crawl targets — each row is essentially a Cloudflare Worker schedule.

1. SectionHead with three actions: Status filter · "robots.txt audit" · "Add venue" primary.
2. Stat row: Total / Active / Paused-or-blocked / Avg health 7d.
3. Big table — bulk-checkbox column · Venue (name + sub-error) · Source URL (mono w/ external icon) · robots.txt badge (allowed / disallowed / unchecked) · Strategy badge · Schedule (mono) · Status badge · Health (dot + %) · Last crawl · Events · row menu.

`VENUES` array in `admin-tables.jsx` is the canonical shape.

### 5. Prices (`/admin/prices`)

1. SectionHead, actions: Venue filter · "Δ > 15%" filter · "Snapshot now" primary.
2. Stat row: Tracked events · Snapshots/24h · Price spikes (`Δ ≥ +15%`) · Sold out.
3. Recent price activity table: Event · Venue/Date · Opened · Current · Δ (with `spike`/`sold out` badge) · 14-day sparkline · Last update · ›.

`PriceDelta` formats deltas with a colored arrow; `+` is danger (price up = bad for fan), `-` is success. The string `"sold out"` is a special case for `delta = -1`.

### 6. Invite codes (`/admin/invite-codes`)

Concert Crawl is invite-only — every code is a referral receipt.

1. SectionHead — "Mint code" primary action.
2. Stat row: Outstanding · Redeemed all-time · Conversion · Subscribers (with patron/free split).
3. **Invite creator panel** — 4-column inline form: recipient email (text input) · tier toggle (Free / Patron) · expires preset (7d / 30d / never) · "Mint code" button. Recipient is optional — blank means manual share.
4. Code log table: Code (mono pill on `--surface-1`) · Invitee · Status · Created · Redeemed · Expires · Sent by (avatar chip + name) · ⋯.

Status taxonomy: `active` (signal, dot) · `redeemed` (success, dot) · `expired` (neutral) · `revoked` (danger, dot).

---

## Interactions & Behavior

- **Theme switch**: instant CSS-var swap, no transition. Persist in localStorage `cc-admin-theme`.
- **Sidebar collapse**: 180ms width transition. Persist in localStorage `cc-admin-sidebar`.
- **Sidebar nav**: clicking a top-level item navigates and updates `active`. Badge counts come from server-side counts (poll or SSE).
- **Crawl "Run all"**: kicks off a server-side sweep, opens an SSE stream. The `RunningBanner` shows live `done/total` and the current venue. Abort sends a kill signal. On completion, banner dismisses and a toast posts.
- **Event approve/reject**: optimistic update — row removes from queue immediately, undo toast for 6s. Bulk actions are confirmation-modal protected for >10 events.
- **Inspector navigation (J/K)**: cycles through the visible queue/list. Selecting wraps at the ends. Inspector content fades in 120ms.
- **Sparklines**: render only after data loads — no skeleton; use a 24px-tall placeholder div instead.
- **Filter chips**: single-select per dimension; clicking the active chip resets to "All".
- **Editable fields in Event inspector**: contenteditable-style inputs; commit on blur, ⌘Enter, or `Approve` click. Show validation inline (no toasts for field errors).
- **`SSE LIVE` badge**: pulses gently (opacity 0.6 → 1.0 over 2s) only while the SSE connection is open. Switches to `SSE CLOSED` (neutral) on disconnect.

---

## State Management

Recommended approach (the prototypes do this in-component; production should lift):

- **Server state**: TanStack Query (or equivalent). Keys: `["venues"]`, `["runs", { venueId, range }]`, `["events", { status, venueId, dateRange }]`, `["prices", { eventId }]`, `["invites"]`, `["crawl-cost", "30d"]`.
- **Live data**: a single SSE connection at `/admin/stream` multiplexes crawl progress, run completions, new events, invite redemptions. Fan out to query caches via custom event handlers.
- **UI state** (local): selected row IDs (Set), filter pills, sidebar mode, theme, inbox open, queue cursor.
- **Mutations**: optimistic with rollback. The undo affordance is part of the toast component — implement before shipping bulk approval.

---

## Empty / Error / Loading States

The canvas's "States" section shows two of these:

- **Queue clear**: green check chip, "Queue is clear." H1, subcopy "Every event has been reviewed. Next sweep runs at 18:00 MT.", "Run sweep now" outline button.
- **Crawl failed (venue blocked)**: danger-tinted card, alert chip, "Crawl failed · venue blocked", subcopy with consecutive-failure context, "View source" + "Re-crawl" actions.

You will also need (not drawn — please implement using the same patterns):

- **Loading**: skeleton rows for tables (3–5 rows of `--surface-1` blocks at row height); for stat cards, render the chrome with `—` placeholder values; never spin the whole page.
- **Network error**: full-bleed danger card with retry; do NOT clear stale data.
- **Permission denied** (non-admin): redirect to consumer app with a brief flash.
- **Empty venues**: "No venues configured." + Add venue CTA — only relevant on first install.

---

## Assets

- **Icons**: drawn inline as Lucide-style SVG strokes inside `AdminIcon` — `dashboard, venues, crawl, events, prices, invites, settings, refresh, plus, x, check, alert, more, chevR, chevL, chevsL, chevsR, edit, filter, search, external, db, activity, users, cost, arrowUp, arrowDn, arrowUR, arrowDR`. Replace with the project's icon library (Lucide React works directly) — names are aligned where possible.
- **Wordmark**: not finalized for admin; can use the consumer wordmark or render the text "concertcrawl./admin" in Inter 800.
- **Avatars**: tiny mono initial chip on `--ink` background — fine to keep until real avatars exist.
- No raster assets are used; no font files need shipping (Inter + JetBrains Mono are loaded from the system or via Google Fonts).

---

## Out of Scope (intentionally deferred)

These were discussed but not designed — coming later:

- **Settings page** — slot reserved in nav, page not designed.
- **Audit log** — likely a sub-page of Settings.
- **User/team management** — single-user (Hugh) for the foreseeable future.
- **Analytics / engagement metrics** — open question whether these belong in admin or a separate ops dashboard.
- **Mobile admin** — no mobile breakpoints. Admin is desktop-only by design (≥1280px).

---

## Implementation Checklist

- [ ] Stand up theme system: 2 themes as CSS vars, `cc-admin-theme` localStorage, `data-admin-theme` attr on `<html>`, instant switch.
- [ ] Build primitive kit (`StatusBadge`, `StatCard`, `AdminTable`, `Panel`, `AdminButton`, `ProgressBar`, `Sparkline`, `MonoLabel`, `CostText`, `RelTime`, `Kbd`).
- [ ] Build shell (`Sidebar` with 3 modes, `AdminTopbar` with breadcrumb + theme toggle + inbox + account, `InboxPanel`).
- [ ] Implement Dashboard page.
- [ ] Implement Crawl status page (split view + run history + SSE running banner).
- [ ] Implement Event review page (split view + filter rail + bulk action dock + keyboard nav).
- [ ] Implement Venues / Prices / Invite codes tables.
- [ ] Wire SSE stream + TanStack Query caches.
- [ ] Empty + error + loading states across all pages.
- [ ] Accessibility pass: focus rings, ARIA on tables, keyboard nav for queue, skip links.
- [ ] Authz gate (admin-only, redirect non-admins).

---

## Open Items

- Confirm the API contracts (run, event, venue, price-snapshot, invite shapes) match the JS data shapes in the prototype JSX files; adjust component prop types to match.
- Decide whether the inbox panel is a separate notifications service or is computed from the same activity feed shown on the dashboard.
- Confirm the cost budget value ($40/mo) and budget-reset cadence — currently hard-coded in the dashboard's CostPanel.
- Confirm "consecutive-failure → auto-pause" threshold (currently shown as 4) — needs product sign-off.
- Confidence-threshold value for the "Low conf." pill (currently 0.70) — should be tunable from Settings.
