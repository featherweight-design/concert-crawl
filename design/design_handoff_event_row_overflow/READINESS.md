# Design Readiness Review — Row Overflow

**Round reviewed:** R3.3 · **Date:** 2026-08-15 · **Verdict: 🟢 Green — build it, with the carry-ins below**

> This handoff is an amendment to `design_handoff_event_row_system/`, which shipped
> in PRs #1430 / #1436 / #1445. Nothing in the four-line contract, Rule 1, Rule 2,
> the meta budget, the line-3 ladder or the narrow step changes here.

Method: the prototype's logic was executed against adversarial inputs and diffed
against the shipped components on `origin/main`, not read from the README prose.
The three quantitative claims were re-measured against the production database
rather than taken from the handoff.

---

## Eng-review rounds — all closed

R1 and R2/R3 findings went back to Design and were answered in `README` §8 and §9.

| Finding | Round | Resolution |
| --- | --- | --- |
| R1 proposed making `artist` nullable | R1 | Closed. `events.artist` is `notNull` and deliberately so — `llm.ts:441` falls the cleaned title through into `artist` precisely to keep it non-empty for search, dedupe and the Spotify matcher. §2 is now an unconditional rule with no nullable branch. |
| "Row height takes two values" baseline was false | R1 | Closed. `MetaRow.tsx:70` returns `null` with no chips, so line 4 already collapses and heights already varied. `ROW_MIN` now reserves height on the row; §8.2 carries the correction. |
| Tour-clause `ResizeObserver` observed the node it resizes | R1 | Closed. It now observes the title **column** (`boxRef`), whose width is parent-driven. Same fix applied to `WhenWhereX`. |
| `soldout` checked before cancelled/postponed | R1 | Closed, and it is a **live production bug** — `PriceStack.tsx:44-67` checks `soldout` first, so a cancelled sold-out show currently reads "Sold out". Fixture `bothstates` covers it. |
| Strike and dim were scoped to `cancelled` only | R3.2 | Closed. `row-overflow.jsx:385-386` now sets `struck = cancelled \|\| postponed` and `dimArt = struck \|\| soldout`, per the ruling that these are general "something's wrong" cues rather than per-state encodings. |
| "Matched genre leads" used string equality | R3.2 | Closed. The Vibe filter passes one of 16 **bucket labels**, expanded server-side, so no genre on a row is ever equal to the filter string. `orderGenres` now takes injected `bucketMembers` and matches by membership, with a safe no-reorder fallback. |

The genre seam (`apps/api/src/lib/genre-buckets.ts` is API-only; the web app sees
only the bare `filterVibe` string) is flagged in both `genre-pair.jsx` and §9 as
explicitly not free. Design states no preference between the two options. That is
the correct place to leave it — it is an engineering decision, and it is made in
the plan.

## Measured against production — two corrections, applied here rather than sent back

Both are prose-and-fixture corrections. Neither changes a design call, so neither
warranted another Design round. Measured 2026-08-15 against prod (1,149 upcoming
events, 2,218 total).

### 1. The genre reorder is the majority path, not the tail

`CLAUDE_CODE_PROMPT.md` (the `SCOPE` paragraph) and README §9 both say the reorder
is a no-op in the common case — *"Buckets are wide, so that's the common case"* —
and warn that "matched genre leads" oversells a line most rows never exercise.

The distribution says the opposite:

| | count | share |
| --- | --- | --- |
| Upcoming events | 1,149 | — |
| With ≥2 genres | 587 | **51.1%** |
| ≥2 genres, reorder fires under at least one bucket | 446 | **76% of multi-genre, 38.8% of all upcoming** |
| With ≥3 genres | 2 | 0.2% |

Nearly all the volume is cross-bucket, because the tagger picks genres that live
in different buckets:

| pair | n | buckets |
| --- | --- | --- |
| `indie` + `rock` | 60 | indie / rock — cross |
| `indie` + `alternative` | 36 | indie / rock — cross |
| `indie` + `folk` | 33 | indie / folk — cross |
| `electronic` + `funk` | 19 | electronic / jazz — cross |
| `electronic` + `bass` | 16 | electronic — same |
| `funk` + `soul` | 12 | jazz — same |

Masego's `funk`/`soul` — the same-bucket exemplar the entire scope argument rests
on — is 12 events. Filter Browse by `rock` today and 60 rows come back labelled
`INDIE`.

**Consequence for the build:** the seam is load-bearing, not optional polish. The
handoff's "until the seam exists, fall back to primary-genre order" is a correct
*safety* rule and a bad *sequencing* rule — taken as sequencing it ships a
wrong-looking lead on ~39% of upcoming inventory under an active filter. The plan
therefore builds the seam in PR-A, before the pair renders anywhere.

The design call is unchanged and correct. Only the priority moves.

### 2. The zero-chip population does not exist on the surfaces named

The prompt (§2, §4) and README §8.2 justify `ROW_MIN` on the fallback-title
population: *"no Spotify match, no genre, so zero chips and no line 4."* Design
corrected the fixtures to match, giving `bassbingo` and `mainiak` `genres: []`.

Production has **zero** events with a null or empty genre array — 0 of 2,218, not
merely 0 of upcoming. The genre tagger populates every row. And `surfaces.ts` puts
`genre` in `chipPriority` for `browse`, `venue`, `related`, `crew` and `crewLens`,
so on all five, line 4 always renders at least one chip.

`ROW_MIN` is still right, and the zero-chip row is still real — it just lives on a
different surface for a different reason. **`watching`** has
`chipPriority: ['freshness', 'provenance']`, so a watched show with a fresh,
primary-source price gets no chips at all. That is the row `ROW_MIN` protects.

**Consequence for the build:** keep `ROW_MIN` and keep the distinct-height
assertion, but the height test must exercise **watching**, not a synthetic
zero-genre Browse row. The corrected fixtures model a state the crawler cannot
produce; treat them as a canvas convenience and do not port `genres: []` into a
production test as though it were a real case. Recorded so that nobody later finds
the fixtures unreachable and pulls `ROW_MIN` out with them.

## Copy pass (`copy-review` skill)

Handoff strings ship verbatim, so this is enforced here rather than at build time.

| String | Verdict |
| --- | --- |
| `Cancelled` · `Postponed` | KEEP. Plain, not apologetic, and they match the locked vocabulary. |
| `srText=" — this show has been cancelled"` | CHANGE. Two problems: a leading em-dash (rule 4), and it appends to the visible label where every shipped row a11y string **replaces** it (`EVENT_ROW_COPY.a11y.following`, `.stalePrice`). Ship as `a11y.cancelled: 'This show has been cancelled'`. |
| `srText=" — new date not announced yet"` | CHANGE, same two reasons. Ship as `a11y.postponed: 'Postponed, new date not announced yet'` — the replacing form has to carry the word itself. |
| `srText={` and ${g[1]}`}` (dropped genre) | CHANGE. This one legitimately *appends* to a visible label, so it is the exception to the pattern above and stays additive — but drop the leading space-and-em-dash style and keep it as `` ` and ${g[1]}` ``, which is already what it does. Verdict: KEEP as written. |
| `listed as "…"` (fallback title's future home) | Out of scope — not designed yet, and explicitly flagged as such. Do not invent it. |

No em-dashes survive in rendered copy. Comment-level em-dashes are out of scope.

**R3.3 — applied to the prototype, not just recorded.** The two `srText` strings
above were corrected in `row-overflow.jsx:186,189` so nobody copies the em-dash
form into production. Sweeping the class turned up two more the copy pass had not
listed: the Resale and Community provenance chips in `row-overflow.jsx:116` and
`event-row.jsx:125`, both reading `" price — secondary market, not face value"`.
Production already ships these right — `copy.ts:792,794` have them standalone and
em-dash-free — so the prototype was the stale copy, not the spec. Both now match
shipped.

## Carry into the build — not another design round

1. **`EventTitleBlock` is shared with event detail.** The row renders it with
   `surface="card"` (`EventRow.tsx:122`), and event detail renders the same
   component at `hero`/`detail`. Every element this handoff removes from the row —
   the `StatusPill` + tour-name row above the title (`:72-88`), the struck title
   (`:101-107`), the `fallbackTitle` paragraph (`:136-143`) — lives in that one
   component. The handoff speaks only about the row, so the plan has to decide the
   split rather than inherit it. See plan PR-B: the row gets its own title line and
   `EventTitleBlock` keeps `hero`/`detail`.
2. **The struck title is deleted on event detail too.** The handoff scopes its
   argument to the row, but the reasoning — a strike voids a claim that became
   false, and the artist's name did not become false — is not row-specific, and
   detail already states the status in a `StatusPill`. Ruled in engineering rather
   than sent back, and recorded here because it is a visible change to a surface
   the handoff does not name.
3. **`fallbackTitle` keeps its current event-detail rendering.** Its designed home
   (`listed as "…"`) does not exist yet. Removing it from the row while its new
   treatment is unspecified must not also remove it from detail, or the string
   becomes unreachable in the product. Leave `:136-143` alone on `detail`.
4. **The `artist` surface is new, and it collides with an open design question.**
   The handoff adds `artist` to the surface table with `carries: ['artist']` and
   `chipPriority: ['genre']`. Production has no such surface — the artist page uses
   its own `artist-page/ShowRow.tsx`. That component is the subject of
   [#1418](https://github.com/HartiganHM/concert-crawl/issues/1418), which asks
   whether it becomes a `SURFACES` entry or stays a deliberate dialect. This
   handoff answers it — it becomes a surface — so #1418 closes with this epic.
5. **`related` chip priority.** The prototype's `OVF_SURFACES.related` has
   `meta: ["genre"]`; shipped `surfaces.ts` has `['following', 'genre']`. Silent
   divergence, and it now matters because height is reserved per surface. Shipped
   config wins — the prototype is the simplification, not the ruling.
6. **`crew` and `crewLens` are absent from the prototype's surface table.** Both
   exist in production and both need `ROW_MIN` constants. Derive them the same way
   as the rest; do not leave them falling through to a Browse default.
7. **Derive `ROW_MIN`, don't copy it.** The handoff says this itself. The mock's
   numbers come from mock type metrics.

## Nits

Most of these were applied in this verdict PR rather than recorded and left —
a stale headline that contradicts the spec is something an implementer builds
to, and the same argument covers a dead citation or a prototype comment that
asserts something production contradicts. They are marked **FIXED**.

- **FIXED.** The prompt contradicted itself on the headline outcome: the `THE CALL`
  paragraph said *"Row height must still take exactly TWO values per geometry"*
  while §4 says *"ONE height per geometry"* and the verification step asserts
  *"the distinct set is 1"*. The `TWO` was stale from R1, which folded the
  support-line state into the count. `THE CALL` now reads ONE value per geometry,
  with the geometry defined as a width paired with a support-line state.
- **FIXED.** `genre-pair.jsx:6-9` and the prompt's §5 cited `filter-system.jsx`'s
  `hasGenre` / `.some()` as the reason a multi-genre act is already findable.
  `filter-system.jsx` is mock code and the symbol does not exist in the repo; the
  production mechanism is Postgres array overlap (`events.ts:297-310`). Same
  conclusion, working citation. Both now point at the route.
- **FIXED.** `overflow-data.jsx` asserted in three comments (`:15-17`, `:44`,
  `:74-75`) that the genre-less rows are a *production* population. Per §2 above
  they are not — that is exactly the correction this verdict records, and leaving
  the fixture comments claiming otherwise is how it gets un-learned. All three now
  name themselves canvas-only and point at `watching` as the reachable case.
- **FIXED.** The prompt's `DATA` block listed `cancelled` / `postponed` as members
  of `status`, flattening two axes the production model keeps apart — `lifecycle`
  is whether the show is happening, `status` is the price state, and
  `PriceStack.tsx` already reads them separately. The precedence resolver spans the
  pair, so an implementer building to the flattened shape would widen `status`
  wrongly. The block now shows the split. (The plan was already correct here.)
- The prompt's problem statement says 233 of 1,125 upcoming events; today's count
  is 1,149. Inventory drift over two days, not an error.
- `VIBE_BUCKETS` in `genre-pair.jsx` is a five-bucket mock and its sub-genres
  (`fusion`, `idm`, `psych`, `indie-rock`) are not values the tagger produces, nor
  is `loud` a bucket. Labelled as a mock, so this is only a warning against
  copying it.
- **FIXED.** The `README` header read `R3.2 measure-pass fix` while the body carried
  R3.3. Header now names the R3.3 round.
- **FIXED.** `spotify-shared.jsx`'s `SpotifyLogo` used a native `title=` on the logo placeholder,
  which `cc-tip.jsx:29` names as banned by project convention. Dropped; the
  placeholder's purpose was already documented in the comment above it. The
  remaining `title=` attributes in `design-canvas.jsx` are on canvas chrome —
  drag handles and focus buttons — which is prototype tooling, not product
  surface, and is out of scope for the convention.
- **NOT FIXED, deliberately.** `tweaks-panel.jsx` handles `postMessage` without
  validating `event.source` and posts with `targetOrigin: '*'` (`:149`, `:192`,
  `:196`). Ruled out of scope on two grounds. It is Design's canvas tooling, not
  product surface — the panel exists to drag sliders in a local prototype and
  nothing in it ships. And the file is **byte-identical across 14+ handoff
  directories**; patching this one copy forks it from every sibling and buys no
  safety, since the threat requires hosting a prototype cross-origin, which we
  don't do. If these prototypes are ever hosted, fix it once at the source Design
  distributes, not here.
