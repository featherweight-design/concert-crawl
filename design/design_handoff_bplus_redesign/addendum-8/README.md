# B+ · Design addendum 8, batch 4 (2026-11-21)

Design's answers to batch 4: five gaps Hugh found while using the app, plus the readiness-review follow-up (2026-11-22) and a sixth item, highlighting shows by artists you Follow. Each was undrawn on the current boards, or drawn the opposite way. Every answer was checked against `origin/main`: `artist-page/PastShows.tsx`, `passport/PassportBooklet.tsx` and `lib/passport/booklet.ts`, `passport/PassportCard.tsx` and `app/passport/[ratio]/route.tsx`, `history/HistoryHeader.tsx`, and `event-title-block/` with `following/bill/BillFollowBlock.tsx`.

Canvas: https://claude.ai/artifact/AaMXETxSNGUgpH38p6QDtQ (its own canvas). Sources: `/mnt/project-files/design/batch-4/` in the project files (`b4.py` boards, `boards.py <dest>` exports, `prev.py` previews, `canvas.py` builds the page).

**All new wording on these boards is draft.** It goes through `copy-review` before it ships. These boards win over any earlier board they contradict; the earlier addenda's rulings still stand.

`NN/board` means `screens/NN-<section>/board.jpg` (2x JPG); the HTML is in `boards/`. All boards use the B+ kit and the approved venue glyphs.

**Build-vs-design check:** before the PR that builds any of this is ready, screenshot each touched screen at 320, 390 and 1280 against these boards and list the diffs in the PR body. Reuse the live components named below (`PastShows`, `WentPill`, `PassportBooklet`, `VenueStamp`, `HistoryHeader`, `EventTitleBlock`, `BillFollowBlock`, `FollowButton`); don't fork a second version of any of them.

| # | Item | Answer |
|---|---|---|
| 1 | Artist page: a past show opens its event | **Drawn:** the whole row opens `/events/{id}`; a 16px chevron after the I went pill is the affordance. Hover, pressed and focus drawn. The row keeps its live height (about 76px) and the crawl-window note stays. `01/*` |
| 2 | Passport: the card keeps its size when you page | **Recommended (b): a fixed page height.** Every leaf, the ID page included, is 300px on a phone and 340px on desktop, and the phone pairs leaves like desktop (ID + 1, 2 + 3, …). Option (a) is drawn for comparison. `02/*` |
| 3 | Passport share image | **Redrawn** as the booklet: ID head, one stamp page, ID foot. The stamp grid scales with the nights (1 × 1 up to 5 × 4, rows centered, +N more past 20). Still 1080 × 1080, rendered at 2160 × 2160. `03/*` |
| 4 | Concerts header stats | **Redrawn:** Spent is gone; values are 22px on a phone (was 28) and 30px on desktop (was 44). Top venue spans two columns on a phone. `04/*` |
| 5 | Co-billed shows | **Drawn:** each act name is its own link in the heading (plain text when it has no page); On this bill has one row and one Follow per matched act, with a CO-HEADLINER or SUPPORT tag. Phone shows 2 names then +N more, which expands in place; desktop 3. `05/*` |
| 6 | Shows by artists you Follow | **Drawn:** a --signal check disc on the row and hero-card thumbnail, the followed act's name in --signal, and a “YOU FOLLOW …” line on the event page. Any act on the bill counts. Nothing signed out. `06/*` |

## Decisions only Hugh can make

1. **Passport paging: fixed page height (b) or a pinned ID strip (a)?** Hugh pre-approved this batch, so b is drawn as the answer.
   - **b (recommended, drawn): a fixed page height.** One height constant per width, and `bookletSpreads` steps by 2 on the phone too. The ID page stays a real page. Engineering's note agrees it is the cheaper build.
   - **a: a 56px ID strip pinned above every page.** Holds the size too, but the ID page becomes a strip (the MRZ line, top genre and Since date have nowhere to go), and it needs a new component.

## 1. Artist page: a past show opens its event

The artist handoff (§Previously, call 13) said a past show isn't actionable. Hugh wants it to open the event page, which renders past shows. The live row is no longer the handoff's 38px date-and-venue line: Edit your Concerts replaced it with a 48 × 56 date tile, the venue tile, year · city, and the I went pill (`artist_past_m`). That row stays.

- **Affordance** (`01/artist-past-m`, desktop `01/artist-past-d`): a 16px chevron in `--fg-subtle` closes the row, after the pill. No card, no border change: the row already sits in a list like Upcoming's.
- **Target:** the whole row is one link to `/events/{eventId}`. The pill is not inside it: lay the link over the row (a stretched link) and lift the pill above it, so no button is nested in an anchor. The pill keeps its own 44px target and never opens the event.
- **States** (`01/artist-past-states`): hover (desktop) fills `--surface-1`, 8px past the column with radius 12, underlines the venue and turns the chevron `--fg`; pressed fills `--surface-2`; focus-visible draws a 2px inset `--signal` ring on the same shape. No scale or ripple.
- **Row height:** unchanged, about 76px (10px padding around the 56px tile). The 38px row is superseded.
- **Crawl-window note:** stays under the list, unchanged. It keeps the list from claiming to be complete.
- **Accessible name:** "{Venue}, {Mon D, YYYY}". The chevron is decorative.

## 2. Passport: the booklet holds its size

Today the phone shows ID + page 1 stacked, then one stamp page per swipe, so the card shrinks after the first swipe (addendum 2 `04/passport-later-m`). Desktop pairs leaves and mostly holds, but nothing fixes its height either.

- **The rule** (`02/passport-hold-m`): every leaf, the ID page and each stamp page, is **300px on a phone** (the stamp page's natural height) and **340px on desktop**. Nothing inside a leaf sets its height. The ID page lays out as a column with the MRZ line pinned to its foot.
- **Phone pairing:** two leaves per view, as desktop: ID + page 1, then 2 + 3, then 4 + 5. `bookletSpreads` steps by 2 for both layouts. The card is 601px on every spread.
- **An odd last page** gets a blank partner with four dashed empty slots and its page number (`02/passport-odd-m`), as desktop's "next page is waiting".
- **Pager** (draft copy, the live pattern with pages paired): **“SWIPE FOR PAGES 2 · 3”** while another spread follows, and **“PAGES 2 · 3 · 11 NIGHTS”** on the last spread. The boards show both: `passport-hold-m` spread 1 is not the last; `passport-later-m` and `passport-odd-m` are. The label truncates at 320px, as live. Swipe, arrows and dots move one spread at a time.
- **No stamp pages yet** (`02/passport-zero-m`): spread 1 is always ID + page 1, so the card is 601px from day one. Page 1 holds the dashed NEXT stamp and three empty slots when a show is coming up (addendum 4's interim), or four empty slots when nothing is. No pager while there is one spread; no Share or Save.
- **ID page at 320px** (`02/passport-id-320`): the leaf keeps 300px; the stats gap goes 22 → 16px; a long top genre ellipsizes to fit the row; stamps 108px.
- **320px:** the leaf keeps its height; the stamps step down from 124 to 108px so two columns fit.
- **Desktop** (`02/passport-spread2-d`): unchanged in look; both leaves pinned at 340px so a short page can't shrink it.
- `02/passport-later-m` supersedes addendum 2's `04/passport-later-m`. `02/passport-option-a-m` is option a, for comparison only; its three notes are plain bullets (the first pass mislabeled them a, b, c).

## 3. Passport share image

The live card (`PassportCard`, mode `share`) is a fixed 4 × 4 wall of tiles with glass pills and a bottom scrim, so one night is one tile and fifteen empty spaces. The redraw uses the on-page Passport parts instead.

- **Dimensions:** **1080 × 1080 design, rendered at 2× (2160 × 2160 PNG)**, unchanged. `PASSPORT_DIMENSIONS.square` and `PASSPORT_PRINT_SCALE` stay; only the card changes.
- **Bands, top to bottom:** ID head 236px (PASSPORT · 2026, wordmark, avatar, handle, DENVER · SINCE), dashed gutter, stamp page 596px on the dotted paper, dashed gutter, ID foot 244px (NIGHTS, VENUES, TOP GENRE, then the MRZ line). Side padding 64px.
- **Stamps:** the booklet's ink stamp (round ring, artist on the arc, venue glyph, date), with the booklet's tilt in order: −8, 6, 4, −5, 7, −4, −7, 5, 3, −6 degrees. Oldest first.
- **Fill rule** (`03/share-fill-rule`): nights → grid → stamp size on the 1080 design.

| Nights | Grid | Stamp |
|---|---|---|
| 1 | 1 × 1 | 400px |
| 2 | 2 × 1 | 330px |
| 3–4 | 2 × 2 | 250px |
| 5–6 | 3 × 2 | 236px |
| 7–9 | 3 × 3 | 182px |
| 10–12 | 4 × 3 | 172px |
| 13–16 | 4 × 4 | 136px |
| 17–20 | 5 × 4 | 132px |
| 21+ | 5 × 4 | 132px: the newest 19, then a dashed “+N MORE NIGHTS” stamp |

- Rows are centered, so a short last row never shows an empty slot. The stats always count every night.
- **The three fills:** `03/share-1-night` (singular NIGHT and VENUE), `03/share-7-nights` (typical), `03/share-24-nights` (full).
- **Avatar and handle** (`03/share-avatar-handle`): a profile photo fills the 84px circle with its 3px ring; with no photo, the initial avatar in the person's own colors (`PersonAvatar`); with no handle, the live fallback **@you** (`passportHandle`), and the MRZ line reads YOU. The card never prints an email or a real name.
- **Long names on the arc** (`03/share-long-names`): up to 18 characters at the base size (7.5% of the stamp); 19 to 24 shrink to fit, never below 5.5%; over 24, cut at the last space before character 23 and end with "…" (mid-word only if one word is longer than 23). The venue is never written on a stamp (its glyph is the venue), so venue length doesn't matter. Same rule in the booklet.
- **Alt text** (`03/share-alt-text`, draft): "{handle}'s Concert Crawl Passport, {year}: {N} night(s) at {V} Denver venue(s), top genre {genre}. Stamps for {first three artists} and {rest} more." One night names the venue and date instead; no top genre drops that clause. It goes on the preview `<img>` in the share sheet and the Save image preview, and is sent as the text line where a share target takes text (a PNG carries no alt).
- **Retired:** the tile wall, the glass pills, the bottom scrim and `PassportMoreTile`. Satori has no backdrop blur, and nothing here needs one. The card still takes the viewer's theme tokens.

## 4. Concerts header stats

- **Spent is gone** on every width: drop the `spent` tile from `historyTilesFor` (and its copy key once unused). `totalSpent` can stay in the API.
- **Sizes:** values 22px on a phone (was 28), 30px on desktop (was 44). Labels stay 10px mono.
- **Phone** (`04/concerts-stats-m`, `04/concerts-stats-320`): three columns. Row 1 Nights, Venues, Artists; row 2 Top genre, then Top venue spanning two columns on one line with an ellipsis.
- **Desktop** (`04/concerts-stats-d`): one row of five; Top venue max 300px with an ellipsis.
- **A missing stat has no tile** (`04/concerts-stats-missing`): never a dash or an empty slot (`historyTilesFor` already skips nulls). Phone row 1 is always Nights, Venues, Artists. Row 2 holds whichever word stats exist: both → genre one column, venue two; only one → it spans all three; neither (a new user, or no genre data) → no row 2. Desktop: one row of the tiles that exist, left-aligned.
- The Since line, the gradient rule and Top venue's gradient are unchanged. `04/concerts-stats-spec` lists before and after.

## 5. Co-billed shows

Engineering is giving every co-billed act its own artist page ("Galdive & rum.gold", "Clipse & J.I.D").

- **Heading** (`05/cobill-event-m`, desktop `05/cobill-event-d`): each co-headliner's name is its own link to `/artists/{slug}`, joined by a plain "&" (or "A, B & C"). Billing order from the listing; every name the same size. Signed out, the names are plain text, as the live headliner is. One `h1` with links inside; never wrap the heading in a link.
- **Link states** (`05/cobill-links-states`): rest is a 2px dotted underline in `--fg` at 40%, so two links read as two; hover (desktop) goes solid `--fg`; pressed turns name and underline `--signal`; focus-visible draws a 2px `--signal` ring with a 2px `--bg` gap, radius 8, around that one name.
- **Supporting acts** stay on the "with …" line (`SupportingLine`); only co-headliners go in the heading. The tilted card keeps the event image: a co-bill doesn't get two photos.
- **On this bill** (`05/cobill-bill-rows`): the live `BillFollowBlock`, one row and one Follow per act, co-headliners first in billing order, then support. New: a 9px mono `--fg-subtle` role tag after the name, CO-HEADLINER or SUPPORT, shown only when the bill has more than one headliner, so today's single-headliner events look unchanged. Follow all N keeps its live rule (only when two or more are unfollowed). Follow / Following is the only verb; the name is the link, the row is not.
- **3+ acts on a phone** (`05/cobill-3plus-m`): under 1024px the heading shows at most 2 names, then a **+N more** chip; desktop shows at most 3. Two names always show in full: long ones wrap to three lines, stepping 34 → 30 → 26px before anything ellipsizes.
- **+N more** (`05/cobill-expand-m`) counts every co-headliner not shown, matched to a page or not: it lists names, not pages. **Changed in the follow-up:** tapping it expands the heading in place to every name (unmatched ones as plain text) and becomes "Show fewer"; it no longer scrolls to On this bill, which leaves unmatched acts out. The chip is 28px with a `--border-strong` hairline, like the countdown pill.
- **An act with no artist page** (`05/cobill-unmatched`): its name is plain text in the heading, same weight and color, no underline, and it gets no row on On this bill (the block already drops slug-less names). The bill counts the acts it lists, so "1 artist", no role tags and no Follow all. With no matched act at all, the heading is plain text and On this bill isn't rendered, as today.
- **Older shows with no headliner list** (supporting artists null): today's single-artist heading, linked when the headliner has a page, else the old title. No co-bill treatment.
- Browse rows, Watching rows and the share images keep their one-line ellipsis; this rule is the event heading only.

## 6. Shows by artists you Follow

The old Following chip, hero badge and event-page strip only ever lit for artists imported from Spotify, and #756 removes them. This replaces them for the app's own Follow.

- **The color:** `--signal`, the Follow button's on color. `--accent` stays Watching. One color per verb. No Spotify mark and no "on Spotify" wording.
- **Rows** (`06/follow-browse-m`, `06/follow-browse-320`, desktop `06/follow-browse-d`): a 16px `--signal` disc with a dark check on the thumbnail's bottom-right, ringed 2.5px in `--bg`. The followed act's name turns `--signal` wherever the row prints it: the title, or the "with" line for a support act. Nothing else on the row changes, so it fits at 320px.
- **Hero card:** the same disc at 20px on the spotlight thumbnail, and the name in `--signal`. The ★ TONIGHT badge is untouched.
- **Event page** (`06/follow-event-m`, `06/follow-event-support-m`, `06/follow-event-many-m`, desktop `06/follow-event-d`): one line under the date, a 16px disc and **YOU FOLLOW {NAME}** in 10.5px mono `--signal`. Two acts: "A & B". Three or more: "YOU FOLLOW 3 ACTS ON THIS BILL". A followed support act is also `--signal` on the "with" line. On this bill already shows each act's Following state.
- **Which follows count:** the signed-in viewer's own follows (manual and onboarding picks alike), matched by artist id against every act on the bill, headliners and support. A row is marked when you follow anyone on it; the colored names show who.
- **Signed out, or following nobody on the bill** (`06/follow-browse-signed-out`): nothing. No disc, no color, no line. The public `/e/:id` mirror never shows it.
- **Screen readers:** the disc is decorative; the row's accessible name ends ", you follow J.I.D".
- `06/follow-spec` collects the marks and rules.

Out of scope: copy wording, and anything else on these screens.
