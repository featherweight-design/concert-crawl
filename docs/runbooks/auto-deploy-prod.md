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
                                       Deploy to Production
                                                │
                                                ▼ success
                                  Production Post-Deploy Smoke
                                                │
                                                ▼ failure
                                       Rollback Production
```

Each arrow is a GitHub Actions `workflow_run` trigger. Each downstream
workflow gates on the upstream one's `conclusion`, so a failure short-
circuits the chain.

| Workflow                     | Path                                           | Trigger                      | Kill switch                                 |
| ---------------------------- | ---------------------------------------------- | ---------------------------- | ------------------------------------------- |
| CI                           | `.github/workflows/ci.yml`                     | push to `main`               | (always on)                                 |
| Deploy to Staging            | `.github/workflows/deploy-staging.yml`         | CI success                   | (always on)                                 |
| Staging Smoke Tests          | `.github/workflows/staging-smoke.yml`          | Deploy to Staging success    | `STAGING_SMOKE_ENABLED`                     |
| Deploy to Production         | `.github/workflows/deploy-prod.yml`            | Staging Smoke success        | `AUTO_DEPLOY_PROD_ENABLED`                  |
| Production Post-Deploy Smoke | `.github/workflows/prod-post-deploy-smoke.yml` | Deploy to Production success | `AUTO_DEPLOY_PROD_ENABLED`                  |
| Rollback Production          | `.github/workflows/rollback-prod.yml`          | Post-deploy smoke failure    | `AUTO_DEPLOY_PROD_ENABLED` (automatic only) |

The scheduled `smoke.yml` (every 6 hours against prod) is independent and
remains gated by the separate `SMOKE_ENABLED` variable.

**Note on the rollback kill switch:** `AUTO_DEPLOY_PROD_ENABLED` gates
only the `workflow_run` (automatic) path of `rollback-prod.yml`. Manual
`workflow_dispatch` of the rollback is intentionally **NOT** gated by
the kill switch — the kill switch exists to pause the auto-pipeline;
an operator explicitly invoking incident response must still be able
to roll back even when the auto-pipeline is disabled. Manual
dispatches are still restricted to `main`.

## Vercel rollback is manual

This pipeline rolls back Render services (API + 2 crawler crons)
automatically. **Vercel web prod is NOT auto-rolled back** because Vercel
already offers a one-click instant promote and Vercel deploys are reliable
in our experience. If a post-deploy smoke failure looks web-related:

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

1. Provision the Render hooks and API token (see env vars table below)
2. Set `AUTO_DEPLOY_PROD_ENABLED` repo variable to `true`
3. Merge a small no-op PR to `main`
4. Watch the full chain run end-to-end: CI → deploy-staging → staging-smoke
   → deploy-prod → prod-post-deploy-smoke
5. Force a rollback in a controlled way to validate it (see
   "Testing the rollback path" below)

### Disabling

Flip either repo variable from `true` → `false` (or delete it). Effective
on the next workflow_run trigger.

## Required GitHub configuration

### Repository variables (Settings → Variables → Actions)

| Variable                        | Required by                                        | Notes                                                                                                              |
| ------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `STAGING_URL`                   | staging-smoke                                      | already present — `https://staging.concertcrawl.app`                                                               |
| `STAGING_API_URL`               | staging-smoke                                      | **new** — `https://concert-crawl-api-staging.onrender.com`                                                         |
| `RENDER_SERVICE_ID_API_STAGING` | staging-smoke                                      | **new** — staging API service ID (e.g. `srv-abc123`). Used by `render-wait-for-live.sh` to wait for the new deploy |
| `PROD_URL`                      | prod-post-deploy-smoke                             | already present                                                                                                    |
| `PROD_API_URL`                  | prod-post-deploy-smoke                             | already present                                                                                                    |
| `STAGING_SMOKE_ENABLED`         | staging-smoke                                      | **new** — default `false`; set to `true` in Stage 1                                                                |
| `AUTO_DEPLOY_PROD_ENABLED`      | deploy-prod, prod-post-deploy-smoke, rollback-prod | **new** — default `false`; set to `true` in Stage 2                                                                |

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

The cleanest way to verify the rollback wiring without breaking anything:

1. Run **Production Post-Deploy Smoke** manually (`workflow_dispatch`)
   against a known-broken state — for example, point `PROD_API_URL` at a
   bogus hostname temporarily and trigger the workflow
2. Confirm `prod-post-deploy-smoke.yml` exits with failure
3. Confirm `rollback-prod.yml` automatically picks up the failure and runs
4. Confirm Render shows new deploys on each of the three services
   matching the previous-prior commit SHA
5. Restore `PROD_API_URL` and trigger one more clean deploy to roll
   forward again

Alternatively just invoke **Rollback Production** with `workflow_dispatch`
and a `reason` value. The script will roll back to the prior live deploy
on each service. Use this exact path for any incident response.

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
