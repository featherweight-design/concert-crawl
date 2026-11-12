# B+ redesign: questions for Design and Hugh (2026-11-12)

Places where a B+ board conflicts with itself or the README, or leaves a state undrawn, found while building; each row says what the lane built in the meantime, and Design should draw or confirm it (a held item holds only its own state, not the whole PR).
Tags: **[Design]** needs a drawing or a design call, **[Hugh product]** needs a product ruling from Hugh, **[eng/data]** needs an engineering or data-source decision. Wording-only items go to copy-review and are not listed here.

## Known conflicts

| board | what it says | the question |
| --- | --- | --- |
| `bp-s-notif_m`, `more-s-d_notifications` (B19a, #138) | Shows / Alerts / Prices tabs, but a price item sits under Shows; tabs were rejected in the original notifications design | [Design] Built without tabs. Hugh says follow Design: are the tabs in, and if so, which tab holds price items? |
| bplus COPY.md line 23 (A5) | "No longer listed" has a chip, a row and a notification | [Hugh product] The handoff rule says no cancellation notifications for crawler-dropped shows, so no notification was built. Which wins? |

## B5 Browse (#146)

| board | what it says | the question |
| --- | --- | --- |
| `01-core/bp-browse`, `03-themes/bp-td-light-browse` artists shelf | The shelf fits 5 cards on desktop; nothing is drawn for a fan following more than 5 | [Design] With the undrawn "See all" removed, artists past 5 can't be reached from the desktop shelf (they're still on My shows ▸ Artists; the phone rail scrolls). Add a link, make it scroll, or accept it? |

## B6a Desktop filter bar (#113)

| board | what it says | the question |
| --- | --- | --- |
| `05-filters/bp-f-filt_active_d` | Multi-select values ("Bluebird +1", "Electronic +1") | [Design] Hugh ruled single-select, so the value is the one choice. Redraw to single-select. |
| `05-filters/bp-f-filt_where_d` | Checkboxes | [Design] Built as one checked row (single-select). Redraw to match. |

## B7 Browse calendar week strip (#121)

| board | what it says | the question |
| --- | --- | --- |
| `06-states/bp-s-cal_m`, `bp-s-cal_d` | Genre dots on the week strip, with no source drawn | [Design] Built from the loaded shows' lead genres. Confirm. |
| `06-states/bp-s-cal_m` at 320 | Rows drawn at 390 only | [Design] Built with the shared EventRow drop ladder (the headliner ellipsises, then the venue shortens before it drops), as on Browse. Confirm. |
| `bp-s-cal_jump_m` | Month grid with genre dots | [Design] The availability API has no genres, so the dots show volume. Accept volume dots, or does the grid need genres? |
| `06-states/bp-s-load_browse_d` | The desktop skeleton draws B6a's segmented bar | [Design] The skeleton draws main's current bar and follows B6a when it lands. Confirm. |

## B9b Price counter (branch)

| board | what it says | the question |
| --- | --- | --- |
| `08-prices-and-status/more-st-counter_m` | No "How you found out" chips | [Design] Built with the chips, because the API requires `howFound`. Draw them. |
| `more-st-counter_m` rail | An icon tile and a close button | [Design] Not built (ModalShell has neither). They get built in B9b slice two unless Design drops them. |
| `more-st-counter_done_m` | A card preview inside the success sheet | [Design] Not built. Built in slice two unless Design drops it. |

## B10 Artist page (draft)

| board | what it says | the question |
| --- | --- | --- |
| `06-states/bp-s-load_artist_m` | A round portrait skeleton | [Design] Built as a tilted 4:5 card, per the no-layout-shift rule. Confirm. |
| `09-artist/artist-m-noburst-*` | No dashed note under Upcoming on mobile | [Design] Shown on mobile too. Confirm. |
| `09-artist` | Artist genres, with no data source drawn | [Design] Derived from upcoming shows (top two). Confirm. |
| `09-artist` rows | Tour names not shown | [Design] Left off the rows. Confirm. |
| `09-artist` | Follow position on mobile scroll is undrawn | [Design] Follow moves to the sticky bar after scroll. Confirm. |
| `09-artist` | No artist share card | [Design] Share sends the plain link. Draw a card, or confirm. |

## B11 Venues (#116)

| board | what it says | the question |
| --- | --- | --- |
| `bp-venues`, `bp-m-venues_m` | No column headers drawn | [Design] The live column headers were removed. Confirm. |
| `bp-venue`, `bp-m-venue_m` | Upcoming rows ungrouped | [Design] Live date groups with DayTile headers were kept (Browse's pattern). Confirm. |
| (no Light venue board) | The venue glyph hero in Light is undrawn | [Design] The hero keeps its dark backdrop in Light. Draw it, or confirm. |
| `bp-venue` stats row | Stat values at phone width are undrawn | [Design] Long values truncate ("Amphit…" at 390). Confirm. |
| `10-venue-art` | Multicolour neon and skyline, mountain and star backdrops | [Design] Simplified to each venue's two-stop gradient on brick. Accept, or is the full art owed? |
| Name gradient ("Red Rocks", "Church") | One word of the name takes the gradient | [Design] Not built: there's no rule for which word gets it. What's the rule? |

## B12 My shows (#126)

| board | what it says | the question |
| --- | --- | --- |
| `bp-concerts` | The past stamp is drawn as a rounded square | [Design] README rule 4 (one round stamp) wins, so it's round. Confirm. |
| `bp-artists` | The dashed find card isn't drawn | [Design] Removed. Confirm. |
| `bp-s-empty_*_m` | Only phone empty boards exist | [Design] Desktop empties reuse the phone layout, and the empty art is approximate. Draw the desktop empties, or confirm. |
| `bp-s-load_*_m` | The Artists skeleton has a headline block the live page lacks | [Design] Built as drawn. Confirm, or drop the block. |
| Empty Artists board | Shows "Artists 271" | [Design] Built hidden when there are no follows. Confirm. |

## B13 Passport (#123)

| board | what it says | the question |
| --- | --- | --- |
| `07-more-screens/more-r3-passport*`, `02-mobile` | Tilted square and round stamps, against README rule 4 (one round stamp, never tilted) | [Design] Built per rule 4: round, untilted. Confirm. |
| passport booklet pages | Page 1 newest-first, later pages oldest-first | [Design] Built oldest-first throughout, so it fills like a passport and "Next" follows the latest. Confirm. |
| 11-night vs 4-night boards | Jump to is on the 11-night board, not the 4-night one | [Design] Built on desktop for more than 4 nights. Confirm the threshold. |
| `06-states/bp-s-empty_passport_m` | The desktop empty state is undrawn | [Design] Built as the phone's dashed card, centred. Draw it, or confirm. |

## B14 Crews (#128)

| board | what it says | the question |
| --- | --- | --- |
| `bp-s-invite_m/_d`, `more-r3-crew_invite(_m)` | An avatar cluster; no member count | [Design] The member count is kept (tests pin it) and the avatar cluster is left out per an earlier ruling. Redraw without the cluster and with the count, or confirm. |
| `more-r3-crew_been_m` | The crew "been" empty state | [Design] Not restyled: it needs `EmptyState layout="card"` (in held #121). Confirm that's the target. |

## B17 Chrome: header, bottom nav, account menu (#144)

| board | what it says | the question |
| --- | --- | --- |
| `02-mobile/bp-m-browse_m` | Bottom nav label size | [Design] Built at 10px so five slots fit at 320. Confirm. |
| `01-core/bp-account` | Tile glyphs | [Design] Built as drawn: eye for Theme, people for Settings. Confirm. |

## B18 Settings (#154 B18a, #155 B18b, #156 B18c)

| board | what it says | the question |
| --- | --- | --- |
| `more-s-d_profile` | Profile banner colours | [Design] Built from the avatar colour pair; B16 owns the banner, so the two overlap. Which wins? |
| `more-s-submissions_m`, `more-s-d_submissions` | Filter chips, month grouping and thumbnails | [Hugh product] None built: it's new behaviour and there's no image data. Wanted? |
| `more-s-d_account`, `more-s-settings_m` (Account) | Icon rows | [Design] Built with mail and document glyphs. Confirm. |

## B19 Search palette (#139)

| board | what it says | the question |
| --- | --- | --- |
| `more-r3-palette_typed` | Artist rows carry a genre chip | [Design] An artist with no genre keeps the neutral ring and no chip. Confirm. |

## B19a Notifications (#138)

| board | what it says | the question |
| --- | --- | --- |
| `more-s-d_notifications` | The desktop panel | [Design] Follows the phone treatment. Confirm. (Tabs: see Known conflicts.) |

## B20a Something went wrong page (#117)

| board | what it says | the question |
| --- | --- | --- |
| `12-error-page/err-*-form`, `-sending`, `-sent`, `-failed` | A refused 4xx (rate-limited or rejected report) is undrawn | [Design] Built as the failed card without the "saved" promise. Draw it, or confirm. |
| `12-error-page` | Sign out | [Design] `global-error` can't reach Clerk, so it shows Go home there instead. Confirm. |
| (none) | The in-app crew error is undrawn | [Design] Built as an `embedded` variant: no second logo, clears the bottom nav. Draw it, or confirm. |

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

## B22b Offline and pull to refresh (#142, #162)

| board | what it says | the question |
| --- | --- | --- |
| `bp-s-offline_account_m` | The offline note on one My shows tab | [Design] Shown on all three tabs, since each needs the account. Confirm. |
| `bp-s-pull_m` | One frame | [Design] The indicator opens with the finger, holds while loading and eases shut. Confirm the motion. |
| `06-states/bp-s-offline_pill_m` at 320 | Drawn at 390 only | [Design] At 320 it stays one line and ellipsises, never below "Offline". Confirm. |
| `11-signed-out/inv-mob` at 320 | Drawn at 390 only | [Design] At 320 the pill wraps under the lockup and Redeem gets its own row. Confirm. |

## B23 Launch animation (#143)

| board | what it says | the question |
| --- | --- | --- |
| `bp-s-launch_k110_m` to `k590_m` | Frames of a live canvas | [Design] Built to the README timeline table. Confirm. |
| `bp-s-launch_k740_m` to `k1100_m` | The mark's start scale before the grow isn't stated | [Design] Built at 2.4× (about the tile's icon). What's the start scale? |

## A3 Sold out (#136)

| board | what it says | the question |
| --- | --- | --- |
| `more-st-ev_sold_m` | When "Tickets available" shows isn't stated | [Design] Shown only on a live sold-out show; a past or not-sold-out show hides it. Confirm. |
| `more-st-ev_sold_pending_m` | Only the Sold-out-pending state is drawn | [Design] The Tickets-available-pending twin reuses that banner ("A fan reports tickets are on sale again."). Draw it, or confirm. |

## A4 and A5 Cancelled and No longer listed (#140, #151, #157)

| board | what it says | the question |
| --- | --- | --- |
| `08-prices-and-status/more-st-ev_canc_m`, `_d` (nearest) | The event page for "No longer listed" is undrawn | [Design] Built as a neutral, dashed, muted twin of the Cancelled card, with a neutral pill and no strike (this conflicts with B8's EventTitleBlock), and the chip under the title on narrow rows. Draw it, or confirm. |
| `more-st-ev_canc_m`, `_d` | Only a reported cancellation is drawn | [Design] A crawled cancellation gets a status card with just its age, under the hero, then Refund info, with no commit block or price card. Confirm. |
| `more-st-ev_canc_m` | No board for a show with no ticket-vendor link | [Design] Built a "venue website" fallback CTA, outlined like Refund info. Confirm. |
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
