import { describe, it, expect } from 'vitest'
import { and, sql } from 'drizzle-orm'
import { PgDialect } from 'drizzle-orm/pg-core'
import {
  upcomingEventConditions,
  SCHEDULED_STATUSES,
} from './upcoming-events.js'

const dialect = new PgDialect()

const render = (conditions: ReturnType<typeof upcomingEventConditions>) =>
  dialect.sqlToQuery(and(...conditions)!)

describe('upcomingEventConditions', () => {
  it('pairs the status filter with a date bound', () => {
    const { sql: text, params } = render(
      upcomingEventConditions({ from: '2026-08-03' }),
    )

    expect(text).toContain('"status" = ')
    expect(text).toContain('"date" >= ')
    expect(params).toContain('upcoming')
    expect(params).toContain('2026-08-03')
  })

  it('hides non-concert and crawler-missing rows by default', () => {
    const { sql: text } = render(
      upcomingEventConditions({ from: '2026-08-03' }),
    )

    expect(text).toContain('"hidden_from_consumer" = ')
    expect(text).toContain('"first_missing_at" is null')
  })

  it('drops the visibility filters when the caller opts in', () => {
    const { sql: text } = render(
      upcomingEventConditions({
        from: '2026-08-03',
        includeHiddenFromConsumer: true,
        includeMissing: true,
      }),
    )

    expect(text).not.toContain('hidden_from_consumer')
    expect(text).not.toContain('first_missing_at')
  })

  it('uses `in` for the multi-status consumer list form', () => {
    const { sql: text, params } = render(
      upcomingEventConditions({
        from: '2026-08-03',
        statuses: SCHEDULED_STATUSES,
      }),
    )

    expect(text).toContain('"status" in ')
    expect(params).toContain('cancelled')
    expect(params).toContain('postponed')
  })

  it('accepts a SQL expression as the date bound', () => {
    const { sql: text } = render(
      upcomingEventConditions({
        from: sql`(NOW() AT TIME ZONE 'America/Denver')::date`,
      }),
    )

    expect(text).toContain("(NOW() AT TIME ZONE 'America/Denver')::date")
  })
})
