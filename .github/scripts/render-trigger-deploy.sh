#!/usr/bin/env bash
# render-trigger-deploy.sh — trigger a Render deploy via the API,
# pinning it to a specific commit SHA.
#
# Usage: render-trigger-deploy.sh <service-id> <commit-sha> <label>
#   <service-id> — Render service ID (e.g. srv-abc123)
#   <commit-sha> — full git SHA Render should build
#   <label>      — human-readable label for the log line (e.g. "API",
#                  "Crawler-daily"); only affects the success-log text.
#
# Required env:
#   RENDER_API_TOKEN — Render API token with deploy permission.
#
# Exits 0 on a successful enqueue (Render returned 2xx). Exits 1 on
# any HTTP failure, with Render's JSON error body printed to the log
# so the operator sees the actual reason instead of just a curl exit
# code.
#
# Why this script exists: the same curl + JSON-body + log-deploy-id
# pattern was repeated for staging API + 3 prod services (the prod
# API web service + 2 crawler crons). The user-facing website is
# on Vercel and is not covered by this script. Centralizing here
# removes the drift risk (one place to add a header, retry, timeout,
# etc.) and lets us handle jq parse failure in one place — a non-JSON
# Render response on a successful enqueue would otherwise fail the
# workflow step even though the deploy went through, leaving the
# pipeline lying about deploy state.

set -euo pipefail

command -v jq >/dev/null 2>&1 || {
  echo "✗ jq is required but not installed on this runner"
  exit 1
}

SERVICE_ID="${1:?service id required}"
COMMIT_SHA="${2:?commit sha required}"
LABEL="${3:?label required}"

if [ -z "${RENDER_API_TOKEN:-}" ]; then
  echo "✗ RENDER_API_TOKEN env var is not set"
  exit 1
fi

# `--fail-with-body` writes the API error body to stdout on failure
# (vs `--fail` which suppresses it). Bounded timeouts prevent a
# stalled Render endpoint from hanging the workflow indefinitely.
# Capture in `response` so we can print the body on failure AND
# extract the deploy id on success.
if ! response=$(curl --fail-with-body --silent --show-error \
  --connect-timeout 10 --max-time 30 \
  -X POST "https://api.render.com/v1/services/${SERVICE_ID}/deploys" \
  -H "Authorization: Bearer ${RENDER_API_TOKEN}" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d "{\"commitId\":\"${COMMIT_SHA}\"}"); then
  echo "✗ Render API deploy POST failed for ${LABEL} (service ${SERVICE_ID}). Response body:"
  echo "${response}"
  exit 1
fi

# Extract deploy id for forensics. Allow this to fail without failing
# the step — if Render ever returns a non-JSON body on a successful
# enqueue (or changes the response shape), we still want the workflow
# to succeed because the deploy itself was accepted (2xx). `2>/dev/null`
# suppresses jq's parse error text; `|| echo` provides a fallback for
# the variable.
#
# `(.deploy // .)` handles both response shapes that exist across
# Render endpoints: some wrap the deploy object in `.deploy`
# (render-wait-for-live.sh has the same defensive unwrap), others
# return it flat. The POST deploy endpoint currently returns flat,
# but matching the pattern keeps us robust to future API changes.
# The trailing `// "<no id>"` jq filter handles the missing-field
# case within otherwise-valid JSON.
deploy_id=$(echo "${response}" | jq -r '(.deploy // .).id // "<no id in response>"' 2>/dev/null || echo "<jq parse failed>")

echo "${LABEL} deploy enqueued: id=${deploy_id} service=${SERVICE_ID} commit=${COMMIT_SHA}"
