# B+ redesign: umbrella plan

**Handoff:** `design/design_handoff_bplus_redesign/` (merged in #83): README, PHASES.md, COPY.md, `status-and-dispute-fixes.md`, `screens/` (203 boards in 11 sections), `assets/venues/` (21 icons, 21 heroes).
**Readiness verdict:** 🟡 **Yellow.** It's buildable, and the foundations and the defect track can start now. Before the filter, Artist, Settings, account-menu, What's new and signed-out PRs start, Hugh has to answer the questions in [Open questions](#open-questions-for-hugh), and copy-review has to clear the paid-era strings drawn into the boards. This file carries the verdict, so the handoff folder needs no separate `READINESS.md`.
**Status:** Hugh reviews this plan before any **screen** PR starts. The foundation PRs (F1, F2) and defect PRs A1 and A2 need no product call, so they may proceed first.

## How this plan uses PHASES.md

The handoff's **order** and **risk list** stand: Foundations, Browse, Event and Artist, Venues, My shows, the long tail, then PWA and launch. Its phases are epics rather than PRs, though; Phase 0 alone is nine components plus 21 SVGs. So this plan replaces the phases with named PR boundaries:

- Each PR is at most ~20 files or ~800 lines, can ship alone, and never stacks on an open PR.
- A screen PR lists the boards it implements.
- Before a screen PR starts, its phase gets a short phase plan here or as a sibling file.

Three more changes to PHASES.md:

- **The defect track runs now and in parallel.** PHASES.md put it "in or just before Phase 2", but it is a set of defects, each with a regression test, and it doesn't depend on any visual work.
- **Plan PRs are doc PRs.** Copilot is cut (2026-11-08), so a plan PR merges on green CI after its author reads the diff. One umbrella plan plus a short phase plan per phase replaces "one plan PR per phase through the Copilot loop".
- **GenreChip is visible.** Restyling `GenreChips` changes every event row, so it can't be part of an invisible Phase 0. It moves to F3 and ships when Hugh can look at staging.

## Flag policy

- **Restyles ship unflagged.** Hugh is the only user and staging is the preview. The existing flags are global booleans (`packages/entitlements/src/feature-flags.ts`), so a `bplus` flag would fork every component without giving anyone a different view.
- **The launch animation is flagged.** It runs before content, and a defect there could strand a cold start. It gets a new `FeatureFlagKey` with `defaultEnabled: false`, flipped on staging first.
- **Multi-select Where and Vibe** would also be flagged, because it changes the URL contract. That only applies if Hugh chooses it (question 1).

Each phase is promoted to prod by hand, as usual.

## Track A: defects (parallel, starting now)

Source: `status-and-dispute-fixes.md`. Each item is checked against the code before it's fixed. A fix goes at the root cause and comes with a regression test. An item that turns out not to be a bug is said so in the PR and skipped. New user-visible strings go through copy-review, and the locked vocabulary applies.

| PR | Items | Notes |
| --- | --- | --- |
| **A1** event page | 1 disputed-card lookup (parents in `disputed`, keeping the needs-more-info pill), 2 pending banner count off by one (match the server's auto-promote rule exactly), 7 raw 409 on a second report (caught as an Already reported state in live styling, with See your report and Withdraw), 8 dead Add evidence and Edit buttons (wired or removed) | No migration. |
| **A2** Watching and counter | 3 Watching maps `cancelled` to sold out (each status gets its own state), 6 counter tier and vendor locked to the parent's in the UI and no longer sent | No migration. |
| **A3** | 4 Tickets available wired as a report that clears a promoted sold out (same threshold), 5 confirm method sent and stored | May need an expand-only column. **Prod migration needs Hugh.** Waits for this plan. |
| **A4** gaps | Report filed sheet; CTA swaps on cancelled (Refund info from the vendor) and postponed (Watching for the new date); a Sold out chip in rows | New strings, through copy-review. |
| **A5** No longer listed | The stale sweep (`crawler-core` `stale-event-sweep.ts`) marks the shows it removes, which get their own state, chip and dashed row; no cancellation notifications go out | **Expand-only migration** (a new status value or a `removed_by` source column). It is crawl-adjacent, so it gets its own phase plan first. Crawl timing (when the sweep runs, the 14 days) doesn't change. **Prod migration needs Hugh.** |

Admin review screens are out of scope.

## Track B: the redesign, PR by PR

| # | PR | Visible? | Needs |
| --- | --- | --- | --- |
| F1 | **Venue glyphs**: `VenueGlyph`, `VenueTile`, the 21 icon SVGs, the slug-to-key map, a fallback tile, tests | No (unused) | Nothing |
| F2 | **Motion module and loaders**: WAAPI helper, `PinkWave`, the `Skeleton` sheen primitive, reduced-motion still frames | No (unused) | Nothing |
| F3 | **Chips and image system**: `GenreChip`, `StatusChip` (pending and live), the image ring and the row's left edge, the sheet top edge, small-caps centering | **Yes**, every row | Hugh on staging |
| F4 | **PassportStamp** (solid and dashed) with the StubStamp hash rules. StubStamp stays until B12. | No (unused) | F1 |
| B5 | **Browse 1**: rows, Tonight spotlight, Coming to Denver, day headers, List/Cal toggle, remove the floating Crews button | Yes, release note | F3; phase plan [`2026-11-11-bplus-b5-browse-rows.md`](2026-11-11-bplus-b5-browse-rows.md) |
| B6 | **Browse 2**: filter restyle, the mobile sheet and the desktop segmented popovers, **single-select** Where and Vibe on today's URL params, the vibe teaching line, active chips | Yes | F1, question 1 |
| B7 | **Browse 3**: Cal week strip and jump picker, Browse skeletons with the wave, empty and filtered-empty states. Pull-to-refresh goes in only if it fits, otherwise it moves to B22. | Yes | F2 |
| B8 | **Event page**: backdrop option A, tilted card, genre chips, countdown, skeleton, the public `/e/[id]` | Yes, release note | A1, A2, A4 |
| B9 | **Prices and status restyle**: submit, check, report, filed, already reported, counter | Yes | Track A |
| B10 | **Artist page** and its skeleton | Yes | Question 2 |
| B11 | **Venues**: list tiles, glyph hero, a new `venues/loading.tsx` | Yes | F1 |
| B12 | **My shows**: Watching, Concerts and Artists with the stamp; remove StubStamp and the Stale price chip | Yes | F4 |
| B13 | **Passport booklet** and the Up next stub | Yes | F4, the active venue count |
| B14 | **Crews**: patch motif, the Host rename (copy only; `keeperId` stays), invite states, crew-lens empty state | Yes | Copy-review |
| B15 | **Avatar pair backend**: a nullable second colour, API and types. A missing second colour means solid. | No | **Expand-only migration; prod needs Hugh** |
| B16 | **Avatar Mix two UI** and the profile banner | Yes | B15 deployed |
| B17 | **Chrome**: header, bottom nav, account menu (without the founder eyebrow) | Yes | Copy-review |
| B18 | **Settings restyle** | Yes | The go-free Settings removal has landed |
| B19 | **Search palette, notifications panel** and their states | Yes | |
| B20 | **Errors, 404, offline, feedback tab** | Yes | B20a owns the error page |
| B20a | **Something went wrong page** (`12-error-page`, added in #98): one `StandaloneError` used by a new `app/global-error.tsx` and the route `error.tsx` files, carrying its own theme tokens; the signed-in Tell us card (prompt, form, sending, sent, failed, saved on the device and resent at the next launch); the signed-out layout; a same-origin `POST /api/error-report` that forwards to `/v1/feedback`. It replaces #73's interim report sheet. | Yes | Copy-review; **risky (API route)** |
| B21 | **What's new feature page** | Yes | Question 4 |
| B22 | **PWA surfaces**: install slot, iPhone sheets, offline pill and states, pull-to-refresh | Yes | F2 |
| B23 | **Launch animation** and iPhone startup images | Flagged | F2 |
| B24 | **Signed-out invite landing** | Yes | Question 3 |
| B25 | **Multi-select Where and Vibe** (API arrays, URL mapper, flag) | Flagged | Question 1 |

A screen PR that turns out bigger than its boundary splits before it opens, and the split goes into this table.

Every screen PR is checked in Electric, Light and one genre theme. Light uses the darker genre set. A UI PR also runs the `feature-acceptance` pass: the route-by-viewport inventory and a check at 320px (the boards are drawn at 390px).

A user-facing PR adds its `releases.ts` entry: B5, B8, and one each for the My shows, Chrome and PWA groups. F1, F2 and F4 are invisible and get none.

## Dependencies

- **Going free comes before Settings and Chrome.** The Settings boards leave out the Plan section without saying it's being removed, and they carry billing strings. Live main still renders `PlanPanel` ("Your plan"), the upgrade nudges and the cancel and downgrade sheets. The go-free lane owns removing them. B17 and B18 start only after it lands. The following board strings are **not ported**:
  - "Off. Nothing from us but billing."
  - "Billing email always sends: receipts, a failed charge, a card about to expire."
  - "handle, email, and plan are gone": live already says "profile".
  - the "BETA · FOUNDER" eyebrow in the account menu
- **"Tell us what happened" is now drawn.** Design added the error page and its Tell us card in #98 (`12-error-page`), and it replaces both `bp-s-error_m` and #73's interim sheet. B20a builds it to those boards. The capability never lapses: the interim sheet stays until B20a replaces it in the same PR.
- **Invite format.** If B24 ships, its code field must match the real multi-use code format (`BETA-XXXX-XXXX`, see `2026-11-10-invite-code-posters.md`) and the poster's QR pre-fill. The board's `CRAWL-XXXX` is a guess.
- **A1, A2 and A4 land before B8 and B9**, so the restyle rebuilds working behaviour.

## Animation module (README rule 13)

CLAUDE.md bans adding to the hand-rolled `@keyframes` in `globals.css`. The wave, the sheen and the launch therefore don't use CSS keyframes at all:

- **`apps/web/src/lib/motion/`** holds a small Web Animations API helper. It reads `--motion-fast|base|slow` and `--motion-ease` from the computed style of `document.documentElement`, so timing stays on the tokens. It exposes a function that runs a keyframe list on an element with token-named durations and returns the `Animation` objects for cancellation.
- **Reduced motion** is checked once with `matchMedia('(prefers-reduced-motion: reduce)')` and followed on change. When it's set, the helper runs nothing, and each component renders its still frame. The wave holds on the blue frame, the sheen is static, and the launch cuts straight to Browse. This matches the existing blanket guard.
- **The wave's timeline** comes from README rule 11: a 1300ms loop, a dot stagger starting at 80ms with 32ms steps, a 1.3× dot swell and a 1.35× core pulse. Those offsets are fixed design values, so they are constants in the wave component, while durations and easing that match a token use the token.
- **Cleanup:** every animation is cancelled on unmount, and nothing starts before mount (no work during SSR).
- **The launch** (B23) detects a cold standalone start as `display-mode: standalone` with no `sessionStorage` marker. It never blocks first paint. If content has already painted, it skips. A build step makes the `apple-touch-startup-image` set (the plain icon on `#070A1A`).

## Venue glyph map

The asset keys are short (`redrocks`) and the DB slugs are long (`red-rocks-amphitheatre`), so F1 adds an explicit slug-to-key map. On 2026-11-11, prod and staging both had the same **21 active venues**, all with a glyph:

| Slug | Key | Slug | Key |
| --- | --- | --- | --- |
| ball-arena | ballarena | meow-wolf-denver | meowwolf |
| bluebird-theater | bluebird | mission-ballroom | mission |
| cervantes-masterpiece-ballroom | cervantes | ogden-theatre | ogden |
| fiddlers-green-amphitheatre | fiddlers | oriental-theater | oriental |
| fillmore-auditorium | fillmore | red-rocks-amphitheatre | redrocks |
| globe-hall | globe | summit-music-hall | summit |
| gothic-theatre | gothic | the-black-box | blackbox |
| hi-dive | hidive | the-church-nightclub | church |
| larimer-lounge | larimer | the-junkyard | junkyard |
| levitt-pavilion | levitt | | |
| lost-lake-lounge | lostlake | | |
| marquis-theater | marquis | | |

- An unknown slug renders a neutral fallback tile, never a broken image. A future venue costs one map line.
- The seed (`packages/db/seed.ts`) has 18 of these slugs. It doesn't have `ball-arena`, `the-black-box` or `the-church-nightclub`, because merged seed entries don't create prod rows and those three were onboarded straight to prod. F1's drift test checks the seed slugs, plus the three named here, so a renamed slug fails a test.
- The heroes (`*-hero.html`) are for B11 and aren't part of F1.

## Open questions for Hugh

1. **Multi-select Where and Vibe:** ship single-select (the default in this plan), or widen the API now (B25)?
2. **"Follow / Following" on artists:** is it an exception to the locked vocabulary? The live artist page, the event page and the Artists boards all use it. This blocks B10 and the Artists tab in B12.
3. **The beta invite landing** (`11-signed-out`): in this release or out?
4. **What's new as a feature page:** what is the content source (new fields on `releases.ts` or a new definitions file), and who writes the card copy?
5. **The Mission Ballroom glyph** (a disco ball): accept it?
6. **The Product email toggle:** with billing gone, does "News, offers…" survive? Live detail copy still mentions discounts and gifts.

### For Design (not blocking the foundations)

- The error board leaves out "Tell us what happened" (see Dependencies).
- The admin invite poster isn't in this handoff, so the separate brief still covers it.
- Missing states:
  - a signed-out Artist or Venue page (or confirmation that they redirect)
  - a first-visit Passport empty state on desktop
  - filter popover empty results on desktop
  - the Venues list error state
  - the Avatar Mix two saving and error states
  - the launch animation on desktop Chrome

### For copy-review (before B5)

- "My submissions" and "Submission" in price copy break **Submitted prices**. The live copy breaks it too.
- Two COPY.md entries are placeholders, not strings: the Vibe legend line and the Artist "dashed note under Upcoming".
- Board text can't be searched, so copy-review reads the strings from the live canvas.

## Next

1. This plan PR (docs only).
2. A1, then A2, then F1, then F2, one PR at a time.
3. Hugh answers the open questions and reviews this plan. Then F3 and B5 start, with B5's phase plan first.
