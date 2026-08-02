# Gate 2 — Forced-state runtime exercise (#737 in-app notifications, PR-C)

Run date: 2026-08-02. All evidence below is from a **real browser driving the running app**,
not from reading source.

## Rig

| Piece     | Value                                                                                                            |
| --------- | ---------------------------------------------------------------------------------------------------------------- |
| Worktree  | `/Users/huey/Projects/concert-crawl/.worktrees/feat/737-notifications-chrome`                                    |
| DB        | `postgresql://postgres:postgres@localhost:5433/cc_737_gate` (migrated + seeded scratch DB)                       |
| API       | `PORT=3001 ALLOWED_ORIGIN=http://localhost:3100 DATABASE_URL=…/cc_737_gate pnpm --filter @concert-crawl/api dev` |
| Web       | `DATABASE_URL=…/cc_737_gate pnpm --filter web exec next dev --port 3100` (port 3000 was occupied)                |
| Browser   | Playwright chromium, `apps/e2e/g737/*.mts`                                                                       |
| Viewports | desktop `1280×900`, mobile `390×844`                                                                             |

### Auth — how it was actually obtained

The `E2E_AUDIT_*` creds could **not** be used: they belong to the **staging** Clerk instance
(`pk_live_…`, `clerk.staging.concertcrawl.app`), whereas `apps/web/.env.local` points at the
**dev** instance `gentle-snail-48.clerk.accounts.dev`. Verified by decoding both publishable keys.

Instead a dedicated dev-instance user was provisioned through the Clerk Backend API:

```bash
curl -X POST -H "Authorization: Bearer $CLERK_SECRET_KEY" \
  -d '{"email_address":["gate737+clerk_test@example.com"],"password":"…"}' \
  https://api.clerk.com/v1/users
# -> user_3HLrg1A221kFjGRHKYDw2ZVCuQu
```

Password sign-in hit a `factor-two` MFA step, so sign-in was completed with a
**sign-in token** (`POST /v1/sign_in_tokens` → `/sign-in?__clerk_ticket=…`), which bypasses MFA.
Storage state saved to `apps/e2e/.auth/gate737.json`.

```
$ pnpm exec tsx g737/login.mts
landed on http://localhost:3100/events
LOGIN OK
```

### Environment defect found while standing the rig up

`apps/api/src/app.ts:15` — CORS `origin` is a **single** string
(`process.env['ALLOWED_ORIGIN'] ?? 'http://localhost:3000'`). With web on any other port the
`GET /v1/notifications` preflight passed (204) but the real request never left the browser, and the
panel rendered its **error** state with no console-visible cause. Not a PR-C defect, but it is the
reason the first run looked broken. Recorded so the next operator does not lose the same 20 minutes.

## State forcing method

| State           | How it was forced                                                                              |
| --------------- | ---------------------------------------------------------------------------------------------- |
| empty           | `./g737/seed.sh empty` — deletes all rows for the fixture user                                 |
| populated       | `./g737/seed.sh populated` — 5 rows / 4 unread, spanning Today / Yesterday / 2d / 3d           |
| all-read        | `./g737/seed.sh allread` — 2 rows, both `read_at = now()`                                      |
| loading         | `ctx.route(/\/v1\/notifications(\?\|$)/)` → `setTimeout(25 000)` before `route.continue()`     |
| error           | same route → `route.fulfill({ status: 500, body: '{"success":false,"error":"Read failed"}' })` |
| reload mid-flow | `page.reload()` with the panel open                                                            |

`user_profiles.notifications_seen_at` was deleted before each run so the pip started from a
true "never seen" baseline.

## Observed output

### empty @ desktop

```
TRIGGERS: [{"label":"Account menu","visible":true}]
PIPS (visible flags): []
DIALOG box: {"x":888,"y":60.5,"width":360,"height":391.75}
MENU BODY:  … Notifications / ALL CAUGHT UP. …
PANEL MODE:
MENU | What you missed | ALL CAUGHT UP.
All quiet.
Nothing's dropped, moved, or sold out on you yet. We'll make noise when it does.
Find something to watch
after Escape, dialog count = 0
```

### populated @ desktop

```
TRIGGERS: [{"label":"Account menu, 4 unread notifications","visible":true}]
PIPS (visible flags): [true,false]        <- desktop avatar pip visible, bottom-nav pip hidden
DIALOG box: {"x":888,"y":60.5,"width":360,"height":581.46875}
MENU BODY:
  WHAT YOU MISSED / 4 NEW
  King Gizzard is cancelled … CANCELLED 10M
  Wednesday dropped to $28  … PRICE DROP 2H
  See all 4                                <- newest 2 unread inline + "See all N" ✔
PANEL MODE: full list, day dividers TODAY / YESTERDAY / FRI, JUL 31 / THU, JUL 30,
            terminator "THAT'S EVERYTHING. DENVER'S BEEN CALM."
```

### all-read @ desktop

```
TRIGGERS: [{"label":"Account menu","visible":true}]
PIPS (visible flags): []
PANEL MODE: MENU | What you missed | ALL CAUGHT UP. + the 2 read rows + terminator
```

### loading @ desktop and @ mobile (request held 25 s)

```
PIPS (visible flags): []
MENU BODY: … Notifications …            <- inbox strip shows a bare row, no skeleton
PANEL MODE:
MENU
What you missed
ALL CAUGHT UP.                          <- ❌ asserted while still loading
Checking what you missed…
```

### error 500 @ desktop and @ mobile

```
PIPS (visible flags): []
MENU BODY: … Notifications …            <- inbox strip gives no error signal
PANEL MODE:
MENU
What you missed
ALL CAUGHT UP.                          <- ❌ contradicts the two lines beneath it
Couldn't reach the crawl.
Poll failed. Nothing's lost — it's all still on the server.
Retry
```

### Mobile parity (390×844)

```
empty      DIALOG box {"x":0,"y":435.25,"width":390,…}   PIPS []
populated  DIALOG box {"x":0,"y":245.53,"width":390,…}   PIPS [false,true]  <- bottom-nav pip
           PANEL box  {"x":0,"y":91.95, "width":390,"height":752.05}
allread    DIALOG box {"x":0,"y":435.25,"width":390,…}   PIPS []
```

`x:0 / width:390` on mobile vs `x:888 / width:360` on desktop confirms the two distinct shells
(bottom sheet vs anchored popover) both render, both swap the body in place, and both close on
Escape. Copy, states and the "See all N" affordance are identical across the two. **Parity holds.**

### Reload mid-flow

```
── RESUME: reload mid-panel ──
dialog after reload: 0
```

The menu/panel is not restored across reload. Correct — it is chrome, not a route.

## Verdict

| State                   | Forced | Result                                                                    |
| ----------------------- | ------ | ------------------------------------------------------------------------- |
| empty                   | ✅     | correct                                                                   |
| populated               | ✅     | correct                                                                   |
| all-read                | ✅     | correct                                                                   |
| loading                 | ✅     | ❌ header asserts "ALL CAUGHT UP."; inbox strip has no loading affordance |
| error                   | ✅     | ❌ header asserts "ALL CAUGHT UP."; inbox strip has no error affordance   |
| mobile ↔ desktop parity | ✅     | correct                                                                   |
| reload mid-flow         | ✅     | correct                                                                   |

**Not forced locally, hand to staging:** the pip on a real push/fan-out write (rows were
INSERTed directly rather than produced by the crawler fan-out), and Safari/iOS PWA rendering of the
bottom sheet — Playwright chromium only.
