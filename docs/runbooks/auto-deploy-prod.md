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

| Workflow                     | Path                                           | Trigger                      | Kill switch                |
| ---------------------------- | ---------------------------------------------- | ---------------------------- | -------------------------- |
| CI                           | `.github/workflows/ci.yml`                     | push to `main`               | (always on)                |
| Deploy to Staging            | `.github/workflows/deploy-staging.yml`         | CI success                   | (always on)                |
| Staging Smoke Tests          | `.github/workflows/staging-smoke.yml`          | Deploy to Staging success    | `STAGING_SMOKE_ENABLED`    |
| Deploy to Production         | `.github/workflows/deploy-prod.yml`            | Staging Smoke success        | `AUTO_DEPLOY_PROD_ENABLED` |
| Production Post-Deploy Smoke | `.github/workflows/prod-post-deploy-smoke.yml` | Deploy to Production success | `AUTO_DEPLOY_PROD_ENABLED` |
| Rollback Production          | `.github/workflows/rollback-prod.yml`          | Post-deploy smoke failure    | `AUTO_DEPLOY_PROD_ENABLED` |

The scheduled `smoke.yml` (every 6 hours against prod) is independent and
remains gated by the separate `SMOKE_ENABLED` variable.

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

Use this for at least a few merges to confirm the smoke suite is stable
and the staging deploy timing (`sleep 180`) is sufficient.

1. GitHub repo → **Settings** → **Secrets and variables** → **Actions** → **Variables** tab → **New repository variable**
   - **Name:** `STAGING_API_URL`
   - **Value:** `https://concert-crawl-api-staging.onrender.com` (confirm in Render dashboard if the hostname has changed)
2. Same screen, add **New repository variable**
   - **Name:** `STAGING_SMOKE_ENABLED`
   - **Value:** `true`
3. Trigger a no-op merge to `main` (any tiny PR works) and watch the
   "Staging Smoke Tests" workflow run end-to-end against staging
4. Iterate on the smoke suite if any test flakes

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

| Variable                   | Required by                                        | Notes                                                      |
| -------------------------- | -------------------------------------------------- | ---------------------------------------------------------- |
| `STAGING_URL`              | staging-smoke                                      | already present — `https://staging.concertcrawl.app`       |
| `STAGING_API_URL`          | staging-smoke                                      | **new** — `https://concert-crawl-api-staging.onrender.com` |
| `PROD_URL`                 | prod-post-deploy-smoke                             | already present                                            |
| `PROD_API_URL`             | prod-post-deploy-smoke                             | already present                                            |
| `STAGING_SMOKE_ENABLED`    | staging-smoke                                      | **new** — default `false`; set to `true` in Stage 1        |
| `AUTO_DEPLOY_PROD_ENABLED` | deploy-prod, prod-post-deploy-smoke, rollback-prod | **new** — default `false`; set to `true` in Stage 2        |

### `production` environment — Variables (Settings → Environments → production)

| Variable                             | Required by   | Notes                                                                              |
| ------------------------------------ | ------------- | ---------------------------------------------------------------------------------- |
| `RENDER_SERVICE_ID_API`              | rollback-prod | **new** — prod API service ID (visible in Render dashboard URL, e.g. `srv-abc123`) |
| `RENDER_SERVICE_ID_CRAWLER_TRIGGERS` | rollback-prod | **new** — prod crawler triggers cron service ID                                    |
| `RENDER_SERVICE_ID_CRAWLER_DAILY`    | rollback-prod | **new** — prod crawler daily cron service ID                                       |

Service IDs live in the `production` environment (not at the repo level) so they are scoped to prod-only workflow runs and stay aligned with `production-launch.md`. The `rollback-prod.yml` job uses `environment: production` and reads them as `vars.RENDER_SERVICE_ID_*`.

### `production` environment — Secrets (Settings → Environments → production)

| Secret                                | Required by   | Notes                                                                                     |
| ------------------------------------- | ------------- | ----------------------------------------------------------------------------------------- |
| `RENDER_DEPLOY_HOOK_API`              | deploy-prod   | already present per `production-launch.md`                                                |
| `RENDER_DEPLOY_HOOK_CRAWLER_TRIGGERS` | deploy-prod   | **new** — Render → `concert-crawl-crawler-triggers` → Settings → Deploy Hook              |
| `RENDER_DEPLOY_HOOK_CRAWLER_DAILY`    | deploy-prod   | **new** — Render → `concert-crawl-crawler-daily` → Settings → Deploy Hook                 |
| `RENDER_API_TOKEN`                    | rollback-prod | **new** — Render → Account Settings → API Keys → generate a token with deploy permissions |

`RENDER_API_TOKEN` is the only credential the rollback script needs.
Scope it to the deploy permission only — the script just reads recent
deploys and POSTs `/rollback`, nothing else.

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
- **Rollback script picks the second-most-recent successful deploy.** If
  prod has already been rolled back once and the current "live" deploy
  is itself the rollback target, the script will pick the next prior one.
  Usually fine, but worth knowing if you're chasing a regression that
  rolled back multiple times.
- **Manual `workflow_dispatch` of `deploy-prod` requires a `reason`.** This
  is intentional — it shows up in the workflow log so the audit trail of
  manual deploys is preserved.
