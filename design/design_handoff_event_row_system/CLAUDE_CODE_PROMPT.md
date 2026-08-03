# Claude Code handoff prompt — Event row system

> Paste the code block below to Claude Code to kick off implementation.
> It points at this folder and locks the non-negotiable design constraints.

```
Context: Concert Crawl (private-beta concert-discovery app for Denver). We're
implementing the unified Event Row. Design is complete and lives as HTML/JSX
prototypes in design_handoff_event_row_system/ — READ THAT FOLDER'S README.md
FIRST, then event-row.jsx and row-data.jsx. These are design references
(React-in-browser mocks), NOT production code — reimplement them in our real app
stack, matching layout, copy, and behavior exactly.

WHAT THIS REPLACES (this is a consolidation, not a new feature):
- The Browse / Venue event row.
- WatchingItem in design_handoff_watching/watching-screens.jsx.
Those drifted into two dialects of the same object — same show, different price
rendering, different truncation order, different action, different chip
vocabulary. Delete both and route all three surfaces through one component.

Also delete on the way through:
- The interactive eye/watch button on Browse rows. This lands Spotify Sync R1's
  original call. Watching is toggled on Event Detail; on a row it's a
  non-interactive accent tick on the identity art.
- The per-row Following / genre / Stale / Community / Sold-out pills, each of
  which had its own shape. They are all RowMetaChip now — same size, radius,
  mono uppercase, letter-spacing; tone is the ONLY variable.

THE CONTRACT (all of it is enforced in event-row.jsx; ROW_SPEC is the table):
- Four lines max: artist / with {supports} / when · where / meta chips.
- Rule 1, context subtraction: the row never repeats what its context already
  says. Browse has date group headers → row drops the date. A Venue page is one
  venue → row drops the venue. Watching keeps both. Driven by SURFACES[surface]
  .carries — adding a fourth surface is a config entry, not a component.
- Rule 2, the meta budget: two chips, dropping to one when a support line is
  present. Priority-ordered per surface (browse/venue: following → genre;
  watching: freshness → provenance). MetaRow then MEASURES and drops whole chips
  that don't fit. Chips are never sliced mid-glyph and never wrap. NOTHING gets
  a slot by default — a new feature must displace something or it doesn't ship
  to the row. This rule is what stops the drift from recurring; keep it.
- Truncation order is load-bearing: artist ellipsis-truncates first; on the
  when · where line the VENUE is the only thing allowed to truncate. Date and
  time are flex-shrink: 0. Line 3 MEASURES and drops whole units — level 0 full
  date/time/venue, 1 short date, 2 venue + its separator drop together, 3 time
  drops. Derive the level from measurement, NOT from the narrow flag (that bug
  clipped Watching at 390). Price min-width at narrow is 56: the level-2 floor
  is 103px against a 100px column, so 62 leaves it 3px short. The live Watching row truncates the date away
  ("Mission Ballroom · Sat…") — that is the bug, don't reproduce it.
- Price rendering is identical on every surface. `from $` only when the amount
  is a floor. THE DELTA IS GATED ON SURFACE, NOT DATA: it renders on Watching
  and nowhere else. Several Browse fixtures carry a `saved` price; a Browse
  price must never go green.
- Sold out is Rule 2's one exemption: it short-circuits the price slot, spends
  no chip budget, and suppresses price + delta. Dim the ARTWORK, not the row —
  a row-level opacity pushes --fg-muted text toward the AA floor.
- No native title= tooltips. Context the visible text doesn't carry goes in
  screen-reader-only spans. The watch tick is role="img" + aria-label.
- The row is not a click target on a div. The artist name is a real anchor;
  add a stretched-link ::after so the whole row is clickable.
- The action gutter is 36px and exists only on surfaces that HAVE an action.
  Do not reserve it on Browse/Venue: at 320 that collapses the title column to
  80px. Price edges align within a surface, not across surfaces.
- narrow (≤360): art 56→44, gap 14→10, title 15.5→14.5, price min 78→56.
- Default density is COZY. compact/roomy are supported; cozy is what ships.
- Separator spacing on the when · where line comes from flex `gap`, NOT from
  literal " · " strings — flex items get their leading/trailing whitespace
  trimmed and the spaces vanish. Same for the support-billing line.

DATA — the drift started here, so fix it at the source. One show shape:
  price: { amount, isFloor, source, observedAt } | null
    source: "primary" (crawled from the venue page — renders NO chip) or one
    of production's source_category values (migration 0040): "boxoffice" |
    "standard" | "resale". Do NOT invent labels — reuse the ones admin
    already renders: Box office / Community / Resale. README §2
    "Provenance vocabulary" is the table.
  saved: { at, price } | null        // Watching only
  supports: string[]
  status: "live" | "soldout" | "presale"
No display copy in the data. "from", "$", "Stale · 9d ago" are all row-side
formatting. Browse currently sends price as a display string ("from $68") —
that has to become the structured object.

HARD constraints (house rules):
- Token-only theming. Every color reads from CSS vars in theme-context.jsx
  (var(--bg), --fg, --fg-muted, --fg-subtle, --signal, --accent, --warning,
  --success, --surface-1/2/3, --border, --border-strong). No raw hex in screen
  code. Verified across electric / jade / light.
- Color semantics: --accent = "Watching a show" (the identity-art tick).
  Following (an artist) stays the NEUTRAL, Spotify-marked chip — never accent.
  --signal = CTAs / status. Spotify green only inside the official logo asset.
- Vocabulary: "Watching", never Saved / Favorites / Bookmarks.
- WCAG AA: 44×44 minimum targets (the ⨯ is a 28px paint box padded to 44).
  Status never rides on color alone. Chips dropped by MetaRow are aria-hidden.
- Mobile 320 baseline → desktop. Visual differences fine; behavioral asymmetry
  is not.

Carry-over that is NOT re-specced here and should stay as-is:
- Watching's group headers (Tonight / This week / month names) work with this
  row unchanged.
- Watching rows stay carded; Browse/Venue stay divided rows. Same component,
  `carded` prop — it's a reading-mode difference, not a component difference.

IGNORE design_handoff_browse_row_right_column/ — it is shelved and its README
says so. It was solving the wrong layer.

Start by reading design_handoff_event_row_system/README.md, then ask me anything
that's ambiguous before writing code.
```
