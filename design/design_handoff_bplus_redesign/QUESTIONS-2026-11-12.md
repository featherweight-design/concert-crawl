# B+ redesign: questions for Design and Hugh (2026-11-12)

Places where a B+ board conflicts with itself or the README, or leaves a state undrawn, found while building; each row says what the lane built in the meantime, and Design should draw or confirm it (a held item holds only its own state, not the whole PR).
Tags: **[Design]** needs a drawing or a design call, **[Hugh product]** needs a product ruling from Hugh, **[eng/data]** needs an engineering or data-source decision. Wording-only items go to copy-review and are not listed here.

Answered in #178: 41 rows removed (items 1, 2, 3, 4, 6, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28), 1 trimmed (item 18, the signed-in global-error). Items 25 (the account glyphs) and 28 (the counter rail and success preview) are only partly answered, so their rows stay. Note that #178's "as built is fine" means live main, not the held PR.

## B7 Browse calendar week strip (#121)

| board | what it says | the question |
| --- | --- | --- |
| `bp-s-cal_jump_m` | Month grid with genre dots | [Design] The availability API has no genres, so the dots show volume. Accept volume dots, or does the grid need genres? |
| `06-states/bp-s-load_browse_d` | The desktop skeleton draws B6a's segmented bar | [Design] The skeleton draws main's current bar and follows B6a when it lands. Confirm. |

## B9b Price counter (branch)

| board | what it says | the question |
| --- | --- | --- |
| `more-st-counter_m` rail | An icon tile and a close button | [Design] Not built (ModalShell has neither). They get built in B9b slice two unless Design drops them. |
| `more-st-counter_done_m` | A card preview inside the success sheet | [Design] Not built. Built in slice two unless Design drops it. |

## B11 Venues (#116)

| board | what it says | the question |
| --- | --- | --- |
| `10-venue-art` | Multicolour neon and skyline, mountain and star backdrops | [Design] Simplified to each venue's two-stop gradient on brick. Accept, or is the full art owed? |
| Name gradient ("Red Rocks", "Church") | One word of the name takes the gradient | [Design] Not built: there's no rule for which word gets it. What's the rule? |

## B12 My shows (#126)

| board | what it says | the question |
| --- | --- | --- |
| `bp-artists` | The dashed find card isn't drawn | [Design] Removed. Confirm. |
| `bp-s-empty_*_m` | Only phone empty boards exist | [Design] Desktop empties reuse the phone layout, and the empty art is approximate. Draw the desktop empties, or confirm. |
| `bp-s-load_*_m` | The Artists skeleton has a headline block the live page lacks | [Design] Built as drawn. Confirm, or drop the block. |
| Empty Artists board | Shows "Artists 271" | [Design] Built hidden when there are no follows. Confirm. |

## B13 Passport (#123)

| board | what it says | the question |
| --- | --- | --- |
| 11-night vs 4-night boards | Jump to is on the 11-night board, not the 4-night one | [Design] Built on desktop for more than 4 nights. Confirm the threshold. |

## B14 Crews (#128)

| board | what it says | the question |
| --- | --- | --- |
| `more-r3-crew_been_m` | The crew "been" empty state | [Design] Not restyled: it needs `EmptyState layout="card"` (in held #121). Confirm that's the target. |

## B18 Settings (#154 B18a, #155 B18b, #156 B18c)

| board | what it says | the question |
| --- | --- | --- |
| `more-s-d_account`, `more-s-settings_m` (Account) | Icon rows | [Design] Built with mail and document glyphs. Confirm. |

## B20a Something went wrong page (#117)

| board | what it says | the question |
| --- | --- | --- |
| `12-error-page` | Sign out | [Design] `global-error` can't reach Clerk, so a signed-in visitor gets Go home there instead of Sign out. #178 item 18 settles only the signed-out fallback (`__client_uat` missing or a 401). Confirm Go home for the signed-in case. |

## B21 What's new (#120)

| board | what it says | the question |
| --- | --- | --- |
| `07-more-screens/more-r3-whatsnew` | Prices card links "How prices work →" | [Hugh product] There's no page to link to, so the card ships with no link. Build the page, or keep the card linkless? |

## B22a Install slot and iPhone sheets (#130)

| board | what it says | the question |
| --- | --- | --- |
| `bp-s-install_d` | The install pill sits left of search | [Design] `AppHeader` renders right slots after search, so the live order was kept, to move in B17. Confirm the target order. |
| `bp-s-install_ios_m` | No × on the sheet | [Design] The shared `BottomSheet` × stays (44px targets). Confirm. |
| `bp-s-install_dismissed_m` | Drawn inline in the Browse list | [Design] Built as a fixed status card at the same place in the flow, because the slot lives in the header. Confirm. |

## B23 Launch animation (#143)

| board | what it says | the question |
| --- | --- | --- |
| `bp-s-launch_k110_m` to `k590_m` | Frames of a live canvas | [Design] Built to the README timeline table. Confirm. |

## A4 and A5 Cancelled and No longer listed (#140, #151, #157)

| board | what it says | the question |
| --- | --- | --- |
| `more-st-ev_canc_m` | A solo show; the chip sits "under the genre chip" in a centred hero | [Design] Chip placement with openers is undrawn; it's kept after the whole title block. The hero isn't B8's centred layout yet, so the chip is under the title. Confirm both. |

## W3 Report a wrong artist match (#133)

| board | what it says | the question |
| --- | --- | --- |
| `page_m`, `page_d` | The card sits "under Listen" | [Design] Listen isn't always last on today's page, and desktop has no right column, so the card ends the main column after the player. Confirm. |
| `sheet_empty_m`, `sheet_m` | Genres on the match panel | [Design] No genres shows a plain `ON SPOTIFY`; no match hides the panel. Confirm. |
| `already_m`, `already_d` | The withdraw-failure line is undrawn | [Design] It follows the error sheet's pattern. Draw it, or confirm. |
| `error_m` | Bodies for a 429 and a lost session are undrawn | [Design] They follow the error sheet's pattern. Draw them, or confirm. |
| README: signed-out tap | "sign-in, same as status" | [Design] The event page uses the tier picker (`logged-out-artist-report`), and that's what was built. Which is right? |

## Other B+ fixes (#153, #158)

| board | what it says | the question |
| --- | --- | --- |
| `02-mobile/bp-m-venues_m` | The vendor picker's selected state isn't drawn | [Design] A one-token change, read from code. Confirm the selected state. |
| `06-states/bp-s-push_ios_m` and the other sheet boards | Each sheet is drawn alone | [Design] The follow nudge and the push sheet show one at a time, nudge first. Confirm. |

## Undrawn widths (lane 11)

Both of these already happen on main. Screenshots are available from lane 11 on request.

| board | what it says | the question |
| --- | --- | --- |
| 06-states/bp-s-offline_pill_m (390 only) and the desktop top nav (1300) | At 640 (sm), signed in and offline, the top nav holds the wordmark, Browse / Venues / My shows / Crews, search, the offline pill and the avatar. They don't fit: Crews is clipped behind search, the pill runs off the right edge, and the avatar is pushed off-screen. | [Design] What does the 640 top nav drop or collapse while the offline pill is showing? |
| 08-prices-and-status/more-st-ev_post_m (390) | At 320, a long one-word headliner in the event hero title is clipped mid-word ("DeathByR"), with no wrap and no ellipsis. | [Design] At 320, should a long hero title wrap, shrink, or ellipsise? |

## New from addendum 2 (#178)

Contradictions #178 itself introduces. Build #178's ruling meanwhile.

| source | what it says | the question |
| --- | --- | --- |
| #178 items 5, 15, 17, 19 | "As built is fine" | [Design] It was written against live main, but the held PRs moved away from live: #126 (Going line), #144 (nav label 10px), #116 (date groups, truncated stats), #121 (lead-genre dots). Confirm it means live, so those PRs change back. |
| #178 preamble vs item 5 | "README rules win over a board", but item 5 lets the board's "Going to this show?" beat the README's "Going? In N days." | [Design] Harmless here (live copy wins too), but which precedence holds the next time board and README disagree? |
| #178 item 25 vs item 29 | Account menu: @handle, else display name, "rules in item 29". Item 29: first name, else @handle, else the masked email | [Design] Two different fallback orders under one pointer. Proposed: item 25 is the fan rule, item 29 the admin rule. Confirm. |
| #178 item 21 | A failed pull to refresh closes and shows the offline pill | [eng/data] The pill keys on connectivity, so after a 5xx while online it would be a false state. Does a refresh error count as offline, or does a failure just close? |
| #178 item 14 | Pending banner "A fan reports tickets are back." | [Design] Not marked (new copy), and it differs from the shipped "A fan reports tickets are on sale again." Confirm it is new copy, so it goes through copy-review. |
| #178 item 22 | Start translate `translate(131px, 358px)` on 390 × 844 | [eng/data] Absolute values for one screen size. Build derives the centring from the viewport; confirm the numbers are an example, not a constant. |
| #178 item 20 | Shelf grows to 10 cards and scrolls sideways | [Design] The approved desktop board (5 cards, 960 of 1040, no scroll) that #146 matched goes stale. Confirm the addendum wins on desktop too. |
| #178 item 12 | NLL CTA checks No longer listed before the cancelled branch; source line shows "SINCE {date}" | [eng/data] Needs `delisted_at` in the event payload sent to the client. Confirm it's carried (data contract). |

## From lane 9d: unbuilt or left as live (2026-11-12)

| board / PR | what it says | the question |
| --- | --- | --- |
| Header with the offline pill, 640 to 1023 | Undrawn between the 390 phone board and the 1300 desktop header. | [Design] The desktop header clips the Crews nav item and cuts the pill at the right edge (the same as lane 11's 640 row). What collapses? |
| #138 notifications tabs | Tabs drawn with items only. | [Design] The empty tab state; per-tab unread dots; the label for an unknown category; the tabs when the list is empty, loading or failed; the sold-out glyph differs between the desktop and phone boards. Which one? |
| #136 status banner | The VIEW evidence link is always drawn. | [Design] VIEW shows only when the evidence URL is safe. What replaces it when it isn't? The time-ago on the banner, and the method line with no URL, are undrawn. |
| #155 Submitted prices filters | The board shows only Confirmed. | [Design] The empty-filter state is undrawn. Which statuses map to the "Live" and "Price checks" filters? |
| #154 avatar | #178 item 25 says "solid band". | [Design] A single-colour avatar draws a faint stripe overlay. Solid, or the stripe? |
| #144 account row | Name from @handle or the display name. | [Design] What the row shows when the user has neither a handle nor a display name. |
| #156 glyphs | Mail and document glyphs. | [Design] Not addressed by #178 item 25. Which glyphs? |

Lane 11's two rows (the 640 offline top nav and the 320 hero title) are already in "Undrawn widths (lane 11)".


## Lane a6 (bp2): open after addendum 2 (#178)

None of these was decided by the lane. Rows 2, 5 and 6 BLOCK; the rest are minor. Row 27 (the passport image route taking 16s) is an engineering check and is left out.

| # | PR | Question | Left as |
|---|---|---|---|
| 1 | #121 (2f845c74) | A day whose shows carry no known genre: #178 says nothing. A strict reading of item 19 draws no dot; the strip currently draws one signal dot. | One signal dot (unchanged) |
| 2 **BLOCKER** | #146 (f3931a84) | Caveat 7: item 20's 10-card sideways scroll contradicts the approved desktop board (5 cards in 960 of 1040, no scroll). | Built to #178 at every width; the desktop board is now stale |
| 3 | #146 | When does "See all" show? Item title says "past five cards"; bullets give no condition. | Shows whenever "Your artists" renders |
| 4 | #146 | Design open question 5: See all → My artists filter (built) or My shows ▸ Artists? | My artists filter (`filterFollowing=1`) |
| 5 **BLOCKER** | B10 (d3ee6e96) | Item 27 wants the artist's own genres mapped to 16 buckets. The API has no artist-level genre (no column; a code comment says "artists carry no genre of their own"). The options are `match.genres` (Spotify, often null), a new API field, or a ruling that show genres are what Design meant. | Chips still derive from upcoming shows, as raw labels |
| 6 **BLOCKER** | B10 | Item 11 calls 190 × 230 at −2.5° "the loaded card's size", but the loaded card is 200 × 250 at −2°. The skeleton now matches the board, so the page jumps slightly on load. Should the loaded card change too? | Skeleton 190×230/−2.5°; loaded card 200×250/−2° |
| 7 | B10 | Desktop skeleton has no board for item 11. | −2.5° tilt applied on desktop too |
| 8 | B10 | Skeleton corner radius and outline: the board has 18px and 2px, the build 16px and 1px. | Unchanged |
| 9 | B10 | With Follow not sticky, should the back + name scroll bar stay? (It's on main; no board says.) | Kept |
| 10 | B9b (fe8c0874) | Chip styling: the board draws 34px chips, 13px text, selected text in fg, and a 9px label. The shared ChipGroup (also used by SubmitPriceModal) differs. | Shared ChipGroup unchanged |
| 11 | B9b | Submit gradient: the board is 135° with a glow; the build is 90° with none. | Unchanged |
| 12 | #126 (d08cb972) | The mobile board `bp-m-watching_m` still draws "Going? In 3 days." on one line, but #178 rules the full "Going to this show?" heading. | #178's ruling; it wraps on phones |
| 13 | #116 (7a5985a1) | #178 says each Upcoming row "carries its own date tile", but `bp-venue` draws the date as text on the row, with the artist photo on the left. | Board (no tile added) |
| 14 | #116 | Light venue boards draw no venue tile by the name; the dark boards do. | Tile kept |
| 15 | #116 | Light board back-button background 55% versus the shared BackChip's 82%; name 32px against 30px; stat values 20px/800 against 22px bold. | Unchanged |
| 16 | #116 | Is the pale wash Light-only (as #178 says), or for every light-ground theme? | Light only |
| 17 | #117 (d720785) | What does Done on the refused state do? It isn't drawn. | Closes the card, keeps the error ID |
| 18 | #117 | 408 and 425: refused or temporary? #178 names only 429 and "a 4xx rejection". | Temporary (saved, retried) |
| 19 | #117 | Routes outside `(main)` (`/me`, `/search`, admin), and errors in the `(main)` layout itself, still get the bare page. That conflicts with "only global-error is bare". | Bare |
| 20 | #117 | Design open question 7: rate limit and rejection share one wording and the LIMIT code. | Shared |
| 21 | #123 (c3d673ed) | Stamp face: the boards draw a solid outer ring, a dashed inner ring, a bare glyph and a straight date. The build uses the shared VenueStamp in a band, with the date on an arc ("one stamp everywhere"). | Shared VenueStamp |
| 22 | #123 | NEXT ghost centre: the boards draw a greyed venue tile; the build uses the dashed stamp (README rule 4). | Dashed stamp |
| 23 | #123 | Empty ID page shows "SINCE SEP 2026" and "4N4V" on the board, but an empty book has no data for either. | "since" omitted; 0N0V |
| 24 | #123 | Up next on an empty desktop book isn't drawn. | Between the empty block and Venues collected |
| 25 | #123 | The PNG share card still draws tilted square stamps. Does "everywhere" include it? | Unchanged |
| 26 | #123 | The empty phone board says "Passport"; the build shows "Your Passport". | Unchanged |
| 28 | #116 (#178 item 17) | Venue page stats wrap to 2 lines and never shrink, but a single long word wider than its column can't wrap at a word boundary, so at 390 "Amphitheater" breaks mid-word as "Amphithe / ater" (Red Rocks). Is a mid-word break OK, should it hyphenate ("Amphithe-ater"), or may the word shrink? | Mid-word break (as built) |
| 29 | #113 (#178 item 6) | The desktop filter bar is drawn only at phone and desktop widths. At 640 (sm, undrawn) its six segments leave too little room: Where truncates to "R…" even with a short venue name, and When to "Th…". What should the bar do between phone and desktop: hide segments, wrap, use the phone chips, or go icon-only? | Truncated (as built) |
