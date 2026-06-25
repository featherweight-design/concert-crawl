import { describe, expect, it } from 'vitest'
import { sql } from 'drizzle-orm'
import { testDb as db } from './helpers/db.js'

// Migration 0042 — events.is_concert_review_needed column. Exercises the
// schema produced by the migration directly via information_schema so
// structural regressions are caught even if the surface area routes around
// the new column. Mirrors the pattern in
// apps/api/src/routes/admin/contests.migration.integration.test.ts.

describe('migration 0042 — events.is_concert_review_needed', () => {
  it('adds is_concert_review_needed column with NOT NULL DEFAULT FALSE', async () => {
    const rows = await db.execute<{
      column_name: string
      data_type: string
      is_nullable: string
      column_default: string | null
    }>(sql`
      SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
       WHERE table_name = 'events' AND column_name = 'is_concert_review_needed'
    `)
    expect(rows).toHaveLength(1)
    expect(rows[0]?.data_type).toBe('boolean')
    expect(rows[0]?.is_nullable).toBe('NO')
    expect(rows[0]?.column_default).toBe('false')
  })
})
