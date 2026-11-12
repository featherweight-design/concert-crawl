# Concert Crawl extension for feature-acceptance

These add to the plugin's `feature-acceptance` skill and win where they conflict. The user is Hugh.

## The tools

concert-crawl uses the fwd kit's tools (kit 0.1.33), configured by the `featureAcceptance` block in `.claude/fwd.json`.
There is no project copy of the contact sheet: a feature adds an inventory, never a script.

```
node ~/.claude/fwd/skills/feature-acceptance/contact-sheet.mjs docs/superpowers/inventories/<file>.json
node ~/.claude/fwd/skills/feature-acceptance/check-shared.mjs  docs/superpowers/inventories/<file>.json
node ~/.claude/fwd/skills/feature-acceptance/check-tokens.mjs
```

- **Two targets.** `baseUrl` is `http://localhost:3000`: the **pre-PR sheet** runs against the lane's dev server
  (`pnpm dev`, allowed; it is not a build) with no flag. The **staging sheet** is the post-merge audit and the close-out
  walk: pass `--base https://staging.concertcrawl.app`. Merging to `main` deploys staging, so name the commit staging
  ran. Every `productionUrl` origin (`concertcrawl.app`, `www.concertcrawl.app`, `api.concertcrawl.app`) is refused,
  and `sign-in.mjs` refuses any host but staging over https and localhost or 127.0.0.1 over http.
- **The local stack.** The dev server signs in against the **Concert Crawl Staging** Clerk app's **development**
  instance, with the same `E2E_AUDIT_*` credentials as staging, and its database is the Neon `scratch-contact-sheet`
  branch, not the seeded Docker DB. Both are set in the operator's local env files; never read or print them.
- **Theme passes.** `featureAcceptance.themes` photographs every sheet three times, each in a fresh context:
  **Electric** (dark, the base), **Light**, and **Pulse** (the genre-theme pass). Each sets localStorage `cc-theme`
  before the page's scripts run, which the inline script in `app/layout.tsx` reads before paint, and the kit reads
  `<html data-theme>` back after every row, so a theme the page did not draw fails the cell. Files are
  `<row>-<width>-<theme>.png`. An inventory's own `themes` replaces the set (B16 and B18 do; see App-shell pitfalls).
- **Widths:** `xs` 320 (touch), `phone` 390 (touch), `sm` 640, `desktop` 1300. 320 is the mobile-first floor, so
  every sheet photographs it. 640 is Tailwind `sm`, the one shell breakpoint:
  below it AppHeader's mobile bar and BottomNav, from it the sticky TopNav and no BottomNav; filter chips open a
  bottom sheet below it and a popover from it. The B+ boards are drawn at 390 and 1300, and addendum 2 adds 320
  boards (`addendum-2/boards/15-320px/`). An inventory's own `widths` still replaces the set.
- **Inventories:** `docs/superpowers/inventories/`, one file per plan row of
  `docs/superpowers/plans/2026-11-11-bplus-redesign.md` (`bplus-<row>-<slug>.json`; a row with signed-out surfaces has a
  separate `…-signed-out.json`, since `signedOut` is per inventory). Each inventory's `note` names the handoff boards
  per row and the surfaces still walked by hand: those need state a sheet cannot set up (a filed report, an empty
  account, a throttled load, a real install prompt), not a missing verb. Ids that differ per account are `${CC_…}` environment variables (below).
- **Output:** `contact-sheets/<inventory>/` at the repo root, gitignored.
- **Token guard:** `tokens.declare` is `apps/web/src/app/globals.css`, `apps/web/src/theme/themes.ts` and
  `apps/web/src/app/layout.tsx` (next/font variables); `tokens.read` covers `apps/web/src/components/**` and
  `apps/web/src/app/**` (`.ts`, `.tsx`, `.css`); hex colours are reported in `apps/web/src/components/**`, not failed.
- **`packageDir`** is `["apps/e2e", "apps/web"]`: Playwright comes from `apps/e2e`, TypeScript (for check-shared)
  from `apps/web`.
- **Sameness checks are deferred.** No inventory declares `shares` yet, so check-shared does nothing and marker
  presence is only each row's `wait`. A feature PR that claims one component across routes adds its `shares` block
  (`binding` and `module`, plus a `view` per row) when it lands.

## Sign-in

- `featureAcceptance.signIn` is `apps/e2e/src/fwd/sign-in.mjs`, which reuses the house Clerk flow
  (`signInWithClerk`, `apps/e2e/src/fixtures/auth.ts`): `/sign-in`, email, password, then the `__session` cookie.
- The account is the staging audit user: `E2E_AUDIT_USER_EMAIL` and `E2E_AUDIT_USER_PASSWORD`, or
  `E2E_AUDIT_ADMIN_EMAIL` and `E2E_AUDIT_ADMIN_PASSWORD` with `CONTACT_SHEET_ROLE=admin`. **They live in the
  operator's shell profile, not in any `.env`**; grepping `.env.local` finds nothing. Reference them by name only;
  never read, print or paste their values.
- **Locally** the same credentials sign in to the Concert Crawl Staging Clerk app's development instance (the dev
  server's keys). Its session cookie is still `__session`, which is what the shared flow waits for, so `signIn`
  needs no local branch. The module keeps the kit's contract: it exports `signIn(page, { baseUrl })`, checks the host
  before the browser leaves `about:blank`, throws on failure and prints no credential.
- Staging is launch-gated (`NEXT_PUBLIC_PUBLIC_BROWSE` unset): signed out, `/events`, `/venues`, `/artists`,
  `/watching`, `/search` and `/e/[id]` redirect to `/sign-in`, and `/` is the invite landing. The kit fails a goto that
  redirects or returns 400+ unless the row says so: the signed-out rows that photograph the wall carry
  `"expectRedirect": "/sign-in"` (B8 and B17 signed out), and fail the day browse opens, which is the cue to turn them
  into the real public rows. A local dev server with public browse switched on fails them the same way.

## Environment

| Variable                                        | Use                                             |
| ----------------------------------------------- | ----------------------------------------------- |
| `CONTACT_SHEET_BASE`                            | Overrides `baseUrl` (kit); never production     |
| `E2E_AUDIT_USER_*`, `E2E_AUDIT_ADMIN_*`         | The sign-in account (names only)                |
| `CONTACT_SHEET_ROLE`                            | `admin` signs in as the admin audit user        |
| `CC_EVENT_ID`                                   | An upcoming event with prices                   |
| `CC_DISPUTED_EVENT_ID`, `CC_PENDING_EVENT_ID`   | A1: a disputed price; a pending price banner    |
| `CC_CANCELLED_EVENT_ID`                         | A2, A4: a cancelled show the audit user watches |
| `CC_POSTPONED_EVENT_ID`, `CC_SOLD_OUT_EVENT_ID` | A4, A3                                          |
| `CC_REMOVED_EVENT_ID`                           | A5: a show the stale sweep removed              |
| `CC_ARTIST_SLUG`                                | B10: an artist with upcoming shows              |
| `CC_CREW_ID`                                    | B14: a crew the audit user is in                |
| `CC_CREW_INVITE_TOKEN`                          | B14: a live invite token for that crew          |

The kit expands `${VAR}` in `goto`, `route`, `clickRole` names, `fill` text, `waitDialog` and cookie values, and fails
a row whose variable is unset. **It redacts every expanded value**, and every variable whose name marks a credential
(`TOKEN`, `INVITE`, `SECRET`, `PASSWORD`, …), from its console, failure notes and the sheet, so `CC_CREW_INVITE_TOKEN`
is usable again: B14's `invite` row opens `/crew/join/${CC_CREW_INVITE_TOKEN}`. Redaction covers text, not pixels: the
invite landing draws no token, but the crew home's invite sheet does, so no row opens it. Opening the landing does not
spend the invite (joining does), so the row is safe in a themed inventory. Never paste a real token into an inventory
or a PR body.

**Picking the ids.** Each is a row already on the target (staging holds prod content, synced weekly; locally, the
Neon `scratch-contact-sheet` branch). Pick each in the app as the audit user and copy it from the URL, so the account can see it:

- `CC_EVENT_ID`: open Browse, pick an upcoming show with a price, copy the id from `/events/<id>`.
- `CC_CANCELLED_EVENT_ID`, `CC_POSTPONED_EVENT_ID`, `CC_SOLD_OUT_EVENT_ID`: a show carrying that status chip in a
  Browse or venue row; for A2 and A4, press Watch on the cancelled one first.
- `CC_DISPUTED_EVENT_ID`, `CC_PENDING_EVENT_ID`: an event page showing the disputed card, or the pending price banner
  (the admin review queue, `/admin/review`, lists the disputed ones).
- `CC_REMOVED_EVENT_ID`: a show on the audit user's Watching list that the stale sweep marked no longer listed.
- `CC_ARTIST_SLUG`: open an artist from an event page, copy the slug from `/artists/<slug>`.
- `CC_CREW_ID`: open Crews as the audit user (start one by hand if there is none), copy the id from `/crews/<id>`.
- `CC_CREW_INVITE_TOKEN`: on that crew, open the invite sheet and copy the token from its `/crew/join/<token>` link.

Export them in the shell for the run. They are ids, not secrets, but they stay out of committed files.

## App-shell pitfalls

- **No reliable `<main>`.** Pages render their own `<main>` or none (Venues, the event page, Crews and mobile
  Settings have none), so `pageScope` is `""` and steps are unscoped. Pick selectors the shell cannot match: a
  `data-testid` (`event-row`, `hero-band`, `day-tile`, `venue-chip`), the page's `h1` (the shell has none), or an
  accessible dialog name. The shell carries a `Search` button, an `Account menu…` button and the bottom nav
  (`nav[aria-label="Main navigation"]`), so `button`-by-role queries need a name.
- **Pages render their own `<header>`** (desktop Settings, the invite landing), so `header` is not the shell either.
  The shell's search button is `header button[aria-label="Search"]:visible`; the palette it opens has no dialog role,
  so wait on its input, `input[placeholder="Search artists or venues…"]`.
- **Mocks.** The kit blocks service workers in every context, so a `route` mock fires. Mock only what the browser
  fetches (server components fetch on the server, out of reach), and only failures: the API is another origin and
  the kit sends no CORS headers, so a mocked success may be refused by the browser. B19's `notifications-error` row is
  the pattern. Any project Playwright script outside the kit that mocks still sets `serviceWorkers: 'block'`.
- **Dialogs.** `waitDialog` is a regex on the accessible name: anchor exact names (`^Account$`, `^Where filter$`,
  `^What you missed$`, `^Feedback$`) and match a prefix where the name carries data (`^Jump to a date`, which ends
  with the month).
- **Error pages.** `expectStatus` photographs an error page at its status: B20's `not-found` row expects 404 from
  `/venues/no-such-venue`.
- **Themes:** nine (`apps/web/src/theme/themes.ts`: electric, jade, light; pulse, forge, bluenote, drip, cedar,
  gloss), chosen by localStorage `cc-theme`, read by the inline script in `app/layout.tsx` before paint. The three
  passes (Electric, Light, Pulse) cover the plan's per-screen theme ask; another genre theme is a one-off inventory
  `themes` override, not a fourth default pass.
- **`/me` re-applies the account's theme.** It mounts `ThemeSync`, which sets the profile's saved theme over
  `cc-theme`, so the read-back would fail two of three passes there. B16 and B18 override `themes` with Electric
  alone, which needs the audit account's saved theme to be **Electric** on staging and on the local branch. Never set
  `cc-onboarding-theme-pending` to dodge it: `OnboardingThemeFlush` then PATCHes the account.

## Reading the boards (Hugh, 2026-11-11)

The B+ handoff is `design/design_handoff_bplus_redesign/`; its boards are in `screens/` (228 JPGs in 12 sections, counted 2026-11-11).

- **The boards are comprehensive.** Treat them as the answer, not a sketch.
- **A small ambiguity is not a gap.** Resolve it from the nearest drawn pattern and record it in the PR's
  `## Design review` table (board | built | ambiguity resolved from the nearest drawn pattern | gap).
- **Where the mock shows the answer, the lane fixes the screen to match.** A mismatch with a drawn board is a build
  defect, not a question for Design.
- **Only a meaningful undrawn gap goes to Design**, and that piece waits for Hugh. The rest of the PR proceeds.

## In the PR

- The pre-PR sheet (localhost) goes under `## Design review` (`.github/pull_request_template.md`) when the PR opens,
  with the inventory used and the review table above. The staging sheet follows at close-out, with the "Staging walk
  for Hugh" checklist: each route × viewport that needs his eye plus
  every hand-walked surface from the inventory's note. Hugh's phone is Android in Brave.
- **The repo is public.** A sheet of signed-in or admin pages shows the audit account's data: keep it private (a
  private link) or redact it. Only signed-out sheets are attached to the PR as they are.
