# B+ B6: Browse filters (phase plan)

Part of the [B+ umbrella plan](2026-11-11-bplus-redesign.md). **Boards:** `05-filters/bp-f-filt_d`, `_active_d`, `_where_d`, `_who_d` (desktop); `_m_rest`, `_m_active`, `_sheet_m`, `_venues_m` (390). **Ruling (Hugh, 2026-11-12, design addendum 2 item 6):** Where and Vibe are multi-select, as the boards draw them ("Bluebird +1", "2 venues", venue checkboxes). This supersedes the 2026-11-11 single-select ruling. The API side shipped in #189 (repeated `filterWhere` and `filterVibe` keys); When and Price stay single-select.

## Split

B6 crosses the ~800-line boundary, so it ships as two PRs on one shared filter model.

- **B6a, desktop (>= 640px).** One segmented bar replaces the chip row: My artists (switch), Who (the crew lens, moved out of the heading row), When, Where, Price and Vibe. Each segment has an eyebrow, a value, and a chevron, plus a ✕ when it's active. Under the bar sits "N shows", or "N shows match" with Clear all. The popovers get the sheet edge, a title, a one-line sub and Clear. Where is a searchable two-column list of venue tiles with their neighborhoods. Vibe puts a genre dot on each option, under the teaching line. Mobile is unchanged.
- **B6b, phone.** A Filters button with an active count, the My artists switch, and one sheet holding Who, When, Where (a tile grid with "All 21"), Price and Vibe (dots, with "All 16"). Choices in the sheet are staged and applied with "Show N shows". The count comes from `/v1/events` with the draft params and `limit=1` (the response `total`). The sheet also has Clear all.

## What doesn't change

- URL param names (`filterWhen`, `filterWhere`, `filterPrice`, `filterVibe`, `crew`, the follow scope; Where and Vibe repeat their key per value), offset reset, clearing `filterWhen` in Cal view, the follow chip's entitlement and lapse handling, and the `crews` flag gate.
- The taste chip (Spotify sync is retired) renders wherever it does today.

## Route inventory

| Route                              | 390 | 1300 | Shares with |
| ---------------------------------- | --- | ---- | ----------- |
| `/events` filters at rest          | ☐   | ☐    | origin      |
| `/events` with When + Where active | ☐   | ☐    | `/events`   |
| Where popover / sheet              | ☐   | ☐    | —           |
| Vibe popover / sheet               | ☐   | ☐    | —           |
| Who (crews flag on)                | ☐   | ☐    | —           |
| `/events?view=cal` (no When)       | ☐   | ☐    | —           |

Checked in Electric, Light and Forge, plus 320 for B6b. **Markers:** the bar's segments and `VenueTile` in Where.

## Copy

New strings go through copy-review: the eyebrows, "Everyone", "Any night", "Every venue we crawl.", "Find a venue", the Vibe teaching line, "N shows match", Clear all, and "Show N shows". The Vibe legend line above a filtered list is a DRAFT in COPY.md. It isn't built in B6; copy-review settles it first.
