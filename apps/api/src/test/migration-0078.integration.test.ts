import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { sql } from 'drizzle-orm'
import { beforeEach, describe, expect, it } from 'vitest'

import { testDb as db } from './helpers/db.js'

// Migration 0078 — the three artist-follow preference columns, and the
// backfill that carries a Spotify-connected user's existing settings onto
// them. Structure is asserted through information_schema so a regression is
// caught even if no route reads the column yet.
//
// The backfill statement is READ FROM THE MIGRATION FILE rather than retyped
// here: this test's whole value is that the shipped SQL inserts (a user with
// no preferences row is the case that breaks) rather than updates, and a
// hand-copied statement would drift away from the one that actually runs.

const migrationPath = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../../packages/db/migrations/0078_artist_follow_preferences.sql',
)

const backfillStatement = async (): Promise<string> => {
  const file = await readFile(migrationPath, 'utf8')
  const statements = file.split('--> statement-breakpoint')
  expect(statements).toHaveLength(2)
  const backfill = statements[1] ?? ''
  // Guard the premise: an UPDATE ... FROM here would pass every assertion
  // below for the already-has-a-row case and silently lose the other one.
  expect(backfill).toContain('INSERT INTO user_notification_preferences')
  expect(backfill).not.toContain('UPDATE user_notification_preferences')
  return backfill
}

const COLUMNS = [
  { name: 'artist_alerts_enabled', expected: 'true' },
  // Asymmetric on purpose — following must never silently mutate Watching.
  { name: 'artist_auto_watch', expected: 'false' },
  { name: 'weekly_digest_enabled', expected: 'true' },
]

const seedConnection = async (
  userId: string,
  values: {
    status: 'connected' | 'error' | 'revoked'
    pushEnabled: boolean
    autoWatch: boolean
    digestEnabled: boolean
  },
): Promise<void> => {
  await db.execute(sql`
    INSERT INTO user_spotify_connections
      (user_id, spotify_user_id, status, push_enabled, auto_watch, digest_enabled)
    VALUES (
      ${userId},
      ${`spotify_${userId}`},
      ${values.status}::spotify_connection_status,
      ${values.pushEnabled},
      ${values.autoWatch},
      ${values.digestEnabled}
    )
  `)
}

interface PrefsRow {
  user_id: string
  master_enabled: boolean
  artist_alerts_enabled: boolean
  artist_auto_watch: boolean
  weekly_digest_enabled: boolean
}

const readPrefs = async (userId: string): Promise<PrefsRow | undefined> => {
  const rows = await db.execute<PrefsRow>(sql`
    SELECT user_id, master_enabled, artist_alerts_enabled, artist_auto_watch,
           weekly_digest_enabled
      FROM user_notification_preferences
     WHERE user_id = ${userId}
  `)
  return rows[0]
}

describe('migration 0078 — artist follow preferences', () => {
  beforeEach(async () => {
    await db.execute(
      sql`DELETE FROM user_notification_preferences WHERE user_id LIKE 'user_m78_%'`,
    )
    await db.execute(
      sql`DELETE FROM user_spotify_connections WHERE user_id LIKE 'user_m78_%'`,
    )
  })

  it.each(COLUMNS)(
    'adds $name as NOT NULL DEFAULT $expected',
    async ({ name, expected }) => {
      const rows = await db.execute<{
        data_type: string
        is_nullable: string
        column_default: string | null
      }>(sql`
        SELECT data_type, is_nullable, column_default
          FROM information_schema.columns
         WHERE table_name = 'user_notification_preferences'
           AND column_name = ${name}
      `)
      expect(rows).toHaveLength(1)
      expect(rows[0]?.data_type).toBe('boolean')
      expect(rows[0]?.is_nullable).toBe('NO')
      expect(rows[0]?.column_default).toBe(expected)
    },
  )

  it('creates a row for a connected user who has no preferences row', async () => {
    // The case an UPDATE ... FROM backfill loses entirely: preferences rows are
    // created lazily on first PATCH, so a Spotify user who never opened the
    // notifications screen has nothing to update.
    await seedConnection('user_m78_lazy', {
      status: 'connected',
      pushEnabled: false,
      autoWatch: true,
      digestEnabled: false,
    })

    await db.execute(sql.raw(await backfillStatement()))

    const row = await readPrefs('user_m78_lazy')
    expect(row?.artist_alerts_enabled).toBe(false)
    expect(row?.artist_auto_watch).toBe(true)
    expect(row?.weekly_digest_enabled).toBe(false)
    // Untouched by the backfill: it takes the table default, so nobody starts
    // receiving push who had not already enabled a device.
    expect(row?.master_enabled).toBe(false)
  })

  it('overwrites the three columns on an existing row and leaves the rest alone', async () => {
    await db.execute(sql`
      INSERT INTO user_notification_preferences
        (user_id, master_enabled, watch_updates_enabled, price_drops_enabled)
      VALUES ('user_m78_existing', true, true, false)
    `)
    await seedConnection('user_m78_existing', {
      status: 'connected',
      pushEnabled: false,
      autoWatch: true,
      digestEnabled: false,
    })

    await db.execute(sql.raw(await backfillStatement()))

    const row = await readPrefs('user_m78_existing')
    expect(row?.artist_alerts_enabled).toBe(false)
    expect(row?.artist_auto_watch).toBe(true)
    expect(row?.weekly_digest_enabled).toBe(false)
    // The conflict target updates three columns and no others.
    expect(row?.master_enabled).toBe(true)
  })

  it('skips a revoked connection', async () => {
    await seedConnection('user_m78_revoked', {
      status: 'revoked',
      pushEnabled: true,
      autoWatch: true,
      digestEnabled: true,
    })

    await db.execute(sql.raw(await backfillStatement()))

    expect(await readPrefs('user_m78_revoked')).toBeUndefined()
  })

  it('is idempotent', async () => {
    await seedConnection('user_m78_twice', {
      status: 'connected',
      pushEnabled: true,
      autoWatch: true,
      digestEnabled: false,
    })

    const statement = await backfillStatement()
    await db.execute(sql.raw(statement))
    await db.execute(sql.raw(statement))

    const rows = await db.execute<{ count: string }>(sql`
      SELECT count(*)::text AS count
        FROM user_notification_preferences
       WHERE user_id = 'user_m78_twice'
    `)
    expect(rows[0]?.count).toBe('1')
  })
})
