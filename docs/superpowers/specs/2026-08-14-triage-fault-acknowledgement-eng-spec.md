# Triage fault acknowledgement — engineering spec

**Date:** 2026-08-14
**Extends:** `2026-07-29-admin-triage-surfaces-design.md` (#1215)
**Status:** proposed

---

## The problem

The "Needs attention" panel currently shows three faults, and all three are
correct:

| Venue | Fault | Reality |
| --- | --- | --- |
| Summit Music Hall | `ceiling` / `pinned_count`, stuck at 36 for 24d | A real, permanent Live Nation list cap (#1127) |
| Ball Arena | `ceiling` / `pinned_count`, stuck at 86 for 10d | Plausibly seasonal — NBA/NHL schedules land in blocks |
| Red Rocks Amphitheatre | `ceiling` / `horizon_shrank`, furthest show 2026-11-15, 1d | A seasonal outdoor venue whose season ends in November |

None of them is a defect, none of them can be fixed, and none of them can be
removed from the panel. `apps/api/src/routes/admin/lib/triage.ts:3-6` states the
model outright: faults are derived live per request, there is no read state and
no dismiss, and a venue leaves the list only when its condition stops being
true. For a permanent ceiling, that is never.

So the panel's badge reads `3 faults` indefinitely. The cost is not the three
rows — it is that a permanently non-zero fault count trains the operator to stop
reading the panel, which is precisely the failure the panel was built to end.
The panel replaced a feed that "capped itself at three failing venues"
(`TriagePanel.tsx:5`); a permanent floor of three is the same lie from the other
direction.

**This is a defect in the triage model, not in the three venues.**

---

## What we are NOT building

A dismiss button. Dismissal discards the one thing worth keeping: if Summit's cap
moves from 36 to 41, that is new information about the venue's list behaviour and
the operator must see it. A dismissed row would stay dismissed and hide exactly
the change that matters.

The stateless design was a deliberate and good call. This spec does not overturn
it — it narrows it. The panel stays derived; what becomes persistent is a
statement of the *expected value*, and the derivation now compares against it.

---

## The model: acknowledgement is keyed to evidence, not to the venue

An acknowledgement records **the value the operator looked at when they said
"this is expected."** The fault is suppressed while the current evidence still
matches that value, and re-fires the moment it does not.

Concretely:

- Summit acked at 36 events. Reports 36 → suppressed. Reports 41 → **re-fires**,
  because the cap moved.
- Red Rocks acked at horizon 2026-11-15. Next November's season end lands on
  2027-11-09 → still suppressed: six days away in the annual cycle. The horizon
  collapses to 2026-09-02 mid-season → **re-fires**, 74 days out of position.
- Ball Arena acked at 86. The NBA schedule drops and it moves to 130 →
  **re-fires**, then can be re-acked at the new plateau if it pins again.

An acknowledgement is therefore not "ignore this venue." It is "this number is
the expected number," and it keeps working as a detector.

### Decision: no expiry

Acknowledgements do not expire and carry no review date.

**Why:** the evidence fingerprint already re-fires the fault whenever the
situation changes, which is the only event an expiry would be approximating. A
date is a second thing that can be wrong, and its failure mode is bad in both
directions — too short and the operator re-acks noise on a timer, too long and it
gives false comfort. Nothing about "Summit is capped at 36" becomes untrue on a
schedule; it becomes untrue when the number changes, and we detect that directly.

### Decision: date evidence matches on position in the annual cycle

Horizon acknowledgements match within `HORIZON_ACK_TOLERANCE_DAYS` of the
acknowledged date **or of that date shifted by a whole number of years**, not on
an exact date.

**Why:** Red Rocks' season does not end on the same calendar date each year, and
a horizon that drifts by days or weeks is the same fact, not a new one.

**The year shift is not a refinement — without it the band does nothing.** A
straight `abs(dayDiff)` between 2026-11-15 and 2027-11-09 is ~359 days, so a
plain tolerance would re-fire this venue every single year, which is the exact
failure the band exists to prevent. What is being compared is the horizon's
*position in the year*, and only a year-aware comparison expresses that.

**Implementation:** build candidate dates by substituting the years
`{currentYear - 1, currentYear, currentYear + 1}` into the acknowledged date's
month and day, take the smallest absolute day-difference, and compare that to the
tolerance. Three candidates is sufficient — a horizon more than a year away from
its acknowledged position is not the same seasonal event by any reading.

**Feb 29 must clamp to Feb 28 when the substituted year is not a leap year.** An
unclamped substitution produces an invalid date, which under `Date.parse` rolls
into March and quietly shifts the comparison by a day.

**Value: 45 days.** Note this is a different quantity from the one first
proposed: matching within the annual cycle rather than on absolute drift means
the band only has to absorb year-over-year wobble in the *same* seasonal event,
not a year's worth of separation. A season end that moves by more than six weeks
is a real change worth surfacing. 45 also keeps a genuine mid-winter collapse
outside the band — 2027-01-20 sits 66 days from the acknowledged 2026-11-15
position and re-fires, with margin that 60 days would have left uncomfortably
thin.

It is deliberately *not* derived from `HORIZON_SHRINK_DAYS = 30` — they answer
different questions, and coupling them would mean tuning detection sensitivity
silently retunes suppression.

### Decision: acknowledgement is condition-agnostic

The mechanism covers all five triage conditions, not just `ceiling`.

**Why this is not speculative generality:** Red Rocks forces it. As its season
closes and the calendar empties, the venue stops tripping `ceiling` and starts
tripping `wentDark` — a seasonal outdoor venue genuinely goes to zero events in
January. A ceiling-only acknowledgement would suppress the fault in autumn and
let the same venue, for the same reason, reappear under a different heading in
winter. The condition is part of the key precisely so that a *different* kind of
wrong still surfaces.

---

## Where the control lives

**Not in the fault row.** `TriageRows.tsx:4-9` documents a deliberate constraint:
each row is a single `<Link>` with a composed `aria-label`, and even the "Open
run" chevron is `aria-hidden` rather than separately focusable, so there is
exactly one tab stop per row on mobile and desktop alike. Adding a button would
nest an interactive element inside an anchor — invalid HTML — and would double
the panel's focus order.

**The control goes on the row's existing destination.** `faultHref`
(`lib/deep-links.ts:29-37`) already sends a ceiling fault to
`/admin/crawl?venueId=…&tab=history`, the inspector's history tab, which opens on
the run that produced the fault. That view already shows the run history that
justifies the acknowledgement. The operator reads Summit's five identical runs
and marks it expected in the same place, without a new route, a new query
parameter, or a change to the row.

This also gets the confirmation semantics right for free: acknowledging is a
considered act performed against the evidence, not a one-click swipe from a
dashboard.

---

## Where acknowledged faults appear

A third `TierStrip` below the faults strip and above the queues strip, labelled
`expected` with a count, collapsed by default.

The label is **lowercase** in `copy.ts`, matching its siblings `broken now` and
`work waiting` (`apps/web/src/components/admin/definitions/copy.ts:2373-2377`,
whose comment reads "Lowercase mono — these are labels, not headlines"). The
uppercase rendering in the UI comes from `MonoLabel`'s `text-transform`, not from
the string.

`TierStrip` (`TriageRows.tsx:45`) already takes `label`, `count`, and an
**optional** `ink`, and its own prop doc says ink is "omitted on the queues
strip, which is not a severity." An acknowledged fault is not a severity either,
so it renders inkless on the existing precedent rather than needing a new visual
treatment.

Acknowledged faults must remain visible somewhere. A suppression you cannot see
is one you cannot audit, and six months from now the question "why is Summit not
in the panel?" needs an answer that is not "read the database."

### The panel's summary badge

`SummaryBadge` (`TriagePanel.tsx:208-246`) branches on `faults.length` alone, and
its comment explains why: keying on `topBand` too would let a bandless fault fall
through and caption a visible list of faults as "all clear."

**That invariant must hold.** Acknowledged faults are excluded from
`faults.length`, so with all three current faults acked the badge reads
`all clear` — which is now true, because "all clear" means "nothing unexplained"
rather than "nothing detected." The `EXPECTED (3)` strip is what keeps that
honest, and the a11y announcement (`TRIAGE.a11y.announce`) must say so too rather
than announcing an unqualified all-clear.

---

## Data model

New table, `venue_fault_acknowledgements`:

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid pk | |
| `venue_id` | uuid not null → `venues.id` on delete cascade | |
| `condition` | text not null | `blocked` \| `failed` \| `wentDark` \| `ceiling` \| `coverage` |
| `evidence_kind` | text null | Ceiling's `pinned_count` / `horizon_shrank`; null elsewhere |
| `evidence_value` | text **null** | The canonical acknowledged value: `"36"`, `"2026-11-15"`. Null means the evidence figure was itself absent — see below |
| `reason` | text not null | Operator's one-line justification. **Required.** |
| `acknowledged_by` | text not null | Clerk user id |
| `acknowledged_at` | timestamptz not null default now() | |

Unique on `(venue_id, condition)`. One ceiling fault per venue is guaranteed by
`evaluateCeilingCondition`, which returns horizon *or* pinned via `??` and never
both, so the narrower key is unnecessary.

`evidence_value` **is** nullable, and only because one condition needs it:
`BlockedEvidence.status` is `number | null`
(`apps/web/src/components/admin/triage/definitions/types.ts:28`),
so a venue blocked without a recorded HTTP status has no figure to acknowledge.
Null therefore means "the evidence figure was absent," and it matches only
against a currently-absent figure. A sentinel string was the alternative and is
worse — every sentinel is a value some future condition can legitimately
produce, and the collision would silently suppress a real fault.

`reason` is not nullable on purpose. "Summit: Live Nation caps its list at 36
(#1127)" is the difference between a suppression and a mystery, and an optional
field would be empty on every row within a month.

A new table rather than columns on `venues`: `venues` already carries
`lastEventCeilingAlertAt` and `lastUrlCoverageAlertAt`, which are email cooldown
stamps and explicitly *not* triage filters
(`apps/api/src/routes/admin/lib/triage.ts:18-20`,
`packages/crawler-core/src/lib/triage-conditions.ts:16-18` — note there are
several `triage.ts` files in the repo, so these are given in full). Putting
suppression state
beside them would invite exactly the confusion those comments exist to prevent.

---

## Matching logic

Split in two, along the package boundary.

**The comparison is a pure function in
`packages/crawler-core/src/lib/triage-conditions.ts`**, beside the thresholds it
depends on. That file's header is explicit: "Every threshold and every 'is this
venue broken' decision lives here and nowhere else," and it may not touch the
database, send mail, or read the clock.

But it must not import app-layer types to get there. That file models the
numeric and date classifiers only — it has no concept of `BlockedEvidence` or
`FailedEvidence`, which live in the API's response shapes. So the matcher
operates on a **normalized key**, not on evidence objects:

```
interface AcknowledgementKey {
  condition: string
  evidenceKind: string | null
  evidenceValue: string | null
}

matchesAcknowledgement(current: AcknowledgementKey, acked: AcknowledgementKey) -> boolean
```

`condition` is a bare `string` rather than the established `TriageCondition`
union deliberately. That union is declared in
`apps/api/src/routes/admin/lib/triage.ts:69` (and mirrored in the web types),
and importing it here is exactly the app-layer dependency this split exists to
prevent. The matcher only ever compares conditions for equality, so it needs no
knowledge of the members; the API side, which does hold the union, is where the
key is built and where the type is enforced.

**Deriving that key from a fault is the API's job**, in
`apps/api/src/routes/admin/lib/triage.ts`, where the evidence shapes already
live and where the same derivation is already being done to render the evidence
lines. One small `faultAcknowledgementKey(fault)` function, one place.

This keeps `crawler-core` free of app types and keeps the comparison rules in the
one file that is allowed to own them.

Per condition, the value the API derives and the rule the matcher applies:

| Condition | Derived value | Match rule |
| --- | --- | --- |
| `ceiling` / `pinned_count` | `eventsFound` | exact integer equality |
| `ceiling` / `horizon_shrank` | `furthestEventDate` | smallest `abs(dayDiff)` against the acked date's year-shifted candidates `<= HORIZON_ACK_TOLERANCE_DAYS` |
| `wentDark` | `eventsUsable` | exact integer equality |
| `coverage` | `uncoveredCount` | exact integer equality |
| `blocked` | HTTP `status` | exact equality; null matches only null |
| `failed` | `errorClass` | exact string equality |

A mismatched `condition` or `evidenceKind` is an immediate non-match, before any
value comparison — that is what makes a seasonal venue's autumn `ceiling`
acknowledgement fail to suppress its winter `wentDark` fault.

Reuse the file's existing `differenceInDays` helper for the date case rather than
adding a second date-arithmetic path — it already parses `YYYY-MM-DD` as UTC
midnight specifically to keep differences free of DST skew. Apply it once per
year-shifted candidate and take the minimum, per the annual-cycle decision above.

**A malformed or unparseable `evidence_value` must fail closed — the fault
shows.** A suppression we cannot verify is not a suppression we should honour.
Null is not malformed: it is a legal acknowledged value meaning "no figure," and
it matches only a currently-absent figure. `evidenceValue` is therefore
`.nullable()` in Zod rather than `.optional()`, so an omitted key is a 400 and
only a deliberate `null` reaches the matcher.

---

## API surface

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/v1/admin/venues/:venueId/fault-acknowledgements` | Create or replace; body `{ condition, evidenceKind?, evidenceValue: string \| null, reason }` |
| `DELETE` | `/v1/admin/venues/:venueId/fault-acknowledgements/:condition` | Un-acknowledge |

Zod at both boundaries. Both write an audit log entry — acknowledging a fault
hides a signal from the dashboard, which is exactly the class of admin action
principle 2 requires be auditable.

`GET /v1/admin/triage` gains an `acknowledged: AcknowledgedFault[]` array
alongside `faults`, where:

```
type AcknowledgedFault = TriageFault & {
  acknowledgement: {
    reason: string
    acknowledgedBy: string
    acknowledgedAt: string
  }
}
```

The provenance is a nested object rather than three fields spread onto
`TriageFault`, so the two arrays stay assignable to the same base type and the
panel cannot accidentally read `reason` off an unacknowledged fault. Faults are partitioned server-side, not filtered client-side —
`TriagePanel.tsx:10-12` establishes that ordering and classification are the
API's job because it is "the one with the data to decide," and suppression is a
classification.

The endpoint must **not** re-derive fault state for the acknowledged set
differently from the unacknowledged one. Both come from the same sweep; the only
difference is which array they land in.

---

## Testing

The matcher is pure and gets unit tests directly, one per row of the match table
plus the fail-closed case. The three real venues are the fixtures:

- Summit acked at 36 → 36 suppresses, 41 re-fires
- Red Rocks acked at 2026-11-15 → 2027-11-09 suppresses (6 days out of position
  in the annual cycle), 2026-09-02 re-fires (74 days), 2027-01-20 re-fires
  (66 days)
- Ball Arena acked at 86 → 86 suppresses, 130 re-fires

Boundary cases on the tolerance band are worth pinning explicitly: exactly 45
days out of position suppresses, 46 re-fires. The year-shift itself needs its own
tests — a same-year near-match, a next-year near-match, and a two-year gap, which
the `{year - 1, year, year + 1}` candidate set is not expected to bridge. A
`2028-02-29` acknowledgement substituted into 2027 must yield `2027-02-28`
rather than an invalid `2027-02-29`. Integration tests cover the partition in
the triage response and the audit-log write.

---

## Out of scope

- Bulk acknowledgement. Three faults.
- Per-venue threshold tuning. `triage-conditions.ts:35` already anticipates it
  ("can be tightened per-venue later") and it is a different feature — this spec
  changes what is *shown*, not what is *detected*.
- Any change to the detection thresholds themselves.
