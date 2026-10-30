# Production Promotion Gate — Runbook

Production does not deploy on push. Merging to `main` deploys **staging only**;
prod is promoted by a human dispatching **Deploy to Production**
(`.github/workflows/deploy-prod.yml`) with a reason, after staging has been
validated. That workflow is the only path to production — for routine releases
and for emergency hotfixes alike.

Two repo configurations gate the pipeline; see the "Enabling the pipeline" section below.

## Pipeline overview

```
merge to main
   │
   ├──► CI (gate on PR; advisory on push)
   │
   └──► Render git auto-deploy — staging services ONLY
           ├──► concert-crawl-api-staging
           ├──► concert-crawl-crawler-triggers-staging
           └──► concert-crawl-crawler-daily-staging (suspended; intentional)
                  │
                  ▼
          Staging Smoke Tests  +  Staging E2E
                  │  each waits for the Render staging API to be live on github.sha
                  ▼
          a human reads the results and decides
                  │
                  ▼
   ┌───────────────────────────────────────────────┐
   │ workflow_dispatch: Deploy to Production       │
   │   inputs: reason (required), allow_stale_head │
   └───────────────────────────────────────────────┘
                  │
                  ├──► gate job: refuses a non-main dispatch;
                  │    refuses a SHA that is not main HEAD
                  │    (unless allow_stale_head)
                  ▼
          Render deploys — prod services
           ├──► concert-crawl-api          (srv-*, pinned to the SHA)
           ├──► concert-crawl-crawler-triggers   (crn-*, builds main HEAD)
           ├──► concert-crawl-crawler-daily      (crn-*, builds main HEAD)
           ├──► concert-crawl-match-artists      (crn-*, builds main HEAD)
           └──► concert-crawl-spotify-weekly     (crn-*, builds main HEAD)
                  │
                  ├──► wait for the API to report the new SHA live
                  ▼
          `vercel deploy --prod` promotes the web app
                  │    (last step of the deploy job — see the note below)
                  ▼
          Playwright smoke against prod
                  └──► assertion failure: render-rollback.sh on all five
                       Render services + Resend admin email. The Vercel
                       promotion is NOT rolled back automatically.
```

### The promotion flow, in words

1. A PR merges. CI has already passed as the pre-merge gate.
2. Render auto-deploys the **staging** services from `main`. Prod services have
   `Auto-Deploy: no` and do not move.
3. `staging-smoke.yml` and `staging-e2e.yml` run against staging once Render
   reports the pushed SHA live.
4. A human reads those results — plus anything else worth checking on staging —
   and decides whether to promote.
5. Actions → **Deploy to Production** → Run workflow, on `main`, with a `reason`.
   The reason is required and lands in the run log, so the audit trail of who
   promoted what and why is preserved.
6. The workflow triggers the five Render deploys, waits for the API to report the
   new SHA live, promotes the Vercel web app, and then smokes prod. A smoke
   assertion failure auto-rolls-back Render; the web promotion is manual to
   reverse (see "Vercel + cron rollback is manual" below).

**The emergency hotfix path is the same dispatch.** There is no separate
procedure and no bypass: merge the fix, then dispatch with a reason naming the
incident. Staging validation is a judgement call under an incident, not a
mechanical gate — the gate is the dispatch itself.

**How long a promotion takes: about 9 minutes.** Measured on the first
end-to-end dispatch (run 35521276174, 2026-09-20), 8m35s from the gate starting
to smoke finishing, in four parts: the gate 8s, firing the five Render deploys
and then waiting for the prod API to report the new SHA 2m33s, the Vercel
promotion 3m57s, and prod smoke 1m48s. The rest is queue time between jobs.
Answer "when will this be live?" with about nine minutes rather than an estimate.

Note which part is largest. The gate and smoke are near-constant, so a
materially longer run is either a slow Render build or a slow Next build — and
the Vercel promotion is the bigger of the two, so read the per-step timings on
the `deploy` job before assuming Render is at fault.

The prod **web** app is not in that tree. Its Vercel project has git builds
disabled (Settings → Build and Deployment → Ignored Build Step = `exit 0`), so a
push to `main` deploys nothing to production at all — staging's Render services
and its own Vercel project are the only things a merge touches. `deploy-prod.yml` promotes the web app with
`vercel deploy --prod` as the last step of the `deploy` job, after the Render
waits have cleared but **before** the `smoke` job runs — so a failed API deploy
aborts the job before a new front end can reach a customer, while a failed smoke
does not un-promote the web app. The reverse order is survivable (expand/contract means the old web
app works against the new API), which is why the promotion runs last and not
first.

Render's git integration handles **staging** deploys directly. Prod has
`Auto-Deploy: no` on every service, so nothing reaches production without a
dispatch. The pre-merge gate is still CI on the PR; post-merge, staging is the
validation surface, and the prod smoke inside `deploy-prod.yml` is the safety
net (auto-rollback of the API service). If we ever scale past solo, GitHub merge
queue is the upgrade path for a true pre-merge prod gate.

| Workflow                     | Path                                            | Trigger                            | Kill switch                                 |
| ---------------------------- | ----------------------------------------------- | ---------------------------------- | ------------------------------------------- |
| CI                           | `.github/workflows/ci.yml`                      | push to `main`, PRs                | (always on)                                 |
| Staging Smoke Tests          | `.github/workflows/staging-smoke.yml`           | push to `main` + workflow_dispatch | `STAGING_SMOKE_ENABLED`                     |
| Staging E2E                  | `.github/workflows/staging-e2e.yml`             | push to `main` + workflow_dispatch | (always on)                                 |
| Deploy to Production         | `.github/workflows/deploy-prod.yml`             | `workflow_dispatch` only           | `AUTO_DEPLOY_PROD_ENABLED`                  |
| Prod smoke (standalone)      | `.github/workflows/prod-smoke-after-deploy.yml` | `workflow_dispatch` only           | `PROD_SMOKE_RECONCILER_ENABLED` (vestigial) |
| Prod Deploy Health           | `.github/workflows/prod-deploy-health.yml`      | every 2 hours + workflow_dispatch  | (always on)                                 |
| Prod Drift Alert             | `.github/workflows/prod-drift-alert.yml`        | daily + workflow_dispatch          | (always on)                                 |
| Rollback Production (manual) | `.github/workflows/rollback-prod.yml`           | `workflow_dispatch` only           | (always available)                          |

### Four of the five prod services cannot be pinned

The Render API accepts a `commitId` when deploying a **web service** (`srv-*`)
but rejects it for a **cron job** (`crn-*`). `concert-crawl-api` is the only
`srv-*` service in prod; the four crons always build whatever `main` HEAD is at
the moment Render starts their build.

Two consequences, both load-bearing:

- **The gate refuses to promote a SHA that is not `main` HEAD.** The refusal
  lives in `deploy-prod.yml` itself — the _Refuse promotion of a SHA that is not
  main HEAD_ step in the `gate` job, repeated as _Re-verify promotion target is
  still main HEAD_ in the `deploy` job, because `main` can advance while the
  deploy job waits. Both run each side through
  `.github/scripts/resolve-deployable-sha.sh` (which only resolves a SHA and
  always exits 0) before comparing, so a `[skip ci]` release commit does not read
  as drift. Promoting an older SHA would pin the API to it while the crons
  silently built something newer. `allow_stale_head: true` downgrades both
  refusals to a warning — use it only when you
  have read the diff between the two SHAs and accept a mixed API/cron state.
  It is not a convenience flag.
- **The crons cannot be auto-rolled-back.** See "Caveat on cron service
  rollback" below.

### Prod migrations run inside the API build, so they are gated with it

Drizzle migrations run in `concert-crawl-api`'s Render `buildCommand`. They
therefore execute on any deploy of the prod API — a promotion dispatch, or a
Manual Deploy from the Render dashboard. A merge to `main` runs migrations on
**staging** and nowhere else, so prod's schema legitimately lags `main` between
promotions.

Two consequences worth stating plainly:

- **A dashboard Manual Deploy changes the prod schema.** It is not gated by
  `AUTO_DEPLOY_PROD_ENABLED`, so the operational pause control does not pause
  migrations. Treat a recovery Manual Deploy as a schema change and read the
  pending migrations first.
- **The lag is safe for expand migrations, not for contract ones.** The
  expand/contract policy in `CLAUDE.md` means an additive migration ahead of the
  app is never a broken state. Contract migrations are the other half of the
  pattern and this repo has them (`0011_drop_event_images.sql`,
  `0067_drop_inbox_reads.sql`). If promotions are skipped long enough for an
  expand and its matching contract to land in the same batch, the contract can
  drop a column the still-deployed prod app reads. Before promoting after a long
  gap, list the migrations in the range and confirm no contract step runs ahead
  of the app that stopped using the column.

The scheduled `smoke.yml` (every 6 hours against prod) is independent and remains gated by the separate `SMOKE_ENABLED` variable.

## The standalone prod smoke workflow is dispatch-only

`prod-smoke-after-deploy.yml` used to fire on every push to `main` and wait for
Render's native prod auto-deploy. Under the promotion gate prod does not deploy
on push, so that wait could only ever time out — the workflow is now
`workflow_dispatch` only, and the promotion path's own smoke + rollback jobs
live inside `deploy-prod.yml`.

It is kept because it is the right tool for **smoke prod right now without
deploying anything**: after a Render incident, to validate a semantic-release
commit explicitly, or to confirm prod is healthy before starting an unrelated
change. On smoke failure it still rolls back via `render-rollback.sh` and emails
the admin, so it doubles as a manual "check and repair" path.

`PROD_SMOKE_RECONCILER_ENABLED` is vestigial — every dispatch satisfies the
job's `if:`, and dispatch is the only trigger left. It stays so that re-arming
the workflow on a push or schedule trigger has a switch ready rather than
needing one invented under pressure.

### Caveat on cron service rollback

`render-rollback.sh` detects Render service ID prefix:

- `srv-*` (web service) → calls Render's `/rollback` endpoint, rolls API back to the prior `live` deploy.
- `crn-*` (cron job) → Render's `/rollback` endpoint rejects cron services (HTTP 400; confirmed against the live API). The script emits a `::warning::` annotation and exits 0 so the workflow can continue rolling back the other services.

**Net behavior of "smoke failure → rollback":** only the API web service is
actually rolled back automatically. All four prod crons — crawler triggers,
crawler daily, match-artists, spotify-weekly — require manual rollback: either
via the Render dashboard's Manual Deploy on a prior commit, or (typically
preferred) by reverting the offending commit on `main` and promoting the revert
with a fresh **Deploy to Production** dispatch. Prod no longer auto-deploys, so
merging the revert alone does not fix production. The Resend admin email
surfaces this explicitly so the operator knows manual action is needed for the
crons.

### Semantic-release release commits

semantic-release lands a `chore(release): X.Y.Z [skip ci]` commit ~3 min after
every merge, which becomes the new `main` HEAD. That would make almost every
dispatch look stale, so the main-HEAD gate does not compare raw SHAs: it runs
both sides through `.github/scripts/resolve-deployable-sha.sh`, which walks back
past `[skip ci]` ancestors to the commit that would actually have triggered CI.
A dispatch fired before or after the release commit lands resolves to the same
deployable SHA and passes either way.

The rollback trigger keys on a job output that the smoke job sets ONLY after Playwright has actually run and returned non-zero. Job-level failures that prevent that step from being reached — timeouts, runner deaths, cancellations, env-var preflight crashes — leave the output unset and the rollback skipped. This prevents infrastructure flakiness from causing destructive prod rollbacks.

**How you're notified the cron action is needed:**

1. **GHA workflow-failure email** — the smoke workflow ends with `failure` conclusion. GitHub Actions emails you by default when a workflow on `main` fails.
2. **`::warning::` annotation in the workflow summary** — each skipped cron emits a warning that surfaces on the workflow run's summary card at the top of the page, not buried in step logs.
3. **Admin email via Resend** — the rollback path's "Notify admin" step calls Resend (`alerts@concertcrawl.app` → `ADMIN_EMAIL`) with a summary and the workflow run URL. Runs with `if: always()` so the email goes out even if a rollback step earlier in the job failed; the email body says "rollback was triggered" (not "succeeded") and points at the run URL for the actual outcome. Requires `RESEND_API_KEY` (secret) + `ADMIN_EMAIL` (variable) in the `production` environment. Missing either falls back to the annotation only — non-fatal.

### Manual rollback path

`rollback-prod.yml` exists for the human-driven incident-response case: an issue surfaced via Sentry hours after deploy, a manual prod deploy went sideways, or any other reason an operator needs to roll back independently. It is `workflow_dispatch` only, restricted to `main`, and intentionally **NOT** gated by `AUTO_DEPLOY_PROD_ENABLED` — the kill switch pauses the auto-pipeline; an operator explicitly invoking incident response must still be able to roll back even when the auto-pipeline is off.

## Vercel + cron rollback is manual

This pipeline auto-rolls back **only the Render API web service**.
All four prod **cron jobs** require manual rollback because Render's
`/rollback` endpoint rejects cron services — see the "Caveat on cron
service rollback" section above for the manual paths. **Vercel web
prod is NOT auto-rolled back** either, because Vercel already offers
a one-click instant promote and Vercel deploys are reliable in our
experience. Scripting it would also mean holding a deployment id across
the `deploy` and `rollback` jobs, which nothing else in this pipeline
needs.

This matters more than it used to. `deploy-prod.yml` now promotes the
web app itself (`vercel deploy --prod`), so when auto-rollback fires,
prod is left serving the **new** front end against the **rolled-back**
API until an operator acts. That is the one mixed state the automation
cannot resolve on its own, and the rollback notification email names it.

Either path works, and both take effect within seconds with no rebuild:

**Dashboard**

1. Open the Vercel dashboard → `concert-crawl` (production) project
2. Deployments tab → find the most recent prior deploy marked `Ready`
3. Click ⋯ → **Instant Rollback** (older Vercel UIs label this **Promote to Production**)

**CLI.** A token authenticates; it does not say which project. A fresh
checkout has no `.vercel/project.json`, so link the directory first or
the command will prompt — or pick the wrong project on an account with
several. Link once, then roll back:

```bash
vercel link --yes --project concert-crawl --scope "$VERCEL_ORG_ID" --token "$VERCEL_TOKEN"
vercel rollback --scope "$VERCEL_ORG_ID" --token "$VERCEL_TOKEN"   # reverts to the previous production deployment
```

`VERCEL_ORG_ID` and the token are both in the `production` GitHub
environment (Settings → Environments → production) if you do not have
them to hand.

Pass a specific deployment URL or id as an argument to `rollback` to go
back to something other than the immediately preceding deployment —
which is also the way to skip the `link` step, since a deployment URL
identifies its project on its own.

The auto-rollback workflow's log and notification email both remind the
operator to roll Vercel back in addition to the Render rollback it just
performed.

## Enabling the pipeline

The pipeline ships with two kill switches so we can roll out in two stages.

### Stage 1 — enable staging-smoke only

Use this for at least a few merges to confirm the smoke suite is stable.
`staging-smoke` waits for `deploy-api-staging.yml`'s run for the
triggering commit's SHA (up to 20 min) before running the suite, so a
slow staging deploy won't make the smoke pass against the old code.

1. GitHub repo → **Settings** → **Secrets and variables** → **Actions** → **Variables** tab → **New repository variable**
   - **Name:** `STAGING_API_URL`
   - **Value:** `https://api-staging.concertcrawl.app` (the Vercel staging API since 2026-10-30; it was the onrender host before)
2. Same screen, add **New repository variable**
   - **Name:** `STAGING_SMOKE_ENABLED`
   - **Value:** `true`
3. Trigger a no-op merge to `main` (any tiny PR works) and watch the
   "Staging Smoke Tests" workflow run end-to-end against staging
4. Iterate on the smoke suite if any test flakes

### Stage 2 — close the prod auto-deploy path

This is the configuration that makes the gate real, and most of it lives in the
Render and Vercel dashboards rather than in this repo.

**The order matters.** Arming and rehearsing come before either kill switch, so
that the first end-to-end dispatch runs while the old auto-deploy path is still
underneath it as a safety net. Flip the switches first and a broken dispatch
leaves no way to reach production except a hand-driven Render deploy.

1. Provision the `production` environment configuration in the tables further
   down this file, then set `AUTO_DEPLOY_PROD_ENABLED=true` in repo variables.
   Counter-intuitively this is the switch that **arms the promotion workflow** —
   with it `false`, `deploy-prod.yml` silently skips, so no promotion can run.
   The manual controls below (Render Manual Deploy, Vercel Redeploy,
   `rollback-prod.yml`) are deliberately not gated by it, so recovery stays
   possible.
2. **Rehearse the dispatch while auto-deploy is still on.** ⚠️ This is a real
   promotion, not a dry run — there is no dry-run mode. It triggers all five
   Render prod deploys, runs `vercel deploy --prod`, and runs prod smoke with
   auto-rollback behind it. Promote a `main` HEAD you are willing to have live,
   and read "rehearsal" as rehearsing the _path_, not the _effect_.

   Actions → Deploy to Production → Run workflow, on `main`, reason
   `verifying the promotion path before disabling prod auto-deploy`, leaving the
   stale-HEAD override unchecked. Expect the gate to pass, five Render deploys
   to trigger, wait-for-live to clear, the Vercel step to run, smoke to pass,
   and rollback to stay skipped.

   What makes this step cheap is not that it avoids touching production — it is
   that auto-deploy is still on underneath it, so a broken dispatch still leaves
   a working path to prod. That is the only safety net being relied on, and
   steps 3 and 4 remove it. Fix anything here before continuing.

3. Render dashboard → `concert-crawl-api` → Settings → Build & Deploy → set
   **Auto-Deploy** to `No`. Repeat for each of the four prod crons:
   `concert-crawl-crawler-triggers`, `concert-crawl-crawler-daily`,
   `concert-crawl-match-artists`, `concert-crawl-spotify-weekly`. Leave every
   `-staging` service on `Yes` — staging auto-deploy is the gate's input. Read
   each value back rather than trusting the 200: a Render API 200 has previously
   been returned for a change that did not take.
4. Vercel dashboard → `concert-crawl` (production) project → Settings → **Build
   and Deployment** → **Ignored Build Step** → Behavior `Custom`, Command
   `exit 0`, so a push to `main` does not build the prod web app. The setting is
   not under Settings → Git, where the rest of the git configuration lives.

   Two adjacent settings on the same project are load-bearing and must be left
   alone. **Branch Tracking** must read `main`: it decides which branch Vercel
   treats as production for **git-triggered** deployments, so it is what keeps a
   stray push to another branch from becoming a production deployment. It has no
   say in what a dispatch promotes — `deploy-prod.yml` checks out `github.sha`
   and uploads that checkout, so the commit promoted is the one the gate
   validated regardless of this setting. Do not troubleshoot a wrongly-promoted
   commit here; the gate job and the checkout ref are where that lives.
   **Auto-assign Custom Production
   Domains** must stay enabled — it fires on a merge to the production branch
   _or_ a `vercel deploy --prod`, and the second clause is the promotion path.
   Disabled, a promotion builds cleanly and never takes over `concertcrawl.app`,
   so it reports green while serving the previous release.

   `exit 0` is expected to be safe for the CLI promotion, because Vercel
   evaluates the Ignored Build Step only for git-triggered deployments and
   `vercel deploy --prod` uploads source directly. That combination is the one
   thing the staged rollout cannot prove in advance — the step 2 rehearsal
   necessarily runs before this setting exists. So dispatch once more
   immediately after saving it and confirm the Vercel step produces a real
   production deployment rather than a skipped one. If it skips, the fix is an
   ignore command conditioned on `$VERCEL_GIT_COMMIT_REF` rather than a flat
   `exit 0`.

5. Confirm the gate holds by merging to `main` — but **the change has to touch
   `apps/api/**` or one of the packages the staging API's `buildFilter` lists in
   `render.yaml`.** A docs-only merge cannot verify this step: the filter skips
   it, so no staging API deploy is created, and `staging-e2e` then exits its
   wait at 124 and skips its suite rather than running it. Both would read as
   "the gate is holding" while having tested nothing. Then check that:

   - the staging API builds, and `staging-smoke` and `staging-e2e` both run
     their suites rather than skipping;
   - the prod API records no new deploy;
   - the prod Vercel project records a **skipped** deployment while
     `concert-crawl-staging` builds normally.

   A staging project that also skips means the Ignored Build Step went on the
   wrong project — back it out before going further. Do not read
   `prod-smoke-after-deploy.yml` staying quiet as evidence of anything: it is
   `workflow_dispatch`-only, so it cannot run on a merge whatever these settings
   say.

   A docs-only merge is still worth watching for the two Vercel signals, which
   do not depend on the filter — it just cannot tell you anything about the
   Render side or the staging suites.

`render.yaml` records these values (`autoDeploy: false` on the five prod
services) but does **not** apply them — it is descriptive, not a Blueprint.
Change the dashboard and `render.yaml` in the same session.

### Stage 3 — arm the standalone prod smoke workflow

**Prerequisites** (verify before flipping the switch — the smoke workflow hard-fails its preflight step if any are missing):

- `production` environment **variables**: `RENDER_SERVICE_ID_API`, `RENDER_SERVICE_ID_CRAWLER_TRIGGERS`, `RENDER_SERVICE_ID_CRAWLER_DAILY`, `RENDER_SERVICE_ID_MATCH_ARTISTS`, `RENDER_SERVICE_ID_SPOTIFY_WEEKLY`. Plus `PROD_URL` + `PROD_API_URL` at repo level. Plus `ADMIN_EMAIL` at repo level (or production env — either resolves under `environment: production`).
- `production` environment **secrets**: `RENDER_API_TOKEN`, `RESEND_API_KEY` (optional — graceful-degrades to a `::warning::` if missing).
- Repo-level **secrets**: `E2E_TEST_USER_EMAIL`, `E2E_TEST_USER_PASSWORD`, `SENTRY_DSN_SMOKE`.

All of these are already provisioned if you're past Stage 2 of `production-launch.md`. The smoke workflow's preflight step prints a clean "Missing X" list if any are absent, so an arming attempt without all prerequisites fails fast and visibly.

**Enable:**

Nothing needs arming: `prod-smoke-after-deploy.yml` is `workflow_dispatch` only,
and every dispatch satisfies its `if:` regardless of
`PROD_SMOKE_RECONCILER_ENABLED`. Dispatch it from Actions when you want to smoke
prod without deploying, and watch it run install → smoke → green.

### Pausing the pipeline

- **To stop automated prod deploys:** flip `AUTO_DEPLOY_PROD_ENABLED=false`. The
  promotion workflow's `gate` job then silently skips, so a dispatch looks idle
  rather than failing. This does not seal prod: a Render dashboard Manual Deploy,
  a Vercel Redeploy, and `rollback-prod.yml` all still reach production, and
  `rollback-prod.yml` is deliberately **not** gated by it — incident response
  must not be pausable by a feature flag.
- **To stop staging deploys:** flip `Auto-Deploy: no` on the three staging Render
  services. Prod is unaffected, but you lose the validation surface the
  promotion decision rests on.
- **To stop staging validation runs:** flip `STAGING_SMOKE_ENABLED=false`.
  `workflow_dispatch` still works regardless.

## Required GitHub configuration

### Repository variables (Settings → Variables → Actions)

| Variable                        | Required by             | Notes                                                                                                                                                                                                                                                                                  |
| ------------------------------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `STAGING_URL`                   | staging-smoke           | already present — `https://staging.concertcrawl.app`                                                                                                                                                                                                                                   |
| `STAGING_API_URL`               | staging-smoke           | `https://api-staging.concertcrawl.app` (Vercel since 2026-10-30)                                                                                                                                                                                                                       |
| `RENDER_SERVICE_ID_API_STAGING` | staging-smoke           | staging API service ID (e.g. `srv-abc123`). No longer read since 2026-10-30: staging-smoke waits for `deploy-api-staging.yml` with `GITHUB_TOKEN` instead.                                                                                                                             |
| `PROD_URL`                      | deploy-prod (smoke job) | already present                                                                                                                                                                                                                                                                        |
| `PROD_API_URL`                  | deploy-prod (smoke job) | already present                                                                                                                                                                                                                                                                        |
| `STAGING_SMOKE_ENABLED`         | staging-smoke           | **new** — default `false`; set to `true` in Stage 1                                                                                                                                                                                                                                    |
| `AUTO_DEPLOY_PROD_ENABLED`      | deploy-prod             | must be `true` — it arms the promotion workflow, the only _automated_ path to prod. With it `false` the `gate` job silently skips, so no promotion can run; a Render dashboard Manual Deploy and `rollback-prod.yml` still reach prod by design. The name predates the promotion gate. |
| `PROD_SMOKE_RECONCILER_ENABLED` | prod-smoke-after-deploy | vestigial — that workflow is `workflow_dispatch` only and every dispatch satisfies its `if:` regardless. Kept so re-arming it on a push or schedule trigger has a switch ready.                                                                                                        |

### `production` environment — Variables (Settings → Environments → production)

| Variable                             | Required by                                                                      | Notes                                                                                                                                                                                                                                                                                                                                                      |
| ------------------------------------ | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `RENDER_SERVICE_ID_API`              | prod-smoke-after-deploy, deploy-prod (manual), rollback-prod, prod-deploy-health | prod API service ID (visible in Render dashboard URL, e.g. `srv-abc123`). Used for the smoke workflow's `render-wait-for-live.sh` + `render-rollback.sh`, the manual deploy POST, and rollback.                                                                                                                                                            |
| `RENDER_SERVICE_ID_CRAWLER_TRIGGERS` | prod-smoke-after-deploy, deploy-prod (manual), rollback-prod, prod-deploy-health | prod crawler triggers cron service ID. Used by smoke's rollback step (auto-skips for crons), deploy-prod's API POST, and rollback-prod.                                                                                                                                                                                                                    |
| `RENDER_SERVICE_ID_CRAWLER_DAILY`    | prod-smoke-after-deploy, deploy-prod (manual), rollback-prod, prod-deploy-health | prod crawler daily cron service ID. Same.                                                                                                                                                                                                                                                                                                                  |
| `RENDER_SERVICE_ID_MATCH_ARTISTS`    | prod-smoke-after-deploy, deploy-prod (manual), rollback-prod, prod-deploy-health | prod match-artists cron service ID (`crn-*`). Same. Every workflow in this table fails its preflight until this is set.                                                                                                                                                                                                                                    |
| `RENDER_SERVICE_ID_SPOTIFY_WEEKLY`   | prod-smoke-after-deploy, deploy-prod (manual), rollback-prod, prod-deploy-health | prod spotify-weekly cron service ID (`crn-*`). Same. Every workflow in this table fails its preflight until this is set.                                                                                                                                                                                                                                   |
| `VERCEL_ORG_ID`                      | deploy-prod                                                                      | The Vercel **Team ID** (`team_*`). Vercel renamed Org to Team in the dashboard but the CLI and API still call it `orgId`, so the dashboard offers no field with this name — read the Team ID from Vercel → Settings → General.                                                                                                                             |
| `VERCEL_PROJECT_ID`                  | deploy-prod                                                                      | `prj_*`, from the **production** `concert-crawl` project → Settings → General. Taking it from `concert-crawl-staging` by mistake sends every promotion to the staging project instead: `--prod` aliases whichever project the id names, so the build lands on staging's domains and `concertcrawl.app` is never updated. The run reports green throughout. |
| `ADMIN_EMAIL`                        | prod-smoke-after-deploy, deploy-prod (manual)                                    | **optional** — address that receives an auto-rollback notification when smoke fails. Falls back to a `::warning::` annotation only when unset. Currently at repo level — see `production-launch.md` for the move-to-env-scope option.                                                                                                                      |

Service IDs live in the `production` environment (not at the repo level) so they are scoped to prod-only workflow runs and stay aligned with `production-launch.md`. The `deploy-prod.yml` and `rollback-prod.yml` jobs use `environment: production` and read them as `vars.RENDER_SERVICE_ID_*`.

### `production` environment — Secrets (Settings → Environments → production)

| Secret             | Required by                                                                      | Notes                                                                                                                                                                                                                                                                                                  |
| ------------------ | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `RENDER_API_TOKEN` | prod-smoke-after-deploy, deploy-prod (manual), rollback-prod, prod-deploy-health | Render → Account Settings → API Keys → generate a token with deploy + read permissions. Consumed by the smoke workflow's `render-wait-for-live.sh` + `render-rollback.sh`, the manual deploy POST, and `rollback-prod.yml`.                                                                            |
| `RESEND_API_KEY`   | prod-smoke-after-deploy, deploy-prod (manual)                                    | **optional** — same Resend API key the API + crawler already use. When set together with `ADMIN_EMAIL`, the rollback path emails the admin from `alerts@concertcrawl.app`. Missing → warning annotation only.                                                                                          |
| `VERCEL_TOKEN`     | deploy-prod                                                                      | Vercel → Account Settings → Tokens. Scope it to the **`concert-crawl` project**, not "All Projects" — it only ever runs `vercel deploy --prod` against the prod web project. If the token carries an expiry, record that date here, because a promotion is the only thing that will notice it lapsing. |

No per-service `RENDER_DEPLOY_HOOK_*` secrets are needed: the deploy POST uses the Render API directly with `RENDER_API_TOKEN` + the service IDs above. Render Cron Jobs don't expose a Deploy Hook UI anyway (confirmed 2026-06-23), so the hook-based approach couldn't have covered any of the four prod crons.

### Repository-level secrets (Settings → Secrets and variables → Actions)

| Secret             | Required by   | Notes                                                                                                                                                                                          |
| ------------------ | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `RENDER_API_TOKEN` | staging-smoke | same Render API token as above, stored at repo level. staging-smoke stopped reading it on 2026-10-30, when it began waiting for `deploy-api-staging.yml` instead of `render-wait-for-live.sh`. |

`RENDER_API_TOKEN` is the only credential the wait-for-live and rollback
scripts need. Scope it to deploy + read permissions only — the scripts
just list recent deploys and POST `/rollback`, nothing else.

## Testing the rollback path

There are two smoke-then-rollback paths and they are not the same code. A
promotion's automatic smoke and its automatic rollback live in
`deploy-prod.yml` (`smoke` job, then `rollback` on an assertion failure).
`prod-smoke-after-deploy.yml` is the standalone dispatch-only copy, and it
carries its own `render-rollback.sh` steps.

**⚠️ The bogus-hostname test is destructive. It really rolls back production.**
Pointing `PROD_API_URL` at a hostname that does not resolve and then dispatching
the standalone **Prod smoke** workflow makes the smoke fail against live prod,
which fires `render-rollback.sh` on the real `concert-crawl-api` — moving prod's
API to its previous deploy while the Vercel web app stays on the current one.
That leaves a genuine web/API version mismatch until you deploy forward again.
Do not run it as a routine wiring check.

If you need to verify the rollback wiring, prefer one of these:

- Read the two workflows' rollback steps and `render-rollback.sh` directly.
- Run the equivalent against staging, where a rolled-back API costs nothing.
- If you genuinely must exercise it on prod, schedule it as a controlled test:
  announce it, expect the API to move to the prior deploy, and plan the
  forward promotion that restores parity before you start. Restore
  `PROD_API_URL` afterward.

### Sanity-checking preflight without touching prod

A bare `workflow_dispatch` of the same workflow exercises the preflight and then
smokes real prod — which is a legitimate health check in its own right, and the
cheapest way to confirm `environment: production` secret resolution after
rotating any of the required secrets. There is no Render wait step to exercise
any more; the promotion workflow owns the wait.

**For the manual rollback path:** invoke **Rollback Production (manual)** with `workflow_dispatch` and a `reason` value. The script rolls back to the prior live deploy on each service. Use this exact path for any incident response that doesn't originate from a freshly-deployed smoke failure.

## "Is prod current?" is a separate question from "is prod up?"

Everything above answers the second question. On 2026-08-29 the first one
went unanswered for ~20 hours: the Render account ran out of build
minutes, every auto-deploy returned `build_failed` in under 1.5s, and prod
served good-but-stale code five commits behind `main`. Sentry was
correctly silent, because there were no errors. The smoke never ran, so
auto-rollback correctly did not fire — and rolling back would have been
the wrong action anyway.

`.github/workflows/prod-deploy-health.yml` covers that gap. Every 2 hours
it asks Render whether each prod service is still _able_ to accept
deploys, and reports to **Sentry** if not. The run also exits non-zero, so
there is a red Actions status too — but Sentry is the channel that is
meant to reach you. The one signal that did fire during the incident was a
failed Actions run, and that is an email that went unread.

It reports only. Every condition it detects needs a human decision, and
re-triggering a build that failed for want of build minutes would burn the
few that remain.

### Troubleshooting: "autoDeploy is 'yes'" is a leak, not a misconfigured check

The `autoDeploy` expectation in `render-check-deploy-health.sh` is inverted from
what it was before the prod promotion gate. Under the gate prod deploys only
through a deliberate dispatch of `deploy-prod.yml`, so `autoDeploy = "no"` on a
prod service is the correct state and the checker treats it as healthy.
`autoDeploy = "yes"` is now the fault: somebody re-enabled auto-deploy in the
Render dashboard and merges to `main` are reaching prod without a promotion.

Responder action: confirm in the Render dashboard, set Auto-Deploy back to `No`
on the named service, then check whether an unpromoted commit already went live.
Do not "fix" the checker.

Any value other than `yes` or `no` exits 1 rather than 2 — that is the Render
API response shape changing, not a prod problem.

Two questions this checker deliberately does **not** answer:

- **Is prod current?** Under the gate prod is supposed to sit behind `main`
  until someone promotes, so `prod-drift-alert.yml` owns that question. A green
  deploy-health run says nothing about how old prod is.
- **Is the deploy path being watched at all?** Only partly. If the workflow's
  own preflight fails — a missing service-ID variable, or a missing
  `SENTRY_DSN_SMOKE` — there is nowhere to send a Sentry event and the only
  signal is a red Actions run. Every other failure path, including the check
  step dying mid-run, reports to Sentry as a warning rather than going quiet.

Full write-up: `docs/incidents/2026-08-29-render-build-minutes.md`.
Service settings and why they are what they are:
`docs/runbooks/render-service-config.md`.

### The drift alert — when promotion is simply forgotten

`prod-deploy-health.yml` answers "can prod deploy?". It cannot answer "should
someone have promoted by now?", and under a gate that requires a human to act,
forgetting is the characteristic failure. `.github/workflows/prod-drift-alert.yml`
runs daily and reports to Sentry when prod has fallen too far behind `main`.

Thresholds, both in the workflow's `env` block:

| Threshold            | Value | Meaning                                                 |
| -------------------- | ----- | ------------------------------------------------------- |
| `MAX_COMMITS_BEHIND` | 25    | undeployed API-relevant commits sitting on `main`       |
| `MAX_DAYS_BEHIND`    | 7     | age of the **oldest** undeployed commit, not the newest |

Two details that matter when reading its output:

- **Only commits that would change the API count.** The workflow reads the API
  service's own Render build filter and counts commits touching those paths, so
  a week of web-only work correctly produces no drift.
- **Drift is measured from the oldest waiting commit.** A fix that has been
  stranded for nine days trips the alert even if newer commits landed this
  morning, because that oldest commit is the one someone is waiting on.

**When it fires:** validate staging as usual and dispatch **Deploy to
Production**. If the backlog genuinely should not ship — a half-finished vertical,
a change waiting on a Hugh decision — the right action is to say so in the Sentry
issue rather than to raise the thresholds. Raising them hides the next real one.

## Limitations and known gaps

- **Vercel web is not auto-rolled back.** See "Vercel + cron rollback is manual" above.
- **The gate depends on a dashboard setting this repo cannot enforce.** Prod's
  `Auto-Deploy: no` lives in Render, and `render.yaml` only records it. Someone
  flipping it back in the dashboard reopens the push-to-prod path silently.
- **DB schema rollback is out of scope.** Per the expand/contract migration
  policy in `CLAUDE.md`, an app-only rollback is always schema-safe — the
  prior app version is compatible with the current schema. If a migration
  itself needs to be undone, see `docs/runbooks/db-rollback.md`.
- **No Sentry-based rollback trigger.** v1 uses the post-deploy smoke as
  the only rollback signal. A future iteration could add a Sentry error
  rate spike check on top of the smoke gate.
- **Rollback target selection is one level deep.** The script picks the
  most recently finished `live`-or-`deactivated` deploy that is older
  than the current live's "original deploy" (the prior deploy with the
  same commit SHA, if any). This prevents a second consecutive rollback
  from rolling forward onto the bad deploy we just rolled away from —
  but it also means a second consecutive auto-rollback will refuse and
  exit non-zero. If you need to walk further back through history (e.g.,
  multiple bad releases in a row), do it via the Render dashboard rather
  than re-running this workflow.
- **Every `deploy-prod` dispatch requires a `reason`.** This is intentional — it
  shows up in the workflow log, so the audit trail of who promoted what and why
  is preserved. It is the only record of the promotion decision.
