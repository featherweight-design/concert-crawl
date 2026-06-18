#!/usr/bin/env bash
# render-rollback.sh — roll a Render service back to its most recent prior
# successful ("live") deploy.
#
# Usage: render-rollback.sh <service-id> <human-name>
#
# Required env:
#   RENDER_API_TOKEN — Render personal API token with deploy permissions
#
# Exits non-zero on any failure so the calling workflow fails loud.

set -euo pipefail

SERVICE_ID="${1:?service id required}"
NAME="${2:?human name required}"

: "${RENDER_API_TOKEN:?RENDER_API_TOKEN must be set}"

API="https://api.render.com/v1"
AUTH="Authorization: Bearer ${RENDER_API_TOKEN}"

echo "→ Looking up recent deploys for ${NAME} (${SERVICE_ID})"

# Pull the 20 most recent deploys, newest first. Render returns an array of
# { deploy: { id, status, commit, createdAt, finishedAt } } objects.
deploys_json=$(curl --fail --silent --show-error \
  -H "${AUTH}" \
  -H "Accept: application/json" \
  "${API}/services/${SERVICE_ID}/deploys?limit=20")

# Find the most recent live deploy that is NOT the current one. "live" is
# Render's term for the deploy currently serving traffic. We want the one
# before that.
#
# jq strategy:
#   1. unwrap the {deploy:{...}} wrapper
#   2. keep only successful deploys (status == "live")
#   3. sort by finishedAt descending (newest first)
#   4. take the second entry — index 0 is current, index 1 is prior
target_deploy_id=$(echo "${deploys_json}" | jq -r '
  [.[] | .deploy | select(.status == "live")]
  | sort_by(.finishedAt) | reverse
  | .[1].id // empty
')

if [ -z "${target_deploy_id}" ]; then
  echo "✗ No prior successful deploy found for ${NAME}. Cannot roll back automatically."
  echo "  Check the Render dashboard and roll back manually if needed."
  exit 1
fi

echo "→ Rolling ${NAME} back to deploy ${target_deploy_id}"

# POST the rollback. Render returns 201 with the new deploy object on
# success, 4xx on validation error.
rollback_response=$(curl --fail --silent --show-error \
  -X POST \
  -H "${AUTH}" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d "{\"deployId\":\"${target_deploy_id}\"}" \
  "${API}/services/${SERVICE_ID}/rollback")

new_deploy_id=$(echo "${rollback_response}" | jq -r '.id // empty')

if [ -z "${new_deploy_id}" ]; then
  echo "✗ Rollback request did not return a new deploy ID. Response:"
  echo "${rollback_response}"
  exit 1
fi

echo "✓ ${NAME} rollback initiated as deploy ${new_deploy_id}"
