#!/usr/bin/env bash
# vercel-api-prod.sh — read the production state of the Vercel API project
# (`concert-crawl-api`). It replaces the Render reads the prod workflows made
# for the API before the Render exit (2026-10/11): the live deploy's commit
# (the deleted render-live-sha.sh), render-check-deploy-health.sh, and
# render-rollback.sh's choice of rollback target.
#
# Usage: vercel-api-prod.sh <command> <project-id> <prod-api-url>
#
#   current   Print "<deployment-id> <commit-sha>" for the deployment the
#             production hostname serves right now. The SHA is empty when
#             the deployment carries none.
#   previous  Print the id of the deployment the production hostname served
#             before the current one was deployed: the rollback target. Read
#             from the current deployment's `meta.prevApiDeployment`, which
#             deploy-prod.yml sets on every API deploy.
#   health    Exit 0 when production is healthy, 2 (with an `UNHEALTHY|`
#             line) when it is not, 1 when the check could not run. Same
#             contract as render-check-deploy-health.sh.
#
#   <prod-api-url> is PROD_API_URL. Its hostname is what is resolved, so the
#   answer is the deployment users reach, not the newest one: after a
#   `vercel rollback` the two differ, and only the first is "prod".
#
# Required env:
#   VERCEL_TOKEN   — token with read access to the featherweight-design team
#   VERCEL_ORG_ID  — the team ID
#
# Why the rollback target is recorded lineage rather than "the newest READY
# production deployment older than the current one": that rule picks a
# deployment that was itself rolled back (B fails, prod returns to A, C ships,
# C is rolled back to B), and the project's first deployment, a staging build
# that Vercel registered with target production, also qualifies. A deployment
# records the one it replaced, so following that link only ever returns to
# something that was serving prod before it.
#
# Why the commit is read from two keys: a deployment the Git integration
# builds carries `meta.githubCommitSha`, while a `vercel deploy` (how
# deploy-prod.yml ships) may carry either: the staging deployment of
# 2026-10-30 has only `meta.gitCommitSha`, and the CLI production deployment
# of the same day only `meta.githubCommitSha`.

set -euo pipefail

command -v jq >/dev/null 2>&1 || {
  echo "✗ jq is required but not installed on this runner" >&2
  exit 1
}

usage='usage: vercel-api-prod.sh current|previous|health <project-id> <prod-api-url>'
command_name="${1:?$usage}"
project_id="${2:?$usage}"
prod_api_url="${3:?$usage}"
: "${VERCEL_TOKEN:?VERCEL_TOKEN must be set}"
: "${VERCEL_ORG_ID:?VERCEL_ORG_ID must be set}"

# Anchored, as vercel-wait-for-ready.sh does it: stray whitespace in the
# variable would otherwise come back from the API as an opaque 404.
if ! [[ "${project_id}" =~ ^prj_[A-Za-z0-9]+$ ]]; then
  echo "✗ Unrecognized or malformed Vercel project ID: '${project_id}'" >&2
  echo "  Check the VERCEL_PROJECT_ID_API variable for typos or whitespace." >&2
  exit 1
fi

host="${prod_api_url#*://}"
host="${host%%/*}"
host="${host%%:*}"
if ! [[ "${host}" =~ ^[A-Za-z0-9.-]+$ ]]; then
  echo "✗ Could not read a hostname from PROD_API_URL ('${prod_api_url}')" >&2
  exit 1
fi

API="https://api.vercel.com"

# Wrapped in `if !` so a 401 or 404 prints Vercel's error body instead of
# aborting under `set -e` with only an exit code (the render-*.sh pattern).
vercel_get() {
  local path="$1" body
  if ! body=$(curl -sS --fail-with-body \
    --connect-timeout 5 --max-time 15 \
    -H "Authorization: Bearer ${VERCEL_TOKEN}" \
    -H 'Accept: application/json' \
    "${API}${path}"); then
    echo "✗ Vercel rejected GET ${path%%\?*}:" >&2
    printf '%s\n' "${body:0:500}" >&2
    return 1
  fi
  printf '%s' "${body}"
}

# The deployment the production hostname is aliased to. Refuses a host that
# belongs to another project, which is what PROD_API_URL still pointing at
# the onrender host (or the web app) looks like from here.
read_current() {
  local json
  json=$(vercel_get "/v13/deployments/${host}?teamId=${VERCEL_ORG_ID}") || return 1
  if ! echo "${json}" | jq -e '(.id | type == "string") and (.projectId | type == "string")' >/dev/null 2>&1; then
    echo "✗ Vercel returned an unexpected shape for ${host}:" >&2
    printf '%s\n' "${json:0:500}" >&2
    return 1
  fi
  local owner
  owner=$(echo "${json}" | jq -r '.projectId')
  if [ "${owner}" != "${project_id}" ]; then
    echo "✗ ${host} is served by Vercel project ${owner}, not ${project_id}." >&2
    echo "  PROD_API_URL must be the API's production hostname on Vercel." >&2
    return 1
  fi
  printf '%s' "${json}"
}

current_json=$(read_current) || exit 1
current_id=$(echo "${current_json}" | jq -r '.id')
current_sha=$(echo "${current_json}" | jq -r '
  (.meta // {}) | (.githubCommitSha // .gitCommitSha // "")
  | if type == "string" then ascii_downcase else "" end')
current_created=$(echo "${current_json}" | jq -r '.createdAt // .created // 0')

case "${command_name}" in
  current)
    echo "${current_id} ${current_sha}"
    ;;

  previous)
    target=$(echo "${current_json}" | jq -r '(.meta // {}).prevApiDeployment // ""')
    if [ -z "${target}" ]; then
      echo "✗ ${current_id} records no earlier production deployment (meta.prevApiDeployment)." >&2
      echo "  It is the first production deploy, or it was not deployed by deploy-prod.yml." >&2
      echo "  Name the target explicitly (rollback-prod.yml's api_deployment input)." >&2
      exit 1
    fi
    if ! [[ "${target}" =~ ^dpl_[A-Za-z0-9]+$ ]]; then
      echo "✗ ${current_id} records a malformed earlier deployment: '${target}'" >&2
      exit 1
    fi
    # A recorded id can outlive its deployment (retention, a manual delete),
    # and `vercel rollback` to a missing one fails mid-incident with less to
    # go on than this.
    prev_json=$(vercel_get "/v13/deployments/${target}?teamId=${VERCEL_ORG_ID}") || exit 1
    prev_state=$(echo "${prev_json}" | jq -r '.readyState // ""')
    prev_project=$(echo "${prev_json}" | jq -r '.projectId // ""')
    if [ "${prev_project}" != "${project_id}" ] || [ "${prev_state}" != "READY" ]; then
      echo "✗ The recorded earlier deployment ${target} is '${prev_state}' in project '${prev_project}', not a READY deployment of ${project_id}." >&2
      exit 1
    fi
    echo "${target}"
    ;;

  health)
    unhealthy() {
      echo "::error title=Prod API deploys not landing::concert-crawl-api (Vercel): $1"
      echo "UNHEALTHY|concert-crawl-api|$1"
      exit 2
    }

    current_state=$(echo "${current_json}" | jq -r '.readyState // ""')
    if [ "${current_state}" != "READY" ]; then
      unhealthy "${host} resolves to ${current_id}, which is '${current_state}', not READY."
    fi

    # Production deploys only through deploy-prod.yml (`vercel deploy`).
    # A Git-integration build has `source: "git"`, so prod serving one means
    # a push reached production without a promotion: the gate leaked
    # (vercel.json's git.deploymentEnabled was changed, or the project
    # setting was).
    #
    # Classified by `source`, not `meta.githubDeployment`: a `vercel deploy`
    # run inside GitHub Actions sets that flag too. The CLI production deploy
    # dpl_6ghWaBNMoRANX8eR4t4fhZTQcGUE (2026-10-30) carries `source: "cli"`
    # and `githubDeployment: "1"`, and the flag alone read it as a leak.
    current_source=$(echo "${current_json}" | jq -r '.source // "" | if type == "string" then . else "" end')
    if [ -z "${current_source}" ]; then
      echo "✗ Vercel returned no deployment source for ${current_id}, so whether a Git build is serving prod cannot be told." >&2
      exit 1
    fi
    if [ "${current_source}" = "git" ]; then
      unhealthy "production is serving ${current_id}, a Git-integration build. Prod is promotion-gated, so a push reached it without Deploy to Production."
    fi

    # Only CLI deploys (`source: "cli"`) count: the Git integration still
    # creates production deployments for pushes to main (`source: "git"`) and
    # cancels them, which is the gate working, not a failure. A dashboard
    # redeploy (`source: "redeploy"`) is not a promotion either. A failed CLI deploy newer than what prod
    # serves is the 2026-08-29 shape: promoted code not reaching prod.
    #
    # Production deployments created after the current one are read newest
    # first, page by page (`since` bounds the window, `pagination.next` walks
    # it), until the first CLI deploy turns up: that is the newest one, and
    # the only one whose state matters. A fixed single page would let a run of
    # canceled Git builds push it off the end and report healthy. Each page is
    # reduced on its own, so nothing grows with the number of pages.
    failed=""
    until_param=""
    for _ in $(seq 1 20); do
      page=$(vercel_get "/v6/deployments?projectId=${project_id}&teamId=${VERCEL_ORG_ID}&target=production&limit=100&since=$((current_created + 1))${until_param}") || exit 1
      if ! echo "${page}" | jq -e '.deployments | type == "array"' >/dev/null 2>&1; then
        echo "✗ Vercel returned an unexpected deployments shape for ${project_id}" >&2
        exit 1
      fi
      newest_cli=$(echo "${page}" | jq -c --argjson created "${current_created}" '
        [ .deployments[]
          | select(type == "object")
          | select(.source == "cli")
          | select((.created // 0) > $created) ]
        | sort_by(.created // 0) | reverse | (.[0] // empty)')
      if [ -n "${newest_cli}" ]; then
        failed=$(echo "${newest_cli}" | jq -r 'select((.state // .readyState) == "ERROR") | .uid // empty')
        break
      fi
      next=$(echo "${page}" | jq -r '(.pagination // {}).next // empty')
      [ -z "${next}" ] && break
      until_param="&until=${next}"
    done
    if [ -n "${failed}" ]; then
      unhealthy "the newest production deploy (${failed}) ended in ERROR and ${current_id} is still serving. Promoted code is not reaching prod."
    fi

    # The two jobs that left Render run as Vercel Cron. Cron Jobs are a
    # project-level switch, and one that is off stops match-artists and
    # spotify-weekly without any error anywhere.
    project=$(vercel_get "/v9/projects/${project_id}?teamId=${VERCEL_ORG_ID}") || exit 1
    crons_off=$(echo "${project}" | jq -r '
      (.crons // {}) as $c
      | if ($c.disabledAt // 0) > ($c.enabledAt // 0) then "yes" else "no" end')
    if [ "${crons_off}" = "yes" ]; then
      unhealthy "Cron Jobs are disabled on the project, so match-artists and spotify-weekly are not running. Re-enable them under Settings → Cron Jobs."
    fi

    echo "✓ concert-crawl-api: ${host} serves ${current_id} (${current_sha:0:9}), READY; crons enabled"
    ;;

  *)
    echo "✗ ${usage}" >&2
    exit 1
    ;;
esac
