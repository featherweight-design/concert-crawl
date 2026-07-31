# Epic Run Briefing — #1215 Admin triage surfaces

## Source of truth (read in this order)

1. `docs/superpowers/plans/2026-07-31-1215-admin-triage-surfaces.md` — master sequencing:
   4 PRs, gates, the classifier-extraction argument. Follow its order exactly.
2. **#1215** — the eng scope. ⚠️ Read the plan's "The finding that shapes the whole plan"
   before the issue: the issue was filed on a premise that turned out to be wrong (see below).
3. `docs/superpowers/specs/2026-07-29-admin-triage-surfaces-design.md` — merged design brief
   (#1215, PR #1232). Six locked decisions in §3.
4. `design/design_handoff_admin_triage/` — visual ground truth, audited 🟢 Green
   (`READINESS.md`, PR #1252). `triage-panel.jsx` is the port source for PR 3.

### The premise correction — read before touching anything

#1215 was filed as a wiring problem: the bell is dead code, the inbox is absent from nav.
**That is not why the went-dark alerts went unnoticed.** The dashboard panel lists a venue
when `venue.status === 'failed'` or `blockedAt` is set. A went-dark crawl is neither — it
*succeeded*, it just returned far fewer events than baseline. The panel had no expression
for that condition, nor for `event_ceiling_suspected` or `url_coverage_gap`. Wiring the
inbox into the nav would not have caught it.

If any PR in this run starts scoping the inbox back in, or framing the work as "hook up
the notification surfaces," that is the old premise resurfacing. This is a **coverage fix
with a cleanup attached**.

## Current state (verified 2026-07-31)

All claims below were checked with real commands on this date, at `main` = `69b29d1c`.

**No new environment variables, external accounts, or third-party services.** This epic is
entirely internal: one new API route, one rebuilt panel, and deletions. Nothing to place in
Vercel, Render, or GitHub secrets. No dependent step is blocked on a secret.

Verified present (PR 1 sources — classifiers to extract):

- `packages/crawler-core/src/lib/event-count-alert.ts` — `classifyDrop` private at :290
- `packages/crawler-core/src/lib/event-ceiling-alert.ts` — `detectHorizonShrink` :221, `detectPinnedCount` :249
- `packages/crawler-core/src/lib/url-coverage-alert.ts` — coverage ratio inline at :155
  (`uncoveredRatio = uncoveredCount / upcomingCount`, thresholded at :157). The execution
  plan cites `:107`, which is where `runCheck` opens, not where the ratio is computed.

Verified **absent** (PR 1 creates it): `packages/crawler-core/src/lib/triage-conditions.ts`.

Verified present (PR 4 removal targets — all six still exist):
`apps/api/src/routes/admin/{inbox,notifications}.ts`,
`apps/web/src/app/(protected)/admin/inbox/`,
`apps/web/src/components/admin/{inbox,notification-bell}/`,
`apps/api/bruno/admin/notifications/`.

- `NotificationBell` is **defined and never imported** anywhere in `apps/web/src` — the
  ticket's "dead code" claim is confirmed, so PR 4's removal has no call sites to unwind.
- `buildAttentionItems` lives at `apps/web/src/app/(protected)/admin/page.tsx:103`, called
  once at :223. PR 3 deletes both, along with its `slice(0, 3)` cap.
- `accent-2` resolves in **all nine** themes (`apps/web/src/theme/themes.ts`) — no token
  work for the third severity band. The handoff README originally claimed otherwise and was
  corrected in the verdict PR.

Known anomalies to ignore:

- **Staging's crawler is paused by design.** It will not organically produce fault
  conditions, so an empty staging panel is not evidence of a bug. Use the admin canary
  (`reference_admin_trigger_crawl`) to force a run; prod nightlies remain the real evidence.
- `design/design_handoff_admin_triage/tweaks-panel.jsx` carries a known `postMessage` origin
  finding, deferred as shared infra under the #959 precedent and tracked in **#1255** (8
  byte-identical copies across handoffs). Do not fix it in this run — the sweep owns it.

### ⚠️ Correction to the execution plan — `partial` runs and the baseline

The merged plan (and #1165's summary) says a `partial`-status run counts toward the
went-dark baseline. **It does not.** Verified while building PR 1: the baseline query is
`status = 'success' AND events_usable > 0`, so a zero-usable run is excluded twice, and the
exclusion is deliberate per #645 — a venue intermittently returning 0 must not drag down its
own baseline and understate the size of the regression in the alert copy. What #1165 changed
is only that the *check still runs* on a `partial` row.

**PR 2 must not widen the baseline window to include `partial` rows.** If it does, the
panel's baseline figure will diverge from the figure in the emails — the precise drift this
epic exists to prevent. Prefer the exported helper from `triage-conditions.ts` over writing
a fresh baseline query.

## Hard pause points — stop and ask, do not proceed

- **Any production database migration.** (Skill default, restated because this epic ends in
  a table drop.)
- **The `inbox_reads` / `inbox_read_watermarks` DROP migration is OUT OF SCOPE for this
  run.** Per expand/contract, PR 4 removes only the *readers*. The drop ships in a later
  deploy, after the reader-removal is live in prod. Do not bundle it into PR 4, and do not
  add a fifth PR for it — surface it as a follow-up issue instead.
- **Do not touch `packages/db/src/schema/notifications.ts`.** The `notifications` table
  stays: `event-count-alert.ts`, `event-ceiling-alert.ts` and `url-coverage-alert.ts` all
  write to it inside their alert transactions, and it is the durable audit record. It only
  stops being a UI source.
- **PR 1 must be a pure refactor.** If making the existing alert tests pass requires
  *changing* any of them, stop — that means behaviour moved, and the "no behaviour change"
  claim is false. Unchanged existing tests are the proof; ask before editing one.

## Notify-and-proceed

- **Threshold constants become exported.** PR 1 re-exports `SOFT_DROP_RATIO`,
  `BASELINE_RUN_COUNT`, `HORIZON_SHRINK_DAYS`, `PINNED_RUN_COUNT`, `PINNED_MIN_COUNT`,
  `COVERAGE_MIN_CATALOGUE`, `COVERAGE_GAP_RATIO` from `triage-conditions.ts`. Validate by
  running the full existing alert suite unchanged first, capture the pass output, then
  proceed. Widening an export surface is reversible and touches no runtime behaviour.
- **The four handoff↔reality copy reconciliations** (plan lines 63–95) are already decided —
  apply them in PR 3 without re-asking Design. Only item 4 (the second ceiling evidence
  variant keyed off `metadata.kind`) has a visual consequence, and it reuses the existing
  row anatomy. Note it in the PR body; no return trip to Design.
- **Deleting the orphaned surfaces in PR 4.** Evidence to capture first: grep proving zero
  remaining imports of each removed module, plus green typecheck. There are no consumers
  outside admin and no active customers on these routes — the admin is the only user.

## Done means

- [ ] **PR 1** — `triage-conditions.ts` exports side-effect-free classifiers; all three
      `runCheck`s consume them; **every pre-existing alert test passes unchanged**;
      table-driven unit tests per classifier cover cold start, at-threshold, just-over,
      just-under, zero events, and the `partial`-status run.
- [ ] **PR 2** — `GET /v1/admin/triage` returns `{ faults[], queues[], sweep }`; ordering is
      **server-side** (severity band, then persistence descending); `persistedSince` derived
      from the first run in the current unbroken streak; **unknown conditions sort last and
      never throw**; Zod response schema; integration tests that seed each condition true
      **and then seed recovery and assert the row disappears** — self-healing is the product
      claim and needs its own test.
- [ ] **PR 3** — panel ported to `apps/web/src/components/admin/triage/`, design-review
      passed against the handoff, copy in `definitions/copy.ts`, rows are the router's
      `<Link>` with the composed `aria-label` kept, `denseAt` still a prop defaulting to 7,
      `buildAttentionItems` and its `slice(0, 3)` deleted.
- [ ] **PR 4** — all six orphan targets removed, zero remaining imports, readers only.
- [ ] **The went-dark regression test exists and passes** — seed a venue with a 7-run
      baseline of ~12 events, then a successful run returning 2, assert it appears in the
      payload. This is the Bluebird case from #624 that stayed invisible for weeks, and it
      is the reason the ticket exists. If nothing else in this run is verified, verify this.
- [ ] **Staging validation on the real URL** — trigger a crawl via the admin canary and
      confirm the panel reflects it. CI green is not staging validation.
- [ ] Follow-up issue filed for the deferred `inbox_reads` / `inbox_read_watermarks` drop
      migration, referencing the deploy it must follow.

No E2E — the panel is admin-only and behind auth; integration coverage of the endpoint plus
component tests is the right bar (plan §Testing).
