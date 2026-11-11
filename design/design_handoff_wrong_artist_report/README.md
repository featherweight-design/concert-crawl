# Wrong-artist reports: Engineering Handoff

We match artists to Spotify by name, and some names are shared, so an artist page can show another act's photo and music. This handoff lets a fan flag that from the artist page, and puts the reports in front of admin in the existing Artists queue. Hugh approved it on 2026-11-11.

- **Live canvas (source of truth for review):** https://claude.ai/artifact/PhMHZLcdDsvraZNcv9XDbH
- **Strings for copy review:** [`COPY.md`](COPY.md). Every fan-facing string here is new.
- **Builds on:** the B+ artist page and the B+ status-report patterns in [`design_handoff_bplus_redesign`](../design_handoff_bplus_redesign/) (sections `09-artist` and `08-prices-and-status`). If B+ hasn't shipped on `/artists/[slug]` when this is built, build it with today's components and the same structure. The B+ restyle comes with that phase.
- **Scope:** the artist page (mobile from 320px, and desktop), one report sheet and its result states, one notification for the reporter, and a minimal addition to **today's** admin. The admin redesign comes later and is out of scope.

## Files

| Path | What it is |
| --- | --- |
| `screens/<board>.jpg` | A screenshot of every board. Mobile boards are 2×, and desktop and admin boards are 1×. Start here. |
| `manifest.json` | Every board with its title and size. |
| Live canvas | The same boards as live HTML. They are mockups (inline styles, sample data), not code to port. |

| Board | Shows |
| --- | --- |
| `page_m`, `page_d` | The CTA card on the artist page |
| `sheet_empty_m`, `sheet_m`, `dialog_d` | The report sheet (mobile) and dialog (desktop) |
| `filed_m`, `filed_d` | Report sent |
| `already_m`, `already_d` | Already reported, with the card in its reported state behind the sheet |
| `error_m` | Didn't go through |
| `fixed_notif_m` | The reporter's inbox after the fix |
| `admin_artists` | Admin: the Artists badge, the Reported chip and an expanded reported row |

## Fan side

### The card (`page_m`, `page_d`)

- It copies the event page's **Spot something off?** card exactly: the same eyebrow, row, chevron and mono footnote. The tile is amber (`--warning`), the report color the event card already uses, with lucide `UserX`.
- **Where:** on mobile it is the last block on the page, after Listen. On desktop it goes in the side column under the Spotify preview, because the wrong music is usually what gives a bad match away.
- **Two states.** The rest state is the card as drawn. The reported state shows only to the reporter while their report is open: dashed amber border, an `UNDER REVIEW` chip in place of the chevron, and a footnote saying only they see it. Tapping it opens Already reported.
- **Signed out:** tapping goes to sign-in, the same as Report a status change.
- Hidden artists have no page, so they have no card either.

### The sheet (`sheet_empty_m`, `sheet_m`, `dialog_d`)

One step: a mobile bottom sheet (with the gradient top edge that follows the corners) or a 520px centered dialog on desktop, with the same content.

1. **This page is matched to:** the current match's photo (the shared image treatment), name, Spotify genres and an **Open in Spotify** link, so the fan can compare.
2. **What's wrong?** One required choice, as radio cards in amber:
   - `different_artist`: A different artist, same name
   - `wrong_photo`: Right music, wrong photo
   - `not_an_artist`: Not an artist
   - `other`: Something else
3. **The right artist on Spotify (optional):** a field for a pasted link, with a hint on how to copy one.
4. **Anything else? (optional):** a note of up to 280 characters, with a counter.
5. **Send report** is amber and stays disabled until a reason is picked. The footnote under it says a person checks the report before anything changes.

Unlike a status report, nothing goes to other fans to confirm, and the page shows no public "disputed" state.

### Results

These reuse the price and status result sheet: the rail with a colored dot and code, a big title, a body, then buttons.

- **Report sent** (`filed_*`): "Thanks. We'll check it." A dashed stub shows the artist with `UNDER REVIEW · WITH US`, then **Back to artist**. The card behind it is now in its reported state.
- **Already reported** (`already_*`): "You've flagged this one." It offers **Back to artist** and **Withdraw** (amber outline), with one open report per artist.
- **Didn't go through** (`error_m`): it keeps the inputs and offers **Try again** and **Close**.
- **After the fix** (`fixed_notif_m`): each reporter whose report was open gets one bell notification, "We fixed {artist}'s page.", with the `UserX` glyph in success green, linking to the artist page. A dismissed report sends nothing.

## Admin side (`admin_artists`)

This stays inside today's admin on its existing primitives (`/admin/artists` is exempt from the design pipeline). There are only two additions:

1. **The sidebar badge.** The Artists nav item gets a `warning` badge with the open report count, the same as Review and Feedback.
2. **The Reported queue.** `/admin/artists` gets a **Reported (n)** chip, first in `STATUS_CHIPS`. Rows there show an `N REPORTS` chip and expand to show:
   - a **Matched now** summary (photo, name, genres, next show, follower count)
   - each report: its reason, @handle, age, the note, and the suggested Spotify link with **Use this artist**
   - the actions: the existing **Find on Spotify** (CandidatePicker) and **Not an artist**, plus a new **Dismiss reports**

Any identity fix (Use this artist, the picker, a pasted id, Not an artist) closes every open report on that artist as `fixed` and notifies the reporters. Dismiss and Looks right close them as `dismissed` without a notification.

## Engineering notes

- **Table:** `artist_reports`, through an expand-only migration. Columns: `id`, `artist_id`, `reporter_id` (Clerk id), `reason` (enum of the four), `suggested_spotify_artist_id` (parsed on the server, so only the id is stored), `note` (≤280, passed through `moderateNote`), `status` (`open | fixed | dismissed | withdrawn`), `resolved_at`, `resolved_by`, `created_at`. A partial unique index on (`artist_id`, `reporter_id`) WHERE `status = 'open'` keeps it to one open report per artist. `artists` is a projection that nothing references by FK, so decide whether this table gets one and say which in the PR. Register the table in `user-data-registry.ts`.
- **API:** model it on `routes/event-reports.ts`.
  - `POST /v1/artists/:slug/reports` (auth, Zod, rate limited). It returns 409 with the open report, 422 on a bad link or a rejected note, and 404 for a hidden artist.
  - `DELETE /v1/artists/:slug/reports/mine` withdraws the report.
  - The artist detail response gains `myOpenReport`.
  - The admin side needs a list or filter, the reports per artist, a dismiss (audited) and a count for the layout badge.
- **Closing on fix:** in the existing identity PATCH (`routes/admin/artists.ts`) and the Not an artist write, in the same transaction. Notifications are `user_notification` rows with category `artist.report_fixed` and a `dedupeKey` per report (follow `contest-notifications.ts`).
- **Spotify links:** accept `open.spotify.com/artist/<id>` (with or without `?si=`) and `spotify:artist:<id>`. Anything else returns 422.
- **Release notes:** this is user-facing, so it gets a `releases.ts` entry. It has no spotlight.

The full implementation prompt, with tests, is in the project's handoff folder as `wrong-artist-report-prompt.md`. Everything it needs is restated above.

## Open decisions

- Whether `artist_reports.artist_id` gets a foreign key (see above).
- An admin alert email on the first report for an artist. It is not included unless Hugh asks for it.
