const BASE_TEST_DB = 'concert_crawl_test'
const WORKTREE_DB_PREFIX = 'concert_crawl_test__'

// Must stay identical to sanitizeWorktreeName in
// apps/api/src/test/setup/test-db.ts — a mismatch would orphan or spare the
// wrong DBs.
const sanitize = (name: string): string =>
  name.toLowerCase().replace(/[^a-z0-9_]/g, '_')

export const selectOrphanedTestDbs = (
  allDbNames: string[],
  survivingWorktreeNames: string[],
): string[] => {
  const survivors = new Set(survivingWorktreeNames.map(sanitize))
  return allDbNames.filter((name) => {
    if (name === BASE_TEST_DB) return false
    if (!name.startsWith(WORKTREE_DB_PREFIX)) return false
    return !survivors.has(name.slice(WORKTREE_DB_PREFIX.length))
  })
}

// Restricts an orphan list to only those DBs owned by branches this session
// worked on. Ownership is inferred by naming convention: for a branch name
// `feat/foo`, the expected DB suffix is sanitize('feat/foo') = 'feat_foo'.
// Agents who followed the standard `.worktrees/<branch>` layout will match;
// nonstandard worktree paths will not (use --all for a full sweep instead).
export const filterOrphansToScope = (
  orphans: string[],
  scopedBranches: string[],
): string[] => {
  const scopedSuffixes = new Set(scopedBranches.map(sanitize))
  return orphans.filter((name) =>
    scopedSuffixes.has(name.slice(WORKTREE_DB_PREFIX.length)),
  )
}
