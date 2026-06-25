# Auto-Deploy Production — Runbook

This runbook covers prod deploys via Render's native git auto-deploy plus the push-triggered smoke + rollback workflow that gates them.

Two repo configurations gate the pipeline; see the "Enabling the pipeline" section below.

## Pipeline overview

```
push to main
   │
   ├──► CI ──► Deploy to Staging ──► Staging Smoke
   │
   ├──► Render git auto-deploy
   │       ├──► concert-crawl-api
   │       ├──► concert-crawl-crawler-triggers
   │       └──► concert-crawl-crawler-daily
   │              │
   │              ▼
   │      (Render builds + serves)
   │
   └──► Prod smoke (after Render auto-deploy)
              │  waits up to 5 min for Render to be live on github.sha
              ▼
        Playwright smoke against prod
              ├──► success: workflow ends green
              └──► failure: render-rollback.sh + Resend admin email
```

Render's git integration handles prod deploys directly — there is no GH Actions chain from CI → Deploy-staging → Staging-smoke → Deploy-prod anymore. The four-deep `workflow_run` chain that hit GitHub's 3-level depth cap is gone.

| Workflow                              | Path                                            | Trigger                            | Kill switch                     |
| ------------------------------------- | ----------------------------------------------- | ---------------------------------- | ------------------------------- |
| CI                                    | `.github/workflows/ci.yml`                      | push to `main`, PRs                | (always on)                     |
| Deploy to Staging                     | `.github/workflows/deploy-staging.yml`          | CI success                         | (always on)                     |
| Staging Smoke Tests                   | `.github/workflows/staging-smoke.yml`           | Deploy to Staging success          | `STAGING_SMOKE_ENABLED`         |
| Prod smoke (after Render auto-deploy) | `.github/workflows/prod-smoke-after-deploy.yml` | push to `main` + workflow_dispatch | `PROD_SMOKE_RECONCILER_ENABLED` |
| Deploy to Production (manual)         | `.github/workflows/deploy-prod.yml`             | `workflow_dispatch` only           | `AUTO_DEPLOY_PROD_ENABLED`      |
| Rollback Production (manual)          | `.github/workflows/rollback-prod.yml`           | `workflow_dispatch` only           | (always available)              |

The scheduled `smoke.yml` (every 6 hours against prod) is independent and remains gated by the separate `SMOKE_ENABLED` variable.

## How the prod smoke workflow works

`prod-smoke-after-deploy.yml` fires on every push to `main`. Each run:

1. Checks out `github.sha` — the SHA that just landed.
2. Calls `render-wait-for-live.sh "$RENDER_SERVICE_ID_API" "$GITHUB_SHA" 300` — polls Render every 10s for up to 5 min, waiting for the API service to be `live` on the pushed SHA. (Inside the workflow YAML the value comes from the `${{ github.sha }}` Actions context; inside the runner's shell it's the `$GITHUB_SHA` env var GitHub injects automatically.)
3. Branches on the script's exit code:
   - `0` (live) → runs the Playwright smoke suite against prod.
   - `124` (timeout) → emits a `::warning::` annotation and exits success. Common cause is a fast-follow merge or `[skip ci]` release commit superseding this deploy. The NEXT push's smoke run validates the latest deployable code.
   - Any other code → fails the job loudly. Hard failures (jq missing, auth/network, no live deploy, malformed service ID) must not get silently bucketed as "benign timeout."
4. On smoke success: workflow ends green.
5. On smoke failure: invokes `render-rollback.sh` for all three prod services. Behavior diverges by service type — see "Caveat on cron service rollback" below — and the workflow sends a Resend admin email summarizing the attempt, then ends in `failure`.

### Caveat on cron service rollback

`render-rollback.sh` detects Render service ID prefix:

- `srv-*` (web service) → calls Render's `/rollback` endpoint, rolls API back to the prior `live` deploy.
- `crn-*` (cron job) → Render's `/rollback` endpoint rejects cron services (HTTP 400; confirmed against the live API). The script emits a `::warning::` annotation and exits 0 so the workflow can continue rolling back the other services.

**Net behavior of "smoke failure → rollback":** only the API web service is actually rolled back automatically. The two crawler crons require manual rollback — either via the Render dashboard's Manual Deploy on a prior commit, or (typically preferred) by reverting the offending commit on `main` and letting Render auto-deploy the revert. The Resend admin email surfaces this explicitly so the operator knows manual action is needed for the crons.

### Why push, not cron

GH Actions schedule cron is famously droppy under load. `push` is one of the most reliable triggers in the system, and it fires the moment main moves. The "wait for Render" piece is unavoidable (Render's deploy is async), but at ~2-min typical Render deploys it's a bounded inner-loop wait.

A cron design was evaluated and rejected: it would have cost ~$35/mo more in idle runner minutes (private-repo billing) and added a 5-min worst-case detection lag, with no correctness benefit.

### Semantic-release release commits

semantic-release lands a `chore(release): X.Y.Z [skip ci]` commit ~3 min after every merge. The `[skip ci]` convention prevents this workflow from firing for that commit. The merge commit's smoke workflow does fire and waits for Render to be live on the merge SHA.

**Typical case (Render queues deploys in order):** the merge build completes first and is live for ~3 min before the release build supersedes it. The smoke catches that window. ✓

**Edge case (Render cancels merge build mid-flight when the release commit lands):** merge SHA never reaches `live`, the wait exits 124, smoke is skipped, release commit ends up live and unsmoked. We accept this gap because the release commit is code-equivalent to the merge commit (`package.json` + CHANGELOG version bumps only). Operators can `workflow_dispatch` the smoke workflow against the release commit if a specific release warrants explicit validation — the kill switch is bypassed for dispatch.

The rollback trigger keys on a job output that the smoke job sets ONLY after Playwright has actually run and returned non-zero. Job-level failures that prevent that step from being reached — timeouts, runner deaths, cancellations, env-var preflight crashes — leave the output unset and the rollback skipped. This prevents infrastructure flakiness from causing destructive prod rollbacks.

**How you're notified the cron action is needed:**

1. **GHA workflow-failure email** — the smoke workflow ends with `failure` conclusion. GitHub Actions emails you by default when a workflow on `main` fails.
2. **`::warning::` annotation in the workflow summary** — each skipped cron emits a warning that surfaces on the workflow run's summary card at the top of the page, not buried in step logs.
3. **Admin email via Resend** — the rollback path's "Notify admin" step calls Resend (`alerts@concertcrawl.app` → `ADMIN_EMAIL`) with a summary and the workflow run URL. Runs with `if: always()` so the email goes out even if a rollback step earlier in the job failed; the email body says "rollback was triggered" (not "succeeded") and points at the run URL for the actual outcome. Requires `RESEND_API_KEY` (secret) + `ADMIN_EMAIL` (variable) in the `production` environment. Missing either falls back to the annotation only — non-fatal.

### Manual rollback path

`rollback-prod.yml` exists for the human-driven incident-response case: an issue surfaced via Sentry hours after deploy, a manual prod deploy went sideways, or any other reason an operator needs to roll back independently. It is `workflow_dispatch` only, restricted to `main`, and intentionally **NOT** gated by `AUTO_DEPLOY_PROD_ENABLED` — the kill switch pauses the auto-pipeline; an operator explicitly invoking incident response must still be able to roll back even when the auto-pipeline is off.

## Vercel + cron rollback is manual

This pipeline auto-rolls back **only the Render API web service**.
Both prod **crawler crons** require manual rollback because Render's
`/rollback` endpoint rejects cron services — see the "Caveat on cron
service rollback" section above for the manual paths. **Vercel web
prod is NOT auto-rolled back** either, because Vercel already offers
a one-click instant promote and Vercel deploys are reliable in our
experience. If a post-deploy smoke failure looks web-related:

1. Open the Vercel dashboard → `concert-crawl` (production) project
2. Deployments tab → find the most recent prior deploy marked `Ready`
3. Click ⋯ → **Promote to Production** — takes effect within seconds, no rebuild

The auto-rollback workflow's log explicitly reminds the operator to check
Vercel in addition to the Render rollback it just performed.

## Enabling the pipeline

The pipeline ships with two kill switches so we can roll out in two stages.

### Stage 1 — enable staging-smoke only

Use this for at least a few merges to confirm the smoke suite is stable.
`staging-smoke` waits for the Render staging API service to report
`status=live` on the triggering commit's SHA (up to 10 min) before
running the suite, so a slow Render build won't make the smoke pass
against the old code.

1. GitHub repo → **Settings** → **Secrets and variables** → **Actions** → **Variables** tab → **New repository variable**
   - **Name:** `STAGING_API_URL`
   - **Value:** `https://concert-crawl-api-staging.onrender.com` (confirm in Render dashboard if the hostname has changed)
2. Same screen, add **New repository variable**
   - **Name:** `RENDER_SERVICE_ID_API_STAGING`
   - **Value:** the staging API service ID from the Render dashboard URL (`srv-...`)
3. Same screen, add **New repository variable**
   - **Name:** `STAGING_SMOKE_ENABLED`
   - **Value:** `true`
4. **Secrets** tab → **New repository secret**
   - **Name:** `RENDER_API_TOKEN`
   - **Value:** Render → Account Settings → API Keys → generate a token with deploy + read permissions (same value can be reused in the `production` environment secret)
5. Trigger a no-op merge to `main` (any tiny PR works) and watch the
   "Staging Smoke Tests" workflow run end-to-end against staging
6. Iterate on the smoke suite if any test flakes

### Stage 2 — enable Render auto-deploy on prod

After stage 1 has been stable through a handful of merges:

1. Render dashboard → `concert-crawl-api` → Settings → Build & Deploy → set **Auto-Deploy** to `Yes`. Repeat for `concert-crawl-crawler-triggers` and `concert-crawl-crawler-daily`.
2. The next push to `main` triggers Render auto-deploy automatically — no GitHub `workflow_run` involved.
3. Leave `AUTO_DEPLOY_PROD_ENABLED=true` so the manual `deploy-prod.yml` escape hatch stays usable.

### Stage 3 — enable the prod smoke workflow

After the first auto-deploy from stage 2 succeeds:

**Prerequisites** (verify before flipping the switch — the smoke workflow hard-fails its preflight step if any are missing):

- `production` environment **variables**: `RENDER_SERVICE_ID_API`, `RENDER_SERVICE_ID_CRAWLER_TRIGGERS`, `RENDER_SERVICE_ID_CRAWLER_DAILY`. Plus `PROD_URL` + `PROD_API_URL` at repo level. Plus `ADMIN_EMAIL` at repo level (or production env — either resolves under `environment: production`).
- `production` environment **secrets**: `RENDER_API_TOKEN`, `RESEND_API_KEY` (optional — graceful-degrades to a `::warning::` if missing).
- Repo-level **secrets**: `E2E_TEST_USER_EMAIL`, `E2E_TEST_USER_PASSWORD`, `SENTRY_DSN_SMOKE`.

All of these are already provisioned if you're past Stage 2 of `production-launch.md`. The smoke workflow's preflight step prints a clean "Missing X" list if any are absent, so an arming attempt without all prerequisites fails fast and visibly.

**Enable:**

1. Set `PROD_SMOKE_RECONCILER_ENABLED=true` in repo variables (Settings → Variables → Actions). The smoke workflow defaults to off so it stays inert during the migration window.
2. Trigger a small no-op merge to `main`.
3. Watch `Prod smoke (after Render auto-deploy)` run end-to-end: wait → install → smoke → green.

### Disabling

- To pause auto-deploy: flip `Auto-Deploy: no` on the three Render services.
- To pause push-triggered smoke: flip `PROD_SMOKE_RECONCILER_ENABLED=false`. Render keeps auto-deploying, but the smoke + rollback path stops firing on push to main. `workflow_dispatch` still works regardless — the kill switch is bypassed for manual operator intervention, matching `rollback-prod.yml`'s "incident response can't be paused by a feature flag" design.
- To disable the manual escape hatch on `deploy-prod.yml`: flip `AUTO_DEPLOY_PROD_ENABLED=false`.

## Required GitHub configuration

### Repository variables (Settings → Variables → Actions)

| Variable                        | Required by                   | Notes                                                                                                                                                                                                     |
| ------------------------------- | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `STAGING_URL`                   | staging-smoke                 | already present — `https://staging.concertcrawl.app`                                                                                                                                                      |
| `STAGING_API_URL`               | staging-smoke                 | **new** — `https://concert-crawl-api-staging.onrender.com`                                                                                                                                                |
| `RENDER_SERVICE_ID_API_STAGING` | deploy-staging, staging-smoke | **new** — staging API service ID (e.g. `srv-abc123`). Used by `deploy-staging.yml` (deploy POST) and `render-wait-for-live.sh` (waits for the new deploy to be live)                                      |
| `PROD_URL`                      | deploy-prod (smoke job)       | already present                                                                                                                                                                                           |
| `PROD_API_URL`                  | deploy-prod (smoke job)       | already present                                                                                                                                                                                           |
| `STAGING_SMOKE_ENABLED`         | staging-smoke                 | **new** — default `false`; set to `true` in Stage 1                                                                                                                                                       |
| `AUTO_DEPLOY_PROD_ENABLED`      | deploy-prod (manual)          | default `false`; set to `true` to keep the manual `deploy-prod.yml` escape hatch usable. Under the post-#786 model, the normal deploy path runs through Render's git auto-deploy, NOT this workflow.      |
| `PROD_SMOKE_RECONCILER_ENABLED` | prod-smoke-after-deploy       | **new** — default `false`; set to `true` in Stage 3. Gates the push-triggered prod smoke + rollback workflow. `workflow_dispatch` bypasses this kill switch so manual operator intervention always works. |

### `production` environment — Variables (Settings → Environments → production)

| Variable                             | Required by                                                  | Notes                                                                                                                                                                                                                                 |
| ------------------------------------ | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `RENDER_SERVICE_ID_API`              | prod-smoke-after-deploy, deploy-prod (manual), rollback-prod | prod API service ID (visible in Render dashboard URL, e.g. `srv-abc123`). Used for the smoke workflow's `render-wait-for-live.sh` + `render-rollback.sh`, the manual deploy POST, and rollback.                                       |
| `RENDER_SERVICE_ID_CRAWLER_TRIGGERS` | prod-smoke-after-deploy, deploy-prod (manual), rollback-prod | prod crawler triggers cron service ID. Used by smoke's rollback step (auto-skips for crons), deploy-prod's API POST, and rollback-prod.                                                                                               |
| `RENDER_SERVICE_ID_CRAWLER_DAILY`    | prod-smoke-after-deploy, deploy-prod (manual), rollback-prod | prod crawler daily cron service ID. Same.                                                                                                                                                                                             |
| `ADMIN_EMAIL`                        | prod-smoke-after-deploy, deploy-prod (manual)                | **optional** — address that receives an auto-rollback notification when smoke fails. Falls back to a `::warning::` annotation only when unset. Currently at repo level — see `production-launch.md` for the move-to-env-scope option. |

Service IDs live in the `production` environment (not at the repo level) so they are scoped to prod-only workflow runs and stay aligned with `production-launch.md`. The `deploy-prod.yml` and `rollback-prod.yml` jobs use `environment: production` and read them as `vars.RENDER_SERVICE_ID_*`.

### `production` environment — Secrets (Settings → Environments → production)

| Secret             | Required by                                                  | Notes                                                                                                                                                                                                                       |
| ------------------ | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `RENDER_API_TOKEN` | prod-smoke-after-deploy, deploy-prod (manual), rollback-prod | Render → Account Settings → API Keys → generate a token with deploy + read permissions. Consumed by the smoke workflow's `render-wait-for-live.sh` + `render-rollback.sh`, the manual deploy POST, and `rollback-prod.yml`. |
| `RESEND_API_KEY`   | prod-smoke-after-deploy, deploy-prod (manual)                | **optional** — same Resend API key the API + crawler already use. When set together with `ADMIN_EMAIL`, the rollback path emails the admin from `alerts@concertcrawl.app`. Missing → warning annotation only.               |

No per-service `RENDER_DEPLOY_HOOK_*` secrets are needed: the deploy POST uses the Render API directly with `RENDER_API_TOKEN` + the service IDs above. Render Cron Jobs don't expose a Deploy Hook UI anyway (confirmed 2026-06-23), so the hook-based approach couldn't have covered the two crawler crons.

### Repository-level secrets (Settings → Secrets and variables → Actions)

| Secret             | Required by   | Notes                                                                                                                                                                                                                                 |
| ------------------ | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `RENDER_API_TOKEN` | staging-smoke | **new** — same Render API token as above, but stored at repo level so the staging-smoke workflow (which is not scoped to the `production` environment) can call `render-wait-for-live.sh`. Use the same value as the prod-env secret. |

`RENDER_API_TOKEN` is the only credential the wait-for-live and rollback
scripts need. Scope it to deploy + read permissions only — the scripts
just list recent deploys and POST `/rollback`, nothing else.

## Testing the rollback path

**For the auto-rollback path** (smoke → rollback inside `prod-smoke-after-deploy.yml`): the cleanest way to verify the wiring without breaking real prod is to temporarily point `PROD_API_URL` at a bogus hostname, then `workflow_dispatch` the **Prod smoke (after Render auto-deploy)** workflow. The wait step exits success (Render is still live on the real SHA), the smoke step fails against the bogus URL, the rollback steps fire (API rolls back; the two crons emit warnings — see "Caveat on cron service rollback"), and Render shows a new deploy on the API service matching the previous-prior commit SHA. Restore `PROD_API_URL` afterward.

### Sanity-checking the wait + preflight without a real deploy

A bare `workflow_dispatch` (no env tweaks) when Render is NOT on the dispatched SHA exercises the preflight + wait paths only — Playwright never runs. The wait polls Render for `github.sha` (current main HEAD) and times out at 300s because Render won't move to that SHA without a push. Expected outcome: workflow ends `success` with a `::warning: Smoke skipped` annotation, total wall-clock ~6–7 min (5-min wait + ~1.5 min runner setup). This validates `environment: production` secret resolution + the preflight + the 124-exit-code benign-skip branch without exercising the actual smoke or rollback. Useful as a first sanity check after enabling the kill switch or rotating any of the required secrets.

**For the manual rollback path:** invoke **Rollback Production (manual)** with `workflow_dispatch` and a `reason` value. The script rolls back to the prior live deploy on each service. Use this exact path for any incident response that doesn't originate from a freshly-deployed smoke failure.

## Limitations and known gaps

- **Vercel web is not auto-rolled back.** See "Vercel rollback is manual" above.
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
- **Manual `workflow_dispatch` of `deploy-prod` requires a `reason`.** This
  is intentional — it shows up in the workflow log so the audit trail of
  manual deploys is preserved.
