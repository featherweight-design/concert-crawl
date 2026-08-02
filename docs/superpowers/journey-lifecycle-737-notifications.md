# Gate 5 — Journey lifecycle (#737 in-app notifications, PR-C)

Journey: **user receives a notification → opens the menu → reads it → acts on it.**

Run date: 2026-08-02. Same rig, auth and scratch DB as
`gate2-forced-states-737-notifications.md` (see that doc for how local Clerk auth was obtained —
the `E2E_AUDIT_*` creds are staging-only and do not work against the local dev instance).

Scripts: `apps/e2e/g737/gate5.mts`, `gate5b.mts`, `gate5c.mts`.
DB probe used throughout:

```bash
docker exec concert-crawl-db psql -U postgres -d cc_737_gate -qtA -c \
  "select count(*) from notifications where user_id='…' and read_at is null"
docker exec concert-crawl-db psql -U postgres -d cc_737_gate -qtA -c \
  "select notifications_seen_at from user_profiles where user_id='…'"
```

---

## Pass 1 — Forward

```
════ PASS 1: FORWARD ════
DB before: unread=4 seenAt=NO-ROW
pip visible before open: 1 | label: Account menu, 4 unread notifications
DB after panel open (mark-panel-seen): unread=4 seenAt=2026-08-02 08:22:24.510139+00
*** pip visible AFTER seen+close: 1 | label: Account menu, 4 unread notifications
```

The pip appears, the trigger's accessible name carries the count (a dot, never a numeral — the
`span.notif-pip` element has no text), the menu shows the newest 2 unread inline plus "See all 4",
and "See all" swaps the body in place behind a `‹ Menu` back row.

**❌ But `mark-panel-seen` did not clear the pip.** `notifications_seen_at` was written
(`NO-ROW` → `2026-08-02 08:22:24`) and the pip was still up afterwards. Root cause is not a race —
`seenAt` is never read on the client at all:

```
$ grep -rn 'seenAtOf' apps/web/src
apps/web/src/lib/queries/use-notifications.ts:114  (declaration)
apps/web/src/lib/queries/use-notifications.test.ts (tests only)
```

Zero production consumers. The pip is `unreadCount > 0`
(`UserMenu.tsx:186-187`, `BottomNav.tsx:279`), and `unreadCount` is raw
`read_at IS NULL` (`apps/api/src/routes/notifications.ts:229-234`), so the pip can only be
cleared by marking rows **read**, never by _seeing_ the panel. The whole seen/read two-level model
is written and never read.

Acting on a row works: clicking a row with an `action_url` navigates and closes the menu, and the
read **survives** the navigation even with the mark-read request held 3 s:

```
$ psql -c "select title, read_at is null as unread from notifications …"
King Gizzard is cancelled|f     <- marked read despite immediate client-side nav
Wednesday dropped to $28|t
```

## Pass 2 — Reverse

```
── REVERSE: undo affordances ──
undo/mark-unread buttons in panel: 3      <- all 3 are row aria-labels containing "Unread",
                                             not undo controls
re-clicking an already-read row: DB after re-click: unread=3   (no change)
```

There is **no undo**. Mark-read and mark-all-read are one-way; nothing restores an unread row.
The server side is deliberately idempotent
(`coalesce(read_at, now())`, `notifications.ts:305`), so a re-click is a safe no-op rather than a
re-stamp — good — but the user has no route back.

Cancelling mid-flow works: the `‹ Menu` back row returns to the account menu inside the **same**
dialog, and Escape closes the whole thing from either mode.

```
════ desktop back-row / keyboard ════
in panel mode. dialog aria-label: What you missed
focused element after swap: DIV[MENU / What you missed / 4 NEW …]
back row present: 1
after back -> body starts: BETA · FOUNDER | gate737+clerk_test@example.com | WHAT YOU MISSED
dialog still open (same anchor)? 1
focus after back: BODY[…]                      <- ❌ focus dropped to <body>
Escape from panel mode -> dialogs: 0
focus returned to: BUTTON[Account menu, 4 unread notifications]   <- ✔
```

Identical on mobile. Escape restores focus to the trigger correctly; the **back row does not** —
it drops focus to `<body>` while the dialog is still open.

Rollback on failure was forced with a 500 on `read-all`:

```
── ROLLBACK: mark-all fails 500 ──
before:                              MENU | What you missed | 4 NEW
immediately after click (optimistic): MENU | What you missed | ALL CAUGHT UP.
after 500 lands (should roll back):   MENU | What you missed | 4 NEW | Mark all read
any error toast/message shown to user? NO VISIBLE ERROR
DB: unread=4
```

The cache rollback is correct. **❌ Nothing tells the user it failed** — the count silently snaps
back from "All caught up." to "4 new" with no explanation
(`use-notifications.ts:228` — `onError` only calls `rollback`).

## Pass 3 — Repeat (do → undo → redo), and the watermark-key question

`Mark all read` disappears once the count hits zero, so it cannot be redone into a wrong state:

```
mark-all button still present (no-op redo)? 0
```

**Watermark key audit.** The seen marker is `user_profiles.notifications_seen_at` — a
**monotonic timestamp keyed by Clerk `user_id`**, advanced with
`greatest(notifications_seen_at, now())` (`notifications.ts:340`). It is _not_ keyed by any
notification id. That is exactly the shape that avoids the prior epic's bug (a nudge keyed by an
immortal id, so one dismissal silenced it forever): a new row simply has a later `created_at` than
the watermark, and deleting every notification does not strand the marker. Verified:

```
════ PASS 3: REPEAT — new notification arrives after watermark ════
(insert one row with created_at = now(), after seenAt)
DB: unread=1 seenAt=2026-08-02 08:22:24…
*** pip after NEW notif post-watermark: 1 | label: Account menu, 1 unread notification
```

The pip does return for genuinely new news. The caveat is Pass 1's finding: it returns because the
row is _unread_, not because it post-dates the watermark — the watermark is inert either way.

## Pass 4 — Resume

```
── RESUME: reload mid-panel + second tab ──
dialog after reload: 0            (menu is chrome, not a route — correct)
tab2 pip: 1 | label: Account menu, 4 unread notifications
```

A second tab in the same session renders the identical pip and count. No divergence.

## Mutation feedback sub-check

Every mutation route was held for **3000 ms** via `ctx.route` before `continue()`, and the
non-navigating fixture rows (`action_url = NULL`) were used so the panel stayed open and the
state change was observable.

| Mutation        | Server held | Time to visible state change           | Verdict              |
| --------------- | ----------- | -------------------------------------- | -------------------- |
| mark one read   | 3000 ms     | **22 ms** (`4 NEW` → `3 NEW`)          | optimistic ✔         |
| mark all read   | 3000 ms     | **62 ms** (`4 NEW` → `ALL CAUGHT UP.`) | optimistic ✔         |
| mark-panel-seen | n/a         | no visible change by design            | n/a — but see Pass 1 |

```
── mutation feedback: MARK ONE READ (server held 3000ms) ──
optimistic header latency: 22ms
dialog still open? 1 | header now: MENU | What you missed | 3 NEW
DB: unread=3
── MARK ALL READ (server held 3000ms) ──
mark-all optimistic latency: 62ms
header now: MENU | What you missed | ALL CAUGHT UP.
DB: unread=0
```

Both mutations pass. Neither looks broken under a slow network.

---

## Verdict

| Pass              | Exercised | Result                                                                    |
| ----------------- | --------- | ------------------------------------------------------------------------- |
| Forward           | ✅        | ❌ pip does not clear on seen; rest correct                               |
| Reverse           | ✅        | ❌ silent rollback, ❌ focus dropped by back row; no-undo is by design    |
| Repeat            | ✅        | ✔ watermark is timestamp-keyed, not id-keyed — no immortal-key regression |
| Resume            | ✅        | ✔ reload and second tab both correct                                      |
| Mutation feedback | ✅        | ✔ 22 ms / 62 ms against a 3 s server                                      |

**Not exercised locally, hand to staging:** cross-_session_ resume (two different signed-in
sessions rather than two tabs of one), notifications produced by the real crawler/Spotify fan-out
rather than direct INSERT, and Safari/iOS behaviour.
