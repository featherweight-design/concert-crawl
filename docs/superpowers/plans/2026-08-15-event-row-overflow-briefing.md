# Event Row Overflow — epic-run briefing

**Execution plan:** `docs/superpowers/plans/2026-08-15-event-row-overflow.md` (merged, PR #1582)
**Design handoff:** `design/design_handoff_event_row_overflow/` — READINESS verdict 🟢 Green at R3.3
**Design table (Gate 4 Agent 1):** `docs/superpowers/design-tables/event-row-overflow.md`
**PRs:** A → B → C → D → E, strictly serial.

This file exists to answer the three premise questions the epic-run preconditions gate
requires, and to record the rulings that came out of the Agent 1 enumeration but are not in
the plan. Everything else — scope, sequencing, task detail — lives in the plan and is not
restated here.

---

## Risk shape

**Content/data-driven**, with a measure-pass tail.

The row is fed by crawled data, so the risk is the long tail: an act with no tour name, an act
with a 60-character tour name, one genre, three genres, a cancelled show that is also sold
out. Gate 2 therefore runs with deliberately ugly fixtures, not clean ones.

The second risk is specific to this epic and is not a data risk at all: **three of the passes
observe an element whose size their own state change can alter.** An uncapped version killed
the prototype page three times with no console error. The plan's measure-loop contract (five
rules) is the mitigation, and it is a hard requirement on every pass added _or edited_ here —
including `WhenWhere`, which is edited rather than added.

Not event-driven: this epic creates no records, so **Gate 6 does not fire.** Recorded here so
its absence is a decision rather than an omission.

---

## Premise question 1 — Launch gating

**Nothing to gate. No flag, no new route, no vertical turned on.**

Every surface this epic touches is already live and already reachable by every user who can
reach it today: `browse`, `venue`, `watching`, `related`, `crew`, `crewLens`, plus the artist
page in PR-E. The epic changes how an existing row renders; it does not make anything
newly reachable.

The one surface that changes shape is the artist page (PR-E), which converts
`artist-page/ShowRow.tsx` onto `EventRow`. That page is already public and already lists
shows. Conversion changes its rendering, not its reachability, so the middleware matchers are
untouched and the auth matrix is unchanged.

**Consequence:** every PR in this epic is visible in production the moment it deploys. There
is no flag to hide a half-finished row behind, which is the real reason the sequencing lock
matters — PR-B ships a row with no lifecycle chip and PR-C ships the chip, so the intermediate
state must itself be coherent, not merely compilable. It is: PR-B's row still carries
lifecycle via strike and dim, it just names the problem one PR later.

## Premise question 2 — Off-happy-path homes

The epic introduces **no new user state**, so there is no new user to house. It does, however,
remove two things from a surface, and both need a home named:

| Removed                                      | From                         | Home afterwards                                                                                                                                                                                                                                                                                                                                                                                                   |
| -------------------------------------------- | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fallbackTitle` (the legacy listed-as title) | the row                      | **Event detail only.** `EventTitleBlock.tsx:136-143` is left alone on `detail`. The field stays on the model (`row-model.ts:51`) and stays assigned (`:158`). Its designed home (`listed as "…"`) is not designed yet and is explicitly out of scope — but removing it from the row must not make the string unreachable in the product, so detail keeps it.                                                      |
| The struck title                             | the row **and event detail** | **Nowhere — deliberately deleted.** The strike voided a claim ("this artist is playing") that did not become false. What did become false is the _date_, and line 3 carries the strike instead. Detail additionally states the status in a `StatusPill`, so no information is lost on that surface. Plan finding 3; must be called out in PR-C's body as a visible change to a surface the handoff does not name. |

The lifecycle chip is the inverse case — a state that previously had _no_ slot (cancelled and
postponed were legible only as a strike plus a dim, two generic "something's wrong" cues that
cannot tell you _which_ thing is wrong) now gets a permanent one in the price slot,
outside the meta budget and outside `MetaRow`'s fit pass, so it can never be dropped.

## Premise question 3 — Journey walk script

Five journeys. Gate 5 runs all four passes (forward / reverse / repeat / resume) on each and
records evidence in `docs/superpowers/journey-lifecycle-event-row-overflow.md`.

**J1 — Browse a filtered genre and read the lead.**

1. Sign in, go to `/events`.
2. Apply the Vibe filter `rock`.
3. Find a row whose act is tagged `indie` + `rock` (60 such events in prod).
4. The genre chip reads `ROCK / INDIE` — the _matched_ genre leads.
5. Clear the filter. The same row now reads `INDIE / ROCK` — primary order.
6. Apply a filter whose bucket contains neither genre. No reorder, no error.

**J2 — A cancelled sold-out show reads "Cancelled", not "Sold out".**

1. Find (or fixture) an event with `lifecycle: 'cancelled'` and `status: 'soldout'`.
2. The price slot reads `Cancelled`. It does **not** read `Sold out`. _(This is the live prod
   bug in plan finding 4 — currently it reads "Sold out".)_
3. Line 3 (`when · where`) is struck. The artist name is **not**.
4. The identity artwork is dimmed.
5. Open the same event's detail page. Status is stated by the `StatusPill`; the title is not
   struck.

**J3 — The tour name drops whole, never half.**

1. On a wide viewport, find a row with a tour name. It renders inline after the headliner.
2. Narrow the viewport to 320px.
3. The tour name disappears **entirely**. There is no ellipsis and no truncated fragment.
4. Widen again. It returns.
5. Repeat the narrow/widen cycle ~10 times. The row must not freeze, flicker indefinitely, or
   stop responding — this is the write-budget ceiling under test.

**J4 — The pair collapses before a chip drops.**

1. Find a Browse row with two genres _and_ a `Following` chip _and_ a support line.
2. Narrow the viewport progressively.
3. The genre pair collapses to a single genre **first**; the `Following` chip is still there.
4. Narrow further; only then does a whole chip drop.
5. The collapsed chip still announces the dropped genre to a screen reader (` and {g[1]}`).

**J5 — Every row on a surface is the same height.**

1. Go to `/watching` with at least one watched show that has a fresh, primary-source price
   (zero meta chips — `MetaRow.tsx:70` returns `null`) and at least one with a full chip set.
2. Every row is the same height. No ragged left column, no jumping as chips resolve.
3. Repeat at 320px and at desktop width.
4. Repeat on `/events`, a venue page, and an artist page (PR-E).

---

## Rulings from the Agent 1 enumeration not covered by the plan

The enumeration surfaced 22 ambiguities. Nineteen are resolved by the plan as written
(shipped-config-wins, derive-don't-copy, the measure-loop contract, the `watching` correction,
the stale-prose items). The remaining three are ruled here rather than sent back to Design,
because all three are engineering questions:

1. **Height assertion tolerance.** The plan says assert the distinct set of row heights is 1
   but does not say how heights are read. Use `offsetHeight` (integer, layout-rounded) at a
   fixed geometry with a fixed font stack. `getBoundingClientRect().height` returns
   sub-pixel values that differ harmlessly between rows and would make a correct
   implementation fail. Exact equality on `offsetHeight`, no tolerance window.

2. **A _dropped_ genre chip needs no screen-reader text.** The enumeration notes the handoff
   specifies SR text for the _collapsed_ pair but not the dropped chip. That is correct as
   specified: a dropped chip leaves the flow entirely and is `aria-hidden`, exactly as every
   other chip the fit pass drops. The collapse case is special precisely because the chip
   survives and only its contents degrade. No new string.

3. **Task A3's prop threading moves from PR-A to PR-D.** The plan puts "thread
   `filterVibe` to the row" in PR-A, but nothing reads it until PR-D builds the pair, so
   in PR-A it is an unused parameter — dead code that `@typescript-eslint/no-unused-vars`
   rejects and that a reviewer cannot distinguish from a mistake. The plan's stated reason
   for "A before D" is that _the taxonomy must exist before the pair renders anywhere_, and
   A1 + A2 satisfy that in full: `bucketMembersFor` ships in `packages/types` in PR-A and
   PR-D imports it. The sequencing lock is intact; only the prop moves to the PR that reads
   it. Recorded because a later reader will otherwise find A3 apparently skipped.

   One refinement carried with it: `EventsList` is already a `'use client'` component
   calling `useSearchParams()`, so PR-D reads `filterVibe` there rather than accepting it as
   a server prop from `events/page.tsx`. A server prop would go stale against client-side
   filter changes, which the list already re-fetches on.

4. **Prototype-only props are not ported.** `TitleLine`'s `cancelled` prop is declared, passed
   and never read; `fixedHeight` is a canvas affordance the prototype's own comments describe
   as such; `mainiak`'s `price: null` is decorative under the precedence ladder. None of the
   three crosses into production code.

---

## Hard pauses

- Any production database migration. **This epic has none** — no schema change, no migration,
  no new API route. If one appears, the premise has changed and the run stops.
- Anything that would remove `fallbackTitle` from event detail, or invent the `listed as "…"`
  treatment. Both are explicitly out of scope; inventing the treatment is a Design call.

## Done means

- All five PRs merged at the full Copilot bar.
- Gates 1–4 passed with committed artifacts on every UI PR (B, C, D, E); Gate 5 on all five
  journeys; Gate 7 on every PR touching `copy.ts` or `releases.ts`. Gate 6 does not fire.
- The mid-run cold-eyes review ran after PR-D (the first point the row is visibly complete
  end-to-end) and its triage list is closed.
- One combined `releases.ts` entry covering B/C/D, landing with PR-D. One `progress.md` row,
  landing with PR-E. `Closes #1418` on PR-E only.
- The live "cancelled sold-out reads Sold out" bug is fixed with its own regression test.
- Validated on the real staging URL, not just CI green.
