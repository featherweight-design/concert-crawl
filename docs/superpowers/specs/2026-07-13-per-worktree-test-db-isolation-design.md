# Per-Worktree Test DB Isolation — Design

**Issue:** #748 (consolidated; #620 closed as duplicate)
**Date:** 2026-07-13
**Type:** chore / test infrastructure

---

## Problem

`apps/api/vitest.integration.ts` and `apps/api/src/test/setup/global-setup.ts` both hardcode the integration test database as `concert_crawl_test` on `localhost:5433` (overridable via `DATABASE_URL_TEST`). Every worktree and the main repo run integration tests against the **same** database.

Because the config sets `fileParallelism: false` + `singleFork: true`, there is no in-process parallelism — the collision is strictly **cross-process**:

- Two concurrent `vitest` runs from different worktrees. `clearTables` issues `TRUNCATE ... CASCADE` in a `beforeEach`; each run wipes the other's rows mid-test, surfacing as spurious FK violations (53 tests failed this way in PR #619).
- A worktree on a branch with an un-migrated schema sees another branch's migration (e.g. migration 0041 from the admin-contest-review branch broke concurrent agents in #697), forcing `git commit --no-verify` workarounds.

A second, related hygiene problem: worktrees accumulate. As of 2026-07-13 there are 80+ stale worktree directories under `.worktrees/`, with their orphaned test databases never cleaned up.

## Goal

1. Two concurrent worktrees can run `pnpm --filter @concert-crawl/api test:integration` independently without colliding.
2. A worktree that hasn't migrated yet doesn't fail because of another worktree's schema changes.
3. CI is unaffected (one DB per job is already isolated via `DATABASE_URL_TEST`).
4. Stale worktrees **and** their test databases are pruned after every associated PR merge, preventing the accumulation seen today.

## Approach

Derive a per-worktree test DB name, auto-create + migrate it in `global-setup.ts`, and provide a single sweep script that cleans up merged worktrees and their orphaned databases. Advisory-lock and per-worktree-Docker alternatives were rejected: the advisory lock serializes runs but does not isolate schema (fails goal #2), and a per-worktree Docker DB is heavier setup for no additional benefit over per-DB naming.

### 1. Shared name-resolution helper

New module `apps/api/src/test/setup/test-db.ts` exporting `resolveTestDbUrl(): string`:

- If `DATABASE_URL_TEST` is set, return it verbatim. This preserves CI (one isolated DB per job) and any explicit manual override.
- Otherwise run `git rev-parse --show-toplevel`:
  - If the returned path contains `/.worktrees/`, the DB name is `concert_crawl_test__<sanitized>` where `<sanitized>` is the worktree directory basename lowercased with all non-`[a-z0-9_]` characters replaced by `_`.
  - Otherwise (the main repo), the DB name is the current default `concert_crawl_test`. This keeps the primary directory's behavior unchanged so nothing breaks for the user's own testing.
- The base connection (`host`, `port`, `user`, `password`) is taken from the existing default URL (`postgresql://postgres:postgres@localhost:5433`); only the database name varies.

Both `vitest.integration.ts` (its `env.DATABASE_URL`) and `global-setup.ts` call this single helper, so the two resolution sites cannot drift.

Because Vitest resolves `env` in the config statically, `vitest.integration.ts` computes the URL by importing and calling `resolveTestDbUrl()` at config-eval time.

### 2. Auto-create + migrate in `global-setup.ts`

`setup()` currently connects to the target DB and runs migrations, which fails if the database does not exist yet. New behavior:

1. Parse the target DB name from `resolveTestDbUrl()`.
2. Connect to the `postgres` maintenance database on the same host/port.
3. `CREATE DATABASE "<name>"` if it does not already exist (executed outside a transaction, as `CREATE DATABASE` requires). Guard with a `SELECT 1 FROM pg_database WHERE datname = $1` check to stay idempotent.
4. Close the maintenance connection, then connect to the target DB and run migrations exactly as today.

Second and later runs on an existing DB skip creation and just migrate — idempotent.

### 3. Sweep script — `pnpm worktree:prune`

New `scripts/prune-worktrees.ts` (mirrors the existing `scripts/` + `test:scripts` vitest pattern), exposed as a root `package.json` script `worktree:prune`. Order of operations:

1. **Worktrees:** for each directory under `.worktrees/`, if its branch is fully merged into `origin/main` **or** the branch no longer exists, run `git worktree remove` on it, then `git worktree prune`.
2. **Databases:** enumerate all `concert_crawl_test__*` databases via the maintenance connection, cross-reference against the surviving `.worktrees/` directories, and `DROP DATABASE` any with no matching worktree.

Safety rules:

- Never removes a worktree with uncommitted changes or an unmerged branch — protects in-progress work.
- Never drops the base `concert_crawl_test` database.
- `--dry-run` flag prints every worktree and database it would remove without touching anything.

The orphan-detection logic is factored into a pure function (`selectOrphanedDbs(allDbNames, surviving WorktreeNames)` and `selectRemovableWorktrees(worktrees)`) so it is unit-testable without a live DB or git tree.

This single script both clears the current 80+ backlog and serves as the recurring hygiene tool.

### 4. Docs

- **CLAUDE.md** — extend the worktree conventions with a hard rule: after every PR merges, remove its worktree and run `pnpm worktree:prune`. This is the mechanism that prevents re-accumulation.
- **CLAUDE.md / runbook note** — document the per-worktree DB naming convention (`concert_crawl_test__<worktree>`) and the `DATABASE_URL_TEST` override for CI/manual use.

## Testing

- **Unit — `resolveTestDbUrl()`:** worktree path (`/.worktrees/foo` → `concert_crawl_test__foo`), main repo path → `concert_crawl_test`, `DATABASE_URL_TEST` set → returned verbatim, sanitization of `feat/bar-baz` → `feat_bar_baz`.
- **Unit — prune logic:** `selectOrphanedDbs` returns only `concert_crawl_test__*` names absent from the worktree list and never the base name; `selectRemovableWorktrees` excludes dirty/unmerged worktrees.
- **Manual validation:** create two worktrees, run `test:integration` in each simultaneously, confirm no cross-truncation and independent schemas; run `pnpm worktree:prune --dry-run` then for real and confirm merged worktrees + orphaned DBs are removed while active ones survive.

## Out of scope

- Changing CI's DB provisioning (already isolated per job).
- Migrating to a schema-per-test or container-per-worktree model.
- Automatic pruning on a hook/cron — pruning is an explicit post-merge step, run by the agent that merged the PR.
