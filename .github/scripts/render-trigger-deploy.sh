#!/usr/bin/env bash
# render-trigger-deploy.sh — trigger a Render deploy via the API.
#
# For Web Services (srv-*), pins the deploy to the given commit SHA
# via the `commitId` body parameter. For Cron Jobs (crn-*), Render's
# API rejects commitId ("cannot deploy cron job service by commit
# reference ID", HTTP 400), so we omit it and let Render build branch
# HEAD. The commit SHA is still logged for traceability.
#
# Usage: render-trigger-deploy.sh <service-id> <commit-sha> <label>
#   <service-id> — Render service ID. Prefix decides behavior:
#                    srv-* → web service, deploy is pinned to commit-sha
#                    crn-* → cron job, deploy is branch-HEAD (unpinned)
#   <commit-sha> — full git SHA Render should build (web services only;
#                  logged but not sent for crons)
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
# etc.) and lets us handle jq parse failure + the cron-vs-web
# commitId divergence in one place — a non-JSON Render response on a
# successful enqueue would otherwise fail the workflow step even
# though the deploy went through, leaving the pipeline lying about
# deploy state.
#
# Trade-off accepted by omitting commitId for crons: a fast-follow
# merge between staging-smoke and this deploy POST could land newer
# (un-smoked) code on the cron service. Crons don't serve HTTP
# traffic and self-heal at the next scheduled run, so the blast
# radius is one missed crawl window at worst, not a user-facing
# outage. Pinning is preferred where the API supports it.

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

# Normalize COMMIT_SHA to lowercase. github.event.workflow_run.head_sha
# and github.sha both produce lowercase, but git SHAs are technically
# case-insensitive (`A` and `a` are the same commit), so accept either
# form from manual callers without false-failing.
#
# Use `printf '%s'` rather than `echo` — some echo implementations
# treat values beginning with `-` as options (e.g. `-n`, `-e`) and
# eat them or change behavior. printf has no option-parsing ambiguity
# for the value passed to %s.
COMMIT_SHA=$(printf '%s' "${COMMIT_SHA}" | tr 'A-F' 'a-f')

# Validate the normalized shape — full 40-char hex. If a caller ever
# passes whitespace, a short SHA, or branch-name junk, the curl below
# would fail with an opaque Render error (or worse, produce malformed
# JSON). Catch it here with a clear message.
if ! [[ "${COMMIT_SHA}" =~ ^[0-9a-f]{40}$ ]]; then
  echo "✗ COMMIT_SHA must be a 40-character hex git SHA"
  echo "  got: '${COMMIT_SHA}'"
  exit 1
fi

# Decide whether to pin the deploy to a specific commit. Render's
# API supports `commitId` for Web Services but rejects it for Cron
# Jobs with HTTP 400 ("cannot deploy cron job service by commit
# reference ID"). The ID prefix is the reliable signal — Render's
# IDs are stable (`srv-*` for web services, `crn-*` for crons).
#
# Validate the prefix explicitly rather than treating "anything not
# crn-*" as a web service. A mis-copied service ID, leading/trailing
# whitespace, or a future Render service type would otherwise hit
# the API with commitId pinned and fail with an opaque error.
# Failing here points the operator straight at the misconfig.
#
# Use regex (`=~ ^...$`) not glob (`== crn-*`) — a glob accepts
# trailing whitespace ("crn-abc " matches `crn-*`), which would
# silently take the cron path and mask the misconfig. Render IDs are
# `^(srv|crn)-[a-z0-9]+$` in practice (lowercase base32-ish), so
# anchor strictly.
if [[ "${SERVICE_ID}" =~ ^crn-[a-z0-9]+$ ]]; then
  body="{}"
  # No parens inside pin_status — the log line below wraps it with
  # parens, and nesting hurts log scannability during incidents.
  pin_status="unpinned — Render API does not support commitId for cron jobs"
  commit_log_field="gated_commit"
elif [[ "${SERVICE_ID}" =~ ^srv-[a-z0-9]+$ ]]; then
  # Build the JSON body via jq rather than string interpolation. jq
  # is already a hard dependency above (used for response parsing),
  # and `--arg` properly escapes the value — defensive against any
  # COMMIT_SHA shape the regex above might miss in the future.
  body=$(jq -nc --arg sha "${COMMIT_SHA}" '{commitId: $sha}')
  pin_status="pinned"
  commit_log_field="commit"
else
  echo "✗ Unrecognized or malformed Render service ID: '${SERVICE_ID}'"
  echo "  Expected srv-* (web service) or crn-* (cron job), with only"
  echo "  lowercase alphanumerics after the prefix and no whitespace."
  echo "  Check for typos or whitespace in the RENDER_SERVICE_ID_* variable."
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
  -d "${body}"); then
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

# Use distinct field names so the log is unambiguous during incident
# forensics: `commit=` for web services means "what Render will
# build"; `gated_commit=` for crons means "what the pipeline gated
# on, not what Render builds" — Render builds branch HEAD when
# commitId is omitted.
echo "${LABEL} deploy enqueued: id=${deploy_id} service=${SERVICE_ID} ${commit_log_field}=${COMMIT_SHA} (${pin_status})"
