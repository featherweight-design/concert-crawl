# Concert Crawl — Admin V2 (design update batch)

> **Scope.** Five surfaces, one batch. Tokens, primitives, and the type/spacing system from `design_handoff_admin_ui/` are **unchanged** — this is layout + workflow design, not a visual restyle. Side-by-side artboards live in `Admin V2 Canvas.html`.

Open `Admin V2 Canvas.html` first.

---

## Update — addressing eng review feedback (May 20)

This round addresses the eight items raised after the first canvas review.

### 1. Dashboard layout → stacked

The 2-column (AttentionFeed | CostPanel + Engagement) is replaced with a single stacked column: Greeting → StatRow → AttentionFeed → CostPanel → Engagement placeholder. Predictable scroll, no horizontal scanning between attention and cost. Both feed variants (A mixed / B grouped) still toggle via Tweaks.

### 2. AppSwitcher — confirming the direction

**Yes, the topbar AppSwitcher replaces the sidebar back-to-app link.** Reasoning:

- The sidebar slot is below the nav fold — easy to miss, requires scrolling on shorter viewports.
- A glanceable segmented pill in the topbar is closer to how Hugh thinks about the two surfaces — they're peer contexts, not parent/child.
- AppSwitcher is symmetric (you see both User app + Admin in the same control whichever side you're on), so it works once we wire the inverse on the consumer side.
- The sidebar's bottom row gets reclaimed for the avatar + user info (already there).

If you want to keep both for the transition, add a small "Open consumer app ↗" link in the sidebar footer — design takes 5 minutes to add. Just say.

### 3. "Add price" inline form (Review)

Clicking "Add price" on a missing-price row opens an inline form panel **directly under that row** (no modal, no separate page). Fields: low ($), high ($), source note (optional, free text). Validation: low ≤ high, both > 0. Cancel / Save price buttons. Mobile uses the same form rendered full-width with stacked inputs. Admin prices save with source = `admin`, and pick up the `STALE` flag after the staleness threshold (still doesn't block future community submissions per the brief).

Artboard: **Review · 'Add price' inline form** + **Review · mobile · Add price inline**.

### 4. Mobile Prices tab content

Mobile Review's Prices tab now actually renders. Three stacked panels — same arrangement as desktop's Option C:

1. **Community submissions** (only when any) — submitter handle + note + Approve/Deny buttons
2. **Needs price** — missing-price rows with inline "Add" button (expands inline)
3. **Has price** — current price + source badge

Artboard: **Review · mobile · Prices tab**.

### 5. Staged Apply confirmation flow (Crawl Diagnostics)

Clicking **Apply** on a staged option opens a confirmation modal:

- Why this change (one-liner)
- **Config diff** — `path: before → after`, rendered like a unified diff (red −, green +)
- **Risks** — bullet list (rule-based, written per option)
- **Rollback** — one click from the strategy history log
- **Next run** — when the change takes effect
- "Trigger re-crawl now" checkbox at the bottom of the action shelf
- Apply / Cancel buttons

Three option diffs are written: `opt-headers` (low-risk), `opt-delay` (medium), `opt-llm` (high-risk; flags cost jump + confidence drop). Add more as new options land.

Artboards: **Crawl · Apply confirm modal**, **Crawl · Apply confirm · 'Switch to LLM'** (higher-risk variant).

### 6. Generate UI in full venue detail page context

New file `admin-venue-detail-v2.jsx` ships a complete `<VenueDetailPageV2/>` covering every editable field, with the GenerateField embedded inline next to About/Capacity/Neighborhood. Sections:

| Section           | Fields                                                                                                    |
| ----------------- | --------------------------------------------------------------------------------------------------------- |
| 01 · Identity     | name, slug (auto-derived), source URL (with robots chip), city, status (active/paused/blocked seg toggle) |
| 02 · Ticketing    | primary vendor (select), default ticket URL                                                               |
| 03 · Crawl config | extraction strategy, schedule (cron), request delay (ms), wait selector                                   |
| 04 · Editorial    | **About** (generate), **Capacity** (generate), **Neighborhood** (generate)                                |
| 05 · Identity art | preview + regenerate button (Phase 7.5 generative cover)                                                  |
| Danger zone       | Pause crawl · Delete venue                                                                                |

Sticky save bar at the bottom shows unsaved-change count + Discard/Save. Artboards: **Venue detail · FULL form**, **Venue detail · Generate · loading**.

### 7. Mobile drawer Account section

Verified: drawer renders both `Operations` (Dashboard / Venues / Crawl / Review / Feedback) **and** `Account` (Invite codes / Settings) sections, with section headers. The bottom tab bar still shows 5 ops items (no room for 7); Settings + Invite codes are drawer-only on mobile, which matches how rarely they're tapped.

### 9. Identity Art — editable controls (round 3)

The Identity Art section now ships Namespace (Venue / Artist seg toggle) + Seed (mono input with "Roll" button) + a Phase-8 photo-swap warning strip. Matches the original JSX comment intent so the copy is no longer contradictory. Artboard: **Venue detail · FULL form**.

### 10. Delete venue modal (round 3)

Follows the `DeleteAccountConfirm` pattern from `design_handoff_profile_settings_v2/`:

- Centered modal, 3px danger top border
- "Destructive action" eyebrow
- Title: "Delete {venue name}?"
- Explicit "what gets removed" + "what survives" lists (events + fan-submitted prices survive, orphaned)
- `DELETE`-typed gate — primary button reads "Type DELETE to enable" disabled, arms to red "Delete forever" once typed exactly
- "Keep venue" secondary + danger button on bottom shelf
- Plain-and-clear voice (matches the Delete account decision: irreversibility wins over cleverness)

Artboards: **Venue detail · Delete modal · typing** and **Venue detail · Delete modal · DELETE typed (armed)**.

### 11. Price row overflow menu (round 3)

Popover anchored to the `⋯` button. Three actions, matching engineering's call:

- **Edit price** — opens the same inline form as "Add price" but pre-filled
- **Mark stale** — only enabled for `admin`-source rows; disabled chip explains why ("admin prices only" / "already stale")
- **Remove price…** — destructive (red). Real impl uses a small mini-modal (not drawn — same shape as DeleteVenueConfirm minus the typed gate, since a single price is reversible enough that a typed gate is overkill)

Artboard: **Review · price row overflow menu**.

---

### 8. Bulk approve flow (Review · Event flags)

Each flag row gets a checkbox; the panel header has "Select all". When ≥1 row is selected:

- **Bulk action dock** appears (sticky to viewport bottom, centered): count chip · Re-tag · Reject all · **Approve {N}** · Clear-selection X
- Clicking Approve opens a **confirmation modal** with:
  - Preview list of the events being approved (first 5 + "…and N more")
  - Confidence bars per item
  - Warning callout if any below 0.70 confidence
  - Cancel / Approve {N} buttons

Per v1 behaviour: the confirm modal triggers for selections >10. We show it on smaller selections too in this canvas so the path is visible. Implementation can skip the modal for ≤10 selections.

Artboards: **Review · multi-select · bulk dock visible**, **Review · bulk approve confirm modal**.

---

---

## What changed, top-down (initial design notes)

### 0 · Shell — new nav + app switcher + mobile

- **Sidebar nav (new order):** Dashboard / Venues / Crawl / **Review** / **Feedback** / Invite codes / Settings. `Events` + `Prices` are gone — both folded into Review. `Feedback` slotted under Operations (between Crawl and Review's neighbour Invite codes is in Account). Badge math: Review badge = pending event flags + pending price submissions; Feedback badge = unread items.
- **AppSwitcher.** New segmented pill in the topbar (`User app | Admin`). Fixes Hugh's stated pain: previously Admin was a one-way trip (back-button or URL edit to return). Now glanceable both directions. Lives in the topbar and in the mobile drawer.
- **Mobile shell** (`<= 720px`): hamburger drawer for full nav, bottom tab bar surfacing the 5 most-used items (Dashboard, Venues, Crawl, Review, Feedback). Compact AppSwitcher stays in the topbar. Designed so Hugh can triage from his phone — every page renders cleanly down to 390px.

Components: `SidebarV2`, `AdminTopbarV2`, `AppSwitcher`, `MobileShell`, `AdminShellV2` (in `admin-shell-v2.jsx`).

### 1 · Review (NEW page — replaces `/admin/events` + `/admin/prices`)

One moderation page, two sections:

- **Section A — Event flags.** Low-confidence events that didn't auto-approve. **Most days this is empty** — collapsed to a single "queue clear" strip ("Queue is clear. Next sweep runs at 18:00 MT."). When items exist, it's a left-list + right-inspector split inside the panel. Inspector shows: confidence bar, **LLM reasoning** (tinted accent card), raw source `<pre>`, run/cost/tokens footer. Approve/Reject/Edit shelf at the bottom.
  - Optional filter chip: "Hide non-concert" (comedy / trivia / private). Marked low-priority by the brief.
- **Section B — Price coverage.** Three things, three sub-panels (see "Price exploration" below):
  - **Pending submissions** (only renders when there are any) — community-submitted prices with submitter handle, note, "Approve · award cred" + "Deny" buttons. Admin approval supersedes the normal two-approval threshold.
  - **Coverage table** — every upcoming event with title · venue/date · source badge (`crawled` / `community` / `admin` / `no price`) · current price · updated. Missing-price rows have an inline "Add price" admin entry. Admin prices flagged `STALE` after a threshold (don't block future community subs).
  - **No pipeline controls**, no source-health table, no per-event trigger — removed per brief.

#### Price exploration (3 sub-arrangements explored)

The artboard on canvas uses **option C** ("one stacked flow, sorted by need"). Tried:

- **A. Three stacked panels** (pending → coverage → admin entry inline per row). Clear separation; works when pending list is short.
- **B. Tabs within Section B** (Coverage / Pending / Add). Clean, but hides the pending count and adds friction for a triage step that should be one-glance. Not recommended.
- **C. ✅ Picked.** Pending submissions render first when present (auto-hide otherwise). Coverage table follows, sorted so missing-price rows surface to the top. Admin price entry is an inline button on missing-price rows — no separate flow. Most actionable per click; respects the "data should be relevant and actionable" call.

#### Layout exploration (Section A + B arrangement)

- **Stacked (default, on canvas).** Flags up top, prices fills the rest. Clean and stable. When flags is empty, the queue-clear strip is tiny and barely takes vertical space.
- **Data-adaptive (also on canvas).** Two-column when flags has items (flags rail on the left, pending submissions on the right, inspector card below the row). Full-width prices when flags is empty. Higher density on busy days; cleaner on quiet ones.

**Recommendation: Stacked.** Predictable layout > clever responsiveness. Hugh's eye should land in the same place every visit. Data-adaptive is shown as an option but the stacked direction is what we'd ship.

Components: `AdminReviewPage`, `EventFlagsSection`, `EventFlagInspector`, `PendingSubmissionsPanel`, `PriceCoverageTable`, `ConfidenceBarV2`, `SourceBadge` (in `admin-review.jsx`).

### 2 · Dashboard — attention feed + layout cleanup

- **Greeting:** kept the line, **removed "Run all venues" + "Add venue" CTAs**. Those belong on their own pages.
- **Stat row:** unchanged (Pending review → renamed "Needs review", LLM cost 30d, Crawl health, Active venues).
- **Attention feed** replaces the chronological activity log. Medium density (per your call) — two-line items: primary headline + secondary meta + relative time + jump-to action. Severity-tinted icon chip on the left.
- **Item types covered:**
  - `crawl.failed` / `crawl.consecutive` (danger) → link to crawl inspector
  - `event.flags_pending` (warning) → count + link to Review
  - `price.pending` (signal) → count + link to Review
  - `invite.redeemed` (neutral) → no link, low-priority
- **Successful crawls roll up** to a single digest row at the bottom: "18 venues crawled cleanly · last sweep 3:02 AM · 89 events ingested" — never listed individually.
- **Engagement digest placeholder** card next to the cost panel — slot reserved for watch interactions / show views / venue views once the engagement pipeline lands. Renders as a dashed `coming soon` card; not in the way.

**Two attention-feed variants explored** (Tweak panel toggles):

- **A. Mixed severity.** Items sort by severity within a single list. Cleanest read for low-volume days. ✅ Default.
- **B. Grouped.** Items grouped under labelled headers (Failures / Review queue / Submissions / Engagement). Better when 10+ items pile up. Probably not your reality often — but available.

Components: `AdminDashboardV2`, `AttentionFeedA`, `AttentionFeedB`, `AttentionItem`, `EngagementPlaceholder` (in `admin-dashboard-v2.jsx`).

### 3 · Crawl — Diagnostics tab on the inspector

Per your call, **dedicated tab** rather than inline expansion. Inspector header now has three tabs:

- **Overview** — vitals + events block + source preview + current strategy. The error block is **moved out of Overview** — it now lives entirely in Diagnostics.
- **Diagnostics** (only enabled when `status ∈ {failed, blocked}`; auto-selected when entering a failed run):
  - **What happened.** HTTP status, error class (`bot_detection` / `rate_limit` / `parse_failure` / `timeout`), consecutive failure count (`3 of 4`), first observed. Last 3 attempts shown inline.
  - **Why it probably happened.** Rule-based one-liner mapped from error class. Tagged `rule-based` so it's clear this is **not** AI-generated.
  - **Options.** Cards of next steps, each with a "rec." badge on the recommended one. Clicking a CTA **stages** the change — switches to a "Staged" pill with Apply/Discard. Nothing is auto-applied. Each error class has its own option set:
    - `bot_detection` → header swap (rec.) · Playwright session · manual entry
    - `rate_limit` → increase delay 8s (rec.) · reduce schedule
    - `parse_failure` → switch to LLM (rec.) · refresh selectors
    - `timeout` → render timeout 30s (rec.) · wait for selector
  - **Strategy history.** Reverse-chronological log of which extraction strategies have been tried in the last N runs, with outcome chips. Newest row tinted danger so the pattern jumps out.
  - **Terminal state**: when all strategies are exhausted, Options collapses to a "No viable crawl path" card with a single CTA: "Switch to manual entry." On canvas as a separate artboard.
- **History** — the strategy history log standalone, no diagnostics chrome.

Components: `CrawlInspectorV2`, `InspectorTabs`, `DiagnosticsPanel`, `WhatHappenedSection`, `WhyHappenedSection`, `OptionsSection`, `StrategyHistorySection`, `OverviewPanel`, `ERROR_REASONS`, `DIAG_OPTIONS_BY_CLASS` (in `admin-crawl-v2.jsx`).

### 4 · Venues — row expansion + Generate UI

- **Accordion row.** Chevron expands a quick-view panel directly under the row, pushing the table down. One open at a time (per your call). Clicking the venue **name** still navigates to the detail page; the chevron is the expand-only affordance.
- **Quick-view contents:** ticket vendor + URL (monospace, external icon), crawl schedule (cron + human label), extraction strategy badge, consecutive failure count (`N of 4`, tinted), robots.txt status, last error strip (red when consecutive failures > 0). Action shelf at the bottom: Run crawl now / Edit / Open detail / Crawl history.
- **Detail page unchanged** for: edit form, status, full run history, sparkline, manual trigger, delete.
- **Generate UI** (`<GenerateField/>`) for About / Capacity / Neighborhood — full state coverage:
  - `idle` — field shows current value (or empty) + "Generate" pill button with estimated cost (`~$0.0042`).
  - `loading` — signal-tinted strip with spinner + "Generating… ~3–5s" + Cancel.
  - `review` — accent-tinted suggestion card with the candidate text + `llm` badge + cost + tokens + sources (e.g. `Wikipedia · venue website`). Buttons: Accept (success) · Regenerate · Discard · Edit before accept.
  - `accepted` — field gets a faint success tint, "Generated · accepted" pill above it. Edit clears the pill on save. Regenerate stays available.
  - `error` — red strip with `Generation failed — model returned no usable output.` + Retry.

Components: `AdminVenuesPageV2`, `VenueQuickView`, `GenerateField`, `GenerateButton`, `VenueDetailGenerateDemo` (in `admin-venues-v2.jsx`).

### 5 · Feedback (NEW page — `/admin/feedback`)

A triage inbox, not a thread tracker. Designed for one operator (you).

- **Sources:** today, the user-facing `<FeedbackSurface/>` modal. Filter rail toggles include Sentry (off by default but plumbed) and Email (`soon` chip). Per your call: built so adding sources doesn't require a redesign.
- **Item lifecycle:** `unread → read → flagged → issue_opened → resolved → archived`. Unread + flagged are "active"; resolved + archived drop out of the default view (still reachable via filter).
- **Filter rail** (left, sticky): view filters (All / Unread / Flagged / Issue opened / Resolved / Archived) with counts, plus source toggles below.
- **Row collapsed view:** handle (mono, accent) · category pill · status pill · screenshot indicator · first-line body · relative time · ID. Unread rows get surface-2 background + a dot in the gutter.
- **Row expanded view:**
  - Full body (in a tinted card).
  - Screenshot slot (striped placeholder if attached — replace with real image renderer in prod).
  - **Admin notes** textarea (internal-only).
  - **Context strip:** route · theme · build · device · submitted timestamp · user ID. Mono'd, key/value pairs.
  - **Linked GH issue** card if `issueUrl` is set (accent-tinted, with copy-link). Otherwise: "Stage a GitHub issue from this feedback's body + context strip" + "Open in GitHub…" CTA. The button drops you into a pre-filled GH new-issue page (it builds the URL with the title + body + labels; admin reviews/edits before submitting).
  - **Action shelf:** Mark read · Flag for investigation · Open in GitHub · View user · Resolve · Archive.

Voice follows the existing Feedback Modal direction — "Holler at us." / "Loud and clear." / "Signal lost." Empty state: "Nothing in this view. When users holler, they'll land here."

Components: `AdminFeedbackPage`, `FeedbackRow`, `FeedbackExpanded`, `FeedbackFilterRail`, `CATEGORY_META`, `STATUS_META` (in `admin-feedback.jsx`).

---

## Mobile responsiveness

Every page has a mobile artboard on the canvas. The pattern:

- **Layout:** stack-everything; tables become cards; split-views become tabbed views with one pane visible.
- **Chrome:** `<MobileShell/>` provides the hamburger + bottom tab bar.
- **Hit targets:** 44px minimum (action buttons, tab bar items, chevrons).
- **Mobile-specific tabs in Review:** Event flags / Prices (since both sections can't share the viewport).
- **LLM reasoning** in mobile Review uses native `<details>` to collapse by default — keeps cards short while preserving the data.

---

## File map

| File                        | Purpose                                                                              |
| --------------------------- | ------------------------------------------------------------------------------------ |
| `Admin V2 Canvas.html`      | The handoff canvas — open this first                                                 |
| `admin-shell-v2.jsx`        | `NAV_V2`, `SidebarV2`, `AdminTopbarV2`, `AppSwitcher`, `MobileShell`, `AdminShellV2` |
| `admin-dashboard-v2.jsx`    | `AdminDashboardV2` + attention-feed variants + mobile                                |
| `admin-review.jsx`          | `AdminReviewPage` + sections + mobile + exploration variants                         |
| `admin-crawl-v2.jsx`        | `CrawlInspectorV2` + `DiagnosticsPanel` + `OverviewPanel`                            |
| `admin-venues-v2.jsx`       | `AdminVenuesPageV2` (accordion) + `GenerateField` + mobile                           |
| `admin-venue-detail-v2.jsx` | `VenueDetailPageV2` — full editable form with Generate UI in context                 |
| `admin-feedback.jsx`        | `AdminFeedbackPage` + row + expanded + mobile                                        |
| `design-canvas.jsx`         | Canvas chrome (copied from v1)                                                       |
| `tweaks-panel.jsx`          | Tweaks shell (copied from v1)                                                        |

V2 references **v1's `admin-theme.jsx`, `admin-primitives.jsx`, `admin-shell.jsx`** (for `AdminBrowserFrame`), and **v1's `admin-crawl.jsx`** (for `RunningBanner`, `IssuesBanner`, `CrawlStats`, `RunHistory`, `RUNS`). Tokens, type, and primitives are untouched.

---

## Open items / next tickets

- **Saved views in Review.** The brief implies operators may want named slices (e.g. "flagged this week", "non-concert filter on"). Not designed in this batch — flag for next round if desired.
- **Feedback → GH issue body template.** The "Open in GitHub…" link composes the body from feedback + context. The exact template (labels, repo, milestone) is implementation-defined; ask if you want me to mock the pre-fill preview.
- **Mobile drawer haptics + slide.** Mocked as a static open state; real impl should animate the sheet + apply scrim.
- **Engagement digest** is a placeholder slot. When you're ready to spec the data shapes, we'll design the real card.

---

## Notes on the existing system that stayed

- All `--surface-*`, `--fg-*`, `--success/warning/danger/signal/accent`, `--border-*` tokens used unchanged.
- `StatusBadge` taxonomy unchanged — Review uses `warning` for flagged events, `signal` for pending submissions, `success` for queue-clear / resolved.
- Inspector pattern from v1 Event review carried directly into Review Section A.
- `StatCard`, `Panel`, `AdminTable`, `AdminButton` all v1 primitives.
- CCMark + wordmark lockup unchanged. No new logo work.
