# Edit your Concerts: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to work through this plan task by task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** let a user take a show they didn't make it to out of Concerts (with Undo), say "I went" to a past show (on its event page, on the artist page, and from a new Add sheet), and see where our records start.

**Architecture:** the API comes first. `PUT /v1/attending/:eventId` learns a past-show path: it allows `first_missing_at`, rejects cancelled and hidden shows, never notifies the crew, and can restore a removed `attendingAt` using a signed token that `DELETE` hands back. A new `GET /v1/history/past-shows` feeds the Add sheet, and `ArtistPastShow` gains a per-user `attending`. The web then builds one confirm sheet, one toast pair, one I went / Went pill and a restructured `HistoryItem`, and reuses them on Concerts, the event page, the artist page and the Add sheet. The records start becomes one shared constant that both apps read.

**Tech stack:** Hono + Drizzle + Zod (API), Next.js App Router + React Query + `sonner` (web), Vitest (CI runs the tests), the fwd feature-acceptance kit.

**Spec:** `design/design_handoff_edit_concerts/` (README.md, COPY.md, manifest.json, 17 boards in `screens/`); live canvas https://claude.ai/artifact/KM41mNS15omHLb3QMDkRin. Readiness: 🟡 Yellow (2026-11-11), with 8 eng clarifications, recorded below as D1–D8. Plan target: `docs/superpowers/plans/2026-11-11-edit-concerts.md`.

## Global constraints

- **Vocabulary:** Concerts (the code identifier stays `history`), Passport, Watching. "Artists I follow" means following an artist (`artist-follows`), not Watching. copy-review checks the wording.
- Every new string from COPY.md lives in a `definitions/copy.ts` and goes through `copy-review` in the PR that adds it. No em-dashes. The records date is **data**, never a hard-coded string.
- Zod at every new API boundary: query, body and param. No `as` casts on parsed input.
- **Migrations:** none planned. If one turns out to be needed, it is expand-only.
- Mobile-first from 320px. The shell breakpoint is `sm` (640): below it a sheet, from it a popover or dialog.
- Motion uses `--motion-*` tokens only. Reduced motion is the blanket guard.
- **No stacked PRs.** Each PR branches from `main` after the previous one merges, and lives in its own worktree under `.worktrees/`.
- CI owns the tests. The lane runs `pnpm typecheck` and `pnpm lint` before each push, and never runs prod queries.
- `ask_m` ("Did you make it?", README §3) is **out of scope until Hugh approves it**. Nothing in this plan builds it or leaves a hook for it.

## Decisions

The first eight are the readiness clarifications. Each names the drawn or shipped pattern it follows.

| # | Decision | Follows |
| --- | --- | --- |
| D1 | **Records start.** The operator verifies it on prod and staging (Step 0), and Hugh rules on the value. It moves to one shared module, `packages/types/src/records-start.ts`, which exports `RECORDS_START_MONTH` (`'YYYY-MM'`), `recordsStartFloor()` (`'YYYY-MM-01'`, used by the API as its date floor), `recordsStartLabel()` (`March 2026`) and `recordsStartShort()` (`MAR 2026`). It stays a **constant** and is not served by the API: it only changes with a licensed backfill, which ships as a deploy anyway. `CRAWL_SINCE` in `artist-page/definitions/constants.ts` becomes a re-export of `recordsStartLabel()`, so `ARTIST_COPY.pastNote` and `history-line.ts` don't change. | `CRAWL_SINCE`'s own comment ("a licensed backfill changes this one value"); runtime constants already in `packages/types` (`VENDOR_VALUES`) |
| D2 | **Artist page attendance.** `ArtistPastShow` gains `attending: boolean \| null`, which is null when signed out. It is filled by one query of the user's `user_events` (`attending_at IS NOT NULL`) over the returned past `eventId`s. The pill reads it. | `ArtistDetailResponse.following: boolean \| null` on the same route, which is resolved the same way from the token-optional fetch |
| D3 | **Upcoming row ⋯ menu:** **Open the show page**, **Share this night**, a divider, then **Remove from Concerts** (`--danger`). The remove goes straight to `DELETE` with the Undo toast and no confirm, because un-going an upcoming show is a one-tap toggle today. Below `sm` the menu opens as a `CCOverlay` sheet. A past row on mobile goes straight to the confirm, as drawn. | `concerts_menu_d` (the past menu), with "Didn't make it?" left out |
| D4 | **`HistoryItem` restructure.** The row becomes a `<div>` grid. A `<Link>` wraps the art and text cells. The stub stamp and the ⋯ `<button>` are siblings of the link, never inside it. Hover and focus styling move to the wrapper (`:hover`, `:focus-within`). | The Watching row's grid (the `HistoryItem` header says it mirrors it) |
| D5 | **Stamp colour** comes from `stampAccentFor(artist)` (`lib/passport/stamp.ts`), never from the venue, so a night keeps its Passport colour. The README's "venue's stamp color" means this. | `StubStamp` and `VenueStamp` already share it |
| D6 | **Undrawn desktop.** These follow the B+ desktop layout already on the surface: event page past states, artist Past shows, Add search, end and none, and the removed toast. Dialogs reuse `components/pwa/BottomSheet`, which already switches from a sheet to a centred dialog at `sm`. It gains an optional `maxWidth` prop (default stays `max-w-md`), used at 480 for the confirm and 560 for Add. The README's "CCOverlay dialog" is really this component, since `CCOverlay` has only popover and sheet modes. The desktop row menu is a `CCOverlay` popover driven by `useOverlayTrigger`. | `ShareSheet` (also built on `BottomSheet`); `CrewLens` (`CCOverlay` + `useOverlayTrigger`) |
| D7 | **Undrawn states.** Add sheet loading uses `SkeletonBlock` rows. A failed list load shows an inline retry line. A failed PUT or DELETE rolls the pill or row back and raises `toast.error`. A failed Undo raises `toast.error` that points at the show page. **Signed out**, `concert-history` resolves to `tier-picker-on-tap`, so I went opens the tier picker with entry `logged-out-going`. A downgraded user with an existing `past-yes` keeps the read-only display. | `EventDetailCtaBlock.openUpgrade`; `GoingButton`'s rollback through `failedIntent` |
| D8 | **Past PUT rules.** When `events.date < today (MT)`, the PUT allows `first_missing_at`, rejects `hidden_from_consumer` and `status = 'cancelled'` (404, the same answer as unknown), and **never** calls `notifyCrewGoing`. A restore (`restore: { attendingAt, token }`) is accepted only with a valid token from the `DELETE` that removed that exact value (see D9), and it never notifies either. Upcoming PUTs behave exactly as they do today. | `/v1/history`'s rule `or(isNull(firstMissingAt), date < todayMt)` |
| D9 | **How the restore is limited to "the value just removed".** `DELETE` now returns `restore: { attendingAt, token } \| null`. The token is `exp.base64url(HMAC-SHA256(key, userId\|eventId\|attendingAt\|exp))`, with `exp` set 60 s ahead. The key is HMAC-SHA256 of `INTERNAL_API_SECRET` with the label `attendance-restore:v1` (domain-separated, so no new env var). If the secret is unset, `restore` is null and the toast shows no Undo, so it fails closed. The restore upsert carries `setWhere isNull(attendingAt)`, so it never overwrites an attendance. | `lib/email-unsubscribe.ts` (HMAC + `timingSafeEqual`) |
| D10 | **The "since" line needs no code change.** `computeHistoryStats` already sets `first` from the sorted event `date`s, not from `attendingAt`. The README and readiness are wrong here. PR1 adds a regression test (a stamp added today on a 2026-04 show still reads "since April 2026"). | `apps/api/src/lib/history-stats.ts:65-71` |
| D11 | **`{N} DAYS AGO` hero chip:** built only if B+'s `DAYS AWAY` chip is on `main` when PR3 starts (it isn't today: there's no match in `apps/web/src`). If it isn't, it's recorded as a gap that follows B8. | COPY.md marks its twin as pending |
| D12 | **Search** uses `ilike` over `events.artist`, `events.title` and `venues.name` with `escapeLikePattern`. That function is lifted out of `routes/search.ts` into `lib/escape-like.ts`. This is the same search Browse runs (`routes/events.ts:282`). There's no new FTS index: `events_date_status_idx (date, status)` covers the date-ordered range. | `routes/events.ts` search |
| D13 | **Past-shows visibility.** These are shown: `hidden_from_consumer = false`, `status <> 'cancelled'`, `date < todayMt`, `date >= recordsStartFloor()`, and the venue not `removed_at`. `first_missing_at` is ignored, because the date is already past. These are left out: the history rule's `first_missing_at` arm, and anything built on `upcomingEventConditions`. | README engineering notes; the artist page's past `removedAt` join |
| D14 | **Share this night** opens `ShareSheet` for the row. `HistoryShow` gains `venueCity`, `venueTimezone` and `rawShowTime` so `toPosterEvent` can build a `PosterSource`. The handle comes from Clerk `useUser().user?.username ?? null`. | `ShareButton` on the event page |

**Out of scope:** `ask_m`; bulk edits; adding a show from before the records start; editing the price paid. Also unchanged: the artist page's stricter `isNull(firstMissingAt)` on its past list, and the event page 404 for a past show that is missing but not delisted. Add sheet rows are not links, so the 404 can't be reached from the sheet.

## Step 0 (pre-UI, operator and Hugh): verify the records start

The lane doesn't run this step. **Hugh or the operator** runs these read-only on **prod and staging** (Neon console or `psql` with a read-only role) and pastes both results into the plan PR:

```sql
-- a) The README's query, as written
SELECT min(date) FROM events WHERE hidden_from_consumer = false AND status <> 'cancelled';
-- b) Aligned with the past-shows endpoint's visibility (D13)
SELECT min(e.date) FROM events e JOIN venues v ON v.id = e.venue_id
WHERE e.hidden_from_consumer = false AND e.status <> 'cancelled' AND v.removed_at IS NULL;
-- c) A stray early row skews min(): look at the first months' density
SELECT to_char(e.date, 'YYYY-MM') AS month, count(*) FROM events e JOIN venues v ON v.id = e.venue_id
WHERE e.hidden_from_consumer = false AND e.status <> 'cancelled' AND v.removed_at IS NULL
GROUP BY 1 ORDER BY 1 LIMIT 6;
-- d) How many past shows carry first_missing_at (the duplicate risk behind D13)
SELECT count(*) FILTER (WHERE first_missing_at IS NOT NULL) AS missing, count(*) AS total
FROM events WHERE date < (now() AT TIME ZONE 'America/Denver')::date AND hidden_from_consumer = false;
```

- [ ] Results recorded for both environments. If (b) and (a) differ, (b) wins. If (c) shows a lone outlier month, Hugh picks the first dense month.
- [ ] **Hugh rules on `RECORDS_START_MONTH`**, and the ruling goes into D1. PR1 can be built with `'2026-03'` but **does not merge until the ruling lands.**
- [ ] If (d) shows that missing past rows are a large share, flag the duplicate risk to Hugh before PR4. The fix would be a dedupe on `(venue_id, date, canonical_artist)` in the endpoint, which is not planned.

## PR boundaries (named up front, no stacking)

| PR | Branch | Scope | Files | Review |
| --- | --- | --- | --- | --- |
| 0 | `docs/edit-concerts-plan` | This plan plus the Step 0 results | 1 | none (doc) |
| 1 | `feat/edit-concerts-api` | Records-start module; PUT past rules and restore; DELETE restore token; `GET /v1/history/past-shows`; `ArtistPastShow.attending`; `HistoryShow` share fields; stats regression test | ~16, ~750 lines | **Risky (API routes):** `/code-review medium` plus the risk checklist, `## Claude review`, `## Copilot off` |
| 2 | `feat/edit-concerts-list` | `HistoryItem` restructure; ⋯ menus (past and upcoming); `RemoveConfirm`; the toast pair; `BottomSheet.maxWidth`; optimistic removal and Undo | ~18, ~780 lines | Claude review |
| 3 | `feat/edit-concerts-i-went` | `GoingButton` past states tappable; event page I went / remove; `WentPill`; artist page pills; stamped toast | ~14, ~650 lines | Claude review |
| 4 | `feat/edit-concerts-add-sheet` | Add row in the rail; `AddShowSheet` (list, scopes, search, end of records, none, loading and error); `usePastShows`; release note | ~12, ~700 lines | Claude review |

**Adjusted from the brief:** the records notice moves from PR2 to PR4. The notice sits in the Add sheet, and the rail row that mentions the date opens that sheet, so shipping either one without the other would leave an entry that leads nowhere. If PR1 or PR2 goes over ~20 files or ~800 lines, split off the `past-shows` endpoint (PR1) or `BottomSheet.maxWidth` with its test (PR2) as its own PR, from fresh `main`, before continuing.

## Review focus

The cases most likely to bite, each pinned by a test in the task that owns it:

1. **A double tap on I went for a past show, or a tap during a pending Undo:** exactly one row, no crew notification, `attendingAt` stable (PR1 T3, PR3 T2).
2. **An Undo after the token expires (more than 60 s, a slow phone):** a 400, the error toast, no attendance invented (PR1 T2, PR2 T4).
3. **A show dated "today" at 11 pm MT:** not past, so it follows the upcoming rule (a strict `first_missing_at`, crew notified) (PR1 T3).
4. **A search with `%` or `_`:** a literal match, not a wildcard (PR1 T4).
5. **Removing the last past show:** Concerts falls to the empty or upcoming-only state with no stale stats tile, and Undo brings it back (PR2 T4).

---

## PR1: API (`feat/edit-concerts-api`), risky

### Task 1.1: Records-start module

**Files:**
- Create: `packages/types/src/records-start.ts`, `packages/types/src/records-start.test.ts`
- Modify: `packages/types/src/index.ts` (export it), `apps/web/src/components/consumer/artist-page/definitions/constants.ts:8` (`export const CRAWL_SINCE = recordsStartLabel();`)

**Produces:** `RECORDS_START_MONTH: string`, `recordsStartFloor(): string`, `recordsStartLabel(): string`, `recordsStartShort(): string`, all formatted in UTC so the month can't slip.

- [ ] Write a failing test: with `'2026-03'` the outputs are `'2026-03-01'`, `'March 2026'` and `'MAR 2026'`.
- [ ] Implement, export it, and re-point `CRAWL_SINCE`. `PastShows.test.tsx` and `history-line.test.ts` should stay green unchanged.
- [ ] Commit `feat(types): one records-start module for the API and web`.

### Task 1.2: DELETE returns a restore token

**Files:**
- Create: `apps/api/src/lib/attendance-restore.ts`, `apps/api/src/lib/attendance-restore.test.ts`
- Modify: `apps/api/src/lib/user-events.ts:49-71` (`releaseAttendance` returns `removedAttendingAt: Date | null` from the row it read), `apps/api/src/routes/attending.ts` (DELETE), `packages/types/src/index.ts:1219` (`AttendingToggleResponse.restore?: { attendingAt: string; token: string } | null`), `apps/api/src/routes/attending.contract.integration.test.ts`

**Produces:** `signRestoreToken({ userId, eventId, attendingAt, now? }): string | null` and `verifyRestoreToken({ userId, eventId, attendingAt, token, now? }): boolean`. The TTL is `RESTORE_TTL_MS = 60_000`.

- [ ] Unit tests: a round trip verifies; a different user, event or `attendingAt` fails; an expired token fails; a malformed token fails without throwing; with the secret unset, signing returns `null`.
- [ ] Implement it following `lib/email-unsubscribe.ts` (`createHmac`, `timingSafeEqual` on equal-length buffers).
- [ ] DELETE answers `{ going: false, attendingAt: null, restore }`, with `restore` null when nothing was removed. Update the contract test's expected shape.
- [ ] Commit `feat(api): DELETE /v1/attending hands back a short-lived restore token`.

### Task 1.3: PUT past rules and restore

**Files:**
- Modify: `apps/api/src/routes/attending.ts:49-153`, `apps/api/src/routes/attending.integration.test.ts`

**Consumes:** `verifyRestoreToken`, `todayInDenver()` (`lib/time.ts:52`).

- [ ] Add failing integration tests. **CI runs these.** The lane writes them and doesn't run the suite locally beyond its own worktree DB.
  - A past event with `first_missing_at` set → 200, and a row with `attending_at` set.
  - A past event that is cancelled → 404. A past event that is hidden → 404.
  - An upcoming event with `first_missing_at` → 404, as it is today.
  - A past PUT never calls `notifyCrewGoing` (spy via `vi.mock('../lib/crew-notifications.js')`). An upcoming PUT still calls it once.
  - Remove then restore with the token → `attending_at` equals the original value to the millisecond, and no notification. This holds both when the row was deleted (`status` null) and when it was nulled (watch kept, `status` still `'watching'`).
  - A restore with a forged, expired or other-user token → 400 and no row change. A restore when `attending_at` is already set → 200 with the existing value, unchanged.
  - A body that fails the Zod schema → 400.
  - A date equal to today (MT) → treated as upcoming.
- [ ] Implement:
  - Select `date`, `status`, `hiddenFromConsumer` and `firstMissingAt`.
  - Compute `isPast = row.date < todayInDenver()`.
  - The visibility rule is `hidden=false AND (isPast ? status<>'cancelled' : firstMissingAt IS NULL)`.
  - Read the body as text: an empty body becomes `{}`, otherwise `JSON.parse` inside a try and then `putBodySchema.safeParse`, where the schema is `z.object({ restore: z.object({ attendingAt: z.string().datetime(), token: z.string().min(1).max(200) }).strict().optional() }).strict()`.
  - A restore upserts with `attendingAt: new Date(restore.attendingAt)`.
  - Notify only when `claimed.length > 0 && !isPast && !restore`.
  - Update the route comment: it no longer claims that every show the crawler stopped seeing can't be marked.
- [ ] Commit `feat(api): mark a past show, and restore a removed one, without pinging the crew`.

### Task 1.4: `GET /v1/history/past-shows`

**Files:**
- Create: `apps/api/src/lib/escape-like.ts` (moved from `routes/search.ts:106-110`), `apps/api/src/lib/past-shows.ts`, `apps/api/src/routes/history-past-shows.integration.test.ts`
- Modify: `apps/api/src/routes/search.ts` (import the helper), `apps/api/src/routes/history.ts` (mount it), `packages/types/src/index.ts` (types)

**Produces (types):**

```ts
export type PastShowsScope = 'all' | 'venues' | 'follows';
export interface PastShowRow {
  eventId: string; artist: string; artistPhotoUrl: string | null;
  venueName: string; venueSlug: string; date: string; dateLabel: string;
  attendingAt: string | null;
}
export interface PastShowsResponse { rows: PastShowRow[]; total: number; nextCursor: string | null }
```

The query schema is `z.object({ q: z.string().trim().max(80).optional(), scope: z.enum(['all','venues','follows']).default('all'), cursor: z.string().regex(/^\d{4}-\d{2}-\d{2}_[0-9a-f-]{36}$/).optional() }).strict()`. The page size is `PAST_SHOWS_PAGE = 30`. Ordering is `date desc, id desc`, with a keyset cursor `${date}_${id}`.

- [ ] Add failing tests:
  - Floor: an event before `recordsStartFloor()` is excluded. Today is excluded. Cancelled, hidden and `removed_at`-venue rows are excluded. A past row with `first_missing_at` is included.
  - `attendingAt` is filled only for the caller.
  - `scope=venues` returns only venues from the caller's attended rows. `scope=follows` returns only shows that bill a followed artist (`followedArtistsCondition`). `scope=follows` without the `following` entitlement → 403, the same gate as `events.ts:221-240`.
  - `q` matches artist, title or venue case-insensitively, and `q='50%'` is literal.
  - Paging: two pages join without gaps or duplicates, and `nextCursor` is null on the last page. `total` counts the whole filtered set.
  - Without `concert-history` → 403. A bad `scope` or `cursor` → 400.
- [ ] Implement `loadPastShows({ userId, q, scope, cursor })` in `lib/past-shows.ts`, reusing `displayHeadliner()` and `portraitCanonicalName()` (`lib/event-billing.ts`) as `history.ts` does. Left-join `userEvents` on the user. Use one `count(*)` with the same conditions. Mount it with `historyRouter.use('/past-shows', requireFeature('concert-history'))`, then `get('/past-shows', zValidator('query', …))`.
- [ ] Commit `feat(api): past shows to stamp, back to the start of our records`.

### Task 1.5: Artist page attendance and Concerts share fields

**Files:**
- Modify:
  - `packages/types/src/artist.ts:50` (`attending: boolean | null`)
  - `apps/api/src/routes/artists-public.ts:425-503`
  - `apps/api/src/routes/artists-public.integration.test.ts`
  - `packages/types/src/index.ts:1228` (`HistoryShow` gains `venueCity: string`, `venueTimezone: string`, `rawShowTime: string | null`)
  - `apps/api/src/routes/history.ts:92-150`
  - `apps/api/src/routes/history.integration.test.ts`
  - `apps/api/src/lib/history-stats.test.ts`
- [ ] Add failing tests:
  - Signed out, every `past[].attending` is `null`.
  - Signed in, a marked show is `true` and the rest are `false`.
  - Another user's attendance never shows.
  - `/v1/history` rows carry the venue city, timezone and raw show time.
  - The stats `first` is the earliest event date even when that row's `attendingAt` is the newest (D10).
- [ ] Implement it, then fix any fixtures that build `ArtistPastShow` or `HistoryShow` by hand. `pnpm typecheck` finds them.
- [ ] Commit `feat(api): per-user attendance on artist past shows`.

**PR1 copy keys:** none. **Inventory:** `edit-concerts-pr1.json` (a regression check: the artist footnote and Concerts render unchanged).

```json
{
  "feature": "Edit Concerts PR1 · API (regression only)",
  "note": "No new UI. Confirms the CRAWL_SINCE move left the artist footnote and Concerts unchanged. Boards: none.",
  "rows": [
    { "id": "concerts", "label": "/history", "steps": [{ "goto": "/history", "wait": "[data-testid=\"history-rail\"]" }] },
    { "id": "artist-full", "label": "/artists/[slug] whole page", "fullPage": true,
      "steps": [{ "goto": "/artists/${CC_ARTIST_SLUG}", "wait": "[data-testid=\"hero-band\"]" }] }
  ]
}
```

**Owed to Hugh after PR1:** nothing runs on deploy (there's no migration). `INTERNAL_API_SECRET` must be set on the staging and prod API, or Undo silently disappears (D9). Confirm it is set, by name only.

---

## PR2: Concerts list (`feat/edit-concerts-list`)

### Task 2.1: `BottomSheet` width

**Files:** Modify `apps/web/src/components/pwa/BottomSheet.tsx:6-12,67` and `apps/web/src/components/pwa/__tests__/BottomSheet.test.tsx`.

- [ ] Write a failing test: `maxWidth={480}` sets `sm:max-w-[480px]` through an inline `--sheet-max` variable, and no prop keeps `sm:max-w-md`.
- [ ] Implement it. Check `git log origin/main -- apps/web/src/components/pwa/BottomSheet.tsx` first, because the B22a install-sheets lane is touching this folder. Rebase onto it rather than conflicting.
- [ ] Commit.

### Task 2.2: The toast pair and `RemoveConfirm` (each built once and shared)

**Files:**
- Create:
  - `apps/web/src/components/consumer/going/lib/attendance-toasts.tsx`: `showRemovedToast({ artist, onUndo })`, `showStampedToast({ artist, action: { label, onClick } })`, and `showAttendanceError(kind: 'save' | 'undo')`. Duration `ATTENDANCE_TOAST_MS = 6000`.
  - `apps/web/src/components/consumer/going/RemoveConfirm.tsx`: `{ open, onClose, show: HistoryShow, footnote: 'concerts' | 'show-page', onConfirm, pending }`. It renders the eyebrow, title, body, the row through `HistoryItem` with `menu={false}`, **Remove from Concerts** (`--danger`, filled), **Keep it** (outline) and the footnote, on `BottomSheet maxWidth={480}`.
  - The tests for both.
- Modify: `apps/web/src/components/consumer/going/definitions/copy.ts`

**Copy keys (copy-review):**
- `GOING_COPY.remove.title`: "Didn't make it?" (reused as a lead in PR3)
- `remove.body`, `remove.confirm`, `remove.keep`, `remove.footnoteConcerts`, `remove.footnoteShowPage`
- `toast.removed(artist)`, `toast.undo`, `toast.stamped(artist)`, `toast.openPassport`
- `toast.saveFailed`, `toast.undoFailed` (both new, D7, not in COPY.md: write them in the house voice and send them to copy-review)
- The eyebrow reuses `GOING_COPY.eyebrow.past`.

- [ ] Write failing tests:
  - The confirm renders all four drawn parts, and the dialog's accessible name is the title.
  - **Keep it** and Escape close it without calling `onConfirm`.
  - Focus returns to the trigger.
  - The removed toast's Undo calls `onUndo` once.
  - The toast text sits in sonner's live region.
- [ ] Implement and commit.

### Task 2.3: `HistoryItem` restructure and the ⋯ menu

**Files:**
- Modify: `apps/web/src/components/consumer/history/HistoryItem.tsx` (D4; drop the "no remove affordance" header note), `HistoryItem.test.tsx`
- Create: `apps/web/src/components/consumer/history/RowMenu.tsx`, `RowMenu.test.tsx`
- Modify: `apps/web/src/components/consumer/history/definitions/copy.ts`

**Interfaces:** `HistoryItem` gains `menu?: false | { tense: 'past' | 'upcoming'; onRemove: () => void; onShare: () => void }`. `RowMenu` takes `{ artist, tense, eventId, onRemove, onShare }`.

**Behaviour:**
- Below `sm`, a past row's ⋯ calls `onRemove` directly (the confirm), and an upcoming row's ⋯ opens a `CCOverlay mode="sheet"` menu.
- From `sm`, both open a `CCOverlay mode="popover"` anchored to the ⋯, through `useOverlayTrigger`.
- The ⋯ is always visible below `sm`. From `sm` it is visible on row hover, on `:focus-within` and while its menu is open (`opacity` plus `--motion-fast`, never `display:none`, so it stays in the tab order).
- The menu is `role="menu"` with `menuitem`s. Arrow keys move, Escape closes and returns focus.

**Copy keys:** `HISTORY_COPY.menu.trigger(artist)` ("More options for {artist}"), `menu.open`, `menu.share`, `menu.removePast` ("Didn't make it? Remove"), and `menu.removeUpcoming`. The last reuses `GOING_COPY.remove.confirm`'s string, so read it from there rather than duplicating it.

- [ ] Write failing tests:
  - There's no `<button>` inside the `<a>` (`container.querySelector('a button') === null`).
  - The link still points to `/events/:id`.
  - The ⋯ has its aria label and `aria-haspopup`/`aria-expanded`.
  - A past row at the mobile width (mock `matchMedia`) calls `onRemove` with no menu. The desktop menu lists 3 items in order, with the remove item last and danger-toned.
  - The upcoming menu has Remove from Concerts.
  - Keyboard: Enter opens, ArrowDown moves, Escape closes and focus returns.
- [ ] Implement and commit.

### Task 2.4: Wire Concerts (optimistic removal, Undo, share)

**Files:**
- Modify:
  - `apps/web/src/lib/queries/use-attending-toggle.ts`: the input gains `restore?: { attendingAt; token }`. `onMutate` also patches `historyQueryKey(userId)`, removing the row on release and keeping `previous` for rollback. The PUT sends `{ restore }` as JSON only when it is present.
  - `apps/web/src/lib/queries/use-attending-toggle.test.tsx`
  - `apps/web/src/components/consumer/history/HistoryContent.tsx`: `MonthBuckets` passes `menu`. It owns one `RemoveConfirm` and one `ShareSheet` state (D14), and calls `showRemovedToast` after a successful DELETE, with Undo → `toggle.mutate({ eventId, going: true, restore })`.
  - `HistoryContent.test.tsx`
  - `.claude/fwd/feature-acceptance.md`: add `CC_PAST_EVENT_ID` (a past show the audit user has **not** marked, whose event page renders), `CC_PAST_MARKED_EVENT_ID` (one they marked) and `CC_PAST_ARTIST_SLUG` (an artist with past shows) to the env table, with how to pick each.
- [ ] Write failing tests:
  - Confirming removes the row at once and the toast appears.
  - Undo sends PUT with the `restore` body.
  - A DELETE failure puts the row back and shows `saveFailed`.
  - An Undo failure shows `undoFailed`.
  - With `restore: null`, the toast has no Undo.
  - Removing the last past row renders the past-empty line, not stats from the stale cache. Stats refetch through `invalidateQueries`.
  - Share opens `ShareSheet` with a valid `PosterSource`.
- [ ] Implement and commit `feat(web): take a show you didn't make it to out of Concerts`.

**PR2 inventory** `docs/superpowers/inventories/edit-concerts-pr2.json` (signed in; Concerts isn't public):

```json
{
  "feature": "Edit Concerts PR2 · Concerts row menu and remove",
  "note": "Handoff design/design_handoff_edit_concerts/screens/: concerts = concerts_m, concerts_menu_d; past-remove = remove_sheet_m (phone), remove_dialog_d (sm, desktop). Hand-walked: removed_m (confirm, then the toast and Undo; it mutates, so the kit never confirms), the upcoming-row menu (no board, D3), keyboard menu nav, Electric and Light themes. Needs the audit user to have at least one past and one upcoming row.",
  "widths": [
    { "label": "floor", "width": 320, "height": 700, "touch": true },
    { "label": "phone", "width": 390, "height": 844, "touch": true },
    { "label": "sm", "width": 640, "height": 900 },
    { "label": "desktop", "width": 1300, "height": 900 }
  ],
  "rows": [
    { "id": "concerts", "label": "/history with a ⋯ on every row", "fullPage": true,
      "steps": [{ "goto": "/history", "wait": "[data-testid=\"history-rail\"]" }] },
    { "id": "past-remove-sheet", "label": "Past ⋯ → Didn't make it? sheet", "widths": ["floor", "phone"],
      "steps": [{ "goto": "/history", "wait": "[data-testid=\"history-rail\"]" },
                { "click": ":nth-match([data-testid=\"row-menu\"][data-tense=\"past\"], 1)" },
                { "waitDialog": "^Didn.t make it\\?$" }] },
    { "id": "past-menu", "label": "Past ⋯ menu (popover)", "widths": ["sm", "desktop"],
      "steps": [{ "goto": "/history", "wait": "[data-testid=\"history-rail\"]" },
                { "hover": ":nth-match([data-testid=\"history-item\"][data-tense=\"past\"], 1)" },
                { "click": ":nth-match([data-testid=\"row-menu\"][data-tense=\"past\"], 1)", "wait": "[role=\"menu\"]" }] },
    { "id": "past-remove-dialog", "label": "Menu → Didn't make it? dialog (480)", "widths": ["sm", "desktop"],
      "steps": [{ "goto": "/history", "wait": "[data-testid=\"history-rail\"]" },
                { "hover": ":nth-match([data-testid=\"history-item\"][data-tense=\"past\"], 1)" },
                { "click": ":nth-match([data-testid=\"row-menu\"][data-tense=\"past\"], 1)", "wait": "[role=\"menu\"]" },
                { "clickRole": "menuitem", "name": "^Didn.t make it\\? Remove$" },
                { "waitDialog": "^Didn.t make it\\?$" }] }
  ]
}
```

**Design review rows (pre-filled):**

| Board | Built | Ambiguity resolved from the nearest drawn pattern | Gap |
| --- | --- | --- | --- |
| concerts_m | ⋯ on every row | upcoming ⋯ opens a sheet menu (D3) | none |
| concerts_menu_d | popover menu | the hover reveal keeps the ⋯ in the tab order | none |
| remove_sheet_m / remove_dialog_d | `RemoveConfirm` | 480 through `BottomSheet.maxWidth` (D6) | none |
| removed_m | optimistic removal plus a 6 s toast | stats refresh from the server after settle | a brief stats lag, noted |

---

## PR3: I went on the event page and the artist page (`feat/edit-concerts-i-went`)

### Task 3.1: `GoingButton` past states become affordances

**Files:** Modify `apps/web/src/components/consumer/going/GoingButton.tsx` (the header comment at :10-11, `disabled` at :148, `aria-pressed` at :270, the announcement), `GoingButton.test.tsx`, `StubStamp.tsx` (a `dashed` prop), `StubStamp.test.tsx`, `going/definitions/copy.ts`.

**Behaviour:**
- `past-no` renders **I went** with a dashed stamp in the stub hole, and is tappable.
- `past-yes` renders `You went · {date}` filled with `stampAccentFor(artist)` (D5), and is tappable. The caller decides what a tap does.
- `aria-pressed` is `state === 'going' || state === 'past-yes'` for every interactive state.
- Past transitions announce through the existing live region. Delete the comment that says past states are not announced.

**Copy keys:** `GOING_COPY.button.pastMark` ("I went"), `pastMarkLine(venue)` ("Were you there? …"), `remove.link` ("Remove it from Concerts"), and `remove.lead`, which reuses `remove.title`. `button.pastNo` ("Didn't make it") is deleted if nothing reads it after this PR. copy-review confirms.

- [ ] Write failing tests: both past states are enabled and call `onChange`; `aria-pressed` is right in all four states; the dashed stamp shows on `past-no`; a transition announces.
- [ ] Implement and commit.

### Task 3.2: Event page past flow

**Files:** Modify `apps/web/src/components/consumer/going/EventDetailCtaBlock.tsx:96-200`, `EventDetailCtaBlock.test.tsx`.

**Behaviour:**
- When past and not active: `past-no` becomes `locked` routing, so `openUpgrade` runs with `logged-out-going` when signed out (D7). `past-yes` stays a display.
- A `past-no` tap → `toggle.mutate({ going: true })`. On success: `router.refresh()` and `showStampedToast` with **Open Passport** → `router.push('/passport')`. On error: roll back `optimisticGoing` and `showAttendanceError('save')`.
- `past-yes` renders the `remove.lead` text plus a `remove.link` button that opens `RemoveConfirm` with `footnote="show-page"`. Confirming releases the show, refreshes, and shows `showRemovedToast` with Undo (restore).
- [ ] Write failing tests: each of these paths; a double tap sends one PUT (`pending` blocks it); a cancelled past show still renders only the Watch strip.
- [ ] Implement and commit.

### Task 3.3: `WentPill` and the artist page

**Files:**
- Create: `apps/web/src/components/consumer/going/WentPill.tsx`, `WentPill.test.tsx`. Props: `{ eventId, artist, attending: boolean | null, onToggled?(next) }`. It handles its own optimism, rollback, toasts (stamped with Undo, or removed with Undo) and the signed-out tier-picker path. It is `role="button"` with `aria-pressed`, and the tap target grows to 44 px using the `NF_TAP_MIN` pattern.
- Modify: `apps/web/src/components/consumer/artist-page/PastShows.tsx` (a pill per row; the footnote is unchanged), `PastShows.test.tsx`, `ArtistPageContent.tsx:225` (nothing new to pass unless needed for `router.refresh`).

**Copy keys:** `GOING_COPY.pill.off` ("I went"; copy-review may merge it with `button.pastMark`), `pill.on` ("Went").

- [ ] Write failing tests:
  - `attending: null` (signed out) → a tap opens the tier picker and never calls the API.
  - `false` → I went; a tap goes optimistically to Went, then the toast with Undo.
  - A failure rolls back.
  - The pill uses `stampAccentFor(artist)`.
  - PastShows renders one pill per row and keeps `ARTIST_COPY.pastNote(CRAWL_SINCE)`.
- [ ] Implement and commit `feat(web): say you went to a past show`.

**PR3 inventories**, signed in, `docs/superpowers/inventories/edit-concerts-pr3.json`:

```json
{
  "feature": "Edit Concerts PR3 · I went: event page and artist page",
  "note": "Boards: event-marked = event_went_m; event-remove = event_remove_m; event-unmarked = event_unmarked_m; artist-past = artist_past_m. Hand-walked: event_stamped_m (tap I went, then the toast and Open Passport; it mutates), the failure rollback (devtools offline), Undo from the pill, desktop event and artist past states (no board, D6), and the {N} DAYS AGO chip (only if built, D11).",
  "widths": [
    { "label": "floor", "width": 320, "height": 700, "touch": true },
    { "label": "phone", "width": 390, "height": 844, "touch": true },
    { "label": "sm", "width": 640, "height": 900 },
    { "label": "desktop", "width": 1300, "height": 900 }
  ],
  "rows": [
    { "id": "event-unmarked", "label": "/events/[past, unmarked]: I went",
      "steps": [{ "goto": "/events/${CC_PAST_EVENT_ID}", "wait": "button[aria-pressed=\"false\"][data-testid=\"going-button\"]" }] },
    { "id": "event-marked", "label": "/events/[past, marked]: You went + remove link",
      "steps": [{ "goto": "/events/${CC_PAST_MARKED_EVENT_ID}", "wait": "button[aria-pressed=\"true\"][data-testid=\"going-button\"]" }] },
    { "id": "event-remove", "label": "Remove it from Concerts → confirm",
      "steps": [{ "goto": "/events/${CC_PAST_MARKED_EVENT_ID}", "wait": "[data-testid=\"going-button\"]" },
                { "clickRole": "button", "name": "^Remove it from Concerts$" },
                { "waitDialog": "^Didn.t make it\\?$" }] },
    { "id": "artist-past", "label": "/artists/[slug] Past shows with pills", "fullPage": true,
      "steps": [{ "goto": "/artists/${CC_PAST_ARTIST_SLUG}", "wait": "[data-testid=\"went-pill\"]" }] }
  ]
}
```

Signed out: `docs/superpowers/inventories/edit-concerts-pr3-signed-out.json`. The kit can only run this against a dev server with `NEXT_PUBLIC_PUBLIC_BROWSE` set. On staging these routes redirect to `/sign-in`, so walk them by hand there.

```json
{
  "feature": "Edit Concerts PR3 · I went, signed out",
  "signedOut": true,
  "note": "Signed-out I went routes to the tier picker (D7); no board, nearest pattern is the locked I'm going! tap. Staging is launch-gated, so walk by hand there; the kit runs this only on localhost with public browse on.",
  "rows": [
    { "id": "event-unmarked-out", "label": "/events/[past]: I went, signed out",
      "steps": [{ "goto": "/events/${CC_PAST_EVENT_ID}", "wait": "[data-testid=\"going-button\"]" },
                { "click": "[data-testid=\"going-button\"]" },
                { "waitDialog": "." }] },
    { "id": "artist-past-out", "label": "/artists/[slug] pills, signed out", "fullPage": true,
      "steps": [{ "goto": "/artists/${CC_PAST_ARTIST_SLUG}", "wait": "[data-testid=\"went-pill\"]" }] }
  ]
}
```

Add `data-testid="going-button"` to `GoingButton`'s `<button>` and `data-testid="went-pill"` to `WentPill` in Tasks 3.1 and 3.3. Before writing the `waitDialog` name, read the tier picker's actual accessible name and use it in place of `"."`.

**Design review rows:** event_went_m, event_remove_m, event_unmarked_m and event_stamped_m are built as drawn, with the fill from `stampAccentFor` (D5). artist_past_m is built as drawn. Desktop has no board and follows the B+ layout (D6). The `{N} DAYS AGO` chip: built if B8's `DAYS AWAY` exists, otherwise recorded as a gap (D11).

---

## PR4: Add a show you went to (`feat/edit-concerts-add-sheet`)

### Task 4.1: `usePastShows`

**Files:** Create `apps/web/src/lib/queries/use-past-shows.ts` and `use-past-shows.test.ts`. It is a `useInfiniteQuery` keyed `['past-shows', userId, scope, q]`, with `getNextPageParam: (page) => page.nextCursor`. The query is debounced by the caller (250 ms). It stays disabled until the sheet is open.

- [ ] Write failing tests: the cursor is passed through, the key is scoped by user, and a 403 isn't retried (`isEntitlementError`, as in `use-history.ts`).
- [ ] Implement and commit.

### Task 4.2: `AddShowSheet`

**Files:**
- Create: `apps/web/src/components/consumer/history/AddShowSheet.tsx`, `AddShowSheet.test.tsx`
- Modify: `apps/web/src/components/consumer/history/lib/buckets.ts` (generalise `groupHistoryByMonth` to `<T extends { date: string }>`), `buckets.test.ts`, `history/definitions/copy.ts`

**Layout:** `BottomSheet maxWidth={560}` (tall on mobile). From the top:
- the eyebrow, title, subtitle and **Done**;
- the search input (`placeholder` = copy, `type="search"`);
- three scope chips as a radio group, with **Artists I follow** hidden when `useEntitlement('following')` is inactive;
- the dashed records note;
- month-grouped rows: `Panel` art, artist, `venue · dateLabel`, and a `WentPill` with `attending = row.attendingAt !== null`.

**States:**
- Loading: 6 `SkeletonBlock` rows.
- Error: an inline line with a retry button.
- Paging: an `IntersectionObserver` sentinel that calls `fetchNextPage`.
- Search results: a `{N} SHOWS` count. The footer "That's every {artist} …" shows only when every row has the same artist and `nextCursor` is null. Otherwise the end divider shows.
- End of list: the divider plus the end line.
- No results: the empty title and body.
- A tap on a pill invalidates `historyQueryKey` when the sheet closes.

**Copy keys (copy-review):** `HISTORY_COPY.add.{eyebrow,title,subtitle,done,searchPlaceholder,scopeAll,scopeVenues,scopeFollows,recordsNote(since),resultCount(n),resultsFooter(artist,since),endDivider(SINCE),endLine,emptyTitle,emptyBody(since),loadFailed,retry}`. `loadFailed` and `retry` aren't in COPY.md (D7). `since` and `SINCE` always come from `recordsStartLabel()` and `recordsStartShort()`.

- [ ] Write failing tests:
  - The records note interpolates the shared label, and no literal `March 2026` appears in copy.
  - The scope chips switch the query and the follows chip is hidden without the entitlement.
  - The skeleton shows while loading.
  - The error shows a retry that refetches.
  - The end divider appears with `nextCursor: null`.
  - The empty state shows with zero rows.
  - The single-artist footer rule holds.
  - Done closes and returns focus.
- [ ] Implement and commit.

### Task 4.3: Rail entry and release note

**Files:**
- Create: `apps/web/src/components/consumer/history/AddShowRow.tsx`, `AddShowRow.test.tsx`. It is styled like `SaveCalendarRow`, with a dashed plus-stamp tile and a chevron, and is a `<button>` that opens the sheet.
- Modify: `apps/web/src/components/consumer/history/HistoryContent.tsx`. Mount `AddShowRow` in `history-rail` under `PassportTeaser`. Also mount it on the **empty** Concerts state, after `HistoryEmpty`, because a user with no nights is the one most likely to add one. That placement isn't drawn: record it in Design review.
- Modify: `apps/web/src/lib/definitions/releases.ts`. Add one `added` entry: you can take out a show you missed and stamp past nights. It goes through copy-review. `design/design_handoff_spotlight_heroes/` has no spotlight for this, so there's none to add.

**Copy keys:** `HISTORY_COPY.addRow.title`, `addRow.sub(since)`.

- [ ] Write failing tests: the row opens the sheet; its sub-line reads the shared label; the empty state renders the row.
- [ ] Implement, add the `docs/superpowers/progress.md` ✅ row, and commit `feat(web): add a show you went to`.

**PR4 inventory** `docs/superpowers/inventories/edit-concerts-pr4.json`:

```json
{
  "feature": "Edit Concerts PR4 · Add a show you went to",
  "note": "Boards: add-sheet = add_sheet_m (phone), add_dialog_d (sm, desktop); add-search = add_search_m; add-none = add_none_m. Hand-walked: add_tapped_m (tapping a pill mutates), add_end_m (scroll inside the sheet to the records floor; the kit's scroll moves the page, not the sheet), loading (throttle), list error (block /v1/history/past-shows in devtools), the empty-Concerts placement of the row (no board), Electric and Light themes. Requires CC_PAST_ARTIST_NAME, the display name of CC_PAST_ARTIST_SLUG.",
  "widths": [
    { "label": "floor", "width": 320, "height": 700, "touch": true },
    { "label": "phone", "width": 390, "height": 844, "touch": true },
    { "label": "sm", "width": 640, "height": 900 },
    { "label": "desktop", "width": 1300, "height": 900 }
  ],
  "rows": [
    { "id": "concerts-add-row", "label": "/history rail with the Add row",
      "steps": [{ "goto": "/history", "wait": "[data-testid=\"add-show-row\"]" }] },
    { "id": "add-sheet", "label": "Add sheet opened, records note",
      "steps": [{ "goto": "/history", "wait": "[data-testid=\"add-show-row\"]" },
                { "click": "[data-testid=\"add-show-row\"]" },
                { "waitDialog": "^Add a show you went to$" },
                { "wait": "[data-testid=\"went-pill\"]" }] },
    { "id": "add-search", "label": "Search one artist",
      "steps": [{ "goto": "/history", "wait": "[data-testid=\"add-show-row\"]" },
                { "click": "[data-testid=\"add-show-row\"]" },
                { "waitDialog": "^Add a show you went to$" },
                { "fill": "input[type=\"search\"]", "text": "${CC_PAST_ARTIST_NAME}", "wait": "[data-testid=\"add-show-count\"]", "settle": 400 }] },
    { "id": "add-none", "label": "No results",
      "steps": [{ "goto": "/history", "wait": "[data-testid=\"add-show-row\"]" },
                { "click": "[data-testid=\"add-show-row\"]" },
                { "waitDialog": "^Add a show you went to$" },
                { "fill": "input[type=\"search\"]", "text": "zz no such show zz", "wait": "[data-testid=\"add-show-none\"]" }] }
  ]
}
```

Add `CC_PAST_ARTIST_NAME` to the `.claude/fwd/feature-acceptance.md` env table in this PR.

**Design review rows:** add_sheet_m and add_dialog_d are 560 through `maxWidth` (D6). add_search_m: the footer shows only for a single artist. add_end_m and add_none_m are built as drawn. add_tapped_m: the toast uses Undo, as on the event page's remove. Undrawn states (loading, error, desktop search, end and none) follow D6 and D7. The row on empty Concerts is an undrawn placement, called out for Hugh.

---

## Close-out (after PR4 merges)

- [ ] Run the staging contact sheet for pr2, pr3 and pr4 at the commit staging ran. Walk the signed-out PR3 surfaces by hand. Run `check-tokens.mjs`.
- [ ] Do the feature-acceptance close-out walk against README §1, §2 and the records notice. Every inventory cell must be ticked against the running app.
- [ ] Hugh's staging walk on his Android phone in Brave: remove and Undo, I went on a past event page, Add sheet search.
- [ ] Prune only this run's own worktrees and test DBs (`pnpm worktree:prune <branch>…`).

## Owed to Hugh

1. The Step 0 ruling on `RECORDS_START_MONTH`. It blocks PR1's merge.
2. Confirm `INTERNAL_API_SECRET` is set on the staging and prod API (D9), or rule that Undo uses its own new secret.
3. `ask_m`: a yes or no. Nothing is built until he says yes.
4. Whether to show the Add row on empty Concerts (PR4, undrawn).
