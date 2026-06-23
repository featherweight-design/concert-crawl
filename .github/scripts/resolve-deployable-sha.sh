#!/usr/bin/env bash
# resolve-deployable-sha.sh — walk a SHA back past `[skip ci]` ancestors
# to find the most recent commit that would have triggered CI.
#
# Usage: resolve-deployable-sha.sh <sha>
#
# Prints the resolved SHA to stdout. Exits 0 on success.
#
# Why this script exists: semantic-release adds a `chore(release): X.Y.Z
# [skip ci]` commit on top of every merge. GitHub Actions then refuses
# to run CI on that commit (per the `[skip ci]` convention), so no
# downstream deploy workflows fire for it.
#
# This means current `main` HEAD is typically the release commit, while
# the last commit that actually went through staging-smoke is the merge
# commit one step back. SHA-drift guards that compare upstream SHA to
# `main` HEAD see them as different and refuse to proceed — even though
# the release commit's only code-relevant change is a package.json
# version bump.
#
# Walking back past `[skip ci]` ancestors gives the SHA Render would
# have actually built. Drift guards can then compare against that
# "deployable" SHA instead of raw HEAD.
#
# Requirements:
#   - The current working directory must be a git checkout with enough
#     history fetched to walk past any [skip ci] ancestors (depth=20
#     is plenty in practice).
#
# Safety:
#   - Hard depth limit of 20 to avoid an infinite loop if every
#     ancestor is somehow [skip ci] (shouldn't happen in practice;
#     semantic-release produces 1 such commit per release).
#   - If the walk hits the repo root or runs out of fetched history,
#     returns the last SHA reached rather than erroring — caller can
#     then decide whether the comparison is valid.

set -euo pipefail

sha="${1:?sha required}"

# Cap the walk at 20 hops. Each merge produces at most one `[skip ci]`
# release commit, so >2 in a row would be unusual; 20 is comfortably
# beyond any realistic case.
max_hops=20
hops=0

while [ "$hops" -lt "$max_hops" ]; do
  # `git log -1 --pretty=%s` reads only the subject line of the single
  # commit. If git can't find the commit (e.g. shallow clone exhausted),
  # the substitution returns empty and grep returns "no match" — we exit
  # the loop and return the last good SHA.
  subject=$(git log -1 --pretty=%s "$sha" 2>/dev/null || echo "")
  if [ -z "$subject" ]; then
    break
  fi

  if ! echo "$subject" | grep -qF '[skip ci]'; then
    # First non-[skip ci] commit found — this is the deployable SHA.
    break
  fi

  parent=$(git rev-parse "${sha}^" 2>/dev/null || echo "")
  if [ -z "$parent" ]; then
    # No parent (repo root, or history not fetched deeply enough).
    break
  fi

  sha="$parent"
  hops=$((hops + 1))
done

echo "$sha"
