// Account deletion (#907) and data export (#527), both driven by
// USER_DATA_REGISTRY. They live in one file because they read one list: a
// table that is cleared on account closure is a table that appears in the
// export, and keeping the two side by side is what stops them drifting.
//
// The registry is the cascade. There are no foreign keys from application
// tables to the Clerk user id — it is a bare `text` column everywhere — so
// nothing in the database enforces that a deleted account leaves no rows
// behind. Iterating the registry rather than a hand-written list is what makes
// the coverage test in user-data.integration.test.ts meaningful: a new table
// cannot be added without the test demanding a disposition for it, and every
// disposition is executed here.

import { and, eq, ne, sql } from 'drizzle-orm'
import {
  CREW_EXPORT_KEY,
  USER_DATA_REGISTRY,
  WATCHING_EXPORT_KEY,
  crewInvites,
  crewMembers,
  crewMutes,
  crews,
  db,
  events,
  userEvents,
  venues,
} from '@concert-crawl/db'
import type { DbTransaction } from './db-executor.js'

/**
 * Removes everything a deleted account should not keep, per
 * `USER_DATA_REGISTRY`.
 *
 * Runs in ONE transaction. A partial deletion is worse than none: it leaves
 * the Privacy Policy's promise half-kept with no signal that it failed, and no
 * way to reach the surviving rows once the Clerk account is gone.
 *
 * Does NOT delete the Clerk user. The caller owns that, because Clerk sits
 * outside this transaction and fails independently of it.
 */
export const deleteUserData = async (userId: string): Promise<void> => {
  if (userId.trim().length === 0) {
    throw new Error('deleteUserData requires a non-empty user id')
  }

  await db.transaction(async (tx) => {
    // Crews first. Keepership has to transfer before `crew_members` rows go,
    // or there is no member left to promote.
    await reassignCrews(tx, userId)

    for (const entry of USER_DATA_REGISTRY) {
      if (entry.userIdColumn === null) continue
      // 'none' holds no user data; 'retain' survives under a legal-obligation
      // exemption. `crews` is 'retain' and is handled above — this guard keeps
      // that true if its disposition is ever revisited.
      if (entry.disposition !== 'delete' && entry.disposition !== 'anonymize') {
        continue
      }
      if (entry.tableName === 'crews') continue

      const table = sql.identifier(entry.tableName)
      const column = sql.identifier(entry.userIdColumn)

      if (entry.disposition === 'delete') {
        await tx.execute(sql`DELETE FROM ${table} WHERE ${column} = ${userId}`)
      } else {
        await tx.execute(
          sql`UPDATE ${table} SET ${column} = NULL WHERE ${column} = ${userId}`,
        )
      }
    }

    // `otherUserIdColumns` are declared on the registry but never dispositioned
    // by it, because what happens to them differs per column: most name an
    // ADMIN who acted and stay put as the record of who did it. This is the one
    // that does not. Revoking is an ordinary member action, so the revoker's
    // Clerk ID is their personal data and goes with them, while the invite row
    // itself survives for the crew.
    await tx
      .update(crewInvites)
      .set({ revokedBy: null })
      .where(eq(crewInvites.revokedBy, userId))
  })
}

/**
 * A crew outlives its founder. The name is a label for a group, not personal
 * data, so the crew is kept and keepership moves to the longest-tenured
 * remaining member. A crew whose only member was the leaver has nobody to
 * inherit it and is deleted outright.
 */
const reassignCrews = async (
  tx: DbTransaction,
  userId: string,
): Promise<void> => {
  const kept = await tx
    .select({ id: crews.id })
    .from(crews)
    .where(eq(crews.keeperId, userId))

  for (const crew of kept) {
    const [heir] = await tx
      .select({ userId: crewMembers.userId })
      .from(crewMembers)
      .where(
        and(eq(crewMembers.crewId, crew.id), ne(crewMembers.userId, userId)),
      )
      .orderBy(crewMembers.joinedAt)
      .limit(1)

    if (heir === undefined) {
      await tx.delete(crews).where(eq(crews.id, crew.id))
    } else {
      await tx
        .update(crews)
        .set({ keeperId: heir.userId })
        .where(eq(crews.id, crew.id))
    }
  }
}

/**
 * Gathers every row keyed to this user, under the registry's `exportKey`
 * names, plus the one key the registry cannot express (`CREW_EXPORT_KEY`).
 *
 * ⛔ Never `SELECT *` here. #527 requires the export to exclude the Clerk user
 * id, admin notes, and raw tokens; a star select would ship all of them, and
 * would silently ship whatever column the next migration adds. `exportColumns`
 * is the allowlist, and nothing reaches a user that is not on it.
 *
 * Row ids are not blanket-excluded: `event_id`, `submission_id` and
 * `report_id` are on the allowlist because they let a user reconcile two
 * exports taken months apart. What stays out is anything that identifies US
 * rather than them.
 */
export const collectUserData = async (
  userId: string,
): Promise<Record<string, unknown[]>> => {
  if (userId.trim().length === 0) {
    throw new Error('collectUserData requires a non-empty user id')
  }

  const payload: Record<string, unknown[]> = {}

  for (const entry of USER_DATA_REGISTRY) {
    if (
      entry.exportKey === null ||
      entry.exportColumns === null ||
      entry.userIdColumn === null
    ) {
      continue
    }

    const columns = sql.join(
      entry.exportColumns.map((name) => sql.identifier(name)),
      sql`, `,
    )

    // Order by every selected column, by ordinal. Postgres leaves row order
    // undefined without an ORDER BY, so two exports of unchanged data can come
    // back shuffled and read as a change that never happened.
    //
    // Ordinals rather than a named timestamp because the allowlists do not
    // agree on one: some carry `created_at`, others `confirmed_at` or
    // `used_at`, and one carries none. Sorting on all of them is total,
    // needs no per-table knowledge, and stays correct as allowlists grow.
    const ordering = sql.join(
      entry.exportColumns.map((_column, index) => sql.raw(String(index + 1))),
      sql`, `,
    )

    // postgres-js returns the row array directly; there is no `.rows` wrapper.
    const rows = await db.execute(
      sql`SELECT ${columns} FROM ${sql.identifier(entry.tableName)}
          WHERE ${sql.identifier(entry.userIdColumn)} = ${userId}
          ORDER BY ${ordering}`,
    )
    payload[entry.exportKey] = [...rows]
  }

  payload[CREW_EXPORT_KEY] = await collectCrews(userId)
  payload[WATCHING_EXPORT_KEY] = await collectWatching(userId)

  return payload
}

/**
 * Every show this user watched or attended, resolved to something readable.
 *
 * The join is required by #527, not a nicety: exporting a bare `event_id` UUID
 * satisfies the letter of portability and none of its purpose, because the
 * value is meaningless outside our database. `venue` is left-joined — an event
 * can outlive its venue row (`venue_id` is `ON DELETE SET NULL`), and a missing
 * venue must not drop the show from the user's copy.
 */
const collectWatching = async (userId: string): Promise<unknown[]> => {
  const rows = await db
    .select({
      // #527 lists eventId alongside the join. It is the one internal id the
      // issue asks for by name: it is the only stable handle a user has for a
      // show, so two exports taken months apart can be reconciled against each
      // other. Everything else the export excludes identifies US, not a night
      // they went to.
      event_id: userEvents.eventId,
      event_title: events.title,
      event_date: events.date,
      venue: venues.name,
      status: userEvents.status,
      saved_price: userEvents.savedPrice,
      attending_at: userEvents.attendingAt,
      created_at: userEvents.createdAt,
    })
    .from(userEvents)
    .innerJoin(events, eq(userEvents.eventId, events.id))
    .leftJoin(venues, eq(events.venueId, venues.id))
    .where(eq(userEvents.userId, userId))
    // event_id breaks ties: a seed or a bulk import can stamp several rows with
    // the same createdAt, and the generic exporter's determinism is worth
    // nothing if the two hand-written joins below it shuffle.
    .orderBy(userEvents.createdAt, userEvents.eventId)

  return rows
}

/**
 * The crews this user belongs to: the crew's name, when THEY joined, and
 * whether THEY muted it.
 *
 * ⛔ Nothing about the other members, not even a count. Hugh, 2026-08-13:
 * "Never ever export other members identities." A data-subject right must not
 * become a way to enumerate people who did not ask for anything.
 */
const collectCrews = async (userId: string): Promise<unknown[]> => {
  const rows = await db
    .select({
      name: crews.name,
      joined_at: crewMembers.joinedAt,
      muted: sql<boolean>`${crewMutes.id} IS NOT NULL`,
    })
    .from(crewMembers)
    .innerJoin(crews, eq(crewMembers.crewId, crews.id))
    .leftJoin(
      crewMutes,
      and(eq(crewMutes.crewId, crews.id), eq(crewMutes.userId, userId)),
    )
    .where(eq(crewMembers.userId, userId))
    // Same tie-breaker reasoning as collectWatching. crew_id, not name, since
    // two crews may legitimately share a name.
    .orderBy(crewMembers.joinedAt, crewMembers.crewId)

  return rows
}
