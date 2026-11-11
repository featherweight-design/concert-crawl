# Admin redesign: umbrella plan

**Handoff:** `design/design_handoff_admin_redesign/` (merged in #122): README, PHASES.md, COPY.md, BUILD-CHECK.md, `manifest.json` (177 boards in 7 sections), `boards/`, `screens/`. Canvas: https://claude.ai/artifact/XggqBuiujza1vegiCGDQnd.
**Readiness verdict:** 🟠 **Orange, narrow.** Phases 0 to 2 have Yellow items only, and this plan settles them under [Decisions](#decisions). Four phone surfaces have no drawn pattern (READINESS gaps 1 to 4). They need a Design phone addendum and Hugh's yes, and they block three UI PRs, which are named under [Status gates](#status-gates).
**Status:** Phases 0 to 2 can start once this plan merges. Phases 3 to 6 get their own detailed phase plans after the addendum lands. Their backend PRs may go ahead earlier, as noted in the table.
**Plan PR target:** `docs/superpowers/plans/2026-11-11-admin-redesign.md` (doc only; it merges on green CI after its author reads the diff).

## Goal

Replace the whole of `/admin` with the approved design. **Needs you** becomes the single queue for decisions, every other page becomes a reference place, and it all works from 320px to desktop. Phases ship one at a time. Each phase deploys to staging alone, and prod is promoted by hand as usual.

## Scope

- Every admin route, the admin shell, and the admin side of the 27 engineering needs (README § Engineering needs).
- The fan-side boards in `07` (Send feedback, the reply notice, the reply sheet and its email) ship in Phase 6, behind a flag.

## Non-goals and deferrals

| Item | Why | Where it goes |
| --- | --- | --- |
| Billing | The app is free. | Out. |
| New colour tokens or a new theme matrix | The admin adds no tokens (README). Admin follows the app's nine themes. | Out. |
| Searching or crawling the web for venues | Crawl ethics. Discovery is only "Venues people asked for". | Never. |
| Need 27: unsaved edits survive signing out or going offline | It's cross-cutting client storage with its own failure modes. The Signed out and Offline boards are built as states only. | Its own plan after Phase 5. Proposed intake. |
| Need 20: Sentry error reports counted by people affected | It's a new integration (the Sentry API from the API server). 5d shows error reports without the count. | Follow-up after 5d. Proposed intake. |
| Need 12: canonical names cut from multi-act and "An evening with" titles | It's crawl-adjacent and changes `canonical-title.ts` parity. It gets its own phase plan, as B+ A5 did. | Separate crawl plan. |
| Not an admin (`07/not-an-admin`, "for a sub-admin") | `sub_admin` exists in `Role` but can't be assigned, and `requireAdminUser()` sends every non-admin away before admin renders. Nobody can reach this board. | Deferred until a sub-admin role is real. |
| Block in the Person ⋯ menu | Waiting on Hugh. | PR 5e, only if he keeps it. |
| Removing `sub_admin` from the `role` enum, and other contract steps | Migrations are expand only. | [Migrations ledger](#migrations-ledger), contract column. |

## Status gates

**Can start now:** 0a, 0b, 0c, 1a, 1b, 1c, 1d, 2a, 2b, 2c. Their only open items are Yellow and are settled below.

**Wait for the Design phone addendum (READINESS gaps 1 to 4) and Hugh's yes:**

| Gap | Blocks | Backend that may proceed |
| --- | --- | --- |
| 1 Merge duplicates at 320px | The merge-on-phone UI in **4b**. The rest of 4b proceeds, and merge ships desktop-first only if Hugh says so. | 4a |
| 2 Inspect a fetched page on phone | **3b** (the Inspect viewer) | 1e |
| 3 Add a venue start ("Venues people asked for", Nobody asked yet) and Gone live on phone | **3e** | 3c, 3d |
| 4 The Venue Source tab on phone | **3b** | 3c |

**Hugh decisions, and the PRs each one blocks:**

| Decision | Blocks | Default if he has no preference |
| --- | --- | --- |
| **Cross-environment flag "verified" transport.** How production admin reads staging's verified mark. | **5c** (the production lock and the "Verified on staging" column). The staging-side ladder could ship alone, but one flags PR is cleaner. | A server-to-server `GET` from the prod API to the staging API (`/v1/internal/flags/verified`), with a shared secret in both Render env groups, read-only, cached for 60 s, and failing closed (the flag stays locked). The alternative is a verified mark copied by hand, which needs no secret but drifts. |
| **Where the Test account tag lives** | **5a**. The count exclusions in 1c and 2a read it once it exists, and until then they exclude nobody. | DB: `user_profiles.is_test_account boolean NOT NULL DEFAULT false`. Counts can join on it, and Clerk metadata can't be queried in SQL. |
| **Retention window for fetched HTML** | **1e**, and so Inspect in **3b** | 14 days, gzipped in Postgres, with a daily sweep. Rough estimate: 21 venues × about 2 pages × about 100 KB gzipped × 14 days ≈ 60 MB. Measure it in 1e before turning it on. |
| **Block in the Person ⋯ menu** | **5e** only. 5a ships the menu without Block. | Drop it (moderation is out of scope for launch). |
| **Send feedback in the account menu, and removing the edge tab at launch** | **6** | As proposed. |
| **Arena hero accent** (crescent moon or ceiling lights) | The hero picker in **3e** (`05/all-six-settings`), and the Arena art, which comes from B+ B11. 3c's `hero_setting` column doesn't wait. | The crescent, as drawn. |

**Other dependencies:**

- The hero renderer doesn't exist on main. B+ **B11** builds it, so 3e follows B11.
- `VenueGlyph` and `VenueTile` (B+ F1), `SkeletonBlock` (F2) and `StatusChip` (F3) are on main and get reused.

## Decisions

Each READINESS Yellow item is recorded here as a decision, together with the drawn pattern it follows. Lanes don't reopen these. Anything else ambiguous gets resolved from the nearest drawn board and recorded in the PR's `## Design review` table (`.claude/fwd/feature-acceptance.md`).

1. **Dialogs and panels that are only drawn on desktop become phone sheets or full screen pages (rule 4).** Short forms and confirmations are a bottom sheet, as in `06/mark-cancelled-mobile` and `06/add-a-price-mobile`. Anything that needs the keyboard plus a long list is full screen, as in `06/artist-search-mobile` and `02/an-item-mobile`. This covers Hide, Delete, Make admin, Revoke, Mark verified, Everyone in production, the LLM budget, run detail, Crawl all, the Artists Matched and Not artists tabs, Past shows, Add a show by hand, Reject a price, the feedback error report and venue suggestion panels, and the Venue Details and Guide tabs.
2. **Couldn't load and the empty pattern apply on every page.** Couldn't load follows `02/couldnt-load`: the chrome stays and only the content area changes. Pages without a drawn empty state use the nearest drawn one:
   - Venues with no results and Emails follow `06/events-no-results` and `07/people-no-results`.
   - Crawl runs with no runs, and Health with no runs, follow `02/all-clear`, meaning a summary line plus one action.
3. **Feedback statuses map onto two filters.** **To read** covers `unread`, `read` and `flagged`. **Done** covers `resolved`, `archived` and `issue_opened` (`07/feedback`, `07/feedback-done`). The enum doesn't change.
4. **Routes are renamed, and the old ones redirect.** The redirects are page stubs that call `redirect()`, the pattern `admin/events/page.tsx` already uses, since there are no `next.config.ts` redirects. An interim target is a temporary redirect, and a final home uses `permanentRedirect()`, so a browser never caches a hop that moves again later.

   | Old | New | PR |
   | --- | --- | --- |
   | `/admin/settings` | `/admin/operations/emails` (permanent) | 0c |
   | `/admin/review` (no tab, `event-flags`, `missing`, `contests`) | `/admin/needs-you` (permanent) | 2b |
   | `/admin/review/contests/[contestId]` | `/admin/needs-you?item=price-check:<id>` | 2b |
   | `/admin/review?tab=all-events` | `/admin/events` | 4b |
   | `/admin/review?tab=prices`, `?tab=submissions`; `/admin/prices`, `/admin/prices/submissions` | `/admin/prices`, `/admin/prices?tab=submitted` | 4d |
   | `/admin/venues/robots-audit` | `/admin/venues?robots=disallowed` | 3a |
   | `/admin/users`, `/admin/users/[userId]` | `/admin/people`, `/admin/people/[userId]` | 5a |
   | `/admin/invite-codes/**` | `/admin/people/invite-codes/**` (posters stay a tab) | 5b |
   | `/admin/feedback` | `/admin/operations` (Feedback tab) | 5d |
   | `/admin/crawl?venueId=X` (crawler emails, `crawler-core/src/lib/email.ts`) | Keeps today's split view until 3b, then `/admin/venues/X?tab=runs` | 1d, 3b |

   Every move updates `apps/e2e/src/audit/manifest.ts` (the ui-audit sweep lists 15 admin paths) in the same PR.
5. **320 is checked against the 390 boards.** Every admin inventory carries its own `widths` (320, 390, 640, 1300). The 320 column is a layout check, and no board exists at that width.
6. **"Paused" changes meaning.**
   - Today `deriveVenueStatus()` (`apps/web/src/lib/admin/venue-status.ts`) returns `'paused'` for `active=false`.
   - 0b adds the two-axis status, in which `onSite` is `live | hidden | draft` and `crawling` is `crawling | paused | auto_paused | blocked | robots_disallowed`. It also adds `VenueStatus` (`01/venues-list-status-columns`, `01/pause-crawling`).
   - 1c and 3a move every caller over, and 3a deletes the old function, `StatusBadge`'s venue use, and `CrawlPausedBadge`.
   - Every "Paused" label that means `active=false` is relabelled **Hide from site** or **Hidden**.
7. **Hero settings are net-new, not an extension.** Main has no hero field. 3c adds the column, the picker waits as described above, and the art comes from B+ B11.
8. **Reuse what exists, and never copy it into a page:**
   - `AdminDialog` and `useDialogKeyboard` back `ConfirmDialog`.
   - The consumer `StatusChip` shows show status.
   - `SkeletonBlock` is the skeleton primitive.
   - The focus trap excludes disabled controls, which is the selector rule in `components/pwa/BottomSheet.tsx`.
   - `CrawlPausedBadge` and the venue use of `StatusBadge` fold into `VenueStatus`.
9. **`Kbd` is deleted (rule 11).** The hints are removed from `AddVenueModal`, `VenueGuideBlock` and `EventQueueSplit`, and their key handlers stay, so no behaviour is lost.
10. **Colours.** The three off-token hexes in the boards (#FFB838, #4DA3FF, #DE96DF) are avatar or glyph colours. They map to the avatar palette (`avatar_color` enum) or the glyph set, never to new tokens. The token guard runs on every UI PR.
11. **The theme follows the app.** The `cc-admin-theme` localStorage key and `ThemePicker` go. `AdminThemeProvider` reads only `cc-theme`, and the user menu shows it read-only (`07/user-menu-desktop`).
12. **The More list follows `07/more-mobile`, not `01/more`.** The later board says **Operations** where the earlier one says "Tools", and "Tools" is banned by BUILD-CHECK step 5. Row details are plain counts, never badges (rule 1).
13. **There is one badge.** Only Needs you carries a badge. 0a sums today's `/v1/admin/review/counts`, and 2b switches it to the decision count from 2a. The crawl, artists and feedback badges become plain counts in More, and the desktop sidebar has none, as drawn.
14. **The interim nav runs from 0a until each page's phase.** Labels and order are final from 0a. Until a page lands, each item points at today's route:
    - Health is `/admin`
    - Needs you is `/admin/review`
    - Events is `/admin/review?tab=all-events`
    - Prices is `/admin/review?tab=prices`
    - People is `/admin/users`
    - Crawl runs is `/admin/crawl`
    - Operations is `/admin/feedback`

    Invite codes keeps an interim row under Manage until 5b, so it never becomes orphaned.
15. **The environment badge reads `NEXT_PUBLIC_SENTRY_ENVIRONMENT`.** That variable is already set per Vercel project (`docs/runbooks/production-launch.md`). The badge says `STAGING ADMIN` for `staging` and `PRODUCTION` for `production`. `local` shows `LOCAL`, which is admin copy and needs no review.
16. **The breakpoint.** The admin shell keeps its single `MOBILE_BREAKPOINT` (720 today) and moves it into `nav.ts` as a named constant. The 640 column of the inventory therefore shows the phone shell, by design: a 232px sidebar would leave 408px for tables.
17. **Done for you is `audit_log` rows with a `system:*` actor.** `actor_id` is `text NOT NULL`, so `system:crawler` and `system:prices` need no migration. The Activity log (5d) filters `system:*` out, because it shows admins only.
18. **Crawl runs lists derived batches.**
    - Nightly runs are per-venue `crawl_runs` that have no trigger, grouped by their Mountain Time night.
    - By-hand runs are grouped by `crawl_triggers` (`triggered_by` plus the burst they were queued in).
    - "Didn't start" is a missing nightly group. It's derived, not stored.

    ⚠️ This reverses a deliberate non-change from 2026-09-28 ("no in-app run-level row"). The approved board wins, and the PR body says so.
19. **Run reasons are a superset of the five drawn.** The crawler skips or fails for more reasons than the board names: paused, robots.txt unreachable, Crawl-delay over the cap, a platform adapter declining, and the account-wide LLM refusal. The enum covers all of them, and copy-review names each one.
20. **Health keeps the old triage panel until 2b.** 1c replaces the dashboard, but `TriagePanel` is today's only home for live venue faults. It sits below the Health content until 2b moves those items into Needs you, then 2b deletes it.
21. **Venue takedown survives.** Today's removal action (`removed_at`: a venue asked us to take its data down) isn't in the drawn ⋯ menu. It's an ethics capability, so 3a keeps it as a fourth ⋯ line behind the drawn sheet pattern, and copy-review names it.
22. **Admin phases get no release note.** Phase 6 gets one `releases.ts` entry.

## Migrations ledger

Every change is expand only and nullable or defaulted. Old readers keep working. Migrations are hand-written SQL in `packages/db/migrations/` with a `meta/_journal.json` entry, and each takes the **next free number at build time**, which the orchestrator assigns. **Every prod migration needs Hugh.**

| PR | Expand | Contract (deferred, its own later PR) |
| --- | --- | --- |
| 1a | Enum `crawl_run_reason`; `crawl_runs.reason crawl_run_reason NULL`; table `crawl_run_pages` (`id`, `crawl_run_id` FK cascade, `url`, `final_url`, `http_status`, `fetch_mode`, `bytes`, `content_hash`, `fetched_at`) with an index on `crawl_run_id` | Drop `crawl_runs.robots_txt_blocked` once every reader uses `reason`. Backfill nothing: old rows read "No reason recorded". |
| 1b | Table `admin_settings`: one row (`id smallint PK DEFAULT 1 CHECK (id = 1)`), `llm_monthly_budget_usd numeric(8,2) NULL`, `approve_prices_myself boolean NOT NULL DEFAULT false`, `updated_at`, `updated_by` | None |
| 1e | `crawl_run_pages.html_gz bytea NULL`; `crawl_run_pages.body_expires_at timestamptz NULL`, with an index | None. The sweep nulls the body and never drops rows. |
| 2a | Table `admin_queue_snoozes` (`id`, `item_key text`, `kind text`, `venue_id uuid NULL`, `until timestamptz NULL` (NULL means Not useful), `reason text NULL`, `created_by`, `created_at`, `cleared_at NULL`), with a partial unique index on `item_key` where `cleared_at IS NULL`; `price_submissions.held_for_admin_at timestamptz NULL` | None |
| 3c | `venues`: `went_live_at timestamptz NULL` (backfilled to `created_at` for existing rows, so a NULL means draft), `crawl_paused_reason text NULL`, `permission_asked_at timestamptz NULL`, `hero_setting` enum (`street`, `outdoor`, `arena`, `theater`, `club`, `gallery`) `NULL`, `glyph_svg text NULL`; `crawl_triggers.mode` (`crawl`, `test`) `NOT NULL DEFAULT 'crawl'` | None |
| 4a | Table `event_artists` (`event_id`, `artist_id`, `role` `headliner` or `support`, `position`), backfilled from `canonical_headliners` and the supporting arrays; `events.manual boolean NOT NULL DEFAULT false`; `events.merged_into_id uuid NULL` | Stop writing `headliners` and `supporting_artists` once every reader moves (it gets its own plan). |
| 5a | (if DB, per Hugh) `user_profiles.is_test_account boolean NOT NULL DEFAULT false` | None |
| 5b | None. Full and Expired derive from `max_uses`, `use_count` and `expires_at`, and Reactivate clears `revoked_at`. | None |
| 5c | Enum `flag_stage` (`off`, `me`, `beta`, `everyone`); `feature_flags.stage flag_stage NULL` (backfilled from `enabled`), `verified_at`, `verified_by`, `verified_note`; tables `feature_flag_users` and `feature_flag_history` | Drop `feature_flags.enabled` after readers move to `stage`. Remove the `spotify-sync` key in code. |
| 5d | Enum values `feedback_category`: `error_report`, `venue_suggestion`; `feedback.reply_body text NULL`, `replied_at`, `replied_by` | None. The reply notice is a new `notifications.category` value, which is text, so it needs no enum change. |

## PR table

There are no stacked PRs. Each PR comes from fresh main and stays within about 20 files or 800 lines. A PR that turns out bigger splits **before it opens**, and the split goes into this table. "Risky" means it gets `/code-review medium` plus the risk checklist, recorded under `## Claude review` with `## Copilot off`.

| # | Title | Risky? | Routes | Files (approx.) | Depends on |
| --- | --- | --- | --- | --- | --- |
| **0a** | Shell: sidebar, tab bar, More, user menu, environment badge, one badge | No (the gate is untouched and a test pins it) | `admin/layout`, new `/admin/more` | 16 | — |
| **0b** | Primitives: `VenueStatus`, `KindLabel`, `SidePanel`, `AdminSheet`, `ConfirmDialog`, `PageSkeleton`, `EmptyState`, `SaveFailedToast`, `CouldntLoad`, admin `not-found` | No | `admin/error.tsx`, `admin/not-found.tsx` | 18 | — |
| **0c** | Removals: the Settings page (test email moves to an Emails stub), `Kbd`, the admin theme key; redirects | No | `/admin/settings` → `/admin/operations/emails` | 15 | 0a |
| **1a** | Crawler: run reasons and fetched-page records | **Yes** (migration, crawler-core) | backend | 14 | — |
| **1b** | `admin_settings`, the Done-for-you system audit writes, `GET /admin/audit-log`, settings API | **Yes** (migration, API routes) | backend | 16 | — |
| **1c** | Health: tiles, the venue grid, the LLM budget panel, Done for you | No | `/admin` | 17 | 0a, 0b, 1a, 1b |
| **1d** | Crawl runs: derived batches API, list, run detail, Crawl all | **Yes** (API route) | `/admin/crawl` | 15 | 0b, 1a |
| **1e** | Fetched HTML bodies plus the retention sweep | **Yes** (migration, crawler-core) | backend | 8 | 1a; **Hugh: retention** |
| **2a** | Needs you API: kinds, ranking, grouping, snooze, answer and undo, the price hold | **Yes** (migration, API routes, the price pipeline) | backend | 19 | 1a, 1b |
| **2b** | Needs you: queue (desktop and phone), answered with Undo, snooze, all clear; retire Review's decision tabs | No | `/admin/needs-you`, `/admin/review` redirects | 17 | 0b, 2a |
| **2c** | Needs you: the 8 evidence panels and the price batch sheet | No | `/admin/needs-you` | 16 | 2b |
| 3a | Venues list, Overview, Runs, the ⋯ menu (Pause crawling, Hide, Delete with a guard, takedown) | **Yes** (Delete guard in the API) | `/admin/venues`, `/[id]` | ~18 | 0b, 1a |
| 3b | Source, Details, Guide tabs; Inspect | No | `/admin/venues/[id]` | ~18 | 3a, 1e; **addendum gaps 2, 4** |
| 3c | API and DB: drafts, test crawl, Ask the venue with a 14-day reminder, hero setting | **Yes** | backend | ~16 | 1a |
| 3d | API: glyph and guide drafting (LLM, tracked in `cost_tracking`) | **Yes** | backend | ~12 | 3c |
| 3e | Add a venue flow | No | `/admin/venues/new` | ~20 | 3c, 3d, B+ B11; **addendum gap 3**; Hugh: Arena |
| 4a | API and DB: `event_artists`, manual shows, merge semantics with a redirect | **Yes** | backend | ~16 | — |
| 4b | Events, Event edit, price sheet, Mark cancelled, add by hand, merge | No | `/admin/events/**` | ~20 | 4a; merge on phone: **addendum gap 1** |
| 4c | Artists: three tabs and search | No | `/admin/artists` | ~14 | 0b |
| 4d | Prices: three tabs, handles in submissions | **Yes** (API join) | `/admin/prices/**` | ~16 | 2a |
| 5a | People, Person, Test account tag, Show email (audited), sign out everywhere | **Yes** (auth, Clerk) | `/admin/people/**` | ~18 | **Hugh: Test account storage** |
| 5b | Invite codes and Posters under People; Edit, Reactivate, who joined | **Yes** (API) | `/admin/people/invite-codes/**` | ~16 | 5a |
| 5c | Feature flags: stage ladder, named people, verify, history, production lock | **Yes** | `/admin/feature-flags` | ~20 | **Hugh: transport** |
| 5d | Operations: Feedback (reply API), Emails, Activity log | **Yes** | `/admin/operations/**` | ~20 | 1b, 0c |
| 5e | Block (only if Hugh keeps it) | **Yes** | `/admin/people/[userId]` | ~6 | 5a; **Hugh: Block** |
| 6 | Fan side, behind a flag: Send feedback, reply delivery, Suggest a venue | **Yes** | account menu, feedback modal | ~16 | 5d; **Hugh: Send feedback** |

That's 25 PRs plus a conditional 5e. Eleven are in Phases 0 to 2.

## Every UI PR

- **Before it opens:** run the BUILD-CHECK, with the result in the PR body. List the boards it implements by `manifest.json` name.
- **Copy:** before the PR, run copy-review on its strings from `COPY.md`. Admin copy is exempt from the em-dash rule but not from the locked vocabulary. New keys go in `ADMIN_COPY` (`apps/web/src/components/admin/definitions/copy.ts`), and a page's old keys are deleted in the same PR that replaces the page.
- **Feature acceptance:**
  - The inventory is `docs/superpowers/inventories/admin-<pr>-<slug>.json`.
  - Run the pre-PR sheet against `pnpm dev` with `CONTACT_SHEET_ROLE=admin`.
  - Run `check-tokens.mjs`.
  - Do the staging walk at close-out. Admin sheets show the audit account's data, so they stay private.
- **Every new admin mutation sets** `auditAction`, `auditTargetId`, `auditActorId` and `auditMeta` (the middleware in `apps/api/src/routes/admin/index.ts`). Tests assert the row.
- **Tests run in CI only.** Lanes run `pnpm typecheck` and `pnpm lint` before pushing.

---

## Phase 0: shell and shared pieces

**Exit:** every existing page renders inside the new shell and is unchanged inside it.

### 0a: shell

**Boards:** `01/desktop-sidebar`, `01/mobile-one-nav`, `07/more-mobile`, `07/user-menu-desktop`, `07/user-menu-mobile`.

**Files:**

- `apps/web/src/components/admin/shell/nav.ts` holds the new `NAV`: groups `primary` (Needs you, Health), `manage` (Venues, Events, Artists, Prices, People, Feature flags, plus the interim Invite codes from decision 14) and `system` (Crawl runs, Operations), with interim hrefs. It adds the `TAB_BAR` keys (`needs-you`, `venues`, `events`, `more`). `MOBILE_BREAKPOINT` moves here (decision 16). `AdminBadgeCounts` becomes `{ needsYou: number; moreCounts: { artists: number; feedback: number } }`. The deprecated `NAV` alias goes.
- `nav.test.ts` checks:
  - the group order
  - every href resolves to an existing route file (a drift test that reads `app/(protected)/admin/**/page.tsx`)
  - only `needs-you` has a badge
  - "Tools" never appears
- `AdminSidebar.tsx` is a rewrite. It drops the rail and auto modes and adds the user card at the bottom. The test is `AdminSidebar.test.tsx` (new).
- `MobileBottomBar.tsx` is a rewrite to the 4-tab bar. More is active on `/admin/more` and on any route that isn't one of the first three tabs.
- `AdminMoreList.tsx` (new) holds the grouped rows with plain-count details, plus Open Concert Crawl and Sign out.
- `apps/web/src/app/(protected)/admin/more/page.tsx` (new) renders `AdminMoreList`. It renders at every width, and desktop simply has no link to it.
- `AdminUserMenu.tsx` (new) shows:
  - Open Concert Crawl (`/events`)
  - Theme, read-only, naming the app theme
  - Sign out (`useClerk().signOut`)

  It's a popover on desktop and an `AdminSheet` on the phone. Until 0b merges, it uses `components/pwa/BottomSheet`, and 0b swaps it in a later PR.
- `EnvironmentBadge.tsx` and `apps/web/src/lib/admin/environment.ts` (new): `adminEnvironment()` reads `NEXT_PUBLIC_SENTRY_ENVIRONMENT`, with a unit test.
- `AdminTopbar.tsx` keeps the breadcrumbs and loses `AppSwitcher`. It adds the environment badge on desktop and the avatar button on the phone.
- `breadcrumbs.ts` and `breadcrumbs.test.ts` take the new labels.
- `AdminShellClient.tsx` mounts the sidebar or tab bar and the topbar, and drops `MobileDrawer`.
- **Deleted:** `MobileDrawer.tsx`, `AppSwitcher.tsx`.
- `app/(protected)/admin/layout.tsx` drops the crawl-status badge fetch. It keeps review, feedback and artist counts and maps them to `badgeCounts`. **`requireAdminUser()` stays first and is untouched.**
- `definitions/copy.ts` replaces `shell.*` with:
  - `shell.nav.{needsYou, health, venues, events, artists, prices, people, featureFlags, crawlRuns, operations, inviteCodes}`
  - `shell.nav.groups.{manage, system}`
  - `shell.tabBar.{ariaLabel, more}`
  - `shell.more.{title, details.{health, artists(n), prices(n), people, featureFlags(n), crawlRuns(time), operations}}`
  - `shell.userMenu.{trigger, openApp, openAppHint, theme, themeHint(name), signOut, signOutHint}`
  - `shell.environment.{staging, production, local}`
- `apps/e2e/src/audit/manifest.ts` adds `/admin/more`.

**Tests:**

- `nav.test.ts` and `breadcrumbs.test.ts`, as above.
- `AdminSidebar.test.tsx`: the active item for nested routes, and the badge count.
- `MobileBottomBar` test: More is active for `/admin/feature-flags`.
- `environment.test.ts`.
- A layout test that a non-admin is still redirected, since `requireAdminUser` is mocked to throw.

**Inventory** `admin-0a-shell.json`:

```json
{
  "feature": "Admin 0a · Shell",
  "note": "Plan row 0a. CONTACT_SHEET_ROLE=admin. Boards: 01-foundations/desktop-sidebar, mobile-one-nav; 07/more-mobile, user-menu-desktop, user-menu-mobile. By hand: the PRODUCTION badge (the kit refuses prod).",
  "widths": [
    { "label": "phone-320", "width": 320, "height": 740, "touch": true },
    { "label": "phone", "width": 390, "height": 844, "touch": true },
    { "label": "sm", "width": 640, "height": 900 },
    { "label": "desktop", "width": 1300, "height": 900 }
  ],
  "rows": [
    { "id": "home", "label": "/admin in the shell", "steps": [{ "goto": "/admin", "wait": "[data-testid=\"admin-shell\"]" }] },
    { "id": "venues", "label": "/admin/venues in the shell", "steps": [{ "goto": "/admin/venues", "wait": "[data-testid=\"admin-shell\"] h1" }] },
    { "id": "review", "label": "/admin/review (interim Needs you)", "steps": [{ "goto": "/admin/review", "wait": "[data-testid=\"admin-shell\"] h1" }] },
    { "id": "flags", "label": "/admin/feature-flags, More active on phone", "steps": [{ "goto": "/admin/feature-flags", "wait": "[data-testid=\"admin-shell\"] h1" }] },
    { "id": "more", "label": "/admin/more", "widths": ["phone-320", "phone", "sm"], "steps": [{ "goto": "/admin/more", "wait": "[data-testid=\"admin-more\"]" }] },
    { "id": "user-menu", "label": "User menu open", "steps": [
      { "goto": "/admin", "wait": "[data-testid=\"admin-shell\"]" },
      { "click": "[data-testid=\"admin-user-menu-trigger\"]:visible" },
      { "wait": "[data-testid=\"admin-user-menu\"]", "settle": 300 } ] }
  ]
}
```

### 0b: shared primitives

**Boards:**

- `01/venues-list-status-columns`
- `01/pause-crawling`
- `02/couldnt-load`
- `07/save-failed`
- `07/not-found`
- `07/loading-any-list-on-mobile`
- `07/loading-any-detail-page-on-mobile`
- the empty states in `02/all-clear`, `06/events-no-results` and `07/people-no-results`

**Files**, all under `apps/web/src/components/admin/primitives/` unless noted:

- `apps/web/src/lib/admin/venue-status.ts` adds `deriveVenueStatusChips(venue)`, which returns `{ onSite: 'live' | 'hidden' | 'draft'; crawling: 'crawling' | 'paused' | 'auto_paused' | 'blocked' | 'robots_disallowed' }`. It's pure, it reads `active`, `crawlPausedAt`, `blockedAt`, `consecutiveFailures` and `robotsTxtAllowed`, and it reads `went_live_at` once 3c exists. The old `deriveVenueStatus` stays until 3a (decision 6).
- `venue-status.test.ts` is a table test over every combination, including "auto-paused after 3 failures" and the case where paused and blocked are both set (blocked wins).
- `VenueStatus.tsx` renders two chips in a fixed order, with a word on every chip, so color is never the only signal. Its test is `VenueStatus.test.tsx`.
- `KindLabel.tsx`: the small-caps label (`show`, `venue`, `artist`, `event`, `prices`, `bug`, `flag`, `price-check`), vertically centred.
- `SidePanel.tsx`: an overlay panel with a dim scrim. It traps focus, closes on X, on the scrim and on Esc, and doesn't shrink the page under it. It also has an `inline` mode with no scrim, for Needs you on desktop. Its test is `SidePanel.test.tsx`.
- `AdminSheet.tsx`: the phone bottom sheet with a visible heading. It shares the focus trap through `useDialogKeyboard`, and the selector excludes `[disabled]`.
- `ConfirmDialog.tsx`: an `AdminDialog` on desktop and an `AdminSheet` on the phone (rule 4). Its button names the action. Its test is `ConfirmDialog.test.tsx`.
- `PageSkeleton.tsx`: builds on `components/consumer/skeleton/SkeletonBlock` with props for tabs, filters, columns and rows. Rows fade toward the bottom. Under reduced motion it's static.
- `EmptyState.tsx`: a title, a line and one action.
- `SaveFailedToast.tsx` and `useSnapBack.ts`: the control returns to the saved value, and the toast offers Try again. Its test is `useSnapBack.test.ts`.
- `CouldntLoad.tsx`: only the content area changes. It offers Try again and Open Health.
- `index.ts` exports the new primitives.
- `app/(protected)/admin/error.tsx` renders `CouldntLoad`.
- `app/(protected)/admin/not-found.tsx` (new) renders the `07/not-found` content.
- `definitions/copy.ts` adds:
  - `venueStatus.{onSite.{live, hidden, draft}, crawling.{crawling, paused, autoPaused, blocked, robotsDisallowed}}`
  - `kind.{show, venue, artist, event, prices, bug, flag, priceCheck}`
  - `states.{couldntLoad.{title(page), body, tryAgain, openHealth}, saveFailed.{title, body(saved), tryAgain}, notFound.{title, body, back}, empty.{…}}`

**Tests:** the unit tests named above, plus an `error.tsx` test showing that the chrome stays.

**Inventory:** none of its own. Nothing renders these primitives until 1c, 1d and 2b, and their inventories carry the marker waits. `not-found` returns a 404, which the kit fails, so it's walked by hand at the 0b close-out.

### 0c: removals and redirects

**Files:**

- **Deleted:** `app/(protected)/admin/settings/loading.tsx`, `components/admin/settings/AppearanceSection.tsx`, `components/admin/settings/SettingsLayout.tsx`, `components/admin/ThemePicker.tsx`.
- `app/(protected)/admin/settings/page.tsx` becomes a `permanentRedirect('/admin/operations/emails')`.
- `app/(protected)/admin/operations/emails/page.tsx` (new) is a stub that renders the existing `OpsToolsSection`, moved to `components/admin/operations/TestEmailSection.tsx`. 5d replaces it.
- `components/admin/shell/AdminThemeProvider.tsx` reads only `cc-theme`. The `STORAGE_KEY` and `setTheme` go (decision 11), and `admin.css`'s `[data-admin-theme]` scoping stays.
- **Deleted:** `primitives/Kbd.tsx` and its export from `primitives/index.ts`. The hints are removed from `AddVenueModal.tsx`, `venue-guide/VenueGuideBlock.tsx` and `events/EventQueueSplit.tsx`, and the handlers stay.
- `apps/api/src/routes/admin/notifications.ts:83` and `apps/api/src/emails/test-fixtures.ts:171` change the "Admin settings" link to `/admin/operations/emails`.
- `definitions/copy.ts`: `settings.*` is deleted, and `operations.emails.stub.*` takes over the test-email strings.
- `apps/e2e/src/audit/manifest.ts`: `/admin/settings` becomes `/admin/operations/emails`.

**Tests:**

- A redirect test for `settings/page.tsx`.
- `AdminThemeProvider` uses `cc-theme` and ignores a stale `cc-admin-theme`.
- A static test that no file imports `Kbd` and no file contains `cc-admin-theme`.

**Inventory** `admin-0c-removals.json`: one row, `/admin/operations/emails`, which waits on `h1`. It uses the same `widths` as 0a. `/admin/settings` redirects, so the kit can't photograph it, and it's covered by the unit test plus a hand walk.

---

## Phase 1: Health, Crawl runs and run reasons

### 1a: run reasons and fetched-page records (crawler)

- **Migration:** see the ledger. In the schema, `packages/db/src/schema/crawl-runs.ts` gets `crawlRunReasonEnum` and `reason`, and a new `packages/db/src/schema/crawl-run-pages.ts` is exported from `schema/index.ts`.
- **Reason values:**

  | Value | Where it's set |
  | --- | --- |
  | `page_unchanged` | `crawl.ts`'s hash skip (~720) |
  | `crawl_paused` | ~420 |
  | `robots_unreachable` | ~455 |
  | `robots_disallowed` | ~480 |
  | `robots_crawl_delay` | ~515, and the platform adapter decline at ~1795 |
  | `timeout` | the TimeoutError branch |
  | `blocked_http` | 403 or 429, ~1856 |
  | `no_events_found` | a partial with `foundNothing` (~1670) |
  | `calendar_not_found` | the extractor finds no calendar block |
  | `llm_account` | the account-wide LLM refusal, using `crawl-error-class.ts`'s `isAccountWideKind` |
  | `error` | anything else |

  `success` rows carry NULL.
- **One writer:** `packages/crawler-core/src/lib/record-run.ts` (new) is `insertCrawlRun(db, values)`. Its type makes `reason` required whenever `status !== 'success'`. All eight `db.insert(crawlRuns)` sites in `crawl.ts` go through it, so no future path can skip the reason.
- **Fetched pages:** `packages/crawler-core/src/lib/fetch-log.ts` (new) is a per-run collector. It's passed to `fetchPage` and `fetchPageHttp` (`lib/fetcher.ts`), `lib/fetchers/detail-page.ts`, and the platform fetchers (`venuepilot.ts`, `livenation.ts`, `aeg.ts`). It records the URL, final URL, status, mode, bytes and hash, up to 50 per run, and flushes them with the run row. It holds **metadata only**, because bodies wait for 1e. The 3 s delay and the robots.txt check don't change.
- **API and types:**
  - `packages/types/src/index.ts`: `CrawlRun.reason`, plus `CrawlRunPage`.
  - `apps/api/src/routes/admin/crawl.ts`: `GET /runs` and `GET /status` return `reason`.
  - `GET /runs/:id/pages` is new and admin-gated, with its query validated by Zod.
- **Tests:**
  - `crawl.test.ts`: the reason per path, for each row above.
  - `crawl.integration.test.ts`: robots disallow, paused, 403 and unchanged each write their reason, and a detail-page crawl records N page rows.
  - `record-run.test.ts`: a type-level test with `// @ts-expect-error` on a failed run that has no reason.
  - `apps/api/src/routes/admin/crawl.test.ts`: the field is present, and non-admins get a 403.
- **Size:** about 14 files.

### 1b: settings, Done for you, the audit-log read

- **Migration:** `admin_settings`, with the schema in `packages/db/src/schema/admin-settings.ts`.
- **Routes:**
  - `apps/api/src/routes/admin/settings.ts` (new) has `GET /v1/admin/settings` and `PATCH /v1/admin/settings`, both through a strict Zod schema. The budget is `0 < x ≤ 1000`, or `null`. PATCH sets `auditAction='settings.update'` with before and after values in `auditMeta`.
  - `apps/api/src/routes/admin/audit-log.ts` (new) has `GET /v1/admin/audit-log?actor=system|admin&since&limit&cursor`. It joins `user_profiles` so it returns handles, never Clerk ids (rule 7). Done for you reads it here, and 5d reuses it.
  - Both mount in `routes/admin/index.ts`.
- **System audit writes:** `packages/crawler-core/src/lib/system-audit.ts` (new) is `recordSystemAction({ action, targetId, metadata })`, with the actor `system:crawler`. It's best effort and never fails a crawl. Call sites:
  - the 3rd-failure auto-pause and the 403/429 block in `crawl.ts`
  - `lib/stale-event-sweep.ts`
  - `reconcile-drift-duplicates.ts`, for merged duplicates
  - in the API, `routes/price-submission-confirms.ts` for a promotion (actor `system:prices`) and `lib/artist-auto-match.ts`
- **Types:** `AdminSettings` and `AuditLogItem` in `packages/types`.
- **Tests:**
  - settings integration: a 403 for non-admins, Zod rejects a negative budget and unknown keys, and an audit row is written
  - audit-log integration: the system and admin filters, handles not ids, and the cursor
  - crawler-core integration: auto-pause writes `venue.crawl_auto_paused`, and the sweep writes one row per sweep, not one per event
- **Size:** about 16 files.

### 1c: Health

**Boards:** `03/health-desktop`, `03/health-mobile`, `03/tiles-in-each-state`, `03/llm-budget-panel`, `07/loading-health`.

**Files:**

- `app/(protected)/admin/page.tsx` is a rewrite. It fetches crawl status, runs, costs (`/v1/admin/costs/daily`), settings and the audit log (`actor=system&since=<last night>`), and keeps the triage call for the interim panel (decision 20).
- `app/(protected)/admin/loading.tsx` uses `PageSkeleton` in the Health shape.
- `components/admin/health/` (new):
  - `HealthTiles.tsx`: rows at fixed heights of 14, 36, 36 and 22. Crawl, Artists, LLM cost and The site are each in four states. The Artists tile reads the artist match counts; Spotify sync is retired, so "Synced" means the artist job.
  - `VenueGrid.tsx`: grouped as Failed › Paused › Quiet › OK, using `deriveVenueStatusChips` plus `reason`. Each cell links to `/admin/venues/[id]` (it moves to `?tab=runs` in 3a).
  - `CostByDay.tsx`: reuses `dashboard/CostChart.tsx` logic, moved.
  - `LlmBudgetPanel.tsx`: a `SidePanel` on desktop and an `AdminSheet` on the phone. It PATCHes settings with `useSnapBack`.
  - `DoneForYou.tsx`
  - `ArtistSync.tsx`
- **Deleted** `components/admin/dashboard/*`: `CrawlHealthTable`, `DashboardGreeting`, `RunHistoryBlocks`, `ActivityFeed`, `CostPanel`, `RunAllVenuesButton` (which moves to 1d). `CostChart` and `lib/` are kept and moved.
- `definitions/copy.ts`: `dashboard.*` is deleted, and `health.{title, summary(n), tiles.*, grid.{failed, paused, quiet, ok, footer}, cost.*, budget.*, doneForYou.*, artistSync.*}` is added.
- "The site" tile shows the latest prod smoke and staging e2e status, if an API source exists. If none does, the tile shows emails only and the PR records the gap. It never invents a number.

**Tests:**

- `VenueGrid.test.tsx`: grouping and worst-first order.
- `HealthTiles.test.tsx`: each state.
- `LlmBudgetPanel.test.tsx`: save, snap back on failure.
- `page.test.tsx`: Couldn't load when crawl status fails.

**Inventory** `admin-1c-health.json` (the same `widths` as 0a):

```json
{
  "feature": "Admin 1c · Health",
  "note": "Plan row 1c. CONTACT_SHEET_ROLE=admin. Boards: 03-health/health-desktop, health-mobile, tiles-in-each-state, llm-budget-panel; 07/loading-health. By hand: tile states other than the live one.",
  "rows": [
    { "id": "health", "label": "/admin Health", "steps": [{ "goto": "/admin", "wait": "[data-testid=\"health-tiles\"]" }] },
    { "id": "grid", "label": "/admin venue grid", "steps": [{ "goto": "/admin", "wait": "[data-testid=\"venue-grid\"]" }, { "scrollTo": "[data-testid=\"venue-grid\"]" }] },
    { "id": "budget", "label": "LLM budget panel", "steps": [
      { "goto": "/admin", "wait": "[data-testid=\"health-tiles\"]" },
      { "clickRole": "button", "name": "^LLM cost" },
      { "waitDialog": "LLM budget" } ] }
  ]
}
```

### 1d: Crawl runs

**Boards:** `07/crawl-runs-desktop`, `07/a-runs-detail`, `07/crawl-all-venues`, `07/crawl-all-running`, `07/crawl-runs-mobile`, `07/loading-crawl-runs`.

**Files:**

- `apps/api/src/routes/admin/crawl.ts` adds `GET /v1/admin/crawl/batches?kind=all|nightly|by_hand|not_ok&limit` and `GET /v1/admin/crawl/batches/:key` (decision 18), both validated with Zod. `POST /v1/admin/crawl` (Crawl all) is unchanged: it skips paused and blocked venues, and the crawler keeps the 3 s pace and robots.txt.
- `apps/api/src/routes/admin/lib/crawl-batches.ts` (new) is a pure grouping function. Its test covers the night boundary in Mountain Time across DST, a by-hand burst, a missing nightly ("Didn't start") and a retry.
- `app/(protected)/admin/crawl/page.tsx` is a rewrite to the list. **`?venueId=` keeps rendering today's `CrawlSplitView`** until 3b moves diagnostics and staged apply into Source, so crawler email links keep working.
- `components/admin/crawl-runs/` (new):
  - `CrawlRunsTable.tsx` (cards on the phone)
  - `RunDetailPanel.tsx` (`SidePanel` on desktop, full screen on the phone)
  - `CrawlAllDialog.tsx` (`ConfirmDialog`, which replaces `dashboard/RunAllVenuesButton`)
  - `CrawlAllProgress.tsx`, which polls `GET /crawl/status`
- `app/(protected)/admin/crawl/loading.tsx`.
- `definitions/copy.ts` adds `crawlRuns.*`. The strings in `crawlPage.*` that the split view still needs stay.

**Tests:**

- `crawl-batches.test.ts`.
- An API integration test for both routes, including a 403 for non-admins.
- `CrawlAllDialog.test.tsx`: it states the skip rules and posts once.
- `page.test.tsx`: `?venueId=` still renders the split view.

**Inventory** `admin-1d-crawl-runs.json`:

```json
{
  "feature": "Admin 1d · Crawl runs",
  "note": "Plan row 1d. CONTACT_SHEET_ROLE=admin. Boards: 07/crawl-runs-desktop, a-runs-detail, crawl-all-venues, crawl-runs-mobile, loading-crawl-runs. By hand: crawl-all-running (it starts a real crawl; staging only, and only when Hugh says so).",
  "rows": [
    { "id": "list", "label": "/admin/crawl", "steps": [{ "goto": "/admin/crawl", "wait": "[data-testid=\"crawl-runs-table\"]" }] },
    { "id": "detail", "label": "Run detail", "steps": [
      { "goto": "/admin/crawl", "wait": "[data-testid=\"crawl-runs-table\"]" },
      { "click": "[data-testid=\"crawl-batch-row\"]:visible >> nth=0" },
      { "wait": "[data-testid=\"run-detail\"]", "settle": 300 } ] },
    { "id": "crawl-all", "label": "Crawl all dialog (not confirmed)", "steps": [
      { "goto": "/admin/crawl", "wait": "[data-testid=\"crawl-runs-table\"]" },
      { "clickRole": "button", "name": "^Crawl all venues" },
      { "waitDialog": "Crawl all venues now" } ] }
  ]
}
```

### 1e: fetched HTML bodies (blocked on Hugh: retention)

- Writes a gzipped body for each `crawl_run_pages` row and sets `body_expires_at = fetched_at + <window>`.
- Adds a daily sweep (`packages/crawler-core/src/lib/page-body-sweep.ts`, run from the daily job) that nulls expired bodies.
- Adds `GET /v1/admin/crawl/pages/:id/body` (admin, audited reads not needed).
- `debugCaptureHtml` stays as the stdout logger.
- Tests: the expiry sweep, the size cap (bodies over 2 MB are skipped and recorded as truncated), and gzip round-trip.

---

## Phase 2: Needs you

### 2a: the queue API

**Sources.** These are existing ones, not rebuilt:

| Kind | Source |
| --- | --- |
| `show-dropped` | `events.first_missing_at`; `routes/admin/lib/classify-missing.ts` |
| `show-moved` | `routes/admin/lib/moved-candidate.ts` |
| `venue-failing`, `venue-blocked`, `venue-quiet` ("Fewer shows than usual" with a likely cause) | `routes/admin/lib/triage.ts` |
| `artist` | the artist match status, limited to upcoming shows within **60 days**, plus `artist_reports` |
| `event-low-confidence` | `events.verified = false` |
| `price-check` | contests: `price_submissions.disputed_submission_id` |
| `price-batch` | held submissions |
| `bug` | feedback of category `bug` in To read |

**Files:**

- `apps/api/src/routes/admin/needs-you.ts` (new) has:
  - `GET /v1/admin/needs-you?kind`
  - `GET /v1/admin/needs-you/count` (the decision count for the badge)
  - `POST /items/:key/snooze` with `{ until | notUseful, reason? }`
  - `DELETE /items/:key/snooze`
  - `POST /items/:key/answer` with `{ answer }`
  - `POST /answers/:auditId/undo`

  All of it goes through Zod, and every mutation is audited (`needs_you.answer`, `needs_you.snooze`, `needs_you.undo`).
- `apps/api/src/routes/admin/lib/needs-you/` (new):
  - `sources.ts`: one adapter per kind, giving a stable `item_key` of `<kind>:<id>[:<evidenceKey>]`
  - `rank.ts`: soonest fan-visible date first, then Watching count
  - `group.ts`: several shows dropping at one venue in one run become one venue notice
  - `answers.ts`
  - `index.ts`
- `answers.ts` is a dispatch table, one row per drawn answer, that calls the existing domain functions. It stores the prior state in `auditMeta.before`. **Undo** exists only where an inverse exists: Still on, Not a concert or It's a show, and Keep match. Answers that notify fans (Cancelled, a price check resolution) have no Undo, and their buttons sit behind `ConfirmDialog` in 2c.
- The schema is `packages/db/src/schema/admin-queue-snoozes.ts`. `prices.ts` gets `heldForAdminAt`.
- **The price hold:** in `routes/price-submission-confirms.ts`, when `admin_settings.approve_prices_myself` is true, a confirm that would promote sets `held_for_admin_at` and doesn't promote. Approving a batch promotes through the same code path. The default is false, so today's behaviour is unchanged.
- "N handled today" reads `audit_log` (`needs_you.answer` since midnight Mountain Time).
- `packages/types` adds `NeedsYouItem` as a discriminated union on `kind`, plus `NeedsYouCount`.

**Tests:**

- Integration:
  - ranking order
  - venue grouping
  - artist items outside 60 days are excluded
  - snooze hides an item until `until`, and Not useful hides that kind for that venue
  - answer and undo round-trip with an audit row each
  - Undo is refused for a notifying answer
  - the count equals the visible decisions
  - a 403 for non-admins
- The price hold:
  - with the setting off, promotion is unchanged
  - with it on, the submission is held and not promoted
  - approving a batch promotes it and notifies exactly once

**Size:** about 19 files. If it runs over, the price hold splits out into **2a′** before the PR opens.

### 2b: the queue UI and retiring Review

**Boards:** `02/needs-you-desktop`, `02/needs-you-mobile`, `02/answered-with-undo`, `02/snooze-menu`, `02/all-clear`, `02/an-item-mobile` (the shell only), `02/couldnt-load`, `07/loading-needs-you`.

**Files:**

- `app/(protected)/admin/needs-you/page.tsx` and `loading.tsx` (new).
- `components/admin/needs-you/` (new):
  - `NeedsYouClient.tsx`: the segmented kind filter with counts, the list, and `?item=` selection
  - `QueueItem.tsx`: `KindLabel`, the when line, what happened, the likely cause, and two or three answers (on the phone, the first two are buttons and the rest sit under them)
  - `AnsweredRow.tsx` with Undo
  - `SnoozeMenu.tsx`
  - `AllClear.tsx`
  - `EvidenceSlot.tsx`: `SidePanel` inline on desktop, a full page on the phone, with a placeholder per kind until 2c
- The layout badge: `admin/layout.tsx` fetches `/v1/admin/needs-you/count`, and `nav.ts` points Needs you at `/admin/needs-you`.
- **Redirects** (decision 4):
  - `admin/review/page.tsx` redirects when `tab` is missing or is `event-flags`, `missing` or `contests`, and otherwise keeps rendering `ReviewPageClient`.
  - `review/contests/[contestId]/page.tsx` becomes a redirect.
  - `lib/admin/review-tabs.ts` drops the retired keys, and `edit-event-link.ts` maps an old `from=` to `/admin/needs-you`.
  - `triage/lib/deep-links.ts` targets Needs you items.
  - `admin/page.tsx` removes the interim `TriagePanel`, and `components/admin/triage/*` is deleted (decision 20).
- **Deleted:** `review/EventFlagsSection*`, `EventFlagInspector`, `EventFlagRow`, `PriceDisputesQueue*`, `AdminDisputePanel*`, `_tabs/EventFlagsTabContent`, `MissingTabContent*` and `ContestsTabContent*`. Anything 2c needs is moved, not deleted.
- **Copy:** `needsYou.{title, summary(n), handledToday(n), filters.*, when.*, answers.*, undo.*, snooze.*, allClear.*}`. The `review.*` and `triage.*` keys for retired tabs go.
- **e2e manifest:** the contest path becomes `/admin/needs-you`, and the `?tab=` rows that remain stay.

**Tests:**

- `NeedsYouClient.test.tsx`: the filter counts, the Undo toast, and a snooze removing the row.
- Redirect tests for each retired tab and for the contest URL.
- A drift test that every `REVIEW_TAB_KEYS` entry has either a page or a redirect.

**Inventory** `admin-2b-needs-you.json`:

```json
{
  "feature": "Admin 2b · Needs you queue",
  "note": "Plan row 2b. CONTACT_SHEET_ROLE=admin. Boards: 02-needs-you/needs-you-desktop, needs-you-mobile, answered-with-undo, snooze-menu, all-clear, couldnt-load; 07/loading-needs-you. By hand: answered-with-undo (it writes), all-clear (needs an empty queue), couldnt-load (API down), the /admin/review redirects (the kit fails a redirect).",
  "rows": [
    { "id": "queue", "label": "/admin/needs-you", "steps": [{ "goto": "/admin/needs-you", "wait": "[data-testid=\"needs-you-queue\"]" }] },
    { "id": "item", "label": "First item open", "steps": [
      { "goto": "/admin/needs-you", "wait": "[data-testid=\"needs-you-item\"]" },
      { "click": "[data-testid=\"needs-you-item\"]:visible >> nth=0" },
      { "wait": "[data-testid=\"evidence-panel\"]", "settle": 300 } ] },
    { "id": "snooze", "label": "Snooze menu", "steps": [
      { "goto": "/admin/needs-you", "wait": "[data-testid=\"needs-you-item\"]" },
      { "click": "[data-testid=\"needs-you-item\"]:visible >> nth=0 >> [data-testid=\"snooze-trigger\"]" },
      { "wait": "[data-testid=\"snooze-menu\"]" } ] },
    { "id": "venues-filter", "label": "Venues filter", "steps": [
      { "goto": "/admin/needs-you", "wait": "[data-testid=\"needs-you-queue\"]" },
      { "clickRole": "tab", "name": "^Venues" },
      { "wait": "[data-testid=\"needs-you-queue\"]", "settle": 300 } ] }
  ]
}
```

### 2c: evidence panels and the price batch

**Boards:**

- `02/show-dropped-off-a-calendar`
- `02/show-renamed-moved`
- `02/venue-auto-paused-after-3-failures`
- `02/venue-blocked-403-429`
- `02/artist-wrong-artist-report-or-unsure-match`
- `02/event-low-confidence`
- `02/price-check`
- `02/bug-or-error-report`
- `02/a-batch-of-prices`
- `02/an-item-mobile`

**Files:**

- `components/admin/needs-you/evidence/`: `ShowDropped.tsx`, `ShowMoved.tsx`, `VenueFailing.tsx` (the last 14 runs with their `reason`, plus last year's season), `VenueBlocked.tsx` (Ask the venue is disabled until 3c, with a line saying so), `ArtistMatch.tsx`, `EventLowConfidence.tsx`, `PriceCheck.tsx` (both prices, Ticket page first), `Bug.tsx`, and `index.ts`.
- `PriceBatchSheet.tsx` (`AdminSheet` or `SidePanel`): untick, then Approve N.
- Moved `EvidenceBars.tsx` and `MissingLinks` from `triage/` and `review/missing/`.
- **Copy:** `needsYou.evidence.{showDropped, showMoved, venueFailing, venueBlocked, artist, lowConfidence, priceCheck, bug}.*` and `needsYou.priceBatch.*`, with the `crawl_run_reason` labels in `needsYou.reasons.*`.
- `ConfirmDialog` wraps every answer that notifies fans.

**Tests:**

- One render test per panel, against fixtures from 2a's types.
- `PriceBatchSheet.test.tsx`: untick, then approve the count.
- A notifying answer asks first.

**Inventory** `admin-2c-evidence.json`: the 2b `queue` and `item` rows repeated, once per kind filter (`Shows`, `Venues`, `Artists`, `Prices`, `Bugs`), each waiting on `[data-testid="evidence-panel"]`, plus a `price-batch` row on phone and desktop that waits on `[data-testid="price-batch"]`. When a kind has no live item on staging, its row is walked by hand and named in `note`.

---

## Phases 3 to 6 (detailed plans after the addendum)

**Phase 3: Venues and Add a venue (3a to 3e).**

- **3a** replaces the venues list (worst first, with the robots.txt column and filter, which retires `robots-audit`) and the venue page's Overview and Runs tabs. It adds the ⋯ menu: Pause crawling with a reason and a resume rule, Hide from site, Delete with an API guard (no shows and no Watchers), and the takedown line (decision 21). `VenueStatus` replaces every old badge, and the old `deriveVenueStatus` is deleted. It's the first inventory with a `shares` block (`VenueStatus` across Health, Venues and the venue page). 3a can start after Phase 0. It doesn't need the addendum.
- **3b** (Source, Details, Guide, Inspect) waits for addendum gaps 2 and 4 and for 1e. It absorbs `CrawlSplitView`'s diagnostics and staged apply into Source, and moves `/admin/crawl?venueId=` to the Runs tab.
- **3c** (the draft and live state, test-crawl mode as a `crawl_triggers.mode='test'` dispatch-and-poll under the real robots.txt and 3 s rules, Ask the venue with a `mailto:` draft and the 14-day return to Needs you, and `hero_setting`) and **3d** (glyph drafting checked against the 24-grid stroke rules, and guide drafting from allowed pages only, with every call writing `cost_tracking`) can proceed now.
- **3e** waits for gap 3, B+ B11 and the Arena decision. `VenueGlyph` gets a `glyph_svg` fallback in 3e.

**Phase 4: Events, Artists, Prices (4a to 4d).**

- **4a** adds `event_artists` with a backfill, `events.manual` (the crawler's upsert and the stale sweep both skip manual rows, with crawler-core integration tests), and merge semantics. A merge moves Watchers, prices and reports, and the old `/events/[id]` redirects through `merged_into_id`. It's crawl-adjacent, so its phase plan goes first.
- **4b** builds Events and Event edit with the shared price sheet, Mark cancelled (notifies Watchers, behind `ConfirmDialog`), add by hand and merge. Merge on the phone waits for gap 1.
- **4c** builds Artists with To check, Matched and Not artists, plus the search overlay.
- **4d** builds Prices: Missing a price with Publish and next, Submitted prices with handles from a join to `user_profiles`, Price checks, and the "Approve every price myself" toggle from 1b. It retires the last Review tabs and redirects `/admin/review` entirely.

**Phase 5: People, Feature flags, Operations (5a to 5e).**

- **5a** moves Users to People. It adds the Test account tag (storage per Hugh), a masked email with an audited Show email (`user.email_shown`), Sign them out everywhere through Clerk's session revoke (audited), the role change with Undo, and Make admin asks first.
- **5b** moves invite codes and posters under People. It adds `PATCH` Edit, Reactivate (both audited) and who joined from `invite_code_redemptions`, with one rule set shared by codes and posters.
- **5c** builds the flag ladder, named people, Mark verified in staging and history, and removes `spotify-sync`. The production lock reads staging over the transport Hugh picks.
- **5d** builds Operations:
  - Feedback, with To read and Done (decision 3), the new kinds, and Reply (a single reply stored on the row, audited)
  - Emails, which replaces 0c's stub with a list of only the emails still sent and a preview against a real show
  - Activity log over `GET /admin/audit-log?actor=admin`
- **5e** is Block, only if Hugh keeps it.

**Phase 6: fan side, behind a flag.**

- A new `FeatureFlagKey` with `defaultEnabled: false`.
- Send feedback in the account menu, with the modal kinds including Suggest a venue (`feedback_category` values from 5d).
- The reply is delivered as a What you missed notice (a new `notifications.category`) plus one email template.
- `FeedbackEdgeTabGate` is removed at launch.
- It waits for Hugh's Send feedback answer, runs copy-review on the fan strings first, and adds one `releases.ts` entry.

## Proposed intake (for Hugh, not filed)

- Need 27, unsaved admin edits that survive signing out or going offline, as its own plan.
- Need 20, the Sentry people-affected count on error reports.
- Need 12, the canonical-name fix, as a crawl-adjacent plan.

## Next

1. This plan PR (doc only).
2. Ask Design for the phone addendum covering gaps 1 to 4, with Hugh's yes, and put the six Hugh decisions to him.
3. Build 0a, then 0b, then 0c, one PR at a time. 1a and 1b may run in a second lane alongside them, because they touch only backend files.
