# Concert Crawl extension for feature-acceptance

These add to the plugin's `feature-acceptance` skill and win where they conflict. The user is Hugh.

> **In `concert-crawl`:** the contact sheet is `pnpm contact-sheet docs/superpowers/inventories/<feature>.json`
> (root alias for `pnpm --filter @concert-crawl/e2e contact-sheet`, script
> `apps/e2e/src/contact-sheet/contact-sheet.ts`, schema `apps/e2e/src/contact-sheet/inventory.ts`). A row's `steps` are
> Playwright verbs, so a surface three clicks deep is one row rather than a new script. Adding a feature means adding an
> inventory, never another script. Modelled on the-99's `scripts/contact-sheet.mjs`.

> **Sameness check:** none yet. The schema accepts a `shares` block (`binding`, `module`) so an inventory can name its
> shared component now; the import-equality script is still to be ported from the-99's `check:shared`.

## Staging only

- **The walk and the contact sheet run against staging, never a local build.** `PLAYWRIGHT_AUDIT_BASE_URL` selects the
  origin (default `https://staging.concertcrawl.app`, the same variable the ui-audit sweep reads; CI's copy is the
  repository variable `STAGING_URL`). The script refuses production through `assertNotProdBaseUrl` and refuses
  loopback hosts outright.
- Merging to `main` deploys staging only, so a PR is walked on staging **after** its merge deploys, or on the commit
  staging is running. Say which commit the sheet photographed.
- Staging holds prod content, never prod users (`docs/runbooks/staging-environment.md`), so event, venue and artist
  ids are real and stable enough to name in the environment.

## Sign-in

- Clerk, through the house helper `signInWithClerk` (`apps/e2e/src/fixtures/auth.ts`): the `/sign-in` form, email then
  password, waiting on the `__session` cookie. The script signs in once per auth state and reuses the storage state.
- `signed-in` rows: `E2E_AUDIT_USER_EMAIL` and `E2E_AUDIT_USER_PASSWORD`. `admin` rows: `E2E_AUDIT_ADMIN_EMAIL` and
  `E2E_AUDIT_ADMIN_PASSWORD`. `signed-out` rows sign in as nobody.
- **These live in the operator's shell profile, not in any `.env`.** Grepping `.env.local` finds nothing. Reference
  them by name; never read, print or paste their values.
- Staging is launch-gated (`NEXT_PUBLIC_PUBLIC_BROWSE` unset): signed out, `/events`, `/venues`, `/artists`,
  `/watching`, `/search` and `/e/[id]` redirect to `/sign-in`, and `/` is the invite landing. A row that needs public
  browse says `"when": "public-browse"` and runs only with `NEXT_PUBLIC_PUBLIC_BROWSE=true` in the shell.

## Widths

| Label     | Width | Why                                                                                                  |
| --------- | ----- | ---------------------------------------------------------------------------------------------------- |
| `floor`   | 320   | The mobile-first floor (CLAUDE.md). The B+ boards are drawn at 390, so this is a check, not a match. |
| `phone`   | 390   | The boards' phone width.                                                                             |
| `sm`      | 640   | Tailwind `sm`, the one shell breakpoint (see below). The first width with the desktop shell.         |
| `desktop` | 1300  | The boards' desktop width.                                                                           |

The shell switches at **640px, Tailwind `sm`** (default screens; `tailwind.config.ts` sets none). Below it:
AppHeader's mobile bar (`sm:hidden`) and BottomNav (`fixed … sm:hidden`). From it: AppHeader's sticky TopNav
(`hidden … sm:flex`) and no BottomNav. AppHeader's search button also widens at `lg` (1024), which 1300 covers. A
`BottomSheet` is a bottom sheet below `sm` and a centred modal from it; filter chips open `FilterSheet` below `sm`
and `FilterPopover` from it. A surface that exists at one width only says so with `widths` on its row.

## App shell selectors

Mounted by `apps/web/src/app/(protected)/(main)/layout.tsx` around every page in `(main)`:

| Part         | Selector                                                                                                                                               |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Header       | `header` (AppHeader; both bars live inside it)                                                                                                         |
| Bottom nav   | `nav[aria-label="Main navigation"]` (BottomNav, below `sm`)                                                                                            |
| Search       | `header button[aria-label="Search"]:visible` (one per bar)                                                                                             |
| Account menu | trigger `button[aria-label^="Account menu"]:visible` (header avatar from `sm`, BottomNav slot 5 below); the menu is a `role="dialog"` named `Account…` |
| Feedback tab | `button[aria-label="Send feedback"]` (`FeedbackEdgeTab`, mounted by `(protected)/layout.tsx`)                                                          |
| Sheets       | `[role="dialog"][aria-modal="true"]`: `BottomSheet`, `CCOverlay`, `FilterSheet` (named `<Title> filter`), `JumpPicker` (named `Jump to a date — …`)    |

**There is no reliable `<main>`.** Unlike the-99, pages render their own `<main>` or none (Venues, the event page
and Crews have none, and mobile Settings has none). So page scope in the contact sheet is "outside the shell":
`:not(header *):not(nav[aria-label="Main navigation"] *)`, applied to every page-scoped verb. Shell surfaces have
their own verbs (`openAccount`, `openSearch`, `clickDialog`) that name what they press. Dialogs are found by their
accessible name (`waitDialog`), never by a bare `[role=dialog]`, because the account menu is one too.

## Theme matrix

- **Nine themes** (`apps/web/src/theme/themes.ts`): `electric`, `jade`, `light` (base); `pulse` (EDM), `forge`
  (Metal), `bluenote` (Jazz), `drip` (Hip-Hop), `cedar` (Indie / Folk), `gloss` (Pop). The app is not dark-only.
- **Minimum per UI PR: Electric, Light and one genre theme** (the umbrella plan). The script's default is
  `electric,light,pulse`; Pulse because the handoff draws it at both widths (`03-themes/bp-t-pulse-*`,
  `bp-td-pulse-*`). Override with `THEMES=electric,forge`.
- **Mechanism:** localStorage `cc-theme`, read by the inline script in `app/layout.tsx` before first paint, which sets
  `data-theme` on `<html>` and the CSS custom properties. The script writes the key with `addInitScript` and reads
  `data-theme` back after every row; a mismatch fails the cell rather than filing a wrong-theme shot under the
  asked-for folder.
- **`/me` draws the account's theme.** It mounts `ThemeSync`, which re-applies the profile's saved theme over
  `cc-theme`. Its rows are `"theme": "account"` and are photographed once per width. Never set
  `cc-onboarding-theme-pending` to get around it: `OnboardingThemeFlush` then PATCHes the account's theme.

## Handoff boards

The B+ handoff is `design/design_handoff_bplus_redesign/` and its boards are
`design/design_handoff_bplus_redesign/screens/` (228 JPGs in 12 sections). Each inventory row lists its boards, relative
to that folder, and the sheet lays them beside the cells, outlined, so the comparison is one page. A CI test
(`apps/e2e/src/contact-sheet/inventory.test.ts`) fails when a row names a board or a route that does not exist.

## Route inventories

One file per plan row of `docs/superpowers/plans/2026-11-11-bplus-redesign.md`, named
`docs/superpowers/inventories/bplus-<row>-<slug>.json` (A1–A5, F3, B5–B25 except the backend-only B15). A row carries
its route pattern as `apps/web/src/app` spells it, its auth state, its boards, and its steps.

| Surface      | Route                                                      | Auth                             |
| ------------ | ---------------------------------------------------------- | -------------------------------- |
| Browse       | `/events` (`?view=cal` is Cal)                             | signed-in (public once launched) |
| Event page   | `/events/[id]`                                             | signed-in                        |
| Public event | `/e/[id]`                                                  | signed-out, launch-gated         |
| Artist       | `/artists/[slug]`                                          | signed-in                        |
| Venues       | `/venues`, `/venues/[slug]`                                | signed-in                        |
| My shows     | `/watching`, `/history` (Concerts), `/following` (Artists) | signed-in                        |
| Passport     | `/passport`                                                | signed-in                        |
| Crews        | `/crews`, `/crews/[crewId]`, `/crew/join/[token]`          | signed-in                        |
| Settings     | `/me`, `/me/edit`                                          | signed-in, `/me` theme = account |
| Search       | palette (shell), `/search`                                 | signed-in                        |
| What's new   | `/changelog`                                               | both                             |
| Landing      | `/` (invite landing while gated)                           | signed-out                       |
| Code entry   | `/auth/code`                                               | signed-out                       |
| Offline      | `/~offline`                                                | both                             |

Ids that differ per account come from the environment: `CC_EVENT_ID`, `CC_ARTIST_SLUG`, `CC_CREW_ID`,
`CC_CREW_INVITE_TOKEN`, and per-state ids (`CC_CANCELLED_EVENT_ID`, `CC_POSTPONED_EVENT_ID`, `CC_SOLD_OUT_EVENT_ID`,
`CC_DISPUTED_EVENT_ID`, `CC_PENDING_EVENT_ID`, `CC_REMOVED_EVENT_ID`). Venue slugs are stable and written literally.

**`"when": "manual"` rows** are surfaces no automated path reaches yet (loading skeletons, which show only during a
client navigation; install prompts; the launch animation; sheets whose triggers the PR itself is restyling). They
appear on the sheet as named holes and in the run's closing list, and are walked by hand on staging. The PR that
builds such a surface replaces `manual` with steps when it can.

## Running it

```
WIDTHS=phone,desktop THEMES=electric ONLY=browse,where \
  pnpm contact-sheet docs/superpowers/inventories/bplus-b6-browse-filters.json
```

- Output: `apps/e2e/contact-sheets/<inventory>/` (ignored): `<theme>/<row>-<width>.png`, `sheet.html`, `sheet.png`.
- Exit 1 when any cell failed to reach its surface or nothing was photographed. Manual rows never fail it.
- Every context sets `serviceWorkers: 'block'`. The PWA service worker otherwise answers fetches itself, `page.route`
  never fires, and a mocked row photographs the real server while reading as mocked. Any Playwright script here that
  mocks needs the same.
- Reduced motion by default, so the wave and sheen sit on their still frames; `"motion": "no-preference"` on an
  inventory turns it off.
- Load: a full sheet is rows × 4 widths × 3 themes page loads against staging. Narrow it with `ONLY`, `WIDTHS` and
  `THEMES` while iterating, and run the full matrix once per PR.

## Close-out walk for Hugh

The sheet is attached under `## Design review` in the PR body (`.github/pull_request_template.md`), with the inventory
used, the staging commit, and a "Staging walk for Hugh" checklist: one line per route × viewport that needs his eye,
plus every manual row. Hugh is on Android in Brave, so the phone walk is that browser.
