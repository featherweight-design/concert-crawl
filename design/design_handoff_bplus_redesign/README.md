# B+ Redesign: Engineering Handoff

The user-facing visual redesign of Concert Crawl, called **B+** while it was being designed. B+ started from direction B ("Genre neon"), took parts of A and C, and was reviewed screen by screen with Hugh from 2026-11-09 to 2026-11-11. Every screen in this folder is approved unless it is listed under **Open decisions**.

- **Live canvas (source of truth for review):** https://claude.ai/artifact/N4JeHr2G9B3vC1gSHEFdMc. The pages that count are the ones starting with **B+**, plus **Artist page** and **Venue hero + icon fixes**. Everything else on the canvas is history: A/B/C, the three rejected concepts, and the venue-art explorations.
- **Phasing and plan:** [`PHASES.md`](PHASES.md). **Strings for copy review:** [`COPY.md`](COPY.md).
- **Scope:** every consumer surface, mobile (from 320px) and desktop. **Out of scope:** admin (to be redesigned separately afterwards), onboarding (Hugh is rebuilding it), sign-in and sign-up, legal pages, `/bot`, and anything to do with billing or trials (the app is free).

## Files

| Path | What it is |
| --- | --- |
| `screens/<section>/<board>.jpg` | A screenshot of every approved board. Mobile boards are 2× and desktop 1×. Start here. |
| Live canvas | The same boards as live HTML, at https://claude.ai/artifact/N4JeHr2G9B3vC1gSHEFdMc. Open a board there to inspect spacing, colors and SVG. The standalone `boards/` HTML (about 13 MB, images inlined) is left out of the repo to keep it lean. These are mockups (inline styles, sample data), not code to port. |
| `assets/venues/<key>-icon.svg` | The 21 final venue glyph tiles (96×96 SVG). These are production assets. |
| `assets/venues/<key>-hero.html` | The 21 venue-page heroes (1200×420): the glyph large in neon over a quiet backdrop. The SVG inside each file is the asset. |
| `manifest.json` | Every board with its section, title and size. |

The sections are `01-core` (desktop Browse, Event, Venue, Venues, Watching, Concerts, Artists, Account menu), `02-mobile`, `03-themes`, `04-genre-and-vibe`, `05-filters`, `06-states`, `07-more-screens` (Settings, Search, Passport, Crews, Share, What's new), `08-prices-and-status`, `09-artist`, `10-venue-art`, `11-signed-out` and `12-error-page` (the standalone Something went wrong page, added after the first handoff).

The two `▶` boards in `06-states` (`launch_play_m`, `launch_slow_m`) and `wave_board` are live CSS animations, so open them on the live canvas rather than the JPG.

## What does not change

- **Themes and tokens.** All nine themes use the live values from `apps/web/src/theme/themes.ts`, and the motion tokens are the existing `--motion-fast|base|slow` and `--motion-ease`. B+ adds no new color tokens.
- **The genre map.** These are the 16 buckets in `packages/types/src/genre-buckets.ts`, with their colors unchanged. On the Light theme the darker set is used.
- **The logo.** The `CCMark` in `components/brand/cc-mark` plus the "concert / crawl." wordmark, unchanged. (The early canvas boards drew an old slash mark, and engineering should ignore it. Every board here now uses the real mark.)
- **Fonts.** Inter for UI, and JetBrains Mono for eyebrows, counts and labels.
- **Icons.** lucide plus the app's own glyphs (`glyphs.tsx`, notification icons). B+ redraws no icons except the venue glyphs.
- **Structure and copy.** Almost every screen keeps the live structure and the live strings, word for word. New strings are listed in `COPY.md`.

## The system: rules that apply everywhere

These are the parts to build once and reuse.

1. **One glow per screen.** The ambient page background is the only soft radial glow. Components carry their own motif instead: crew patches use their rings and spokes, the profile card uses a striped banner in the user's two avatar colors, and Up next uses a ticket stub. The exceptions Hugh asked for are the colored light behind the ⌘K search palette and the core's bloom in the launch animation.
2. **Genre color has one job.** A genre's color appears as:
   - the **image ring**: 1.25px around the artist thumbnail, plus a soft glow in the same color
   - the **row's left edge**: 2px
   - the **dot** in a genre chip

   Genre chips are neutral (`s2` fill, muted label, `border` hairline) with a 7px colored dot. A filled, colored chip therefore always means a status or a price, never a genre (`04-genre-and-vibe/bp-chips-all`).
3. **Status colors are fixed.**
   - Sold out uses `--accent`.
   - Postponed uses `--warning`.
   - Cancelled uses `--danger`, fades the row and strikes through the name.
   - Tickets available uses `--success`.
   - No longer listed is grey and dashed.

   A status that is still pending is dashed and shows its confirm dots. A confirmed one is solid. Each status's Continue and File buttons take its color.
4. **One stamp everywhere.** This is the Passport ink stamp: a venue ring with the venue glyph, never tilted. It **replaces the ticket-stub `StubStamp`** in Watching, Concerts and the Passport teaser. Upcoming shows show the dashed stamp they will become, and "Yes, going" is filled with that stamp's color.
5. **Venue identity is the glyph.** The venue's icon tile is used in lists, search, filter options, chips and the avatar beside a venue name. Only the venue page hero shows the glyph large in neon (`assets/venues`). The 21 glyphs follow Hugh's final picks, including the Bluebird District bird, the Cervantes trumpet, Ogden's twin towers and the Oriental torch blade.
6. **Event and artist hero (theme option A).** The page background is the photo blurred and washed in the **theme's** two colors. The tilted artist card keeps the **genre** ring. That way the theme still reads on the page while the genre stays consistent everywhere (`03-themes`, the `_A` boards).
7. **Sheets.** The blue-to-pink top edge follows the rounded top corners and fades out down the sides (see any sheet in `06-states`).
8. **Small caps chips.** NEW, HOST, ADMIN, CONFIRMED and similar chips are vertically centered. Hugh has caught this twice.
9. **Skeletons hold the layout.** A skeleton uses the same card shapes and neutral left edges, with a soft sheen that sweeps on `--motion-slow`. The page chrome (header, title, filters, tabs) renders immediately, so only the data is a skeleton. The sheen is static under reduced motion.
10. **The pink wave is reserved.** The loader (rule 11) appears only where someone is waiting on shows: the launch, Browse's first load (next to "Loading shows") and pull-to-refresh. Every other wait, including Load more, gets a quiet skeleton or text.

## Motion

11. **Pink wave loader** (`06-states/wave_board`, `bp-s-load_browse_m`, `pull_m`). This is the CCMark trail laid flat: seven dots growing toward a core with a halo. One loop lasts 1300ms:
    - Starting at 80ms, each dot eases from `--signal` to `--accent` with a 1.3× swell, then returns to blue as the next dot lights, 32ms apart.
    - The core turns pink as the wave lands, fades back to blue and pulses at 1.35× while the halo blooms.
    - Then it rests until the loop repeats.

    Under reduced motion it holds still on the blue frame.
12. **Launch animation** (`06-states/launch_*`). It plays on every installed copy of the app (iPhone, Android, desktop Chrome and Edge), **on a cold start in standalone mode only**. It never plays in a browser tab, and under reduced motion it is a straight cut to Browse. The art is the CCMark at 4.2×, with the same coordinates, radii and opacities as `cc-mark`, so the trail always meets the core.

    | Time (ms) | What happens |
    | --- | --- |
    | 0 | First paint matches the system splash: the icon tile (#171D3A) at 128px, centered on #070A1A |
    | 0–110 | The tile fades away; the mark stays small |
    | 110–360 | The mark grows to 4.2× (expo out), with the trail still blue |
    | 300–590 | Pink travels up the trail one dot at a time (1.28× swell, 32ms apart, each dot back to blue as the next lights), and the core catches it last |
    | 400–580 | The wordmark and "DENVER" rise in |
    | 600–690 | The core fades back to blue |
    | 680–840 | The core pulses (1.4×) and the halo blooms (1.2×) |
    | 860–1040 | The mark shrinks into the header logo's exact spot (28px at 16,15) while the Browse skeleton fades up and the header wordmark appears |

    It never holds the app. The page loads underneath the whole time, and if shows arrive early the hand-off starts right away.

    **System splashes.** Android builds its own splash from the manifest (icon, name and `background_color` #070A1A), so we can't change it. iPhone shows one still image per screen size (`apple-touch-startup-image`, generated at build time, for example with `next/og`). Make that image the plain icon on #070A1A so it matches Android and frame 0.
13. **Motion rule conflict to settle in the plan.** CLAUDE.md says nothing new joins the old hand-rolled `@keyframes`. The wave and the launch are keyframe-heavy by nature, so the plan PR should propose where they live, for example a small motion module using the Web Animations API driven by the motion tokens.

## Screens: what changed, by area

- **Browse** (`01-core/bp-browse`, `02-mobile/bp-m-browse_m`, `05-filters`, `04-genre-and-vibe`):
  - Keeps today's structure: Coming to Denver, What's on? with List/Cal, filters, one ★ Tonight spotlight, then rows grouped by day.
  - **Filters (direction A):** desktop gets one segmented bar (My artists, Who (crew lens), When, Where, Price, Vibe), and each segment opens its own popover. Mobile gets one Filters button with a count, the My artists switch, and one sheet for everything else. Active filters show as small removable chips.
  - Where uses venue icon tiles, and Vibe uses genre dots, with one new line that teaches "genre = color".
  - The floating Crews button is gone.
- **Event page** (`01-core/bp-event`, `02-mobile/bp-m-event_m*`, `03-themes`): the theme-washed photo backdrop, the tilted artist card with the genre ring, and genre chips under the name. Everything else is live: prices, Watch, More at this venue, and Report a status change.
- **Artist page** (`09-artist`): built like the event page. Follow sits in the hero. Upcoming comes first, with venue icons. The Spotify embed moves into a framed side card. On desktop, a starburst sits behind the photo at **8%** opacity. Mobile has **no** starburst.
- **Venues list and venue page** (`01-core/bp-venues`, `bp-venue`, `02-mobile/bp-m-venue*`, `10-venue-art`): icon tiles in the list, and the neon glyph hero on the venue page (380px tall on mobile), plus About, the First-timer callout and the Before you go guide from `design_handoff_venue_first_timer_guide`.
- **My shows** (`01-core/bp-watching`, `bp-concerts`, `bp-artists`, `02-mobile`):
  - Rows use the image ring and left edge.
  - Watching keeps the going prompt on one line ("Going? In N days." plus the button).
  - Concerts uses the new stamp, and in its stats only Top venue keeps a gradient.
  - The Stale price chip is dropped everywhere.
- **Account menu** (`01-core/bp-account`, `02-mobile/bp-m-account_m`): rebuilt from the live `UserMenu`, with the same groups, icon tiles and P shortcut, on a lifted surface with a gradient top edge.
- **Settings, Search, Passport, Crews, Share and What's new** (`07-more-screens`):
  - **Settings:** structure as live.
  - **Avatar:** "Mix two" is the only picker; it stores a pair of colors.
  - **Search:** the ⌘K palette with its colored light.
  - **Passport:** an open stamp booklet, four stamps per page, with Up next as a ticket stub.
  - **Crews:** Keeper is renamed **Host**.
  - **Share images:** the square thumbnail on a tilted card over a blurred copy of the photo, so there is no new crop.
  - **What's new:** a feature page.
- **Prices and show status** (`08-prices-and-status`): drawn from the live `SubmitPriceModal`, `CorroborationSheet`, `PendingCardB` and `PriceDisplay`, restyled. Status reporting gets two new screens, Report filed and Already reported. The status and price bugs found along the way are written up separately in [`status-and-dispute-fixes.md`](status-and-dispute-fixes.md) (see `PHASES.md`).
- **States** (`06-states`):
  - **Loading:** a skeleton for every screen.
  - **Empty:** one pattern everywhere.
  - **Errors and offline:** errors and 404 (the error uses the CCMark with its trail broken), offline.
  - **Cal view:** week strip with genre dots per day, plus the jump picker.
  - **From outside:** the crew invite (open, already a member, expired) and the public event page for signed-out visitors.
  - **Smaller pieces:** price confirm sheets, more tiers and vendors, notifications (with empty, loading and error states), and the Tell us feedback tab.
  - **PWA:** icon, install surfaces, offline notices, launch.
- **Signed out** (`11-signed-out`): the beta invite page, with the code field inline, a fanned stack of show cards, and the venue-icon proof row.
- **Something went wrong** (`12-error-page`, canvas page "Something went wrong"): this replaces the simple error board in `06-states` (`bp-s-error_m`). It is a standalone page that has to render even when the app failed.
  - **The error:** the real CCMark with its trail snapped and the core dark, the live heading and body, **Try again** first, and the error ID in a copyable chip. There is no app header, nav or Tell us tab, just the logo as a plain link home.
  - **Signed in:** a Tell us card under the error (on desktop, a 440px card on the right) that already asks **What were you doing?** with six chips. One tap is enough, and the note is optional. The card lists what gets attached: the error ID, the page and the device type. Its states are prompt, form open, sending (the button reads Sending…, with no wave), sent (Loud and clear) and failed (Signal lost). On failure the report is saved on the device and sent on the next launch, with **Send again** and **Edit**.
  - **Signed out:** no card, just Try again, Go home and the error ID.
  - **Themes:** the page carries its own copy of the 9 themes' tokens, so it follows the person's theme, Light included. Boards `err-t-*` show the prompt state in each.
  - **Engineering:**
    - Build one `StandaloneError` used by a new `app/global-error.tsx` (with its own `<html>` and `<body>`) and by the route `error.tsx` files. Its imports are React and a plain copy object only: no Clerk hooks, ThemeProvider, next/font, images or shared CSS.
    - Styles are inline: one `<style>` with the theme tokens keyed by `data-theme`, plus a pre-paint script that reads the stored theme. The mark and logo are inline SVG.
    - Signed-in detection uses Clerk's `__client_uat` cookie, and a 401 on send switches to the signed-out layout.
    - The send is a plain `fetch` (keepalive, about an 8s timeout) to a same-origin route handler, for example `POST /api/error-report`, that checks the session and forwards to `/v1/feedback` as `bug` with `{ errorId, device, build }`.
    - The error ID is `error.digest`. A client error, which has none, gets a generated ID that is tagged on its Sentry event.
    - The device is coarse ("iPhone · Safari"), never the full user agent.
    - The card is a `<form>` and the chips are a real radio group. Sent and failed move focus to their heading.

## Data-contract gaps engineering needs to know

1. **Multi-value Where and Vibe.** The designs show "Bluebird + Ogden" and two genres at once. Live `filterWhere` and `filterVibe` hold one value each (`filter-bar/filter-defs.ts`). Either widen the params to lists or ship single-select first. The plan PR should choose; single-select is a safe Phase 1.
2. **Venue glyphs need a home.** No venue icon component exists yet. Add the 21 SVGs (`assets/venues`) keyed by venue slug, with a neutral fallback tile for any future venue.
3. **Passport stamp per show.** The stamp needs the venue key and its accent for every attended and upcoming show. The current `StubStamp` hash rules can choose the accent.
4. **Avatar pair.** "Mix two" stores two colors, but `user_profiles.avatar_color` holds one enum value today. Adding a nullable second color is an expand-only migration, and a missing second color means solid.
5. **Crew role rename** (Keeper to Host) is copy only (`crews/definitions/copy.ts`). Keep `keeperId` as the identifier, the same way `history` stays the identifier for Concerts.
6. **Launch-screen startup images** need a build step for the iPhone sizes, plus a way to tell a cold standalone start apart from later opens (for example `display-mode: standalone` together with a session flag).
7. **Status gaps already found** are documented in [`status-and-dispute-fixes.md`](status-and-dispute-fixes.md): Tickets available does nothing, the evidence answer is never sent, Watching maps cancelled to sold out, the confirm count is off by one, and the disputed card probably never renders.

## Open decisions (Hugh)

- **"Follow / Following" on artist pages.** CLAUDE.md's locked vocabulary bans "Following", but the live artist and event pages use it. The designs keep what ships.
- **"Submission" in live price copy** ("Edit submission", "Your submission") conflicts with "Submitted prices". This needs a copy-review pass, not design work.
- **Beta invite page (`11-signed-out`).** It was drawn during the remaining-screens round. Confirm it's in this release or move it out.
- **Mission Ballroom glyph** (disco ball). It's worth a glance against the building.

## Accessibility notes

- Genre is never carried by color alone: the chip always has its label, and the ring and edge are decoration.
- Status chips pair their color with a word, and cancelled also strikes through the name.
- Every animation has a reduced-motion path. Skeleton sheen, the wave and the launch hold still or cut.
- Touch targets stay at 44px, including the install slot's ×.
- Check contrast for the muted label on the `s2` chip on Light and Forge during implementation.
