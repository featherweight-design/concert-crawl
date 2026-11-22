# Admin 3e: Add a venue, the full page at `/admin/venues/new` (phase plan)

**Parent plan:** `docs/superpowers/plans/2026-11-11-admin-redesign.md` (rows 3c, 3d and 3e, the Migrations ledger, the Status gates).
**Handoff:** `design/design_handoff_admin_redesign/`: boards `05-add-a-venue/*` and `phone-addendum/boards/gap-3-add-a-venue/*`, `COPY.md` and `BUILD-CHECK.md`. READINESS is 🟡 Yellow (`READINESS.md`, addendum audit). No Design round is outstanding. Decisions **A7** and **6** (Arena is the crescent) apply.
**Ordering (Hugh, 2026-11-22, option B):** build 3e first. "Start adding it" (addendum 7 item 3, the suggested-venue button) comes last and links into this flow.
**Migration:** one, for the dismissals table in 3c-3. Its number is whatever `origin/main` has next when 3c-3 is built (0128 as of 2026-11-22). It is expand-only, and prod needs Hugh's OK.

## Goal

An admin adds a venue on one full page, in five steps: Basics, Source, Icon (optional), First-timer guide (optional) and Review. The venue is a draft until Go live, every step is saved as the admin goes, and nothing reaches fans or the nightly crawl before Go live. Start lists the venues fans asked for. The old `AddVenueModal` retires.

## What already exists (audited 2026-11-22 on `origin/main` 4dd5ef95a)

This changes the parent plan: **3c and 3d were never built** beyond migration 0116. They are planned here as PRs 3c-1 to 3d-2.

- **Columns (0116):** `venues.went_live_at`, `permission_asked_at`, `hero_setting` (six values) and `glyph_svg`, plus `crawl_triggers.mode` (`crawl` | `test`). The ledger's `crawl_paused_reason` is really `crawl_pause_reason` (with `crawl_pause_note` and `crawl_resume_on`). The ledger's 3c row also omits A7's dismissals table. Both are corrected in this plan.
- **Nothing reads `went_live_at`.** `POST /v1/admin/venues` (`apps/api/src/routes/admin/venues.ts:788`) stamps it with `now`, so no draft exists anywhere yet.
- **`active` already gates what a draft must stay out of:** the nightly schedule (`apps/crawler/src/run.ts:680`, `packages/crawler-core/src/crawl.ts:798`) and every forward-looking public read (`venues-public.ts:76,154`, `events.ts`, `search.ts`, `artists-public.ts:233,380`, price routes). The artist page's past shows (`artists-public.ts:399`) skip the `active` filter on purpose (#1299). A draft has no events, so that query never sees one.
- **`active` also gates the on-demand crawl**, which a draft's test crawl has to pass: `POST /v1/admin/crawl/:venueId` returns 400 for an inactive venue (`crawl.ts:244`), crawler-core's queue reads `active` and `verified` (`crawl.ts:798`), and `run.ts:190` `isVenueGone` treats `!active` as gone.
- **`venue-auto-resume.ts:31-45`** un-pauses on `crawl_resume_on`, ignoring `active` and `went_live_at`.
- **Nothing writes or reads `mode='test'`.** `POST /v1/admin/crawl/:venueId` (`crawl.ts:243`) takes `{ force, trial }`. Trial is a real crawl of a paused venue, not a test. `GET /v1/admin/crawl/triggers/:id` (`crawl.ts:338`) returns progress only.
- **Exists and is reused:** `GET /v1/admin/venues/robots-check` (`venues.ts:576`), `POST /v1/admin/venues/:id/probe-platform` (`venues.ts:1288`), the guide routes (`venue-guide.ts`: GET, PUT, publish, unpublish), `recordLlmCost`, the admin primitives (`components/admin/primitives/`), the Source tab parts (`venues/source/`) and the Guide editor (`venues/guide/GuideEditPanel.tsx`).
- **Missing:** Ask the venue (Needs you `VenuePanel.tsx:176-197` keeps a disabled button), Go live, glyph drafting and its style validator, guide drafting, the suggestions list, the dismissals table, the `VenueGlyph` `glyph_svg` fallback, and the `new` route.
- **Hero renderer:** street, outdoor and arena (crescent) exist. Theater, club and gallery do not; they are B+ **B11**. Nothing reads `venues.hero_setting`.
- **Suggestions:** `feedback_category 'venue_suggestion'` exists (migration 0117), but nothing writes it until the fan modal (#765) lands.

## Decisions

1. **A draft is `active = false` and `went_live_at IS NULL`.** The existing `active` filters keep drafts out of forward-looking public reads and the nightly crawl, with no new public reader filter. The one new admission is the test crawl (decision 3). Go live is the only writer that sets both. Show (unhide) refuses a draft with a 409, so a draft cannot go live by the back door. `deriveVenueStatusChips` returns `onSite: 'draft'` when `went_live_at` is NULL, before the hidden check.
2. **The draft row is created when the name is first saved on Basics**, not when the page opens, because `venues.name` and `slug` are NOT NULL. The URL is `/admin/venues/new` until then, and `/admin/venues/new?id=<venueId>&step=<step>` afterwards (a `replace`, so Back leaves the flow), so a reload resumes at the same step.
3. **Test crawl is `crawl_triggers.mode = 'test'`.** The dispatch route, crawler-core's queue read and `isVenueGone` admit an inactive venue **only** when it is a draft (`went_live_at IS NULL`) **and** the trigger's mode is `test`, and a `test` trigger on a live venue is refused. Integration tests cover both directions: a draft's `crawl` trigger is refused, and a hidden live venue's `test` trigger is refused. It follows the same robots.txt check, the 3 s delay with jitter and the same extraction cascade. It writes nothing to `events`, never touches the failure streak, the pause or the blocked flag, and records its result on the trigger row: per-stage counts (HTML, JSON-LD, Haiku), up to three sample shows, the cost and the run id for Inspect. Review's "Source passed" reads the latest test trigger for the venue's current Source config.
4. **Fork 1, OPEN (Hugh's 3c call (a), 2026-11-14): what Go live does.** **Provisional: option A.** Go live sets `active` and `went_live_at` and dispatches a normal crawl at once, and Gone live gives the test's count as "found in the test", with the shows arriving within minutes. Option B stores the test rows and publishes them on Go live, as drawn ("31 shows are on the site now"). Under A the Gone live line differs from the board, so it goes to Design as a UI discrepancy. 3c-2, 3c-3 and 3e-2 stay unmerged until Hugh rules.
5. **No storage bucket (orchestrator, 2026-11-22).** An icon reference image is read client-side and sent inline to the drafting call, never stored. "Upload an SVG" is read client-side and saved to `glyph_svg` only after the style validator passes.
6. **The Start list reads `feedback` rows with category `venue_suggestion`** (orchestrator, 2026-11-22). Rows are grouped by normalized venue name ("N fans suggested it · latest Nov 9", most asked first), and active dismissals are excluded. Until suggestions exist it shows Nobody asked yet. "Who's told: N fans" is hidden at 0. The fan notice at Go live is a proposal for Hugh, not built.
7. **Ask the venue's To field starts blank and is editable** (orchestrator). Nothing in the data model holds a venue contact address.
7a. **Ask the venue doesn't use the pause machinery.** A draft is never crawled, so it sets only `permission_asked_at`, and "Paused: waiting on permission" is derived from that on a draft. The 14-day return is a Needs you kind that reads `permission_asked_at < now() - 14 days` on a draft. It never sets `crawl_paused_at` or `crawl_resume_on`, so `venue-auto-resume.ts` never touches it.
8. **Undo on Not for us is phone only, as drawn** (READINESS; the addendum's desktop proposal is still Hugh's call).
9. **The hero picker waits on B+ B11** (orchestrator is confirming the owner). 3e-3 does not merge until all six settings render.
10. **Glyph drafting** asks Claude Haiku for four SVGs at 24 × 24 with a 1.6 stroke and no fills. `validateGlyphSvg` (pure, unit-tested) checks the viewBox, stroke-only paths, the grid bounds and an element allowlist, then sanitizes. A draft that fails is hidden and counted ("Hidden 3 of 4…"). Every call writes `cost_tracking` with service `venue-glyph`.
11. **Guide drafting** fetches only robots-allowed pages from the venue's own site (the existing `fetchPage` path with its delay), never drafts Insider tip, and tags each section Drafted, Check this or Blank, with its source URL. Service `venue-guide-draft`. Saving and publishing reuse the existing guide routes.
12. **AddVenueModal retires in 3e-1.** Venues' **+** links to `/admin/venues/new`, and the modal and its test file are deleted in the same PR.

## PR table

There are no stacked PRs. Each comes from fresh main and stays within about 20 files or 800 lines. "Risky" means `/code-review medium` plus the risk checklist, recorded under `## Claude review` with `## Copilot off`. Every UI PR carries a `## Design review` table and a contact sheet (phone 320 and 390, desktop 1300; `*-320` boards where drawn, 390 boards elsewhere), and `BUILD-CHECK.md`.

| PR | What | Risky | Routes | Waits on |
|---|---|---|---|---|
| **3c-1** | Draft safety: draft create (`POST /v1/admin/venues` with `draft: true` writes `active=false`, `went_live_at=NULL`, audited), `PATCH` saves for draft steps, Show refuses a draft, the `draft` chip, and the admin venues list and filters showing drafts. Integration tests prove a draft is absent from public venue, event and search reads and from the nightly schedule. | Yes | backend, `venue-status.ts` | none |
| **3c-2** | Test crawl: dispatch with `mode='test'`, with draft admission through `crawl.ts:244`, crawler-core's queue read and `isVenueGone` (decision 3). The crawler and crawler-core honour it (no event writes, no streak or pause change), result fields go on the trigger, and the poll returns them. | Yes | backend, crawler | 3c-1. **Merge waits on fork 1.** |
| **3c-3** | Ask the venue (`permission_asked_at` only, the 14-day Needs you kind and They said yes / no, per decision 7a), Go live (decision 4), the suggestions list API, `venue_suggestion_dismissals` (migration, A7) with Not for us and Undo, all audited. Enables the Needs you Ask the venue button. | Yes | backend | 3c-2. **Merge waits on fork 1.** |
| **3d-1** | Glyph drafting route and `validateGlyphSvg`, plus the `VenueGlyph` `glyph_svg` fallback (sanitized SVG, the MapPin fallback kept). | Yes | backend, one component | 3c-1 |
| **3d-2** | Guide drafting route. | Yes | backend | 3c-1 |
| **3e-1** | Route shell (stepper, "Saved as you go", phone "Step N of 5"), Start (list, Nobody asked yet, loading, couldn't load, Not for us with phone Undo and its failure), Step 1 Basics, retire AddVenueModal. | No | `/admin/venues/new`, Venues **+** | 3c-1, 3c-3's list API (if 3c-3 is held, Start ships with Start from scratch and Nobody asked yet only, and the list follows) |
| **3e-2** | Step 2 Source (reusing the `venues/source/` parts: running, no shows found, robots.txt disallows) and Ask the venue, then Step 5 Review (not ready), Going live, Go-live failed and Gone live. | No | `/admin/venues/new` | 3c-2, 3c-3. **Merge waits on fork 1.** |
| **3e-3** | Step 3 Icon: references, drafting, failed the style check, Upload an SVG, and the hero picker with six settings. | No | `/admin/venues/new` | 3d-1, **B+ B11** |
| **3e-4** | Step 4 Guide: drafted sections, Redraft, nothing to draft from, Write it myself, Skip. | No | `/admin/venues/new` | 3d-2 |
| **Start adding it** | Addendum 7 item 3: the suggested-venue button links to `/admin/venues/new?from=<feedbackId>` and Basics quotes the suggestion. It follows `cc-readiness-addendum7-item3-2026-11-22.md`. | No | feedback item, `/admin/venues/new` | 3e-1 |

Build order: 3c-1, then 3d-1, 3d-2 and 3e-1 (independent of fork 1), then 3c-2, 3c-3, 3e-2 (open, held until Hugh rules), then 3e-4, 3e-3 (after B11), then Start adding it.

## Route × viewport inventory (feature-acceptance)

| Route / state | 320 | 390 | 1300 |
|---|---|---|---|
| Start, default / loading / couldn't load / Nobody asked yet / not for us (+ failed) | `start-mobile-320` | `gap3/start-*-mobile` | `05/add-a-venue-start`, `start-nobody-asked-yet` |
| Ask the venue / after | 390 board | 390 board | `05/ask-the-venue`, `after-ask-the-venue` |
| Basics | 390 board | `step-1-basics-mobile` | `basics-desktop` |
| Source: default, running, no shows, robots disallows | 390 board | `source-mobile` | `step-2-source`, `source-*` |
| Icon: default, drafting, failed, hero picker | 390 board | `icon-mobile` | `step-3-icon-optional`, `icon-*`, `all-six-settings` |
| Guide: default, nothing to draft from | 390 board | `guide-mobile` | `step-4-…`, `guide-nothing-to-draft-from` |
| Review, not ready, going live, go-live failed | 390 board | `step-5-review-mobile`, `gap3/going-live-mobile`, `go-live-failed-mobile` | `review-desktop`, `review-not-ready` |
| Gone live | `gone-live-mobile-320` | `gone-live-mobile` | `05/gone-live` |

Desktop states with no drawn phone board, and phone states with no drawn desktop board, follow the nearest drawn pattern and are recorded as 🔸 rows.

## Open questions

1. **Fork 1 (Hugh):** Go live crawls now (A, provisional) or publishes stored test rows (B). Under A, the Gone live line goes to Design.
2. **B+ B11 owner and timing** (orchestrator): it gates 3e-3.
3. **Desktop Undo on Not for us** (Hugh, from the addendum's proposals).

## Proposed intake (for Hugh, not filed)

- Tell the fans who suggested a venue when it goes live ("Who's told"). It needs a stored link from suggestion to fan and a notification kind.

## Next

Merge this plan, then build 3c-1.
