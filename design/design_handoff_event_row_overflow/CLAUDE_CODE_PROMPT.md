# Claude Code handoff prompt — Row overflow (tour names, legacy titles, status)

> Paste the code block below to Claude Code to kick off implementation.
> This is an **amendment to the Event Row System**, not a new component. If that
> row hasn't landed yet, ship it first — the two prompts stack in that order.

```
Context: Concert Crawl (private-beta concert-discovery app for Denver). We're
amending the unified Event Row to handle three data elements it had no slot for.
Design is complete and lives as HTML/JSX prototypes in
design_handoff_event_row_overflow/ — READ THAT FOLDER'S README.md FIRST, then
row-overflow.jsx and overflow-data.jsx. These are design references
(React-in-browser mocks), NOT production code — reimplement in our real stack,
matching layout, copy, and behavior exactly.

PREREQUISITE: design_handoff_event_row_system/ (the four-line slot contract,
Rule 1 context subtraction, Rule 2 the meta budget). Nothing in it changes here.
row-overflow.jsx is a deliberate FORK of event-row.jsx with every change marked
`▲` — diff the two, then fold the changes back into the one real component. Do
NOT ship a second row component.

THE PROBLEM: 233 of 1,125 upcoming production events (20.7%, measured
2026-08-13) carry a tour name, a legacy fallback title, or a cancelled/postponed
status. All three rendered above or below the four lines, so ~1 row in 5 was
taller than the design accounts for. The failure mode was variable row height,
which dissolves the list rhythm the row system exists to establish.

THE CALL: there is no fifth line. Three elements, three dispositions. Row height
must take exactly ONE value per geometry, where a geometry is a width paired
with a support-line state. Two rows differing only in their DATA — one with a
tour name and one without, one cancelled and one live — must measure
identically. If your implementation produces a second height at a fixed
geometry, it's wrong. (R3.3: this read "exactly TWO values per geometry"
through R1, which folded the support line into the count. §4 and the
verification step were already correct at ONE; the headline now agrees.)

1) TOUR NAME (8.1%) → LINE 1'S SLACK.
   "DWLLRS · One of Those Nights Tour" in ONE line box. The clause is mono,
   fontSize = title − 4, color var(--fg-subtle), preceded by a dimmed "·".
   MEASURED, whole-unit, on the same pattern as WhenWhere and MetaRow: render
   the clause, measure the TITLE's own overflow (scrollWidth > clientWidth), and
   drop the clause entirely if the title is being clipped. Two consequences,
   both intended and both non-negotiable:
     - the artist NEVER truncates to make room for a tour name;
     - the tour name is NEVER sliced or wrapped — it fits whole or it's absent.
   Do not implement this with a width table or a breakpoint. One boolean,
   derived from measurement. Reset the flag on ResizeObserver — and observe the
   title COLUMN, not the measured node itself (observing the node whose content
   the flag changes re-fires on its own mutation and can loop).
   Surface-gated by a new per-surface flag `tour`: true on browse / venue /
   artist / related, FALSE on watching (same reason watching drops the support
   billing — you saved the headliner, the price is the point).
   Expect it to be a wide-viewport detail: at 320 it essentially never renders.
   That is correct, not a bug to work around — artist, date, venue and price all
   outrank it.

   RULE 1 COROLLARY — the artist page promotes it. An artist page carries the
   artist, so the row drops it: the TOUR NAME takes the title slot at title
   weight/color, and the artist name goes to a screen-reader-only span. When the
   event has no tour name, line 1 falls back to the artist as today. `following`
   also leaves the artist surface's chip priority (redundant on a page about one
   artist) — artist surface meta priority is ["genre"].

2) FALLBACK TITLE (16.2%) → OFF THE ROW. No conditions.
   `fallbackTitle` is never read by the row, on any surface. It's the
   pre-extraction event title, and post-extraction the row already renders its
   contents ("Shwayze" on line 1, "with Claire Wright" on line 2). Because the
   crawler already falls the title through into `artist` when it can't resolve
   one, events like "BASS BINGO" render that string as line 1 through the normal
   path — so `artist` stays non-null and there is no fallback branch in the
   title slot. The set only shrinks (not regenerated after supporting-artist
   extraction shipped), which is most of why it doesn't get a line.
   Those rows DO have a height consequence — no Spotify match, no genre, so zero
   chips and no line 4. See (4).
   ITS NEW HOME is event detail, as a quiet `listed as "…"` line under the
   title. That is NOT designed yet — do not invent it; flag it and we'll spec it
   in design_handoff_event_detail_v2.

3) STATUS (1.3%) → THE PRICE SLOT.
   State is not description, and state already has a home: soldout already
   short-circuits the price stack as Rule 2's one stated exemption. cancelled
   and postponed take the same door — a RowMetaChip INSTEAD of the price, no
   meta-chip budget spent, no extra line.
   PRECEDENCE, explicit so two statuses can never both render:
     cancelled > postponed > soldout > presale > price
   - "Cancelled": tone="warn". ALSO strikes the date and time on line 3
     (line-through, 1px, opacity .8 — the venue is left alone) and dims the
     ARTWORK to .55, exactly like soldout.
     DELETE production's struck title. A cancelled row carries exactly THREE
     signals, one per channel: the chip (states it in words), the dimmed artwork
     (peripheral, parity with sold-out), and ONE strike on line 3. The title is
     NOT struck: a strike voids a claim that became false, and the artist's name
     didn't become false — the date and place did. Line 1 is also the wrong host
     for it (struck link text reads as deleted, it collides with the ellipsis and
     the tour clause, and on the artist surface the title slot holds the TOUR
     NAME). Do not ship both behaviours.
   - "Postponed": tone="strong" — a change, not a loss. SAME strike and SAME dim
     as cancelled; only the chip differs.
   The strike and the dim are GENERAL "something's wrong with this show" cues,
   not per-state encodings:
       strike → cancelled + postponed
       dim    → cancelled + postponed + sold out
   Sold-out sharing the dim is expected, not a collision. The CHIP is what tells
   the user which problem it is. Do not split these cues further per state.
   Both chips get screen-reader context ("this show has been cancelled" /
   "new date not announced yet"). No new chip shapes, sizes or tones.
   These two are the only elements here that must never be suppressed on any
   surface — hiding a cancellation is the one failure that costs someone a
   night out.

4) ROW HEIGHT — a constant of GEOMETRY, not of content.
   MetaRow already returns nothing when a row has no chips, so line 4 collapses
   and row heights already vary today. Keep the collapse (an empty chip line is a
   hole) but reserve the height on the ROW: min-height per surface × density ×
   narrow, with the existing align-items:center distributing the slack so sparse
   rows are optically centred rather than sitting above a gap.
   Result: ONE height per geometry — one constant per outcome for virtualised
   list sizing, and no row content can move it again. ROW_MIN in row-overflow.jsx
   is a starting table measured in the mock (cozy wide 110 / cozy narrow 108 /
   watching 92 / compact 101 / roomy 121); DERIVE it from real type metrics in
   our stack rather than copying the numbers, and assert the outcome in a test:
   render a mixed list and assert the distinct-height set is 1.
   Cost is ~20–27px of air on the sparsest rows. Accepted deliberately.

5) TWO GENRES — ONE CHIP, not two. (see genre-pair.jsx)
   The data already carries two and the API filters with a Postgres array
   overlap across the whole array (apps/api/src/routes/events.ts:297-310), so a
   multi-genre act is ALREADY findable under both. (R3.3: this cited a hasGenre
   /.some() helper in filter-system.jsx — mock code, not a real symbol. Same
   conclusion, working citation.) Nothing about search or the data changes. What changes is that the row
   stops labelling a "soul"-filtered result FUNK.
   Render the genre slot as a PAIR: "FUNK/SOUL" — one chip, ONE budget slot,
   separator is a dimmed "/" at 45% opacity so it reads as one label.
   When a Vibe filter is active, the lead is the first genre that is a MEMBER of
   the picked bucket — NOT one equal to it. The filter passes one of the 16
   bucket labels from genre-buckets.ts, which the API expands server-side, so no
   genre on the row is ever equal to the filter string:
       const lead = g.find((x) => expandBucket(activeVibe).includes(x));
   Masego is ["funk","soul"] and both sit in the jazz bucket, so a jazz filter
   must lead with one of them rather than falling back to genres[0].
   THIS NEEDS A SEAM WE DON'T HAVE: the taxonomy lives in apps/api/src/lib/ and
   the web app only sees the bare filterVibe string. Either lift the map into a
   shared package or have the API return which sub-genre matched — design has no
   preference, but do not cost this as a one-line change. Until the seam exists,
   fall back to primary-genre order: no reorder is fine, a wrong reorder is not.
   VIBE_BUCKETS in genre-pair.jsx is a mock for the demo; you own the real map.
   Cap at two; a third genre never renders.
   DO NOT give the second genre its own chip. Rule 2's budget is two, dropping
   to one with a support line — a second chip spends the whole budget on one
   fact, so Browse loses Following and a row with supports shows half its genre.
   WIDTH PRESSURE — put this in MetaRow's fit pass, NOT in the chip. When the
   chip set overflows and a collapsible pair is present, collapse the pair to
   its leading genre FIRST, re-measure, and only then start dropping whole
   chips. Without that step the wider pair chip is dropped entirely at 320 and
   the row shows no genre at all — worse than today. The dropped genre goes to a
   screen-reader span. It's width, not a breakpoint — a pair sharing the line
   with a Following chip collapses earlier than one that has the line to itself.
   Don't encode a breakpoint table; measure.
   Do not try to make the chip measure itself: MetaRow wraps every child in a
   content-sized span, so a chip looking at its parent sees a box that never
   overflows, and once the fit pass has pulled it out of flow the container
   isn't overflowing either. We built that version; it silently never fired.
   THE PASS MUST TERMINATE BY CONSTRUCTION. It is inherently multi-render — you
   cannot know whether a collapsed pair fits without rendering it collapsed and
   measuring — so make it a state machine with TWO ceilings:
     · a PER-MOUNT write budget that nothing can reset (we use 12). Route every
       state write through one gate that decrements it and refuses at zero; worst
       case the row keeps its last good answer. This is the ceiling that actually
       holds — the per-width cap below is legitimately reset by every new width,
       so on its own it bounds nothing across repeated observer fire.
     · a per-WIDTH episode cap (we use 3): record the width the current answer
       belongs to and how many writes it has cost; a width already at the cap is
       left alone.
   And: the ResizeObserver must NOT write state synchronously — coalesce to one
   animation frame — and must re-open the question ONLY when the width actually
   moves (>1px). The collapse changes the meta line's own HEIGHT, so an unguarded
   observer re-fires on its own mutation.
   We locked the main thread three times getting this wrong, each time
   differently, and not once with an exception — the page just died with no
   console error. Treat an uncapped measure/collapse pass as a page-killer, and
   verify across several fresh loads rather than one.

   SCOPE, so this doesn't get oversold: the reorder is a NO-OP whenever the
   primary genre is already a member of the picked bucket — which includes
   Masego, the act the request came from. Buckets are wide, so that's the common
   case, and it's fine: FUNK/SOUL under a jazz filter already confirms the match
   because both genres are jazz-bucket members. The reorder earns its place on
   CROSS-BUCKET acts (["hip-hop","soul"] under jazz would otherwise render
   HIP-HOP and read as a mis-hit). The pair confirms the match; the reorder stops
   it confirming the wrong thing.
   This is the one sanctioned place where a unit degrades internally instead of
   dropping whole: the unit is the chip, the chip survives, its contents shorten.

DATA — two additions to the one show shape, both optional:
  tourName:      string | null   // "One of Those Nights Tour" — already exists
  fallbackTitle: string | null   // pre-extraction title; the row stops reading it
  artist:        string          // stays NON-NULL
  genres:        string[]        // already exists; the row now reads [0] and [1]
Still no display copy in the data. Nothing else in the shape moves.

⚠️ R3.3 — the canvas flattens TWO axes into one `status` field. Production does
not, and the precedence resolver in §3 depends on the split:
  lifecycle: "cancelled" | "postponed" | ... — whether the show is happening
  status:    "live" | "soldout" | "presale"  — the price state
`PriceStack.tsx` already reads both separately. Resolve across the pair
(cancelled > postponed > soldout > presale > price); never widen `status` to
carry lifecycle values.

WHAT MUST NOT CHANGE: the four-line contract · Rule 1 · Rule 2 and the meta
budget · the measured line-3 ladder · the narrow (≤360) step · the 36px action
gutter and its collapse · price rendering and the surface-gated delta · sold-out
and presale behavior.

HARD constraints (house rules, unchanged):
- Token-only theming — every color from theme-context.jsx CSS vars. No raw hex.
  Verified across electric / jade / light.
- --accent = "watching"; --signal = CTAs/status; Following stays the neutral
  Spotify-marked chip.
- Vocabulary: "Watching", never Saved / Favorites / Bookmarks. User-facing
  status copy is "Cancelled" / "Postponed" — plain, not apologetic.
- No native title= tooltips; screen-reader spans instead. 44×44 minimum targets.
  Status never rides on color alone (each state has text).
- Mobile 320 baseline → desktop.

VERIFY THE CLAIM, don't assume it: render a mixed list (see O_MIXED in
overflow-data.jsx — ~20% of rows carrying one of the three, 2 of 11 with zero
chips) at 320 / 390 / desktop on browse, watching, venue and artist, measure
every row's height, and assert the distinct set is 1. Artboards `rh-probe` and
`rh-collapse` in Row Overflow.html do exactly this, side by side, and can be
copied as a test.

Start by reading design_handoff_event_row_overflow/README.md, then diff
row-overflow.jsx against design_handoff_event_row_system/event-row.jsx, then ask
me anything ambiguous before writing code.
```
