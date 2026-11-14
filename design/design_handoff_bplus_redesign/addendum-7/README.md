# Admin · Design addendum 7, batch 3 (2026-11-14)

Design's answers to batch 3 of the 2026-11-14 design prompt: six admin items. Items 1 to 4 are drawn elements with no stored data or behaviour behind them; each is redrawn from data we have, or dropped. Items 5 and 6 are stored fields the new event editor doesn't draw. Every answer was checked against `origin/main`: `packages/db/src/schema` (`events`, `event_reports`, `feedback`), `apps/api/src/routes/feedback.ts`, `routes/admin/events.ts`, `lib/sold-out.ts`, the Needs you sources, and the old editor at `/admin/events/[id]/edit-legacy`.

Canvas: https://claude.ai/artifact/WVFpjYhb6YkhyR9h25hrAk (its own canvas). Sources: `/mnt/project-files/design/addendum-7/` in the project files (`a7.py` boards, `boards.py <dest>` exports, `canvas.py` builds the page).

**All new wording on these boards is draft.** It goes through `copy-review` before it ships. These boards win over any earlier board they contradict; the earlier addenda's rulings still stand.

`NN/board` means `screens/NN-<section>/board.jpg` (2x JPG); the HTML is in `boards/`. All boards use the admin kit.

**Build-vs-design check:** before the PR that builds any of this is ready, screenshot each touched screen at 320, 390 and 1280 against these boards and list the diffs in the PR body. One component per status: the admin uses the fan `StatusChip`, and every admin avatar is `PersonAvatar`.

| # | Item | Answer |
|---|---|---|
| 1 | Postponed past its date: "still says Postponed" | **Redrawn:** Last seen shows `events.last_seen_at` only ("Nov 10, 4:12 AM"). The clause is dropped; the header and Status card already show the current status. `01/postponed-passed-d` |
| 2 | Error reports: "N people hit this" | **Dropped.** One row is one report from one person. The panel shows that report's own fields: Was doing, App version, Device, Error ID and Sentry event as text with Copy. `02/*` |
| 3 | Venue suggestions: Start adding it, Not for us | **Redrawn:** **Start adding it** opens Add a venue empty, with the message quoted above Basics; **Mark done** finishes it. **Not for us** and its reason dialog are dropped. `03/*` (one open question for Hugh, below) |
| 4 | Feedback row hints | **"Also in Needs you"** kept on unread bugs and error reports; **"· screenshot"** becomes a Screenshot mark; **"· 3 people"**, **"Weekly read"** and **"Opens Add a venue"** dropped. `04/*` |
| 5 | Event edit: Tour name | **Drawn:** a Tour name field in the Show card, right under Title, on desktop and phone. Empty, filled and changed states. `05/*` |
| 6 | Event edit: sold-out evidence | **Drawn:** in the Status card under the chips, only when Sold out is picked. A form before it's saved, a confirm (it notifies Watchers), then a read-only record from the promoted report. `06/*` |

## Decisions only Hugh can make

1. **Should a venue suggestion store the venue's name and website?** Nothing writes `venue_suggestion` today, and a suggestion would store only its message. Addendum 3 §2 drew the fan form with Venue name, Website (optional) and Anything else.
   - **A (recommended): message only, as drawn here.** Start adding it opens Add a venue empty with the message beside it. No schema or API change.
   - **B: store `venueName` and `website` in `feedback.metadata`** when the fan form is built (no migration: `metadata` is jsonb). Then the panel can title the suggestion with the name, Start adding it can fill Name in, and the panel can show the robots.txt line. Grouping several suggestions for one venue still needs name matching, which is its own work.

   The pick doesn't change these boards' layout; B adds a Website line to the panel and fills Name in Add a venue.

## 1. Postponed past its date: "Last seen"

Batch 2's `36/postponed-passed-d` drew "Last seen · Nov 10 · still says Postponed". No status is stored per crawl, so the clause can't be built.

- **From the crawl** keeps two lines: Source, and **Last seen** = `events.last_seen_at`, date and time in Mountain Time ("Nov 10, 4:12 AM"). The same line as addendum 5's `04/past-show-d`.
- The current status already shows twice on the page (the header chip and the Status card), so nothing replaces the clause.
- `01/postponed-passed-d` supersedes batch 2's `36/postponed-passed-d`. Everything else on that board stands.

## 2. Operations › Feedback: error reports

What an error report stores (the Tell us card on an error page, `send-report.ts`): one `feedback` row with `category = 'bug'`, `message` (what they were doing, then their note), `page_url`, and `metadata.source = 'error'`, `doing`, `build`, `device`, and optionally `digest` and `sentryEventId`. Nothing groups reports or counts people, and there's no Sentry issue link.

- **The kind chip** says ERROR REPORT when `metadata.source = 'error'`; it's stored as a bug, so the chip comes from the metadata, not the category. It still counts under the Bugs filter.
- **The row**: "Something went wrong on {page}" (the page name from the Needs you bug panel's page names), then `@handle · {page} · date`. No count.
- **The panel** (`02/error-report-d`, phone `02/error-report-m`): the message as one quote; then Page, Was doing (`metadata.doing`), App version (`metadata.build`), Device, Error ID (`metadata.digest`, mono, with Copy), Sentry event (`metadata.sentryEventId`, mono, with Copy), From. A line with no value is left out. Actions: Mark done and GitHub.
- **Dropped:** "3 people", "7 times", the per-person "What they wrote" list, the Sentry button, and "Reply goes to everyone who wrote a note". "Since 0.42.0" becomes App version.
- `02/feedback-rulings` lists each drawn element with its ruling. These boards supersede admin redesign `07/feedback-error-report` and addendum 3 §12's error-report panel.

## 3. Operations › Feedback: venue suggestions

A suggestion stores its free-text `message` (plus `page_url` and the reporter). No venue name, URL or address.

- **The panel** (`03/suggestion-d`, phone `03/suggestion-m`): titled "A venue suggestion"; the message as a quote; From and Sent from (`page_url`); Note to yourself. The list row shows the message itself, one line, ellipsized.
- **Start adding it** opens Add a venue at Basics, empty (`03/suggestion-start-d`). The message is quoted above the fields with "Back to it", so the admin can copy the name. Nothing is filled in. It doesn't mark the suggestion done.
- **Mark done** sets the item done (`resolved`), as on every feedback item.
- **Dropped:** Not for us… and its reason dialog (it marked every suggestion for one venue done, which needs a name to match on), Website, robots.txt and "Also asked for by".
- Related gap, not drawn here: Add a venue's **Venues people asked for** list (admin phone addendum) also needs venue names. Under decision A it has nothing to list and stays unbuilt; under B it can list suggestions that have a name.

## 4. Operations › Feedback: the row hints

`04/feedback-rows-d` is the list; `04/feedback-hints` rules each hint.

- **"Also in Needs you"** stays, on unread bugs and error reports: Needs you lists every feedback row with `category = 'bug'` and `status = 'unread'`. It goes when the row is read or done.
- **"· screenshot"** isn't why a row is in Needs you. It becomes a plain **Screenshot** mark, on any row whose metadata has a screenshot (as the live list already does), before Also in Needs you.
- **"· 3 people"** is dropped (item 2). **"Weekly read"** is dropped: nothing reads ideas weekly, so ideas get no hint. **"Opens Add a venue"** is dropped: the row opens the suggestion like any row.
- A row with no hint shows only its chevron.

## 5. Event edit: Tour name

`events.tour_name`, which the old editor edits. The crawl fills it only when the LLM extractor reads one, and its upsert keeps the stored value when the crawl has none (`COALESCE(excluded.tour_name, …)`), so an admin's entry survives a crawl that finds no tour name but is replaced by one that does.

- **Where** (`05/tour-name-d`, phone `05/tour-name-m`): the Show card, right under Title. Full width on desktop.
- **Hint:** "Optional. Fans see it above the title. If the venue's listing names a tour, the crawl's name replaces this one."
- **States** (`05/tour-name-states`): empty ("None" placeholder), filled, changed (the unsaved dot, and the Save bar counts it). Saving it empty stores null, never an empty string, as the old editor's diff does. Nothing says whether the value came from the crawl or an admin: that isn't stored.
- **Phone header:** the tour name sits above the title, the way fans see it.

## 6. Event edit: sold-out evidence

A show is Sold out when it has a promoted, resolved `event_reports` row with `status = 'sold-out'` (`isSoldOutSql`). That row is the evidence: `reporter_id`, `evidence_method`, `evidence_url`, `note`, `created_at`, `resolved_at`. An admin marking it sold out creates that row already promoted (`POST /v1/admin/events/:id/sold-out`), and it tells the show's Watchers.

- **Where:** the Status card, under the status chips, only while Sold out is picked.
- **Marking it** (`06/sold-out-mark-d`, phone `06/sold-out-mark-m`): picking Sold out opens the form in flow. "How do you know it's sold out?" with the four methods (Saw it listed, Venue website, Tried to buy it, Other) as radios, two columns on desktop; Source link (optional); Note (optional, 280 with a counter); and a line saying Saving tells the N Watching. **Change from the old editor:** it starts with nothing picked and Save waits for a pick, instead of defaulting to Other.
- **Save asks first** (`06/sold-out-confirm-d`, phone sheet `06/sold-out-confirm-m`): it notifies fans, so it's a centered dialog on desktop and a sheet on the phone, repeating the method, source and note. Mark sold out, or Cancel.
- **A live Sold out** (`06/sold-out-live-d`, phone `06/sold-out-live-m`): a read-only record headed WHY IT'S SOLD OUT. Who reported it (`PersonAvatar`, handle, Fan or Admin), their note as a quote, How they knew, Source (a link), Reported and Made live (`created_at`, `resolved_at`), and for a fan report the number of fans who confirmed it (`event_report_confirms`). It can't be edited: there is no endpoint for it. Picking Tickets available clears it (`clearSoldOut`), which tells the Watching, as today.
- **States** (`06/sold-out-states`): the form with nothing picked; from a fan; by an admin (the admin is the reporter; "How you knew"); nothing recorded (an older mark with no link or note: "None recorded", "No note recorded").
- Out of scope: a fan's sold-out report still waiting for review isn't Sold out yet, so it doesn't show here.
