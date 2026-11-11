# Concert Crawl extension for feature-acceptance

These add to the plugin's `feature-acceptance` skill and win where they conflict. The user is Hugh.

## The tools

concert-crawl uses the fwd kit's tools, configured by the `featureAcceptance` block in `.claude/fwd.json`. There is no
project copy of the contact sheet: a feature adds an inventory, never a script.

```
node ~/.claude/fwd/skills/feature-acceptance/contact-sheet.mjs docs/superpowers/inventories/<file>.json
node ~/.claude/fwd/skills/feature-acceptance/check-shared.mjs  docs/superpowers/inventories/<file>.json
node ~/.claude/fwd/skills/feature-acceptance/check-tokens.mjs
```

- **Two targets.** The **pre-PR sheet** runs against the lane's dev server: `pnpm dev` (allowed; it is not a build),
  then `--base http://localhost:3000`. The **staging sheet** (`baseUrl`, `https://staging.concertcrawl.app`) is the
  post-merge audit and the close-out walk: merging to `main` deploys staging, so name the commit staging ran. Every
  `productionUrl` origin (apex and `www`) is refused, and `sign-in.mjs` refuses any host but staging over https and
  localhost over http.
- **Widths:** `phone` 390 (touch), `sm` 640, `desktop` 1300. 640 is Tailwind `sm`, the one shell breakpoint:
  below it AppHeader's mobile bar and BottomNav, from it the sticky TopNav and no BottomNav; filter chips open a
  bottom sheet below it and a popover from it. The B+ boards are drawn at 390 and 1300. The 320 mobile-first floor is
  not a default width; an inventory that needs it carries its own `widths`.
- **Inventories:** `docs/superpowers/inventories/`, one file per plan row of
  `docs/superpowers/plans/2026-11-11-bplus-redesign.md` (`bplus-<row>-<slug>.json`; a row with signed-out surfaces has a
  separate `…-signed-out.json`, since `signedOut` is per inventory). Each inventory's `note` names the handoff boards
  per row and the surfaces walked by hand. Ids that differ per account are `${CC_…}` environment variables (below).
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
- Staging is launch-gated (`NEXT_PUBLIC_PUBLIC_BROWSE` unset): signed out, `/events`, `/venues`, `/artists`,
  `/watching`, `/search` and `/e/[id]` redirect to `/sign-in`, and `/` is the invite landing. The kit fails a goto that
  redirects or returns 400+, so those surfaces are walked by hand until browse opens.

## Environment

| Variable                                        | Use                                             |
| ----------------------------------------------- | ----------------------------------------------- |
| `CONTACT_SHEET_BASE`                            | Overrides `baseUrl` (kit); keep it staging      |
| `E2E_AUDIT_USER_*`, `E2E_AUDIT_ADMIN_*`         | The sign-in account (names only)                |
| `CONTACT_SHEET_ROLE`                            | `admin` signs in as the admin audit user        |
| `CC_EVENT_ID`                                   | An upcoming event with prices                   |
| `CC_DISPUTED_EVENT_ID`, `CC_PENDING_EVENT_ID`   | A1: a disputed price; a pending price banner    |
| `CC_CANCELLED_EVENT_ID`                         | A2, A4: a cancelled show the audit user watches |
| `CC_POSTPONED_EVENT_ID`, `CC_SOLD_OUT_EVENT_ID` | A4, A3                                          |
| `CC_REMOVED_EVENT_ID`                           | A5: a show the stale sweep removed              |
| `CC_ARTIST_SLUG`                                | B10: an artist with upcoming shows              |
| `CC_CREW_ID`                                    | B14: a crew the audit user is in                |

The kit expands `${VAR}` in `goto`, `clickRole` names, `fill` text and cookie values, and fails a row whose variable
is unset. **It does not redact what it expands yet**, so no row may expand a secret: the crew invite page (its URL
carries a live token) is walked by hand until redaction ships, and `CC_CREW_INVITE_TOKEN` is not used. Never paste a
real token into an inventory or a PR body.

**Picking the ids.** Each is a row already on the target (staging holds prod content, synced weekly; locally, the
seeded dev DB). Pick each in the app as the audit user and copy it from the URL, so the account can see it:

- `CC_EVENT_ID`: open Browse, pick an upcoming show with a price, copy the id from `/events/<id>`.
- `CC_CANCELLED_EVENT_ID`, `CC_POSTPONED_EVENT_ID`, `CC_SOLD_OUT_EVENT_ID`: a show carrying that status chip in a
  Browse or venue row; for A2 and A4, press Watch on the cancelled one first.
- `CC_DISPUTED_EVENT_ID`, `CC_PENDING_EVENT_ID`: an event page showing the disputed card, or the pending price banner
  (the admin review queue, `/admin/review`, lists the disputed ones).
- `CC_REMOVED_EVENT_ID`: a show on the audit user's Watching list that the stale sweep marked no longer listed.
- `CC_ARTIST_SLUG`: open an artist from an event page, copy the slug from `/artists/<slug>`.
- `CC_CREW_ID`: open Crews as the audit user (start one by hand if there is none), copy the id from `/crews/<id>`.

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
- **Service workers must be blocked** for anything that mocks network: the PWA worker answers fetches itself and a
  `page.route` mock never fires. The kit has no mock verb and does not block workers; any project Playwright script
  that mocks sets `serviceWorkers: 'block'`.
- **Themes:** nine (`apps/web/src/theme/themes.ts`: electric, jade, light; pulse, forge, bluenote, drip, cedar,
  gloss), chosen by localStorage `cc-theme`, read by the inline script in `app/layout.tsx` before paint. A fresh
  headless context has no key and a light colour scheme, so the sheet draws **Light**. The kit has no theme matrix:
  for the Electric and genre-theme passes the plan asks of every screen PR, walk staging with the theme picked in
  Settings, and say so in the Design review table.
- **`/me` re-applies the account's theme.** It mounts `ThemeSync`, which sets the profile's saved theme over
  `cc-theme`. Never set `cc-onboarding-theme-pending` to dodge it: `OnboardingThemeFlush` then PATCHes the account.

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
