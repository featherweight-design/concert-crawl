#!/usr/bin/env bash
# vercel-web-crons-health.sh: is Cron Jobs switched on for the prod web
# project? Its one cron is the keep-warm ping (`apps/web/vercel.json`,
# */5 → /api/warm). Cron Jobs are a project-level switch, and one that is off
# stops the ping without any error anywhere. vercel-api-prod.sh checks the
# same switch on the API project.
#
# Usage: vercel-web-crons-health.sh <project-id-or-name>
#
# Exit 0 when crons are on, 2 (with an `UNHEALTHY|web-crons|<reason>` line)
# when they are off, 1 when the check could not run. Same contract as
# crawler-daily-health.sh.
#
# Required env: VERCEL_TOKEN, VERCEL_ORG_ID.

set -euo pipefail

command -v jq >/dev/null 2>&1 || {
  echo "✗ jq is required but not installed on this runner" >&2
  exit 1
}

project="${1:?usage: vercel-web-crons-health.sh <project-id-or-name>}"
: "${VERCEL_TOKEN:?VERCEL_TOKEN must be set}"
: "${VERCEL_ORG_ID:?VERCEL_ORG_ID must be set}"

# An ID (prj_…) or a project name; anchored so stray whitespace fails here
# rather than as an opaque 404.
if ! [[ "${project}" =~ ^[A-Za-z0-9_-]+$ ]]; then
  echo "✗ Unrecognized Vercel project ID or name: '${project}'" >&2
  exit 1
fi

if ! body=$(curl -sS --fail-with-body \
  --connect-timeout 5 --max-time 15 \
  -H "Authorization: Bearer ${VERCEL_TOKEN}" \
  -H 'Accept: application/json' \
  "https://api.vercel.com/v9/projects/${project}?teamId=${VERCEL_ORG_ID}"); then
  echo "✗ Vercel rejected GET /v9/projects/${project}:" >&2
  printf '%s\n' "${body:0:500}" >&2
  exit 1
fi

crons_off=$(echo "${body}" | jq -r '
  (.crons // {}) as $c
  | if ($c.disabledAt // 0) > ($c.enabledAt // 0) then "yes" else "no" end')

if [ "${crons_off}" = "yes" ]; then
  echo "UNHEALTHY|web-crons|Cron Jobs are disabled on the web project (${project}), so the keep-warm ping to /api/warm is not running. Re-enable them under Settings → Cron Jobs."
  exit 2
fi

echo "✓ web project ${project}: crons enabled"
