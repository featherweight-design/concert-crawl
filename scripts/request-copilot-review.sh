#!/usr/bin/env bash
# Requests a GitHub Copilot review on a pull request — reliably.
#
# Why this exists: the requested_reviewers API accepts the display name
# "Copilot" and returns HTTP 200 but SILENTLY drops it — no reviewer is
# attached and no review is ever generated. The only string that works is the
# bot's full login, "copilot-pull-request-reviewer[bot]". This script hardcodes
# that login and fails loudly if the attach did not actually take, so a 200 is
# never mistaken for success.
#
# Copilot does NOT auto-review. Run this after opening a PR AND after every
# fix push (a push does not trigger a re-review).
#
# Usage:
#   ./scripts/request-copilot-review.sh <pr-number>
#   ./scripts/request-copilot-review.sh 937

set -euo pipefail

# Fail loudly on the one hard dependency rather than a bare "command not found"
# from the first gh call deep in the script.
if ! command -v gh >/dev/null 2>&1; then
  echo "ERROR: the GitHub CLI ('gh') is required but was not found in PATH." >&2
  echo "  Install it from https://cli.github.com/ and run 'gh auth login'." >&2
  exit 1
fi

COPILOT_LOGIN="copilot-pull-request-reviewer[bot]"

PR_NUMBER="${1:-}"
if [[ -z "$PR_NUMBER" ]]; then
  echo "Usage: $0 <pr-number>" >&2
  exit 2
fi
if ! [[ "$PR_NUMBER" =~ ^[0-9]+$ ]]; then
  echo "Error: PR number must be numeric, got '$PR_NUMBER'." >&2
  exit 2
fi

# Derive the repo from the current checkout (gh reads the origin remote) rather
# than hardcoding it — keeps the helper working across forks, renames, and
# transfers. Fail fast with an actionable hint: if gh can't resolve the repo
# (not authed, wrong dir, bad remote), an empty REPO would produce a confusing
# downstream error. Used only for the poll hint; the POST uses gh's
# {owner}/{repo} placeholders, which resolve the same way.
if ! REPO=$(gh repo view --json nameWithOwner --jq .nameWithOwner 2>&1); then
  echo "ERROR: Could not determine the repo via gh:" >&2
  echo "  $REPO" >&2
  echo "  Run 'gh auth login', or check you're inside the repo checkout." >&2
  exit 1
fi

# Body MUST be JSON via --input - (form-encoded -f → 422). A 200 is not success:
# verify COPILOT SPECIFICALLY attached, in the same call. Checking only that
# some reviewer exists would false-pass if the PR already had other reviewers
# while Copilot was silently dropped. Match the bot's login EXACTLY — not a
# substring — so an unrelated user with "copilot" in their handle can't false-
# pass. The POST response lists the bot with the display login "Copilot"; its
# review-author login is "copilot-pull-request-reviewer[bot]". Accept either.
COPILOT_COUNT=$(gh api -X POST -H "Accept: application/vnd.github+json" \
  "/repos/{owner}/{repo}/pulls/${PR_NUMBER}/requested_reviewers" \
  --jq '[(.requested_reviewers // [])[].login | ascii_downcase | select(. == "copilot" or . == "copilot-pull-request-reviewer[bot]")] | length' \
  --input - <<JSON
{"reviewers": ["${COPILOT_LOGIN}"]}
JSON
)

if [[ "${COPILOT_COUNT:-0}" -eq 0 ]]; then
  echo "FAILED: Copilot was not attached to PR #${PR_NUMBER} (silent 200)." >&2
  echo "Re-run, or add Copilot via the UI reviewers gear if it keeps failing." >&2
  exit 1
fi

echo "Requested Copilot review on PR #${PR_NUMBER} (Copilot attached)."
echo "Poll for completion: gh api /repos/${REPO}/pulls/${PR_NUMBER}/reviews"
