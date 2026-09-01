# 2026-08-29 — Prod stopped accepting deploys, and nothing noticed

**Impact:** Production served correct but stale code for ~20 hours, up to
five commits behind `main`. Separately, prod was unreachable for ~2.5
minutes on 2026-08-31 during the recovery deploy. No customers were on the
app.

**Detection:** A human noticed. No automated signal fired.

## What happened

The Render account ran out of build minutes. Every auto-deploy across all
six active services came back `build_failed` in under 1.5 seconds — Render
declining to start a build rather than a build that ran and failed.

Prod kept serving the last successfully deployed commit. The API was up,
healthy, and answering correctly. It was just old, and it got older with
every merge.

On 2026-08-31 the spend cap was raised and a manual redeploy of
`concert-crawl-api` was triggered. That deploy succeeded, but prod went
unreachable for about 2.5 minutes while it rolled.

## Root causes

There are two, and they are unrelated to each other. Conflating them was
the initial mistake in triage.

**1. The staleness.** Build minutes ran out. That is the whole mechanism.
No bad code, no failed migration, no rollback that misfired.

**2. The 2.5-minute outage.** `healthCheckPath` was empty (`""`) on both
API web services. With no health check, Render has no way to know when the
new instance is serving, so it shifts traffic on process start rather than
on readiness — cutting the old instance before the new one can answer. The
deploy was fine; the cutover was not.

## Why nothing alerted

This is the part worth keeping.

**Sentry was correctly silent.** Sentry reports errors. There were no
errors. A healthy app running old code produces exactly the same telemetry
as a healthy app running new code. Every alerting layer we had was
watching for the app being *down*, and the app was *up*.

**The one signal that did fire went nowhere.** The post-deploy reconciler
(`render-wait-for-live.sh`) exited **125** — its purpose-built "deploys are
disabled or stalled" code. It did its job. But a failed GitHub Actions run
is an email, and the email went unread. A detector whose only output is a
channel nobody reads is not a detector.

**Auto-rollback did not fire, and should not have.** Rollback is gated on
the smoke suite actually running and returning non-zero. The smoke never
ran, because the wait step exited 125 before it. That gate exists so
infrastructure flakiness cannot trigger destructive prod rollbacks, and it
held. Rolling back would also have been the wrong action — prod was
running good code. The correct action was to buy build minutes.

**Staging did not help.** Staging and prod deploy in parallel from `main`,
and staging ran out of build minutes at the same moment for the same
reason. A parallel canary does not catch an account-level failure.

## What changed

Merged as the "build cost and deploy resilience" epic
(`docs/superpowers/plans/2026-08-31-build-cost-and-deploy-resilience.md`).

| Change | Addresses |
| ------ | --------- |
| `healthCheckPath: /v1/health` on both API services | The 2.5-minute outage. Directly. |
| `[skip render]` added to the semantic-release commit template | Render does not honor `[skip ci]`, so every merge fanned out twice across six services. Roughly halves build spend on its own. |
| Crawler Dockerfile reordered for layer caching; `apps/api`, `apps/web`, `apps/e2e` dropped from the build context | `pnpm install` and the Chromium download stopped re-running on every source change. |
| `cache.profile: no-cache` cleared on both API services | Nothing required it. It was forcing cold builds. |
| Build filters on all six services | A web-only PR no longer rebuilds the crawler. |
| `prod-deploy-health.yml` — 2-hourly check reporting to **Sentry** | The detection gap. |

## The detector, and what it deliberately does not do

`.github/scripts/render-check-deploy-health.sh` asks Render about Render.
Two conditions:

1. Deploys are turned off, or the service is suspended.
2. The newest deploy attempt failed and nothing has gone live since.

**It does not compare the live SHA to `main`.** That was the obvious
design and it is wrong here: the same epic added build filters, and a
filtered service is *supposed* to sit behind `main` whenever recent
commits do not touch its paths. SHA drift stops being evidence of
anything. Encoding each service's filter into the detector would duplicate
config that lives in Render and drift from it.

**It reports and never remediates.** Every condition it detects — out of
minutes, deploys disabled, service suspended — needs a human decision. And
re-triggering a build that failed for want of build minutes would burn the
few that remain.

**Sentry is the alerting channel; the failed run is only a breadcrumb.**
The workflow does still `exit 1` on findings, so there is a red run to
click through to. But nothing depends on anyone noticing it — the whole
finding above is that a failed Actions run on its own is an email that
went unread.

## What is still not covered

- **Build-minute balance is not monitored.** The detector catches the
  *symptom* two hours after it starts, not the *cause* in advance. Render
  does not expose remaining build minutes via the API as far as we found.
  The 2-hour detection window is the mitigation.
- **Cron services still cannot be auto-rolled back.** Render's `/rollback`
  endpoint rejects `crn-*` (HTTP 400). Manual paths are in
  `docs/runbooks/auto-deploy-prod.md`.
- **Vercel web prod is not auto-rolled back**, by choice. One-click
  promote in the dashboard is faster than automating it.
- **Render config is still not enforced from version control.** The repo's
  `render.yaml` is descriptive and hand-synced — this incident is what
  happens when that sync lapses, since it claimed a `healthCheckPath` the
  live services did not have. Making it a real Blueprint was evaluated and
  rejected; see `docs/runbooks/render-service-config.md` for why.

## Lesson

Every alert we had answered "is prod broken?" None answered "is prod
current?" Those are different questions, and the second one has a silent
failure mode: the app keeps working, so nothing complains, and the gap
grows until a human happens to look.
