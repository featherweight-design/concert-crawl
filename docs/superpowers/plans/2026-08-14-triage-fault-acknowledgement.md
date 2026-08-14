# Triage fault acknowledgement — implementation plan

**Spec:** `docs/superpowers/specs/2026-08-14-triage-fault-acknowledgement-eng-spec.md`
**Date:** 2026-08-14

Four PRs, strictly sequential. Each is independently mergeable and leaves the
admin dashboard working.

**Why this order is safe.** No acknowledgement row can exist until PR 3 ships the
control, so PR 2's partition operates on an empty set and is a visible no-op.
That is what lets the panel change (PR 4) land after the API change without a
window where an acknowledged fault has been filtered out of `faults` but has
nowhere to be displayed.

---

## PR 1 — Schema, migration, and the matcher

**Branch:** `feat/triage-ack-schema`

No behaviour change. Nothing reads the table yet.

1. `packages/db/src/schema/venue-fault-acknowledgements.ts` — new Drizzle table
   per the spec's data model. Unique index on `(venue_id, condition)`, FK to
   `venues.id` with `on delete cascade`. Export from the schema barrel.
2. Generate the migration into `packages/db/migrations/`. Two things must line
   up, and only one of them is the filename: the file takes the next numeric
   prefix (`0080_…`, since `0079_artist_spotify_candidates` is current), and its
   `meta/_journal.json` entry needs a `when` **greater than every prior entry**
   (currently `1787011200000`). Drizzle orders by `when`, not by the prefix, so a
   correctly-named file with a stale timestamp silently sorts into the past.
3. `packages/crawler-core/src/lib/triage-conditions.ts`:
   - Add `HORIZON_ACK_TOLERANCE_DAYS = 45` in the thresholds block, with the
     comment explaining it is deliberately independent of `HORIZON_SHRINK_DAYS`.
   - Add `matchesAcknowledgement(current, acked)` operating on the normalized
     `AcknowledgementKey` (`{ condition, evidenceKind, evidenceValue }`), reusing
     the existing `differenceInDays` helper. **Do not import app-layer evidence
     types into this package** — the key exists precisely so `crawler-core` never
     learns what `BlockedEvidence` is.
   - Date values compare on **position in the annual cycle**, not on the raw
     difference: substitute `{year - 1, year, year + 1}` into the acknowledged
     month/day, take the smallest absolute day-difference, and clamp Feb 29 to
     Feb 28 in a non-leap substituted year. Without the shift the band never
     suppresses anything, since consecutive Novembers are ~359 days apart.
   - Mismatched `condition` or `evidenceKind` short-circuits to false before any
     value comparison.
   - Fail closed on an unparseable `evidenceValue`.

**TDD.** The matcher is pure, so it is written test-first: one test per row of
the spec's match table, the three real-venue fixtures, the ±45-day boundary pair
(45 suppresses, 46 re-fires), the year-shift cases (same-year, next-year, and a
two-year gap that must not bridge), the Feb 29 → Feb 28 clamp, the
malformed-value case, and the null pair — a null acknowledged value matches an
absent figure and nothing else. Watch each fail before implementing.

**Done when:** migration applies cleanly on a fresh DB, matcher unit tests pass,
`pnpm typecheck && pnpm lint` clean. Zero UI or API change.

---

## PR 2 — API: endpoints and the triage partition

**Branch:** `feat/triage-ack-api`
**Depends on:** PR 1

1. `POST /v1/admin/venues/:venueId/fault-acknowledgements` — Zod-validated body
   `{ condition, evidenceKind?, evidenceValue, reason }`. Upsert on the unique
   key so re-acking at a new value replaces rather than conflicts. `reason` is
   required and non-empty after trim. `evidenceValue` is `.nullable()`, not
   `.optional()` — a blocked venue with no recorded HTTP status has no figure to
   acknowledge, but an omitted key is still a 400.
2. `DELETE /v1/admin/venues/:venueId/fault-acknowledgements/:condition`.
3. Both write an audit log entry via the existing admin audit helper. Follow the
   established `AdminVariables` / `getAuthUser` route shape.
4. `faultAcknowledgementKey(fault)` in
   `apps/api/src/routes/admin/lib/triage.ts` — derives the normalized key from
   each condition's evidence shape. This is the app-side half of the matcher and
   belongs here, not in `crawler-core`.
5. `GET /v1/admin/triage` — load acknowledgements for the swept venues, partition
   the derived faults through `matchesAcknowledgement` into `faults` and a new
   `acknowledged: AcknowledgedFault[]`, each carrying a nested
   `acknowledgement: { reason, acknowledgedBy, acknowledgedAt }`. Extend
   `triageResponseSchema`.

**Watch for:** the partition must consume the same derived sweep both arrays come
from. Re-querying or re-deriving for the acknowledged set is the bug that makes
the two halves disagree.

**Tests:** integration coverage for create / replace / delete, the 400 on a blank
reason, the audit-log write, and a triage response partitioning correctly with
and without rows present. Confirm an empty table leaves the response byte-identical
to today's.

**Done when:** endpoints green, triage response unchanged when no acks exist.

---

## PR 3 — The acknowledge control in the crawl inspector

**Branch:** `feat/triage-ack-control`
**Depends on:** PR 2

Target is the inspector at `/admin/crawl?venueId=…&tab=history`, which
`faultHref` already deep-links to.

1. A control on the inspector showing the venue's current fault condition and its
   evidence value, with a required one-line reason input and a confirm action.
   Pre-fill the evidence value from the live fault — the operator is
   acknowledging what is on screen, and hand-typing it is a transcription bug
   waiting to happen.
2. When an acknowledgement already exists, show it — value, reason, who, when —
   with an un-acknowledge action.
3. Admin primitives only (`AdminButton`, `MonoLabel`, `StatusBadge`, `Panel`).
   Strings into `apps/web/src/components/admin/definitions/copy.ts`.

**Note:** admin copy is exempt from the `copy-review` gate and admin UI is exempt
from the design pipeline (CLAUDE.md), so this is a normal build. Still use the
existing primitives — cohesion is the whole reason the control lives here.

**a11y:** the reason input needs a real label, and the confirm must be reachable
and operable by keyboard. This is a form, not a row, so the one-tab-stop rule
that governs the panel does not apply here.

**Done when:** an operator can acknowledge and un-acknowledge Summit end to end
against a local DB, and the row disappears from `faults` on refresh.

---

## PR 4 — The EXPECTED strip in the panel

**Branch:** `feat/triage-ack-panel`
**Depends on:** PR 2 (independent of PR 3, but sequence it last)

1. `apps/web/src/components/admin/triage/definitions/types.ts` — add
   `AcknowledgedFault` (`TriageFault` plus a nested `acknowledgement` object) and
   `acknowledged` on `TriageData`, mirroring the wire contract. Extend
   `lib/parse-triage.ts` so the runtime guard actually proves the new field.
2. `TriagePanel.tsx` — render a third `TierStrip` labelled `EXPECTED` with a
   count, **no `ink`**, following the queues-strip precedent for a non-severity
   strip. Collapsed by default, expanding to the acknowledged rows with their
   reason line.
3. `TRIAGE.a11y.announce` must account for acknowledged faults rather than
   announcing a bare all-clear. Same for `TriageEmpty` — "nothing needs
   attention" while three faults sit acknowledged is the reassuring-but-wrong
   summary this panel was built to replace.
4. Leave `SummaryBadge`'s branch on `faults.length` alone. Acknowledged faults are
   correctly excluded from that count; the strip is what keeps it honest.

**Watch for:** the dense/banded presentation (`faults.length >= denseAt`) and the
compact breakpoint both need checking with acknowledged rows present.

**Done when:** all three current faults can be acknowledged, the badge reads all
clear, and `EXPECTED (3)` sits below it with the reasons readable.

---

## Verification

Local first: acknowledge all three venues, confirm the badge flips and the strip
holds them. Then on staging, confirm the acknowledgements survive a crawl cycle
and that changing a venue's seeded event count re-fires its fault.

The real proof is slower and worth stating so a future session does not mistake
it for done: **Red Rocks re-firing when its horizon moves outside the band, and
staying quiet when next season's end lands within it.** That cannot be verified
before November. Note it in memory rather than treating the PR as unvalidated.

---

## Next

Start with PR 1. The matcher is the load-bearing piece and it is pure, so it is
fully testable before any of the plumbing exists.
