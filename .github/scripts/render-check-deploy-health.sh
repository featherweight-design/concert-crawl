#!/usr/bin/env bash
# render-check-deploy-health.sh — answer "is this Render service still
# able to take the code we ship it, and only the way we mean to ship it?"
# for one service.
#
# Usage: render-check-deploy-health.sh <service-id> <service-name>
#
# Required env:
#   RENDER_API_TOKEN — Render API token with read permission on services
#                      and deploys.
#
# Exit codes:
#   0 — healthy
#   2 — unhealthy; a human needs to look. Details are on stdout and as a
#       GitHub Actions error annotation.
#   1 — could not determine (missing dep, missing env, API failure).
#       Distinct from 2 so the caller can tell "prod is broken" from
#       "the check is broken" — they need different responses.
#
# Why this exists, and why it does NOT compare against main's HEAD:
#
# On 2026-08-29 the Render account ran out of build minutes. Every
# auto-deploy across all six active services came back `build_failed`
# in under 1.5 seconds — Render declining to start a build. Prod kept
# serving the last good commit and quietly drifted five commits behind
# main. Nothing alerted, because nothing was down. The post-deploy
# reconciler did fail (exit 125), but a failed Actions run is an email.
#
# The obvious detector is "live SHA != origin/main HEAD". That breaks
# the moment build filters land: a filtered service is *supposed* to sit
# behind main whenever recent commits do not touch its paths, so SHA
# drift stops being evidence of anything. Encoding each service's
# filter here would duplicate config that lives in Render and drift
# from it.
#
# So this asks Render about Render instead. Two conditions, both
# independent of how far behind main a service legitimately is:
#
#   1. The service is suspended, or auto-deploy was re-enabled behind
#      the promotion gate.
#   2. The newest deploy attempt failed, and nothing has gone live
#      since. This is the exact shape of the incident.
#
# Both mean "the code we ship is not reaching prod the way the gate
# says it should," which is the actual thing worth waking up for.
#
# What this does NOT answer is "is prod current?" — under the promotion
# gate prod is deliberately behind main until somebody dispatches
# deploy-prod.yml, so staleness is measured separately by
# prod-drift-alert.yml. Do not reintroduce a HEAD comparison here.

set -euo pipefail

command -v jq >/dev/null 2>&1 || {
  echo "✗ jq is required but not installed on this runner" >&2
  exit 1
}

SERVICE_ID="${1:?service id required}"
SERVICE_NAME="${2:?service name required}"

: "${RENDER_API_TOKEN:?RENDER_API_TOKEN must be set}"

API="https://api.render.com/v1"
AUTH="Authorization: Bearer ${RENDER_API_TOKEN}"

fail_check() {
  echo "::error title=Deploy-health check failed::${SERVICE_NAME} (${SERVICE_ID}): $1"
  exit 1
}

report_unhealthy() {
  echo "::error title=Prod deploys not landing::${SERVICE_NAME} (${SERVICE_ID}): $1"
  echo "UNHEALTHY|${SERVICE_NAME}|$1"
  exit 2
}

if ! service_json=$(curl --fail --silent --show-error \
  --connect-timeout 5 --max-time 15 \
  -H "${AUTH}" -H "Accept: application/json" \
  "${API}/services/${SERVICE_ID}"); then
  fail_check "could not fetch service metadata. Check RENDER_API_TOKEN scope and Render API status."
fi

suspended=$(echo "${service_json}" | jq -r '.suspended // "unknown"')
auto_deploy=$(echo "${service_json}" | jq -r '.autoDeploy // "unknown"')

if [ "${suspended}" = "suspended" ]; then
  report_unhealthy "the service is suspended, so merged code cannot reach it."
fi

# Under the promotion gate (2026-09-01) prod services deploy ONLY through
# deploy-prod.yml, so autoDeploy="no" is the correct state and alerting on it
# would make this monitor five false alarms per run. The fault is now the
# opposite: "yes" means somebody re-enabled auto-deploy in the dashboard and
# merges are reaching prod without a promotion — the gate has leaked.
if [ "${auto_deploy}" = "yes" ]; then
  report_unhealthy "autoDeploy is 'yes', but prod is promotion-gated — merges are reaching prod without a promotion. Set it back to 'no' (see docs/runbooks/auto-deploy-prod.md)."
fi

if [ "${auto_deploy}" != "no" ]; then
  fail_check "autoDeploy read as '${auto_deploy}', which is neither 'yes' nor 'no'. Check whether the Render API response shape changed."
fi

# limit=20 comfortably spans a bad streak. The incident produced ~6
# failures per service across an afternoon.
if ! deploys_json=$(curl --fail --silent --show-error \
  --connect-timeout 5 --max-time 15 \
  -H "${AUTH}" -H "Accept: application/json" \
  "${API}/services/${SERVICE_ID}/deploys?limit=20"); then
  fail_check "could not fetch deploy history. Check RENDER_API_TOKEN scope and Render API status."
fi

# Item shape varies across Render API versions: some endpoints wrap
# entries as `{deploy: {...}}`, others return the deploy object flat.
# `(.deploy // .)` accepts both — same normalization as
# render-wait-for-live.sh and render-rollback.sh.
#
# `try/catch` and the `select` matter under `set -e`: if Render returns a
# 200 whose body is not the array of objects we expect, a bare `.[]` aborts
# the script with a raw jq error, losing the fail_check message below that
# exists precisely to name a response-shape change. Falling through to `{}`
# routes the surprise onto the controlled path.
newest=$(echo "${deploys_json}" |
  jq -r '[try (.[] | (.deploy // .)) catch empty | select(type == "object")][0] // {}' ||
  echo '{}')
newest_status=$(echo "${newest}" | jq -r '.status // ""')
newest_created=$(echo "${newest}" | jq -r '.createdAt // ""')
newest_sha=$(echo "${newest}" | jq -r '(.commit // {}).id // ""')

if [ -z "${newest_status}" ]; then
  fail_check "deploy history returned no usable entries. Check whether the Render API response shape changed."
fi

# Terminal failure statuses. `deactivated` is deliberately absent: it
# marks a build that succeeded and was later superseded, which is the
# normal end state for every deploy but the current one.
case "${newest_status}" in
  build_failed | update_failed | canceled | pre_deploy_failed)
    # A failure only matters if nothing recovered after it. Render
    # returns deploys newest-first, so index 0 being a failure already
    # means no later deploy exists at all.
    report_unhealthy "the most recent deploy (${newest_sha:0:9}, ${newest_created}) ended in '${newest_status}' and nothing has deployed since. Promoted code is not reaching this service."
    ;;
esac

echo "✓ ${SERVICE_NAME}: autoDeploy=${auto_deploy} (promotion-gated), newest deploy ${newest_sha:0:9} is '${newest_status}'"
exit 0
