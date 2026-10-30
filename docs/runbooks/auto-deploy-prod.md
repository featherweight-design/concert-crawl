# Production Promotion Gate — Runbook

Production does not deploy on push. Merging to `main` deploys **staging only**;
prod is promoted by a human dispatching **Deploy to Production**
(`.github/workflows/deploy-prod.yml`) with a reason, after staging has been
validated. That workflow is the only path to production — for routine releases
and for emergency hotfixes alike.

Two repo configurations gate the pipeline; see the "Enabling the pipeline" section below.

**This page describes prod after the Render exit's prod cutover.** From the
cutover, the prod API runs on Vercel (project `concert-crawl-api`, production,
`https://api.concertcrawl.app`), and match-artists and spotify-weekly run as
Vercel Cron Jobs inside it. Only the two crawler crons are still deployed on
Render. The PR that changed `deploy-prod.yml` merges before the cutover, so
between the two, a dispatch would already deploy to Vercel. Do not dispatch in
that window except as part of the cutover itself. The prod Render services
`concert-crawl-api`, `concert-crawl-match-artists` and
`concert-crawl-spotify-weekly` are suspended at the cutover; see
`docs/runbooks/render-service-config.md`.

## Pipeline overview

```
merge to main
   │
   ├──► CI (gate on PR; advisory on push)
   │
   └──► deploy-api-staging.yml — staging API on Vercel
           (api-staging.concertcrawl.app; migrates staging first)
                  │
                  ▼
          Staging Smoke Tests  +  Staging E2E
                  │  each waits for deploy-api-staging.yml's run for github.sha
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
          deploy job
           ├──► re-check main HEAD, then at once:
           ├──► Render deploy — concert-crawl-crawler-triggers (crn-*, builds main HEAD)
           ├──► Render deploy — concert-crawl-crawler-daily    (crn-*, builds main HEAD)
           ├──► record the deployment api.concertcrawl.app serves (rollback target)
           ├──► pnpm db:migrate against DATABASE_URL_DIRECT
           ├──► vercel deploy --prod — API (concert-crawl-api, the checked-out SHA,
           │      meta prevApiDeployment = the recorded deployment)
           │      └──► promote it if the project is in a rollback state
           ├──► /v1/health on PROD_API_URL
           │      └──► either check fails: vercel rollback of the API, job stops
           └──► vercel deploy --prod — web app (last step; see the note below)
                  │
                  ▼
          Playwright smoke against prod
                  └──► assertion failure: vercel rollback of the API to the
                       recorded deployment, render-rollback.sh warnings for
                       the two crawler crons, Resend admin email. The web
                       promotion is NOT rolled back automatically.
```

match-artists and spotify-weekly are not in the tree because they are part of
the API: Vercel Cron Jobs in `concert-crawl-api` (`0 16 * * *` and
`30 15 * * 1`, calling `GET /v1/internal/cron/match-artists` and
`GET /v1/internal/cron/spotify-weekly` with a `CRON_SECRET` bearer). They ship
with every API deploy.

### The promotion flow, in words

1. A PR merges. CI has already passed as the pre-merge gate.
2. `deploy-api-staging.yml` migrates staging and deploys the staging API to
   Vercel. Nothing in prod moves: the prod Vercel projects have Git deployments
   off, and the two prod crawler crons have `Auto-Deploy: no`.
3. `staging-smoke.yml` and `staging-e2e.yml` run against staging once that
   deploy has finished.
4. A human reads those results — plus anything else worth checking on staging —
   and decides whether to promote.
5. Actions → **Deploy to Production** → Run workflow, on `main`, with a `reason`.
   The reason is required and lands in the run log, so the audit trail of who
   promoted what and why is preserved.
6. The workflow re-checks main HEAD and triggers the two Render crawler
   deploys straight after it (they build branch HEAD, so nothing slow sits
   between the check and the trigger). It then records the API deployment
   prod serves now, migrates the prod database, deploys the API to Vercel
   production, checks the hostname serves it and `/v1/health` answers (rolling
   the API back itself if either fails), promotes the Vercel web app, and then
   smokes prod. A smoke
   assertion failure rolls the API back on Vercel; the crawler crons and the
   web promotion are manual to reverse (see "Vercel + cron rollback is manual"
   below).

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
materially longer run is either a slow API build or a slow Next build — and
the Vercel promotion is the bigger of the two, so read the per-step timings on
the `deploy` job before assuming the API is at fault.

That measurement predates the prod cutover. From the cutover, the Render part
is replaced by the migration and the API's `vercel deploy --prod`, which waits
for Vercel's remote build (about 3-5 minutes), and the two crawler triggers,
which return as soon as Render has queued them. Re-measure on the first
post-cutover dispatch.

The prod **web** app has git builds disabled (Settings → Build and Deployment →
Ignored Build Step = `exit 0`), and the prod API project has Git deployments off
too, so a push to `main` deploys nothing to production at all. `deploy-prod.yml`
promotes the web app with `vercel deploy --prod` as the last step of the
`deploy` job, after the API is deployed and healthy but **before** the `smoke`
job runs — so a failed API deploy aborts the job before a new front end can
reach a customer, while a failed smoke does not un-promote the web app. The
reverse order is survivable (expand/contract means the old web app works against
the new API), which is why the promotion runs last and not first.

Nothing reaches production without a dispatch: Git deployments are off on both
prod Vercel projects, and the two prod crawler crons have `Auto-Deploy: no`. The
pre-merge gate is still CI on the PR; post-merge, staging is the validation
surface, and the prod smoke inside `deploy-prod.yml` is the safety net
(auto-rollback of the API). If we ever scale past solo, GitHub merge queue is
the upgrade path for a true pre-merge prod gate.

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

### The two crawler crons cannot be pinned

The Render API accepts a `commitId` when deploying a **web service** (`srv-*`)
but rejects it for a **cron job** (`crn-*`). The two prod crawler crons,
`concert-crawl-crawler-triggers` and `concert-crawl-crawler-daily`, always build
whatever `main` HEAD is at the moment Render starts their build. The API and the
web app are uploaded from the checked-out SHA, so they are pinned. (Before the
prod cutover this was four crons; match-artists and spotify-weekly now ship
inside the API.)

Two consequences, both load-bearing:

- **The gate refuses to promote a SHA that is not `main` HEAD.** The refusal
  lives in `deploy-prod.yml` itself — the _Refuse promotion of a SHA that is not
  main HEAD_ step in the `gate` job, repeated as _Re-verify promotion target is
  still main HEAD_ in the `deploy` job, because `main` can advance while the
  deploy job waits. Both run each side through
  `.github/scripts/resolve-deployable-sha.sh` (which only resolves a SHA and
  always exits 0) before comparing, so a `[skip ci]` release commit does not read
  as drift. Promoting an older SHA would ship it to the API and the web app
  while the crawler crons silently built something newer.
  `allow_stale_head: true` downgrades both refusals to a warning — use it only
  when you have read the diff between the two SHAs and accept a mixed
  API/crawler state.
  It is not a convenience flag.
- **The crons cannot be auto-rolled-back.** See "Caveat on cron service
  rollback" below.

### Prod migrations run in the deploy job, before the API deploy

Drizzle migrations run as the `Migrate prod DB` step of `deploy-prod.yml`:
`pnpm db:migrate` against `DATABASE_URL_DIRECT`, the prod Neon branch's direct
(non-pooler) URL. The preflight refuses a `-pooler` host. The step runs after
the rollback target is recorded and before `vercel deploy --prod`, because
Vercel builds have no database access. (Until the prod cutover they ran inside
`concert-crawl-api`'s Render `buildCommand`; that build now only runs if the
suspended Render API is resumed and redeployed.) A merge to `main` runs
migrations on **staging** and nowhere else, so prod's schema legitimately lags
`main` between promotions.

Consequences worth stating plainly:

- **A failed migration stops the API and the web app, not the crawlers.** The
  two crawler deploys were queued on Render before the migration step and keep
  building, so the crawlers can go live on the new code against the old
  schema while the API and the web app stay on the previous release. Check
  the crawler services after a failed migration. A migration that half-applied
  needs `docs/runbooks/db-rollback.md`, not a code rollback.
- **A code rollback does not roll the schema back.** `vercel rollback` and
  `rollback-prod.yml` move code only. Expand/contract is what makes that safe.
- **Resuming and redeploying the suspended Render API changes the prod
  schema.** Its build still runs `pnpm db:migrate`, and it is not gated by
  `AUTO_DEPLOY_PROD_ENABLED`. Treat it as a schema change and read the pending
  migrations first.
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
deploying anything**: after a hosting incident, to validate a semantic-release
commit explicitly, or to confirm prod is healthy before starting an unrelated
change. On smoke failure it rolls the API back on Vercel (`vercel rollback` to
the deployment that served prod before the one the hostname serves), runs
`render-rollback.sh` for the two crawler crons (which only warns), and emails
the admin, so it doubles as a manual "check and repair" path.

`PROD_SMOKE_RECONCILER_ENABLED` is vestigial — every dispatch satisfies the
job's `if:`, and dispatch is the only trigger left. It stays so that re-arming
the workflow on a push or schedule trigger has a switch ready rather than
needing one invented under pressure.

### Caveat on cron service rollback

The API is no longer rolled back by `render-rollback.sh`. It is on Vercel, and
the rollback jobs run `vercel rollback` against it (see "Vercel + cron rollback
is manual" below). `render-rollback.sh` now runs only for the two crawler crons,
and it detects the Render service ID prefix:

- `srv-*` (web service) → calls Render's `/rollback` endpoint, rolls the service back to the prior `live` deploy. No prod `srv-*` service is rolled back by the workflows any more.
- `crn-*` (cron job) → Render's `/rollback` endpoint rejects cron services (HTTP 400; confirmed against the live API). The script emits a `::warning::` annotation and exits 0 so the workflow can continue.

**Net behavior of "smoke failure → rollback":** only the API is actually rolled
back automatically, and match-artists and spotify-weekly go back with it because
they are part of the API deployment. The two crawler crons — crawler triggers
and crawler daily — require manual rollback: either
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

What it does:

- **API:** `vercel rollback` to the deployment that served prod before the one
  `PROD_API_URL`'s hostname serves now. Each deploy from `deploy-prod.yml`
  records that in its `meta.prevApiDeployment`, so the target is the real
  service history: a deployment that was itself rolled back is never picked,
  and neither is the project's first deployment (a staging build that Vercel
  registered with target production). To go somewhere else, pass a deployment
  id (`dpl_…`) in the optional `api_deployment` input; that is also the only
  way to roll back a deployment that records nothing (the first production
  deploy, or one made outside `deploy-prod.yml`). Running it twice in a row
  with the input empty goes one more step back along that history each time.
- **Crawler crons:** `render-rollback.sh` for both, which only warns (see the
  caveat above).
- **Web app:** not touched. See the next section.

## Vercel + cron rollback is manual

This pipeline auto-rolls back **only the API**, on Vercel. The two
prod **crawler crons** require manual rollback because Render's
`/rollback` endpoint rejects cron services — see the "Caveat on cron
service rollback" section above for the manual paths. **Vercel web
prod is NOT auto-rolled back** either, because Vercel already offers
a one-click Instant Rollback and Vercel deploys are reliable in our
experience.

**How the API rollback works.** Before anything ships, the `deploy` job
records the deployment `PROD_API_URL`'s hostname serves. Two things can roll
the API back to it with `vercel rollback`:

- The `deploy` job itself, when the API deploy succeeded but a check after it
  failed: the production hostname does not serve the new deployment even after
  a promote, or `/v1/health` on `PROD_API_URL` does not return 200 after six
  tries. Vercel has already moved the hostname to the new deployment by then
  (Render kept the old build serving until the new one passed its health
  check; Vercel does not), so the job rolls back in place and stops. The web
  app has not shipped yet; the crawler crons were triggered first and do not
  depend on the API's version.
- The `rollback` job, when prod smoke asserts a failure.

On the first production deploy there is nothing to record, so neither can roll
back. The job warns about this and the rollback step fails with a message
saying so. The fallback then is to fix forward, or to fall back to the
suspended Render services: the full checklist is "Falling back to Render" in
`docs/runbooks/production-launch.md` (Step 8).

**After a rollback, the project is in a rollback state.** Vercel stops
assigning the production domains to new production deployments until one is
promoted. A plain `vercel deploy --prod` would then go READY while
`api.concertcrawl.app` kept serving the rolled-back deployment, and nothing
would fail. `deploy-prod.yml` handles this: after the API deploy it checks what
the hostname serves and runs `vercel promote` on the new deployment if it is not
that one. So the next promotion needs nothing extra. If you deploy the API by
hand after a rollback, promote it yourself.

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
operator to roll the web app back by hand, in addition to the API rollback it
just attempted. The same commands work for the API project
(`--project concert-crawl-api`), which is how to roll the API back without
the workflow.

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

These steps were written, and run, when all five prod services were on Render.
They are kept as the record of how the gate was closed. From the prod cutover,
step 3 matters only for the two crawler crons (the other three prod Render
services are suspended), and the API's equivalent of step 4 is that the Vercel
project `concert-crawl-api` has Git deployments off, the same as staging.

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

- `production` environment **variables**: `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID_API`, `RENDER_SERVICE_ID_CRAWLER_TRIGGERS`, `RENDER_SERVICE_ID_CRAWLER_DAILY`. Plus `PROD_URL` + `PROD_API_URL` at repo level. Plus `ADMIN_EMAIL` at repo level (or production env — either resolves under `environment: production`).
- `production` environment **secrets**: `VERCEL_TOKEN`, `RENDER_API_TOKEN`, `RESEND_API_KEY` (optional — graceful-degrades to a `::warning::` if missing).
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
  rather than failing. This does not seal prod: a Render dashboard Manual Deploy
  of a crawler cron, a Vercel Redeploy or `vercel deploy --prod` on either prod
  project, and `rollback-prod.yml` all still reach production, and
  `rollback-prod.yml` is deliberately **not** gated by it — incident response
  must not be pausable by a feature flag.
- **To stop staging deploys:** disable `deploy-api-staging.yml` (Actions → the
  workflow → Disable workflow). Prod is unaffected, but you lose the validation
  surface the promotion decision rests on.
- **To stop staging validation runs:** flip `STAGING_SMOKE_ENABLED=false`.
  `workflow_dispatch` still works regardless.

## Required GitHub configuration

### Repository variables (Settings → Variables → Actions)

| Variable                        | Required by                                                                               | Notes                                                                                                                                                                                                                                                                                  |
| ------------------------------- | ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `STAGING_URL`                   | staging-smoke                                                                             | already present — `https://staging.concertcrawl.app`                                                                                                                                                                                                                                   |
| `STAGING_API_URL`               | staging-smoke                                                                             | `https://api-staging.concertcrawl.app` (Vercel since 2026-10-30)                                                                                                                                                                                                                       |
| `RENDER_SERVICE_ID_API_STAGING` | staging-smoke                                                                             | staging API service ID (e.g. `srv-abc123`). No longer read since 2026-10-30: staging-smoke waits for `deploy-api-staging.yml` with `GITHUB_TOKEN` instead.                                                                                                                             |
| `PROD_URL`                      | deploy-prod (smoke job)                                                                   | already present                                                                                                                                                                                                                                                                        |
| `PROD_API_URL`                  | deploy-prod, prod-deploy-health, prod-drift-alert, rollback-prod, prod-smoke-after-deploy | The prod API origin. Becomes `https://api.concertcrawl.app` at the prod cutover (it was `https://concert-crawl-api.onrender.com`). Its hostname is what the Vercel scripts resolve to find the deployment prod serves, so it must be the custom domain, not a `*.vercel.app` URL.      |
| `STAGING_SMOKE_ENABLED`         | staging-smoke                                                                             | **new** — default `false`; set to `true` in Stage 1                                                                                                                                                                                                                                    |
| `AUTO_DEPLOY_PROD_ENABLED`      | deploy-prod                                                                               | must be `true` — it arms the promotion workflow, the only _automated_ path to prod. With it `false` the `gate` job silently skips, so no promotion can run; a Render dashboard Manual Deploy and `rollback-prod.yml` still reach prod by design. The name predates the promotion gate. |
| `PROD_SMOKE_RECONCILER_ENABLED` | prod-smoke-after-deploy                                                                   | vestigial — that workflow is `workflow_dispatch` only and every dispatch satisfies its `if:` regardless. Kept so re-arming it on a push or schedule trigger has a switch ready.                                                                                                        |

### `production` environment — Variables (Settings → Environments → production)

| Variable                             | Required by                                                                               | Notes                                                                                                                                                                                                                                                                                                                                                      |
| ------------------------------------ | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `RENDER_SERVICE_ID_CRAWLER_TRIGGERS` | prod-smoke-after-deploy, deploy-prod, rollback-prod, prod-deploy-health                   | prod crawler triggers cron service ID. Used by deploy-prod's Render deploy POST, the rollback steps (auto-skip for crons), and the deploy-health check.                                                                                                                                                                                                    |
| `RENDER_SERVICE_ID_CRAWLER_DAILY`    | prod-smoke-after-deploy, deploy-prod, rollback-prod, prod-deploy-health                   | prod crawler daily cron service ID. Same.                                                                                                                                                                                                                                                                                                                  |
| `VERCEL_ORG_ID`                      | deploy-prod, rollback-prod, prod-smoke-after-deploy, prod-deploy-health, prod-drift-alert | The Vercel **Team ID** (`team_*`) of featherweight-design. Vercel renamed Org to Team in the dashboard but the CLI and API still call it `orgId`, so the dashboard offers no field with this name — read the Team ID from Vercel → Settings → General. Shared by the web and API projects.                                                                 |
| `VERCEL_PROJECT_ID`                  | deploy-prod                                                                               | `prj_*`, from the **production** `concert-crawl` project → Settings → General. Taking it from `concert-crawl-staging` by mistake sends every promotion to the staging project instead: `--prod` aliases whichever project the id names, so the build lands on staging's domains and `concertcrawl.app` is never updated. The run reports green throughout. |
| `VERCEL_PROJECT_ID_API`              | deploy-prod, rollback-prod, prod-smoke-after-deploy, prod-deploy-health, prod-drift-alert | **new at the prod cutover.** `prj_akzBWiGHyaLqECpGOGWSoWr6E7C0`, the `concert-crawl-api` project. One project serves staging (a custom environment) and production, so this is the same id staging uses; `--prod` is what picks production. Not the web project's id.                                                                                      |
| `RENDER_SERVICE_ID_API`              | (unused after the prod cutover)                                                           | prod API service ID (`srv-*`). No workflow reads it once the API is on Vercel. Deleted in the removal PR, together with the suspended service, after the 7-day watch and Hugh's OK.                                                                                                                                                                        |
| `RENDER_SERVICE_ID_MATCH_ARTISTS`    | (unused after the prod cutover)                                                           | prod match-artists cron service ID (`crn-*`). Same: unused once the job runs as a Vercel Cron Job, deleted with the service.                                                                                                                                                                                                                               |
| `RENDER_SERVICE_ID_SPOTIFY_WEEKLY`   | (unused after the prod cutover)                                                           | prod spotify-weekly cron service ID (`crn-*`). Same.                                                                                                                                                                                                                                                                                                       |
| `ADMIN_EMAIL`                        | prod-smoke-after-deploy, deploy-prod (manual)                                             | **optional** — address that receives an auto-rollback notification when smoke fails. Falls back to a `::warning::` annotation only when unset. Currently at repo level — see `production-launch.md` for the move-to-env-scope option.                                                                                                                      |

Service and project IDs live in the `production` environment (not at the repo level) so they are scoped to prod-only workflow runs and stay aligned with `production-launch.md`. The `deploy-prod.yml` and `rollback-prod.yml` jobs use `environment: production` and read them as `vars.RENDER_SERVICE_ID_*` and `vars.VERCEL_*`.

### `production` environment — Secrets (Settings → Environments → production)

| Secret                | Required by                                                                               | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| --------------------- | ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `RENDER_API_TOKEN`    | prod-smoke-after-deploy, deploy-prod, rollback-prod, prod-deploy-health                   | Render → Account Settings → API Keys → generate a token with deploy + read permissions. From the prod cutover it is used only for the two crawler crons: the deploy POST, `render-rollback.sh`, and the deploy-health check.                                                                                                                                                                                                                                                                          |
| `DATABASE_URL_DIRECT` | deploy-prod                                                                               | **new at the prod cutover.** The prod Neon branch's **direct** connection string (no `-pooler` in the host). `deploy-prod.yml` runs `pnpm db:migrate` with it before the API deploy and refuses a `-pooler` host. Not the API's runtime `DATABASE_URL`, which is the pooled URL and lives in the Vercel project.                                                                                                                                                                                      |
| `RESEND_API_KEY`      | prod-smoke-after-deploy, deploy-prod (manual)                                             | **optional** — same Resend API key the API + crawler already use. When set together with `ADMIN_EMAIL`, the rollback path emails the admin from `alerts@concertcrawl.app`. Missing → warning annotation only.                                                                                                                                                                                                                                                                                         |
| `VERCEL_TOKEN`        | deploy-prod, rollback-prod, prod-smoke-after-deploy, prod-deploy-health, prod-drift-alert | Vercel → Account Settings → Tokens. Already there for the web promotion. From the prod cutover it must also reach the `concert-crawl-api` project: it needs access to the **featherweight-design** team, so a token scoped to the `concert-crawl` project alone will fail the API deploy, rollback and the health and drift reads. If the token carries an expiry, record that date here; the daily drift alert will fail its read when it lapses, but a promotion may be the first thing you notice. |

No per-service `RENDER_DEPLOY_HOOK_*` secrets are needed: the deploy POST uses the Render API directly with `RENDER_API_TOKEN` + the service IDs above. Render Cron Jobs don't expose a Deploy Hook UI anyway (confirmed 2026-06-23), so the hook-based approach couldn't have covered the crons.

### Repository-level secrets (Settings → Secrets and variables → Actions)

| Secret             | Required by   | Notes                                                                                                                                                                                          |
| ------------------ | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `RENDER_API_TOKEN` | staging-smoke | same Render API token as above, stored at repo level. staging-smoke stopped reading it on 2026-10-30, when it began waiting for `deploy-api-staging.yml` instead of `render-wait-for-live.sh`. |

`RENDER_API_TOKEN` is the only credential the Render scripts need. Scope it to
deploy + read permissions only — the scripts just trigger deploys, list recent
deploys and POST `/rollback`, nothing else.

## Testing the rollback path

There are two smoke-then-rollback paths and they are not the same code. A
promotion's automatic smoke and its automatic rollback live in
`deploy-prod.yml` (`smoke` job, then `rollback` on an assertion failure).
`prod-smoke-after-deploy.yml` is the standalone dispatch-only copy, and it
carries its own rollback steps (`vercel rollback` for the API,
`render-rollback.sh` for the crawler crons).

**⚠️ The failing-smoke test is destructive. It really rolls back production.**
Making the standalone **Prod smoke** workflow fail against live prod fires
`vercel rollback` on the real `concert-crawl-api` — moving prod's API to its
previous deployment while the Vercel web app stays on the current one, and
leaving the API project in a rollback state until the next promotion. (Pointing
`PROD_API_URL` at a bogus hostname no longer works as the trigger: the rollback
step resolves that same hostname to find its target, so it fails instead.)
That leaves a genuine web/API version mismatch until you deploy forward again.
Do not run it as a routine wiring check.

If you need to verify the rollback wiring, prefer one of these:

- Read the two workflows' rollback steps, `vercel-api-prod.sh` and
  `render-rollback.sh` directly.
- Run the equivalent against staging, where a rolled-back API costs nothing.
- If you genuinely must exercise it on prod, schedule it as a controlled test:
  announce it, expect the API to move to the prior deployment, and plan the
  forward promotion that restores parity before you start.

### Sanity-checking preflight without touching prod

A bare `workflow_dispatch` of the same workflow exercises the preflight and then
smokes real prod — which is a legitimate health check in its own right, and the
cheapest way to confirm `environment: production` secret resolution after
rotating any of the required secrets. There is no wait step to exercise any
more; the promotion workflow owns that.

**For the manual rollback path:** invoke **Rollback Production (manual)** with `workflow_dispatch` and a `reason` value. It rolls the API back on Vercel and emits the manual-action warnings for the two crawler crons. Use this exact path for any incident response that doesn't originate from a freshly-deployed smoke failure.

## "Is prod current?" is a separate question from "is prod up?"

Everything above answers the second question. On 2026-08-29 the first one
went unanswered for ~20 hours: the Render account ran out of build
minutes, every auto-deploy returned `build_failed` in under 1.5s, and prod
served good-but-stale code five commits behind `main`. Sentry was
correctly silent, because there were no errors. The smoke never ran, so
auto-rollback correctly did not fire — and rolling back would have been
the wrong action anyway.

`.github/workflows/prod-deploy-health.yml` covers that gap. Every 2 hours
it checks whether each prod service is still _able_ to accept deploys, and
reports to **Sentry** if not, with the message "Prod deploys are not landing".
The run also exits non-zero, so there is a red Actions status too — but Sentry
is the channel that is meant to reach you. The one signal that did fire during
the incident was a failed Actions run, and that is an email that went unread.

What it checks, from the prod cutover:

- **The API on Vercel** (`vercel-api-prod.sh health`): the deployment
  `PROD_API_URL`'s hostname serves is READY; it is not a Git-integration build
  (that would mean a push reached prod without a promotion); no production
  deploy newer than it ended in ERROR; and Cron Jobs are enabled on the
  project, since match-artists and spotify-weekly stop silently when they are
  not.
- **The two crawler crons on Render** (`render-check-deploy-health.sh`):
  the same Render checks as before.

**Expect it to fire on the Cron Jobs check right after the cutover.** Cron Jobs
are currently **disabled** on the `concert-crawl-api` project: Vercel counted
the first staging deploy as production and registered the crons, so they were
turned off to stop them running against staging. Re-enable them (Vercel →
`concert-crawl-api` → Settings → Cron Jobs) after the first production deploy,
in the same sitting as suspending the two Render crons. Between the merge of
this change and the cutover, `PROD_API_URL` still names the Render host, so the
API check cannot run and reports a checker failure; that is expected until the
cutover.

It reports only. Every condition it detects needs a human decision, and
re-triggering a build that failed for want of build minutes would burn the
few that remain.

### Troubleshooting: "autoDeploy is 'yes'" is a leak, not a misconfigured check

This applies to the two crawler crons, the only prod services still on Render.
The API's equivalent is the Git-integration check above.

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
The API half: `.github/scripts/vercel-api-prod.sh`.
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

- **Prod's SHA is the API's.** It is the commit of the deployment
  `PROD_API_URL`'s hostname serves on Vercel, read from the deployment's
  `meta.githubCommitSha` or `meta.gitCommitSha` (CLI deploys from a git checkout,
  as `deploy-prod.yml` does, carry the second). A deployment with neither is
  reported as unmeasurable, the same as a failed read.
- **Only commits that would change the API count.** The workflow reads the
  `paths` filter of `deploy-api-staging.yml`'s `push` trigger, minus its
  `.github/` entries, and counts commits touching those paths, so a week of
  web-only work correctly produces no drift. (Before the cutover it read the
  Render API service's `buildFilter` from `render.yaml`. That filter no longer
  feeds anything.)
- **Drift is measured from the oldest waiting commit.** A fix that has been
  stranded for nine days trips the alert even if newer commits landed this
  morning, because that oldest commit is the one someone is waiting on.

**When it fires:** validate staging as usual and dispatch **Deploy to
Production**. If the backlog genuinely should not ship — a half-finished vertical,
a change waiting on a Hugh decision — the right action is to say so in the Sentry
issue rather than to raise the thresholds. Raising them hides the next real one.

## Limitations and known gaps

- **Vercel web is not auto-rolled back.** See "Vercel + cron rollback is manual" above.
- **The crawler crons are not auto-rolled back.** Render cannot roll back a cron
  job; see "Caveat on cron service rollback".
- **The first production API deploy has no rollback target.** Nothing is
  serving on `api.concertcrawl.app` before it, so a failed health check or smoke
  on that run cannot roll the API back. The fallback is the suspended Render
  services ("Falling back to Render" in `production-launch.md`).
- **The gate depends on settings this repo cannot fully enforce.** The crawler
  crons' `Auto-Deploy: no` lives in Render, and `render.yaml` only records it.
  Git deployments being off on the two prod Vercel projects lives in Vercel.
  Someone flipping either back reopens a push-to-prod path. `prod-deploy-health`
  flags the Render setting directly, and a Git-integration build only once it is
  serving prod; either within two hours.
- **Vercel Cron Jobs are a project-level switch.** If they are off,
  match-artists and spotify-weekly stop with no error anywhere except the
  deploy-health check.
- **DB schema rollback is out of scope.** Per the expand/contract migration
  policy in `CLAUDE.md`, an app-only rollback is always schema-safe — the
  prior app version is compatible with the current schema. If a migration
  itself needs to be undone, see `docs/runbooks/db-rollback.md`.
- **No Sentry-based rollback trigger.** v1 uses the post-deploy smoke as
  the only rollback signal. A future iteration could add a Sentry error
  rate spike check on top of the smoke gate.
- **API rollback target selection.** The promotion's auto-rollback goes to the
  deployment the hostname served before that run, recorded at the start of the
  deploy job. `rollback-prod.yml` and the standalone smoke go to the
  deployment the current one records in `meta.prevApiDeployment` (the one it
  replaced), and refuse when it records none or that deployment is gone. To
  pick a specific one, pass its `dpl_…` id to `rollback-prod.yml`'s
  `api_deployment` input.
- **Every `deploy-prod` dispatch requires a `reason`.** This is intentional — it
  shows up in the workflow log, so the audit trail of who promoted what and why
  is preserved. It is the only record of the promotion decision.
