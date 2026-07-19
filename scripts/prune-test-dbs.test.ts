import { describe, it, expect } from 'vitest'
import {
  selectOrphanedTestDbs,
  filterOrphansToScope,
} from './prune-test-dbs-helpers.js'

describe('selectOrphanedTestDbs', () => {
  it('drops DBs whose worktree no longer exists', () => {
    const result = selectOrphanedTestDbs(
      ['concert_crawl_test__gone', 'concert_crawl_test__alive'],
      ['alive'],
    )
    expect(result).toEqual(['concert_crawl_test__gone'])
  })

  it('never returns the base test DB', () => {
    expect(selectOrphanedTestDbs(['concert_crawl_test'], [])).toEqual([])
  })

  it('ignores unrelated databases', () => {
    expect(selectOrphanedTestDbs(['concert_crawl_db', 'postgres'], [])).toEqual(
      [],
    )
  })

  it('matches worktree names using the same sanitization', () => {
    expect(
      selectOrphanedTestDbs(['concert_crawl_test__feat_foo'], ['feat/Foo']),
    ).toEqual([])
  })

  it('returns empty when every DB has a surviving worktree', () => {
    expect(selectOrphanedTestDbs(['concert_crawl_test__a'], ['a'])).toEqual([])
  })
})

describe('filterOrphansToScope', () => {
  it('keeps only orphans whose suffix matches a passed branch', () => {
    const orphans = [
      'concert_crawl_test__feat_762_design_brief',
      'concert_crawl_test__someone_elses_branch',
    ]
    expect(filterOrphansToScope(orphans, ['feat/762-design-brief'])).toEqual([
      'concert_crawl_test__feat_762_design_brief',
    ])
  })

  it('sanitizes branch names the same way DB names are derived', () => {
    // Uppercase, slashes, and dashes all normalize to underscores + lowercase.
    expect(
      filterOrphansToScope(
        ['concert_crawl_test__feat_foo_bar'],
        ['FEAT/Foo-Bar'],
      ),
    ).toEqual(['concert_crawl_test__feat_foo_bar'])
  })

  it('returns empty when no branches are in scope', () => {
    expect(filterOrphansToScope(['concert_crawl_test__anything'], [])).toEqual(
      [],
    )
  })

  it('skips orphans that no scoped branch owns', () => {
    expect(
      filterOrphansToScope(
        ['concert_crawl_test__other_agent_branch'],
        ['feat/my-branch'],
      ),
    ).toEqual([])
  })
})
