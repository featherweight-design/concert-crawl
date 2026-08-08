# Native Artist Following — Design Requirement Enumeration

**Purpose.** Every checkable design requirement for the native-following epic, derived from the merged handoff (`design/design_handoff_native_following/`) and the merged engineering spec (`docs/superpowers/specs/2026-08-08-native-following-eng-spec.md`, read from `origin/main`). A verification agent should be able to walk this table row by row against the implementation and mark each PASS/FAIL without re-reading the handoff.

**Authority order.** Spec § beats handoff prose beats prototype code. Where they disagree, the row states the spec's answer and the disagreement is recorded under _Contradictions with the spec_.

**Copy.** All strings in the handoff and prototypes are placeholder. Requirements below describe _what a string must do_, never its wording, except where the spec itself locks a value (token names, enum values, route paths, cron expressions, size constants).

**Not enumerated** (already shipped — do not build, do not "fix"):
`MiniPaywall` (does not exist; `TierPickerSheet` is the shipped paywall) · a Spotify logo on the event-row Following chip (the chip is already text-only) · a bottom-nav tab-3 rename (already reads "my shows") · an `unavailable` follow state (does not exist) · follower counts (cut from scope).

Sources abbreviated: `SPEC §x` = eng spec section; `README` = handoff README; `shared`/`cold`/`following`/`notify`/`desktop`/`canvas` = `nf-shared.jsx` / `nf-cold-start.jsx` / `nf-following.jsx` / `nf-notify.jsx` / `nf-desktop.jsx` / `nf-canvas.jsx`.

---

## A. Follow affordance (shared primitive — underpins every surface)

| ID    | Surface | Requirement                                                                                                                                                                                                                                                                    | Source                                                           |
| ----- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| FA-01 | Shared  | A single follow-button component is the only follow affordance in the codebase; artist page, search, bill block, shelf badge, nudge and My Shows all render it rather than hand-rolling a button.                                                                              | README §"Shipped components this touches"; shared:168            |
| FA-02 | Shared  | The component accepts exactly three visual states for a single artist: `idle`, `following`, `locked`. `pending` is accepted only for bulk commits (see FA-12).                                                                                                                 | SPEC §5.1                                                        |
| FA-03 | Shared  | `idle` renders a solid `--signal` fill with on-accent text; no border colour other than `--signal`.                                                                                                                                                                            | SPEC §5.1; shared:182                                            |
| FA-04 | Shared  | `following` renders `color-mix(in oklab, var(--signal) 14%, transparent)` fill, a 1px `--signal` border, `--signal` text, and a check glyph.                                                                                                                                   | SPEC §5.1; shared:183                                            |
| FA-05 | Shared  | `locked` renders transparent fill, a 1px `--border-strong` border, `--fg` text, plus a lock glyph — the shipped signed-out skin.                                                                                                                                               | SPEC §5.1; shared:184                                            |
| FA-06 | Shared  | `locked` renders at the **same size and with the same label** as `idle`; the lock glyph is the only added element and must not change the button's height or label string.                                                                                                     | SPEC §5.1                                                        |
| FA-07 | Shared  | No follow-button state ever sets the HTML `disabled` attribute or `aria-disabled`. Every state is focusable and activatable.                                                                                                                                                   | SPEC §5.1; following:64 (chip omits `aria-disabled` when locked) |
| FA-08 | Shared  | Tapping `locked` opens the paywall (`TierPickerSheet`); it never no-ops and never silently calls the follow API.                                                                                                                                                               | SPEC §5.1, §6.2                                                  |
| FA-09 | Shared  | A logged-out visitor keeps the shipped **idle** skin (`--signal` fill), pixel-identical to signed-in-and-not-following per #794 §3.10 — not the `locked` skin, which is a signed-in-only treatment. Tapping opens the tier picker (not a sign-in redirect that loses context). | SPEC §5.1, #794 §3.10                                            |
| FA-10 | Shared  | Tapping `following` unfollows immediately — same button, no confirmation dialog, no separate "unfollow" control anywhere.                                                                                                                                                      | SPEC §5.1; canvas (affordance note)                              |
| FA-11 | Shared  | `aria-pressed` reflects `state === 'following'` for `idle`/`following`, and is **omitted** (`undefined`) for `locked` and for logged-out.                                                                                                                                      | SPEC §5.1; shared:197                                            |
| FA-12 | Shared  | `pending` renders only during a bulk commit ("Follow all N", onboarding step-7 commit): idle skin at `opacity: 0.72`, with **no width change** between idle and pending.                                                                                                       | SPEC §5.1; shared:185                                            |
| FA-13 | Shared  | Single-artist follow/unfollow is optimistic: the state flips before the response, rolls back on failure, and the optimistic override is cleared when the server value changes — never on mutation success alone.                                                               | SPEC §5.1, §5.4                                                  |
| FA-14 | Shared  | A size constant object is exported from a definitions file with exactly `sm: 36`, `md: 44`, `full: 48` heights, used by every call site; no ad-hoc heights.                                                                                                                    | SPEC §5.3; shared:156                                            |
| FA-15 | Shared  | `sm` (36px) is only used where the button sits inside a row whose full height is itself an ≥44px tap target; standalone buttons use `md` or `full`.                                                                                                                            | canvas (A11Y note); SPEC §5.3                                    |
| FA-16 | Shared  | Icon-only rendering is permitted only in the narrow breakpoint the spec names (under 360px), and the icon-only button carries an `aria-label` naming the artist.                                                                                                               | SPEC §5.3; cold:240; canvas (A11Y note)                          |
| FA-17 | Shared  | When `locked`, the button carries `aria-describedby` pointing at a gate sentence explaining the tier requirement; the sentence is visually hidden via clip, never via the `hidden` attribute or `display:none`.                                                                | SPEC §5.1; shared:172, 199                                       |
| FA-18 | Shared  | The gate-sentence element id is derived from `React.useId()`, so multiple buttons on one bill produce unique ids.                                                                                                                                                              | shared:170-172                                                   |
| FA-19 | Shared  | The gate helper is `nfLocked(state: PlanStateLike): boolean => !canUseFeature(state, 'following')` — it takes the plan state (so `roleComped` and `'logged-out'` resolve correctly) and never enumerates tier strings.                                                         | SPEC §5.2                                                        |
| FA-20 | Shared  | Server 403s carrying `code === 'entitlement_required'` are caught at the mutation layer and open the paywall, so a stale client entitlement still gates correctly.                                                                                                             | SPEC §5.4; §1.2                                                  |
| FA-21 | Shared  | Button geometry: radius 10, Inter 800 weight, per-size horizontal padding and gap taken from the size constant, at every call site.                                                                                                                                            | shared:156, 176-196                                              |
| FA-22 | Shared  | Colour is token-only: `--signal` for CTA/status, `--accent` reserved for Watching. No follow affordance uses `--accent`; no inline hex outside the email template.                                                                                                             | SPEC §3; canvas                                                  |
| FA-23 | Shared  | The affordance renders correctly in all three themes (Electric, Jade, Light) with no theme-specific overrides.                                                                                                                                                                 | SPEC §3; README                                                  |

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
