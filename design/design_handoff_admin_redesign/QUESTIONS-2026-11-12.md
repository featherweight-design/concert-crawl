# Admin redesign: questions for Design and Hugh (2026-11-12)

Open questions found in the admin boards before building; nothing is built on any of them, and a minor item holds only its own state, not the whole PR.
Tags: **[Design]** needs a drawing or a design call, **[Hugh product]** needs a product ruling from Hugh, **[eng/data]** needs an engineering or data-source decision.

## Read this first (adm1 triage)

Blocker = can't build without an answer. Minor = a missing state or word with a drawn pattern nearby or a default; per Hugh 2026-11-12 these also go to Design (no lane settles anything from the nearest board); a minor item holds only its own state, not the whole PR. Tags: [Design], [Hugh product], [eng/data].

### Top blockers
1. [Hugh product] 1c, 1d, 2b, 2c, 3a — Off-season. Is it a pause reason or a warning snooze? The boards say both, and no season or "until Apr 1" data exists anywhere (it touches 5 PRs).
2. [eng/data] 3a, 1d, 2c — "What's normal here" (usual shows per run, the Low status, "This is normal") has no storage and no PR that builds it (Low appears on 3 PRs).
3. [eng/data] 1d — How do Didn't start and Nightly retry come from the data? The 4:10 retry fills that night's group, there's no retry marker, and the real backup is the 12:07 UTC cron (this blocks the batches API).
4. [Hugh product] 5c — With the verified mark set by hand in prod, no prod Mark verified control is drawn, and staging's "Production unlocks" no longer holds. Reuse staging's dialog in prod? What does staging's mark do now? (This is 5c's core.)
5. [eng/data] 5a — Last active, role filter counts, Watching per row and handle search: Clerk can't give these. Do a full Clerk scan, or mirror the fields into our DB? (This blocks the People list.)
6. [Hugh product] 1c, 2b, 2c, 4c — Spotify data the boards show (place, listeners, top track, "Plays Denver", sync counts, "Synced 3:45 AM") isn't stored, and sync is retired. Drop it, or fetch it? (4 PRs)
7. [Hugh product] 4b, 2c — Moved has no status, no column and no chip, and today a move merges into the new row (#1734). Keep a Moved row? How is the destination picked? (There's no picker.)
8. [eng/data] 4b, 4d — In the price sheet, tier and vendor are required but not drawn, and before fees, free, sold out and URL have no columns. The caption says "same sheet fans use". (This blocks admin price add and edit.)
9. [Hugh product] 2c, 4d — "Ticket link still live" and "GA from $45.50" need a new fetch of seller pages outside the crawl. Is that allowed under robots.txt and the 3 s pace? (Crawl ethics.)
10. [Hugh product] 2b, 2c — The boards say low-confidence events are "hidden until you decide", but the code doesn't hide them, and the bar is 0.75 on the board vs 0.70 in code. Which is right?
11. [Hugh product] 4d — Reject has no rejected status or reason, and fans would see "Not used". Is a migration plus a fan-side change in 4d's scope?
12. [Design] 2b — Snooze has no trigger (no card or panel draws the clock), and Not useful has no way to turn a warning kind back on.
13. [Design] 6, 5d, 3e — The Suggest a venue form isn't drawn. Admin needs a venue name and URL, and nothing groups repeat asks or matches names in feedback.
14. [eng/data] 5d, 2c — Error reports grouped by Sentry issue (counts, versions, devices, "None in Sentry") have no grouping, no Sentry call and no token.
15. [Hugh product] 5d, 2c, 6 — Reply delivery lands in Phase 6. Before then, does Send reply deliver, queue or stay disabled? And does the error-report reply go to everyone automatically "once it's fixed"?

### Per PR

**1c Health.** Blockers:
- [Hugh product] The site tile: smoke, e2e and Sentry 24h have no source. Hide it, build a source, or show "no data"?
- [Hugh product] The Artists tile and sync panel count Spotify sync results (top 6).
- [Hugh product] Before 3c, are off-season venues omitted or shown under Paused? (top 1)

Minor 1: the Crawl tile's Didn't run and "about 20 min left" wait on 1d's API and its estimate.

**1d Crawl runs.** Blockers:
- [eng/data] Didn't start vs Nightly retry (top 3).
- [eng/data] Result rules: what turns Done amber, what Not OK counts (2 in the list, 3 in the detail), which bucket each of the 11 reasons goes in, and whether skipped venues count in "21 venues".
- [Hugh product] "Quiet · Off-season until Apr 1" (top 1).
- [Hugh product] Stop on a running Crawl all: no cancel API exists. Is it in 1d, or does the button go? What happens to venues already crawled?

Minor 21, e.g.: the Didn't start cause when it's unknown; Unchanged vs Skipped for the same run; a "merged" count with no source; 21 vs 19 venues in Crawl all; the basis for the time and cost estimate; a Failed batch chip, and paging.

**2b Needs you queue.** Blockers:
- [Design] Where the snooze clock sits on desktop and phone (top 12).
- [Hugh product] Not useful: no reason box, no meaning for items with no venue, and no way back on (top 12).
- [Hugh product] "fewer than 50 people submit": does approve-myself switch off at 50, or is it advice? (Also in 4d.)
- [Hugh product] The Artist card's "Spotify has 6 artists called Cashmere" (top 6).
- [Hugh product] The EVENT card's "Hidden until you decide" (top 10).

Minor 24, e.g.: which filter EVENT and Price check go under; Tomorrow vs In 1 day, and the pink cut-off; how items with no fan date rank; the badge after an answer and on all clear; the answered row for notifying answers and on phone; whether duplicate and crawl_gap items enter the queue.

**2c Evidence panels.** Blockers:
- [Hugh product] Ticket-page checks in show-dropped and price-check (top 9).
- [Hugh product] What Moved… opens (top 7).
- [Hugh product] venue-quiet's "usually 20+", last year's months and "Off-season until Apr 1" (top 1, 2).
- [Hugh product] Artist candidate place, listeners and Plays Denver (top 6).
- [Hugh product] Low-confidence event, hidden or listed (top 10).
- [eng/data] "Why we're unsure": no column stores the LLM's reason or trigger words.
- [Hugh product] The price-check screenshot: fans can't attach one, and there's no column for it.
- [eng/data] Bug "Errors: None in Sentry" (top 14).
- [Hugh product] Reply in the bug panel: build it in 2c, or ship without it until 5d/6? (top 15)

Minor 32, e.g.: phone vs desktop content for show-dropped; what the phone ⋯ menu holds; whether Postponed asks for a date; 4 vs 14 runs; where Check source points before 3c; the batch window and untick behaviour; a reporter who deleted their account.

**3a Venues list, Overview, Runs, menu.** Blockers:
- [eng/data] Resume (When I say / 2 weeks / a date) has no column and no auto-resume job. Which PR builds them?
- [Hugh product] Off-season: pause reason or snooze (top 1).
- [eng/data] The robots.txt "Changed" filter: no stored rule or hash to compare against.
- [Design] Select (bulk): no selected state or actions are drawn.
- [eng/data] What's normal, Low, and "This is normal" (top 2).
- [Hugh product] The ticketing-feed suggestion card: no detection, no fetcher, and Not now isn't stored. Build it or drop it?
- [eng/data] HOW WE READ IT per-step results (HTML 0, JSON-LD 0, Haiku 28) aren't stored.

Minor 28, e.g.: the desktop Pause form; menu lines for paused, hidden and flagship venues; the taken-down chip; the Delete refusal; "Needs a look 3" vs four dots; the worst-first sort key; "Paused by" from the audit log.

**3b Source, Details, Guide, Inspect.** Blockers:
- [Hugh product] The ticketing-feed sellers (AXS, Ticketmaster…) have no fetchers. The default is to show VenuePilot, AEG and Live Nation and leave the feed out until you rule (#175 A5).
- [Hugh product] Ask the venue on a live venue: 05 says it saves the venue as a draft. Does asking unpublish a live venue?
- [Design] Details drops fields you can edit today (website, neighbourhood, lat/lng, contact email, price page) and has no icon or hero field, though 05 says to add them there.
- [eng/data] Guide per-section Published / Draft / Missing: today the guide publishes as a whole. Which PR changes the schema?
- [eng/data] Inspect's Page tab: a sandboxed iframe of the stored HTML, or a screenshot? (A security call.)

Minor 22, e.g.: the Don't crawl column and chip; slug redirect vs "change it before going live"; the Box office column; the Capacity type list; desktop test, feed and Advanced states (use the phone boards); today's Ticketure and detail-page configs on Source.

**3e Add a venue.** Blockers:
- [eng/data] Nothing groups repeat suggestions or matches venue names in feedback (README need 6 has no PR) (top 13).
- [eng/data] Where are tested shows held until Go live, and does Go live publish them or start a real crawl?
- [Design] The 14-day Ask-the-venue reminder "comes back in Needs you", but there's no kind, panel or answers for it.
- [eng/data] Icon uploads: no file storage is planned, and fetching images from the venue site isn't covered.
- [Design] Icon and hero after going live: "add one from Details", but Details has neither (as in 3b).
- [Hugh product] "The 3 fans who asked get a notice" on go-live: no PR builds it, it's fan copy, and it needs the suggesters' identities.

Minor 25, e.g.: the suggestions list stays empty until Phase 6; desktop vs phone Basics fields; desktop Undo on Not for us (Hugh proposal; the default is phone only); save failed for "Saved as you go"; how the contact address is found; storage for They said no.

**4b Events.** Blockers:
- [Hugh product] Moved (top 7).
- [Hugh product] Refund info on Mark cancelled: there's no column. Is the fan-page change (free text where Get Tickets was) in 4b?
- [eng/data] The price sheet fields (top 8).

Minor 18, e.g.: the mobile edit field subset; a Postponed dialog; headliner vs support in the comma lineup field; the desktop merge pick step; a Played chip; Load more.

**4c Artists.** Blockers:
- [Hugh product] Place, listeners, top track and "best for Denver" ranking (top 6).
- [Hugh product] "Looks like a tour name" hints and Automatic Not artists break the #1343 ban on name-shape rules. Keep the ban (and drop them), or reverse it?

Minor 8, e.g.: reason and marked-by on Not artists; matched-by; a No photo column; the row ⋯ menu isn't drawn; what Pick opens on phone.

**4d Prices.** Blockers:
- [Hugh product] Approve myself at 50 people (as in 2b).
- [eng/data] "Outliers reach Needs you": no outlier rule exists.
- [eng/data] The Add a price sheet fields (top 8).
- [Hugh product] Reject (top 11).
- [Hugh product] Price checks' "what we checked" and "@annab · screenshot" have no source (top 9).

Minor 14, e.g.: the "12 people submitting" window; which sort key comes first; state words on desktop vs mobile; the $45+ format; the 10-character reason on resolve; the Resolved list isn't drawn.

**5a People.** Blockers:
- [eng/data] Last active and "newest activity first" (top 5).
- [eng/data] Role counts, Watching per row and handle search (top 5).
- [Hugh product] "Their profile" and "/u/…" links: no public profile route exists. Build it or drop it?
- [Hugh product] Message them: it's not in 5a's scope, and there's no API and no form. Build it or drop it?

Minor 18, e.g.: join source, code vs poster; tab vs chip vs footer counts; Concerts = going; where the person ⋯ actions live on desktop; the Sign out everywhere confirm; test account exclusions vs flag-add.

**5b Invite codes and Posters.** Blockers: none.

Minor 14, e.g.: custom code text (the API always generates the code); what counts as a poster (default: a multi-seat code); whether the recipient email field is dropped; Full vs Expired precedence; no column for the revoke reason; the fan "This code has ended" page.

**5c Feature flags.** Blockers:
- [Hugh product] Prod Mark verified (top 4).
- [eng/data] With two admins, the "Me" step needs an owner id that the ledger lacks.

Minor 8, e.g.: whether the three checks are stored; what un-verifying does; a locked flag that's already above Off; history from before the table existed; 211 vs test accounts.

**5d Operations.** Blockers:
- [eng/data] Sentry-grouped error reports (top 14).
- [Hugh product] The error-report reply "to everyone, once it's fixed" (top 15).
- [Design] The venue suggestion needs a name and URL that the fan form doesn't collect (top 13).
- [Hugh product] Reply between 5d and 6 (top 15).
- [Hugh product] The Emails list names 5 emails that don't exist (Show moved, Show cancelled, Price check answered, Invite accepted, Venue blocked). Example data, or build them?

Minor 21, e.g.: what "Weekly read" is; resolved_by, and "on the roadmap"; the reopen control; the device parse; the test email going to the clicker vs ADMIN_EMAIL; the Emails skeleton.

**6 Fan side.** Blockers:
- [Design] The Suggest a venue fields (name, website) (top 13).

Minor 8, e.g.: how long the New pill stays; which tab holds the reply notice; the sender's name; what happens when a fan has turned email off; what the Phase 6 flag gates.

**Other (no PR).** Minor 2: judgment calls in merged PRs; the #175 proposals (desktop feed fields; drop Save debug HTML: keep it until eng confirms).

### Already answered (dropped)
- Phone versions of desktop-only dialogs and panels (Crawl all, snooze, the 7 evidence panels, Add a show, Past shows, Matched and Not artists, Reject, Make admin, invite code panels, flag dialogs, feedback panels): plan decision 1. Phone run detail is the addendum's run-detail-sheet.
- Loading, couldn't load and missing empties (2c panels, Inspect desktop, 1d panel, 4c and 4d empties, no flags): decision 2. A save that fails inside a panel: README rule 10.
- Skeleton shapes that don't match the page (1d, 2b): README rule 9 (the final shape).
- Where a 1d venue row links: decision 4 (today's split view until 3b).
- 1c header count: decision 13. Lines for system actions in 1c Done for you: decision 17 plus copy-review.
- #175 eng items (merging into manual rows, created_by, merging across venue or day, What we read and the stop marker, which page Inspect opens, Not for us storage, the field mapping): #175 A1, A2, A3, A4, A7, A6. The A5 line is merged into 3b.
- show-moved "prices stay on the history": README need 23 (prices move to the kept listing).
- Hugh rulings: the Block menu line (Block is dropped); staging-step reads on prod flags and the person page (the mark is set by hand, with no cross-environment read); the Arena crescent.
- Rows the audit already marked fine: 3b save failed, 5a loading, 5b loading and none, 5c named people, 5d empty day.
- Copy for the lane's copy-review, not questions: the banned words Tools, history, Saved, submission and Following, and "Not 96"; card vs panel label mismatches (Re-crawl now, Move to, Use $45+, Approve 8); the two Paused chip texts; latest-line formats; subtitle mismatches; "like Levitt and Meow Wolf"; a design note shown as copy.

**Totals: 399 items audited (382 board rows + 17 hand-written), 75 blockers, 257 minor, 67 dropped.**

Answered in #178: 8 rows removed (items 7, 8, 9, 10, 29), 5 trimmed to their open part. Still open on purpose: the #169 BottomSheet and sr-only / 720px rows (b1 plan rows 4, 9, 10) and the user-menu popover anchor, none of which #178 covers.

## Admin 1c Health (b1, boards 03/health-desktop, tiles-in-each-state)
1. "The site" tile/panel: production smoke, staging e2e, Sentry errors (24h) have no API source; plan says "emails only, record the gap". Hide rows, build a source (adm2), or show "no data"? (data/backend call)
2. Artists tile + Artist sync panel: Matched / Unsure 60 days / Unsure later / No match, "Synced 3:45 AM", failing "Spotify said 401". Spotify sync retired: data source for each count and "synced"? (Design + data)
3. LLM over-budget text says "Tools" (banned word) -> copy-review fix by lane, not Design.
4. "Quiet on purpose": Fiddler's Green "Off-season until ..." needs 3c's crawl_paused_reason + date. Before 3c: omit that case or file under Paused? (sequencing call)
5. Crawl tile "Didn't run" and "Running now ... about 20 min left": needs 1d batches API; estimate basis undrawn.
6. "Done for you overnight": 4 phrasings drawn; system actions venue.crawl_blocked, event.auto_cancel.stale, artist.match.auto have no drawn line.

## Other
- Merged PRs with judgment calls (listed under "Merged admin PRs" below): fix back to board or confirm.

## From the #175 readiness audit (verdict Orange -> Yellow; all 4 phone gaps closed)
Hugh calls:
- Ticketing feed seller list (AXS, Ticketmaster, Etix, DICE, Eventbrite) has no fetcher behind any name; the real feeds (VenuePilot, AEG, Live Nation) aren't listed. Proposed default: show the real feeds, leave Ticketing feed out of 3b until ruled.
- Addendum proposals to confirm: Undo on desktop "Not for us"; feed fields on desktop Source; drop "Save debug HTML".
Engineering decisions the plan needs (not Design):
- Merging into a hand-added show vs the plan's "crawler skips manual rows".
- "Added by @dlo" needs events.created_by.
- Merge across a different venue or day is undrawn (this one may be Design).
- "What we read" needs a stored per-run item list (not in 1a/1e tables).
- "Not for us" needs a dismissals table.
Field mapping fixes: calendar page is website_url, not url; Source save must keep platform='detail-page'.

## Admin 1d Crawl runs
| board | what it says | the question |
|---|---|---|
| crawl-runs-desktop, crawl-runs-mobile | "Nov 8 3:00 AM · Nightly · Didn't start · GitHub Actions was down; retried at 4:10 AM" | Decision 18 derives Didn't start from a missing nightly group, so nothing records why it didn't start. No source exists for "GitHub Actions was down". What should the row say when the cause is unknown? |
| crawl-runs-desktop, crawl-runs-mobile | separate "Nov 8 3:00 AM Didn't start" row plus "Nov 8 4:10 AM Nightly retry" row | Decision 18 groups nightly runs by Mountain Time night. The 4:10 retry runs fall in the same night, so that group exists and no "missing" group is left to show Didn't start. There's also no "retry" marker on crawl_runs. The real backup is a second daily cron (`crawler-daily.yml` at 12:07 UTC, `skip_if_ran_today`). How do Didn't start and Nightly retry come from the data, and when is a nightly group late rather than missing? |
| crawl-runs-desktop | Result "Done" is green on Nov 11 and Nov 10 (1 failed each) but amber on Nov 9 (1 low, 1 failed) | What turns Done amber? A failure alone stays green, so is it "low"? Which run reasons or venue outcomes count? |
| crawl-runs-desktop | Filter "Not OK 2" | Which batches count as Not OK? The count 2 implies Nov 9 and Nov 8, so batches that contain failures (Nov 11, Nov 10) aren't Not OK. In the detail, "Not OK 3" counts quiet venues plus failed ones. That gives two different definitions. |
| crawl-runs-desktop, a-runs-detail | Summary buckets "OK · unchanged · quiet · low · failed" | Where does each of the 11 reasons (decision 19) go? Paused, robots_disallowed, robots_unreachable, robots_crawl_delay, blocked_http, llm_account and calendar_not_found have no drawn bucket or chip. Do skipped venues (paused, blocked) count in "21 venues"? |
| a-runs-detail | Per-venue chips: Unchanged, OK, Failed, Quiet (no Low chip, though the list summary says "1 low") | What is the chip set for a venue row: Low, Skipped/Paused, Blocked, robots.txt? Is Quiet a run result or a venue state (see next row)? |
| a-runs-detail | Fiddler's Green "Quiet · Off-season until Apr 1" | No off-season or "quiet until" data exists (venues and venue_fault_acknowledgements have no season field). What defines Quiet, and where does the date come from? |
| a-runs-detail vs phone-addendum/run-detail-sheet | Ball Arena's unchanged-page run is the chip "Unchanged" here but "Skipped" on the venue Runs tab and sheet | The same run gets two different words. Which one is right? |
| a-runs-detail | "18 min · $0.71 · 1 failure went to Needs you" | Needs you items arrive in 2a/2b (phase 2), after 1d. Where does the count of failures sent to Needs you come from, and what does 1d show before 2a ships? |
| a-runs-detail | "Red Rocks · 88 shows · 3 new · 2 merged" | crawl_runs has no merged count, and merges are recorded per sweep in the audit log (1b), not per run or venue. What's the source of "merged"? Can it be dropped? |
| a-runs-detail | "Junkyard · Timed out at 30 s · 3rd in a row, auto-paused" | The run row doesn't store the failure streak or the auto-pause. Is deriving them from earlier runs plus the system audit row acceptable, or should the board drop them? |
| a-runs-detail | "15 more venues" link | Undrawn: does it expand in place, scroll, or page? Is it the same under the "Not OK" filter? |
| a-runs-detail | Footer "Each venue opens its own run on its Runs tab, with the pages fetched and Inspect." | The venue Runs tab and Inspect arrive in 3a/3b, and until then `/admin/crawl?venueId=` keeps the old split view (decision 4). Where does a venue row link in 1d? |
| a-runs-detail | Detail drawn only for a nightly batch | Undrawn: the detail for a by-hand single re-crawl (1 venue), a running Crawl all, and a Didn't start row (is it clickable?). |
| a-runs-detail | Panel only, with no loading or couldn't-load | Undrawn: the panel's loading and couldn't-load states, and the phone full-screen version (decision 1 says full screen, but the addendum's run detail is a bottom sheet). Which one is it on the phone? |
| crawl-all-venues | Body "All 21 venues are crawled now" with the button "Crawl all 19" | These contradict: 21 vs 19 after skips. Should the body say how many are skipped and why (paused vs blocked)? `POST /crawl` also skips unverified and hidden venues, which the text doesn't mention. |
| crawl-all-venues | "usually takes about 20 minutes and costs about $0.80" | No source for this estimate. Is it an average of recent nightly batches' time and cost, and over how many? What does it say with no history? |
| crawl-all-venues | Dialog only | Undrawn: the post-failed state (dispatch or queue error), the case where 0 venues are eligible, the spinner in the button while posting, and the phone sheet (decision 1 covers the layout, but the copy for 0 eligible isn't drawn). |
| crawl-all-running | "Stop" button | No API cancels queued triggers or a running workflow, and the plan doesn't list one. Is Stop in 1d's scope? What happens to venues already crawled, and is there a confirm? What does the batch show afterwards (a "Stopped" chip isn't drawn)? |
| crawl-all-running | "Now: Gothic Theatre · about 11 min left" | `/crawl/status` doesn't say which venue is in progress (`crawl_triggers.status='processing'` would). The time left needs an estimate source. Is deriving both acceptable? |
| crawl-all-running | Progress banner with "you can leave this page" | Undrawn: the banner's end state (does it disappear, or show a done or failed summary?) and the phone running state. |
| crawl-all-running vs crawl-runs-desktop | The running page drops the TIME and COST columns, the filter chips, the "Crawl all venues…" button and the second subtitle sentence | Are these deliberately hidden while a crawl runs, or just omitted from the board? |
| crawl-all-running vs crawl-runs-desktop | "Crawl all · by @hugh", but the by-hand "Re-crawl · Ball Arena" row shows no actor | Does every by-hand row show "by @handle"? (`triggered_by` is a Clerk id, so it needs a user_profiles join for the handle.) |
| crawl-all-running | Result chips: Running, Done, Didn't start | Undrawn: the result for a batch where every venue failed, or for a single re-crawl that failed. Is there a Failed batch chip? |
| crawl-runs-mobile | No All / Nightly / By hand / Not OK filters | Rule 6 says tabs become a segmented control on phone, but the phone board has no filters. Are filters dropped on phone, or is the segmented control undrawn? |
| crawl-runs-mobile vs crawl-runs-desktop | "Next nightly: tonight 3:00 AM" in the header vs the desktop footer "Next nightly crawl: tonight at 3:00 AM MT" | Different placement and wording, and the phone drops MT. Is that intended? There's no "next run" source either, so it would be a hard-coded schedule. |
| crawl-runs-desktop, crawl-runs-mobile | Six rows, no paging | Undrawn: how many batches show, and whether there's Load more or paging. |
| crawl-runs-desktop | Rows with no hover or chevron | Is every row clickable (Didn't start included), and does a row link to a URL (`?run=`), which rule 7 would need to keep free of run ids? |
| loading-crawl-runs | Skeleton rows have a leading square, two lines, and three right blocks; the filter row's first pill is wide; there's no Crawl all button block | This doesn't match the final table (When / What / Result / Summary / Time / Cost, no glyph) or rule 9 (final shape). Which shape should we build? |
| crawl-runs (all) | Empty state, Not OK with zero matches, couldn't load | Decision 2 covers no runs and couldn't load, but an empty filter result (Not OK 0, By hand 0) isn't covered. Should it be a summary line plus an action, or the people-no-results pattern? |

## Admin 2b Needs you queue

| board | what it says | the question |
|---|---|---|
| needs-you-desktop, needs-you-mobile | Filters: All, Shows, Venues, Artists, Prices, Bugs (6 + 3 + 2 + 2 + 1 = 14) | There's no filter for EVENT (low-confidence) items, and 14 only adds up if EVENT counts under Shows. Is EVENT under Shows, and is Price check under Prices? 2a has 10 kinds but only 5 filters, and that mapping is drawn nowhere. |
| needs-you-mobile vs README rule 8 vs COPY.md | Kind label `PRICE CHECK` on the card and the panel | README rule 8 lists the labels as VENUE, SHOW, ARTIST, BUG, FLAG. COPY.md lists SHOW, VENUE, ARTIST, EVENT, PRICES, BUG. The boards also draw PRICE CHECK and EVENT. Which set is canonical? (#178 item 29 keeps FLAG, in info tone.) |
| needs-you-mobile | `PRICE CHECK · In 1 day` (Thu Nov 12) is drawn third, below `SHOW · In 3 days` (Sat Nov 14) | This breaks "soonest for fans first" (2a rank.ts). Is the board order wrong, or does Price check rank by something else? |
| needs-you-mobile vs needs-you-desktop | Thu Nov 12 is `Tomorrow` on the show card and `In 1 day` on the Price check card | Which wording applies, and what are the `when.*` rules (Tomorrow / In N days / a date beyond some N)? |
| needs-you-desktop | `Tomorrow` and `In 1 day` are pink; `In 3 days`, `In 4 days` and `In 11 days` are grey | What's the cut-off for the pink "urgent" when line? It isn't specified anywhere. |
| needs-you-desktop | The VENUE card shows `No fan impact yet` and ranks above PRICES `Shows in 2–30 days` | How do items with no fan date rank (venue-quiet, bugs)? 2a ranks by "soonest fan-visible date, then Watching count" and doesn't cover items with no date. |
| needs-you-desktop | Subtitle `14 decisions. Soonest for fans first. 6 handled today.` vs mobile `14 decisions · soonest for fans first` | Mobile drops "N handled today" and uses a different separator. Is the difference intended, or should there be one string? |
| answered-with-undo | Subtitle says `13 decisions`, but the sidebar badge and `All` still say 14 and `Shows` still says 6 | Rule 1 says the badge is the decision count. After an answer, should the badge and filter counts drop to 13 / 5 straight away? |
| all-clear | The badge shows `14` on the empty state | Should the badge be hidden or show 0 when nothing is waiting? |
| answered-with-undo | `Olive Jones marked Still on. Warning stopped for this show.` with Undo; it "stays in place for the session" | What counts as the session: until reload, navigation away, or a timeout? Should it survive a reload? |
| answered-with-undo | Only an undoable answer is drawn | 2a gives notifying answers (Cancelled, Postponed, Moved, Price check, Approve batch) no Undo. What does their answered row look like? Not drawn. |
| answered-with-undo | Undo after a snooze | Is there an answered row or Undo after a snooze? 2a has `DELETE …/snooze`, but no board draws a snoozed confirmation. |
| answered-with-undo | Desktop only | The answered row on mobile isn't drawn. |
| snooze-menu | "From the clock on any item" | No card on desktop or mobile, and no panel, draws a clock trigger. Where does it sit? On mobile, is it inside the `⋯` on an-item-mobile? |
| snooze-menu | `Back tomorrow at 8 AM`; `Back Wed, Nov 18` | Is 8 AM Mountain Time a fixed rule for both options? What time of day does "a week" return? |
| snooze-menu | `Until a date…` | The date picker isn't drawn (and isn't drawn on phone). |
| snooze-menu | `Not useful`: "Stops this kind of warning for this venue. Tell us why." | The reason input isn't drawn. What does Not useful mean on items with no venue (artist, price check, price batch, bug)? Is it offered there at all? Once a kind is turned off for a venue, how is it turned back on? No surface is drawn. |
| snooze-menu | A desktop popover at 380 wide | The phone version (a sheet?) isn't drawn. |
| all-clear | `Last night's crawl 20 of 21 OK`, `Next crawl Tonight, 3 AM`, `Snoozed 2 venues off-season`, `Open Health` | 2a doesn't supply this. Which API feeds it (1c Health)? Is "Snoozed" only off-season venues, or every snoozed item? What if snoozed items aren't off-season? |
| all-clear | Mobile only | The desktop all-clear isn't drawn. Is a filter with no items (for example Bugs 0) the same state or a different one? |
| couldnt-load | Try again and Open Health (the line itself is settled by #178 item 10) | The mobile couldn't-load isn't drawn. What does the badge show when the count call fails? (The board shows 14.) |
| 07/loading-needs-you | The skeleton is a table: one wide pill plus 4 pills, rows with an icon square, two lines and a chip | Rule 9 says "the page's final shape", but the real page is 6 filter pills and stacked cards (plus an evidence panel on desktop). Which shape should the skeleton follow? The mobile skeleton is only the generic `loading-any-list-on-mobile`. |
| needs-you-desktop | The desktop open state has the evidence panel open with the Fiddler card selected | Is the desktop default with nothing selected (no `?item=`) blank, or does it open the first item? Not drawn. |
| needs-you-desktop / mobile | Card answers: show-dropped is `Postponed`, `Cancelled`, `Still on` (none highlighted) | The panel draws `Still on` as the suggested primary, plus a fourth answer `Moved…`. Does the card show the suggestion and the order from the panel? Rule 1 says two or three answers, so is it right that the card drops Moved…? |
| needs-you-desktop | PRICES card: `You approve every price yourself while fewer than 50 people submit.` | 2a's setting `approve_prices_myself` is a plain boolean with no 50-submitter threshold. Is the threshold real (auto-off at 50), or is it copy only? |
| needs-you-desktop | PRICES batch card answers: `Approve all 8` and `Review` | Does Review open the sheet? Does the batch count as 1 decision or 8 in the badge and in `Prices 2`? |
| needs-you-desktop | Card `ARTIST … 2 reports`: "Matched by name only. Spotify has 6 artists called Cashmere." | There's no stored "matched by" method. `SpotifyCandidateSnapshot` has no count of same-name artists, so is 6 the number of stored candidates? Also, Spotify sync is retired: is Spotify still the right source to name here? |
| needs-you-desktop | Card `EVENT … Hidden until you decide` | The code doesn't hide unverified events (`verified` is only selected, not filtered, in `routes/events.ts`). Should this be "Listed", or should 2a add hiding? See 2c. |
| needs-you-desktop | Card SHOW: `Dropped off Globe Hall's calendar 5 sweeps ago` | Is "sweeps" the number of runs since `first_missing_at`? (Copy fix for the lane: the boards say "runs" elsewhere.) |
| redirects (plan) | `review?tab=event-flags`, `missing`, `contests` → Needs you | `classify-missing` also returns `duplicate` and `crawl_gap`. Neither has a drawn Needs you card. Do they enter the queue, auto-resolve, or stay hidden? |
| plan 2b vs README "Fewer shows than usual" | The Fiddler card says `Off-season?` | Is the `venue-quiet` card's when-slot always the cause word (Off-season? / Page change? / Cap?)? Only off-season is drawn. |

## Admin 2c Needs you evidence panels

| board | what it says | the question |
|---|---|---|
| all 8 panels | Every panel is drawn at 440 desktop width; only show-dropped has a phone board (an-item-mobile) | The phone full page for the other 7 kinds and the price batch isn't drawn, including the fixed-footer layout with 2 or 3 answers plus link-type answers. |
| an-item-mobile vs show-dropped | Phone drops the `Artist's own site` row, the `· Thu Nov 12` date in the chip, the "so it ranks first" line and the explanatory footnote; it uses `12 Watching` where desktop has `12 watching` | Which content is canonical? Should phone also drop the footnote under the answers? |
| an-item-mobile | The `⋯` menu at top right | Its contents aren't drawn. Is that where Snooze lives on the phone? |
| all panels | — | Panel loading, panel couldn't-load, and answer save failed (rule 10, inside the panel) aren't drawn for any kind. |
| show-dropped | `Ticket link: Still live, "Sold out"` | No source. Nothing fetches or parses the ticket page today (classify-missing has no link check). Is this a new live fetch? Is it covered by robots and the 3 s pace? What are its other values (dead, unchecked)? |
| show-dropped | `Artist's own site: Not checked` | No source, and no state where it is checked. Should this row be dropped? |
| show-dropped | `Same act, another venue: None found`; `The other 41 Globe Hall shows crawled fine` | Moved-candidate gives the first. Is the second a count from the last run? When the rest of the venue did NOT crawl fine, the item becomes a venue notice (2a grouping), but that venue notice isn't drawn. |
| show-dropped | Still on is the suggested primary because the ticket link works | What's the suggested answer when the link is dead or unchecked? Is there a rule? |
| show-dropped / an-item-mobile | `Moved…` | What does Moved… open (a venue or show picker)? Not drawn. |
| show-dropped | `Postponed` | Does Postponed ask for a new date? Not drawn. |
| show-dropped, show-moved | `Cancelled`, `Postponed`, `Move to …` notify Watchers, and the plan puts these behind ConfirmDialog | No Needs you confirm dialog is drawn. Reuse `06/mark-cancelled` (and its mobile sheet) for all of them? What about Postponed and Move? |
| show-moved vs card | Panel `Move to Globe Hall` vs card `Moved to Globe Hall` | Copy fix, lane: the button labels differ between card and panel. |
| show-moved | `Prices submitted for Larimer stay on the history, not the new listing.` | Copy fix, lane: "history" is a banned label word. Is that also the real merge behaviour? Merge Duplicates (README item 23) moves prices to the kept listing, which contradicts this. |
| show-moved | `Match` chip; title "The venue renamed it 'MOVED TO GLOBE HALL'" | moved-candidate.ts matches on date or venue reason, not on a renamed title. Is the "renamed MOVED" signal new detection? Only a strong `Match` is drawn: what about a weak match, no match, or a date-only reschedule (`reason: 'date'`)? |
| venue-auto-paused | `LAST 4 RUNS` table | Plan 2c says VenueFailing shows "the last 14 runs with their reason". Which is right, 4 rows or 14? |
| venue-auto-paused | `Keep paused…` | The `…` implies a dialog. Is it `01/pause-crawling` (with reason and resume)? Not drawn here. |
| venue-auto-paused / Fiddler | `Check source` opens the venue's Source tab; the card says `Re-crawl` and the panel says `Re-crawl now` | The Source tab ships in 3c, after 2c. Where does Check source point until then? Copy fix, lane: Re-crawl vs Re-crawl now. |
| needs-you-desktop (Fiddler, venue-quiet) | `LAST 14 RUNS` bars, `SHOWS BY MONTH, LAST YEAR`, `usually 20+`, "last year … went quiet Oct 18 and filled again in March" | This is the only board for venue-quiet. There is no 2c board for its other causes (page change, cap). Where does "usually 20+" come from (triage baseline?), and is last year's monthly data a query on past `events`? Plan 2c folds this into `VenueFailing.tsx`: is that the right home? |
| needs-you-desktop (Fiddler) | `Off-season until Apr 1`: "keeps crawling and listing… If the calendar fills early, it comes off-season by itself" | How is Apr 1 derived? Is this a snooze with an auto-clear? 2a's snooze has no auto-clear. How does it relate to `01/pause-crawling`'s `Off-season` reason? |
| venue-blocked | `Ask the venue` drawn as an enabled primary | Plan 2c makes it disabled until 3c, "with a line saying so". That disabled state and its line aren't drawn. |
| venue-blocked | `Pages this run 1 of 4, then stopped`; `Before this 62 OK runs in a row`; `robots.txt Still allows /events`; `Our pace 1 page every 3–5 s` | The first needs 1a's fetched-page records. Is robots re-checked live when the panel opens, or read from the run? Is the pace a constant? |
| venue-blocked | `Pause crawling…` and `Re-crawl once` | Does Pause crawling… use the `01/pause-crawling` sheet? Re-crawl once is a manual retry of a blocked venue: does it clear `blocked` if it succeeds? |
| venue-blocked / venue-auto-paused | Chips `Blocked: 429`, `Auto-paused: 3 failures` | 01 draws `Auto-paused: 3 failures` but no `Blocked: <code>` form. Confirm the `VenueStatus` label carries the status code. |
| artist | Candidates show `Denver · indie soul · 3.1K listeners`, `Plays Denver` and `Current` | `SpotifyCandidateSnapshot` has id, name, image, genres and URL only: no location, no listener count, and no "plays Denver". What's the source, or should these be dropped? |
| artist | `Search for another` | Is this `06/artist-search` (an overlay, full screen on phone)? Not drawn from Needs you. |
| artist | Panel answers `Use Cashmere (Denver)`, `Keep current photo`, `No photo` vs card `Pick the right artist`, `Keep this match` | The card and panel answers don't match. Which set goes to 2a's answers.ts? 2a's Undo list names "Keep match". |
| artist | "Same panel for an Ambiguous or No match artist… just without the reports" | The no-reports variant and a no-candidates variant aren't drawn. |
| event-low-confidence | "Haiku gave it 0.60, under the 0.75 bar, so it's hidden until you decide"; chip `Hidden` | The code threshold is `AUTO_APPROVE_THRESHOLD = 0.7` (crawler-core `crawl.ts`), and unverified events are not hidden from fans. Which is right? Should 2a source this from `verified=false` (plan) or `is_concert_review_needed`? |
| event-low-confidence | `WHY WE'RE UNSURE: It reads like a talk: "conversation", "Talk 7", "Q&A"` | No column stores the LLM's reason or trigger words. Source? |
| event-low-confidence | `FROM THE VENUE'S PAGE` (the raw venue text) | Is that `events.description`, or a fetched-page excerpt (1e is blocked)? What shows when it's empty? |
| event-low-confidence | `Edit, then list` vs the card's `Edit` | What does it open (4b event edit, which isn't built yet)? Copy fix, lane: Edit vs Edit, then list. |
| event-low-confidence | "Not a concert hides it for good and teaches nothing automatically" | 2a's Undo list includes Not a concert. Does "for good" conflict with Undo? |
| price-check | `LISTED NOW $29–$64 · 1 fan · no photo`; `PRICE CHECK $45+ · 1 fan · screenshot` | `price_submissions` has no photo or screenshot column. Source? Can the screenshot be opened? Not drawn. |
| price-check | `Ticket page: GA from $45.50, fees extra`; `Red Rocks, similar shows $45–$89`; `The fan who checked: 4 prices, all approved` | What fetches or parses the ticket page? How is "similar shows" defined? The third is derivable. Is it right that no reporter handle is shown (rule 7)? |
| price-check vs needs-you-mobile | Panel `Use $45+`, `Keep $29–$64` vs card `Use $45`, `Keep $29` | Copy fix, lane: the price formats differ between card and panel. |
| price-check | "Both fans hear back in Submitted prices. Price check wording is locked vocabulary." | Copy fix, lane: the second sentence is a design note rendered as UI copy. |
| price-check | Plan says "Ticket page first"; the board makes `Open ticket page` the third action | Plan and board disagree on order. Which wins? |
| bug | `New · 2 h ago`, chip `Bug report` | Feedback statuses are unread/read/flagged; "New" isn't one of them. Does opening the panel (marking it read) remove the item from Needs you? |
| bug | `Errors: None in Sentry` | No source. It needs a Sentry API lookup by user or time. Is this in scope? |
| bug | `Page: Event · Submit a price`; `Device: iPhone · Safari 19` | These need a page-name map from `page_url` and a parse of `metadata.device` (raw UA is banned by rule 7). Confirm both are wanted. |
| bug | "Error reports from Sentry use this panel with the stack in place of the screenshot" | The error-report variant (with the stack) isn't drawn. Do 2a's `bug` items include `metadata.source='error'`, or only category `bug`? |
| bug | `ONE-OFF REPLY` and `Send reply and resolve` | The reply delivery (README item 18) lands in 5d, after 2c. Does 2c build reply sending, or ship without it? |
| bug | `Open in GitHub` | Does it create an issue (`issue_opened`) or open the existing `issue_url`? |
| bug | `From @pierresauce` | The state for a reporter who deleted their account (`user_id` null) isn't drawn. |
| a-batch-of-prices | Title `8 new prices`, but 6 rows are drawn | Does the list scroll? The rows include Wed Nov 11 (today), Dec 31, Feb 22 and Apr 29, which contradicts the card's `Shows in 2–30 days`. Which window defines a batch? |
| a-batch-of-prices | "Untick any you want to look at first" | Where do the unticked prices go: stay held in the batch, or become single items? Can a row be opened to look at it? Not drawn. |
| a-batch-of-prices | `Approve 8` vs card `Approve all 8` | Copy fix, lane: the labels differ. Does the count update on untick, and what happens at 0 ticked? |
| a-batch-of-prices | A mobile sheet only | The desktop version (plan: AdminSheet or SidePanel) isn't drawn. Is batch approval notifying with no Undo, and does it need a ConfirmDialog? Approve failed / partial failure isn't drawn. |
| a-batch-of-prices | Chip `2 fans` | Is it `corroboration_count`? Can it be more than 2? |


# Admin 3a / 3b / 3e pre-audit

Sources: plan `docs/superpowers/plans/2026-11-11-admin-redesign.md`, handoff `design/design_handoff_admin_redesign/` (01, 04, 05, phone-addendum gaps 2–4), schema `packages/db/src/schema/{venues,crawl-runs,crawl-triggers}.ts`, `apps/api/src/routes/admin/venues.ts`, `packages/types/src/venue-guide.ts`. Read-only.

## Admin 3a Venues list, Overview, Runs, menu

| board | what it says | the question |
| --- | --- | --- |
| 01/pause-crawling | RESUME: When I say / In 2 weeks / Pick a date | No column stores a resume date (3c adds only `crawl_paused_reason`) and no job auto-resumes. Which PR adds `crawl_resume_at` plus the resume job? |
| 01/pause-crawling, plan row 3a | Pause takes a reason | `crawl_paused_reason` lands in 3c, but 3a depends only on 0b and 1a. Should 3a depend on 3c, or should the reason go in audit meta (where today's `crawl-pause` route already puts it)? |
| 01/pause-crawling vs 01/venues-list-status-columns caption | Pause reason "Off-season", but the caption says off-season "is a snooze on warnings, not a status, so Fiddler's Green still reads Crawling" | These contradict. Is Off-season a pause reason or a warning snooze? If it's a snooze, what stores "until Apr 1" (2a's `admin_queue_snoozes`?) and where is it set? |
| 01/pause-crawling | Reason "Waiting on permission"; chip reads "Paused: awaiting reply" (01, 04); 05 reads "Paused: waiting on permission" | That's two chip texts for one reason. Copy fix, lane. |
| 01/pause-crawling | Reasons Off-season, Site is broken or moved, Other | Only the waiting-on-permission chip is drawn. What do the crawl chips say for the other three? Rule: a drawn crawl chip always carries a reason. Does Other take free text, and if so where is the field? |
| 01/pause-crawling | "Pick a date" | No date picker is drawn. |
| 01/pause-crawling | Drawn only as a 390 sheet | What is the desktop form? Decision 1 maps desktop to phone, not the reverse. Rule 4 makes a short form a side panel, but a confirmation is a dialog. |
| 01/pause-crawling | Selected radio, selected chip and the main button all use the gradient | Is that more than one glow on the screen? |
| 04/the-menu | Pause crawling…, Make flagship, Hide from site…, Delete venue… | Only a live, crawling venue is drawn. What does the menu say for a paused, auto-paused or blocked venue (Resume crawling?), a hidden one ("You can show it again from the ⋯ menu", but no Show on site line is drawn), or a flagship one (Remove flagship)? |
| 04/the-menu | "Make flagship" with "Works as it does today." | It isn't in the plan's 3a menu list. Also, the subtitle reads like a design note, not UI copy. Copy fix, lane. Confirm it ships (`venues.featured`). |
| plan decision 21 | A takedown line as the fourth ⋯ line, behind the sheet pattern | It isn't drawn anywhere: no menu line, no sheet copy, no warning that prices are deleted for good (`POST /:id/remove`), and no result state. `onSite` has `live, hidden, draft`, with no `removed`. What chip does a taken-down venue show? |
| 04/hide-from-site | Why: Venue closed / Not a music venue / Asked us to stop / Other | "Asked us to stop" overlaps the takedown (decision 21). Is it the takedown, or a plain hide? Where is the reason stored? Other has no text field drawn. |
| 04/hide-from-site | "Crawling stops too" | The crawling axis has no value for hidden (`crawling, paused, auto_paused, blocked, robots_disallowed`). What does the second chip read on a hidden venue? |
| 04/delete-venue | "A venue with shows or Watchers can't be deleted; hide it instead." | Only the allowed case is drawn. The refusal is not: is the menu line disabled with a reason, or does the dialog refuse? Plan row 3a requires it. Today's `DELETE /:id` detaches events instead of refusing, so the API changes. |
| 04/delete-venue | Drawn over Ball Arena's page, but the dialog names Dazzle Jazz Club with 0 shows | This is a board inconsistency. Confirm the dialog is for the current venue only. |
| 04/venues-desktop | "robots.txt changed 1" filter; ROBOTS.TXT "Changed" | No source: only `robots_txt_allowed` and `robots_txt_checked_at` exist, with no stored rule or hash to diff. The Disallowed and Unchecked (NULL) values aren't drawn either. Decision 4 redirects to `?robots=disallowed`, but no Disallowed filter is drawn. |
| 04/venues-desktop | Filter "Needs a look 3", but four rows carry the pink dot | What is "Needs a look"? It doesn't match the dot count. |
| 04/venues-desktop, venue-overview | Pink dot; "In Needs you: Nothing for Ball Arena." | These read the 2a queue API, and 3a doesn't depend on 2a. Add the dependency, or say what shows before 2a? |
| 04/venues-desktop | "worst first" | The ordering rule isn't defined (OK rows with a dot sit among OK rows without one). What is the sort key? |
| 04/venues-desktop | "Select" button | Bulk select: no selected state or actions are drawn. What does it do? |
| 04/venues-desktop | "11 more, all OK" | Is it a collapsed row? Does a click expand it? It isn't drawn expanded. |
| 04/venues-desktop, 01 | LATEST "Paused by Hugh · Oct 28" | No `crawl_paused_by` column. Should it come from `audit_log` (`venue.crawl_pause`)? |
| 04/venues-desktop vs 01 | "OK · off-season until Apr 1" vs "Off-season until Apr 1"; "Skipped: page unchanged since Nov 10" vs "Skipped: page unchanged" | Two latest-line formats. Copy fix, lane. The off-season source is the same question as above. |
| 05/after-ask-the-venue | Draft chip, "Asked Nov 11 · reminder Nov 25", They said yes / They said no in the list row | 04/venues-desktop has no Draft filter and no row with buttons. Venues mobile cards have no buttons. Where do draft rows sort, and what is the phone version? |
| 04/venue-overview | "Added by fans or by hand 129" (= 235 − 106) | Fans can't add shows, and `events.manual` is 4a, which isn't a 3a dependency. What is this number's source? As drawn, it's upcoming minus last-run found, which isn't what the label says. |
| 04/venue-overview | "What's normal here": Usual shows per run 90–120, Unchanged skips up to 3 days, Season All year, Edit what's normal | No storage in any migration (3c adds none). No edit form is drawn. What stores these, and in which PR? |
| 04/venue-overview, venue-runs | Run status "Low" ("28 shows, usually 90–120") | `crawl_status` is `success, failed, partial, skipped`, and 1a's reasons have no "low". It depends on What's normal, which has no source. |
| 04/venue-overview | Last 14 runs legend: Shows found / Skipped, unchanged / Low | Failed, Partial and Paused bars aren't drawn. |
| 04/venue-overview | Suggestion card "Read Ball Arena from its ticketing feed? … #2 in LLM spend … ticket links go to one platform" | No detection logic in the plan, no Ticketmaster fetcher exists (see 3b), and "Not now" has no storage. When does the card show, and who builds it? |
| 04/venue-overview | "Guide •" dot on the tab | No per-step skipped state is stored. What drives the dot, and which tabs can carry one? (Same question as 3e's "dots on the venue page".) |
| 04/venue-mobile | Mobile Overview drops "What's normal here", "In Needs you", "Hidden, not counted", Open run, Re-crawl anyway and the neighbourhood line | The caption says "Overview stacks the same cards". Which is right? |
| 04/venue-overview | Re-crawl, View on site always enabled | Re-crawl's states aren't drawn: queued or running, and disabled when paused, blocked or robots-disallowed. View on site isn't drawn for a hidden or draft venue. |
| 04/venue-runs | Run detail is an in-page right column beside a narrowed table | This conflicts with rule 4 (an overlay side panel; never shrink the table) and with 1d's `RunDetailPanel` as a `SidePanel`. Which wins? There's no empty state for when no run is selected. |
| 04/venue-runs | Runs list stops at Nov 5 | No paging or "older" control is drawn. Test-crawl runs (3c `mode=test`) and by-hand runs: are they listed, and how are they labelled? |
| 04/venue-runs | "page half-loaded"; "We kept the 106 shows from Nov 7; none were removed" | 1a's reasons have no half-loaded value, and nothing records "removed 0". What is the source? |
| 04/venue-runs | HOW WE READ IT: 1 HTML No shows found · 2 JSON-LD No shows found · 3 Haiku 28 shows | Per-step results aren't stored. `crawl_runs` has only `extraction_strategy_used`, and 1a doesn't add per-step counts. |
| 04/venue-runs | PAGES "…/events?page=2 Timed out at 30 s" | `crawl_run_pages` has `http_status` and `bytes`, but no error or timeout field and no duration ("3.1 s"). Add them to 1a? |
| 04/venue-runs | "This is normal" updates What's normal | No storage exists, so what does it write? |
| 04/venue-runs vs gap-2/run-detail-sheet | Desktop "28 shows"; phone "Found 28 items, 12 concerts"; Inspect "28 items read; 12 were concerts" | Is the run's count 28 or 12? The boards disagree. |

## Admin 3b Source, Details, Guide, Inspect

| board | what it says | the question |
| --- | --- | --- |
| 04/venue-source, gap-4 | Ticketing feed: "AXS, Ticketmaster, Etix, DICE, Eventbrite. Fastest, no LLM cost." | None of these fetchers exist. `api_provider` is `['venuepilot']`, `platform` is `aeg, livenation, detail-page`, and Etix isn't even in `ticket_vendor`. Which PR builds feed fetchers? Or should the list show only what exists? |
| 04/venue-source, gap-4 | Three choices: calendar page / ticketing feed / don't crawl | No state is drawn for today's real configurations: VenuePilot (Levitt), Ticketure (Meow Wolf), AEG, Live Nation, detail-page. What does Source show for them? |
| gap-4 README field mapping | Seller and venue ID map to `api_provider`, `api_account_id`, "(or `platform`, `platform_venue_id`)" | "Or" is undecided. Which columns? |
| gap-4/source-dont-crawl | "Don't crawl" | No column means this (`extraction_strategy='manual'`?). The crawling axis has no "not crawled" value, yet the board still shows a "Crawling" chip. What does the chip say? |
| 04/venue-source | "We start here and follow its own 'next page' links." | Pagination code only turns up in the platform fetchers. Does the HTML path follow next-page links? If not, the copy claims something untrue. |
| 04/venue-source | Fixed rules: "3 s minimum between pages", schedule, auto-pause, "Shown, not editable" | `venues.crawl_delay_ms` is per venue and editable today, and robots Crawl-delay can raise it. Show the venue's real value, or drop the column from editing? |
| 04/venue-source, gap-4 | "Test it now"; "Test found 106 shows … Save to switch tonight's run" | The test crawl is 3c (`crawl_triggers.mode='test'`), but 3b depends on 3a and 1e only. Add 3c as a dependency? |
| plan 3b | "absorbs `CrawlSplitView`'s diagnostics and staged apply into Source" | No Source board draws diagnostics or staged apply. Where do they go, or are they dropped? |
| 04/venue-source | Drawn on desktop in the default state only | Desktop test running, test result, feed fields, Advanced open, robots disallows, Don't crawl and save failed are drawn only at 390. Is the phone layout the spec for desktop? The addendum says desktop gets the feed fields "under the radio" (a proposal to confirm with Hugh). |
| gap-4/source-robots-disallows | "Since Nov 11, 3:00 AM"; "The rule: Disallow: /events" | Neither the rule text nor a since-date is stored (only `robots_txt_checked_at`). |
| gap-4/source-robots-disallows | Ask the venue… on a live venue | 05/ask-the-venue says it "saves the venue as a draft". For a live venue, does asking unpublish it? These contradict. |
| gap-4/source-robots-disallows | Re-crawl still enabled under "Paused: robots.txt" | Should it be disabled? Not drawn. |
| gap-4/source-advanced-open | "Save debug HTML: Full logs on every run. Inspect already keeps…" | Addendum proposal (Hugh): drop it? It's still open. |
| gap-4/source-save-failed | "Couldn't save the source / Still reading the calendar page." | OK as drawn. |
| 04/venue-details | Link "/v/ballarena": "Changing it breaks old links; we redirect the old one." | No slug-redirect table or code exists. Who builds the redirect? Contradiction: 05 Basics says "Change it before going live, not after". |
| 04/venue-details | Tickets: "Box office: Gate 1, open on show days" | No column (`ticket_vendor` has only the enum value `venue_box_office`). |
| 04/venue-details | Capacity type "Arena" | `venue_type` is free text and the value list isn't defined (05 uses "Seated"). Is it the same list as `hero_setting`? |
| 04/venue-details | Fields: Name, Address, Link, Capacity type, Capacity, Main ticket seller, Box office, About | Editable columns today that have no home: `website_url`, `neighborhood`, `lat/lng`, `contact_email`, `price_url`. Also the icon and the hero setting, which 05 step 3 says to "add one from Details". Where do they go? |
| 04/venue-guide | Per-section Published / "Draft · check it" / Missing; "6 of 9 published" | Today the guide publishes as a whole (`guide_published_at`), with no per-section state. Does this need a schema change, and in which PR? |
| 04/venue-guide, guide-edit-a-section | "Draft the missing ones"; drafted text | Guide drafting is 3d, and 3b doesn't depend on 3d. Add the dependency, or hide the button until 3d? |
| 04/guide-edit-a-section | "drafted from ballarena.com/policies", "From the venue's policy page, Nov 10" | Draft provenance (URL, date) isn't stored anywhere. |
| 04/venue-guide | "Preview as a fan" | What it opens isn't drawn. |
| 04/venue-guide | Accessibility drawn as published text only | The "Can't document yet" state (README, 05 caption) isn't drawn on the Guide tab. Unpublish isn't drawn either. |
| 04/venue-guide vs 05/step-4 | Labels: Transit / Will call / Food and drink vs "Getting there" / "Will-call / entry" / "Food + drink"; counts "6 of 9" vs "5 of 8 sections" | One set of labels and one count basis. Copy fix, lane, but confirm the count basis (whether the insider tip counts). |
| 04/guide-edit-a-section | Edit panel drawn for a drafted chip only | Not drawn for the Insider tip (never drafted) or a Missing section ("Write"). |
| 04/inspect-a-fetched-page, gap-2 | "What we read from it": per-item rows with Concert / Not a concert; "28 items read; 12 were concerts" | The extracted items and their classification aren't stored (1a stores page metadata only, 1e stores bodies). What source, and in which PR? |
| 04/inspect, gap-2/inspect-fetched | Highlight "(stopped here)" / "Stopped here: page 2 never loaded"; "Opens at the highlight" | No data marks where a page stopped. Is it derived from the pages list, or stored? |
| 04/inspect, gap-2 | Page / Text / HTML tabs | What renders "Page": a sandboxed iframe of the stored HTML, or a screenshot (none is stored)? This is a security call for the build. |
| 04/inspect, gap-2/inspect-menu | "Compare with Nov 10": "The last full run, in the same view" | No compare view is drawn on desktop. Does it just switch runs, or diff? |
| 04/inspect | One URL per Inspect | A run has up to 50 pages. No page switcher is drawn. Which page opens by default? |
| plan 1e | Bodies over 2 MB skipped, recorded as truncated | No truncated state is drawn in Inspect. There's also no Inspect state for a feed or JSON run with no HTML page. |
| 04/inspect | Desktop drawn in the default state only | Loading, pages gone (past 14 days) and couldn't load are drawn only at 390. Are they the desktop spec too (decision 2: the nearest drawn)? |
| 04/inspect | "Saved for 14 days" (also gap-2 "Saved for 14 days", "The saved copy didn't open") | "Saved" trips the BUILD-CHECK step 5 vocabulary grep. Copy fix, lane. |

## Admin 3e Add a venue

| board | what it says | the question |
| --- | --- | --- |
| 05/add-a-venue-start, gap-3/start-mobile | "Venues people asked for": SUGGESTED rows from "Suggest a venue" | The source is `feedback_category` venue_suggestion (5d) and the fan modal (Phase 6, behind a flag). 3e depends on neither. Until Phase 6 ships, the list is always empty. Add the dependency, or accept the empty state? |
| 05/add-a-venue-start | IN FEEDBACK: "Named in a bug report: 'can't find Nocturne'" | Matching venue names in feedback (README need 6) has no owning PR or method (string match or LLM?). |
| 05/add-a-venue-start | "3 fans suggested it · latest Nov 9"; "Repeat asks add up" | No table groups the suggestions or keys them by venue. |
| 05/add-a-venue-start | "Downtown · jazz club", "100 cap" on a suggestion | The suggestion carries only a name and an optional website (the board's own footnote). Where do the neighbourhood, kind and capacity come from? |
| 05/add-a-venue-start | "robots.txt: Allowed / Disallows /calendar" on venues not yet added | When is robots.txt fetched, and against which URL, for a suggestion that may have no website? Is the result stored? |
| gap-3/start-not-for-us | "{name}: not for us. It won't show here again." with Undo | No storage. Does "won't show again" also suppress later asks for the same venue? Undo on desktop is an addendum proposal for Hugh. The desktop answered state isn't drawn. |
| 05/basics-desktop vs step-1-basics-mobile | Desktop has Website, "Asked for by" and a robots.txt line; mobile has none of them | Which field set is right? |
| 05/basics-desktop | "Asked for by: 3 fans … and it's named in 2 feedback notes. We filled in the name and address from those." | Address extraction from feedback: what method, and in which PR? |
| 05/basics-desktop, every step | "Saved as you go" | The draft autosave API isn't in 3c. A per-step save failure isn't drawn (only go-live failure is). "Saved" trips the BUILD-CHECK grep. Copy fix, lane. |
| 05/basics-desktop | Capacity type "Seated" | The value list isn't defined (see 3b Details). |
| 05/step-2-source | "Ticketing feed: None detected: its ticket links go to the venue's own site." | No feed detection is planned, and feed fetchers don't exist (see 3b). |
| 05/step-2-source, step-5 | Test found 31 shows; "Go live publishes the tested shows"; "You can leave; the result waits here." | Where are tested shows held until Go live? Does Go live publish the stored test results or start a real crawl? 3c says only dispatch-and-poll. |
| 05/source-mobile | "Use a ticketing feed" | Its fields (seller, venue ID) aren't drawn on the step-2 phone board. |
| 05/source-no-shows-found | "Inspect page" from a test run; "Wait for the page to load" | Do test runs write `crawl_run_pages` and bodies, and do they show on Runs? Which wait setting does the button set (`crawl_wait_until` or the selector)? |
| 05/source-robots-txt-disallows | "Add shows by hand" | Manual shows are 4a, which isn't a 3e dependency. Where does the link go before 4a? |
| 05/ask-the-venue | "To: booking@… (the venue's booking address) · from their Contact page" | Who finds the contact address, and how (fetching the contact page under robots.txt?)? `contact_email` exists, but nothing fills it. |
| 05/ask-the-venue | Signed "— Hugh"; "We don't send anything" | Is the sign-off hard-coded, or the acting admin's name? The 560 dialog has no phone sheet drawn, and decision 1's list doesn't include it. |
| 05/ask-the-venue | "comes back in Needs you after 14 days" | No Needs you kind for it exists among 2a's 8 kinds. Which PR adds the kind, and what are its evidence panel and answers? Not drawn. |
| 05/after-ask-the-venue | They said no: "keeps it as a draft with the reason, so nobody asks twice" | No column records the no or its reason (3c has only `permission_asked_at`). |
| 05/ask-the-venue | "like Levitt and Meow Wolf" | Those two are Live, not drafts. Is the comparison wrong, or does pausing Levitt and Meow Wolf work the same way? Copy fix, lane. |
| 05/step-3-icon-optional | References: upload images, "From the venue's site" | No upload storage (blob) is planned, and fetching images from the venue site isn't covered by 3d. Is the robots check applied? |
| 05/step-3-icon-optional | "Steer it (optional)", "Draft 4 more", "Upload an SVG" | Missing on 05/icon-mobile. Phone parity? What validates an uploaded SVG (the same 24-grid check)? |
| 05/step-3-icon-optional | "Skip it and the venue shows a plain pin until you add one from Details." | Details (04) has no icon or hero field. Where are they edited after going live? |
| 05/step-3-icon-optional | "Six settings, guessed from the venue" | What does the guess run on (venue type, LLM)? Not in 3d. |
| 05/all-six-settings | Arena "low crescent moon"; Theater, Club and Gallery are NEW | Hugh: crescent as drawn. The art waits on B+ B11 (not on main). OK as planned. |
| 05/icon-drafting | "About 15 seconds, about $0.03" | Is the estimate fixed copy or computed? |
| 05/step-4-first-timer-guide-optional | "Accessibility … REQUIRED"; caption: "'Can't document yet' still works" | The Can't document yet control isn't drawn in the flow. |
| 05/step-4-first-timer-guide-optional | "From /faq. The page is from 2024." | No source for the page date. |
| 05/step-4 vs guide-mobile | Desktop "+ Coat check" (add a section) vs mobile Coat check "Skip" | Two models for optional sections. |
| 05/review-desktop | "Who's told: 3 fans who suggested it"; Gone live "the 3 fans who asked for it get a notice" | No plan PR builds this notice (category, email, fan copy). It's fan-facing, so it needs copy-review before build. It also needs suggester identities from 5d/6. |
| 05/review-desktop vs step-5-review-mobile | Desktop "Tickets and About", mobile "Ticketing and About"; mobile drops the "When you go live" block | Copy fix, lane. Phone parity for the block? |
| 05/review-desktop | "Later steps wait as dots on the venue page" | No per-step "later" state is stored (`went_live_at` only). What marks a dot as cleared? |
| 05/review-not-ready | "Fix Source", "Save as draft" | Only drawn at 560. Phone version? |
| gap-3/gone-live-mobile | WAITING: First-timer guide 3 sections, Tickets (Details tab), About (Details tab) | Tickets maps to Details' "Main ticket seller" and "Box office". Box office has no column (see 3b). |
| 05 flow | Desktop states | Desktop start loading and couldn't load, going live, go live failed and not-for-us failed are drawn only on phone. Use phone boards as the desktop spec? |


# Pre-audit: admin 4b / 4c / 4d (boards 06 + phone addendum gap 1)

Sources checked: `events`, `artists`, `price_submissions`, `artist_reports` schema; `apps/api/src/routes/admin/{events,artists,prices,contests}.ts`; `StatusChip`; the plan's 4a ledger text. Example-data mismatches (counts 1 vs 2, names) are skipped.

## Admin 4b Events

| board | what it says | the question |
| --- | --- | --- |
| event-edit, events, events-mobile | Status chip **Moved**, selector option "Moved", "Moved to Globe Hall · Watchers were told on Nov 11." | No source. `event_status` is upcoming/cancelled/postponed only, there's no moved-to column, and `StatusChip` has no Moved variant (only soldout/postponed/cancelled/available/removed). Today a move merges into the new row (#1734) rather than keeping a Moved row. What data backs Moved, how does the admin pick the destination (picker not drawn), and where does "told on" come from? |
| event-edit | Last seen "Nov 10, as “MOVED TO GLOBE HALL”" | No stored raw last-seen title. Only `last_seen_at` and the current `title` exist. Source? |
| event-menu | "Open the crawl run · The run that last saw it" | Events have no link to `crawl_runs`. Source? |
| event-edit-mobile | Caption says "Same fields, stacked", but the board drops Doors, From the crawl, Hide from site, Add an artist, the Postponed and Cancelled options, and the Ticket page and Submitted prices rows | Does mobile have every field (caption) or the drawn subset (board)? Without Cancelled on mobile, how does mark-cancelled-mobile open? |
| event-edit | Status selector has no **No longer listed** | `delisted_at` exists and the filter lists it. Can an admin clear or set it here? |
| event-edit / mark-cancelled | Dialog only for Cancelled | Postponed also notifies Watchers (`watch.postponed` in PATCH). Does Postponed get the same dialog? It isn't drawn. |
| mark-cancelled (both) | "Refund info (optional)… Shown where Get Tickets was." | No refund column. The fan app today relabels the ticket link ("Refund info from the vendor"); it doesn't show free text. Where is this stored, and is the fan-page change in scope for 4b? |
| events, events-mobile | Hidden row shows "Hidden: unsure" in the status slot, with no show status | Rule 3 says Hidden is separate. Should a hidden row also show its status? Only the "unsure" reason (`is_concert_review_needed`) is drawn. What do other hidden rows say (hidden by admin, not a concert, duplicate)? |
| event-menu vs event-edit | Menu has "Hide from site…" and "Delete…" (ellipsis means a dialog); edit page has a plain toggle | Neither event dialog is drawn. Does hiding from the edit page skip the dialog? |
| event-menu | Delete "Only for shows added by mistake" | Today's `DELETE /:id` deletes any event. Is Delete limited to `events.manual` rows? |
| add-a-show-by-hand | Lineup is one comma text field, "Each name is matched on Artists." | 4a stores a headliner or support role and a position. How is the role set here? The edit page uses chips, so this contradicts it. |
| add-a-show-by-hand | No price or status fields | Is that intended (price added after via the sheet)? A duplicate check against an existing listing isn't drawn. |
| add-a-show-by-hand | Desktop only | The phone version isn't drawn (decision 1). It has a keyboard plus a venue list, so does it need a full screen or a sheet? |
| merge-duplicates, addendum merge-pick | "added by @dlo" | 4a adds only `events.manual boolean`, with no creator column. Source for the handle? |
| merge-duplicates (desktop) | Opens straight to compare. Has no Reports row. | The addendum adds a pick step (likely duplicate first, then search) and a Reports row on phone. Neither is drawn on desktop. Does desktop get the pick step? |
| addendum merge-compare | "Reports: 1 wrong-artist report" moves with the merge | Wrong-artist reports are keyed by `artist_id` (`artist_reports`), not by event, so they can't move with an event merge. Which reports are meant? |
| merge-duplicates | "After merging: 34 Watching… Nobody gets a notice." | 31 + 3 assumes no overlap. Is it the deduped count? Today's `/:id/merge` has `notifyWatchers` (the moved flow). Is the duplicate merge always silent? |
| addendum keep-second | "the next crawl updates this one instead of adding it again" | The 4a plan text covers the `/events/[id]` redirect only, not the crawler's match key. The addendum says the key must be caught too. Add it to 4a? (The plan's gap-1 gate is also now stale; the addendum has landed.) |
| edit-price-desktop | Sheet: Lowest, Highest, Before fees, It's free, Sold out, Where you saw it | `price_submissions` requires `tier` and `vendor` (NOT NULL) and has no URL, before-fees, free or sold-out column. The fan sheet asks for Tier and "Where it's listed". The caption says it's the "same sheet fans use". Which is it? |
| edit-price-desktop | "Sold out" in the price sheet and "Sold out" in Status | Sold out is derived from a promoted sold-out report (`isSoldOutSql`). Which control writes it, and what happens if they disagree? |
| past-shows | Status "**Played**" | Not a B+ word (rule 3) and not in `StatusChip`. OK to add? |
| past-shows | CONCERTS column "14 went"; "read-only except Hidden and lineup" | Is it a `going` count? The edit view for a past show (which fields lock) isn't drawn. Phone Past shows isn't drawn either (decision 1). |
| events-mobile | Only Upcoming, No price, Hidden and Any venue | Phone has no Past toggle, Any status filter or Add a show. The venue and status popovers aren't drawn on phone. |
| events | "Showing Nov 12–29 · 1,196 more" | Is it Load more or infinite scroll? The control isn't drawn. |
| event-edit, edit-price-desktop | "is saved as your submission, so the history stays in one place"; "Saved as your submission" | Copy fix, lane (Saved, submission, history). |

## Admin 4c Artists

| board | what it says | the question |
| --- | --- | --- |
| artists-to-check, search panel, artist-search-mobile | Candidate place ("Denver", "UK", "Bergen"), "3.1K listeners", top track "Slow Burn" | `spotify_candidates` holds only id, name, imageUrl, genres and spotifyUrl. Spotify gives followers, not listeners, has no hometown, and needs another call for top tracks. Source for place, size and track? |
| search panel | "best for Denver first", "Plays Denver" tag | No ranking signal or "plays Denver" data exists. Where does it come from? |
| artists-to-check | "Looks like a tour name", "Beacons & Brews: Not an artist: a series?" | These are string-shape heuristics. Hugh's standing ruling (#1343) bans string or shape heuristics for festival, ticket-package or non-act detection. Does the ruling still hold (drop the hints), or does Hugh reverse it? |
| artists-not-artists | Rows marked "Automatic" (Bassline Events, Denver Nuggets) | The schema says `not_an_artist` is "set by a human and never by the match job". Same ruling as above. What sets it automatically? |
| artists-not-artists | Reason ("a tour name", "a promoter", "a series", "sports") and who ("@hugh", "@jules") | No reason column and no marked-by column. "Not an artist" has no reason picker on any board. Source? |
| artists-matched | "By you 212 / Automatic 1630", "By you · today" | Only `auto_matched_at` (best-effort) exists. There is no matched-by or matched-at, and an exact matcher hit isn't told apart from a human pick. "By you" or a handle when another admin matched it (Not artists shows handles)? |
| artists-matched, search | "No photo", "No photo for now" | No column. `hidden` removes the artist everywhere, which isn't "no photo". Source? |
| artists-matched | "⋯ on a row: Change match, No photo, Not an artist"; filter "Any way" | Only the caption mentions these. The ⋯ menu and the Any way dropdown aren't drawn. |
| artists-to-check | "Name may be cut short · From “Beacons & Brews”" | Need 12 (the canonical-name fix) is deferred to a separate crawl plan. What raises this flag in 4c before that lands? |
| artists-to-check | "Use selected" on a row with "2 wrong-artist reports" | Does picking resolve the reports (`fixed`) and tell the reporters? It isn't drawn. |
| artists-not-artists | "It's an artist" | `not_an_artist` overwrites the earlier status. Which tab or status does the row go back to? |
| artists-mobile | Rows have "Pick" plus "Search"; no 60 days / Later / No show filter; no Search artists box | What does Pick open? It isn't drawn. Do the sub-filters and top search exist on phone? |
| artists-mobile | Phone shows To check only | The Matched and Not artists phone tabs aren't drawn (decision 1 names them, but they're lists, not dialogs). |
| artists-to-check-empty | Only the "next 60 days" empty is drawn | Later, No show, Matched, Not artists and search no-results empties aren't drawn. Does decision 2's nearest-board rule cover them? |
| artists-mobile | Segment "Not 96" | Copy fix, lane ("Not artists"). |

## Admin 4d Prices

| board | what it says | the question |
| --- | --- | --- |
| prices-missing-a-price | "Approve every price myself · On while fewer than 50 people submit prices" | 1b's `approve_prices_myself` is a plain boolean. Does it switch off by itself at 50, or is that advice? |
| prices-missing-a-price | "12 people submitting" | The window isn't defined (all time? 30 days?). |
| prices-missing-a-price | "only Price checks and outliers reach Needs you" | "Outlier" isn't defined in the plan or in 2a. What's the rule? |
| prices-mobile, add-a-price-mobile | "Approving every price yourself" line, no toggle | The phone toggle isn't drawn. Is it read-only on phone? |
| prices-missing-a-price | "Soonest and most-Watched first" | Two sort keys. Which comes first? |
| prices-add-a-price-in-flow | Sheet fields as edit-price (Before fees, It's free, Sold out, Where you saw it) | Same gap as 4b: tier and vendor are NOT NULL and undrawn, and URL, free and before-fees have no column. |
| prices-add-a-price-in-flow | "Publish and next" | What happens on the last show missing a price? It isn't drawn. |
| prices-submitted-prices vs submitted-prices-mobile | Desktop states: Published, Waiting for you, Price check. Mobile: **Live**, **Confirmed**, Waiting for you, Price check. | The state words contradict between desktop and mobile. Which set? How do the `pending`, `corroborated`, `stale` and `archived` values map? |
| prices-submitted-prices | Price "$45+" | Events shows a min-only price as "$12", so the format contradicts. Which one? |
| prices-submitted-prices | FROM "@handle" | `handle` is nullable and `user_id` is nulled on account deletion. What shows then? |
| prices-row-menu | "Open ticket page · Where the fan saw it" | Submissions store a vendor enum, not a URL. Source? |
| prices-row-menu | "This fan's other prices · 6 prices, all approved" | The view it opens isn't drawn. "approved" isn't one of the board's state words. |
| reject-a-submitted-price | Reasons: Wrong show, Wrong amount, Resale price, Fees included, Other; fan sees "Not used" | No rejected status or reason enum (statuses: pending, corroborated, disputed, stale, archived), and the fan `SubmissionDisplayStatus` has no "Not used" or reason display. The plan marks 4d API as "join" only. Is a migration plus a fan-side change in 4d's scope? |
| reject-a-submitted-price, prices-submitted-prices | Filter chips All, Waiting, Published, Price check | Where do rejected rows appear after Reject? There's no chip or state for them. |
| reject-a-submitted-price | Desktop dialog only | The phone Reject isn't drawn (decision 1 says sheet). Confirm. |
| prices-price-checks | "✧ Ticket page: GA from $45.50", "VIP packages added Nov 8" | No source for "what we checked". Is it automatic (LLM, pipeline) or typed by an admin? |
| prices-price-checks | "@annab · screenshot" | No screenshot or evidence column on `price_submissions`. Source? |
| prices-price-checks | One-tap "Use $45+" / "Keep $29–$64" | `POST /contests/prices/:id/resolve` requires `reason` of at least 10 characters. Is the reason dropped, or is a reason step missing from the board? |
| prices-price-checks | "Resolved 17 … with who decided and when" | The Resolved list isn't drawn. |
| price-checks-mobile | Action order Open ticket page, Keep, Use (desktop: Ticket page, Use, Keep); no Open/Resolved toggle | The order contradicts between desktop and mobile. Does the Resolved list exist on phone? |
| submitted-prices-mobile | No filter chips, no search | Do they exist on phone? |
| prices-submitted-prices | Empty or no-results state | Not drawn for Submitted prices or Resolved checks (only nothing-missing and no-checks are drawn). |
| prices-add-a-price-in-flow | "Publishes now, as your submission" | Copy fix, lane ("submission" next to Submitted prices). |


# Pre-audit: admin redesign UI rows 5a, 5b, 5c, 5d, 6

Read-only audit of the `07-people-flags-operations` boards and screens against the plan (Decisions 1-4, 12, 13, 17; migrations 5a-5d; PR table) and today's data (`apps/api/src/routes/admin/{users,invite-codes,feature-flags,feedback,notifications}.ts`, `packages/db/src/schema/{users,user-profiles,social,feature-flags}.ts`, `packages/entitlements/src/feature-flags.ts`, `apps/api/src/emails/test-fixtures.ts`). Hugh's rulings already made (Block dropped, the verified mark is set by hand in production, Send feedback goes in the account menu, the Test account tag lives in the DB, Not an admin is deferred) are not asked again.

## Admin 5a People

| board | what it says | the question |
| --- | --- | --- |
| people | Column LAST ACTIVE ("2h ago", "Now"); person "active 2h ago" | No data source. `GET /admin/users` returns only id, email, handle, role and createdAt from Clerk, and nothing in the DB stores activity. Should this be Clerk `lastActiveAt` / `lastSignInAt`, or a new column? |
| people | Column JOINED: "Oct 2 · code REDROCKS", "Nov 3 · poster HIDIVE", "Apr 23 · founder", "Jun 1 · test" | "code" vs "poster" has no source, because a poster is not stored as a separate thing; a code is a code. And what are "founder" and "test" as join sources? (Is founder the founder window? Is test the Test account tag?) |
| people | Column WATCHING per row, plus the filter counts Everyone 211 / Beta 38 / Promoter 0 / Admin 2 / Test accounts 3 | The list is paged straight from Clerk `getUserList`, which can't filter or count by `publicMetadata.role`, and has no Watching count or test flag. Is a full Clerk scan joined to the DB acceptable at this size, or do we need a mirrored role column? |
| people | Tab "People 214", but chip "Everyone 211", and footer "7 of 214" | The counts disagree. If Everyone leaves out the 3 test accounts ("Left out of counts"), which number do the tab and the footer show? |
| people | "Search by handle" | Clerk's `query` searches email and username, not `user_profiles.handle`. Should search run on our DB? Also, how is a person with no handle (`handle` is nullable) found in search? (How they show in the list is #178 item 29: first name, else @handle, else the masked email.) |
| people | "newest activity first" | Today's sort is `-created_at`. Sorting by activity needs the last-active source above. |
| people-mobile | Chips Everyone / Beta / Admin / Test, with no Promoter; desktop says "Test accounts" | Is dropping Promoter on the phone intended? |
| person | "Beta since Oct 2, set by @hugh" | Only derivable from `audit_log` `user.role.update`. What shows for someone whose role was set before the audit log existed, or by Clerk directly? Undrawn. |
| person | Stat tiles Watching 18 / Concerts 6 | `user_events.status` is `watching`, `interested` or `going`, and today the API returns only a single `trackedEvents` total. Confirm Concerts = `going` (past and upcoming?) and where `interested` goes. |
| person | "Signs in with Google" | From Clerk external accounts. Undrawn: what it shows for email-code sign-in, and for several providers. |
| person | Trying early: "Crews · On for all Beta in staging", "Wrong-artist reports · Staging is on for Me only" | Implies the person page reads staging's flag state. Under the ruling, production never reads staging. What does this line say in production admin? |
| person | Trying early toggles (Crews toggle on, though she already gets it as Beta) | What does the toggle write: a `feature_flag_users` row? What do on and off mean when the person already gets the flag through their role? Is it per environment? |
| person | Trying early row "Wrong-artist reports" | There is no such key in `FEATURE_FLAGS` (only `spotify-sync`, `crews`, `release-notes`). Is it a real flag to add, or example data? (Same on the 5c boards.) |
| person | Recent: "Reported the wrong artist on Cashmere", a price, a feedback note | What sources make up Recent: `artist_reports`, `price_submissions`, `feedback`, and anything else (Watching changes, event reports)? How many rows, and is there a See all? Undrawn. |
| person | "Their profile" button | No public profile route exists (no `/u/` in `apps/web/src/app`). Where does it link? |
| person | Test account: "Left out of counts, Beta and Needs you" | Define each exclusion. Counts: which ones (People counts, Health, the "All 211" in the flag dialog)? Beta: does a test account with role Beta *not* get Beta flags? That contradicts `flag-add-a-person`, which lists test accounts as addable. Needs you: their prices, reports and feedback skip the queue? |
| person | Desktop has no ⋯ button; person-mobile has ⋯, which opens person-menu | Where do the person-menu actions live on desktop (Sign them out everywhere, Copy their profile link, See their Submitted prices, Message them)? Undrawn. |
| person-mobile | Drops the "Joined Oct 2 with code REDROCKS" line, the role note, the Test account switch, the Wrong-artist reports row and Recent; Invite code shows no "1 of 23" | The caption says "The same blocks, stacked", but blocks are missing. Should the phone have the Test account switch and Recent? |
| person-menu | "Message them: One note to What you missed and email, like a feedback reply." | Not in the plan's 5a scope, there is no message API, and the compose form is undrawn. Build it or drop it? |
| person-menu | "Copy their profile link /u/mira.k" | Same missing route as "Their profile". |
| person-menu | "See their Submitted prices · 4 prices" | The target is undrawn: Prices › Submitted prices filtered to a person? Does 4d's tab support a person filter? |
| person-menu | "Sign them out everywhere: For a lost phone. They can sign in again." | No confirm and no done/failed state is drawn. Does it ask first? What does the result toast say? Is there a Clerk session revoke call (none exists in `users.ts` today)? |
| person-menu | "Block… They can't sign in or submit. Asks first." | Block is dropped (no 5e). Confirm this line comes out of the drawn menu. |
| make-an-admin-asks-first | Confirm dialog, desktop only | The phone version is undrawn. Decision 1 makes it a bottom sheet; does Design accept that? |
| make-an-admin-asks-first | "Admins see … people's emails when they choose to show them" | Removing an admin (Admin → Member) doesn't ask and has no Undo board. Also, the API returns 403 when you demote yourself; that error state is undrawn. |
| role-changed-with-undo | "@mira.k is now Member · Their Beta badge and Beta flags are off on their next page load. · Undo" | How long does the Undo last? Does an Undo write a second audit row? Is the toast on the phone undrawn? |
| email-revealed | "Shown for this visit only … written to the Activity log with your handle" | Not wired today: the API returns the full email to the browser. Needs a new endpoint that returns the email only on Show email and audits `user.email_shown`. What does it show when Clerk has no email (`clerkAccountMissing`)? Undrawn. |
| loading-people / loading-person | Drawn on desktop | No people-specific mobile skeleton; it uses the shared mobile boards. Fine. Couldn't load follows decision 2. Nothing to ask. |

## Admin 5b Invite codes and Posters

| board | what it says | the question |
| --- | --- | --- |
| new-code-in-flow / new-code-mobile | "Code GLOBEHALL · Letters and numbers. Suggested from the label; change it if you like." | The API always generates `BETA-XXXX-XXXX` and takes no code. Undrawn: the code-taken error, and the rules for length, case and allowed characters. What does the suggestion do when the label has no letters? |
| new-code-in-flow | No recipient email field | Today's API can email a one-seat code (`recipientEmail`). Is that feature dropped, or kept somewhere undrawn? |
| invite-codes | Tab "Posters 3"; labels "Poster · Hi-Dive bathroom" | No poster entity exists. What counts as a poster (a multi-seat code, a code with a printed poster)? Is "Poster ·" part of the label text, or derived? |
| invite-codes | MADE BY "@jules" | `created_by` is a Clerk id, so it needs a handle lookup. What shows when the maker has no handle or is deleted? Undrawn. |
| invite-codes | Statuses Active / Full / Expired / Revoked | Which wins when a code is both Full and Expired, or Revoked and Expired? Is today's `redeemed` status (posters page) folded into Full? |
| invite-codes-mobile | Cards with no ⋯ | What does tapping a card do on the phone? The code panel (`a-code-in-flow`), the row ⋯ menus, Edit, Revoke and Reactivate are all undrawn on the phone (decision 1 sheets). Does Design accept that? |
| a-code-in-flow | "Add seats" button and "Revoke…"; Edit is reached from the row ⋯ menu | Is "Add seats" the same as Edit…, or a separate control? Undrawn. |
| a-code-in-flow | "Who joined with it · 23 … See all 23"; rows "Joined Oct 2 · Beta" | "See all" target is undrawn. The role per person needs a Clerk lookup per redeemer. |
| a-code-in-flow | "Last used Nov 9" | From max `invite_code_redemptions.redeemed_at`, but older codes set only `used_at`. Confirm the fallback. |
| edit-an-invite-code | Expires: Never / 7 / 30 / 90 days, for a code that already expires Feb 1 | How is an existing exact date shown, and kept? None of the choices matches it. Undrawn. |
| edit-an-invite-code | Seats 25 / 50 / 100 / Other; "23 already used; can't go below that." | The validation error for Other set below the used count is undrawn. |
| reactivate-a-code | "It was revoked on Nov 2 because it was posted publicly." | There is no revoke-reason field: `revoke-asks-first` asks no reason, and `invite_codes` has no column for one. Where does "because…" come from? |
| reactivate-a-code | Expires picker on Reactivate | For a revoked code whose expiry hasn't passed: keep the old date? Also, a Full code can't be reactivated; Edit seats is its only way back. Confirm. |
| code-row-menu-expired-or-revoked | Copy link "Shows 'This code has ended' when opened." / revoke dialog "A poster … will show 'This code has ended' when scanned." | `auth/code` today only knows `'This code has expired.'` and has no revoked state. The fan page is undrawn and outside 5b's routes. Is it in 5b? |
| invite-codes-none | "Each can seat up to 500 people." | Fine. |
| posters-mobile | Only the phone picker is drawn | Posters' loading and empty states (no multi-seat code to pick) are undrawn, and there is no `loading-posters` board. Also, `new-code-in-flow` "Make a poster for it next" opens Posters with a code picked; if the new code has 1 seat, today's posters page leaves it out. What happens then? |
| loading-invite-codes | Drawn | Nothing to ask. |

## Admin 5c Feature flags

| board | what it says | the question |
| --- | --- | --- |
| production-admin-feature-flags | Right column "Staging: Beta + 2 · Nov 9", "Staging: Everyone · Oct 30", "Staging: Me" | Production reads staging's step automatically, which the ruling forbids. Drop the "Staging: <step>" line, or have it typed by hand? |
| production-admin-feature-flags / production-flags-mobile | "Verify on staging admin to unlock"; subtitle "A flag unlocks here once it is verified in staging admin." | Under the ruling, the verified mark is set by hand in production, but no production Mark verified control or dialog is drawn. Where is it, and what does it ask? The copy also needs to change. |
| a-flag-in-production-admin-in-flow | "Verified on staging Nov 9 · staging is Beta + 2 people"; history "Verified on staging by @hugh", "Unlocked" | Same cross-environment read. Is the history row the production admin's by-hand mark? Is "Unlocked" a separate event? |
| everyone-in-production-asks-first | "Staging · Beta + 2 people · verified Nov 9" | Same cross-environment read inside the dialog. What does it show instead? |
| mark-verified-asks-first | "Production unlocks for this flag." / note "Shows on the flag in both admins." | Both imply staging writes to production. With by-hand marking, what does staging's Mark verified unlock, if anything? Does the note travel? |
| mark-verified-asks-first | Three checks: Tried it as Me / Checked it on a phone / Checked it with the flag off | Are they required before Mark verified is enabled? Are they stored? The ledger has only `verified_at`, `verified_by`, `verified_note`. |
| a-flag-in-staging-admin-in-flow / a-flag-mobile | "Verified Nov 9 by @hugh … Undo" | What does un-verifying do to production? In production, does it lock a flag already on, and step it back? Is there a time limit on Undo? Undrawn. |
| staging-admin-feature-flags | "Mark verified appears once the flag is on for anyone." | The right column for an unverified flag that is Off is undrawn. Does changing the step after verifying clear the mark? |
| staging/production boards | Ladder step "Me" | With two admins, who is "Me": the admin who set it, or every admin? The stage needs an owner user id, which the ledger doesn't have. |
| production-admin-feature-flags | Locked row: the ladder is greyed, with Off selected | Undrawn: a locked flag that is already above Off in production (from before the migration). Can it still be stepped down? |
| a-flag-in-production-admin-in-flow | "Named people are set per admin" | Fine. Production's phone flag panel (`a-flag-mobile` is staging only) is undrawn. |
| a-flag-mobile | No History section (desktop has one) | Is dropping History on the phone intended? |
| a-flag-in-staging-admin-in-flow | "Beta is 38 people"; everyone dialog "All 211 people see Crews" | Counts come from a scan of Clerk roles. Does 211 leave out test accounts while the flag still reaches them? (See the Test account row in 5a.) |
| a-flag-in-*-in-flow | History "@hugh: Me → Beta", "Added, Off", "Nov 2 · Off → Me" | `feature_flag_history` is new. What does a flag show for changes made before it existed? `audit_log` `feature_flag.toggle` has only `enabled`. Backfill, or start empty? |
| flag-add-a-person | "Beta · already sees it", "Member · TEST" | No-match and save-failed states are undrawn. Is it a phone sheet (decision 1)? |
| staging vs in-flow boards | Subtitle "…mark it verified. Production unlocks once it is verified." vs in-flow "…mark it verified." | The two boards disagree on the subtitle. Copy fix, lane. |
| Phone | Mark verified, Everyone in production, Add a person | All three are undrawn on the phone. Decision 1 makes them sheets; does Design accept that? |
| Empty | No flags in code | Undrawn (after `spotify-sync` is removed, two remain). Use decision 2? |

## Admin 5d Operations

| board | what it says | the question |
| --- | --- | --- |
| feedback | Kind "ERROR REPORT · Sentry · 3 people · Nov 7" | No source. Today an error-page report is one `feedback` row carrying `metadata.sentryEventId`, and nothing groups reports by Sentry issue or counts people affected. Does the backend call the Sentry API, or group by a stored issue id? |
| feedback-error-report | "7 times", "Since 0.42.0", "First Nov 7 · last 2h ago", "Error TypeError: venue is undefined", "Devices iPhone ×2 · Android", "@dlo · No note, just the report" | All of this comes from Sentry. Rows with no note imply people who never filed feedback. Which source, and is the Sentry token server-side? |
| feedback-error-report | Buttons Mark done / Sentry / GitHub; "Reply goes to everyone who wrote a note, once it's fixed." | That contradicts README "one set of buttons: Mark done, Reply, GitHub" and Reply being a single reply. Is the reply sent automatically on "fixed"? What counts as fixed? Is there a reply composer for many people? |
| feedback-venue-suggestion | Title "Dazzle Jazz"; "robots.txt · Allows us"; "Also asked for by 2 more fans, 2 feedback notes" | The fan modal (`fan-send-feedback`) has only a free-text box, with no venue name or URL field. So where do the venue name and URL come from (a robots.txt check needs a URL), and how are suggestions grouped? |
| feedback-venue-suggestion | "Start adding it" / list "Opens Add a venue" | Add a venue is 3e, gated on the addendum and B+. If 5d lands first, where does this go? Prefilled with what? |
| feedback-venue-suggestion | "Not for us asks for a reason and marks every suggestion for Dazzle done." | The reason dialog is undrawn, there's no column to store the reason, and the bulk grouping has no source. |
| feedback / feedback-mobile | Filter chips To read 4 / Bugs 2 / Ideas 1 / Venues 1 / Done 41; mobile has no Venues | Does Bugs include error reports? Mobile drops Venues. Is that intended? |
| feedback-done | Shows "Search feedback" and only the To read / Done chips | The list board has the kind chips and no search. Is search on To read too? Are the kind chips on Done? |
| feedback | IDEA "Weekly read" | No source and not explained. What is "Weekly read"? |
| feedback-done | "Done by @hugh · on the roadmap"; "Done by @jules" | No `resolved_by` column (the ledger adds only `replied_by`). And "on the roadmap": CLAUDE.md forbids building roadmaps or status tracking. Is it `issue_opened`, with copy-review on the words? |
| feedback-done | "Open one to reopen it." | The reopen control in the panel is undrawn. |
| feedback | Decision 3: To read covers `flagged` | How a flagged item looks is undrawn, and no control sets Flag. Is the flag dropped? |
| a-feedback-item-in-flow | "Page · Vince Staples · Fillmore" | `page_url` resolved to a name. What shows for a URL that no longer exists or isn't a show page? Undrawn. |
| a-feedback-item-in-flow | "Device · iPhone · Safari 18"; "App version 0.42.1"; "From @mira.k · Beta" | `metadata.device` is a raw string, and rule 7 forbids raw user agents. Is the parse server-side? What shows for an unknown device? Also: the role is from Clerk, and a deleted reporter (`user_id` NULL) is undrawn. |
| a-feedback-item-in-flow | "Note to yourself … Saved as you type." | Comes from `admin_notes`. The autosave failure state is undrawn. Is every keystroke audited? |
| a-feedback-item-in-flow / list | "Also in Needs you · screenshot" | Needs you's `bug` kind covers `bug` in To read (plan 2a). Does an error report also join Needs you (README says "Bugs and error reports also show in Needs you")? Is Mark done in either place synced? |
| feedback-item-mobile | Pinned buttons Mark done / Reply only, and no App version | The caption says "Mark done, Reply and GitHub pinned". Board and caption contradict. |
| reply-in-flow / reply-mobile | "Send reply"; "Also mark this done" | Undrawn: sent confirmation, send failed, how a replied item's panel shows the sent reply, and Reply when the reporter is deleted or has no email. One reply only: is Reply hidden or disabled after it's sent? |
| reply-in-flow | Delivery "one notice in the app and one email" | 5d builds Reply but Phase 6 builds delivery behind a fan flag. Between 5d and 6, or with the fan flag off, does Send reply deliver, queue, or stay disabled? |
| emails | List: Show moved, Show cancelled, Price check answered, Your reply to feedback, Invite accepted, Admin: venue blocked | Only these exist in code today: `spotify_digest` (being removed), `invite_code`, `admin_alert`, `crawl_failure`, `event_count_drop`, `run_degraded`. None of Show moved, Show cancelled, Price check answered, Invite accepted or Venue blocked is an email template. Is the list example data? Which emails really ship, and is building the new ones in scope? |
| emails | "Preview uses a real upcoming show" | The preview is fixture-backed today. Which show is picked for Show moved (a real moved show, or any upcoming one)? What shows when there's none? Undrawn. |
| test-email-sent | "Test sent to h•••@…"; button "Send me a test" | `sendTestEmail` always sends to `ADMIN_EMAIL`, not the signed-in admin. Send to the clicker (a Clerk email lookup), or keep ADMIN_EMAIL and change the words? The send-failed state is undrawn. |
| emails-mobile | Only 3 templates visible; preview drops "doors 6:00 PM" and the footer | Does the template list scroll sideways or wrap? Is the preview a scaled copy of the real email (the footer is part of it)? |
| emails | No loading board | There is no `loading-emails` board, and the README count of "15 desktop pages" leaves it out. Which skeleton? |
| activity-log | Rows "Turned Crews on for 2 more people in staging", "Showed the email for @mira.k", "Paused crawling Levitt Pavilion until Apr 1" | Each `audit_log` action needs a sentence. What does an action with no sentence show? Also, "in staging": each admin has its own DB, so is the environment word right? |
| activity-log | Filters Anyone / Any page / Today; "Search the log" | Search over what (the rendered sentence, or the target name)? The day picker and paging into older days are undrawn. Mobile has search only and no filters. Intended? |
| activity-log | "Each row links to the thing it changed." | Undrawn: a link to a deleted venue, a removed flag, or a person who has left. |
| activity-log-empty-day | "Pick another day, or anyone" | Fine. |
| Phone | Error report panel, venue suggestion panel | Both undrawn on the phone. Decision 1 makes them full screen or a sheet; does Design accept that? |

## Admin 6 Fan side

| board | what it says | the question |
| --- | --- | --- |
| fan-send-feedback | Kind "Suggest a venue", with the same "What happened?" box | The Suggest a venue form is undrawn (venue name, website), but admin `feedback-venue-suggestion` needs a venue name and a URL for robots.txt. Is there a different placeholder or field set? |
| fan-send-feedback | Kinds Something's broken / An idea / Suggest a venue / Something I love / Other | Mapping is `bug`, `idea`, `venue_suggestion`, `praise`, `other`. `error_report` isn't fan-pickable; it comes from the error page. Confirm. Also: the desktop modal and the sent confirmation are undrawn. |
| fan-account-menu-send-feedback | "Send feedback · New" pill | When does "New" go away (first open, a date, a release)? Undrawn. |
| fan-account-menu-send-feedback | Background artists list: "Following" × 10, "Find artists to follow", "⌘K" | Banned word "Following" (existing fan UI drawn in the background). Copy fix, lane, or out of scope for 6? |
| fan-what-you-missed | Reply notice "FROM CONCERT CRAWL" in a list with tabs Shows / Alerts / Prices | Which tab holds the new `notifications.category`? There's no "From Concert Crawl" tab. |
| fan-the-reply | "Hugh from Concert Crawl" | The name source: admins are known by handle (`@hugh`). Clerk first name? What shows if it's blank? |
| fan-the-reply | "Send more feedback" / "Done" | Does Send more feedback prefill the kind or link the new note to the old one? Undrawn. |
| fan-the-email | "Replies to this email aren't read." | Reply-To and From address? Does it respect the fan's email settings (no settings footer is drawn, unlike Show moved)? What happens when a fan has turned email off? |
| fan-the-email / fan-the-reply | Single recipient | The error-report "Reply goes to everyone who wrote a note" fan-out (5d) has no fan board. Is it the same notice and email per person? |
| Phase 6 flag | "behind a flag" | What exactly does the new flag gate: the menu row, the Suggest a venue kind, reply delivery, or all three? While it's on before launch, the edge tab and the menu row both show. Undrawn. |


## Merged admin PRs: judgment calls to fix back to the board or confirm

From the design-review sections of the admin PRs (#169 shell, #170 primitives, #171 tokens, #152 posters). Rows the lanes already marked "fix to board" are left out.

| PR | board | what was built | the question |
| --- | --- | --- | --- |
| #169 | 07/user-menu-mobile | `components/pwa/BottomSheet` (close X, no drag handle) until 0b's `AdminSheet` replaces it | [Design] Confirm the interim sheet. |
| #169 | 01/desktop-sidebar, mobile-one-nav | sr-only labels added; the phone shell runs to 720px (plan decision 16) | [Design] Confirm. |
| #169 | 07/staging-admin-feature-flags, production-admin-feature-flags | Environment badge at topbar right; breadcrumbs use "/" as in 07/not-found; PRODUCTION checked by hand | [Design] Confirm badge placement and the "/" separator. |
| #170 | primitives | ConfirmDialog DOM order was approximated (FLAG tone and skeleton heights: answered in #178 item 29) | [Design] Confirm, or give exact values. |
| #171 | tokens | `--shadow-lg` mapped to `--shadow-strong` | [Design] Confirm the mapping. |
| #152 | invite_poster admin-posters-mobile | 640px is drawn as the phone layout (the CSS breakpoint is 720px; the board has no tablet) | [Design] Confirm 640 uses the phone layout. |

## Admin: open from #178 (b1)

| board / PR | what it says | the question |
| --- | --- | --- |
| #178 item 29, FLAG kind label | "Info tone, like VENUE and SHOW." | [Design] VENUE is drawn in warning (#FFD27A) and SHOW in accent (#FF7BD4), so they differ. Which colour is FLAG? Built as `--signal` for now. Nothing renders a FLAG label until 2b, so it needs an answer before 2b. |
| 07/user-menu-desktop (#169) | The popover is drawn without its anchor (the board crop shows only the menu). | [Design] Where does the desktop user menu open from? Built: above the sidebar's user card, 332px wide, as the board's width. |
| 07-admin-more-no-pills (#169) | More lists Manage and System without an Invite codes row; #178 item 8 draws the interim row in the sidebar only. | [Design] Phones have no route to Invite codes until 5b (it's hidden from More as drawn, so it's reachable by URL). Add the interim row to More, or leave it URL-only on phones until 5b? |

## Admin 1c Health: open after addendum 3 (lane a6, bp2)

1c builds each of these absent, or as the nearest drawn state where a value is required, and records it in its Design review table.

| board / PR | what it says | the question |
| --- | --- | --- |
| G3, Artists pill and panel title | The only pills drawn are "Synced 3:45 AM", "Behind" ("Last sync 2 days ago. Spotify answered slowly") and "Failing" ("Spotify said 401"). All are sync states. | [Design] Hugh ruled the Artists tile shows match counts only, with no sync state. Is there a pill at all? Is the panel still called "Artist sync"? Which count buckets fold into Matched and No match? |
| G4, Site tile email-only | The values drawn are "All passing", "1 failing" and "Prod is down", with the detail "Prod smoke hourly, staging e2e, emails". All are smoke or e2e states. More's "Venues, cost, site checks" and addendum 2's "1 site check failing" also assume checks. | [Design] Hugh ruled the Site tile shows email delivery only. No email-only value, detail, failing state or threshold is drawn. What does the tile show? |
| G5, budget not set | `llmMonthlyBudgetUsd` can be null. | [Design] No tile, chart line or panel state is drawn for a missing budget. What shows? |
| G6, paused reason and venue groups | The grid draws "Levitt Pavilion · Awaiting reply". | [Design] + [eng/data] No paused reason is stored before 3c. Show a bare "Paused"? Hidden (active=false), blocked and robots.txt-disallowed venues have no group drawn. Where do they go? |
| G12, phone omits panels | health-mobile has none of these: Artist sync, The site, "Open Needs you", the grid's "Crawl runs" link, the footer, "$x a day", the footnote, "All activity". | [Design] Is leaving them out on the phone deliberate? |
| G14, phone loading and mid widths | 07/loading-health is desktop only. | [Design] There's no phone loading board. How do the tiles and columns reflow between 720 and about 1100? |

## From adm2 (2a backend scope ruling)

| board / PR | what it says | the question |
| --- | --- | --- |
| Needs you venue-failing, "Re-crawl now" (2a, 2c) | The card says it retries HTML, JSON-LD and Haiku. | [Hugh product] Those venues are auto-paused after 3 failures, and the trigger refuses paused venues. Should Re-crawl now resume and trigger, trigger once without unpausing, or stay refused until the venue is resumed? 2a builds it as refused for now. |
| Needs you bug, "Send reply and resolve" (2a, 5d, Phase 6) | The bug card offers a reply to the reporter. | [Hugh product] No delivery path to the reporter exists yet: the plan puts the reply API in 5d and delivery in Phase 6. 2a leaves Send reply out. Confirm that sequencing. |
| Needs you "Fewer shows than usual" (`venue-quiet`), 2a and 2c | A venue item fires when a venue lists fewer shows than usual. | [Hugh product] + [eng/data] This kind is NOT in 2a: there's no per-venue baseline in storage today, and triage has no such condition (only blocked, failed, went dark, coverage, ceiling). What does "usual" mean (the baseline definition), and where is it stored? It's the same gap as "What's normal here" (top blocker 2). 2a ships the other kinds: show-dropped, show-moved, venue-failing, venue-blocked, artist, event-low-confidence, price-check, price-batch, bug. |
| Needs you venue notice (README rule 1, 2a/2b/2c) | "A whole venue's shows vanishing is one venue notice, not ten show cards." | [Hugh product] + [Design] No board draws the venue-notice card, its answers, or the threshold for "several shows at one venue in one run". Until it does, 2a does NOT group: each show-dropped item stays its own item. Needed: the card layout, the answers, and the threshold. |
