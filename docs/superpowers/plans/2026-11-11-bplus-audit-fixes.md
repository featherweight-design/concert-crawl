# B+ audit fixes (2026-11-11)

The runtime half of the B+ audit (lane 11). Every B+ or design-handoff UI surface merged to `main` was photographed on the local dev server and compared with its board. au2's static findings and the orchestrator's routing rulings are folded in at the end.

- **Stack:** the `fix/b24-landing-image` branch (main at `665af6ed` plus #131), web :3000, API :3001, data from the Neon branch `scratch-contact-sheet` (a staging copy, read-only for this audit).
- **Kit:** `contact-sheet.mjs`, with scratch inventories that copy the repo ones and add `widths` (320, 390, 640, 1300). Sheets were taken locally (lane 11, 2026-11-11). They are kept off the repo because most show signed-in or admin pages, and the repo is public. Re-take any of them with the inventories below.
- **Rules:** the boards are comprehensive. Where a mock shows the answer, the fix matches it. A small ambiguity is resolved from the nearest drawn pattern and recorded as a note. Only a meaningful undrawn gap goes to Design via Hugh.
- **Owner lanes:** a6 owns the Browse, Event and Artist B+ screens. 11 owns B22–B24, W3, and the A rows (lane 33 is closed, and the plan names no other owner). au2 takes small fixes. 9d owns B19 search.

## Coverage

Every PR merged after #83 that touches `apps/web` UI, plus the B+ and handoff docs that define a surface. Nothing is left unmapped.

| PR | What | Surface | Route(s) | Covered by | Widths | Themes |
|---|---|---|---|---|---|---|
| #86 A1, #87 A2 | price checks, Already reported, sold-out wording, watching slot | 2, 3 | `/events/[id]`, `/watching` | f3 `event-chips`, `watching` | 4 | signed-in theme only (see Themes) |
| #88, #89, #96 | venue glyphs and tile, motion/PinkWave/skeleton, VenueStamp (not used yet) | 6 | none | au2 static | n/a | n/a |
| #91, #92, #93, #95 | poster QR `/I/<code>`, Night/Paper/tabs sheets, admin Posters tab, mint inline | 7 | `/admin/invite-codes/posters`, `/I/<code>` | s7 `posters` | 4 | admin (dark) |
| #101 F3 | genre colours, status chip tones, image ring, row edge, sheet edge | 1, 2, 3, 4 | `/events`, `/events/[id]`, `/watching`, `/venues/[slug]`, `/artists/[slug]`, search palette, Where sheet | f3 (7 rows) | 4 (sheet: 320 and 390) | signed-in theme only |
| #104 A4 | Report filed sheet, cancelled and postponed CTAs, sold-out row chip | 1, 2 | `/events/[id]`, `/events` | a4 `cancelled-cta` | 4 | signed-in theme only |
| #106 | admin Crawl paused pill (venue list and detail) | 9 (admin, not B+) | `/admin/venues` | not sheeted: no board (pre-B+ admin) | n/a | n/a |
| #108 B15 | avatar pair: second colour (data and lib only) | 10 (data, no UI yet) | none until B16 | n/a: renders nothing new | n/a | n/a |
| #110 B5 | browse rows, day headers, Tonight spotlight, Coming to Denver | 1 | `/events` | b5 (3 rows) | 4 | signed-in theme only |
| #111 A5 | No longer listed marker (admin MissingLinks text; the row state is in the API) | 1, 3 | `/admin/review`, rows | hand check: no removed event in scratch data | n/a | n/a |
| #114 B24, #131 | signed-out invite landing, show images as plain `img` | 5 | `/`, `/auth/code` | b24 (3 rows) | 4 | Light, Electric, Pulse (signed out) |
| #115 W4 | admin Reported queue, Artists badge, bell category | 8 | `/admin/artists` | s8 (2 rows) | 4 | admin (dark) |
| #120 B21 data | what's new feature cards in `releases.ts` | 11 (data, no UI yet) | none until B21 | n/a | n/a | n/a |

Surfaces 9, 10 and 11 were added for PRs that fit none of 1–8. 10 and 11 ship data with no visible UI, so they need no sheet until their screen PRs land. 9 has no B+ board; it is covered by the admin redesign plan (#122/#129).

**Themes.** `ThemeSync` is mounted in `UserMenu`, so every signed-in page draws the account's saved theme. The audit user's theme is Light, so every signed-in cell is Light only. B24 is the one surface reachable signed out, and it was run in Light, Electric and Pulse. The Electric and genre-theme passes for surfaces 1–4 **can't be trusted until the audit user's saved theme is changed per pass**. That's a DB write, and the orchestrator needs to route it. Boards drawn in Electric (`bp-m-browse_m`, `bp-browse`, `more-st-ev_canc_m`) were compared against the Light build for structure. Colour was checked only against the Light boards (`bp-t-light-browse_m`, `bp-td-light-browse`, `inv-light`).

**Sheets:** taken locally and kept private (signed-in and admin pages). The signed-out `b24` sheet can be shared.

**Audit-method notes (not defects):**
- Cells shot at first paint photograph images before they arrive, because the dev image path is slow. The same rows are fine after a 2.5–4 s `settle`. The repo inventories should add a `settle` after the `wait`, or blank tiles read as defects.
- The repo inventory `bplus-a4` has two problems. Its sold-out row needs a promoted sold-out report, and no event has one. The API 404s cancelled events whose `hidden_from_consumer` is true, so pick the id from a visible row.
- Every dev page shows Next's "1 Issue" overlay, and the 404 page shows "5 Issues". These are dev-only runtime errors. Someone should open the overlay once; it is not in the fix list.

## 1 · Browse (`/events`): B5, F3, A4 rows

| route | viewport | board | what differs | severity | fix | owning lane |
|---|---|---|---|---|---|---|
| /events | 320, 390 | 02-mobile/bp-m-browse_m, 03-themes/bp-t-light-browse_m | The shelf card (`ShelfCard`, starter and Coming to Denver) is 168×308 against the board's ~148×271. At 390 the spotlight drops below the fold. At 320 "What's on?" is off the first screen entirely. | major | Size the shelf card to the board at phone widths (≈148×271 at 390) | a6 |
| /events | 1300 | 01-core/bp-browse, 03-themes/bp-td-light-browse | Shelf card is 168×308 against the board's 180×288. The rail hard-clips a 6th card at the container edge; the board fits 5 whole cards. | minor | 180×288 at desktop; size the rail to whole cards | a6 |
| /events | 1300 | bp-browse, bp-td-light-browse | The content column is 976 px wide; the board's is 1040. | minor | Use the board's container width | a6 |
| /events | 390 | bp-m-browse_m, bp-t-light-browse_m | The mobile spotlight shows the "with …" support line. The mobile board drops it; the desktop board keeps it. The spotlight image is ~112 px; the board's is ~97. | minor | Hide support below `sm`; set the image to the board size | a6 |
| /events | 1300 | bp-browse | The spotlight image is 114 px; the board's is 130. | minor | Match 130 | a6 |
| /events | 390, 1300 (Light) | bp-t-light-browse_m, bp-td-light-browse | The spotlight card is a flat pale fill. The board has a warm genre wash coming off the image side. | minor | Add the genre-tinted wash (same colour source as the row wash) | a6 |
| /events | 390 | 06-states/bp-s-loadmore_m | "Load more shows" is a small centred pill. The board has a full-width bordered button the width of a row. | minor | Make it a full-width button | a6 |
| /events | all | 06-states/bp-s-load_browse_m | An image tile that hasn't loaded is an empty pale box (rows, spotlight, shelf). The board's loading state uses the skeleton block. | minor | Show the F1 skeleton block, or the IdentityArt fallback, until the image loads | a6 |
| rows (all row surfaces) | all | 08-prices-and-status/more-st-rows_board | A cancelled row strikes the date and time (`WhenWhere.tsx` STRIKE). The board strikes the **title**, leaves the date line alone, and doesn't strike postponed ("Date TBA"). | major | Strike and dim the headliner on cancelled only; drop the date/time strike | a6 |
| /events | all | more-st-rows_board | Sold out row chip: not checked. No event in the scratch data has a promoted sold-out report. | hand check | Seed one sold-out report (DB write), then re-run `sold-out-chip` | 11 |

## 2 · Event page (`/events/[id]`): A1, A4, F3

Checked on a visible cancelled event, signed in (`a4b`, full page). No postponed event is visible in the scratch data.

| route | viewport | board | what differs | severity | fix | owning lane |
|---|---|---|---|---|---|---|
| /events/[id] cancelled | 390, 1300 | 08-prices-and-status/more-st-ev_canc_m, more-st-ev_canc_d | The CANCELLED status chip renders **above the headliner**, in the tour-name row (`event-title-block/EventTitleBlock.tsx:87`), between the genre chip and the title. On the board it sits **below the genre chip and above the date line**, solid and tinted at about 11 px. | major | Move the chip under the genre chip, above the date line | au2 |
| /events/[id] cancelled | all | more-st-ev_canc_m, more-st-rows_board | The headliner is not struck. On the board it is struck and dimmed. | major | Strike and dim the headliner when cancelled (same rule as the rows fix above) | au2 |
| /events/[id] cancelled | all | more-st-ev_canc_m, _d | The "This show has been cancelled." card sits at the bottom, below the venue/date/doors/ages list. At 1300 it is below the fold. On the board it is the first block under the hero. | major | Put the status card directly under the hero, before every other card | 11 |
| /events/[id] cancelled | all | more-st-ev_canc_m, _d | The page still offers "Watch to track the price" and the "No price yet / Submit a price" card. The board shows neither on a cancelled show. | major | Hide the watch-price card and the price card when cancelled | 11 |
| /events/[id] cancelled, no vendor link | all | more-st-ev_canc_m (nearest) | The fallback "Visit Venue Website" is the pink filled primary. The board's cancelled CTA (Refund info) is an outlined secondary. | minor | Use the outlined secondary style. Ambiguity resolved from the nearest drawn pattern. | 11 |
| /events/[id] cancelled | all | more-st-ev_canc_m | The card icon is ✕. The board uses ⊘ in a tinted square. The meta line reads "0 confirms · 11d ago"; the board reads "REPORTED BY @X · N CONFIRMS · 2H". | minor | Use the ⊘ tile. For a crawled cancellation (no reporter) drop "0 confirms" and keep the age. The board only draws a reported one; nearest pattern. | 11 |
| /events/[id] | 390, 1300 | (chrome) | At first paint a signed-in user sees signed-out chrome ("Sign in", "Sign up", a blank avatar). It clears once Clerk loads, about 4 s later in dev. | minor | Hold the auth slot until Clerk is loaded; don't render signed-out buttons first | a6 (B17) |
| /events/[id] | all | more-st-ev_canc_m (hero) | The hero layout is not the board's centred tilted card. | note | Not a defect: that is B8 (backdrop option A), which is not merged | a6 (B8) |
| /events/[id] postponed, Report filed | all | more-st-ev_post_m, more-st-filed_m | Not checked: no visible postponed event, and filing a report is a write. | hand check | Seed a postponed event, walk Report → filed sheet on staging | 11 |
| /events/[id] | 390 | 04-genre-and-vibe/bp-chips-all | The genre chip on the hero (HIP-HOP, dot, mono caps) matches. | ok | — | — |

## 3 · Watching (`/watching`)

The audit user watches 0 shows, so only the empty state was drawn (B12 owns it). Status rows and chips on Watching are **unchecked**. Watching a cancelled, a postponed and a sold-out show is a DB write; the orchestrator should route it, then re-run `f3 watching`.

## 4 · Other row surfaces (F3): artist, venue, search, sheets

| route | viewport | board | what differs | severity | fix | owning lane |
|---|---|---|---|---|---|---|
| /artists/[slug] | all | more-st-rows_board ("rows · browse, watching, artist, crew") | Rows have the genre image ring but no row card, no left genre edge and no wash. | minor | Use the browse row treatment on artist rows (edge and card) | a6 (B10) |
| /venues/[slug] | all | 02-mobile/bp-m-venue_m (no rows drawn) | Rows are flat with the old day headers ("Tonight" in pink). | note | Undrawn for venue rows. The nearest pattern is the browse row and DayTile. Decide in B11. | a6 (B11) |
| /events Where sheet | 320, 390 | 05-filters/bp-f-filt_sheet_m | The sheet top edge is present and matches. The selected row's check icon is clipped at the right edge. | minor | Inset the check to the sheet's padding | a6 (B6) |
| search palette | 390 | 07-more-screens search | Artist rows use their own row (no ring, edge or VenueTile) | — | Already ruled: B19 | 9d |
| all consumer pages | 320, 390 | — | The "TELL US · BETA" side tab sits above a modal sheet and over row prices ("tba" clipped on `/venues/[slug]`) | minor | Put it under the sheet's z-index, and give rows right padding or hide the tab while a sheet is open | a6 (B20) |

## 5 · Invite landing (`/`, `/auth/code`): B24, signed out, three themes

| route | viewport | board | what differs | severity | fix | owning lane |
|---|---|---|---|---|---|---|
| / | all | 11-signed-out/inv-mob, inv-desk, inv-light | The brand lockup is the bare glyph. The board has the app-icon tile (rounded square, dark in Electric, white in Light) left of the wordmark. | minor | Use the icon tile (F4 `VenueTile`/app icon) in the landing header | 11 |
| / | 1300 | inv-desk | The venue tiles wrap to two rows (12 + 1 orphan). The board shows one row of 12. | minor | Cap at one row (12) or size the tiles to fit | 11 |
| / | all | inv-mob, inv-desk | Times read "7PM". The board's ticker reads "6:00 PM" and the cards "6 PM". | minor | Ticker: `h:mm PM`. Cards: `h PM` with a space. | 11 |
| / | all (Light worst) | inv-light, inv-mob | Before its image arrives, a show card is a blank fill. In Light it is near-white with a grey scrim and looks broken. On the board a card always has art. | minor | Give the card a dark art ground or IdentityArt until the image loads | 11 |
| / | 320 | inv-mob (390 only) | The code field is below the fold at 320×568 (the first screen ends at "GOT AN INVITE?"). | minor | Shorten the fan below 360 px so the field shows. Nearest pattern: the 390 board keeps it above the fold. | 11 |
| / | all | inv-mob | Placeholder `BETA-XXXX-XXXX` against the board's `CRAWL-XXXX`; "19 venues · checked every night" against "21 · crawled every morning" | note | Correct per plan (real code format) and copy review; the count is data | — |
| /auth/code | all | none drawn | Step 1 of 2 form | note | Undrawn. Nearest pattern is the landing's invite field, and it matches. Not a Design gap. | — |
| / | all, 3 themes | inv-light, inv-mob | Electric, Light and Pulse all draw; Pulse keeps contrast | ok | — | — |

## 7 · Invite posters (admin, #91–#95)

The scratch data has **no multi-use code**, so the Posters tab shows its empty state. The Night, Paper and tear-tab sheets, the preview, and `/I/<code>` are **unchecked**: minting a code is a DB write. The `/I/<code>` row also puts a code in the URL, so it is walked by hand.

| route | viewport | board | what differs | severity | fix | owning lane |
|---|---|---|---|---|---|---|
| /admin/invite-codes/posters | 390, 640 | invite_poster/screens/admin-posters-mobile | **The Look picker breaks.** "Night" spills out past the left edge, the descriptions overlap, and at 640 "Paper"'s text runs off the right. The mobile board is a plain two-segment Night \| Paper toggle with no descriptions. | blocker | Below `lg`, render Look as the board's two-segment toggle | au2 |
| /admin/invite-codes/posters | 1300 | admin-posters-desktop | The print row is QR as SVG (left), then Print poster. The board has Print poster (primary, left, wider), then QR as SVG. | minor | Swap the order and widths | au2 |
| /admin/invite-codes/posters | 1300 | admin-posters-desktop | The breadcrumb reads "Invite codes › Details". The board reads "Invite codes / Posters". | minor | Name the Posters crumb | au2 |
| /admin/invite-codes/posters | 390 | admin-posters-mobile | The mobile page shows the Codes / Posters tabs. The board has a "← Invite codes" back link and no tabs. | minor | Use the back link on mobile | au2 |
| /admin/invite-codes/posters | all | admin-posters-desktop | The admin shell (ADMIN pill under the wordmark, User app/Admin switch, no ⌘K or avatar) differs from the board's shell | note | Pre-existing shell; the admin redesign (#122/#129) owns it | admin redesign |
| /admin/invite-codes/posters | all | none drawn | Empty state "No poster codes yet" with no preview frame | note | Undrawn and small; reads fine. Not a Design gap. | — |

## 8 · Wrong-artist report, admin side (#115 W4)

The scratch data has **0 reported rows**, so the Reported queue, the expanded row, the Artists badge and the bell category are **unchecked**. Clicking `Reported (0)` leaves Ambiguous selected. Seeding one fan report (DB write) would let `s8 reported` run. What is visible matches `wrong_artist_report/screens/admin_artists`: the chip row with Reported first, and the counts. The intro copy and shell differ from the board; that is the pre-existing admin page and shell, owned by #122.

## Static findings (au2, folded in, already routed)

| surface | finding | severity | fix | owner |
|---|---|---|---|---|
| all | No inventory declares `shares`, so check-shared checks nothing | setup | Add `shares` {binding, module} for surfaces 1–5 | au2 |
| 6 venues index | Undeclared `--font-sans` (VenueFeatureCard, VenueRow, VenueIdentityTile) | minor | `var(--font-ui)` | au2 |
| consumer | Undeclared `--signal-wash` (submit-price/VendorField.tsx:183): the selected vendor paints nothing | minor | Declare it or use an existing wash | au2 |
| 6 glyphs | 43 hex hits in glyphs.ts and VenueTile are deliberate board colours | low | File-level `fwd-allow-hex` with a reason | au2 |
| 4 rows | Image ring glow copied twice (EventRow 10 px, HeroEventCard 12 px) | minor | One shared ring helper, matched to the board | au2 |
| 4 | `small-event-row/SmallEventRow.tsx` has no importers | low | Delete | au2 |
| 3 Concerts | StubStamp where the board has VenueStamp | — | Ruled: already in a6's held B12 PR | a6 (B12) |
| 4 search | Search rows lack ring, edge and VenueTile | — | Ruled: B19 | 9d |
| B18 | No sheet edge on DeleteAccountSheet and LifecycleSurface | minor | Add `sheet-edge` | a6 (B18) |
| 2 | Status chip placement | — | The runtime check above supersedes it; the StatusPill→StatusChip swap is dropped | au2 |
| 6 | Mission Ballroom disco-ball glyph vs the building | — | Settled: Hugh accepted it as drawn on 2026-11-11 | settled |

## Design via Hugh (meaningful undrawn gaps)

None. Every ambiguity above resolved from a drawn pattern. au2's Mission Ballroom glyph question is settled: Hugh accepted the glyph as drawn on 2026-11-11.

## Re-run on the scratch fixtures (2026-11-12)

9d seeded the fixtures on the scratch branch only: watched cancelled, postponed, sold-out and removed shows, a promoted sold-out report on a first-page show, poster code `BETA-AUDT-0001` (25 seats), and an open wrong-artist report on `/artists/youth-fountain`. Every previously unchecked cell was re-run on the local stack.

**Themes.** No per-pass DB write was needed. The kit fails any cell whose page doesn't draw the asked-for theme, and every signed-in Light and Pulse cell passed and drew its theme. The signed-in theme cells are checked.

| Surface | Cells | Result | Finding | Severity | Fix | Owner |
|---|---|---|---|---|---|---|
| 2 `/events/[id]` postponed | a4 `postponed-cta`, 9 | checked | Same shape as cancelled: the Your move block and watch strip came first, and the status card sat below the info rows. The board (`more-st-ev_post_m`) puts the card under the hero, then Watching for the new date. | major | Fixed in #157 alongside the cancelled fix | 11 |
| 1 `/events` sold-out row | a4 `sold-out-chip`, 9 | checked | SOLD OUT sits in the price slot at the row's right. The board (`more-st-rows_board`) puts it inline after the name, with `—` in the price slot. | minor | Chip inline after the headliner; price slot shows `—` | a6 |
| 1, 3 row edge | b5, f3 `watching` | checked | The left edge takes the genre colour on a sold-out row. On the board, status wins: pink for sold out, red for cancelled, amber for postponed. | minor | Status tone overrides the genre edge on status rows | a6 |
| 3 `/watching` | f3 `watching`, 12 | checked | Watching rows have no left edge and no genre chip. The board's rows (shared by browse, watching, artist and crew) have both. | minor | Use the browse row's edge and chip on Watching | a6 |
| 3 `/watching` removed | f3 `watching` | checked | The watched removed show (fixture 71c2d6c5) isn't listed at all. The board draws a dashed "NO LONGER LISTED" row with "The venue took this show down. It may be off." | major | Render the removed watch as the No longer listed row (A5 shipped the state in the API) | a6 |
| 3 `/watching` cancelled, postponed | f3 `watching` | checked | Confirms the rows major above: the date is struck and the title isn't, and postponed is struck too. | (above) | (above) | a6 |
| 7 Posters | s7, 12 | checked | Confirms au2's blocker: the Night/Paper picker overlaps its own sub-lines at 390, 640 and 1300. The code card, seats line and preview all render. | (blocker above) | (above) | au2 |
| 8 Reported queue | s8, 24 | checked | Renders: Reported (1), a row with a `1 REPORT` badge and a Reports action, and an Artists nav badge of 1. The sheet's `reported` cells still showed Ambiguous selected because the click landed before hydration (a probe that waits passes). The inventory now waits for the table before clicking. | none | — | — |

**Still unchecked:** the bell's wrong-artist category (s8) needs a notification row, and `/I/<code>` for the poster code wasn't sheeted (no inventory row).

## Needed before the unchecked cells can run (DB writes, orchestrator to route)

1. Set the audit user's saved theme per pass (Electric, then a genre theme) for the signed-in theme passes of surfaces 1–4.
2. The audit user watches one cancelled, one postponed and one sold-out show (surface 3; A4 postponed CTA).
3. One promoted sold-out report and one visible postponed event (A4 `sold-out-chip`, `postponed-cta`).
4. One multi-use poster code (surface 7 sheets, preview, `/I/<code>`).
5. One open fan wrong-artist report (surface 8 queue, badge, bell).

## Counts

| severity | a6 | 11 | au2 | total |
|---|---|---|---|---|
| blocker | 0 | 0 | 1 | 1 |
| major | 3 | 3 | 2 | 8 |
| minor | 14 | 7 | 3 | 24 |

Counted from the runtime tables only, including the 2026-11-12 re-run; au2's static rows are separate. The a6 minors include the B6/B10/B17/B20 items, which ride with those screen PRs.
