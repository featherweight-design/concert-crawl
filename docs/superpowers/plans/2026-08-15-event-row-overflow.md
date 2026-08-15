# Event Row overflow — tour name, fallback title, lifecycle status, genre pair — Implementation Plan

**Ticket:** none as a parent. Closes [#1418](https://github.com/HartiganHM/concert-crawl/issues/1418) (does the artist page's `ShowRow` become a `SURFACES` entry, or stay a deliberate dialect) — this handoff answers it: it becomes a surface. Phase **beta** · Priority **normal**.
**Design handoff:** `design/design_handoff_event_row_overflow/` — 🟢 Green at R3.3, verdict in `READINESS.md` (this branch). R1 🟡 → R2 → R3 → R3.2 → R3.3.
**Eng kickoff brief:** `design/design_handoff_event_row_overflow/CLAUDE_CODE_PROMPT.md`
**Amends:** `design/design_handoff_event_row_system/`, shipped in PRs #1430 / #1436 / #1445 and planned in `docs/superpowers/plans/2026-08-03-event-row-system.md`.

**Goal:** Give the three facts that currently render *outside* the four-line contract a slot inside it — or no slot at all — so a row's height stops depending on its data. The tour name becomes a measured clause on line 1, the legacy fallback title leaves the row, and lifecycle status moves into the price slot as a chip. Two genres share one chip. Every geometry then has exactly **one** height.

**Architecture:** No schema change, no migration, no new API route. One package lift (`genre-buckets` → `packages/types`), one component split (`EventTitleBlock` stops serving the row), and three additions inside the existing `event-row/` folder — a title line that measures, a `ROW_MIN` per surface, and a paired-genre collapse step folded into `MetaRow`'s existing fit pass. One new `SURFACES` entry (`artist`) absorbs `artist-page/ShowRow.tsx`.

---

## What the production audit found that the handoff does not say

The handoff was written against the design prototypes, and `READINESS.md` records the verdict. Six things about the shipped code materially change the plan; two of them invert a premise the handoff reasons from, and one is a live bug. **Read this section before the task list.**

### 1. The genre reorder is the majority path, not the tail

The handoff's `SCOPE` paragraph and README §9 both argue the reorder is a no-op in the common case — *"Buckets are wide, so that's the common case"* — and caution that "matched genre leads" oversells a line most rows never exercise. Measured against prod on 2026-08-15 (1,149 upcoming events, 2,218 total), the distribution is the opposite:

| | count | share |
| --- | --- | --- |
| Upcoming events | 1,149 | — |
| With ≥2 genres | 587 | **51.1%** |
| ≥2 genres, reorder fires under at least one bucket | 446 | **76% of multi-genre, 38.8% of all upcoming** |
| With ≥3 genres | 2 | 0.2% |

The tagger picks genres that live in *different* buckets. `indie`+`rock` is 60 events, `indie`+`alternative` 36, `indie`+`folk` 33 — all cross-bucket. Masego's `funk`/`soul`, the same-bucket exemplar the whole scope argument rests on, is 12. Filter Browse by `rock` today and 60 rows come back labelled `INDIE`.

**Consequence:** the handoff's *"until the seam exists, fall back to primary-genre order"* is a correct **safety** rule and a bad **sequencing** rule. Read as sequencing it ships a wrong-looking lead on ~39% of upcoming inventory under an active filter. The seam is therefore PR-A, before the pair renders anywhere. The design call is unchanged; only its priority moves.

### 2. The zero-chip row exists, but not where the handoff says

The prompt (§2, §4) and README §8.2 justify `ROW_MIN` on the fallback-title population — *"no Spotify match, no genre, so zero chips and no line 4"* — and Design corrected the fixtures to match, giving `bassbingo` and `mainiak` `genres: []`.

Production has **zero** events with a null or empty genre array. Not 0 of upcoming: 0 of 2,218. And `surfaces.ts` puts `genre` in `chipPriority` for `browse`, `venue`, `related`, `crew` and `crewLens` — so on all five, line 4 always renders at least one chip.

`ROW_MIN` is still right and the zero-chip row is still real. It lives on **`watching`**, whose `chipPriority` is `['freshness', 'provenance']` — a watched show with a fresh, primary-source price gets no chips at all, and `MetaRow.tsx:70` returns `null`.

**Consequence:** keep `ROW_MIN`, keep the distinct-height assertion, but the height test exercises **watching**. The `genres: []` fixtures model a state the crawler cannot produce; they are a canvas convenience and must not be ported into a production test as though they were a real case.

### 3. `EventTitleBlock` is shared with event detail

`EventRow.tsx:122` renders `EventTitleBlock` with `surface="card"`. Event detail renders the *same component* at `hero` and `detail`. Every element this handoff removes from the row lives in that one file:

- `EventTitleBlock.tsx:72-88` — an entire extra row above the title holding `StatusPill` + tour name
- `:101-107` — the struck title (`textDecoration: 'line-through'`, gated on `status === 'cancelled'`)
- `:136-143` — the `fallbackTitle` paragraph, gated by `isLegacyRow && !!fallbackTitle && fallbackTitle !== headliner`

The handoff speaks only about the row. **The plan decides the split rather than inheriting it:** the row gets its own title line (PR-B), and `EventTitleBlock` keeps `hero` and `detail` with the `card` branch deleted.

Two consequences follow, both ruled here rather than sent back to Design:

- **The struck title is deleted on event detail too.** The handoff scopes its argument to the row, but the reasoning — a strike voids a claim that became false, and the artist's name did not become false — is not row-specific, and detail already states the status in a `StatusPill`. This is a visible change to a surface the handoff does not name; it is flagged in the PR body.
- **`fallbackTitle` keeps its current event-detail rendering.** Its designed home (`listed as "…"`) does not exist yet and is explicitly out of scope. Removing it from the row while its new treatment is unspecified must not also remove it from detail, or the string becomes unreachable in the product. `:136-143` is left alone on `detail`.

### 4. `soldout` is checked before cancelled/postponed — a live bug

`PriceStack.tsx` computes `isSuppressed = lifecycle === 'cancelled' || lifecycle === 'postponed'` (`:44-45`), then returns the sold-out chip at `:59` and only reaches `if (isSuppressed) return slot(null)` at `:67`. **A cancelled sold-out show currently reads "Sold out" in production.** The handoff's precedence ladder fixes it as a side effect; the plan treats it as a bug with its own regression test, and the `bothstates` fixture covers it.

### 5. `related` chip priority diverges silently

The prototype's `OVF_SURFACES.related` has `meta: ["genre"]`; shipped `surfaces.ts` has `['following', 'genre']`. Harmless until now — but `ROW_MIN` reserves height *per surface*, so a wrong `chipPriority` produces a wrong constant. **Shipped config wins.** The prototype is a simplification, not a ruling. Same class: `crew` and `crewLens` are absent from the prototype's surface table entirely and both need constants derived, not defaulted to Browse.

### 6. The genre seam is API-only

`apps/api/src/lib/genre-buckets.ts` holds the 16-bucket taxonomy and its `expandBucket` / `bucketForGenre` / `bucketsPresentIn` helpers. The web app never sees it — it only ever holds the bare `filterVibe` string from the URL. `apps/api/src/routes/events.ts:296-310` expands the bucket server-side and queries with Postgres array overlap:

```ts
const genreValues = expandBucket(filterVibe)
conditions.push(sql`${events.genre} && ARRAY[${genrePlaceholders}]::text[]`)
```

Design flagged the seam as "not free" and stated no preference between lifting the map or having the API report which sub-genre matched. **That is an engineering call and it is made here: lift the map.** `packages/types` already ships runtime values (`CREW_MEMBER_CAP`, `GUIDE_CHIP_ORDER`, `mapDeclineCategory`), the taxonomy is a static 161-line constant with no I/O, and the alternative adds a per-row field to two API responses to serve one UI concern. The lift has exactly three importers (`routes/events.ts`, `routes/artists-public.ts`, and the co-located test).

Note also that `genre-pair.jsx:6-9` and prompt §5 cite `filter-system.jsx`'s `hasGenre` / `.some()` as the reason a multi-genre act is already findable. The conclusion is right; the mechanism is array overlap. Do not go looking for a `.some()` that does not exist.

---

## Global Constraints

- **TDD** — every pure function lands with its test in the same task. `orderGenres`, the precedence resolver and the title-clause fit helper are all pure and are tested directly, not only through the DOM. The measure passes are the risk in this feature, exactly as they were in the parent plan.
- **The four-line contract is unchanged.** Line 1 artist · line 2 `with {supports}` · line 3 `when · where` · line 4 meta chips. Rule 1 (context subtraction per surface), Rule 2 (two-chip budget, one when a support line is present), the meta budget, the line-3 drop ladder and the narrow step are all untouched by this epic. Nothing here adds a fifth line, and nothing here renders above line 1 or below line 4.
- **One height per geometry.** The prompt contradicts itself — its `THE CALL` paragraph says *"exactly TWO values per geometry"* while §4 says *"ONE height per geometry"* and the verification step asserts *"the distinct set is 1"*. **ONE is correct**; the `TWO` is stale from R1. The verification asserts a distinct set of size 1.
- **Dim and strike are generic "something's wrong" cues, not per-state encodings.** `struck = cancelled || postponed`; `dimArt = struck || soldout`. The **chip** disambiguates, and it lives in the price slot so it is always present and can never be dropped by the meta fit pass. Do not raise redundancy or non-distinctiveness findings against these two signals.
- **Vocabulary is locked** — **Watching**, never Saved / Favorites / Following. The Watching affordance is the lucide **`Eye`**; no heart icon exists in this codebase and none is introduced.
- **Tokens only** — every color reads `var(--*)`. No hex in screen code, no Tailwind `dark:` variants. Chip tones contrast-checked on all **nine** production themes (`userThemeEnum`), not the mock's three.
- **No literal customer-facing strings in JSX** — everything into `event-row/definitions/copy.ts`. Any PR touching a `copy.ts` runs the `copy-review` skill before opening.
- **The handoff's two `srText` strings ship corrected, not verbatim.** `READINESS.md` records the copy pass. Both `" — this show has been cancelled"` and `" — new date not announced yet"` lead with an em-dash (banned) and *append* to the visible label, where every shipped row a11y string **replaces** it (`RowMetaChip`'s `srLabel` prop is documented as "Replaces the visible label for screen readers"). Ship as:
  - `a11y.cancelled: 'This show has been cancelled'`
  - `a11y.postponed: 'Postponed, new date not announced yet'` — the replacing form has to carry the word itself.

  The dropped-genre `srText` is the one legitimate *appender* (it adds to a visible label rather than replacing it) and stays additive as `` ` and ${g[1]}` ``.
- **No native `title=` tooltips.** Context the visible text does not carry goes in screen-reader-only spans.
- **TypeScript strict, no `as` casts.** `GenreBucket` and `isGenreBucket` already exist and move with the lift; narrow with the guard.
- **Mobile/desktop parity in the same PR** — non-negotiable. 320 baseline.
- **a11y in the same PR** — chips dropped by the measure pass are `aria-hidden` and stay mounted out of flow so the measure stays stable; 44×44 minimum targets; status never rides on color alone; the `/` between paired genres is `aria-hidden` decoration.
- **Components** — arrow components, no `handle*` handler names, logic in `lib/`, semantic HTML.
- **Termination safety is a hard requirement, not a nicety.** See "The measure-loop contract" below.
- **Pre-push in the worktree:**
  ```
  pnpm turbo run build --filter=@concert-crawl/types --filter=@concert-crawl/db
  pnpm --filter @concert-crawl/api typecheck && pnpm --filter @concert-crawl/api lint && pnpm --filter @concert-crawl/api test
  pnpm --filter @concert-crawl/web typecheck && pnpm --filter @concert-crawl/web lint && pnpm --filter @concert-crawl/web test
  ```
  `apps/api` integration tests run against `packages/db`'s built `dist` — a `packages/db` source change is invisible to the suite until you rebuild. Same trap applies to `packages/types` in PR-A.
- **`DATABASE_URL_TEST`** — per-worktree test DB, auto-derived. Never the shared `concert_crawl_test`.
- **Release notes** — PR-C and PR-D are the user-visible ones. One combined entry in `apps/web/src/lib/definitions/releases.ts`, landing with PR-D. PR-A and PR-E are invisible in isolation; no entries.
- **`progress.md`** — one ✅ row lands with PR-E.

### The measure-loop contract

Three of the passes in this epic observe an element whose size their own state change can alter. An uncapped version of this killed the page three times during prototyping with no console error, which is why the prompt specifies a state machine rather than a debounce. Every measure pass added or edited in this epic obeys all five rules:

1. **Observe a parent-driven box, never the box you resize.** The tour clause observes the title *column* (`boxRef`), whose width is set by the parent. `MetaRow` already observes its own container — that container's *width* is parent-driven even though its *height* churns, which rule 2 handles. Same fix applied to `WhenWhere`.
2. **Width guard.** Toggling a chip between in-flow and absolute changes the meta line's own height, so a `ResizeObserver` on that box re-fires on its own mutation. Ignore any callback where `Math.abs(w - lastWidth) < 1`.
3. **Coalesce with `requestAnimationFrame`.** One measurement per frame maximum; cancel any pending frame on the next callback and on unmount.
4. **Two ceilings, and nothing resets the outer one.** A per-mount write budget of **12** state writes that only a remount clears, plus a per-width episode cap of **3** collapse steps that resets when the observed width actually changes. The inner cap makes a normal resize responsive; the outer one makes a pathological layout terminate. A single cap gives you one or the other.
5. **`ResizeObserver` may be absent.** First pass runs unconditionally; live remeasurement is an enhancement. `if (typeof ResizeObserver === 'undefined') return` — the existing `MetaRow` already does this and the new passes match it.

---

## Sequencing lock

**PR-A → PR-B → PR-C → PR-D → PR-E, strictly serial.** These touch overlapping files and each depends on the one before; do not parallelise.

- **A before D** because the reorder is the 38.8% path (finding 1), and a pair that renders before the seam exists ships a wrong-looking lead on the majority of filtered inventory.
- **B before C** because the status chip cannot move into the price slot while `EventTitleBlock` is still rendering a `StatusPill` above the title on the row — the two would double up.
- **C before D** because both edit `PriceStack`/`MetaRow` and the precedence ladder must be settled before the genre chip starts competing for budget.
- **E last** because `ROW_MIN` is derived from the *finished* type metrics. Deriving it earlier measures a row that no longer exists.

---

## PR-A — Lift the genre taxonomy into `packages/types`

No user-visible change. Pure move plus a client-side membership helper.

### Task A1 — Move `genre-buckets.ts`

Move `apps/api/src/lib/genre-buckets.ts` (161 lines) and its co-located test to `packages/types/src/genre-buckets.ts` / `.test.ts`, re-exporting `GENRE_BUCKETS_SOURCE`, `GenreBucket`, `isGenreBucket`, `BUCKET_LABELS`, `bucketForGenre`, `expandBucket`, `bucketsPresentIn` from `packages/types/src/index.ts`. Update the three importers: `apps/api/src/routes/events.ts:67`, `apps/api/src/routes/artists-public.ts:37`, and the test. The API keeps importing the same names from `@concert-crawl/types`; no behavior changes and the existing bucket tests must pass unmodified — that is the whole safety property of this task.

Do **not** leave a re-export shim at the old path. Three importers is a complete sweep; a shim is a backwards-compatibility hack for a caller that does not exist.

### Task A2 — `bucketMembersFor`

Add to `packages/types/src/genre-buckets.ts`:

```ts
export function bucketMembersFor(filterValue: string | null | undefined): readonly string[] | null
```

Returns `expandBucket(value)` when `isGenreBucket(value)`, else `null`. A `null` return is the handoff's explicit safety fallback: no reorder, never a wrong reorder. Test the three cases — a valid bucket, an unknown string, and `null`/`undefined`.

### Task A3 — Thread `filterVibe` to the row

`apps/web/src/app/(protected)/(main)/events/page.tsx` already reads `params['filterVibe']` (`:84`, `:447`). Pass it through `EventsList` to `EventRow` as an optional `filterVibe?: string` prop. `EventRow` resolves membership once via `bucketMembersFor` and hands the result down; the chip builder never parses the taxonomy itself.

Only Browse has a Vibe filter. Every other surface passes nothing and gets `null`, which is the no-reorder path. Do not invent a filter context for surfaces that have none.

**Verify:** `pnpm --filter @concert-crawl/api test` green with zero changes to `genre-buckets.test.ts` assertions. `packages/types` builds before the API typechecks.

---

## PR-B — The row gets its own title line

Splits `EventTitleBlock`, and gives the tour name a measured clause.

### Task B1 — `RowTitleLine`

New `apps/web/src/components/consumer/event-row/RowTitleLine.tsx`. Line 1 only: the headliner, optionally followed by a tour clause. No `StatusPill` row above it, no `fallbackTitle` paragraph below it, no strike. The `card` ramp values (`head: 15`, `tour: 9`, `gap: 2` — `EventTitleBlock.tsx:10-14`) move here as the row's own constants; the row no longer reads `RAMP`.

### Task B2 — The measured tour clause

The tour name renders inline after the headliner, and drops **whole** when the line cannot hold both — the same measured-degradation pattern `WhenWhere` and `MetaRow` already use, and the same reason: a half-rendered tour name reads as a bug rather than a rule.

The observer watches the title **column** (`boxRef`), whose width is parent-driven — not the clause, which is the node the state change resizes. This is the R1 finding and it is closed in the prototype; the implementation must not reintroduce it. Full measure-loop contract applies: width guard, rAF coalescing, 12-write mount budget, 3-step width episode cap.

Extract the fit decision as a pure function in `lib/` with its own test, following `fitChips`. The DOM test covers the wiring; the unit test covers the arithmetic.

### Task B3 — `fallbackTitle` leaves the row

Remove the legacy fallback paragraph from the row's path entirely. `EventRowShow.fallbackTitle` stays on the model (`row-model.ts:51`) — it is still assigned at `:158` and the detail surface still needs the underlying field — but the row does not render it. Its designed home (`listed as "…"`) is not designed yet and is **not invented here**.

### Task B4 — `EventTitleBlock` keeps `hero` and `detail`

Delete the `card` branch and the `surface="card"` ramp entry. Delete the struck-title styling at `:101-107` on **all** surfaces (finding 3 — ruled in engineering, flagged in the PR body as a visible change to event detail). Keep `:136-143`, the `fallbackTitle` paragraph, on `detail`. Update `EventRow.tsx:114-146` to render `RowTitleLine`.

After this task `EventTitleBlock` has two surfaces, not three, and `maxInline` no longer has a `card` caller — check whether it still earns its place on the remaining two and delete it if not.

**Verify:** event detail renders unchanged except for the strike. Row height on a tour-name row equals row height on a non-tour row at the same geometry.

---

## PR-C — Lifecycle status into the price slot

Fixes the live bug in finding 4 and gives cancelled/postponed a real slot.

### Task C1 — The precedence resolver

Pure function in `lib/`, tested directly:

```
cancelled > postponed > soldout > presale > price
```

`cancelled` and `postponed` come off `show.lifecycle`; `soldout` and `presale` off `show.status`. One resolver returns one discriminated result and `PriceStack` renders it — replacing the current sequence of early returns, which is what let `soldout` win at `PriceStack.tsx:59` before suppression was consulted at `:67`.

**The regression test is not optional.** A cancelled sold-out show must render `Cancelled`. The `bothstates` fixture covers it; assert on the rendered chip, not on the resolver alone.

### Task C2 — The chips

`Cancelled` and `Postponed` render as `RowMetaChip`s in the **price slot**. That is deliberate and is the reason they can never be dropped: the price slot is outside the meta budget and outside `MetaRow`'s fit pass. They are the one thing that tells the user *which* problem the dim and the strike are gesturing at.

Copy ships as-is (`Cancelled`, `Postponed` — plain, not apologetic, matching the locked vocabulary). The a11y strings ship in the corrected replacing form per Global Constraints. Tone: reuse the existing `warn`, matching sold-out; do not introduce a fifth tone for this.

### Task C3 — Strike and dim

`struck = lifecycle === 'cancelled' || lifecycle === 'postponed'` — applied to **line 3** (`when · where`), never to the artist name. `dimArt = struck || status === 'soldout'` — applied to the identity artwork, not to the row, because a row-level opacity drags `--fg-muted` toward the AA floor (the parent plan's finding, still true).

### Task C4 — Retire the row's `StatusPill`

The `StatusPill` above the title is gone with PR-B. Confirm no other row path renders it and that `StatusPill` itself survives for event detail, which still uses it.

**Verify:** all four of {cancelled, postponed, soldout, cancelled+soldout} render the right chip, the right strike and the right dim, at both geometries, on all nine themes.

---

## PR-D — The genre pair

### Task D1 — `orderGenres`

Port to `lib/order-genres.ts` as a pure function taking `(genres, bucketMembers)`. **Membership, not equality** — the filter passes a bucket label and no genre on a row is ever equal to it (finding 6). Drop the prototype's `activeGenre` + `VIBE_BUCKETS` fallback parameters entirely: `VIBE_BUCKETS` is a five-bucket mock whose sub-genres (`fusion`, `idm`, `psych`, `indie-rock`) are not values the tagger produces and whose `loud` is not a bucket at all. The real taxonomy arrives injected from PR-A. `bucketMembers === null` → return `genres.slice(0, 2)`, no reorder.

Cap is two. A third genre never renders — the pair is an identity ("a funk/soul act"), not a tag list. Only 2 of 1,149 upcoming events have three genres, so this cap costs nothing measurable.

Tests: same-bucket pair (no move), cross-bucket pair (lead moves), null members (no move), single genre, three genres (third dropped), empty array.

### Task D2 — The paired chip

`ChipSpec` (`lib/row-chips.ts:7-14`) is a pure-data module — it carries `label: string`, not nodes. Add an optional `secondaryLabel?: string` and let `RowMetaChip` render the separator when it is present:

```
{label}<span aria-hidden="true">/</span>{secondaryLabel}
```

Separator styling per the prototype (`opacity: 0.45`, `padding: '0 1px'`), and `aria-hidden` because it is decoration. This keeps the taxonomy out of the component and the nodes out of the data module, matching how `mark: 'spotify'` is already handled.

`row-chips.ts:67-70` currently reads `show.genres[0]` and discards the rest — the shipped defect Design names, and it is real. Replace with the ordered pair.

**One chip, one budget slot.** Two genre chips would spend the entire Rule 2 budget on one fact: a Browse row would lose `Following` outright, and a row with a support line could show only half its genre. Two adjacent neutral chips is also tag soup, precisely the drift Rule 2 exists to stop. A pair costs ~34px; a second chip costs a slot.

### Task D3 — Collapse inside `MetaRow`'s fit pass

The chip cannot measure itself, and the reason is worth recording because it cost a session: `MetaRow` wraps every child in its own content-sized span, so a chip inspecting `parentElement` sees a box that never overflows — and by the time the fit pass has taken a chip out of flow, the container is not overflowing either. **The chip cannot see the pressure that is about to delete it.**

So the decision lives in the component that already owns "what fits". `MetaRow` measures; if the set overflows and a paired genre chip is present, it collapses the pair **first**, re-measures, and only then starts dropping whole chips. One extra step in the existing pass — not a second measuring system — and the `paired` state lives in `MetaRow`, so there is no parent round-trip mid-measure.

The collapsed chip keeps the dropped genre in an appended screen-reader span (`` ` and ${g[1]}` ``). This is the one place the system degrades *within* a unit rather than dropping it whole, and it is deliberate: the unit is the chip, the chip survives, and what degrades is its contents — the same way line 3 shortens the date before it drops the venue.

It is width, not a breakpoint. A pair sharing the line with a `Following` chip gives up its second genre earlier than a pair with the line to itself. Measured, so nobody maintains a table of which combination fits where.

Full measure-loop contract applies, and this pass is the reason rule 2 exists: toggling `paired` changes the meta line's own *height*, so an unguarded observer re-fires on its own mutation.

### Task D4 — Release note

One combined entry in `releases.ts` covering PR-B/C/D — the row's visible changes. Run the `copy-review` skill before opening.

**Verify:** under a `rock` filter an `indie`+`rock` row leads with `ROCK`. Under no filter it leads with `indie`. Narrow geometry with a support line collapses the pair before dropping a chip. `pnpm --filter @concert-crawl/web test` green.

---

## PR-E — `ROW_MIN` and the `artist` surface

### Task E1 — Derive `ROW_MIN`, don't copy it

The handoff says this itself: the mock's numbers come from mock type metrics. Derive a constant per surface per geometry from the finished row — line-height sums plus gaps plus padding — and record the derivation in a comment so a future type change is a recalculation rather than a mystery.

Constants for **all six shipped surfaces**: `browse`, `venue`, `watching`, `related`, `crew`, `crewLens`. `crew` and `crewLens` are absent from the prototype's surface table; they exist in production and must not fall through to a Browse default. `related`'s `chipPriority` is the **shipped** `['following', 'genre']`, not the prototype's `['genre']` — height is reserved per surface, so the divergence in finding 5 now produces a wrong number if the prototype wins.

### Task E2 — The height test exercises `watching`

`ROW_MIN` protects the row that renders zero chips, and per finding 2 that row is on **`watching`** — `chipPriority: ['freshness', 'provenance']`, a watched show with a fresh primary-source price, `MetaRow.tsx:70` returning `null`. Assert the distinct set of row heights at a fixed geometry is **1**, across a fixture set that includes a zero-chip watching row and a full-chip watching row.

Do **not** port `genres: []` into a production test. Production has 0 such rows out of 2,218 and the crawler cannot produce one; the corrected fixtures are a canvas convenience. This is recorded so nobody later finds them unreachable and pulls `ROW_MIN` out with them.

### Task E3 — The `artist` surface

Add `artist` to `SURFACES` with `carries: ['artist']` and `chipPriority: ['genre']`, and convert `apps/web/src/components/consumer/artist-page/ShowRow.tsx` onto `EventRow`. The artist page carries the artist by definition, so Rule 1 subtracts it from the row.

This closes [#1418](https://github.com/HartiganHM/concert-crawl/issues/1418), which asked whether `ShowRow` becomes a `SURFACES` entry or stays a deliberate dialect. The parent plan scoped it out on the grounds that Design had never looked at the artist row; this handoff adds the surface to the table, so Design has now looked at it. Include `Closes #1418` in the PR body.

`ShowRow`'s left-hand `DateStamp` is the genuinely different thing here. If it survives, it survives as a surface-level opt-in in `SURFACES`, not as a second row component — the whole point of the config is that a new surface is a config entry.

### Task E4 — `progress.md`

One ✅ Complete row with today's date.

**Verify:** artist page renders `EventRow`; `ShowRow.tsx` is deleted, not left orphaned. Full `pnpm test` across web and api.

---

## Out of scope

- **`listed as "…"`** — the fallback title's designed home. Not designed yet and explicitly flagged as such in the handoff. Do not invent it. `fallbackTitle` keeps its current event-detail rendering until Design specifies the treatment.
- **The four-line contract, Rule 1, Rule 2, the meta budget, the line-3 ladder, the narrow step.** All unchanged. This epic is an amendment to `design_handoff_event_row_system/`, not a revision of it.
- **A density control.** `compact`/`roomy` were found dead in the parent plan and stay dead.
- **Genre tagging.** The tagger's cross-bucket behavior is what makes the reorder load-bearing (finding 1). That is data, not row rendering, and changing it is a separate question.
- **A fourth chip tone.** Cancelled and postponed reuse `warn`.

## Notes carried from the handoff that need no action

Recorded so a future reader does not chase them:

- The prompt's problem statement says 233 of 1,125 upcoming events; today's count is 1,149. Inventory drift over two days, not an error.
- `README`'s header still reads `R3.2 measure-pass fix` while the body carries R3.3.
- `VIBE_BUCKETS` in `genre-pair.jsx` is labelled a mock. Task D1 drops it; this is only a warning against copying it.
