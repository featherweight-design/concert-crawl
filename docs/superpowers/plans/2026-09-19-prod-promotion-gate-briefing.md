# Epic Run Briefing — Production Promotion Gate

## Source of truth (read in this order)

1. `docs/superpowers/plans/2026-09-01-prod-promotion-gate.md` — master sequencing.
   Tasks 1–13. **Tasks 1–12 are in scope for this run; Task 13 is not** (see
   "Hard pause points").
2. `docs/superpowers/plans/2026-09-01-prod-to-staging-content-sync.md` — Tasks
   1–5, all in scope. Independent of the gate plan; it delivers value whether or
   not the gate ships, so it can run in parallel or after.
3. `docs/superpowers/specs/2026-09-01-prod-promotion-gate-design.md` — the
   approved design. Decisions D1–D7 and the five workstreams.
4. `docs/runbooks/render-service-config.md` — the live Render config of record.
5. `render.yaml` — descriptive service inventory. **Editing it deploys nothing.**

There are no design handoffs. This epic has no UI surface.

## Current state (verified 2026-09-19)

Re-verify all of this at kickoff; the Render dashboard is edited by hand and
neither `render.yaml` nor the runbook is synced to it.

**Render services.** Six active. The five prod ones are `concert-crawl-api`
(`srv-d7lngqfavr4c73eme3b0`), `concert-crawl-crawler-triggers`
(`crn-d8o7c10k1i2s7389t3v0`), `concert-crawl-crawler-daily`
(`crn-d8o7egog4nts73d2tni0`), `concert-crawl-match-artists`
(`crn-d9nm08e7bikc73c6q39g`), `concert-crawl-spotify-weekly`
(`crn-d9e46ad7vvec73dsn7bg`). The sixth is `concert-crawl-api-staging`
(`srv-d7lnkdmgvqtc73f8eec0`). As of the spec's verification all six were
`autoDeploy: yes`, `autoDeployTrigger: commit`, branch `main`. **Nothing in
Tasks 1–12 changes that** — the flip is Task 13.

**Intentionally absent.** `concert-crawl-billing-jobs` is declared in
`render.yaml` for prod but has no live prod service; only the staging one
exists, and it is suspended. The five staging cron services stay suspended as a
cost measure — that is the anomaly to ignore, not a gap to fix. The content
sync is what fills staging instead.

**GitHub configuration that does NOT exist yet** and is Task 13's Step 1 to
create, so every task below must tolerate its absence:
`RENDER_SERVICE_ID_MATCH_ARTISTS`, `RENDER_SERVICE_ID_SPOTIFY_WEEKLY`,
`VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` (all `production`-environment variables)
and the `VERCEL_TOKEN` secret. `AUTO_DEPLOY_PROD_ENABLED` is not `true`, so
`deploy-prod.yml`'s gate job skips every dispatch.

**Sentry.** `SENTRY_DSN_SMOKE` is the only Sentry secret in the repo; there is
no `SENTRY_DSN` secret. Every workflow maps it. `sentry-capture-message.sh`
exits 0 when the DSN is empty, on purpose — so a wrong secret name fails
silently, which is why Task 10's preflight checks for it by name.

**Staging E2E.** `staging-e2e.yml` is `workflow_dispatch`-only. Its last
push-triggered runs were all on 2026-05-08: 12 runs, 12 failures. A dispatch on
2026-09-01 (run `35452413434`) produced 9 failed / 12 passed in 2.5 minutes with
every infrastructure step green — the suite is recoverable, not rotten.

**Staging test credentials** live in `~/.zshrc` as `E2E_AUDIT_USER_*` /
`E2E_AUDIT_ADMIN_*`. They are in no `.env` file; grepping `.env.local` for them
finds nothing and has repeatedly led to a false "creds are missing" claim.

**Content sync.** `scripts/seed-staging/sync-prod-public-data.ts` already
orchestrates `sync-venues.ts` → `sync-events.ts` →
`sync-price-retrieval-log.ts`. `assertWriteHostNotProd()` refuses to run when
both URLs resolve to the same Neon host, and `openProdReadonly()` returns a
Proxy exposing only `.select` and `.query`. It does not yet sync `artists` or
`venue_guide_chips`, and nothing schedules it.

## Risk shape — REQUIRED

**Event-driven**, with no UI component at all.

Every deliverable here is a workflow, a script, or a scheduled job — a record or
an action produced because something else happened. The characteristic failure
is therefore silence, not a visual defect: a drift alert whose jq filter matches
the wrong response shape reports "no live deploy" forever instead of measuring
drift; a smoke workflow whose wait step returns an unhandled exit code skips
Playwright and still goes green; a content sync that is written but never
scheduled runs zero times and logs nothing. **Gate 6 is the whole ballgame** —
every trigger gets run for real, twice, and its output inspected. Gates 1–5 and
7 do not fire: there is no state table, no forced UI state, no journey a
customer walks, and no customer-facing string in the entire epic.

The second risk is ordering, and the merge order is **not** the numeric task
order. Task 8 consumes Task 10's `render-live-sha.sh`, so 10 must land first.
Tasks 11 and 12 both edit `docs/runbooks/deploy.md`, so they merge sequentially —
11, then 12 — rather than in parallel branches that would overwrite each other.
Task 12 must merge before Task 13 or the health checker alarms five times per
run. The dependency order is therefore:

```
1 → 2 → 3 → 4 → 5 → 6 → 7 → 10 → 8 → 9 → 11 → 12 → 13
```

Following that order is a correctness requirement, not a preference.

## Launch gating — REQUIRED

**(c) Dark until a runbook step.** Nothing in Tasks 1–12 changes what reaches
production or when. They add a dispatch path, a drift alert, two newly-wired
services and a repaired staging E2E suite — all inert while Render and Vercel
still auto-deploy prod on every merge, and while `AUTO_DEPLOY_PROD_ENABLED` is
not `true`.

The vertical goes live at **Task 13**, which is out of scope for this run and is
Hugh's to execute. Its Steps 2, 4 and 5 are the three switches: arm the
workflow, set Vercel's Ignored Build Step to `exit 0`, and PATCH
`autoDeploy: "no"` onto the five prod services.

No `releases.ts` entry: nothing here is user-visible. A `progress.md` row lands
with the final PR of the run, since the epic is a phase-level change to how the
project ships.

## Off-happy-path homes — REQUIRED

**Not applicable — no PR in either plan makes anything newly reachable to an end
user.** Stated explicitly rather than deleted, per the template.

The states this epic creates belong to an *operator*, not a customer, and they
are enumerated because the same "where does this live" question applies:

| New state | Where it lives | How the operator reaches it | Reversible? |
|---|---|---|---|
| Prod is behind `main` by < threshold | Normal, unreported | `render-live-sha.sh` on demand | n/a — resolved by promoting |
| Prod is behind by ≥ 7 days or 25 commits | Sentry warning, `prod-drift-alert.yml` run log | Sentry issue; the workflow's summary | Yes — promote, or record why not |
| Promotion refused: requested ref is not `main` HEAD | `deploy-prod.yml` gate job failure | Actions run log | Yes — re-dispatch from HEAD, or use the override input |
| Promotion partially applied: Render live, Vercel failed | Actions run log; prod serves new API + old web | Re-dispatch, or roll Render back | Yes — expand/contract makes this state safe |
| Rollback fired: Render rolled back, Vercel still new | The auto-rollback admin notification, which names it | `vercel rollback` by hand | Yes — the runbook carries the procedure |
| `autoDeploy` re-enabled on a gated prod service | `prod-deploy-health.yml` unhealthy (Task 12 inverts the check) | Sentry / workflow failure | Yes — PATCH it back to `no` |

Every row is reversible and every row has a surface that reports it. That is the
property Task 12 exists to preserve.

## User journeys — walk script — REQUIRED

Two journeys, both operator-facing. Neither can be walked on local dev — they
are GitHub Actions and Render API paths — so both are walked against **staging
and the real prod dispatch path**, as noted per journey.

### Journey A — promote a release to production

Entry point: GitHub → Actions → **Deploy to Production** → Run workflow.

1. Merge a change to `main` that touches `apps/api/**` — a docs-only or web-only
   merge is filtered out by the staging API's Render build filter and produces no
   deploy to wait on, so it cannot exercise this journey at all. `apps/api/**` is
   the safe choice; only some `packages/` paths are in that filter
   (`db`, `entitlements`, `logger`, `price-pipeline`, `push`, `types`, `config` —
   see `render.yaml`), so `packages/crawler-core` for instance triggers no
   staging API deploy either.
   Expected: staging API builds; `staging-smoke` and `staging-e2e` both run and
   report. ⚠️ Prerequisite: `staging-smoke.yml` gates its push-triggered run on
   the repo variable `STAGING_SMOKE_ENABLED == 'true'` (only a
   `workflow_dispatch` bypasses it), and Task 5 re-arms `staging-e2e.yml` without
   touching that variable. Set it before walking this journey, or expect
   `staging-e2e` alone and dispatch `staging-smoke` by hand.
2. Read the `staging-e2e` result. Expected: a real pass/fail, not a 124 skip. A
   124 is the workflow's benign "no deploy happened, or a fast-follow
   superseded this SHA" exit — it is correct behaviour, and it is **not**
   promotion evidence. Only an actually executed run counts. If the run exits
   124, merge another API-affecting change and read that run instead; this is
   the distinction Task 5 exists to make visible.
3. Dispatch **Deploy to Production** from `main` with a reason. Expected: the
   gate job passes, five Render deploys trigger, wait-for-live succeeds on the
   API, the Vercel step promotes the web app last, smoke passes, rollback does
   not run.
4. Confirm all five services reach `live` and `/v1/health` returns 200.

**Reverse:** force the smoke job to fail (point `PROD_API_URL` at a bad host in
a scratch dispatch, or assert on a selector that does not exist). Expected: the
`rollback` job fires, **the API (`srv-*`) is the only service that actually rolls
back**, all four cron jobs (`crn-*`) emit the documented `::warning::` and exit 0
because Render exposes no rollback API for crons, and the admin notification
names the Vercel step and the four crons as manual follow-ups. Do not read a
green rollback job as "the deploy was undone" — four fifths of it was not.

**Repeat:** dispatch twice in a row with no intervening merge. Expected: the
second run is a no-op deploy that still goes live; nothing double-applies. This
is the pass that matters for `db:migrate` running inside the API `buildCommand`.

**Resume:** cancel a dispatch mid-deploy. Expected: Render finishes the build it
already accepted — GitHub cancelling the job does not cancel a Render deploy.
The operator's recovery is to re-dispatch, and the runbook must say so.

**Walked on:** the real prod dispatch path, at Task 13 Step 3, while auto-deploy
is still on as a safety net. Out of scope for this run — this script is written
now so Hugh's pass is verification rather than discovery.

### Journey B — sync prod content into staging

Entry point: `pnpm tsx scripts/seed-staging/sync-prod-public-data.ts --dry-run`,
then the scheduled workflow.

1. Run with `--dry-run`. Expected: scanned counts per table, zero writes, and
   the FK-order log reading venues → events → artists → price log → chips.
2. Run for real. Expected: staging holds prod's venues, events, artists,
   non-community price log rows and venue guide chips.
3. Query staging for any row the sync could have written in **every** table on
   D6's hard line — `price_submissions`, `submission_confirms`, `event_reports`,
   `event_report_confirms`, `crews`, `social`, `notifications`, `user_profiles`,
   `user_notification_preferences`, `users`, `commerce`, `spotify`,
   `venue_fault_acknowledgements`. Expected: none. All thirteen, not a subset —
   a partial query proves nothing. **This is the check that matters most**: D6's
   hard line exists because the staging transactional-email gate fails open.
4. Confirm the scheduled workflow runs on its cron and reports its counts.

**Reverse:** there is no undo, and that is deliberate — staging is disposable.
The reverse pass instead proves the *guard*: point `NEON_STAGING_DIRECT` at the
prod host and confirm `assertWriteHostNotProd()` refuses to run.

**Repeat:** run twice in a row. Expected: identical final row counts per table
and zero duplicates. Assert on the *final state*, not on the reported counts —
the steps do not all upsert, so the second run's own numbers legitimately
differ. `price_retrieval_log` queries for an existing row and skips it, and
cancelled/postponed events are select-then-insert, so a second run reports
those as skipped rather than inserted. A second run that reports fewer inserts
and more skips, with the same totals, is the pass condition.

**Resume:** kill the process mid-run and re-run. Expected: it completes, and
the final row counts match a clean single run — the partial state is absorbed
by the upserting steps and skipped by the query-and-skip ones.

**Walked on:** staging, against the real prod read-only connection.

## Hard pause points — stop and ask, do not proceed

- **Task 13 of the promotion-gate plan is out of scope for this run.** It is the
  only task that touches live production configuration. An agent must not arm
  `AUTO_DEPLOY_PROD_ENABLED`, set Vercel's Ignored Build Step, or PATCH
  `autoDeploy` on any Render service.
- **Do not PATCH any Render service** for any reason during this run. Reading
  service and deploy state via the API is fine and expected.
- **Do not run the content sync in commit mode against a staging database whose
  host has not been read back and confirmed different from prod's.** The dry-run
  is free; use it first, every time.
- The Vercel prod project's Production Branch and Ignored Build Step values are
  unknown — `vercel project inspect` does not expose them. Task 9 writes the
  workflow step that depends on them but does not need the values; if any task
  appears to need them, stop and ask.
- Never ask Hugh to paste `VERCEL_TOKEN` or any secret into chat. List it in the
  PR body with its creation path.

## Notify-and-proceed

- **Dispatching `staging-e2e.yml` and `staging-smoke.yml`.** Both target
  staging and neither deploys anything. Dispatch freely; capture the run URL and
  the pass/fail counts as the evidence for Tasks 1–5.
- **Running the content sync against staging in commit mode**, once the dry-run
  has been read and the two Neon hosts confirmed distinct. Capture the dry-run
  output as the evidence, then run it and capture the row counts.
- **Dispatching `prod-drift-alert.yml` once it exists.** It only reads the
  Render API and may emit one Sentry warning. Capture the measured drift numbers.

## Done means

- Promotion-gate plan Tasks 1–12 merged, each at the full `pr-review` bar.
- `staging-e2e.yml` runs on push to `main` and reports a real result; the
  previously failing specs pass or are explicitly skipped for a stated reason.
- `match-artists` and `spotify-weekly` appear in the prod deploy, rollback and
  health workflows.
- `prod-drift-alert.yml` exists, has been dispatched at least once, and its
  measured drift matches a hand check.
- `render-check-deploy-health.sh` treats `autoDeploy: "no"` as healthy and
  `"yes"` as the fault, verified in both directions by hand.
- `prod-smoke-after-deploy.yml` is dispatch-only and its dispatch path smokes
  the live prod SHA without waiting for a deploy.
- Content-sync plan Tasks 1–5 merged; `artists` and `venue_guide_chips` sync;
  the job is scheduled; a real staging run is evidenced; and a query proves no
  user-identity table was written.
- Gate 6 artifact committed at `docs/superpowers/side-effects-prod-promotion-gate.md`,
  recording each trigger run, its output, and the twice-run and wrong-audience
  checks.
- `docs/runbooks/auto-deploy-prod.md` documents the promotion procedure, the
  cron HEAD-only limitation (D3), the migration coupling (D4), and the manual
  Vercel rollback.
- `progress.md` row added.
- **Task 13 is left un-run, with its steps and the two open Vercel items
  surfaced in the morning report as Hugh's checklist.**
