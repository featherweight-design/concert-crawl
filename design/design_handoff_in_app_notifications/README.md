# #737 · In-App Notification Surface — design handoff

**Track 2 · R2 · July 25, 2026**

> **R2 changelog.** Rekeyed to the real eight dot-namespaced categories (the
> brief's Q2 four-key list matched zero production rows); replaced
> one-ink-per-category with **ink = valence, glyph = event**; designed
> `contest.needs_info`; un-collapsed `watch.*`; rebuilt fixtures at production
> title length and **rebuilt the row layout around them** (timestamp off the
> title baseline, 2-line clamps, 64px as a floor); renamed the item field
> `type` → `category` and added `actionUrl`; externalized the last four inline
> strings; 44px on every control; `--shadow` token; dropped the `aria-modal`
> assertion. Gaps renumbered 1–11, two closed.

The consumer bell, panel, and per-item surface for `user_notification` rows
already being written by PWA push infra (#1060), admin contest review (#697),
and Spotify sync (#763). Poll-on-mount, free tier, signed-in only.

Open: `In-App Notifications.html`

---

## DNA statement

Built on the Concert Crawl consumer design system. **Structural rhythm** lifted
from `who_else_is_watching` (Section-organized canvas, Live-preview §0,
Tweaks-driven states, theme-parity closer, a11y section). **Shell split**
(sheet on mobile / anchored card on desktop) reuses the pattern already shipped
in `user_menu` — same two-shell/one-body shape, so the panel and the menu can
sit under the same affordance without fighting. **Skeleton language** is the
horizontal sweep set by `discovery_loading` (#1067) so Browse-adjacent loading
reads as one system. **Voice** is the Sour Patch bar. **Tokens only**
(`var(--*)`) across Electric · Jade · Light. `CCMark` copied verbatim per
CLAUDE.md.

Two principles bind the decisions:

1. **Earn the tap.** A pip that only says *"something happened"* spends the
   user's attention without paying it back. Every affordance in this handoff is
   graded on how much of *what you missed* it delivers per tap.
2. **Don't publish a number we can't stand behind.** Poll-on-mount means any
   count is stale the instant it renders. Counts appear only where they were
   just fetched; the persistent signal is a dot.

---

## Placement — the recommendation

**Hard constraint: no new persistent nav slots.** Header (lockup · search ·
PWA install slot) and bottom nav (browse · search · saved · me) are full.

All three options hang the signal on **the profile affordance that already
exists** — the `me` bottom-nav tab on mobile, the top-right avatar on desktop.
Nothing is added to either bar; the install slot and offline pill are untouched.
They differ only in what the first tap buys.

| | Option | First tap gets you | Verdict |
|---|---|---|---|
| A | **Nested row** (Hugh's shape) — pip on profile → menu → "Notifications" row → panel | a *label* | Works. Underpays. |
| B | **Inbox strip ★** — pip on profile → menu **leads** with the newest 2 unread inline + "See all N" → panel | the *content* | **Recommended** |
| C | **Profile segment** — pip on profile → profile page gains an "Alerts" segment | a page change | Cheapest build, worst discoverability |

**Why B.** A and B cost the identical number of taps to reach the full panel,
and both live entirely inside the existing profile menu — so B is not a bigger
ask on the constraint. The difference is what happens *in between*: A spends the
first tap rendering the word "Notifications", B spends it rendering *"Geese
dropped to $28."* For a poll-on-mount surface whose whole job is catch-up, that
is the entire value proposition arriving one tap earlier.

B is also a **strict superset of A**: with zero unread, `InboxStrip` collapses
to exactly A's row (bell glyph, "Notifications", "All caught up."). There is no
state where B is worse. If eng wants to ship A first, B is the same component
with the preview branch enabled — not a re-mock.

C is mocked honestly (it's a real option, and it's the least code) but it
demotes a catch-up signal to a destination inside a destination.

### Desktop: the panel nests in the menu that already exists

Desktop already ships a user menu on the avatar (identity · **You** / Submitted
prices · **App** / Theme · Settings · **Operations** / Admin · Sign out · build
footer with What's new). #737 does **not** add a second popover to the same
anchor. The notifications section slots in directly under the identity card;
"See all N" **swaps the menu body in place** behind a `‹ Menu` back row. One
anchor, one surface, one Esc. Everything below the strip is untouched.

### Knock-on: `me` has to become a menu on mobile

Today mobile's `me` tab routes straight to Settings. Nesting notifications
under the profile affordance means `me` must open a menu first, with Settings
as a row inside it. **This is real rework and it belongs in the eng estimate** —
it is not free.

The upside is a slot that didn't exist before, and **Submitted prices** is what
most needs it: it currently has no mobile screen of its own and is reachable
only by going through Settings. §9 mocks it — a proper list with blameless
statuses (Live · Pending · Updated) that doubles as the deep-link target for a
`contest_resolved` notification. **Watching is deliberately NOT in this menu:**
it already owns a bottom-nav tab.

> **Vocabulary correction.** Earlier drafts labelled bottom-nav tab 3 "saved."
> There is no Saved concept in this product — **Watching** is the only tracking
> concept, on both mobile and desktop. Corrected throughout, and landed as a
> vocabulary table in this **project's** `CLAUDE.md` (Watching / Submitted
> prices / Price check). That file is the design-project memory, not the repo's
> — if `docs/` should carry the same guidance, that mirror still needs doing.

**Divergence from the admin bell.** The admin precedent is a literal bell icon
in its own toolbar slot — correct there, unavailable here. The consumer surface
**diverges**: no bell icon in the chrome at all, the profile affordance carries
the pip. The bell glyph survives only *inside* the menu and the empty state,
where it's a label rather than a nav item.

---

## Design calls made (brief §8)

| Call | Decision | Rationale |
|---|---|---|
| **Bell + pip placement** | Pip on the existing profile affordance (`me` tab / avatar). No bell in the chrome. | The only fence-legal spot that's already a "you"-scoped affordance. A bell in the header would be a new persistent slot by any honest reading. |
| **Count or dot** | **Dot.** 8px `--signal`, 2px ring in the host bar's own background. | Poll-on-mount makes any persistent number stale on arrival, and a two-digit badge swamps a 34px avatar at 320px. The count still appears — in the strip and panel header, where it's fresh because you just fetched it. |
| **Panel anatomy** | Mobile **bottom sheet** (88% height, drag handle, `aria-modal`); desktop **nested inside the existing user menu**, swapping in place behind a back row. No full-page route. | One `<NotifBody/>`, two shells. A backfill scroll needs height, not a route. Nesting on desktop avoids two popovers fighting over one avatar — see gap 1, now closed. |
| **Per-item layout** | 28px category tile · title (700/600) · relative mono timestamp right-aligned · body clamped to 2 lines · category eyebrow + unread dot. 64px min height. | One scan line (who/what), one detail line (why it matters), one metadata line. Timestamp goes on the title row because "is this stale?" is part of the first scan, not the second. |
| **Category set** | **The real eight**, dot-namespaced, keyed to the Zod union: `watch.cancelled` · `watch.postponed` · `watch.soldout` · `watch.backonsale` · `watch.pricedrop` · `contest.resolved` · `contest.needs_info` · `spotify.new_show`. | The brief's Q2 named four underscore keys that overlap the production set by **zero**, so R1's map matched nothing and every real row fell to the fallback. Mechanical fix, but it invalidated the differentiation work built on top of it. |
| **Ink = valence, glyph = event** | `--danger` cancelled · `--warning` moved / sold out · `--success` back on sale / price drop · `--fg-muted` neutral verdict · `--signal` you owe a reply · `--accent` discovery. | One-ink-per-category was fine at four and breaks at eight — you run out of distinguishable tokens and color stops carrying information. Splitting the two jobs scales *and* says more: the glyph tells you which event, the ink tells you whether to wince. |
| **`watch.*` stays split, not collapsed** | Five separate entries, three different inks. | R1 collapsed four sub-types into one "Watching" class, which put `cancelled` and `backonsale` — opposite news — in the same gray. That was an artifact of the brief's vocabulary, not a decision. Under the valence system the split is free: same glyph family, ink does the work. |
| **`contest.needs_info` takes `--signal`** | Neutral `--fg-muted` for `contest.resolved`; `--signal` + a question glyph for `contest.needs_info`. Label "Needs you". | Phase 8.5's neutrality lock governs **verdicts** — don't frame a resolved dispute as a callout. `needs_info` isn't a verdict; it's the admin asking you for detail, i.e. an outstanding task. Tasks take the CTA color. Same family, same glyph language, different job. |
| **Row layout at real title length** | Timestamp moves **off** the title baseline to the metadata row; title clamps at 2 lines, body at 2; 64px becomes a floor, rows run ~92–116px. | Production titles are ~35–80 chars, not the ~21 R1 invented. A right-aligned timestamp costs the title ~30% of its width, which at 320px is the difference between two lines and four. Moving it down costs nothing — the metadata row was half empty. |
| **Category extensibility (Q2)** | `CATEGORY_MAP` keyed to the real Zod union, with a neutral `CATEGORY_FALLBACK` for unknown values. Item field is `category`, not `type`. | A new category is one entry. An unrecognized value renders as a neutral bell row rather than a blank tile. `type` was renamed because the DB already uses it for a different enum (`admin_alert \| user_notification`) and the collision would mislead whoever implements this. Rows also now carry `actionUrl` — whole-row-clickable was locked in R1 but the target was never modeled. |
| **Unread vs read** | Four simultaneous signals: 2px left rail in the category ink · `--surface-1` fill · title 700 at `--fg` · trailing dot. Read: transparent, no rail, 600 at `--fg-muted`, tile at 55%. Row *text* is never tinted — see A11y. | Redundant by design — none of it is color-only, and it survives both themes and a greyscale print. Hierarchy is carried by the title weight and the rail/fill rather than by dimming body text, which keeps read rows legible instead of merely faint. |
| **Action affordance** | **Whole row.** Single `role="button"`, no nested interactives. Chevron appears on hover/focus only. | Nested buttons inside a clickable row are the classic a11y trap and the classic fat-finger trap. A permanent chevron on every row adds noise to a scanning list; on hover/focus it's a cue, not decoration. |
| **Empty state** | "All quiet." / "Nothing's dropped, moved, or sold out on you yet. We'll make noise when it does." + `Find something to watch`. | Sour Patch: the head has cheek, the body is literally an honest list of the three things that trigger a notification, the CTA is the actual fix. |
| **Loading** | 3 skeleton rows box-identical to the real row, horizontal sweep (the `discovery_loading` language), `role=status` + `aria-busy` + hidden "Checking what you missed…", `prefers-reduced-motion` → static fill. | The panel is a fixed-width column; matching the box means the poll landing never reflows the list under a reading eye. |
| **Backfill** | Chronological, sticky day dividers (Today · Yesterday · `Sat Jul 19`), page size 20, "Older notifications" button, no virtualization. Honest end-of-list line. | Unread floats to the top naturally because it's newest — a separate "Unread" section would re-sort the timeline and break the "what happened while I was gone" mental model. At medium depth a load-more button beats infinite scroll inside a sheet (no scroll-position trap). |
| **Mark-read (Q3)** | Panel-open clears the pip via `last_seen_at`; per-item read fires on row activation. Pip and rails **disagree on purpose**. | The bell stops shouting the moment you look; the rails keep answering "which of these have I actually dealt with" on the second visit. |

---

## Voice pass — what this handoff actually owns

**Chrome only.** `NOTIF_COPY` (in `notifications-data.jsx`) holds the panel's
own strings, keyed for lift into
`apps/web/src/components/consumer/definitions/copy.ts`. Per-row `title` /
`body` are written by the **backend writers** and are not Design's to set here
— see gap 3.

- **Panel** — `What you missed` · `3 new` · `Mark all read` · `All caught up.`
- **Empty** — `All quiet.` / `Nothing's dropped, moved, or sold out on you yet. We'll make noise when it does.` / `Find something to watch`
- **End of list** — `That's everything. Denver's been calm.`
- **Error** — `Couldn't reach the crawl.` / `Poll failed. Nothing's lost — it's all still on the server.` / `Retry`
- **Loading** — `Checking what you missed…`
- **Also externalized in R2** — `menuBack`, `closeLabel`, `segments.*`,
  `errorBody`. No customer-facing string is inlined in a component any more.

Grep-clean of "last chance", "we miss you", "fraud", "users", and "event".

**Copy keys:** `bellLabel(n)`, `pipLabel`, `panelTitle`, `panelSub(n)`,
`markAll`, `markedAll`, `seeAll(n)`, `menuRow`, `menuBack`, `closeLabel`,
`loadMore`, `loading`, `slowRetry`, `error`, `errorBody`, `errorAction`,
`emptyTitle`, `emptyBody`, `emptyHint`, `emptyAction`, `endOfList`, `today`,
`yesterday`, `unreadTag`, `segments`.

---

## Template inventory

| Surface | State | Mobile | Desktop |
|---|---|---|---|
| Placement A / B / C | 3 unread | 390 | live §0 |
| Panel | ready · loading · empty · poll-failed | 390 + 320 | 1040 |
| Panel | backfill (deep, day dividers, load more) | 390 | 1040 |
| Panel | all read (header flips, rails drop) | isolated | — |
| Item | 8 categories · unread + read · tiles · 320px stress | isolated + 320 | — |
| Mark-read | pip up → panel open → row read | 3 boards | — |
| Theme parity | Electric · Jade · Light + Light desktop + Jade strip | ✓ | ✓ |
| A11y | accessible names · focus + hit targets | ✓ | — |
| `me` menu | new sheet · menu→panel in place | 390 | live §0 |
| Submitted prices | populated · empty | 390 | — |
| Bottom nav | corrected labels (browse · search · watching · me) | ✓ | — |

Canvas §0 is Tweaks-driven: feed contents ×5 · fetch state ×3 · placement ×3 ·
open layer ×3 · pip pulse · theme ×3.

---

## A11y (WCAG)

- **Level A — text alternative.** The profile affordance's accessible name
  carries the whole signal: `"Notifications, 3 unread"` / `"Notifications"`.
  The pip is `aria-hidden`; it is never the only announcement. The `me` tab's
  label extends to `"me. You've got unread notifications"`.
- **Level AA — contrast.** Pip is `--signal` with a 2px ring in the host bar's
  own background (holds separation on all three themes).
  **No text renders in `--fg-subtle` or in a category ink.** Both are 3:1-class
  tokens: correct for graphics, short of the 4.5:1 small-text threshold at the
  9.5px mono / 12.5px body sizes this panel uses. So category color lives
  entirely on non-text elements — the tile glyph, the 2px left rail, and the
  unread dot, all of which only need 3:1 — while every word in the row
  (timestamp, category eyebrow, body, dividers, footer) is `--fg-muted` or
  `--fg`. Verified in §7.
  *Known inherited exception:* the `me` tab's own inactive label is 9px
  `--fg-subtle` in the shipped `TabBarCC` — pre-existing, not restyled here,
  and worth its own ticket.
- **1.4.1 — not color alone.** Unread carries rail + fill + weight + dot;
  category carries glyph + mono label. Moving the eyebrow to `--fg-muted`
  costs nothing here — the category was always spelled out in words, which is
  what satisfies 1.4.1; the ink was only ever reinforcement.
- **Keyboard.** Trigger is a real `<button aria-haspopup="dialog">`; panel is
  `role="dialog"`; rows are `tabIndex=0` with Enter/Space activation and a
  `--focus` ring inset 2px.
  **`aria-modal` was removed in R2.** It asserts a focus trap, and asserting a
  trap that doesn't exist is worse than omitting the attribute. Esc handling,
  focus return, and the trap itself are eng-owned at build — they change no
  visual decision and are recorded as eng-plan notes, not design gaps.
- **Targets.** Rows have a 64px floor. Every interactive element clears the
  **AA floor (2.5.8, 24×24)** with margin. Raised to the 44px AAA target where
  a mis-tap is expensive or the control is thumb-reachable: notification rows,
  the panel close button, all menu rows, the `‹ Menu` back row, the bottom-nav
  tabs, and the install slot. Deliberately *not* raised: inline text buttons
  inside an already-large surface — "Mark all read" (31px), "See all N" (38),
  "Older notifications" (36), "Retry" (34), the empty-state CTA (36), and the
  profile segment chips (34). These sit in a panel you have already
  successfully hit, and padding them to 44 costs vertical room the list needs
  more. Flag if you'd rather trade the rows for the chrome.
- **No nested interactives** inside a row.
- **Live regions.** Loading is `role="status"` + `aria-busy`; poll failure is
  `role="alert"`.

---

## Files

| File | Role |
|---|---|
| `In-App Notifications.html` | canvas + Tweaks (entry point) |
| `notifications-data.jsx` | `CATEGORY_MAP`, `NOTIF_COPY`, fixtures, glyph set, time/grouping helpers, `itemLabel`, `CCMark` (verbatim copy) |
| `notifications-panel.jsx` | `NotifItem` · `NotifTile` · `NotifDayDivider` · `NotifLoading` · `NotifEmpty` · `NotifError` · `NotifHeader` · `NotifBody` · `NotifDropdown` · `NotifSheet` |
| `notifications-chrome.jsx` | `NotifPip` · `NotifAvatarButton` · `CCAppBar` · `CCTabBar` · `InstallSlotCC` · `OfflinePillCC` · `InboxStrip` · `MenuNotifRow` · `CCUserMenu` · `ProfileSegments` · `DesktopHeader` |
| `notifications-scenes.jsx` | in-situ scaffolding (browse-behind, phone/desktop compositions) — context only, not a spec for Browse |
| `submissions-screen.jsx` | `SubmissionsScreen` · `SubmissionCard` · `SubStatusPill` — the new mobile Submitted prices surface (§9) |
| `design-canvas.jsx` · `theme-context.jsx` · `ios-frame.jsx` · `tweaks-panel.jsx` | shared infra (copied; `theme-context` gained `--shadow` / `--shadow-soft` in R2) |

**Chrome provenance.** Every bar in this handoff is a lift, not a redraw:
`CCAppBar` / `CCTabBar` from `browse-home.jsx` (`AppBar` / `TabBarCC`),
`DesktopHeader` from `browse-desktop.jsx` (`TopNavBD` — 64px, `--bg-elevated`,
pill nav, 280px ⌘K field, 36px account disc), `InstallSlotCC` / `OfflinePillCC`
from `design_handoff_pwa_cluster` (`InstallSlot` / `OfflinePill`),
`CCUserMenu` from the shipped consumer `UserMenu`, and
`NotifAvatarButton variant="halo"` from `user-menu.jsx` (`UMAvatar`). §1's
desktop board shows the trailing group in all three of its real configurations
(install + pip · offline + pip · neither) so the fit inside the crowding is
demonstrated, not asserted. The only thing #737 adds to either bar is the pip.

Each authored file is under ~350 lines for Copilot reviewability.

---

## Sequencing / dependencies

- **Endpoints** are as scoped in the ticket. The panel reads
  `GET /v1/notifications/me` paginated at **20**; row activation fires
  `POST /v1/notifications/:id/read`; the header button fires
  `POST /v1/notifications/read-all`. Panel-open fires the `last_seen_at` write —
  design recommends the **user-table field**, since the pip is derived state
  (`unread newer than last_seen_at`) and a field keeps that a single read.
- **Unblocks** `spotify_sync`'s in-app tray (its `InAppReceipt` mock in
  `design_handoff_spotify_sync/push-alert.jsx` was drawn against a hypothetical
  panel — it should be retired in favor of `NotifItem` once this lands).
- **#1150** (preferences) extends `NotificationsSection`, not this surface. No
  hooks are reserved here beyond the menu row already pointing at Settings.
- **`lastAdminActionAt` pill** is untouched (Q4).

---

## Gap report

1. **~~Two "notification" affordances under one avatar~~ — CLOSED (R2).**
   Resolved against the shipped desktop menu: the panel nests *inside* it and
   swaps the body in place behind a `‹ Menu` row. One anchor, one surface.
2. **~~`contest.resolved` audience~~ — ANSWERED (R2).** A resolved dispute
   writes to **both** parties, parent and challenger, deduped when they're the
   same user. One dispute produces two rows. The per-role copy branch is
   therefore the right design — but see gap 3, it isn't real yet.
3. **Row copy stays as shipped — resolved, no writer ticket.** Per-row `title` /
   `body` are written by the backend writers, not by the panel — `NOTIF_COPY`
   correctly owns only the chrome. `contest.*` emits one role-neutral title per
   action (`Your price submission was reviewed.` / `More info requested on your
   price submission.`) with the admin's free-text reason as the body; role lives
   only in metadata, only on the defer path. Reviewed 2026-07-25: the neutral
   titles already satisfy the Phase 8.5 "price update, not a callout" lock, so
   R1's per-role variants were **dropped** rather than chased into a writer
   change. R2 fixtures now carry the shipped strings verbatim.
4. **Fixtures are modeled, not lifted.** I could not read
   `packages/push/src/definitions/copy.ts` from this environment. The
   `watch.backonsale` and `contest.resolved` titles are the verbatim strings
   quoted in the R2 brief; the rest are modeled at the same length and shape.
   **Layout conclusions hold** (they're driven by character count, and I sized
   for 35–80 with a 2-line clamp), but the strings themselves should be
   swapped for the real templates before this ships.
5. **`me`-becomes-a-menu is smaller than R1 claimed — downgraded.**
   `UserMenuSheet` already exists and is already rendered behind a
   `max-width:639px` check; it's unreachable only because `UserMenu` mounts in
   one desktop-only place. The work is **mounting an existing sheet and
   deciding what `/me` routes to**, not building a mobile menu. Still a
   decision to make, no longer a build.
6. **Submitted prices screen is scope added on request.** Mocked in §9 with
   three statuses and an empty state, but it is not in #737's ticket — it
   probably wants its own issue that this handoff satisfies the design for. I
   kept the shipped label `Submitted prices` rather than renaming to
   "Submissions"; say the word if you'd rather switch.
7. **Page size 20 no longer means what it did.** R1 sized it as "about 2.5
   screens on a 390 phone" against short rows. With production titles rows run
   ~92–116px, so 20 rows is roughly **1.6 screens per page** and the day
   dividers sit further apart. Either accept the longer scroll, or drop to
   ~12–15. It's one constant — flag your preference.
8. **Timestamp granularity.** Relative under 7 days (`2h`, `3d`), absolute
   after (`Jul 18`); screen readers get the long form. Confirm the 7-day
   cutover against the retention policy once eng locks it — at 30-day
   retention the panel is mostly absolute dates and the dividers carry more.
9. **No corroborator notification.** Fans who *confirmed* a price that later
   moved get nothing. Arguably they should — they vouched for a number that
   changed. Out of scope here, and it'd be a ninth category rather than a
   variant, so it needs a Zod-union change too.
10. **No "unread only" filter.** Deliberately omitted — at this volume it
    costs more chrome than it saves scrolling. The header has room for one
    chip if beta feedback disagrees.
11. **`spotify.new_show` glyph** is a signal-arc mark, *not* the Spotify logo.
    We have no licensed logo assets in-app and brand-mark usage inside a
    notification list is a compliance question, not a design one.

**Also worth knowing:** grouping starts at "Today" only when there *is* a
today row — a stale panel opens on `Thu Jul 20` rather than an empty header.
And a panel opened offline currently shows the poll-failed state; if you'd
rather show cached rows with a staleness note, that's a small addition.

---

## Eng-plan notes (recorded, not design gaps)

- Escape handling, focus return, and the focus trap for the mobile sheet.
- `onKeyDown` on the remaining `role="button"` rows outside `NotifItem`
  (`NotifItem` already handles Enter + Space).
- `last_seen_at` storage. R1 recommended a user-table field; there is no users
  table in this schema, so this is an eng lock, not a design call — the design
  only needs *some* single "panel last opened" timestamp to derive the pip.
