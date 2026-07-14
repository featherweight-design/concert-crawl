import { describe, it, expect } from 'vitest'
import { selectOrphanedTestDbs } from './prune-test-dbs-helpers.js'

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
