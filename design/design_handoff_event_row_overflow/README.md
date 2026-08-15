# Row overflow — tour names, fallback titles, status, two genres

**Canvas:** `Row Overflow.html`
**Date:** Aug 14, 2026 · **R2** after eng review (§8) · **R3** two genres (§9) · **R3.2** measure-pass fix · **R3.3** bucket membership + the strike/dim ruling
**Status:** complete — eng is building it.
**Eng prompt:** `CLAUDE_CODE_PROMPT.md` in this folder.
**Extends:** `design_handoff_event_row_system/` — the slot contract, Rule 1, Rule 2, the meta budget and the narrow step are all unchanged.
**Ships at:** `density="cozy"`.

---

## Summary of decisions

| # | Question | Call |
|---|---|---|
| 1 | Tour name (8.1%) | Line 1's slack — measured, whole-unit clause. Promoted to the title slot on artist pages |
| 2 | Fallback title (16.2%) | Never on the row. No conditions. Home is event detail (queued) |
| 3 | Status (1.3%) | The price slot. `cancelled > postponed > soldout > presale > price` — fixes a live bug |
| 4 | Cancelled / postponed signals | Chip + dimmed art + **one** strike on line 3. Delete production's struck title. Strike = cancelled + postponed; dim = those two + sold out |
| 5 | Row height | `ROW_MIN` — one constant per geometry. Line 4 still collapses; the row absorbs it |
| 6 | Two genres | One chip (`FUNK/SOUL`), one budget slot. Lead = first genre that is a **member** of the picked Vibe bucket (a no-op for same-bucket acts — the pair is the fix there). Not a second chip |

**Nothing in the row system's contract changed:** four lines, Rule 1, Rule 2, the meta budget, the measured line-3 ladder, the narrow step, the action gutter.

---

## The call — there is no fifth line

20.7% of upcoming inventory (233 of 1,125 production events, 2026-08-13) carries something the four-line contract has no slot for. The three elements are three different **kinds** of thing, and the reason a single rule kept failing is that they were being treated as one problem ("extra text needs a line").

| Element | Share | Disposition |
|---|---|---|
| Tour name | 8.1% | Line 1's slack — measured, whole-unit clause |
| Fallback title | 16.2% | Off the row. No conditions — the crawler already falls the title through into `artist` |
| Status (cancelled / postponed) | 1.3% | The price slot — same door sold-out already uses |

**Row height becomes a constant of geometry, not of content** — one value per surface × density × narrow. (R1 claimed "two values, unchanged"; that was wrong, and §8 has the correction.)

### Why not a fifth line

It's the cheapest thing to build and the most expensive thing to live with: at least three unpredictable row heights on the surface whose only job is to be scannable. It also breaks Rule 2 by the back door — the budget's entire function is that *nothing gets a slot by default*, and granting a permanent line to the two lowest-value elements on the row (one of which is a decaying data artifact) is exactly the drift the row system was built to stop. Artboard `pr-naive` mounts it so it can be looked at rather than argued about.

---

## 1 · Tour name → line 1's slack

`DWLLRS · One of Those Nights Tour` — one line box. Mono, `title − 4`, `--fg-subtle`, after a dimmed `·`.

Measured on the same pattern as `WhenWhere` and `MetaRow`: the clause renders, the **title's own** overflow is measured, and the clause is dropped whole if the title is being clipped. Consequences, both intended:

- The artist never truncates to make room for a tour name.
- The tour name is never sliced or wrapped — it fits entirely or it isn't there.

No width table, one boolean. Discovery surfaces only (`browse`, `venue`, `artist`, `related`); **Watching drops it**, for the reason it drops the support billing — you saved the headliner and the price is the point.

**Honest trade-off:** the tour name becomes a wide-viewport detail. At 320 it essentially never renders; at 390 only short ones do ("A TOUR"). That is the correct priority — artist, date, venue and price all outrank it — and it's the same deal every other optional element in this row already took. Artboard `tr-ladder` shows the same three rows at 320 / 390 / 640.

### Rule 1 corollary — the artist page promotes it

An artist page carries the artist, so the row drops it: the **tour name takes the title slot** at title weight, and the artist name moves to a screen-reader span. It's the one surface where the tour name is the most distinguishing thing on the row. `following` also leaves that surface's chip priority for the same reason. No tour name → line 1 falls back to the artist, as today.

---

## 2 · Fallback title → off the row

It isn't content, it's crawl order: the pre-extraction event title, kept on rows processed before supporting-artist extraction shipped. Post-extraction the row already renders its contents — "Shwayze" on line 1, "with Claire Wright" on line 2 — so printing the original as well is the same fact three times. The set is not regenerated and only shrinks; spending a permanent line on a decaying artifact is the worst trade available.

**The rule has no conditions: `fallbackTitle` never renders on a row.** The crawler already falls the title through into `artist` when it can't resolve one, so events like "BASS BINGO" and "MAINIAK" render that string as line 1 through the normal path and `artist` stays non-null. (R1 specified a nullable `artist` and a fallback branch in the title slot — unnecessary, removed.)

**16.2 of the 20.7 points close here.** The remaining 9.4 fit inside the existing four lines.

**Where it belongs:** event detail, as a quiet `listed as "…"` line under the title — real value when someone's checking they've got the right show. One-line addition to `design_handoff_event_detail_v2`, **queued, not built in this pass.**

**What those rows do introduce** is a height case, not a title case: no Spotify match and no genre means zero chips and no line 4. That's §5.

## 3 · Status → the price slot

State is not description, and state already has a home: `soldout` short-circuits the price stack as Rule 2's one stated exemption. `cancelled` and `postponed` are the same kind of thing and take the same door — chip instead of price, **no meta-chip budget spent**, no line.

**Precedence:** `cancelled > postponed > soldout > presale > price`. Explicit, so two statuses can never both render. This **fixes a live bug**: production checks `soldout` first, so a cancelled-and-sold-out show currently reads "Sold out".

- `Cancelled` — `warn` tone (it's a loss). **The title is not struck** (production's current behaviour) — see §8.1. Three signals, one per channel: the chip states it, the dim carries it peripherally, one strike voids the claim that became false.
- `Postponed` — `strong` tone (a change, not a loss). **Same strike and same dim as cancelled** (R3.3, superseding R2 — see §10). Only the chip differs.

**The two cues are general, not per-state:** strike → cancelled + postponed; dim → cancelled + postponed + sold out. They say "something's wrong with this show"; **the chip says which problem it is.** Sold-out sharing the dim is expected, not a collision, and the cues are deliberately not split further.

Existing chip grammar, existing tones, no new objects. These two are the only elements of the three that can't be suppressed on any surface — hiding a cancellation is the one failure mode here that costs someone a night out.

---

## 4 · Files

```
design_handoff_event_row_overflow/
├── Row Overflow.html      ← open this
├── CLAUDE_CODE_PROMPT.md  ← paste to Claude Code
├── genre-pair.jsx        ← GenrePairChip, orderGenres (R3)
├── row-overflow.jsx     ← EventRowX, EventRowListX, TitleLine, PriceStackX, WhenWhereX, OVF_SURFACES, OVF_SPEC
├── overflow-data.jsx    ← the three fields, as real production samples
└── (event-row.jsx · row-data.jsx · theme-context · ios-frame · identity-art · spotify-shared · cc-tip · design-canvas · tweaks-panel)
```

`row-overflow.jsx` is a deliberate **fork of `event-row.jsx` with every change marked `▲`** — read them side by side; it's meant to be diffed, then folded back into the original component.

---

## 5 · What eng changes

| | |
|---|---|
| data | `status` gains `cancelled` · `postponed`. `tourName` and the `related` surface already exist; `fallbackTitle` simply stops being read by the row; `artist` stays non-null |
| line 1 | `TitleLine` replaces the bare anchor — measured tour clause, promoted tour name on the artist surface. **Not** struck on cancelled: delete production's struck title |
| line 3 | `WhenWhere` gains `strike` (cancelled only) — the row's one strike |
| price | `PriceStack` gains cancelled · postponed **ahead of** soldout |
| height | `ROW_MIN`: `min-height` per surface × density × narrow. Line 4 keeps collapsing; the row absorbs it. The table in `row-overflow.jsx` is a starting point — derive it from real type metrics and assert the outcome in a test |
| surfaces | `artist` added as a `SURFACES` entry; new per-surface flag `tour`; `artist` carries `"artist"` and drops `following` from its chip priority |
| **not changed** | the four-line contract · Rule 1 · Rule 2 · the meta budget · the measured line-3 ladder · the narrow step · the action gutter · price rendering and the surface-gated delta |

---

## 6 · Verification

- Section 5 mounts a mixed list in production proportions (3 of 11 rows carry one of the three elements, 2 of 11 are zero-chip rows) at 320 / 390 / desktop, on all four surfaces via the Tweaks panel. Probes under the collapsing and reserved lists measure every rendered row and report the **distinct heights** — and they re-measure when surface or density changes (R1's measured once on mount, so the reading was stale).
- Measured after the fix: **1 distinct height per list geometry** (cozy wide 110 / cozy narrow 108 / watching 92 / compact 101). The collapsing comparison reads 3 (82 / 91 / 109) on the same data.
- The rejected fifth line renders the same eleven events beside it for comparison.
- Checked across electric / jade / light.

## 7 · Open

- **`listed as "…"` on event detail** — the legacy title's new home. Not built here.
- If the crawler ever starts pulling promoter boilerplate into `tourName`, the measured clause degrades safely (it just stops rendering) — but that's a data problem to fix upstream, not a row problem.

---

## 10 · R3.3 changes (Aug 15, after eng review)

1. **"Matched genre leads" needed membership, not equality.** The Vibe filter passes one of 16 bucket labels and the API expands it server-side, so `genres.includes(activeGenre)` could never be true — the reorder silently never fired, for everyone. `orderGenres` now leads with the first genre that is a **member** of the picked bucket. §9 is corrected: the old "filter by soul" example described a filter the product doesn't offer.
   Cost flagged: the bucket map has to reach the client (shared package, or the API returns the matched sub-genre). Design has no preference; it just isn't free.
2. **The measure pass needs TWO ceilings, and that is now a stated requirement.** `MetaRowX` locked the main thread three times across R3.2–R3.3, each time differently, never with an exception — the page just died. The pass is inherently multi-render (you can't know whether a collapsed pair fits without rendering it collapsed), so it has to be a machine that provably terminates:
   - **a per-mount write budget the observer cannot reset.** The per-width episode cap alone bounds nothing, because every genuinely new width legitimately resets it — across ~90 instances that's a slow lockup waiting for the right jitter. Every write goes through one `spend()` gate that decrements a mount budget and refuses when it's gone; worst case a row keeps its last good answer.
   - **the observer never writes state synchronously** — it coalesces to one animation frame, so a burst of notifications costs one re-open rather than one each.
   Plus the original episode rules: solved-per-width, ≤3 writes per width, and the observer only re-opens on a real width change (>1px) because height churn is the collapse's own doing. Written into `row-overflow.jsx`'s header and the eng prompt: an uncapped measure/collapse pass is a page-killer, not a glitch.
   Verified across four fresh loads including a 20k-node layout sweep, forced width oscillation on all 88 rows, and 8–12s soaks.
3. **Postponed gets the strike and the dim.** Eng's ruling, and it supersedes R2's "postponed keeps its date live" — the better read is that strike and dim are general "something's wrong with this show" cues rather than per-state encodings, so sold-out sharing the dim is expected. Strike → cancelled + postponed. Dim → cancelled + postponed + sold out. The chip says which problem it is; the cues are not split further.

---

## 9 · R3 — two genres per event

**Asked for:** a second genre chip, because Masego is funk *and* soul and one genre makes him harder to find.

**Already true:** the query matches across the whole `genres[]` array (Postgres array overlap), and the data already carries both. **Masego already comes back.** The row chip was never the search index, so a second chip would not have made him more findable. The extractor caps at three genres, so cap-at-two is a live truncation — we're choosing which two, not inventing a limit.

**The defect that is real** (corrected in R3.3 — the original framing described a filter the product doesn't offer): the Vibe filter's options are **16 bucket labels**, not raw genres, and the API expands the picked bucket into its sub-genre set server-side. So under a bucket filter **no genre on the row is ever equal to the filter label.** Masego is `["funk","soul"]`, both inside the `jazz` bucket; there is no "soul" to pick. The row renders `genres[0]` and comes back labelled `FUNK` under a jazz filter — and the reorder could never confirm a match for *anyone* by string equality.

**Shipping: one chip, two genres, filter-aware order.**

- `FUNK/SOUL` — one object, **one budget slot**, both genres visible. Dimmed `/` at 45% so it reads as one label.
- Under an active Vibe filter, the lead is the first genre that is a **member of the picked bucket** — not one equal to it. `jazz` → `[jazz, funk, soul, r&b, fusion]`, so `["hip-hop","soul"]` leads `SOUL`.
- **The reorder is a no-op whenever the primary genre is already a member of the picked bucket** — including Masego, the act this request came from (funk and soul are both jazz-bucket members, so nothing moves). Buckets are wide, so that is the common case, and it is not a shortfall: under a jazz filter `FUNK/SOUL` confirms the match on its own. **The pair confirms the match; the reorder stops the pair from confirming the wrong thing** on cross-bucket acts, where `["hip-hop","soul"]` would otherwise render `HIP-HOP` and read as a mis-hit. Stated because "matched genre leads" oversells a line most rows never exercise.
- **Cap two.** A third never renders — the pair is an identity ("a funk/soul act"), not a tag list.
- **No data or query change.** `genres[]` and the overlap match already support it; nothing to migrate.
- **But the membership lookup is not free.** The taxonomy lives in `apps/api/src/lib/genre-buckets.ts` and the web app only sees the bare `filterVibe` string, so eng either lifts the map into a shared package or has the API return which sub-genre matched. **Design has no preference between those two** — flagging so it isn't costed as a one-line change. Until the seam exists the chip falls back to primary-genre order: no reorder, never a *wrong* reorder.
- `VIBE_BUCKETS` in `genre-pair.jsx` is a mock stand-in for the demo only. Eng owns the real map.

**Why not two chips.** Rule 2's budget is two, dropping to one when a support line is present. A second genre chip spends the whole budget on one fact: Browse loses `Following` outright, and a row with supports can only ever show half its genre — exactly the case (a hybrid act on a mixed bill) the request is about. Two adjacent neutral chips also read as tag soup, the drift Rule 2 exists to stop. The pair costs ~34px; a second chip costs a slot.

**One deliberate deviation, and the meta line owns it.** `MetaRow` drops whole chips that don't fit, so a wider pair chip would be dropped entirely at 320 and the row would show *no* genre — worse than today. `MetaRowX` adds one step to the existing pass: when the set overflows it asks the pair to **collapse to its leading genre first**, re-measures, and only then starts dropping chips. The dropped genre moves to a screen-reader span.

It's width, not a breakpoint: a pair sharing the meta line with a `Following` chip gives up its second genre earlier than a pair that has the line to itself (Masego collapses at 390, Cassandra Jenkins keeps `FOLK/INDIE` there). Measured, so no one maintains a table of which combination fits where.

The chip cannot make this call itself — worth recording, because the first cut tried: `MetaRow` wraps every child in a content-sized span, so a chip looking at its parent sees a box that never overflows, and by the time the fit pass has taken the chip out of flow the container isn't overflowing either. The chip can't see the pressure that is about to delete it. Hence one measuring system, in the component that already owns "what fits".

Called out because "drop whole units" is load-bearing: the unit is the chip, the chip survives, and what degrades is its contents — the same way line 3 shortens the date before it drops the venue.

Canvas §6 (`gn-pair`, `gn-why`, `gn-narrow`); code in `genre-pair.jsx`. Set the vibe filter in the Tweaks panel to see the reorder.

---

## 8 · R2 changes (Aug 14, after eng review)

1. **Cancelled carries three signals, one per channel — and the title is not one of them.** Production strikes the title and leaves the date; R1 here struck the date and left the title. Adopting both would have given a cancelled row four signals (chip, struck title, struck date·time, dimmed art). Ruling: **chip + dimmed artwork + one strike, on line 3.** A strike voids a claim that became false — the show's date and place stopped being true, the artist's name didn't. Line 1 is also the wrong host three times over: struck link text at 15.5px reads as *deleted* rather than cancelled; it collides with the ellipsis and the tour clause; and on the artist surface the title slot holds the **tour name**, so the production rule would strike "Dreamstate Tour" while the artist name is invisible. **Production's struck title gets deleted, not kept alongside.** Artboard `st-signals` mounts all three treatments.
2. **The two-height baseline was false, so height is now reserved.** `MetaRow` already returns nothing when a row has no chips, so line 4 collapses and Browse heights already varied — worst on exactly the fallback population (no Spotify match → no `following`, no `genre` → zero chips). R1's fixtures hid this by giving BASS BINGO a genre production won't have; the fixtures are corrected. Collapsing line 4 stays right (an empty chip line is a hole); what changes is that the **row** reserves its height via `ROW_MIN`, with the existing `align-items: center` distributing the slack, so a sparse row is optically centred rather than sitting above a gap. **One constant per geometry** — better than the two claimed, and one per outcome for the virtualiser. Cost: ~20–27px of air on the sparsest rows. It doesn't weaken the case against a fifth line: a fifth line raises the constant for 100% of rows to serve 8%, and adds a second string to the title's hierarchy.
3. **Height probe re-measures** on surface and density change.
4. **Eng's corrections folded in:** the field is `fallbackTitle`; `tourName` and the `related` surface already exist; `artist` stays non-null (which simplifies §2 to an unconditional rule); the tour-clause `ResizeObserver` moved off the element it measures (it now observes the title column, not the measured node) — same fix applied to `WhenWhereX`.
5. **Cancelled ahead of soldout** documented as a live bug fix, with a fixture (`bothstates`) that is both.
