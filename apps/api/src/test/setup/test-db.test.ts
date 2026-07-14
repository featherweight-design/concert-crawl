import { describe, it, expect } from 'vitest'
import { resolveTestDbName, sanitizeWorktreeName } from './test-db'

describe('sanitizeWorktreeName', () => {
  it('lowercases and replaces non [a-z0-9_] with underscore', () => {
    expect(sanitizeWorktreeName('feat/Bar-Baz')).toBe('feat_bar_baz')
  })
})

describe('resolveTestDbName', () => {
  it('returns base name for the main repo path', () => {
    expect(resolveTestDbName('/Users/huey/Projects/concert-crawl')).toBe(
      'concert_crawl_test',
    )
  })

  it('derives a suffixed name from a worktree path', () => {
    expect(
      resolveTestDbName(
        '/Users/huey/Projects/concert-crawl/.worktrees/fix-foo',
      ),
    ).toBe('concert_crawl_test__fix_foo')
  })

  it('uses only the worktree dir, not deeper path segments', () => {
    expect(
      resolveTestDbName(
        '/Users/huey/Projects/concert-crawl/.worktrees/chore-x/apps/api',
      ),
    ).toBe('concert_crawl_test__chore_x')
  })
})
