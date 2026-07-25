# #1115 · Artist Page — design handoff

**July 24, 2026 · R2**

A new top-level route. Reached from the headliner name and each name in the
supporting-artists line on event detail (#643), and from artist matches in
search. It answers the one question the calendar can't: *should I care about
this show?*

Open: `Artist Page.html` — every state is in the Tweaks panel.

> **Ticket number.** R1 filed this as #1169. That's a closed, unrelated
> Spotify-shelf fix — corrected to **#1115** throughout (README,
> `CLAUDE_CODE_HANDOFF.md`, `artist-data.jsx`).

> **Mock scope.** Mocked in the three base themes (Electric / Jade / Light).
> Production ships nine off one identical token set, so **token-only colour
> discipline is the bar** — a colour that only survives in the base three is a
> bug. The one production-surviving hex is named and bounded below.

---

## What changed in R2

Five behaviours the R1 prose specified but no mock exercised, now built and drawn:

1. **Skip link no longer jumps backwards.** It takes a `skipTo` target and
   renders **only when the player has something after it**. In the no-shows
   state the player is the last block, so the link isn't rendered at all —
   §13 `a3` draws that case.
2. **The one-follow invariant is now enforced in code**, not just asserted in
   prose. `StickyBar` takes `showFollow`, and the page passes `hasShows`. §4
   `em-sticky` and §7 `f-stick3` draw the no-shows scrolled state with a bare
   sub-header.
3. **The desktop sticky rail exists.** `position: sticky; top: 24` on the left
   column, and the desktop page scrolls. §7 `f-deskrail` and §12 `d4` render at
   `scrollTop` 420 / 520 with the rail pinned. Tweaks has a *Desktop scrolled*
   toggle.
4. **`Show all N shows` renders.** The `many` fixture grew to 11 shows → 7
   items, over the cap of 5. §5 draws collapsed and expanded.
5. **Back chip is `var(--fg)`**, matching shipped `BackButton.tsx` and this
   package's own `StickyBar`. No `#fff`. The scrim/ink pairing now holds in
   Light, whose scrim is the lightest of the nine.

And the ten Lows: ticket number corrected · counts unified to **shows** in both
the head and the truncation control · five unused copy keys cut (the unfollow
pair implied a confirm step no state covers — cut rather than invented) ·
`Have a listen` and `third party` moved into `ARTIST_COPY` · no-op ternary
removed · breakpoint fixed at **&lt;360** in both docs (`AP_NARROW_BP`) ·
`historyOne` with no venue falls back to the zero phrasing instead of "once —
once" · `groupShows` rewritten to **cluster** · `&lt;main&gt;` landmark and real
`&lt;h2&gt;` section heads · `embedPlate` documented with its real 2-arg signature
and the token claim narrowed.

Plus the scope you confirmed: **Previously**, the crawl-only past-shows list
(§11). `Price TBD` stays. `RESIDENCY_MIN` stays 3.

---

## DNA statement

Built on the Concert Crawl consumer design system. **Structure** mirrors
`who_else_is_watching` — Section-organized canvas, Live-preview §0,
Tweaks-driven states, theme-parity closer, decisions log + gap report here.
**Chrome** is lifted verbatim from Event Detail v2 / Venue Profile: the 36px
round back chip on `--scrim` at `top:56` on mobile, a breadcrumb on desktop.
**Identity** is `IdentityArt` in the `artist` namespace (Phase 7.5) — not a new
avatar system. **Voice** is Sour Patch, with the honesty rail turned up: this is
a page about someone we only partially know, and it may never sound like we know
more than we do. **Tokens only**, with exactly one production-surviving exception,
named and bounded below.

Two principles bind every decision:

1. **Never imply we know more than we do.** The history line names its own
   window. The fallback doesn't apologise. The absent player states a fact, not
   an error. "We don't know them" and "we're not sure yet" look identical
   *by design*, because to the reader they are the same thing.
2. **The embed is a guest, not a resident.** Every attempt to make a foreign
   rectangle look native fails in at least one of nine themes. So we stop
   trying, and label it instead.

---

## Template inventory

| Surface | State | Mobile 390 | 320 | Desktop |
|---|---|---|---|---|
| Artist page | **Populated, Spotify-known** | ✓ | ✓ | ✓ |
| Artist page | **Populated, no Spotify** (= unresolved) | ✓ | ✓ | ✓ |
| Artist page | **No upcoming · known** | ✓ | ✓ | ✓ |
| Artist page | **No upcoming · fallback** | ✓ | — | — |
| Artist page | **Many upcoming** (residency + one-offs) | ✓ | ✓ | ✓ |
| Artist page | **Loading — clock 1** (artist fetch) | ✓ | — | ✓ |
| Artist page | **Loading — clock 2** (player pending) | ✓ | — | ✓ |
| Follow | not-following / following / signed-out | ✓ | — | ✓ |
| Follow | scrolled sticky sub-header ×3 (incl. no-follow) | ✓ | — | n/a |
| Follow | desktop scrolled, rail pinned | — | — | ✓ |
| Player | 3 integration directions × Electric + Light | ✓ | — | — |
| Player | mat direction × Electric / Jade / Light | ✓ | — | — |
| Past shows | list · Light · single · absent | ✓ | — | ✓ |
| Player | pending well · absent slot | ✓ | — | — |
| Theme parity | full page × Electric / Jade / Light (+ empty, fallback) | ✓ | — | ✓ |
| A11y | focus order + skip link + target audit | ✓ | ✓ | — |

---

## The calls

### 1 · Hero shape

An **identity band, not a photo hero.** A full-bleed plate (200px, 150px below 360)
with the name overlapping its lower edge, history prose under the name, follow
under that. The plate is short on purpose: a tall photo hero would be gorgeous
for the ~40% of artists who have a press photo and a large empty gesture for
everyone else, and it would push the player and the shows below the fold on
every phone.

Photo and `IdentityArt` occupy the **identical container** — Phase 7.5's
hard-swap contract. When a match resolves, one element swaps and not a single
pixel below it moves.

### 2 · Where the embed lives

**Below the hero, above the shows — but only when there are shows.** With
dates on the calendar, the player is the thing that answers "should I care",
so it sits directly under the follow. With no dates, the empty-upcoming block
moves above it, because the conversion moment outranks the audition.

Compact (152px) is the default height. The 352px variant is available in Tweaks
and is a desktop-only option at most; it costs more than a fold on mobile.

### 3 · How the iframe integrates across nine themes — **the call**

Three directions are on the canvas (§2), in Electric and in Light.

- **A · Shelf** — the embed as a figure inside a titled card. Reads well,
  costs ~56px of pure chrome, and at 320 that's a third of the player's own
  height spent on framing.
- **C · Flush** — match the bg param to `--bg`, no border, no rail, and hope.
  Works in the two or three themes whose ink happens to resemble theirs. In
  Light it reads as an unstyled div; in Forge and Cedar the warm surfaces make
  their cool grey ink look like a rendering bug.
- **B · Mat** — **recommended.** A JetBrains Mono rail names it (`PLAYER ·
  SPOTIFY` / `THIRD PARTY`), and an 8px `--surface-1` mat with a `--border`
  hairline sits between the foreign rectangle and the page so the two colour
  systems never touch. A caption below carries the preview/full-track truth.

The argument for B in one line: **the mismatch isn't the problem — the
*unexplained* mismatch is.** A labelled foreign object reads as "that's
Spotify". An unlabelled one reads as "that's broken." The mat is the physical
form of the label.

**The bg param is the one value we get to send them, and we don't always send
our own.** In dark themes we pass the computed `--surface-1` hex and the plate
merges into the mat. In **Light we deliberately don't match** — their ink is
dark-mode ink in every theme, so a light plate would put near-white type on a
near-white field. Light keeps a fixed dark plate and the player reads as an
intentional dark inset in a light mat, like a photograph. A mat is not supposed
to match the artwork.

The rule is `embedPlate(themeKey, direction)` in `artist-embed.jsx` — five
lines, branching on `theme.mode`, not on a theme name. That's why mocking the
base three is sufficient: Light is the only light-mode theme we ship, so the
light branch is fully exercised and every other theme takes the dark branch.
`direction` matters because **C · Flush** targets `--bg` rather than
`--surface-1`; keep the argument if you keep the direction.

**The exception, stated precisely.** `EMBED_LIGHT_PLATE = #191A1F` is the only
hardcoded colour that survives into production. Everything else on this page,
in every theme, is `var(--*)`. The R1 wording implied the whole embed was the
exception; it isn't — the mat, rail, caption and skip link around it are all
tokens.

### 4 · The history line

**Prose, in `--fg-muted`, directly under the name.** Not a stat block — a number
in a big box is a claim of completeness, and this number isn't one. Not chips —
they'd compete with the shows list six rows below.

> *4 shows on our map — Larimer Lounge, Globe Hall & the Bluebird. That's since
> March 2026; anything earlier they played, we missed.*

Three forms (`historyNone` / `historyOne` / `historyMany`), and each one names
the window in the same breath as the number. **Source-agnostic:** `since` is
data (`CRAWL_SINCE`), not copy. A licensed backfill changes one value and one
count; the treatment is untouched and no string needs rewriting.

**A past list now sits under it** — see call 13. The prose is the claim; the
list is the evidence. Both name the same window, and neither can outlive a
backfill, because `CRAWL_SINCE` feeds both.

The zero case is the one that earns the voice:
> *First time we've caught them. Our crawl only goes back to March 2026, so
> that's not saying much.*

### 5 · Upcoming-shows treatment

**Chronological by default. A venue only becomes a grouping when it earns it.**
`RESIDENCY_MIN` (3) or more shows at the same venue on consecutive-ish dates
collapse into one run card — five nights at Ophelia's is *one thing that
happens*, not five unrelated rows. Runs sort by their first date and sit inline
with the one-offs.

**Clustered, not first-vs-last.** A band can play a five-night stand in August
and come back to the same room in November; measuring the venue's whole span
would fail to group either. `groupShows` walks each venue's dates in order and
cuts a new cluster whenever the **gap between consecutive nights** exceeds
`RESIDENCY_WINDOW` (21 days), then judges each cluster on its own — on count
**and** total span. Both tests are needed: gap alone would let three nights
21 days apart each read as a "3-night run" across six weeks, which is a tour,
not a residency. The `many`
fixture proves it: the Nov 14 return to Ophelia's stays a one-off.

Row detail: date stamp (mono day-of-week / bold day / mono month) · venue ·
city · price chip. Price is the only optional field; unknown renders
`Price TBD` in mono `--fg-subtle` rather than an empty slot. No genre chips, no
supporting-artist lines, no images — the shows list is a routing surface to
event detail, and event detail already does all of that better.

### 6 · The fallback's character

**`IdentityArt`, artist namespace** — not `avatarColor`. The brief suggested
`avatarColor` (#762) and it would work, but it's an *avatar* system: coloured
initials on a tint, sized for a 24px disc next to a handle. Blown up to 200px
it reads as a placeholder. `IdentityArt` is already this artist's face on the
event hero, the browse tile, the search row and the Watching list. An artist we
can't resolve arrives wearing the face it already had everywhere else — which is
exactly the point: it doesn't look like a fallback, it looks like the artist.

The player slot in this state is three lines, no box, no icon, no retry button:
> **No player** · *We don't have them on Spotify. Doesn't mean much — plenty of
> good bands aren't. Their shows are below.*

A hole reads as an error. A sentence reads as a fact.

### 7 · The empty-upcoming block

**Promoted above the player, and the follow button moves into it.** The page
never has two live follow affordances — when there are no shows, the hero's
follow disappears entirely and the only one is inside the pitch:

> **Nothing on the calendar.**
> No dates booked that we can see. Follow them and the next one shows up in your
> Watching without you checking.

"Lands in your Watching" is a true statement about `autoWatch` semantics, and
deliberately **not** a notification promise (per the Phase 7 review rule: no
"we'll notify you"-class copy until notifications ship). Once following, the
body swaps to the calmer *"You're following, so the next one lands in your
Watching on its own."*

### 8 · Follow states and where it lives on scroll

`Follow` (filled `--signal`) → `✓ Following` (14% `--signal` tint, `--signal`
border and ink). A sub-line under it always states what following *does*.
Signed-out is a third skin — outline, `Sign in to follow`, with *"Following
needs an account. Everything else here doesn't."*

**Mobile: sticky sub-header.** Once the name scrolls past, a 56px bar carries
back + truncated name + a compact 44px follow. **Desktop: no sub-header** — the
left rail (plate + follow) is sticky, so the button is already always on screen.
That asymmetry is visual, not behavioural: same component, same states, same
result.

Per Hugh: if the user's connected Spotify already follows this artist, the
control mounts **pre-toggled and says nothing about it.** No "imported from
Spotify" badge, no source disclosure. `source` stays a schema concern.

### 9 · Header / back navigation

**Matched to the shipped pattern, not invented.** Event Detail v2 and Venue
Profile both use the 36px round chip on `--scrim` at `top:56 left:14` over the
hero on mobile, and a breadcrumb on desktop. Artist does the same. Hit area is
padded to 44×44 (the visible chip stays 36px) — worth applying to Event Detail
and Venue Profile too, see gap report.

### 10 · How the hero compacts at 320

Both the plate and the iframe want the fold. **The plate loses.** 200 → 150px,
name 31 → 27px, gutters 18 → 14px. The player keeps its 152px compact size
untouched: a player scaled below its own minimum is a broken player, and it's
the one box on the page whose dimensions aren't ours to negotiate. Nothing is
removed and nothing behaves differently.

### 11 · Loading — two clocks

Treated as two independent clocks, because they are.

- **Clock 1 · artist fetch.** Full skeleton — plate, name bar, two history
  lines, follow, three show rows. `role="status"`, `aria-busy`, visually-hidden
  *"Finding them…"*.
- **Clock 2 · player.** The page is fully readable and the shows list is
  interactive while the iframe is still blank. The well renders the mono
  `Loading the player…` at the **exact final height**, so the shows list never
  moves when it paints.

The page never blocks on the third party, and the third party can never cause
layout shift.

### 12 · Many upcoming shows

Runs collapse (call 5), and beyond `SHOWS_VISIBLE` (5) list **items** the rest
go behind an explicit `Show all N shows` / `Show fewer` toggle with
`aria-expanded`. A run counts as one item, so a five-night stand plus three
one-offs is four items and doesn't truncate at all.

**Truncation is measured in items; the label counts in shows.** Those are two
different numbers and R1 put them side by side in different units — the head
said `11 shows`, the button said `Show all 7`. The head is right: a reader
counting gigs doesn't know or care what a "group" is. The button now reads
`Show all 11 shows` and matches.

### 13 · Previously — the crawl-only past list *(new in R2)*

Confirmed as real scope: #1170 blocks *deep multi-year* history and setlists,
not the modest thing our own crawl already supports.

Deliberately **thinner than Upcoming**: month + day in mono, venue, and nothing
else. No price, no link-out, no setlist, no artwork, 38px rows against
Upcoming's 60. It is evidence for the history line, not a second list to shop
from — a past show is not a thing you can act on, so it gets no affordances that
suggest you can.

It closes with the sentence that names the window:
> *Our record starts when the crawl did, March 2026. Older gigs exist; we just
> weren't there.*

That line is load-bearing. A finished-looking list is itself an implicit claim
of completeness, and this is the only place on the page where a *list* could
make that claim — the prose above it can hedge, a list can't. So the list hedges
out loud.

**When the crawl has nothing, the section doesn't render** — no empty state, no
"0 shows" head. The history prose already said it, and saying it twice sounds
defensive.

---

## Copy map (ready for `copy.ts`)

Everything customer-facing is in `ARTIST_COPY` (`artist-data.jsx`), keyed for
lift into `apps/web/src/components/consumer/definitions/copy.ts`. Artist names,
venue names, dates, counts and `CRAWL_SINCE` are **data**, not copy — the crawl
window in particular is a single value so a backfill is a one-line change.

Grepped clean: no "fraud", no "last chance", no "we'll notify you", no "N other
users", no "event". Voice-checked against the Hybrid empty state and
`WATCHERS_COPY`.

---

## A11y (WCAG AA, nine themes)

- **Document outline**: a real `<main aria-label>` landmark, `h1` for the artist
  name, `h2` per section (`SectionHead` renders a real heading styled down to
  15px — small type, real heading). R1 had an `aria-label` on an unroled `div`
  and no outline at all.
- **Focus order**: back → follow → *skip player* → iframe → show rows →
  show-all. The **skip link** is the honest answer to a tab region we don't own:
  visually hidden until focused, 44px when visible, jumps to `#upcoming` — and
  **is not rendered when the player is the last block on the page**, where it
  would send focus backwards past something already read.
- **What we can't control**: the number of tab stops inside the iframe, their
  labels, focus rings and contrast. **What we can**: its `title`
  (`Spotify player for {name}`), its position in the sequence, a labelled route
  past it, and the rule that **nothing on this page is available only inside the
  player.**
- **Follow** carries `aria-pressed` and a full-sentence `aria-label`; state is
  never colour-only (the check glyph carries it too).
- **Touch targets ≥44px** including tertiary: back chip (36px visible, 44px hit
  area), show-all, every date row inside a run card, the sticky-bar follow.
- Contrast is a **token-pair** claim, not a per-theme one: `--fg` /
  `--fg-muted` / `--fg-subtle` on `--bg` and `--surface-1`, and `--signal`
  fills against `--fg-on-accent`. Because every pairing on the page is
  token-to-token, it holds wherever the token set holds — all nine. The two
  things that *aren't* token pairs get named individually: the back chip's ink
  is `var(--fg)` on `var(--scrim)` (verify in Light, whose scrim is the
  lightest at 0.40), and the embed interior is third-party and outside our
  audit. Stated, not hand-waved.

---

## Files

| File | Role |
|---|---|
| `Artist Page.html` | canvas + Tweaks (entry point) |
| `artist-data.jsx` | `ARTIST_COPY`, `CRAWL_SINCE`, fixtures, `historyLine`, `groupShows`, `CCMark` (verbatim copy) |
| `artist-embed.jsx` | the three integration directions, `EmbedStandIn`, `embedPlate`, loading + absent slots, skip link |
| `artist-surface.jsx` | plate, chrome, follow, history, shows list, run group, past list, empty block, skeletons |
| `artist-page.jsx` | `ArtistPageMobile` / `ArtistPageDesktop` — the state-dependent order rule |
| `identity-art.jsx` · `theme-context.jsx` · `design-canvas.jsx` · `ios-frame.jsx` · `tweaks-panel.jsx` | shared infra (copied, unmodified) |

Each authored file is under ~380 lines.

---

## Gap report — things the brief didn't cover, or that I'd flag

1. **Resolved in R2**, kept for the record: the brief's three-vs-nine theme
   discrepancy. Settled as *mock in three, discipline for nine* — the spec doc
   at `docs/superpowers/specs/2026-07-24-1115-artist-page-design-brief.md` is
   still worth correcting so the next reader doesn't hit it.
2. **Expiring signed URLs — flagged, not solved, as instructed.** The design
   implies two things eng should know: the container is **fixed-height,
   cover-cropped**, so the image can never set layout and a 404 on an expired
   URL degrades to the `IdentityArt` fallback with zero reflow; and the fallback
   must be reachable *at render time*, not only at fetch time (an `onError`
   swap, not just a null check).
3. **Back-chip hit area.** Event Detail v2 and Venue Profile ship a 36px round
   chip with no padding — that's a 36px target, under the 44px bar. Artist pads
   it to 44 and keeps the 36px visual. Recommend the same one-line fix on both
   shipped surfaces.
4. **Supporting-artist links are the entry point but aren't styled for it.**
   #643 renders supporting artists as discrete names; they now need a link
   affordance. Not designed here (it's event-detail territory) but it's the
   dependency that makes this route reachable — flagging so it doesn't fall
   between two issues.
5. **Closed by your R2 answers**: `Price TBD` divergence confirmed;
   `RESIDENCY_MIN` stays 3; the crawl-only past list is designed (§11).
   `RESIDENCY_WINDOW = 21` and `SHOWS_VISIBLE = 5` remain single constants in
   `artist-data.jsx` if either wants tuning later.
6. **The past list has no pagination.** Fine at the current crawl depth (months);
   at a year-plus, or after a backfill, it needs the same truncation control
   Upcoming has. Trivial to add — flagging so it isn't a surprise, not asking
   for it now.
7. **No share affordance.** Shareable cards (`design_handoff_shareable_cards`)
   exist for shows; an artist page is an obvious share target. Deliberately out
   of scope here — flagging as a candidate follow-up, not a gap.
