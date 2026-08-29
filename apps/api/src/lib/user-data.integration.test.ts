import { describe, expect, it } from 'vitest'
import { eq, sql } from 'drizzle-orm'
import {
  crewInvites,
  crewMembers,
  crews,
  db,
  priceSubmissions,
  USER_DATA_REGISTRY,
  userEvents,
  userProfiles,
} from '@concert-crawl/db'
import type { UserDataEntry } from '@concert-crawl/db'
import { deleteUserData } from './user-data.js'
import { seedUserWithDataEverywhere } from '../test/helpers/seed.js'

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

// Rows in an anonymize table whose subject column has been nulled, by whoever
// left. Not scoped to one user, because that is exactly the information
// anonymizing destroys.
const countOrphans = async (
  tableName: string,
  column: string,
): Promise<number> => {
  const [row] = await db.execute(
    sql`SELECT COUNT(*)::int AS total FROM ${sql.identifier(tableName)}
        WHERE ${sql.identifier(column)} IS NULL`,
  )
  return Number(row?.['total'] ?? 0)
}

describe('deleteUserData', () => {
  it('leaves no row behind in any table marked delete', async () => {
    const userId = await seedUserWithDataEverywhere()

    await deleteUserData(userId)

    // Driven off the registry rather than a list, so a table added later is
    // covered the moment it gets an entry.
    const surviving: string[] = []
    for (const entry of USER_DATA_REGISTRY) {
      if (entry.disposition !== 'delete') continue
      if (entry.userIdColumn === null) continue
      const rows = await db.execute(
        sql`SELECT 1 FROM ${sql.identifier(entry.tableName)}
            WHERE ${sql.identifier(entry.userIdColumn)} = ${userId} LIMIT 1`,
      )
      if (rows.length > 0) surviving.push(entry.tableName)
    }

    expect(
      surviving,
      `Rows survived account deletion in: ${surviving.join(', ')}`,
    ).toEqual([])
  })

  it('nulls the user id rather than dropping rows marked anonymize', async () => {
    const userId = await seedUserWithDataEverywhere()

    // Counted before the deletion, because an anonymized row from an earlier
    // test is indistinguishable from this one afterwards: both carry a null
    // user id. Only the increase proves the row seeded here survived.
    const orphansBefore = new Map<string, number>()
    for (const entry of USER_DATA_REGISTRY) {
      if (entry.disposition !== 'anonymize') continue
      if (entry.userIdColumn === null) continue
      orphansBefore.set(
        entry.tableName,
        await countOrphans(entry.tableName, entry.userIdColumn),
      )
    }

    await deleteUserData(userId)

    for (const entry of USER_DATA_REGISTRY) {
      if (entry.disposition !== 'anonymize') continue
      if (entry.userIdColumn === null) continue
      // The seeded user is their crew's only member, so the crew is deleted
      // and cascades its invites away — the row cannot survive to be
      // anonymized. The next test covers crew_invites where the crew lives on,
      // which is the case this disposition is actually about.
      if (entry.tableName === 'crew_invites') continue
      const table = sql.identifier(entry.tableName)
      const column = sql.identifier(entry.userIdColumn)

      const mine = await db.execute(
        sql`SELECT 1 FROM ${table} WHERE ${column} = ${userId} LIMIT 1`,
      )
      expect(
        mine.length,
        `${entry.tableName} still ties a row to the deleted user`,
      ).toBe(0)

      expect(
        await countOrphans(entry.tableName, entry.userIdColumn),
        `${entry.tableName} is marked anonymize but the row did not survive`,
      ).toBeGreaterThan(orphansBefore.get(entry.tableName) ?? 0)
    }
  })

  it('keeps an invite alive after its creator leaves a surviving crew', async () => {
    // The link belongs to the crew, not to the person who minted it, so it
    // stays usable with the creator's Clerk ID nulled. This only holds when
    // the crew itself survives — hence the second member.
    const creatorId = await seedUserWithDataEverywhere()
    const [crew] = await db
      .select()
      .from(crews)
      .where(eq(crews.keeperId, creatorId))
      .limit(1)
    if (!crew) throw new Error('seed did not create a crew for the keeper')
    await db
      .insert(crewMembers)
      .values({ crewId: crew.id, userId: 'user_test_survivor' })

    const [invite] = await db
      .select()
      .from(crewInvites)
      .where(eq(crewInvites.createdBy, creatorId))
      .limit(1)
    if (!invite) throw new Error('seed did not create an invite')

    await deleteUserData(creatorId)

    const [after] = await db
      .select()
      .from(crewInvites)
      .where(eq(crewInvites.id, invite.id))
    expect(after, 'the invite must outlive its creator').toBeDefined()
    expect(after?.createdBy).toBeNull()
    expect(after?.token).toBe(invite.token)
  })

  it('keeps rows marked retain under the legal-obligation exemption', async () => {
    const userId = await seedUserWithDataEverywhere()

    await deleteUserData(userId)

    const dropped: string[] = []
    for (const entry of USER_DATA_REGISTRY) {
      if (entry.disposition !== 'retain') continue
      if (entry.userIdColumn === null) continue
      // `crews` is retained but its keeper column is reassigned, so it is
      // asserted on by the keepership tests instead.
      if (entry.tableName === 'crews') continue
      const rows = await db.execute(
        sql`SELECT 1 FROM ${sql.identifier(entry.tableName)}
            WHERE ${sql.identifier(entry.userIdColumn)} = ${userId} LIMIT 1`,
      )
      if (rows.length === 0) dropped.push(entry.tableName)
    }

    expect(
      dropped,
      `Retained tables lost their rows: ${dropped.join(', ')}`,
    ).toEqual([])
  })

  it('transfers keepership to the longest-tenured remaining member', async () => {
    const keeperId = await seedUserWithDataEverywhere()
    const [crew] = await db
      .select()
      .from(crews)
      .where(eq(crews.keeperId, keeperId))
      .limit(1)
    if (!crew) throw new Error('seed did not create a crew for the keeper')

    // Inserted newest-first so a passing test cannot be explained by insertion
    // order standing in for the joined_at sort.
    await db.insert(crewMembers).values({
      crewId: crew.id,
      userId: 'user_test_newcomer',
      joinedAt: new Date('2026-08-01T00:00:00Z'),
    })
    await db.insert(crewMembers).values({
      crewId: crew.id,
      userId: 'user_test_oldtimer',
      joinedAt: new Date('2026-01-01T00:00:00Z'),
    })

    await deleteUserData(keeperId)

    const [after] = await db.select().from(crews).where(eq(crews.id, crew.id))
    expect(after?.keeperId).toBe('user_test_oldtimer')
  })

  it('deletes a crew whose only member was the leaver', async () => {
    const keeperId = await seedUserWithDataEverywhere()
    const [crew] = await db
      .select()
      .from(crews)
      .where(eq(crews.keeperId, keeperId))
      .limit(1)
    if (!crew) throw new Error('seed did not create a crew for the keeper')

    await deleteUserData(keeperId)

    const after = await db.select().from(crews).where(eq(crews.id, crew.id))
    expect(after).toHaveLength(0)
  })

  it('clears the revoker on an invite it does not own', async () => {
    // crew_invites.revoked_by is the one otherUserIdColumn that names an
    // ordinary member rather than an admin, so it is the one that gets nulled.
    const revokerId = await seedUserWithDataEverywhere()
    const otherId = await seedUserWithDataEverywhere()
    const [theirs] = await db
      .select()
      .from(crewInvites)
      .where(eq(crewInvites.createdBy, otherId))
      .limit(1)
    if (!theirs) throw new Error('seed did not create an invite')

    await db
      .update(crewInvites)
      .set({ revokedBy: revokerId, revokedAt: new Date() })
      .where(eq(crewInvites.id, theirs.id))

    await deleteUserData(revokerId)

    const [after] = await db
      .select()
      .from(crewInvites)
      .where(eq(crewInvites.id, theirs.id))
    expect(
      after,
      'the invite itself belongs to the crew and must survive',
    ).toBeDefined()
    expect(after?.revokedBy).toBeNull()
    expect(after?.createdBy).toBe(otherId)
  })

  it('clears the sighting actor but keeps the sighting itself', async () => {
    // price_submissions.last_seen_by is an otherUserIdColumn, so nothing in
    // the registry-driven sweeps above reaches it — only the hand-written
    // branch in deleteUserData does. last_seen_at is a freshness fact about
    // the price rather than about the person, so it survives.
    const submitterId = await seedUserWithDataEverywhere()
    const sighterId = await seedUserWithDataEverywhere()
    const [theirs] = await db
      .select()
      .from(priceSubmissions)
      .where(eq(priceSubmissions.userId, submitterId))
      .limit(1)
    if (!theirs) throw new Error('seed did not create a price submission')

    const seenAt = new Date('2026-08-20T00:00:00Z')
    await db
      .update(priceSubmissions)
      .set({ lastSeenBy: sighterId, lastSeenAt: seenAt })
      .where(eq(priceSubmissions.id, theirs.id))

    await deleteUserData(sighterId)

    const [after] = await db
      .select()
      .from(priceSubmissions)
      .where(eq(priceSubmissions.id, theirs.id))
    expect(after?.lastSeenBy).toBeNull()
    expect(after?.lastSeenAt).toEqual(seenAt)
  })

  it('rejects an empty user id before touching anything', async () => {
    const userId = await seedUserWithDataEverywhere()

    await expect(deleteUserData('  ')).rejects.toThrow(/non-empty user id/)

    const profile = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, userId))
    expect(profile).toHaveLength(1)
  })

  it('rolls back completely when a statement fails mid-transaction', async () => {
    // The empty-id test proves nothing about rollback: it throws before the
    // transaction opens. This fails an UPDATE on crew_invites, which the
    // registry loop reaches well after it has already deleted user_profiles
    // and user_events — so the failure lands mid-transaction, with real
    // deletions behind it.
    //
    // FOR EACH STATEMENT matters: it fires even when the UPDATE matches zero
    // rows, so the test does not need to seed a revoked invite.
    const userId = await seedUserWithDataEverywhere()

    await db.execute(sql`
      CREATE FUNCTION fail_the_delete() RETURNS trigger AS $$
      BEGIN RAISE EXCEPTION 'forced failure'; END;
      $$ LANGUAGE plpgsql
    `)
    await db.execute(sql`
      CREATE TRIGGER fail_delete BEFORE UPDATE ON crew_invites
      FOR EACH STATEMENT EXECUTE FUNCTION fail_the_delete()
    `)

    try {
      // Drizzle wraps the driver error, which wraps the server error, so the
      // trigger's message is on the cause rather than the top-level message.
      const failure = await deleteUserData(userId).catch((err: unknown) => err)
      expect(failure).toBeInstanceOf(Error)
      const chain =
        failure instanceof Error
          ? `${failure.message} ${failure.cause instanceof Error ? failure.cause.message : ''}`
          : ''
      expect(chain).toMatch(/forced failure/)
    } finally {
      await db.execute(sql`DROP TRIGGER fail_delete ON crew_invites`)
      await db.execute(sql`DROP FUNCTION fail_the_delete()`)
    }

    // user_profiles is deleted early in the registry loop. Its survival is
    // what proves the whole transaction rolled back rather than partly landed.
    const profile = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, userId))
    expect(profile).toHaveLength(1)

    const watching = await db
      .select()
      .from(userEvents)
      .where(eq(userEvents.userId, userId))
    expect(watching.length).toBeGreaterThan(0)
  })
})
