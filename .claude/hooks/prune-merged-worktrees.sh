#!/bin/bash
# Remove worktrees whose remote tracking branch has been deleted (PR merged),
# then drop the per-worktree test DBs those worktrees left behind.
# Runs at SessionStart so stale worktrees and DBs are cleaned up automatically.

REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null) || exit 0

git -C "$REPO_ROOT" fetch --prune --quiet 2>/dev/null || true
git -C "$REPO_ROOT" worktree prune 2>/dev/null || true

pruned=()
current_wt=""

while IFS= read -r line; do
  case "$line" in
    "worktree "*)
      current_wt="${line#worktree }"
      ;;
    "branch "*)
      branch="${line#branch refs/heads/}"
      if [ -n "$current_wt" ] && [ "$current_wt" != "$REPO_ROOT" ]; then
        tracking=$(git -C "$REPO_ROOT" for-each-ref --format='%(upstream:track)' "refs/heads/$branch" 2>/dev/null)
        if [ "$tracking" = "[gone]" ]; then
          git -C "$REPO_ROOT" worktree remove --force "$current_wt" 2>/dev/null && \
            pruned+=("$branch")
        fi
      fi
      ;;
  esac
done < <(git -C "$REPO_ROOT" worktree list --porcelain)

# Drop test DBs whose worktree no longer exists. Reuse the canonical prune
# script so the orphan/sanitize logic lives in exactly one place. Guard on the
# local test DB being reachable; skip silently (and never block startup) if not.
dropped_dbs=0
if docker exec concert-crawl-db psql -U postgres -lqt 2>/dev/null | grep -q concert_crawl_test; then
  db_output=$( (cd "$REPO_ROOT" && pnpm exec tsx scripts/prune-test-dbs.ts) 2>/dev/null )
  dropped_dbs=$(printf '%s\n' "$db_output" | grep -c 'Dropping:')
fi

parts=()
[ ${#pruned[@]} -gt 0 ] && parts+=("pruned ${#pruned[@]} stale worktree(s): ${pruned[*]}")
[ "$dropped_dbs" -gt 0 ] && parts+=("dropped ${dropped_dbs} orphaned test DB(s)")

if [ ${#parts[@]} -gt 0 ]; then
  msg="Worktree hygiene: $(IFS='; '; echo "${parts[*]}")."
  # Build the JSON with jq so branch names containing quotes/backslashes/
  # newlines can't produce invalid output. Fall back to nothing if jq is
  # absent — the message is informational and must never block startup.
  command -v jq >/dev/null 2>&1 && jq -cn --arg msg "$msg" '{systemMessage: $msg}'
fi
