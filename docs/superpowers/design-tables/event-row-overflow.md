# Design table — Event Row Overflow (tour name · fallback title · lifecycle status · genre pair · ROW_MIN)

**Source handoff:** `design/design_handoff_event_row_overflow/`
**Round:** R3.3 · **Readiness verdict:** 🟢 Green (READINESS.md:3)
**Prerequisite handoff:** `design_handoff_event_row_system/` — four-line contract, Rule 1, Rule 2, meta budget, line-3 ladder, narrow step, action gutter. **Unchanged here.**
**Ships at:** `density="cozy"` (README.md:8)

This is the ENUMERATION half of the design-review gate. It is derived from the handoff only — no application source was read. Every row cites the prototype file and line it comes from.

Citation shorthand:

- `RO` = `row-overflow.jsx`
- `ER` = `event-row.jsx` (the unchanged base component, forked by `RO`)
- `GP` = `genre-pair.jsx`
- `OD` = `overflow-data.jsx`
- `RD` = `row-data.jsx`
- `RM` = `README.md`
- `CP` = `CLAUDE_CODE_PROMPT.md`
- `RDY` = `READINESS.md`

---

## 1 · Element inventory

### 1.1 Row-level structure (context, mostly unchanged)

| #   | Element                  | Line / slot   | New / moved / deleted / unchanged           | Citation   |
| --- | ------------------------ | ------------- | ------------------------------------------- | ---------- |
| 1   | Row grid container       | whole row     | **Changed** — gains `minHeight` (ROW_MIN)   | RO:398-405 |
| 2   | Identity art tile        | col 1         | Unchanged shape; **dim condition widened**  | RO:406-409 |
| 3   | Watching corner tick     | on art, col 1 | Unchanged                                   | RO:410-415 |
| 4   | Title column (flex col)  | col 2         | Unchanged wrapper                           | RO:418     |
| 5   | Price/status column      | col 3         | Unchanged wrapper; contents gain 2 statuses | RO:434-436 |
| 6   | Action gutter (⨯ remove) | col 4         | Unchanged (36px, watching only)             | RO:438-451 |

### 1.2 Line 1 — the title line

| #   | Element                                               | Line                                   | New / moved / deleted                                                  | Citation                                                                                      |
| --- | ----------------------------------------------------- | -------------------------------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| 7   | `TitleLine` component                                 | line 1                                 | **New** — replaces the bare anchor `div`                               | RO:131-172; RM:114 ("`TitleLine` replaces the bare anchor")                                   |
| 8   | Title text (artist name) anchor                       | line 1                                 | Unchanged rendering; **no longer struck on cancelled**                 | RO:161; RM:84; CP:93-96                                                                       |
| 9   | Struck title on cancelled                             | line 1                                 | **DELETED** — production's struck title is removed, not kept alongside | RM:84 ("Delete production's struck title"); CP:96 ("Do not ship both behaviours"); RO:159-160 |
| 10  | Tour-name clause                                      | line 1, after the title, same line box | **New (moved in from above the row)**                                  | RO:164-169; RM:47                                                                             |
| 11  | Dimmed `·` separator before the clause                | line 1                                 | **New**                                                                | RO:168                                                                                        |
| 12  | Promoted tour name in the title slot (artist surface) | line 1                                 | **New**                                                                | RO:136; RM:60; CP:57-62                                                                       |
| 13  | SR-only artist name after promoted tour name          | line 1 (SR only)                       | **New**                                                                | RO:162                                                                                        |
| 14  | `fallbackTitle` rendering                             | (was its own element)                  | **DELETED from the row entirely, no conditions**                       | RM:68; CP:64-77; RO:8-16                                                                      |

### 1.3 Line 2 — support billing

| #   | Element                       | Line   | New / moved / deleted | Citation |
| --- | ----------------------------- | ------ | --------------------- | -------- |
| 15  | `with` label                  | line 2 | Unchanged             | RO:426   |
| 16  | Supports list (`join(" · ")`) | line 2 | Unchanged             | RO:427   |

### 1.4 Line 3 — when · where

| #   | Element                                  | Line   | New / moved / deleted                                 | Citation                  |
| --- | ---------------------------------------- | ------ | ----------------------------------------------------- | ------------------------- |
| 17  | `WhenWhereX` component                   | line 3 | **Changed** — `WhenWhere` + a new `strike` prop       | RO:198-234; RM:115        |
| 18  | Date text (`dateLabel`, level-dependent) | line 3 | Unchanged text; **gains strike styling**              | RO:227                    |
| 19  | `·` separator between date and time      | line 3 | Unchanged; **gains strike styling**                   | RO:228                    |
| 20  | Show time                                | line 3 | Unchanged; **gains strike styling**                   | RO:229                    |
| 21  | `·` separator before venue               | line 3 | Unchanged; **NOT struck**                             | RO:230                    |
| 22  | Venue name                               | line 3 | Unchanged; **NOT struck** ("the venue is left alone") | RO:230; RO:195-197; CP:88 |

### 1.5 Line 4 — meta chips

| #   | Element                                | Line                         | New / moved / deleted                                                | Citation                  |
| --- | -------------------------------------- | ---------------------------- | -------------------------------------------------------------------- | ------------------------- |
| 23  | `MetaRowX`                             | line 4                       | **Changed** — adds the pair-collapse step + two termination ceilings | RO:284-367                |
| 24  | `Following` chip                       | line 4                       | Unchanged                                                            | RO:108                    |
| 25  | Genre chip → **`GenrePairChip`**       | line 4                       | **Changed** — single genre chip becomes a pair chip                  | RO:110; GP:126-135        |
| 26  | Genre `/` separator glyph              | line 4, inside the pair chip | **New**                                                              | GP:132                    |
| 27  | Second genre text                      | line 4, inside the pair chip | **New**                                                              | GP:132                    |
| 28  | SR-only dropped-genre span             | line 4 (SR only)             | **New**                                                              | GP:131                    |
| 29  | `Stale · {relTime}` chip               | line 4                       | Unchanged                                                            | RO:112                    |
| 30  | `Resale` / `Community` provenance chip | line 4                       | Unchanged (copy corrected to shipped form)                           | RO:115-116; RDY:118-124   |
| 31  | Line 4 itself when zero chips          | line 4                       | Unchanged — **still collapses entirely**                             | RO:431; RM:20; CP:112-114 |

### 1.6 Price slot

| #   | Element                           | Slot       | New / moved / deleted                                         | Citation           |
| --- | --------------------------------- | ---------- | ------------------------------------------------------------- | ------------------ |
| 32  | `PriceStackX` wrapper             | price slot | **New** — wraps `PriceStack` with two new precedence branches | RO:179-192         |
| 33  | `Cancelled` chip                  | price slot | **New (moved in from outside the row)**                       | RO:185-187         |
| 34  | `Postponed` chip                  | price slot | **New (moved in from outside the row)**                       | RO:188-190         |
| 35  | `Sold out` chip                   | price slot | Unchanged, but now **third** in precedence                    | ER:140-142; RO:191 |
| 36  | Presale `—` + `presale` label     | price slot | Unchanged                                                     | ER:143-149         |
| 37  | `tba` (no price)                  | price slot | Unchanged                                                     | ER:151-153         |
| 38  | Price amount + `from` prefix      | price slot | Unchanged                                                     | ER:155-166         |
| 39  | Delta (drop/spike/flat) + SR span | price slot | Unchanged                                                     | ER:167-178         |

### 1.7 Configuration objects

| #   | Element                             | New / changed                                    | Citation           |
| --- | ----------------------------------- | ------------------------------------------------ | ------------------ |
| 40  | `OVF_SURFACES` — surface table      | **Changed** — adds `tour` flag to every surface  | RO:77-85           |
| 41  | `artist` surface entry              | **New surface**                                  | RO:83; RDY:146-152 |
| 42  | `related` surface entry             | Pre-existing in production; present in prototype | RO:84; RM:113      |
| 43  | `ROW_MIN` table                     | **New constant**                                 | RO:92-96           |
| 44  | `orderGenres()`                     | **New**                                          | GP:113-122         |
| 45  | `VIBE_BUCKETS` mock taxonomy        | **New (mock only — eng owns the real map)**      | GP:102-108; RM:166 |
| 46  | `META_MAX_STEPS` / `META_MAX_TOTAL` | **New**                                          | RO:280-282         |

---

## 2 · Property table

One row per individually-checkable property.

### 2.1 Row container

| #   | Element | Property            | Value                                                            | Citation           |
| --- | ------- | ------------------- | ---------------------------------------------------------------- | ------------------ |
| P1  | Row     | display             | `grid`                                                           | RO:399             |
| P2  | Row     | gridTemplateColumns | `{art}px minmax(0,1fr) auto[ {gutter}px]`                        | RO:399             |
| P3  | Row     | gap                 | `s.gap` (cozy wide 14 / narrow 10 / compact 12 / roomy 16)       | RO:400, RO:372-375 |
| P4  | Row     | alignItems          | `center` (distributes ROW_MIN slack)                             | RO:400; CP:115-116 |
| P5  | Row     | **minHeight**       | `ROW_MIN[density][narrow?'narrow':'wide'][cfg.supports ? 4 : 3]` | RO:395, RO:400     |
| P6  | Row     | padding (carded)    | `{py}px {gutter?8:12}px {py}px {narrow?10:14}px`                 | RO:401             |
| P7  | Row     | padding (uncarded)  | `{py}px 0`                                                       | RO:401             |
| P8  | Row     | background          | carded `var(--surface-1)`, else `transparent`                    | RO:402             |
| P9  | Row     | border              | carded `1px solid var(--border)`, else `none`                    | RO:403             |
| P10 | Row     | borderRadius        | carded `12`, else `0`                                            | RO:404             |
| P11 | Row     | fontFamily          | `Inter, system-ui, sans-serif` (`OX_UI`)                         | RO:69, RO:404      |
| P12 | Row     | data attribute      | `data-screen-label="row-{show.id}"`                              | RO:398             |

### 2.2 Density / narrow scale (unchanged from base, restated because ROW_MIN depends on it)

| #   | Token            | compact                                                         | cozy          | roomy | Citation   |
| --- | ---------------- | --------------------------------------------------------------- | ------------- | ----- | ---------- |
| P13 | art              | 44                                                              | 56            | 64    | RO:372-374 |
| P14 | py               | 10                                                              | 13            | 17    | RO:372-374 |
| P15 | gap              | 12                                                              | 14            | 16    | RO:372-374 |
| P16 | title fontSize   | 14                                                              | 15.5          | 17    | RO:372-374 |
| P17 | meta fontSize    | 11                                                              | 11.5          | 12    | RO:372-374 |
| P18 | price fontSize   | 15                                                              | 16.5          | 18    | RO:372-374 |
| P19 | narrow override  | art `min(art,44)`, gap `10`, title `min(title,14.5)`, meta `11` | —             | —     | RO:375     |
| P20 | priceMin         | narrow `56`, wide `78`                                          | —             | —     | RO:376     |
| P21 | gutter           | `36` when `cfg.action`, else `0`                                | —             | —     | RO:377     |
| P22 | narrow threshold | ≤360px                                                          | ER:46; CP:210 |

### 2.3 ROW_MIN table (starting point — eng must DERIVE, not copy)

| #   | density         | narrow?                                                                                                   | supports (4-line)            | no-supports (3-line) | Citation |
| --- | --------------- | --------------------------------------------------------------------------------------------------------- | ---------------------------- | -------------------- | -------- |
| P23 | compact         | wide                                                                                                      | 101                          | 85                   | RO:93    |
| P24 | compact         | narrow                                                                                                    | 101                          | 85                   | RO:93    |
| P25 | cozy            | wide                                                                                                      | 110                          | 92                   | RO:94    |
| P26 | cozy            | narrow                                                                                                    | 108                          | 91                   | RO:94    |
| P27 | roomy           | wide                                                                                                      | 121                          | 103                  | RO:95    |
| P28 | roomy           | narrow                                                                                                    | 116                          | 99                   | RO:95    |
| P29 | Key semantics   | keyed by how many lines the **SURFACE** can ever show (`cfg.supports ? 4 : 3`), NOT what this row carries | RO:87-91, RO:395             |
| P30 | Derivation rule | derive from real type metrics; assert distinct-height set == 1 in a test                                  | RO:90-91; CP:120-122; RM:117 |
| P31 | Escape hatch    | `fixedHeight={false}` exists only for the canvas comparison; production always ships it on                | RO:392-395                   |
| P32 | Accepted cost   | ~20–27px of air on the sparsest rows                                                                      | RM:185; CP:123               |

### 2.4 Identity art

| #   | Element           | Property      | Value                                                                             | Citation   |
| --- | ----------------- | ------------- | --------------------------------------------------------------------------------- | ---------- |
| P33 | Art wrapper       | width/height  | `s.art`                                                                           | RO:406     |
| P34 | Art wrapper       | flexShrink    | 0                                                                                 | RO:406     |
| P35 | Art inner         | borderRadius  | 8                                                                                 | RO:407     |
| P36 | Art inner         | overflow      | hidden                                                                            | RO:407     |
| P37 | Art inner         | **opacity**   | `dimArt ? 0.55 : 1`                                                               | RO:407     |
| P38 | Art inner         | dim condition | `cancelled \|\| postponed \|\| soldout`                                           | RO:390-391 |
| P39 | IdentityArt props | —             | `name={show.artist} kind="artist" scale="tile" showInitials={false} grain={0.05}` | RO:408     |

### 2.5 Watching tick

| #   | Property          | Value                                     | Citation |
| --- | ----------------- | ----------------------------------------- | -------- |
| P40 | position          | absolute, top `-3`, right `-3`            | RO:412   |
| P41 | size              | 12 × 12                                   | RO:412   |
| P42 | borderRadius      | 999                                       | RO:412   |
| P43 | background        | `var(--accent)`                           | RO:413   |
| P44 | border            | `2px solid var(--bg)`                     | RO:413   |
| P45 | role / aria-label | `img` / `You're watching this show`       | RO:411   |
| P46 | condition         | `surface !== "watching" && show.watching` | RO:384   |

### 2.6 Title column

| #   | Property     | Value                                                   | Citation |
| --- | ------------ | ------------------------------------------------------- | -------- |
| P47 | Title column | display flex, flexDirection column, gap `3`, minWidth 0 | RO:418   |

### 2.7 `TitleLine` — outer box

| #   | Property             | Value                                                      | Citation           |
| --- | -------------------- | ---------------------------------------------------------- | ------------------ |
| P48 | display              | flex                                                       | RO:154             |
| P49 | alignItems           | `baseline`                                                 | RO:154             |
| P50 | gap (title ↔ clause) | **7**                                                      | RO:154             |
| P51 | minWidth             | 0                                                          | RO:154             |
| P52 | ref role             | `boxRef` — this is the element the ResizeObserver observes | RO:154, RO:145-151 |

### 2.8 `TitleLine` — title text

| #   | Property                     | Value                                          | Citation          |
| --- | ---------------------------- | ---------------------------------------------- | ----------------- |
| P53 | fontWeight                   | 700                                            | RO:156            |
| P54 | fontSize                     | `size` = `s.title` (cozy wide 15.5)            | RO:156, RO:419    |
| P55 | letterSpacing                | `-0.01em`                                      | RO:156            |
| P56 | color                        | `var(--fg)`                                    | RO:156            |
| P57 | lineHeight                   | 1.35                                           | RO:157            |
| P58 | whiteSpace                   | nowrap                                         | RO:157            |
| P59 | overflow                     | hidden                                         | RO:157            |
| P60 | textOverflow                 | ellipsis                                       | RO:157            |
| P61 | minWidth                     | 0                                              | RO:156            |
| P62 | anchor color                 | `inherit`                                      | RO:161            |
| P63 | anchor textDecoration        | `none` (link styling, **not** a strike ruling) | RO:161, RO:160    |
| P64 | anchor href                  | `href \|\| "#show-{id}"`                       | RO:161            |
| P65 | text-decoration on cancelled | **none — explicitly not struck**               | RO:159-160; CP:93 |

### 2.9 `TitleLine` — tour clause

| #   | Property         | Value                                                   | Citation      |
| --- | ---------------- | ------------------------------------------------------- | ------------- |
| P66 | flexShrink       | 0                                                       | RO:166        |
| P67 | fontFamily       | `'JetBrains Mono', ui-monospace, monospace` (`OX_MONO`) | RO:70, RO:166 |
| P68 | fontSize         | **`size - 4`** (cozy wide → 11.5)                       | RO:166; CP:39 |
| P69 | fontWeight       | 500                                                     | RO:166        |
| P70 | letterSpacing    | `0.01em`                                                | RO:167        |
| P71 | color            | `var(--fg-subtle)`                                      | RO:167        |
| P72 | whiteSpace       | nowrap                                                  | RO:167        |
| P73 | lineHeight       | 1.35                                                    | RO:167        |
| P74 | render condition | `clause && fits`                                        | RO:164        |

### 2.10 `TitleLine` — clause separator `·`

| #   | Property    | Value    | Citation |
| --- | ----------- | -------- | -------- |
| P75 | glyph       | `·`      | RO:168   |
| P76 | aria-hidden | `"true"` | RO:168   |
| P77 | opacity     | **0.5**  | RO:168   |
| P78 | marginRight | **6**    | RO:168   |

### 2.11 `TitleLine` — promoted tour name (artist surface)

| #   | Property                        | Value                                                                                           | Citation                |
| --- | ------------------------------- | ----------------------------------------------------------------------------------------------- | ----------------------- |
| P79 | titleText selection             | `promoteTour && show.tourName ? show.tourName : show.artist`                                    | RO:136                  |
| P80 | Rendered at                     | title weight/size/color (identical to the artist title — same node)                             | RO:155-158; CP:59-60    |
| P81 | SR span content                 | `" — {show.artist}"` (leading space, em-dash, space)                                            | RO:162                  |
| P82 | SR span style                   | `OX_SR` (abs, 1×1, clip rect(0 0 0 0), nowrap, border 0, margin -1, overflow hidden, padding 0) | RO:71-74                |
| P83 | `promoteTour` derivation        | `cfg.carries.includes("artist")`                                                                | RO:420                  |
| P84 | Clause suppressed when promoted | `clause = allowTour && show.tourName && !promoteTour`                                           | RO:137                  |
| P85 | Fallback with no tourName       | line 1 falls back to the artist as today                                                        | RO:136; RM:60; CP:60-61 |

### 2.12 Per-surface `tour` flag

| #   | Surface              | `carries`                                                                       | `supports`  | `tour`    | `meta` (prototype)           | `action`   | Citation |
| --- | -------------------- | ------------------------------------------------------------------------------- | ----------- | --------- | ---------------------------- | ---------- | -------- |
| P86 | browse               | `["date"]`                                                                      | true        | **true**  | `["following","genre"]`      | null       | RO:78    |
| P87 | watching             | `[]`                                                                            | false       | **false** | `["freshness","provenance"]` | `"remove"` | RO:79    |
| P88 | venue                | `["venue"]`                                                                     | true        | **true**  | `["following","genre"]`      | null       | RO:80    |
| P89 | artist               | `["artist"]`                                                                    | true        | **true**  | `["genre"]`                  | null       | RO:83    |
| P90 | related              | `[]`                                                                            | false       | **true**  | `["genre"]` (prototype)      | null       | RO:84    |
| P91 | `related` divergence | shipped `surfaces.ts` has `['following','genre']`; **shipped config wins**      | RDY:153-156 |
| P92 | `crew` / `crewLens`  | absent from prototype; both exist in production and both need ROW_MIN constants | RDY:157-159 |

### 2.13 Support line (line 2) — unchanged, restated

| #    | Property             | Value                                  | Citation |
| ---- | -------------------- | -------------------------------------- | -------- |
| P93  | display / alignItems | flex / baseline                        | RO:423   |
| P94  | gap                  | 4                                      | RO:423   |
| P95  | fontFamily           | `OX_MONO`                              | RO:424   |
| P96  | fontSize             | `s.meta`                               | RO:424   |
| P97  | letterSpacing        | `0.01em`                               | RO:424   |
| P98  | `with` color         | `var(--fg-subtle)`                     | RO:424   |
| P99  | `with` flexShrink    | 0                                      | RO:426   |
| P100 | supports color       | `var(--fg-muted)`                      | RO:427   |
| P101 | supports fontWeight  | 700                                    | RO:427   |
| P102 | supports overflow    | hidden + ellipsis + nowrap, minWidth 0 | RO:427   |
| P103 | join separator       | `" · "`                                | RO:427   |
| P104 | condition            | `cfg.supports && show.supports.length` | RO:382   |

### 2.14 `WhenWhereX` (line 3)

| #    | Property                                 | Value                                                         | Citation       |
| ---- | ---------------------------------------- | ------------------------------------------------------------- | -------------- |
| P105 | outer wrapper                            | `minWidth: 0`, holds `boxRef` for the observer                | RO:222         |
| P106 | inner display                            | flex, alignItems baseline                                     | RO:224         |
| P107 | inner minWidth                           | 0                                                             | RO:224         |
| P108 | inner overflow                           | hidden                                                        | RO:224         |
| P109 | gap                                      | **5**                                                         | RO:224         |
| P110 | fontFamily                               | `OX_MONO`                                                     | RO:225         |
| P111 | fontSize                                 | `s.meta`                                                      | RO:225, RO:430 |
| P112 | color                                    | `var(--fg-muted)`                                             | RO:225         |
| P113 | letterSpacing                            | `0.02em`                                                      | RO:225         |
| P114 | whiteSpace                               | nowrap                                                        | RO:225         |
| P115 | separator `·` opacity                    | 0.4                                                           | RO:218         |
| P116 | separator flexShrink                     | 0                                                             | RO:218         |
| P117 | separator aria-hidden                    | `"true"`                                                      | RO:218         |
| P118 | date/time flexShrink                     | 0                                                             | RO:227-229     |
| P119 | venue minWidth / overflow / textOverflow | 0 / hidden / ellipsis                                         | RO:230         |
| P120 | **strike textDecoration**                | `line-through`                                                | RO:219         |
| P121 | **strike textDecorationThickness**       | `1px`                                                         | RO:219; CP:87  |
| P122 | **strike opacity**                       | `0.8`                                                         | RO:219; CP:87  |
| P123 | strike applies to                        | date span, date↔time separator span, time span                | RO:227-229     |
| P124 | strike does NOT apply to                 | venue and the venue's separator                               | RO:230; CP:88  |
| P125 | `strike` prop source                     | `struck = status === "cancelled" \|\| status === "postponed"` | RO:390, RO:430 |

### 2.15 `RowMetaChip` grammar (unchanged, restated — the status chips reuse it)

| #    | Property          | Value                                                                                                                                     | Citation        |
| ---- | ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| P126 | display           | inline-flex, alignItems center                                                                                                            | ER:100          |
| P127 | gap (icon ↔ text) | 4                                                                                                                                         | ER:100          |
| P128 | flexShrink        | 0                                                                                                                                         | ER:100          |
| P129 | padding           | `2px 7px` (`2px 7px 2px 5px` with icon)                                                                                                   | ER:101          |
| P130 | borderRadius      | **5**                                                                                                                                     | ER:101          |
| P131 | border            | `1px solid {tone.bd}`                                                                                                                     | ER:102          |
| P132 | fontFamily        | `ER_MONO`                                                                                                                                 | ER:103          |
| P133 | fontSize          | **9.5**                                                                                                                                   | ER:103          |
| P134 | fontWeight        | 700                                                                                                                                       | ER:103          |
| P135 | letterSpacing     | `0.08em`                                                                                                                                  | ER:104          |
| P136 | textTransform     | uppercase                                                                                                                                 | ER:104          |
| P137 | lineHeight        | 1.5                                                                                                                                       | ER:104          |
| P138 | whiteSpace        | nowrap                                                                                                                                    | ER:105          |
| P139 | no native tooltip | `title={undefined}` — SR span instead                                                                                                     | ER:99, ER:88-90 |
| P140 | tone `neutral`    | fg `var(--fg-muted)`, bd `var(--border)`, bg `var(--surface-2)`                                                                           | ER:93           |
| P141 | tone `warn`       | fg `var(--warning)`, bd `color-mix(in oklch, var(--warning) 42%, transparent)`, bg `color-mix(in oklch, var(--warning) 10%, transparent)` | ER:94           |
| P142 | tone `signal`     | fg `var(--signal)`, bd `color-mix(… var(--signal) 42% …)`, bg `color-mix(… var(--signal) 9% …)`                                           | ER:95           |
| P143 | tone `strong`     | fg `var(--fg)`, bd `var(--border-strong)`, bg `var(--surface-3)`                                                                          | ER:96           |

### 2.16 Status chips (price slot)

| #    | Element        | Property                                        | Value                                                                             | Citation                |
| ---- | -------------- | ----------------------------------------------- | --------------------------------------------------------------------------------- | ----------------------- |
| P144 | Cancelled chip | tone                                            | **`warn`**                                                                        | RO:186; CP:85           |
| P145 | Cancelled chip | visible text                                    | `Cancelled`                                                                       | RO:186                  |
| P146 | Cancelled chip | srText                                          | `This show has been cancelled`                                                    | RO:186                  |
| P147 | Postponed chip | tone                                            | **`strong`**                                                                      | RO:189; CP:97           |
| P148 | Postponed chip | visible text                                    | `Postponed`                                                                       | RO:189                  |
| P149 | Postponed chip | srText                                          | `Postponed, new date not announced yet`                                           | RO:189                  |
| P150 | Both           | budget cost                                     | **zero meta-chip budget spent**                                                   | RM:80; CP:82-83         |
| P151 | Both           | extra lines                                     | none                                                                              | RM:80                   |
| P152 | Both           | SR semantics                                    | srText **REPLACES** the visible label, does not append                            | RO:180-184; RDY:110-111 |
| P153 | Both           | shipped key names                               | `a11y.cancelled` / `a11y.postponed`; `srText` is the prototype name for `srLabel` | RO:183-184              |
| P154 | Both           | suppressibility                                 | must never be suppressed on any surface                                           | RM:89; CP:107-109       |
| P155 | Sold out chip  | tone / text                                     | `warn` / `Sold out`                                                               | ER:140-141              |
| P156 | Presale        | dash                                            | `—`, `s.price` size, weight 800, `var(--fg-subtle)`                               | ER:146                  |
| P157 | Presale        | label                                           | `presale`, mono 9.5/700, ls `0.1em`, uppercase, `var(--fg-subtle)`                | ER:147                  |
| P158 | No price       | `tba`, mono 11, ls `0.04em`, `var(--fg-subtle)` | ER:152                                                                            |

### 2.17 Price column wrapper

| #    | Property                              | Value                            | Citation       |
| ---- | ------------------------------------- | -------------------------------- | -------------- |
| P159 | justifySelf                           | end                              | RO:434         |
| P160 | display / alignItems / justifyContent | flex / center / flex-end         | RO:434         |
| P161 | minWidth                              | `priceMin` (78 wide / 56 narrow) | RO:434, RO:376 |
| P162 | showDelta                             | `surface === "watching"`         | RO:435         |

### 2.18 `MetaRowX` (line 4)

| #    | Property                    | Value                                                                     | Citation       |
| ---- | --------------------------- | ------------------------------------------------------------------------- | -------------- |
| P163 | display                     | flex                                                                      | RO:359         |
| P164 | gap                         | **5** (default prop)                                                      | RO:284, RO:359 |
| P165 | alignItems                  | center                                                                    | RO:359         |
| P166 | marginTop                   | **2**                                                                     | RO:359         |
| P167 | minWidth                    | 0                                                                         | RO:359         |
| P168 | position                    | relative                                                                  | RO:359         |
| P169 | in-flow child style         | `display: inline-flex`                                                    | RO:361         |
| P170 | out-of-flow child style     | `position:absolute; left:0; top:0; visibility:hidden; pointerEvents:none` | RO:362         |
| P171 | out-of-flow aria            | `aria-hidden="true"`                                                      | RO:363         |
| P172 | initial state               | `{ paired: true, fit: children.length }`                                  | RO:289         |
| P173 | pair key                    | `"g"` — the child the collapse targets                                    | RO:291, RO:329 |
| P174 | collapse mechanism          | `React.cloneElement(c, { paired: false })`                                | RO:291         |
| P175 | render condition on the row | `metaChips.length > 0 && <MetaRowX>` — collapses whole when zero          | RO:431         |

### 2.19 `GenrePairChip`

| #    | Property               | Value                                                             | Citation                       |
| ---- | ---------------------- | ----------------------------------------------------------------- | ------------------------------ |
| P176 | tone                   | `neutral`                                                         | GP:131                         |
| P177 | Content when paired    | `{g[0]}` + `/` + `{g[1]}`                                         | GP:132                         |
| P178 | Content when collapsed | `{g[0]}` only                                                     | GP:129, GP:132                 |
| P179 | `/` opacity            | **0.45**                                                          | GP:132; RM:159; CP:135         |
| P180 | `/` padding            | `0 1px`                                                           | GP:132                         |
| P181 | `/` aria-hidden        | `"true"`                                                          | GP:132                         |
| P182 | `both` condition       | `paired && g.length > 1`                                          | GP:129                         |
| P183 | null render            | `if (!g.length) return null`                                      | GP:128                         |
| P184 | srText when collapsed  | `" and {g[1]}"` — **appends** (the exception to the replace rule) | GP:131; RDY:112                |
| P185 | srText when paired     | `undefined`                                                       | GP:131                         |
| P186 | Cap                    | two genres; a third never renders                                 | GP:119, GP:121; RM:163; CP:147 |
| P187 | Approx width cost      | pair ≈34px vs. a whole extra slot for a second chip               | RM:168; GP:53                  |
| P188 | Case of the label      | uppercase via `RowMetaChip.textTransform`                         | ER:104                         |

### 2.20 `orderGenres`

| #    | Property          | Value                                                                                                            | Citation                     |
| ---- | ----------------- | ---------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| P189 | Filter            | `(genres \|\| []).filter(Boolean)`                                                                               | GP:114                       |
| P190 | Empty guard       | returns `[]`                                                                                                     | GP:115                       |
| P191 | Members source    | `bucketMembers \|\| (activeGenre ? VIBE_BUCKETS[activeGenre] : null)`                                            | GP:116                       |
| P192 | Lead selection    | `g.find((x) => members.includes(x))` — **membership, never equality**                                            | GP:118; CP:136-138           |
| P193 | Reordered result  | `[lead, ...g.filter(x => x !== lead)].slice(0,2)`                                                                | GP:119                       |
| P194 | Fallback          | `g.slice(0,2)` (primary-genre order)                                                                             | GP:121                       |
| P195 | No-seam behaviour | no reorder is fine, a **wrong** reorder is not                                                                   | GP:95-96; RM:165; CP:144-145 |
| P196 | Seam options      | lift the map into a shared package **or** have the API return which sub-genre matched — design has no preference | RM:165; CP:141-144; GP:87-93 |
| P197 | Mock taxonomy     | `VIBE_BUCKETS` = jazz/indie/electronic/loud/hip-hop; NOT source of truth                                         | GP:102-108; RDY:194-197      |

### 2.21 Termination ceilings

| #    | Property               | Value                                                            | Citation               |
| ---- | ---------------------- | ---------------------------------------------------------------- | ---------------------- |
| P198 | `META_MAX_STEPS`       | **3** writes per width episode                                   | RO:280; CP:171-173     |
| P199 | `META_MAX_TOTAL`       | **12** writes per mount, unresettable                            | RO:281-282; CP:166-170 |
| P200 | `spend()` gate         | every state write routes through it; refuses at 0; returns false | RO:295-301             |
| P201 | Width-change threshold | `> 1px`                                                          | RO:309, RO:348         |
| P202 | Observer coalescing    | one `requestAnimationFrame`, never a synchronous write           | RO:341-353; CP:174-175 |
| P203 | Observer target        | `MetaRowX`'s own `ref` element                                   | RO:354                 |
| P204 | Observer cleanup       | `ro.disconnect()` + `cancelAnimationFrame`                       | RO:355                 |
| P205 | Observer deps          | `[children.length]`                                              | RO:356                 |

### 2.22 Action gutter (unchanged)

| #    | Property         | Value                                                        | Citation       |
| ---- | ---------------- | ------------------------------------------------------------ | -------------- |
| P206 | gutter width     | 36                                                           | RO:377, RO:439 |
| P207 | button paint box | 28 × 28, borderRadius 7                                      | RO:444         |
| P208 | button color     | `var(--fg-subtle)`                                           | RO:444         |
| P209 | touch target     | 44 × 44 overlay, centred, aria-hidden                        | RO:448         |
| P210 | aria-label       | `Stop watching {show.artist}`                                | RO:441         |
| P211 | icon             | `OxX` — 11px, viewBox 0 0 12 12, strokeWidth 1.6, round caps | RO:236-238     |

### 2.23 List container

| #    | Property              | Value                                                                                                                | Citation       |
| ---- | --------------------- | -------------------------------------------------------------------------------------------------------------------- | -------------- |
| P212 | list gap              | `surface === "watching" ? 8 : 0`                                                                                     | RO:466, RO:468 |
| P213 | row divider           | `1px solid var(--border)` borderTop when ungrouped, i>0, non-watching                                                | RO:476         |
| P214 | group header          | fontSize 16, weight 800, ls `-0.02em`, `var(--fg)`; rule 1px `var(--border)`; paddingTop 12 / paddingBottom 4; gap 8 | RO:470-472     |
| P215 | `fixedHeight` default | `true`                                                                                                               | RO:456         |

### 2.24 Theming / house rules

| #    | Property                 | Value                                                             | Citation       |
| ---- | ------------------------ | ----------------------------------------------------------------- | -------------- |
| P216 | Colors                   | token-only from theme CSS vars; no raw hex                        | CP:215-216     |
| P217 | Themes verified          | electric / jade / light                                           | RM:128; CP:216 |
| P218 | `--accent`               | means "watching"                                                  | CP:217         |
| P219 | `--signal`               | CTAs / status                                                     | CP:217         |
| P220 | Following chip           | stays the neutral Spotify-marked chip (tone `strong` + logo icon) | CP:217; RO:108 |
| P221 | Tooltips                 | no native `title=` anywhere; SR spans only                        | CP:221-222     |
| P222 | Touch targets            | 44 × 44 minimum                                                   | CP:222         |
| P223 | Status never color-alone | each state has text                                               | CP:222-223     |
| P224 | Baseline width           | 320 → desktop                                                     | CP:223         |

---

## 3 · State coverage table

### 3.1 Lifecycle / price states

| #   | State                                 | Price slot                                          | Line 3 strike | Art dim        | Title          | Other                                                      | Citation                      |
| --- | ------------------------------------- | --------------------------------------------------- | ------------- | -------------- | -------------- | ---------------------------------------------------------- | ----------------------------- |
| S1  | `live` + price                        | price amount (+`from` if floor, +delta on watching) | no            | no             | normal         | —                                                          | ER:155-179                    |
| S2  | `live` + no price                     | `tba`                                               | no            | no             | normal         | —                                                          | ER:151-153                    |
| S3  | `presale`                             | `—` over `presale` label                            | no            | no             | normal         | —                                                          | ER:143-149                    |
| S4  | `soldout`                             | `Sold out` chip (warn)                              | **no**        | **yes (0.55)** | normal         | price + delta suppressed                                   | ER:140-142; RO:391            |
| S5  | `cancelled`                           | `Cancelled` chip (warn)                             | **yes**       | **yes**        | **not struck** | 3 signals total: chip, dim, one strike                     | RO:185-187, RO:390-391; RM:84 |
| S6  | `postponed`                           | `Postponed` chip (strong)                           | **yes**       | **yes**        | not struck     | same strike + same dim as cancelled; only the chip differs | RO:188-190; RM:85; CP:97-98   |
| S7  | `cancelled` + sold out (`bothstates`) | `Cancelled` — cancelled wins                        | yes           | yes            | not struck     | **fixes a live bug**: production reads "Sold out" today    | RM:82; OD:71-77; RDY:25       |
| S8  | `postponed` + sold out                | `Postponed` — postponed wins                        | yes           | yes            | not struck     | by precedence                                              | RO:185-191                    |
| S9  | `cancelled` + presale                 | `Cancelled`                                         | yes           | yes            | not struck     | by precedence                                              | RO:185-191                    |
| S10 | Any status on **any** surface         | status chip always renders — never suppressed       | —             | —              | —              | including `watching`                                       | RM:89; CP:107-109             |

### 3.2 Tour name states

| #   | State                                                     | What renders                                                                 | Citation             |
| --- | --------------------------------------------------------- | ---------------------------------------------------------------------------- | -------------------- |
| S11 | tourName present, surface `tour:true`, fits               | `{artist} · {tourName}` on one line box; clause mono, title−4, `--fg-subtle` | RO:164-169           |
| S12 | tourName present, title being clipped                     | **clause dropped whole** — `fits=false`; artist keeps its full width         | RO:141-144; CP:41-45 |
| S13 | tourName present, surface `tour:false` (watching)         | no clause at all                                                             | RO:79, RO:137        |
| S14 | tourName present, surface `artist` (`carries:["artist"]`) | tour name **is** line 1 at title weight; artist name in an SR span           | RO:136, RO:162       |
| S15 | tourName absent, surface `artist`                         | line 1 falls back to the artist as today; no SR span                         | RO:136, RO:162       |
| S16 | tourName absent, any surface                              | line 1 is the artist; no clause                                              | RO:136-137           |
| S17 | Narrow (320) with tour name                               | clause "essentially never renders" — correct, not a bug                      | RM:56; CP:53-55      |
| S18 | 390 with tour name                                        | only short ones render (e.g. `A TOUR`)                                       | RM:56                |
| S19 | Width changes (resize)                                    | `fits` resets to `true`, then re-measures                                    | RO:148               |
| S20 | `show.id` / `size` / `clause` / `titleText` changes       | `fits` resets to `true`                                                      | RO:139               |
| S21 | Tour name too long                                        | never sliced, never wrapped — whole or absent                                | RM:52; CP:45         |

### 3.3 Fallback title states

| #   | State                                                   | What renders                                                                    | Citation                  |
| --- | ------------------------------------------------------- | ------------------------------------------------------------------------------- | ------------------------- |
| S22 | `fallbackTitle` present, any surface, any condition     | **nothing on the row** — the field is never read                                | RM:68; CP:64-65           |
| S23 | Crawler could not resolve an artist (e.g. `BASS BINGO`) | the fallen-through string renders as line 1 through the normal `artist` path    | RM:68; CP:69-72; OD:51    |
| S24 | `artist` nullability                                    | **stays non-null**; no fallback branch in the title slot                        | CP:71-72, CP:197; RDY:22  |
| S25 | Event detail                                            | `fallbackTitle` keeps its **current** detail rendering — do not remove it there | RDY:142-145               |
| S26 | `listed as "…"`                                         | **not designed; do not invent it**                                              | RM:132; CP:75-77; RDY:113 |

### 3.4 Genre states

| #   | State                                                          | What renders                                                                                                                    | Citation                       |
| --- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| S27 | Zero genres                                                    | genre chip not built (`show.genres[0]` falsy) → chip absent                                                                     | RO:109; GP:128                 |
| S28 | One genre                                                      | single-genre chip, no `/`, no second genre                                                                                      | GP:129, GP:132                 |
| S29 | Two genres, no filter active                                   | `G0/G1` in primary order                                                                                                        | GP:116-121                     |
| S30 | Two genres, filter active, primary **is** a member             | `G0/G1` — **reorder is a no-op**                                                                                                | GP:33-41; RM:162               |
| S31 | Two genres, filter active, primary **not** a member, second is | `G1/G0` — the matched member leads                                                                                              | GP:118-119; RM:161             |
| S32 | Two genres, filter active, **neither** is a member             | falls through to `g.slice(0,2)` primary order                                                                                   | GP:118-121                     |
| S33 | Three or more genres                                           | third and beyond never render                                                                                                   | GP:119, GP:121; CP:147         |
| S34 | No `bucketMembers` seam                                        | primary-genre order, no reorder                                                                                                 | GP:95-96; CP:144-145           |
| S35 | Pair collapsed under width pressure                            | leading genre only; dropped genre moves to an SR span                                                                           | GP:131; RO:331-334; CP:155-156 |
| S36 | Pair + Following chip on the same line                         | collapses **earlier** than a pair with the line to itself (Masego collapses at 390; Cassandra Jenkins keeps `FOLK/INDIE` there) | RM:172; CP:156-157             |
| S37 | Chip still doesn't fit after collapse                          | normal whole-chip drop resumes                                                                                                  | RO:335                         |
| S38 | Second genre gets its own chip                                 | **never** — explicitly forbidden                                                                                                | CP:148-151; RM:168             |

### 3.5 Meta budget states (unchanged, restated)

| #   | State                                        | What renders                                                 | Citation     |
| --- | -------------------------------------------- | ------------------------------------------------------------ | ------------ |
| S39 | No support line                              | budget = 2                                                   | RO:383       |
| S40 | Support line present                         | budget = 1                                                   | RO:383       |
| S41 | Zero chips built                             | `MetaRowX` not rendered at all — line 4 collapses            | RO:431       |
| S42 | `following` true, surface has it in priority | Following chip (strong, Spotify logo 11px radius 2)          | RO:108       |
| S43 | `artist` surface                             | `following` dropped from priority — meta is `["genre"]` only | RO:83; CP:62 |
| S44 | Stale price on watching                      | `Stale · {relTime}` warn chip                                | RO:112       |
| S45 | Resale price                                 | warn chip `Resale`                                           | RO:115-116   |
| S46 | Community price                              | signal chip `Community`                                      | RO:115-116   |
| S47 | Primary-source price                         | no provenance chip                                           | RO:114       |

### 3.6 Height / geometry states

| #   | State                                         | Height outcome                                                                | Citation                       |
| --- | --------------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------ |
| S48 | Zero chips (line 4 collapsed)                 | row still measures `ROW_MIN`; slack distributed by `alignItems:center`        | RO:395-400; CP:112-117         |
| S49 | Full four lines                               | same `ROW_MIN` as S48 at the same geometry                                    | RO:395                         |
| S50 | Row with a tour name vs. one without          | must measure **identically**                                                  | CP:31-34                       |
| S51 | Cancelled row vs. live row                    | must measure **identically**                                                  | CP:31-34                       |
| S52 | Mixed list, fixed geometry                    | distinct-height set == **1**                                                  | CP:122, CP:228-229; RM:126     |
| S53 | Collapsing comparison (`fixedHeight={false}`) | 3 distinct heights (82 / 91 / 109) on the same data                           | RM:126                         |
| S54 | Measured outcomes                             | cozy wide 110 / cozy narrow 108 / watching 92 / compact 101 (roomy 121 in CP) | RM:126; CP:120                 |
| S55 | Surface or density change                     | the height probe **re-measures** (R1 measured once on mount → stale)          | RM:125; RM:186                 |
| S56 | Reachable zero-chip production row            | **`watching`** with a fresh primary-source price, not a genre-less Browse row | RM:76; RDY:80-101              |
| S57 | `genres: []` fixtures                         | canvas convenience — do NOT port into a production test                       | OD:15-21, OD:80-83; RDY:97-101 |

### 3.7 Measure-pass states

| #   | State                                    | Behaviour                                                                      | Citation               |
| --- | ---------------------------------------- | ------------------------------------------------------------------------------ | ---------------------- |
| S58 | Fresh mount                              | `paired:true`, `fit:children.length`                                           | RO:289                 |
| S59 | Width moved > 1px                        | `solved = {w, step:0}`; if state is not pristine, reset to pristine and return | RO:309-315             |
| S60 | Width already at `META_MAX_STEPS`        | left alone permanently for that width                                          | RO:316; RO:270-272     |
| S61 | Mount budget exhausted                   | all writes refused; row keeps its last good answer                             | RO:296-297; RO:262-263 |
| S62 | Overflow + pair present + still paired   | collapse the pair, return (do not drop yet)                                    | RO:331-334             |
| S63 | Overflow, no pair (or already collapsed) | settle `fit` to the count that fits                                            | RO:335                 |
| S64 | Height churn (own mutation)              | observer ignores it (width-guarded)                                            | RO:348; RO:275-277     |
| S65 | Burst of resize notifications            | coalesced into one rAF → one re-open                                           | RO:342-347             |
| S66 | Zero `clientWidth`                       | measure aborts                                                                 | RO:307, RO:349         |

### 3.8 Theme states

| #   | State                   | Coverage                                 | Citation       |
| --- | ----------------------- | ---------------------------------------- | -------------- |
| S67 | electric / jade / light | all properties verified across all three | RM:128; CP:216 |

---

## 4 · Behavioral rules

### 4.1 Tour-clause measure/fit

1. **B1** — Render the clause, then measure the **TITLE's own** overflow: `el.scrollWidth > el.clientWidth + 0.5`. (RO:141-144; CP:40-41)
2. **B2** — If the title is being clipped, set `fits=false` and drop the clause **whole**. (RO:143; RM:49)
3. **B3** — The artist **never** truncates to make room for a tour name. Non-negotiable. (RM:51; CP:44)
4. **B4** — The tour name is **never** sliced or wrapped — it fits entirely or it isn't there. (RM:52; CP:45)
5. **B5** — No width table, no breakpoint. **One boolean, derived from measurement.** (RM:53; CP:46-47)
6. **B6** — The `ResizeObserver` observes the **title COLUMN** (`boxRef`), never the measured node itself — observing the node whose content the flag changes re-fires on its own mutation and can loop. (RO:128-130, RO:145-151; CP:47-49)
7. **B7** — On resize, reset `fits` to `true` (re-open the question). (RO:148)
8. **B8** — Also reset on `show.id`, `size`, `clause`, `titleText` change. (RO:139)
9. **B9** — Surface-gated by the new per-surface `tour` flag; false on `watching`. (RO:79; CP:50-52)
10. **B10** — Rule 1 corollary: when the surface `carries: ["artist"]`, promote the tour name into the title slot and move the artist to an SR span; suppress the clause. (RO:136-137, RO:162; CP:57-62)

### 4.2 Fallback title

11. **B11** — `fallbackTitle` is never read by the row, on any surface, under any condition. (RM:68; CP:64-65)
12. **B12** — `artist` stays non-null; there is no fallback branch in the title slot. (CP:71-72, CP:197)
13. **B13** — Its future home is event detail as `listed as "…"` — **flag it, do not invent it**. (CP:75-77)
14. **B14** (carry-in) — Removing it from the row must **not** remove it from event detail, or the string becomes unreachable. (RDY:142-145)

### 4.3 Status precedence

15. **B15** — Order is exactly: **`cancelled > postponed > soldout > presale > price`**. (RM:82; RO:34; CP:85-86)
16. **B16** — Explicit so two statuses can never both render. (RM:82; CP:84)
17. **B17** — Status uses the price slot's door — **no meta-chip budget spent, no extra line**. (RM:80; CP:82-83)
18. **B18** — Production checks `soldout` first; that is a **live bug** this fixes. (RM:82; RDY:25)
19. **B19** — Cancelled row carries exactly **THREE** signals, one per channel: the chip (words), the dimmed artwork (peripheral), one strike on line 3. (RM:84; CP:89-92)
20. **B20** — The title is **NOT** struck. Delete production's struck title; do not ship both behaviours. (RM:84; CP:93-96)
21. **B21** — Strike is a general cue: **cancelled + postponed**. (RO:390; CP:101)
22. **B22** — Dim is a general cue: **cancelled + postponed + sold out**. (RO:391; CP:102)
23. **B23** — Sold-out sharing the dim is expected, not a collision. Do not split these cues further per state. (RM:87; CP:103-104)
24. **B24** — The strike covers date, the date↔time separator and the time. The **venue is left alone** — it's still where the show would have been, and striking the whole line reads as disabled. (RO:195-197, RO:227-230; CP:88)
25. **B25** — Dimming stays on **artwork**; the row's text contrast is never dimmed. (RO:497 spec row; ER:310-313)
26. **B26** — Both status chips must never be suppressed on any surface. (RM:89; CP:107-109)
27. **B27** — Production keeps two axes: `lifecycle` ("cancelled"|"postponed"|…) and `status` ("live"|"soldout"|"presale"). Resolve **across the pair**; never widen `status` to carry lifecycle values. (CP:201-207; RDY:186-191)

### 4.4 Row height

28. **B28** — Line 4 still collapses to nothing when a row has no chips. Keep the collapse — an empty chip line is a hole. (RM:20; CP:112-114; RO:431)
29. **B29** — The **row** reserves height via `min-height` per surface × density × narrow. (RM:117; CP:114-115)
30. **B30** — Existing `align-items: center` distributes the slack so a sparse row is optically centred rather than sitting above a gap. (RM:185; CP:115-116)
31. **B31** — Result: **ONE height per geometry**, where a geometry is a width paired with a support-line state. (CP:29-35)
32. **B32** — Keyed by what the **SURFACE** can ever show (4 lines where a support line exists, 3 where it doesn't) — not by what the row carries. (RO:87-89, RO:395)
33. **B33** — **Derive** the constants from real type metrics; do not copy the mock's numbers. (RO:90-91; CP:120-121; RDY:160-161)
34. **B34** — **Assert** the outcome in a test: render a mixed list, assert the distinct-height set is 1. (CP:121-122)
35. **B35** — The height test must exercise **`watching`**, not a synthetic zero-genre Browse row. (RDY:96-101)
36. **B36** — `crew` and `crewLens` need their own ROW_MIN constants; do not let them fall through to a Browse default. (RDY:157-159)
37. **B37** — Cost of ~20–27px of air on the sparsest rows is accepted deliberately. (CP:123)

### 4.5 Genre pair — ordering

38. **B38** — Two genres render as **ONE** chip costing **ONE** budget slot. (RM:159; CP:132-133)
39. **B39** — Lead = the first genre that is a **MEMBER** of the picked bucket, **never** one equal to it. (`const lead = g.find((x) => expandBucket(activeVibe).includes(x));`) (CP:136-138; GP:118)
40. **B40** — Cap at two; a third never renders. (GP:119-121; CP:147)
41. **B41** — Without the bucket seam, fall back to primary-genre order: **no reorder is fine, a wrong reorder is not.** (GP:95-96; CP:144-145)
42. **B42** — The seam is not free: either lift `genre-buckets.ts` into a shared package or have the API return which sub-genre matched. Design has no preference. (RM:165; CP:141-144)
43. **B43** — `VIBE_BUCKETS` is a mock; eng owns the real map. (GP:100-101; CP:146)
44. **B44** — No data or query change: `genres[]` and the Postgres array overlap already support it. (RM:164; CP:130)
45. **B45** — Never give the second genre its own chip. (CP:148-151)
46. **B46** (readiness, sequencing override) — The seam is **load-bearing, not optional polish**: 38.8% of upcoming inventory would show a wrong-looking lead under an active filter. Build the seam **before** the pair renders anywhere. (RDY:41-78)

### 4.6 Genre pair — width degradation ordering

47. **B47** — The decision lives in `MetaRow`'s fit pass, **NOT** in the chip. (CP:152-153; GP:58-70)
48. **B48** — Degradation order, exactly:
    1. measure the full chip set;
    2. if it overflows **and** a collapsible pair is present → **collapse the pair to its leading genre**;
    3. re-measure;
    4. only then start dropping whole chips. (RO:331-335; CP:153-155)
49. **B49** — The dropped genre goes to a screen-reader span. (GP:131; CP:156)
50. **B50** — It's width, not a breakpoint. Do not encode a breakpoint table — measure. (CP:157-158; RM:172)
51. **B51** — Do not try to make the chip measure itself: `MetaRow` wraps every child in a content-sized span, so a chip looking at its parent sees a box that never overflows; once the fit pass has pulled it out of flow the container isn't overflowing either. That version was built and silently never fired. (CP:159-162; GP:58-64)
52. **B52** — This is the one sanctioned place where a unit degrades **internally** instead of dropping whole: the unit is the chip, the chip survives, its contents shorten — the same way line 3 shortens the date before it drops the venue. (CP:191-192; RM:176)

### 4.7 Termination safety (stated as a hard requirement)

53. **B53** — The pass is inherently **multi-render**: you cannot know whether a collapsed pair fits without rendering it collapsed and measuring. So it must be a state machine that **provably terminates**. (RO:245-248; CP:163-165)
54. **B54** — **Ceiling 1 — per-MOUNT write budget (12) that nothing can reset.** Route every state write through one gate that decrements it and refuses at zero; worst case the row keeps its last good answer. (RO:281-282, RO:295-301; CP:166-170)
55. **B55** — The per-width cap alone bounds nothing, because every genuinely new width legitimately resets it; across ~90 instances that is a slow lockup waiting for the right jitter. (RO:258-261; CP:168-170)
56. **B56** — **Ceiling 2 — per-WIDTH episode cap (3).** Record the width the current answer belongs to and how many writes it has cost; a width already at the cap is left alone, permanently. (RO:268-274, RO:316; CP:171-173)
57. **B57** — The `ResizeObserver` must **NOT** write state synchronously — coalesce to one animation frame. (RO:264-266, RO:341-347; CP:174-175)
58. **B58** — The observer re-opens the question **only** when the width actually moves (> 1px); height churn is the collapse's own doing. (RO:348, RO:309; CP:175-177)
59. **B59** — Failure history, stated so it isn't repeated: R3.2 — `paired` in the parent caused a round trip and left `fit` stale; R3.3 — an effect with no dependency array wrote on every render while the observer re-armed both pieces of state, oscillating forever. **Locked the main thread three times, each differently, never with an exception — the page just died with no console error.** (RO:249-255; CP:178-181)
60. **B60** — Verify across **several fresh loads**, not one. Design verified four fresh loads including a 20k-node layout sweep, forced width oscillation on all 88 rows, and 8–12s soaks. (CP:181; RM:145)

### 4.8 Line-3 ladder (unchanged, restated because `strike` composes with it)

61. **B61** — Levels: 0 full date · time · venue (venue ellipsises) → 1 short date (strip `^[A-Za-z]{3},\s*`) → 2 venue **and its separator** drop as one unit → 3 time drops. (RO:215-217; ER:227-237)
62. **B62** — Level derived from measurement (`scrollWidth > clientWidth + 0.5`), capped at 3. (RO:203-206)
63. **B63** — Reset to 0 on `show.id` / `showsDate` / `showsVenue` / `size` change and on resize. (RO:202, RO:210)
64. **B64** — The observer here also watches the **wrapper box**, not the measured node (same R2 fix as the tour clause). (RO:207-213; RM:187)
65. **B65** — Date and time never truncate; units leave whole. (ER:237-238)

### 4.9 Meta budget (unchanged, restated)

66. **B66** — Budget is 2, dropping to 1 when a support line is present. (RO:383; ER:29-31)
67. **B67** — Priority walk stops at budget, then hard-slices. (RO:118-120)
68. **B68** — Nothing gets a slot by default — it has to displace something. (ER:32)
69. **B69** — Whole chips are dropped, never sliced, never wrapped. (ER:441)

### 4.10 What must not change

70. **B70** — Unchanged: four-line contract · Rule 1 · Rule 2 and the meta budget · the measured line-3 ladder · the narrow (≤360) step · the 36px action gutter and its collapse · price rendering and the surface-gated delta · sold-out and presale behavior. (CP:209-212; RM:23, RM:119)
71. **B71** — Do **not** ship a second row component. `row-overflow.jsx` is a fork to be diffed and folded back into the one real component. (CP:18-20; RM:105)

### 4.11 Engineering carry-ins from READINESS (build-time rulings, not design rounds)

72. **B72** — `EventTitleBlock` is shared with event detail. The row gets its own title line; `EventTitleBlock` keeps `hero`/`detail`. (RDY:127-135)
73. **B73** — The struck title is deleted on **event detail too** — the reasoning is not row-specific and detail already states status in a `StatusPill`. (RDY:136-141)
74. **B74** — The `artist` surface becomes a real `SURFACES` entry; this closes #1418. (RDY:146-152)
75. **B75** — For `related`, **shipped config wins** (`['following','genre']`), not the prototype's `['genre']`. (RDY:153-156)

---

## 5 · Copy inventory

### 5.1 Customer-facing visible strings

| #   | String (verbatim)    | Where                                                   | Notes                                                           | Citation               |
| --- | -------------------- | ------------------------------------------------------- | --------------------------------------------------------------- | ---------------------- |
| C1  | `Cancelled`          | price slot chip                                         | tone `warn`. Plain, not apologetic. Locked vocabulary.          | RO:186; RDY:109        |
| C2  | `Postponed`          | price slot chip                                         | tone `strong`                                                   | RO:189; RDY:109        |
| C3  | `Sold out`           | price slot chip                                         | unchanged                                                       | ER:141                 |
| C4  | `presale`            | price slot label                                        | unchanged (rendered uppercase)                                  | ER:147                 |
| C5  | `tba`                | price slot                                              | unchanged (mono, lowercase in source)                           | ER:152                 |
| C6  | `from`               | price prefix                                            | unchanged (rendered uppercase)                                  | ER:159                 |
| C7  | `—`                  | presale dash                                            | unchanged                                                       | ER:146                 |
| C8  | `flat`               | delta                                                   | unchanged                                                       | ER:177                 |
| C9  | `Following`          | meta chip                                               | unchanged                                                       | RO:108                 |
| C10 | `Stale · ` + relTime | meta chip                                               | unchanged; relTime is `{n}m ago` / `{n}h ago` / `{n}d ago`      | RO:112; RD:21-28       |
| C11 | `Resale`             | meta chip                                               | unchanged                                                       | RO:116                 |
| C12 | `Community`          | meta chip                                               | unchanged                                                       | RO:116                 |
| C13 | `with`               | line 2 label                                            | unchanged                                                       | RO:426                 |
| C14 | `·`                  | line 1 tour separator, line 3 separators, supports join | aria-hidden where it is a separator element                     | RO:168, RO:218, RO:427 |
| C15 | `/`                  | genre pair separator                                    | aria-hidden, 45% opacity                                        | GP:132                 |
| C16 | Genre labels         | meta chip                                               | raw `genres[]` values, uppercased by the chip's `textTransform` | GP:132; ER:104         |
| C17 | `listed as "…"`      | **event detail — NOT built here**                       | do not invent it                                                | RM:132; CP:75-77       |

### 5.2 Screen-reader strings

| #   | String (verbatim)                                                                     | Semantics                                                                                                                         | Citation            |
| --- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| A1  | `This show has been cancelled`                                                        | **Replaces** the visible `Cancelled` label. Ship as `a11y.cancelled`.                                                             | RO:186; RDY:110     |
| A2  | `Postponed, new date not announced yet`                                               | **Replaces** the visible `Postponed` label — so the replacing form has to carry the status word itself. Ship as `a11y.postponed`. | RO:189; RDY:111     |
| A3  | ` and {g[1]}`                                                                         | **Appends** to the visible collapsed genre chip (the sanctioned exception to the replace pattern). Leading space, no em-dash.     | GP:131; RDY:112     |
| A4  | ` — {show.artist}`                                                                    | SR span after a promoted tour name on the artist surface                                                                          | RO:162              |
| A5  | `Resale price from the secondary market, not face value`                              | provenance chip srText (corrected to shipped, em-dash free)                                                                       | RO:116; RDY:118-124 |
| A6  | `Community price, submitted by a fan`                                                 | provenance chip srText                                                                                                            | RO:116              |
| A7  | `You're watching this show`                                                           | aria-label on the watching tick                                                                                                   | RO:411              |
| A8  | `Stop watching {show.artist}`                                                         | aria-label on the remove button                                                                                                   | RO:441              |
| A9  | ` down from ${saved.price} when you saved` / ` up from ${saved.price} when you saved` | delta SR span                                                                                                                     | ER:173              |

### 5.3 Copy rules

| #   | Rule                                                                                        | Citation                |
| --- | ------------------------------------------------------------------------------------------- | ----------------------- |
| C18 | Vocabulary: "Watching", never Saved / Favorites / Bookmarks                                 | CP:218-219              |
| C19 | Status copy is plain, not apologetic                                                        | CP:219-220              |
| C20 | No em-dashes survive in rendered copy                                                       | RDY:115                 |
| C21 | Every shipped row a11y string **replaces** the visible label — except the genre append (A3) | RO:180-184; RDY:110-112 |
| C22 | No display copy in the data layer; formatting lives in the row                              | CP:199; RD:17           |

---

## 6 · Ambiguities and self-contradictions

Listed, not resolved.

1. **`related` surface chip priority contradicts itself across artifacts.** `RO:84` gives `related` `meta: ["genre"]`; `RDY:153-156` says shipped `surfaces.ts` has `['following','genre']` and that shipped config wins. `RM:118` mentions only that `artist` drops `following`, and is silent on `related`. Two different values for the same surface, and it now matters because ROW_MIN is keyed per surface.

2. **`ROW_MIN` compact narrow == compact wide.** `RO:93` gives compact `{wide:{4:101,3:85}, narrow:{4:101,3:85}}` — identical values, while cozy and roomy both differ between wide and narrow. Unexplained: either compact genuinely doesn't shrink (the narrow override caps art at 44 and title at 14.5, both of which compact already is — `RO:372,375`) or the table is stale. Never stated.

3. **`ROW_MIN` is keyed by `cfg.supports`, but `roomy`/`compact` measured values are only partially quoted.** `CP:120` lists "cozy wide 110 / cozy narrow 108 / watching 92 / compact 101 / roomy 121"; `RM:126` lists "cozy wide 110 / cozy narrow 108 / watching 92 / compact 101" with no roomy. Neither list distinguishes the 4-line vs 3-line key that `RO:92-96` actually uses, and "watching 92" corresponds to the cozy-wide 3-line cell — the two presentations of the same table are not reconcilable without inference.

4. **`crew` and `crewLens` have no specified ROW_MIN values or `tour` flag.** `RDY:157-159` says both exist in production, both need constants, and must not fall through to a Browse default — but the handoff's surface table (`RO:77-85`) omits them entirely, so `tour`, `carries`, `supports` and `meta` are unspecified for both.

5. **The `cancelled` prop on `TitleLine` is dead.** `RO:131` declares `cancelled` in the signature and `RO:419` passes `cancelled={struck}`, but the prop is never read in the body. Either a vestige of the deleted struck-title behaviour or an unstated future use.

6. **`fixedHeight` is threaded through `EventRowListX` but not from `EventRowX`'s own default consistently.** `RO:456` defaults it `true` on the list and `RO:370` defaults it `true` on the row, while `RO:392-394` says it exists "only so the canvas can show the collapsing behaviour" and production "always ships it on" — leaving open whether the prop should exist in production at all.

7. **`bucketMembers` is accepted by `EventRowX` (`RO:370`) and `buildMetaX` (`RO:103`) but is NOT threaded through `EventRowListX`.** `RO:456` accepts only `activeGenre` and `RO:478` passes only `activeGenre` — so the very seam the handoff calls load-bearing is unreachable through the list component in the prototype.

8. **Scope of the genre reorder is stated two opposite ways.** `RM:162`, `GP:33-41` and `CP:183-190` all say the reorder "is a no-op in the common case" and warn it "oversells a line most rows never exercise." `RDY:41-78` measures production and says the opposite: 76% of multi-genre events (38.8% of all upcoming) are cross-bucket, so the reorder is the majority path. Design's prose was not updated; the verdict says only "the priority moves."

9. **The zero-chip population is justified two ways.** `RM:74`, `CP:73-74` and `RO:56-57` all justify `ROW_MIN` on the fallback-title population ("no Spotify match, no genre, so zero chips"). `RM:76` (R3.3 correction), `OD:15-21` and `RDY:80-101` say production has **zero** such events (0 of 2,218) and the reachable case is `watching`. The original justification is left standing in the prompt and in the prototype's own header comment.

10. **Upcoming-event counts disagree.** `RM:29` and `CP:22-23` say 233 of 1,125 (measured 2026-08-13); `RDY:39` and `RDY:51` say 1,149 upcoming (measured 2026-08-15). `RDY:192-193` calls this inventory drift rather than an error, but the 20.7% / 8.1% / 16.2% / 1.3% shares are never restated against the newer denominator.

11. **`Row Overflow.html` is knowingly stale.** `RDY:206-211` records that the rendered canvas still carries the pre-R3.3 framing of the zero-chip rows at `:299`, `:316`, `:381` and was deliberately not fixed. An implementer opening the canvas (which `RM:3` tells them to do first) sees the superseded story.

12. **The tour-clause `fits` reset and the measure effect can disagree on `size`.** `RO:139` resets `fits` on `size` change, but `RO:140-144`'s measure effect has no dependency array and runs on every render — the same unbounded-effect shape that `RO:249-255` records as the R3.3 page-killer in `MetaRowX`. No write budget or step cap is specified for `TitleLine` or `WhenWhereX`, only for `MetaRowX`. Whether the two ceilings are required for those two components is never stated.

13. **`lifecycle` vs `status` split is stated in the prompt but not modelled anywhere in the prototype.** `CP:201-207` and `RDY:186-191` say production keeps `lifecycle` and `status` as separate axes and that the resolver spans the pair. Every prototype file (`RO:185-191`, `RO:390-391`, `OD:8`, `OD:57`, `OD:64`, `OD:75`, `RD:15`) flattens them into a single `status` field. The fixture `bothstates` (`OD:73-77`) carries the collision as a bespoke `alsoSoldOut: true` field that appears nowhere in the shape definition and is read by no component.

14. **`OD:57` gives `mainiak` `status: "postponed"` and `price: null`.** Under the precedence rule the `Postponed` chip wins, so the `tba` branch is unreachable for it — but the handoff never says what a postponed-and-unpriced row should do if the chip is ever suppressed, and `RM:89` says the chip can never be suppressed. Consistent, but the `price: null` on that fixture is decorative and could mislead.

15. **`GenrePairChip` `srText` is set from `g.length > 1 && !both`, not from whether the collapse actually dropped anything visible.** `GP:131` — when `paired=true` but `g.length === 1`, `srText` is `undefined` (correct); when `paired=false` and `g.length === 1`, the condition is also false (correct). But the string is `" and {g[1]}"` with no verification that `g[1]` exists at read time; the guard is `g.length > 1` so it holds. Flagged only because the handoff never states the intended SR text for a **dropped** (not collapsed) genre chip.

16. **`META_MAX_TOTAL = 12` is "per mount, ever" but `RO:356` re-runs the observer effect on `[children.length]`.** A change in chip count tears down and re-creates the observer without resetting `budget.current` (a ref, so it persists) — which is presumably intended, but it means a row whose chip set legitimately changes 12+ times over its lifetime freezes its layout answer. Never stated whether that is acceptable.

17. **The tour clause's gap is specified twice with different values.** `RO:154` sets the flex `gap: 7` between title and clause, and `RO:168` additionally sets `marginRight: 6` on the `·`. The effective spacing (7 before the dot, 6 after) is never stated as an intent, only as two independent numbers.

18. **"Discovery surfaces only" for the tour name lists four surfaces in prose but the table sets `tour:true` on all non-watching surfaces.** `RM:54` says `browse`, `venue`, `artist`, `related`; `RO:77-85` sets `tour:true` on exactly those four. Consistent today — but with `crew`/`crewLens` unlisted (item 4), the rule "discovery surfaces only" gives no guidance for a surface not in the table.

19. **`RM` section numbering is out of order.** Sections run 1–7, then 10, then 9, then 8 (`RM:130`, `RM:137`, `RM:150`, `RM:182`). Not a spec ambiguity, but §8/§9/§10 are cross-referenced by number throughout (e.g. `RM:37` "§8 has the correction", `RM:85` "see §10") and a reader scanning top-to-bottom hits the corrections before the things they correct.

20. **`OVF_SPEC` (`RO:487-504`) restates the whole spec in prose and is a second source of truth.** It agrees with the component code everywhere checked, but it is neither generated from it nor cited by the README, so it can drift silently.

21. **`ROW_MIN` derivation is required but no tolerance is given.** `RO:90-91`, `CP:120-121` and `RDY:160-161` all say derive rather than copy, and `CP:122` says assert the distinct set is 1 — but no tolerance is specified for "distinct" (exact pixel equality? sub-pixel rounding? `getBoundingClientRect` vs `offsetHeight`?), which matters for whether the assertion can pass at all.

22. **The `artist` surface has `supports: true` (`RO:83`) and therefore a 4-line ROW_MIN, but also `carries: ["artist"]` which promotes the tour name into line 1.** Whether an artist-page row with a tour name AND supports is a 4-line row (tour name on 1, supports on 2, when/where on 3, chips on 4) is implied but never drawn, and the artist name then exists only in an SR span.
