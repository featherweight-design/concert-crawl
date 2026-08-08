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
# The POST response alone is NOT a reliable verdict. It races Copilot consuming
# the request: when Copilot picks the review up quickly, the reviewer is already
# out of requested_reviewers by the time GitHub serializes the body, so a
# perfectly good request reports as a silent 200. That false negative once sent
# a session chasing quota exhaustion and GraphQL node types while real reviews
# sat unread on the PR. An empty response therefore falls through to a
# confirmation poll instead of failing outright: the request is confirmed if
# Copilot is queued (back in requested_reviewers) OR has already submitted a
# review newer than the pre-POST baseline.
#
# Copilot does NOT auto-review. Run this after opening a PR AND after every
# fix push (a push does not trigger a re-review).
#
# Usage:
#   ./scripts/request-copilot-review.sh <pr-number>
#   ./scripts/request-copilot-review.sh 937
#
# CONFIRM_TIMEOUT_SECONDS caps the confirmation poll (default 240).

set -euo pipefail

# Fail loudly on the one hard dependency rather than a bare "command not found"
# from the first gh call deep in the script.
if ! command -v gh >/dev/null 2>&1; then
  echo "ERROR: the GitHub CLI ('gh') is required but was not found in PATH." >&2
  echo "  Install it from https://cli.github.com/ and run 'gh auth login'." >&2
  exit 1
fi

# Interpolated into the jq match filters below, which compare against
# ascii_downcase — keep this value lowercase or those matches stop working.
COPILOT_LOGIN="copilot-pull-request-reviewer[bot]"

PR_NUMBER="${1:-}"
if [[ -z "$PR_NUMBER" ]]; then
  echo "Usage: $0 <pr-number>" >&2
  exit 2
fi
if ! [[ "$PR_NUMBER" =~ ^[0-9]+$ ]]; then
  echo "ERROR: PR number must be numeric, got '$PR_NUMBER'." >&2
  exit 2
fi

# Derive the repo from the current checkout (gh reads the origin remote) rather
# than hardcoding it — keeps the helper working across forks, renames, and
# transfers. Fail fast with an actionable hint: if gh can't resolve the repo
# (not authed, wrong dir, bad remote), an empty REPO would produce a confusing
# downstream error. Used only for the poll hint; the POST uses gh's
# {owner}/{repo} placeholders, which resolve the same way.
if ! REPO=$(gh repo view --json nameWithOwner --jq .nameWithOwner); then
  # Don't merge stderr into REPO (2>&1) — on success a stray gh warning would
  # be baked into the poll path below. gh already prints its own error to the
  # terminal on failure; we just add a remediation hint.
  echo "ERROR: Could not determine the repo via gh (see gh output above)." >&2
  echo "  Run 'gh auth login', or check you're inside the repo checkout." >&2
  exit 1
fi

# Baseline the newest existing review ID *before* the POST, so the confirmation
# poll below can tell "Copilot already submitted for this request" apart from
# "Copilot reviewed this PR at some point in the past". Review IDs increase
# monotonically. Empty PR → 0, which every real ID beats.
# Fail fast rather than defaulting to 0 on a failed fetch: a bogus 0 baseline
# would make every review already on the PR look "newer", so the poll below
# would report success for a request that was actually dropped. Don't merge
# stderr into the value (2>&1) — a stray gh warning would poison the reduction;
# gh prints its own error to the terminal anyway.
if ! REVIEW_ID_PAGES=$(gh api --paginate \
  "/repos/{owner}/{repo}/pulls/${PR_NUMBER}/reviews" \
  --jq '[.[] | .id] | max // 0'); then
  echo "ERROR: could not fetch existing reviews for PR #${PR_NUMBER} (see gh output above)." >&2
  echo "  Check the PR number, and that 'gh auth status' is healthy." >&2
  exit 1
fi

# --paginate with --jq emits one result per page, so reduce across every line
# rather than trusting the last one — the global max is not the final page's.
LATEST_REVIEW_ID_BEFORE=$(printf '%s\n' "$REVIEW_ID_PAGES" \
  | awk '$1 > max { max = $1 } END { print max + 0 }')

# The baseline is interpolated into a jq program below. gh's built-in --jq
# takes no --argjson, so assert it is numeric here instead — that makes the
# interpolation provably safe rather than merely likely-safe, and a garbled
# value fails loudly now instead of silently matching nothing later.
if ! [[ "$LATEST_REVIEW_ID_BEFORE" =~ ^[0-9]+$ ]]; then
  echo "ERROR: could not determine a numeric baseline review ID (got '${LATEST_REVIEW_ID_BEFORE}')." >&2
  exit 1
fi

# Body MUST be JSON via --input - (form-encoded -f → 422). A 200 is not success:
# verify COPILOT SPECIFICALLY attached, in the same call. Checking only that
# some reviewer exists would false-pass if the PR already had other reviewers
# while Copilot was silently dropped. Match the bot's login EXACTLY — not a
# substring — so an unrelated user with "copilot" in their handle can't false-
# pass. The POST response lists the bot with the display login "Copilot"; its
# review-author login is "copilot-pull-request-reviewer[bot]". Accept either,
# but the bare "copilot" variant additionally requires type == "Bot" so a human
# whose login is literally "copilot" can't false-pass while the real bot was
# dropped — the "[bot]" login is already unambiguous and needs no type guard.
COPILOT_COUNT=$(gh api -X POST -H "Accept: application/vnd.github+json" \
  "/repos/{owner}/{repo}/pulls/${PR_NUMBER}/requested_reviewers" \
  --jq "[(.requested_reviewers // [])[] | select(((.login | ascii_downcase) == \"copilot\" and .type == \"Bot\") or (.login | ascii_downcase) == \"${COPILOT_LOGIN}\")] | length" \
  --input - <<JSON
{"reviewers": ["${COPILOT_LOGIN}"]}
JSON
)

if [[ "${COPILOT_COUNT:-0}" -gt 0 ]]; then
  echo "Requested Copilot review on PR #${PR_NUMBER} (Copilot attached)."
  echo "Poll for completion: gh api /repos/${REPO}/pulls/${PR_NUMBER}/reviews"
  exit 0
fi

# The response didn't echo Copilot. That is ambiguous, not a failure — see the
# header note. Poll both signals until one confirms the request took, or the
# window expires. Only then is it a genuine silent drop.
# 240s matches the documented Copilot review cadence. Measured on #1503: a
# request that reported a silent 200 produced a real review ~3 min later, so a
# 90s window still called a working request a failure.
CONFIRM_TIMEOUT_SECONDS="${CONFIRM_TIMEOUT_SECONDS:-240}"
CONFIRM_INTERVAL_SECONDS=15

# Validate the env override up front. Left unchecked, a non-numeric value would
# blow up the arithmetic comparison mid-poll under `set -e` — an obscure abort
# far from the actual mistake.
if ! [[ "$CONFIRM_TIMEOUT_SECONDS" =~ ^[0-9]+$ ]]; then
  echo "ERROR: CONFIRM_TIMEOUT_SECONDS must be a non-negative integer, got '${CONFIRM_TIMEOUT_SECONDS}'." >&2
  exit 2
fi

echo "POST did not echo Copilot — confirming (up to ${CONFIRM_TIMEOUT_SECONDS}s)..."

ELAPSED=0
while true; do
  # Signal 1: Copilot is queued as a reviewer (request landed, not yet started).
  QUEUED=$(gh api "/repos/{owner}/{repo}/pulls/${PR_NUMBER}/requested_reviewers" \
    --jq "[(.users // [])[] | select(((.login | ascii_downcase) == \"copilot\" and .type == \"Bot\") or (.login | ascii_downcase) == \"${COPILOT_LOGIN}\")] | length" \
    2>/dev/null || echo 0)
  if [[ "${QUEUED:-0}" -gt 0 ]]; then
    echo "Confirmed: Copilot is queued as a reviewer on PR #${PR_NUMBER}."
    echo "Poll for completion: gh api /repos/${REPO}/pulls/${PR_NUMBER}/reviews"
    exit 0
  fi

  # Signal 2: Copilot already submitted a review newer than the baseline —
  # the fast-consumption case that produces the false negative.
  # `|| true` inside the group keeps a transient gh failure (auth blip, network)
  # from aborting the whole poll under `set -e` — a failed probe should just
  # retry on the next tick. awk always emits exactly one number either way.
  NEWER=$({ gh api --paginate "/repos/{owner}/{repo}/pulls/${PR_NUMBER}/reviews" \
    --jq "[.[] | select(.id > ${LATEST_REVIEW_ID_BEFORE}) | select((.user.login | ascii_downcase) == \"${COPILOT_LOGIN}\")] | length" \
    2>/dev/null || true; } | awk '{total += $1} END {print total + 0}')
  if [[ "${NEWER:-0}" -gt 0 ]]; then
    echo "Confirmed: Copilot already submitted a new review on PR #${PR_NUMBER}."
    echo "Read it: gh api /repos/${REPO}/pulls/${PR_NUMBER}/reviews"
    exit 0
  fi

  if [[ "$ELAPSED" -ge "$CONFIRM_TIMEOUT_SECONDS" ]]; then
    break
  fi
  sleep "$CONFIRM_INTERVAL_SECONDS"
  ELAPSED=$((ELAPSED + CONFIRM_INTERVAL_SECONDS))
done

echo "FAILED: Copilot was not attached to PR #${PR_NUMBER} (silent 200)," >&2
echo "  and no queued reviewer or new review appeared within ${CONFIRM_TIMEOUT_SECONDS}s." >&2
echo "Re-run, or add Copilot via the UI reviewers gear if it keeps failing." >&2
echo "Before concluding it is broken, check: gh api /repos/${REPO}/pulls/${PR_NUMBER}/reviews" >&2
exit 1
