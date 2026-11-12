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

## Addendum audit (PR #175)

**Verdict:** 🟡 **Yellow.** All four phone gaps are closed and nothing in them needs Design again. A few eng-side clarifications remain, plus one Hugh scope call on the ticketing-feed seller list (Item A5), which holds back only the Ticketing feed part of 3b's Source tab.
**Audited:** 2026-11-12
**Addendum:** `design/design_handoff_admin_redesign/phone-addendum/` (PR #175, merged): 38 boards, `README.md`, `manifest.json`.
**Read against:** this READINESS, `docs/superpowers/plans/2026-11-11-admin-redesign.md` (Status gates, Migrations ledger, Decisions), `packages/db/src/schema/venues.ts` on `main`, and the desktop boards `04/venue-source`, `04/inspect-a-fetched-page`, `05/add-a-venue-start`, `05/gone-live` and `06/merge-duplicates`.

### Decisions resolved 2026-11-12 (Hugh)

1. **Fetched HTML is kept 14 days.** That matches the plan's default for 1e (gzipped in Postgres, daily sweep). It unblocks 1e. The addendum already draws to it: `inspect-pages-gone` and the Save debug HTML hint.
2. **The Test account tag is stored in our DB** as `user_profiles.is_test_account boolean NOT NULL DEFAULT false`, the plan default. It unblocks 5a, and the count exclusions in 1c and 2a read it once 5a lands.
3. **"Verified on staging" is a mark set by hand in production.** There is no cross-environment call: drop the `/v1/internal/flags/verified` server-to-server read and its shared secret. 5c stores `verified_at`, `verified_by` and `verified_note` in each environment and sets them by hand in prod. It unblocks 5c.
4. **Block is dropped.** PR 5e is removed, and the Person ⋯ menu ships without Block in 5a.
5. **Send feedback moves to the account menu, and the edge tab (`FeedbackEdgeTabGate`) is removed at launch.** This is the proposal as drawn, and it unblocks 6.
6. **The Arena accent is the crescent, as drawn.** It unblocks the hero picker in 3e (`05/all-six-settings`) once B+ B11 lands.

### Per-gap verdicts

| Gap | Verdict | What the addendum settles |
| --- | --- | --- |
| 1 Merge duplicates at 320px | ✅ **Closed** | A full screen opens from the event ⋯ menu. A pick step (likely duplicate first, then search) leads to a **stacked** compare: the same rows in the same order per listing. The pinned button names the choice. Drawn: pick, pick loading, nothing found, compare (390 and 320), keep the second (320), compare loading, merging, couldn't merge. |
| 2 Inspect a fetched page on phone | ✅ **Closed** | **Phone-reachable by intent.** Runs tab, then the run detail sheet, then Inspect page. A segmented control has What we read (opens first) and What we fetched (Page, Text, HTML). The HTML wraps and opens at the stop highlight. The header buttons move to ⋯. Drawn: sheet, both views at 390 and 320, ⋯ menu, loading, pages gone (14-day empty), couldn't load. |
| 3 Add a venue start, Nobody asked yet, Gone live on phone | ✅ **Closed** | **+** on Venues opens Start. Start from scratch sits on top, then one card per asked-for venue (Set it up, or Ask the venue… when robots.txt disallows, plus Not for us with Undo). The two explainer cards become a footnote. Gone live keeps the desktop words, with stacked buttons and a short waiting list. Drawn: start (390 and 320), empty, loading, couldn't load, not for us (and its failure), going live, go-live failed, Gone live (390 and 320). |
| 4 Venue Source tab on phone | ✅ **Closed** | The desktop columns stack in reading order: How we read it, robots.txt, Fixed by the crawl rules. Advanced stays collapsed, the tabs scroll sideways, and the Save bar pins only after a change and names it. Drawn: default (390 and 320), feed picked with a passed test, test running, Advanced open, robots.txt disallows, Don't crawl, loading, save failed. |

Every board keeps the system rules: two-chip venue status, a spinner only inside a saving button, snap-back with a toast, skeletons in the final shape, no ids, one glow per screen. The boards use the handoff's palette and add no new colors.

### 320px coverage

- ✅ The default board of every gap surface is drawn at 320: merge compare and keep-the-second, Inspect read and fetched, Add a venue start, Gone live, and Source. Titles, lineups and row values wrap. The only thing that clips is the venue tab strip ("Gu…" at 320), which scrolls sideways by design as on every venue tab.
- 🟡 These are drawn only at 390, so the BUILD-CHECK 320 pass has to cover them:
  - The merge pick step and the run detail sheet.
  - **Advanced open:** the three-way Wait until control (Network quiet / Loaded / HTML ready) is the tightest fit at 320, at about 85px per segment. If it doesn't fit on one line, follow the stacked-option pattern of How we read it.
  - **Feed picked:** the five Seller chips and the pinned "Unsaved: …" Save bar.
  - **robots.txt disallows:** the two status chips side by side in the header.
- Plan decision 5 ("no board exists at that width") is now out of date for these surfaces. Each 3b, 3e and 4b inventory compares its 320 shots with the `*-320` boards, and falls back to the 390 boards everywhere else.

### New gaps or contradictions the addendum introduces

None needs a Design round. Each item below is settled from a drawn pattern or by an engineering or Hugh decision, and is recorded in the named phase plan.

#### Eng-side clarifications (Yellow)

- **A1 (4a, 4b): merging into a hand-added listing vs "the crawler skips manual rows".** `merge-keep-second-320` promises that "the next crawl updates this one instead of adding it again", but the plan's 4a says the crawler's upsert skips manual rows. **Decision for the 4a phase plan:** the crawl resolves its match key through `merged_into_id`. When the target is a `manual` row, the crawl updates crawl-owned fields (price, ticket link, status) and never overwrites hand-entered lineup or title. The stale sweep still never removes manual rows. This keeps need 23's "never removes" and makes the board's promise true. crawler-core integration tests cover it.
- **A2 (4a): "added by @dlo" needs an author.** The From row (and the desktop merge panel) names who added a show by hand. The ledger gives 4a only `events.manual boolean`. **Decision:** add `events.created_by text NULL` (expand-only), filled in by Add a show by hand and rendered as the handle (rule 7). Older manual rows read "added by hand".
- **A3 (4b): merging across venue or day.** Search lets you pick a listing on another date or at another venue, but the compare's shared header says "Same venue and day on both". **Decision:** when the two listings differ, drop the shared header and add Venue and Day as the first rows of each card. That follows the compare's own stacked-row pattern and the desktop panel, which shows venue and day per listing. Search results and no results in the pick step follow `06/artist-search-mobile` and `06/events-no-results`.
- **A4 (1e, 3b): "What we read" needs per-run extracted items, not just the HTML.** The default Inspect view lists every item read, with Concert / Not a concert, the method ("via Haiku") and a stop marker ("Stopped here: page 2 never loaded"). The ledger has `crawl_run_pages` metadata (1a) and bodies (1e), but no item-level record and no stop marker. This was latent in the desktop board and the original audit missed it; the addendum makes it the screen you land on. **Decision for the 3b phase plan:** add a `crawl_run_items` table (`crawl_run_id`, `crawl_run_page_id`, `title`, `is_concert`, `method`, `position`) with the same 14-day sweep as the bodies, plus the reason and stopping-page fields on `crawl_runs` that 1a's `reason` enum already implies. Never recompute it by re-running Haiku on stored HTML (that has an LLM cost). Another open point: the run sheet lists several pages but Inspect shows one. **Decision:** tapping a PAGES row in the sheet opens Inspect on that page, and Inspect page opens the page where the run stopped (or the first page).
- **A6 (3b): the Source field mapping has two errors.**
  - "Calendar page → `url`": `venues` has no `url` column. The calendar page is `website_url`.
  - `platform = 'detail-page'` is a crawl mode, not a seller, and no Source control shows it. **Decision:** saving Source preserves `platform` and `platform_venue_id` when the admin doesn't change How we read it, and Advanced shows a read-only line when a venue uses detail-page. Nothing is silently cleared.
- **A7 (3c, 3e): Not for us needs a record.** Dismissing a SUGGESTED or IN FEEDBACK venue ("It won't show here again") needs a key that survives repeat asks. **Decision:** add a `venue_suggestion_dismissals` table (normalized venue name, `dismissed_by`, `dismissed_at`, `cleared_at` for Undo) in 3c. The Start list's query excludes active dismissals. Undo clears the row and is audited.
- **A8 (2b): a new path from Needs you to Inspect.** The `run-detail-sheet` note says Needs you items for a failing or quiet venue link to the run detail. 2b is already running, so the link is added in 3b, where the destination exists. It needs no 2b change before then.
- **A9 (copy):** the README's "New strings for copy review" list goes through `copy-review` with the rest of `COPY.md`. The faint caption under the HTML view ("Lines wrap; nothing scrolls sideways… Saved for 14 days.") is a board annotation, not UI copy.

#### Open: Hugh calls (not Design)

- **A5 (3b, a scope call): the drawn sellers have no fetchers.** Ticketing feed names AXS, Ticketmaster, Etix, DICE and Eventbrite, and the phone board draws them as Seller chips with a venue-ID field. The addendum says the fields map to existing columns. The columns exist, but their values don't fit:
  - `api_provider` is an enum with only `venuepilot`.
  - `platform` is `aeg | livenation | detail-page`.
  - None of the five drawn sellers has a fetcher, and the three real feeds (VenuePilot, AEG, Live Nation) aren't on the list.
  - `ticket_vendor` (axs, ticketmaster, dice…) is the price-vendor column, not a feed. Don't conflate the two.

  This flaw is in the desktop board too; the original audit didn't catch it.

  **Default if Hugh has no preference:** the chips come from the fetchers that exist (VenuePilot, AEG, Live Nation), and the option's description goes through `copy-review` to match. Building the five drawn sellers is new fetcher work and its own plan, never part of 3b. Until Hugh rules, 3b builds the rest of Source and leaves Ticketing feed off.
- **The addendum's three proposals:**
  - Undo on desktop's Not for us. Until Hugh says yes, 3e builds Undo on phone only, as drawn.
  - The two feed fields on desktop Source. They follow A5.
  - Dropping Save debug HTML. Keep the toggle as drawn until engineering confirms nothing else reads `debug_capture_html`.

### Updated overall verdict and plan gates

**Overall: 🟠 Orange → 🟡 Yellow.** No Design round-trip is outstanding. The Status gates table's "Wait for the Design phone addendum" rows are cleared now that #175 has merged:

| PR | Was blocked on | Now |
| --- | --- | --- |
| **3b** Source, Details, Guide, Inspect | Gaps 2 and 4; 1e; retention | **Unblocked** after 3a and 1e. Retention is ruled (14 days), so 1e can start. Its phase plan records A4 and A6. Ticketing feed waits on A5. |
| **3e** Add a venue flow | Gap 3; Arena | **Unblocked by design.** It still follows 3c (with A7), 3d and B+ B11. Arena is ruled (crescent). |
| **4b** Events (merge on phone) | Gap 1 | **Unblocked.** Merge ships on phone and desktop together, after 4a (with A1 and A2). A3 is recorded in 4b. |
| **1e** fetched HTML bodies | Hugh: retention | **Unblocked** (14 days). |
| **5a** People | Hugh: Test account tag | **Unblocked** (DB column). Ships without Block. |
| **5c** Flags | Hugh: verified transport | **Unblocked**, simpler: the verified mark is set by hand in prod, with no internal endpoint or secret. |
| **5e** Block | Hugh | **Removed.** |
| **6** Fan side | Hugh: Send feedback | **Unblocked** (account menu; edge tab removed at launch). |

Still open: A5 (the seller list, Hugh) and the three addendum proposals (Hugh). None of them blocks a whole PR.
