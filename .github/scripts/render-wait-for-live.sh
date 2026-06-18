#!/usr/bin/env bash
# render-wait-for-live.sh — wait for a Render service's deploy of a
# specific commit SHA to reach `live` status.
#
# Usage: render-wait-for-live.sh <service-id> <expected-sha>
#
# Required env:
#   RENDER_API_TOKEN — Render API token with read permission on deploys.
#
# Polls every 10s up to 10 minutes. Exits 0 when the service's currently-
# live deploy matches the expected SHA; exits 1 on timeout or any error.
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

timeout=600
elapsed=0

echo "→ Waiting for service ${SERVICE_ID} to be live on ${EXPECTED_SHA} (up to ${timeout}s)"

while [ "${elapsed}" -lt "${timeout}" ]; do
  deploys_json=$(curl --fail --silent --show-error \
    --connect-timeout 5 --max-time 15 \
    -H "${AUTH}" \
    -H "Accept: application/json" \
    "${API}/services/${SERVICE_ID}/deploys?limit=5")

  # Item shape varies across Render API versions: some endpoints wrap
  # entries as `{deploy: {...}}`, others return the deploy object flat.
  # `(.deploy // .)` accepts both.
  live_sha=$(echo "${deploys_json}" | jq -r '
    [.[] | (.deploy // .) | select(.status == "live")][0].commit // ""
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
exit 1
