#!/usr/bin/env bash
# sentry-create-deploy.sh — record a production deploy in Sentry: create the
# release for a commit and add a deploy to it, so an error can be read against
# what shipped. Plain curl against the REST API, like sentry-capture-message.sh,
# so the deploy job needs no extra toolchain.
#
# Usage: sentry-create-deploy.sh <commit-sha>
#
# Required env (any one missing => a no-op, exit 0):
#   SENTRY_AUTH_TOKEN  — token with release write scope (project:releases)
#   SENTRY_ORG         — organization slug
#   SENTRY_PROJECT     — project slug the release is created under
#
# Optional env:
#   SENTRY_ENVIRONMENT — deploy environment, defaults to `production`
#   SENTRY_URL         — defaults to https://sentry.io (e.g. https://de.sentry.io for the EU region)
#
# Skipping when unconfigured is deliberate: the deploy already shipped, and
# "release tracking is not set up" must not be a second failure. A configured
# call that Sentry rejects exits 1; the workflow step marks itself
# continue-on-error so that still never blocks a promotion.
set -euo pipefail

sha="${1:?usage: sentry-create-deploy.sh <commit-sha>}"

if [ -z "${SENTRY_AUTH_TOKEN:-}" ] || [ -z "${SENTRY_ORG:-}" ] || [ -z "${SENTRY_PROJECT:-}" ]; then
  echo "Sentry release tracking not configured (SENTRY_AUTH_TOKEN, SENTRY_ORG, SENTRY_PROJECT); skipping."
  exit 0
fi

case "${SENTRY_ORG}${SENTRY_PROJECT}" in
  *[!A-Za-z0-9_-]*) echo "SENTRY_ORG and SENTRY_PROJECT must be plain slugs." >&2; exit 1 ;;
esac

base="${SENTRY_URL:-https://sentry.io}/api/0/organizations/${SENTRY_ORG}/releases"
environment="${SENTRY_ENVIRONMENT:-production}"

post() {
  # --max-time: a hung Sentry call must not hold the deploy job to its
  # timeout, which would skip the smoke and rollback jobs behind it.
  curl --silent --show-error --fail-with-body --max-time 20 \
    --request POST "$1" \
    --header "Authorization: Bearer ${SENTRY_AUTH_TOKEN}" \
    --header "Content-Type: application/json" \
    --data "$2"
  echo
}

# Creating a release that already exists is a 208, not an error. The deploy
# call is not idempotent: a re-run adds another deploy record to the release.
post "${base}/" "{\"version\":\"${sha}\",\"projects\":[\"${SENTRY_PROJECT}\"]}"
post "${base}/${sha}/deploys/" "{\"environment\":\"${environment}\"}"
echo "Recorded ${sha:0:7} as a ${environment} deploy in Sentry (${SENTRY_PROJECT})."
