# Auto-Deploy Production — Runbook

This runbook covers the automated promotion pipeline from `main` → staging
→ smoke-verified production, plus the rollback path when prod smoke fails.

The pipeline is **disabled by default**. Two repo variables gate it; see
the "Enabling the pipeline" section below.

## Pipeline overview

```
push to main
   │
   ▼
CI workflow ───► Deploy to Staging ───► Staging Smoke Tests
                                                │
                                                ▼ success
                                       Deploy to Production           ◄── single workflow,
                                       ├─ gate                            4 jobs chained
                                       ├─ deploy                          via `needs:`
                                       ├─ smoke (post-deploy)
                                       └─ rollback (if smoke fails)
```

Each `workflow_run` arrow (CI → Deploy-staging → Staging-smoke → Deploy-prod) is a separate workflow gated on the upstream's `conclusion`. The four jobs **inside** `Deploy to Production` are chained via `needs:` instead — they all live in one workflow because GitHub Actions caps `workflow_run` chains at 3 levels, and the original 5-workflow design hit that cap after a real merge (CI is level 0; deploy-staging, staging-smoke, deploy-prod = 3 levels; a separate prod-post-deploy-smoke workflow would be the 4th level and never fire).

| Workflow                     | Path                                   | Trigger                   | Kill switch                |
| ---------------------------- | -------------------------------------- | ------------------------- | -------------------------- |
| CI                           | `.github/workflows/ci.yml`             | push to `main`            | (always on)                |
| Deploy to Staging            | `.github/workflows/deploy-staging.yml` | CI success                | (always on)                |
| Staging Smoke Tests          | `.github/workflows/staging-smoke.yml`  | Deploy to Staging success | `STAGING_SMOKE_ENABLED`    |
| Deploy to Production         | `.github/workflows/deploy-prod.yml`    | Staging Smoke success     | `AUTO_DEPLOY_PROD_ENABLED` |
| Rollback Production (manual) | `.github/workflows/rollback-prod.yml`  | `workflow_dispatch` only  | (always available)         |

The scheduled `smoke.yml` (every 6 hours against prod) is independent and remains gated by the separate `SMOKE_ENABLED` variable.

### Jobs inside `Deploy to Production`

| Job        | Depends on | Fires when                                           |
| ---------- | ---------- | ---------------------------------------------------- |
| `gate`     | (entry)    | `AUTO_DEPLOY_PROD_ENABLED == 'true'` + branch checks |
| `deploy`   | `gate`     | gate succeeded                                       |
| `smoke`    | `deploy`   | deploy succeeded (skipped if deploy failed)          |
| `rollback` | `smoke`    | `needs.smoke.outputs.assertions_failed == 'true'`    |

The rollback trigger keys on a job output that the smoke job sets ONLY after Playwright has actually run and returned non-zero. Job-level failures that prevent that step from being reached — timeouts, runner deaths, cancellations, env-var preflight crashes — leave the output unset and the rollback skipped. The original multi-workflow design excluded this class of failure deliberately, to prevent infrastructure flakiness from causing destructive prod rollbacks. The unified design preserves that semantic.

If `deploy` fails, `smoke` is skipped → the output is unset → `rollback` skipped too. This preserves the original "don't compound a failed deploy with a destructive rollback for a deploy that never happened" semantic.

If Playwright runs and fails an assertion, `rollback` runs automatically. The workflow invokes `render-rollback.sh` for all three Render services serially, but the script's prefix-based routing means **only the API web service is actually rolled back via the Render API**; the two crawler crons are skipped with a warning (see caveat below). Operators can still trigger rollback manually via `rollback-prod.yml`'s `workflow_dispatch` for any infrastructure-failure case where the auto-path was skipped.

**Caveat on cron service rollback:** Render's `/rollback` API endpoint rejects cron job services (`crn-*`) with HTTP 400 — there is no API path for cron rollback. `render-rollback.sh` detects cron service IDs by prefix and skips them with a loud warning, returning exit 0 so the workflow can proceed to roll back the other services. The two crawler crons require a manual rollback when needed:

- Render dashboard → cron service (`concert-crawl-crawler-triggers` or `concert-crawl-crawler-daily`) → Settings → Manual Deploy → pick a prior commit from the dropdown.
- Or — more commonly preferred — revert the offending commit on `main` and let the next CI-triggered deploy roll the reverted code out to API and crons together.

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

### Stage 2 — enable auto-deploy-prod + rollback

After stage 1 has been stable through a handful of merges:

1. Provision the prod environment variables + secret (see env vars table below): three `RENDER_SERVICE_ID_*` variables in the `production` environment, plus `RENDER_API_TOKEN` as a `production`-environment secret
2. Set `AUTO_DEPLOY_PROD_ENABLED` repo variable to `true`
3. Merge a small no-op PR to `main`
4. Watch the full chain run end-to-end: CI → deploy-staging → staging-smoke → deploy-prod (gate → deploy → smoke; rollback fires only on smoke failure)
5. Force a rollback in a controlled way to validate it (see
   "Testing the rollback path" below)

### Disabling

Flip either repo variable from `true` → `false` (or delete it). Effective
on the next workflow_run trigger.

## Required GitHub configuration

### Repository variables (Settings → Variables → Actions)

| Variable                        | Required by                   | Notes                                                                                                                                                                |
| ------------------------------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `STAGING_URL`                   | staging-smoke                 | already present — `https://staging.concertcrawl.app`                                                                                                                 |
| `STAGING_API_URL`               | staging-smoke                 | **new** — `https://concert-crawl-api-staging.onrender.com`                                                                                                           |
| `RENDER_SERVICE_ID_API_STAGING` | deploy-staging, staging-smoke | **new** — staging API service ID (e.g. `srv-abc123`). Used by `deploy-staging.yml` (deploy POST) and `render-wait-for-live.sh` (waits for the new deploy to be live) |
| `PROD_URL`                      | deploy-prod (smoke job)       | already present                                                                                                                                                      |
| `PROD_API_URL`                  | deploy-prod (smoke job)       | already present                                                                                                                                                      |
| `STAGING_SMOKE_ENABLED`         | staging-smoke                 | **new** — default `false`; set to `true` in Stage 1                                                                                                                  |
| `AUTO_DEPLOY_PROD_ENABLED`      | deploy-prod                   | **new** — default `false`; set to `true` in Stage 2. Gates the whole deploy-prod workflow including its smoke + auto-rollback jobs.                                  |

### `production` environment — Variables (Settings → Environments → production)

| Variable                             | Required by                | Notes                                                                                                                                                  |
| ------------------------------------ | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `RENDER_SERVICE_ID_API`              | deploy-prod, rollback-prod | **new** — prod API service ID (visible in Render dashboard URL, e.g. `srv-abc123`). Used for the deploy POST, `render-wait-for-live.sh`, and rollback. |
| `RENDER_SERVICE_ID_CRAWLER_TRIGGERS` | deploy-prod, rollback-prod | **new** — prod crawler triggers cron service ID. Used by deploy-prod's API POST and rollback.                                                          |
| `RENDER_SERVICE_ID_CRAWLER_DAILY`    | deploy-prod, rollback-prod | **new** — prod crawler daily cron service ID. Same.                                                                                                    |

Service IDs live in the `production` environment (not at the repo level) so they are scoped to prod-only workflow runs and stay aligned with `production-launch.md`. The `deploy-prod.yml` and `rollback-prod.yml` jobs use `environment: production` and read them as `vars.RENDER_SERVICE_ID_*`.

### `production` environment — Secrets (Settings → Environments → production)

| Secret             | Required by                | Notes                                                                                                                                                                                                    |
| ------------------ | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `RENDER_API_TOKEN` | deploy-prod, rollback-prod | **new** — Render → Account Settings → API Keys → generate a token with deploy + read permissions. Consumed by the deploy POST in deploy-prod, by `render-wait-for-live.sh`, and by `render-rollback.sh`. |

No per-service `RENDER_DEPLOY_HOOK_*` secrets are needed: the deploy POST uses the Render API directly with `RENDER_API_TOKEN` + the service IDs above. Render Cron Jobs don't expose a Deploy Hook UI anyway (confirmed 2026-06-23), so the hook-based approach couldn't have covered the two crawler crons.

### Repository-level secrets (Settings → Secrets and variables → Actions)

| Secret             | Required by   | Notes                                                                                                                                                                                                                                 |
| ------------------ | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `RENDER_API_TOKEN` | staging-smoke | **new** — same Render API token as above, but stored at repo level so the staging-smoke workflow (which is not scoped to the `production` environment) can call `render-wait-for-live.sh`. Use the same value as the prod-env secret. |

`RENDER_API_TOKEN` is the only credential the wait-for-live and rollback
scripts need. Scope it to deploy + read permissions only — the scripts
just list recent deploys and POST `/rollback`, nothing else.

## Testing the rollback path

**For the auto-rollback path** (smoke → rollback inside `deploy-prod.yml`): the cleanest way to verify the wiring without breaking real prod is to invoke **Deploy to Production** manually (`workflow_dispatch`, supply a `reason`) while temporarily pointing `PROD_API_URL` at a bogus hostname. The deploy job succeeds, the smoke job fails against the bogus URL, the rollback job fires, and Render shows new deploys on each service matching the previous-prior commit SHA. Restore `PROD_API_URL` and run one more clean deploy to roll forward again.

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
