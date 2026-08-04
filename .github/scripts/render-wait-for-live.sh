#!/usr/bin/env bash
# render-wait-for-live.sh — wait for a Render service's deploy of a
# specific commit SHA to reach `live` status.
#
# Usage: render-wait-for-live.sh <service-id> <expected-sha> [<timeout-seconds>]
#
# Args:
#   <service-id>      Render service ID (srv-* or crn-*).
#   <expected-sha>    The git SHA we expect the service to be live on.
#   <timeout-seconds> Optional. Max time to wait, in seconds. Defaults to
#                     600 (10 min) for backward compat with staging-smoke.
#                     prod-smoke-after-deploy.yml passes 300 (5 min).
#
# Required env:
#   RENDER_API_TOKEN — Render API token with read permission on deploys.
#
# Polls every 10s up to <timeout-seconds>. Exit codes:
#   0   — service is live on expected SHA
#   124 — timeout reached without seeing the expected SHA go live
#         (matches GNU timeout(1) convention; new caller behavior:
#         prod-smoke-after-deploy.yml treats this as benign-skip)
#   1   — hard failure (jq missing, missing env, malformed timeout
#         arg, curl/auth/network failure, no live deploy found)
#
# Callers that want to distinguish benign timeout from real failure
# should branch on the exit code explicitly. Treating any non-zero as
# generic failure is also safe (existing staging-smoke caller does this).
#
# Why this script exists: Render's deploy hooks return immediately, and
# Render keeps the prior build serving traffic until the new one is
# healthy. A naive `/v1/health` check returns 200 against the OLD build
# during this window, so a downstream smoke suite that runs right after
# the hook can pass against unchanged code — defeating the entire
# promotion gate. Waiting for the new SHA to actually be `live` closes
# that window.

set -euo pipefail

command -v jq >/dev/null 2>&1 || {
  echo "✗ jq is required but not installed on this runner"
  exit 1
}

SERVICE_ID="${1:?service id required}"
EXPECTED_SHA="${2:?expected commit sha required}"

: "${RENDER_API_TOKEN:?RENDER_API_TOKEN must be set}"

API="https://api.render.com/v1"
AUTH="Authorization: Bearer ${RENDER_API_TOKEN}"

# Optional 3rd arg: timeout in seconds. Defaults to 600 (10 min) for
# backward compatibility with the staging-smoke caller. The new
# prod-smoke-after-deploy.yml passes 300 (5 min) because the prod
# API deploys consistently take ~2 min on Render — see plan
# docs/superpowers/plans/2026-06-24-render-native-prod-deploys.md for
# the deploy-time data.
timeout="${3:-600}"

# Validate timeout is a positive integer. A bad value (e.g. "5m" or
# "300s") would silently coerce to 0 in arithmetic context and the
# loop would exit immediately; fail loud instead.
if ! [[ "${timeout}" =~ ^[0-9]+$ ]] || [ "${timeout}" -le 0 ]; then
  echo "✗ timeout arg must be a positive integer (seconds); got '${3}'" >&2
  exit 1
fi

elapsed=0

echo "→ Waiting for service ${SERVICE_ID} to be live on ${EXPECTED_SHA} (up to ${timeout}s)"

while [ "${elapsed}" -lt "${timeout}" ]; do
  # Use limit=50 (matching render-rollback.sh) so a streak of failed or
  # in-progress deploys after the last successful one cannot push the
  # currently-`live` deploy off the end of the page — that would cause
  # `live_sha` to be empty and the script to falsely time out even
  # though the service is actually live on the right commit.
  deploys_json=$(curl --fail --silent --show-error \
    --connect-timeout 5 --max-time 15 \
    -H "${AUTH}" \
    -H "Accept: application/json" \
    "${API}/services/${SERVICE_ID}/deploys?limit=50")

  # Item shape varies across Render API versions: some endpoints wrap
  # entries as `{deploy: {...}}`, others return the deploy object flat.
  # `(.deploy // .)` accepts both. Default the indexed entry to {} so
  # the subsequent `.commit.id` access does not crash with
  # "Cannot index null" when no deploy currently has `status: live`
  # (new/paused service, or API shape change). With an empty entry,
  # live_sha falls through to "" and we keep polling until timeout.
  #
  # `.commit` is an OBJECT {id, message, createdAt}, not a string —
  # confirmed live against the Render API on 2026-06-20 when the
  # initial implementation (which read `.commit` directly) printed the
  # whole object instead of the SHA and the comparison never matched.
  live_sha=$(echo "${deploys_json}" | jq -r '
    (([.[] | (.deploy // .) | select(.status == "live")][0]) // {} | .commit // {}).id // ""
  ')

  if [ "${live_sha}" = "${EXPECTED_SHA}" ]; then
    echo "✓ Service ${SERVICE_ID} is live on ${EXPECTED_SHA} after ${elapsed}s"
    exit 0
  fi

  echo "Service ${SERVICE_ID} live SHA is '${live_sha:-<none>}', waiting for '${EXPECTED_SHA}' (${elapsed}s elapsed)..."
  sleep 10
  elapsed=$((elapsed + 10))
done

echo "✗ Service ${SERVICE_ID} did not reach live on ${EXPECTED_SHA} within ${timeout}s"

# A timeout is only benign when a *newer* deploy superseded this one — the
# fast-follow case the caller skips smoke for. Two states produce the same
# timeout while meaning the opposite, and both silently retire the gate:
# deploys have stopped entirely (autoDeploy off), or the live deploy is old
# enough that no supersede can explain it. Prod sat 51 commits behind for
# ~17h in exactly this shape, reporting green the whole time, because every
# run read its own timeout as the benign case.
service_json=$(curl --fail --silent --show-error \
  --connect-timeout 5 --max-time 15 \
  -H "${AUTH}" -H "Accept: application/json" \
  "${API}/services/${SERVICE_ID}") || service_json=""

auto_deploy=$(echo "${service_json}" | jq -r '.autoDeploy // "unknown"')
live_created=$(echo "${deploys_json}" | jq -r '
  (([.[] | (.deploy // .) | select(.status == "live")][0]) // {}).createdAt // ""
')

if [ "${auto_deploy}" = "no" ]; then
  echo "::error title=Deploys are disabled::${SERVICE_ID} has autoDeploy=no, so the pushed SHA can never go live and smoke can never run. Re-enable auto-deploy on the service."
  exit 125
fi

# 3600s: generous next to the ~2min prod deploy, so a genuine fast-follow
# streak stays benign, while a service that has stopped deploying trips it.
if [ -n "${live_created}" ]; then
  live_epoch=$(date -u -d "${live_created}" +%s 2>/dev/null \
    || date -u -jf "%Y-%m-%dT%H:%M:%S" "${live_created%%.*}" +%s 2>/dev/null \
    || echo "")
  now_epoch=$(date -u +%s)
  if [ -n "${live_epoch}" ] && [ "$((now_epoch - live_epoch))" -gt 3600 ]; then
    echo "::error title=Deploys appear stalled::${SERVICE_ID} is live on a deploy from ${live_created} (>1h old). A fast-follow supersede would leave a recent deploy, so this is not a benign skip."
    exit 125
  fi
fi

# Exit 124 = timeout (matches GNU timeout(1) convention). Distinct from
# the script's other non-zero exits (jq missing, missing env, curl
# failure, no live deploy found), all of which use exit 1, and from 125
# above, which means the timeout is real rather than a supersede. Callers
# that treat timeout as a benign-skip should key off this code
# explicitly — anything other than 0 or 124 indicates a real failure.
exit 124
