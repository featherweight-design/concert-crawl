# #1215 — Admin triage surfaces · implementation plan

**Brief:** `docs/superpowers/specs/2026-07-29-admin-triage-surfaces-design.md` (PR #1232)
**Handoff:** `design/design_handoff_admin_triage/` — audited 🟢 Green (PR #1252)
**Shape:** 4 PRs. Mostly a red diff for a ticket about *adding* visibility.

---

## What this ships

The `/admin` dashboard "Needs attention" panel, rebuilt as **pure derived state**: a row
exists because a condition is true at request time, and leaves when it stops being true.
Five fault conditions instead of two, none of them truncated.

Three parallel notification systems collapse to one. `NotificationBell`, `/admin/inbox`,
`/v1/admin/inbox`, `/v1/admin/notifications`, `inbox_reads` and `inbox_read_watermarks`
all come out. **The `notifications` table stays** — it is written inside each alert
transaction and is the durable audit record. It simply stops being a UI source.

---

## The finding that shapes the whole plan

All five conditions are **derivable live**. Nothing has to be read back out of
`notifications` to render the panel:

| Condition | Derived from | Cost |
|---|---|---|
| Blocked | `venues.blocked_at` | boolean state, no history |
| Crawl failing | latest `crawl_runs.status = 'failed'` + `venues.consecutive_failures` | one row per venue |
| Went dark | last 7 successful `crawl_runs.events_usable` | 7 rows per venue |
| Ceiling suspected | last 7 `crawl_runs.{events_found, furthest_event_date}` | 7 rows per venue |
| Coverage gap | live aggregate over `events` | one grouped count |

`crawl_runs` is an immutable, unpruned audit log, so the baselines the crawler computes at
write time can be recomputed identically at read time.

### The architectural consequence

Locked decision §3.6 says recovery is derived so *"the panel and the alerting logic can't
drift apart."* That is only structurally true if both call the **same** classifier. Today
the classification logic exists but is private and welded to its side effects:

- `classifyDrop` — `packages/crawler-core/src/lib/event-count-alert.ts:290`
- `detectHorizonShrink` / `detectPinnedCount` — `event-ceiling-alert.ts:221,249`
- coverage ratio — inline in `url-coverage-alert.ts:107`

Each is wrapped in a `runCheck` that also writes a `notifications` row, sends an email, and
stamps a cooldown column. The read path must have none of those.

**So: PR 1 extracts the pure classifiers, and both paths consume them.** If we instead
re-implement the thresholds in a query, the panel and the emails will disagree the first
time anyone tunes `SOFT_DROP_RATIO`, and a venue will show as broken in one place and
healthy in the other. That is the exact class of bug this ticket exists to close.

**Cooldowns do not apply to the read path.** `last_*_alert_at` exists to stop a *daily
email* re-firing for seven days. The panel answers "what is wrong right now" — a venue
inside its cooldown window is still broken and must still show a row. Only the write path
consults cooldowns.

---

## Handoff ↔ reality reconciliations

The handoff's evidence copy was written against the brief's description of detection, not
against the shipped constants. Four mismatches, all in the copy layer:

1. **Went-dark threshold.** Handoff says *"flags at −60%"*. `SOFT_DROP_RATIO = 0.3` means it
   actually flags at **−70%**. Use the constant, don't hardcode the number — the string
   should interpolate from the same export the classifier uses.
2. **Baseline window.** Handoff says *"7-day average"*. It is the last **7 successful runs**,
   which is not the same thing for a venue that failed for three days. Copy becomes
   "7-run average".
3. **Coverage gap.** Handoff frames it as *"9 of 14 source URLs stopped matching"*. Actual
   detection counts **upcoming events with neither `ticket_url` nor `event_url`**, flagging
   at ≥30% of a catalogue of ≥10. The evidence line becomes "9 of 14 events have a ticket
   link" — same shape, true statement.

   ⚠️ **The copy is the complement of what detection counts, and the inversion is
   deliberate.** Detection produces `uncoveredCount` (events *missing* links) against
   `upcomingCount`. The row states the covered figure, because the panel's evidence line is
   consistently "how much is working" — `9 of 14` means 14 upcoming events, 5 uncovered,
   9 covered. Wire it as `upcomingCount - uncoveredCount` of `upcomingCount`; do **not**
   drop `uncoveredCount` into the first slot. The detail line keeps the raw
   figure: "5 have neither a ticket nor an event link."

4. **Ceiling has two fingerprints, the handoff designed one.** `pinned_count` (5 runs at an
   identical count ≥10) is the one drawn. `horizon_shrank` (furthest event date fell >30
   days below its prior best) has no expression. Both write `metadata.kind`, so add a
   second evidence variant keyed off it rather than collapsing them — "furthest show pulled
   back to Aug 12" is a different sentence from "stuck at 20 events", and a single generic
   line would lose the thing that tells you which to open.

Item 4 is the only one with a visual consequence, and it reuses the existing row anatomy.
No return trip to Design.

---

## PR breakdown

Sequenced so nothing is unavailable mid-flight: the new surface is built and live before
the old ones are removed.

### PR 1 — Extract pure condition classifiers *(no behaviour change)*

New `packages/crawler-core/src/lib/triage-conditions.ts`. Move `classifyDrop`,
`detectHorizonShrink`, `detectPinnedCount` and the coverage ratio into exported,
side-effect-free functions taking plain inputs and returning a discriminated union. The
three `runCheck`s call them instead of their own inline copies. Thresholds re-export from
here so there is one home.

- Every existing alert test must pass **unchanged** — that's the proof this is a refactor.
- Add table-driven unit tests per classifier: cold start, at-threshold, just-over,
  just-under, zero events, and the `partial`-status run (#1165 writes zero-usable runs as
  `partial`, and both count).

### PR 2 — `GET /v1/admin/triage`

One endpoint returning `{ faults[], queues[], sweep }`, shaped to the handoff's data
contract so the UI needs no adapter.

- Faults sorted **severity band, then persistence descending** — server-side, so the client
  never re-derives an ordering the accessible reading order depends on.
- `persistedSince` per fault, from the first run in the current unbroken streak of the
  condition being true. This is a real column in the design, not a decoration.
- **Unknown conditions sort last, never throw.** The mock's `orderFaults` throws a
  `TypeError` on an unrecognised condition. New alert categories get added crawler-side, and
  a triage panel that white-screens on an unfamiliar alert is precisely the failure this
  ticket exists to prevent. Belt and braces: the API omits unknown conditions, and the
  client tolerates them if one arrives.
- Query budget: one grouped `crawl_runs` window function for the run history, one aggregate
  over `events`, one `venues` scan. Not N+1 per venue — there are ~11 venues today but the
  panel is on the page the admin opens most.
- Zod response schema; admin auth via the existing `getAuthUser` pattern.
- Integration tests seeding each condition true, then seeding recovery and asserting the row
  **disappears** — the self-healing property is the product claim and needs a test.

### PR 3 — Rebuild the panel

Port `design/design_handoff_admin_triage/triage-panel.jsx` to
`apps/web/src/components/admin/triage/`. Copy lifts wholesale into
`components/admin/definitions/copy.ts` (the handoff's `triage-copy.jsx` is already a mirror
of it, with the four reconciliations above applied).

- Rows become the router's `<Link>`, not `role="link" tabIndex={0}` — real anchors with
  middle-click and copy-link. **Keep the composed `aria-label`**; the sentence is what makes
  a row legible without the layout.
- `denseAt` stays a prop, defaulting to 7. It was set by eye and Hugh may want to move it.
- Delete `buildAttentionItems` and its `slice(0, 3)`.
- `accent-2` needs no work — it is already defined in all nine themes
  (`apps/web/src/theme/themes.ts`).
- Tests: the five conditions render their own evidence line; the empty state renders when
  both tiers are clear; the faults-clear strip renders when only queues have contents; the
  live region announces one sentence, never a row-by-row read.

### PR 4 — Remove the orphans

- `apps/api/src/routes/admin/{inbox,notifications}.ts` + tests + registrations in
  `routes/admin/index.ts`
- `apps/web/src/app/(protected)/admin/inbox/` and `components/admin/inbox/`
- `components/admin/notification-bell/`
- Bruno collections under `apps/api/bruno/admin/notifications/`
- Migration dropping `inbox_reads` + `inbox_read_watermarks`

**Expand/contract:** the table drop ships in a *later* deploy than the code that stopped
reading them, per the standing migration rule. PR 4 removes the readers; the drop migration
follows once that's live. Do not bundle them.

⚠️ Do not touch `packages/db/src/schema/notifications.ts`. `event-count-alert.ts`,
`event-ceiling-alert.ts` and `url-coverage-alert.ts` all write to it inside their alert
transactions.

---

## Testing

Unit (classifiers) and integration (endpoint) are covered above. Beyond that:

- **The went-dark regression test is the important one.** Seed a venue with a 7-run
  baseline of ~12 events, then a successful run returning 2, and assert it appears in the
  panel payload. That is the Bluebird case from #624 that stayed invisible for weeks, and
  it is the reason this ticket exists.
- Staging: trigger a crawl from the admin canary (`reference_admin_trigger_crawl`) and
  confirm the panel reflects it. Staging's crawler is paused by design, so prod nightlies
  remain the real evidence.
- No E2E — the panel is admin-only and behind auth; integration coverage of the endpoint
  plus component tests is the right bar.

---

## Risks

**The panel becomes a query on the busiest admin page.** Five conditions over run history
on every dashboard load. At ~11 venues this is nothing, but the query should be written as
though the venue count is 200 — window function over `crawl_runs`, not a loop. If it does
get slow, cache at the request level, never with a TTL: a stale triage panel is the failure
mode we are removing.

**Deriving at read time means a condition can flicker** if a crawl lands mid-session. That
is correct behaviour — the panel reports now, and `Refresh` exists. Worth knowing before
someone files it as a bug.

**`consecutive_failures` vs. run status.** There is no `venues.status` column; the current
panel's `status === 'failed'` comes from the computed `RawVenueStatus` in
`/v1/admin/crawl/status`. Derive "crawl failing" from the same source, or the two admin
surfaces will disagree about which venues are failing.

---

## Out of scope

Nav badges (§3.1 keeps them peripheral), the specialist views at `/admin/crawl` and
`/admin/review` (the row deep-links to them and never duplicates them), consumer
notifications (#737), and any per-venue tuning of detection thresholds.
