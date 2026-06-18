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

# Render typically marks exactly ONE deploy as "live" at a time — the one
# currently serving traffic. Previously-live deploys get marked
# "deactivated" when a newer deploy goes live. The rollback target is the
# most recently finished `live`-or-`deactivated` deploy whose ID is NOT
# the current live deploy.
#
# Item shape varies across Render API versions: some endpoints wrap
# entries as `{deploy: {...}}`, others return the deploy object flat.
# `(.deploy // .)` accepts both.
#
# jq strategy:
#   1. Identify the current live deploy ID (status == "live")
#   2. Keep deploys with status in {live, deactivated} — both are "succeeded
#      and served traffic" so either is a safe rollback target
#   3. Sort by finishedAt descending (newest first)
#   4. Drop the current live deploy and pick the next one
target_deploy_id=$(echo "${deploys_json}" | jq -r '
  . as $all
  | ([$all[] | (.deploy // .) | select(.status == "live")][0].id // "") as $live_id
  | [$all[] | (.deploy // .)
     | select(.status == "live" or .status == "deactivated")]
  | sort_by(.finishedAt) | reverse
  | map(select(.id != $live_id))
  | .[0].id // empty
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

# Render returns the new deploy as the response body. Some endpoints in
# their API wrap deploy objects under a `deploy` key, others return them
# at the root; accept either shape so a non-fatal response wrapper doesn't
# falsely fail the rollback after the API has already committed it.
new_deploy_id=$(echo "${rollback_response}" | jq -r '.id // .deploy.id // empty')

if [ -z "${new_deploy_id}" ]; then
  echo "✗ Rollback request did not return a new deploy ID. Response:"
  echo "${rollback_response}"
  exit 1
fi

echo "✓ ${NAME} rollback initiated as deploy ${new_deploy_id}"
