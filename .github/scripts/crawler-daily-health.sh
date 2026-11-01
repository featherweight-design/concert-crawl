#!/usr/bin/env bash
# crawler-daily-health.sh — is the daily crawl on GitHub Actions still running?
#
# Replaces the Render deploy-health check on concert-crawl-crawler-daily. A
# daily run that never starts emails nobody: the schedule does nothing while
# CRAWLER_GHA_DAILY_ENABLED is not 'true', a disabled workflow is silent, and
# GitHub occasionally drops a scheduled run. So this asks for a success, and
# a success that crawled: a run the guard job skipped succeeds too.
#
# Usage: crawler-daily-health.sh
# Env:   GH_TOKEN       token with actions: read on the repository
#        REPO           owner/name
#        DAILY_ENABLED  the value of vars.CRAWLER_GHA_DAILY_ENABLED
#
# Exit contract shared with render-check-deploy-health.sh and
# vercel-api-prod.sh health: 0 healthy, 2 unhealthy (with an
# `UNHEALTHY|crawler-daily|<reason>` line), anything else = could not tell.

set -uo pipefail

: "${GH_TOKEN:?GH_TOKEN must be set}"
: "${REPO:?REPO must be set}"

# A day between scheduled runs, plus two hours of GitHub schedule delay.
WINDOW_HOURS=26

if [ "${DAILY_ENABLED:-}" != "true" ]; then
  echo "UNHEALTHY|crawler-daily|CRAWLER_GHA_DAILY_ENABLED is '${DAILY_ENABLED:-unset}', so the daily schedule does nothing"
  exit 2
fi

since=$(date -u -d "${WINDOW_HOURS} hours ago" +%Y-%m-%dT%H:%M:%SZ)
if ! run_ids=$(gh api -X GET "repos/${REPO}/actions/workflows/crawler-daily.yml/runs" \
  -f branch=main -f status=success -f created=">=${since}" -f per_page=20 \
  --jq '.workflow_runs[].id'); then
  echo "✗ Could not list crawler-daily runs" >&2
  exit 1
fi

# A run whose guard job found an earlier run today succeeds without crawling.
# Only a run in which a job other than `guard` succeeded has crawled.
for run_id in ${run_ids}; do
  if ! crawled=$(gh api "repos/${REPO}/actions/runs/${run_id}/jobs" \
    --jq '[.jobs[] | select(.name != "guard" and .conclusion == "success")] | length'); then
    echo "✗ Could not list the jobs of crawler-daily run ${run_id}" >&2
    exit 1
  fi
  if [ "${crawled}" -gt 0 ]; then
    echo "✓ crawler-daily has crawled successfully on main since ${since} (run ${run_id})"
    exit 0
  fi
done

state=$(gh api "repos/${REPO}/actions/workflows/crawler-daily.yml" --jq '.state' 2>/dev/null || echo unknown)
echo "UNHEALTHY|crawler-daily|no crawler-daily run on main crawled successfully in the last ${WINDOW_HOURS} hours (workflow state: ${state})"
exit 2
