#!/usr/bin/env bash
# render-rollback.sh — roll a Render service back to its most recent prior
# successful deploy (status `live` or `deactivated`).
#
# Usage: render-rollback.sh <service-id> <human-name>
#   <service-id> — Render service ID. Prefix decides behavior:
#                    srv-* → web service, rollback via /rollback endpoint
#                    crn-* → cron job, SKIPPED with warning (Render's
#                            /rollback endpoint returns HTTP 400 for crons;
#                            no API path exists for cron rollback)
#   <human-name> — display name for log lines (e.g. concert-crawl-api)
#
# Required env:
#   RENDER_API_TOKEN — Render personal API token with deploy permissions
#
# Exits non-zero on any failure so the calling workflow fails loud, EXCEPT
# for the cron-service skip path which exits 0 (the calling workflow must
# continue to roll back the other services).

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

# Validate the service ID prefix is one of the two known forms.
# Mirrors render-trigger-deploy.sh — a mis-copied ID, whitespace, or
# future Render service type would otherwise surface as an opaque
# Render API error after several script steps. Fail here instead with
# a message that points at the misconfig.
if [[ "${SERVICE_ID}" == crn-* ]]; then
  # Render's /rollback endpoint returns HTTP 400 for cron jobs — there
  # is no API path to roll a cron back to a specific prior deploy.
  # Skip rather than fail: the caller (deploy-prod.yml's rollback job)
  # rolls back three services serially, and failing here would stop the
  # workflow from rolling back the others. Exit 0 with a loud warning
  # so the operator knows manual action is needed for this service.
  echo "⚠ ${NAME} (${SERVICE_ID}) is a Render cron job."
  echo "  The Render API's /rollback endpoint rejects cron services"
  echo "  (HTTP 400) — no API path exists for cron rollback."
  echo "  Skipping automatic rollback for this service. If the cron's"
  echo "  current code is bad, roll back manually via:"
  echo "    Render dashboard → ${NAME} → Settings → Manual Deploy →"
  echo "    pick a prior commit from the dropdown"
  echo "  Or revert the offending commit on main and let CI redeploy."
  exit 0
fi

if [[ "${SERVICE_ID}" != srv-* ]]; then
  echo "✗ Unrecognized Render service ID prefix: '${SERVICE_ID}'"
  echo "  Expected srv-* (web service) or crn-* (cron job)."
  echo "  Check for typos or whitespace in the RENDER_SERVICE_ID_* variable."
  exit 1
fi

API="https://api.render.com/v1"
AUTH="Authorization: Bearer ${RENDER_API_TOKEN}"

echo "→ Looking up recent deploys for ${NAME} (${SERVICE_ID})"

# Pull the 50 most recent deploys, newest first. 50 is enough to absorb
# a realistic streak of failed deploys while still finding the last
# good one; 20 felt tight given we also walk past the current live
# deploy and any same-commit anchor. Render returns an array of
# { deploy: { id, status, commit, createdAt, finishedAt } } objects.
deploys_json=$(curl --fail --silent --show-error \
  --connect-timeout 5 --max-time 15 \
  -H "${AUTH}" \
  -H "Accept: application/json" \
  "${API}/services/${SERVICE_ID}/deploys?limit=50")

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
  # Default $live to {} so the property accessors below do not crash
  # with "Cannot index null" if Render returns no live deploy (e.g.,
  # newly created service, paused service, or API shape change). With
  # an empty $live, the *_id, *_commit, *_finished vars are all "",
  # which makes $anchor empty and we bail cleanly via the empty branch.
  | (([$all[] | (.deploy // .) | select(.status == "live")][0]) // {}) as $live
  | ($live.id // "")        as $live_id
  # `.commit` is an OBJECT {id, message, createdAt}, not a string —
  # confirmed live against the Render API on 2026-06-20. Read by
  # `.commit.id` here and below. Default `.commit` to `{}` first so
  # the `.id` access stays graceful even on jq versions that throw on
  # null indexing.
  | (($live.commit // {}).id // "")    as $live_commit
  | ($live.finishedAt // "") as $live_finished
  # prior_match: only consider deploys that actually succeeded — a
  # `build_failed` deploy of the same commit should not act as an anchor.
  # Require finishedAt to be present so a comparison against $anchor below
  # is well-defined. Default `.commit` to `{}` for the same reason as above.
  | ([$all[] | (.deploy // .)
       | select(.id != $live_id
                and (.commit // {}).id == $live_commit
                and (.status == "live" or .status == "deactivated")
                and (.finishedAt // "") != "")]
     | sort_by(.finishedAt) | .[0]) as $prior_match
  | (if $prior_match then $prior_match.finishedAt else $live_finished end) as $anchor
  # If we have no anchor at all (no live deploy yet, or live deploy lacks
  # a finishedAt for some reason), bail rather than emit a malformed
  # comparison.
  | if $anchor == "" then empty else
      [$all[] | (.deploy // .)
       | select(.status == "live" or .status == "deactivated")
       | select((.finishedAt // "") != "")
       | select(.id != $live_id and .finishedAt < $anchor)]
      | sort_by(.finishedAt) | reverse
      | .[0].id // empty
    end
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
  --connect-timeout 5 --max-time 30 \
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
