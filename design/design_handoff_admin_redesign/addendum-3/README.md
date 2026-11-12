# Admin redesign · Design addendum 3 (2026-11-12)

Design's answers to [`../QUESTIONS-2026-11-12.md`](../QUESTIONS-2026-11-12.md). Every row there appears below and gets one of these:

- **A board.** Drawn here, in `boards/` (HTML) and `screens/` (2x JPG).
- **A ruling.** One line naming the drawn pattern it reuses.
- **Hugh** or **Eng.** The question belongs to Hugh (product) or engineering (data). Design draws nothing for it except what Hugh has already ruled. Where a board needs a default meanwhile, the row says so.
- **Copy.** Wording for the lane's copy-review, not a design question.

Canvas with every board from both addenda: https://claude.ai/artifact/Re9dZJJQDtwwasY7WsjbgK

**All new wording on these boards is draft.** It goes through `copy-review` before it ships. Copy is the copy writer's call, not Design's.

The B+ answers are in [`../../design_handoff_bplus_redesign/addendum-3/README.md`](../../design_handoff_bplus_redesign/addendum-3/README.md).

The boards are built on the approved admin kit and the phone addendum's phone kit, with venue glyphs from `glyphs_final.py`. Like the earlier addenda, they win over a board they contradict, and README rules 1 to 13 and plan decisions 1 to 22 still stand.

## How to read the references

`NN/board` means `screens/NN-<section>/board.jpg`, with the HTML in `boards/NN-<section>/board.html`.

| folder | what it settles |
|---|---|
| `01-snooze` | Top blocker 12: the snooze clock on card, panel and phone, Until a date, Not useful with a reason, the way back on, answered rows, all clear, filter empty, loading |
| `02-suggest-a-venue` | Top blocker 13: the fan Suggest a venue form (phone and desktop), sent, and the admin suggestion with and without a website |
| `03-venues` | 3a: bulk Select, ⋯ menu for every state, Delete refused, Take down, desktop Pause panel, Hide with Other, Re-crawl states, the full runs legend, phone Overview, drafts in the list |
| `04-venue-details` | 3b/3e: every editable field on Details, plus the Look card for the icon and hero setting |
| `05-ask-the-venue-reminder` | 3e: the 14-day no-reply item, its panel and its answers |
| `06-venue-notice` | README rule 1 and adm2: the venue notice card and its answers |
| `07-kind-labels` | The canonical kind-label set and tones, with FLAG in signal |
| `08-more-interim-row` | #178 open item: the interim Invite codes row on the phone More list |
| `09-crawl-runs` | 1d minor items: phone filters, result chips, Crawl all states, done banner, filter empty, loading, Load more |
| `10-needs-you-panels` | 2c minor items: panel loading, couldn't load and answer failed, Postponed, blocked before 3c, the phone footer, price check, desktop batch |
| `11-events-artists-prices` | 4b/4c/4d minor items: lineup roles and the duplicate check, the artist row ⋯, Resolved price checks |
| `12-people-codes-operations` | 5a/5b/5d minor items: person ⋯ on desktop, Sign out everywhere, code taken, This code has ended, Reopen, reply states |

## Read this first: the top blockers

| # | tag | answer |
|---|---|---|
| 1 | Hugh | Off-season: pause reason or snooze. **Hugh.** The boards here draw no Off-season data of their own. Snooze (`01`) is generic and Pause (`03/pause-panel-d`) keeps the drawn reason list, so either ruling slots in without a redraw. |
| 2 | Eng | What's normal here. **Eng.** Until it's stored, the Low chip (`09/run-result-chips`) and "This is normal" don't render. |
| 3 | Eng | Didn't start vs Nightly retry. **Eng.** |
| 4 | Hugh | Prod Mark verified. **Hugh.** |
| 5 | Eng | Clerk fields on People. **Eng.** |
| 6 | Hugh | Spotify data on the boards. **Hugh.** Every board here is drawn without Spotify place, listeners or sync counts, so dropping them needs no redraw. |
| 7 | Hugh | Moved. **Hugh.** |
| 8 | Eng | Price sheet fields. **Eng.** If tier and vendor stay required, they use the fan sheet's own Tier and "Where it's listed" fields as drawn in B+, in that order, above Lowest. |
| 9 | Hugh | Ticket-page fetch. **Hugh.** If it's not allowed, the row leaves the panel and the answers keep their order (`10/price-check-m` draws the panel with it, as approved). |
| 10 | Hugh | Hidden until you decide, and 0.70 vs 0.75. **Hugh.** |
| 11 | Hugh | Reject migration. **Hugh.** |
| 12 | **Design** | **Boards:** `01/needs-you-clock-d`, `01/snooze-open-d`, `01/snooze-no-venue-d`, `01/snooze-until-a-date-d`, `01/not-useful-d`, `01/item-menu-m`, `01/snooze-until-a-date-m`, `01/not-useful-m`, `01/warnings-off-overview-d`. The clock ends every card's top line and sits beside × on the open panel. On the phone it lives in the item page's ⋯ sheet. Not useful takes a reason, and the venue's In Needs you card lists each turned-off kind with Turn back on. |
| 13 | **Design** | **Boards:** `02/fan-suggest-a-venue-m`, `02/fan-suggest-a-venue-empty-m`, `02/fan-suggest-a-venue-d`, `02/fan-feedback-sent-m`, `02/admin-suggestion-d`, `02/admin-suggestion-no-website-d`, `02/admin-not-for-us-d`, `02/admin-suggestion-m`. Picking Suggest a venue swaps the box for Venue name, Website (optional) and Anything else? (optional). Grouping and name matching stay **Eng** (3e). |
| 14 | Eng | Sentry grouping. **Eng.** |
| 15 | Hugh | Reply before Phase 6. **Hugh.** `12/reply-sending-d`, `12/reply-failed-d` and `12/reply-sent-d` are drawn for whichever ruling ships. If the ruling is "disabled", Send reply uses the disabled-with-a-line pattern from `10/venue-blocked-before-3c`. |

## Per PR: the [Design] items

| PR | item | answer |
|---|---|---|
| 2b | Snooze clock placement | Top 12 boards. |
| 3a | Select (bulk) | **Board** `03/venues-select-d`. Select adds a checkbox column. The bottom bar reads "N selected · Clear", then Re-crawl N and Pause crawling N…. Bulk is for those two only: Hide, Delete and Take down stay one venue at a time. |
| 3b | Details fields, icon, hero | **Boards** `04/details-d`, `04/details-m`, `04/details-no-icon`. Website, Neighborhood, Map pin (lat/lng), Price page and Contact email join the cards. A Look card holds the Icon (opens the 05 icon step) and the Hero setting (the 05 six-settings picker). |
| 3e | 14-day reminder | **Boards** `05/no-reply-d`, `05/no-reply-m`, `05/they-said-no-m`. It's a VENUE item, "No reply", with the answers They said yes / They said no… / Ask again. |
| 3e | Icon and hero after going live | Same as 3b: the Look card on Details. |
| 5d | Suggestion name and URL | Top 13. |
| 6 | Suggest a venue fields | Top 13. |

## Full rows

Each section keeps its row numbers in source order.

### 1c Health

| # | row | answer |
|---|---|---|
| 1 | The site tile, no source | Hugh / Eng. If it's shown with no data, use the tile's couldn't-load line from `03/tiles-in-each-state`. |
| 2 | Artists tile, Spotify counts | Hugh (top 6). |
| 3 | "Tools" | Copy. |
| 4 | Off-season before 3c | Hugh (top 1). |
| 5 | Didn't run and the estimate | Eng (1d API). |
| 6 | Done for you lines for system actions | Decision 17 plus copy-review. Each system action reuses the drawn row: glyph, sentence, time. No new layout. |

### #175 audit leftovers

| row | answer |
|---|---|
| Ticketing feed seller list | Hugh. The default stands: show the real feeds. |
| Undo on desktop Not for us | Hugh. If yes, it reuses the phone `gap-3/start-not-for-us` Undo row in the desktop list. |
| Feed fields on desktop Source | Hugh. If yes, they sit under the radio, as the addendum proposes. |
| Drop Save debug HTML | Hugh, with eng to confirm. Keep it until then. |
| Merging into hand-added shows, created_by, merges across venue or day, What we read, Not for us storage, field mapping | Eng (#175 A1 to A7). The merge across venue or day draws no new board: it reuses `gap-1` merge-compare with the venue and date rows highlighted as differing. |

### 1d Crawl runs

| # | row | answer |
|---|---|---|
| 1 | Didn't start, cause unknown | Eng for the data. Design: when the cause is unknown, the row drops the clause and says only "Didn't start" (draft). |
| 2 | Didn't start vs retry from the data | Eng (top 3). |
| 3 | What turns Done amber | Eng. Design's intent: amber when any venue is Low, Quiet or Blocked. Failures alone stay green, because they reach Needs you on their own. |
| 4 | Not OK count | Eng. Design's intent: one definition, a batch with any amber or red venue. The detail's "Not OK" uses the same one. |
| 5 | Buckets for the 11 reasons | **Board** `09/run-result-chips`: one chip per outcome. Skipped venues (paused, blocked, robots) are listed, but they don't count toward "N venues crawled". |
| 6 | Venue chip set | Same board. Quiet is a run result. Off-season stays Hugh (top 1). |
| 7 | Quiet · Off-season until Apr 1 | Hugh / Eng (top 1, 2). |
| 8 | Unchanged vs Skipped | **Ruling:** "Unchanged" everywhere, as `09/run-result-chips` draws it. "Skipped" is kept for paused, blocked and robots. The venue Runs tab and the sheet follow. |
| 9 | Failures sent to Needs you | Eng. Before 2a, drop the clause. |
| 10 | "2 merged" | Eng. If there's no source, drop it; the row reads fine without it. |
| 11 | Streak and auto-pause on the row | Eng. Deriving them is fine for Design. |
| 12 | "15 more venues" | **Ruling:** it expands in place, the same as "11 more, all OK" on Venues. Under Not OK the list is already short, so no link appears. |
| 13 | Where a venue row links | Decision 4. |
| 14 | Detail for by-hand, running and Didn't start | **Ruling:** by-hand uses the same panel with one venue row. Running uses the panel with `03/re-crawl-states` chips per row. Didn't start rows aren't clickable. |
| 15 | Panel loading and couldn't load, phone version | **Boards** `10/panel-loading` and `10/panel-couldnt-load` (one pattern for every side panel). On the phone it's the addendum's run-detail-sheet, which wins over decision 1. |
| 16 | 21 vs 19 in Crawl all | **Board** `09/crawl-all-m`: the body says how many are skipped and why. |
| 17 | Time and cost estimate | Eng. Design's intent is an average of the last 7 nightly batches. With no history, the line is dropped. |
| 18 | Crawl all: failed, none eligible, posting, phone | **Boards** `09/crawl-all-m`, `09/crawl-all-starting-m`, `09/crawl-all-failed-m`, `09/crawl-all-none-m`. |
| 19 | Stop | Hugh / Eng. If there's no cancel API, the Stop button goes. |
| 20 | Now: venue and time left | Eng. Deriving them is fine. With no estimate, show only "Now: {venue}". |
| 21 | Banner end state, phone running | **Board** `09/crawl-all-done-d`. Phone running uses the same banner, stacked, above the list. |
| 22 | Running page drops columns | **Ruling:** omitted from the board, not hidden. Build the normal page with the banner on top. |
| 23 | "by @handle" on every by-hand row | **Ruling:** yes, every by-hand row carries "by @handle" (rule 7). |
| 24 | Failed batch chip | **Board** `09/run-result-chips` (Failed, in danger). |
| 25 | Phone filters | **Board** `09/runs-filters-m` (segmented, rule 6). |
| 26 | Next nightly, placement and MT | **Ruling:** one string, "Next nightly crawl: tonight at 3:00 AM MT", in the header on both (`09/runs-filters-m`). A hard-coded schedule is fine. |
| 27 | Paging | **Board** `09/load-more`. |
| 28 | Every row clickable, `?run=` | **Ruling:** every row except Didn't start is clickable, with a chevron on hover. The URL uses the batch's night (`?night=2026-11-09`) or a by-hand time, never a run id (rule 7). |
| 29 | Skeleton shape | **Board** `09/loading-runs-d` (rule 9). |
| 30 | Filter with zero matches | **Board** `09/runs-filter-empty-d`. |

### 2b Needs you queue

| # | row | answer |
|---|---|---|
| 1 | Filters for EVENT and Price check | **Ruling:** EVENT goes under Shows, and Price check under Prices. This is the filter mapping on `07/kind-labels`. |
| 2 | Canonical kind labels | **Board** `07/kind-labels`. |
| 3 | Price check ranked third | **Ruling:** the board is wrong. It ranks by its show date like everything else. |
| 4 | Tomorrow vs In 1 day | **Ruling:** Today, Tomorrow, then "In N days" up to 13, then the date ("Sat, Nov 28"). |
| 5 | Pink cut-off | **Ruling:** pink for Today and Tomorrow only. |
| 6 | Items with no fan date | **Ruling:** after every dated item, ordered by age, oldest first. Eng confirms in rank.ts. |
| 7 | Subtitle difference | Copy. One string. |
| 8 | Badge after an answer | **Board** `01/answered-d`: the badge and filter counts drop at once. |
| 9 | Badge on all clear | **Board** `01/all-clear-d`: no badge at zero. |
| 10 | How long the session lasts | **Ruling:** until the page reloads or you leave Needs you. Not across a reload. |
| 11 | Answered row for notifying answers | **Boards** `01/answered-d`, `01/answered-m`. |
| 12 | Undo after a snooze | Same boards: a snoozed row with Undo. |
| 13 | Answered row on mobile | `01/answered-m`. |
| 14 | Clock trigger | Top 12. |
| 15 | 8 AM, and a week | **Ruling:** both return at 8 AM MT. A week is the same weekday, 7 days on (`01/snooze-open-d`). |
| 16 | Date picker | `01/snooze-until-a-date-d`, `01/snooze-until-a-date-m`. |
| 17 | Not useful reason, no-venue items, back on | Reason: `01/not-useful-d`. Back on: `01/warnings-off-overview-d`. No-venue items: `01/snooze-no-venue-d` offers snooze only. **Decided with Hugh (2026-11-12):** Not useful shows only on items with a venue. |
| 18 | Phone snooze | `01/item-menu-m`. |
| 19 | All-clear sources, Snoozed | **Ruling:** the feed is Eng (1c Health). "Snoozed" counts every snoozed item, with the next one back (`01/all-clear-d`). |
| 20 | Desktop all clear, filter empty | `01/all-clear-d`, `01/filter-empty-d`. They're different states. |
| 21 | Phone couldn't load, badge on a failed count | `01/couldnt-load-m`: the badge hides. |
| 22 | Skeleton shape | `01/loading-d`, `01/loading-m`. |
| 23 | Desktop with nothing selected | **Ruling:** the first item opens. `?item=` is set only when you pick one. |
| 24 | Card answers vs panel | **Ruling:** the card shows the panel's suggested answer first, in the panel's order, and stops at three. Moved… stays panel-only. |
| 25 | 50-submitter threshold | Hugh. |
| 26 | Review, and does a batch count as 1 | **Ruling:** Review opens the batch panel (`10/price-batch-d`). A batch is one decision. |
| 27 | Matched by name, 6 on Spotify | Hugh (top 6). |
| 28 | Hidden until you decide | Hugh (top 10). |
| 29 | "sweeps" | Copy ("runs"). The number is runs since first_missing_at. |
| 30 | duplicate and crawl_gap | Eng. Design adds no card for either. |
| 31 | venue-quiet when-slot | **Ruling:** yes, it's always the cause word with a "?". The other causes reuse the drawn card. venue-quiet itself is Hugh / Eng (adm2). |

### 2c Evidence panels

| # | row | answer |
|---|---|---|
| 1 | Phone full page for the other kinds | **Boards** `10/venue-failing-m`, `10/price-check-m`, plus the approved an-item-mobile. Every kind uses one footer: the suggested answer full width, then the rest in a row below, with link answers as text buttons. |
| 2 | Phone vs desktop content | **Ruling:** desktop is canonical. The phone keeps every row and footnote, stacked (the same as `03/venue-overview-m`). |
| 3 | The phone ⋯ | `01/item-menu-m`. |
| 4 | Panel loading, couldn't load, answer failed | `10/panel-loading`, `10/panel-couldnt-load`, `10/panel-answer-failed`. |
| 5 | Ticket link check | Hugh (top 9). |
| 6 | Artist's own site | **Ruling:** drop the row. Nothing checks it. |
| 7 | "41 crawled fine", venue notice | The count is Eng. The venue notice: `06/venue-notice-d`, `06/venue-notice-m`. |
| 8 | Suggested answer when the link is dead or unchecked | **Ruling:** dead → Cancelled is suggested. Unchecked → nothing is suggested, and the answers sit as equals. |
| 9 | What Moved… opens | Hugh (top 7). |
| 10 | Postponed asks for a date | **Boards** `10/postponed-d`, `10/postponed-m`. The new date is optional. |
| 11 | Confirm for notifying answers | **Ruling:** Cancelled reuses `06/mark-cancelled` and its phone sheet. Postponed is `10/postponed-*`. Move waits on Hugh (top 7). |
| 12 | Move to vs Moved to | Copy. |
| 13 | Prices stay on the history | Copy, plus README need 23 (prices move to the kept listing). |
| 14 | Renamed MOVED, weak match | Hugh / Eng (top 7). |
| 15 | 4 runs or 14 | **Ruling:** 14, the same as the venue's Last 14 runs bars. |
| 16 | Keep paused… | **Ruling:** opens the Pause panel (`03/pause-panel-d`), or the sheet on the phone. |
| 17 | Check source before 3c | **Ruling:** it points at today's split view (decision 4). Re-crawl wording is Copy. |
| 18 | venue-quiet sources | Hugh / Eng (top 1, 2; adm2). |
| 19 | Off-season until Apr 1 | Hugh (top 1). |
| 20 | Ask the venue disabled before 3c | **Board** `10/venue-blocked-before-3c`. |
| 21 | Pages, robots, pace | Eng. The pace is a constant. |
| 22 | Pause crawling…, Re-crawl once | **Ruling:** Pause uses `03/pause-panel-d`. Whether Re-crawl once clears blocked is Eng. |
| 23 | Blocked: <code> | **Ruling:** confirmed. The chip is "Blocked: 429", the pattern of the drawn "Auto-paused: 3 failures" chip. |
| 24 | Candidate place, listeners | Hugh (top 6). |
| 25 | Search for another | **Ruling:** opens `06/artist-search` (full screen on the phone, decision 1). |
| 26 | Card vs panel answers | **Ruling:** the panel's set is canonical. The card shows the first two. Wording is Copy. |
| 27 | No-reports, no-candidates variants | **Ruling:** the same panel with the reports block removed. With no candidates, the candidates block becomes one line, "No match found", and Search for another is the main answer. |
| 28 | 0.60 vs 0.70, hidden | Hugh (top 10). |
| 29 | Why we're unsure | Eng. If there's no source, drop the block. |
| 30 | From the venue's page | Eng. When it's empty, the block is dropped. |
| 31 | Edit, then list | **Ruling:** opens the 4b event edit page. Before 4b ships, the answer is hidden. Wording is Copy. |
| 32 | "for good" vs Undo | Copy. Undo stays, per 2a. |
| 33 | Screenshot | Hugh. |
| 34 | Ticket page, similar shows | Hugh (top 9) and Eng. Not showing the reporter's handle is right (rule 7). |
| 35 | Price formats | Copy. |
| 36 | Design note shown as copy | Copy. Drop the sentence. |
| 37 | Ticket page order | **Ruling:** the plan wins. Open ticket page comes first (`10/price-check-m`). |
| 38 | New, and does opening remove it | Eng. Design: opening doesn't remove it. Only Mark done or an answer does. |
| 39 | None in Sentry | Eng (top 14). |
| 40 | Page name, device parse | **Ruling:** both are wanted (rule 7). |
| 41 | Error-report variant | Eng (top 14). Design: it's the bug panel with the stack block in place of the screenshot. |
| 42 | Reply in 2c | Hugh (top 15). |
| 43 | Open in GitHub | Eng. Design: it opens issue_url when there is one, else it creates one. |
| 44 | Deleted reporter | **Ruling:** "From a deleted account" in subtle text. No avatar, and no reply. |
| 45 | Batch window and scroll | Eng for the window. Design: the list scrolls inside the panel (`10/price-batch-d`). |
| 46 | Unticked prices | `10/price-batch-d`: an unticked price becomes its own item. |
| 47 | Approve count on untick, 0 ticked | Same board: the count follows the ticks, and at 0 the button is disabled. Wording is Copy. |
| 48 | Desktop batch, confirm, failure | `10/price-batch-d`. Approving is notifying, has no Undo and no extra dialog (the panel is the confirm). A failure is rule 10 (`10/panel-answer-failed`). |
| 49 | 2 fans | Eng. It can go above 2. |

### 3a Venues

| # | row | answer |
|---|---|---|
| 1 | Resume column and job | Eng. |
| 2 | Pause reason storage | Eng. |
| 3 | Off-season pause or snooze | Hugh (top 1). |
| 4 | Two Paused chip texts | Copy. |
| 5 | Chips for the other reasons, Other text | **Board** `03/pause-panel-d` (Other takes a note). The chip is "Paused: {reason}", the pattern of the drawn "Paused: awaiting reply" chip on `03/venues-select-d`. |
| 6 | Pick a date | `03/pause-panel-d` (the picker opens in place). |
| 7 | Desktop Pause form | `03/pause-panel-d` (side panel, rule 4). |
| 8 | More than one glow | **Ruling:** only the main button keeps the gradient glow. The selected radio and chip use the signal outline (`03/pause-panel-d`). |
| 9 | Menu for paused, blocked, hidden, flagship | `03/venue-menu-states`. |
| 10 | Make flagship | **Ruling:** it ships as drawn (`venues.featured`). The subtitle is Copy. |
| 11 | Take down | `03/venue-menu-states`, `03/take-down-d`. A taken-down venue is gone, so there's no chip. |
| 12 | Asked us to stop | **Ruling:** it moves to Take down (`03/hide-other-d`). Reason storage is Eng. |
| 13 | Second chip on a hidden venue | **Ruling:** "Not crawled" in subtle, in the same chip as "Paused". |
| 14 | Delete refusal | `03/delete-refused`. |
| 15 | Wrong venue in the dialog | **Ruling:** the dialog is for the current venue only. |
| 16 | robots.txt Changed, Disallowed, Unchecked | Eng for Changed. Design: the filter row adds "Disallowed N", and Unchecked shows "Not checked" in subtle in the column. |
| 17 | Needs a look vs four dots | **Ruling:** Needs a look counts venues with a dot, so the board's 3 should be 4. |
| 18 | Dot before 2a | **Ruling:** no dot, and the In Needs you card is hidden until 2a. |
| 19 | Worst first | **Ruling:** Blocked, auto-paused, failing, Needs you dot, paused, then OK by name. |
| 20 | Select | `03/venues-select-d`. |
| 21 | 11 more, all OK | **Ruling:** a collapsed row. A click expands it in place. |
| 22 | Paused by | Eng (audit_log is fine). |
| 23 | Latest-line formats | Copy. |
| 24 | Draft rows | `03/drafts-in-list-d`, `03/drafts-card-m`. Drafts sort first under a Drafts filter. |
| 25 | Added by fans or by hand | Eng. If there's no source, drop the row. |
| 26 | What's normal storage and edit | Eng (top 2). |
| 27 | Low status | Eng (top 2). |
| 28 | Legend | `03/last-14-runs-legend`. |
| 29 | Ticketing-feed suggestion card | Hugh. |
| 30 | Guide dot | Eng for the source. Design: only Guide and Look carry a dot. |
| 31 | Phone Overview | `03/venue-overview-m` (the caption wins). |
| 32 | Re-crawl states, View on site | `03/re-crawl-states`. View on site is hidden for hidden and draft venues. |
| 33 | Run detail placement | **Ruling:** rule 4 wins. It's an overlay side panel (1d's RunDetailPanel), and the table keeps its width. With nothing selected, no panel opens. |
| 34 | Runs paging, test and by-hand runs | `09/load-more`. Test runs are listed with a "Test" chip, and by-hand runs with "by @handle". |
| 35 | Half-loaded, removed 0 | Eng. |
| 36 | Per-step results | Eng. |
| 37 | Page timeout, duration | Eng. |
| 38 | This is normal writes | Eng (top 2). |
| 39 | 28 or 12 | **Ruling:** the run counts concerts (12), with "28 items read" as the second line. |

### 3b Source, Details, Guide, Inspect

| # | row | answer |
|---|---|---|
| 1 | Feed fetchers | Hugh (#175 A5 default stands). |
| 2 | Today's configs on Source | **Ruling:** VenuePilot, AEG and Live Nation show as "Ticketing feed" with the seller named. Ticketure and detail-page show as "Calendar page" with an Advanced note naming the reader. |
| 3 | api_provider or platform | Eng. |
| 4 | Don't crawl chip | **Ruling:** "Not crawled", the same as a hidden venue. |
| 5 | Next-page claim | Eng. If the claim is untrue, the copy changes (Copy). |
| 6 | 3 s fixed | **Ruling:** show the venue's real delay, read-only ("3 s, raised by robots.txt to 10 s"). It's not editable. |
| 7 | Test needs 3c | Eng (dependency). |
| 8 | Diagnostics and staged apply | **Ruling:** dropped from Source. Inspect and Runs cover diagnostics. |
| 9 | Desktop states | **Ruling:** the gap-4 phone boards are the desktop spec, in the main column at 640 max. Feed fields are Hugh (#175). |
| 10 | robots rule and since-date | Eng. If not stored, drop both lines. |
| 11 | Ask on a live venue | Hugh (per-PR blocker). |
| 12 | Re-crawl under robots | **Ruling:** disabled, with a reason (`03/re-crawl-states`). |
| 13 | Save debug HTML | Hugh. |
| 14 | Save failed | OK as drawn. |
| 15 | Slug redirect | Eng. "Change it before going live" stays for drafts. On live venues, the redirect line shows only once a redirect exists. |
| 16 | Box office | Eng. |
| 17 | Capacity type list | **Ruling:** the same six as the hero settings (`04/details-d`). |
| 18 | Fields with no home, icon, hero | `04/details-d`, `04/details-m`, `04/details-no-icon`. |
| 19 | Per-section guide state | Eng. |
| 20 | Draft the missing ones before 3d | **Ruling:** hide the button until 3d. |
| 21 | Draft provenance | Eng. If not stored, drop the line. |
| 22 | Preview as a fan | **Ruling:** opens the fan venue page's guide in a new tab. |
| 23 | Can't document yet, Unpublish | **Ruling:** reuse 05's Can't document yet chip on the Guide row. Unpublish is the last line in the section's ⋯. |
| 24 | Labels and count basis | Copy. The count leaves out the insider tip. |
| 25 | Edit panel for the insider tip and Missing | **Ruling:** the same edit panel with an empty box, "Write" as the title, and no "drafted from" line. |
| 26 | What we read | Eng. |
| 27 | Stopped here | Eng. |
| 28 | Page tab | Eng (security call). |
| 29 | Compare with | **Ruling:** it switches runs in the same view. No diff. |
| 30 | Page switcher, default page | **Ruling:** the default is the first page that stopped or failed, else page 1. The switcher is the pages list on Runs. |
| 31 | Truncated, feed runs | **Ruling:** truncated reuses Inspect's "pages gone" block with its own line. Feed runs open on the Text tab only. |
| 32 | Desktop states | **Ruling:** gap-2's phone boards are the desktop spec (decision 2 as amended: drawn there, not "nearest"). |
| 33 | "Saved for 14 days" | Copy. |

### 3e Add a venue

| # | row | answer |
|---|---|---|
| 1 | Empty until Phase 6 | **Ruling:** accept the empty state. It reuses the start board's empty list. |
| 2 | Names in feedback | Eng (top 13). |
| 3 | Grouping | Eng (top 13). |
| 4 | Neighborhood, kind, capacity | **Ruling:** drop them from the suggestion row. It shows name, website and who asked (`02/admin-suggestion-d`). |
| 5 | robots on a suggestion | **Board** `02/admin-suggestion-no-website-d`: with no website, it's checked at setup. Storing it is Eng. |
| 6 | Not for us storage, desktop answered state | Eng for storage. The reason is `02/admin-not-for-us-d`. Desktop Undo is Hugh. |
| 7 | Basics field set | **Ruling:** desktop's set. The phone adds Website and Asked for by, stacked. The robots line follows Website. |
| 8 | Address from feedback | Eng. |
| 9 | Saved as you go failure | **Ruling:** rule 10, as a toast with Try again, on any step. The word is Copy. |
| 10 | Capacity type list | 3b row 17. |
| 11 | Feed detection | Hugh (#175 A5). |
| 12 | Where tested shows wait | Eng. |
| 13 | Feed fields on the phone | **Ruling:** the gap-4 phone feed fields. |
| 14 | Test runs and pages | Eng. |
| 15 | Add shows by hand before 4a | **Ruling:** hide the link until 4a. |
| 16 | Finding the contact address | Eng / Hugh (crawl ethics). |
| 17 | Sign-off, phone sheet | **Ruling:** the acting admin's first name. The phone is a full screen with Send pinned (decision 1). |
| 18 | 14-day reminder kind | `05/no-reply-d`, `05/no-reply-m`. |
| 19 | They said no storage | Eng. The reasons are `05/they-said-no-m`. |
| 20 | Levitt and Meow Wolf | Copy. |
| 21 | Icon uploads, fetching | Eng / Hugh (robots applies). |
| 22 | Phone icon parity, SVG check | **Ruling:** the phone gets Steer it and Draft 4 more under the grid, and Upload under them. Uploads use the same 24-grid check. |
| 23 | Details has no icon | `04/details-d` (Look card). |
| 24 | Six-setting guess | Eng. |
| 25 | Arena crescent | Hugh ruled: as drawn. |
| 26 | 15 s, $0.03 | Eng. If it's computed, the line follows; if not, it's dropped. |
| 27 | Can't document yet control | **Ruling:** the chip from the 05 caption, beside Accessibility's REQUIRED tag. |
| 28 | Page date | Eng. If there's no source, drop the date. |
| 29 | Two models for optional sections | **Ruling:** the desktop "+ Add" model on both. |
| 30 | Notice to the fans who asked | Hugh (per-PR blocker). |
| 31 | When you go live on the phone | **Ruling:** the phone keeps the block, stacked. Wording is Copy. |
| 32 | Dots cleared | Eng. Design: a dot clears when the step has content. |
| 33 | Not ready on the phone | **Ruling:** a full-screen version of the 560 board, with Fix Source as the main answer. |
| 34 | Box office | Eng (3b). |
| 35 | Desktop states | **Ruling:** the gap-3 phone boards are the desktop spec, centered at 640. |

### 4b Events

| # | row | answer |
|---|---|---|
| 1 | Moved | Hugh (top 7). |
| 2 | Last seen title | Eng. If there's no source, show only the date. |
| 3 | Open the crawl run | Eng. If there's no link, drop the line. |
| 4 | Mobile fields | **Ruling:** the caption wins: every field, stacked. Cancelled opens the drawn mobile sheet. |
| 5 | No longer listed in the selector | **Ruling:** not settable. It shows as read-only status text with "Listed again" as the way back. |
| 6 | Postponed dialog | `10/postponed-d`, `10/postponed-m`. |
| 7 | Refund info | Hugh. |
| 8 | Hidden row status | **Ruling:** the status chip stays, and Hidden is a second chip with its reason (rule 3). The reasons are Copy. |
| 9 | Hide and Delete dialogs | **Ruling:** Hide reuses `04/hide-from-site` (event wording is Copy). Delete reuses `04/delete-venue`. The edit-page toggle opens the same dialog. |
| 10 | Delete only manual | Eng / Hugh. Design: only manual rows get the line, otherwise Hide. |
| 11 | Lineup roles | **Board** `11/add-a-show-lineup-d` (chips, first is the headliner). |
| 12 | No price, duplicate check | Same board: the duplicate warning. Price is added after save. |
| 13 | Phone Add a show | **Ruling:** full screen (decision 1), the same fields stacked. |
| 14 | added by @dlo | Eng. |
| 15 | Desktop merge pick step | **Ruling:** desktop gets the gap-1 pick step as the first panel view. |
| 16 | Which reports move | Eng. |
| 17 | Watching count, silent merge | Eng (deduped). The merge stays silent. |
| 18 | Crawler match key | Eng. |
| 19 | Price sheet fields | Eng (top 8). |
| 20 | Sold out in two places | Eng. Design: it lives in Status only, and the sheet loses its Sold out row. |
| 21 | Played | **Ruling:** OK, in muted, past only. |
| 22 | Went count, past edit, phone past | Eng for the count. The past edit locks every field except Hidden and lineup, shown read-only. Phone past uses the phone Events list with the Past toggle. |
| 23 | Phone filters | **Ruling:** the phone adds the Past toggle and Add a show, and venue and status open sheets (decision 1). |
| 24 | Load more | `09/load-more`. |
| 25 | Saved, submission, history | Copy. |

### 4c Artists

| # | row | answer |
|---|---|---|
| 1, 2 | Place, listeners, Plays Denver | Hugh (top 6). |
| 3, 4 | Name-shape hints, Automatic | Hugh (#1343). |
| 5 | Reason and marked-by | Eng. |
| 6 | Matched by | Eng. Design: "By @handle" for a person, "Automatic" for the job. |
| 7 | No photo | Eng. |
| 8 | Row ⋯ and Any way | `11/artist-row-menu`. |
| 9 | Name cut short before need 12 | Eng. Before then, drop the flag. |
| 10 | Pick resolves reports | Eng / Hugh. Design: it resolves them silently (no fan notice). |
| 11 | It's an artist | **Ruling:** back to To check. |
| 12 | Pick on the phone | **Ruling:** opens the artist-search full screen. The phone gets sub-filters as a segmented control and search on top. |
| 13 | Phone Matched and Not artists | **Ruling:** the same phone rows under the segmented control. |
| 14 | Other empties | **Ruling:** each reuses `artists-to-check-empty` with its own line. Search no results reuses people-no-results. |
| 15 | Not 96 | Copy. |

### 4d Prices

| # | row | answer |
|---|---|---|
| 1 | 50 people | Hugh. |
| 2 | Window | Eng. |
| 3 | Outlier | Eng. |
| 4 | Phone toggle | **Ruling:** read-only on the phone. It's changed on desktop. |
| 5 | Sort keys | **Ruling:** soonest first, then most Watched. |
| 6 | Add sheet fields | Eng (top 8). |
| 7 | Last show missing a price | **Ruling:** the nothing-missing state, drawn. |
| 8 | State words | **Ruling:** desktop's set (Published, Waiting for you, Price check). The mapping is Eng. |
| 9 | $45+ vs $12 | Copy / Eng: one format. |
| 10 | No handle, deleted | **Ruling:** "A fan" in subtle, with no link. |
| 11 | Ticket page link | Eng. If there's no URL, drop the line. |
| 12 | This fan's other prices | **Ruling:** opens Submitted prices filtered to that fan (the filter chip shows the handle). |
| 13 | Reject status | Hugh (top 11). |
| 14 | Where rejected rows go | Hugh (top 11). |
| 15 | Phone Reject | **Ruling:** a sheet (decision 1). |
| 16, 17 | What we checked, screenshot | Hugh (top 9). |
| 18 | 10-character reason | Eng. If kept, the reason is the drawn Not for us pattern. |
| 19 | Resolved list | `11/price-checks-resolved-d`. |
| 20 | Phone order, Resolved on the phone | **Ruling:** desktop's order (ticket page, Use, Keep). The phone gets an Open/Resolved segment. |
| 21 | Phone filters and search | **Ruling:** filters as a segment, search on top. |
| 22 | Empties | **Ruling:** filter empty reuses `01/filter-empty-d`. |
| 23 | submission | Copy. |

### 5a People

| # | row | answer |
|---|---|---|
| 1 | Last active | Eng (top 5). |
| 2 | Join source | Eng. Design: "code" or "poster" follows the 5b poster rule. Founder is the founder window, and test is the Test account tag. |
| 3 | Watching, counts | Eng (top 5). |
| 4 | Tab, chip and footer counts | **Ruling:** all three show the same number, without test accounts. |
| 5 | Search by handle, no handle | Eng. Design: someone with no handle is found by first name. |
| 6 | Activity sort | Eng. |
| 7 | Promoter on the phone | **Ruling:** keep it. The segment scrolls. |
| 8 | Role set before the log | **Ruling:** "Beta", with no "since". |
| 9 | Concerts = going | Eng. Design's intent: past going. Interested isn't shown. |
| 10 | Sign-in method | **Ruling:** "Signs in with email" for email codes. With several methods, they're listed with commas. |
| 11 | Staging line in prod | Hugh (top 4). |
| 12 | Trying early toggle | Eng. |
| 13 | Wrong-artist reports flag | Example data. |
| 14 | Recent sources | **Ruling:** reports, prices and feedback, the 5 newest. No See all. |
| 15 | Their profile | Hugh. |
| 16 | Test account exclusions | Hugh. |
| 17 | Person ⋯ on desktop | `12/person-menu-d`. |
| 18 | Phone blocks | **Ruling:** the caption wins: every block, stacked. |
| 19 | Message them | Hugh. |
| 20 | Profile link | Hugh (row 15). |
| 21 | See their Submitted prices | 4d row 12 (filtered to a person). |
| 22 | Sign out everywhere | `12/sign-out-everywhere-d`, `12/signed-out-everywhere-d`. The revoke is Eng. |
| 23 | Block | Hugh ruled: Block is dropped. |
| 24 | Make admin on the phone | Decision 1 (sheet). Accepted. |
| 25 | Demote, 403 | **Ruling:** Admin → Member asks first, with the same dialog. The 403 is rule 10 with its line. |
| 26 | Undo length, audit, phone toast | **Ruling:** 6 s, as fan Undo. An Undo writes a second audit row. The phone toast uses the bottom toast pattern. |
| 27 | Show email, no email | Eng for the endpoint. With no email: "No email on file". |
| 28 | Loading | Fine. |

### 5b Invite codes and Posters

| # | row | answer |
|---|---|---|
| 1 | Custom code, code taken | **Board** `12/code-taken-d`. The rules (length and characters) are Eng. With no letters in the label, it suggests nothing. |
| 2 | Recipient email | Hugh. |
| 3 | What a poster is | **Ruling:** a code with more than one seat. "Poster ·" is derived, not label text. |
| 4 | Maker with no handle | **Ruling:** first name, then "A former admin". |
| 5 | Status precedence | **Ruling:** Revoked > Expired > Full > Active. Redeemed folds into Full. |
| 6 | Phone cards | Decision 1 (sheets). Accepted. Tapping a card opens the code panel full screen. |
| 7 | Add seats vs Edit | **Ruling:** the same control. Add seats opens Edit with Seats in focus. |
| 8 | See all | **Ruling:** opens People filtered to that code. |
| 9 | Last used fallback | Eng (the fallback is fine). |
| 10 | Existing exact expiry | **Ruling:** a fourth option, "Keep Feb 1", selected first. |
| 11 | Seats below used | **Ruling:** rule 10's inline field error, "{N} already used". |
| 12 | Revoke reason | Eng. If not stored, drop "because…". |
| 13 | Reactivate expiry, Full | **Ruling:** keep the old date if it's in the future. Full: confirmed, Edit seats is the way back. |
| 14 | Fan "This code has ended" | `12/code-ended-fan-m`. |
| 15 | Seats copy | Fine. |
| 16 | Posters states, 1-seat code | **Ruling:** loading and empty reuse 5b's. A new 1-seat code skips Make a poster. |
| 17 | Loading | Fine. |

### 5c Feature flags

| # | row | answer |
|---|---|---|
| 1 to 4 | Staging reads, prod Mark verified | Hugh (top 4). |
| 5 | Checks stored | Eng. Design: they're required ticks, not stored. |
| 6 | Un-verifying | Hugh. |
| 7 | Off unverified right column | **Ruling:** the column shows only the line "Mark verified appears once the flag is on for anyone." |
| 8 | Me with two admins | Eng. |
| 9 | Locked flag above Off | **Ruling:** it can step down, not up. |
| 10 | Phone flag panel in prod | **Ruling:** the staging phone panel with the prod right column. |
| 11 | No History on the phone | **Ruling:** the phone keeps History as the last block. |
| 12 | 211 vs test | Hugh (5a row 16). |
| 13 | Old history | Eng. Design: start empty, with the line "History starts Nov 2026". |
| 14 | Add a person no-match, failed | **Ruling:** no-match reuses people-no-results. Failed is rule 10. It's a sheet on the phone. |
| 15 | Subtitle | Copy. |
| 16 | Phone dialogs | Decision 1. Accepted. |
| 17 | No flags | Decision 2. Accepted. |

### 5d Operations

| # | row | answer |
|---|---|---|
| 1, 2 | Sentry grouping | Eng (top 14). |
| 3 | Reply to everyone | Hugh (top 15). |
| 4 | Suggestion name and URL | `02/*` (top 13). |
| 5 | Start adding it before 3e | **Ruling:** hidden until 3e. Prefilled with the name and website. |
| 6 | Not for us reason | `02/admin-not-for-us-d`. Storage and grouping are Eng. |
| 7 | Bugs include errors, Venues on the phone | **Ruling:** yes, they're included. The phone keeps Venues. |
| 8 | Search and chips on To read and Done | **Ruling:** both lists get search and the kind chips. |
| 9 | Weekly read | Example data. Drop it. |
| 10 | resolved_by, roadmap | Eng for the column. "on the roadmap" is Copy, and it maps to issue_opened. |
| 11 | Reopen | `12/feedback-reopen-d`. |
| 12 | Flagged | **Ruling:** dropped. There's no control and no look. |
| 13 | Page that no longer exists | **Ruling:** show the path in mono, unlinked. |
| 14 | Device parse, deleted reporter | Server-side parse (Eng). Unknown device shows "Unknown device". For a deleted reporter, 2c row 44. |
| 15 | Note autosave failure | **Ruling:** rule 10. Not every keystroke is audited, only one row per item per day. |
| 16 | Error reports in Needs you, sync | Eng. Design: one item, so Mark done in either place shows in both. |
| 17 | Phone pinned buttons | **Ruling:** the caption wins. Mark done, Reply and GitHub are pinned. |
| 18 | Reply states | `12/reply-sending-d`, `12/reply-failed-d`, `12/reply-sent-d`. Reply is hidden after it's sent. With a deleted reporter or no email, Reply is hidden. |
| 19 | Delivery before Phase 6 | Hugh (top 15). |
| 20 | Emails list | Hugh. |
| 21 | Preview show | Eng. With none, it falls back to the fixture. |
| 22 | Test email recipient | Hugh / Eng. The failed state is rule 10. |
| 23 | Phone templates, preview | **Ruling:** the list wraps. The preview is a scaled copy of the real email, footer included. |
| 24 | Emails skeleton | **Ruling:** the final shape (rule 9): the list on the left, the preview box on the right. |
| 25 | Actions with no sentence, "in staging" | **Ruling:** the action key in mono. Drop "in staging". |
| 26 | Log search, days, phone filters | **Ruling:** search runs on the rendered sentence. The day picker is the 01 month picker (`01/snooze-until-a-date-d`) and paging is `09/load-more`. On the phone, filters become sheets. |
| 27 | Links to deleted things | **Ruling:** plain text, unlinked, with "(gone)" in subtle. |
| 28 | Empty day | Fine. |
| 29 | Phone panels | Decision 1. Accepted (`02/admin-suggestion-m`). |

### 6 Fan side

| # | row | answer |
|---|---|---|
| 1 | Suggest a venue form | `02/fan-suggest-a-venue-m` and the rest of `02`. |
| 2 | Kinds mapping, desktop modal, sent | Mapping confirmed. `02/fan-suggest-a-venue-d`, `02/fan-feedback-sent-m`. |
| 3 | New pill | **Ruling:** it goes on first open. |
| 4 | "Following" in the background | Copy, for the lane. |
| 5 | Tab for replies | **Ruling:** Alerts, as #178 settled for unknown categories. |
| 6 | Sender's name | Hugh. |
| 7 | Send more feedback | **Ruling:** opens a blank form. It's not linked to the earlier note. |
| 8 | Reply-To, email off | Hugh / Eng. |
| 9 | Fan-out | Hugh (top 15). |
| 10 | Phase 6 flag scope | Hugh. |

### Merged admin PRs

| PR | answer |
|---|---|
| #169 BottomSheet | **Confirmed** as the interim. |
| #169 sr-only, 720 | **Confirmed** (decision 16). |
| #169 environment badge, "/" | **Confirmed.** |
| #170 ConfirmDialog order | **Confirmed.** |
| #171 shadow mapping | **Confirmed.** |
| #152 640 phone layout | **Confirmed.** |

### Open from #178

| row | answer |
|---|---|
| FLAG tone | `07/kind-labels`: signal, as built. |
| Desktop user-menu anchor | **Confirmed as built:** above the sidebar's user card, 332 wide. |
| Interim More row | `08/more-interim-m`. |

### adm2

| row | answer |
|---|---|
| Re-crawl now on a paused venue | Hugh. |
| Send reply sequencing | Hugh (top 15). |
| venue-quiet baseline | Hugh / Eng (top 2). |
| Venue notice | **Boards** `06/venue-notice-d`, `06/venue-notice-m`. **Decided with Hugh (2026-11-12):** one run that drops 5 or more shows at a venue, or a quarter of its listings (whichever is fewer), makes one venue notice. |

## Decided with Hugh (2026-11-12)

- **Not useful shows only on items with a venue.** Artist, price check, price batch and bug items get Snooze only (`01/snooze-no-venue-d`).
- **The venue notice:** one run that drops 5 or more shows at a venue, or a quarter of its listings, whichever is fewer.

Still open: if Hugh rules Send reply stays disabled before Phase 6 (top 15), the disabled pattern is drawn.

## Build-vs-design check (for every lane using these boards)

1. Screenshot every built state at 320, 390 and 1280. Put each beside its board in `screens/`. Use 2x for the PR.
2. Check side by side, not from memory:
   - spacing, type sizes and weights, radii
   - chip vertical centering
   - one glow per screen
   - no uneven-column dead space
3. Run the vocabulary grep from `../BUILD-CHECK.md` step 5 over every new string.
4. Any difference is either fixed to the board or listed in the PR under "Differs from the board", with a reason. Silence counts as a miss.

## Self-review

Every board was checked against its neighbor in the approved handoff and the phone addendum: the same sidebar, cards, panel width (440), chips, sheet handles and toasts.

- **Glow.** One per screen. On the Pause panel, the selected radio, Resume chip and date moved off the gradient onto the signal outline, so the main button is the only glow. The same applies to every radio and date picker in this addendum.
- **Chips.** Vertically centered.
- **Glyphs.** The 21 approved glyphs come from `glyphs_final.py`.
- **Vocabulary grep.** Clean, with two exceptions. Whole-string "—" placeholders are allowed. One fan background (`02/fan-suggest-a-venue-d`) draws the approved B+ artist "Following" button, which fan-side row 4 already sends to copy-review.
- **English.** US English throughout.
