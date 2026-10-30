#!/usr/bin/env bash
# Wait until a GitHub Actions workflow's push run for a given commit finishes.
#
# Staging Smoke and Staging E2E use it to wait for deploy-api-staging.yml, which
# migrates the staging DB and deploys the API to Vercel's `staging` environment.
# That run is the record of "staging is serving this SHA": it fails if the
# migration, the deploy or the post-deploy health check fails. Reading it needs
# only GITHUB_TOKEN, so the callers hold no Vercel credential.
#
# Exit codes are the same contract as render-wait-for-live.sh and
# vercel-wait-for-ready.sh, because the callers branch on them identically:
#   0   — the run for this SHA completed with conclusion `success`
#   124 — benign: no run for this SHA appeared within the grace period (its
#         `paths` filter skipped a push that does not touch the API — the
#         common case on a docs- or web-only merge), the run was cancelled
#         or skipped and a newer run exists (a newer push superseded it), or
#         it succeeded but a newer successful run has replaced it on staging
#   125 — NOT benign: the run failed, timed out, was cancelled with nothing
#         newer behind it, or was still in flight when the timeout expired, or no run appeared because the workflow is not
#         active (disabled), so staging has stopped updating
#   1   — script or API failure
set -euo pipefail

command -v jq >/dev/null 2>&1 || {
  echo "✗ jq is required but not installed on this runner" >&2
  exit 1
}

usage='usage: gha-wait-for-workflow.sh <workflow-file> <commit-sha> [timeout-seconds]'
workflow="${1:?$usage}"
expected_sha="${2:?$usage}"
timeout_seconds="${3:-600}"
: "${GITHUB_TOKEN:?GITHUB_TOKEN must be set}"
: "${GITHUB_REPOSITORY:?GITHUB_REPOSITORY must be set}"

# Same normalization as vercel-wait-for-ready.sh: the API filters on the full
# lowercase SHA, so an abbreviated or uppercase one would never match and the
# script would report a benign skip.
expected_sha=$(printf '%s' "${expected_sha}" | tr 'A-F' 'a-f')
if ! [[ "${expected_sha}" =~ ^[0-9a-f]{40}$ ]]; then
  echo "✗ commit SHA must be a 40-character hex git SHA; got '${expected_sha}'" >&2
  exit 1
fi

if ! [[ "${timeout_seconds}" =~ ^[0-9]+$ ]] || [ "${timeout_seconds}" -le 0 ]; then
  echo "✗ timeout arg must be a positive integer (seconds); got '${3:-}'" >&2
  exit 1
fi

if ! [[ "${workflow}" =~ ^[A-Za-z0-9._-]+\.ya?ml$ ]]; then
  echo "✗ workflow must be a workflow file name such as deploy-api-staging.yml; got '${workflow}'" >&2
  exit 1
fi

# A push creates every matching workflow's run at once, so a run that has not
# appeared after this long was filtered out rather than delayed.
grace_seconds=60

fetch_run() {
  local response
  if ! response=$(curl -sS --fail-with-body \
    --connect-timeout 5 --max-time 15 \
    -H "Authorization: Bearer ${GITHUB_TOKEN}" \
    -H 'Accept: application/vnd.github+json' \
    "https://api.github.com/repos/${GITHUB_REPOSITORY}/actions/workflows/${workflow}/runs?head_sha=${expected_sha}&event=push&per_page=5"); then
    echo "✗ GitHub rejected the runs request for ${workflow}:" >&2
    printf '%s\n' "${response:0:500}" >&2
    return 1
  fi
  if ! echo "$response" | jq -e 'has("workflow_runs") and (.workflow_runs | type == "array")' >/dev/null 2>&1; then
    echo "✗ GitHub returned an unexpected shape for ${workflow} (expected { workflow_runs: [...] }):" >&2
    printf '%s\n' "${response:0:500}" >&2
    return 1
  fi
  # Newest attempt first; a re-run reuses the run, so one run per SHA is normal.
  echo "$response" | jq -r '(.workflow_runs[0] // {}) | "\(.status // "")|\(.conclusion // "")|\(.html_url // "")|\(.id // "")|\(.created_at // "")"'
}

gh_get() {
  local response
  if ! response=$(curl -sS --fail-with-body \
    --connect-timeout 5 --max-time 15 \
    -H "Authorization: Bearer ${GITHUB_TOKEN}" \
    -H 'Accept: application/vnd.github+json' \
    "https://api.github.com/repos/${GITHUB_REPOSITORY}/actions/workflows/${workflow}$1"); then
    echo "✗ GitHub rejected the request for ${workflow}$1:" >&2
    printf '%s\n' "${response:0:500}" >&2
    return 1
  fi
  printf '%s' "$response"
}

# A missing run reads as "filtered out" only while the workflow can run at all.
# A disabled workflow also creates no runs, and calling that benign would let
# both suites skip green on every push while staging stops updating.
workflow_state() {
  local response
  response=$(gh_get "") || return 1
  echo "$response" | jq -r '.state // ""'
}

# The successful run on main that finished last, whatever its trigger. If it is
# a different SHA, staging now serves that SHA, not ours: a queued or re-run
# suite would be testing other code than it checked out. Ordered by
# `updated_at` rather than taken from the head of the list, because the list is
# ordered by creation and a re-run of an older run deploys last.
newest_success_sha() {
  local response
  response=$(gh_get "/runs?branch=main&status=success&per_page=20") || return 1
  echo "$response" | jq -r '.workflow_runs | sort_by(.updated_at) | (last // {}).head_sha // ""'
}

# Whether a run on main was created after ours. A cancelled run is a benign
# supersede only when something newer took its place; an operator cancelling
# the latest deploy leaves the pushed code undeployed.
has_newer_run() {
  local response
  response=$(gh_get "/runs?branch=main&per_page=20") || return 1
  echo "$response" | jq -e --arg id "$1" --arg created "$2" \
    '[.workflow_runs[] | select((.id | tostring) != $id and .created_at > $created)] | length > 0' >/dev/null
}

start=$(date +%s)
deadline=$(( start + timeout_seconds ))

while :; do
  line=$(fetch_run) || exit 1
  IFS='|' read -r status conclusion url run_id created_at <<<"$line"

  if [ -z "$status" ]; then
    if [ "$(date +%s)" -ge $(( start + grace_seconds )) ]; then
      state=$(workflow_state) || exit 1
      if [ "$state" != "active" ]; then
        echo "✗ ${workflow} is '${state:-unreadable}', not active, so it cannot deploy ${expected_sha}" >&2
        exit 125
      fi
      echo "No ${workflow} push run for ${expected_sha} appeared within ${grace_seconds}s; its paths filter skipped this push" >&2
      exit 124
    fi
  elif [ "$status" = "completed" ]; then
    case "$conclusion" in
      success)
        newest=$(newest_success_sha) || exit 1
        if [ -n "$newest" ] && [ "$newest" != "$expected_sha" ]; then
          echo "${workflow} succeeded for ${expected_sha}, but a newer run has since deployed ${newest}; staging no longer serves this SHA" >&2
          exit 124
        fi
        echo "✓ ${workflow} succeeded for ${expected_sha} and is the latest staging deploy: ${url}"
        exit 0
        ;;
      cancelled | skipped)
        if has_newer_run "$run_id" "$created_at"; then
          echo "${workflow} for ${expected_sha} was ${conclusion}, superseded by a newer run: ${url}" >&2
          exit 124
        fi
        echo "✗ ${workflow} for ${expected_sha} was ${conclusion} with no newer run to replace it, so this SHA never deployed: ${url}" >&2
        exit 125
        ;;
      *)
        echo "✗ ${workflow} for ${expected_sha} concluded '${conclusion}': ${url}" >&2
        exit 125
        ;;
    esac
  fi

  if [ "$(date +%s)" -ge "$deadline" ]; then
    echo "✗ ${workflow} for ${expected_sha} was still '${status:-absent}' after ${timeout_seconds}s: ${url}" >&2
    exit 125
  fi

  sleep 15
done
