# Wrong-artist reports: plan

**Handoff:** `design/design_handoff_wrong_artist_report/` (merged in #97). Hugh approved it on 2026-11-11. Strings are in its `COPY.md` and go through copy-review before W3 and W4 merge.
**Scope:** a fan flags a wrong Spotify match from the artist page. Reports land in the existing admin Artists queue. Any identity fix closes the open reports and notifies the reporters. No public "disputed" state, no fan confirmation.
**Builds on today's components.** If B+ B10 (artist page) has not shipped when W3 starts, W3 builds on `ArtistPageContent` as it is, and the B+ restyle carries it later.

## PRs

Each PR is at most ~800 lines, can ship alone and never stacks on an open PR. W1 to W4 merge in order. W3 and W4 are independent once W2 is in.

| # | PR | What | Risk |
| --- | --- | --- | --- |
| W1 | **Table and fan API** | <ul><li>Expand-only migration `0094_artist_reports.sql` with its snapshot and journal entry. Columns as in the handoff. A partial unique index on (`artist_id`, `reporter_id`) WHERE `status = 'open'`.</li><li>`artist_reports` is registered in `USER_DATA_REGISTRY` (`packages/db/src/user-data-registry.ts`) with explicit export columns, and its account-deletion rule is decided in the PR.</li><li>`POST /v1/artists/:slug/reports` and `DELETE /v1/artists/:slug/reports/mine`, modelled on `routes/event-reports.ts`. Auth, Zod, rate limited through `rate-limit.ts`. 409 with the open report, 422 on a bad link or a note `moderateNote` rejects, 404 for a hidden artist.</li><li>The Spotify link parser lives server-side, accepts `open.spotify.com/artist/<id>` (with or without `?si=`) and `spotify:artist:<id>`, and stores only the id.</li><li>`ArtistDetailResponse` in `packages/types/src/artist.ts` gains `myOpenReport` and the "matched now" summary (genres, Spotify URL) the sheet shows.</li><li>Integration tests for every status code, the one-open-report index and the hidden-artist 404.</li></ul> | **Risky** (DB, API route). `## Copilot off`, `/code-review medium`, risk checklist. |
| W2 | **Admin API, close on fix, notification write** | <ul><li>Admin list filter and per-artist reports on `routes/admin/artists.ts`, a `reported` figure in `/counts`, an audited dismiss, and an open-report count for the layout badge.</li><li>The identity PATCH and the Not an artist write close every open report on that artist as `fixed` in the same transaction and write one `artist.report_fixed` notification per reporter, with a `dedupeKey` per report (following `contest-notifications.ts`). Dismiss and Looks right close as `dismissed` with no notification.</li><li>`artist.report_fixed` joins the API-side category handling and `packages/push/src/delivery-policy.ts` as `NOT_PUSHED` (the same as `contest.resolved`), unless Hugh wants a push.</li><li>Tests: fix closes and notifies once, replay does not duplicate, dismiss notifies nobody, a withdrawn report is untouched.</li></ul> | **Risky** (admin write path, transaction, notifications). Same review as W1. |
| W3 | **Fan UI** | <ul><li>The card on `/artists/[slug]`: rest and reported states, signed-out goes to sign-in. Last block after Listen on mobile. On desktop it goes in the side column under the Spotify preview (see the open question below).</li><li>The report sheet (mobile bottom sheet, 520px desktop dialog) with the four reasons, the link field and the note counter. Result states: sent, already reported with Withdraw, and didn't go through with the inputs kept.</li><li>Strings in a new `artist-page/definitions/copy.ts` block, after copy-review.</li><li>A `releases.ts` entry, no spotlight.</li></ul> | UI only. A normal Claude review. |
| W4 | **Admin UI and the bell** | <ul><li>`/admin/artists`: the **Reported (n)** chip first in `STATUS_CHIPS`, the `N REPORTS` row chip, the expanded row (Matched now, each report, **Use this artist**, the existing picker and Not an artist, a new **Dismiss reports**).</li><li>The Artists nav item gets a `warning` badge. The `{crawl, review, feedback}` badge shape is repeated in `AdminShellClient`, `AdminSidebar` and `MobileBottomBar`, so all three change together.</li><li>The bell: `artist.report_fixed` in `notifications.ts`, `definitions/categories.ts`, `glyphs/index.tsx` (the `UserX` glyph in success green) and `definitions/copy.ts`.</li></ul> | UI only. A normal Claude review. |

## Shared components

Components these PRs read or change, so the orchestrator can sequence them against lane bp2 (B+).

| Component | Change | B+ overlap |
| --- | --- | --- |
| `ArtistPageContent.tsx` (artist-page) | **Edit** (W3): mount the card. | **B10 rewrites this file.** Sequence W3 against B10. |
| `ReportFooterLink.tsx` (reporting) | **Edit** (W3): take an icon, title and body so the artist card is the same component as the event card, not a copy. | The B+ status-report patterns restyle this family. |
| `ModalShell.tsx` | Read only. The sheet and dialog use it as it is. | F3 changes the sheet top edge. W3 inherits it either way. |
| `ReportTypeMark`, `reportTokens.ts` | Read only (amber report tokens). | Same family as above. |
| `EventImage`, `Panel` (the shared image treatment) | Read only, for the "matched to" photo. | F3 changes the image ring. |
| `ArtistEmbed.tsx` | Read only. | B10 moves it into a side card, which is what decides the desktop placement. |
| `GenreChip` | Not used. The match meta is plain mono text, so F3's chip work doesn't touch this plan. | None. |
| Admin shell (`nav.ts`, `AdminShellClient`, `AdminSidebar`, `MobileBottomBar`) and `/admin/artists` | **Edit** (W4). | None. The admin redesign is later. |
| Bell definitions (`categories.ts`, `glyphs`, `copy.ts`) | **Edit** (W4). | B+ Chrome group may restyle the bell. Check before W4. |

Only W3 has real overlap with bp2. W1, W2 and W4 can run at any time.

## Route by viewport inventory

A contact sheet of every row goes in the W3 and W4 PR bodies. Viewports: **M320**, **M390**, **D1280**.

| Route or surface | PR | M320 | M390 | D1280 | States |
| --- | --- | --- | --- | --- | --- |
| `/artists/[slug]` card | W3 | yes | yes | yes | rest, reported, signed out, no shows (player at the bottom), hidden artist (404, no card) |
| Report sheet or dialog | W3 | yes | yes | yes | empty, filled with a note, link error (422), sending |
| Result sheets | W3 | yes | yes | yes | sent, already reported, didn't go through |
| Bell inbox and the menu row | W4 | yes | yes | yes | `artist.report_fixed` unread and read |
| `/admin/artists` | W4 | yes | no | yes | Reported chip, collapsed row, expanded row with two reports, empty Reported queue |
| Admin sidebar and mobile bottom bar | W4 | yes | no | yes | badge with 0, 1 and 99+ |

Sameness checks for the close-out walk:

- The artist card and the event "Spot something off?" card come from the same component (an import-equality check), and the result sheets reuse the status result sheet rather than a second copy.
- Every artist route that shows the Spotify match (`/artists/[slug]` only today) carries the card. Search and My shows rows don't.
- The three admin badge sites agree on the count.

## Decisions I'm taking, and one question

- **No foreign key** on `artist_reports.artist_id`. `artists` is a projection that nothing references by FK, so a rebuilt artist row must not fail a delete or leave a report that cannot be written. A report whose artist row is gone simply stops showing. This is the handoff's open decision, taken here.
- **No admin alert email** on the first report. The handoff leaves it out unless Hugh asks.
- **Matched now genres** come from the `spotifyCandidates` snapshot entry whose id equals `spotifyArtistId`. It is `null` when the snapshot was never genre-hydrated, and the sheet then drops the genres from the meta line.
- **Question for Hugh: desktop placement.** The handoff puts the card "under the Spotify preview" in the side column, but today the player is in the main column and the left rail holds only the photo panel and Follow. Either W3 puts the card in the rail under Follow now, or it waits for B10, which moves the embed into a side card. **Recommendation:** put it in the rail under Follow now and let B10 move it with the embed.

## Checks

- Each PR runs typecheck, lint and its tests. W1 and W2 integration tests run against a per-worktree DB, one run at a time, and `packages/db` is rebuilt first because apps/api reads its `dist`.
- Copy-review covers every string in `COPY.md` before W3 and W4 merge. Admin strings are exempt from the copy rules and still reviewed.
- Migration 0094 goes to prod only on Hugh's approval, after staging.
- Feature-acceptance runs per UI PR (W3, W4) and again at close.

## Next

W1, then W2, then W3 and W4, one at a time, after Hugh's review of this plan and the orchestrator's go.
