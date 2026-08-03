# Event row system — design handoff

**Canvas:** `Event Row System.html`
**Date:** Aug 3, 2026
**Supersedes:** `design_handoff_browse_row_right_column/` — see §7.
**R2 note (Aug 3):** five gaps closed after eng review — see §8. The slot contract, meta budget, context-subtraction rule, eye removal from Browse, and gutter collapse are unchanged.
**R3 note (Aug 3):** provenance aligned to production's `source_category` enum, plus doc-sync — see §9.

**Replaces in code:** the Browse/Venue event row and `WatchingItem` (`design_handoff_watching/watching-screens.jsx`).
**Eng prompt:** `CLAUDE_CODE_PROMPT.md` in this folder.
**Ships at:** `density="cozy"`.

---

## 1 · The problem

Same show, same venue, two components that don't know the other exists:

| | Browse | Watching |
|---|---|---|
| Price | `from $68` pill, neutral | `$68` bare, success green |
| Provenance | — | `COMMUNITY` outline pill |
| Freshness | — | `STALE · 9D AGO` pill |
| Action | eye toggle | remove `⨯` |
| Truncates | artist first | **date first** ⚠ |
| Supports | own line | — |

Watching truncating the date away — “Mission Ballroom · Sat…” — is the sharpest symptom. The date is the most useful thing on the row.

The clutter isn't any one feature. It's that every feature we shipped got its own pill, in its own shape, and nothing ever had to earn the space against anything else.

## 2 · The fix — a slot contract, not a restyle

```
┌────┬──────────────────────────────┬──────────┬────┐
│art │ line 1  artist               │  price   │ ⨯  │
│    │ line 2  with support · act   │  delta   │    │
│    │ line 3  when · where         │          │    │
│    │ line 4  meta (budget)        │          │    │
└────┴──────────────────────────────┴──────────┴────┘
```

### Rule 1 — context subtraction

The row never repeats what its surrounding context already says. The surface declares what it carries; the row drops it.

| Surface | Carries | Line 3 renders |
|---|---|---|
| Browse | date group headers | `7:00 PM · Mission Ballroom` |
| Watching | loose windows | `Sat, Oct 3 · 7:00 PM · Mission Ballroom` |
| Venue | the venue | `Sat, Oct 3 · 7:00 PM` |

**Date and time are `flex-shrink: 0`. The venue is the only thing on that line allowed to ellipsis.** Artist truncates before anything else. Nothing on this line is ever *sliced* — under real pressure whole units drop, in the order below, and the date is the last thing standing.

**Line 3 is measured**, like `MetaRow` — it drops whole units rather than letting anything cross a clip edge:

| level | renders | note |
|---|---|---|
| 0 | full date · time · venue | venue ellipsises under pressure |
| 1 | **short** date · time · venue | "Sat, Aug 15" → "Aug 15" |
| 2 | short date · time | venue **and its separator** drop as one unit |
| 3 | short date | time drops — in a saved list the date outranks it |

Level 3 is a guarantee, not a plan: measured, it doesn't fire at any shipping geometry. The level comes from **measurement, not a caller flag** — an earlier version derived the short date from `narrow`, which the 390 Watching list didn't pass, so it clipped.

### Rule 2 — the meta budget

Two chips, **dropping to one when a support line is present**, so a row never exceeds four lines. Priority-ordered per surface; everything past the budget is dropped, never wrapped.

The row also **measures** and drops whole chips that don't fit the available width — `MetaRow` observes its own box and takes overflowing chips out of flow. Chips are never sliced mid-glyph and never wrap. At 320 a Browse row fits one chip; at 390 it fits two.

| Surface | Priority |
|---|---|
| Browse / Venue | `following → genre` |
| Watching | `freshness → provenance` |

**Nothing gets a slot by default.** A new feature has to displace something or it doesn't ship to the row. That's the rule that keeps this from re-drifting.

### Provenance vocabulary

The provenance chip reads production's `source_category` enum (migration 0040) directly, using the labels admin already renders — so a price reads the same in review as it does on the row. R2 shipped a binary `resale ? "Resale" : "Community"`, which would have labelled a box-office price as fan-submitted.

| `price.source` | Chip | Tone | Means |
|---|---|---|---|
| `primary` | *(none)* | — | Crawled from the venue's own page. Not a submission — the absence of a chip is the signal. |
| `boxoffice` | `Box office` | `strong` | Face value, from the venue. The most authoritative submission. |
| `standard` | `Community` | `signal` | General community submission. |
| `resale` | `Resale` | `warn` | Secondary market. Not face value. |

`Box office` is the widest label at **~81px** against the tightest measured meta column (**106px**), so it fits with headroom and the chip's `nowrap` keeps the space from breaking.

**Known consequence, called out deliberately:** freshness outranks provenance, and `Stale · 9d ago` alone fills the meta column at 320. So on a narrow Watching row a stale box-office price shows the staleness and drops the provenance. That's Rule 2 working as designed — but if box office should outrank staleness, that's a priority-order change, not a width one.

### One chip grammar

Same size, radius, mono uppercase, letter-spacing. **Tone is the only variable** — `neutral · strong · warn · signal`. Following, genre, stale, provenance, sold-out are all the same object now.

### Support billing

`with hellocentral · Jaguar Stevens` — discovery surfaces only. Watching drops it: you saved the headliner and the price is the point. That's what frees Watching's budget for freshness + provenance.

### Right column

Price rendering is **identical everywhere** — `from $` only when the amount is a floor. **The delta renders on Watching and nowhere else** (a surface gate, not a data one: several Browse fixtures carry a `saved` price, and a Browse price must never go green). `--success` therefore appears only where you're being shown a change against a price *you* saved.

The action gutter is 36px and exists **only on surfaces that have an action**. An earlier draft reserved it everywhere for cross-surface edge alignment; at 320 that spent 36 of ~116 remaining px on an empty box and collapsed the title column to 80px. Nobody sees two surfaces at once — price edges align *within* a surface, which is what actually reads.

### Narrow (≤360)

`narrow` shrinks art 56→44, gap 14→10, title 15.5→14.5, price min-width 78→56. Without it the fixed columns ate 212 of 292px and every line truncated at once. Measured at 320: title column **172px**, only the artist ellipsis-truncates.

### Watching state is not a row object

On Watching every row is watched — showing it is noise. On Browse/Venue it's an accent tick on the identity art: no slot, no width, no fifth pill. **This resolves the eye-vs-chip question by making it moot,** and settles the Spotify Sync R1 conflict in R1's favor — no interactive watch control on Browse rows.

### Rule 2's one exemption — sold out

`status === "soldout"` short-circuits the price slot: it renders the Sold out chip instead of price + delta, and it spends **no** meta-chip budget. That's a deliberate exemption from Rule 2, called out here so it isn't mistaken for a chip that happens to win the budget — Rule 2 is what does the anti-drift work, and an unstated exception erodes it.

Sold-out also **dims the artwork, not the row**. R1 put `opacity: 0.78` on the whole row, which quietly pushed `--fg-muted` text toward the AA floor. State is carried by the chip; never by contrast alone.

## 3 · What stays different

Watching rows stay **carded**; Browse/Venue stay **divided**. That's a reading-mode difference (a utility list you manage vs. a feed you scan), not a component difference — same `EventRow`, `carded` prop.

## 4 · Files

```
design_handoff_event_row_system/
├── Event Row System.html   ← open this
├── event-row.jsx           ← EventRow, EventRowList, SURFACES, RowMetaChip, PriceStack, ROW_SPEC
├── row-data.jsx            ← one show shape for every surface
└── (theme-context · ios-frame · identity-art · spotify-shared · cc-tip · design-canvas · tweaks-panel)
```

## 5 · Data change

The drift started in the data — Browse carried `price` as a display string (`"from $68"`), Watching carried `savedPrice`/`currentPrice`/`sourceKind`/`observedAt`. One shape now:

```
price: { amount, isFloor, source, observedAt } | null
saved: { at, price } | null          // Watching only
supports: string[]
status: "live" | "soldout" | "presale"
```

No display copy in the data. `"from"`, `"$"`, `"Stale · 9d ago"` are all row-side formatting.

## 6 · Eng notes

- `EventRow` takes `surface="browse"|"watching"|"venue"` and reads everything else from `SURFACES`. Adding a fourth surface is a config entry, not a component.
- **`cozy` is the shipping density.** `compact` and `roomy` are preserved from `WatchingItem` and stay supported, but cozy is the default everywhere. `narrow` is orthogonal — pass it under 360px.
- `MetaRow` uses a `ResizeObserver`; overflowing chips stay mounted but out of flow (`visibility:hidden`, `aria-hidden`) so the measure pass is stable.
- Artist line-height is 1.35 so accented capitals and descenders ("Gutiérrez", "Holdfast.") don't clip inside the ellipsis box.
- `⨯` touch target is 44×44 past a 28px paint box.
- Verified at 320 / 390 / desktop across electric / jade / light.
- Watching's group headers (`Tonight` / `This week` / month names) are **unchanged** and stay in `design_handoff_watching`. `EventRowList` groups by date or not at all — R1's `groupBy="window"` branch invented "Price dropped"/"Upcoming" headers that contradicted this, and has been removed.

## 8 · R2 changes (Aug 3, after eng review)

1. **Line 3 now measures and drops whole units** (see §2). The first attempt at this only added `overflow: hidden`, which converted an overlap bug into a truncation bug on the one thing the contract protects: the venue was the only shrinkable child, so once it collapsed to zero there was nothing left to absorb pressure and the surplus pushed the **time** past the clip edge, leaving a dangling separator behind it. Fixed properly by making the ladder explicit and by widening the budget — **price min-width at narrow is 56, not 62**, because the level-2 floor measured 103px against a 100px column and three pixels short is still short.

   New artboard `st-tight` mounts the real tightest combination — `EventRowList`, `surface="watching"`, `narrow`, inside the 320 PhoneStage — which the earlier truncation artboard dodged by rendering a bare uncarded `EventRow` at ~328px.

   **Verified: 0 of 46 when·where lines overflow their column, and nothing crosses the clip boundary.** Tightest measures 106px content in a 106px box.
2. **Delta gating prose corrected** to match the code's surface gate, here and in `CLAUDE_CODE_PROMPT.md`.
3. **Native `title=` tooltips removed** from the meta chip, the delta and the watch tick — house rule, and this project ships `cc-tip.jsx` for real explainers. Context that the visible text doesn't carry now lives in screen-reader-only spans (`SR_ONLY`): the delta announces "down from $61 when you saved", the provenance chip announces "submitted by a fan". The **watch tick is a `role="img"` with `aria-label="You're watching this show"`** — a real accessible affordance, not a hover-only one. It stays a 12px mark by design; a per-row tooltip is the noise this pass removed.
4. **The row is no longer click-only-on-a-div.** `onOpen` is gone; the artist name is a real anchor — keyboard reachable, right-clickable, and it avoids nesting an interactive inside another interactive (the Watching ⨯ shares the row). Eng should add a stretched-link `::after` on the anchor to make the whole row clickable; that needs a real stylesheet, so the mock doesn't fake it inline.
5. **Sold-out documented** as Rule 2's one exemption, and its dimming moved off the row's text (see §2).

Nits also closed: `show.genres[0]` guarded; the header comment in `event-row.jsx` now documents the narrow title/meta shrink; `groupBy="window"` removed.

**Verification scope.** The canvas exercises 320 / 390 / desktop for Browse and Venue, and 320 + desktop for Watching including the carded narrow floor. All 46 rendered rows were measured for line-3 overflow; none clip. Contrast was re-checked after removing the row-level opacity; the remaining sold-out dimming applies to artwork only.

## 9 · R3 changes (Aug 3, provenance alignment)

Audit found the provenance chip was the one place the row still carried its own vocabulary. R2's `buildMeta` was a binary `resale ? "Resale" : "Community"` over a design-local `primary | community | resale`, while production has shipped `source_category` as `boxoffice | standard | resale` since migration 0040 — and admin already renders all three. A box-office price would have been labelled "Community," claiming a fan submitted a venue-authoritative price.

- Provenance now reads from a `PROVENANCE` lookup keyed to the production enum (see §2). `community` → `standard` in the fixtures; `boxoffice` added with the `strong` tone; Cassandra Jenkins carries it so the label renders on canvas.
- `primary` stays a legitimate fourth value — a crawled price is not a submission and has no `source_category`. It renders no chip, as before.
- Width verified rather than assumed: `Box office` is ~81px against a 106px column.

Doc-sync in the same pass: `price min 78→62` corrected to `78→56` in `README` §5, `CLAUDE_CODE_PROMPT.md`, and the `event-row.jsx` header (R2 changed the value in code and §8 but left three references behind); the narrow Browse title measurement follows from 62→56, so **166px → 172px**; §2's "date and time are `flex-shrink: 0`" now points at the drop ladder so it isn't read as absolute.

## 7 · Relationship to the Browse row pass

`design_handoff_browse_row_right_column/` is **shelved, not shipped**. It was solving the wrong layer — eye vs. chip inside a row that was already overloaded. Two things from it survive here: the fixed right-column geometry, and the ruling that the interactive eye leaves Browse rows. Don't build from that folder.
