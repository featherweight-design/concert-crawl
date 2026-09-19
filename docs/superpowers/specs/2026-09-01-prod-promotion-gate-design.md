# Production Promotion Gate — Design Spec

**Date:** 2026-09-01
**Status:** Approved (Hugh, 2026-09-01) — ready for planning
**Drives:** `docs/superpowers/plans/2026-09-01-prod-promotion-gate.md` and
`docs/superpowers/plans/2026-09-01-prod-to-staging-content-sync.md`

---

## Problem

Staging and prod both auto-deploy from `main` in parallel (decided in #786).
Three consequences:

1. **Staging is not a gate.** Nothing is ever validated in staging *before*
   reaching prod — the two builds race. The staging environment is paid for and
   functionally unused as a test environment.
2. **Every merge costs two prod-side builds per service.** August 2026:
   3,808 Render deploys across 9 services against 886 commits on `main` —
   4.3 deploys per commit, ~9,000 pipeline minutes, ~$40 in overage on top of
   the 1,000 included Starter minutes.
3. **A breaking change reaches prod at merge time.** Post-deploy smoke plus
   auto-rollback catches it after the fact; there is no pre-prod human gate.

Hugh's framing (2026-09-01): *"Say we keep the stream of releases going to
stage, but then only promote specific releases to prod... Otherwise, why have a
staging environment in the first place? We're paying for it, so we should use
it."*

## Goals

- `main` continues to auto-deploy staging on every merge. No change there.
- Prod deploys only on an explicit, logged human action.
- The emergency hotfix path stays a single dispatch, not a special procedure.
- Prod cannot silently rot behind `main` without somebody being told.
- Staging must be worth gating on — its E2E suite has to actually run.
- Staging must hold realistic data, without importing prod user records.

## Non-goals

- Vercel preview deployments as a replacement for staging. Rejected by Hugh:
  previews cover `apps/web` only, and WIP API/cron changes are exactly what
  needs an integration environment.
- Automatic (scheduled) promotion. Considered and dropped — see Decisions.
- Any change to staging's deploy model, cadence, or cost posture.
- Reviving the five suspended staging cron services. They stay suspended as a
  cost measure; the content sync (below) is what fills staging instead.

---

## Current state (verified 2026-09-01, not recalled)

**Six active Render services** (`docs/runbooks/render-service-config.md`), all
`autoDeploy: yes`, `autoDeployTrigger: commit`, branch `main`:

| Service | ID | Env | Wired into deploy-prod.yml? |
| --- | --- | --- | --- |
| `concert-crawl-api` | `srv-d7lngqfavr4c73eme3b0` | prod | yes |
| `concert-crawl-crawler-triggers` | `crn-d8o7c10k1i2s7389t3v0` | prod | yes |
| `concert-crawl-crawler-daily` | `crn-d8o7egog4nts73d2tni0` | prod | yes |
| `concert-crawl-match-artists` | `crn-d9nm08e7bikc73c6q39g` | prod | **no** |
| `concert-crawl-spotify-weekly` | `crn-d9e46ad7vvec73dsn7bg` | prod | **no** |
| `concert-crawl-api-staging` | `srv-d7lnkdmgvqtc73f8eec0` | staging | n/a |

`concert-crawl-billing-jobs` is declared in `render.yaml` for prod but has no
live prod service; only `concert-crawl-billing-jobs-staging` exists, and it is
suspended. Nothing in this epic changes that.

**`.github/workflows/deploy-prod.yml` already is the promotion pipeline.** It
is `workflow_dispatch`-only with a required `reason` input, has a `gate` job
(kill switch `vars.AUTO_DEPLOY_PROD_ENABLED`, non-main refusal, SHA-drift
guards), a `deploy` job on `environment: production` with a preflight and
`render-wait-for-live.sh`, a `smoke` job, and a `rollback` job keyed off the
smoke job's `assertions_failed` output. Its two SHA-drift steps are gated on
`github.event_name == 'workflow_run'` and are therefore currently dead code,
deliberately retained.

**`.github/workflows/prod-smoke-after-deploy.yml`** is the live prod safety
net today: push-triggered on `main`, waits for Render's native auto-deploy to
go live, smokes, and rolls back on failure. Under a promotion gate its push
trigger becomes a liability — prod will not be deploying on push, so it would
wait and fail on every merge.

**`.github/workflows/staging-e2e.yml`** is `workflow_dispatch`-only. Its last
push-triggered runs were all on 2026-05-08 and all failed — 12 runs, 12
failures. A dispatch on 2026-09-01 (run `35452413434`) produced **9 failed /
12 passed in 2.5 minutes** with all infrastructure steps green, so the suite
is recoverable rather than rotten.

**`scripts/seed-staging/` already implements a prod→staging content sync.**
`sync-prod-public-data.ts` orchestrates `sync-venues.ts` → `sync-events.ts` →
`sync-price-retrieval-log.ts`, with `assertWriteHostNotProd()` refusing to run
when both URLs resolve to the same Neon host and `openProdReadonly()` handing
back a Proxy that exposes only `.select` and `.query`. It does **not** sync
`artists` or `venue_guide_chips`, and nothing schedules it.

---

## Decisions

### D1 — Manual promotion, not scheduled

Promotion is a human `workflow_dispatch` of `deploy-prod.yml`. No cron, no
"promote nightly if smoke is green."

**Why:** Hugh wants deliberate staging validation before each prod release and
there is no launch date pressure. The counter-argument (prod rots behind
`main`, and a 40-commit promotion is un-bisectable when it breaks) is real but
is answered by D5 rather than by removing the human.

### D2 — `deploy-prod.yml` dispatch stays the promotion mechanism

Turn Render's native `autoDeploy` **off** on the five prod services and on the
Vercel prod project, then `deploy-prod.yml` is the only path that reaches
prod. Nothing new is built; the kill switch `AUTO_DEPLOY_PROD_ENABLED` is
flipped to `true` and the workflow starts being used for its designed purpose.

**Rejected alternative — a long-lived `production` branch.** Point all five
Render prod services and the Vercel prod project at a `production` branch;
promotion is a fast-forward push. It is genuinely more elegant and it would
structurally fix D3's limitation, because branch HEAD would equal the promoted
SHA for the crons too. Rejected because it needs a second protected ref, new
branch-protection rules, a bot push token, and rollback becomes a force-push of
a branch — trading a known small hole for a new class of git risk, to save
nothing that D3's constraint does not already cover.

### D3 — Cron services cannot be pinned to a SHA; promotion is HEAD-only

`render-trigger-deploy.sh:99-119` omits the `commitId` body parameter for
`crn-*` service IDs because the Render API rejects it there. Only `srv-*` web
services can be pinned. Likewise `render-rollback.sh` cannot roll back a cron
(HTTP 400) — it emits a `::warning::` and exits 0.

So for four of the five prod services, a deploy builds **branch HEAD**, not the
SHA the operator promoted.

**Therefore promotion refuses to run when the requested SHA is not `main`
HEAD.** In the normal flow that costs nothing: Hugh validates staging, which
is running `main` HEAD, and promotes that. It removes the failure mode where an
operator believes they promoted an older SHA while the crons quietly shipped
HEAD. An explicit override input exists for the emergency case and prints a
loud warning naming the four services that will build HEAD regardless.

### D4 — Migrations are coupled to the API promotion, and that is correct

`pnpm db:migrate` runs inside the prod API service's `buildCommand`
(`render.yaml:47`). Gating the API deploy therefore also gates prod
migrations. Because the migration policy is expand/contract-only, a prod
database that is one promotion behind `main` is by construction compatible with
both the old and new code. No change needed — but it must be written down,
because "why did my migration not run" is otherwise an investigation.

### D5 — A prod-drift alert is the condition on D1

A scheduled workflow compares prod's live SHA against `main` and warns when
prod is behind by more than a threshold. This is the part that makes manual
promotion safe rather than merely deliberate: the 2026-08-29 incident's lesson
was that every alert answered "is prod broken?" and none answered "is prod
current?" A promotion gate deliberately makes prod non-current, so the alert
stops being nice-to-have and becomes load-bearing.

Threshold: **7 days or 25 commits behind**, whichever trips first. Warn only —
never auto-promote.

### D6 — Staging gets prod *content*, never prod *users*

Extend the existing sync to cover `artists` and `venue_guide_chips`, and
schedule it.

**Synced (content):** `venues`, `events`, `artists`, `price_retrieval_log`
(excluding `source='community'`), `venue_guide_chips`.

**Never synced (carries user identity or user-authored text):**
`price_submissions` (`user_id`, `last_seen_by`, free-text `note`),
`submission_confirms`, `event_reports` (`reporter_id`),
`event_report_confirms`, `crews`, `social`, `notifications`,
`user_profiles`, `user_notification_preferences`, `users`, `commerce`,
`spotify`, `venue_fault_acknowledgements`.

**Why the hard line:** the staging transactional-email gate (#1613) **fails
open**. Prod user rows in staging plus a suspended-but-restorable cron is a
path to emailing real customers from staging. Content tables carry no FK into
any user table, so this split is enforceable rather than aspirational.

`event_reports` is excluded even though it holds no contact information,
because `reporter_id` is a Clerk user ID and a moderation queue is not test
data anybody needs.

**Rejected alternative — Neon branch from prod.** One command, and it copies
every user row. Same reason as above.

### D7 — Staging E2E is the gate's evidence, so it has to run again

Fix the failing specs and restore the push trigger on `staging-e2e.yml`, so
every merge produces a staging E2E result. Without it, "I validated staging"
means a manual click-through, and the promotion decision has no artifact.

---

## Scope — five workstreams

| # | Workstream | Independent? |
| --- | --- | --- |
| 1 | Revive `staging-e2e.yml`: fix the failing specs, restore the push trigger | yes |
| 2 | Wire `match-artists` + `spotify-weekly` into the prod deploy/rollback/health workflows | yes |
| 3 | Flip the gate: Render + Vercel auto-deploy off, `deploy-prod.yml` armed, `prod-smoke-after-deploy.yml` retired from push | needs 2 |
| 4 | Prod→staging content sync: add `artists` + `venue_guide_chips`, schedule it | yes |
| 5 | Prod-drift alert | needs 3 |

Workstreams 1–3 and 5 are one plan (they share the prod pipeline surface and
must land in order). Workstream 4 is a separate plan — it delivers value
whether or not the gate ships.

## Expected outcome

- Prod-side Render builds drop from ~2 per merge per service to ~2 per
  promotion per service. At a weekly promotion cadence that is a reduction of
  roughly an order of magnitude in prod pipeline minutes; staging's share is
  unchanged.
- A breaking change has a staging E2E run and a human between it and prod.
- Prod being behind `main` is visible, bounded, and alerted on.

## Risks

| Risk | Mitigation |
| --- | --- |
| Prod rots behind `main`; a promotion becomes 40 commits wide | D5 drift alert at 7 days / 25 commits |
| Operator believes an old SHA was promoted; crons shipped HEAD | D3 HEAD-only refusal with an explicit, loud override |
| Prod migration does not run when expected | D4 documented in the runbook; expand/contract makes the lag safe |
| `prod-smoke-after-deploy.yml` left armed waits for a deploy that never comes and fails every merge | Workstream 3 removes its push trigger in the same PR that flips `autoDeploy` |
| Content sync writes to prod | Existing `assertWriteHostNotProd()` + `openProdReadonly()`; new tables must route through the same helpers |
| Staging E2E flakes and nobody trusts the gate | Workstream 1 fixes root causes rather than adding retries |

## Open items needing Hugh

1. **Vercel prod project (`concert-crawl`) Settings → Git**: current Production
   Branch and Ignored Build Step values. `vercel project inspect` does not
   expose either. Needed before workstream 3's Vercel task can be executed.
2. **`VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`** (prod project) as
   GitHub `production`-environment secrets/variables, so the promotion workflow
   can deploy the web app. Creation path is in the plan; values never appear in
   chat or in a file.
