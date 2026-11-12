# Admin Redesign: Phone Addendum

Closes the four READINESS gaps under "Gaps requiring a Design round-trip". Each surface is drawn at 390 with its default, loading, empty (where one applies) and save-failed states, and the default is drawn again at 320 to confirm it holds. Everything else follows the approved handoff unchanged (rules 1 to 13 in `../README.md`); desktop-only dialogs elsewhere still follow rule 4 and are not redrawn.

- **Canvas:** https://claude.ai/artifact/WQbv4EBMjHykGBW5s9xBug (its own canvas, with captions and the self-review).
- **Files:** `screens/<gap>/<board>.jpg` (2×), `boards/<gap>/<board>.html` (standalone mockups, not code to port), `manifest.json` (title, caption and size per board). Same layout as the parent handoff.

## What was added (38 boards)

### Gap 1: Merge duplicates (`gap-1-merge-duplicates`, 9 boards)

- **Answer:** full screen from the event ⋯ menu ("Merge with another listing…"), not a sheet, and the compare is **stacked, not side by side**. Each listing is one card with the same rows in the same order (Lineup, From, Watching, Price, Reports), so at 320 you compare down the page. Venue and day show once, because a likely duplicate shares them.
- A pick step comes first: the likely duplicate (same venue and day) is offered, and search covers the rest.
- The pinned button names the choice ("Merge into the first" / "Merge into the second"). Keeping a hand-added listing says the next crawl updates it instead of adding the crawled one back (engineering need 23's redirect must also catch the crawl's match key).
- Boards: pick, compare (390 and 320), keep the second (320), pick loading, compare loading, no likely duplicate (empty), merging (spinner in the button), couldn't merge (snaps back).

### Gap 2: Inspect a fetched page (`gap-2-inspect-a-fetched-page`, 9 boards)

- **Answer: phone-reachable, by intent.** Needs you already works on a phone, and a failing or quiet venue is what you'd inspect from there. This unblocks 3b's viewer on phone.
- Path: venue Runs tab → run detail as a sheet (rule 4) → **Inspect page**.
- The two desktop columns become a segmented control. **What we read** opens first; **What we fetched** keeps Page, Text and HTML. HTML wraps (no sideways scroll) and opens at the highlight where the page stopped. Desktop's two header buttons (Open the live page, Compare with Nov 10) move to the ⋯ menu; Compare opens the other run in this same view.
- Boards: run detail sheet, what we read (390, 320), what we fetched (390, 320), ⋯ menu, loading, pages no longer kept (empty, 14-day retention from the plan's default), couldn't load.

### Gap 3: Add a venue start and Gone live (`gap-3-add-a-venue`, 11 boards)

- Start opens from the **+** on Venues. Start from scratch sits at the top. Each asked-for venue is one card: name and kind label (SUGGESTED, IN FEEDBACK), who asked, the robots.txt line, then **Set it up** (or **Ask the venue…** when robots.txt disallows) and **Not for us**. The two desktop explainer cards become one footnote, so there are no uneven columns.
- Not for us is answered in place with **Undo**, like Needs you.
- Gone live keeps the desktop words; the buttons stack most-used first, and what's still waiting becomes a short list.
- Boards: start (390, 320), Nobody asked yet, loading, couldn't load (Start from scratch still works), not for us with Undo, not for us didn't save, going live (spinner in the button), go live failed (nothing published, nobody notified, stays a draft), Gone live (390, 320).

### Gap 4: The venue Source tab (`gap-4-venue-source`, 9 boards)

- The desktop columns stack in reading order: How we read it, robots.txt, Fixed by the crawl rules. Advanced stays collapsed at the bottom of the first card. Tabs scroll sideways, as on every venue tab.
- No Save bar until something changes; then it pins and names the change (like Details).
- Boards: default (390, 320), switched to a ticketing feed (with a passed test and the Save bar), test running, Advanced open, robots.txt disallows ("Paused: robots.txt", Ask the venue), Don't crawl (the nearest thing to empty), loading, save failed.
- Field mapping, all existing columns: Calendar page → `url`; Seller and venue ID → `api_provider`, `api_account_id` (or `platform`, `platform_venue_id`); Page loading → `crawl_mode` (http / browser); Wait until → `crawl_wait_until` (networkidle / load / domcontentloaded); Wait for → `crawl_wait_for_selector`; Save debug HTML → `debug_capture_html`.

## Self-review

- **Gaps:** all four are answered and drawn. Gap 2's open question is settled (phone-reachable).
- **System rules:** two-chip venue status in every venue header; edits in flow (run detail is a sheet; merge and Inspect are full screen per rule 4; the Source Save bar pins); skeletons in the final shape; snap-back with a toast; the only spinner is inside a saving button; no keyboard hints; no run ids or Clerk ids; approved venue glyphs (`glyphs_final`); one glow per screen; centered kind labels; touch targets at least 40 to 46px.
- **320:** every default is drawn at 320. Titles, lineups and row values wrap; nothing clips except the venue tab strip, which scrolls sideways by design.
- **Words:** only the handoff's vocabulary (Merge duplicates, Watching, Re-crawl, Paused: robots.txt, Venues people asked for, Set it up, Not for us, Ask the venue, Start from scratch, Go live). US English.

## New strings for copy review

Merge with another listing; Which listing is the same show?; LIKELY THE SAME SHOW; Search all shows; No other listing at {venue} on {day}…; Same venue and day on both; KEEP; Merge into the second; Merging…; Couldn't merge / Both listings are as they were…; What we read; What we fetched; See where the page stopped; Stopped here: page 2 never loaded; This run's pages are gone / We keep fetched pages for 14 days…; Inspect the latest run; Couldn't load this page; {name}: not for us. It won't show here again.; Couldn't set {name} aside; Couldn't load the list / Start from scratch still works.; Going live…; {venue} isn't live yet / Nothing was published…; WAITING ON THE VENUE PAGE; Seller; {venue}'s venue ID on {seller}; Page loading: Plain fetch, Full browser; Wait until: Network quiet, Loaded, HTML ready; Wait for; Unsaved: How we read it; Couldn't save the source / Still reading the calendar page. Nothing changed.

## Proposals to confirm (Hugh)

- **Not for us gets Undo on desktop too,** so both match.
- **Ticketing feed fields** (Seller, the venue's ID with that seller) are drawn here; desktop's Source board doesn't show them, so desktop gets the same two fields under the radio.
- **Save debug HTML may be redundant** once engineering need 2 keeps every run's pages for 14 days. Drawn as-is; drop it if engineering confirms nothing else reads it.

## Build-vs-design check

Every PR that builds these screens runs `../BUILD-CHECK.md` against these boards too: screenshot each at 320 and 390, compare with `screens/`, and list every difference before marking it ready.
