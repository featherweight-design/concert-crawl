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
#   124 — timeout with a positively-established benign explanation
#         (matches GNU timeout(1) convention; new caller behavior:
#         prod-smoke-after-deploy.yml treats this as benign-skip).
#         Two such explanations, both requiring autoDeploy=yes:
#         a newer deploy plausibly superseded this one (live deploy
#         under an hour old), or Render created no deploy for this SHA
#         at all because the service's buildFilter excluded the push.
#   125 — timeout that is NOT benign: the service is suspended, deploys
#         are disabled, the live deploy is over an hour old, or the
#         timeout could not be
#         classified (service metadata unreadable, autoDeploy absent or
#         unrecognized, live deploy timestamp missing or unparseable).
#         The pushed SHA will never go live on its own, so smoke and
#         rollback would be skipped forever. Callers must fail on this.
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
# If this lookup fails we cannot tell a supersede from a stall, and the
# benign reading is the one that hides an outage. Fail closed: an
# unclassifiable timeout is reported as non-benign, not waved through.
if ! service_json=$(curl --fail --silent --show-error \
  --connect-timeout 5 --max-time 15 \
  -H "${AUTH}" -H "Accept: application/json" \
  "${API}/services/${SERVICE_ID}"); then
  echo "::error title=Cannot classify timeout::Failed to fetch ${SERVICE_ID} metadata, so this timeout cannot be shown to be a benign supersede. Check RENDER_API_TOKEN scope and Render API status."
  exit 125
fi

# A suspended service keeps its old live deploy and can still report
# autoDeploy=yes, so it reaches the buildFilter branch below and is waved
# through as a benign skip — while actually serving nothing. Rule it out
# first, matching render-check-deploy-health.sh's ordering.
suspended=$(echo "${service_json}" | jq -r '.suspended // "unknown"')
if [ "${suspended}" = "suspended" ]; then
  echo "::error title=Service is suspended::${SERVICE_ID} is suspended, so the pushed SHA can never go live and nothing downstream was tested. Resume the service in Render."
  exit 125
fi

auto_deploy=$(echo "${service_json}" | jq -r '.autoDeploy // "unknown"')
live_created=$(echo "${deploys_json}" | jq -r '
  (([.[] | (.deploy // .) | select(.status == "live")][0]) // {}).createdAt // ""
')

if [ "${auto_deploy}" = "no" ]; then
  echo "::error title=Deploys are disabled::${SERVICE_ID} has autoDeploy=no, so the pushed SHA can never go live and smoke can never run. Re-enable auto-deploy on the service."
  exit 125
fi

# Anything other than a definite "yes" leaves the disabled-deploys case
# unruled-out, and that case is indistinguishable from a supersede at this
# point. Fail closed rather than reading an absent field as healthy.
if [ "${auto_deploy}" != "yes" ]; then
  echo "::error title=Cannot classify timeout::${SERVICE_ID} reported autoDeploy='${auto_deploy}', so this timeout cannot be shown to be a benign supersede. Check whether the Render API changed the field's name or shape."
  exit 125
fi

# No live deploy at all is a new, paused or broken service — not a filtered
# push. It must be ruled out before the buildFilter reading below, which would
# otherwise report a service that has never served anything as a benign skip.
# Also covers the case where a live deploy exists but carries no createdAt: the
# supersede reading cannot be established, and that reading is the one that
# hides an outage.
if [ -z "${live_created}" ]; then
  echo "::error title=Cannot classify timeout::${SERVICE_ID} has no live deploy with a usable createdAt, so this timeout cannot be shown to be a benign supersede. Check whether the service is new, suspended, or failing to build."
  exit 125
fi

# Distinguish "Render never created a deploy for this SHA" from "a deploy was
# created and then stalled". Every service here carries a buildFilter that
# excludes docs- and web-only pushes, so on those commits no API deploy is
# ever created and the live deploy legitimately stays on an older SHA — for
# as long as the quiet period lasts. That is a non-event, but the >1h
# stalled-deploy check below reads it as an outage and fails the caller red.
#
# Safe only *after* autoDeploy has been confirmed `yes` above: with autoDeploy
# off Render also creates no deploy, and that is precisely the 17h-freeze
# shape this classifier must never wave through.
# The three outcomes are read as three distinct values rather than off jq's
# exit status. `! jq -e` is true both when the SHA is absent and when jq
# itself fails, so a malformed or reshaped Render response would take the
# benign 124 branch below and every caller would report a clean skip without
# having tested anything — the exact fail-open this classifier exists for.
#
# Validating the ENTRIES, not only the top-level array, is the point. An
# array whose items no longer carry `.commit.id` yields a list of empty
# strings, `index($sha)` finds nothing, and the reshaped response reads as
# `absent` — a clean benign skip off a response this script could not read.
sha_index=$(echo "${deploys_json}" | jq -r --arg sha "${EXPECTED_SHA}" '
  if type != "array" or length == 0 then
    "malformed"
  else
    [.[] | (.deploy // .)] as $deploys
    | if [$deploys[] | select(type == "object" and ((.commit // {}).id // "") != "")] | length
         != ($deploys | length) then
        "malformed"
      else
        ([$deploys[] | .commit.id] | index($sha)) // "absent"
      end
  end
') || sha_index='malformed'

if [ "${sha_index}" = 'malformed' ] || [ -z "${sha_index}" ]; then
  echo "::error title=Cannot classify timeout::${SERVICE_ID} returned a deploy list this script could not read as a non-empty array of deploys each carrying a commit id, so it cannot tell a buildFilter-excluded push from a stalled deploy. Check whether the Render API changed its response shape."
  exit 125
fi

if [ "${sha_index}" = 'absent' ]; then
  echo "::notice title=No deploy for this SHA::${SERVICE_ID} has autoDeploy=yes but Render created no deploy for ${EXPECTED_SHA}, so its buildFilter excluded this push (docs- or web-only). There was never anything to wait for."
  exit 124
fi

# A deploy for the expected SHA does exist, so the `absent` reading above does
# not apply and the only remaining benign story is a supersede. Read that
# deploy's own status rather than inferring it from the live deploy's age: a
# build that failed, was cancelled, or is still grinding is the outage this
# classifier exists to catch, and behind a live deploy younger than an hour the
# age check below would wave every one of them through as benign.
#
# `deactivated` is the one status that genuinely means superseded — Render marks
# the older deploy deactivated when a newer one goes live. Everything else, and
# anything unrecognised, fails closed.
sha_status=$(echo "${deploys_json}" | jq -r --argjson idx "${sha_index}" '
  ([.[] | (.deploy // .)][$idx].status) // ""
') || sha_status=''

case "${sha_status}" in
  deactivated) ;;
  live)
    # The deploy went live between the loop's last poll and this read. The wait
    # succeeded, a few seconds late — reporting it as a timeout would be a false
    # red on a service that is serving exactly the code we asked for.
    echo "::notice title=Live just after the last poll::${SERVICE_ID} went live on ${EXPECTED_SHA} between the final poll and the timeout classification."
    exit 0
    ;;
  '')
    echo "::error title=Cannot classify timeout::${SERVICE_ID} has a deploy for ${EXPECTED_SHA} but this script could not read its status, so the timeout cannot be shown to be a benign supersede. Check whether the Render API changed its response shape."
    exit 125
    ;;
  *)
    echo "::error title=Deploy for this SHA did not go live::${SERVICE_ID} created a deploy for ${EXPECTED_SHA} but it is '${sha_status}', not live or superseded. Nothing downstream was tested against the pushed code."
    exit 125
    ;;
esac

# 3600s: generous next to the ~2min prod deploy, so a genuine fast-follow
# streak stays benign, while a service that has stopped deploying trips it.
# Render returns both `...:32Z` and `...:32.188265Z`. Strip the fraction
# if present, then the trailing Z, so the BSD form matches either shape —
# otherwise the stalled-deploy check silently no-ops on macOS.
live_naive="${live_created%%.*}"
live_naive="${live_naive%Z}"
live_epoch=$(date -u -d "${live_created}" +%s 2>/dev/null \
  || date -u -jf "%Y-%m-%dT%H:%M:%S" "${live_naive}" +%s 2>/dev/null \
  || echo "")

if [ -z "${live_epoch}" ]; then
  echo "::error title=Cannot classify timeout::${SERVICE_ID} returned an unparseable createdAt ('${live_created}') for its live deploy, so the stalled-deploy check could not run. Check whether Render changed its timestamp format."
  exit 125
fi

now_epoch=$(date -u +%s)
if [ "$((now_epoch - live_epoch))" -gt 3600 ]; then
  echo "::error title=Deploys appear stalled::${SERVICE_ID} is live on a deploy from ${live_created} (>1h old). A fast-follow supersede would leave a recent deploy, so this is not a benign skip."
  exit 125
fi

# Exit 124 = timeout (matches GNU timeout(1) convention). Distinct from
# the script's other non-zero exits (jq missing, missing env, curl
# failure, no live deploy found), all of which use exit 1, and from 125
# above, which means the timeout is real rather than a supersede. Callers
# that treat timeout as a benign-skip should key off this code
# explicitly — anything other than 0 or 124 indicates a real failure.
exit 124
