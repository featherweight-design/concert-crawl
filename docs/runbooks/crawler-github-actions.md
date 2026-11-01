# Crawler on GitHub Actions

The crawler runs on GitHub-hosted runners, in place of Render's two crawler
crons (Render exit, step 2).

| Workflow               | Replaces                                        | When it runs                                                                                                                                                                                                   | Mode                                                                                                    |
| ---------------------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `crawler-daily.yml`    | `concert-crawl-crawler-daily` (`0 9 * * *`)     | 09:07 UTC, dispatched by the production API's Vercel Cron Job; `7 12 * * *` UTC as a backup, only while the repo variable `CRAWLER_GHA_DAILY_ENABLED` is `true`; or by hand. See "What starts the daily crawl" | `all`: drains pending triggers, then crawls every venue                                                 |
| `crawler-triggers.yml` | `concert-crawl-crawler-triggers` (every 10 min) | On demand: the API dispatches it after it writes `crawl_triggers` rows, once `CRAWLER_DISPATCH_TOKEN` is set on the Vercel API project; or by hand                                                             | `triggers`: drains the queue, up to 200 triggers, no new claim after 150 min (enough for a trigger-all) |

Both call `crawler-run.yml`, which does the work. It runs only from `main`:
a dispatch from another branch skips the job, so no other branch's code ever
sees the crawler's secrets.

In `all` mode a failed trigger drain is reported to Sentry and the venue crawl
still runs; the job then fails so the error is not silent.

## What starts the daily crawl

GitHub throttles and drops schedules on this repository (the 2026-11-01 09:07
UTC run never fired), so the schedule is the backup, not the trigger.

1. **09:07 UTC, Vercel Cron.** The production deployment of `concert-crawl-api`
   calls `GET /v1/internal/cron/crawler-daily` with `CRON_SECRET` as its
   bearer. The route lists `crawler-daily.yml` runs created since 00:00 UTC
   with `CRAWLER_DISPATCH_TOKEN`. If a production run exists, in any status,
   it skips; otherwise it dispatches one with `skip_if_ran_today: true`. It
   answers 503 and dispatches nothing when it cannot check. Every outcome
   writes an `audit_log` row (`system:vercel-cron`, `crawl.daily_cron`).
2. **12:07 UTC, GitHub schedule.** The backup, while
   `CRAWLER_GHA_DAILY_ENABLED` is `true`.

Every run starts with the `guard` job. For the schedule, or a dispatch with
`skip_if_ran_today`, it lists the day's runs with the workflow's own
`GITHUB_TOKEN` and exits cleanly, crawling nothing, when an earlier run of the
same environment was created today (UTC). Earlier means a lower run ID, so if
Vercel delivers the cron twice exactly one run crawls. A manual run leaves
`skip_if_ran_today` off and always crawls.

A run's environment is in its title (`run-name`): `Crawler daily: production`
or `Crawler daily: staging`. Both checks match on it, so keep `run-name` and
`dailyRunTitle` in `apps/api/src/lib/crawler-dispatch.ts` in step. A run whose
guard skipped succeeds without crawling, and `crawler-daily-health.sh` does not
count it as a crawl.

To pause the daily crawl: unset `CRAWLER_DISPATCH_TOKEN` on the production API
(or disable Cron Jobs on `concert-crawl-api`) and set
`CRAWLER_GHA_DAILY_ENABLED` to `false`. Either one alone leaves the other
trigger running.

## What code runs

- **Production** runs the commit the production API serves
  (`.github/scripts/vercel-api-prod.sh current`). Promotion through
  `deploy-prod.yml` and `rollback-prod.yml` move the crawler with the API. If
  the commit cannot be read, the job fails rather than run unpinned code.
- **Staging** runs main HEAD, which is what staging deploys.
- The job builds `apps/crawler/Dockerfile` at that commit (Docker layer cache
  through `type=gha`, one retry), checks it with
  `apps/crawler/scripts/verify-image.sh`, then `docker run`s it.

## Configuration

The job declares `environment: production` or `environment: staging` and
reads that GitHub environment. The values were copied from Render (the
"Concert Crawl Production" / "Concert Crawl Staging" env groups and each
crawler's own `SENTRY_DSN`).

| GitHub name                                                                         | Kind            | Passed to the crawler as                          |
| ----------------------------------------------------------------------------------- | --------------- | ------------------------------------------------- |
| `CRAWLER_DATABASE_URL`                                                              | env secret      | `DATABASE_URL` (pooled Neon URL)                  |
| `CRAWLER_SENTRY_DSN`                                                                | env secret      | `SENTRY_DSN` (the crawler's Sentry project)       |
| `CRAWLER_RESEND_API_KEY`                                                            | env secret      | `RESEND_API_KEY`                                  |
| `ANTHROPIC_API_KEY`, `CLERK_SECRET_KEY`, `VAPID_PRIVATE_KEY`, `REVALIDATE_SECRET`   | env secrets     | same name                                         |
| `ADMIN_URL`, `VAPID_PUBLIC_KEY`, `VAPID_SUBJECT`, `SENTRY_ENVIRONMENT`, `LOG_LEVEL` | env vars        | same name                                         |
| `ADMIN_EMAIL`                                                                       | repo var        | same name                                         |
| `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID_API`, `PROD_API_URL`            | production only | used to read the API's live commit, not passed in |

The three `CRAWLER_` names exist because the environments already held a
`DATABASE_URL`, `SENTRY_DSN` and `RESEND_API_KEY` that other workflows use;
the crawler gets its own copies rather than repointing those.

Values are written to a 0600 env file on the runner, passed with
`docker run --env-file`, and deleted when the job ends. None goes into the
image or a build argument. The "Verify crawler configuration" step fails the
run and lists, by name, any of the values above that are missing (`LOG_LEVEL`
excepted: it has a default). The callers pass `secrets: inherit`: a called
workflow sees no secrets at all, its environment's included, without it. That
also hands it the repository's secrets, which is why the job runs only from
`main` and both environments carry a `main`-only branch policy.

To change a value, from a file and never through chat:

```bash
gh secret set ANTHROPIC_API_KEY --env production < key.txt
```

## Running it by hand

Actions → **Crawler triggers** or **Crawler daily** → Run workflow → pick the
environment, and leave `skip_if_ran_today` off. A manual daily run always
runs, whatever `CRAWLER_GHA_DAILY_ENABLED` says and whatever ran earlier that
day, so a manual production run on a day the cron already crawled crawls every
venue twice. Do not run it on production while Render's daily cron is still
live, for the same reason. A manual run before 09:07 UTC makes that morning's
cron skip.

## Switching back to Render

Until the Render services are deleted:

1. Resume `concert-crawl-crawler-daily` and `concert-crawl-crawler-triggers`
   in Render.
2. Set the repo variable `CRAWLER_GHA_DAILY_ENABLED` to `false`.
3. Unset `CRAWLER_DISPATCH_TOKEN` on the Vercel API project, so the API stops
   dispatching.

Trigger rows are compatible both ways (`for update skip locked` gives each row
to exactly one claimer), so nothing queued is lost.

## Failure signals

- A failed or degraded run fails the job. GitHub emails whoever the run is
  attributed to: for the schedule, the person who last edited the cron line in
  `crawler-daily.yml`; for a dispatch, the account that dispatched it (the
  owner of `CRAWLER_DISPATCH_TOKEN` for API dispatches). Check that this is
  Hugh after any change to either.
- A trigger whose dispatch was lost is picked up by the next daily run.
- A run killed mid-crawl leaves its trigger in `processing`; the next run's
  reaper marks it failed and reports it to Sentry.
- A skipped schedule is silent, and the Vercel Cron Job is the trigger that
  matters. Its outcome is in the Vercel cron log (a 503 is a failure) and in
  `audit_log`. Check both, then the Actions tab, if a morning has no
  `crawl_runs` rows.

## Actions minutes

Measured on Render (2026-07 to 2026-10): the daily crawl takes a median of
22 minutes for about 20 venues; admins queue crawls about 7 times a month.

| Source                                          | Minutes a month |
| ----------------------------------------------- | --------------- |
| Daily: ~25 min crawl + ~3 min image build, × 30 | ~840            |
| Triggers: ~7 dispatches × ~6 min                | ~45             |
| **Total**                                       | **~900**        |

The daily job's timeout is 120 minutes. It covers the image build (~3 min),
the trigger drain `all` mode runs first (normally empty, at most its 30-minute
budget) and the venue crawl at about 1.1 minutes per venue. With a full drain
that leaves room for roughly 80 venues; with an empty one, about 100. Shard
venues across a job matrix before 60.
