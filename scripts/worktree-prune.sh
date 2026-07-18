#!/usr/bin/env bash
# Removes the given worktrees (and their local branches) if they have no open
# PR, then drops orphaned test DBs.
#   pnpm worktree:prune <branch>...            # scoped: only these branches
#   pnpm worktree:prune --dry-run <branch>...  # preview a scoped run
#   pnpm worktree:prune --all                  # full sweep (human use only)
# Agents MUST pass the branch(es) they worked on this session — other PR-less
# worktrees may belong to concurrent sessions.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
"$ROOT_DIR/scripts/clean-worktrees.sh" "$@"
pnpm exec tsx "$ROOT_DIR/scripts/prune-test-dbs.ts" "$@"
