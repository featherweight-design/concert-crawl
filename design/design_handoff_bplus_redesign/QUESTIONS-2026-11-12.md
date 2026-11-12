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
| 08-prices-and-status/more-st-ev_canc_m, _post_m; addendum 2 13-cancelled-variants/* | The signed-in event page leads with the status card for a cancelled or postponed show. The public share page (/e/:id, PublicEventDetail, a6's B8) mounts no status card, only the cancelled CTA (Refund info, or the outlined Visit venue website). | [Design] Does the public share page show the same status card, a reduced one, or none? This is how main behaves today. |
| addendum 2 13-cancelled-variants/event-cancelled-by-crawler-m (item 13) | "FROM THE VENUE'S CALENDAR · 2H" for a cancellation from the crawler. | [Design] + [Hugh product] The crawler never writes cancelled or postponed: crawls upsert upcoming shows, the Live Nation fetcher drops cancelled rows, and the only automatic path (the stale sweep) renders as No longer listed. So a cancelled or postponed card with no fan report comes from an admin edit. What source line should an admin-set status show: "Confirmed by Concert Crawl", only the age, or the venue's-calendar line? Until answered, the drawn venue's-calendar line ships. |

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
| 30 | B9b price check update sheet (more-st-counter_m, more-st-counter_done_m) | The success preview strip draws "@rae saw $52 · 3h", but the API doesn't return the filer's handle. Should the POST return the handle, or is the card's "anonymous" label right? | Anonymous |
| 31 | B9b price check update sheet (more-st-counter_m, more-st-counter_done_m) | The strip shows "3h" on an update that was just filed. Is the drawn time a placeholder? | The real time ("0m ago") |
| 32 | B9b price check update sheet (more-st-counter_m, more-st-counter_done_m) | The preview shows the viewer's own update. If another fan's update is leading, the event-page card shows theirs after refresh, so the two disagree. Which should the preview show? | The viewer's own |
| 33 | B9b price check update sheet (more-st-counter_m, more-st-counter_done_m) | Withdraw from inside the success sheet isn't drawn. What does it do? | Deletes the update and closes the sheet |
| 34 | B9b price check update sheet (more-st-counter_m, more-st-counter_done_m) | The rail tile glyph is drawn as a cyan-to-pink line with a pink dot on a lighter square. Please confirm the glyph. | The CCMark brand mark at 22px (as SubmitPriceModal) |
| 35 | B9b price check update sheet (more-st-counter_m, more-st-counter_done_m) | The ring around the amber status dot looks neutral grey on the board. Grey or amber? | An amber tint |
| 36 | B9b price check update sheet (more-st-counter_m, more-st-counter_done_m) | No board for the already-in-review sheet or the error rail tone. | The same tile and close as the other states, "Price update · Waiting"; the error rail in --danger (SubmitPriceModal uses --warning) |

## Edit your Concerts (lane cf pre-audit)

Pre-build audit of `design/design_handoff_edit_concerts` (17 boards), 57 rows: 38 [Design], 16 [Hugh product], 8 [eng/data] (some rows carry two tags). Heaviest gaps: undrawn states (loading, error, empty, signed-out), no desktop boards for the event page and most of the Add sheet, and the unruled records start (CRAWL_SINCE). Hugh's rule applies: nothing undrawn gets built, so each [Design] or [Hugh product] row blocks its piece. Rows 1, 8, 53 and 57 were re-checked against the board images.

### PR2: Concerts list (menus, remove confirm, Undo toast)

| board | what it says | the question |
| --- | --- | --- |
| 1. concerts_m, concerts_menu_d, remove_dialog_d | README: desktop ⋯ shows on hover, focus and while open. Both desktop boards draw a ⋯ on every row, not only the one whose menu is open. | [Design] Always visible on desktop, or hover-only? |
| 2. concerts_m | README: tapping ⋯ on a past row goes straight to the confirm sheet. Share this night and Open the show page exist only in the desktop menu. | [Design] How does a phone user share a past night? Is dropping Share on phone intended? |
| 3. concerts_m, concerts_menu_d | Upcoming rows have a ⋯; no board shows what it opens. README: "opens today's un-going", but HistoryItem has no menu today. Plan D3 invents a three-item menu with a no-confirm remove. | [Design] Items, wording and confirm for the upcoming menu. |
| 4. concerts_m | At 390 rows already wrap to 3 lines. No 320 board. HistoryItem has three densities (compact, cozy, roomy); boards show one. | [Design] Row layout at 320, and which densities get the ⋯? |
| 5. remove_sheet_m, remove_dialog_d, event_remove_m | Only Concerts has a post-remove board (removed_m). After confirming on the event page nothing shows the page state or toast. | [Design] Draw the event page after removal (button back to "I went"?) and the Undo toast there. |
| 6. removed_m | Only the list below the stats is shown; stats, Passport card and Export count are cropped. README: "the stats drop". Plan: removing the last past show falls to an empty state. | [Design] Draw stats and Passport after a remove, and the empty/zero state. |
| 7. removed_m | No desktop toast; on phone it sits above the bottom nav over a row. | [Design] Desktop toast position and stacking. |
| 8. concerts_m, concerts_menu_d | Stats read 5 nights / 5 venues / 5 artists and Export reads 5 nights: that reconciles as 4 past rows plus the upcoming Marian Hill (Bluebird). But the Passport card also reads "5 nights · 5 venues" while drawing 4 stamps, none for Bluebird. | [Design] Does the Passport count include upcoming shows, or is its 5 sample-data slip (should be 4)? |
| 9. remove_sheet_m, remove_dialog_d, README | Body says "your crews won't see you there": static copy for everyone. | [Hugh product] Do crews and "who's watching" see past stamps at all? If not, wrong for users with no crews. |
| 10. remove_sheet_m, remove_dialog_d | Both "Cancel" (top right) and "Keep it". No pending, disabled or failed state for "Remove from Concerts". | [Design] Dual dismiss intended? Draw in-flight and failed states. |
| 11. README, removed_m | Undo lasts ~6 s; if the restore token is missing (secret unset, D9) or expired there is no Undo. Toast without action undrawn. | [Design] Draw the toast without Undo. |
| 12. README, removed_m | Undo restores the original attendingAt. Where the row reappears and its enter/exit motion are undrawn. | [Design] Confirm it returns to its month slot. |
| 13. README, plan D8 | Restore needs `restore: {attendingAt, token}` from DELETE, which is PR1 (held on the CRAWL_SINCE ruling). PRs are not stacked. | [eng/data] PR2 cannot deliver Undo until PR1 merges. Confirm order. |
| 14. plan D14, concerts_menu_d | Share this night opens ShareSheet. HistoryShow lacks venueCity, venueTimezone, rawShowTime; the share handle comes from Clerk. No board shows the share output for a past show. | [Design] + [eng/data] Is the existing poster right for a night attended? |
| 15. concerts_menu_d | Menu sits below the ⋯; no flip near the viewport bottom, no focus ring drawn. | [Design] Draw flip and keyboard focus. |
| 16. README, concerts_m | Removing a past show that has a submitted price ($160 tile) is unspecified. | [Hugh product] Price stays, drops or orphans? |
| 17. plan Step 0, README | CRAWL_SINCE = 'March 2026' is unverified; Hugh has not ruled. The "back to March 2026" row text in concerts_m / concerts_menu_d depends on it. | [Hugh product] + [eng/data] Real records start. |

### PR3: "I went" on the event page and artist page

| board | what it says | the question |
| --- | --- | --- |
| 18. event_unmarked_m vs concerts_m, event_went_m, add_sheet_m, add_dialog_d | Culture Wars (Nov 7) is marked in several boards and unmarked in event_unmarked_m. | [Design] Deliberate state switching or conflicting sample data? |
| 19. event_unmarked_m, event_went_m | An "ⓘ" at top right of the THAT NIGHT card; not in README or COPY. | [Design] What does it open; strings? |
| 20. event_*_m | Hero chip "4 DAYS AGO" is a twin of B+ DAYS AWAY, not in code yet. | [Design] If B+ is not on main the chip is not built (plan allows). Confirm. |
| 21. event_* chips, COPY | `{N} DAYS AGO` drawn only for 4. Singular, same day, yesterday, and the cutoff to "months ago" undrawn. | [Design] Spec the range and 0/1-day wording. |
| 22. README, plan D7 | Signed-out on public event/artist pages: boards are signed-in only. Plan D7 sends signed-out to tier-picker-on-tap; after go-free the right destination is probably sign-in. Also signed-in without the concert-history entitlement. | [Design] + [Hugh product] Destination for signed-out and non-entitled; draw it. |
| 23. event_stamped_m vs add_tapped_m | Same string "Stamped. {artist} is in your Concerts." carries Open Passport on the event page and Undo in the Add sheet. | [Hugh product] Intentional that the event page toast has no Undo? |
| 24. README, plan WentPill | Pill toggle removes with no confirm; Concerts and the event page confirm. | [Hugh product] Is no-confirm-on-the-pill signed off? |
| 25. artist_past_m | Signed-in only. Signed-out (attending: null), loading, rollback undrawn; no desktop board. PAST_LIMIT = 50 and the endpoint is capped. | [Design] Draw the signed-out pill; what happens beyond 50? |
| 26. artist_past_m | README: live footnote stays ("Concert Crawl started crawling in March 2026"). Rows read "2026 · DENVER" (no venue-level start). | [Design] Does the footnote stay when pills make it an editing surface? |
| 27. artist_past_m, artists-public.ts:326 | Artist-page past list filters isNull(firstMissingAt); the Add sheet and past PUT include missing rows. A show stampable in Add may never appear in the artist page's list. | [Hugh product] Divergence accepted? (plan says unchanged) |
| 28. artist_past_m, README | Past rows are plain text, no link out. ArtistPastShow has no `attending` today; plan D2 adds it. | [eng/data] Data source missing; PR1 item. |
| 29. README | Event page 404s for past events with first_missing_at (out of scope in plan). A user who stamped such a show in Add gets a Concerts row linking to a 404; "Open the show page" and the "Tap I went again" footnote dead-end. | [Hugh product] + [eng/data] Accepted? Decide row link and footnote for those shows. |
| 30. README | A show dated today (MT) is not past until tomorrow, so no "I went" for tonight's show until the next day. | [Hugh product] Accept? |
| 31. README, event_remove_m | No desktop board for the event page past states (marked, unmarked, stamped, remove dialog). | [Design] Draw. |

### PR4: Add a show you went to

| board | what it says | the question |
| --- | --- | --- |
| 32. add_sheet_m, add_dialog_d, README, plan 4.2 | Loading, list error, offline, paging, failed tap (pill rollback), failed Undo undrawn. Plan D7 fills them with SkeletonBlock and toast.error (nearest drawn pattern). | [Design] Draw them. |
| 33. COPY | No strings for loadFailed, retry, saveFailed, undoFailed, the pill's accessible name (must include artist and date), search-clear label, "1 SHOW" singular. | [Design] Add before copy-review. |
| 34. add_search_m, add_none_m, add_end_m, add_tapped_m | Dashed records note only on add_sheet_m; gone on the others. README: "a dashed note at the top of the Add sheet". Scroll/hide-while-searching undefined. | [Design] Spec when it appears. |
| 35. add_search_m, README | "That's every Culture Wars show in Denver since March 2026" drawn for a single-artist search. Plan's rule (all rows share an artist, no next page) is an invention. Venue search, mixed results, My venues, Artists I follow undrawn. | [Design] Spec when the footer shows. |
| 36. add_none_m, README | "Not in our records." drawn only for a typed query under All Denver. Empty My venues (a new user, the likeliest) and empty Artists I follow undrawn; the body copy would be wrong there. | [Design] Draw empty scope states. |
| 37. add_none_m, plan D12 | Example "phish red rocks 2019" implies artist+venue+year search; D12 runs ilike per field, so "culture wars gothic" misses. No accent folding (gutierrez vs Gutiérrez). | [eng/data] Define search semantics or change the example. |
| 38. add_sheet_m, add_end_m | Long venue names truncate with an ellipsis and take the date with them; the date is what the user picks by. Concerts rows wrap instead. | [Design] Truncation rule. |
| 39. add_sheet_m, add_tapped_m | Tapping Went off has no board or wording; README says toast and Undo but only the stamped toast is drawn. Multi-tap and stacked toasts undrawn. | [Design] Draw the unmark toast and multi-tap. |
| 40. add_tapped_m | Toast over the sheet bottom; above or inside the sheet? Clears on Done? | [Design] Spec. |
| 41. add_end_m, add_sheet_m | Rows are not links, so no way to open the show to verify before stamping. | [Hugh product] Confirm no verify path. |
| 42. README | "My venues" = venues in the user's Concerts; a new user has none. App already has venue-following data. | [Hugh product] Attended-only or followed venues too? |
| 43. README, plan 4.2 | "Artists I follow" hidden without the `following` entitlement; boards always draw three chips. | [Design] Draw the two-chip layout. |
| 44. README, add_sheet_m | Sheet "tall on mobile": height, drag-to-dismiss, keyboard shrinking the sheet when search is focused, sticky header undrawn. add_end_m implies sticky. | [Design] Spec. |
| 45. add_dialog_d | Desktop only for the open list; search/end/none/tapped have no desktop board. | [Design] Draw, or accept B+ desktop. |
| 46. README, add_end_m | "THE START OF OUR RECORDS" / "since March 2026" assume one start for all venues; later-onboarded venues break it. Not verified here. | [Hugh product] + [eng/data] Does the start vary per venue; any first-crawl data? |
| 47. plan, README | Step 0 query (d) may show many past rows with first_missing_at (duplicates). Plan has no dedupe; boards show none. | [Hugh product] Decide before PR4 if the share is large. |
| 48. README | Who may stamp, and how many, unstated: any past show since the start, any number, no proof, free for all tiers? | [Hugh product] Confirm no cap, no proof, tier. |
| 49. README, plan | A stamped show has attendingAt = now. Whether Passport, HistoryHeader stats and ICS export order by event date or by attendingAt is unstated. | [eng/data] Verify sort keys. |
| 50. plan 4.3 | Add row on the empty Concerts state is undrawn (plan flags it). | [Design] Design or Hugh decides. |
| 51. plan | Release note entry owed (releases.ts), no spotlight. | [Hugh product] Copy-review. |

### Cross-cutting

| board | what it says | the question |
| --- | --- | --- |
| 52. All boards | Electric dark only; the app has 9 themes incl. light; pill colours (yellow, orange, cyan) unchecked for contrast on a light ground. | [Design] Draw or accept a theme check. |
| 53. README vs plan D5, concerts_m, concerts_menu_d | Stamp shape varies with no rule: Culture Wars and Parra for Cuva (November) are square double-border, Doja Cat and Hermanos Gutiérrez (October) round dashed, and the same Parra stamp is round in the Passport card. README: fill is the venue's stamp colour; plan D5 reads that as stampAccentFor(artist). | [Design] Which colour rule, and what decides the shape? |
| 54. ask_m | Optional board "for three days after a show" shows Nov 7 with the question while event boards say 4 DAYS AGO (today Nov 11). README says not approved. | [Hugh product] Skip until Hugh says yes. |
| 55. plan D3, D6, D7 | Resolve undrawn desktop/states by "nearest drawn pattern", which Hugh's rule forbids. The plan's design-review table lists "Gap: none" against rows that have gaps. | [Design] Re-file D3, D6, D7 and the empty-Concerts Add row as Design gaps. |
| 56. README, READINESS | Screen-reader behaviour for a 6 s Undo, ⋯ menu keyboard behaviour, aria-pressed on the pill are text-only. | [Design] Sign-off. |
| 57. concerts_m, concerts_menu_d | The phone ⋯ is a bare ~16 px glyph at the row edge with no drawn hit area; the desktop open ⋯ box is ~30 px. The stamp tiles beside it are ~56 px, so only the ⋯ is in question. | [Design] Confirm a 44 px target for the ⋯. |

Fully drawn (PR2 can be built to this): concerts_m, concerts_menu_d (open past-row menu), remove_sheet_m, remove_dialog_d, removed_m; PR3 phone boards event_went_m, event_remove_m, event_unmarked_m, event_stamped_m, artist_past_m; PR4 phone boards add_sheet_m, add_search_m, add_tapped_m, add_end_m, add_none_m, plus add_dialog_d (the only desktop one).
