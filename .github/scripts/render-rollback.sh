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

# Fail fast with a clear message if jq is missing — easier to diagnose
# than a `jq: command not found` mid-script. GitHub-hosted runners ship
# with jq, but a self-hosted runner might not.
command -v jq >/dev/null 2>&1 || {
  echo "✗ jq is required but not installed on this runner"
  exit 1
}

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
# the current live one — with one important guard.
#
# Re-rollback guard: if the current live deploy is itself the result of a
# prior rollback (i.e., there's an earlier deploy with the SAME commit
# SHA), naively picking "most-recent prior deactivated" would land on the
# deploy we already rolled away from — rolling FORWARD onto the bad
# commit. To prevent that, anchor on the *oldest* (= the original) deploy
# of the current live's commit (when present) and only consider targets
# strictly OLDER than that anchor. Picking the oldest matters when the
# same commit has been redeployed multiple times (rollback → rollback);
# anchoring on a later redeploy could still let through an intermediate
# bad deploy between the original and the redeploy. For a normal
# first-time rollback there is no earlier matching commit, and we fall
# back to the current live's finishedAt as the anchor — preserving the
# simple "pick the prior one" behavior.
#
# Item shape varies across Render API versions: some endpoints wrap
# entries as `{deploy: {...}}`, others return the deploy object flat.
# `(.deploy // .)` accepts both.
target_deploy_id=$(echo "${deploys_json}" | jq -r '
  . as $all
  | ([$all[] | (.deploy // .) | select(.status == "live")][0]) as $live
  | ($live.id // "")        as $live_id
  | ($live.commit // "")    as $live_commit
  | ($live.finishedAt // "") as $live_finished
  | ([$all[] | (.deploy // .)
       | select(.id != $live_id and .commit == $live_commit)]
     | sort_by(.finishedAt) | .[0]) as $prior_match
  | (if $prior_match then $prior_match.finishedAt else $live_finished end) as $anchor
  | [$all[] | (.deploy // .)
     | select(.status == "live" or .status == "deactivated")
     | select(.id != $live_id and .finishedAt < $anchor)]
  | sort_by(.finishedAt) | reverse
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
