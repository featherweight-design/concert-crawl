import { describe, it, expect } from 'vitest'
import { PgDialect } from 'drizzle-orm/pg-core'
import { supportingArtistsUnchanged } from './2026-08-03-co-headliner-backfill.js'

// The --commit path's optimistic lock is the one piece of this backfill with no
// pure-function surface, and it shipped broken: a bare array interpolation
// rendered an empty supporting_artists list as `()`, which Postgres rejects
// outright. These assert the rendered SQL rather than the behaviour of a mock.
const render = (observed: string[] | null) =>
  new PgDialect().sqlToQuery(supportingArtistsUnchanged(observed))

describe('supportingArtistsUnchanged', () => {
  it('binds an empty array as one parameter, never as an empty value list', () => {
    const query = render([])
    expect(query.sql).not.toContain('()')
    expect(query.params).toEqual([[]])
  })

  it('binds null as a single parameter', () => {
    expect(render(null).params).toEqual([null])
  })

  it('binds a populated array as one parameter, not one placeholder per act', () => {
    const query = render(['Method Man', 'Redman'])
    expect(query.params).toEqual([['Method Man', 'Redman']])
    expect(query.sql.match(/\$\d/g)).toHaveLength(1)
  })

  it('casts the bound parameter to text[] so the comparison is type-stable', () => {
    expect(render([]).sql).toContain('::text[]')
  })
})
