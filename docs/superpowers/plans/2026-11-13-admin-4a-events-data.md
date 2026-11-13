# Admin 4a: event lineups, shows added by hand, and merge semantics (phase plan)

**Parent plan:** `docs/superpowers/plans/2026-11-11-admin-redesign.md` (rows 4a and 4b, the Migrations ledger).
**Handoff:** `design/design_handoff_admin_redesign/` (boards `06/event-edit`, `06/add-a-show-by-hand`, `06/merge-duplicates`, `06/past-shows`, `06/event-menu`; phone addendum gap 1), with `READINESS.md` decisions **A1**, **A2** and **A3**.
**Risk:** every PR here is risky (migration, crawler-core, API routes). Each gets `## Copilot off`, `/code-review medium` and the risk checklist under `## Claude review`.
**Migration:** `0115` only (assigned by the orchestrator; `0116` is not needed and goes back). It is expand-only. Prod needs Hugh's OK, because it is 0114 or higher.

## Goal

Give 4b (the Events and Event edit UI) the backend it needs:

- a lineup stored as links to artists;
- shows added by hand that the crawl never removes or rewrites;
- merges that move everything to the kept listing, redirect the old one, and stay merged on the next crawl.

## What already exists (audited 2026-11-13 on `origin/main`)

This changes the ledger's 4a row in two places, recorded under Decisions.

- **Merge already moves everything.** `mergeEventRows` (`packages/db/src/event-merge.ts`) runs in one transaction. It moves Watchers and attendance (`user_events`, salvaging attendance), `price_submissions`, `price_retrieval_log`, `event_reports`, `user_event_dismissals`, `spotify_alert_log` and existing redirects. It then writes an `event_redirects` row and deletes the source.
  - `POST /v1/admin/events/:id/merge` calls it, with `notifyWatchers` optional.
  - `merge-duplicate-nights` uses the same core.
  - Every foreign key to `events` is covered.
- **Redirects are live (0113).** `GET /v1/events/:id` follows `event_redirects` with a 307 (`no-store`), and the web `/events/[id]` page `permanentRedirect`s when the id changes. A chain is never longer than one hop.
- **The lineup today is four arrays:** `headliners` and `supporting_artists` for display, and `canonical_headliners` and `canonical_supporting` for matching.
  - Every reader matches through `billsCanonicalName` / `billsAnyCanonicalName` (`apps/api/src/lib/event-billing.ts`). That covers the artist page, follows, search, Spotify matches and the weekly digest.
  - Writers are:
    - the crawl upsert, which COALESCEs a NULL bill back to the stored one;
    - Repair event artists (`rederive-event-artists.ts`, #262);
    - `merge-duplicate-nights`, which fills the survivor;
    - a few one-off scripts.
  - `artists` rows are created after the upsert by `projectArtists`, insert-if-absent and best effort. So when an event is written, its `artists` rows may not exist yet.
- **No hand-added events exist.** There is no create endpoint, and no `manual`, `created_by` or source column.
- **The crawl touches existing rows in six places:**
  - the upsert (`crawl.ts` `onConflictDoUpdate`, target `(venue_id, date, canonical_artist, show_time) WHERE status='upcoming'`, no `setWhere`);
  - `markEventsSeenForVenue`;
  - Pass 1 (mark seen);
  - Pass 2 (set `first_missing_at`);
  - `reconcileDriftDuplicates` (deletes missing rows that have a live sibling);
  - the stale sweep (`stale-event-sweep.ts`: `first_missing_at` older than 14 days sets `cancelled` and `delisted_at`).
- **The admin list** (`GET /v1/admin/events`) defaults `dateFrom` to Denver today, so **past shows are unreachable** from the UI (the bug Hugh hit).

## Decisions

1. **Merge redirects reuse `event_redirects`. No `events.merged_into_id`.** A merge deletes the source row, and 0113's table already gives every old id a one-hop 307. A `merged_into_id` column would mean keeping a dead row that every list query must exclude, which is a second mechanism for the same job. The ledger's `merged_into_id` is dropped.
2. **The crawl stays merged through the redirect (READINESS A1).**
   - 0115 adds the source row's crawl key to `event_redirects`: `venue_id`, `date`, `canonical_artist` and `show_time`, all NULL for older rows. `mergeEventRows` copies them from the source before it deletes it.
   - Before inserting, the crawl looks up a redirect for that key at the venue. When it finds one, the listing updates the **target** instead of creating a new row.
   - It writes crawl-owned fields only: `ticket_url`, `ticket_links`, `event_url`, `last_seen_at`, and clearing `first_missing_at`. It never writes the title, the lineup or the date.
   - This holds for any target, crawled or manual. Two live listings for one row must not overwrite each other's title on alternate nights.
   - Without this, merging two crawled listings brings the loser back on the next crawl. That is a latent bug today too, and this fixes it.
3. **`events.manual boolean NOT NULL DEFAULT false` and `events.created_by text NULL`** (READINESS A2: a Clerk user id, rendered as the handle). On a manual row:
   - **The upsert** writes crawl-owned fields only, through a `CASE WHEN events.manual THEN events.<col> ELSE excluded.<col> END` on every listing-owned column. That covers the title, `canonical_title`, the times, the description, the image, `extraction_strategy`, confidence, and all four artist arrays.
   - **Pass 2, the stale sweep and `reconcileDriftDuplicates`** never select a manual row, so it is never marked missing, delisted or deleted.
   - **`merge-duplicate-nights`** leaves manual rows out of its candidate groups. An admin merges them by hand.
   - **Repair event artists** skips manual rows.
   - Pass 1 and `markEventsSeenForVenue` may still mark a manual row seen. That is harmless and true.
4. **One more column: `events.lineup_edited_at timestamptz NULL`.** The Event edit board edits the lineup on crawled shows, Past shows included ("read-only except Hidden and lineup"). Without a lock, the next crawl or Repair run overwrites the admin's lineup with the venue's bill.
   - A lineup saved from admin sets the column.
   - The upsert's lineup CASE then reads `events.manual OR events.lineup_edited_at IS NOT NULL`, and Repair skips the row.
   - Title edits on crawled rows keep today's behaviour: the next crawl that sees a changed listing rewrites them. That's unchanged and out of scope.
   - **Orchestrator: confirm this addition to the ledger.**
5. **The single source of truth after 4a is still the four arrays. `event_artists` is a dual-written projection.** This is expand first, contract later.
   - `event_artists` has `event_id` (FK cascade), `artist_id` (FK cascade), `role` (`headliner` or `support`) and `position` (smallint), with primary key `(event_id, artist_id)` and an index on `artist_id`.
   - **One writer, `syncEventArtists(tx, eventIds)`** in `packages/db`, rebuilds the rows for those events from the arrays:
     - Headliners come in `headliners` display order, each run through `canonicalizeArtist` and looked up by `artists.canonical_name`. `canonical_headliners` is sorted, so it is never used for position.
     - Supports come from `supporting_artists` the same way.
     - When `canonical_headliners` is NULL, `canonical_artist` is the lone headliner. That mirrors `billsCanonicalName`'s fallback.
     - An artist billed twice keeps its headliner row.
     - A name with no `artists` row gets no `event_artists` row. That's honest, because there's no artist to link to. The next run picks it up once `projectArtists` creates the artist.
   - **Who calls it:**
     - the crawl, after `projectArtists` (the artists exist by then);
     - Repair event artists, after its write;
     - `merge-duplicate-nights`, for the filled survivor;
     - the admin lineup save and Add a show by hand.
   - The admin lineup save writes the arrays from the chosen artists (display `name` and `canonical_name`), then calls the same helper. The table and the arrays therefore cannot disagree.
   - **Merge needs nothing.** The source's `event_artists` rows cascade away with it, and the kept listing keeps its own lineup.
   - **Backfill** is a TypeScript script (`packages/db/src/scripts/backfill-event-artists.ts`) that calls `syncEventArtists` in batches, idempotently. It is not SQL inside the migration: canonicalisation parity between SQL and JS has caused a prod bug before (`artists.ts` header). It runs by `workflow_dispatch`, on staging first and then on prod with Hugh's OK.
   - **Contract (its own later plan, not 4a):** move the readers in `event-billing.ts` to `event_artists`, make the table the source of truth, then stop writing the display arrays.
6. **Past shows are reachable.** `GET /v1/admin/events` gains `when=upcoming|past`.
   - `past` returns `date < Denver today`, newest first, with the same search and venue filters.
   - The default stays `upcoming`, so today's callers are unchanged.
7. **Reports in a merge are `event_reports` only.** Wrong-artist reports (`artist_reports`) are keyed by artist, not by event, so they never move. That answers the 4b pre-audit's question. 4b's compare counts `event_reports`.

## API added in 4a (consumed by 4b)

- **`POST /v1/admin/events`: Add a show by hand.**
  - Body (Zod): `venueId`, `title`, `date`, optional `doorsTime`, `showTime` and `ticketUrl` (`httpUrl()`), and `lineup: [{ artistId, role }]` (at least one headliner).
  - It sets `manual=true`, `created_by` (the admin's Clerk id), `verified=true`, the display and canonical arrays, `canonical_artist` (the first headliner's canonical name) and `canonical_title`, then calls `syncEventArtists`.
  - An upcoming row that collides on the unique key returns **409** with the existing id, so the UI can open it rather than add a duplicate.
  - It writes an audit row.
- **`PUT /v1/admin/events/:id/lineup`: save the lineup.**
  - Body: an ordered `[{ artistId, role }]`.
  - It rewrites the arrays, sets `lineup_edited_at`, calls `syncEventArtists`, and writes an audit row.
  - Past shows are allowed.
- **`GET /v1/admin/events/:id`** adds `manual`, `createdBy` (resolved to a handle) and `lineup: [{ artistId, name, slug, role, position, unsure }]` from `event_artists`. Names with no artist row come back with `artistId: null`, so 4b can show them as unmatched.
- **`GET /v1/admin/events`** adds `when`, and `manual` on each row.
- **The merge endpoint is unchanged** apart from Decision 2. 4b passes `notifyWatchers: false` for a duplicate merge ("Nobody gets a notice").

## PR split (each from fresh `main`, no stacking, each ≤ ~16 files)

| PR | Content | Files (approx.) |
| --- | --- | --- |
| **4a-1** DB and crawl | Migration 0115 (all columns and tables above, plus `event_redirects` key columns with an index on `(venue_id, date)`); schema; `mergeEventRows` records the key; the crawl's manual guards (upsert CASE, Pass 2, sweep, reconcile, merge-duplicate-nights, Repair) and the redirect-key routing. **crawler-core integration tests:** a manual row survives a crawl that does not list it, then the sweep, then reconcile; a manual row in a key collision keeps its title and lineup but takes the ticket link; a merged-away key updates the target rather than inserting; `lineup_edited_at` holds the lineup. | ~14 |
| **4a-2** `event_artists` dual write | `syncEventArtists` plus unit and integration tests (order, fallback, a missing artist, a duplicate name); calls from the crawl, Repair and merge-duplicate-nights; the backfill script and its workflow. | ~10 |
| **4a-3** Admin API | `POST /admin/events`, `PUT /:id/lineup`, the `GET /:id` lineup and fields, the list's `when=past`, with integration tests (409 duplicate, past list, audit rows, Zod rejections). | ~8 |

**Order:** 4a-1, then 4a-2, then 4a-3, each opened after the previous one merges. 4a-3 depends only on 4a-1's schema and 4a-2's helper.

**Coordination:** `fix/crawler-keep-with-billing` touches `derive-artists` and the LLM extractor. 4a-1 and 4a-2 touch `crawl.ts`, so each rebases after it merges.

## Not in 4a (4b, or Hugh)

These are already listed as 4b blockers in `QUESTIONS-2026-11-12.md`:

- **Moved status and its destination** (Hugh).
- **Refund info on Mark cancelled** (Hugh).
- **The price sheet's tier and vendor fields** (eng/data).
- **Whether `DELETE /:id` is limited to manual rows** ("Only for shows added by mistake"). 4b proposes a 409 on crawled rows.
- **A Postponed dialog, and the Played chip.**

Mark cancelled already notifies Watchers through `PATCH /:id` (`watch.cancelled`), so 4a needs no API for it.

## Rollback

0115 is additive. Rolling back the code leaves unused columns and an unused table, with no reader harmed:

- the crawl ignores `manual` and `lineup_edited_at`;
- `event_redirects`' extra columns are nullable.

The migration's `-- Down:` block drops them. The backfill is idempotent and the table is a projection, so `TRUNCATE event_artists` is a safe undo.

## Next

The plan PR merges on green CI. Then 4a-1, in worktree `feat/admin-4a-1-manual-crawl`.
