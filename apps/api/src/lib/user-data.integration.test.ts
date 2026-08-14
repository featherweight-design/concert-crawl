import { describe, expect, it } from 'vitest'
import { sql } from 'drizzle-orm'
import { db, USER_DATA_REGISTRY } from '@concert-crawl/db'
import type { UserDataEntry } from '@concert-crawl/db'

// Tables Drizzle does not own. Migrations metadata only.
const NOT_OURS = new Set(['__drizzle_migrations'])

describe('user-data registry coverage', () => {
  it('classifies every table in the database', async () => {
    const result = await db.execute(sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `)

    // NOTE: the postgres-js driver returns the row array directly from
    // db.execute — there is no `.rows` wrapper as there is on node-postgres.
    const live = result
      .map((row) => String(row['table_name']))
      .filter((name) => !NOT_OURS.has(name))
      .sort()

    const classified = USER_DATA_REGISTRY.map((entry) => entry.tableName).sort()

    const missing = live.filter((name) => !classified.includes(name))
    const stale = classified.filter((name) => !live.includes(name))

    expect(
      missing,
      `Tables exist with no entry in USER_DATA_REGISTRY. Add one — a table ` +
        `left unclassified is a table that silently survives account ` +
        `deletion: ${missing.join(', ')}`,
    ).toEqual([])

    expect(
      stale,
      `USER_DATA_REGISTRY names tables that no longer exist: ${stale.join(', ')}`,
    ).toEqual([])
  })

  it('names every table and every export key exactly once', () => {
    // The coverage test above compares sorted lists, so a duplicated entry
    // still matches the live schema. Two entries for one table means the
    // deletion and export helpers pick whichever they iterate to first.
    const duplicateTables = USER_DATA_REGISTRY.map(
      (entry) => entry.tableName,
    ).filter((name, index, all) => all.indexOf(name) !== index)

    const exportKeys = USER_DATA_REGISTRY.map(
      (entry) => entry.exportKey,
    ).filter((key): key is string => key !== null)
    const duplicateKeys = exportKeys.filter(
      (key, index, all) => all.indexOf(key) !== index,
    )

    expect(duplicateTables).toEqual([])
    // A collision here silently drops one table's rows from the export.
    expect(duplicateKeys).toEqual([])
  })

  it('gives every non-"none" entry a user id column', () => {
    const broken = USER_DATA_REGISTRY.filter(
      (entry) => entry.disposition !== 'none' && entry.userIdColumn === null,
    ).map((entry) => entry.tableName)

    expect(broken).toEqual([])
  })

  it('gives every entry a non-empty reason', () => {
    const unexplained = USER_DATA_REGISTRY.filter(
      (entry) => entry.reason.trim().length === 0,
    ).map((entry) => entry.tableName)

    expect(unexplained).toEqual([])
  })

  it('never exports a table it does not classify as holding user data', () => {
    const contradictory = USER_DATA_REGISTRY.filter(
      (entry) => entry.disposition === 'none' && entry.exportKey !== null,
    ).map((entry) => entry.tableName)

    expect(contradictory).toEqual([])
  })

  it('pairs every exportKey with an exportColumns allowlist', () => {
    // The export builder reads `exportColumns` and never `SELECT *`. An entry
    // with an exportKey but no allowlist would therefore export nothing;
    // an allowlist with no exportKey is dead weight that will drift.
    const mismatched = USER_DATA_REGISTRY.filter(
      (entry) => (entry.exportKey === null) !== (entry.exportColumns === null),
    ).map((entry) => entry.tableName)

    expect(mismatched).toEqual([])
  })

  it('only names columns that exist on the table', async () => {
    // Guards the failure mode a `SELECT *` export would have hidden: a
    // migration renames or drops a column and the export silently 500s in
    // production instead of failing here.
    const result = await db.execute(sql`
      SELECT table_name, column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
    `)

    const byTable = new Map<string, Set<string>>()
    for (const row of result) {
      const table = String(row['table_name'])
      const existing = byTable.get(table) ?? new Set<string>()
      existing.add(String(row['column_name']))
      byTable.set(table, existing)
    }

    const phantom: string[] = []
    for (const entry of USER_DATA_REGISTRY) {
      const columns = byTable.get(entry.tableName)
      if (!columns) continue
      for (const name of entry.exportColumns ?? []) {
        if (!columns.has(name)) phantom.push(`${entry.tableName}.${name}`)
      }
      if (entry.userIdColumn !== null && !columns.has(entry.userIdColumn)) {
        phantom.push(`${entry.tableName}.${entry.userIdColumn}`)
      }
      for (const name of entry.otherUserIdColumns) {
        if (!columns.has(name)) phantom.push(`${entry.tableName}.${name}`)
      }
    }

    expect(
      phantom,
      `USER_DATA_REGISTRY names columns that do not exist: ${phantom.join(', ')}`,
    ).toEqual([])
  })

  it('declares every column that looks like it holds a Clerk ID', async () => {
    // `invite_codes` was classified 'none' — "beta access codes, not keyed to a
    // user" — while holding `used_by`, the Clerk ID of whoever redeemed it.
    // Reading each table and deciding is exactly how that got missed, so this
    // sweeps for the shape instead: any text column whose name reads like a
    // person must be declared as either the subject or an actor.
    //
    // The pattern is a net, not a definition. A Clerk ID under a name it does
    // not catch still has to be declared; this only guarantees the obvious ones
    // cannot be skipped. `audit_log.target_id` is why '%target%' is in the net:
    // it is a venue or event UUID on most rows and a Clerk ID when an admin
    // acts on a user, and nothing in its name says so.
    const KNOWN_NOT_CLERK_IDS = new Set([
      // Browser UA string from the push subscription handshake.
      'push_subscriptions.user_agent',
      // Spotify's own account ID, not ours.
      'user_spotify_connections.spotify_user_id',
    ])

    const result = await db.execute(sql`
      SELECT table_name, column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND data_type IN ('text', 'character varying')
        AND (
          column_name LIKE '%user%'
          OR column_name LIKE '%\\_by'
          OR column_name LIKE '%keeper%'
          OR column_name LIKE '%actor%'
          OR column_name LIKE '%owner%'
          OR column_name LIKE '%target%'
        )
    `)

    const byTable = new Map<string, UserDataEntry>(
      USER_DATA_REGISTRY.map((entry) => [entry.tableName, entry]),
    )

    const undeclared: string[] = []
    for (const row of result) {
      const table = String(row['table_name'])
      const column = String(row['column_name'])
      if (KNOWN_NOT_CLERK_IDS.has(`${table}.${column}`)) continue

      const entry = byTable.get(table)
      if (entry === undefined) continue
      const declared =
        entry.userIdColumn === column ||
        entry.otherUserIdColumns.includes(column)
      if (!declared) undeclared.push(`${table}.${column}`)
    }

    expect(
      undeclared.sort(),
      `Columns that look like they hold a Clerk ID but are declared neither as ` +
        `userIdColumn nor in otherUserIdColumns. Declare each one, or add it to ` +
        `KNOWN_NOT_CLERK_IDS with a reason: ${undeclared.join(', ')}`,
    ).toEqual([])
  })

  it('can actually null every column it promises to anonymize', async () => {
    // 'anonymize' means the row survives with its Clerk ID nulled. Two of them
    // were NOT NULL, so the disposition was a statement the database would have
    // rejected at runtime — the exact class of untrue claim Gate A exists to
    // remove. Migration 0080 dropped both constraints; this keeps them dropped.
    const result = await db.execute(sql`
      SELECT table_name, column_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND is_nullable = 'NO'
    `)

    const notNullable = new Set(
      result.map(
        (row) => `${String(row['table_name'])}.${String(row['column_name'])}`,
      ),
    )

    const impossible: string[] = []
    for (const entry of USER_DATA_REGISTRY) {
      // Only the subject column. otherUserIdColumns are not uniformly nulled —
      // crew_invites.revoked_by is, invite_codes.created_by is not, because it
      // names an admin who is not the one leaving. Each entry's `reason` says
      // which, and that is a judgment a schema constraint cannot express.
      if (entry.disposition !== 'anonymize') continue
      if (entry.userIdColumn === null) continue
      if (notNullable.has(`${entry.tableName}.${entry.userIdColumn}`)) {
        impossible.push(`${entry.tableName}.${entry.userIdColumn}`)
      }
    }

    expect(
      impossible.sort(),
      `Declared 'anonymize' but the column is NOT NULL, so nulling it would ` +
        `fail. Drop the constraint or change the disposition: ` +
        `${impossible.join(', ')}`,
    ).toEqual([])
  })

  it('never lists user_id in an export allowlist', () => {
    // #527: "Exclude userId (they know who they are)". Echoing the Clerk ID
    // back turns a shared export file into an identifier leak.
    const leaky = USER_DATA_REGISTRY.filter((entry) =>
      (entry.exportColumns ?? []).includes('user_id'),
    ).map((entry) => entry.tableName)

    expect(leaky).toEqual([])
  })
})
