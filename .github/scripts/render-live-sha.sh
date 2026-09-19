#!/usr/bin/env bash
# Print the commit SHA a Render service is currently live on.
#
# Reads the most recent deploy with status `live`. Deliberately NOT the newest
# deploy of any status: a queued or failed build must not read as what prod is
# serving. Deactivated deploys are skipped for the same reason — and note that
# `finishedAt` on a deactivated deploy is when it was superseded, not when it
# built, so never do duration arithmetic on those rows.
set -euo pipefail

service_id="${1:?usage: render-live-sha.sh <service-id>}"
: "${RENDER_API_TOKEN:?RENDER_API_TOKEN must be set}"

response=$(curl -sS --fail-with-body \
  -H "Authorization: Bearer $RENDER_API_TOKEN" \
  -H 'Accept: application/json' \
  "https://api.render.com/v1/services/${service_id}/deploys?limit=20")

# `(.deploy // .)` is not optional politeness: some Render deploy endpoints wrap
# the object as `{ "deploy": { ... } }` and some return it flat. All four
# existing render-*.sh scripts normalize this way for that reason. A filter that
# only matches the wrapped shape silently yields empty on the flat one, and the
# drift alert then reports "No live deploy found" forever instead of measuring
# drift — a monitor that cannot fail loudly is worse than none.
sha=$(echo "$response" \
  | jq -r 'first(.[] | (.deploy // .) | select(.status == "live") | .commit.id) // empty')

if [ -z "$sha" ]; then
  echo "No live deploy found for $service_id in the last 20 deploys" >&2
  exit 1
fi

echo "$sha"
