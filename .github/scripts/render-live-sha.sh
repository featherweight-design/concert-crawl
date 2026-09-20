#!/usr/bin/env bash
# Print the commit SHA a Render service is currently live on.
#
# Reads the most recent deploy with status `live`. Deliberately NOT the newest
# deploy of any status: a queued or failed build must not read as what prod is
# serving. Deactivated deploys are skipped for the same reason — and note that
# `finishedAt` on a deactivated deploy is when it was superseded, not when it
# built, so never do duration arithmetic on those rows.
set -euo pipefail

command -v jq >/dev/null 2>&1 || {
  echo "✗ jq is required but not installed on this runner" >&2
  exit 1
}

service_id="${1:?usage: render-live-sha.sh <service-id>}"
: "${RENDER_API_TOKEN:?RENDER_API_TOKEN must be set}"

# limit=50 matches render-wait-for-live.sh and render-rollback.sh, and for the
# same reason: a streak of failed or in-progress deploys after the last
# successful one can push the currently-`live` deploy off a shorter page. The
# 2026-08-29 incident produced ~6 failed deploys on one service in an afternoon,
# and this script is read precisely during stalls like that — a page size that
# runs out at the moment drift is largest reports no live deploy instead of a
# large number.
# --connect-timeout/--max-time match the four sibling render-*.sh scripts. This
# read is dispatched by a monitor whose job is to report promptly: without a
# bound, a stalled Render endpoint hangs until the 10-minute job timeout and the
# measurement-failure alert arrives ten minutes late instead of fifteen seconds
# late, while holding a runner the whole time.
response=$(curl -sS --fail-with-body \
  --connect-timeout 5 --max-time 15 \
  -H "Authorization: Bearer $RENDER_API_TOKEN" \
  -H 'Accept: application/json' \
  "https://api.render.com/v1/services/${service_id}/deploys?limit=50")

# `(.deploy // .)` is not optional politeness: some Render deploy endpoints wrap
# the object as `{ "deploy": { ... } }` and some return it flat. All four
# existing render-*.sh scripts normalize this way for that reason. A filter that
# only matches the wrapped shape silently yields empty on the flat one, and the
# drift alert then reports "No live deploy found" forever instead of measuring
# drift — a monitor that cannot fail loudly is worse than none.
#
# `(.commit // {}).id` guards the same way the sibling scripts do. A deploy row
# whose `commit` is null or absent makes a bare `.commit.id` abort the entire
# filter with "Cannot index null", so one malformed row takes out a read that a
# live deploy further down the page would have satisfied. The trailing
# non-empty check keeps a commit object present but id-less from yielding "".
#
# The shape is checked before the filter runs. `.[]` against an error object
# aborts under `set -euo pipefail` with jq's own message and nothing about which
# service or what came back, so an API shape change or an unexpected error body
# would surface as an unexplained non-zero exit in a monitor whose entire job is
# to explain itself.
if ! echo "$response" | jq -e 'type == "array"' >/dev/null 2>&1; then
  echo "✗ Render returned an unexpected shape for $service_id (expected an array of deploys):" >&2
  # Truncated with parameter expansion rather than `| head -c 500`: head
  # closes the pipe at 500 bytes, the writer takes SIGPIPE, and under
  # `set -euo pipefail` that aborts the script at 141 before it can print the
  # trailing newline or reach the `exit 1` below. An error path whose own exit
  # code depends on how long the response was is not an error path.
  printf '%s\n' "${response:0:500}" >&2
  exit 1
fi

sha=$(echo "$response" \
  | jq -r '[
      .[]
      | (.deploy // .)
      | select(type == "object" and .status == "live")
      | (.commit // {}).id
      | select(type == "string" and . != "")
    ] | (.[0] // "")')

if [ -z "$sha" ]; then
  echo "No live deploy found for $service_id in the last 50 deploys" >&2
  exit 1
fi

echo "$sha"
