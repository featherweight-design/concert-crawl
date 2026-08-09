# Native Artist Following — Design Requirement Enumeration

**Purpose.** Every checkable design requirement for the native-following epic, derived from the merged handoff (`design/design_handoff_native_following/`) and the merged engineering spec (`docs/superpowers/specs/2026-08-08-native-following-eng-spec.md`, read from `origin/main`). A verification agent should be able to walk this table row by row against the implementation and mark each PASS/FAIL without re-reading the handoff.

**Authority order.** Spec § beats handoff prose beats prototype code. Where they disagree, the row states the spec's answer and the disagreement is recorded under _Contradictions with the spec_.

**Copy.** All strings in the handoff and prototypes are placeholder. Requirements below describe _what a string must do_, never its wording, except where the spec itself locks a value (token names, enum values, route paths, cron expressions, size constants).

**Not enumerated** (already shipped — do not build, do not "fix"):
`MiniPaywall` (does not exist; `TierPickerSheet` is the shipped paywall) · a Spotify logo on the event-row Following chip (the chip is already text-only) · a bottom-nav tab-3 rename (already reads "my shows") · an `unavailable` follow state (does not exist) · follower counts (cut from scope).

Sources abbreviated: `SPEC §x` = eng spec section; `README` = handoff README; `shared`/`cold`/`following`/`notify`/`desktop`/`canvas` = `nf-shared.jsx` / `nf-cold-start.jsx` / `nf-following.jsx` / `nf-notify.jsx` / `nf-desktop.jsx` / `nf-canvas.jsx`.

---

## A. Follow affordance (shared primitive — underpins every surface)

| ID     | Surface | Requirement                                                                                                                                                                                                                                                                                                                                                                                                                    | Source                                                           |
| ------ | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| FA-01  | Shared  | A single follow-button component is the only follow affordance in the codebase; artist page, search, bill block, shelf badge, nudge and My Shows all render it rather than hand-rolling a button.                                                                                                                                                                                                                              | README §"Shipped components this touches"; shared:168            |
| FA-02  | Shared  | The component accepts exactly three visual states for a single artist: `idle`, `following`, `locked`. `pending` is accepted only for bulk commits (see FA-12).                                                                                                                                                                                                                                                                 | SPEC §5.1                                                        |
| FA-03  | Shared  | `idle` renders a solid `--signal` fill with on-accent text; no border colour other than `--signal`.                                                                                                                                                                                                                                                                                                                            | SPEC §5.1; shared:182                                            |
| FA-04  | Shared  | `following` renders `color-mix(in oklab, var(--signal) 14%, transparent)` fill, a 1px `--signal` border, `--signal` text, and a check glyph.                                                                                                                                                                                                                                                                                   | SPEC §5.1; shared:183                                            |
| FA-05  | Shared  | `locked` renders transparent fill, a 1px `--border-strong` border, `--fg` text, plus a lock glyph — the shipped signed-out skin.                                                                                                                                                                                                                                                                                               | SPEC §5.1; shared:184                                            |
| FA-06  | Shared  | `locked` renders at the **same size and with the same label** as `idle`; the lock glyph is the only added element and must not change the button's height or label string.                                                                                                                                                                                                                                                     | SPEC §5.1                                                        |
| FA-07  | Shared  | No follow-button state ever sets the HTML `disabled` attribute or `aria-disabled`. Every state is focusable and activatable.                                                                                                                                                                                                                                                                                                   | SPEC §5.1; following:64 (chip omits `aria-disabled` when locked) |
| FA-08  | Shared  | Tapping `locked` opens the paywall (`TierPickerSheet`); it never no-ops and never silently calls the follow API.                                                                                                                                                                                                                                                                                                               | SPEC §5.1, §6.2                                                  |
| FA-09b | Shared  | A signed-in user whose plan lost `following` still gets a **live** control on an artist they already follow, so the follow can be undone. The lock applies only when there is nothing to undo.                                                                                                                                                                                                                                 | SPEC §3.2                                                        |
| FA-09  | Shared  | A logged-out visitor keeps the shipped **idle** skin (`--signal` fill), pixel-identical to signed-in-and-not-following per #794 §3.10 — not the `locked` skin, which is a signed-in-only treatment. Tapping opens the tier picker (not a sign-in redirect that loses context).                                                                                                                                                 | SPEC §5.1, #794 §3.10                                            |
| FA-10  | Shared  | Tapping `following` unfollows immediately — same button, no confirmation dialog, no separate "unfollow" control anywhere.                                                                                                                                                                                                                                                                                                      | SPEC §5.1; canvas (affordance note)                              |
| FA-11  | Shared  | `aria-pressed` reflects `state === 'following'` for `idle`/`following`, and is **omitted** (`undefined`) for `locked` and for logged-out.                                                                                                                                                                                                                                                                                      | SPEC §5.1; shared:197                                            |
| FA-12  | Shared  | `pending` renders only during a bulk commit ("Follow all N", onboarding step-7 commit): idle skin at `opacity: 0.72`, with **no width change** between idle and pending.                                                                                                                                                                                                                                                       | SPEC §5.1; shared:185                                            |
| FA-13  | Shared  | Single-artist follow/unfollow is optimistic: the state flips before the response, rolls back on failure, and the optimistic override is cleared when the server value changes — never on mutation success alone. The optimism lives in `useArtistFollow`, once: unfollow can legitimately return still-following when a Spotify sync also holds the row, and only the hook sees that answer. `FollowButton` is presentational. | SPEC §5.1, §5.4                                                  |
| FA-14  | Shared  | A size constant object is exported from a definitions file with exactly `sm: 36`, `md: 44`, `full: 48` heights, used by every call site; no ad-hoc heights.                                                                                                                                                                                                                                                                    | SPEC §5.3; shared:156                                            |
| FA-15  | Shared  | `sm` (36px) is only used where the button sits inside a row whose full height is itself an ≥44px tap target; standalone buttons use `md` or `full`.                                                                                                                                                                                                                                                                            | canvas (A11Y note); SPEC §5.3                                    |
| FA-16  | Shared  | Icon-only rendering is permitted only in the narrow breakpoint the spec names (under 360px), and the icon-only button carries an `aria-label` naming the artist.                                                                                                                                                                                                                                                               | SPEC §5.3; cold:240; canvas (A11Y note)                          |
| FA-17  | Shared  | When `locked`, the button carries `aria-describedby` pointing at a gate sentence explaining the tier requirement; the sentence is visually hidden via clip, never via the `hidden` attribute or `display:none`.                                                                                                                                                                                                                | SPEC §5.1; shared:172, 199                                       |
| FA-18  | Shared  | The gate-sentence element id is derived from `React.useId()`, so multiple buttons on one bill produce unique ids.                                                                                                                                                                                                                                                                                                              | shared:170-172                                                   |
| FA-19  | Shared  | The gate helper is `nfLocked(state: PlanStateLike): boolean => !canUseFeature(state, 'following')` — it takes the plan state (so `roleComped` and `'logged-out'` resolve correctly) and never enumerates tier strings.                                                                                                                                                                                                         | SPEC §5.2                                                        |
| FA-20  | Shared  | Server 403s carrying `code === 'entitlement_required'` are caught at the mutation layer and open the paywall, so a stale client entitlement still gates correctly.                                                                                                                                                                                                                                                             | SPEC §5.4; §1.2                                                  |
| FA-21  | Shared  | Button geometry: radius 10, Inter 800 weight, per-size horizontal padding and gap taken from the size constant, at every call site.                                                                                                                                                                                                                                                                                            | shared:156, 176-196                                              |
| FA-22  | Shared  | Colour is token-only: `--signal` for CTA/status, `--accent` reserved for Watching. No follow affordance uses `--accent`; no inline hex outside the email template.                                                                                                                                                                                                                                                             | SPEC §3; canvas                                                  |
| FA-23  | Shared  | The affordance renders correctly in all three themes (Electric, Jade, Light) with no theme-specific overrides.                                                                                                                                                                                                                                                                                                                 | SPEC §3; README                                                  |

---

## B. Artist page

| ID    | Surface     | Requirement                                                                                                                                                                     | Source                                        |
| ----- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| AP-01 | Artist page | The page keeps its existing `hasShows` and `showFollow` guards; exactly one live follow affordance renders on the page at a time.                                               | SPEC §1.2 (locked)                            |
| AP-02 | Artist page | The hero follow button renders at the `full` size (48px) and spans the hero's action row.                                                                                       | following:310; shared:156                     |
| AP-03 | Artist page | The follow state threaded into the page is the four access outcomes resolved by `nfLocked` + follow status — idle, following, locked, logged-out-locked — with no fifth branch. | SPEC §5.1; following:310                      |
| AP-04 | Artist page | On scroll, the sticky/condensed header carries the same follow affordance at a smaller size, and its state stays in sync with the hero button (one state source, not two).      | following:310 (`scrolled` prop)               |
| AP-05 | Artist page | When the artist has no upcoming Denver dates, the page shows a no-dates line and the follow button remains available (following is the point of the empty state).               | shared (`NoDatesLine`); README                |
| AP-06 | Artist page | No genre is displayed for the artist. Genre chips derive from `events.genre` only; the artists table has no genre field.                                                        | SPEC §1.2 (correction 3)                      |
| AP-07 | Artist page | No follower count is rendered anywhere on the page.                                                                                                                             | SPEC §1.2 (locked)                            |
| AP-08 | Artist page | A follow made here is written with the native follow source (not the Spotify source) so provenance is distinguishable downstream.                                               | SPEC §1.1 (`user_artist_follows` source enum) |

---

## C. Browse

| ID    | Surface | Requirement                                                                                                                                                                                           | Source                                                                     |
| ----- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| BR-01 | Browse  | A "following" scope chip is added to the filter bar with exactly four states: `off`, `on`, `locked`, `absent`.                                                                                        | SPEC §7.1; following:64                                                    |
| BR-02 | Browse  | In the `absent` state the chip renders **nothing** (returns null) — not a greyed chip, not a zero-count chip.                                                                                         | SPEC §7.1; following:64                                                    |
| BR-03 | Browse  | `absent` vs present is decided **server-side at first paint**, so the chip never flashes in and out after hydration.                                                                                  | SPEC §7.1                                                                  |
| BR-04 | Browse  | The chip is the **first** chip in the filter bar, ahead of date, venue, price and genre.                                                                                                              | following:97                                                               |
| BR-05 | Browse  | The chip matches the shipped FilterBar chip exactly: 11px Inter 600, 5px/10px padding, full pill radius, `--signal` when active.                                                                      | following:64; README                                                       |
| BR-06 | Browse  | The `locked` chip does **not** set `aria-disabled`; tapping it opens the paywall.                                                                                                                     | SPEC §5.1; following:64                                                    |
| BR-07 | Browse  | `GET /v1/events` accepts a `following` query param modelled on the existing `taste` param: `z.literal('1').optional()`.                                                                               | SPEC §7.1                                                                  |
| BR-08 | Browse  | The `following` param is gated **inline in the handler**, not by `requireFeature` middleware, so unrelated event requests are unaffected.                                                             | SPEC §7.1                                                                  |
| BR-09 | Browse  | The filter is an EXISTS subquery over `user_artist_follows` that matches follows **regardless of source** (Spotify-sourced follows count).                                                            | SPEC §7.1                                                                  |
| BR-10 | Browse  | The endpoint returns 401 only when the `following` flag is present **and** the caller is anonymous; anonymous requests without the flag stay public.                                                  | SPEC §7.1                                                                  |
| BR-11 | Browse  | The browse shelf slot is **one component with three modes** (starter shelf / your-artists shelf / absent), not three separately-mounted components.                                                   | SPEC §7.1; cold:205, 225                                                   |
| BR-12 | Browse  | The starter shelf renders only while the user has zero follows; once they have ≥1 follow it never returns.                                                                                            | canvas (cold-start note)                                                   |
| BR-13 | Browse  | Once the shelf is in your-artists mode, its header carries only an "all" navigation link — no eyebrow pitch copy.                                                                                     | canvas (cold-start note); cold:190                                         |
| BR-14 | Browse  | The starter shelf's suggestion order is shuffled per session.                                                                                                                                         | canvas (cold-start note); cold:205                                         |
| BR-15 | Browse  | Each shelf card is a link whose accessible name includes the artist plus the venue and date, and the horizontal shelf is fully keyboard-reachable (no mouse-only scroll).                             | canvas (A11Y note)                                                         |
| BR-16 | Browse  | The shelf follow badge is a 34px circular control absolutely positioned at top 7 / right 7 of the card, with the same three states as the main button and the same clipped gate sentence when locked. | cold:149, 177                                                              |
| BR-17 | Browse  | When the following scope is `on` and returns results, a count banner is announced with `role="status"`.                                                                                               | following:133                                                              |
| BR-18 | Browse  | When the following scope is `on` and returns zero results, the zero state explains the scope is empty rather than showing the generic no-events copy.                                                 | following:133; canvas (`DualModeMatrix`: zero state is the only real fork) |
| BR-19 | Browse  | The filtered list ends with a terminus/end card rather than trailing off.                                                                                                                             | following:133                                                              |
| BR-20 | Browse  | Desktop browse renders the same states within a 1080px max-width container using a 6-column shelf grid, and keeps the `role="status"` banner.                                                         | desktop:111                                                                |

---

## D. Event row

| ID    | Surface   | Requirement                                                                                                                                             | Source                                      |
| ----- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| ER-01 | Event row | The existing Following chip stays text-only with tone `signal`; no logo, no icon is added.                                                              | SPEC §1.1, §1.2 (correction 4)              |
| ER-02 | Event row | The Following chip appears on rows matched through a native follow as well as a Spotify follow — the chip is source-agnostic in its trigger.            | SPEC §7.1; following:28                     |
| ER-03 | Event row | Whether follow _source_ is surfaced at all on the chip is a build-time call with the default being **no change**; if surfaced it must remain text-only. | SPEC §5.5                                   |
| ER-04 | Event row | The chip participates in the existing drop ladder unchanged; adding it must not alter chip precedence or introduce a second render path.                | SPEC §1.1 (`event-row/lib/row-chips.ts:58`) |

---

## E. Event detail

| ID    | Surface      | Requirement                                                                                                                                             | Source                   |
| ----- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| ED-01 | Event detail | A bill follow block lists the artists on the bill, each with a follow affordance at `sm` size inside an ≥44px row.                                      | cold:300                 |
| ED-02 | Event detail | The block header names the section and shows the artist count.                                                                                          | cold:300                 |
| ED-03 | Event detail | A "follow all" action renders **only when at least one artist on the bill is unfollowed**; it disappears once all are followed.                         | cold:300                 |
| ED-04 | Event detail | The "follow all" commit uses the `pending` state (no width change) and resolves per-artist, so a partial failure leaves the successful follows applied. | SPEC §5.1, §9.3          |
| ED-05 | Event detail | The whole bill block is a **single paywall unit** when locked — one gate, not one lock per row.                                                         | cold:300; README         |
| ED-06 | Event detail | The block is rendered by the shipped event-detail component via a slot/prop, not by forking the event-detail screen.                                    | cold:340                 |
| ED-07 | Event detail | On desktop the bill block sits in the 340px right rail, beneath the Watch card.                                                                         | desktop:361              |
| ED-08 | Event detail | Following an artist from the bill does not change the event's watch state; the two are independent.                                                     | canvas (affordance note) |

---

## F. Search

| ID    | Surface | Requirement                                                                                                                     | Source              |
| ----- | ------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| SR-01 | Search  | Artist results render in their own section placed **above** the shows section.                                                  | cold:240            |
| SR-02 | Search  | Each artist result row carries a follow affordance at `sm` size.                                                                | cold:240            |
| SR-03 | Search  | Below the spec's narrow breakpoint the result button collapses to icon-only with an artist-naming `aria-label`.                 | cold:240; SPEC §5.3 |
| SR-04 | Search  | Artist search uses the shipped `GET /v1/search/artists?q=` endpoint; no new search endpoint is introduced.                      | SPEC §1.1           |
| SR-05 | Search  | Following from a search result updates the row in place without collapsing or re-ordering the result list.                      | cold:240            |
| SR-06 | Search  | Desktop artist search uses a `minmax(0,1fr) 320px` two-column layout — results plus an explainer rail — with `md`-size buttons. | desktop:295         |
| SR-07 | Search  | A locked user searching artists still sees results; only the follow action is gated.                                            | SPEC §5.1           |

---

## G. Onboarding (cold start)

| ID    | Surface    | Requirement                                                                                                                                                       | Source                   |
| ----- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| OB-01 | Onboarding | The flow has exactly eight steps in order: `welcome · how · today · theme · notyet · genres · artists · done`.                                                    | SPEC §9.1                |
| OB-02 | Onboarding | The genres step is step 6 of 8 and the artists step is step 7 of 8; the progress dots read `total=8` with the matching zero-based index.                          | cold:20, 70, 100         |
| OB-03 | Onboarding | Genre options come from `events.genre` values, not from any artist genre field.                                                                                   | SPEC §1.2 (correction 3) |
| OB-04 | Onboarding | Each artist pick tile uses `role="checkbox"` with `aria-checked`, and selection is shown by a check glyph **plus** a border and fill change (never colour alone). | cold:35                  |
| OB-05 | Onboarding | The artist grid is two columns on mobile.                                                                                                                         | cold:65                  |
| OB-06 | Onboarding | Selection state is mirrored to `sessionStorage` so a paywall interruption or reload does not lose picks.                                                          | SPEC §9.3                |
| OB-07 | Onboarding | The step commits via `POST /v1/me/artist-follows/bulk` with body `{ slugs: string[] }`, Zod-bounded in length.                                                    | SPEC §9.3                |
| OB-08 | Onboarding | The bulk endpoint carries `requireFeature('following')` and returns a per-slug result so partial success is representable.                                        | SPEC §9.3                |
| OB-09 | Onboarding | A 403 from the bulk commit opens `TierPickerSheet` with `entry: 'follow'` and **keeps the user's selection intact**.                                              | SPEC §9.3, §6.2          |
| OB-10 | Onboarding | The commit button uses the `pending` state with no width change while the bulk call is in flight.                                                                 | SPEC §5.1                |
| OB-11 | Onboarding | The artists step is skippable — a user can advance with zero selections.                                                                                          | cold:100                 |
| OB-12 | Onboarding | Desktop renders the artists step in a 760px card with a 5-column grid.                                                                                            | desktop:258              |
| OB-13 | Onboarding | Bulk-follow confirmation (the sheet summarising what was followed) reuses the shared follow primitives; it does not introduce a fourth button skin.               | cold:350                 |

---

## H. My Shows

| ID    | Surface  | Requirement                                                                                                                                               | Source                                        |
| ----- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| MS-01 | My Shows | An "Artists" tab is added to the shipped `MyShowsTabs.tsx` tab set; the tab-3 nav container label is already "my shows" and is not renamed.               | SPEC §1.1, §1.2 (correction 5); following:203 |
| MS-02 | My Shows | The tab strip is a real tablist with arrow-key navigation and correct `aria-selected` / `aria-controls` wiring.                                           | canvas (A11Y note)                            |
| MS-03 | My Shows | The Artists tab lists followed artists in groups with each group heading rendered as an `h2`.                                                             | following:203; canvas (A11Y note)             |
| MS-04 | My Shows | Each artist row shows the follow affordance for unfollow, and unfollowing removes the row without a confirmation dialog.                                  | following:169; SPEC §5.1                      |
| MS-05 | My Shows | Artist rows are grouped so that artists with upcoming Denver dates are distinguishable from those without.                                                | following:203                                 |
| MS-06 | My Shows | A persistent "find artists" entry row is present in the list so the tab is never a dead end.                                                              | following:189                                 |
| MS-07 | My Shows | The empty state is a hybrid: an explanation plus an immediate way to start following, not a bare message.                                                 | following:245                                 |
| MS-08 | My Shows | For a Spotify-connected user whose list was just synced, a distinct fresh-sync variant explains where the list came from.                                 | following:272                                 |
| MS-09 | My Shows | Spotify-sourced and natively-followed artists appear in **one** list with a per-row source mark, not in separate lists.                                   | following:169 (`source` prop); README         |
| MS-10 | My Shows | The list is fetched from `GET /v1/me/artist-follows`, which is **not** gated by `requireFeature` (a downgraded user can still see and manage their list). | SPEC §7.5                                     |
| MS-11 | My Shows | Desktop renders the Artists tab in a 940px max-width container with 3-column grids and header-level actions for alerts and finding artists.               | desktop:184                                   |

---

## I. Settings — Notifications

| ID    | Surface  | Requirement                                                                                                                                                                                                                             | Source                        |
| ----- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| ST-01 | Settings | Migration 0078 adds three columns to `user_notification_preferences`: `artist_alerts_enabled boolean NOT NULL DEFAULT true`, `artist_auto_watch boolean NOT NULL DEFAULT false`, `weekly_digest_enabled boolean NOT NULL DEFAULT true`. | SPEC §4.1                     |
| ST-02 | Settings | The migration backfills from `user_spotify_connections` where `status <> 'revoked'` using `INSERT … ON CONFLICT (user_id) DO UPDATE`, because preference rows are lazily created and may not exist.                                     | SPEC §4.2                     |
| ST-03 | Settings | The backfill leaves `master_enabled` untouched.                                                                                                                                                                                         | SPEC §4.2                     |
| ST-04 | Settings | `GET`/`PATCH /v1/me/notification-preferences` in `apps/api/src/routes/me-push.ts` is extended (its `preferencesSchema` widened) rather than a new endpoint added.                                                                       | SPEC §8.1                     |
| ST-05 | Settings | The web screen is the shipped `NotificationsSection.tsx`; no parallel notifications screen is created.                                                                                                                                  | SPEC §8.1                     |
| ST-06 | Settings | The two new artist rows sit **above** the watch-updates rows, so the list reads in funnel order (artist announces → watch → price).                                                                                                     | notify:43-45, 59-91           |
| ST-07 | Settings | The artist rows sit under a group heading identifying them as being about followed artists.                                                                                                                                             | notify:59                     |
| ST-08 | Settings | The auto-watch row is rendered as an indented sub-row of the artist-alerts row, not as a sibling top-level row.                                                                                                                         | notify:84                     |
| ST-09 | Settings | Every toggle uses `role="switch"` with `aria-checked` and a hit area of at least 44px.                                                                                                                                                  | notify:14; canvas (A11Y note) |
| ST-10 | Settings | When the user lacks the `following` entitlement, the artist block collapses to a **single locked card** with a lock glyph and an upgrade action — the individual toggles are not rendered at all.                                       | notify:61-71                  |
| ST-11 | Settings | The locked card's action opens `TierPickerSheet`; it is a real button, not disabled text.                                                                                                                                               | notify:70; SPEC §6.2          |
| ST-12 | Settings | A weekly-digest toggle row is present and is marked as new.                                                                                                                                                                             | notify:88                     |
| ST-13 | Settings | For a Spotify-connected user an explanatory note states that these switches cover Spotify-sourced artists too — one set of switches regardless of source.                                                                               | notify:92-99                  |
| ST-14 | Settings | The device-off state (account push on, device push off) keeps its shipped banner and enable action above the new rows.                                                                                                                  | notify:53-58                  |
| ST-15 | Settings | Digest cadence is **not changed** by this epic: it remains the shipped cron `30 15 * * 1` (Monday 15:30 UTC). Copy must not name a different day.                                                                                       | SPEC §8.1                     |
| ST-16 | Settings | Desktop renders the same screen as a 250px sidebar plus a 720px content column, with identical row order and states.                                                                                                                    | desktop:23, 46                |

---

## J. Weekly digest email

| ID    | Surface | Requirement                                                                                                                                            | Source                   |
| ----- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------ |
| DG-01 | Digest  | The digest is produced by the shipped `apps/api/src/jobs/spotify-weekly.ts` path, widened to cover natively-followed artists rather than a second job. | SPEC §1.1, §8.1          |
| DG-02 | Digest  | Sending is gated on `weekly_digest_enabled` and on the user holding the `following` entitlement.                                                       | SPEC §4.1, §8.1          |
| DG-03 | Digest  | The email covers artists from both sources in one message; there is no separate Spotify digest.                                                        | notify:264; README       |
| DG-04 | Digest  | The email uses inline hex colours — email is the sole documented exception to the token-only rule — and must visually match the app's dark palette.    | SPEC §3; notify:263      |
| DG-05 | Digest  | A zero-content variant exists and is either suppressed or sends a distinct empty-week message; the default template must not render an empty list.     | notify:264 (`zero` prop) |
| DG-06 | Digest  | A plain-text alternative part is generated with the same content, including its own zero variant.                                                      | notify:327               |
| DG-07 | Digest  | The email contains a link to notification settings so the recipient can turn it off.                                                                   | notify:264               |
| DG-08 | Digest  | Digest copy must not name a specific weekday that conflicts with the Monday cron.                                                                      | SPEC §8.1                |

---

## K. Push notifications

| ID    | Surface | Requirement                                                                                                                                   | Source                    |
| ----- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| PU-01 | Push    | An artist-announcement push fires when a crawl discovers a Denver date for a followed artist — event-driven, not on a schedule.               | SPEC §8; notify:80        |
| PU-02 | Push    | Delivery is exactly-once, claimed via `spotify_alert_log` with `onConflictDoNothing().returning()`; a duplicate claim sends nothing.          | SPEC §8.2                 |
| PU-03 | Push    | Deliveries are coalesced per user per crawl run, so one run produces at most one artist-alert push per user.                                  | SPEC §8.2                 |
| PU-04 | Push    | The flush is **awaited** before the crawler exits, because both crawler entrypoints call `process.exit(0)`.                                   | SPEC §8.2                 |
| PU-05 | Push    | Three copy variants exist: auto-watch off, auto-watch on, and a many-artists batch; each names the trigger (the artist announced a date).     | notify:189                |
| PU-06 | Push    | When `artist_auto_watch` is on, the show is added to Watching and the push says so; when off, the push is informational and the user decides. | notify:84, 189; SPEC §4.1 |
| PU-07 | Push    | Push is gated on `artist_alerts_enabled`, on the push master switch, and on the `following` entitlement.                                      | SPEC §4.1, §8             |
| PU-08 | Push    | Notification-tray rows show unread state with **both** a dot and a bold weight (not colour alone).                                            | notify:224                |
| PU-09 | Push    | Tapping the push deep-links to the event, not to a generic list.                                                                              | notify:194                |

---

## L. Tier picker (paywall)

| ID    | Surface     | Requirement                                                                                                                                                                      | Source                         |
| ----- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| TP-01 | Tier picker | The paywall used everywhere in this epic is the shipped `TierPickerSheet` at `apps/web/src/components/consumer/tier-picker/`. No new paywall component is created.               | SPEC §1.2 (correction 1), §6.2 |
| TP-02 | Tier picker | A new `PickerEntry` value `'follow'` is added to `packages/types/src/analytics-events.ts`, **distinct** from the existing `'logged-out-follow'`.                                 | SPEC §6.2                      |
| TP-03 | Tier picker | A follow-specific header variant is added to `TIER_PICKER_COPY.header`, keyed by the `'follow'` entry.                                                                           | SPEC §6.2                      |
| TP-04 | Tier picker | The follow-entry content is an eyebrow, title, body, exactly three bullets, and a CTA.                                                                                           | following:327                  |
| TP-05 | Tier picker | Every locked follow affordance in the epic opens the picker with `entry: 'follow'` (onboarding, artist page, search, bill block, shelf badge, scope chip, settings card, nudge). | SPEC §6.2, §9.3                |
| TP-06 | Tier picker | Opening and dismissing the picker preserves whatever selection or scroll context the caller had.                                                                                 | SPEC §9.3                      |
| TP-07 | Tier picker | The premium benefit card's benefit ordering is updated so following appears in the list.                                                                                         | following:364                  |
| TP-08 | Tier picker | Tier-picker bullets must not claim a digest cadence that conflicts with the Monday cron.                                                                                         | SPEC §8.1; following:327       |

---

## M. First-watch nudge

| ID    | Surface | Requirement                                                                                                                                                 | Source                         |
| ----- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| FW-01 | Nudge   | The nudge fires once, immediately after a user's first Watch, and never again.                                                                              | notify:106                     |
| FW-02 | Nudge   | Dismissal is keyed by **`userEventId`**, not `eventId`.                                                                                                     | SPEC §8.4                      |
| FW-03 | Nudge   | The nudge is artist-anchored: it names the artist just watched and offers a one-tap follow of that artist (variant A, the design's recommendation).         | notify:109-118                 |
| FW-04 | Nudge   | The nudge card announces once on appear via `role="status"`.                                                                                                | canvas (A11Y note)             |
| FW-05 | Nudge   | Dismiss is a real button with an accessible name and an ≥44px hit area — not a bare glyph div.                                                              | canvas (A11Y note); notify:156 |
| FW-06 | Nudge   | The card carries a secondary decline action distinct from dismiss-by-X.                                                                                     | notify:169                     |
| FW-07 | Nudge   | For a locked user the nudge's CTA renders with a lock glyph and opens the tier picker instead of following.                                                 | notify:168                     |
| FW-08 | Nudge   | The nudge replaces the shipped Spotify-pitch nudge; two nudges must not both be able to fire after a first watch.                                           | notify:106-108; README         |
| FW-09 | Nudge   | On desktop the nudge **replaces the right rail's watch card in place** rather than appearing as an additional card, and uses the `full` (48px) button size. | SPEC §8.4; desktop:435         |

---

## N. Cross-cutting

| ID    | Surface | Requirement                                                                                                                                                                   | Source                   |
| ----- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| XC-01 | All     | Mobile and desktop parity ship in the same PR for every surface — no surface lands mobile-only.                                                                               | README; desktop.jsx      |
| XC-02 | All     | Every customer-facing string lives in a `definitions/copy.ts`, not inline in a `.tsx`; no em-dashes in copy files.                                                            | CLAUDE.md; lint layer 1  |
| XC-03 | All     | The locked vocabulary is respected: Watching is never "Saved"/"Favorites"; the follow concept is "Follow"/"Following" and never borrows the Watching eye glyph or `--accent`. | CLAUDE.md; SPEC §3       |
| XC-04 | All     | Migrations are expand-only; no column is dropped or renamed in this epic.                                                                                                     | CLAUDE.md; SPEC §4       |
| XC-05 | All     | All four follow access states (idle / following / locked / logged-out-locked) are reachable in the running app and demonstrable per epic-run gates 1–2.                       | SPEC §5.1                |
| XC-06 | All     | Every new API boundary validates input with Zod.                                                                                                                              | CLAUDE.md; SPEC §7, §9.3 |
| XC-07 | All     | A release-notes entry is added to `apps/web/src/lib/definitions/releases.ts` on the epic's branch.                                                                            | CLAUDE.md                |

---

## Ambiguities

Things the handoff leaves undecided. Items marked **RESOLVED** were settled by the merged eng spec or the run briefing after this table was first enumerated; they are kept rather than deleted so a verifier can see the call was made deliberately. The rest still need a build-time call, and the two product ones go to the run report rather than being answered in code.

1. **Event-row follow source.** SPEC §5.5 explicitly leaves "should the Following chip say where the follow came from" as a build/copy-review judgment, with the default being no change. There is no drawn state for a source-labelled chip.
2. **"Browse all artists" destination. RESOLVED — `/search`, and this epic adds no artist index.** `apps/web/src/app/(protected)/(main)/artists/` holds only `[slug]`; there is no index route and building one is out of scope. Every all-artists affordance points at `/search`. Do not add an index, and do not drop the affordance.
3. **Where the "find artists" picker lives. RESOLVED — focused search, not a new surface.** `FindArtistsRow` (following:189) and the nudge variant-B CTA route to `/search` for the same reason as item 2. No picker route and no picker sheet ship in this epic.
4. **Eight onboarding steps.** The handoff itself flags that adding two steps makes the flow eight long and asks which existing step should be dropped. The spec locks the eight-step list but does not resolve the product concern.
5. **Starter-shelf shuffle mechanics.** "Shuffled per session" is stated; the seed, storage (session storage vs. server), and whether the order must be stable across a back-navigation are unspecified.
6. **Suggestion ranking.** With follower counts cut from scope, nothing defines how starter-shelf and onboarding artist suggestions are ordered or selected.
7. **Icon-only breakpoint value.** The spec says "under 360px"; the prototypes drive icon-only off a `narrow` boolean tied to a 320px artboard. The exact media-query value is a build call.
8. **Batched push tray state.** `NF_PUSH.many` exists as a lock-screen variant, but there is no drawn notification-tray row for a coalesced multi-artist alert.
9. **Digest suppression vs. empty send.** A `zero` template variant exists for the digest, but nothing says whether a zero-content week sends it or suppresses the email entirely.
10. **Downgrade behaviour for existing follows. RESOLVED — follows are retained, alerts stop.** Eng spec §3.2: downgrading never deletes follows. The user keeps the list and the Artists tab, loses the alerts and the scope chip, and can still unfollow, because DELETE is unentitled by design.

---

## Contradictions with the spec

Beyond the five corrections given as inputs. In every case the spec wins; these rows exist so a verifier does not "fix" the implementation back toward the prototype.

| #   | Prototype / handoff says                                                                                                                    | Spec says                                                                                                                                                                            | Resolution                                                                                         |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| 1   | `pending` is a fourth state of the single-artist follow button (README "four states"; `shared:185` skin; `canvas` StateGallery shows four). | §5.1 ships **three** single-artist states; `pending` survives only for bulk commits. Single-artist follow is optimistic instead.                                                     | Follow the spec. Do not render `pending` on a single-artist tap.                                   |
| 2   | The weekly digest is "One email **Friday** morning…" (`notify:88`, and the `FOLLOW_ANCHOR` bullet at `following:327`).                      | §8.1: the cadence is the shipped cron `30 15 * * 1` — **Monday** 15:30 UTC — and this epic does not change it.                                                                       | Copy must not name Friday. Two places to fix.                                                      |
| 3   | `nf-shared.jsx:166` defines `function nfLocked(tier) { return tier === "free" \|\| tier === "supporter"; }` — an inline tier-string test.   | §5.2 requires `nfLocked(state: PlanStateLike) => !canUseFeature(state, 'following')` and explicitly forbids enumerating tiers (it would mis-handle `roleComped` and `'logged-out'`). | Implement the spec's helper. The prototype's version is a canvas convenience only.                 |
| 4   | `canvas` StateGallery renders the event-row Following chip with `tone="strong"`.                                                            | §1.1 records the shipped chip as tone `signal`.                                                                                                                                      | Leave the shipped chip alone; the gallery mis-labels it.                                           |
| 5   | `NFTabBar` (`shared:339`) still labels tab 3 "watching".                                                                                    | §1.1: BottomNav already reads "my shows".                                                                                                                                            | Prototype chrome is stale; consistent with correction 5. No nav work.                              |
| 6   | README asks for a `MiniPaywall` and states `buildMeta` hardcodes a Spotify logo on the Following chip.                                      | §1.1/§1.2: `MiniPaywall` does not exist (`TierPickerSheet` is shipped) and the chip is already text-only.                                                                            | Given as corrections 1 and 4; restated here because the README text remains in the merged handoff. |

---
---

# APPENDIX P6 — PR 6: My shows ▸ Artists, and the shared picker

> **Scope of this appendix.** Everything below enumerates **PR 6 only**. It is appended rather than
> merged into sections A–N above because those enumerate the epic at large; section H (`MS-01`…`MS-11`)
> covers the same surface at a much coarser grain. Where a row here disagrees with an `MS-` row, this
> appendix is the finer reading — but both are kept so a verifier can see the difference.
>
> **ID prefixes used here** (chosen not to collide with `FA-`/`AP-`/`MS-`/`ST-`/`DG-`/`PU-`/`TP-`/`FW-`/`XC-`):
> `T-` tabs · `G-` list groups + rows · `FR-` find-more row · `AL-` alerts row · `SP-` Spotify variants ·
> `PK-` picker · `EM-` empty state · `DK-` desktop · `SCV-` state coverage · `CP-` copy · `ACC-` a11y ·
> `RS-` responsive · `OOS-` not in the plan's scope · `AMB-` ambiguities.
>
> **All copy in the prototypes is placeholder** (handoff README banner). Every `CP-` row is marked
> accordingly; every string must go through the `copy-review` skill and land in a `definitions/copy.ts`
> before it ships. The strings below are what to review, not what to paste.

## P6.0 — What already exists vs. what is new

| ID     | Thing                                                                                | Status                                   | Where                                                                             |
| ------ | ------------------------------------------------------------------------------------ | ---------------------------------------- | --------------------------------------------------------------------------------- |
| EX-01  | `MyShowsTabs` — two tabs, rendered as a `<nav>` of `<Link>`s with `aria-current`      | **Shipped, and must be rewritten**       | `apps/web/src/components/consumer/history/MyShowsTabs.tsx`                        |
| EX-02  | `HISTORY_COPY.tabs = { ariaLabel: 'My shows', watching: 'Watching', concerts: 'Concerts' }` | **Shipped; no `artists` key**       | `apps/web/src/components/consumer/history/definitions/copy.ts`                    |
| EX-03  | `FollowShelf` + `ShelfCard` (badge-on-art affordance, 34px, gate span, `useArtistFollow`) | **Shipped — reuse, do not re-draw**  | `apps/web/src/components/consumer/following/ShelfCard.tsx`                        |
| EX-04  | `FOLLOWING_COPY` (`cardNoDate`, `followAria`, `followingAria`, `followGate`, `shelfAria`, `cardDateSeparator`) | **Shipped**             | `apps/web/src/components/consumer/following/definitions/copy.ts`                  |
| EX-05  | `SHELF_NARROW_QUERY = '(max-width: 359px)'` — the concrete narrow breakpoint precedent | **Shipped — reuse this value**           | `apps/web/src/components/consumer/following/definitions/constants.ts`             |
| EX-06  | `GET /v1/me/artist-follows` → `FollowedArtist[]`, **deliberately ungated**            | **Shipped**                              | `apps/api/src/routes/artist-follows.ts`                                           |
| EX-07  | `POST /v1/me/artist-follows/bulk`, `requireFeature('following')`, `slugs` 1…50        | **Shipped**                              | `apps/api/src/routes/artist-follows.ts`                                           |
| EX-08  | `fetchFollowedArtists` / `seedFollowedArtists` / `datedFollows` / `hasSpotifyFollows` / `dateLine` / `followsToShelfArtists` | **Shipped**   | `apps/web/src/lib/following.ts`                                                   |
| EX-09  | `TierPickerSheet`, entry `'follow'`                                                   | **Shipped**                              | consumer tier picker                                                              |
| NEW-01 | A route for the Artists tab                                                           | **New** — `(protected)/(main)/` has `watching`, `history`, `artists/[slug]` only, no artists index | `apps/web/src/app/(protected)/(main)/`      |
| NEW-02 | Third tab + count in the accessible name                                              | **New**                                  | `MyShowsTabs.tsx`                                                                 |
| NEW-03 | Two-group followed-artist list + `ArtistManageRow`                                    | **New**                                  | new dir                                                                           |
| NEW-04 | `FindArtistsRow`                                                                      | **New**                                  | new dir                                                                           |
| NEW-05 | Alerts deep-link row                                                                  | **New**                                  | new dir                                                                           |
| NEW-06 | `apps/web/src/components/consumer/artist-picker/`                                     | **New** (and contested — see `AMB-05`)   | new dir                                                                           |
| NEW-07 | Artists empty state (mobile + desktop)                                                | **New**                                  | new dir                                                                           |
| NEW-08 | Spotify-imported variants of the list                                                 | **New, and unnamed by the plan**         | see `OOS-02`                                                                      |

---

## P6.1 — Surface + component inventory

Every component PR 6 names, with the prototype component that draws it and its file + line.

| ID    | Surface / component (build name)   | Prototype component        | File + line                                  | Notes                                                                 |
| ----- | ---------------------------------- | -------------------------- | -------------------------------------------- | --------------------------------------------------------------------- |
| CI-01 | Artists tab (tab strip)            | `NFTabs`                   | `nf-shared.jsx:315`                          | Prototype tabs are `["Watching","Artists","History"]`, `active={1}`    |
| CI-02 | Artists tab page (mobile)          | `MyShowsArtists`           | `nf-following.jsx:203`                       | App bar + tabs + 2 groups + find row + alerts card + Spotify footnote  |
| CI-03 | Followed-artist row                | `ArtistManageRow`          | `nf-following.jsx:169`                       | Art + name + meta + trailing `NFFollow state="following"`              |
| CI-04 | "No dates announced" meta          | `NoDatesLine`              | `nf-shared.jsx:223`                          | Used as the meta line of the second group                             |
| CI-05 | Spotify provenance mark            | `SourceMark`               | `nf-shared.jsx:125`                          | Per-row, under the meta line, `marginTop:1`                            |
| CI-06 | Find-more row                      | `FindArtistsRow`           | `nf-following.jsx:189`                       | A row, not a button (plan Step 3)                                      |
| CI-07 | Alerts deep-link card              | inline in `MyShowsArtists` | `nf-following.jsx:203` (card block)          | Deep link into Settings ▸ Notifications; **not** a second control      |
| CI-08 | Spotify footnote card              | inline in `MyShowsArtists` | `nf-following.jsx:203` (footnote block)      | Only when the list contains imported artists                           |
| CI-09 | Empty state (mobile)               | `MyShowsArtistsEmpty`      | `nf-following.jsx:245`                       | Plan Step 6                                                            |
| CI-10 | Spotify fresh-import variant       | `MyShowsArtistsSpotifyFresh` | `nf-following.jsx:272`                     | Sync header card + explanatory footnote — see `OOS-02`                 |
| CI-11 | Artists tab page (desktop)         | `MyShowsArtistsDesktop`    | `nf-desktop.jsx:184`                         | 940px, 3-col card grids — see `OOS-01`                                 |
| CI-12 | Picker tile                        | `ArtistPick`               | `nf-cold-start.jsx:35`                       | `role="checkbox"`, badge on art                                        |
| CI-13 | Picker grid                        | `PickGrid`                 | `nf-cold-start.jsx:65`                       | `repeat(cols, minmax(0,1fr))`, gap 10                                  |
| CI-14 | Picker body + commit bar           | `FollowStepArtists`        | `nf-cold-start.jsx:100`                      | The onboarding step; PR 6 extracts the reusable half                   |
| CI-15 | Picker (desktop / modal)           | `FollowStepDesktop`        | `nf-desktop.jsx:258`                         | 760px card, 5-col grid                                                 |
| CI-16 | Bulk sheet (list, not grid)        | `BulkFollowSheet`          | `nf-cold-start.jsx:350`                      | Different anatomy from the picker — see `AMB-06`                       |
| CI-17 | Follow button atom                 | `NFFollow`                 | `nf-shared.jsx:168`                          | `NF_FOLLOW_SIZES` at `nf-shared.jsx:156`                               |
| CI-18 | Primary / ghost buttons            | `NFPrimary` / `NFGhost`    | `nf-shared.jsx:65` / `:77`                   | Empty-state and desktop-header CTAs                                    |
| CI-19 | Artwork                            | `NFArt`                    | `nf-shared.jsx:45`                           | Wraps shipped `IdentityArt kind="artist"`; `aria-hidden`               |
| CI-20 | Mono label                         | `Mono`                     | `nf-shared.jsx:57`                           | Group headings, counts, provenance                                     |
| CI-21 | Sample data                        | `NF_ARTISTS`               | `nf-shared.jsx:379`                          | 12 artists; 10 dated, 2 undated (`Jessica Pratt`, `Been Stellar`)      |
| CI-22 | Artboards for this surface         | section 4 `manage`         | `nf-canvas.jsx:399`                          | `mg-mobile`, `mg-320`, `mg-empty`, `mg-spotify`, `mg-mixed`, `mg-desk`, `mg-desk-empty`; plus `du-light`, `du-jade-empty` in section 8 |

---

## P6.2 — State coverage

Every visual state, and how a build/verify agent reaches it.

| ID     | Surface        | State                        | How triggered                                                                       | Drawn at                                  |
| ------ | -------------- | ---------------------------- | ----------------------------------------------------------------------------------- | ----------------------------------------- |
| SCV-01 | Artists tab    | Empty (zero follows)         | `GET /v1/me/artist-follows` → `[]`                                                   | `nf-following.jsx:245`, `mg-empty`        |
| SCV-02 | Artists tab    | Loading                      | Request in flight; `seedFollowedArtists` returns `undefined` (UNKNOWN ≠ zero)        | **Not drawn** — see `OOS-06`              |
| SCV-03 | Artists tab    | Error                        | Fetch rejects / non-2xx                                                              | **Not drawn** — see `OOS-06`              |
| SCV-04 | Artists tab    | One artist, dated            | Single follow with `nextShow != null`                                                | Row form only, `nf-following.jsx:169`     |
| SCV-05 | Artists tab    | One artist, undated          | Single follow, `nextShow == null` → group 2 only, group 1 absent                     | Row form only; heading behaviour undefined (`AMB-07`) |
| SCV-06 | Artists tab    | Many, both groups            | ≥1 dated and ≥1 undated                                                              | `mg-mobile` (7 follows)                   |
| SCV-07 | Artists tab    | All dated                    | Every follow has `nextShow`                                                          | Implied; group 2 + its heading must not render |
| SCV-08 | Artists tab    | All undated                  | No follow has `nextShow`                                                             | Implied; group 1 + its heading must not render |
| SCV-09 | Artists tab    | Contains imported artists    | Any follow with `source` ∈ `spotify_followed \| spotify_top`                          | `mg-mixed`; footnote card                 |
| SCV-10 | Artists tab    | Fresh large Spotify import   | Large imported list, recent sync                                                     | `nf-following.jsx:272`, `mg-spotify` (112)|
| SCV-11 | Row            | Following (default)          | Every row on this surface starts `following`                                          | `NFFollow state="following"`              |
| SCV-12 | Row            | Idle (after unfollow)        | Tap the row's button once; optimistic; **row stays on screen until navigation**       | canvas §4 Structure note                  |
| SCV-13 | Row            | Locked                       | `nfLocked(planState)` true (downgraded user viewing a retained list)                  | `nf-shared.jsx:168` locked skin           |
| SCV-14 | Row            | Icon-only                    | Viewport narrow (`narrow` → `iconOnly`)                                               | `mg-320`                                  |
| SCV-15 | Row            | Slug-less artist             | `slug === null` (hidden projection) — shipped `ShelfCard` precedent renders no badge   | **Not drawn for this row** (`AMB-08`)     |
| SCV-16 | Row            | Art fails to load            | Signed URL 404 → `IdentityArt` fallback (shipped `CardArt` precedent)                  | **Not drawn**                             |
| SCV-17 | Empty state    | Entitled                     | Zero follows, `nfLocked` false → primary reads "Find artists to follow"                | `nf-following.jsx:245`                    |
| SCV-18 | Empty state    | Locked                       | Zero follows, `nfLocked` true → primary reads "See who's playing Denver"                | same, ternary on `nfLocked(tier)`         |
| SCV-19 | Empty state    | Desktop                      | ≥ desktop breakpoint                                                                   | `nf-desktop.jsx:184` (`mg-desk-empty`)    |
| SCV-20 | Signed-out     | —                            | `/watching` and `/history` are protected; the Artists route sits under `(protected)`   | **Not drawn** — no signed-out artboard    |
| SCV-21 | Tab strip      | Artists active               | On the Artists route                                                                   | `NFTabs active={1}`                       |
| SCV-22 | Tab strip      | Artists inactive             | On Watching or Concerts — count is **not** rendered (count shows on active tab only)   | `nf-shared.jsx:315`                       |
| SCV-23 | Tab strip      | Zero-count                   | No follows → what the accessible name says is undefined (`AMB-04`)                     | **Not drawn**                             |
| SCV-24 | Picker tile    | Unselected                   | Initial                                                                                | `nf-cold-start.jsx:35`                    |
| SCV-25 | Picker tile    | Selected                     | Tap / Space                                                                            | same                                      |
| SCV-26 | Picker tile    | Undated artist               | `artist.next == null` → sub-line "no date yet"                                          | same                                      |
| SCV-27 | Picker         | Zero selected                | Initial → commit bar shows the "continue without" pairing                                | `nf-cold-start.jsx:100`                   |
| SCV-28 | Picker         | n selected, entitled         | ≥1 selected, `nfLocked` false                                                            | same                                      |
| SCV-29 | Picker         | n selected, locked           | ≥1 selected, `nfLocked` true → commit reads "…with Premium", picks held                  | same                                      |
| SCV-30 | Picker         | Committing                   | Bulk POST in flight → `NFFollow` `pending` ("Following…", `opacity 0.72`)                | `nf-shared.jsx:168`                       |
| SCV-31 | Picker         | Commit error                 | Bulk POST fails                                                                          | **Not drawn** — see `OOS-06`              |
| SCV-32 | Picker         | Suggestions empty            | Suggestions endpoint returns `[]`                                                        | **Not drawn**                             |
| SCV-33 | Picker         | Desktop                      | ≥ desktop breakpoint → 5-col grid in a 760px modal                                       | `nf-desktop.jsx:258`                      |
| SCV-34 | Whole surface  | Light theme                  | `data-theme` Light — selection must hold AA on glyph + border + fill                     | `du-light`                                |
| SCV-35 | Whole surface  | Jade theme (empty)           | `data-theme` Jade                                                                        | `du-jade-empty`                           |

---

## P6.3 — Exact values

### Tab strip

| ID    | Property                | Prototype value (`nf-shared.jsx:315`)                                              | Shipped value (`MyShowsTabs.tsx`)                          |
| ----- | ----------------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| T-01  | Container               | `display:flex; gap:4; padding:0 16px; border-bottom:1px solid var(--border)`         | segmented pill: `rounded-[10px] border border-border bg-surface-1 p-[3px]` |
| T-02  | Tab box                 | `padding:12px 4px 10px; margin-right:14; gap:6`                                       | `min-h-[44px] flex-1 rounded-md px-3.5`                     |
| T-03  | Active indicator        | `border-bottom:2px solid var(--signal)`, `margin-bottom:-1px`                          | `background: var(--surface-3)`, `border: 1px solid var(--border-strong)` |
| T-04  | Inactive indicator      | `border-bottom:2px solid transparent`                                                  | transparent bg + transparent border                          |
| T-05  | Label type              | Inter, `14px`, weight `800` active / `600` inactive                                     | `var(--font-ui)`, `12.5px`, weight `700` / `500`, `letter-spacing:-0.005em` |
| T-06  | Label colour            | `var(--fg)` active / `var(--fg-subtle)` inactive                                        | `var(--fg)` / `var(--fg-muted)`                              |
| T-07  | Count                   | mono `10px`, weight `700`, `var(--fg-subtle)`, **active tab only**                       | **no count shipped**                                         |
| T-08  | Desktop tab strip       | `gap:26; border-bottom:1px solid var(--border); margin-bottom:22`; label `15.5px`, active weight `800`; underline `2px solid var(--signal)`; count mono `11px/700`, active only | `nf-desktop.jsx:184` |
| T-09  | Tab order + labels      | Prototype: `Watching · Artists · History`, Artists at index 1                            | Shipped: `Watching · Concerts` — see `AMB-02`                |

### Followed-artist row (`ArtistManageRow`, `nf-following.jsx:169`)

| ID    | Property             | Value                                                                                     |
| ----- | -------------------- | ----------------------------------------------------------------------------------------- |
| G-01  | Row box              | `display:flex; align-items:center; gap:12px; padding:11px 16px; border-top:1px solid var(--border)` |
| G-02  | Art                  | `NFArt size={narrow ? 48 : 56} radius={8}`; `aria-hidden`                                  |
| G-03  | Name                 | Inter `14.5px`, weight `800`, `color:var(--fg)`, `letter-spacing:-0.015em`, `white-space:nowrap` + ellipsis |
| G-04  | Meta (dated)         | JetBrains Mono `9.5px`, `color:var(--signal)`, `letter-spacing:0.06em`, uppercase          |
| G-05  | Meta (undated)       | `NoDatesLine` — mono `9.5px`, weight `600`, `letter-spacing:0.08em`, uppercase, `var(--fg-subtle)` |
| G-06  | Provenance           | `SourceMark source="spotify"` with `margin-top:1px` — mono `9px`, weight `700`, `letter-spacing:0.1em`, uppercase, `var(--fg-subtle)`, `SpotifySlot size={9}` |
| G-07  | Trailing control     | `NFFollow state="following" size="sm" iconOnly={narrow}` → `height:36px; padding:0 12px; font-size:12.5px; gap:6px; glyph 12px` |
| G-08  | Following skin       | `background: color-mix(in oklab, var(--signal) 14%, transparent)`; `color: var(--signal)`; `border: 1px solid var(--signal)`; `border-radius:10px`; Inter `800`; `letter-spacing:-0.01em`; `white-space:nowrap` |
| G-09  | Idle skin            | `background: var(--signal)`; `color: var(--fg-on-accent)`; `border: 1px solid var(--signal)` |
| G-10  | Locked skin          | `background: transparent`; `color: var(--fg)`; `border: 1px solid var(--border-strong)`     |
| G-11  | Pending skin         | idle skin at `opacity: 0.72` (bulk commit only — see contradiction row 1 above)             |
| G-12  | Group 1 heading      | `Mono size={9.5}` in `padding:13px 16px 9px`                                                 |
| G-13  | Group 2 heading      | `Mono size={9.5}` in `padding:22px 16px 9px`                                                 |
| G-14  | `Mono` defaults      | JetBrains Mono, `10px`, weight `700`, `letter-spacing:0.14em`, uppercase, `var(--fg-subtle)` |
| G-15  | Sort, group 1        | soonest date first                                                                           |
| G-16  | Sort, group 2        | alphabetical                                                                                 |
| G-17  | **Never** `--accent` | `--accent` is reserved for Watching and brand; Following uses `--signal`. Only the empty-state eyebrow uses `--accent`. |

### Find-more row (`FindArtistsRow`, `nf-following.jsx:189`)

| ID    | Property        | Value                                                                                  |
| ----- | --------------- | -------------------------------------------------------------------------------------- |
| FR-01 | Row box         | `padding:13px 16px`, `margin-top:18px` in `MyShowsArtists`                              |
| FR-02 | Leading glyph   | dashed-border square, `48px` narrow / `56px`, containing `GlyphSearch size={19}` in `var(--signal)` |
| FR-03 | Title           | Inter `14.5px`, weight `800`                                                             |
| FR-04 | Body            | `12px`, `var(--fg-subtle)`, `margin-top:3px`                                             |
| FR-05 | Trailing        | `GlyphChevron size={15}`                                                                 |
| FR-06 | Affordance      | A labelled **row**, not a button (plan Step 3: "+ Follow more" reads like bulk-follow)   |

### Alerts row (`nf-following.jsx:203`)

| ID    | Property | Value                                                                                              |
| ----- | -------- | -------------------------------------------------------------------------------------------------- |
| AL-01 | Card box | `margin:18px 16px 0; padding:13px 14px; border-radius:10px; background:var(--surface-1); border:1px solid var(--border)` |
| AL-02 | Title    | `13.5px`, weight `700`                                                                              |
| AL-03 | Meta     | `11.5px`, `var(--fg-subtle)` — carries the **current** notification state                            |
| AL-04 | Glyphs   | `GlyphBell size={17}` leading, chevron trailing                                                       |
| AL-05 | Behaviour| Deep link into Settings ▸ Notifications. **Not a second place to change the setting** (canvas §4 note) |

### Empty state (`MyShowsArtistsEmpty`, `nf-following.jsx:245`)

| ID    | Property   | Value                                                                                        |
| ----- | ---------- | ---------------------------------------------------------------------------------------------- |
| EM-01 | Container  | centred, `padding:0 26px`                                                                       |
| EM-02 | Mark       | `54×54` dashed square, `border-radius:14px`, `GlyphPlus size={20} w={1.8}`                       |
| EM-03 | Eyebrow    | `Mono size={10} color="var(--accent)" ls="0.18em"` — the one sanctioned `--accent` use here      |
| EM-04 | Headline   | `narrow ? 22px : 25px`, weight `900`, `letter-spacing:-0.03em`, `line-height:1.1`                |
| EM-05 | Body       | `13.5px`, `var(--fg-muted)`, `max-width:290px`                                                    |
| EM-06 | CTA column | `max-width:300px; gap:8px; margin-top:22px`                                                       |
| EM-07 | Primary    | `NFPrimary` — `min-height:46px` (dense 40), `padding:13px 20px`, `border-radius:10px`, `--signal` fill, Inter `800`, `14.5px` |
| EM-08 | Ghost      | `NFGhost` — same box, `1px solid var(--border-strong)`, `var(--fg)`, weight `700`, `14px`          |
| EM-09 | Desktop    | `padding:70px 0`; mark `60×60` radius `15px`; eyebrow `Mono size={10.5}`; headline `28px/900`; body `max-width:430px`; buttons side by side `full={false}`, `gap:10px; margin-top:24px` |

### Picker (`ArtistPick` / `PickGrid`, `nf-cold-start.jsx:35`/`:65`)

| ID    | Property          | Value                                                                                           |
| ----- | ----------------- | ------------------------------------------------------------------------------------------------- |
| PK-01 | Tile box          | `border-radius:12px; padding:8px; gap:8px`                                                         |
| PK-02 | Tile background   | `selected ? var(--surface-2) : var(--surface-1)`                                                     |
| PK-03 | Tile border       | `1px solid (selected ? var(--signal) : var(--border))`                                               |
| PK-04 | Tile inner ring   | `box-shadow: inset 0 0 0 1px var(--signal)` when selected, else `none`                                |
| PK-05 | Art wrapper       | `aspect-ratio: 1 / 1; border-radius:9px`                                                             |
| PK-06 | Badge box         | absolute `top:6px; right:6px`; `24×24`; `border-radius:24px`                                          |
| PK-07 | Badge fill        | `selected ? var(--signal) : rgba(0,0,0,0.5)`                                                          |
| PK-08 | Badge border      | `1.5px solid (selected ? var(--signal) : rgba(255,255,255,0.6))`                                       |
| PK-09 | Badge glyph       | `GlyphCheck size={12} w={2.6}` selected / `GlyphPlus size={11} w={2.4}` unselected                     |
| PK-10 | Three-signal rule | Selection = check glyph **+** border **+** fill. Never colour alone; Light needs all three for AA.     |
| PK-11 | Name              | `12.5px`, weight `800`, ellipsised                                                                    |
| PK-12 | Sub-line          | mono `9px`, `var(--fg-subtle)`; `artist.next.split(" · ")[1]` or the no-date string                    |
| PK-13 | Grid              | `grid-template-columns: repeat(${cols}, minmax(0,1fr)); gap:10px`                                       |
| PK-14 | Mobile columns    | **2**, "ALWAYS two-up, 320 through desktop" (`nf-cold-start.jsx:65`)                                    |
| PK-15 | Desktop columns   | **5** (`nf-cold-start.jsx` desktop use and `nf-desktop.jsx:258`)                                        |
| PK-16 | Search escape     | dashed button, `min-height:44px`                                                                        |
| PK-17 | Desktop modal     | `760px`, `border-radius:18px`, `background:var(--bg-elevated)`, `1px solid var(--border-strong)`         |
| PK-18 | Selection persist | component state **and** `sessionStorage` (eng spec §9.x) so picks survive an upgrade round-trip          |
| PK-19 | Commit            | **ONE** bulk write at commit (`POST /v1/me/artist-follows/bulk`, `slugs` 1…`BULK_FOLLOW_MAX_SLUGS`=50), never per-tap |
| PK-20 | Source list       | Onboarding uses `NF_ARTISTS.slice(0,10)`; desktop shows all 12. Real source: artist suggestions, default limit 12, max 24 |

### Desktop page (`MyShowsArtistsDesktop`, `nf-desktop.jsx:184`)

| ID    | Property        | Value                                                                                               |
| ----- | --------------- | ----------------------------------------------------------------------------------------------------- |
| DK-01 | Container       | `max-width:940px; margin:0 auto; padding:28px 30px 40px`                                                |
| DK-02 | `h1`            | `30px`, weight `900`, `letter-spacing:-0.03em`                                                          |
| DK-03 | Heading row     | `Mono size={10}` left; two dense buttons right                                                          |
| DK-04 | Header actions  | `NFGhost dense` + `GlyphBell size={13}`; `NFPrimary dense` + `GlyphSearch size={13}`                     |
| DK-05 | Card grid       | `grid-template-columns: repeat(3, 1fr); gap:12px`                                                       |
| DK-06 | Card            | `padding:12px; border-radius:12px; border:1px solid var(--border)`; group 1 adds `background:var(--surface-1)` |
| DK-07 | Card art        | `52px`                                                                                                   |
| DK-08 | Card name       | `14px`, weight `800`                                                                                     |
| DK-09 | Card date       | mono `9px`, `var(--signal)`                                                                              |
| DK-10 | Card control    | `NFFollow state="following" size="sm" iconOnly`                                                          |
| DK-11 | Group 2 heading | `margin:26px 0 12px`; rows use `NoDatesLine`                                                              |
| DK-12 | Shell           | `DeskShell` (`nf-desktop.jsx:11`) — `60px` header bar, `padding:0 26px`                                    |

### Shared size ramp (`NF_FOLLOW_SIZES`, `nf-shared.jsx:156`)

| ID    | Size   | Height | Padding    | Font   | Gap | Glyph |
| ----- | ------ | ------ | ---------- | ------ | --- | ----- |
| SZ-01 | `sm`   | 36px   | `0 12px`   | 12.5px | 6   | 12    |
| SZ-02 | `md`   | 44px   | `0 14px`   | 13.5px | 7   | 13    |
| SZ-03 | `full` | 48px   | `0 18px`   | 15px   | 7   | 13    |

---

## P6.4 — Copy (every string verbatim; **all placeholder**)

| ID     | Component                          | String (verbatim)                                                                                                                            |
| ------ | ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| CP-01  | Tab label                          | `Artists`                                                                                                                                       |
| CP-02  | Tab accessible name pattern        | `Artists, 7`                                                                                                                                    |
| CP-03  | App bar (`MyShowsArtists`)         | `My shows`                                                                                                                                      |
| CP-04  | Group 1 heading                    | `{n} playing denver` (rendered uppercase by `Mono`)                                                                                             |
| CP-05  | Group 2 heading                    | `Nothing on the books · {n}`                                                                                                                    |
| CP-06  | Undated meta                       | `No dates announced`                                                                                                                            |
| CP-07  | Provenance mark                    | `Spotify`                                                                                                                                       |
| CP-08  | Row control                        | `Following` / `Follow` / `Following…`                                                                                                           |
| CP-09  | Gate sentence                      | `Following artists is a Premium feature. Opens upgrade options.` (already shipped as `FOLLOWING_COPY.followGate`)                                |
| CP-10  | Find row title                     | `Find artists to follow`                                                                                                                        |
| CP-11  | Find row body                      | `Search by name, or browse who's playing Denver soon.`                                                                                          |
| CP-12  | Alerts title                       | `Alerts for these artists`                                                                                                                      |
| CP-13  | Alerts meta                        | `Push on · weekly digest on`                                                                                                                    |
| CP-14  | Spotify footnote (normal list)     | `4 of these came in from Spotify. Unfollowing here won't touch your Spotify library.`                                                            |
| CP-15  | Empty eyebrow                      | `No one yet`                                                                                                                                    |
| CP-16  | Empty headline                     | `Nobody on your list.`                                                                                                                          |
| CP-17  | Empty body                         | `Follow an artist and we'll tell you the moment they book a Denver date. Even the ones who only come through once a year.`                       |
| CP-18  | Empty primary (entitled)           | `Find artists to follow`                                                                                                                        |
| CP-19  | Empty primary (locked)             | `See who's playing Denver`                                                                                                                      |
| CP-20  | Empty ghost                        | `Follow from a show you're watching`                                                                                                            |
| CP-21  | Spotify-fresh header title         | `112 artists from Spotify`                                                                                                                      |
| CP-22  | Spotify-fresh header meta          | `Synced 2 hours ago · 6 playing Denver`                                                                                                         |
| CP-23  | Spotify-fresh footnote             | `Same list, same controls. Spotify just filled it for you. Follow or unfollow anyone here without touching your Spotify account.`                |
| CP-24  | Picker tile no-date sub-line       | `no date yet` (already shipped as `FOLLOWING_COPY.cardNoDate`)                                                                                  |
| CP-25  | Picker search escape               | `Search for someone specific`                                                                                                                   |
| CP-26  | Picker commit, locked              | `Follow {n} artist(s) with Premium`                                                                                                             |
| CP-27  | Picker sub-line, locked            | `Your picks are held while you upgrade. Nothing gets lost.`                                                                                      |
| CP-28  | Picker commit, unlocked            | `Follow {n} artist(s) →`                                                                                                                        |
| CP-29  | Picker secondary, unlocked         | `Continue without following →`                                                                                                                  |
| CP-30  | Picker sub-line, unlocked (n>0)    | `Unfollow any of them any time.`                                                                                                                |
| CP-31  | Picker sub-line, unlocked (n=0)    | `You can follow anyone from search later.`                                                                                                      |
| CP-32  | Desktop picker footer              | `{n} selected · unfollow any of them any time.` / `Follow {n} artists →`                                                                        |
| CP-33  | Desktop header actions             | `Alerts` / `Find artists to follow`                                                                                                             |
| CP-34  | Shipped tab labels (do not change) | `Watching` / `Concerts` — `HISTORY_COPY.tabs`                                                                                                   |
| CP-35  | Aria patterns already shipped      | `Follow ${name}` / `Following ${name}` — `FOLLOWING_COPY.followAria` / `followingAria`                                                            |

**Copy rules that apply to every row above:** no em-dashes; strings live in `definitions/copy.ts`, never in the `.tsx`; the locked vocabulary is Watching (shows) / Concerts (label for the `history` identifier) / Following + Artists (artists); there is no "Saved". Pluralisation of `artist(s)` must be real, not a literal `(s)`.

---

## P6.5 — Interaction + accessibility

| ID     | Requirement                                                                                                                                                  | Source                              |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| ACC-01 | Tabs are a **real tablist**: `role="tablist"`, `role="tab"`, `aria-selected`, arrow-key navigation                                                              | README a11y; spec §7.5; plan Step 1 |
| ACC-02 | The count is inside the tab's accessible name ("Artists, 7"), not a separate announced node                                                                     | canvas §4 A11Y note                 |
| ACC-03 | Group headings are `h2` elements (the prototype renders `Mono` divs — the divs are wrong)                                                                       | canvas §4 A11Y note; plan Step 2    |
| ACC-04 | The Spotify footnote is **associated with the list**, not decorative                                                                                            | canvas §4 A11Y note                 |
| ACC-05 | Picker tiles are `role="checkbox"` with `aria-checked`, inside a **labelled group**                                                                              | README a11y; `nf-cold-start.jsx:35` |
| ACC-06 | The tile itself is the checkbox — a 12-artist grid is **12** targets, not 24 (no separate badge button)                                                          | plan Step 5                         |
| ACC-07 | Selection is signalled by check glyph + border + fill, never colour alone                                                                                        | README a11y; `PK-10`                |
| ACC-08 | Locked controls are **never** `disabled` or `aria-disabled`; they open `TierPickerSheet` with entry `'follow'`                                                    | eng spec §5.2                       |
| ACC-09 | Locked controls carry `aria-describedby` pointing at a visually-hidden gate sentence, hidden by **clip** (not `hidden` / `display:none`), id from `React.useId()`  | eng spec §5.2; shipped `ShelfCard`  |
| ACC-10 | `aria-pressed` is set only when not locked (`aria-pressed={locked ? undefined : state === 'following'}`)                                                          | `nf-shared.jsx:168`                 |
| ACC-11 | `aria-label` on the follow control **only** when `iconOnly`                                                                                                       | `nf-shared.jsx:168`                 |
| ACC-12 | Every follow variant is ≥44px except the `sm` row button at 36px, which is permitted only because it is paired with a full-row tap target                          | canvas §1 A11Y note                 |
| ACC-13 | Commit button text carries the count                                                                                                                              | canvas §1 A11Y note                 |
| ACC-14 | Unfollow is the same button tapped again. **No confirm dialog.** The artist stays on screen until you navigate away                                                | canvas §4 Structure note            |
| ACC-15 | Single-artist follow/unfollow is **optimistic** — do not render `pending` on a single tap                                                                          | eng spec §5.1                       |
| ACC-16 | `pending` renders only for the bulk commit                                                                                                                        | eng spec §5.1                       |
| ACC-17 | Artwork is `aria-hidden` (`NFArt` / shipped `IdentityArt`)                                                                                                        | `nf-shared.jsx:45`                  |
| ACC-18 | The alerts row is a link into Settings ▸ Notifications, not a toggle — do not make it operable as a control                                                        | canvas §4 Structure note            |
| ACC-19 | `nfLocked` must be `(state: PlanStateLike) => !canUseFeature(state, 'following')` — never the prototype's tier-string test                                          | eng spec §5.2                       |
| ACC-20 | The picker's search escape is ≥44px                                                                                                                               | `nf-cold-start.jsx:100`             |
| ACC-21 | Focus must survive an unfollow (the row does not unmount) and a tab switch                                                                                        | derived from `ACC-14`               |

---

## P6.6 — Responsive

| ID    | Rule                                                                                                                    | Value / source                                        |
| ----- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| RS-01 | 320px baseline artboard exists for this surface                                                                            | `mg-320`                                               |
| RS-02 | `narrow` shrinks row art 56 → 48px                                                                                         | `nf-following.jsx:169`                                 |
| RS-03 | `narrow` collapses the row follow button to `iconOnly` (which then requires `aria-label`)                                   | `nf-following.jsx:169`; `ACC-11`                       |
| RS-04 | `narrow` shrinks the find-row glyph square 56 → 48px                                                                        | `nf-following.jsx:189`                                 |
| RS-05 | `narrow` shrinks the empty headline 25 → 22px                                                                              | `nf-following.jsx:245`                                 |
| RS-06 | The narrow breakpoint value: spec says "under 360px"; reuse the shipped `SHELF_NARROW_QUERY = '(max-width: 359px)'`         | `following/definitions/constants.ts`                   |
| RS-07 | Picker grid is **2 columns from 320px through mobile**, explicitly never 1                                                  | `nf-cold-start.jsx:65`                                 |
| RS-08 | Picker grid is **5 columns** on desktop                                                                                     | `nf-desktop.jsx:258`                                   |
| RS-09 | Desktop list is a **3-column card grid**, not rows                                                                          | `nf-desktop.jsx:184`                                   |
| RS-10 | Desktop content is capped at 940px and centred                                                                             | `DK-01`                                                |
| RS-11 | Desktop moves Alerts and Find from stacked rows into the group-heading row as dense buttons                                  | `DK-03`/`DK-04`                                        |
| RS-12 | Desktop empty state is a distinct layout, not the mobile one scaled                                                         | `EM-09`                                                |
| RS-13 | Mobile/desktop parity is non-negotiable and ships in the same PR                                                            | project convention                                     |

---

## P6.7 — Not in the plan's scope

Drawn by the designer, or required by shipped reality, and **not named by PR 6 Steps 1–6**. These are decisions to make, not silent additions.

| ID     | Missing thing                                                                                                                                                                                                              | Where it is drawn                             | Why it matters                                                                                                       |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| OOS-01 | **The entire desktop surface.** `MyShowsArtistsDesktop` — 940px container, `h1`, 3-column card grids, header-level Alerts + Find buttons, its own empty state, its own tab-strip metrics. The plan's six steps describe mobile only. | `nf-desktop.jsx:184`, `mg-desk`, `mg-desk-empty` | Mobile/desktop parity is non-negotiable and must ship in the same PR, so this is real work the estimate does not contain. |
| OOS-02 | **The Spotify-source variants.** `MyShowsArtistsSpotifyFresh` (sync header card with count + "synced N ago · N playing Denver" + chevron), the per-row `SourceMark`, and the "won't touch your Spotify library" footnote card.        | `nf-following.jsx:272` + `:203`; `mg-spotify`, `mg-mixed` | Three artboards and two of the six mobile blocks. `hasSpotifyFollows` already ships, so the data is there and the UI is not. |
| OOS-03 | **`MyShowsTabs` is not a tab strip.** It is a `<nav>` of `<Link>`s with `aria-current="page"` and an explicit code comment rejecting `role="tab"` ("there is no panel to associate and no in-place switching"), styled as a segmented pill at 12.5px with no count. | `MyShowsTabs.tsx`                             | Step 1 says "add `'artists'` to the `TABS` const" plus "a real tablist" — those are incompatible; it is a rewrite, and it changes Watching and Concerts too. |
| OOS-04 | **The route.** `(protected)/(main)/` has no artists index; `artists/` holds only `[slug]`. A new route, its metadata, and its data fetch are unnamed.                                                                                | `apps/web/src/app/(protected)/(main)/`        | Nothing renders without it.                                                                                            |
| OOS-05 | **Sorting is server-mismatched.** `GET /v1/me/artist-follows` orders `desc(createdAt), asc(artistName)` — newest-followed-first. The design needs soonest-date-first then alphabetical, in two groups.                                | `apps/api/src/routes/artist-follows.ts`       | A client-side regroup/sort layer nobody costed, plus a decision about whether to change the endpoint.                    |
| OOS-06 | **No loading, error, or commit-failure states are drawn** for the list or the picker. `seedFollowedArtists` distinguishes UNKNOWN (`undefined`) from zero (`[]`), which means a skeleton is required to avoid flashing the empty state. | —                                             | The empty state is prominent and wrong-looking if it flashes.                                                           |
| OOS-07 | **The locked variant of the empty state.** The primary CTA swaps to "See who's playing Denver" when `nfLocked`. Step 6 says only "per the handoff's `MyShowsArtistsEmpty`".                                                             | `nf-following.jsx:245`                        | It is the only entitlement branch in the empty state and it is easy to miss.                                            |
| OOS-08 | **The app-bar bell action.** A 40×40 circle beside the title in `MyShowsArtists`.                                                                                                                                                      | `nf-following.jsx:203`                        | Overlaps the shipped notifications bell; needs a keep/drop call.                                                        |
| OOS-09 | **The 320px variants** — art 48px, icon-only follow, 48px find-row glyph, 22px headline — and the breakpoint value to drive them.                                                                                                       | `mg-320`; `RS-02`…`RS-06`                     | Icon-only introduces an `aria-label` requirement that only exists at that width.                                        |
| OOS-10 | **Theme artboards.** Light and Jade variants of this surface, including the AA constraint on picker selection.                                                                                                                          | `du-light`, `du-jade-empty`                   | Selection using colour alone fails Light; the three-signal rule exists because of it.                                   |
| OOS-11 | **Slug-less and art-failure rows.** Hidden projections have `slug === null`; shipped `ShelfCard` renders those unlinked and badge-less, and falls back to `IdentityArt` on image error. Neither is drawn for `ArtistManageRow`.           | shipped `ShelfCard.tsx`                       | Real data produces both.                                                                                               |
| OOS-12 | **`BulkFollowSheet` is a different component from the picker** — a 72%-height sheet with a 44px-art **list** and 24px check boxes, not a grid. Step 5 implies one picker; the handoff draws two anatomies.                                | `nf-cold-start.jsx:350`                       | Building one and reusing it for the other silently changes a drawn design.                                             |

---

## P6.8 — Ambiguities and contradictions

| ID     | Question                                     | Reading A                                                                                              | Reading B                                                                                                              |
| ------ | -------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| AMB-01 | Tablist or links?                            | Convert `MyShowsTabs` to a real `role="tablist"` with panels and arrow-key nav, as the plan, spec §7.5 and the README a11y note all say. Requires in-place switching or `aria-controls` against routed panels. | Keep link navigation and `aria-current="page"` (the shipped comment's reasoning: there is no panel), and satisfy only the "count inside the accessible name" half. |
| AMB-02 | Tab 2's label                                | The plan and every prototype say `History`.                                                              | Shipped copy and the locked vocabulary say `Concerts`; `history` is the identifier only. **B is correct** — but it means the drawn strip never existed. |
| AMB-03 | Group headings                               | Prototype renders `Mono` **divs**.                                                                       | The a11y note and plan Step 2 require `h2`. **B wins**; style the `h2` with the `Mono` metrics.                            |
| AMB-04 | Zero-count tab name                          | Render "Artists, 0".                                                                                     | Omit the count entirely when zero, matching the prototype's active-only count rule.                                        |
| AMB-05 | Does a picker ship at all?                   | Plan Step 5 and eng spec §9.x: build a standalone picker component here, reused by onboarding step 7.     | This table's **Ambiguity 3 above is marked RESOLVED**: `FindArtistsRow` routes to `/search`, "No picker route and no picker sheet ship in this epic." These cannot both hold. |
| AMB-06 | Which picker anatomy?                        | The onboarding grid (`ArtistPick` + `PickGrid`, 2-up mobile / 5-up desktop).                             | The `BulkFollowSheet` list (44px art, 24px check box). No standalone My-shows picker surface is drawn anywhere.             |
| AMB-07 | Headings when only one group has members     | Always render both headings, with a zero count.                                                          | Render a heading only when its group is non-empty. Nothing is drawn for the single-group case.                              |
| AMB-08 | Slug-less rows                               | Render the name unlinked with no follow control, mirroring shipped `ShelfCard`.                          | Render the control anyway and no-op. **A** matches shipped behaviour but is undrawn here.                                   |
| AMB-09 | Alerts meta content                          | Derive verbatim from live notification settings ("Push on · weekly digest on").                          | Show a static summary. The canvas note says it carries "its current state", implying A, but no zero/off string is drawn.     |
| AMB-10 | Unfollow persistence within the session      | Row stays until navigation (canvas §4).                                                                  | Row also stays across a tab switch back and forth. Undefined.                                                                |
| AMB-11 | Where the count comes from                   | Length of the fetched follows list.                                                                      | A server-provided count. Matters for the tab label while the list is still loading (`SCV-02`).                               |
| AMB-12 | `--accent` in the empty-state eyebrow        | Keep it: it is drawn twice (mobile + desktop) as `var(--accent)`.                                        | Change it: `--accent` is reserved for Watching and brand, and Following must never borrow it. Needs an explicit call.        |
