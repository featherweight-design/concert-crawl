# Readiness Review — Edit your Concerts

**Verdict:** 🟡 Yellow
**Audited:** 2026-11-11
**Related ticket(s):** #124 (the handoff PR)
**Plan PR target:** `docs/superpowers/plans/2026-11-11-edit-concerts.md`

## Summary

The handoff covers removing a show you didn't make it to, saying "I went" to a past show (on its event page, in the Add sheet and on the artist page), and the records notice. It is scoped tightly, approved, and its API notes match the code: `PUT /v1/attending` 404s whenever `first_missing_at` is set, and `/v1/history` lets a missing event through only when its date is before today (MT). The gaps are all things the engineering side can settle by following the nearest drawn pattern:

- the artist API has no attendance field
- upcoming rows have no menu today
- the stamp colour comes from the artist, not the venue
- some desktop, loading and error states aren't drawn
- the `CRAWL_SINCE` date hasn't been checked

## Per-dimension findings

### 🗺️ Scope clarity

- ✅ Scope and surfaces are listed, `ask_m` is marked optional and not approved, and the B+ fallback is stated ("build with today's components").
- 🟡 Nothing is stated as out of scope: bulk edits, adding a show from before the records start, editing the price spent.

### 🎭 State coverage

- ✅ Drawn: remove confirm, the Undo toast, event page marked and unmarked, the stamped toast, Add list, search, end of records, no results, artist page pill.
- 🟡 Desktop is drawn only for `concerts_menu_d`, `remove_dialog_d` and `add_dialog_d`. These have no desktop board: event page past states, artist Past shows, Add search, end and none, the removed toast.
- 🟡 These states aren't drawn: Add sheet loading, list error, paging past the first page, a failed PUT or DELETE (the pill needs to roll back), and the Undo itself failing.
- 🟡 Signed out: the artist page and event page are public, and `concert-history` gives logged-out users `tier-picker-on-tap`, so I went needs to follow that path. It isn't drawn.
- 🟡 The menu for an upcoming row isn't drawn. Its menu items aren't listed, and the desktop board shows a ⋯ on the upcoming row too.

### 🔌 Data contract

- ✅ `DELETE /v1/attending/:eventId` (`releaseAttendance`) works on past shows. It deletes the whole row when there is no watch (`status` null) and otherwise nulls `attendingAt`. Undo must recreate the row with the original `attendingAt`; a restore field on the PUT is the right way.
- ✅ `PUT` currently requires `isNull(firstMissingAt)` (`apps/api/src/routes/attending.ts:73`) and always calls `notifyCrewGoing`. The two changes the README asks for are correct and needed.
- 🟡 `PUT` doesn't reject a cancelled show (`status = 'cancelled'`), but the new rule for past shows should.
- 🟠→🟡 `ArtistPastShow` (`packages/types/src/artist.ts:50`) has no per-user attendance, so `artist_past_m`'s Went pill can't be shown from any current field. Either add `attending` to that endpoint or fetch it separately. This is an engineering fix, not a Design one.
- 🟡 The new past-shows endpoint doesn't exist yet. Its scope **Artists I follow** can use `artist-follows`. **My venues** has to be worked out from the user's own Concerts.
- ✅ The Concerts stats "since" line comes from `apps/api/src/lib/history-stats.ts` (not under `apps/web` as the README implies). Checked while planning: it already uses the earliest attended event's date (`history-stats.ts:65-71`), not the earliest `attendingAt`, so the README's warning is already met. The plan adds a regression test only.
- 🟡 **`CRAWL_SINCE = 'March 2026'`** (`artist-page/definitions/constants.ts:8`). Before UI work, the plan must run the README's query read-only on **prod and staging** and record both results. It must also check that the query uses the same visibility rule as the past-shows endpoint (hidden from consumer, cancelled). Hugh picks the value if it differs. Then move it to one shared module that both the artist page and Concerts read, and decide whether it stays a constant or gets served by the API.

### 🧱 Codebase fit

- ✅ The tokens exist: `--danger`, `--signal`, `--accent` (`globals.css`). The toast is `sonner` (`Toaster` in `app/layout.tsx`). Sheets and dialogs are `CCOverlay`.
- 🟡 "The venue's stamp color" doesn't exist as such. `stampAccentFor` in `lib/passport/stamp.ts` picks the colour per artist. Use that colour, so a show keeps the same colour in Passport.
- 🟡 Every `HistoryItem` row is one whole `<Link>`, so a ⋯ button can't go inside it (an interactive control inside a link is invalid HTML). The row needs restructuring.
- 🟡 The hero chip `{N} DAYS AGO` copies B+ `DAYS AWAY`, which isn't in the code yet.
- ✅ Vocabulary: Concerts and Passport are used correctly. "Following" and "Artists I follow" refer to following an artist, which already exists in the app (`artist-follows`). That isn't Watching, so it's a wording question for copy-review, not a gap.

### ♿ Cross-cutting

- 🟡 The ⋯ has an aria label in COPY.md. Still unspecified: menu keyboard behaviour (use `useOverlayTrigger`), the I went / Went toggle needs `aria-pressed`, and toasts need to be announced. Today `GoingButton` deliberately doesn't announce past states, and that comment has to go.
- 🟡 Undo lasts about 6 s and is time-limited. It should stay reachable by keyboard, and the plan should consider screen-reader users.
- 🟡 Performance: the new endpoint needs a date-ordered index or query. Search uses Postgres full-text. No analytics are expected (go-free Privacy limits).

### ⏰ Drift from reality

- ✅ These exist as named: `CRAWL_SINCE`, `PastShows`, `HistoryHeader`, the `HistoryItem.tsx` "no remove affordance" note, the `GoingButton` read-only comment, `notifyCrewGoing`, `GOING_COPY.button.pastNo`, `ARTIST_COPY.pastNote`.
- 🟡 Wrong: the README says the ⋯ on an upcoming row "opens today's un-going". `HistoryItem` has no menu at all; un-going lives on the event page. Wrong path: `history-stats.ts` (see Data contract).
- 🟡 The code calls attendance `user_events.attending_at`, not `status 'going'`.

### 📝 Decision log

- ✅ Approved by Hugh on 2026-11-11. "The date is data, not copy" is stated. Optional work is marked.
- 🟡 Locked and tentative aren't marked apart beyond §3. COPY.md's new strings need copy-review, which is the standard copy process, not a Design gap.

## Eng-side clarifications

1. Verify `CRAWL_SINCE` on prod and staging, Hugh rules on the value, and it moves to one shared module.
2. Add per-user attendance to `ArtistPastShow` or fetch it alongside, then drive the pill from it.
3. The upcoming row's ⋯ menu gets **Open the show page**, **Share this night**, and **Remove from Concerts** wired to the existing DELETE, following the past menu without the "Didn't make it?" wording.
4. Restructure `HistoryItem` so the ⋯ sits next to the `<Link>`, not inside it.
5. Stamp colour comes from `stampAccentFor`.
6. Desktop surfaces with no board follow the existing B+ desktop layout and the 480px or 560px `CCOverlay` dialogs.
7. Loading uses the existing skeletons. A failed write rolls the pill back and shows an error toast. Signed-out I went goes to the tier picker (`tier-picker-on-tap`).
8. The past PUT rejects cancelled and hidden events, never notifies the crew, and accepts a Zod-validated restore of `attendingAt` only for the value just removed.

## Decisions inherited

- Locked vocabulary: Concerts (code id stays `history`), Passport, Watching.
- One component each for the I went button, Went pill, confirm sheet and toast.
- No second confirm. Undo puts back the original `attendingAt`.
- The records notice is never a warning.
- `ask_m` isn't built without Hugh's yes.
- New COPY.md strings go through `copy-review`.
- A build-vs-design check at 320, 390 and 1280.
