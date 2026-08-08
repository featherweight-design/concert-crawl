// Integration tests for the crew bell fan-out (#1226 PR-7).
//
// The guarantees with teeth, all asserted here:
//   1. Dedupe across crews — sharing three crews with the actor is ONE row.
//   2. A `crew_mutes` row suppresses at write time (plan D5), per crew.
//   3. The actor never notifies themselves.
//   4. Every row is bell-only: `user_notification`, a `crew.*` category, and a
//      metadata blob carrying the crew's id, name and patch salt.
import { describe, it, expect, beforeEach } from 'vitest'

import { and, eq } from 'drizzle-orm'
import { crewMembers, crewMutes, crews, notifications } from '@concert-crawl/db'
import { testDb } from '../test/helpers/db.js'
import {
  clearTables,
  seedEvent,
  seedUserProfile,
  seedVenue,
} from '../test/helpers/seed.js'
import {
  notifyCrewGoing,
  notifyCrewMembershipChange,
} from './crew-notifications.js'

const ACTOR = 'user_crew_notify_actor'
const MATE = 'user_crew_notify_mate'
const OTHER = 'user_crew_notify_other'

const seedCrew = async (name: string, members: string[]): Promise<string> => {
  const [crew] = await testDb
    .insert(crews)
    .values({ name, keeperId: members[0] ?? ACTOR, patchSalt: 3 })
    .returning()
  if (!crew) throw new Error('seedCrew: insert returned no rows')
  await testDb
    .insert(crewMembers)
    .values(members.map((userId) => ({ crewId: crew.id, userId })))
  return crew.id
}

const rowsFor = async (userId: string) =>
  testDb
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(notifications.createdAt, notifications.id)

const seedUpcomingEvent = async (): Promise<string> => {
  const venue = await seedVenue({ name: 'Bluebird Theater' })
  const event = await seedEvent(venue.id, { artist: 'Big Thief' })
  return event.id
}

beforeEach(async () => {
  await clearTables()
})

describe('notifyCrewGoing', () => {
  it('writes one bell row per crew-mate, with crew metadata attached', async () => {
    await seedUserProfile(ACTOR, { handle: 'hugh' })
    const crewId = await seedCrew('The Regulars', [ACTOR, MATE])
    const eventId = await seedUpcomingEvent()

    const result = await notifyCrewGoing({ actorUserId: ACTOR, eventId })
    expect(result.written).toBe(1)

    const rows = await rowsFor(MATE)
    expect(rows).toHaveLength(1)
    const row = rows[0]
    expect(row?.type).toBe('user_notification')
    expect(row?.category).toBe('crew.going')
    expect(row?.title).toBe('hugh is going to Big Thief at Bluebird Theater.')
    expect(row?.actionUrl).toBe(`/events/${eventId}`)
    expect(JSON.parse(row?.metadata ?? '{}')).toMatchObject({
      crewId,
      crewName: 'The Regulars',
      patchSalt: 3,
      category: 'crew.going',
      eventId,
    })
  })

  it('never notifies the actor', async () => {
    await seedCrew('The Regulars', [ACTOR, MATE])
    const eventId = await seedUpcomingEvent()

    await notifyCrewGoing({ actorUserId: ACTOR, eventId })

    expect(await rowsFor(ACTOR)).toHaveLength(0)
  })

  it('falls back to "Someone" when the actor has no handle', async () => {
    await seedUserProfile(ACTOR, { handle: null })
    await seedCrew('The Regulars', [ACTOR, MATE])
    const eventId = await seedUpcomingEvent()

    await notifyCrewGoing({ actorUserId: ACTOR, eventId })

    const rows = await rowsFor(MATE)
    expect(rows[0]?.title.startsWith('Someone is going to')).toBe(true)
  })

  it('dedupes across crews: three shared crews produce one row', async () => {
    await seedUserProfile(ACTOR, { handle: 'hugh' })
    await seedCrew('Aces', [ACTOR, MATE])
    await seedCrew('Bandits', [ACTOR, MATE])
    await seedCrew('Coyotes', [ACTOR, MATE])
    const eventId = await seedUpcomingEvent()

    const result = await notifyCrewGoing({ actorUserId: ACTOR, eventId })

    expect(result.written).toBe(1)
    const rows = await rowsFor(MATE)
    expect(rows).toHaveLength(1)
    // The deterministic order (name, then id) names the alphabetically first
    // crew, so the eyebrow does not shuffle between runs.
    expect(JSON.parse(rows[0]?.metadata ?? '{}')).toMatchObject({
      crewName: 'Aces',
    })
  })

  it('skips a muted member and still notifies the rest', async () => {
    await seedUserProfile(ACTOR, { handle: 'hugh' })
    const crewId = await seedCrew('The Regulars', [ACTOR, MATE, OTHER])
    await testDb.insert(crewMutes).values({ crewId, userId: MATE })
    const eventId = await seedUpcomingEvent()

    const result = await notifyCrewGoing({ actorUserId: ACTOR, eventId })

    expect(result.written).toBe(1)
    expect(await rowsFor(MATE)).toHaveLength(0)
    expect(await rowsFor(OTHER)).toHaveLength(1)
  })

  it('mute is per crew: a mate muted in one shared crew still hears via the other', async () => {
    await seedUserProfile(ACTOR, { handle: 'hugh' })
    const muted = await seedCrew('Aces', [ACTOR, MATE])
    await testDb.insert(crewMutes).values({ crewId: muted, userId: MATE })
    await seedCrew('Bandits', [ACTOR, MATE])
    const eventId = await seedUpcomingEvent()

    const result = await notifyCrewGoing({ actorUserId: ACTOR, eventId })

    expect(result.written).toBe(1)
    expect(
      JSON.parse((await rowsFor(MATE))[0]?.metadata ?? '{}'),
    ).toMatchObject({ crewName: 'Bandits' })
  })

  it('writes nothing when the actor belongs to no crew', async () => {
    const eventId = await seedUpcomingEvent()
    const result = await notifyCrewGoing({ actorUserId: ACTOR, eventId })
    expect(result.written).toBe(0)
  })

  it('writes nothing, and does not throw, for an unknown event', async () => {
    await seedCrew('The Regulars', [ACTOR, MATE])
    const result = await notifyCrewGoing({
      actorUserId: ACTOR,
      eventId: '00000000-0000-4000-8000-000000000000',
    })
    expect(result.written).toBe(0)
  })
})

describe('notifyCrewMembershipChange', () => {
  it('announces a join to the members already in the crew', async () => {
    await seedUserProfile(ACTOR, { handle: 'hugh' })
    const crewId = await seedCrew('The Regulars', [MATE, ACTOR])

    const result = await notifyCrewMembershipChange({
      actorUserId: ACTOR,
      crewId,
      action: 'joined',
    })

    expect(result.written).toBe(1)
    const rows = await rowsFor(MATE)
    expect(rows[0]?.category).toBe('crew.joined')
    expect(rows[0]?.title).toBe('hugh joined The Regulars.')
    expect(rows[0]?.actionUrl).toBe(`/crews/${crewId}`)
  })

  it('announces a leave after the membership row is already gone', async () => {
    await seedUserProfile(ACTOR, { handle: 'hugh' })
    const crewId = await seedCrew('The Regulars', [MATE, ACTOR])
    await testDb
      .delete(crewMembers)
      .where(and(eq(crewMembers.crewId, crewId), eq(crewMembers.userId, ACTOR)))

    const result = await notifyCrewMembershipChange({
      actorUserId: ACTOR,
      crewId,
      action: 'left',
    })

    expect(result.written).toBe(1)
    const rows = await rowsFor(MATE)
    expect(rows[0]?.category).toBe('crew.left')
    expect(rows[0]?.title).toBe('hugh left The Regulars.')
    expect(await rowsFor(ACTOR)).toHaveLength(0)
  })

  it('respects a mute on the crew that changed', async () => {
    const crewId = await seedCrew('The Regulars', [MATE, ACTOR])
    await testDb.insert(crewMutes).values({ crewId, userId: MATE })

    const result = await notifyCrewMembershipChange({
      actorUserId: ACTOR,
      crewId,
      action: 'joined',
    })

    expect(result.written).toBe(0)
    expect(await rowsFor(MATE)).toHaveLength(0)
  })

  it('writes nothing when the actor is the only member', async () => {
    const crewId = await seedCrew('The Regulars', [ACTOR])
    const result = await notifyCrewMembershipChange({
      actorUserId: ACTOR,
      crewId,
      action: 'joined',
    })
    expect(result.written).toBe(0)
  })
})
