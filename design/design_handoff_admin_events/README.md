# Concert Crawl — Admin · Event Management (search + delete)

> Open **`Admin Event Management.html`** first — pan/zoom design canvas, click any artboard to focus (←/→/Esc).

A working admin surface for finding **any** event in the system — verified or not — and acting on it. Fills the gap the brief names: once an event auto-approves (crawl confidence ≥ 0.7) it disappears from `/admin/review` and there's no path back to it. Real case: non-concert junk like _"Swing Nights" @ Cervantes_ slips past auto-approve and can't be cleaned up. This surface is that cleanup tool.

---

## Decisions locked with Hugh (Jun 16)

1. **Theme tokens = consumer Electric / Jade / Light** (`theme-context.jsx`), _not_ the old admin light/dark set. Admin now shares the user-app token system. Every color reads `var(--*)`. Default **Electric**; Jade + Light shown in the Themes section.
2. **Placement = three tabs on Review (Option B), desktop + mobile alike:** **`Event flags · Prices · All events`**. Desktop drops the old _stacked_ Review page for the same tab pill mobile already used; **Event flags** and **Prices** render from the real `EventFlagsSection` / `PendingSubmissionsPanel` / `PriceCoverageTable` (content unchanged — it just moves into tabs). **All events** is the new surface. No new nav item; Community Prices / Price Coverage stay folded into the Prices tab.
3. **Fully responsive.** Desktop is the primary surface; a complete mobile pass ships too (list, filters sheet, action sheet, delete sheet, select-mode + bulk, empty).
4. **Per-row actions = single `⋯` overflow menu** (matches the price-row menu in Review).
5. **Delete weight:** single delete = simple confirm; **bulk delete = typed-`DELETE` gate** (mirrors `DeleteVenueConfirm`).
6. **"Mark non-concert" = one action:** sets the `non-concert` genre tag **and unpublishes** from the consumer app. Does **not** delete; re-publishable.
7. **One locked direction** with every required state — minimal exploration, per entrenched admin patterns.
8. **Filters = inline filter bar** above the table (not a left rail).

---

## What's on the canvas

| Section                | Artboards                                                                                                                                                 |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Review (tabs)**      | All events tab (full desktop shell) · Event flags tab · Prices tab · **Missing tab** — all on the new 4-tab pill                                          |
| **List & filters**     | Populated list · Missing-data multi-select open · Venue dropdown open · Sort menu open                                                                    |
| **Row & bulk actions** | Row `⋯` overflow menu (incl. status + sold-out actions) · Mark non-concert confirm · Bulk selection dock                                                  |
| **Edit event**         | In shell (idle) · Dirty + save bar · Validation errors · Status = Postponed · Sold out + provenance · Delete confirm                                      |
| **Missing-from-crawl** | Missing tab (desktop) · All-accounted-for empty                                                                                                           |
| **Delete**             | Single delete (simple confirm) · Bulk delete · type DELETE · Bulk delete · armed                                                                          |
| **Empty & loading**    | No-results empty ("Crickets.") · Table loading skeleton                                                                                                   |
| **Themes**             | Electric · Jade · Light                                                                                                                                   |
| **Mobile**             | All events list · Prices tab · Missing tab · Edit event · Select mode + bulk bar · Filters sheet · Row action sheet · Delete sheet · Empty · List (Light) |

---

## Files

| File                          | Exports                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Admin Event Management.html` | The canvas (loads everything below)                                                                                                                                                                                                                                                                                                                                                                                           |
| `admin-events-mgmt.jsx`       | `ALL_EVENTS`, `emMissing`, `EventStatusBadge`, `GenreCell`, `MissingChips`, `LifecycleBadge`, `VerifyMark`, `SearchInput`, `VerificationSegmented`, `FilterField`, `FilterPopover`, `EventsFilterBar`, `EventRowMenu`, `EmCheckbox`, `EventsTable`, `BulkDock`, `DeleteEventConfirm`, `BulkDeleteConfirm`, `MarkNonConcertConfirm`, `EventsEmptyState`, `EventsLoading`, `ReviewTabs`, `AllEventsContent`, `ReviewEventsPage` |
| `admin-missing.jsx`           | `MISSING_EVENTS`, `MissedChips`, `MissingActions`, `MissingRow`, `MissingSection`, `MissingMobileCard`, `MissingMobile`                                                                                                                                                                                                                                                                                                       |
| `admin-event-editor.jsx`      | `EditField`, `EditSegmented`, `EditSection`, `SrcTag`, `StatusSection`, `SaveBar`, `DangerZone`, `EditorHeader`, `EventEditorPage`, `EventEditorMobile`                                                                                                                                                                                                                                                                       |
| `admin-events-mobile.jsx`     | `MobilePhone`, `MobileFilterStrip`, `MChip`, `EventMobileCard`, `EventsMobileList`, `MobileActionSheet`, `MobileFiltersSheet`, `MobileDeleteSheet`, `MobileBulkBar`, `MobileEmpty`, `ReviewHeaderMobile`, `MobileAllEventsBody`                                                                                                                                                                                               |
| `admin-primitives.jsx`        | _(copy)_ `AdminButton`, `StatusBadge`, `AdminTable`/`THead`/`TR`/`TH`/`TD`, `Panel`, `MonoLabel`, `AdminIcon`, `RelTime`, `Kbd`, `ADMIN_FONT`/`ADMIN_MONO`, …                                                                                                                                                                                                                                                                 |
| `admin-shell-v2.jsx`          | _(copy)_ `SidebarV2`, `AdminTopbarV2`, `AppSwitcher`, `MobileShell`, `NAV_V2`                                                                                                                                                                                                                                                                                                                                                 |
| `admin-review.jsx`            | _(copy)_ reused: `ConfidenceBarV2`, `SourceBadge`, `EventFlagsSection` (the "Queue" tab)                                                                                                                                                                                                                                                                                                                                      |
| `theme-context.jsx`           | _(copy)_ `ThemeProvider`, `CC_THEMES` (electric/jade/light), `ThemeSwitcher`                                                                                                                                                                                                                                                                                                                                                  |
| `design-canvas.jsx`           | _(copy)_ canvas chrome — not production                                                                                                                                                                                                                                                                                                                                                                                       |

These are **in-browser React prototypes** (Babel-standalone), design references — not ship code. Accurate about layout, hierarchy, copy, tokens, status semantics, column order, states. Not about data fetching / state management / a11y.

---

## Token reference (consumer system — `var(--*)`)

| Use                                          | Token                                                 |
| -------------------------------------------- | ----------------------------------------------------- |
| Page / surfaces                              | `--bg`, `--bg-elevated`, `--surface-1`, `--surface-2` |
| Text                                         | `--fg`, `--fg-muted`, `--fg-subtle`, `--fg-on-accent` |
| Lines                                        | `--border`, `--border-strong`                         |
| Primary / live / CTAs                        | `--signal`                                            |
| Verified / approve                           | `--success`                                           |
| Unverified / missing-data / mark-non-concert | `--warning`                                           |
| Delete / destructive / no-genre              | `--danger`                                            |
| Brand presence (logo halo, wordmark accent)  | `--accent` — _not used for CTAs here_                 |
| Modal scrim                                  | `--scrim`                                             |

**Status taxonomy on this surface:** Verified → `success` (dot badge). Unverified → `warning` (dot badge). Missing-data flags (`no price`, `no time`) → `warning` outline-mono chips. `no genre` → `danger` outline-mono chip. Genre tags → `neutral` mono chips. Confidence bar thresholds (from `ConfidenceBarV2`): ≥0.80 `success`, ≥0.70 `signal`, ≥0.60 `warning`, <0.60 `danger`.

---

## Update — Edit event · Status lifecycle · Missing-from-crawl (Jun 16)

Folded into the same pass after the editor-gap review.

### Two independent axes (glossary)

| Axis                         | Values                                 | UI label                                                 | Notes                                                                                                                                          |
| ---------------------------- | -------------------------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status** = `events.status` | `upcoming` · `postponed` · `cancelled` | **"Status"** everywhere (column, filter, editor section) | UI label intentionally tracks the schema column name to avoid `status`/`lifecycle` drift. `LifecycleBadge` is an internal component name only. |
| **Verification**             | `verified` · `unverified`              | **"Verification"** (segmented filter) / verified mark    | moderation axis                                                                                                                                |

In the table they share one **Status** cell: status pill on top, verified/unverified mark beneath. Filters: a **Status** dropdown (upcoming/postponed/cancelled) sits next to the verified/unverified segmented.

**Publish semantics:** _postponed_ and _cancelled_ stay **published** with a fan-facing banner (people who saved it must know) — they do **not** unpublish. Only **Mark non-concert** (unpublish) and **Delete** (remove) pull an event off the consumer app.

### Quick status row actions (All events `⋯` menu)

View detail · Edit… · — · Verify / Send back to review · **Mark postponed** · **Mark cancelled** · **Mark upcoming** (revert, shown only when not upcoming) · **Mark sold out / Mark available** (sibling pair) · Mark non-concert · — · Delete… Single-click flips don't require opening the editor.

### Sold out — report-backed, parity with postponed/cancelled

Sold-out is **orthogonal to lifecycle** and deliberately **not** in the `events.status` enum (it's transient — sold out, release, sold out again — and the `event_reports` model already handles that volatility). **Mark sold out** creates + resolves + promotes an **admin-authored sold-out `event_report`** — same record shape the community submits — so the consumer banner is one code path regardless of source. Same publish semantics as postponed/cancelled: stays visible, banner does the work. In the editor it's an **Availability** control sitting _beside_ (not inside) the Status segmented; toggling Sold out reveals optional provenance (source / URL / note) mirroring a community report's evidence. In the table a `sold out` chip sits next to the status pill. Missing tab is unaffected.

### Full-page editor — `/admin/events/:id/edit` (`EventEditorPage` / `EventEditorMobile`)

Canonical edit surface, reached from the row menu "Edit…", View detail, and the queue inspector's **"Open full editor"** link. Mirrors `VenueDetailPageV2`: numbered sections + sticky unsaved-changes save bar + danger zone. Sections: **01 Identity** · **02 Pricing** · **03 Classification** (genre tags + Mark-non-concert) · **04 Status** (status segmented — postponed reveals a _new date / TBD_ field, cancelled reveals a note; an **Availability** control — Available / Sold out — sits beside it, sold out revealing optional provenance source / URL / note; plus the Verification control with read-only confidence + source) · **05 Identity art** · **Danger zone** (single-event delete, simple confirm). States on canvas: idle / dirty + save bar / validation / status = postponed / sold out / delete confirm — all six on **desktop**; **mobile** ships the dirty state as representative (patterns mirror desktop). The `EditField` primitive, validation rules, and save semantics are shared with the queue inspector; the queue inspector keeps its inline FieldRows + diff and gains an **"Open full editor"** link in its action shelf.

### Missing-from-crawl — 4th Review tab "Missing" (`MissingSection` / `MissingMobile`)

The crawler stamps `last_seen_at`; rows it expected in a venue's daily sweep but didn't find get flagged here (likely cancellation / postponement / silent change — or a crawl miss). Rows show last-seen + missed-sweep context. Per-row actions: **Mark postponed · Mark cancelled · Dismiss** (false positive). Empty state: "Nothing's gone missing." Tabs are now `Event flags · Prices · Missing · All events` (mobile shortens to `Flags · Prices · Missing · All`).

---

## Behaviour notes for implementation

- **Search** matches event title, artist, and venue.
- **Filters:** Status (All / Verified / Unverified, segmented) · Venue (single-select popover) · Date range · Genre · Missing-data (**multi-select** popover: no price / no show time / no genre / no doors). Active filters tint their field; result count reads `N of {total}` with a **Clear all**.
- **Sort:** Date · Created · Confidence, each asc/desc — popover anchored right.
- **Row `⋯` menu:** View detail · Edit… · — · _Send back to review_ (verified) / _Verify_ (unverified) · Mark postponed · Mark cancelled · Mark upcoming (revert) · Mark sold out / Mark available · Mark non-concert · — · Delete… (danger). Filter chips are single-select-per-dimension; clicking an active chip resets to All.
- **Bulk:** row checkboxes + header select-all → floating **dock** (count · Mark non-concert · Send back to review · **Delete N**). Bulk delete opens the **typed-DELETE** modal; single delete is a plain confirm. Mark-non-concert (single or bulk) opens a lighter `warning`-bordered confirm — it sets the tag and unpublishes, never deletes.
- **Deletion is audit-logged server-side** — surfaced in copy on both delete modals; no client undo drawn (server is source of truth).
- **Mobile:** table → cards; filter bar → search + scrollable chips + a Filters bottom-sheet; row `⋯` → action bottom-sheet; delete → bottom-sheet; multi-select via a **Select** toggle that reveals checkboxes + a bottom bulk bar. 44px min hit targets.
- **Loading:** skeleton rows at row height (`--surface-2` pulse); filter bar stays interactive. **Network error** (not drawn): full-width danger card with retry, don't clear stale rows — same pattern as the rest of admin.

---

## Voice

Empty state follows the locked playful-but-clear voice: eyebrow `0 results`, headline **"Crickets."**, then a plain instruction to loosen or clear filters. Destructive modals drop the snark entirely (irreversibility wins over cleverness) — matches the Delete-venue / Delete-account decisions.

---

## Open items

- **Saved views** — the brief hints operators may want named slices ("non-concert, verified" etc.). A `Saved views` affordance is stubbed on the standalone header only; not designed. Flag for a follow-up if wanted.
- **Date-range custom picker** and **Genre popover** contents are stubbed (fields present, dropdowns not drawn) — same component shape as Venue/Missing.
