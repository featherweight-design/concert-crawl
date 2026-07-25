# Handoff: Artist Page (#1115)

## Overview
A **new top-level route** at `/artists/{canonical-slug}`. Route identity is a
canonical-name slug, **not** a Spotify ID — non-Spotify artists have no ID and
still get a full page. Reached from the headliner name and each supporting-artist
name on event detail (#643), and from artist matches in search. Free tier, fully
usable signed-out. Follow requires sign-in; nothing else does.

## About the design files
The files in this bundle are **design references created in HTML/React-in-Babel**
— prototypes showing intended look and behavior, **not production code to copy
directly**. Recreate them in `apps/web` using the existing consumer component
system: `IdentityArt`, theme tokens, `definitions/copy.ts`. Do not ship the HTML.

## Fidelity
**High-fidelity.** Colors (all via tokens), typography, spacing and interactions
are specified. Every measurement below is authoritative.

---

## Page structure

**Order is state-dependent.** This is not an accident and must be preserved:

| Condition | Order |
|---|---|
| Has upcoming shows | plate → name → history → **follow** → player → upcoming → previously |
| No upcoming shows | plate → name → history → **upcoming (empty, follow inside)** → previously → player |

**There is exactly one live follow affordance at any time.** With shows it's in
the hero. Without shows it's inside the empty block and the hero has none. On
mobile a sticky sub-header carries a second *instance* of the same control once
the first scrolls out of view — never both visible at once.

**Enforce this in code, not by convention.** `StickyBar` takes `showFollow` and
the page passes `hasShows`: in the no-shows state the sub-header is back +
name only, because the empty block's button is always on the page and stays
reachable. Two follow buttons on screen at once is a bug, not a variant.

### Hero plate
- Full-bleed. **200px** at ≥360px viewport, **150px** below 360
  (`AP_NARROW_BP = 360`; 320 is the design floor, not the breakpoint). Desktop:
  **320×320**, radius 14, in the sticky left rail.
- Photo → `object-fit: cover`, container height fixed. **The image never sets
  layout.** On error or missing ID, render `<IdentityArt name={artist} kind="artist"
  scale="hero" />` in the *same* container (Phase 7.5 hard-swap contract).
- Bottom gradient `linear-gradient(transparent, var(--bg))`, 80px.
- Back chip: 36px circle on `var(--scrim)`, `top: 56px; left: 14px`, inside a
  **44×44 button** (padded hit area). Desktop uses a breadcrumb instead
  (`Browse / {name}`). Both match Event Detail v2 / Venue Profile.

### Name
Inter 900, `-0.035em`. **31px** mobile / **27px** at 320 / **42px** desktop.
Overlaps the plate's lower edge via `margin-top: -26px` on the content column.

### History line
Inter 13px/1.55, `--fg-muted`, `text-wrap: pretty`, `margin-top: 10px`.
Prose, three forms. `since` is **data** (`CRAWL_SINCE`), never a literal in copy.

### Follow
- Full: 48px tall, 100% width, radius 10, Inter 800/15px, glyph + label, gap 7.
- Compact (sticky bar): 44px tall, `padding: 0 14px`, 13.5px.
- **Not following** — `background: var(--signal)`, `color: var(--fg-on-accent)`,
  `border: 1px solid var(--signal)`. Plus glyph.
- **Following** — `background: color-mix(in oklab, var(--signal) 14%, transparent)`,
  `color: var(--signal)`, `border: 1px solid var(--signal)`. Check glyph.
- **Signed out** — transparent, `--fg`, `1px solid var(--border-strong)`,
  label `Sign in to follow`, no glyph.
- Sub-line: Inter 11.5px, `--fg-subtle`, `margin-top: 8px`.
- `aria-pressed` + full-sentence `aria-label`. Never colour-only.

**Semantics:** writes `user_artist_follows` with `source: 'manual'` and carries
existing `autoWatch` ("watch every show this artist plays"). **Never writes to
the user's Spotify account.** Identical behaviour for non-Spotify artists. If the
connected Spotify already follows the artist, the control mounts **pre-toggled
and discloses nothing** — no badge, no source note.

### Player — the third-party embed

Direction **B · Mat**. Structure, top to bottom:

1. **Rail** — JetBrains Mono 10px/700, `letter-spacing: .14em`, uppercase,
   `--fg-subtle`. Left: `ARTIST_COPY.playerRail`. Then a 1px `--border` rule.
   Right: `ARTIST_COPY.playerRailThirdParty`. `margin-bottom: 8px`.
2. **Skip link** — `Skip player, go to shows`, `href="#upcoming"`. Visually
   hidden (`clip: rect(0 0 0 0)`) until `:focus`; then 44px min-height,
   `--surface-2` on a `--focus` outline.
   **Conditional.** It takes a `skipTo` target and renders only when a block
   follows the player. In the no-shows state the player is last, `skipTo` is
   null, and the link is not rendered — a "skip to shows" link there would move
   focus *backwards* past a block the user already read.
3. **Mat** — `padding: 8px; border-radius: 12px; background: var(--surface-1);
   border: 1px solid var(--border)`.
4. **The iframe** — `border-radius: 8px`, width 100%, **height 152px**
   (`compact`). 352px `tall` variant is desktop-only at most.
   `<iframe src="https://open.spotify.com/embed/artist/{spotifyId}"
   title="Spotify player for {name}" loading="lazy" allow="encrypted-media">`
5. **Caption** — Inter 11.5px, `--fg-subtle`, `margin-top: 8px`:
   `30-second previews. Full tracks if you're signed into Spotify.`

**Background param — the only value we send them.** Port `embedPlate()` as it
actually is, two arguments:

```js
// dark themes → merge the plate into the mat
// light theme → deliberately DON'T match; their ink is dark-mode ink always
const EMBED_LIGHT_PLATE = "#191A1F";
function embedPlate(themeKey, direction = "mat") {
  const t = THEMES[themeKey];
  if (!t) return EMBED_LIGHT_PLATE;
  if (t.mode === "light") return EMBED_LIGHT_PLATE;
  // flush sits directly on the page; mat sits on the mat
  return direction === "flush" ? t.tokens["bg"] : t.tokens["surface-1"];
}
```
It branches on `theme.mode`, never on a theme name — that's what makes it hold
for all nine off a three-theme mock. Keep the `direction` argument only if you
keep more than one direction; if you ship **mat** alone, drop it.

Resolve the token to a hex at runtime (`getComputedStyle(el).getPropertyValue`
or the theme table) — the embed cannot read `var(--*)`.

**Absent player** (no `spotifyId`, incl. unresolved matches): rail reads
`No player`, followed by one Inter 13.5px line. **No box, no icon, no retry.**

**Loading player**: the mat renders a `--surface-2` block at the **exact final
height** with a mono `Loading the player…` and a shimmer. Never let the shows
list move when the iframe paints.

### Upcoming shows
Section head: Inter 800/15px title + 1px `--border` rule + mono `N shows` count.
`id="upcoming"` (the skip-link target).

**Row** (`ShowRow`, min-height 60px, full-row link to event detail):
date stamp (44px wide, centred: mono 9px DOW `--fg-subtle` / Inter 800 19px day
`--fg` / mono 9px MON) · venue Inter 700/14 `--fg` · city Inter 11.5 `--fg-muted`
· price chip right. Divider 1px `--border`, `margin-left: 56px`, between
consecutive one-offs only.

**Price chip**: mono 12/700 `--fg`, `padding: 4px 8px`, radius 6, `--surface-2`
on `--border`. Unknown → mono 10px uppercase `--fg-subtle` `Price TBD`.

**Run grouping** (`groupShows`) — **clustered, not span-based.** Walk each
venue's dates in order and cut a new cluster whenever the gap between
*consecutive* nights exceeds `RESIDENCY_WINDOW = 21` days. A cluster becomes a
run only if it passes **both** tests: `RESIDENCY_MIN = 3`+ nights **and** a
total span within `RESIDENCY_WINDOW`. Everything else falls through as one-offs.
Gap alone is not enough — three nights 21 days apart each would otherwise render
as a "3-night run" spanning six weeks. Measuring
first-vs-last instead would fail to group a band that plays a five-night stand
in August and returns to the same room in November. Output → one card (radius 12, `--surface-1`,
`--border`, padding 12): venue + city header, a `N-night run` chip in
`--signal` (12% tint fill, 40% border), then one ≥44px row per date with just
`DOW MON D` in mono and the price. Runs sort by first date, inline with one-offs.

**Truncation**: cap is `SHOWS_VISIBLE = 5` **items** (a run counts as one), but
the **label counts shows** — `Show all {artist.shows.length} shows` — so it
matches the section-head count. Two units side by side is a bug. Full-width 44px
outline button, `Show fewer` when open, `aria-expanded` on both.

### Previously (past shows)
**`history` and `past` are the same set** — every past show the crawl recorded
for this artist — so one query feeds both, and `history.count` must equal the
row count of this list. The prose is the claim; the list is the evidence. If they
diverge the page states a number and contradicts it one block later.

Renders only when the crawl has rows — **no empty state, no "0 shows" head.**
Section head + `<ul>`; rows are 38px, `border-top: 1px --border` between them:
mono 11px `MON D` (74px column, `--fg-subtle`) + venue Inter 13/600
`--fg-muted`. **No price, no link-out, no setlist, no artwork** — a past show
isn't actionable, so it gets no affordance implying it is.

Closes with `ARTIST_COPY.pastNote(CRAWL_SINCE)` in 11.5px `--fg-subtle`. That
line is load-bearing and must not be dropped as decoration: a finished-looking
list is an implicit claim of completeness, and this is the only element on the
page that could make one.

### Empty upcoming
Card: radius 14, `--surface-1`, `1px --border`, padding 18.
Title Inter 800/17px `--fg`. Body Inter 13/1.55 `--fg-muted`, two variants
(following / not). Then the **full-width follow button** — on **desktop only**,
omit it (`inlineFollow={false}`) because the sticky rail already has one.

### Sticky sub-header (mobile only)
56px, `--bg`, `border-bottom: 1px --border`. Back (44px) · name Inter 800/15
truncated · compact follow **only when `hasShows`**. Appears when the hero name
leaves the viewport.

### Desktop scroll behaviour
**There is no desktop sub-header.** The left rail (plate + follow) is
`position: sticky; top: 24px` inside the grid, so the follow never leaves the
viewport and a second instance is never needed. If the rail is ever dropped,
desktop needs the sub-header — the two decisions are one decision.

---

## Loading — two independent clocks
1. **Artist fetch** — full page skeleton (plate / name bar / 2 history bars /
   follow bar / 3 show rows). `role="status"`, `aria-busy="true"`,
   visually-hidden `Finding them…`.
2. **Player** — page fully interactive, player well reserving its exact height.

**The page must never block on the embed**, and the embed must never cause
layout shift.

---

## Accessibility (WCAG AA, all nine themes)
- **Landmarks and outline**: `<main aria-label="Artist page for {name}">`,
  `<h1>` artist name, `<h2>` per section (styled to 15px — small type, real
  heading). Don't ship section heads as styled `<span>`s.
- Focus order: back → follow → **skip player** → iframe → show rows → show-all.
- We own: the iframe's `title`, its position in sequence, a labelled way past it,
  and the rule that **no information on this page lives only inside the player.**
  We do not own: its internal tab stops, labels, focus rings or contrast. Say so
  in the a11y audit rather than claiming coverage.
- ≥44px targets everywhere including tertiary controls.
- No colour-only state anywhere. Focus ring `--focus`.

---

## Tokens
Every colour is `var(--*)`. **Exactly one production-surviving exception:**
`EMBED_LIGHT_PLATE = "#191A1F"`, the plate we hand the iframe in Light — the one
place a hex must exist because the iframe cannot read `var(--*)` and its ink is
dark-mode ink in every theme. Everything *around* the embed (mat, rail, caption,
skip link) is tokens.

The back chip is `stroke="var(--fg)"` on `var(--scrim)`, matching shipped
`BackButton.tsx`. **Not `#fff`** — that was an R1 defect and it lands hardest in
Light, whose scrim is 0.40 against 0.72 elsewhere.

There is no `--shadow` token and nothing here needs one — elevation is carried
by `--surface-1` + `--border`, never by a drop shadow.

---

## Copy
Lift `ARTIST_COPY` verbatim from `artist-data.jsx` into
`apps/web/src/components/consumer/definitions/copy.ts`. `CRAWL_SINCE` is **data**
— put it wherever the crawl window is configured, not in copy. Artist names,
venue names, dates and counts are data.

Voice is Sour Patch with the honesty rail dominant. Banned: "fraud", "last
chance", and any "we'll notify you"-class promise until notifications ship.

---

## Existing surfaces to align with
- `IdentityArt.tsx` — the fallback plate, `kind="artist"`, `scale="hero"`.
- `events/[id]/page.tsx` — the back-chip pattern and the entry point from the
  headliner + supporting-artists line (#643).
- Venue Profile — same chrome; both need the 44px back-chip hit-area fix.
- `definitions/copy.ts` — string home.

## Out of scope (confirmed)
Related artists · genres · follower/popularity counts · **deep multi-year**
history and setlists (#1170 — the modest crawl-only past list is **in** scope
and specified above) · artist links on browse cards and the discovery shelf (#1171) ·
ticketing · bios · community metadata · artist search · follow-artist notification
wiring (#737) · match-scoring thresholds · the admin review queue.
