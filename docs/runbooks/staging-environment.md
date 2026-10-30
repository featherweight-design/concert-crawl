# Staging Environment Runbook

How the staging API is hosted and deployed, how the staging environment gets
its data, and the one line that must never be crossed.

---

## Staging API

Since 2026-10-30 the staging API runs on Vercel, not Render.

| What            | Value                                                                    |
| --------------- | ------------------------------------------------------------------------ |
| URL             | `https://api-staging.concertcrawl.app`                                   |
| Vercel project  | `concert-crawl-api` (featherweight-design), Root Directory `apps/api`    |
| Environment     | the `staging` custom environment of that project                         |
| Config          | `apps/api/vercel.json`; the functions are `apps/api/api/*.js`            |
| Deployed by     | `.github/workflows/deploy-api-staging.yml`, on API pushes to `main`      |
| DNS             | Cloudflare `CNAME api-staging` to Vercel, DNS only (not proxied)         |
| Neon branch     | `staging`; the API uses its **pooled** host, migrations its direct host  |
| Render fallback | `concert-crawl-api-staging`, up with auto-deploy off until removal is OK |

**Deploys.** Git deployments are off, by `git.deploymentEnabled: false` in `vercel.json` (the project's own Git setting did not stop branch pushes building previews). `deploy-api-staging.yml`
runs on every push to `main` that touches the API's paths (Render's `buildFilter` list plus
`packages/crawler-core/**`, which the API imports at runtime) and on manual dispatch from `main`: it runs `pnpm
db:migrate` against `DATABASE_URL_DIRECT`, then `vercel deploy --target=staging`,
then checks `/v1/health`. Staging Smoke and Staging E2E wait for that run
(`.github/scripts/gha-wait-for-workflow.sh`) before testing the pushed SHA; a
push it skipped reads as a benign skip, as it did on Render.

Its configuration lives on the `staging` GitHub environment: the secrets
`DATABASE_URL_DIRECT` and `VERCEL_TOKEN`, and the variables `VERCEL_ORG_ID` and
`VERCEL_PROJECT_ID_API`. The health check reads the repository variable
`STAGING_API_URL`.

**Runtime env vars** are set on the `staging` environment in Vercel, copied from
the Render staging service and its env group on 2026-10-30, minus the
Render-only `NPM_CONFIG_PREFIX` and `PLAYWRIGHT_BROWSERS_PATH`. Three differ
from Render: `DATABASE_URL` is the pooled host, `DB_POOL_MAX=3` caps each
instance's connections, and `API_PUBLIC_URL` is the new host, so unsubscribe
links in staging emails point at it. `CRON_SECRET` is set, which arms
`/v1/internal/cron/*` there. Change a value with `vercel env` or the dashboard,
then redeploy; a running deployment keeps the values it was built with.

**Vercel Cron does not run on staging.** It runs only on production
deployments. The project's first deployment counted as production, so its cron
definitions registered against a staging build; cron jobs were disabled on the
project the same day and stay disabled until the prod cutover re-enables them.
Re-enable them only once production is deployed, or the crons hit staging.

**Deployment protection.** The project uses Standard Protection, which covers
custom-environment domains as well as deployment URLs, so
`api-staging.concertcrawl.app` carries a protection exception to stay public
(the web app calls it from the browser). Generated `*.vercel.app` URLs stay
behind Vercel Authentication; reach them with `vercel curl`.

**Rollback to Render.** Redeploy `concert-crawl-api-staging` from `main` in the
Render dashboard, then point the repository variable `STAGING_API_URL` and the
web staging project's `NEXT_PUBLIC_API_URL` back at
`https://concert-crawl-api-staging.onrender.com` and redeploy the web staging
project.

---

## Staging data

Staging holds **prod content, never prod users.**

### Synced from prod

`venues`, `events` (rolling window), `artists`, `price_retrieval_log`
(excluding `source='community'`), `venue_guide_chips`.

Mechanism: `scripts/seed-staging/sync-prod-public-data.ts`, run weekly by
`.github/workflows/staging-content-sync.yml` (Mondays 15:00 UTC) and on demand
via `gh workflow run staging-content-sync.yml -f dry_run=true`.

By hand, with both connection strings exported:

```bash
pnpm db:seed:staging:sync -- --dry-run   # reports, writes nothing
pnpm db:seed:staging:sync                # commits
```

The workflow needs two repository secrets. A scheduled run always commits; a
manual dispatch defaults to `dry_run: true`, so writing is opt-in.

| Secret                | Purpose                                                      | How to create                                                                                                                                               |
| --------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NEON_PROD_DIRECT`    | Read source — full Postgres URL for the prod Neon branch     | Neon console → project → prod branch → Connection string (direct, not pooled) → GitHub → Settings → Secrets and variables → Actions → New repository secret |
| `NEON_STAGING_DIRECT` | Write target — full Postgres URL for the staging Neon branch | Same path, staging branch                                                                                                                                   |

Until both exist the scheduled run fails at the preflight step with a named
error. That is intended — a sync that silently no-ops looks identical to a sync
that found nothing to do.

### Never synced

**The safety contract is the allowlist above, not a list of exclusions.** The
five tables named under "Synced from prod" are the whole of what the sync
touches; every other table in the schema is never synced, and a table is only
copied when someone adds a sync module for it by name. Read the contract that
way round — an exclusion list drifts silently the moment a migration adds a
table, and it was written as one until Copilot caught that on #1730.

Illustrative, not exhaustive: `price_submissions`, `submission_confirms`,
`event_reports`, `event_report_confirms`, `user_events`,
`user_artist_follows`, `user_roles`, `user_cred`, `push_subscriptions`,
`user_spotify_connections`, `spotify_alert_log`, `email_send_log`, `audit_log`,
`invite_codes`, `waitlist_entries`, `feedback`, the crew tables, the commerce
and billing tables, `notifications`, `user_profiles`,
`user_notification_preferences`, `venue_fault_acknowledgements`.

**Why this line is hard:** the staging transactional-email gate (#1613) **fails
open**. A prod user row in staging, plus one of the suspended staging crons
being restored, is a path to emailing a real customer from staging. Content
tables carry no foreign key into any user table, which is what makes the split
enforceable rather than aspirational.

`event_reports` is excluded even though it holds no contact information: its
`reporter_id` is a Clerk user ID, and a moderation queue is not test data
anybody needs.

**A Neon branch from prod is the wrong tool here.** It is one command and it
copies every user row.

### Two safety layers

1. `assertWriteHostNotProd(prodUrl, stagingUrl)` throws before any connection
   opens if both URLs address the same Neon branch. Neon gives one branch both a
   direct and a `-pooler` hostname, so the comparison strips that marker first —
   otherwise naming the prod branch by its pooled endpoint would slip past a
   check against its direct one, which is a single dropdown in the console.
2. `openProdReadonly(prodUrl)` returns a client exposing only `.select`, whose
   inner Drizzle handle is a proxy exposing only `.select` and `.query`; every
   other property access throws.

Any table added to the sync must route through both. Never open a second prod
connection.

### Synthetic users

Staging user fixtures come from `scripts/seed-staging/seed-synthetic.ts`
(`pnpm db:seed:staging:synthetic`), not from prod. `pnpm db:seed:staging` runs
the content sync and the synthetic seed in that order.

---

## Known behaviours, not bugs

- **A fresh staging DB reports every chip and price-log row as
  `skippedMissingFk`.** The `venueIdMap` is built from a read-only SELECT
  against staging, so on a database that has never had a commit-mode venue sync
  the map is empty and every FK-dependent row is skipped. Run the sync once in
  commit mode, then the counts become realistic.
- **`artists` is synced in full, with no rolling window**, unlike `events` and
  `price_retrieval_log`. An artist row has no date to window on, and the table
  is a projection of the event funnel, so its size tracks distinct acts rather
  than show count.
- **Chips are upserted, never deleted.** A chip removed in prod stays in staging
  until someone truncates it. Staging is test data, and a delete pass is a new
  class of write against the staging DB for no test-value gain.
