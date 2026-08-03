# Concert Crews (#1226 · Round 1)

> Source of truth: `uploads/2026-08-02-1226-concert-crews-design.md`. Every §3
> decision is treated as locked and none is reopened — the calls made here are
> the §8 items and nothing else.
> Pattern mirrored: `design_handoff_monetization_lifecycle/`.
> Status: **first pass, ready for Hugh's review.**

**Two canvases.** `Concert Crews.html` is the product — every surface, state and
annotation. `Crew Patch System.html` is the crew-identity argument on its own,
because it's self-contained and it carries most of the hero patches.

Open `Concert Crews.html` and toggle **Tweaks** in the toolbar to drive the
Section 0 live preview across surface · crew · lead order · base theme.

---

## What's here

| File | What it does |
|---|---|
| `Concert Crews.html` | The product canvas — 11 sections, 320 + 390 + desktop throughout. |
| `Crew Patch System.html` | The crew-identity canvas — anatomy, the two-systems comparison, gallery, registries, scales, the seed proof, the three-theme reskin. |
| `crew-art-boards.jsx` | The documentation boards for the patch system, plus the three shared doc atoms (`Board`, `Note`, `SpecTable`) both canvases use. |
| `crew-art.jsx` | **The crew patch system.** `<CrewPatch crewId size scale/>`, `crewIdentityFor()`, and the four registries (`CREW_CHORDS` · `CREW_WEAVES` · `CREW_SIGILS` · `CREW_GROUNDS`). Its own visual language, token-only, seeded from `crew.id`. No dependencies. |
| `crew-copy.jsx` | `CREW_COPY` — every customer-facing string, the design mirror of `definitions/copy.crews.*`. Nothing is hardcoded in a screen. |
| `crew-shared.jsx` | Atoms + fixtures. `CMark` (verbatim `CCMark`), `MonoEyebrow`, `RailHeader`, `SectionRail`, `SheetChrome`, `ModalChrome`, `Scrim`, `DragHandle`, `Btn`, `MemberDot`, `MemberCluster`, `nameMembers()`, `CrewBottomNav`; five crews, thirteen members, the shared-past and attendance fixtures. |
| `crews-destination.jsx` | `CrewsList`, `CrewHome`, `CrewHero`, `UpcomingBand`, `PastBand`, `RosterList`, `StubRow`, `CrewEmpty`, `CrewsScreen`, `CrewsDesktop`. |
| `crew-browse-lens.jsx` | `CrewLensPill`, `CrewLensTitle`, `CrewPickerSheet`, `CrewPickerPopover`, `BrowseLensMobile`, `BrowseLensDesktop`. |
| `crew-invite.jsx` | `CreateSheet`, `PremiumGate`, `InviteSheet`, `RerollSheet`, `InviteLanding`, `DeadLink`, `LeaveConfirm`. |
| `crew-social-rail.jsx` | `CrewGoingLine` (crew attendance under Going — see §3a), `EventDetailMock` (renders the shipped `GoingCTA` + `WatchStrip`), `NotifList`, `MuteRows`. |
| `event-row.jsx` | The **shipped** event row from `design_handoff_event_row_system/`, plus a two-line diff — see "The event card is not forked" below. |
| `empty-state.jsx` | The shipped `<EmptyState/>` from `design_handoff_empty_state/`, copied verbatim. Every crew empty state is `variant="hybrid"` on this component. |
| `filter-system.jsx` | The shipped filter system, copied verbatim for reference. The crew picker borrows its anatomy but deliberately not its API — see §2 item 2. |
| `identity-art.jsx`, `row-data.jsx`, `spotify-shared.jsx`, `theme-context.jsx`, `ios-frame.jsx`, `design-canvas.jsx`, `tweaks-panel.jsx` | Canonical deps, copied verbatim. |

## Sections in the canvas

0. **Live preview** — surface · crew · lead order · theme, wired to Tweaks.
1. **Crew visual identity** — moved to its own canvas, `Crew Patch System.html`.
2. **The Crews destination · mobile** — list (390 + 320), crew home in all three tabs, 320, opens-on-past, crew-of-one, at-cap + manage, the stub up close.
3. **The Crews destination · desktop** — list plus all three tabs.
4. **The Browse lens** — resting, on, 320, the title block both states, picker sheet, empty lens, desktop + desktop popover.
5. **Crew presence on event detail** — the four-state ladder, in situ mobile + desktop, card-vs-rail.
6. **Create + invite** — Premium gate, lapsed gate, create, invite (+ copied / retired / at cap), leave, creator handoff, desktop modals.
7. **The signed-out invite landing** — mobile, desktop, no-handle inviter, full, expired, retired.
8. **Empty + edge states** — all nine, plus the handle-less member.
9. **Notifications + per-crew mute**.
10. **Theme parity** — every crew surface element under Electric / Jade / Light side by side, plus the composed surfaces.
11. **Copy + accessibility**.

(§1 lives in `Crew Patch System.html`; the numbering keeps its slot so the
README and the two canvases stay in step.)

---

## 1 · Crew identity — the thing you asked me to look hardest at

The risk you named is real and it's a *silhouette* problem before it's a colour
problem. `identity-art.jsx` draws artists and venues as **risograph gig
posters**: full-bleed rectangles, off-white paper, ink overprint via
`mix-blend-mode`, halftone, grain, and eight hardcoded riso palettes that ignore
the theme entirely. That's the correct language for an artist — an artist *is* a
poster. Point it at a crew and the crew becomes another tile in a feed.

So crews get a **sew-on tour patch**. Not a restyle of the poster system — a
different object, sharing no code, no palette, no template, no seed namespace:

| | `identity-art` (event · venue) | `crew-art` (crew) |
|---|---|---|
| silhouette | full-bleed rectangle | squircle with a stitched edge |
| colour | 8 fixed riso palettes (hex) | **theme tokens only** |
| theme | ignores it — paper is paper | reskins with the theme |
| surface | printed: grain, overprint, mis-registration, halftone | textile: flat token fields, woven lattice, no grain, no blend modes |
| structure | loose, organic, off-centre | strict 6-fold radial symmetry |
| rotation | whole image, 90° steps | weave only; the sigil is always upright |
| marks | halftone / stripes / grooves / blueprint | crest sigils |
| seed | artist or venue **name** | **crew id** |
| reads as | content | your people |

Four layers: **patch body** (the badge silhouette + dashed stitching) →
**ground** (halo / wedges / bands) → **weave** (twill / warp / braid / knot) →
**sigil** (triad / bloom / beacon / keystone / tangle). 5 chords × 4 weaves ×
5 sigils × 3 grounds = **300 distinct patches**, all inline SVG, no dependencies.

Two consequences worth flagging because they're deliberate:

- **A "chord" is a pair of token *roles*, never colours** — `--signal` +
  `--accent`, `--accent` + `--warning`, and so on. There is no hex anywhere in
  the art. Flip the theme and every crew reskins with it; ship a tenth theme and
  the art needs no work. §1's three-theme board is the proof.
- **The patch never carries text.** The crew's name always sits beside it, never
  inside it, so there is no contrast-over-generative-art problem to solve — the
  thing `IdentityArt`'s initials stamp needs a backplate for. The patch is
  `aria-hidden`; the name is the label.

**`micro` drops the weave and the stitch.** At 22–34px — the Browse pill, the
notification row, the mute list — a lattice turns to mud and dashed stitching
aliases. What survives is the sigil plus the chord, which is exactly what makes
a crew recognizable in a picker. Shown at six sizes in §1.

### The seed: `crew.id` + `patchSalt`

`crew.id` is immutable, minted once at creation. It survives renames, joins,
leaves, removals, and an ownership handoff — the only value on the row that does.
`patchSalt` is an int defaulting to 0, incremented **only** by an explicit,
confirmed **New patch** action from the creator.

That addition doesn't weaken §3.5, because the constraint was about *unintended*
reshuffling: still never derived from membership, still never derived from the
name, still stable in a picker — it moves only when a human decided it should.
A reroll is the crew's own decision about how it wants to look, taken once and
then stable again. It answers the one case the original rule didn't cover: a crew
that simply doesn't like its first pull.

| candidate | verdict | why |
|---|---|---|
| `crew.id` + `patchSalt` | **shipped** | Stable against everything a crew's life does to it; changes only on intent. |
| membership hash | rejected | Brief §3.5 — the face reshuffles when someone joins, so the picker stops being a picker. |
| `crew.name` | rejected | Renaming is normal and cheap. Handing the crew a new face to fix a typo is not. Hence the create sheet's helper line. |
| creator user id | rejected | Two crews by the same person collide, and it silently encodes who owns it. |

**Reroll rules** (all Design's call, all reversible): creator only and confirmed,
because it changes the face for every member — it belongs with rename and delete,
not with a personal preference. **A pull always changes the weave and shares at
most one layer with the previous patch.** The four layers hash from independent
bit-slices, so consecutive salts often keep one; `nextPatchSalt()` stores the
first salt meeting both conditions — about half the time that's the next integer,
otherwise it lands further on (still a plain
int, still reproducible from `crew.id` + `patchSalt`; the scan runs once, at the
tap, never at render). Measured over 50 consecutive pulls across 10 crews: worst
case 1 shared layer, 0 shared weaves. Thursdays' stored salts
run `0, 1, 3, 5, 6, 8`. No cooldown; a crew of twelve self-polices. The sheet
shows **now → new** side by side with a free *Shuffle again*, so it's a comparison
rather than a gamble. No notification — it's cosmetic, and §3.11's bar is
activity, not decoration. Salt only moves forward; no undo stack, since patch
history isn't worth a column for a decoration.

### The variant space

5 sigils × 4 weaves × 3 grounds × 5 chords = **300** distinct patches per crew.
`Crew Patch System.html` § *The variant space* shows it as two orthogonal slices
rather than 300 cells: **sigil × weave** (all 20 — the pair that decides whether
two patches are confusable) and **ground × chord** (all 15 — the pair that
decides how a patch reads), plus the counted breakdown. Any real patch is one
cell from each. Rotation is deliberately excluded from the count: it varies the
weave only and never the crest, so a rotated twill is the same patch, and
counting it would overstate how distinguishable the space is.

**Eng note:** mint `crew.id` client-side before the insert, so the create
sheet's patch preview *is* the patch you get rather than an approximation.

---

## 2 · Decisions log — the "Open for Design to call" items (§8)

All easy to flip. Flag any you want changed.

1. **Crew cap → 12.** Ten leaves no room for the two plus-ones that always show
   up; fifteen starts to read like a network. Twelve also grids cleanly (3×4 in
   the roster, 5 dots + `+7` in a cluster) and gives the invite sheet a
   spots-left number that means something. The cap is also the real backstop on
   a forwarded link (§3.6), which is why it's stated on the invite sheet and in
   the dead-link copy rather than buried.
2. **The crew picker does not go in the filter bar.** A crew isn't a filter —
   filters narrow by an attribute of the *show*, a crew narrows by *who*. So the
   lens lives in the row that already holds the page title and the LIST/CAL
   toggle: one 32px pill in a row with spare width. **Resting costs nothing and
   the filter bar is byte-for-byte what ships today.** Switching a crew on
   retitles the page to the crew's name and adds one thin, dismissible rail
   (`● CREW LENS · 4 SHOWS ──── × CLEAR`) where the location eyebrow was. The
   weight lands on the title block — the thing that *should* change when you
   change what you're looking at — and on a rail you can clear. Filters compose
   on top. Both states side by side in §4.

   **The picker itself is a deliberate departure from `filter-system.jsx`, and
   it's the same argument.** `FilterSheet` / `FilterPopover` are driven by
   `FILTER_DEFS[filterKey]`, whose options are `{value, label}` pairs describing
   an attribute of a show; putting crews in `FILTER_DEFS` would make the lens a
   filter dimension, which is exactly what this decision rejects. The rows also
   need artwork and a per-row meta line, which that API has no slot for. So the
   picker borrows the **anatomy** down to the atoms — grabber, mono label +
   title header with the round ×, the reset row first ("Everyone" standing in
   for "Any date"), 16/20 rows at 15.5px, active rows `--signal` at 700, the
   same checkmark glyph, apply-on-tap-and-dismiss — without consuming the
   component. `filter-system.jsx` is copied into the folder so the comparison is
   one file away. **Eng should extend the real components with an optional
   leading-media + meta slot rather than clone the picker.** The filter chips
   themselves are untouched.
3. **The three sections are tabs, and the lead-order call decides which one
   opens.** Stacked as bands, the roster and the shared past sat far below the
   fold on every crew — on Thursdays the roster started around 1,400px down. As
   tabs (`Coming up` / `Been there` / `Who's in`) the hero stays pinned and each
   tab carries its **count**, so the crew's shape — 4 shows, 6 nights, 6 people
   — reads before you touch anything. The counts are derived from the lists they
   summarize, never stored, so a tab can't state a number the panel below it
   contradicts.

   Which tab opens is the original lead-order judgment, unchanged: **upcoming**
   whenever it has anything at all, the **shared past** only when upcoming is
   empty. A crew with something coming up is answering "what are my people going
   to?", which is the question the feature exists for; a crew with nothing coming
   up needs a reason to be open, and that's the history. Still a deliberate
   sibling of #1357's `Concerts` (Upcoming above Past) — now as segments rather
   than stacked bands. Override with the Tweaks radio.

   Mobile and desktop both use the **shipped `ProfileSegments` pill grammar**
   from `design_handoff_in_app_notifications/notifications-chrome.jsx` (#737) —
   the existing consumer precedent for an in-page section switcher with counts,
   and a surface reached from the same `me` menu. Same radius, padding, 34px
   pill, 6px gap, Inter 12.5 at weight 700 on both states, `--surface-2` +
   `--border-strong` active. Two forced deviations, both recorded in the
   component header: the shipped `NotifPip` dot becomes a **mono numeral**
   (crews need magnitude — 4 shows vs 6 nights vs 6 people is the entire reason
   counts are on the tabs, and a dot can't carry a quantity), and the painted
   pill stays 34px inside a **44px button** so the touch target clears the
   mobile minimum. A third deviation is narrow-width only: at ≤320 the pill
   padding tightens to 9px with a 4px gap. The shipped precedent doesn't settle
   that one — `ProfileSegments` carries three short labels plus a 6px dot, while
   Crews carries "Coming up"/"Been there"/"Who's in" plus a numeral, so the row
   is intrinsically wider than the surface the grammar came from. At the shipped
   12px padding the three pills measure 312px against a 294px content box and the
   third clipped; tightening padding is the smallest fix that keeps intrinsic
   sizing, where `flex: 1` would have been a second departure from the grammar.
   The row also scrolls horizontally as a backstop, so a longer translation
   degrades to a swipe rather than a clipped pill. An earlier draft used
   full-width underline tabs; rejected because it would have put a second
   in-page tab language next to the profile
   Alerts page.

   The crew-of-one block stays **above** the tabs: it's status about the whole
   crew, not one section of it.
4. **Crew of one is a waiting room, not an empty state.** The hero renders in
   full — patch, name, "you started it" — with one inline block ("Party of one.
   / You made a crew. Now the hard part — telling people.") and an Invite CTA.
   The upcoming and past bands stay visible with their own empty copy, so the
   creator can see the shape of what's about to fill in. It is the first thing
   every creator sees, so it should look like a *place*, not like a failure.
5. **The shared past is a ticket stub.** A perforated stub end carrying the
   date, artist + venue, then the attendee cluster and count, grouped by year
   under a "9 nights together" stat. Two rejected alternatives worth recording:
   a **poster wall** would put the event/venue generative system in charge of
   what a crew's memory looks like — the exact mistake this brief is guarding
   against — and a **plain list** makes the past look like the upcoming half.
   The stub is an object you keep, it carries the count natively, and it can
   never be mistaken for a show you could still buy a ticket to. That difference
   in object type is how the tense split reads with the type turned off.
6. **Card presence differs from the rail, deliberately.** In crew view a Browse
   row gets a **count** chip (`2 GOING`) and no names; event detail gets the
   **names**. Rationale: Browse is a scanning surface, the row's meta budget is
   two chips, and names at 320 truncate to nonsense — while detail is where you
   actually decide, and "cassidy is going" is the whole reason you'd decide. The
   chip takes *priority over* `following` rather than adding a fifth pill, so the
   row keeps its anti-drift contract — and `following` stays in the list behind
   it, so a show with no crew presence still shows it (confirmed Aug 3). Both
   cases are rendered side by side in §5's `rail-card`.
7. **Invite links expire in 7 days**, and any member can retire one at any time.
   Seven days is a group chat's attention span — a link dropped on Friday still
   works next weekend, but a forwarded one dies before it reaches a stranger.
   Creator side: a mono "Expires in 7 days" line with the reason under it, a
   Retire action, and a spots-left count. Invitee side: honest dead ends, never
   a generic error.
8. **Dead links show no crew identity at all** — not the name, not the patch.
   This goes one step past §3.7: a dead link has no standing to tell you
   anything, and a *retired* one especially shouldn't confirm what it pointed
   at. Expired and retired both fall back to the Concert Crawl mark. The
   at-cap state *does* keep identity: that link was live and legitimate, the
   crew is simply full.
9. **Roster management.** Any member can invite (gatekeeping invites inside an
   invite-only group of twelve is ceremony, and the cap + revoke is the real
   control). Any member can leave. Only the creator can remove, rename, reroll,
   or delete. A creator who wants out **passes the crew on first** — explicit and
   voluntary, which is what §3.12 rejected an *involuntary* version of.
   **Approved Aug 3.**

   **When there's nobody to pass it to** (the creator is the last member), the
   handoff sheet is not shown — an empty picker is a dead end dressed as a
   choice. That state names the only real outcome instead: *"You're the last one
   in Thursdays. There's nobody to hand it to, so leaving means deleting it. The
   nights you went stay in your Concerts."* Primary action is **Delete crew**;
   the secondary is **Invite someone instead**, which is the way out of the
   state rather than a restatement of "cancel". The reassurance about Concerts is
   load-bearing — deleting a crew must not read as deleting your own history.
   Artboard `cr-last`.

### Two calls the brief didn't list but that fell out of the work

10. **Crews is a fifth bottom-nav tab** — `browse · search · watching · crews ·
    me` — and a top-level desktop nav item beside Watching. **Approved Aug 3.**
    The alternative was a row inside the `me` menu, rejected because the
    destination is half the feature and burying it contradicts shipping a Browse
    lens that points at it. Five tabs fit at 320 (64px each, mono labels at 8px).
11. **The upcoming half of crew home is date-grouped**, exactly like Browse. It
    *is* a small calendar, so it carries the date in a group header and the row
    drops it (event-row Rule 1, context subtraction) — which is also what keeps
    line 3 down to `8:00 PM · Mission Ballroom` inside a carded row at 320.

---

## 3 · Components reused, not reinvented

Per CLAUDE.md §4:

| Need | Used |
|---|---|
| **Event detail CTA block** | **`GoingCTA` + `WatchStrip`** from `design_handoff_event_detail_cta_tooltip/event-cta-v2.jsx` (R2, Direction D), rendered as-is. `EventDetailMock` no longer draws its own Going/Watch pair — see §3a. |
| **Watchers** | `WatcherCrawlLine` / `WatcherRoster` / `AvatarStack` / `UMAvatar` (+ `wr_showCrawl`'s two-named-humans floor), all untouched. |
| Empty states | **`<EmptyState variant="hybrid"/>`** from `design_handoff_empty_state/`. `CrewEmpty` is a thin forwarder that pins the variant and supplies the eyebrow. `density="dense"` inline, default where it owns the surface. `state` drives the rail code: `no-data` → `0 / 0`, `filtered` → `0 hits` (an empty crew lens *is* a filtered result), `error` → `err`. |
| Filter chips | `FilterBar`'s chip grammar from `browse-home.jsx`, unchanged. |
| In-page section tabs | **`ProfileSegments`** from `design_handoff_in_app_notifications/notifications-chrome.jsx` (#737) — pill grammar lifted for `CrewTabs`; three forced deviations recorded in §2 item 3. |
| Filter sheet / popover | **Anatomy only** — see §2 item 2 for why the API isn't consumed. |
| Logo + wordmark | `CCMark` copied verbatim as `CMark`, with the canonical `AppBar` lockup. |
| Event card | The shipped `EventRow` — see §4. |
| iOS frame · theme tokens · canvas · tweaks | `ios-frame.jsx`, `theme-context.jsx` (now the version carrying `--shadow-soft`/`--shadow-strong`), `design-canvas.jsx`, `tweaks-panel.jsx`. |
| Artist / venue imagery | `IdentityArt` — the artist hero on the event-detail mock, and *never* a crew. |

## 3a · Reconciled with the event-detail CTA pass (Aug 3)

§3.8 locked "one social rail: crew members going first, then the ambient watching
count from #762." That was written against a page where **watching was a bare
number**. It isn't any more. The CTA pass R2 found that the watcher count is a
social object and gave it `WatchStrip`: row 1 is the eye toggle, row 2 is the
crawl — avatar stack, named handles, and an "All 13" that opens a roster overlay.

So R1 of this handoff was, as of this week, **duplicating** that: its own
bordered rail restating the watcher count, with its own avatar-cluster language
beside `AvatarStack`. The fix isn't a restyle. The CTA pass had already found the
governing rule — *a status line belongs to the control it describes* — and crew
attendance and watching are different populations:

```
┌ Going ─────────────────────────────┐   ← GoingCTA        (shipped, as-is)
│ mvp_ross, natstretch + 2 more going│   ← CrewGoingLine   (this handoff)
└────────────────────────────────────┘
┌ 👁 Watch to get pinged… ───────────┐   ← WatchStrip row 1 (shipped, as-is)
│ sc_setlist_bassbin6 + 11 · All 13  │   ← WatchStrip row 2 (shipped, as-is)
└────────────────────────────────────┘
```

The watcher crawl belongs to the eye; crew attendance belongs to Going. §3.8's
intent survives intact — crew reads first, and there is now exactly **one social
statement per control** instead of two competing rails. **No count is stated
twice, and zero shipped components changed.**

Three further alignments fell out of this:

- **`CrewGoingLine` inherits `WatcherWord`'s measured ladder**, not a CSS
  ellipsis — but measured on **two different boxes**, deliberately:

  | rung | measured on | why |
  |---|---|---|
  | 2 names → 1 name → drop the "going" suffix | the **text span** | These only change text *inside* the observed box, so measuring it is safe. |
  | faces give way to the names | the **row container** | Dropping the faces removes a *sibling*, which widens the span. Measuring that on the span reproduces the exact oscillation already fixed twice in `WhenWhere` and `MetaRow` (drop faces → span widens → observer resets → faces return → …). The row's width can't be changed by what's inside it, so the gate is stable by construction. |

  Threshold is 296px, measured: stack (74) + chip (58) + gaps (18) leave 146px,
  and one handle plus a "+ N more" tail needs ~170.

  Both rulings are the CTA pass's own — names outrank the suffix, and at the
  tightest widths the faces give way to the names because the names are the
  payload. **Measured in the delivered canvas** (`rail-320`, artboard added for
  exactly this): at 320 the row is 262px, so the faces drop and the line reads
  `mvp_ross + 3 more going` — dropping the discs frees enough width that the
  "going" suffix survives, which is why that rung and the suffix rung are
  independent rather than sequential. 0 of 13 lines overflow; state identical
  across three samples.

  **The ladder drops names for width, not for privacy**, so an SR-only span
  carries the full named list plus `+N more` at every rung — the same contract as
  the row's `crewGoingSr`. Handle-less members are counted there too, never
  invented (#762).
- **Handled members use the shipped `Avatar`** (`UMAvatar` + deterministic
  per-handle tone). R1 drew its own disc for every case; the only case genuinely
  missing from the shipped primitive is the **handle-less** member — watchers are
  never anonymous-but-shown, they're counted as `anon` — so that one dashed,
  letterless disc stays local (#762).
- **`theme-context.jsx` replaced** with the version carrying `--shadow-soft` /
  `--shadow-strong`. The crews copy predated those two tokens, so `CCOverlay`
  and `CCTip` would have rendered shadowless here.

## 4 · The event card is not forked

The brief's constraint was "reuse the existing event card — the Browse lens
filters the calendar, it doesn't fork it." The row system's own eng note says
"adding a fourth surface is a config entry, not a component," so Crews takes it
at its word. The whole diff to `event-row.jsx`:

- **Two `SURFACES` config entries.** `crewLens` (Browse in crew view) and `crew`
  (crew home) — both carry `date` and set meta to
  `["crew", "following", "genre"]`.
- **One branch in `buildMeta`** for `kind === "crew"`, rendering a
  `RowMetaChip tone="signal"` with the count and an SR-only named list.

No new geometry, no fifth pill, no change to the slot contract. **`following` is
displaced, never removed** (confirmed Aug 3): with a budget of 2, a show with
crew presence spends the slot on crew, and a show without it falls back to
following exactly as Browse does — both cases are rendered side by side in
`rail-card`. That priority-not-deletion shape is what keeps the row from
re-drifting. Crew presence rides on the show shape as `crewGoing` /
`crewMembers`, in the same spirit as `saved` being Watching-only data rather than
a Watching-only row.

## 5 · Locked decisions honored

- **The lens is the discovery mechanic and the destination is the social home**
  (§3.2). The lens filters the shipped calendar; the destination carries
  identity, roster, upcoming and the shared past.
- **Tense (§3.3):** upcoming ≥1 going, past ≥2 going. Fixtures include nights
  that fail the ≥2 bar so they're visibly absent from the crew's history, and
  the empty-past copy teaches the rule at the moment it's confusing.
- **Many crews (§3.4)** — the list is the destination's front door and the
  picker is the lens's. No hidden "active crew" state: the lens is either
  visibly on and named in the title, or off.
- **Own visual system, stable seed (§3.5)** — see §1 above.
- **Invite link is the entry (§3.6)** with expiry + revoke, and the cap as the
  backstop. No people search, no directory, works on non-users.
- **The invite is an acquisition surface (§3.7)** — identity, never attendance.
  The lock line on the landing turns the constraint into the pitch.
- **One social statement per control, crew at the front (§3.8)** — the crew line
  is attached to Going and is a sibling of the shipped `WatchStrip`, never a
  shared region and never two competing rails. See §3a for why the shape changed
  and how §3.8's intent is preserved.
- **Free to join, Premium to create (§3.9)** — the gate only ever appears on
  create, and the landing CTA never routes through it.
- **No "can't go" in v1 (§3.10)** — nothing in these screens asks anyone to
  answer. The empty-upcoming copy is careful not to imply a pending RSVP.
- **Bell-only `crew.*` with per-crew mute (§3.11)** — an explicit "never becomes
  a push notification" line in the bell, mute on the row and in Settings.
- **A lapse never touches an existing crew (§3.12)** — the lapsed gate variant
  says the crews all still work, in #782's non-punitive voice, and never
  mentions a card.
- **Inherited (§7):** Watching vocabulary untouched (crews introduce no synonym
  for Watching or "my shows"); #762's don't-fake-identity drawn as the
  degradation ladder and the dashed letterless dot; the tense split reads as
  #1357's sibling; token-only across all themes.

## 6 · Out of scope (owned elsewhere — not pulled back in)

Chat/threads/comments (permanently out) · public crews and follow semantics
(permanently out) · invite-by-handle (separate follow-up) · `/u/<handle>` (#86)
· an explicit decline (deferred with §3.10) · push delivery or batching for crew
activity (deferred with §3.11) · attending signal for non-crew users (#1096) ·
a crew-scale share artifact (adjacent to #85).

## 7 · Dev / handoff notes

- **`patchSalt` is a new int column** on the crew row, default 0, incremented by
  the creator's New patch action. Nothing else may write it.
- **`crews` entitlement key is net-new.** Cell state on create is
  `paywall-on-tap` for Free/Supporter and after a lapse; `visible-active` for
  Premium/Founder/Gifted. Join is never gated at any tier.
- **Consume `attendingAt`.** Nothing here invents a second RSVP signal; the
  lens and the shared past are both derived from it plus crew membership.
- **`crew.*` notification category** must be added to the bell allowlist and
  **excluded from push**, exactly as `contest.*` is. Per-crew mute is a new
  preference row keyed by crew id.
- **Copy externalization is done at design time**, not deferred: everything
  lifts from `CREW_COPY` in `crew-copy.jsx` into `copy.crews.*` with the keys
  as written.
- **Mint `crew.id` client-side** before insert (see §1) so the create preview is
  truthful.
- **The `crew` picker and `CrewEmpty` are the two places this handoff sits
  beside a shipped component instead of inside it.** `CrewEmpty` forwards to the
  real `<EmptyState/>` and should stay a forwarder. The picker needs
  `FilterSheet` / `FilterPopover` to grow an optional leading-media + meta slot;
  until then, don't copy the picker into a third place.
- **Two bug fixes went into this folder's `event-row.jsx` copy and should go
  upstream to `design_handoff_event_row_system/`.** `WhenWhere`'s measuring
  effect had no dependency array, so it re-ran on every render while a
  `ResizeObserver` reset the ladder to level 0 — a loop that stays dormant when
  rows sit in a plain block column (the shipped canvas) and locks the main
  thread the moment they sit in a grid whose track width answers to its content
  (this canvas, ~100 rows). Fixed by bounding the effect with
  `[level, show.id, showsDate, showsVenue, size]` and by only restarting the
  ladder when the observed width *actually* changes. `MetaRow` got the same
  width guard. All grid tracks holding rows are now `minmax(0,1fr)`.
- Verified at 320 / 390 / desktop across Electric / Jade / Light. Contrast
  checked on the mono meta lines and the signal-on-surface chips; patch colour
  is decorative and exempt, but the sigil still clears 3:1 against its ground in
  all three base themes.
- The canvas is large and slow to rasterize, so a full-page screenshot may time
  out; panning and interaction are fine. Getting there took three fixes worth
  recording, because two of them are bugs in shipped code:
  **(a)** the crew weaves hand-emitted 40–52 `<line>` nodes per patch and are
  now one `<pattern>` + one `<rect>` — 107 patches cost 3,110 nodes instead of
  ~7,000, and this is the right thing to ship regardless;
  **(b)** `identity-art.jsx`'s halftone template emits `(400/cell)²` circles and
  its `tile`/`micro` cell sizes were tuned for a hero image — 43 thumbnails were
  producing **15,658 nodes**, more than the rest of the page combined. Cells are
  now per-scale (16 / 40 / 64), visually identical at 44–56px. **This one
  belongs upstream in `design_handoff_phase7_5_identity_imagery/` — every
  handoff that renders event rows is paying for it.**
  **(c)** the patch-system section moved to its own canvas.
  Net: 38,092 → 20,061 nodes, and a page that timed out on every probe now
  answers in ~6s.
- **Standing infrastructure note:** `design-canvas.jsx` mounts every artboard
  eagerly, so cost scales with total artboard count rather than what's in view.
  Worth its own ticket — it affects every handoff in this project, and it's the
  reason a thorough canvas has to budget nodes at all.
