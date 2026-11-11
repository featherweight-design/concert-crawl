# Edit your Concerts: Engineering Handoff

Today a night in Concerts is permanent: once you tap I'm going!, the show stays in your Concerts and Passport even if you never went. And a show you went to but didn't mark can never be added. This handoff fixes both. You can take out a show you didn't make it to, and you can say you went to a past show, so the Passport can be filled in after the fact. It also adds a notice that our records only go back so far. Hugh approved it on 2026-11-11.

- **Live canvas (source of truth for review):** https://claude.ai/artifact/KM41mNS15omHLb3QMDkRin
- **Strings for copy review:** [`COPY.md`](COPY.md).
- **Builds on:** the B+ Concerts, event page, artist page and sheets in [`design_handoff_bplus_redesign`](../design_handoff_bplus_redesign/). If B+ hasn't shipped on a surface when this is built, build it with today's components and the same structure. The B+ restyle comes with that phase.
- **Scope:** Concerts (mobile from 320px, and desktop), the event page of a past show, the artist page Past shows list, one confirm sheet, one Add sheet, and the API changes below. The optional board (section 3) is not approved yet.

## Files

| Path | What it is |
| --- | --- |
| `screens/<board>.jpg` | A screenshot of every board. Mobile boards are 2×, and desktop boards are 1×. Start here. |
| `manifest.json` | Every board with its title and size. |
| Live canvas | The same boards as live HTML. They are mockups (inline styles, sample data), not code to port. |

| Board | Shows |
| --- | --- |
| `concerts_m` | Concerts with a ⋯ on every row and the new Add a show you went to row |
| `remove_sheet_m`, `remove_dialog_d` | The Didn't make it? confirm, as a sheet and as a dialog |
| `removed_m` | After removing: the row is gone, the stats drop, and a toast offers Undo |
| `event_went_m`, `event_remove_m` | A past show you marked: You went, plus the way to remove it |
| `event_unmarked_m`, `event_stamped_m` | A past show you didn't mark: I went, then stamped |
| `add_sheet_m`, `add_dialog_d` | Add a show you went to: opened, with the records note |
| `add_search_m`, `add_tapped_m` | Searching for one artist, and a beat after tapping I went |
| `add_end_m` | Scrolled to the start of our records |
| `add_none_m` | No results |
| `artist_past_m` | Artist page Past shows with the same pill per row |
| `concerts_menu_d` | Desktop row menu |
| `ask_m` | **Optional, not approved:** Did you make it? on a Concerts row |

## 1. Take out a show you didn't make it to

### Where

- **Concerts rows** (`concerts_m`, `concerts_menu_d`): every row gets a ⋯ button at the right edge, past and upcoming. It's always visible on mobile. On desktop it shows on hover, on keyboard focus and while its menu is open. On a past row the menu has **Open the show page**, **Share this night**, a divider, then **Didn't make it? Remove** in `--danger`. On mobile, tapping ⋯ on a past row goes straight to the confirm sheet. On an upcoming row the same ⋯ opens today's un-going, so nothing new is needed there.
- **The event page of a past show you marked** (`event_went_m`): the live THAT NIGHT card and its `You went · <date>` label stay, but the button now fills with the venue's stamp color, with the stamp in the stub. Under it: "Didn't make it?" in muted text and **Remove it from Concerts** as an underlined link.

### The confirm (`remove_sheet_m`, `remove_dialog_d`, `event_remove_m`)

One sheet (mobile) or a 480px dialog (desktop), with the same body everywhere:

1. The eyebrow THAT NIGHT, the title **Didn't make it?** and one line saying exactly what changes: the Passport stamp comes off, the stats drop the show, and the user's crews stop seeing them there.
2. The row being removed, drawn as its Concerts row without the ⋯.
3. **Remove from Concerts** (filled, `--danger`) and **Keep it** (quiet outline).
4. A footnote on how to add it back. It names the show page from Concerts and says "tap I went again" on the event page itself.

There's no second confirm. After the remove, a toast says "<Artist> is out of your Concerts." with **Undo**, for about 6 seconds. Undo puts the night back with its **original** `attendingAt`.

## 2. Say you went to a past show

### The event page (`event_unmarked_m`, `event_stamped_m`)

Today a past show you didn't mark shows a read-only "Didn't make it". That becomes an **I went** button, the twin of I'm going!: the same stub shape, with the venue's stamp drawn dashed in the stub hole. A line under it explains what a tap does. Tapping fills the button in the stamp color (`You went · <date>`) and shows a toast with the stamp: "Stamped. <Artist> is in your Concerts." with **Open Passport**.

### Add a show you went to (`add_*`)

- **Entry:** a new row in Concerts under the Passport card, styled like Export to calendar: a dashed plus-stamp tile, **Add a show you went to**, and the sub-line "Stamp past nights, back to <records start>".
- **The sheet** (tall on mobile, a 560px dialog on desktop): the eyebrow CONCERTS, a title, a subtitle and **Done** at top right. Under that come a search box (artist or venue), three scope chips (**All Denver**, **My venues** = venues in the user's Concerts, **Artists I follow**), then past shows newest first, grouped by month.
- **Rows:** the shared image treatment, the artist, `venue · date`, and a pill on the right. Unmarked, the pill is outlined **I went** with a small dashed stamp. Marked, it's **Went**, filled in that venue's stamp color with a check. A tap toggles it straight away, with a toast and **Undo**. Shows already in Concerts read Went.
- **Search results** end with "That's every <artist> show in Denver since <records start>."
- **End of the list** (`add_end_m`): a dashed divider, THE START OF OUR RECORDS · <MON YYYY>, and one line saying older nights can't be stamped.
- **No results** (`add_none_m`): "Not in our records." plus a line naming the records start and suggesting a search on just the artist or just the venue.

### Artist page Past shows (`artist_past_m`)

The live `PastShows` list gets the same I went / Went pill on each row. Its live footnote stays as it is.

## The records notice

The notice is never a warning. It's a dashed note at the top of the Add sheet ("Our records start in <Month YYYY>. Shows before then aren't in Concert Crawl, so they can't get a stamp."), the end-of-list divider, and the no-results line.

**The date is data, not copy.** The boards use `CRAWL_SINCE = 'March 2026'` from `apps/web/src/components/consumer/artist-page/definitions/constants.ts`. Before building, check it against the real data, read-only, on prod and staging:

```sql
SELECT min(date) FROM events WHERE hidden_from_consumer = false AND status <> 'cancelled';
```

The product spec is dated 2026-04-23, so March 2026 may be a placeholder. If the real earliest show is different, Hugh picks the value. Then move it somewhere both the artist page and Concerts read, so there's one source of truth.

## 3. Optional, not approved: ask the morning after (`ask_m`)

For three days after a show the user marked, its Concerts row asks **Did you make it?** with **I went** (clears the question) and **I didn't go** (removes the show, with the same Undo toast). If nobody answers, nothing changes. Build it only if Hugh says yes.

## Engineering notes

- **Remove** uses the existing `DELETE /v1/attending/:eventId`, which already works on past shows. **Undo** needs a way to restore the original `attendingAt`: an optional, Zod-validated restore value on the PUT, or a small restore path. It should only accept the value the client just removed.
- **Marking a past show** uses `PUT /v1/attending/:eventId`, with two changes:
  - Today the PUT 404s any event with `first_missing_at` set. Past shows often have it set because they fell off the venue's page. Allow it when the event date is before today (MT), the same rule `/v1/history` uses.
  - **Never send the crew "going" notification (`notifyCrewGoing`) for a past show.** Stamping a night from last spring must not ping a crew.
- **New past-shows endpoint**, for example `GET /v1/history/past-shows?q=&scope=&cursor=`, Zod-validated and paginated. It returns consumer-visible, not-cancelled shows with `date < today (MT)` and `date >=` the records start, plus the user's attendance per row. Don't build it on `upcomingEventConditions`: use the history rule for `first_missing_at`.
- **Concerts "since <Month Year>"** should come from the earliest attended *event date*, not the earliest `attendingAt`, because a stamp added later has a recent `attendingAt`. See `HistoryHeader` and `history-stats.ts`.
- **One component per thing.** The I went button, the Went pill, the confirm sheet and the toast each exist once and are reused on every surface. The `GoingButton` comment that past states are read-only, and the "no remove affordance" note in `HistoryItem.tsx`, both go.
- **Locked vocabulary:** Concerts, Passport, Watching.

## Build-vs-design check

Before the PR is ready, screenshot every new or changed screen at 320, 390 and 1280 and put each one next to its board. List every difference in the PR body, then fix it or call it out.

## Tests

- API integration: removing then undoing keeps the original `attendingAt`. A PUT on a past event with `first_missing_at` set succeeds. A PUT on a past event sends no crew notification. The past-shows endpoint respects the date floor, cancelled and hidden rows, and the scopes.
- Web unit: the past GoingButton states can be tapped. Also cover the confirm sheet, the Undo toast, and the Add sheet's end and empty states.
