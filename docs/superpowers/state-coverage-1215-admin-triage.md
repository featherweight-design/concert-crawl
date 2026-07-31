# State Reachability Audit — Admin Triage Panel (#1215)

Diffs the shipped producer (`GET /v1/admin/triage`, PR 2, on `main`) against the designed
consumer (`design/design_handoff_admin_triage/`) before PR 3 ports the panel.

The question this document answers is **not** "does the component look right when handed the
right props". It is: **can production hand it those props at all, and with what values.**
Across the last three feature runs roughly half the leaked UI bugs were states that rendered
perfectly in the mock and were unreachable — or fields the copy layer interpolated that the
payload never supplied, which renders `undefined` to the user.

Producer under audit:

- `apps/api/src/routes/admin/triage.ts` — route + `triageResponseSchema` (the wire contract)
- `apps/api/src/routes/admin/lib/triage.ts` — `deriveFaults`, `deriveSweep`, `orderFaults`,
  `formatDuration`, `classifyCrawlError`
- `packages/crawler-core/src/lib/triage-conditions.ts` — the shared thresholds
- `apps/api/src/routes/admin/triage.integration.test.ts` — proof of end-to-end producibility

Consumer under audit:

- `design/design_handoff_admin_triage/triage-panel.jsx`, `triage-copy.jsx`,
  `triage-data.jsx`, `triage-icons.jsx`, `README.md`
- `docs/superpowers/design-tables/1215-admin-triage.md` (the ~45-element / 40-state
  enumeration, used here as the checklist)

Verdict key:

- ✅ reachable — production can produce it, with the producing code cited
- ⚠️ reachable only under a named condition
- ❌ unreachable — designed, nothing in production produces it
- 🔴 contract gap — the copy or component reads a field the payload does not supply, or
  supplies as `null`, and the mock has no handling for it

---

## 0. The worked example of the class

`triage-copy.jsx:68` interpolates `d.wasWhen` into
`` `… was ${d.expected}/${d.expected} on ${d.wasWhen}` ``. When PR 2 was first written the
coverage evidence payload had no `wasWhen` at all, so that line would have rendered
`was 14/14 on undefined` in production while looking correct in the mock — the exact failure
mode this audit exists to catch. It was found in review and fixed:
`apps/api/src/routes/admin/lib/triage.ts:204` now declares `wasWhen: string | null`, and
`triage.integration.test.ts:414` asserts the key is _present and null_ rather than absent,
precisely because an absent key renders `undefined`.

**The semantics deliberately differ from the fixture.** The API supplies the day the gap was
_first detected_ (`venues.lastUrlCoverageAlertAt`, `lib/triage.ts:555-557`) — an "uncovered
since" date. It is **not** the day coverage was last complete; nothing in the schema persists
a true last-fully-covered timestamp, and the two differ by however long the venue went
uncrawled before the alert fired. This is documented at `lib/triage.ts:198-204` and tracked
by GitHub issue #1266. **PR 3 must reword the coverage detail line — do not copy the
fixture's "was 14/14 on Jul 12", which asserts a completeness the data cannot evidence.**

---

## 1. Panel-level states

| State                                            | Where it renders                               | Reachable from the shipped API?              | Evidence                                                                                                                                                                                                                                                                                                                                                     | Verdict                             |
| ------------------------------------------------ | ---------------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------- |
| All clear / empty                                | `triage-panel.jsx:334` `TriageEmpty`           | Yes                                          | `nothing = ordered.length === 0 && queues.length === 0`. Route pushes a queue row only when its total > 0 (`triage.ts:324`, `triage.ts:338`), and `deriveFaults` returns `[]` when no condition holds. Test: `triage.integration.test.ts:133` "returns the all-clear shape when nothing is wrong"                                                            | ✅                                  |
| Faults only                                      | `triage-panel.jsx:336`                         | Yes                                          | faults present, both queue totals 0                                                                                                                                                                                                                                                                                                                          | ✅                                  |
| Queues only + `FaultsClearStrip`                 | `triage-panel.jsx:357`                         | Yes                                          | Any unverified upcoming event or pending price submission with zero faults. Test: `triage.integration.test.ts:480` seeds flags against a healthy venue and asserts no faults                                                                                                                                                                                 | ✅                                  |
| Both tiers                                       | `triage-panel.jsx:336` + `:359`                | Yes                                          | Independent producers                                                                                                                                                                                                                                                                                                                                        | ✅                                  |
| One fault (singular badge copy)                  | `SummaryBadge` → `T.panel.faultCount(1)`       | Yes                                          | Most integration tests produce exactly one fault                                                                                                                                                                                                                                                                                                             | ✅                                  |
| Undense list (`< denseAt`)                       | `triage-panel.jsx:336-342`                     | Yes                                          | Default path                                                                                                                                                                                                                                                                                                                                                 | ✅                                  |
| Dense / banded (`>= denseAt`, default 7)         | `triage-panel.jsx:344-355`                     | Yes, but only in a genuinely bad week        | See §3                                                                                                                                                                                                                                                                                                                                                       | ⚠️                                  |
| Dense + mobile (line-3 detail dropped)           | `triage-panel.jsx:158`                         | Same as dense                                | Purely a `compact && dense` prop combination                                                                                                                                                                                                                                                                                                                 | ⚠️                                  |
| Badge — danger (`topTier === "hard"`)            | `triage-panel.jsx:279`                         | Yes                                          | `blocked` / `failed` faults, `CONDITION_BAND` at `lib/triage.ts:70-76`                                                                                                                                                                                                                                                                                       | ✅                                  |
| Badge — warning (`loss`)                         | `triage-panel.jsx:279`                         | Yes, only when no hard fault exists anywhere | `orderFaults` puts every hard row first (`lib/triage.ts:106-114`), so `topTier` is `loss` only when zero blocked/failed venues exist                                                                                                                                                                                                                         | ⚠️                                  |
| Badge — accent (`suspect`)                       | `triage-panel.jsx:279`                         | Yes, only when the _entire_ list is ceilings | Same ordering argument                                                                                                                                                                                                                                                                                                                                       | ⚠️                                  |
| Badge — neutral queue count                      | `triage-panel.jsx:282`                         | Yes                                          | zero faults, non-zero `queueTotal`                                                                                                                                                                                                                                                                                                                           | ✅                                  |
| Badge — success "all clear"                      | `triage-panel.jsx:283`                         | Yes                                          | Same trigger as the empty state                                                                                                                                                                                                                                                                                                                              | ✅                                  |
| `TierStrip` ink = worst band present             | `triage-panel.jsx:338`                         | Yes                                          | `window.SEVERITY[topTier].ink`; production must read the band off `fault.band`, which the API already supplies (`triage.ts:51`)                                                                                                                                                                                                                              | ✅                                  |
| Refreshing (`refreshing === true`)               | `triage-panel.jsx:312-314`, live region `:331` | **Nothing sets it today**                    | The admin dashboard is a server component: `app/(protected)/admin/page.tsx:41` `fetchDashboardData` runs on the server and `AttentionFeed` receives plain props. There is no client fetch, no polling, and no refresh handler anywhere in `components/admin/dashboard/`. The `AdminButton` at `triage-panel.jsx:310` has **no `onClick` in the mock at all** | ❌ unless PR 3 builds the mechanism |
| Idle live-region announce                        | `triage-panel.jsx:331`                         | Yes                                          | `T.a11y.announce(ordered.length, queueTotal)` needs only counts                                                                                                                                                                                                                                                                                              | ✅                                  |
| Loading (first paint)                            | —                                              | Not designed                                 | `app/(protected)/admin/loading.tsx` exists as a page-level skeleton; the panel itself has no loading state and the handoff's state table (`design-tables/1215-admin-triage.md:590-608`) does not list one                                                                                                                                                    | ❌ not designed                     |
| API error                                        | —                                              | Not designed                                 | Sibling fetches in `app/(protected)/admin/page.tsx:52-89` re-throw on failure, which would blow the **whole dashboard** to `app/(protected)/admin/error.tsx`. The panel has no degraded state                                                                                                                                                                | ❌ not designed                     |
| Panel with `faults` present but `sweep` unusable | `TriageEmpty` / `FaultsClearStrip` / header    | Yes                                          | `deriveSweep` returns `at: '—'` when there are zero crawl runs (`lib/triage.ts:665`). Copy then renders "All 11 venues crawled clean at —." and "checked —"                                                                                                                                                                                                  | ⚠️ cosmetic but real on a fresh DB  |

---

## 2. Every field every copy function interpolates

Checked function-by-function through `triage-copy.jsx` against the matching Zod variant in
`apps/api/src/routes/admin/triage.ts:58-110`.

### `evidence.blocked(d)` — `triage-copy.jsx:50-53`

| Field           | Payload                                                                                                            | Verdict                                                                                                                                                                                                                          |
| --------------- | ------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `d.status`      | `triage.ts:62` `z.number().nullable()`; sourced from `latest?.httpStatusCode ?? null` (`lib/triage.ts:456`)        | 🔴 **renders `HTTP null`** whenever the venue is blocked but its most recent run carries no HTTP status — a timeout, a Playwright crash, or a venue with zero runs inside the 30-run history window. The mock has no null branch |
| `d.refusals`    | `triage.ts:63`, from `venues.consecutiveFailures`                                                                  | ✅                                                                                                                                                                                                                               |
| `d.lastSuccess` | `triage.ts:64` `z.string().nullable()`; `lib/triage.ts:458` only sets it if a successful run exists in the last 30 | 🔴 **renders `last success null`** for a venue blocked longer than 30 runs, which is the _most_ broken case. No null branch in the mock                                                                                          |

### `evidence.failed(d)` — `triage-copy.jsx:54-57`

| Field          | Payload                                                                                                                                                                                                 | Verdict                                                                                                                                                                                                     |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `d.failures`   | `triage.ts:70`                                                                                                                                                                                          | ✅ Test `triage.integration.test.ts:289`                                                                                                                                                                    |
| `d.errorClass` | `triage.ts:71`; `classifyCrawlError` (`lib/triage.ts:277-291`) emits one of `bot_detection`, `server_error`, `timeout`, `robots_disallowed`, `network_error`, `parse_failure`, `crawl_error`, `unknown` | ✅ but see §7 — the raw snake_case identifier reaches the user verbatim, and `unknown` reads as a shrug                                                                                                     |
| `d.pauseAt`    | `triage.ts:72`; constant `FAILURE_PAUSE_AT = 3` (`lib/triage.ts:40`)                                                                                                                                    | ✅ value correct. Note the fixture says `8` (`triage-data.jsx:73`) — production says **3**, so "6 failures in a row · pauses itself at 3" is a sentence the fixture never produced and the design never saw | ⚠️  |

### `evidence.wentDark(d)` — `triage-copy.jsx:58-61`

| Field                                          | Payload                                                                                    | Verdict                                                                                                                                                                                                                                                     |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `d.count`, `d.baselineCount`, `d.avg`, `d.pct` | `triage.ts:78-81`, from `evaluateEventCountCondition` (`lib/triage.ts:509-512`)            | ✅ Test `:149`                                                                                                                                                                                                                                              |
| `d.window`                                     | `triage.ts:82`; always the constant `BASELINE_RUN_COUNT = 7` (`lib/triage.ts:513`)         | ⚠️ **it is the constant, not the actual sample size.** `evaluateEventCountCondition` fires with as few as `COLD_START_MIN_RUNS = 3` baseline readings (`triage-conditions.ts:142`), so a young venue renders "against a 7-run average" computed from 3 runs |
| `d.threshold`                                  | `triage.ts:83`; `-Math.round((1 - SOFT_DROP_RATIO) * 100)` = **−70** (`lib/triage.ts:517`) | ✅ correct — and note the fixture hardcodes `-60` (`triage-data.jsx:83`), so every mock artboard shows a number production never emits                                                                                                                      |
| copy wording "7-**day** average"               | —                                                                                          | 🔴 factually wrong. It is 7 _successful runs_, not 7 days. Reconciliation #2 in `docs/superpowers/plans/2026-07-31-1215-admin-triage-surfaces.md:74-76` requires "7-run average"                                                                            |

### `evidence.ceiling(d)` — `triage-copy.jsx:62-65`

| Field                                  | Payload                                                                                                                                   | Verdict                                                                                                                                                                             |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `d.count`                              | `triage.ts:92`; `ceiling.eventsFound` for `pinned_count`, `subject.eventsFound` for `horizon_shrank` (`lib/triage.ts:584-587`)            | ✅                                                                                                                                                                                  |
| `d.runs`                               | `triage.ts:93`; `PINNED_RUN_COUNT` (5) for pinned, hardcoded **1** for `horizon_shrank` (`lib/triage.ts:588`)                             | 🔴 for `horizon_shrank` the copy renders "**1 runs** at the same round number", which is both ungrammatical and untrue — the horizon variant is not about a repeating count at all  |
| `d.was`, `d.wasWhen`                   | `triage.ts:94-95`, both nullable; `previous` is the first prior successful run with a _different_ `eventsFound` (`lib/triage.ts:572-575`) | 🔴 **both are `null` when every one of the ≤30 history runs reports the same count** — which is the textbook long-standing pinned ceiling. Copy then renders "`null` before `null`" |
| `d.furthest`, `d.best`, `d.shrankDays` | `triage.ts:96-98`, populated only for `horizon_shrank` (`lib/triage.ts:591-600`)                                                          | 🔴 **no copy function reads any of them.** The three fields that carry the entire horizon story are supplied by the API and dropped on the floor by the copy layer                  |
| `d.series`                             | `triage.ts:99`                                                                                                                            | ✅ see §5                                                                                                                                                                           |

### `evidence.coverage(d)` — `triage-copy.jsx:66-69`

| Field                                             | Payload                                                                                             | Verdict                                                                                                                                                                                                                                                        |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `d.matched`, `d.expected`                         | `triage.ts:105-106`; `upcomingCount - uncoveredCount` and `upcomingCount` (`lib/triage.ts:551-553`) | ✅ Test `:409-411`                                                                                                                                                                                                                                             |
| `d.expected - d.matched` (arithmetic in the copy) | The API supplies `uncovered` directly (`triage.ts:107`) — the copy layer recomputes it              | ⚠️ harmless, but PR 3 should use the supplied field                                                                                                                                                                                                            |
| `d.wasWhen`                                       | `triage.ts:108` nullable                                                                            | 🔴 see §0. Null on any venue that has not yet been stamped with `lastUrlCoverageAlertAt`, which is the default state for a gap the panel detects _before_ the nightly alert job runs. Test `:414` pins `null` explicitly. Copy also states the wrong semantics |

### `queues.*` — `triage-copy.jsx:88-97`

| Field                                                  | Payload                                                                       | Verdict                                                                                                                                                                                                          |
| ------------------------------------------------------ | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `q.count`, `q.breakdown`, `q.kind`, `q.action`, `q.id` | `triage.ts:112-118`                                                           | ✅                                                                                                                                                                                                               |
| **`q.glyph`** — read at `triage-panel.jsx:194`         | **Not in `queueSchema`.** Only the fixture has it (`triage-data.jsx:148,150`) | 🔴 contract gap. `TriageIcon` falls back to `paths[undefined] \|\| null` (`triage-icons.jsx:30`), so the failure is a silently empty 24px tile rather than the word `undefined` — a blank box in every queue row |
| `T.queues.empty` = "Both queues are clear."            | Never rendered by `triage-panel.jsx`                                          | ❌ dead copy — the empty state uses `T.empty.body` instead                                                                                                                                                       |

### `empty.*` / `panel.*` / `persistence.*` / `a11y.*`

| Field                                                                                   | Payload                                                                   | Verdict                                                                                                                                                                                                            |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `T.empty.body(d)` → `d.venues`, `d.at`, `d.events`                                      | `sweepSchema` `triage.ts:120-126`                                         | ✅ (`at` can be `'—'`, see §1)                                                                                                                                                                                     |
| `T.empty.aside(d)` → `d.next`                                                           | `triage.ts:125`; `nextNightlySweep` is DST-safe (`lib/triage.ts:687-700`) | ✅                                                                                                                                                                                                                 |
| `T.empty.faultsClearStrip(d)` → `d.venues`, `d.at`                                      | same                                                                      | ✅                                                                                                                                                                                                                 |
| `T.panel.syncedAt(sweep.at)`                                                            | same                                                                      | ✅                                                                                                                                                                                                                 |
| `sweep.atIso`                                                                           | Supplied at `triage.ts:123`, **read by nothing in the mock**              | ⚠️ unused by design; PR 3 should use it for a `<time dateTime>`                                                                                                                                                    |
| `T.persistence.a11y`, `T.persistence.fresh`                                             | Never called in `triage-panel.jsx`                                        | ❌ dead copy                                                                                                                                                                                                       |
| `T.a11y.panelLabel`, `faultsHeading`, `queuesHeading`                                   | Never called in `triage-panel.jsx`                                        | ❌ dead copy                                                                                                                                                                                                       |
| `T.a11y.rowLabel(venue, verb, stat, dur, tier)`                                         | All from payload (`venue`, `dur`, `band`)                                 | ✅ — note `stat` inherits every 🔴 above, so a `null` leaks into the screen-reader sentence too                                                                                                                    |
| `T.a11y.evidenceChart({window: series.length, series, count})` (`triage-panel.jsx:130`) | ✅ fields present                                                         | ⚠️ wording: "Daily event counts for the last N **days**" while `N` is `series.length`, a count of _runs_. Same run-vs-day error as reconciliation #2, and it is **not** covered by the plan's four reconciliations |

---

## 3. `denseAt` (default 7) — is banding reachable?

**Yes, and with far fewer than 7 broken venues.** There are roughly 11 verified venues today
(`docs/superpowers/plans/2026-07-31-1215-admin-triage-surfaces.md:127`; I did not query prod
to confirm the exact figure). A naive reading — "7 faults needs 7 of 11 venues broken" —
would make the banded treatment near-unreachable. It is wrong.

`deriveFaults` emits **at most one** row for a venue in the hard band (`lib/triage.ts:461`
and `:486` both `continue`), but a venue that is _not_ hard-broken can emit **three rows
simultaneously**: `wentDark` (`lib/triage.ts:502`) does not short-circuit, and control falls
through to `coverage` (`:544`) and then `ceiling` (`:576`). The only gate between them is
`if (subject.eventsUsable === 0) continue` (`lib/triage.ts:527`), which excludes the
went-dark-to-zero case but not `dropped_sharply`.

So the ceiling on simultaneous faults is roughly `3 × venues`, ≈33 today, and 7 faults is
reachable from **3 venues** in the right state. The banded treatment is a real state and
must be built and tested.

The 16-fault `highVolume` fixture (`triage-data.jsx:188-194`) is inflated but structurally
honest — it happens to use 16 distinct venues, which production would not, but nothing in
the panel depends on venue uniqueness (fault `id` is `${venueId}:${condition}`,
`lib/triage.ts:421`, so three rows for one venue have distinct keys).

---

## 4. Both ceiling evidence variants

The derivation **does** emit both. `evaluateCeilingCondition` (`triage-conditions.ts:269-283`)
tries `detectHorizonShrink` first and falls back to `detectPinnedCount`, and `lib/triage.ts:583`
passes `kind: ceiling.condition` straight through to `triage.ts:90`
(`z.enum(['pinned_count', 'horizon_shrank'])`). Both are proven end-to-end:

- `pinned_count` — `triage.integration.test.ts:332`, asserting `kind`, `count: 20`,
  `runs: 5`, `was: 34`
- `horizon_shrank` — `triage.integration.test.ts:354`, asserting `kind`, `furthest`,
  `best`, `shrankDays > 30`

**The copy covers only one.** `triage-copy.jsx:62-65` is a single function with no branch on
`d.kind`, and the design table records this explicitly at
`docs/superpowers/design-tables/1215-admin-triage.md:621` — _"the handoff does NOT define a
second ceiling copy variant"_. Rendering a `horizon_shrank` row through the pinned sentence
produces "stuck at 25 events / **1 runs** at the same round number · 41 before Jul 20", which
is wrong on every clause while `furthest`, `best` and `shrankDays` sit unused in the payload.

Verdict: **🔴 horizon_shrank is producible today and has no copy.** This is reconciliation #4
in the plan (`…-1215-admin-triage-surfaces.md:103-108`), and it is the one with a visual
consequence.

---

## 5. The micro-chart `series` arrays

The fixture is always exactly 7 entries (`triage-data.jsx:84,90,96,111,116,127,137`) and the
README states "7 bars because the baseline window is 7 days"
(`design/design_handoff_admin_triage/README.md:242-245`).

Production is **1 to 7**, not fixed. `seriesOf` (`lib/triage.ts:617-626`) slices
`runs[subjectIndex .. subjectIndex + BASELINE_RUN_COUNT]`, filters out `skipped` runs, and
reverses. Lower bound is 1 (the subject run itself is always success/partial, per
`findSubjectIndex` at `lib/triage.ts:334`); upper bound is 7. A venue whose page hash has not
changed for several nights writes `skipped` rows that are filtered out, so short series are
ordinary, not exotic.

`EvidenceBars` does **not** assume a fixed length — bars are `flex: 1, minWidth: 3` inside a
fixed 74px (62px mobile) span (`triage-icons.jsx:44-52`), and `Math.max(...series, 1)` guards
the empty case. So a 2-entry series renders two fat bars rather than breaking. It is
degraded, not broken: two 35px slabs read as a bar chart of nothing.

Two further notes:

- `isReading` (`lib/triage.ts:300`) admits `failed` and `partial` runs, whose `eventsUsable`
  is 0. A went-dark series can therefore contain zero-height bars from failed runs mixed in
  with real readings — the chart is not "successful crawls only".
- The ceiling series reads `eventsFound` (`lib/triage.ts:601`), the went-dark series reads
  `eventsUsable` (`lib/triage.ts:518`). Same chart component, two different quantities, one
  a11y label saying "Daily event counts" for both.

Verdict: ✅ reachable, ⚠️ the "always 7 bars" assumption in the README and design table is
false and PR 3 must not encode it.

---

## 6. The unknown-condition path

This is the failure mode the whole ticket exists to prevent, and the two sides disagree.

**Producer — safe, three layers deep.**

1. `orderFaults` (`lib/triage.ts:101-114`) ranks an unrecognised condition at
   `UNKNOWN_BAND_RANK = Number.MAX_SAFE_INTEGER` (`lib/triage.ts:86`) so it sorts last and
   never throws.
2. `deriveFaults` filters unknown conditions out of the payload entirely
   (`lib/triage.ts:610-612`).
3. `triageResponseSchema` is a `z.discriminatedUnion('condition', …)` (`triage.ts:58`) and
   the route `safeParse`s its own output before responding (`triage.ts:356-363`), returning a
   500 rather than a malformed body.

**Consumer — five throw sites on one unknown condition.** The mock's `orderFaults`
(`triage-data.jsx:51`) reads `CONDITION_META[a.condition].tier` and raises a `TypeError`
immediately. If it survived that, `FaultRow` would throw at `triage-panel.jsx:109`
(`meta.tier`), `:111` (`T.evidence[f.condition](f.d)` — calling `undefined`), `:113`
(`T.conditions[f.condition].verb`) and `:63` (`T.conditions[condition].label`), plus
`AttentionPanel` at `:294` (`CONDITION_META[ordered[0].condition].tier`) and `:324` in the
band grouping. None are guarded. Any one of them white-screens the busiest admin page.

Today the panel is protected **only** by the server-side filter. That protection is fragile
in a specific way worth naming: new alert categories get added crawler-side, and PR 3 will
give the web app its own copy of the response schema. If the client parses with a
`discriminatedUnion` and the API later grows a sixth condition, the client's parse of the
**entire payload** fails and the panel renders nothing — trading a white screen for a blank
one.

Verdict: ⚠️ unreachable today by construction, ❌ un-handled by the component. PR 3 must
build the tolerance, not inherit the mock's assumption.

---

## 7. Queue rows

| State                                                  | Where                                | Reachable?      | Evidence                                                                                                                                                | Verdict                                                                                                                                                                                                                   |
| ------------------------------------------------------ | ------------------------------------ | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `eventFlags` row                                       | `QueueRow` via `T.queues.eventFlags` | Yes             | `triage.ts:262-279` counts unverified events dated today or later, grouped by `venues.id`. Test `triage.integration.test.ts:480`                        | ✅                                                                                                                                                                                                                        |
| `priceSubmissions` row                                 | `T.queues.priceSubmissions`          | Yes             | `triage.ts:281-297`, pending submissions with `disputedSubmissionId IS NULL`                                                                            | ⚠️ **no integration test covers this queue.** Every queue test in the file (`:480`, `:505`, `:540`) exercises `eventFlags` only. The breakdown string `${artist} @ ${venueName}` (`triage.ts:344`) is unproven end-to-end |
| eventFlags breakdown "Bluebird 5 · Gothic 4 · Ogden 3" | `c.detail(q.breakdown)`              | Yes             | `joinBreakdown` (`triage.ts:370-373`) with `QUEUE_BREAKDOWN_LIMIT = 3` (`triage.ts:34`). Test `:505` proves two same-named venues stay separate rows    | ✅                                                                                                                                                                                                                        |
| "N more" tail — eventFlags                             | same                                 | Yes             | Remainder is `venueTotal - rows.length` — it collapses **venues**, while `count` states **events**. Test `:540` asserts "1 more" not "6 more"           | ✅ but the two numbers in one sentence mean different things                                                                                                                                                              |
| "N more" tail — priceSubmissions                       | same                                 | Yes             | Remainder is `priceTotal - rows.length` (`triage.ts:346`), collapsing **submissions**. Inconsistent with the flags tail; both render as a bare "N more" | ⚠️                                                                                                                                                                                                                        |
| Empty breakdown / zero-count row                       | —                                    | **Unreachable** | Both rows are pushed only when the total exceeds 0 (`triage.ts:324`, `:338`), so `count: 0` never arrives. The panel needs no zero branch               | ✅ (by omission)                                                                                                                                                                                                          |
| Queue tier strip with no ink dot                       | `triage-panel.jsx:361`               | Yes             | `TierStrip` called without `ink`                                                                                                                        | ✅                                                                                                                                                                                                                        |
| `queueTotal` in the neutral badge                      | `triage-panel.jsx:282`               | Yes             | Sum of `count`, not row count — matches `SummaryBadge` at `:302`                                                                                        | ✅                                                                                                                                                                                                                        |

Deep-link destinations for `q.action`:

- `openReview` → `/admin/review` exists (`app/(protected)/admin/review/`) ✅
- `openSubmissions` → `/admin/prices/submissions` exists ✅

---

## 8. Fault-row deep links — a reachability problem the design table does not record

`CONDITION_META` (`triage-data.jsx:40-44`) assigns three actions. Checked against the routes
that actually exist in `apps/web/src/app/(protected)/admin/`:

| Action                | Conditions                                                                     | Destination in production                                                                                                                                                                                                                                                                                                                                               | Verdict                                                                                                                                        |
| --------------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `openVenue`           | `blocked`, `coverage`                                                          | `/admin/venues/[id]` exists; `fault.venueId` is supplied (`triage.ts:49`)                                                                                                                                                                                                                                                                                               | ✅                                                                                                                                             |
| `openRun`             | `failed`, `wentDark`                                                           | **There is no per-run URL.** `/admin/crawl` accepts only `?venueId=` and `?tab=` (`app/(protected)/admin/crawl/page.tsx:111,115`); run selection is client state (`components/admin/crawl/CrawlSplitView.tsx:254` `selectedRunId`) with no search-param binding                                                                                                         | ⚠️ the API supplies `crawlRunId` (`triage.ts:55`) and **nothing can consume it**. Best available today is `/admin/crawl?venueId=…&tab=history` |
| `openDiagnostics`     | `ceiling`                                                                      | `/admin/crawl?venueId=…&tab=diagnostics` works — `InspectorTab` includes `'diagnostics'` (`components/admin/crawl/InspectorTabs.tsx:5`) and the page forwards the param — but `DiagnosticsPanel` renders for `venueRuns.find(id === selectedRunId) ?? venueRuns[0]` (`CrawlSplitView.tsx:362`), i.e. the venue's **latest** run, not the run the fault was derived from | ⚠️                                                                                                                                             |
| `crawlRunId === null` | `blocked` on a venue with zero runs in the 30-run window (`lib/triage.ts:454`) | —                                                                                                                                                                                                                                                                                                                                                                       | ⚠️ the link must degrade to the venue page rather than render `/admin/crawl?runId=null`                                                        |

---

## 9. Primitives the port depends on — all present

Checked so PR 3 does not discover these late:

- `StatusBadge` supports every kind the panel asks for: `danger`, `warning`, `accent`,
  `neutral`, `success` (`components/admin/primitives/utils.ts:6-7`) ✅
- `--accent-2` is defined in all nine themes (`apps/web/src/theme/themes.ts`, 9 occurrences) ✅
- `Panel`, `MonoLabel`, `AdminButton` all exist under `components/admin/primitives/` ✅
- The seven glyphs are traced from lucide-react (`triage-icons.jsx:1-11`); lucide-react is
  already a dependency (`components/admin/dashboard/AttentionFeed.tsx:4`) ✅

---

# Actions for the PR 3 build

Numbered, concrete, and each one a departure from what the mock does.

1. **Rename `f.d` to `f.evidence` throughout.** The wire contract uses `evidence`
   (`triage.ts:61` and every variant); `d` trips the repo's `id-length` rule. Touches
   `triage-panel.jsx:111,112,129,130` and every `evidence.*` copy function. This is already
   documented as a deliberate divergence at `lib/triage.ts:152-155`.

2. **Add a `horizon_shrank` ceiling copy variant, branched on `evidence.kind`.** It is
   producible today (`triage.integration.test.ts:354`) and currently renders "1 runs at the
   same round number". Write it against `furthest`, `best` and `shrankDays`, which the API
   already supplies and no copy function reads. Do not collapse the two variants into one
   generic sentence.

3. **Handle every nullable evidence field with a copy branch, not an interpolation.** Six
   fields are `nullable` in the schema and the mock interpolates all six raw:
   `blocked.status`, `blocked.lastSuccess`, `ceiling.was`, `ceiling.wasWhen`,
   `coverage.wasWhen`, and `sweep.atIso`. `null` renders as the literal string `null`.
   Write the shorter sentence for the null case; do not print "HTTP null" or "null before
   null".

4. **Reword the coverage detail line — do not port the fixture's.** The API's `wasWhen` is an
   _uncovered-since_ date, not a last-fully-covered date (`lib/triage.ts:198-204`, issue
   #1266). Say "uncovered since Jul 12"; never "was 14/14 on Jul 12". Use the supplied
   `evidence.uncovered` rather than recomputing `expected - matched`.

5. **Fix the run-vs-day wording in two places, not one.** The plan's reconciliation #2 covers
   the went-dark detail line ("7-**run** average"). It does **not** cover
   `T.a11y.evidenceChart`, which says "for the last N **days**" while N is
   `series.length`, a run count. Fix both, and take `window` from `series.length` rather than
   the `evidence.window` constant, which overstates the sample on any venue with fewer than
   seven baseline runs.

6. **Do not assume a 7-entry `series`.** Production emits 1–7 (`lib/triage.ts:617-626`).
   `EvidenceBars` survives it, but nothing may hardcode 7 bars, and the tests must include a
   2-entry series so the degraded render is at least seen once.

7. **Never let an unknown condition throw.** The mock has six unguarded lookups
   (`triage-panel.jsx:63,109,111,113,294,324`). Guard the `CONDITION_META` / `T.conditions` /
   `T.evidence` lookups and skip the row when a condition is unrecognised. Equally
   important: if PR 3 validates the response client-side, a `discriminatedUnion` rejects the
   _whole payload_ when the API grows a sixth condition — parse rows individually and drop
   the ones that fail, rather than blanking the panel.

8. **Use the server's ordering.** `deriveFaults` already returns rows ordered by band then
   persistence (`lib/triage.ts:610`). Delete the client-side `window.orderFaults` call at
   `triage-panel.jsx:291` — re-sorting client-side both duplicates the contract and imports
   the mock's throwing sort. Derive `topTier` from `faults[0].band`, which is on the wire
   (`triage.ts:51`), not from a `CONDITION_META` lookup.

9. **Map `kind → glyph` in the component; the payload has no `glyph`.** `QueueRow` reads
   `q.glyph` (`triage-panel.jsx:194`) and `queueSchema` (`triage.ts:112-118`) does not supply
   it, so both queue rows render an empty icon tile. Same check applies to `q.action`, which
   _is_ on the wire and does resolve.

10. **Build the `refreshing` mechanism or drop the prop.** Nothing sets it: the dashboard is
    a server component (`app/(protected)/admin/page.tsx:41`) and the mock's Refresh button
    has no handler. Either wire `router.refresh()` behind `useTransition` and drive
    `refreshing` from `isPending`, or remove the prop and the "Checking…" / "Checking venue
    health…" copy. Shipping an inert Refresh button is #1077 again.

11. **Design a degraded state for a failed triage fetch.** The panel has none, and the
    dashboard's sibling fetches re-throw (`app/(protected)/admin/page.tsx:52-89`), which
    would take the whole page to `error.tsx`. Catch the triage call and render the panel with
    a one-line "couldn't load" row — a broken health panel must not remove the health page.

12. **Fix the deep links to targets that exist.** There is no per-run admin URL, so
    `crawlRunId` is currently unconsumable. Either link `openRun` to
    `/admin/crawl?venueId=…&tab=history` and `openDiagnostics` to
    `…&tab=diagnostics` (accepting that the inspector shows the venue's latest run, not the
    fault's run), or add a `runId` search param to `app/(protected)/admin/crawl/page.tsx` and
    thread it into `CrawlSplitView`'s `selectedRunId`. Whichever is chosen, degrade to the
    venue page when `crawlRunId` is null.

13. **Correct the two stale fixture numbers wherever they were read as truth.** Production's
    `pauseAt` is **3** (`lib/triage.ts:40`), not the fixture's 8; the went-dark threshold is
    **−70%** (`lib/triage.ts:517`), not the fixture's −60. Interpolate from the payload in
    both cases — never hardcode either number in copy.

14. **Delete the dead copy rather than porting it.** `T.queues.empty`,
    `T.persistence.a11y`, `T.persistence.fresh`, `T.a11y.panelLabel`, `T.a11y.faultsHeading`
    and `T.a11y.queuesHeading` are never called by `triage-panel.jsx`. Carrying them into
    `components/admin/definitions/copy.ts` guarantees a later reader assumes they render.

15. **Add the missing producer test before relying on it.** No integration test exercises the
    `priceSubmissions` queue — its breakdown string `${artist} @ ${venueName}`
    (`triage.ts:344`) has never been asserted end-to-end. PR 3's component tests should not
    be the first thing to look at that string.
