#!/usr/bin/env bash
# Wait until a Vercel project is serving a READY deployment for a given commit.
#
# The web half of what render-wait-for-live.sh does for a Render service. It
# exists because a workflow that only waits on the API can run its suite
# against the previous web build: the two halves of an environment deploy
# independently, so "the API is live on this SHA" says nothing about the front
# end. There is no public surface on the web app that reports its build SHA
# (`NEXT_PUBLIC_APP_VERSION` is only rendered behind auth), so the Vercel API is
# the only readable source.
#
# Exit codes are the same contract as render-wait-for-live.sh, because the
# callers branch on them identically:
#   0   — a deployment for this SHA reached READY
#   124 — benign: no deployment for this SHA exists, or one exists and a newer
#         commit has already been promoted over it. The project's Ignored Build
#         Step skips pushes that do not touch the web app, so the first is the
#         common outcome on an API- or docs-only merge, not an exception.
#   125 — NOT benign: a deployment for this SHA exists and failed, was
#         cancelled, or was still building when the timeout expired. A build
#         that legitimately takes longer than the timeout lands here too, so
#         the message names the state it saw rather than asserting a failure.
#   1   — script or API failure.
set -euo pipefail

command -v jq >/dev/null 2>&1 || {
  echo "✗ jq is required but not installed on this runner" >&2
  exit 1
}

project_id="${1:?usage: vercel-wait-for-ready.sh <project-id> <commit-sha> [timeout-seconds]}"
expected_sha="${2:?usage: vercel-wait-for-ready.sh <project-id> <commit-sha> [timeout-seconds]}"
timeout_seconds="${3:-300}"
: "${VERCEL_TOKEN:?VERCEL_TOKEN must be set}"
: "${VERCEL_ORG_ID:?VERCEL_ORG_ID must be set}"

# Normalized and shape-checked the same way render-trigger-deploy.sh does it,
# and for a sharper reason: a mismatch here is silent. The jq filter below
# compares against `meta.githubCommitSha`, which Vercel stores lowercase, so an
# uppercase or abbreviated SHA simply never matches — the script would poll for
# the full timeout and exit 124, which the caller reads as a benign skip and
# runs its suite against whatever the app currently serves. `printf '%s'` rather
# than `echo` because some echo implementations eat a leading `-` as an option.
expected_sha=$(printf '%s' "${expected_sha}" | tr 'A-F' 'a-f')
if ! [[ "${expected_sha}" =~ ^[0-9a-f]{40}$ ]]; then
  echo "✗ commit SHA must be a 40-character hex git SHA" >&2
  echo "  got: '${expected_sha}'" >&2
  exit 1
fi

# Same check render-wait-for-live.sh makes, for the same reason: a value like
# "5m" or "300s" aborts inside the arithmetic below under `set -e`, and the
# caller's catch-all branch would report "a script or API failure" rather than
# naming the bad argument.
if ! [[ "${timeout_seconds}" =~ ^[0-9]+$ ]] || [ "${timeout_seconds}" -le 0 ]; then
  echo "✗ timeout arg must be a positive integer (seconds); got '${3:-}'" >&2
  exit 1
fi

# Anchored rather than a glob, for the same reason the render-*.sh helpers
# check their service IDs: a variable carrying stray whitespace would reach the
# API and come back as an opaque 404 instead of naming the misconfigured
# variable. Vercel project IDs are `prj_` followed by alphanumerics.
if ! [[ "${project_id}" =~ ^prj_[A-Za-z0-9]+$ ]]; then
  echo "✗ Unrecognized or malformed Vercel project ID: '${project_id}'" >&2
  echo "  Expected prj_* with only alphanumerics after the prefix and no" >&2
  echo "  whitespace. Check for typos in the VERCEL_PROJECT_ID_* variable." >&2
  exit 1
fi

# `limit=20` covers a burst of fast-follow merges without paging. Unlike the
# Render helper's 50, a failed Vercel build does not queue retries, so a run of
# failures cannot push the deployment being looked for off the page.
#
# Wrapped in `if !` rather than assigned bare, the same way the render-*.sh
# helpers do it: `--fail-with-body` writes the API's error body to stdout, but a
# bare command substitution aborts under `set -e` before anything can print it,
# so a 401 or a 403 would reach the log as an exit code with no explanation.
fetch_deployments() {
  if ! response=$(curl -sS --fail-with-body \
    --connect-timeout 5 --max-time 15 \
    -H "Authorization: Bearer $VERCEL_TOKEN" \
    -H 'Accept: application/json' \
    "https://api.vercel.com/v6/deployments?projectId=${project_id}&teamId=${VERCEL_ORG_ID}&target=production&limit=20"); then
    echo "✗ Vercel rejected the deployments request for $project_id:" >&2
    # Truncated by parameter expansion rather than `head -c`: head closes the
    # pipe, the writer takes SIGPIPE, and under `set -euo pipefail` that
    # replaces this exit code with 141.
    printf '%s\n' "${response:0:500}" >&2
    return 1
  fi

  # Checked before any filter runs. `.deployments[]` against an error object
  # aborts with jq's own message and nothing about which project or what came
  # back, so an API shape change would surface as an unexplained non-zero exit.
  #
  # Every entry is checked, not only the envelope. A `[null]` or an entry with no
  # readable state would otherwise be skipped by the filter below, leaving the
  # matched state empty — which the script reports as 124 and the caller reads as
  # a benign skip. An unreadable response has to fail closed here, because 124 is
  # the one exit that lets the suite run without the SHA ever being confirmed.
  if ! echo "$response" | jq -e '
    has("deployments")
    and (.deployments | type == "array")
    and (.deployments | all(
      type == "object" and ((.state // .readyState) | type == "string")
    ))' >/dev/null 2>&1; then
    echo "✗ Vercel returned an unexpected shape for $project_id (expected { deployments: [...] }):" >&2
    printf '%s\n' "${response:0:500}" >&2
    return 1
  fi

  printf '%s' "$response"
}

deadline=$(( $(date +%s) + timeout_seconds ))

while :; do
  response=$(fetch_deployments) || exit 1

  # A deployment's commit is `meta.githubCommitSha`. `// empty` keeps a
  # deployment created outside a git push — a CLI deploy has no meta — from
  # aborting the filter, and the trailing select keeps a present-but-empty
  # value from matching.
  state=$(echo "$response" | jq -r --arg sha "$expected_sha" '
    [
      .deployments[]
      | select(((.meta // {}).githubCommitSha // empty) == $sha)
      | .state // .readyState
    ] | (.[0] // "")')

  # A READY deployment for this SHA is not proof the project still serves it:
  # Vercel leaves the old deployment READY forever after a newer one is
  # promoted, so a fast-follow merge would let the caller run its suite against
  # the newer build while the checked-out tests are this SHA's. The list is
  # newest-first, so the head entry is what production points at.
  #
  # A head entry with no `meta` is a CLI deploy — prod promotes that way — and
  # its commit is unknowable from this response, so it is not treated as
  # superseding anything. Guessing either way there would be worse than saying
  # nothing: this script gates a test suite, not a deploy.
  newest_sha=$(echo "$response" | jq -r '
    (.deployments[0] // {}) | ((.meta // {}).githubCommitSha // "")')
  newest_state=$(echo "$response" | jq -r '
    (.deployments[0] // {}) | (.state // .readyState // "")')

  case "$state" in
    READY)
      if [ -n "$newest_sha" ] \
        && [ "$newest_sha" != "$expected_sha" ] \
        && [ "$newest_state" = "READY" ]; then
        echo "The Vercel deployment for $expected_sha is READY but superseded by $newest_sha, which the project now serves" >&2
        exit 124
      fi
      echo "✓ Vercel project $project_id is serving $expected_sha"
      exit 0
      ;;
    ERROR | CANCELED)
      echo "✗ The Vercel deployment for $expected_sha ended in state $state" >&2
      exit 125
      ;;
    '')
      # No deployment for this SHA yet. Indistinguishable from one the Ignored
      # Build Step skipped, which is why the timeout below reports 124 rather
      # than failing: exiting non-zero here would turn every API-only merge
      # into a red run.
      #
      # Be clear about what that costs. Nothing else currently watches the
      # Vercel side over time — prod-deploy-health.yml polls Render service IDs
      # only — so a dropped Vercel webhook reads as a benign skip here and is
      # not caught elsewhere. The residual risk is bounded by what this caller
      # is for: it gates a test suite, and the suite still runs against the
      # build the app is actually serving. It is not a deploy monitor.
      ;;
    *)
      # BUILDING, QUEUED, INITIALIZING — in flight, keep polling.
      ;;
  esac

  if [ "$(date +%s)" -ge "$deadline" ]; then
    if [ -z "$state" ]; then
      echo "No Vercel deployment for $expected_sha appeared within ${timeout_seconds}s" >&2
      exit 124
    fi
    echo "✗ The Vercel deployment for $expected_sha was still $state after ${timeout_seconds}s" >&2
    exit 125
  fi

  sleep 10
done
