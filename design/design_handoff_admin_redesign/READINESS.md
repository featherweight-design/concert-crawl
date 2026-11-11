# Readiness Review — Admin Redesign

**Verdict:** 🟠 Orange (narrow; Phases 0–2 have Yellow items only)
**Audited:** 2026-11-11
**Related ticket(s):** handoff PR #122
**Plan PR target:** `docs/superpowers/plans/2026-11-11-admin-redesign.md`

## Summary

The IA, the system rules (two-chip venue status, in-flow panels, skeletons, snap-back on a failed save), the copy and the states are thorough, and Hugh approved every board. The blockers are four phone surfaces that weren't drawn and that no stated rule settles. The rest is eng-side clarification. Most new features need new endpoints, and roughly half need expand-only schema. Next step: ask Design for a phone addendum, with Hugh's yes. Phase 0 to 2 plans and backend work can go ahead now.

## Per-dimension findings

### 🗺️ Scope clarity
- ✅ The boundary is clear: all of `/admin`, plus a few fan-side boards in `07`. Billing is out. The today-to-new route map is complete.
- ✅ Hugh's open questions are logged: Send feedback, the Arena accent, and Block in the Person ⋯ menu.
- 🟡 The scope is huge: 27 engineering needs, some of them product features (glyph and guide drafting by LLM, Ask the venue, cross-environment flags). The plan should name what it defers.

### 🎭 State coverage
- ✅ Loading boards exist for all 15 desktop pages, plus one generic mobile list and one mobile detail skeleton.
- ✅ Also drawn: Couldn't load, Save failed, Not an admin, Signed out, Offline, Not found, and Answered with Undo.
- ✅ Empty states are drawn for Needs you, Events, Artists, Prices, People, Invite codes, Feedback and Activity log.
- ✅ Every Add-a-venue step has its sub-states drawn.
- 🟡 Some states are missing but settled by the drawn patterns:
  - Empty: Venues with no results, Crawl runs, Emails, Health with no runs. Use the drawn empty pattern.
  - Couldn't load: drawn on desktop Needs you only, but rule 9 extends it to every page.
- 🟠 **Phone parity.** These are desktop-only, but rules 4 and 6 cover them, so they're Yellow:
  - every dialog and panel (Hide, Delete, Make admin, Revoke, Mark verified, Everyone in production, LLM budget, run detail, Crawl all)
  - Artists Matched and Not artists tabs, Past shows, Add a show by hand, Reject a price
  - the feedback error report and venue suggestion panels
  - Venue Details and Guide tabs

  **These four have no settling pattern:**
  - Merge duplicates (a side-by-side compare at 320px)
  - Inspect a fetched page (an HTML viewer)
  - Add a venue start / "Venues people asked for", and Gone live
  - the Venue Source tab
- 🟡 Every mobile board is drawn at 390px, but `BUILD-CHECK.md` requires 320. Check 320 against the 390 boards.

### 🔌 Data contract
- ✅ Already supported:
  - pause crawling (`crawl_paused_at`) and Hide from site (`active=false`)
  - `POST /crawl` (crawl all, skips paused and blocked venues) and `GET /crawl/status`
  - event merge (`POST /events/:id/merge`)
  - the `not_an_artist` match status (backs the Not artists tab)
  - invite `expiresAt`, `revokedAt`, `maxUses` and redemptions
  - role changes, using the existing roles admin/promoter/beta/user
  - triage, test email, and the artist name lock
  - `packages/types/src/venue-guide.ts` exists
- 🟡 **New API or schema.** All schema here is expand-only (add a nullable column, a new table, or a new enum value):
  1. **`crawl_runs`:** add `skip_reason` (an enum: page unchanged, calendar block not found, timeout, 403 or 429, robots.txt) and fetched-page records. Fetched HTML for recent runs needs a new table or blob store with retention. Today HTML is only logged, and only for venues with `debugCaptureHtml`. That adds cost.
  2. **Needs you:** a new queue endpoint that extends `/triage` with the kinds artist match, low-confidence event, price check and bug, plus grouping, ranking and the 60-day window. Needs a new `admin_queue_snoozes` table and answer/undo endpoints.
  3. **Settings:** a new `admin_settings` table for the monthly LLM budget and "Approve every price myself".
  4. **Done for you:** system actions must write audit rows, and the log needs a read endpoint.
  5. **Venues:** add columns for draft / `went_live_at`, `crawl_paused_reason` ("waiting on permission"), `permission_asked_at` (the 14-day reminder), `hero_setting` and the glyph SVG. Also new endpoints for test-crawl mode (crawls run in Actions, so this is dispatch-and-poll), glyph drafting and guide drafting, with LLM cost tracked like other LLM use. Delete needs a guard: no shows and no Watchers.
  6. **Events:** a new `event_artists` join table (today the lineup is a text array), a `manual` flag that the crawl respects, and a merge that also moves Watchers, prices and reports and redirects the old listing.
  7. **Prices:** handles in submissions (a join to `user_profiles`) and price-batch grouping.
  8. **People:**
     - a Test account tag (a new column or Clerk metadata)
     - a "Show email" endpoint that is audited
     - sign out everywhere, through Clerk
     - Block, only if Hugh keeps it
  9. **Invite codes:** a new PATCH (Edit), Reactivate and who-joined endpoints. Full and Expired are derived from existing fields.
  10. **Feature flags:** today the table is only `key` and `enabled`. Needs:
      - a stage enum (Off, Me, Beta, Everyone)
      - a new `feature_flag_users` table
      - `verified_at`, `verified_by` and a note
      - history
      - **production reading staging's verified state.** That's a new authenticated cross-environment call and an architecture decision.
  11. **Feedback:**
      - enum values `error_report` and `venue_suggestion` (adding enum values is expand-safe)
      - reply columns, plus a notification type and an email template
      - Sentry counts of people affected (a new integration)
      - mapping "To read / Done" onto the six existing statuses
  12. **Activity log:** a new `GET /admin/audit-log` endpoint, plus audit writes for Show email, invite codes and replies.
  13. **Emails:** a template list and a preview rendered with a real show.

### 🧱 Codebase fit
- ✅ The boards use Electric hex values that mostly match `globals.css`. A few don't (#FFB838, #4DA3FF, #DE96DF): avatar or glyph colors, to confirm. The boards are mockups, so the plan maps every color to a token.
- 🟡 Admin follows the app theme, which has 9 themes including light, but only Electric is drawn. That's expected (memory: prototypes ship 3 themes on purpose).
- 🟡 Reuse what exists rather than rebuilding:
  - `AdminDialog` and `useDialogKeyboard` should back the confirm dialog
  - `StatusChip` (consumer) is reused as drawn
  - `CrawlPausedBadge` and `StatusBadge` fold into `VenueStatus`
  - the `Kbd` primitive is deleted
- 🟡 About 2,600 lines of `ADMIN_COPY` get rewritten, and the strings go through `copy-review` from `COPY.md`.

### ♿ Cross-cutting
- ✅ Covered: focus traps, close with X or scrim, named action buttons, 44px targets, no color-only meaning, reduced motion, and masked emails read as "hidden".
- 🟡 Performance: the ranked Needs you query and storing fetched HTML need indexes and a retention policy.
- 🟡 Every new admin action needs an audit row, and drafting cost goes in `cost_tracking`.

### ⏰ Drift from reality
- 🟡 **"Paused" collides.** Today "Paused" means `active=false`. The design uses "Pause crawling" (`crawl_paused_at`) and "Hide from site" (`active=false`). Relabel every existing use.
- 🟡 **Hero settings.** The handoff says they "grow from three (Street, Outdoor, Arena) to six", but there's no hero-setting field or enum on main. This is net-new, not an extension.
- 🟡 **Old routes need redirects:**
  - `/admin/review` and `/admin/review/contests/[id]`, which the API's review counts and notifications reference
  - `/admin/venues/robots-audit`, `/admin/settings` and `/admin/users`
- 🟡 Still present on main: the `sub_admin` role (in the type, not assignable), the `spotify-sync` flag and `FeedbackEdgeTabGate`.

### 📝 Decision log
- ✅ Locked: every board, the artist 60-day window, Suggest a venue in the modal, notice answers as drawn, and Test account as a tag rather than a role.
- ✅ Tentative items are named for Hugh: Send feedback, the Arena accent, Block.

## Gaps requiring a Design round-trip

- Gap 1: Merge duplicates on phone. How does a two-listing compare show at 320px?
- Gap 2: Inspect a fetched page on phone. Is it phone-reachable at all, or desktop-only by intent?
- Gap 3: Add a venue start ("Venues people asked for", Nobody asked yet) and Gone live on phone.
- Gap 4: The Venue Source tab on phone ("How we read it", robots.txt, rules, Advanced).

## Eng-side clarifications

- Item 1: Desktop-only dialogs and panels become sheets or full screen on phone, following rule 4.
- Item 2: Couldn't load and the empty pattern apply to every page that wasn't drawn.
- Item 3: Map the feedback statuses (To read is unread/read/flagged; Done is resolved/archived/issue_opened).
- Item 4: Where the Test account tag is stored (DB or Clerk).
- Item 5: The transport for the cross-environment flag verified read.
- Item 6: The retention window for fetched HTML.
- Item 7: Rename the routes (`/admin/people`, `/admin/operations`, `/admin/needs-you`) and redirect the old ones.

## Decisions inherited

- Every board is approved, and the B+ tokens apply with no new colors.
- Locked vocabulary, plus Pause crawling, Hide from site, Re-crawl, Fewer shows than usual and Member.
- Artist matches enter Needs you only for shows in the next 60 days.
- Every migration is expand/contract. Phase 6 (fan side) goes behind a flag and gets a `releases.ts` entry. Admin phases get none.
- Never search or crawl the web for venues. The test crawl uses the real robots.txt and 3-second rules.

## Proposed phase breakdown (each PR at most ~20 files / 800 lines)

| # | PR | Routes |
|---|---|---|
| 0a | Shell: sidebar, tab bar with More, user menu, environment badge; remove the toggle, `Kbd` and Settings (test email moves to a stub); redirects | `admin/layout`, `/admin/settings` |
| 0b | Primitives: `VenueStatus`, KindLabel, SidePanel, BottomSheet/Confirm (on `AdminDialog`), Skeleton, EmptyState, SaveFailed toast, Couldn't load | none |
| 1a | API/DB: run reasons and fetched pages (crawler-core) | backend |
| 1b | API/DB: `admin_settings`, Done-for-you audit writes | backend |
| 1c | Health, tiles, venue grid, LLM budget panel | `/admin` |
| 1d | Crawl runs, run detail, Crawl all | `/admin/crawl` |
| 2a | API/DB: queue kinds, ranking, snooze, answer/undo, price batches | backend |
| 2b | Needs you, desktop and mobile, 8 evidence panels; retire Review | `/admin/needs-you`, `/admin/review` → redirect |
| 3a | Venues list, Overview, Runs, ⋯ menu (Hide, Delete) | `/admin/venues`, `/[id]` |
| 3b | Source, Details, Guide tabs, Inspect (after the addendum) | `/admin/venues/[id]` |
| 3c | API/DB: drafts, test crawl, Ask the venue, hero setting | backend |
| 3d | API: glyph and guide drafting | backend |
| 3e | Add a venue flow (after the addendum) | `/admin/venues/new` |
| 4a | API/DB: `event_artists`, manual shows, merge semantics | backend |
| 4b | Events and Event edit, price sheet, Mark cancelled, add by hand, merge | `/admin/events/**` |
| 4c | Artists, three tabs and search | `/admin/artists` |
| 4d | Prices, three tabs, handles | `/admin/prices/**` |
| 5a | People, Person, Test account tag, Show email | `/admin/people/**` |
| 5b | Invite codes and Posters, plus their API | `/admin/people/invite-codes` |
| 5c | Flags: schema, stage ladder, named people, verify | `/admin/feature-flags` |
| 5d | Operations: Feedback (reply API), Emails, Activity log | `/admin/operations/**` |
| 6 | Fan side, behind a flag | account menu, feedback modal |
