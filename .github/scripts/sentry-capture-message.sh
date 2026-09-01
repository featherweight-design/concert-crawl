#!/usr/bin/env bash
# sentry-capture-message.sh — send one message event to Sentry from a
# workflow step, without needing a Node runtime or the Sentry CLI.
#
# Usage: sentry-capture-message.sh <level> <message>
#
#   <level>   Sentry level: fatal | error | warning | info | debug
#   <message> Event message. Also the grouping key, so keep it stable
#             across runs — put the varying detail in EXTRA_CONTEXT.
#
# Required env:
#   SENTRY_DSN — standard DSN, https://<key>@<host>/<project-id>
#
# Optional env:
#   SENTRY_ENVIRONMENT — defaults to `production`
#   EXTRA_CONTEXT      — free text attached as the `detail` extra
#
# Exit codes:
#   0 — event accepted by Sentry, or reporting was skipped because no
#       DSN is configured (see below)
#   1 — DSN is malformed, or Sentry rejected the event
#
# A missing DSN exits 0 on purpose. This runs from a workflow whose
# caller already failed for the real reason; turning "reporting is not
# configured" into a second, louder failure buries the first. A
# malformed DSN still fails, because that is a mistake rather than a
# choice.
#
# Why not the Sentry CLI: this reports that Render deploys have stopped
# landing. Adding a toolchain install to that path means the alert
# depends on more moving parts than the thing it watches.

set -euo pipefail

LEVEL="${1:?level required}"
MESSAGE="${2:?message required}"

command -v jq >/dev/null 2>&1 || {
  echo "✗ jq is required but not installed on this runner" >&2
  exit 1
}

if [ -z "${SENTRY_DSN:-}" ]; then
  echo "→ SENTRY_DSN is not set; skipping Sentry report"
  exit 0
fi

# https://<key>@<host>/<project-id>
if [[ ! "${SENTRY_DSN}" =~ ^https://([^@]+)@([^/]+)/([0-9]+)$ ]]; then
  echo "✗ SENTRY_DSN is not a recognized DSN (expected https://<key>@<host>/<project-id>)" >&2
  exit 1
fi

sentry_key="${BASH_REMATCH[1]}"
sentry_host="${BASH_REMATCH[2]}"
sentry_project="${BASH_REMATCH[3]}"

payload=$(jq -n \
  --arg message "${MESSAGE}" \
  --arg level "${LEVEL}" \
  --arg environment "${SENTRY_ENVIRONMENT:-production}" \
  --arg detail "${EXTRA_CONTEXT:-}" \
  --arg logger "github-actions" \
  --arg timestamp "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  '{
    message: $message,
    level: $level,
    environment: $environment,
    logger: $logger,
    timestamp: $timestamp,
    platform: "other",
    extra: { detail: $detail }
  }')

# `|| true` keeps a connection failure from tripping `set -e` before the
# check below can report it. curl still writes `000` as the status.
http_status=$(curl --silent --show-error --output /dev/null --write-out '%{http_code}' \
  --connect-timeout 5 --max-time 15 \
  -X POST \
  -H "Content-Type: application/json" \
  -H "X-Sentry-Auth: Sentry sentry_version=7, sentry_client=concert-crawl-actions/1.0, sentry_key=${sentry_key}" \
  --data "${payload}" \
  "https://${sentry_host}/api/${sentry_project}/store/") || true

# curl reports `000` when it never got a response at all — DNS, TLS or
# timeout. That is a reachability problem on our side, not Sentry declining
# the event, and the two want different responses at triage time.
if [ "${http_status}" = "000" ]; then
  echo "✗ Could not reach Sentry at ${sentry_host} (no HTTP response — DNS, TLS or timeout)" >&2
  exit 1
fi

if [ "${http_status}" != "200" ]; then
  echo "✗ Sentry rejected the event (HTTP ${http_status})" >&2
  exit 1
fi

echo "✓ Reported to Sentry (${LEVEL}): ${MESSAGE}"
