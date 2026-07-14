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
